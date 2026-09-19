import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import BottomNav from '../lib/bottom-nav';
import PageHeader from '../lib/page-header';
import DistrictCarousel, { isKnownDistrict } from '../lib/district-carousel';
import {
  REP_GROUPS,
  getRepInitiatives,
  getRepresentative,
  getRepresentatives,
} from '../lib/representatives-store';
import repsData from '../data/representatives.json';
import initiativesData from '../data/lc-initiatives.json';
import enStrings from '../public/i18n/en.json';
import lgStrings from '../public/i18n/lg.json';
import swStrings from '../public/i18n/sw.json';

const UI = { en: enStrings, lg: lgStrings, sw: swStrings };

// Sample data: names and contacts are fictional placeholders for the PoC.

const STATUS_BADGE = {
  announced: 'bg-primary text-white',
  in_progress: 'bg-amber text-white',
  completed: 'bg-secondary text-white',
  stalled: 'bg-accent text-white',
};

const BILL_BADGE = {
  draft: 'bg-primary text-white',
  committee: 'bg-amber text-white',
  passed: 'bg-secondary text-white',
};

// Initiative cards: same alternating muted tones as the home
// announcement cards (secondary / accent), repeating down the list.
const INITIATIVE_CARD_BG = ['bg-secondary-soft', 'bg-accent-soft'];

function fmtDate(iso) {
  try {
    const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
    const p = (n) => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  } catch {
    return iso;
  }
}

function initialsOf(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Avatar placeholder: initials in a soft circle (no photo assets bundled).
// Colours cycle per representative so the list has more colour.
const AVATAR_PALETTE = [
  { bg: '#EDE7F6', ring: '#5B2D8E', text: '#5B2D8E' },
  { bg: '#DDF0E7', ring: '#0E7A55', text: '#0E7A55' },
  { bg: '#FDE4E7', ring: '#C22433', text: '#C22433' },
  { bg: '#FEF3C7', ring: '#B45309', text: '#B45309' },
];

function avatarColorFor(seed) {
  const s = String(seed || '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h + s.charCodeAt(i)) % 997;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

function RepAvatar({ name, size = 56, seed }) {
  const c = avatarColorFor(seed || name);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      role="img"
      aria-label={name}
      className="shrink-0"
    >
      <circle cx="28" cy="28" r="28" fill={c.bg} />
      <circle cx="28" cy="28" r="27" fill="none" stroke={c.ring} strokeWidth="1.5" opacity="0.35" />
      <text
        x="28"
        y="35"
        textAnchor="middle"
        fontSize="19"
        fontWeight="800"
        fill={c.text}
        fontFamily="'Public Sans', system-ui, sans-serif"
      >
        {initialsOf(name)}
      </text>
    </svg>
  );
}

// Group icons: inline SVG, no emojis.
function GroupIcon({ group, size = 16 }) {
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
  switch (group) {
    case 'city_council':
      return (
        <svg {...common}>
          <path d="M3 21h18" />
          <path d="M5 21V7l7-4 7 4v14" />
          <path d="M9 21v-4h6v4" />
        </svg>
      );
    case 'local_council':
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M2.5 20c0-3.6 2.9-5.8 6.5-5.8s6.5 2.2 6.5 5.8" />
          <circle cx="17" cy="9" r="2.6" />
          <path d="M16 14.4c3 .3 5.5 2.2 5.5 5v.6H16" />
        </svg>
      );
    case 'mp':
      return (
        <svg {...common}>
          <path d="M3 9l9-6 9 6" />
          <path d="M4 9v10M20 9v10" />
          <path d="M8 12v5M12 12v5M16 12v5" />
          <path d="M2 21h20" />
        </svg>
      );
    case 'state_minister':
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M12 11v3" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 21c0-4 3-6.5 7-6.5s7 2.5 7 6.5" />
        </svg>
      );
  }
}

