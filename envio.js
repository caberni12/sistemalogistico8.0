/***************************************************
API
***************************************************/
const API="https://script.google.com/macros/s/AKfycbw9Kq7dLqwvRBbgcptn7BQpWz9p-R0Va0awPCW5Noy0uo0gSvO8-LbMfInwvnC9-NPyvA/exec";

/***************************************************
DOM
***************************************************/
const tbody=document.getElementById("tbody");
const mobileList=document.getElementById("mobileList");

const search=document.getElementById("search");
const fStatus=document.getElementById("fStatus");
const fDesde=document.getElementById("fDesde");
const fHasta=document.getElementById("fHasta");

const btnReload=document.getElementById("btnReload");
const btnNuevo=document.getElementById("btnNuevo");
const btnGuardar=document.getElementById("btnGuardar");
const btnCancelar=document.getElementById("btnCancelar");

const btnPDF=document.getElementById("btnPDF");
const btnExcel=document.getElementById("btnExcel");

const modalForm=document.getElementById("modalForm");

const mPedido=document.getElementById("mPedido");
const mTipoDoc=document.getElementById("mTipoDoc");
const mNumeroDoc=document.getElementById("mNumeroDoc");
const mCliente=document.getElementById("mCliente");
const mDireccion=document.getElementById("mDireccion");
const mComuna=document.getElementById("mComuna");
const mTransporte=document.getElementById("mTransporte");
const mCajas=document.getElementById("mCajas");
const mStatus=document.getElementById("mStatus");
const mHoraEntrega=document.getElementById("mHoraEntrega");
const mResponsable=document.getElementById("mResponsable");
const mObs=document.getElementById("mObs");

const mFotos=document.getElementById("mFotos");
const mPdf=document.getElementById("mPdf");

const kpis=document.getElementById("kpis");

const fotoModal=document.getElementById("fotoModal");
const fotoGrande=document.getElementById("fotoGrande");
const btnCerrarFoto=document.getElementById("btnCerrarFoto");
const btnDescargarFoto=document.getElementById("btnDescargarFoto");

const mapModal=document.getElementById("mapModal");
const mapFrame=document.getElementById("mapFrame");
const btnCerrarMapa=document.getElementById("btnCerrarMapa");

/***************************************************
VARIABLES
***************************************************/
let RAW=[];
let FILT=[];
let EDIT=null;
let KPI_CHARTS={};
/***************************************************
PAGINACION
***************************************************/
let PAGE = 1;
let PAGE_SIZE = 20;
let TOTAL_PAGES = 1;

/***************************************************
UTIL
***************************************************/
function setLoading(btn,state){
 if(!btn) return;
 btn.disabled=state;
 btn.classList.toggle("loading",state);
}

function formatDate(d){
 if(!d) return "";
 return new Date(d).toLocaleDateString("es-CL");
}

/***************************************************
BASE64
***************************************************/
function fileToBase64(file){
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>resolve(reader.result);
  reader.onerror=e=>reject(e);
  reader.readAsDataURL(file);
 });
}

/***************************************************
SEMAFORO
***************************************************/
function calcularSemaforo(fechaEntrega){

 if(!fechaEntrega) return "";

 const hoy=new Date();
 const entrega=new Date(fechaEntrega);

 const diff=Math.floor((entrega-hoy)/(1000*60*60*24));

 if(diff>1) return `<span class="sem-verde">OK</span>`;
 if(diff===1) return `<span class="sem-amarillo">HOY</span>`;
 if(diff<0) return `<span class="sem-rojo">ATRASO</span>`;
 return `<span class="sem-azul">PROX</span>`;
}

/***************************************************
ALERTA
***************************************************/
function renderAlerta(alerta){

 if(!alerta) return `<span class="alerta alerta-verde">OK</span>`;

 alerta=alerta.toUpperCase();

 if(alerta.includes("ATRASO")) return `<span class="alerta alerta-rojo">ATRASADO</span>`;
 if(alerta.includes("48")) return `<span class="alerta alerta-amarillo">POR VENCER</span>`;

 return `<span class="alerta alerta-azul">${alerta}</span>`;
}

