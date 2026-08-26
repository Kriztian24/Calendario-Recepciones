/* ============================================================
   patron.js - Bloqueo por patrón (M) hardcodeado
   ------------------------------------------------------------
   Patrón en forma de M sobre grid 3x3 numerado:
     1 2 3
     4 5 6
     7 8 9
   El valor se guarda aquí en claro (visible en fuente). Para
   cambiarlo edita App.PATRON. Ej. '71539' = 7-1-5-3-9 (M).
   Solo bloquea la pantalla (no la API), para no afectar servicios
   externos que consulten /api/proveedores.
   ============================================================ */
var App = (window.App = window.App || {});
// M = 7 -> 1 -> 5 -> 3 -> 9 (puedes cambiarlo, ej. '12369')
App.PATRON = "74153698";

(function () {
  const STORAGE_KEY = "desbloqueado";
  let seq = [];
  let drawing = false;

  function $(id) {
    return document.getElementById(id);
  }

  function isUnlocked() {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function setUnlocked(v) {
    try {
      if (v) sessionStorage.setItem(STORAGE_KEY, "1");
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }

  function showOverlay(show) {
    const el = $("bloqueoPatron");
    if (!el) return;
    el.classList.toggle("hidden", !show);
  }

  function clearSeq() {
    seq = [];
    document.querySelectorAll("#patronGrid .punto").forEach(function (b) {
      b.classList.remove("activo", "error");
    });
    drawLines();
    const msg = $("patronMsg");
    if (msg) msg.textContent = "";
  }

  function drawLines() {
    const svg = $("patronSvg");
    const grid = $("patronGrid");
    if (!svg || !grid) return;
    svg.innerHTML = "";
    if (seq.length < 2) return;
    const rect = grid.getBoundingClientRect();
    function centerOf(p) {
      const el = grid.querySelector('.punto[data-p="' + p + '"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: r.left + r.width / 2 - rect.left,
        y: r.top + r.height / 2 - rect.top,
      };
    }
    let d = "";
    for (let i = 0; i < seq.length; i++) {
      const c = centerOf(seq[i]);
      if (!c) continue;
      d += (i === 0 ? "M" : " L") + c.x + " " + c.y;
    }
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#007bff");
    path.setAttribute("stroke-width", "4");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("opacity", "0.9");
    svg.appendChild(path);
  }

  function addPoint(p) {
    if (seq.indexOf(p) !== -1) return;
    seq.push(p);
    const el = document.querySelector('#patronGrid .punto[data-p="' + p + '"]');
    if (el) el.classList.add("activo");
    drawLines();
  }

  function handleEnd() {
    if (!drawing) return;
    drawing = false;
    const patron = String(App.PATRON).replace(/\D/g, "");
    const intento = seq.join("");
    const msg = $("patronMsg");
    if (intento === patron) {
      setUnlocked(true);
      if (msg) {
        msg.textContent = "✓ Desbloqueado";
        msg.style.color = "#28a745";
      }
      setTimeout(function () {
        showOverlay(false);
        clearSeq();
      }, 300);
    } else {
      if (msg) {
        msg.textContent = "✗ Patrón incorrecto";
        msg.style.color = "#dc3545";
      }
      document
        .querySelectorAll("#patronGrid .punto.activo")
        .forEach(function (b) {
          b.classList.add("error");
        });
      setTimeout(clearSeq, 700);
    }
    seq = [];
    // No limpiamos drawing flag ya en false, pero seq se resetea arriba; para error ya se limpió visual
    // Para éxito mantenemos seq vacío
    if (intento !== patron) seq = [];
  }

  function init() {
    const overlay = $("bloqueoPatron");
    const grid = $("patronGrid");
    if (!overlay || !grid) return;

    if (isUnlocked()) {
      showOverlay(false);
    } else {
      showOverlay(true);
    }

    // Crear listeners de dibujo
    grid.addEventListener("mousedown", function (e) {
      const btn = e.target.closest ? e.target.closest(".punto") : null;
      if (!btn) return;
      e.preventDefault();
      drawing = true;
      clearSeq();
      addPoint(btn.dataset.p);
    });

    grid.addEventListener("mouseover", function (e) {
      if (!drawing) return;
      const btn = e.target.closest ? e.target.closest(".punto") : null;
      if (btn) addPoint(btn.dataset.p);
    });

    document.addEventListener("mouseup", handleEnd);

    // Touch
    grid.addEventListener(
      "touchstart",
      function (e) {
        const btn = e.target.closest ? e.target.closest(".punto") : null;
        if (!btn) return;
        e.preventDefault();
        drawing = true;
        clearSeq();
        addPoint(btn.dataset.p);
      },
      { passive: false },
    );

    grid.addEventListener(
      "touchmove",
      function (e) {
        if (!drawing) return;
        e.preventDefault();
        const t = e.touches[0];
        const el = document.elementFromPoint(t.clientX, t.clientY);
        const btn = el && el.closest ? el.closest(".punto") : null;
        if (btn) addPoint(btn.dataset.p);
      },
      { passive: false },
    );

    document.addEventListener("touchend", handleEnd);
    document.addEventListener("touchcancel", handleEnd);

    // Recalcular líneas al redimensionar mientras se dibuja
    window.addEventListener("resize", drawLines);

    // Botón sutil para cerrar sesión (limpia desbloqueo y vuelve a pedir patrón)
    const btnLogout = $("btnLogout");
    if (btnLogout) {
      btnLogout.addEventListener("click", function () {
        setUnlocked(false);
        clearSeq();
        showOverlay(true);
        const msg = $("patronMsg");
        if (msg) {
          msg.textContent = "";
        }
      });
    }
  }

  // Esperar a que el DOM esté listo (scripts al final del body ya lo está, pero por seguridad)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
