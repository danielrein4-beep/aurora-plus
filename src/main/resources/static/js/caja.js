/**
 * Módulo de Caja & Balance de Ingresos y Egresos — L'Apéritif
 * Registro y Arqueo Total: Ingresos, Egresos y Balance Neto en USD, COP y VES
 */

const CajaModule = (() => {
  const STORAGE_KEY_VENTAS = 'laperitif_ventas';
  const STORAGE_KEY_EGRESOS = 'laperitif_egresos';

  const tasaCop = 3300.0;
  const tasaVes = 925.0;

  let periodoActivo = 'HOY'; // 'HOY', '7DIAS', 'MES', 'TODO'
  let egresos = [];

  async function init() {
    await cargarEgresos();
    await cargarResumen();
  }

  function setPeriodo(periodo) {
    periodoActivo = periodo;
    document.querySelectorAll('.caja-periodo-pill').forEach(btn => {
      if (btn.dataset.periodo === periodo) btn.classList.add('active');
      else btn.classList.remove('active');
    });
    cargarResumen();
  }

  async function cargarEgresos() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_EGRESOS);
      if (raw) egresos = JSON.parse(raw) || [];
    } catch (e) {
      egresos = [];
    }
  }

  function guardarEgresosLocal() {
    try {
      localStorage.setItem(STORAGE_KEY_EGRESOS, JSON.stringify(egresos));
    } catch (e) {}
  }

  async function cargarResumen() {
    let todasLasVentas = [];

    // 1. Obtener ventas
    try {
      const raw = localStorage.getItem(STORAGE_KEY_VENTAS);
      if (raw) {
        todasLasVentas = JSON.parse(raw) || [];
      }
    } catch (e) {}

    // Filtrar solo ventas completadas
    let ventasFiltradas = todasLasVentas.filter(v => v.estado !== 'ANULADA');

    // 2. Filtrar por período usando la fecha local exacta
    const ahora = new Date();
    const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0, 0);
    const finHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59, 999);

    let egresosFiltrados = [...egresos];

    if (periodoActivo === 'HOY') {
      ventasFiltradas = ventasFiltradas.filter(v => {
        const f = new Date(v.fecha);
        return f >= inicioHoy && f <= finHoy;
      });
      egresosFiltrados = egresosFiltrados.filter(e => {
        const f = new Date(e.fecha);
        return f >= inicioHoy && f <= finHoy;
      });
    } else if (periodoActivo === '7DIAS') {
      const sieteDiasAtras = new Date(inicioHoy.getTime() - 6 * 24 * 60 * 60 * 1000);
      ventasFiltradas = ventasFiltradas.filter(v => new Date(v.fecha) >= sieteDiasAtras);
      egresosFiltrados = egresosFiltrados.filter(e => new Date(e.fecha) >= sieteDiasAtras);
    } else if (periodoActivo === 'MES') {
      const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0, 0);
      ventasFiltradas = ventasFiltradas.filter(v => new Date(v.fecha) >= inicioMes);
      egresosFiltrados = egresosFiltrados.filter(e => new Date(e.fecha) >= inicioMes);
    }

    // 3. Totales de Ingresos (Ventas)
    let totalVentasUsd = 0.0;
    let totalVentasCop = 0.0;
    let totalVentasVes = 0.0;

    let ingresadoUsd = 0.0;
    let ingresadoCop = 0.0;
    let ingresadoVes = 0.0;

    const montoPorMetodo = {};
    const prodsVendidos = {};

    ventasFiltradas.forEach(v => {
      const vUsd = v.totalUsd || 0;
      const vCop = v.totalCop || (vUsd * tasaCop);
      const vVes = v.totalVes || (vUsd * tasaVes);

      totalVentasUsd += vUsd;
      totalVentasCop += vCop;
      totalVentasVes += vVes;

      const metodo = v.metodoPago || 'USD_EFECTIVO';
      montoPorMetodo[metodo] = (montoPorMetodo[metodo] || 0) + vUsd;

      const moneda = v.monedaCobro || 'USD';
      if (moneda === 'COP' || metodo.includes('COP')) {
        ingresadoCop += vCop;
      } else if (moneda === 'VES' || metodo.includes('VES')) {
        ingresadoVes += vVes;
      } else {
        ingresadoUsd += vUsd;
      }

      if (v.items) {
        v.items.forEach(item => {
          const key = item.nombreProducto + (item.tamano ? ` (${item.tamano})` : '');
          prodsVendidos[key] = (prodsVendidos[key] || 0) + (item.cantidad || 1);
        });
      }
    });

    // 4. Totales de Egresos (Gastos)
    let egresadoUsd = 0.0;
    let egresadoCop = 0.0;
    let egresadoVes = 0.0;

    egresosFiltrados.forEach(e => {
      const monto = e.monto || 0;
      if (e.moneda === 'COP') {
        egresadoCop += monto;
      } else if (e.moneda === 'VES') {
        egresadoVes += monto;
      } else {
        egresadoUsd += monto;
      }
    });

    // 5. Balance Neto (Ingresos - Egresos)
    const netoUsd = ingresadoUsd - egresadoUsd;
    const netoCop = ingresadoCop - egresadoCop;
    const netoVes = ingresadoVes - egresadoVes;

    renderResumen({
      cantidadVentas: ventasFiltradas.length,
      totalVentasUsd: totalVentasUsd,
      totalVentasCop: totalVentasCop,
      totalVentasVes: totalVentasVes,
      ingresadoUsd: ingresadoUsd,
      ingresadoCop: ingresadoCop,
      ingresadoVes: ingresadoVes,
      egresadoUsd: egresadoUsd,
      egresadoCop: egresadoCop,
      egresadoVes: egresadoVes,
      netoUsd: netoUsd,
      netoCop: netoCop,
      netoVes: netoVes,
      montoPorMetodo: montoPorMetodo,
      productosVendidos: prodsVendidos,
      egresosLista: egresosFiltrados
    });
  }

  function renderResumen(data) {
    if (!data) return;

    // Balance Neto Disponible (Monto Grande Principal)
    const elNetoUsd = document.getElementById('caja-neto-usd');
    const elNetoCop = document.getElementById('caja-neto-cop');
    const elNetoVes = document.getElementById('caja-neto-ves');
    if (elNetoUsd) elNetoUsd.textContent = `$${data.netoUsd.toFixed(2)} USD`;
    if (elNetoCop) elNetoCop.textContent = `$${Utils.formatNumber(data.netoCop, 0)} COP`;
    if (elNetoVes) elNetoVes.textContent = `Bs. ${Utils.formatNumber(data.netoVes, 2)}`;

    // Ventas / Ingresos (+)
    const elIngUsd = document.getElementById('caja-ingresado-usd');
    const elIngCop = document.getElementById('caja-ingresado-cop');
    const elIngVes = document.getElementById('caja-ingresado-ves');
    if (elIngUsd) elIngUsd.textContent = `+$${data.ingresadoUsd.toFixed(2)}`;
    if (elIngCop) elIngCop.textContent = `+$${Utils.formatNumber(data.ingresadoCop, 0)}`;
    if (elIngVes) elIngVes.textContent = `+Bs. ${Utils.formatNumber(data.ingresadoVes, 2)}`;

    // Gastos / Egresos (-)
    const elEgUsd = document.getElementById('caja-egresado-usd');
    const elEgCop = document.getElementById('caja-egresado-cop');
    const elEgVes = document.getElementById('caja-egresado-ves');
    if (elEgUsd) elEgUsd.textContent = `-$${data.egresadoUsd.toFixed(2)}`;
    if (elEgCop) elEgCop.textContent = `-$${Utils.formatNumber(data.egresadoCop, 0)}`;
    if (elEgVes) elEgVes.textContent = `-Bs. ${Utils.formatNumber(data.egresadoVes, 2)}`;

    // Pedidos cobrados
    const elPedidos = document.getElementById('caja-total-pedidos');
    if (elPedidos) elPedidos.textContent = (data.cantidadVentas || 0) + ' pedidos';

    // Métodos de pago
    const contMetodos = document.getElementById('caja-metodos-tbody');
    if (contMetodos) {
      const metodos = data.montoPorMetodo || {};
      if (Object.keys(metodos).length === 0) {
        contMetodos.innerHTML = `<tr><td colspan="3" class="text-center text-muted" style="padding: 24px;">No hay ingresos registrados en este período</td></tr>`;
      } else {
        let html = '';
        const mapa = {
          'USD_EFECTIVO': 'Efectivo Dólares (USD)',
          'COP_EFECTIVO': 'Efectivo Pesos (COP)',
          'VES_PAGO_MOVIL': 'Pago Móvil / Transferencia (Bs)',
          'VES_EFECTIVO': 'Efectivo Bolívares (Bs)',
          'ZELLE': 'Zelle (USD)',
          'MIXTO': 'Pago Mixto'
        };

        for (const [key, valUsd] of Object.entries(metodos)) {
          const valCop = valUsd * tasaCop;
          const valVes = valUsd * tasaVes;
          html += `
            <tr>
              <td><strong>${mapa[key] || key}</strong></td>
              <td class="text-right" style="font-family:var(--font-serif); font-weight:700; font-size:15px; color:var(--c-black);">$${valUsd.toFixed(2)} USD</td>
              <td class="text-right text-muted" style="font-size:11.5px;">$${Utils.formatNumber(valCop, 0)} COP &nbsp;|&nbsp; Bs. ${Utils.formatNumber(valVes, 2)}</td>
            </tr>
          `;
        }
        contMetodos.innerHTML = html;
      }
    }

    // Tabla de Egresos
    const contEgresos = document.getElementById('caja-egresos-tbody');
    if (contEgresos) {
      const listaEgresos = data.egresosLista || [];
      if (listaEgresos.length === 0) {
        contEgresos.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding: 24px;">No hay egresos registrados en este período</td></tr>`;
      } else {
        let html = '';
        listaEgresos.forEach(eg => {
          const fecha = new Date(eg.fecha || Date.now()).toLocaleDateString() + ' ' + new Date(eg.fecha || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
          let montoStr = `$${(eg.monto || 0).toFixed(2)} USD`;
          if (eg.moneda === 'COP') montoStr = `$${Utils.formatNumber(eg.monto, 0)} COP`;
          else if (eg.moneda === 'VES') montoStr = `Bs. ${Utils.formatNumber(eg.monto, 2)}`;

          html += `
            <tr>
              <td style="font-size:12px; color:var(--c-text-muted);">${fecha}</td>
              <td><strong>${eg.concepto}</strong></td>
              <td><span class="badge badge-light">${eg.moneda}</span></td>
              <td class="text-right" style="font-family:var(--font-serif); font-weight:700; font-size:15px; color:var(--c-black);">${montoStr}</td>
              <td class="text-center no-print">
                <button class="btn btn-ghost btn-sm text-danger" onclick="CajaModule.eliminarEgreso(${eg.id})" title="Eliminar Egreso">Eliminar</button>
              </td>
            </tr>
          `;
        });
        contEgresos.innerHTML = html;
      }
    }

    // Productos vendidos
    const contProds = document.getElementById('caja-productos-tbody');
    if (contProds) {
      const prods = data.productosVendidos || {};
      if (Object.keys(prods).length === 0) {
        contProds.innerHTML = `<tr><td colspan="2" class="text-center text-muted" style="padding: 24px;">Ningún producto vendido en este período</td></tr>`;
      } else {
        let html = '';
        const ordenados = Object.entries(prods).sort((a, b) => b[1] - a[1]);
        for (const [prodName, cant] of ordenados) {
          html += `
            <tr>
              <td style="font-weight:600;">${prodName}</td>
              <td class="text-right"><span class="badge badge-dark">${cant} unids</span></td>
            </tr>
          `;
        }
        contProds.innerHTML = html;
      }
    }
  }

  // ── GESTIÓN DE EGRESOS / GASTOS ──

  function abrirModalEgreso() {
    document.getElementById('egreso-concepto').value = '';
    document.getElementById('egreso-monto').value = '';
    document.getElementById('egreso-moneda').value = 'USD';
    document.getElementById('egreso-metodo').value = 'USD_EFECTIVO';
    document.getElementById('modal-egreso-caja').style.display = 'flex';
  }

  function cerrarModalEgreso() {
    document.getElementById('modal-egreso-caja').style.display = 'none';
  }

  function guardarEgreso() {
    const concepto = document.getElementById('egreso-concepto').value.trim();
    const monto = parseFloat(document.getElementById('egreso-monto').value) || 0;
    const moneda = document.getElementById('egreso-moneda').value;
    const metodo = document.getElementById('egreso-metodo').value;

    if (!concepto || monto <= 0) {
      Toast.show('Ingresa un concepto y monto válido', 'warning');
      return;
    }

    const nuevoEgreso = {
      id: Date.now(),
      concepto: concepto,
      monto: monto,
      moneda: moneda,
      metodoPago: metodo,
      fecha: new Date().toISOString()
    };

    egresos.unshift(nuevoEgreso);
    guardarEgresosLocal();

    Toast.show('Egreso registrado correctamente', 'success');
    cerrarModalEgreso();
    cargarResumen();
  }

  function eliminarEgreso(id) {
    if (!confirm('¿Deseas eliminar este registro de egreso?')) return;

    egresos = egresos.filter(e => e.id !== id && String(e.id) !== String(id));
    guardarEgresosLocal();

    Toast.show('Egreso eliminado', 'info');
    cargarResumen();
  }

  function reiniciarCaja() {
    if (!confirm('¿Deseas reiniciar todas las ventas y egresos de prueba para empezar la caja en $0?')) return;
    localStorage.removeItem(STORAGE_KEY_VENTAS);
    localStorage.removeItem(STORAGE_KEY_EGRESOS);
    egresos = [];
    Toast.show('Caja y ventas reiniciadas a $0', 'info');
    cargarResumen();
    if (typeof VentasModule !== 'undefined') VentasModule.cargarVentas();
  }

  return {
    init,
    setPeriodo,
    cargarResumen,
    abrirModalEgreso,
    cerrarModalEgreso,
    guardarEgreso,
    eliminarEgreso,
    reiniciarCaja,
    imprimirCierre
  };
})();
