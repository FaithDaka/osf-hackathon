import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import BottomNav from '../lib/bottom-nav';
import PageHeader from '../lib/page-header';
import { isKnownDistrict } from '../lib/district-carousel';
import { composeResponse, match, verify } from '../lib/matcher';
import lga from '../data/national/lga_mandates.json';
import landAct from '../data/national/land_act.json';
import succession from '../data/national/succession.json';
import fees from '../data/national/fees_schedule.json';
import kampala from '../data/districts/kampala.json';
import mukono from '../data/districts/mukono.json';
import geo from '../data/geography.json';
import enStrings from '../public/i18n/en.json';
import lgStrings from '../public/i18n/lg.json';
import swStrings from '../public/i18n/sw.json';

const UI = { en: enStrings, lg: lgStrings, sw: swStrings };

// Council building icon for the Find-my-LC1 button (no emojis).
function CouncilIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-hidden="true"
      className="shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 21v-4h6v4" />
    </svg>
  );
}

const BANNERS = {
  DISCREPANCY: { cls: 'bg-accent', icon: '⚠️' },
  WRONG_AUTHORITY: { cls: 'bg-amber', icon: '⚠️' },
  SAFETY_REDIRECT: { cls: 'bg-accent', icon: '🚨' },
};

function fmtDuration(hours) {
  const h = Number(hours) || 0;
  if (h >= 24 && h % 24 === 0) {
    const d = h / 24;
    return `${d} day${d === 1 ? '' : 's'}`;
  }
  return `${h} hours`;
}

function fmtDate(iso) {
  try {
    const d = new Date(iso);
    const p = (n) => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  } catch {
    return iso;
  }
}

// Source rows use small coloured SVG icons (no emojis); the label
// before each colon is bold.
function SourceIcon({ kind, size = 16 }) {
  const colors = {
    doc: '#5B2D8E',
    link: '#5B2D8E',
    check: '#0E7A55',
    calendar: '#0E7490',
    version: '#B45309',
  };
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    role: 'img',
    'aria-hidden': 'true',
    className: 'shrink-0',
    fill: 'none',
    stroke: colors[kind] || '#5B2D8E',
    strokeWidth: '1.8',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  switch (kind) {
    case 'doc':
      return (
        <svg {...common}>
          <path d="M6 3h9l4 4v14H6V3Z" />
          <path d="M9 12h7M9 15.5h5" />
        </svg>
      );
    case 'link':
      return (
        <svg {...common}>
          <path d="M9 4H4v16h16v-5" />
          <path d="M14 4h6v6" />
          <path d="M20 4l-9 9" />
        </svg>
      );
    case 'check':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M8.5 12.5l2.5 2.5 5-6" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="4" y="5.5" width="16" height="15" rx="2" />
          <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
        </svg>
      );
    case 'version':
      return (
        <svg {...common}>
          <path d="M4 12a8 8 0 0 1 14-5.3" />
          <path d="M18 3v4h-4" />
          <path d="M20 12a8 8 0 0 1-14 5.3" />
          <path d="M6 21v-4h4" />
        </svg>
      );
    default:
      return null;
  }
}

