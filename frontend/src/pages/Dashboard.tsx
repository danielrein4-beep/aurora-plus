import { obtenerCuentasCobro, combinarCuentasCobro, type SaasCuentasCobroConfig } from "../cuentasCobroConfig";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AuroraLogo from "../AuroraLogo";
import {
  AuroraGradientDef, IconClinic, IconVet, IconTooth, IconHardware, IconCard, IconUsers, IconCustomize,
  IconStethoscope, IconCalendar, IconPrescription, IconRocket, IconDownload, IconKey,
  IconHourglass, IconUser, IconClose, IconCheckCircle, IconBank, IconChat, IconFileText,
  IconRestaurant, IconFarm, IconShield,
} from "../Icons";
import { useAuth } from "../context/AuthContext";
import {
  listarPacientes,
  listarCitasDelDia,
  listarCobrosDelDia,
  listarSalaEspera,
  listarAnimalesGanaderia,
  listarPotrerosGanaderia,
  obtenerReporteOrdenoGanaderia,
  obtenerAlertasGanaderia,
  listarRepuestos,
  listarComprasRepuesto,
  mapaDeMesas,
  obtenerTableroKds,
  resumenPeriodoAbierto,
  listarMovimientos,
  alertasVencimiento,
  listarUsuariosPropios,
  crearUsuarioPropio,
  desactivarUsuarioPropio,
  type UsuarioTenant,
  type Paciente,
  type CitaMedica,
  type AnimalGanaderia,
  type PotreroGanaderia,
  type TableroAlertasGanaderia,
  type RepuestoItem,
  type MapaMesaEntrada,
  obtenerCapacidadesPersonal,
  obtenerEstadoSuscripcion,
  obtenerCuentasCobroServidor,
  reportarPagoSuscripcion,
  tasaVigente,
  type EstadoSuscripcion,
} from "../api";
import MediclinicApp from "../components/MediclinicApp";

const VERTICAL_ICON: Record<string, (props: { size?: number }) => React.ReactNode> = {
  clinica: IconClinic,
  farmacia: IconPrescription,
  veterinaria: IconVet,
  odontologia: IconTooth,
  comercio: IconHardware,
  ferreteria: IconHardware,
  repuestos: IconHardware,
  retail: IconHardware,
  restaurante: IconRestaurant,
  finca: IconFarm,
  ganaderia: IconFarm,
};

const ACTION_ICON: Record<string, (props: { size?: number }) => React.ReactNode> = {
  "Nueva Consulta": IconStethoscope,
  "Agendar Cita": IconCalendar,
  "Emitir Receta": IconPrescription,
  "Odontograma": IconTooth,
  "Cobrar Factura": IconCard,
  "Ficha Mascota": IconVet,
  "Plan Vacunación": IconPrescription,
  "Venta PetShop": IconCard,
  "Cirugías": IconClinic,
  "Abrir Caja / POS": IconCard,
  "Consultar Kardex": IconHardware,
  "Nueva Cotización": IconFileText,
  "Cierre de Turno": IconCard,
  "Abrir Mesa / Comanda": IconRestaurant,
  "Ver Cocina (KDS)": IconHourglass,
  "Escandallo de Recetas": IconFileText,
  "Cerrar Cuenta": IconCard,
  "Nuevo Animal": IconFarm,
  "Rotar Potrero": IconRocket,
  "Registrar Ordeño": IconFileText,
  "Plan Sanitario": IconPrescription,
};

const VERTICAL_METADATA: Record<string, {
  name: string;
  badge: string;
  desc: string;
  stats: { label: string; val: string; change: string; color: string }[];
  actions: { label: string; desc: string }[];
  defaultPatients: { name: string; age: string; reason: string; status: string; time: string }[];
}> = {
  clinica: {
    name: "Mediclinic Pro",
    badge: "EDICIÓN CLÍNICA & SALUD",
    desc: "Historias clínicas digitales, agenda de especialistas, recetas y facturación.",
    stats: [
      { label: "Pacientes Registrados", val: "0", change: "Sin pacientes aún", color: "text-teal-500 dark:text-teal-400" },
      { label: "Citas de Hoy", val: "0", change: "Sin citas agendadas", color: "text-sky-500 dark:text-sky-400" },
      { label: "Ingresos del Día", val: "$0.00", change: "Multi-moneda (USD/VES)", color: "text-purple-500 dark:text-purple-400" },
      { label: "Pacientes en Espera", val: "0", change: "Sin pacientes en espera", color: "text-amber-500 dark:text-amber-400" },
    ],
    actions: [
      { label: "Nueva Consulta", desc: "Abrir historia clínica y registrar diagnóstico" },
      { label: "Agendar Cita", desc: "Asignar horario y notificar por WhatsApp" },
      { label: "Emitir Receta", desc: "Generar récipe digital con firma" },
      { label: "Cobrar Factura", desc: "Punto de venta multi-moneda" },
    ],
    defaultPatients: [],
  },
  farmacia: {
    name: "Farmacia & Droguería",
    badge: "EDICIÓN FARMACIA & DROGUERÍA",
    desc: "Dispensación de medicamentos, control de lotes y vencimientos, POS mostrador y alertas de stock.",
    stats: [
      { label: "Ventas de Hoy", val: "$0.00", change: "Sin ventas hoy", color: "text-teal-500 dark:text-teal-400" },
      { label: "Stock Farmacia", val: "0", change: "Sin medicamentos cargados", color: "text-sky-500 dark:text-sky-400" },
      { label: "Lotes por Vencer", val: "0", change: "Sin alertas activas", color: "text-amber-500 dark:text-amber-400" },
      { label: "Caja del Día", val: "$0.00", change: "Multi-moneda (USD/VES/COP)", color: "text-purple-500 dark:text-purple-400" },
    ],
    actions: [
      { label: "Cobrar Factura", desc: "Venta de medicamentos por mostrador" },
      { label: "Emitir Receta", desc: "Dispensación y verificación de récipes" },
      { label: "Consultar Kardex", desc: "Control de lotes, vencimiento y principio activo" },
      { label: "Cierre de Turno", desc: "Arqueo de caja y cuadre diario" },
    ],
    defaultPatients: [],
  },
  veterinaria: {
    name: "Mediclinic Vet",
    badge: "EDICIÓN VETERINARIA",
    desc: "Expedientes por mascota, plan de vacunas, cirugías e inventario veterinario.",
    stats: [
      { label: "Mascotas Atendidas", val: "0", change: "Sin mascotas registradas", color: "text-teal-500 dark:text-teal-400" },
      { label: "Vacunaciones", val: "0", change: "Sin vacunas hoy", color: "text-sky-500 dark:text-sky-400" },
      { label: "Venta Farmacia Vet", val: "$0.00", change: "Alimentos y fármacos", color: "text-purple-500 dark:text-purple-400" },
      { label: "Hospitalizaciones", val: "0", change: "Sin animales hospitalizados", color: "text-amber-500 dark:text-amber-400" },
    ],
    actions: [
      { label: "Ficha Mascota", desc: "Historial por paciente y tutor" },
      { label: "Plan Vacunación", desc: "Recordatorios automáticos" },
      { label: "Venta PetShop", desc: "Cobro rápido por mostrador" },
      { label: "Cirugías", desc: "Registro pre y post operatorio" },
    ],
    defaultPatients: [],
  },
  odontologia: {
    name: "Mediclinic Odonto",
    badge: "EDICIÓN ODONTOLÓGICA",
    desc: "Historia clínica, agenda, odontograma FDI interactivo y facturación para consultorios dentales.",
    stats: [
      { label: "Pacientes Atendidos", val: "0", change: "Sin pacientes registrados", color: "text-teal-500 dark:text-teal-400" },
      { label: "Citas de Hoy", val: "0", change: "Sin citas agendadas", color: "text-sky-500 dark:text-sky-400" },
      { label: "Ingresos del Día", val: "$0.00", change: "Multi-moneda (USD/VES)", color: "text-purple-500 dark:text-purple-400" },
      { label: "Tratamientos en Curso", val: "0", change: "Sin planes activos", color: "text-amber-500 dark:text-amber-400" },
    ],
    actions: [
      { label: "Nueva Consulta", desc: "Abrir historia clínica y registrar diagnóstico" },
      { label: "Agendar Cita", desc: "Asignar horario y notificar por WhatsApp" },
      { label: "Odontograma", desc: "Registrar estado dental diente por diente (FDI)" },
      { label: "Cobrar Factura", desc: "Punto de venta multi-moneda" },
    ],
    defaultPatients: [],
  },
  comercio: {
    name: "Aurora Comercio",
    badge: "EDICIÓN COMERCIO",
    desc: "POS mostrador con código de barras, kardex multi-unidad, compras a proveedores y cuentas por cobrar.",
    stats: [
      { label: "Ventas de Hoy", val: "$0.00", change: "Sin ventas hoy", color: "text-teal-500 dark:text-teal-400" },
      { label: "Artículos en Stock", val: "0", change: "Sin artículos cargados", color: "text-sky-500 dark:text-sky-400" },
      { label: "Cuentas x Cobrar", val: "$0.00", change: "Sin deudas pendientes", color: "text-purple-500 dark:text-purple-400" },
      { label: "Órdenes de Compra", val: "0", change: "Sin órdenes registradas", color: "text-amber-500 dark:text-amber-400" },
    ],
    actions: [
      { label: "Abrir Caja / POS", desc: "Venta por mostrador y códigos de barra" },
      { label: "Consultar Kardex", desc: "Stock por bodega y listas de precio" },
      { label: "Nueva Cotización", desc: "Presupuesto con validez temporal" },
      { label: "Cierre de Turno", desc: "Arqueo de caja y corte Z" },
    ],
    defaultPatients: [],
  },
  restaurante: {
    name: "Aurora Horeca",
    badge: "EDICIÓN RESTAURANTES & HORECA",
    desc: "Mapa de mesas, comandas digitales, cocina en tiempo real (KDS) y escandallo de recetas.",
    stats: [
      { label: "Mesas Ocupadas", val: "0 / 0", change: "Sin mesas configuradas", color: "text-teal-500 dark:text-teal-400" },
      { label: "Comandas Abiertas", val: "0", change: "Sin comandas activas", color: "text-sky-500 dark:text-sky-400" },
      { label: "Ventas del Día", val: "$0.00", change: "Multi-moneda (USD/VES)", color: "text-purple-500 dark:text-purple-400" },
      { label: "Platos en Cocina", val: "0", change: "Cocina al día", color: "text-amber-500 dark:text-amber-400" },
    ],
    actions: [
      { label: "Abrir Mesa / Comanda", desc: "Tomar pedido y enviar a cocina" },
      { label: "Ver Cocina (KDS)", desc: "Tablero de platos pendientes y en preparación" },
      { label: "Escandallo de Recetas", desc: "Registrar plato y costo de ingredientes" },
      { label: "Cerrar Cuenta", desc: "Cobrar comanda y emitir ticket" },
    ],
    defaultPatients: [],
  },
  // Ferretería/Repuestos/Retail son alias de "comercio" para tenants ya
  // registrados con esos valores — mismo contenido, una sola identidad visual.
  ferreteria: {
    name: "Aurora Comercio",
    badge: "EDICIÓN COMERCIO",
    desc: "POS mostrador con código de barras, kardex multi-unidad, compras a proveedores y cuentas por cobrar.",
    stats: [
      { label: "Ventas de Hoy", val: "$0.00", change: "Sin ventas hoy", color: "text-teal-500 dark:text-teal-400" },
      { label: "Artículos en Stock", val: "0", change: "Sin artículos cargados", color: "text-sky-500 dark:text-sky-400" },
      { label: "Cuentas x Cobrar", val: "$0.00", change: "Sin deudas pendientes", color: "text-purple-500 dark:text-purple-400" },
      { label: "Órdenes de Compra", val: "0", change: "Sin órdenes registradas", color: "text-amber-500 dark:text-amber-400" },
    ],
    actions: [
      { label: "Abrir Caja / POS", desc: "Venta por mostrador y códigos de barra" },
      { label: "Consultar Kardex", desc: "Stock por bodega y listas de precio" },
      { label: "Nueva Cotización", desc: "Presupuesto con validez temporal" },
      { label: "Cierre de Turno", desc: "Arqueo de caja y corte Z" },
    ],
    defaultPatients: [],
  },
  repuestos: {
    name: "Aurora Comercio",
    badge: "EDICIÓN COMERCIO",
    desc: "POS mostrador con código de barras, kardex multi-unidad, compras a proveedores y cuentas por cobrar.",
    stats: [
      { label: "Ventas de Hoy", val: "$0.00", change: "Sin ventas hoy", color: "text-teal-500 dark:text-teal-400" },
      { label: "Artículos en Stock", val: "0", change: "Sin artículos cargados", color: "text-sky-500 dark:text-sky-400" },
      { label: "Cuentas x Cobrar", val: "$0.00", change: "Sin deudas pendientes", color: "text-purple-500 dark:text-purple-400" },
      { label: "Órdenes de Compra", val: "0", change: "Sin órdenes registradas", color: "text-amber-500 dark:text-amber-400" },
    ],
    actions: [
      { label: "Abrir Caja / POS", desc: "Venta por mostrador y códigos de barra" },
      { label: "Consultar Kardex", desc: "Stock por bodega y listas de precio" },
      { label: "Nueva Cotización", desc: "Presupuesto con validez temporal" },
      { label: "Cierre de Turno", desc: "Arqueo de caja y corte Z" },
    ],
    defaultPatients: [],
  },
  retail: {
    name: "Aurora Comercio",
    badge: "EDICIÓN COMERCIO",
    desc: "POS mostrador con código de barras, kardex multi-unidad, compras a proveedores y cuentas por cobrar.",
    stats: [
      { label: "Ventas de Hoy", val: "$0.00", change: "Sin ventas hoy", color: "text-teal-500 dark:text-teal-400" },
      { label: "Artículos en Stock", val: "0", change: "Sin artículos cargados", color: "text-sky-500 dark:text-sky-400" },
      { label: "Cuentas x Cobrar", val: "$0.00", change: "Sin deudas pendientes", color: "text-purple-500 dark:text-purple-400" },
      { label: "Órdenes de Compra", val: "0", change: "Sin órdenes registradas", color: "text-amber-500 dark:text-amber-400" },
    ],
    actions: [
      { label: "Abrir Caja / POS", desc: "Venta por mostrador y códigos de barra" },
      { label: "Consultar Kardex", desc: "Stock por bodega y listas de precio" },
      { label: "Nueva Cotización", desc: "Presupuesto con validez temporal" },
      { label: "Cierre de Turno", desc: "Arqueo de caja y corte Z" },
    ],
    defaultPatients: [],
  },
  finca: {
    name: "Aurora Agro & Finca",
    badge: "EDICIÓN FINCAS & GANADERÍA",
    desc: "Rotación agronómica de potreros, control de hato, producción lechera, GDP y trazabilidad.",
    stats: [
      { label: "Cabezas en Hato", val: "0", change: "Sin animales registrados", color: "text-emerald-500 dark:text-emerald-400" },
      { label: "Litros Ordeñados", val: "0 L", change: "Sin registros hoy", color: "text-sky-500 dark:text-sky-400" },
      { label: "Potreros Activos", val: "0", change: "Sin potreros registrados", color: "text-purple-500 dark:text-purple-400" },
      { label: "Alertas Retiro", val: "0", change: "100% apto consumo", color: "text-teal-500 dark:text-teal-400" },
    ],
    actions: [
      { label: "Nuevo Animal", desc: "Alta por arete, raza y potrero" },
      { label: "Rotar Potrero", desc: "Pastoreo rotacional Voisin" },
      { label: "Registrar Ordeño", desc: "Pesaje por turno y control de sólidos" },
      { label: "Plan Sanitario", desc: "Vacunas y cálculo de retiro" },
    ],
    defaultPatients: [],
  },
  ganaderia: {
    name: "Aurora Agro & Finca",
    badge: "EDICIÓN FINCAS & GANADERÍA",
    desc: "Rotación agronómica de potreros, control de hato, producción lechera, GDP y trazabilidad.",
    stats: [
      { label: "Cabezas en Hato", val: "0", change: "Sin animales registrados", color: "text-emerald-500 dark:text-emerald-400" },
      { label: "Litros Ordeñados", val: "0 L", change: "Sin registros hoy", color: "text-sky-500 dark:text-sky-400" },
      { label: "Potreros Activos", val: "0", change: "Sin potreros registrados", color: "text-purple-500 dark:text-purple-400" },
      { label: "Alertas Retiro", val: "0", change: "100% apto consumo", color: "text-teal-500 dark:text-teal-400" },
    ],
    actions: [
      { label: "Nuevo Animal", desc: "Alta por arete, raza y potrero" },
      { label: "Rotar Potrero", desc: "Pastoreo rotacional Voisin" },
      { label: "Registrar Ordeño", desc: "Pesaje por turno y control de sólidos" },
      { label: "Plan Sanitario", desc: "Vacunas y cálculo de retiro" },
    ],
    defaultPatients: [],
  },
};

