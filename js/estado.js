/* ============================================================
   estado.js - Estado de la aplicación y reglas de negocio
   ------------------------------------------------------------
   - Carga/guarda la base de datos en el SERVICIDOR compartido
     (servidor.js -> db.json) para que todos los equipos vean lo
     mismo en tiempo real.
   - El localStorage queda solo como caché de respaldo (modo sin
     conexión).
   - Normaliza los proveedores (valida y completa los campos).
   - Define las reglas de envío, entrega y anticipación que usa
     el drag & drop.
   ============================================================ */
var App = window.App = window.App || {};

/* Clave con la que se guarda la copia local de respaldo */
App.KEY = 'calendarioComprasDB';

/* ------------------------------------------------------------
   normalize(p): completa los campos de un proveedor para
   garantizar tipos correctos y valores por defecto.
   Se usa tanto para la semilla como para datos importados o
   provenientes del formulario.
   ------------------------------------------------------------ */
App.normalize = function (p) {
    p = Object.assign({}, p);
    // Listas de días (índices 0-6). Se convierten a números.
    p.diasEnvio = Array.isArray(p.diasEnvio) ? p.diasEnvio.map(Number) : [];
    p.diasEntrega = Array.isArray(p.diasEntrega) ? p.diasEntrega.map(Number) : [];
    // Días en tránsito (envío -> llegada) y días de anticipación.
    p.transito = p.transito == null ? 1 : +p.transito;
    p.anticipacion = p.anticipacion == null ? 0 : +p.anticipacion;
    // Banderas booleanas.
    p.estricto = !!p.estricto;
    p.gigante = !!p.gigante;
    p.nota = p.nota || '';
    // Posición actual en cada calendario (por defecto, primer día permitido).
    p.posDiaEnvio = (p.posDiaEnvio == null || isNaN(+p.posDiaEnvio))
        ? (p.diasEnvio.length ? p.diasEnvio[0] : 1)
        : +p.posDiaEnvio;
    p.posDiaEntrega = (p.posDiaEntrega == null || isNaN(+p.posDiaEntrega))
        ? (p.diasEntrega.length ? p.diasEntrega[0] : 1)
        : +p.posDiaEntrega;
    // La recepción movida a mano conserva su bandera.
    p.sobrescribirEntrega = !!p.sobrescribirEntrega;
    // Orden de aparición dentro de cada calendario (se usa para
    // reordenar con drag & drop dentro de una celda).
    p.ordenEnvio = p.ordenEnvio == null ? 0 : +p.ordenEnvio;
    p.ordenEntrega = p.ordenEntrega == null ? 0 : +p.ordenEntrega;
    // Historial de control por ciclo (fecha, color, usuario)
    p.historialEnvio = Array.isArray(p.historialEnvio) ? p.historialEnvio : [];
    p.historialEntrega = Array.isArray(p.historialEntrega) ? p.historialEntrega : [];
    // Genera un id único si no existe.
    if (!p.id) p.id = App.slug(p.nombre || 'proveedor') + '-' + Date.now().toString(36);
    return p;
};

/* ------------------------------------------------------------
   Carga de datos
   La base de datos vive en el servidor (db.json) y se comparte
   entre todos los equipos. El localStorage queda como respaldo
   para cuando no hay servidor disponible.
   ------------------------------------------------------------ */

/* Proveedores actuales (estado en memoria de toda la app).
   Se llenan con App.loadRemote() durante el arranque. */
App.proveedores = [];

/* Vista invertida (frecuencias como filas, días como columnas).
   Global para ambos calendarios, persistida por usuario. Por defecto invertida. */
App.vistaInvertida = (function () {
    try { return JSON.parse(localStorage.getItem('vistaInvertida') || 'true'); } catch (e) { return true; }
})();
App.setVistaInvertida = function (v) {
    App.vistaInvertida = !!v;
    try { localStorage.setItem('vistaInvertida', JSON.stringify(App.vistaInvertida)); } catch (e) {}
    App.renderCalendario();
};

