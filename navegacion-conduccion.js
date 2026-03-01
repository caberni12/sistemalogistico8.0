/* =====================================================
   NAVEGACIÓN COMPLETA TIPO MAPAS
   - Autocompletado
   - Ruta
   - ETA
   - Recalculo automático
   NO MODIFICA HTML BASE
===================================================== */

(function(){

/* ===============================
   STATE
=============================== */
let routingControl = null;
let currentPos = null;
let debounceTimer = null;
let routingReady = false;

/* ===============================
   ESPERAR MAPA + TARJETA
=============================== */
function waitReady(){
  if(
    window.mapa &&
    window.L &&
    document.getElementById('mapCardContent')
  ){
    injectSearchUI();
    injectETABox();
    initGPS();
    loadRouting();
  }else{
    setTimeout(waitReady, 200);
  }
}
waitReady();

/* ===============================
   INYECTAR BUSCADOR
=============================== */
function injectSearchUI(){

  if(document.getElementById('navSearchInput')) return;

  /* CSS */
  const style = document.createElement('style');
  style.textContent = `
    .nav-search-wrap{
      position:relative;
      margin-bottom:10px;
    }
    .nav-search-wrap input{
      width:100%;
      border:1px solid #e2e8f0;
      border-radius:10px;
      padding:10px 12px;
      font-size:13px;
      outline:none;
    }
    .nav-suggestions{
      position:absolute;
      top:42px;
      left:0;
      right:0;
      background:#fff;
      border-radius:10px;
      box-shadow:0 12px 28px rgba(0,0,0,.18);
      z-index:9999;
      overflow:hidden;
      display:none;
    }
    .nav-suggestion{
      padding:10px 12px;
      font-size:13px;
      cursor:pointer;
      border-bottom:1px solid #e5e7eb;
    }
    .nav-suggestion:last-child{
      border-bottom:none;
    }
    .nav-suggestion:hover{
      background:#f1f5f9;
    }
  `;
  document.head.appendChild(style);

  /* HTML */
  const wrap = document.createElement('div');
  wrap.className = 'nav-search-wrap';
  wrap.innerHTML = `
    <input id="navSearchInput" type="text"
           placeholder="Buscar destino…" autocomplete="off">
    <div id="navSuggestions" class="nav-suggestions"></div>
  `;

  document.getElementById('mapCardContent').prepend(wrap);

  /* Eventos */
  const input = document.getElementById('navSearchInput');
  input.addEventListener('input', onType);
  input.addEventListener('keydown', e=>{
    if(e.key === 'Enter'){
      const first = document.querySelector('.nav-suggestion');
      if(first) first.click();
    }
  });

  document.addEventListener('click', e=>{
    if(!wrap.contains(e.target)) hideSuggestions();
  });
}

/* ===============================
   AUTOCOMPLETE
=============================== */
function onType(e){
  const q = e.target.value.trim();
  if(q.length < 3){
    hideSuggestions();
    return;
  }

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(()=>{
    buscarSugerencias(q);
  }, 350);
}

function buscarSugerencias(query){

  fetch(
    `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`,
    {
      headers:{
        'User-Agent':'PanelLogistico/1.0'
      }
    }
  )
  .then(r=>r.json())
  .then(data=>{
    mostrarSugerencias(data);
  })
  .catch(()=> hideSuggestions());
}

function mostrarSugerencias(items){

  const box = document.getElementById('navSuggestions');
  box.innerHTML = '';

  if(!items || !items.length){
    hideSuggestions();
    return;
  }

  items.forEach(item=>{
    const div = document.createElement('div');
    div.className = 'nav-suggestion';
    div.textContent = item.display_name;
    div.onclick = ()=>{
      hideSuggestions();
      document.getElementById('navSearchInput').value = item.display_name;
      crearRuta(L.latLng(item.lat, item.lon));
    };
    box.appendChild(div);
  });

  box.style.display = 'block';
}

function hideSuggestions(){
  const box = document.getElementById('navSuggestions');
  if(box) box.style.display = 'none';
}

/* ===============================
   GPS ACTUAL
=============================== */
function initGPS(){

  if(!navigator.geolocation) return;

  navigator.geolocation.watchPosition(pos=>{
    currentPos = L.latLng(
      pos.coords.latitude,
      pos.coords.longitude
    );

    if(routingControl){
      routingControl.spliceWaypoints(0,1,currentPos);
    }
  },{
    enableHighAccuracy:true,
    maximumAge:1000
  });
}

/* ===============================
   UI ETA
=============================== */
function injectETABox(){

  if(document.getElementById('etaBox')) return;

  const box = document.createElement('div');
  box.id = 'etaBox';
  box.style.cssText = `
    margin:8px 0 12px;
    padding:8px 10px;
    border-radius:10px;
    background:#f8fafc;
    font-size:12px;
    color:#0f172a;
    display:none;
  `;
  box.innerHTML = `
    <div id="etaTime">🕒 Calculando ruta…</div>
    <div id="etaDistance"></div>
  `;

  document.getElementById('mapCardContent').prepend(box);
}

/* ===============================
   CREAR RUTA + ETA
=============================== */
function crearRuta(destino){

  if(!currentPos || !routingReady) return;

  if(routingControl){
    mapa.removeControl(routingControl);
  }

  routingControl = L.Routing.control({
    waypoints:[currentPos, destino],
    addWaypoints:false,
    draggableWaypoints:false,
    routeWhileDragging:false,
    show:false,
    lineOptions:{
      styles:[
        { color:'#2563eb', weight:6 },
        { color:'#60a5fa', weight:4 }
      ]
    },
    router: L.Routing.osrmv1({
      serviceUrl:'https://router.project-osrm.org/route/v1'
    })
  })
  .on('routesfound', e=>{
    const route = e.routes[0];
    const seconds = route.summary.totalTime;
    const meters  = route.summary.totalDistance;

    const mins = Math.max(1, Math.round(seconds / 60));
    const km   = (meters / 1000).toFixed(1);

    document.getElementById('etaBox').style.display = 'block';
    document.getElementById('etaTime').textContent =
      `🕒 Llegada estimada: ${mins} min`;
    document.getElementById('etaDistance').textContent =
      `📏 Distancia: ${km} km`;
  })
  .addTo(mapa);
}

/* ===============================
   ROUTING LIB
=============================== */
function loadRouting(){
  loadCSS(
    'https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.css'
  );
  loadJS(
    'https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.js',
    ()=> routingReady = true
  );
}

function loadJS(src,cb){
  const s = document.createElement('script');
  s.src = src;
  s.onload = cb;
  document.head.appendChild(s);
}
function loadCSS(href){
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = href;
  document.head.appendChild(l);
}

})();
