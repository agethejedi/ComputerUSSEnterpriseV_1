// VoiceAndIntro.jsx
// Provides:
//   1. ElevenLabs TTS (falls back to Web Speech API if not configured)
//   2. Wake word continuous listening ("hey jarvis" or whatever JARVIS_WAKE_WORD is set to)
//   3. Daily rotating Apple Music intro (15 seconds, different song each day)
//
// Usage in JarvisBriefing.jsx:
//   import { useElevenLabsSpeak, useWakeWord, useJarvisIntro } from "./VoiceAndIntro.jsx";
//
//   const speak = useElevenLabsSpeak();
//   useWakeWord({ onWakeWord: startListening, enabled: mode === "idle" });
//   useJarvisIntro({ onReady: () => speak("Good morning. All systems online.") });

import { useEffect, useRef, useCallback, useState } from "react";

// ============================================================
// 1. ELEVENLABS SPEAK HOOK
// ============================================================
// Drop-in replacement for the existing speak() function.
// Calls /api/tts which proxies ElevenLabs.
// Falls back to Web Speech API if ElevenLabs isn't configured
// or returns an error.

export function useElevenLabsSpeak() {
  const configRef = useRef({ ttsEnabled: false, voiceId: "pNInz6obpgDQGcFmaJgB" });
  const audioRef = useRef(null);

  // Load config once on mount
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((cfg) => { configRef.current = cfg; })
      .catch(() => {});
  }, []);

  // Fallback: Web Speech API
  const webSpeakFallback = useCallback((text) => {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !window.speechSynthesis || !text) {
        resolve(); return;
      }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.98; u.pitch = 0.85;
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find((v) =>
        /daniel|alex|google uk english male|microsoft david|microsoft george/i.test(v.name)
      ) || voices.find((v) => v.lang?.startsWith("en"));
      if (preferred) u.voice = preferred;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      setTimeout(() => window.speechSynthesis.speak(u), 50);
    });
  }, []);

  // Main speak function — ElevenLabs first, fallback second
  const speak = useCallback((text) => {
    return new Promise(async (resolve) => {
      if (!text?.trim()) { resolve(); return; }

      const cfg = configRef.current;

      // Try ElevenLabs
      if (cfg.ttsEnabled) {
        try {
          const res = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, voiceId: cfg.voiceId }),
          });

          if (res.ok && res.headers.get("content-type")?.includes("audio")) {
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audioRef.current = audio;

            audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
            audio.onerror = async () => {
              URL.revokeObjectURL(url);
              await webSpeakFallback(text);
              resolve();
            };

            try {
              await audio.play();
              return; // resolve will be called by onended
            } catch {
              // Autoplay blocked — fall through to Web Speech
            }
          }
        } catch {
          // Network error — fall through
        }
      }

      // Fallback
      await webSpeakFallback(text);
      resolve();
    });
  }, [webSpeakFallback]);

  // Stop any current speech
  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // Unlock audio context on user gesture (required for iOS/Android)
  const unlockSpeech = useCallback(() => {
    if (typeof window === "undefined") return;
    if (window.speechSynthesis) {
      const unlock = new SpeechSynthesisUtterance("");
      unlock.volume = 0;
      unlock.rate = 10;
      window.speechSynthesis.speak(unlock);
    }
    // Also unlock Web Audio context
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      const ctx = new AudioContext();
      ctx.resume().catch(() => {});
    }
  }, []);

  return { speak, stopSpeaking, unlockSpeech };
}

// ============================================================
// 2. WAKE WORD HOOK
// ============================================================
// Runs continuous speech recognition listening for the wake word.
// When detected, calls onWakeWord().
// Only active when enabled=true (i.e. when JARVIS is idle).

export function useWakeWord({ onWakeWord, enabled = true }) {
  const recognitionRef = useRef(null);
  const enabledRef = useRef(enabled);
  const onWakeWordRef = useRef(onWakeWord);
  const wakeWordRef = useRef("hey jarvis");
  const restartTimerRef = useRef(null);

  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { onWakeWordRef.current = onWakeWord; }, [onWakeWord]);

  // Fetch wake word from config
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((cfg) => {
        if (cfg.wakeWord) wakeWordRef.current = cfg.wakeWord.toLowerCase();
      })
      .catch(() => {});
  }, []);

  const startWakeWordListening = useCallback(() => {
    if (typeof window === "undefined") return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    // Don't start if already running
    if (recognitionRef.current) return;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 3;

    recognition.onresult = (event) => {
      if (!enabledRef.current) return;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const alternatives = event.results[i];
        for (let j = 0; j < alternatives.length; j++) {
          const transcript = alternatives[j].transcript.toLowerCase().trim();
          const wakeWord = wakeWordRef.current;

          if (transcript.includes(wakeWord)) {
            // Stop wake word recognition before calling onWakeWord
            // so the main recognition can start fresh
            recognition.stop();
            recognitionRef.current = null;
            onWakeWordRef.current?.();
            return;
          }
        }
      }
    };

    recognition.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") return;
      recognitionRef.current = null;
      // Restart after a delay
      if (enabledRef.current) {
        restartTimerRef.current = setTimeout(startWakeWordListening, 3000);
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      // Restart if still enabled
      if (enabledRef.current) {
        restartTimerRef.current = setTimeout(startWakeWordListening, 500);
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {}
  }, []);

  const stopWakeWordListening = useCallback(() => {
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
  }, []);

  // Start/stop based on enabled state
  useEffect(() => {
    if (enabled) {
      // Small delay to avoid conflict with main recognition stopping
      const t = setTimeout(startWakeWordListening, 1000);
      return () => {
        clearTimeout(t);
        stopWakeWordListening();
      };
    } else {
      stopWakeWordListening();
    }
  }, [enabled, startWakeWordListening, stopWakeWordListening]);

  // Cleanup on unmount
  useEffect(() => () => stopWakeWordListening(), [stopWakeWordListening]);
}

