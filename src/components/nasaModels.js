// NASA 3D Model Library
// All models are free, no copyright restrictions, optimized for web (glTF 2.0)
// Sources: NASA Solar System Exploration + NASA 3D Resources GitHub
//
// Each entry has:
//   keywords: what JARVIS listens for
//   name: display name
//   url: direct GLTF/GLB URL
//   description: JARVIS narrates this on load
//   category: spacecraft | planet | moon | rover | telescope | station

export const NASA_MODELS = [
  // ── Spacecraft ────────────────────────────────────────────────────────────
  {
    id: "iss",
    keywords: ["iss", "international space station", "space station"],
    name: "International Space Station",
    url: "https://solarsystem.nasa.gov/system/downloadable_items/2378_ISS_High_Res.glb",
    fallbackUrl: "https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/ISS/ISS_stationary.glb",
    description: "International Space Station — orbiting at 408 kilometers, home to astronauts since the year 2000.",
    category: "station",
    scale: 0.001,
  },
  {
    id: "hubble",
    keywords: ["hubble", "hubble telescope", "hubble space telescope"],
    name: "Hubble Space Telescope",
    url: "https://solarsystem.nasa.gov/system/downloadable_items/2364_Hubble.glb",
    description: "Hubble Space Telescope — launched in 1990, has captured over 1.5 million observations of the universe.",
    category: "telescope",
    scale: 0.002,
  },
  {
    id: "webb",
    keywords: ["webb", "james webb", "jwst", "james webb space telescope"],
    name: "James Webb Space Telescope",
    url: "https://solarsystem.nasa.gov/system/downloadable_items/2445_Webb.glb",
    description: "James Webb Space Telescope — humanity's most powerful eye on the cosmos, launched December 2021.",
    category: "telescope",
    scale: 0.001,
  },
  {
    id: "voyager",
    keywords: ["voyager", "voyager 1", "voyager 2"],
    name: "Voyager",
    url: "https://solarsystem.nasa.gov/system/downloadable_items/2340_Voyager.glb",
    description: "Voyager — launched in 1977, now the most distant human-made object, over 23 billion kilometers from Earth.",
    category: "spacecraft",
    scale: 0.015,
  },
  {
    id: "new-horizons",
    keywords: ["new horizons", "new horizons spacecraft"],
    name: "New Horizons",
    url: "https://solarsystem.nasa.gov/system/downloadable_items/2363_NewHorizons.glb",
    description: "New Horizons — flew past Pluto in 2015, now exploring the Kuiper Belt.",
    category: "spacecraft",
    scale: 0.02,
  },
  {
    id: "juno",
    keywords: ["juno", "juno spacecraft"],
    name: "Juno",
    url: "https://solarsystem.nasa.gov/system/downloadable_items/2376_Juno.glb",
    description: "Juno — currently orbiting Jupiter, studying its atmosphere and magnetic field.",
    category: "spacecraft",
    scale: 0.008,
  },
  {
    id: "cassini",
    keywords: ["cassini", "cassini spacecraft", "cassini huygens"],
    name: "Cassini",
    url: "https://solarsystem.nasa.gov/system/downloadable_items/2346_Cassini.glb",
    description: "Cassini — orbited Saturn for 13 years before its Grand Finale dive into Saturn's atmosphere in 2017.",
    category: "spacecraft",
    scale: 0.008,
  },
  {
    id: "sls",
    keywords: ["sls", "space launch system", "artemis rocket", "artemis", "artemis ii", "moon rocket"],
    name: "Space Launch System",
    url: "https://solarsystem.nasa.gov/system/downloadable_items/2433_SLS.glb",
    description: "Space Launch System — NASA's most powerful rocket, designed to carry Orion and crew to the Moon and beyond.",
    category: "spacecraft",
    scale: 0.003,
  },
  {
    id: "orion",
    keywords: ["orion", "orion capsule", "orion spacecraft"],
    name: "Orion Spacecraft",
    url: "https://solarsystem.nasa.gov/system/downloadable_items/2434_Orion.glb",
    description: "Orion — NASA's crew vehicle designed for deep space exploration, part of the Artemis program.",
    category: "spacecraft",
    scale: 0.01,
  },
  {
    id: "osiris-rex",
    keywords: ["osiris", "osiris rex", "osiris-rex", "bennu"],
    name: "OSIRIS-REx",
    url: "https://solarsystem.nasa.gov/system/downloadable_items/2401_OSIRIS-REx.glb",
    description: "OSIRIS-REx — returned a sample from asteroid Bennu in 2023, the largest asteroid sample ever brought to Earth.",
    category: "spacecraft",
    scale: 0.01,
  },

  // ── Rovers ────────────────────────────────────────────────────────────────
  {
    id: "curiosity",
    keywords: ["curiosity", "curiosity rover", "msl"],
    name: "Curiosity Rover",
    url: "https://solarsystem.nasa.gov/system/downloadable_items/2404_Curiosity.glb",
    description: "Curiosity — the car-sized Mars Science Laboratory rover, exploring Gale Crater since August 2012.",
    category: "rover",
    scale: 0.012,
  },
  {
    id: "perseverance",
    keywords: ["perseverance", "perseverance rover", "percy", "mars 2020"],
    name: "Perseverance Rover",
    url: "https://solarsystem.nasa.gov/system/downloadable_items/2437_Perseverance.glb",
    description: "Perseverance — landed in Jezero Crater in 2021, searching for signs of ancient microbial life on Mars.",
    category: "rover",
    scale: 0.012,
  },
  {
    id: "ingenuity",
    keywords: ["ingenuity", "ingenuity helicopter", "mars helicopter"],
    name: "Ingenuity Helicopter",
    url: "https://solarsystem.nasa.gov/system/downloadable_items/2438_Ingenuity.glb",
    description: "Ingenuity — the first powered aircraft to fly on another planet, completing over 70 flights on Mars.",
    category: "rover",
    scale: 0.025,
  },

  // ── Planets ───────────────────────────────────────────────────────────────
  {
    id: "earth",
    keywords: ["earth", "our planet", "the earth"],
    name: "Earth",
    url: "https://solarsystem.nasa.gov/system/downloadable_items/2393_Earth.glb",
    description: "Earth — our home, the only known planet to harbor life, third rock from the Sun.",
    category: "planet",
    scale: 0.004,
  },
  {
    id: "mars",
    keywords: ["mars", "the red planet"],
    name: "Mars",
    url: "https://solarsystem.nasa.gov/system/downloadable_items/2372_Mars.glb",
    description: "Mars — the Red Planet, home to Olympus Mons, the tallest volcano in the solar system.",
    category: "planet",
    scale: 0.004,
  },
  {
    id: "moon",
    keywords: ["moon", "the moon", "luna", "earths moon"],
    name: "Earth's Moon",
    url: "https://solarsystem.nasa.gov/system/downloadable_items/2366_Moon.glb",
    description: "The Moon — Earth's only natural satellite, last walked on by Apollo 17 in December 1972.",
    category: "moon",
    scale: 0.004,
  },
  {
    id: "jupiter",
    keywords: ["jupiter", "the gas giant"],
    name: "Jupiter",
    url: "https://solarsystem.nasa.gov/system/downloadable_items/2375_Jupiter.glb",
    description: "Jupiter — the largest planet in our solar system, its Great Red Spot a storm raging for over 350 years.",
    category: "planet",
    scale: 0.002,
  },
  {
    id: "saturn",
    keywords: ["saturn", "saturn with rings"],
    name: "Saturn",
    url: "https://solarsystem.nasa.gov/system/downloadable_items/2355_Saturn.glb",
    description: "Saturn — the ringed giant, its spectacular ring system spanning 282,000 kilometers.",
    category: "planet",
    scale: 0.002,
  },
  {
    id: "venus",
    keywords: ["venus"],
    name: "Venus",
    url: "https://solarsystem.nasa.gov/system/downloadable_items/2350_Venus.glb",
    description: "Venus — the hottest planet, with surface temperatures reaching 465 degrees Celsius.",
    category: "planet",
    scale: 0.004,
  },
  {
    id: "mercury",
    keywords: ["mercury"],
    name: "Mercury",
    url: "https://solarsystem.nasa.gov/system/downloadable_items/2369_Mercury.glb",
    description: "Mercury — the smallest planet and closest to the Sun, with temperatures swinging 600 degrees between day and night.",
    category: "planet",
    scale: 0.004,
  },
  {
    id: "sun",
    keywords: ["sun", "the sun", "our star", "sol"],
    name: "The Sun",
    url: "https://solarsystem.nasa.gov/system/downloadable_items/2352_Sun.glb",
    description: "The Sun — our star, containing 99.86 percent of the total mass of the solar system.",
    category: "planet",
    scale: 0.001,
  },
  {
    id: "pluto",
    keywords: ["pluto"],
    name: "Pluto",
    url: "https://solarsystem.nasa.gov/system/downloadable_items/2359_Pluto.glb",
    description: "Pluto — the dwarf planet at the edge of our solar system, first seen up close by New Horizons in 2015.",
    category: "planet",
    scale: 0.006,
  },
  {
    id: "europa",
    keywords: ["europa", "europa moon", "jupiters moon europa"],
    name: "Europa",
    url: "https://solarsystem.nasa.gov/system/downloadable_items/2381_Europa.glb",
    description: "Europa — Jupiter's icy moon, believed to harbor a vast liquid ocean beneath its surface.",
    category: "moon",
    scale: 0.006,
  },
  {
    id: "titan",
    keywords: ["titan", "titan moon", "saturns moon"],
    name: "Titan",
    url: "https://solarsystem.nasa.gov/system/downloadable_items/2384_Titan.glb",
    description: "Titan — Saturn's largest moon, with a thick atmosphere and liquid methane lakes.",
    category: "moon",
    scale: 0.005,
  },
  {
    id: "io",
    keywords: ["io", "io moon"],
    name: "Io",
    url: "https://solarsystem.nasa.gov/system/downloadable_items/2379_Io.glb",
    description: "Io — Jupiter's volcanic moon, the most geologically active body in the solar system.",
    category: "moon",
    scale: 0.006,
  },
];

// Find a model by natural language input
export function findNasaModel(query) {
  if (!query) return null;
  const q = query.toLowerCase().trim();
  // Exact keyword match first
  for (const model of NASA_MODELS) {
    if (model.keywords.some((kw) => q.includes(kw))) {
      return model;
    }
  }
  // Partial name match fallback
  for (const model of NASA_MODELS) {
    if (q.includes(model.name.toLowerCase()) || model.name.toLowerCase().includes(q)) {
      return model;
    }
  }
  return null;
}

// Default sci-fi wireframe — no URL needed, built from Three.js geometry
export const DEFAULT_MODEL = {
  id: "wireframe",
  name: "Holographic Core",
  description: "Holographic core — procedurally generated. Ready for manipulation.",
  category: "default",
  isWireframe: true,
};