/***************************************************
PDF ICON
***************************************************/
function renderPDF(url){
 if(!url) return "";
 return `<a href="${url}" target="_blank" class="icon-pdf">📄</a>`;
}

/***************************************************
ESTADO
***************************************************/
function renderEstado(status){

 let color="#fff";

 if(status==="PENDIENTE") color="#facc15";
 if(status==="EN RUTA") color="#ef4444";
 if(status==="ENTREGADO") color="#22c55e";
 if(status==="RECIBIDO") color="#fb923c";
 if(status==="CANCELADO") color="#3b82f6";

 return `<span style="background:#000;color:${color};padding:3px 8px;border-radius:6px">${status||""}</span>`;
}

/***************************************************
KPI CHART
***************************************************/
function crearKPI(id,valor,total,color){

 const canvas=document.getElementById(id);
 if(!canvas) return;

 const ctx=canvas.getContext("2d");

 if(KPI_CHARTS[id]) KPI_CHARTS[id].destroy();

 KPI_CHARTS[id]=new Chart(ctx,{
  type:"doughnut",
  data:{
   datasets:[{
    data:[valor,total-valor],
    backgroundColor:[color,"#e5e7eb"],
    borderWidth:0
   }]
  },
  options:{
   responsive:true,
   maintainAspectRatio:false,
   cutout:"70%",
   plugins:{
    legend:{display:false}
   }
  }
 });

}

/***************************************************
LOAD
***************************************************/
async function load(){

  try{
 
   setLoading(btnReload,true);
 
   const r = await fetch(API);
 
   RAW = await r.json();
 
   if(!Array.isArray(RAW)) RAW=[];
 
   /* ORDENAR DEL MAS NUEVO AL MAS ANTIGUO */
 
   RAW.sort((a,b)=> b._row - a._row);
 
   applyFilters();
 
  }catch(e){
 
   alert("Error cargando datos");
 
  }
 
  setLoading(btnReload,false);
 
 }

/***************************************************
FILTROS
***************************************************/
function applyFilters(){

  const q=(search.value||"").toLowerCase();
 
  FILT=RAW.filter(r=>{
 
   let ok=true;
 
   if(q){
 
    const txt = (
      (r.cliente || "") +
      (r.pedido || "") +
      (r.numeroDocumento || "")
    ).toLowerCase();
 
    ok = txt.includes(q);
 
   }
 
   if(ok && fStatus.value) ok = r.status === fStatus.value;
 
   if(ok && fDesde.value) ok = new Date(r.fechaIngreso) >= new Date(fDesde.value);
 
   if(ok && fHasta.value) ok = new Date(r.fechaIngreso) <= new Date(fHasta.value);
 
   return ok;
 
  });
 
  render();
 
 }
 
 search.oninput=applyFilters;
 fStatus.onchange=applyFilters;
 fDesde.onchange=applyFilters;
 fHasta.onchange=applyFilters;

