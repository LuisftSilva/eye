(()=>{
  'use strict';

  const HLS_RE=/\.m3u8(?:$|[?#])/i;
  const VIDEO_RE=/\.(?:mp4|webm|ogg)(?:$|[?#])/i;
  const IMAGE_RE=/\.(?:jpe?g|png|webp|gif)(?:$|[?#])/i;
  const GENERIC_PATHS=new Set(['','/','/livecams','/webcams','/webcams/europe/portugal']);
  let frameTimer=null;

  const byId=id=>document.getElementById(id);
  const clean=value=>String(value||'').trim();

  function ensureSnapshot(){
    const stage=byId('videoStage');
    if(!stage)return null;
    let image=byId('cameraSnapshot');
    if(!image){
      image=document.createElement('img');
      image.id='cameraSnapshot';
      image.className='camera-frame hidden';
      image.alt='Imagem atual da webcam';
      image.decoding='async';
      image.referrerPolicy='no-referrer';
      stage.insertBefore(image,byId('videoFallback'));
    }
    return image;
  }

  function hideAll(){
    clearTimeout(frameTimer);
    frameTimer=null;
    const image=ensureSnapshot();
    if(image){image.removeAttribute('src');image.classList.add('hidden');}
    const frame=byId('cameraFrame');
    if(frame){frame.src='about:blank';frame.classList.add('hidden');frame.onload=null;frame.onerror=null;}
    const video=byId('cameraVideo');
    if(video){video.pause();video.removeAttribute('src');video.load();video.classList.add('hidden');}
    if(window.state&&state.hls){try{state.hls.destroy();}catch{}state.hls=null;}
  }

  function fallback(message){
    const box=byId('videoFallback');
    if(!box)return;
    box.classList.remove('hidden');
    const strong=box.querySelector('strong');
    if(strong)strong.textContent=message||'Transmissão indisponível no cartão';
  }

  function hideFallback(){byId('videoFallback')?.classList.add('hidden');}

  function safeUrl(value){
    try{return new URL(clean(value),location.href);}catch{return null;}
  }

  function isGeneric(value){
    const url=safeUrl(value);
    if(!url)return false;
    const host=url.hostname.replace(/^www\./,'');
    const path=url.pathname.replace(/\/+$/,'');
    if(host==='worldcam.eu'&&GENERIC_PATHS.has(path))return true;
    if(['beachcam.meo.pt','back-office.beachcam.pt'].includes(host)&&['','/','/livecams','/praias'].includes(path))return true;
    return false;
  }

  function youtubeEmbed(value){
    const url=safeUrl(value);if(!url)return '';
    let id='';
    if(url.hostname.includes('youtu.be'))id=url.pathname.split('/').filter(Boolean)[0]||'';
    if(url.hostname.includes('youtube.com'))id=url.searchParams.get('v')||url.pathname.match(/\/(?:embed|live|shorts)\/([^/?]+)/)?.[1]||'';
    return id?`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&playsinline=1`:'';
  }

  function twitchEmbed(value){
    const url=safeUrl(value);if(!url||!url.hostname.includes('twitch.tv'))return '';
    const parts=url.pathname.split('/').filter(Boolean);
    const channel=parts[0];
    if(!channel||['videos','directory'].includes(channel))return '';
    return `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${encodeURIComponent(location.hostname)}&muted=true&autoplay=true`;
  }

  function meoHls(camera){
    const values=[camera.embedUrl,camera.sourceUrl,camera.name].map(clean);
    for(const value of values){
      const url=safeUrl(value);
      if(url&&url.hostname.includes('video-auth1.iol.pt')&&HLS_RE.test(url.href))return url.href;
      const slug=url?.pathname.match(/\/livecams\/([^/]+)/i)?.[1];
      if(slug)return `https://video-auth1.iol.pt/beachcam/${slug.replace(/-/g,'')}/playlist.m3u8`;
    }
    return '';
  }

  function windyEmbed(value){
    const url=safeUrl(value);if(!url)return '';
    if(url.hostname==='webcams.windy.com'&&url.pathname.includes('/embed/player'))return url.href;
    const id=url.pathname.match(/\/webcams\/(\d+)/)?.[1]||url.searchParams.get('webcamId');
    return id?`https://webcams.windy.com/webcams/public/embed/player?webcamId=${encodeURIComponent(id)}&playerType=day&autoplay=true&loop=true&interactive=true`:'';
  }

  function resolve(camera){
    const embed=clean(camera.embedUrl);
    const source=clean(camera.sourceUrl);
    const candidates=[embed,source].filter(Boolean);

    for(const value of candidates)if(HLS_RE.test(value))return{type:'hls',url:value};
    if(/meo beachcam/i.test(clean(camera.provider))){const value=meoHls(camera);if(value)return{type:'hls',url:value};}
    for(const value of candidates)if(VIDEO_RE.test(value))return{type:'video',url:value};
    for(const value of candidates)if(IMAGE_RE.test(value))return{type:'image',url:value};
    for(const value of candidates){const value2=youtubeEmbed(value);if(value2)return{type:'iframe',url:value2,provider:'YouTube'};}
    for(const value of candidates){const value2=twitchEmbed(value);if(value2)return{type:'iframe',url:value2,provider:'Twitch'};}
    for(const value of candidates){const value2=windyEmbed(value);if(value2)return{type:'iframe',url:value2,provider:'Windy'};}
    for(const value of candidates){
      const url=safeUrl(value);if(!url)continue;
      const host=url.hostname.replace(/^www\./,'');
      if(host==='www.netmadeira.com'||host==='netmadeira.com'){
        const slug=url.pathname.match(/\/webcams-madeira\/([^/]+)/)?.[1];
        if(slug)return{type:'iframe',url:`https://www.netmadeira.com/webcams/show/netmadeira/${slug}`,provider:'NetMadeira'};
      }
      if(host.includes('spotazores.com')||host.includes('visitazores.com'))return{type:'iframe',url:url.href,provider:'SpotAzores'};
      if(host.includes('earthcam.com'))return{type:'iframe',url:url.href,provider:'EarthCam'};
    }
    if(embed&&!isGeneric(embed))return{type:'iframe',url:embed,provider:'Fonte incorporada'};
    return{type:'none',url:''};
  }

  function playHls(url){
    const video=byId('cameraVideo');if(!video)return;
    video.classList.remove('hidden');hideFallback();
    const start=()=>video.play().catch(()=>{});
    if(video.canPlayType('application/vnd.apple.mpegurl')){video.src=url;video.addEventListener('loadedmetadata',start,{once:true});return;}
    if(window.Hls&&Hls.isSupported()){
      const hls=new Hls({enableWorker:true,lowLatencyMode:true,liveSyncDurationCount:3,manifestLoadingTimeOut:12000,levelLoadingTimeOut:12000,fragLoadingTimeOut:15000});
      if(window.state)state.hls=hls;
      hls.loadSource(url);hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED,start);
      hls.on(Hls.Events.ERROR,(_,data)=>{if(data.fatal){try{hls.destroy();}catch{}if(window.state)state.hls=null;video.classList.add('hidden');fallback('O stream direto não respondeu');}});
      return;
    }
    video.classList.add('hidden');fallback('Este navegador não suporta o stream em direto');
  }

  function playVideo(url){
    const video=byId('cameraVideo');if(!video)return;
    video.src=url;video.classList.remove('hidden');hideFallback();video.play().catch(()=>{});
    video.onerror=()=>{video.classList.add('hidden');fallback('O vídeo não respondeu');};
  }

  function playImage(url){
    const image=ensureSnapshot();if(!image)return;
    image.src=url+(url.includes('?')?'&':'?')+`_=${Date.now()}`;
    image.classList.remove('hidden');hideFallback();
    image.onerror=()=>{image.classList.add('hidden');fallback('A imagem atual da câmara não respondeu');};
  }

  function playFrame(url,provider){
    const frame=byId('cameraFrame');if(!frame)return;
    let loaded=false;
    frame.onload=()=>{loaded=true;clearTimeout(frameTimer);};
    frame.onerror=()=>{frame.classList.add('hidden');fallback(`${provider||'A fonte'} bloqueou a reprodução no cartão`);};
    frame.src=url;frame.classList.remove('hidden');hideFallback();
    frameTimer=setTimeout(()=>{if(!loaded){frame.classList.add('hidden');frame.src='about:blank';fallback(`${provider||'A fonte'} não respondeu no cartão`);}},12000);
  }

  function unifiedLoadViewer(camera){
    hideAll();
    if(String(camera.status||'').toLowerCase()==='offline'){fallback('Câmara marcada como offline');return;}
    fallback('A carregar transmissão');
    const target=resolve(camera);
    if(target.type==='hls')return playHls(target.url);
    if(target.type==='video')return playVideo(target.url);
    if(target.type==='image')return playImage(target.url);
    if(target.type==='iframe')return playFrame(target.url,target.provider);
    fallback('Esta fonte não disponibiliza um vídeo incorporável');
  }

  window.EyePlayback={resolve,load:unifiedLoadViewer};
  try{loadViewer=unifiedLoadViewer;}catch{}
})();
