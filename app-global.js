/************************************************
 * APP-GLOBAL.JS
 * Aceleración global de la aplicación
 ************************************************/

/* =================================================
   CONFIGURACIÓN
================================================= */
const APP_CACHE = {
  EMPRESA_KEY: "empresa_cache",
  EMPRESA_TTL: 5 * 60 * 1000 // 5 minutos
};

/* =================================================
   HELPERS
================================================= */
function getCache(key){
  try{
    return JSON.parse(sessionStorage.getItem(key));
  }catch(e){
    return null;
  }
}

function setCache(key, data){
  sessionStorage.setItem(key, JSON.stringify({
    time: Date.now(),
    data
  }));
}

function cacheValido(cache, ttl){
  return cache && (Date.now() - cache.time < ttl);
}

/* =================================================
   EMPRESA GLOBAL
================================================= */
async function cargarEmpresaGlobal(){

  const titulo = document.getElementById("tituloSistema");
  const logo   = document.getElementById("logoEmpresa");

  /* ===== 1. PINTAR DESDE CACHE (INMEDIATO) ===== */
  const cache = getCache(APP_CACHE.EMPRESA_KEY);
  if(cacheValido(cache, APP_CACHE.EMPRESA_TTL)){
    if(titulo && cache.data.nombre){
      titulo.textContent = cache.data.nombre;
    }
    if(logo && cache.data.logo){
      logo.src = cache.data.logo;
      logo.style.display = "block";
    }
  }

  /* ===== 2. FETCH EN SEGUNDO PLANO ===== */
  if(typeof API_EMPRESA === "undefined") return;

  try{
    const r = await fetch(API_EMPRESA + "?action=empresaActiva", {
      cache:"no-store"
    });
    const d = await r.json();
    if(!d.ok) return;

    /* ===== 3. ACTUALIZAR UI ===== */
    if(titulo && d.data.nombre){
      titulo.textContent = d.data.nombre;
    }
    if(logo && d.data.logo){
      logo.src = d.data.logo + "?v=" + Date.now();
      logo.style.display = "block";
    }

    /* ===== 4. GUARDAR CACHE ===== */
    setCache(APP_CACHE.EMPRESA_KEY, d.data);

  }catch(err){
    console.warn("Empresa no disponible (cache usada)");
  }
}

/* =================================================
   USUARIO / SESIÓN (OPCIONAL)
================================================= */
function obtenerSesion(){
  try{
    return {
      token: localStorage.getItem("token"),
      usuario: localStorage.getItem("usuario"),
      nombre: localStorage.getItem("nombre"),
      rol: localStorage.getItem("rol"),
      permisos: JSON.parse(localStorage.getItem("permisos") || "[]")
    };
  }catch(e){
    return null;
  }
}

/* =================================================
   AUTO-INICIO GLOBAL
================================================= */
(function iniciarAppGlobal(){
  document.addEventListener("DOMContentLoaded", () => {
    cargarEmpresaGlobal();
  });
})();