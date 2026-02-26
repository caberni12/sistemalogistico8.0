/* =====================================================
   CONFIG
===================================================== */
const API =
"https://script.google.com/macros/s/AKfycbxDUcEzMGw9LWnzn-YUV89So3AFCEnplOHQuGmzq-EV_hnIMhQvgQIPY1AxvlKJPZNx/exec";

let USER_IP = "cargando...";
let MODULO_ACTIVO = null;

/* ===== MAPA / TRACKING ===== */
let MAPA = null;
let MARCADOR = null;
let WATCH_ID = null;
let LAST_GEOCODE = 0;

/* =====================================================
   ICONOS (AUTO REAL + PIN REAL)
===================================================== */
function crearIconoAuto(rotacion = 0){
  return L.divIcon({
    className: "auto-icon",
    iconSize: [48,48],
    iconAnchor: [24,24],
    html: `
      <div style="
        width:48px;
        height:48px;
        transform: rotate(${rotacion}deg);
      ">
        <svg viewBox="0 0 512 512" width="48" height="48" fill="#2563eb">
          <path d="M256 32c-17.7 0-32 14.3-32 32v32H96c-35.3 0-64 28.7-64 64v160c0 35.3 28.7 64 64 64h16v48c0 17.7 14.3 32 32 32h16c17.7 0 32-14.3 32-32v-48h128v48c0 17.7 14.3 32 32 32h16c17.7 0 32-14.3 32-32v-48h16c35.3 0 64-28.7 64-64V160c0-35.3-28.7-64-64-64H288V64c0-17.7-14.3-32-32-32zM112 176h288v96H112v-96z"/>
        </svg>
      </div>
    `
  });
}

const ICONO_ESTATICO = L.divIcon({
  className: "static-icon",
  iconSize: [32,32],
  iconAnchor: [16,32],
  html: `
    <svg viewBox="0 0 384 512" width="32" height="32" fill="#dc2626">
      <path d="M168 0C75.1 0 0 75.1 0 168c0 87.8 144.5 305.3 160.5 328.1c3.9 5.6 12.2 5.6 16.1 0C239.5 473.3 384 255.8 384 168C384 75.1 308.9 0 216 0H168zM192 240c-39.8 0-72-32.2-72-72s32.2-72 72-72s72 32.2 72 72s-32.2 72-72 72z"/>
    </svg>
  `
});

/* =====================================================
   MENU LATERAL
===================================================== */
function toggleMenu(){
  document.getElementById("menuLateral").classList.toggle("open");
}

/* =====================================================
   LOADER
===================================================== */
function iniciarProgreso(modo="init"){
  const bar = document.getElementById("progressBar");
  const overlay = document.getElementById("loadingOverlay");
  const txt = document.getElementById("loadingText");

  if(txt){
    txt.textContent =
      modo==="reload" ? "Actualizando sistema…" :
      modo==="init"   ? "Iniciando sistema…" :
                        "Procesando…";
  }

  overlay.style.display = "flex";
  bar.style.display = "block";
  bar.style.width = "0%";

  let p = 0;
  bar._i = setInterval(()=>{
    p += Math.random()*12;
    if(p > 90) p = 90;
    bar.style.width = p + "%";
  },150);
}

function finalizarProgreso(){
  const bar = document.getElementById("progressBar");
  const overlay = document.getElementById("loadingOverlay");

  clearInterval(bar._i);
  bar.style.width = "100%";

  setTimeout(()=>{
    bar.style.display = "none";
    bar.style.width = "0%";
    overlay.style.display = "none";
  },300);
}

/* =====================================================
   INIT
===================================================== */
document.addEventListener("DOMContentLoaded", async ()=>{

  window.viewer       = document.getElementById("viewer");
  window.frame        = document.getElementById("frame");
  window.viewerTitle  = document.getElementById("viewerTitle");
  window.menuModulos  = document.getElementById("menuModulos");
  window.conexionInfo = document.getElementById("conexionInfo");

  const panel = document.getElementById("panel");
  if(panel) panel.style.display = "none";

  const saved = sessionStorage.getItem("MODULO_ACTIVO");
  if(saved) MODULO_ACTIVO = JSON.parse(saved);

  iniciarProgreso("init");

  const user = await validarSesionGlobal();
  if(!user){
    finalizarProgreso();
    return;
  }

  document.getElementById("usuario").innerHTML =
    `👤 ${user.nombre} · ${user.rol}`;

  await cargarMenuSlider(user);

  iniciarMapaTiempoReal();   // 🚗 AUTO + GPS
  obtenerIP();
  iniciarReloj();

  if(MODULO_ACTIVO){
    abrirModulo(MODULO_ACTIVO.url, MODULO_ACTIVO.titulo, true);
  }

  finalizarProgreso();
});

