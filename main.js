/* =====================================================
   CONFIGURACIÓN GENERAL
===================================================== */
const API =
"https://script.google.com/macros/s/AKfycbxDUcEzMGw9LWnzn-YUV89So3AFCEnplOHQuGmzq-EV_hnIMhQvgQIPY1AxvlKJPZNx/exec";

let USER_IP = "cargando...";
let MODULO_ACTIVO = null;

/* =====================================================
   MAPA / TRACKING
===================================================== */
let MAPA = null;
let MARCADOR = null;
let CIRCULO = null;
let WATCH_ID = null;
let LAST_GEOCODE = 0;

/* =====================================================
   ICONOS
===================================================== */
function crearIconoAuto(rotacion = 0){
  return L.divIcon({
    className: "auto-icon",
    iconSize: [48,48],
    iconAnchor: [24,24],
    html: `
      <div style="width:48px;height:48px;transform:rotate(${rotacion}deg)">
        <svg viewBox="0 0 512 512" width="48" height="48" fill="#2563eb">
          <path d="M256 32c-17.7 0-32 14.3-32 32v32H96c-35.3 0-64 28.7-64 64v160
                   c0 35.3 28.7 64 64 64h16v48c0 17.7 14.3 32 32 32h16
                   c17.7 0 32-14.3 32-32v-48h128v48c0 17.7 14.3 32 32 32h16
                   c17.7 0 32-14.3 32-32v-48h16c35.3 0 64-28.7 64-64V160
                   c0-35.3-28.7-64-64-64H288V64c0-17.7-14.3-32-32-32z"/>
        </svg>
      </div>`
  });
}

const ICONO_ESTATICO = L.divIcon({
  className: "static-icon",
  iconSize: [32,32],
  iconAnchor: [16,32],
  html: `
    <svg viewBox="0 0 384 512" width="32" height="32" fill="#dc2626">
      <path d="M168 0C75.1 0 0 75.1 0 168c0 87.8 144.5 305.3
               160.5 328.1c3.9 5.6 12.2 5.6 16.1 0
               C239.5 473.3 384 255.8 384 168z"/>
    </svg>`
});

/* =====================================================
   MENÚ
===================================================== */
function toggleMenu(){
  document.getElementById("menuLateral")?.classList.toggle("open");
}

/* =====================================================
   LOADER
===================================================== */
function iniciarProgreso(texto="Procesando…"){
  const bar = document.getElementById("progressBar");
  const overlay = document.getElementById("loadingOverlay");
  if(overlay) overlay.style.display = "flex";
  if(bar){
    bar.style.display = "block";
    bar.style.width = "0%";
    let p = 0;
    bar._i = setInterval(()=>{
      p += Math.random()*12;
      if(p>90) p=90;
      bar.style.width = p+"%";
    },150);
  }
}

function finalizarProgreso(){
  const bar = document.getElementById("progressBar");
  const overlay = document.getElementById("loadingOverlay");
  if(bar){
    clearInterval(bar._i);
    bar.style.width = "100%";
    setTimeout(()=>{
      bar.style.display="none";
      bar.style.width="0%";
    },300);
  }
  if(overlay) overlay.style.display="none";
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

  iniciarProgreso("Iniciando sistema…");

  if(typeof validarSesionGlobal !== "function"){
    cerrarSesion();
    return;
  }

  const user = await validarSesionGlobal();
  if(!user){
    cerrarSesion();
    return;
  }

  document.getElementById("usuario").innerHTML =
    `👤 ${user.nombre} · ${user.rol}`;

  await cargarMenuSlider(user);

  iniciarMapaTiempoReal();
  obtenerIP();
  iniciarReloj();

  crearBotFlotante();

  finalizarProgreso();
});

/* =====================================================
   MENÚ DINÁMICO
===================================================== */
async function cargarMenuSlider(user){
  try{
    const r = await fetch(`${API}?action=listarModulos`);
    const res = await r.json();
    menuModulos.innerHTML="";

    if(!Array.isArray(res.data)) return;

    res.data.forEach(m=>{
      const [id,nombre,archivo,icono,permiso,activo] = m;
      if(activo!=="SI") return;
      if(user.rol!=="ADMIN" && !user.permisos.includes(permiso)) return;

      const div = document.createElement("div");
      div.className="menu-item";
      div.innerHTML=`${icono||"📦"} ${nombre}`;
      div.onclick=()=>{
        abrirModulo(archivo,nombre);
        toggleMenu();
      };
      menuModulos.appendChild(div);
    });
  }catch(e){
    console.error("Error menú:",e);
  }
}

