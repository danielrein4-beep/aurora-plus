import React, { useState, useEffect } from "react";
import {
  LicenciaTenant,
  ModuloTenant,
  TipoLicencia,
  CrearTenantRequest,
  SuperAdminSession,
  loginSuperAdminApi,
  listarTenantsSuperAdmin,
  crearTenantSuperAdmin,
  activarTenantSuperAdmin,
  desactivarTenantSuperAdmin,
  renovarTenantSuperAdmin,
  cambiarPlanTenantSuperAdmin,
  listarModulosTenantSuperAdmin,
  activarModuloTenantSuperAdmin,
  crearUsuarioTenantSuperAdmin,
  leerSesionSuperAdmin,
  guardarSesionSuperAdmin,
  borrarSesionSuperAdmin,
} from "../api";

interface SuperAdminPortalProps {
  onClose: () => void;
}

const MODULOS_DISPONIBLES = [
  { id: "salud", label: "Salud & Clínicas (Mediclinic)", icon: "🏥", desc: "Historias clínicas, citas, vademécum, cobros médicos" },
  { id: "horeca", label: "Gastronomía & Restaurantes", icon: "🍽️", desc: "Mesas en vivo, comandas táctiles, inventario FIFO" },
  { id: "minero", label: "Minería & Materiales", icon: "⛏️", desc: "Pesaje de ley, fundición, balanzas y despachos" },
  { id: "repuestos", label: "Repuestos & Talleres", icon: "⚙️", desc: "Compatibilidad por marca/año, VIN, órdenes mecánicas" },
  { id: "moda", label: "Moda & Calzado Retail", icon: "👗", desc: "Matriz Talla/Color, códigos de barra, boutiques" },
  { id: "ganaderia", label: "Ganadería & Agro", icon: "🐄", desc: "Pesaje por animal, arete RFID, preñez y vacunas" },
];

