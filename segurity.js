/* ===================================================
   DISUASIÓN FRONTEND
   (Bloqueo de teclas, mouse y devtools)
   NO maneja sesión
   COMPATIBLE PWA
=================================================== */

(function () {

  const DEVTOOLS_THRESHOLD = 160;

  /* ===================================================
     BLOQUEO DE MOUSE
  =================================================== */
  document.addEventListener("mousedown", e => {
    if (e.button === 1 || e.button === 2) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    }
  }, true);

  document.addEventListener("contextmenu", e => {
    e.preventDefault();
    return false;
  }, true);

  /* ===================================================
     BLOQUEO DE TECLAS
  =================================================== */
  document.addEventListener("keydown", e => {
    const key = e.key.toUpperCase();

    // F12 / F11
    if (key === "F12" || key === "F11") {
      e.preventDefault();
      return false;
    }

    // Ctrl + Shift + I / J / C / K
    if (e.ctrlKey && e.shiftKey && ["I", "J", "C", "K"].includes(key)) {
      e.preventDefault();
      return false;
    }

    // Ctrl / Cmd combinaciones comunes
    if (
      (e.ctrlKey && ["U", "S", "P", "F", "C"].includes(key)) ||
      (e.metaKey && ["U", "S", "P", "F"].includes(key))
    ) {
      e.preventDefault();
      return false;
    }

  }, true);

  /* ===================================================
     DETECCIÓN DE DEVTOOLS (DISUASIÓN)
  =================================================== */
  setInterval(() => {
    const w = window.outerWidth - window.innerWidth;
    const h = window.outerHeight - window.innerHeight;

    if (w > DEVTOOLS_THRESHOLD || h > DEVTOOLS_THRESHOLD) {
      console.warn("DevTools detectado");
    }
  }, 1000);

})();