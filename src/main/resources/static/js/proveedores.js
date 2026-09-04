/* ============================================================
   proveedores.js — Módulo de Proveedores, Alianzas y Brigadas
   Totalmente automatizado con Despachos, Saldo Pendiente y Gastos
   ============================================================ */

const ProveedoresModule = (() => {

  let state = {
    proveedores: [],
    editandoProveedorId: null,
    historialActual: null
  };

  const tiposProveedor = [
    'Alianza',
    'Brigada',
    'Mina de Carbón',
    'Combustible / Gasoil',
    'Repuestos y Mecánica',
    'Transporte de Carga',
    'Servicios',
    'General'
  ];

  async function cargarProveedores() {
    try {
      state.proveedores = await Api.get('/proveedores');
      renderTablaProveedores();
    } catch (e) {
      // Error manejado por Api
    }
  }

  function renderTablaProveedores() {
    const tbody = document.getElementById('p-tabla-proveedores');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (state.proveedores.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="empty-state">
              <div class="empty-icon">—</div>
              <h3>Sin aliados o proveedores registrados</h3>
              <p>Al registrar un viaje en Despachos, la mina o alianza se creará aquí de forma 100% automática.</p>
            </div>
          </td>
        </tr>`;
      return;
    }

    state.proveedores.forEach(p => {
      const tr = document.createElement('tr');
      let badgeTipo = 'badge-blue';
      if (p.tipo === 'Alianza') badgeTipo = 'badge-purple';
      if (p.tipo === 'Brigada') badgeTipo = 'badge-yellow';
      if (p.tipo === 'Mina de Carbón') badgeTipo = 'badge-green';

      tr.innerHTML = `
        <td>
          <div style="font-weight:700; color:var(--t-high);">${p.nombre}</div>
          <div style="font-size:11px; color:var(--t-low);">${p.contacto ? 'Contacto: ' + p.contacto : ''}</div>
        </td>
        <td><span class="badge ${badgeTipo}">${p.tipo}</span></td>
        <td>${p.telefono || '—'}</td>
        <td>${p.direccion || '—'}</td>
        <td>
          <span class="badge ${p.activo ? 'badge-green' : 'badge-red'}">
            ${p.activo ? 'Activo' : 'Inactivo'}
          </span>
        </td>
        <td class="no-print">
          <button class="btn btn-primary btn-sm" onclick="ProveedoresModule.verHistorial(${p.id})" title="Ver expediente y balance">
            Historial
          </button>
        </td>
        <td class="no-print">
          <div class="td-actions">
            <button class="btn btn-warn btn-sm" onclick="ProveedoresModule.editarProveedor(${p.id})">Editar</button>
            <button class="btn btn-warn btn-sm" onclick="ProveedoresModule.desactivarProveedor(${p.id})">
              ${p.activo ? 'Desactivar' : 'Activar'}
            </button>
            ${Auth.isAdmin() ? `<button class="btn btn-danger btn-sm" onclick="ProveedoresModule.eliminarProveedor(${p.id})" title="Borrar permanentemente">Borrar</button>` : ''}
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  async function guardarProveedor() {
    const nombre = document.getElementById('p-nombre').value.trim();
    const telefono = document.getElementById('p-telefono').value.trim();
    const contacto = document.getElementById('p-contacto').value.trim();
    const tipo = document.getElementById('p-tipo').value;
    const direccion = document.getElementById('p-direccion').value.trim();
    const activo = document.getElementById('p-activo').value === 'true';

    if (!nombre || !tipo) {
      Toast.show('El nombre y tipo son obligatorios', 'warning');
      return;
    }

    const payload = { nombre, telefono, contacto, tipo, direccion, activo };

    try {
      if (state.editandoProveedorId) {
        await Api.put(`/proveedores/${state.editandoProveedorId}`, payload);
        Toast.show('Datos actualizados con éxito', 'success');
      } else {
        await Api.post('/proveedores', payload);
        Toast.show(`"${nombre}" registrado y su historial fue creado`, 'success');
      }
      limpiarForm();
      cargarProveedores();
    } catch (e) {}
  }

  function editarProveedor(id) {
    const p = state.proveedores.find(x => x.id === id);
    if (!p) return;

    state.editandoProveedorId = id;

    document.getElementById('p-nombre').value = p.nombre;
    document.getElementById('p-telefono').value = p.telefono || '';
    document.getElementById('p-contacto').value = p.contacto || '';
    document.getElementById('p-tipo').value = p.tipo;
    document.getElementById('p-direccion').value = p.direccion || '';
    document.getElementById('p-activo').value = p.activo ? 'true' : 'false';

    document.getElementById('p-form-title').textContent = `Editando: ${p.nombre}`;
    document.getElementById('p-btn-cancelar').style.display = 'inline-flex';

    document.getElementById('p-form-title').closest('.card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function desactivarProveedor(id) {
    const p = state.proveedores.find(x => x.id === id);
    if (!p) return;

    const accion = p.activo ? 'desactivar' : 'reactivar';
    if (!await Utils.confirm(`¿Seguro que deseas ${accion} a "${p.nombre}"?`)) return;

    try {
      await Api.delete(`/proveedores/${id}`);
      Toast.show(`Estado actualizado`, 'info');
      cargarProveedores();
    } catch (e) {}
  }

  function limpiarForm() {
    state.editandoProveedorId = null;
    document.getElementById('p-nombre').value = '';
    document.getElementById('p-telefono').value = '';
    document.getElementById('p-contacto').value = '';
    document.getElementById('p-direccion').value = '';
    document.getElementById('p-tipo').selectedIndex = 0;
    document.getElementById('p-activo').value = 'true';

    document.getElementById('p-form-title').textContent = 'Nuevo aliado / proveedor';
    document.getElementById('p-btn-cancelar').style.display = 'none';
  }

  // ----------------------------------------------------------
  // EXPEDIENTE, HISTORIAL Y SALDO PENDIENTE
  // ----------------------------------------------------------
  async function verHistorial(id) {
    try {
      const data = await Api.get(`/proveedores/${id}/historial`);
      state.historialActual = data;
      renderModalHistorial(data);
    } catch (e) {}
  }

  function renderModalHistorial(data) {
    const p = data.proveedor;
    const modal = document.getElementById('p-modal-historial');
    if (!modal) return;

    document.getElementById('p-hist-nombre').textContent = p.nombre;
    document.getElementById('p-hist-tipo').textContent = p.tipo;
    document.getElementById('p-hist-contacto').textContent = p.contacto ? `Contacto: ${p.contacto}` : '';
    document.getElementById('p-hist-telefono').textContent = p.telefono ? `Tel: ${p.telefono}` : '';
    document.getElementById('p-hist-direccion').textContent = p.direccion ? `Ubicación: ${p.direccion}` : '';

    // Saldo pendiente y estadísticas de balance
    const saldoPendiente = data.saldoPendienteCop || 0;
    const saldoEl = document.getElementById('p-hist-saldo-pendiente');
    const saldoCardEl = document.getElementById('p-hist-card-saldo');

    if (saldoEl) {
      saldoEl.textContent = formatMonto(saldoPendiente, 'COP');
    }
    if (saldoCardEl) {
      saldoCardEl.className = 'stat-card ' + (saldoPendiente > 0 ? 's-red' : 's-green');
    }

    document.getElementById('p-hist-devengado').textContent = formatMonto(data.totalDevengadoCargasCop, 'COP');
    document.getElementById('p-hist-pagado-cop').textContent = formatMonto(data.totalPagosRealizadosCop, 'COP');
    document.getElementById('p-hist-ton').textContent = `${Utils.formatNumber(data.totalToneladas)} Ton (${data.totalDespachos} viajes)`;

    // Tabla de despachos y cargas suministradas
    const tbodyDespachos = document.getElementById('p-hist-tabla-despachos');
    if (tbodyDespachos) {
      tbodyDespachos.innerHTML = '';
      if (!data.despachos || data.despachos.length === 0) {
        tbodyDespachos.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding:12px;">No hay viajes de carga registrados aún</td></tr>';
      } else {
        data.despachos.forEach(d => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${Utils.formatDate(d.fecha)}</td>
            <td>${d.chofer || '—'}</td>
            <td><span class="badge badge-blue">${d.placa || '—'}</span></td>
            <td class="text-right fw-600">${Utils.formatNumber(d.peso)} Ton</td>
            <td class="text-right text-muted">${d.tarifa > 0 ? formatMonto(d.tarifa, 'COP') : '<span class="badge badge-yellow">Sin tarifa</span>'}</td>
            <td class="text-right fw-700" style="color:var(--t-high);">${d.totalCop > 0 ? formatMonto(d.totalCop, 'COP') : '—'}</td>
            <td class="text-center">
              ${d.ticketUrl
                ? `<button class="btn btn-ghost btn-sm" onclick="Utils.mostrarPDF('${d.ticketUrl}', 'Ticket Viaje #${d.id}')" style="padding:2px 6px; font-size:10px; color:var(--c-blue);">❖ Ver Ticket</button>`
                : `<span style="font-size:10px; color:var(--c-red); font-weight:600;">Falta Ticket</span>`
              }
            </td>
          `;
          tbodyDespachos.appendChild(tr);
        });
      }
    }

    const tbodyGastos = document.getElementById('p-hist-tabla-gastos');
    if (tbodyGastos) {
      tbodyGastos.innerHTML = '';
      if (!data.gastos || data.gastos.length === 0) {
        tbodyGastos.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding:12px;">No hay pagos ni gastos registrados</td></tr>';
      } else {
        data.gastos.forEach(g => {
          const tr = document.createElement('tr');
          const isPrestamo = g.categoria === 'Préstamo';
          tr.innerHTML = `
            <td>${Utils.formatDate(g.fecha)}</td>
            <td><span class="badge ${isPrestamo ? 'badge-yellow' : 'badge-default'}">${g.categoria}</span></td>
            <td>${g.descripcion}</td>
            <td><span class="badge badge-blue">${g.metodoPago}</span></td>
            <td class="text-right fw-700" style="color:${isPrestamo ? 'var(--c-amber)' : 'var(--c-green)'};">${formatMonto(g.monto, g.moneda)}</td>
            <td class="text-center">
              <button class="btn btn-ghost btn-sm" onclick="Utils.imprimirComprobante(${g.id}, '${data.proveedor.nombre}', '${g.fecha}', '${g.concepto || g.descripcion}', ${g.monto}, '${g.moneda}', '${data.proveedor.tipo}')" title="Imprimir Comprobante de Pago">PDF</button>
              ${g.ticketUrl
                ? `<button class="btn btn-ghost btn-sm" onclick="Utils.mostrarPDF('${g.ticketUrl}', 'Soporte #${g.id}')" style="padding:2px 6px; font-size:10px; color:var(--c-blue);" title="Ver recibo cargado">Ver Recibo</button>`
                : `<label class="btn btn-sm btn-subtle" style="padding:2px 6px; font-size:10px; cursor:pointer; margin:0;" title="Subir foto del recibo firmado">
                     Subir
                     <input type="file" style="display:none;" accept="image/*,.pdf" onchange="ProveedoresModule.subirReciboGasto(${g.id}, this, ${data.proveedor.id})">
                   </label>`
              }
            </td>
          `;
          tbodyGastos.appendChild(tr);
        });
      }
    }

    // Tabla de bitácora y notas
    const tbodyEventos = document.getElementById('p-hist-tabla-eventos');
    if (tbodyEventos) {
      tbodyEventos.innerHTML = '';
      if (!data.eventos || data.eventos.length === 0) {
        tbodyEventos.innerHTML = '<tr><td colspan="3" class="text-center text-muted" style="padding:12px;">Sin registros en la bitácora</td></tr>';
      } else {
        data.eventos.forEach(e => {
          const tr = document.createElement('tr');
          const fechaStr = e.fecha ? e.fecha.replace('T', ' ').substring(0, 16) : '—';
          let badgeEvento = 'badge-purple';
          if (e.tipoEvento === 'DESPACHO') badgeEvento = 'badge-green';
          if (e.tipoEvento === 'REGISTRO') badgeEvento = 'badge-blue';
          if (e.tipoEvento === 'NOTA') badgeEvento = 'badge-yellow';

          tr.innerHTML = `
            <td style="font-size:11px; color:var(--t-low);">${fechaStr}</td>
            <td><span class="badge ${badgeEvento}">${e.tipoEvento}</span></td>
            <td>${e.descripcion}</td>
          `;
          tbodyEventos.appendChild(tr);
        });
      }
    }

    modal.style.display = 'flex';
  }

  function cerrarModalHistorial() {
    const modal = document.getElementById('p-modal-historial');
    if (modal) modal.style.display = 'none';
  }

  async function agregarNotaRapida() {
    if (!state.historialActual || !state.historialActual.proveedor) return;
    const input = document.getElementById('p-nueva-nota');
    const nota = input?.value?.trim();
    if (!nota) {
      Toast.show('Escribe una nota antes de guardar', 'warning');
      return;
    }

    try {
      await Api.post(`/proveedores/${state.historialActual.proveedor.id}/nota`, { nota });
      Toast.show('Nota agregada al expediente', 'success');
      input.value = '';
      verHistorial(state.historialActual.proveedor.id);
    } catch (e) {}
  }

  function pagarSaldoPendiente() {
    if (!state.historialActual || !state.historialActual.proveedor) return;
    const p = state.historialActual.proveedor;
    const saldo = state.historialActual.saldoPendienteCop || 0;

    cerrarModalHistorial();
    Router.navigate('gastos');

    setTimeout(() => {
      const descInput = document.getElementById('g-descripcion');
      const montoInput = document.getElementById('g-monto');
      const catInput = document.getElementById('g-categoria');
      const minaInput = document.getElementById('g-mina');

      if (descInput) descInput.value = `Liquidación / Pago de carbón a ${p.nombre}`;
      if (montoInput && saldo > 0) montoInput.value = saldo;
      if (catInput) catInput.value = 'Nómina Extra';
      if (minaInput) minaInput.value = p.nombre;

      descInput?.focus();
      Toast.show(`Completando pago para ${p.nombre}`, 'info');
    }, 150);
  }

  function poblarTipos() {
    const tipoSelect = document.getElementById('p-tipo');
    if (tipoSelect && tipoSelect.options.length === 0) {
      tiposProveedor.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t; opt.textContent = t;
        tipoSelect.appendChild(opt);
      });
    }
  }

  function formatMonto(amount, moneda = 'COP') {
    const num = amount || 0;
    if (moneda === 'USD') return '$ ' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num) + ' USD';
    if (moneda === 'VES') return 'Bs. ' + new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
    return '$ ' + new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num) + ' COP';
  }

  async function eliminarProveedor(id) {
    const p = state.proveedores.find(x => x.id === id);
    if (!p) return;

    const ok = await Utils.confirm(`¿Estás seguro de que quieres eliminar a ${p.nombre}? Esto borrará también todo su historial (notas, etc).`);
    if (!ok) return;

    try {
      await Api.delete(`/proveedores/${id}/permanente`);
      Toast.show('Proveedor eliminado exitosamente', 'success');
      cargarProveedores();
    } catch (e) {
      // Error manejado por Api
    }
  }

  async function subirReciboGasto(gastoId, inputElement, proveedorId) {
    const file = inputElement.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      inputElement.parentElement.innerHTML = '<span style="font-size:10px; color:var(--c-gold);">Subiendo...</span>';
      
      const data = await Api.uploadFormData(`/gastos/${gastoId}/upload-recibo`, formData);
      
      Utils.showToast(data.mensaje || 'Recibo subido con éxito', 'success');
      
      // Recargar el historial para ver el botón actualizado
      await verHistorial(proveedorId);
      
    } catch (e) {
      console.error(e);
      Utils.showToast(e.message, 'error');
      await verHistorial(proveedorId); // Recargar en caso de error para restablecer el botón
    }
  }

  function init() {
    poblarTipos();
    cargarProveedores();
  }

  return {
    init,
    guardarProveedor,
    editarProveedor,
    desactivarProveedor,
    eliminarProveedor,
    limpiarForm,
    verHistorial,
    cerrarModalHistorial,
    agregarNotaRapida,
    pagarSaldoPendiente,
    subirReciboGasto
  };

})();
