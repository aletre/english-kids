// Orquestador raíz. En Fase 0 solo inicializa el namespace y marca la app lista.
window.EK = window.EK || {};

EK.app = {
  init: function () {
    // Fase 1 conectará router y vistas aquí. Por ahora, base lista.
    document.documentElement.setAttribute("data-app", "ready");
  }
};

document.addEventListener("DOMContentLoaded", function () {
  EK.app.init();
});