// Etiquetas legibles de Usuario.Rol (backend) — compartido entre todas las
// verticales, ver core.auth.entities.Usuario.Rol para la lista real de roles
// que el backend acepta.
const ROL_LABEL: Record<string, string> = {
  DUENO_ADMIN: "Dueño / Administrador",
  CAJERO_VENDEDOR: "Cajero / Vendedor",
  ENCARGADO_INVENTARIO: "Encargado de Inventario",
  MEDICO: "Médico",
  RECEPCIONISTA: "Recepcionista",
  MESERO: "Mesero",
  ADMINISTRADOR_FINCA: "Administrador de Finca",
  ENCARGADO_FINCA: "Encargado de Finca",
  TRABAJADOR_FINCA: "Trabajador de Finca",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, logout, trialDaysLeft, reportPayment } = useAuth();

  // Permite abrir directo en una pestaña (ej. "?tab=team" desde el acceso rapido de
  // Configuracion en Comercio) sin duplicar la logica de Equipo & Roles ahi tambien.
  const tabInicial = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"vertical" | "billing" | "team" | "settings">(
    tabInicial === "team" || tabInicial === "billing" || tabInicial === "settings" ? tabInicial : "vertical"
  );
  // Equipo & Roles — antes el botón "Invitar Colaborador" solo mostraba un alert() sin
  // crear nada; el backend (/api/auth/usuarios) ya existía completo, no estaba conectado.
  const [equipoUsuarios, setEquipoUsuarios] = useState<UsuarioTenant[]>([]);
  const [cargandoEquipo, setCargandoEquipo] = useState(false);
  const [errorEquipo, setErrorEquipo] = useState<string | null>(null);
  const [modalNuevoColaborador, setModalNuevoColaborador] = useState(false);
  const [guardandoColaborador, setGuardandoColaborador] = useState(false);

  const esDuenoAdmin = user?.rol === "DUENO_ADMIN";
  // listarUsuariosPropios devuelve TODOS los usuarios del tenant, incluido el propio
  // Dueño/Administrador — ya se muestra aparte en la tarjeta "Tú" de arriba, así que se
  // excluye de la lista de colaboradores (evita mostrarlo duplicado con un botón
  // "Desactivar" que, si el backend no lo bloqueara, dejaría al dueño sin poder
  // volver a entrar). El User de sesión no trae un id numérico — se compara por
  // username/email, que es como el backend identifica al usuario (ver AuthService).
  const colaboradores = equipoUsuarios.filter((u) => u.username?.toLowerCase() !== user?.email?.toLowerCase());

  const cargarEquipo = () => {
    if (!user?.tenantId || !esDuenoAdmin) return;
    setCargandoEquipo(true);
    setErrorEquipo(null);
    listarUsuariosPropios(user.tenantId)
      .then(setEquipoUsuarios)
      .catch((err: any) => setErrorEquipo(err?.message || "No se pudo cargar el equipo."))
      .finally(() => setCargandoEquipo(false));
  };

  useEffect(() => {
    if (activeTab === "team") cargarEquipo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user?.tenantId]);

  const desactivarColaborador = async (usuarioId: number) => {
    if (!user?.tenantId) return;
    if (!window.confirm("¿Desactivar a este colaborador? Ya no podrá iniciar sesión, pero su historial de acciones se conserva.")) return;
    try {
      await desactivarUsuarioPropio(user.tenantId, usuarioId);
      cargarEquipo();
    } catch (err: any) {
      setErrorEquipo(err?.message || "No se pudo desactivar al colaborador.");
    }
  };
  const [workspaceTab, setWorkspaceTab] = useState<"kpis" | "patients" | "agenda" | "pos">("kpis");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cuentasCobro, setCuentasCobro] = useState<SaasCuentasCobroConfig>(obtenerCuentasCobro);
  const [copiadoCampo, setCopiadoCampo] = useState<string | null>(null);

  const copiarTexto = (txt: string, campo: string) => {
    try {
      navigator.clipboard.writeText(txt);
      setCopiadoCampo(campo);
      setTimeout(() => setCopiadoCampo(null), 2500);
    } catch {}
  };

  // Tasa guardada por el propio negocio; si no tiene ninguna no se inventa: se pide pagar a la tasa BCV del día.
  const [tasaBcv, setTasaBcv] = useState<number | null>(null);
  const [suscripcion, setSuscripcion] = useState<EstadoSuscripcion | null>(null);
  const [enviandoPago, setEnviandoPago] = useState(false);
  const [errorPago, setErrorPago] = useState<string | null>(null);
  useEffect(() => {
    if (!user?.tenantId) return;
    obtenerEstadoSuscripcion().then(setSuscripcion).catch(() => setSuscripcion(null));
    // Las cuentas que configuró el equipo de Aurora en el servidor; si no hay, quedan las de siempre.
    obtenerCuentasCobroServidor().then((c) => setCuentasCobro(combinarCuentasCobro(c))).catch(() => {});
    tasaVigente(user.tenantId, "USD", "VES")
      .then((t) => setTasaBcv(t && Number(t.tasa) > 0 ? Number(t.tasa) : null))
      .catch(() => setTasaBcv(null));
  }, [user?.tenantId]);
  const [paymentForm, setPaymentForm] = useState({
    metodo: "Pago Móvil (Bolívares - Tasa BCV)",
    monto: "$25.00",
    referencia: "",
    banco: "Banesco",
  });
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState("");

  const userIndustry = user?.industry || "clinica";
  const vertical = VERTICAL_METADATA[userIndustry] || VERTICAL_METADATA["clinica"];
  const VerticalIcon = VERTICAL_ICON[userIndustry] || VERTICAL_ICON["clinica"];
  // El servidor manda: prueba = nunca ha pagado; días = hasta la fecha real de vencimiento.
  const isTrial = suscripcion ? suscripcion.enPrueba : user?.planStatus !== "active";
  const daysLeft = suscripcion ? suscripcion.diasRestantes : trialDaysLeft;

  // Estados de datos reales conectados al backend multi-tenant
  const [metricasEnVivo, setMetricasEnVivo] = useState<{ label: string; val: string; change: string; color: string }[] | null>(null);
  const [pacientesReales, setPacientesReales] = useState<Paciente[] | null>(null);
  const [citasReales, setCitasReales] = useState<CitaMedica[] | null>(null);
  const [animalesGanaderia, setAnimalesGanaderia] = useState<AnimalGanaderia[] | null>(null);
  const [alertasGanaderia, setAlertasGanaderia] = useState<TableroAlertasGanaderia | null>(null);
  const [repuestosReales, setRepuestosReales] = useState<RepuestoItem[] | null>(null);
  const [mapaReales, setMapaReales] = useState<MapaMesaEntrada[] | null>(null);
  const [accesoPersonal, setAccesoPersonal] = useState(false);

  useEffect(() => {
    let activo = true;
    obtenerCapacidadesPersonal()
      .then((capacidades) => activo && setAccesoPersonal(capacidades.accesoPersonal))
      .catch(() => activo && setAccesoPersonal(false));
    return () => { activo = false; };
  }, [user?.tenantId]);

  // Ferretería/Repuestos/Retail/Comercio son una sola identidad unificada
  // (ver ComercioApp.tsx); Farmacia comparte la misma app/ruta pero sigue
  // siendo su propio rubro visualmente.
  const esRubroComercio = userIndustry === "ferreteria" || userIndustry === "repuestos" || userIndustry === "retail" || userIndustry === "comercio";
  const esClinicaReal = (userIndustry === "clinica" || userIndustry === "veterinaria" || userIndustry === "odontologia") && !!user?.tenantId;
  const esRestauranteReal = userIndustry === "restaurante" && !!user?.tenantId;
  const esComercioReal = (esRubroComercio || userIndustry === "farmacia") && !!user?.tenantId;
  const esGanaderiaReal = (userIndustry === "finca" || userIndustry === "ganaderia") && !!user?.tenantId;
  const rutaVertical =
    userIndustry === "restaurante"
      ? "/restaurante"
      : (esRubroComercio || userIndustry === "farmacia")
        ? "/comercio"
        : (userIndustry === "finca" || userIndustry === "ganaderia")
          ? "/ganaderia"
          : userIndustry === "veterinaria"
            ? "/veterinaria"
            : "/mediclinic";
  const esVerticalReal = esClinicaReal || esRestauranteReal || esComercioReal || esGanaderiaReal;

  useEffect(() => {
    if (!user?.tenantId) return;
    const tid = Number(user.tenantId);
    const hoy = new Date().toISOString().slice(0, 10);

    if (userIndustry === "finca" || userIndustry === "ganaderia") {
      // 1. Ganadería & Fincas: datos 100% reales
      const hace30d = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      Promise.allSettled([
        listarAnimalesGanaderia(),
        listarPotrerosGanaderia(),
        obtenerReporteOrdenoGanaderia(tid, hace30d, hoy),
        obtenerAlertasGanaderia(tid, 15),
      ]).then(([resAnim, resPot, resOrd, resAle]) => {
        const animList = resAnim.status === "fulfilled" && Array.isArray(resAnim.value)
          ? resAnim.value.filter(a => !a.tenantId || a.tenantId === tid)
          : [];
        setAnimalesGanaderia(animList);

        const potList = resPot.status === "fulfilled" && Array.isArray(resPot.value)
          ? resPot.value.filter(p => !p.tenantId || p.tenantId === tid)
          : [];

        const ordenos = resOrd.status === "fulfilled" && resOrd.value?.registros
          ? resOrd.value.registros
          : [];
        const litrosHoy = ordenos
          .filter(o => o.fecha === hoy)
          .reduce((sum, o) => sum + (Number(o.cantidadLitros) || 0), 0);

        const alertas = resAle.status === "fulfilled" ? resAle.value : null;
        setAlertasGanaderia(alertas);
        const retirosCount = alertas?.retirosSanitariosVigentes?.length || 0;

        const potActivos = potList.filter(p => p.estado === "ACTIVO").length;
        const potDescanso = potList.filter(p => p.estado === "EN_DESCANSO").length;

        setMetricasEnVivo([
          {
            label: "Cabezas en Hato",
            val: String(animList.length),
            change: animList.length > 0
              ? `${animList.filter(a => a.sexo === "HEMBRA").length} hembras · ${animList.filter(a => a.sexo === "MACHO").length} machos`
              : "Sin animales registrados",
            color: "text-emerald-400",
          },
          {
            label: "Litros Ordeñados",
            val: `${litrosHoy.toFixed(1)} L`,
            change: litrosHoy > 0 ? "Ordeño registrado hoy" : "Sin ordeños hoy",
            color: "text-sky-400",
          },
          {
            label: "Potreros Activos",
            val: potList.length > 0 ? `${potActivos} / ${potList.length}` : "0",
            change: potList.length > 0 ? `${potDescanso} en descanso` : "Sin potreros registrados",
            color: "text-purple-400",
          },
          {
            label: "Alertas Retiro",
            val: String(retirosCount),
            change: retirosCount > 0 ? `${retirosCount} retiros activos` : "100% apto consumo",
            color: "text-teal-400",
          },
        ]);
      });
    } else if (esRubroComercio) {
      // 2. Comercio (Ferretería/Repuestos/Retail unificados): tesorería, stock y compras
      Promise.allSettled([
        resumenPeriodoAbierto(tid, "USD"),
        listarRepuestos(),
        listarMovimientos(tid, "CXC"),
        listarComprasRepuesto(),
      ]).then(([resTes, resRep, resCxc, resCom]) => {
        const tes = resTes.status === "fulfilled" ? resTes.value : null;
        const ventasVal = tes ? Number(tes.totalIngresos) || 0 : 0;
        const cantMovs = tes ? Number(tes.cantidadMovimientos) || 0 : 0;

        const repList = resRep.status === "fulfilled" && Array.isArray(resRep.value)
          ? resRep.value.filter(r => r.tenantId === tid)
          : [];
        setRepuestosReales(repList);
        const bajoMinimo = repList.filter(r => (r.stockActual || 0) <= 5).length;

        const cxcList = resCxc.status === "fulfilled" && Array.isArray(resCxc.value)
          ? resCxc.value.filter(m => m.estado === "PENDIENTE")
          : [];
        const cxcTotal = cxcList.reduce((sum, m) => sum + (Number(m.saldoPendiente ?? m.monto) || 0), 0);

        const compList = resCom.status === "fulfilled" && Array.isArray(resCom.value)
          ? resCom.value.filter(c => c.tenantId === tid)
          : [];

        setMetricasEnVivo([
          {
            label: "Ventas de Hoy",
            val: `$${ventasVal.toFixed(2)}`,
            change: cantMovs > 0 ? `${cantMovs} movimientos de caja` : "Sin ventas hoy",
            color: "text-teal-400",
          },
          {
            label: "Artículos en Stock",
            val: String(repList.length),
            change: repList.length > 0 ? `${bajoMinimo} bajo mínimo` : "Sin artículos cargados",
            color: "text-sky-400",
          },
          {
            label: "Cuentas x Cobrar",
            val: `$${cxcTotal.toFixed(2)}`,
            change: cxcList.length > 0 ? `${cxcList.length} créditos pendientes` : "Sin deudas pendientes",
            color: "text-purple-400",
          },
          {
            label: "Órdenes de Compra",
            val: String(compList.length),
            change: compList.length > 0 ? `${compList.length} compras registradas` : "Sin compras registradas",
            color: "text-amber-400",
          },
        ]);
      });
    } else if (userIndustry === "restaurante") {
      // 4. Restaurante & Horeca: mesas, comandas, KDS y ventas
      Promise.allSettled([
        mapaDeMesas(),
        resumenPeriodoAbierto(tid, "USD"),
        obtenerTableroKds("COCINA"),
      ]).then(([resMapa, resTes, resKds]) => {
        const mapa = resMapa.status === "fulfilled" && Array.isArray(resMapa.value) ? resMapa.value : [];
        setMapaReales(mapa);
        const mesasOcupadas = mapa.filter(m => m.estado === "OCUPADA").length;
        const comandasAbiertas = mapa.filter(m => m.comandaAbierta !== null).length;

        const tes = resTes.status === "fulfilled" ? resTes.value : null;
        const ventasVal = tes ? Number(tes.totalIngresos) || 0 : 0;

        const kdsItems = resKds.status === "fulfilled" && Array.isArray(resKds.value) ? resKds.value : [];
        const platosEnCocina = kdsItems.filter(i => i.estadoItem !== "ENTREGADO").length;

        setMetricasEnVivo([
          {
            label: "Mesas Ocupadas",
            val: mapa.length > 0 ? `${mesasOcupadas} / ${mapa.length}` : "0 / 0",
            change: mapa.length > 0 ? "Mapa en vivo" : "Sin mesas configuradas",
            color: "text-teal-400",
          },
          {
            label: "Comandas Abiertas",
            val: String(comandasAbiertas),
            change: comandasAbiertas > 0 ? "Salón + delivery" : "Sin comandas activas",
            color: "text-sky-400",
          },
          {
            label: "Ventas del Día",
            val: `$${ventasVal.toFixed(2)}`,
            change: ventasVal > 0 ? "Cobros del día" : "Sin ventas hoy",
            color: "text-purple-400",
          },
          {
            label: "Platos en Cocina",
            val: String(platosEnCocina),
            change: platosEnCocina > 0 ? "Pendientes + en preparación" : "Cocina al día",
            color: "text-amber-400",
          },
        ]);
      });
    } else if (userIndustry === "farmacia") {
      // 5. Farmacia & Droguería: ventas de mostrador, lotes por vencer y stock
      Promise.allSettled([
        resumenPeriodoAbierto(tid, "USD"),
        listarRepuestos(),
        alertasVencimiento(tid, 30),
      ]).then(([resTes, resRep, resVen]) => {
        const tes = resTes.status === "fulfilled" ? resTes.value : null;
        const ventasVal = tes ? Number(tes.totalIngresos) || 0 : 0;
        const cajaVal = tes ? Number(tes.montoEsperadoEnCaja) || 0 : 0;
        const cantMovs = tes ? Number(tes.cantidadMovimientos) || 0 : 0;

        const repList = resRep.status === "fulfilled" && Array.isArray(resRep.value)
          ? resRep.value.filter(r => r.tenantId === tid)
          : [];
        setRepuestosReales(repList);
        const bajoMinimo = repList.filter(r => (r.stockActual || 0) <= 5).length;

        const lotes = resVen.status === "fulfilled" && Array.isArray(resVen.value) ? resVen.value : [];

        setMetricasEnVivo([
          {
            label: "Ventas de Hoy",
            val: `$${ventasVal.toFixed(2)}`,
            change: cantMovs > 0 ? `${cantMovs} tickets emitidos` : "Sin ventas hoy",
            color: "text-teal-400",
          },
          {
            label: "Stock Farmacia",
            val: String(repList.length),
            change: repList.length > 0 ? `${bajoMinimo} alertas de reorden` : "Sin medicamentos cargados",
            color: "text-sky-400",
          },
          {
            label: "Lotes por Vencer",
            val: String(lotes.length),
            change: lotes.length > 0 ? "Próximos 30 días" : "Sin alertas activas",
            color: "text-amber-400",
          },
          {
            label: "Caja del Día",
            val: `$${cajaVal.toFixed(2)}`,
            change: "Multi-moneda (USD/VES/COP)",
            color: "text-purple-400",
          },
        ]);
      });
    } else if (userIndustry === "veterinaria") {
      // 6. Mediclinic Vet: pacientes, citas, cobros y sala de atención
      Promise.allSettled([
        listarPacientes(),
        listarCitasDelDia(hoy),
        listarCobrosDelDia(`${hoy}T00:00:00`, `${hoy}T23:59:59`),
        listarSalaEspera(),
      ]).then(([resPac, resCit, resCob, resSal]) => {
        const pacientes = resPac.status === "fulfilled" && Array.isArray(resPac.value) ? resPac.value : [];
        setPacientesReales(pacientes);

        const citas = resCit.status === "fulfilled" && Array.isArray(resCit.value) ? resCit.value : [];
        setCitasReales(citas);

        const cobros = resCob.status === "fulfilled" && Array.isArray(resCob.value) ? resCob.value : [];
        const ingVal = cobros.reduce((sum, c) => sum + (Number(c.montoTotal) || 0), 0);

        const sala = resSal.status === "fulfilled" && Array.isArray(resSal.value) ? resSal.value : [];
        const enEspera = sala.filter(s => s.estado === "EN_ESPERA").length;

        setMetricasEnVivo([
          {
            label: "Mascotas Atendidas",
            val: String(pacientes.length),
            change: pacientes.length > 0 ? "Expedientes registrados" : "Sin mascotas registradas",
            color: "text-teal-400",
          },
          {
            label: "Citas de Hoy",
            val: String(citas.length),
            change: citas.length > 0 ? `${citas.filter(c => c.estado === "CONFIRMADA").length} confirmadas` : "Sin citas hoy",
            color: "text-sky-400",
          },
          {
            label: "Ingresos del Día",
            val: `$${ingVal.toFixed(2)}`,
            change: "Consultas y PetShop",
            color: "text-purple-400",
          },
          {
            label: "En Espera / Hospital",
            val: String(enEspera),
            change: enEspera > 0 ? "En atención activa" : "Sin pacientes en espera",
            color: "text-amber-400",
          },
        ]);
      });
    } else {
      // 7. Clínica & Salud (default): pacientes, citas, cobros y sala de espera
      Promise.allSettled([
        listarPacientes(),
        listarCitasDelDia(hoy),
        listarCobrosDelDia(`${hoy}T00:00:00`, `${hoy}T23:59:59`),
        listarSalaEspera(),
      ]).then(([resPac, resCit, resCob, resSal]) => {
        const pacientes = resPac.status === "fulfilled" && Array.isArray(resPac.value) ? resPac.value : [];
        setPacientesReales(pacientes);

        const citas = resCit.status === "fulfilled" && Array.isArray(resCit.value) ? resCit.value : [];
        setCitasReales(citas);

        const cobros = resCob.status === "fulfilled" && Array.isArray(resCob.value) ? resCob.value : [];
        const ingVal = cobros.reduce((sum, c) => sum + (Number(c.montoTotal) || 0), 0);

        const sala = resSal.status === "fulfilled" && Array.isArray(resSal.value) ? resSal.value : [];
        const enEspera = sala.filter(s => s.estado === "EN_ESPERA").length;

        setMetricasEnVivo([
          {
            label: "Pacientes Registrados",
            val: String(pacientes.length),
            change: pacientes.length > 0 ? "Total en consultorio" : "Sin pacientes aún",
            color: "text-teal-400",
          },
          {
            label: "Citas de Hoy",
            val: String(citas.length),
            change: citas.length > 0 ? `${citas.filter(c => c.estado === "CONFIRMADA").length} confirmadas` : "Sin citas agendadas",
            color: "text-sky-400",
          },
          {
            label: "Ingresos del Día",
            val: `$${ingVal.toFixed(2)}`,
            change: "Multi-moneda (USD/VES/COP)",
            color: "text-purple-400",
          },
          {
            label: "Sala de Espera",
            val: String(enEspera),
            change: enEspera > 0 ? "Pacientes en espera" : "Sin pacientes en espera",
            color: "text-amber-400",
          },
        ]);
      });
    }
  }, [user?.tenantId, userIndustry]);

  // Antes marcaba el plan como "activado" solo en este navegador, sin avisar a nadie. Ahora el
  // reporte llega al equipo de Aurora (ticket de soporte) y queda en verificación.
  const handleReportPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.referencia.trim()) return;
    const monto = parseFloat(paymentForm.monto.replace(/[^0-9.,]/g, "").replace(",", "."));
    if (!(monto > 0)) { setErrorPago("Indica el monto que pagaste."); return; }
    const enBolivares = paymentForm.metodo.startsWith("Pago Móvil") || paymentForm.metodo.startsWith("Transferencia");
    setEnviandoPago(true);
    setErrorPago(null);
    try {
      await reportarPagoSuscripcion({
        monto,
        moneda: enBolivares && /bs/i.test(paymentForm.monto) ? "VES" : "USD",
        metodo: paymentForm.metodo,
        referencia: paymentForm.referencia.trim(),
        plan: suscripcion?.planSolicitado || undefined,
      });
      reportPayment({ monto: paymentForm.monto, metodo: paymentForm.metodo, referencia: paymentForm.referencia });
      setPaymentSuccessMsg("Recibimos tu reporte de pago. Lo verificamos y activamos tu plan; te avisamos por WhatsApp o correo.");
      setPaymentForm((f) => ({ ...f, referencia: "" }));
    } catch (err) {
      setErrorPago(err instanceof Error ? err.message : "No se pudo enviar el reporte. Intenta de nuevo.");
    } finally {
      setEnviandoPago(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-500 relative overflow-hidden flex flex-col">
      <AuroraGradientDef />

      {/* Fondos atmosféricos suaves */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="aurora-ribbon-1 -top-32 -left-20 opacity-30" />
        <div className="aurora-ribbon-2 top-1/3 -right-20 opacity-35" />
      </div>

      {/* ── HEADER SUPERIOR DEL PORTAL DE CLIENTE: ULTRA PREMIUM APPLE GLASS ── */}
      <header className="nav-glass border-b border-slate-300/60 dark:border-white/10 px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-4 relative z-30 sticky top-0 transition-colors duration-500 backdrop-blur-2xl">
        {/* Izquierda: Logo + Nombre del Hub + Empresa */}
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => setActiveTab("vertical")}
            className="flex items-center gap-3 cursor-pointer group text-left"
          >
            <div className="p-1.5 rounded-xl bg-white/5 border border-white/10 group-hover:scale-105 transition-transform">
              <AuroraLogo size={32} animated />
            </div>
            <div>
              <div className="font-['Outfit'] font-black text-lg text-aurora leading-none">
                Aurora Hub
              </div>
              <div className="text-slate-500 dark:text-white/45 text-[10px] tracking-wider uppercase mt-0.5 font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                <span>{user?.empresa || "Mi negocio"}</span>
              </div>
            </div>
          </button>
        </div>

        {/* Centro: Pestañas de Navegación en 1 sola línea fluida (Segmented Pill) */}
        <nav className="flex items-center gap-1.5 apple-glass-pill rounded-full p-1.5 border border-slate-300/80 dark:border-white/15 bg-slate-100/90 dark:bg-white/[0.04] shadow-inner text-xs overflow-x-auto whitespace-nowrap">
          <button
            onClick={() => setActiveTab("vertical")}
            className={`px-4 py-2 rounded-full font-bold transition-all duration-300 cursor-pointer flex items-center gap-2 ${
              activeTab === "vertical"
                ? "bg-white text-slate-950 shadow-[0_2px_12px_rgba(0,0,0,0.15)] dark:bg-white/20 dark:text-white dark:border dark:border-white/25"
                : "text-slate-600 dark:text-white/65 hover:text-slate-950 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/8"
            }`}>
            <VerticalIcon size={15} />
            <span>Mis Sistemas</span>
          </button>

          <button
            onClick={() => setActiveTab("billing")}
            className={`px-4 py-2 rounded-full font-bold transition-all duration-300 cursor-pointer flex items-center gap-2 ${
              activeTab === "billing"
                ? "bg-white text-slate-950 shadow-[0_2px_12px_rgba(0,0,0,0.15)] dark:bg-white/20 dark:text-white dark:border dark:border-white/25"
                : "text-slate-600 dark:text-white/65 hover:text-slate-950 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/8"
            }`}>
            <IconCard size={15} />
            <span>Facturación & Pagos</span>
          </button>

          {esDuenoAdmin && (
            <button
              onClick={() => setActiveTab("team")}
              className={`px-4 py-2 rounded-full font-bold transition-all duration-300 cursor-pointer flex items-center gap-2 ${
                activeTab === "team"
                  ? "bg-white text-slate-950 shadow-[0_2px_12px_rgba(0,0,0,0.15)] dark:bg-white/20 dark:text-white dark:border dark:border-white/25"
                  : "text-slate-600 dark:text-white/65 hover:text-slate-950 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/8"
              }`}>
              <IconUsers size={15} />
              <span>Equipo & Roles</span>
            </button>
          )}

        </nav>

        {/* Derecha: Botón Directo a la vertical + Estado + Salir */}
        <div className="flex items-center gap-2.5 whitespace-nowrap">
          {/* Botón Destacado: Entrar a la app de la vertical activa */}
          {esVerticalReal && (
            <button
              onClick={() => navigate(rutaVertical)}
              className="btn-cyber-neon text-white text-xs font-extrabold px-4 py-2 rounded-full flex items-center gap-2 shadow-[0_0_20px_rgba(14,165,233,0.5)] hover:scale-105 transition-all cursor-pointer"
              title={`Abrir ${vertical.name}`}
            >
              <span className="w-2 h-2 rounded-full bg-teal-300 animate-pulse" />
              <span>Entrar a {vertical.name} →</span>
            </button>
          )}

          {/* Badge de Licencia compacto en 1 línea */}
          <div className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${
            isTrial
              ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
              : "bg-teal-500/10 border-teal-500/30 text-teal-700 dark:text-teal-300"
          }`}>
            <span className={`w-2 h-2 rounded-full ${isTrial ? "bg-amber-400 animate-ping" : "bg-teal-400"}`} />
            <span>{suscripcion?.vencida ? "Plan vencido" : isTrial ? `Prueba gratis · ${daysLeft} ${daysLeft === 1 ? "día" : "días"}` : "Plan activo"}</span>
          </div>

          <button
            onClick={logout}
            className="apple-glass-btn text-xs font-semibold px-3.5 py-2 rounded-full text-slate-700 dark:text-white/70 hover:text-red-500 dark:hover:text-red-400 border border-slate-300/60 dark:border-white/15 transition-colors cursor-pointer"
            title="Cerrar sesión de Aurora"
          >
            Salir
          </button>
        </div>
      </header>

      {/* ── CONTENIDO PRINCIPAL ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 space-y-8">
        
        {/* Plan vencido: sigue trabajando unos días de gracia, pero hay que avisarle con claridad */}
        {suscripcion?.vencida && (
          <div className="rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 border border-rose-300 bg-rose-50 text-rose-900">
            <div>
              <h4 className="font-bold text-sm">Tu plan venció el {suscripcion.fechaVencimiento ? new Date(suscripcion.fechaVencimiento + "T00:00:00").toLocaleDateString("es-VE", { day: "numeric", month: "long" }) : ""}</h4>
              <p className="text-xs mt-0.5">
                Puedes seguir trabajando hasta el {suscripcion.accesoHasta ? new Date(suscripcion.accesoHasta + "T00:00:00").toLocaleDateString("es-VE", { day: "numeric", month: "long" }) : "final del período de gracia"}. Después el acceso se pausa hasta que se confirme tu pago; tus datos no se borran.
              </p>
            </div>
            <button onClick={() => setShowPaymentModal(true)} className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer">
              Reportar mi pago →
            </button>
          </div>
        )}

        {/* BARRA DE RECORDATORIO DE TRIAL / PAGO (DISEÑO PREMIUM EN 1 LÍNEA) */}
        {isTrial && !suscripcion?.vencida && (
          <div className="apple-glass rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 border border-teal-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.06)] bg-gradient-to-r from-teal-500/10 via-transparent to-purple-500/10 backdrop-blur-xl">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-600 dark:text-teal-300 flex items-center justify-center shadow-inner flex-shrink-0">
                <IconHourglass size={20} />
              </div>
              <div>
                <h4 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-sm">
                  Estás disfrutando de tu prueba gratuita de {vertical.name}
                </h4>
                <p className="text-slate-500 dark:text-white/50 text-xs mt-0.5">
                  Te quedan <strong className="text-teal-600 dark:text-teal-400 font-bold">{daysLeft} días</strong> de acceso completo. Todo lo que registres se queda guardado cuando actives tu plan.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPaymentModal(true)}
                className="btn-electric-blue text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md cursor-pointer hover:scale-105 transition-all">
                Activar mi plan →
              </button>
            </div>
          </div>
        )}

        {/* ── PESTAÑA 1: LAUNCHER & ENTORNO DE LA VERTICAL (MEDICLINIC PRO) ── */}
        {activeTab === "vertical" && (
          <div className="space-y-8">
            
            {/* HERO LAUNCHER CARD — DISEÑO REDONDEADO Y ELEGANTE ESTILO APPLE LIQUID GLASS */}
            <div className="relative apple-glass rounded-[32px] p-6 sm:p-9 overflow-hidden shadow-2xl border border-teal-500/30 bg-gradient-to-br from-slate-900/95 via-[#0c1424]/95 to-slate-900/95 backdrop-blur-2xl">
              <div className="line-aurora absolute top-0 left-0 right-0" />
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                {/* Lado Izquierdo: Presentación y Botones Principales */}
                <div className="lg:col-span-7 space-y-5 text-left">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/15 border border-teal-500/30 text-xs font-extrabold text-teal-300 tracking-wider uppercase shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                    <span>{vertical.badge}</span>
                  </div>

                  <h2 className="font-['Outfit'] font-black text-3xl sm:text-4xl text-white leading-tight tracking-tight">
                    <span className="text-aurora">{vertical.name}</span> — Centro de Operaciones
                  </h2>

                  <p className="text-white/70 text-sm sm:text-base leading-relaxed max-w-2xl font-normal">
                    {vertical.desc}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      onClick={() => navigate(rutaVertical)}
                      className="btn-cyber-neon text-white text-xs sm:text-sm font-extrabold px-7 py-3.5 rounded-2xl flex items-center gap-2.5 shadow-[0_0_30px_rgba(255,59,128,0.5)] cursor-pointer hover:scale-105 transition-all">
                      <IconRocket size={17} />
                      <span>Entrar a {vertical.name}</span>
                      <span className="text-base">→</span>
                    </button>

                  </div>
                </div>

                {/* Lado Derecho: Métricas Reales en Grid 2x2 Estilo Glassmorphism */}
                <div className="lg:col-span-5 grid grid-cols-2 gap-3.5">
                  {(metricasEnVivo || vertical.stats.map((s) => ({ ...s, val: "—", change: "Sin datos por ahora", color: "text-white/40" }))).map((s) => (
                    <div key={s.label} className="apple-glass rounded-2xl p-4 sm:p-5 text-left border border-white/10 shadow-md hover:border-teal-400/40 transition-all duration-300">
                      <div className="text-white/50 text-[11px] font-medium leading-tight">{s.label}</div>
                      <div className={`font-['Outfit'] font-black text-2xl sm:text-3xl mt-1.5 ${s.color}`}>{s.val}</div>
                      <div className="text-[10px] text-white/40 mt-1">{s.change}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── MÓDULOS DE TU EMPRESA / ECOSISTEMA AURORA ── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Módulos de tu Empresa</span>
                    <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30 font-semibold">
                      Multi-Tenant Cloud
                    </span>
                  </h3>
                  <p className="text-slate-500 dark:text-white/50 text-xs mt-0.5">
                    Acceso directo a los módulos operativos y administrativos habilitados para tu negocio.
                  </p>
                </div>
              </div>

              <div className={`grid grid-cols-1 md:grid-cols-3 ${user?.rol === "DUENO_ADMIN" ? "lg:grid-cols-4" : ""} gap-5`}>
                {/* 1. Módulo Operativo Principal (Vertical Activa) */}
                <div 
                  onClick={() => navigate(rutaVertical)}
                  className="apple-glass rounded-3xl p-6 border border-slate-300/60 dark:border-white/10 hover:border-teal-400/50 transition-all duration-300 group cursor-pointer shadow-lg hover:shadow-2xl flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-teal-500/10 dark:bg-teal-400/10 text-teal-600 dark:text-teal-300 flex items-center justify-center border border-teal-500/20 group-hover:scale-110 transition-transform">
                        <VerticalIcon size={24} />
                      </div>
                      <span className="text-[10px] font-bold font-mono tracking-wider px-2.5 py-1 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30 uppercase">
                        Vertical Activa
                      </span>
                    </div>

                    <div>
                      <h4 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white group-hover:text-teal-500 dark:group-hover:text-teal-300 transition-colors">
                        {vertical.name}
                      </h4>
                      <p className="text-slate-500 dark:text-white/60 text-xs mt-1 leading-relaxed line-clamp-2">
                        {vertical.desc}
                      </p>
                    </div>
                  </div>

                  <div className="pt-5 mt-4 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between text-xs font-bold text-teal-600 dark:text-teal-300">
                    <span>Entrar al Sistema</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>

                {/* 2. Centro Financiero & Control Contable */}
                <div 
                  onClick={() => navigate("/finanzas")}
                  className="apple-glass rounded-3xl p-6 border border-slate-300/60 dark:border-white/10 hover:border-emerald-400/50 transition-all duration-300 group cursor-pointer shadow-lg hover:shadow-2xl flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-300 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
                        <IconBank size={24} />
                      </div>
                      <span className="text-[10px] font-bold font-mono tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 uppercase">
                        Finanzas & Control
                      </span>
                    </div>

                    <div>
                      <h4 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white group-hover:text-emerald-500 dark:group-hover:text-emerald-300 transition-colors">
                        Aurora Finanzas
                      </h4>
                      <p className="text-slate-500 dark:text-white/60 text-xs mt-1 leading-relaxed line-clamp-2">
                        Consolidación de ventas, margen bruto, costeo operativo, cobertura y comprobantes no fiscales.
                      </p>
                    </div>
                  </div>

                  <div className="pt-5 mt-4 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-300">
                    <span>Abrir Centro Financiero</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>

                {/* 3. Gestión de Personal & Nómina — solo si el negocio la tiene activa */}
                {accesoPersonal && (
                <div 
                  onClick={() => navigate("/personal")}
                  className="apple-glass rounded-3xl p-6 border border-slate-300/60 dark:border-white/10 hover:border-purple-400/50 transition-all duration-300 group cursor-pointer shadow-lg hover:shadow-2xl flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-purple-500/10 dark:bg-purple-400/10 text-purple-600 dark:text-purple-300 flex items-center justify-center border border-purple-500/20 group-hover:scale-110 transition-transform">
                        <IconUsers size={24} />
                      </div>
                      <span className="text-[10px] font-bold font-mono tracking-wider px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 uppercase">
                        Talento & Nómina
                      </span>
                    </div>

                    <div>
                      <h4 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white group-hover:text-purple-500 dark:group-hover:text-purple-300 transition-colors">
                        Gestión de Personal
                      </h4>
                      <p className="text-slate-500 dark:text-white/60 text-xs mt-1 leading-relaxed line-clamp-2">
                        Directorio del equipo, turnos, asistencia, metas y comisiones por venta.
                      </p>
                    </div>
                  </div>

                  <div className="pt-5 mt-4 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between text-xs font-bold text-purple-600 dark:text-purple-300">
                    <span>Abrir Gestión de Personal</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>
                )}

                {/* 4. Auditoría — solo el Dueño/Administrador la ve */}
                {user?.rol === "DUENO_ADMIN" && (
                  <div
                    onClick={() => navigate("/auditoria")}
                    className="apple-glass rounded-3xl p-6 border border-slate-300/60 dark:border-white/10 hover:border-amber-400/50 transition-all duration-300 group cursor-pointer shadow-lg hover:shadow-2xl flex flex-col justify-between relative overflow-hidden"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-300 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform">
                          <IconShield size={24} />
                        </div>
                        <span className="text-[10px] font-bold font-mono tracking-wider px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 uppercase">
                          Solo Dueño/Admin
                        </span>
                      </div>

                      <div>
                        <h4 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white group-hover:text-amber-500 dark:group-hover:text-amber-300 transition-colors">
                          Auditoría
                        </h4>
                        <p className="text-slate-500 dark:text-white/60 text-xs mt-1 leading-relaxed line-clamp-2">
                          Quién creó, editó o eliminó cada registro sensible en tu negocio, con fecha y usuario.
                        </p>
                      </div>
                    </div>

                    <div className="pt-5 mt-4 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-300">
                      <span>Abrir Auditoría</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SIMULADOR EN VIVO / WORKSPACE INTEGRADO */}
            <div className="apple-glass rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-300/60 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-300 flex items-center justify-center">
                    <VerticalIcon size={20} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-['Outfit'] font-bold text-lg text-slate-900 dark:text-white">
                      {userIndustry === "restaurante" ? "Espacio Gastronómico & POS en Vivo" :
                       userIndustry === "farmacia" ? "Espacio de Farmacia & Droguería en Vivo" :
                       esRubroComercio ? "Espacio de Comercio en Vivo" :
                       userIndustry === "finca" || userIndustry === "ganaderia" ? "Espacio Agropecuario & Ganadería en Vivo" :
                       userIndustry === "veterinaria" ? "Espacio Veterinario & Mascotas en Vivo" :
                       "Espacio de Trabajo Clínico en Vivo"}
                    </h3>
                    <p className="text-slate-500 dark:text-white/40 text-xs">
                      {userIndustry === "restaurante" ? "Venta rápida, mapa de mesas, KDS de cocina y control de caja multi-moneda." :
                       userIndustry === "farmacia" ? "Dispensación de medicamentos, control de lotes y ventas por mostrador." :
                       esRubroComercio ? "Kardex multi-unidad, código de barras, compras y cuentas por cobrar." :
                       userIndustry === "finca" || userIndustry === "ganaderia" ? "Rotación agronómica de potreros, control de hato, producción lechera y trazabilidad." :
                       userIndustry === "veterinaria" ? "Expedientes por mascota, plan de vacunas, cirugías e inventario veterinario." :
                       "Base de datos PostgreSQL Multi-tenant sincronizada en tiempo real."}
                    </p>
                  </div>
                </div>

                {/* Pestañas del simulador */}
                <div className="apple-glass-pill rounded-full p-1 flex items-center gap-1 text-xs">
                  <button
                    onClick={() => setWorkspaceTab("kpis")}
                    className={`px-3.5 py-1.5 rounded-full font-semibold transition-all ${
                      workspaceTab === "kpis" ? "bg-white text-black shadow-sm" : "text-slate-600 dark:text-white/60"
                    }`}>
                    Panel General
                  </button>
                  <button
                    onClick={() => setWorkspaceTab("patients")}
                    className={`px-3.5 py-1.5 rounded-full font-semibold transition-all ${
                      workspaceTab === "patients" ? "bg-white text-black shadow-sm" : "text-slate-600 dark:text-white/60"
                    }`}>
                    {userIndustry === "finca" || userIndustry === "ganaderia" ? "Hato & Animales" :
                     userIndustry === "restaurante" ? "Mesas & Comandas" :
                     esRubroComercio || userIndustry === "farmacia" ? "Kárdex & Stock" :
                     userIndustry === "veterinaria" ? "Expedientes Mascotas" :
                     "Expedientes & Triaje"}
                  </button>
                  <button
                    onClick={() => setWorkspaceTab("agenda")}
                    className={`px-3.5 py-1.5 rounded-full font-semibold transition-all ${
                      workspaceTab === "agenda" ? "bg-white text-black shadow-sm" : "text-slate-600 dark:text-white/60"
                    }`}>
                    {userIndustry === "finca" || userIndustry === "ganaderia" ? "Agenda Sanitaria" :
                     userIndustry === "restaurante" ? "Reservas & Turnos" :
                     esRubroComercio || userIndustry === "farmacia" ? "Recepciones & Pedidos" :
                     "Agenda de Citas"}
                  </button>
                </div>
              </div>

              {/* CONTENIDO DE LA PESTAÑA SELECCIONADA EN EL SIMULADOR */}
              {workspaceTab === "patients" ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-['Outfit'] font-bold text-sm text-slate-900 dark:text-white">
                      {userIndustry === "finca" || userIndustry === "ganaderia" ? "Inventario Reciente de Animales en el Hato" :
                       userIndustry === "restaurante" ? "Mesas y Comandas en el Salón" :
                       esRubroComercio || userIndustry === "farmacia" ? "Artículos en Catálogo & Kárdex" :
                       userIndustry === "veterinaria" ? "Expedientes Veterinarios & Pacientes" :
                       "Lista de Pacientes en Consulta / Triaje"}
                    </h4>
                    <button
                      onClick={() => navigate(rutaVertical)}
                      className="btn-electric-blue text-xs font-semibold px-4 py-2 rounded-full cursor-pointer">
                      {userIndustry === "finca" || userIndustry === "ganaderia" ? "+ Registrar Animal" :
                       userIndustry === "restaurante" ? "+ Abrir Mesa" :
                       esRubroComercio || userIndustry === "farmacia" ? "+ Nuevo Artículo" :
                       "+ Ingresar Paciente"}
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/10">
                    <table className="w-full text-left text-xs">
                      {userIndustry === "finca" || userIndustry === "ganaderia" ? (
                        <>
                          <thead className="bg-slate-200/60 dark:bg-white/5 text-slate-600 dark:text-white/50 border-b border-slate-200/80 dark:border-white/10">
                            <tr>
                              <th className="p-3.5">Arete / ID</th>
                              <th className="p-3.5">Nombre</th>
                              <th className="p-3.5">Raza / Especie</th>
                              <th className="p-3.5">Categoría / Sexo</th>
                              <th className="p-3.5">Peso</th>
                              <th className="p-3.5">Estado</th>
                              <th className="p-3.5 text-right">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                            {animalesGanaderia === null ? (
                              <tr><td colSpan={7} className="p-4 text-center text-slate-400 dark:text-white/30">Cargando datos del hato…</td></tr>
                            ) : animalesGanaderia.length === 0 ? (
                              <tr><td colSpan={7} className="p-4 text-center text-slate-400 dark:text-white/30">Sin animales registrados aún. Entra a Ganadería para registrar tu primer lote.</td></tr>
                            ) : (
                              animalesGanaderia.slice(0, 8).map((a) => (
                                <tr key={a.id} className="hover:bg-slate-100/50 dark:hover:bg-white/[0.02] transition-colors">
                                  <td className="p-3.5 font-bold font-mono text-emerald-600 dark:text-emerald-400">{a.arete}</td>
                                  <td className="p-3.5 font-bold text-slate-900 dark:text-white">{a.nombre || "—"}</td>
                                  <td className="p-3.5 text-slate-600 dark:text-white/70">{a.raza || a.especie || "Bovino"}</td>
                                  <td className="p-3.5 text-slate-700 dark:text-white/80">{a.tipoAnimal || "VACA"} · {a.sexo}</td>
                                  <td className="p-3.5 text-slate-500 dark:text-white/50 font-mono">{a.pesoActual ? `${a.pesoActual} kg` : "—"}</td>
                                  <td className="p-3.5">
                                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-semibold text-[10px]">
                                      {a.estado || "ACTIVO"}
                                    </span>
                                  </td>
                                  <td className="p-3.5 text-right">
                                    <button
                                      onClick={() => navigate(rutaVertical)}
                                      className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer">
                                      Ver Ficha →
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </>
                      ) : (esRubroComercio || userIndustry === "farmacia") ? (
                        <>
                          <thead className="bg-slate-200/60 dark:bg-white/5 text-slate-600 dark:text-white/50 border-b border-slate-200/80 dark:border-white/10">
                            <tr>
                              <th className="p-3.5">SKU / Código</th>
                              <th className="p-3.5">Descripción</th>
                              <th className="p-3.5">Stock Actual</th>
                              <th className="p-3.5">Unidad</th>
                              <th className="p-3.5">Precio Venta</th>
                              <th className="p-3.5 text-right">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                            {repuestosReales === null ? (
                              <tr><td colSpan={6} className="p-4 text-center text-slate-400 dark:text-white/30">Cargando catálogo…</td></tr>
                            ) : repuestosReales.length === 0 ? (
                              <tr><td colSpan={6} className="p-4 text-center text-slate-400 dark:text-white/30">Sin artículos registrados aún en inventario.</td></tr>
                            ) : (
                              repuestosReales.slice(0, 8).map((r) => (
                                <tr key={r.id} className="hover:bg-slate-100/50 dark:hover:bg-white/[0.02] transition-colors">
                                  <td className="p-3.5 font-bold font-mono text-teal-600 dark:text-teal-400">{r.codigoSku}</td>
                                  <td className="p-3.5 font-bold text-slate-900 dark:text-white">{r.descripcion}</td>
                                  <td className="p-3.5 text-slate-700 dark:text-white/80 font-mono">{r.stockActual}</td>
                                  <td className="p-3.5 text-slate-500 dark:text-white/50">{r.unidadBase || "UNIDAD"}</td>
                                  <td className="p-3.5 font-bold text-teal-600 dark:text-teal-400">${Number(r.precioVenta || 0).toFixed(2)}</td>
                                  <td className="p-3.5 text-right">
                                    <button
                                      onClick={() => navigate(rutaVertical)}
                                      className="text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer">
                                      Ver Kárdex →
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </>
                      ) : userIndustry === "restaurante" ? (
                        <>
                          <thead className="bg-slate-200/60 dark:bg-white/5 text-slate-600 dark:text-white/50 border-b border-slate-200/80 dark:border-white/10">
                            <tr>
                              <th className="p-3.5">Mesa</th>
                              <th className="p-3.5">Zona / Capacidad</th>
                              <th className="p-3.5">Estado</th>
                              <th className="p-3.5">Comanda Abierta</th>
                              <th className="p-3.5">Consumo</th>
                              <th className="p-3.5 text-right">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                            {mapaReales === null ? (
                              <tr><td colSpan={6} className="p-4 text-center text-slate-400 dark:text-white/30">Cargando salón…</td></tr>
                            ) : mapaReales.length === 0 ? (
                              <tr><td colSpan={6} className="p-4 text-center text-slate-400 dark:text-white/30">Sin mesas configuradas en el salón aún.</td></tr>
                            ) : (
                              mapaReales.slice(0, 8).map((m) => (
                                <tr key={m.mesa.id} className="hover:bg-slate-100/50 dark:hover:bg-white/[0.02] transition-colors">
                                  <td className="p-3.5 font-bold text-slate-900 dark:text-white">Mesa #{m.mesa.numero}</td>
                                  <td className="p-3.5 text-slate-500 dark:text-white/60">{m.mesa.zona || "Principal"} · {m.mesa.capacidad || 4}p</td>
                                  <td className="p-3.5">
                                    <span className={`px-2.5 py-1 rounded-full font-semibold text-[10px] ${
                                      m.estado === "OCUPADA"
                                        ? "bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-300"
                                        : "bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-300"
                                    }`}>
                                      {m.estado}
                                    </span>
                                  </td>
                                  <td className="p-3.5 text-slate-700 dark:text-white/80">{m.comandaAbierta ? `Comanda #${m.comandaAbierta.id} (${m.comandaAbierta.mesero})` : "Sin comanda"}</td>
                                  <td className="p-3.5 font-bold text-teal-600 dark:text-teal-400">{m.comandaAbierta ? `$${Number(m.comandaAbierta.totalConsumo || 0).toFixed(2)}` : "—"}</td>
                                  <td className="p-3.5 text-right">
                                    <button
                                      onClick={() => navigate(rutaVertical)}
                                      className="text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer">
                                      Abrir Mesa →
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </>
                      ) : (
                        <>
                          <thead className="bg-slate-200/60 dark:bg-white/5 text-slate-600 dark:text-white/50 border-b border-slate-200/80 dark:border-white/10">
                            <tr>
                              <th className="p-3.5">Paciente</th>
                              <th className="p-3.5">Edad / Info</th>
                              <th className="p-3.5">Motivo de Consulta</th>
                              <th className="p-3.5">Hora</th>
                              <th className="p-3.5">Estado</th>
                              <th className="p-3.5 text-right">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                            {citasReales === null ? (
                              <tr><td colSpan={6} className="p-4 text-center text-slate-400 dark:text-white/30">Cargando…</td></tr>
                            ) : citasReales.length === 0 ? (
                              <tr><td colSpan={6} className="p-4 text-center text-slate-400 dark:text-white/30">No hay citas registradas hoy.</td></tr>
                            ) : (
                              citasReales.map((c) => (
                                <tr key={c.id} className="hover:bg-slate-100/50 dark:hover:bg-white/[0.02] transition-colors">
                                  <td className="p-3.5 font-bold text-slate-900 dark:text-white">{c.paciente?.nombreCompleto || "—"}</td>
                                  <td className="p-3.5 text-slate-500 dark:text-white/60">{c.paciente?.edad ? `${c.paciente.edad} años` : "—"}</td>
                                  <td className="p-3.5 text-slate-700 dark:text-white/80">{c.motivo || c.especialidad || "—"}</td>
                                  <td className="p-3.5 text-slate-500 dark:text-white/50 font-mono">{c.horaInicio}</td>
                                  <td className="p-3.5">
                                    <span className="px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-300 font-semibold text-[10px]">
                                      {c.estado}
                                    </span>
                                  </td>
                                  <td className="p-3.5 text-right">
                                    <button
                                      onClick={() => navigate("/mediclinic")}
                                      className="text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer">
                                      Abrir Historia →
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </>
                      )}
                    </table>
                  </div>
                </div>
              ) : workspaceTab === "agenda" ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {userIndustry === "finca" || userIndustry === "ganaderia" ? (
                    alertasGanaderia && ((alertasGanaderia.refuerzosVacunaPendientes && alertasGanaderia.refuerzosVacunaPendientes.length > 0) || (alertasGanaderia.partosProximos && alertasGanaderia.partosProximos.length > 0)) ? (
                      [
                        ...(alertasGanaderia.refuerzosVacunaPendientes || []).map((v) => ({
                          titulo: `Vacuna: ${v.vacuna?.nombre || "Sanitaria"}`,
                          sub: `Animal: ${v.animal?.arete || ""} · Refuerzo pendiente`,
                          tag: "Sanidad",
                        })),
                        ...(alertasGanaderia.partosProximos || []).map((p) => ({
                          titulo: `Parto Próximo: ${p.hembra?.arete || ""}`,
                          sub: `Fecha prob: ${p.fechaProbableParto || "Próxima"}`,
                          tag: "Reproducción",
                        })),
                      ].slice(0, 3).map((item, i) => (
                        <div key={i} className="apple-glass rounded-2xl p-4 border border-white/10 text-left space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold">{item.tag}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">Pendiente</span>
                          </div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white">{item.titulo}</div>
                          <p className="text-slate-500 dark:text-white/40 text-xs">{item.sub}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 dark:text-white/30 text-sm col-span-3 text-center py-6">
                        No hay tareas sanitarias ni partos próximos programados para hoy en el hato.
                      </p>
                    )
                  ) : (userIndustry === "clinica" || userIndustry === "veterinaria" || userIndustry === "odontologia") ? (
                    citasReales === null ? (
                      <p className="text-slate-400 dark:text-white/30 text-sm col-span-3 text-center py-4">Cargando…</p>
                    ) : citasReales.length === 0 ? (
                      <p className="text-slate-400 dark:text-white/30 text-sm col-span-3 text-center py-4">No hay citas agendadas para hoy.</p>
                    ) : (
                      citasReales.map((c) => (
                        <div key={c.id} className="apple-glass rounded-2xl p-4 border border-white/10 text-left space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-teal-600 dark:text-teal-400 text-xs font-mono font-bold">{c.horaInicio} — {c.horaFin}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/15 text-teal-600 dark:text-teal-300">{c.estado}</span>
                          </div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white">{c.paciente?.nombreCompleto} — {c.especialidad || c.motivo}</div>
                          <p className="text-slate-500 dark:text-white/40 text-xs">{c.motivo}</p>
                        </div>
                      ))
                    )
                  ) : (
                    <p className="text-slate-400 dark:text-white/30 text-sm col-span-3 text-center py-6">
                      Sin eventos o recepciones programadas para hoy.
                    </p>
                  )}
                </div>
              ) : (
                /* KPIS Y ACCIONES RÁPIDAS */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {vertical.actions.map((act) => {
                    const ActIcon = ACTION_ICON[act.label] || IconStethoscope;
                    return (
                    <div
                      key={act.label}
                      onClick={() => navigate(rutaVertical)}
                      className="apple-glass rounded-2xl p-5 hover-card text-left cursor-pointer border border-white/10 shadow-sm space-y-2">
                      <div className="text-teal-600 dark:text-teal-300"><ActIcon size={22} /></div>
                      <h4 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-sm">{act.label}</h4>
                      <p className="text-slate-500 dark:text-white/40 text-xs leading-relaxed">{act.desc}</p>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ── PESTAÑA 2: BILLING, FACTURACIÓN Y PAGOS ── */}
        {activeTab === "billing" && (
          <div className="space-y-8">
            <div className="apple-glass rounded-3xl p-6 sm:p-8 space-y-6 text-left">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-300/60 dark:border-white/10">
                <div>
                  <h3 className="font-['Outfit'] font-black text-2xl text-slate-900 dark:text-white">
                    Centro de Suscripción & Pagos
                  </h3>
                  <p className="text-slate-500 dark:text-white/45 text-sm mt-1">
                    Gestiona tu plan activo, métodos de pago autorizados y reporte de comprobantes.
                  </p>
                </div>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="btn-electric-blue text-xs font-bold px-6 py-3 rounded-full cursor-pointer shadow-md flex items-center gap-2">
                  <IconCard size={14} />
                  <span>Reportar Nuevo Pago</span>
                </button>
              </div>

              {/* Tarjetas de Estado del Plan */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="apple-glass rounded-2xl p-5 border border-teal-500/30 space-y-2">
                  <div className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Plan Actual</div>
                  <div className="font-['Outfit'] font-black text-2xl text-slate-900 dark:text-white">
                    {suscripcion?.vencida ? "Plan vencido" : isTrial ? "Prueba gratis" : "Plan activo"}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-white/40">
                    {suscripcion?.planSolicitado === "full" ? "Elegiste Aurora Full (desde $40/mes)." : suscripcion?.planSolicitado === "basico" ? "Elegiste Aurora Básico ($25/mes)." : "Aurora Básico $25/mes · Aurora Full desde $40/mes."}
                  </p>
                </div>

                <div className="apple-glass rounded-2xl p-5 border border-white/10 space-y-2">
                  <div className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">{isTrial ? "Tu prueba termina" : "Próxima fecha de corte"}</div>
                  <div className="font-['Outfit'] font-black text-2xl text-slate-900 dark:text-white">
                    {suscripcion?.fechaVencimiento
                      ? new Date(suscripcion.fechaVencimiento + "T00:00:00").toLocaleDateString("es-VE", { day: "numeric", month: "long", year: "numeric" })
                      : "—"}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-white/40">
                    Te avisamos por correo 5 días antes.
                  </p>
                </div>

                <div className="apple-glass rounded-2xl p-5 border border-white/10 space-y-2">
                  <div className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Métodos Disponibles</div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-white/90">
                    Pago Móvil · Binance · Zelle
                  </div>
                  <p className="text-xs text-slate-500 dark:text-white/40">
                    Tasa oficial BCV para pagos en bolívares.
                  </p>
                </div>
              </div>

              {/* Historial de Pagos y Facturas */}
              <div className="space-y-4 pt-4">
                <h4 className="font-['Outfit'] font-bold text-base text-slate-900 dark:text-white">
                  Historial de Pagos & Recibos
                </h4>

                <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/10">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-200/60 dark:bg-white/5 text-slate-600 dark:text-white/50 border-b border-slate-200/80 dark:border-white/10">
                      <tr>
                        <th className="p-3.5">ID Recibo</th>
                        <th className="p-3.5">Fecha</th>
                        <th className="p-3.5">Monto</th>
                        <th className="p-3.5">Método / Referencia</th>
                        <th className="p-3.5">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                      {(suscripcion?.pagos && suscripcion.pagos.length > 0) ? (
                        suscripcion.pagos.map((p) => (
                          <tr key={p.id}>
                            <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-white">#{p.id}</td>
                            <td className="p-3.5 text-slate-600 dark:text-white/60">{new Date(p.fecha).toLocaleDateString("es-VE")}</td>
                            <td className="p-3.5 font-bold text-teal-600 dark:text-teal-400">{Number(p.monto).toFixed(2)} {p.moneda}</td>
                            <td className="p-3.5 text-slate-600 dark:text-white/70">{p.metodoPago}{p.referencia ? ` · Ref: ${p.referencia}` : ""}</td>
                            <td className="p-3.5">
                              <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-300 font-semibold text-[10px]">
                                CONFIRMADO
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400 dark:text-white/40">
                            Aún no hay pagos confirmados. Cuando reportes uno, aparece aquí en cuanto el equipo de Aurora lo verifique.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── PESTAÑA 3: EQUIPO Y ROLES ── */}
        {activeTab === "team" && esDuenoAdmin && (
          <div className="apple-glass rounded-3xl p-6 sm:p-8 space-y-6 text-left shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-300/60 dark:border-white/10">
              <div>
                <h3 className="font-['Outfit'] font-black text-2xl text-slate-900 dark:text-white">
                  Equipo de Trabajo & Accesos
                </h3>
                <p className="text-slate-500 dark:text-white/45 text-sm mt-1">
                  Crea un usuario y contraseña por cada colaborador, con su propio rol. Solo tú, como Dueño/Administrador, ves esta pantalla y la Auditoría.
                </p>
              </div>
              <button
                onClick={() => setModalNuevoColaborador(true)}
                className="btn-electric-blue text-xs font-bold px-6 py-3 rounded-full cursor-pointer shadow-md">
                + Nuevo Colaborador
              </button>
            </div>

            {errorEquipo && (
              <p className="text-xs font-semibold text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">{errorEquipo}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="apple-glass rounded-2xl p-5 border border-white/10 space-y-2">
                <div className="text-teal-600 dark:text-teal-300"><IconUser size={26} /></div>
                <div className="font-['Outfit'] font-bold text-base text-slate-900 dark:text-white">
                  {user?.nombre || "Usuario Administrador"}
                </div>
                <div className="text-xs font-semibold text-teal-600 dark:text-teal-400">
                  {ROL_LABEL[user?.rol || ""] || user?.rol || "Propietario / Admin"}
                </div>
                <div className="text-xs text-slate-500 dark:text-white/40 font-mono">
                  {user?.email || "admin@auroraplus.com"}
                </div>
                <span className="inline-block text-[9px] font-bold uppercase tracking-wider bg-teal-500/15 text-teal-600 dark:text-teal-400 px-2 py-0.5 rounded-full">
                  Tú (Dueño/Administrador)
                </span>
              </div>

              {cargandoEquipo ? (
                <div className="apple-glass rounded-2xl p-6 border border-white/10 flex items-center justify-center col-span-1 md:col-span-2 text-xs text-slate-500 dark:text-white/50">
                  Cargando equipo…
                </div>
              ) : colaboradores.length === 0 ? (
                <div className="apple-glass rounded-2xl p-6 border border-dashed border-slate-300 dark:border-white/20 flex flex-col justify-center items-center text-center col-span-1 md:col-span-2 space-y-2">
                  <p className="text-slate-500 dark:text-white/50 text-xs max-w-sm">
                    Sin colaboradores adicionales registrados aún. Crea uno con usuario, contraseña y rol (encargado de almacén, cajero, veterinario, etc. según tu vertical).
                  </p>
                </div>
              ) : (
                <div className="col-span-1 md:col-span-2 space-y-2">
                  {colaboradores.map((u) => (
                    <div key={u.id} className="apple-glass rounded-2xl p-4 border border-white/10 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-['Outfit'] font-bold text-sm text-slate-900 dark:text-white truncate">
                            {u.nombreCompleto || u.username}
                          </span>
                          {!u.activo && (
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-500/15 text-slate-500 dark:text-white/50 px-2 py-0.5 rounded-full shrink-0">
                              Desactivado
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-white/40 font-mono">@{u.username}</div>
                        <div className="text-[11px] font-semibold text-teal-600 dark:text-teal-400">{ROL_LABEL[u.rol] || u.rol}</div>
                      </div>
                      {u.activo && (
                        <button
                          onClick={() => desactivarColaborador(u.id)}
                          className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 cursor-pointer shrink-0"
                        >
                          Desactivar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MODAL NUEVO COLABORADOR ── */}
        {modalNuevoColaborador && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer" onClick={() => setModalNuevoColaborador(false)}>
            <div className="apple-glass rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl cursor-default text-left" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-300/60 dark:border-white/10">
                <h3 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">Nuevo Colaborador</h3>
                <button onClick={() => setModalNuevoColaborador(false)} className="text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white cursor-pointer">
                  <IconClose size={18} />
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!user?.tenantId) return;
                  const fd = new FormData(e.currentTarget);
                  const username = String(fd.get("username") || "").trim();
                  const password = String(fd.get("password") || "");
                  const rol = String(fd.get("rol") || "");
                  const nombreCompleto = String(fd.get("nombreCompleto") || "").trim() || undefined;
                  if (!username || !password || !rol) return;
                  setGuardandoColaborador(true);
                  setErrorEquipo(null);
                  try {
                    await crearUsuarioPropio(user.tenantId, { username, password, rol, nombreCompleto });
                    setModalNuevoColaborador(false);
                    cargarEquipo();
                  } catch (err: any) {
                    setErrorEquipo(err?.message || "No se pudo crear el colaborador.");
                  } finally {
                    setGuardandoColaborador(false);
                  }
                }}
                className="space-y-3 text-sm"
              >
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-white/50 block mb-1">Nombre completo</label>
                  <input name="nombreCompleto" className="w-full px-3 py-2 rounded-xl bg-white/80 dark:bg-white/5 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-white/50 block mb-1">Usuario (para iniciar sesión)</label>
                  <input required name="username" className="w-full px-3 py-2 rounded-xl bg-white/80 dark:bg-white/5 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white font-mono" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-white/50 block mb-1">Contraseña</label>
                  <input required name="password" type="password" minLength={6} className="w-full px-3 py-2 rounded-xl bg-white/80 dark:bg-white/5 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white font-mono" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-white/50 block mb-1">Rol</label>
                  <select required name="rol" defaultValue="" className="w-full px-3 py-2 rounded-xl bg-white/80 dark:bg-white/5 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white">
                    <option value="" disabled>Selecciona un rol…</option>
                    {Object.entries(ROL_LABEL).filter(([id]) => id !== "DUENO_ADMIN").map(([id, label]) => (
                      <option key={id} value={id}>{label}</option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-white/40">
                  Este colaborador no tendrá acceso a Equipo & Roles ni a Auditoría — eso queda reservado al Dueño/Administrador.
                </p>
                <div className="pt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setModalNuevoColaborador(false)} className="px-4 py-2 rounded-xl bg-slate-200/70 dark:bg-white/10 text-xs font-bold text-slate-800 dark:text-white cursor-pointer">
                    Cancelar
                  </button>
                  <button type="submit" disabled={guardandoColaborador} className="px-5 py-2 rounded-xl btn-electric-blue text-xs font-bold cursor-pointer disabled:opacity-60">
                    {guardandoColaborador ? "Creando…" : "Crear Colaborador"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>

      {/* ── MODAL COMPLETO DE PAGO & REPORTE DE TRANSFERENCIA ── */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="apple-glass rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-white/20 shadow-2xl relative text-left space-y-5 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-300/60 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-300 flex items-center justify-center">
                  <IconCard size={20} />
                </div>
                <div>
                  <h3 className="font-['Outfit'] font-bold text-lg text-slate-900 dark:text-white">
                    Pagar Suscripción Aurora Plus
                  </h3>
                  <p className="text-slate-500 dark:text-white/40 text-xs">
                    Reporta tu pago y lo activamos al verificarlo
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="w-8 h-8 rounded-full bg-black/10 dark:bg-white/10 text-slate-700 dark:text-white flex items-center justify-center cursor-pointer">
                <IconClose size={14} />
              </button>
            </div>

            {paymentSuccessMsg ? (
              <div className="p-6 text-center space-y-3">
                <div className="flex justify-center text-teal-500 dark:text-teal-400"><IconCheckCircle size={40} /></div>
                <h4 className="font-['Outfit'] font-bold text-lg text-teal-600 dark:text-teal-400">{paymentSuccessMsg}</h4>
              </div>
            ) : (
              <form onSubmit={handleReportPaymentSubmit} className="space-y-4">

                {/* Datos bancarios oficiales para transferir */}
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-300/80 dark:border-white/10 text-xs space-y-2.5">
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 font-sans text-xs flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <IconBank size={14} /> Cuentas Oficiales para Transferir:
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                      {tasaBcv ? `Tasa de referencia: ${tasaBcv.toFixed(2)} Bs/$` : "Paga a la tasa BCV del día"}
                    </span>
                  </div>

                  {/* Pago Movil Banesco */}
                  <div className="p-3 rounded-xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 space-y-1.5 font-mono text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="font-sans font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Pago Movil {cuentasCobro.banco || "Banesco (0134)"}
                      </span>
                      <button
                        type="button"
                        onClick={() => copiarTexto(`${cuentasCobro.telefono} ${cuentasCobro.cedula}`, "todo")}
                        className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer font-sans"
                      >
                        {copiadoCampo === "todo" ? "Copiado!" : "Copiar Datos"}
                      </button>
                    </div>

                    <div className="text-slate-700 dark:text-slate-300 space-y-0.5">
                      <div className="flex justify-between items-center">
                        <span>Telefono: <strong>{cuentasCobro.telefono}</strong></span>
                        <button
                          type="button"
                          onClick={() => copiarTexto(cuentasCobro.telefono, "tel")}
                          className="text-[9px] text-slate-400 hover:text-emerald-500 cursor-pointer"
                        >
                          {copiadoCampo === "tel" ? "OK" : "Copiar"}
                        </button>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Cedula / RIF: <strong>{cuentasCobro.cedula}</strong></span>
                        <button
                          type="button"
                          onClick={() => copiarTexto(cuentasCobro.cedula, "ci")}
                          className="text-[9px] text-slate-400 hover:text-emerald-500 cursor-pointer"
                        >
                          {copiadoCampo === "ci" ? "OK" : "Copiar"}
                        </button>
                      </div>
                      {cuentasCobro.titular && (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          Titular: {cuentasCobro.titular}
                        </div>
                      )}
                    </div>

                    {/* Total equivalente en Bs: solo si hay una tasa real cargada */}
                    {tasaBcv && (
                    <div className="pt-1.5 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-[11px] font-sans">
                      <span className="text-slate-500 dark:text-slate-400">Monto exacto a transferir:</span>
                      <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs">
                        Bs. {((parseFloat(paymentForm.monto.replace(/[^0-9.]/g, "")) || 25.0) * tasaBcv).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    )}
                  </div>

                  {/* Binance USDT si existe */}
                  {cuentasCobro.binanceUsdt && (
                    <div className="p-2 rounded-xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 flex items-center justify-between text-[11px]">
                      <span className="font-mono truncate mr-2">Binance USDT: {cuentasCobro.binanceUsdt}</span>
                      <button
                        type="button"
                        onClick={() => copiarTexto(cuentasCobro.binanceUsdt, "binance")}
                        className="text-[10px] text-sky-500 font-bold hover:underline cursor-pointer flex-shrink-0"
                      >
                        {copiadoCampo === "binance" ? "Copiado!" : "Copiar"}
                      </button>
                    </div>
                  )}

                  {/* Zelle si existe */}
                  {cuentasCobro.zelle && (
                    <div className="p-2 rounded-xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 flex items-center justify-between text-[11px]">
                      <span className="font-mono truncate mr-2">Zelle: {cuentasCobro.zelle}</span>
                      <button
                        type="button"
                        onClick={() => copiarTexto(cuentasCobro.zelle, "zelle")}
                        className="text-[10px] text-purple-500 font-bold hover:underline cursor-pointer flex-shrink-0"
                      >
                        {copiadoCampo === "zelle" ? "Copiado!" : "Copiar"}
                      </button>
                    </div>
                  )}

                  {cuentasCobro.instrucciones && (
                    <p className="text-[10px] text-slate-500 dark:text-white/50 italic font-sans pt-0.5">
                      {cuentasCobro.instrucciones}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-white/70 mb-1">
                    Metodo de Pago Utilizado
                  </label>
                  <select
                    value={paymentForm.metodo}
                    onChange={(e) => setPaymentForm({ ...paymentForm, metodo: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-xs font-medium text-slate-900 dark:text-white">
                    <option value="Pago Móvil (Bolívares - Tasa BCV)">Pago Móvil (Bolívares - Tasa BCV)</option>
                    <option value="Transferencia Bancaria Nacional (Banesco/Mercantil)">Transferencia Bancaria Nacional</option>
                    <option value="Binance Pay / USDT">Binance Pay / USDT</option>
                    <option value="Zelle">Zelle</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-white/70 mb-1">
                      Monto a Reportar
                    </label>
                    <input
                      type="text"
                      value={paymentForm.monto}
                      onChange={(e) => setPaymentForm({ ...paymentForm, monto: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-xs text-slate-900 dark:text-white font-mono"
                      placeholder="$25.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-white/70 mb-1">
                      Número de Referencia
                    </label>
                    <input
                      type="text"
                      required
                      value={paymentForm.referencia}
                      onChange={(e) => setPaymentForm({ ...paymentForm, referencia: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-xs text-slate-900 dark:text-white font-mono"
                      placeholder="Ej. 984021"
                    />
                  </div>
                </div>

                {errorPago && <p className="text-xs text-rose-600 dark:text-rose-400">{errorPago}</p>}

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="apple-glass-btn text-xs font-semibold px-4 py-2.5 rounded-xl text-slate-700 dark:text-white cursor-pointer">
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={enviandoPago}
                    className="btn-electric-blue text-xs font-bold px-6 py-2.5 rounded-xl cursor-pointer shadow-md disabled:opacity-60">
                    {enviandoPago ? "Enviando…" : "Enviar reporte de pago →"}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

