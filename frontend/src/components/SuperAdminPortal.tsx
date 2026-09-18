import React, { useState, useEffect, useMemo } from "react";
import AuroraLogo from "../AuroraLogo";
import {
  LicenciaTenant,
  ModuloTenant,
  TipoLicencia,
  CrearTenantRequest,
  SuperAdminSession,
  SuperAdminStats,
  PagoSuscripcion,
  UsuarioTenant,
  RegistrarPagoSuperAdminRequest,
  RegalarTiempoSuperAdminRequest,
  loginSuperAdminApi,
  listarTenantsSuperAdmin,
  obtenerStatsSuperAdmin,
  ejecutarBarridoSuspensionSuperAdmin,
  listarPagosSuperAdmin,
  registrarPagoSuperAdmin,
  regalarTiempoSuperAdmin,
  impersonarTenantSuperAdmin,
  crearTenantSuperAdmin,
  activarTenantSuperAdmin,
  desactivarTenantSuperAdmin,
  cambiarPlanTenantSuperAdmin,
  listarModulosTenantSuperAdmin,
  activarModuloTenantSuperAdmin,
  concederAccesoTotalSuperAdmin,
  listarUsuariosTenantSuperAdmin,
  asignarLimiteUsuariosSuperAdmin,
  toggleUsuarioActivoSuperAdmin,
  crearUsuarioTenantSuperAdmin,
  leerSesionSuperAdmin,
  guardarSesionSuperAdmin,
  borrarSesionSuperAdmin,
  guardarSesion,
  SaasGastoFijo,
  SaasMovimientoFinanciero,
  ResumenFinancieroSaas,
  CrearGastoFijoRequest,
  RegistrarMovimientoRequest,
  obtenerResumenFinancieroSaas,
  listarGastosFijosSaas,
  crearGastoFijoSaas,
  actualizarGastoFijoSaas,
  toggleGastoFijoSaas,
  eliminarGastoFijoSaas,
  ejecutarGastoFijoSaas,
  listarMovimientosFinancierosSaas,
  registrarMovimientoFinancieroSaas,
  eliminarMovimientoFinancieroSaas,
} from "../api";

interface SuperAdminPortalProps {
  onClose?: () => void;
}

const MODULOS_SISTEMA = [
  { id: "salud", tag: "SAL", label: "Salud & MediClinic", desc: "Clinicas, expedientes medicos, vademecum, consultas" },
  { id: "ganaderia", tag: "GAN", label: "Ganaderia & Agro", desc: "Ordeño, tanques de leche, potreros y control de hato" },
  { id: "horeca", tag: "HOR", label: "Gastronomia / HORECA", desc: "Restaurantes, comandas, mesas y escandallos" },
  { id: "repuestos", tag: "COM", label: "Comercio & Retail", desc: "Punto de venta mostrador, stock, inventario y repuestos" },
  { id: "minero", tag: "MIN", label: "Mineria & Balanzas", desc: "Control de ley de mineral, bocamina y fundicion" },
  { id: "moda", tag: "MOD", label: "Moda & Calzado", desc: "Talla y color, gestion de boutiques y colecciones" },
  { id: "tamanaco-comercial", tag: "TAM", label: "Tamanaco Enterprise", desc: "Despliegue integral multi-empresa e industrial" },
];

