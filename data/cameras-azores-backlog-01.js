(()=>{
const src="https://api.visitazores.com/pt/webcams";
const rows=[
["visitazores-agua-dalto","Praia de Água d'Alto","Vila Franca do Campo","São Miguel",37.717,-25.482,"beach"],
["visitazores-lagoa-fogo","Lagoa do Fogo","Ribeira Grande","São Miguel",37.757,-25.468,"nature"],
["visitazores-pocos-capelas","Poços de Capelas e São Vicente","Ponta Delgada","São Miguel",37.833,-25.681,"coast"],
["visitazores-furnas","Furnas","Povoação","São Miguel",37.772,-25.311,"nature"],
["visitazores-lagoa","Lagoa","Lagoa","São Miguel",37.744,-25.571,"city"],
["visitazores-maia","Maia","Ribeira Grande","São Miguel",37.833,-25.389,"coast"],
["visitazores-nordeste","Nordeste","Nordeste","São Miguel",37.827,-25.147,"city"],
["visitazores-airport-pdl","Aeroporto de Ponta Delgada","Ponta Delgada","São Miguel",37.741,-25.698,"airport"],
["visitazores-praia-moinhos","Praia dos Moinhos","Ribeira Grande","São Miguel",37.824,-25.456,"beach"],
["visitazores-povoacao","Povoação","Povoação","São Miguel",37.747,-25.245,"city"],
["visitazores-populo","Praias do Pópulo","Ponta Delgada","São Miguel",37.750,-25.619,"beach"],
["visitazores-santa-barbara","Praia de Santa Bárbara","Ribeira Grande","São Miguel",37.823,-25.521,"beach"],
["visitazores-ribeira-grande","Ribeira Grande","Ribeira Grande","São Miguel",37.821,-25.520,"city"],
["visitazores-ribeira-quente","Praia da Ribeira Quente","Povoação","São Miguel",37.734,-25.302,"beach"],
["visitazores-sao-roque","São Roque","Ponta Delgada","São Miguel",37.746,-25.637,"coast"],
["visitazores-vinha-areia","Praia Vinha d'Areia","Vila Franca do Campo","São Miguel",37.714,-25.431,"beach"],
["visitazores-angra","Angra do Heroísmo","Angra do Heroísmo","Terceira",38.654,-27.217,"city"]
];
const cams=rows.map(([id,name,city,region,lat,lng,category])=>({id,name,city,region,country:"Portugal",lat,lng,category,status:"online",provider:"Visit Azores",sourceUrl:src,embedUrl:"",description:"Webcam oficial listada pelo portal Visit Azores.",verifiedAt:"2026-08-02",verification:"official-directory",uniqueFeed:true,tags:[region,city,category,"Visit Azores"]}));
const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const f=window.fetch.bind(window);window.fetch=async(i,n)=>{const r=await f(i,n),u=typeof i==="string"?i:i?.url||"";if(!u.includes("data/cameras.json")||!r.ok)return r;const base=await r.clone().json(),out=[...base],keys=new Set(base.map(c=>`${norm(c.name)}|${norm(c.city)}`));for(const c of cams){const k=`${norm(c.name)}|${norm(c.city)}`;if(!keys.has(k)){out.push(c);keys.add(k);}}return new Response(JSON.stringify(out),{status:r.status,statusText:r.statusText,headers:{"Content-Type":"application/json"}})};
})();