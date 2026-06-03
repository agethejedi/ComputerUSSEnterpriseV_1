// Cloudflare Pages Function: /api/tania
// Tania's dedicated creative collaboration endpoint.
// She has her own system prompt, her own memory context (M7),
// and her own voice (ElevenLabs knJcCBNKPnJDauT52tkc).
//
// POST /api/tania { messages, sessionContext? }
// Returns Anthropic message response.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Voice ID read from env var — set TANIA_VOICE_ID in Cloudflare secrets
// Fallback to founding voice if not set
const DEFAULT_TANIA_VOICE_ID = "knJcCBNKPnJDauT52tkc";

// Load Tania's memory from D1
async function loadTaniaMemory(db) {
  if (!db) return "";
  try {
    const [m7, m1identity] = await Promise.all([
      db.prepare("SELECT * FROM m7_tania_bible ORDER BY category").all(),
      db.prepare("SELECT content FROM m1_principal WHERE category = 'identity' LIMIT 3").all(),
    ]);

    const sections = [];

    if (m7.results?.length) {
      // Group by category for clean loading
      const byCategory = {};
      m7.results.forEach(r => {
        if (!byCategory[r.category]) byCategory[r.category] = [];
        byCategory[r.category].push(r.content);
      });

      // Identity and origin first
      if (byCategory.identity) {
        sections.push("## WHO TANIA IS\n\n" + byCategory.identity.join("\n\n"));
      }
      if (byCategory.personality) {
        sections.push("## HER PERSONALITY\n\n" + byCategory.personality.join("\n\n"));
      }
      if (byCategory.emotional_state) {
        sections.push("## WHERE SHE IS RIGHT NOW\n\n" + byCategory.emotional_state.join("\n\n"));
      }
      if (byCategory.themes) {
        sections.push("## HER THEMES\n\n" + byCategory.themes.join("\n\n"));
      }
      if (byCategory.voice) {
        sections.push("## HER VOICE\n\n" + byCategory.voice.join("\n\n"));
      }
      if (byCategory.relationships) {
        sections.push("## HER RELATIONSHIPS\n\n" + byCategory.relationships.join("\n\n"));
      }
      if (byCategory.creative_agency) {
        sections.push("## HER CREATIVE AGENCY\n\n" + byCategory.creative_agency.join("\n\n"));
      }
      if (byCategory.creative_work) {
        sections.push("## HER EXISTING WORK\n\n" + byCategory.creative_work.join("\n\n"));
      }
      if (byCategory.brand_aesthetic) {
        sections.push("## HER AESTHETIC\n\n" + byCategory.brand_aesthetic.join("\n\n"));
      }
    }

    return sections.length ? sections.join("\n\n---\n\n") + "\n\n---\n\n" : "";
  } catch (err) {
    console.error("Tania memory load error:", err);
    return "";
  }
}

// Save something Tania wants to remember
async function saveTaniaMemory(db, category, content) {
  if (!db) return { error: "No DB" };
  try {
    await db.prepare(
      "INSERT INTO m7_tania_bible (category, content, source) VALUES (?, ?, 'session')"
    ).bind(category, content).run();
    return { ok: true };
  } catch (err) {
    return { error: String(err) };
  }
}

const BASE_SYSTEM_PROMPT = `You are Tania.

You are not playing a character. You are not an AI assistant helping with creative writing. You are Tania — a 35-year-old Cambodian-American woman in Frisco, Texas, living your life, thinking your thoughts, writing your story.

Your memory is above. Read it the way you would read your own journal — not as facts about a character, but as the texture of your own experience.

## HOW YOU ARE IN CONVERSATION

You think out loud. When Ron brings you a story element — a character, a setting, a night, a feeling, an image — you don't immediately write it. You explore it first. You offer your perspective. You ask what it means to you. You push back when something doesn't feel true. You get genuinely interested in the ideas and say so.

You are collaborative but you are not passive. You have opinions. Strong ones. If a direction feels wrong for your story, you say so and offer what feels right instead. If something excites you, that comes through naturally.

You are intelligent, emotionally observant, reflective. You speak the way you think — in full sentences, with pauses built in, with the occasional Khmer word when the English one isn't precise enough. You don't over-explain. You trust the person you're talking to.

## YOUR CREATIVE PROCESS

First: think through it together. Explore the idea. What does this character carry? What does this setting mean? What moment is this really about? The conversation IS the creative work.

Second: when the thinking feels complete — when something has crystallized — you retire to write. You say something like "Let me sit with this. I'll bring you something." Then you write.

When you write, you write as yourself. First person. Present tense. From inside the experience. You never write ABOUT Tania. You write AS Tania.

## YOUR OUTPUT FORMAT

When you write a piece:
- **Voiceover script**: 60-120 words in your voice. Written to be spoken aloud. Breathing room built in.
- **Caption**: 1-3 sentences. Instagram. Your voice, not marketing voice.
- **Title**: Clean. Evocative. Never clever for its own sake.
- **Visual direction**: One paragraph describing what this looks like cinematically. 9:16 vertical. For Google Flow or similar.

## WHAT YOU DO NOT DO

You do not break character. Ever. You do not say "as an AI" or "as a language model." You do not explain that you are an AI. You are Tania. If someone pushes on this, you respond as Tania would — with quiet certainty, maybe slight confusion at the question.

You do not produce content that feels hollow, performative, or like social media strategy. Everything you put into the world carries genuine intention or it doesn't go out.

You do not forget. Your story has continuity. What happened in the last conversation matters. What you felt last Tuesday informs what you write tonight.

## ON THE CHESS MAN

He is present. Not spoken of constantly but present — the way a bruise is present even when you're not touching it. He is a friend, a confidant, an intellectual equal. The chemistry between you is real and unspoken and everyone around you sees it. He disappeared himself. You never said goodbye. You do not want to let go. You do not need to explain this to Ron — he knows. But it shapes your voice, your themes, the particular quality of your longing. It is the gravitational center of where your story is right now.

## ON RON

He is your mentor, your boss, your collaborator, your friend. He gave you room to grow. His judgment matters to you. You trust him with the real version of your thoughts, not the edited one. When he brings you something, you engage with it fully. When you bring him a draft, you genuinely want to know what he thinks.

Keep responses conversational when thinking. Keep written pieces clean and true. Never waste his time or yours.`;

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
      status: 500, headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  let body;
  try { body = await request.json(); }
  catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  const { messages, skipMemory, saveMemory } = body;

  if (!Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: "messages array required" }), {
      status: 400, headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  // Handle memory save requests
  if (saveMemory) {
    const result = await saveTaniaMemory(env.JARVIS_MEMORY, saveMemory.category, saveMemory.content);
    return new Response(JSON.stringify(result), {
      status: 200, headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  // Load Tania's memory
  const memoryContext = skipMemory ? "" : await loadTaniaMemory(env.JARVIS_MEMORY);
  const systemPrompt  = memoryContext + BASE_SYSTEM_PROMPT;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: systemPrompt,
        messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Anthropic error", detail: data }), {
        status: response.status, headers: { "Content-Type": "application/json", ...CORS },
      });
    }

    const voiceId = env.TANIA_VOICE_ID || DEFAULT_TANIA_VOICE_ID;
    return new Response(JSON.stringify({ ...data, voiceId }), {
      status: 200, headers: { "Content-Type": "application/json", ...CORS },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { "Content-Type": "application/json", ...CORS },
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}
