// SMS opt-in language detection + reply builder.
// In production this logic runs on the server (Africa's Talking callback);
// for the PoC it is inlined in the SMS simulator page. No side effects.
//
// Phrase lists live in data/sms-phrases.json (single source of truth) and
// are mirrored by hand into public/sms-sim/index.html, which cannot import
// JSON because it must also work opened straight from disk (file://).
import PHRASES from '../data/sms-phrases.json';

export const LANGUAGE_MAP = PHRASES.help_requests;

export function detectSmsLanguage(text) {
  const normalized = String(text || '').toUpperCase().trim();
  for (const [lang, phrases] of Object.entries(LANGUAGE_MAP)) {
    // Longest first so full phrases win over bare keywords.
    const ordered = [...phrases].sort((a, b) => b.length - a.length);
    for (const phrase of ordered) {
      if (phrase && normalized.includes(phrase)) return lang;
    }
  }
  return 'en';
}

export function buildSmsResponse(lang, mandateUrl, tollFreeNumber) {
  const responses = {
    en: `Hello! Alert Citizen can help you. Click this link: ${mandateUrl}?lang=en\n\nNo data? Call toll-free: ${tollFreeNumber}`,
    lg: `Tukulamusiza! Tusoobola okuyamba. Kozeesa link eno: ${mandateUrl}?lang=lg\n\nTolina data? Kuba ku number: ${tollFreeNumber}`,
    sw: `Jambo! Tutakusaidia. Bonyeza hii: ${mandateUrl}?lang=sw\n\nHuna data? Piga: ${tollFreeNumber}`,
  };
  return responses[lang] || responses.en;
}
