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

/* loadRemote(): intenta leer la base de datos del servidor.
   Devuelve true si lo logró; si no, usa la caché local. */
App.loadRemote = async function () {
    try {
        const res = await fetch('/api/proveedores', { cache: 'no-store' });
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
            const res = await fetch('/api/proveedores', {
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
