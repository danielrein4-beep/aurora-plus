const LaboratorioModule = (function() {
  let state = {
    analisis: [],
    minas: new Set(),
    fechaSeleccionada: null,
    modoFiltro: 'SEMANA', // 'SEMANA', 'TODAS', o nombre de la mina
    iniciado: false,
    editandoId: null
  };

  function getAuthToken() {
    try {
      const raw = localStorage.getItem('tamanaco_auth_user');
      if (raw) {
        const user = JSON.parse(raw);
        return user?.token || '';
      }
    } catch (e) {}
    return '';
  }

  // Función auxiliar para parsear números con coma o punto de forma segura
  window.parsearDecimalSeguro = function(val) {
    if (val === null || val === undefined || val === '') return 0.0;
    const normalizado = val.toString().replace(',', '.').trim();
    const num = parseFloat(normalizado);
    return isNaN(num) ? 0.0 : num;
  };

  const parseDecimal = (val) => {
    if (val === null || val === undefined || val === '') return null;
    const normalizado = val.toString().replace(',', '.').trim();
    const num = parseFloat(normalizado);
    return isNaN(num) ? null : num;
  };

  window.normalizarDecimalInput = function(input) {
    if (!input) return;
    let val = input.value.replace(',', '.');
    val = val.replace(/[^0-9.]/g, '');
    const partes = val.split('.');
    if (partes.length > 2) {
        val = partes[0] + '.' + partes.slice(1).join('');
    }
    input.value = val;
  };

  function getRangoSemana(fechaStr) {
    const d = fechaStr ? new Date(fechaStr + 'T12:00:00') : new Date();
    const day = d.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const lunes = new Date(d);
    lunes.setDate(d.getDate() + diffToMonday);
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);

    const pad = (n) => String(n).padStart(2, '0');
    const toYMD = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;

    return {
      lunes: toYMD(lunes),
      domingo: toYMD(domingo),
      lunesObj: lunes,
      domingoObj: domingo
    };
  }

  function actualizarLabelSemana() {
    const lbl = document.getElementById('lab-label-semana');
    const rango = getRangoSemana(state.fechaSeleccionada);
    const opciones = { day: 'numeric', month: 'short' };
    const lunesTxt = rango.lunesObj.toLocaleDateString('es-CO', opciones);
    const domTxt = rango.domingoObj.toLocaleDateString('es-CO', { ...opciones, year: 'numeric' });
    const periodoTxt = `${lunesTxt} al ${domTxt}`;

    if (lbl) lbl.textContent = periodoTxt;

    const printPeriodo = document.getElementById('print-lab-periodo');
    if (printPeriodo) {
      if (state.modoFiltro === 'SEMANA') {
        printPeriodo.textContent = periodoTxt;
      } else if (state.modoFiltro === 'TODAS') {
        printPeriodo.textContent = 'Histórico Completo (Todas las Minas)';
      } else {
        printPeriodo.textContent = `Histórico Mina: ${state.modoFiltro}`;
      }
    }
  }

  async function cargarMinasCatalogo() {
    try {
      const token = getAuthToken();
      const headers = { 'Accept': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/tamanaco-comercial/despachos/catalogos', { headers });
      if (res.ok) {
        const cat = await res.json();
        if (cat.minas && Array.isArray(cat.minas)) {
          cat.minas.forEach(m => state.minas.add(m.trim().toUpperCase()));
        }
      }
    } catch (e) {}

    try {
      const token = getAuthToken();
      const headers = { 'Accept': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/tamanaco-comercial/laboratorio', { headers });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          list.forEach(a => {
            if (a.mina) state.minas.add(a.mina.trim().toUpperCase());
          });
        }
      }
    } catch (e) {}

    actualizarSelectMinas();
  }

  function actualizarSelectMinas() {
    const select = document.getElementById('lab-filtro-mina');
    if (!select) return;

    const valorPrevio = select.value || 'SEMANA';
    select.innerHTML = `
      <option value="SEMANA">-- Semana Activa --</option>
      <option value="TODAS">Todas las Minas (Histórico Completo)</option>
    `;

    Array.from(state.minas).sort().forEach(mina => {
      const opt = document.createElement('option');
      opt.value = mina;
      opt.textContent = `Mina: ${mina}`;
      select.appendChild(opt);
    });

    select.value = valorPrevio;
  }

  async function filtrarPorMina(mina) {
    state.modoFiltro = mina;
    if (mina === 'SEMANA') {
      await cargarHistorialSemanal(state.fechaSeleccionada);
    } else if (mina === 'TODAS') {
      try {
        const token = getAuthToken();
        const headers = { 'Accept': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch('/api/tamanaco-comercial/laboratorio', { method: 'GET', headers });
        if (response.ok) {
          const data = await response.json();
          state.analisis = Array.isArray(data) ? data : [];
          renderTabla();
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      try {
        const token = getAuthToken();
        const headers = { 'Accept': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`/api/tamanaco-comercial/laboratorio/mina/${encodeURIComponent(mina)}`, { method: 'GET', headers });
        if (response.ok) {
          const data = await response.json();
          state.analisis = Array.isArray(data) ? data : [];
          renderTabla();
        }
      } catch (e) {
        console.error(e);
      }
    }
    actualizarLabelSemana();
  }

  async function cargarHistorialSemanal(fecha) {
    try {
      if (fecha) state.fechaSeleccionada = fecha;
      if (!state.fechaSeleccionada) {
        state.fechaSeleccionada = (typeof Utils !== 'undefined') ? Utils.today() : new Date().toISOString().split('T')[0];
      }

      actualizarLabelSemana();

      const token = getAuthToken();
      const headers = { 'Accept': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`/api/tamanaco-comercial/laboratorio/semana?fecha=${state.fechaSeleccionada}`, {
        method: 'GET',
        headers: headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Error al obtener análisis`);
      }

      const data = await response.json();
      state.analisis = Array.isArray(data) ? data : [];
      renderTabla();

      // Sincronizar calidad ponderada del acopio semanal
      const inputSemanaLab = document.getElementById('input-semana-lab');
      if (inputSemanaLab && state.fechaSeleccionada) {
        inputSemanaLab.value = state.fechaSeleccionada;
      }
      if (typeof window.cargarCalidadSemanal === 'function') {
        window.cargarCalidadSemanal(state.fechaSeleccionada);
      }
    } catch (e) {
      console.error('Error cargando historial semanal de laboratorio:', e);
    }
  }

  function renderTabla() {
    const tbody = document.querySelector('#lab-tabla tbody') || document.querySelector('#tabla-historial-calidad tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (state.analisis.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted" style="padding:20px; color:#94a3b8; text-align:center;">No hay análisis registrados para este filtro</td></tr>';
      return;
    }

    // Ordenar descendente por fecha
    const ordenados = [...state.analisis].sort((a, b) => new Date(b.fechaMuestra || b.fechaAnalisis) - new Date(a.fechaMuestra || a.fechaAnalisis));

    ordenados.forEach(a => {
      const tr = document.createElement('tr');

      let badgeEstado = '<span class="badge badge-green" style="background:#059669; color:#fff; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:600;">Aprobado</span>';
      const est = (a.estado || a.estadoPenalizacion || '').toUpperCase();
      const esPenalizado = est === 'PENALIZADO' || est === 'CRITICO' || est === 'RECHAZADO' || (a.ceniza != null && a.ceniza > 10.0);

      if (esPenalizado) {
        let motivo = a.observacion || (a.ceniza > 10.0 ? `Ceniza ${a.ceniza}% (>10%)` : 'Calidad no cumple');
        badgeEstado = `<span class="badge badge-amber" style="background:#d97706; color:#fff; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:600;" title="${motivo}">Penalizado (-$10k)</span>`;
        if (a.ceniza > 15.0 || est === 'RECHAZADO' || est === 'CRITICO') {
          badgeEstado = `<span class="badge badge-red" style="background:#dc2626; color:#fff; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:600;" title="${motivo}">Crítico: Penalizado</span>`;
        }
      }

      const fechaFmt = a.fechaMuestra || a.fechaAnalisis || '-';
      const loteFmt = a.lote || a.loteOReferencia || '-';
      const cenizaVal = a.ceniza != null ? a.ceniza + '%' : '-';
      const azufreVal = a.azufre != null ? a.azufre + '%' : '-';
      const btuVal = a.poderCalorifico != null ? (typeof Utils !== 'undefined' ? Utils.formatNumber(a.poderCalorifico) : a.poderCalorifico) : '-';

      tr.innerHTML = `
        <td><strong>${a.mina || '—'}</strong></td>
        <td>${fechaFmt}</td>
        <td>${loteFmt}</td>
        <td class="text-right fw-600 ${a.ceniza > 10 ? 'text-red' : ''}" style="${a.ceniza > 10 ? 'color:#ef4444; font-weight:700;' : ''}">${cenizaVal}</td>
        <td class="text-right">${azufreVal}</td>
        <td class="text-right">${btuVal}</td>
        <td class="text-center">${badgeEstado}</td>
        <td class="text-center no-print">
          <div class="td-actions" style="justify-content:center; display:flex; gap:6px;">
            ${(typeof Auth !== 'undefined' && Auth.canManageLab()) ? `
              <button class="btn btn-warn btn-sm" onclick="LaboratorioModule.editarAnalisis(${a.id})" title="Editar">Editar</button>
              <button class="btn btn-danger btn-sm" onclick="LaboratorioModule.eliminarAnalisis(${a.id})" title="Borrar">Borrar</button>
            ` : '<span class="text-muted" style="font-size:11px;">Lectura</span>'}
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function cambiarSemana(deltaSemanas) {
    const base = state.fechaSeleccionada ? new Date(state.fechaSeleccionada + 'T12:00:00') : new Date();
    base.setDate(base.getDate() + (deltaSemanas * 7));
    const pad = (n) => String(n).padStart(2, '0');
    state.fechaSeleccionada = `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`;

    const select = document.getElementById('lab-filtro-mina');
    if (select) select.value = 'SEMANA';
    state.modoFiltro = 'SEMANA';

    cargarHistorialSemanal(state.fechaSeleccionada);
  }

  function hoySemana() {
    state.fechaSeleccionada = (typeof Utils !== 'undefined') ? Utils.today() : new Date().toISOString().split('T')[0];

    const select = document.getElementById('lab-filtro-mina');
    if (select) select.value = 'SEMANA';
    state.modoFiltro = 'SEMANA';

    cargarHistorialSemanal(state.fechaSeleccionada);
  }

  async function guardarAnalisis(event) {
    if (event) event.preventDefault();

    const mina = document.getElementById('input-lab-mina')?.value?.trim() || 
                 document.getElementById('lab-mina')?.value?.trim() || 
                 document.querySelector('input[placeholder*="MINA"], input[name="mina"]')?.value?.trim();

    const fecha = document.getElementById('input-lab-fecha')?.value || 
                  document.getElementById('lab-fecha')?.value || 
                  document.querySelector('input[type="date"]')?.value || 
                  (typeof Utils !== 'undefined' ? Utils.today() : new Date().toISOString().split('T')[0]);

    const lote = document.getElementById('input-lab-lote')?.value?.trim() || 
                 document.getElementById('lab-lote')?.value?.trim() || 
                 document.querySelector('input[placeholder*="LOTE"], input[name="lote"]')?.value?.trim() || 
                 'S/L';

    const ceniza = parseDecimal(document.getElementById('input-lab-ceniza')?.value || 
                                document.getElementById('lab-ceniza')?.value || 
                                document.querySelector('input[placeholder*="CENIZA"], input[name="ceniza"]')?.value);

    const azufre = parseDecimal(document.getElementById('input-lab-azufre')?.value || 
                                document.getElementById('lab-azufre')?.value || 
                                document.querySelector('input[placeholder*="AZUFRE"], input[name="azufre"]')?.value);

    const poderCalorifico = parseDecimal(document.getElementById('input-lab-poder')?.value || 
                                         document.getElementById('lab-btu')?.value || 
                                         document.querySelector('input[placeholder*="PODER"], input[name="poderCalorifico"]')?.value);

    if (!mina) {
      if (typeof Toast !== 'undefined') Toast.show('Por favor ingrese la mina o proveedor.', 'warning');
      else alert('Por favor ingrese la mina o proveedor.');
      return;
    }

    if (ceniza == null) {
      if (typeof Toast !== 'undefined') Toast.show('El porcentaje de ceniza es obligatorio.', 'warning');
      else alert('El porcentaje de ceniza es obligatorio.');
      return;
    }

    const payload = {
      mina: mina.toUpperCase(),
      fechaMuestra: fecha,
      fechaAnalisis: fecha,
      lote: lote,
      loteOReferencia: lote,
      ceniza: ceniza,
      azufre: azufre,
      poderCalorifico: poderCalorifico
    };

    try {
      const token = getAuthToken();
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Tenant-ID': '1'
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let url = '/api/tamanaco-comercial/laboratorio?tenantId=1';
      let method = 'POST';

      if (state.editandoId) {
        if (typeof Auth !== 'undefined' && !Auth.canManageLab()) {
          if (typeof Toast !== 'undefined') Toast.show('No tienes permisos para editar análisis', 'warning');
          return;
        }
        url = `/api/tamanaco-comercial/laboratorio/${state.editandoId}?tenantId=1`;
        method = 'PUT';
      }

      const response = await fetch(url, {
        method: method,
        headers: headers,
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        if (typeof Toast !== 'undefined') {
          Toast.show(state.editandoId ? 'Análisis actualizado correctamente' : 'Análisis registrado correctamente', 'success');
        }
        state.editandoId = null;

        const submitBtn = document.querySelector('#form-laboratorio button[type="submit"]');
        if (submitBtn) submitBtn.textContent = 'Guardar Análisis';

        const form = document.getElementById('form-laboratorio');
        if (form) form.reset();

        const fechaInput = document.getElementById('input-lab-fecha') || document.getElementById('lab-fecha');
        if (fechaInput) fechaInput.value = typeof Utils !== 'undefined' ? Utils.today() : new Date().toISOString().split('T')[0];

        // Sincronizar catálogo de minas y recargar vista
        state.minas.add(payload.mina);
        actualizarSelectMinas();

        if (state.modoFiltro === 'SEMANA') {
          state.fechaSeleccionada = fecha;
          cargarHistorialSemanal(state.fechaSeleccionada);
        } else {
          filtrarPorMina(state.modoFiltro);
          if (typeof window.cargarCalidadSemanal === 'function') {
            window.cargarCalidadSemanal(state.fechaSeleccionada);
          }
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.error || errData.message || response.statusText;
        if (typeof Toast !== 'undefined') Toast.show('Error al guardar: ' + errMsg, 'error');
        else alert('Error al guardar: ' + errMsg);
      }
    } catch (err) {
      console.error('Error de conexión:', err);
      if (typeof Toast !== 'undefined') Toast.show('Error de conexión con el servidor', 'error');
    }
  }

  function editarAnalisis(id) {
    if (typeof Auth !== 'undefined' && !Auth.canManageLab()) {
      if (typeof Toast !== 'undefined') Toast.show('No tienes permisos para editar análisis', 'warning');
      return;
    }
    const a = state.analisis.find(x => x.id === id);
    if (!a) return;

    state.editandoId = id;

    const minaIn = document.getElementById('input-lab-mina') || document.getElementById('lab-mina');
    const fechaIn = document.getElementById('input-lab-fecha') || document.getElementById('lab-fecha');
    const loteIn = document.getElementById('input-lab-lote') || document.getElementById('lab-lote');
    const cenizaIn = document.getElementById('input-lab-ceniza') || document.getElementById('lab-ceniza');
    const azufreIn = document.getElementById('input-lab-azufre') || document.getElementById('lab-azufre');
    const btuIn = document.getElementById('input-lab-poder') || document.getElementById('lab-btu');

    if (minaIn) minaIn.value = a.mina || '';
    if (fechaIn) fechaIn.value = a.fechaMuestra || a.fechaAnalisis || '';
    if (loteIn) loteIn.value = a.lote || a.loteOReferencia || '';
    if (cenizaIn) cenizaIn.value = a.ceniza != null ? a.ceniza : '';
    if (azufreIn) azufreIn.value = a.azufre != null ? a.azufre : '';
    if (btuIn) btuIn.value = a.poderCalorifico != null ? a.poderCalorifico : '';

    const submitBtn = document.querySelector('#form-laboratorio button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Actualizar Análisis';

    const form = document.getElementById('form-laboratorio');
    if (form) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function eliminarAnalisis(id) {
    if (typeof Auth !== 'undefined' && !Auth.canManageLab()) {
      if (typeof Toast !== 'undefined') Toast.show('No tienes permisos para eliminar análisis', 'warning');
      return;
    }
    const ok = (typeof Utils !== 'undefined' && Utils.confirm) 
      ? await Utils.confirm(`¿Estás seguro de que quieres eliminar este análisis de laboratorio?`)
      : confirm('¿Eliminar análisis?');
    if (!ok) return;

    try {
      const token = getAuthToken();
      const headers = { 'Accept': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/tamanaco-comercial/laboratorio/${id}?tenantId=1`, {
        method: 'DELETE',
        headers: headers
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (typeof Toast !== 'undefined') Toast.show('Análisis eliminado exitosamente', 'success');
      
      if (state.modoFiltro === 'SEMANA') {
        cargarHistorialSemanal(state.fechaSeleccionada);
      } else {
        filtrarPorMina(state.modoFiltro);
        if (typeof window.cargarCalidadSemanal === 'function') {
          window.cargarCalidadSemanal(state.fechaSeleccionada);
        }
      }
    } catch (e) {
      if (typeof Toast !== 'undefined') Toast.show('Error al eliminar análisis', 'error');
    }
  }

  function init() {
    if (typeof Auth !== 'undefined' && Auth.isViewer()) {
      const formSection = document.querySelector('#page-laboratorio .form-section');
      if (formSection) formSection.style.display = 'none';
    }

    const fechaInput = document.getElementById('input-lab-fecha') || document.getElementById('lab-fecha');
    if (fechaInput && !fechaInput.value) {
      fechaInput.value = typeof Utils !== 'undefined' ? Utils.today() : new Date().toISOString().split('T')[0];
    }

    const form = document.getElementById('form-laboratorio');
    if (form && !form.dataset.listenerAttached) {
      form.addEventListener('submit', guardarAnalisis);
      form.dataset.listenerAttached = 'true';
    }

    if (!state.fechaSeleccionada) {
      state.fechaSeleccionada = typeof Utils !== 'undefined' ? Utils.today() : new Date().toISOString().split('T')[0];
    }

    cargarMinasCatalogo();
    cargarHistorialSemanal(state.fechaSeleccionada);
    state.iniciado = true;
  }

  return {
    init,
    cargarHistorialSemanal,
    cargarHistorialLaboratorio: cargarHistorialSemanal,
    cargarHistorial: cargarHistorialSemanal,
    cambiarSemana,
    hoySemana,
    filtrarPorMina,
    guardarAnalisis,
    eliminarAnalisis,
    editarAnalisis,
    getState: () => state
  };
})();

/* ============================================================
   FUNCIONES GLOBALES DE IMPRESIÓN Y EXPORTACIÓN A EXCEL
   ============================================================ */

window.imprimirReporteLaboratorio = function() {
  const printTbody = document.getElementById('print-lab-tbody');
  if (!printTbody) return;
  printTbody.innerHTML = '';

  const analisisList = LaboratorioModule.getState().analisis || [];

  if (analisisList.length === 0) {
    printTbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 1rem;">No hay análisis registrados en este período.</td></tr>';
  } else {
    // Ordenar descendente
    const ordenados = [...analisisList].sort((a, b) => new Date(b.fechaMuestra || b.fechaAnalisis) - new Date(a.fechaMuestra || a.fechaAnalisis));

    ordenados.forEach((a, idx) => {
      const trPrint = document.createElement('tr');
      const fechaFmt = a.fechaMuestra || a.fechaAnalisis || '—';
      const loteFmt = a.lote || a.loteOReferencia || 'S/L';
      const cenizaVal = a.ceniza != null ? a.ceniza + '%' : '—';
      const azufreVal = a.azufre != null ? a.azufre + '%' : '—';
      const btuVal = a.poderCalorifico != null ? (typeof Utils !== 'undefined' ? Utils.formatNumber(a.poderCalorifico) : a.poderCalorifico) : '—';
      const est = (a.estado || a.estadoPenalizacion || 'APROBADO').toUpperCase();

      trPrint.innerHTML = `
        <td style="text-align: center;">${idx + 1}</td>
        <td>${fechaFmt}</td>
        <td><strong>${a.mina || '—'}</strong></td>
        <td style="text-align: center;">${loteFmt}</td>
        <td style="text-align: right; ${a.ceniza > 10 ? 'font-weight:bold;' : ''}">${cenizaVal}</td>
        <td style="text-align: right;">${azufreVal}</td>
        <td style="text-align: right;">${btuVal}</td>
        <td style="text-align: center; font-weight:bold;">${est}</td>
      `;
      printTbody.appendChild(trPrint);
    });
  }
  window.print();
};

window.abrirModalExcelLaboratorio = function() {
  const tbody = document.getElementById('excel-modal-lab-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const analisisList = LaboratorioModule.getState().analisis || [];

  if (analisisList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:15px; color:#94a3b8;">No hay datos para exportar en este período</td></tr>';
  } else {
    const ordenados = [...analisisList].sort((a, b) => new Date(b.fechaMuestra || b.fechaAnalisis) - new Date(a.fechaMuestra || a.fechaAnalisis));

    ordenados.forEach(a => {
      const row = document.createElement('tr');
      const fechaFmt = a.fechaMuestra || a.fechaAnalisis || '—';
      const loteFmt = a.lote || a.loteOReferencia || '—';
      const cenizaVal = a.ceniza != null ? a.ceniza + '%' : '—';
      const azufreVal = a.azufre != null ? a.azufre + '%' : '—';
      const btuVal = a.poderCalorifico != null ? (typeof Utils !== 'undefined' ? Utils.formatNumber(a.poderCalorifico) : a.poderCalorifico) : '—';
      const est = (a.estado || a.estadoPenalizacion || 'APROBADO').toUpperCase();

      row.innerHTML = `
        <td>${fechaFmt}</td>
        <td><strong>${a.mina || '—'}</strong></td>
        <td style="text-align: center;">${loteFmt}</td>
        <td style="text-align: right;">${cenizaVal}</td>
        <td style="text-align: right;">${azufreVal}</td>
        <td style="text-align: right;">${btuVal}</td>
        <td style="text-align: center;">${est}</td>
      `;
      tbody.appendChild(row);
    });
  }

  const modal = document.getElementById('modal-excel-preview-lab');
  if (modal) modal.style.display = 'flex';
};

window.cerrarModalExcelLaboratorio = function() {
  const modal = document.getElementById('modal-excel-preview-lab');
  if (modal) modal.style.display = 'none';
};

window.descargarExcelLabConfirmado = function() {
  const st = LaboratorioModule.getState();
  const fecha = st.fechaSeleccionada || new Date().toISOString().split('T')[0];
  const mina = (st.modoFiltro && st.modoFiltro !== 'SEMANA' && st.modoFiltro !== 'TODAS') ? st.modoFiltro : '';
  
  let url = `/api/v1/laboratorio/exportar/excel?fecha=${encodeURIComponent(fecha)}`;
  if (mina) url += `&mina=${encodeURIComponent(mina)}`;
  
  window.location.href = url;
  cerrarModalExcelLaboratorio();
};

/* ============================================================
   MOTOR DE CALIDAD PONDERADA SEMANAL Y CERTIFICADO OFICIAL
   ============================================================ */

let resumenCalidadActual = null;

window.cargarCalidadSemanal = async function(fechaParam) {
    const inputFecha = document.getElementById('input-semana-lab');
    let fecha = fechaParam || inputFecha?.value;
    if (!fecha) {
        fecha = new Date().toISOString().split('T')[0];
    }
    if (inputFecha && inputFecha.value !== fecha) {
        inputFecha.value = fecha;
    }

    // Calcular inicio (lunes) y fin (domingo) de la semana
    const curr = new Date(fecha + 'T12:00:00');
    const day = curr.getDay();
    const diffToMonday = curr.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(curr.setDate(diffToMonday));
    const sunday = new Date(curr.setDate(diffToMonday + 6));

    const pad = (n) => String(n).padStart(2, '0');
    const toYMD = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;

    const fInicio = toYMD(monday);
    const fFin = toYMD(sunday);

    try {
        const res = await fetch(`/api/tamanaco-comercial/laboratorio/calidad-semanal?fechaInicio=${fInicio}&fechaFin=${fFin}`);
        if (!res.ok) throw new Error("Error al consultar calidad semanal");
        
        const data = await res.json();
        resumenCalidadActual = data;
        resumenCalidadActual.fechaInicio = fInicio;
        resumenCalidadActual.fechaFin = fFin;

        // Renderizar Tarjetas Consolidadas
        const elTotalTon = document.getElementById('lab-total-ton-semana');
        const elAsh = document.getElementById('lab-ash-ponderada');
        const elSulf = document.getElementById('lab-sulf-ponderada');
        const elMoist = document.getElementById('lab-moist-ponderada');
        const elBtu = document.getElementById('lab-btu-ponderado');

        if (elTotalTon) elTotalTon.innerText = (data.totalToneladas || 0).toFixed(2) + ' Ton';
        if (elAsh) elAsh.innerText = (data.cenizaPonderada || 0).toFixed(2) + ' %';
        if (elSulf) elSulf.innerText = (data.azufrePonderado || 0).toFixed(2) + ' %';
        if (elMoist) elMoist.innerText = (data.humedadPonderada || 0).toFixed(2) + ' %';
        if (elBtu) elBtu.innerText = Math.round(data.btuPonderado || 0).toLocaleString() + ' BTU/lb';

        // Validaciones contra norma estándar (Ceniza <= 10%, Azufre <= 0.8%, BTU >= 12000)
        const ashOk = (data.cenizaPonderada || 0) <= 10.0;
        const sulfOk = (data.azufrePonderado || 0) <= 0.80;
        const btuOk = (data.btuPonderado || 0) >= 12000;

        const cardAsh = document.getElementById('card-sem-ash');
        const tagAsh = document.getElementById('lab-ash-tag');
        if (cardAsh) cardAsh.style.borderColor = ashOk ? '#22c55e' : '#ef4444';
        if (tagAsh) {
            tagAsh.innerText = ashOk ? 'DENTRO DE NORMA' : 'SUPERA LÍMITE (PENALIZABLE)';
            tagAsh.style.color = ashOk ? '#22c55e' : '#ef4444';
        }

        const cardSulf = document.getElementById('card-sem-sulf');
        const tagSulf = document.getElementById('lab-sulf-tag');
        if (cardSulf) cardSulf.style.borderColor = sulfOk ? '#22c55e' : '#ef4444';
        if (tagSulf) {
            tagSulf.innerText = sulfOk ? 'DENTRO DE NORMA' : 'SUPERA LÍMITE';
            tagSulf.style.color = sulfOk ? '#22c55e' : '#ef4444';
        }

        const cardBtu = document.getElementById('card-sem-btu');
        const tagBtu = document.getElementById('lab-btu-tag');
        if (cardBtu) cardBtu.style.borderColor = btuOk ? '#22c55e' : '#f59e0b';
        if (tagBtu) {
            tagBtu.innerText = btuOk ? 'ÓPTIMO' : 'ESTÁNDAR';
            tagBtu.style.color = btuOk ? '#22c55e' : '#f59e0b';
        }

        // Renderizar Tabla con la función dedicada
        renderizarTablaMinas(data.detalleMinas || []);

    } catch (e) {
        console.error("Error al cargar calidad semanal:", e);
    }
};

// Función para renderizar la tabla con acciones rápidas
function renderizarTablaMinas(minas) {
    const tbody = document.getElementById('tabla-calidad-semanal-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!minas || minas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 15px; color: #94a3b8;">No se encontraron minas registradas.</td></tr>`;
        return;
    }

    minas.forEach(mina => {
        const tr = document.createElement('tr');
        tr.className = 'fila-mina-item';
        tr.style.borderBottom = '1px solid #1e293b';

        const ashTxt = mina.cenizas !== null ? mina.cenizas.toFixed(2) + ' %' : '<span style="color: #f59e0b; font-weight: 600;">Pendiente</span>';
        const sulfTxt = mina.azufre !== null ? mina.azufre.toFixed(2) + ' %' : '—';
        const moistTxt = mina.humedad !== null ? mina.humedad.toFixed(2) + ' %' : '—';
        const btuTxt = mina.btu !== null ? Math.round(mina.btu).toLocaleString() : '—';

        const idAnalisisVal = (mina.idAnalisis !== undefined && mina.idAnalisis !== null) ? mina.idAnalisis : 'null';
        const ashVal = mina.cenizas !== null ? mina.cenizas : "''";
        const sulfVal = mina.azufre !== null ? mina.azufre : "''";
        const moistVal = mina.humedad !== null ? mina.humedad : "''";
        const btuVal = mina.btu !== null ? mina.btu : "''";
        const fechaAnalisisVal = mina.fechaAnalisis ? mina.fechaAnalisis : '';

        const badgeEstado = mina.tieneAnalisis 
            ? `<span style="background: #065f46; color: #a7f3d0; padding: 2px 8px; border-radius: 4px; font-size: 0.72rem; font-weight: 700;">Analizado</span>`
            : `<button type="button" onclick="abrirModalAnalisisRapido('${mina.mina}', ${idAnalisisVal}, ${ashVal}, ${sulfVal}, ${moistVal}, ${btuVal}, '${fechaAnalisisVal}')" style="background: #78350f; color: #fde68a; border: none; padding: 2px 8px; border-radius: 4px; font-size: 0.72rem; font-weight: 700; cursor: pointer;">+ Cargar Análisis</button>`;

        const btnAccion = `<button type="button" title="Editar análisis" onclick="abrirModalAnalisisRapido('${mina.mina}', ${idAnalisisVal}, ${ashVal}, ${sulfVal}, ${moistVal}, ${btuVal}, '${fechaAnalisisVal}')" style="background: #1e293b; border: 1px solid #334155; color: #38bdf8; border-radius: 4px; padding: 3px 8px; cursor: pointer; font-size: 0.75rem;">✏️</button>`;

        tr.innerHTML = `
            <td style="padding: 8px 10px; font-weight: 700; color: #ffffff;">${mina.mina}</td>
            <td style="padding: 8px 10px; text-align: right; color: #38bdf8; font-weight: 700;">${(mina.toneladas || 0).toFixed(2)} Ton</td>
            <td style="padding: 8px 10px; text-align: center; color: #94a3b8;">${(mina.participacion || 0).toFixed(1)} %</td>
            <td style="padding: 8px 10px; text-align: right; color: ${mina.cenizas > 10 ? '#ef4444' : '#ffffff'}; font-weight: 600;">${ashTxt}</td>
            <td style="padding: 8px 10px; text-align: right; color: #ffffff;">${sulfTxt}</td>
            <td style="padding: 8px 10px; text-align: right; color: #ffffff;">${moistTxt}</td>
            <td style="padding: 8px 10px; text-align: right; color: #ffffff;">${btuTxt}</td>
            <td style="padding: 8px 10px; text-align: center;">${badgeEstado}</td>
            <td style="padding: 8px 10px; text-align: center;">${btnAccion}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Búsqueda en vivo de minas
window.filtrarMinasLab = function() {
    const query = (document.getElementById('filtro-mina-lab')?.value || '').toLowerCase().trim();
    if (!resumenCalidadActual || !resumenCalidadActual.detalleMinas) return;

    const filtradas = resumenCalidadActual.detalleMinas.filter(m => m.mina.toLowerCase().includes(query));
    renderizarTablaMinas(filtradas);
};

// Plegar / Desplegar tabla
window.toggleTablaMezcla = function() {
    const cont = document.getElementById('contenedor-tabla-mezcla');
    const btn = document.getElementById('btn-toggle-mezcla');
    if (!cont || !btn) return;

    if (cont.style.display === 'none') {
        cont.style.display = 'block';
        btn.innerText = '👁️ Ocultar Tabla';
    } else {
        cont.style.display = 'none';
        btn.innerText = '👁️ Ver Desglose (' + (resumenCalidadActual?.detalleMinas?.length || 0) + ' minas)';
    }
};

// Modal de Carga Rápida
window.abrirModalAnalisisRapido = function(nombreMina, idAnalisis = null, ash = '', sulf = '', moist = '', btu = '', fecha = '') {
    const inId = document.getElementById('rapido-analisis-id');
    const inNombre = document.getElementById('rapido-mina-nombre');
    const lblMina = document.getElementById('rapido-mina-label');
    const inCeniza = document.getElementById('rapido-ceniza');
    const inAzufre = document.getElementById('rapido-azufre');
    const inHumedad = document.getElementById('rapido-humedad');
    const inBtu = document.getElementById('rapido-btu');
    const inFecha = document.getElementById('rapido-fecha');

    if (inId) inId.value = (idAnalisis && idAnalisis !== 'null' && idAnalisis !== null) ? idAnalisis : '';
    if (inNombre) inNombre.value = nombreMina;
    if (lblMina) lblMina.innerText = nombreMina;
    if (inCeniza) inCeniza.value = (ash !== 'null' && ash !== undefined && ash !== '') ? ash : '';
    if (inAzufre) inAzufre.value = (sulf !== 'null' && sulf !== undefined && sulf !== '') ? sulf : '';
    if (inHumedad) inHumedad.value = (moist !== 'null' && moist !== undefined && moist !== '') ? moist : '';
    if (inBtu) inBtu.value = (btu !== 'null' && btu !== undefined && btu !== '') ? btu : '';
    if (inFecha) inFecha.value = (fecha && fecha !== 'null' && fecha !== '') ? fecha : new Date().toISOString().split('T')[0];

    const modal = document.getElementById('modal-analisis-rapido');
    if (modal) modal.style.display = 'flex';
};

window.cerrarModalAnalisisRapido = function() {
    const modal = document.getElementById('modal-analisis-rapido');
    if (modal) modal.style.display = 'none';
};

window.guardarAnalisisRapido = async function(e) {
    if (e) e.preventDefault();

    const inId = document.getElementById('rapido-analisis-id');
    const inNombre = document.getElementById('rapido-mina-nombre');
    const inCeniza = document.getElementById('rapido-ceniza');
    const inAzufre = document.getElementById('rapido-azufre');
    const inHumedad = document.getElementById('rapido-humedad');
    const inBtu = document.getElementById('rapido-btu');
    const inFecha = document.getElementById('rapido-fecha');

    const idVal = inId?.value;
    const mina = inNombre ? inNombre.value : '';
    const cenizas = parsearDecimalSeguro(inCeniza?.value);
    const azufre = parsearDecimalSeguro(inAzufre?.value);
    const humedad = parsearDecimalSeguro(inHumedad?.value);
    const poderCalorifico = parsearDecimalSeguro(inBtu?.value);
    const fecha = inFecha?.value || new Date().toISOString().split('T')[0];

    const payload = {
        id: (idVal && idVal.trim() !== '') ? parseInt(idVal.trim()) : null,
        mina: mina,
        cenizas: cenizas,
        ceniza: cenizas,
        azufre: azufre,
        humedad: humedad,
        poderCalorifico: poderCalorifico,
        fecha: fecha,
        fechaMuestra: fecha
    };

    try {
        const res = await fetch('/api/tamanaco-comercial/laboratorio/guardar?tenantId=1', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': '1' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || errData.error || "Error al guardar el análisis");
        }

        cerrarModalAnalisisRapido();
        if (typeof Toast !== 'undefined') {
            Toast.show("Análisis guardado correctamente. Recalculando mezcla...", "success");
        } else if (typeof mostrarToast === 'function') {
            mostrarToast("Análisis guardado correctamente. Recalculando mezcla...", "success");
        }

        // Recalcular calidad semanal e historial de inmediato
        await cargarCalidadSemanal();
        if (typeof LaboratorioModule !== 'undefined' && typeof LaboratorioModule.cargarHistorialSemanal === 'function') {
            LaboratorioModule.cargarHistorialSemanal();
        }

    } catch (err) {
        console.error("Error al guardar análisis:", err);
        if (typeof Toast !== 'undefined') {
            Toast.show(err.message || "Error al guardar el análisis.", "error");
        } else {
            alert(err.message || "Error al guardar el análisis.");
        }
    }
};

// Reporte de Mezclas de la Semana Imprimible Oficial
window.imprimirReporteMezclasSemanal = function() {
    if (!resumenCalidadActual) return;

    const v = window.open('', '_blank');
    if (!v) return;

    let filas = '';
    
    (resumenCalidadActual.detalleMinas || []).forEach(m => {
        filas += `<tr>
            <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">${m.mina}</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">${(m.toneladas || 0).toFixed(2)}</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; color: #475569;">${(m.participacion || 0).toFixed(1)}%</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">${m.cenizas !== null ? m.cenizas.toFixed(2) + '%' : 'S/A'}</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">${m.azufre !== null ? m.azufre.toFixed(2) + '%' : '—'}</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">${m.humedad !== null ? m.humedad.toFixed(2) + '%' : '—'}</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">${m.btu !== null ? Math.round(m.btu).toLocaleString() : '—'}</td>
        </tr>`;
    });

    v.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Reporte de Mezclas de la Semana — Carbones Tamanaco C.A.</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; padding: 25px; color: #0f172a; margin: 0; }
                .header-box { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
                .title { font-size: 1.3rem; font-weight: 800; letter-spacing: 0.5px; margin: 0; color: #0f172a; }
                .subtitle { font-size: 0.85rem; font-weight: 700; color: #475569; text-transform: uppercase; margin-top: 4px; }
                .info-grid { display: flex; justify-content: space-between; font-size: 0.88rem; margin-bottom: 15px; background: #f8fafc; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 6px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 0.88rem; }
                th { background: #0f172a; color: #ffffff; padding: 8px; text-align: left; font-size: 0.82rem; }
                tfoot tr { background: #f1f5f9; font-weight: 800; }
                .nota { font-size: 0.75rem; color: #64748b; margin-top: 15px; font-style: italic; }
                .firmas { display: flex; justify-content: space-between; margin-top: 50px; }
                .firma-linea { border-top: 1px solid #0f172a; width: 220px; text-align: center; font-size: 0.82rem; padding-top: 5px; font-weight: 600; }
            </style>
        </head>
        <body>
            <div class="header-box">
                <h1 class="title">CARBONES TAMANACO C.A.</h1>
                <div class="subtitle">REPORTE DE MEZCLAS DE LA SEMANA</div>
            </div>

            <div class="info-grid">
                <div><strong>Semana Evaluada:</strong> ${resumenCalidadActual.fechaInicio} al ${resumenCalidadActual.fechaFin}</div>
                <div><strong>Fecha de Emisión:</strong> ${new Date().toLocaleDateString('es-CO')}</div>
            </div>

            <table style="border: 1px solid #cbd5e1;">
                <thead>
                    <tr>
                        <th>MINA / ORIGEN</th>
                        <th style="text-align: right;">DESPACHADO (TON)</th>
                        <th style="text-align: center;">% MEZCLA</th>
                        <th style="text-align: right;">CENIZA (%)</th>
                        <th style="text-align: right;">AZUFRE (%)</th>
                        <th style="text-align: right;">HUMEDAD (%)</th>
                        <th style="text-align: right;">BTU/LB</th>
                    </tr>
                </thead>
                <tbody>
                    ${filas}
                </tbody>
                <tfoot>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #cbd5e1;">TOTAL / MEZCLA PONDERADA</td>
                        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; color: #0284c7;">${(resumenCalidadActual.totalToneladas || 0).toFixed(2)} Ton</td>
                        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">100%</td>
                        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">${(resumenCalidadActual.cenizaPonderada || 0).toFixed(2)}%</td>
                        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">${(resumenCalidadActual.azufrePonderado || 0).toFixed(2)}%</td>
                        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">${(resumenCalidadActual.humedadPonderada || 0).toFixed(2)}%</td>
                        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">${Math.round(resumenCalidadActual.btuPonderado || 0).toLocaleString()} BTU</td>
                    </tr>
                </tfoot>
            </table>

            <div class="nota">
                * Nota: Los parámetros fisicoquímicos corresponden a los ensayos de laboratorio externos de referencia ponderados matemáticamente sobre el volumen real despachado en báscula durante el período.
            </div>

            <div class="firmas">
                <div class="firma-linea">Responsable de Patio / Mezclas</div>
                <div class="firma-linea">Administración y Operaciones</div>
            </div>
        </body>
        </html>
    `);
    v.document.close();
    v.print();
};

window.imprimirCertificadoSemanal = window.imprimirReporteMezclasSemanal;

// Inicialización automática en DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  LaboratorioModule.init();
  if (typeof window.cargarCalidadSemanal === 'function') {
    window.cargarCalidadSemanal();
  }
});
