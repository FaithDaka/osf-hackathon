import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { setLang } from '../lib/i18n';
import { encodeQr, qrToSvg } from '../lib/qr';
import en from '../public/i18n/en.json';

// PWA entry screen. Works offline (all strings + QR bundled).
// ?lang=xx skips selection and goes straight to /home?lang=xx.
const PWA_URL = process.env.NEXT_PUBLIC_PWA_URL || 'https://alertcitizen.github.io';
const TOLL_FREE = '0800-225-8424';

function ShieldLogo() {
  return (
    <svg width="56" height="56" viewBox="0 0 512 512" role="img" aria-label="AlertCitizen logo">
      <rect width="512" height="512" rx="96" fill="#1B5E20" />
      <path
        d="M256 72 L408 136 V264 C408 356 336 420 256 448 C176 420 104 356 104 264 V136 Z"
        fill="none"
        stroke="#FAFAFA"
        strokeWidth="28"
        strokeLinejoin="round"
      />
      <path
        d="M186 262 L238 314 L330 210"
        fill="none"
        stroke="#FAFAFA"
        strokeWidth="34"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'lg', label: 'Luganda' },
  { code: 'sw', label: 'Swahili' },
];

export default function Entry() {
  const router = useRouter();
  const [accessible, setAccessible] = useState(false);

  // ?lang= present → skip selection, straight to home.
  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query.lang;
    if (['en', 'lg', 'sw'].includes(q)) {
      setLang(q);
      router.replace(`/home?lang=${q}`);
    }
  }, [router, router.isReady, router.query]);

  // Restore accessibility toggle.
  useEffect(() => {
    try {
      setAccessible(localStorage.getItem('ac_accessibility') === 'true');
    } catch {
      // Storage unavailable — default off.
    }
  }, []);

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
    <main className="min-h-screen bg-ac-bg p-4">
      <div className="max-w-md mx-auto flex flex-col items-center text-center">
        <ShieldLogo />
        <h1 className="mt-2 text-2xl font-bold" style={{ fontSize: '24px' }}>
          {en.app_name}
        </h1>
        <p className="text-ac-muted" style={{ fontSize: '16px' }}>
          {en.tagline}
        </p>

        <h2 className="mt-6 mb-2 text-lg font-bold">{en.select_language}</h2>
        <div className="w-full flex flex-col gap-3">
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              aria-label={`Select ${l.label}`}
              onClick={() => choose(l.code)}
              className="btn-ac w-full bg-white text-ac-green border-2 border-ac-green rounded-lg shadow-sm"
              style={{ height: '64px', fontSize: '20px' }}
            >
              {l.label}
            </button>
          ))}
        </div>

        <hr className="w-full my-6 border-gray-300" />
        <p className="text-base">{en.or_text}</p>

        {qrSvg && (
          <div className="mt-6 flex flex-col items-center">
            <div
              className="bg-white p-2 rounded-lg shadow-sm"
              // QR pixels are decorative; URL is announced below.
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <p className="mt-1 text-ac-muted" style={{ fontSize: '16px' }}>
              Scan to open
            </p>
            <p className="text-ac-muted break-all" style={{ fontSize: '14px' }}>
              {PWA_URL}
            </p>
          </div>
        )}

        <a
          href={`tel:${TOLL_FREE.replace(/-/g, '')}`}
          className="mt-6 text-ac-blue"
          style={{ fontSize: '16px' }}
        >
          {en.toll_free}
        </a>

        <div className="w-full mt-6 bg-white rounded-lg shadow-sm p-4 text-left">
          <label className="flex items-center justify-between gap-4 min-h-[48px]">
            <span>
              <span className="block font-bold">{en.accessibility_mode}</span>
              <span className="block text-ac-muted" style={{ fontSize: '16px' }}>
                {en.accessibility_desc}
              </span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={accessible}
              aria-label={en.accessibility_mode}
              onClick={toggleAccessibility}
              className={`relative rounded-full border-2 border-ac-green shrink-0 ${
                accessible ? 'bg-ac-green' : 'bg-white'
              }`}
              style={{ width: '64px', height: '48px' }}
            >
              <span
                className={`absolute top-1 rounded-full bg-white border border-ac-green ${
                  accessible ? 'right-1' : 'left-1'
                }`}
                style={{ width: '36px', height: '36px' }}
              />
            </button>
          </label>
        </div>
      </div>
    </main>
  );
}
