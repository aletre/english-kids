# English Kids — Fase 1: Sprint 1 (App usable) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir la base de la Fase 0 en una app usable de punta a punta: pantalla principal con progreso y buscador, modo estudio con tarjetas y navegación (mouse/touch/teclado), favoritas, y configuración (tema/velocidad/idioma).

**Architecture:** Se separa la LÓGICA pura (settings, progress, favorites, study) —testeable bajo un shim de Node— del RENDER del DOM (`ui.js`) y de la ORQUESTACIÓN/ruteo (`app.js`). Todo extiende `window.EK` como scripts clásicos. El ruteo es por hash (`#home`, `#study`, `#study/<id>`, `#favorites`, `#settings`). El estado persiste vía `EK.storage` (Fase 0).

**Tech Stack:** HTML5, CSS3 (custom properties ya definidas en Fase 0), JavaScript ES6 (scripts clásicos), Web APIs: localStorage, SpeechSynthesis. Sin frameworks, sin build, sin npm.

## Global Constraints

- **Sin frameworks, sin Node, sin npm, sin build, sin servidor** para dev local. La app abre con doble clic en `index.html` (file://) y también corre como PWA en HTTPS.
- **NO usar import/export**: todos los módulos son scripts clásicos que extienden `window.EK`.
- Reutilizar los tokens/clases CSS de la Fase 0 (`.ek-btn`, `.ek-btn--blue`, `.ek-btn--muted`, `.ek-card`, `.ek-progress`, `.ek-progress__fill`, variables `--color-*`, `--surface*`, `--text*`, `--radius*`, `--tap`, `--space`). Añadir clases nuevas solo cuando haga falta.
- Paleta: verde `#58CC02`, azul `#1CB0F6`, amarillo `#FFD43B`.
- Navegación en modo estudio por **mouse, touch y teclado**: `←` anterior, `→` siguiente, `Espacio` pronunciar, `Enter` siguiente.
- Velocidad lenta del botón 🐢 = `0.55` (usa `EK.speech.speakSlow`). La velocidad de configuración afecta al botón 🔊 normal.
- Idiomas de voz: `en-US` (default) y `en-GB`. Temas: `light` (default) y `dark`.
- Progreso = palabras vistas / 112. Una palabra se marca "vista" al mostrarse en modo estudio.
- Estado en `localStorage` bajo `EK.state` (claves `seen`, `favorites`, `lastWordId`, `settings.{theme,speed,lang}`), ya definido por `EK.storage` (Fase 0).
- Los tests son de navegador (`tests/tests.html`); se verifican con un shim de Node (`vm` con `window`/`document`/`localStorage`) por ser entorno headless. Esto NO añade dependencia de Node a la app.

## Interfaces existentes (Fase 0) que este plan consume

- `EK.storage.load()`, `EK.storage.save(state)`, `EK.storage.get(path)`, `EK.storage.set(path, value)`, `EK.storage.reset()`, `EK.storage._backend` (inyectable en tests), `EK.storage.DEFAULTS` (incluye `settings:{theme:"light",speed:"normal",lang:"en-US"}`, `seen:[]`, `favorites:[]`, `lastWordId:null`).
- `EK.words` (array de 112 `{id, en, es:[...], emoji|null, category}`).
- `EK.wordUtils.byId(id)`, `EK.wordUtils.search(query)`, `EK.wordUtils.normalize(str)`, `EK.wordUtils.matchesAnswer(word,input)`.
- `EK.speech.speak(text, {rate})`, `EK.speech.speakSlow(text)`, `EK.speech.isSupported()`.
- CSS tokens/clases de la Fase 0 (ver Global Constraints).

---

## Estructura de archivos (Fase 1)

- Create: `js/settings.js` — `EK.settings`: tema/velocidad/idioma (persistencia), `applyTheme`, `rateFor`.
- Create: `js/progress.js` — `EK.progress`: marcar vistas y estadísticas de progreso.
- Create: `js/favorites.js` — `EK.favorites`: alternar/consultar/listar favoritas.
- Create: `js/study.js` — `EK.study`: controlador de sesión de estudio (lista + índice + navegación).
- Create: `js/ui.js` — `EK.ui`: render del DOM de todas las vistas + helper `badge`.
- Modify: `js/app.js` — orquestador: init (aplica tema), router por hash, teclado, arranque.
- Modify: `index.html` — cargar los nuevos scripts en orden de dependencia.
- Modify: `service-worker.js` — añadir los nuevos JS a la lista de precache (`CORE`) y subir la versión de caché.
- Modify: `css/styles.css` — clases nuevas para tarjeta de estudio, buscador, filas de favoritas y controles de settings.
- Create: `tests/settings.test.js`, `tests/progress.test.js`, `tests/favorites.test.js`, `tests/study.test.js`, `tests/ui.test.js`.
- Modify: `tests/tests.html` — cargar los nuevos módulos y suites.

Orden de carga final en `index.html`:
`storage.js → words.js → speech.js → settings.js → progress.js → favorites.js → study.js → ui.js → app.js`.

---

### Task 1: `settings.js` — tema, velocidad, idioma

**Files:**
- Create: `js/settings.js`
- Create: `tests/settings.test.js`
- Modify: `tests/tests.html`

**Interfaces:**
- Consumes: `EK.storage.get/set` (settings.theme|speed|lang).
- Produces:
  - `EK.settings.SPEEDS` — `{ "muy-lenta": 0.4, "lenta": 0.7, "normal": 1.0 }`.
  - `EK.settings.rateFor(speed)` → number (rate para SpeechSynthesis; `1.0` si `speed` desconocido).
  - `EK.settings.getTheme()`/`setTheme(theme)` — persiste y aplica (`applyTheme`).
  - `EK.settings.getSpeed()`/`setSpeed(speed)` — persiste.
  - `EK.settings.getLang()`/`setLang(lang)` — persiste.
  - `EK.settings.applyTheme(theme)` — `document.documentElement.setAttribute("data-theme", theme)`.

- [ ] **Step 1: Escribir la prueba que falla `tests/settings.test.js`**

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

  EKTest.test("settings.rateFor: mapea velocidades y default 1.0", function () {
    EKTest.assertEqual(EK.settings.rateFor("normal"), 1.0, "normal → 1.0");
    EKTest.assertEqual(EK.settings.rateFor("lenta"), 0.7, "lenta → 0.7");
    EKTest.assertEqual(EK.settings.rateFor("muy-lenta"), 0.4, "muy-lenta → 0.4");
    EKTest.assertEqual(EK.settings.rateFor("desconocida"), 1.0, "desconocida → 1.0");
  });

  EKTest.test("settings.get/set: persisten en storage", function () {
    EK.storage._backend = memBackend();
    EK.storage.load();
    EK.settings.setSpeed("lenta");
    EK.settings.setLang("en-GB");
    EKTest.assertEqual(EK.settings.getSpeed(), "lenta", "getSpeed refleja lo guardado");
    EKTest.assertEqual(EK.settings.getLang(), "en-GB", "getLang refleja lo guardado");
    EKTest.assertEqual(EK.storage.get("settings.speed"), "lenta", "storage tiene la velocidad");
  });

  EKTest.test("settings.setTheme + applyTheme: escribe data-theme", function () {
    EK.storage._backend = memBackend();
    EK.storage.load();
    EK.settings.setTheme("dark");
    EKTest.assertEqual(EK.settings.getTheme(), "dark", "getTheme = dark");
    EKTest.assertEqual(document.documentElement.getAttribute("data-theme"), "dark", "data-theme aplicado");
    EK.settings.setTheme("light"); // restaurar para no afectar otras suites
  });
})();
```

- [ ] **Step 2: Verificar que falla**

Abrir `tests/tests.html` (o correr el shim de Node). Esperado: las 3 pruebas de settings en **rojo** porque `EK.settings` no existe.

- [ ] **Step 3: Implementar `js/settings.js`**

```js
// Configuración del usuario: tema, velocidad de voz, idioma. Persiste vía EK.storage.
window.EK = window.EK || {};

