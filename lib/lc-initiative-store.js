// LC initiative selectors + community effort ratings.
// Base data comes from bundled data/lc-initiatives.json; community votes
// accumulate in localStorage('ac_initiative_ratings') and overlay the base.

const RATINGS_KEY = 'ac_initiative_ratings';

const RATINGS = ['low_effort', 'poor_effort', 'looking_good', 'excellent_work'];

const BADGES = {
  low_effort: { label: 'Low Effort', color: 'orange' },
  poor_effort: { label: 'Poor Effort', color: 'red' },
  looking_good: { label: 'Looking Good', color: 'yellow' },
  excellent_work: { label: 'Excellent Work', color: 'green' },
};

function readRatings() {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(RATINGS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeRatings(ratings) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(RATINGS_KEY, JSON.stringify(ratings));
    }
  } catch {
    // Storage unavailable — merged counts are still returned.
  }
}

function blankCounts() {
  return { low_effort: 0, poor_effort: 0, looking_good: 0, excellent_work: 0 };
}

function mergedCounts(initiative, stored) {
  const base =
    initiative && initiative.community_rating ? initiative.community_rating : {};
  const extra = stored && typeof stored === 'object' ? stored : {};
  const out = blankCounts();
  for (const key of RATINGS) {
    out[key] = (Number(base[key]) || 0) + (Number(extra[key]) || 0);
  }
  return out;
}

function itemsOf(initiativesData) {
  if (!initiativesData || !Array.isArray(initiativesData.items)) return [];
  return initiativesData.items;
}

export function getInitiatives(initiativesData, district) {
  const stored = readRatings();
  return itemsOf(initiativesData)
    .filter((i) => !district || i.district === district)
    .sort((a, b) => new Date(b.announced).getTime() - new Date(a.announced).getTime())
    .map((i) => ({ ...i, community_rating: mergedCounts(i, stored[i.id]) }));
}

export function rateInitiative(initiativeId, rating, initiativesData) {
  const initiative = itemsOf(initiativesData).find((i) => i.id === initiativeId);
  if (!initiative || !RATINGS.includes(rating)) return initiative || null;

  const stored = readRatings();
  const current = mergedCounts({ community_rating: blankCounts() }, stored[initiativeId]);
  current[rating] += 1;
  stored[initiativeId] = current;
  writeRatings(stored);

  return { ...initiative, community_rating: mergedCounts(initiative, current) };
}

export function getInitiativeBadge(rating) {
  if (BADGES[rating]) return { ...BADGES[rating] };
  return { label: rating || 'Unrated', color: 'gray' };
}
