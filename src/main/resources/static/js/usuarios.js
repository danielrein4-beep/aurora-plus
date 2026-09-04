/* ============================================================
   usuarios.js — Módulo de Gestión de Usuarios y Roles
   Exclusivo para Administradores
   ============================================================ */

const UsuariosModule = (() => {

  let state = {
    usuarios: [],
    editandoUsuarioId: null
  };

  async function cargarUsuarios() {
    if (!Auth.isAdmin()) return;
    try {
      state.usuarios = await Api.get('/usuarios');
      renderTablaUsuarios();
    } catch (e) {
      // Error manejado por Api
    }
  }

  function renderTablaUsuarios() {
    const tbody = document.getElementById('u-tabla-usuarios');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (state.usuarios.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5">
            <link rel="stylesheet" href="/css/style.css?v=10">
            <div class="empty-state">
              <div class="empty-icon">—</div>
              <h3>Sin usuarios registrados</h3>
            </div>
          </td>
        </tr>`;
      return;
    }

    state.usuarios.forEach(u => {
      const isCurrent = Auth.getCurrentUser() && Auth.getCurrentUser().id === u.id;
      const tr = document.createElement('tr');

      let badgeClass = 'badge-blue';
      if (u.rol === 'ADMIN') badgeClass = 'badge-purple';
      if (u.rol === 'DESPACHADOR') badgeClass = 'badge-yellow';
      if (u.rol === 'CONSULTA') badgeClass = 'badge-default';

      tr.innerHTML = `
        <td>
          <strong>${u.nombre}</strong>
          ${isCurrent ? '<span class="badge badge-green" style="font-size:10px; margin-left:6px;">Tú</span>' : ''}
        </td>
        <td>${u.email}</td>
        <td><span class="badge ${badgeClass}">${u.rol}</span></td>
        <td>
          <span class="badge ${u.activo ? 'badge-green' : 'badge-red'}">
            ${u.activo ? 'Activo' : 'Inactivo'}
          </span>
        </td>
        <td class="no-print">
          <div class="td-actions">
            <button class="btn btn-warn btn-sm" onclick="UsuariosModule.editarUsuario(${u.id})">Editar</button>
            ${!isCurrent ? `
              <button class="btn btn-danger btn-sm" onclick="UsuariosModule.desactivarUsuario(${u.id})">
                ${u.activo ? 'Desactivar' : 'Activar'}
              </button>
            ` : ''}
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  async function guardarUsuario() {
    const nombre = document.getElementById('u-nombre').value.trim();
    const email = document.getElementById('u-email').value.trim();
    const password = document.getElementById('u-password').value;
    const rol = document.getElementById('u-rol').value;
    const activo = document.getElementById('u-activo').value === 'true';

    if (!nombre || !email || !rol) {
      Toast.show('Por favor, completa nombre, correo y rol', 'warning');
      return;
    }

    if (!state.editandoUsuarioId && (!password || password.trim() === '')) {
      Toast.show('La contraseña es obligatoria para nuevos usuarios', 'warning');
      return;
    }

    const payload = { nombre, email, rol, activo };
    if (password && password.trim() !== '') {
      payload.password = password;
    }

    try {
      if (state.editandoUsuarioId) {
        await Api.put(`/usuarios/${state.editandoUsuarioId}`, payload);
        Toast.show('Usuario actualizado con éxito', 'success');
      } else {
        await Api.post('/usuarios', payload);
        Toast.show('Usuario creado con éxito', 'success');
      }
      limpiarForm();
      cargarUsuarios();
    } catch (e) {}
  }

  function editarUsuario(id) {
    const u = state.usuarios.find(x => x.id === id);
    if (!u) return;

    state.editandoUsuarioId = id;

    document.getElementById('u-nombre').value = u.nombre;
    document.getElementById('u-email').value = u.email;
    document.getElementById('u-password').value = '';
    document.getElementById('u-password').placeholder = 'Dejar en blanco para no cambiarla';
    document.getElementById('u-rol').value = u.rol;
    document.getElementById('u-activo').value = u.activo ? 'true' : 'false';

    document.getElementById('u-form-title').textContent = `Editando usuario: ${u.nombre}`;
    document.getElementById('u-btn-cancelar').style.display = 'inline-flex';

    document.getElementById('u-form-title').closest('.card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function desactivarUsuario(id) {
    const u = state.usuarios.find(x => x.id === id);
    if (!u) return;

    const accion = u.activo ? 'desactivar' : 'reactivar';
    if (!await Utils.confirm(`¿Seguro que deseas ${accion} al usuario "${u.nombre}"?`)) return;

    try {
      if (u.activo) {
        await Api.delete(`/usuarios/${id}`);
        Toast.show('Usuario desactivado', 'info');
      } else {
        await Api.put(`/usuarios/${id}`, { activo: true });
        Toast.show('Usuario reactivado', 'success');
      }
      cargarUsuarios();
    } catch (e) {}
  }

  function limpiarForm() {
    state.editandoUsuarioId = null;
    document.getElementById('u-nombre').value = '';
    document.getElementById('u-email').value = '';
    document.getElementById('u-password').value = '';
    document.getElementById('u-password').placeholder = 'Contraseña segura';
    document.getElementById('u-rol').value = 'OPERACIONES';
    document.getElementById('u-activo').value = 'true';

    document.getElementById('u-form-title').textContent = 'Nuevo usuario';
    document.getElementById('u-btn-cancelar').style.display = 'none';
  }

  function init() {
    if (!Auth.isAdmin()) {
      Toast.show('Acceso restringido solo para administradores', 'warning');
      Router.navigate('despachos');
      return;
    }
    cargarUsuarios();
  }

  return {
    init,
    guardarUsuario,
    editarUsuario,
    desactivarUsuario,
    limpiarForm
  };

})();
