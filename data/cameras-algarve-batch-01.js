(()=>{
const cams=[
["meo-albufeira-peneco","Albufeira - Praia do Peneco","Albufeira","Faro",37.0868,-8.2546,"beach","https://back-office.beachcam.pt/livecams/albufeira-praia-do-peneco/"],
["meo-albufeira-salgados","Albufeira - Praia dos Salgados","Albufeira","Faro",37.0915,-8.3277,"beach","https://back-office.beachcam.pt/livecams/praia-dos-salgados/"],
["meo-albufeira-gale-leste","Albufeira - Praia da Galé Leste","Albufeira","Faro",37.0829,-8.3122,"beach","https://back-office.beachcam.pt/livecams/praia-da-gale/"],
["meo-albufeira-evaristo","Albufeira - Praia do Evaristo","Albufeira","Faro",37.0755,-8.2957,"beach","https://back-office.beachcam.pt/livecams/praia-do-evaristo/"],
["meo-albufeira-coelha","Albufeira - Praia da Coelha","Albufeira","Faro",37.0748,-8.2882,"beach","https://back-office.beachcam.pt/livecams/praia-da-coelha/"],
["meo-albufeira-arrifes","Albufeira - Praia dos Arrifes","Albufeira","Faro",37.0754,-8.2791,"beach","https://back-office.beachcam.pt/livecams/praia-dos-arrifes/"],
["meo-albufeira-alemaes","Albufeira - Praia dos Alemães","Albufeira","Faro",37.0874,-8.2384,"beach","https://back-office.beachcam.pt/livecams/praia-dos-alemaes/"],
["meo-albufeira-oura","Albufeira - Praia da Oura","Albufeira","Faro",37.0861,-8.2251,"beach","https://back-office.beachcam.pt/livecams/praia-da-oura/"],
["meo-albufeira-santa-eulalia","Albufeira - Praia de Santa Eulália","Albufeira","Faro",37.0893,-8.2145,"beach","https://back-office.beachcam.pt/livecams/praia-de-santa-eulalia/"],
["meo-albufeira-olhos-agua","Albufeira - Praia dos Olhos de Água","Albufeira","Faro",37.0904,-8.1909,"beach","https://back-office.beachcam.pt/livecams/praia-dos-olhos-de-agua/"],
["meo-albufeira-belharucas","Albufeira - Praia das Belharucas","Albufeira","Faro",37.0877,-8.1843,"beach","https://back-office.beachcam.pt/livecams/praia-das-belharucas/"],
["meo-albufeira-falesia-acoteias","Albufeira - Praia da Falésia Açoteias","Albufeira","Faro",37.0857,-8.1725,"beach","https://back-office.beachcam.pt/livecams/praia-da-falesia-acoteias/"],
["meo-vilamoura-praia","Vilamoura - Praia","Loulé","Faro",37.0718,-8.1207,"beach","https://back-office.beachcam.pt/livecams/vilamoura/"],
["meo-loule-almargem","Loulé - Praia do Almargem","Loulé","Faro",37.0602,-8.0945,"beach","https://back-office.beachcam.pt/livecams/praia-do-almargem/"],
["meo-portimao-praia-rocha","Portimão - Praia da Rocha","Portimão","Faro",37.1188,-8.5386,"beach","https://back-office.beachcam.pt/livecams/praia-da-rocha/"],
["meo-portimao-vau","Portimão - Praia do Vau","Portimão","Faro",37.1183,-8.5619,"beach","https://back-office.beachcam.pt/livecams/praia-do-vau/"],
["meo-portimao-prainha","Portimão - Prainha","Portimão","Faro",37.1198,-8.5857,"beach","https://back-office.beachcam.pt/livecams/prainha/"],
["meo-lagoa-carvoeiro","Lagoa - Carvoeiro","Lagoa","Faro",37.0968,-8.4704,"beach","https://back-office.beachcam.pt/livecams/carvoeiro/"],
["meo-lagoa-benagil","Lagoa - Praia de Benagil","Lagoa","Faro",37.0877,-8.4265,"beach","https://back-office.beachcam.pt/livecams/praia-de-benagil/"],
["meo-lagos-porto-mos","Lagos - Praia de Porto de Mós","Lagos","Faro",37.0872,-8.6874,"beach","https://back-office.beachcam.pt/livecams/praia-de-porto-de-mos/"]
].map(([id,name,city,region,lat,lng,category,sourceUrl])=>({id,name,city,region,country:"Portugal",lat,lng,category,status:"online",provider:"MEO Beachcam",sourceUrl,embedUrl:"",description:"Livecam pública do operador original MEO Beachcam.",verifiedAt:"2026-08-02",verification:"provider-page",uniqueFeed:true,tags:[region,city,category,"MEO Beachcam","Algarve"]}));
const originalFetch=window.fetch.bind(window);
window.fetch=async(input,init)=>{const response=await originalFetch(input,init);const url=typeof input==="string"?input:input?.url||"";if(!url.includes("data/cameras.json")||!response.ok)return response;const base=await response.clone().json();const keys=new Set(base.map(c=>`${c.name}|${c.city}`.toLowerCase()));const extras=cams.filter(c=>!keys.has(`${c.name}|${c.city}`.toLowerCase()));return new Response(JSON.stringify([...base,...extras]),{status:response.status,statusText:response.statusText,headers:{"Content-Type":"application/json"}});};
})();
