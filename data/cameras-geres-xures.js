(()=>{
  const camera={
    id:"geres-xures-lobios-east",
    name:"Serra do Xurés - Lobios",
    city:"Lobios",
    region:"Galicia",
    country:"Spain",
    lat:41.875,
    lng:-8.086,
    category:"mountain",
    status:"online",
    provider:"MeteoLobios / Windy Webcams",
    sourceUrl:"https://www.meteolobios.es/",
    embedUrl:"https://webcams.windy.com/webcams/public/embed/player?forceFullScreenOnOverlayPlay=false&interactive=true&loop=false&playerType=month&webcamId=1609780783",
    description:"Vista para a Baixa Limia - Serra do Xurés, continuação transfronteiriça do Parque Nacional da Peneda-Gerês. A fonte original é MeteoLobios e o histórico é disponibilizado pelo Windy Webcams.",
    verifiedAt:"2026-08-02",
    verification:"original-provider",
    uniqueFeed:true,
    tags:["Gerês","Peneda-Gerês","Xurés","Lobios","Baixa Limia","Galicia","montanha","meteorologia"]
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