// ============================================================
// 3. DAILY INTRO HOOK
// ============================================================
// On first load each day, plays 15 seconds of the day's assigned song
// via Apple MusicKit JS, then fades out and calls onComplete.
//
// Song rotation (by day of week):
//   Sun: Back in Black — AC/DC
//   Mon: Award Tour — A Tribe Called Quest
//   Tue: Fly Away — Lenny Kravitz
//   Wed: Smells Like Teen Spirit — Nirvana
//   Thu: Back in Black — AC/DC
//   Fri: Award Tour — A Tribe Called Quest
//   Sat: Fly Away — Lenny Kravitz
//
// Requires Apple MusicKit JS and APPLE_MUSIC credentials.
// Falls back silently if not configured.

// Apple Music song IDs (from Apple Music catalog)
const DAILY_SONGS = [
  { id: "1440904656", title: "Back in Black",          artist: "AC/DC" },          // Sun
  { id: "724386760",  title: "Award Tour",              artist: "A Tribe Called Quest" }, // Mon
  { id: "696054",     title: "Fly Away",                artist: "Lenny Kravitz" },  // Tue
  { id: "1440935467", title: "Smells Like Teen Spirit", artist: "Nirvana" },        // Wed
  { id: "1440904656", title: "Back in Black",          artist: "AC/DC" },          // Thu
  { id: "724386760",  title: "Award Tour",              artist: "A Tribe Called Quest" }, // Fri
  { id: "696054",     title: "Fly Away",                artist: "Lenny Kravitz" },  // Sat
];

const INTRO_PLAYED_KEY = "jarvis_intro_date";

function getTodaySong() {
  const day = new Date().getDay(); // 0=Sun, 6=Sat
  return DAILY_SONGS[day];
}

function hasPlayedTodayIntro() {
  try {
    const stored = localStorage.getItem(INTRO_PLAYED_KEY);
    if (!stored) return false;
    const today = new Date().toDateString();
    return stored === today;
  } catch { return false; }
}

function markIntroPlayed() {
  try {
    localStorage.setItem(INTRO_PLAYED_KEY, new Date().toDateString());
  } catch {}
}

let musicKitLoaded = false;
let musicKitPromise = null;

