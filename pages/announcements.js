import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import BottomNav from '../lib/bottom-nav';
import PageHeader from '../lib/page-header';
import DistrictCarousel, { isKnownDistrict } from '../lib/district-carousel';
import { getAnnouncements } from '../lib/announcement-store';
import { speakText, stopSpeaking } from '../lib/speech';
import annData from '../data/announcements.json';
import enStrings from '../public/i18n/en.json';
import lgStrings from '../public/i18n/lg.json';
import swStrings from '../public/i18n/sw.json';

const UI = { en: enStrings, lg: lgStrings, sw: swStrings };

const TYPE_FILTERS = [
  { code: 'all', labelKey: 'ann_filter_all', types: null, icon: null },
  { code: 'power', labelKey: 'ann_filter_power', types: ['power_outage'], icon: 'power' },
  { code: 'water', labelKey: 'ann_filter_water', types: ['water_outage'], icon: 'water' },
  { code: 'road', labelKey: 'ann_filter_road', types: ['road_closure', 'construction'], icon: 'road' },
  { code: 'event', labelKey: 'ann_filter_event', types: ['event', 'donation'], icon: 'event' },
  { code: 'policy', labelKey: 'ann_filter_policy', types: ['policy_change'], icon: 'policy' },
];

// List cards: same alternating muted tones as the home announcement
// cards (secondary / accent), repeating down the list.
const ANNOUNCEMENT_CARD_BG = ['bg-secondary-soft', 'bg-accent-soft'];

// Live-card highlight: border + subtle shadow in the card's own hue.
const CARD_HIGHLIGHT = [
  { border: 'rgba(14,122,85,0.5)', shadow: 'rgba(14,122,85,0.20)' },
  { border: 'rgba(194,36,51,0.4)', shadow: 'rgba(194,36,51,0.16)' },
];

