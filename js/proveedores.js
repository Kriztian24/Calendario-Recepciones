/* ============================================================
   proveedores.js - Mantenimiento de proveedores
   ------------------------------------------------------------
   - Modal de alta/edición de un proveedor.
   - Eliminación con confirmación.
   - Exportar / Importar / Restaurar la base de datos (JSON).
   Todo el estado interno del formulario queda privado (IIFE).
   ============================================================ */
(function () {

    /* id del proveedor en edición (null = modo alta) */
    let editandoId = null;

    /* ----------------------------------------------------------
       Construcción del formulario del modal
       ---------------------------------------------------------- */

    /* renderDayChecks(contId, selected): dibuja los checkboxes de
       los 7 días (Dom..Sáb) marcando los días "selected". */
    function renderDayChecks(contId, selected) {
        const cont = document.getElementById(contId);
        const sel = selected || [];
        cont.innerHTML = App.DIAS.map(function (d) {
            const on = sel.indexOf(d.idx) !== -1 ? ' checked' : '';
            return '<label class="day-check"><input type="checkbox" value="' + d.idx + '"' + on + '>' +
                d.abbr + '</label>';
        }).join('');
    }

    /* fillPosSelects(p): llena los selects de posición actual
       (pedido y recepción) con los 7 días de la semana. */
    function fillPosSelects(p) {
        const opts = App.DIAS.map(function (d) {
            return '<option value="' + d.idx + '">' + d.nombre + '</option>';
        }).join('');
        const pe = document.getElementById('fPosEnvio');
        const pr = document.getElementById('fPosEntrega');
        pe.innerHTML = opts;
        pr.innerHTML = opts;
        pe.value = p.posDiaEnvio;
        pr.value = p.posDiaEntrega;
    }

    /* checkedVals(id): devuelve los índices de los días marcados
       en un grupo de checkboxes. */
    function checkedVals(id) {
        return Array.prototype.map.call(
            document.querySelectorAll('#' + id + ' input:checked'),
            function (c) { return +c.value; }
        );
    }

    /* ----------------------------------------------------------
       Apertura y cierre del modal
       ---------------------------------------------------------- */

    /* openModal(p): abre el modal en modo alta (p = null) o edición. */
    App.openModal = function (p) {
        editandoId = p ? p.id : null;
        document.getElementById('modalTitulo').textContent =
            editandoId ? 'Editar proveedor' : 'Nuevo proveedor';
        // Valores por defecto para el modo alta.
        const def = { frecuencia: 'semanal', transito: 1, anticipacion: 0, estricto: false, gigante: false, nota: '' };
        const v = Object.assign(def, p || {});
        document.getElementById('fNombre').value = v.nombre || '';
        document.getElementById('fFrecuencia').value = v.frecuencia;
        document.getElementById('fTransito').value = v.transito;
        document.getElementById('fAnticipacion').value = v.anticipacion;
        document.getElementById('fEstricto').checked = v.estricto;
        document.getElementById('fGigante').checked = v.gigante;
        document.getElementById('fNota').value = v.nota || '';
        renderDayChecks('fDiasEnvio', v.diasEnvio);
        renderDayChecks('fDiasEntrega', v.diasEntrega);
        fillPosSelects(v);
        document.getElementById('modal').classList.remove('hidden');
    };

    /* cerrarModal(): oculta el modal */
    function cerrarModal() {
        document.getElementById('modal').classList.add('hidden');
        editandoId = null;
    }

    /* ----------------------------------------------------------
       Guardar / Eliminar
       ---------------------------------------------------------- */

    /* guardar(): lee el formulario, valida y guarda (nuevo o editado). */
    function guardar() {
        const nombre = document.getElementById('fNombre').value.trim();
        if (!nombre) { App.toast('⚠️ Escribe el nombre del proveedor.'); return; }
        const frecuencia = document.getElementById('fFrecuencia').value;
        const diasEnvio = checkedVals('fDiasEnvio');
        const diasEntrega = checkedVals('fDiasEntrega');
        if (!diasEnvio.length) { App.toast('⚠️ Marca al menos un día de envío.'); return; }
        if (!diasEntrega.length) { App.toast('⚠️ Marca al menos un día de entrega.'); return; }
        const transito = +document.getElementById('fTransito').value;
        const anticipacion = +document.getElementById('fAnticipacion').value;
        const datos = {
            nombre: nombre,
            frecuencia: frecuencia,
            diasEnvio: diasEnvio,
            diasEntrega: diasEntrega,
            transito: isNaN(transito) ? 1 : transito,
            anticipacion: isNaN(anticipacion) ? 0 : anticipacion,
            estricto: document.getElementById('fEstricto').checked,
            gigante: document.getElementById('fGigante').checked,
            nota: document.getElementById('fNota').value.trim(),
            posDiaEnvio: +document.getElementById('fPosEnvio').value,
            posDiaEntrega: +document.getElementById('fPosEntrega').value,
            sobrescribirEntrega: false
        };
        if (editandoId) {
            // Edición: se conserva el id y se actualizan los campos.
            const p = App.getById(editandoId);
            Object.assign(p, App.normalize(datos));
            App.toast('💾 ' + p.nombre + ' actualizado.');
        } else {
            // Alta: se crea un proveedor nuevo.
            const nuevo = App.normalize(datos);
            App.proveedores.push(nuevo);
            App.toast('✅ ' + nuevo.nombre + ' agregado.');
        }
        App.save();
        App.renderCalendario();
        App.renderProveedores();
        cerrarModal();
    }

    /* eliminarProveedor(id): elimina con confirmación. */
    function eliminarProveedor(id) {
        const p = App.getById(id);
        if (!p) return;
        if (!confirm('¿Eliminar "' + p.nombre + '"?')) return;
        App.proveedores = App.proveedores.filter(function (x) { return x.id !== id; });
        App.save();
        App.renderCalendario();
        App.renderProveedores();
        App.toast('🗑️ ' + p.nombre + ' eliminado.');
    }

    /* ----------------------------------------------------------
       Listeners del modal
       ---------------------------------------------------------- */
    document.getElementById('btnAgregar').addEventListener('click', function () { App.openModal(null); });
    document.getElementById('btnCancelar').addEventListener('click', cerrarModal);
    document.getElementById('btnGuardar').addEventListener('click', guardar);
    // Clic en el fondo oscuro cierra el modal.
    document.getElementById('modal').addEventListener('click', function (e) {
        if (e.target === this) cerrarModal();
    });
    // Delegación: botones Editar / Eliminar de la tabla de proveedores.
    document.addEventListener('click', function (e) {
        const ed = e.target.closest ? e.target.closest('[data-edit]') : null;
        if (ed) { App.openModal(App.getById(ed.dataset.edit)); return; }
        const del = e.target.closest ? e.target.closest('[data-del]') : null;
        if (del) eliminarProveedor(del.dataset.del);
    });
    // Clic derecho sobre un proveedor del calendario: muestra un
    // menú contextual propio con la opción de editar (en lugar del
    // menú nativo del navegador).
    const ctxMenu = document.getElementById('ctxMenu');
    const ctxIr = document.getElementById('ctxIr');
    let ctxSupplierId = null;
    let ctxSupplierTipo = null;

    /* cerrarCtx(): oculta el menú contextual y olvida el proveedor. */
    function cerrarCtx() {
        ctxMenu.classList.add('hidden');
        ctxSupplierId = null;
        ctxSupplierTipo = null;
    }

    document.addEventListener('contextmenu', function (e) {
        const li = e.target.closest ? e.target.closest('.supplier') : null;
        if (!li) { cerrarCtx(); return; }
        e.preventDefault();
        ctxSupplierId = li.dataset.id;
        ctxSupplierTipo = li.dataset.tipo;
        // Texto dinámico según el calendario de origen
        ctxIr.textContent = ctxSupplierTipo === 'envio' ? '➡️ Ir a la recepción' : '⬅️ Ir al pedido';
        ctxIr.style.display = 'block';
        // Posiciona el menú junto al cursor, sin salirse de la ventana.
        ctxMenu.classList.remove('hidden');
        const mw = ctxMenu.offsetWidth || 170;
        const mh = ctxMenu.offsetHeight || 70;
        let x = e.clientX;
        let y = e.clientY;
        if (x + mw > window.innerWidth - 4) x = window.innerWidth - mw - 4;
        if (y + mh > window.innerHeight - 4) y = window.innerHeight - mh - 4;
        ctxMenu.style.left = Math.max(0, x) + 'px';
        ctxMenu.style.top = Math.max(0, y) + 'px';
    });

    // "Editar" del menú contextual abre el diálogo de edición.
    document.getElementById('ctxEdit').addEventListener('click', function () {
        const id = ctxSupplierId;
        cerrarCtx();
        if (id) App.openModal(App.getById(id));
    });

    // "Ir al pedido/recepción": desplaza hasta la entrada opuesta y la resalta.
    // Resalta tanto el proveedor (verde fuerte 4.5s) como toda la fila del día (verde bajo 3.5s, sin la cabecera).
    ctxIr.addEventListener('click', function () {
        const id = ctxSupplierId;
        const tipo = ctxSupplierTipo;
        cerrarCtx();
        if (!id || !tipo) return;
        const opuesto = tipo === 'envio' ? 'entrega' : 'envio';
        const target = document.querySelector('.supplier[data-id="' + id + '"][data-tipo="' + opuesto + '"]');
        if (!target) {
            App.toast('⚠️ No se encontró la entrada opuesta.');
            return;
        }
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Resaltado del proveedor (fuerte, 4.5s)
        target.classList.remove('ir-highlight');
        void target.offsetWidth;
        target.classList.add('ir-highlight');
        setTimeout(function () { target.classList.remove('ir-highlight'); }, 8000);
        // Resaltado sutil de toda la fila del día (5s, solo celdas de datos)
        const fila = target.closest('tr');
        if (fila) {
            fila.classList.remove('dia-highlight');
            void fila.offsetWidth;
            fila.classList.add('dia-highlight');
            setTimeout(function () { fila.classList.remove('dia-highlight'); }, 5000);
        }
    });

    // Se cierra al hacer clic fuera, con Escape, al hacer scroll o al
    // redimensionar la ventana.
    document.addEventListener('click', cerrarCtx);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrarCtx(); });
    window.addEventListener('scroll', cerrarCtx, true);
    window.addEventListener('resize', cerrarCtx);
    // Filtro de búsqueda por nombre.
    document.getElementById('filtroProveedores').addEventListener('input', App.renderProveedores);

    // Ordenamiento por columnas: clic alterna asc / desc.
    // La flecha del encabezado activo indica la dirección actual.
    const ths = document.querySelectorAll('#tablaProveedores th[data-sort]');
    for (let i = 0; i < ths.length; i++) {
        ths[i].addEventListener('click', function () {
            const k = this.dataset.sort;
            if (App.sortKey === k) {
                App.sortDir = -App.sortDir; // mismo clic -> invertir
            } else {
                App.sortKey = k; // nueva columna -> asc primero
                App.sortDir = 1;
            }
            const inds = document.querySelectorAll('#tablaProveedores .sort-ind');
            for (let j = 0; j < inds.length; j++) inds[j].textContent = '';
            this.querySelector('.sort-ind').textContent = App.sortDir === 1 ? '▲' : '▼';
            App.renderProveedores();
        });
    }

    /* ----------------------------------------------------------
       Exportar / Importar / Restaurar
       ---------------------------------------------------------- */

    /* Exportar: descarga la base de datos como archivo JSON. */
    document.getElementById('btnExportar').addEventListener('click', function () {
        const blob = new Blob([JSON.stringify(App.proveedores, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'calendario-proveedores.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        App.toast('📤 Base de datos exportada.');
    });

    /* Importar: dispara el input de archivo oculto. */
    document.getElementById('btnImportar').addEventListener('click', function () {
        document.getElementById('importFile').click();
    });

    /* Importar (archivo elegido): reemplaza la base de datos. */
    document.getElementById('importFile').addEventListener('change', function (e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function () {
            try {
                const arr = JSON.parse(reader.result);
                if (!Array.isArray(arr)) throw new Error('formato');
                App.proveedores = arr.map(App.normalize);
                App.save();
                App.renderCalendario();
                App.renderProveedores();
                App.toast('📥 Base de datos importada (' + arr.length + ' proveedores).');
            } catch (err) {
                App.toast('❌ El archivo no es un JSON válido.');
            }
            e.target.value = '';
        };
        reader.readAsText(file);
    });

    /* Restaurar original: pide la clave (de js/clave.js) y solo si
       coincide vuelve a la semilla incrustada. */
    document.getElementById('btnRestaurar').addEventListener('click', function () {
        const clave = prompt('Ingresa la clave para restaurar la base de datos original:');
        if (clave === null) return; // cancelado
        if ((clave || '').trim() !== App.CLAVE) {
            App.toast('❌ Clave incorrecta. No se restauró la base de datos.');
            return;
        }
        if (!confirm('¿Restaurar la base de datos original? Se perderán los cambios.')) return;
        App.proveedores = App.SEED_PROVEEDORES.map(App.normalize);
        App.save();
        App.renderCalendario();
        App.renderProveedores();
        App.toast('♻️ Base de datos restaurada a la versión original.');
    });

})();
