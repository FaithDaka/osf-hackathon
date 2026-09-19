import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { setLang, t } from '../lib/i18n';
import BottomNav from '../lib/bottom-nav';
import ConfirmModal from '../lib/confirm-modal';
import PageHeader from '../lib/page-header';
import DistrictCarousel, { isKnownDistrict } from '../lib/district-carousel';
import { getActiveAnnouncements } from '../lib/announcement-store';
import { getLocalReps } from '../lib/representatives-store';
import { RepCard } from './lc-initiatives';
import repsData from '../data/representatives.json';
import {
  advanceWalkthrough,
  createWalkthroughState,
  getAudioFile,
  getCurrentCategory,
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

function ShieldLogo() {
  return (
    <svg width="36" height="36" viewBox="0 0 512 512" role="img" aria-label="AlertCitizen logo">
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

// Magnifier for the search input (decorative — the input carries the name).
function SearchIcon({ size = 18 }) {
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
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="M15.8 15.8 21 21" />
    </svg>
  );
}

// Stop-square icon for the "Stop Listening" exit button.
function StopIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-hidden="true"
      className="shrink-0"
      fill="currentColor"
    >
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

// Microphone inside the search input. Voice search is not ready yet, so
// the button intentionally does nothing on click.
function MicIcon({ size = 18 }) {
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
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
      <path d="M12 18v3" />
    </svg>
  );
}

// Coloured quick-topic icons (no emojis).
function QuickTopicIcon({ kind, size = 20 }) {
  const colors = {
    land: '#0E7A55',
    fees: '#B45309',
    safety: '#C22433',
    permits: '#5B2D8E',
    education: '#0E7490',
  };
  const color = colors[kind] || '#5B2D8E';
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    role: 'img',
    'aria-hidden': 'true',
    className: 'shrink-0',
    fill: 'none',
    stroke: color,
    strokeWidth: '1.8',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  switch (kind) {
    case 'land':
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M12 5v14M4 12h16" />
        </svg>
      );
    case 'fees':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8.5v7M9.5 10.5h5" />
        </svg>
      );
    case 'safety':
      return (
        <svg {...common}>
          <path d="M12 3l7 2.8v5.4c0 4.8-3.4 7.7-7 8.8-3.6-1.1-7-4-7-8.8V5.8L12 3Z" />
          <path d="M9.3 12l2 2 3.6-4" />
        </svg>
      );
    case 'permits':
      return (
        <svg {...common}>
          <path d="M6 3h9l4 4v14H6V3Z" />
          <path d="M9 12h7M9 15.5h5" />
        </svg>
      );
    case 'education':
      return (
        <svg {...common}>
          <path d="M12 4 2.5 9.5 12 15l9.5-5.5L12 4Z" />
          <path d="M6.5 11.5V16c0 1.6 11 1.6 11 0v-4.5" />
        </svg>
      );
    default:
      return null;
  }
}

