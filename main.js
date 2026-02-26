/* =====================================================
   CONFIG
===================================================== */
const API =
"https://script.google.com/macros/s/AKfycbxDUcEzMGw9LWnzn-YUV89So3AFCEnplOHQuGmzq-EV_hnIMhQvgQIPY1AxvlKJPZNx/exec";

let USER_IP = "cargando...";
let MODULO_ACTIVO = null;

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

  // DOM
  window.viewer       = document.getElementById("viewer");
  window.frame        = document.getElementById("frame");
  window.viewerTitle  = document.getElementById("viewerTitle");
  window.menuModulos  = document.getElementById("menuModulos");
  window.conexionInfo = document.getElementById("conexionInfo");

  // ocultar panel (NO se usa)
  const panel = document.getElementById("panel");
  if(panel) panel.style.display = "none";

  // restaurar módulo activo
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
  obtenerIP();
  iniciarReloj();

  if(MODULO_ACTIVO){
    abrirModulo(MODULO_ACTIVO.url, MODULO_ACTIVO.titulo, true);
  }

  finalizarProgreso();
});

/* =====================================================
   CARGAR MENU SLIDER (CON SCROLL)
===================================================== */
async function cargarMenuSlider(user){
  const r = await fetch(`${API}?action=listarModulos`);
  const res = await r.json();

  menuModulos.innerHTML = "";

  if(!res.data || !Array.isArray(res.data)) return;

  // scroll vertical garantizado
  menuModulos.style.overflowY = "auto";
  menuModulos.style.maxHeight = "calc(100vh - 80px)";

  res.data.forEach(m=>{
    const [id,nombre,archivo,icono,permiso,activo] = m;

    if(activo !== "SI") return;
    if(user.rol !== "ADMIN" && !user.permisos.includes(permiso)) return;

    const item = document.createElement("div");
    item.className = "menu-item";

    if(MODULO_ACTIVO && MODULO_ACTIVO.url === archivo){
      item.classList.add("active");
    }

    item.innerHTML = `${icono || "📦"} ${nombre}`;

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

  document.querySelectorAll(".menu-item").forEach(i=>{
    i.classList.toggle("active", i.innerText.includes(titulo));
  });

  viewer.style.display = "flex";
  if(!restaurando) frame.src = url;
  viewerTitle.textContent = titulo;
}

function volver(){
  MODULO_ACTIVO = null;
  sessionStorage.removeItem("MODULO_ACTIVO");

  document.querySelectorAll(".menu-item").forEach(i=>{
    i.classList.remove("active");
  });

  viewer.style.display = "none";
  frame.src = "";
}

/* =====================================================
   RECARGAR
===================================================== */
async function recargarPanel(){
  iniciarProgreso("reload");

  const user = await validarSesionGlobal();
  if(!user){
    finalizarProgreso();
    return;
  }

  await cargarMenuSlider(user);

  if(MODULO_ACTIVO){
    viewer.style.display = "flex";
    frame.src = MODULO_ACTIVO.url;
    viewerTitle.textContent = MODULO_ACTIVO.titulo;
  }

  finalizarProgreso();
}

/* =====================================================
   LOGOUT
===================================================== */
function cerrarSesion(){
  sessionStorage.removeItem("MODULO_ACTIVO");
  cerrarSesionGlobal();
}

/* =====================================================
   FECHA / IP
===================================================== */
function iniciarReloj(){
  actualizarConexion();
  setInterval(actualizarConexion,1000);
}

function actualizarConexion(){
  const n = new Date();
  conexionInfo.innerHTML = `
    📅 ${n.toLocaleDateString("es-CL")}<br>
    ⏰ ${n.toLocaleTimeString("es-CL")}<br>
    🌐 IP: ${USER_IP}
  `;
}

async function obtenerIP(){
  try{
    const r = await fetch("https://api.ipify.org?format=json");
    const d = await r.json();
    USER_IP = d.ip;
  }catch{
    USER_IP = "no disponible";
  }
}