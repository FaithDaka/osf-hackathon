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
    en: `Hello! Welcome to AlertCitizen.\n\nTap this link to get started:\n${base}?lang=en\n\nNo data? Call toll-free: ${TOLL_FREE}\n\nWe are here to help you with:\n- Public services\n- Local council info\n- Fees & permits\n- Land disputes\n- Safety & protection\n\nInformation you can trust.`,
    lg: `Teegeka! Wakulinda mu AlertCitizen.\n\nKolaaki ku linkino eyo okutandika:\n${base}?lang=lg\n\nOsi na data? Sooka: ${TOLL_FREE}\n\nTukuyambako ku:\n- Emirimu gy'abantu bonna\n- Omukulembeze wo mu kibuga\n- Omutindo n'ebitegeeza\n- Emisaasaana y'ensi\n- Obulamu n'obukuumi\n\nEbikwata by'okusobola okwetegeka.`,
    sw: `Karibu! Karibu kwenye AlertCitizen.\n\nBonyeza hii link ili uanze:\n${base}?lang=sw\n\nHuna data? Piga bure: ${TOLL_FREE}\n\nTutakusaidia na:\n- Huduma za umma\n- Taarifa za mamliko\n- Ada na vyeti\n- Migogoro ya nchi\n- Usalama na ulinzi\n\nTaarifa unaweza kuamini.`,
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
  // Escape, linkify, preserve line breaks. Links only ever come from our own
  // reply templates; user text is escaped first so echo is XSS-safe.
  const esc = String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const parts = esc.split(/(https?:\/\/[^\s<]+)/g);
  return parts.map((p, i) =>
    /^https?:\/\//.test(p) ? (
      <a key={i} href={p} className="underline" style={{ color: '#5B2D8E' }}>
        {p}
      </a>
    ) : (
      <span key={i}>{p}</span>
    ),
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
      style={{
        background: '#0f0f1a',
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: "'Public Sans', system-ui, sans-serif",
      }}
    >
      <style>{`
        .sim-user{align-self:flex-end;background:#0E7A55;color:#fff;border-radius:12px 12px 2px 12px;padding:10px 14px;max-width:80%;font-size:15px;line-height:1.4;overflow-wrap:break-word}
        .sim-sys{align-self:flex-start;background:#fff;color:#201C2B;border-radius:12px 12px 12px 2px;padding:10px 14px;max-width:80%;font-size:15px;line-height:1.4;overflow-wrap:break-word}
      `}</style>
      <div
        style={{
          background: '#1a1a2e',
          borderRadius: 24,
          width: '100%',
          maxWidth: 360,
          height: 640,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          position: 'relative',
        }}
      >
        <div
          style={{
            padding: '8px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 12,
            color: '#aaa',
            borderBottom: '1px solid #2a2a3e',
          }}
        >
          <span>MTN</span>
          <span>10:42 🔋</span>
        </div>
        <button
          type="button"
          onClick={() => setMessages([])}
          aria-label="Reset conversation"
          style={{
            position: 'absolute',
            top: 40,
            right: 16,
            fontSize: 10,
            color: '#666',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          RESET
        </button>
        <div
          ref={areaRef}
          aria-live="polite"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
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
              <div style={{ fontSize: 10, color: '#888', marginTop: 4, textAlign: 'right' }}>
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
          style={{
            padding: '12px 16px',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            borderTop: '1px solid #2a2a3e',
          }}
        >
          <label htmlFor="sim-input" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
            Type your message
          </label>
          <input
            id="sim-input"
            type="text"
            value={draft}
            onInput={(e) => setDraft(e.target.value)}
            placeholder="Type your message..."
            autoComplete="off"
            style={{
              flex: 1,
              height: 44,
              borderRadius: 20,
              border: '1px solid #444',
              background: '#2a2a3e',
              color: '#fff',
              padding: '0 16px',
              fontSize: 16,
              outline: 'none',
            }}
          />
          <button
            type="submit"
            aria-label="Send"
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: '#5B2D8E',
              border: 'none',
              color: '#fff',
              fontSize: 18,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 'none',
            }}
          >
            ➤
          </button>
        </form>
        <div style={{ textAlign: 'center', fontSize: 10, color: '#666', padding: '0 16px 10px' }}>
          Simulator. No real SMS is sent. <Link href="/">← AlertCitizen</Link>
        </div>
      </div>
    </main>
  );
}
