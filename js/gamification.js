// Gamificación: XP, nivel, racha y logros. Derivado del estado persistido.
window.EK = window.EK || {};

EK.gamification = (function () {
  "use strict";

  var XP_PER_WORD = 10;
  var XP_PER_LEVEL = 100;

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function today() { return iso(new Date()); }
  function prevDay(s) {
    var p = s.split("-");
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    d.setDate(d.getDate() - 1);
    return iso(d);
  }

  function seenCount() {
    var s = EK.storage.get("seen");
    return Array.isArray(s) ? s.length : 0;
  }
  function bestQuiz() { return EK.storage.get("stats.bestQuiz") || 0; }
  function studyDays() {
    var d = EK.storage.get("stats.studyDays");
    return Array.isArray(d) ? d : [];
  }

  function xp() { return seenCount() * XP_PER_WORD + bestQuiz(); }
  function levelForXp(x) { return Math.floor(x / XP_PER_LEVEL) + 1; }

  function currentStreak(days, todayStr) {
    if (!Array.isArray(days) || days.length === 0) return 0;
    var set = {};
    days.forEach(function (d) { set[d] = true; });
    if (!set[todayStr]) return 0;
    var streak = 0, cur = todayStr;
    while (set[cur]) { streak++; cur = prevDay(cur); }
    return streak;
  }

  function recordToday(todayStr) {
    todayStr = todayStr || today();
    var days = studyDays();
    if (days.indexOf(todayStr) === -1) {
      days.push(todayStr);
      EK.storage.set("stats.studyDays", days);
    }
    return currentStreak(days, todayStr);
  }

  function summary() {
    var x = xp();
    var lvl = levelForXp(x);
    var xpInLevel = x - (lvl - 1) * XP_PER_LEVEL;
    var percent = Math.round(xpInLevel / XP_PER_LEVEL * 100);
    return {
      xp: x, level: lvl, xpInLevel: xpInLevel, xpForLevel: XP_PER_LEVEL,
      percent: percent, streak: currentStreak(studyDays(), today()), seen: seenCount()
    };
  }

  function achievements() {
    var seen = seenCount();
    var best = bestQuiz();
    var streak = currentStreak(studyDays(), today());
    return [
      { id: "w25", emoji: "🥉", label: "25 palabras", unlocked: seen >= 25 },
      { id: "w50", emoji: "🥈", label: "50 palabras", unlocked: seen >= 50 },
      { id: "w100", emoji: "🥇", label: "100 palabras", unlocked: seen >= 100 },
      { id: "quiz80", emoji: "🎯", label: "Examen 80%+", unlocked: best >= 80 },
      { id: "quiz100", emoji: "🏆", label: "Examen perfecto", unlocked: best >= 100 },
      { id: "streak3", emoji: "🔥", label: "Racha de 3 días", unlocked: streak >= 3 }
    ];
  }

  return {
    levelForXp: levelForXp, xp: xp, currentStreak: currentStreak,
    recordToday: recordToday, summary: summary, achievements: achievements, today: today
  };
})();
