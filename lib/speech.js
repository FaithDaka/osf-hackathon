// Spoken playback for announcements, results and prompts.
// English uses the on-device Web Speech API (no network, no files).
// Luganda/Swahili play the bundled /audio/{lang}/ mp3 for the given key,
// falling back to English speech when the file is missing.
// Import-safe: no side effects, all platform access guarded and deferred
// until speak() is called (never during render or SSR prerender).

const AUDIO_LANGS = ['en', 'lg', 'sw'];

export function speakText(text, lang, audioKey) {
  const l = AUDIO_LANGS.includes(lang) ? lang : 'en';
  const words = String(text || '').trim();
  if (!words) return;
  try {
    if (l === 'en' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(words));
      return;
    }
    if (l !== 'en' && audioKey && typeof window !== 'undefined' && typeof Audio !== 'undefined') {
      const audio = new Audio(`/audio/${l}/${audioKey}.mp3`);
      audio.play().catch(() => speakEnglishFallback(words));
      return;
    }
    speakEnglishFallback(words);
  } catch {
    // Audio unavailable — callers already show the same text on screen.
  }
}

function speakEnglishFallback(words) {
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(words));
    }
  } catch {
    // Nothing more we can do offline without audio files.
  }
}

export function stopSpeaking() {
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  } catch {
    // Ignore.
  }
}
