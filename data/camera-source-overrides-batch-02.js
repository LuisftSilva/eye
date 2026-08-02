(()=>{
  const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  const byName=new Map(Object.entries({
    "almodovar estacao meteorologica":{provider:"Meteo Alentejo",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/29076-almodovar-weather-station",status:"online",verification:"specific-page"},
    "alter do chao estacao meteorologica":{provider:"Meteo Alentejo",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/29190-alter-do-chao-weather-station",status:"online",verification:"specific-page"},
    "alvito vista panoramica":{provider:"Meteo Alentejo",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/34064-alvito-panoramic-view",status:"online",verification:"specific-page"},
    "avis vista panoramica":{provider:"Meteo Alentejo",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/35959-avis-panoramic-view",status:"online",verification:"specific-page"},
    "borba vista panoramica":{provider:"Meteo Alentejo",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/34063-borba-panoramic-view",status:"online",verification:"specific-page"},
    "campo maior castelo":{provider:"Meteo Alentejo",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/35958-campo-maior-castle",status:"online",verification:"specific-page"},
    "castro verde vista panoramica":{provider:"Meteo Alentejo",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/29147-castro-verde-panoramic-view",status:"online",verification:"specific-page"},
    "cuba vista panoramica":{provider:"Meteo Alentejo",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/32280-cuba-panoramic-view",status:"online",verification:"specific-page"},
    "ferreira do alentejo vista panoramica":{provider:"Meteo Alentejo",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/35961-ferreira-do-alentejo-panoramic-view",status:"online",verification:"specific-page"},
    "serpa estacao meteorologica":{provider:"Meteo Alentejo",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/29074-serpa-weather-station",status:"online",verification:"specific-page"}
  }));
  const nativeFetch=window.fetch.bind(window);
  window.fetch=async(input,init)=>{
    const response=await nativeFetch(input,init);
    const url=typeof input==="string"?input:input?.url||"";
    if(!url.includes("data/cameras.json")||!response.ok)return response;
    const cameras=await response.clone().json();
    const patched=cameras.map(camera=>{
      const patch=byName.get(norm(camera.name));
      return patch?{...camera,...patch,verifiedAt:"2026-08-02",uniqueFeed:true}:camera;
    });
    return new Response(JSON.stringify(patched),{status:response.status,statusText:response.statusText,headers:{"Content-Type":"application/json"}});
  };
})();
