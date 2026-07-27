const state={cameras:[],filter:"all",query:"",selected:null,rotate:true,userInteracting:false,hls:null,hideOffline:true,threeD:false,dataReady:false,mapReady:false};
const $=s=>document.querySelector(s);

const meoDirectSlugs={
  "matosinhos-0":"praia-de-matosinhos","leca-da-palmeira-1":"leca-da-palmeira","espinho-2":"espinho","esmoriz-3":"esmoriz","furadouro-4":"furadouro","barra-5":"barra","costa-nova-6":"costa-nova","figueira-da-foz-7":"figueira-da-foz","buarcos-8":"buarcos","praia-do-pedrogao-9":"praia-do-pedrogao","sao-pedro-de-moel-10":"sao-pedro-de-moel","nazare-praia-do-norte-11":"praia-do-norte","nazare-praia-12":"nazare","sao-martinho-do-porto-13":"sao-martinho-do-porto","foz-do-arelho-14":"foz-do-arelho","peniche-baleal-15":"lagide-e-baia","peniche-supertubos-16":"supertubos","areia-branca-17":"areia-branca","santa-cruz-18":"santa-cruz","ericeira-ribeira-d-ilhas-19":"ribeira-d-ilhas","ericeira-foz-do-lizandro-20":"foz-do-lizandro","praia-grande-21":"praia-grande","guincho-22":"praia-do-guincho","carcavelos-23":"carcavelos","santo-amaro-de-oeiras-24":"santo-amaro-de-oeiras","costa-da-caparica-25":"costa-da-caparica","praia-da-sereia-morena-26":"praia-da-sereia-morena","fonte-da-telha-27":"fonte-da-telha","sesimbra-28":"sesimbra","comporta-29":"comporta","carvalhal-30":"carvalhal","sines-31":"sines","sao-torpes-32":"sao-torpes","porto-covo-33":"porto-covo","vila-nova-de-milfontes-34":"vila-nova-de-milfontes","zambujeira-do-mar-35":"zambujeira-do-mar","odeceixe-36":"odeceixe","arrifana-37":"arrifana","amado-38":"amado","sagres-tonel-39":"tonel","lagos-meia-praia-40":"meia-praia","portimao-praia-da-rocha-41":"praia-da-rocha","albufeira-42":"albufeira","vilamoura-43":"vilamoura","faro-ilha-44":"ilha-de-faro","tavira-45":"tavira"
};
const meoStreams={
  "matosinhos-0":"matosinhos","leca-da-palmeira-1":"lecadapalmeira","espinho-2":"espinho","esmoriz-3":"esmoriz","furadouro-4":"furadouro","barra-5":"aveiro","costa-nova-6":"costanova","figueira-da-foz-7":"figueiradafoz","buarcos-8":"bcfigueiradois","praia-do-pedrogao-9":"praiapedrogao","sao-pedro-de-moel-10":"bcsaopedromoel","nazare-praia-do-norte-11":"canhaonazare","nazare-praia-12":"nazarepraiadavila","foz-do-arelho-14":"bcfozdoarelho","peniche-baleal-15":"lagide","peniche-supertubos-16":"supertubos","areia-branca-17":"bcareiabranca","santa-cruz-18":"santacruz","carcavelos-23":"carcavelos","costa-da-caparica-25":"costacaparicacds","fonte-da-telha-27":"fontedatelha","sesimbra-28":"sesimbra","comporta-29":"bccomporta","carvalhal-30":"carvalhal","sao-torpes-32":"saotorpes","vila-nova-de-milfontes-34":"bcfranquia","zambujeira-do-mar-35":"zambujeira","odeceixe-36":"bcodeceixe","arrifana-37":"arrifana","amado-38":"bcamado","lagos-meia-praia-40":"meiapraia","portimao-praia-da-rocha-41":"praiadarocha","albufeira-42":"praiadopeneco","vilamoura-43":"vilamoura","faro-ilha-44":"bcfaro"
};

function isOffline(c){return String(c.status||"").toLowerCase()==="offline";}
function isGenericProviderUrl(url){if(!url)return false;try{const u=new URL(url,location.href),p=u.pathname.replace(/\/+$/g,"");return p===""||p==="/livecams"||p==="/webcams"||p==="/";}catch{return false;}}
function resolvedSource(c){if(c.provider==="MEO Beachcam"&&meoDirectSlugs[c.id])return `https://beachcam.meo.pt/livecams/${meoDirectSlugs[c.id]}/`;return c.sourceUrl||c.embedUrl||"";}
function directStream(c){if(c.embedUrl&&/\.m3u8(?:$|\?)/i.test(c.embedUrl))return c.embedUrl;if(c.provider==="MEO Beachcam"&&meoStreams[c.id])return `https://video-auth1.iol.pt/beachcam/${meoStreams[c.id]}/playlist.m3u8`;return "";}
function playableTarget(c){if(c.embedUrl&&!/\.m3u8(?:$|\?)/i.test(c.embedUrl)&&!isGenericProviderUrl(c.embedUrl))return c.embedUrl;const source=resolvedSource(c);return isGenericProviderUrl(source)?"":source;}

