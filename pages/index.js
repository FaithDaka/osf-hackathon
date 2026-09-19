import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { setLang } from '../lib/i18n';
import { encodeQr, qrToSvg } from '../lib/qr';
import en from '../public/i18n/en.json';
import lg from '../public/i18n/lg.json';
import sw from '../public/i18n/sw.json';

// PWA entry screen. Works offline (all strings + QR bundled).
// ?lang=xx skips selection and goes straight to /home?lang=xx.
const PWA_URL = process.env.NEXT_PUBLIC_PWA_URL || 'https://alertcitizen.github.io';
  const TOLL_FREE = '0800-ALERT';

function ShieldLogo() {
  return (
    <svg width="40" height="40" viewBox="0 0 512 512" role="img" aria-label="AlertCitizen logo">
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

// Speaking-user icon: person silhouette + speech sound waves,
// signalling this card is a speech / audio select.
function SpeakingUserIcon() {
  return (
    <svg
      width="40"
      height="40"
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
      <path
        d="M41 8c6.5 5.8 6.5 14.2 0 20"
        fill="none"
        stroke="#5B2D8E"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'lg', label: 'Luganda' },
  { code: 'sw', label: 'Swahili' },
];

// Synced flash rotation: one index drives every flashing string so
// "flash to Luganda" happens at the same time in the heading and in
// the accessibility card.
const FLASH_TABLES = [en, lg, sw];

export default function Entry() {
  const router = useRouter();
  const [accessible, setAccessible] = useState(false);
  // null = nothing saved yet → no button filled. Only a stored choice highlights.
  const [activeLang, setActiveLang] = useState(null);
  const [flashIdx, setFlashIdx] = useState(0);

  // ?lang= present → skip selection, straight to home.
  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query.lang;
    if (['en', 'lg', 'sw'].includes(q)) {
      setLang(q);
      router.replace(`/home?lang=${q}`);
    }
  }, [router, router.isReady, router.query]);

  // Restore accessibility toggle + saved language (highlight only if saved).
  useEffect(() => {
    try {
      setAccessible(localStorage.getItem('ac_accessibility') === 'true');
    } catch {
      // Storage unavailable — default off.
    }
    try {
      const stored = localStorage.getItem('ac_lang');
      if (['en', 'lg', 'sw'].includes(stored)) {
        setActiveLang(stored);
      }
    } catch {
      // No saved value — leave all buttons unfilled.
    }
  }, []);

  // Rotate flashing translations every 5 seconds, in sync.
  useEffect(() => {
    const id = setInterval(() => {
      setFlashIdx((i) => (i + 1) % FLASH_TABLES.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const flash = FLASH_TABLES[flashIdx] || en;

  const qrSvg = useMemo(() => {
    try {
      const { modules } = encodeQr(PWA_URL);
      return qrToSvg(modules, { scale: 5, margin: 2 });
    } catch {
      return null; // URL too long / non-Latin — hide QR, keep screen usable.
    }
  }, []);

  const choose = (code) => {
    setLang(code);
    setActiveLang(code);
    router.push(`/home?lang=${code}`);
  };

  const toggleAccessibility = () => {
    const next = !accessible;
    setAccessible(next);
    try {
      localStorage.setItem('ac_accessibility', next ? 'true' : 'false');
    } catch {
      // Ignore storage errors.
    }
  };

  return (
    <main className="min-h-screen ac-pattern p-3 min-[360px]:p-4 mt-14">
      <div className="w-full max-w-md mx-auto flex flex-col items-center text-center min-w-0">
        <div className="flex flex-row items-center gap-2 ">
          <ShieldLogo />
          <h1 className="mt-2 text-2xl font-bold break-words" style={{ fontSize: '28px' }}>
            {en.app_name}
          </h1>
        </div>

        <h2
          key={`select-${flashIdx}`}
          className="mt-12 mb-2 font-extrabold ac-fade break-words px-2 min-h-[78px] flex items-center justify-center"
          style={{ fontSize: '32px', lineHeight: '1.3' }}
          aria-live="polite"
        >
          {flash.select_language}
        </h2>
        <div className="w-full max-w-full flex flex-col gap-3 min-w-0">
          {LANGS.map((l) => {
            const isActive = activeLang === l.code;
            return (
              <button
                key={l.code}
                type="button"
                aria-label={`Select ${l.label}`}
                aria-pressed={isActive}
                onClick={() => choose(l.code)}
                className={`btn-ac w-full max-w-full rounded-lg border-2 break-words ${
                  isActive
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-primary border-primary'
                }`}
                style={{
                  height: '64px',
                  fontSize: '20px',
                  boxShadow: isActive
                    ? '0 4px 12px rgba(27, 94, 32, 0.35)'
                    : '0 1px 3px rgba(0, 0, 0, 0.08)',
                }}
              >
                {l.label}
              </button>
            );
          })}
        </div>
        {/* Accessibility card FIRST, with speaking-user icon to signal speech select.
            Icon + (text + toggle) wrap: on narrow screens the icon sits on top,
            centered; text and toggle stay joined. Text column has a fixed
            min-height so rotating translations never resize the card. */}
        <div className="w-full max-w-full mt-6 bg-white rounded-lg shadow-sm p-3 min-[360px]:p-4 text-left min-w-0">
          <label className="flex flex-wrap items-center justify-center gap-3 min-h-[48px] min-w-0">
            <SpeakingUserIcon />
            <span className="flex items-center justify-center gap-3 min-[360px]:gap-4 min-w-0 flex-1 basis-56">
              <span className="min-w-0 flex-1 min-h-[192px] min-[480px]:min-h-[88px] flex flex-col justify-center text-left">
                <span
                  key={`mode-${flashIdx}`}
                  className="block font-bold ac-fade break-words"
                  style={{ fontSize: '18px', lineHeight: '1.2' }}
                  aria-live="polite"
                >
                  {flash.accessibility_mode}
                </span>
                <span
                  key={`desc-${flashIdx}`}
                  className="block text-ac-muted ac-fade break-words"
                  style={{ fontSize: '16px' }}
                  aria-live="polite"
                >
                  {flash.accessibility_desc}
                </span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={accessible}
                aria-label={en.accessibility_mode}
                onClick={toggleAccessibility}
                className={`relative rounded-full border-2 border-ac-muted shrink-0 ${accessible ? 'bg-secondary border-white' : 'bg-white'
                  }`}
                style={{ width: '64px', height: '48px' }}
              >
                <span
                  className={`absolute top-1 rounded-full bg-white border border-ac-muted ${accessible ? 'right-1 border-secondary' : 'left-1'
                    }`}
                  style={{ width: '36px', height: '36px' }}
                />
              </button>
            </span>
          </label>
        </div>

        <hr className="w-full my-6 border-gray-300" />
        {/* <p className="text-base break-words">{en.or_text}</p> */}
        <a
          href={`tel:${TOLL_FREE.replace(/-/g, '')}`}
          className="text-primary break-words text-primary"
          style={{ fontSize: '16px' }}
        >
          {en.toll_free}
        </a>
        <Link
          href="/sms-sim"
          className="mt-3 break-words underline"
          style={{ fontSize: '13px', color: '#8b9096' }}
        >
          {en.sms_sim_link || 'Try the SMS simulator'}
        </Link>
      </div>
    </main>
  );
}
