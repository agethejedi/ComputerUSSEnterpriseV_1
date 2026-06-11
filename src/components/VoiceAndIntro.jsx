// VoiceAndIntro.jsx
// 1. ElevenLabs TTS (falls back to Web Speech API)
// 2. Wake word continuous listening
// 3. Daily Apple Music intro with timeout safety

import { useEffect, useRef, useCallback, useState } from "react";

// ============================================================
// 1. ELEVENLABS SPEAK HOOK
// ============================================================

export function useElevenLabsSpeak() {
  const configRef = useRef({ ttsEnabled: false, voiceId: "pNInz6obpgDQGcFmaJgB" });
  const audioRef = useRef(null);
  const configLoadedRef = useRef(false);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((cfg) => {
        configRef.current = cfg;
        configLoadedRef.current = true;
        console.log("[JARVIS TTS] Config loaded:", { ttsEnabled: cfg.ttsEnabled, voiceId: cfg.voiceId });
      })
      .catch((err) => {
        console.warn("[JARVIS TTS] Config fetch failed:", err);
        configLoadedRef.current = true;
      });
  }, []);

  const webSpeakFallback = useCallback((text) => {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !window.speechSynthesis || !text) { resolve(); return; }
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

  const speak = useCallback((text) => {
    return new Promise(async (resolve) => {
      if (!text?.trim()) { resolve(); return; }

      const cfg = configRef.current;
      console.log("[JARVIS TTS] Speaking:", text.slice(0, 40), "| ElevenLabs:", cfg.ttsEnabled);

      if (cfg.ttsEnabled) {
        try {
          const res = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, voiceId: cfg.voiceId }),
          });

          console.log("[JARVIS TTS] Status:", res.status, res.headers.get("content-type"));

          if (res.ok && res.headers.get("content-type")?.includes("audio")) {
            const arrayBuffer = await res.arrayBuffer();

            // Try Web Audio API first — works on iOS because AudioContext was
            // unlocked via silent buffer in unlockSpeech() during the gesture
            const actx = window._jarvisAudioCtx;
            if (actx) {
              try {
                if (actx.state === "suspended") await actx.resume();
                const decoded = await actx.decodeAudioData(arrayBuffer.slice(0));
                const src = actx.createBufferSource();
                src.buffer = decoded;
                src.connect(actx.destination);
                audioRef.current = src;
                await new Promise((audioResolve) => {
                  src.onended = () => audioResolve();
                  src.start(0);
                });
                resolve();
                return;
              } catch (webAudioErr) {
                console.warn("[JARVIS TTS] Web Audio decode failed:", webAudioErr);
              }
            }

            // Fallback: blob URL + HTML5 Audio
            const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });
            const url  = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.playsInline = true; // Required for iOS inline playback
            audioRef.current = audio;

            await new Promise((audioResolve) => {
              audio.onended = () => { URL.revokeObjectURL(url); audioResolve(); };
              audio.onerror = async () => {
                URL.revokeObjectURL(url);
                await webSpeakFallback(text);
                audioResolve();
              };
              audio.play().catch(async (e) => {
                console.warn("[JARVIS TTS] HTML5 Audio blocked:", e);
                URL.revokeObjectURL(url);
                await webSpeakFallback(text);
                audioResolve();
              });
            });

            resolve();
            return;
          } else {
            const errText = await res.text().catch(() => "");
            console.warn("[JARVIS TTS] Error:", res.status, errText.slice(0, 200));
          }
        } catch (err) {
          console.warn("[JARVIS TTS] Fetch error:", err);
        }
      }

      // Final fallback — Web Speech API
      console.log("[JARVIS TTS] Falling back to Web Speech API");
      await webSpeakFallback(text);
      resolve();
    });
  }, [webSpeakFallback]);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);

  const unlockSpeech = useCallback(() => {
    if (typeof window === "undefined") return;

    // Unlock Web Speech API
    if (window.speechSynthesis) {
      const unlock = new SpeechSynthesisUtterance("");
      unlock.volume = 0; unlock.rate = 10;
      window.speechSynthesis.speak(unlock);
    }

    // iOS requires a persistent AudioContext + silent buffer played inside a gesture
    // Creating a new AudioContext each time does NOT unlock audio on iOS
    if (!window._jarvisAudioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        try { window._jarvisAudioCtx = new AC(); } catch {}
      }
    }

    const actx = window._jarvisAudioCtx;
    if (actx) {
      // Resume suspended context
      if (actx.state === "suspended") {
        actx.resume().catch(() => {});
      }
      // Play a silent buffer — required by iOS to fully unlock audio playback
      try {
        const buf = actx.createBuffer(1, 1, 22050);
        const src = actx.createBufferSource();
        src.buffer = buf;
        src.connect(actx.destination);
        src.start(0);
      } catch {}
    }

    // Also pre-create and immediately pause a silent HTML5 Audio element
    // This registers a user gesture for subsequent Audio() playback on iOS
    if (!window._jarvisAudioUnlocked) {
      try {
        const silent = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAA" +
          "EAAQARAAAAAgABAAIAZGF0YQQAAAAAAA==");
        silent.volume = 0;
        const p = silent.play();
        if (p) p.then(() => { silent.pause(); window._jarvisAudioUnlocked = true; }).catch(() => {});
      } catch {}
    }
  }, []);

  return { speak, stopSpeaking, unlockSpeech };
}

