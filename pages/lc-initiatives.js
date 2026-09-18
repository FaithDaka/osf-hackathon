import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { getInitiatives, rateInitiative } from '../lib/lc-initiative-store';
import { fileComplaint } from '../lib/complaint-store';
import initiativesData from '../data/lc-initiatives.json';
import enStrings from '../public/i18n/en.json';
import lgStrings from '../public/i18n/lg.json';
import swStrings from '../public/i18n/sw.json';

const UI = { en: enStrings, lg: lgStrings, sw: swStrings };
const COMMENTS_KEY = 'ac_initiative_comments';

const CATEGORY_ICONS = {
  infrastructure: '🏗️',
  health: '🏥',
  education: '🎓',
  safety: '🛡️',
  environment: '🌱',
  other: '📋',
};

const STATUS_BADGE = {
  announced: 'bg-primary text-white',
  in_progress: 'bg-amber text-white',
  completed: 'bg-secondary text-white',
  stalled: 'bg-accent text-white',
};

const RATING_BUTTONS = [
  { key: 'low_effort', icon: '🔴', label: 'Low Effort', border: '#C22433' },
  { key: 'poor_effort', icon: '🟠', label: 'Poor Effort', border: '#E8590C' },
  { key: 'looking_good', icon: '🟡', label: 'Looking Good', border: '#B45309' },
  { key: 'excellent_work', icon: '🟢', label: 'Excellent Work', border: '#0E7A55' },
];

function fmtDate(iso) {
  try {
    const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
    const p = (n) => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  } catch {
    return iso;
  }
}

