/* =====================================================
   NAVEGACIÓN MÓVIL ROBUSTA (FINAL)
   - Botón IR nunca queda “sin hacer nada”
   - Espera GPS + Routing con estado visible
   - Autocompletado + fallback
   - Ruta + ETA + modo conducción
   NO MODIFICA HTML/CSS EXISTENTE
===================================================== */
(function(){

/* ================= CONFIG ================= */
const DRIVE_ZOOM = 17;
const OFFSET_DISTANCE = 0.0012;
const SPEED_THRESHOLD = 2; // m/s ~ 7 km/h

/* ================= STATE ================= */
let routingControl = null;
let currentPos = null;
let routingReady = false;
let drivingMode = false;
let vehicleMarker = null;
let lastHeading = null;
let debounceTimer = null;
let pendingDestination = null; // <-- clave: guarda destino hasta que GPS+Routing estén listos

/* ================= WAIT READY ================= */
(function waitReady(){
  if (window.mapa && window.L && document.getElementById('mapCardContent')){
    injectSearchUI();
    injectETABox();
    injectStatusBar();
    initGPS();
    loadRouting();
  } else {
    setTimeout(waitReady, 200);
  }
})();

/* ================= UI: BUSCADOR + IR ================= */
function injectSearchUI(){
  if (document.getElementById('navSearchInput')) return;

  const style = document.createElement('style');
  style.textContent = `
    .nav-search-wrap{position:relative;margin-bottom:10px}
    .nav-search-row{display:flex;gap:6px}
    .nav-search-row input{
      flex:1;border:1px solid #e2e8f0;border-radius:10px;
      padding:10px 12px;font-size:13px;outline:none
    }
    .nav-search-row button{
      border:none;background:linear-gradient(135deg,#60a5fa,#2563eb);
      color:#fff;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer
    }
    .nav-suggestions{
      position:absolute;top:46px;left:0;right:0;background:#fff;border-radius:10px;
      box-shadow:0 12px 28px rgba(0,0,0,.18);z-index:9999;overflow:hidden;display:none
    }
    .nav-suggestion{
      padding:10px 12px;font-size:13px;cursor:pointer;border-bottom:1px solid #e5e7eb
    }
    .nav-suggestion:last-child{border-bottom:none}
    .nav-suggestion:hover{background:#f1f5f9}
  `;
  document.head.appendChild(style);

  const wrap = document.createElement('div');
  wrap.className = 'nav-search-wrap';
  wrap.innerHTML = `
    <div class="nav-search-row">
      <input id="navSearchInput" type="text" placeholder="Buscar destino…" autocomplete="off">
      <button id="navGoBtn">Ir</button>
    </div>
    <div id="navSuggestions" class="nav-suggestions"></div>
  `;
  document.getElementById('mapCardContent').prepend(wrap);

  const input = document.getElementById('navSearchInput');
  const goBtn = document.getElementById('navGoBtn');

  input.addEventListener('input', onType);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') irADestino(); });
  goBtn.onclick = irADestino;

  document.addEventListener('click', e => { if(!wrap.contains(e.target)) hideSuggestions(); });
}

/* ================= AUTOCOMPLETE ================= */
function onType(e){
  const q = e.target.value.trim();
  if (q.length < 3){ hideSuggestions(); return; }
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(()=>buscarSugerencias(q), 350);
}

function buscarSugerencias(query){
  fetch(
    `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`,
    { headers:{ 'User-Agent':'PanelLogistico/1.0' } }
  )
  .then(r=>r.json())
  .then(mostrarSugerencias)
  .catch(hideSuggestions);
}

function mostrarSugerencias(items){
  const box = document.getElementById('navSuggestions');
  box.innerHTML = '';
  if (!items || !items.length){ hideSuggestions(); return; }
  items.forEach(item=>{
    const div = document.createElement('div');
    div.className = 'nav-suggestion';
    div.textContent = item.display_name;
    div.onclick = ()=>{
      hideSuggestions();
      document.getElementById('navSearchInput').value = item.display_name;
      setPendingAndStart(L.latLng(item.lat, item.lon));
    };
    box.appendChild(div);
  });
  box.style.display = 'block';
}

function hideSuggestions(){
  const box = document.getElementById('navSuggestions');
  if (box) box.style.display = 'none';
}

/* ================= ESTADO VISIBLE ================= */
function injectStatusBar(){
  if (document.getElementById('navStatus')) return;
  const bar = document.createElement('div');
  bar.id = 'navStatus';
  bar.style.cssText = `
    margin:6px 0 10px;padding:6px 8px;border-radius:8px;
    background:#eef2ff;color:#1e3a8a;font-size:12px;display:none
  `;
  document.getElementById('mapCardContent').prepend(bar);
}
function setStatus(msg){
  const bar = document.getElementById('navStatus');
  if (!bar) return;
  bar.textContent = msg;
  bar.style.display = 'block';
}
function clearStatus(){
  const bar = document.getElementById('navStatus');
  if (bar) bar.style.display = 'none';
}

/* ================= BOTÓN IR (NUNCA MUERTO) ================= */
function irADestino(){
  const input = document.getElementById('navSearchInput');
  if (!input || !input.value.trim()){
    setStatus('Ingresa un destino');
    return;
  }

  // 1) Si hay sugerencia visible, úsala
  const first = document.querySelector('.nav-suggestion');
  if (first){ first.click(); return; }

  // 2) Resolver texto a coords y guardar como pendiente
  setStatus('Buscando destino…');
  fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(input.value.trim())}`,
    { headers:{ 'User-Agent':'PanelLogistico/1.0' } }
  )
  .then(r=>r.json())
  .then(data=>{
    if (!data || !data.length){
      setStatus('Destino no encontrado');
      return;
    }
    setPendingAndStart(L.latLng(data[0].lat, data[0].lon));
  })
  .catch(()=> setStatus('Error al buscar destino'));
}

/* ================= PENDIENTE → ARRANQUE AUTOMÁTICO ================= */
function setPendingAndStart(destino){
  pendingDestination = destino;
  drivingMode = true;
  setStatus('Preparando navegación…');
  tryStartNavigation();
}

function tryStartNavigation(){
  // Espera GPS
  if (!currentPos){
    setStatus('Esperando GPS… activa ubicación');
    return;
  }
  // Espera Routing
  if (!routingReady){
    setStatus('Cargando navegación…');
    return;
  }
  // Arranca
  clearStatus();
  crearRuta(pendingDestination);
  pendingDestination = null;
}

/* ================= GPS + CONDUCCIÓN ================= */
function initGPS(){
  if (!navigator.geolocation) return;

  navigator.geolocation.watchPosition(pos=>{
    const { latitude, longitude, speed, heading } = pos.coords;
    currentPos = L.latLng(latitude, longitude);

    if (!vehicleMarker){
      vehicleMarker = L.marker(currentPos).addTo(mapa);
    } else {
      vehicleMarker.setLatLng(currentPos);
    }

    if (drivingMode){
      mapa.setZoom(DRIVE_ZOOM, { animate:true });
      const dir = (heading !== null) ? heading : lastHeading;
      if (dir !== null){
        lastHeading = dir;
        const rad = dir * Math.PI / 180;
        mapa.panTo(
          [ latitude + OFFSET_DISTANCE * Math.cos(rad),
            longitude + OFFSET_DISTANCE * Math.sin(rad) ],
          { animate:true, duration:0.6 }
        );
      } else {
        mapa.panTo(currentPos, { animate:true });
      }
    }

    if (routingControl){
      routingControl.spliceWaypoints(0,1,currentPos);
    }

    if (speed && speed > SPEED_THRESHOLD){
      drivingMode = true;
    }

    // Si hay destino pendiente, intenta arrancar
    if (pendingDestination) tryStartNavigation();

  },{
    enableHighAccuracy:true,
    maximumAge:1000,
    timeout:10000
  });
}

/* ================= ETA UI ================= */
function injectETABox(){
  if (document.getElementById('etaBox')) return;
  const box = document.createElement('div');
  box.id = 'etaBox';
  box.style.cssText = `
    margin:8px 0 12px;padding:8px 10px;border-radius:10px;
    background:#f8fafc;font-size:12px;color:#0f172a;display:none
  `;
  box.innerHTML = `
    <div id="etaTime">🕒 Calculando ruta…</div>
    <div id="etaDistance"></div>
  `;
  document.getElementById('mapCardContent').prepend(box);
}

/* ================= RUTA + ETA ================= */
function crearRuta(destino){
  if (!currentPos || !routingReady) return;

  if (routingControl){ mapa.removeControl(routingControl); }

  routingControl = L.Routing.control({
    waypoints:[currentPos, destino],
    addWaypoints:false,
    draggableWaypoints:false,
    routeWhileDragging:false,
    show:false,
    lineOptions:{ styles:[
      { color:'#2563eb', weight:6 },
      { color:'#60a5fa', weight:4 }
    ]},
    router: L.Routing.osrmv1({ serviceUrl:'https://router.project-osrm.org/route/v1' })
  })
  .on('routesfound', e=>{
    const r = e.routes[0];
    const mins = Math.max(1, Math.round(r.summary.totalTime / 60));
    const km   = (r.summary.totalDistance / 1000).toFixed(1);
    const etaBox = document.getElementById('etaBox');
    if (etaBox){
      etaBox.style.display = 'block';
      document.getElementById('etaTime').textContent = `🕒 Llegada estimada: ${mins} min`;
      document.getElementById('etaDistance').textContent = `📏 Distancia: ${km} km`;
    }
  })
  .addTo(mapa);
}

/* ================= ROUTING LIB ================= */
function loadRouting(){
  loadCSS('https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.css');
  loadJS('https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.js',
    ()=>{ routingReady = true; if (pendingDestination) tryStartNavigation(); }
  );
}
function loadJS(src, cb){
  const s = document.createElement('script'); s.src = src; s.onload = cb; document.head.appendChild(s);
}
function loadCSS(href){
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l);
}

})();