function PhoneIcon({ size = 14 }) {
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
      <path d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

function MailIcon({ size = 14 }) {
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
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function groupLabel(group, lang, S) {
  if (group === 'all') return (S.rep_groups && S.rep_groups.all) || 'All';
  return (S.rep_groups && S.rep_groups[group]) || group;
}

function RepCard({ rep, lang, S }) {
  const role = rep.role[lang] || rep.role.en;
  const area = rep.area[lang] || rep.area.en;
  return (
    <Link
      href={`/lc-initiatives?rep=${rep.id}&lang=${lang}`}
      aria-label={`${rep.name}, ${role}`}
      className="bg-white rounded-lg shadow-sm p-4 flex gap-3 items-start"
    >
      <RepAvatar name={rep.name} size={56} seed={rep.id} />
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-ink" style={{ fontSize: '16px' }}>
          {rep.name}
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-red-900" style={{ fontSize: '14px' }}>
          <GroupIcon group={rep.group} size={14} />
          <span className="truncate">{role}</span>
        </span>
        <span className="block text-ac-muted" style={{ fontSize: '14px' }}>
          {area}
        </span>
        <span className="mt-1 flex items-center gap-1 text-ac-muted" style={{ fontSize: '14px' }}>
          <PhoneIcon size={14} />
          <span className="truncate">{rep.phone}</span>
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-ac-muted" style={{ fontSize: '14px' }}>
          <MailIcon size={14} />
          <span className="truncate">{rep.email}</span>
        </span>
      </span>
    </Link>
  );
}

export default function Representatives() {
  const router = useRouter();
  const lang = ['en', 'lg', 'sw'].includes(router.query.lang)
    ? router.query.lang
    : 'en';
  const S = UI[lang];
  const repId = typeof router.query.rep === 'string' ? router.query.rep : null;

  const [district, setDistrict] = useState('kampala');
  const [group, setGroup] = useState('all');
  const [toast, setToast] = useState('');

  useEffect(() => {
    try {
      const d = localStorage.getItem('ac_district');
      if (isKnownDistrict(d)) setDistrict(d);
    } catch {
      // Defaults apply.
    }
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const pickDistrict = (code) => {
    setDistrict(code);
    try {
      localStorage.setItem('ac_district', code);
    } catch {
      // Ignore.
    }
  };

  // ---- DETAIL (?rep=) ----
  if (repId) {
    const rep = getRepresentative(repsData, repId);
    if (!rep) {
      return (
        <main className="min-h-screen bg-white p-4 pb-24">
          <div className="max-w-md mx-auto min-w-0 text-center">
            <PageHeader
              backHref={`/lc-initiatives?lang=${lang}`}
              backLabel={S.back}
              title={S.representatives}
            />
            <p className="mt-4 font-bold">{S.not_found.replace('{location}', repId)}</p>
          </div>
          <BottomNav active={router.pathname} lang={lang} strings={S} />
        </main>
      );
    }
    const role = rep.role[lang] || rep.role.en;
    const area = rep.area[lang] || rep.area.en;
    const initiatives = getRepInitiatives(rep, initiativesData);
    const bills = Array.isArray(rep.bills) ? rep.bills : [];
    const funding = Array.isArray(rep.funding) ? rep.funding : [];
    return (
      <main className="min-h-screen bg-white p-4 pb-24">
        <div className="max-w-md mx-auto min-w-0">
          <PageHeader
            backHref={`/lc-initiatives?lang=${lang}`}
            backLabel={S.back}
            title={S.representatives}
          />

          <section aria-label={rep.name} className="mt-3 bg-white rounded-lg shadow-sm p-5">
            <div className="flex gap-3 items-center min-w-0">
              <RepAvatar name={rep.name} size={64} seed={rep.id} />
              <div className="min-w-0">
                <h2 className="font-bold text-ink break-words" style={{ fontSize: '20px', lineHeight: 1.3 }}>
                  {rep.name}
                </h2>
                <p className="mt-0.5 flex items-center gap-1 text-red-900" style={{ fontSize: '14px' }}>
                  <GroupIcon group={rep.group} size={14} />
                  <span>{role}</span>
                </p>
                <p className="text-ac-muted" style={{ fontSize: '14px' }}>
                  {area}
                </p>
              </div>
            </div>
            <h3 className="mt-4 font-bold" style={{ fontSize: '16px' }}>
              {S.rep_contact}
            </h3>
            <div className="mt-1 flex flex-col gap-2">
              {/* Display only: contact details are sample data, not clickable. */}
              <div className="btn-ac w-full inline-flex bg-white text-primary border-2 border-primary rounded-lg">
                <PhoneIcon size={16} />
                <span className="ml-2">{rep.phone}</span>
              </div>
              <div className="btn-ac w-full inline-flex bg-white text-primary border-2 border-primary rounded-lg">
                <MailIcon size={16} />
                <span className="ml-2 truncate">{rep.email}</span>
              </div>
            </div>
          </section>

          <section aria-label={S.rep_initiatives} className="mt-4">
            <h3 className="font-bold" style={{ fontSize: '18px' }}>
              {S.rep_initiatives}
            </h3>
            <div className="mt-2 flex flex-col gap-2">
              {initiatives.length === 0 && (
                <p className="bg-white rounded-lg p-4 text-center text-ac-muted" style={{ fontSize: '14px' }}>
                  {S.not_found.replace('{location}', rep.name)}
                </p>
              )}
              {initiatives.map((item, idx) => (
                <article
                  key={item.id}
                  className={`rounded-lg shadow-sm p-4 ${INITIATIVE_CARD_BG[idx % INITIATIVE_CARD_BG.length]}`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-ink" style={{ fontSize: '16px' }}>
                      {item.title[lang] || item.title.en}
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded ${STATUS_BADGE[item.status] || 'bg-primary text-white'}`}
                      style={{ fontSize: '12px' }}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-1" style={{ fontSize: '15px', lineHeight: 1.5 }}>
                    {item.description[lang] || item.description.en}
                  </p>
                  <dl className="mt-2 text-ac-muted" style={{ fontSize: '14px' }}>
                    <div className="flex gap-2">
                      <dt className="font-bold shrink-0">{S.rep_led_by}:</dt>
                      <dd>{rep.name}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="font-bold shrink-0">{S.source}:</dt>
                      <dd className="min-w-0">
                        <a
                          href={item.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline break-words"
                        >
                          {S.source_link}
                        </a>
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="font-bold shrink-0">{S.rep_announced}:</dt>
                      <dd>{fmtDate(item.announced)}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </section>

          <section aria-label={S.rep_bills} className="mt-4">
            <h3 className="font-bold" style={{ fontSize: '18px' }}>
              {S.rep_bills}
            </h3>
            <div className="mt-2 flex flex-col gap-2">
              {bills.length === 0 && (
                <p className="bg-white rounded-lg p-4 text-center text-ac-muted" style={{ fontSize: '14px' }}>
                  {S.not_found.replace('{location}', rep.name)}
                </p>
              )}
              {bills.map((b, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-ink" style={{ fontSize: '15px' }}>
                      {b.title[lang] || b.title.en}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded ${BILL_BADGE[b.status] || 'bg-primary text-white'}`}
                      style={{ fontSize: '12px' }}
                    >
                      {b.status}
                    </span>
                  </div>
                  <p className="mt-1 text-ac-muted" style={{ fontSize: '14px' }}>
                    {b.year}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section aria-label={S.rep_funding} className="mt-4">
            <h3 className="font-bold" style={{ fontSize: '18px' }}>
              {S.rep_funding}
            </h3>
            <div className="mt-2 flex flex-col gap-2">
              {funding.length === 0 && (
                <p className="bg-white rounded-lg p-4 text-center text-ac-muted" style={{ fontSize: '14px' }}>
                  {S.not_found.replace('{location}', rep.name)}
                </p>
              )}
              {funding.map((f, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between gap-2">
                  <span className="font-bold text-ink" style={{ fontSize: '15px' }}>
                    {f.label[lang] || f.label.en}
                  </span>
                  <span className="font-bold text-secondary shrink-0" style={{ fontSize: '15px' }}>
                    {f.amount}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <Link
            href={`/complaint?new=1&lang=${lang}&district=${rep.district}`}
            aria-label={S.rep_take_action}
            className="btn-ac mt-4 w-full inline-flex bg-accent text-white rounded-lg"
          >
            {S.rep_take_action}
          </Link>
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
  const reps = getRepresentatives(repsData, district, group);
  const filters = ['all', ...REP_GROUPS];

  return (
    <main className="min-h-screen bg-white p-4 pb-24">
      <div className="max-w-md mx-auto min-w-0">
        <PageHeader
          backHref={`/home?lang=${lang}`}
          backLabel={S.back}
          title={S.representatives}
          description={S.representatives_desc}
        >
          <DistrictCarousel
            district={district}
            onPick={pickDistrict}
            lang={lang}
            UI={UI}
          />
          <div
            className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1"
            role="group"
            aria-label={S.representatives}
          >
            {filters.map((g) => {
              const active = group === g;
              return (
                <button
                  key={g}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setGroup(g)}
                  className={`shrink-0 inline-flex items-center gap-1 whitespace-nowrap rounded-full px-4 font-semibold ${
                    active
                      ? 'bg-primary text-white'
                      : 'bg-white text-primary border border-primary'
                  }`}
                  style={{ minHeight: '36px', fontSize: '14px' }}
                >
                  {g !== 'all' && <GroupIcon group={g} size={14} />}
                  {groupLabel(g, lang, S)}
                </button>
              );
            })}
          </div>
        </PageHeader>

        <div className="mt-3 flex flex-col gap-2" aria-live="polite">
          {reps.length === 0 && (
            <p className="bg-white rounded-lg p-4 text-center text-ac-muted">
              {S.rep_no_reps.replace('{location}', district)}
            </p>
          )}
          {reps.map((rep) => (
            <RepCard key={rep.id} rep={rep} lang={lang} S={S} />
          ))}
        </div>
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
