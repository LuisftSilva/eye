(()=>{
const cams=[
["algarve-alvor-nascente","Alvor - Praia Nascente","Alvor","Faro",37.124,-8.584,"beach","https://beachcam.meo.pt/livecams/"],
["algarve-alvor-poente","Alvor - Praia Poente","Alvor","Faro",37.121,-8.603,"beach","https://beachcam.meo.pt/livecams/"],
["algarve-prainha","Alvor - Prainha","Alvor","Faro",37.117,-8.577,"beach","https://beachcam.meo.pt/livecams/"],
["algarve-joao-arens","Portimão - João de Arens","Portimão","Faro",37.117,-8.585,"beach","https://beachcam.meo.pt/livecams/"],
["algarve-praia-luz","Lagos - Praia da Luz","Lagos","Faro",37.087,-8.728,"beach","https://beachcam.meo.pt/livecams/"],
["algarve-camilo","Lagos - Praia do Camilo","Lagos","Faro",37.087,-8.669,"beach","https://beachcam.meo.pt/livecams/"],
["algarve-sao-roque","Lagos - Praia de São Roque","Lagos","Faro",37.104,-8.666,"beach","https://beachcam.meo.pt/livecams/"],
["algarve-martinhal","Sagres - Praia do Martinhal","Vila do Bispo","Faro",37.019,-8.926,"beach","https://beachcam.meo.pt/livecams/"],
["algarve-mareta","Sagres - Praia da Mareta","Vila do Bispo","Faro",37.006,-8.939,"beach","https://beachcam.meo.pt/livecams/"],
["algarve-salema","Salema - Praia","Vila do Bispo","Faro",37.066,-8.824,"beach","https://beachcam.meo.pt/livecams/"],
["algarve-burgau","Burgau - Praia","Vila do Bispo","Faro",37.073,-8.775,"beach","https://beachcam.meo.pt/livecams/"],
["algarve-zavial","Vila do Bispo - Praia do Zavial","Vila do Bispo","Faro",37.047,-8.873,"beach","https://beachcam.meo.pt/livecams/"],
["algarve-ingrina","Vila do Bispo - Praia da Ingrina","Vila do Bispo","Faro",37.046,-8.881,"beach","https://beachcam.meo.pt/livecams/"],
["algarve-bordeira","Carrapateira - Praia da Bordeira","Aljezur","Faro",37.196,-8.902,"beach","https://beachcam.meo.pt/praias/praia-da-bordeira-carrapateira/"],
["algarve-amado","Carrapateira - Praia do Amado","Aljezur","Faro",37.167,-8.902,"beach","https://beachcam.meo.pt/livecams/"],
["algarve-monte-gordo","Monte Gordo - Praia","Vila Real de Santo António","Faro",37.178,-7.452,"beach","https://beachcam.meo.pt/livecams/"]
].map(([id,name,city,region,lat,lng,category,sourceUrl])=>({id,name,city,region,country:"Portugal",lat,lng,category,status:"online",provider:"MEO Beachcam",sourceUrl,embedUrl:"",description:"Webcam costeira integrada a partir da fonte original MEO Beachcam.",verifiedAt:"2026-08-02",verification:"provider-page",uniqueFeed:true,tags:[region,city,category,"MEO Beachcam"]}));
const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const nativeFetch=window.fetch.bind(window);
window.fetch=async(input,init)=>{const response=await nativeFetch(input,init);const url=typeof input==="string"?input:input?.url||"";if(!url.includes("data/cameras.json")||!response.ok)return response;const base=await response.clone().json();const out=[...base];for(const c of cams){if(!out.some(x=>norm(x.name)===norm(c.name)))out.push(c);}return new Response(JSON.stringify(out),{status:response.status,statusText:response.statusText,headers:{"Content-Type":"application/json"}});};
})();