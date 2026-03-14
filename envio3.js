const API="https://script.google.com/macros/s/AKfycbxffsp67EDQ7Hxph6RYEdjlCfiYsVfk3UstvE4V2_9hAH6l7e5aJEV4tdQ0rkwPis0tfw/exec";

let RAW=[];
let FILT=[];
let visibleCount=0;
let EDIT_ROW=null;
let TRASLADO_ROW=null;

const CHUNK=20;

/* ELEMENTOS */

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

/* CAMPOS MODAL */

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

const boxFoto=document.getElementById("boxFoto");
const boxPDF=document.getElementById("boxPDF");
const boxTraslado=document.getElementById("boxTraslado");

const previewFoto=document.getElementById("previewFoto");
const previewPDF=document.getElementById("previewPDF");
const previewTraslado=document.getElementById("previewTraslado");

/* LOADER */

function setLoading(btn,state){
btn.disabled=state;
btn.classList.toggle("loading",state);
}

/* FECHA */

function parseFechaSoloDia(str){
if(!str) return null;
const p=str.split("-");
if(p.length!==3) return null;
return new Date(p[0],p[1]-1,p[2]);
}

/* ALERTAS */




function calcularAlertas(r){

if(!r.fechaEntrega) return r;

const ahora=new Date();
const entrega=new Date(r.fechaEntrega);

const diffHoras=(entrega-ahora)/(1000*60*60);
const diffDias=Math.floor((ahora-entrega)/(1000*60*60*24));

if(ahora>entrega && r.status!=="ENTREGADO"){
r.alerta="PEDIDO ATRASADO";
r.semaforo="ROJO";
r.diasAtraso=Math.max(diffDias,1);
r.statusEntrega="ATRASADO";
}

else if(diffHoras<=48 && r.status!=="ENTREGADO"){
r.alerta="ENTREGA EN MENOS DE 48H";
r.semaforo="AMARILLO";
r.diasAtraso=0;
r.statusEntrega="POR VENCER";
}

else{
r.alerta="";
r.semaforo="VERDE";
r.diasAtraso=0;
r.statusEntrega="EN TIEMPO";
}

return r;
}
/* LOAD */


async function load(){

    try{
    
    setLoading(btnReload,true);
    
    const r = await fetch(API);
    const data = await r.json();
    
    RAW = data.map(row=>{
    
    let obj={
    
    _row:row._row,
    fechaIngreso:row.fechaIngreso,
    pedido:row.pedido,
    tipoDocumento:row.tipoDocumento,
    numeroDocumento:row.numeroDocumento,
    cliente:row.cliente,
    direccion:row.direccion,
    comuna:row.comuna,
    transporte:row.transporte,
    etiquetas:row.etiquetas,
    observaciones:row.observaciones,
    status:String(row.status||"").trim().toUpperCase(),
    fechaEntrega:row.fechaEntrega,
    alerta:row.alerta,
    statusEntrega:row.statusEntrega,
    diasAtraso:row.diasAtraso,
    semaforo:row.semaforo,
    responsable:row.responsable,
    foto:row.foto,
    pdf:row.pdf,
    pdfTraslado:row.pdfTraslado,
    solicitudTraslado:row.solicitudTraslado,
    
    _fechaObj:parseFechaSoloDia(row.fechaIngreso)
    
    };
    
    return calcularAlertas(obj);
    
    });
    
    /* ORDENAR DEL MAS NUEVO AL MAS ANTIGUO */
    
    RAW.sort((a,b)=> b._row - a._row);
    
    applyFilter();
    
    }catch(e){
    
    console.error("ERROR API",e);
    
    }
    
    setLoading(btnReload,false);
    
    }
/* FILTROS */

