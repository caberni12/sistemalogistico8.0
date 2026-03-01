/* =====================================================
   NAVEGACIÓN WAZE-LIKE + RUTAS DE DESPACHO
   Basado EXACTAMENTE en tu código
===================================================== */
(function(){

/* ================= CONFIG ================= */
const DRIVE_ZOOM = 17;
const SPEED_THRESHOLD = 2;
const PAN_OFFSET = 0.0016;
const REROUTE_DISTANCE = 60;
const RADIO_LLEGADA = 40;

/* ================= ESTADO ================= */
let posicionActual = null;
let destinoActual = null;
let routingControl = null;
let vehiculo = null;
let drivingMode = false;
let lastHeading = 0;
let gpsActivo = false;
let debounceTimer = null;

/* ===== DESPACHOS ===== */
let despachos = [];
let despachoActual = null;

/* ================= ESPERAR SISTEMA ================= */
(function esperar(){
  if (
    typeof MAPA !== "undefined" &&
    MAPA &&
    window.L &&
    L.Routing &&
    document.getElementById("mapCardContent")
  ){
    aplicarEstiloWaze();
    inyectarUI();
    iniciarGPS();
  } else {
    setTimeout(esperar, 300);
  }
})();

/* ================= MAPA ================= */
function aplicarEstiloWaze(){
  MAPA.eachLayer(l=>{ if(l instanceof L.TileLayer) MAPA.removeLayer(l); });
  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    { subdomains:"abcd", maxZoom:20 }
  ).addTo(MAPA);
}

/* ================= UI ================= */
function inyectarUI(){
  if (document.getElementById("navInput")) return;

  const style = document.createElement("style");
  style.textContent = `
    .nav-box{margin-bottom:10px;position:relative}
    .nav-row{display:flex;gap:6px}
    .nav-row input{flex:1;padding:10px;border-radius:10px;border:1px solid #e2e8f0}
    .nav-row button{padding:10px 14px;border-radius:10px;border:none;font-weight:700;color:#fff;cursor:pointer}
    .btn-go{background:#2563eb}
    .btn-stop{background:#dc2626;margin-top:6px;width:100%}
    .btn-waze{background:#33cc66;margin-top:6px;width:100%}
    .btn-ok{background:#22c55e;margin-top:6px;width:100%}
    .nav-suggest{position:absolute;top:46px;left:0;right:0;background:#fff;border-radius:10px;box-shadow:0 12px 28px rgba(0,0,0,.2);display:none;z-index:9999}
    .nav-suggest div{padding:10px;border-bottom:1px solid #eee;cursor:pointer}
    .nav-suggest div:hover{background:#f1f5f9}
    .lista-despachos{margin-top:10px;font-size:12px}
    .lista-despachos div{margin-bottom:4px}
  `;
  document.head.appendChild(style);

  const box = document.createElement("div");
  box.className = "nav-box";
  box.innerHTML = `
    <div class="nav-row">
      <input id="navInput" placeholder="Buscar destino…">
      <button class="btn-go" id="navGo">Ir</button>
    </div>
    <div id="navSuggest" class="nav-suggest"></div>

    <button id="btnConfirmar" class="btn-ok" style="display:none">📦 Confirmar llegada</button>
    <button id="btnStop" class="btn-stop" style="display:none">⛔ Detener navegación</button>
    <button id="btnWaze" class="btn-waze" style="display:none">🚗 Abrir en Waze</button>

    <div id="listaDespachos" class="lista-despachos"></div>
  `;
  document.getElementById("mapCardContent").prepend(box);

  navInput.oninput = onType;
  navGo.onclick = iniciarRutaManual;
  btnStop.onclick = detenerNavegacion;
  btnWaze.onclick = abrirEnWaze;
  btnConfirmar.onclick = confirmarLlegada;
}

/* ================= GPS ================= */
function iniciarGPS(){
  navigator.geolocation.watchPosition(pos=>{
    const { latitude, longitude, speed=0, heading=null } = pos.coords;
    posicionActual = L.latLng(latitude, longitude);
    gpsActivo = true;

    if (speed > SPEED_THRESHOLD) drivingMode = true;

    if (drivingMode && MAPA){
      MAPA.setZoom(DRIVE_ZOOM,{animate:true});
      if (heading !== null) lastHeading = heading;

      const rad = lastHeading * Math.PI / 180;
      const aheadLat = latitude + PAN_OFFSET * Math.cos(rad);
      const aheadLng = longitude + PAN_OFFSET * Math.sin(rad);

      MAPA.panTo([aheadLat,aheadLng],{animate:true,duration:0.45});
      actualizarVehiculo(posicionActual,lastHeading);
      verificarDesvio();
      verificarLlegadaAuto();
    }
  });
}

/* ================= VEHÍCULO ================= */
function iconoFlecha(h){
  return L.divIcon({
    iconSize:[44,44],
    iconAnchor:[22,22],
    html:`<svg viewBox="0 0 100 100" style="transform:rotate(${h}deg)">
      <polygon points="50,5 90,90 50,70 10,90" fill="#1e90ff"/></svg>`
  });
}
function actualizarVehiculo(pos,h){
  if(!vehiculo) vehiculo=L.marker(pos,{icon:iconoFlecha(h)}).addTo(MAPA);
  else{ vehiculo.setLatLng(pos); vehiculo.setIcon(iconoFlecha(h)); }
}

/* ================= AUTOCOMPLETE ================= */
function onType(e){
  const q=e.target.value.trim();
  if(q.length<3) return navSuggest.style.display="none";
  clearTimeout(debounceTimer);
  debounceTimer=setTimeout(()=>buscar(q),350);
}
function buscar(q){
  fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`)
    .then(r=>r.json()).then(list=>{
      navSuggest.innerHTML="";
      list.forEach(l=>{
        const d=document.createElement("div");
        d.textContent=l.display_name;
        d.onclick=()=>{ navInput.value=l.display_name; navSuggest.style.display="none"; crearRuta(L.latLng(l.lat,l.lon)); };
        navSuggest.appendChild(d);
      });
      navSuggest.style.display="block";
    });
}

/* ================= RUTA MANUAL ================= */
function iniciarRutaManual(){
  if(!gpsActivo) return;
  fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(navInput.value)}`)
    .then(r=>r.json()).then(d=>{ if(d.length) crearRuta(L.latLng(d[0].lat,d[0].lon)); });
}

