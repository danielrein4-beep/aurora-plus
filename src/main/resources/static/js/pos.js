/**
 * Módulo POS (Punto de Venta / Registrar Ventas) — L'Apéritif
 * 100% en Español | Persistencia Permanente Dual (LocalStorage + Backend)
 */

const PosModule = (() => {
  const STORAGE_KEY_PRODS = 'laperitif_productos';
  const STORAGE_KEY_VENTAS = 'laperitif_ventas';
  const STORAGE_KEY_CART = 'laperitif_cart';

  const PRODUCTOS_CATALOGO_BASE = [
    { id: 1, codigo: 'FOC-CAP-IND', nombre: 'Focaccia Capresa', descripcion: 'Tomates frescos, mozzarella di bufala, pesto genovés y albahaca fresca', categoria: 'FOCACCIA', tamano: 'INDIVIDUAL', precioUsd: 5.00, stockActual: 30 },
    { id: 2, codigo: 'FOC-CAP-COM', nombre: 'Focaccia Capresa', descripcion: 'Tomates frescos, mozzarella di bufala, pesto genovés y albahaca fresca', categoria: 'FOCACCIA', tamano: 'COMPARTIR', precioUsd: 9.00, stockActual: 20 },
    { id: 3, codigo: 'FOC-ROS-IND', nombre: 'Focaccia Rosa', descripcion: 'Salsa rosa artesanal de la casa, jamón selecto y queso fundido', categoria: 'FOCACCIA', tamano: 'INDIVIDUAL', precioUsd: 5.00, stockActual: 30 },
    { id: 4, codigo: 'FOC-ROS-COM', nombre: 'Focaccia Rosa', descripcion: 'Salsa rosa artesanal de la casa, jamón selecto y queso fundido', categoria: 'FOCACCIA', tamano: 'COMPARTIR', precioUsd: 9.00, stockActual: 20 },
    { id: 5, codigo: 'FOC-BOL-IND', nombre: 'Focaccia Bologna', descripcion: 'Mortadela bologna con pistachos, stracciatella y rúgula fresca', categoria: 'FOCACCIA', tamano: 'INDIVIDUAL', precioUsd: 6.00, stockActual: 30 },
    { id: 6, codigo: 'FOC-BOL-COM', nombre: 'Focaccia Bologna', descripcion: 'Mortadela bologna con pistachos, stracciatella y rúgula fresca', categoria: 'FOCACCIA', tamano: 'COMPARTIR', precioUsd: 10.00, stockActual: 20 },
    { id: 7, codigo: 'FOC-RUS-IND', nombre: 'Focaccia Rústica', descripcion: 'Quesos madurados, hierbas toscanas y toque de ajo confitado', categoria: 'FOCACCIA', tamano: 'INDIVIDUAL', precioUsd: 7.00, stockActual: 30 },
    { id: 8, codigo: 'FOC-RUS-COM', nombre: 'Focaccia Rústica', descripcion: 'Quesos madurados, hierbas toscanas y toque de ajo confitado', categoria: 'FOCACCIA', tamano: 'COMPARTIR', precioUsd: 13.00, stockActual: 20 },
    { id: 9, codigo: 'FOC-IBE-IND', nombre: 'Focaccia Ibérica', descripcion: 'Jamón ibérico curado, queso manchego, aceite de oliva virgen extra y tomate', categoria: 'FOCACCIA', tamano: 'INDIVIDUAL', precioUsd: 7.00, stockActual: 30 },
    { id: 11, codigo: 'BRO-FRU-EST', nombre: 'Brochetas de Frutas', descripcion: 'Brochetas de frutas frescas de temporada con sirope gourmet', categoria: 'BROCHETAS', tamano: 'ESTANDAR', precioUsd: 1.50, precioCopFijo: 5000, stockActual: 50 },
    { id: 12, codigo: 'BEB-REF-100', nombre: 'Refresco en Lata (Lata 355ml)', descripcion: 'Refresco en lata variado (Coca-Cola, Pepsi, 7Up, Chinotto, Kolita)', categoria: 'BEBIDAS', tamano: 'LATA', precioUsd: 1.00, stockActual: 100 },
    { id: 13, codigo: 'BEB-REF-2L', nombre: 'Refresco 2 Litros', descripcion: 'Refresco familiar de 2 Litros variado (Coca-Cola, Pepsi, 7Up, Chinotto, Kolita)', categoria: 'BEBIDAS', tamano: '2 LITROS', precioUsd: 5.00, stockActual: 50 }
  ];

  let productos = [];
  let carrito = [];
  
  // Tasas de Cambio
  let tasaCop = 3300.0;
  let tasaVes = 925.0;

  function calcularPrecioCop(p) {
    if (p.precioCopFijo) return p.precioCopFijo;
    if (p.codigo === 'BRO-FRU-EST' || (p.nombre && p.nombre.toLowerCase().includes('brocheta'))) return 5000;
    return (p.precioUsd || p.precioUnitarioUsd || 0) * tasaCop;
  }

  let categoriaActiva = 'TODOS';
  let ultimaVenta = null;

  async function init() {
    cargarCarritoGuardado();
    await cargarProductos();
    renderCatalogo();
    renderCarrito();
    actualizarTotales();
  }

  function cargarCarritoGuardado() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CART);
      if (raw) carrito = JSON.parse(raw) || [];
    } catch (e) {
      carrito = [];
    }
  }

  function guardarCarrito() {
    try {
      localStorage.setItem(STORAGE_KEY_CART, JSON.stringify(carrito));
    } catch (e) {}
  }

  async function cargarProductos() {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_PRODS);
      if (cached) {
        productos = JSON.parse(cached);
      }
    } catch (e) {}

    if (!productos || productos.length === 0) {
      productos = [...PRODUCTOS_CATALOGO_BASE];
      guardarProductosLocal();
    } else {
      PRODUCTOS_CATALOGO_BASE.forEach(baseProd => {
        if (!productos.some(p => p.codigo === baseProd.codigo || p.id === baseProd.id)) {
          productos.push(baseProd);
        }
      });
      guardarProductosLocal();
    }

    try {
      const data = await Api.get('/inventario/productos');
      if (data && Array.isArray(data) && data.length > 0) {
        productos = data;
        guardarProductosLocal();
      }
    } catch (err) {
      console.warn('Operando con persistencia local de L\'Apéritif.');
    }
  }

  function guardarProductosLocal() {
    try {
      localStorage.setItem(STORAGE_KEY_PRODS, JSON.stringify(productos));
    } catch (e) {}
  }

  function setCategoria(cat) {
    categoriaActiva = cat;
    document.querySelectorAll('.cat-pill').forEach(el => {
      if (el.dataset.cat === cat) el.classList.add('active');
      else el.classList.remove('active');
    });
    renderCatalogo();
  }

  function renderCatalogo() {
    const contenedor = document.getElementById('pos-catalogo-grid');
    if (!contenedor) return;

    let filtrados = productos.filter(p => p.activo !== false);
    if (categoriaActiva !== 'TODOS') {
      filtrados = filtrados.filter(p => p.categoria === categoriaActiva);
    }

    if (filtrados.length === 0) {
      contenedor.innerHTML = `
        <div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--c-text-muted);">
          No hay productos disponibles en esta categoría.
        </div>
      `;
      return;
    }

    let html = '';
    filtrados.forEach(p => {
      const stock = p.stockActual != null ? p.stockActual : 0;
      const precioCop = calcularPrecioCop(p);
      const precioVes = (p.precioUsd * tasaVes);

      let tamanoBadge = '';
      if (p.tamano === 'INDIVIDUAL') {
        tamanoBadge = '<span class="badge badge-dark">Individual</span>';
      } else if (p.tamano === 'COMPARTIR') {
        tamanoBadge = '<span class="badge badge-light">Para Compartir</span>';
      } else if (p.tamano) {
        tamanoBadge = `<span class="badge badge-light">${p.tamano}</span>`;
      }

      html += `
        <div class="pos-product-card" onclick="PosModule.agregarAlCarrito(${p.id})">
          <div class="flex-between" style="margin-bottom: 12px;">
            ${tamanoBadge}
            <span class="stock-badge">Stock: ${stock}</span>
          </div>
          <div class="pos-card-title">${p.nombre}</div>
          <div class="pos-card-desc">${p.descripcion || ''}</div>
          
          <div class="pos-card-footer">
            <div>
              <div class="pos-price-usd">$${(p.precioUsd || 0).toFixed(2)} USD</div>
              <div class="pos-price-conversions">
                <span>$${Utils.formatNumber(precioCop, 0)} COP</span> &nbsp;|&nbsp; <span>Bs. ${Utils.formatNumber(precioVes, 2)}</span>
              </div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); PosModule.agregarAlCarrito(${p.id})">
              + Agregar
            </button>
          </div>
        </div>
      `;
    });

    contenedor.innerHTML = html;
  }

  function agregarAlCarrito(productoId) {
    const p = productos.find(item => item.id === productoId);
    if (!p) return;

    const index = carrito.findIndex(item => item.productoId === productoId);
    if (index >= 0) {
      carrito[index].cantidad += 1;
      carrito[index].subtotalUsd = carrito[index].cantidad * carrito[index].precioUsd;
    } else {
      carrito.push({
        productoId: p.id,
        nombre: p.nombre,
        tamano: p.tamano,
        precioUsd: p.precioUsd || 0.0,
        cantidad: 1,
        subtotalUsd: p.precioUsd || 0.0
      });
    }

    guardarCarrito();
    renderCarrito();
    actualizarTotales();
    Toast.show(`+1 ${p.nombre}`, 'info');
  }

  function cambiarCantidad(index, delta) {
    if (index < 0 || index >= carrito.length) return;
    carrito[index].cantidad += delta;
    if (carrito[index].cantidad <= 0) {
      carrito.splice(index, 1);
    } else {
      carrito[index].subtotalUsd = carrito[index].cantidad * carrito[index].precioUsd;
    }
    guardarCarrito();
    renderCarrito();
    actualizarTotales();
  }

  function eliminarDelCarrito(index) {
    if (index < 0 || index >= carrito.length) return;
    carrito.splice(index, 1);
    guardarCarrito();
    renderCarrito();
    actualizarTotales();
  }

  function vaciarCarrito() {
    if (carrito.length === 0) return;
    carrito = [];
    guardarCarrito();
    renderCarrito();
    actualizarTotales();
    Toast.show('Orden vaciada', 'info');
  }

  function renderCarrito() {
    const contenedor = document.getElementById('pos-cart-items');
    const badgeCount = document.getElementById('pos-cart-count');
    if (!contenedor) return;

    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    if (badgeCount) badgeCount.textContent = totalItems;

    if (carrito.length === 0) {
      contenedor.innerHTML = `
        <div style="text-align:center; padding: 40px 10px; color: var(--c-text-muted);">
          <div style="font-family: var(--font-serif); font-weight: 700; font-size: 16px; color: var(--c-black);">Orden Vacía</div>
          <div style="font-size: 12px; margin-top: 4px;">Haz clic en cualquier producto de la izquierda para agregarlo</div>
        </div>
      `;
      return;
    }

    let html = '';
    carrito.forEach((item, idx) => {
      let tamanoStr = item.tamano ? `<span style="font-size: 11px; color: var(--c-text-muted);">(${item.tamano})</span>` : '';
      const itemCop = calcularPrecioCop(item);
      const subtotalCop = itemCop * item.cantidad;

      html += `
        <div class="pos-cart-row">
          <div class="pos-cart-item-info">
            <div style="font-weight: 700; font-size: 13px; color: var(--c-black);">${item.nombre} ${tamanoStr}</div>
            <div style="font-size: 11px; color: var(--c-text-muted);">$${item.precioUsd.toFixed(2)} USD &nbsp;|&nbsp; $${Utils.formatNumber(itemCop, 0)} COP</div>
          </div>
          
          <div class="pos-cart-qty-controls">
            <button class="pos-qty-btn" onclick="PosModule.cambiarCantidad(${idx}, -1)">-</button>
            <span class="pos-qty-num">${item.cantidad}</span>
            <button class="pos-qty-btn" onclick="PosModule.cambiarCantidad(${idx}, 1)">+</button>
          </div>

          <div style="text-align: right; min-width: 80px;">
            <div style="font-family: var(--font-serif); font-weight: 700; font-size: 14.5px; color: var(--c-black);">$${item.subtotalUsd.toFixed(2)}</div>
            <div style="font-size: 10.5px; color: var(--c-text-muted); font-weight: 600;">$${Utils.formatNumber(subtotalCop, 0)} COP</div>
          </div>

          <button class="pos-cart-del-btn" onclick="PosModule.eliminarDelCarrito(${idx})" title="Eliminar">&times;</button>
        </div>
      `;
    });

    contenedor.innerHTML = html;
  }

  function actualizarTotales() {
    const totalUsd = carrito.reduce((sum, item) => sum + item.subtotalUsd, 0);
    const totalCop = carrito.reduce((sum, item) => sum + (calcularPrecioCop(item) * item.cantidad), 0);
    const totalVes = totalUsd * tasaVes;

    const elUsd = document.getElementById('pos-total-usd');
    const elCop = document.getElementById('pos-total-cop');
    const elVes = document.getElementById('pos-total-ves');

    if (elUsd) elUsd.textContent = `$${totalUsd.toFixed(2)} USD`;
    if (elCop) elCop.textContent = `$${Utils.formatNumber(totalCop, 0)} COP`;
    if (elVes) elVes.textContent = `Bs. ${Utils.formatNumber(totalVes, 2)}`;

    const btnCobrar = document.getElementById('pos-btn-cobrar');
    if (btnCobrar) {
      btnCobrar.disabled = (carrito.length === 0);
    }
  }

  // ── MODAL DE COBRO ──

  function abrirModalCobro() {
    if (carrito.length === 0) {
      Toast.show('Agrega productos al carrito primero', 'warning');
      return;
    }

    onMonedaCobroChange();
    document.getElementById('modal-cobro-pos').style.display = 'flex';
  }

  function cerrarModalCobro() {
    document.getElementById('modal-cobro-pos').style.display = 'none';
  }

  function onMonedaCobroChange() {
    const moneda = document.getElementById('cobro-moneda').value;
    const totalUsd = carrito.reduce((sum, item) => sum + item.subtotalUsd, 0);
    const totalCop = carrito.reduce((sum, item) => sum + (calcularPrecioCop(item) * item.cantidad), 0);
    const totalVes = totalUsd * tasaVes;

    const elTotalHeader = document.getElementById('cobro-total-usd');
    const elTotalSub = document.getElementById('cobro-total-cop');
    const elLabelRecibido = document.getElementById('cobro-label-monto');
    const selectMetodo = document.getElementById('cobro-metodo');

    let totalMoneda = totalUsd;

    if (moneda === 'COP') {
      totalMoneda = totalCop;
      if (elTotalHeader) elTotalHeader.textContent = `$${Utils.formatNumber(totalCop, 0)} COP`;
      if (elTotalSub) elTotalSub.innerHTML = `Equiv. Dólares: <strong>$${totalUsd.toFixed(2)} USD</strong> &nbsp;|&nbsp; Equiv. Bolívares: <strong>Bs. ${Utils.formatNumber(totalVes, 2)}</strong>`;
      if (elLabelRecibido) elLabelRecibido.textContent = 'Monto Recibido en Pesos (COP)';
      if (selectMetodo) selectMetodo.value = 'COP_EFECTIVO';
    } else if (moneda === 'VES') {
      totalMoneda = totalVes;
      if (elTotalHeader) elTotalHeader.textContent = `Bs. ${Utils.formatNumber(totalVes, 2)}`;
      if (elTotalSub) elTotalSub.innerHTML = `Equiv. Dólares: <strong>$${totalUsd.toFixed(2)} USD</strong> &nbsp;|&nbsp; Equiv. Pesos: <strong>$${Utils.formatNumber(totalCop, 0)} COP</strong>`;
      if (elLabelRecibido) elLabelRecibido.textContent = 'Monto Recibido en Bolívares (VES)';
      if (selectMetodo) selectMetodo.value = 'VES_PAGO_MOVIL';
    } else {
      totalMoneda = totalUsd;
      if (elTotalHeader) elTotalHeader.textContent = `$${totalUsd.toFixed(2)} USD`;
      if (elTotalSub) elTotalSub.innerHTML = `Equiv. Pesos: <strong>$${Utils.formatNumber(totalCop, 0)} COP</strong> &nbsp;|&nbsp; Equiv. Bolívares: <strong>Bs. ${Utils.formatNumber(totalVes, 2)}</strong>`;
      if (elLabelRecibido) elLabelRecibido.textContent = 'Monto Recibido en Dólares (USD)';
      if (selectMetodo) selectMetodo.value = 'USD_EFECTIVO';
    }

    document.getElementById('cobro-monto-exacto').textContent = (moneda === 'COP') 
      ? `$${Utils.formatNumber(totalMoneda, 0)} COP`
      : (moneda === 'VES' ? `Bs. ${Utils.formatNumber(totalMoneda, 2)}` : `$${totalMoneda.toFixed(2)} USD`);

    const inputRecibido = document.getElementById('cobro-recibido');
    inputRecibido.value = (moneda === 'COP') ? Math.round(totalMoneda) : totalMoneda.toFixed(2);
    
    calcularCambio();
  }

  function calcularCambio() {
    const moneda = document.getElementById('cobro-moneda').value;
    const totalUsd = carrito.reduce((sum, item) => sum + item.subtotalUsd, 0);
    const totalCop = carrito.reduce((sum, item) => sum + (calcularPrecioCop(item) * item.cantidad), 0);
    
    let totalMoneda = totalUsd;
    if (moneda === 'COP') totalMoneda = totalCop;
    else if (moneda === 'VES') totalMoneda = totalUsd * tasaVes;

    const recibido = parseFloat(document.getElementById('cobro-recibido').value) || 0;
    const cambio = Math.max(0, recibido - totalMoneda);

    const elCambio = document.getElementById('cobro-cambio');
    if (moneda === 'COP') {
      elCambio.textContent = `$${Utils.formatNumber(cambio, 0)} COP`;
    } else if (moneda === 'VES') {
      elCambio.textContent = `Bs. ${Utils.formatNumber(cambio, 2)}`;
    } else {
      elCambio.textContent = `$${cambio.toFixed(2)} USD`;
    }
  }

  let isProcessingSale = false;

  async function procesarVenta() {
    if (isProcessingSale) return;
    if (carrito.length === 0) return;

    isProcessingSale = true;
    const btn = document.getElementById('btn-confirmar-venta');
    if (btn) btn.disabled = true;

    const totalUsd = carrito.reduce((sum, item) => sum + item.subtotalUsd, 0);
    const totalCop = carrito.reduce((sum, item) => sum + (calcularPrecioCop(item) * item.cantidad), 0);
    const totalVes = totalUsd * tasaVes;
    const monedaCobro = document.getElementById('cobro-moneda').value;
    const recibido = parseFloat(document.getElementById('cobro-recibido').value) || 0;
    
    let totalEnMoneda = totalUsd;
    if (monedaCobro === 'COP') totalEnMoneda = totalCop;
    else if (monedaCobro === 'VES') totalEnMoneda = totalVes;

    const cambio = Math.max(0, recibido - totalEnMoneda);

    const nuevaVenta = {
      id: Date.now(),
      numeroTicket: 'TKT-' + Math.floor(100000 + Math.random() * 900000),
      fecha: new Date().toISOString(),
      cliente: document.getElementById('cobro-cliente').value.trim() || 'Cliente General',
      notas: document.getElementById('cobro-notas').value.trim(),
      metodoPago: document.getElementById('cobro-metodo').value,
      monedaCobro: monedaCobro,
      montoRecibido: recibido,
      montoCambio: cambio,
      totalUsd: totalUsd,
      totalCop: totalCop,
      totalVes: totalVes,
      tasaCop: tasaCop,
      tasaVes: tasaVes,
      estado: 'COMPLETADA',
      items: carrito.map(item => ({
        productoId: item.productoId,
        nombreProducto: item.nombre,
        tamano: item.tamano,
        cantidad: item.cantidad,
        precioUnitarioUsd: item.precioUsd,
        subtotalUsd: item.subtotalUsd
      }))
    };

    // 1. Guardar permanentemente en LocalStorage
    try {
      const rawVentas = localStorage.getItem(STORAGE_KEY_VENTAS);
      let listaVentas = rawVentas ? JSON.parse(rawVentas) : [];
      // Evitar duplicados por numeroTicket
      listaVentas = listaVentas.filter(v => v.numeroTicket !== nuevaVenta.numeroTicket);
      listaVentas.unshift(nuevaVenta);
      localStorage.setItem(STORAGE_KEY_VENTAS, JSON.stringify(listaVentas));
    } catch (e) {}

    // 2. Descontar stock en LocalStorage
    carrito.forEach(item => {
      const p = productos.find(prod => prod.id === item.productoId);
      if (p && p.stockActual != null) {
        p.stockActual = Math.max(0, p.stockActual - item.cantidad);
      }
    });
    guardarProductosLocal();

    // 3. Sincronizar en segundo plano con Backend si está activo
    try {
      await Api.post('/ventas', {
        numeroTicket: nuevaVenta.numeroTicket,
        cliente: nuevaVenta.cliente,
        notas: nuevaVenta.notas,
        metodoPago: nuevaVenta.metodoPago,
        monedaCobro: nuevaVenta.monedaCobro,
        montoRecibido: nuevaVenta.montoRecibido,
        tasaCop: tasaCop,
        tasaVes: tasaVes,
        items: nuevaVenta.items
      });
    } catch (err) {
      console.warn('Venta registrada localmente con éxito.');
    }

    Toast.show('Venta registrada con éxito', 'success');
    cerrarModalCobro();
    isProcessingSale = false;
    
    // Resetear datos del cliente para la próxima venta
    const elCli = document.getElementById('cobro-cliente');
    const elNot = document.getElementById('cobro-notas');
    if (elCli) elCli.value = 'Cliente General';
    if (elNot) elNot.value = '';

    // Mostrar ticket
    imprimirTicket(nuevaVenta);

    // Limpiar carrito
    carrito = [];
    guardarCarrito();
    renderCarrito();
    actualizarTotales();
    renderCatalogo();

    if (btn) btn.disabled = false;
  }

  function imprimirTicket(venta) {
    if (!venta) return;
    ultimaVenta = venta;

    const moneda = venta.monedaCobro || 'USD';
    const isCop = (moneda === 'COP');
    const isVes = (moneda === 'VES');

    document.getElementById('ticket-num').textContent = venta.numeroTicket || ('TKT-' + venta.id);
    document.getElementById('ticket-fecha').textContent = new Date(venta.fecha || Date.now()).toLocaleString();
    document.getElementById('ticket-cliente').textContent = venta.cliente || 'Cliente General';
    document.getElementById('ticket-metodo').textContent = formatearMetodoPago(venta.metodoPago);

    let itemsHtml = '';
    if (venta.items) {
      venta.items.forEach(item => {
        const tam = item.tamano ? `(${item.tamano})` : '';
        let precioItemStr = `$${(item.subtotalUsd || 0).toFixed(2)}`;
        if (isCop) {
          const itemCop = (calcularPrecioCop(item) * item.cantidad);
          precioItemStr = `$${Utils.formatNumber(itemCop, 0)} COP`;
        } else if (isVes) {
          const itemVes = (item.subtotalUsd * (venta.tasaVes || tasaVes));
          precioItemStr = `Bs. ${Utils.formatNumber(itemVes, 2)}`;
        }

        itemsHtml += `
          <tr>
            <td style="padding: 5px 0; text-align: left;">${item.cantidad}x ${item.nombreProducto} ${tam}</td>
            <td style="padding: 5px 0; text-align: right; font-weight: bold;">${precioItemStr}</td>
          </tr>
        `;
      });
    }
    document.getElementById('ticket-items-tbody').innerHTML = itemsHtml;

    // Adaptar totales del ticket según la moneda principal
    const totalUsdVal = (venta.totalUsd || 0).toFixed(2);
    const totalCopVal = Utils.formatNumber(venta.totalCop || (venta.totalUsd * tasaCop), 0);
    const totalVesVal = Utils.formatNumber(venta.totalVes || (venta.totalUsd * tasaVes), 2);

    if (isCop) {
      document.getElementById('ticket-total-usd').textContent = `$${totalCopVal} COP`;
      document.getElementById('ticket-total-cop').textContent = `$${totalUsdVal} USD (Tasa x${venta.tasaCop || tasaCop})`;
      document.getElementById('ticket-total-ves').textContent = `Bs. ${totalVesVal} (Tasa x${venta.tasaVes || tasaVes})`;
    } else if (isVes) {
      document.getElementById('ticket-total-usd').textContent = `Bs. ${totalVesVal}`;
      document.getElementById('ticket-total-cop').textContent = `$${totalUsdVal} USD`;
      document.getElementById('ticket-total-ves').textContent = `$${totalCopVal} COP`;
    } else {
      document.getElementById('ticket-total-usd').textContent = `$${totalUsdVal} USD`;
      document.getElementById('ticket-total-cop').textContent = `$${totalCopVal} COP (x${venta.tasaCop || tasaCop})`;
      document.getElementById('ticket-total-ves').textContent = `Bs. ${totalVesVal} (x${venta.tasaVes || tasaVes})`;
    }

    if (venta.montoRecibido && venta.montoRecibido > 0) {
      const rec = isCop ? `$${Utils.formatNumber(venta.montoRecibido, 0)} COP` : (isVes ? `Bs. ${Utils.formatNumber(venta.montoRecibido, 2)}` : `$${Utils.formatNumber(venta.montoRecibido, 2)} USD`);
      const cam = isCop ? `$${Utils.formatNumber(venta.montoCambio || 0, 0)} COP` : (isVes ? `Bs. ${Utils.formatNumber(venta.montoCambio || 0, 2)}` : `$${Utils.formatNumber(venta.montoCambio || 0, 2)} USD`);

      document.getElementById('ticket-recibido').textContent = rec;
      document.getElementById('ticket-cambio').textContent = cam;
      document.getElementById('ticket-fila-cambio').style.display = 'table-row';
      document.getElementById('ticket-fila-recibido').style.display = 'table-row';
    } else {
      document.getElementById('ticket-fila-cambio').style.display = 'none';
      document.getElementById('ticket-fila-recibido').style.display = 'none';
    }

    document.getElementById('modal-ticket-preview').style.display = 'flex';
  }

  function cerrarModalTicket() {
    document.getElementById('modal-ticket-preview').style.display = 'none';
  }

  function ejecutarImpresionTicket() {
    document.body.classList.add('printing-ticket-termico');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-ticket-termico');
    }, 1000);
  }

  function imprimirReciboFormal(venta) {
    if (!venta) return;

    const moneda = venta.monedaCobro || 'USD';
    const isCop = (moneda === 'COP');
    const isVes = (moneda === 'VES');

    document.getElementById('rv-ticket').textContent = 'Nº ' + (venta.numeroTicket || ('TKT-' + venta.id));
    document.getElementById('rv-fecha').textContent = 'Fecha: ' + new Date(venta.fecha || Date.now()).toLocaleString();
    document.getElementById('rv-cliente').textContent = venta.cliente || 'Cliente General';
    document.getElementById('rv-metodo').textContent = formatearMetodoPago(venta.metodoPago);
    document.getElementById('rv-notas').textContent = venta.notas || '—';
    document.getElementById('rv-tasa-cop').textContent = Utils.formatNumber(venta.tasaCop || tasaCop, 0);
    document.getElementById('rv-tasa-ves').textContent = Utils.formatNumber(venta.tasaVes || tasaVes, 2);

    let itemsHtml = '';
    if (venta.items) {
      venta.items.forEach(item => {
        const tam = item.tamano || 'Estándar';
        let precioUnitStr = `$${(item.precioUnitarioUsd || 0).toFixed(2)}`;
        let subtotalStr = `$${(item.subtotalUsd || 0).toFixed(2)}`;

        if (isCop) {
          const unitCop = calcularPrecioCop(item);
          const subCop = unitCop * item.cantidad;
          precioUnitStr = `$${Utils.formatNumber(unitCop, 0)} COP`;
          subtotalStr = `$${Utils.formatNumber(subCop, 0)} COP`;
        } else if (isVes) {
          const unitVes = (item.precioUnitarioUsd || 0) * (venta.tasaVes || tasaVes);
          const subVes = (item.subtotalUsd || 0) * (venta.tasaVes || tasaVes);
          precioUnitStr = `Bs. ${Utils.formatNumber(unitVes, 2)}`;
          subtotalStr = `Bs. ${Utils.formatNumber(subVes, 2)}`;
        }

        itemsHtml += `
          <tr>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e5e5e5; text-align: left; font-weight: 700;">${item.cantidad}</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e5e5e5; text-align: left; font-weight: 600;">${item.nombreProducto}</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e5e5e5; text-align: center;"><span style="font-size:11px; background:#f4f4f5; padding:3px 8px; border-radius:4px; font-weight:700;">${tam}</span></td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e5e5e5; text-align: right;">${precioUnitStr}</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e5e5e5; text-align: right; font-weight: 800;">${subtotalStr}</td>
          </tr>
        `;
      });
    }
    document.getElementById('rv-items-tbody').innerHTML = itemsHtml;

    // Totales del Recibo Formal
    const totalUsdVal = (venta.totalUsd || 0).toFixed(2);
    const totalCopVal = Utils.formatNumber(venta.totalCop || (venta.totalUsd * tasaCop), 0);
    const totalVesVal = Utils.formatNumber(venta.totalVes || (venta.totalUsd * tasaVes), 2);

    if (isCop) {
      document.getElementById('rv-total-usd').textContent = `$${totalCopVal} COP`;
      document.getElementById('rv-total-cop').textContent = `$${totalUsdVal} USD`;
      document.getElementById('rv-total-ves').textContent = `Bs. ${totalVesVal}`;
    } else if (isVes) {
      document.getElementById('rv-total-usd').textContent = `Bs. ${totalVesVal}`;
      document.getElementById('rv-total-cop').textContent = `$${totalUsdVal} USD`;
      document.getElementById('rv-total-ves').textContent = `$${totalCopVal} COP`;
    } else {
      document.getElementById('rv-total-usd').textContent = `$${totalUsdVal} USD`;
      document.getElementById('rv-total-cop').textContent = `$${totalCopVal} COP`;
      document.getElementById('rv-total-ves').textContent = `Bs. ${totalVesVal}`;
    }

    const recibido = venta.montoRecibido || (isCop ? (venta.totalCop || (venta.totalUsd * tasaCop)) : venta.totalUsd);
    const cambio = venta.montoCambio || 0;

    const recStr = isCop ? `$${Utils.formatNumber(recibido, 0)} COP` : (isVes ? `Bs. ${Utils.formatNumber(recibido, 2)}` : `$${Utils.formatNumber(recibido, 2)} USD`);
    const camStr = isCop ? `$${Utils.formatNumber(cambio, 0)} COP` : (isVes ? `Bs. ${Utils.formatNumber(cambio, 2)}` : `$${Utils.formatNumber(cambio, 2)} USD`);

    document.body.classList.add('printing-recibo-venta');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-recibo-venta');
    }, 1000);
  }

  function ejecutarReciboDesdeModal() {
    cerrarModalTicket();
    if (ultimaVenta) {
      imprimirReciboFormal(ultimaVenta);
    }
  }

  function formatearMetodoPago(metodo) {
    const mapa = {
      'USD_EFECTIVO': 'Efectivo USD ($)',
      'COP_EFECTIVO': 'Pesos Colombianos (COP)',
      'VES_PAGO_MOVIL': 'Pago Móvil / Transferencia (Bs)',
      'VES_EFECTIVO': 'Efectivo Bolívares (Bs)',
      'ZELLE': 'Zelle (USD)',
      'MIXTO': 'Pago Mixto'
    };
    return mapa[metodo] || metodo || 'Efectivo';
  }

  function setTasas(cop, ves) {
    if (cop > 0) tasaCop = cop;
    if (ves > 0) tasaVes = ves;
    renderCatalogo();
    actualizarTotales();
  }

  return {
    init,
    setCategoria,
    agregarAlCarrito,
    cambiarCantidad,
    eliminarDelCarrito,
    vaciarCarrito,
    abrirModalCobro,
    cerrarModalCobro,
    onMonedaCobroChange,
    calcularCambio,
    procesarVenta,
    imprimirTicket,
    imprimirReciboFormal,
    cerrarModalTicket,
    ejecutarImpresionTicket,
    ejecutarReciboDesdeModal,
    setTasas,
    getProductos: () => productos,
    getTasas: () => ({ tasaCop, tasaVes })
  };
})();
