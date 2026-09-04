/* ============================================================
   api.js — Capa de comunicación con el Backend
   
   NOTA: En vez de escribir fetch() directo en cada
   módulo, centralizamos todo aquí. Ventajas:
   - Si el backend cambia de URL, solo cambiamos aquí
   - El manejo de errores está en un solo lugar
   - Cada módulo llama funciones simples como Api.get('/despachos')
   ============================================================ */

const Api = (() => {

  const BASE_URL = ''; // Usar ruta relativa para adoptar automáticamente el puerto activo

  // ============================================================
  // ADAPTACIÓN AURORA+: este frontend se escribió contra el backend
  // original (com.carbones.inventario, rutas /api/... y /api/v1/...).
  // El backend actual (aurora-plus) expone la misma lógica bajo
  // /api/tamanaco-comercial/... y además requiere identificar el
  // tenant (multi-empresa) en cada request. Esta capa reescribe las
  // rutas y agrega el tenant automáticamente para no tener que tocar
  // los ~20 módulos JS que llaman a Api.get/post/put/patch/delete.
  // ============================================================
  const DEFAULT_TENANT_ID = 1;

  function reescribirRuta(cleanEndpoint) {
    // Caso especial: el original tenía DOS rutas de inventario distintas
    // ('/inventario/...' para catálogo de productos y '/v1/inventario/...'
    // para el patio de acopio de mineral) que en Aurora+ son controladores
    // separados con nombres distintos.
    if (cleanEndpoint.startsWith('/api/v1/inventario')) {
      return '/api/tamanaco-comercial/inventario-patio' + cleanEndpoint.slice('/api/v1/inventario'.length);
    }
    if (cleanEndpoint.startsWith('/api/v1/')) {
      return '/api/tamanaco-comercial/' + cleanEndpoint.slice('/api/v1/'.length);
    }
    if (cleanEndpoint.startsWith('/api/')) {
      return '/api/tamanaco-comercial/' + cleanEndpoint.slice('/api/'.length);
    }
    return cleanEndpoint;
  }

  function agregarTenantId(url) {
    if (/[?&]tenantId=/.test(url)) return url;
    return url + (url.includes('?') ? '&' : '?') + 'tenantId=' + DEFAULT_TENANT_ID;
  }

  /**
   * Método interno que hace el fetch y procesa la respuesta.
   * @param {string} endpoint   - Ej: '/despachos' o '/api/v1/despachos'
   * @param {object} options    - Opciones del fetch (method, body, etc.)
   * @returns {Promise<any>}    - Los datos JSON de la respuesta
   */
  async function request(endpoint, options = {}) {
    let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    if (!cleanEndpoint.startsWith('/api') && !cleanEndpoint.startsWith('http')) {
      cleanEndpoint = `/api${cleanEndpoint}`;
    }
    if (!cleanEndpoint.startsWith('http')) {
      cleanEndpoint = agregarTenantId(reescribirRuta(cleanEndpoint));
    }
    const url = cleanEndpoint;

    try {
      let token = null;
      try {
        const raw = localStorage.getItem('tamanaco_auth_user');
        if (raw) {
          const user = JSON.parse(raw);
          if (user && user.token) token = user.token;
        }
      } catch (e) {}

      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
      const defaultHeaders = {
        'Accept': 'application/json',
        'X-Tenant-ID': String(DEFAULT_TENANT_ID),
        ...authHeaders,
        ...(options.headers || {})
      };

      if (!options.isFormData && !defaultHeaders['Content-Type'] && options.method && options.method !== 'GET') {
        defaultHeaders['Content-Type'] = 'application/json';
      }

      const response = await fetch(url, {
        ...options,
        headers: defaultHeaders
      });

      if (!response.ok) {
        if (response.status === 401) {
          try { localStorage.removeItem('tamanaco_auth_user'); } catch(e){}
        }
        const errorBody = await response.text().catch(() => '');
        console.warn(`[API Error] ${response.status} en ${url}:`, errorBody);
        let errorMsg = `HTTP ${response.status}`;
        try {
          const errData = JSON.parse(errorBody);
          errorMsg = errData.message || errData.error || errorMsg;
        } catch (e) {}
        throw new Error(errorMsg);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      const text = await response.text();
      try {
        return text ? JSON.parse(text) : null;
      } catch (e) {
        return text;
      }
    } catch (error) {
      console.error(`Fallo en petición a ${url}:`, error);
      throw error;
    }
  }

  return {
    /** GET — Obtener datos */
    get: (endpoint) => request(endpoint),

    /** POST — Crear un nuevo registro */
    post: (endpoint, data) => request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

    /** PUT — Actualizar un registro existente */
    put: (endpoint, data) => request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

    /** PATCH — Actualizar parcialmente un registro */
    patch: (endpoint, data) => request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

    /** POST — Subir archivos mediante FormData */
    uploadFormData: (endpoint, formData) => request(endpoint, {
      method: 'POST',
      body: formData,
      isFormData: true
    }),

    /** DELETE — Eliminar un registro */
    delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
  };

})();


/* ============================================================
   Toast — Sistema de notificaciones
   
   NOTA: El patrón IIFE (() => { ... })() crea un
   "módulo" con su propio scope. Las funciones internas no
   contaminan el scope global. Solo exponemos lo que queremos.
   ============================================================ */

const Toast = (() => {

  function show(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-dot"></span>
      <span class="toast-msg">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      // Doble mecanismo: animationend + fallback por si la animacion no dispara
      const remove = () => { if (toast.parentNode) toast.remove(); };
      toast.addEventListener('animationend', remove, { once: true });
      setTimeout(remove, 400); // fallback 400ms tras iniciar la animacion de salida
    }, duration);
  }

  return { show };

})();