// Inline SVG icons — no emojis anywhere on this page.
function FilterIcon({ kind, size = 14 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    role: 'img',
    'aria-hidden': 'true',
    className: 'shrink-0',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  switch (kind) {
    case 'power':
      return (
        <svg {...common}>
          <path d="M13 2 5 13.5h5L9 22l8-11.5h-5L13 2Z" />
        </svg>
      );
    case 'water':
      return (
        <svg {...common}>
          <path d="M12 3c3 4.2 6 7.2 6 10.2a6 6 0 0 1-12 0C6 10.2 9 7.2 12 3Z" />
        </svg>
      );
    case 'road':
      return (
        <svg {...common}>
          <path d="M5 5v14M19 5v14" />
          <path d="M5 8.5h14M5 15.5h14" />
          <path d="M8.5 8.5 11 15.5M14.5 8.5 17 15.5" />
        </svg>
      );
    case 'event':
      return (
        <svg {...common}>
          <path d="M3 10.5v3L8 14.5l9 4.5v-13l-9 4.5L3 10.5Z" />
          <path d="M8 15.5 9.5 21" />
        </svg>
      );
    case 'policy':
      return (
        <svg {...common}>
          <path d="M6 3h9l4 4v14H6V3Z" />
          <path d="M9 12h7M9 15.5h7" />
        </svg>
      );
    default:
      return null;
  }
}

function ActionIcon({ kind, size = 16 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    role: 'img',
    'aria-hidden': 'true',
    className: 'shrink-0',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  switch (kind) {
    case 'listen':
      return (
        <svg {...common}>
          <path d="M4 9.5v5h3.5L13 19V5L7.5 9.5H4Z" />
          <path d="M16 9.5a4 4 0 0 1 0 5" />
        </svg>
      );
    case 'share':
      return (
        <svg {...common}>
          <path d="M12 14V3" />
          <path d="M7 7.5 12 2.5l5 5" />
          <path d="M5 12v8.5h14V12" />
        </svg>
      );
    case 'external':
      return (
        <svg {...common}>
          <path d="M9 4H4v16h16v-5" />
          <path d="M14 4h6v6" />
          <path d="M20 4l-9 9" />
        </svg>
      );
    case 'pin':
      return (
        <svg {...common}>
          <path d="M12 21s-7-5.8-7-11a7 7 0 0 1 14 0c0 5.2-7 11-7 11Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      );
    case 'copy':
      return (
        <svg {...common}>
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15V5a2 2 0 0 1 2-2h10" />
        </svg>
      );
    default:
      return null;
  }
}

// Short date for list cards, e.g. "Sep 25" — matches the home cards.
function formatShortDate(dateStr, lang) {
  try {
    return new Date(dateStr).toLocaleDateString(
      lang === 'lg' ? 'en-UG' : lang,
      { month: 'short', day: 'numeric' },
    );
  } catch {
    return dateStr;
  }
}

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

  const [district, setDistrict] = useState('kampala'); // kampala | mukono 
  const [typeFilter, setTypeFilter] = useState('all');
  const [copiedId, setCopiedId] = useState(null);
  const copyTimer = useRef(null);

  useEffect(() => {
    try {
      const d = localStorage.getItem('ac_district');
      if (isKnownDistrict(d)) setDistrict(d);
    } catch {
      // Defaults apply.
    }
  }, []);
  useEffect(() => stopSpeaking, []);
  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  // Inline "Copied" feedback next to the copy icon — no popups.
  const flashCopied = (id) => {
    setCopiedId(id);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopiedId(null), 2000);
  };

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
        flashCopied(a.id);
      } catch {
        // Silent: no popup when copying is unavailable.
      }
    }
  };

  const copyItem = async (a) => {
    const title = a.title[lang] || a.title.en;
    const body = a.description[lang] || a.description.en;
    const text = `AlertCitizen: ${title}. ${body} (${a.source})`;
    try {
      await navigator.clipboard.writeText(text);
      flashCopied(a.id);
    } catch {
      // Silent: no popup when copying is unavailable.
    }
  };

  // ---- LIST (full-info cards — no separate detail page) ----
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

  // Group announcements by start month, ordered from the current month
  // forward (September, then October, November, …). Past months sink to
  // the bottom, most recent first.
  const now = new Date();
  const nowVal = now.getFullYear() * 12 + now.getMonth();
  const monthRank = (key) => {
    const [y, m] = key.split('-').map(Number);
    const delta = y * 12 + m - nowVal;
    return delta >= 0 ? delta : 1000 - delta;
  };
  const monthLocale = lang === 'lg' ? 'en-UG' : lang;
  const monthKeyOf = (a) => {
    const d = new Date(a.start);
    return `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
  };
  const monthLabelOf = (key) => {
    const [y, m] = key.split('-').map(Number);
    try {
      return new Date(y, m, 1).toLocaleDateString(monthLocale, {
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return key;
    }
  };
  const groupMap = new Map();
  sorted.forEach((a) => {
    const key = monthKeyOf(a);
    if (!groupMap.has(key)) groupMap.set(key, { key, at: 0, items: [] });
    const g = groupMap.get(key);
    g.items.push(a);
    const t = new Date(a.start).getTime() || 0;
    if (t > g.at) g.at = t;
  });
  const groups = [...groupMap.values()].sort((x, y) => monthRank(x.key) - monthRank(y.key));

  return (
    <main className="min-h-screen bg-white p-4 pb-24">
      <div className="max-w-md mx-auto min-w-0">
        <PageHeader
          backHref={`/home?lang=${lang}`}
          backLabel={S.back}
          title={S.announcements}
          description={S.announcements_desc}
        >
          <DistrictCarousel
            district={district}
            onPick={pickDistrict}
            lang={lang}
            UI={UI}
          />
          <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Type">
            {TYPE_FILTERS.map((f) => {
              const active = typeFilter === f.code;
              return (
                <button
                  key={f.code}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTypeFilter(f.code)}
                  className={`shrink-0 inline-flex items-center gap-1 whitespace-nowrap rounded-full px-4 font-semibold ${
                    active
                      ? 'bg-primary text-white'
                      : 'bg-white text-primary border border-primary'
                  }`}
                  style={{ minHeight: '36px', fontSize: '14px' }}
                >
                  {f.icon && <FilterIcon kind={f.icon} size={14} />}
                  {S[f.labelKey] || f.code}
                </button>
              );
            })}
          </div>
        </PageHeader>
        <div className="mt-3 flex flex-col gap-2" aria-live="polite">
          {sorted.length === 0 && (
            <p className="bg-white rounded-lg p-4 text-center text-ac-muted">
              {S.not_found.replace('{location}', district)}
            </p>
          )}
          {groups.map((g) => (
            <section key={g.key} aria-label={monthLabelOf(g.key)}>
              <h2
                className="mt-4 font-bold text-ink"
                style={{ fontSize: '18px' }}
              >
                {monthLabelOf(g.key)}
              </h2>
              <div className="mt-2 flex flex-col gap-3">
                {g.items.map((a) => {
                  const gi = sorted.indexOf(a);
                  const live = isActive(a);
                  const title = a.title[lang] || a.title.en;
                  const body = a.description[lang] || a.description.en;
                  const hl = CARD_HIGHLIGHT[gi % CARD_HIGHLIGHT.length];
                  return (
                    <article
                      key={a.id}
                      aria-label={title}
                      className={`rounded-xl p-4 ${ANNOUNCEMENT_CARD_BG[gi % ANNOUNCEMENT_CARD_BG.length]
                        } ${live ? '' : 'opacity-60'}`}
                style={
                  live
                    ? { border: `2px solid ${hl.border}`, boxShadow: `0 2px 10px ${hl.shadow}` }
                    : undefined
                }
              >
                      <div className="flex items-center justify-between gap-2">
                        <div
                          className="font-medium text-ac-muted"
                          style={{ fontSize: '14px' }}
                        >
                          {formatShortDate(a.start, lang)}
                        </div>
                        <div
                          className="flex items-center gap-1 shrink-0"
                          aria-live="polite"
                        >
                          {copiedId === a.id && (
                            <span
                              className="font-semibold text-secondary"
                              style={{ fontSize: '13px' }}
                            >
                              {S.ann_copied}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => copyItem(a)}
                            aria-label={S.ann_copy}
                            title={S.ann_copy}
                            className="inline-flex items-center justify-center rounded-full bg-white text-primary border border-primary shrink-0"
                            style={{ width: '48px', height: '48px' }}
                          >
                            <ActionIcon kind="copy" size={20} />
                          </button>
                        </div>
                      </div>
                <h2
                  className="mt-1 font-bold text-ink leading-snug"
                  style={{ fontSize: '16px' }}
                >
                  {title}
                </h2>
                <p className="mt-1">
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-white font-bold text-ink px-3 py-1"
                    style={{ fontSize: '14px' }}
                  >
                    <ActionIcon kind="clock" size={16} />
                    <span>{fmt(a.start, lang)} → {fmt(a.end, lang)}</span>
                  </span>
                </p>
                <p
                  className="mt-1 text-ink"
                  style={{ fontSize: '15px', lineHeight: 1.55 }}
                >
                  {body}
                </p>
                <p
                  className="mt-2 flex items-center gap-1 text-ac-muted"
                  style={{ fontSize: '14px' }}
                >
                  <ActionIcon kind="pin" size={14} />
                  <span>
                    {[a.district, a.county, a.subcounty, a.parish]
                      .filter(Boolean)
                      .join(' > ')}
                  </span>
                </p>
                <p className="mt-1 text-ac-muted" style={{ fontSize: '14px' }}>
                  {S.source}: {a.source}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => speakText(`${title}. ${body}`, lang, `ann_${a.id}`)}
                    aria-label={S.listen}
                    className="btn-ac w-full inline-flex gap-2 bg-white text-primary border-2 border-primary rounded-full"
                  >
                    <ActionIcon kind="listen" size={20} /> {S.listen}
                  </button>
                  <button
                    type="button"
                    onClick={() => shareItem(a)}
                    className="btn-ac w-full inline-flex gap-2 bg-white text-primary border-2 border-primary rounded-full"
                  >
                    <ActionIcon kind="share" size={20} /> {S.share}
                  </button>
                </div>
                <a
                  href={a.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ac mt-2 w-full inline-flex gap-2 bg-primary text-white rounded-full"
                >
                  <ActionIcon kind="external" size={20} /> {S.source_link}
                </a>
              </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
      <BottomNav active={router.pathname} lang={lang} strings={S} />
    </main>
  );
}
