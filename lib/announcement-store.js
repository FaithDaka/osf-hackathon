// Announcement selectors over bundled data/announcements.json.
// National items are always relevant, so district views include them.
// Pure functions; no network, no storage.

function itemsOf(announcementsData) {
  if (!announcementsData || !Array.isArray(announcementsData.items)) return [];
  return announcementsData.items;
}

function inDistrict(item, district) {
  if (!district) return true;
  return item.district === district || item.district === 'national';
}

function byPublishedDesc(a, b) {
  return new Date(b.published).getTime() - new Date(a.published).getTime();
}

export function getAnnouncements(announcementsData, district) {
  return itemsOf(announcementsData).filter((i) => inDistrict(i, district)).sort(byPublishedDesc);
}

export function getActiveAnnouncements(announcementsData, district) {
  const now = Date.now();
  return itemsOf(announcementsData)
    .filter((i) => inDistrict(i, district) && new Date(i.end).getTime() > now)
    .sort(byPublishedDesc);
}
