(()=>{
const patches={
  "worldcam-lisbon-bugio":{provider:"MEO Beachcam",sourceUrl:"https://beachcam.meo.pt/livecams/farol-do-bugio/",embedUrl:"https://video-auth1.iol.pt/beachcam/bugio/playlist.m3u8",verification:"direct",uniqueFeed:true},
  "worldcam-cascais-ribeira":{provider:"MEO Beachcam",sourceUrl:"https://beachcam.meo.pt/livecams/praia-da-ribeira/",embedUrl:"https://video-auth1.iol.pt/beachcam/praiadaribeira/playlist.m3u8",verification:"direct",uniqueFeed:true},
  "worldcam-ericeira-calada":{provider:"MEO Beachcam",sourceUrl:"https://beachcam.meo.pt/livecams/praia-da-calada/",embedUrl:"https://video-auth1.iol.pt/beachcam/caladara/playlist.m3u8",verification:"direct",uniqueFeed:true},
  "worldcam-ericeira-praia-sul":{provider:"MEO Beachcam",sourceUrl:"https://beachcam.meo.pt/livecams/praia-do-sul/",embedUrl:"https://video-auth1.iol.pt/beachcam/praiadosul/playlist.m3u8",verification:"direct",uniqueFeed:true},
  "worldcam-ericeira-pescadores":{provider:"MEO Beachcam",sourceUrl:"https://beachcam.meo.pt/livecams/praia-dos-pescadores/",embedUrl:"https://video-auth1.iol.pt/beachcam/praiadospescadores/playlist.m3u8",verification:"direct",uniqueFeed:true},
  "worldcam-almograve":{provider:"MEO Beachcam",sourceUrl:"https://beachcam.meo.pt/livecams/almograve/",embedUrl:"https://video-auth1.iol.pt/beachcam/almograve/playlist.m3u8",verification:"direct",uniqueFeed:true},
  "worldcam-fronteira-panorama":{embedUrl:"https://worldcam.eu/webcams/europe/portugal/29178-fronteira-panoramic-view",verification:"provider-page"},
  "worldcam-gaviao-weather":{embedUrl:"https://worldcam.eu/webcams/europe/portugal/29197-gaviao-weather-station",verification:"provider-page"},
  "worldcam-grandola-panorama":{embedUrl:"https://worldcam.eu/webcams/europe/portugal/32016-grandola-panoramic-view",verification:"provider-page"},
  "worldcam-marvao-castelo":{embedUrl:"https://worldcam.eu/webcams/europe/portugal/30052-marvao-castle",verification:"provider-page"},
  "worldcam-mertola-weather":{embedUrl:"https://worldcam.eu/webcams/europe/portugal/29192-mertola-weather-station",verification:"provider-page"},
  "worldcam-monforte-panorama":{embedUrl:"https://worldcam.eu/webcams/europe/portugal/29189-monforte-panoramic-view",verification:"provider-page"},
  "worldcam-mourao-castelo":{embedUrl:"https://worldcam.eu/webcams/europe/portugal/35956-mourao-castle",verification:"provider-page"},
  "worldcam-nisa-panorama":{embedUrl:"https://worldcam.eu/webcams/europe/portugal/30051-nisa-panoramic-view",verification:"provider-page"},
  "worldcam-odemira-weather":{embedUrl:"https://worldcam.eu/webcams/europe/portugal/29075-odemira-weather-station",verification:"provider-page"},
  "worldcam-ourique-panorama":{embedUrl:"https://worldcam.eu/webcams/europe/portugal/32048-ourique-panoramic-view",status:"offline",verification:"offline"},
  "worldcam-mertola-rabbits":{provider:"Mértola Bio Live Cam",sourceUrl:"https://www.mertolabiolivecam.com/",embedUrl:"https://www.mertolabiolivecam.com/",verification:"provider-page",uniqueFeed:true}
};
const previousFetch=window.fetch.bind(window);
window.fetch=async(input,init)=>{
  const response=await previousFetch(input,init);
  const url=typeof input==="string"?input:input?.url||"";
  if(!url.includes("data/cameras.json")||!response.ok)return response;
  const cameras=await response.clone().json();
  for(const camera of cameras){
    const patch=patches[camera.id];
    if(patch)Object.assign(camera,patch,{verifiedAt:"2026-08-02"});
  }
  return new Response(JSON.stringify(cameras),{status:response.status,statusText:response.statusText,headers:{"Content-Type":"application/json"}});
};
})();