/* ============================================================
   Router — Navegación entre módulos (SPA)
   
   NOTA: Una "Single Page Application" (SPA) no recarga
   la página al navegar. Simplemente muestra/oculta secciones del
   HTML y actualiza la URL con el History API.
   ============================================================ */

const Router = (() => {

  let currentModule = null;
  const modules = {};

  /**
   * Registrar un módulo con su función de inicialización.
   * @param {string} name    - Nombre del módulo (ej: 'despachos')
   * @param {function} init  - Función a llamar cuando se activa el módulo
   */
  function register(name, init) {
    modules[name] = init;
  }

  /**
   * Navegar a un módulo.
   * @param {string} name - Nombre del módulo destino
   */
  function navigate(name) {
    if (currentModule === name) return;

    // Ocultar todas las páginas
    document.querySelectorAll('.module-page').forEach(p => p.classList.remove('active'));

    // Desactivar todos los nav-items
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    // Mostrar la página destino
    const page = document.getElementById(`page-${name}`);
    if (page) page.classList.add('active');

    // Activar el nav-item correspondiente
    const navItem = document.querySelector(`.nav-item[data-module="${name}"]`);
    if (navItem) navItem.classList.add('active');

    // Actualizar breadcrumb
    const breadcrumb = document.getElementById('header-breadcrumb-module');
    if (breadcrumb && navItem) {
      breadcrumb.textContent = navItem.getAttribute('data-tooltip') || name;
    }

    // Llamar al init del módulo si existe y no se ha inicializado
    if (modules[name]) {
      modules[name]();
    }

    currentModule = name;
  }

  return { register, navigate };

})();


/* ============================================================
   Utils — Funciones de utilidad reutilizables
   ============================================================ */

