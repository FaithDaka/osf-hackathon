import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { setLang, t } from '../lib/i18n';
import BottomNav from '../lib/bottom-nav';
import { getActiveAnnouncements } from '../lib/announcement-store';
import {
  advanceWalkthrough,
  createWalkthroughState,
  getAudioFile,
  getCurrentCategory,
  selectCategory,
} from '../lib/voice-walkthrough';
import annData from '../data/announcements.json';
import voiceTree from '../data/voice-tree.json';
import geo from '../data/geography.json';
import enStrings from '../public/i18n/en.json';
import lgStrings from '../public/i18n/lg.json';
import swStrings from '../public/i18n/sw.json';

const UI = { en: enStrings, lg: lgStrings, sw: swStrings };
const LANGS = ['en', 'lg', 'sw'];
const LANG_LABELS = { en: 'English', lg: 'Luganda', sw: 'Swahili' };
const DISTRICTS = [
  { code: 'kampala', label: 'Kampala' },
  { code: 'mukono', label: 'Mukono' },
];
// Supported districts are selectable; the rest preview as muted,
// non-clickable chips in the same horizontal carousel.
const UPCOMING_DISTRICTS = [
  { code: 'wakiso', label: 'Wakiso' },
  { code: 'jinja', label: 'Jinja' },
  { code: 'gulu', label: 'Gulu' },
  { code: 'mbarara', label: 'Mbarara' },
];

function ShieldLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 512 512" role="img" aria-label="AlertCitizen logo">
      <rect width="512" height="512" rx="96" fill="#5B2D8E" />
      <path
        d="M256 72 L408 136 V264 C408 356 336 420 256 448 C176 420 104 356 104 264 V136 Z"
        fill="none"
        stroke="#F5F1FA"
        strokeWidth="28"
        strokeLinejoin="round"
      />
      <path
        d="M186 262 L238 314 L330 210"
        fill="none"
        stroke="#F5F1FA"
        strokeWidth="34"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Downward chevron for the language dropdown trigger.