export default function Result() {
  const router = useRouter();
  const lang = ['en', 'lg', 'sw'].includes(router.query.lang)
    ? router.query.lang
    : 'en';
  const S = UI[lang];
  const q = typeof router.query.q === 'string' ? router.query.q : '';
  const district = isKnownDistrict(router.query.district)
    ? router.query.district
    : 'kampala';
  const cat = typeof router.query.cat === 'string' ? router.query.cat : null;

  const kb = useMemo(
    () => [...lga, ...landAct, ...succession, ...fees, ...kampala, ...mukono],
    [],
  );

  // Category geo-filter state.
  const [filterSub, setFilterSub] = useState(
    typeof router.query.subcounty === 'string' ? router.query.subcounty : '',
  );
  const [filterParish, setFilterParish] = useState('');
  const [appliedParish, setAppliedParish] = useState('');

  const backHref = `/home?lang=${lang}`;

  // ---------------- CATEGORY LISTING (?cat=) ----------------
  if (cat) {
    const catLabel = (S.categories && S.categories[cat]) || cat;
    const inScope = kb.filter(
      (e) => e.category === cat && (e.district === district || e.district === 'national'),
    );
    const subOptions =
      (geo.districts[district] && geo.districts[district].subcounties) || [];
    const visible = inScope.filter((e) => {
      const g = e.geography || {};
      const subOk = !appliedParish && (!filterSub || !g.subcounty || g.subcounty === filterSub);
      const parOk =
        !appliedParish || !g.parish || g.parish === appliedParish;
      return subOk && parOk;
    });
    return (
      <main className="min-h-screen bg-white p-4 pb-24">
        <div className="max-w-md mx-auto min-w-0">
          <PageHeader
            backHref={backHref}
            backLabel={S.back}
            title={catLabel}
          />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setAppliedParish(filterParish.trim());
            }}
            className="mt-2 bg-white rounded-lg shadow-sm p-4"
          >
            <label htmlFor="fsub" className="block font-bold" style={{ fontSize: '16px' }}>
              {S.subcounty_prompt}
            </label>
            <select
              id="fsub"
              value={filterSub}
              onChange={(e) => setFilterSub(e.target.value)}
              className="btn-ac mt-1 w-full bg-white border border-gray-300 rounded-lg px-4"
            >
              <option value="">—</option>
              {subOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <label htmlFor="fpar" className="block font-bold mt-2" style={{ fontSize: '16px' }}>
              {S.parish_prompt}
            </label>
            <input
              id="fpar"
              type="text"
              value={filterParish}
              onInput={(e) => setFilterParish(e.target.value)}
              className="btn-ac mt-1 w-full bg-white border border-gray-300 rounded-lg px-4"
            />
            <button
              type="submit"
              className="btn-ac mt-2 w-full bg-primary text-white rounded-lg"
            >
              🔍 {S.search_submit}
            </button>
          </form>
          <div className="mt-3 flex flex-col gap-2" aria-live="polite">
            {visible.length === 0 && (
              <div className="bg-white rounded-lg p-4 text-center">
                <p className="font-bold">
                  {S.not_found.replace('{location}', appliedParish || filterSub || district)}
                </p>
                <p className="text-ac-muted" style={{ fontSize: '16px' }}>
                  Please contact your LC1.
                </p>
              </div>
            )}
            {visible.map((e) => (
              <Link
                key={e.id}
                href={`/result?q=${encodeURIComponent(e.id)}&lang=${lang}&district=${district}`}
                aria-label={e.title[lang] || e.title.en}
                className="bg-white rounded-lg shadow-sm p-4"
              >
                <div className="font-bold" style={{ fontSize: '16px' }}>
                  {e.title[lang] || e.title.en}
                </div>
                <div className="text-ac-muted" style={{ fontSize: '14px' }}>
                  {Number(e.statutory_fee) > 0 && (
                    <span className="text-secondary font-bold">
                      {e.statutory_fee} {e.currency} ·{' '}
                    </span>
                  )}
                  {e.correct_authority}
                </div>
              </Link>
            ))}
          </div>
        </div>
        <BottomNav active="" lang={lang} strings={S} />
      </main>
    );
  }

  // ---------------- SINGLE ENTRY (?q=) ----------------
  // q may be an entry id (from category cards/share links) or free text.
  const byId = q ? kb.find((e) => e.id === q) : null;
  const hit = byId
    ? { entry: byId, score: 99, matchedKeywords: [] }
    : q
      ? match(q, lang, kb)
      : null;
  const entry = hit ? hit.entry : null;

  if (!entry) {
    // Header matches the clicked category when the query came from one
    // (home category cards navigate with the localized category name).
    const catIdFromQuery = q
      ? Object.keys(UI.en.categories || {}).find((cid) =>
          [UI.en, UI.lg, UI.sw].some(
            (U) => U.categories && U.categories[cid] === q,
          ),
        )
      : null;
    const noEntryTitle = catIdFromQuery
      ? S.categories[catIdFromQuery] || q
      : S.app_name;
    return (
      <main className="min-h-screen bg-white p-4 pb-24">
        <div className="max-w-md mx-auto min-w-0">
          <PageHeader
            backHref={backHref}
            backLabel={S.back}
            title={noEntryTitle}
          />
          <div className="mt-2 bg-white rounded-lg shadow-sm p-6 text-center">
            <p className="font-bold text-lg">{S.no_match}</p>
            <Link
              href={`/lc-initiatives?lang=${lang}`}
              aria-label={S.find_lc1}
              className="btn-ac mt-4 w-full inline-flex gap-2 bg-primary text-white rounded-lg"
              style={{ height: '56px' }}
            >
              <CouncilIcon size={20} /> {S.find_lc1}
            </Link>
            <p
              className="mt-2 text-center text-ac-muted"
              style={{ fontSize: '16px' }}
            >
              {S.call_toll_free}
            </p>
          </div>
        </div>
        <BottomNav active="" lang={lang} strings={S} />
      </main>
    );
  }

  const verification = verify(q, entry);
  const r = composeResponse(entry, verification, lang);
  const banner = r.verification ? BANNERS[r.verification.flag] : null;

  // Short home-page category title in the header (long entry titles
  // would collide with the Back link); the full title lives in the body.
  const entryCatLabel = (S.categories && S.categories[entry.category]) || entry.category;

  return (
    <main className="min-h-screen bg-white p-4 pb-24">
      <div className="max-w-md mx-auto min-w-0">
        <PageHeader
          backHref={backHref}
          backLabel={S.back}
          title={entryCatLabel}
        />

        {banner && (
          <div
            role="alert"
            className={`mt-2 ${banner.cls} text-white rounded-lg p-4 font-bold`}
          >
            <span aria-hidden="true">{banner.icon}</span> {r.verification.message}
          </div>
        )}

        <article className="mt-2 bg-white rounded-lg shadow-sm p-5">
          <h1 className="font-bold text-ink break-words" style={{ fontSize: '20px', lineHeight: 1.3 }}>
            {r.title}
          </h1>
          <p className="mt-2" style={{ fontSize: '18px', lineHeight: 1.6 }}>
            {r.answer}
          </p>

          {Number(r.statutory_fee) > 0 && (
            <div className="mt-3">
              <div className="text-secondary font-bold" style={{ fontSize: '20px' }}>
                Legal fee: {r.statutory_fee} {r.currency}
              </div>
              <div className="text-ac-muted" style={{ fontSize: '14px' }}>
                Currency: {r.currency}
              </div>
            </div>
          )}

          {r.correct_authority && (
            <p className="mt-2 text-secondary font-bold">
              ✅ {S.correct_authority}: {r.correct_authority}
            </p>
          )}
          {r.wrong_authorities && r.wrong_authorities.length > 0 && (
            <p className="mt-1 text-accent">
              ❌ {S.wrong_authorities}: {r.wrong_authorities.join(', ')}
            </p>
          )}
          {r.illegal_practices && (
            <div className="mt-2 bg-amber bg-opacity-20 p-3 rounded">
              <span className="font-bold">⚠️ {S.illegal_practices}: </span>
              {r.illegal_practices}
            </div>
          )}
          {r.next_steps && r.next_steps.length > 0 && (
            <div className="mt-3">
              <h2 className="font-bold">{S.next_steps}:</h2>
              <ol className="list-decimal ml-6" style={{ fontSize: '16px' }}>
                {r.next_steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          )}
        </article>

        {r.flashcard && r.flashcard.question && (
          <section className="mt-3 bg-white rounded-lg shadow-sm p-4">
            <h2 className="font-bold text-primary">💡 {S.flashcard}</h2>
            <p className="mt-1 font-bold">
              {r.flashcard.question[lang] || r.flashcard.question.en}
            </p>
            <p className="mt-1">{r.flashcard.answer[lang] || r.flashcard.answer.en}</p>
            <a
              href={r.source_url}
              target="_blank"
              rel="noreferrer"
              className="text-ac-muted underline"
              style={{ fontSize: '14px' }}
            >
              {S.source}: {r.flashcard.source}
            </a>
          </section>
        )}

        {r.escalation_path && r.escalation_path.length > 0 && (
          <section aria-label={S.escalation_path} className="mt-3 bg-white rounded-lg shadow-sm p-4">
            <h2 className="font-bold">{S.escalation_path}</h2>
            <ol className="mt-2">
              {r.escalation_path.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <div className="flex flex-col items-center" aria-hidden="true">
                    <span className="w-4 h-4 rounded-full border-2 border-primary bg-white" />
                    {i < r.escalation_path.length - 1 && (
                      <span className="w-0.5 flex-1 bg-primary" style={{ minHeight: '20px' }} />
                    )}
                  </div>
                  <div className="pb-4">
                    <span className="font-bold">Level {step.level}: </span>
                    {step.authority} — {fmtDuration(step.deadline_hours)}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section aria-label={S.source} className="mt-3 border border-ac-muted rounded p-3 bg-white">
          <p className="flex items-start gap-1.5">
            <SourceIcon kind="doc" size={16} />
            <span className="min-w-0 break-words">
              <strong>{S.source}:</strong> {r.legal_citation}
            </span>
          </p>
          <p className="mt-1 flex items-center gap-1.5">
            <SourceIcon kind="link" size={16} />
            <a href={r.source_url} target="_blank" rel="noreferrer" className="text-primary underline">
              {S.source_link}
            </a>
          </p>
          <p className="mt-1 flex items-start gap-1.5">
            <SourceIcon kind="check" size={16} />
            <span className="min-w-0 break-words">
              <strong>{S.verified_by}:</strong> {r.verified_by.name}, {r.verified_by.role}
            </span>
          </p>
          <p className="mt-1 flex items-center gap-1.5">
            <SourceIcon kind="calendar" size={16} />
            <span>
              <strong>{S.last_updated}:</strong> {fmtDate(r.verified_by.date)}
            </span>
          </p>
          <p className="mt-1 flex items-center gap-1.5">
            <SourceIcon kind="version" size={16} />
            <span>
              <strong>{S.version}:</strong> {r.version}
            </span>
          </p>
          <button
            type="button"
            aria-disabled="true"
            title={S.report_inactive_note}
            onClick={() => {
              // Report-an-error is not active yet — intentionally a no-op.
            }}
            className="btn-ac mt-2 w-full bg-amber text-white rounded-lg"
          >
            {S.report_error}
          </button>
          <p className="mt-1 text-center text-ac-muted" style={{ fontSize: '14px' }}>
            {S.report_inactive_note}
          </p>
        </section>

        <p className="mt-2 text-center text-ac-muted" style={{ fontSize: '14px' }}>
          {S.complaints_later}
        </p>
      </div>
      <BottomNav active="" lang={lang} strings={S} />
    </main>
  );
}
