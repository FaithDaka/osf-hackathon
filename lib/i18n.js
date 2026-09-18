// Hand-rolled i18n. No library. No dependencies.
// Works in browser and during Next.js prerender (all storage access guarded).

const LANG_KEY = 'ac_lang';
const SUPPORTED = ['en', 'lg', 'sw'];

// Uppercase SMS-style opt-in phrases per language.
const DETECT_MAP = [
  ['en', ['I NEED YOUR HELP', 'HELP']],
  ['lg', ['NYAMBA', 'NETAAGA OBUYAMBI', 'BUYAMBI', 'OBUYAMBI', 'OLI OTYA', 'JEBALE', 'JEEBALE']],
  ['sw', ['NITAHITAJA MSAADA', 'NITAHITAJA', 'NISAIDIE', 'JAMBO', 'MSAADA', 'WAKO', 'SAIDIE']],
];

export function detectLanguage(text) {
  const normalized = String(text || '').toUpperCase().trim();
  if (!normalized) return 'en';
  for (const [lang, phrases] of DETECT_MAP) {
    // Longest phrases first so "I NEED HELP" wins over "HELP".
    const ordered = [...phrases].sort((a, b) => b.length - a.length);
    for (const phrase of ordered) {
      if (normalized.includes(phrase)) return lang;
    }
  }
  return 'en';
}

export function t(key, lang, i18nData) {
  const data = i18nData && typeof i18nData === 'object' ? i18nData : {};
  const tables = [];
  if (data[lang]) tables.push(data[lang]);
  if (lang !== 'en' && data.en) tables.push(data.en);
  const parts = String(key || '').split('.');
  for (const table of tables) {
    let node = table;
    for (const part of parts) {
      if (node && typeof node === 'object' && part in node) {
        node = node[part];
      } else {
        node = undefined;
        break;
      }
    }
    if (typeof node === 'string') return node;
  }
  return key;
}

export function setLang(lang) {
  const next = SUPPORTED.includes(lang) ? lang : 'en';
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LANG_KEY, next);
    }
  } catch {
    // Storage unavailable (private mode, SSR) — language still returned.
  }
  return next;
}

export function getLang() {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(LANG_KEY);
      if (SUPPORTED.includes(stored)) return stored;
    }
  } catch {
    // Ignore storage errors and fall through to default.
  }
  return 'en';
}
