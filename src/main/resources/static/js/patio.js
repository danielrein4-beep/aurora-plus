/* ============================================================
   patio.js — Módulo de Control de Inventario y Stock de Mineral
   en Patio (Fase 4)
   ============================================================ */

const PatioModule = (() => {
  let pilas = [];
  let cargado = false;

  async function init() {
    if (!cargado) {
      cargado = true;
      await cargarStockActual();
    }
  }

  function cambiarSeccion(seccion) {
    document.querySelectorAll('.inv-tab-sec').forEach(btn => {
      const activo = btn.dataset.sec === seccion;
      btn.classList.toggle('btn-primary', activo);
      btn.classList.toggle('btn-subtle', !activo);
    });
    const secPatio = document.getElementById('inv-sec-patio');
    const secProductos = document.getElementById('inv-sec-productos');
    if (secPatio) secPatio.style.display = seccion === 'patio' ? 'block' : 'none';
    if (secProductos) secProductos.style.display = seccion === 'productos' ? 'block' : 'none';

    if (seccion === 'patio') cargarStockActual();
  }

  async function cargarStockActual() {
    try {
      const data = await Api.get('/v1/inventario/stock-actual');
      pilas = (data && Array.isArray(data.pilas)) ? data.pilas : [];
      renderKPIs(data || {});
    } catch (e) {
      console.warn('No se pudo cargar el stock de patio:', e);
      pilas = [];
      renderKPIs({});
      Toast.show('No se pudo cargar el stock de mineral en patio', 'error');
    }
    renderTabla();
    actualizarDatalistMinas();
  }

  function renderKPIs(data) {
    const stockTotal = document.getElementById('p-stat-stock-total');
    const entrada = document.getElementById('p-stat-entrada');
    const salida = document.getElementById('p-stat-salida');
    const bajo = document.getElementById('p-stat-bajo');

    if (stockTotal) stockTotal.textContent = `${Utils.formatNumber(data.stockTotalTon || 0, 2)} Ton`;
    if (entrada) entrada.textContent = `${Utils.formatNumber(data.totalEntradaTon || 0, 2)} Ton`;
    if (salida) salida.textContent = `${Utils.formatNumber(data.totalSalidaTon || 0, 2)} Ton`;
    if (bajo) bajo.textContent = data.pilasBajoStock || 0;
  }

  function renderTabla() {
    const tbody = document.getElementById('p-tabla-pilas-body');
    if (!tbody) return;

    if (!pilas.length) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center" style="color:var(--t-low); padding:24px;">No hay pilas de acopio registradas. Crea una con "+ Nueva Pila de Acopio".</td></tr>`;
      return;
    }

    tbody.innerHTML = pilas.map(p => {
      const pct = p.porcentajeOcupacion != null ? p.porcentajeOcupacion : 0;
      const barColor = p.stockBajo ? 'var(--c-red)' : (pct > 85 ? 'var(--c-amber)' : 'var(--c-green)');
      const badgeClass = p.stockBajo ? 'badge-red' : 'badge-green';
      const badgeText = p.stockBajo ? 'Stock Bajo' : 'Normal';
      const fecha = p.fechaUltimoMovimiento ? String(p.fechaUltimoMovimiento).replace('T', ' ').substring(0, 16) : '—';

      return `
        <tr>
          <td><span class="fw-600 text-high">${p.mina || '—'}</span></td>
          <td>${p.pilaAcopio || '—'}</td>
          <td class="text-right">${Utils.formatNumber(p.toneladasEntrada, 2)}</td>
          <td class="text-right">${Utils.formatNumber(p.toneladasSalida, 2)}</td>
          <td class="text-right"><span class="fw-700 ${p.stockBajo ? 'text-red' : 'text-high'}">${Utils.formatNumber(p.stockActual, 2)}</span></td>
          <td>
            <div style="background:var(--bg-subtle,#eee); border-radius:6px; height:8px; width:100%; overflow:hidden;">
              <div style="height:100%; width:${pct}%; background:${barColor};"></div>
            </div>
            <div style="font-size:11px; color:var(--t-low); margin-top:2px;">${Utils.formatNumber(pct, 1)}% de ${Utils.formatNumber(p.capacidadMaximaTon, 0)} Ton</div>
          </td>
          <td class="text-center"><span class="badge ${badgeClass}">${badgeText}</span></td>
          <td style="font-size:12px; color:var(--t-mid);">${fecha}</td>
          <td class="no-print">
            <div class="flex gap-4">
              <button class="btn btn-primary btn-sm" onclick="PatioModule.abrirModalMovimiento(${p.id})">Mover Ton.</button>
              <button class="btn btn-ghost btn-sm text-red" onclick="PatioModule.eliminarPila(${p.id})" title="Eliminar pila">✕</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function actualizarDatalistMinas() {
    const lista = document.getElementById('list-minas-patio');
    if (!lista) return;
    const minas = [...new Set(pilas.map(p => p.mina).filter(Boolean))];
    lista.innerHTML = minas.map(m => `<option value="${m}">`).join('');
  }

  // ── MODAL NUEVA PILA ──

  function abrirModalPila() {
    document.getElementById('p-nueva-mina').value = '';
    document.getElementById('p-nueva-pila').value = '';
    document.getElementById('p-nueva-capacidad').value = 500;
    document.getElementById('modal-nueva-pila').style.display = 'flex';
  }

  function cerrarModalPila() {
    document.getElementById('modal-nueva-pila').style.display = 'none';
  }

  async function guardarPila() {
    const mina = document.getElementById('p-nueva-mina').value.trim();
    const pilaAcopio = document.getElementById('p-nueva-pila').value.trim();
    const capacidadMaximaTon = parseFloat(document.getElementById('p-nueva-capacidad').value) || 500;

    if (!mina) {
      Toast.show('La mina es obligatoria', 'warning');
      return;
    }
    if (!pilaAcopio) {
      Toast.show('El nombre de la pila de acopio es obligatorio', 'warning');
      return;
    }

    try {
      await Api.post('/v1/inventario/pilas', { mina, pilaAcopio, capacidadMaximaTon });
      Toast.show('Pila de acopio creada correctamente', 'success');
      cerrarModalPila();
      await cargarStockActual();
    } catch (e) {
      Toast.show(e.message || 'No se pudo crear la pila de acopio', 'error');
    }
  }

  async function eliminarPila(id) {
    if (!confirm('¿Seguro que deseas eliminar esta pila de acopio?')) return;
    try {
      await Api.delete(`/v1/inventario/pilas/${id}`);
      Toast.show('Pila de acopio eliminada', 'info');
      await cargarStockActual();
    } catch (e) {
      Toast.show(e.message || 'No se pudo eliminar la pila de acopio', 'error');
    }
  }

  // ── MODAL MOVIMIENTO ──

  function abrirModalMovimiento(id) {
    const p = pilas.find(x => x.id === id);
    if (!p) return;

    document.getElementById('pm-pila-id').value = p.id;
    document.getElementById('pm-pila-nombre').textContent = `${p.mina} — ${p.pilaAcopio}`;
    document.getElementById('pm-pila-stock').textContent = Utils.formatNumber(p.stockActual, 2);
    document.getElementById('pm-toneladas').value = '';
    document.getElementById('pm-tipo').value = 'ENTRADA';
    document.getElementById('modal-movimiento-patio').style.display = 'flex';
  }

  function cerrarModalMovimiento() {
    document.getElementById('modal-movimiento-patio').style.display = 'none';
  }

  async function guardarMovimiento() {
    const id = parseInt(document.getElementById('pm-pila-id').value);
    const tipo = document.getElementById('pm-tipo').value;
    const toneladas = parseFloat(document.getElementById('pm-toneladas').value);

    if (!toneladas || toneladas <= 0) {
      Toast.show('Ingresa una cantidad de toneladas válida', 'warning');
      return;
    }

    try {
      await Api.post(`/v1/inventario/pilas/${id}/movimiento`, { tipo, toneladas });
      Toast.show('Movimiento registrado correctamente', 'success');
      cerrarModalMovimiento();
      await cargarStockActual();
    } catch (e) {
      Toast.show(e.message || 'No se pudo registrar el movimiento', 'error');
    }
  }

  return {
    init,
    cambiarSeccion,
    abrirModalPila,
    cerrarModalPila,
    guardarPila,
    eliminarPila,
    abrirModalMovimiento,
    cerrarModalMovimiento,
    guardarMovimiento
  };
})();
