/************************************************
 * EMPRESA.JS
 * Carga empresa activa en MAIN:
 * - Logo
 * - Nombre
 * - RUT
 * - Estado (ACTIVA / INACTIVA)
 * - Variable global EMPRESA_ACTIVA
 ************************************************/

const API_EMPRESAS =
"https://script.google.com/macros/s/AKfycbxnmGEQXTkJhpFFb0VloCUREawb_xTQILOcsOJiDggeod0yu-fj8GWrrpRbwjZtd9b9/exec";

/* =================================================
   VARIABLE GLOBAL
================================================= */
window.EMPRESA_ACTIVA = null;

/* =================================================
   CARGAR EMPRESA ACTIVA
================================================= */
async function cargarEmpresaActiva(){

  const overlay = document.getElementById("loadingOverlay");
  const logoEl  = document.getElementById("logoEmpresa");

  try{
    if(overlay) overlay.style.display = "flex";

    const r = await fetch(API_EMPRESAS + "?action=empresaActiva", {
      cache: "no-store"
    });

    const d = await r.json();

    /* =============================
       VALIDACIONES
    ============================== */
    if(!d || !d.ok || !d.data){
      mostrarSistemaNoConfigurado();
      return;
    }

    const empresa = d.data;

    if(!empresa.nombre || !empresa.rut || !empresa.estado){
      mostrarSistemaNoConfigurado();
      return;
    }

    /* =============================
       GUARDAR GLOBAL
    ============================== */
    window.EMPRESA_ACTIVA = empresa;

    /* =============================
       LOGO (SIN CACHE)
    ============================== */
    if(logoEl){
      if(empresa.logo){
        logoEl.src = empresa.logo + "?v=" + Date.now();
        logoEl.style.display = "block";
      }else{
        logoEl.style.display = "none";
      }
    }

    /* =============================
       TÍTULO + RUT + ESTADO
    ============================== */
    setTituloSistemaHTML(`
      <div style="line-height:1.2">
        <div style="
          display:flex;
          align-items:center;
          gap:8px;
          font-weight:700;
        ">
          ${empresa.nombre}

          <span style="
            font-size:11px;
            padding:2px 8px;
            border-radius:999px;
            font-weight:700;
            background:${empresa.estado === "ACTIVA" ? "#dcfce7" : "#fee2e2"};
            color:${empresa.estado === "ACTIVA" ? "#166534" : "#991b1b"};
          ">
            ${empresa.estado}
          </span>
        </div>

        <div style="font-size:12px;color:#64748b">
          RUT: ${empresa.rut}
        </div>
      </div>
    `);

    /* =============================
       INFO LATERAL
    ============================== */
    setInfoEmpresa(`🏢 ${empresa.sistema || "Sistema activo"}`);

    /* =============================
       BLOQUEO SI INACTIVA (OPCIONAL)
    ============================== */
    if(empresa.estado !== "ACTIVA"){
      console.warn("Empresa INACTIVA");
      // Aquí puedes bloquear módulos, botones o redirigir
    }

  }catch(err){
    console.error("Error empresa activa:", err);
    mostrarErrorConexion();
  }finally{
    if(overlay) overlay.style.display = "none";
  }
}

/* =================================================
   HELPERS DOM
================================================= */
function setTituloSistemaHTML(html){
  const el = document.getElementById("tituloSistema");
  if(el) el.innerHTML = html;
}

function setInfoEmpresa(html){
  const el = document.getElementById("conexionInfo");
  if(el) el.innerHTML = html;
}

/* =================================================
   ESTADOS VISUALES
================================================= */
function mostrarSistemaNoConfigurado(){
  setTituloSistemaHTML(`
    <div style="font-weight:700;color:#dc2626">
      Sistema no configurado
    </div>
  `);

  setInfoEmpresa("⚠ No hay empresa activa");

  const logoEl = document.getElementById("logoEmpresa");
  if(logoEl) logoEl.style.display = "none";
}

function mostrarErrorConexion(){
  setTituloSistemaHTML(`
    <div style="font-weight:700;color:#dc2626">
      Error al iniciar sistema
    </div>
  `);

  setInfoEmpresa("❌ Error de conexión");

  const logoEl = document.getElementById("logoEmpresa");
  if(logoEl) logoEl.style.display = "none";
}

/* =================================================
   INIT
================================================= */
window.addEventListener("load", cargarEmpresaActiva);
