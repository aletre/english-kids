// Controlador de la sesión de estudio: lista ordenada + índice + navegación.
window.EK = window.EK || {};

EK.study = (function () {
  "use strict";

  var _list = [];
  var _i = 0;

  // Marca la palabra actual como vista y recuerda la última vista.
  function land() {
    var w = current();
    if (w) {
      EK.progress.markSeen(w.id);
      EK.storage.set("lastWordId", w.id);
    }
  }

  function indexOfId(id) {
    for (var k = 0; k < _list.length; k++) {
      if (_list[k].id === id) return k;
    }
    return -1;
  }

  function start(list, startId) {
    _list = Array.isArray(list) && list.length ? list.slice() : EK.words.slice();
    var idx = startId != null ? indexOfId(startId) : -1;
    _i = idx >= 0 ? idx : 0;
    land();
    return current();
  }

  function current() {
    return _list.length ? _list[_i] : null;
  }

  function next() {
    if (_i < _list.length - 1) { _i++; land(); }
    return current();
  }

  function prev() {
    if (_i > 0) { _i--; land(); }
    return current();
  }

  function goToId(id) {
    var idx = indexOfId(id);
    if (idx >= 0) { _i = idx; land(); }
    return current();
  }

  function index() { return _i; }
  function total() { return _list.length; }

  return {
    start: start, current: current, next: next, prev: prev,
    goToId: goToId, index: index, total: total
  };
})();