function calcularDiasRestantes(fechaVencimiento: string | null): number {
  if (!fechaVencimiento) return 0;
  const partes = fechaVencimiento.split("-");
  const v = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const diffTime = v.getTime() - hoy.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getBadgeDias(dias: number, activa: boolean) {
  if (!activa) {
    return { texto: "Suspendido", color: "bg-rose-50 text-rose-700 border-rose-200" };
  }
  if (dias <= 0) {
    return { texto: "Vencido Hoy", color: "bg-rose-50 text-rose-700 border-rose-200" };
  }
  if (dias <= 5) {
    return { texto: `${dias} dias (Critico)`, color: "bg-rose-50 text-rose-700 border-rose-200" };
  }
  if (dias <= 15) {
    return { texto: `${dias} dias (Por vencer)`, color: "bg-amber-50 text-amber-700 border-amber-200" };
  }
  return { texto: `${dias} dias activos`, color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
}

export default function SuperAdminPortal({ onClose }: SuperAdminPortalProps) {
  const [sesion, setSesion] = useState<SuperAdminSession | null>(() => leerSesionSuperAdmin());
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loadingLogin, setLoadingLogin] = useState(false);

  const [tenants, setTenants] = useState<LicenciaTenant[]>([]);
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; tipo: "success" | "error" | "info" } | null>(null);

  // Filtros
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"TODOS" | "ACTIVOS" | "SUSPENDIDOS" | "POR_VENCER">("TODOS");
  const [filtroModulo, setFiltroModulo] = useState<string>("TODOS");

  // Modales
  const [showNuevoModal, setShowNuevoModal] = useState(false);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [showRegaloModal, setShowRegaloModal] = useState(false);
  const [showModulosModal, setShowModulosModal] = useState(false);
  const [showUsuarioModal, setShowUsuarioModal] = useState(false);
  const [showUsuariosDirectorioModal, setShowUsuariosDirectorioModal] = useState(false);
  const [showHistorialPagosModal, setShowHistorialPagosModal] = useState(false);

  // Tenants seleccionados para modales
  const [tenantParaPago, setTenantParaPago] = useState<LicenciaTenant | null>(null);
  const [tenantParaRegalo, setTenantParaRegalo] = useState<LicenciaTenant | null>(null);
  const [tenantParaModulos, setTenantParaModulos] = useState<LicenciaTenant | null>(null);
  const [tenantParaUsuario, setTenantParaUsuario] = useState<LicenciaTenant | null>(null);
  const [tenantParaUsuariosDirectorio, setTenantParaUsuariosDirectorio] = useState<LicenciaTenant | null>(null);

  // Formulario nuevo tenant
  const [nuevoForm, setNuevoForm] = useState<CrearTenantRequest>({
    nombreEmpresa: "",
    moduloPrincipal: "salud",
    tipoLicencia: "COMERCIAL",
    emailContacto: "",
    telefonoContacto: "",
    mesesVigencia: 1,
    monedaBase: "USD",
    usuarioInicial: "admin",
    passwordInicial: "admin123",
    accesoTotal: false,
    limiteUsuarios: undefined,
  });
  const [creandoTenant, setCreandoTenant] = useState(false);

  // Formulario registrar pago
  const [pagoForm, setPagoForm] = useState<RegistrarPagoSuperAdminRequest>({
    tenantId: 0,
    monto: 35.0,
    moneda: "USD",
    metodoPago: "PAGO_MOVIL",
    referenciaComprobante: "",
    meses: 1,
    dias: 0,
    notas: "",
  });
  const [registrandoPago, setRegistrandoPago] = useState(false);

  // Formulario regalar tiempo
  const [regaloForm, setRegaloForm] = useState<RegalarTiempoSuperAdminRequest>({
    dias: 15,
    motivo: "Cortesia comercial",
  });
  const [regalandoTiempo, setRegalandoTiempo] = useState(false);

  // Formulario nuevo usuario
  const [usuarioForm, setUsuarioForm] = useState({
    username: "",
    password: "",
    nombreCompleto: "",
    rol: "DUENO_ADMIN",
  });
  const [creandoUsuario, setCreandoUsuario] = useState(false);

  // Modulos de tenant
  const [modulosTenant, setModulosTenant] = useState<ModuloTenant[]>([]);
  const [loadingModulos, setLoadingModulos] = useState(false);
  const [concediendoAccesoTotal, setConcediendoAccesoTotal] = useState(false);

  // Directorio y limite de usuarios del tenant
  const [usuariosTenant, setUsuariosTenant] = useState<UsuarioTenant[]>([]);
  const [loadingUsuariosTenant, setLoadingUsuariosTenant] = useState(false);
  const [limiteUsuariosInput, setLimiteUsuariosInput] = useState<string>("");
  const [guardandoLimite, setGuardandoLimite] = useState(false);

  // Historial de pagos
  const [historialPagos, setHistorialPagos] = useState<PagoSuscripcion[]>([]);
  const [loadingPagos, setLoadingPagos] = useState(false);

  // Barrido de suspension
  const [ejecutandoBarrido, setEjecutandoBarrido] = useState(false);

  // VISTA PRINCIPAL (TENANTS vs FINANZAS)
  // VISTA PRINCIPAL (TENANTS vs PAGOS vs FINANZAS)
  const [vistaPrincipal, setVistaPrincipal] = useState<"TENANTS" | "PAGOS" | "FINANZAS">("TENANTS");

  // FILTROS Y ESTADOS DEL MODULO DEDICADO DE HISTORIAL DE PAGOS
  const [filtroPagosTenant, setFiltroPagosTenant] = useState<number | "TODOS">("TODOS");
  const [filtroPagosMetodo, setFiltroPagosMetodo] = useState<string>("TODOS");
  const [filtroPagosTexto, setFiltroPagosTexto] = useState<string>("");

  // ESTADOS DEL MODULO FINANCIERO SAAS
  const [mesFinanzas, setMesFinanzas] = useState<string>(() => new Date().toISOString().substring(0, 7));
  const [subTabFinanzas, setSubTabFinanzas] = useState<"MOVIMIENTOS" | "GASTOS_FIJOS">("MOVIMIENTOS");
  const [resumenFinanzas, setResumenFinanzas] = useState<ResumenFinancieroSaas | null>(null);
  const [gastosFijos, setGastosFijos] = useState<SaasGastoFijo[]>([]);
  const [movimientos, setMovimientos] = useState<SaasMovimientoFinanciero[]>([]);
  const [cargandoFinanzas, setCargandoFinanzas] = useState(false);
  const [filtroTipoMovimiento, setFiltroTipoMovimiento] = useState<"TODOS" | "INGRESO" | "EGRESO">("TODOS");
  const [filtroTextoMovimiento, setFiltroTextoMovimiento] = useState("");

  // Modales de Finanzas
  const [showGastoFijoModal, setShowGastoFijoModal] = useState(false);
  const [gastoFijoEnEdicion, setGastoFijoEnEdicion] = useState<SaasGastoFijo | null>(null);
  const [gastoFijoForm, setGastoFijoForm] = useState<CrearGastoFijoRequest>({
    concepto: "",
    categoria: "INFRAESTRUCTURA",
    montoUsd: 0,
    periodicidad: "MENSUAL",
    diaPago: 1,
    metodoPago: "TARJETA_CREDITO",
    proveedor: "",
    notas: "",
  });

  const [showMovimientoModal, setShowMovimientoModal] = useState(false);
  const [movimientoForm, setMovimientoForm] = useState<RegistrarMovimientoRequest>({
    tipo: "EGRESO",
    categoria: "INFRAESTRUCTURA",
    concepto: "",
    montoUsd: 0,
    fechaMovimiento: new Date().toISOString().substring(0, 10),
    metodoPago: "TRANSFERENCIA_BANCARIA",
    referenciaComprobante: "",
    notas: "",
  });

  const [showEjecutarGastoModal, setShowEjecutarGastoModal] = useState(false);
  const [gastoParaEjecutar, setGastoParaEjecutar] = useState<SaasGastoFijo | null>(null);
  const [referenciaEjecucion, setReferenciaEjecucion] = useState("");

  const avisar = (msg: string, tipo: "success" | "error" | "info" = "success") => {
    setFeedback({ msg, tipo });
    setTimeout(() => setFeedback(null), 5000);
  };

  const cargarTodo = async () => {
    setLoadingData(true);
    try {
      const [listaTenants, st] = await Promise.all([
        listarTenantsSuperAdmin(),
        obtenerStatsSuperAdmin().catch(() => null),
      ]);
      setTenants(listaTenants);
      setStats(st);
    } catch (err: any) {
      avisar(err?.message || "Error al cargar datos de SuperAdmin", "error");
    } finally {
      setLoadingData(false);
    }
  };

  // FUNCIONES DEL MODULO FINANCIERO SAAS
  const cargarDatosFinancieros = async (mesAUsar = mesFinanzas) => {
    if (!sesion) return;
    try {
      setCargandoFinanzas(true);
      const [resumen, gf, movs] = await Promise.all([
        obtenerResumenFinancieroSaas(mesAUsar),
        listarGastosFijosSaas(),
        listarMovimientosFinancierosSaas(mesAUsar, filtroTipoMovimiento),
      ]);
      setResumenFinanzas(resumen);
      setGastosFijos(gf);
      setMovimientos(movs);
    } catch (e: any) {
      avisar(e?.message || "Error al cargar informacion financiera", "error");
    } finally {
      setCargandoFinanzas(false);
    }
  };

  useEffect(() => {
    if (sesion && vistaPrincipal === "FINANZAS") {
      cargarDatosFinancieros(mesFinanzas);
    }
  }, [sesion, vistaPrincipal, mesFinanzas, filtroTipoMovimiento]);

  const handleGuardarGastoFijo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gastoFijoForm.concepto || Number(gastoFijoForm.montoUsd) <= 0) {
      avisar("Concepto y monto valido requeridos", "error");
      return;
    }
    try {
      if (gastoFijoEnEdicion) {
        await actualizarGastoFijoSaas(gastoFijoEnEdicion.id, {
          ...gastoFijoForm,
          montoUsd: Number(gastoFijoForm.montoUsd),
        });
        avisar("Gasto fijo actualizado exitosamente");
      } else {
        await crearGastoFijoSaas({
          ...gastoFijoForm,
          montoUsd: Number(gastoFijoForm.montoUsd),
        });
        avisar("Gasto fijo programado exitosamente");
      }
      setShowGastoFijoModal(false);
      setGastoFijoEnEdicion(null);
      await cargarDatosFinancieros();
    } catch (e: any) {
      avisar(e?.message || "Error al guardar gasto fijo", "error");
    }
  };

  const handleToggleGastoFijo = async (id: number) => {
    try {
      await toggleGastoFijoSaas(id);
      avisar("Estado de gasto fijo actualizado");
      await cargarDatosFinancieros();
    } catch (e: any) {
      avisar(e?.message || "Error al alternar gasto fijo", "error");
    }
  };

  const handleEliminarGastoFijo = async (id: number) => {
    if (!confirm("Esta seguro de eliminar este gasto fijo programado?")) return;
    try {
      await eliminarGastoFijoSaas(id);
      avisar("Gasto fijo eliminado");
      await cargarDatosFinancieros();
    } catch (e: any) {
      avisar(e?.message || "Error al eliminar gasto fijo", "error");
    }
  };

  const handleConfirmarEjecutarGastoFijo = async () => {
    if (!gastoParaEjecutar) return;
    try {
      await ejecutarGastoFijoSaas(gastoParaEjecutar.id, referenciaEjecucion);
      avisar(`Egreso asentado para ${gastoParaEjecutar.concepto}`);
      setShowEjecutarGastoModal(false);
      setGastoParaEjecutar(null);
      setReferenciaEjecucion("");
      await cargarDatosFinancieros();
    } catch (e: any) {
      avisar(e?.message || "Error al ejecutar gasto fijo como egreso", "error");
    }
  };

  const handleGuardarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movimientoForm.concepto || Number(movimientoForm.montoUsd) <= 0) {
      avisar("Concepto y monto valido requeridos", "error");
      return;
    }
    try {
      await registrarMovimientoFinancieroSaas({
        ...movimientoForm,
        montoUsd: Number(movimientoForm.montoUsd),
      });
      avisar(`${movimientoForm.tipo === "INGRESO" ? "Ingreso extra" : "Egreso operativo"} registrado con exito`);
      setShowMovimientoModal(false);
      await cargarDatosFinancieros();
    } catch (e: any) {
      avisar(e?.message || "Error al registrar movimiento financiero", "error");
    }
  };

  const handleEliminarMovimiento = async (id: number) => {
    if (!confirm("Esta seguro de anular este movimiento del libro contable?")) return;
    try {
      await eliminarMovimientoFinancieroSaas(id);
      avisar("Movimiento eliminado");
      await cargarDatosFinancieros();
    } catch (e: any) {
      avisar(e?.message || "Error al eliminar movimiento", "error");
    }
  };

  const movimientosFiltrados = useMemo(() => {
    if (!filtroTextoMovimiento.trim()) return movimientos;
    const txt = filtroTextoMovimiento.toLowerCase();
    return movimientos.filter(
      (m) =>
        m.concepto.toLowerCase().includes(txt) ||
        m.categoria.toLowerCase().includes(txt) ||
        (m.referenciaComprobante && m.referenciaComprobante.toLowerCase().includes(txt)) ||
        (m.notas && m.notas.toLowerCase().includes(txt))
    );
  }, [movimientos, filtroTextoMovimiento]);

  useEffect(() => {
    if (sesion) {
      cargarTodo();
    }
  }, [sesion]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoadingLogin(true);
    try {
      const token = await loginSuperAdminApi(usernameInput.trim(), passwordInput);
      const s: SuperAdminSession = {
        token,
        username: usernameInput.trim(),
        autenticado: true,
      };
      guardarSesionSuperAdmin(s);
      setSesion(s);
      avisar(`Sesion iniciada como SuperAdmin (${s.username})`);
    } catch (err: any) {
      setLoginError(err?.message || "Credenciales invalidas de SuperAdmin");
    } finally {
      setLoadingLogin(false);
    }
  };

  const handleLogout = () => {
    borrarSesionSuperAdmin();
    setSesion(null);
  };

  const handleBarrido = async () => {
    setEjecutandoBarrido(true);
    try {
      const res = await ejecutarBarridoSuspensionSuperAdmin();
      avisar(res.mensaje || "Barrido de licencias ejecutado.");
      cargarTodo();
    } catch (err: any) {
      avisar(err?.message || "Error al ejecutar barrido", "error");
    } finally {
      setEjecutandoBarrido(false);
    }
  };

  const handleActivar = async (tenantId: number) => {
    try {
      await activarTenantSuperAdmin(tenantId);
      avisar(`Tenant #${tenantId} reactivado exitosamente.`);
      cargarTodo();
    } catch (err: any) {
      avisar(err?.message || "Error al reactivar tenant", "error");
    }
  };

  const handleDesactivar = async (tenantId: number) => {
    if (!confirm(`Confirma suspender manualmente el Tenant #${tenantId}?`)) return;
    try {
      await desactivarTenantSuperAdmin(tenantId);
      avisar(`Tenant #${tenantId} suspendido.`);
      cargarTodo();
    } catch (err: any) {
      avisar(err?.message || "Error al suspender tenant", "error");
    }
  };

  const handleCambiarPlan = async (tenantId: number, plan: TipoLicencia) => {
    try {
      await cambiarPlanTenantSuperAdmin(tenantId, plan);
      avisar(`Plan actualizado a ${plan} para Tenant #${tenantId}.`);
      cargarTodo();
    } catch (err: any) {
      avisar(err?.message || "Error al cambiar plan", "error");
    }
  };

  const handleImpersonar = async (tenantId: number) => {
    try {
      const res = await impersonarTenantSuperAdmin(tenantId);
      avisar(`Acceso de soporte concedido para ${res.nombreEmpresa}. Abriendo sesion...`);
      // Usa la MISMA sesión que lee el resto de la app (guardarSesion/leerSesion en
      // api.ts, clave "aurora_token") — antes esto escribía claves sueltas
      // ("aurora_auth_token", etc.) que nadie más leía, así que "Impersonar" no
      // dejaba realmente logueado como el tenant al entrar a /dashboard.
      guardarSesion({ token: res.token, rol: "DUENO_ADMIN", username: "soporte-superadmin", tenantId: Number(res.tenantId) });
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);
    } catch (err: any) {
      avisar(err?.message || "Error al impersonar tenant", "error");
    }
  };

  const abrirModalPago = (tenant: LicenciaTenant) => {
    setTenantParaPago(tenant);
    setPagoForm({
      tenantId: tenant.tenantId,
      monto: 35.0,
      moneda: "USD",
      metodoPago: "PAGO_MOVIL",
      referenciaComprobante: "",
      meses: 1,
      dias: 0,
      notas: "",
    });
    setShowPagoModal(true);
  };

  const handleRegistrarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistrandoPago(true);
    try {
      await registrarPagoSuperAdmin(pagoForm);
      avisar(`Pago registrado. Licencia extendida y reactivada.`);
      setShowPagoModal(false);
      cargarTodo();
    } catch (err: any) {
      avisar(err?.message || "Error al registrar pago", "error");
    } finally {
      setRegistrandoPago(false);
    }
  };

  const abrirModalRegalo = (tenant: LicenciaTenant) => {
    setTenantParaRegalo(tenant);
    setRegaloForm({ dias: 15, motivo: "Cortesia de soporte" });
    setShowRegaloModal(true);
  };

  const handleRegalarTiempo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantParaRegalo) return;
    setRegalandoTiempo(true);
    try {
      await regalarTiempoSuperAdmin(tenantParaRegalo.tenantId, regaloForm);
      avisar(`Se acreditaron +${regaloForm.dias} dias a "${tenantParaRegalo.nombreEmpresa}".`);
      setShowRegaloModal(false);
      cargarTodo();
    } catch (err: any) {
      avisar(err?.message || "Error al regalar tiempo", "error");
    } finally {
      setRegalandoTiempo(false);
    }
  };

  const abrirModalModulos = async (tenant: LicenciaTenant) => {
    setTenantParaModulos(tenant);
    setShowModulosModal(true);
    setLoadingModulos(true);
    try {
      const mods = await listarModulosTenantSuperAdmin(tenant.tenantId);
      setModulosTenant(mods);
    } catch (err: any) {
      avisar("Error al consultar modulos del tenant", "error");
    } finally {
      setLoadingModulos(false);
    }
  };

  const handleConcederAccesoTotal = async () => {
    if (!tenantParaModulos) return;
    setConcediendoAccesoTotal(true);
    try {
      await concederAccesoTotalSuperAdmin(tenantParaModulos.tenantId);
      avisar(`Acceso Total concedido a "${tenantParaModulos.nombreEmpresa}". Suite completa activada.`);
      const mods = await listarModulosTenantSuperAdmin(tenantParaModulos.tenantId);
      setModulosTenant(mods);
      cargarTodo();
    } catch (err: any) {
      avisar(err?.message || "Error al conceder acceso total", "error");
    } finally {
      setConcediendoAccesoTotal(false);
    }
  };

  const handleToggleModulo = async (moduloNombre: string, activoActual: boolean) => {
    if (!tenantParaModulos) return;
    try {
      await activarModuloTenantSuperAdmin(tenantParaModulos.tenantId, moduloNombre, !activoActual);
      const mods = await listarModulosTenantSuperAdmin(tenantParaModulos.tenantId);
      setModulosTenant(mods);
      avisar(`Modulo "${moduloNombre}" ${!activoActual ? "habilitado" : "deshabilitado"}.`);
    } catch (err: any) {
      avisar(err?.message || "Error al cambiar modulo", "error");
    }
  };

  // Directorio y gestion de limite de usuarios
  const abrirModalUsuariosDirectorio = async (tenant: LicenciaTenant) => {
    setTenantParaUsuariosDirectorio(tenant);
    setLimiteUsuariosInput(tenant.limiteUsuarios ? String(tenant.limiteUsuarios) : "");
    setShowUsuariosDirectorioModal(true);
    setLoadingUsuariosTenant(true);
    try {
      const users = await listarUsuariosTenantSuperAdmin(tenant.tenantId);
      setUsuariosTenant(users);
    } catch (err: any) {
      avisar(err?.message || "Error al listar usuarios del tenant", "error");
    } finally {
      setLoadingUsuariosTenant(false);
    }
  };

  const handleGuardarLimite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantParaUsuariosDirectorio) return;
    setGuardandoLimite(true);
    try {
      const val = limiteUsuariosInput.trim();
      const num = val === "" ? null : Number(val);
      const actualizada = await asignarLimiteUsuariosSuperAdmin(tenantParaUsuariosDirectorio.tenantId, num);
      setTenantParaUsuariosDirectorio(actualizada);
      avisar(`Limite de usuarios actualizado a: ${actualizada.limiteUsuarios ? actualizada.limiteUsuarios + " usuarios" : "Ilimitado"}.`);
      cargarTodo();
    } catch (err: any) {
      avisar(err?.message || "Error al actualizar limite", "error");
    } finally {
      setGuardandoLimite(false);
    }
  };

  const handleToggleUsuarioActivo = async (usuarioId: number) => {
    if (!tenantParaUsuariosDirectorio) return;
    try {
      await toggleUsuarioActivoSuperAdmin(tenantParaUsuariosDirectorio.tenantId, usuarioId);
      const users = await listarUsuariosTenantSuperAdmin(tenantParaUsuariosDirectorio.tenantId);
      setUsuariosTenant(users);
      avisar("Estado de usuario modificado.");
      cargarTodo();
    } catch (err: any) {
      avisar(err?.message || "Error al modificar estado de usuario", "error");
    }
  };

  const handleCrearTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreandoTenant(true);
    try {
      const nuevo = await crearTenantSuperAdmin(nuevoForm);
      avisar(`Negocio "${nuevo.nombreEmpresa}" dado de alta con ID #${nuevo.tenantId}.`);
      setShowNuevoModal(false);
      setNuevoForm({
        nombreEmpresa: "",
        moduloPrincipal: "salud",
        tipoLicencia: "COMERCIAL",
        emailContacto: "",
        telefonoContacto: "",
        mesesVigencia: 1,
        monedaBase: "USD",
        usuarioInicial: "admin",
        passwordInicial: "admin123",
        accesoTotal: false,
        limiteUsuarios: undefined,
      });
      cargarTodo();
    } catch (err: any) {
      avisar(err?.message || "Error al crear tenant", "error");
    } finally {
      setCreandoTenant(false);
    }
  };

  const abrirModalUsuario = (tenant: LicenciaTenant) => {
    setTenantParaUsuario(tenant);
    setUsuarioForm({
      username: "",
      password: "",
      nombreCompleto: "",
      rol: "DUENO_ADMIN",
    });
    setShowUsuarioModal(true);
  };

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantParaUsuario) return;
    setCreandoUsuario(true);
    try {
      await crearUsuarioTenantSuperAdmin(tenantParaUsuario.tenantId, usuarioForm);
      avisar(`Usuario "${usuarioForm.username}" creado para ${tenantParaUsuario.nombreEmpresa}.`);
      setShowUsuarioModal(false);
      // Si el directorio de usuarios esta abierto para este tenant, refrescarlo
      if (tenantParaUsuariosDirectorio && tenantParaUsuariosDirectorio.tenantId === tenantParaUsuario.tenantId) {
        const users = await listarUsuariosTenantSuperAdmin(tenantParaUsuario.tenantId);
        setUsuariosTenant(users);
      }
      cargarTodo();
    } catch (err: any) {
      avisar(err?.message || "Error al crear usuario", "error");
    } finally {
      setCreandoUsuario(false);
    }
  };

  const abrirHistorialPagos = async (tenantId?: number) => {
    setVistaPrincipal("PAGOS");
    if (tenantId) {
      setFiltroPagosTenant(tenantId);
    } else {
      setFiltroPagosTenant("TODOS");
    }
    await cargarPagos(tenantId);
  };

  // CALCULOS Y MEMOS DEL MODULO DEDICADO DE PAGOS
  const totalCobradoHistorico = useMemo(() => {
    return historialPagos.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
  }, [historialPagos]);

  const mesActualStr = useMemo(() => new Date().toISOString().substring(0, 7), []);

  const pagosMesActual = useMemo(() => {
    return historialPagos.filter((p) => p.fechaPago && p.fechaPago.startsWith(mesActualStr));
  }, [historialPagos, mesActualStr]);

  const totalCobradoMes = useMemo(() => {
    return pagosMesActual.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
  }, [pagosMesActual]);

  const ticketPromedio = useMemo(() => {
    return historialPagos.length > 0 ? totalCobradoHistorico / historialPagos.length : 0;
  }, [historialPagos, totalCobradoHistorico]);

  const totalDiasAcreditados = useMemo(() => {
    return historialPagos.reduce((acc, p) => acc + (p.diasAcreditados || 0), 0);
  }, [historialPagos]);

  const pagosFiltrados = useMemo(() => {
    return historialPagos.filter((p) => {
      if (filtroPagosTenant !== "TODOS" && p.tenantId !== filtroPagosTenant) return false;
      if (filtroPagosMetodo !== "TODOS" && p.metodoPago !== filtroPagosMetodo) return false;
      if (filtroPagosTexto.trim()) {
        const q = filtroPagosTexto.toLowerCase();
        const coincide =
          p.nombreEmpresa.toLowerCase().includes(q) ||
          String(p.tenantId).includes(q) ||
          (p.referenciaComprobante && p.referenciaComprobante.toLowerCase().includes(q)) ||
          (p.metodoPago && p.metodoPago.toLowerCase().includes(q)) ||
          (p.notas && p.notas.toLowerCase().includes(q));
        if (!coincide) return false;
      }
      return true;
    });
  }, [historialPagos, filtroPagosTenant, filtroPagosMetodo, filtroPagosTexto]);

  const cargarPagos = async (tenantId?: number) => {
    setLoadingPagos(true);
    try {
      const pagos = await listarPagosSuperAdmin(tenantId);
      setHistorialPagos(pagos);
    } catch (err: any) {
      avisar("Error al consultar historial de pagos", "error");
    } finally {
      setLoadingPagos(false);
    }
  };

  const abrirModalPagoDesdeModulo = () => {
    if (tenants.length > 0) {
      abrirModalPago(tenants[0]);
    } else {
      avisar("No hay tenants registrados para registrar un cobro", "info");
    }
  };

  // Filtrado de tenants
  const tenantsFiltrados = useMemo(() => {
    return tenants.filter((t) => {
      if (filtroTexto.trim()) {
        const q = filtroTexto.toLowerCase();
        const coincide =
          t.nombreEmpresa.toLowerCase().includes(q) ||
          String(t.tenantId).includes(q) ||
          (t.emailContacto && t.emailContacto.toLowerCase().includes(q)) ||
          t.moduloPrincipal.toLowerCase().includes(q);
        if (!coincide) return false;
      }

      const dias = calcularDiasRestantes(t.fechaVencimientoPago);
      if (filtroEstado === "ACTIVOS" && (!t.activa || dias <= 0)) return false;
      if (filtroEstado === "SUSPENDIDOS" && t.activa && dias > 0) return false;
      if (filtroEstado === "POR_VENCER" && (!t.activa || dias > 15 || dias <= 0)) return false;

      if (filtroModulo !== "TODOS" && t.moduloPrincipal !== filtroModulo) return false;

      return true;
    });
  }, [tenants, filtroTexto, filtroEstado, filtroModulo]);

  // LOGIN SCREEN
  if (!sesion) {
    return (
      <div className={onClose ? "fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md overflow-y-auto flex items-center justify-center p-4 sm:p-6 animate-fadeIn" : "min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800"}>
        <div className="w-full max-w-md p-8 bg-white rounded-3xl border border-slate-200 shadow-2xl space-y-6 relative my-auto">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-all cursor-pointer font-bold text-xs"
              title="Cerrar"
            >
              [X]
            </button>
          )}
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-teal-50 border border-teal-200 shadow-xs">
              <AuroraLogo size={40} animated={false} />
            </div>
            <h1 className="font-['Outfit'] text-2xl font-black text-slate-900 tracking-tight">
              Centro de Control Maestro
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Aurora Suite Cloud Enterprise. Acceso restringido para administradores.
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold text-center">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                Usuario Maestro
              </label>
              <input
                type="text"
                required
                placeholder="admin"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:border-slate-800 focus:ring-1 focus:ring-slate-800 bg-white font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                Contraseña de Seguridad
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:border-slate-800 focus:ring-1 focus:ring-slate-800 bg-white font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loadingLogin}
              className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm tracking-wide transition-all shadow-md shadow-teal-600/20 cursor-pointer disabled:opacity-50"
            >
              {loadingLogin ? "Validando credenciales..." : "Iniciar Sesion SuperAdmin"}
            </button>
          </form>

          {onClose && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
              >
                Volver a la aplicacion
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // MAIN DASHBOARD (Aurora White Professional)
  return (
    <div className={onClose ? "fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md overflow-y-auto p-3 sm:p-6 animate-fadeIn flex flex-col" : "min-h-screen bg-slate-50 text-slate-800 font-sans p-4 sm:p-6 lg:p-8 space-y-6"}>
      <div className={onClose ? "max-w-7xl mx-auto w-full bg-slate-50 text-slate-800 font-sans p-4 sm:p-6 lg:p-8 space-y-6 rounded-3xl shadow-2xl border border-slate-200 my-auto" : "space-y-6"}>
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`fixed top-4 right-4 z-[10000] px-5 py-3 rounded-2xl shadow-xl border text-xs font-bold transition-all ${
            feedback.tipo === "error"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          {feedback.msg}
        </div>
      )}

      {/* HEADER SUPERADMIN */}
      <header className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-2xl bg-teal-50 border border-teal-200/80 shadow-xs flex items-center justify-center">
            <AuroraLogo size={32} animated={false} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-['Outfit'] font-black text-xl text-slate-900 tracking-tight">
                Panel Maestro de SuperAdmin
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-wider border border-slate-200">
                Modo Maestro
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Control de licencias, facturacion, capacidad de usuarios y acceso a la suite Aurora.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleBarrido}
            disabled={ejecutandoBarrido}
            className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 border border-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Suspende automaticamente los negocios que ya expiraron su fecha de vencimiento"
          >
            <span>{ejecutandoBarrido ? "Ejecutando..." : "Barrido de Suspension"}</span>
          </button>

          <button
            onClick={() => abrirHistorialPagos()}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer border ${
              vistaPrincipal === "PAGOS"
                ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
            }`}
          >
            Historial de Pagos
          </button>

          <button
            onClick={() => setShowNuevoModal(true)}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-xs shadow-teal-600/20 transition-all cursor-pointer"
          >
            + Nuevo Negocio
          </button>

          <button
            onClick={handleLogout}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-bold text-xs transition-all cursor-pointer"
          >
            Cerrar Sesion
          </button>

          {onClose ? (
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 cursor-pointer text-xs font-bold transition-all shadow-2xs"
              title="Cerrar SuperAdmin"
            >
              Cerrar Portal
            </button>
          ) : (
            <button
              onClick={() => window.location.href = "/"}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer text-xs font-bold transition-all"
              title="Ir a la pagina principal"
            >
              Volver al Inicio
            </button>
          )}
        </div>
      </header>

      {/* BARRA DE NAVEGACION PRINCIPAL SUPERADMIN */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          onClick={() => setVistaPrincipal("TENANTS")}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            vistaPrincipal === "TENANTS"
              ? "bg-teal-600 text-white shadow-sm shadow-teal-600/20"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <span>Directorio de Tenants</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            vistaPrincipal === "TENANTS" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
          }`}>
            {tenants.length}
          </span>
        </button>

        <button
          onClick={() => {
            setVistaPrincipal("PAGOS");
            cargarPagos(filtroPagosTenant === "TODOS" ? undefined : filtroPagosTenant);
          }}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            vistaPrincipal === "PAGOS"
              ? "bg-teal-600 text-white shadow-sm shadow-teal-600/20"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <span>Historial de Cobros & Pagos</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            vistaPrincipal === "PAGOS" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
          }`}>
            {historialPagos.length}
          </span>
        </button>

        <button
          onClick={() => {
            setVistaPrincipal("FINANZAS");
            cargarDatosFinancieros();
          }}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            vistaPrincipal === "FINANZAS"
              ? "bg-teal-600 text-white shadow-sm shadow-teal-600/20"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <span>Finanzas & Contabilidad SaaS</span>
          {resumenFinanzas && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              vistaPrincipal === "FINANZAS" ? "bg-white/20 text-white" : "bg-teal-50 text-teal-700 border border-teal-200"
            }`}>
              ${resumenFinanzas.totalIngresos.toFixed(2)}
            </span>
          )}
        </button>
      </div>

            {/* VISTA: TENANTS Y CLIENTES */}
      {vistaPrincipal === "TENANTS" && (
        <div className="space-y-6 animate-fadeIn">
{/* KPIS CARDS (5 columnas ahora con total usuarios) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Negocios</span>
          <div className="font-['Outfit'] text-3xl font-black text-slate-900">
            {stats?.totalTenants ?? tenants.length}
          </div>
          <span className="text-[10px] text-slate-500">Registrados en la suite</span>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Activos & Vigentes</span>
          <div className="font-['Outfit'] text-3xl font-black text-emerald-600">
            {stats?.activos ?? tenants.filter((t) => t.activa).length}
          </div>
          <span className="text-[10px] text-slate-500">Con acceso operativo al sistema</span>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Suspendidos / Vencidos</span>
          <div className="font-['Outfit'] text-3xl font-black text-rose-600">
            {stats?.suspendidos ?? tenants.filter((t) => !t.activa).length}
          </div>
          <span className="text-[10px] text-slate-500">Sin licencia activa</span>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Usuarios en Plataforma</span>
          <div className="font-['Outfit'] text-3xl font-black text-blue-600">
            {stats?.totalUsuarios ?? tenants.reduce((acc, t) => acc + (t.cantidadUsuarios || 0), 0)}
          </div>
          <span className="text-[10px] text-slate-500">Cuentas creadas por tenants</span>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Ingresos Mes (USD)</span>
          <div className="font-['Outfit'] text-3xl font-black text-slate-900 font-mono">
            ${(stats?.ingresosMes ?? 0).toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-500">Suscripciones cobradas este mes</span>
        </div>
      </div>

      {/* FILTROS POR VERTICAL Y BUSCADOR */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Pills por Modulo */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={() => setFiltroModulo("TODOS")}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                filtroModulo === "TODOS"
                  ? "bg-teal-600 text-white shadow-xs shadow-teal-600/20"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Todos los Modulos ({tenants.length})
            </button>
            {MODULOS_SISTEMA.map((m) => {
              const cant = stats?.tenantsPorModulo?.[m.id] ?? tenants.filter((t) => t.moduloPrincipal === m.id).length;
              return (
                <button
                  key={m.id}
                  onClick={() => setFiltroModulo(m.id)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    filtroModulo === m.id
                      ? "bg-teal-600 text-white shadow-xs shadow-teal-600/20"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span className="text-[9px] px-1 py-0.5 rounded-md bg-slate-200/80 text-slate-700 font-mono font-black">
                    {m.tag}
                  </span>
                  <span>{m.label}</span>
                  <span className="text-[10px] opacity-75 font-mono">({cant})</span>
                </button>
              );
            })}
          </div>

          {/* Filtro por estado */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs">
            {(["TODOS", "ACTIVOS", "POR_VENCER", "SUSPENDIDOS"] as const).map((est) => (
              <button
                key={est}
                onClick={() => setFiltroEstado(est)}
                className={`px-3.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                  filtroEstado === est
                    ? "bg-teal-600 text-white shadow-xs shadow-teal-600/20"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {est === "TODOS" && "Todos"}
                {est === "ACTIVOS" && "Activos"}
                {est === "POR_VENCER" && "Por Vencer"}
                {est === "SUSPENDIDOS" && "Suspendidos"}
              </button>
            ))}
          </div>
        </div>

        {/* Buscador */}
        <div className="relative">
          <input
            type="text"
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
            placeholder="Buscar por nombre de empresa, ID de tenant, correo o modulo..."
            className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-hidden focus:border-slate-800 transition-all font-medium"
          />
          {filtroTexto && (
            <button
              onClick={() => setFiltroTexto("")}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* TABLA PRINCIPAL DE TENANTS */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xs text-slate-700">
            <span>Directorio de Clientes</span>
            <span className="px-3 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 font-bold text-xs">
              {tenantsFiltrados.length} negocios listados
            </span>
          </div>
          <button
            onClick={cargarTodo}
            disabled={loadingData}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            {loadingData ? "Actualizando..." : "Refrescar datos"}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Tenant ID</th>
                <th className="py-3 px-4">Empresa / Negocio</th>
                <th className="py-3 px-4">Modulo Base</th>
                <th className="py-3 px-4">Plan Licencia</th>
                <th className="py-3 px-4">Usuarios (Uso / Tope)</th>
                <th className="py-3 px-4">Estado & Dias Restantes</th>
                <th className="py-3 px-4">Vencimiento</th>
                <th className="py-3 px-4 text-right">Acciones Operativas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {tenantsFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No se encontraron clientes con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                tenantsFiltrados.map((t) => {
                  const dias = calcularDiasRestantes(t.fechaVencimientoPago);
                  const badgeDias = getBadgeDias(dias, t.activa);
                  const cantUsuarios = t.cantidadUsuarios || 0;
                  const limite = t.limiteUsuarios;
                  const cupoLleno = limite != null && limite > 0 && cantUsuarios >= limite;

                  return (
                    <tr key={t.tenantId} className="hover:bg-slate-50/70 transition-colors">
                      {/* ID */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        #{t.tenantId}
                      </td>

                      {/* Empresa */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{t.nombreEmpresa}</div>
                        <div className="text-[10px] text-slate-400">{t.emailContacto || "Sin correo"}</div>
                      </td>

                      {/* Modulo */}
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-mono font-bold text-[10px] uppercase">
                          {t.moduloPrincipal}
                        </span>
                      </td>

                      {/* Plan */}
                      <td className="py-3 px-4">
                        <select
                          value={t.tipoLicencia}
                          onChange={(e) => handleCambiarPlan(t.tenantId, e.target.value as TipoLicencia)}
                          className="px-2 py-1 rounded-lg border border-slate-200 text-[10px] font-bold bg-white text-slate-800 cursor-pointer"
                        >
                          <option value="BASICA">BASICA</option>
                          <option value="COMERCIAL">COMERCIAL</option>
                          <option value="INDUSTRIAL">INDUSTRIAL</option>
                        </select>
                      </td>

                      {/* Usuarios y Limite */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => abrirModalUsuariosDirectorio(t)}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                            cupoLleno
                              ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                              : limite != null && limite > 0
                              ? "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"
                              : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                          }`}
                          title="Haga clic para ver directorio de usuarios y configurar limite"
                        >
                          <span className="font-mono font-black">{cantUsuarios}</span>
                          <span className="text-slate-400">/</span>
                          <span className="font-mono">{limite ? limite : "Ilim."}</span>
                          <span className="text-[9px] uppercase font-semibold">
                            {cupoLleno ? "[Lleno]" : limite ? "[Tope]" : "[Libre]"}
                          </span>
                        </button>
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${badgeDias.color}`}
                        >
                          {badgeDias.texto}
                        </span>
                      </td>

                      {/* Vencimiento */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                        {t.fechaVencimientoPago || "Indefinido"}
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Registrar Pago */}
                          <button
                            onClick={() => abrirModalPago(t)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-xs cursor-pointer"
                            title="Registrar pago y extender licencia"
                          >
                            Cobro
                          </button>

                          {/* Regalar Dias */}
                          <button
                            onClick={() => abrirModalRegalo(t)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[10px] cursor-pointer"
                            title="Regalar dias de cortesia"
                          >
                            Cortesia
                          </button>

                          {/* Modulos */}
                          <button
                            onClick={() => abrirModalModulos(t)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-[10px] cursor-pointer"
                            title="Gestionar modulos de industria"
                          >
                            Modulos
                          </button>

                          {/* Usuarios */}
                          <button
                            onClick={() => abrirModalUsuariosDirectorio(t)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-[10px] cursor-pointer"
                            title="Ver usuarios y definir limites de cuentas"
                          >
                            Usuarios
                          </button>

                          {/* Impersonar Soporte */}
                          <button
                            onClick={() => handleImpersonar(t.tenantId)}
                            className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 font-bold text-[10px] cursor-pointer transition-colors shadow-2xs"
                            title="Acceso de soporte tecnico directo"
                          >
                            Soporte
                          </button>

                          {/* Activar / Suspender */}
                          {t.activa ? (
                            <button
                              onClick={() => handleDesactivar(t.tenantId)}
                              className="p-1 text-slate-400 hover:text-rose-600 font-bold text-xs cursor-pointer"
                              title="Suspender acceso"
                            >
                              [Off]
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivar(t.tenantId)}
                              className="p-1 text-slate-400 hover:text-emerald-600 font-bold text-xs cursor-pointer"
                              title="Reactivar acceso"
                            >
                              [On]
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      
        </div>
      )}

      
      {/* VISTA: MODULO DEDICADO DE HISTORIAL DE COBROS Y PAGOS */}
      {vistaPrincipal === "PAGOS" && (
        <div className="space-y-6 animate-fadeIn">
          {/* BARRA SUPERIOR DE PAGOS */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-['Outfit'] font-black text-lg text-slate-900">
                  Historial de Pagos & Cobros de Clientes
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider border border-emerald-200">
                  Modulo de Facturacion
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Auditoria de suscripciones cobradas, comprobantes de pago y extensiones de licencia.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => cargarPagos(filtroPagosTenant === "TODOS" ? undefined : filtroPagosTenant)}
                disabled={loadingPagos}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {loadingPagos ? "Cargando..." : "Refrescar"}
              </button>

              <button
                onClick={abrirModalPagoDesdeModulo}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-xs shadow-teal-600/20 transition-all cursor-pointer"
              >
                + Registrar Nuevo Cobro
              </button>
            </div>
          </div>

          {/* KPIS DE PAGOS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Total Cobrado Historico</span>
              <div className="font-['Outfit'] text-3xl font-black text-slate-900">
                ${totalCobradoHistorico.toFixed(2)}
                <span className="text-xs font-normal text-slate-400"> USD</span>
              </div>
              <span className="text-[10px] text-slate-500">{historialPagos.length} cobros procesados</span>
            </div>

            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">Cobros del Mes Actual</span>
              <div className="font-['Outfit'] text-3xl font-black text-slate-900">
                ${totalCobradoMes.toFixed(2)}
                <span className="text-xs font-normal text-slate-400"> USD</span>
              </div>
              <span className="text-[10px] text-slate-500">{pagosMesActual.length} suscripciones renovadas</span>
            </div>

            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Ticket Promedio</span>
              <div className="font-['Outfit'] text-3xl font-black text-slate-900">
                ${ticketPromedio.toFixed(2)}
                <span className="text-xs font-normal text-slate-400"> USD</span>
              </div>
              <span className="text-[10px] text-slate-500">Promedio por cobro de cliente</span>
            </div>

            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tiempo Acreditado</span>
              <div className="font-['Outfit'] text-3xl font-black text-slate-900 font-mono">
                +{totalDiasAcreditados}
                <span className="text-xs font-normal text-slate-400 font-sans"> dias</span>
              </div>
              <span className="text-[10px] text-slate-500">Dias de operacion entregados</span>
            </div>
          </div>

          {/* FILTROS AVANZADOS Y TABLA DE PAGOS */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3 flex-wrap text-xs">
                {/* Filtro por Tenant */}
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-500 text-[10px] uppercase">Cliente:</span>
                  <select
                    value={filtroPagosTenant}
                    onChange={(e) => setFiltroPagosTenant(e.target.value === "TODOS" ? "TODOS" : Number(e.target.value))}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 font-medium text-slate-800 bg-slate-50 cursor-pointer focus:outline-hidden focus:border-teal-500"
                  >
                    <option value="TODOS">Todos los Clientes ({tenants.length})</option>
                    {tenants.map((t) => (
                      <option key={t.tenantId} value={t.tenantId}>
                        #{t.tenantId} - {t.nombreEmpresa}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro por Metodo */}
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-500 text-[10px] uppercase">Metodo:</span>
                  <select
                    value={filtroPagosMetodo}
                    onChange={(e) => setFiltroPagosMetodo(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 font-medium text-slate-800 bg-slate-50 cursor-pointer focus:outline-hidden focus:border-teal-500"
                  >
                    <option value="TODOS">Todos los Metodos</option>
                    <option value="BINANCE_USDT">Binance USDT</option>
                    <option value="PAGO_MOVIL">Pago Movil (Bs.)</option>
                    <option value="TRANSFERENCIA_VES">Transferencia Bs.</option>
                    <option value="ZELLE">Zelle (USD)</option>
                    <option value="EFECTIVO_USD">Efectivo USD</option>
                    <option value="TARJETA_CREDITO">Tarjeta de Credito</option>
                    <option value="CORTESIA">Cortesia</option>
                  </select>
                </div>

                {/* Buscador */}
                <input
                  type="text"
                  placeholder="Buscar por cliente, referencia, comprobante..."
                  value={filtroPagosTexto}
                  onChange={(e) => setFiltroPagosTexto(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-hidden focus:border-teal-500 w-64"
                />

                {(filtroPagosTenant !== "TODOS" || filtroPagosMetodo !== "TODOS" || filtroPagosTexto) && (
                  <button
                    onClick={() => {
                      setFiltroPagosTenant("TODOS");
                      setFiltroPagosMetodo("TODOS");
                      setFiltroPagosTexto("");
                    }}
                    className="text-xs text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>

              <span className="px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 font-bold text-xs">
                {pagosFiltrados.length} cobros listados
              </span>
            </div>

            {/* TABLA PRINCIPAL DE HISTORIAL DE PAGOS */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 px-3">Fecha & Hora</th>
                    <th className="pb-3 px-3">Cliente / Negocio</th>
                    <th className="pb-3 px-3">Monto Cobrado</th>
                    <th className="pb-3 px-3">Metodo de Pago</th>
                    <th className="pb-3 px-3">Comprobante / Ref</th>
                    <th className="pb-3 px-3">Tiempo Acreditado</th>
                    <th className="pb-3 px-3">Estado</th>
                    <th className="pb-3 px-3">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingPagos ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Cargando historial de pagos...
                      </td>
                    </tr>
                  ) : pagosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No se encontraron cobros registrados con los criterios seleccionados.
                      </td>
                    </tr>
                  ) : (
                    pagosFiltrados.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                          {p.fechaPago ? p.fechaPago.replace("T", " ").substring(0, 16) : "-"}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold">
                              #{p.tenantId}
                            </span>
                            <span className="font-bold text-slate-900">{p.nombreEmpresa}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono font-black text-emerald-700 text-sm">
                            ${Number(p.monto).toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold ml-1">{p.moneda}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono text-[10px] font-bold border border-slate-200">
                            {p.metodoPago}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                          {p.referenciaComprobante ? (
                            <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-800">
                              {p.referenciaComprobante}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 font-bold text-[10px]">
                            +{p.mesesPagados} mes ({p.diasAcreditados} dias)
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[10px]">
                            {p.estado || "CONFIRMADO"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 text-[11px] max-w-xs truncate" title={p.notas || ""}>
                          {p.notas || "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VISTA: FINANZAS Y CONTABILIDAD SAAS */}
      {vistaPrincipal === "FINANZAS" && (
        <div className="space-y-6 animate-fadeIn">
          {/* BARRA SUPERIOR DE FINANZAS */}
          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Periodo Contable</span>
                <div className="flex items-center gap-2">
                  <input
                    type="month"
                    value={mesFinanzas}
                    onChange={(e) => setMesFinanzas(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 cursor-pointer focus:outline-hidden focus:border-teal-500"
                  />
                  <button
                    onClick={() => cargarDatosFinancieros(mesFinanzas)}
                    disabled={cargandoFinanzas}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                  >
                    {cargandoFinanzas ? "Cargando..." : "Refrescar"}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  setMovimientoForm({
                    tipo: "EGRESO",
                    categoria: "INFRAESTRUCTURA",
                    concepto: "",
                    montoUsd: 0,
                    fechaMovimiento: new Date().toISOString().substring(0, 10),
                    metodoPago: "TRANSFERENCIA_BANCARIA",
                    referenciaComprobante: "",
                    notas: "",
                  });
                  setShowMovimientoModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-all cursor-pointer"
              >
                + Registrar Egreso / Gasto
              </button>

              <button
                onClick={() => {
                  setMovimientoForm({
                    tipo: "INGRESO",
                    categoria: "SERVICIO_EXTRA",
                    concepto: "",
                    montoUsd: 0,
                    fechaMovimiento: new Date().toISOString().substring(0, 10),
                    metodoPago: "TRANSFERENCIA_BANCARIA",
                    referenciaComprobante: "",
                    notas: "",
                  });
                  setShowMovimientoModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs transition-all cursor-pointer"
              >
                + Registrar Ingreso Extra
              </button>

              <button
                onClick={() => {
                  setGastoFijoEnEdicion(null);
                  setGastoFijoForm({
                    concepto: "",
                    categoria: "INFRAESTRUCTURA",
                    montoUsd: 0,
                    periodicidad: "MENSUAL",
                    diaPago: 1,
                    metodoPago: "TARJETA_CREDITO",
                    proveedor: "",
                    notas: "",
                  });
                  setShowGastoFijoModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-xs shadow-teal-600/20 transition-all cursor-pointer"
              >
                + Nuevo Gasto Fijo
              </button>
            </div>
          </div>

          {/* KPIS FINANCIEROS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: INGRESOS */}
            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Ingresos Totales (Mes)</span>
              <div className="font-['Outfit'] text-3xl font-black text-slate-900">
                ${resumenFinanzas?.totalIngresos.toFixed(2) ?? "0.00"}
              </div>
              <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                <span>Suscripciones: ${resumenFinanzas?.ingresosSuscripciones.toFixed(2) ?? "0.00"}</span>
                <span>Extras: ${resumenFinanzas?.ingresosExtras.toFixed(2) ?? "0.00"}</span>
              </div>
            </div>

            {/* KPI 2: EGRESOS */}
            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Egresos Totales (Mes)</span>
              <div className="font-['Outfit'] text-3xl font-black text-slate-900">
                ${resumenFinanzas?.totalEgresos.toFixed(2) ?? "0.00"}
              </div>
              <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                <span>Gastos operativos del mes</span>
                <span>{movimientos.filter(m => m.tipo === 'EGRESO').length} pagos</span>
              </div>
            </div>

            {/* KPI 3: GASTOS FIJOS */}
            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Gastos Fijos Comprometidos</span>
              <div className="font-['Outfit'] text-3xl font-black text-slate-900">
                ${resumenFinanzas?.gastosFijosMensuales.toFixed(2) ?? "0.00"}
                <span className="text-xs font-normal text-slate-400">/mes</span>
              </div>
              <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                <span>Overhead mensual activo</span>
                <span>{resumenFinanzas?.totalGastosFijosActivos ?? 0} servicios</span>
              </div>
            </div>

            {/* KPI 4: UTILIDAD NETA */}
            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Utilidad Neta (Mes)</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                  (resumenFinanzas?.utilidadNeta ?? 0) >= 0
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}>
                  {(resumenFinanzas?.utilidadNeta ?? 0) >= 0 ? "Rentable" : "En Deficit"}
                </span>
              </div>
              <div className={`font-['Outfit'] text-3xl font-black ${
                (resumenFinanzas?.utilidadNeta ?? 0) >= 0 ? "text-emerald-700" : "text-rose-700"
              }`}>
                {(resumenFinanzas?.utilidadNeta ?? 0) >= 0 ? "+" : ""}${resumenFinanzas?.utilidadNeta.toFixed(2) ?? "0.00"}
              </div>
              <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                <span>Margen: {resumenFinanzas?.margenPorcentaje.toFixed(1) ?? "0.0"}%</span>
                <span>Balance Acum.: ${resumenFinanzas?.balanceHistorico.toFixed(2) ?? "0.00"}</span>
              </div>
            </div>
          </div>

          {/* SUB-TABS FINANZAS */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSubTabFinanzas("MOVIMIENTOS")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    subTabFinanzas === "MOVIMIENTOS"
                      ? "bg-teal-600 text-white shadow-xs shadow-teal-600/20"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Libro de Movimientos ({movimientos.length})
                </button>

                <button
                  onClick={() => setSubTabFinanzas("GASTOS_FIJOS")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    subTabFinanzas === "GASTOS_FIJOS"
                      ? "bg-teal-600 text-white shadow-xs shadow-teal-600/20"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Gastos Fijos Programados ({gastosFijos.length})
                </button>
              </div>

              {subTabFinanzas === "MOVIMIENTOS" && (
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    {(["TODOS", "INGRESO", "EGRESO"] as const).map((tipo) => (
                      <button
                        key={tipo}
                        onClick={() => setFiltroTipoMovimiento(tipo)}
                        className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          filtroTipoMovimiento === tipo
                            ? "bg-white text-slate-900 shadow-2xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {tipo === "TODOS" ? "Todos" : tipo === "INGRESO" ? "Ingresos" : "Egresos"}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    placeholder="Buscar por concepto o referencia..."
                    value={filtroTextoMovimiento}
                    onChange={(e) => setFiltroTextoMovimiento(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-hidden focus:border-teal-500 w-56"
                  />
                </div>
              )}
            </div>

            {/* CONTENIDO TAB 1: MOVIMIENTOS */}
            {subTabFinanzas === "MOVIMIENTOS" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 px-3">Fecha</th>
                      <th className="pb-3 px-3">Tipo</th>
                      <th className="pb-3 px-3">Concepto & Notas</th>
                      <th className="pb-3 px-3">Categoria</th>
                      <th className="pb-3 px-3">Metodo & Ref</th>
                      <th className="pb-3 px-3 text-right">Monto USD</th>
                      <th className="pb-3 px-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {movimientosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          No hay movimientos registrados para este periodo contable.
                        </td>
                      </tr>
                    ) : (
                      movimientosFiltrados.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                            {m.fechaMovimiento}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                              m.tipo === "INGRESO"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}>
                              {m.tipo === "INGRESO" ? "[+] INGRESO" : "[-] EGRESO"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-800">{m.concepto}</div>
                            {m.notas && <div className="text-[10px] text-slate-400">{m.notas}</div>}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold">
                              {m.categoria}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="text-slate-700 text-[11px]">{m.metodoPago}</div>
                            {m.referenciaComprobante && (
                              <div className="font-mono text-[10px] text-slate-400">{m.referenciaComprobante}</div>
                            )}
                          </td>
                          <td className={`py-2.5 px-3 text-right font-mono font-bold text-xs ${
                            m.tipo === "INGRESO" ? "text-emerald-600" : "text-rose-600"
                          }`}>
                            {m.tipo === "INGRESO" ? "+" : "-"}${m.montoUsd.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleEliminarMovimiento(m.id)}
                              className="text-slate-400 hover:text-rose-600 font-bold text-xs cursor-pointer p-1 rounded-lg hover:bg-rose-50"
                              title="Anular movimiento"
                            >
                              [Eliminar]
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* CONTENIDO TAB 2: GASTOS FIJOS */}
            {subTabFinanzas === "GASTOS_FIJOS" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 px-3">Concepto & Proveedor</th>
                      <th className="pb-3 px-3">Categoria</th>
                      <th className="pb-3 px-3">Monto USD / Frecuencia</th>
                      <th className="pb-3 px-3">Corte / Pago</th>
                      <th className="pb-3 px-3">Metodo</th>
                      <th className="pb-3 px-3">Estado</th>
                      <th className="pb-3 px-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {gastosFijos.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          No se han configurado gastos fijos recurrentes aun.
                        </td>
                      </tr>
                    ) : (
                      gastosFijos.map((g) => (
                        <tr key={g.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-800">{g.concepto}</div>
                            <div className="text-[10px] text-slate-400">{g.proveedor || "Sin proveedor asignado"}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold">
                              {g.categoria}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-mono font-bold text-slate-900">${g.montoUsd.toFixed(2)}</div>
                            <div className="text-[10px] text-slate-400">{g.periodicidad}</div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                            Dia {g.diaPago} del mes
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                            {g.metodoPago}
                          </td>
                          <td className="py-2.5 px-3">
                            <button
                              onClick={() => handleToggleGastoFijo(g.id)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                                g.activo
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                  : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                              }`}
                            >
                              {g.activo ? "Activo" : "Pausado"}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {g.activo && (
                                <button
                                  onClick={() => {
                                    setGastoParaEjecutar(g);
                                    setReferenciaEjecucion("");
                                    setShowEjecutarGastoModal(true);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold transition-colors cursor-pointer"
                                  title="Registrar un egreso de este gasto para el mes actual"
                                >
                                  Pagar este Mes
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setGastoFijoEnEdicion(g);
                                  setGastoFijoForm({
                                    concepto: g.concepto,
                                    categoria: g.categoria,
                                    montoUsd: g.montoUsd,
                                    periodicidad: g.periodicidad,
                                    diaPago: g.diaPago,
                                    metodoPago: g.metodoPago,
                                    proveedor: g.proveedor || "",
                                    notas: g.notas || "",
                                  });
                                  setShowGastoFijoModal(true);
                                }}
                                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[10px] font-bold transition-colors cursor-pointer"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleEliminarGastoFijo(g.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 font-bold text-xs cursor-pointer"
                                title="Eliminar gasto fijo"
                              >
                                [X]
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
{/* MODAL: DIRECTÓRIO DE USUARIOS Y LÍMITE DE CUOTA */}
      {showUsuariosDirectorioModal && tenantParaUsuariosDirectorio && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl p-7 bg-white rounded-3xl border border-slate-200 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-['Outfit'] font-black text-lg text-slate-900">
                  Gestion de Usuarios y Limite de Capacidad
                </h3>
                <p className="text-xs text-slate-500">
                  Negocio: <strong className="text-slate-800">{tenantParaUsuariosDirectorio.nombreEmpresa}</strong> (#{tenantParaUsuariosDirectorio.tenantId})
                </p>
              </div>
              <button
                onClick={() => setShowUsuariosDirectorioModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 font-bold text-sm"
              >
                [Cerrar]
              </button>
            </div>

            {/* SECCION A: CONFIGURAR LIMITE DE USUARIOS */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Limite de Usuarios Permitidos
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Capacidad maxima de cuentas activas simultaneas para este negocio.
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Estado Actual:</span>
                  <div className="font-mono font-black text-xs text-slate-900">
                    {tenantParaUsuariosDirectorio.cantidadUsuarios || 0} en uso /{" "}
                    {tenantParaUsuariosDirectorio.limiteUsuarios
                      ? `${tenantParaUsuariosDirectorio.limiteUsuarios} max.`
                      : "Ilimitado"}
                  </div>
                </div>
              </div>

              <form onSubmit={handleGuardarLimite} className="flex flex-wrap items-center gap-2 pt-1">
                <div className="flex items-center gap-1">
                  {[1, 3, 5, 10, 25, 50].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setLimiteUsuariosInput(String(num))}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold font-mono transition-all cursor-pointer ${
                        limiteUsuariosInput === String(num)
                          ? "bg-teal-600 text-white border-teal-600 font-bold shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setLimiteUsuariosInput("")}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                      limiteUsuariosInput === ""
                        ? "bg-teal-600 text-white border-teal-600 font-bold shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Ilimitado
                  </button>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <input
                    type="number"
                    min="1"
                    placeholder="Otro valor"
                    value={limiteUsuariosInput}
                    onChange={(e) => setLimiteUsuariosInput(e.target.value)}
                    className="w-24 px-3 py-1.5 rounded-xl border border-slate-300 font-mono text-xs bg-white text-slate-900 font-bold"
                  />
                  <button
                    type="submit"
                    disabled={guardandoLimite}
                    className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {guardandoLimite ? "Guardando..." : "Guardar Limite"}
                  </button>
                </div>
              </form>
            </div>

            {/* SECCION B: LISTA DE USUARIOS ACTIVOS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                  <span>Directorio de Cuentas ({usuariosTenant.length})</span>
                  {tenantParaUsuariosDirectorio.limiteUsuarios &&
                    usuariosTenant.length >= tenantParaUsuariosDirectorio.limiteUsuarios && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black uppercase">
                        Limite de cuentas alcanzado
                      </span>
                    )}
                </div>

                <button
                  type="button"
                  onClick={() => abrirModalUsuario(tenantParaUsuariosDirectorio)}
                  className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs cursor-pointer shadow-xs"
                >
                  + Agregar Usuario
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-2xl">
                {loadingUsuariosTenant ? (
                  <div className="py-8 text-center text-slate-400 text-xs">Cargando directorio...</div>
                ) : usuariosTenant.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No hay usuarios registrados para este tenant.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                      <tr>
                        <th className="py-2.5 px-3">Usuario / Email</th>
                        <th className="py-2.5 px-3">Nombre</th>
                        <th className="py-2.5 px-3">Rol</th>
                        <th className="py-2.5 px-3">Estado</th>
                        <th className="py-2.5 px-3 text-right">Accion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {usuariosTenant.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{u.username}</td>
                          <td className="py-2.5 px-3 text-slate-600">{u.nombreCompleto || "-"}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                              {u.rol}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                u.activo
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {u.activo ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleToggleUsuarioActivo(u.id)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                                u.activo
                                  ? "bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700"
                                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              }`}
                            >
                              {u.activo ? "Desactivar" : "Reactivar"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowUsuariosDirectorioModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs cursor-pointer"
              >
                Cerrar Directorio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR PAGO */}
      {showPagoModal && tenantParaPago && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg p-7 bg-white rounded-3xl border border-slate-200 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-['Outfit'] font-black text-lg text-slate-900">
                  Registrar Cobro de Suscripcion
                </h3>
                <p className="text-xs text-slate-500">
                  Cliente: <strong className="text-slate-800">{tenantParaPago.nombreEmpresa}</strong> (#{tenantParaPago.tenantId})
                </p>
              </div>
              <button onClick={() => setShowPagoModal(false)} className="p-2 text-slate-400 hover:text-slate-700 font-bold text-sm">[Cerrar]</button>
            </div>

            <form onSubmit={handleRegistrarPago} className="space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="font-bold text-slate-600 uppercase text-[10px]">Paquete de Renovacion</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { m: 1, p: 35, label: "1 Mes" },
                    { m: 3, p: 95, label: "3 Meses" },
                    { m: 6, p: 180, label: "6 Meses" },
                    { m: 12, p: 340, label: "1 Año" },
                  ].map((pkg) => (
                    <button
                      key={pkg.m}
                      type="button"
                      onClick={() => setPagoForm({ ...pagoForm, meses: pkg.m, dias: 0, monto: pkg.p })}
                      className={`p-2.5 rounded-xl border font-bold text-center transition-all cursor-pointer ${
                        pagoForm.meses === pkg.m && pagoForm.dias === 0
                          ? "bg-teal-600 text-white border-teal-600 font-bold shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <div className="font-['Outfit'] text-sm">{pkg.label}</div>
                      <div className="text-[10px] opacity-75 font-mono">${pkg.p}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase text-[10px]">Monto Cobrado (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={pagoForm.monto}
                    onChange={(e) => setPagoForm({ ...pagoForm, monto: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase text-[10px]">Metodo de Pago</label>
                  <select
                    value={pagoForm.metodoPago}
                    onChange={(e) => setPagoForm({ ...pagoForm, metodoPago: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white"
                  >
                    <option value="PAGO_MOVIL">Pago Movil (Bolivares BCV)</option>
                    <option value="TRANSFERENCIA_VES">Transferencia Bancaria VES</option>
                    <option value="BINANCE_USDT">Binance Pay (USDT)</option>
                    <option value="ZELLE">Zelle (USD)</option>
                    <option value="EFECTIVO_USD">Efectivo USD</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 uppercase text-[10px]">Referencia de Transaccion / Comprobante</label>
                <input
                  type="text"
                  placeholder="Ej. Ref #849201 o Hash de Binance"
                  value={pagoForm.referenciaComprobante || ""}
                  onChange={(e) => setPagoForm({ ...pagoForm, referenciaComprobante: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPagoModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={registrandoPago}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer disabled:opacity-50 shadow-md"
                >
                  {registrandoPago ? "Acreditando..." : "Confirmar Pago & Activar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGALAR TIEMPO */}
      {showRegaloModal && tenantParaRegalo && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md p-7 bg-white rounded-3xl border border-slate-200 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-['Outfit'] font-black text-lg text-slate-900">
                  Regalar Tiempo de Cortesia
                </h3>
                <p className="text-xs text-slate-500">
                  Para: <strong className="text-slate-800">{tenantParaRegalo.nombreEmpresa}</strong> (#{tenantParaRegalo.tenantId})
                </p>
              </div>
              <button onClick={() => setShowRegaloModal(false)} className="p-2 text-slate-400 hover:text-slate-700 font-bold text-sm">[Cerrar]</button>
            </div>

            <form onSubmit={handleRegalarTiempo} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-600 uppercase text-[10px]">Dias de Licencia a Obsequiar</label>
                <div className="flex items-center gap-2">
                  {[7, 15, 30, 60].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setRegaloForm({ ...regaloForm, dias: d })}
                      className={`flex-1 py-2 rounded-xl border font-bold transition-all cursor-pointer ${
                        regaloForm.dias === d
                          ? "bg-teal-600 text-white border-teal-600 font-bold shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      +{d} dias
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 uppercase text-[10px]">Motivo / Nota Interna</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Prueba piloto, cortesia por soporte tecnico..."
                  value={regaloForm.motivo}
                  onChange={(e) => setRegaloForm({ ...regaloForm, motivo: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegaloModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={regalandoTiempo}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer disabled:opacity-50 shadow-md"
                >
                  {regalandoTiempo ? "Acreditando..." : "Otorgar Cortesia"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MODULOS DE INDUSTRIA CONTRATADOS */}
      {showModulosModal && tenantParaModulos && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg p-7 bg-white rounded-3xl border border-slate-200 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-['Outfit'] font-black text-lg text-slate-900">
                  Modulos de Industria Contratados
                </h3>
                <p className="text-xs text-slate-500">
                  Negocio: <strong className="text-slate-800">{tenantParaModulos.nombreEmpresa}</strong> (#{tenantParaModulos.tenantId})
                </p>
              </div>
              <button onClick={() => setShowModulosModal(false)} className="p-2 text-slate-400 hover:text-slate-700 font-bold text-sm">[Cerrar]</button>
            </div>

            {/* Banner Desbloquear Toda la Suite */}
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 shadow-xs">
              <div className="space-y-0.5">
                <div className="font-black text-emerald-950 text-xs flex items-center gap-1.5">
                  <span>Acceso Total en 1 Clic</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-black uppercase">Suite Completa</span>
                </div>
                <div className="text-[10px] text-emerald-700 leading-tight">
                  Eleva la licencia a Industrial y activa todos los modulos verticales automaticamente.
                </div>
              </div>
              <button
                type="button"
                onClick={handleConcederAccesoTotal}
                disabled={concediendoAccesoTotal}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs whitespace-nowrap disabled:opacity-50 transition-all hover:scale-102"
              >
                {concediendoAccesoTotal ? "Activando..." : "Desbloquear Todo"}
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {loadingModulos ? (
                <div className="py-8 text-center text-slate-400 text-xs">Cargando modulos...</div>
              ) : (
                MODULOS_SISTEMA.map((m) => {
                  const modEncontrado = modulosTenant.find((t) => t.moduloNombre === m.id);
                  const activo = modEncontrado ? modEncontrado.activo : tenantParaModulos.moduloPrincipal === m.id;

                  return (
                    <div
                      key={m.id}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3 hover:bg-white transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-black px-2 py-1 bg-slate-200 rounded-lg text-slate-700">{m.tag}</span>
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{m.label}</div>
                          <div className="text-[10px] text-slate-500">{m.desc}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleModulo(m.id, activo)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          activo
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                        }`}
                      >
                        {activo ? "Habilitado" : "Inactivo"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowModulosModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs cursor-pointer"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ALTA RAPIDA DE NEGOCIO (NUEVO TENANT) */}
      {showNuevoModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg p-7 bg-white rounded-3xl border border-slate-200 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-['Outfit'] font-black text-lg text-slate-900">
                  Alta de Nuevo Cliente / Negocio
                </h3>
                <p className="text-xs text-slate-500">
                  Asigna un nuevo TenantID e inicializa su primer usuario administrador.
                </p>
              </div>
              <button onClick={() => setShowNuevoModal(false)} className="p-2 text-slate-400 hover:text-slate-700 font-bold text-sm">[Cerrar]</button>
            </div>

            <form onSubmit={handleCrearTenant} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-600 uppercase text-[10px]">Nombre Comercial de la Empresa *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Clinica Dental Sonrisa Feliz"
                  value={nuevoForm.nombreEmpresa}
                  onChange={(e) => setNuevoForm({ ...nuevoForm, nombreEmpresa: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                />
              </div>

              {/* Opcion Acceso Total */}
              <div className={`p-3.5 rounded-2xl border transition-all ${
                nuevoForm.accesoTotal
                  ? "bg-blue-50 border-blue-300 shadow-xs"
                  : "bg-slate-50 border-slate-200"
              }`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-black text-xs text-slate-900">
                      <span>Acceso Total (Toda la Suite Aurora)</span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-600 text-[9px] text-white font-black uppercase tracking-wider">SuperAdmin</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Habilita simultaneamente Salud, Ganaderia, Restaurante, Comercio, Mineria, Moda y Tamanaco bajo un solo Tenant con Plan Industrial.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={!!nuevoForm.accesoTotal}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setNuevoForm({
                          ...nuevoForm,
                          accesoTotal: checked,
                          tipoLicencia: checked ? "INDUSTRIAL" : nuevoForm.tipoLicencia,
                        });
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase text-[10px]">Modulo Vertical Inicial</label>
                  <select
                    value={nuevoForm.moduloPrincipal}
                    onChange={(e) => setNuevoForm({ ...nuevoForm, moduloPrincipal: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white"
                  >
                    <option value="salud">Salud & Clinicas</option>
                    <option value="ganaderia">Ganaderia & Agro</option>
                    <option value="horeca">Gastronomia / HORECA</option>
                    <option value="repuestos">Comercio & Retail</option>
                    <option value="minero">Mineria & Balanzas</option>
                    <option value="moda">Moda & Calzado</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase text-[10px]">Plan de Licencia</label>
                  <select
                    value={nuevoForm.tipoLicencia}
                    onChange={(e) => setNuevoForm({ ...nuevoForm, tipoLicencia: e.target.value as TipoLicencia })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white"
                  >
                    <option value="BASICA">BASICA</option>
                    <option value="COMERCIAL">COMERCIAL</option>
                    <option value="INDUSTRIAL">INDUSTRIAL</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase text-[10px]">Email de Contacto</label>
                  <input
                    type="email"
                    placeholder="contacto@empresa.com"
                    value={nuevoForm.emailContacto}
                    onChange={(e) => setNuevoForm({ ...nuevoForm, emailContacto: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase text-[10px]">Meses Iniciales</label>
                  <input
                    type="number"
                    min="1"
                    value={nuevoForm.mesesVigencia}
                    onChange={(e) => setNuevoForm({ ...nuevoForm, mesesVigencia: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase text-[10px]">Limite Usuarios</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Vacio = Ilimitado"
                    value={nuevoForm.limiteUsuarios || ""}
                    onChange={(e) => setNuevoForm({ ...nuevoForm, limiteUsuarios: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800 text-[11px]">Primer Usuario Administrador</div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Usuario (ej. admin)"
                    value={nuevoForm.usuarioInicial}
                    onChange={(e) => setNuevoForm({ ...nuevoForm, usuarioInicial: e.target.value })}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white font-medium"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Clave inicial"
                    value={nuevoForm.passwordInicial}
                    onChange={(e) => setNuevoForm({ ...nuevoForm, passwordInicial: e.target.value })}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNuevoModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creandoTenant}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer disabled:opacity-50 shadow-md shadow-blue-600/20"
                >
                  {creandoTenant ? "Creando..." : "Dar de Alta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREAR USUARIO PARA TENANT */}
      {showUsuarioModal && tenantParaUsuario && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md p-7 bg-white rounded-3xl border border-slate-200 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-['Outfit'] font-black text-lg text-slate-900">
                  Crear Usuario de Acceso
                </h3>
                <p className="text-xs text-slate-500">
                  Para: <strong className="text-slate-800">{tenantParaUsuario.nombreEmpresa}</strong> (#{tenantParaUsuario.tenantId})
                </p>
              </div>
              <button onClick={() => setShowUsuarioModal(false)} className="p-2 text-slate-400 hover:text-slate-700 font-bold text-sm">[Cerrar]</button>
            </div>

            <form onSubmit={handleCrearUsuario} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-600 uppercase text-[10px]">Username / Email *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. doctor@clinica.com"
                  value={usuarioForm.username}
                  onChange={(e) => setUsuarioForm({ ...usuarioForm, username: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 uppercase text-[10px]">Nombre Completo</label>
                <input
                  type="text"
                  placeholder="Ej. Dr. Carlos Mendoza"
                  value={usuarioForm.nombreCompleto}
                  onChange={(e) => setUsuarioForm({ ...usuarioForm, nombreCompleto: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase text-[10px]">Contraseña *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={usuarioForm.password}
                    onChange={(e) => setUsuarioForm({ ...usuarioForm, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase text-[10px]">Rol Asignado</label>
                  <select
                    value={usuarioForm.rol}
                    onChange={(e) => setUsuarioForm({ ...usuarioForm, rol: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white"
                  >
                    <option value="DUENO_ADMIN">DUENO_ADMIN</option>
                    <option value="MEDICO">MEDICO (Salud)</option>
                    <option value="CAJERO_VENDEDOR">CAJERO_VENDEDOR</option>
                    <option value="ENCARGADO_INVENTARIO">ENCARGADO_INVENTARIO</option>
                    <option value="MESERO">MESERO (Horeca)</option>
                    <option value="ADMINISTRADOR_FINCA">ADMINISTRADOR_FINCA (Ganaderia)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUsuarioModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creandoUsuario}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold cursor-pointer disabled:opacity-50 shadow-md shadow-teal-600/20"
                >
                  {creandoUsuario ? "Guardando..." : "Crear Usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: HISTORIAL DE PAGOS */}
      {showHistorialPagosModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-3xl p-7 bg-white rounded-3xl border border-slate-200 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-['Outfit'] font-black text-lg text-slate-900">
                  Registro Historico de Pagos de Suscripcion
                </h3>
                <p className="text-xs text-slate-500">
                  Trazabilidad de pagos, transferencias y dias acreditados a cada tenant.
                </p>
              </div>
              <button onClick={() => setShowHistorialPagosModal(false)} className="p-2 text-slate-400 hover:text-slate-700 font-bold text-sm">[Cerrar]</button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loadingPagos ? (
                <div className="py-8 text-center text-slate-400 text-xs">Cargando pagos...</div>
              ) : historialPagos.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No hay pagos registrados aun.</div>
              ) : (
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Fecha</th>
                      <th className="py-2.5 px-3">Tenant</th>
                      <th className="py-2.5 px-3">Monto</th>
                      <th className="py-2.5 px-3">Metodo</th>
                      <th className="py-2.5 px-3">Referencia</th>
                      <th className="py-2.5 px-3">Meses / Dias</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {historialPagos.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                          {p.fechaPago ? p.fechaPago.slice(0, 10) : "-"}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {p.nombreEmpresa} <span className="text-slate-400 font-normal">#{p.tenantId}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-600">
                          ${p.monto.toFixed(2)} {p.moneda}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-600">
                          {p.metodoPago}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                          {p.referenciaComprobante || "-"}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] font-bold text-slate-800">
                          +{p.mesesPagados} meses ({p.diasAcreditados} dias)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowHistorialPagosModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR / EDITAR GASTO FIJO */}
      {showGastoFijoModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg p-7 bg-white rounded-3xl border border-slate-200 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-['Outfit'] font-black text-lg text-slate-900">
                  {gastoFijoEnEdicion ? "Editar Gasto Fijo" : "Nuevo Gasto Fijo Programado"}
                </h3>
                <p className="text-xs text-slate-500">
                  Defina obligaciones recurrentes de operacion (servidores, modelos de IA, equipo, etc.)
                </p>
              </div>
              <button
                onClick={() => setShowGastoFijoModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                [X]
              </button>
            </div>

            <form onSubmit={handleGuardarGastoFijo} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                  Concepto del Gasto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Servidores AWS EC2, Licencias OpenAI, Alquiler de Oficina"
                  value={gastoFijoForm.concepto}
                  onChange={(e) => setGastoFijoForm({ ...gastoFijoForm, concepto: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-800 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                    Proveedor / Empresa
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Amazon AWS, Anthropic, Hetzner"
                    value={gastoFijoForm.proveedor || ""}
                    onChange={(e) => setGastoFijoForm({ ...gastoFijoForm, proveedor: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-800 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                    Categoria
                  </label>
                  <select
                    value={gastoFijoForm.categoria}
                    onChange={(e) => setGastoFijoForm({ ...gastoFijoForm, categoria: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 bg-white cursor-pointer"
                  >
                    <option value="INFRAESTRUCTURA">INFRAESTRUCTURA (Hosting, Cloud)</option>
                    <option value="SERVICIOS_IA">SERVICIOS IA (APIs, Modelos)</option>
                    <option value="DOMINIO_RED">DOMINIO & RED (Cloudflare, DNS)</option>
                    <option value="NOMINA_EQUIPO">NOMINA / EQUIPO (Soporte, Devs)</option>
                    <option value="MARKETING">MARKETING (Pauta, Publicidad)</option>
                    <option value="SOFTWARE_HERRAMIENTAS">SOFTWARE & HERRAMIENTAS</option>
                    <option value="OTRO">OTRO</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                    Monto USD *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    placeholder="0.00"
                    value={gastoFijoForm.montoUsd || ""}
                    onChange={(e) => setGastoFijoForm({ ...gastoFijoForm, montoUsd: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-slate-800 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                    Periodicidad
                  </label>
                  <select
                    value={gastoFijoForm.periodicidad}
                    onChange={(e) => setGastoFijoForm({ ...gastoFijoForm, periodicidad: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 bg-white cursor-pointer"
                  >
                    <option value="MENSUAL">MENSUAL</option>
                    <option value="ANUAL">ANUAL</option>
                    <option value="TRIMESTRAL">TRIMESTRAL</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                    Dia de Corte
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={gastoFijoForm.diaPago || 1}
                    onChange={(e) => setGastoFijoForm({ ...gastoFijoForm, diaPago: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-slate-800 bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                  Metodo de Pago Sugerido
                </label>
                <select
                  value={gastoFijoForm.metodoPago}
                  onChange={(e) => setGastoFijoForm({ ...gastoFijoForm, metodoPago: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-800 bg-white cursor-pointer"
                >
                  <option value="TARJETA_CREDITO">Tarjeta de Credito Corporativa</option>
                  <option value="TRANSFERENCIA_BANCARIA">Transferencia Bancaria</option>
                  <option value="BINANCE_USDT">Binance USDT / Crypto</option>
                  <option value="PAYPAL">PayPal</option>
                  <option value="OTRO">Otro Metodo</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                  Notas Adicionales
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre facturacion o cuenta..."
                  value={gastoFijoForm.notas || ""}
                  onChange={(e) => setGastoFijoForm({ ...gastoFijoForm, notas: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-medium text-slate-800 bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowGastoFijoModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-xs shadow-teal-600/20 cursor-pointer"
                >
                  {gastoFijoEnEdicion ? "Guardar Cambios" : "Programar Gasto Fijo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR MOVIMIENTO FINANCIERO (INGRESO O EGRESO) */}
      {showMovimientoModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg p-7 bg-white rounded-3xl border border-slate-200 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-['Outfit'] font-black text-lg text-slate-900">
                  {movimientoForm.tipo === "INGRESO" ? "Registrar Ingreso Extra" : "Registrar Egreso / Gasto Operativo"}
                </h3>
                <p className="text-xs text-slate-500">
                  Asiente un movimiento real en el libro contable de Aurora Plus
                </p>
              </div>
              <button
                onClick={() => setShowMovimientoModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                [X]
              </button>
            </div>

            <form onSubmit={handleGuardarMovimiento} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                    Tipo de Movimiento
                  </label>
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setMovimientoForm({ ...movimientoForm, tipo: "EGRESO" })}
                      className={`flex-1 py-1.5 rounded-lg font-bold text-center cursor-pointer transition-all ${
                        movimientoForm.tipo === "EGRESO"
                          ? "bg-rose-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Egreso (Gasto)
                    </button>
                    <button
                      type="button"
                      onClick={() => setMovimientoForm({ ...movimientoForm, tipo: "INGRESO" })}
                      className={`flex-1 py-1.5 rounded-lg font-bold text-center cursor-pointer transition-all ${
                        movimientoForm.tipo === "INGRESO"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Ingreso (Entrada)
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                    Fecha de Operacion
                  </label>
                  <input
                    type="date"
                    required
                    value={movimientoForm.fechaMovimiento}
                    onChange={(e) => setMovimientoForm({ ...movimientoForm, fechaMovimiento: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                  Concepto / Descripcion *
                </label>
                <input
                  type="text"
                  required
                  placeholder={movimientoForm.tipo === "INGRESO" ? "Ej. Consultoria personalizada, onboarding especial" : "Ej. Pauta Facebook Ads, Pago de hosting"}
                  value={movimientoForm.concepto}
                  onChange={(e) => setMovimientoForm({ ...movimientoForm, concepto: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-800 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                    Monto en USD *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={movimientoForm.montoUsd || ""}
                    onChange={(e) => setMovimientoForm({ ...movimientoForm, montoUsd: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-slate-800 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                    Categoria
                  </label>
                  <select
                    value={movimientoForm.categoria}
                    onChange={(e) => setMovimientoForm({ ...movimientoForm, categoria: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 bg-white cursor-pointer"
                  >
                    {movimientoForm.tipo === "INGRESO" ? (
                      <>
                        <option value="SERVICIO_EXTRA">SERVICIO EXTRA</option>
                        <option value="SUSCRIPCION">SUSCRIPCION ESPECIAL</option>
                        <option value="CONSULTORIA">CONSULTORIA / ONBOARDING</option>
                        <option value="OTRO">OTRO INGRESO</option>
                      </>
                    ) : (
                      <>
                        <option value="INFRAESTRUCTURA">INFRAESTRUCTURA (Cloud/Servidores)</option>
                        <option value="SERVICIOS_IA">SERVICIOS IA (APIs)</option>
                        <option value="NOMINA">NOMINA / EQUIPO</option>
                        <option value="MARKETING">MARKETING / PUBLICIDAD</option>
                        <option value="GASTO_FIJO">GASTO FIJO PROGRAMADO</option>
                        <option value="OTRO">OTRO GASTO</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                    Metodo de Pago
                  </label>
                  <select
                    value={movimientoForm.metodoPago}
                    onChange={(e) => setMovimientoForm({ ...movimientoForm, metodoPago: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-800 bg-white cursor-pointer"
                  >
                    <option value="TRANSFERENCIA_BANCARIA">Transferencia Bancaria</option>
                    <option value="PAGO_MOVIL">Pago Movil (Bs.)</option>
                    <option value="ZELLE">Zelle (USD)</option>
                    <option value="BINANCE_USDT">Binance USDT</option>
                    <option value="TARJETA_CREDITO">Tarjeta de Credito</option>
                    <option value="EFECTIVO_USD">Efectivo USD</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                    Referencia / Comprobante
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. #098124, Factura 45"
                    value={movimientoForm.referenciaComprobante || ""}
                    onChange={(e) => setMovimientoForm({ ...movimientoForm, referenciaComprobante: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-slate-800 bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                  Notas
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre este movimiento..."
                  value={movimientoForm.notas || ""}
                  onChange={(e) => setMovimientoForm({ ...movimientoForm, notas: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-medium text-slate-800 bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowMovimientoModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-white font-bold text-xs shadow-xs cursor-pointer ${
                    movimientoForm.tipo === "INGRESO"
                      ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20"
                      : "bg-rose-600 hover:bg-rose-500 shadow-rose-600/20"
                  }`}
                >
                  Asentar Movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EJECUTAR GASTO FIJO COMO EGRESO */}
      {showEjecutarGastoModal && gastoParaEjecutar && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md p-7 bg-white rounded-3xl border border-slate-200 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-['Outfit'] font-black text-lg text-slate-900">
                  Asentar Pago de Gasto Fijo
                </h3>
                <p className="text-xs text-slate-500">
                  Registrar egreso para este periodo contable
                </p>
              </div>
              <button
                onClick={() => setShowEjecutarGastoModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                [X]
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Concepto:</span>
                <span className="font-bold text-slate-900">{gastoParaEjecutar.concepto}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Proveedor:</span>
                <span className="text-slate-700">{gastoParaEjecutar.proveedor || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Monto a Asentar:</span>
                <span className="font-mono font-black text-rose-600 text-sm">
                  ${gastoParaEjecutar.montoUsd.toFixed(2)} USD
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Metodo:</span>
                <span className="text-slate-700">{gastoParaEjecutar.metodoPago}</span>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                Numero de Referencia o Comprobante (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej. Factura #INV-2026-09"
                value={referenciaEjecucion}
                onChange={(e) => setReferenciaEjecucion(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-slate-800 bg-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                onClick={() => setShowEjecutarGastoModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarEjecutarGastoFijo}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer shadow-xs shadow-rose-600/20"
              >
                Confirmar Egreso
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