EK.settings = (function () {
  "use strict";

  var SPEEDS = { "muy-lenta": 0.4, "lenta": 0.7, "normal": 1.0 };

  function rateFor(speed) {
    return Object.prototype.hasOwnProperty.call(SPEEDS, speed) ? SPEEDS[speed] : 1.0;
  }

  function applyTheme(theme) {
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }

  function getTheme() { return EK.storage.get("settings.theme"); }
  function setTheme(theme) { EK.storage.set("settings.theme", theme); applyTheme(theme); }

  function getSpeed() { return EK.storage.get("settings.speed"); }
  function setSpeed(speed) { EK.storage.set("settings.speed", speed); }

  function getLang() { return EK.storage.get("settings.lang"); }
  function setLang(lang) { EK.storage.set("settings.lang", lang); }

  return {
    SPEEDS: SPEEDS,
    rateFor: rateFor,
    applyTheme: applyTheme,
    getTheme: getTheme, setTheme: setTheme,
    getSpeed: getSpeed, setSpeed: setSpeed,
    getLang: getLang, setLang: setLang
  };
})();
```

- [ ] **Step 4: Añadir el módulo y la suite a `tests/tests.html`**

En `tests/tests.html`, dentro de la sección de "Módulos bajo prueba", después de `<script src="../js/words.js"></script>`, añadir:
```html
  <script src="../js/settings.js"></script>
```
Y en la sección de suites, después de `<script src="words.test.js"></script>`, añadir:
```html
  <script src="settings.test.js"></script>