// Right-arrow icon for the "See all" link.
function ArrowRightIcon({ size = 14 }) {
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
        d="M2.5 8h10M8.5 4.5 12 8l-3.5 3.5"
        fill="none"
        stroke="currentColor"
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
const CATEGORY_COLORS = {
  public_services: '#5B2D8E',
  know_your_lc: '#2563EB',
  local_funding: '#0E7A55',
  community_events: '#C22433',
  policies: '#92600A',
  knowledge_base: '#0E7490',
  fees_permits: '#C2410C',
  education: '#1E1B4B',
  other: '#92400E',
};

// Coloured SVG icons that match each topic (no emojis).
function CategoryIcon({ id, size = 64 }) {
  const color = CATEGORY_COLORS[id] || '#5B2D8E';
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 28 28',
    role: 'img',
    'aria-hidden': 'true',
    className: 'shrink-0',
  };
  switch (id) {
    case 'public_services':
      return (
        <svg {...common} fill="none">
          <path d="M14 3 3.5 8.5h21L14 3Z" fill={color} />
          <rect x="5" y="10.5" width="2.6" height="8" rx="0.6" fill={color} />
          <rect x="9.4" y="10.5" width="2.6" height="8" rx="0.6" fill={color} />
          <rect x="13.4" y="10.5" width="2.6" height="8" rx="0.6" fill={color} opacity="0.85" />
          <rect x="17.4" y="10.5" width="2.6" height="8" rx="0.6" fill={color} />
          <rect x="21" y="10.5" width="2.6" height="8" rx="0.6" fill={color} opacity="0.85" />
          <rect x="3" y="19.5" width="22" height="2.6" rx="1.3" fill={color} />
          <rect x="5" y="23" width="18" height="2" rx="1" fill={color} opacity="0.45" />
        </svg>
      );
    case 'know_your_lc':
      return (
        <svg {...common} fill="none">
          <circle cx="10" cy="9" r="5" fill={color} />
          <path d="M1.5 23c0-4.8 3.8-7.8 8.5-7.8s8.5 3 8.5 7.8v1h-17v-1Z" fill={color} />
          <circle cx="19.5" cy="10" r="4" fill={color} opacity="0.65" />
          <path d="M18.5 15.6c3.9 0.3 7 2.9 7 6.4v1h-6.5c.3-2.8-.3-5.4-.5-7.4Z" fill={color} opacity="0.65" />
        </svg>
      );
    case 'local_funding':
      return (
        <svg {...common} fill="none">
          <path d="M10 3.5h8l-1.6 3.2c1.9 1 3.1 2.6 3.1 4.7 0 3.6-3.6 9.6-5.5 9.6s-5.5-6-5.5-9.6c0-2.1 1.2-3.7 3.1-4.7L10 3.5Z" fill={color} />
          <path d="M10 3.5h8l-1 2H11l-1-2Z" fill="#fff" opacity="0.85" />
          <text x="14" y="16.5" textAnchor="middle" fontSize="9" fontWeight="800" fill="#fff">$</text>
          <ellipse cx="14" cy="22.5" rx="4.5" ry="1.6" fill={color} opacity="0.3" />
        </svg>
      );
    case 'community_events':
      return (
        <svg {...common} fill="none">
          <rect x="3.5" y="5" width="21" height="19" rx="2.5" fill={color} opacity="0.18" />
          <rect x="3.5" y="5" width="21" height="6.5" rx="2.5" fill={color} />
          <rect x="3.5" y="9" width="21" height="3" fill={color} />
          <rect x="3.5" y="5" width="21" height="19" rx="2.5" stroke={color} strokeWidth="1.8" />
          <path d="M8 3.5v4M20 3.5v4" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
          <text x="14" y="20.5" textAnchor="middle" fontSize="8.5" fontWeight="800" fill={color}>17</text>
        </svg>
      );
    case 'policies':
      return (
        <svg {...common} fill="none">
          <path d="M6 5.5h13.5c2 0 2 2.8 0 2.8H8.5v12.2c0 1-.8 1.5-1.4 1L5 19.6c-.5-.4-.5-1 0-1.4l1-1V5.5Z" fill="#D9B98A" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M9.5 10.5h8M9.5 13.5h8M9.5 16.5h5.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
          <rect x="5" y="4" width="16" height="2.4" rx="1.2" fill={color} />
        </svg>
      );
    case 'knowledge_base':
      return (
        <svg {...common} fill="none">
          <circle cx="12.5" cy="12.5" r="7.5" fill={color} opacity="0.15" />
          <circle cx="12.5" cy="12.5" r="7.5" stroke={color} strokeWidth="2.2" />
          <circle cx="12.5" cy="12.5" r="2.2" fill={color} opacity="0.5" />
          <path d="M18.2 18.2 24 24" stroke={color} strokeWidth="3" strokeLinecap="round" />
          <path d="M18.2 18.2 24 24" stroke="#fff" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
        </svg>
      );
    case 'fees_permits':
      return (
        <svg {...common} fill="none">
          <rect x="5.5" y="5" width="17" height="20" rx="2" fill={color} opacity="0.15" />
          <rect x="5.5" y="5" width="17" height="20" rx="2" stroke={color} strokeWidth="1.8" />
          <rect x="10" y="2.8" width="8" height="4.4" rx="1.4" fill={color} />
          <circle cx="11.2" cy="4.9" r="0.9" fill="#fff" />
          <circle cx="16.8" cy="4.9" r="0.9" fill="#fff" />
          <path d="M9.5 13.5l2.6 2.6 5-5.4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9.5 20h9" stroke={color} strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
        </svg>
      );
    case 'education':
      return (
        <svg {...common} fill="none">
          <path d="M14 4 2.5 9.5 14 15l9.5-3.9v5.2h2V9.5L14 4Z" fill={color} />
          <path d="M8 14.6v3.9c0 1.4 12 1.4 12 0v-3.9l-6 2.5-6-2.5Z" fill={color} opacity="0.8" />
          <path d="M23.5 10.5V18" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="23.5" cy="19.5" r="1.8" fill="#F59E0B" />
        </svg>
      );
    case 'other':
    default:
      return (
        <svg {...common} fill="none">
          <path d="M14 3.5 24 8.7v10.6L14 24.5 4 19.3V8.7L14 3.5Z" fill={color} opacity="0.22" />
          <path d="M14 3.5 24 8.7 14 13.9 4 8.7l10-5.2Z" fill={color} />
          <path d="M4 8.7v10.6l10 5.2v-10.6L4 8.7Z" fill={color} opacity="0.65" />
          <path d="M14 13.9v10.6l10-5.2V8.7L14 13.9Z" fill={color} opacity="0.4" />
          <path d="M14 3.5 24 8.7 14 13.9 4 8.7l10-5.2Z" stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M12 6.2l-5 2.6 2 1 5-2.6-2-1Z" fill="#fff" opacity="0.85" />
        </svg>
      );
  }
}

