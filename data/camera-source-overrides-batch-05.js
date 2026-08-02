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
    "sousel estacao meteorologica":{provider:"Meteo Alentejo",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/29177-sousel-weather-station",status:"online",verification:"specific-page"},

    "fronteira vista panoramica":{provider:"Meteo Alentejo",sourceUrl:"https://www.meteoalentejo.pt/webcams/webcam-fronteira/",status:"online",verification:"original-provider"},
    "gaviao estacao meteorologica":{provider:"Meteo Alentejo",sourceUrl:"https://www.meteoalentejo.pt/webcam-gaviao-2021/",status:"online",verification:"original-provider"},
    "grandola vista panoramica":{provider:"Meteo Alentejo",sourceUrl:"https://www.meteoalentejo.pt/webcam-grandola/",status:"online",verification:"original-provider"},
    "marvao castelo":{provider:"Meteo Alentejo",sourceUrl:"https://www.meteoalentejo.pt/webcam-marvao/",status:"online",verification:"original-provider"},
    "mourao castelo":{provider:"Meteo Alentejo",sourceUrl:"https://www.meteoalentejo.pt/webcam-mourao/",status:"online",verification:"original-provider"},
    "nisa vista panoramica":{provider:"Meteo Alentejo",sourceUrl:"https://www.meteoalentejo.pt/webcam-nisa/",status:"online",verification:"original-provider"},
    "moura vista panoramica":{provider:"Meteo Alentejo",sourceUrl:"https://www.meteoalentejo.pt/moura/webcam-moura/",status:"unknown",verification:"original-provider"},

    "ferreira do zezere lago azul":{provider:"MEO Beachcam",sourceUrl:"https://beachcam.meo.pt/livecams/ferreira-do-zezere-lago-azul/",status:"online",verification:"original-provider"},
    "ferreira do zezere dornes":{provider:"MEO Beachcam",sourceUrl:"https://beachcam.meo.pt/livecams/ferreira-do-zezere-dornes/",status:"online",verification:"original-provider"},
    "pedrogao grande praia fluvial do cabril":{provider:"MEO Beachcam",sourceUrl:"https://beachcam.meo.pt/livecams/praia-fluvial-do-cabril/",status:"online",verification:"original-provider"},
    "nazare forte de sao miguel arcanjo":{provider:"MEO Beachcam",sourceUrl:"https://beachcam.meo.pt/livecams/nazare-forte-sao-miguel-arcanjo/",status:"online",verification:"original-provider"},
    "lisboa farol do bugio":{provider:"MEO Beachcam",sourceUrl:"https://beachcam.meo.pt/livecams/farol-do-bugio/",status:"unknown",verification:"original-provider"},
    "cascais praia da ribeira":{provider:"MEO Beachcam",sourceUrl:"https://beachcam.meo.pt/livecams/cascais/",status:"online",verification:"original-provider"},
    "sao pedro do estoril praia":{provider:"MEO Beachcam",sourceUrl:"https://beachcam.meo.pt/livecams/sao-pedro-do-estoril/",status:"online",verification:"original-provider"},
    "ericeira praia da calada":{provider:"MEO Beachcam",sourceUrl:"https://beachcam.meo.pt/livecams/praia-da-calada/",status:"online",verification:"original-provider"},
    "ericeira praia do matadouro":{provider:"MEO Beachcam",sourceUrl:"https://beachcam.meo.pt/livecams/matadouro/",status:"online",verification:"original-provider"},
    "ericeira praia do sul":{provider:"MEO Beachcam",sourceUrl:"https://beachcam.meo.pt/livecams/praia-do-sul/",status:"online",verification:"original-provider"},
    "ericeira praia dos pescadores":{provider:"MEO Beachcam",sourceUrl:"https://beachcam.meo.pt/livecams/pescadores/",status:"online",verification:"original-provider"},
    "odemira praia do almograve":{provider:"MEO Beachcam",sourceUrl:"https://beachcam.meo.pt/livecams/almograve/",status:"online",verification:"original-provider"},
    "viana do castelo praia do cabedelo":{provider:"FeelViana / Surfline",sourceUrl:"https://www.feelviana.com/webcam",embedUrl:"https://embed.cdn-surfline.com/cams/5a4e62621c60d700101da59a/df316dcb1ad772213e899638a1d57bf115f4ec13",status:"online",verification:"original-embed"},
    "viana do castelo feelviana wakepark":{provider:"FeelViana / Surfline",sourceUrl:"https://www.feelviana.com/webcam",embedUrl:"https://embed.cdn-surfline.com/cams/613205b46012d3ad55a4eec5/ba821de41fedcb2cdd9cdc28e95d92e4450dad63",status:"online",verification:"original-embed"},
    "portimao marina":{provider:"PlayOcean / YouTube",sourceUrl:"https://www.playocean.net/en/cameras/portimao-marina-north",embedUrl:"https://www.youtube.com/embed/w7rzgn6WXs8?autoplay=1&mute=1",status:"online",verification:"official-youtube"}
  }));
  const native=window.fetch.bind(window);
  window.fetch=async(input,init)=>{
    const response=await native(input,init);
    const url=typeof input==="string"?input:input?.url||"";
    if(!url.includes("data/cameras.json")||!response.ok)return response;
    const data=(await response.clone().json()).map(camera=>{
      const patch=patches.get(norm(camera.name));
      return patch?{...camera,...patch,verifiedAt:"2026-08-02",uniqueFeed:Boolean(patch.sourceUrl||patch.embedUrl)}:camera;
    });
    return new Response(JSON.stringify(data),{status:response.status,statusText:response.statusText,headers:{"Content-Type":"application/json"}});
  };
})();