export default function SuperAdminPortal({ onClose }: SuperAdminPortalProps) {
  const [sesion, setSesion] = useState<SuperAdminSession | null>(() => leerSesionSuperAdmin());
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loadingLogin, setLoadingLogin] = useState(false);

  // Estados de datos
  const [tenants, setTenants] = useState<LicenciaTenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterModulo, setFilterModulo] = useState<string>("todos");
  const [filterEstado, setFilterEstado] = useState<string>("todos");
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Modal Nuevo Tenant
  const [showNuevoModal, setShowNuevoModal] = useState(false);
  const [nuevoForm, setNuevoForm] = useState<CrearTenantRequest>({
    nombreEmpresa: "",
    moduloPrincipal: "salud",
    tipoLicencia: "ENTERPRISE",
    emailContacto: "",
    telefonoContacto: "",
    mesesVigencia: 12,
    monedaBase: "USD",
    usuarioInicial: "admin",
    passwordInicial: "admin123",
  });
  const [creandoTenant, setCreandoTenant] = useState(false);

  // Modal Gestión de Módulos por Tenant
  const [tenantSeleccionado, setTenantSeleccionado] = useState<LicenciaTenant | null>(null);
  const [modulosTenant, setModulosTenant] = useState<ModuloTenant[]>([]);
  const [loadingModulos, setLoadingModulos] = useState(false);
  const [showModulosModal, setShowModulosModal] = useState(false);

  // Modal Crear Usuario Tenant
  const [showUsuarioModal, setShowUsuarioModal] = useState(false);
  const [usuarioForm, setUsuarioForm] = useState({
    username: "",
    password: "",
    nombreCompleto: "",
    rol: "ADMIN",
  });
  const [creandoUsuario, setCreandoUsuario] = useState(false);

  useEffect(() => {
    if (sesion && sesion.autenticado) {
      cargarTenants();
    }
  }, [sesion]);

  const cargarTenants = async () => {
    setLoadingTenants(true);
    try {
      const data = await listarTenantsSuperAdmin();
      setTenants(data);
    } catch (err) {
      console.error("Error al cargar tenants:", err);
    } finally {
      setLoadingTenants(false);
    }
  };

  const mostrarNotificacion = (msg: string) => {
    setMensajeExito(msg);
    setTimeout(() => {
      setMensajeExito(null);
    }, 4000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoadingLogin(true);

    try {
      const token = await loginSuperAdminApi(username, password);
      const nuevaSesion: SuperAdminSession = {
        token,
        username,
        autenticado: true,
      };
      guardarSesionSuperAdmin(nuevaSesion);
      setSesion(nuevaSesion);
    } catch (err: any) {
      setLoginError(err?.message || "Credenciales de CEO / SuperAdmin inválidas.");
    } finally {
      setLoadingLogin(false);
    }
  };

  const handleLogout = () => {
    borrarSesionSuperAdmin();
    setSesion(null);
    setUsername("");
    setPassword("");
  };

  const handleToggleActivo = async (tenant: LicenciaTenant) => {
    try {
      if (tenant.activa) {
        await desactivarTenantSuperAdmin(tenant.tenantId);
        mostrarNotificacion(`Tenant "${tenant.nombreEmpresa}" suspendido temporalmente.`);
      } else {
        await activarTenantSuperAdmin(tenant.tenantId);
        mostrarNotificacion(`Tenant "${tenant.nombreEmpresa}" reactivado exitosamente.`);
      }
      await cargarTenants();
    } catch (err: any) {
      alert(err?.message || "Error al cambiar estado");
    }
  };

  const handleRenovar = async (tenant: LicenciaTenant, meses: number) => {
    try {
      await renovarTenantSuperAdmin(tenant.tenantId, meses);
      mostrarNotificacion(`Licencia de "${tenant.nombreEmpresa}" extendida por +${meses} mes(es).`);
      await cargarTenants();
    } catch (err: any) {
      alert(err?.message || "Error al renovar licencia");
    }
  };

  const handleCambiarPlan = async (tenant: LicenciaTenant, nuevoPlan: TipoLicencia) => {
    try {
      await cambiarPlanTenantSuperAdmin(tenant.tenantId, nuevoPlan);
      mostrarNotificacion(`Plan de "${tenant.nombreEmpresa}" actualizado a ${nuevoPlan}.`);
      await cargarTenants();
    } catch (err: any) {
      alert(err?.message || "Error al cambiar plan");
    }
  };

  const handleAbrirModulos = async (tenant: LicenciaTenant) => {
    setTenantSeleccionado(tenant);
    setShowModulosModal(true);
    setLoadingModulos(true);
    try {
      const lista = await listarModulosTenantSuperAdmin(tenant.tenantId);
      setModulosTenant(lista);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingModulos(false);
    }
  };

  const handleToggleModulo = async (moduloNombre: string, activoActual: boolean) => {
    if (!tenantSeleccionado) return;
    try {
      await activarModuloTenantSuperAdmin(tenantSeleccionado.tenantId, moduloNombre, !activoActual);
      const nuevaLista = await listarModulosTenantSuperAdmin(tenantSeleccionado.tenantId);
      setModulosTenant(nuevaLista);
      mostrarNotificacion(`Módulo "${moduloNombre.toUpperCase()}" ${!activoActual ? "habilitado" : "deshabilitado"}.`);
    } catch (err: any) {
      alert(err?.message || "Error al actualizar módulo");
    }
  };

  const handleCrearTenantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoForm.nombreEmpresa.trim()) return;

    setCreandoTenant(true);
    try {
      await crearTenantSuperAdmin(nuevoForm);
      mostrarNotificacion(`¡Tenant "${nuevoForm.nombreEmpresa}" aprovisionado con éxito!`);
      setShowNuevoModal(false);
      setNuevoForm({
        nombreEmpresa: "",
        moduloPrincipal: "salud",
        tipoLicencia: "ENTERPRISE",
        emailContacto: "",
        telefonoContacto: "",
        mesesVigencia: 12,
        monedaBase: "USD",
        usuarioInicial: "admin",
        passwordInicial: "admin123",
      });
      await cargarTenants();
    } catch (err: any) {
      alert(err?.message || "Error al aprovisionar tenant");
    } finally {
      setCreandoTenant(false);
    }
  };

  const handleCrearUsuarioSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantSeleccionado || !usuarioForm.username.trim() || !usuarioForm.password.trim()) return;

    setCreandoUsuario(true);
    try {
      await crearUsuarioTenantSuperAdmin(tenantSeleccionado.tenantId, usuarioForm);
      mostrarNotificacion(`Usuario "${usuarioForm.username}" creado para ${tenantSeleccionado.nombreEmpresa}.`);
      setShowUsuarioModal(false);
      setUsuarioForm({ username: "", password: "", nombreCompleto: "", rol: "ADMIN" });
    } catch (err: any) {
      alert(err?.message || "Error al crear usuario");
    } finally {
      setCreandoUsuario(false);
    }
  };

  // Filtrado de tenants
  const tenantsFiltrados = tenants.filter((t) => {
    const matchSearch =
      t.nombreEmpresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.emailContacto && t.emailContacto.toLowerCase().includes(searchTerm.toLowerCase())) ||
      String(t.tenantId).includes(searchTerm);
    const matchModulo = filterModulo === "todos" || t.moduloPrincipal === filterModulo;
    const matchEstado =
      filterEstado === "todos" ||
      (filterEstado === "activa" && t.activa) ||
      (filterEstado === "inactiva" && !t.activa);
    return matchSearch && matchModulo && matchEstado;
  });

  const totalActivos = tenants.filter((t) => t.activa).length;
  const totalInactivos = tenants.filter((t) => !t.activa).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-2xl flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      {/* Contenedor Maestro */}
      <div className="relative w-full max-w-6xl bg-gradient-to-b from-slate-900/95 to-slate-950/98 border border-emerald-500/40 rounded-3xl shadow-[0_0_80px_rgba(16,185,129,0.18)] overflow-hidden my-auto">
        
        {/* Cabecera Cyberpunk / Obsidian */}
        <div className="px-6 py-5 border-b border-emerald-500/20 bg-slate-900/80 flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-[2px] shadow-lg shadow-emerald-500/30 animate-pulse">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <span className="text-xl">⚡</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold font-['Outfit'] text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-200 to-cyan-400">
                  Aurora Plus Sovereign CEO Portal
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono tracking-wider font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  SUPERADMIN v2.6
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Consola Central de Gestión Multi-Tenant & Licenciamiento Global
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {sesion?.autenticado && (
              <button
                onClick={handleLogout}
                className="text-xs px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all cursor-pointer font-medium"
              >
                Cerrar Sesión CEO
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-slate-700"
              title="Cerrar Panel"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Notificación Flotante */}
        {mensajeExito && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/40 animate-slideDown">
            <span className="text-base">✓</span>
            <span className="font-medium">{mensajeExito}</span>
          </div>
        )}

        {/* CUERPO PRINCIPAL */}
        <div className="p-6">
          {!sesion?.autenticado ? (
            /* FORMULARIO DE LOGIN SUPERADMIN */
            <div className="max-w-md mx-auto py-10">
              <div className="text-center mb-6">
                <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-3xl mb-3 shadow-inner">
                  🔐
                </div>
                <h3 className="text-xl font-bold text-white font-['Outfit']">
                  Acceso Restringido para Directores Ejecutivos
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Ingrese las credenciales maestras de CEO / SuperAdmin para administrar los tenants del ecosistema Aurora.
                </p>
              </div>

              {loginError && (
                <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs">
                  {loginError}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Usuario SuperAdmin / CEO
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin o ceo"
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Clave Maestra
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loadingLogin}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {loadingLogin ? "Verificando Credenciales..." : "Desbloquear Consola Soberana"}
                  </button>
                </div>

                <p className="text-[11px] text-center text-slate-500 pt-2">
                  Credencial por defecto local: <code className="text-emerald-400 font-mono">admin</code> / <code className="text-emerald-400 font-mono">admin123</code>
                </p>
              </form>
            </div>
          ) : (
            /* CONSOLA DE ADMINISTRACIÓN DE TENANTS */
            <div className="space-y-6">
              
              {/* KPIs Directivos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-2xl backdrop-blur-sm">
                  <div className="text-slate-400 text-xs font-medium">Total Organizaciones</div>
                  <div className="text-2xl sm:text-3xl font-bold font-mono text-white mt-1">
                    {tenants.length}
                  </div>
                  <div className="text-[11px] text-emerald-400 mt-1">SaaS Multi-Tenant</div>
                </div>

                <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-2xl backdrop-blur-sm">
                  <div className="text-slate-400 text-xs font-medium">Tenants Activos</div>
                  <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 mt-1">
                    {totalActivos}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Operando en producción</div>
                </div>

                <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-2xl backdrop-blur-sm">
                  <div className="text-slate-400 text-xs font-medium">Suspendidos / Vencidos</div>
                  <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-400 mt-1">
                    {totalInactivos}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Requieren renovación</div>
                </div>

                <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-2xl backdrop-blur-sm flex flex-col justify-between">
                  <div>
                    <div className="text-slate-400 text-xs font-medium">Acción Rápida</div>
                    <div className="text-xs text-slate-300 font-semibold mt-1">Nuevo Despliegue</div>
                  </div>
                  <button
                    onClick={() => setShowNuevoModal(true)}
                    className="mt-2 px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                  >
                    <span>+</span> Aprovisionar Tenant
                  </button>
                </div>
              </div>

              {/* Barra de Búsqueda y Filtros */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900/50 p-3 rounded-2xl border border-slate-800">
                <div className="w-full sm:w-72 relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar tenant, ID, email..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute left-3 top-2.5 text-slate-500 text-xs">🔍</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <select
                    value={filterModulo}
                    onChange={(e) => setFilterModulo(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="todos">Todos los Módulos</option>
                    <option value="salud">Salud (Mediclinic)</option>
                    <option value="horeca">Gastronomía (Restaurante)</option>
                    <option value="minero">Minería</option>
                    <option value="repuestos">Repuestos</option>
                    <option value="moda">Moda</option>
                    <option value="ganaderia">Ganadería</option>
                  </select>

                  <select
                    value={filterEstado}
                    onChange={(e) => setFilterEstado(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="todos">Todos los Estados</option>
                    <option value="activa">Solo Activos</option>
                    <option value="inactiva">Solo Inactivos</option>
                  </select>

                  <button
                    onClick={cargarTenants}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition-colors cursor-pointer"
                    title="Recargar lista"
                  >
                    🔄
                  </button>
                </div>
              </div>

              {/* TABLA DE TENANTS */}
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3.5 font-semibold">Tenant ID</th>
                      <th className="p-3.5 font-semibold">Organización / Empresa</th>
                      <th className="p-3.5 font-semibold">Módulo Principal</th>
                      <th className="p-3.5 font-semibold">Plan</th>
                      <th className="p-3.5 font-semibold">Estado</th>
                      <th className="p-3.5 font-semibold">Vencimiento</th>
                      <th className="p-3.5 font-semibold text-right">Acciones Soberanas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {loadingTenants ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          <div className="inline-block animate-spin text-xl mb-2">⚡</div>
                          <div>Sincronizando organizaciones de la base de datos...</div>
                        </td>
                      </tr>
                    ) : tenantsFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          No se encontraron tenants con los filtros especificados.
                        </td>
                      </tr>
                    ) : (
                      tenantsFiltrados.map((tenant) => (
                        <tr key={tenant.tenantId} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-3.5 font-mono text-emerald-400 font-bold">
                            #{tenant.tenantId}
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-white text-sm">{tenant.nombreEmpresa}</div>
                            <div className="text-[11px] text-slate-400">
                              {tenant.emailContacto || "Sin email"} • {tenant.monedaBase || "USD"}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[11px] text-teal-300 font-medium">
                              {tenant.moduloPrincipal === "salud" && "🏥 Salud"}
                              {tenant.moduloPrincipal === "horeca" && "🍽️ Gastronomía"}
                              {tenant.moduloPrincipal === "minero" && "⛏️ Minería"}
                              {tenant.moduloPrincipal === "repuestos" && "⚙️ Repuestos"}
                              {tenant.moduloPrincipal === "moda" && "👗 Moda"}
                              {tenant.moduloPrincipal === "ganaderia" && "🐄 Ganadería"}
                              {!["salud", "horeca", "minero", "repuestos", "moda", "ganaderia"].includes(tenant.moduloPrincipal) &&
                                tenant.moduloPrincipal}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <select
                              value={tenant.tipoLicencia}
                              onChange={(e) => handleCambiarPlan(tenant, e.target.value as TipoLicencia)}
                              className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-[11px] font-bold text-cyan-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
                            >
                              <option value="DEMO">DEMO</option>
                              <option value="BASICO">BÁSICO</option>
                              <option value="PROFESIONAL">PROFESIONAL</option>
                              <option value="ENTERPRISE">ENTERPRISE</option>
                            </select>
                          </td>
                          <td className="p-3.5">
                            <button
                              onClick={() => handleToggleActivo(tenant)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border cursor-pointer transition-all ${
                                tenant.activa
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                                  : "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20"
                              }`}
                            >
                              {tenant.activa ? "● Activo" : "○ Suspendido"}
                            </button>
                          </td>
                          <td className="p-3.5 font-mono text-slate-300">
                            {tenant.fechaVencimientoPago || "Ilimitado"}
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Botón Renovar +1 Mes */}
                              <button
                                onClick={() => handleRenovar(tenant, 1)}
                                className="px-2 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[11px] font-medium transition-colors cursor-pointer"
                                title="Extender +1 mes"
                              >
                                +1m
                              </button>
                              
                              {/* Botón Renovar +1 Año */}
                              <button
                                onClick={() => handleRenovar(tenant, 12)}
                                className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-medium transition-colors cursor-pointer"
                                title="Extender +1 año"
                              >
                                +1y
                              </button>

                              {/* Botón Gestionar Módulos */}
                              <button
                                onClick={() => handleAbrirModulos(tenant)}
                                className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                                title="Módulos Habilitados"
                              >
                                <span>📦</span> Módulos
                              </button>

                              {/* Botón Crear Usuario */}
                              <button
                                onClick={() => {
                                  setTenantSeleccionado(tenant);
                                  setShowUsuarioModal(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                                title="Aprovisionar Usuario Admin"
                              >
                                <span>👤</span> Usuario
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}
        </div>

        {/* PIE DE PÁGINA DEL MODAL */}
        <div className="px-6 py-3.5 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Motor de Gobernanza Aurora Core • Tenant Isolation Protocol</span>
          </div>
          <div>Aurora Plus Enterprise Suite © 2026</div>
        </div>

      </div>

      {/* MODAL: APROVISIONAR NUEVO TENANT */}
      {showNuevoModal && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>🚀</span> Aprovisionar Nuevo Tenant / Cliente
              </h3>
              <button
                onClick={() => setShowNuevoModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearTenantSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nombre de la Organización / Empresa</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Policlínica del Este, C.A."
                  value={nuevoForm.nombreEmpresa}
                  onChange={(e) => setNuevoForm({ ...nuevoForm, nombreEmpresa: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Módulo Vertical Principal</label>
                  <select
                    value={nuevoForm.moduloPrincipal}
                    onChange={(e) => setNuevoForm({ ...nuevoForm, moduloPrincipal: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="salud">Salud & Clínicas</option>
                    <option value="horeca">Gastronomía & Rest.</option>
                    <option value="minero">Minería & Pesaje</option>
                    <option value="repuestos">Repuestos Automotrices</option>
                    <option value="moda">Moda & Calzado</option>
                    <option value="ganaderia">Ganadería & Agro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Plan de Licencia</label>
                  <select
                    value={nuevoForm.tipoLicencia}
                    onChange={(e) => setNuevoForm({ ...nuevoForm, tipoLicencia: e.target.value as TipoLicencia })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ENTERPRISE">ENTERPRISE (Full)</option>
                    <option value="PROFESIONAL">PROFESIONAL</option>
                    <option value="BASICO">BÁSICO</option>
                    <option value="DEMO">DEMO</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Vigencia Inicial</label>
                  <select
                    value={nuevoForm.mesesVigencia}
                    onChange={(e) => setNuevoForm({ ...nuevoForm, mesesVigencia: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value={1}>1 Mes</option>
                    <option value={3}>3 Meses</option>
                    <option value={6}>6 Meses</option>
                    <option value={12}>12 Meses (1 Año)</option>
                    <option value={24}>24 Meses (2 Años)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Moneda Base</label>
                  <select
                    value={nuevoForm.monedaBase}
                    onChange={(e) => setNuevoForm({ ...nuevoForm, monedaBase: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="VES">VES (Bs.)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Email de Contacto</label>
                  <input
                    type="email"
                    placeholder="gerencia@cliente.com"
                    value={nuevoForm.emailContacto}
                    onChange={(e) => setNuevoForm({ ...nuevoForm, emailContacto: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Teléfono</label>
                  <input
                    type="text"
                    placeholder="+58 414-0000000"
                    value={nuevoForm.telefonoContacto}
                    onChange={(e) => setNuevoForm({ ...nuevoForm, telefonoContacto: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2">
                <div className="text-[11px] font-bold text-teal-400">Credenciales Iniciales del Administrador del Tenant</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 text-[10px]">Usuario Admin</label>
                    <input
                      type="text"
                      value={nuevoForm.usuarioInicial}
                      onChange={(e) => setNuevoForm({ ...nuevoForm, usuarioInicial: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[10px]">Contraseña</label>
                    <input
                      type="password"
                      value={nuevoForm.passwordInicial}
                      onChange={(e) => setNuevoForm({ ...nuevoForm, passwordInicial: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNuevoModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creandoTenant}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/30 cursor-pointer disabled:opacity-50"
                >
                  {creandoTenant ? "Aprovisionando..." : "Desplegar Tenant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GESTIÓN DE MÓDULOS DE UN TENANT */}
      {showModulosModal && tenantSeleccionado && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/50 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>📦</span> Módulos Habilitados para Tenant #{tenantSeleccionado.tenantId}
                </h3>
                <p className="text-xs text-purple-300 font-semibold">{tenantSeleccionado.nombreEmpresa}</p>
              </div>
              <button
                onClick={() => setShowModulosModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {MODULOS_DISPONIBLES.map((mod) => {
                const activo = modulosTenant.some((m) => m.moduloNombre === mod.id && m.activo);
                return (
                  <div
                    key={mod.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                      activo
                        ? "bg-purple-950/30 border-purple-500/40 text-white shadow-inner"
                        : "bg-slate-950/50 border-slate-800 text-slate-400"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{mod.icon}</span>
                      <div>
                        <div className="font-bold text-xs text-slate-200">{mod.label}</div>
                        <div className="text-[10px] text-slate-400">{mod.desc}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleModulo(mod.id, activo)}
                      disabled={loadingModulos}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        activo
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                          : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-white"
                      }`}
                    >
                      {activo ? "✓ HABILITADO" : "+ Habilitar"}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowModulosModal(false)}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-purple-600/30"
              >
                Cerrar y Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: APROVISIONAR USUARIO PARA TENANT */}
      {showUsuarioModal && tenantSeleccionado && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-500/50 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>👤</span> Crear Usuario para Tenant #{tenantSeleccionado.tenantId}
                </h3>
                <p className="text-xs text-cyan-300 font-semibold">{tenantSeleccionado.nombreEmpresa}</p>
              </div>
              <button
                onClick={() => setShowUsuarioModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearUsuarioSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nombre Completo</label>
                <input
                  type="text"
                  placeholder="Ej: Lic. Elena Torres"
                  value={usuarioForm.nombreCompleto}
                  onChange={(e) => setUsuarioForm({ ...usuarioForm, nombreCompleto: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nombre de Usuario (Login)</label>
                <input
                  type="text"
                  required
                  placeholder="elena.torres"
                  value={usuarioForm.username}
                  onChange={(e) => setUsuarioForm({ ...usuarioForm, username: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Contraseña</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={usuarioForm.password}
                  onChange={(e) => setUsuarioForm({ ...usuarioForm, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Rol en la Organización</label>
                <select
                  value={usuarioForm.rol}
                  onChange={(e) => setUsuarioForm({ ...usuarioForm, rol: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="ADMIN">ADMINISTRADOR</option>
                  <option value="MEDICO">MÉDICO / DOCTOR</option>
                  <option value="SECRETARIA">SECRETARIA / RECEPCIÓN</option>
                  <option value="GERENTE">GERENTE GENERAL</option>
                  <option value="CAJERO">CAJERO / FACTURACIÓN</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUsuarioModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creandoUsuario}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/30 cursor-pointer disabled:opacity-50"
                >
                  {creandoUsuario ? "Guardando..." : "Crear Usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
