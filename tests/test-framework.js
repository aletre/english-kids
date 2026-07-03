// Mini arnés de pruebas en navegador. Sin dependencias.
// Uso: EKTest.test("nombre", () => { EKTest.assert(cond, "msg"); });
//      EKTest.run(document.getElementById("results"));
(function () {
  "use strict";
  var cases = [];

  function test(name, fn) {
    cases.push({ name: name, fn: fn });
  }

  function assert(cond, msg) {
    if (!cond) throw new Error(msg || "assert falló");
  }

  function assertEqual(actual, expected, msg) {
    if (actual !== expected) {
      throw new Error((msg || "assertEqual falló") + " — esperado: " + expected + ", obtenido: " + actual);
    }
  }

  function assertDeepEqual(actual, expected, msg) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error((msg || "assertDeepEqual falló") + " — esperado: " + JSON.stringify(expected) + ", obtenido: " + JSON.stringify(actual));
    }
  }

  function run(containerEl) {
    var passed = 0, failed = 0;
    cases.forEach(function (c) {
      var row = document.createElement("div");
      try {
        c.fn();
        passed++;
        row.textContent = "PASS — " + c.name;
        row.style.color = "green";
      } catch (e) {
        failed++;
        row.textContent = "FAIL — " + c.name + " :: " + e.message;
        row.style.color = "red";
      }
      containerEl.appendChild(row);
    });
    var summary = document.createElement("h2");
    summary.textContent = passed + " passed, " + failed + " failed";
    summary.style.color = failed === 0 ? "green" : "red";
    containerEl.insertBefore(summary, containerEl.firstChild);
    return { passed: passed, failed: failed };
  }

  window.EKTest = { test: test, assert: assert, assertEqual: assertEqual, assertDeepEqual: assertDeepEqual, run: run };
})();
