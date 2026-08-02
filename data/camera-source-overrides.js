(()=>{
  const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();

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
    "worldcam-lisbon-alges-bridge":{provider:"Porto de Lisboa",sourceUrl:"https://www.portodelisboa.pt/tejo-live",status:"online",verification:"original-provider"},
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
    "worldcam-portimao-marina":{provider:"PlayOcean",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/29201-portimao-marina-de-portimao",status:"online",verification:"specific-page"},
    "worldcam-ourique-panorama":{provider:"Meteo Alentejo",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/32048-ourique-panoramic-view",status:"offline",verification:"specific-page"},
    "worldcam-moura-panorama":{provider:"Meteo Alentejo",sourceUrl:"",status:"offline",verification:"source-unavailable"},
    "worldcam-lisbon-marvila":{provider:"Marvila Live Cam",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/37825-lisbon-marvila",status:"online",verification:"specific-page"},
    "worldcam-lisbon-vasco-gama":{provider:"Lusoponte",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/40620-lisbon-vasco-da-gama-bridge",status:"online",verification:"specific-page"},
    "worldcam-lisbon-escala25":{provider:"PlayOcean / Escala25",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/3675-lisbon-escala25-25-de-abril-bridge",status:"offline",verification:"specific-page"},
    "worldcam-lisbon-bugio":{provider:"MEO Beachcam",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/29945-lisbon-farol-do-bugio",status:"offline",verification:"specific-page"}
  };

  const byName=new Map(Object.entries({
    "albufeira praia da gale":{provider:"MEO Beachcam",sourceUrl:"https://beachcam.meo.pt/livecams/gale/",status:"online",verification:"original-provider"},
    "alvor praia do alvor":{provider:"MEO Beachcam",sourceUrl:"https://beachcam.meo.pt/livecams/alvor/",status:"online",verification:"original-provider"},
    "carvoeiro praia":{provider:"MEO Beachcam",sourceUrl:"https://beachcam.meo.pt/livecams/carvoeiro/",status:"online",verification:"original-provider"},
    "colares praia grande":{provider:"MEO Beachcam",sourceUrl:"https://beachcam.meo.pt/livecams/praia-grande/",status:"online",verification:"original-provider"},
    "comporta praia do carvalhal":{provider:"MEO Beachcam",sourceUrl:"https://beachcam.meo.pt/livecams/carvalhal/",status:"online",verification:"original-provider"},
    "costa da caparica praia de santo antonio":{provider:"MEO Beachcam",sourceUrl:"https://beachcam.meo.pt/livecams/costa-da-caparica/",status:"online",verification:"original-provider"},
    "costa da caparica praia do tarquinio paraiso":{provider:"MEO Beachcam",sourceUrl:"https://beachcam.meo.pt/livecams/costa-da-caparica/",status:"online",verification:"original-provider"},
    "ericeira praia":{provider:"MEO Beachcam",sourceUrl:"https://beachcam.meo.pt/livecams/pescadores/",status:"online",verification:"original-provider"},
    "lagos praia de porto de mos":{provider:"MEO Beachcam",sourceUrl:"https://beachcam.meo.pt/livecams/porto-de-mos/",status:"online",verification:"original-provider"},
    "marinha grande sao pedro de moel praia":{provider:"MEO Beachcam",sourceUrl:"https://beachcam.meo.pt/livecams/sao-pedro-de-moel/",status:"online",verification:"original-provider"},
    "oeiras praia de santo amaro":{provider:"MEO Beachcam",sourceUrl:"https://beachcam.meo.pt/livecams/santo-amaro-de-oeiras/",status:"online",verification:"original-provider"},
    "praia da luz":{provider:"MEO Beachcam",sourceUrl:"https://beachcam.meo.pt/livecams/praia-da-luz/",status:"online",verification:"original-provider"},
    "praia da rocha":{provider:"MEO Beachcam",sourceUrl:"https://beachcam.meo.pt/livecams/praia-da-rocha/",status:"online",verification:"original-provider"},
    "ribeira d ilhas praia":{provider:"MEO Beachcam",sourceUrl:"https://beachcam.meo.pt/livecams/ribeira-d-ilhas/",status:"online",verification:"original-provider"},
    "sagres praia da mareta":{provider:"MEO Beachcam",sourceUrl:"https://beachcam.meo.pt/livecams/mareta/",status:"online",verification:"original-provider"},
    "funchal avenida arriaga e jardim municipal":{provider:"NetMadeira",sourceUrl:"https://www.netmadeira.com/webcams-madeira/funchal-baia-do-funchal",status:"online",verification:"original-provider"},
    "funchal panorama costeiro":{provider:"NetMadeira",sourceUrl:"https://www.netmadeira.com/webcams-madeira/funchal-pontinha",status:"online",verification:"original-provider"},
    "machico santo da serra golf club":{provider:"NetMadeira",sourceUrl:"https://www.netmadeira.com/webcams-madeira/santo-da-serra-golf",status:"online",verification:"original-provider"},
    "ponta do sol praia":{provider:"NetMadeira",sourceUrl:"https://www.netmadeira.com/webcams-madeira/ponta-do-sol",status:"online",verification:"original-provider"},
    "porto moniz panorama costeiro":{provider:"NetMadeira",sourceUrl:"https://www.netmadeira.com/webcams-madeira/porto-moniz",status:"online",verification:"original-provider"},
    "madeira seixal praia do porto":{provider:"NetMadeira",sourceUrl:"https://www.netmadeira.com/webcams-madeira/seixal",status:"online",verification:"original-provider"},
    "cortes do meio penhas da saude":{provider:"MeteoEstrela",sourceUrl:"https://www.meteoestrela.pt/",status:"online",verification:"original-provider"},
    "fatima santuario":{provider:"Santuário de Fátima",sourceUrl:"https://www.fatima.pt/pt/pages/transmissoes-online",status:"online",verification:"original-provider"},
    "viseu aerodromo goncalves lobato":{provider:"FlyWeather",sourceUrl:"https://www.flyweather.net/",status:"online",verification:"original-provider"}
  }));

  function isGeneric(url){
    if(!url)return false;
    try{
      const u=new URL(url),host=u.hostname.replace(/^www\./,""),path=u.pathname.replace(/\/+$/g,"");
      if(host==="worldcam.eu")return path===""||path==="/webcams/europe/portugal"||path==="/webcams/europe/portugal/list/100"||path==="/webcams/europe/portugal/lisboa"||path==="/webcams/category/harbours/portugal";
      if(host==="beachcam.meo.pt"||host==="back-office.beachcam.pt")return path===""||path==="/livecams"||path==="/praias";
      if(host==="meteoalentejo.pt"||host==="madeiracams.pt")return path==="";
      return false;
    }catch{return false;}
  }

  const nativeFetch=window.fetch.bind(window);
  window.fetch=async(input,init)=>{
    const response=await nativeFetch(input,init);
    const url=typeof input==="string"?input:input?.url||"";
    if(!url.includes("data/cameras.json")||!response.ok)return response;
    const cameras=await response.clone().json();
    const patched=cameras.map(camera=>{
      const patch=overrides[String(camera.id)]||byName.get(norm(camera.name));
      if(patch)return {...camera,...patch,verifiedAt:"2026-08-02",uniqueFeed:Boolean(patch.sourceUrl)};
      if(isGeneric(camera.sourceUrl))return {...camera,sourceUrl:"",status:camera.status==="offline"?"offline":"unknown",verification:"source-pending",uniqueFeed:false};
      return camera;
    });
    return new Response(JSON.stringify(patched),{status:response.status,statusText:response.statusText,headers:{"Content-Type":"application/json"}});
  };
})();
