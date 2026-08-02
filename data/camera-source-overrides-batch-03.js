(()=>{
  const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  const patches=new Map(Object.entries({
    "calheta vista panoramica":{provider:"Madeira Webcam / YouTube",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/19773-calheta-panoramic-view",status:"online",verification:"specific-page"},
    "garajau cristo rei":{provider:"Ferienwohnung auf Madeira",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/4920-garajau-cristo-rei",status:"online",verification:"specific-page"},
    "jardim do mar":{provider:"MEO Beachcam",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/12999-jardim-do-mar",status:"online",verification:"specific-page"},
    "madeira jardim do mar ponta pequena":{provider:"MEO Beachcam",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/35641-madeira-jardim-do-mar-ponta-pequena",status:"online",verification:"specific-page"},
    "madeira paul do mar praia":{provider:"MEO Beachcam",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/35642-madeira-paul-do-mar-beach",status:"online",verification:"specific-page"},
    "madeira santa cruz canico praia dos reis magos":{provider:"WorldCam",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/madeira",status:"online",verification:"specific-region-page"},
    "madeira sao vicente faja da areia":{provider:"WorldCam",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/madeira",status:"online",verification:"specific-region-page"},
    "sao vicente miradouro":{provider:"Miradouro.pt",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/31633-sao-vicente-miradouro",status:"online",verification:"specific-page"},
    "albufeira alfagar village":{provider:"Alfagar",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/26908-albufeira-alfagar-village",status:"online",verification:"specific-page"},
    "armacao de pera praia":{provider:"MEO Beachcam",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/28285-armacao-de-pera-beach",status:"online",verification:"specific-page"},
    "faro avenida da republica":{provider:"SkylineWebcams",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/33091-faro-avenida-da-republica",status:"online",verification:"specific-page"},
    "faro parque natural da ria formosa":{provider:"FCCN Videocast",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/27010-faro-ria-formosa-natural-park",status:"offline",verification:"specific-page"},
    "ferragudo praia grande":{provider:"MEO Beachcam",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/2803-ferragudo-praia-grande",status:"online",verification:"specific-page"},
    "sagres praia":{provider:"WorldCam",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/faro",status:"online",verification:"specific-region-page"},
    "castanheira de pera praia das rocas":{provider:"MEO Beachcam",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/14193-castanheira-de-pera-praia-das-rocas",status:"online",verification:"specific-page"},
    "chaves outeiro seco":{provider:"Outeiro Seco",sourceUrl:"http://www.outeiroseco.com/",status:"online",verification:"original-provider"},
    "cinfaes gralheira":{provider:"Gralheira Webcams",sourceUrl:"https://webcams.gralheira.net/",status:"online",verification:"original-provider"},
    "esposende praia":{provider:"MEO Beachcam",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/33041-esposende-beach",status:"online",verification:"specific-page"},
    "esposende praia de ofir":{provider:"SurfTotal",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/26292-esposende-ofir-beach",status:"online",verification:"specific-page"},
    "ferreira do zezere dornes":{provider:"MEO Beachcam",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/21904-ferreira-do-zezere-dornes",status:"online",verification:"specific-page"},
    "leca da palmeira bar do oscar":{provider:"SurfTotal",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/33111-leca-da-palmeira-bar-do-oscar",status:"online",verification:"specific-page"},
    "murtosa praia da torreira":{provider:"MEO Beachcam",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/30082-murtosa-praia-da-torreira",status:"online",verification:"specific-page"},
    "povoa de varzim praia da agucadoura":{provider:"SurfTotal",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/26293-povoa-de-varzim-agucadoura-beach",status:"online",verification:"specific-page"},
    "serra da estrela lagoa":{provider:"Ski Serra da Estrela",sourceUrl:"https://www.skiserradaestrela.com/",status:"online",verification:"original-provider"},
    "vale do zezere vilar barroco":{provider:"Synaterra",sourceUrl:"https://www.synaterra.com/",status:"online",verification:"original-provider"}
  }));
  const native=window.fetch.bind(window);
  window.fetch=async(input,init)=>{
    const r=await native(input,init);
    const url=typeof input==="string"?input:input?.url||"";
    if(!url.includes("data/cameras.json")||!r.ok)return r;
    const data=(await r.clone().json()).map(c=>{
      const p=patches.get(norm(c.name));
      return p?{...c,...p,verifiedAt:"2026-08-02",uniqueFeed:Boolean(p.sourceUrl)}:c;
    });
    return new Response(JSON.stringify(data),{status:r.status,statusText:r.statusText,headers:{"Content-Type":"application/json"}});
  };
})();