// ============================================================
// 2. WAKE WORD HOOKS
// ============================================================
// useMultiWakeWord — single recognition session, multiple wake words.
// Pass an array of { word, onMatch, enabled } objects.
// Only ONE mic session runs regardless of how many wake words are registered.
// This prevents the mic-flashing issue caused by concurrent recognition sessions.
//
// useWakeWord — legacy single-word wrapper around useMultiWakeWord.

// ============================================================
// 2. WAKE WORD HOOKS
// ============================================================
// Single background recognition session for wake words.
// Pauses itself when JARVIS command listening is active.
// Resumes automatically when command listening ends.

const wakeWordRegistry = {
  listeners:    [],
  recognition:  null,
  restartTimer: null,
  paused:       false,  // true while command recognition is active

  register(entry) {
    this.listeners.push(entry);
    if (!this.paused) this.ensureRunning();
    return () => { this.listeners = this.listeners.filter(l => l !== entry); };
  },

  // Called by startListening — stops wake word session so mic is free
  pause() {
    this.paused = true;
    if (this.restartTimer) { clearTimeout(this.restartTimer); this.restartTimer = null; }
    if (this.recognition) {
      try { this.recognition.stop(); } catch {}
      this.recognition = null;
    }
  },

  // Called by stopListening — restarts wake word session after command ends
  resume() {
    this.paused = false;
    // Small delay to let command recognition fully release the mic
    this.restartTimer = setTimeout(() => this.ensureRunning(), 600);
  },

  ensureRunning() {
    if (this.paused || this.recognition) return;
    const anyEnabled = this.listeners.some(l => l.enabled.current);
    if (!anyEnabled) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 3;

    recognition.onresult = (event) => {
      if (this.paused) return;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        for (let j = 0; j < event.results[i].length; j++) {
          const transcript = event.results[i][j].transcript.toLowerCase().trim();
          for (const listener of this.listeners) {
            if (!listener.enabled.current) continue;
            if (transcript.includes(listener.word.current)) {
              recognition.stop();
              this.recognition = null;
              listener.onMatch.current?.();
              // Don't auto-restart — resume() will be called when appropriate
              return;
            }
          }
        }
      }
    };

    recognition.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") return;
      this.recognition = null;
      if (!this.paused) {
        this.restartTimer = setTimeout(() => this.ensureRunning(), 3000);
      }
    };

    recognition.onend = () => {
      this.recognition = null;
      if (!this.paused) {
        this.restartTimer = setTimeout(() => this.ensureRunning(), 600);
      }
    };

    try { recognition.start(); this.recognition = recognition; } catch {}
  },

  stop() {
    if (this.restartTimer) clearTimeout(this.restartTimer);
    if (this.recognition) {
      try { this.recognition.stop(); } catch {}
      this.recognition = null;
    }
  },
};

