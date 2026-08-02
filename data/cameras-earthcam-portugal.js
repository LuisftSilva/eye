(()=>{
const cameras=[
  {id:"earthcam-abrantes",name:"Abrantes",city:"Abrantes",region:"Santarém",lat:39.4667,lng:-8.2,category:"city"},
  {id:"earthcam-lisboa",name:"Lisboa Cam",city:"Lisboa",region:"Lisboa",lat:38.7223,lng:-9.1393,category:"city"},
  {id:"earthcam-serra-estrela-covilha",name:"Live Serra da Estrela, Covilhã",city:"Covilhã",region:"Castelo Branco",lat:40.2806,lng:-7.5038,category:"mountain"},
  {id:"earthcam-covilha-underwater",name:"Welcome to our underwater world!",city:"Covilhã",region:"Castelo Branco",lat:40.2806,lng:-7.5038,category:"nature"},
  {id:"earthcam-restaurante-colmeia",name:"Restaurante Colmeia",city:"Guarda",region:"Guarda",lat:40.5373,lng:-7.2676,category:"city"},
  {id:"earthcam-meteo-fermentelos",name:"MeteoFermentelos",city:"Fermentelos",region:"Aveiro",lat:40.5688,lng:-8.5219,category:"weather"},
  {id:"earthcam-carvoeiro-webcam",name:"Carvoeiro Webcam",city:"Carvoeiro",region:"Faro",lat:37.0964,lng:-8.4715,category:"beach"},
  {id:"earthcam-carvoeiro-cam",name:"Carvoeiro Cam",city:"Carvoeiro",region:"Faro",lat:37.0964,lng:-8.4715,category:"beach"},
  {id:"earthcam-vilamoura",name:"Vilamoura Webcam",city:"Vilamoura",region:"Faro",lat:37.077,lng:-8.118,category:"beach"},
  {id:"earthcam-martinhal",name:"Martinhal Beach",city:"Sagres",region:"Faro",lat:37.0186,lng:-8.9268,category:"beach"},
  {id:"earthcam-funchal-cams",name:"Funchal Cams",city:"Funchal",region:"Madeira",lat:32.6507,lng:-16.9087,category:"city"},
  {id:"earthcam-funchal-marina",name:"Funchal Marina",city:"Funchal",region:"Madeira",lat:32.6469,lng:-16.9102,category:"port"},
  {id:"earthcam-madeira-island",name:"Madeira Island",city:"Funchal",region:"Madeira",lat:32.6507,lng:-16.9087,category:"island"},
  {id:"earthcam-madeira-coast",name:"Madeira Coast Webcam",city:"Funchal",region:"Madeira",lat:32.6507,lng:-16.9087,category:"coast"},
  {id:"earthcam-madeira-panoramic",name:"Panoramic HD Webcam",city:"Funchal",region:"Madeira",lat:32.6507,lng:-16.9087,category:"city"},
  {id:"earthcam-climaat-velas",name:"Climaat Project",city:"Velas",region:"São Jorge",lat:38.6819,lng:-28.2128,category:"weather"},
  {id:"earthcam-spotazores-sete-cidades",name:"SpotAzores São Miguel Island",city:"Sete Cidades",region:"São Miguel",lat:37.861,lng:-25.794,category:"nature"},
  {id:"earthcam-porto-azores",name:"Porto",city:"Porto",region:"Açores",lat:37.7412,lng:-25.6756,category:"port"}
].map(c=>({
  ...c,
  country:"Portugal",
  status:"unknown",
  provider:"EarthCam Directory",
  sourceUrl:`https://www.earthcam.com/search/ft-search.php?term=${encodeURIComponent(c.name)}`,
  embedUrl:"",
  description:"Entrada portuguesa descoberta no diretório EarthCam. A página pode apontar para um operador externo, conter várias vistas ou estar indisponível; deve ser validada antes de ser tratada como feed direto.",
  verifiedAt:"2026-08-02",
  verification:"directory-listing",
  uniqueFeed:false,
  tags:[c.region,c.city,c.category,"EarthCam","directory"]
}));
window.EARTHCAM_PORTUGAL_CAMERAS=cameras;
const nativeFetch=window.fetch.bind(window);
window.fetch=async(input,init)=>{
  const response=await nativeFetch(input,init);
  const url=typeof input==="string"?input:input&&input.url||"";
  if(!url.includes("data/cameras.json")||!response.ok)return response;
  const base=await response.clone().json();
  const ids=new Set(base.map(c=>String(c.id)));
  const extras=cameras.filter(c=>!ids.has(c.id));
  return new Response(JSON.stringify([...base,...extras]),{status:response.status,statusText:response.statusText,headers:{"Content-Type":"application/json"}});
};
})();
