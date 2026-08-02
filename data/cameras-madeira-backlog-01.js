(()=>{
const items=[
{id:"madeiraweb-marina-funchal-2",name:"Marina do Funchal - Câmara 2",city:"Funchal",region:"Madeira",lat:32.6477,lng:-16.9098,category:"port",provider:"MadeiraCams",sourceUrl:"https://madeiracams.pt/"},
{id:"madeiraweb-forum-machico",name:"Fórum Machico",city:"Machico",region:"Madeira",lat:32.7194,lng:-16.7661,category:"city",provider:"MadeiraCams",sourceUrl:"https://madeiracams.pt/"},
{id:"madeiraweb-praia-calheta",name:"Praia da Calheta",city:"Calheta",region:"Madeira",lat:32.7213,lng:-17.1778,category:"beach",provider:"MadeiraCams",sourceUrl:"https://madeiracams.pt/"},
{id:"madeiraweb-praia-ponta-gorda",name:"Praia da Ponta Gorda",city:"Funchal",region:"Madeira",lat:32.6358,lng:-16.9432,category:"beach",provider:"MadeiraCams",sourceUrl:"https://madeiracams.pt/"},
{id:"madeiraweb-penha-franca",name:"Penha de França",city:"Funchal",region:"Madeira",lat:32.6418,lng:-16.9275,category:"city",provider:"MadeiraCams",sourceUrl:"https://madeiracams.pt/"},
{id:"madeiraweb-piscinas-lido",name:"Piscinas do Lido",city:"Funchal",region:"Madeira",lat:32.6364,lng:-16.9369,category:"beach",provider:"MadeiraCams",sourceUrl:"https://madeiracams.pt/"},
{id:"madeiraweb-praia-formosa",name:"Praia Formosa",city:"Funchal",region:"Madeira",lat:32.6387,lng:-16.9566,category:"beach",provider:"MadeiraCams",sourceUrl:"https://madeiracams.pt/"},
{id:"madeiraweb-reis-magos",name:"Praia dos Reis Magos",city:"Caniço",region:"Madeira",lat:32.6500,lng:-16.8333,category:"beach",provider:"Webcam Madeira",sourceUrl:"https://www.webcammadeira.com/pt-PT/webcam/reis-magos"},
{id:"madeiraweb-porto-machico",name:"Porto de Machico",city:"Machico",region:"Madeira",lat:32.7183,lng:-16.7646,category:"port",provider:"MadeiraCams",sourceUrl:"https://madeiracams.pt/"},
{id:"madeiraweb-alagoa-porto-cruz",name:"Praia da Alagoa - Porto da Cruz",city:"Porto da Cruz",region:"Madeira",lat:32.7756,lng:-16.8056,category:"beach",provider:"Webcam Madeira",sourceUrl:"https://www.webcammadeira.com/pt-PT/webcam/porto-cruz-alagoa"},
{id:"madeiraweb-paul-mar",name:"Paul do Mar",city:"Calheta",region:"Madeira",lat:32.7534,lng:-17.2275,category:"coast",provider:"MadeiraCams",sourceUrl:"https://madeiracams.pt/"},
{id:"madeiraweb-madalena-mar",name:"Madalena do Mar",city:"Ponta do Sol",region:"Madeira",lat:32.7008,lng:-17.1347,category:"coast",provider:"MadeiraCams",sourceUrl:"https://madeiracams.pt/"},
{id:"madeiraweb-barreirinha",name:"Praia da Barreirinha",city:"Funchal",region:"Madeira",lat:32.6464,lng:-16.8995,category:"beach",provider:"MadeiraCams",sourceUrl:"https://madeiracams.pt/"},
{id:"madeiraweb-doca-cavacas",name:"Doca do Cavacas",city:"Funchal",region:"Madeira",lat:32.6381,lng:-16.9540,category:"beach",provider:"MadeiraCams",sourceUrl:"https://madeiracams.pt/"},
{id:"madeiraweb-quinta-furao",name:"Santana - Quinta do Furão",city:"Santana",region:"Madeira",lat:32.8168,lng:-16.8869,category:"nature",provider:"MadeiraCams",sourceUrl:"https://madeiracams.pt/"}
].map(x=>({...x,country:"Portugal",status:"online",embedUrl:"",description:"Webcam pública da Madeira identificada em operador regional/original e adicionada para completar o backlog do Eye.",verifiedAt:"2026-08-02",verification:"provider-page",uniqueFeed:true,tags:["Madeira",x.city,x.category,x.provider]}));
const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const nativeFetch=window.fetch.bind(window);
window.fetch=async(input,init)=>{const response=await nativeFetch(input,init);const url=typeof input==="string"?input:input?.url||"";if(!url.includes("data/cameras.json")||!response.ok)return response;const base=await response.clone().json();const out=[...base];for(const item of items){const idx=out.findIndex(c=>norm(c.name)===norm(item.name)&&norm(c.city)===norm(item.city));if(idx>=0)out[idx]={...out[idx],...item,id:out[idx].id};else out.push(item);}return new Response(JSON.stringify(out),{status:response.status,statusText:response.statusText,headers:{"Content-Type":"application/json"}});};
})();