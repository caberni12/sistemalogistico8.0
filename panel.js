
/* ================= CONFIG ================= */
const API = "https://script.google.com/macros/s/AKfycbwOGCL_h6NoGkbr3hQyB9pGPyfUKaM-h3jAQkuQay1kru_ZhAE3IbsfGIE_CkbFuDnd/exec";

let usuarios = [];
let modo = "crear";

/* ================= DOM ================= */
const btnLoad        = document.getElementById("btnLoad");
const tablaUsuarios  = document.getElementById("tablaUsuarios");
const mobileList     = document.getElementById("mobileList");
const busqueda       = document.getElementById("busqueda");

const modalUsuario   = document.getElementById("modalUsuario");
const tituloUsuario  = document.getElementById("tituloUsuario");

const u_user   = document.getElementById("u_user");
const u_pass   = document.getElementById("u_pass");
const u_nombre = document.getElementById("u_nombre");
const u_rol    = document.getElementById("u_rol");
const u_activo = document.getElementById("u_activo");
const btnGuardar = document.getElementById("btnGuardar");

/* ================= SESIÓN ================= */
(async()=>{
  const token = localStorage.getItem("token");
  const ip = localStorage.getItem("ip");
  if(!token) location.href="login.html";

  const r = await fetch(API+"?action=verify&token="+token+"&ip="+ip);
  const d = await r.json();
  if(!d.valid || d.rol!=="ADMIN"){
    localStorage.clear();
    location.href="index.html";
  }
})();

/* ================= CARGAR ================= */
async function cargarUsuarios(){
  btnLoad.classList.add("loading");
  btnLoad.innerHTML = `<div class="loader"></div> Cargando`;

  const r = await fetch(API+"?action=listarUsuarios");
  const d = await r.json();
  usuarios = d.data || [];
  render(usuarios);

  btnLoad.classList.remove("loading");
  btnLoad.innerHTML = "Cargar usuarios";
}

/* ================= RENDER ================= */
function render(data){
  tablaUsuarios.innerHTML = "";
  mobileList.innerHTML = "";

  if(!data.length){
    tablaUsuarios.innerHTML = `<tr><td colspan="6">Sin usuarios</td></tr>`;
    return;
  }

  data.forEach(u=>{
    const permisos = u[6] || "";

    tablaUsuarios.innerHTML += `
      <tr>
        <td>${u[1]}</td>
        <td>${u[2]}</td>
        <td>${u[3]}</td>
        <td>${u[4]}</td>
        <td>${u[5]}</td>
        <td>
          <button class="btn-edit"
            onclick="editar('${u[1]}','${u[2]}','${u[3]}','${u[4]}','${u[5]}','${permisos}')">
            Editar
          </button>
          <button class="btn-danger"
            onclick="eliminarUsuario('${u[1]}')">
            Eliminar
          </button>
        </td>
      </tr>`;

    mobileList.innerHTML += `
      <div class="mobile-card">
        <h4>${u[3]}</h4>
        <p><b>Usuario:</b> ${u[1]}</p>
        <p><b>Rol:</b> ${u[4]}</p>
        <div class="mobile-actions">
          <button class="btn-edit"
            onclick="editar('${u[1]}','${u[2]}','${u[3]}','${u[4]}','${u[5]}','${permisos}')">
            Editar
          </button>
          <button class="btn-danger"
            onclick="eliminarUsuario('${u[1]}')">
            Eliminar
          </button>
        </div>
      </div>`;
  });
}

/* ================= FILTRO ================= */
function filtrar(){
  const q = busqueda.value.toLowerCase();
  render(usuarios.filter(u =>
    u[1].toLowerCase().includes(q) ||
    u[3].toLowerCase().includes(q) ||
    u[4].toLowerCase().includes(q)
  ));
}

/* ================= USUARIOS ================= */
function abrirCrear(){
  modo = "crear";
  tituloUsuario.innerText = "Crear Usuario";
  u_user.disabled = false;
  limpiar();
  modalUsuario.style.display = "flex";
}

function editar(u,p,n,r,a,per){
  modo = "editar";
  tituloUsuario.innerText = "Editar Usuario";

  u_user.value = u;
  u_user.disabled = true;
  u_pass.value = p;
  u_nombre.value = n;
  u_rol.value = r;
  u_activo.value = a;

  document.querySelectorAll(".permissions input")
    .forEach(c => c.checked = per.includes(c.value));

  modalUsuario.style.display = "flex";
}

function cerrarUsuario(){
  modalUsuario.style.display = "none";
}

function limpiar(){
  u_user.value = "";
  u_pass.value = "";
  u_nombre.value = "";
  u_rol.value = "ADMIN";
  u_activo.value = "SI";
  document.querySelectorAll(".permissions input")
    .forEach(c => c.checked = false);
}

/* ================= GUARDAR (FormData) ================= */
async function guardarUsuario(){

  const permisos = [...document.querySelectorAll(".permissions input:checked")]
    .map(c => c.value).join(",");

  const fd = new FormData();
  fd.append("action", modo==="crear" ? "crearUsuario" : "editarUsuario");
  fd.append("username", u_user.value);
  fd.append("password", u_pass.value);
  fd.append("nombre", u_nombre.value);
  fd.append("rol", u_rol.value);
  fd.append("activo", u_activo.value);
  fd.append("permisos", permisos);

  await fetch(API, { method:"POST", body:fd });

  cerrarUsuario();
  cargarUsuarios();
}

/* ================= ELIMINAR ================= */
async function eliminarUsuario(u){
  if(!confirm("Eliminar "+u+"?")) return;

  const fd = new FormData();
  fd.append("action","eliminarUsuario");
  fd.append("username",u);

  await fetch(API, { method:"POST", body:fd });
  cargarUsuarios();
}
