# AlertCitizen

**Information you can trust. In your language. On your phone.**

AlertCitizen is a lightweight, offline-capable PWA that delivers verified
civic information to citizens in Uganda. It answers
questions about local government mandates, statutory fees, land disputes,
inheritance, permits, public services, and safety pathways using a
deterministic keyword-matching engine against a versioned, community-verified
JSON knowledge base.

**No LLM runs at runtime. No API calls. No hallucination.**

## The Problem

Citizens in Kampala and Mukono do not know what their local council
leaders can legally do. LC1 chairmen demand 200,000 UGX for a stamp
that costs 10,000 by law. Women are evicted from their deceased
husbands' land because they don't know the Succession Amendment Act
2022. Power outages and road closures are announced on Twitter where
they are invisible to 90% of the population. Misinformation spreads
on WhatsApp groups faster than any correction.

The people who need information the most have the least access to it.

## The Solution

AlertCitizen is a civic ledger, not a social feed.

- **SMS-first entry.** Text "I NEED HELP" (or "NYAMBA" or "NITAHITAJA
  MSAADA") to our code. The system detects your language and sends
  a corresponding link. No app install to get in.
- **Deterministic matching.** Your question is matched against a
  versioned JSON knowledge base using keyword scoring. No LLM. No
  hallucination. If the system doesn't know, it says so.
- **In-place verification.** If you were told a fee that contradicts
  the law, the system flags it before you pay. "You mentioned 200,000
  UGX. The legal fee is 10,000 UGX."
- **Escalation by design.** A complaint gets a reference number, a
  deadline, and an automatic escalation path: LC1 → LC2 → LC3 →
  District. You don't need to go viral. The system makes you visible
  by structure.
- **Community-verified.** Every entry has a named verifier, a legal
  citation, a source URL, a date, and a version. Community members
  can flag errors. The change log is public.
- **Announcements.** Power outages, water disruptions, road closures,
  community events, and policy changes are pushed to users in their
  district. Not gated by Twitter engagement.
- **Your Representatives.** Know who your representatives are and what
  they are doing. Filter by City Council, Local Council, MPs, and State
  Ministers. Open a profile for initiatives, bills sponsored, and
  funding raised.
- **Civic quizzes with parish ranking.** Test your knowledge. See
  how your parish ranks. Gamified civic education.
- **Screen reader mode.** Audio-guided navigation. The app reads aloud for increased accessibility. You tap Yes or No. No reading required.
- **Multilingual.** English, Luganda, Swahili. UI, answers,
  flashcards, and voice prompts in all three languages.

## Quick Start

```bash
# Requires Node.js 22+
node --version

# Install (no native dependencies)
npm ci

# Develop (http://localhost:3000)
npm run dev

# Production static export (outputs to out/)
npm run build

# Lint
npm run lint
```

Serve the static export with any static file server, or deploy `out/`
to GitHub Pages (a workflow is included under `.github/workflows/`).

## Demo in 5 minutes

1. **SMS entry.** Open `/sms-sim` (or `public/sms-sim/index.html`
   directly — set `MANDATE_URL` to your laptop IP first). Send
   `I NEED HELP`, `NETAAGA BUYAMBI`, or `NITAHITAJA MSAADA` and tap
   the reply link to open the PWA in the matching language.
2. **Ask.** On home, search `LC1 stamp fee asked 200000 UGX` and watch
   the red discrepancy banner fire on the result screen.
3. **Complain.** File a complaint from the result screen, then check
   its status with the reference number.
4. **Quiz.** Take a civic quiz, see the parish ranking, share the score.
5. **Reps.** Open Your Representatives, filter by group, open a profile.

## Project structure

```text
pages/          Entry, home, result, complaint, announcements, quiz,
                lc-initiatives, sms-sim, 404 (+ _app shell)
lib/            matcher, i18n, sms-detect, speech, voice-walkthrough,
                complaint-store, version-check, quiz-engine,
                announcement-store, lc-initiative-store, qr
data/           version.json + national/*.json + districts/*.json +
                announcements, lc-initiatives, quizzes, rules,
                escalation, voice-tree, geography (all bundled at build)
public/         manifest.json, sw.js (ac-v1), icons, i18n/*.json,
                sms-sim/index.html, audio/manifest.json, offline.html
scripts/        make-icons.mjs, generate-audio.mjs
```

## Stack and budgets

- Next.js 14 static export (`output: 'export'`) + Preact on the
  client (`react`/`react-dom` → `preact/compat`, client bundles only)
  + Tailwind CSS v3 (purged) + hand-rolled i18n, hooks-only state.
- First Load JS ~52–88KB per route (budget: 500KB).
- CSS ~9.5KB (budget: 15KB). Base font 18px, 48px touch targets,
  no animations.
- `data/` JSON ~148KB (budget: 150KB). Everything ships offline via
  the hand-rolled service worker (shell + JSON-in-bundles + audio
  cache + last-10 result queries + offline fallback page).

## Notes and known limits (PoC)

- `next dev` full page loads don't hydrate URL query params under
  Preact (client-side navigation and the production export handle
  them correctly). Edits trigger full reloads instead of hot swaps.
- Unknown URLs in `next dev` fall into Next's App Router fallback,
  which crashes on `React.cache` (unimplemented by preact/compat).
  The shipped static export serves `404.html` and is unaffected.
- Luganda/Swahili audio files await native-speaker recordings
  (`node scripts/generate-audio.mjs` prints the manifest + recipes);
  the app falls back to English speech meanwhile.
- Verify district/ministry source URLs and the FIDA helpline
  (`0800-XXX-XXX` placeholder) before production.
- Luganda/Swahili copy is colloquial-draft quality — get a
  native-speaker pass before launch.

OSF Hackathon proof of concept. Information you can trust.