/* Modo operación: muestra colores/historial y permite marcar (switch en toolbar) */
App.modoOperacion = (function () {
    try { return JSON.parse(localStorage.getItem('modoOperacion') || 'false'); } catch (e) { return false; }
})();
App.setModoOperacion = function (v) {
    App.modoOperacion = !!v;
    try { localStorage.setItem('modoOperacion', JSON.stringify(App.modoOperacion)); } catch (e) {}
    try { document.body.classList.toggle('modo-operacion', App.modoOperacion); } catch (e) {}
    App.renderCalendario();
};
// Aplicar clase inicial si ya estaba activo (cuando el DOM esté listo se re-aplica)
try { document.addEventListener('DOMContentLoaded', function () { document.body.classList.toggle('modo-operacion', !!App.modoOperacion); }); } catch (e) {}

/* Filtro de semana quincenal (pills 1/3 y 2/4 en la cabecera de frecuencia).
   Vacío o ambos seleccionados = mostrar todo. Uno solo = filtrar. */
App.filtroSemanas = (function () {
    try {
        const v = JSON.parse(localStorage.getItem('filtroSemanas') || '[]');
        return new Set(Array.isArray(v) ? v : []);
    } catch (e) { return new Set(); }
})();
App.pasaFiltroSemana = function (p) {
    if (App.filtroSemanas.size === 0 || App.filtroSemanas.size === 2) return true;
    if (p.frecuencia === 'quincenal13') return App.filtroSemanas.has('13');
    if (p.frecuencia === 'quincenal24') return App.filtroSemanas.has('24');
    return true; // semanal y mensual siempre visibles
};
App.toggleFiltroSemana = function (sem) {
    if (App.filtroSemanas.has(sem)) App.filtroSemanas.delete(sem);
    else App.filtroSemanas.add(sem);
    try { localStorage.setItem('filtroSemanas', JSON.stringify([...App.filtroSemanas])); } catch (e) {}
    App.renderCalendario();
};

// Delegación para las pills de filtro quincenal (creadas dinámicamente en el thead/tbody)
document.addEventListener('click', function (e) {
    const pill = e.target.closest ? e.target.closest('.filtro-pill') : null;
    if (pill && pill.dataset.semana) {
        e.preventDefault();
        e.stopPropagation();
        App.toggleFiltroSemana(pill.dataset.semana);
    }
});

/* ------------------------------------------------------------
   Control por ciclo (marcado con fecha, color y usuario)
   ------------------------------------------------------------ */
App.PALETA = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6', '#f43f5e', '#6366f1'];

App.semanaISO = function (date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
};

App.quincenaGlobal = function (date) {
    return Math.floor((App.semanaISO(date) - 1) / 2);
};

App.colorParaCiclo = function (ciclo) {
    return App.PALETA[((ciclo % App.PALETA.length) + App.PALETA.length) % App.PALETA.length];
};

App.cicloActual = function (p, tipo) {
    const freq = p ? p.frecuencia : 'semanal';
    const hoy = new Date();
    if (freq === 'semanal') return App.semanaISO(hoy);
    if (freq.indexOf('quincenal') === 0) return App.quincenaGlobal(hoy);
    // mensual: por proveedor, siguiente ciclo = historial length
    const hist = tipo === 'envio' ? (p ? p.historialEnvio : []) : (p ? p.historialEntrega : []);
    return hist ? hist.length : 0;
};

App.esHechoEsteCiclo = function (p, tipo) {
    const hist = tipo === 'envio' ? p.historialEnvio : p.historialEntrega;
    if (!hist || !hist.length) return false;
    const ultimo = hist[hist.length - 1];
    if (p.frecuencia === 'mensual') {
        // Mensual: ventana de 10 días con el mismo color (desmarcado/marcado mismo color)
        // Si el último fue hace <10 días, sigue en el mismo ciclo
        const dUlt = new Date(ultimo.fecha);
        const dHoy = new Date(); dHoy.setHours(0, 0, 0, 0); dUlt.setHours(0, 0, 0, 0);
        const diff = Math.floor((dHoy - dUlt) / 86400000);
        return diff >= 0 && diff < 10;
    }
    // Semanal / quincenal: comparar ciclo guardado con ciclo actual global
    const cicloActual = App.cicloActual(p, tipo);
    return ultimo.ciclo === cicloActual;
};

