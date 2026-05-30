// JARVIS v2.8.0 — JarvisBriefing.jsx patch instructions
// Apply these 4 changes to your existing JarvisBriefing.jsx

// ============================================================
// CHANGE 1: Add import at the top (after existing imports)
// Find: import ResearchPanel, { buildResearchCommand } from "./ResearchPanel.jsx";
// Add after it:
// ============================================================

import { useElevenLabsSpeak, useWakeWord, useJarvisIntro, IntroOverlay } from "./VoiceAndIntro.jsx";

// ============================================================
// CHANGE 2: Replace the existing speak/unlockSpeech functions
// Find and replace the entire block from:
//   "// Unlock speech synthesis on mobile"
// through:
//   "}, []);"  (the end of the speak useCallback)
// Replace with:
// ============================================================

  const { speak, stopSpeaking, unlockSpeech } = useElevenLabsSpeak();

// ============================================================
// CHANGE 3: Add these hooks after the speak line above
// (after "const { speak, stopSpeaking, unlockSpeech } = useElevenLabsSpeak();")
// ============================================================

  // Wake word — listens for "hey jarvis" when idle
  useWakeWord({
    onWakeWord: () => {
      unlockSpeech();
      startListening();
    },
    enabled: mode === "idle",
  });

  // Daily intro music + boot sequence
  const [introSong, setIntroSong] = useState(null);
  const { introState, skipIntro } = useJarvisIntro({
    onComplete: () => {
      // Play JARVIS greeting after intro
      setTimeout(() => {
        speak("Good morning. All systems online. How can I assist you today?");
      }, 500);
    },
    onSongInfo: (song) => setIntroSong(song),
  });

// ============================================================
// CHANGE 4: Add IntroOverlay to the JSX render
// Find the opening div of the return statement:
//   <div className="min-h-screen w-full text-slate-200 ...">
// Add this as the FIRST child inside it (before the grid background div):
// ============================================================

      <IntroOverlay
        introState={introState}
        songInfo={introSong}
        onSkip={skipIntro}
      />
