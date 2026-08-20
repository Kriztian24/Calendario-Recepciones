/* ============================================================
   render.js - Generación del HTML de los calendarios y de la
   tabla de proveedores a partir del estado (App.proveedores).
   ============================================================ */
var App = window.App = window.App || {};

/* ------------------------------------------------------------
   itemEnvio(p): HTML de un proveedor en el calendario de
   pedidos. Muestra nombre, día de llegada, banderas (*Estricto,
   gigante) y su nota/prep.
   ------------------------------------------------------------ */
App.itemEnvio = function (p) {
    let html = '<li class="supplier' + (p.gigante ? ' gigante' : '') +
        '" draggable="true" data-id="' + p.id + '" data-tipo="envio" title="' + App.esc(p.nota) + '">';
    // El nombre siempre va al inicio; la semana (Sem 1/3 o Sem 2/4)
    // se muestra después como una mini etiqueta sutil.
    html += '<span class="sup-nombre">' + App.esc(p.nombre) + '</span>';
    if (App.colFor(p.frecuencia) === 'quincenal') {
        html += ' <span class="sem-label">' + App.freqLabel(p) + '</span>';
    }
    // Anotación: día de llegada (se calcula solo con envío + tránsito).
    html += ' <span class="llegada">(' + App.abbrDia(p.posDiaEntrega, p.posDiaEnvio) + ')</span>';
    if (p.estricto) html += ' <span class="estricto">*Estricto</span>';
    if (p.nota) html += '<span class="prep">' + App.esc(p.nota) + '</span>';
    html += '</li>';
    return html;
};

/* ------------------------------------------------------------
   itemRecepcion(p): HTML de un proveedor en el calendario de
   recepción. Muestra el día de envío como anotación y, si la
   recepción fue movida a mano, un botón para volver a "auto".
   ------------------------------------------------------------ */
App.itemRecepcion = function (p) {
    let html = '<li class="supplier' + (p.gigante ? ' gigante' : '') +
        '" draggable="true" data-id="' + p.id + '" data-tipo="entrega" title="' + App.esc(p.nota) + '">';
    // El nombre siempre va al inicio; la semana (Sem 1/3 o Sem 2/4)
    // se muestra después como una mini etiqueta sutil.
    html += '<span class="sup-nombre">' + App.esc(p.nombre) + '</span>';
    if (App.colFor(p.frecuencia) === 'quincenal') {
        html += ' <span class="sem-label">' + App.freqLabel(p) + '</span>';
    }
    // Anotación: día de envío correspondiente a esta recepción.
    html += ' <span class="llegada">(' + App.abbrDia(p.posDiaEnvio, p.posDiaEntrega) + ')</span>';
    if (p.sobrescribirEntrega) {
        html += '<span class="override-badge">🔓 manual</span>' +
            '<button class="re-link" data-id="' + p.id + '" draggable="false">↺ auto</button>';
    }
    html += '</li>';
    return html;
};

/* ------------------------------------------------------------
   cellHtml(items, tipo, col, dia, vacios): contenido de una celda.
   - En el calendario de pedidos agrega, si corresponde, la nota
     "[Enviar los Preps del X]" cuando el día anterior tenía
     proveedores preparados (anticipación > 0).
   - Si no hay ítems y existe un texto para esa celda, lo muestra.
   ------------------------------------------------------------ */
App.cellHtml = function (items, tipo, col, dia, vacios) {
    const lis = [];
    if (tipo === 'envio') {
        // Día anterior en ciclo de 7 días.
        const prev = (dia + 6) % 7;
        const hasPreps = App.proveedores.some(function (p) {
            return App.colFor(p.frecuencia) === col && p.posDiaEnvio === prev &&
                (p.anticipacion || 0) > 0;
        });
        if (hasPreps) {
            lis.push('<li><strong>[Enviar los Preps del ' + App.DIAS[prev].nombre + ']</strong></li>');
        }
    }
    for (let i = 0; i < items.length; i++) {
        lis.push(tipo === 'envio' ? App.itemEnvio(items[i]) : App.itemRecepcion(items[i]));
    }
    if (!lis.length) {
        const v = vacios[dia + '|' + col];
        return v ? '<em>' + v + '</em>' : '';
    }
    return '<ul>' + lis.join('') + '</ul>';
};

