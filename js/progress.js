// Seguimiento de palabras vistas y estadísticas de progreso.
window.EK = window.EK || {};

EK.progress = (function () {
  "use strict";

  function seenList() {
    var s = EK.storage.get("seen");
    return Array.isArray(s) ? s : [];
  }

  function markSeen(id) {
    var s = seenList();
    if (s.indexOf(id) === -1) {
      s.push(id);
      EK.storage.set("seen", s);
    }
  }

  function isSeen(id) {
    return seenList().indexOf(id) !== -1;
  }

  function stats() {
    var seen = seenList().length;
    var total = EK.words.length;
    var percent = total > 0 ? Math.round(seen / total * 100) : 0;
    return { seen: seen, total: total, percent: percent };
  }

  return { markSeen: markSeen, isSeen: isSeen, stats: stats };
})();
