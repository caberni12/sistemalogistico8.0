/* =====================================================
   NAVEGACIÓN + BUSCADOR + RUTA + ETA
   COMPATIBLE CON TU main.js Y TU HTML
===================================================== */
(function(){

/* =========================
   ESTADO GLOBAL
========================= */
let posicionActual = null;
let routingControl = null;
let debounceTimer = null;

/* =========================
   ESPERAR MAPA + LIBRERÍAS
========================= */
(function esperarSistema(){
  if (
    typeof MAPA !== "undefined" &&
    MAPA &&
    window.L &&
    L.Routing &&
    document.getElementById("mapCardContent")
  ){
    inyectarUI();
    engancharGPS();
  } else {
    setTimeout(esperarSistema, 300);
  }
})();

/* =========================
   UI BUSCADOR
========================= */
function inyectarUI(){
  if (document.getElementById("navInput")) return;

  const style = document.createElement("style");
  style.textContent = `
    .nav-box{margin-bottom:10px;position:relative}
    .nav-row{display:flex;gap:6px}
    .nav-row input{
      flex:1;padding:10px;border-radius:10px;
      border:1px solid #e2e8f0;font-size:13px
    }
    .nav-row button{
      padding:10px 14px;border:none;border-radius:10px;
      background:linear-gradient(135deg,#60a5fa,#2563eb);
      color:#fff;font-weight:700;cursor:pointer
    }
    .nav-suggest{
      position:absolute;top:46px;left:0;right:0;
      background:#fff;border-radius:10px;
      box-shadow:0 12px 28px rgba(0,0,0,.18);
      z-index:9999;overflow:hidden;display:none
    }
    .nav-suggest div{
      padding:10px;font-size:13px;cursor:pointer;
      border-bottom:1px solid #eee
    }
    .nav-suggest div:hover{background:#f1f5f9}
  `;
  document.head.appendChild(style);

  const box = document.createElement("div");
  box.className = "nav-box";
  box.innerHTML = `
    <div class="nav-row">
      <input id="navInput" placeholder="Buscar destino…">
      <button id="navGo">Ir</button>
    </div>
    <div id="navSuggest" class="nav-suggest"></div>
  `;

  document.getElementById("mapCardContent").prepend(box);

  document.getElementById("navInput").addEventListener("input", onType);
  document.getElementById("navGo").onclick = iniciarRuta;
}

/* =========================
   GPS (USA EL TUYO)
========================= */
function engancharGPS(){
  const original = navigator.geolocation.watchPosition;
  navigator.geolocation.watchPosition = function(cb, err, opt){
    return original.call(navigator.geolocation, pos=>{
      posicionActual = L.latLng(
        pos.coords.latitude,
        pos.coords.longitude
      );
      cb(pos);
    }, err, opt);
  };
}

/* =========================
   AUTOCOMPLETE
========================= */
function onType(e){
  const q = e.target.value.trim();
  if (q.length < 3){
    ocultarSugerencias();
    return;
  }
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(()=>buscarSugerencias(q), 350);
}

function buscarSugerencias(q){
  fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`,
    { headers:{ "User-Agent":"PanelLogistico/1.0" } }
  )
  .then(r=>r.json())
  .then(mostrarSugerencias);
}

function mostrarSugerencias(lista){
  const box = document.getElementById("navSuggest");
  box.innerHTML = "";
  if (!lista.length){
    ocultarSugerencias();
    return;
  }

  lista.forEach(item=>{
    const d = document.createElement("div");
    d.textContent = item.display_name;
    d.onclick = ()=>{
      document.getElementById("navInput").value = item.display_name;
      ocultarSugerencias();
      crearRuta(L.latLng(item.lat, item.lon));
    };
    box.appendChild(d);
  });

  box.style.display = "block";
}

function ocultarSugerencias(){
  const box = document.getElementById("navSuggest");
  if (box) box.style.display = "none";
}

/* =========================
   BOTÓN IR
========================= */
function iniciarRuta(){
  const q = document.getElementById("navInput").value.trim();
  if (!q) return alert("Ingresa un destino");
  if (!posicionActual) return alert("Esperando GPS…");

  fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
    { headers:{ "User-Agent":"PanelLogistico/1.0" } }
  )
  .then(r=>r.json())
  .then(d=>{
    if (!d.length) return alert("Destino no encontrado");
    crearRuta(L.latLng(d[0].lat, d[0].lon));
  });
}

/* =========================
   RUTA + ETA
========================= */
function crearRuta(destino){

  if (!MAPA || !posicionActual) return;

  if (routingControl){
    MAPA.removeControl(routingControl);
  }

  routingControl = L.Routing.control({
    waypoints:[posicionActual, destino],
    addWaypoints:false,
    draggableWaypoints:false,
    show:false,
    lineOptions:{
      styles:[
        {color:"#2563eb", weight:6},
        {color:"#60a5fa", weight:4}
      ]
    }
  })
  .on("routesfound", e=>{
    const r = e.routes[0];
    mostrarETA(r.summary.totalTime, r.summary.totalDistance);
  })
  .addTo(MAPA);

  MAPA.setZoom(17);
}

/* =========================
   ETA UI
========================= */
function mostrarETA(seg, dist){
  let box = document.getElementById("etaBox");
  if (!box){
    box = document.createElement("div");
    box.id = "etaBox";
    box.style.cssText =
      "margin:8px 0;padding:8px;border-radius:10px;" +
      "background:#f8fafc;font-size:12px";
    document.getElementById("mapCardContent").prepend(box);
  }

  box.innerHTML =
    `🕒 ${Math.round(seg/60)} min<br>` +
    `📏 ${(dist/1000).toFixed(1)} km`;
}

})();