/* ------------------------------------------------------------
   resumenDia(tipo, dia): cuenta los proveedores que caen ese día
   en el calendario "tipo" (envio/entrega), agrupados por columna.
   ------------------------------------------------------------ */
App.resumenDia = function (tipo, dia) {
    const key = tipo === 'envio' ? 'posDiaEnvio' : 'posDiaEntrega';
    const res = { semanal: 0, quincenal: 0, mensual: 0 };
    for (let i = 0; i < App.proveedores.length; i++) {
        const p = App.proveedores[i];
        if (p[key] === dia) res[App.colFor(p.frecuencia)]++;
    }
    return res;
};

/* ------------------------------------------------------------
   resumenHtml(res): HTML del resumen bajo el nombre del día.
   Cada columna ocupa una línea (solo conteos > 0) y al final se
   muestra el total de pedidos del día. Si no hay nada: "sin pedidos".
   ------------------------------------------------------------ */
App.resumenHtml = function (res) {
    const total = res.semanal + res.quincenal + res.mensual;
    if (!total) return '<span class="rvacio">sin pedidos</span>';
    const partes = [];
    if (res.semanal) partes.push('<span class="rsem">' + res.semanal + ' sem</span>');
    if (res.quincenal) partes.push('<span class="rquin">' + res.quincenal + ' quin</span>');
    if (res.mensual) partes.push('<span class="rmen">' + res.mensual + ' men</span>');
    partes.push('<span class="rtotal">Total: ' + total + '</span>');
    return partes.join('');
};

/* ------------------------------------------------------------
   renderPedidos(): dibuja la tabla de gestión de pedidos.
   Cada celda es un destino de drag (td[data-col][data-dia]).
   ------------------------------------------------------------ */
App.renderPedidos = function () {
    const tb = document.getElementById('tbodyPedidos');
    let html = '';
    for (let r = 0; r < App.PEDIDOS_ROWS.length; r++) {
        const dia = App.PEDIDOS_ROWS[r];
        // Primera columna: nombre del día + resumen de pedidos.
        html += '<tr><td>' + App.DIAS[dia].nombre +
            '<span class="resumen">' + App.resumenHtml(App.resumenDia('envio', dia)) + '</span></td>';
        for (let c = 0; c < App.COLS.length; c++) {
            const col = App.COLS[c];
            const items = App.proveedores.filter(function (p) {
                return App.colFor(p.frecuencia) === col && p.posDiaEnvio === dia;
            });
            html += '<td data-col="' + col + '" data-dia="' + dia + '">' +
                App.cellHtml(items, 'envio', col, dia, App.VACIOS_PEDIDOS) + '</td>';
        }
        html += '</tr>';
    }
    tb.innerHTML = html;
};

/* ------------------------------------------------------------
   renderRecepcion(): dibuja la tabla de recepción de bodega.
   ------------------------------------------------------------ */
App.renderRecepcion = function () {
    const tb = document.getElementById('tbodyRecepcion');
    let html = '';
    for (let r = 0; r < App.RECEPCION_ROWS.length; r++) {
        const dia = App.RECEPCION_ROWS[r];
        // Primera columna: nombre del día + resumen de recepciones.
        html += '<tr><td>' + App.DIAS[dia].nombre +
            '<span class="resumen">' + App.resumenHtml(App.resumenDia('entrega', dia)) + '</span></td>';
        for (let c = 0; c < App.COLS.length; c++) {
            const col = App.COLS[c];
            const items = App.proveedores.filter(function (p) {
                return App.colFor(p.frecuencia) === col && p.posDiaEntrega === dia;
            });
            html += '<td data-col="' + col + '" data-dia="' + dia + '">' +
                App.cellHtml(items, 'entrega', col, dia, App.VACIOS_RECEPCION) + '</td>';
        }
        html += '</tr>';
    }
    tb.innerHTML = html;
};