function applyFilter(){

    const texto = fBuscar.value.toLowerCase().trim();
    const status = fStatus.value;
    
    const d1 = fDesde.value ? new Date(fDesde.value) : null;
    const d2 = fHasta.value ? new Date(fHasta.value) : null;
    
    FILT = RAW.filter(r=>{
    
    const combo=(r.pedido+" "+r.cliente+" "+r.comuna+" "+r.responsable).toLowerCase();
    
    if(texto && !combo.includes(texto)) return false;
    
    /* FILTRO ATRASO */
    
    if(status==="ATRASO" && r.semaforo!=="ROJO") return false;
    
    /* FILTRO NORMAL STATUS */
    
    if(status && status!=="ATRASO" && r.status!==status) return false;
    
    if(d1 || d2){
    
    const fr=r._fechaObj;
    
    if(!fr) return false;
    
    if(d1 && fr < d1) return false;
    
    if(d2 && fr > d2) return false;
    
    }
    
    return true;
    
    });
    
    /* ORDENAR DEL MAS NUEVO AL MAS ANTIGUO */
    
    FILT.sort((a,b)=> b._row - a._row);
    
    totalPedidos.textContent = FILT.length;
    
    totalCajas.textContent = FILT.reduce((s,r)=>s+Number(r.etiquetas||0),0);
    
    visibleCount = 0;
    cardsGrid.innerHTML = "";
    
    renderMore();
    
    }

/* STATUS COLOR */

function statusClass(s){

if(s==="PENDIENTE") return "estado estado-pendiente";
if(s==="EN RUTA") return "estado estado-ruta";
if(s==="RECIBIDO") return "estado estado-recibido";
if(s==="ENTREGADO") return "estado estado-entregado";
if(s==="CANCELADO") return "estado estado-cancelado";

return "estado";

}

/* TARJETAS */

function renderMore(){

const fragment=document.createDocumentFragment();

const slice=FILT.slice(visibleCount,visibleCount+CHUNK);

slice.forEach(r=>{

let clase="card";

if(r.semaforo==="ROJO") clase+=" card-atraso";
if(r.semaforo==="AMARILLO") clase+=" card-alerta";

const mapId="map_"+r._row;

const card=document.createElement("div");
card.className=clase;

card.innerHTML=`

<div class="card-header">

<div class="pedido-numero">#${r.pedido}</div>

<div class="${statusClass(r.status)}">${r.status}</div>

</div>

<div class="section">
<div class="section-title">Cliente</div>
<div class="section-value">${r.cliente}</div>
</div>

<div class="section">
<div class="section-title">Dirección</div>
<div class="section-value">${r.direccion} (${r.comuna})</div>
</div>

<div class="section">
<div class="section-title">Responsable</div>
<div class="section-value">${r.responsable||""}</div>
</div>

<div class="cajas-box">
CAJAS
<span>${r.etiquetas||0}</span>
</div>

${r.solicitudTraslado ? `
<div class="traslado-ref">
📦 Traslado: <b>${r.solicitudTraslado}</b>
</div>
` : ""}

${r.alerta?`
    <div style="color:#dc2626;font-weight:800">
    ${r.alerta}
    
    ${r.diasAtraso>0 ? `<br>Días atraso: ${r.diasAtraso}` : ""}
    
    </div>
    `:""}

<div class="card-actions">
${r.pdfTraslado ? 
    `<a href="${r.pdfTraslado}" target="_blank" class="btn-pdf">📄 Documento Generado</a>` : ""}
<button onclick="toggleMap('${mapId}',this)">🗺 Mapa</button>

${r.status==="ENTREGADO" && !r.solicitudTraslado ? 
`<button onclick="openTraslado(${r._row})">📦 Traslado</button>` : ""}



<button onclick="openEdit(${r._row})">✏️ Editar</button>

</div>

<div class="map-container" id="${mapId}">
<iframe src="https://maps.google.com/maps?q=${encodeURIComponent(r.direccion+" "+r.comuna)}&z=15&output=embed"></iframe>
</div>

`;

fragment.appendChild(card);

});

cardsGrid.appendChild(fragment);

visibleCount+=CHUNK;

}

/* SCROLL INFINITO */

window.addEventListener("scroll",()=>{
if(window.innerHeight+window.scrollY>=document.body.offsetHeight-400){
renderMore();
}
});

/* EDITAR */