function readComments() {
  try {
    const raw = localStorage.getItem(COMMENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export default function Initiatives() {
  const router = useRouter();
  const lang = ['en', 'lg', 'sw'].includes(router.query.lang)
    ? router.query.lang
    : 'en';
  const S = UI[lang];

  const [district, setDistrict] = useState('kampala');
  const [toast, setToast] = useState('');
  const [commentOpen, setCommentOpen] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [stalledOpen, setStalledOpen] = useState(false);
  const [stalledId, setStalledId] = useState('');
  const [stalledLong, setStalledLong] = useState('');
  const [stalledTried, setStalledTried] = useState('');

  useEffect(() => {
    try {
      const d = localStorage.getItem('ac_district');
      if (d === 'kampala' || d === 'mukono') setDistrict(d);
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

  const items = getInitiatives(initiativesData, district);
  const storedComments = readComments();
  const inProgress = items.filter((i) => i.status === 'in_progress');

  const rate = (id, rating) => {
    // rateInitiative persists to localStorage; the toast state change below
    // re-renders, and getInitiatives re-reads the merged counts on render.
    rateInitiative(id, rating, initiativesData);
    setToast('Thanks for your rating.');
  };

  const submitComment = (e, id) => {
    e.preventDefault();
    const text = commentText.trim().slice(0, 200);
    if (!text) return;
    try {
      const all = readComments();
      const list = Array.isArray(all[id]) ? all[id] : [];
      list.push({ text, at: new Date().toISOString() });
      all[id] = list;
      localStorage.setItem(COMMENTS_KEY, JSON.stringify(all));
    } catch {
      // Storage unavailable.
    }
    setCommentText('');
    setCommentOpen(null);
    setToast('Thanks for your rating.');
  };

  const submitStalled = (e) => {
    e.preventDefault();
    const item = items.find((i) => i.id === stalledId) || inProgress[0];
    if (!item) return;
    const c = fileComplaint({
      category: 'lc_initiative_stalled',
      description: `Stalled: ${item.title[lang] || item.title.en}. How long: ${stalledLong.trim()}. Tried: ${stalledTried.trim()}`,
      district: item.district,
      subcounty: item.subcounty,
      lang,
    });
    router.push(`/complaint?ref=${encodeURIComponent(c.ref)}&lang=${lang}`);
  };

  return (
    <main className="min-h-screen bg-ac-bg p-4">
      <div className="max-w-md mx-auto">
        <Link
          href={`/home?lang=${lang}`}
          aria-label={S.app_name}
          className="inline-flex items-center min-h-[48px] text-primary font-bold"
        >
          ← {S.app_name}
        </Link>
        <h1 className="text-lg font-bold">{S.lc_initiatives}</h1>
        <p className="text-ac-muted" style={{ fontSize: '16px' }}>
          {S.lc_initiatives_desc}. Rate the effort.
        </p>
        <div className="mt-2 flex gap-2" role="group" aria-label="District">
          {['kampala', 'mukono'].map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={district === d}
              onClick={() => pickDistrict(d)}
              className={`btn-ac flex-1 rounded-lg border-2 capitalize ${
                district === d
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-primary border-primary'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-col gap-3">
          {items.map((item) => {
            const title = item.title[lang] || item.title.en;
            const desc = item.description[lang] || item.description.en;
            const counts = item.community_rating;
            const total = Object.values(counts).reduce((a, b) => a + b, 0);
            const leader = RATING_BUTTONS.reduce((a, b) =>
              counts[b.key] > counts[a.key] ? b : a,
            );
            const baseComments = Array.isArray(item.comments) ? item.comments : [];
            const extra = Array.isArray(storedComments[item.id])
              ? storedComments[item.id]
              : [];
            return (
              <article key={item.id} className="bg-white rounded-lg shadow-sm p-5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl" aria-hidden="true">
                    {CATEGORY_ICONS[item.category] || '📋'}
                  </span>
                  <h2 className="font-bold" style={{ fontSize: '18px' }}>
                    {title}
                  </h2>
                </div>
                <div className="mt-1 flex gap-2">
                  <span
                    className="px-2 py-0.5 rounded bg-primary text-white"
                    style={{ fontSize: '12px' }}
                  >
                    {item.lc_level}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded ${
                      STATUS_BADGE[item.status] || 'bg-ac-muted text-white'
                    }`}
                    style={{ fontSize: '12px' }}
                  >
                    {item.status}
                  </span>
                </div>
                <p className="mt-2" style={{ fontSize: '16px', lineHeight: 1.5 }}>
                  {desc}
                </p>
                <p className="mt-1 text-ac-muted" style={{ fontSize: '14px' }}>
                  {item.district === 'kampala' ? 'Kampala' : 'Mukono'} {'>'}{' '}
                  {item.subcounty} Sub-county {'>'} {item.parish} Parish
                </p>
                <p className="text-ac-muted" style={{ fontSize: '14px' }}>
                  Announced: {fmtDate(item.announced)}
                </p>
                <p style={{ fontSize: '14px' }}>
                  🔗{' '}
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline"
                  >
                    {S.source_link}
                  </a>
                </p>

                <h3 className="mt-3 font-bold" style={{ fontSize: '16px' }}>
                  Community Rating:
                </h3>
                <div className="mt-1 grid grid-cols-4 gap-1" role="group" aria-label="Rate effort">
                  {RATING_BUTTONS.map((b) => {
                    const isLeader = total > 0 && b.key === leader.key;
                    return (
                      <button
                        key={b.key}
                        type="button"
                        onClick={() => rate(item.id, b.key)}
                        aria-label={`${b.label}: ${counts[b.key]} votes`}
                        aria-pressed={isLeader}
                        className="bg-white rounded"
                        style={{
                          width: '100%',
                          maxWidth: '72px',
                          height: '48px',
                          fontSize: '12px',
                          border: isLeader ? `2px solid ${b.border}` : '1px solid #BDBDBD',
                        }}
                      >
                        {b.icon} {b.label}
                        <span className="block font-bold">{counts[b.key]}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-ac-muted" style={{ fontSize: '14px' }}>
                  Total votes: {total}
                </p>

                <h3 className="mt-2 font-bold" style={{ fontSize: '16px' }}>
                  Community Comments:
                </h3>
                {[...baseComments, ...extra].map((c, i) => (
                  <p key={i} className="text-ac-muted" style={{ fontSize: '14px' }}>
                    {c.name || 'Anonymous'}
                    {c.at || c.date ? `, ${fmtDate(c.at || c.date)}` : ''}:{' '}
                    {c.text}
                  </p>
                ))}
                {commentOpen === item.id ? (
                  <form onSubmit={(e) => submitComment(e, item.id)} className="mt-1">
                    <label htmlFor={`c-${item.id}`} className="sr-only">
                      Add comment
                    </label>
                    <input
                      id={`c-${item.id}`}
                      type="text"
                      value={commentText}
                      onInput={(e) => setCommentText(e.target.value)}
                      maxLength={200}
                      placeholder="Your comment (max 200)"
                      className="btn-ac w-full bg-white border border-gray-300 rounded-lg px-4"
                    />
                    <p className="text-ac-muted" style={{ fontSize: '14px' }}>
                      Your name is NOT stored. You are anonymous.
                    </p>
                    <button
                      type="submit"
                      className="btn-ac mt-1 w-full bg-primary text-white rounded-lg"
                    >
                      {S.search_submit}
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setCommentText('');
                      setCommentOpen(item.id);
                    }}
                    className="btn-ac mt-1 w-full bg-white text-primary border border-primary rounded-lg"
                  >
                    ADD COMMENT
                  </button>
                )}
              </article>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            setStalledOpen((v) => !v);
            if (inProgress[0] && !stalledId) setStalledId(inProgress[0].id);
          }}
          aria-expanded={stalledOpen}
          className="btn-ac mt-4 w-full bg-white text-accent border-2 border-accent rounded-lg"
        >
          Report a Stalled Initiative
        </button>
        {stalledOpen && (
          <form onSubmit={submitStalled} className="mt-2 bg-white rounded-lg shadow-sm p-4 flex flex-col gap-2">
            <label htmlFor="stalled-which" className="block font-bold" style={{ fontSize: '16px' }}>
              Which initiative is stalled?
            </label>
            <select
              id="stalled-which"
              value={stalledId}
              onChange={(e) => setStalledId(e.target.value)}
              className="btn-ac w-full bg-white border border-gray-300 rounded-lg px-4"
            >
              {inProgress.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.title[lang] || i.title.en}
                </option>
              ))}
            </select>
            <label htmlFor="stalled-long" className="block font-bold" style={{ fontSize: '16px' }}>
              How long has it been stalled?
            </label>
            <input
              id="stalled-long"
              type="text"
              value={stalledLong}
              onInput={(e) => setStalledLong(e.target.value)}
              required
              className="btn-ac w-full bg-white border border-gray-300 rounded-lg px-4"
            />
            <label htmlFor="stalled-tried" className="block font-bold" style={{ fontSize: '16px' }}>
              What have you tried?
            </label>
            <input
              id="stalled-tried"
              type="text"
              value={stalledTried}
              onInput={(e) => setStalledTried(e.target.value)}
              required
              className="btn-ac w-full bg-white border border-gray-300 rounded-lg px-4"
            />
            <button
              type="submit"
              className="btn-ac w-full bg-accent text-white rounded-lg"
            >
              {S.file_complaint}
            </button>
          </form>
        )}
      </div>
      {toast && (
        <div role="status" className="fixed bottom-4 left-0 right-0 mx-auto max-w-md px-4">
          <div className="bg-secondary text-white rounded-lg p-4 text-center shadow">
            {toast}
          </div>
        </div>
      )}
    </main>
  );
}