/* Redibuja ambos calendarios. Se llama tras cualquier cambio. */
App.renderCalendario = function () {
    App.renderPedidos();
    App.renderRecepcion();
};

/* ------------------------------------------------------------
   chips(dias): mini-etiquetas con los días abreviados.
   ------------------------------------------------------------ */
App.chips = function (dias) {
    if (!dias || !dias.length) return '<span class="chip-none">ninguno</span>';
    return dias.map(function (d) {
        return '<span class="chip">' + App.DIAS[d].abbr + '</span>';
    }).join('');
};

/* ------------------------------------------------------------
   Ordenamiento de la tabla de proveedores
   ------------------------------------------------------------ */

/* Clave de la columna activa (data-sort) y dirección: 1 = asc, -1 = desc */
App.sortKey = null;
App.sortDir = 1;

/* Prioridad de las frecuencias para la columna "Frecuencia" */
const FREC_RANK = { semanal: 0, quincenal13: 1, quincenal24: 2, mensual: 3 };

/* diasRank(dias): valor de orden de una lista de días. Se ordena
   primero por la cantidad de días y luego por el día más temprano. */
function diasRank(dias) {
    if (!dias || !dias.length) return 0;
    return dias.length * 10 + Math.min.apply(null, dias);
}

/* valOrden(p, k): valor comparable de un proveedor según la clave. */
function valOrden(p, k) {
    switch (k) {
        case 'nombre': return p.nombre;
        case 'frecuencia': return FREC_RANK[p.frecuencia] != null ? FREC_RANK[p.frecuencia] : 99;
        case 'diasEnvio': return diasRank(p.diasEnvio);
        case 'diasEntrega': return diasRank(p.diasEntrega);
        case 'transito': return p.transito;
        case 'anticipacion': return p.anticipacion;
        case 'estricto': return p.estricto ? 1 : 0;
        case 'gigante': return p.gigante ? 1 : 0;
        default: return 0;
    }
}

/* provCmp(a, b): comparador usado por renderProveedores. */
App.provCmp = function (a, b) {
    const k = App.sortKey;
    if (!k) return 0;
    const va = valOrden(a, k);
    const vb = valOrden(b, k);
    let r = typeof va === 'string' ? va.localeCompare(vb, 'es') : va - vb;
    return r * App.sortDir;
};

/* ------------------------------------------------------------
   renderProveedores(): dibuja la tabla de la pantalla de
   proveedores, aplicando el filtro de búsqueda y el orden actual.
   ------------------------------------------------------------ */
App.renderProveedores = function () {
    const filtro = (document.getElementById('filtroProveedores').value || '').toLowerCase().trim();
    const tb = document.getElementById('tbodyProveedores');
    // Filtra por nombre y luego ordena una copia (no altera el estado).
    const lista = [];
    for (let i = 0; i < App.proveedores.length; i++) {
        const p = App.proveedores[i];
        if (filtro && p.nombre.toLowerCase().indexOf(filtro) === -1) continue;
        lista.push(p);
    }
    if (App.sortKey) lista.sort(App.provCmp);
    let html = '';
    for (let i = 0; i < lista.length; i++) {
        const p = lista[i];
        html += '<tr>' +
            '<td>' + App.esc(p.nombre) + '</td>' +
            '<td>' + App.FRECUENCIA_LABEL[p.frecuencia] + '</td>' +
            '<td>' + App.chips(p.diasEnvio) + '</td>' +
            '<td>' + App.chips(p.diasEntrega) + '</td>' +
            '<td>' + p.transito + '</td>' +
            '<td>' + p.anticipacion + '</td>' +
            '<td>' + (p.estricto ? '✔' : '') + '</td>' +
            '<td>' + (p.gigante ? '✔' : '') + '</td>' +
            '<td><button class="btn" data-edit="' + p.id + '">Editar</button> ' +
            '<button class="btn btn-danger" data-del="' + p.id + '">Eliminar</button></td>' +
            '</tr>';
    }
    tb.innerHTML = html;
};