```

- [ ] **Step 5: Verificar que pasan**

Recargar `tests/tests.html`. Esperado: las 3 pruebas de settings en **verde**. (Verificación por shim de Node: crear un sandbox `vm` donde `window` es el objeto global, con `document={documentElement:{_a:{},setAttribute:function(k,v){this._a[k]=v;},getAttribute:function(k){return this._a[k];}}}` y `localStorage` en memoria; cargar `storage.js`, `words.js`, `settings.js`, luego ejecutar los 3 escenarios como asserts. Mostrar GREEN.)

- [ ] **Step 6: Commit**

```bash
git add js/settings.js tests/settings.test.js tests/tests.html
git commit -m "feat: settings module (theme, speed, lang) with persistence"
```

---

### Task 2: `progress.js` — vistas y estadísticas

**Files:**
- Create: `js/progress.js`
- Create: `tests/progress.test.js`
- Modify: `tests/tests.html`

**Interfaces:**
- Consumes: `EK.storage.get/set` (clave `seen`), `EK.words` (total).
- Produces:
  - `EK.progress.markSeen(id)` — añade `id` a `seen` si no está (sin duplicados); persiste.
  - `EK.progress.isSeen(id)` → boolean.
  - `EK.progress.stats()` → `{ seen: number, total: number, percent: number }` (percent redondeado 0-100).

- [ ] **Step 1: Escribir la prueba que falla `tests/progress.test.js`**

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

  EKTest.test("progress.markSeen: sin duplicados y persiste", function () {
    EK.storage._backend = memBackend();
    EK.storage.load();
    EK.progress.markSeen(13);
    EK.progress.markSeen(13);
    EK.progress.markSeen(7);
    EKTest.assertDeepEqual(EK.storage.get("seen"), [13, 7], "seen sin duplicados, en orden");
  });

  EKTest.test("progress.isSeen: refleja el estado", function () {
    EK.storage._backend = memBackend();
    EK.storage.load();
    EK.progress.markSeen(5);
    EKTest.assert(EK.progress.isSeen(5) === true, "5 visto");
    EKTest.assert(EK.progress.isSeen(6) === false, "6 no visto");
  });

  EKTest.test("progress.stats: cuenta y porcentaje", function () {
    EK.storage._backend = memBackend();
    EK.storage.load();
    EK.progress.markSeen(1);
    EK.progress.markSeen(2);
    var s = EK.progress.stats();
    EKTest.assertEqual(s.total, EK.words.length, "total = 112");
    EKTest.assertEqual(s.seen, 2, "2 vistas");
    EKTest.assertEqual(s.percent, Math.round(2 / EK.words.length * 100), "porcentaje correcto");
  });
})();
```

- [ ] **Step 2: Verificar que falla**

Abrir `tests/tests.html`. Esperado: 3 pruebas de progress en **rojo**.

- [ ] **Step 3: Implementar `js/progress.js`**

```js
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
```

- [ ] **Step 4: Añadir módulo y suite a `tests/tests.html`**

Añadir en módulos: `<script src="../js/progress.js"></script>` (después de settings.js).
Añadir en suites: `<script src="progress.test.js"></script>` (después de settings.test.js).

- [ ] **Step 5: Verificar que pasan**

Recargar `tests/tests.html` (o shim de Node cargando storage.js, words.js, progress.js). Esperado: 3 en **verde**.

- [ ] **Step 6: Commit**

```bash
git add js/progress.js tests/progress.test.js tests/tests.html
git commit -m "feat: progress module (seen tracking and stats)"
```

---

### Task 3: `favorites.js` — favoritas

**Files:**
- Create: `js/favorites.js`
- Create: `tests/favorites.test.js`
- Modify: `tests/tests.html`

**Interfaces:**
- Consumes: `EK.storage.get/set` (clave `favorites`), `EK.wordUtils.byId`.
- Produces:
  - `EK.favorites.toggle(id)` → boolean (estado resultante: `true` si quedó marcada).
  - `EK.favorites.isFavorite(id)` → boolean.
  - `EK.favorites.list()` → array de objetos palabra (en el orden guardado; ignora ids inexistentes).

