const https = require('node:https');

const targets = [
  ['page','https://beachcam.meo.pt/livecams/sao-martinho-do-porto/'],
  ['backoffice-page','https://back-office.beachcam.pt/livecams/sao-martinho-do-porto/'],
  ['backoffice-root','https://back-office.beachcam.pt/'],
  ['hls-1','https://video-auth1.iol.pt/beachcam/saomartinhodoporto/playlist.m3u8'],
  ['hls-2','https://video-auth1.iol.pt/beachcam/saomartinhoporto/playlist.m3u8'],
  ['hls-3','https://video-auth1.iol.pt/beachcam/bcsaomartinhodoporto/playlist.m3u8']
];

function request(label,url){
  return new Promise(resolve=>{
    const req=https.get(url,{headers:{
      'user-agent':'Mozilla/5.0',
      'referer':'https://beachcam.meo.pt/',
      'origin':'https://luisftsilva.github.io'
    }},res=>{
      let body='';
      res.setEncoding('utf8');
      res.on('data',c=>{if(body.length<30000) body+=c;});
      res.on('end',()=>{
        console.log(`TARGET ${label}`);
        console.log(`URL ${url}`);
        console.log(`STATUS ${res.statusCode}`);
        console.log(`LOCATION ${res.headers.location||''}`);
        console.log(`CONTENT-TYPE ${res.headers['content-type']||''}`);
        console.log(`ACAO ${res.headers['access-control-allow-origin']||''}`);
        console.log(`X-FRAME ${res.headers['x-frame-options']||''}`);
        console.log(`CSP ${res.headers['content-security-policy']||''}`);
        console.log(`BODY ${body.slice(0,12000).replace(/\s+/g,' ')}`);
        resolve();
      });
    });
    req.on('error',e=>{console.log(`TARGET ${label}\nERROR ${e.message}`);resolve();});
    req.setTimeout(15000,()=>req.destroy(new Error('timeout')));
  });
}
(async()=>{for(const [label,url] of targets) await request(label,url);})();
