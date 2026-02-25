
/* =====================================================
   APP PRO UNIFICADO – COMPLETO Y FUNCIONAL
   Combina app.js + app2.js SIN perder funciones
   ===================================================== */

   // SOLO CONSULTA (maestra / búsqueda / importar)
   const API = "https://script.google.com/macros/s/AKfycbzC_qrSyXeTw9NcO40ap4x2cfs3FZIBKqMZLV9kKhYYh7n2XTPAuj1Vb2ckpFBWi8Ys/exec";
   
   // SOLO GUARDAR CAPTURAS (CAMBIA ESTA URL SI ES NECESARIO)
   const API_GUARDAR = "https://script.google.com/macros/s/AKfycbz-_cZbe36eaQyopjw1HURuE4Zwbvuo4Lewsn0S393ocCLiQRbdouSUwpiAFOSwVzXwyA/exec";
let productos = [];
let capturas = JSON.parse(localStorage.getItem("capturas") || "[]");

let scannerActivo = null;
let scannerTarget = null;
let torch = false;
let editIndex = -1;

/* ===== IMPORTACIÓN PERSISTENTE ===== */
let bufferImportacion = JSON.parse(localStorage.getItem("bufferImportacion") || "null");
let estadoImportacion = JSON.parse(localStorage.getItem("estadoImportacion") || "null");

/* ===================== CARGA INICIAL ===================== */
document.addEventListener("DOMContentLoaded", () => {

  operador.value = localStorage.getItem("operador") || "";
  ubicacion.value = localStorage.getItem("ubicacion") || "";

  fetch(API)
    .then(r => r.json())
    .then(d => {
      productos = d;
      localStorage.setItem("productos", JSON.stringify(d));
    })
    .catch(() => {
      const c = localStorage.getItem("productos");
      if (c) productos = JSON.parse(c);
    });

  render();

  if (estadoImportacion && estadoImportacion.enProceso) {
    openTab("importar");
    barra.style.width = estadoImportacion.progreso + "%";
    mensaje.innerText = estadoImportacion.mensaje;
  }
});

/* ===================== TABS ===================== */
function openTab(id) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ===================== CAPTURADOR ===================== */
function limpiarUbicacion() {
  ubicacion.value = "";
  localStorage.removeItem("ubicacion");
  previewIngreso();
}

function buscarDescripcion() {
  const c = codigo.value.trim().toLowerCase();
  if (!c) return;
  const p = productos.find(x => String(x.CODIGO).toLowerCase() === c);
  if (p) {
    descripcion.value = p.DESCRIPCION || "";
    cantidad.value = 1;
  }
}

function previewIngreso() {
  if (!codigo.value && !descripcion.value) {
    preview.innerHTML = "";
    return;
  }
  preview.innerHTML = `
  <div class="row preview">
    <b>🕒 PREVISUALIZANDO</b><br><br>
    <b>${codigo.value || "-"}</b> – ${descripcion.value || "-"}<br>
    <span class="small">
      ${ubicacion.value || "SIN UBICACIÓN"} |
      ${operador.value || "-"} |
      Cant: ${cantidad.value}
    </span>
  </div>`;
}

