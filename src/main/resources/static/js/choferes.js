/* ============================================================
   choferes.js — Auditoría / Choferes: historial por cédula
   ============================================================ */

const ChoferesModule = (() => {

  async function init() {
    await cargarHistorial();
  }

  async function cargarHistorial() {
    const tbody = document.getElementById('ch-tabla-choferes-body');
    if (!tbody) return;

    try {
      const data = await Api.get('/v1/choferes/historial');
      renderTabla(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('No se pudo cargar el historial de choferes:', e);
      tbody.innerHTML = `<tr><td colspan="3" class="text-center" style="color:var(--t-low); padding:24px;">No se pudo cargar el historial de choferes</td></tr>`;
    }
  }

  function renderTabla(choferes) {
    const tbody = document.getElementById('ch-tabla-choferes-body');
    if (!tbody) return;

    if (!choferes.length) {
      tbody.innerHTML = `<tr><td colspan="3" class="text-center" style="color:var(--t-low); padding:24px;">Aún no hay choferes registrados por cédula. Se crean automáticamente al guardar un despacho con la cédula del chofer.</td></tr>`;
      return;
    }

    tbody.innerHTML = choferes.map(c => `
      <tr>
        <td><span class="font-mono">${c.cedula || '—'}</span></td>
        <td><span class="fw-600 text-high">${c.nombreCompleto || '—'}</span></td>
        <td class="text-right">${c.viajes != null ? c.viajes : 0}</td>
      </tr>
    `).join('');
  }

  return { init, cargarHistorial };

})();
