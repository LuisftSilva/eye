(()=>{
  const overrides={
    "worldcam-ferreira-lago-azul":{provider:"MEO Beachcam",sourceUrl:"https://back-office.beachcam.pt/livecams/ferreira-do-zezere-lago-azul/",status:"online",verification:"original-provider"},
    "worldcam-lisbon-panorama":{provider:"WorldCam / I Love LX",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/3900-lisbon-panoramic-view",status:"online",verification:"specific-page"},
    "worldcam-praia-pequena-rodizio":{provider:"Surfline",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/19891-colares-praia-pequena-do-rodizio",status:"offline",verification:"specific-page"},
    "worldcam-ericeira-matadouro":{provider:"MEO Beachcam",sourceUrl:"https://beachcam.meo.pt/livecams/matadouro/",status:"online",verification:"original-provider"},
    "worldcam-manteigas-serra-estrela":{provider:"MeteoManteigas",sourceUrl:"https://meteomanteigas.com/",status:"online",verification:"original-provider"},
    "worldcam-mondim-panorama":{provider:"Visit Mondim de Basto",sourceUrl:"https://visit.mondimdebasto.pt/index.php",status:"online",verification:"original-provider"},
    "worldcam-cabril-river-beach":{provider:"MEO Beachcam",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/35640-pedrogao-grande-praia-fluvial-do-cabril",status:"online",verification:"specific-page"},
    "worldcam-porto-dom-luis":{provider:"Visitar Porto",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/13970-porto-dom-luis-i-bridge",status:"online",verification:"specific-page"},
    "worldcam-viana-cabedelo":{provider:"FeelViana",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/29245-viana-do-castelo-praia-do-cabedelo",status:"online",verification:"specific-page"},
    "worldcam-nazare-forte":{provider:"MEO Beachcam",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/27713-nazare-forte-de-sao-miguel-arcanjo",status:"online",verification:"specific-page"},
    "worldcam-lisbon-alges-bridge":{sourceUrl:"https://worldcam.eu/webcams/europe/portugal/25035-lisbon-alges-ponte-25-de-abril",status:"online",verification:"specific-page"},
    "worldcam-fronteira-panorama":{provider:"Meteo Alentejo",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/29178-fronteira-panoramic-view",status:"online",verification:"specific-page"},
    "worldcam-gaviao-weather":{provider:"Meteo Alentejo",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/29197-gaviao-weather-station",status:"online",verification:"specific-page"},
    "worldcam-grandola-panorama":{provider:"Meteo Alentejo",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/32016-grandola-panoramic-view",status:"online",verification:"specific-page"},
    "worldcam-marvao-castelo":{provider:"Meteo Alentejo",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/30052-marvao-castle",status:"online",verification:"specific-page"},
    "worldcam-monforte-panorama":{provider:"Meteo Alentejo",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/29189-monforte-panoramic-view",status:"online",verification:"specific-page"},
    "worldcam-mourao-castelo":{provider:"Meteo Alentejo",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/35956-mourao-castle",status:"online",verification:"specific-page"},
    "worldcam-nisa-panorama":{provider:"Meteo Alentejo",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/30051-nisa-panoramic-view",status:"online",verification:"specific-page"},
    "worldcam-mertola-weather":{provider:"Meteo Alentejo",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/29192-mertola-weather-station",status:"online",verification:"specific-page"},
    "worldcam-odemira-weather":{provider:"Meteo Alentejo",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/29075-odemira-weather-station",status:"offline",verification:"specific-page"},
    "worldcam-montemor-novo-panorama":{provider:"Meteo Alentejo",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/35960-montemor-o-novo-panoramic-view",status:"online",verification:"specific-page"},
    "worldcam-mertola-rabbits":{provider:"Mértola Bio Live Cam",sourceUrl:"https://www.mertolabiolivecam.com/",status:"online",verification:"original-provider"},
    "worldcam-lisbon-airport":{provider:"Aviação TV",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/34767-lisbon-airport",status:"online",verification:"specific-page"},
    "worldcam-portimao-marina":{provider:"PlayOcean",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/29201-portimao-marina-de-portimao",status:"online",verification:"specific-page"}
  };
  const nativeFetch=window.fetch.bind(window);
  window.fetch=async(input,init)=>{
    const response=await nativeFetch(input,init);
    const url=typeof input==="string"?input:input?.url||"";
    if(!url.includes("data/cameras.json")||!response.ok)return response;
    const cameras=await response.clone().json();
    const patched=cameras.map(camera=>{
      const patch=overrides[String(camera.id)];
      if(!patch)return camera;
      return {...camera,...patch,verifiedAt:"2026-08-02",uniqueFeed:true};
    });
    return new Response(JSON.stringify(patched),{status:response.status,statusText:response.statusText,headers:{"Content-Type":"application/json"}});
  };
})();
