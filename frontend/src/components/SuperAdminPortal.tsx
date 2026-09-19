import { obtenerCuentasCobro, guardarCuentasCobro, type SaasCuentasCobroConfig } from "../cuentasCobroConfig";
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
  listarAuditoriaGlobalSuperAdmin,
  RegistroAuditoriaItem,
  estaImpersonando,
  salirDeImpersonacion,
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
  SaasAnalyticsResponse,
  TopTenantRanking,
  VerticalAnalytics,
  PlanAnalytics,
  MetodoPagoAnalytics,
  TendenciaDataPoint,
  obtenerAnalyticsSuperAdmin,
  SaasSoporteTicket,
  SaasSoporteMensaje,
  listarTicketsSuperAdmin,
  listarMensajesTicketSuperAdmin,
  enviarMensajeTicketSuperAdmin,
  cambiarEstadoTicketSuperAdmin,
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
  // ESTADOS DE AUDITORIA DE SEGURIDAD GLOBAL
  const [auditoriaLogs, setAuditoriaLogs] = useState<RegistroAuditoriaItem[]>([]);
  const [totalAuditoria, setTotalAuditoria] = useState(0);
  const [cargandoAuditoria, setCargandoAuditoria] = useState(false);
  const [filtroAuditoriaTenant, setFiltroAuditoriaTenant] = useState("TODOS");
  const [filtroAuditoriaModulo, setFiltroAuditoriaModulo] = useState("TODOS");
  const [filtroAuditoriaAccion, setFiltroAuditoriaAccion] = useState("TODAS");
  const [filtroAuditoriaTexto, setFiltroAuditoriaTexto] = useState("");
  const [paginaAuditoria, setPaginaAuditoria] = useState(0);

  // CONTROL DE SEGURIDAD ESTRICTA (PIN / AUTORIZACION MAESTRA)
  const [showMasterLockModal, setShowMasterLockModal] = useState(false);
  const [masterLockPassword, setMasterLockPassword] = useState("");
  const [masterLockError, setMasterLockError] = useState("");
  const [masterLockCallback, setMasterLockCallback] = useState<(() => void) | null>(null);

  // MODAL DE RECIBO OFICIAL DE COBRO SAAS
  const [reciboCobroSeleccionado, setReciboCobroSeleccionado] = useState<PagoSuscripcion | null>(null);
  const [showReciboModal, setShowReciboModal] = useState(false);
  const [copiadoWhatsapp, setCopiadoWhatsapp] = useState(false);


  // Modales
  const [showNuevoModal, setShowNuevoModal] = useState(false);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [showConfigCuentasModal, setShowConfigCuentasModal] = useState(false);
  const [cuentasConfigForm, setCuentasConfigForm] = useState<SaasCuentasCobroConfig>(obtenerCuentasCobro);
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
  const [vistaPrincipal, setVistaPrincipal] = useState<"TENANTS" | "PAGOS" | "METRICAS" | "FINANZAS" | "SOPORTE" | "AUDITORIA">("TENANTS");

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

  // ESTADOS DEL MODULO DE METRICAS & ANALITICA SAAS
  const [periodoAnalytics, setPeriodoAnalytics] = useState<"DIA" | "SEMANA" | "MES" | "HISTORICO">("MES");
  const [fechaRefAnalytics, setFechaRefAnalytics] = useState<string>(() => new Date().toISOString().substring(0, 10));
  const [analyticsData, setAnalyticsData] = useState<SaasAnalyticsResponse | null>(null);
  const [cargandoAnalytics, setCargandoAnalytics] = useState(false);
  const [filtroRankingBusqueda, setFiltroRankingBusqueda] = useState("");

  // ESTADOS DEL MODULO DE SOPORTE & ASISTENCIA AL TENANT
  const [ticketsSoporte, setTicketsSoporte] = useState<SaasSoporteTicket[]>([]);
  const [ticketSeleccionado, setTicketSeleccionado] = useState<SaasSoporteTicket | null>(null);
  const [mensajesSoporte, setMensajesSoporte] = useState<SaasSoporteMensaje[]>([]);
  const [nuevoMensajeSoporte, setNuevoMensajeSoporte] = useState("");
  const [filtroEstadoSoporte, setFiltroEstadoSoporte] = useState<string>("TODOS");
  const [filtroPrioridadSoporte, setFiltroPrioridadSoporte] = useState<string>("TODOS");
  const [filtroTextoBusquedaSoporte, setFiltroTextoBusquedaSoporte] = useState("");
  const [cargandoTicketsSoporte, setCargandoTicketsSoporte] = useState(false);
  const [enviandoMensajeSoporte, setEnviandoMensajeSoporte] = useState(false);

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
      if (err?.message?.includes("Token") || err?.message?.includes("expirado") || err?.message?.includes("401")) {
        borrarSesionSuperAdmin();
        setSesion(null);
        avisar("Tu sesion de SuperAdmin ha expirado. Por favor ingresa tus credenciales de nuevo.", "error");
        return;
      }
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

  const cargarAnalytics = async (periodo?: "DIA" | "SEMANA" | "MES" | "HISTORICO", fechaRef?: string) => {
    setCargandoAnalytics(true);
    try {
      const p = periodo || periodoAnalytics;
      const f = fechaRef || fechaRefAnalytics;
      const data = await obtenerAnalyticsSuperAdmin(p, f);
      setAnalyticsData(data);
    } catch (err: any) {
      console.error("Error al cargar analitica:", err);
      avisar("Error al obtener metricas SaaS: " + (err.message || "Error de conexion"));
    } finally {
      setCargandoAnalytics(false);
    }
  };

  useEffect(() => {
    if (sesion && vistaPrincipal === "METRICAS") {
      cargarAnalytics(periodoAnalytics, fechaRefAnalytics);
    }
  }, [sesion, vistaPrincipal, periodoAnalytics, fechaRefAnalytics]);

  // SOPORTE FUNCTIONS
  const cargarTicketsSoporte = async () => {
    setCargandoTicketsSoporte(true);
    try {
      const data = await listarTicketsSuperAdmin(filtroEstadoSoporte, filtroPrioridadSoporte, filtroTextoBusquedaSoporte);
      setTicketsSoporte(data);
      if (ticketSeleccionado) {
        const updated = data.find((t) => t.id === ticketSeleccionado.id);
        if (updated) setTicketSeleccionado(updated);
      }
    } catch (e) {
      console.error("Error al cargar tickets:", e);
    } finally {
      setCargandoTicketsSoporte(false);
    }
  };

  const cargarMensajesSoporte = async (ticketId: number) => {
    try {
      const msgs = await listarMensajesTicketSuperAdmin(ticketId);
      setMensajesSoporte(msgs);
    } catch (e) {
      console.error("Error al cargar mensajes del ticket:", e);
    }
  };

  const handleEnviarMensajeSoporte = async (e?: React.FormEvent, textoDirecto?: string) => {
    if (e) e.preventDefault();
    const txt = textoDirecto || nuevoMensajeSoporte;
    if (!ticketSeleccionado || !txt.trim() || enviandoMensajeSoporte) return;

    setEnviandoMensajeSoporte(true);
    try {
      const msg = await enviarMensajeTicketSuperAdmin(ticketSeleccionado.id, txt.trim(), sesion?.username || "Soporte Aurora");
      setMensajesSoporte((prev) => [...prev, msg]);
      setNuevoMensajeSoporte("");
      cargarTicketsSoporte();
    } catch (err: any) {
      avisar("Error al enviar mensaje: " + (err.message || "Error"));
    } finally {
      setEnviandoMensajeSoporte(false);
    }
  };

  const handleCambiarEstadoTicket = async (ticketId: number, nuevoEstado: string) => {
    try {
      const updated = await cambiarEstadoTicketSuperAdmin(ticketId, nuevoEstado, sesion?.username);
      avisar("Ticket #" + ticketId + " actualizado a " + nuevoEstado);
      setTicketSeleccionado(updated);
      cargarTicketsSoporte();
    } catch (err: any) {
      avisar("Error al cambiar estado: " + (err.message || "Error"));
    }
  };

  useEffect(() => {
    if (sesion && vistaPrincipal === "SOPORTE") {
      cargarTicketsSoporte();
    }
  }, [sesion, vistaPrincipal, filtroEstadoSoporte, filtroPrioridadSoporte, filtroTextoBusquedaSoporte]);

  useEffect(() => {
    if (sesion && vistaPrincipal === "SOPORTE" && ticketSeleccionado) {
      cargarMensajesSoporte(ticketSeleccionado.id);
      const interval = setInterval(() => {
        cargarMensajesSoporte(ticketSeleccionado.id);
        cargarTicketsSoporte();
      }, 3500);
      return () => clearInterval(interval);
    }
  }, [sesion, vistaPrincipal, ticketSeleccionado?.id]);

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

  useEffect(() => {
    const onExpired = () => {
      setSesion(null);
      avisar("Tu sesion de SuperAdmin ha expirado por seguridad. Por favor ingresa tus credenciales de nuevo.", "error");
    };
    window.addEventListener("superadmin:expired", onExpired);
    return () => window.removeEventListener("superadmin:expired", onExpired);
  }, []);

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

  
  const ejecutarConAutorizacionMaestra = (callback: () => void) => {
    const desbloqueado = sessionStorage.getItem("aurora_superadmin_master_unlocked") === "true";
    if (desbloqueado) {
      callback();
    } else {
      setMasterLockCallback(() => callback);
      setMasterLockPassword("");
      setMasterLockError("");
      setShowMasterLockModal(true);
    }
  };

  const handleConfirmarMasterLock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await loginSuperAdminApi(sesion?.username || "admin", masterLockPassword);
      if (res) {
        sessionStorage.setItem("aurora_superadmin_master_unlocked", "true");
        setShowMasterLockModal(false);
        avisar("Autorizacion Maestra concedida para esta sesion");
        if (masterLockCallback) {
          masterLockCallback();
          setMasterLockCallback(null);
        }
      }
    } catch {
      setMasterLockError("Contrasena maestra incorrecta. Acceso restringido unicamente a personal autorizado.");
    }
  };

  const cargarAuditoria = async (pag = 0) => {
    setCargandoAuditoria(true);
    try {
      const res = await listarAuditoriaGlobalSuperAdmin({
        tenantId: filtroAuditoriaTenant !== "TODOS" ? Number(filtroAuditoriaTenant) : undefined,
        modulo: filtroAuditoriaModulo !== "TODOS" ? filtroAuditoriaModulo : undefined,
        accion: filtroAuditoriaAccion !== "TODAS" ? filtroAuditoriaAccion : undefined,
        pagina: pag,
        tamano: 50,
      });
      setAuditoriaLogs(res.content || []);
      setTotalAuditoria(res.totalElements || 0);
      setPaginaAuditoria(res.number || 0);
    } catch (err: any) {
      avisar(err?.message || "Error al cargar bitacora de auditoria", "error");
    } finally {
      setCargandoAuditoria(false);
    }
  };

  useEffect(() => {
    if (sesion && vistaPrincipal === "AUDITORIA") {
      cargarAuditoria(paginaAuditoria);
    }
  }, [sesion, vistaPrincipal, filtroAuditoriaTenant, filtroAuditoriaModulo, filtroAuditoriaAccion]);

  const auditoriaFiltrada = useMemo(() => {
    if (!filtroAuditoriaTexto.trim()) return auditoriaLogs;
    const txt = filtroAuditoriaTexto.toLowerCase();
    return auditoriaLogs.filter(
      (a) =>
        (a.descripcion && a.descripcion.toLowerCase().includes(txt)) ||
        (a.usuario && a.usuario.toLowerCase().includes(txt)) ||
        (a.entidad && a.entidad.toLowerCase().includes(txt))
    );
  }, [auditoriaLogs, filtroAuditoriaTexto]);

  const copiarReciboWhatsapp = (p: PagoSuscripcion) => {
    const texto = [
      "*AURORA PLUS ECOSYSTEM - COMPROBANTE OFICIAL DE COBRO*",
      `Recibo: #REC-2026-${String(p.id).padStart(4, '0')}`,
      `Fecha: ${p.fechaPago ? p.fechaPago.replace('T', ' ').substring(0, 16) : '-'}`,
      `Cliente: ${p.nombreEmpresa} (Tenant #${p.tenantId})`,
      `Monto Acreditado: $${Number(p.monto).toFixed(2)} ${p.moneda}`,
      `Metodo de Pago: ${p.metodoPago}`,
      `Referencia Bancaria: ${p.referenciaComprobante || 'N/A'}`,
      `Tiempo Renovado: ${p.mesesPagados > 0 ? `+${p.mesesPagados} mes(es)` : `+${p.diasAcreditados} dias`}`,
      "Estado: CONFIRMADO & LICENCIA ACTIVA",
      "",
      "Agradecemos su suscripcion continua. Sistema operativo en linea.",
      "https://aurora-plus.com"
    ].join("\n");

    navigator.clipboard.writeText(texto);
    setCopiadoWhatsapp(true);
    avisar("Recibo copiado al portapapeles listo para enviar por WhatsApp");
    setTimeout(() => setCopiadoWhatsapp(false), 3000);
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
      <div className={onClose ? "fixed inset-0 z-[9999] w-screen h-screen bg-slate-100 flex items-center justify-center p-4 animate-fadeIn font-sans text-slate-800" : "min-h-screen w-full bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-800"}>
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
            <div className="inline-flex p-3 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-xs">
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
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-500 text-white font-bold text-sm tracking-wide transition-all shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
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

  // MAIN DASHBOARD (Aurora Full Screen Backoffice Suite)
  return (
    <div className={onClose ? "fixed inset-0 z-[9999] w-screen h-screen bg-slate-100 flex flex-col md:flex-row overflow-hidden font-sans text-slate-800 animate-fadeIn" : "min-h-screen w-full bg-slate-100 flex flex-col md:flex-row overflow-hidden font-sans text-slate-800"}>
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

      {/* BARRA LATERAL (SIDEBAR) ENTERPRISE */}
      <aside className="w-full md:w-64 lg:w-72 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 h-auto md:h-screen z-20 shadow-xs">
        {/* PARTE SUPERIOR: BRANDING & ESTADO */}
        <div className="p-5 border-b border-slate-100 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 shadow-xs flex items-center justify-center">
              <AuroraLogo size={28} animated={false} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-['Outfit'] font-black text-base text-slate-900 tracking-tight">
                  Aurora Plus
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[9px] font-bold border border-emerald-200">
                  v2.4
                </span>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Consola SuperAdmin
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold text-slate-700">Sistema Operativo</span>
            </div>
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-100/60 text-emerald-800 font-mono font-bold text-[9px]">
              MODO DIOS
            </span>
          </div>
        </div>

        {/* NAVEGACION DE MODULOS PRINCIPALES */}
        <div className="p-4 space-y-1.5 flex-1 overflow-y-auto">
          <div className="px-2 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Modulos del Ecosistema
          </div>

          {/* ITEM 1: DIRECTORIO DE TENANTS */}
          <button
            onClick={() => setVistaPrincipal("TENANTS")}
            className={`w-full p-3 rounded-2xl text-left transition-all cursor-pointer flex items-center justify-between ${
              vistaPrincipal === "TENANTS"
                ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
                : "hover:bg-slate-50 text-slate-700 border border-transparent hover:border-slate-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${
                vistaPrincipal === "TENANTS" ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700"
              }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <div className="font-bold text-xs">Directorio de Tenants</div>
                <div className={`text-[10px] ${vistaPrincipal === "TENANTS" ? "text-white/80" : "text-slate-400"}`}>
                  Gestion de clientes y licencias
                </div>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              vistaPrincipal === "TENANTS" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
            }`}>
              {tenants.length}
            </span>
          </button>

          {/* ITEM 2: HISTORIAL DE PAGOS */}
          <button
            onClick={() => {
              setVistaPrincipal("PAGOS");
              cargarPagos(filtroPagosTenant === "TODOS" ? undefined : filtroPagosTenant);
            }}
            className={`w-full p-3 rounded-2xl text-left transition-all cursor-pointer flex items-center justify-between ${
              vistaPrincipal === "PAGOS"
                ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
                : "hover:bg-slate-50 text-slate-700 border border-transparent hover:border-slate-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${
                vistaPrincipal === "PAGOS" ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700"
              }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <div className="font-bold text-xs">Historial de Cobros</div>
                <div className={`text-[10px] ${vistaPrincipal === "PAGOS" ? "text-white/80" : "text-slate-400"}`}>
                  Pagos y prorrogas SaaS
                </div>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              vistaPrincipal === "PAGOS" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
            }`}>
              {historialPagos.length}
            </span>
          </button>

          {/* ITEM 3: METRICAS Y ANALITICA */}
          <button
            onClick={() => {
              setVistaPrincipal("METRICAS");
              cargarAnalytics();
            }}
            className={`w-full p-3 rounded-2xl text-left transition-all cursor-pointer flex items-center justify-between ${
              vistaPrincipal === "METRICAS"
                ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
                : "hover:bg-slate-50 text-slate-700 border border-transparent hover:border-slate-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${
                vistaPrincipal === "METRICAS" ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700"
              }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <div className="font-bold text-xs">Metricas & Estadisticas</div>
                <div className={`text-[10px] ${vistaPrincipal === "METRICAS" ? "text-white/80" : "text-slate-400"}`}>
                  KPIs, tendencias y ranking
                </div>
              </div>
            </div>
            {analyticsData && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                vistaPrincipal === "METRICAS" ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}>
                ${analyticsData.kpis.facturacionPeriodoUsd.toFixed(0)}
              </span>
            )}
          </button>

          {/* ITEM 4: FINANZAS Y CONTABILIDAD */}
          <button
            onClick={() => {
              setVistaPrincipal("FINANZAS");
              cargarDatosFinancieros();
            }}
            className={`w-full p-3 rounded-2xl text-left transition-all cursor-pointer flex items-center justify-between ${
              vistaPrincipal === "FINANZAS"
                ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
                : "hover:bg-slate-50 text-slate-700 border border-transparent hover:border-slate-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${
                vistaPrincipal === "FINANZAS" ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700"
              }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="font-bold text-xs">Finanzas & Contabilidad</div>
                <div className={`text-[10px] ${vistaPrincipal === "FINANZAS" ? "text-white/80" : "text-slate-400"}`}>
                  Gastos fijos, ingresos y P&L
                </div>
              </div>
            </div>
            {resumenFinanzas && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                vistaPrincipal === "FINANZAS" ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}>
                ${resumenFinanzas.totalIngresos.toFixed(0)}
              </span>
            )}
          </button>

          {/* ITEM 5: CENTRO DE SOPORTE Y CHAT EN VIVO */}
          <button
            onClick={() => {
              setVistaPrincipal("SOPORTE");
              cargarTicketsSoporte();
            }}
            className={`w-full p-3 rounded-2xl text-left transition-all cursor-pointer flex items-center justify-between ${
              vistaPrincipal === "SOPORTE"
                ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
                : "hover:bg-slate-50 text-slate-700 border border-transparent hover:border-slate-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${
                vistaPrincipal === "SOPORTE" ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700"
              }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <div className="font-bold text-xs">Soporte & Asistencia</div>
                <div className={`text-[10px] ${vistaPrincipal === "SOPORTE" ? "text-white/80" : "text-slate-400"}`}>
                  Tickets y chat en vivo
                </div>
              </div>
            </div>
            {(() => {
              const abiertosCnt = ticketsSoporte.filter((t) => t.estado === "ABIERTO" || t.estado === "EN_ATENCION").length;
              return (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  vistaPrincipal === "SOPORTE"
                    ? "bg-white/20 text-white"
                    : abiertosCnt > 0
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : "bg-slate-100 text-slate-600"
                }`}>
                  {abiertosCnt} abiertos
                </span>
              );
            })()}
          </button>

          {/* ACCIONES GLOBALES EN SIDEBAR */}
          <div className="pt-4 space-y-2">
            <div className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Acciones Globales
            </div>
            <button
              onClick={() => setShowNuevoModal(true)}
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs shadow-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>+ Nuevo Negocio SaaS</span>
            </button>

            <button
              onClick={handleBarrido}
              disabled={ejecutandoBarrido}
              className="w-full py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100/70 text-amber-800 border border-amber-300 font-bold text-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              title="Suspende automaticamente los negocios que ya expiraron su fecha de vencimiento"
            >
              <span>{ejecutandoBarrido ? "Ejecutando..." : "Barrido de Suspension"}</span>
            </button>
          </div>
        </div>

        {/* PIE DEL SIDEBAR: USUARIO Y SALIDA */}
        <div className="p-4 border-t border-slate-200 space-y-2.5 bg-slate-50/50">
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white text-xs font-black flex items-center justify-center">
              SA
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-xs text-slate-800 truncate">
                {sesion?.username || "SuperAdmin"}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                Administrador Global
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            {onClose ? (
              <button
                onClick={onClose}
                className="flex-1 py-1.5 px-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 cursor-pointer text-xs font-bold transition-all shadow-2xs text-center"
                title="Volver a la vista previa del portal"
              >
                Volver al Sitio
              </button>
            ) : (
              <button
                onClick={() => window.location.href = "/"}
                className="flex-1 py-1.5 px-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer text-xs font-bold transition-all text-center"
                title="Ir a la pagina principal"
              >
                Ir a Inicio
              </button>
            )}

            <button
              onClick={handleLogout}
              className="py-1.5 px-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-all cursor-pointer"
              title="Cerrar sesion de SuperAdmin"
            >
              Salir
            </button>
          </div>
        </div>
      </aside>

      {/* AREA DE CONTENIDO PRINCIPAL (MAIN WORKSPACE) */}
      <div className="flex-1 h-full overflow-y-auto flex flex-col bg-slate-100/70">
        {/* HEADER SUPERIOR DEL WORKSPACE */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10 shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs font-medium">Consola Maestro</span>
              <span className="text-slate-300 text-xs">/</span>
              <span className="font-bold text-slate-800 text-xs">
                {vistaPrincipal === "TENANTS"
                  ? "Directorio de Clientes & Licencias"
                  : vistaPrincipal === "PAGOS"
                  ? "Historial de Cobros & Facturas"
                  : vistaPrincipal === "METRICAS"
                  ? "Metricas & Business Intelligence"
                  : vistaPrincipal === "FINANZAS"
                  ? "Finanzas & Contabilidad SaaS"
                  : vistaPrincipal === "AUDITORIA" ? "Seguridad & Auditoria Global" : "Centro de Soporte & Chat en Vivo"}
              </span>
            </div>
            <h1 className="font-['Outfit'] font-black text-xl text-slate-900 mt-0.5">
              {vistaPrincipal === "TENANTS"
                ? "Directorio General de Tenants"
                : vistaPrincipal === "PAGOS"
                ? "Historial de Cobros y Suscripciones"
                : vistaPrincipal === "METRICAS"
                ? "Metricas, Estadisticas y Rendimiento SaaS"
                : vistaPrincipal === "FINANZAS"
                ? "Finanzas, Gastos Fijos y Flujo de Caja"
                : vistaPrincipal === "AUDITORIA" ? "Bitacora Inmutable de Seguridad y Trazabilidad Global" : "Mesa de Ayuda, Tickets y Chat con Tenants"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl text-xs text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-semibold">Atajo:</span>
              <kbd className="px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-mono font-bold text-slate-700 shadow-2xs">Ctrl+Shift+S</kbd>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
                title="Minimizar panel maestro"
              >
                Cerrar Panel
              </button>
            )}
          </div>
        </header>

        {/* CONTENIDO DEL MODULO SELECCIONADO */}
        <div className="p-6 lg:p-8 space-y-6 flex-1 max-w-7xl w-full mx-auto">
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
                  ? "bg-emerald-500 text-white shadow-xs shadow-emerald-500/20"
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
                      ? "bg-emerald-500 text-white shadow-xs shadow-emerald-500/20"
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
                    ? "bg-emerald-500 text-white shadow-xs shadow-emerald-500/20"
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
            <span className="px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs">
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
                            className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-500 text-white font-bold text-[10px] shadow-xs cursor-pointer"
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
                            onClick={() => ejecutarConAutorizacionMaestra(() => handleImpersonar(t.tenantId))}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px] cursor-pointer transition-colors shadow-2xs"
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
                type="button"
                onClick={() => {
                  setCuentasConfigForm(obtenerCuentasCobro());
                  setShowConfigCuentasModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                <span>Configurar Cuentas de Cobro (Banesco / Binance)</span>
              </button>

              <button
                onClick={abrirModalPagoDesdeModulo}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs shadow-emerald-500/20 transition-all cursor-pointer"
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
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Cobros del Mes Actual</span>
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
                    className="px-3 py-1.5 rounded-xl border border-slate-200 font-medium text-slate-800 bg-slate-50 cursor-pointer focus:outline-hidden focus:border-emerald-500"
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
                    className="px-3 py-1.5 rounded-xl border border-slate-200 font-medium text-slate-800 bg-slate-50 cursor-pointer focus:outline-hidden focus:border-emerald-500"
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
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-hidden focus:border-emerald-500 w-64"
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

              <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs">
                {pagosFiltrados.length} cobros listados
              </span>
            </div>

            {/* TABLA PRINCIPAL DE HISTORIAL DE PAGOS */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
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
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-300 text-slate-900 font-bold">
                              {p.referenciaComprobante}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-[10px]">
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
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 cursor-pointer focus:outline-hidden focus:border-emerald-500"
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
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs shadow-emerald-500/20 transition-all cursor-pointer"
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
                      ? "bg-emerald-500 text-white shadow-xs shadow-emerald-500/20"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Libro de Movimientos ({movimientos.length})
                </button>

                <button
                  onClick={() => setSubTabFinanzas("GASTOS_FIJOS")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    subTabFinanzas === "GASTOS_FIJOS"
                      ? "bg-emerald-500 text-white shadow-xs shadow-emerald-500/20"
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
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-hidden focus:border-emerald-500 w-56"
                  />
                </div>
              )}
            </div>

            {/* CONTENIDO TAB 1: MOVIMIENTOS */}
            {subTabFinanzas === "MOVIMIENTOS" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
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
                    <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
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

      {/* VISTA: METRICAS, ESTADISTICAS Y RANKING DE TENANTS */}
      {vistaPrincipal === "METRICAS" && (
        <div className="space-y-6 animate-fadeIn">
          {/* HEADER DEL MODULO DE METRICAS Y FILTROS TEMPORALES */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                  Business Intelligence SaaS
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {analyticsData ? analyticsData.periodoLabel : "Cargando metricas..."}
                </span>
              </div>
              <h2 className="font-['Outfit'] font-extrabold text-2xl text-slate-900 mt-1">
                Metricas, Estadisticas y Rendimiento SaaS
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Analisis consolidado de facturacion por periodo, ranking de clientes lideres y verticales con mayor traccion.
              </p>
            </div>

            {/* CONTROLES DE PERIODO */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Botones de periodo */}
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
                {(["DIA", "SEMANA", "MES", "HISTORICO"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setPeriodoAnalytics(p);
                      cargarAnalytics(p, fechaRefAnalytics);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      periodoAnalytics === p
                        ? "bg-emerald-500 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {p === "DIA" ? "Dia / Hoy" : p === "SEMANA" ? "Esta Semana" : p === "MES" ? "Este Mes" : "Historico Total"}
                  </button>
                ))}
              </div>

              {/* Selector de fecha de referencia */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5">
                <span className="text-[11px] font-semibold text-slate-500">Fecha Ref:</span>
                <input
                  type="date"
                  value={fechaRefAnalytics}
                  onChange={(e) => {
                    setFechaRefAnalytics(e.target.value);
                    cargarAnalytics(periodoAnalytics, e.target.value);
                  }}
                  className="text-xs font-mono font-medium text-slate-700 bg-transparent border-none outline-none cursor-pointer"
                />
              </div>

              {/* Boton refrescar */}
              <button
                onClick={() => cargarAnalytics(periodoAnalytics, fechaRefAnalytics)}
                disabled={cargandoAnalytics}
                className="px-3.5 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                title="Actualizar estadisticas"
              >
                {cargandoAnalytics ? "Calculando..." : "Refrescar"}
              </button>
            </div>
          </div>

          {/* TARJETAS DE KPIS PRINCIPALES (4 COLUMNAS) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Facturacion Periodo */}
            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Facturacion del Periodo
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {periodoAnalytics}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-['Outfit'] font-black text-2xl text-slate-900">
                  ${analyticsData ? analyticsData.kpis.facturacionPeriodoUsd.toFixed(2) : "0.00"}
                </span>
                <span className="text-xs font-bold text-emerald-600">USD</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>{analyticsData ? analyticsData.kpis.cantidadPagosPeriodo : 0} cobros confirmados</span>
                <span className="font-mono font-bold text-slate-700">
                  Prom: ${analyticsData ? analyticsData.kpis.ticketPromedioPeriodoUsd.toFixed(2) : "0.00"}
                </span>
              </div>
            </div>

            {/* KPI 2: Facturacion Historica Total */}
            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Ingreso Acumulado (LTV)
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Global
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-['Outfit'] font-black text-2xl text-slate-900">
                  ${analyticsData ? analyticsData.kpis.facturacionHistoricaUsd.toFixed(2) : "0.00"}
                </span>
                <span className="text-xs font-bold text-emerald-600">USD</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Total vida util SaaS</span>
                <span className="font-mono text-emerald-700 font-bold">100% Cobrado</span>
              </div>
            </div>

            {/* KPI 3: Tenants Activos y Retencion */}
            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Tenants Activos & Retencion
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {analyticsData ? `${analyticsData.kpis.tasaRetencionPct}%` : "100%"}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-['Outfit'] font-black text-2xl text-slate-900">
                  {analyticsData ? analyticsData.kpis.tenantsActivos : 0}
                </span>
                <span className="text-xs text-slate-500">
                  de {analyticsData ? analyticsData.kpis.totalTenants : 0} negocios
                </span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>{analyticsData ? analyticsData.kpis.tenantsSuspendidos : 0} suspendidos por mora</span>
                <span className="font-semibold text-blue-700">Tasa Retencion</span>
              </div>
            </div>

            {/* KPI 4: Nuevos Registros */}
            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Nuevos Tenants
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Altas
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-['Outfit'] font-black text-2xl text-slate-900">
                  +{analyticsData ? analyticsData.kpis.nuevosTenantsPeriodo : 0}
                </span>
                <span className="text-xs text-slate-500">en este periodo</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Crecimiento de cartera</span>
                <span className="font-semibold text-amber-700">Adquisicion</span>
              </div>
            </div>
          </div>

          {/* GRAFICO INTERACTIVO DE TENDENCIA TEMPORAL */}
          {analyticsData && analyticsData.tendencia && analyticsData.tendencia.length > 0 && (
            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-['Outfit'] font-bold text-base text-slate-900">
                    Tendencia de Facturacion Temporal
                  </h3>
                  <p className="text-xs text-slate-500">
                    Evolucion de ingresos USD y volumen de transacciones segun el periodo seleccionado ({analyticsData.periodoLabel}).
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block"></span>
                    <span className="text-slate-600 font-medium">Facturacion USD</span>
                  </div>
                </div>
              </div>

              {/* BARRAS DE GRAFICO SVG / CSS NATIVO */}
              {(() => {
                const maxVal = Math.max(...analyticsData.tendencia.map((t) => t.montoUsd), 10);
                return (
                  <div className="pt-6 pb-2">
                    <div className="grid grid-cols-6 sm:grid-cols-7 gap-2 sm:gap-4 items-end h-48 border-b border-slate-200 pb-2">
                      {analyticsData.tendencia.map((pto, idx) => {
                        const pctHeight = Math.max(Math.round((pto.montoUsd / maxVal) * 100), 6);
                        return (
                          <div key={idx} className="flex flex-col items-center h-full justify-end group relative">
                            {/* Tooltip con monto al pasar el cursor */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-slate-900 text-white text-[10px] font-mono py-1 px-2 rounded-lg whitespace-nowrap z-10 pointer-events-none shadow-md">
                              ${pto.montoUsd.toFixed(2)} USD ({pto.cantidad} cobros)
                            </div>

                            {/* Monto texto encima de la barra si > 0 */}
                            {pto.montoUsd > 0 && (
                              <span className="text-[10px] font-mono font-bold text-emerald-700 mb-1">
                                ${pto.montoUsd.toFixed(0)}
                              </span>
                            )}

                            {/* Barra vertical con animacion */}
                            <div
                              style={{ height: `${pctHeight}%` }}
                              className={`w-full max-w-[48px] rounded-t-xl transition-all duration-300 ${
                                pto.montoUsd > 0
                                  ? "bg-emerald-500 hover:bg-emerald-500 shadow-sm shadow-emerald-500/20 cursor-pointer"
                                  : "bg-slate-100 hover:bg-slate-200"
                              }`}
                            ></div>

                            {/* Etiqueta x-axis */}
                            <span className="text-[10px] font-medium text-slate-500 mt-2 truncate max-w-full text-center">
                              {pto.etiqueta}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* GRID 2 COLUMNAS: VERTICALES MAS VENDIDAS Y DISTRIBUCION DE PLANES/METODOS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* COLUMNA 1: VERTICALES E INDUSTRIAS MAS VENDIDAS */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-['Outfit'] font-bold text-base text-slate-900">
                    Verticales e Industrias Mas Vendidas
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cuota de mercado, volumen de clientes y facturacion por sector economico.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-slate-400">
                  {analyticsData ? analyticsData.verticales.length : 0} Sectores
                </span>
              </div>

              <div className="space-y-3.5">
                {analyticsData && analyticsData.verticales.length > 0 ? (
                  analyticsData.verticales.map((v, i) => (
                    <div key={v.vertical} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100/60 transition-colors space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center font-mono">
                            {i + 1}
                          </span>
                          <span className="font-bold text-slate-800 text-xs">
                            {v.nombreVertical}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-xs text-slate-900">
                            ${v.totalFacturadoUsd.toFixed(2)} USD
                          </span>
                          <span className="text-[10px] text-emerald-700 font-bold ml-1.5">
                            ({v.cuotaFacturacionPct}%)
                          </span>
                        </div>
                      </div>

                      {/* Barra de progreso de cuota */}
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(v.cuotaFacturacionPct, v.cuotaTenantsPct, 4)}%` }}
                        ></div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>{v.totalTenants} negocios ({v.cuotaTenantsPct}% de clientes)</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Periodo: ${v.facturadoPeriodoUsd.toFixed(2)} USD
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No hay datos de verticales disponibles para este periodo.
                  </div>
                )}
              </div>
            </div>

            {/* COLUMNA 2: ADOPCION DE PLANES Y CANALES DE PAGO */}
            <div className="space-y-6">
              {/* PLANES DE LICENCIA */}
              <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-['Outfit'] font-bold text-base text-slate-900">
                      Adopcion de Planes de Licencia
                    </h3>
                    <p className="text-xs text-slate-500">
                      Distribucion de suscripciones activas por nivel de servicio.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {analyticsData && analyticsData.planes.map((p) => (
                    <div
                      key={p.plan}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1"
                    >
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                        p.plan === "INDUSTRIAL"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : p.plan === "COMERCIAL"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}>
                        {p.plan}
                      </span>
                      <div className="font-['Outfit'] font-extrabold text-xl text-slate-900">
                        {p.totalTenants}
                      </div>
                      <div className="text-[10px] font-semibold text-slate-500">
                        {p.porcentaje}% cuota
                      </div>
                      <div className="text-[10px] font-mono font-bold text-slate-700 pt-1 border-t border-slate-200">
                        ${p.totalFacturadoUsd.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CANALES DE PAGO Y METODOS */}
              <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-['Outfit'] font-bold text-base text-slate-900">
                      Canales de Cobro Utilizados
                    </h3>
                    <p className="text-xs text-slate-500">
                      Volumen captado segun pasarela o metodo en el periodo.
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {analyticsData && analyticsData.metodosPago && analyticsData.metodosPago.length > 0 ? (
                    analyticsData.metodosPago.map((m) => (
                      <div key={m.metodo} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{m.metodo}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({m.cantidadPagos} pagos)
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-slate-900">
                            ${m.totalUsd.toFixed(2)} USD
                          </span>
                          <span className="text-[10px] text-emerald-700 font-bold ml-1.5">
                            ({m.porcentaje}%)
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-4 text-center text-slate-400 text-xs">
                      No hay transacciones registradas en este periodo.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* TABLA RANKING: TOP TENANTS CON MAYOR FACTURACION */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-['Outfit'] font-bold text-lg text-slate-900">
                  Ranking de Tenants por Facturacion (Top Clientes SaaS)
                </h3>
                <p className="text-xs text-slate-500">
                  Listado ordenado por volumen historico pagado en USD y recurrencia de suscripcion.
                </p>
              </div>

              {/* Filtro de busqueda rapida en ranking */}
              <div className="w-full sm:w-72">
                <input
                  type="text"
                  placeholder="Buscar tenant o vertical en ranking..."
                  value={filtroRankingBusqueda}
                  onChange={(e) => setFiltroRankingBusqueda(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            {/* TABLA DEL RANKING */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="pb-3 px-3">Posicion</th>
                    <th className="pb-3 px-3">Cliente / Tenant</th>
                    <th className="pb-3 px-3">Vertical / Industria</th>
                    <th className="pb-3 px-3">Plan</th>
                    <th className="pb-3 px-3 text-center">Meses Adquiridos</th>
                    <th className="pb-3 px-3 text-right">Facturado Periodo</th>
                    <th className="pb-3 px-3 text-right">Total Historico (LTV)</th>
                    <th className="pb-3 px-3 text-center">Total Pagos</th>
                    <th className="pb-3 px-3">Vencimiento</th>
                    <th className="pb-3 px-3 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const listaFiltrada = (analyticsData?.topTenants || []).filter((t) => {
                      if (!filtroRankingBusqueda.trim()) return true;
                      const q = filtroRankingBusqueda.toLowerCase();
                      return (
                        t.nombreEmpresa.toLowerCase().includes(q) ||
                        t.moduloPrincipal.toLowerCase().includes(q) ||
                        t.tipoLicencia.toLowerCase().includes(q)
                      );
                    });

                    if (listaFiltrada.length === 0) {
                      return (
                        <tr>
                          <td colSpan={10} className="py-8 text-center text-slate-400">
                            No se encontraron clientes que coincidan con la busqueda.
                          </td>
                        </tr>
                      );
                    }

                    return listaFiltrada.map((t) => {
                      const esLider = t.posicion === 1;
                      const esTop3 = t.posicion <= 3;
                      return (
                        <tr
                          key={t.tenantId}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            esLider ? "bg-amber-50/30" : ""
                          }`}
                        >
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center justify-center font-mono font-bold text-xs px-2.5 py-1 rounded-xl border ${
                              esLider
                                ? "bg-amber-100 text-amber-900 border-amber-300 shadow-xs"
                                : esTop3
                                ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}>
                              #{t.posicion}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-800 text-xs">
                              {t.nombreEmpresa}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Tenant ID: #{t.tenantId}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                              {t.moduloPrincipal.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              t.tipoLicencia === "INDUSTRIAL"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : t.tipoLicencia === "COMERCIAL"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}>
                              {t.tipoLicencia}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                            {t.mesesAdquiridos} meses
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-xs text-slate-700">
                            ${t.facturadoPeriodoUsd.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-extrabold text-xs text-emerald-700">
                            ${t.totalFacturadoUsd.toFixed(2)} USD
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-600">
                            {t.cantidadPagos}
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                            {t.fechaVencimientoPago || "N/A"}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              t.activa
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}>
                              {t.activa ? "ACTIVO" : "SUSPENDIDO"}
                            </span>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* VISTA: CENTRO DE SOPORTE Y CHAT EN VIVO TIPO WHATSAPP */}
      {vistaPrincipal === "SOPORTE" && (
        <div className="space-y-6 animate-fadeIn">
          {/* HEADER & CONTROLES DE LA BANDEJA */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                  Mesa de Ayuda SaaS
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {ticketsSoporte.length} Casos Registrados
                </span>
              </div>
              <h2 className="font-['Outfit'] font-extrabold text-2xl text-slate-900 mt-1">
                Centro de Atencion al Cliente y Chat en Vivo
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Canal directo de comunicacion en tiempo real tipo WhatsApp para resolver dudas tecnicas y operativas de los inquilinos.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => cargarTicketsSoporte()}
                disabled={cargandoTicketsSoporte}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                {cargandoTicketsSoporte ? "Sincronizando..." : "Refrescar Tickets"}
              </button>
            </div>
          </div>

          {/* CONTENEDOR TIPO WHATSAPP / ZENDESK DE DOBLE COLUMNA */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col lg:flex-row h-[750px] overflow-hidden">
            {/* COLUMNA IZQUIERDA: BANDEJA DE TICKETS (340px - 380px) */}
            <div className="w-full lg:w-96 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col bg-white shrink-0">
              {/* BUSCADOR Y FILTROS RAPIDOS */}
              <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50/50">
                <input
                  type="text"
                  placeholder="Buscar por cliente, asunto o texto..."
                  value={filtroTextoBusquedaSoporte}
                  onChange={(e) => setFiltroTextoBusquedaSoporte(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-2xl bg-white border border-slate-200 text-xs text-slate-800 focus:border-emerald-500 outline-none"
                />

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                  {(["TODOS", "ABIERTO", "EN_ATENCION", "RESUELTO"] as const).map((est) => (
                    <button
                      key={est}
                      onClick={() => setFiltroEstadoSoporte(est)}
                      className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                        filtroEstadoSoporte === est
                          ? "bg-emerald-500 text-white shadow-xs"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {est === "TODOS"
                        ? "Todos"
                        : est === "ABIERTO"
                        ? "Abiertos"
                        : est === "EN_ATENCION"
                        ? "En Atencion"
                        : "Resueltos"}
                    </button>
                  ))}
                </div>
              </div>

              {/* LISTA DE TICKETS SCROLLEABLE */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                {ticketsSoporte.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-2">
                    <div className="font-bold text-xs">Sin tickets de soporte</div>
                    <p className="text-[11px]">No hay casos que coincidan con los filtros actuales.</p>
                  </div>
                ) : (
                  ticketsSoporte.map((t) => {
                    const seleccionado = ticketSeleccionado?.id === t.id;
                    const esUrgente = t.prioridad === "URGENTE";
                    const esAlta = t.prioridad === "ALTA";

                    return (
                      <div
                        key={t.id}
                        onClick={() => {
                          setTicketSeleccionado(t);
                          cargarMensajesSoporte(t.id);
                        }}
                        className={`p-4 transition-all cursor-pointer space-y-1.5 ${
                          seleccionado
                            ? "bg-emerald-50/70 border-l-4 border-l-emerald-500"
                            : "hover:bg-slate-50/80"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 text-xs truncate max-w-[200px]">
                            {t.nombreEmpresa}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {t.fechaActualizacion ? t.fechaActualizacion.substring(11, 16) : ""}
                          </span>
                        </div>

                        <div className="text-xs font-semibold text-slate-700 line-clamp-1">
                          {t.tituloAsunto}
                        </div>

                        {t.ultimoMensaje && (
                          <div className="text-[11px] text-slate-500 line-clamp-1">
                            {t.ultimoMensaje}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 text-[10px]">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-md font-bold border ${
                              t.estado === "ABIERTO"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : t.estado === "EN_ATENCION"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}>
                              {t.estado}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded-md font-bold text-[9px] ${
                              esUrgente
                                ? "bg-rose-100 text-rose-800"
                                : esAlta
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-600"
                            }`}>
                              {t.prioridad}
                            </span>
                          </div>

                          <span className="font-mono text-slate-400">
                            Tenant #{t.tenantId}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* COLUMNA DERECHA: SALA DE CONVERSACION EN VIVO TIPO WHATSAPP */}
            <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
              {!ticketSeleccionado ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3 bg-slate-50/50">
                  <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs text-slate-400">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-['Outfit'] font-bold text-base text-slate-700">
                      Selecciona un caso de soporte
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      Elige un ticket de la bandeja izquierda para ver los antecedentes y responder al inquilino en tiempo real.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                  {/* HEADER DE LA SALA DE CHAT */}
                  <div className="p-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-sm flex items-center justify-center font-mono shadow-xs">
                        #{ticketSeleccionado.tenantId}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">
                            {ticketSeleccionado.nombreEmpresa}
                          </h4>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            ticketSeleccionado.estado === "RESUELTO"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : ticketSeleccionado.estado === "EN_ATENCION"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>
                            {ticketSeleccionado.estado}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>Asunto: <strong className="text-slate-700">{ticketSeleccionado.tituloAsunto}</strong></span>
                          <span>-</span>
                          <span>Usuario: {ticketSeleccionado.usuarioCreador}</span>
                        </div>
                      </div>
                    </div>

                    {/* ACCIONES DE ESTADO DEL TICKET */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCambiarEstadoTicket(ticketSeleccionado.id, "EN_ATENCION")}
                        className="px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100/70 text-emerald-800 text-xs font-bold transition-all cursor-pointer"
                        title="Marcar como caso en revision activa"
                      >
                        En Atencion
                      </button>

                      <button
                        onClick={() => handleCambiarEstadoTicket(ticketSeleccionado.id, "RESUELTO")}
                        className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all cursor-pointer"
                        title="Marcar caso como resuelto"
                      >
                        Resolver Caso
                      </button>

                      <button
                        onClick={() => ejecutarConAutorizacionMaestra(() => handleImpersonar(ticketSeleccionado.tenantId))}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                        title="Abrir sesion de soporte en pantalla para este tenant"
                      >
                        Impersonar
                      </button>
                    </div>
                  </div>

                  {/* AREA DE MENSAJES (ESTILO WHATSAPP) */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-100/60">
                    {mensajesSoporte.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                        Cargando mensajes del caso...
                      </div>
                    ) : (
                      mensajesSoporte.map((m) => {
                        const esSuperAdmin = m.emisorTipo === "SUPERADMIN";

                        return (
                          <div
                            key={m.id}
                            className={`flex flex-col ${esSuperAdmin ? "items-end" : "items-start"}`}
                          >
                            <div className="text-[10px] font-semibold text-slate-400 mb-1 px-1">
                              {esSuperAdmin ? "Tu (Soporte Aurora)" : m.emisorNombre || ticketSeleccionado.nombreEmpresa}
                            </div>
                            <div
                              className={`max-w-[75%] p-4 text-xs rounded-2xl shadow-xs ${
                                esSuperAdmin
                                  ? "bg-emerald-500 text-white rounded-tr-xs"
                                  : "bg-white text-slate-800 border border-slate-200 rounded-tl-xs"
                              }`}
                            >
                              <div className="leading-relaxed whitespace-pre-wrap">{m.contenido}</div>
                              <div
                                className={`text-[10px] mt-1.5 text-right font-mono flex items-center justify-end gap-1 ${
                                  esSuperAdmin ? "text-emerald-100" : "text-slate-400"
                                }`}
                              >
                                <span>{m.fechaEnvio ? m.fechaEnvio.substring(11, 16) : ""}</span>
                                {esSuperAdmin && (
                                  <span className="font-bold">{m.leidoPorDestinatario ? "[OK]" : "[OK]"}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* BARRA DE RESPUESTAS RAPIDAS (CANNED REPLIES) */}
                  <div className="px-4 py-2 bg-white border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      Respuestas Rapidas:
                    </span>
                    <button
                      onClick={() => handleEnviarMensajeSoporte(undefined, "Hola, un asesor tecnico esta revisando su solicitud en la plataforma Aurora Plus.")}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer"
                    >
                      Revisando caso
                    </button>
                    <button
                      onClick={() => handleEnviarMensajeSoporte(undefined, "Su licencia y modulos han sido actualizados satisfactoriamente en el ecosistema.")}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer"
                    >
                      Licencia activada
                    </button>
                    <button
                      onClick={() => handleEnviarMensajeSoporte(undefined, "Por favor adjunte el comprobante o referencia de pago para procesar la acreditacion.")}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer"
                    >
                      Solicitar comprobante
                    </button>
                    <button
                      onClick={() => handleEnviarMensajeSoporte(undefined, "El inconveniente ha quedado resuelto. Si requiere asistencia adicional, no dude en escribirnos.")}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer"
                    >
                      Caso resuelto
                    </button>
                  </div>

                  {/* BARRA DE ENTRADA DE TEXTO TIPO WHATSAPP */}
                  <form onSubmit={(e) => handleEnviarMensajeSoporte(e)} className="p-4 bg-white border-t border-slate-200 flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Escribe una respuesta para el cliente..."
                      value={nuevoMensajeSoporte}
                      onChange={(e) => setNuevoMensajeSoporte(e.target.value)}
                      disabled={enviandoMensajeSoporte}
                      className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-medium"
                    />
                    <button
                      type="submit"
                      disabled={enviandoMensajeSoporte || !nuevoMensajeSoporte.trim()}
                      className="px-6 py-3 bg-emerald-500 hover:bg-emerald-500 text-white font-bold text-xs rounded-2xl transition-all shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-40 shrink-0"
                    >
                      {enviandoMensajeSoporte ? "Enviando..." : "Enviar Respuesta"}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

        </div>
      </div>


      {/* VISTA: SEGURIDAD & AUDITORIA GLOBAL */}
      {vistaPrincipal === "AUDITORIA" && (
        <div className="space-y-6 animate-fadeIn">
          {/* HEADER AUDITORIA */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] uppercase tracking-wider border border-emerald-200">
                  Control Estricto & Trazabilidad
                </span>
                <span className="text-xs text-slate-500 font-medium">Append-Only / Solo Lectura</span>
              </div>
              <h2 className="font-['Outfit'] font-black text-2xl text-slate-900 mt-1">
                Bitacora Inmutable de Seguridad
              </h2>
              <p className="text-xs text-slate-500">
                Auditoria de acciones de alto impacto, cobros, activaciones, suspensiones e inicios de soporte tecnico en todo el ecosistema.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => cargarAuditoria(paginaAuditoria)}
                disabled={cargandoAuditoria}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
                <span>{cargandoAuditoria ? "Actualizando..." : "Refrescar Auditoria"}</span>
              </button>
              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold text-xs">
                {totalAuditoria} eventos registrados
              </span>
            </div>
          </div>

          {/* FILTROS DE AUDITORIA */}
          <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Filtro Tenant */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-500 text-[10px] uppercase">Negocio:</span>
                <select
                  value={filtroAuditoriaTenant}
                  onChange={(e) => {
                    setFiltroAuditoriaTenant(e.target.value);
                    setPaginaAuditoria(0);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 font-medium text-slate-800 bg-slate-50 cursor-pointer focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="TODOS">Todos los Negocios ({tenants.length})</option>
                  {tenants.map((t) => (
                    <option key={t.tenantId} value={String(t.tenantId)}>
                      #{t.tenantId} - {t.nombreEmpresa}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro Modulo */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-500 text-[10px] uppercase">Modulo:</span>
                <select
                  value={filtroAuditoriaModulo}
                  onChange={(e) => {
                    setFiltroAuditoriaModulo(e.target.value);
                    setPaginaAuditoria(0);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 font-medium text-slate-800 bg-slate-50 cursor-pointer focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="TODOS">Todos los Modulos</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  <option value="HORECA">HORECA</option>
                  <option value="COMERCIO">COMERCIO</option>
                  <option value="GANADERIA">GANADERIA</option>
                  <option value="SALUD">SALUD / MEDICLINIC</option>
                  <option value="TAMANACO_COMERCIAL">TAMANACO COMERCIAL</option>
                  <option value="PERSONAL">PERSONAL</option>
                </select>
              </div>

              {/* Filtro Accion */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-500 text-[10px] uppercase">Accion:</span>
                <select
                  value={filtroAuditoriaAccion}
                  onChange={(e) => {
                    setFiltroAuditoriaAccion(e.target.value);
                    setPaginaAuditoria(0);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 font-medium text-slate-800 bg-slate-50 cursor-pointer focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="TODAS">Todas las Acciones</option>
                  <option value="IMPERSONATE">IMPERSONATE (Soporte)</option>
                  <option value="COBRO_REGISTRADO">COBRO_REGISTRADO</option>
                  <option value="REGALO_TIEMPO">REGALO_TIEMPO</option>
                  <option value="ACTIVAR">ACTIVAR TENANT</option>
                  <option value="SUSPENDER">SUSPENDER TENANT</option>
                  <option value="CAMBIAR_PLAN">CAMBIAR PLAN</option>
                  <option value="CREAR">CREAR</option>
                  <option value="EDITAR">EDITAR</option>
                  <option value="ELIMINAR">ELIMINAR</option>
                </select>
              </div>

              {/* Buscador de texto */}
              <input
                type="text"
                placeholder="Buscar por usuario, entidad o descripcion..."
                value={filtroAuditoriaTexto}
                onChange={(e) => setFiltroAuditoriaTexto(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-hidden focus:border-emerald-500 w-64"
              />

              {(filtroAuditoriaTenant !== "TODOS" || filtroAuditoriaModulo !== "TODOS" || filtroAuditoriaAccion !== "TODAS" || filtroAuditoriaTexto) && (
                <button
                  type="button"
                  onClick={() => {
                    setFiltroAuditoriaTenant("TODOS");
                    setFiltroAuditoriaModulo("TODOS");
                    setFiltroAuditoriaAccion("TODAS");
                    setFiltroAuditoriaTexto("");
                    setPaginaAuditoria(0);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const p = Math.max(0, paginaAuditoria - 1);
                  cargarAuditoria(p);
                }}
                disabled={paginaAuditoria === 0 || cargandoAuditoria}
                className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 font-bold"
              >
                Anterior
              </button>
              <span className="font-mono font-bold text-slate-600">Pagina {paginaAuditoria + 1}</span>
              <button
                type="button"
                onClick={() => {
                  const p = paginaAuditoria + 1;
                  cargarAuditoria(p);
                }}
                disabled={auditoriaLogs.length < 50 || cargandoAuditoria}
                className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 font-bold"
              >
                Siguiente
              </button>
            </div>
          </div>

          {/* TABLA PRINCIPAL DE AUDITORIA */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="pb-3 px-3">Fecha & Hora</th>
                    <th className="pb-3 px-3">Tenant</th>
                    <th className="pb-3 px-3">Modulo</th>
                    <th className="pb-3 px-3">Accion</th>
                    <th className="pb-3 px-3">Entidad</th>
                    <th className="pb-3 px-3">Usuario & Rol</th>
                    <th className="pb-3 px-3">Descripcion de la Operacion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cargandoAuditoria ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Consultando bitacora de auditoria del ecosistema...
                      </td>
                    </tr>
                  ) : auditoriaFiltrada.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No se encontraron registros de auditoria con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    auditoriaFiltrada.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {item.fecha ? item.fecha.replace("T", " ").substring(0, 19) : "-"}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold border border-slate-200">
                            #{item.tenantId}
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono border ${
                            item.modulo === "SUPER_ADMIN" || item.modulo === "super-admin"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : item.modulo === "SALUD"
                              ? "bg-sky-50 text-sky-800 border-sky-200"
                              : item.modulo === "GANADERIA"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : item.modulo === "HORECA"
                              ? "bg-rose-50 text-rose-800 border-rose-200"
                              : "bg-indigo-50 text-indigo-800 border-indigo-200"
                          }`}>
                            {item.modulo}
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono border ${
                            item.accion === "IMPERSONATE"
                              ? "bg-purple-100 text-purple-900 border-purple-300"
                              : item.accion === "COBRO_REGISTRADO" || item.accion === "ACTIVAR"
                              ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                              : item.accion === "SUSPENDER" || item.accion === "ELIMINAR"
                              ? "bg-rose-100 text-rose-900 border-rose-300"
                              : "bg-slate-100 text-slate-800 border-slate-300"
                          }`}>
                            {item.accion}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                          {item.entidad} {item.entidadId ? `(#${item.entidadId})` : ""}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{item.usuario || "sistema"}</span>
                            {item.rolUsuario && (
                              <span className="text-[9px] text-slate-400 font-mono">{item.rolUsuario}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-medium text-[11px] leading-snug">
                          {item.descripcion}
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
                          ? "bg-emerald-500 text-white border-emerald-500 font-bold shadow-xs"
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
                        ? "bg-emerald-500 text-white border-emerald-500 font-bold shadow-xs"
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
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-xs"
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
                          ? "bg-emerald-500 text-white border-emerald-500 font-bold shadow-xs"
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
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-500 text-white font-bold cursor-pointer disabled:opacity-50 shadow-md"
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
                          ? "bg-emerald-500 text-white border-emerald-500 font-bold shadow-xs"
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
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-black uppercase">Suite Completa</span>
                </div>
                <div className="text-[10px] text-emerald-700 leading-tight">
                  Eleva la licencia a Industrial y activa todos los modulos verticales automaticamente.
                </div>
              </div>
              <button
                type="button"
                onClick={handleConcederAccesoTotal}
                disabled={concediendoAccesoTotal}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-xs whitespace-nowrap disabled:opacity-50 transition-all hover:scale-102"
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
                            ? "bg-emerald-500 text-white shadow-xs"
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
                    value={nuevoForm.mesesVigencia ?? ""}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") {
                        setNuevoForm({ ...nuevoForm, mesesVigencia: "" as any });
                        return;
                      }
                      const clean = raw.replace(/^0+(?=\d)/, "");
                      const num = parseInt(clean, 10);
                      setNuevoForm({ ...nuevoForm, mesesVigencia: isNaN(num) ? 1 : num });
                    }}
                    onBlur={() => {
                      if (!nuevoForm.mesesVigencia || Number(nuevoForm.mesesVigencia) < 1) {
                        setNuevoForm({ ...nuevoForm, mesesVigencia: 1 });
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase text-[10px]">Limite Usuarios</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Vacio = Ilimitado"
                    value={nuevoForm.limiteUsuarios ?? ""}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") {
                        setNuevoForm({ ...nuevoForm, limiteUsuarios: undefined });
                        return;
                      }
                      const clean = raw.replace(/^0+(?=\d)/, "");
                      const num = parseInt(clean, 10);
                      setNuevoForm({ ...nuevoForm, limiteUsuarios: isNaN(num) ? undefined : num });
                    }}
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
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-500 text-white font-bold cursor-pointer disabled:opacity-50 shadow-md shadow-emerald-500/20"
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
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs shadow-emerald-500/20 cursor-pointer"
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
                          ? "bg-emerald-500 text-white shadow-xs"
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
                      ? "bg-emerald-500 hover:bg-emerald-500 shadow-emerald-600/20"
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

      {/* MODAL CONFIGURAR CUENTAS OFICIALES DE COBRO */}
      {showConfigCuentasModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-xl w-full border border-slate-200 shadow-2xl text-left space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                </div>
                <div>
                  <h3 className="font-['Outfit'] font-black text-lg text-slate-900">
                    Cuentas Oficiales de Cobro SaaS
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Estos datos bancarios se mostraran a todos los clientes al pagar o renovar suscripciones.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigCuentasModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                guardarCuentasCobro(cuentasConfigForm);
                avisar("Cuentas de cobro actualizadas exitosamente. Los clientes ya ven los datos.");
                setShowConfigCuentasModal(false);
              }}
              className="space-y-4 text-xs"
            >
              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 text-emerald-800 text-[11px] font-medium">
                Al guardar, la informacion de Pago Movil Banesco y metodos digitales se actualizara inmediatamente en la pantalla de pago de todos los inquilinos.
              </div>

              <div className="font-bold text-slate-800 uppercase tracking-wider text-[10px] font-mono border-b border-slate-100 pb-1">
                Datos de Pago Movil (Nacional)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Banco Destino</label>
                  <input
                    type="text"
                    required
                    value={cuentasConfigForm.banco}
                    onChange={(e) => setCuentasConfigForm({ ...cuentasConfigForm, banco: e.target.value })}
                    placeholder="Ej. Banesco (0134)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Telefono Pago Movil</label>
                  <input
                    type="text"
                    required
                    value={cuentasConfigForm.telefono}
                    onChange={(e) => setCuentasConfigForm({ ...cuentasConfigForm, telefono: e.target.value })}
                    placeholder="Ej. 0414-1234567"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cedula o RIF del Titular</label>
                  <input
                    type="text"
                    required
                    value={cuentasConfigForm.cedula}
                    onChange={(e) => setCuentasConfigForm({ ...cuentasConfigForm, cedula: e.target.value })}
                    placeholder="Ej. V-28.123.456"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nombre Completo del Titular</label>
                  <input
                    type="text"
                    value={cuentasConfigForm.titular}
                    onChange={(e) => setCuentasConfigForm({ ...cuentasConfigForm, titular: e.target.value })}
                    placeholder="Ej. Administrador"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="font-bold text-slate-800 uppercase tracking-wider text-[10px] font-mono border-b border-slate-100 pt-2 pb-1">
                Metodos Digitales / Internacionales (Opcionales)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Binance Pay / USDT (TRC-20)</label>
                  <input
                    type="text"
                    value={cuentasConfigForm.binanceUsdt}
                    onChange={(e) => setCuentasConfigForm({ ...cuentasConfigForm, binanceUsdt: e.target.value })}
                    placeholder="Direccion TRC-20 o Pay ID"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Correo Zelle</label>
                  <input
                    type="text"
                    value={cuentasConfigForm.zelle}
                    onChange={(e) => setCuentasConfigForm({ ...cuentasConfigForm, zelle: e.target.value })}
                    placeholder="ejemplo@correo.com"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Instrucciones o Mensaje para el Cliente</label>
                <textarea
                  rows={2}
                  value={cuentasConfigForm.instrucciones}
                  onChange={(e) => setCuentasConfigForm({ ...cuentasConfigForm, instrucciones: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowConfigCuentasModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-xs shadow-emerald-500/20 cursor-pointer"
                >
                  Guardar Cuentas Oficiales
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    
      {/* MODAL DE SEGURIDAD ESTRICTA: AUTORIZACION MAESTRA */}
      {showMasterLockModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border-2 border-emerald-500/40 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div>
                <h3 className="font-['Outfit'] font-black text-lg text-slate-900 leading-tight">
                  Autorizacion Maestra Requerida
                </h3>
                <p className="text-xs text-slate-500">
                  Acceso restringido a administradores verificados.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
              <strong>Zona de Seguridad Protegida:</strong> Para ver la bitacora global o ejecutar acciones de alto impacto (impersonacion o suspensiones), confirme sus credenciales de SuperAdmin.
            </div>

            <form onSubmit={handleConfirmarMasterLock} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contrasena de SuperAdmin
                </label>
                <input
                  type="password"
                  placeholder="Ingrese clave de administrador..."
                  value={masterLockPassword}
                  onChange={(e) => {
                    setMasterLockPassword(e.target.value);
                    setMasterLockError("");
                  }}
                  autoFocus
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:border-emerald-500 bg-slate-50"
                />
                {masterLockError && (
                  <p className="text-xs text-rose-600 font-bold mt-1.5">{masterLockError}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowMasterLockModal(false);
                    setMasterLockCallback(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-500/20 cursor-pointer transition-all"
                >
                  Verificar y Desbloquear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECIBO OFICIAL DE COBRO SAAS */}
      {showReciboModal && reciboCobroSeleccionado && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl space-y-6 text-slate-900">
            {/* Membrete Oficial */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <AuroraLogo size={36} />
                <div>
                  <h4 className="font-['Outfit'] font-black text-base text-slate-900">
                    Aurora Plus Ecosystem
                  </h4>
                  <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                    Comprobante Oficial de Suscripcion Cloud
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-900 font-mono font-black text-xs">
                  #REC-2026-{String(reciboCobroSeleccionado.id).padStart(4, '0')}
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {reciboCobroSeleccionado.fechaPago ? reciboCobroSeleccionado.fechaPago.replace("T", " ").substring(0, 16) : "-"}
                </p>
              </div>
            </div>

            {/* Datos del Cliente */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Cliente / Razon Social:</span>
                <span className="font-bold text-slate-900">{reciboCobroSeleccionado.nombreEmpresa}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Identificador de Tenant:</span>
                <span className="font-mono font-bold text-slate-700">Tenant #{reciboCobroSeleccionado.tenantId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Concepto Facturado:</span>
                <span className="font-bold text-emerald-800">Licencia de Operacion SaaS</span>
              </div>
            </div>

            {/* Desglose Financiero */}
            <div className="border border-slate-200 rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-slate-600 font-medium">Metodo de Pago:</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono font-bold text-slate-800">
                  {reciboCobroSeleccionado.metodoPago}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-slate-600 font-medium">Comprobante / Referencia:</span>
                <span className="font-mono font-bold text-slate-800">
                  {reciboCobroSeleccionado.referenciaComprobante || "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-slate-600 font-medium">Tiempo Acreditado:</span>
                <span className="font-bold text-emerald-700">
                  {reciboCobroSeleccionado.mesesPagados > 0
                    ? `+${reciboCobroSeleccionado.mesesPagados} mes(es) (${reciboCobroSeleccionado.mesesPagados * 30} dias)`
                    : `+${reciboCobroSeleccionado.diasAcreditados} dias`}
                </span>
              </div>
              <div className="flex justify-between items-baseline pt-1">
                <span className="font-bold text-slate-800 text-sm">Total Pagado:</span>
                <div className="font-['Outfit'] text-2xl font-black text-emerald-700 font-mono">
                  ${Number(reciboCobroSeleccionado.monto).toFixed(2)}
                  <span className="text-xs text-slate-400 font-normal"> {reciboCobroSeleccionado.moneda}</span>
                </div>
              </div>
            </div>

            {/* Sello de Validez Digital */}
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-600 shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
              <span><strong>ESTADO: CONFIRMADO & LICENCIA EN LINEA.</strong> Operacion acreditada formalmente.</span>
            </div>

            {/* Acciones del Recibo */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => copiarReciboWhatsapp(reciboCobroSeleccionado)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <span>{copiadoWhatsapp ? "Copiado!" : "Copiar para WhatsApp"}</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
                <span>Imprimir PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setShowReciboModal(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

</div>
  );
}
