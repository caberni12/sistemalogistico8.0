/* =====================================================
   BUSCADOR + RUTA EN TARJETA (FIX DEFINITIVO)
   NO TOCA HTML
===================================================== */

(function(){

let routingControl = null;
let currentPos = null;
let routingReady = false;

/* ===============================
   ESPERAR DOM + MAPA
=============================== */
function waitReady(){
  if(
    document.getElementById('mapCardContent') &&
    window.mapa &&
    window.L
  ){
    injectSearch();
    initGPS();
    loadRouting();
  }else{
    setTimeout(waitReady,200);
  }
}
waitReady();

/* ===============================
   INYECTAR BUSCADOR
=============================== */
function injectSearch(){

  if(document.getElementById('navInput')) return;

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

  const box = document.createElement('div');
  box.className = 'nav-search-card';
  box.innerHTML = `
    <input id="navInput" placeholder="Buscar destino…" />
    <button id="navBuscar">Ir</button>
  `;

  document.getElementById('mapCardContent').prepend(box);

  document.getElementById('navBuscar').onclick = buscarDestino;
  document.getElementById('navInput').addEventListener('keydown',e=>{
    if(e.key === 'Enter') buscarDestino();
  });
}

/* ===============================
   GPS
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
   BUSCAR DESTINO
=============================== */
function buscarDestino(){

  if(!routingReady){
    alert('Cargando navegación… intenta nuevamente');
    return;
  }

  const q = document.getElementById('navInput').value.trim();
  if(!q || !currentPos) return;

  fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`,
    {
      headers:{
        'User-Agent':'PanelLogistico/1.0'
      }
    }
  )
  .then(r=>r.json())
  .then(data=>{
    if(!data.length){
      alert('Destino no encontrado');
      return;
    }
    crearRuta(L.latLng(data[0].lat, data[0].lon));
  })
  .catch(err=>{
    console.error(err);
    alert('Error al buscar destino');
  });
}

/* ===============================
   CREAR RUTA
=============================== */
function crearRuta(dest){

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

/* ===============================
   CARGA ROUTING
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
