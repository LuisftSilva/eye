const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('Fátima exposes two distinct official YouTube live cards',()=>{
  const src=fs.readFileSync('data/cameras-fatima-youtube.js','utf8');
  assert.match(src,/fatima-capelinha-youtube/);
  assert.match(src,/GENH9mWlvb4/);
  assert.match(src,/fatima-recinto-youtube/);
  assert.match(src,/sN837AyNVcU/);
  assert.match(src,/youtube\.com\/watch\?v=GENH9mWlvb4/);
  assert.match(src,/youtube\.com\/watch\?v=sN837AyNVcU/);
});

test('Fátima camera source is loaded before app initialization',()=>{
  const html=fs.readFileSync('index.html','utf8');
  const fatima=html.indexOf('data/cameras-fatima-youtube.js');
  const app=html.indexOf('app.js');
  assert.ok(fatima>=0,'Fátima source missing from index.html');
  assert.ok(app>fatima,'Fátima source must load before app.js');
});