// Export pause/resume so command recognition can coordinate with wake word session
export const pauseWakeWords  = () => wakeWordRegistry.pause();
export const resumeWakeWords = () => wakeWordRegistry.resume();
export function useMultiWakeWord(entries) {
  // entries: [{ word, onMatch, enabled }]
  const enabledRefs = useRef([]);
  const wordRefs    = useRef([]);
  const onMatchRefs = useRef([]);

  // Initialize refs on first render
  if (enabledRefs.current.length === 0) {
    entries.forEach((e, i) => {
      enabledRefs.current[i] = { current: e.enabled };
      wordRefs.current[i]    = { current: e.word?.toLowerCase() || "" };
      onMatchRefs.current[i] = { current: e.onMatch };
    });
  }

  // Update refs every render so registry always reads fresh values
  entries.forEach((e, i) => {
    if (enabledRefs.current[i]) enabledRefs.current[i].current = e.enabled;
    if (wordRefs.current[i])    wordRefs.current[i].current    = e.word?.toLowerCase() || "";
    if (onMatchRefs.current[i]) onMatchRefs.current[i].current = e.onMatch;
  });

  // Register on mount
  useEffect(() => {
    const unregisters = entries.map((_, i) =>
      wakeWordRegistry.register({
        word:    wordRefs.current[i],
        onMatch: onMatchRefs.current[i],
        enabled: enabledRefs.current[i],
      })
    );
    wakeWordRegistry.ensureRunning();
    return () => {
      unregisters.forEach(u => u());
      if (wakeWordRegistry.listeners.length === 0) wakeWordRegistry.stop();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Kick the registry whenever any enabled state changes —
  // this restarts recognition if it stopped while everything was disabled
  const enabledKey = entries.map(e => e.enabled).join(",");
  useEffect(() => {
    const anyEnabled = entries.some(e => e.enabled);
    if (anyEnabled && !wakeWordRegistry.recognition) {
      // Small delay to let state settle
      const t = setTimeout(() => wakeWordRegistry.ensureRunning(), 200);
      return () => clearTimeout(t);
    }
  }, [enabledKey]); // eslint-disable-line react-hooks/exhaustive-deps
}

// Legacy single-word hook — wraps useMultiWakeWord
export function useWakeWord({ onWakeWord, enabled = true, wakeWord = null }) {
  const wordRef    = useRef(wakeWord?.toLowerCase() || "hey jarvis");
  const enabledRef = useRef(enabled);
  const onMatchRef = useRef(onWakeWord);

  // Update refs every render
  wordRef.current    = wakeWord?.toLowerCase() || wordRef.current;
  enabledRef.current = enabled;
  onMatchRef.current = onWakeWord;

  useEffect(() => {
    if (!wakeWord) {
      fetch("/api/config")
        .then(r => r.json())
        .then(cfg => { if (cfg.wakeWord) wordRef.current = cfg.wakeWord.toLowerCase(); })
        .catch(() => {});
    }
  }, [wakeWord]);

  useEffect(() => {
    const unregister = wakeWordRegistry.register({
      word:    wordRef,
      onMatch: onMatchRef,
      enabled: enabledRef,
    });
    wakeWordRegistry.ensureRunning();
    return () => {
      unregister();
      if (wakeWordRegistry.listeners.length === 0) wakeWordRegistry.stop();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Restart recognition when enabled flips to true
  useEffect(() => {
    if (enabled && !wakeWordRegistry.recognition) {
      const t = setTimeout(() => wakeWordRegistry.ensureRunning(), 200);
      return () => clearTimeout(t);
    }
  }, [enabled]);
}

// ============================================================
// 3. DAILY INTRO HOOK
// ============================================================

const DAILY_SONGS = [
  { id: "1440904656", title: "Back in Black",          artist: "AC/DC" },
  { id: "724386760",  title: "Award Tour",              artist: "A Tribe Called Quest" },
  { id: "696054",     title: "Fly Away",                artist: "Lenny Kravitz" },
  { id: "1440935467", title: "Smells Like Teen Spirit", artist: "Nirvana" },
  { id: "1440904656", title: "Back in Black",          artist: "AC/DC" },
  { id: "724386760",  title: "Award Tour",              artist: "A Tribe Called Quest" },
  { id: "696054",     title: "Fly Away",                artist: "Lenny Kravitz" },
];

const INTRO_DATE_KEY = "jarvis_intro_date";

function hasPlayedTodayIntro() {
  try { return localStorage.getItem(INTRO_DATE_KEY) === new Date().toDateString(); }
  catch { return false; }
}

function markIntroPlayed() {
  try { localStorage.setItem(INTRO_DATE_KEY, new Date().toDateString()); } catch {}
}

let musicKitPromise = null;
function loadMusicKit(developerToken) {
  if (window.MusicKit) {
    return Promise.resolve(window.MusicKit);
  }
  if (musicKitPromise) return musicKitPromise;
  musicKitPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://js-cdn.music.apple.com/musickit/v3/musickit.js";
    script.crossOrigin = "";
    script.onload = async () => {
      try {
        await window.MusicKit.configure({
          developerToken,
          app: {
            name: "JARVIS Dashboard",
            build: "1.0.0",
            version: "1.0.0",
          },
          storefrontId: "us",
          suppressErrorDialog: false,
        });
        resolve(window.MusicKit);
      } catch (err) { reject(err); }
    };
    script.onerror = () => reject(new Error("MusicKit load failed"));
    document.head.appendChild(script);
  });
  return musicKitPromise;
}

export function useJarvisIntro({ onComplete, onSongInfo }) {
  const [introState, setIntroState] = useState("idle");
  const musicRef = useRef(null);
  const timerRefs = useRef([]);
  const completedRef = useRef(false);

  const complete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current.forEach(clearInterval);
    timerRefs.current = [];
    try { if (musicRef.current) musicRef.current.stop(); } catch {}
    markIntroPlayed();
    setIntroState("done");
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    // Already played today — skip immediately
    if (hasPlayedTodayIntro()) {
      setIntroState("skipped");
      onComplete?.();
      return;
    }

    let cancelled = false;
    setIntroState("loading");

    // Hard timeout — generous enough for auth popup interaction (30 seconds)
    const hardTimeout = setTimeout(() => {
      if (!cancelled && !completedRef.current) {
        console.warn("[JARVIS Intro] Hard timeout reached — skipping intro");
        setIntroState("skipped");
        // Only mark played if we actually got through auth
        // Don't mark here so user can try again tomorrow
        onComplete?.();
      }
    }, 30000);

    const initIntro = async () => {
      try {
        // Fetch config with a short timeout
        const configPromise = Promise.race([
          fetch("/api/config").then(r => r.json()),
          new Promise((_, reject) => setTimeout(() => reject(new Error("config timeout")), 3000)),
        ]);

        let config = {};
        try { config = await configPromise; } catch { config = { appleMusicEnabled: false }; }

        if (cancelled || completedRef.current) return;

        if (!config.appleMusicEnabled) {
          console.log("[JARVIS Intro] Apple Music not configured — skipping music, greeting only");
          clearTimeout(hardTimeout);
          setIntroState("skipped");
          markIntroPlayed();
          onComplete?.();
          return;
        }

        // Fetch Apple Music token with timeout
        const tokenPromise = Promise.race([
          fetch("/api/apple-music-token").then(r => r.json()),
          new Promise((_, reject) => setTimeout(() => reject(new Error("token timeout")), 3000)),
        ]);

        let tokenData = {};
        try { tokenData = await tokenPromise; } catch {
          console.warn("[JARVIS Intro] Token fetch timed out");
          clearTimeout(hardTimeout);
          setIntroState("skipped");
          markIntroPlayed();
          onComplete?.();
          return;
        }

        if (cancelled || completedRef.current) return;

        if (!tokenData.token) {
          console.warn("[JARVIS Intro] No token — skipping");
          clearTimeout(hardTimeout);
          setIntroState("skipped");
          markIntroPlayed();
          onComplete?.();
          return;
        }

        // Load MusicKit with timeout
        let MusicKit;
        try {
          MusicKit = await Promise.race([
            loadMusicKit(tokenData.token),
            new Promise((_, reject) => setTimeout(() => reject(new Error("MusicKit load timeout")), 5000)),
          ]);
        } catch (err) {
          console.warn("[JARVIS Intro] MusicKit load failed:", err);
          clearTimeout(hardTimeout);
          setIntroState("skipped");
          markIntroPlayed();
          onComplete?.();
          return;
        }

        if (cancelled || completedRef.current) return;

        const music = MusicKit.getInstance();
        musicRef.current = music;

        // Authorize — give user up to 25 seconds to interact with the popup
        try {
          await Promise.race([
            music.authorize(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("auth timeout")), 25000)),
          ]);
        } catch {
          console.warn("[JARVIS Intro] Auth failed or timed out");
          clearTimeout(hardTimeout);
          setIntroState("skipped");
          markIntroPlayed();
          onComplete?.();
          return;
        }

        if (cancelled || completedRef.current) return;

        // Share the authorized instance for music playback commands
        setMusicInstance(music);

        const song = DAILY_SONGS[new Date().getDay()];
        onSongInfo?.(song);
        clearTimeout(hardTimeout);

        try {
          // MusicKit v3 — set queue with catalog song format
          await music.setQueue({
            songs: [song.id],
          });

          // Wait a tick for queue to be ready
          await new Promise(r => setTimeout(r, 300));

          setIntroState("playing");
          await music.play();
        } catch (playErr) {
          console.warn("[JARVIS Intro] Playback failed:", playErr);
          // Try alternate catalog format
          try {
            await music.setQueue({ url: `https://music.apple.com/us/song/${song.id}` });
            await new Promise(r => setTimeout(r, 300));
            setIntroState("playing");
            await music.play();
          } catch (playErr2) {
            console.warn("[JARVIS Intro] Alternate playback also failed:", playErr2);
            setIntroState("skipped");
            markIntroPlayed();
            onComplete?.();
            return;
          }
        }

        // Fade out after 13s, total 15s
        const stopT = setTimeout(() => {
          let vol = music.volume || 1;
          const fadeI = setInterval(() => {
            vol = Math.max(0, vol - (vol / 20));
            try { music.volume = vol; } catch {}
            if (vol <= 0.01) { clearInterval(fadeI); complete(); }
          }, 100);
          timerRefs.current.push(fadeI);
        }, 13000);
        timerRefs.current.push(stopT);

      } catch (err) {
        console.warn("[JARVIS Intro] Unexpected error:", err);
        clearTimeout(hardTimeout);
        if (!completedRef.current) {
          setIntroState("skipped");
          markIntroPlayed();
          onComplete?.();
        }
      }
    };

    initIntro();

    return () => {
      cancelled = true;
      clearTimeout(hardTimeout);
      timerRefs.current.forEach(t => { try { clearTimeout(t); clearInterval(t); } catch {} });
      try { if (musicRef.current) musicRef.current.stop(); } catch {}
    };
  }, []);

  const skipIntro = useCallback(() => { complete(); }, [complete]);

  return { introState, skipIntro };
}