- [ ] **Step 1: Escribir la prueba que falla `tests/favorites.test.js`**

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

  EKTest.test("favorites.toggle: agrega y quita, devuelve estado", function () {
    EK.storage._backend = memBackend();
    EK.storage.load();
    EKTest.assertEqual(EK.favorites.toggle(13), true, "primer toggle marca");
    EKTest.assert(EK.favorites.isFavorite(13) === true, "queda favorita");
    EKTest.assertEqual(EK.favorites.toggle(13), false, "segundo toggle desmarca");
    EKTest.assert(EK.favorites.isFavorite(13) === false, "ya no es favorita");
  });

  EKTest.test("favorites.list: devuelve objetos palabra en orden e ignora ids inválidos", function () {
    EK.storage._backend = memBackend();
    EK.storage.load();
    EK.favorites.toggle(13); // butterfly
    EK.favorites.toggle(5);  // basketball
    EK.storage.set("favorites", [13, 99999, 5]); // 99999 no existe
    var list = EK.favorites.list();
    EKTest.assertEqual(list.length, 2, "ignora id inexistente");
    EKTest.assertEqual(list[0].en, "butterfly", "orden preservado (13 primero)");
    EKTest.assertEqual(list[1].en, "basketball", "5 después");
  });
})();
```

- [ ] **Step 2: Verificar que falla**

Abrir `tests/tests.html`. Esperado: 2 pruebas de favorites en **rojo**.

- [ ] **Step 3: Implementar `js/favorites.js`**

```js
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
```

- [ ] **Step 4: Añadir módulo y suite a `tests/tests.html`**

Añadir en módulos: `<script src="../js/favorites.js"></script>` (después de progress.js).
Añadir en suites: `<script src="favorites.test.js"></script>` (después de progress.test.js).

- [ ] **Step 5: Verificar que pasan**

Recargar `tests/tests.html` (o shim de Node cargando storage.js, words.js, favorites.js). Esperado: 2 en **verde**.

- [ ] **Step 6: Commit**

```bash
git add js/favorites.js tests/favorites.test.js tests/tests.html
git commit -m "feat: favorites module (toggle, query, list)"
```

---

### Task 4: `study.js` — controlador de sesión de estudio

**Files:**
- Create: `js/study.js`
- Create: `tests/study.test.js`
- Modify: `tests/tests.html`

**Interfaces:**
- Consumes: `EK.words`, `EK.progress.markSeen`, `EK.storage.set` (clave `lastWordId`).
- Produces:
  - `EK.study.start(list, startId)` — fija la lista (default `EK.words`) y el índice inicial (posición de `startId`, o 0); marca la palabra actual como vista y guarda `lastWordId`.
  - `EK.study.current()` → objeto palabra actual o `null`.
  - `EK.study.next()` → avanza (sin dar la vuelta; se detiene en el último); devuelve `current()`.
  - `EK.study.prev()` → retrocede (se detiene en el primero); devuelve `current()`.
  - `EK.study.goToId(id)` → salta a esa palabra si existe; devuelve `current()`.
  - `EK.study.index()` → índice 0-based actual.
  - `EK.study.total()` → tamaño de la lista.

- [ ] **Step 1: Escribir la prueba que falla `tests/study.test.js`**

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

  EKTest.test("study.start: arranca en el id dado y marca visto + lastWordId", function () {
    EK.storage._backend = memBackend();
    EK.storage.load();
    EK.study.start(EK.words, 13);
    EKTest.assertEqual(EK.study.current().id, 13, "arranca en 13");
    EKTest.assert(EK.progress.isSeen(13) === true, "13 marcado visto");
    EKTest.assertEqual(EK.storage.get("lastWordId"), 13, "lastWordId guardado");
    EKTest.assertEqual(EK.study.total(), 112, "total = 112");
  });

  EKTest.test("study.next/prev: navegan y se detienen en los extremos", function () {
    EK.storage._backend = memBackend();
    EK.storage.load();
    EK.study.start(EK.words, EK.words[0].id); // índice 0
    EKTest.assertEqual(EK.study.index(), 0, "empieza en 0");
    EK.study.prev();
    EKTest.assertEqual(EK.study.index(), 0, "prev en el primero se queda en 0");
    EK.study.next();
    EKTest.assertEqual(EK.study.index(), 1, "next avanza a 1");
    EKTest.assertEqual(EK.study.current().id, EK.words[1].id, "current coincide con la lista");
  });

  EKTest.test("study.goToId: salta y marca visto", function () {
    EK.storage._backend = memBackend();
    EK.storage.load();
    EK.study.start(EK.words, EK.words[0].id);
    EK.study.goToId(50);
    EKTest.assertEqual(EK.study.current().id, 50, "saltó a 50");
    EKTest.assert(EK.progress.isSeen(50) === true, "50 marcado visto");
  });
})();
```

- [ ] **Step 2: Verificar que falla**

Abrir `tests/tests.html`. Esperado: 3 pruebas de study en **rojo**.

- [ ] **Step 3: Implementar `js/study.js`**

```js
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
```

- [ ] **Step 4: Añadir módulo y suite a `tests/tests.html`**

Añadir en módulos: `<script src="../js/progress.js"></script>` ya está; añadir `<script src="../js/study.js"></script>` (después de favorites.js). (study depende de progress y storage, ya cargados.)
Añadir en suites: `<script src="study.test.js"></script>` (después de favorites.test.js).

- [ ] **Step 5: Verificar que pasan**

Recargar `tests/tests.html` (o shim de Node cargando storage.js, words.js, progress.js, study.js). Esperado: 3 en **verde**.

- [ ] **Step 6: Commit**

```bash
git add js/study.js tests/study.test.js tests/tests.html
git commit -m "feat: study session controller (navigation, seen, resume)"
```

---

### Task 5: `ui.js` — render del DOM y helper `badge`

**Files:**
- Create: `js/ui.js`
- Modify: `css/styles.css`
- Create: `tests/ui.test.js`
- Modify: `tests/tests.html`

**Interfaces:**
- Consumes: `EK.words`, `EK.wordUtils.search`, `EK.progress.stats`, `EK.favorites.*`, `EK.study.*`, `EK.settings.*`, `EK.speech.*`.
- Produces:
  - `EK.ui.colorForCategory(category)` → hex string (determinista).
  - `EK.ui.badge(word)` → `{ type: "emoji", value }` o `{ type: "initial", value, color }`.
  - `EK.ui.el(tag, attrs, children)` → HTMLElement (constructor DOM interno reutilizable).
  - `EK.ui.render(route)` — `route = { view, id }`; limpia `#app` y dibuja la vista.
  - `EK.ui.renderHome()`, `EK.ui.renderStudy()`, `EK.ui.renderFavorites()`, `EK.ui.renderSettings()`.

> Nota: `render*` manipulan el DOM y se verifican manualmente en el navegador (Step 6). Solo `colorForCategory` y `badge` son lógica pura y llevan prueba automatizada.

- [ ] **Step 1: Escribir la prueba que falla `tests/ui.test.js`**

