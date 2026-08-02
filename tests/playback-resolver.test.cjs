const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadResolver() {
  const code = fs.readFileSync('unified-player.js', 'utf8');
  const elements = new Map();
  const document = {
    getElementById(id) { return elements.get(id) || null; },
    createElement() {
      return {
        className: '',
        classList: { add() {}, remove() {} },
        removeAttribute() {},
        setAttribute() {},
      };
    },
  };
  const context = {
    console,
    URL,
    setTimeout,
    clearTimeout,
    location: { href: 'https://luisftsilva.github.io/eye/', hostname: 'luisftsilva.github.io' },
    document,
    window: {},
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(code, context, { filename: 'unified-player.js' });
  return context.window.EyePlayback.resolve;
}

const resolve = loadResolver();

test('resolves a direct HLS stream before other sources', () => {
  const result = resolve({ embedUrl: 'https://example.com/live/stream.m3u8', sourceUrl: 'https://youtube.com/watch?v=abc' });
  assert.equal(result.type, 'hls');
  assert.equal(result.url, 'https://example.com/live/stream.m3u8');
});

test('resolves standard YouTube watch URL to privacy-enhanced embed', () => {
  const result = resolve({ sourceUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
  assert.equal(result.type, 'iframe');
  assert.equal(result.provider, 'YouTube');
  assert.match(result.url, /^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/);
});

test('resolves YouTube live URL directly in the card', () => {
  const result = resolve({ sourceUrl: 'https://www.youtube.com/live/abcdefghijk' });
  assert.equal(result.type, 'iframe');
  assert.equal(result.provider, 'YouTube');
  assert.match(result.url, /\/embed\/abcdefghijk\?/);
});

test('resolves youtu.be links', () => {
  const result = resolve({ embedUrl: 'https://youtu.be/abcdefghijk' });
  assert.equal(result.type, 'iframe');
  assert.equal(result.provider, 'YouTube');
});

test('does not treat the generic WorldCam Portugal directory as playable', () => {
  const result = resolve({ sourceUrl: 'https://worldcam.eu/webcams/europe/portugal' });
  assert.equal(result.type, 'none');
});

test('resolves a Windy webcam page to the Windy embed player', () => {
  const result = resolve({ sourceUrl: 'https://www.windy.com/webcams/1609780783' });
  assert.equal(result.type, 'iframe');
  assert.equal(result.provider, 'Windy');
  assert.match(result.url, /webcamId=1609780783/);
});

test('resolves direct image webcams', () => {
  const result = resolve({ embedUrl: 'https://example.com/latest.jpg' });
  assert.deepEqual(result, { type: 'image', url: 'https://example.com/latest.jpg' });
});
