import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
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
const PWA_URL = process.env.NEXT_PUBLIC_PWA_URL || 'https://alertcitizen.github.io';
const TOLL_FREE = '0800-225-8424';
const FLAGS_KEY = 'ac_flags';

const BANNERS = {
  DISCREPANCY: { cls: 'bg-ac-red', icon: '⚠️' },
  WRONG_AUTHORITY: { cls: 'bg-ac-amber', icon: '⚠️' },
  SAFETY_REDIRECT: { cls: 'bg-ac-red', icon: '🚨' },
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

function Toast({ message }) {
  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-0 right-0 mx-auto max-w-md px-4"
    >
      <div className="bg-ac-green text-white rounded-lg p-4 text-center shadow">
        {message}
      </div>
    </div>
  );
}

export default function Result() {
  const router = useRouter();
  const lang = ['en', 'lg', 'sw'].includes(router.query.lang)
    ? router.query.lang
    : 'en';
  const S = UI[lang];
  const q = typeof router.query.q === 'string' ? router.query.q : '';
  const district =
    router.query.district === 'mukono' || router.query.district === 'kampala'
      ? router.query.district
      : 'kampala';
  const cat = typeof router.query.cat === 'string' ? router.query.cat : null;

  const kb = useMemo(
    () => [...lga, ...landAct, ...succession, ...fees, ...kampala, ...mukono],
    [],
  );

  // Report-an-error form state.
  const [flagText, setFlagText] = useState('');
  const [flagName, setFlagName] = useState('');
  const [flagOpen, setFlagOpen] = useState(false);
  const [toast, setToast] = useState('');
  // Category geo-filter state.
  const [filterSub, setFilterSub] = useState(
    typeof router.query.subcounty === 'string' ? router.query.subcounty : '',
  );
  const [filterParish, setFilterParish] = useState('');
  const [appliedParish, setAppliedParish] = useState('');

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const backHref = `/home?lang=${lang}`;

  // ---------------- CATEGORY LISTING (?cat=) ----------------
  if (cat) {
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
      <main className="min-h-screen bg-ac-bg p-4">
        <div className="max-w-md mx-auto">
          <Link
            href={backHref}
            aria-label={S.app_name}
            className="inline-flex items-center min-h-[48px] text-ac-green font-bold"
          >
            ← {S.app_name}
          </Link>
          <h1 className="text-lg font-bold capitalize">{cat.replace(/_/g, ' ')}</h1>
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
              className="btn-ac mt-2 w-full bg-ac-green text-white rounded-lg"
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
                    <span className="text-ac-green font-bold">
                      {e.statutory_fee} {e.currency} ·{' '}
                    </span>
                  )}
                  {e.correct_authority}
                </div>
              </Link>
            ))}
          </div>
        </div>
        <Toast message={toast} />
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
    return (
      <main className="min-h-screen bg-ac-bg p-4">
        <div className="max-w-md mx-auto">
          <Link
            href={backHref}
            aria-label={S.app_name}
            className="inline-flex items-center min-h-[48px] text-ac-green font-bold"
          >
            ← {S.app_name}
          </Link>
          <div className="mt-2 bg-white rounded-lg shadow-sm p-6 text-center">
            <p className="font-bold text-lg">{S.no_match}</p>
            <a
              href={`/complaint?lang=${lang}`}
              className="btn-ac mt-4 w-full inline-flex bg-ac-green text-white rounded-lg"
              style={{ height: '56px' }}
            >
              📋 {S.file_complaint}
            </a>
            <a
              href={`tel:${TOLL_FREE.replace(/-/g, '')}`}
              className="btn-ac mt-2 w-full inline-flex bg-white text-ac-green border-2 border-ac-green rounded-lg"
              style={{ height: '56px' }}
            >
              📞 {S.toll_free}
            </a>
          </div>
        </div>
      </main>
    );
  }

  const verification = verify(q, entry);
  const r = composeResponse(entry, verification, lang);
  const banner = r.verification ? BANNERS[r.verification.flag] : null;

  const submitFlag = (e) => {
    e.preventDefault();
    if (!flagText.trim()) return;
    try {
      const raw = localStorage.getItem(FLAGS_KEY);
      const all = raw ? JSON.parse(raw) : {};
      const list = Array.isArray(all[entry.id]) ? all[entry.id] : [];
      list.push({
        text: flagText.trim(),
        name: flagName.trim() || null,
        at: new Date().toISOString(),
      });
      all[entry.id] = list;
      localStorage.setItem(FLAGS_KEY, JSON.stringify(all));
    } catch {
      // Storage unavailable — still thank the user.
    }
    setFlagText('');
    setFlagName('');
    setFlagOpen(false);
    setToast('Thank you. Your flag has been recorded.');
  };

  const share = async () => {
    const text =
      `AlertCitizen: ${r.title}. ${(r.answer || '').slice(0, 200)}. ` +
      `Source: ${r.legal_citation}. Verified: ${r.verified_by.date}. ` +
      `${PWA_URL}/result?q=${entry.id}&lang=${lang}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: r.title, text });
        return;
      }
      throw new Error('no-share');
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        setToast('Copied to clipboard.');
      } catch {
        setToast(text);
      }
    }
  };

  const complaintHref =
    `/complaint?new=1&lang=${lang}` +
    `&category=${encodeURIComponent(entry.category)}` +
    `&district=${entry.district === 'national' ? district : entry.district}`;

  return (
    <main className="min-h-screen bg-ac-bg p-4">
      <div className="max-w-md mx-auto">
        <Link
          href={backHref}
          aria-label={S.app_name}
          className="inline-flex items-center min-h-[48px] text-ac-green font-bold"
          style={{ fontSize: '16px' }}
        >
          ← {S.app_name}
        </Link>

        {banner && (
          <div
            role="alert"
            className={`mt-2 ${banner.cls} text-white rounded-lg p-4 font-bold`}
          >
            <span aria-hidden="true">{banner.icon}</span> {r.verification.message}
          </div>
        )}

        <article className="mt-2 bg-white rounded-lg shadow-sm p-5">
          <h1 className="font-bold" style={{ fontSize: '20px' }}>
            {r.title}
          </h1>
          <p className="mt-2" style={{ fontSize: '18px', lineHeight: 1.6 }}>
            {r.answer}
          </p>

          {Number(r.statutory_fee) > 0 && (
            <div className="mt-3">
              <div className="text-ac-green font-bold" style={{ fontSize: '20px' }}>
                Legal fee: {r.statutory_fee} {r.currency}
              </div>
              <div className="text-ac-muted" style={{ fontSize: '14px' }}>
                Currency: {r.currency}
              </div>
            </div>
          )}

          {r.correct_authority && (
            <p className="mt-2 text-ac-green font-bold">
              ✅ {S.correct_authority}: {r.correct_authority}
            </p>
          )}
          {r.wrong_authorities && r.wrong_authorities.length > 0 && (
            <p className="mt-1 text-ac-red">
              ❌ {S.wrong_authorities}: {r.wrong_authorities.join(', ')}
            </p>
          )}
          {r.illegal_practices && (
            <div className="mt-2 bg-ac-amber bg-opacity-20 p-3 rounded">
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
            <h2 className="font-bold text-ac-blue">💡 {S.flashcard}</h2>
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
                    <span className="w-4 h-4 rounded-full border-2 border-ac-green bg-white" />
                    {i < r.escalation_path.length - 1 && (
                      <span className="w-0.5 flex-1 bg-ac-green" style={{ minHeight: '20px' }} />
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
          <p>📄 {S.source}: {r.legal_citation}</p>
          <p>
            🔗{' '}
            <a href={r.source_url} target="_blank" rel="noreferrer" className="text-ac-blue underline">
              {S.source_link}
            </a>
          </p>
          <p>
            ✅ {S.verified_by}: {r.verified_by.name}, {r.verified_by.role}
          </p>
          <p>📅 {S.last_updated}: {fmtDate(r.verified_by.date)}</p>
          <p>🔄 {S.version}: {r.version}</p>
          <button
            type="button"
            onClick={() => setFlagOpen((v) => !v)}
            aria-expanded={flagOpen}
            className="mt-1 text-ac-amber font-bold min-h-[48px]"
          >
            ⚠️ {S.report_error}
          </button>
          {flagOpen && (
            <form onSubmit={submitFlag} className="mt-2 flex flex-col gap-2">
              <label htmlFor="flagtext" className="font-bold" style={{ fontSize: '16px' }}>
                What is wrong?
              </label>
              <input
                id="flagtext"
                type="text"
                value={flagText}
                onInput={(e) => setFlagText(e.target.value)}
                required
                className="btn-ac w-full bg-white border border-gray-300 rounded-lg px-4"
              />
              <label htmlFor="flagname" className="font-bold" style={{ fontSize: '16px' }}>
                Your name (optional)
              </label>
              <input
                id="flagname"
                type="text"
                value={flagName}
                onInput={(e) => setFlagName(e.target.value)}
                className="btn-ac w-full bg-white border border-gray-300 rounded-lg px-4"
              />
              <button
                type="submit"
                className="btn-ac w-full bg-ac-green text-white rounded-lg"
              >
                {S.search_submit}
              </button>
            </form>
          )}
        </section>

        <div className="mt-3 flex flex-col gap-2">
          <Link
            href={complaintHref}
            className="btn-ac w-full inline-flex bg-ac-green text-white rounded-lg"
            style={{ height: '56px' }}
          >
            📋 {S.file_complaint}
          </Link>
          <button
            type="button"
            onClick={share}
            className="btn-ac w-full bg-white text-ac-green border-2 border-ac-green rounded-lg"
            style={{ height: '56px' }}
          >
            📤 {S.share_complaint}
          </button>
        </div>
      </div>
      <Toast message={toast} />
    </main>
  );
}
