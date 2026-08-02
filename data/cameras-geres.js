(()=>{
  const camera={
    id:"geres-carris-weather-cam",
    name:"Serra do Gerês - Minas dos Carris",
    city:"Montalegre",
    region:"Vila Real",
    country:"Portugal",
    lat:41.8118,
    lng:-8.04534,
    category:"mountain",
    status:"online",
    provider:"Estação Meteorológica Experimental dos Carris",
    sourceUrl:"https://carris-geres.blogspot.com/",
    embedUrl:"https://worldcam.eu/webcams/europe/portugal/40781-carris-serra-do-geres",
    description:"Vista das Minas dos Carris para o Pico da Nevosa e a Garganta das Negras, no Parque Nacional da Peneda-Gerês. A estação publica imagem e dados meteorológicos aproximadamente de 20 em 20 minutos.",
    verifiedAt:"2026-08-02",
    verification:"original-provider",
    uniqueFeed:true,
    tags:["Gerês","Peneda-Gerês","Minas dos Carris","Pico da Nevosa","Garganta das Negras","montanha","meteorologia"]
  };
  const nativeFetch=window.fetch.bind(window);
  window.fetch=async(input,init)=>{
    const response=await nativeFetch(input,init);
    const url=typeof input==="string"?input:input?.url||"";
    if(!url.includes("data/cameras.json")||!response.ok)return response;
    const cameras=await response.clone().json();
    if(cameras.some(c=>String(c.id)===camera.id||String(c.name).toLowerCase()===camera.name.toLowerCase()))return response;
    return new Response(JSON.stringify([...cameras,camera]),{status:response.status,statusText:response.statusText,headers:{"Content-Type":"application/json"}});
  };
})();
