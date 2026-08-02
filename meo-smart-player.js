(()=>{
  'use strict';

  const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const slugify=s=>normalize(s).replace(/\s+/g,'');
  const pageSlug=value=>{try{return new URL(String(value||''),location.href).pathname.match(/\/livecams\/([^/]+)/i)?.[1]||'';}catch{return '';}};

  const known=new Map(Object.entries({
    'matosinhos':'matosinhos','leca da palmeira':'lecadapalmeira','espinho':'espinho','esmoriz':'esmoriz','furadouro':'furadouro','barra':'aveiro','costa nova':'costanova','figueira da foz':'figueiradafoz','buarcos':'bcfigueiradois','praia do pedrao':'praiapedrogao','praia do pedrogao':'praiapedrogao','sao pedro de moel':'bcsaopedromoel','nazare praia do norte':'canhaonazare','nazare praia':'nazarepraiadavila','sao martinho do porto':'saomartinhodoporto','foz do arelho':'bcfozdoarelho','peniche baleal':'lagide','peniche supertubos':'supertubos','areia branca':'bcareiabranca','santa cruz':'santacruz','ericeira ribeira d ilhas':'ribeiradilhas','ericeira foz do lizandro':'fozdolizandro','praia grande':'praiagrande','guincho':'guincho','carcavelos':'carcavelos','santo amaro de oeiras':'santoamarodeoeiras','costa da caparica':'costacaparicacds','praia da sereia morena':'sereiamorena','fonte da telha':'fontedatelha','sesimbra':'sesimbra','comporta':'bccomporta','carvalhal':'carvalhal','sines':'sines','sao torpes':'saotorpes','porto covo':'portocovo','vila nova de milfontes':'bcfranquia','zambujeira do mar':'zambujeira','odeceixe':'bcodeceixe','arrifana':'arrifana','amado':'bcamado','sagres tonel':'tonel','lagos meia praia':'meiapraia','portimao praia da rocha':'praiadarocha','albufeira':'praiadopeneco','vilamoura':'vilamoura','faro ilha':'bcfaro','tavira':'tavira',
    'ferreira do zezere dornes':'ferreiradozezeredornes','ferreira do zezere lago azul':'ferreiradozezerelagoazul','praia fluvial do cabril':'praiafluvialdocabril','nazare forte de sao miguel arcanjo':'nazarefortesaomiguelarcanjo','farol do bugio':'faroldobugio','cascais praia da ribeira':'cascais','sao pedro do estoril praia':'saopedrodoestoril','ericeira praia da calada':'prai d acalada'.replace(/\s+/g,''),'ericeira praia do matadouro':'matadouro','ericeira praia do sul':'praiadosul','ericeira praia dos pescadores':'pescadores','odemira praia do almograve':'almograve'
  }));

  function candidates(camera){
    const name=normalize(camera?.name);
    const slug=pageSlug(camera?.sourceUrl)||pageSlug(camera?.embedUrl);
    const values=[];
    const push=v=>{v=String(v||'').replace(/[^a-z0-9]/gi,'').toLowerCase();if(v&&!values.includes(v))values.push(v);};
    push(known.get(name));
    push(slug);
    push(slug.replace(/^praia-de-|^praia-do-|^praia-da-/,''));
    push(slugify(name));
    push('bc'+slugify(name));
    return values.map(token=>`https://video-auth1.iol.pt/beachcam/${token}/playlist.m3u8`);
  }

  function isMeo(camera){return /meo beachcam/i.test(String(camera?.provider||''))||/beachcam\.meo\.pt/i.test(String(camera?.sourceUrl||''));}

  const baseLoad=window.EyePlayback?.load;
  const baseResolve=window.EyePlayback?.resolve;

  function resolve(camera){
    if(isMeo(camera)){
      const urls=candidates(camera);
      if(urls.length)return{type:'hls',url:urls[0],alternatives:urls.slice(1),provider:'MEO Beachcam'};
    }
    return baseResolve?baseResolve(camera):{type:'none',url:''};
  }

  function load(camera){
    if(!isMeo(camera))return baseLoad?.(camera);
    const urls=candidates(camera);
    if(!urls.length)return baseLoad?.(camera);
    const video=document.getElementById('cameraVideo');
    const frame=document.getElementById('cameraFrame');
    const fallback=document.getElementById('videoFallback');
    if(!video)return baseLoad?.(camera);
    if(frame){frame.src='about:blank';frame.classList.add('hidden');}
    video.classList.remove('hidden');
    fallback?.classList.add('hidden');
    let index=0;
    const tryNext=()=>{
      if(window.state?.hls){try{state.hls.destroy();}catch{}state.hls=null;}
      video.pause();video.removeAttribute('src');video.load();
      if(index>=urls.length){video.classList.add('hidden');fallback?.classList.remove('hidden');const strong=fallback?.querySelector('strong');if(strong)strong.textContent='A transmissão MEO não respondeu no cartão';return;}
      const url=urls[index++];
      const start=()=>video.play().catch(()=>{});
      if(video.canPlayType('application/vnd.apple.mpegurl')){
        video.src=url;video.addEventListener('loadedmetadata',start,{once:true});video.addEventListener('error',tryNext,{once:true});return;
      }
      if(window.Hls&&Hls.isSupported()){
        const hls=new Hls({enableWorker:true,lowLatencyMode:true,manifestLoadingTimeOut:8000,levelLoadingTimeOut:8000,fragLoadingTimeOut:10000});
        if(window.state)state.hls=hls;
        hls.loadSource(url);hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED,start);
        hls.on(Hls.Events.ERROR,(_,data)=>{if(data.fatal)tryNext();});
        return;
      }
      tryNext();
    };
    tryNext();
  }

  window.EyeMeo={candidates,isMeo};
  window.EyePlayback={...(window.EyePlayback||{}),resolve,load};
  try{loadViewer=load;}catch{}
})();
