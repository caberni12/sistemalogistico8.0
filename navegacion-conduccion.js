/* =====================================================
   NAVEGACIÓN WAZE-LIKE COMPLETA
   Ruta + ETA + Español + Conducción + Waze App
===================================================== */
(function(){

/* ================= CONFIG ================= */
const DRIVE_ZOOM = 17;
const SPEED_THRESHOLD = 2;        // m/s
const PAN_OFFSET = 0.0016;
const REROUTE_DISTANCE = 60;      // metros

/* ================= ESTADO ================= */
let posicionActual = null;
let destinoActual = null;
let routingControl = null;
let vehiculo = null;
let drivingMode = false;
let lastHeading = 0;
let gpsActivo = false;
let debounceTimer = null;

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

/* ================= MAPA WAZE ================= */
function aplicarEstiloWaze(){
  MAPA.eachLayer(l=>{
    if (l instanceof L.TileLayer) MAPA.removeLayer(l);
  });

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
    .nav-suggest{position:absolute;top:46px;left:0;right:0;background:#fff;border-radius:10px;box-shadow:0 12px 28px rgba(0,0,0,.2);display:none;z-index:9999}
    .nav-suggest div{padding:10px;border-bottom:1px solid #eee;cursor:pointer}
    .nav-suggest div:hover{background:#f1f5f9}
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
    <button id="btnStop" class="btn-stop" style="display:none">⛔ Detener navegación</button>
    <button id="btnWaze" class="btn-waze" style="display:none">🚗 Abrir en Waze</button>
  `;
  document.getElementById("mapCardContent").prepend(box);

  navInput.oninput = onType;
  navGo.onclick = iniciarRuta;
  btnStop.onclick = detenerNavegacion;
  btnWaze.onclick = abrirEnWaze;
}

/* ================= GPS + CONDUCCIÓN ================= */
function iniciarGPS(){
  navigator.geolocation.watchPosition(
    pos=>{
      const { latitude, longitude, speed=0, heading=null } = pos.coords;

      posicionActual = L.latLng(latitude, longitude);
      gpsActivo = true;

      if (speed > SPEED_THRESHOLD) drivingMode = true;

      if (drivingMode && MAPA){
        MAPA.setZoom(DRIVE_ZOOM, { animate:true });

        if (heading !== null && !isNaN(heading)) lastHeading = heading;

        const rad = lastHeading * Math.PI / 180;
        const aheadLat = latitude + PAN_OFFSET * Math.cos(rad);
        const aheadLng = longitude + PAN_OFFSET * Math.sin(rad);

        MAPA.panTo([aheadLat, aheadLng], { animate:true, duration:0.45 });

        actualizarVehiculo(posicionActual, lastHeading);
        verificarDesvio();
      }
    },
    ()=>{},
    { enableHighAccuracy:true, maximumAge:1000, timeout:15000 }
  );
}

/* ================= VEHÍCULO ================= */
function iconoFlecha(heading){
  return L.divIcon({
    iconSize:[44,44],
    iconAnchor:[22,22],
    html:`<svg viewBox="0 0 100 100" style="transform:rotate(${heading}deg)">
            <polygon points="50,5 90,90 50,70 10,90" fill="#1e90ff"/>
          </svg>`
  });
}

function actualizarVehiculo(pos, heading){
  if (!vehiculo){
    vehiculo = L.marker(pos,{ icon:iconoFlecha(heading) }).addTo(MAPA);
  } else {
    vehiculo.setLatLng(pos);
    vehiculo.setIcon(iconoFlecha(heading));
  }
}

/* ================= AUTOCOMPLETE ================= */
function onType(e){
  const q = e.target.value.trim();
  if (q.length < 3) return ocultar();
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(()=>buscar(q),350);
}

function buscar(q){
  fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`)
    .then(r=>r.json()).then(mostrar);
}

function mostrar(list){
  navSuggest.innerHTML="";
  if (!list.length) return ocultar();
  list.forEach(l=>{
    const d=document.createElement("div");
    d.textContent=l.display_name;
    d.onclick=()=>{ navInput.value=l.display_name; ocultar(); crearRuta(L.latLng(l.lat,l.lon)); };
    navSuggest.appendChild(d);
  });
  navSuggest.style.display="block";
}

function ocultar(){ navSuggest.style.display="none"; }

/* ================= RUTA + ETA ================= */
function iniciarRuta(){
  if (!gpsActivo) return;
  fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(navInput.value)}`)
    .then(r=>r.json()).then(d=>{ if(d.length) crearRuta(L.latLng(d[0].lat,d[0].lon)); });
}

function crearRuta(dest){
  destinoActual = dest;
  if (routingControl) MAPA.removeControl(routingControl);

  routingControl = L.Routing.control({
    waypoints:[posicionActual,dest],
    addWaypoints:false,
    draggableWaypoints:false,
    show:false,
    router:L.Routing.osrmv1({ serviceUrl:"https://router.project-osrm.org/route/v1", language:"es" }),
    formatter:new L.Routing.Formatter({ language:"es", units:"metric" }),
    lineOptions:{ styles:[
      { color:"#1e90ff", weight:10, opacity:.35 },
      { color:"#1e90ff", weight:6 }
    ]}
  }).addTo(MAPA);

  btnStop.style.display="block";
  btnWaze.style.display="block";
}

/* ================= RE-RUTEO ================= */
function verificarDesvio(){
  if (!routingControl || !posicionActual) return;
  const wp = routingControl.getWaypoints()[1];
  if (!wp) return;

  const d = MAPA.distance(posicionActual, wp.latLng);
  if (d > REROUTE_DISTANCE){
    crearRuta(wp.latLng);
  }
}

/* ================= BOTONES ================= */
function detenerNavegacion(){
  if (routingControl) MAPA.removeControl(routingControl);
  routingControl=null;
  destinoActual=null;
  drivingMode=false;
  btnStop.style.display="none";
  btnWaze.style.display="none";
}

function abrirEnWaze(){
  if (!destinoActual) return;
  const { lat, lng } = destinoActual;
  window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,"_blank");
}

})();