App.toggleHecho = function (id, tipo) {
    const p = App.getById(id);
    if (!p) return;
    const histKey = tipo === 'envio' ? 'historialEnvio' : 'historialEntrega';
    const usuario = (function () {
        try {
            let u = sessionStorage.getItem('usuarioActual');
            if (u) return u;
            u = localStorage.getItem('ultimoUsuario');
            if (u) return u;
        } catch (e) {}
        return '';
    })();
    let nombre = usuario;
    if (!nombre) {
        nombre = prompt('Ingresa tu nombre para registrar quién marca:');
        if (nombre === null) return;
        nombre = String(nombre).trim();
        if (!nombre) { App.toast('⚠️ Debes ingresar un nombre.'); return; }
        try {
            sessionStorage.setItem('usuarioActual', nombre);
            localStorage.setItem('ultimoUsuario', nombre);
        } catch (e) {}
    }
    // Si ya está hecho este ciclo, revertir (segundo clic)
    if (App.esHechoEsteCiclo(p, tipo)) {
        p[histKey].pop();
        App.save();
        App.renderCalendario();
        App.toast('↩️ ' + p.nombre + ' desmarcado (revertido).');
        return;
    }
    const ahora = new Date();
    const fechaStr = ahora.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit' });
    const fechaISO = ahora.toISOString().slice(0, 10);
    let color;
    let ciclo;
    if (p.frecuencia === 'mensual') {
        ciclo = p[histKey].length;
        color = App.colorParaCiclo(ciclo);
    } else if (p.frecuencia.indexOf('quincenal') === 0) {
        ciclo = App.quincenaGlobal(ahora);
        color = App.colorParaCiclo(ciclo);
    } else {
        ciclo = App.semanaISO(ahora);
        color = App.colorParaCiclo(ciclo);
    }
    p[histKey].push({ fecha: fechaISO, fechaCorta: fechaStr, color: color, ciclo: ciclo, usuario: nombre });
    App.save();
    App.renderCalendario();
    App.toast('✓ ' + p.nombre + ' marcado por ' + nombre + ' (' + fechaStr + ')');
};

/* loadLocal(): lee la caché de localStorage; si no existe (o el
   JSON está corrupto) usa la semilla incrustada. */
App.loadLocal = function () {
    try {
        const raw = localStorage.getItem(App.KEY);
        if (raw) {
            const arr = JSON.parse(raw);
            if (Array.isArray(arr)) return arr.map(App.normalize);
        }
    } catch (e) {
        // JSON corrupto: se ignora y se recarga la semilla.
    }
    return App.SEED_PROVEEDORES.map(App.normalize);
};

/* cache(): guarda una copia local (respaldo offline). */
App.cache = function () {
    localStorage.setItem(App.KEY, JSON.stringify(App.proveedores));
};

/* apiUrl(path): construye la URL de la API respetando el prefijo
   de la Application URL de cPanel (ej. /calendario-pedidos).
   En local es /api/... y en hosting es /calendario-pedidos/api/... */
App.apiUrl = function (path) {
    let base = window.location.pathname.replace(/\/index\.html$/, '');
    base = base.replace(/\/$/, '');
    // Si estamos en /calendario-pedidos o /calendario, usar ese prefijo
    if (base === '/calendario-pedidos' || base === '/calendario') return base + path;
    // Fallback: detectar por si la URL actual ya incluye el prefijo
    if (window.location.pathname.indexOf('/calendario-pedidos/') === 0) return '/calendario-pedidos' + path;
    if (window.location.pathname.indexOf('/calendario/') === 0) return '/calendario' + path;
    return path;
};

/* loadRemote(): intenta leer la base de datos del servidor.
   Devuelve true si lo logró; si no, usa la caché local. */
