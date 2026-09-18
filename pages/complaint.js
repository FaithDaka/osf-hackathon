import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  fileComplaint,
  getAllComplaints,
  getComplaint,
  getComplaintStatus,
  updateComplaint,
} from '../lib/complaint-store';
import geo from '../data/geography.json';
import enStrings from '../public/i18n/en.json';
import lgStrings from '../public/i18n/lg.json';
import swStrings from '../public/i18n/sw.json';

const UI = { en: enStrings, lg: lgStrings, sw: swStrings };

const CATEGORIES = ['land', 'fees_permits', 'safety', 'succession', 'public_services', 'other'];

// Low-literacy helpers: tap to pre-fill the description box.
const VOICE_PROMPTS = [
  'Someone took my land.',
  'They asked me for money.',
  'I was beaten at home.',
  'They chased the widow.',
  'No water for days.',
  'Road is bad.',
];

const STATUS_STYLE = {
  OPEN: 'bg-ac-blue text-white',
  UNDER_REVIEW: 'bg-ac-amber text-white',
  ESCALATED: 'bg-ac-red text-white',
  RESOLVED: 'bg-ac-green text-white',
};

function statusLabel(status, S) {
  if (status === 'OPEN') return S.status_open;
  if (status === 'UNDER_REVIEW') return S.status_review;
  if (status === 'ESCALATED') return S.status_escalated;
  if (status === 'RESOLVED') return S.status_resolved;
  return status;
}

function Toast({ message }) {
  if (!message) return null;
  return (
    <div role="status" aria-live="polite" className="fixed bottom-4 left-0 right-0 mx-auto max-w-md px-4">
      <div className="bg-ac-green text-white rounded-lg p-4 text-center shadow">
        {message}
      </div>
    </div>
  );
}

