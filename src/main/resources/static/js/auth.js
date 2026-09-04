/* ============================================================
   auth.js — Modulo de Autenticacion y Control de Roles (RBAC) v3
   Roles:
   - CEO         : Acceso total a todos los modulos
   - ADM         : Despachos + Nomina (resto bloqueado con candado)
   - OPERACIONES : Solo Despachos (resto bloqueado con candado)
   ============================================================ */

const Auth = (() => {

  const STORAGE_KEY = 'tamanaco_auth_user';

  /* ── Acceso al usuario actual ── */
  function getCurrentUser() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setCurrentUser(user) {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  /* ── Helpers de rol ── */
  function getRol() {
    const user = getCurrentUser();
    if (!user) return 'ADMIN'; // Sin sesion = acceso total (modo dev)
    return (user.rol || '').toUpperCase().trim();
  }

  function isCEO()         { const r = getRol(); return r === 'ADMIN' || r === 'CEO'; }
  function isCoordinador() { const r = getRol(); return r === 'COORDINADOR' || r === 'ADM' || r === 'ADMINISTRACION'; }
  function isOperador()    { const r = getRol(); return r === 'OPERADOR' || r === 'OPERACIONES' || r === 'DESPACHADOR'; }

  // Compatibilidad con código existente
  function isAdmin()       { return isCEO(); }
  function isADM()         { return isCoordinador(); }
  function isOperaciones() { return isOperador(); }
  function isOperator()    { return isCEO() || isCoordinador() || isOperador(); }
  function isDespachador() { return isOperador(); }
  function isViewer()      { const user = getCurrentUser(); return user && user.rol === 'CONSULTA'; }
  function canEdit()       { return !isViewer(); }
  function canManageLab()  { return isCEO() || isCoordinador(); }

  /* ── Permisos por modulo ── */
  const PERMISOS = {
    ADMIN:       ['despachos','metas','nomina','laboratorio','auditoria','gastos',
                  'proveedores','inventario','pagos','produccion','rentabilidad',
                  'facturacion','usuarios','documentos','ajustes'],
    COORDINADOR: ['despachos','nomina','laboratorio'],
    OPERADOR:    ['despachos','laboratorio']
  };

  function getModulosPermitidos() {
    if (isCEO())         return PERMISOS.ADMIN;
    if (isCoordinador()) return PERMISOS.COORDINADOR;
    if (isOperador())    return PERMISOS.OPERADOR;
    return PERMISOS.ADMIN; // fallback
  }

  /* ── Login / Logout ── */
  async function login(emailOrEvent, maybePassword) {
    let email = emailOrEvent;
    let password = maybePassword;

    if (emailOrEvent && typeof emailOrEvent.preventDefault === 'function') {
      emailOrEvent.preventDefault();
      email    = document.getElementById('login-email')?.value?.trim();
      password = document.getElementById('login-password')?.value?.trim();
    }

    if (!email || !password) {
      Toast.show('Ingresa tu correo y contrasena', 'warning');
      return false;
    }

    try {
      const respuesta = await Api.post('/auth/login', { email, password });
      setCurrentUser(respuesta);
      Toast.show('Bienvenido a Carbones del Tamanaco', 'success');
      aplicarEstadoSesion();
      if (typeof Router !== 'undefined' && typeof Router.navigate === 'function') {
        Router.navigate('despachos');
      }
      return true;
    } catch (e) {
      Toast.show(e.message || 'Error al iniciar sesion', 'error');
      return false;
    }
  }

  function logout() {
    setCurrentUser(null);
    Toast.show('Has cerrado sesion', 'info');
    aplicarEstadoSesion();
  }

  /* ── Recuperacion de contrasena ── */
  function showForgotPassword() {
    document.getElementById('login-modal').style.display = 'none';
    document.getElementById('forgot-modal').style.display = 'flex';
  }

  function closeForgotPassword() {
    document.getElementById('forgot-modal').style.display = 'none';
    document.getElementById('login-modal').style.display = 'flex';
  }

  async function handleForgotPassword() {
    const email = document.getElementById('forgot-email').value;
    if (!email) return;
    try {
      await Api.post('/auth/forgot-password', { email });
      Toast.show('Enlace enviado (Revisa la consola del servidor en dev)', 'info');
      setTimeout(() => {
        const testToken = prompt('SOLO DESARROLLO: Pega aqui el Token que aparecio en la consola de Java:');
        if (testToken) {
          document.getElementById('forgot-modal').style.display = 'none';
          document.getElementById('reset-modal').style.display = 'flex';
          document.getElementById('reset-token').value = testToken;
        }
      }, 1500);
    } catch (e) {
      Toast.show('Error al solicitar recuperacion', 'error');
    }
  }

  async function handleResetPassword() {
    const token       = document.getElementById('reset-token').value;
    const newPassword = document.getElementById('reset-password').value;
    if (!newPassword || newPassword.length < 6) {
      Toast.show('La contrasena debe tener al menos 6 caracteres', 'warning');
      return;
    }
    try {
      await Api.post('/auth/reset-password', { token, newPassword });
      Toast.show('Contrasena actualizada. Ya puedes iniciar sesion.', 'success');
      document.getElementById('reset-modal').style.display = 'none';
      document.getElementById('login-modal').style.display = 'flex';
      document.getElementById('login-password').value = '';
    } catch (e) {
      Toast.show('Enlace invalido o expirado', 'error');
    }
  }

  /* ── Aplicar estado de sesion ── */
  function aplicarEstadoSesion() {
    const user       = getCurrentUser();
    const loginModal = document.getElementById('login-modal');
    const appLayout  = document.getElementById('appLayout');

    if (!user) {
      if (loginModal) loginModal.style.display = 'flex';
      if (appLayout)  appLayout.style.display  = 'none';
      return;
    }

    if (loginModal) loginModal.style.display = 'none';
    if (appLayout)  appLayout.style.display  = 'flex';

    /* ── Sidebar: nombre, avatar, rol ── */
    const avatarEl = document.getElementById('sidebarAvatar');
    const nameEl   = document.getElementById('sidebarUserName');
    const roleEl   = document.getElementById('sidebarUserRole');

    if (avatarEl) avatarEl.textContent = user.nombre
      ? user.nombre.charAt(0).toUpperCase()
      : (user.email ? user.email.charAt(0).toUpperCase() : 'U');
    if (nameEl) nameEl.textContent = user.nombre || user.email;

    /* ── Saludo en el header ── */
    const greetingEl = document.getElementById('header-greeting');
    if (greetingEl) {
      const primerNombre = user.nombre ? user.nombre.split(' ')[0] : 'Usuario';
      greetingEl.textContent = `Bienvenido, ${primerNombre}`;
    }

    /* ── Etiqueta del rol visible ── */
    const r = getRol();
    let rolTexto = 'Operaciones';
    if (r === 'CEO' || r === 'ADMIN')          rolTexto = 'CEO';
    else if (r === 'ADM' || r === 'ADMINISTRACION') rolTexto = 'Administracion';
    if (roleEl) roleEl.textContent = rolTexto;

    /* ── Control de navegacion por rol ── */
    aplicarPermisosSidebar();
  }

  function aplicarPermisosSidebar() {
    const permitidos = getModulosPermitidos();
    const navItems   = document.querySelectorAll('.nav-item[data-module]');

    navItems.forEach(el => {
      const mod = el.getAttribute('data-module');

      // Limpiar estado previo
      el.classList.remove('nav-locked');
      el.removeAttribute('data-locked');
      const prevLock = el.querySelector('.nav-lock-icon');
      if (prevLock) prevLock.remove();

      if (permitidos.includes(mod)) {
        /* ── Modulo PERMITIDO ── */
        el.style.opacity       = '1';
        el.style.cursor        = 'pointer';
        el.style.pointerEvents = '';
        // Restaurar onclick original si fue guardado
        const original = el.getAttribute('data-original-onclick');
        if (original) {
          el.setAttribute('onclick', original);
          el.removeAttribute('data-original-onclick');
        }
      } else {
        /* ── Modulo BLOQUEADO ── */
        // Guardar onclick original (solo la primera vez)
        if (!el.getAttribute('data-original-onclick')) {
          const oc = el.getAttribute('onclick');
          if (oc) el.setAttribute('data-original-onclick', oc);
        }
        el.setAttribute('onclick', `Auth.mostrarMensajeAcceso('${mod}')`);
        el.classList.add('nav-locked');
        el.setAttribute('data-locked', 'true');
        el.style.opacity = '0.45';
        el.style.cursor  = 'not-allowed';

        // Icono de candado pequeño al final del item
        const lock = document.createElement('span');
        lock.className   = 'nav-lock-icon';
        lock.textContent = '\uD83D\uDD12';
        el.appendChild(lock);
      }
    });
  }

  function mostrarMensajeAcceso(modulo) {
    Toast.show('No tienes permisos para acceder a este modulo', 'warning');
  }

  function init() {
    aplicarEstadoSesion();
  }

  return {
    init,
    getCurrentUser,
    getRol,
    isCEO,
    isCoordinador,
    isOperador,
    isADM,
    isOperaciones,
    isAdmin,
    isOperator,
    isDespachador,
    isViewer,
    canEdit,
    canManageLab,
    login,
    logout,
    aplicarEstadoSesion,
    aplicarPermisosSidebar,
    mostrarMensajeAcceso,
    showForgotPassword,
    closeForgotPassword,
    handleForgotPassword,
    handleResetPassword
  };

})();