// ============================================================
// INTRO OVERLAY
// ============================================================

export function IntroOverlay({ introState, songInfo, onSkip }) {
  const [visible, setVisible] = useState(true);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    if (introState === "done" || introState === "skipped") {
      setOpacity(0);
      setTimeout(() => setVisible(false), 800);
    }
  }, [introState]);

  if (!visible || introState === "skipped") return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{ background: "radial-gradient(ellipse at center, #0B1626 0%, #020617 100%)", transition: "opacity 0.8s ease", opacity }}>
      <svg viewBox="-200 -200 400 400" className="absolute w-full h-full opacity-20 pointer-events-none" style={{ maxWidth: "600px" }}>
        {[60, 90, 120, 150, 180].map((r, i) => (
          <circle key={r} cx="0" cy="0" r={r} fill="none" stroke="#67E8F9" strokeWidth="0.5"
            opacity={0.8 - i * 0.12}
            style={{ animation: `spin ${8 + i * 4}s linear infinite`, transformOrigin: "center", strokeDasharray: `${r * 0.4} ${r * 0.6}` }} />
        ))}
      </svg>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      <div className="relative z-10 text-center px-8">
        <div className="text-6xl font-light tracking-[0.5em] mb-4"
          style={{ color: "#67E8F9", filter: "drop-shadow(0 0 20px #67E8F9)", fontFamily: "ui-monospace, 'SF Mono', monospace" }}>
          JARVIS
        </div>
        <div className="text-[11px] tracking-[0.4em] mb-8 opacity-60" style={{ color: "#67E8F9" }}>
          SYSTEMS INITIALIZING
        </div>

        {introState === "loading" && (
          <div className="w-48 h-px mx-auto mb-6 overflow-hidden" style={{ background: "#67E8F922" }}>
            <div className="h-full" style={{ background: "#67E8F9", width: "60%", boxShadow: "0 0 8px #67E8F9", animation: "pulse 1.5s ease-in-out infinite" }} />
          </div>
        )}

        {introState === "playing" && songInfo && (
          <div className="mt-4 mb-6">
            <div className="text-[9px] tracking-[0.3em] opacity-40 mb-1" style={{ color: "#67E8F9" }}>TODAY'S INTRO</div>
            <div className="text-sm tracking-[0.15em]" style={{ color: "#67E8F9" }}>{songInfo.title}</div>
            <div className="text-[10px] tracking-[0.2em] opacity-60 mt-0.5" style={{ color: "#67E8F9" }}>{songInfo.artist}</div>
          </div>
        )}

        {(introState === "playing" || introState === "loading") && (
          <button onClick={onSkip}
            className="mt-4 px-4 py-1.5 text-[9px] tracking-[0.3em] opacity-40 hover:opacity-80 transition-opacity"
            style={{ border: "1px solid #67E8F944", color: "#67E8F9" }}>
            SKIP INTRO
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 4. APPLE MUSIC CONTROLLER
// ============================================================
// Shared MusicKit instance — set by useJarvisIntro after auth,
// used by useMusicController for playback commands.

const musicInstanceRef = { current: null };

export function setMusicInstance(instance) {
  musicInstanceRef.current = instance;
}

export function getMusicInstance() {
  return musicInstanceRef.current;
}

// Hook that exposes playback control functions for the tool executor
export function useMusicController() {

  const search = useCallback(async (query) => {
    const music = getMusicInstance();
    if (!music) return { error: "Apple Music not initialized. Try saying hey JARVIS after the dashboard loads." };
    try {
      const results = await music.api.music(
        "/v1/me/library/search",
        { term: query, types: "library-songs,library-albums,library-artists", limit: 5 }
      );
      const songs = results.data?.results?.["library-songs"]?.data || [];
      const albums = results.data?.results?.["library-albums"]?.data || [];
      const artists = results.data?.results?.["library-artists"]?.data || [];
      return { songs, albums, artists, query };
    } catch (err) {
      return { error: String(err) };
    }
  }, []);

  const playSong = useCallback(async (query) => {
    const music = getMusicInstance();
    if (!music) return { error: "Apple Music not initialized." };
    try {
      // Search library first
      const results = await music.api.music(
        "/v1/me/library/search",
        { term: query, types: "library-songs", limit: 1 }
      );
      const songs = results.data?.results?.["library-songs"]?.data || [];
      if (!songs.length) return { error: `Could not find "${query}" in your library.`, suggestion: "Try a different search term." };

      const song = songs[0];
      await music.setQueue({ songs: [song.id] });
      await new Promise(r => setTimeout(r, 200));
      await music.play();
      return {
        ok: true,
        nowPlaying: {
          title: song.attributes?.name,
          artist: song.attributes?.artistName,
          album: song.attributes?.albumName,
        }
      };
    } catch (err) {
      return { error: String(err) };
    }
  }, []);

  const playArtist = useCallback(async (artistName) => {
    const music = getMusicInstance();
    if (!music) return { error: "Apple Music not initialized." };
    try {
      const results = await music.api.music(
        "/v1/me/library/search",
        { term: artistName, types: "library-songs", limit: 25 }
      );
      const songs = results.data?.results?.["library-songs"]?.data || [];
      if (!songs.length) return { error: `No songs by "${artistName}" found in your library.` };

      // Filter to songs by this artist
      const filtered = songs.filter(s =>
        s.attributes?.artistName?.toLowerCase().includes(artistName.toLowerCase())
      );
      const toPlay = filtered.length ? filtered : songs;

      // Shuffle
      const shuffled = toPlay.sort(() => Math.random() - 0.5);
      await music.setQueue({ songs: shuffled.map(s => s.id) });
      await new Promise(r => setTimeout(r, 200));
      await music.play();

      const first = shuffled[0];
      return {
        ok: true,
        count: shuffled.length,
        nowPlaying: {
          title: first.attributes?.name,
          artist: first.attributes?.artistName,
          album: first.attributes?.albumName,
        }
      };
    } catch (err) {
      return { error: String(err) };
    }
  }, []);

  const playAlbum = useCallback(async (albumQuery) => {
    const music = getMusicInstance();
    if (!music) return { error: "Apple Music not initialized." };
    try {
      const results = await music.api.music(
        "/v1/me/library/search",
        { term: albumQuery, types: "library-albums", limit: 1 }
      );
      const albums = results.data?.results?.["library-albums"]?.data || [];
      if (!albums.length) return { error: `Album "${albumQuery}" not found in your library.` };

      const album = albums[0];
      await music.setQueue({ album: album.id });
      await new Promise(r => setTimeout(r, 200));
      await music.play();
      return {
        ok: true,
        nowPlaying: {
          album: album.attributes?.name,
          artist: album.attributes?.artistName,
        }
      };
    } catch (err) {
      return { error: String(err) };
    }
  }, []);

  const pause = useCallback(async () => {
    const music = getMusicInstance();
    if (!music) return { error: "Apple Music not initialized." };
    try {
      await music.pause();
      return { ok: true, state: "paused" };
    } catch (err) { return { error: String(err) }; }
  }, []);

  const resume = useCallback(async () => {
    const music = getMusicInstance();
    if (!music) return { error: "Apple Music not initialized." };
    try {
      await music.play();
      return { ok: true, state: "playing" };
    } catch (err) { return { error: String(err) }; }
  }, []);

  const skip = useCallback(async () => {
    const music = getMusicInstance();
    if (!music) return { error: "Apple Music not initialized." };
    try {
      await music.skipToNextItem();
      const item = music.nowPlayingItem;
      return {
        ok: true,
        nowPlaying: item ? {
          title: item.attributes?.name,
          artist: item.attributes?.artistName,
        } : null
      };
    } catch (err) { return { error: String(err) }; }
  }, []);

  const previous = useCallback(async () => {
    const music = getMusicInstance();
    if (!music) return { error: "Apple Music not initialized." };
    try {
      await music.skipToPreviousItem();
      const item = music.nowPlayingItem;
      return {
        ok: true,
        nowPlaying: item ? {
          title: item.attributes?.name,
          artist: item.attributes?.artistName,
        } : null
      };
    } catch (err) { return { error: String(err) }; }
  }, []);

  const setVolume = useCallback(async (level) => {
    const music = getMusicInstance();
    if (!music) return { error: "Apple Music not initialized." };
    try {
      // level is 0-100, MusicKit uses 0-1
      const vol = Math.max(0, Math.min(1, level / 100));
      music.volume = vol;
      return { ok: true, volume: level };
    } catch (err) { return { error: String(err) }; }
  }, []);

  const nowPlaying = useCallback(() => {
    const music = getMusicInstance();
    if (!music) return { error: "Apple Music not initialized." };
    const item = music.nowPlayingItem;
    const state = music.playbackState;
    // playbackState: 0=none, 1=loading, 2=playing, 3=paused, 4=stopped, 5=ended
    const stateLabels = { 0: "stopped", 1: "loading", 2: "playing", 3: "paused", 4: "stopped", 5: "ended" };
    if (!item) return { state: stateLabels[state] || "stopped", nowPlaying: null };
    return {
      state: stateLabels[state] || "unknown",
      nowPlaying: {
        title: item.attributes?.name,
        artist: item.attributes?.artistName,
        album: item.attributes?.albumName,
        durationMs: item.attributes?.durationInMillis,
      }
    };
  }, []);

  const stop = useCallback(async () => {
    const music = getMusicInstance();
    if (!music) return { error: "Apple Music not initialized." };
    try {
      await music.stop();
      return { ok: true, state: "stopped" };
    } catch (err) { return { error: String(err) }; }
  }, []);

  return { search, playSong, playArtist, playAlbum, pause, resume, skip, previous, setVolume, nowPlaying, stop };
}
