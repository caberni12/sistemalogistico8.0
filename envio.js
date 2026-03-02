  /* ======================================================
     CONFIGURACIÓN
  ====================================================== */
  const API = "https://script.google.com/macros/s/AKfycbxZZ_E5MObjPJL-EhnLENeIYVeN0DGnCSvIyI5ylNfYBxSoswo2pOJ4mCT1hiGrBhzfJg/exec";

  let RAW = [];
  let FILT = [];
  let EDIT = null;
  let charts = {};
  let currentFoto = "";
  let cursorIndex = -1;

  /* ======================================================
     HELPERS
  ====================================================== */
  const isMobile = () => window.matchMedia("(max-width:768px)").matches;

  function setLoading(btn, state){
    if(!btn) return;
    btn.disabled = state;
    btn.classList.toggle("loading", state);
  }

  /* ======================================================
     FECHA (dd-MM-yyyy HH:mm)
  ====================================================== */
  function parseFechaCL(str){
    if(!str) return null;
    const [f,h] = str.split(" ");
    const [d,m,y] = f.split("-").map(Number);
    const [hh=0,mm=0] = (h||"0:0").split(":").map(Number);
    return new Date(y, m-1, d, hh, mm);
  }

  /* ======================================================
     LOAD
  ====================================================== */
  async function load(){
    const r = await fetch(API);
    RAW = await r.json();
    applyFilters();
  }

  /* ======================================================
     FILTROS
  ====================================================== */
  function applyFilters(){

const q = search.value.toLowerCase().trim();
const s = fStatus.value;

const d1 = fDesde.value ? new Date(fDesde.value + "T00:00:00") : null;
const d2 = fHasta.value ? new Date(fHasta.value + "T23:59:59") : null;

FILT = RAW.filter(r => {

  /* ========= NORMALIZAR CAMPOS ========= */
  const pedido   = String(r.pedido ?? '').toLowerCase();
  const cliente  = String(r.cliente ?? '').toLowerCase();
  const obs      = String(r.observaciones ?? '').toLowerCase();
  const status   = String(r.status ?? '');
  const fechaStr = r.fechaIngreso ?? null;

  /* ========= TEXTO ========= */
  const textOK = !q || (
    pedido.includes(q) ||
    cliente.includes(q) ||
    obs.includes(q)
  );

  /* ========= STATUS ========= */
  const statusOK = !s || status === s;

  /* ========= FECHA ========= */
  let fechaOK = true;
  if(d1 || d2){
    const fr = parseFechaCL(fechaStr);
    if(!fr) return false;
    if(d1 && fr < d1) fechaOK = false;
    if(d2 && fr > d2) fechaOK = false;
  }

  return textOK && statusOK && fechaOK;
});

cursorIndex = -1;   // reset cursor
render();
}

  /* ======================================================
     RENDER
  ====================================================== */
  function render(){
  cursorIndex = -1;
  renderKPIs();

  // limpiar contenedores
  tbody.innerHTML = "";
  mobileList.innerHTML = "";

  /* ================= DESKTOP ================= */
  if(!isMobile()){
    FILT.forEach(r=>{
      tbody.insertAdjacentHTML("beforeend", `
        <tr>
          <td class="fecha">${r.fechaIngreso || ""}</td>
          <td>${r.pedido || ""}</td>
          <td>${r.cliente || ""}</td>
          <td>${r.direccion || ""}</td>
          <td>${r.comuna || ""}</td>
          <td>${r.transporte || ""}</td>
          <td>${r.etiquetas || 0}</td>
          <td>${r.observaciones || ""}</td>
          <td>${r.status || ""}</td>
          <td>${r.responsable || ""}</td>
          <td>${r.horaEntrega || ""}</td>
          <td>${renderFotos(r.foto)}</td>
          <td>
            <div class="actions">
              <button onclick="openMap('${r.direccion}','${r.comuna}')">📍</button>
              <button onclick="openModal(RAW.find(x=>x._row==${r._row}))">✏️</button>
              <button onclick="delRow(${r._row})">🗑️</button>
            </div>
          </td>
        </tr>
      `);
    });
  }

  /* ================= MOBILE ================= */
  else{
    FILT.forEach(r=>{
      mobileList.insertAdjacentHTML("beforeend", `
        <div class="row-card">
          <b>${r.pedido || ""}</b> · ${r.status || ""}<br>
          ${r.cliente || ""}<br>
          ${r.direccion || ""} (${r.comuna || ""})<br>
          🚚 ${r.transporte || ""}<br>
          📦 ${r.etiquetas || 0}<br>
          👤 ${r.responsable || ""}<br>
          ⏱ ${r.horaEntrega || ""}<br><br>

          ${renderFotos(r.foto)}

          <div class="row-actions">
            <button onclick="openMap('${r.direccion}','${r.comuna}')">📍</button>
            <button onclick="openModal(RAW.find(x=>x._row==${r._row}))">✏️</button>
            <button onclick="delRow(${r._row})">🗑️</button>
          </div>
        </div>
      `);
    });
  }
}


 function moveCursor(dir){
  const rows = [...tbody.querySelectorAll("tr")];
  if(!rows.length) return;

  // quitar activo
  rows.forEach(r=>r.classList.remove("cursor-active"));

  // calcular índice
  cursorIndex += dir;
  if(cursorIndex < 0) cursorIndex = 0;
  if(cursorIndex >= rows.length) cursorIndex = rows.length - 1;

  const row = rows[cursorIndex];
  row.classList.add("cursor-active");

  // scroll automático
  row.scrollIntoView({
    behavior:"smooth",
    block:"nearest"
  });
}


 document.addEventListener("keydown", e=>{
  if(isMobile()) return;            // solo escritorio
  if(modalForm.style.display==="flex") return; // no interferir modal

  if(e.key === "ArrowDown"){
    e.preventDefault();
    moveCursor(1);
  }

  if(e.key === "ArrowUp"){
    e.preventDefault();
    moveCursor(-1);
  }
});




 /* ======================================================
     FOTOS
  ====================================================== */