function ChevronDownIcon({ size = 12 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      role="img"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M3.5 6 L8 10.5 L12.5 6"
        fill="none"
        stroke="#5B2D8E"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Speaker icon for the accessibility toggle: person silhouette + speech
// sound waves, matching the intro page. Compact size fits the toggle knob.
function SpeakerIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="17" cy="14" r="7" fill="#5B2D8E" />
      <path
        d="M4 40c0-8 6-13 13-13s13 5 13 13v1H4v-1z"
        fill="#5B2D8E"
      />
      <path
        d="M33 16c2.5 2.3 2.5 5.7 0 8"
        fill="none"
        stroke="#5B2D8E"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M37 12c4.5 4 4.5 10 0 14"
        fill="none"
        stroke="#5B2D8E"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
const TOLL_FREE = '0800-ALERT';

const CATEGORY_ICONS = {
  public_services: '🏛️',
  know_your_lc: '👥',
  local_funding: '💰',
  community_events: '📅',
  policies: '📜',
  knowledge_base: '🔍',
  fees_permits: '📋',
  education: '🎓',
  other: '📦',
};

const SEVERITY_BORDER = {
  critical: 'border-accent',
  warning: 'border-amber',
  info: 'border-primary',
};

const TYPE_ICON = {
  power_outage: '⚡',
  water_outage: '💧',
  road_closure: '🚧',
  construction: '🚧',
  donation: '🎁',
  event: '📢',
  policy_change: '📜',
};

const VOICE_PROMPTS = [
  { label: 'Land', query: 'land dispute' },
  { label: 'Fees', query: 'LC1 stamp fee' },
  { label: 'Safety', query: 'domestic violence' },
  { label: 'Permits', query: 'business permit' },
  { label: 'Education', query: 'school enrollment' },
  { label: 'Other', query: 'help' },
];

function validLang(q) {
  return LANGS.includes(q) ? q : 'en';
}

function speak(text, lang, audioPath) {
  try {
    if (lang === 'en' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
      return;
    }
    if (audioPath) {
      const audio = new Audio(audioPath);
      audio.play().catch(() => { });
    }
  } catch {
    // Audio unavailable — highlight still communicates the option.
  }
}

export default function Home() {
  const router = useRouter();
  const lang = validLang(router.query.lang);
  const S = UI[lang];
  const cat = typeof router.query.cat === 'string' ? router.query.cat : null;

  const [district, setDistrict] = useState('kampala');
  const [accessible, setAccessible] = useState(false);
  const [query, setQuery] = useState('');
  const [subcounty, setSubcounty] = useState('');
  const [walk, setWalk] = useState(() => createWalkthroughState());
  const [langOpen, setLangOpen] = useState(false);
  const announcedRef = useRef('');
  const langRef = useRef(null);

  // Close the custom language menu on outside tap / Escape.
  useEffect(() => {
    if (!langOpen) return;
    const onPointer = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setLangOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [langOpen]);

  // Restore persisted prefs (client only).
  useEffect(() => {
    try {
      const d = localStorage.getItem('ac_district');
      if (d === 'kampala' || d === 'mukono') setDistrict(d);
      setAccessible(localStorage.getItem('ac_accessibility') === 'true');
    } catch {
      // Storage unavailable — defaults apply.
    }
  }, []);

  const pickDistrict = (code) => {
    setDistrict(code);
    try {
      localStorage.setItem('ac_district', code);
    } catch {
      // Ignore storage errors.
    }
  };

  const announcements = useMemo(
    () => getActiveAnnouncements(annData, district),
    [district],
  );
  const categories = voiceTree.categories;

  const labelOf = (id) => t(`categories.${id}`, lang, UI);

  // Screen-reader narration follows the highlight.
  const current = getCurrentCategory(walk, categories);
  // Auto-start the walkthrough when accessible mode is on.
  useEffect(() => {
    if (accessible) {
      setWalk((s) => (s.started ? s : advanceWalkthrough(s, categories)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessible]);
  useEffect(() => {
    if (!accessible || !current || walk.finished) return;
    const key = `${walk.currentIndex}`;
    if (announcedRef.current === key) return;
    announcedRef.current = key;
    speak(labelOf(current.id), lang, getAudioFile(walk, categories, lang));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessible, walk.currentIndex, walk.finished, lang]);

  const toggleAccessibility = () => {
    const next = !accessible;
    setAccessible(next);
    try {
      localStorage.setItem('ac_accessibility', next ? 'true' : 'false');
    } catch {
      // Ignore storage errors.
    }
  };

  const switchLang = (next) => {
    if (!LANGS.includes(next) || next === lang) return;
    setLang(next);
    try {
      const params = new URLSearchParams({
        ...Object.fromEntries(
          Object.entries(router.query).map(([k, v]) => [k, String(v)]),
        ),
        lang: next,
      });
      router.push(`/home?${params.toString()}`);
    } catch {
      router.push(`/home?lang=${next}`);
    }
  };

  const goResult = (q, sc) => {
    if (sc) {
      try {
        localStorage.setItem('ac_subcounty', sc);
      } catch {
        // Ranking falls back to asking for the parish.
      }
    }
    const params = new URLSearchParams({ q, lang, district });
    if (sc) params.set('subcounty', sc);
    router.push(`/result?${params.toString()}`);
  };

  const submitSearch = (e) => {
    if (e) e.preventDefault();
    if (query.trim()) goResult(query.trim(), '');
  };

  const answerNo = () => setWalk((s) => advanceWalkthrough(s, categories));
  const answerYes = () =>
    setWalk((s) => selectCategory(s, s.currentIndex, categories));

  const replay = () => {
    if (!current) return;
    announcedRef.current = '';
    speak(labelOf(current.id), lang, getAudioFile(walk, categories, lang));
  };

  // Bottom tabs live in lib/bottom-nav.js (shared dark bar).

  // Sub-county prompt after tapping a category (?cat=).
  // Sub-counties come from a dropdown driven by the selected district.
  const catEntry = cat ? categories.find((c) => c.id === cat) : null;
  const subcountyOptions =
    (geo.districts[district] && geo.districts[district].subcounties) || [];
  useEffect(() => {
    if (!subcountyOptions.includes(subcounty)) {
      setSubcounty(subcountyOptions[0] || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [district, cat]);
  if (catEntry) {
    return (
      <main className="min-h-screen bg-ac-bg p-4 pb-24">
        <div className="max-w-md mx-auto">
          <h1 className="text-lg font-bold text-primary">
            {CATEGORY_ICONS[catEntry.id] || '📦'} {labelOf(catEntry.id)}
          </h1>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              goResult(labelOf(catEntry.id), subcounty.trim());
            }}
            className="mt-4"
          >
            <label htmlFor="subcounty" className="block font-bold">
              {S.subcounty_prompt}
            </label>
            <select
              id="subcounty"
              value={subcounty}
              onChange={(e) => setSubcounty(e.target.value)}
              aria-label={S.subcounty_prompt}
              className="btn-ac mt-2 w-full bg-white border border-gray-300 rounded-lg px-4"
            >
              {subcountyOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="btn-ac mt-3 w-full bg-primary text-white rounded-lg"
            >
              {S.yes} →
            </button>
          </form>
          <Link
            href={`/home?lang=${lang}`}
            className="btn-ac mt-2 w-full inline-flex bg-white text-primary border border-primary rounded-lg"
          >
            ← {S.no}
          </Link>
        </div>
        <BottomNav active={router.pathname} lang={lang} strings={S} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ac-bg p-4 pb-24">
      <div className="max-w-md mx-auto">
        {/* HEADER — darker than the page, no unnecessary borders */}
        <header className="bg-primary-soft -mx-4 -mt-4 px-4 pt-4 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-1 min-w-0 flex-1 mt-2">
              <ShieldLogo />
              <span className="relative min-w-0 w-fit max-w-full">
                <span
                  className="block truncate text-ink font-bold"
                  style={{ fontSize: '24px', lineHeight: '1.2', letterSpacing: '-0.5px' }}
                >
                  {S.app_name}
                </span>
                <span
                  aria-label="Proof of concept"
                  title="Proof of concept"
                  className="absolute -top-2 left-24 ml-1 whitespace-nowrap rounded-full bg-amber-soft text-amber font-extrabold uppercase"
                  style={{
                    fontSize: '10px',
                    letterSpacing: '0.06em',
                    padding: '2px 6px',
                    lineHeight: '1.2',
                  }}
                >
                  PoC
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex flex-col justify-end items-end"><button
                type="button"
                role="switch"
                aria-checked={accessible}
                aria-label={S.accessibility_mode}
                title={S.accessibility_mode}
                onClick={toggleAccessibility}
                className={`relative rounded-full outline-none focus:outline-none focus-visible:outline-none border border-line ${accessible
                  ? 'bg-secondary'
                  : 'bg-white border border-line shadow-sm'
                  }`}
                style={{ width: '52px', height: '32px' }}
              >
                <span
                  aria-hidden="true"
                  className="absolute top-[2px] rounded-full bg-white shadow-sm flex items-center justify-center"
                  style={{
                    width: '26px',
                    height: '26px',
                    left: accessible ? '23px' : '2px',
                  }}
                >
                  <SpeakerIcon size={16} />
                </span>
              </button>
                <span ref={langRef} className="relative inline-flex items-center">
                  <button
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={langOpen}
                    aria-label="Switch language"
                    onClick={() => setLangOpen((o) => !o)}
                    className="inline-flex items-center bg-transparent border-0 outline-none focus:outline-none focus-visible:outline-none text-primary font-semibold rounded-full cursor-pointer"
                    style={{ fontSize: '14px', minHeight: '48px' }}
                  >
                    <span aria-hidden="true" style={{ fontSize: '14px' }}>
                      🌐
                    </span>
                    <span style={{ paddingLeft: '4px', paddingRight: '4px' }}>
                      {lang.toUpperCase()} · {LANG_LABELS[lang]}
                    </span>
                    <ChevronDownIcon size={12} />
                  </button>
                  {langOpen && (
                    <span
                      role="listbox"
                      aria-label="Switch language"
                      className="absolute right-0 top-full mt-1 z-50 block bg-white shadow-lg overflow-hidden"
                      style={{ minWidth: '168px', borderRadius: '12px' }}
                    >
                      {LANGS.map((code) => {
                        const selected = code === lang;
                        return (
                          <button
                            key={code}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            onClick={() => {
                              setLangOpen(false);
                              switchLang(code);
                            }}
                            className={`flex items-center gap-2 w-full text-left bg-white text-primary font-semibold hover:bg-primary-soft focus:bg-primary-soft focus:outline-none focus-visible:outline-none ${selected ? 'font-extrabold' : ''
                              }`}
                            style={{
                              fontSize: '16px',
                              minHeight: '36px',
                              paddingLeft: '16px',
                              paddingRight: '16px',
                            }}
                          >
                            <span
                              aria-hidden="true"
                              style={{
                                width: '20px',
                                visibility: selected ? 'visible' : 'hidden',
                              }}
                            >
                              ✓
                            </span>
                            {code.toUpperCase()} · {LANG_LABELS[code]}
                          </button>
                        );
                      })}
                    </span>
                  )}
                </span></div>

            </div>
          </div>

          {/* DISTRICT CAROUSEL — small chips, horizontally scrollable,
              scrollbar hidden */}
          <div
            className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1 pt-2"
            role="group"
            aria-label="District"
          >
            {DISTRICTS.map((d) => {
              const active = district === d.code;
              return (
                <button
                  key={d.code}
                  type="button"
                  aria-pressed={active}
                  onClick={() => pickDistrict(d.code)}
                  className={`shrink-0 whitespace-nowrap rounded-full px-4 font-semibold ${active
                      ? 'bg-primary text-white'
                      : 'bg-white text-primary border border-primary'
                    }`}
                  style={{ minHeight: '36px', fontSize: '14px' }}
                >
                  {d.label}
                </button>
              );
            })}
            {UPCOMING_DISTRICTS.map((d) => (
              <span
                key={d.code}
                aria-disabled="true"
                title={`${d.label} — coming soon`}
                className="shrink-0 whitespace-nowrap rounded-full px-4 bg-black/5 text-ac-muted opacity-60 cursor-not-allowed inline-flex items-center"
                style={{ minHeight: '36px', fontSize: '14px' }}
              >
                {d.label}
              </span>
            ))}
          </div>
        </header>

        {/* ANNOUNCEMENTS STRIP */}
        {announcements.length > 0 && (
          <section aria-label={S.announcements} className="mt-4">
            <h2 className="font-bold">{S.announcements}</h2>
            <div
              aria-live="polite"
              className="mt-1 flex gap-2 overflow-x-auto pb-2"
            >
              {announcements.map((a) => (
                <Link
                  key={a.id}
                  href={`/announcements?id=${a.id}&lang=${lang}`}
                  aria-label={a.title[lang] || a.title.en}
                  className={`shrink-0 w-56 bg-white rounded-lg shadow-sm p-3 border-l-4 text-left ${SEVERITY_BORDER[a.severity] || SEVERITY_BORDER.info
                    }`}
                >
                  <div className="text-lg" aria-hidden="true">
                    {TYPE_ICON[a.type] || '📢'}
                  </div>
                  <div
                    className="font-bold truncate"
                    style={{ fontSize: '14px' }}
                  >
                    {a.title[lang] || a.title.en}
                  </div>
                  <div className="text-ac-muted" style={{ fontSize: '14px' }}>
                    {new Date(a.start).toLocaleDateString()}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CATEGORIES: screen-reader vertical list */}
        {accessible ? (
          <section aria-label={labelOf('knowledge_base')} className="mt-4">
            {!walk.finished ? (
              <>
                <div className="flex flex-col gap-2" aria-live="polite">
                  {categories.map((c, i) => {
                    const active = i === walk.currentIndex;
                    return (
                      <div
                        key={c.id}
                        aria-current={active ? 'true' : undefined}
                        className={`rounded-lg p-6 ${active
                            ? 'bg-primary text-white font-bold opacity-100'
                            : 'bg-white text-ac-muted opacity-[0.15]'
                          }`}
                        style={{ fontSize: active ? '24px' : '16px' }}
                      >
                        {CATEGORY_ICONS[c.id] || '📦'} {labelOf(c.id)}
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={replay}
                  aria-label={S.listen}
                  className="btn-ac mt-2 w-full bg-white text-primary border border-primary rounded-lg"
                >
                  🔊 {S.listen}
                </button>
                <button
                  type="button"
                  onClick={answerYes}
                  className="btn-ac mt-2 w-full bg-primary text-white rounded-lg"
                  style={{ height: '64px' }}
                >
                  {S.yes}
                </button>
                <button
                  type="button"
                  onClick={answerNo}
                  className="btn-ac mt-2 w-full bg-white text-primary border-2 border-primary rounded-lg"
                  style={{ height: '64px' }}
                >
                  {S.no}
                </button>
              </>
            ) : walk.allNo ? (
              <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <p className="font-bold">{S.no_match}</p>
                <Link
                  href={`/complaint?lang=${lang}`}
                  className="btn-ac mt-3 w-full inline-flex bg-primary text-white rounded-lg"
                >
                  {S.file_complaint}
                </Link>
                <a
                  href={`tel:${TOLL_FREE.replace(/-/g, '')}`}
                  className="btn-ac mt-2 w-full inline-flex bg-white text-primary border-2 border-primary rounded-lg"
                >
                  {S.toll_free}
                </a>
              </div>
            ) : (
              walk.selectedCategory && (
                <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                  <p className="font-bold">
                    {labelOf(walk.selectedCategory)}
                  </p>
                  <Link
                    href={`/home?cat=${walk.selectedCategory}&lang=${lang}`}
                    className="btn-ac mt-3 w-full inline-flex bg-primary text-white rounded-lg"
                  >
                    {S.yes} →
                  </Link>
                </div>
              )
            )}
          </section>
        ) : (
          /* CATEGORIES: standard 2-col grid */
          <section aria-label={labelOf('knowledge_base')} className="mt-4">
            <div className="grid grid-cols-2 gap-2">
              {categories.map((c, i) => (
                <Link
                  key={c.id}
                  href={`/home?cat=${c.id}&lang=${lang}`}
                  aria-label={labelOf(c.id)}
                  className={`bg-white rounded-lg shadow-sm p-4 min-h-[80px] flex flex-col justify-center ${i === categories.length - 1 ? 'col-span-2' : ''
                    }`}
                >
                  <span className="text-2xl" aria-hidden="true">
                    {CATEGORY_ICONS[c.id] || '📦'}
                  </span>
                  <span className="font-bold" style={{ fontSize: '16px' }}>
                    {labelOf(c.id)}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* SEARCH */}
        <section aria-label="Search" className="mt-4">
          <form onSubmit={submitSearch}>
            <label htmlFor="q" className="sr-only">
              {S.search_placeholder}
            </label>
            <input
              id="q"
              type="text"
              value={query}
              onInput={(e) => setQuery(e.target.value)}
              placeholder={S.search_placeholder}
              className="btn-ac w-full bg-white border border-gray-300 rounded-lg px-4"
            />
            <button
              type="submit"
              aria-label={S.search_submit}
              className="btn-ac mt-2 w-full bg-primary text-white rounded-lg"
            >
              🔍 {S.search_submit}
            </button>
          </form>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {VOICE_PROMPTS.map((p) => (
              <button
                key={p.label}
                type="button"
                aria-label={`${S.listen}: ${p.label}`}
                onClick={() => {
                  setQuery(p.query);
                  goResult(p.query, '');
                }}
                className="bg-white border border-primary text-primary rounded-lg"
                style={{ height: '40px', fontSize: '14px' }}
              >
                🔊 {p.label}
              </button>
            ))}
          </div>
          <Link
            href={`/lc-initiatives?lang=${lang}`}
            aria-label={S.lc_initiatives}
            className="btn-ac mt-2 w-full inline-flex bg-white text-primary border border-primary rounded-lg"
          >
            🏗️ {S.lc_initiatives} →
          </Link>
        </section>
      </div>

      {/* BOTTOM NAV */}
      <BottomNav active={router.pathname} lang={lang} strings={S} />
    </main>
  );
}
