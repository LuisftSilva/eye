const state={cameras:[],markers:[],filter:"all",query:"",selected:null,rotate:true,userInteracting:false};
const $=s=>document.querySelector(s);
const map=new maplibregl.Map({
  container:"map",
  style:"https://demotiles.maplibre.org/style.json",
  center:[-12.5,38.5],
  zoom:3.2,
  pitch:0,
  attributionControl:true,
  antialias:true
});
map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),"bottom-right");
map.on("style.load",()=>map.setProjection({type:"globe"}));
map.on("mousedown",()=>state.userInteracting=true);
map.on("mouseup",()=>state.userInteracting=false);
map.on("touchstart",()=>state.userInteracting=true);
map.on("touchend",()=>state.userInteracting=false);

function area(c){
  if(c.region==="Madeira") return "madeira";
  const az=["Santa Maria","São Miguel","Terceira","Graciosa","São Jorge","Faial","Pico","Flores","Corvo"];
  return az.includes(c.region)?"azores":"mainland";
}
function visible(c){
  const q=state.query;
  const matches=!q||[c.name,c.city,c.region,c.provider].join(" ").toLowerCase().includes(q);
  return matches&&(state.filter==="all"||area(c)===state.filter);
}
function renderMarkers(){
  state.markers.forEach(x=>x.remove());state.markers=[];
  state.cameras.filter(visible).forEach(c=>{
    const el=document.createElement("button");
    el.className="cam-marker "+(area(c)==="mainland"?"":"island");
    el.title=c.name;el.setAttribute("aria-label",c.name);
    el.addEventListener("click",e=>{e.stopPropagation();openCamera(c);});
    const m=new maplibregl.Marker({element:el,anchor:"center"}).setLngLat([c.lng,c.lat]).addTo(map);
    state.markers.push(m);
  });
}
function openCamera(c){
  state.selected=c;
  $("#viewerTitle").textContent=c.name;
  $("#viewerLocation").textContent=`${c.city} · ${c.region}`;
  $("#viewerDescription").textContent=c.description;
  $("#viewerProvider").textContent=c.provider;
  $("#viewerVerification").textContent=c.verification==="direct"?"Feed direto":"Rede confirmada";
  $("#openSource").href=c.sourceUrl;
  $("#viewer").classList.add("open");
  map.easeTo({center:[c.lng,c.lat],zoom:Math.max(map.getZoom(),7.5),duration:1100,offset:[-160,0]});
}
function updateMetrics(){
  $("#cameraCount").textContent=state.cameras.length;
  $("#regionCount").textContent=new Set(state.cameras.map(c=>c.region)).size;
  $("#providerCount").textContent=new Set(state.cameras.map(c=>c.provider)).size;
}
function flyPortugal(){map.flyTo({center:[-12.5,38.6],zoom:3.6,pitch:0,duration:1800});}
function flyWorld(){map.flyTo({center:[-10,25],zoom:1.25,pitch:0,duration:1800});}
function spin(){
  if(state.rotate&&!state.userInteracting&&!$("#viewer").classList.contains("open")&&map.getZoom()<2.8){
    const c=map.getCenter();c.lng-=0.035;map.easeTo({center:c,duration:70,easing:n=>n});
  }
  requestAnimationFrame(spin);
}
async function init(){
  const res=await fetch("data/cameras.json");
  state.cameras=await res.json();
  updateMetrics();renderMarkers();spin();
}
$("#closeViewer").addEventListener("click",()=>$("#viewer").classList.remove("open"));
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