function renderFotos(f){
  if(!f) return "";

  const fotos = String(f)
    .split("|")
    .map(u => u.trim())
    .filter(u => u && u.startsWith("http"));

  if(!fotos.length) return "";

  return `
    <div class="foto-wrap">
      ${fotos.map(u => {
        const thumb = u.replace(/=s\d+$/, '=s120');   // 👈 miniatura
        return `
          <img
            src="${thumb}"
            data-full="${u}"
            class="foto-thumb"
            loading="lazy"
            decoding="async"
            onclick="openFoto(this.dataset.full)"
          >
        `;
      }).join("")}
    </div>
  `;
}





  function openFoto(url){
  currentFoto = url;

  // usar versión GRANDE solo en el modal
  const full = url.replace(/=s\d+$/, '=s1600');

  // limpiar antes de cargar (evita parpadeos)
  fotoGrande.src = "";
  fotoModal.style.display = "flex";

  // cargar imagen grande
  fotoGrande.src = full;
}

// cerrar modal
btnCerrarFoto.onclick = ()=>{
  fotoModal.style.display = "none";
  fotoGrande.src = ""; // libera memoria
};

// descargar imagen original
btnDescargarFoto.onclick = ()=>{
  const a = document.createElement("a");
  a.href = currentFoto.replace(/=s\d+$/, '=s2000');
  a.download = "foto_pedido.jpg";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

  /* ======================================================
     MAPA
  ====================================================== */
  function openMap(d,c){
    mapFrame.src =
      `https://www.google.com/maps?q=${encodeURIComponent(d+', '+c+', Chile')}&output=embed`;
    mapModal.style.display="flex";
  }

  btnCerrarMapa.onclick = ()=>{
    mapModal.style.display="none";
    mapFrame.src="";
  };

  /* ======================================================
     KPIS
  ====================================================== */
  function drawKPI(id,val,total,color){
    if(charts[id]) charts[id].destroy();
    charts[id] = new Chart(document.getElementById(id),{
      type:"doughnut",
      data:{datasets:[{data:[val,total-val],backgroundColor:[color,"#e5e7eb"]}]},
      options:{cutout:"70%",plugins:{legend:{display:false}}}
    });
  }

function kpiFilter(status){
  // marcar activo
  document.querySelectorAll('.kpi').forEach(k=>k.classList.remove('active'));
  const active = [...document.querySelectorAll('.kpi')]
    .find(k=>k.dataset.status===status);
  if(active) active.classList.add('active');

  // aplicar filtro
  fStatus.value = status;
  applyFilters();
}
const btnToggleKPI = document.getElementById('btnToggleKPI');

btnToggleKPI.onclick = ()=>{
  kpis.classList.toggle('hidden');

  const hidden = kpis.classList.contains('hidden');
  btnToggleKPI.textContent = hidden
    ? '📊 Mostrar dashboard'
    : '📊 Ocultar dashboard';

  // guardar estado
  localStorage.setItem('kpiHidden', hidden ? '1' : '0');
};

// restaurar estado
if(localStorage.getItem('kpiHidden') === '1'){
  kpis.classList.add('hidden');
  btnToggleKPI.textContent = '📊 Mostrar dashboard';
}


  function renderKPIs(){
    const t = FILT.length || 1;
    const c = s => FILT.filter(r=>r.status===s).length;

    kpis.innerHTML = `
  <div class="kpi" onclick="kpiFilter('')" data-status="">
    <canvas id="k1"></canvas><b>${t}</b>Total
  </div>

  <div class="kpi" onclick="kpiFilter('PENDIENTE')" data-status="PENDIENTE">
    <canvas id="k2"></canvas><b>${c("PENDIENTE")}</b>Pendiente
  </div>

  <div class="kpi" onclick="kpiFilter('EN RUTA')" data-status="EN RUTA">
    <canvas id="k3"></canvas><b>${c("EN RUTA")}</b>Ruta
  </div>

  <div class="kpi" onclick="kpiFilter('ENTREGADO')" data-status="ENTREGADO">
    <canvas id="k4"></canvas><b>${c("ENTREGADO")}</b>Entregado
  </div>

  <div class="kpi" onclick="kpiFilter('RECIBIDO')" data-status="RECIBIDO">
    <canvas id="k5"></canvas><b>${c("RECIBIDO")}</b>Recibido
  </div>

  <div class="kpi" onclick="kpiFilter('CANCELADO')" data-status="CANCELADO">
    <canvas id="k6"></canvas><b>${c("CANCELADO")}</b>Cancelado
  </div>
`;

    drawKPI("k1",t,t,"#14b8a6");
    drawKPI("k2",c("PENDIENTE"),t,"#facc15");
    drawKPI("k3",c("EN RUTA"),t,"#38bdf8");
    drawKPI("k4",c("ENTREGADO"),t,"#4ade80");
    drawKPI("k5",c("RECIBIDO"),t,"#a78bfa");
    drawKPI("k6",c("CANCELADO"),t,"#ef4444");
  }

  /* ======================================================
     CRUD
  ====================================================== */
  btnNuevo.onclick = ()=> openModal();
  btnCancelar.onclick = ()=> modalForm.style.display="none";

  function openModal(r=null){
    modalForm.style.display="flex";
    EDIT = r;

    if(r){
      mtitle.textContent="Editar Pedido";
      mPedido.value=r.pedido;
      mCliente.value=r.cliente;
      mDireccion.value=r.direccion;
      mComuna.value=r.comuna;
      mTransporte.value=r.transporte||"";
      mCajas.value=r.etiquetas||1;
      mObs.value=r.observaciones||"";
      mStatus.value=r.status;
      mResponsable.value=r.responsable||"";
      mHoraEntrega.value=r.horaEntrega||"";
    } else {
      mtitle.textContent="Nuevo Pedido";
      mPedido.value=mCliente.value=mDireccion.value=mComuna.value=mTransporte.value=mObs.value="";
      mCajas.value=1;
      mStatus.value="PENDIENTE";
      mResponsable.value=mHoraEntrega.value="";
    }
  }

  /* ======================================================
     GUARDAR
  ====================================================== */
  btnGuardar.onclick = async ()=>{
  setLoading(btnGuardar, true);

  // ===== convertir TODAS las fotos a base64 =====
  let fotos64 = [];

  if (mFotos.files.length > 0) {
    for (const file of mFotos.files) {
      fotos64.push(await toBase64(file));
    }
  }

  // ===== payload correcto =====
  const payload = {
    action: EDIT ? "update" : "add",
    row: EDIT ? EDIT._row : null,
    "PEDIDO": mPedido.value,
    "CLIENTE": mCliente.value,
    "DIRECCION": mDireccion.value,
    "COMUNA": mComuna.value,
    "TRANSPORTE": mTransporte.value,
    "ETIQUETAS": mCajas.value,
    "OBSERVACIONES": mObs.value,
    "STATUS": mStatus.value,
    "RESPONSABLE ENTREGA": mResponsable.value,
    "HORA ENTREGA": mHoraEntrega.value,
    "FOTO": fotos64       // 👈 ahora es ARRAY
  };

  await fetch(API, {
    method: "POST",
    body: JSON.stringify(payload)
  });

  setLoading(btnGuardar, false);
  modalForm.style.display = "none";
  load();
};


 function toBase64(file){
  return new Promise(r=>{
    const fr = new FileReader();
    fr.onload = ()=> r(fr.result);
    fr.readAsDataURL(file);
  });
}


  /* ======================================================
     ELIMINAR
  ====================================================== */
  async function delRow(row){
    if(!confirm("¿Eliminar pedido?")) return;
    await fetch(API,{method:"POST",body:JSON.stringify({action:"delete",row})});
    load();
  }

  /* ======================================================
     EXPORTES
  ====================================================== */
   /* ================== EXPORT ================== */
   btnPDF.onclick = ()=> exportPDF(btnPDF);
  btnExcel.onclick = ()=> exportExcel(btnExcel);
  /* ================== EXPORT PDF ================== */
function exportPDF(btn){
  setLoading(btn,true);

  setTimeout(()=>{
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation:'landscape' });

    // ===== CALCULOS =====
    const totalPedidos = FILT.length;
    const totalBultos = FILT.reduce(
      (sum,r)=> sum + Number(r.etiquetas || 0), 0
    );

    // ===== TABLA =====
    doc.autoTable({
      head:[[
        'Fecha Ingreso',
        'Pedido',
        'Cliente',
        'Dirección',
        'Comuna',
        'Transporte',
        'Cajas',
        'Responsable',
        'Hora Entrega',
        'Estado',
        'Obs'
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
        fontSize:9,
        cellPadding:3
      },
      footStyles:{
        fontStyle:'bold',
        halign:'right'
      },
      margin:{ top:20 }
    });

    doc.save("Pedidos_Logisticos.pdf");
    setLoading(btn,false);
  },300);
}


  /* ================== EXPORT EXCEL ================== */
