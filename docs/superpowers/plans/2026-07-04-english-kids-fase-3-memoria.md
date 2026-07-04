# English Kids — Fase 3: Sprint 3 (Juego de memoria) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir un juego de memoria de encontrar parejas (palabra inglesa ↔ traducción española) con contador de movimientos, temporizador y animaciones.

**Architecture:** Un motor puro y testeable (`EK.memory`) que maneja el tablero, el estado de cartas volteadas, las parejas y los movimientos (sin depender del tiempo), separado del render del DOM (`EK.ui`, que además maneja el temporizador con `setInterval`) y del ruteo (`EK.app`). El azar es inyectable para tests.

**Tech Stack:** JavaScript ES6 (scripts clásicos, `window.EK`), CSS3 (tokens de fases previas). Sin frameworks, sin build, sin npm.

## Global Constraints

- **Sin frameworks, sin Node, sin npm, sin build**. Abre con doble clic (file://) y como PWA en HTTPS.
- **NO usar import/export**: extender `window.EK`.
- Reutilizar tokens/clases CSS (`.ek-view`, `.ek-back`, `.ek-btn*`, `.ek-card`, `.ek-quiz__head`, `.ek-quiz__result`, `.ek-quiz__score`, `.ek-quiz__pct`, `.ek-nav__count`, `.ek-actions`, variables `--color-*`, `--surface*`, `--text*`, `--radius`, `--border`).
- Juego: emparejar la carta en **inglés** con su carta en **español** (misma palabra). Tablero de **6 parejas (12 cartas)** por defecto.
- Mostrar **movimientos** y **tiempo** (segundos). Al completar: pantalla de resultado con movimientos y tiempo, y botones Reintentar / Inicio.
- Animaciones: transición CSS al voltear/emparejar (reutiliza `.ek-icon-btn`-style transitions; clases nuevas `.ek-mem-*`).
- El azar del motor es inyectable (`EK.memory._setRng(fn)`); por defecto `Math.random`.
- Subir la caché del service worker a `english-kids-v5` y añadir `js/memory.js` a `CORE`.
- Tests de navegador (`tests/tests.html`), lógica verificada con shim de Node.

## Interfaces existentes que se consumen

- `EK.words` (112 `{id,en,es:[...],...}`).
- `EK.ui.el`, `EK.ui.render(route)`, patrón de vistas; `EK.app.parseHash/route`.
- CSS/tokens de fases 0-2.

---

## Estructura de archivos (Fase 3)

- Create: `js/memory.js` — `EK.memory`: motor del juego de parejas.
- Modify: `js/ui.js` — `renderMemory`, temporizador (`startMemoryTimer`/`stopMemoryTimer`), `startMemory`; caso `"memory"` en `render`; botón "Memoria" en `renderHome`.
- Modify: `js/app.js` — `route`: al entrar en `#memory` arranca el juego + temporizador; limpia el temporizador al navegar.
- Modify: `index.html` — cargar `js/memory.js` antes de `js/ui.js`.
- Modify: `service-worker.js` — `CACHE = "english-kids-v5"`; añadir `js/memory.js` a `CORE`.
- Modify: `css/styles.css` — tablero y cartas de memoria (con transiciones).
- Create: `tests/memory.test.js` — pruebas del motor.
- Modify: `tests/tests.html` — cargar `js/memory.js` y `memory.test.js`.

Orden de carga final: `storage → words → speech → settings → progress → favorites → study → quiz → memory → ui → app`.

---

### Task 1: `memory.js` — motor del juego de parejas

**Files:**
- Create: `js/memory.js`
- Create: `tests/memory.test.js`
- Modify: `tests/tests.html`

**Interfaces:**
- Consumes: `EK.words`.
- Produces:
  - `EK.memory.start(pairs)` → número de cartas (default 6 parejas = 12 cartas); baraja y reinicia estado.
  - `EK.memory.cards()` → array de `{ wordId, kind: "en"|"es", text }` (en el orden barajado del tablero).
  - `EK.memory.revealedIndices()` → array (copia) de índices actualmente boca-arriba sin emparejar (0..2).
  - `EK.memory.isMatched(i)` → boolean.
  - `EK.memory.moves()` → número de intentos (parejas volteadas).
  - `EK.memory.isDone()` → boolean (todas emparejadas).
  - `EK.memory.flip(i)` → `{ status: "revealed"|"match"|"mismatch"|"ignored", done?, moves? }`.
  - `EK.memory.clearMismatch()` → void (baja las 2 cartas de un desacierto pendiente).
  - `EK.memory._setRng(fn)` — inyecta el azar (tests).

- [ ] **Step 1: Escribir la prueba que falla `tests/memory.test.js`**

```js
(function () {
  "use strict";

  // Localiza los dos índices de cartas que forman una pareja (mismo wordId).
  function findPair(cards) {
    for (var i = 0; i < cards.length; i++) {
      for (var j = i + 1; j < cards.length; j++) {
        if (cards[i].wordId === cards[j].wordId) return [i, j];
      }
    }
    return null;
  }
  // Localiza dos índices que NO forman pareja.
  function findNonPair(cards) {
    for (var i = 0; i < cards.length; i++) {
      for (var j = i + 1; j < cards.length; j++) {
        if (cards[i].wordId !== cards[j].wordId) return [i, j];
      }
    }
    return null;
  }

  EKTest.test("memory.start: 6 parejas = 12 cartas, cada palabra 2 veces (en+es)", function () {
    EK.memory._setRng(function () { return 0; });
    var n = EK.memory.start(6);
    EKTest.assertEqual(n, 12, "12 cartas");
    EKTest.assertEqual(EK.memory.cards().length, 12, "cards() 12");
    var counts = {};
    EK.memory.cards().forEach(function (c) { counts[c.wordId] = (counts[c.wordId] || 0) + 1; });
    var pairs = Object.keys(counts);
    EKTest.assertEqual(pairs.length, 6, "6 palabras");
    EKTest.assert(pairs.every(function (k) { return counts[k] === 2; }), "cada palabra 2 cartas");
  });

  EKTest.test("memory.flip: pareja correcta queda emparejada, cuenta 1 movimiento", function () {
    EK.memory._setRng(function () { return 0; });
    EK.memory.start(6);
    var p = findPair(EK.memory.cards());
    EKTest.assertEqual(EK.memory.flip(p[0]).status, "revealed", "primera carta revelada");
    var r = EK.memory.flip(p[1]);
    EKTest.assertEqual(r.status, "match", "match");
    EKTest.assertEqual(EK.memory.moves(), 1, "1 movimiento");
    EKTest.assert(EK.memory.isMatched(p[0]) && EK.memory.isMatched(p[1]), "ambas emparejadas");
  });

  EKTest.test("memory.flip: desacierto no empareja; clearMismatch las baja", function () {
    EK.memory._setRng(function () { return 0; });
    EK.memory.start(6);
    var np = findNonPair(EK.memory.cards());
    EK.memory.flip(np[0]);
    var r = EK.memory.flip(np[1]);
    EKTest.assertEqual(r.status, "mismatch", "mismatch");
    EKTest.assertEqual(EK.memory.revealedIndices().length, 2, "2 reveladas pendientes");
    EK.memory.clearMismatch();
    EKTest.assertEqual(EK.memory.revealedIndices().length, 0, "clearMismatch las baja");
  });

  EKTest.test("memory.flip: carta ya emparejada o repetida → ignored", function () {
    EK.memory._setRng(function () { return 0; });
    EK.memory.start(6);
    var p = findPair(EK.memory.cards());
    EK.memory.flip(p[0]); EK.memory.flip(p[1]); // emparejadas
    EKTest.assertEqual(EK.memory.flip(p[0]).status, "ignored", "carta emparejada ignorada");
  });

  EKTest.test("memory.isDone: true cuando todas las parejas se emparejan", function () {
    EK.memory._setRng(function () { return 0; });
    EK.memory.start(6);
    // Empareja todas: por cada wordId, voltea sus dos cartas.
    var cards = EK.memory.cards();
    var byWord = {};
    cards.forEach(function (c, i) { (byWord[c.wordId] = byWord[c.wordId] || []).push(i); });
    Object.keys(byWord).forEach(function (wid) {
      EK.memory.flip(byWord[wid][0]);
      EK.memory.flip(byWord[wid][1]);
    });
    EKTest.assert(EK.memory.isDone() === true, "juego completado");
  });
})();
```

- [ ] **Step 2: Verificar que falla**

Abrir `tests/tests.html`. Esperado: pruebas de memory en **rojo** (`EK.memory` no existe).

- [ ] **Step 3: Implementar `js/memory.js`**

```js
// Motor del juego de memoria: tablero de parejas inglés↔español.
window.EK = window.EK || {};

EK.memory = (function () {
  "use strict";

  var _rng = Math.random;
  var _cards = [];      // { wordId, kind:"en"|"es", text }
  var _revealed = [];   // índices boca-arriba sin emparejar (0..2)
  var _matched = {};    // índice -> true
  var _moves = 0;

  function rngInt(n) { return Math.floor(_rng() * n); }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = rngInt(i + 1);
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function sample(pool, n) { return shuffle(pool).slice(0, n); }

  function start(pairs) {
    pairs = pairs || 6;
    var words = sample(EK.words, Math.min(pairs, EK.words.length));
    var cards = [];
    words.forEach(function (w) {
      cards.push({ wordId: w.id, kind: "en", text: w.en });
      cards.push({ wordId: w.id, kind: "es", text: w.es[0] });
    });
    _cards = shuffle(cards);
    _revealed = [];
    _matched = {};
    _moves = 0;
    return _cards.length;
  }

  function cards() { return _cards; }
  function revealedIndices() { return _revealed.slice(); }
  function isMatched(i) { return !!_matched[i]; }
  function moves() { return _moves; }

  function matchedCount() {
    var n = 0;
    for (var k in _matched) { if (_matched.hasOwnProperty(k)) n++; }
    return n;
  }
  function isDone() { return _cards.length > 0 && matchedCount() === _cards.length; }

  function clearMismatch() {
    if (_revealed.length === 2) _revealed = [];
  }

  function flip(i) {
    if (i < 0 || i >= _cards.length) return { status: "ignored" };
    if (_matched[i]) return { status: "ignored" };
    // Si hay un desacierto pendiente (2 boca-arriba), bájalas antes de continuar.
    if (_revealed.length === 2) _revealed = [];
    if (_revealed.indexOf(i) !== -1) return { status: "ignored" };

    _revealed.push(i);
    if (_revealed.length < 2) return { status: "revealed" };

    _moves++;
    var a = _cards[_revealed[0]];
    var b = _cards[_revealed[1]];
    if (a.wordId === b.wordId) {
      _matched[_revealed[0]] = true;
      _matched[_revealed[1]] = true;
      _revealed = [];
      return { status: "match", done: isDone(), moves: _moves };
    }
    return { status: "mismatch", moves: _moves };
  }

  return {
    start: start, cards: cards, revealedIndices: revealedIndices,
    isMatched: isMatched, moves: moves, isDone: isDone,
    flip: flip, clearMismatch: clearMismatch,
    _setRng: function (fn) { _rng = fn; }
  };
})();
```

- [ ] **Step 4: Añadir módulo y suite a `tests/tests.html`**

En módulos, después de `<script src="../js/study.js"></script>` (o tras `quiz.js` si está): añadir `<script src="../js/memory.js"></script>`.
En suites, después de la última suite existente: añadir `<script src="memory.test.js"></script>`.

- [ ] **Step 5: Verificar que pasan**

Recargar `tests/tests.html`, o shim de Node: sandbox con `window` global; cargar `js/words.js` y `js/memory.js`; ejecutar las 5 pruebas. Esperado: **verde**. También `node --check js/memory.js`.

- [ ] **Step 6: Commit**

```bash
git add js/memory.js tests/memory.test.js tests/tests.html
git commit -m "feat: memory game engine (pairs, moves, match logic)"
```

---

### Task 2: `ui.js` — vista del juego + temporizador + CSS + botón en la home

**Files:**
- Modify: `js/ui.js`
- Modify: `css/styles.css`

**Interfaces:**
- Consumes: `EK.memory.*`, `EK.ui.el`.
- Produces: `EK.ui.renderMemory()`, `EK.ui.startMemory()`, `EK.ui.startMemoryTimer()`, `EK.ui.stopMemoryTimer()`; caso `"memory"` en `render`; botón "Memoria" en `renderHome`.

- [ ] **Step 1: Añadir las funciones de memoria dentro del IIFE de `js/ui.js`**

Insertar ANTES de la función `render`, reutilizando `el`, `clear`, `go`:

```js
  // ---- Juego de memoria ----
  var _memStart = 0, _memTimer = null, _memLocked = false;

  function memElapsed() {
    return _memStart ? Math.floor((Date.now() - _memStart) / 1000) : 0;
  }

  function stopMemoryTimer() {
    if (_memTimer) { clearInterval(_memTimer); _memTimer = null; }
  }

  function startMemoryTimer() {
    stopMemoryTimer();
    _memStart = Date.now();
    _memLocked = false;
    _memTimer = setInterval(function () {
      var elt = document.getElementById("ek-mem-time");
      if (elt) elt.textContent = memElapsed() + "s";
    }, 1000);
  }

  function startMemory() {
    EK.memory.start(6);
    startMemoryTimer();
    renderMemory();
  }

  function onMemFlip(i) {
    if (_memLocked) return;
    var res = EK.memory.flip(i);
    if (res.status === "ignored") return;
    renderMemory();
    if (res.status === "mismatch") {
      _memLocked = true;
      setTimeout(function () {
        EK.memory.clearMismatch();
        _memLocked = false;
        renderMemory();
      }, 900);
    }
  }

  function renderMemory() {
    var r = clear();
    var back = el("button", { class: "ek-back", onClick: function () { go("#home"); } }, ["← Inicio"]);
    var head = el("div", { class: "ek-quiz__head" }, [
      el("span", { class: "ek-nav__count", text: "Movimientos: " + EK.memory.moves() }),
      el("span", { class: "ek-nav__count", id: "ek-mem-time", text: memElapsed() + "s" })
    ]);

    var revealed = EK.memory.revealedIndices();
    var board = el("div", { class: "ek-mem-board" }, EK.memory.cards().map(function (card, i) {
      var up = EK.memory.isMatched(i) || revealed.indexOf(i) !== -1;
      var cls = "ek-mem-card" + (up ? " is-up" : "") + (EK.memory.isMatched(i) ? " is-matched" : "");
      return el("button", {
        class: cls,
        "aria-label": up ? card.text : "Carta oculta",
        onClick: function () { onMemFlip(i); }
      }, [up ? card.text : "?"]);
    }));

    var children = [back, head, board];

    if (EK.memory.isDone()) {
      stopMemoryTimer();
      children.push(el("div", { class: "ek-card ek-quiz__result" }, [
        el("div", { class: "ek-quiz__score", text: "¡Completado! 🎉" }),
        el("div", { class: "ek-quiz__pct", text: "Movimientos: " + EK.memory.moves() + " · Tiempo: " + memElapsed() + "s" })
      ]));
      children.push(el("div", { class: "ek-actions" }, [
        el("button", { class: "ek-btn", onClick: function () { startMemory(); } }, ["Reintentar"]),
        el("button", { class: "ek-btn ek-btn--muted", onClick: function () { stopMemoryTimer(); go("#home"); } }, ["Inicio"])
      ]));
    }

    r.appendChild(el("div", { class: "ek-view" }, children));
  }
```

- [ ] **Step 2: Actualizar `render` y `renderHome` en `js/ui.js`**

En `render`, añadir el caso `"memory"` (antes del `default`):
```js
      case "memory": renderMemory(); break;
```

En `renderHome`, reemplazar el bloque `var buttons = el("div", { class: "ek-actions" }, [ ... ]);` por (añade "Memoria"):
```js
    var buttons = el("div", { class: "ek-actions" }, [
      el("button", { class: "ek-btn", onClick: function () { go("#study"); } }, ["Estudiar"]),
      el("button", { class: "ek-btn ek-btn--blue", onClick: function () { go("#quiz"); } }, ["Examen"]),
      el("button", { class: "ek-btn ek-btn--blue", onClick: function () { go("#memory"); } }, ["Memoria"]),
      el("button", { class: "ek-btn ek-btn--blue", onClick: function () { go("#favorites"); } }, ["Favoritas"]),
      el("button", { class: "ek-btn ek-btn--muted", onClick: function () { go("#settings"); } }, ["Configuración"])
    ]);
```

En el `return { ... }` de `EK.ui`, añadir:
```js
    renderMemory: renderMemory,
    startMemory: startMemory,
    startMemoryTimer: startMemoryTimer,
    stopMemoryTimer: stopMemoryTimer,
```

- [ ] **Step 3: Añadir estilos a `css/styles.css`**

Añadir al FINAL de `css/styles.css`:
```css
/* ===== Fase 3: juego de memoria ===== */
.ek-mem-board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.ek-mem-card {
  aspect-ratio: 3 / 4; display: flex; align-items: center; justify-content: center;
  padding: 6px; text-align: center; font-weight: 800; font-size: 16px; word-break: break-word;
  border: 2px solid var(--color-blue); border-radius: var(--radius);
  background: var(--color-blue); color: #fff;
  transition: transform 0.12s ease, background 0.2s ease, opacity 0.2s ease, border-color 0.2s ease;
}
.ek-mem-card:active { transform: scale(0.96); }
.ek-mem-card.is-up { background: var(--surface); color: var(--text); }
.ek-mem-card.is-matched { background: var(--surface); color: var(--text); border-color: var(--color-green); opacity: 0.55; }
@media (min-width: 560px) {
  .ek-mem-board { grid-template-columns: repeat(4, 1fr); }
}
```

- [ ] **Step 4: Verificar sintaxis**

`node --check js/ui.js` (esperado: sin error). Confirmar llaves balanceadas en `css/styles.css`.

- [ ] **Step 5: Commit**

```bash
git add js/ui.js css/styles.css
git commit -m "feat: memory game view with timer, moves and home button"
```

---

### Task 3: `app.js` ruteo del juego + wiring (index.html, service-worker) + smoke

**Files:**
- Modify: `js/app.js`
- Modify: `index.html`
- Modify: `service-worker.js`

**Interfaces:**
- Consumes: `EK.ui.startMemory`, `EK.ui.stopMemoryTimer`, `EK.ui.render`.

- [ ] **Step 1: Actualizar `route` en `js/app.js`**

Reemplazar la función `route` por (añade limpieza del temporizador y arranque del juego):

```js
  function route() {
    var r = parseHash();
    EK.ui.stopMemoryTimer(); // limpia el temporizador al navegar a cualquier vista
    if (r.view === "study") {
      if (r.id != null) {
        EK.study.start(EK.words, r.id);
      } else {
        var last = EK.storage.get("lastWordId");
        EK.study.start(EK.words, last != null ? last : EK.words[0].id);
      }
    } else if (r.view === "quiz" && r.seg) {
      EK.quiz.start(r.seg);
      EK.ui.resetQuizFb();
    } else if (r.view === "memory") {
      EK.ui.startMemory(); // arranca juego + temporizador + render
      return;
    }
    EK.ui.render(r);
  }
```

- [ ] **Step 2: Cargar `js/memory.js` en `index.html`**

Insertar antes de `<script src="js/ui.js"></script>`:
```html
  <script src="js/memory.js"></script>
```
Orden: storage, words, speech, settings, progress, favorites, study, quiz, memory, ui, app.

- [ ] **Step 3: Actualizar el precache del `service-worker.js`**

Subir la versión a `english-kids-v5` y añadir `"js/memory.js"` a `CORE` (después de `"js/quiz.js"`). El array `CORE` debe quedar:
```js
var CACHE = "english-kids-v5";
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
- `index.html` carga los 11 scripts en orden; todos los paths de `CORE` existen.
- Smoke test bajo shim de Node (DOM funcional como en fases previas; además `window.setInterval = setInterval`, `window.clearInterval = clearInterval`, `window.setTimeout = setTimeout`; `Date.now` existe en Node): cargar los 11 scripts; `EK.app.init()`; `location.hash = "#memory"`; `EK.app.route()`; verificar que `#app` tiene ≥1 hijo y que hay 12 nodos con clase `ek-mem-card`. Luego: localizar una pareja (dos `ek-mem-card` cuyo `EK.memory.cards()[i].wordId` coincida), invocar el handler de click de ambas y confirmar `EK.memory.moves()===1` y ambas emparejadas. Al final llamar `EK.ui.stopMemoryTimer()` para no dejar el intervalo vivo. Reportar PASS/FAIL.

- [ ] **Step 5: Verificación manual del usuario (pendiente)**

En el navegador: Home muestra botón **Memoria** → tablero de 12 cartas boca abajo. Tocar dos: si coinciden quedan emparejadas (borde verde, atenuadas); si no, se voltean tras ~0.9 s. Contador de movimientos y tiempo suben. Al emparejar todas → pantalla "¡Completado!" con movimientos y tiempo, y Reintentar / Inicio.

- [ ] **Step 6: Commit**

```bash
git add js/app.js index.html service-worker.js
git commit -m "feat: memory routing and PWA wiring (service worker v5)"
```

---

## Self-Review

**Cobertura del spec (Sprint 3):**
- Juego de memoria, encontrar parejas → Tasks 1-3. ✅
- Parejas inglés↔español → `start` crea carta en+es por palabra; `flip` empareja por `wordId` (Task 1). ✅
- Contador (movimientos) → `moves()` + `renderMemory` (Tasks 1-2). ✅
- Tiempo → temporizador en `ui.js` (`startMemoryTimer`/`memElapsed`) (Task 2). ✅
- Animaciones → transiciones CSS `.ek-mem-card` (Task 2 Step 3). ✅
- Acceso desde la home → botón "Memoria" + ruta `#memory` (Tasks 2-3). ✅
- PWA offline con el nuevo archivo → `CORE` + `english-kids-v5` (Task 3). ✅

Fuera de alcance (fases siguientes): imágenes (Sprint 4), reconocimiento de voz (Sprint 5), gamificación (Sprint 6), "estudiar hoy" (Sprint 7). Dificultad configurable (nº de parejas) queda como posible mejora futura; por ahora 6 parejas fijas.

**Escaneo de placeholders:** sin TBD/TODO; cada paso trae código o comando concreto. ✅

**Consistencia de tipos:** `EK.memory.flip(i)` → `{status,...}` consumido por `onMemFlip`; `EK.memory.cards()` → `{wordId,kind,text}` consumido por `renderMemory`; `EK.ui.startMemory/stopMemoryTimer` usados por `route`; caso `"memory"` en `render` coincide con `parseHash().view`. El temporizador vive solo en `ui.js` (el motor no depende del tiempo → testeable). ✅
