let CARD_STATE = {}; // idFila => true (expandida) | false (colapsada)
/* =====================================================
   CONFIGURACIÓN
===================================================== */
const URL_GS =
  'https://script.google.com/macros/s/AKfycbyRRSuT2TZURNw-09_n23MpxRsYsr6KBG2pJ9j9-pwMjWHgBy4fVBU99hEfa0ENxHeIXQ/exec';

let DATA = [];
let DATA_FILTRADA = [];
let ORIGEN = /android|iphone|ipad|mobile/i.test(navigator.userAgent)
  ? 'MOBILE'
  : 'WEB';

let timerBuscar = null;
let TIPO_MOV = null;

/* =====================================================
   UTILIDADES
===================================================== */
function $(id){ return document.getElementById(id); }

function normalizarCodigo(v){
  return String(v ?? '').trim();
}

/* ===== FECHA PARA TABLA / TARJETA ===== */
function formatFechaTabla(f){
  if(!f) return '';
  const d = new Date(f);
  if(isNaN(d)) return '';
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2,'0');
  const mi = String(d.getMinutes()).padStart(2,'0');
  return `${dd}-${mm}-${yy} ${hh}:${mi}`;
}

/* ===== FECHA PARA INPUT DATE ===== */
function formatFechaInput(f){
  if(!f) return '';
  const d = new Date(f);
  if(isNaN(d)) return '';
  return d.toISOString().slice(0,10);
}

/* =====================================================
   PROGRESS BAR
===================================================== */
function startProgress(){
  const bar = $('progress-bar');
  if(!bar) return;
  bar.classList.add('active');
  bar.style.width = '30%';
}

function endProgress(){
  const bar = $('progress-bar');
  if(!bar) return;
  bar.style.width = '100%';
  setTimeout(()=>{
    bar.classList.remove('active');
    bar.style.width = '0%';
  },300);
}

/* =====================================================
   LOADER BOTONES
===================================================== */
function startBtnLoader(btn){
  if(!btn) return;
  btn.disabled = true;
  btn.dataset.txt = btn.innerHTML;
  btn.classList.add('loading');
  btn.innerHTML = '<span class="btn-loader"></span>';
}

function endBtnLoader(btn){
  if(!btn) return;
  btn.disabled = false;
  btn.classList.remove('loading');
  btn.innerHTML = btn.dataset.txt || 'Guardar';
}

/* =====================================================
   MODAL
===================================================== */
function abrirModal(){
  limpiarFormulario();
  $('origen').value = ORIGEN;
  $('modal').classList.add('active');
}

function cerrarModal(){
  cerrarScanner();
  $('modal').classList.remove('active');
}

/* =====================================================
   TIPO MOVIMIENTO
===================================================== */
function setMovimiento(tipo){
  TIPO_MOV = tipo;
  $('btnEntrada').classList.remove('active');
  $('btnSalida').classList.remove('active');
  $(tipo === 'ENTRADA' ? 'btnEntrada' : 'btnSalida')
    .classList.add('active');
}

/* =====================================================
   AUTOCOMPLETE
===================================================== */
function buscarCodigo(){
  clearTimeout(timerBuscar);

  const cod = normalizarCodigo($('codigo').value);
  const sug = $('suggest');

  if(!cod){
    $('descripcion').value = '';
    $('cantidad').value = '';
    sug.style.display = 'none';
    return;
  }

  timerBuscar = setTimeout(()=>{
    fetch(`${URL_GS}?accion=buscar&codigo=${encodeURIComponent(cod)}`)
      .then(r=>r.json())
      .then(d=>{
        if(d.ok){
          $('descripcion').value = d.descripcion;
          $('cantidad').value = Number(d.cantidad || 0);
          sug.innerHTML = `
            <div onclick="selectProducto('${d.codigo}','${d.descripcion}',${d.cantidad})">
              ${d.codigo} – ${d.descripcion}
            </div>`;
          sug.style.display = 'block';
        }else{
          $('descripcion').value='';
          $('cantidad').value='';
          sug.style.display='none';
        }
      })
      .catch(()=>{
        $('descripcion').value='';
        $('cantidad').value='';
        sug.style.display='none';
      });
  },300);
}

function selectProducto(c,d,stock){
  $('codigo').value = c;
  $('descripcion').value = d;
  $('cantidad').value = Number(stock || 0);
  $('suggest').style.display = 'none';
}

