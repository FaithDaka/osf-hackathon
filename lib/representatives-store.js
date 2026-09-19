// Representative selectors over bundled data/representatives.json.
// Pure functions; no network, no storage. Groups are fixed ballot
// categories; reps are filtered by district like announcements.

export const REP_GROUPS = [
  'city_council',
  'local_council',
  'mp',
  'state_minister',
];

function itemsOf(repsData) {
  if (!repsData || !Array.isArray(repsData.items)) return [];
  return repsData.items;
}

export function getRepresentatives(repsData, district, group) {
  return itemsOf(repsData)
    .filter((r) => (!district || r.district === district))
    .filter((r) => (!group || group === 'all' || r.group === group))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

export function getRepresentative(repsData, id) {
  return itemsOf(repsData).find((r) => r.id === id) || null;
}

// Initiatives led by a rep: resolved by id against the initiatives table.
export function getRepInitiatives(rep, initiativesData) {
  if (!rep || !Array.isArray(rep.initiatives)) return [];
  const items =
    initiativesData && Array.isArray(initiativesData.items)
      ? initiativesData.items
      : [];
  const ids = new Set(rep.initiatives);
  return items.filter((i) => ids.has(i.id));
}

// Reverse lookup: which rep leads a given initiative id (if any).
export function getInitiativeLeader(repsData, initiativeId) {
  return (
    itemsOf(repsData).find(
      (r) => Array.isArray(r.initiatives) && r.initiatives.includes(initiativeId),
    ) || null
  );
}
