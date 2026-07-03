// Gestión de palabras favoritas. Persiste ids en storage; expone objetos palabra.
window.EK = window.EK || {};

EK.favorites = (function () {
  "use strict";

  function ids() {
    var f = EK.storage.get("favorites");
    return Array.isArray(f) ? f : [];
  }

  function isFavorite(id) {
    return ids().indexOf(id) !== -1;
  }

  function toggle(id) {
    var f = ids();
    var i = f.indexOf(id);
    if (i === -1) { f.push(id); } else { f.splice(i, 1); }
    EK.storage.set("favorites", f);
    return i === -1; // true si quedó marcada
  }

  function list() {
    return ids()
      .map(function (id) { return EK.wordUtils.byId(id); })
      .filter(function (w) { return !!w; });
  }

  return { toggle: toggle, isFavorite: isFavorite, list: list };
})();
