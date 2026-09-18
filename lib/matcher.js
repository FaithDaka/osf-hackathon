// Deterministic keyword-matching engine — the core of AlertCitizen.
// 100% client-side. No API calls. No LLM. No dependencies.
// All data (knowledgeBase, rules wording) is passed in or mirrored below;
// this module performs no imports and has no side effects on load.
//
// NOTE: verification message templates intentionally mirror data/rules.json
// word-for-word so this module stays self-contained (no data imports).

const SUPPORTED_LANGS = ['en', 'lg', 'sw'];

// Verification message templates (mirror of data/rules.json).
const RULE_MESSAGES = {
  fee: {
    en: 'You mentioned {user_amount} UGX. The legal fee is {statutory_fee} UGX. You do not need to pay more.',
    lg: 'Oyogedde ku sente UGX {user_amount}. Ssente entuufu ng\u2019etteeka bwe ligamba UGX {statutory_fee}. Toweetaaga kusasula nnyo.',
    sw: 'Umetaja UGX {user_amount}. Ada halali ni UGX {statutory_fee}. Huhitaji kulipa zaidi.',
  },
  authority: {
    en: 'You mentioned going to {user_authority}. For this matter, the correct authority is {correct_authority}.',
    lg: 'Oyogedde ku kugenda ewa {user_authority}. Ku nsonga eno, ekifo ekituufu kili ewa {correct_authority}.',
    sw: 'Umetaja kwenda kwa {user_authority}. Kwa jambo hili, mamlaka sahihi ni {correct_authority}.',
  },
  safety: {
    en: 'DO NOT go to LC1 for this. This is a criminal matter. Go to the nearest police station or call 112 immediately.',
    lg: 'TOGENDA ku LC1 ku kino. Kino kya bubbi. Genda ku poliisi erisinga okumpi oba okubire 112 mangu.',
    sw: 'USIENDE kwa LC1 kwa hili. Hili ni shauri la jinai. Nenda kituo cha polisi kilicho karibu au pigia 112 mara moja.',
  },
};

function normalizeLang(lang) {
  return SUPPORTED_LANGS.includes(lang) ? lang : 'en';
}

function fill(template, params) {
  let out = template;
  for (const [k, v] of Object.entries(params)) {
    out = out.split('{' + k + '}').join(String(v));
  }
  return out;
}

export function tokenize(input) {
  const normalized = String(input || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ');
  const words = normalized.split(/\s+/).filter(Boolean);
  const bigrams = [];
  for (let i = 0; i + 1 < words.length; i++) {
    bigrams.push(words[i] + ' ' + words[i + 1]);
  }
  return [...words, ...bigrams];
}

export function match(input, lang, knowledgeBase) {
  const l = normalizeLang(lang);
  const text = String(input || '').toLowerCase();
  if (!text.trim() || !Array.isArray(knowledgeBase)) return null;

  let best = null;
  for (const entry of knowledgeBase) {
    if (!entry || !entry.keywords) continue;
    const keywords = entry.keywords[l] || entry.keywords.en || [];
    const matchedKeywords = [];
    let score = 0;
    for (const raw of keywords) {
      const kw = String(raw).toLowerCase().trim();
      if (!kw) continue;
      if (text.includes(kw)) {
        // Multi-word keyword (bigram+) match earns a bonus point.
        score += kw.includes(' ') ? 2 : 1;
        matchedKeywords.push(raw);
      }
    }
    // District bonus: entry's own district named in the query.
    if (
      entry.district &&
      entry.district !== 'national' &&
      text.includes(String(entry.district).toLowerCase())
    ) {
      score += 1;
    }
    if (score >= 2 && (!best || score > best.score)) {
      best = { entry, score, matchedKeywords };
    }
  }
  return best;
}

export function verify(userInput, matchedEntry) {
  const none = { flag: null, severity: null };
  if (!matchedEntry) return none;
  const text = String(userInput || '');

  // 3. Safety check first — critical severity always wins.
  if (
    matchedEntry.category === 'safety' &&
    text.toLowerCase().includes('lc1')
  ) {
    return { flag: 'SAFETY_REDIRECT', severity: 'critical' };
  }

  // 1. Fee check: user-quoted amount above the statutory fee.
  const feeMatch = text.match(/(\d[\d,]*)\s*(UGX|shillings|k|muzaalendo)/i);
  if (feeMatch) {
    const userAmount = parseInt(feeMatch[1].replace(/,/g, ''), 10);
    const statutoryFee = Number(matchedEntry.statutory_fee) || 0;
    if (!Number.isNaN(userAmount) && userAmount > statutoryFee) {
      return { flag: 'DISCREPANCY', severity: 'high', userAmount, statutoryFee };
    }
  }

  // 2. Authority check: user names a known-wrong authority.
  const wrong = Array.isArray(matchedEntry.wrong_authorities)
    ? matchedEntry.wrong_authorities
    : [];
  const lowered = text.toLowerCase();
  for (const authority of wrong) {
    const name = String(authority).toLowerCase().trim();
    if (name && lowered.includes(name)) {
      return {
        flag: 'WRONG_AUTHORITY',
        severity: 'medium',
        userAuthority: authority,
        correctAuthority: matchedEntry.correct_authority,
      };
    }
  }

  return none;
}

export function composeResponse(matchedEntry, verification, lang) {
  const l = normalizeLang(lang);
  const pick = (field) => {
    const v = matchedEntry[field];
    if (v && typeof v === 'object') return v[l] !== undefined ? v[l] : v.en;
    return v;
  };

  let verificationOut = null;
  if (verification && verification.flag) {
    let message = '';
    if (verification.flag === 'DISCREPANCY') {
      message = fill(RULE_MESSAGES.fee[l], {
        user_amount: verification.userAmount,
        statutory_fee: verification.statutoryFee,
      });
    } else if (verification.flag === 'WRONG_AUTHORITY') {
      message = fill(RULE_MESSAGES.authority[l], {
        user_authority: verification.userAuthority,
        correct_authority: verification.correctAuthority,
      });
    } else if (verification.flag === 'SAFETY_REDIRECT') {
      message = RULE_MESSAGES.safety[l];
    }
    verificationOut = {
      flag: verification.flag,
      message,
      severity: verification.severity || null,
    };
  }

  return {
    title: pick('title'),
    answer: pick('answer'),
    legal_citation: matchedEntry.legal_citation,
    source_url: matchedEntry.source_url,
    statutory_fee: matchedEntry.statutory_fee,
    currency: matchedEntry.currency,
    correct_authority: matchedEntry.correct_authority,
    wrong_authorities: matchedEntry.wrong_authorities,
    illegal_practices: pick('illegal_practices'),
    next_steps: pick('next_steps'),
    escalation_path: matchedEntry.escalation_path,
    verified_by: matchedEntry.verified_by,
    version: matchedEntry.version,
    flashcard: matchedEntry.flashcard,
    verification: verificationOut,
  };
}
