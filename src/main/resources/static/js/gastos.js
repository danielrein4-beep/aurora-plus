/* ============================================================
   gastos.js — Módulo de Control de Gastos Operativos (v2)
   Soporte para:
   - Multi-moneda: Pesos (COP), Dólares (USD), Bolívares (VES)
   - Nuevas categorías: Préstamo, Impuesto, Alquiler, Transporte...
   - Préstamos asociados a Minas con recordatorio en Nómina
   ============================================================ */

const GastosModule = (() => {

  let state = {
    gastos: [],
    minas: [],
    editandoGastoId: null
  };

  const categorias = [
    'Nómina Minas',
    'Préstamo',
    'Alquiler Oficina',
    'Condominio',
    'Internet',
    'Impuesto CVM',
    'ISLR',
    'Transporte',
    'Combustible',
    'Mantenimiento de Vehículos',
    'Mantenimiento de Maquinaria',
    'Restaurante',
    'Alimentación',
    'Hospedaje',
    'Peajes / Viáticos',
    'Repuestos',
    'Servicios Públicos',
    'Nómina Extra',
    'Otros'
  ];

  const metodosPago = [
    'Efectivo',
    'Transferencia Bancaria',
    'Pago Móvil',
    'Binance (USDT / Cripto)',
    'Zelle / Dólares Efectivo',
    'Tarjeta de Débito/Crédito',
    'Cheque'
  ];

  const monedas = [
    { codigo: 'COP', nombre: 'COP — Pesos Colombianos', simbolo: '$' },
    { codigo: 'USD', nombre: 'USD — Dólares Americanos', simbolo: '$' },
    { codigo: 'VES', nombre: 'VES — Bolívares', simbolo: 'Bs.' }
  ];

  async function cargarGastos() {
    try {
      state.gastos = await Api.get('/gastos');
      try {
        state.minas = await Api.get('/minas');
        actualizarSelectMinas();
      } catch(e) {}

      renderTablaGastos();
      actualizarTotales();
    } catch (e) {
      // Error manejado por Api
    }
  }

  function actualizarSelectMinas() {
    const minaSelect = document.getElementById('g-mina');
    if (!minaSelect) return;
    minaSelect.innerHTML = '<option value="">-- Seleccionar Mina / Proveedor --</option>';
    state.minas.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.nombre;
      opt.textContent = m.nombre;
      minaSelect.appendChild(opt);
    });
  }

  function onCategoriaChange() {
    const cat = document.getElementById('g-categoria')?.value;
    const minaGroup = document.getElementById('g-mina-group');
    if (minaGroup) {
      minaGroup.style.display = (cat === 'Préstamo' || cat === 'Nómina Minas') ? 'block' : 'none';
    }
  }

  // ── Multi-moneda: mostrar/ocultar tasa de cambio y previsualizar equivalente en USD ──

  function onMonedaChange() {
    const moneda = document.getElementById('g-moneda')?.value;
    const tasaGroup = document.getElementById('g-tasa-group');
    const tasaLabel = document.getElementById('g-tasa-label');
    const tasaInput = document.getElementById('g-tasa-cambio');

    if (moneda === 'USD') {
      if (tasaGroup) tasaGroup.style.display = 'none';
    } else {
      if (tasaGroup) tasaGroup.style.display = 'block';
      if (tasaLabel) tasaLabel.textContent = moneda === 'VES' ? 'Tasa de Cambio (Bs./USD)' : 'Tasa de Cambio (COP/USD)';
      if (tasaInput) tasaInput.placeholder = moneda === 'VES' ? 'Ej: 40' : 'Ej: 4000';
    }
    actualizarPreviewUsd();
  }

  function actualizarPreviewUsd() {
    const preview = document.getElementById('g-preview-usd');
    if (!preview) return;

    const moneda = document.getElementById('g-moneda')?.value;
    const monto = parseFloat(document.getElementById('g-monto')?.value) || 0;

    if (moneda === 'USD') {
      preview.textContent = '';
      return;
    }

    const tasa = parseFloat(document.getElementById('g-tasa-cambio')?.value) || 0;
    if (!monto || !tasa) {
      preview.textContent = '';
      return;
    }

    const montoUsd = monto / tasa;
    preview.textContent = `≈ ${formatMonto(montoUsd, 'USD')}`;
  }

  function renderTablaGastos() {
    const tbody = document.getElementById('g-tabla-gastos-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (state.gastos.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty-state">
              <div class="empty-icon">—</div>
              <h3>Sin gastos registrados</h3>
              <p>Comienza añadiendo un nuevo gasto o préstamo operativo.</p>
            </div>
          </td>
        </tr>`;
      return;
    }

    const tipoGastoInfo = {
      FLETES_TRANSPORTE: { badge: 'badge-green', label: '🚚 Fletes y Transporte' },
      OPERATIVO_PATIO: { badge: 'badge-blue', label: '🚜 Operativo / Patio' },
      ADMINISTRATIVO_PERSONAL: { badge: 'badge-purple', label: '👔 Administrativo' }
    };

    state.gastos.forEach(g => {
      const isPrestamo = g.categoria === 'Préstamo';
      const tipoInfo = tipoGastoInfo[g.tipoGasto] || tipoGastoInfo.OPERATIVO_PATIO;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${Utils.formatDate(g.fecha)}</td>
        <td>
          <span class="badge ${isPrestamo ? 'badge-yellow' : 'badge-default'}">
            ${g.categoria}
          </span>
          <div style="margin-top:3px;">
            <span class="badge ${tipoInfo.badge}" style="font-size:10px;">
              ${tipoInfo.label}
            </span>
          </div>
          ${isPrestamo && g.minaAsociada ? `<div style="font-size:11px; color:var(--c-accent); margin-top:2px;">Mina: <strong>${g.minaAsociada}</strong></div>` : ''}
        </td>
        <td>
          <div>${g.descripcion}</div>
          ${isPrestamo ? `
            <span class="badge ${g.descontado ? 'badge-green' : 'badge-red'}" style="font-size:10px; margin-top:3px; cursor:pointer;" onclick="GastosModule.toggleDescontado(${g.id})" title="Clic para cambiar estado">
              ${g.descontado ? 'Descontado / Saldado' : 'Pendiente por cobrar'}
            </span>
          ` : ''}
        </td>
        <td><span class="badge badge-blue">${g.metodoPago}</span></td>
        <td><span class="badge badge-default">${g.moneda || 'COP'}</span></td>
        <td class="text-right fw-700" style="color:var(--c-red);">
          ${formatMonto(g.monto, g.moneda)}
          ${(g.moneda && g.moneda !== 'USD' && g.montoUsd) ? `<div style="font-size:10px; color:var(--t-low); font-weight:400;">≈ ${formatMonto(g.montoUsd, 'USD')}</div>` : ''}
        </td>
        <td class="no-print no-export">
          <div class="td-actions">
            <button class="btn btn-warn btn-sm" onclick="GastosModule.editarGasto(${g.id})">Editar</button>
            <button class="btn btn-danger btn-sm" onclick="GastosModule.eliminarGasto(${g.id})">Borrar</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function actualizarTotales() {
    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();

    const gastosMes = state.gastos.filter(g => {
      const d = new Date(g.fecha + 'T12:00:00');
      return d.getMonth() === mesActual && d.getFullYear() === anioActual;
    });

    const totalCOP = gastosMes.filter(g => (g.moneda || 'COP') === 'COP').reduce((s, g) => s + g.monto, 0);
    const totalUSD = gastosMes.filter(g => g.moneda === 'USD').reduce((s, g) => s + g.monto, 0);
    const totalVES = gastosMes.filter(g => g.moneda === 'VES').reduce((s, g) => s + g.monto, 0);

    const statCOP = document.getElementById('g-total-mes-cop');
    const statUSD = document.getElementById('g-total-mes-usd');
    const statVES = document.getElementById('g-total-mes-ves');

    if (statCOP) statCOP.textContent = formatMonto(totalCOP, 'COP');
    if (statUSD) statUSD.textContent = formatMonto(totalUSD, 'USD');
    if (statVES) statVES.textContent = formatMonto(totalVES, 'VES');
  }

  async function guardarGasto() {
    const fecha = document.getElementById('g-fecha').value;
    const categoria = document.getElementById('g-categoria').value;
    const tipoGasto = document.getElementById('g-tipo-gasto').value;
    const descripcion = document.getElementById('g-descripcion').value.trim();
    const metodoPago = document.getElementById('g-metodo-pago').value;
    const moneda = document.getElementById('g-moneda').value;
    const minaAsociada = (categoria === 'Préstamo' || categoria === 'Nómina Minas') ? document.getElementById('g-mina').value : null;
    const montoStr = document.getElementById('g-monto').value;
    const monto = parseFloat(montoStr);
    const tasaCambioUsd = moneda !== 'USD' ? (parseFloat(document.getElementById('g-tasa-cambio').value) || null) : null;

    if (!fecha || !categoria || !descripcion || !metodoPago || !moneda || isNaN(monto) || monto <= 0) {
      Toast.show('Por favor, completa todos los campos correctamente.', 'warning');
      return;
    }

    if ((categoria === 'Préstamo' || categoria === 'Nómina Minas') && (!minaAsociada || minaAsociada.trim() === '')) {
      Toast.show('Selecciona la mina o proveedor asociado.', 'warning');
      return;
    }

    if (moneda !== 'USD' && !tasaCambioUsd) {
      Toast.show('Ingresa la tasa de cambio a USD para este gasto.', 'warning');
      return;
    }

    const payload = {
      fecha, categoria, tipoGasto, descripcion, metodoPago, moneda, minaAsociada, monto, tasaCambioUsd
    };

    try {
      if (state.editandoGastoId) {
        await Api.put(`/gastos/${state.editandoGastoId}`, payload);
        Toast.show('Gasto actualizado con éxito', 'success');
      } else {
        await Api.post('/gastos', payload);
        Toast.show('Gasto registrado con éxito', 'success');
      }
      limpiarForm();
      cargarGastos();
    } catch (e) {}
  }

  async function toggleDescontado(id) {
    try {
      await Api.patch(`/gastos/${id}/toggle-descontado`, {});
      Toast.show('Estado del préstamo actualizado', 'info');
      cargarGastos();
    } catch (e) {}
  }

  function editarGasto(id) {
    const g = state.gastos.find(x => x.id === id);
    if (!g) return;

    state.editandoGastoId = id;
    
    document.getElementById('g-fecha').value = g.fecha;
    document.getElementById('g-categoria').value = g.categoria;
    document.getElementById('g-tipo-gasto').value = g.tipoGasto || 'OPERATIVO_PATIO';
    document.getElementById('g-descripcion').value = g.descripcion;
    document.getElementById('g-metodo-pago').value = g.metodoPago;
    document.getElementById('g-moneda').value = g.moneda || 'COP';
    document.getElementById('g-monto').value = g.monto;
    document.getElementById('g-tasa-cambio').value = g.tasaCambioUsd || '';

    onCategoriaChange();
    onMonedaChange();
    if (g.categoria === 'Préstamo' && g.minaAsociada) {
      document.getElementById('g-mina').value = g.minaAsociada;
    }

    document.getElementById('g-form-title').textContent = 'Editar gasto / préstamo';
    document.getElementById('g-btn-cancelar').style.display = 'inline-flex';

    document.getElementById('g-form-title').closest('.card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function eliminarGasto(id) {
    if (!await Utils.confirm('¿Seguro que deseas eliminar este gasto?')) return;
    try {
      await Api.delete(`/gastos/${id}`);
      Toast.show('Gasto eliminado', 'success');
      cargarGastos();
    } catch (e) {}
  }

  function limpiarForm() {
    state.editandoGastoId = null;
    document.getElementById('g-fecha').value = Utils.today();
    document.getElementById('g-descripcion').value = '';
    document.getElementById('g-monto').value = '';
    document.getElementById('g-tasa-cambio').value = '';
    document.getElementById('g-preview-usd').textContent = '';

    document.getElementById('g-categoria').selectedIndex = 0;
    document.getElementById('g-tipo-gasto').selectedIndex = 0;
    document.getElementById('g-metodo-pago').selectedIndex = 0;
    document.getElementById('g-moneda').selectedIndex = 0;

    onCategoriaChange();
    onMonedaChange();

    document.getElementById('g-form-title').textContent = 'Nuevo gasto / préstamo';
    document.getElementById('g-btn-cancelar').style.display = 'none';
  }

  function poblarSelects() {
    const catSelect = document.getElementById('g-categoria');
    const metSelect = document.getElementById('g-metodo-pago');
    const monSelect = document.getElementById('g-moneda');

    if (catSelect && catSelect.options.length === 0) {
      categorias.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c; opt.textContent = c;
        catSelect.appendChild(opt);
      });
      catSelect.onchange = onCategoriaChange;
    }

    if (metSelect && metSelect.options.length === 0) {
      metodosPago.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m; opt.textContent = m;
        metSelect.appendChild(opt);
      });
    }

    if (monSelect && monSelect.options.length === 0) {
      monedas.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.codigo; opt.textContent = m.nombre;
        monSelect.appendChild(opt);
      });
      monSelect.onchange = onMonedaChange;
    }

    const montoInput = document.getElementById('g-monto');
    const tasaInput = document.getElementById('g-tasa-cambio');
    if (montoInput) montoInput.oninput = actualizarPreviewUsd;
    if (tasaInput) tasaInput.oninput = actualizarPreviewUsd;
  }

  function formatMonto(amount, moneda = 'COP') {
    const num = amount || 0;
    if (moneda === 'USD') {
      return '$ ' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num) + ' USD';
    }
    if (moneda === 'VES') {
      return 'Bs. ' + new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
    }
    return '$ ' + new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num) + ' COP';
  }

  function init() {
    poblarSelects();
    document.getElementById('g-fecha').value = Utils.today();
    onMonedaChange();
    cargarGastos();
  }

  return {
    init,
    guardarGasto,
    editarGasto,
    eliminarGasto,
    limpiarForm,
    toggleDescontado,
    onCategoriaChange,
    onMonedaChange
  };

})();