function openEdit(row){

    const r=RAW.find(x=>x._row==row);
    if(!r) return;
    
    if(r.status==="ENTREGADO" || r.status==="CANCELADO"){
    alert("Este pedido está cerrado y no puede ser editado.");
    return;
    }
    
    EDIT_ROW=row;
    
    /* CARGAR DATOS */
    
    mFechaIngreso.value=r.fechaIngreso||"";
    mPedido.value=r.pedido||"";
    mTipoDocumento.value=r.tipoDocumento||"";
    mNumeroDocumento.value=r.numeroDocumento||"";
    mCliente.value=r.cliente||"";
    mDireccion.value=r.direccion||"";
    mComuna.value=r.comuna||"";
    mTransporte.value=r.transporte||"";
    mCajas.value=r.etiquetas||1;
    mResponsable.value=r.responsable||"";
    mFechaEntrega.value=r.fechaEntrega||"";
    mStatus.value=r.status||"";
    
    mStatusEntrega.value=r.statusEntrega||"";
    mSemaforo.value=r.semaforo||"";
    mDiasAtraso.value=r.diasAtraso||0;
    
    mObservaciones.value=r.observaciones||"";
    
    mFoto.value=r.foto||"";
    mPDF.value=r.pdf||"";
    mPDFTraslado.value=r.pdfTraslado||"";
    
    /* MOSTRAR DOCUMENTOS */
    
    boxFoto.classList.toggle("hidden",!r.foto);
    boxPDF.classList.toggle("hidden",!r.pdf);
    boxTraslado.classList.toggle("hidden",!r.pdfTraslado);
    
    /* BLOQUEAR CAMPOS */
    
    mFechaIngreso.disabled=true;
    mPedido.disabled=true;
    mTipoDocumento.disabled=true;
    mNumeroDocumento.disabled=true;
    mCliente.disabled=true;
    mDireccion.disabled=true;
    mComuna.disabled=true;
    mTransporte.disabled=true;
    mCajas.disabled=true;
    mResponsable.disabled=true;
    
    mStatusEntrega.disabled=true;
    mSemaforo.disabled=true;
    mDiasAtraso.disabled=true;
    
    /* CAMPOS EDITABLES */
    
    mObservaciones.disabled=false;
    mStatus.disabled=false;
    mFechaEntrega.disabled=false;
    
    /* ABRIR MODAL */
    
    editModal.style.display="flex";
    
    }

/* PREVIEW */

previewFoto.onclick=()=>{ if(mFoto.value) window.open(mFoto.value); };
previewPDF.onclick=()=>{ if(mPDF.value) window.open(mPDF.value); };
previewTraslado.onclick=()=>{ if(mPDFTraslado.value) window.open(mPDFTraslado.value); };

/* GUARDAR */

async function guardar(){

    setLoading(btnGuardar,true);
    
    /* OBTENER REGISTRO ORIGINAL */
    
    const r = RAW.find(x=>x._row==EDIT_ROW);
    
    await fetch(API,{
    method:"POST",
    body:JSON.stringify({
    
    action:"update",
    row:EDIT_ROW,
    
    FECHAINGRESO:r.fechaIngreso,
    PEDIDO:r.pedido,
    TIPODOCUMENTO:r.tipoDocumento,
    NUMERODOCUMENTO:r.numeroDocumento,
    CLIENTE:r.cliente,
    DIRECCION:r.direccion,
    COMUNA:r.comuna,
    TRANSPORTE:r.transporte,
    ETIQUETAS:r.etiquetas,
    RESPONSABLE:r.responsable,
    
    STATUS:mStatus.value,
    OBSERVACIONES:mObservaciones.value,
    "FECHA ENTREGA":mFechaEntrega.value
    
    })
    });
    
    closeEdit();
    await load();
    
    setLoading(btnGuardar,false);
    
    }

/* MAPA */

function toggleMap(id,btn){

const el=document.getElementById(id);

if(!el.style.display||el.style.display==="none"){
el.style.display="block";
btn.textContent="➖ Ocultar mapa";
}else{
el.style.display="none";
btn.textContent="🗺 Mostrar mapa";
}

}

