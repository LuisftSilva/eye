const state={cameras:[],markers:[],filter:"all",query:"",selected:null,rotate:true,userInteracting:false};
const $=s=>document.querySelector(s);

const satelliteStyle={
  version:8,
  projection:{type:"globe"},
  sources:{
    satellite:{
      type:"raster",
      tiles:["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize:256,
      attribution:"Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics"
    },
    labels:{
      type:"raster",
      tiles:["https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"],
      tileSize:256
    }
  },
  layers:[
    {id:"satellite",type:"raster",source:"satellite",paint:{"raster-saturation":-0.08,"raster-contrast":0.12,"raster-brightness-min":0.05}},
    {id:"labels",type:"raster",source:"labels",paint:{"raster-opacity":0.82}}
  ],
  sky:{"sky-color":"#020610","horizon-color":"#143450","fog-color":"#07111f","sky-horizon-blend":0.18,"horizon-fog-blend":0.12,"fog-ground-blend":0.55}
};

const map=new maplibregl.Map({
  container:"map",style:satelliteStyle,center:[-12.5,38.5],zoom:3.2,pitch:0,
  attributionControl:true,antialias:true,maxZoom:18
});
map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),"bottom-right");
map.on("style.load",()=>map.setProjection({type:"globe"}));
map.on("mousedown",()=>state.userInteracting=true);
map.on("mouseup",()=>state.userInteracting=false);
map.on("touchstart",()=>state.userInteracting=true);
map.on("touchend",()=>state.userInteracting=false);

function area(c){
  if(c.region==="Madeira")return"madeira";
  const az=["Santa Maria","São Miguel","Terceira","Graciosa","São Jorge","Faial","Pico","Flores","Corvo","Açores"];
  return az.includes(c.region)?"azores":"mainland";
}
function visible(c){
  const q=state.query;
  const matches=!q||[c.name,c.city,c.region,c.provider,c.category,...(c.tags||[])].join(" ").toLowerCase().includes(q);
  return matches&&(state.filter==="all"||area(c)===state.filter);
}
function renderMarkers(){
  state.markers.forEach(x=>x.remove());state.markers=[];
  state.cameras.filter(visible).forEach(c=>{
    const el=document.createElement("button");
    el.className="cam-marker "+(area(c)==="mainland"?"":"island")+(c.verification==="direct"?" direct":"");
    el.title=c.name;el.setAttribute("aria-label",c.name);
    el.addEventListener("click",e=>{e.stopPropagation();openCamera(c);});
    const marker=new maplibregl.Marker({element:el,anchor:"center"}).setLngLat([c.lng,c.lat]).addTo(map);
    state.markers.push(marker);
  });
  $("#visibleCount").textContent=state.cameras.filter(visible).length;
}
function loadViewer(c){
  const frame=$("#cameraFrame"),fallback=$("#videoFallback");
  frame.src="about:blank";frame.classList.add("hidden");fallback.classList.remove("hidden");
  const target=c.embedUrl||c.sourceUrl;
  if(target){
    frame.src=target;
    frame.classList.remove("hidden");
    fallback.classList.add("hidden");
  }
}
function openCamera(c){
  state.selected=c;
  $("#viewerTitle").textContent=c.name;
  $("#viewerLocation").textContent=`${c.city} · ${c.region}`;
  $("#viewerDescription").textContent=c.description;
  $("#viewerProvider").textContent=c.provider;
  $("#viewerVerification").textContent=c.verification==="direct"?"Feed direto":"Rede confirmada";
  $("#viewerStatus").textContent=c.status==="online"?"LIVE SOURCE":"SOURCE";
  $("#openSource").href=c.sourceUrl;
  loadViewer(c);
  $("#viewer").classList.add("open");
  map.easeTo({center:[c.lng,c.lat],zoom:Math.max(map.getZoom(),7.2),duration:1100,offset:[-210,0]});
}
function closeViewer(){
  $("#viewer").classList.remove("open");
  $("#cameraFrame").src="about:blank";
}
function updateMetrics(){
  $("#cameraCount").textContent=state.cameras.length;
  $("#regionCount").textContent=new Set(state.cameras.map(c=>c.region)).size;
  $("#providerCount").textContent=new Set(state.cameras.map(c=>c.provider)).size;
}
function flyPortugal(){map.flyTo({center:[-12.5,38.6],zoom:3.6,pitch:0,bearing:0,duration:1800});}
function flyWorld(){map.flyTo({center:[-10,25],zoom:1.15,pitch:0,bearing:0,duration:1800});}
function spin(){
  if(state.rotate&&!state.userInteracting&&!$("#viewer").classList.contains("open")&&map.getZoom()<2.8){
    const c=map.getCenter();c.lng-=0.025;map.easeTo({center:c,duration:80,easing:n=>n});
  }
  requestAnimationFrame(spin);
}
async function init(){
  const res=await fetch("data/cameras.json",{cache:"no-store"});
  if(!res.ok)throw new Error(`Dados indisponíveis: ${res.status}`);
  state.cameras=await res.json();
  updateMetrics();renderMarkers();spin();
}
$("#closeViewer").addEventListener("click",closeViewer);
$("#resetView").addEventListener("click",flyPortugal);
$("#worldView").addEventListener("click",flyWorld);
$("#autoRotate").addEventListener("change",e=>state.rotate=e.target.checked);
$("#searchInput").addEventListener("input",e=>{state.query=e.target.value.trim().toLowerCase();renderMarkers();});
document.querySelectorAll(".filter").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll(".filter").forEach(b=>b.classList.remove("active"));btn.classList.add("active");
  state.filter=btn.dataset.filter;renderMarkers();
  if(state.filter==="azores")map.flyTo({center:[-27.9,38.3],zoom:5.2,duration:1400});
  if(state.filter==="madeira")map.flyTo({center:[-16.9,32.75],zoom:7.2,duration:1400});
  if(state.filter==="mainland")map.flyTo({center:[-8.0,39.5],zoom:5.1,duration:1400});
}));
init().catch(err=>{console.error(err);$("#cameraCount").textContent="!";});
