// Persistencia sobre localStorage. Estado único bajo la clave "EK.state".
window.EK = window.EK || {};

EK.storage = (function () {
  "use strict";

  var KEY = "EK.state";

  var DEFAULTS = {
    seen: [],
    favorites: [],
    lastWordId: null,
    settings: { theme: "light", speed: "normal", lang: "en-US" },
    stats: { bestQuiz: 0, studyDays: [] },
    gamification: { xp: 0, level: 1, achievements: [], streak: 0 }
  };

  var _backend = window.localStorage;
  var _state = null;

  // Copia profunda sencilla vía JSON (el estado es solo datos serializables).
  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // Mezcla recursiva: base (defaults) + override (guardado). Rellena faltantes.
  function merge(base, override) {
    var out = clone(base);
    if (!override || typeof override !== "object") return out;
    Object.keys(override).forEach(function (k) {
      if (base[k] && typeof base[k] === "object" && !Array.isArray(base[k]) &&
          override[k] && typeof override[k] === "object" && !Array.isArray(override[k])) {
        out[k] = merge(base[k], override[k]);
      } else {
        out[k] = override[k];
      }
    });
    return out;
  }

  function load() {
    var raw = null;
    try { raw = api._backend.getItem(KEY); } catch (e) { raw = null; }
    var parsed = null;
    if (raw) {
      try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
    }
    _state = merge(DEFAULTS, parsed);
    return _state;
  }

  function save(state) {
    _state = state;
    try { api._backend.setItem(KEY, JSON.stringify(_state)); } catch (e) { /* cuota/priv mode */ }
  }

  function ensure() {
    if (_state === null) load();
    return _state;
  }

  function get(path) {
    var obj = ensure();
    var parts = path.split(".");
    for (var i = 0; i < parts.length; i++) {
      if (obj == null) return undefined;
      obj = obj[parts[i]];
    }
    return obj;
  }

  function set(path, value) {
    var obj = ensure();
    var parts = path.split(".");
    for (var i = 0; i < parts.length - 1; i++) {
      if (obj[parts[i]] == null || typeof obj[parts[i]] !== "object") obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = value;
    save(_state);
  }

  function reset() {
    try { api._backend.removeItem(KEY); } catch (e) { /* noop */ }
    _state = null;
  }

  var api = {
    DEFAULTS: DEFAULTS,
    _backend: _backend,
    load: load,
    save: save,
    get: get,
    set: set,
    reset: reset
  };
  return api;
})();
