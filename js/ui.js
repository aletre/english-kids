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
      el("button", { class: "ek-btn ek-btn--blue", onClick: function () { go("#quiz"); } }, ["Examen"]),
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

  function render(route) {
    switch (route && route.view) {
      case "study": renderStudy(); break;
      case "favorites": renderFavorites(); break;
      case "settings": renderSettings(); break;
      case "quiz": (route && route.seg) ? renderQuizQuestion() : renderQuizMenu(); break;
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
    resetQuizFb: function () { _quizFb = null; }
  };
})();
