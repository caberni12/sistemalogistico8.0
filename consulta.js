/************************************************
API CLIENTES (Apps Script)
************************************************/
const API_CLIENTES = "https://script.google.com/macros/s/AKfycbwBXAYinS_ajquTOSSDCNC2XjH_3kwWRW0lHVERbUQdVPQwZzgJIq4r82Y_yeMyKdVQBA/exec";

/************************************************
DOM
************************************************/
const btnConsultarRut = document.getElementById("btnConsultarRut");
const inputRut = document.getElementById("mRutConsulta");
const msgConsulta = document.getElementById("consultaMsg");

/************************************************
CONSULTAR CLIENTE
************************************************/
btnConsultarRut.addEventListener("click", consultarCliente);

async function consultarCliente(){

const rut = inputRut.value.trim();

if(!rut){
msgConsulta.textContent = "Ingrese RUT";
inputRut.focus();
return;
}

msgConsulta.textContent = "Consultando cliente...";

try{

const url = API_CLIENTES + "?rut=" + encodeURIComponent(rut);

const res = await fetch(url);

if(!res.ok){
throw new Error("Error de conexión API");
}

const data = await res.json();

if(data.error){
msgConsulta.textContent = "Cliente no encontrado";
return;
}

/************************************************
CARGAR DATOS EN EL MODAL
************************************************/
document.getElementById("mCliente").value = data.cliente || "";
document.getElementById("mDireccion").value = data.direccion || "";

msgConsulta.textContent = "Cliente cargado";

}catch(err){

console.error("Error consulta cliente:", err);
msgConsulta.textContent = "Error consultando cliente";

}

}

/************************************************
CONSULTA AUTOMÁTICA AL PRESIONAR ENTER
************************************************/
inputRut.addEventListener("keypress", function(e){

if(e.key === "Enter"){
e.preventDefault();
consultarCliente();
}

});