export default function Complaint() {
  const router = useRouter();
  const lang = ['en', 'lg', 'sw'].includes(router.query.lang)
    ? router.query.lang
    : 'en';
  const S = UI[lang];
  const refParam = typeof router.query.ref === 'string' ? router.query.ref : null;
  const newParam = router.query.new === '1';
  const preCategory =
    typeof router.query.category === 'string' && CATEGORIES.includes(router.query.category)
      ? router.query.category
      : 'land';
  const preDistrict = router.query.district === 'mukono' ? 'mukono' : 'kampala';

  const [view, setView] = useState(newParam ? 'new' : 'list'); // list | new
  const [all, setAll] = useState([]);
  const [checkRef, setCheckRef] = useState('');
  const [checked, setChecked] = useState(null);
  const [toast, setToast] = useState('');

  // Form state (prefilled from the result screen when linked).
  const [category, setCategory] = useState(preCategory);
  const [description, setDescription] = useState('');
  const [district, setDistrict] = useState(preDistrict);
  const [subcounty, setSubcounty] = useState('');
  const [parish, setParish] = useState('');
  // PoC simulation timers (single-complaint view). Top-level so hook order
  // never changes when router.query hydrates after first render.
  const [simTimers, setSimTimers] = useState(null);
  useEffect(
    () => () => {
      if (simTimers) simTimers.forEach(clearTimeout);
    },
    [simTimers],
  );

  useEffect(() => {
    setAll(getAllComplaints());
    if (!newParam) {
      try {
        const d = localStorage.getItem('ac_district');
        if (d === 'kampala' || d === 'mukono') setDistrict(d);
      } catch {
        // Defaults apply.
      }
    }
  }, [newParam]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const subcounties =
    (geo.districts[district] && geo.districts[district].subcounties) || [];
  useEffect(() => {
    if (!subcounties.includes(subcounty)) setSubcounty(subcounties[0] || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [district]);

  const submit = (e) => {
    e.preventDefault();
    const c = fileComplaint({ category, description, district, subcounty, lang });
    setAll(getAllComplaints());
    router.push(`/complaint?ref=${encodeURIComponent(c.ref)}&lang=${lang}`);
  };

  const check = (e) => {
    e.preventDefault();
    const ref = checkRef.trim().toUpperCase();
    if (!ref) return;
    const found = getComplaintStatus(ref);
    if (found && found.status === 'OPEN') {
      setChecked(found);
    } else {
      setChecked(found);
    }
  };

  const shareRef = async (c) => {
    const text = `AlertCitizen complaint ${c.ref}: ${c.category} in ${c.subcounty}. Status: ${c.status}. Filed: ${c.filed_at}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: `Complaint ${c.ref}`, text });
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

  // ---------------- SINGLE VIEW (?ref=) ----------------
  if (refParam) {
    const c = getComplaint(refParam);
    if (!c) {
      return (
        <main className="min-h-screen bg-ac-bg p-4">
          <div className="max-w-md mx-auto text-center">
            <p className="font-bold">{S.not_found.replace('{location}', refParam)}</p>
            <Link
              href={`/complaint?lang=${lang}`}
              className="btn-ac mt-4 w-full inline-flex bg-ac-green text-white rounded-lg"
            >
              ← {S.file_complaint}
            </Link>
          </div>
          <Toast message={toast} />
        </main>
      );
    }
    const st = getComplaintStatus(c.ref) || {
      status: c.status,
      deadline: c.deadline,
      currentAuthority: 'LC1',
      nextAuthority: 'LC2',
    };
    const historyLen = c.escalation_history.length;
    const levels = [
      { authority: 'LC1', due: '72h', done: true },
      { authority: 'LC2', due: '7d', done: historyLen >= 1 || c.status === 'RESOLVED' },
      { authority: 'District', due: '14d', done: c.status === 'RESOLVED' },
    ];

    const simulate = () => {
      // PoC only: walk the complaint through review → escalation on timers.
      const t1 = setTimeout(() => {
        updateComplaint(c.ref, { status: 'UNDER REVIEW' });
        setAll(getAllComplaints());
        setToast(`${c.ref}: ${S.status_review}`);
      }, 30000);
      const t2 = setTimeout(() => {
        updateComplaint(c.ref, {
          status: 'ESCALATED',
          escalation_history: [
            ...getComplaint(c.ref).escalation_history,
            { level: 2, authority: 'LC2', escalated_at: new Date().toISOString() },
          ],
        });
        setAll(getAllComplaints());
        setToast(`${c.ref}: ${S.status_escalated}`);
      }, 60000);
      setToast('Simulating: review in 30s, escalation in 60s.');
      return [t1, t2];
    };

    return (
      <main className="min-h-screen bg-ac-bg p-4">
        <div className="max-w-md mx-auto">
          <Link
            href={`/complaint?lang=${lang}`}
            aria-label={S.file_complaint}
            className="inline-flex items-center min-h-[48px] text-ac-green font-bold"
          >
            ← {S.file_complaint}
          </Link>
          <p className="font-mono font-bold" style={{ fontSize: '24px' }}>
            {c.ref}
          </p>
          <span
            className={`inline-block px-3 py-1 rounded-full font-bold ${
              STATUS_STYLE[c.status] || 'bg-ac-muted text-white'
            }`}
          >
            {statusLabel(c.status, S)}
          </span>
          <dl className="mt-3 bg-white rounded-lg shadow-sm p-4" style={{ fontSize: '16px' }}>
            <div className="flex justify-between gap-2">
              <dt className="font-bold">Filed</dt>
              <dd>{new Date(c.filed_at).toLocaleString()}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="font-bold">{S.complaint_deadline}</dt>
              <dd>{new Date(st.deadline).toLocaleString()}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="font-bold">{S.complaint_authority}</dt>
              <dd>
                {st.currentAuthority} {c.subcounty}
              </dd>
            </div>
            <div className="mt-2">
              <dt className="font-bold">{S.complaint_ref} — description</dt>
              <dd className="mt-1">{c.description}</dd>
            </div>
          </dl>

          <section aria-label={S.escalation_path} className="mt-3 bg-white rounded-lg shadow-sm p-4">
            <h2 className="font-bold">{S.escalation_path}</h2>
            <ol className="mt-2">
              {levels.map((lv, i) => (
                <li key={i} className="flex gap-3">
                  <div className="flex flex-col items-center" aria-hidden="true">
                    <span
                      className={`w-4 h-4 rounded-full border-2 border-ac-green ${
                        lv.done ? 'bg-ac-green' : 'bg-white'
                      }`}
                    />
                    {i < levels.length - 1 && (
                      <span className="w-0.5 flex-1 bg-ac-green" style={{ minHeight: '20px' }} />
                    )}
                  </div>
                  <div className="pb-4">
                    <span className="font-bold">Level {i + 1}: </span>
                    {lv.authority} — {lv.due} — {lv.done ? '✅ Done' : '⏳ Pending'}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => shareRef(c)}
              className="btn-ac w-full bg-white text-ac-green border-2 border-ac-green rounded-lg"
            >
              📤 {S.share_complaint}
            </button>
            <button
              type="button"
              onClick={() => {
                if (simTimers) simTimers.forEach(clearTimeout);
                setSimTimers(simulate());
              }}
              className="btn-ac w-full bg-ac-green text-white rounded-lg"
            >
              🔄 {S.check_status}
            </button>
          </div>
        </div>
        <Toast message={toast} />
      </main>
    );
  }

  // ---------------- LIST + FORM ----------------
  return (
    <main className="min-h-screen bg-ac-bg p-4">
      <div className="max-w-md mx-auto">
        <Link
          href={`/home?lang=${lang}`}
          aria-label={S.app_name}
          className="inline-flex items-center min-h-[48px] text-ac-green font-bold"
        >
          ← {S.app_name}
        </Link>
        <h1 className="text-lg font-bold">{S.file_complaint}</h1>

        <div className="mt-2 flex gap-2" role="group" aria-label={S.file_complaint}>
          <button
            type="button"
            aria-pressed={view === 'list'}
            onClick={() => setView('list')}
            className={`btn-ac flex-1 rounded-lg border-2 ${
              view === 'list'
                ? 'bg-ac-green text-white border-ac-green'
                : 'bg-white text-ac-green border-ac-green'
            }`}
          >
            {S.check_status}
          </button>
          <button
            type="button"
            aria-pressed={view === 'new'}
            onClick={() => setView('new')}
            className={`btn-ac flex-1 rounded-lg border-2 ${
              view === 'new'
                ? 'bg-ac-green text-white border-ac-green'
                : 'bg-white text-ac-green border-ac-green'
            }`}
          >
            + {S.file_complaint}
          </button>
        </div>

        {view === 'list' && (
          <section aria-label={S.check_status} className="mt-4">
            <form onSubmit={check} className="flex gap-2">
              <label htmlFor="ref" className="sr-only">
                {S.complaint_ref}
              </label>
              <input
                id="ref"
                type="text"
                value={checkRef}
                onInput={(e) => setCheckRef(e.target.value)}
                placeholder={S.complaint_ref}
                autoComplete="off"
                className="btn-ac flex-1 bg-white border border-gray-300 rounded-lg px-4 uppercase"
              />
              <button
                type="submit"
                className="btn-ac bg-ac-green text-white rounded-lg px-4"
              >
                {S.search_submit}
              </button>
            </form>
            {checked && (
              <div className="mt-2 bg-white rounded-lg shadow-sm p-4" aria-live="polite">
                <Link
                  href={`/complaint?ref=${encodeURIComponent(checkRef.trim().toUpperCase())}&lang=${lang}`}
                  className="font-bold font-mono text-ac-green underline"
                >
                  {checkRef.trim().toUpperCase()}
                </Link>
                <div>
                  {S.complaint_status}: {statusLabel(checked.status, S)}
                </div>
                <div>
                  {S.complaint_deadline}: {new Date(checked.deadline).toLocaleString()}
                </div>
                <div>
                  {S.complaint_authority}: {checked.currentAuthority || '—'}
                </div>
              </div>
            )}
            <h2 className="mt-3 font-bold">Your Complaints</h2>
            <div className="mt-1 flex flex-col gap-2" aria-live="polite">
              {all.length === 0 && (
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-ac-muted">No complaints filed yet.</p>
                  <button
                    type="button"
                    onClick={() => setView('new')}
                    className="btn-ac mt-2 w-full bg-ac-green text-white rounded-lg"
                  >
                    {S.file_complaint}
                  </button>
                </div>
              )}
              {all.map((c) => (
                <Link
                  key={c.ref}
                  href={`/complaint?ref=${encodeURIComponent(c.ref)}&lang=${lang}`}
                  aria-label={`${c.ref}, ${c.status}`}
                  className="bg-white rounded-lg shadow-sm p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold font-mono">{c.ref}</span>
                    <span
                      className={`px-2 rounded ${STATUS_STYLE[c.status] || 'bg-ac-muted text-white'}`}
                      style={{ fontSize: '14px' }}
                    >
                      {statusLabel(c.status, S)}
                    </span>
                  </div>
                  <div className="text-ac-muted" style={{ fontSize: '16px' }}>
                    {c.category} · {c.subcounty} ·{' '}
                    {new Date(c.filed_at).toLocaleDateString()}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {view === 'new' && (
          <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
            <div>
              <label htmlFor="ccat" className="block font-bold">
                Category
              </label>
              <select
                id="ccat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="btn-ac mt-1 w-full bg-white border border-gray-300 rounded-lg px-4"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cdesc" className="block font-bold">
                {S.report_error}
              </label>
              <textarea
                id="cdesc"
                value={description}
                onInput={(e) => setDescription(e.target.value)}
                rows="4"
                required
                className="mt-1 w-full bg-white border border-gray-300 rounded-lg p-4 min-h-[48px]"
              />
              <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label="Quick phrases">
                {VOICE_PROMPTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setDescription((d) => (d ? `${d} ${p}` : p))}
                    className="bg-white border border-ac-green text-ac-green rounded-lg min-h-[48px]"
                    style={{ fontSize: '14px' }}
                  >
                    🔊 {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2" role="group" aria-label="District">
              {['kampala', 'mukono'].map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={district === d}
                  onClick={() => setDistrict(d)}
                  className={`btn-ac flex-1 rounded-lg border-2 capitalize ${
                    district === d
                      ? 'bg-ac-green text-white border-ac-green'
                      : 'bg-white text-ac-green border-ac-green'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <div>
              <label htmlFor="csub" className="block font-bold">
                {S.subcounty_prompt}
              </label>
              <select
                id="csub"
                value={subcounty}
                onChange={(e) => setSubcounty(e.target.value)}
                className="btn-ac mt-1 w-full bg-white border border-gray-300 rounded-lg px-4"
              >
                {subcounties.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cpar" className="block font-bold">
                {S.parish_prompt}
              </label>
              <input
                id="cpar"
                type="text"
                value={parish}
                onInput={(e) => setParish(e.target.value)}
                className="btn-ac mt-1 w-full bg-white border border-gray-300 rounded-lg px-4"
              />
            </div>
            <button
              type="submit"
              className="btn-ac w-full bg-ac-green text-white rounded-lg"
            >
              {S.file_complaint}
            </button>
          </form>
        )}
      </div>
      <Toast message={toast} />
    </main>
  );
}