/* ================= RUTEO ================= */
function crearRuta(dest){
  destinoActual = dest;
  if(routingControl) MAPA.removeControl(routingControl);

  routingControl=L.Routing.control({
    waypoints:[posicionActual,dest],
    addWaypoints:false,
    draggableWaypoints:false,
    show:false,
    router:L.Routing.osrmv1({serviceUrl:"https://router.project-osrm.org/route/v1",language:"es"}),
    formatter:new L.Routing.Formatter({language:"es",units:"metric"}),
    lineOptions:{styles:[
      {color:"#1e90ff",weight:10,opacity:.35},
      {color:"#1e90ff",weight:6}
    ]}
  }).addTo(MAPA);

  btnStop.style.display="block";
  btnWaze.style.display="block";
  btnConfirmar.style.display= despachoActual ? "block" : "none";
}

/* ================= DESVÍO ================= */
function verificarDesvio(){
  if(!routingControl||!destinoActual) return;
  const d=MAPA.distance(posicionActual,destinoActual);
  if(d>REROUTE_DISTANCE) crearRuta(destinoActual);
}

/* ================= DESPACHOS ================= */
window.cargarDespachos = function(lista){
  despachos = lista.map(d=>({...d,estado:"pendiente"}));
  ordenarDespachos();
  mostrarDespachos();
  irAlSiguienteDespacho();
};

function ordenarDespachos(){
  despachos.forEach(d=>{
    d.distancia=MAPA.distance(posicionActual,L.latLng(d.lat,d.lng));
  });
  despachos.sort((a,b)=>a.distancia-b.distancia);
}

function mostrarDespachos(){
  listaDespachos.innerHTML="<strong>📦 Ruta de despacho</strong><br>";
  despachos.forEach(d=>{
    listaDespachos.innerHTML+=`${d.estado==="ok"?"✅":"📍"} ${d.nombre}<br>`;
  });
}

function irAlSiguienteDespacho(){
  despachoActual=despachos.find(d=>d.estado==="pendiente");
  if(!despachoActual){ alert("✅ Ruta completada"); return; }
  crearRuta(L.latLng(despachoActual.lat,despachoActual.lng));
  btnConfirmar.style.display="block";
}

function confirmarLlegada(){
  if(!despachoActual) return;
  const d=MAPA.distance(posicionActual,L.latLng(despachoActual.lat,despachoActual.lng));
  if(d>RADIO_LLEGADA){ alert("Aún no estás en el punto"); return; }
  despachoActual.estado="ok";
  mostrarDespachos();
  irAlSiguienteDespacho();
}

function verificarLlegadaAuto(){
  if(!despachoActual) return;
  const d=MAPA.distance(posicionActual,L.latLng(despachoActual.lat,despachoActual.lng));
  if(d<=RADIO_LLEGADA) confirmarLlegada();
}

/* ================= BOTONES ================= */
function detenerNavegacion(){
  if(routingControl) MAPA.removeControl(routingControl);
  routingControl=null;
  destinoActual=null;
  despachoActual=null;
  btnStop.style.display="none";
  btnWaze.style.display="none";
  btnConfirmar.style.display="none";
}

function abrirEnWaze(){
  if(!destinoActual) return;
  window.open(`https://waze.com/ul?ll=${destinoActual.lat},${destinoActual.lng}&navigate=yes`,"_blank");
}

})();