function loadMusicKit(developerToken) {
  if (window.MusicKit) return Promise.resolve(window.MusicKit);
  if (musicKitPromise) return musicKitPromise;
  musicKitPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://js-cdn.music.apple.com/musickit/v3/musickit.js";
    script.setAttribute("crossorigin", "");
    script.onload = async () => {
      try {
        await window.MusicKit.configure({
          developerToken,
          app: { name: "JARVIS Dashboard", build: "1.0.0" },
        });
        resolve(window.MusicKit);
      } catch (err) { reject(err); }
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return musicKitPromise;
}

export function useJarvisIntro({ onComplete, onSongInfo }) {
  const [introState, setIntroState] = useState("idle"); // idle | loading | playing | done | skipped
  const musicRef = useRef(null);
  const fadeTimerRef = useRef(null);
  const stopTimerRef = useRef(null);

  useEffect(() => {
    // Don't play if already played today
    if (hasPlayedTodayIntro()) {
      setIntroState("skipped");
      onComplete?.();
      return;
    }

    let cancelled = false;

    const initIntro = async () => {
      setIntroState("loading");

      // Fetch Apple Music token and config
      let token = null;
      let appleMusicEnabled = false;
      try {
        const [configRes, tokenRes] = await Promise.all([
          fetch("/api/config"),
          fetch("/api/apple-music-token"),
        ]);
        const config = await configRes.json();
        appleMusicEnabled = config.appleMusicEnabled;
        if (appleMusicEnabled && tokenRes.ok) {
          const tokenData = await tokenRes.json();
          token = tokenData.token;
        }
      } catch {}

      if (cancelled) return;

      if (!appleMusicEnabled || !token) {
        // No Apple Music configured — skip intro, call onComplete
        setIntroState("skipped");
        markIntroPlayed();
        onComplete?.();
        return;
      }

      // Load MusicKit
      try {
        const MusicKit = await loadMusicKit(token);
        if (cancelled) return;

        const music = MusicKit.getInstance();
        musicRef.current = music;

        // Authorize (prompts user to sign in if needed — only happens once)
        try {
          await music.authorize();
        } catch {
          setIntroState("skipped");
          onComplete?.();
          return;
        }

        if (cancelled) return;

        const song = getTodaySong();
        onSongInfo?.(song);

        // Queue the song
        await music.setQueue({ song: song.id });
        setIntroState("playing");

        // Play
        await music.play();

        // Stop after 15 seconds with a 2-second fade out
        stopTimerRef.current = setTimeout(async () => {
          if (cancelled) return;

          // Fade out over 2 seconds
          const startVolume = music.volume || 1;
          let vol = startVolume;
          const fadeStep = startVolume / 20;
          fadeTimerRef.current = setInterval(() => {
            vol = Math.max(0, vol - fadeStep);
            try { music.volume = vol; } catch {}
            if (vol <= 0) {
              clearInterval(fadeTimerRef.current);
              music.stop();
              setIntroState("done");
              markIntroPlayed();
              onComplete?.();
            }
          }, 100);
        }, 13000); // 13s play + 2s fade = 15s total

      } catch (err) {
        console.warn("[JARVIS Intro] MusicKit error:", err);
        setIntroState("skipped");
        markIntroPlayed();
        onComplete?.();
      }
    };

    initIntro();

    return () => {
      cancelled = true;
      if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      if (musicRef.current) {
        try { musicRef.current.stop(); } catch {}
      }
    };
  }, []);

  const skipIntro = useCallback(() => {
    if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    if (musicRef.current) {
      try { musicRef.current.stop(); } catch {}
    }
    setIntroState("done");
    markIntroPlayed();
    onComplete?.();
  }, [onComplete]);

  return { introState, skipIntro };
}

// ============================================================
// INTRO OVERLAY COMPONENT
// ============================================================
// Shows a full-screen JARVIS boot sequence overlay while the
// intro music plays. Fades out when music ends.

export function IntroOverlay({ introState, songInfo, onSkip }) {
  const [visible, setVisible] = useState(true);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    if (introState === "done" || introState === "skipped") {
      // Fade out
      setOpacity(0);
      setTimeout(() => setVisible(false), 800);
    }
  }, [introState]);

  if (!visible || introState === "skipped") return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{
        background: "radial-gradient(ellipse at center, #0B1626 0%, #020617 100%)",
        transition: "opacity 0.8s ease",
        opacity,
      }}
    >
      {/* Animated rings */}
      <svg viewBox="-200 -200 400 400" className="absolute w-full h-full opacity-20 pointer-events-none">
        {[60, 90, 120, 150, 180].map((r, i) => (
          <circle
            key={r}
            cx="0" cy="0" r={r}
            fill="none"
            stroke="#67E8F9"
            strokeWidth="0.5"
            opacity={0.8 - i * 0.12}
            style={{
              animation: `spin ${8 + i * 4}s linear infinite`,
              transformOrigin: "center",
              strokeDasharray: `${r * 0.4} ${r * 0.6}`,
            }}
          />
        ))}
      </svg>

      {/* JARVIS text */}
      <div className="relative z-10 text-center">
        <div
          className="text-6xl font-light tracking-[0.5em] mb-4"
          style={{
            color: "#67E8F9",
            filter: "drop-shadow(0 0 20px #67E8F9)",
            fontFamily: "ui-monospace, 'SF Mono', monospace",
          }}
        >
          JARVIS
        </div>

        <div
          className="text-[11px] tracking-[0.4em] mb-8 opacity-60"
          style={{ color: "#67E8F9" }}
        >
          SYSTEMS INITIALIZING
        </div>

        {/* Progress bar */}
        {introState === "loading" && (
          <div className="w-48 h-px mx-auto mb-6" style={{ background: "#67E8F922" }}>
            <div
              className="h-full"
              style={{
                background: "#67E8F9",
                width: "60%",
                animation: "pulse 1s ease-in-out infinite",
                boxShadow: "0 0 8px #67E8F9",
              }}
            />
          </div>
        )}

        {/* Song info */}
        {introState === "playing" && songInfo && (
          <div className="mt-4">
            <div className="text-[9px] tracking-[0.3em] opacity-40 mb-1" style={{ color: "#67E8F9" }}>
              TODAY'S INTRO
            </div>
            <div className="text-sm tracking-[0.15em]" style={{ color: "#67E8F9" }}>
              {songInfo.title}
            </div>
            <div className="text-[10px] tracking-[0.2em] opacity-60 mt-0.5" style={{ color: "#67E8F9" }}>
              {songInfo.artist}
            </div>
          </div>
        )}

        {/* Skip button */}
        {(introState === "playing" || introState === "loading") && (
          <button
            onClick={onSkip}
            className="mt-8 px-4 py-1.5 text-[9px] tracking-[0.3em] opacity-40 hover:opacity-80 transition-opacity"
            style={{ border: "1px solid #67E8F944", color: "#67E8F9" }}
          >
            SKIP INTRO
          </button>
        )}
      </div>
    </div>
  );
}
