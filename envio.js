/* ======================================================
   CONFIGURACIÓN
====================================================== */
const API = "https://script.google.com/macros/s/AKfycbxWQTDZK4Cc3abLR4ec2hoL1YGTquPmH1ucXm6WAIXuWJX3X9HJD1FiJpAaUtpm0pwFtQ/exec";

let RAW = [];
let FILT = [];
let EDIT = null;
let charts = {};
let currentFoto = "";
let cursorIndex = -1;
let VIEW_MODE = "tabla"; // tabla | curso

/* ======================================================
   HELPERS
====================================================== */
const isMobile = () => window.matchMedia("(max-width:768px)").matches;

function setLoading(btn, state){
  if(!btn) return;
  btn.disabled = state;
  btn.classList.toggle("loading", state);
}

function toBase64(file){
  return new Promise(resolve=>{
    const reader = new FileReader();
    reader.onload = ()=> resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function parseFechaCL(str){
  if(!str) return null;
  const [f,h] = str.split(" ");
  const [d,m,y] = f.split("-").map(Number);
  const [hh=0,mm=0] = (h||"0:0").split(":").map(Number);
  return new Date(y, m-1, d, hh, mm);
}

/* ======================================================
   STATUS BADGE
====================================================== */
function getStatusHTML(status){

  const map = {
    "RECIBIDO":   "#ff4d4f",
    "ENTREGADO":  "#22c55e",
    "EN RUTA":    "#f97316",
    "PENDIENTE":  "#3b82f6",
    "CANCELADO":  "#9ca3af"
  };

  const s = String(status || "").toUpperCase();
  const color = map[s] || "#fff";

  return `
    <span style="
      background:#000;
      color:${color};
      font-weight:700;
      padding:4px 10px;
      border-radius:8px;
      font-size:12px;
      display:inline-block;
    ">
      ${status || ""}
    </span>
  `;
}

/* ======================================================
   LOAD
====================================================== */
async function load(){
  try{
    const r = await fetch(API);
    RAW = await r.json();
    applyFilters();
  }catch(err){
    console.error("Error cargando datos:", err);
  }
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

    const pedido  = String(r.pedido ?? '').toLowerCase();
    const cliente = String(r.cliente ?? '').toLowerCase();
    const obs     = String(r.observaciones ?? '').toLowerCase();
    const status  = String(r.status ?? '');
    const fechaStr = r.fechaIngreso ?? null;

    const textOK = !q || (
      pedido.includes(q) ||
      cliente.includes(q) ||
      obs.includes(q)
    );

    const statusOK = !s || status === s;

    let fechaOK = true;
    if(d1 || d2){
      const fr = parseFechaCL(fechaStr);
      if(!fr) return false;
      if(d1 && fr < d1) fechaOK = false;
      if(d2 && fr > d2) fechaOK = false;
    }

    return textOK && statusOK && fechaOK;
  });

  cursorIndex = -1;
  render();
}