App.loadRemote = async function () {
    try {
        const res = await fetch(App.apiUrl('/api/proveedores'), { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        App.proveedores = (await res.json()).map(App.normalize);
        App.cache();
        return true;
    } catch (e) {
        App.proveedores = App.loadLocal();
        return false;
    }
};

/* ------------------------------------------------------------
   Orden interno de cada calendario (reordenar con drag & drop)
   ------------------------------------------------------------ */

/* itemsDelDia(tipo, dia, col): proveedores de una celda en su orden
   actual (campo ordenEnvio/ordenEntrega). */
App.itemsDelDia = function (tipo, dia, col) {
    const key = tipo === 'envio' ? 'posDiaEnvio' : 'posDiaEntrega';
    const ordenKey = tipo === 'envio' ? 'ordenEnvio' : 'ordenEntrega';
    return App.proveedores
        .filter(function (p) {
            return App.colFor(p.frecuencia) === col && p[key] === dia;
        })
        .sort(function (a, b) { return a[ordenKey] - b[ordenKey]; });
};

/* renumerar(tipo, lista): asigna 0..n como orden de la lista. */
App.renumerar = function (tipo, lista) {
    const ordenKey = tipo === 'envio' ? 'ordenEnvio' : 'ordenEntrega';
    for (let i = 0; i < lista.length; i++) lista[i][ordenKey] = i;
};

/* reordenar(tipo, dia, id, refId, antes): recoloca al proveedor
   "id" dentro de su celda, antes o después del proveedor de
   referencia "refId", y renumerar el orden de la celda. */
App.reordenar = function (tipo, dia, id, refId, antes) {
    const col = App.colFor(App.getById(id).frecuencia);
    const lista = App.itemsDelDia(tipo, dia, col).filter(function (p) { return p.id !== id; });
    if (refId) {
        const ix = lista.findIndex(function (p) { return p.id === refId; });
        if (ix !== -1) lista.splice(antes ? ix : ix + 1, 0, App.getById(id));
    } else {
        lista.push(App.getById(id));
    }
    App.renumerar(tipo, lista);
};

/* acomodarEnCelda(tipo, dia, id): coloca al proveedor "id" al final
   de su celda. Se usa al moverlo a un día nuevo para que quede
   detrás de los que ya estaban ahí. */
App.acomodarEnCelda = function (tipo, dia, id) {
    const col = App.colFor(App.getById(id).frecuencia);
    const lista = App.itemsDelDia(tipo, dia, col).filter(function (p) { return p.id !== id; });
    lista.push(App.getById(id));
    App.renumerar(tipo, lista);
};

/* ------------------------------------------------------------
   diffProveedores(prev, incoming): devuelve un Set con los ids de
   los proveedores que cambiaron entre dos versiones de la base de
   datos (nuevos, eliminados o con campos distintos). Se usa para
   distinguir el eco de nuestro propio guardado (sin diferencias)
   de un cambio real hecho por otro equipo.
   ------------------------------------------------------------ */
App.diffProveedores = function (prev, incoming) {
    const cambiados = new Set();
    const porId = {};
    for (let i = 0; i < incoming.length; i++) porId[incoming[i].id] = incoming[i];
    for (let i = 0; i < prev.length; i++) {
        const q = porId[prev[i].id];
        if (!q || JSON.stringify(q) !== JSON.stringify(prev[i])) cambiados.add(prev[i].id);
    }
    const prevIds = {};
    for (let i = 0; i < prev.length; i++) prevIds[prev[i].id] = true;
    for (let i = 0; i < incoming.length; i++) {
        if (!prevIds[incoming[i].id]) cambiados.add(incoming[i].id);
    }
    return cambiados;
};

/* ------------------------------------------------------------
   save(): persiste el estado actual en el servidor.
   Las llamadas se encadenan para no enviar POST fuera de orden.
   Si el servidor no responde, el cambio queda solo en la caché
   local (modo sin conexión).
   ------------------------------------------------------------ */
App._saveChain = Promise.resolve();
App.save = function () {
    App.cache();
    const snapshot = JSON.stringify(App.proveedores);
    App._saveChain = App._saveChain.then(async function () {
        try {
            const res = await fetch(App.apiUrl('/api/proveedores'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: snapshot
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return true;
        } catch (e) {
            if (App.online) {
                App.online = false;
                App.toast('⚠️ Sin conexión al servidor: el cambio se guardó solo en este equipo.');
            }
            return false;
        }
    });
    return App._saveChain;
};

/* ------------------------------------------------------------
   getById(id): devuelve el proveedor con ese id (o undefined).
   ------------------------------------------------------------ */
App.getById = function (id) {
    return App.proveedores.find(function (p) { return p.id === id; });
};

/* ------------------------------------------------------------
   envioPermitido(p, dia): ¿el proveedor "p" puede recibir un
   pedido el día "dia"?
   Es válido si el día está en su lista de envío, o si cae
   dentro de su anticipación (es decir, "dia" es hasta N días
   antes de un día permitido). La distancia se calcula en ciclo
   de 7 días (mod 7).
   ------------------------------------------------------------ */
App.envioPermitido = function (p, dia) {
    if (p.diasEnvio.indexOf(dia) !== -1) return true;
    const ant = p.anticipacion || 0;
    if (ant <= 0) return false;
    return p.diasEnvio.some(function (d) {
        const dist = (d - dia + 7) % 7;
        return dist >= 1 && dist <= ant;
    });
};

/* ------------------------------------------------------------
   canDrop(p, tipo, col, dia): ¿puede soltarse "p" en la celda
   (col, dia) del calendario "tipo"?
     - tipo 'envio'   -> calendario de pedidos (regla de envío)
     - tipo 'entrega' -> calendario de recepción (regla de entrega)
   Nunca se permite cruzar de columna (frecuencia distinta).
   ------------------------------------------------------------ */
App.canDrop = function (p, tipo, col, dia) {
    if (App.colFor(p.frecuencia) !== col) return false;
    if (tipo === 'envio') return App.envioPermitido(p, dia);
    return p.diasEntrega.indexOf(dia) !== -1;
};

/* ------------------------------------------------------------
   abbrDia(d, otroDia): abreviación de un día. Si es el mismo día
   que el evento contrario (envío = llegada), indica "Mismo X".
   ------------------------------------------------------------ */
App.abbrDia = function (d, otroDia) {
    if (d === otroDia) return 'Mismo ' + App.DIAS[d].abbr;
    return App.DIAS[d].abbr;
};

/* ------------------------------------------------------------
   applyMove(p, tipo, dia): mueve un proveedor al día "dia" en el
   calendario "tipo".
     - Envío: si la recepción NO fue movida a mano, se recalcula
       automáticamente (envío + tránsito). Si el resultado cae en
       un día no permitido, se avisa y la llegada se mantiene.
     - Recepción: el movimiento manual marca sobrescribirEntrega
       para que no se vuelva a recalcular sola.
   ------------------------------------------------------------ */
App.applyMove = function (p, tipo, dia) {
    if (tipo === 'envio') {
        if (p.posDiaEnvio === dia) return;
        p.posDiaEnvio = dia;
        // Recalcular la llegada solo si no fue movida a mano.
        if (!p.sobrescribirEntrega) {
            const lleg = (dia + p.transito) % 7;
            if (p.diasEntrega.indexOf(lleg) !== -1) {
                p.posDiaEntrega = lleg;
            } else {
                App.toast('⚠️ ' + p.nombre + ': el envío el ' + App.DIAS[dia].nombre +
                    ' generaría llegada ' + App.DIAS[lleg].nombre +
                    ' (no permitida). Mueve su recepción manualmente.');
            }
        }
    } else {
        if (p.posDiaEntrega === dia) return;
        p.posDiaEntrega = dia;
        p.sobrescribirEntrega = true;
    }
};

/* ------------------------------------------------------------
   whyInvalid(p, tipo, col, dia): mensaje que explica por qué un
   suelto fue rechazado (ayuda visual al usuario).
   ------------------------------------------------------------ */
App.whyInvalid = function (p, tipo, col, dia) {
    if (App.colFor(p.frecuencia) !== col) {
        return p.nombre + ' es de frecuencia "' + App.FRECUENCIA_LABEL[p.frecuencia] +
            '"; no puede ir a esa columna.';
    }
    if (tipo === 'entrega') {
        return p.nombre + ' solo entrega los días: ' +
            p.diasEntrega.map(function (d) { return App.DIAS[d].abbr; }).join(', ') + '.';
    }
    const base = p.diasEnvio.map(function (d) { return App.DIAS[d].nombre; }).join(', ');
    const ant = p.anticipacion || 0;
    return p.nombre + ' solo recibe pedido: ' + base +
        (ant ? ' (o hasta ' + ant + ' día(s) antes)' : '') + '.';
};
