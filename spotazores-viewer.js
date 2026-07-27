(()=>{
  const viewer=document.getElementById("viewer");
  const provider=document.getElementById("viewerProvider");
  const frame=document.getElementById("cameraFrame");
  if(!viewer||!provider||!frame)return;

  const sync=()=>{
    const active=provider.textContent.trim()==="SpotAzores"&&viewer.classList.contains("open");
    viewer.classList.toggle("spotazores-mode",active);
    frame.classList.toggle("spotazores-page",active);
    if(active){
      frame.setAttribute("scrolling","yes");
      frame.setAttribute("allow","autoplay; fullscreen; picture-in-picture");
    }else{
      frame.removeAttribute("scrolling");
    }
  };

  new MutationObserver(sync).observe(provider,{childList:true,subtree:true,characterData:true});
  new MutationObserver(sync).observe(viewer,{attributes:true,attributeFilter:["class"]});
  frame.addEventListener("load",sync);
  sync();
})();