// Glass-tile card: near-white base, thin gray border — 1px by default,
// 1.5px at its thickest (top + right) for a subtle refracted-glass rim.
const GLASS_CARD_STYLE = {
  background: 'linear-gradient(135deg, #FFFFFF 0%, #FFFFFF 60%, #FAF8FE 100%)',
  borderStyle: 'solid',
  borderWidth: '1.5px 1.5px 1px 1px',
  borderColor: '#B9B9C2 #D1D5DB #DADBE1 #C6C6CE',
  boxShadow:
    'inset 0 1px 0 rgba(255,255,255,1), inset 1px 0 0 rgba(255,255,255,0.8), 0 1px 2px rgba(91,45,142,0.06)',
};

const SEVERITY_BORDER = {
  critical: 'border-accent',
  warning: 'border-amber',
  info: 'border-primary',
};

// Home announcement cards: two alternating muted tones (secondary / accent)
// that repeat down the strip. Maps to secondary-soft / accent-soft.
const ANNOUNCEMENT_CARD_BG = ['bg-secondary-soft', 'bg-accent-soft'];

// Short date for home cards, e.g. "Sep 25" / "Aug 31".
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

const TYPE_ICON = {
  power_outage: '⚡',
  water_outage: '💧',
  road_closure: '🚧',
  construction: '🚧',
  donation: '🎁',
  event: '📢',
  policy_change: '📜',
};

const QUICK_TOPICS = [
  { key: 'land', label: 'Land', query: 'land dispute' },
  { key: 'fees', label: 'Fees', query: 'LC1 stamp fee' },
  { key: 'safety', label: 'Safety', query: 'domestic violence' },
  { key: 'permits', label: 'Permits', query: 'business permit' },
  { key: 'education', label: 'Education', query: 'school enrollment' },
];

