import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import BottomNav from '../lib/bottom-nav';
import PageHeader from '../lib/page-header';
import DistrictCarousel, { isKnownDistrict } from '../lib/district-carousel';
import {
  answerQuestion,
  calculateParishRank,
  calculateScore,
  loadQuiz,
} from '../lib/quiz-engine';
import quizzesData from '../data/quizzes.json';
import enStrings from '../public/i18n/en.json';
import lgStrings from '../public/i18n/lg.json';
import swStrings from '../public/i18n/sw.json';

const UI = { en: enStrings, lg: lgStrings, sw: swStrings };
const PWA_URL = process.env.NEXT_PUBLIC_PWA_URL || 'https://alertcitizen.github.io';
const PROGRESS_KEY = 'ac_quiz_progress';
const SCORES_KEY = 'ac_quiz_scores';
const LETTERS = ['A', 'B', 'C', 'D'];

// DEMO DATA: replace with real scores in production.
// Pre-seeded so parish ranking looks meaningful in the demo (14 respondents:
// Kigomba parish + two Kampala parishes). Written once, only when the user
// has no scores stored yet.
const DEMO_SEED = [
  ...[4, 3, 5, 2, 4, 3, 5, 4].map((score, i) => ({
    quizId: 'quiz-lc-kampala',
    parish: 'Kibuli',
    score,
    at: `2026-01-${10 + i}T09:00:00+03:00`,
  })),
  ...[3, 4].map((score, i) => ({
    quizId: 'quiz-lc-kampala',
    parish: 'Kawempe',
    score,
    at: `2026-01-${10 + i}T10:00:00+03:00`,
  })),
  ...[5, 4, 3, 5].map((score, i) => ({
    quizId: 'quiz-lc-mukono',
    parish: 'Kigomba',
    score,
    at: `2026-01-${10 + i}T11:00:00+03:00`,
  })),
];

function ringColor(percent) {
  if (percent >= 80) return '#0E7A55';
  if (percent >= 50) return '#B45309';
  return '#C22433';
}

function SourceLink({ source }) {
  // Legislation citations point at the canonical laws portal used across
  // the dataset; anything else renders as plain (underlined) text so we
  // never fabricate a per-question URL.
  const isLaw = /act|cap|lga|guidelines/i.test(source || '');
  if (isLaw) {
    return (
      <a
        href="https://www.laws.go.ug/"
        target="_blank"
        rel="noreferrer"
        className="text-primary underline"
      >
        {source}
      </a>
    );
  }
  return <span className="underline">{source}</span>;
}

