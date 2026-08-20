/* ============================================================
   drag.js - Drag & drop nativo (HTML5)
   ------------------------------------------------------------
   - Mover entre días: se arrastra a otra celda y se valida con
     App.canDrop (resaltado verde/rojo de la celda).
   - Reordenar dentro de la celda: al soltar sobre otro proveedor
     del MISMO día y columna, se inserta antes o después según la
     posición del cursor (línea azul de inserción).
   - Botón "↺ auto": vuelve a vincular una recepción movida a mano.
   ============================================================ */
(function () {

    /* Proveedor y calendario del elemento que se arrastra */
    let dragData = null;
    /* Última celda resaltada (para limpiar su estilo al mover el ratón) */
    let lastTd = null;
    /* Proveedor destino en modo reordenar + posición de inserción */
    let reorderTarget = null;
    let insertBefore = false;

    /* Quita todos los resaltados (celdas y líneas de inserción) */
    function clearDropHighlights() {
        const tds = document.querySelectorAll('td.drop-ok, td.drop-no');
        for (let i = 0; i < tds.length; i++) tds[i].classList.remove('drop-ok', 'drop-no');
        if (reorderTarget) {
            reorderTarget.classList.remove('insert-before', 'insert-after');
            reorderTarget = null;
        }
        insertBefore = false;
        lastTd = null;
    }

    /* Inicio del arrastre: guarda qué proveedor y de qué calendario */
    document.addEventListener('dragstart', function (e) {
        const li = e.target.closest ? e.target.closest('.supplier') : null;
        if (!li) return;
        dragData = { id: li.dataset.id, tipo: li.dataset.tipo };
        li.classList.add('dragging');
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
        }
    });

    /* Fin del arrastre: limpia el estado y los resaltados */
    document.addEventListener('dragend', function (e) {
        const li = e.target.closest ? e.target.closest('.supplier') : null;
        if (li) li.classList.remove('dragging');
        clearDropHighlights();
        dragData = null;
    });

    /* Sobre cada celda: prepara el reorden o valida el destino */
    document.addEventListener('dragover', function (e) {
        const td = e.target.closest ? e.target.closest('td[data-col]') : null;
        if (!td || !dragData) return;
        const p = App.getById(dragData.id);
        if (!p) return;
        const tipo = dragData.tipo;
        const col = td.dataset.col;
        const dia = +td.dataset.dia;
        const srcDia = tipo === 'envio' ? p.posDiaEnvio : p.posDiaEntrega;
        const srcCol = App.colFor(p.frecuencia);
        const li = e.target.closest ? e.target.closest('.supplier') : null;

        // Modo reordenar: mismo día, misma columna, mismo calendario y
        // sobre OTRO proveedor. La línea azul indica antes/después.
        if (li && li.dataset.id !== p.id && li.dataset.tipo === tipo &&
            dia === srcDia && col === srcCol) {
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
            clearDropHighlights();
            const r = li.getBoundingClientRect();
            insertBefore = e.clientY < r.top + r.height / 2;
            reorderTarget = li;
            li.classList.add(insertBefore ? 'insert-before' : 'insert-after');
            return;
        }

        // Salimos de un reorden en curso.
        if (reorderTarget) {
            reorderTarget.classList.remove('insert-before', 'insert-after');
            reorderTarget = null;
            insertBefore = false;
        }

        // Modo mover a celda (reglas de envío/entrega).
        if (lastTd && lastTd !== td) lastTd.classList.remove('drop-ok', 'drop-no');
        lastTd = td;
        if (App.canDrop(p, tipo, col, dia)) {
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
            td.classList.add('drop-ok');
            td.classList.remove('drop-no');
        } else {
            td.classList.remove('drop-ok');
            td.classList.add('drop-no');
        }
    });

    /* Suelto: reordena dentro de la celda o mueve a otra celda */
    document.addEventListener('drop', function (e) {
        e.preventDefault();
        const p = dragData ? App.getById(dragData.id) : null;
        if (!p) { clearDropHighlights(); return; }
        const tipo = dragData.tipo;
        const srcDia = tipo === 'envio' ? p.posDiaEnvio : p.posDiaEntrega;
        const srcCol = App.colFor(p.frecuencia);

        // Caso reordenar: soltamos sobre otro proveedor de la misma celda.
        const li = e.target.closest ? e.target.closest('.supplier') : null;
        if (li && li.dataset.id !== p.id && li.dataset.tipo === tipo &&
            +tdDia(li) === srcDia && tdCol(li) === srcCol) {
            App.reordenar(tipo, srcDia, p.id, li.dataset.id, insertBefore);
            App.save();
            App.renderCalendario();
            clearDropHighlights();
            return;
        }

        // Caso mover a otra celda.
        const td = e.target.closest ? e.target.closest('td[data-col]') : null;
        if (!td) { clearDropHighlights(); return; }
        const dia = +td.dataset.dia;
        const col = td.dataset.col;
        if (App.canDrop(p, tipo, col, dia)) {
            App.applyMove(p, tipo, dia);
            // Coloca el proveedor al final de la celda destino.
            App.acomodarEnCelda(tipo, dia, p.id);
            // Si el envío recalcula la recepción, también se acomoda.
            if (tipo === 'envio' && !p.sobrescribirEntrega) {
                App.acomodarEnCelda('entrega', p.posDiaEntrega, p.id);
            }
            App.save();
            App.renderCalendario();
        }
        clearDropHighlights();
    });

    /* Día/columna de la celda que contiene a un proveedor destino */
    function tdDia(li) {
        const td = li.closest('td[data-col]');
        return td ? +td.dataset.dia : -1;
    }
    function tdCol(li) {
        const td = li.closest('td[data-col]');
        return td ? td.dataset.col : '';
    }

    /* Click en "↺ auto": vuelve a vincular la recepción (envío + tránsito) */
    document.addEventListener('click', function (e) {
        const re = e.target.closest ? e.target.closest('.re-link') : null;
        if (!re) return;
        const p = App.getById(re.dataset.id);
        if (!p) return;
        p.sobrescribirEntrega = false;
        const lleg = (p.posDiaEnvio + p.transito) % 7;
        if (p.diasEntrega.indexOf(lleg) !== -1) {
            p.posDiaEntrega = lleg;
            App.toast('🔗 ' + p.nombre + ': recepción vinculada automáticamente (' +
                App.DIAS[lleg].nombre + ').');
        } else {
            App.toast('⚠️ ' + p.nombre + ': llegada automática ' + App.DIAS[lleg].nombre +
                ' no permitida; se mantiene en ' + App.DIAS[p.posDiaEntrega].nombre + '.');
        }
        App.acomodarEnCelda('entrega', p.posDiaEntrega, p.id);
        App.save();
        App.renderCalendario();
    });

})();