// Searchable sub-county dropdown: white panel, black text, scrollable
// list with minimal item padding. Custom-built so the option list stays
// compact (native selects render an unstyled full-height list).
function SubcountyDropdown({
  labelId,
  value,
  options,
  onChange,
  searchPlaceholder,
  searchLabel,
  noMatchLabel,
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setFilter('');
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setFilter('');
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const q = filter.trim().toLowerCase();
  const visible = q
    ? options.filter((o) => o.toLowerCase().includes(q))
    : options;

  return (
    <span ref={wrapRef} className="relative block mt-2 min-w-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={labelId}
        onClick={() => setOpen((o) => !o)}
        className="btn-ac w-full bg-white border border-gray-300 rounded-lg px-4 inline-flex items-center justify-between gap-2 focus:outline-none focus-visible:outline-none"
      >
        <span className="truncate" style={{ color: '#000' }}>
          {value || options[0] || ''}
        </span>
        <ChevronDownIcon size={14} />
      </button>
      {open && (
        <span className="absolute left-0 right-0 top-full mt-1 z-50 block bg-white border border-gray-300 rounded-xl shadow-lg overflow-hidden">
          <span className="block p-2">
            <label htmlFor="subcounty-search" className="sr-only">
              {searchLabel}
            </label>
            <input
              id="subcounty-search"
              type="search"
              value={filter}
              onInput={(e) => setFilter(e.target.value)}
              placeholder={searchPlaceholder}
              autoComplete="off"
              className="w-full bg-white border border-gray-300 rounded-lg px-3 focus:outline-none focus-visible:outline-none"
              style={{ minHeight: '44px', fontSize: '16px', color: '#000' }}
            />
          </span>
          <span
            role="listbox"
            aria-labelledby={labelId}
            className="block overflow-y-auto"
            style={{ maxHeight: '224px' }}
          >
            {visible.map((o) => {
              const selected = o === value;
              return (
                <button
                  key={o}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(o);
                    setOpen(false);
                    setFilter('');
                  }}
                  className={`flex items-center gap-2 w-full text-left px-4 py-1 focus:outline-none focus-visible:outline-none ${selected ? 'font-bold bg-primary-soft' : ''
                    }`}
                  style={{ fontSize: '16px', minHeight: '40px', color: '#000' }}
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
                  {o}
                </button>
              );
            })}
            {visible.length === 0 && (
              <span
                className="block px-4 py-1 text-ac-muted"
                style={{ fontSize: '14px' }}
              >
                {noMatchLabel}
              </span>
            )}
          </span>
        </span>
      )}
    </span>
  );
}

// Paper-plane send icon for the knowledge-base chat input.
function SendIcon({ size = 20 }) {
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
      <path d="M21 3 10.5 13.5" />
      <path d="M21 3 14 21l-3.5-7.5L3 10 21 3Z" />
    </svg>
  );
}

// Guided knowledge-base chat: the system offers numbered topics and the
// user picks one (tap or type the number) instead of free typing.
// Free text falls back to normal search via onSearch.
const KB_TOPICS = [
  { key: 'land', kb: 'land' },
  { key: 'permits', kb: 'fees_permits' },
  { key: 'safety', kb: 'safety' },
  { key: 'education', kb: 'education' },
];

