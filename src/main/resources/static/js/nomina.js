/* ============================================================
   nomina.js — Módulo de ¡Nómina Semanal v4
   Novedades:
   - DeteCCión de Préstamos pendientes por mina
   - Recordatorio y descuento visual de deuda
   - Filas expandibles Con detalle de viajes y préstamos
   ============================================================ */

const NominaModule = (() => {

  let state = {
    semanaRef:      Utils.today(),
    minas:          [],
    editandoMinaId: null,
    vistaActiva:    'calculo',
    expandidos:     new Set(),
  };

  // ----------------------------------------------------------
  // TABS INTERNAS
  // ----------------------------------------------------------
  function activarTab(tab) {
    state.vistaActiva = tab;

    const tabs = ['calculo', 'minas', 'empleados-dir', 'empleados-calc'];
    
    tabs.forEach(t => {
      const tabBtn = document.getElementById(`n-tab-${t}`);
      const panel = document.getElementById(`n-panel-${t}`);
      
      if (tabBtn) {
        tabBtn.className = (t === tab) ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm';
      }
      if (panel) {
        panel.style.display = (t === tab) ? 'block' : 'none';
      }
    });

    if (tab === 'minas') cargarMinas();
    if (tab === 'empleados-dir' || tab === 'empleados-calc') cargarEmpleados();
  }

  // ----------------------------------------------------------
  // CÁLCULO DE ¡Nómina
  // ----------------------------------------------------------
  async function calcular() {
    const inputSemana = document.getElementById('n-semana');
    const semana = inputSemana?.value || Utils.today();
    state.semanaRef = semana;

    const btnCalc   = document.getElementById('n-btn-calcular');
    const resultado = document.getElementById('n-resultado');

    if (resultado) resultado.style.display = 'none';
    if (btnCalc)  { btnCalc.textContent = 'calculando...'; btnCalc.disabled = true; }

    try {
      const data = await Api.get(`/nomina/semana?fecha=${semana}`);
      state.dataSemana = data;
      state.expandidos.clear();
      renderResultado(data);
      verificarEstadoCierre(semana);
    } catch (e) {
      // Error manejado por Api.js
    } finally {
      if (btnCalc) { btnCalc.textContent = 'Calcular Nómina'; btnCalc.disabled = false; }
    }
  }

  function renderResultado(data) {
    if (!data) return;
    window.datosNominaActual = data.items || [];

    const semanaTexto = `${Utils.formatDate(data.semanaInicio)} — ${Utils.formatDate(data.semanaFin)}`;

    document.querySelectorAll('.n-semana-label').forEach(el => { el.textContent = semanaTexto; });
    document.querySelectorAll('.print-fecha-hoy').forEach(el => { el.textContent = Utils.formatDate(Utils.today()); });
    const semanaCard = document.getElementById('n-label-semana-card');
    if (semanaCard) semanaCard.textContent = semanaTexto;

    const statTotal     = document.getElementById('n-total-general');
    const statDespachos = document.getElementById('n-total-despachos');
    const statPeso      = document.getElementById('n-total-peso');
    const tbody         = document.getElementById('n-tabla-items');

    if (statTotal) {
      // Total liquidado en la semana (suma de totalFinalCop de cada mina)
      const totalSemana = data.items ? data.items.reduce((sum, item) => sum + ((item.netoPagarCop != null ? item.netoPagarCop : (item.totalCop || 0)) + (item.ajusteManual || 0)), 0) : (data.totalGeneralCop || 0);
      
      // Total pagado en la semana: suma de totales de minas con estado === 'PAGADA' o saldoPendiente <= 0
      const totalPagadoSemana = data.items ? data.items.filter(it => it.estado === 'PAGADA' || (it.saldoPendienteCop <= 0 && it.totalCop > 0)).reduce((sum, it) => sum + ((it.netoPagarCop != null ? it.netoPagarCop : (it.totalCop || 0)) + (it.ajusteManual || 0)), 0) : 0;
      
      const totalPendienteSemana = Math.max(0, totalSemana - totalPagadoSemana);

      statTotal.textContent = formatCOP(totalPendienteSemana);
      const subEl = statTotal.nextElementSibling;
      if (subEl && totalPagadoSemana > 0) {
        subEl.innerHTML = `Pendiente por pagar (Pagado: <strong style="color:var(--c-green);">${formatCOP(totalPagadoSemana)}</strong>)`;
      } else if (subEl) {
        subEl.textContent = 'en Pesos Colombianos';
      }
    }
    if (statDespachos) statDespachos.textContent = data.totalDespachos;
    if (statPeso) {
      const totalPeso = data.items ? data.items.reduce((sum, item) => sum + (item.toneladas || 0), 0) : 0;
      statPeso.textContent = Utils.formatNumber(totalPeso) + ' Ton';
    }

    if (!tbody) return;
    tbody.innerHTML = '';

    if (!data.items || data.items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="empty-state">
              <div class="empty-icon">—</div>
              <h3>Sin despachos esta semana</h3>
              <p>Registra despachos para ver el CálCulo de ¡Nómina.</p>
            </div>
          </td>
        </tr>`;
    } else {
      data.items.forEach((item, idx) => {
        const sinTarifa   = !item.configurada;
        const rowId       = `nomina-row-${idx}`;
        const detailId    = `nomina-detail-${idx}`;
        const tieneDeuda  = item.tienePrestamos && item.prestamos.length > 0;
        const tienePagos  = item.pagos && item.pagos.length > 0;
        const estaPagada = item.estado === 'PAGADA';
        const esParcial   = item.estado === 'PARCIAL';

        // ── Fila principal ─────────────────────────────────────
        const trMain = document.createElement('tr');
        trMain.style.cursor = 'pointer';
        trMain.setAttribute('onclick', `NominaModule.toggleDetalle('${rowId}', '${detailId}')`);
        trMain.setAttribute('title', 'clic para ver viajes, préstamos y pagos');
        trMain.id = rowId;

        let badgeEstado = '';
        if (estaPagada) {
          badgeEstado = `<span class="badge badge-green badge-estado no-print" style="margin-left:6px; font-size:10px;">Pagada</span>`;
        } else if (esParcial) {
          badgeEstado = `<span class="badge badge-amber badge-estado no-print" style="margin-left:6px; font-size:10px;">Abonado: ${formatCOP(item.totalPagadoCop)}</span>`;
        } else if (!sinTarifa && item.totalCop > 0) {
          badgeEstado = `<span class="badge badge-red badge-estado no-print" style="margin-left:6px; font-size:10px;">Pendiente</span>`;
        }

        let estadoBadgeHTML = (estaPagada || (item.saldoPendienteCop <= 0 && item.totalCop > 0)) ? `<span class="badge-pagada-mini">PAGADA</span>` : '';
        let penalizadoBadgeHTML = item.tienePenalizacion ? `<span class="badge-penalizado-mini" title="Penalización por ceniza alta">-${formatCOP(item.penalizacionCop)}/Ton</span>` : '';
        let deudaBadgeHTML = tieneDeuda ? `<span class="badge badge-red" style="font-size:0.68rem; padding:1px 5px;" title="Préstamo pendiente">Préstamo</span>` : '';

        const minaColHTML = `
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="n-expand-icon" id="icon-${idx}" style="color: var(--t-low); font-size:10px; width:12px; display:inline-block; transition:.15s;">▶</span>
            <strong style="color: var(--t-high); font-size: 0.88rem;">${(item.mina || '').toUpperCase()}</strong>
            ${estadoBadgeHTML}
            ${penalizadoBadgeHTML}
            ${deudaBadgeHTML}
          </div>
        `;

        const viajesHTML = `<span style="font-weight: 700; color: var(--t-high);">${item.viajes} ${item.viajes === 1 ? 'viaje' : 'viajes'}</span>`;

        let tarifaHTML = '';
        if (sinTarifa) {
          tarifaHTML = `<span class="badge badge-default">No Conf.</span>`;
        } else if (item.tienePenalizacion) {
          tarifaHTML = `<span style="text-decoration: line-through; color: var(--t-low); font-size: 0.72rem; margin-right: 4px;">${formatCOP(item.tarifaBaseCop)}</span><strong style="color: var(--t-high);">${formatCOP(item.tarifaCop)}</strong>`;
        } else {
          tarifaHTML = `<strong style="color: var(--t-high);">${formatCOP(item.tarifaCop)}</strong>`;
        }

        const totalCarbonHTML = sinTarifa ? '<span class="text-mid">—</span>' : `<strong style="color: var(--t-high); font-size: 0.88rem;">${formatCOP(item.netoPagarCop != null ? item.netoPagarCop : item.totalCop)}</strong>`;

        const ajusteHTML = `<span style="color: ${item.ajusteManual > 0 ? '#4ade80' : (item.ajusteManual < 0 ? '#f87171' : 'var(--t-low)')}; font-weight: 700;">${item.ajusteManual && item.ajusteManual !== 0 ? (item.ajusteManual > 0 ? '+' : '') + formatCOP(item.ajusteManual) : '$ 0'}</span>`;

        const totalEntregarHTML = sinTarifa ? '<span class="text-mid">—</span>' : `
          <strong style="font-weight: 800; font-size: 0.92rem; color: #4ade80;">
            <span class="no-print">${estaPagada ? '<span style="font-size:11px; font-weight:700; color:var(--c-green);">$ 0 (Pagado)</span>' : formatCOP(item.saldoPendienteCop || item.totalFinalCop || item.totalCop)}</span>
            <span class="only-print">${formatCOP(item.totalFinalCop || item.totalCop)}</span>
          </strong>
        `;

        const recordatorioHTML = (item.notaRecordatorio && item.notaRecordatorio.trim() !== '')
          ? `<span style="background: #78350f; color: #fde68a; padding: 2px 6px; border-radius: 4px; font-size: 0.68rem; font-weight: 700; cursor: pointer; display: inline-block; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
                   onclick="event.stopPropagation(); abrirModalAjusteSimple(${item.nominaId || idx}, '${item.mina.replace(/'/g,"\\'")}', ${item.netoPagarCop || item.totalCop || 0}, ${item.ajusteManual || 0}, '${item.notaRecordatorio.replace(/'/g,"\\'")}')"
                   title="${item.notaRecordatorio}">
               📝 ${item.notaRecordatorio}
             </span>`
          : `<button type="button" class="btn btn-ghost btn-sm btn-accion-tabla-mini"
                     style="border: 1px solid var(--b-default); color: var(--t-medium); padding: 2px 6px;"
                     onclick="event.stopPropagation(); abrirModalAjusteSimple(${item.nominaId || idx}, '${item.mina.replace(/'/g,"\\'")}', ${item.netoPagarCop || item.totalCop || 0}, ${item.ajusteManual || 0}, '')">
               + Ajuste
             </button>`;

        trMain.innerHTML = `
          <td>${minaColHTML}</td>
          <td style="text-align: center;">${viajesHTML}</td>
          <td style="text-align: right; font-weight: 700; color: #38bdf8;">${Utils.formatNumber(item.toneladas)} Ton</td>
          <td style="text-align: right;">${tarifaHTML}</td>
          <td style="text-align: right;">${totalCarbonHTML}</td>
          <td style="text-align: right;">${ajusteHTML}</td>
          <td style="text-align: right;">${totalEntregarHTML}</td>
          <td style="text-align: center;">${recordatorioHTML}</td>
          <td class="no-print" style="text-align: center;">
            ${sinTarifa
              ? `<button class="btn btn-warn btn-sm btn-accion-tabla-mini"
                         onclick="event.stopPropagation(); NominaModule.asignarTarifaRapido('${item.mina.replace(/'/g,"\\'")}')">
                   Asignar tarifa
                 </button>`
              : (item.saldoPendienteCop > 0
                  ? `<div style="display:flex; gap:4px; flex-wrap:nowrap; justify-content:center;">
                       <button class="btn btn-primary btn-sm btn-accion-tabla-mini"
                               onclick="event.stopPropagation(); NominaModule.abrirModalPago(${idx})">
                         Pagar
                       </button>
                       <button class="btn btn-subtle btn-sm btn-accion-tabla-mini" onclick="event.stopPropagation(); NominaModule.imprimirRecibo(${idx})">Imprimir</button>
                       ${item.reciboUrl
                         ? `<button class="btn btn-subtle btn-sm btn-accion-tabla-mini" style="color:var(--c-blue); border-color:var(--c-blue);" onclick="event.stopPropagation(); Utils.mostrarPDF('${item.reciboUrl}', 'Recibo de Mina: ${item.mina}')" title="Ver recibo guardado">Ver Recibo</button>`
                         : `<button class="btn btn-subtle btn-sm btn-accion-tabla-mini" onclick="event.stopPropagation(); NominaModule.subirRecibo('mina', ${idx})" title="Adjunta foto del recibo firmado">Subir Recibo</button>`
                       }
                     </div>`
                  : `<div style="display:flex; gap:4px; flex-wrap:nowrap; justify-content:center; align-items:center;">
                       <span class="badge badge-green" style="padding:2px 6px; font-size:0.68rem;">${item.totalCop > 0 ? 'Pagada' : 'Pago en 0'}</span>
                       <button class="btn btn-subtle btn-sm btn-accion-tabla-mini" onclick="event.stopPropagation(); NominaModule.imprimirRecibo(${idx})">Imprimir</button>
                       ${item.reciboUrl
                         ? `<button class="btn btn-subtle btn-sm btn-accion-tabla-mini" style="color:var(--c-blue); border-color:var(--c-blue);" onclick="event.stopPropagation(); Utils.mostrarPDF('${item.reciboUrl}', 'Recibo de Mina: ${item.mina}')" title="Ver recibo guardado">Ver Recibo</button>`
                         : `<button class="btn btn-subtle btn-sm btn-accion-tabla-mini" onclick="event.stopPropagation(); NominaModule.subirRecibo('mina', ${idx})" title="Adjunta foto del recibo firmado">Subir Recibo</button>`
                       }
                     </div>`
                )
            }
          </td>
        `;
        tbody.appendChild(trMain);

        // ── Fila de detalle (colapsable) ───────────────────────
        const trDetail = document.createElement('tr');
        trDetail.id = detailId;
        trDetail.style.display = 'none';
        trDetail.style.background = 'var(--bg-input)';

        // Acumulados de viajes para la mina
        const viajesList = item.detalle || [];
        const totalViajesMina = viajesList.length;
        const totalTonMina = viajesList.reduce((sum, v) => sum + (parseFloat(v.peso) || 0), 0);
        const totalSubtotalMina = viajesList.reduce((sum, v) => sum + ((parseFloat(v.peso) || 0) * (item.tarifaCop || 0)), 0);

        // Tabla viajes
        const viajesRows = viajesList.map(v => `
          <tr>
            <td style="padding:6px 12px; color:var(--t-mid); font-size:11px;">${Utils.formatDate(v.fecha)}</td>
            <td style="padding:6px 12px; font-size:12px;">${v.chofer || '—'}</td>
            <td style="padding:6px 12px;">
              <span class="badge badge-blue">${v.placa || '—'}</span>
            </td>
            <td style="padding:6px 12px; text-align:right; font-weight:600; color:var(--c-green);">
              ${Utils.formatNumber(v.peso)} Ton
            </td>
            ${!sinTarifa ? `
            <td style="padding:6px 12px; text-align:right; color:var(--t-mid); font-size:11px;">
              ${formatCOP(v.peso * item.tarifaCop)}
            </td>` : '<td></td>'}
            <td style="padding:6px 12px; text-align:center;">
              ${v.ticketUrl
                ? `<button class="btn btn-ghost btn-sm" onclick="Utils.mostrarPDF('${v.ticketUrl}', 'Ticket Viaje #${v.id}')" style="padding:2px 6px; font-size:10px; color:var(--c-blue);">❖ Ver Ticket</button>`
                : `<span style="font-size:10px; color:var(--c-red); font-weight:600;">Falta Ticket</span>`
              }
            </td>
          </tr>
        `).join('');

        // Subtabla préstamos si existen
        let prestamosHtml = '';
        if (tieneDeuda) {
          const prestamosRows = item.prestamos.map(p => `
            <tr>
              <td style="padding:5px 12px; font-size:11px;">${Utils.formatDate(p.fecha)}</td>
              <td style="padding:5px 12px; font-size:11px;">${p.descripcion}</td>
              <td style="padding:5px 12px; font-size:11px;"><span class="badge badge-blue">${p.metodoPago}</span></td>
              <td style="padding:5px 12px; font-size:11px; text-align:right; font-weight:700; color:var(--c-red);">
                ${formatMonto(p.monto, p.moneda)}
              </td>
            </tr>
          `).join('');

          prestamosHtml = `
            <div style="margin-top:12px; padding-top:10px; border-top:1px dashed var(--b-default);">
              <div style="font-size:10px; font-weight:700; color:var(--c-red); text-transform:uppercase; letter-spacing:.08em; margin-bottom:6px;">
                Préstamos pendientes asociados a esta mina:
              </div>
              <table style="width:100%; border-collapse:collapse; font-size:12px; background:rgba(239, 68, 68, 0.05); border-radius:6px;">
                <thead>
                  <tr style="border-bottom:1px solid var(--b-subtle);">
                    <th style="padding:4px 12px; text-align:left; font-size:10px; color:var(--t-low);">Fecha</th>
                    <th style="padding:4px 12px; text-align:left; font-size:10px; color:var(--t-low);">Concepto</th>
                    <th style="padding:4px 12px; text-align:left; font-size:10px; color:var(--t-low);">Método</th>
                    <th style="padding:4px 12px; text-align:right; font-size:10px; color:var(--t-low);">Monto Deuda</th>
                  </tr>
                </thead>
                <tbody>${prestamosRows}</tbody>
              </table>
            </div>
          `;
        }

        // Subtabla pagos de nómina si existen
        let pagosHtml = '';
        const pagosList = item.pagos || [];
        const totalPagadoMina = pagosList.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0);

        if (tienePagos) {
          const pagosRows = pagosList.map(p => `
            <tr>
              <td style="padding:5px 12px; font-size:11px;">${Utils.formatDate(p.fecha)}</td>
              <td style="padding:5px 12px; font-size:11px;">${p.descripcion}</td>
              <td style="padding:5px 12px; font-size:11px;"><span class="badge badge-blue">${p.metodoPago}</span></td>
              <td style="padding:5px 12px; font-size:11px; text-align:right; font-weight:700; color:var(--c-green);">
                ${formatMonto(p.monto, p.moneda)}
              </td>
            </tr>
          `).join('');

          pagosHtml = `
            <div style="margin-top:12px; padding-top:10px; border-top:1px dashed var(--b-default);">
              <div style="font-size:10px; font-weight:700; color:#22c55e; text-transform:uppercase; letter-spacing:.08em; margin-bottom:6px;">
                PAGOS DE NÓMINA REGISTRADOS PARA ESTA SEMANA:
              </div>
              <table style="width:100%; border-collapse:collapse; font-size:12px; background:rgba(34, 197, 94, 0.05); border-radius:6px;">
                <thead>
                  <tr style="border-bottom:1px solid var(--b-subtle);">
                    <th style="padding:4px 12px; text-align:left; font-size:10px; color:var(--t-low);">Fecha</th>
                    <th style="padding:4px 12px; text-align:left; font-size:10px; color:var(--t-low);">Detalle</th>
                    <th style="padding:4px 12px; text-align:left; font-size:10px; color:var(--t-low);">Método</th>
                    <th style="padding:4px 12px; text-align:right; font-size:10px; color:var(--t-low);">Monto Pagado</th>
                  </tr>
                </thead>
                <tbody>${pagosRows}</tbody>
                <tfoot>
                  <tr class="fila-totales-detalle">
                    <td colspan="2" style="text-align: left; font-weight: 700; color: #94a3b8;">TOTAL ABONADO / PAGADO (${pagosList.length} registros):</td>
                    <td colspan="2" style="text-align: right; font-weight: 700; color: #22c55e; font-size: 1rem;">
                      $ ${totalPagadoMina.toLocaleString('es-CO')} COP
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          `;
        }

        const saldoConciliacion = Math.max(0, totalSubtotalMina - totalPagadoMina);
        const conciliacionHtml = `
          <div class="conciliacion-box">
            <div><span style="color: #94a3b8;">Liquidado:</span> <strong>$ ${totalSubtotalMina.toLocaleString('es-CO')} COP</strong></div>
            <div><span style="color: #94a3b8;">Pagado:</span> <strong style="color: #22c55e;">$ ${totalPagadoMina.toLocaleString('es-CO')} COP</strong></div>
            <div><span style="color: #94a3b8;">Saldo:</span> <strong style="color: ${saldoConciliacion === 0 ? '#22c55e' : '#f59e0b'};">$ ${saldoConciliacion.toLocaleString('es-CO')} COP ${saldoConciliacion === 0 ? '(Saldado)' : ''}</strong></div>
          </div>
        `;

        trDetail.innerHTML = `
          <td colspan="6" style="padding:0; border-bottom:1px solid var(--b-default);">
            <div style="padding:8px 16px 12px 32px;">
              <div style="font-size:10px; font-weight:700; color:var(--t-low);
                          text-transform:uppercase; letter-spacing:.08em;
                          margin-bottom:6px;">
                Detalle de viajes — semana
              </div>
              <table style="width:100%; border-collapse:collapse; font-size:12px;">
                <thead>
                  <tr style="border-bottom:1px solid var(--b-subtle);">
                    <th style="padding:5px 12px; text-align:left; font-size:10px; color:var(--t-low); font-weight:700; text-transform:uppercase; letter-spacing:.06em;">Fecha</th>
                    <th style="padding:5px 12px; text-align:left; font-size:10px; color:var(--t-low); font-weight:700; text-transform:uppercase; letter-spacing:.06em;">Chofer</th>
                    <th style="padding:5px 12px; text-align:left; font-size:10px; color:var(--t-low); font-weight:700; text-transform:uppercase; letter-spacing:.06em;">Placa</th>
                    <th style="padding:5px 12px; text-align:right; font-size:10px; color:var(--t-low); font-weight:700; text-transform:uppercase; letter-spacing:.06em;">Peso (Ton)</th>
                    <th style="padding:5px 12px; text-align:right; font-size:10px; color:var(--t-low); font-weight:700; text-transform:uppercase; letter-spacing:.06em;">Subtotal COP</th>
                    <th style="padding:5px 12px; text-align:center; font-size:10px; color:var(--t-low); font-weight:700; text-transform:uppercase; letter-spacing:.06em;">Ticket</th>
                  </tr>
                </thead>
                <tbody>${viajesRows}</tbody>
                <tfoot>
                  <tr class="fila-totales-detalle">
                    <td colspan="3" style="text-align: left; font-weight: 700; color: #94a3b8;">TOTAL VIAJES: ${totalViajesMina}</td>
                    <td style="text-align: right; font-weight: 700; color: #22c55e;">${totalTonMina.toFixed(2)} Ton</td>
                    <td style="text-align: right; font-weight: 700; color: #ffffff;">$ ${totalSubtotalMina.toLocaleString('es-CO')} COP</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
              ${prestamosHtml}
              ${pagosHtml}
              ${conciliacionHtml}
            </div>
          </td>
        `;
        tbody.appendChild(trDetail);
      });

      // ── FILA DE TOTAL GENERAL ──
      const trTotal = document.createElement('tr');
      trTotal.className = "tr-total-general";
      
      const pend = data.totalPendienteGeneralCop != null ? data.totalPendienteGeneralCop : data.totalGeneralCop;
      const totalPeso = data.items ? data.items.reduce((sum, item) => sum + (item.toneladas || 0), 0) : 0;
      const totalViajes = data.items ? data.items.reduce((sum, item) => sum + (item.viajes || 0), 0) : (data.totalDespachos || 0);
      
      trTotal.innerHTML = `
        <td class="fw-700" style="font-size:12px; padding:10px;">TOTAL GENERAL:</td>
        <td class="text-right fw-700" style="font-size:12px; padding:10px;">${totalViajes} viaje${totalViajes !== 1 ? 's' : ''}</td>
        <td class="text-right fw-700" style="font-size:12px; color:var(--c-gold); padding:10px;">${Utils.formatNumber(totalPeso)} Ton</td>
        <td class="text-right text-mid" style="font-size:11px; padding:10px;">—</td>
        <td class="text-right fw-800" style="font-size:13px; color:var(--c-green); padding:10px;">${formatCOP(pend)}</td>
        <td class="no-print"></td>
      `;
      tbody.appendChild(trTotal);
    }

    const resultado = document.getElementById('n-resultado');
    if (resultado) resultado.style.display = 'block';
  }

  // ----------------------------------------------------------
  // EXPANDIR / COLAPSAR DETALLE
  // ----------------------------------------------------------
  function toggleDetalle(rowId, detailId) {
    const detail = document.getElementById(detailId);
    const idx = rowId.replace('nomina-row-', '');
    const icon = document.getElementById(`icon-${idx}`);

    if (!detail) return;
    const isOpen = detail.style.display !== 'none';
    detail.style.display = isOpen ? 'none' : 'table-row';
    if (icon) icon.textContent = isOpen ? '▶' : '▼';
  }

  // ----------------------------------------------------------
  // GestIÓN DE MINAS
  // ----------------------------------------------------------
  async function cargarMinas() {
    try {
      state.minas = await Api.get('/minas');
      renderTablaMinas();
    } catch (e) {}
  }

  function renderTablaMinas() {
    const tbody = document.getElementById('n-tabla-minas');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (state.minas.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4">
            <div class="empty-state">
              <div class="empty-icon">—</div>
              <h3>Sin minas registradas</h3>
              <p>Se registran automátiCamente al guardar el primer despacho de cada mina.</p>
            </div>
          </td>
        </tr>`;
      return;
    }

    state.minas.forEach(m => {
      const sinTarifa = !m.tarifaCopPorTon || m.tarifaCopPorTon === 0;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${m.nombre}</strong></td>
        <td class="text-right fw-600">
          ${sinTarifa
            ? '<span class="badge badge-red">Sin Configurar</span>'
            : formatCOP(m.tarifaCopPorTon) + ' / Ton'
          }
        </td>
        <td>
          <span class="badge ${m.activa ? 'badge-green' : 'badge-red'}">
            ${m.activa ? 'Activa' : 'Inactiva'}
          </span>
        </td>
        <td class="no-print">
          <div class="td-actions">
            <button class="btn btn-warn btn-sm" onclick="NominaModule.editarMina(${m.id})">
              Editar tarifa
            </button>
            <button class="btn btn-danger btn-sm" onclick="NominaModule.eliminarMina(${m.id})" title="Desactivar (Mantiene historial)">
              Desactivar
            </button>
            ${(typeof Auth !== 'undefined' && Auth.isAdmin()) ? `
              <button class="btn btn-danger btn-sm" onclick="NominaModule.borrarMinaPermanente(${m.id})" title="Borrar Permanente" style="background-color: #7f1d1d;">
                Borrar
              </button>
            ` : ''}
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  async function guardarMina() {
    const nombre = document.getElementById('n-mina-nombre')?.value?.trim();
    const tarifa = parseFloat(document.getElementById('n-mina-tarifa')?.value);

    if (!nombre) { Toast.show('El nombre de la mina es obligatorio', 'warning'); return; }
    if (!tarifa || tarifa <= 0) { Toast.show('La tarifa debe ser mayor a cero', 'warning'); return; }

    const payload = { nombre, tarifaCopPorTon: tarifa, activa: true };

    try {
      if (state.editandoMinaId) {
        await Api.put(`/minas/${state.editandoMinaId}`, payload);
        Toast.show(`Tarifa de "${nombre}" actualizada Correctamente`, 'success');
      } else {
        await Api.post('/minas', payload);
        Toast.show(`Mina "${nombre}" registrada Correctamente`, 'success');
      }
      limpiarFormMina();
      cargarMinas();
    } catch (e) {}
  }

  function editarMina(id) {
    const m = state.minas.find(x => x.id === id);
    if (!m) return;

    state.editandoMinaId = id;
    const inputNombre = document.getElementById('n-mina-nombre');
    const inputTarifa = document.getElementById('n-mina-tarifa');
    const formTitle   = document.getElementById('n-form-mina-title');
    const btnCancelar = document.getElementById('n-btn-cancelar-mina');

    if (inputNombre) inputNombre.value = m.nombre;
    if (inputTarifa) inputTarifa.value = m.tarifaCopPorTon || '';
    if (formTitle)   formTitle.textContent = `Editando: ${m.nombre}`;
    if (btnCancelar) btnCancelar.style.display = 'inline-flex';

    document.getElementById('n-form-mina-title')
      ?.closest('.card')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function eliminarMina(id) {
    // Guard: id válido antes de llamar al backend
    if (!id || typeof id !== 'number') {
      Toast.show('ID de mina no válido. Recarga la página e intenta de nuevo.', 'error');
      return;
    }
    const ok = await Utils.confirm(
      '¿Desactivar esta mina? El historial de despachos se mantiene, pero no aparecerá en nuevos cálculos.'
    );
    if (!ok) return;
    try {
      const res = await Api.delete(`/minas/${id}`);
      Toast.show(res?.message || 'Mina desactivada correctamente.', 'success');
      cargarMinas();
    } catch (e) {
      // El mensaje del backend (ej. 400 con integridad referencial) ya fue
      // mostrado por Api.js, por lo que solo registramos en consola.
      console.error('[eliminarMina] Error:', e.message);
    }
  }

  async function borrarMinaPermanente(id) {
    // Guard: id válido antes de llamar al backend
    if (!id || typeof id !== 'number') {
      Toast.show('ID de mina no válido. Recarga la página e intenta de nuevo.', 'error');
      return;
    }
    const ok = await Utils.confirm(
      '¿Estás seguro? Esta acción borrará la mina físicamente de la base de datos. Úsala solo si fue creada por error.'
    );
    if (!ok) return;
    try {
      const res = await Api.delete(`/minas/${id}/permanente`);
      Toast.show(res?.message || 'Mina eliminada permanentemente.', 'success');
      cargarMinas();
    } catch (e) {
      // El mensaje de error (ej. "tiene registros asociados") ya fue
      // mostrado por Api.js a través del Toast de error.
      console.error('[borrarMinaPermanente] Error:', e.message);
    }
  }

  function asignarTarifaRapido(nombreMina) {
    activarTab('minas');
    setTimeout(async () => {
      if (state.minas.length === 0) {
        state.minas = await Api.get('/minas').catch(() => []);
        renderTablaMinas();
      }
      const minaExistente = state.minas.find(
        m => m.nombre.toLowerCase() === nombreMina.toLowerCase()
      );
      if (minaExistente) {
        editarMina(minaExistente.id);
      } else {
        const inputNombre = document.getElementById('n-mina-nombre');
        if (inputNombre) inputNombre.value = nombreMina;
      }
      document.getElementById('n-mina-tarifa')?.focus();
    }, 300);
  }

  function limpiarFormMina() {
    state.editandoMinaId = null;
    const els = ['n-mina-nombre', 'n-mina-tarifa'];
    els.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const formTitle   = document.getElementById('n-form-mina-title');
    const btnCancelar = document.getElementById('n-btn-cancelar-mina');
    if (formTitle)   formTitle.textContent = 'Nueva mina';
    if (btnCancelar) btnCancelar.style.display = 'none';
  }

  // ----------------------------------------------------------
  // FORMATO MONEDAS
  // ----------------------------------------------------------
  function formatCOP(amount) {
    return '$ ' + new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(amount || 0) + ' COP';
  }

  function formatMonto(amount, moneda = 'COP') {
    const num = amount || 0;
    if (moneda === 'USD') return '$ ' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num) + ' USD';
    if (moneda === 'VES') return 'Bs. ' + new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
    return formatCOP(num);
  }

  // ----------------------------------------------------------
  // NAVEGACIÓN POR SEMANAS
  // ----------------------------------------------------------
  function cambiarSemana(dir) {
    const input = document.getElementById('n-semana');
    if (!input) return;
    const actual = input.value ? new Date(input.value + 'T12:00:00') : new Date();
    actual.setDate(actual.getDate() + dir * 7);
    input.value = actual.toISOString().split('T')[0];
    calcular();
  }

  function irAEstaSemana() {
    const input = document.getElementById('n-semana');
    if (input) input.value = Utils.today();
    calcular();
  }
  const irAestaSemana = irAEstaSemana;

  /* ─────────────────────────────────────────────────────────────
     MODAL DE PAGO DE NÓMINA
  ───────────────────────────────────────────────────────────── */
  let itemPagoActual = null;

  function parseNumero(val) {
    if (val === null || val === undefined) return NaN;
    if (typeof val === 'number') return val;
    let str = String(val).trim();
    if (!str) return NaN;
    str = str.replace(/[$BsCOPUSDes\s]/gi, '');
    if (!str) return NaN;
    if (str.includes('.') && str.includes(',')) {
      if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
        str = str.replace(/\./g, '').replace(',', '.');
      } else {
        str = str.replace(/,/g, '');
      }
    } else if ((str.match(/\./g) || []).length > 1) {
      str = str.replace(/\./g, '');
    } else if ((str.match(/,/g) || []).length > 1) {
      str = str.replace(/,/g, '');
    } else if (str.includes(',')) {
      str = str.replace(',', '.');
    }
    return parseFloat(str);
  }

  function abrirModalPago(idx) {
    if (!state.dataSemana || !state.dataSemana.items || !state.dataSemana.items[idx]) return;
    const item = state.dataSemana.items[idx];
    itemPagoActual = item;

    document.getElementById('mp-mina').value = item.mina;
    document.getElementById('mp-fecha').value = Utils.today();
    document.getElementById('mp-moneda').value = 'COP';
    document.getElementById('mp-monto').value = item.saldoPendienteCop || item.netoPagarCop || 0;
    
    const hintEl = document.getElementById('mp-monto-hint');
    if (hintEl) {
      hintEl.textContent = `Saldo neto pendiente de la semana: ${formatCOP(item.saldoPendienteCop)}`;
    }

    // Préstamos asociados
    const prestCont = document.getElementById('mp-prestamos-container');
    const prestList = document.getElementById('mp-prestamos-list');
    if (prestCont && prestList) {
      if (item.tienePrestamos && item.prestamos.length > 0) {
        prestCont.style.display = 'block';
        prestList.innerHTML = item.prestamos.map(p => `
          <label style="display:flex; align-items:center; gap:8px; margin-bottom:4px; cursor:pointer;">
            <input type="checkbox" class="mp-prestamo-chk" value="${p.id}" checked>
            <span>${p.descripcion} — <strong>${formatMonto(p.monto, p.moneda)}</strong> (${Utils.formatDate(p.fecha)})</span>
          </label>
        `).join('');
      } else {
        prestCont.style.display = 'none';
        prestList.innerHTML = '';
      }
    }

    document.getElementById('mp-notas').value = '';
    const modal = document.getElementById('modal-pago-nomina');
    if (modal) modal.style.display = 'flex';
  }

  function cerrarModalPago() {
    itemPagoActual = null;
    const modal = document.getElementById('modal-pago-nomina');
    if (modal) modal.style.display = 'none';
  }

  async function confirmarPago() {
    if (!itemPagoActual || !state.dataSemana) return;

    const mina = document.getElementById('mp-mina').value;
    const fecha = document.getElementById('mp-fecha').value || Utils.today();
    const moneda = document.getElementById('mp-moneda').value;
    const metodoPago = document.getElementById('mp-metodo').value;
    const monto = parseNumero(document.getElementById('mp-monto').value);
    const notas = document.getElementById('mp-notas').value.trim();

    if (isNaN(monto) || monto <= 0) {
      Toast.show('Ingresa un monto válido a pagar mayor a cero', 'warning');
      return;
    }

    // Obtener IDs de préstamos marcados
    const prestamosIds = Array.from(document.querySelectorAll('.mp-prestamo-chk:checked'))
      .map(chk => chk.value);

    const payload = {
      mina,
      fecha,
      moneda,
      metodoPago,
      monto,
      semanaInicio: state.dataSemana.semanaInicio,
      semanaFin: state.dataSemana.semanaFin,
      notas,
      prestamosIds
    };

    const btnConfirmar = document.getElementById('mp-btn-confirmar');
    if (btnConfirmar) { btnConfirmar.textContent = 'Procesando...'; btnConfirmar.disabled = true; }

    try {
      let token = '';
      const raw = localStorage.getItem('tamanaco_auth_user');
      if (raw) { const user = JSON.parse(raw); if (user && user.token) token = user.token; }

      const res = await fetch('/api/tamanaco-comercial/nomina/pagar?tenantId=1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': '1'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || 'Error al registrar pago');
      
      Toast.show('Pago registrado y guardado en caja exitosamente', 'success');
      
      const idGasto = data?.gasto?.id || data?.gastoId || data?.id || null;
      window.ultimoGastoMap = window.ultimoGastoMap || {};
      if (idGasto) {
        window.ultimoGastoMap['mina_' + mina] = idGasto;
        if (itemPagoActual) itemPagoActual.ultimoGastoId = idGasto;
      }
      
      cerrarModalPago();
      await calcular(); // recargar nómina de la semana
    } catch (e) {
      console.error("Error al registrar pago de nómina:", e);
      Toast.show(e.message || "Error al registrar el pago", 'error');
    } finally {
      if (btnConfirmar) { btnConfirmar.textContent = 'Confirmar Pago y Registrar Gasto'; btnConfirmar.disabled = false; }
    }
  }

  async function pagarTodaLaNomina() {
    if (!state.dataSemana || !state.dataSemana.items || state.dataSemana.items.length === 0) {
      Toast.show('No hay ¡Nómina para pagar en esta semana', 'info');
      return;
    }
    const pendientes = state.dataSemana.items.filter(item => item.saldoPendienteCop > 0 && item.configurada);
    
    if (pendientes.length === 0) {
      Toast.show('Toda la nómina de esta semana ya está pagada o no está configurada', 'info');
      return;
    }
    
    const totalPagarMasivo = pendientes.reduce((sum, it) => sum + it.saldoPendienteCop, 0);
    const ok = await Utils.confirm(`¿Pagar automátiCamente a ${pendientes.length} minas/alianzas un total de ${formatCOP(totalPagarMasivo)}? Se descontaráán todos sus préstamos pendientes.`);
    if (!ok) return;
    
    const btn = document.querySelector('button[onclick="NominaModule.pagarTodaLaNomina()"]');
    if (btn) { btn.textContent = 'Procesando...'; btn.disabled = true; }
    
    try {
      const promesas = pendientes.map(item => {
        return Api.post('/nomina/pagar', {
          mina: item.mina,
          fecha: Utils.today(),
          moneda: 'COP',
          metodoPago: 'EFECTIVO',
          monto: item.saldoPendienteCop,
          semanaInicio: state.dataSemana.semanaInicio,
          semanaFin: state.dataSemana.semanaFin,
          notas: 'Pago automátiCo masivo',
          prestamosIds: item.prestamos ? item.prestamos.map(p => p.id) : []
        });
      });
      
      const resultados = await Promise.all(promesas);
      
      window.ultimoGastoMap = window.ultimoGastoMap || {};
      pendientes.forEach((item, index) => {
        const idGasto = resultados[index]?.id || resultados[index]?.gastoId || resultados[index]?.gasto?.id || null;
        if (idGasto) {
          window.ultimoGastoMap['mina_' + item.mina] = idGasto;
        }
      });
      
      Toast.show('¡Nómina completa pagada exitosamente!', 'success');
      calcular();
    } catch (e) {
      Toast.show('Hubo un error al procesar el pago masivo', 'error');
    } finally {
      if (btn) { btn.textContent = 'Pagar Todo'; btn.disabled = false; }
    }
  }

  // ----------------------------------------------------------
  // INIT
  // ----------------------------------------------------------
  function init() {
    const inputSemana = document.getElementById('n-semana');
    if (inputSemana) {
      if (!inputSemana.value) inputSemana.value = Utils.today();
      inputSemana.onchange = () => calcular();
    }
    calcular();
  }

  // ----------------------------------------------------------
  // EMPLEADOS - DIRECTORIO
  // ----------------------------------------------------------
  let empleados = [];

  async function cargarEmpleados() {
    try {
      empleados = await Api.get('/empleados');
      renderTablaEmpleados();
      renderTablaPagoEmpleados();
    } catch (e) {}
  }

  function renderTablaEmpleados() {
    const tbody = document.getElementById('n-tabla-empleados');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (empleados.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center">No hay empleados registrados.</td></tr>`;
      return;
    }

    empleados.forEach(emp => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${emp.nombre}</strong></td>
        <td>${emp.cedula || '—'}</td>
        <td>${emp.cargo || '—'}</td>
        <td class="text-right fw-600">${Utils.formatCurrency(emp.salarioBase, emp.moneda)}</td>
        <td>${emp.frecuenciaPago || '—'}</td>
        <td>
          <span class="badge ${emp.activo ? 'badge-green' : 'badge-red'}">
            ${emp.activo ? 'Activo' : 'Inactivo'}
          </span>
        </td>
        <td class="no-print">
          <div class="td-actions">
            <button class="btn btn-warn btn-sm" onclick="NominaModule.editarEmpleado(${emp.id})">Editar</button>
            ${(typeof Auth !== 'undefined' && Auth.isAdmin()) ? `<button class="btn btn-danger btn-sm" onclick="NominaModule.eliminarEmpleado(${emp.id})" title="Borrar empleado">Borrar</button>` : ''}
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  async function guardarEmpleado() {
    const id = document.getElementById('n-emp-id')?.value;
    const nombre = document.getElementById('n-emp-nombre')?.value?.trim();
    const cedula = document.getElementById('n-emp-cedula')?.value?.trim();
    const cargo = document.getElementById('n-emp-cargo')?.value?.trim();
    const salarioBase = parseFloat(document.getElementById('n-emp-salario')?.value);
    const moneda = document.getElementById('n-emp-moneda')?.value;
    const frecuenciaPago = document.getElementById('n-emp-frecuencia')?.value;
    const activo = document.getElementById('n-emp-activo')?.value === 'true';

    if (!nombre) { Toast.show('El nombre es obligatorio', 'warning'); return; }
    if (!salarioBase || salarioBase < 0) { Toast.show('El salario debe ser mayor o igual a cero', 'warning'); return; }

    const payload = { nombre, cedula, cargo, salarioBase, moneda, frecuenciaPago, activo };

    try {
      if (id) {
        await Api.put(`/empleados/${id}`, payload);
        Toast.show('Empleado actualizado', 'success');
      } else {
        await Api.post('/empleados', payload);
        Toast.show('Empleado registrado', 'success');
      }
      limpiarFormEmpleado();
      cargarEmpleados();
    } catch (e) {}
  }

  async function eliminarEmpleado(id) {
    const emp = empleados.find(x => x.id === id);
    if (!emp) return;

    const ok = await Utils.confirm(`¿estás seguro de que deseas eliminar al empleado ${emp.nombre}? esta aCCión no se puede deshacer.`);
    if (!ok) return;

    try {
      await Api.delete(`/empleados/${id}`);
      Toast.show('Empleado eliminado exitosamente', 'success');
      cargarEmpleados();
    } catch (e) {}
  }

  function editarEmpleado(id) {
    const emp = empleados.find(e => e.id === id);
    if (!emp) return;

    document.getElementById('n-emp-id').value = emp.id;
    document.getElementById('n-emp-nombre').value = emp.nombre || '';
    document.getElementById('n-emp-cedula').value = emp.cedula || '';
    document.getElementById('n-emp-cargo').value = emp.cargo || '';
    document.getElementById('n-emp-salario').value = emp.salarioBase || 0;
    document.getElementById('n-emp-moneda').value = emp.moneda || 'USD';
    document.getElementById('n-emp-frecuencia').value = emp.frecuenciaPago || 'SEMANAL';
    document.getElementById('n-emp-activo').value = emp.activo ? 'true' : 'false';

    document.getElementById('n-emp-form-title').textContent = `Editando: ${emp.nombre}`;
    document.getElementById('n-btn-cancelar-emp').style.display = 'inline-flex';
    document.getElementById('n-btn-guardar-emp').textContent = 'Actualizar Empleado';
  }

  function limpiarFormEmpleado() {
    document.getElementById('n-emp-id').value = '';
    ['nombre', 'cedula', 'cargo', 'salario'].forEach(k => {
      document.getElementById(`n-emp-${k}`).value = '';
    });
    document.getElementById('n-emp-moneda').value = 'USD';
    document.getElementById('n-emp-frecuencia').value = 'SEMANAL';
    document.getElementById('n-emp-activo').value = 'true';

    document.getElementById('n-emp-form-title').textContent = 'Registrar Nuevo Empleado';
    document.getElementById('n-btn-cancelar-emp').style.display = 'none';
    document.getElementById('n-btn-guardar-emp').textContent = 'Registrar Empleado';
  }

  // ----------------------------------------------------------
  // EMPLEADOS - ¡Nómina / PAGO
  // ----------------------------------------------------------
  function renderTablaPagoEmpleados() {
    const tbody = document.getElementById('n-tabla-empleados-pago');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const activos = empleados.filter(e => e.activo);
    if (activos.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center">No hay empleados activos para pagar.</td></tr>`;
      return;
    }

    activos.forEach(emp => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <strong>${emp.nombre}</strong>
          <div style="font-size:11px; color:var(--t-medium);">${emp.cargo || 'Sin cargo'}</div>
        </td>
        <td class="text-right fw-600">${Utils.formatCurrency(emp.salarioBase, emp.moneda)}</td>
        <td class="text-right">
          <input type="number" id="emp-bono-${emp.id}" class="form-input text-right" placeholder="0.00" value="0" min="0" onchange="NominaModule.calcularTotalEmpleado(${emp.id}, ${emp.salarioBase}, '${emp.moneda}', '${emp.frecuenciaPago}')">
        </td>
        <td class="text-right">
          <input type="number" id="emp-deduccion-${emp.id}" class="form-input text-right" placeholder="0.00" value="0" min="0" onchange="NominaModule.calcularTotalEmpleado(${emp.id}, ${emp.salarioBase}, '${emp.moneda}', '${emp.frecuenciaPago}')">
        </td>
        <td class="text-right fw-600 text-gold" id="emp-total-${emp.id}">
          ${Utils.formatCurrency(emp.frecuenciaPago === 'SEMANAL' ? (emp.salarioBase / 4) : emp.salarioBase, emp.moneda)}
        </td>
        <td class="no-print">
          <div style="display:flex; gap:5px; flex-wrap:nowrap; justify-content:flex-end;">
            <button class="btn btn-primary btn-sm" onclick="NominaModule.pagarEmpleado(${emp.id}, '${emp.moneda}')">Pagar</button>
            <button class="btn btn-subtle btn-sm" onclick="NominaModule.imprimirReciboEmpleado(${emp.id})">Imprimir</button>
            ${emp.reciboUrl 
              ? `<button class="btn btn-subtle btn-sm" style="color:var(--C-blue); border-color:var(--C-blue);" onclick="Utils.mostrarPDF('${emp.reciboUrl}', 'Recibo de ${emp.nombre}')" title="Ver recibo guardado">Ver Recibo</button>`
              : `<button class="btn btn-subtle btn-sm" onclick="NominaModule.subirRecibo('empleado', ${emp.id})" title="Adjunta foto del recibo firmado">Subir Recibo</button>`
            }
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function calcularTotalEmpleado(id, salarioBase, moneda, frecuencia = 'SEMANAL') {
    let baseCalc = salarioBase;
    if (frecuencia === 'SEMANAL') baseCalc = (salarioBase / 4);
    const bono = parseFloat(document.getElementById(`emp-bono-${id}`)?.value) || 0;
    const deduccion = parseFloat(document.getElementById(`emp-deduccion-${id}`)?.value) || 0;
    const total = baseCalc + bono - deduccion;
    document.getElementById(`emp-total-${id}`).textContent = Utils.formatCurrency(total, moneda);
  }

  async function pagarEmpleado(id, moneda) {
    const emp = empleados.find(e => e.id === id);
    if (!emp) return;

    let baseCalc = emp.salarioBase;
    if (emp.frecuenciaPago === 'SEMANAL') baseCalc = (emp.salarioBase / 4);
    const bono = parseFloat(document.getElementById(`emp-bono-${id}`)?.value) || 0;
    const deduccion = parseFloat(document.getElementById(`emp-deduccion-${id}`)?.value) || 0;
    const total = baseCalc + bono - deduccion;

    if (total < 0) {
      Toast.show('El total a pagar no puede ser negativo', 'warning');
      return;
    }

    const ok = await Utils.confirm(`Vas a registrar el pago de ¡Nómina de ${emp.nombre} por ${Utils.formatCurrency(total, moneda)}. este monto se descontaráá de la caja.\n\n¿¿¿Continuar?`);
    if (!ok) return;

    let concepto = `Pago ¡Nómina ${emp.frecuenciaPago.toLowerCase()}`;
    if (bono > 0) concepto += ` (Incluye bono: ${bono})`;
    if (deduccion > 0) concepto += ` (Descuentos: ${deduccion})`;

    try {
      const res = await Api.post(`/empleados/${id}/pagar`, {
        monto: total,
        fecha: Utils.today(),
        concepto: concepto,
        metodoPago: 'Efectivo'
      });
      Toast.show(`Pago registrado a ${emp.nombre}`, 'success');
      const idGasto = res?.id || res?.gastoId || res?.gasto?.id || null;
      window.ultimoGastoMap = window.ultimoGastoMap || {};
      if (idGasto) {
        window.ultimoGastoMap['emp_' + id] = idGasto;
        emp.ultimoGastoId = idGasto; // Guardar ID para upload
      }
      
      // Reiniciar inputs
      document.getElementById(`emp-bono-${id}`).value = 0;
      document.getElementById(`emp-deduccion-${id}`).value = 0;
      calcularTotalEmpleado(id, emp.salarioBase, emp.moneda, emp.frecuenciaPago);
    } catch (e) {}
  }

  async function pagarTodosEmpleados() {
    const activos = empleados.filter(e => e.activo);
    if (activos.length === 0) {
      Toast.show('No hay empleados activos para pagar', 'info');
      return;
    }

    let granTotalBs = 0;
    let granTotalUsd = 0;
    const listaPagos = [];

    // Recolectar datos y validar
    for (const emp of activos) {
      let baseCalc = emp.salarioBase;
      if (emp.frecuenciaPago === 'SEMANAL') baseCalc = (emp.salarioBase / 4);
      const bono = parseFloat(document.getElementById(`emp-bono-${emp.id}`)?.value) || 0;
      const deduccion = parseFloat(document.getElementById(`emp-deduccion-${emp.id}`)?.value) || 0;
      const total = baseCalc + bono - deduccion;

      if (total < 0) {
        Toast.show(`El total a pagar para ${emp.nombre} es negativo. Corrige los bonos/deducciones.`, 'error');
        return;
      }
      
      if (total > 0) {
        if (emp.moneda === 'VES') granTotalBs += total;
        if (emp.moneda === 'USD') granTotalUsd += total;
        
        let concepto = `Pago ¡Nómina ${emp.frecuenciaPago.toLowerCase()}`;
        if (bono > 0) concepto += ` (Incluye bono: ${bono})`;
        if (deduccion > 0) concepto += ` (Descuentos: ${deduccion})`;

        listaPagos.push({
          id: emp.id,
          monto: total,
          moneda: emp.moneda,
          concepto: concepto
        });
      }
    }

    if (listaPagos.length === 0) {
      Toast.show('Todos los empleados tienen un pago calculado de 0', 'info');
      return;
    }

    let mensajeDesc = `Vas a registrar el pago a ${listaPagos.length} empleados.\n\nTotal estimado:\n`;
    if (granTotalBs > 0) mensajeDesc += `- ${Utils.formatCurrency(granTotalBs, 'VES')}\n`;
    if (granTotalUsd > 0) mensajeDesc += `- ${Utils.formatCurrency(granTotalUsd, 'USD')}\n`;
    
    const ok = await Utils.confirm(mensajeDesc + '\n¿¿¿Continuar?');
    if (!ok) return;

    const btn = document.querySelector('button[onclick="NominaModule.pagarTodosEmpleados()"]');
    if (btn) { btn.textContent = 'Procesando...'; btn.disabled = true; }

    try {
      const promesas = listaPagos.map(p => {
        return Api.post(`/empleados/${p.id}/pagar`, {
          monto: p.monto,
          fecha: Utils.today(),
          concepto: p.concepto,
          metodoPago: 'Efectivo' // Default masivo
        });
      });

      const resultados = await Promise.all(promesas);
      Toast.show('¡Nómina de personal pagada exitosamente!', 'success');
      
      window.ultimoGastoMap = window.ultimoGastoMap || {};
      
      // Guardar localmente los IDs de gastos generados para poder adjuntar fotos
      listaPagos.forEach((p, index) => {
        const emp = empleados.find(e => e.id === p.id);
        if (emp && resultados[index] && resultados[index].id) {
          window.ultimoGastoMap['emp_' + p.id] = resultados[index].id;
          emp.ultimoGastoId = resultados[index].id;
        }
      });
      // Reiniciar inputs visuales
      activos.forEach(emp => {
        if (document.getElementById(`emp-bono-${emp.id}`)) document.getElementById(`emp-bono-${emp.id}`).value = 0;
        if (document.getElementById(`emp-deduccion-${emp.id}`)) document.getElementById(`emp-deduccion-${emp.id}`).value = 0;
        calcularTotalEmpleado(emp.id, emp.salarioBase, emp.moneda, emp.frecuenciaPago);
      });
    } catch (e) {
      Toast.show('Hubo un error procesando el pago masivo', 'error');
    } finally {
      if (btn) { btn.textContent = 'Pagar a Todos'; btn.disabled = false; }
    }
  }

  function imprimirReporteNomina() {
    if (!state.dataSemana || !state.dataSemana.items) return;

    // Formatear datos de la semana para la nueva función de liquidación
    const minasMapeadas = state.dataSemana.items.map(item => ({
        nombre: (item.mina || '').toUpperCase(),
        viajes: item.viajes || 0,
        toneladas: item.toneladas || 0,
        tarifa: item.tarifaCop || item.tarifaBaseCop || 0,
        total: item.totalCop || 0
    }));

    const periodoStr = document.querySelector('.n-semana-label')?.textContent || 'Período en curso';

    imprimirReporteLiquidacion({
        minas: minasMapeadas,
        periodo: periodoStr
    });
  }

  function imprimirReporteLiquidacion(datosReporte) {
    // 1. Extraer datos y totales asegurando los 5 campos
    const minas = datosReporte.minas || [];
    const periodo = datosReporte.periodo || 'Período en curso';
    const totalViajes = minas.reduce((acc, m) => acc + (parseInt(m.viajes) || 0), 0);
    const totalTon = minas.reduce((acc, m) => acc + (parseFloat(m.toneladas) || 0), 0);
    const totalPagar = minas.reduce((acc, m) => acc + (parseFloat(m.total || (m.toneladas * m.tarifa)) || 0), 0);

    const formatearCOP = (valor) => 'COP ' + Number(valor || 0).toLocaleString('es-CO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    const filasHtml = minas.map(m => `
        <tr>
            <td style="padding: 7px 8px; text-align: left; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${m.nombre.replace(/<[^>]*>?/gm, '')}</td>
            <td style="padding: 7px 8px; text-align: center; border-bottom: 1px solid #e2e8f0;">${m.viajes}</td>
            <td style="padding: 7px 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">${parseFloat(m.toneladas).toFixed(2)}</td>
            <td style="padding: 7px 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">${formatearCOP(m.tarifa)}</td>
            <td style="padding: 7px 8px; text-align: right; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${formatearCOP(m.total || (m.toneladas * m.tarifa))}</td>
        </tr>
    `).join('');

    const htmlContenido = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Reporte de Nómina - Carbones Tamanaco</title>
            <style>
                @page { size: portrait; margin: 15mm 12mm; }
                * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; background: #fff; }
                .watermark { position: fixed; top: 48%; left: 50%; transform: translate(-50%, -50%); opacity: 0.04; width: 320px; z-index: -1; pointer-events: none; }
                .reporte-container { width: 100%; max-width: 720px; margin: 0 auto; position: relative; }
                table { width: 100%; border-collapse: collapse; margin: 18px 0; table-layout: fixed; }
                th { background-color: #ffffff; color: #0f172a; padding: 8px; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; border-bottom: 2px solid #0f172a; text-transform: uppercase; }
                td { font-size: 11px; }
            </style>
        </head>
        <body>
            <img class="watermark" src="/img/logo.svg" alt="Watermark" />
            
            <div class="reporte-container">
                <div style="text-align: center; margin-bottom: 6px;">
                    <img src="/img/logo.svg" alt="Logo" style="height: 52px; width: auto; display: block; margin: 0 auto 10px auto;" />
                    <h2 style="margin: 0; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Reporte Oficial de Liquidación de Nómina</h2>
                    <p style="margin: 4px 0 0 0; font-size: 10.5px; color: #64748b;">Período: ${periodo}</p>
                </div>

                <table>
                    <colgroup>
                        <col style="width: 25%;">
                        <col style="width: 12%;">
                        <col style="width: 17%;">
                        <col style="width: 23%;">
                        <col style="width: 23%;">
                    </colgroup>
                    <thead>
                        <tr>
                            <th style="text-align: left;">MINA</th>
                            <th style="text-align: center;">VIAJES</th>
                            <th style="text-align: right;">TONELADAS</th>
                            <th style="text-align: right;">TARIFA COP/TON</th>
                            <th style="text-align: right;">TOTAL A PAGAR</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filasHtml}
                    </tbody>
                    <tfoot>
                        <tr style="background-color: #f8fafc; font-weight: 700; border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a;">
                            <td style="padding: 9px 8px; text-align: left;">TOTAL GENERAL:</td>
                            <td style="padding: 9px 8px; text-align: center;">${totalViajes} vjs</td>
                            <td style="padding: 9px 8px; text-align: right;">${totalTon.toFixed(2)} Ton</td>
                            <td style="padding: 9px 8px; text-align: right;">—</td>
                            <td style="padding: 9px 8px; text-align: right; font-weight: 800;">${formatearCOP(totalPagar)}</td>
                        </tr>
                    </tfoot>
                </table>

                <div style="display: flex; justify-content: space-between; margin-top: 50px; text-align: center;">
                    <div style="width: 28%;"><div style="border-top: 1px solid #334155; margin-bottom: 4px;"></div><span style="font-size: 9px; font-weight: 700; color: #334155;">ELABORADO POR</span></div>
                    <div style="width: 28%;"><div style="border-top: 1px solid #334155; margin-bottom: 4px;"></div><span style="font-size: 9px; font-weight: 700; color: #334155;">REVISADO POR</span></div>
                    <div style="width: 28%;"><div style="border-top: 1px solid #334155; margin-bottom: 4px;"></div><span style="font-size: 9px; font-weight: 700; color: #334155;">APROBADO POR</span></div>
                </div>

                <div style="display: flex; justify-content: space-between; margin-top: 30px; font-size: 8.5px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 5px;">
                    <span>Carbones Tamanaco ERP</span>
                    <span>Fecha de emisión: ${new Date().toLocaleDateString('es-CO')} | Control Oficial</span>
                </div>
            </div>
        </body>
        </html>
    `;

    ejecutarImpresionSilenciosa(htmlContenido);
  }

  function ejecutarImpresionSilenciosa(htmlContenido) {
    // 1. Reutilizar o crear iframe oculto
    let printFrame = document.getElementById('iframe-impresion-erp');
    if (printFrame) {
        printFrame.remove();
    }

    printFrame = document.createElement('iframe');
    printFrame.id = 'iframe-impresion-erp';
    printFrame.style.position = 'fixed';
    printFrame.style.top = '-9999px';
    printFrame.style.left = '-9999px';
    printFrame.style.width = '0px';
    printFrame.style.height = '0px';
    printFrame.style.border = 'none';
    document.body.appendChild(printFrame);

    // 2. Escribir el documento en el iframe
    const doc = printFrame.contentWindow.document;
    doc.open();
    doc.write(htmlContenido);
    doc.close();

    // 3. Disparar impresión directamente sobre la pestaña actual
    printFrame.onload = () => {
        setTimeout(() => {
            try {
                printFrame.contentWindow.focus();
                printFrame.contentWindow.print();
            } catch (e) {
                console.error("Error al imprimir:", e);
            }
        }, 200);
    };
  }

  function imprimirRecibo(idx) {
    if (!state.dataSemana || !state.dataSemana.items || !state.dataSemana.items[idx]) return;
    const item = state.dataSemana.items[idx];

    // Rango de semana
    let textoSemana = 'Semana en curso';
    const fechaInput = document.getElementById('n-semana')?.value;
    if (fechaInput) {
      const d1 = new Date(fechaInput + 'T12:00:00');
      const day = d1.getDay() || 7;
      const start = new Date(d1);
      start.setDate(d1.getDate() - day + 1);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      textoSemana = `${start.toLocaleDateString('es-CO')} al ${end.toLocaleDateString('es-CO')}`;
    }

    const mina = (item.mina || '').toUpperCase();
    const toneladas = parseFloat(item.toneladas || 0);
    const tarifaAplicada = item.tarifaCop || item.tarifaBaseCop || 0;
    const montoTotal = item.totalFinalCop != null ? item.totalFinalCop : (item.netoPagarCop || 0);
    const ajusteManual = item.ajusteManual || 0;

    document.getElementById('r-mina').textContent      = mina;
    document.getElementById('r-fecha').textContent     = new Date().toLocaleDateString('es-CO');
    document.getElementById('r-semana').textContent    = textoSemana;
    document.getElementById('r-toneladas').textContent = Utils.formatNumber(toneladas, 2);

    let msj = `Se hace constar el pago a <strong>${mina}</strong>, portador de la C.I./RUT ________________, ` +
              `por concepto de liquidaci&oacute;n de <strong>${Utils.formatNumber(toneladas, 2)} TM</strong> ` +
              `de carb&oacute;n despachadas para Carbones Tamanaco.<br><br>` +
              `El pago corresponde a la tarifa pactada de ${Utils.formatNumber(tarifaAplicada, 0)} COP por tonelada, ` +
              `totalizando un saldo neto liquidado tras deducciones correspondientes a la semana del ${textoSemana}.`;
    if (ajusteManual !== 0) {
      msj += ` Se aplic&oacute; un ajuste manual de ${Utils.formatCurrency(ajusteManual, 'COP')}.`;
    }

    document.getElementById('r-mensaje').innerHTML = msj;
    document.getElementById('r-monto-total').textContent = Utils.formatCurrency(montoTotal, 'COP');

    // Preparar contenido para el modal (mismo patrón que el recibo de personal)
    const reciboDiv = document.getElementById('recibo-impresion');
    let contenidoHTML = reciboDiv.innerHTML;
    contenidoHTML = contenidoHTML.replace(/<img[^>]*alt="Carbones Tamanaco"[^>]*>/g, '');

    const modalBody = document.getElementById('modalReciboBody');
    modalBody.innerHTML = `
      <div style="text-align: center; margin-bottom: 12px; background: transparent;">
          <img src="/img/logo.svg" alt="Carbones Tamanaco" style="height: 60px; width: auto; display: block; margin: 0 auto; background: transparent !important; border: none;" />
      </div>
      <div>
        ${contenidoHTML}
      </div>
    `;

    const modal = document.getElementById('modalRecibo');
    if (modal) modal.style.display = 'flex';
  }

  function imprimirReciboEmpleado(id) {
    if (!empleados || empleados.length === 0) return;
    const emp = empleados.find(e => e.id === id);
    if (!emp) return;

    let baseCalc = emp.salarioBase;
    if (emp.frecuenciaPago === 'SEMANAL') baseCalc = (emp.salarioBase / 4);
    const bono      = parseFloat(document.getElementById(`emp-bono-${emp.id}`)?.value) || 0;
    const deduccion = parseFloat(document.getElementById(`emp-deduccion-${emp.id}`)?.value) || 0;
    const total     = baseCalc + bono - deduccion;

    document.getElementById('re-empleado').textContent = emp.nombre;
    document.getElementById('re-cargo').textContent    = emp.cargo || 'Sin cargo';
    document.getElementById('re-fecha').textContent    = new Date().toLocaleDateString();
    document.getElementById('re-semana').textContent   = 'Semana actual / Mes actual';

    let msj = `Se hace constar el pago a <b>${emp.nombre}</b>, portador de la C.I. ______________, ` +
              `por concepto de prestación de servicios como <b>${emp.cargo || 'trabajador'}</b> ` +
              `para Carbones Tamanaco.<br><br>`;
    msj += `El pago corresponde a un salario mensual pactado de ` +
           `${Utils.formatCurrency(emp.salarioBase, emp.moneda)} y una liquidación de pago ` +
           `${emp.frecuenciaPago.toLowerCase()} por ${Utils.formatCurrency(baseCalc, emp.moneda)}.`;
    if (bono      > 0) msj += ` Se incluye una bonificación de ${Utils.formatCurrency(bono, emp.moneda)}.`;
    if (deduccion > 0) msj += ` Se aplicó una deducción por ${Utils.formatCurrency(deduccion, emp.moneda)}.`;

    document.getElementById('re-mensaje').innerHTML    = msj;
    document.getElementById('re-monto-total').textContent = Utils.formatCurrency(total, emp.moneda);

    // Preparar contenido para el modal
    const reciboDiv = document.getElementById('recibo-empleado-impresion');
    let contenidoHTML = reciboDiv.innerHTML;
    
    // Ocultar logos antiguos (por si quedan del html base)
    contenidoHTML = contenidoHTML.replace(/<img[^>]*alt="Carbones Tamanaco"[^>]*>/g, '');

    const modalBody = document.getElementById('modalReciboBody');
    modalBody.innerHTML = `
      <div style="text-align: center; margin-bottom: 12px; background: transparent;">
          <img src="/img/logo.svg" alt="Carbones Tamanaco" style="height: 60px; width: auto; display: block; margin: 0 auto; background: transparent !important; border: none;" />
      </div>
      <div>
        ${contenidoHTML}
      </div>
    `;

    document.getElementById('modalRecibo').style.display = 'flex';
  }

  function imprimirDesdeModal() {
      // Usar la misma función requerida por el usuario
      const modalContent = document.getElementById('modalReciboBody').innerHTML;
      
      const htmlImpresion = `
          <!DOCTYPE html>
          <html lang="es">
          <head>
              <meta charset="UTF-8">
              <title>Recibo de Pago</title>
              <style>
                  @page { size: letter portrait; margin: 15mm 12mm; }
                  * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                  body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; background: #fff; }
                  .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.04; width: 300px; z-index: -1; pointer-events: none; }
                  .editable-field { outline: none !important; background: transparent !important; }
              </style>
          </head>
          <body>
              <img class="watermark" src="/img/logo.svg" alt="Watermark" />
              <div style="width: 100%; max-width: 680px; margin: 0 auto;">
                  ${modalContent}
              </div>
          </body>
          </html>
      `;
      ejecutarImpresionSilenciosa(htmlImpresion);
  }

  function subirRecibo(tipo, idOrIdx) {
    window.ultimoGastoMap = window.ultimoGastoMap || {};
    let gastoId;
    if (tipo === 'mina') {
      const item = state.dataSemana.items[idOrIdx];
      if (!item) return;
      gastoId = item.ultimoGastoId || window.ultimoGastoMap['mina_' + item.mina];
      if (!gastoId) {
        Toast.show('Debes Pagar la ¡Nómina antes de poder adjuntar la foto del recibo', 'warning');
        return;
      }
    } else {
      const emp = empleados.find(e => e.id === idOrIdx);
      if (!emp) return;
      gastoId = emp.ultimoGastoId || window.ultimoGastoMap['emp_' + emp.id];
      if (!gastoId) {
        Toast.show('Debes Pagar al empleado antes de poder adjuntar la foto del recibo', 'warning');
        return;
      }
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf';
    input.style.display = 'none';
    document.body.appendChild(input);

    input.onchange = async (e) => {
      document.body.removeChild(input);
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);
      Toast.show('Subiendo recibo...', 'info');
      
      try {
        let token = '';
        const raw = localStorage.getItem('tamanaco_auth_user');
        if (raw) {
          const user = JSON.parse(raw);
          if (user && user.token) token = user.token;
        }

        const res = await fetch(`/api/tamanaco-comercial/gastos/${gastoId}/upload-recibo`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        
        if (!res.ok) throw new Error('Error subiendo recibo firmado');
        Toast.show('¡Foto del recibo guardada exitosamente!', 'success');
        if (tipo === 'mina') {
          calcular();
        } else {
          cargarEmpleados();
        }
      } catch (err) {
        Toast.show(err.message, 'error');
      }
    };
    
    // Fallback cleanup if user cancels the dialog (focus returns to window)
    window.addEventListener('focus', function onFocus() {
      setTimeout(() => {
        if (input.parentNode) input.parentNode.removeChild(input);
      }, 1000);
      window.removeEventListener('focus', onFocus);
    }, { once: true });

    input.click();
  }

  // ----------------------------------------------------------
  // CONTROL DE CIERRE Y PAGO DE PERÍODO
  // ----------------------------------------------------------
  async function verificarEstadoCierre(semana) {
    try {
      const res = await Api.get(`/nomina/cierre-estado?fecha=${semana}`);
      state.cierreActual = res;
      renderEstadoCierre(res);
    } catch (e) {
      renderEstadoCierre(null);
    }
  }

  function renderEstadoCierre(cierre) {
    const btnMarcar = document.getElementById('n-btn-marcar-pagada');
    const badgePagada = document.getElementById('n-badge-pagada');
    const btnVerComp = document.getElementById('n-btn-ver-comprobante');
    const btnReabrir = document.getElementById('n-btn-reabrir-semana');

    const estaCerrada = cierre && cierre.pagado;

    if (estaCerrada) {
      if (btnMarcar) btnMarcar.style.display = 'none';
      if (badgePagada) badgePagada.style.display = 'inline-flex';

      if (btnVerComp) {
        if (cierre.comprobanteUrl) {
          btnVerComp.href = cierre.comprobanteUrl;
          btnVerComp.style.display = 'inline-flex';
        } else {
          btnVerComp.style.display = 'none';
        }
      }

      if (btnReabrir) {
        const esAdmin = (typeof Auth !== 'undefined') && (Auth.isCEO() || Auth.isAdmin());
        btnReabrir.style.display = esAdmin ? 'inline-flex' : 'none';
      }
    } else {
      if (btnMarcar) btnMarcar.style.display = 'inline-flex';
      if (badgePagada) badgePagada.style.display = 'none';
      if (btnVerComp) btnVerComp.style.display = 'none';
      if (btnReabrir) btnReabrir.style.display = 'none';
    }
  }

  function abrirModalPagoSemana() {
    const modal = document.getElementById('modal-pago-semana-nomina');
    if (modal) modal.style.display = 'flex';
  }

  function cerrarModalPagoSemana() {
    const modal = document.getElementById('modal-pago-semana-nomina');
    if (modal) modal.style.display = 'none';
  }

  async function confirmarPagoSemana() {
    const fileInput = document.getElementById('n-input-comprobante');
    const notasInput = document.getElementById('n-input-notas-pago');
    const semanaInput = document.getElementById('n-semana');
    const fecha = semanaInput ? semanaInput.value : Utils.today();

    const formData = new FormData();
    formData.append('fecha', fecha);
    if (notasInput && notasInput.value) formData.append('notas', notasInput.value.trim());
    
    let usuarioActual = 'Admin';
    try {
      const raw = localStorage.getItem('tamanaco_auth_user');
      if (raw) {
        const u = JSON.parse(raw);
        if (u && (u.nombre || u.email)) usuarioActual = u.nombre || u.email;
      }
    } catch (e) {}
    formData.append('usuario', usuarioActual);

    if (fileInput && fileInput.files && fileInput.files[0]) {
      formData.append('archivo', fileInput.files[0]);
    }

    try {
      const token = (() => {
        try {
          const raw = localStorage.getItem('tamanaco_auth_user');
          return raw ? JSON.parse(raw)?.token : '';
        } catch (e) { return ''; }
      })();

      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/tamanaco-comercial/nomina/cerrar-semana?tenantId=1', {
        method: 'POST',
        headers: headers,
        body: formData
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al cerrar la semana');
      }

      Toast.show('¡Semana pagada y período cerrado exitosamente!', 'success');
      cerrarModalPagoSemana();
      calcular();
    } catch (err) {
      Toast.show(err.message || 'Error al confirmar pago', 'error');
    }
  }

  async function reabrirSemana() {
    const ok = await Utils.confirm('¿Está seguro de que desea reabrir este período cerrado? Solo el Administrador puede realizar esta acción.');
    if (!ok) return;

    const semanaInput = document.getElementById('n-semana');
    const fecha = semanaInput ? semanaInput.value : Utils.today();

    try {
      let usuarioActual = 'Admin';
      try {
        const raw = localStorage.getItem('tamanaco_auth_user');
        if (raw) {
          const u = JSON.parse(raw);
          if (u && (u.nombre || u.email)) usuarioActual = u.nombre || u.email;
        }
      } catch (e) {}

      const params = new URLSearchParams();
      params.append('fecha', fecha);
      params.append('usuario', usuarioActual);

      const token = (() => {
        try {
          const raw = localStorage.getItem('tamanaco_auth_user');
          return raw ? JSON.parse(raw)?.token : '';
        } catch (e) { return ''; }
      })();

      const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/v1/nomina/reabrir-semana', {
        method: 'POST',
        headers: headers,
        body: params
      });

      if (!res.ok) throw new Error('Error al reabrir la semana');

      Toast.show('Período reabierto correctamente', 'success');
      calcular();
    } catch (err) {
      Toast.show(err.message || 'Error al reabrir período', 'error');
    }
  }

  return {
    init, calcular, activarTab,
    guardarMina, editarMina, eliminarMina, borrarMinaPermanente,
    asignarTarifaRapido, limpiarFormMina,
    toggleDetalle, cambiarSemana, irAEstaSemana, irAestaSemana,
    abrirModalPago, cerrarModalPago, confirmarPago, pagarTodaLaNomina, imprimirRecibo, subirRecibo,
    abrirModalPagoSemana, cerrarModalPagoSemana, confirmarPagoSemana, reabrirSemana,
    guardarEmpleado, editarEmpleado, limpiarFormEmpleado,
    calcularTotalEmpleado, pagarEmpleado, pagarTodosEmpleados, imprimirReciboEmpleado,
    eliminarEmpleado, imprimirDesdeModal, imprimirReporteNomina,
    abrirModalExcelNomina: () => window.abrirModalExcelNomina(),
    cerrarModalExcelNomina: () => window.cerrarModalExcelNomina(),
    descargarExcelNominaConfirmado: () => window.descargarExcelNominaConfirmado(),
    getState: () => state
  };

})();

// ============================================================
// FUNCIONES GLOBALES DIRECTAS — MODAL EXCEL NÓMINA
// ============================================================

window.abrirModalExcelNomina = function() {
    const modal = document.getElementById('modal-excel-preview-nomina');
    if (!modal) return;

    // Rango de la semana visible
    const labelSemana = document.querySelector('.n-semana-label')?.textContent ||
                        document.getElementById('n-label-semana-card')?.textContent ||
                        "Semana actual";
    const rangoElem = document.getElementById('excel-modal-nomina-rango');
    if (rangoElem) rangoElem.textContent = labelSemana;

    const tbody = document.getElementById('excel-modal-nomina-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const items = (typeof NominaModule !== 'undefined' && NominaModule.getState && NominaModule.getState()?.dataSemana?.items)
        || window.datosNominaActual
        || [];

    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:20px;">Sin despachos registrados en esta semana.</td></tr>`;
        
        const totalVjsEl = document.getElementById('excel-modal-nomina-total-vjs');
        const totalTonEl = document.getElementById('excel-modal-nomina-total-ton');
        const totalPagarEl = document.getElementById('excel-modal-nomina-total-pagar');
        if (totalVjsEl) totalVjsEl.textContent = '0';
        if (totalTonEl) totalTonEl.textContent = '0.00';
        if (totalPagarEl) totalPagarEl.textContent = '$ 0 COP';
    } else {
        let granTotalViajes = 0;
        let granTotalTon = 0;
        let granTotalCop = 0;

        items.forEach(mina => {
            const viajes = parseInt(mina.viajes || 0);
            const ton = parseFloat(mina.toneladas || 0);
            const tarifa = parseFloat(mina.tarifaCop != null ? mina.tarifaCop : (mina.tarifaBaseCop || 0));
            const totalLiquidado = (mina.totalCop != null && mina.totalCop > 0) ? mina.totalCop : (ton * tarifa);

            granTotalViajes += viajes;
            granTotalTon += ton;
            granTotalCop += totalLiquidado;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${(mina.mina || mina.nombre || '—').toUpperCase()}</strong></td>
                <td style="text-align: center;">${viajes}</td>
                <td style="text-align: right;">${ton.toFixed(2)}</td>
                <td style="text-align: right;">$ ${tarifa.toLocaleString('es-CO')}</td>
                <td style="text-align: right; font-weight: 700;">$ ${totalLiquidado.toLocaleString('es-CO')} COP</td>
            `;
            tbody.appendChild(tr);
        });

        // Totales en el modal footer / tfoot
        const totalVjsEl = document.getElementById('excel-modal-nomina-total-vjs');
        const totalTonEl = document.getElementById('excel-modal-nomina-total-ton');
        const totalPagarEl = document.getElementById('excel-modal-nomina-total-pagar');

        if (totalVjsEl) totalVjsEl.textContent = granTotalViajes.toString();
        if (totalTonEl) totalTonEl.textContent = granTotalTon.toFixed(2);
        if (totalPagarEl) totalPagarEl.textContent = `$ ${granTotalCop.toLocaleString('es-CO')} COP`;
    }

    modal.style.setProperty('display', 'flex', 'important');
};

window.cerrarModalExcelNomina = function() {
    const modal = document.getElementById('modal-excel-preview-nomina');
    if (modal) modal.style.setProperty('display', 'none', 'important');
};

window.descargarExcelNominaConfirmado = function() {
    const inputSemana = document.getElementById('n-semana') || document.querySelector('input[type="date"]');
    const fecha = inputSemana ? inputSemana.value : '';
    if (typeof Toast !== 'undefined') Toast.show('Descargando liquidación de nómina en Excel (.xlsx)...', 'info');
    window.location.href = `/api/v1/nomina/exportar/excel?fecha=${encodeURIComponent(fecha)}`;
    window.cerrarModalExcelNomina();
};

// ============================================================
// FUNCIONES GLOBALES DIRECTAS — AJUSTE SIMPLE Y RECORDATORIO
// ============================================================

let nominaEditandoAjuste = null;

window.abrirModalAjusteSimple = function(idNomina, mina, baseMonto, ajusteActual = 0, notaActual = '') {
    nominaEditandoAjuste = { id: idNomina, baseMonto: parseFloat(baseMonto) || 0 };

    const elId = document.getElementById('ajuste-nomina-id');
    const elMina = document.getElementById('ajuste-mina-nombre');
    const elMontoBase = document.getElementById('ajuste-monto-base');
    const elInputAjuste = document.getElementById('input-ajuste-monto');
    const elInputNota = document.getElementById('input-ajuste-nota');

    if (elId) elId.value = idNomina;
    if (elMina) elMina.innerText = mina;
    if (elMontoBase) elMontoBase.innerText = '$ ' + Math.round(baseMonto).toLocaleString('es-CO');
    
    if (elInputAjuste) elInputAjuste.value = (ajusteActual && ajusteActual !== 0) ? ajusteActual : '';
    if (elInputNota) elInputNota.value = (notaActual && notaActual !== 'null') ? notaActual : '';

    window.recalcularTotalModalAjuste();

    const modal = document.getElementById('modal-ajuste-simple');
    if (modal) modal.style.display = 'flex';
};

window.cerrarModalAjusteSimple = function() {
    const modal = document.getElementById('modal-ajuste-simple');
    if (modal) modal.style.display = 'none';
};

window.recalcularTotalModalAjuste = function() {
    if (!nominaEditandoAjuste) return;
    const base = nominaEditandoAjuste.baseMonto || 0;
    const elInput = document.getElementById('input-ajuste-monto');
    const ajuste = elInput ? (parseFloat(elInput.value) || 0) : 0;
    const total = base + ajuste;

    const elTotal = document.getElementById('ajuste-total-calculado');
    if (elTotal) {
        elTotal.innerText = '$ ' + Math.round(total).toLocaleString('es-CO');
        elTotal.style.color = total >= 0 ? '#22c55e' : '#ef4444';
    }
};

window.guardarAjusteSimple = async function(e) {
    if (e) e.preventDefault();
    if (!nominaEditandoAjuste) return;

    const id = nominaEditandoAjuste.id;
    const elInput = document.getElementById('input-ajuste-monto');
    const elNota = document.getElementById('input-ajuste-nota');
    const ajuste = elInput ? (parseFloat(elInput.value) || 0) : 0;
    const nota = elNota ? elNota.value.trim() : '';

    try {
        const res = await fetch(`/api/v1/nomina/${id}/ajuste`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ajuste: ajuste, nota: nota })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "Error al guardar ajuste");
        }

        window.cerrarModalAjusteSimple();
        if (typeof Toast !== 'undefined' && Toast.show) {
            Toast.show("Ajuste y recordatorio guardados.", "success");
        } else if (typeof mostrarToast === 'function') {
            mostrarToast("Ajuste y recordatorio guardados.", "success");
        }

        // Recargar tabla de nómina
        if (typeof NominaModule !== 'undefined' && NominaModule.calcular) {
            await NominaModule.calcular();
        } else if (typeof cargarTablaNomina === 'function') {
            await cargarTablaNomina();
        }

    } catch (err) {
        console.error(err);
        alert(err.message || "Error al guardar ajuste.");
    }
};

window.cargarTablaNomina = function() {
    if (typeof NominaModule !== 'undefined' && NominaModule.calcular) {
        return NominaModule.calcular();
    }
};


