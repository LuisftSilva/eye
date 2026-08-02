const fs = require('node:fs');
const path = require('node:path');
const { setTimeout: sleep } = require('node:timers/promises');

const ROOT = path.resolve(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/public-webcam-sources.json'), 'utf8'));
const cameras = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/cameras.json'), 'utf8'));
const outDir = path.join(ROOT, 'reports');
fs.mkdirSync(outDir, { recursive: true });

const existing = new Set();
for (const camera of cameras) {
  for (const value of [camera.sourceUrl, camera.embedUrl, camera.streamUrl, camera.youtubeUrl]) {
    if (value) existing.add(normalizeUrl(value));
  }
}

function normalizeUrl(value) {
  try {
    const u = new URL(String(value));
    u.hash = '';
    return u.href.replace(/\/$/, '');
  } catch {
    return '';
  }
}

function isIpLiteral(host) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || host.includes(':');
}

function isPrivateHost(host) {
  if (!isIpLiteral(host)) return false;
  if (/^10\./.test(host) || /^127\./.test(host) || /^192\.168\./.test(host)) return true;
  const m = host.match(/^172\.(\d+)\./);
  return Boolean(m && Number(m[1]) >= 16 && Number(m[1]) <= 31);
}

function looksLikeCameraUrl(url) {
  const s = url.toLowerCase();
  return /(?:webcam|livecam|livecams|camera|cams|playlist\.m3u8|\.mp4(?:\?|$)|youtube\.com\/(?:watch|live|embed)|youtu\.be\/|twitch\.tv\/)/.test(s);
}

function isUnsafeCandidate(url) {
  try {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol)) return true;
    if (isIpLiteral(u.hostname) || isPrivateHost(u.hostname)) return true;
    const s = `${u.pathname}${u.search}`.toLowerCase();
    return /(?:login|signin|admin|onvif|cgi-bin|snapshot\.cgi|axis-cgi|config|password|auth=)/.test(s);
  } catch {
    return true;
  }
}

function extractUrls(html, baseUrl) {
  const found = new Set();
  const patterns = [
    /(?:href|src|data-video-url|data-src|content)=["']([^"']+)["']/gi,
    /https?:\\?\/\\?\/[^\s"'<>]+/gi
  ];
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const raw = String(match[1] || match[0]).replace(/&amp;/g, '&').replace(/\\\//g, '/');
      try {
        found.add(new URL(raw, baseUrl).href);
      } catch {}
    }
  }
  return [...found];
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs || 15000);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'Eye-Public-Webcam-Discovery/1.0 (+https://github.com/LuisftSilva/eye)',
        accept: 'text/html,application/xhtml+xml,application/vnd.apple.mpegurl;q=0.9,*/*;q=0.5'
      }
    });
    const body = await response.text();
    return { ok: response.ok, status: response.status, url: response.url, headers: Object.fromEntries(response.headers), body };
  } catch (error) {
    return { ok: false, status: 0, url, headers: {}, body: '', error: error.message };
  } finally {
    clearTimeout(timer);
  }
}

async function discoverSource(source) {
  const allowed = new Set(source.allowedHosts || []);
  const queue = [source.url];
  const visited = new Set();
  const candidates = [];
  const errors = [];

  while (queue.length && visited.size < (config.maxPagesPerSource || 40)) {
    const current = queue.shift();
    const normalized = normalizeUrl(current);
    if (!normalized || visited.has(normalized)) continue;
    visited.add(normalized);

    const result = await fetchText(current);
    if (!result.ok) {
      errors.push({ source: source.name, url: current, status: result.status, error: result.error || '' });
      await sleep(config.requestDelayMs || 750);
      continue;
    }

    const urls = extractUrls(result.body, result.url);
    for (const url of urls) {
      let parsed;
      try { parsed = new URL(url); } catch { continue; }
      const sameAllowedHost = allowed.has(parsed.hostname);
      const candidate = looksLikeCameraUrl(url) && !isUnsafeCandidate(url);
      if (candidate) {
        const normalizedCandidate = normalizeUrl(url);
        candidates.push({
          source: source.name,
          page: result.url,
          url,
          existing: existing.has(normalizedCandidate),
          kind: /\.m3u8(?:\?|$)/i.test(url) ? 'hls' : /youtube|youtu\.be/i.test(url) ? 'youtube' : /\.mp4(?:\?|$)/i.test(url) ? 'video' : 'page'
        });
      }
      if (sameAllowedHost && /(?:livecam|webcam|camera|cams)/i.test(parsed.pathname) && !visited.has(normalizeUrl(url))) {
        queue.push(url);
      }
    }
    await sleep(config.requestDelayMs || 750);
  }
  return { candidates, errors, pagesVisited: visited.size };
}

async function validateExisting() {
  const results = [];
  const unique = [...existing].filter(Boolean);
  for (const url of unique) {
    const result = await fetchText(url);
    results.push({ url, status: result.status, ok: result.ok, finalUrl: result.url, error: result.error || '' });
    await sleep(Math.max(250, Math.floor((config.requestDelayMs || 750) / 2)));
  }
  return results;
}

(async () => {
  const discovered = [];
  const sourceErrors = [];
  const sourceStats = [];
  for (const source of config.sources) {
    const result = await discoverSource(source);
    discovered.push(...result.candidates);
    sourceErrors.push(...result.errors);
    sourceStats.push({ source: source.name, pagesVisited: result.pagesVisited, candidates: result.candidates.length, errors: result.errors.length });
  }

  const deduped = [...new Map(discovered.map(item => [normalizeUrl(item.url), item])).values()];
  const newCandidates = deduped.filter(item => !item.existing);
  const validation = await validateExisting();
  const broken = validation.filter(item => !item.ok || item.status >= 400);
  const generatedAt = new Date().toISOString();

  const report = { generatedAt, policy: 'Passive discovery from explicitly configured public pages only. No IP scanning, authentication attempts or private-network access.', sourceStats, newCandidates, sourceErrors, brokenExisting: broken };
  fs.writeFileSync(path.join(outDir, 'public-webcam-discovery.json'), JSON.stringify(report, null, 2));

  const lines = [
    '# Public webcam discovery report', '',
    `Generated: ${generatedAt}`, '',
    'Passive discovery only. No IP ranges were scanned and no authentication was attempted.', '',
    '## Source summary', '',
    '| Source | Pages | Candidates | Errors |', '|---|---:|---:|---:|',
    ...sourceStats.map(s => `| ${s.source} | ${s.pagesVisited} | ${s.candidates} | ${s.errors} |`), '',
    `## New candidates (${newCandidates.length})`, '',
    ...newCandidates.slice(0, 200).map(c => `- [${c.kind}] ${c.url} — found on ${c.page}`), '',
    `## Broken existing links (${broken.length})`, '',
    ...broken.slice(0, 200).map(b => `- ${b.status || 'network error'} — ${b.url}${b.error ? ` — ${b.error}` : ''}`)
  ];
  fs.writeFileSync(path.join(outDir, 'public-webcam-discovery.md'), lines.join('\n'));

  console.log(JSON.stringify({ generatedAt, newCandidates: newCandidates.length, brokenExisting: broken.length, sourceErrors: sourceErrors.length }, null, 2));
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
