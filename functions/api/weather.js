// Cloudflare Pages Function: /api/weather
//
// Fetches live weather data from NOAA / National Weather Service.
// No API key required. NOAA only requires a User-Agent header
// identifying who's making requests (used for diagnostics / contact).
//
// What this returns:
//   - Local current conditions for The Colony, TX (33.8907, -96.8903)
//   - Local forecast tiles for ~6AM / 12PM / 6PM / 12AM
//   - National major-city temperatures (SFO/LAX/CHI/NYC/MIA/DFW)
//   - Active alerts for Texas (severe wx, etc.)
//
// NOAA API flow:
//   1. GET /points/{lat},{lon}  → returns gridId, gridX, gridY, observation stations URL
//   2. GET /gridpoints/{gridId}/{gridX},{gridY}/forecast/hourly  → hourly forecast
//   3. GET /stations/{stationId}/observations/latest  → current obs
//
// Cached at Cloudflare's edge for 10 minutes (NOAA forecasts update less
// often than that, so this is plenty fresh and saves ~144 calls/day per visitor).

const USER_AGENT = "JARVIS-Briefing/1.0 (jarvis-briefing.pages.dev)";

const LOCAL_LOCATION = {
  lat: 33.8907,
  lon: -96.8903,
  name: "The Colony, TX",
};

const NATIONAL_CITIES = [
  { code: "SFO", name: "San Francisco", lat: 37.7749, lon: -122.4194 },
  { code: "LAX", name: "Los Angeles",  lat: 34.0522, lon: -118.2437 },
  { code: "CHI", name: "Chicago",      lat: 41.8781, lon: -87.6298 },
  { code: "NYC", name: "New York",     lat: 40.7128, lon: -74.0060 },
  { code: "MIA", name: "Miami",        lat: 25.7617, lon: -80.1918 },
  { code: "DFW", name: "Dallas",       lat: 32.7767, lon: -96.7970 },
];

async function noaaFetch(path) {
  const resp = await fetch(`https://api.weather.gov${path}`, {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept": "application/geo+json",
    },
  });
  if (!resp.ok) {
    throw new Error(`NOAA ${path} returned ${resp.status}`);
  }
  return resp.json();
}

// Get gridpoint URL and station list for a lat/lon
async function getPointMeta(lat, lon) {
  const data = await noaaFetch(`/points/${lat},${lon}`);
  const props = data.properties || {};
  return {
    gridId: props.gridId,
    gridX: props.gridX,
    gridY: props.gridY,
    forecastHourly: props.forecastHourly,
    observationStations: props.observationStations,
    relativeLocation: props.relativeLocation?.properties || {},
  };
}

// Get current observation from the nearest station
async function getCurrentConditions(observationStationsUrl) {
  // Fetch the station list, take the first (closest)
  const stationsResp = await fetch(observationStationsUrl, {
    headers: { "User-Agent": USER_AGENT, "Accept": "application/geo+json" },
  });
  const stationsData = await stationsResp.json();
  const features = stationsData.features || [];
  if (!features.length) return null;

  // Try the first 3 stations until one returns valid data
  for (let i = 0; i < Math.min(3, features.length); i++) {
    const stationId = features[i].properties.stationIdentifier;
    try {
      const obs = await noaaFetch(`/stations/${stationId}/observations/latest`);
      const p = obs.properties || {};
      const tempC = p.temperature?.value;
      if (tempC == null) continue;
      return {
        stationId,
        stationName: features[i].properties.name,
        tempF: Math.round(cToF(tempC)),
        feelsF: p.heatIndex?.value != null
          ? Math.round(cToF(p.heatIndex.value))
          : (p.windChill?.value != null ? Math.round(cToF(p.windChill.value)) : Math.round(cToF(tempC))),
        humidity: p.relativeHumidity?.value != null ? Math.round(p.relativeHumidity.value) : null,
        windDir: degreesToCompass(p.windDirection?.value),
        windSpeed: p.windSpeed?.value != null ? Math.round(p.windSpeed.value * 0.621371) : null, // km/h to mph
        baroIn: p.barometricPressure?.value != null ? +(p.barometricPressure.value * 0.0002953).toFixed(2) : null, // Pa to inHg
        conditions: (p.textDescription || "").trim(),
        observedAt: p.timestamp,
      };
    } catch {
      continue;
    }
  }
  return null;
}