/* =====================================================
   LISTAR / RENDER TABLA + TARJETAS
===================================================== */
function cargar(){
  startProgress();
  fetch(`${URL_GS}?accion=listar`)
    .then(r=>r.json())
    .then(d=>{
      DATA = d.data || [];
      DATA_FILTRADA = DATA;
      renderTabla(DATA);
      endProgress();
    })
    .catch(()=>{
      DATA = [];
      DATA_FILTRADA = [];
      renderTabla([]);
      endProgress();
    });
}

function renderTabla(arr){
  const tbody = $('tabla');
  const cards = $('cards');

  tbody.innerHTML = '';
  cards.innerHTML = '';

  if(!arr.length){
    tbody.innerHTML = `
      <tr>
        <td colspan="11" style="text-align:center;padding:20px">
          Sin registros
        </td>
      </tr>`;
    return;
  }

  arr.forEach(r=>{

    /* ===== TABLA ESCRITORIO ===== */
    tbody.innerHTML += `
      <tr>
        <td>${r[5]}</td>
        <td>${r[6]}</td>
        <td>${r[4]}</td>
        <td>${r[7]}</td>
        <td>${formatFechaTabla(r[1])}</td>
        <td>${formatFechaTabla(r[2])}</td>
        <td>${formatFechaTabla(r[3])}</td>
        <td>${r[8]}</td>
        <td>${r[9]}</td>
        <td>${r[10]}</td>
        <td class="actions-td">
          <button class="edit" onclick='editar(${JSON.stringify(r)})'>✏️</button>
          <button class="del" onclick='eliminar("${r[0]}",this)'>🗑️</button>
        </td>
      </tr>`;
/* ===== TARJETA MÓVIL ===== */
const id = r[0];
const open = CARD_STATE[id] === true;

cards.innerHTML += `
  <div class="card-item" data-id="${id}">

    <div class="card-head">
      <div class="desc">${r[6]}</div>
      <button onclick="toggleCard('${id}', this)">
        ${open ? '−' : '+'}
      </button>
    </div>

    <!-- VISIBLE POR DEFECTO -->
    <div class="card-row"><b>Código</b><span>${r[5]}</span></div>
    <div class="card-row"><b>Ubicación</b><span>${r[4]}</span></div>
    <div class="card-row"><b>Stock</b><span>${r[7]}</span></div>

    <!-- OCULTO / EXPANDIBLE -->
    <div class="card-body" style="display:${open ? 'block' : 'none'}">

      <div class="card-row"><b>Responsable</b><span>${r[8]}</span></div>
      <div class="card-row"><b>Origen</b><span>${r[10]}</span></div>

      <div class="card-fechas">
        <div>📥 ${formatFechaTabla(r[2])}</div>
        <div>📤 ${formatFechaTabla(r[3])}</div>
      </div>

      <span class="badge ${r[9] === 'VIGENTE' ? 'vigente' : 'retirado'}">
        ${r[9]}
      </span>

      <div class="card-actions">
        <button class="edit" onclick='editar(${JSON.stringify(r)})'>✏️</button>
        <button class="del" onclick='eliminar("${r[0]}",this)'>🗑️</button>
      </div>

    </div>

  </div>`;
  });
}

/* =====================================================
   EDITAR / ELIMINAR
===================================================== */
function editar(r){
  abrirModal();
  $('id').value = r[0];
  $('fecha_entrada').value = formatFechaInput(r[2]);
  $('fecha_salida').value  = formatFechaInput(r[3]);
  $('ubicacion').value = r[4];
  $('codigo').value = r[5];
  $('descripcion').value = r[6];
  $('cantidad').value = Number(r[7] || 0);
  $('cantidad_mov').value = '';
  $('responsable').value = r[8];
  $('status').value = r[9];
  $('origen').value = r[10];
}

function eliminar(idFila, btn){
  if(!confirm('¿Eliminar este movimiento?')) return;
  startBtnLoader(btn);

  fetch(URL_GS,{
    method:'POST',
    body:JSON.stringify({accion:'eliminar',id:idFila})
  })
  .then(()=>{ endBtnLoader(btn); cargar(); })
  .catch(()=>{ endBtnLoader(btn); alert('Error al eliminar'); });
}

