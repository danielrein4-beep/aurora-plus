/* ============================================================
   inventario.js — Módulo de Inventario y Stock de Carbones Tamanaco
   ============================================================ */

const InventarioModule = (() => {
  let productos = [];
  let busqueda = '';
  let editandoId = null;

  async function init() {
    await cargarProductos();
    const inputFecha = document.getElementById('im-fecha');
    if (inputFecha) inputFecha.value = Utils.today();
  }

  async function cargarProductos() {
    try {
      const data = await Api.get('/inventario/productos');
      if (Array.isArray(data)) {
        productos = data;
      }
    } catch (e) {
      console.warn('Cargando inventario local:', e);
      try {
        const raw = localStorage.getItem('tamanaco_inventario_prods');
        if (raw) productos = JSON.parse(raw);
      } catch (err) {}
    }

    if (!productos || productos.length === 0) {
      productos = [
        { id: 1, codigo: 'CARB-TER', nombre: 'Carbón Térmico Tipo A (Mina)', categoria: 'Carbón', unidadMedida: 'TON', stockActual: 1850.50, stockMinimo: 500.0, descripcion: 'Carbón de alto poder calorífico para exportación y termoeléctricas' },
        { id: 2, codigo: 'DIE-B500', nombre: 'Combustible Diesel / Gasoil', categoria: 'Combustibles', unidadMedida: 'GALONES', stockActual: 4200.00, stockMinimo: 1000.0, descripcion: 'Gasoil para camiones y excavadoras CAT' },
        { id: 3, codigo: 'LUB-15W40', nombre: 'Aceite Motor 15W40 Heavy Duty', categoria: 'Lubricantes', unidadMedida: 'LITROS', stockActual: 320.00, stockMinimo: 80.0, descripcion: 'Aceite mineral para motores diesel de carga pesada' },
        { id: 4, codigo: 'GRA-EP2', nombre: 'Grasa para Chasis y Rodamientos EP2', categoria: 'Lubricantes', unidadMedida: 'KG', stockActual: 150.00, stockMinimo: 40.0, descripcion: 'Grasa de litio para alta presión en maquinaria' },
        { id: 5, codigo: 'FIL-CAT320', nombre: 'Filtro de Aceite Excavadora CAT 320', categoria: 'Repuestos', unidadMedida: 'UNIDAD', stockActual: 12.00, stockMinimo: 4.0, descripcion: 'Filtros originales para mantenimiento preventivo' },
        { id: 6, codigo: 'HER-PICA', nombre: 'Picos Mineros de Acero Forjado', categoria: 'Herramientas', unidadMedida: 'UNIDAD', stockActual: 25.00, stockMinimo: 10.0, descripcion: 'Herramienta manual de excavación de mina' },
        { id: 7, codigo: 'REP-CORREA', nombre: 'Correa de Banda Transportadora 24"', categoria: 'Repuestos', unidadMedida: 'METROS', stockActual: 45.00, stockMinimo: 20.0, descripcion: 'Banda de caucho reforzada para tolva' }
      ];
      try {
        localStorage.setItem('tamanaco_inventario_prods', JSON.stringify(productos));
      } catch (e) {}
    }

    renderKPIs();
    renderTabla();
  }

  function renderKPIs() {
    const totalEl = document.getElementById('i-stat-total');
    const alertasEl = document.getElementById('i-stat-alertas');

    const total = productos.length;
    const alertas = productos.filter(p => (p.stockActual || 0) <= (p.stockMinimo || 0)).length;

    if (totalEl) totalEl.textContent = total;
    if (alertasEl) alertasEl.textContent = alertas;
  }

  function renderTabla() {
    const tbody = document.getElementById('i-tabla-productos');
    if (!tbody) return;

    let filtrados = productos;
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      filtrados = productos.filter(p =>
        (p.nombre && p.nombre.toLowerCase().includes(q)) ||
        (p.codigo && p.codigo.toLowerCase().includes(q)) ||
        (p.categoria && p.categoria.toLowerCase().includes(q))
      );
    }

    if (filtrados.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="color:var(--t-low); padding:24px;">No se encontraron productos en inventario</td></tr>`;
      return;
    }

    tbody.innerHTML = filtrados.map(p => {
      const stock = p.stockActual != null ? p.stockActual : 0;
      const min = p.stockMinimo != null ? p.stockMinimo : 0;
      const bajo = stock <= min;
      const badgeClass = bajo ? 'badge-red' : 'badge-green';
      const badgeText = bajo ? 'Bajo Stock' : 'Disponible';

      return `
        <tr>
          <td><span class="font-mono text-sm fw-600">${p.codigo || '—'}</span></td>
          <td>
            <div class="fw-600 text-high">${p.nombre}</div>
            ${p.descripcion ? `<div style="font-size:11px; color:var(--t-low);">${p.descripcion}</div>` : ''}
          </td>
          <td><span class="badge badge-subtle">${p.categoria || 'General'}</span></td>
          <td><span style="font-size:12px; color:var(--t-mid);">${p.unidadMedida || 'UNIDAD'}</span></td>
          <td class="text-right">
            <span class="fw-700 ${bajo ? 'text-red' : 'text-high'}" style="font-size:15px;">
              ${Utils.formatNumber(stock, 2)}
            </span>
            <span style="font-size:11px; color:var(--t-low); display:block;">Mín: ${Utils.formatNumber(min, 2)}</span>
          </td>
          <td class="text-center">
            <span class="badge ${badgeClass}">${badgeText}</span>
          </td>
          <td class="no-print text-right">
            <div class="flex gap-4 justify-end">
              <button class="btn btn-primary btn-sm" onclick="InventarioModule.abrirModalMovimiento(${p.id})" title="Registrar Entrada/Salida/Ajuste">
                Mover Stock
              </button>
              <button class="btn btn-ghost btn-sm" onclick="InventarioModule.editarProducto(${p.id})" title="Editar Ficha">
                Editar
              </button>
              <button class="btn btn-ghost btn-sm text-red" onclick="InventarioModule.eliminarProducto(${p.id})" title="Eliminar">
                ✕
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function setBusqueda(val) {
    busqueda = val || '';
    renderTabla();
  }

  async function guardarProducto() {
    const codigo = document.getElementById('i-codigo').value.trim();
    const nombre = document.getElementById('i-nombre').value.trim();
    const categoria = document.getElementById('i-categoria').value.trim();
    const unidadMedida = document.getElementById('i-unidad').value;
    const stockMinimo = parseFloat(document.getElementById('i-stock-minimo').value) || 0;
    const descripcion = document.getElementById('i-descripcion').value.trim();

    if (!nombre) {
      Toast.show('El nombre del producto es obligatorio', 'warning');
      return;
    }

    const payload = {
      codigo,
      nombre,
      categoria: categoria || 'General',
      unidadMedida: unidadMedida || 'UNIDAD',
      stockMinimo,
      descripcion
    };

    try {
      if (editandoId) {
        await Api.put(`/inventario/productos/${editandoId}`, payload);
        const idx = productos.findIndex(p => p.id === editandoId);
        if (idx !== -1) productos[idx] = { ...productos[idx], ...payload };
        Toast.show('Producto actualizado correctamente', 'success');
      } else {
        payload.stockActual = 0;
        const creado = await Api.post('/inventario/productos', payload);
        productos.unshift(creado || { id: Date.now(), ...payload });
        Toast.show('Producto agregado al catálogo', 'success');
      }
    } catch (e) {
      console.warn('Guardado local:', e);
      if (editandoId) {
        const idx = productos.findIndex(p => p.id === editandoId);
        if (idx !== -1) productos[idx] = { ...productos[idx], ...payload };
      } else {
        productos.unshift({ id: Date.now(), ...payload, stockActual: 0 });
      }
      Toast.show('Guardado localmente', 'info');
    }

    try {
      localStorage.setItem('tamanaco_inventario_prods', JSON.stringify(productos));
    } catch (e) {}

    limpiarForm();
    renderKPIs();
    renderTabla();
  }

  function editarProducto(id) {
    const p = productos.find(x => x.id === id);
    if (!p) return;

    editandoId = id;
    document.getElementById('i-codigo').value = p.codigo || '';
    document.getElementById('i-nombre').value = p.nombre || '';
    document.getElementById('i-categoria').value = p.categoria || '';
    document.getElementById('i-unidad').value = p.unidadMedida || 'UNIDAD';
    document.getElementById('i-stock-minimo').value = p.stockMinimo || 0;
    document.getElementById('i-descripcion').value = p.descripcion || '';

    const titleEl = document.getElementById('i-form-title');
    const cancelBtn = document.getElementById('i-btn-cancelar');
    if (titleEl) titleEl.textContent = `Editar Producto: ${p.nombre}`;
    if (cancelBtn) cancelBtn.style.display = 'inline-flex';

    document.getElementById('i-nombre').focus();
  }

  async function eliminarProducto(id) {
    if (!confirm('¿Seguro que deseas eliminar este producto del inventario?')) return;

    try {
      await Api.delete(`/inventario/productos/${id}`);
    } catch (e) {}

    productos = productos.filter(p => p.id !== id);
    try {
      localStorage.setItem('tamanaco_inventario_prods', JSON.stringify(productos));
    } catch (e) {}

    Toast.show('Producto eliminado del inventario', 'info');
    renderKPIs();
    renderTabla();
  }

  function limpiarForm() {
    editandoId = null;
    document.getElementById('i-codigo').value = '';
    document.getElementById('i-nombre').value = '';
    document.getElementById('i-categoria').value = '';
    document.getElementById('i-unidad').value = 'UNIDAD';
    document.getElementById('i-stock-minimo').value = '';
    document.getElementById('i-descripcion').value = '';

    const titleEl = document.getElementById('i-form-title');
    const cancelBtn = document.getElementById('i-btn-cancelar');
    if (titleEl) titleEl.textContent = 'Nuevo Producto / Insumo';
    if (cancelBtn) cancelBtn.style.display = 'none';
  }

  // ── MODAL MOVIMIENTO DE STOCK ──

  function abrirModalMovimiento(id) {
    const p = productos.find(x => x.id === id);
    if (!p) return;

    document.getElementById('im-producto-id').value = p.id;
    document.getElementById('im-producto-nombre').textContent = `${p.nombre} (${p.codigo || 'S/C'})`;
    document.getElementById('im-stock-actual').textContent = `${Utils.formatNumber(p.stockActual || 0, 2)} ${p.unidadMedida || 'UNIDAD'}`;
    document.getElementById('im-cantidad').value = '';
    document.getElementById('im-motivo').value = '';
    document.getElementById('im-referencia').value = '';
    document.getElementById('im-tipo').value = 'ENTRADA';
    alCambiarTipoMovimiento();

    document.getElementById('modal-movimiento-stock').style.display = 'flex';
  }

  function cerrarModalMovimiento() {
    document.getElementById('modal-movimiento-stock').style.display = 'none';
  }

  function alCambiarTipoMovimiento() {
    const tipo = document.getElementById('im-tipo').value;
    const label = document.getElementById('im-label-cantidad');
    if (!label) return;

    if (tipo === 'ENTRADA') label.textContent = 'Cantidad a Ingresar (+)';
    else if (tipo === 'SALIDA') label.textContent = 'Cantidad a Descontar (-)';
    else if (tipo === 'AJUSTE') label.textContent = 'Stock Físico Real Exacto (=)';
  }

  async function guardarMovimiento() {
    const id = parseInt(document.getElementById('im-producto-id').value);
    const tipo = document.getElementById('im-tipo').value;
    const cantidad = parseFloat(document.getElementById('im-cantidad').value);
    const motivo = document.getElementById('im-motivo').value.trim();
    const referencia = document.getElementById('im-referencia').value.trim();
    const fecha = document.getElementById('im-fecha').value || Utils.today();

    if (!cantidad || cantidad <= 0) {
      Toast.show('Ingresa una cantidad válida mayor a 0', 'warning');
      return;
    }

    const p = productos.find(x => x.id === id);
    if (!p) return;

    const payload = {
      producto: { id: p.id },
      tipo: tipo,
      cantidad: cantidad,
      motivo: motivo || (tipo + ' manual de inventario'),
      referencia: referencia,
      fecha: fecha + 'T12:00:00'
    };

    try {
      await Api.post('/inventario/movimientos', payload);
    } catch (e) {
      console.warn('Registro local de movimiento:', e);
    }

    // Actualizar stock local
    const stockAnt = p.stockActual || 0;
    if (tipo === 'ENTRADA') p.stockActual = stockAnt + cantidad;
    else if (tipo === 'SALIDA') p.stockActual = Math.max(0, stockAnt - cantidad);
    else if (tipo === 'AJUSTE') p.stockActual = cantidad;

    try {
      localStorage.setItem('tamanaco_inventario_prods', JSON.stringify(productos));
    } catch (e) {}

    Toast.show(`Stock de ${p.nombre} actualizado (${p.stockActual} ${p.unidadMedida})`, 'success');
    cerrarModalMovimiento();
    renderKPIs();
    renderTabla();
  }

  return {
    init,
    cargarProductos,
    setBusqueda,
    guardarProducto,
    editarProducto,
    eliminarProducto,
    limpiarForm,
    abrirModalMovimiento,
    cerrarModalMovimiento,
    alCambiarTipoMovimiento,
    guardarMovimiento
  };
})();
