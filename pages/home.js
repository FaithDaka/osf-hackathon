import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { t } from '../lib/i18n';
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
const DISTRICTS = [
  { code: 'kampala', label: 'Kampala' },
  { code: 'mukono', label: 'Mukono' },
];
const TOLL_FREE = '0800-225-8424';

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
      audio.play().catch(() => {});
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
  const announcedRef = useRef('');

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

  const nav = (path, tabLabel) => {
    const active = router.pathname === path;
    return (
      <Link
        key={path}
        href={`${path}?lang=${lang}`}
        aria-label={tabLabel}
        aria-current={active ? 'page' : undefined}
        className={`flex-1 text-center py-3 min-h-[48px] ${
          active ? 'text-primary font-bold underline' : 'text-ac-muted'
        }`}
      >
        {tabLabel}
      </Link>
    );
  };

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
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ac-bg p-4 pb-24">
      <div className="max-w-md mx-auto">
        {/* TOP BAR */}
        <div className="flex items-center justify-between">
          <span className="text-primary font-bold" style={{ fontSize: '16px' }}>
            {S.app_name}
          </span>
          <Link
            href="/"
            aria-label="Switch language"
            className="inline-flex items-center justify-center rounded-lg border border-primary min-h-[48px] min-w-[48px]"
          >
            🌐
          </Link>
        </div>

        {/* DISTRICT SELECTOR */}
        <div className="mt-2 flex gap-2" role="group" aria-label="District">
          {DISTRICTS.map((d) => (
            <button
              key={d.code}
              type="button"
              aria-pressed={district === d.code}
              onClick={() => pickDistrict(d.code)}
              className={`btn-ac flex-1 rounded-lg border-2 ${
                district === d.code
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-primary border-primary'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

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
                  className={`shrink-0 w-56 bg-white rounded-lg shadow-sm p-3 border-l-4 text-left ${
                    SEVERITY_BORDER[a.severity] || SEVERITY_BORDER.info
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
                        className={`rounded-lg p-6 ${
                          active
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
                  className={`bg-white rounded-lg shadow-sm p-4 min-h-[80px] flex flex-col justify-center ${
                    i === categories.length - 1 ? 'col-span-2' : ''
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
      <nav
        role="navigation"
        aria-label="Main"
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300"
      >
        <div className="max-w-md mx-auto flex">
          {nav('/home', `🏠 ${S.app_name}`)}
          {nav('/announcements', `📢 ${S.announcements}`)}
          {nav('/complaint', `📋 ${S.file_complaint}`)}
          {nav('/quiz', `❓ ${S.quiz}`)}
        </div>
      </nav>
    </main>
  );
}