/***************************************************
RENDER
***************************************************/
function render(){

  TOTAL_PAGES = Math.ceil(FILT.length / PAGE_SIZE);
 
  const start = (PAGE - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
 
  const data = FILT.slice(start,end);
 
  renderTable(data);
  renderCards(data);
  renderKPIs();
 
  renderPagination();
 
 }

/***************************************************
TABLA
***************************************************/
function renderTable(data){

  tbody.innerHTML="";
 
  if(!data.length){
   tbody.innerHTML="<tr><td colspan='19'>Sin datos</td></tr>";
   return;
  }
 
  data.forEach(r=>{
 
  const semaforo=calcularSemaforo(r.fechaEntrega);
 
  const tr=`
 <tr>
 <td>${formatDate(r.fechaIngreso)}</td>
 <td>${r.pedido||""}</td>
 <td>${r.tipoDocumento||""}</td>
 <td>${r.numeroDocumento||""}</td>
 <td>${r.cliente||""}</td>
 
 <td>
 <a href="#" onclick="verMapa(\`${r.direccion||""}\`)">
 ${r.direccion||""}
 </a>
 </td>
 
 <td>${r.comuna||""}</td>
 <td>${r.transporte||""}</td>
 <td>${r.etiquetas||""}</td>
 
 <td>${renderEstado(r.status)}</td>
 
 <td>${r.fechaEntrega||""}</td>
 
 <td>${renderAlerta(r.alerta)}</td>
 
 <td>${r.diasAtraso||""}</td>
 
 <td>${semaforo}</td>
 
 <td>${r.responsable||""}</td>
 
 <td>
 ${r.foto?`<img src="${r.foto}" class="foto-thumb" onclick="verFoto('${r.foto}')">`:""}
 </td>
 
 <td>${renderPDF(r.pdf)}</td>
 
 <td>${renderPDF(r.pdfTraslado)}</td>
 
 <td class="actions">
 <button onclick="openModal(${r._row})">✏️</button>
 <button onclick="deleteRow(${r._row})">🗑️</button>
 </td>
 
 </tr>
 `;
 
  tbody.insertAdjacentHTML("beforeend",tr);
 
  });
 
 }


function renderCards(data){

  mobileList.innerHTML="";

  data.forEach(r=>{

   const semaforo = calcularSemaforo(r.fechaEntrega);

   /* FECHA ENTREGA SOLO SI ESTA ENTREGADO */
   let entregaHTML = "";

   if(r.status === "ENTREGADO" && r.fechaEntrega){
     const fecha = new Date(r.fechaEntrega).toLocaleString("es-CL");
     entregaHTML = `
     <div style="margin-top:6px">
       <span style="color:#22c55e">✅</span>
       <b> Entregado:</b> ${fecha}
     </div>`;
   }

   const card = `
   <div class="card">

    <div class="card-title">
      📦 Pedido #${r.pedido||""}
      ${renderEstado(r.status)}
    </div>

    <div style="margin-top:6px">
      <span style="color:#3b82f6">👤</span>
      <b> Cliente:</b> ${r.cliente||""}
    </div>

    <div style="margin-top:6px;padding:6px 0"
         onclick="verMapa(\`${r.direccion||""}\`)">
      <span style="color:#ef4444">📍</span>
      <b> Dirección:</b> ${r.direccion||""}
    </div>

    <div style="margin-top:6px">
      <span style="color:#14b8a6">🏙️</span>
      <b> Comuna:</b> ${r.comuna||""}
    </div>

    <div style="margin-top:6px">
      <span style="color:#f97316">🚚</span>
      <b> Transporte:</b> ${r.transporte||""}
    </div>

    <div style="margin-top:6px">
      <span style="color:#8b5cf6">📦</span>
      <b> Cajas:</b> ${r.etiquetas||""}
    </div>

    <div style="margin-top:6px">
      <span style="color:#eab308">⏱️</span>
      <b> Semáforo:</b> ${semaforo}
    </div>

    ${entregaHTML}

    <!-- DOCUMENTOS Y FOTO -->
    <div style="
        margin-top:12px;
        display:flex;
        gap:14px;
        align-items:center;
        flex-wrap:wrap;
    ">

      ${r.foto
        ? `<img src="${r.foto}" 
             class="foto-thumb" 
             style="width:60px;height:60px;border-radius:8px"
             onclick="verFoto('${r.foto}')">`
        : ""}

      ${r.pdf
        ? `<a href="${r.pdf}" target="_blank"
            title="PDF Documento"
            style="
            font-size:28px;
            text-decoration:none;
            background:#fee2e2;
            padding:8px 10px;
            border-radius:8px;
            ">
            📄
           </a>`
        : ""}

      ${r.pdfTraslado
        ? `<a href="${r.pdfTraslado}" target="_blank"
            title="PDF Traslado"
            style="
            font-size:28px;
            text-decoration:none;
            background:#fee2e2;
            padding:8px 10px;
            border-radius:8px;
            ">
            📄
           </a>`
        : ""}

    </div>

    <!-- ACCIONES -->
    <div style="
        margin-top:14px;
        display:flex;
        gap:8px;
        flex-wrap:wrap;
    ">

      <button onclick="openModal(${r._row})"
        style="padding:6px 10px">✏️ Editar</button>

      <button onclick="deleteRow(${r._row})"
        style="padding:6px 10px">🗑️ Eliminar</button>

    </div>

   </div>
   `;

   mobileList.insertAdjacentHTML("beforeend",card);

  });

}

function renderKPIs(){

 const total=RAW.length;
 const pendientes=RAW.filter(x=>x.status==="PENDIENTE").length;
 const ruta=RAW.filter(x=>x.status==="EN RUTA").length;
 const entregado=RAW.filter(x=>x.status==="ENTREGADO").length;

 kpis.innerHTML=`

<div class="kpi"><div style="height:80px"><canvas id="k1"></canvas></div><b>${total}</b><div>Total</div></div>
<div class="kpi"><div style="height:80px"><canvas id="k2"></canvas></div><b>${pendientes}</b><div>Pendiente</div></div>
<div class="kpi"><div style="height:80px"><canvas id="k3"></canvas></div><b>${ruta}</b><div>En Ruta</div></div>
<div class="kpi"><div style="height:80px"><canvas id="k4"></canvas></div><b>${entregado}</b><div>Entregado</div></div>

`;

 crearKPI("k1",total,total,"#14b8a6");
 crearKPI("k2",pendientes,total,"#facc15");
 crearKPI("k3",ruta,total,"#ef4444");
 crearKPI("k4",entregado,total,"#22c55e");

}

/***************************************************
FOTO
***************************************************/
function verFoto(src){
 fotoGrande.src=src;
 btnDescargarFoto.onclick=()=>window.open(src);
 fotoModal.style.display="flex";
}

btnCerrarFoto.onclick=()=>fotoModal.style.display="none";

/***************************************************
MAPA
***************************************************/
function verMapa(dir){
 mapFrame.src="https://maps.google.com/maps?q="+encodeURIComponent(dir)+"&output=embed";
 mapModal.style.display="flex";
}

btnCerrarMapa.onclick=()=>mapModal.style.display="none";

/***************************************************
MODAL
***************************************************/
function openModal(row){

  EDIT=row;
 
  const data=RAW.find(r=>Number(r._row)===Number(row));
  if(!data) return;
 
  mPedido.value=data.pedido||"";
  mTipoDoc.value=data.tipoDocumento||"";
  mNumeroDoc.value=data.numeroDocumento||"";
  mCliente.value=data.cliente||"";
  mDireccion.value=data.direccion||"";
  mComuna.value=data.comuna||"";
  mTransporte.value=data.transporte||"";
  mCajas.value=data.etiquetas||"";
  mStatus.value=data.status||"PENDIENTE";
  mResponsable.value=data.responsable||"";
  mObs.value=data.observaciones||"";
 
  if(data.fechaEntrega){
   mHoraEntrega.value=new Date(data.fechaEntrega).toISOString().slice(0,16);
  }
 
  /* ===== FOTO EXISTENTE ===== */
 
  const fotoPreview=document.getElementById("fotoPreview");
 
  if(fotoPreview){
 
   if(data.foto){
    fotoPreview.innerHTML=`
    <div class="preview-box">
    <a href="${data.foto}" target="_blank">
    <img src="${data.foto}">
    </a>
    <div class="preview-label">Imagen actual</div>
    </div>
    `;
   }else{
    fotoPreview.innerHTML="";
   }
 
  }
 
  /* ===== PDF EXISTENTE ===== */
 
  const pdfPreview=document.getElementById("pdfPreview");
 
  if(pdfPreview){
 
   if(data.pdf){
    pdfPreview.innerHTML=`
    <div class="preview-box">
    <a href="${data.pdf}" target="_blank">
    📄 Ver documento actual
    </a>
    </div>
    `;
   }else{
    pdfPreview.innerHTML="";
   }
 
  }
 
  modalForm.style.display="flex";
 
 }

/***************************************************
NUEVO
***************************************************/
btnNuevo.onclick = () => {

  EDIT = null;
 
  /* LIMPIAR TODOS LOS CAMPOS */
 
  modalForm.querySelectorAll("input,select,textarea").forEach(el => {
   el.value = "";
  });
 
  /* LIMPIAR INPUT FILE */
 
  if (mFotos) mFotos.value = "";
  if (mPdf) mPdf.value = "";
 
  /* LIMPIAR VISTAS PREVIAS */
 
  const fotoPreview = document.getElementById("fotoPreview");
  const pdfPreview = document.getElementById("pdfPreview");
 
  if (fotoPreview) fotoPreview.innerHTML = "";
  if (pdfPreview) pdfPreview.innerHTML = "";
 
  /* VALOR POR DEFECTO */
 
  if (mStatus) mStatus.value = "PENDIENTE";
 
  /* ABRIR MODAL */
 
  modalForm.style.display = "flex";
 
 };

/***************************************************
CANCELAR
***************************************************/
btnCancelar.onclick=()=>modalForm.style.display="none";

/***************************************************
GUARDAR
***************************************************/
btnGuardar.onclick=async()=>{

 try{

 setLoading(btnGuardar,true);

 let foto="";
 let pdf="";

 if(mFotos && mFotos.files.length){
  foto=await fileToBase64(mFotos.files[0]);
 }

 if(mPdf && mPdf.files.length){
  pdf=await fileToBase64(mPdf.files[0]);
 }

 const data={
  action:EDIT?"update":"add",
  row:EDIT,
  "TIPO DOCUMENTO":mTipoDoc.value,
  "NUMERO DOCUMENTO":mNumeroDoc.value,
  "CLIENTE":mCliente.value,
  "DIRECCION":mDireccion.value,
  "COMUNA":mComuna.value,
  "TRANSPORTE":mTransporte.value,
  "ETIQUETAS":mCajas.value,
  "STATUS":mStatus.value,
  "FECHA ENTREGA":mHoraEntrega.value,
  "RESPONSABLE":mResponsable.value,
  "OBSERVACIONES":mObs.value,
  FOTO:foto,
  PDF:pdf
 };

 const params=new URLSearchParams();
 params.append("data",JSON.stringify(data));

 await fetch(API,{
  method:"POST",
  body:params
 });

 modalForm.style.display="none";

 load();

 }catch(e){

  alert("Error guardando");

 }

 setLoading(btnGuardar,false);

};

/***************************************************
DELETE
***************************************************/
async function deleteRow(row){

 if(!confirm("Eliminar registro?")) return;

 const params=new URLSearchParams();
 params.append("data",JSON.stringify({
  action:"delete",
  row:row
 }));

 await fetch(API,{
  method:"POST",
  body:params
 });

 load();
}


/* ======================================================
   EXPORTES
====================================================== */

btnPDF.onclick = ()=> exportPDF(btnPDF);
btnExcel.onclick = ()=> exportExcel(btnExcel);


/* ======================================================
   EXPORT PDF CON ENCABEZADO
====================================================== */
function exportPDF(btn){

  setLoading(btn,true);

  setTimeout(()=>{

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation:'landscape' });

    const totalPedidos = FILT.length;
    const totalBultos = FILT.reduce(
      (sum,r)=> sum + Number(r.etiquetas || 0), 0
    );

    /* -------- ENCABEZADO -------- */

    doc.setFontSize(18);
    doc.text("REPORTE LOGÍSTICO DE PEDIDOS",14,15);

    doc.setFontSize(10);
    doc.text("Sistema Logístico",14,22);
    doc.text("Fecha de generación: " + new Date().toLocaleString(),14,28);

    doc.setFontSize(11);
    doc.text(`Total Pedidos: ${totalPedidos}`,250,20);
    doc.text(`Total Cajas: ${totalBultos}`,250,26);

    /* -------- TABLA -------- */

    doc.autoTable({
      startY:35,

      head:[[

        'Fecha',
        'Pedido',
        'Cliente',
        'Dirección',
        'Comuna',
        'Transporte',
        'Cajas',
        'Responsable',
        'Hora Entrega',
        'Estado',
        'Observaciones'

      ]],

      body: FILT.map(r=>[

        r.fechaIngreso || '',
        r.pedido || '',
        r.cliente || '',
        r.direccion || '',
        r.comuna || '',
        r.transporte || '',
        r.etiquetas || 0,
        r.responsable || '',
        r.horaEntrega || '',
        r.status || '',
        r.observaciones || ''

      ]),

      foot:[[

        '',
        '',
        '',
        '',
        '',
        'TOTALES →',
        `CAJAS: ${totalBultos}`,
        '',
        '',
        `PEDIDOS: ${totalPedidos}`,
        ''

      ]],

      styles:{
        fontSize:9
      },

      headStyles:{
        fillColor:[20,184,166]
      }

    });

    doc.save("Reporte_Pedidos_Logisticos.pdf");

    setLoading(btn,false);

  },300);
}