```js
(function () {
  "use strict";

  EKTest.test("ui.badge: usa emoji cuando existe", function () {
    var b = EK.ui.badge({ id: 13, en: "butterfly", es: ["mariposa"], emoji: "🦋", category: "animals" });
    EKTest.assertEqual(b.type, "emoji", "tipo emoji");
    EKTest.assertEqual(b.value, "🦋", "valor emoji");
  });

  EKTest.test("ui.badge: usa inicial estilizada cuando no hay emoji", function () {
    var b = EK.ui.badge({ id: 1, en: "absence", es: ["ausencia"], emoji: null, category: "abstract" });
    EKTest.assertEqual(b.type, "initial", "tipo inicial");
    EKTest.assertEqual(b.value, "A", "inicial en mayúscula");
    EKTest.assert(typeof b.color === "string" && b.color.charAt(0) === "#", "color hex");
  });

  EKTest.test("ui.colorForCategory: determinista", function () {
    EKTest.assertEqual(
      EK.ui.colorForCategory("animals"),
      EK.ui.colorForCategory("animals"),
      "misma categoría → mismo color"
    );
  });
})();
```

- [ ] **Step 2: Verificar que falla**

Abrir `tests/tests.html`. Esperado: 3 pruebas de ui en **rojo**.

- [ ] **Step 3: Implementar `js/ui.js`**

