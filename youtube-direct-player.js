(()=>{
  'use strict';

  const clean=value=>String(value||'').trim();
  const safeUrl=value=>{try{return new URL(clean(value),location.href);}catch{return null;}};

  function youtubeTarget(value){
    const url=safeUrl(value);
    if(!url)return null;
    const host=url.hostname.replace(/^www\./,'').toLowerCase();
    if(host!=='youtube.com'&&host!=='m.youtube.com'&&host!=='youtube-nocookie.com'&&host!=='youtu.be')return null;

    let videoId='';
    let channelId='';

    if(host==='youtu.be')videoId=url.pathname.split('/').filter(Boolean)[0]||'';
    else{
      videoId=url.searchParams.get('v')||url.pathname.match(/\/(?:embed|live|shorts)\/([^/?]+)/i)?.[1]||'';
      channelId=url.pathname.match(/\/channel\/(UC[\w-]+)/i)?.[1]||url.searchParams.get('channel')||'';
    }

    if(videoId){
      return{
        embed:`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&mute=1&playsinline=1&rel=0`,
        page:`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
        kind:'video'
      };
    }

    if(channelId){
      return{
        embed:`https://www.youtube-nocookie.com/embed/live_stream?channel=${encodeURIComponent(channelId)}&autoplay=1&mute=1&playsinline=1&rel=0`,
        page:`https://www.youtube.com/channel/${encodeURIComponent(channelId)}/live`,
        kind:'channel-live'
      };
    }

    if(url.pathname.includes('/@')&&url.pathname.endsWith('/live')){
      return{embed:'',page:url.href,kind:'handle-live'};
    }

    return null;
  }

  function cameraYoutube(camera){
    const values=[camera?.embedUrl,camera?.sourceUrl,camera?.youtubeUrl,camera?.streamUrl];
    for(const value of values){
      const target=youtubeTarget(value);
      if(target)return target;
    }
    return null;
  }

  const baseResolve=window.EyePlayback?.resolve;
  const baseLoad=window.EyePlayback?.load;

  function resolve(camera){
    const youtube=cameraYoutube(camera);
    if(youtube?.embed)return{type:'iframe',url:youtube.embed,provider:'YouTube',pageUrl:youtube.page};
    return baseResolve?baseResolve(camera):{type:'none',url:''};
  }

  function load(camera){
    const youtube=cameraYoutube(camera);
    if(youtube?.embed){
      const frame=document.getElementById('cameraFrame');
      const video=document.getElementById('cameraVideo');
      const snapshot=document.getElementById('cameraSnapshot');
      const fallback=document.getElementById('videoFallback');
      if(window.state?.hls){try{state.hls.destroy();}catch{}state.hls=null;}
      if(video){video.pause();video.removeAttribute('src');video.load();video.classList.add('hidden');}
      if(snapshot){snapshot.removeAttribute('src');snapshot.classList.add('hidden');}
      if(frame){
        frame.src=youtube.embed;
        frame.classList.remove('hidden');
        frame.setAttribute('allow','autoplay; encrypted-media; fullscreen; picture-in-picture');
      }
      fallback?.classList.add('hidden');
      return;
    }
    if(baseLoad)return baseLoad(camera);
  }

  window.EyePlayback={...(window.EyePlayback||{}),resolve,load};
  try{loadViewer=load;}catch{}

  try{
    const originalOpenCamera=openCamera;
    openCamera=function(camera){
      originalOpenCamera(camera);
      const youtube=cameraYoutube(camera);
      if(!youtube)return;
      const button=document.getElementById('openSource');
      if(button){
        button.href=youtube.page;
        button.textContent='Abrir direto no YouTube ↗';
        button.removeAttribute('aria-disabled');
      }
      const provider=document.getElementById('viewerProvider');
      if(provider&&!/youtube/i.test(provider.textContent))provider.textContent=`${provider.textContent} · YouTube`;
      const verification=document.getElementById('viewerVerification');
      if(verification)verification.textContent=youtube.embed?'YouTube Live incorporado':'YouTube Live — abrir na origem';
      if(youtube.embed)load(camera);
    };
  }catch{}

  window.EyeYouTube={parse:youtubeTarget,fromCamera:cameraYoutube};
})();