function QuizResults({
  quiz,
  lang,
  S,
  parish,
  setParish,
  rank,
  setRank,
  rankedRef,
}) {
  const [toast, setToast] = useState('');
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);
  const saved = useMemo(() => {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && parsed.quizId === quiz.id && Array.isArray(parsed.answers)) {
        return parsed.answers;
      }
    } catch {
      // No saved progress.
    }
    return [];
  }, [quiz.id]);
  const score = useMemo(() => calculateScore(quiz, saved), [quiz, saved]);
  const needParish = !parish.trim();

  // Record this respondent exactly once, then rank (effect, never render).
  useEffect(() => {
    if (!needParish && !rank && !rankedRef.current) {
      rankedRef.current = true;
      setRank(calculateParishRank(quiz.id, parish.trim(), score.score));
    }
  }, [needParish, rank, quiz.id, parish, score.score, setRank, rankedRef]);

  const peerStats = useMemo(() => {
    if (!parish.trim()) return null;
    let stored = [];
    try {
      const raw = localStorage.getItem(SCORES_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed)) stored = parsed;
    } catch {
      // Ignore.
    }
    const peers = stored.filter((s) => s.quizId === quiz.id && s.parish === parish.trim());
    if (peers.length === 0) return null;
    const scores = peers.map((s) => s.score);
    return {
      count: peers.length,
      avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      high: Math.max(...scores),
    };
  }, [quiz.id, parish, rank]);

  const wrong = quiz.questions
    .map((q, i) => ({ q, i, mine: saved[i] }))
    .filter((w) => w.mine !== w.q.correct);

  const pct = score.percent;
  const C = 2 * Math.PI * 54;
  const title = quiz.title[lang] || quiz.title.en;
  const shareText =
    `I scored ${score.score}/${score.total} on the ${title} quiz! ` +
    (rank ? `I'm in the top ${rank.percentile}% of ${parish.trim()}. ` : '') +
    `Can you beat me? ${PWA_URL}/quiz?quiz=${quiz.id}&lang=${lang}`;
  const share = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: quiz.title.en, text: shareText });
        return;
      }
      throw new Error('no-share');
    } catch {
      try {
        await navigator.clipboard.writeText(shareText);
        setToast('Copied to clipboard.');
      } catch {
        setToast(shareText);
      }
    }
  };
  const askParish = (e) => {
    e.preventDefault();
    if (!parish.trim()) return;
    try {
      localStorage.setItem('ac_parish', parish.trim());
    } catch {
      // Ranking still works for this session.
    }
    setRank(calculateParishRank(quiz.id, parish.trim(), score.score));
  };

  return (
    <main className="min-h-screen bg-white p-4 pb-24">
      <div className="max-w-md mx-auto min-w-0">
        <PageHeader
          backHref={`/quiz?lang=${lang}`}
          backLabel={S.back}
          title={title}
        />
        <div className="text-center">
        <p className="mt-2 font-bold" style={{ fontSize: '32px' }} aria-live="polite">
          {S.quiz_score.replace('{score}', score.score).replace('{total}', score.total)}
        </p>
        <svg width="120" height="120" viewBox="0 0 120 120" role="img" aria-label={`${pct}%`}>
          <circle cx="60" cy="60" r="54" fill="none" stroke="#E3DDF0" strokeWidth="12" />
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke={ringColor(pct)}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pct / 100)}
            transform="rotate(-90 60 60)"
          />
            <text x="60" y="68" textAnchor="middle" fontSize="22" fontWeight="bold" fill="#201C2B">
            {pct}%
          </text>
        </svg>

        {needParish ? (
          <form onSubmit={askParish} className="mt-4 text-left">
            <label htmlFor="parish" className="block font-bold">
              {S.parish_prompt}
            </label>
            <input
              id="parish"
              type="text"
              value={parish}
              onInput={(e) => setParish(e.target.value)}
              className="btn-ac mt-1 w-full bg-white border border-gray-300 rounded-lg px-4"
            />
            <button
              type="submit"
              className="btn-ac mt-2 w-full bg-primary text-white rounded-lg"
            >
              {S.search_submit}
            </button>
          </form>
        ) : rank ? (
          <div aria-live="polite">
            {rank.totalRespondents < 5 ? (
              <p className="mt-2 font-bold" style={{ fontSize: '20px' }}>
                Only {rank.totalRespondents} people in {parish.trim()} have taken
                this quiz so far. Be the first to change that!
              </p>
            ) : (
              <p className="mt-2 font-bold" style={{ fontSize: '20px' }}>
                {S.quiz_rank
                  .replace('{percent}', rank.percentile)
                  .replace('{parish}', `${parish.trim()} parish`)}
              </p>
            )}
            {peerStats && (
              <div className="mt-3 bg-white rounded-lg shadow-sm p-4 text-left">
                <h2 className="font-bold">Parish Ranking: {parish.trim()}</h2>
                {[
                  { label: 'Your score', value: score.score, cls: 'bg-secondary' },
                  { label: 'Parish average', value: peerStats.avg, cls: 'bg-ac-muted' },
                  { label: 'Parish high', value: peerStats.high, cls: 'bg-primary' },
                ].map((b) => (
                  <div key={b.label} className="mt-2">
                    <div className="flex justify-between" style={{ fontSize: '14px' }}>
                      <span>{b.label}</span>
                      <span className="font-bold">{b.value}/{score.total}</span>
                    </div>
                    <div className="h-3 bg-gray-200 rounded">
                      <div
                        className={`h-3 rounded ${b.cls}`}
                        style={{ width: `${score.total ? (b.value / score.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {wrong.length > 0 && (
          <div className="mt-3 bg-white rounded-lg shadow-sm p-4 text-left">
            <h2 className="font-bold">Questions you got wrong:</h2>
            {wrong.map((w) => {
              const fb = answerQuestion(quiz, w.i, w.mine, lang);
              const opts = w.q.options[lang] || w.q.options.en;
              return (
                <div key={w.i} className="mt-3 border-t border-gray-200 pt-2">
                  <p className="font-bold">{w.q.question[lang] || w.q.question.en}</p>
                  <p>❌ {opts[w.mine] ?? '—'}</p>
                  <p className="text-secondary font-bold">✅ {opts[w.q.correct]}</p>
                  <p className="text-ac-muted" style={{ fontSize: '16px' }}>
                    Explanation: {fb.explanation}
                  </p>
                  <p style={{ fontSize: '14px' }}>
                    Source: <SourceLink source={fb.source} />
                  </p>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={share}
            className="btn-ac w-full bg-white text-primary border-2 border-primary rounded-lg"
          >
            📤 {S.share}
          </button>
          <Link
            href={`/quiz?lang=${lang}`}
            className="btn-ac w-full inline-flex bg-white text-primary border-2 border-primary rounded-lg"
          >
            {S.quiz} →
          </Link>
          {pct < 50 && (
            <Link
              href={`/complaint?new=1&lang=${lang}`}
              className="btn-ac w-full inline-flex bg-accent text-white rounded-lg"
            >
              📋 {S.file_complaint}
            </Link>
          )}
        </div>
          {pct < 50 && (
            <p className="mt-2 text-ac-muted" style={{ fontSize: '16px' }}>
              You might be at risk of being overcharged or misdirected. File a
              complaint to get help.
            </p>
          )}
        </div>
        </div>
        {toast && (
          <div role="status" className="fixed bottom-4 left-0 right-0 mx-auto max-w-md px-4">
            <div className="bg-secondary text-white rounded-lg p-4 text-center shadow">
              {toast}
            </div>
          </div>
        )}
        <BottomNav active="/quiz" lang={lang} strings={S} />
      </main>
    );
  }

  // ---- TAKING (main component continues below) ----

export default function Quiz() {
  const router = useRouter();
  const lang = ['en', 'lg', 'sw'].includes(router.query.lang)
    ? router.query.lang
    : 'en';
  const S = UI[lang];
  const quizId =
    typeof router.query.quiz === 'string'
      ? router.query.quiz
      : typeof router.query.id === 'string'
        ? router.query.id
        : null;
  const showResults = router.query.results === '1';

  const [district, setDistrict] = useState('kampala');
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [picked, setPicked] = useState(null);
  const [parish, setParish] = useState('');
  const [rank, setRank] = useState(null);
  const rankedRef = useRef(false);

  // Seed demo scores once (selection screen mounts this too).
  useEffect(() => {
    try {
      if (!localStorage.getItem(SCORES_KEY)) {
        localStorage.setItem(SCORES_KEY, JSON.stringify(DEMO_SEED));
      }
      const d = localStorage.getItem('ac_district');
      if (isKnownDistrict(d)) setDistrict(d);
      if (!parish) {
        const saved =
          localStorage.getItem('ac_parish') || localStorage.getItem('ac_subcounty') || '';
        if (saved) setParish(saved);
      }
    } catch {
      // Storage unavailable — quiz still works, ranking just won't persist.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fresh run whenever the quiz changes; persist progress for the results URL.
  useEffect(() => {
    setQIndex(0);
    setAnswers([]);
    setPicked(null);
    setRank(null);
    rankedRef.current = false;
    try {
      localStorage.removeItem(PROGRESS_KEY);
    } catch {
      // Ignore.
    }
  }, [quizId]);

  const quiz = quizId ? loadQuiz(quizId, quizzesData) : null;

  // ---- SELECTION (no ?quiz=) ----
  if (!quizId) {
    const list = quizzesData.quizzes.filter((q) => !district || q.district === district);
    return (
      <main className="min-h-screen bg-white p-4 pb-24">
        <div className="max-w-md mx-auto min-w-0">
          <PageHeader
            backHref={`/home?lang=${lang}`}
            backLabel={S.back}
            title={S.quiz}
            description={S.quiz_desc}
          >
            <DistrictCarousel
              district={district}
              onPick={(d) => {
                setDistrict(d);
                try {
                  localStorage.setItem('ac_district', d);
                } catch {
                  // Ignore.
                }
              }}
              lang={lang}
              UI={UI}
            />
          </PageHeader>
          <div className="mt-3 flex flex-col gap-2">
            {list.map((q) => (
              <Link
                key={q.id}
                href={`/quiz?quiz=${q.id}&lang=${lang}`}
                aria-label={q.title[lang] || q.title.en}
                className="bg-white rounded-lg shadow-sm p-4 min-h-[80px] flex flex-col justify-center"
              >
                <span className="text-2xl" aria-hidden="true">
                  ❓
                </span>
                <span className="font-bold" style={{ fontSize: '16px' }}>
                  {q.title[lang] || q.title.en}
                </span>
                <span className="text-ac-muted" style={{ fontSize: '14px' }}>
                  {q.district} · {q.category} · {q.questions.length} questions
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-3 bg-white rounded-lg shadow-sm p-4">
            <h2 className="font-bold">How ranking works</h2>
            <p className="text-ac-muted" style={{ fontSize: '16px' }}>
              Your score is compared to other respondents in your parish. The
              more people who take the quiz, the more accurate your rank. Your
              name is NOT stored. Only your parish and score.
            </p>
          </div>
        </div>
        <BottomNav active="/quiz" lang={lang} strings={S} />
      </main>
    );
  }

  if (!quiz) {
    return (
      <main className="min-h-screen bg-white p-4 pb-24">
        <div className="max-w-md mx-auto min-w-0 text-center">
          <PageHeader
            backHref={`/quiz?lang=${lang}`}
            backLabel={S.back}
            title={S.quiz}
          />
          <p className="mt-4 font-bold">{S.not_found.replace('{location}', quizId)}</p>
          <Link
            href={`/quiz?lang=${lang}`}
            className="btn-ac mt-4 w-full inline-flex bg-primary text-white rounded-lg"
          >
            ← {S.quiz}
          </Link>
        </div>
        <BottomNav active="/quiz" lang={lang} strings={S} />
      </main>
    );
  }

  if (showResults) {
    return (
      <QuizResults
        quiz={quiz}
        lang={lang}
        S={S}
        parish={parish}
        setParish={setParish}
        rank={rank}
        setRank={setRank}
        rankedRef={rankedRef}
      />
    );
  }


  // ---- TAKING ----
  const total = quiz.questions.length;
  const q = quiz.questions[Math.min(qIndex, total - 1)];
  const pick = (optionIndex) => {
    if (picked) return; // one attempt per question, one direction only
    const fb = answerQuestion(quiz, qIndex, optionIndex, lang);
    setPicked({ ...fb, optionIndex });
    const next = [...answers];
    next[qIndex] = optionIndex;
    setAnswers(next);
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({ quizId: quiz.id, answers: next }));
    } catch {
      // Progress won't survive a reload, results still work in-session.
    }
  };
  const next = () => {
    if (qIndex + 1 >= total) {
      router.push(`/quiz?quiz=${quiz.id}&results=1&lang=${lang}`);
      return;
    }
    setPicked(null);
    setQIndex((i) => i + 1);
  };

  return (
    <main className="min-h-screen bg-white p-4 pb-24">
      <div className="max-w-md mx-auto min-w-0">
        <PageHeader
          backHref={`/quiz?lang=${lang}`}
          backLabel={S.back}
          title={quiz.title[lang] || quiz.title.en}
          description={`Question ${qIndex + 1} of ${total}`}
        />
        <div className="h-2 bg-gray-200 rounded mt-1" aria-hidden="true">
          <div
            className="h-2 rounded bg-primary"
            style={{ width: `${((qIndex + 1) / total) * 100}%` }}
          />
        </div>
        <h2 className="mt-3 font-bold" style={{ fontSize: '18px' }}>
          {q.question[lang] || q.question.en}
        </h2>
        <div className="mt-3 flex flex-col gap-2" role="group" aria-label={q.question.en}>
          {(q.options[lang] || q.options.en).map((opt, i) => {
            const isPicked = picked && picked.optionIndex === i;
            const isRight = picked && q.correct === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => pick(i)}
                disabled={!!picked}
                aria-pressed={isPicked || undefined}
                className="btn-ac w-full rounded-lg border-2 border-primary text-left px-4 flex items-center gap-3"
                style={{ height: '56px' }}
              >
                <span
                  className={`inline-flex items-center justify-center rounded-full border border-primary font-bold ${
                    isRight ? 'bg-white text-primary' : ''
                  } ${isPicked && !isRight ? 'bg-white text-accent border-accent' : 'bg-white text-primary'}`}
                  style={{ width: '32px', height: '32px', minWidth: '32px' }}
                >
                  {isRight ? '✅' : isPicked ? '❌' : LETTERS[i]}
                </span>
                <span>{opt}</span>
              </button>
            );
          })}
        </div>
        {picked && (
          <div className="mt-3 bg-white rounded-lg shadow-sm p-4" aria-live="polite">
            <p className="text-ac-muted" style={{ fontSize: '16px' }}>
              Explanation: {picked.explanation}
            </p>
            <p style={{ fontSize: '14px' }}>
              Source: <SourceLink source={picked.source} />
            </p>
            <button
              type="button"
              onClick={next}
              className="btn-ac mt-2 w-full bg-primary text-white rounded-lg"
            >
              {qIndex + 1 >= total ? 'SEE RESULTS' : 'NEXT QUESTION'} →
            </button>
          </div>
        )}
      </div>
      <BottomNav active="/quiz" lang={lang} strings={S} />
    </main>
  );
}