/* =====================================================
   GUARDAR
===================================================== */
function guardar(){
  const btn = $('btnGuardar');

  const stockActual = Number($('cantidad').value || 0);
  const mov = Number($('cantidad_mov').value || 0);

  if(!TIPO_MOV){
    alert('Seleccione ENTRADA o SALIDA');
    return;
  }

  if(mov <= 0){
    alert('Ingrese una cantidad válida');
    return;
  }

  let nuevoStock = stockActual;

  if(TIPO_MOV === 'SALIDA'){
    if(mov > stockActual){
      alert(`Stock insuficiente\nStock: ${stockActual}\nSalida: ${mov}`);
      return;
    }
    nuevoStock -= mov;
  }else{
    nuevoStock += mov;
  }

  startBtnLoader(btn);

  fetch(URL_GS,{
    method:'POST',
    body:JSON.stringify({
      accion: $('id').value ? 'editar' : 'agregar',
      id: $('id').value,
      fecha_entrada: $('fecha_entrada').value,
      fecha_salida: $('fecha_salida').value,
      ubicacion: $('ubicacion').value,
      codigo: $('codigo').value,
      descripcion: $('descripcion').value,
      cantidad: nuevoStock,
      responsable: $('responsable').value,
      status: $('status').value,
      origen: ORIGEN
    })
  })
  .then(r=>r.json())
  .then(res=>{
    endBtnLoader(btn);
    if(res.ok === false){
      alert(res.msg || 'Error');
      return;
    }
    cerrarModal();
    cargar();
  })
  .catch(()=>{
    endBtnLoader(btn);
    alert('Error al guardar');
  });
}

/* =====================================================
   FILTRO
===================================================== */
function filtrar(txt){
  txt = txt.toLowerCase();
  DATA_FILTRADA = DATA.filter(r =>
    r.join(' ').toLowerCase().includes(txt)
  );
  renderTabla(DATA_FILTRADA);
}

/* =====================================================
   LIMPIAR
===================================================== */
function limpiarFormulario(){
  document.querySelectorAll('#modal input, #modal select')
    .forEach(i=>i.value='');
  TIPO_MOV = null;
  $('suggest').style.display='none';
}

/* =====================================================
   SCANNER
===================================================== */
let scanner = null;
let torchOn = false;

function abrirScanner(){
  if(!/android|iphone|ipad|mobile/i.test(navigator.userAgent)){
    alert('Scanner solo disponible en móvil');
    return;
  }

  $('scannerBox').style.display='block';
  $('torchBtn').style.display='block';

  scanner = new Html5Qrcode('scannerBox');
  scanner.start(
    {facingMode:{exact:'environment'}},
    {fps:10,qrbox:220},
    txt=>{
      $('codigo').value = txt.trim();
      cerrarScanner();
      buscarCodigo();
    }
  );
}

function toggleTorch(){
  if(!scanner) return;
  torchOn = !torchOn;
  scanner.applyVideoConstraints({advanced:[{torch:torchOn}]});
  $('torchBtn').classList.toggle('active',torchOn);
}

function cerrarScanner(){
  if(scanner){
    scanner.stop().then(()=>scanner.clear()).catch(()=>{});
    scanner = null;
  }
  $('scannerBox').style.display='none';
  $('torchBtn').style.display='none';
  torchOn = false;
}

   
function recargar(){
  cargar();
}


function exportarPDF(){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('l','pt','a4');

  const origen = DATA_FILTRADA.length ? DATA_FILTRADA : DATA;

  doc.text('Reporte de Ubicaciones',40,40);

  doc.autoTable({
    startY:60,
    head:[['Código','Descripción','Ubicación','Stock','Registro','Entrada','Salida','Responsable','Status','Origen']],
    body:origen.map(r=>[
      r[5], r[6], r[4], r[7],
      formatFechaTabla(r[1]),
      formatFechaTabla(r[2]),
      formatFechaTabla(r[3]),
      r[8], r[9], r[10]
    ]),
    styles:{ fontSize:9 },
    headStyles:{ fillColor:[20,184,166], textColor:255 }
  });

  doc.save('ubicaciones.pdf');
}

/* =====================================================
   EXPORTAR XLSX
===================================================== */
function exportarXLSX(){
  const origen = DATA_FILTRADA.length ? DATA_FILTRADA : DATA;

  const ws = XLSX.utils.json_to_sheet(
    origen.map(r=>({
      Codigo:r[5],
      Descripcion:r[6],
      Ubicacion:r[4],
      Stock:r[7],
      Registro:formatFechaTabla(r[1]),
      Entrada:formatFechaTabla(r[2]),
      Salida:formatFechaTabla(r[3]),
      Responsable:r[8],
      Status:r[9],
      Origen:r[10]
    }))
  );

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Ubicaciones');
  XLSX.writeFile(wb,'ubicaciones.xlsx');
}

function toggleCard(id, btn){
  CARD_STATE[id] = !CARD_STATE[id];

  const card = document.querySelector(`.card-item[data-id="${id}"]`);
  if(!card) return;

  const body = card.querySelector('.card-body');
  if(!body) return;

  body.style.display = CARD_STATE[id] ? 'block' : 'none';
  btn.textContent = CARD_STATE[id] ? '−' : '+';
}