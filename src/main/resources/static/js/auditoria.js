const AuditoriaModule = (function() {
  let state = {
    registros: [],
    iniciado: false
  };

  const els = {
    tbody: null
  };

  function cachearElementos() {
    els.tbody = document.querySelector('#a-tabla-auditoria tbody');
  }

  async function cargarHistorial() {
    try {
      const data = await Api.get('/auditoria');
      state.registros = data;
      renderTabla();
    } catch (e) {
      console.error(e);
      if (els.tbody) {
        els.tbody.innerHTML = '<tr><td colspan="5" class="text-center text-red">Error al cargar la bitácora</td></tr>';
      }
    }
  }

  function getBadgeColor(accion) {
    switch (accion.toUpperCase()) {
      case 'CREAR': return 'badge-green';
      case 'EDITAR': return 'badge-amber';
      case 'ELIMINAR': return 'badge-red';
      case 'APROBAR': return 'badge-blue';
      default: return 'badge-default';
    }
  }

  function renderTabla() {
    if (!els.tbody) return;
    els.tbody.innerHTML = '';
    if (state.registros.length === 0) {
      els.tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay registros de auditoría</td></tr>';
      return;
    }

    state.registros.forEach(r => {
      const tr = document.createElement('tr');
      const fecha = r.fecha ? new Date(r.fecha).toLocaleString('es-VE') : '-';
      const badgeCls = getBadgeColor(r.accion);
      
      tr.innerHTML = `
        <td style="font-family: monospace; font-size: 11px;">${fecha}</td>
        <td><strong>${r.usuario}</strong></td>
        <td><span class="badge ${badgeCls}">${r.accion}</span></td>
        <td><span style="font-size:11px; background:var(--bg-elevated); padding:2px 6px; border-radius:4px; border:1px solid var(--b-default);">${r.modulo}</span></td>
        <td style="font-size:11.5px; color:var(--t-high); max-width:400px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${r.detalle}">${r.detalle}</td>
      `;
      els.tbody.appendChild(tr);
    });
  }

  function init() {
    if (typeof Auth !== 'undefined' && !Auth.isAdmin()) {
      Toast.show('Acceso denegado. Solo administradores pueden ver la auditoría.', 'error');
      Router.navigate('despachos');
      return;
    }

    if (state.iniciado) {
      cargarHistorial();
      return;
    }
    
    cachearElementos();
    cargarHistorial();
    
    state.iniciado = true;
  }

  return { init, cargarHistorial };
})();
