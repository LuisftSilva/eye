const state = { cameras: [], view: 'grid', map: null, markers: [] };
const $ = (s) => document.querySelector(s);
const statusLabel = { online: 'Online', offline: 'Offline', unknown: 'Por confirmar' };
const categoryIcon = { panorama:'◉', porto:'⚓', trânsito:'⇄', praia:'≈', aeroporto:'✈', natureza:'⌁' };

async function init(){
  const response = await fetch('data/cameras.json');
  state.cameras = await response.json();
  updateStats();
  render();
  bindEvents();
}
function updateStats(){
  $('#uniqueCount').textContent = state.cameras.filter(c=>c.uniqueFeed).length;
  $('#onlineCount').textContent = state.cameras.filter(c=>c.status==='online').length;
  $('#sourceCount').textContent = new Set(state.cameras.map(c=>c.provider)).size;
}
function filtered(){
  const q = $('#searchInput').value.trim().toLowerCase();
  const status = $('#statusFilter').value;
  const unique = $('#uniqueOnly').checked;
  return state.cameras.filter(c => {
    const hay = [c.name,c.city,c.region,c.country,c.provider,c.description,...c.tags].join(' ').toLowerCase();
    return (!q || hay.includes(q)) && (status==='all'||c.status===status) && (!unique||c.uniqueFeed);
  });
}
function render(){
  const items = filtered();
  const grid = $('#gridView');
  grid.innerHTML = items.length ? items.map(cardTemplate).join('') : '<div class="empty">Nenhuma câmara corresponde aos filtros.</div>';
  grid.querySelectorAll('.card').forEach(el=>el.addEventListener('click',()=>openCamera(el.dataset.id)));
  if(state.view==='map') renderMap(items);
}
function cardTemplate(c){
  return `<article class="card" data-id="${c.id}" tabindex="0">
    <div class="preview">
      <span class="status ${c.status}">${statusLabel[c.status]}</span>
      ${c.uniqueFeed ? '' : '<span class="duplicate">fonte alternativa</span>'}
      <span class="preview-symbol">${categoryIcon[c.category]||'◉'}</span>
    </div>
    <div class="card-body">
      <h2>${c.name}</h2>
      <div class="meta">${c.city}, ${c.region} · ${c.category}</div>
      <p class="description">${c.description}</p>
      <div class="card-footer"><span class="provider">${c.provider}</span><span class="open-label">Abrir →</span></div>
    </div>
  </article>`;
}
function openCamera(id){
  const c = state.cameras.find(x=>x.id===id);
  const dialog = $('#cameraDialog');
  $('#dialogContent').innerHTML = `
    <div class="dialog-hero">${categoryIcon[c.category]||'◉'}</div>
    <div class="dialog-body">
      <div class="meta">${c.city}, ${c.region}, ${c.country}</div>
      <h2>${c.name}</h2>
      <p class="description">${c.description}</p>
      <p class="meta"><strong>Fornecedor:</strong> ${c.provider}<br><strong>Verificado:</strong> ${c.verifiedAt}<br><strong>Estado:</strong> ${statusLabel[c.status]}</p>
      <div class="tags">${c.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>
      <div class="dialog-actions">
        <a class="primary" href="${c.sourceUrl}" target="_blank" rel="noopener noreferrer">Ver transmissão ↗</a>
        <a class="secondary" href="https://www.google.com/maps?q=${c.lat},${c.lng}" target="_blank" rel="noopener noreferrer">Abrir localização</a>
      </div>
    </div>`;
  dialog.showModal();
}
function renderMap(items){
  if(!state.map){
    state.map = L.map('map').setView([-1.4558,-48.4902],12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      maxZoom:19, attribution:'&copy; OpenStreetMap'
    }).addTo(state.map);
  }
  state.markers.forEach(m=>m.remove());
  state.markers = items.map(c=>{
    const marker=L.marker([c.lat,c.lng]).addTo(state.map);
    marker.bindPopup(`<strong>${c.name}</strong><br>${c.provider}<br><button onclick="window.openCameraFromMap('${c.id}')">Abrir</button>`);
    return marker;
  });
  setTimeout(()=>state.map.invalidateSize(),100);
}
window.openCameraFromMap = openCamera;
function bindEvents(){
  $('#searchInput').addEventListener('input',render);
  $('#statusFilter').addEventListener('change',render);
  $('#uniqueOnly').addEventListener('change',render);
  $('#closeDialog').addEventListener('click',()=>$('#cameraDialog').close());
  $('#cameraDialog').addEventListener('click',e=>{if(e.target===$('#cameraDialog')) $('#cameraDialog').close()});
  document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>{
    state.view=btn.dataset.view;
    document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b===btn));
    $('#gridView').classList.toggle('hidden',state.view!=='grid');
    $('#mapView').classList.toggle('hidden',state.view!=='map');
    render();
  }));
  $('#themeToggle').addEventListener('click',()=>{
    document.documentElement.classList.toggle('light');
    localStorage.setItem('theme',document.documentElement.classList.contains('light')?'light':'dark');
  });
  if(localStorage.getItem('theme')==='light') document.documentElement.classList.add('light');
}
init().catch(err=>{
  console.error(err);
  $('#gridView').innerHTML='<div class="empty">Não foi possível carregar os dados.</div>';
});
