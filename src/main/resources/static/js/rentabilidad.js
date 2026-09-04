/* ============================================================
   rentabilidad.js — Estado de Resultados Operativo y Estructura
   de Costos (USD) por Tonelada, consolidado por semana (Lun-Dom)
   ============================================================ */

const RentabilidadModule = (() => {
  let ultimoResumen = null;
  let semanaInicio = null; // Lunes de la semana activa, 'YYYY-MM-DD'
  let gastosDetalleVisible = false;

  async function init() {
    semanaInicio = Utils.getWeekStart(Utils.today());
    actualizarUiSemana();
    await cargarSemana();
  }

  // ── Navegación semanal (idéntica en patrón al módulo de Nómina) ──

  function actualizarUiSemana() {
    const input = document.getElementById('r-semana');
    if (input) input.value = semanaInicio;

    const fin = Utils.offsetDate(semanaInicio, 6);
    const label = document.querySelector('.r-semana-label');
    if (label) label.textContent = `Semana: ${Utils.formatDate(semanaInicio)} al ${Utils.formatDate(fin)}`;
  }

  async function cambiarSemana(delta) {
    semanaInicio = Utils.offsetDate(semanaInicio, delta * 7);
    actualizarUiSemana();
    await cargarSemana();
  }

  async function irASemanaDe(fechaStr) {
    if (!fechaStr) return;
    semanaInicio = Utils.getWeekStart(fechaStr);
    actualizarUiSemana();
    await cargarSemana();
  }

  async function irAEstaSemana() {
    semanaInicio = Utils.getWeekStart(Utils.today());
    actualizarUiSemana();
    await cargarSemana();
  }

  // ── Utilidades ──

  /** Lee un input numérico, sanitizando comas por puntos antes de parsear. */
  function leerNumero(id, fallback) {
    const el = document.getElementById(id);
    const valorNum = parseFloat(String(el?.value || '').replace(',', '.')) || 0;
    return valorNum || fallback;
  }

  // ── Carga y renderizado ──

  /**
   * Carga el resumen SIN forzar precio/tasa: el backend resuelve automáticamente
   * los valores guardados para esta semana (o el default global si no hay nada
   * guardado aún) y los devuelve — así los inputs quedan sincronizados con lo
   * que realmente se está usando.
   */
  async function cargarSemana() {
    if (!semanaInicio) semanaInicio = Utils.getWeekStart(Utils.today());
    const fechaInicio = semanaInicio;
    const fechaFin = Utils.offsetDate(semanaInicio, 6);

    try {
      const data = await Api.get(`/v1/rentabilidad/resumen-semanal?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
      document.getElementById('r-precio-venta-usd').value = data.precioVentaUsd;
      document.getElementById('r-tasa-cambio').value = data.tasaCambioCopUsd;
      const inputVes = document.getElementById('input-tasa-ves-usd');
      if (inputVes) inputVes.value = data.tasaCambioVesUsd;
      ultimoResumen = data;
      renderKPIs(data);
      renderEstructuraCostos(data.estructuraCostos || []);
      renderGastosDetalle(data.gastosDetalle || []);
      renderTabla(data.rankingMinas || []);
    } catch (e) {
      console.warn('No se pudo cargar el resumen de rentabilidad:', e);
      Toast.show('No se pudo cargar el tablero de rentabilidad', 'error');
    }
  }

  /** Recalcula en vivo con los valores actuales de los inputs (sin guardarlos todavía). */
  async function cargarRentabilidad() {
    if (!semanaInicio) semanaInicio = Utils.getWeekStart(Utils.today());
    const fechaInicio = semanaInicio;
    const fechaFin = Utils.offsetDate(semanaInicio, 6);

    const precioVentaUsd = leerNumero('r-precio-venta-usd', 45.0);
    const tasaCambioCopUsd = leerNumero('r-tasa-cambio', 4000.0);
    const tasaCambioVesUsd = leerNumero('input-tasa-ves-usd', 50.0);

    try {
      const data = await Api.get(`/v1/rentabilidad/resumen-semanal?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&precioVentaUsd=${precioVentaUsd}&tasaCambioCopUsd=${tasaCambioCopUsd}&tasaCambioVesUsd=${tasaCambioVesUsd}`);
      ultimoResumen = data;
      renderKPIs(data);
      renderEstructuraCostos(data.estructuraCostos || []);
      renderGastosDetalle(data.gastosDetalle || []);
      renderTabla(data.rankingMinas || []);
    } catch (e) {
      console.warn('No se pudo cargar el resumen de rentabilidad:', e);
      Toast.show('No se pudo cargar el tablero de rentabilidad', 'error');
    }
  }

  /** Guarda el precio de venta / tasa de cambio actuales como los de esta semana (al perder foco). */
  async function guardarParametrosSemana() {
    if (!semanaInicio) return;
    const fechaInicio = semanaInicio;
    const fechaFin = Utils.offsetDate(semanaInicio, 6);
    const precioVentaUsd = leerNumero('r-precio-venta-usd', 45.0);
    const tasaCambioCopUsd = leerNumero('r-tasa-cambio', 4000.0);
    const tasaCambioVesUsd = leerNumero('input-tasa-ves-usd', 50.0);

    try {
      await Api.post('/v1/rentabilidad/parametros-semana', { fechaInicio, fechaFin, precioVentaUsd, tasaCambioCopUsd, tasaCambioVesUsd });
      Toast.show(`Precio y tasa guardados para la semana del ${Utils.formatDate(fechaInicio)}`, 'success');
    } catch (e) {
      console.warn('No se pudieron guardar los parámetros de la semana:', e);
      Toast.show('No se pudo guardar el precio/tasa de esta semana', 'error');
    }
  }

  function formatoUSD(valor) {
    return `$ ${(valor || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
  }

  function formatoCOP(valor) {
    return `$ ${Math.round(valor || 0).toLocaleString('es-CO')} COP`;
  }

  function renderKPIs(data) {
    document.getElementById('r-kpi-toneladas').textContent = `${Utils.formatNumber(data.totalToneladas, 2)} Ton`;
    document.getElementById('r-kpi-ingreso').textContent = formatoUSD(data.ingresoBrutoVentaUsd);

    document.getElementById('r-kpi-costo').textContent = formatoUSD(data.totalCostoGlobalUsd);
    document.getElementById('r-kpi-costo-ton').textContent = `${formatoUSD(data.totalCostoGlobalUsdPorTon)} / Ton`;

    const margenEl = document.getElementById('r-kpi-margen');
    margenEl.textContent = formatoUSD(data.utilidadNetaRealUsd);
    margenEl.style.color = data.utilidadNetaRealUsd < 0 ? 'var(--c-red)' : 'var(--c-green)';
    document.getElementById('r-kpi-margen-pct').textContent = `${Utils.formatNumber(data.margenNetoFinalPorcentual, 1)}% de margen`;

    const margenTonEl = document.getElementById('r-kpi-margen-ton');
    margenTonEl.textContent = `${formatoUSD(data.margenNetoFinalPorTonUsd)} / Ton`;
    margenTonEl.style.color = data.margenNetoFinalPorTonUsd < 0 ? 'var(--c-red)' : 'var(--c-green)';
  }

  function renderEstructuraCostos(filas) {
    const tbody = document.getElementById('r-tabla-estructura-body');
    if (!tbody) return;

    if (!filas.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="color:var(--t-low); padding:24px;">Sin datos en la semana seleccionada</td></tr>`;
      return;
    }

    const rubrosConDetalle = ['Fletes y Transporte (Gastos Reales)', 'Operativo de Patio y Diésel (Gastos Reales)', 'Gastos Administrativos y Nómina Personal (Gastos Reales)'];

    tbody.innerHTML = filas.map(f => {
      const toggle = rubrosConDetalle.includes(f.rubro)
        ? ` <button type="button" class="btn btn-ghost btn-sm" style="padding:2px 8px; font-size:11px;" onclick="RentabilidadModule.toggleGastosDetalle()">Ver detalle</button>`
        : '';

      let filaStyle = '';
      let indent = '20px';
      if (f.tipo === 'subtotal') { filaStyle = 'font-weight:700; border-top:1px solid var(--b-default);'; indent = '4px'; }
      else if (f.tipo === 'total') { filaStyle = 'font-weight:700; border-top:2px solid var(--b-default);'; indent = '4px'; }
      else if (f.tipo === 'resultado') { filaStyle = 'font-weight:800; border-top:2px solid var(--c-green); background:rgba(34,197,94,0.06);'; indent = '4px'; }

      return `
        <tr style="${filaStyle}">
          <td style="padding-left:${indent};">${f.rubro}${toggle}</td>
          <td class="text-right">${formatoCOP(f.montoCop)}</td>
          <td class="text-right">${formatoUSD(f.montoUsd)}</td>
          <td class="text-right">${formatoUSD(f.usdPorTon)}</td>
          <td class="text-right">${Utils.formatNumber(f.porcentajeCostoTotal, 1)}%</td>
        </tr>
      `;
    }).join('');
  }

  function toggleGastosDetalle() {
    gastosDetalleVisible = !gastosDetalleVisible;
    const wrap = document.getElementById('r-gastos-detalle-wrap');
    if (wrap) wrap.style.display = gastosDetalleVisible ? 'block' : 'none';
  }

  function renderGastosDetalle(detalle) {
    const tbody = document.getElementById('r-gastos-detalle-body');
    if (!tbody) return;

    if (!detalle.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="color:var(--t-low); padding:16px;">No hay gastos registrados en esta semana</td></tr>`;
      return;
    }

    const tipoBadge = {
      FLETES_TRANSPORTE: { badge: 'badge-green', label: '🚚 Fletes' },
      OPERATIVO_PATIO: { badge: 'badge-blue', label: '🚜 Patio' },
      ADMINISTRATIVO_PERSONAL: { badge: 'badge-purple', label: '👔 Admin.' }
    };

    tbody.innerHTML = detalle.map(g => {
      const info = tipoBadge[g.tipoGasto] || tipoBadge.OPERATIVO_PATIO;
      return `
      <tr>
        <td>${Utils.formatDate(g.fecha)}</td>
        <td><span class="badge ${info.badge}" style="font-size:10px;">${info.label}</span></td>
        <td><span class="badge badge-subtle">${g.categoria}</span></td>
        <td>${g.descripcion || ''}</td>
        <td>${g.moneda}</td>
        <td class="text-right">${Utils.formatNumber(g.monto, 2)} ${g.moneda}</td>
        <td class="text-right">${formatoUSD(g.montoUsd)}</td>
      </tr>
    `;
    }).join('');
  }

  function renderTabla(ranking) {
    const tbody = document.getElementById('r-tabla-minas-body');
    if (!tbody) return;

    if (!ranking.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="color:var(--t-low); padding:24px;">No hay despachos registrados en la semana seleccionada</td></tr>`;
      return;
    }

    tbody.innerHTML = ranking.map(m => `
      <tr>
        <td><span class="fw-600 text-high">${m.mina}</span></td>
        <td class="text-right">${m.viajes}</td>
        <td class="text-right">${Utils.formatNumber(m.toneladas, 2)}</td>
        <td class="text-right">${formatoUSD(m.ingresoUsd)}</td>
        <td class="text-right">${formatoUSD(m.costoMineralUsd)}</td>
        <td class="text-right"><span class="fw-700 ${m.margenNetoUsd < 0 ? 'text-red' : 'text-green'}">${formatoUSD(m.margenNetoUsd)}</span></td>
        <td class="text-right">${formatoUSD(m.margenPorTonUsd)}</td>
      </tr>
    `).join('');
  }

  function imprimirReporteRentabilidad() {
    if (!ultimoResumen) {
      Toast.show('Primero carga el reporte antes de imprimir', 'warning');
      return;
    }
    window.print();
  }

  return {
    init,
    cambiarSemana,
    irASemanaDe,
    irAEstaSemana,
    cargarRentabilidad,
    guardarParametrosSemana,
    toggleGastosDetalle,
    imprimirReporteRentabilidad
  };
})();
