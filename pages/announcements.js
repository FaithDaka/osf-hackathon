import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import BottomNav from '../lib/bottom-nav';
import DistrictCarousel, { isKnownDistrict } from '../lib/district-carousel';
import { getAnnouncements } from '../lib/announcement-store';
import { speakText, stopSpeaking } from '../lib/speech';
import annData from '../data/announcements.json';
import enStrings from '../public/i18n/en.json';
import lgStrings from '../public/i18n/lg.json';
import swStrings from '../public/i18n/sw.json';

const UI = { en: enStrings, lg: lgStrings, sw: swStrings };

const SEVERITY_BORDER = {
  critical: 'border-accent',
  warning: 'border-amber',
  info: 'border-primary',
};

const SEVERITY_BADGE = {
  critical: 'bg-accent text-white',
  warning: 'bg-amber text-white',
  info: 'bg-primary text-white',
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

const TYPE_FILTERS = [
  { code: 'all', label: 'All', types: null },
  { code: 'power', label: '⚡ Power', types: ['power_outage'] },
  { code: 'water', label: '💧 Water', types: ['water_outage'] },
  { code: 'road', label: '🚧 Road', types: ['road_closure', 'construction'] },
  { code: 'event', label: '📢 Event', types: ['event', 'donation'] },
  { code: 'policy', label: '📜 Policy', types: ['policy_change'] },
];

function fmt(dateStr, lang) {
  try {
    return new Date(dateStr).toLocaleString(lang === 'lg' ? 'en-UG' : lang, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function isActive(a) {
  try {
    return new Date(a.end).getTime() > Date.now();
  } catch {
    return false;
  }
}

export default function Announcements() {
  const router = useRouter();
  const lang = ['en', 'lg', 'sw'].includes(router.query.lang)
    ? router.query.lang
    : 'en';
  const S = UI[lang];
  const id = typeof router.query.id === 'string' ? router.query.id : null;

  const [district, setDistrict] = useState('kampala'); // kampala | mukono 
  const [typeFilter, setTypeFilter] = useState('all');
  const [toast, setToast] = useState('');

  useEffect(() => {
    try {
      const d = localStorage.getItem('ac_district');
      if (isKnownDistrict(d)) setDistrict(d);
    } catch {
      // Defaults apply.
    }
  }, []);
  useEffect(() => stopSpeaking, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const pickDistrict = (code) => {
    setDistrict(code);
    if (isKnownDistrict(code)) {
      try {
        localStorage.setItem('ac_district', code);
      } catch {
        // Ignore.
      }
    }
  };

  const shareItem = async (a) => {
    const title = a.title[lang] || a.title.en;
    const body = a.description[lang] || a.description.en;
    const text = `AlertCitizen: ${title}. ${body} (${a.source})`;
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title, text });
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

  // ---- DETAIL (?id=) ----
  if (id) {
    const detail = annData.items.find((a) => a.id === id);
    if (!detail) {
      return (
        <main className="min-h-screen bg-ac-bg p-4 pb-24">
          <div className="max-w-md mx-auto text-center">
            <p className="font-bold">{S.not_found.replace('{location}', id)}</p>
            <Link
              href={`/announcements?lang=${lang}`}
              className="btn-ac mt-4 w-full inline-flex bg-primary text-white rounded-lg"
            >
              ← {S.announcements}
            </Link>
          </div>
          <BottomNav active={router.pathname} lang={lang} strings={S} />
        </main>
      );
    }
    const title = detail.title[lang] || detail.title.en;
    const body = detail.description[lang] || detail.description.en;
    return (
      <main className="min-h-screen bg-ac-bg p-4 pb-24">
        <div className="max-w-md mx-auto">
          <Link
            href={`/announcements?lang=${lang}`}
            aria-label={S.announcements}
            className="inline-flex items-center min-h-[48px] text-primary font-bold"
          >
            ← {S.announcements}
          </Link>
          <article
            className={`mt-2 bg-white rounded-lg shadow-sm p-4 border-l-4 ${
              SEVERITY_BORDER[detail.severity] || SEVERITY_BORDER.info
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden="true">
                {TYPE_ICON[detail.type] || '📢'}
              </span>
              <span
                className={`px-2 py-1 rounded uppercase ${
                  SEVERITY_BADGE[detail.severity] || SEVERITY_BADGE.info
                }`}
                style={{ fontSize: '14px' }}
              >
                {detail.severity}
              </span>
            </div>
            <h1 className="mt-2 font-bold" style={{ fontSize: '20px' }}>
              {title}
            </h1>
            <p className="mt-2" style={{ fontSize: '18px' }}>
              {body}
            </p>
            <dl className="mt-3 text-ac-muted" style={{ fontSize: '16px' }}>
              <div className="flex gap-2">
                <dt className="font-bold">📍</dt>
                <dd>
                  {[detail.district, detail.county, detail.subcounty, detail.parish]
                    .filter(Boolean)
                    .join(' > ')}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-bold">🕒</dt>
                <dd>
                  {fmt(detail.start, lang)} → {fmt(detail.end, lang)}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-bold">{S.source}:</dt>
                <dd>{detail.source}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-bold">{S.last_updated}:</dt>
                <dd>{fmt(detail.published, lang)}</dd>
              </div>
            </dl>
            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => speakText(`${title}. ${body}`, lang, `ann_${detail.id}`)}
                aria-label={S.listen}
                className="btn-ac w-full bg-white text-primary border-2 border-primary rounded-lg"
              >
                🔊 {S.listen}
              </button>
              <button
                type="button"
                onClick={() => shareItem(detail)}
                className="btn-ac w-full bg-white text-primary border-2 border-primary rounded-lg"
              >
                📤 {S.share}
              </button>
              <a
                href={detail.source_url}
                target="_blank"
                rel="noreferrer"
                className="btn-ac w-full inline-flex bg-primary text-white rounded-lg"
              >
                {S.source_link} ↗
              </a>
            </div>
          </article>
        </div>
        {toast && (
          <div role="status" className="fixed bottom-4 left-0 right-0 mx-auto max-w-md px-4">
            <div className="bg-secondary text-white rounded-lg p-4 text-center shadow">
              {toast}
            </div>
          </div>
        )}
        <BottomNav active={router.pathname} lang={lang} strings={S} />
      </main>
    );
  }

  // ---- LIST ----
  const scoped = getAnnouncements(annData, district === 'all' ? null : district);
  const activeFilter = TYPE_FILTERS.find((f) => f.code === typeFilter) || TYPE_FILTERS[0];
  const typed = activeFilter.types
    ? scoped.filter((a) => activeFilter.types.includes(a.type))
    : scoped;
  const sorted = [...typed].sort((a, b) => {
    const aa = isActive(a) ? 0 : 1;
    const bb = isActive(b) ? 0 : 1;
    if (aa !== bb) return aa - bb;
    return new Date(b.published).getTime() - new Date(a.published).getTime();
  });

  return (
    <main className="min-h-screen bg-ac-bg p-4 pb-24">
      <div className="max-w-md mx-auto">
        <Link
          href={`/home?lang=${lang}`}
          aria-label={S.app_name}
          className="inline-flex items-center min-h-[48px] text-primary font-bold"
        >
          ← {S.app_name}
        </Link>
        <h1 className="text-lg font-bold">{S.announcements}</h1>
        <p className="text-ac-muted" style={{ fontSize: '16px' }}>
          {S.announcements_desc}
        </p>
        <DistrictCarousel
          district={district}
          onPick={pickDistrict}
          lang={lang}
          UI={UI}
          // extraOptions={[{ code: 'all', label: 'All' }]}
        />
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Type">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.code}
              type="button"
              aria-pressed={typeFilter === f.code}
              onClick={() => setTypeFilter(f.code)}
              className={`shrink-0 px-3 rounded-lg border min-h-[48px] ${
                typeFilter === f.code
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-primary border-primary'
              }`}
              style={{ fontSize: '14px' }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-col gap-2" aria-live="polite">
          {sorted.length === 0 && (
            <p className="bg-white rounded-lg p-4 text-center text-ac-muted">
              {S.not_found.replace('{location}', district)}
            </p>
          )}
          {sorted.map((a) => {
            const live = isActive(a);
            return (
              <Link
                key={a.id}
                href={`/announcements?id=${a.id}&lang=${lang}`}
                aria-label={a.title[lang] || a.title.en}
                className={`bg-white rounded-lg shadow-sm p-4 border-l-4 ${
                  SEVERITY_BORDER[a.severity] || SEVERITY_BORDER.info
                } ${live ? '' : 'opacity-60'}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl" aria-hidden="true">
                    {TYPE_ICON[a.type] || '📢'}
                  </span>
                  <span
                    className={`px-2 rounded uppercase ${
                      SEVERITY_BADGE[a.severity] || SEVERITY_BADGE.info
                    }`}
                    style={{ fontSize: '14px' }}
                  >
                    {a.severity}
                  </span>
                  {!live && (
                    <span className="text-ac-muted" style={{ fontSize: '14px' }}>
                      expired
                    </span>
                  )}
                </div>
                <div className="mt-1 font-bold" style={{ fontSize: '16px' }}>
                  {a.title[lang] || a.title.en}
                </div>
                <div className="text-ac-muted" style={{ fontSize: '14px' }}>
                  {(a.description[lang] || a.description.en).slice(0, 120)}…
                </div>
                <div className="text-ac-muted" style={{ fontSize: '14px' }}>
                  {fmt(a.start, lang)} → {fmt(a.end, lang)}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
      <BottomNav active={router.pathname} lang={lang} strings={S} />
    </main>
  );
}
