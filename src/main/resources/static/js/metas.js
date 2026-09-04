const MetasModule = (() => {
  let state = {
    iniciado: false,
    cuotaActiva: null,
    editandoCuotaId: null
  };

  function formatPeriodo(periodoStr) {
    if (!periodoStr) return '-';
    if (periodoStr.includes('-')) {
      const [year, month] = periodoStr.split('-');
      const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      if(month >= 1 && month <= 12) return `${meses[parseInt(month)-1]} ${year}`;
    }
    return periodoStr;
  }

  async function cargarCuotaActiva() {
    try {
      // Mostrar botón solo a admins
      const btnConfig = document.getElementById('btn-config-cuota');
      const btnEdit = document.getElementById('btn-edit-cuota');
      if (btnConfig) {
        btnConfig.style.display = Auth.isAdmin() ? 'inline-flex' : 'none';
      }

      const cuota = await Api.get('/despachos/cuota-activa');
      state.cuotaActiva = cuota;
      
      if (btnEdit) {
        btnEdit.style.display = (Auth.isAdmin() && cuota) ? 'inline-flex' : 'none';
      }

      const container = document.getElementById('m-cuota-container');
      const emptyState = document.getElementById('m-cuota-empty');

      if (!cuota) {
        if(container) container.style.display = 'none';
        if(emptyState) emptyState.style.display = 'block';
        return;
      }
      
      if(container) container.style.display = 'block';
      if(emptyState) emptyState.style.display = 'none';
      
      const meta = cuota.metaToneladas || 0;
      const entregado = cuota.toneladasEntregadas || 0;
      const restante = Math.max(0, meta - entregado);
      const porcentaje = meta > 0 ? Math.min(100, Math.round((entregado / meta) * 100)) : 0;
      
      document.getElementById('m-cuota-cliente').textContent = cuota.cliente + (cuota.periodo ? ` (${formatPeriodo(cuota.periodo)})` : '');
      document.getElementById('m-cuota-porcentaje').textContent = porcentaje + '%';
      document.getElementById('m-cuota-entregado').textContent = `Entregado: ${Utils.formatNumber(entregado)} TON`;
      document.getElementById('m-cuota-meta').textContent = `Meta: ${Utils.formatNumber(meta)} TON`;
      document.getElementById('m-cuota-restante').textContent = `Faltan: ${Utils.formatNumber(restante)} TON`;
      
      const barra = document.getElementById('m-cuota-barra');
      if (barra) {
        barra.style.width = porcentaje + '%';
        if (porcentaje >= 100) {
          barra.style.background = 'var(--c-green)';
          document.getElementById('m-cuota-porcentaje').style.color = 'var(--c-green)';
        } else {
          barra.style.background = 'var(--c-blue)';
          document.getElementById('m-cuota-porcentaje').style.color = 'var(--c-blue)';
        }
      }
    } catch (e) {
      console.error('Error cargando cuota:', e);
      document.getElementById('m-cuota-cliente').textContent = 'Error de conexión o datos no disponibles.';
    }
  }

  function abrirModalCuota() {
    state.editandoCuotaId = null;
    document.getElementById('mc-cliente').value = '';
    document.getElementById('mc-meta').value = '';
    document.getElementById('mc-periodo').value = '';
    document.getElementById('mc-adelanto').value = '';
    document.getElementById('mc-precio').value = '';
    document.querySelector('#modal-cuota .card-header h2').textContent = 'Establecer Nueva Cuota';
    document.getElementById('modal-cuota').style.display = 'flex';
  }

  function editarCuotaActiva() {
    if (!state.cuotaActiva) return;
    const c = state.cuotaActiva;
    state.editandoCuotaId = c.id;
    document.getElementById('mc-cliente').value = c.cliente || '';
    document.getElementById('mc-meta').value = c.metaToneladas || '';
    document.getElementById('mc-periodo').value = c.periodo || '';
    document.getElementById('mc-adelanto').value = c.toneladasEntregadas || 0;
    document.getElementById('mc-precio').value = c.precioVentaUsd || '';
    document.querySelector('#modal-cuota .card-header h2').textContent = 'Editar Meta Activa';
    document.getElementById('modal-cuota').style.display = 'flex';
  }

  function cerrarModalCuota() {
    document.getElementById('modal-cuota').style.display = 'none';
    state.editandoCuotaId = null;
  }

  async function cargarHistorial() {
    try {
      const historial = await Api.get('/despachos/cuotas/historial');
      const tbody = document.querySelector('#m-tabla-historial tbody');
      if (!tbody) return;

      tbody.innerHTML = '';
      if (!historial || historial.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--t-low);">No hay metas pasadas registradas</td></tr>';
        return;
      }

      historial.forEach(c => {
        const meta = c.metaToneladas || 0;
        const entregado = c.toneladasEntregadas || 0;
        const porcentaje = meta > 0 ? Math.min(100, Math.round((entregado / meta) * 100)) : 0;
        
        let tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${c.cliente}</td>
          <td>${formatPeriodo(c.periodo)}</td>
          <td class="text-right fw-600">${Utils.formatNumber(meta)} Ton</td>
          <td class="text-right fw-600">${Utils.formatNumber(entregado)} Ton</td>
          <td class="text-right">
            <span class="badge ${porcentaje >= 100 ? 's-green' : 's-blue'}">${porcentaje}%</span>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } catch (e) {
      console.error('Error cargando historial de metas:', e);
      const tbody = document.querySelector('#m-tabla-historial tbody');
      if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="text-red text-center">Error al cargar historial</td></tr>';
    }
  }

  async function guardarCuota() {
    const cliente = document.getElementById('mc-cliente').value.trim();
    const meta = parseFloat(document.getElementById('mc-meta').value);
    let periodo = document.getElementById('mc-periodo').value.trim();
    const precio = parseFloat(document.getElementById('mc-precio').value) || 0;
    const entregadas = parseFloat(document.getElementById('mc-adelanto').value) || 0;
    
    if (!cliente || !meta || meta <= 0) {
      Toast.show('Debes especificar un cliente y una meta válida', 'warning');
      return;
    }
    
    const payload = { cliente, metaToneladas: meta, periodo, precioVentaUsd: precio, toneladasEntregadas: entregadas };
    
    try {
      if (state.editandoCuotaId) {
        await Api.put('/despachos/cuota/' + state.editandoCuotaId, payload);
        Toast.show('Meta actualizada correctamente', 'success');
      } else {
        await Api.post('/despachos/cuota', payload);
        Toast.show('Nueva meta establecida', 'success');
      }
      cerrarModalCuota();
      cargarCuotaActiva();
      cargarHistorial();
    } catch (e) {
      Toast.show('Error al guardar la meta', 'error');
    }
  }

  function init() {
    if (state.iniciado) {
      cargarCuotaActiva();
      cargarHistorial();
      return;
    }
    state.iniciado = true;
    cargarCuotaActiva();
    cargarHistorial();
  }

  return {
    init,
    cargarCuotaActiva,
    cargarHistorial,
    abrirModalCuota,
    editarCuotaActiva,
    cerrarModalCuota,
    guardarCuota
  };

})();
