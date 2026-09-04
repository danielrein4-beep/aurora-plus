/* ============================================================
   despachos.js — Módulo de Control de Despachos (Carbones Tamanaco)
   ============================================================ */

const DespachoModule = (() => {

  const STORAGE_KEY = 'tamanaco_despachos';

  let state = {
    despachos: [],
    fechaActual: Utils.today(),
    editandoId: null,
    iniciado: false,
    modoSemanal: false,
    pagina: 1,
    catalogos: {
      choferes: [],
      placas: [],
      minas: [],
      relacionPlacaChofer: {}
    }
  };

  let els = {};

  function cachearElementos() {
    els = {
      filtroFecha:        document.getElementById('d-filtroFecha'),
      inputId:            document.getElementById('d-id'),
      inputChofer:        document.getElementById('d-chofer'),
      inputPlaca:         document.getElementById('d-placa'),
      inputMina:          document.getElementById('d-mina'),
      inputPeso:          document.getElementById('d-peso'),
      tbody:              document.querySelector('#d-tabla tbody'),
      statCamionesDia:    document.getElementById('d-stat-camiones-dia'),
      statPesoDia:        document.getElementById('d-stat-peso-dia'),
      statCamionesSem:    document.getElementById('d-stat-camiones-sem'),
      statPesoSem:        document.getElementById('d-stat-peso-sem'),
      btnGuardar:         document.getElementById('d-btn-guardar'),
      btnCancelar:        document.getElementById('d-btn-cancelar'),
      formTitle:          document.getElementById('d-form-title'),
    };
  }

  // ----------------------------------------------------------
  // CATÁLOGOS PREDICTIVOS Y AUTOCOMPLETADO BAJO DEMANDA (MAX 5)
  // ----------------------------------------------------------
  async function cargarCatalogos() {
    try {
      const resp = await fetch('/api/tamanaco-comercial/despachos/catalogos');
      if (resp.ok) {
        const data = await resp.json();
        state.catalogos = {
          choferes: data.choferes || [],
          placas: data.placas || [],
          minas: data.minas || [],
          relacionPlacaChofer: data.relacionPlacaChofer || {}
        };
        // Inicializar datalists vacíos
        limpiarTodosLosDatalists();
      }
    } catch (err) {
      console.warn('No se pudieron cargar catálogos desde el servidor:', err);
    }
  }

  function limpiarTodosLosDatalists() {
    ['lista-choferes', 'lista-placas', 'lista-minas'].forEach(id => {
      const dl = document.getElementById(id);
      if (dl) dl.innerHTML = '';
    });
  }

  /**
   * Actualiza el datalist bajo demanda:
   * - Si está vacío: no muestra sugerencias (datalist vacío).
   * - Si tiene texto: filtra y corta a un máximo estricto de 5 opciones.
   */
  function actualizarSugerencias(inputElement, datalistId, listaCompleta) {
    const datalist = document.getElementById(datalistId);
    if (!datalist || !Array.isArray(listaCompleta)) return;

    const valor = inputElement.value.trim().toUpperCase();

    // Regla 1: Si no hay texto, vaciar el datalist para que no abra sugerencias
    if (valor.length === 0) {
      datalist.innerHTML = '';
      return;
    }

    // Regla 2: Filtrar coincidencias y cortar a un máximo estricto de 5 elementos
    const coincidencias = listaCompleta
      .filter(item => item && item.toString().toUpperCase().includes(valor))
      .slice(0, 5);

    // Inyectar solo las 5 opciones filtradas
    datalist.innerHTML = coincidencias
      .map(item => `<option value="${item}"></option>`)
      .join('');
  }

  function configurarAutoChoferPorPlaca() {
    const inputChofer = document.getElementById('d-chofer');
    const inputPlaca  = document.getElementById('d-placa');
    const inputMina   = document.getElementById('d-mina');

    if (inputChofer) {
      inputChofer.addEventListener('input', (e) => {
        actualizarSugerencias(e.target, 'lista-choferes', state.catalogos.choferes);
      });
    }

    if (inputPlaca) {
      inputPlaca.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase(); // Forzar mayúsculas
        actualizarSugerencias(e.target, 'lista-placas', state.catalogos.placas);

        // Si la placa coincide exactamente y existe un chofer habitual, autocompletar chofer si está vacío
        const placaVal = e.target.value.trim();
        const choferHabitual = state.catalogos.relacionPlacaChofer[placaVal];
        if (choferHabitual && inputChofer && !inputChofer.value.trim()) {
          inputChofer.value = choferHabitual;
          _highlightCampoOcr(inputChofer);
        }
      });
    }

    if (inputMina) {
      inputMina.addEventListener('input', (e) => {
        actualizarSugerencias(e.target, 'lista-minas', state.catalogos.minas);
      });
    }

    // Limpiar datalists al perder el foco (blur) para resetear el estado
    [inputChofer, inputPlaca, inputMina].forEach(input => {
      if (input) {
        input.addEventListener('blur', () => {
          const listId = input.getAttribute('list');
          if (listId) {
            const dl = document.getElementById(listId);
            if (dl) dl.innerHTML = '';
          }
        });
      }
    });
  }

  // ----------------------------------------------------------
  // CARGAR DATOS DEL SERVIDOR (CON FALLBACK LOCAL)
  // ----------------------------------------------------------
  async function cargar() {
    try {
      const data = await Api.get('/despachos');
      if (Array.isArray(data)) {
        state.despachos = data;
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e){}
      }
    } catch (err) {
      console.warn('Cargando despachos desde almacenamiento local:', err);
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) state.despachos = JSON.parse(raw);
      } catch (e) {}
    }

    if (!Array.isArray(state.despachos)) {
      state.despachos = [];
    }

    renderTablaYStats();
    cargarCatalogos();

    if (typeof MetasModule !== 'undefined' && typeof MetasModule.cargarCuotaActiva === 'function') {
      MetasModule.cargarCuotaActiva();
    }
  }

  // ----------------------------------------------------------
  // RENDERIZAR TABLA Y ESTADÍSTICAS
  // ----------------------------------------------------------
  function renderTablaYStats() {
    cachearElementos();
    if (!state.fechaActual) {
      state.fechaActual = els.filtroFecha?.value || Utils.today();
    }

    const { despachos, fechaActual } = state;
    const tbody = els.tbody || document.querySelector('#d-tabla tbody');
    if (!tbody) return;

    const semanaInicio = Utils.getWeekStart(fechaActual);
    const partsSem = semanaInicio.split('-').map(Number);
    const fechaLunes   = new Date(partsSem[0], partsSem[1] - 1, partsSem[2], 0, 0, 0);
    const fechaDomingo = new Date(partsSem[0], partsSem[1] - 1, partsSem[2] + 6, 23, 59, 59);

    const headerTitle = document.getElementById('print-fecha-titulo');
    if (headerTitle) {
      headerTitle.textContent = 'Reporte de Despachos — ' + (state.modoSemanal ? 'Semana del ' + Utils.formatDate(semanaInicio) : Utils.formatDate(fechaActual));
    }

    const labelFecha = document.getElementById('d-label-fecha');
    if (labelFecha) {
      labelFecha.textContent = state.modoSemanal ? `Semana del ${Utils.formatDate(semanaInicio)}` : Utils.formatDate(fechaActual);
    }

    let camionesDia = 0, pesoDia = 0;
    let camionesSem = 0, pesoSem = 0;

    const lista = Array.isArray(despachos) ? despachos : [];

    lista.forEach(d => {
      if (!d || !d.fecha) return;
      const peso = parseFloat(d.peso) || 0;
      const fClean = String(d.fecha).includes('T') ? d.fecha.split('T')[0] : d.fecha;
      const fParts = fClean.split('-').map(Number);
      const fechaD = new Date(fParts[0], fParts[1] - 1, fParts[2], 12, 0, 0);
      
      if (fechaD >= fechaLunes && fechaD <= fechaDomingo) {
        camionesSem++;
        pesoSem += peso;
      }
      
      if (fClean === fechaActual) {
        camionesDia++;
        pesoDia += peso;
      }
    });

    const busqueda = (document.getElementById('d-busqueda')?.value || '').trim().toLowerCase();

    const ordenados = [...lista].sort((a, b) => (b.id || 0) - (a.id || 0));
    const filtrados = ordenados.filter(d => {
      if (!d) return false;
      
      if (busqueda) {
        const c = (d.chofer || '').toLowerCase();
        const p = (d.placa || '').toLowerCase();
        const m = (d.mina || '').toLowerCase();
        if (!c.includes(busqueda) && !p.includes(busqueda) && !m.includes(busqueda)) {
          return false;
        }
        return true;
      }

      if (!d.fecha) return false;
      const fechaD = new Date(d.fecha + 'T00:00:00');
      if (state.modoSemanal) {
        return fechaD >= fechaLunes && fechaD <= fechaDomingo;
      } else {
        return d.fecha === fechaActual;
      }
    });

    tbody.innerHTML = '';

    if (filtrados.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty-state" style="text-align:center; padding:30px 15px; color:var(--t-mid);">
              <div style="font-weight:600; font-size:15px; margin-bottom:4px;">Sin despachos ${state.modoSemanal ? 'esta semana' : 'este día'}</div>
              <div style="font-size:13px; color:var(--t-low);">No hay registros para la fecha seleccionada. Use el formulario de arriba para ingresar un nuevo despacho.</div>
            </div>
          </td>
        </tr>
      `;
    } else {
      const regsPorPagina = 20;
      const pagina = Math.max(1, state.pagina || 1);
      const totalPaginas = Math.ceil(filtrados.length / regsPorPagina) || 1;
      const paginaActual = Math.min(pagina, totalPaginas);
      state.pagina = paginaActual;

      const inicio = (paginaActual - 1) * regsPorPagina;
      const fin = inicio + regsPorPagina;
      const paginados = filtrados.slice(inicio, fin);

      paginados.forEach(d => {
        const peso = parseFloat(d.peso) || 0;
        const tr = document.createElement('tr');
        tr.setAttribute('data-id', d.id);
        tr.id = `fila-despacho-${d.id}`;
        tr.innerHTML = `
          <td class="td-id font-mono">#${d.id}</td>
          <td>
            <div class="fw-600 col-fecha">${Utils.formatDate(d.fecha)}</div>
            ${d.hora ? `<div style="font-size:10px; color:var(--t-low);">${d.hora}</div>` : ''}
          </td>
          <td><strong class="text-high col-chofer">${d.chofer || '—'}</strong></td>
          <td><span class="badge badge-blue col-placa">${d.placa || '—'}</span></td>
          <td><span class="badge badge-subtle col-mina">${(d.mina || '—').toUpperCase()}</span></td>
          <td class="text-right">
            <strong class="text-high col-peso" style="font-size:14px;">${Utils.formatNumber(peso, 2)} Ton</strong>
          </td>
          <td class="no-print no-export text-right">
            <div class="flex gap-4 justify-end align-center">
              <button class="btn btn-subtle btn-sm" style="color:var(--c-blue); border-color:var(--c-blue);" onclick="abrirModalTicket(${d.id})" title="Ver Ticket Digital con QR y WhatsApp">Ticket</button>
              ${d.ticketUrl 
                ? `<div style="display:inline-flex; align-items:center; gap:2px;">
                     <button class="btn btn-primary btn-sm" onclick="Utils.mostrarPDF('${d.ticketUrl}', 'Ticket de Romana #${d.id}')">Romana</button>
                     ${((typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function') ? Auth.isAdmin() : true) 
                       ? `<button class="btn btn-ghost btn-sm text-red" title="Borrar Ticket (Solo Admin)" style="padding:2px 6px; font-size:11px;" onclick="DespachoModule.eliminarTicket(${d.id})">✕</button>` 
                       : ''}
                   </div>` 
                : `<button class="btn btn-subtle btn-sm" onclick="DespachoModule.abrirSelectorTicket(${d.id})" title="Adjuntar foto de romana">Foto</button>`}
              <button class="btn btn-ghost btn-sm" onclick="DespachoModule.editar(${d.id})">Editar</button>
              <button class="btn btn-ghost btn-sm text-red" title="Eliminar Despacho" onclick="DespachoModule.eliminar(${d.id})">Eliminar</button>
            </div>
          </td>
        </tr>
        `;
        tbody.appendChild(tr);
      });

      if (filtrados.length > regsPorPagina) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td colspan="7" class="text-center" style="padding: 15px;">
            <button class="btn btn-sm btn-ghost" onclick="DespachoModule.cambiarPagina(${paginaActual - 1})" ${paginaActual === 1 ? 'disabled' : ''}>Anterior</button>
            <span style="margin: 0 15px; font-size: 13px;">Página ${paginaActual} de ${totalPaginas} (${filtrados.length} registros)</span>
            <button class="btn btn-sm btn-ghost" onclick="DespachoModule.cambiarPagina(${paginaActual + 1})" ${paginaActual === totalPaginas ? 'disabled' : ''}>Siguiente</button>
          </td>
        `;
        tbody.appendChild(tr);
      }
    }

    const statCamDia = els.statCamionesDia || document.getElementById('d-stat-camiones-dia');
    const statPesDia = els.statPesoDia || document.getElementById('d-stat-peso-dia');
    const statCamSem = els.statCamionesSem || document.getElementById('d-stat-camiones-sem');
    const statPesSem = els.statPesoSem || document.getElementById('d-stat-peso-sem');

    if (statCamDia) statCamDia.textContent = camionesDia;
    if (statPesDia) statPesDia.textContent = `${Utils.formatNumber(pesoDia, 2)}`;
    if (statCamSem) statCamSem.textContent = camionesSem;
    if (statPesSem) statPesSem.textContent = `${Utils.formatNumber(pesoSem, 2)}`;
  }

  function cambiarPagina(p) {
    state.pagina = p;
    renderTablaYStats();
  }

  // ----------------------------------------------------------
  // GUARDAR (CREAR O ACTUALIZAR)
  // ----------------------------------------------------------
  async function guardar() {
    const inputChofer = document.getElementById('d-chofer');
    const inputPlaca  = document.getElementById('d-placa');
    const inputMina   = document.getElementById('d-mina');
    const inputPeso   = document.getElementById('d-peso');
    const inputFecha  = document.getElementById('d-filtroFecha');
    const inputCedulaChofer = document.getElementById('d-cedula-chofer');

    const chofer = (inputChofer?.value || '').trim();
    const cedulaChofer = (inputCedulaChofer?.value || '').trim();
    const placa  = (inputPlaca?.value || '').trim();
    const mina   = (inputMina?.value || '').trim().toUpperCase();
    const pesoRaw = (inputPeso?.value || '').trim().replace(',', '.');
    const peso   = parseFloat(pesoRaw);

    if (!chofer || !placa || !mina || isNaN(peso) || peso <= 0) {
      Toast.show('Por favor completa todos los campos (Chofer, Placa, Mina y Peso en Toneladas)', 'warning');
      return;
    }

    const fecha = inputFecha?.value || state.fechaActual || Utils.today();
    const now = new Date();
    const hora = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

    const payload = {
      chofer,
      cedulaChofer,
      placa: placa.toUpperCase(),
      mina: mina.toUpperCase(),
      peso,
      fecha,
      hora
    };

    try {
      if (state.editandoId) {
        payload.id = state.editandoId;
        const resp = await Api.put(`/despachos/${state.editandoId}`, payload);
        const idx = state.despachos.findIndex(x => x.id === state.editandoId);
        if (idx !== -1) {
          state.despachos[idx] = resp || { ...state.despachos[idx], ...payload };
        }
        Toast.show('Despacho actualizado correctamente', 'success');
      } else {
        const resp = await Api.post('/despachos', payload);
        const nuevo = resp || { id: Date.now(), ...payload };
        state.despachos.unshift(nuevo);
        Toast.show('Despacho registrado correctamente', 'success');
      }
    } catch (err) {
      console.warn('Guardado en modo contingencia local:', err);
      if (state.editandoId) {
        const idx = state.despachos.findIndex(x => x.id === state.editandoId);
        if (idx !== -1) state.despachos[idx] = { ...state.despachos[idx], ...payload, id: state.editandoId };
        Toast.show('Despacho actualizado', 'info');
      } else {
        const nuevo = { id: Date.now(), ...payload };
        state.despachos.unshift(nuevo);
        Toast.show('Despacho registrado', 'success');
      }
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.despachos));
    } catch (e) {}

    limpiarFormulario();
    renderTablaYStats();
    cargarCatalogos();

    if (typeof MetasModule !== 'undefined' && typeof MetasModule.cargarCuotaActiva === 'function') {
      MetasModule.cargarCuotaActiva();
    }
  }

  // ----------------------------------------------------------
  // EDITAR
  // ----------------------------------------------------------
  function editar(id) {
    const d = state.despachos.find(x => x.id === id);
    if (!d) return;

    state.editandoId = id;

    const inputId     = document.getElementById('d-id');
    const inputChofer = document.getElementById('d-chofer');
    const inputPlaca  = document.getElementById('d-placa');
    const inputMina   = document.getElementById('d-mina');
    const inputPeso   = document.getElementById('d-peso');
    const formTitle   = document.getElementById('d-form-title');
    const btnGuardar  = document.getElementById('d-btn-guardar');
    const btnCancelar = document.getElementById('d-btn-cancelar');

    const inputCedulaChofer = document.getElementById('d-cedula-chofer');

    if (inputId)     inputId.value     = d.id;
    if (inputChofer) { inputChofer.value = d.chofer || ''; inputChofer.readOnly = false; }
    if (inputPlaca)  inputPlaca.value   = d.placa  || '';
    if (inputMina)   inputMina.value    = d.mina   || '';
    if (inputPeso)   inputPeso.value    = d.peso   || '';
    if (inputCedulaChofer) inputCedulaChofer.value = (d.choferRef && d.choferRef.cedula) ? d.choferRef.cedula : '';

    if (formTitle)   formTitle.textContent = `Editando Despacho #${id}`;
    if (btnGuardar)  btnGuardar.textContent = 'Actualizar Despacho';
    if (btnCancelar) btnCancelar.style.display = 'inline-flex';

    inputChofer?.focus();
  }

  // ----------------------------------------------------------
  // HISTORIAL DE CHOFERES POR CÉDULA (autocompletado)
  // ----------------------------------------------------------
  async function buscarChoferPorCedula() {
    const inputCedula = document.getElementById('d-cedula-chofer');
    const inputChofer = document.getElementById('d-chofer');
    if (!inputCedula || !inputChofer) return;

    const cedula = (inputCedula.value || '').trim();
    if (!cedula) {
      inputChofer.readOnly = false;
      return;
    }

    try {
      const chofer = await Api.get(`/v1/choferes/por-cedula/${encodeURIComponent(cedula)}`);
      if (chofer && chofer.nombreCompleto) {
        inputChofer.value = chofer.nombreCompleto;
        inputChofer.readOnly = true;
      }
    } catch (e) {
      // No encontrado (404) u otro error de red: permitir escribir el nombre libremente.
      inputChofer.readOnly = false;
    }
  }

  // ----------------------------------------------------------
  // ELIMINAR
  // ----------------------------------------------------------
  async function eliminar(id) {
    if (!confirm(`¿Deseas eliminar el despacho #${id}?`)) return;

    try {
      await Api.delete(`/despachos/${id}`);
    } catch (err) {}

    state.despachos = state.despachos.filter(x => x.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.despachos));
    } catch (e) {}

    Toast.show('Despacho eliminado', 'info');
    renderTablaYStats();
  }

  // ----------------------------------------------------------
  // LIMPIAR FORMULARIO
  // ----------------------------------------------------------
  function limpiarFormulario() {
    state.editandoId = null;

    ['d-id', 'd-cedula-chofer', 'd-chofer', 'd-placa', 'd-mina', 'd-peso'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    const inputChoferEl = document.getElementById('d-chofer');
    if (inputChoferEl) inputChoferEl.readOnly = false;

    const formTitle   = document.getElementById('d-form-title');
    const btnGuardar  = document.getElementById('d-btn-guardar');
    const btnCancelar = document.getElementById('d-btn-cancelar');

    if (formTitle)   formTitle.textContent = 'Nuevo despacho';
    if (btnGuardar)  btnGuardar.textContent = 'Guardar despacho';
    if (btnCancelar) btnCancelar.style.display = 'none';
  }

  // ----------------------------------------------------------
  // NAVEGADOR DE FECHAS
  // ----------------------------------------------------------
  function cambiarDia(offset) {
    state.fechaActual = Utils.offsetDate(state.fechaActual, offset);
    const filtroFecha = document.getElementById('d-filtroFecha');
    if (filtroFecha) filtroFecha.value = state.fechaActual;
    renderTablaYStats();
  }

  function irAHoy() {
    state.fechaActual = Utils.today();
    const filtroFecha = document.getElementById('d-filtroFecha');
    if (filtroFecha) filtroFecha.value = state.fechaActual;
    renderTablaYStats();
  }

  function alCambiarFecha() {
    const filtroFecha = document.getElementById('d-filtroFecha');
    state.fechaActual = filtroFecha?.value || Utils.today();
    renderTablaYStats();
  }

  // ----------------------------------------------------------
  // GENERAR PDF / IMPRESIÓN
  // ----------------------------------------------------------

  async function generarPDF() {
    // Calcula la lista real del período que el usuario está viendo (día u hoy por
    // defecto si no hay fecha seleccionada, o semana completa en modo semanal),
    // con límites de fecha inclusivos — igual que el filtro del preview de Excel.
    let despachosFiltrados = [];
    let textoRango = '';

    const despachosBase = Array.isArray(state.despachos) ? state.despachos : [];

    if (state.modoSemanal) {
      const lunesStr = Utils.getWeekStart(state.fechaActual || Utils.today());
      const domStr = Utils.offsetDate(lunesStr, 6);

      despachosFiltrados = despachosBase.filter(d => {
        if (!d || !d.fecha) return false;
        const f = d.fecha.split(' ')[0];
        return f >= lunesStr && f <= domStr;
      });

      textoRango = `${Utils.formatDate(lunesStr)} al ${Utils.formatDate(domStr)} (Semana)`;
    } else {
      // Si no hay fecha de vista seleccionada, usar hoy como período por defecto.
      const fechaVista = state.fechaActual || Utils.today();

      despachosFiltrados = despachosBase.filter(d => {
        if (!d || !d.fecha) return false;
        return d.fecha.split(' ')[0] === fechaVista;
      });

      textoRango = Utils.formatDate(fechaVista);
    }

    if (typeof window.imprimirReporteDespachos === 'function') {
      window.imprimirReporteDespachos(despachosFiltrados, textoRango);
    }
  }

  function toggleModoSemanal() {
    state.modoSemanal = !state.modoSemanal;
    const btn = document.getElementById('d-btn-modo-semanal');
    if (btn) {
      if (state.modoSemanal) {
        btn.classList.add('btn-primary');
        btn.classList.remove('btn-ghost');
        btn.textContent = 'Ver Día';
      } else {
        btn.classList.add('btn-ghost');
        btn.classList.remove('btn-primary');
        btn.textContent = 'Ver Semana';
      }
    }
    renderTablaYStats();
  }

  // ----------------------------------------------------------
  // SUBIR TICKET DE ROMANA
  // ----------------------------------------------------------
  let despachoIdParaTicket = null;

  function abrirSelectorTicket(id) {
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
      
      try {
        Toast.show('Subiendo ticket...', 'info');
        const resp = await Api.uploadFormData(`/despachos/${id}/ticket`, formData);
        Toast.show('Ticket guardado correctamente', 'success');
        if (resp && resp.ticketUrl) {
          const item = state.despachos.find(x => x.id === id);
          if (item) item.ticketUrl = resp.ticketUrl;
        }
        cargar();
      } catch (err) {
        // Fallback local
        const reader = new FileReader();
        reader.onload = function(evt) {
          const dataUrl = evt.target.result;
          const item = state.despachos.find(x => x.id === id);
          if (item) {
            item.ticketUrl = dataUrl;
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.despachos)); } catch(e){}
            renderTablaYStats();
            Toast.show('Ticket guardado', 'success');
          }
        };
        reader.readAsDataURL(file);
      }
    };

    window.addEventListener('focus', function onFocus() {
      setTimeout(() => {
        if (input.parentNode) input.parentNode.removeChild(input);
      }, 1000);
      window.removeEventListener('focus', onFocus);
    }, { once: true });

    input.click();
  }

  // ----------------------------------------------------------
  // ELIMINAR TICKET DE ROMANA (SOLO ADMINISTRACIÓN / ADMIN)
  // ----------------------------------------------------------
  async function eliminarTicket(id) {
    const esAdmin = (typeof Auth !== 'undefined' && typeof Auth.isAdmin === 'function') ? Auth.isAdmin() : true;
    if (!esAdmin) {
      Toast.show('Solo el personal de Administración / Admin tiene permisos para borrar tickets', 'warning');
      return;
    }

    const ok = await Utils.confirm(`¿Estás seguro de eliminar el ticket de romana del despacho #${id}?`);
    if (!ok) return;

    try {
      Toast.show('Eliminando ticket...', 'info');
      await Api.delete(`/despachos/${id}/ticket`);
      Toast.show('Ticket eliminado correctamente', 'success');
    } catch (err) {
      console.warn('Eliminación local de ticket:', err);
      Toast.show('Ticket eliminado', 'info');
    }

    const item = state.despachos.find(x => x.id === id);
    if (item) {
      item.ticketUrl = null;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.despachos)); } catch(e){}
    }

    renderTablaYStats();
  }

  // ----------------------------------------------------------
  // OCR: ESCANEO DE COMPROBANTE CON IA (GEMINI VISION)
  // ----------------------------------------------------------

  /**
   * Abre el selector de cámara / archivo y envía la imagen original directamente
   * mediante FormData al backend OCR para auto-rellenar el formulario.
   */
  function abrirEscanerTicket() {
    const input = document.getElementById('input-file-ocr') || document.getElementById('input-ticket-camera');
    if (!input) return;

    input.onchange = async (e) => {
      const file = e.target.files[0];
      input.value = '';
      if (!file) return;

      _mostrarEstadoOcr(true, 'Procesando comprobante con IA...');

      try {
        const formData = new FormData();
        formData.append('file', file);

        const token = _getAuthToken();
        const resp = await fetch('/api/tamanaco-comercial/despachos/ocr', {
          method: 'POST',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          body: formData
        });

        if (!resp.ok) {
          const errorData = await resp.json().catch(() => null);
          const errorMsg = (errorData && (errorData.detalle || errorData.error)) 
            ? (errorData.detalle || errorData.error) 
            : `HTTP ${resp.status}: Error al procesar el comprobante`;
          throw new Error(errorMsg);
        }

        const data = await resp.json();
        _rellenarFormularioConOcr(data);
        Toast.show('Comprobante procesado con éxito.', 'success');

      } catch (err) {
        console.error('Error OCR:', err);
        const mensajeFinal = err.message || 'Error desconocido al procesar imagen';
        Toast.show('Detalle del error OCR: ' + mensajeFinal, 'error');
        alert('Detalle del error OCR:\n' + mensajeFinal);
      } finally {
        _mostrarEstadoOcr(false);
      }
    };

    input.click();
  }

  /**
   * Rellena los campos del formulario con los datos del OCR
   * y aplica un highlight temporal para indicar los campos auto-llenados.
   */
  function _rellenarFormularioConOcr(data) {
    const campos = [
      { id: 'd-chofer',     valor: data.chofer },
      { id: 'd-placa',      valor: data.placa  },
      { id: 'd-mina',       valor: data.mina   },
      { id: 'd-peso',       valor: data.pesoNeto > 0 ? data.pesoNeto : '' },
    ];

    campos.forEach(({ id, valor }) => {
      const el = document.getElementById(id);
      if (!el || valor === undefined || valor === null || valor === '') return;
      el.value = String(valor).trim();
      _highlightCampoOcr(el);
    });

    // Fecha: si Gemini extrajo una fecha valida, la usa
    if (data.fecha && /^\d{4}-\d{2}-\d{2}$/.test(data.fecha)) {
      const filtroFecha = document.getElementById('d-filtroFecha');
      if (filtroFecha) {
        filtroFecha.value = data.fecha;
        state.fechaActual = data.fecha;
      }
    }

    // Informacion adicional (observaciones) en consola para debugging
    if (data.observaciones) {
      console.info('[OCR] Observaciones del ticket:', data.observaciones);
    }
  }

  /**
   * Resalta un campo durante 3 segundos para indicar que fue auto-llenado.
   */
  function _highlightCampoOcr(el) {
    el.classList.add('ocr-autofilled');
    setTimeout(() => el.classList.remove('ocr-autofilled'), 3000);
  }

  /**
   * Muestra u oculta el banner de estado del OCR.
   */
  function _mostrarEstadoOcr(visible, texto) {
    const banner   = document.getElementById('ocr-status-banner');
    const textEl   = document.getElementById('ocr-status-text');
    const btnScan  = document.getElementById('btn-scan-ticket');

    if (!banner) return;
    banner.style.display = visible ? 'flex' : 'none';
    if (textEl && texto)  textEl.textContent = texto;
    if (btnScan) btnScan.disabled = visible;
  }

  /**
   * Extrae el token JWT del localStorage si existe.
   */
  function _getAuthToken() {
    try {
      const raw = localStorage.getItem('tamanaco_auth_user');
      if (raw) {
        const user = JSON.parse(raw);
        return user?.token || '';
      }
    } catch (e) {}
    return '';
  }

  // ----------------------------------------------------------
  // MODAL DE VISTA PREVIA Y EXPORTACIÓN A EXCEL (APACHE POI)
  // ----------------------------------------------------------
  function abrirModalExcelPreview() {
    const modal = document.getElementById('modal-excel-preview');
    const tbody = document.getElementById('excel-preview-tbody');
    const lblRango = document.getElementById('excel-preview-rango');
    const lblTotalVjs = document.getElementById('excel-preview-total-vjs');
    const lblTotalTon = document.getElementById('excel-preview-total-ton');

    if (!modal || !tbody) return;

    // Obtener los despachos correspondientes según el modo actual (día o semana)
    let despachosFiltrados = [];
    let textoRango = '';

    if (state.modoSemanal) {
      const lunesStr = Utils.getWeekStart(state.fechaActual);
      const lunes = new Date(lunesStr + 'T00:00:00');
      const domingo = new Date(lunes);
      domingo.setDate(domingo.getDate() + 6);
      const domStr = domingo.toISOString().split('T')[0];

      despachosFiltrados = state.despachos.filter(d => {
        if (!d.fecha) return false;
        const f = d.fecha.split(' ')[0];
        return f >= lunesStr && f <= domStr;
      });

      textoRango = `${Utils.formatDate(lunesStr)} al ${Utils.formatDate(domStr)} (Semana)`;
    } else {
      despachosFiltrados = state.despachos.filter(d => {
        if (!d.fecha) return false;
        return d.fecha.split(' ')[0] === state.fechaActual;
      });

      textoRango = `${Utils.formatDate(state.fechaActual)}`;
    }

    if (lblRango) lblRango.textContent = textoRango;

    // Inyectar filas en el modal
    tbody.innerHTML = '';
    let totalPeso = 0;

    if (despachosFiltrados.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:20px;">No hay despachos registrados en este periodo.</td></tr>`;
    } else {
      despachosFiltrados.forEach(d => {
        const peso = parseFloat(d.peso) || 0;
        totalPeso += peso;

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="font-family:monospace; text-align:center;">#${d.id || '—'}</td>
          <td style="text-align:center;">${Utils.formatDate(d.fecha)}</td>
          <td><strong>${d.chofer || '—'}</strong></td>
          <td style="text-align:center;"><span style="font-weight:600;">${d.placa || '—'}</span></td>
          <td>${(d.mina || '—').toUpperCase()}</td>
          <td style="text-align:right; font-weight:600;">${Utils.formatNumber(peso, 2)}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    // Totales
    if (lblTotalVjs) lblTotalVjs.textContent = despachosFiltrados.length;
    if (lblTotalTon) lblTotalTon.textContent = Utils.formatNumber(totalPeso, 2);

    modal.style.display = 'flex';
  }

  function cerrarModalExcelPreview() {
    const modal = document.getElementById('modal-excel-preview');
    if (modal) modal.style.display = 'none';
  }

  function confirmarDescargaExcel() {
    const fecha = state.fechaActual || document.getElementById('d-filtroFecha')?.value || Utils.today();
    cerrarModalExcelPreview();
    Toast.show('Descargando archivo Excel...', 'info');
    window.location.href = `/api/v1/despachos/exportar/excel?fecha=${encodeURIComponent(fecha)}`;
  }

  function configurarListenersModalExcel() {
    const btnCerrar = document.getElementById('btn-cerrar-excel-modal');
    const btnCancelar = document.getElementById('btn-cancelar-excel');
    const btnConfirmar = document.getElementById('btn-confirmar-descarga-excel');
    const modal = document.getElementById('modal-excel-preview');

    if (btnCerrar) btnCerrar.onclick = cerrarModalExcelPreview;
    if (btnCancelar) btnCancelar.onclick = cerrarModalExcelPreview;
    if (btnConfirmar) btnConfirmar.onclick = confirmarDescargaExcel;

    if (modal) {
      modal.onclick = (e) => {
        if (e.target === modal) cerrarModalExcelPreview();
      };
    }
  }

  // ----------------------------------------------------------
  // INICIALIZACIÓN
  // ----------------------------------------------------------
  function init() {
    cachearElementos();
    configurarAutoChoferPorPlaca();
    configurarListenersModalExcel();

    if (!state.fechaActual) {
      state.fechaActual = Utils.today();
    }
    const filtroFecha = document.getElementById('d-filtroFecha');
    if (filtroFecha && !filtroFecha.value) {
      filtroFecha.value = state.fechaActual;
    }

    state.iniciado = true;
    cargar();
  }

  return {
    init,
    guardar,
    editar,
    eliminar,
    eliminarTicket,
    limpiarFormulario,
    cambiarDia,
    irAHoy,
    alCambiarFecha,
    generarPDF,
    abrirModalExcelPreview,
    cerrarModalExcelPreview,
    confirmarDescargaExcel,
    exportarExcelBackend: abrirModalExcelPreview,
    cargarCatalogos,
    abrirSelectorTicket,
    abrirEscanerTicket,
    toggleModoSemanal,
    cambiarPagina,
    buscarChoferPorCedula
  };

})();

// ============================================================
// FUNCIONES GLOBALES DIRECTAS (onclick)
// ============================================================

window.abrirModalExcel = function() {
    const modal = document.getElementById('modal-excel-preview');
    if (!modal) {
        alert("Error: No se encontró el contenedor modal-excel-preview en el DOM.");
        return;
    }

    // Copiar filas de la tabla principal
    const tablaPrincipal = document.querySelector('#d-tabla tbody') || document.querySelector('table tbody');
    const tbodyModal = document.getElementById('excel-modal-tbody');
    let totalTon = 0;
    let totalVjs = 0;

    if (tablaPrincipal && tbodyModal) {
        tbodyModal.innerHTML = '';
        const filas = tablaPrincipal.querySelectorAll('tr');

        filas.forEach(tr => {
            // Ignorar filas de paginación o vacías
            if (tr.querySelector('td[colspan]')) return;

            const tds = tr.querySelectorAll('td');
            if (tds.length >= 6) {
                totalVjs++;
                const trModal = document.createElement('tr');

                // Clonar las 6 columnas de datos
                for (let i = 0; i < 6; i++) {
                    const tdClon = document.createElement('td');
                    tdClon.innerHTML = tds[i].innerHTML;
                    if (i === 0 || i === 1 || i === 3) tdClon.style.textAlign = 'center';
                    if (i === 5) {
                        tdClon.style.textAlign = 'right';
                        const match = tds[i].textContent.replace(',', '.').match(/[\d.]+/);
                        if (match) totalTon += parseFloat(match[0]) || 0;
                    }
                    trModal.appendChild(tdClon);
                }
                tbodyModal.appendChild(trModal);
            }
        });

        if (totalVjs === 0) {
            tbodyModal.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:20px;">No hay despachos registrados en este periodo.</td></tr>`;
        }
    }

    // Calcular y poblar totales
    const totalVjsElem = document.getElementById('excel-modal-total-vjs');
    const totalTonElem = document.getElementById('excel-modal-total-ton');
    const rangoElem = document.getElementById('excel-modal-rango');
    const inputFecha = document.getElementById('d-filtroFecha');

    if (totalVjsElem) totalVjsElem.textContent = totalVjs;
    if (totalTonElem) totalTonElem.textContent = (typeof Utils !== 'undefined' && Utils.formatNumber) ? Utils.formatNumber(totalTon, 2) : totalTon.toFixed(2);
    if (rangoElem) {
        const fechaVal = inputFecha ? inputFecha.value : (typeof Utils !== 'undefined' ? Utils.today() : '');
        rangoElem.textContent = (typeof Utils !== 'undefined' && Utils.formatDate) ? Utils.formatDate(fechaVal) : fechaVal;
    }

    modal.style.setProperty('display', 'flex', 'important');
};

window.cerrarModalExcel = function() {
    const modal = document.getElementById('modal-excel-preview');
    if (modal) modal.style.setProperty('display', 'none', 'important');
};

window.descargarExcelConfirmado = function() {
    const fechaInput = document.getElementById('d-filtroFecha') || document.querySelector('input[type="date"]');
    const fecha = fechaInput ? fechaInput.value : '';
    if (typeof Toast !== 'undefined') Toast.show('Descargando archivo Excel (.xlsx)...', 'info');
    window.location.href = `/api/v1/despachos/exportar/excel?fecha=${encodeURIComponent(fecha)}`;
    window.cerrarModalExcel();
};

/* ============================================================
   TICKET DIGITAL DE PESAJE CON CÓDIGO QR Y WHATSAPP
   ============================================================ */

let ticketActualData = null;

// Función principal con múltiples alias para evitar errores de llamado
function ejecutarAperturaTicket(param) {
    try {
        let despacho = null;

        // 1. Obtener objeto de despacho
        if (typeof param === 'object' && param !== null) {
            despacho = param;
        } else {
            const idNum = parseInt(param);
            if (window.despachosData && Array.isArray(window.despachosData)) {
                despacho = window.despachosData.find(d => d.id === idNum);
            }
            if (!despacho && window.listaDespachos && Array.isArray(window.listaDespachos)) {
                despacho = window.listaDespachos.find(d => d.id === idNum);
            }
            if (!despacho) {
                const state = (typeof DespachoModule !== 'undefined' && DespachoModule.getState) ? DespachoModule.getState() : null;
                const despachos = state?.despachos || [];
                despacho = despachos.find(d => d.id === idNum);
            }
            if (!despacho) {
                const fila = document.querySelector(`tr[data-id="${param}"]`) || document.getElementById(`fila-despacho-${param}`);
                if (fila) {
                    despacho = {
                        id: param,
                        fecha: fila.querySelector('.col-fecha')?.innerText.trim() || new Date().toLocaleDateString(),
                        chofer: fila.querySelector('.col-chofer')?.innerText.trim() || '—',
                        placa: fila.querySelector('.col-placa')?.innerText.trim() || '—',
                        mina: fila.querySelector('.col-mina')?.innerText.trim() || '—',
                        pesoNeto: parseFloat(fila.querySelector('.col-peso')?.innerText.replace(/[^\d.-]/g, '')) || 0
                    };
                }
            }
        }

        if (!despacho) {
            despacho = { id: param || '—', fecha: new Date().toLocaleDateString(), chofer: '—', placa: '—', mina: '—', pesoNeto: 0 };
        }

        ticketActualData = despacho;

        // 2. Asignar valores a la vista de forma segura
        const elId = document.getElementById('ticket-id');
        const elFecha = document.getElementById('ticket-fecha');
        const elChofer = document.getElementById('ticket-chofer');
        const elPlaca = document.getElementById('ticket-placa');
        const elMina = document.getElementById('ticket-mina');
        const elPeso = document.getElementById('ticket-peso');

        if (elId) elId.innerText = '#' + (despacho.id || '—');
        if (elFecha) elFecha.innerText = despacho.fechaHora || despacho.fecha || new Date().toLocaleString();
        if (elChofer) elChofer.innerText = (despacho.chofer || despacho.nombreChofer || '—').toUpperCase();
        if (elPlaca) elPlaca.innerText = (despacho.placa || despacho.placaVehiculo || '—').toUpperCase();
        if (elMina) elMina.innerText = (despacho.mina || despacho.minaNombre || '—').toUpperCase();
        
        const pesoNum = parseFloat(despacho.pesoNeto || despacho.peso || 0);
        if (elPeso) elPeso.innerText = pesoNum.toFixed(2) + ' Ton';

        // 3. Generar Código QR defensivamente
        const qrContainer = document.getElementById('ticket-qrcode');
        if (qrContainer) {
            qrContainer.innerHTML = '';
            if (typeof QRCode !== 'undefined') {
                try {
                    const origin = window.location.origin;
                    const comprobanteFoto = despacho.comprobanteUrl || despacho.ticketUrl || despacho.fotoUrl || null;
                    const urlVerificacion = comprobanteFoto 
                        ? `${origin}${comprobanteFoto.startsWith('/') ? comprobanteFoto : '/' + comprobanteFoto}`
                        : `${origin}/comprobante-visor.html?id=${despacho.id}`;

                    new QRCode(qrContainer, {
                        text: urlVerificacion,
                        width: 110,
                        height: 110,
                        colorDark: "#0f172a",
                        colorLight: "#ffffff",
                        correctLevel: QRCode.CorrectLevel.M
                    });
                } catch (eQr) {
                    console.warn("No se pudo generar QR:", eQr);
                }
            }
        }

        // 4. Cargar Imagen del Ticket Físico defensivamente
        const seccionFoto = document.getElementById('ticket-foto-romana-seccion');
        const imgFoto = document.getElementById('ticket-foto-romana-img');
        if (seccionFoto && imgFoto) {
            seccionFoto.style.display = 'none';
            imgFoto.src = '';

            const idDespacho = despacho.id;
            if (idDespacho && idDespacho !== '—') {
                const testImg = new Image();
                testImg.onload = function() {
                    imgFoto.src = `/api/v1/despachos/${idDespacho}/foto?t=${Date.now()}`;
                    seccionFoto.style.display = 'block';
                };
                testImg.onerror = function() {
                    seccionFoto.style.display = 'none';
                };
                testImg.src = `/api/v1/despachos/${idDespacho}/foto`;
            }
        }

        // 5. ABRIR EL MODAL GARANTIZADO
        const modal = document.getElementById('modal-ticket-despacho');
        if (modal) {
            modal.style.display = 'flex';
        } else {
            console.error("No se encontró el elemento #modal-ticket-despacho en el DOM.");
        }

    } catch (err) {
        console.error("Error al abrir ticket:", err);
        const modal = document.getElementById('modal-ticket-despacho');
        if (modal) modal.style.display = 'flex';
    }
}

// Alias globales para cubrir cualquier llamada desde el HTML
window.abrirModalTicket = ejecutarAperturaTicket;
window.mostrarTicketDespacho = ejecutarAperturaTicket;
window.verTicket = ejecutarAperturaTicket;
window.generarTicket = ejecutarAperturaTicket;

window.cerrarModalTicket = function() {
    const modal = document.getElementById('modal-ticket-despacho');
    if (modal) modal.style.display = 'none';
};

window.imprimirTicketDirecto = function() {
    document.body.classList.add('imprimiendo-ticket-modo');
    window.print();
    setTimeout(() => {
        document.body.classList.remove('imprimiendo-ticket-modo');
    }, 1000);
};

window.compartirTicketWhatsApp = async function() {
    if (!ticketActualData) return;

    const ticketElement = document.getElementById('ticket-imprimible-area');
    const idDespacho = ticketActualData.id;

    // 1. Texto institucional limpio SIN ENLACES NI URLs INTERNAS
    const textoWA = 
`╔═══════════════════════════════╗
   🏢 *CARBONES TAMANACO C.A.*
   🧾 *COMPROBANTE DE BÁSCULA #${idDespacho}*
╚═══════════════════════════════╝

📅 *Fecha y Hora:* ${ticketActualData.fechaHoraFormateada || ticketActualData.fechaHora || ticketActualData.fecha}
🚛 *Chofer:* ${ticketActualData.chofer}
🔢 *Placa:* ${ticketActualData.placa}
⛰️ *Mina:* ${ticketActualData.mina}
───────────────────────────────
⚖️ *PESO NETO:* *${(parseFloat(ticketActualData.pesoNeto || ticketActualData.peso) || 0).toFixed(2)} Ton*
───────────────────────────────

🔒 _Comprobante oficial de pesaje en patio._`;

    // 2. Renderizar la tarjeta completa en imagen con html2canvas
    let imagenBlob = null;
    let dataUrlImagen = null;
    if (typeof html2canvas === 'function' && ticketElement) {
        try {
            const canvas = await html2canvas(ticketElement, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
                allowTaint: true,
                logging: false
            });
            dataUrlImagen = canvas.toDataURL('image/png');
            imagenBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        } catch (e) {
            console.warn("No se pudo renderizar la tarjeta en imagen:", e);
        }
    }

    // 3. EN TELÉFONOS / TABLETS: Compartir archivo nativo
    if (imagenBlob && navigator.share) {
        try {
            const archivoImagen = new File([imagenBlob], `Ticket_Tamanaco_${idDespacho}.png`, { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [archivoImagen] })) {
                await navigator.share({
                    files: [archivoImagen],
                    title: `Ticket Báscula #${idDespacho}`,
                    text: textoWA
                });
                return;
            }
        } catch (errShare) {
            if (errShare.name === 'AbortError') return;
            console.warn("Web Share cancelado, abriendo WhatsApp Web:", errShare);
        }
    }

    // 4. EN PC (ESCRITORIO): Descargar la imagen automáticamente y abrir WhatsApp Web
    if (dataUrlImagen) {
        const linkDescarga = document.createElement('a');
        linkDescarga.download = `Ticket_Bascula_${idDespacho}.png`;
        linkDescarga.href = dataUrlImagen;
        document.body.appendChild(linkDescarga);
        linkDescarga.click();
        document.body.removeChild(linkDescarga);

        if (typeof Toast !== 'undefined' && Toast.show) {
            Toast.show("¡Imagen del ticket descargada! Adjúntala en el chat de WhatsApp.", "success");
        } else if (typeof mostrarToast === 'function') {
            mostrarToast("¡Imagen del ticket descargada! Adjúntala en el chat de WhatsApp.", "success");
        }
    }

    // Abrir WhatsApp Web con el texto limpio
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(textoWA)}`, '_blank');
};

/* ============================================================
   REPORTE OFICIAL DE DESPACHOS (IMPRESIÓN Y PDF)
   ============================================================ */

window.imprimirReporteDespachos = function(listaParam, textoRangoParam) {
    // 1. Usar la lista del período actual pasada por DespachoModule.generarPDF() (día u hoy
    // por defecto, o semana). Si por alguna razón se llama sin parámetros, respaldo legado.
    const lista = Array.isArray(listaParam) ? listaParam : (window.despachosFiltrados || window.despachosData || window.listaDespachos || []);
    const textoRango = textoRangoParam || Utils.formatDate(Utils.today());

    if (!lista || lista.length === 0) {
        if (typeof Toast !== 'undefined' && Toast.show) Toast.show("No hay despachos para imprimir en este período.", "info");
        else if (typeof mostrarToast === 'function') mostrarToast("No hay despachos para imprimir en este período.", "info");
        else alert("No hay despachos para imprimir en este período.");
        return;
    }

    // 2. Calcular totales del día
    let totalViajes = lista.length;
    let totalToneladas = 0;

    let filasHTML = '';
    lista.forEach(d => {
        const id = d.id || '—';
        const fechaBase = d.fechaHoraFormateada || d.fechaHora || (d.fecha ? Utils.formatDate(d.fecha) : null) || '—';
        const fecha = (fechaBase !== '—' && d.hora) ? `${fechaBase} ${d.hora}` : fechaBase;
        const chofer = (d.chofer || d.nombreChofer || '—').toUpperCase();
        const placa = (d.placa || d.placaVehiculo || '—').toUpperCase();
        const mina = (d.mina || d.minaNombre || '—').toUpperCase();
        const peso = parseFloat(d.pesoNeto || d.peso || 0);

        totalToneladas += peso;

        filasHTML += `
            <tr style="border-bottom: 1px solid #cbd5e1;">
                <td style="padding: 6px 8px; text-align: center; font-weight: bold;">#${id}</td>
                <td style="padding: 6px 8px;">${fecha}</td>
                <td style="padding: 6px 8px;">${chofer}</td>
                <td style="padding: 6px 8px; text-align: center; font-weight: bold;">${placa}</td>
                <td style="padding: 6px 8px;">${mina}</td>
                <td style="padding: 6px 8px; text-align: right; font-weight: bold;">${peso.toFixed(2)} Ton</td>
            </tr>
        `;
    });

    const fechaHoy = new Date().toLocaleDateString('es-CO');

    // 3. Renderizar documento de impresión oficial
    const ventana = window.open('', '_blank');
    if (!ventana) return;
    ventana.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Reporte Oficial de Despachos — Carbones Tamanaco C.A.</title>
            <style>
                @page { size: letter portrait; margin: 15mm 12mm; }
                * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; padding: 10px; margin: 0; font-size: 10pt; }
                .page-wrap { position: relative; }
                .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.05; width: 300px; z-index: 0; pointer-events: none; }
                .contenido { position: relative; z-index: 1; }
                .header-box { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; }
                .header-box img.logo-header { height: 60px; width: auto; display: block; margin: 0 auto 15px auto; background: transparent !important; border: none; }
                .subtitulo { font-size: 0.85rem; font-weight: 700; color: #475569; text-transform: uppercase; margin-top: 3px; }
                .meta-info { display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 12px; background: #f8fafc; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 4px; }
                table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9pt; }
                th { background: #0f172a; color: #ffffff; padding: 8px; text-align: left; font-size: 8.5pt; text-transform: uppercase; }
                tfoot tr { background: #f1f5f9; font-weight: bold; border-top: 2px solid #0f172a; }
                .firmas { display: flex; justify-content: space-between; margin-top: 60px; }
                .firma-item { width: 200px; border-top: 1px solid #0f172a; text-align: center; font-size: 8pt; padding-top: 4px; font-weight: 600; }
            </style>
        </head>
        <body>
          <div class="page-wrap">
            <img class="watermark" src="/img/logo.svg" alt="Watermark" />
            <div class="contenido">
            <div class="header-box">
                <img class="logo-header" src="/img/logo.svg" alt="Carbones Tamanaco" style="height: 60px; display: block; margin: 0 auto 15px auto;"
                     onload="if(!window.__reporteImpreso){window.__reporteImpreso=true; window.print();}"
                     onerror="if(!window.__reporteImpreso){window.__reporteImpreso=true; window.print();}">
                <div class="subtitulo">REPORTE OFICIAL DE DESPACHOS DE MINERAL</div>
            </div>

            <div class="meta-info">
                <div><strong>Período Reportado:</strong> ${textoRango}</div>
                <div><strong>Fecha de Emisión:</strong> ${fechaHoy}</div>
                <div><strong>Control:</strong> Despachos en Báscula</div>
            </div>

            <table style="border: 1px solid #cbd5e1;">
                <thead>
                    <tr>
                        <th style="text-align: center; width: 50px;">ID</th>
                        <th style="width: 130px;">FECHA / HORA</th>
                        <th>CHOFER</th>
                        <th style="text-align: center; width: 85px;">PLACA</th>
                        <th>MINA / ORIGEN</th>
                        <th style="text-align: right; width: 110px;">PESO NETO</th>
                    </tr>
                </thead>
                <tbody>
                    ${filasHTML}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="3" style="padding: 10px 8px; font-weight: 800;">
                            TOTAL GENERAL: ${totalViajes} ${totalViajes === 1 ? 'viaje' : 'viajes'}
                        </td>
                        <td colspan="2" style="padding: 10px 8px; text-align: right; font-weight: 800; text-transform: uppercase;">
                            TOTAL PESO DEL DÍA:
                        </td>
                        <td style="padding: 10px 8px; text-align: right; font-weight: 900; font-size: 10.5pt; color: #0f172a;">
                            ${totalToneladas.toFixed(2)} Ton
                        </td>
                    </tr>
                </tfoot>
            </table>

            <div class="firmas">
                <div class="firma-item">ELABORADO POR<br/><span style="color: #64748b; font-size: 7.5pt;">Operador de Báscula</span></div>
                <div class="firma-item">REVISADO POR<br/><span style="color: #64748b; font-size: 7.5pt;">Jefe de Patio / Logística</span></div>
                <div class="firma-item">APROBADO POR<br/><span style="color: #64748b; font-size: 7.5pt;">Administración</span></div>
            </div>
            </div><!-- /contenido -->
          </div><!-- /page-wrap -->
          <script>
            // Red de seguridad: si por alguna razón el logo no dispara onload/onerror
            // (ej. caché agresiva del navegador), igual se imprime tras un breve margen.
            setTimeout(function () {
              if (!window.__reporteImpreso) {
                window.__reporteImpreso = true;
                window.print();
              }
            }, 1200);
          </script>
        </body>
        </html>
    `);
    ventana.document.close();
};

window.generarReportePDFDespachos = window.imprimirReporteDespachos;

