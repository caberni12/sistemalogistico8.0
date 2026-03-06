/* ======================================================
   CONFIG
====================================================== */
const API="https://script.google.com/macros/s/AKfycbxWQTDZK4Cc3abLR4ec2hoL1YGTquPmH1ucXm6WAIXuWJX3X9HJD1FiJpAaUtpm0pwFtQ/exec";

let RAW=[];
let FILT=[];
let EDIT=null;

/* ======================================================
   DOM
====================================================== */

const cardsGrid=document.getElementById("cardsGrid");

const fBuscar=document.getElementById("fBuscar");
const fStatus=document.getElementById("fStatus");
const fDesde=document.getElementById("fDesde");
const fHasta=document.getElementById("fHasta");

const totalPedidos=document.getElementById("totalPedidos");
const totalCajas=document.getElementById("totalCajas");

const btnReload=document.getElementById("btnReload");
const btnGuardar=document.getElementById("btnGuardar");

const editModal=document.getElementById("editModal");

/* FORM */

const mFechaIngreso=document.getElementById("mFechaIngreso");
const mPedido=document.getElementById("mPedido");
const mTipoDocumento=document.getElementById("mTipoDocumento");
const mNumeroDocumento=document.getElementById("mNumeroDocumento");
const mCliente=document.getElementById("mCliente");
const mDireccion=document.getElementById("mDireccion");
const mComuna=document.getElementById("mComuna");
const mTransporte=document.getElementById("mTransporte");
const mCajas=document.getElementById("mCajas");
const mResponsable=document.getElementById("mResponsable");
const mFechaEntrega=document.getElementById("mFechaEntrega");
const mStatus=document.getElementById("mStatus");
const mObservaciones=document.getElementById("mObservaciones");

/* ======================================================
   LOAD
====================================================== */

async function load(){

 try{

  const r=await fetch(API);

  RAW=await r.json();

  if(!Array.isArray(RAW)) RAW=[];

  applyFilters();

 }catch(e){

  console.error("Error cargando datos",e);

 }

}

/* ======================================================
   FILTROS
====================================================== */

function applyFilters(){

 const q=(fBuscar.value||"").toLowerCase();

 FILT=RAW.filter(r=>{

  let ok=true;

  if(q){

   const txt=(r.pedido||"")+
             (r.cliente||"")+
             (r.comuna||"");

   ok=txt.toLowerCase().includes(q);

  }

  if(ok && fStatus.value){

   ok=r.status===fStatus.value;

  }

  if(ok && fDesde.value){

   ok=new Date(r.fechaIngreso)>=new Date(fDesde.value);

  }

  if(ok && fHasta.value){

   ok=new Date(r.fechaIngreso)<=new Date(fHasta.value);

  }

  return ok;

 });

 render();

}

fBuscar.oninput=applyFilters;
fStatus.onchange=applyFilters;
fDesde.onchange=applyFilters;
fHasta.onchange=applyFilters;

/* ======================================================
   RENDER TARJETAS
====================================================== */

function render(){

 cardsGrid.innerHTML="";

 let cajas=0;

 FILT.forEach(r=>{

  cajas+=Number(r.etiquetas||0);

  const card=document.createElement("div");
  card.className="card";

  card.innerHTML=`

<div class="pedido-numero">${r.pedido||""}</div>

<div class="cliente-destacado">${r.cliente||""}</div>

<div><b>Dirección:</b> ${r.direccion||""}</div>
<div><b>Comuna:</b> ${r.comuna||""}</div>
<div><b>Transporte:</b> ${r.transporte||""}</div>

<div class="cajas-box">
CAJAS
<span>${r.etiquetas||0}</span>
</div>

<div style="margin-top:10px">
<b>Status:</b> ${r.status||""}
</div>

<div><b>Responsable:</b> ${r.responsable||""}</div>

<div><b>Entrega:</b> ${r.fechaEntrega||""}</div>

${renderFoto(r.foto)}
${renderPDF(r.pdf)}

<div style="margin-top:12px;display:flex;gap:8px">

<button onclick="openEdit(${r._row})">✏️ Editar</button>

<button onclick="deleteRow(${r._row})" style="background:#dc2626">🗑️</button>

</div>

`;

  cardsGrid.appendChild(card);

 });

 totalPedidos.textContent=FILT.length;
 totalCajas.textContent=cajas;

}

/* ======================================================
   FOTO
====================================================== */

function renderFoto(url){

 if(!url) return "";

 return `
 <div class="photo-wrap">
   <img src="${url}" onclick="window.open('${url}')">
 </div>
 `;

}

/* ======================================================
   PDF
====================================================== */

function renderPDF(url){

 if(!url) return "";

 return `
 <div class="pdf-wrap">
   <a href="${url}" target="_blank">PDF</a>
 </div>
 `;

}

/* ======================================================
   EDITAR
====================================================== */

function openEdit(row){

 EDIT=row;

 const r=RAW.find(x=>Number(x._row)===Number(row));

 if(!r) return;

 editModal.style.display="flex";

 mFechaIngreso.value=r.fechaIngreso||"";
 mPedido.value=r.pedido||"";
 mTipoDocumento.value=r.tipoDocumento||"";
 mNumeroDocumento.value=r.numeroDocumento||"";
 mCliente.value=r.cliente||"";
 mDireccion.value=r.direccion||"";
 mComuna.value=r.comuna||"";
 mTransporte.value=r.transporte||"";
 mCajas.value=r.etiquetas||"";
 mResponsable.value=r.responsable||"";
 mFechaEntrega.value=r.fechaEntrega||"";
 mStatus.value=r.status||"";
 mObservaciones.value=r.observaciones||"";

}

function closeEdit(){

 editModal.style.display="none";

}

/* ======================================================
   GUARDAR
====================================================== */

btnGuardar.onclick=async()=>{

 const data={

  action:"update",

  row:EDIT,

  "TIPO DOCUMENTO":mTipoDocumento.value,
  "NUMERO DOCUMENTO":mNumeroDocumento.value,
  "CLIENTE":mCliente.value,
  "DIRECCION":mDireccion.value,
  "COMUNA":mComuna.value,
  "TRANSPORTE":mTransporte.value,
  "ETIQUETAS":mCajas.value,
  "STATUS":mStatus.value,
  "FECHA ENTREGA":mFechaEntrega.value,
  "RESPONSABLE":mResponsable.value,
  "OBSERVACIONES":mObservaciones.value

 };

 await fetch(API,{
  method:"POST",
  body:JSON.stringify(data)
 });

 editModal.style.display="none";

 load();

};

/* ======================================================
   DELETE
====================================================== */

async function deleteRow(row){

 if(!confirm("Eliminar registro?")) return;

 await fetch(API,{
  method:"POST",
  body:JSON.stringify({
   action:"delete",
   row:row
  })
 });

 load();

}

/* ======================================================
   RELOAD
====================================================== */

btnReload.onclick=load;

/* ======================================================
   INIT
====================================================== */

load();