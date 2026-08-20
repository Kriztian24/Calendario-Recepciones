/* ============================================================
   app.js - Utilidades de interfaz y arranque de la aplicación
   ------------------------------------------------------------
   - Toast: notificaciones breves al usuario.
   - Navegación entre pantallas (Calendario / Proveedores).
   - Panel lateral de leyenda (abrir/cerrar con la cenefa).
   - Inicialización: primer render de los calendarios y la tabla.
   Se carga al final (tras los demás scripts), cuando el DOM ya
   está disponible.
   ============================================================ */
var App = window.App = window.App || {};

/* ------------------------------------------------------------
   Toast
   ------------------------------------------------------------ */
let toastTimer = null;

/* toast(msg): muestra un mensaje temporal en la esquina inferior. */
App.toast = function (msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
        t.classList.remove('show');
    }, 3500);
};

/* ------------------------------------------------------------
   Navegación entre pantallas
   ------------------------------------------------------------ */

/* mostrar(cual): activa una pantalla y resalta su botón. */
App.mostrar = function (cual) {
    const cal = document.getElementById('screen-calendario');
    const pro = document.getElementById('screen-proveedores');
    const bCal = document.getElementById('btnCalendario');
    const bPro = document.getElementById('btnProveedores');
    if (cual === 'calendario') {
        cal.classList.remove('hidden');
        pro.classList.add('hidden');
        bCal.classList.add('active');
        bPro.classList.remove('active');
    } else {
        pro.classList.remove('hidden');
        cal.classList.add('hidden');
        bPro.classList.add('active');
        bCal.classList.remove('active');
    }
};

document.getElementById('btnCalendario').addEventListener('click', function () { App.mostrar('calendario'); });
document.getElementById('btnProveedores').addEventListener('click', function () { App.mostrar('proveedores'); });

/* ------------------------------------------------------------
   Panel lateral de leyenda
   ------------------------------------------------------------ */

/* setPanel(open): abre/cierra el panel y oculta la cenefa al abrirlo. */
App.setPanel = function (open) {
    const panel = document.getElementById('sidePanel');
    const tab = document.getElementById('sideTab');
    panel.classList.toggle('open', open);
    tab.style.display = open ? 'none' : 'block';
};

document.getElementById('sideTab').addEventListener('click', function () { App.setPanel(true); });
document.getElementById('sideClose').addEventListener('click', function () { App.setPanel(false); });

/* ------------------------------------------------------------
   Arranque
   ------------------------------------------------------------ */

/* init(): render inicial de toda la interfaz. */
App.init = function () {
    App.renderCalendario();
    App.renderProveedores();
};

App.init();