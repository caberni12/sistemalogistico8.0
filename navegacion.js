/* =====================================================
   BUSCADOR + RUTA DENTRO DE dashboardMapa
   SIN MODIFICAR HTML
===================================================== */

(function(){

let routingControl = null;
let currentPos = null;

/* ===============================
   ESPERAR ELEMENTOS
=============================== */
function waitForCard(){
  const card = document.getElementById('mapCardContent');
  if(card && window.L && window.mapa){
    injectSearch(card);
    initGPS();
    loadRouting();
  }else{
    setTimeout(waitForCard, 200);
  }
}
waitForCard();

/* ===============================
   INYECTAR BUSCADOR
=============================== */
function injectSearch(container){

  /* Evitar duplicado */
  if(document.getElementById('navInput')) return;

  /* CSS mínimo (inline) */
  const style = document.createElement('style');
  style.textContent = `
    .nav-search-card{
      display:flex;
      gap:8px;
      margin-bottom:12px;
    }
    .nav-search-card input{
      flex:1;
      border:1px solid #e2e8f0;
      border-radius:10px;
      padding:10px 12px;
      font-size:13px;
      outline:none;
    }
    .nav-search-card button{
      border:none;
      background:linear-gradient(135deg,#60a5fa,#2563eb);
      color:#fff;
      border-radius:10px;
      padding:10px 14px;
      font-weight:700;
      cursor:pointer;
    }
  `;
  document.head.appendChild(style);

  /* HTML */
  const box = document.createElement('div');
  box.className = 'nav-search-card';
  box.innerHTML = `
    <input id="navInput" type="text" placeholder="Buscar destino…" />
    <button id="navBuscar">Ir</button>
  `;

  /* Insertar ARRIBA del contenido */
  container.prepend(box);

  /* Eventos */
  box.querySelector('#navBuscar').onclick = buscarDestino;
  box.querySelector('#navInput').addEventListener('keydown',e=>{
    if(e.key === 'Enter') buscarDestino();
  });
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

    /* Recalcular ruta */
    if(routingControl){
      routingControl.spliceWaypoints(0,1,currentPos);
    }

  },{
    enableHighAccuracy:true,
    maximumAge:1000
  });
}

/* ===============================
   BUSCAR DESTINO
=============================== */
function buscarDestino(){
  const input = document.getElementById('navInput');
  if(!input || !input.value || !currentPos) return;

  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input.value)}`)
    .then(r=>r.json())
    .then(data=>{
      if(!data[0]) return alert('Destino no encontrado');
      crearRuta(L.latLng(data[0].lat, data[0].lon));
    });
}

/* ===============================
   CREAR RUTA
=============================== */
function crearRuta(destino){

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
    }
  }).addTo(mapa);
}

/* ===============================
   DEPENDENCIA ROUTING
=============================== */
function loadRouting(){
  loadCSS('https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.css');
  loadJS('https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.js');
}

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