function cToF(c) { return c * 9 / 5 + 32; }

function degreesToCompass(deg) {
  if (deg == null) return null;
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

// Pull hourly forecast and pick out the slots closest to 6AM/12PM/6PM/12AM CT
async function getForecastTiles(forecastHourlyUrl) {
  const resp = await fetch(forecastHourlyUrl, {
    headers: { "User-Agent": USER_AGENT, "Accept": "application/geo+json" },
  });
  if (!resp.ok) throw new Error(`Forecast HTTP ${resp.status}`);
  const data = await resp.json();
  const periods = data.properties?.periods || [];

  // Get current CT hour to figure out which slots to pick
  const now = new Date();
  const ctHourStr = now.toLocaleString("en-US", { timeZone: "America/Chicago", hour12: false, hour: "numeric" });
  const ctHour = parseInt(ctHourStr, 10);

  // Targets: 6, 12, 18, 0 (next occurrence of each, CT)
  const targets = [6, 12, 18, 0];
  const labels = ["6AM", "12PM", "6PM", "12AM"];

  const tiles = targets.map((targetHour, i) => {
    // Find the next period at or after current time whose CT hour matches target
    for (const p of periods) {
      const startTime = new Date(p.startTime);
      const periodCtHour = parseInt(
        startTime.toLocaleString("en-US", { timeZone: "America/Chicago", hour12: false, hour: "numeric" }),
        10
      );
      if (periodCtHour === targetHour && startTime > now) {
        return {
          label: labels[i],
          tempF: p.temperature,
          icon: p.icon,
          shortForecast: p.shortForecast,
        };
      }
    }
    return { label: labels[i], tempF: null };
  });

  return tiles;
}

// Get just the temperature for a single point — used for national city tiles.
// Cheaper path: hit /points then /gridpoints/.../forecast (not hourly, daily summary)
// Actually the simplest: use the /points response's forecast URL and take period 0.
async function getCityCurrentTemp(lat, lon) {
  try {
    const meta = await getPointMeta(lat, lon);
    const forecastUrl = `https://api.weather.gov/gridpoints/${meta.gridId}/${meta.gridX},${meta.gridY}/forecast`;
    const resp = await fetch(forecastUrl, {
      headers: { "User-Agent": USER_AGENT, "Accept": "application/geo+json" },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const period = data.properties?.periods?.[0];
    return period?.temperature ?? null;
  } catch {
    return null;
  }
}

// Active alerts for Texas
async function getAlerts(area = "TX") {
  try {
    const data = await noaaFetch(`/alerts/active/area/${area}`);
    const features = data.features || [];
    return features.slice(0, 5).map((f) => ({
      headline: f.properties?.headline,
      event: f.properties?.event,
      severity: f.properties?.severity,
      areaDesc: f.properties?.areaDesc,
    }));
  } catch {
    return [];
  }
}

export async function onRequestGet(context) {
  const { request } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Edge cache check
  const cacheKey = new Request(new URL(request.url).toString(), request);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) {
    const fresh = new Response(cached.body, cached);
    fresh.headers.set("x-cache", "HIT");
    return fresh;
  }

  try {
    // Local data
    const localMeta = await getPointMeta(LOCAL_LOCATION.lat, LOCAL_LOCATION.lon);
    const [current, forecastTiles, alerts] = await Promise.all([
      getCurrentConditions(localMeta.observationStations),
      getForecastTiles(localMeta.forecastHourly),
      getAlerts("TX"),
    ]);

    // National city temps — parallel
    const cityTemps = await Promise.all(
      NATIONAL_CITIES.map(async (city) => ({
        ...city,
        tempF: await getCityCurrentTemp(city.lat, city.lon),
      }))
    );

    const payload = {
      fetchedAt: Date.now(),
      local: {
        location: LOCAL_LOCATION.name,
        current,
        forecastTiles,
        alerts,
      },
      national: {
        cities: cityTemps,
      },
    };

    const response = new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=600", // 10 min
        "x-cache": "MISS",
        ...corsHeaders,
      },
    });

    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "NOAA fetch failed", detail: String(err) }),
      { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
