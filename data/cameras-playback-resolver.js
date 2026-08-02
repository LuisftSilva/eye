(()=>{
  const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();

  const meoTokens=new Map(Object.entries({
    "praia do matadouro":"matadouro",
    "praia da torre":"praiatorre",
    "praia das avencas":"avencas",
    "praia do tamariz":"tamariz",
    "paco de arcos praia":"pacodearcos",
    "carcavelos calhau":"carcaveloscalhau",
    "cascais baia":"cascais",
    "praias da conceicao e duquesa":"conceicao",
    "sao joao do estoril":"saojoaoestoril",
    "sao pedro do estoril praia":"saopedroestoril",
    "parede praia":"parede",
    "guincho norte":"guincho",
    "guincho sul":"guincho",
    "praia do peneco":"praiadopeneco",
    "praia dos salgados":"salgados",
    "praia da gale leste":"gale",
    "praia do evaristo":"evaristo",
    "praia da coelha":"coelha",
    "praia dos arrifes":"arrifes",
    "praia dos alemaes":"alemaes",
    "praia da oura":"oura",
    "praia de santa eulalia":"santaeulalia",
    "praia dos olhos de agua":"olhosdeagua",
    "praia da falesia acoteias":"falesia",
    "praia de vilamoura":"vilamoura",
    "praia da rocha":"praiadarocha",
    "praia do vau":"vau",
    "carvoeiro":"carvoeiro",
    "benagil":"benagil",
    "porto de mos":"portodemos",
    "alvor praia nascente":"alvornascente",
    "alvor praia poente":"alvorpoente",
    "alvor prainha":"prainha",
    "portimao joao de arens":"joaodearens",
    "lagos praia da luz":"praiadaluz",
    "lagos praia do camilo":"camilo",
    "lagos praia de sao roque":"saoroque",
    "sagres praia do martinhal":"martinhal",
    "sagres praia da mareta":"mareta",
    "salema praia":"salema",
    "burgau praia":"burgau",
    "vila do bispo praia do zavial":"zavial",
    "vila do bispo praia da ingrina":"ingrina",
    "carrapateira praia da bordeira":"bordeira",
    "carrapateira praia do amado":"bcamado",
    "monte gordo praia":"montegordo"
  }));

  function youtubeEmbed(url){
    try{
      const u=new URL(url);
      if(u.hostname.includes("youtu.be"))return `https://www.youtube.com/embed/${u.pathname.slice(1)}?autoplay=1&mute=1`;
      if(u.hostname.includes("youtube.com")){
        const id=u.searchParams.get("v");
        if(id)return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1`;
        const m=u.pathname.match(/\/(?:embed|live)\/([^/?]+)/);
        if(m)return `https://www.youtube.com/embed/${m[1]}?autoplay=1&mute=1`;
      }
    }catch{}
    return "";
  }

  function patchCamera(c){
    const out={...c};
    const name=norm(out.name);
    const provider=norm(out.provider);
    const source=String(out.sourceUrl||"");

    if(provider.includes("netmadeira")||source.includes("netmadeira.com/webcams-madeira/")){
      const m=source.match(/netmadeira\.com\/webcams-madeira\/([^/?#]+)/i);
      if(m){
        out.embedUrl=`https://www.netmadeira.com/webcams/show/netmadeira/${m[1]}`;
        out.verification="direct";
        out.status="online";
      }
    }

    if(provider.includes("meo beachcam")){
      let token="";
      for(const [key,value] of meoTokens){
        if(name.includes(key)||key.includes(name)){token=value;break;}
      }
      if(token){
        out.embedUrl=`https://video-auth1.iol.pt/beachcam/${token}/playlist.m3u8`;
        out.verification="direct";
        out.status="online";
      }
    }

    const yt=youtubeEmbed(out.embedUrl||source);
    if(yt){
      out.embedUrl=yt;
      out.verification="direct";
      out.status="online";
    }

    return out;
  }

  const nativeFetch=window.fetch.bind(window);
  window.fetch=async(input,init)=>{
    const response=await nativeFetch(input,init);
    const url=typeof input==="string"?input:input?.url||"";
    if(!url.includes("data/cameras.json")||!response.ok)return response;
    const base=await response.clone().json();
    const patched=base.map(patchCamera);
    return new Response(JSON.stringify(patched),{status:response.status,statusText:response.statusText,headers:{"Content-Type":"application/json"}});
  };
})();