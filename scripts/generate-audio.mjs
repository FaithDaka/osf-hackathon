// Audio asset manifest + optional rendering for AlertCitizen voice prompts.
// Zero dependencies (Node built-ins only). Never fabricates MP3 bytes.
//
// What it does:
//   1. Collects every spoken key (voice-tree categories, subcounty prompt,
//      all-no fallback, welcome, one per announcement) with its text in
//      en/lg/sw, sourced from data/ + public/i18n (single source of truth).
//   2. Writes public/audio/manifest.json consumed by the SW precache plan
//      and the demo checklist.
//   3. Prints exact TTS recipes. With --render it actually renders ENGLISH
//      prompts using the OS voice (macOS `say`), converting to MP3 only if
//      ffmpeg or lame is installed. Luganda/Swahili need native-speaker
//      recordings — the app already falls back to English speech when an
//      mp3 is absent (see lib/speech.js), so the demo never breaks.
//
// Usage:
//   node scripts/generate-audio.mjs            # manifest + recipes only
//   node scripts/generate-audio.mjs --render   # also render en/*.mp3
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const audioDir = join(root, 'public', 'audio');
const LANGS = ['en', 'lg', 'sw'];
const RENDER = process.argv.includes('--render');

const load = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const voiceTree = load('data/voice-tree.json');
const announcements = load('data/announcements.json');
const i18n = Object.fromEntries(LANGS.map((l) => [l, load(`public/i18n/${l}.json`)]));

// ---- 1. collect keys ----
const entries = [];
entries.push({ key: 'welcome', text: Object.fromEntries(LANGS.map((l) => [l, i18n[l].ivr_welcome])) });
for (const c of voiceTree.categories) {
  entries.push({
    key: c.audio_file,
    text: Object.fromEntries(LANGS.map((l) => [l, (i18n[l].categories || {})[c.id] || c.id])),
  });
}
entries.push({
  key: voiceTree.after_selection.subcounty_prompt.audio_file,
  text: Object.fromEntries(LANGS.map((l) => [l, i18n[l].subcounty_prompt])),
});
entries.push({
  key: voiceTree.all_no.audio_file,
  text: Object.fromEntries(LANGS.map((l) => [l, i18n[l].no_match])),
});
for (const a of announcements.items) {
  entries.push({
    key: `ann_${a.id}`,
    text: Object.fromEntries(LANGS.map((l) => [l, a.title[l] || a.title.en])),
  });
}

// ---- 2. manifest ----
for (const l of LANGS) mkdirSync(join(audioDir, l), { recursive: true });
const manifest = {
  version: '2026.01.15',
  format: 'mp3',
  files: Object.fromEntries(
    LANGS.map((l) => [
      l,
      Object.fromEntries(
        entries.map((e) => [e.key, { text: e.text[l], file: `${e.key}.mp3` }]),
      ),
    ]),
  ),
};
writeFileSync(join(audioDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`manifest: ${entries.length} keys x ${LANGS.length} langs -> public/audio/manifest.json`);

// ---- 3. tooling probe ----
const have = (bin) => {
  try {
    execSync(`command -v ${bin}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};
const say = have('say');
const ffmpeg = have('ffmpeg');
const lame = have('lame');
console.log(`tools: say=${say} ffmpeg=${ffmpeg} lame=${lame}`);

// ---- 4. recipes (+ optional English render) ----
const sh = (s) => `"${s.replace(/"/g, '')}"`;
for (const e of entries) {
  const out = join(audioDir, 'en', `${e.key}.mp3`);
  if (existsSync(out)) {
    console.log(`ok      en/${e.key}.mp3 (exists)`);
    continue;
  }
  if (RENDER && say && (ffmpeg || lame)) {
    const tmp = join(audioDir, 'en', `${e.key}.aiff`);
    execSync(`say -o ${sh(tmp)} ${sh(e.text.en)}`, { stdio: 'ignore' });
    const enc = ffmpeg
      ? `ffmpeg -y -loglevel error -i ${sh(tmp)} ${sh(out)}`
      : `lame --quiet ${sh(tmp)} ${sh(out)}`;
    execSync(enc, { stdio: 'ignore' });
    console.log(`rendered en/${e.key}.mp3`);
  } else {
    console.log(`missing  en/${e.key}.mp3  <-  say -o ${e.key}.aiff ${sh(e.text.en)}`);
  }
}
console.log('lg/sw: record native speakers (no OS voice); app falls back to English speech.');
console.log('done.');
