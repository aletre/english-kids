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
      el("button", { class: "ek-btn", onClick: function () { go("#today"); } }, ["Estudiar hoy"]),
      el("button", { class: "ek-btn ek-btn--blue", onClick: function () { go("#study"); } }, ["Estudiar"]),
      el("button", { class: "ek-btn ek-btn--blue", onClick: function () { go("#quiz"); } }, ["Examen"]),
      el("button", { class: "ek-btn ek-btn--blue", onClick: function () { go("#memory"); } }, ["Memoria"]),
      el("button", { class: "ek-btn ek-btn--blue", onClick: function () { go("#favorites"); } }, ["Favoritas"]),
      el("button", { class: "ek-btn ek-btn--muted", onClick: function () { go("#settings"); } }, ["Configuración"])
    ]);

    r.appendChild(el("div", { class: "ek-home" }, [
      logo, bar, progressText, gamiStrip(), searchInput, results, buttons
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
        el("button", { class: "ek-icon-btn", "aria-label": "Deletrear", onClick: function () { EK.speech.spell(w.en); } }, ["🔤"]),
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

  // ---- Examen ----
  var _quizFb = null; // { i, correct, expected } feedback de la pregunta respondida

  function renderQuizMenu() {
    _quizFb = null;
    var r = clear();
    var back = el("button", { class: "ek-back", onClick: function () { go("#home"); } }, ["← Inicio"]);
    r.appendChild(el("div", { class: "ek-view" }, [
      back,
      el("h1", { class: "ek-title", text: "Examen" }),
      el("p", { class: "ek-progress-text", text: "Elige una modalidad:" }),
      el("div", { class: "ek-actions" }, [
        el("button", { class: "ek-btn", onClick: function () { go("#quiz/choice"); } }, ["Opción múltiple"]),
        el("button", { class: "ek-btn ek-btn--blue", onClick: function () { go("#quiz/write"); } }, ["Escribir"]),
        el("button", { class: "ek-btn ek-btn--muted", onClick: function () { go("#quiz/listen"); } }, ["Escuchar"])
      ])
    ]));
  }

  function quizHeader() {
    return el("div", { class: "ek-quiz__head" }, [
      el("button", { class: "ek-back", onClick: function () { go("#quiz"); } }, ["← Examen"]),
      el("span", { class: "ek-nav__count", text: (EK.quiz.index() + 1) + " / " + EK.quiz.total() + " · Aciertos: " + EK.quiz.score() })
    ]);
  }

  function renderQuizResult() {
    var r = clear();
    var res = EK.quiz.result();
    var m = EK.quiz.mode();
    r.appendChild(el("div", { class: "ek-view" }, [
      el("h1", { class: "ek-title", text: "Resultado" }),
      el("div", { class: "ek-card ek-quiz__result" }, [
        el("div", { class: "ek-quiz__score", text: res.score + " / " + res.total }),
        el("div", { class: "ek-quiz__pct", text: res.percent + "%" })
      ]),
      el("div", { class: "ek-actions" }, [
        el("button", { class: "ek-btn", onClick: function () { _quizFb = null; go("#quiz/" + m); } }, ["Reintentar"]),
        el("button", { class: "ek-btn ek-btn--muted", onClick: function () { _quizFb = null; go("#home"); } }, ["Inicio"])
      ])
    ]));
  }

  function advanceQuiz() {
    _quizFb = null;
    if (EK.quiz.next() === null) { renderQuizResult(); }
    else { renderQuizQuestion(); }
  }

  function renderQuizQuestion() {
    var q = EK.quiz.current();
    if (!q) { renderQuizMenu(); return; }
    var r = clear();
    var answered = _quizFb && _quizFb.i === EK.quiz.index();

    var stimulus;
    if (q.mode === "listen") {
      stimulus = el("button", {
        class: "ek-icon-btn ek-quiz__play", "aria-label": "Escuchar de nuevo",
        onClick: function () { speakNormal(q.word.en); }
      }, ["🔊"]);
      if (!answered) speakNormal(q.word.en); // reproducir al mostrar
    } else {
      stimulus = el("h1", { class: "ek-word-en", text: q.prompt });
    }

    var body;
    if (q.mode === "write") {
      var input = el("input", {
        class: "ek-search ek-quiz__input", type: "text", "aria-label": "Tu respuesta",
        placeholder: "Escribe en español…", autocomplete: "off"
      });
      if (answered) { input.value = ""; input.setAttribute("disabled", "disabled"); }
      var check = el("button", { class: "ek-btn", onClick: function () {
        if (answered || input.value.trim() === "") return;
        _quizFb = { i: EK.quiz.index() };
        var res = EK.quiz.answer(input.value);
        _quizFb.correct = res.correct; _quizFb.expected = res.expected;
        renderQuizQuestion();
      } }, ["Comprobar"]);
      input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); check.click(); } });
      body = el("div", { class: "ek-quiz__write" }, [input, check]);
    } else {
      body = el("div", { class: "ek-quiz__options" }, q.options.map(function (opt, idx) {
        var cls = "ek-opt";
        if (answered) {
          if (opt.correct) cls += " is-correct";
          else if (_quizFb.chosen === idx) cls += " is-wrong";
        }
        return el("button", {
          class: cls,
          onClick: function () {
            if (answered) return;
            _quizFb = { i: EK.quiz.index(), chosen: idx };
            var res = EK.quiz.answer(idx);
            _quizFb.correct = res.correct; _quizFb.expected = res.expected;
            renderQuizQuestion();
          }
        }, [opt.text]);
      }));
    }

    var feedback = null;
    if (answered) {
      var okText = _quizFb.correct ? "¡Correcto! 🎉" : ("Respuesta: " + q.word.es.join(" / "));
      feedback = el("div", { class: "ek-quiz__fb " + (_quizFb.correct ? "is-correct" : "is-wrong"), text: okText });
    }

    var nextBtn = answered
      ? el("button", { class: "ek-btn ek-btn--blue", onClick: advanceQuiz },
          [EK.quiz.index() >= EK.quiz.total() - 1 ? "Ver resultado" : "Siguiente"])
      : null;

    r.appendChild(el("div", { class: "ek-view" }, [
      quizHeader(),
      el("div", { class: "ek-card ek-quiz" }, [stimulus, body, feedback]),
      nextBtn
    ]));
  }

  // ---- Juego de memoria ----
  var _memStart = 0, _memTimer = null, _memLocked = false, _memMismatchTO = null;

  function memElapsed() {
    return _memStart ? Math.floor((Date.now() - _memStart) / 1000) : 0;
  }

  function stopMemoryTimer() {
    if (_memTimer) { clearInterval(_memTimer); _memTimer = null; }
    if (_memMismatchTO) { clearTimeout(_memMismatchTO); _memMismatchTO = null; }
    _memLocked = false;
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
      _memMismatchTO = setTimeout(function () {
        _memMismatchTO = null;
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

  // ---- Estudiar hoy ----
  var _todayChosen = null;

  function renderTodayResult(r) {
    var res = EK.today.result();
    r.appendChild(el("div", { class: "ek-view" }, [
      el("h1", { class: "ek-title", text: "Estudiar hoy" }),
      el("div", { class: "ek-card ek-quiz__result" }, [
        el("div", { class: "ek-quiz__score", text: "¡Bien hecho! 🎉" }),
        el("div", { class: "ek-quiz__pct", text: "Aciertos: " + res.score + " / " + res.total + " · " + res.percent + "%" })
      ]),
      el("div", { class: "ek-actions" }, [
        el("button", { class: "ek-btn", onClick: function () { _todayChosen = null; EK.today.start(); renderToday(); } }, ["Repetir"]),
        el("button", { class: "ek-btn ek-btn--muted", onClick: function () { _todayChosen = null; go("#home"); } }, ["Inicio"])
      ])
    ]));
  }

  function renderToday() {
    var ph = EK.today.phase();
    var r = clear();
    if (ph === "result") { renderTodayResult(r); return; }

    var back = el("button", { class: "ek-back", onClick: function () { _todayChosen = null; go("#home"); } }, ["← Inicio"]);
    var labels = { learn: "Aprender", review: "Repasar", quiz: "Mini examen" };
    var head = el("div", { class: "ek-quiz__head" }, [
      el("span", { class: "ek-nav__count", text: labels[ph] }),
      el("span", { class: "ek-nav__count", text: (EK.today.index() + 1) + " / " + EK.today.total() })
    ]);

    if (ph === "learn" || ph === "review") {
      var w = EK.today.current();
      var card = el("div", { class: "ek-card ek-study" }, [
        badgeEl(w, "ek-badge--lg"),
        el("h1", { class: "ek-word-en", text: w.en }),
        el("p", { class: "ek-word-es", text: w.es.join(" / ") }),
        el("div", { class: "ek-study__controls" }, [
          el("button", { class: "ek-icon-btn", "aria-label": "Pronunciar", onClick: function () { speakNormal(w.en); } }, ["🔊"]),
          el("button", { class: "ek-icon-btn", "aria-label": "Pronunciación lenta", onClick: function () { EK.speech.speakSlow(w.en); } }, ["🐢"]),
          el("button", { class: "ek-icon-btn", "aria-label": "Deletrear", onClick: function () { EK.speech.spell(w.en); } }, ["🔤"])
        ])
      ]);
      var last = EK.today.index() >= EK.today.total() - 1;
      var label = ph === "review" && last ? "Ir al examen" : "Siguiente";
      var nextBtn = el("button", { class: "ek-btn ek-btn--blue", onClick: function () { EK.today.next(); renderToday(); } }, [label]);
      r.appendChild(el("div", { class: "ek-view" }, [back, head, card, nextBtn]));
      return;
    }

    // Fase quiz
    var q = EK.today.current();
    var isAnswered = EK.today.answered();
    var options = el("div", { class: "ek-quiz__options" }, q.options.map(function (opt, idx) {
      var cls = "ek-opt";
      if (isAnswered) {
        if (opt.correct) cls += " is-correct";
        else if (_todayChosen === idx) cls += " is-wrong";
      }
      return el("button", {
        class: cls,
        onClick: function () {
          if (EK.today.answered()) return;
          _todayChosen = idx;
          EK.today.answer(idx);
          renderToday();
        }
      }, [opt.text]);
    }));

    var feedback = null;
    if (isAnswered) {
      var correct = !!(q.options[_todayChosen] && q.options[_todayChosen].correct);
      feedback = el("div", { class: "ek-quiz__fb " + (correct ? "is-correct" : "is-wrong"),
        text: correct ? "¡Correcto! 🎉" : ("Respuesta: " + q.word.es.join(" / ")) });
    }

    var nextBtn2 = isAnswered
      ? el("button", { class: "ek-btn ek-btn--blue",
          onClick: function () { _todayChosen = null; EK.today.next(); renderToday(); } },
          [EK.today.index() >= EK.today.total() - 1 ? "Ver resultado" : "Siguiente"])
      : null;

    r.appendChild(el("div", { class: "ek-view" }, [
      back, head,
      el("div", { class: "ek-card ek-quiz" }, [el("h1", { class: "ek-word-en", text: q.prompt }), options, feedback]),
      nextBtn2
    ]));
  }

  function render(route) {
    switch (route && route.view) {
      case "study": renderStudy(); break;
      case "favorites": renderFavorites(); break;
      case "settings": renderSettings(); break;
      case "quiz": (route && route.seg) ? renderQuizQuestion() : renderQuizMenu(); break;
      case "memory": renderMemory(); break;
      case "achievements": renderAchievements(); break;
      case "today": renderToday(); break;
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
    renderSettings: renderSettings,
    renderQuizMenu: renderQuizMenu,
    renderQuizQuestion: renderQuizQuestion,
    renderQuizResult: renderQuizResult,
    resetQuizFb: function () { _quizFb = null; },
    renderMemory: renderMemory,
    startMemory: startMemory,
    startMemoryTimer: startMemoryTimer,
    stopMemoryTimer: stopMemoryTimer,
    renderAchievements: renderAchievements,
    renderToday: renderToday
  };
})();
