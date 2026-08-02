(()=>{
  const cams=[
    {
      id:'lisbon-tejo-live-cacilhas',
      name:'Lisboa - Tejo Live - Câmara Cacilhas',
      city:'Almada',region:'Setúbal',country:'Portugal',lat:38.6869,lng:-9.1483,category:'harbour',status:'online',
      provider:'Porto de Lisboa / YouTube',
      sourceUrl:'https://www.youtube.com/watch?v=Asr_I2BMS3c',
      embedUrl:'https://www.youtube.com/embed/Asr_I2BMS3c?autoplay=1&mute=1',
      description:'Vista do estuário do Tejo a partir de Cacilhas, entre as pontes 25 de Abril e Vasco da Gama.',
      verifiedAt:'2026-08-02',verification:'official-youtube',uniqueFeed:true,
      tags:['Lisboa','Cacilhas','Tejo','Porto de Lisboa','YouTube','porto']
    },
    {
      id:'lisbon-tejo-live-vts-alges',
      name:'Lisboa - Tejo Live - Câmara VTS Algés',
      city:'Algés',region:'Lisboa',country:'Portugal',lat:38.6983,lng:-9.2296,category:'harbour',status:'online',
      provider:'Porto de Lisboa / YouTube',
      sourceUrl:'https://www.youtube.com/watch?v=FE-JfjvXFEU',
      embedUrl:'https://www.youtube.com/embed/FE-JfjvXFEU?autoplay=1&mute=1',
      description:'Vista do Centro de Coordenação e Controlo de Tráfego Marítimo em Algés para a Ponte 25 de Abril e a aproximação ao Porto de Lisboa.',
      verifiedAt:'2026-08-02',verification:'official-youtube',uniqueFeed:true,
      tags:['Lisboa','Algés','Tejo','VTS','Porto de Lisboa','YouTube','porto']
    }
  ];
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const native=window.fetch.bind(window);
  window.fetch=async(input,init)=>{
    const r=await native(input,init),url=typeof input==='string'?input:input?.url||'';
    if(!url.includes('data/cameras.json')||!r.ok)return r;
    let data=await r.clone().json();
    data=data.filter(c=>{
      const n=norm(c.name);
      return !(n.includes('lisboa alges ponte 25 de abril')||n==='fatima santuario');
    });
    const ids=new Set(data.map(c=>String(c.id)));
    for(const cam of cams)if(!ids.has(cam.id))data.push(cam);
    return new Response(JSON.stringify(data),{status:r.status,statusText:r.statusText,headers:{'Content-Type':'application/json'}});
  };
})();