function exportExcel(btn){
  setLoading(btn,true);

  setTimeout(()=>{
    // Normalizar datos (orden y nombres claros)
    const data = FILT.map(r=>({
      "Fecha Ingreso": r.fechaIngreso || '',
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

    XLSX.writeFile(wb, "Pedidos_Logisticos.xlsx");

    setLoading(btn,false);
  },300);
}

function setLoading(btn, state){
  if(!btn) return;
  btn.disabled = state;
  btn.classList.toggle("loading", state);
}

/* ======================================================
   RECARGAR TABLA – EFECTO VISIBLE
====================================================== */
btnReload.onclick = async ()=>{
  setLoading(btnReload, true);

  // efecto visual inmediato (tabla)
  tbody.innerHTML = `
    <tr>
      <td colspan="13" style="text-align:center;padding:20px;font-weight:600;">
        🔄 Recargando tabla...
      </td>
    </tr>
  `;

  // efecto visual móvil
  mobileList.innerHTML = `
    <div style="padding:20px;text-align:center;font-weight:600;">
      🔄 Recargando lista...
    </div>
  `;

  // forzar repintado del navegador
  await new Promise(r => setTimeout(r, 200));

  // usar TU lógica existente
  await load();

  setLoading(btnReload, false);
};


  /* ======================================================
     INIT
  ====================================================== */
  search.oninput=applyFilters;
  fStatus.onchange=applyFilters;
  fDesde.onchange=applyFilters;
  fHasta.onchange=applyFilters;

  load();