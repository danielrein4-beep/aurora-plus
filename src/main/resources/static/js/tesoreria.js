/* ============================================================
   tesoreria.js — Módulo de Tesorería, Ingresos y Flujo de Caja
   Exclusivo para Administradores
   ============================================================ */

const TesoreriaModule = (() => {

  let state = {
    flujoCaja: null,
    ingresos: [],
    cambios: [],
    filtroMoneda: 'TODAS',
    filtroTipo: 'TODAS',
    fechaInicio: '',
    fechaFin: '',
    busqueda: '',
    editandoIngresoId: null,
    editandoCambioId: null
  };

  const metodosPago = [
    'Transferencia Bancaria',
    'Binance (USDT / Cripto)',
    'Pago Móvil',
    'Efectivo Dólares (USD)',
    'Efectivo Pesos (COP)',
    'Efectivo Bolívares (VES)',
    'Zelle',
    'Tarjeta de Débito/Crédito',
    'Cheque'
  ];

  async function cargarDatos() {
    try {
      state.flujoCaja = await Api.get('/tesoreria/flujo-caja');
      state.ingresos  = await Api.get('/tesoreria/ingresos');
      state.cambios   = await Api.get('/tesoreria/cambios');
      renderKPIs();
      renderTablaLibroDiario();
      renderTablaIngresos();
      renderTablaCambios();
    } catch (e) {
      // Error manejado por Api
    }
  }

  function renderKPIs() {
    if (!state.flujoCaja) return;
    const f = state.flujoCaja;

    // Saldo Disponible COP
    const elSaldoCop = document.getElementById('t-saldo-cop');
    const elCardCop = document.getElementById('t-card-cop');
    if (elSaldoCop) elSaldoCop.textContent = formatMonto(f.saldoDisponibleCop, 'COP');
    if (elCardCop) elCardCop.className = 'stat-card ' + (f.saldoDisponibleCop >= 0 ? 's-green' : 's-red');

    document.getElementById('t-ingresos-cop').textContent = formatMonto(f.totalIngresosCop, 'COP');
    document.getElementById('t-gastos-cop').textContent = formatMonto(f.totalGastosCop, 'COP');

    // Saldo Disponible USD
    const elSaldoUsd = document.getElementById('t-saldo-usd');
    const elCardUsd = document.getElementById('t-card-usd');
    if (elSaldoUsd) elSaldoUsd.textContent = formatMonto(f.saldoDisponibleUsd, 'USD');
    if (elCardUsd) elCardUsd.className = 'stat-card ' + (f.saldoDisponibleUsd >= 0 ? 's-green' : 's-red');

    document.getElementById('t-ingresos-usd').textContent = formatMonto(f.totalIngresosUsd, 'USD');
    document.getElementById('t-gastos-usd').textContent = formatMonto(f.totalGastosUsd, 'USD');

    // Saldo Disponible VES
    const elSaldoVes = document.getElementById('t-saldo-ves');
    const elCardVes = document.getElementById('t-card-ves');
    if (elSaldoVes) elSaldoVes.textContent = formatMonto(f.saldoDisponibleVes, 'VES');
    if (elCardVes) elCardVes.className = 'stat-card ' + (f.saldoDisponibleVes >= 0 ? 's-green' : 's-red');

    document.getElementById('t-ingresos-ves').textContent = formatMonto(f.totalIngresosVes, 'VES');
    document.getElementById('t-gastos-ves').textContent = formatMonto(f.totalGastosVes, 'VES');
  }

  // Filtra también por tipo (TODAS / INGRESO / EGRESO) y por fechas
  function renderTablaLibroDiario() {
    const tbody = document.getElementById('t-tabla-movimientos');
    if (!tbody || !state.flujoCaja) return;
    tbody.innerHTML = '';

    let movimientos = state.flujoCaja.movimientos || [];

    // Filtro por moneda
    if (state.filtroMoneda !== 'TODAS') {
      movimientos = movimientos.filter(m => (m.moneda || 'COP').toUpperCase() === state.filtroMoneda);
    }

    // Filtro por tipo (INGRESO / EGRESO)
    if (state.filtroTipo !== 'TODAS') {
      movimientos = movimientos.filter(m => m.tipo === state.filtroTipo);
    }

    // Filtro por rango de fechas
    if (state.fechaInicio) {
      movimientos = movimientos.filter(m => m.fecha >= state.fechaInicio);
    }
    if (state.fechaFin) {
      movimientos = movimientos.filter(m => m.fecha <= state.fechaFin);
    }

    // Filtro de búsqueda
    if (state.busqueda) {
      const q = state.busqueda.toLowerCase();
      movimientos = movimientos.filter(m =>
        (m.concepto && m.concepto.toLowerCase().includes(q)) ||
        (m.origen && m.origen.toLowerCase().includes(q)) ||
        (m.categoria && m.categoria.toLowerCase().includes(q))
      );
    }

    // Ordenar estrictamente: más reciente primero (por createdAt o fecha + id)
    movimientos.sort((a, b) => {
      const ta = a.createdAt || (a.fecha ? a.fecha + 'T00:00:00' : '');
      const tb = b.createdAt || (b.fecha ? b.fecha + 'T00:00:00' : '');
      if (tb && ta && tb !== ta) return tb.localeCompare(ta);
      return (b.id || 0) - (a.id || 0);
    });

    if (movimientos.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty-state">
              <div class="empty-icon">—</div>
              <h3>Sin movimientos financieros</h3>
              <p>Registra depósitos de cobros o revisa los gastos ingresados.</p>
            </div>
          </td>
        </tr>`;
      return;
    }

    movimientos.forEach(m => {
      const tr = document.createElement('tr');
      const isIngreso = m.tipo === 'INGRESO';
      const isCambio  = m.tipo === 'CAMBIO';

      // Columna de monto: especial para cambios (muestra ambas monedas)
      let montoHtml;
      if (isCambio) {
        montoHtml = `<span style="color:var(--c-blue); font-weight:700;">
          ${formatMonto(m.monto, m.monedaOrigen)} &rarr; ${formatMonto(m.montoDestino, m.monedaDestino)}
        </span>`;
      } else {
        const color = isIngreso ? 'var(--c-green)' : 'var(--c-red)';
        const signo = isIngreso ? '+' : '-';
        montoHtml = `<span style="color:${color}; font-weight:700;">${signo} ${formatMonto(m.monto, m.moneda)}</span>`;
      }

      let fechaDisplay = Utils.formatDate(m.fecha);
      if (m.hora) {
        fechaDisplay = `<div style="font-weight:600;">${Utils.formatDate(m.fecha)}</div><div style="font-size:11px; color:var(--t-low);">${m.hora}</div>`;
      } else if (m.createdAt && m.createdAt.includes('T')) {
        const hora = m.createdAt.split('T')[1].substring(0, 8);
        fechaDisplay = `<div style="font-weight:600;">${Utils.formatDate(m.fecha)}</div><div style="font-size:11px; color:var(--t-low);">${hora}</div>`;
      }

      tr.innerHTML = `
        <td>${fechaDisplay}</td>
        <td>
          <span class="badge ${
            isIngreso ? 'badge-green' : isCambio ? 'badge-blue' : 'badge-red'
          }">${m.tipo}</span>
        </td>
        <td>
          <div style="font-weight:600; color:var(--t-high);">${m.concepto}</div>
          <div style="font-size:11px; color:var(--t-low);">${m.origen ? 'Origen / Destino: ' + m.origen : ''}</div>
        </td>
        <td><span class="badge badge-default">${m.categoria}</span></td>
        <td><span class="badge badge-blue">${m.metodoPago || '—'}</span></td>
        <td><span class="badge badge-default">${m.moneda || '—'}</span></td>
        <td class="text-right">${montoHtml}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  /* ─────────────────────────────────────────────────────────────
     UTILIDAD: PARSER NUMÉRICO ROBUSTO
     Soporta: 10000000, 10.000.000, 10,000,000, 10.000.000,50, 45.5, 45,5
  ───────────────────────────────────────────────────────────── */
  function parseNumero(val) {
    if (val === null || val === undefined) return NaN;
    if (typeof val === 'number') return val;
    let str = String(val).trim();
    if (!str) return NaN;
    // Quitar espacios y símbolos de moneda
    str = str.replace(/[$BsCOPUSDes\s]/gi, '');
    if (!str) return NaN;

    // Caso con punto y coma simultáneos (ej: 10.000.000,50 o 10,000,000.50)
    if (str.includes('.') && str.includes(',')) {
      if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
        // Formato europeo/latino: 10.000.000,50 -> 10000000.50
        str = str.replace(/\./g, '').replace(',', '.');
      } else {
        // Formato anglosajón: 10,000,000.50 -> 10000000.50
        str = str.replace(/,/g, '');
      }
    } else if ((str.match(/\./g) || []).length > 1) {
      // Múltiples puntos: separadores de miles (ej: 10.000.000)
      str = str.replace(/\./g, '');
    } else if ((str.match(/,/g) || []).length > 1) {
      // Múltiples comas: separadores de miles (ej: 10,000,000)
      str = str.replace(/,/g, '');
    } else if (str.includes(',')) {
      // Una sola coma: decimal (ej: 40,50 -> 40.50)
      str = str.replace(',', '.');
    }

    return parseFloat(str);
  }

  function calcularMontoDestino(origen, tasa, monedaOrigen, monedaDest) {
    const fuerza = { USD: 3, COP: 2, VES: 1 };
    const fOrigen = fuerza[monedaOrigen] || 1;
    const fDest   = fuerza[monedaDest]   || 1;

    if (isNaN(origen) || isNaN(tasa) || origen <= 0 || tasa <= 0) return NaN;
    if (monedaOrigen === monedaDest) return origen;

    if (fOrigen < fDest) {
      // Débil -> Fuerte: dividir (ej: VES -> USD: Bs / tasa Bs/USD)
      return origen / tasa;
    } else {
      // Fuerte -> Débil: multiplicar (ej: USD -> COP: USD * tasa COP/USD)
      return origen * tasa;
    }
  }

  /* ─────────────────────────────────────────────────────────────
     CAMBIOS DE MONEDA
  ───────────────────────────────────────────────────────────── */

  async function guardarCambio() {
    const fEl = document.getElementById('c-fecha');
    const fecha = (fEl && fEl.value) ? fEl.value : new Date().toISOString().split('T')[0];
    const monedaOrigen = document.getElementById('c-moneda-origen').value;
    const montoOrigen  = parseNumero(document.getElementById('c-monto-origen').value);
    const monedaDest   = document.getElementById('c-moneda-destino').value;
    const tasaVal      = parseNumero(document.getElementById('c-tasa').value);
    const concepto     = document.getElementById('c-concepto').value.trim();
    const referencia   = document.getElementById('c-referencia').value.trim();
    const notas        = document.getElementById('c-notas').value.trim();

    if (!fecha || !monedaOrigen || !monedaDest) {
      Toast.show('Fecha y monedas son obligatorias', 'warning'); return;
    }
    if (monedaOrigen === monedaDest) {
      Toast.show('Las monedas de origen y destino deben ser distintas', 'warning'); return;
    }
    if (isNaN(montoOrigen) || montoOrigen <= 0) {
      Toast.show('Ingresa un monto válido a entregar (ej: 10000000)', 'warning'); return;
    }
    if (isNaN(tasaVal) || tasaVal <= 0) {
      Toast.show('Ingresa una tasa de cambio válida mayor a cero', 'warning'); return;
    }

    const montoDest = calcularMontoDestino(montoOrigen, tasaVal, monedaOrigen, monedaDest);
    if (isNaN(montoDest) || montoDest <= 0) {
      Toast.show('El monto a recibir no pudo calcularse, revisa la tasa', 'warning'); return;
    }

    const payload = {
      fecha,
      monedaOrigen,
      montoOrigen,
      monedaDestino: monedaDest,
      montoDestino: Math.round(montoDest * 10000.0) / 10000.0,
      tasaCambio: tasaVal,
      concepto,
      referencia,
      notas
    };

    try {
      if (state.editandoCambioId) {
        await Api.put(`/tesoreria/cambios/${state.editandoCambioId}`, payload);
        Toast.show('Cambio actualizado correctamente', 'success');
      } else {
        await Api.post('/tesoreria/cambios', payload);
        Toast.show(`Cambio registrado: ${formatMonto(montoOrigen, monedaOrigen)} -> ${formatMonto(montoDest, monedaDest)}`, 'success');
      }
      limpiarFormCambio();
      cargarDatos();
    } catch (e) {}
  }

  async function eliminarCambio(id) {
    if (!await Utils.confirm('¿Deseas eliminar este cambio de moneda? Los saldos se recalcularán.')) return;
    try {
      await Api.delete(`/tesoreria/cambios/${id}`);
      Toast.show('Cambio eliminado', 'success');
      cargarDatos();
    } catch (e) {}
  }

  function editarCambio(id) {
    const c = state.cambios.find(x => x.id === id);
    if (!c) return;
    state.editandoCambioId = id;
    document.getElementById('c-fecha').value           = c.fecha;
    document.getElementById('c-moneda-origen').value   = c.monedaOrigen;
    document.getElementById('c-monto-origen').value    = c.montoOrigen;
    document.getElementById('c-moneda-destino').value  = c.monedaDestino;
    document.getElementById('c-tasa').value            = c.tasaCambio || '';
    document.getElementById('c-concepto').value        = c.concepto || '';
    document.getElementById('c-referencia').value      = c.referencia || '';
    document.getElementById('c-notas').value           = c.notas || '';
    calcularTasaCambio();
    document.getElementById('c-form-title').textContent = 'Editar cambio de moneda';
    cambiarSeccion('cambios');
    document.getElementById('c-fecha').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function limpiarFormCambio() {
    state.editandoCambioId = null;
    document.getElementById('c-fecha').value          = new Date().toISOString().split('T')[0];
    document.getElementById('c-moneda-origen').value  = 'VES';
    document.getElementById('c-monto-origen').value   = '';
    document.getElementById('c-moneda-destino').value = 'USD';
    document.getElementById('c-tasa').value           = '';
    document.getElementById('c-monto-destino').value  = '';
    const hintEl = document.getElementById('c-formula-hint');
    if (hintEl) hintEl.textContent = '';
    document.getElementById('c-concepto').value       = '';
    document.getElementById('c-referencia').value     = '';
    document.getElementById('c-notas').value          = '';
    document.getElementById('c-form-title').textContent = 'Nuevo cambio / conversion de moneda';
  }

  function calcularTasaCambio() {
    const origen       = parseNumero(document.getElementById('c-monto-origen').value);
    const tasa         = parseNumero(document.getElementById('c-tasa').value);
    const monedaOrigen = document.getElementById('c-moneda-origen').value;
    const monedaDest   = document.getElementById('c-moneda-destino').value;
    const destEl       = document.getElementById('c-monto-destino');
    const hintEl       = document.getElementById('c-formula-hint');

    if (!destEl) return;

    if (isNaN(origen) || isNaN(tasa) || origen <= 0 || tasa <= 0 || monedaOrigen === monedaDest) {
      destEl.value = '';
      if (hintEl) hintEl.textContent = '';
      return;
    }

    const fuerza = { USD: 3, COP: 2, VES: 1 };
    const fOrigen = fuerza[monedaOrigen] || 1;
    const fDest   = fuerza[monedaDest]   || 1;

    const resultado = calcularMontoDestino(origen, tasa, monedaOrigen, monedaDest);
    let formula;
    const prefijoDest = (monedaDest === 'COP' || monedaDest === 'USD') ? '$ ' : 'Bs. ';
    const prefijoOrig = (monedaOrigen === 'COP' || monedaOrigen === 'USD') ? '$ ' : 'Bs. ';

    if (fOrigen < fDest) {
      formula = `${prefijoOrig}${origen.toLocaleString('es-CO')} ${monedaOrigen} ÷ ${tasa.toLocaleString('es-CO')} = ${prefijoDest}${resultado.toLocaleString('es-CO', {maximumFractionDigits:4})} ${monedaDest}`;
    } else {
      formula = `${prefijoOrig}${origen.toLocaleString('es-CO')} ${monedaOrigen} x ${tasa.toLocaleString('es-CO')} = ${prefijoDest}${resultado.toLocaleString('es-CO', {maximumFractionDigits:2})} ${monedaDest}`;
    }

    destEl.value = `${prefijoDest}${resultado.toLocaleString('es-CO', { maximumFractionDigits: fDest > fOrigen ? 4 : 2 })} ${monedaDest}`;
    if (hintEl) hintEl.textContent = formula;
  }

  function renderTablaCambios() {
    const tbody = document.getElementById('c-tabla-cambios');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!state.cambios || state.cambios.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state">
        <div class="empty-icon">—</div>
        <h3>Sin cambios registrados</h3>
        <p>Registre conversiones de moneda para que se reflejen en el saldo disponible.</p>
      </div></td></tr>`;
      return;
    }

    const lista = [...state.cambios].sort((a, b) => {
      const ta = a.createdAt || (a.fecha ? a.fecha + 'T00:00:00' : '');
      const tb = b.createdAt || (b.fecha ? b.fecha + 'T00:00:00' : '');
      if (tb && ta && tb !== ta) return tb.localeCompare(ta);
      return (b.id || 0) - (a.id || 0);
    });

    lista.forEach(c => {
      const tr = document.createElement('tr');
      let fechaCambio = Utils.formatDate(c.fecha);
      if (c.createdAt && c.createdAt.includes('T')) {
        const hora = c.createdAt.split('T')[1].substring(0, 8);
        fechaCambio = `<div style="font-weight:600;">${Utils.formatDate(c.fecha)}</div><div style="font-size:11px; color:var(--t-low);">${hora}</div>`;
      }

      tr.innerHTML = `
        <td>${fechaCambio}</td>
        <td>
          <span class="badge badge-default" style="font-weight:700;">${c.monedaOrigen}</span>
          <span style="margin:0 4px; color:var(--t-low);">&rarr;</span>
          <span class="badge badge-default" style="font-weight:700;">${c.monedaDestino}</span>
        </td>
        <td class="fw-700" style="color:var(--c-red);">${formatMonto(c.montoOrigen, c.monedaOrigen)}</td>
        <td class="fw-700" style="color:var(--c-green);">${formatMonto(c.montoDestino, c.monedaDestino)}</td>
        <td style="color:var(--t-low); font-size:12px;">${c.tasaCambio != null ? c.tasaCambio.toLocaleString('es-CO', {maximumFractionDigits:4}) : '—'}</td>
        <td>${c.concepto || '—'}</td>
        <td>${c.referencia || '—'}</td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="TesoreriaModule.editarCambio(${c.id})">Editar</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--c-red);" onclick="TesoreriaModule.eliminarCambio(${c.id})">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  async function guardarIngreso() {
    const fEl = document.getElementById('t-fecha');
    const fecha = (fEl && fEl.value) ? fEl.value : new Date().toISOString().split('T')[0];
    const clienteOrigen = document.getElementById('t-cliente').value.trim();
    const monto = parseNumero(document.getElementById('t-monto').value);
    const moneda = document.getElementById('t-moneda').value;
    const metodoPago = document.getElementById('t-metodo').value;
    const referencia = document.getElementById('t-referencia').value.trim();
    const notas = document.getElementById('t-notas').value.trim();

    if (!fecha || !clienteOrigen) {
      Toast.show('Fecha y cliente/origen son obligatorios', 'warning');
      return;
    }

    if (isNaN(monto) || monto <= 0) {
      Toast.show('Ingresa un monto válido mayor a cero', 'warning');
      return;
    }

    const payload = { fecha, clienteOrigen, monto, moneda, metodoPago, referencia, notas };

    try {
      if (state.editandoIngresoId) {
        await Api.put(`/tesoreria/ingresos/${state.editandoIngresoId}`, payload);
        Toast.show('Depósito actualizado con éxito', 'success');
      } else {
        await Api.post('/tesoreria/ingresos', payload);
        Toast.show(`Depósito de ${formatMonto(monto, moneda)} registrado en caja`, 'success');
      }
      limpiarForm();
      cargarDatos();
    } catch (e) {}
  }

  function setFiltroMoneda(moneda) {
    state.filtroMoneda = moneda;
    document.querySelectorAll('.t-tab-moneda').forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-moneda') === moneda);
    });
    renderTablaLibroDiario();
  }

  function setFiltroTipo(tipo) {
    state.filtroTipo = tipo;
    document.querySelectorAll('.t-tab-tipo').forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-tipo') === tipo);
    });
    renderTablaLibroDiario();
  }

  function alCambiarFecha() {
    const el = document.getElementById('t-filtroFecha');
    if (el && el.value) {
      state.fechaInicio = el.value;
      state.fechaFin = el.value;
      renderTablaLibroDiario();
    }
  }

  function cambiarDia(dias) {
    const el = document.getElementById('t-filtroFecha');
    if (!el || !el.value) return;
    const date = new Date(el.value + 'T12:00:00'); // Evitar problema de timezone
    date.setDate(date.getDate() + dias);
    
    const offset = date.getTimezoneOffset() * 60000;
    const localISO = (new Date(date.getTime() - offset)).toISOString().split('T')[0];
    
    el.value = localISO;
    alCambiarFecha();
  }

  function irAHoy() {
    const hoy = new Date();
    const offset = hoy.getTimezoneOffset() * 60000;
    const localISO = (new Date(hoy.getTime() - offset)).toISOString().split('T')[0];
    const el = document.getElementById('t-filtroFecha');
    if (el) el.value = localISO;
    alCambiarFecha();
  }

  function setBusqueda(texto) {
    state.busqueda = texto.trim();
    renderTablaLibroDiario();
  }

  function limpiarForm() {
    state.editandoIngresoId = null;
    document.getElementById('t-fecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('t-cliente').value = '';
    document.getElementById('t-monto').value = '';
    document.getElementById('t-referencia').value = '';
    document.getElementById('t-notas').value = '';
    document.getElementById('t-moneda').value = 'COP';
    document.getElementById('t-metodo').selectedIndex = 0;

    document.getElementById('t-form-title').textContent = 'Nuevo depósito / ingreso recibido';
  }

  function poblarMetodos() {
    const metSelect = document.getElementById('t-metodo');
    if (metSelect && metSelect.options.length === 0) {
      metodosPago.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m; opt.textContent = m;
        metSelect.appendChild(opt);
      });
    }
  }

  function formatMonto(amount, moneda = 'COP') {
    const num = amount || 0;
    if (moneda === 'USD') return '$ ' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num) + ' USD';
    if (moneda === 'VES') return 'Bs. ' + new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
    return '$ ' + new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num) + ' COP';
  }

  /* ─────────────────────────────────────────────────────────────
     EXPORTAR PDF — llama al endpoint backend /api/tesoreria/reporte-pdf
     con los filtros activos en pantalla
  ───────────────────────────────────────────────────────────── */
  function exportarPDF() {
    const elInicio = document.getElementById('t-fecha-inicio');
    const elFin    = document.getElementById('t-fecha-fin');
    const elTipo   = document.getElementById('t-rep-tipo');
    const elMoneda = document.getElementById('t-rep-moneda');

    const inicio = elInicio ? elInicio.value : '';
    const fin    = elFin ? elFin.value : '';
    const tipo   = elTipo ? elTipo.value : 'TODAS';
    const moneda = elMoneda ? elMoneda.value : 'TODAS';

    // Advertencia si no hay rango de fechas
    if (!inicio || !fin) {
      Toast.show('Selecciona un rango de fechas para el reporte PDF', 'warning');
      return;
    }

    const params = new URLSearchParams({
      fechaInicio: inicio,
      fechaFin:    fin,
      moneda,
      tipo
    });

    const url = `/api/tesoreria/reporte-pdf?${params.toString()}`;
    
    // Usar el modal de previsualización en lugar de descarga directa
    Utils.mostrarPDF(url, 'Estado de Caja y Tesorería');
  }

  async function eliminarIngreso(id) {
    if (!await Utils.confirm('¿Deseas eliminar este depósito de la caja? Los saldos se recalcularán.')) return;
    try {
      await Api.delete(`/tesoreria/ingresos/${id}`);
      Toast.show('Depósito eliminado', 'success');
      cargarDatos();
    } catch (e) {}
  }

  function editarIngreso(id) {
    const ing = state.ingresos.find(x => x.id === id);
    if (!ing) return;
    state.editandoIngresoId = id;
    document.getElementById('t-fecha').value      = ing.fecha;
    document.getElementById('t-cliente').value    = ing.clienteOrigen || '';
    document.getElementById('t-monto').value      = ing.monto;
    document.getElementById('t-moneda').value     = ing.moneda || 'COP';
    document.getElementById('t-metodo').value     = ing.metodoPago || '';
    document.getElementById('t-referencia').value = ing.referencia || '';
    document.getElementById('t-notas').value      = ing.notas || '';
    document.getElementById('t-form-title').textContent = 'Editar depósito / ingreso';
    cambiarSeccion('ingresos');
    document.getElementById('t-fecha').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function renderTablaIngresos() {
    const tbody = document.getElementById('t-tabla-ingresos');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!state.ingresos || state.ingresos.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state">
        <div class="empty-icon">—</div>
        <h3>Sin depósitos registrados</h3>
        <p>Los ingresos y cobros registrados aparecerán aquí.</p>
      </div></td></tr>`;
      return;
    }

    const lista = [...state.ingresos].sort((a, b) => {
      const ta = a.createdAt || (a.fecha ? a.fecha + 'T00:00:00' : '');
      const tb = b.createdAt || (b.fecha ? b.fecha + 'T00:00:00' : '');
      if (tb && ta && tb !== ta) return tb.localeCompare(ta);
      return (b.id || 0) - (a.id || 0);
    });

    lista.forEach(i => {
      const tr = document.createElement('tr');
      let fechaIngreso = Utils.formatDate(i.fecha);
      if (i.createdAt && i.createdAt.includes('T')) {
        const hora = i.createdAt.split('T')[1].substring(0, 8);
        fechaIngreso = `<div style="font-weight:600;">${Utils.formatDate(i.fecha)}</div><div style="font-size:11px; color:var(--t-low);">${hora}</div>`;
      }

      tr.innerHTML = `
        <td>${fechaIngreso}</td>
        <td style="font-weight:600; color:var(--t-high);">${i.clienteOrigen}</td>
        <td><span class="badge badge-blue">${i.metodoPago || '—'}</span></td>
        <td>${i.referencia || '—'}</td>
        <td><span class="badge badge-default">${i.moneda || 'COP'}</span></td>
        <td class="text-right fw-700" style="color:var(--c-green);">${formatMonto(i.monto, i.moneda)}</td>
        <td style="color:var(--t-low); font-size:12px;">${i.notas || '—'}</td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="TesoreriaModule.editarIngreso(${i.id})">Editar</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--c-red);" onclick="TesoreriaModule.eliminarIngreso(${i.id})">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function cambiarSeccion(seccion) {
    // Actualizar tabs visuales
    document.querySelectorAll('.t-tab-sec').forEach(btn => {
      const isCurrent = btn.getAttribute('data-sec') === seccion;
      btn.className = isCurrent ? 'btn btn-primary t-tab-sec' : 'btn btn-subtle t-tab-sec';
    });

    // Mostrar/ocultar contenedores
    const secLibro   = document.getElementById('t-sec-libro-diario');
    const secIngreso = document.getElementById('t-sec-ingresos');
    const secCambio  = document.getElementById('t-sec-cambios');

    if (secLibro)   secLibro.style.display   = seccion === 'libro-diario' ? 'block' : 'none';
    if (secIngreso) secIngreso.style.display = seccion === 'ingresos'     ? 'block' : 'none';
    if (secCambio)  secCambio.style.display  = seccion === 'cambios'      ? 'block' : 'none';
  }

  function init() {
    poblarMetodos();
    const fInput = document.getElementById('t-fecha');
    if (fInput && !fInput.value) {
      fInput.value = new Date().toISOString().split('T')[0];
    }
    const cFecha = document.getElementById('c-fecha');
    if (cFecha && !cFecha.value) {
      cFecha.value = new Date().toISOString().split('T')[0];
    }

    // Precargar fecha en el filtro diario (Hoy por defecto)
    const hoy = new Date();
    const offset = hoy.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(hoy.getTime() - offset)).toISOString().split('T')[0];
    const elFiltro = document.getElementById('t-filtroFecha');
    if (elFiltro && !elFiltro.value) {
      elFiltro.value = localISOTime;
    }
    state.fechaInicio = localISOTime;
    state.fechaFin    = localISOTime;

    cambiarSeccion('libro-diario');
    cargarDatos();
  }

  return {
    init,
    guardarIngreso,
    editarIngreso,
    eliminarIngreso,
    guardarCambio,
    eliminarCambio,
    editarCambio,
    limpiarFormCambio,
    calcularTasaCambio,
    cambiarSeccion,
    setFiltroMoneda,
    setFiltroTipo,
    alCambiarFecha,
    cambiarDia,
    irAHoy,
    exportarPDF,
    setBusqueda,
    limpiarForm
  };

})();
