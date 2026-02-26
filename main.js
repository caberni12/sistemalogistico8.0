/* =====================================================
   CONFIGURACIÓN GENERAL
===================================================== */
const API =
"https://script.google.com/macros/s/AKfycbxDUcEzMGw9LWnzn-YUV89So3AFCEnplOHQuGmzq-EV_hnIMhQvgQIPY1AxvlKJPZNx/exec";

let USER_IP = "—";
let WATCH_ID = null;
let LAST_GEOCODE = 0;

/* =====================================================
   MAPA
===================================================== */
let MAPA = null;
let MARCADOR = null;
let CIRCULO = null;

/* =====================================================
   ICONOS
===================================================== */
function crearIconoAuto(rot = 0){
  return L.divIcon({
    className: "auto-icon",
    iconSize: [48,48],
    iconAnchor: [24,24],
    html: `
      <div style="width:48px;height:48px;transform:rotate(${rot}deg)">
        <svg viewBox="0 0 512 512" width="48" height="48" fill="#2563eb">
          <path d="M256 32c-17.7 0-32 14.3-32 32v32H96
            c-35.3 0-64 28.7-64 64v160
            c0 35.3 28.7 64 64 64h16v48
            c0 17.7 14.3 32 32 32h16
            c17.7 0 32-14.3 32-32v-48h128
            v48c0 17.7 14.3 32 32 32h16
            c17.7 0 32-14.3 32-32v-48h16
            c35.3 0 64-28.7 64-64V160
            c0-35.3-28.7-64-64-64H288V64
            c0-17.7-14.3-32-32-32z"/>
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
      <path d="M168 0C75.1 0 0 75.1 0 168
        c0 87.8 144.5 305.3 160.5 328.1
        c3.9 5.6 12.2 5.6 16.1 0
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
function iniciarProgreso(){
  document.getElementById("loadingOverlay").style.display="flex";
  document.getElementById("progressBar").style.display="block";
}

function finalizarProgreso(){
  document.getElementById("loadingOverlay").style.display="none";
  document.getElementById("progressBar").style.display="none";
}

/* =====================================================
   INIT
===================================================== */
document.addEventListener("DOMContentLoaded", async ()=>{

  iniciarProgreso();

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

  await cargarMenu(user);

  iniciarMapa();
  obtenerIP();
  iniciarReloj();

  finalizarProgreso();
});

/* =====================================================
   MENÚ DINÁMICO
===================================================== */
async function cargarMenu(user){
  const r = await fetch(`${API}?action=listarModulos`);
  const res = await r.json();
  const cont = document.getElementById("menuModulos");
  cont.innerHTML="";

  if(!Array.isArray(res.data)) return;

  res.data.forEach(m=>{
    const [id,nombre,archivo,icono,permiso,activo] = m;
    if(activo!=="SI") return;
    if(user.rol!=="ADMIN" && !user.permisos.includes(permiso)) return;

    const d=document.createElement("div");
    d.className="menu-item";
    d.innerHTML=`${icono||"📦"} ${nombre}`;
    d.onclick=()=>{
      abrirModulo(archivo,nombre);
      toggleMenu();
    };
    cont.appendChild(d);
  });
}

/* =====================================================
   VISOR
===================================================== */
function abrirModulo(url,titulo){
  document.getElementById("viewer").style.display="flex";
  document.getElementById("frame").src=url;
  document.getElementById("viewerTitle").textContent=titulo;
}

function volver(){
  document.getElementById("viewer").style.display="none";
  document.getElementById("frame").src="";
}

/* =====================================================
   MAPA + GPS + RADIO
===================================================== */
function iniciarMapa(){
  if(!navigator.geolocation) return;

  WATCH_ID = navigator.geolocation.watchPosition(pos=>{
    const {latitude:lat, longitude:lng, speed=0, heading=0} = pos.coords;

    if(!MAPA){
      MAPA = L.map("mapa").setView([lat,lng],16);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png")
        .addTo(MAPA);

      MARCADOR = L.marker([lat,lng],{icon:ICONO_ESTATICO}).addTo(MAPA);
      CIRCULO = L.circle([lat,lng],{
        radius:80,
        color:"#2563eb",
        fillOpacity:.15
      }).addTo(MAPA);
    }

    MARCADOR.setLatLng([lat,lng]);
    MARCADOR.setIcon(speed>2 ? crearIconoAuto(heading) : ICONO_ESTATICO);

    const conn = navigator.connection || {};
    let radio = 80;
    if(conn.effectiveType==="4g") radio=150;
    if(conn.effectiveType==="3g") radio=100;
    if(conn.effectiveType==="2g") radio=60;

    CIRCULO.setLatLng([lat,lng]);
    CIRCULO.setRadius(radio);

    actualizarRedVelocidad(speed);

    if(Date.now()-LAST_GEOCODE>15000){
      LAST_GEOCODE=Date.now();
      actualizarDireccion(lat,lng);
    }
  },
  ()=>{},
  { enableHighAccuracy:true, maximumAge:2000, timeout:10000 }
  );
}

/* =====================================================
   DIRECCIÓN
===================================================== */
async function actualizarDireccion(lat,lng){
  try{
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );
    const d = await r.json();
    document.getElementById("dirTexto").textContent =
      d.display_name || "—";
  }catch{
    document.getElementById("dirTexto").textContent="—";
  }
}

/* =====================================================
   RED + VELOCIDAD
===================================================== */
function actualizarRedVelocidad(speed){
  const kmh=(speed*3.6).toFixed(1);
  const conn=navigator.connection||{};
  document.getElementById("netTexto").textContent =
    `${navigator.onLine?"Online":"Offline"} · ${conn.effectiveType||"—"}`;
  document.getElementById("speedTexto").textContent =
    `🚗 ${kmh} km/h`;
}

/* =====================================================
   IP + RELOJ
===================================================== */
async function obtenerIP(){
  try{
    USER_IP=(await (await fetch("https://api.ipify.org?format=json")).json()).ip;
  }catch{}
}

function iniciarReloj(){
  setInterval(()=>{
    const n=new Date();
    document.getElementById("conexionInfo").innerHTML=
      `📅 ${n.toLocaleDateString("es-CL")}<br>
       ⏰ ${n.toLocaleTimeString("es-CL")}<br>
       🌐 IP: ${USER_IP}`;
  },1000);
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
  location.href="index.html";
}