function KnowledgeChat({ lang, S, district, onSearch }) {
  const menuOptions = KB_TOPICS.map((t, i) => ({ code: String(i + 1), topic: t.key }));
  const [messages, setMessages] = useState([{ from: 'sys', kind: 'menu' }]);
  const [options, setOptions] = useState(menuOptions);
  const [draft, setDraft] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ block: 'end' });
    }
  }, [messages]);

  const topicLabel = (key) => (S.kb_topics && S.kb_topics[key]) || key;
  const topicInfo = (key) => (S.kb_info && S.kb_info[key]) || '';
  const kbOf = (key) => (KB_TOPICS.find((t) => t.key === key) || {}).kb || key;

  const sendChoice = (raw) => {
    const text = String(raw || '').trim();
    if (!text) return;
    const opt = options.find((o) => o.code === text);
    if (!opt) {
      onSearch(text);
      return;
    }
    setMessages((m) => [...m, { from: 'user', kind: 'text', text }]);
    if (opt.back) {
      setMessages((m) => [...m, { from: 'sys', kind: 'menu' }]);
      setOptions(menuOptions);
      return;
    }
    setMessages((m) => [...m, { from: 'sys', kind: 'topic', topic: opt.topic }]);
    setOptions([{ code: '0', back: true }]);
  };

  const submit = (e) => {
    if (e) e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    const opt = options.find((o) => o.code === text);
    if (opt) {
      sendChoice(text);
      return;
    }
    if (/^[0-9]+$/.test(text)) {
      setMessages((m) => [
        ...m,
        { from: 'user', kind: 'text', text },
        { from: 'sys', kind: 'unknown' },
      ]);
      return;
    }
    setMessages((m) => [...m, { from: 'user', kind: 'text', text }]);
    onSearch(text);
  };

  return (
    <div className="mt-2 min-w-0">
      <div
        aria-live="polite"
        className="flex flex-col gap-2 overflow-y-auto"
        style={{ maxHeight: '52vh' }}
      >
        {messages.map((m, i) => {
          if (m.from === 'user') {
            return (
              <div key={i} className="flex justify-end">
                <div
                  className="bg-primary text-white rounded-2xl rounded-br-sm px-4 py-2 max-w-[85%] break-words"
                  style={{ fontSize: '16px' }}
                >
                  {m.text}
                </div>
              </div>
            );
          }
          return (
            <div key={i} className="flex justify-start">
              <div
                className="bg-primary-soft text-ink rounded-2xl rounded-bl-sm px-4 py-2 max-w-[90%] min-w-0 break-words"
                style={{ fontSize: '16px' }}
              >
                {m.kind === 'menu' && <span>{S.kb_chat_hello}</span>}
                {m.kind === 'unknown' && <span>{S.kb_chat_unknown}</span>}
                {m.kind === 'topic' && (
                  <span>
                    <span className="block font-bold">
                      {S.kb_chat_found.replace('{topic}', topicLabel(m.topic))}
                    </span>
                    <span className="block mt-1">{topicInfo(m.topic)}</span>
                    <Link
                      href={`/result?cat=${kbOf(m.topic)}&lang=${lang}&district=${district}`}
                      className="mt-2 inline-flex items-center gap-1 text-primary font-bold underline"
                      style={{ fontSize: '15px' }}
                    >
                      {S.kb_chat_view} →
                    </Link>
                  </span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} aria-hidden="true" />
      </div>
      {options.length > 0 && (
        <div className="mt-1 flex flex-col gap-2 max-w-[90%]" role="group" aria-label={S.kb_chat_hello}>
          {options.map((o) => (
            <button
              key={o.code}
              type="button"
              onClick={() => sendChoice(o.code)}
              className="bg-white border border-primary text-primary rounded-full px-4 w-full"
              style={{ minHeight: '44px', fontSize: '14px' }}
            >
              {o.code}. {o.back ? S.kb_chat_back : topicLabel(o.topic)}
            </button>
          ))}
        </div>
      )}
      <form
        onSubmit={submit}
        className="fixed left-0 right-0 z-30 bg-white border-t border-gray-200"
        style={{ bottom: 'calc(64px + env(safe-area-inset-bottom, 0px) + 8px)' }}
      >
        <div className="max-w-md mx-auto px-4 pt-2 flex gap-2 min-w-0">
          <label htmlFor="kb-input" className="sr-only">
            {S.search_kb_placeholder}
          </label>
          <input
            id="kb-input"
            type="text"
            value={draft}
            onInput={(e) => setDraft(e.target.value)}
            placeholder={S.search_kb_placeholder}
            autoComplete="off"
            className="btn-ac flex-1 min-w-0 bg-white border border-gray-300 rounded-lg px-4"
          />
          <button
            type="submit"
            aria-label={S.search_submit}
            className="btn-ac bg-primary text-white rounded-lg shrink-0 px-4 inline-flex items-center justify-center"
          >
            <SendIcon size={20} />
          </button>
        </div>
      </form>
    </div>
  );
}

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
  const [deleteOpen, setDeleteOpen] = useState(false);
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
      if (isKnownDistrict(d)) setDistrict(d);
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

  // Screen-reader narration follows the highlight. Non-English
  // languages have no bundled voice yet, so the fallback line is
  // announced in English instead of staying silent.
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
    if (lang === 'en') {
      speak(labelOf(current.id), lang, getAudioFile(walk, categories, lang));
    } else {
      speak(S.voice_unavailable, 'en', null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessible, walk.currentIndex, walk.finished, lang]);

  const toggleAccessibility = () => {
    const next = !accessible;
    if (next) {
      // Fresh start on every entry: no redundant finished state, and the
      // first card is announced again.
      announcedRef.current = '';
      setWalk(advanceWalkthrough(createWalkthroughState(), categories));
    } else {
      try {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      } catch {
        // Audio unavailable — exiting anyway.
      }
    }
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

  const confirmDeleteData = () => setDeleteOpen(true);
  const cancelDeleteData = () => {
    setDeleteOpen(false);
    router.push(`/home?lang=${lang}`);
  };
  const doDeleteData = () => {
    try {
      localStorage.clear();
    } catch {
      // Storage unavailable — navigation still resets in-memory state.
    }
    setDeleteOpen(false);
    window.location.href = `/home?lang=${lang}`;
  };

  // Next wraps past the last category back to the first — there is no
  // dead-end screen.
  const answerNo = () =>
    setWalk((s) => {
      if (!s || !s.started || s.finished) return s;
      const total = categories.length;
      const next = s.currentIndex >= total - 1 ? 0 : s.currentIndex + 1;
      return { ...s, currentIndex: next };
    });
  const answerPrev = () =>
    setWalk((s) => {
      if (!s || !s.started || s.finished) return s;
      const total = categories.length;
      const prev = s.currentIndex <= 0 ? total - 1 : s.currentIndex - 1;
      return { ...s, currentIndex: prev };
    });
  // Yes routes straight to the topic page — no intermediate step.
  const answerYes = () => {
    const chosen = categories[walk.currentIndex];
    if (!chosen) return;
    try {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    } catch {
      // Audio unavailable — navigating anyway.
    }
    router.push(`/home?cat=${chosen.id}&lang=${lang}`);
  };

  // Leaving accessibility mode: stop any speech and persist the pref.
  const stopListening = () => {
    try {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    } catch {
      // Audio unavailable — exiting anyway.
    }
    announcedRef.current = '';
    setAccessible(false);
    try {
      localStorage.setItem('ac_accessibility', 'false');
    } catch {
      // Ignore storage errors.
    }
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
  // Know-Your-LC shows the area's local council representatives once a
  // sub-county is chosen (district-wide holders + sub-county postings).
  const localReps =
    catEntry && catEntry.id === 'know_your_lc'
      ? getLocalReps(repsData, district, subcounty)
      : [];
  if (catEntry) {
    if (catEntry.id === 'knowledge_base') {
      return (
        <main className="min-h-screen bg-white p-4 pb-24">
          <div className="max-w-md mx-auto min-w-0">
            <PageHeader
              backHref={`/home?lang=${lang}`}
              backLabel={S.back}
              title={labelOf(catEntry.id)}
            />
            <div className="mt-2 flex justify-center" aria-hidden="true">
              <CategoryIcon id={catEntry.id} size={72} />
            </div>
            <KnowledgeChat
              lang={lang}
              S={S}
              district={district}
              onSearch={(text) => goResult(text, '')}
            />
          </div>
          <BottomNav active={router.pathname} lang={lang} strings={S} />
        </main>
      );
    }
    return (
      <main className="min-h-screen bg-white p-4 pb-24">
        <div className="max-w-md mx-auto min-w-0">
          <PageHeader
            backHref={`/home?lang=${lang}`}
            backLabel={S.back}
            title={labelOf(catEntry.id)}
          />
          <div className="mt-2 flex justify-center" aria-hidden="true">
            <CategoryIcon id={catEntry.id} size={72} />
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              goResult(labelOf(catEntry.id), subcounty.trim());
            }}
            className="mt-4"
          >
            <label id="subcounty-label" htmlFor="subcounty-search" className="block font-bold">
              {S.subcounty_prompt}
            </label>
            <SubcountyDropdown
              labelId="subcounty-label"
              value={subcounty}
              options={subcountyOptions}
              onChange={setSubcounty}
              searchPlaceholder={S.subcounty_search}
              searchLabel={S.subcounty_search}
              noMatchLabel={S.admin_no_match}
            />
            {catEntry.id !== 'know_your_lc' && (
              <button
                type="submit"
                className="btn-ac mt-3 w-full bg-primary text-white rounded-lg"
              >
                {S.yes} →
              </button>
            )}
          </form>
          {catEntry.id === 'know_your_lc' && (
            <section aria-label={labelOf(catEntry.id)} className="mt-4 min-w-0">
              <div className="flex flex-col gap-2" aria-live="polite">
                {localReps.length === 0 && (
                  <p className="bg-white rounded-lg p-4 text-center text-ac-muted">
                    {S.rep_no_reps.replace('{location}', subcounty || district)}
                  </p>
                )}
                {localReps.map((rep) => (
                  <RepCard key={rep.id} rep={rep} lang={lang} S={S} />
                ))}
              </div>
              <p
                className="mt-2 text-center text-ac-muted"
                style={{ fontSize: '14px' }}
              >
                {S.rep_rate_later}
              </p>
            </section>
          )}
        </div>
        <BottomNav active={router.pathname} lang={lang} strings={S} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white p-4 pb-24">
      <div className="max-w-md mx-auto">
        {/* HEADER — darker than the page, no unnecessary borders */}
        <header className="bg-primary-soft -mx-4 -mt-4 px-4 pt-4 pb-3">
          <div className="flex items-start justify-between gap-2 mb-6">
            <Link
              href="/"
              aria-label={S.app_name}
              className="flex items-center gap-1 min-w-0 flex-1 mt-2"
            >
              <ShieldLogo />
              <span className="relative min-w-0 w-fit max-w-full">
                <span
                  className="block text-ink font-bold"
                  style={{ fontSize: '20px', lineHeight: '1.2', letterSpacing: '-0.5px' }}
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
            </Link>
            <div className="flex items-center shrink-0">
              <div className="flex justify-end items-center gap-2.5 shrink-0">
                <span className="inline-flex items-center gap-0.5">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={accessible}
                    aria-label={S.accessibility_mode}
                    title={S.accessibility_mode}
                    onClick={toggleAccessibility}
                    className={`relative rounded-full outline-2 focus:outline-none focus-visible:outline-none border border-line ${accessible
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
                      <SpeakerIcon size={20} />
                    </span>
                  </button>
                  <span
                    className="text-primary font-semibold"
                    style={{ fontSize: '15px' }}
                  >
                    {S.voice}
                  </span>

                </span>
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
                    <span aria-hidden="true" style={{ fontSize: '20px' }}>
                      🌐
                    </span>
                    <span style={{ paddingLeft: '4px', paddingRight: '4px' }}>
                      {lang.toUpperCase()}
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
                </span>
              </div>
            </div>
          </div>

          {/* DISTRICT CAROUSEL — shared component, same on every page. */}
          <DistrictCarousel
            district={district}
            onPick={pickDistrict}
            lang={lang}
            UI={UI}
          />
        </header>

        {/* ANNOUNCEMENTS STRIP — white page, muted alternating cards */}
        {announcements.length > 0 && (
          <section aria-label={S.announcements} className="mt-2">
            <div className="flex items-center justify-between mb-2">
              <h2
                className="font-bold text-ink"
                style={{ fontSize: '24px', lineHeight: '1.25' }}
              >
                {S.announcements}
              </h2>
              <Link
                href={`/announcements?lang=${lang}`}
                aria-label={`See all ${S.announcements}`}
                className="inline-flex items-center gap-1 text-primary font-semibold shrink-0"
                style={{ fontSize: '15px', minHeight: '48px' }}
              >
                See all <ArrowRightIcon size={14} />
              </Link>
            </div>
            <div
              aria-live="polite"
              className="no-scrollbar flex gap-3 overflow-x-auto pb-2"
            >
              {announcements.slice(0, 3).map((a, i) => (
                <Link
                  key={a.id}
                  href={`/announcements?lang=${lang}`}
                  aria-label={a.title[lang] || a.title.en}
                  className={`shrink-0 w-64 rounded-xl p-4 text-left ${ANNOUNCEMENT_CARD_BG[i % ANNOUNCEMENT_CARD_BG.length]
                    }`}
                >
                  <div
                    className="font-medium text-ac-muted"
                    style={{ fontSize: '14px' }}
                  >
                    {formatShortDate(a.start, lang)}
                  </div>
                  <div
                    className="mt-1 font-bold text-ink leading-snug"
                    style={{ fontSize: '16px' }}
                  >
                    {a.title[lang] || a.title.en}
                  </div>
                  <div
                    className="mt-1 text-ac-muted leading-snug line-clamp-2"
                    style={{
                      fontSize: '14px',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {a.description[lang] || a.description.en}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CATEGORIES: screen-reader vertical list.
            The active card keeps its coloured icon on a light tint, and
            its options sit right underneath it so no scrolling is needed. */}
        {accessible ? (
          <section aria-label={labelOf('knowledge_base')} className="mt-4">
            <div className="flex flex-col gap-2" aria-live="polite">
              {categories.map((c, i) => {
                const active = i === walk.currentIndex;
                return (
                  <div key={c.id}>
                    <div
                      aria-current={active ? 'true' : undefined}
                      className={`rounded-lg p-6 ${active
                        ? 'bg-primary-soft text-ink font-bold border-2 border-primary'
                        : 'bg-white text-ac-muted opacity-[0.15]'
                        }`}
                      style={{ fontSize: active ? '24px' : '16px' }}
                    >
                      <span className="inline-flex items-center gap-2">
                        <CategoryIcon id={c.id} /> {labelOf(c.id)}
                      </span>
                    </div>
                    {active && (
                      <div className="mt-2 bg-white rounded-xl shadow-lg border border-line p-3 flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={answerYes}
                          className="btn-ac w-full bg-primary text-white rounded-lg"
                          style={{ height: '64px' }}
                        >
                          {S.yes_continue}
                        </button>
                        <button
                          type="button"
                          onClick={answerNo}
                          className="btn-ac w-full bg-white text-primary border-2 border-primary rounded-lg"
                          style={{ height: '64px' }}
                        >
                          {S.next_category}
                        </button>
                        <button
                          type="button"
                          onClick={answerPrev}
                          className="btn-ac w-full bg-white text-primary border-2 border-primary rounded-lg"
                          style={{ height: '64px' }}
                        >
                          {S.previous_category}
                        </button>
                        <button
                          type="button"
                          onClick={stopListening}
                          aria-label={S.stop_listening}
                          className="btn-ac w-full inline-flex gap-2 bg-white text-accent border-2 border-accent rounded-lg"
                          style={{ height: '64px' }}
                        >
                          <StopIcon size={18} /> {S.stop_listening}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ) : (

          /* CATEGORIES: responsive grid — 3 per row on wide screens, 2 per row
             on narrow, 1 per row at 300px and under so words aren't squashed */
          <section aria-label={labelOf('knowledge_base')} className="mt-4 min-w-0">
            <div className="grid grid-cols-1 min-[319px]:grid-cols-2 min-[429px]:grid-cols-3 gap-2.5">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/home?cat=${c.id}&lang=${lang}`}
                  aria-label={labelOf(c.id)}
                  className="rounded-xl p-3 min-h-[132px] min-w-0 w-full flex flex-col items-center justify-center gap-2 text-center"
                  style={GLASS_CARD_STYLE}
                >
                  <span aria-hidden="true" className="flex items-center justify-center">
                    <CategoryIcon id={c.id} size={64} />
                  </span>
                  <span
                    className="font-semibold text-ink leading-snug break-words text-center w-full min-w-0"
                    style={{ fontSize: '14px', letterSpacing: '-0.5px', lineHeight: '1.25' }}
                  >
                    {labelOf(c.id)}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
        {/* QUICK KNOWLEDGE — shortcuts below the topics */}
        <section aria-label={S.quick_knowledge} className="mt-8 mb-6 min-w-0">
          <h2
            className="font-bold text-ink"
            style={{ fontSize: '20px', lineHeight: '1.3' }}
          >
            {S.quick_knowledge}
          </h2>
          <div className="mt-4 grid grid-cols-2 min-[400px]:grid-cols-3 gap-2">
            {QUICK_TOPICS.map((p) => (
              <button
                key={p.key}
                type="button"
                aria-label={p.label}
                onClick={() => {
                  setQuery(p.query);
                  goResult(p.query, '');
                }}
                className="bg-white border border-primary text-primary rounded-lg inline-flex items-center justify-center gap-1.5 min-w-0 px-2"
                style={{ minHeight: '48px', fontSize: '14px' }}
              >
                <QuickTopicIcon kind={p.key} size={20} />
                <span className="truncate">{p.label}</span>
              </button>
            ))}
          </div>
        </section>

        <button
          type="button"
          onClick={confirmDeleteData}
          className="btn-ac mt-12 w-full bg-accent text-white rounded-lg"
        >
          {S.delete_data}
        </button>
      </div>

      <ConfirmModal
        open={deleteOpen}
        title={S.delete_data_title}
        description={S.delete_data_desc}
        yesLabel={S.delete_data_yes}
        cancelLabel={S.delete_data_cancel}
        onYes={doDeleteData}
        onCancel={cancelDeleteData}
      />

      {/* BOTTOM NAV */}
      <BottomNav active={router.pathname} lang={lang} strings={S} />
    </main>
  );
}