/* TRASLADO */

/* ================= TRASLADO ================= */

    
    function addProducto(){

        const tabla = document.getElementById("detalleTable");
        if(!tabla) return;
        
        const prod = document.getElementById("pProducto").value.trim();
        const det = document.getElementById("pDetalle").value.trim();
        const cant = document.getElementById("pCantidad").value || 1;
        
        if(prod === ""){
        alert("Favor Informe los Productos a Trasladar y Genere Numero de Traslado");
        return;
        }
        
        const fila = document.createElement("tr");
        
        fila.innerHTML = `
        <td>
        <input class="prod" value="${prod}" placeholder="Producto">
        </td>
        
        <td>
        <input class="det" value="${det}" placeholder="Detalle">
        </td>
        
        <td>
        <input type="number" class="cant" value="${cant}" min="1" oninput="calcTotal()">
        </td>
        
        <td>
        <button type="button" onclick="this.closest('tr').remove();calcTotal()">✖</button>
        </td>
        `;
        
        tabla.appendChild(fila);
        
        /* limpiar inputs superiores */
        
        document.getElementById("pProducto").value="";
        document.getElementById("pDetalle").value="";
        document.getElementById("pCantidad").value="1";
        
        /* volver al primer campo */
        
        document.getElementById("pProducto").focus();
        
        calcTotal();
        }
    /* ================= CALCULAR TOTAL ================= */
    
    function calcTotal(){
    
    let total = 0;
    
    document.querySelectorAll(".cant").forEach(input=>{
    total += Number(input.value || 0);
    });
    
    const campoTotal = document.getElementById("tTotal");
    
    if(campoTotal){
    campoTotal.value = total;
    }
    
    }
    
 
    
    async function guardarTraslado(){

        const btn = document.getElementById("btnGuardarTraslado");
        setLoading(btn,true);
    
        try{
    
            /* VALIDAR FILA */
            if(!TRASLADO_ROW){
                throw new Error("Fila de traslado no definida");
            }
    
            /* BUSCAR REGISTRO */
            const r = RAW.find(x => Number(x._row) === Number(TRASLADO_ROW));
    
            if(!r){
                throw new Error("Pedido no encontrado");
            }
    
            /* OBTENER PRODUCTOS */
            const productos = [];
    
            document.querySelectorAll("#detalleTable tr").forEach(tr=>{
    
                const prod = tr.querySelector(".prod")?.value.trim();
                const det  = tr.querySelector(".det")?.value.trim();
                const cant = Number(tr.querySelector(".cant")?.value || 0);
    
                if(prod){
                    productos.push({
                        producto: prod,
                        detalle: det || "",
                        cantidad: cant || 0
                    });
                }
    
            });
    
            if(productos.length === 0){
                throw new Error("Debe agregar al menos un producto");
            }
    
            /* TOTAL */
            const total = Number(document.getElementById("tTotal")?.value || 0);
    
            /* LOGO */
            const logoEmpresa =
            "https://lh3.googleusercontent.com/d/11T8x616pxgYq0QYV51JpTulsF2s4szkk";
    
            /* PAYLOAD */
            const payload = {
    
                action:"crearTraslado",
    
                row:TRASLADO_ROW,
    
                pedido:r.pedido,
                cliente:r.cliente,
                direccion:r.direccion,
                comuna:r.comuna,
                transporte:r.transporte,
    
                observaciones:
                document.getElementById("tObs")?.value || "",
    
                total:total,
    
                productos:productos,
    
                logo:logoEmpresa
    
            };
    
            /* FETCH API */
            const resp = await fetch(API,{
                method:"POST",
                headers:{
                    "Content-Type":"application/json"
                },
                body:JSON.stringify(payload)
            });
    
            /* VALIDAR RESPUESTA */
            const text = await resp.text();
    
            let data;
    
            try{
                data = JSON.parse(text);
            }catch(e){
                throw new Error("Respuesta inválida del servidor");
            }
    
            if(!resp.ok){
                throw new Error("Servidor no responde");
            }
    
            if(data.error){
                throw new Error(data.error);
            }
    
            /* ACTUALIZAR REGISTRO LOCAL */
            if(data.traslado){
                r.solicitudTraslado = data.traslado;
            }
    
            if(data.pdf){
                r.pdfTraslado = data.pdf;
            }
    
            /* RECARGAR TARJETAS */
            await load();
    
            /* ABRIR PDF */
            if(data.pdf){
                window.open(data.pdf,"_blank");
            }
    
            alert("Traslado generado correctamente: " + (data.traslado || ""));
    
            closeTraslado();
    
        }
        catch(err){
    
            console.error("Error traslado:",err);
            alert("Error generando traslado:\n" + err.message);
    
        }
    
        setLoading(btn,false);
    
    }
  
