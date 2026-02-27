/************************************************
 * EMPRESAS.JS
 * Frontend completo para gestión de empresas
 * Compatible 100% con Apps Script entregado
 ************************************************/

const API =
"https://script.google.com/macros/s/AKfycbxnmGEQXTkJhpFFb0VloCUREawb_xTQILOcsOJiDggeod0yu-fj8GWrrpRbwjZtd9b9/exec";

/* =================================================
   ESTADO GLOBAL
================================================= */
let empresasCache = [];
let logoBase64 = "";
let map = null;
let marker = null;
let circle = null;
const RADIO_METROS = 300;

let cargando = false;

/* =================================================
   HELPERS
================================================= */
const $ = id => document.getElementById(id);

function showLoader(){
  const l = $("globalLoader");
  if(l) l.style.display = "flex";
}

function hideLoader(){
  const l = $("globalLoader");
  if(l) l.style.display = "none";
}

function normalizarEstado(v){
  return String(v || "").toUpperCase();
}

/* =================================================
   EVENTOS PRINCIPALES
================================================= */
window.addEventListener("load", () => {
  $("btnNueva")?.addEventListener("click", () => abrirModal());
  $("btnCargar")?.addEventListener("click", cargarEmpresas);
  $("btnCancelar")?.addEventListener("click", () => $("modalEmpresa").style.display = "none");
  $("btnGuardar")?.addEventListener("click", guardarEmpresa);

  $("buscarEmpresa")?.addEventListener("input", aplicarFiltros);
  $("filtroEstado")?.addEventListener("change", aplicarFiltros);

  $("empresaLogo")?.addEventListener("change", leerLogo);

  cargarEmpresas();
});

/* =================================================
   LOGO (BASE64)
================================================= */
function leerLogo(e){
  const file = e.target.files[0];
  if(!file) return;

  const reader = new FileReader();
  reader.onload = ev => {
    logoBase64 = ev.target.result;
    $("logoPreview").src = logoBase64;
    $("logoPreview").style.display = "block";
  };
  reader.readAsDataURL(file);
}

/* =================================================
   MAPA
================================================= */
function initMap(lat = -33.45, lng = -70.66){
  if(!map){
    map = L.map("map").setView([lat, lng], 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
    marker = L.marker([lat, lng]).addTo(map);
  }

  const pos = [lat, lng];
  marker.setLatLng(pos);
  map.setView(pos, 16);

  if(circle) map.removeLayer(circle);
  circle = L.circle(pos, {
    radius: RADIO_METROS,
    color:"#2563eb",
    fillColor:"#3b82f6",
    fillOpacity:0.25
  }).addTo(map);

  setTimeout(()=> map.invalidateSize(), 200);
}

/* =================================================
   ABRIR MODAL
================================================= */
function abrirModal(e = null){
  $("modalEmpresa").style.display = "flex";
  $("modalTitulo").textContent = e ? "Editar Empresa" : "Nueva Empresa";

  $("empresaId").value        = e?.id || "";
  $("empresaNombre").value    = e?.nombre || "";
  $("empresaRut").value       = e?.rut || "";
  $("empresaGiro").value      = e?.giro || "";
  $("empresaCorreo").value    = e?.correo || "";
  $("empresaTelefono").value  = e?.telefono || "";
  $("empresaDireccion").value = e?.direccion || "";
  $("empresaComuna").value    = e?.comuna || "";
  $("empresaEstado").value    = normalizarEstado(e?.estado) || "ACTIVA";

  if(e?.logo){
    $("logoPreview").src = e.logo + "?v=" + Date.now();
    $("logoPreview").style.display = "block";
  }else{
    $("logoPreview").style.display = "none";
  }

  logoBase64 = "";
  $("empresaLogo").value = "";

  setTimeout(()=>{
    initMap(
      e?.lat ? Number(e.lat) : -33.45,
      e?.lng ? Number(e.lng) : -70.66
    );
  },300);
}

/* =================================================
   CARGAR EMPRESAS
================================================= */
async function cargarEmpresas(){
  if(cargando) return;
  cargando = true;
  showLoader();

  try{
    const r = await fetch(API + "?action=listarEmpresas", { cache:"no-store" });
    const d = await r.json();
    if(!d.ok) throw d.msg;

    empresasCache = d.data.map(e => ({
      ...e,
      estado: normalizarEstado(e.estado)
    }));

    aplicarFiltros();

  }catch(err){
    alert("Error al cargar empresas: " + err);
  }finally{
    hideLoader();
    cargando = false;
  }
}

/* =================================================
   FILTROS + TABLA
================================================= */
function aplicarFiltros(){
  const tbody  = $("tablaEmpresas");
  if(!tbody) return;

  const texto  = $("buscarEmpresa").value.toLowerCase();
  const estado = $("filtroEstado").value;

  tbody.innerHTML = "";

  empresasCache
    .filter(e =>
      (!texto || e.nombre.toLowerCase().includes(texto)) &&
      (estado === "TODAS" || e.estado === estado)
    )
    .forEach(e => {

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${e.id}</td>
        <td>
          <div class="empresa-cell">
            <img class="logo-tabla"
                 src="${e.logo || 'https://via.placeholder.com/42'}">
            <span>${e.nombre}</span>
          </div>
        </td>
        <td>${e.rut}</td>
        <td>${e.comuna || ""}</td>
        <td>
          <span class="badge ${e.estado === "ACTIVA" ? "activa" : "inactiva"}">
            ${e.estado}
          </span>
        </td>
        <td>
          <button class="secondary">✏️</button>
          <button class="danger">🗑</button>
        </td>
      `;

      tr.querySelector(".secondary").onclick = () => abrirModal(e);
      tr.querySelector(".danger").onclick    = () => eliminarEmpresa(e.id);

      tbody.appendChild(tr);
    });
}

/* =================================================
   GUARDAR (CREAR / EDITAR)
================================================= */
async function guardarEmpresa(){
  showLoader();

  try{
    const payload = {
      action: $("empresaId").value ? "editarEmpresa" : "crearEmpresa",
      id: $("empresaId").value,
      nombre: $("empresaNombre").value.trim(),
      rut: $("empresaRut").value.trim(),
      giro: $("empresaGiro").value,
      correo: $("empresaCorreo").value,
      telefono: $("empresaTelefono").value,
      direccion: $("empresaDireccion").value,
      comuna: $("empresaComuna").value,
      estado: $("empresaEstado").value,
      logoBase64
    };

    if(!payload.nombre || !payload.rut){
      throw "Nombre y RUT son obligatorios";
    }

    const r = await fetch(API,{
      method:"POST",
      headers:{ "Content-Type":"text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    const d = await r.json();
    if(!d.ok) throw d.msg;

    $("modalEmpresa").style.display = "none";
    await cargarEmpresas();

  }catch(err){
    alert("Error al guardar: " + err);
  }finally{
    hideLoader();
  }
}

/* =================================================
   ELIMINAR (BORRADO REAL)
================================================= */
async function eliminarEmpresa(id){
  if(!confirm("¿Eliminar definitivamente esta empresa?")) return;

  showLoader();

  try{
    const r = await fetch(API,{
      method:"POST",
      headers:{ "Content-Type":"text/plain;charset=utf-8" },
      body: JSON.stringify({
        action:"eliminarEmpresa",
        id: String(id)
      })
    });

    const d = await r.json();
    if(!d.ok) throw d.msg;

    await cargarEmpresas();

  }catch(err){
    alert("Error al eliminar: " + err);
  }finally{
    hideLoader();
  }
}
