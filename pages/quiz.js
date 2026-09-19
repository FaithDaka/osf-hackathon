import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import BottomNav from '../lib/bottom-nav';
import PageHeader from '../lib/page-header';
import DistrictCarousel, { isKnownDistrict } from '../lib/district-carousel';
import {
  answerQuestion,
  calculateScore,
  loadQuiz,
} from '../lib/quiz-engine';
import quizzesData from '../data/quizzes.json';
import enStrings from '../public/i18n/en.json';
import lgStrings from '../public/i18n/lg.json';
import swStrings from '../public/i18n/sw.json';

const UI = { en: enStrings, lg: lgStrings, sw: swStrings };
const PROGRESS_KEY = 'ac_quiz_progress';
const LETTERS = ['A', 'B', 'C', 'D'];

// Alert-style card tones for the quiz list (secondary / accent),
// repeating down the list.
const QUIZ_CARD_BG = ['bg-secondary-soft', 'bg-accent-soft'];

// Answer feedback marks (SVG — no emojis).
function AnswerMark({ right, picked }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    role: 'img',
    'aria-hidden': 'true',
    className: 'shrink-0',
    fill: 'none',
    strokeWidth: '2.4',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  if (right) {
    return (
      <svg {...common} stroke="#0E7A55">
        <path d="M4.5 12.5l5 5 10-11" />
      </svg>
    );
  }
  if (picked) {
    return (
      <svg {...common} stroke="#C22433">
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    );
  }
  return null;
}

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

function QuizResults({ quiz, lang, S }) {
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

  const pct = score.percent;
  const C = 2 * Math.PI * 54;
  const title = quiz.title[lang] || quiz.title.en;

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
          <div className="mt-2 flex justify-center">
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
          </div>
          <p className="mt-2 text-ac-muted" style={{ fontSize: '14px' }}>
            {S.quiz_ranking_later}
          </p>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <Link
            href={`/quiz?lang=${lang}`}
            className="btn-ac w-full inline-flex bg-white text-primary border-2 border-primary rounded-lg"
          >
            {S.quiz_back}
          </Link>
        </div>
      </div>
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

  // Restore the district preference (client only).
  useEffect(() => {
    try {
      const d = localStorage.getItem('ac_district');
      if (isKnownDistrict(d)) setDistrict(d);
    } catch {
      // Storage unavailable — quiz still works with the default district.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fresh run whenever the quiz changes; persist progress for the results URL.
  useEffect(() => {
    setQIndex(0);
    setAnswers([]);
    setPicked(null);
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
            {list.map((q, i) => (
              <Link
                key={q.id}
                href={`/quiz?quiz=${q.id}&lang=${lang}`}
                aria-label={S.quiz_topic_lc}
                className={`rounded-xl shadow-sm p-4 min-h-[80px] flex flex-col justify-center ${QUIZ_CARD_BG[i % QUIZ_CARD_BG.length]
                  }`}
              >
                <span className="font-bold text-ink" style={{ fontSize: '16px' }}>
                  {S.quiz_topic_lc}
                </span>
                <span className="mt-1 text-ac-muted" style={{ fontSize: '14px' }}>
                  {S.quiz_card_desc}
                </span>
                <span className="text-ac-muted" style={{ fontSize: '14px' }}>
                  {S.quiz_questions.replace('{count}', q.questions.length)}
                </span>
              </Link>
            ))}
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
                  {picked ? (
                    <AnswerMark right={isRight} picked={isPicked} />
                  ) : (
                    LETTERS[i]
                  )}
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
