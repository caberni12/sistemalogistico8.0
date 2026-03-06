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

const editModal=document.getElementById("editModal");

const btnReload=document.getElementById("btnReload");
const btnGuardar=document.getElementById("btnGuardar");

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
const mStatusEntrega=document.getElementById("mStatusEntrega");
const mSemaforo=document.getElementById("mSemaforo");
const mDiasAtraso=document.getElementById("mDiasAtraso");
const mObservaciones=document.getElementById("mObservaciones");
const mFoto=document.getElementById("mFoto");
const mPDF=document.getElementById("mPDF");
const mPDFTraslado=document.getElementById("mPDFTraslado");

/* ======================================================
   HELPERS
====================================================== */
function setLoading(btn,state){
 if(!btn) return;
 btn.disabled=state;
 btn.classList.toggle("loading",state);
}

function getStatusColor(status){

 const map={
  "PENDIENTE":"#3b82f6",
  "EN RUTA":"#f97316",
  "RECIBIDO":"#fb923c",
  "ENTREGADO":"#22c55e",
  "CANCELADO":"#9ca3af"
 };

 return map[status]||"#ccc";

}

/* ======================================================
   LOAD
====================================================== */
async function load(){

 try{

  setLoading(btnReload,true);

  const r=await fetch(API);

  RAW=await r.json();

  if(!Array.isArray(RAW)) RAW=[];

  applyFilters();

 }catch(e){

  console.error("Error cargando:",e);

 }

 setLoading(btnReload,false);

}

/* ======================================================
   FILTROS
====================================================== */
function applyFilters(){

 const q=(fBuscar.value||"").toLowerCase();

 FILT=RAW.filter(r=>{

  let ok=true;

  if(q){
   const txt=(r.cliente||"").toLowerCase()+(r.pedido||"")+(r.comuna||"").toLowerCase();
   ok=txt.includes(q);
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
   RENDER
====================================================== */
function render(){

 cardsGrid.innerHTML="";

 let cajasTotal=0;

 FILT.forEach(r=>{

  cajasTotal+=Number(r.etiquetas||0);

  const color=getStatusColor(r.status);

  const card=document.createElement("div");
  card.className="card";
  card.style.borderLeftColor=color;

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

<div style="margin-top:10px"><b>Status:</b> ${r.status||""}</div>
<div><b>Responsable:</b> ${r.responsable||""}</div>
<div><b>Entrega:</b> ${r.fechaEntrega||""}</div>

${renderFotos(r.foto)}
${renderPDF(r.pdf)}

<div style="margin-top:10px;display:flex;gap:6px">

<button onclick="openMap('${r.direccion}','${r.comuna}')">📍</button>

<button onclick="openEdit(${r._row})">✏️</button>

<button onclick="delRow(${r._row})">🗑️</button>

</div>

<div class="map-container" id="map${r._row}">
<iframe></iframe>
</div>

`;

  cardsGrid.appendChild(card);

 });

 totalPedidos.textContent=FILT.length;
 totalCajas.textContent=cajasTotal;

}

/* ======================================================
   FOTOS
====================================================== */
function renderFotos(url){

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
   MAPA
====================================================== */
function openMap(dir,comuna){

 const map=`https://www.google.com/maps?q=${encodeURIComponent(dir+", "+comuna+", Chile")}&output=embed`;

 const maps=document.querySelectorAll(".map-container");

 maps.forEach(m=>m.style.display="none");

 const card=event.target.closest(".card");

 const mapBox=card.querySelector(".map-container");

 mapBox.style.display="block";

 mapBox.querySelector("iframe").src=map;

}

/* ======================================================
   MODAL EDIT
====================================================== */
function openEdit(row){

 EDIT=row;

 const data=RAW.find(r=>Number(r._row)===Number(row));

 if(!data) return;

 editModal.style.display="flex";

 mFechaIngreso.value=data.fechaIngreso||"";
 mPedido.value=data.pedido||"";
 mTipoDocumento.value=data.tipoDocumento||"";
 mNumeroDocumento.value=data.numeroDocumento||"";
 mCliente.value=data.cliente||"";
 mDireccion.value=data.direccion||"";
 mComuna.value=data.comuna||"";
 mTransporte.value=data.transporte||"";
 mCajas.value=data.etiquetas||"";
 mResponsable.value=data.responsable||"";
 mFechaEntrega.value=data.fechaEntrega||"";
 mStatus.value=data.status||"";
 mStatusEntrega.value=data.statusEntrega||"";
 mSemaforo.value=data.semaforo||"";
 mDiasAtraso.value=data.diasAtraso||"";
 mObservaciones.value=data.observaciones||"";
 mFoto.value=data.foto||"";
 mPDF.value=data.pdf||"";
 mPDFTraslado.value=data.pdfTraslado||"";

}

function closeEdit(){
 editModal.style.display="none";
}

/* ======================================================
   GUARDAR
====================================================== */
btnGuardar.onclick=async()=>{

 setLoading(btnGuardar,true);

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

 setLoading(btnGuardar,false);

 load();

};

/* ======================================================
   DELETE
====================================================== */
async function delRow(row){

 if(!confirm("Eliminar pedido?")) return;

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