/* ======================================================
   EXPORT EXCEL CON ENCABEZADO
====================================================== */

function exportExcel(btn){

  setLoading(btn,true);

  setTimeout(()=>{

    const totalPedidos = FILT.length;
    const totalBultos = FILT.reduce(
      (sum,r)=> sum + Number(r.etiquetas || 0),0
    );

    const data = FILT.map(r=>({

      "Fecha": r.fechaIngreso || '',
      "Pedido": r.pedido || '',
      "Cliente": r.cliente || '',
      "Dirección": r.direccion || '',
      "Comuna": r.comuna || '',
      "Transporte": r.transporte || '',
      "Cajas": r.etiquetas || 0,
      "Responsable": r.responsable || '',
      "Hora Entrega": r.horaEntrega || '',
      "Estado": r.status || '',
      "Observaciones": r.observaciones || ''

    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Pedidos");

    /* -------- HOJA RESUMEN -------- */

    const resumen = [

      ["REPORTE LOGÍSTICO"],
      [""],
      ["Fecha generación", new Date().toLocaleString()],
      ["Total Pedidos", totalPedidos],
      ["Total Cajas", totalBultos]

    ];

    const wsResumen = XLSX.utils.aoa_to_sheet(resumen);

    XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

    XLSX.writeFile(wb,"Reporte_Pedidos_Logisticos.xlsx");

    setLoading(btn,false);

  },300);

}


function renderPagination(){

  const pag = document.getElementById("pagination");
 
  if(!pag) return;
 
  pag.innerHTML=`
 
 <button onclick="prevPage()">◀</button>
 
 <span style="padding:0 10px">
 Página ${PAGE} de ${TOTAL_PAGES}
 </span>
 
 <button onclick="nextPage()">▶</button>
 
 `;
 
 }
 
 function nextPage(){
 
  if(PAGE < TOTAL_PAGES){
   PAGE++;
   render();
  }
 
 }
 
 function prevPage(){
 
  if(PAGE > 1){
   PAGE--;
   render();
  }
 
 }


 /* ===============================
   OCULTAR / MOSTRAR DASHBOARD
================================ */

const btnTogglePanel = document.getElementById("btnTogglePanel");
const panelDashboard = document.getElementById("panelDashboard");

if(btnTogglePanel && panelDashboard){

btnTogglePanel.onclick = () => {

const hidden = panelDashboard.classList.toggle("panel-hidden");

btnTogglePanel.textContent = hidden
? "📊 Mostrar Panel"
: "📊 Ocultar Panel";

};

}

/***************************************************
INIT
***************************************************/
btnReload.onclick=load;

load();