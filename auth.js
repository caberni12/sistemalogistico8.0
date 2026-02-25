/* =====================================================
   AUTH.JS — CONTROL DE SESIÓN (FINAL)
   Compatible con token renovado y re-firmado
===================================================== */

/* ========= CONFIG ========= */
const API_AUTH =
  "https://script.google.com/macros/s/AKfycbxDUcEzMGw9LWnzn-YUV89So3AFCEnplOHQuGmzq-EV_hnIMhQvgQIPY1AxvlKJPZNx/exec";

const LOGIN_PAGE = "index.html";

/* ========= ESTADO ========= */
let AUTH_USER = null;

/* =====================================================
   VALIDAR SESIÓN GLOBAL
   - Ejecutar SOLO en páginas internas
   - Renueva token automáticamente
===================================================== */
async function validarSesionGlobal(){

  // ⛔ Nunca validar en login
  if (location.pathname.endsWith(LOGIN_PAGE)) return null;

  const token = localStorage.getItem("token");
  if (!token){
    redirigirLogin();
    return null;
  }

  try{
    const r = await fetch(`${API_AUTH}?action=verify&token=${encodeURIComponent(token)}`);
    const res = await r.json();

    if(!res.valid){
      limpiarSesion();
      redirigirLogin();
      return null;
    }

    // 🔄 GUARDAR TOKEN RENOVADO (CLAVE)
    if(res.token){
      localStorage.setItem("token", res.token);
    }

    AUTH_USER = res.data || {};

    // 🛡️ asegurar permisos como array
    if(typeof AUTH_USER.permisos === "string"){
      try{
        AUTH_USER.permisos = JSON.parse(AUTH_USER.permisos);
      }catch{
        AUTH_USER.permisos = [];
      }
    }
    if(!Array.isArray(AUTH_USER.permisos)){
      AUTH_USER.permisos = [];
    }

    return AUTH_USER;

  }catch(err){
    console.error("AUTH ERROR:", err);
    limpiarSesion();
    redirigirLogin();
    return null;
  }
}

/* =====================================================
   UTILIDADES
===================================================== */
function limpiarSesion(){
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
  localStorage.removeItem("nombre");
  localStorage.removeItem("rol");
  localStorage.removeItem("permisos");
}

function redirigirLogin(){
  if (!location.pathname.endsWith(LOGIN_PAGE)) {
    location.href = LOGIN_PAGE;
  }
}

/* =====================================================
   LOGOUT GLOBAL
===================================================== */
function cerrarSesionGlobal(){
  limpiarSesion();
  redirigirLogin();
}

/* =====================================================
   ACCESO AL USUARIO ACTUAL (OPCIONAL)
===================================================== */
function getUsuarioActual(){
  return AUTH_USER;
}
