// Orquestador: init (aplica tema), router por hash, teclado, arranque.
window.EK = window.EK || {};

EK.app = (function () {
  "use strict";

  function parseHash() {
    var h = (location.hash || "").replace(/^#\/?/, "");
    var parts = h.split("/");
    var id = parts[1] != null && parts[1] !== "" ? parseInt(parts[1], 10) : null;
    return { view: parts[0] || "home", id: isNaN(id) ? null : id };
  }

  function route() {
    var r = parseHash();
    if (r.view === "study") {
      if (r.id != null) {
        EK.study.start(EK.words, r.id);
      } else {
        var last = EK.storage.get("lastWordId");
        EK.study.start(EK.words, last != null ? last : EK.words[0].id);
      }
    }
    EK.ui.render(r);
  }

  function onKeydown(e) {
    if (parseHash().view !== "study") return;
    if (e.key === "ArrowRight" || e.key === "Enter") {
      e.preventDefault(); EK.study.next(); EK.ui.renderStudy();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault(); EK.study.prev(); EK.ui.renderStudy();
    } else if (e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      var w = EK.study.current();
      if (w) EK.speech.speak(w.en, { rate: EK.settings.rateFor(EK.settings.getSpeed()) });
    }
  }

  function init() {
    EK.storage.load();
    EK.settings.applyTheme(EK.settings.getTheme());
    window.addEventListener("hashchange", route);
    document.addEventListener("keydown", onKeydown);
    document.documentElement.setAttribute("data-app", "ready");
    route();
  }

  return { init: init, route: route };
})();

document.addEventListener("DOMContentLoaded", function () {
  EK.app.init();
});
