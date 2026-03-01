/* =====================================================
   NAVEGACIÓN MÓVIL FINAL (ESTABLE)
   - Botón IR funciona
   - Ruta + ETA
   - Modo conducción
   - Sin cargas dinámicas
===================================================== */
(function(){

/* ================= STATE ================= */
let currentPos = null;
let routingControl = null;
let drivingMode = false;
let vehicleMarker = null;

/* ================= INIT ================= */
waitReady();

function waitReady(){
  if(window.mapa && window.L && window.L.Routing && document.getElementById('mapCardContent')){
    injectUI();
    injectETA();
    initGPS();
  }else{
    setTimeout(waitReady,200);
  }
}

/* ================= UI ================= */
function injectUI(){
  if(document.getElementById('navInput')) return;

  const style = document.createElement('style');
  style.textContent = `
    .nav-box{margin-bottom:10px}
    .nav-row{display:flex;gap:6px}
    .nav-row input{flex:1;padding:10px;border-radius:10px;border:1px solid #e2e8f0}
    .nav-row button{padding:10px 14px;border:none;border-radius:10px;
      background:linear-gradient(135deg,#60a5fa,#2563eb);color:#fff;font-weight:700}
  `;
  document.head.appendChild(style);

  const box = document.createElement('div');
  box.className = 'nav-box';
  box.innerHTML = `
    <div class="nav-row">
      <input id="navInput" placeholder="Buscar destino…">
      <button id="navGo">Ir</button>
    </div>
  `;
  document.getElementById('mapCardContent').prepend(box);

  document.getElementById('navGo').onclick = iniciarNavegacion;
}

/* ================= GPS ================= */
function initGPS(){
  navigator.geolocation.watchPosition(p=>{
    currentPos = L.latLng(p.coords.latitude, p.coords.longitude);

    if(!vehicleMarker){
      vehicleMarker = L.marker(currentPos).addTo(mapa);
    }else{
      vehicleMarker.setLatLng(currentPos);
    }

    if(drivingMode){
      mapa.setView(currentPos, 17, {animate:true});
    }

    if(routingControl){
      routingControl.spliceWaypoints(0,1,currentPos);
    }
  },{
    enableHighAccuracy:true,
    maximumAge:1000,
    timeout:10000
  });
}

/* ================= ETA ================= */
function injectETA(){
  if(document.getElementById('etaBox')) return;

  const box = document.createElement('div');
  box.id = 'etaBox';
  box.style.cssText = `
    display:none;margin:8px 0;padding:8px;border-radius:10px;
    background:#f8fafc;font-size:12px
  `;
  box.innerHTML = `
    <div id="etaTime"></div>
    <div id="etaDist"></div>
  `;
  document.getElementById('mapCardContent').prepend(box);
}

/* ================= IR ================= */
function iniciarNavegacion(){

  const q = document.getElementById('navInput').value.trim();
  if(!q){
    alert('Ingresa un destino');
    return;
  }
  if(!currentPos){
    alert('Esperando GPS…');
    return;
  }

  fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
    { headers:{'User-Agent':'PanelLogistico/1.0'} }
  )
  .then(r=>r.json())
  .then(data=>{
    if(!data.length){
      alert('Destino no encontrado');
      return;
    }
    crearRuta(L.latLng(data[0].lat, data[0].lon));
  });
}

/* ================= RUTA ================= */
function crearRuta(destino){

  drivingMode = true;

  if(routingControl){
    mapa.removeControl(routingControl);
  }

  routingControl = L.Routing.control({
    waypoints:[currentPos, destino],
    addWaypoints:false,
    draggableWaypoints:false,
    show:false,
    lineOptions:{
      styles:[
        {color:'#2563eb',weight:6},
        {color:'#60a5fa',weight:4}
      ]
    }
  })
  .on('routesfound',e=>{
    const r = e.routes[0];
    document.getElementById('etaBox').style.display = 'block';
    document.getElementById('etaTime').textContent =
      `🕒 ${Math.round(r.summary.totalTime/60)} min`;
    document.getElementById('etaDist').textContent =
      `📏 ${(r.summary.totalDistance/1000).toFixed(1)} km`;
  })
  .addTo(mapa);
}

})();