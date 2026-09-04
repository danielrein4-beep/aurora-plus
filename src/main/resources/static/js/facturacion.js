const FacturacionModule = (function() {
  const state = {
    facturas: [],
    facturaRetencionActual: null
  };

  function init() {
    cargarFacturas();
  }

  async function cargarFacturas() {
    try {
      const data = await Api.get('/facturas');
      state.facturas = data;
      renderFacturas();
    } catch (e) {
      console.error(e);
      Utils.showToast('Error cargando facturas', 'error');
    }
  }

  function renderFacturas() {
    const tbody = document.getElementById('f-tabla-facturas');
    if (!tbody) return;
    
    if (state.facturas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding:20px;">No hay facturas emitidas</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    state.facturas.forEach(f => {
      const tr = document.createElement('tr');
      const isPagada = f.estado === 'PAGADA';
      const isAnulada = f.estado === 'ANULADA';

      let estadoBadge = `<span class="badge badge-default">${f.estado}</span>`;
      if (isPagada) estadoBadge = `<span class="badge badge-green">PAGADA</span>`;
      if (isAnulada) estadoBadge = `<span class="badge badge-red">ANULADA</span>`;

      tr.innerHTML = `
        <td><span class="fw-600">${f.numeroControl}</span></td>
        <td>${Utils.formatDate(f.fechaEmision)}</td>
        <td>
          <div style="font-weight:600; color:var(--t-high);">${f.clienteNombre}</div>
          <div style="font-size:11px; color:var(--t-muted);">${f.clienteRif}</div>
        </td>
        <td>${f.concepto}</td>
        <td class="text-right fw-700" style="color:var(--t-high);">
          ${formatMonto(f.total, f.moneda)}
        </td>
        <td class="text-center">${estadoBadge}</td>
        <td class="text-center">
          ${!isPagada && !isAnulada ? `<button class="btn btn-ghost btn-sm" onclick="FacturacionModule.abrirModalRetencion(${f.id})" style="color:var(--c-blue);" title="Aplicar Retención">Retener</button>` : ''}
          <button class="btn btn-ghost btn-sm" onclick="FacturacionModule.verPDF(${f.id})" title="Imprimir PDF">PDF</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function formatMonto(num, moneda) {
    if (moneda === 'VES') return 'Bs. ' + new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
    return '$ ' + new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  }

  function abrirModalNueva() {
    // Limpiar formulario
    document.getElementById('f-cliente').value = '';
    document.getElementById('f-rif').value = '';
    document.getElementById('f-direccion').value = '';
    document.getElementById('f-concepto').value = '';
    document.getElementById('f-moneda').value = 'VES';
    document.getElementById('f-subtotal').value = '';
    document.getElementById('f-iva').value = '16.0';
    document.getElementById('f-igtf').checked = false;
    
    document.getElementById('f-modal-nueva').style.display = 'flex';
  }

  function cerrarModalNueva() {
    document.getElementById('f-modal-nueva').style.display = 'none';
  }

  async function guardarFactura() {
    const cliente = document.getElementById('f-cliente').value.trim();
    const rif = document.getElementById('f-rif').value.trim();
    const direccion = document.getElementById('f-direccion').value.trim();
    const concepto = document.getElementById('f-concepto').value.trim();
    const moneda = document.getElementById('f-moneda').value;
    const subtotal = parseFloat(document.getElementById('f-subtotal').value) || 0;
    const iva = parseFloat(document.getElementById('f-iva').value) || 0.0;
    const aplicaIgtf = document.getElementById('f-igtf').checked;

    if (!cliente || !rif || subtotal <= 0) {
      Utils.showToast('Llene los campos obligatorios y el subtotal.', 'error');
      return;
    }

    const payload = {
      fechaEmision: new Date().toISOString().split('T')[0],
      clienteNombre: cliente,
      clienteRif: rif,
      clienteDireccion: direccion,
      concepto: concepto,
      moneda: moneda,
      subtotal: subtotal,
      porcentajeIva: iva,
      aplicaIgtf: aplicaIgtf,
      porcentajeIgtf: aplicaIgtf ? 3.0 : 0.0,
      montoIva: 0,
      montoIgtf: 0,
      total: 0
    };

    try {
      await Api.post('/facturas', payload);
      Utils.showToast('Factura emitida con éxito', 'success');
      cerrarModalNueva();
      cargarFacturas();
    } catch (e) {
      console.error(e);
      Utils.showToast('Error al emitir factura', 'error');
    }
  }

  function abrirModalRetencion(id) {
    state.facturaRetencionActual = state.facturas.find(x => x.id === id);
    if (!state.facturaRetencionActual) return;
    
    document.getElementById('r-tipo').value = 'IVA';
    document.getElementById('r-porcentaje').value = '75.0';
    document.getElementById('r-comprobante').value = '';
    
    document.getElementById('f-modal-retencion').style.display = 'flex';
  }

  function cerrarModalRetencion() {
    document.getElementById('f-modal-retencion').style.display = 'none';
    state.facturaRetencionActual = null;
  }

  async function guardarRetencion() {
    if (!state.facturaRetencionActual) return;
    
    const tipo = document.getElementById('r-tipo').value;
    const porcentaje = parseFloat(document.getElementById('r-porcentaje').value) || 0;
    const comprobante = document.getElementById('r-comprobante').value.trim();

    if (!comprobante) {
      Utils.showToast('Debe ingresar un número de comprobante.', 'error');
      return;
    }

    const payload = {
      tipo: tipo,
      porcentaje: porcentaje,
      comprobante: comprobante,
      monto: 0 // Backend recalcula
    };

    try {
      await Api.post(`/facturas/${state.facturaRetencionActual.id}/retencion`, payload);
      Utils.showToast('Retención aplicada', 'success');
      cerrarModalRetencion();
      cargarFacturas();
    } catch (e) {
      console.error(e);
      Utils.showToast('Error al aplicar retención', 'error');
    }
  }

  function verPDF(id) {
    const f = state.facturas.find(x => x.id === id);
    if (!f) return;
    
    // Aquí puedes invocar a una librería como pdfmake o jspdf para generar el diseño SENIAT
    // Por simplicidad, simularemos un toast y luego implementaremos el print real
    Utils.showToast('Generando PDF Formato Libre (SENIAT)...', 'info');
    
    setTimeout(() => {
      // Mockup de impresión
      const win = window.open('', '_blank');
      win.document.write(`
        <html>
        <head>
          <title>Factura ${f.numeroControl}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; margin: 0 auto; max-width: 800px; color: #0f172a; }
            .inv-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px; border-bottom: 2px solid #0f172a; padding-bottom: 18px; }
            .inv-brand { display: flex; align-items: center; gap: 14px; }
            .inv-logo { max-height: 65px; width: auto; object-fit: contain; background: transparent; border: none; display: block; }
            .inv-company { font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; margin: 0 0 4px 0; }
            .inv-company-sub { font-size: 11px; color: #475569; margin: 0; line-height: 1.5; }
            .inv-badge { border: 2px solid #0f172a; padding: 16px 20px; border-radius: 6px; text-align: center; }
            .inv-badge h1 { margin: 0; font-size: 22px; letter-spacing: 0.06em; }
            .inv-badge .ctrl { margin: 8px 0 0 0; font-size: 16px; font-weight: 700; color: #dc2626; }
            .client-box { border: 1px solid #e2e8f0; padding: 14px; margin-bottom: 28px; border-radius: 6px; font-size: 13px; }
            .client-box p { margin: 4px 0; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 28px; font-size: 13px; }
            thead tr { background: #f1f5f9; }
            th, td { padding: 9px 10px; border: 1px solid #e2e8f0; }
            th { text-align: left; font-weight: 700; }
            .totals-table { width: 300px; margin-left: auto; font-size: 13px; }
            .totals-table td { padding: 5px; border: none; }
            .total-final td { font-size: 16px; font-weight: 700; border-top: 2px solid #0f172a; padding-top: 10px; }
            .footer { margin-top: 48px; text-align: center; font-size: 11px; color: #94a3b8; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="inv-header">
            <div class="inv-brand">
              <img src="/img/logo.svg" alt="Carbones Tamanaco" class="inv-logo"
                   >
              <div>
                <p class="inv-company">Carbones Tamanaco S.A.S.</p>
                <p class="inv-company-sub">
                  RIF: J-00000000-0<br>
                  Dirección Fiscal — Venezuela<br>
                  Sistema ERP Interno
                </p>
              </div>
            </div>
            <div class="inv-badge">
              <h1>FACTURA</h1>
              <p class="ctrl">N° CONTROL: ${f.numeroControl}</p>
            </div>
          </div>

          <div class="client-box">
            <p><strong>Razón Social:</strong> ${f.clienteNombre}</p>
            <p><strong>RIF:</strong> ${f.clienteRif}</p>
            <p><strong>Domicilio Fiscal:</strong> ${f.clienteDireccion}</p>
            <p><strong>Fecha de Emisión:</strong> ${Utils.formatDate(f.fechaEmision)}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Descripción</th>
                <th style="text-align:right">Precio Unitario</th>
                <th style="text-align:right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${f.concepto}</td>
                <td style="text-align:right">${formatMonto(f.subtotal, f.moneda)}</td>
                <td style="text-align:right">${formatMonto(f.subtotal, f.moneda)}</td>
              </tr>
            </tbody>
          </table>

          <div style="display:flex; justify-content:flex-end;">
            <table class="totals-table">
              <tr>
                <td><strong>Subtotal (Base Imponible)</strong></td>
                <td style="text-align:right">${formatMonto(f.subtotal, f.moneda)}</td>
              </tr>
              <tr>
                <td><strong>IVA (${f.porcentajeIva}%)</strong></td>
                <td style="text-align:right">${formatMonto(f.montoIva, f.moneda)}</td>
              </tr>
              ${f.aplicaIgtf ? `
              <tr>
                <td><strong>IGTF (${f.porcentajeIgtf}%)</strong></td>
                <td style="text-align:right">${formatMonto(f.montoIgtf, f.moneda)}</td>
              </tr>` : ''}
              <tr class="total-final">
                <td>Total a Pagar</td>
                <td style="text-align:right">${formatMonto(f.total, f.moneda)}</td>
              </tr>
            </table>
          </div>

          <div class="footer">
            Documento generado por el Sistema ERP — Carbones Tamanaco S.A.S.
          </div>
        </body>
        </html>
      `);
      win.document.close();
      // Esperar a que la imagen cargue antes de imprimir
      win.onload = () => win.print();
    }, 1000);
  }

  return {
    init,
    cargarFacturas,
    abrirModalNueva,
    cerrarModalNueva,
    guardarFactura,
    abrirModalRetencion,
    cerrarModalRetencion,
    guardarRetencion,
    verPDF
  };

})();
