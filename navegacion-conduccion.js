/* =====================================================
   NAVEGACIÓN COMPATIBLE CON TU main.js
   - Usa MAPA existente
   - Usa GPS activo
   - Botón IR funcional en móvil
   - Ruta + ETA
===================================================== */
(function(){

/* ===============================
   ESTADO
=============================== */
let routingControl = null;
let destinoPendiente = null;
let currentLatLng = null;

/* ===============================
   ESPERAR MAPA
=============================== */
(function esperarMapa(){
  if (typeof MAPA !== "undefined" && MAPA && document.getElementById("mapCardContent")) {
    inyectarUI();
    inyectarETA();
    engancharGPS();
  } else {
    setTimeout(esperarMapa, 300);
  }
})();

/* ===============================
   UI
=============================== */
function inyectarUI(){
  if (document.getElementById("navInput")) return;

  const style = document.createElement("style");
  style.textContent = `
    .nav-box{margin-bottom:10px}
    .nav-row{display:flex;gap:6px}
    .nav-row input{
      flex:1;padding:10px;border-radius:10px;
      border:1px solid #e2e8f0;font-size:13px
    }
    .nav-row button{
      padding:10px 14px;border:none;border-radius:10px;
      background:linear-gradient(135deg,#60a5fa,#2563eb);
      color:#fff;font-weight:700
    }
  `;
  document.head.appendChild(style);

  const box = document.createElement("div");
  box.className = "nav-box";
  box.innerHTML = `
    <div class="nav-row">
      <input id="navInput" placeholder="Buscar destino…">
      <button id="navGo">Ir</button>
    </div>
  `;

  document.getElementById("mapCardContent").prepend(box);
  document.getElementById("navGo").onclick = iniciarNavegacion;
}

/* ===============================
   GPS (ENGANCHA AL TUYO)
=============================== */
function engancharGPS(){
  const oldWatch = navigator.geolocation.watchPosition;
  navigator.geolocation.watchPosition = function(cb, err, opt){
    return oldWatch.call(navigator.geolocation, pos=>{
      currentLatLng = L.latLng(
        pos.coords.latitude,
        pos.coords.longitude
      );

      if (destinoPendiente) {
        crearRuta(destinoPendiente);
        destinoPendiente = null;
      }

      cb(pos);
    }, err, opt);
  };
}

/* ===============================
   ETA
=============================== */
function inyectarETA(){
  if (document.getElementById("etaBox")) return;

  const box = document.createElement("div");
  box.id = "etaBox";
  box.style.cssText = `
    display:none;margin:8px 0;padding:8px;
    border-radius:10px;background:#f8fafc;font-size:12px
  `;
  box.innerHTML = `
    <div id="etaTime"></div>
    <div id="etaDist"></div>
  `;

  document.getElementById("mapCardContent").prepend(box);
}

/* ===============================
   BOTÓN IR
=============================== */
function iniciarNavegacion(){
  const q = document.getElementById("navInput").value.trim();
  if (!q) {
    alert("Ingresa un destino");
    return;
  }
  if (!currentLatLng) {
    alert("Esperando GPS…");
    return;
  }

  fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
    { headers:{ "User-Agent":"PanelLogistico/1.0" } }
  )
  .then(r=>r.json())
  .then(d=>{
    if (!d.length) {
      alert("Destino no encontrado");
      return;
    }
    destinoPendiente = L.latLng(d[0].lat, d[0].lon);
    crearRuta(destinoPendiente);
  });
}

/* ===============================
   CREAR RUTA
=============================== */
function crearRuta(destino){

  if (!MAPA || !currentLatLng) return;

  if (routingControl) {
    MAPA.removeControl(routingControl);
  }

  routingControl = L.Routing.control({
    waypoints:[ currentLatLng, destino ],
    addWaypoints:false,
    draggableWaypoints:false,
    show:false,
    lineOptions:{
      styles:[
        { color:"#2563eb", weight:6 },
        { color:"#60a5fa", weight:4 }
      ]
    }
  })
  .on("routesfound", e=>{
    const r = e.routes[0];
    document.getElementById("etaBox").style.display = "block";
    document.getElementById("etaTime").textContent =
      `🕒 ${Math.round(r.summary.totalTime/60)} min`;
    document.getElementById("etaDist").textContent =
      `📏 ${(r.summary.totalDistance/1000).toFixed(1)} km`;
  })
  .addTo(MAPA);

  MAPA.setZoom(17);
}

/* ===============================
   FIN
=============================== */
})();