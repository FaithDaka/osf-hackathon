// localStorage-based complaint storage. No network. No dependencies.
// All storage access is guarded so the module imports cleanly during SSR.

const STORE_KEY = 'ac_complaints';
const SLA_HOURS = 72;

function readAll() {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(complaints) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORE_KEY, JSON.stringify(complaints));
    }
  } catch {
    // Storage full or unavailable — complaint object is still returned.
  }
}

function code(value, fallback) {
  const s = String(value || '').trim().toUpperCase();
  if (!s) return fallback;
  return (s.replace(/[^A-Z]/g, '').slice(0, 3) || fallback).padEnd(3, 'X');
}

export function generateRef(district, subcounty) {
  const districtCode = code(district, 'XXX');
  const subcountyCode = code(subcounty, 'XXX');
  const year = new Date().getFullYear();
  const sequence = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  // e.g. "MKO-KGB-2025-0042"
  return `${districtCode}-${subcountyCode}-${year}-${sequence}`;
}

export function fileComplaint({ category, description, district, subcounty, lang }) {
  const filedAt = new Date();
  const deadline = new Date(filedAt.getTime() + SLA_HOURS * 60 * 60 * 1000);
  const complaint = {
    ref: generateRef(district, subcounty),
    category: category || 'other',
    description: description || '',
    district: district || '',
    subcounty: subcounty || '',
    lang: lang || 'en',
    status: 'OPEN',
    filed_at: filedAt.toISOString(),
    deadline: deadline.toISOString(),
    escalation_history: [],
  };
  const all = readAll();
  all.push(complaint);
  writeAll(all);
  return complaint;
}

export function getComplaint(ref) {
  if (!ref) return null;
  const found = readAll().find((c) => c.ref === ref);
  return found || null;
}

export function getAllComplaints() {
  return readAll();
}

export function updateComplaint(ref, patch) {
  // Merge `patch` into the stored complaint (used by the PoC simulated
  // escalation timers). Returns the updated complaint or null.
  if (!ref || !patch || typeof patch !== 'object') return null;
  const all = readAll();
  const index = all.findIndex((c) => c.ref === ref);
  if (index === -1) return null;
  const updated = { ...all[index], ...patch };
  all[index] = updated;
  writeAll(all);
  return updated;
}

export function escalateComplaint(ref) {
  const all = readAll();
  const index = all.findIndex((c) => c.ref === ref);
  if (index === -1) return null;
  const complaint = all[index];
  if (complaint.status === 'OPEN' && new Date(complaint.deadline).getTime() < Date.now()) {
    const updated = {
      ...complaint,
      status: 'ESCALATED',
      escalation_history: [
        ...complaint.escalation_history,
        { level: 2, authority: 'LC2', escalated_at: new Date().toISOString() },
      ],
    };
    all[index] = updated;
    writeAll(all);
    return updated;
  }
  return complaint;
}

export function getComplaintStatus(ref) {
  const complaint = getComplaint(ref);
  if (!complaint) return null;
  if (complaint.status === 'RESOLVED') {
    return {
      status: 'RESOLVED',
      deadline: complaint.deadline,
      currentAuthority: null,
      nextAuthority: null,
    };
  }
  if (complaint.status === 'ESCALATED') {
    const last =
      complaint.escalation_history[complaint.escalation_history.length - 1] || {};
    return {
      status: 'ESCALATED',
      deadline: complaint.deadline,
      currentAuthority: last.authority || 'LC2',
      nextAuthority: 'LC3',
    };
  }
  // OPEN, UNDER REVIEW, or any other active status: still with LC1.
  return {
    status: complaint.status,
    deadline: complaint.deadline,
    currentAuthority: 'LC1',
    nextAuthority: 'LC2',
  };
}
