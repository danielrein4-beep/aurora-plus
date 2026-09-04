/**
 * Módulo de Historial de Ventas — L'Apéritif
 * 100% en Español | Gestión, Impresión y Eliminación de Ventas
 */

const VentasModule = (() => {
  const STORAGE_KEY_VENTAS = 'laperitif_ventas';
  const STORAGE_KEY_PRODS = 'laperitif_productos';
  let ventas = [];

  async function init() {
    await cargarVentas();
  }

  function depurarDuplicados(lista) {
    if (!lista || lista.length === 0) return [];
    
    const sorted = [...lista].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    const unique = [];

    for (let i = 0; i < sorted.length; i++) {
      const v = sorted[i];
      const yaExiste = unique.some(u => {
        if (u.numeroTicket && v.numeroTicket && u.numeroTicket === v.numeroTicket) return true;
        const diffMs = Math.abs(new Date(u.fecha || Date.now()).getTime() - new Date(v.fecha || Date.now()).getTime());
        const mismoCliente = (u.cliente || '').trim().toLowerCase() === (v.cliente || '').trim().toLowerCase();
        const mismoTotal = Math.abs((u.totalUsd || 0) - (v.totalUsd || 0)) < 0.01;
        // Si ocurrieron en menos de 60 segundos con mismo cliente y mismo total: es duplicado por click múltiple
        return (mismoCliente && mismoTotal && diffMs < 60000);
      });

      if (!yaExiste) {
        unique.push(v);
      }
    }
    return unique;
  }

  async function cargarVentas() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_VENTAS);
      if (raw) {
        ventas = JSON.parse(raw) || [];
      }
    } catch (e) {
      ventas = [];
    }

    try {
      const data = await Api.get('/ventas');
      if (data && Array.isArray(data) && data.length > 0) {
        const combinadas = [...ventas, ...data];
        ventas = depurarDuplicados(combinadas);
      }
    } catch (err) {
      console.warn('Ventas cargadas desde almacenamiento local permanente.');
    }

    // Depuración automática
    ventas = depurarDuplicados(ventas);
    localStorage.setItem(STORAGE_KEY_VENTAS, JSON.stringify(ventas));

    renderTablaVentas();
    if (typeof CajaModule !== 'undefined' && CajaModule.cargarResumen) {
      CajaModule.cargarResumen();
    }
  }

  function purgarDuplicadosManual() {
    const cantAntes = ventas.length;
    ventas = depurarDuplicados(ventas);
    const eliminados = cantAntes - ventas.length;
    localStorage.setItem(STORAGE_KEY_VENTAS, JSON.stringify(ventas));
    renderTablaVentas();
    if (typeof CajaModule !== 'undefined' && CajaModule.cargarResumen) {
      CajaModule.cargarResumen();
    }
    if (eliminados > 0) {
      Toast.show(`Se limpiaron ${eliminados} ventas duplicadas correctamente`, 'success');
    } else {
      Toast.show('No se encontraron ventas duplicadas', 'info');
    }
  }

  function renderTablaVentas() {
    const tbody = document.getElementById('ventas-tbody');
    if (!tbody) return;

    if (!ventas || ventas.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 40px;">No hay ventas registradas aún. Ve a "Registrar Venta" para hacer la primera.</td></tr>`;
      return;
    }

    let html = '';
    ventas.forEach(v => {
      const fechaStr = new Date(v.fecha).toLocaleString();
      const estadoBadge = v.estado === 'ANULADA' 
        ? `<span class="badge" style="background:#0a0a0a; color:#fff; text-decoration: line-through;">Anulada</span>`
        : `<span class="badge badge-light">Completada</span>`;

      let itemsResumen = '';
      if (v.items && v.items.length > 0) {
        itemsResumen = v.items.map(i => `${i.cantidad}x ${i.nombreProducto}`).join(', ');
      }

      const moneda = v.monedaCobro || 'USD';
      let totalPrincipal = `$${(v.totalUsd || 0).toFixed(2)} USD`;
      let totalSecundario = `$${Utils.formatNumber(v.totalCop || 0, 0)} COP &nbsp;|&nbsp; Bs. ${Utils.formatNumber(v.totalVes || 0, 2)}`;

      if (moneda === 'COP') {
        totalPrincipal = `$${Utils.formatNumber(v.totalCop || 0, 0)} COP`;
        totalSecundario = `$${(v.totalUsd || 0).toFixed(2)} USD &nbsp;|&nbsp; Bs. ${Utils.formatNumber(v.totalVes || 0, 2)}`;
      } else if (moneda === 'VES') {
        totalPrincipal = `Bs. ${Utils.formatNumber(v.totalVes || 0, 2)}`;
        totalSecundario = `$${(v.totalUsd || 0).toFixed(2)} USD &nbsp;|&nbsp; $${Utils.formatNumber(v.totalCop || 0, 0)} COP`;
      }

      html += `
        <tr>
          <td><strong>${v.numeroTicket || ('TKT-' + v.id)}</strong></td>
          <td style="font-size:12px; color:var(--c-text-muted);">${fechaStr}</td>
          <td>
            <div style="font-weight:700; color:var(--c-black);">${v.cliente || 'Cliente General'}</div>
            <div style="font-size:11.5px; color:var(--c-text-muted);">${itemsResumen}</div>
          </td>
          <td><span class="badge badge-light">${formatearMetodoPago(v.metodoPago)}</span></td>
          <td class="text-right">
            <div style="font-family:var(--font-serif); font-weight:700; font-size:16px; color:var(--c-black);">${totalPrincipal}</div>
            <div style="font-size:11px; color:var(--c-text-muted);">${totalSecundario}</div>
          </td>
          <td>${estadoBadge}</td>
          <td class="text-center">
            <div class="table-actions">
              <button class="btn btn-ghost btn-sm" onclick="PosModule.imprimirTicket(VentasModule.getVentaPorId(${v.id}))" title="Imprimir Ticket">Ticket</button>
              <button class="btn btn-primary btn-sm" onclick="PosModule.imprimirReciboFormal(VentasModule.getVentaPorId(${v.id}))" title="Imprimir Recibo Formal">Recibo</button>
              <button class="btn btn-ghost btn-sm text-danger" onclick="VentasModule.eliminarVenta(${v.id})" title="Eliminar Venta">Eliminar</button>
            </div>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  }

  function getVentaPorId(id) {
    return ventas.find(v => v.id === id || String(v.id) === String(id));
  }

  async function eliminarVenta(id) {
    const v = getVentaPorId(id);
    if (!v) return;

    if (!confirm(`¿Deseas eliminar la venta ${v.numeroTicket || id}? El stock de los productos se repondrá automáticamente.`)) {
      return;
    }

    // 1. Reponer stock de los productos
    if (v.estado !== 'ANULADA') {
      try {
        const rawProds = localStorage.getItem(STORAGE_KEY_PRODS);
        if (rawProds) {
          const prods = JSON.parse(rawProds);
          if (v.items) {
            v.items.forEach(item => {
              const p = prods.find(prod => prod.id === item.productoId);
              if (p) p.stockActual = (p.stockActual || 0) + item.cantidad;
            });
            localStorage.setItem(STORAGE_KEY_PRODS, JSON.stringify(prods));
          }
        }
      } catch (e) {}
    }

    // 2. Eliminar venta de la lista y LocalStorage
    ventas = ventas.filter(item => item.id !== id && String(item.id) !== String(id));
    localStorage.setItem(STORAGE_KEY_VENTAS, JSON.stringify(ventas));

    // 3. Sincronizar con backend si está disponible
    try {
      await Api.delete(`/ventas/${id}`);
    } catch (err) {}

    Toast.show(`Venta eliminada y stock repuesto con éxito`, 'info');
    renderTablaVentas();

    if (typeof CajaModule !== 'undefined' && CajaModule.cargarResumen) {
      CajaModule.cargarResumen();
    }
  }

  function formatearMetodoPago(metodo) {
    const mapa = {
      'USD_EFECTIVO': 'Efectivo Dólares (USD)',
      'COP_EFECTIVO': 'Efectivo Pesos (COP)',
      'VES_PAGO_MOVIL': 'Pago Móvil / Transferencia (Bs)',
      'VES_EFECTIVO': 'Efectivo Bolívares (Bs)',
      'ZELLE': 'Zelle (USD)',
      'MIXTO': 'Pago Mixto'
    };
    return mapa[metodo] || metodo || 'Efectivo';
  }

  return {
    init,
    cargarVentas,
    getVentaPorId,
    eliminarVenta,
    purgarDuplicadosManual
  };
})();
