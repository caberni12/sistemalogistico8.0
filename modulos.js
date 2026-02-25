const API_MODULOS =
"https://script.google.com/macros/s/AKfycbxGDoBG0-o-Bk0OkcSyYy0bqbti9nO7q96PH8M_RZLhrY_HC4KYayBWHQ-k2-6ALaaP/exec";

let MODULOS=[];
let MODO_MODULO="crear";

async function cargarModulos(){
  const r = await fetch(API_MODULOS+"?action=listarModulos");
  const d = await r.json();
  MODULOS = d.data || [];
  renderModulos();
}

function renderModulos(){
  tablaModulos.innerHTML="";
  modulosCards.innerHTML="";

  MODULOS.forEach(m=>{
    tablaModulos.innerHTML+=`
      <tr>
        <td>${m[1]}</td>
        <td>${m[2]}</td>
        <td>${m[4]}</td>
        <td>${m[5]}</td>
        <td>
          <button class="btn-edit"
            onclick="editarModulo('${m[1]}','${m[2]}','${m[3]}','${m[4]}','${m[5]}')">Editar</button>
          <button class="btn-danger"
            onclick="eliminarModulo('${m[1]}')">Eliminar</button>
        </td>
      </tr>`;
  });
}

async function guardarModulo(){
  const fd=new FormData();
  fd.append("action",MODO_MODULO==="crear"?"crearModulo":"editarModulo");
  fd.append("nombre",m_nombre.value);
  fd.append("archivo",m_archivo.value);
  fd.append("icono",m_icono.value);
  fd.append("permiso",m_permiso.value);
  fd.append("activo",m_activo.value);
  await fetch(API_MODULOS,{method:"POST",body:fd});
  cerrarModulo();
  cargarModulos();
}

async function eliminarModulo(n){
  if(!confirm("Eliminar módulo?"))return;
  const fd=new FormData();
  fd.append("action","eliminarModulo");
  fd.append("nombre",n);
  await fetch(API_MODULOS,{method:"POST",body:fd});
  cargarModulos();
}