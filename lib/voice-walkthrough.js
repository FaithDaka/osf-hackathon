// State machine for screen-reader / audio-guided navigation.
// Pure functions: every transition returns a NEW state object.
// `categories` is the array from data/voice-tree.json. No side effects.

const AUDIO_LANGS = ['en', 'lg', 'sw'];

export function createWalkthroughState() {
  return {
    currentIndex: -1, // -1 = not started, 0-8 = category index
    started: false,
    finished: false,
    allNo: false,
    selectedCategory: null,
    subcounty: null,
    history: [], // log of each step for debugging
  };
}

function log(state, action, detail) {
  return [...state.history, { action, ...(detail === undefined ? {} : { detail }) }];
}

export function advanceWalkthrough(state, categories) {
  const total = Array.isArray(categories) ? categories.length : 0;
  if (!state || state.finished || total === 0) return state;

  if (!state.started) {
    return {
      ...state,
      started: true,
      currentIndex: 0,
      history: log(state, 'start', { currentIndex: 0 }),
    };
  }

  if (state.currentIndex < total - 1) {
    const next = state.currentIndex + 1;
    return {
      ...state,
      currentIndex: next,
      history: log(state, 'advance', { currentIndex: next }),
    };
  }

  // At the last category and still advancing = user said "no" to everything.
  return {
    ...state,
    allNo: true,
    finished: true,
    history: log(state, 'all_no'),
  };
}

export function selectCategory(state, categoryIndex, categories) {
  if (
    !state ||
    state.finished ||
    !Array.isArray(categories) ||
    categoryIndex < 0 ||
    categoryIndex >= categories.length
  ) {
    return state;
  }
  return {
    ...state,
    selectedCategory: categories[categoryIndex].id,
    finished: true,
    history: log(state, 'select', {
      categoryIndex,
      categoryId: categories[categoryIndex].id,
    }),
  };
}

export function getCurrentCategory(state, categories) {
  if (
    !state ||
    !state.started ||
    state.finished ||
    !Array.isArray(categories) ||
    state.currentIndex < 0 ||
    state.currentIndex >= categories.length
  ) {
    return null;
  }
  return categories[state.currentIndex];
}

export function getAudioFile(state, categories, lang) {
  const current = getCurrentCategory(state, categories);
  if (!current || !current.audio_file) return null;
  const l = AUDIO_LANGS.includes(lang) ? lang : 'en';
  return `/audio/${l}/${current.audio_file}.mp3`;
}
