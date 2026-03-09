/************************************************
 * EMPRESA.JS
 * Empresa activa (header) + CRUD preparado
 ************************************************/

/* =================================================
   CONFIGURACIÓN
================================================= */
const API_EMPRESA =
"https://script.google.com/macros/s/AKfycbykKpB2xH6vw7p8lXNrLjN2Wk4ze3KDZVl-1Pds04_vPpsdMVV027sR3caGMD-huzYR/exec";

/* =================================================
   EMPRESA ACTIVA (HEADER)
================================================= */
async function cargarEmpresaHeader(){
  try{
    const r = await fetch(API_EMPRESA + "?action=empresaActiva", {
      cache:"no-store"
    });
    const d = await r.json();
    if(!d.ok) return;

    const titulo = document.getElementById("tituloSistema");
    const logo   = document.getElementById("logoEmpresa");

    if(titulo && d.data.nombre){
      titulo.textContent = d.data.nombre;
    }

    if(logo && d.data.logo){
      logo.src = d.data.logo + "?v=" + Date.now();
      logo.style.display = "block";
    }

  }catch(err){
    console.error("Empresa:", err);
  }
}

/* =================================================
   CRUD (SOLO SE EJECUTA SI EXISTE EL HTML)
================================================= */
(function(){
  if(!document.getElementById("tablaEmpresas")) return;

  let empresasCache = [];
  let logoBase64 = "";
  let cargando = false;

  const $ = id => document.getElementById(id);

  function normalizarEstado(v){
    return String(v || "").toUpperCase();
  }

  window.addEventListener("load", ()=>{
    $("btnNueva")?.addEventListener("click", ()=> abrirModal());
    $("btnCargar")?.addEventListener("click", cargarEmpresas);
    $("btnCancelar")?.addEventListener("click", ()=> $("modalEmpresa").style.display="none");
    $("btnGuardar")?.addEventListener("click", guardarEmpresa);

    $("buscarEmpresa")?.addEventListener("input", aplicarFiltros);
    $("filtroEstado")?.addEventListener("change", aplicarFiltros);

    $("empresaLogo")?.addEventListener("change", leerLogo);

    cargarEmpresas();
  });

  function leerLogo(e){
    const file = e.target.files[0];
    if(!file) return;

    const reader = new FileReader();
    reader.onload = ev=>{
      logoBase64 = ev.target.result;
      $("logoPreview").src = logoBase64;
      $("logoPreview").style.display = "block";
    };
    reader.readAsDataURL(file);
  }

  async function cargarEmpresas(){
    if(cargando) return;
    cargando = true;

    try{
      const r = await fetch(API_EMPRESA + "?action=listarEmpresas",{cache:"no-store"});
      const d = await r.json();
      if(!d.ok) throw d.msg;

      empresasCache = d.data.map(e=>({
        ...e,
        estado: normalizarEstado(e.estado)
      }));

      aplicarFiltros();

    }catch(err){
      alert(err);
    }finally{
      cargando = false;
    }
  }

  function aplicarFiltros(){
    const tbody = $("tablaEmpresas");
    if(!tbody) return;
    tbody.innerHTML = "";

    empresasCache.forEach(e=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${e.nombre}</td>
        <td><img src="${e.logo || ""}" height="28"></td>
      `;
      tbody.appendChild(tr);
    });
  }

  async function guardarEmpresa(){
    const payload = {
      action: $("empresaId").value ? "editarEmpresa" : "crearEmpresa",
      id: $("empresaId").value,
      nombre: $("empresaNombre").value,
      rut: $("empresaRut").value,
      logoBase64
    };

    await fetch(API_EMPRESA,{
      method:"POST",
      headers:{ "Content-Type":"text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    $("modalEmpresa").style.display="none";
    cargarEmpresas();
  }
})();