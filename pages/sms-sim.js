import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { detectSmsLanguage } from '../lib/sms-detect';

// In-app twin of public/sms-sim/index.html: same detection (shared lib map
// sourced from data/sms-phrases.json), same replies, same 1.5s beat.
// Difference: the link uses this device's own origin, so it needs no IP
// editing before the demo. The standalone file keeps an inline copy of the
// map because it must also work opened straight from disk (file://).
const TOLL_FREE = '0800-ALERT';

function replies(base) {
  return {
    en: `Hello! Welcome to AlertCitizen.\n\nTap this link to get started:\n${base}/home?lang=en\n\nNo data? Call toll-free: ${TOLL_FREE}\n\nWe are here to help you with:\n- Public services\n- Local council info\n- Fees and permits\n- Land disputes\n- Safety and protection\n\nInformation you can trust.\n\nText back the word ALERT to receive citizen alerts via SMS.`,
    lg: `Teegeka! Wakulinda mu AlertCitizen.\n\nKolaaki ku linkino eyo okutandika:\n${base}/home?lang=lg\n\nOsi na data? Sooka: ${TOLL_FREE}\n\nTukuyambako ku:\n- Emirimu gy'abantu bonna\n- Omukulembeze wo mu kibuga\n- Omutindo n'ebitegeeza\n- Emisaasaana y'ensi\n- Obulamu n'obukuumi\n\nEbikwata by'okusobola okwetegeka.\n\nWeereza ekigambo ALERT ofune obubaka bw'obunnansi ku SMS.`,
    sw: `Karibu! Karibu kwenye AlertCitizen.\n\nBonyeza hii link ili uanze:\n${base}/home?lang=sw\n\nHuna data? Piga bure: ${TOLL_FREE}\n\nTutakusaidia na:\n- Huduma za umma\n- Taarifa za mamliko\n- Ada na vyeti\n- Migogoro ya nchi\n- Usalama na ulinzi\n\nTaarifa unaweza kuamini.\n\nTuma neno ALERT kupokea arifa za uraia kwa SMS.`,
  };
}

function stamp() {
  try {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function renderRich(text) {
  // Split on URLs and render plain text nodes — React escapes them, so
  // ampersands and brackets display exactly as typed (no double-escaping).
  // Links only ever come from our own reply templates.
  const parts = String(text).split(/(https?:\/\/[^\s]+)/g);
  return parts.map((p, i) =>
    /^https?:\/\//.test(p) ? (
      <a key={i} href={p} className="underline break-all" style={{ color: '#5B2D8E' }}>
        {p}
      </a>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

function ChevronLeftIcon({ size = 20 }) {
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
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 5 8 12l6.5 7" />
    </svg>
  );
}

function ResetIcon({ size = 18 }) {
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
      <path d="M4 12a8 8 0 0 1 14-5.3" />
      <path d="M18 3v4h-4" />
    </svg>
  );
}

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

export default function SmsSim() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [base, setBase] = useState('');
  const areaRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    try {
      setBase(window.location.origin);
    } catch {
      // SSR — origin fills in on mount.
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    const el = areaRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((m) => [...m, { text, user: true, at: stamp() }]);
    setDraft('');
    timerRef.current = setTimeout(() => {
      const lang = detectSmsLanguage(text);
      const origin =
        base ||
        (typeof window !== 'undefined'
          ? window.location.origin
          : 'http://YOUR-LAPTOP-IP:3000');
      const map = replies(origin);
      setMessages((m) => [...m, { text: map[lang] || map.en, user: false, at: stamp() }]);
    }, 1500);
  };

  return (
    <main
      className="min-h-screen bg-white flex flex-col"
      style={{ fontFamily: "'Public Sans', system-ui, sans-serif" }}
    >
      <style>{`
        .sim-user{align-self:flex-end;background:#0E7A55;color:#fff;border-radius:12px 12px 2px 12px;padding:10px 14px;max-width:80%;font-size:15px;line-height:1.4;overflow-wrap:break-word}
        .sim-sys{align-self:flex-start;background:#fff;color:#201C2B;border-radius:12px 12px 12px 2px;padding:10px 14px;max-width:85%;font-size:15px;line-height:1.4;overflow-wrap:break-word;box-shadow:0 1px 2px rgba(32,28,43,0.12)}
      `}</style>
      <div className="mx-auto w-full max-w-md flex flex-col h-screen min-w-0">
        <header className="bg-white border-b border-line px-4 py-2 flex items-center gap-3 shrink-0">
          <Link
            href="/"
            aria-label="Back to AlertCitizen"
            className="inline-flex items-center justify-center text-primary shrink-0"
            style={{ width: '44px', height: '44px' }}
          >
            <ChevronLeftIcon size={20} />
          </Link>
          <span
            aria-hidden="true"
            className="inline-flex items-center justify-center rounded-full bg-primary text-white font-bold shrink-0"
            style={{ width: '40px', height: '40px', fontSize: '15px' }}
          >
            AC
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-bold text-ink truncate" style={{ fontSize: '16px' }}>
              AlertCitizen
            </span>
            <span className="block text-ac-muted" style={{ fontSize: '13px' }}>
              SMS simulator
            </span>
          </span>
          <button
            type="button"
            onClick={() => setMessages([])}
            aria-label="Reset conversation"
            title="Reset conversation"
            className="inline-flex items-center justify-center text-ac-muted shrink-0"
            style={{ width: '44px', height: '44px' }}
          >
            <ResetIcon size={18} />
          </button>
        </header>
        <div
          ref={areaRef}
          aria-live="polite"
          className="flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col gap-2"
          style={{ background: '#F5F1FA' }}
        >
          {messages.length === 0 && (
            <p className="text-center text-ac-muted" style={{ fontSize: '14px' }}>
              Text I NEED HELP to begin.
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.user ? 'sim-user' : 'sim-sys'}>
              {m.user ? (
                m.text
              ) : (
                <>
                  {m.text.split('\n').map((line, j, arr) => (
                    <span key={j}>
                      {renderRich(line)}
                      {j < arr.length - 1 && <br />}
                    </span>
                  ))}
                </>
              )}
              <div style={{ fontSize: 10, color: '#8b9096', marginTop: 4, textAlign: 'right' }}>
                {m.at}
              </div>
            </div>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="bg-white border-t border-line px-4 py-2 flex gap-2 items-center shrink-0"
        >
          <label htmlFor="sim-input" className="sr-only">
            Type your message
          </label>
          <input
            id="sim-input"
            type="text"
            value={draft}
            onInput={(e) => setDraft(e.target.value)}
            placeholder="Type your message..."
            autoComplete="off"
            className="btn-ac flex-1 min-w-0 bg-white border border-gray-300 rounded-full px-4"
          />
          <button
            type="submit"
            aria-label="Send"
            className="btn-ac rounded-full bg-primary text-white shrink-0 inline-flex items-center justify-center px-0"
            style={{ width: '48px' }}
          >
            <SendIcon size={20} />
          </button>
        </form>
        <p className="bg-white text-center text-ac-muted shrink-0" style={{ fontSize: '11px', padding: '0 16px 8px' }}>
          Simulator. No real SMS is sent.
        </p>
      </div>
    </main>
  );
}
