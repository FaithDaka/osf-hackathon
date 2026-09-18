// Civic quiz engine. Pure logic + localStorage scoreboard. No network.
// Percentile = share of same-parish respondents scoring strictly below you.

const SCORE_KEY = 'ac_quiz_scores';

function readScores() {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(SCORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeScores(scores) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SCORE_KEY, JSON.stringify(scores));
    }
  } catch {
    // Storage unavailable — ranking still computed from memory copy.
  }
}

export function loadQuiz(quizId, quizzesData) {
  if (!quizId || !quizzesData || !Array.isArray(quizzesData.quizzes)) return null;
  return quizzesData.quizzes.find((q) => q.id === quizId) || null;
}

export function answerQuestion(quiz, questionIndex, selectedOption, lang) {
  const question = quiz && Array.isArray(quiz.questions) ? quiz.questions[questionIndex] : null;
  if (!question || typeof selectedOption !== 'number') {
    return { correct: false, explanation: '', source: '' };
  }
  const l = ['en', 'lg', 'sw'].includes(lang) ? lang : 'en';
  const explanation =
    (question.explanation && (question.explanation[l] || question.explanation.en)) || '';
  return {
    correct: selectedOption === question.correct,
    explanation,
    source: question.source || '',
  };
}

export function calculateScore(quiz, answers) {
  const total = quiz && Array.isArray(quiz.questions) ? quiz.questions.length : 0;
  if (total === 0) return { score: 0, total: 0, percent: 0 };
  let score = 0;
  const list = Array.isArray(answers) ? answers : [];
  for (let i = 0; i < total; i++) {
    if (list[i] === quiz.questions[i].correct) score += 1;
  }
  return { score, total, percent: Math.round((score / total) * 100) };
}

export function calculateParishRank(quizId, parish, score) {
  const place = String(parish || '').trim();
  const scores = readScores();
  scores.push({ quizId, parish: place, score, at: new Date().toISOString() });
  writeScores(scores);

  const peers = scores.filter((s) => s.quizId === quizId && s.parish === place);
  const totalRespondents = peers.length;
  if (totalRespondents <= 1) {
    return { percentile: 100, totalRespondents };
  }
  const below = peers.filter((s) => s.score < score).length;
  return {
    percentile: Math.round((below / totalRespondents) * 100),
    totalRespondents,
  };
}
