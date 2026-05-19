/**
 * Tania Agent — Theme & Style Configuration
 */

export const THEMES = {
  supra_nights: {
    id: "supra_nights",
    label: "Supra Nights",
    description: "Late-night cinematic drives through Dallas/Frisco. Solitude, introspection, longing.",
    mood: "melancholic, cinematic, intimate",
    visualKeywords: ["rain", "dashboard glow", "toll roads", "skyline", "neon", "midnight"],
  },
  looking_for_home: {
    id: "looking_for_home",
    label: "Looking for Home",
    description: "Searching for authentic Cambodian food. Immigrant nostalgia, sensory memory.",
    mood: "nostalgic, warm, wistful",
    visualKeywords: ["Khmer cuisine", "markets", "steam", "family recipes", "warmth", "texture"],
  },
  founder_notes: {
    id: "founder_notes",
    label: "Founder Notes",
    description: "Reflections on hospitality economics, luxury branding, and emotional experience design.",
    mood: "intelligent, composed, reflective",
    visualKeywords: ["restaurant interior", "editorial", "quiet luxury", "close-up details"],
  },
};

export const VISUAL_STYLES = {
  cinematic_rain: {
    id: "cinematic_rain",
    label: "Cinematic Rain",
    prompt: "Cinematic night driving in Dallas, rain on windshield, bokeh city lights, dashboard glow, slow motion, film grain, anamorphic lens flare, moody and intimate",
  },
  market: {
    id: "market",
    label: "Market / Kitchen",
    prompt: "Close-up Cambodian market textures, steam rising from soup, worn wooden surfaces, warm amber light, slow pan, documentary style, sensory and intimate",
  },
  editorial: {
    id: "editorial",
    label: "Editorial Luxury",
    prompt: "Luxury fashion editorial, warm neutral tones, silk texture, soft window light, quiet and composed, minimalist DFW interior, slow reveal",
  },
  reflective: {
    id: "reflective",
    label: "Reflective / Night",
    prompt: "Empty Dallas parking garage, neon reflections on wet concrete, solitary figure, slow dolly, cinematic shadows, melancholic and beautiful",
  },
};
