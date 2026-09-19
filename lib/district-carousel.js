import { useMemo, useState } from 'react';
import { t } from './i18n';
import geo from '../data/geography.json';

// Shared district carousel (home, announcements, quiz, representatives,
// complaint). One canonical design so every instance matches:
// label + chips in ONE horizontal row, chips slide underneath the
// sticky label (higher z-index) on scroll.
//
// Why inline SVG instead of react-icons / emoji?
// Same reason as lib/bottom-nav.js: zero deps, tiny PWA payload, no
// Preact-compat risk — and an SVG inherits the button color and stays
// silent to screen readers (the button text carries the name).

// Areas with data, derived from geography.json so the count and chips
// grow automatically as districts are added (2 today, 54 tomorrow).
export function getDistricts() {
  const d = (geo && geo.districts) || {};
  return Object.entries(d).map(([code, info]) => ({
    code,
    label: (info && info.label) || code,
  }));
}

// Preview chips for areas without data yet. Codes already present in
// geography.json are filtered out so nothing renders twice.
const UPCOMING_ALL = [
  { code: 'wakiso', label: 'Wakiso' },
  { code: 'jinja', label: 'Jinja' },
  { code: 'gulu', label: 'Gulu' },
  { code: 'mbarara', label: 'Mbarara' },
];
export function getUpcomingDistricts() {
  const supported = new Set(getDistricts().map((d) => d.code));
  return UPCOMING_ALL.filter((d) => !supported.has(d.code));
}

// Admin level is data-driven so other countries can show
// Provinces / States instead of Districts (see geography.json).
const ADMIN_LEVELS = ['districts', 'provinces', 'states'];
export function adminLevelKey() {
  const v = geo && geo.adminLevel;
  return ADMIN_LEVELS.includes(v) ? v : 'districts';
}

// True for any area code the app has data for (persistable, subcounties
// resolvable). Used by page restore guards instead of hardcoded lists.
export function isKnownDistrict(code) {
  return Boolean(code && geo.districts && geo.districts[code]);
}

function SearchIcon({ size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      role="img"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle
        cx="7"
        cy="7"
        r="4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M10.5 10.5 L14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Props:
//   district     currently selected area code (or an extra option code)
//   onPick(code) selection handler (page persists as it sees fit)
//   lang / UI   i18n language + string tables (for admin label)
//   extraOptions extra selectable chips after the districts,
//                e.g. [{ code: 'all', label: 'All' }] on announcements
//   showUpcoming render muted coming-soon previews (default true)
export default function DistrictCarousel({
  district,
  onPick,
  lang = 'en',
  UI,
  extraOptions = [],
  showUpcoming = true,
}) {
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState(false);

  const districts = useMemo(() => getDistricts(), []);
  const upcoming = useMemo(() => getUpcomingDistricts(), []);
  const adminKey = adminLevelKey();
  const adminLabel = t(`admin_${adminKey}`, lang, UI);
  const adminSearchPlaceholder = t(`admin_search_${adminKey}`, lang, UI);
  const adminNoMatch = t('admin_no_match', lang, UI);

  const match = (list) => {
    const q = filter.trim().toLowerCase();
    if (!q) return list;
    return list.filter((d) => d.label.toLowerCase().includes(q));
  };
  const visibleDistricts = match(districts);
  const visibleExtras = match(extraOptions);
  const visibleUpcoming = showUpcoming ? match(upcoming) : [];
  const empty =
    visibleDistricts.length === 0 &&
    visibleExtras.length === 0 &&
    visibleUpcoming.length === 0;

  const chip = (d) => {
    const active = district === d.code;
    return (
      <button
        key={d.code}
        type="button"
        aria-pressed={active}
        onClick={() => onPick(d.code)}
        className={`shrink-0 whitespace-nowrap rounded-full px-4 font-semibold ${
          active
            ? 'bg-primary text-white'
            : 'bg-white text-primary border border-primary'
        }`}
        style={{ minHeight: '36px', fontSize: '14px' }}
      >
        {d.label}
      </button>
    );
  };

  return (
    <>
      <div
        id="district-chips"
        className="no-scrollbar mt-2 flex items-center gap-2 overflow-x-auto pb-1 pt-2"
        role="group"
        aria-labelledby="district-label"
      >
        <button
          type="button"
          onClick={() => setOpen((s) => !s)}
          aria-expanded={open}
          aria-controls="district-search district-chips"
          aria-label={`${adminLabel} (${districts.length})`}
          className="sticky left-0 z-20 inline-flex shrink-0 items-center gap-1 whitespace-nowrap font-bold text-primary pr-2 focus:outline-none focus-visible:outline-none border-0 border-r-2 border-primary-dark/10 bg-primary-soft"
          style={{ minHeight: '36px', fontSize: '14px' }}
        >
          <SearchIcon size={14} />
          <span id="district-label">
            {adminLabel} ({districts.length})
          </span>
        </button>
        {visibleDistricts.map(chip)}
        {visibleExtras.map(chip)}
        {visibleUpcoming.map((d) => (
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
        {empty && (
          <span
            className="shrink-0 whitespace-nowrap text-ac-muted"
            style={{ fontSize: '14px' }}
          >
            {adminNoMatch}
          </span>
        )}
      </div>
      {open && (
        <>
          <label htmlFor="district-search" className="sr-only">
            {adminSearchPlaceholder}
          </label>
          <input
            id="district-search"
            type="search"
            value={filter}
            onInput={(e) => setFilter(e.target.value)}
            placeholder={adminSearchPlaceholder}
            autoComplete="off"
            className="mt-2 w-full bg-white border border-gray-300 rounded-xl px-4 focus:outline-none focus-visible:outline-none"
            style={{ minHeight: '48px', fontSize: '16px' }}
          />
        </>
      )}
    </>
  );
}