const Utils = {

  /** Formatear fecha 'YYYY-MM-DD' a 'DD/MM/YYYY' para mostrar */
  formatDate(dateStr) {
    if (!dateStr) return '—';
    if (typeof dateStr === 'string' && dateStr.includes('T')) {
      dateStr = dateStr.split('T')[0];
    }
    const clean = String(dateStr).trim();
    if (clean.includes('-')) {
      const parts = clean.split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts;
        return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
      }
    }
    return clean;
  },

  /** Obtener fecha de hoy en formato local 'YYYY-MM-DD' */
  today() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  },

  /** Formatear número como moneda */
  formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount || 0);
  },

  /** Formatear número con separadores de miles */
  formatNumber(n, decimals = 2) {
    return parseFloat(n || 0).toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  },

  /** Confirmar una acción destructiva (eliminar) */
  async confirm(message) {
    return window.confirm(message);
  },

  /** Exportar tabla HTML a Excel usando SheetJS (con vista previa HTML) */
  exportarExcel(tableId, filename = 'exportacion') {
    if (typeof XLSX === 'undefined') {
      Toast.show('Error: La librería de exportación no está cargada.', 'error');
      return;
    }
    const table = document.getElementById(tableId);
    if (!table) {
      Toast.show('Error: No se encontró la tabla para exportar.', 'error');
      return;
    }
    
    // Clonar tabla y eliminar columnas no deseadas
    const tableClone = table.cloneNode(true);
    tableClone.querySelectorAll('.no-print, .no-export, .td-actions, button').forEach(el => el.remove());
    
    // Vista Previa en Modal
    const modal = document.getElementById('preview-modal');
    document.getElementById('pm-title').textContent = `Vista Previa de Excel: ${filename}.xlsx`;
    
    const excelContainer = document.getElementById('pm-content-excel');
    excelContainer.innerHTML = '';
    
    const tableVisual = document.createElement('table');
    tableVisual.style.width = '100%';
    tableVisual.style.borderCollapse = 'collapse';
    tableVisual.innerHTML = tableClone.innerHTML;
    
    tableVisual.querySelectorAll('th, td').forEach(cell => {
      cell.style.border = '1px solid var(--b-default, #ddd)';
      cell.style.padding = '8px';
    });
    
    excelContainer.appendChild(tableVisual);
    
    const pdfIframe = document.getElementById('pm-content-pdf');
    if (pdfIframe) pdfIframe.style.display = 'none';
    const imgWrap = document.getElementById('pm-content-img-wrap');
    if (imgWrap) imgWrap.style.display = 'none';
    excelContainer.style.display = 'block';
    
    const btnDescargar = document.getElementById('pm-btn-descargar');
    btnDescargar.style.display = 'inline-flex';
    btnDescargar.textContent = 'Descargar Excel';
    btnDescargar.onclick = () => {
      const wb = XLSX.utils.table_to_book(tableClone, { sheet: 'Datos' });
      const fullFilename = `${filename}_${this.today()}.xlsx`;
      XLSX.writeFile(wb, fullFilename);
      Toast.show('Exportación a Excel completada', 'success');
      this.cerrarPreview();
    };
    
    modal.style.display = 'flex';
  },

  /** Mostrar PDF o Imagen de Ticket en Modal */
  mostrarPDF(url, titulo = 'Vista Previa') {
    if (!url) {
      Toast.show('No hay archivo disponible para visualizar', 'warning');
      return;
    }

    let fullUrl = url;
    if (typeof url === 'string' && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('blob:') && !url.startsWith('data:')) {
      const origin = (window.location.protocol === 'file:' || (window.location.port && window.location.port !== '10000'))
        ? 'http://localhost:10000'
        : '';
      fullUrl = origin + (url.startsWith('/') ? url : '/' + url);
    }

    const modal = document.getElementById('preview-modal');
    if (!modal) return;

    document.getElementById('pm-title').textContent = titulo;
    const excelWrap = document.getElementById('pm-content-excel');
    const pdfIframe = document.getElementById('pm-content-pdf');
    const imgWrap   = document.getElementById('pm-content-img-wrap');
    const imgElem   = document.getElementById('pm-content-img');

    if (excelWrap) excelWrap.style.display = 'none';

    const isImage = /\.(jpg|jpeg|png|webp|gif|bmp)(\?.*)?$/i.test(fullUrl) || fullUrl.startsWith('data:image/');

    if (isImage) {
      if (pdfIframe) {
        pdfIframe.src = '';
        pdfIframe.style.display = 'none';
      }
      if (imgElem && imgWrap) {
        imgElem.src = fullUrl;
        imgWrap.style.display = 'flex';
      }
    } else {
      if (imgWrap) imgWrap.style.display = 'none';
      if (pdfIframe) {
        pdfIframe.src = fullUrl;
        pdfIframe.style.display = 'block';
      }
    }
    
    const btnDescargar = document.getElementById('pm-btn-descargar');
    if (btnDescargar) {
      btnDescargar.style.display = 'inline-flex';
      btnDescargar.textContent = isImage ? 'Descargar Imagen' : 'Abrir / Descargar';
      btnDescargar.onclick = () => {
        const a = document.createElement('a');
        a.href = fullUrl;
        a.target = '_blank';
        let ext = isImage ? '.jpg' : '.pdf';
        if (fullUrl && typeof fullUrl === 'string' && !fullUrl.startsWith('blob:')) {
          const parts = fullUrl.split('?')[0].split('.');
          if (parts.length > 1) {
            ext = '.' + parts.pop().toLowerCase();
          }
        }
        a.download = (titulo || 'archivo').replace(/[^a-z0-9]/gi, '_').toLowerCase() + ext;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };
    }
    
    modal.style.display = 'flex';
  },

  /** Cerrar el modal de vista previa */
  cerrarPreview() {
    const modal = document.getElementById('preview-modal');
    if (modal) modal.style.display = 'none';
    const iframe = document.getElementById('pm-content-pdf');
    if (iframe) iframe.src = '';
    const img = document.getElementById('pm-content-img');
    if (img) img.src = '';
  },

  /** Cambiar fecha por un offset de días (Timezone-safe) */
  offsetDate(dateStr, days) {
    if (!dateStr) dateStr = this.today();
    if (dateStr.includes('T')) dateStr = dateStr.split('T')[0];
    const parts = dateStr.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2] + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  },

  /** Obtener el lunes de la semana de una fecha dada (Lunes a Domingo) */
  getWeekStart(dateStr) {
    if (!dateStr) dateStr = this.today();
    if (dateStr.includes('T')) dateStr = dateStr.split('T')[0];
    const parts = dateStr.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const day = d.getDay(); // 0: Domingo, 1: Lunes, ..., 6: Sábado
    const diff = (day === 0) ? -6 : 1 - day; // Lunes de la misma semana
    d.setDate(d.getDate() + diff);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  },

  /** Generar e imprimir Comprobante de Pago en PDF (mock) */
  imprimirComprobante(id, nombre, fecha, concepto, monto, moneda, tipo) {
    Toast.show('Generando Comprobante de Pago...', 'info');
    
    let etiquetaFirma = 'Firma del Trabajador';
    if (tipo === 'MINA') etiquetaFirma = 'Firma del Representante de la Mina';
    else if (tipo === 'TRANSPORTE' || tipo === 'OTROS') etiquetaFirma = 'Firma del Proveedor';
    
    const montoFormateado = this.formatNumber(monto, 2);
    const simbolo = moneda === 'VES' ? 'Bs.' : '$';

    setTimeout(() => {
      const win = window.open('', '_blank');
      win.document.write(`
        <html>
        <head>
          <title>Comprobante de Pago #${id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; margin: 0 auto; max-width: 600px; color: #0f172a; }
            .receipt-header { text-align: center; margin-bottom: 28px; border-bottom: 2px solid #0f172a; padding-bottom: 16px; }
            .receipt-logo { max-height: 65px; width: auto; object-fit: contain; display: block; margin: 0 auto 10px auto; background: transparent; border: none; }
            .receipt-company { font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin: 0; }
            .receipt-title { font-size: 13px; color: #475569; margin: 4px 0 0 0; }
            table { width: 100%; margin-bottom: 40px; font-size: 15px; }
            td { padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
            .label { font-weight: 600; }
            .val { text-align: right; }
            .monto-row td { font-size: 20px; font-weight: 700; border-bottom: none; padding-top: 16px; }
            .signatures { margin-top: 80px; display: flex; justify-content: space-between; }
            .sig-block { text-align: center; width: 45%; }
            .sig-line { border-top: 1px solid #0f172a; margin-bottom: 8px; }
            .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="receipt-header">
            <img src="/img/logo.svg" alt="Carbones Tamanaco" class="receipt-logo"
                 >
            <p class="receipt-company">Carbones Tamanaco S.A.S.</p>
            <p class="receipt-title">COMPROBANTE DE PAGO — Ref. N° ${String(id).padStart(6, '0')}</p>
          </div>

          <table>
            <tr>
              <td class="label">Fecha:</td>
              <td class="val">${this.formatDate(fecha)}</td>
            </tr>
            <tr>
              <td class="label">Beneficiario:</td>
              <td class="val">${nombre}</td>
            </tr>
            <tr>
              <td class="label">Concepto:</td>
              <td class="val">${concepto}</td>
            </tr>
            <tr class="monto-row">
              <td class="label">Monto Pagado:</td>
              <td class="val">${simbolo} ${montoFormateado} ${moneda}</td>
            </tr>
          </table>

          <div class="signatures">
            <div class="sig-block">
              <div class="sig-line"></div>
              <strong>Aprobado por</strong>
            </div>
            <div class="sig-block">
              <div class="sig-line"></div>
              <strong>${etiquetaFirma}</strong>
            </div>
          </div>

          <div class="footer">
            Generado automáticamente por el Sistema ERP — Carbones Tamanaco S.A.S.
          </div>
        </body>
        </html>
      `);
      win.document.close();
      // Esperar a que la imagen cargue antes de imprimir
      win.onload = () => win.print();
    }, 500);
  }
};

// Cerrar modales con tecla Escape
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    Utils.cerrarPreview();
  }
});