/* MODAL */

function closeEdit(){
editModal.style.display="none";
}

/* EVENTOS */

btnReload.onclick=load;
btnGuardar.onclick=guardar;

fBuscar.oninput=applyFilter;
fStatus.onchange=applyFilter;
fDesde.onchange=applyFilter;
fHasta.onchange=applyFilter;


/* ================= AUTO-RELOAD ================= */
let autoLoad = setInterval(() => {
    if ((editModal.style.display === "none" || !editModal.style.display) &&
        (document.getElementById("trasladoModal").style.display === "none" || !document.getElementById("trasladoModal").style.display)) {
        load();
    }
}, 15000); // cada 15 segundos

let autoAlertas = setInterval(() => {
    if ((editModal.style.display === "none" || !editModal.style.display) &&
        (document.getElementById("trasladoModal").style.display === "none" || !document.getElementById("trasladoModal").style.display)) {
        RAW = RAW.map(r => calcularAlertas(r));
        applyFilter();
    }
}, 60000); // cada 1 minuto

/* ================= GUARDAR ESTADO DEL MODAL TRASLADO ================= */
function guardarEstadoTraslado(row) {
    localStorage.setItem("trasladoModalRow", row);
}

function restaurarModalTraslado() {
    const row = localStorage.getItem("trasladoModalRow");
    if (row) {
        openTraslado(Number(row));
    }
}

/* MODIFICAR openTraslado PARA GUARDAR ESTADO */
function openTraslado(row){
    TRASLADO_ROW = row;
    guardarEstadoTraslado(row); // ✅ Guardar fila en localStorage

    /* BUSCAR REGISTRO */
    const r = RAW.find(x => Number(x._row) === Number(row));
    if(!r){
        console.warn("Pedido no encontrado",row);
        return;
    }

    /* OBTENER MODAL */
    const modal = document.getElementById("trasladoModal");
    if(!modal){
        console.error("No existe el modal trasladoModal");
        return;
    }

    /* ABRIR MODAL */
    modal.style.display = "flex";

    /* CARGAR DATOS */
    const tPedido = document.getElementById("tPedido");
    const tCliente = document.getElementById("tCliente");
    const tDireccion = document.getElementById("tDireccion");
    const tComuna = document.getElementById("tComuna");
    const tTransporte = document.getElementById("tTransporte");

    if(tPedido) tPedido.value = r.pedido || "";
    if(tCliente) tCliente.value = r.cliente || "";
    if(tDireccion) tDireccion.value = r.direccion || "";
    if(tComuna) tComuna.value = r.comuna || "";
    if(tTransporte) tTransporte.value = r.transporte || "";

    /* LIMPIAR TABLA PRODUCTOS */
    const tabla = document.getElementById("detalleTable");
    if(tabla) tabla.innerHTML="";

    /* CREAR PRIMERA FILA */
    addProducto();
}

/* LIMPIAR localStorage AL CERRAR MODAL */
function closeTraslado() {
    const modal = document.getElementById("trasladoModal");
    if (modal) modal.style.display = "none";
    localStorage.removeItem("trasladoModalRow");
}

/* RESTAURAR MODAL AL RECARGAR */
window.addEventListener("load", () => {
    restaurarModalTraslado();
});

load();