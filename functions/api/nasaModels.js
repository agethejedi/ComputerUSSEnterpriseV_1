// NASA 3D Model Library
// Models are served as static assets from /public/models/
// Add GLB files to public/models/ in the GitHub repo and reference them here.
// Vite serves public/ at the root — /models/webb.glb etc.

export const NASA_MODELS = [
  {
    id: "webb",
    keywords: ["webb", "james webb", "jwst", "james webb space telescope", "web"],
    name: "James Webb Space Telescope",
    url: "/models/web.glb",
    description: "James Webb Space Telescope — humanity's most powerful eye on the cosmos, launched December 2021.",
    category: "telescope",
  },
  // ── Add more as you upload GLB files to public/models/ ──────────────────
  // { id: "hubble", keywords: ["hubble", "hst"], name: "Hubble Space Telescope", url: "/models/hubble.glb", description: "Hubble Space Telescope — launched 1990.", category: "telescope" },
  // { id: "iss",    keywords: ["iss", "space station"], name: "ISS", url: "/models/iss.glb", description: "International Space Station.", category: "station" },
  // { id: "mars",   keywords: ["mars", "red planet"], name: "Mars", url: "/models/mars.glb", description: "Mars — the Red Planet.", category: "planet" },
  // { id: "moon",   keywords: ["moon", "luna"], name: "Moon", url: "/models/moon.glb", description: "Earth's Moon.", category: "moon" },
  // { id: "earth",  keywords: ["earth"], name: "Earth", url: "/models/earth.glb", description: "Earth — our home.", category: "planet" },
  // { id: "perseverance", keywords: ["perseverance", "percy", "rover"], name: "Perseverance Rover", url: "/models/perseverance.glb", description: "Perseverance Rover — on Mars since 2021.", category: "rover" },
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
