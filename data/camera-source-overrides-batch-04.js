(()=>{
  const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  const patches=new Map(Object.entries({
    "baixa da banheira estacao meteorologica":{provider:"MeteoBXB",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/32647-baixa-da-banheira-weather-station",status:"online",verification:"specific-page"},
    "coruche ski clube quinta grande":{provider:"MEO Beachcam",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/29947-coruche-ski-clube-quinta-grande",status:"online",verification:"specific-page"},
    "silveira santa cruz":{provider:"MEO Beachcam",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/13002-silveira-santa-cruz",status:"online",verification:"specific-page"},
    "reserva natural do estuario do tejo":{provider:"FCCN Videocast / EVOA",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/27011-tagus-estuary-natural-reserve",status:"online",verification:"specific-page"},
    "peninsula de troia foz do rio":{provider:"MEO Beachcam",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/35632-troia-peninsula-river-mouth",status:"online",verification:"specific-page"},
    "santiago do cacem costa de santo andre":{provider:"MEO Beachcam / Lagoa o Mar",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/35639-santiago-do-cacem-costa-de-santo-andre",status:"online",verification:"specific-page"},
    "ponta delgada complexo balnear":{provider:"Portal NetMadeira",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/34737-ponta-delgada-complexo-balnear",status:"offline",verification:"specific-page"},
    "viana do castelo feelviana wakepark":{provider:"MEO Beachcam / FeelViana",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/29982-viana-do-castelo-feelviana-wakepark",status:"online",verification:"specific-page"},
    "vila nova de milfontes praia das furnas":{provider:"MEO Beachcam / Yabalulu",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/33224-vila-nova-de-milfontes-praia-das-furnas",status:"online",verification:"specific-page"},
    "vila praia de ancora praia":{provider:"SurfTotal / Parkdivision",sourceUrl:"https://worldcam.eu/webcams/europe/portugal/26295-vila-praia-de-ancora-beach",status:"online",verification:"specific-page"}
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
