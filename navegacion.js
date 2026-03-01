/* =====================================================
   NAVEGACIÓN TIPO WAZE – SOLO JS
   Buscador + Ruta automática
===================================================== */

(function(){

  let routingControl = null;
  let currentPosition = null;

  /* ===============================
     CARGA DINÁMICA DE LIBRERÍAS
  =============================== */
  function loadScript(src, cb){
    const s = document.createElement('script');
    s.src = src;
    s.onload = cb;
    document.head.appendChild(s);
  }

  function loadCSS(href){
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    document.head.appendChild(l);
  }

  loadCSS('https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.css');
  loadScript('https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.js', initNav);

  /* ===============================
     INIT
  =============================== */
  function initNav(){
    if(!window.mapa){
      console.warn('Mapa no encontrado');
      return;
    }

    /* =========================
       BUSCADOR
    ========================= */
    const searchControl = L.Control.geocoder({
      defaultMarkGeocode:false
    })
    .on('markgeocode', e=>{
      const dest = e.geocode.center;
      crearRuta(dest);
    })
    .addTo(mapa);

    /* =========================
       GPS ACTUAL
    ========================= */
    navigator.geolocation.watchPosition(pos=>{
      currentPosition = L.latLng(
        pos.coords.latitude,
        pos.coords.longitude
      );

      if(routingControl){
        routingControl.spliceWaypoints(0,1,currentPosition);
      }

    },{
      enableHighAccuracy:true,
      maximumAge:1000
    });
  }

  /* ===============================
     RUTA
  =============================== */
  function crearRuta(destino){

    if(!currentPosition){
      alert('Ubicación actual no disponible');
      return;
    }

    if(routingControl){
      mapa.removeControl(routingControl);
    }

    routingControl = L.Routing.control({
      waypoints:[
        currentPosition,
        destino
      ],
      routeWhileDragging:false,
      addWaypoints:false,
      draggableWaypoints:false,
      show:false,
      lineOptions:{
        styles:[
          { color:'#2563eb', weight:6 },
          { color:'#60a5fa', weight:4 }
        ]
      },
      router:L.Routing.osrmv1({
        serviceUrl:'https://router.project-osrm.org/route/v1'
      })
    }).addTo(mapa);
  }

  /* ===============================
     API GLOBAL
  =============================== */
  window.activarNavegacion = function(){
    if(!window.mapa){
      console.warn('Mapa no inicializado');
    }
  };

})();