/* =====================================================
   CONFIGURACIÓN
===================================================== */
const API =
"https://script.google.com/macros/s/AKfycbxDUcEzMGw9LWnzn-YUV89So3AFCEnplOHQuGmzq-EV_hnIMhQvgQIPY1AxvlKJPZNx/exec";

let USER_IP = "cargando...";
let MODULO_ACTIVO = null;

/* ===== MAPA / TRACKING ===== */
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
          <path d="M256 32c-17.7 0-32 14.3-32 32v32H96c-35.3 0-64 28.7-64 64v160c0 35.3 28.7 64 64 64h16v48c0 17.7 14.3 32 32 32h16c17.7 0 32-14.3 32-32v-48h128v48c0 17.7 14.3 32 32 32h16c17.7 0 32-14.3 32-32v-48h16c35.3 0 64-28.7 64-64V160c0-35.3-28.7-64-64-64H288V64c0-17.7-14.3-32-32-32z"/>
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
      <path d="M168 0C75.1 0 0 75.1 0 168c0 87.8 144.5 305.3 160.5 328.1c3.9 5.6 12.2 5.6 16.1 0C239.5 473.3 384 255.8 384 168z"/>
    </svg>`
});

/* =====================================================
   TOASTS (ALERTAS MODERNAS)
===================================================== */
function toast(msg,type="info"){
  let box=document.getElementById("toastBox");
  if(!box){
    box=document.createElement("div");
    box.id="toastBox";
    box.style.cssText=`
      position:fixed;top:20px;right:20px;z-index:99999;
      display:flex;flex-direction:column;gap:10px`;
    document.body.appendChild(box);
  }
  const t=document.createElement("div");
  const colors={
    info:"#3b82f6",success:"#16a34a",warning:"#f59e0b",error:"#dc2626"
  };
  t.style.cssText=`
    background:${colors[type]||"#334155"};
    color:#fff;padding:12px 16px;border-radius:10px;
    box-shadow:0 10px 25px rgba(0,0,0,.3);
    font-size:13px;animation:fadein .3s`;
  t.textContent=msg;
  box.appendChild(t);
  setTimeout(()=>t.remove(),3500);
}

/* =====================================================
   BOT FLOTANTE
===================================================== */
function crearBot(){
  const b=document.createElement("div");
  b.textContent="🤖";
  b.style.cssText=`
    position:fixed;bottom:20px;right:20px;
    width:56px;height:56px;border-radius:50%;
    background:#2563eb;color:#fff;
    display:flex;align-items:center;justify-content:center;
    font-size:24px;cursor:pointer;
    box-shadow:0 10px 30px rgba(0,0,0,.4);
    z-index:9999`;
  b.onclick=()=>{
    toast(
      `GPS activo · Red ${navigator.connection?.effectiveType||"—"} · Vel ${document.getElementById("speedTexto").textContent}`,
      "info"
    );
  };
  document.body.appendChild(b);
}

/* =====================================================
   INIT
===================================================== */
document.addEventListener("DOMContentLoaded", async ()=>{
  crearBot();
  toast("Sistema iniciado","success");
});

/* =====================================================
   MAPA + DATOS + RADIO
===================================================== */
function iniciarMapaTiempoReal(){
  if(!navigator.geolocation) return;

  WATCH_ID=navigator.geolocation.watchPosition(pos=>{
    const {latitude:lat,longitude:lng,speed=0,heading=0}=pos.coords;

    if(!MAPA){
      MAPA=L.map("mapa").setView([lat,lng],16);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(MAPA);
      MARCADOR=L.marker([lat,lng],{icon:ICONO_ESTATICO}).addTo(MAPA);
      CIRCULO=L.circle([lat,lng],{radius:50,color:"#2563eb",fillOpacity:.15}).addTo(MAPA);
    }

    MARCADOR.setLatLng([lat,lng]);
    MARCADOR.setIcon(speed>2?crearIconoAuto(heading):ICONO_ESTATICO);

    const conn=navigator.connection||{};
    let radio=50;
    if(conn.effectiveType==="4g") radio=120;
    if(conn.effectiveType==="3g") radio=80;
    if(conn.effectiveType==="2g") radio=40;

    CIRCULO.setLatLng([lat,lng]);
    CIRCULO.setRadius(radio);

    actualizarRedYVelocidad(speed);

    if(Date.now()-LAST_GEOCODE>15000){
      LAST_GEOCODE=Date.now();
      actualizarDireccionTexto(lat,lng);
    }
  });
}

/* =====================================================
   DIRECCIÓN
===================================================== */
async function actualizarDireccionTexto(lat,lng){
  try{
    const r=await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );
    const d=await r.json();
    document.getElementById("dirTexto").textContent=d.display_name||"—";
  }catch{
    document.getElementById("dirTexto").textContent="—";
  }
}

/* =====================================================
   RED + VELOCIDAD
===================================================== */
function actualizarRedYVelocidad(speed){
  const net=document.getElementById("netTexto");
  const spd=document.getElementById("speedTexto");
  const kmh=(speed*3.6).toFixed(1);
  const conn=navigator.connection||{};
  net.textContent=`${navigator.onLine?"Online":"Offline"} · ${conn.effectiveType||"—"}`;
  spd.textContent=`🚗 ${kmh} km/h`;
}

/* =====================================================
   SESIÓN
===================================================== */
function cerrarSesion(){
  if(WATCH_ID) navigator.geolocation.clearWatch(WATCH_ID);
  sessionStorage.clear();
  localStorage.clear();
  toast("Sesión cerrada","warning");
  setTimeout(()=>location.href="index.html",1200);
}