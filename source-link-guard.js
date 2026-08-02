(()=>{
  const link=document.getElementById("openSource");
  const video=document.getElementById("cameraVideo");
  const frame=document.getElementById("cameraFrame");
  if(!link)return;

  function normalize(url){
    if(!url||url==="#"||url==="about:blank")return "";
    try{
      const parsed=new URL(url,location.href);
      return /^https?:$/.test(parsed.protocol)?parsed.href:"";
    }catch{return "";}
  }

  function isGeneric(url){
    const normalized=normalize(url);
    if(!normalized)return true;
    try{
      const parsed=new URL(normalized);
      const host=parsed.hostname.replace(/^www\./,"");
      const path=parsed.pathname.replace(/\/+$/g,"");

      if(host==="worldcam.eu"){
        return path===""||
          path==="/webcams"||
          /^\/webcams\/europe\/portugal(?:\/list\/\d+)?$/i.test(path)||
          /^\/webcams\/category\/[^/]+\/portugal$/i.test(path);
      }

      if(host==="beachcam.meo.pt"||host==="back-office.beachcam.pt"){
        return path===""||path==="/livecams"||path==="/praias";
      }

      if(host==="madeiracams.pt"||host==="meteoalentejo.pt")return path==="";
      return false;
    }catch{return true;}
  }

  function mediaFallback(){
    const candidates=[
      video?.currentSrc,
      video?.getAttribute("src"),
      frame?.getAttribute("src")
    ];
    return candidates.map(normalize).find(url=>url&&!isGeneric(url))||"";
  }

  function sync(){
    const current=normalize(link.getAttribute("href"));
    const target=current&&!isGeneric(current)?current:mediaFallback();
    const usable=Boolean(target);

    if(usable&&link.getAttribute("href")!==target)link.setAttribute("href",target);
    link.hidden=!usable;
    link.setAttribute("aria-disabled",usable?"false":"true");
    if(usable)link.setAttribute("target","_blank");
    else link.removeAttribute("target");
  }

  new MutationObserver(sync).observe(link,{attributes:true,attributeFilter:["href"]});
  if(video)new MutationObserver(sync).observe(video,{attributes:true,attributeFilter:["src","class"]});
  if(frame)new MutationObserver(sync).observe(frame,{attributes:true,attributeFilter:["src","class"]});
  link.addEventListener("click",event=>{if(link.getAttribute("aria-disabled")==="true")event.preventDefault();});
  sync();
})();
