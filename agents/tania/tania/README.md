# Taste of Tania — Agent Module

Sub-agent of JARVIS. Generates cinematic short-form video content for `@tasteoftania`.

## Pipeline

```
Claude (script + caption)
  → ElevenLabs (voice · ID: knJcCBNKPnJDauT52tkc)
    → Runway ML Gen-3 (cinematic video · 9:16)
      → Approval queue (Ron reviews before posting)
```

## Structure

```
/agents/tania/
├── index.js              # Main pipeline orchestrator
├── scheduler.js          # Pace control + JARVIS cron integration
├── package.json
├── .env.example
│
├── config/
│   └── themes.js         # Theme + visual style definitions
│
├── prompts/
│   └── tania.js          # Claude system prompt (Tania's character)
│
├── services/
│   ├── claude.js         # Script generation
│   ├── elevenlabs.js     # Voice synthesis
│   ├── runway.js         # Video generation + polling
│   └── queue.js          # Approval queue (JSON → swap for DB)
│
├── api/
│   └── routes.js         # Express routes — mount at /api/tania
│
├── utils/
│   ├── logger.js
│   └── storage.js        # Audio file storage + URL serving
│
└── scripts/
    └── test-pipeline.js  # Quick integration test
```

## JARVIS Integration

In your main JARVIS `app.js`:

```js
import taniaRouter from "./agents/tania/api/routes.js";
import { tick as taniaTick } from "./agents/tania/scheduler.js";

// Mount control panel API
app.use("/api/tania", taniaRouter);

// Serve generated media
app.use("/media/tania", express.static(process.env.TANIA_MEDIA_DIR));

// Hook into JARVIS's hourly cron
jarvis.onHourlyTick(async () => {
  await taniaTick();
});
```

## Control Panel API

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/tania/queue` | All queue items |
| POST | `/api/tania/generate` | Trigger pipeline now |
| POST | `/api/tania/queue/:id/approve` | Approve a video |
| POST | `/api/tania/queue/:id/reject` | Reject a video |
| GET | `/api/tania/config` | Current pace config |
| POST | `/api/tania/config` | Update `postsPerWeek` |

All routes require `X-Tania-Secret` header matching `TANIA_MEDIA_BASE_URL` env var.

## Themes

| Theme | Description |
|-------|-------------|
| `supra_nights` | Late-night Dallas drives, solitude, longing |
| `looking_for_home` | Cambodian food, immigrant identity, sensory memory |
| `founder_notes` | Hospitality economics, luxury branding, psychology |

## Railway Deployment

1. Add all vars from `.env.example` to Railway environment
2. Mount a Railway Volume at `/data/tania` for queue + media persistence
3. The module is stateless otherwise — no separate service needed

## Voice Settings (ElevenLabs)

```json
{
  "stability": 0.72,
  "similarity_boost": 0.85,
  "style": 0.28,
  "use_speaker_boost": true
}
```

Tuned for Tania's character: calm, warm, measured, cinematic.
