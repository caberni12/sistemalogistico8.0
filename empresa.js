/************************************************
 * EMPRESA.JS
 * Carga empresa activa y título del sistema
 ************************************************/

const API_EMPRESAS =
"https://script.google.com/macros/s/AKfycbzumC1ekCg9t1PYLR-a66CEZQ0oxUzcMbPjjLZ3ck8vmwyYAs4Y-sLFyiLgwq-bHe6o/exec";

/* Variable global accesible desde otros JS */
window.EMPRESA_ACTIVA = null;

/************************************************
 * CARGAR EMPRESA ACTIVA
 ************************************************/
async function cargarEmpresaActiva(){
  const overlay = document.getElementById("loadingOverlay");

  try{
    if(overlay) overlay.style.display = "flex";

    const r = await fetch(API_EMPRESAS + "?action=empresaActiva");
    const d = await r.json();

    if(!d.ok){
      setTituloSistemaHTML(`
        <div>Sistema no configurado</div>
      `);
      setInfoEmpresa("⚠ No hay empresa activa");
      return;
    }

    window.EMPRESA_ACTIVA = d.data;

    /* 🔹 TÍTULO SUPERIOR
       Empresa + RUT debajo */
    setTituloSistemaHTML(`
      <div style="line-height:1.2">
        <div style="font-weight:700">
          ${window.EMPRESA_ACTIVA.nombre}
        </div>
        <div style="font-size:12px; color:#64748b">
          RUT: ${window.EMPRESA_ACTIVA.rut}
        </div>
      </div>
    `);

    /* 🔹 INFO DERECHA (opcional, resumida) */
    setInfoEmpresa(
      `🏢 ${window.EMPRESA_ACTIVA.sistema}`
    );

  }catch(err){
    setTituloSistemaHTML(`
      <div>Error al iniciar sistema</div>
    `);
    setInfoEmpresa("❌ Error de conexión");
  }finally{
    if(overlay) overlay.style.display = "none";
  }
}

/************************************************
 * HELPERS DOM
 ************************************************/
function setTituloSistemaHTML(html){
  const el = document.getElementById("tituloSistema");
  if(el) el.innerHTML = html;
}

function setInfoEmpresa(html){
  const el = document.getElementById("conexionInfo");
  if(el) el.innerHTML = html;
}

/************************************************
 * INIT
 ************************************************/
window.addEventListener("load", cargarEmpresaActiva);