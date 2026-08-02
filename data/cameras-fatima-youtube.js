(()=>{
  const cameras=[
    {
      id:'fatima-capelinha-youtube',name:'Fátima — Capelinha das Aparições',city:'Fátima',region:'Santarém',country:'Portugal',lat:39.6318,lng:-8.6732,category:'religious',status:'online',provider:'Santuário de Fátima / YouTube',
      sourceUrl:'https://www.youtube.com/watch?v=GENH9mWlvb4',embedUrl:'https://www.youtube.com/embed/GENH9mWlvb4',
      description:'Transmissão oficial permanente da Capelinha das Aparições.',verifiedAt:'2026-08-02',verification:'official-youtube-live',uniqueFeed:true,tags:['Fátima','Capelinha das Aparições','YouTube','direto']
    },
    {
      id:'fatima-recinto-youtube',name:'Fátima — Recinto de Oração',city:'Fátima',region:'Santarém',country:'Portugal',lat:39.6322,lng:-8.6740,category:'religious',status:'online',provider:'Santuário de Fátima / YouTube',
      sourceUrl:'https://www.youtube.com/watch?v=sN837AyNVcU',embedUrl:'https://www.youtube.com/embed/sN837AyNVcU',
      description:'Transmissão oficial do Recinto de Oração e da missa diária das 11h00.',verifiedAt:'2026-08-02',verification:'official-youtube-live',uniqueFeed:true,tags:['Fátima','Recinto de Oração','YouTube','direto']
    }
  ];
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const native=window.fetch.bind(window);
  window.fetch=async(input,init)=>{
    const response=await native(input,init);
    const url=typeof input==='string'?input:input?.url||'';
    if(!url.includes('data/cameras.json')||!response.ok)return response;
    const base=await response.clone().json();
    const filtered=base.filter(c=>!((norm(c.name).includes('fatima')&&norm(c.name).includes('santuario'))||String(c.id||'')==='worldcam-manual-fatima-santuario-33'));
    const ids=new Set(filtered.map(c=>String(c.id)));
    const merged=[...filtered,...cameras.filter(c=>!ids.has(c.id))];
    return new Response(JSON.stringify(merged),{status:response.status,statusText:response.statusText,headers:{'Content-Type':'application/json'}});
  };
})();