/* =====================================================
   MENU SLIDER
===================================================== */
async function cargarMenuSlider(user){
  const r = await fetch(`${API}?action=listarModulos`);
  const res = await r.json();
  menuModulos.innerHTML = "";

  if(!Array.isArray(res.data)) return;

  res.data.forEach(m=>{
    const [id,nombre,archivo,icono,permiso,activo] = m;
    if(activo!=="SI") return;
    if(user.rol!=="ADMIN" && !user.permisos.includes(permiso)) return;

    const item = document.createElement("div");
    item.className = "menu-item";
    item.innerHTML = `${icono||"📦"} ${nombre}`;
    item.onclick = ()=>{
      abrirModulo(archivo,nombre);
      toggleMenu();
    };
    menuModulos.appendChild(item);
  });
}

/* =====================================================
   VISOR
===================================================== */
function abrirModulo(url,titulo,restaurando=false){
  MODULO_ACTIVO = { url, titulo };
  sessionStorage.setItem("MODULO_ACTIVO", JSON.stringify(MODULO_ACTIVO));
  viewer.style.display="flex";
  if(!restaurando) frame.src=url;
  viewerTitle.textContent=titulo;
}

function volver(){
  sessionStorage.removeItem("MODULO_ACTIVO");
  viewer.style.display="none";
  frame.src="";
}

/* =====================================================
   FECHA / IP
===================================================== */
function iniciarReloj(){
  setInterval(()=>{
    const n = new Date();
    conexionInfo.innerHTML =
      `📅 ${n.toLocaleDateString("es-CL")}<br>
       ⏰ ${n.toLocaleTimeString("es-CL")}<br>
       🌐 IP: ${USER_IP}`;
  },1000);
}

async function obtenerIP(){
  try{
    USER_IP = (await (await fetch("https://api.ipify.org?format=json")).json()).ip;
  }catch{
    USER_IP = "no disponible";
  }
}

/* =====================================================
   MAPA + AUTO EN MOVIMIENTO (FINAL)
===================================================== */
function iniciarMapaTiempoReal(){
  if(!navigator.geolocation || !document.getElementById("mapa")) return;

  WATCH_ID = navigator.geolocation.watchPosition(
    pos=>{
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const speed = pos.coords.speed || 0;     // m/s
      const heading = pos.coords.heading || 0; // grados

      if(!MAPA){
        MAPA = L.map("mapa").setView([lat,lng],16);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png")
          .addTo(MAPA);

        MARCADOR = L.marker([lat,lng],{ icon: ICONO_ESTATICO }).addTo(MAPA);
      }

      const enMovimiento = speed > 2; // ~7 km/h

      MARCADOR.setLatLng([lat,lng]);
      MARCADOR.setIcon(
        enMovimiento ? crearIconoAuto(heading) : ICONO_ESTATICO
      );

      MAPA.setView([lat,lng], MAPA.getZoom());

      // Dirección en letras (cada 15s)
      if(Date.now() - LAST_GEOCODE > 15000){
        LAST_GEOCODE = Date.now();
        actualizarDireccionTexto(lat,lng);
      }

      actualizarRedYVelocidad();
    },
    ()=>{
      document.getElementById("dirTexto").textContent = "GPS no disponible";
    },
    { enableHighAccuracy:true, maximumAge:2000, timeout:10000 }
  );
}

async function actualizarDireccionTexto(lat,lng){
  try{
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );
    const d = await r.json();
    document.getElementById("dirTexto").textContent =
      d.display_name || "Dirección no disponible";
  }catch{
    document.getElementById("dirTexto").textContent =
      "Dirección no disponible";
  }
}

function actualizarRedYVelocidad(){
  const net = document.getElementById("netTexto");
  const speedEl = document.getElementById("speedTexto");

  const online = navigator.onLine ? "Online" : "Offline";
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  let tipo="desconocida", down="—", rtt="—";
  if(conn){
    tipo = conn.effectiveType || conn.type || tipo;
    if(conn.downlink) down = conn.downlink + " Mbps";
    if(conn.rtt) rtt = conn.rtt + " ms";
  }

  net.textContent = `${online} · ${tipo}`;
  speedEl.textContent = `↓ ${down} · RTT ${rtt}`;
}