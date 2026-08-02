(()=>{
  const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  const patches=new Map(Object.entries({
    "aveiro quinta":{provider:"One Portuguese Farm / Twitch",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/37109-aveiro-farm",status:"online",verification:"specific-page"},
    "ponte de sor vista panoramica":{provider:"Meteo Alentejo",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/29196-ponte-de-sor-panoramic-view",status:"online",verification:"specific-page"},
    "portel":{provider:"Meteo Alentejo",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/30050-portel",status:"online",verification:"specific-page"},
    "redondo":{provider:"Meteo Alentejo",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/32013-redondo",status:"online",verification:"specific-page"},
    "reguengos de monsaraz vista panoramica":{provider:"Meteo Alentejo",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/35964-reguengos-de-monsaraz-panoramic-view",status:"online",verification:"specific-page"},
    "santiago do cacem vista panoramica":{provider:"Meteo Alentejo",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/34065-santiago-do-cacem-panoramic-view",status:"online",verification:"specific-page"},
    "sines estacao meteorologica":{provider:"Meteo Alentejo",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/29195-sines-weather-station",status:"offline",verification:"specific-page"},
    "sousel estacao meteorologica":{provider:"Meteo Alentejo",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/29177-sousel-weather-station",status:"online",verification:"specific-page"}
  }));
  const native=window.fetch.bind(window);
  window.fetch=async(input,init)=>{
    const response=await native(input,init);
    const url=typeof input==="string"?input:input?.url||"";
    if(!url.includes("data/cameras.json")||!response.ok)return response;
    const data=(await response.clone().json()).map(camera=>{
      const patch=patches.get(norm(camera.name));
      return patch?{...camera,...patch,verifiedAt:"2026-08-02",uniqueFeed:Boolean(patch.sourceUrl)}:camera;
    });
    return new Response(JSON.stringify(data),{status:response.status,statusText:response.statusText,headers:{"Content-Type":"application/json"}});
  };
})();
