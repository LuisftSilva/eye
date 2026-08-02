const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function load(){
  const context={console,URL,setTimeout,clearTimeout,location:{href:'https://luisftsilva.github.io/eye/',hostname:'luisftsilva.github.io'},document:{getElementById(){return null;}},window:{EyePlayback:{resolve:()=>({type:'none'}),load:()=>{}}}};
  context.window=context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('meo-smart-player.js','utf8'),context,{filename:'meo-smart-player.js'});
  return context.EyeMeo;
}

const meo=load();

test('São Martinho do Porto resolves to the verified official MEO HLS stream',()=>{
  const urls=meo.candidates({name:'São Martinho do Porto',provider:'MEO Beachcam',sourceUrl:'https://beachcam.meo.pt/livecams/sao-martinho-do-porto/'});
  assert.equal(urls[0],'https://video-auth1.iol.pt/auth-beachcam/bcsaomartinho/playlist.m3u8');
  assert.ok(urls.length>=2);
});

test('MEO pages generate auth-beachcam and legacy fallback candidates from the page slug',()=>{
  const urls=meo.candidates({name:'Praia de Teste',provider:'MEO Beachcam',sourceUrl:'https://beachcam.meo.pt/livecams/praia-de-teste/'});
  assert.ok(urls.includes('https://video-auth1.iol.pt/auth-beachcam/praiadeteste/playlist.m3u8'));
  assert.ok(urls.includes('https://video-auth1.iol.pt/beachcam/teste/playlist.m3u8'));
});

test('non-MEO cameras are not intercepted',()=>{
  assert.equal(meo.isMeo({provider:'YouTube',sourceUrl:'https://youtube.com/watch?v=x'}),false);
});