```js
// Render del DOM de todas las vistas. Sin frameworks; construye nodos con `el`.
window.EK = window.EK || {};

EK.ui = (function () {
  "use strict";

  var PALETTE = ["#58CC02", "#1CB0F6", "#FFD43B", "#FF9600", "#CE82FF", "#FF4B4B", "#2FB8A0"];

  function colorForCategory(category) {
    var s = String(category || "");
    var sum = 0;
    for (var i = 0; i < s.length; i++) sum += s.charCodeAt(i);
    return PALETTE[sum % PALETTE.length];
  }

  function badge(word) {
    if (word && word.emoji) return { type: "emoji", value: word.emoji };
    var letter = (word && word.en ? word.en.charAt(0) : "?").toUpperCase();
    return { type: "initial", value: letter, color: colorForCategory(word && word.category) };
  }

  // Constructor DOM. attrs: class, text, html, aria-*, data-*, onClick/onInput (funciones).
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k === "html") node.innerHTML = v;
      else if (k.indexOf("on") === 0 && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
      else node.setAttribute(k, v);
    });
    (children || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function root() { return document.getElementById("app"); }

  function clear() {
    var r = root();
    while (r.firstChild) r.removeChild(r.firstChild);
    return r;
  }

  function go(hash) { location.hash = hash; }

  // Componente visual del badge (emoji grande o inicial en círculo de color).
  function badgeEl(word, sizeClass) {
    var b = badge(word);
    if (b.type === "emoji") {
      return el("div", { class: "ek-badge " + sizeClass, text: b.value });
    }
    var node = el("div", { class: "ek-badge ek-badge--initial " + sizeClass, text: b.value });
    node.style.background = b.color;
    return node;
  }

  // ---- Pantalla principal ----
  function renderHome() {
    var r = clear();
    var s = EK.progress.stats();

    var logo = el("img", { class: "ek-logo", src: "assets/logo.svg", alt: "English Kids" });

    var bar = el("div", { class: "ek-progress" }, [
      (function () {
        var fill = el("div", { class: "ek-progress__fill" });
        fill.style.width = s.percent + "%";
        return fill;
      })()
    ]);
    var progressText = el("p", { class: "ek-progress-text", text: s.percent + "% — " + s.seen + " de " + s.total + " palabras" });

    var searchInput = el("input", {
      class: "ek-search", type: "search", placeholder: "Buscar en inglés o español…",
      "aria-label": "Buscar palabra"
    });
    var results = el("div", { class: "ek-results" });
    searchInput.addEventListener("input", function () {
      var q = searchInput.value.trim();
      while (results.firstChild) results.removeChild(results.firstChild);
      if (q === "") return;
      EK.wordUtils.search(q).slice(0, 20).forEach(function (w) {
        results.appendChild(el("button", {
          class: "ek-result", onClick: function () { go("#study/" + w.id); }
        }, [ badgeEl(w, "ek-badge--sm"), el("span", { class: "ek-result__en", text: w.en }),
             el("span", { class: "ek-result__es", text: w.es.join(" / ") }) ]));
      });
    });

    var buttons = el("div", { class: "ek-actions" }, [
      el("button", { class: "ek-btn", onClick: function () { go("#study"); } }, ["Estudiar"]),
      el("button", { class: "ek-btn ek-btn--blue", onClick: function () { go("#favorites"); } }, ["Favoritas"]),
      el("button", { class: "ek-btn ek-btn--muted", onClick: function () { go("#settings"); } }, ["Configuración"])
    ]);

    r.appendChild(el("div", { class: "ek-home" }, [
      logo, bar, progressText, searchInput, results, buttons
    ]));
  }

  // ---- Modo estudio ----
  function speakNormal(text) {
    EK.speech.speak(text, { rate: EK.settings.rateFor(EK.settings.getSpeed()) });
  }

  function renderStudy() {
    var r = clear();
    var w = EK.study.current();
    if (!w) { r.appendChild(el("p", { text: "No hay palabras." })); return; }

    var fav = EK.favorites.isFavorite(w.id);

    var card = el("div", { class: "ek-card ek-study" }, [
      badgeEl(w, "ek-badge--lg"),
      el("h1", { class: "ek-word-en", text: w.en }),
      el("p", { class: "ek-word-es", text: w.es.join(" / ") }),
      el("div", { class: "ek-study__controls" }, [
        el("button", { class: "ek-icon-btn", "aria-label": "Pronunciar", onClick: function () { speakNormal(w.en); } }, ["🔊"]),
        el("button", { class: "ek-icon-btn", "aria-label": "Pronunciación lenta", onClick: function () { EK.speech.speakSlow(w.en); } }, ["🐢"]),
        el("button", {
          class: "ek-icon-btn" + (fav ? " is-active" : ""), "aria-label": "Favorita",
          onClick: function () { EK.favorites.toggle(w.id); renderStudy(); }
        }, [fav ? "⭐" : "☆"])
      ])
    ]);

    var nav = el("div", { class: "ek-nav" }, [
      el("button", { class: "ek-btn ek-btn--muted", "aria-label": "Anterior", onClick: function () { EK.study.prev(); renderStudy(); } }, ["◀"]),
      el("span", { class: "ek-nav__count", text: (EK.study.index() + 1) + " / " + EK.study.total() }),
      el("button", { class: "ek-btn ek-btn--muted", "aria-label": "Siguiente", onClick: function () { EK.study.next(); renderStudy(); } }, ["▶"])
    ]);

    var back = el("button", { class: "ek-back", onClick: function () { go("#home"); } }, ["← Inicio"]);

    r.appendChild(el("div", { class: "ek-view" }, [back, card, nav]));
  }

  // ---- Favoritas ----
  function renderFavorites() {
    var r = clear();
    var list = EK.favorites.list();
    var back = el("button", { class: "ek-back", onClick: function () { go("#home"); } }, ["← Inicio"]);

    var children = [back, el("h1", { class: "ek-title", text: "Favoritas" })];
    if (list.length === 0) {
      children.push(el("p", { class: "ek-empty", text: "Aún no tienes palabras favoritas. Marca una con ⭐ en modo estudio." }));
    } else {
      list.forEach(function (w) {
        children.push(el("div", { class: "ek-fav-row" }, [
          el("button", { class: "ek-fav-open", onClick: function () { go("#study/" + w.id); } }, [
            badgeEl(w, "ek-badge--sm"),
            el("span", { class: "ek-result__en", text: w.en }),
            el("span", { class: "ek-result__es", text: w.es.join(" / ") })
          ]),
          el("button", { class: "ek-icon-btn is-active", "aria-label": "Quitar de favoritas",
            onClick: function () { EK.favorites.toggle(w.id); renderFavorites(); } }, ["⭐"])
        ]));
      });
    }
    r.appendChild(el("div", { class: "ek-view" }, children));
  }

  // ---- Configuración ----
  function segButton(label, active, onClick) {
    return el("button", { class: "ek-seg" + (active ? " is-active" : ""), onClick: onClick }, [label]);
  }

  function renderSettings() {
    var r = clear();
    var back = el("button", { class: "ek-back", onClick: function () { go("#home"); } }, ["← Inicio"]);

    var theme = EK.settings.getTheme();
    var themeRow = el("div", { class: "ek-setting" }, [
      el("h2", { class: "ek-setting__label", text: "Tema" }),
      el("div", { class: "ek-seg-group" }, [
        segButton("Claro", theme === "light", function () { EK.settings.setTheme("light"); renderSettings(); }),
        segButton("Oscuro", theme === "dark", function () { EK.settings.setTheme("dark"); renderSettings(); })
      ])
    ]);

    var speed = EK.settings.getSpeed();
    var speedRow = el("div", { class: "ek-setting" }, [
      el("h2", { class: "ek-setting__label", text: "Velocidad" }),
      el("div", { class: "ek-seg-group" }, [
        segButton("Muy lenta", speed === "muy-lenta", function () { EK.settings.setSpeed("muy-lenta"); renderSettings(); }),
        segButton("Lenta", speed === "lenta", function () { EK.settings.setSpeed("lenta"); renderSettings(); }),
        segButton("Normal", speed === "normal", function () { EK.settings.setSpeed("normal"); renderSettings(); })
      ])
    ]);

    var lang = EK.settings.getLang();
    var langRow = el("div", { class: "ek-setting" }, [
      el("h2", { class: "ek-setting__label", text: "Idioma" }),
      el("div", { class: "ek-seg-group" }, [
        segButton("English US", lang === "en-US", function () { EK.settings.setLang("en-US"); renderSettings(); }),
        segButton("English UK", lang === "en-GB", function () { EK.settings.setLang("en-GB"); renderSettings(); })
      ])
    ]);

    r.appendChild(el("div", { class: "ek-view" }, [
      back, el("h1", { class: "ek-title", text: "Configuración" }), themeRow, speedRow, langRow
    ]));
  }

  function render(route) {
    switch (route && route.view) {
      case "study": renderStudy(); break;
      case "favorites": renderFavorites(); break;
      case "settings": renderSettings(); break;
      default: renderHome();
    }
  }

  return {
    colorForCategory: colorForCategory,
    badge: badge,
    el: el,
    render: render,
    renderHome: renderHome,
    renderStudy: renderStudy,
    renderFavorites: renderFavorites,
    renderSettings: renderSettings
  };
})();
```

