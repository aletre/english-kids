# English Kids — Fase 6: Sprint 6 (Gamificación) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir gamificación: XP y niveles, medallas/logros y racha de días de estudio, visibles en la pantalla principal y en una vista de Logros.

**Architecture:** Un motor `EK.gamification` que **deriva** XP/nivel/logros del estado ya persistido (palabras vistas, mejor examen) y calcula la racha a partir de los días de estudio; lo único nuevo que persiste es la lista de días de estudio (registrada al abrir la app). Esto evita acoplar la puntuación a estudio/examen/memoria y hace el motor puro y testeable. El render vive en `EK.ui` y el registro del día en `EK.app`.

**Tech Stack:** JavaScript ES6 (scripts clásicos, `window.EK`), CSS3 (tokens de fases previas). Sin frameworks, sin build, sin npm.

## Global Constraints

- **Sin frameworks, sin Node, sin npm, sin build**. Abre con doble clic (file://) y como PWA en HTTPS.
- **NO usar import/export**: extender `window.EK`.
- Reutilizar tokens/clases CSS (`.ek-view`, `.ek-back`, `.ek-title`, `.ek-card`, `.ek-progress*`, `.ek-quiz__result/score/pct`, `.ek-actions`, variables `--color-*`, `--surface*`, `--text*`, `--radius`, `--border`).
- Medallas por palabras vistas: 🥉 25, 🥈 50, 🥇 100 (del spec). Además: examen (🎯 80%+, 🏆 100%) y racha (🔥 3 días).
- XP = (palabras vistas × 10) + mejor examen. Nivel = `floor(xp/100) + 1`.
- Racha = días de estudio consecutivos terminando hoy (0 si hoy no está registrado).
- El azar/tiempo: el cálculo de racha usa fechas `YYYY-MM-DD`; las funciones aceptan la fecha "hoy" como parámetro para tests deterministas.
- Subir la caché del service worker a `english-kids-v6` y añadir `js/gamification.js` a `CORE`.
- Tests de navegador (`tests/tests.html`), lógica verificada con shim de Node.

## Interfaces existentes que se consumen

- `EK.storage.get/set` (claves `seen`, `stats.bestQuiz`, `stats.studyDays`; ya en DEFAULTS: `stats:{bestQuiz:0,studyDays:[]}`, `gamification:{xp,level,achievements,streak}`).
- `EK.ui.el`, `EK.ui.render(route)`, `renderHome`; `EK.app.init/route`.
- CSS/tokens de fases 0-3.

---

## Estructura de archivos (Fase 6)

- Create: `js/gamification.js` — `EK.gamification`: XP, nivel, racha, logros (derivado del estado).
- Modify: `js/ui.js` — franja de nivel/XP/racha en `renderHome` (clickable → `#achievements`); `renderAchievements`; caso `"achievements"` en `render`.
- Modify: `js/app.js` — registrar el día de estudio en `init`.
- Modify: `index.html` — cargar `js/gamification.js` antes de `js/ui.js`.
- Modify: `service-worker.js` — `CACHE = "english-kids-v6"`; añadir `js/gamification.js` a `CORE`.
- Modify: `css/styles.css` — franja de gamificación y grilla de logros.
- Create: `tests/gamification.test.js` — pruebas del motor.
- Modify: `tests/tests.html` — cargar `js/gamification.js` y `gamification.test.js`.

Orden de carga final: `storage → words → speech → settings → progress → favorites → study → quiz → memory → gamification → ui → app`.

---

### Task 1: `gamification.js` — motor de XP, nivel, racha y logros

**Files:**
- Create: `js/gamification.js`
- Create: `tests/gamification.test.js`
- Modify: `tests/tests.html`

**Interfaces:**
- Consumes: `EK.storage.get/set` (`seen`, `stats.bestQuiz`, `stats.studyDays`).
- Produces:
  - `EK.gamification.levelForXp(xp)` → number (nivel 1-based; `floor(xp/100)+1`).
  - `EK.gamification.xp()` → number (palabras vistas × 10 + mejor examen).
  - `EK.gamification.currentStreak(days, todayStr)` → number (días consecutivos terminando en `todayStr`).
  - `EK.gamification.recordToday(todayStr)` → number (añade `todayStr` a `stats.studyDays` si falta; persiste; devuelve la racha).
  - `EK.gamification.summary()` → `{ xp, level, xpInLevel, xpForLevel, percent, streak, seen }`.
  - `EK.gamification.achievements()` → array de `{ id, emoji, label, unlocked }`.
  - `EK.gamification.today()` → string `YYYY-MM-DD` (fecha de hoy).

- [ ] **Step 1: Escribir la prueba que falla `tests/gamification.test.js`**

```js
(function () {
  "use strict";

  function memBackend() {
    var d = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(d, k) ? d[k] : null; },
      setItem: function (k, v) { d[k] = String(v); },
      removeItem: function (k) { delete d[k]; }
    };
  }

  EKTest.test("gamification.levelForXp: 100 XP por nivel", function () {
    EKTest.assertEqual(EK.gamification.levelForXp(0), 1, "0 → nivel 1");
    EKTest.assertEqual(EK.gamification.levelForXp(99), 1, "99 → nivel 1");
    EKTest.assertEqual(EK.gamification.levelForXp(100), 2, "100 → nivel 2");
    EKTest.assertEqual(EK.gamification.levelForXp(250), 3, "250 → nivel 3");
  });

  EKTest.test("gamification.currentStreak: días consecutivos terminando hoy", function () {
    EKTest.assertEqual(
      EK.gamification.currentStreak(["2026-07-02", "2026-07-03", "2026-07-04"], "2026-07-04"), 3, "3 seguidos");
    EKTest.assertEqual(
      EK.gamification.currentStreak(["2026-07-01", "2026-07-04"], "2026-07-04"), 1, "con hueco → 1");
    EKTest.assertEqual(EK.gamification.currentStreak([], "2026-07-04"), 0, "vacío → 0");
    EKTest.assertEqual(
      EK.gamification.currentStreak(["2026-07-02", "2026-07-03"], "2026-07-04"), 0, "hoy ausente → 0");
  });

  EKTest.test("gamification.recordToday: agrega día (sin duplicar) y devuelve racha", function () {
    EK.storage._backend = memBackend(); EK.storage.load();
    EK.storage.set("stats.studyDays", ["2026-07-02", "2026-07-03"]);
    var streak = EK.gamification.recordToday("2026-07-04");
    EKTest.assertEqual(streak, 3, "racha 3");
    EKTest.assertDeepEqual(EK.storage.get("stats.studyDays"), ["2026-07-02", "2026-07-03", "2026-07-04"], "día agregado");
    EK.gamification.recordToday("2026-07-04"); // idempotente
    EKTest.assertEqual(EK.storage.get("stats.studyDays").length, 3, "sin duplicar");
  });

  EKTest.test("gamification.summary: XP = vistas×10 + mejor examen", function () {
    EK.storage._backend = memBackend(); EK.storage.load();
    EK.storage.set("seen", [1, 2, 3]);
    EK.storage.set("stats.bestQuiz", 50);
    var s = EK.gamification.summary();
    EKTest.assertEqual(s.xp, 80, "3×10 + 50 = 80");
    EKTest.assertEqual(s.level, 1, "nivel 1");
    EKTest.assertEqual(s.seen, 3, "3 vistas");
    EKTest.assertEqual(s.percent, 80, "80% del nivel");
  });

  EKTest.test("gamification.achievements: desbloqueo por umbrales", function () {
    EK.storage._backend = memBackend(); EK.storage.load();
    var seen = [];
    for (var i = 1; i <= 30; i++) seen.push(i);
    EK.storage.set("seen", seen);
    EK.storage.set("stats.bestQuiz", 100);
    var a = EK.gamification.achievements();
    function byId(id) { return a.filter(function (x) { return x.id === id; })[0]; }
    EKTest.assert(byId("w25").unlocked === true, "25 palabras desbloqueado");
    EKTest.assert(byId("w50").unlocked === false, "50 palabras bloqueado");
    EKTest.assert(byId("quiz100").unlocked === true, "examen perfecto desbloqueado");
  });
})();
```

- [ ] **Step 2: Verificar que falla**

Abrir `tests/tests.html`. Esperado: pruebas de gamification en **rojo** (`EK.gamification` no existe).

- [ ] **Step 3: Implementar `js/gamification.js`**

```js
// Gamificación: XP, nivel, racha y logros. Derivado del estado persistido.
window.EK = window.EK || {};

EK.gamification = (function () {
  "use strict";

  var XP_PER_WORD = 10;
  var XP_PER_LEVEL = 100;

  function iso(d) { return d.toISOString().slice(0, 10); }
  function today() { return iso(new Date()); }
  function prevDay(s) {
    var d = new Date(s + "T00:00:00");
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
```

- [ ] **Step 4: Añadir módulo y suite a `tests/tests.html`**

En módulos, después de `<script src="../js/memory.js"></script>`: añadir `<script src="../js/gamification.js"></script>`.
En suites, después de la última: añadir `<script src="gamification.test.js"></script>`.

- [ ] **Step 5: Verificar que pasan**

Recargar `tests/tests.html`, o shim de Node: sandbox con `window` global + `localStorage` en memoria; cargar `js/storage.js`, `js/words.js`, `js/gamification.js`; ejecutar las 5 pruebas. Esperado: **verde**. También `node --check js/gamification.js`.

- [ ] **Step 6: Commit**

```bash
git add js/gamification.js tests/gamification.test.js tests/tests.html
git commit -m "feat: gamification engine (xp, levels, streak, achievements)"
```

---

### Task 2: `ui.js` — franja de gamificación + vista de Logros + CSS

**Files:**
- Modify: `js/ui.js`
- Modify: `css/styles.css`

**Interfaces:**
- Consumes: `EK.gamification.summary`, `EK.gamification.achievements`, `EK.ui.el`.
- Produces: franja clickable en `renderHome`; `EK.ui.renderAchievements()`; caso `"achievements"` en `render`.

- [ ] **Step 1: Añadir `renderAchievements` dentro del IIFE de `js/ui.js`**

Insertar ANTES de `function render(route)`:

```js
  // ---- Logros ----
  function gamiStrip() {
    var g = EK.gamification.summary();
    var fill = el("div", { class: "ek-gami__fill" });
    fill.style.width = g.percent + "%";
    return el("button", { class: "ek-gami", "aria-label": "Ver logros", onClick: function () { go("#achievements"); } }, [
      el("span", { class: "ek-gami__level", text: "Nivel " + g.level }),
      el("div", { class: "ek-gami__bar" }, [fill]),
      el("span", { class: "ek-gami__streak", text: "🔥 " + g.streak })
    ]);
  }

  function renderAchievements() {
    var r = clear();
    var back = el("button", { class: "ek-back", onClick: function () { go("#home"); } }, ["← Inicio"]);
    var g = EK.gamification.summary();
    var head = el("div", { class: "ek-card ek-quiz__result" }, [
      el("div", { class: "ek-quiz__score", text: "Nivel " + g.level }),
      el("div", { class: "ek-quiz__pct", text: g.xp + " XP · 🔥 " + g.streak + " días" })
    ]);
    var grid = el("div", { class: "ek-ach-grid" }, EK.gamification.achievements().map(function (a) {
      return el("div", { class: "ek-ach" + (a.unlocked ? " is-on" : "") }, [
        el("div", { class: "ek-ach__emoji", text: a.emoji }),
        el("div", { class: "ek-ach__label", text: a.label })
      ]);
    }));
    r.appendChild(el("div", { class: "ek-view" }, [
      back, el("h1", { class: "ek-title", text: "Logros" }), head, grid
    ]));
  }
```

- [ ] **Step 2: Añadir la franja a `renderHome` y el caso a `render` (`js/ui.js`)**

En `renderHome`, en el array de hijos de `.ek-home`, insertar `gamiStrip()` justo DESPUÉS de `progressText` y ANTES de `searchInput`. El `appendChild` de la home queda:
```js
    r.appendChild(el("div", { class: "ek-home" }, [
      logo, bar, progressText, gamiStrip(), searchInput, results, buttons
    ]));
```

En `render`, añadir el caso (antes del `default`):
```js
      case "achievements": renderAchievements(); break;
```

En el `return { ... }` de `EK.ui`, añadir:
```js
    renderAchievements: renderAchievements,
```

- [ ] **Step 3: Añadir estilos a `css/styles.css`**

Añadir al FINAL de `css/styles.css`:
```css
/* ===== Fase 6: gamificación ===== */
.ek-gami {
  display: flex; align-items: center; gap: 12px; width: 100%;
  background: var(--surface); border: 2px solid var(--border); border-radius: var(--radius);
  padding: 10px 14px; color: var(--text);
}
.ek-gami__level { font-weight: 800; white-space: nowrap; }
.ek-gami__bar { flex: 1; height: 12px; background: var(--surface-2); border-radius: 999px; overflow: hidden; }
.ek-gami__fill { height: 100%; width: 0%; background: var(--color-yellow); transition: width 0.3s ease; }
.ek-gami__streak { font-weight: 800; white-space: nowrap; }
.ek-ach-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.ek-ach {
  display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center;
  background: var(--surface); border: 2px solid var(--border); border-radius: var(--radius-lg);
  padding: 18px 10px; opacity: 0.45; filter: grayscale(1); transition: opacity 0.2s ease, filter 0.2s ease;
}
.ek-ach.is-on { opacity: 1; filter: none; border-color: var(--color-green); }
.ek-ach__emoji { font-size: 40px; line-height: 1; }
.ek-ach__label { font-weight: 800; font-size: 14px; }
@media (min-width: 560px) { .ek-ach-grid { grid-template-columns: repeat(3, 1fr); } }
```

- [ ] **Step 4: Verificar sintaxis**

`node --check js/ui.js` (esperado: sin error). Confirmar llaves balanceadas en `css/styles.css`.

- [ ] **Step 5: Commit**

```bash
git add js/ui.js css/styles.css
git commit -m "feat: gamification strip on home and achievements view"
```

---

### Task 3: `app.js` registro del día + wiring (index.html, service-worker) + smoke

**Files:**
- Modify: `js/app.js`
- Modify: `index.html`
- Modify: `service-worker.js`

**Interfaces:**
- Consumes: `EK.gamification.recordToday`, `EK.ui.render`.

- [ ] **Step 1: Registrar el día de estudio en `init` (`js/app.js`)**

En la función `init`, después de `EK.settings.applyTheme(EK.settings.getTheme());` y antes de registrar los listeners, añadir:
```js
    EK.gamification.recordToday(); // registra el día de hoy para la racha
```
(La función `init` completa mantiene el resto igual: load, applyTheme, recordToday, addEventListener hashchange/keydown, data-app=ready, route().)

- [ ] **Step 2: Cargar `js/gamification.js` en `index.html`**

Insertar antes de `<script src="js/ui.js"></script>`:
```html
  <script src="js/gamification.js"></script>
```
Orden: storage, words, speech, settings, progress, favorites, study, quiz, memory, gamification, ui, app.

- [ ] **Step 3: Actualizar el precache del `service-worker.js`**

Subir a `english-kids-v6` y añadir `"js/gamification.js"` a `CORE` (después de `"js/memory.js"`). `CORE` debe quedar:
```js
var CACHE = "english-kids-v6";
var CORE = [
  ".",
  "index.html",
  "css/styles.css",
  "js/storage.js",
  "js/words.js",
  "js/speech.js",
  "js/settings.js",
  "js/progress.js",
  "js/favorites.js",
  "js/study.js",
  "js/quiz.js",
  "js/memory.js",
  "js/gamification.js",
  "js/ui.js",
  "js/app.js",
  "manifest.webmanifest",
  "assets/logo.svg",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png"
];
```

- [ ] **Step 4: Verificar sintaxis + smoke test**

- `node --check js/app.js` y `node --check service-worker.js`.
- `index.html` carga los 12 scripts en orden; todos los paths de `CORE` existen.
- Smoke test bajo shim de Node (DOM funcional como en fases previas; `window.setTimeout/setInterval/clearInterval` definidos; `Date` disponible; `localStorage` en memoria; `speechSynthesis` undefined): cargar los 12 scripts; `EK.app.init()`; verificar que `stats.studyDays` contiene 1 fecha (recordToday se ejecutó). Luego `location.hash = "#home"`; `EK.app.route()`; verificar que `#app` contiene un nodo con clase `ek-gami`. Luego `location.hash = "#achievements"`; `EK.app.route()`; verificar que hay 6 nodos con clase `ek-ach`. Reportar PASS/FAIL.

- [ ] **Step 5: Verificación manual del usuario (pendiente)**

En el navegador: la home muestra la franja **Nivel N · barra XP · 🔥 racha**; al tocarla abre **Logros** con 6 medallas (las alcanzadas a color, las demás en gris). Al ver palabras/hacer exámenes, XP y nivel suben; volver otro día aumenta la racha.

- [ ] **Step 6: Commit**

```bash
git add js/app.js index.html service-worker.js
git commit -m "feat: record study day on init; gamification wiring (service worker v6)"
```

---

## Self-Review

**Cobertura del spec (Sprint 6):**
- Logros/medallas → `achievements()` (Task 1) + `renderAchievements` (Task 2). ✅
- Medallas 🥉25/🥈50/🥇100 → `achievements()` (Task 1). ✅
- Rachas → `currentStreak`/`recordToday` (Task 1) + registro en `init` (Task 3) + display (Task 2). ✅
- XP → `xp()`/`summary()` (Task 1) + franja (Task 2). ✅
- Niveles → `levelForXp` (Task 1) + franja/Logros (Task 2). ✅
- PWA offline con el nuevo archivo → `CORE` + `english-kids-v6` (Task 3). ✅

Fuera de alcance (fases siguientes): reconocimiento de voz (Sprint 5), "estudiar hoy" (Sprint 7). Nota: el Sprint 4 (ilustraciones) ya está cubierto por los emojis grandes de la tarjeta de estudio (decisión previa del proyecto).

**Escaneo de placeholders:** sin TBD/TODO; cada paso trae código o comando concreto. ✅

**Consistencia de tipos:** `EK.gamification.summary()` → `{xp,level,percent,streak,...}` consumido por `gamiStrip`/`renderAchievements`; `achievements()` → `{id,emoji,label,unlocked}` consumido por `renderAchievements`; `recordToday(todayStr?)` usado en `init` sin argumento (usa `today()`); caso `"achievements"` en `render` coincide con la ruta `#achievements`. El motor deriva del estado (no necesita hooks en estudio/examen/memoria). ✅
