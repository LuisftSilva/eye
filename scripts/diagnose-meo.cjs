const https = require('node:https');

const targets = [
  ['page','https://beachcam.meo.pt/livecams/sao-martinho-do-porto/'],
  ['backoffice-page','https://back-office.beachcam.pt/livecams/sao-martinho-do-porto/'],
  ['hls-1','https://video-auth1.iol.pt/beachcam/saomartinhodoporto/playlist.m3u8'],
  ['hls-2','https://video-auth1.iol.pt/beachcam/saomartinhoporto/playlist.m3u8'],
  ['hls-3','https://video-auth1.iol.pt/beachcam/bcsaomartinhodoporto/playlist.m3u8']
];

function request(label,url){
  return new Promise(resolve=>{
    const req=https.get(url,{headers:{'user-agent':'Mozilla/5.0','referer':'https://beachcam.meo.pt/','origin':'https://luisftsilva.github.io'}},res=>{
      let body='';res.setEncoding('utf8');res.on('data',c=>body+=c);res.on('end',()=>{
        console.log(`TARGET ${label}`);console.log(`URL ${url}`);console.log(`STATUS ${res.statusCode}`);
        console.log(`ACAO ${res.headers['access-control-allow-origin']||''}`);console.log(`X-FRAME ${res.headers['x-frame-options']||''}`);console.log(`CSP ${res.headers['content-security-policy']||''}`);
        if(label==='backoffice-page'){
          const patterns=[/https?:[^"'\s<>]+/gi,/[^\s"']+\.m3u8[^\s"']*/gi,/data-[a-z0-9_-]+=["'][^"']+["']/gi,/video-auth[^"'\s<>]*/gi,/playlist[^"'\s<>]*/gi,/stream[^"'\s<>]{0,200}/gi,/player[^"'\s<>]{0,200}/gi];
          const found=new Set();for(const re of patterns){for(const m of body.matchAll(re))found.add(m[0]);}
          console.log('EXTRACTED_START');for(const item of [...found].filter(x=>/m3u8|video|stream|player|livecam|beachcam|iol\.pt|data-/i.test(x)))console.log(item.slice(0,1000));console.log('EXTRACTED_END');
        } else console.log(`BODY ${body.slice(0,1000).replace(/\s+/g,' ')}`);
        resolve();
      });
    });req.on('error',e=>{console.log(`TARGET ${label}\nERROR ${e.message}`);resolve();});req.setTimeout(15000,()=>req.destroy(new Error('timeout')));
  });
}
(async()=>{for(const [label,url] of targets)await request(label,url);})();