/* =====================================================
   VISOR
===================================================== */
function abrirModulo(url,titulo){
  viewer.style.display="flex";
  frame.src=url;
  viewerTitle.textContent=titulo;
}

function volver(){
  viewer.style.display="none";
  frame.src="";
}

/* =====================================================
   MAPA + GPS + RADIO DE CONEXIÓN
===================================================== */
function iniciarMapaTiempoReal(){
  if(!navigator.geolocation || !document.getElementById("mapa")) return;

  WATCH_ID = navigator.geolocation.watchPosition(pos=>{
    const {latitude:lat, longitude:lng, speed=0, heading=0} = pos.coords;

    if(!MAPA){
      MAPA = L.map("mapa").setView([lat,lng],16);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(MAPA);
      MARCADOR = L.marker([lat,lng],{icon:ICONO_ESTATICO}).addTo(MAPA);
      CIRCULO  = L.circle([lat,lng],{
        radius:80,
        color:"#2563eb",
        fillOpacity:.15
      }).addTo(MAPA);
    }

    MARCADOR.setLatLng([lat,lng]);
    MARCADOR.setIcon(speed>2 ? crearIconoAuto(heading) : ICONO_ESTATICO);
    MAPA.setView([lat,lng], MAPA.getZoom());

    const conn = navigator.connection || {};
    let radio = 80;
    if(conn.effectiveType==="4g") radio=140;
    if(conn.effectiveType==="3g") radio=90;
    if(conn.effectiveType==="2g") radio=50;
    CIRCULO.setLatLng([lat,lng]);
    CIRCULO.setRadius(radio);

    actualizarRedYVelocidad(speed);

    if(Date.now()-LAST_GEOCODE>15000){
      LAST_GEOCODE = Date.now();
      actualizarDireccionTexto(lat,lng);
    }
  },{
    enableHighAccuracy:true,
    maximumAge:2000,
    timeout:10000
  });
}

/* =====================================================
   DIRECCIÓN
===================================================== */
async function actualizarDireccionTexto(lat,lng){
  try{
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );
    const d = await r.json();
    document.getElementById("dirTexto").textContent =
      d.display_name || "Dirección no disponible";
  }catch{
    document.getElementById("dirTexto").textContent="Dirección no disponible";
  }
}

/* =====================================================
   RED + VELOCIDAD
===================================================== */
function actualizarRedYVelocidad(speed){
  const net = document.getElementById("netTexto");
  const spd = document.getElementById("speedTexto");
  const kmh = (speed*3.6).toFixed(1);
  const conn = navigator.connection || {};
  if(net) net.textContent =
    `${navigator.onLine?"Online":"Offline"} · ${conn.effectiveType||"—"}`;
  if(spd) spd.textContent = `🚗 ${kmh} km/h`;
}

/* =====================================================
   IP + RELOJ
===================================================== */
async function obtenerIP(){
  try{
    USER_IP = (await (await fetch("https://api.ipify.org?format=json")).json()).ip;
  }catch{
    USER_IP = "—";
  }
}

function iniciarReloj(){
  setInterval(()=>{
    const n = new Date();
    if(conexionInfo){
      conexionInfo.innerHTML =
        `📅 ${n.toLocaleDateString("es-CL")}<br>
         ⏰ ${n.toLocaleTimeString("es-CL")}<br>
         🌐 IP: ${USER_IP}`;
    }
  },1000);
}

/* =====================================================
   BOT FLOTANTE
===================================================== */
function crearBotFlotante(){
  const bot = document.createElement("div");
  bot.textContent="🤖";
  bot.style.cssText=`
    position:fixed;bottom:20px;right:20px;
    width:56px;height:56px;border-radius:50%;
    background:#2563eb;color:#fff;
    display:flex;align-items:center;justify-content:center;
    font-size:24px;cursor:pointer;
    box-shadow:0 10px 30px rgba(0,0,0,.4);
    z-index:9999`;
  bot.onclick=()=>{
    alert(
      "Estado del sistema\n" +
      "Red: " + (navigator.connection?.effectiveType||"—") + "\n" +
      "Velocidad: " + document.getElementById("speedTexto").textContent
    );
  };
  document.body.appendChild(bot);
}

/* =====================================================
   BOTONES
===================================================== */
function recargarPanel(){
  location.reload();
}

function cerrarSesion(){
  if(WATCH_ID) navigator.geolocation.clearWatch(WATCH_ID);
  sessionStorage.clear();
  localStorage.clear();
  window.location.href="index.html";
}