- [ ] **Step 4: Añadir estilos a `css/styles.css`**

Añadir al FINAL de `css/styles.css` (reutiliza tokens existentes):

```css
/* ===== Fase 1: vistas ===== */
.ek-view { display: flex; flex-direction: column; gap: var(--space); }
.ek-home { display: flex; flex-direction: column; gap: var(--space); align-items: stretch; }
.ek-logo { width: 96px; height: 96px; margin: 8px auto 0; }
.ek-title { font-size: 28px; font-weight: 800; }
.ek-back {
  align-self: flex-start; background: none; border: none; color: var(--color-blue);
  font-weight: 800; font-size: 16px; padding: 8px 0;
}
.ek-progress-text { text-align: center; color: var(--text-muted); font-weight: 700; margin-top: -6px; }

/* Buscador */
.ek-search {
  width: 100%; min-height: var(--tap); padding: 0 18px; font: inherit;
  border: 2px solid var(--border); border-radius: var(--radius);
  background: var(--surface); color: var(--text);
}
.ek-results { display: flex; flex-direction: column; gap: 8px; }
.ek-result, .ek-fav-open {
  display: flex; align-items: center; gap: 12px; width: 100%; text-align: left;
  background: var(--surface); border: 2px solid var(--border); border-radius: var(--radius);
  padding: 10px 14px; color: var(--text);
}
.ek-result__en { font-weight: 800; }
.ek-result__es { color: var(--text-muted); margin-left: auto; }

/* Botones grandes de la home */
.ek-actions { display: flex; flex-direction: column; gap: 12px; margin-top: 8px; }

/* Badge (emoji / inicial) */
.ek-badge { display: flex; align-items: center; justify-content: center; line-height: 1; }
.ek-badge--initial { color: #fff; font-weight: 800; border-radius: 999px; }
.ek-badge--lg { font-size: 96px; width: 140px; height: 140px; margin: 0 auto; }
.ek-badge--sm { font-size: 28px; width: 44px; height: 44px; border-radius: 12px; }
.ek-badge--initial.ek-badge--lg { font-size: 72px; }

/* Tarjeta de estudio */
.ek-study { display: flex; flex-direction: column; gap: 12px; align-items: center; }
.ek-word-en { font-size: 40px; font-weight: 800; }
.ek-word-es { font-size: 22px; color: var(--text-muted); }
.ek-study__controls { display: flex; gap: 14px; margin-top: 6px; }
.ek-icon-btn {
  min-width: var(--tap); min-height: var(--tap); font-size: 24px;
  border: 2px solid var(--border); border-radius: var(--radius);
  background: var(--surface); color: var(--text);
}
.ek-icon-btn.is-active { background: var(--color-yellow); border-color: var(--color-yellow); }

/* Navegación de estudio */
.ek-nav { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.ek-nav .ek-btn { min-width: 72px; }
.ek-nav__count { font-weight: 800; color: var(--text-muted); }

/* Favoritas */
.ek-fav-row { display: flex; align-items: center; gap: 10px; }
.ek-fav-open { flex: 1; }
.ek-empty { color: var(--text-muted); text-align: center; padding: 24px 0; }

/* Configuración */
.ek-setting { display: flex; flex-direction: column; gap: 8px; }
.ek-setting__label { font-size: 18px; font-weight: 800; }
.ek-seg-group { display: flex; flex-wrap: wrap; gap: 8px; }
.ek-seg {
  min-height: var(--tap); padding: 0 18px; font: inherit; font-weight: 800;
  border: 2px solid var(--border); border-radius: var(--radius);
  background: var(--surface); color: var(--text);
}
.ek-seg.is-active { background: var(--color-green); border-color: var(--color-green); color: #fff; }
```

- [ ] **Step 5: Añadir módulo y suite a `tests/tests.html`**

Añadir en módulos: `<script src="../js/settings.js"></script>` (ya en Task 1), `<script src="../js/progress.js"></script>` y `<script src="../js/favorites.js"></script>` (ya cargados), y `<script src="../js/ui.js"></script>` (después de study.js).
Añadir en suites: `<script src="ui.test.js"></script>` (después de study.test.js).

- [ ] **Step 6: Verificar**

- Automatizado (shim de Node con `document` completo — createElement debe devolver un stub con `appendChild`, `setAttribute`, `style`, `textContent`, `addEventListener`, `className`, `firstChild/removeChild`; para las pruebas solo se ejercitan `badge` y `colorForCategory`, que no tocan el DOM): las 3 pruebas de ui en **verde**.
- Manual (navegador, se completará en Task 6 cuando `app.js` monte las vistas).

- [ ] **Step 7: Commit**

```bash
git add js/ui.js css/styles.css tests/ui.test.js tests/tests.html
git commit -m "feat: UI rendering for home, study, favorites, settings"
```

---

### Task 6: `app.js` orquestador + router + teclado; wiring (index.html, service-worker)

