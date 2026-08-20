/* ============================================================
   drag.js - Drag & drop nativo (HTML5) para mover proveedores
   entre los días del calendario.
   ------------------------------------------------------------
   - Valida cada celda destino con App.canDrop.
   - Resalta en verde (suelto válido) o rojo (inválido).
   - Al soltar aplica el movimiento, guarda y re-renderiza.
   - Incluye el botón "↺ auto" para volver a vincular una
     recepción que se movió manualmente.
   ============================================================ */
(function () {

    /* Proveedor y calendario del elemento que se arrastra */
    let dragData = null;
    /* Última celda resaltada (para limpiar su estilo al mover el ratón) */
    let lastTd = null;

    /* Quita los resaltados verde/rojo de todas las celdas */
    function clearDropHighlights() {
        const tds = document.querySelectorAll('td.drop-ok, td.drop-no');
        for (let i = 0; i < tds.length; i++) tds[i].classList.remove('drop-ok', 'drop-no');
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

    /* Sobre cada celda: muestra si el suelto sería válido o no */
    document.addEventListener('dragover', function (e) {
        const td = e.target.closest ? e.target.closest('td[data-col]') : null;
        if (!td || !dragData) return;
        // Quita el resaltado de la celda anterior.
        if (lastTd && lastTd !== td) lastTd.classList.remove('drop-ok', 'drop-no');
        lastTd = td;
        const p = App.getById(dragData.id);
        if (!p) return;
        const dia = +td.dataset.dia;
        const col = td.dataset.col;
        if (App.canDrop(p, dragData.tipo, col, dia)) {
            e.preventDefault(); // permite soltar aquí
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
            td.classList.add('drop-ok');
            td.classList.remove('drop-no');
        } else {
            td.classList.remove('drop-ok');
            td.classList.add('drop-no');
        }
    });

    /* Suelto: aplica el movimiento, guarda y re-renderiza */
    document.addEventListener('drop', function (e) {
        e.preventDefault();
        const td = e.target.closest ? e.target.closest('td[data-col]') : null;
        const p = dragData ? App.getById(dragData.id) : null;
        if (!td || !p) { clearDropHighlights(); return; }
        const dia = +td.dataset.dia;
        const col = td.dataset.col;
        if (App.canDrop(p, dragData.tipo, col, dia)) {
            App.applyMove(p, dragData.tipo, dia);
            App.save();
            App.renderCalendario();
        }
        clearDropHighlights();
    });

    /* Click en "↺ auto": vuelve a vincular la recepción al cálculo
       automático (envío + tránsito). */
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
        App.save();
        App.renderCalendario();
    });

})();
