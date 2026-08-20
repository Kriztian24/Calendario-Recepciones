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
   Buscador, impresión y exportación CSV del calendario
   ------------------------------------------------------------ */

/* Búsqueda: cada tecla re-renderiza y resalta las coincidencias. */
document.getElementById('buscarProveedor').addEventListener('input', function () {
    App.busqueda = this.value;
    App.renderCalendario();
});

/* Imprimir / PDF: usa el diálogo de impresión del navegador. */
document.getElementById('btnImprimir').addEventListener('click', function () {
    window.print();
});

/* Exportar CSV: descarga la programación completa. */
document.getElementById('btnCSV').addEventListener('click', function () {
    const csv = App.exportarCSV();
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'calendario-pedidos-recepcion.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    App.toast('📄 Programación exportada a CSV.');
});

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
   Sincronización en tiempo real y arranque
   ------------------------------------------------------------ */

/* Estado de conexión con el servidor */
App.online = true;

/* connectSocket(): se suscribe al canal del servidor (Server-Sent
   Events). Cuando otro equipo cambia la base de datos, la pantalla
   se actualiza al instante y los proveedores modificados se
   sombrean brevemente. El eco de nuestros propios guardados se
   ignora (no hay diferencia contra el estado local). */
App.connectSocket = function () {
    if (typeof EventSource === 'undefined') return;
    const es = new EventSource('/api/stream');
    es.onmessage = function (e) {
        try {
            const data = JSON.parse(e.data);
            if (!data || !Array.isArray(data.proveedores)) return;
            const incoming = data.proveedores.map(App.normalize);
            const cambiados = App.diffProveedores(App.proveedores, incoming);
            App.proveedores = incoming;
            App.cache();
            App.renderCalendario();
            App.renderProveedores();
            // Sin diferencias = eco de nuestro propio guardado: no notificar.
            if (!cambiados.size) return;
            // Cambio de otro equipo: sombrear los proveedores afectados.
            cambiados.forEach(function (id) {
                const items = document.querySelectorAll('.supplier[data-id="' + id + '"]');
                for (let i = 0; i < items.length; i++) items[i].classList.add('flash-update');
            });
        } catch (err) {
            // Mensaje inválido: se ignora.
        }
    };
    // Si la red se cae, EventSource se reconecta solo.
};

/* init(): carga la base de datos (servidor o caché local) y dibuja
   toda la interfaz. */
App.init = async function () {
    const online = await App.loadRemote();
    App.online = online;
    if (!online) App.toast('⚠️ Sin conexión al servidor: trabajando en modo local.');
    App.connectSocket();
    App.renderCalendario();
    App.renderProveedores();
};

App.init();