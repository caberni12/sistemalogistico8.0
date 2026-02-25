/* ===================================================
   SEGURIDAD FRONTEND – CAPA DE DISUASIÓN
   (NO REEMPLAZA SEGURIDAD BACKEND)
=================================================== */

(function(){

  /* ===================================================
     BLOQUEAR BOTONES DEL MOUSE
     button:
     0 = izquierdo
     1 = rueda / botón central
     2 = derecho
  =================================================== */
  document.addEventListener("mousedown", function(e){

    // Bloquear botón central (rueda / segundo click)
    if(e.button === 1){
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    }

    // Bloquear botón derecho
    if(e.button === 2){
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    }

  }, true); // <-- CAPTURING PHASE (CLAVE)

  /* ===================================================
     BLOQUEAR MENÚ CONTEXTUAL
  =================================================== */
  document.addEventListener("contextmenu", function(e){
    e.preventDefault();
    return false;
  }, true);

  /* ===================================================
     BLOQUEAR TECLAS
  =================================================== */
  document.addEventListener("keydown", function(e){

    // F12 / F11
    if(e.key === "F12" || e.key === "F11"){
      e.preventDefault();
      bloquear();
      return false;
    }

    // Ctrl + Shift + I / J / C
    if(e.ctrlKey && e.shiftKey && ["I","J","C"].includes(e.key.toUpperCase())){
      e.preventDefault();
      bloquear();
      return false;
    }

    // Ctrl + U (ver código fuente)
    if(e.ctrlKey && e.key.toUpperCase() === "U"){
      e.preventDefault();
      bloquear();
      return false;
    }

    // Ctrl + S
    if(e.ctrlKey && e.key.toUpperCase() === "S"){
      e.preventDefault();
      bloquear();
      return false;
    }

  }, true);

  /* ===================================================
     DETECTAR DEVTOOLS
  =================================================== */
  const threshold = 160;

  setInterval(function(){

    const w = window.outerWidth - window.innerWidth;
    const h = window.outerHeight - window.innerHeight;

    if(w > threshold || h > threshold){
      bloquear();
    }

  }, 1000);

  /* ===================================================
     ACCIÓN DE BLOQUEO
  =================================================== */
  function bloquear(){

    // No actuar si no hay sesión (ej: login.html)
    if(!localStorage.getItem("token")) return;

    try{
      localStorage.clear();
      sessionStorage.clear();
    }catch{}

    location.href = "index.html";
  }

})();