/* ===================== SCANNER PRO ===================== */
function activarScan(tipo) {
 
  cerrarScanner();
  scannerTarget = tipo;

  const cont = document.getElementById("scanner-" + tipo);
  if (!cont) return;

  // crear contenedor limpio
  cont.innerHTML = `<div id="scannerBox"></div>`;

  // iniciar scanner
  scannerActivo = new Html5Qrcode("scannerBox");

  scannerActivo.start(
    { facingMode: { exact: "environment" } },
    {
      fps: 10,
      qrbox: 260
    },
    txt => {
      if (!txt) return;

      // sonido + vibración
      document.getElementById("beep")?.play();
      navigator.vibrate?.(150);

      if (scannerTarget === "codigo") {
        codigo.value = txt;
        buscarDescripcion();
      }

      if (scannerTarget === "ubicacion") {
        ubicacion.value = txt;
        localStorage.setItem("ubicacion", txt);
      }

      previewIngreso();
      cerrarScanner();
    }
  );

  // overlay UI (después del video)
  setTimeout(() => {
    const box = document.getElementById("scannerBox");
    if (!box) return;

    box.insertAdjacentHTML("afterbegin", `
  <div class="scanner-overlay">
    <button class="scanner-btn close" onclick="cerrarScanner()">✖</button>

    

    <button class="scanner-btn torch" onclick="toggleTorch()">🔦</button>
  </div>
  <div class="scan-frame"></div>
  <div class="scan-line"></div>
`);
  }, 300);
}


   /* =====================================================
   SCANNER PRO – AJUSTE ESTABLE 350ms
   ===================================================== */

let tecladoActivo = false;
let ajustePendiente = null;

/* ---------- DETECTAR TECLADO ---------- */
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", () => {
    const hWin = window.innerHeight;
    const hVV  = window.visualViewport.height;

    tecladoActivo = hVV < hWin - 120;

    if (tecladoActivo) programarAjuste();
  });
}

/* ---------- AJUSTE SIN ACUMULAR ---------- */
function programarAjuste(){
  clearTimeout(ajustePendiente);
  ajustePendiente = setTimeout(ajustarScanner, 350);
}

/* ---------- AJUSTE REAL ---------- */
function ajustarScanner(){
  const box = document.getElementById("scannerBox");
  if (!box) return;

  const rect = box.getBoundingClientRect();
  const offset = window.visualViewport?.offsetTop || 0;

  const y = rect.top + window.scrollY - offset - 16;

  window.scrollTo({
    top: Math.max(0, y),
    behavior: "smooth"
  });
}

/* ---------- INPUT FOCUS ---------- */
document.addEventListener("focusin", e => {
  if (e.target instanceof HTMLInputElement) {
    programarAjuste();
  }
});

/* ---------- ACTIVAR SCANNER ---------- */
const _activarScan = window.activarScan;

window.activarScan = function(tipo){
  _activarScan(tipo);
  programarAjuste();
};

function cerrarScanner() {
  if (!scannerActivo) return;
  scannerActivo.stop().then(() => {
    scannerActivo.clear();
    scannerActivo = null;
    scannerTarget = null;
    torch = false;
    document.querySelectorAll(".scanner-slot").forEach(d => d.innerHTML = "");
  }).catch(()=>{});
}




function toggleTorch() {
  if (!scannerActivo) return;

  torch = !torch;

  scannerActivo.applyVideoConstraints({
    advanced: [{ torch }]
  }).then(() => {
    document
      .querySelector(".scanner-btn.torch")
      ?.classList.toggle("on", torch);
  }).catch(() => {
    torch = false;
  });
}


/* =====================================================
   




  


/* ===================== GUARDAR / EDITAR ===================== */
function ingresar() {
  if (!codigo.value.trim()) {
    alert("❌ Digite un código válido");
    return;
  }

  localStorage.setItem("operador", operador.value);
  ubicacion.value
    ? localStorage.setItem("ubicacion", ubicacion.value)
    : localStorage.removeItem("ubicacion");

  const d = {
    Fecha: new Date().toLocaleString(),
    Operador: operador.value || "",
    Ubicación: ubicacion.value || "SIN UBICACIÓN",
    Código: codigo.value,
    Descripción: descripcion.value,
    Cantidad: Number(cantidad.value)
  };

  editIndex >= 0 ? capturas[editIndex] = d : capturas.push(d);
  editIndex = -1;

  localStorage.setItem("capturas", JSON.stringify(capturas));
  limpiar();
  render();
}

function cancelarEdicion() {
  editIndex = -1;
  limpiar();
}

function limpiar() {
  codigo.value = "";
  descripcion.value = "";
  cantidad.value = 1;
  preview.innerHTML = "";
}

