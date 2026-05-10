// NASA 3D Model Library
// Models are fetched via /api/nasa-model?id=XXX — a Cloudflare Function
// that proxies NASA's CDN to solve CORS and URL stability issues.
// All models are free, public domain, no copyright restrictions.

const PROXY = (id) => `/api/nasa-model?id=${id}`;

export const NASA_MODELS = [
  { id: "earth", keywords: ["earth", "our planet", "the earth"], name: "Earth", url: PROXY("earth"), description: "Earth — our home, the only known planet to harbor life, third from the Sun.", category: "planet", scale: 1 },
  { id: "mars", keywords: ["mars", "the red planet"], name: "Mars", url: PROXY("mars"), description: "Mars — the Red Planet, home to Olympus Mons, the tallest volcano in the solar system.", category: "planet", scale: 1 },
  { id: "moon", keywords: ["moon", "the moon", "luna", "earths moon"], name: "Earth's Moon", url: PROXY("moon"), description: "The Moon — last walked on by Apollo 17 in December 1972.", category: "moon", scale: 1 },
  { id: "jupiter", keywords: ["jupiter", "the gas giant"], name: "Jupiter", url: PROXY("jupiter"), description: "Jupiter — the largest planet, its Great Red Spot a storm raging for over 350 years.", category: "planet", scale: 1 },
  { id: "saturn", keywords: ["saturn", "saturn with rings"], name: "Saturn", url: PROXY("saturn"), description: "Saturn — the ringed giant, its ring system spanning 282,000 kilometers.", category: "planet", scale: 1 },
  { id: "venus", keywords: ["venus"], name: "Venus", url: PROXY("venus"), description: "Venus — the hottest planet, with surface temperatures reaching 465 degrees Celsius.", category: "planet", scale: 1 },
  { id: "mercury", keywords: ["mercury"], name: "Mercury", url: PROXY("mercury"), description: "Mercury — the smallest planet and closest to the Sun.", category: "planet", scale: 1 },
  { id: "sun", keywords: ["sun", "the sun", "our star", "sol"], name: "The Sun", url: PROXY("sun"), description: "The Sun — our star, containing 99.86 percent of the total mass of the solar system.", category: "planet", scale: 1 },
  { id: "pluto", keywords: ["pluto"], name: "Pluto", url: PROXY("pluto"), description: "Pluto — the dwarf planet at the edge of our solar system.", category: "planet", scale: 1 },
  { id: "europa", keywords: ["europa", "europa moon"], name: "Europa", url: PROXY("europa"), description: "Europa — Jupiter's icy moon, believed to harbor a vast liquid ocean beneath its surface.", category: "moon", scale: 1 },
  { id: "titan", keywords: ["titan", "titan moon", "saturns moon"], name: "Titan", url: PROXY("titan"), description: "Titan — Saturn's largest moon, with liquid methane lakes.", category: "moon", scale: 1 },
  { id: "io", keywords: ["io", "io moon"], name: "Io", url: PROXY("io"), description: "Io — Jupiter's volcanic moon, the most geologically active body in the solar system.", category: "moon", scale: 1 },
  { id: "uranus", keywords: ["uranus"], name: "Uranus", url: PROXY("uranus"), description: "Uranus — the ice giant that rotates on its side.", category: "planet", scale: 1 },
  { id: "neptune", keywords: ["neptune"], name: "Neptune", url: PROXY("neptune"), description: "Neptune — the farthest planet, with the strongest winds in the solar system.", category: "planet", scale: 1 },
  { id: "iss", keywords: ["iss", "international space station", "space station"], name: "International Space Station", url: PROXY("iss"), description: "International Space Station — orbiting at 408 kilometers, continuously inhabited since the year 2000.", category: "station", scale: 1 },
  { id: "hubble", keywords: ["hubble", "hubble telescope", "hubble space telescope", "hst"], name: "Hubble Space Telescope", url: PROXY("hubble"), description: "Hubble Space Telescope — launched in 1990, has captured over 1.5 million observations.", category: "telescope", scale: 1 },
  { id: "webb", keywords: ["webb", "james webb", "jwst", "james webb space telescope"], name: "James Webb Space Telescope", url: PROXY("webb"), description: "James Webb Space Telescope — humanity's most powerful eye on the cosmos, launched December 2021.", category: "telescope", scale: 1 },
  { id: "voyager", keywords: ["voyager", "voyager 1", "voyager 2"], name: "Voyager", url: PROXY("voyager"), description: "Voyager — launched in 1977, now over 23 billion kilometers from Earth.", category: "spacecraft", scale: 1 },
  { id: "cassini", keywords: ["cassini", "cassini spacecraft"], name: "Cassini", url: PROXY("cassini"), description: "Cassini — orbited Saturn for 13 years before its Grand Finale dive in 2017.", category: "spacecraft", scale: 1 },
  { id: "juno", keywords: ["juno", "juno spacecraft"], name: "Juno", url: PROXY("juno"), description: "Juno — currently orbiting Jupiter, studying its atmosphere and magnetic field.", category: "spacecraft", scale: 1 },
  { id: "new-horizons", keywords: ["new horizons", "new horizons spacecraft"], name: "New Horizons", url: PROXY("new-horizons"), description: "New Horizons — flew past Pluto in 2015, now exploring the Kuiper Belt.", category: "spacecraft", scale: 1 },
  { id: "osiris-rex", keywords: ["osiris", "osiris rex", "osiris-rex", "bennu"], name: "OSIRIS-REx", url: PROXY("osiris-rex"), description: "OSIRIS-REx — returned a sample from asteroid Bennu in 2023.", category: "spacecraft", scale: 1 },
  { id: "curiosity", keywords: ["curiosity", "curiosity rover", "msl"], name: "Curiosity Rover", url: PROXY("curiosity"), description: "Curiosity — exploring Gale Crater on Mars since August 2012.", category: "rover", scale: 1 },
  { id: "perseverance", keywords: ["perseverance", "perseverance rover", "percy", "mars 2020"], name: "Perseverance Rover", url: PROXY("perseverance"), description: "Perseverance — landed in Jezero Crater in 2021, searching for signs of ancient life on Mars.", category: "rover", scale: 1 },
  { id: "ingenuity", keywords: ["ingenuity", "ingenuity helicopter", "mars helicopter"], name: "Ingenuity Helicopter", url: PROXY("ingenuity"), description: "Ingenuity — the first powered aircraft to fly on another planet.", category: "rover", scale: 1 },
  { id: "opportunity", keywords: ["opportunity", "opportunity rover"], name: "Opportunity Rover", url: PROXY("opportunity"), description: "Opportunity — explored Mars for nearly 15 years, far exceeding its 90-day mission.", category: "rover", scale: 1 },
];

export function findNasaModel(query) {
  if (!query) return null;
  const q = query.toLowerCase().trim();
  for (const model of NASA_MODELS) {
    if (model.keywords.some((kw) => q.includes(kw))) return model;
  }
  for (const model of NASA_MODELS) {
    if (q.includes(model.name.toLowerCase()) || model.name.toLowerCase().includes(q)) return model;
  }
  return null;
}

export const DEFAULT_MODEL = {
  id: "wireframe",
  name: "Holographic Core",
  description: "Holographic core — procedurally generated. Ready for manipulation.",
  category: "default",
  isWireframe: true,
};