const satelliteStyle={version:8,projection:{type:"globe"},sources:{satellite:{type:"raster",tiles:["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],tileSize:256,attribution:"Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics"},labels:{type:"raster",tiles:["https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"],tileSize:256}},layers:[{id:"satellite",type:"raster",source:"satellite",paint:{"raster-saturation":-0.08,"raster-contrast":0.12,"raster-brightness-min":0.05}},{id:"labels",type:"raster",source:"labels",paint:{"raster-opacity":0.82}}],sky:{"sky-color":"#020610","horizon-color":"#143450","fog-color":"#07111f","sky-horizon-blend":0.18,"horizon-fog-blend":0.12,"fog-ground-blend":0.55}};
const city3DStyle="https://tiles.openfreemap.org/styles/liberty";

const map=new maplibregl.Map({container:"map",style:satelliteStyle,center:[-12.5,38.5],zoom:3.2,pitch:0,bearing:0,attributionControl:true,antialias:true,maxZoom:19,dragRotate:true,pitchWithRotate:true,touchPitch:true,keyboard:true});
map.addControl(new maplibregl.NavigationControl({visualizePitch:true,showCompass:true,showZoom:true}),"bottom-right");
map.dragRotate.enable();
map.touchZoomRotate.enable();
map.touchZoomRotate.enableRotation();
map.on("load",()=>{state.mapReady=true;configureCurrentStyle();syncMap();});
map.on("style.load",()=>{configureCurrentStyle();syncMap();});
map.on("mousedown",()=>state.userInteracting=true);map.on("mouseup",()=>state.userInteracting=false);map.on("touchstart",()=>state.userInteracting=true);map.on("touchend",()=>state.userInteracting=false);

function configureCurrentStyle(){
  if(!map.isStyleLoaded())return;
  if(state.threeD){
    try{map.setProjection({type:"mercator"});}catch{}
    const style=map.getStyle();
    const vectorSource=Object.entries(style.sources||{}).find(([,s])=>s.type==="vector")?.[0];
    const labels=(style.layers||[]).find(l=>l.type==="symbol"&&l.layout&&l.layout["text-field"])?.id;
    if(vectorSource&&!map.getLayer("eye-3d-buildings")){
      map.addLayer({id:"eye-3d-buildings",type:"fill-extrusion",source:vectorSource,"source-layer":"building",minzoom:14,filter:["==",["get","hide_3d"],false],paint:{"fill-extrusion-color":["interpolate",["linear"],["get","render_height"],0,"#60738a",60,"#c5d6e5"],"fill-extrusion-height":["coalesce",["get","render_height"],["get","height"],8],"fill-extrusion-base":["coalesce",["get","render_min_height"],["get","min_height"],0],"fill-extrusion-opacity":0.82}},labels);
    }
    if(!map.getSource("terrain-dem"))map.addSource("terrain-dem",{type:"raster-dem",tiles:["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],tileSize:256,encoding:"terrarium",maxzoom:15});
    if(!map.getLayer("eye-hillshade"))map.addLayer({id:"eye-hillshade",type:"hillshade",source:"terrain-dem",paint:{"hillshade-exaggeration":0.35}});
    try{map.setTerrain({source:"terrain-dem",exaggeration:1.25});}catch{}
  }else{
    try{map.setProjection({type:"globe"});}catch{}
    try{map.setTerrain(null);}catch{}
  }
}

function area(c){if(c.region==="Madeira")return"madeira";const az=["Santa Maria","São Miguel","Terceira","Graciosa","São Jorge","Faial","Pico","Flores","Corvo","Açores"];return az.includes(c.region)?"azores":"mainland";}
function visible(c){const q=state.query;const matches=!q||[c.name,c.city,c.region,c.provider,c.category,...(c.tags||[])].join(" ").toLowerCase().includes(q);return matches&&(state.filter==="all"||area(c)===state.filter)&&(!state.hideOffline||!isOffline(c));}
function cameraGeoJSON(){return{type:"FeatureCollection",features:state.cameras.filter(visible).filter(c=>Number.isFinite(c.lng)&&Number.isFinite(c.lat)).map(c=>({type:"Feature",geometry:{type:"Point",coordinates:[c.lng,c.lat]},properties:{id:c.id,area:area(c),direct:(directStream(c)||c.verification==="direct")?1:0,offline:isOffline(c)?1:0}}))};}
function ensureCameraLayer(){
  if(!map.isStyleLoaded())return;
  if(!map.getSource("webcams"))map.addSource("webcams",{type:"geojson",data:{type:"FeatureCollection",features:[]}});
  if(!map.getLayer("webcam-glow"))map.addLayer({id:"webcam-glow",type:"circle",source:"webcams",paint:{"circle-radius":["interpolate",["linear"],["zoom"],1,7,7,10,13,13],"circle-color":["case",["==",["get","offline"],1],"#ff4d5f",["==",["get","direct"],1],"#39f0b0","#4de1ff"],"circle-opacity":0.2,"circle-blur":0.65}});
  if(!map.getLayer("webcam-pins")){
    map.addLayer({id:"webcam-pins",type:"circle",source:"webcams",paint:{"circle-radius":["interpolate",["linear"],["zoom"],1,4,6,6,13,8],"circle-color":["case",["==",["get","offline"],1],"#ff4d5f",["any",["==",["get","direct"],1],["!=",["get","area"],"mainland"]],"#39f0b0","#4de1ff"],"circle-stroke-color":"#ffffff","circle-stroke-width":2,"circle-opacity":0.98}});
    map.on("mouseenter","webcam-pins",()=>map.getCanvas().style.cursor="pointer");map.on("mouseleave","webcam-pins",()=>map.getCanvas().style.cursor="");
    map.on("click","webcam-pins",e=>{const feature=e.features&&e.features[0];if(!feature)return;const camera=state.cameras.find(c=>String(c.id)===String(feature.properties.id));if(camera)openCamera(camera);});
  }
}
function renderMarkers(){const filtered=state.cameras.filter(visible);$("#visibleCount").textContent=filtered.length;if(!state.mapReady||!state.dataReady||!map.isStyleLoaded())return;ensureCameraLayer();const source=map.getSource("webcams");if(source)source.setData(cameraGeoJSON());}
function syncMap(){if(state.mapReady&&state.dataReady)renderMarkers();}

function stopPlayback(){if(state.hls){state.hls.destroy();state.hls=null;}const video=$("#cameraVideo"),frame=$("#cameraFrame");video.pause();video.removeAttribute("src");video.load();video.classList.add("hidden");frame.src="about:blank";frame.classList.add("hidden");}
function showFallback(message){const fallback=$("#videoFallback");fallback.classList.remove("hidden");const strong=fallback.querySelector("strong");if(strong)strong.textContent=message||"Transmissão indisponível no cartão";}
function loadHls(url){const video=$("#cameraVideo"),fallback=$("#videoFallback");video.classList.remove("hidden");fallback.classList.add("hidden");const start=()=>video.play().catch(()=>{});if(video.canPlayType("application/vnd.apple.mpegurl")){video.src=url;video.addEventListener("loadedmetadata",start,{once:true});return;}if(window.Hls&&Hls.isSupported()){const hls=new Hls({enableWorker:true,lowLatencyMode:true,liveSyncDurationCount:3});state.hls=hls;hls.loadSource(url);hls.attachMedia(video);hls.on(Hls.Events.MANIFEST_PARSED,start);hls.on(Hls.Events.ERROR,(_,data)=>{if(data.fatal){hls.destroy();state.hls=null;video.classList.add("hidden");showFallback("O stream direto não respondeu");}});return;}video.classList.add("hidden");showFallback("Este navegador não suporta o stream em direto");}
function loadViewer(c){stopPlayback();if(isOffline(c)){showFallback("Câmara marcada como offline");return;}showFallback("A carregar transmissão");const stream=directStream(c);if(stream){loadHls(stream);return;}const target=playableTarget(c),frame=$("#cameraFrame"),fallback=$("#videoFallback");if(target){frame.src=target;frame.classList.remove("hidden");fallback.classList.add("hidden");return;}showFallback("Esta fonte ainda não tem vídeo incorporável");}
function openCamera(c){state.selected=c;$("#viewerTitle").textContent=c.name;$("#viewerLocation").textContent=`${c.city} · ${c.region}`;$("#viewerDescription").textContent=c.description;$("#viewerProvider").textContent=c.provider;$("#viewerVerification").textContent=isOffline(c)?"Última verificação: offline":directStream(c)?"Feed HLS direto":c.verification==="direct"?"Feed direto":"Rede confirmada";const status=$("#viewerStatus");status.textContent=isOffline(c)?"OFFLINE":directStream(c)?"LIVE":"LIVE SOURCE";status.classList.toggle("offline",isOffline(c));const source=resolvedSource(c);$("#openSource").href=source||"#";$("#openSource").toggleAttribute("aria-disabled",!source);$("#viewer").classList.add("open");loadViewer(c);map.easeTo({center:[c.lng,c.lat],zoom:Math.max(map.getZoom(),state.threeD?15.5:7.2),pitch:state.threeD?62:map.getPitch(),duration:1100,offset:[-210,0]});}
function closeViewer(){$("#viewer").classList.remove("open");stopPlayback();}
function updateMetrics(){$("#cameraCount").textContent=state.cameras.length;$("#regionCount").textContent=new Set(state.cameras.map(c=>c.region)).size;$("#providerCount").textContent=new Set(state.cameras.map(c=>c.provider)).size;}
function flyPortugal(){map.flyTo({center:[-8.0,39.5],zoom:state.threeD?6.2:5.1,pitch:state.threeD?48:0,bearing:0,duration:1800});}
function flyWorld(){map.flyTo({center:[-10,25],zoom:1.15,pitch:0,bearing:0,duration:1800});}
function returnToTopDownGlobe(){const center=map.getCenter();map.easeTo({center,zoom:Math.min(map.getZoom(),3.6),pitch:0,bearing:0,duration:1400});}
function adjustView({bearing=0,pitch=0}){map.easeTo({bearing:map.getBearing()+bearing,pitch:Math.max(0,Math.min(85,map.getPitch()+pitch)),duration:220});}
function spin(){if(state.rotate&&!state.userInteracting&&!$("#viewer").classList.contains("open")&&map.getZoom()<2.8){const c=map.getCenter();c.lng-=0.025;map.easeTo({center:c,duration:80,easing:n=>n});}requestAnimationFrame(spin);}
async function init(){const res=await fetch("data/cameras.json",{cache:"no-store"});if(!res.ok)throw new Error(`Dados indisponíveis: ${res.status}`);const base=await res.json();const extra=Array.isArray(window.EXTRA_PORTUGAL_CAMERAS)?window.EXTRA_PORTUGAL_CAMERAS:[];const byId=new Map([...base,...extra].map(c=>[String(c.id),c]));state.cameras=[...byId.values()];state.dataReady=true;updateMetrics();syncMap();spin();}

$("#closeViewer").addEventListener("click",closeViewer);$("#resetView").addEventListener("click",flyPortugal);$("#worldView").addEventListener("click",flyWorld);$("#autoRotate").addEventListener("change",e=>state.rotate=e.target.checked);$("#hideOffline").addEventListener("change",e=>{state.hideOffline=e.target.checked;renderMarkers();});$("#threeDMode").addEventListener("change",e=>{state.threeD=e.target.checked;state.mapReady=false;map.setStyle(state.threeD?city3DStyle:satelliteStyle);map.once("idle",()=>{state.mapReady=true;configureCurrentStyle();syncMap();if(state.threeD)flyPortugal();else returnToTopDownGlobe();});});
$("#searchInput").addEventListener("input",e=>{state.query=e.target.value.trim().toLowerCase();renderMarkers();});
document.querySelectorAll(".filter").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".filter").forEach(b=>b.classList.remove("active"));btn.classList.add("active");state.filter=btn.dataset.filter;renderMarkers();if(state.filter==="azores")map.flyTo({center:[-27.9,38.3],zoom:5.2,duration:1400});if(state.filter==="madeira")map.flyTo({center:[-16.9,32.75],zoom:7.2,duration:1400});if(state.filter==="mainland")map.flyTo({center:[-8.0,39.5],zoom:5.1,duration:1400});}));
window.addEventListener("keydown",e=>{if(e.target instanceof HTMLInputElement)return;if(e.shiftKey&&e.key==="ArrowUp"){e.preventDefault();adjustView({pitch:8});}else if(e.shiftKey&&e.key==="ArrowDown"){e.preventDefault();adjustView({pitch:-8});}else if(e.shiftKey&&e.key==="ArrowLeft"){e.preventDefault();adjustView({bearing:-12});}else if(e.shiftKey&&e.key==="ArrowRight"){e.preventDefault();adjustView({bearing:12});}else if(e.key.toLowerCase()==="q"){adjustView({bearing:-12});}else if(e.key.toLowerCase()==="e"){adjustView({bearing:12});}else if(e.key.toLowerCase()==="r"){state.threeD?flyPortugal():returnToTopDownGlobe();}});
init().catch(err=>{console.error(err);$("#cameraCount").textContent="!";});