/* ===================== RENDER ===================== */
function render() {
  tabla.innerHTML = "";
  let total = 0;

  capturas.forEach((c, i) => {
    total += Number(c.Cantidad) || 0;
    tabla.innerHTML += `
    <div class="row ${editIndex === i ? "editing" : ""}">
      <button class="delbtn" onclick="event.stopPropagation();eliminarItem(${i})">×</button>
      <div onclick="cargarParaEditar(${i})">
        <b>${c.Código}</b> – ${c.Descripción}<br>
        <span class="small">
          ${c.Ubicación} | ${c.Operador} | ${c.Fecha} | Cant: ${c.Cantidad}
        </span>
      </div>
    </div>`;
  });

  totalizador.innerText = "Total unidades: " + total;
}

function cargarParaEditar(i) {
  const c = capturas[i];
  operador.value = c.Operador;
  ubicacion.value = c.Ubicación === "SIN UBICACIÓN" ? "" : c.Ubicación;
  codigo.value = c.Código;
  descripcion.value = c.Descripción;
  cantidad.value = c.Cantidad;
  editIndex = i;
  previewIngreso();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function eliminarItem(i) {
  if (!confirm("¿Eliminar este registro?")) return;
  capturas.splice(i, 1);
  localStorage.setItem("capturas", JSON.stringify(capturas));
  render();
}

/* ===================== EXPORTAR ===================== */
function exportarPDF() {
  if (!capturas.length) return alert("Sin datos");
  const w = window.open("");
  let h = "<h3>Reporte de Captura</h3><table border='1'><tr>";
  Object.keys(capturas[0]).forEach(k => h += "<th>" + k + "</th>");
  h += "</tr>";
  capturas.forEach(r => {
    h += "<tr>";
    Object.values(r).forEach(v => h += "<td>" + v + "</td>");
    h += "</tr>";
  });
  h += "</table>";
  w.document.write(h);
  w.print();
}
/* ===================== FINALIZAR (GUARDA EN HOJA) ===================== */
async function finalizar() {

  if (!capturas.length) {
    alert("❌ No hay capturas para enviar");
    return;
  }

  if (!confirm(`📤 Enviar ${capturas.length} registros a la hoja?`)) return;

  const hoy = new Date().toISOString().slice(0,10);

  try {
    for (const r of capturas) {
      const payload = {
        accion: "agregar",
        fecha_entrada: hoy,
        fecha_salida: "",
        ubicacion: r.Ubicación || "SIN UBICACIÓN",
        codigo: "" + r.Código,
        descripcion: r.Descripción || "",
        cantidad: Number(r.Cantidad || 0),
        responsable: r.Operador || "",
        status: "VIGENTE",
        origen: /mobile/i.test(navigator.userAgent)
          ? "CAPTURADOR_MOBILE"
          : "CAPTURADOR_WEB"
      };

      await fetch(API_GUARDAR, {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }

    alert("✅ Datos enviados correctamente a Base de Datos");

    localStorage.removeItem("capturas");
    capturas = [];
    limpiar();
    render();

  } catch (e) {
    alert("❌ Error al enviar los datos");
  }
}

/* ===================== IMPORTADOR ===================== */
function importarMaestra() {
  const file = fileExcel.files[0];
  if (!file && bufferImportacion) {
    enviarMaestra(bufferImportacion);
    return;
  }
  if (!file) return alert("Selecciona Excel");

  const reader = new FileReader();
  reader.onload = e => {
    const wb = XLSX.read(e.target.result, { type: "binary" });
    const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    bufferImportacion = data;
    localStorage.setItem("bufferImportacion", JSON.stringify(data));
    enviarMaestra(data);
  };
  reader.readAsBinaryString(file);
}

async function enviarMaestra(data) {
  estadoImportacion = { enProceso: true, progreso: 0, mensaje: "⏳ Importando..." };
  localStorage.setItem("estadoImportacion", JSON.stringify(estadoImportacion));

  barra.style.width = "0%";
  mensaje.innerText = estadoImportacion.mensaje;

  let p = 0;
  const t = setInterval(() => {
    p += 10;
    barra.style.width = p + "%";
    estadoImportacion.progreso = p;
    localStorage.setItem("estadoImportacion", JSON.stringify(estadoImportacion));
    if (p >= 90) clearInterval(t);
  }, 200);

  try {
    await fetch(API, { method: "POST", body: JSON.stringify({ accion: "importar", data }) });
    clearInterval(t);
    barra.style.width = "100%";
    mensaje.innerText = "✅ Importación exitosa";
    localStorage.removeItem("estadoImportacion");
    localStorage.removeItem("bufferImportacion");
  } catch (e) {
    mensaje.innerText = "❌ Error al importar";
  }
}







/* ===================== CONSULTA ===================== */
let timerConsulta = null, filasConsulta = [], indexConsulta = -1;

function abrirModalConsulta() {
  modalConsulta.classList.add("show");
  buscarConsulta.value = "";
  resultadoConsulta.innerHTML = "";
  scrollConsulta.style.display = "none";
  msgConsulta.innerText = "Escriba para consultar";
  filasConsulta = [];
  indexConsulta = -1;
  buscarConsulta.focus();
}

function cerrarModalConsulta() {
  modalConsulta.classList.remove("show");
}

function filtrarConsulta() {
  clearTimeout(timerConsulta);
  timerConsulta = setTimeout(filtrarConsultaReal, 250);
}

function filtrarConsultaReal() {
  const q = buscarConsulta.value.trim().toLowerCase();
  resultadoConsulta.innerHTML = "";
  filasConsulta = [];
  indexConsulta = -1;

  if (q.length < 2) {
    msgConsulta.innerText = "Escriba al menos 2 caracteres";
    return;
  }

  for (const p of productos) {
    if (
      String(p.CODIGO).toLowerCase().includes(q) ||
      String(p.DESCRIPCION).toLowerCase().includes(q)
    ) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${p.CODIGO}</td><td>${p.DESCRIPCION}</td>`;
      tr.onclick = () => activarFilaConsulta(filasConsulta.indexOf(tr));
      resultadoConsulta.appendChild(tr);
      filasConsulta.push(tr);
      if (filasConsulta.length >= 50) break;
    }
  }

  if (!filasConsulta.length) {
    msgConsulta.innerText = "❌ Sin coincidencias";
    return;
  }

  scrollConsulta.style.display = "block";
  activarFilaConsulta(0);
}

function activarFilaConsulta(i){
  if(i < 0 || i >= filasConsulta.length) return;

  // quitar selección anterior
  filasConsulta.forEach(r => r.classList.remove("selected"));

  // marcar nueva fila
  const fila = filasConsulta[i];
  fila.classList.add("selected");
  indexConsulta = i;

  // =============================
  // AUTO SCROLL (LA CLAVE)
  // =============================
  const cont = scrollConsulta;

  const filaTop = fila.offsetTop;
  const filaBottom = filaTop + fila.offsetHeight;

  const contTop = cont.scrollTop;
  const contBottom = contTop + cont.clientHeight;

  // si baja y se sale por abajo
  if (filaBottom > contBottom) {
    cont.scrollTop = filaBottom - cont.clientHeight + 8;
  }

  // si sube y se sale por arriba
  if (filaTop < contTop) {
    cont.scrollTop = filaTop - 8;
  }
}


document.addEventListener("keydown", e => {

  // solo cuando el modal está abierto
  if (!modalConsulta.classList.contains("show")) return;

  // si no hay filas, no hace nada
  if (!filasConsulta.length) return;

  // PREVIENE que el input use las flechas
  if (["ArrowDown","ArrowUp"].includes(e.key)) {
    e.preventDefault();
  }

  if (e.key === "ArrowDown") {
    activarFilaConsulta(
      Math.min(indexConsulta + 1, filasConsulta.length - 1)
    );
  }

  if (e.key === "ArrowUp") {
    activarFilaConsulta(
      Math.max(indexConsulta - 1, 0)
    );
  }

  if (e.key === "Enter") {
    filasConsulta[indexConsulta]?.click();
  }

  if (e.key === "Escape") {
    cerrarModalConsulta();
  }
});

/* ===== EXPORTAR MAESTRA DE PRODUCTOS ===== */
function exportarMaestraProductos(){

  if(!productos || !productos.length){
    alert("❌ No hay productos para exportar");
    return;
  }
  
  // Fuerza CODIGO como texto (muy importante)
  const data = productos.map(p => ({
    CODIGO: "" + String(p.CODIGO),
    DESCRIPCION: p.DESCRIPCION
  }));
  
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Maestra_Productos");
  
  const excel = XLSX.write(wb, {
    bookType: "xlsx",
    type: "array"
  });
  
  const blob = new Blob([excel], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "maestra_productos.xlsx";
  a.click();
  
  URL.revokeObjectURL(url);
  }
  

  

/* ===================== PROTEGER RECARGA ===================== */
window.addEventListener("beforeunload", e => {
  const est = JSON.parse(localStorage.getItem("estadoImportacion") || "null");
  if (est && est.enProceso) {
    e.preventDefault();
    e.returnValue = "";
  }
});

/* ===================== INPUTS MANUALES ===================== */
["codigo","descripcion","ubicacion","cantidad","operador"].forEach(id=>{
  const el = document.getElementById(id);
  if(!el) return;

  el.addEventListener("focus", ()=>{
    // el teclado aparece SOLO si el usuario toca el input
  });
});



/* =====================================================
   FLUJO PRO INPUT ↔ SCANNER
   1 TAP = TECLADO
   2 TAP = SCANNER
   ===================================================== */

(function(){

  const DOUBLE_TAP_DELAY = 350; // ms
  let lastTap = 0;

  function manejarTapInput(e){
    const input = e.currentTarget;
    const now = Date.now();
    const diff = now - lastTap;
    lastTap = now;

    // === DOBLE TAP → SCANNER ===
    if (diff < DOUBLE_TAP_DELAY) {
      e.preventDefault();

      // cerrar teclado
      input.blur();

      // activar scanner según input
      if (input.id === "codigo") {
        activarScan("codigo");
      }

      if (input.id === "ubicacion") {
        activarScan("ubicacion");
      }

      return;
    }

    // === TAP SIMPLE → TECLADO ===
    cerrarScanner?.(); // cierra scanner si está activo
    input.removeAttribute("readonly");
    input.focus();
  }

  function prepararInput(id){
    const input = document.getElementById(id);
    if (!input) return;

    // editable por defecto
    input.removeAttribute("readonly");

    input.addEventListener("touchend", manejarTapInput);
    input.addEventListener("click", manejarTapInput);
  }

  // aplica SOLO a los inputs que usan scanner
  ["codigo", "ubicacion"].forEach(prepararInput);

})();

/* =====================================================
   BOTÓN ⌨️ TOGGLE TECLADO ⇄ SCANNER (FINAL)
   ===================================================== */

(function(){

  let ultimoInputScanner = null;
  let tecladoActivo = false;

  /* ===== helpers ===== */
  function bloquearInput(input){
    input.setAttribute("readonly", "true");
    input.blur();
    tecladoActivo = false;
  }

  function habilitarInput(input){
    input.removeAttribute("readonly");
    input.focus();
    tecladoActivo = true;
  }

  /* ===== envolver activarScan ===== */
  const activarScanBase = window.activarScan;

  window.activarScan = function(tipo){
    ultimoInputScanner = tipo;
    activarScanBase(tipo);
    observarOverlayScanner();
  };

  /* ===== observar overlay del scanner ===== */
  function observarOverlayScanner(){

    const box = document.getElementById("scannerBox");
    if (!box) return;

    const observer = new MutationObserver(() => {

      const overlay = box.querySelector(".scanner-overlay");
      if (!overlay) return;

      if (overlay.querySelector(".scanner-btn.keyboard")) return;

      const btn = document.createElement("button");
      btn.className = "scanner-btn keyboard";
      btn.innerText = "⌨️";

      btn.onclick = () => {

        const input = document.getElementById(ultimoInputScanner);
        if (!input) return;

        // ===== TOGGLE =====
        if (!tecladoActivo) {
          // abrir teclado
          cerrarScanner?.();
          setTimeout(() => habilitarInput(input), 120);
        } else {
          // cerrar teclado y volver a scanner
          bloquearInput(input);
          setTimeout(() => activarScan(ultimoInputScanner), 120);
        }
      };

      overlay.appendChild(btn);
      observer.disconnect();
    });

    observer.observe(box, { childList:true, subtree:true });
  }

  /* ===== bloquear inputs por defecto ===== */
  ["codigo","ubicacion"].forEach(id=>{
    const input = document.getElementById(id);
    if (input) bloquearInput(input);
  });

})();


/* =====================================================
   BOTÓN ⌨️ TECLADO – FIX DEFINITIVO (INFALIBLE)
   ===================================================== */

(function(){

  let ultimoInput = null;

  // envolvemos activarScan SIN romperlo
  const activarScanOriginal = window.activarScan;

  window.activarScan = function(tipo){
    ultimoInput = tipo;
    activarScanOriginal(tipo);
    esperarOverlayYAgregarBoton();
  };

  function esperarOverlayYAgregarBoton(){

    const box = document.getElementById("scannerBox");
    if (!box) return;

    // Observa SOLO este scannerBox
    const observer = new MutationObserver(() => {

      const overlay = box.querySelector(".scanner-overlay");
      if (!overlay) return;

      // si ya existe, no duplica
      if (overlay.querySelector(".scanner-btn.keyboard")) {
        observer.disconnect();
        return;
      }

      // CREA BOTÓN ⌨️
      const btn = document.createElement("button");
      btn.className = "scanner-btn keyboard";
      btn.textContent = "⌨️";

      btn.onclick = () => {
        cerrarScanner?.();
        const input = document.getElementById(ultimoInput);
        if (input) {
          setTimeout(() => {
            input.removeAttribute("readonly");
            input.focus();
          }, 150);
        }
      };

      overlay.appendChild(btn);
      observer.disconnect(); // YA ESTÁ
    });

    observer.observe(box, {
      childList: true,
      subtree: true
    });
  }

})();






/* =====================================================
   FIX DEFINITIVO
   DESKTOP: INPUT "codigo" SIEMPRE HABILITADO
   MOBILE: MANTIENE BLOQUEO + SCANNER
   ===================================================== */

// detectar mobile real
function esMobile(){
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

// forzar comportamiento correcto
document.addEventListener("DOMContentLoaded", () => {

  const inputCodigo = document.getElementById("codigo");
  const inputUbicacion = document.getElementById("ubicacion");

  // ===== ESCRITORIO =====
  if (!esMobile()) {

    if (inputCodigo) {
      inputCodigo.removeAttribute("readonly");
      inputCodigo.style.pointerEvents = "auto";
    }

    if (inputUbicacion) {
      inputUbicacion.removeAttribute("readonly");
      inputUbicacion.style.pointerEvents = "auto";
    }

    // seguridad extra: nunca volver a bloquear en desktop
    setInterval(() => {
      if (inputCodigo?.hasAttribute("readonly")) {
        inputCodigo.removeAttribute("readonly");
      }
    }, 500);

    return; // 🔴 corta aquí en escritorio
  }

  // ===== MOBILE (no se toca tu lógica existente) =====
});