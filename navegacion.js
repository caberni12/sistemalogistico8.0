/* =====================================================
   NAVEGACIÓN + MODO CONDUCCIÓN AUTOMÁTICO
   TODO EN UNO – PRODUCCIÓN
   NO MODIFICA HTML EXISTENTE
===================================================== */

(function(){

/* =====================================================
   CONFIG
===================================================== */
const SPEED_THRESHOLD = 2;      // m/s ≈ 7 km/h
const DRIVE_ZOOM = 17;
const OFFSET_DISTANCE = 0.0012;

/* =====================================================
   STATE
===================================================== */
let vehicleMarker = null;
let lastHeading = null;
let drivingActive = false;
let routingControl = null;
let currentPos = null;

/* =====================================================
   ESPERAR MAPA
===================================================== */
function waitForMap(){
  if(window.mapa && window.L){
    init();
  }else{
    setTimeout(waitForMap, 200);
  }
}
waitForMap();

/* =====================================================
   INIT
===================================================== */
function init(){
  initDriving();
  initSearchUI();
  loadRouting();
}

/* =====================================================
   MODO CONDUCCIÓN
===================================================== */
function initDriving(){

  if(!navigator.geolocation) return;

  navigator.geolocation.watchPosition(
    pos => handleMovement(pos),
    err => console.error('GPS:', err),
    {
      enableHighAccuracy:true,
      maximumAge:1000,
      timeout:10000
    }
  );
}

function handleMovement(position){

  const { latitude, longitude, speed, heading } = position.coords;
  currentPos = L.latLng(latitude, longitude);

  /* VEHÍCULO */
  if(!vehicleMarker){
    vehicleMarker = L.marker(currentPos).addTo(mapa);
  }else{
    vehicleMarker.setLatLng(currentPos);
  }

  /* VELOCIDAD UI */
  const kmh = speed ? Math.round(speed * 3.6) : 0;
  const speedEl = document.getElementById('speedTexto');
  if(speedEl) speedEl.textContent = kmh + ' km/h';

  const driving = speed && speed > SPEED_THRESHOLD;

  if(driving){

    drivingActive = true;
    mapa.setZoom(DRIVE_ZOOM, { animate:true });

    const dir = heading !== null ? heading : lastHeading;

    if(dir !== null){
      lastHeading = dir;
      const rad = dir * Math.PI / 180;

      const target = [
        latitude  + OFFSET_DISTANCE * Math.cos(rad),
        longitude + OFFSET_DISTANCE * Math.sin(rad)
      ];

      mapa.panTo(target, { animate:true, duration:0.6 });
    }else{
      mapa.panTo(currentPos, { animate:true });
    }

  }else if(drivingActive){
    mapa.panTo(currentPos, { animate:true });
    drivingActive = false;
  }

  /* ACTUALIZAR RUTA */
  if(routingControl){
    routingControl.spliceWaypoints(0,1,currentPos);
  }
}

/* =====================================================
   UI BUSCADOR (INYECTADO)
===================================================== */
function initSearchUI(){

  const style = document.createElement('style');
  style.innerHTML = `
  .nav-search{
    position:absolute;
    top:72px;
    left:50%;
    transform:translateX(-50%);
    width:calc(100% - 32px);
    max-width:420px;
    background:#fff;
    border-radius:14px;
    box-shadow:0 14px 30px rgba(0,0,0,.22);
    z-index:900;
    padding:8px;
    display:flex;
    gap:8px;
  }
  .nav-search input{
    flex:1;
    border:none;
    outline:none;
    font-size:14px;
    padding:10px 12px;
  }
  .nav-search button{
    border:none;
    background:#2563eb;
    color:#fff;
    border-radius:10px;
    padding:10px 14px;
    font-weight:700;
    cursor:pointer;
  }`;
  document.head.appendChild(style);

  const box = document.createElement('div');
  box.className = 'nav-search';
  box.innerHTML = `
    <input id="navInput" placeholder="Buscar destino…" />
    <button id="navClear">✕</button>
  `;
  document.getElementById('mapaBox').appendChild(box);

  box.querySelector('#navInput').addEventListener('keydown', e=>{
    if(e.key === 'Enter') buscarDestino(e.target.value);
  });

  box.querySelector('#navClear').onclick = limpiarRuta;
}

/* =====================================================
   ROUTING
===================================================== */
function loadRouting(){
  loadCSS('https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.css');
  loadJS('https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.js');
}

function buscarDestino(query){
  if(!query || !currentPos) return;

  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
    .then(r=>r.json())
    .then(data=>{
      if(!data[0]) return alert('Destino no encontrado');
      crearRuta(L.latLng(data[0].lat, data[0].lon));
    });
}

function crearRuta(dest){
  if(!currentPos) return;

  if(routingControl){
    mapa.removeControl(routingControl);
  }

  routingControl = L.Routing.control({
    waypoints:[currentPos, dest],
    addWaypoints:false,
    draggableWaypoints:false,
    routeWhileDragging:false,
    show:false,
    lineOptions:{
      styles:[
        { color:'#2563eb', weight:6 },
        { color:'#60a5fa', weight:4 }
      ]
    }
  }).addTo(mapa);
}

function limpiarRuta(){
  if(routingControl){
    mapa.removeControl(routingControl);
    routingControl = null;
  }
  const i = document.getElementById('navInput');
  if(i) i.value = '';
}

/* =====================================================
   HELPERS
===================================================== */
function loadJS(src){
  const s = document.createElement('script');
  s.src = src;
  document.head.appendChild(s);
}

function loadCSS(href){
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = href;
  document.head.appendChild(l);
}

})();