**Files:**
- Modify: `js/app.js`
- Modify: `index.html`
- Modify: `service-worker.js`

**Interfaces:**
- Consumes: `EK.storage.load`, `EK.settings.applyTheme/getTheme`, `EK.study.start`, `EK.ui.render`, `EK.study.next/prev`, `EK.speech.speak`, `EK.words`.
- Produces: `EK.app.init()` (bootstrap completo), `EK.app.route()` (lee el hash y dibuja).

- [ ] **Step 1: Implementar `js/app.js` (reemplaza el contenido de Fase 0)**

```js
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
```

- [ ] **Step 2: Actualizar el orden de scripts en `index.html`**

Reemplazar el bloque de `<script src=...>` (antes de la etiqueta inline del service worker) por:
```html
  <script src="js/storage.js"></script>
  <script src="js/words.js"></script>
  <script src="js/speech.js"></script>
  <script src="js/settings.js"></script>
  <script src="js/progress.js"></script>
  <script src="js/favorites.js"></script>
  <script src="js/study.js"></script>
  <script src="js/ui.js"></script>
  <script src="js/app.js"></script>
```

- [ ] **Step 3: Actualizar el precache del `service-worker.js`**

En `service-worker.js`: subir la versión de caché a `english-kids-v2` y añadir los nuevos JS a `CORE`. El array `CORE` debe quedar exactamente:
```js
var CACHE = "english-kids-v2";
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
  "js/ui.js",
  "js/app.js",
  "manifest.webmanifest",
  "assets/logo.svg",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png"
];
```

- [ ] **Step 4: Verificar sintaxis**

Correr `node --check js/app.js` (esperado: sin error) y `node --check service-worker.js`.

- [ ] **Step 5: Verificación manual en el navegador (flujo de punta a punta)**

Abrir `index.html` con doble clic y confirmar:
- La **home** muestra logo, barra de progreso ("0% — 0 de 112 palabras" al inicio), buscador y 3 botones grandes.
- **Estudiar** → aparece la tarjeta de la primera palabra; `◀ 1 / 112 ▶` funciona con clic y con teclado (← →). `Espacio` pronuncia; `🐢` pronuncia lento; `🔊` pronuncia normal.
- Al navegar, la barra de progreso de la home sube (volver con "← Inicio").
- **Buscar** "maripo" → aparece butterfly; clic lleva a su tarjeta.
- Marcar ⭐ en una palabra → aparece en **Favoritas**; quitarla la elimina de la lista.
- **Configuración** → cambiar a Oscuro cambia el tema al instante; recargar la página conserva el tema (persistencia). Cambiar velocidad/idioma persiste.
- Consola sin errores.

Anotar en el reporte los resultados (y cualquier navegador probado). Si no hay navegador disponible en el entorno, dejar constancia de que la verificación manual queda pendiente para el usuario y confirmar al menos que `node --check` pasa y que la lógica (Tasks 1-4) está en verde.

- [ ] **Step 6: Commit**

```bash
git add js/app.js index.html service-worker.js
git commit -m "feat: app orchestrator with hash router, keyboard nav and PWA wiring"
```

---

## Self-Review

**Cobertura del spec (Sprint 1):**
- Pantalla principal (logo, progreso, buscador, Estudiar, Favoritas, Configuración) → Task 5 (`renderHome`) + Task 6 (wiring). ✅
- Modo estudio con tarjeta (emoji/inicial, en, es, 🔊, 🐢, ⭐, `◀ n/112 ▶`) → Task 5 (`renderStudy`) + Task 4 (controlador). ✅
- Navegación mouse/touch/teclado (← → Espacio Enter) → Task 6 (`onKeydown`) + botones en Task 5. ✅
- Buscador por inglés y español → Task 5 (usa `EK.wordUtils.search`). ✅
- Favoritas con guardado automático → Task 3 + Task 5 (`renderFavorites`). ✅
- Barra de progreso (%, "X de 112") → Task 2 (`stats`) + Task 5. ✅
- Configuración (tema claro/oscuro, velocidad, idioma) → Task 1 + Task 5 (`renderSettings`). ✅
- Aplicar tema guardado al iniciar (hallazgo Fase 0) → Task 6 (`init` llama `applyTheme`). ✅
- Persistencia (progreso, favoritas, configuración, última palabra) → Tasks 1-4 vía `EK.storage`. ✅
- PWA sigue funcionando offline con los nuevos archivos → Task 6 (precache `CORE` actualizado, `english-kids-v2`). ✅

Fuera de alcance (fases siguientes): exámenes (Sprint 2), memoria (Sprint 3), imágenes (Sprint 4), reconocimiento de voz (Sprint 5), gamificación (Sprint 6), "estudiar hoy" (Sprint 7).

**Escaneo de placeholders:** sin TBD/TODO; cada paso trae código o comando concreto. ✅

**Consistencia de tipos:** `EK.study.start(list, startId)` usado igual en app.js y tests; `EK.progress.stats()` → `{seen,total,percent}` consumido por `renderHome`; `EK.favorites.list()` → objetos palabra consumido por `renderFavorites`; `EK.settings.rateFor(getSpeed())` consistente en `ui.js` y `app.js`; `EK.ui.render({view,id})` coincide con `parseHash()`. ✅
