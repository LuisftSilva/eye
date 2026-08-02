const fs = require('node:fs');
const path = require('node:path');

const errors = [];
const warnings = [];
const html = fs.readFileSync('index.html', 'utf8');

const scriptSources = [...html.matchAll(/<script\s+[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi)].map(m => m[1]);
const localScripts = scriptSources.filter(src => !/^https?:\/\//i.test(src)).map(src => src.split('?')[0]);

for (const script of localScripts) {
  if (!fs.existsSync(script)) errors.push(`index.html references missing script: ${script}`);
}

const appIndex = localScripts.indexOf('app.js');
const playerIndex = localScripts.indexOf('unified-player.js');
if (playerIndex < 0) errors.push('unified-player.js is not loaded by index.html');
if (appIndex < 0) errors.push('app.js is not loaded by index.html');
if (playerIndex >= 0 && appIndex >= 0 && playerIndex < appIndex) {
  errors.push('unified-player.js must load after app.js so it can replace loadViewer safely');
}

const requiredIds = ['map', 'viewer', 'cameraVideo', 'cameraFrame', 'videoFallback', 'openSource'];
for (const id of requiredIds) {
  if (!new RegExp(`id=["']${id}["']`).test(html)) errors.push(`Missing required DOM element #${id}`);
}

const genericPatterns = [
  ['WorldCam Portugal directory', /sourceUrl\s*:\s*["']https:\/\/worldcam\.eu\/webcams\/europe\/portugal(?:\/)?["']/g],
  ['MEO Beachcam homepage', /sourceUrl\s*:\s*["']https:\/\/(?:back-office\.)?beachcam\.meo\.pt\/?["']/g],
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.isFile() && /\.(?:js|json)$/.test(entry.name)) files.push(full);
  }
  return files;
}

for (const file of walk('data')) {
  const content = fs.readFileSync(file, 'utf8');
  for (const [label, pattern] of genericPatterns) {
    const count = [...content.matchAll(pattern)].length;
    if (count) warnings.push(`${file}: ${count} ${label} link(s) remain in source data; runtime overrides must remove them`);
  }
}

if (!/window\.EyePlayback\s*=/.test(fs.readFileSync('unified-player.js', 'utf8'))) {
  errors.push('unified-player.js does not export window.EyePlayback');
}

for (const warning of warnings) console.warn(`WARNING: ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`ERROR: ${error}`);
  process.exit(1);
}
console.log(`Site audit passed: ${localScripts.length} local scripts and ${requiredIds.length} required DOM elements checked.`);
