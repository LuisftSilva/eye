(()=>{
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const byId=new Map(Object.entries({
    'worldcam-ferreira-lago-azul':{provider:'MEO Beachcam',sourceUrl:'https://beachcam.meo.pt/livecams/ferreira-do-zezere-lago-azul/',status:'online',verification:'original-provider'},
    'worldcam-cabril-river-beach':{provider:'MEO Beachcam',sourceUrl:'https://beachcam.meo.pt/livecams/praia-fluvial-do-cabril/',status:'online',verification:'original-provider'},
    'worldcam-nazare-forte':{provider:'MEO Beachcam',sourceUrl:'https://beachcam.meo.pt/livecams/nazare-forte-sao-miguel-arcanjo/',status:'online',verification:'original-provider'},
    'worldcam-lisbon-bugio':{provider:'MEO Beachcam',sourceUrl:'https://beachcam.meo.pt/livecams/farol-do-bugio/',status:'unknown',verification:'original-provider'},
    'worldcam-cascais-ribeira':{provider:'MEO Beachcam',sourceUrl:'https://beachcam.meo.pt/livecams/cascais/',status:'online',verification:'original-provider'},
    'worldcam-sao-pedro-estoril':{provider:'MEO Beachcam',sourceUrl:'https://beachcam.meo.pt/livecams/sao-pedro-do-estoril/',status:'online',verification:'original-provider'},
    'worldcam-ericeira-calada':{provider:'MEO Beachcam',sourceUrl:'https://beachcam.meo.pt/livecams/praia-da-calada/',status:'online',verification:'original-provider'},
    'worldcam-ericeira-matadouro':{provider:'MEO Beachcam',sourceUrl:'https://beachcam.meo.pt/livecams/matadouro/',status:'online',verification:'original-provider'},
    'worldcam-ericeira-praia-sul':{provider:'MEO Beachcam',sourceUrl:'https://beachcam.meo.pt/livecams/praia-do-sul/',status:'online',verification:'original-provider'},
    'worldcam-ericeira-pescadores':{provider:'MEO Beachcam',sourceUrl:'https://beachcam.meo.pt/livecams/pescadores/',status:'online',verification:'original-provider'},
    'worldcam-almograve':{provider:'MEO Beachcam',sourceUrl:'https://beachcam.meo.pt/livecams/almograve/',status:'online',verification:'original-provider'},
    'worldcam-viana-cabedelo':{provider:'FeelViana / Surfline',sourceUrl:'https://www.feelviana.com/webcam',embedUrl:'https://embed.cdn-surfline.com/cams/5a4e62621c60d700101da59a/df316dcb1ad772213e899638a1d57bf115f4ec13',status:'online',verification:'original-embed'},
    'worldcam-portimao-marina':{provider:'PlayOcean / YouTube',sourceUrl:'https://www.playocean.net/en/cameras/portimao-marina-north',embedUrl:'https://www.youtube.com/embed/w7rzgn6WXs8?autoplay=1&mute=1',status:'online',verification:'official-youtube'}
  }));
  const byName=new Map(Object.entries({
    'ferreira do zezere dornes':{provider:'MEO Beachcam',sourceUrl:'https://beachcam.meo.pt/livecams/ferreira-do-zezere-dornes/',status:'online',verification:'original-provider'},
    'viana do castelo feelviana wakepark':{provider:'FeelViana / Surfline',sourceUrl:'https://www.feelviana.com/webcam',embedUrl:'https://embed.cdn-surfline.com/cams/613205b46012d3ad55a4eec5/ba821de41fedcb2cdd9cdc28e95d92e4450dad63',status:'online',verification:'original-embed'}
  }));
  const native=window.fetch.bind(window);
  window.fetch=async(input,init)=>{
    const r=await native(input,init),url=typeof input==='string'?input:input?.url||'';
    if(!url.includes('data/cameras.json')||!r.ok)return r;
    const data=(await r.clone().json()).map(camera=>{
      const patch=byId.get(String(camera.id))||byName.get(norm(camera.name));
      return patch?{...camera,...patch,verifiedAt:'2026-08-02',uniqueFeed:true}:camera;
    });
    return new Response(JSON.stringify(data),{status:r.status,statusText:r.statusText,headers:{'Content-Type':'application/json'}});
  };
})();
