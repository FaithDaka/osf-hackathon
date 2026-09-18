// Bundled-vs-remote knowledge-base version check.
// Fully synchronous and fetch-free: the caller injects the remote version
// (for the PoC, the same file re-imported to simulate a CDN copy).
// Last-seen version persists in localStorage('ac_version').

const VERSION_KEY = 'ac_version';

function normalize(versionOrDoc) {
  if (versionOrDoc == null) return null;
  if (typeof versionOrDoc === 'string') return versionOrDoc;
  if (typeof versionOrDoc === 'object' && typeof versionOrDoc.version === 'string') {
    return versionOrDoc.version;
  }
  return null;
}

function remember(version) {
  try {
    if (version != null && typeof localStorage !== 'undefined') {
      localStorage.setItem(VERSION_KEY, version);
    }
  } catch {
    // Storage unavailable — comparison result is still returned.
  }
}

export function checkVersion(bundledVersion, remoteVersionOrDoc) {
  const bundled = normalize(bundledVersion);
  const remote = normalize(remoteVersionOrDoc);

  if (remote == null) {
    // Nothing to compare against; record what we ship.
    remember(bundled);
    return { outdated: false };
  }

  remember(remote);
  if (bundled !== remote) {
    return { outdated: true, newVersion: remote };
  }
  return { outdated: false };
}

export function getLastSeenVersion() {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(VERSION_KEY);
    }
  } catch {
    // Ignore storage errors.
  }
  return null;
}
