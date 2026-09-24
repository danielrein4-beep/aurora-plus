import { obtenerCuentasCobro, type SaasCuentasCobroConfig } from "../cuentasCobroConfig";
import TenantSoporteWidget from "../components/TenantSoporteWidget";
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
      { label: "Pacientes Registrados", val: "0", change: "Sin pacientes aún", color: "text-[#177E89]" },
      { label: "Citas de Hoy", val: "0", change: "Sin citas agendadas", color: "text-[#177E89]" },
      { label: "Ingresos del Día", val: "$0.00", change: "Multi-moneda (USD/VES)", color: "text-[#1D1D1F]" },
      { label: "Pacientes en Espera", val: "0", change: "Sin pacientes en espera", color: "text-[#1D1D1F]" },
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
      { label: "Ventas de Hoy", val: "$0.00", change: "Sin ventas hoy", color: "text-[#177E89]" },
      { label: "Stock Farmacia", val: "0", change: "Sin medicamentos cargados", color: "text-[#177E89]" },
      { label: "Lotes por Vencer", val: "0", change: "Sin alertas activas", color: "text-[#1D1D1F]" },
      { label: "Caja del Día", val: "$0.00", change: "Multi-moneda (USD/VES/COP)", color: "text-[#1D1D1F]" },
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
      { label: "Mascotas Atendidas", val: "0", change: "Sin mascotas registradas", color: "text-[#177E89]" },
      { label: "Vacunaciones", val: "0", change: "Sin vacunas hoy", color: "text-[#177E89]" },
      { label: "Venta Farmacia Vet", val: "$0.00", change: "Alimentos y fármacos", color: "text-[#1D1D1F]" },
      { label: "Hospitalizaciones", val: "0", change: "Sin animales hospitalizados", color: "text-[#1D1D1F]" },
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
      { label: "Pacientes Atendidos", val: "0", change: "Sin pacientes registrados", color: "text-[#177E89]" },
      { label: "Citas de Hoy", val: "0", change: "Sin citas agendadas", color: "text-[#177E89]" },
      { label: "Ingresos del Día", val: "$0.00", change: "Multi-moneda (USD/VES)", color: "text-[#1D1D1F]" },
      { label: "Tratamientos en Curso", val: "0", change: "Sin planes activos", color: "text-[#1D1D1F]" },
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
      { label: "Ventas de Hoy", val: "$0.00", change: "Sin ventas hoy", color: "text-[#177E89]" },
      { label: "Artículos en Stock", val: "0", change: "Sin artículos cargados", color: "text-[#177E89]" },
      { label: "Cuentas x Cobrar", val: "$0.00", change: "Sin deudas pendientes", color: "text-[#1D1D1F]" },
      { label: "Órdenes de Compra", val: "0", change: "Sin órdenes registradas", color: "text-[#1D1D1F]" },
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
      { label: "Mesas Ocupadas", val: "0 / 0", change: "Sin mesas configuradas", color: "text-[#177E89]" },
      { label: "Comandas Abiertas", val: "0", change: "Sin comandas activas", color: "text-[#177E89]" },
      { label: "Ventas del Día", val: "$0.00", change: "Multi-moneda (USD/VES)", color: "text-[#1D1D1F]" },
      { label: "Platos en Cocina", val: "0", change: "Cocina al día", color: "text-[#1D1D1F]" },
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
      { label: "Ventas de Hoy", val: "$0.00", change: "Sin ventas hoy", color: "text-[#177E89]" },
      { label: "Artículos en Stock", val: "0", change: "Sin artículos cargados", color: "text-[#177E89]" },
      { label: "Cuentas x Cobrar", val: "$0.00", change: "Sin deudas pendientes", color: "text-[#1D1D1F]" },
      { label: "Órdenes de Compra", val: "0", change: "Sin órdenes registradas", color: "text-[#1D1D1F]" },
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
      { label: "Ventas de Hoy", val: "$0.00", change: "Sin ventas hoy", color: "text-[#177E89]" },
      { label: "Artículos en Stock", val: "0", change: "Sin artículos cargados", color: "text-[#177E89]" },
      { label: "Cuentas x Cobrar", val: "$0.00", change: "Sin deudas pendientes", color: "text-[#1D1D1F]" },
      { label: "Órdenes de Compra", val: "0", change: "Sin órdenes registradas", color: "text-[#1D1D1F]" },
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
      { label: "Ventas de Hoy", val: "$0.00", change: "Sin ventas hoy", color: "text-[#177E89]" },
      { label: "Artículos en Stock", val: "0", change: "Sin artículos cargados", color: "text-[#177E89]" },
      { label: "Cuentas x Cobrar", val: "$0.00", change: "Sin deudas pendientes", color: "text-[#1D1D1F]" },
      { label: "Órdenes de Compra", val: "0", change: "Sin órdenes registradas", color: "text-[#1D1D1F]" },
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
      { label: "Cabezas en Hato", val: "0", change: "Sin animales registrados", color: "text-[#177E89]" },
      { label: "Litros Ordeñados", val: "0 L", change: "Sin registros hoy", color: "text-[#177E89]" },
      { label: "Potreros Activos", val: "0", change: "Sin potreros registrados", color: "text-[#1D1D1F]" },
      { label: "Alertas Retiro", val: "0", change: "100% apto consumo", color: "text-[#1D1D1F]" },
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
      { label: "Cabezas en Hato", val: "0", change: "Sin animales registrados", color: "text-[#177E89]" },
      { label: "Litros Ordeñados", val: "0 L", change: "Sin registros hoy", color: "text-[#177E89]" },
      { label: "Potreros Activos", val: "0", change: "Sin potreros registrados", color: "text-[#1D1D1F]" },
      { label: "Alertas Retiro", val: "0", change: "100% apto consumo", color: "text-[#1D1D1F]" },
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

  const tasaBcv = 45.0;
  const [paymentForm, setPaymentForm] = useState({
    metodo: "Pago Móvil (Bolívares - Tasa BCV)",
    monto: "$35.00",
    referencia: "",
    banco: "Banesco",
  });
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState("");

  const userIndustry = user?.industry || "clinica";
  const vertical = VERTICAL_METADATA[userIndustry] || VERTICAL_METADATA["clinica"];
  const VerticalIcon = VERTICAL_ICON[userIndustry] || VERTICAL_ICON["clinica"];
  const isTrial = user?.planStatus !== "active";
  const daysLeft = isTrial ? trialDaysLeft : 30;

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
            color: "text-[#177E89]",
          },
          {
            label: "Litros Ordeñados",
            val: `${litrosHoy.toFixed(1)} L`,
            change: litrosHoy > 0 ? "Ordeño registrado hoy" : "Sin ordeños hoy",
            color: "text-[#177E89]",
          },
          {
            label: "Potreros Activos",
            val: potList.length > 0 ? `${potActivos} / ${potList.length}` : "0",
            change: potList.length > 0 ? `${potDescanso} en descanso` : "Sin potreros registrados",
            color: "text-[#1D1D1F]",
          },
          {
            label: "Alertas Retiro",
            val: String(retirosCount),
            change: retirosCount > 0 ? `${retirosCount} retiros activos` : "100% apto consumo",
            color: "text-[#1D1D1F]",
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
            color: "text-[#177E89]",
          },
          {
            label: "Artículos en Stock",
            val: String(repList.length),
            change: repList.length > 0 ? `${bajoMinimo} bajo mínimo` : "Sin artículos cargados",
            color: "text-[#177E89]",
          },
          {
            label: "Cuentas x Cobrar",
            val: `$${cxcTotal.toFixed(2)}`,
            change: cxcList.length > 0 ? `${cxcList.length} créditos pendientes` : "Sin deudas pendientes",
            color: "text-[#1D1D1F]",
          },
          {
            label: "Órdenes de Compra",
            val: String(compList.length),
            change: compList.length > 0 ? `${compList.length} compras registradas` : "Sin compras registradas",
            color: "text-[#1D1D1F]",
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
            color: "text-[#177E89]",
          },
          {
            label: "Comandas Abiertas",
            val: String(comandasAbiertas),
            change: comandasAbiertas > 0 ? "Salón + delivery" : "Sin comandas activas",
            color: "text-[#177E89]",
          },
          {
            label: "Ventas del Día",
            val: `$${ventasVal.toFixed(2)}`,
            change: ventasVal > 0 ? "Cobros del día" : "Sin ventas hoy",
            color: "text-[#1D1D1F]",
          },
          {
            label: "Platos en Cocina",
            val: String(platosEnCocina),
            change: platosEnCocina > 0 ? "Pendientes + en preparación" : "Cocina al día",
            color: "text-[#1D1D1F]",
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
            color: "text-[#177E89]",
          },
          {
            label: "Stock Farmacia",
            val: String(repList.length),
            change: repList.length > 0 ? `${bajoMinimo} alertas de reorden` : "Sin medicamentos cargados",
            color: "text-[#177E89]",
          },
          {
            label: "Lotes por Vencer",
            val: String(lotes.length),
            change: lotes.length > 0 ? "Próximos 30 días" : "Sin alertas activas",
            color: "text-[#1D1D1F]",
          },
          {
            label: "Caja del Día",
            val: `$${cajaVal.toFixed(2)}`,
            change: "Multi-moneda (USD/VES/COP)",
            color: "text-[#1D1D1F]",
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
            color: "text-[#177E89]",
          },
          {
            label: "Citas de Hoy",
            val: String(citas.length),
            change: citas.length > 0 ? `${citas.filter(c => c.estado === "CONFIRMADA").length} confirmadas` : "Sin citas hoy",
            color: "text-[#177E89]",
          },
          {
            label: "Ingresos del Día",
            val: `$${ingVal.toFixed(2)}`,
            change: "Consultas y PetShop",
            color: "text-[#1D1D1F]",
          },
          {
            label: "En Espera / Hospital",
            val: String(enEspera),
            change: enEspera > 0 ? "En atención activa" : "Sin pacientes en espera",
            color: "text-[#1D1D1F]",
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
            color: "text-[#177E89]",
          },
          {
            label: "Citas de Hoy",
            val: String(citas.length),
            change: citas.length > 0 ? `${citas.filter(c => c.estado === "CONFIRMADA").length} confirmadas` : "Sin citas agendadas",
            color: "text-[#177E89]",
          },
          {
            label: "Ingresos del Día",
            val: `$${ingVal.toFixed(2)}`,
            change: "Multi-moneda (USD/VES/COP)",
            color: "text-[#1D1D1F]",
          },
          {
            label: "Sala de Espera",
            val: String(enEspera),
            change: enEspera > 0 ? "Pacientes en espera" : "Sin pacientes en espera",
            color: "text-[#1D1D1F]",
          },
        ]);
      });
    }
  }, [user?.tenantId, userIndustry]);

  const handleReportPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.referencia.trim()) return;

    reportPayment({
      monto: paymentForm.monto,
      metodo: paymentForm.metodo,
      referencia: paymentForm.referencia,
    });

    setPaymentSuccessMsg("¡Pago registrado con éxito! Tu plan ha sido activado inmediatamente.");
    setTimeout(() => {
      setShowPaymentModal(false);
      setPaymentSuccessMsg("");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-white text-[#1D1D1F] flex flex-col">
      <AuroraGradientDef />

      {/* ── HEADER SUPERIOR DEL PORTAL DE CLIENTE ── */}
      <header className="bg-white/95 border-b border-[#E5E5EA] px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-4 relative z-30 sticky top-0">
        {/* Izquierda: Logo + Nombre del Hub + Empresa */}
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-3 cursor-pointer group text-left"
          >
            <div className="p-1.5 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] group-hover:scale-105 transition-transform">
              <AuroraLogo size={32} animated />
            </div>
            <div>
              <div className="font-bold text-lg text-[#1D1D1F] leading-none">
                Aurora Hub
              </div>
              <div className="text-[#86868B] text-[10px] tracking-wider uppercase mt-0.5 font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#177E89]" />
                <span>{user?.empresa || "Clínica & Consultorios Médicos"}</span>
              </div>
            </div>
          </button>
        </div>

        {/* Centro: Pestañas de Navegación en 1 sola línea fluida (Segmented Pill) */}
        <nav className="flex items-center gap-1.5 bg-[#F5F5F7] border border-[#E5E5EA] rounded-full p-1.5 text-xs overflow-x-auto whitespace-nowrap">
          <button
            onClick={() => setActiveTab("vertical")}
            className={`px-4 py-2 rounded-full font-semibold transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === "vertical"
                ? "bg-white text-[#1D1D1F] shadow-sm"
                : "text-[#86868B] hover:text-[#1D1D1F]"
            }`}>
            <VerticalIcon size={15} />
            <span>Mis Sistemas</span>
          </button>

          <button
            onClick={() => setActiveTab("billing")}
            className={`px-4 py-2 rounded-full font-semibold transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === "billing"
                ? "bg-white text-[#1D1D1F] shadow-sm"
                : "text-[#86868B] hover:text-[#1D1D1F]"
            }`}>
            <IconCard size={15} />
            <span>Facturación & Pagos</span>
          </button>

          {esDuenoAdmin && (
            <button
              onClick={() => setActiveTab("team")}
              className={`px-4 py-2 rounded-full font-semibold transition-colors cursor-pointer flex items-center gap-2 ${
                activeTab === "team"
                  ? "bg-white text-[#1D1D1F] shadow-sm"
                  : "text-[#86868B] hover:text-[#1D1D1F]"
              }`}>
              <IconUsers size={15} />
              <span>Equipo & Roles</span>
            </button>
          )}

          <button
            onClick={() => navigate("/onboarding")}
            title="Cambiar o explorar otras verticales de Aurora"
            className="px-3.5 py-2 rounded-full font-medium transition-colors text-[#86868B] hover:text-[#177E89] flex items-center gap-1.5 text-xs">
            <IconCustomize size={14} />
            <span>Cambiar Rubro</span>
          </button>
        </nav>

        {/* Derecha: Botón Directo a la vertical + Estado + Salir */}
        <div className="flex items-center gap-2.5 whitespace-nowrap">
          {/* Botón Destacado: Entrar a la app de la vertical activa */}
          {esVerticalReal && (
            <button
              onClick={() => navigate(rutaVertical)}
              className="bg-[#177E89] text-white text-xs font-semibold px-4 py-2 rounded-full flex items-center gap-2 hover:bg-[#136570] transition-colors cursor-pointer"
              title={`Abrir ${vertical.name}`}
            >
              <span>Entrar a {vertical.name} →</span>
            </button>
          )}

          {/* Badge de Licencia compacto en 1 línea */}
          <div className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${
            isTrial
              ? "bg-[#F5F5F7] border-[#E5E5EA] text-[#1D1D1F]"
              : "bg-[#177E89]/10 border-[#177E89]/30 text-[#177E89]"
          }`}>
            <span className={`w-2 h-2 rounded-full ${isTrial ? "bg-[#86868B]" : "bg-[#177E89]"}`} />
            <span>{isTrial ? `Trial (${daysLeft}d)` : "Plan Activo"}</span>
          </div>

          <button
            onClick={logout}
            className="bg-[#F5F5F7] hover:bg-[#E5E5EA] border border-[#E5E5EA] text-xs font-semibold px-3.5 py-2 rounded-full text-[#1D1D1F] hover:text-red-600 transition-colors cursor-pointer"
            title="Cerrar sesión de Aurora"
          >
            Salir
          </button>
        </div>
      </header>

      {/* ── CONTENIDO PRINCIPAL ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 space-y-8">

        {/* BARRA DE RECORDATORIO DE TRIAL / PAGO */}
        {isTrial && (
          <div className="bg-white border border-[#E5E5EA] rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#177E89]/10 text-[#177E89] flex items-center justify-center flex-shrink-0">
                <IconHourglass size={20} />
              </div>
              <div>
                <h4 className="font-bold text-[#1D1D1F] text-sm">
                  Estás disfrutando de tu prueba gratuita de {vertical.name}
                </h4>
                <p className="text-[#86868B] text-xs mt-0.5">
                  Te quedan <strong className="text-[#177E89] font-bold">{daysLeft} días</strong> de acceso completo. Tus datos e historias clínicas se guardan permanentemente.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPaymentModal(true)}
                className="bg-[#177E89] text-white text-xs font-semibold px-5 py-2.5 rounded-full cursor-pointer hover:bg-[#136570] transition-colors">
                Activar Plan Pro ($35/mes) →
              </button>
            </div>
          </div>
        )}

        {/* ── PESTAÑA 1: LAUNCHER & ENTORNO DE LA VERTICAL (MEDICLINIC PRO) ── */}
        {activeTab === "vertical" && (
          <div className="space-y-8">

            {/* HERO LAUNCHER CARD */}
            <div className="relative bg-white rounded-3xl p-6 sm:p-9 overflow-hidden shadow-sm border border-[#E5E5EA]">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                {/* Lado Izquierdo: Presentación y Botones Principales */}
                <div className="lg:col-span-7 space-y-5 text-left">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#177E89]/10 border border-[#177E89]/30 text-xs font-semibold text-[#177E89] tracking-wider uppercase">
                    <span>{vertical.badge}</span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-bold text-[#1D1D1F] leading-tight tracking-tight">
                    {vertical.name} — Centro de Operaciones
                  </h2>

                  <p className="text-[#6E6E73] text-sm sm:text-base leading-relaxed max-w-2xl font-normal">
                    {vertical.desc}{" "}
                    {userIndustry === "restaurante"
                      ? "Gestiona mesas, comandas y cocina en tiempo real desde un solo lugar."
                      : "Administra consultas médicas, historias clínicas, agenda de especialistas, sala de espera reactiva y cotizaciones multi-moneda en tiempo real."}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      onClick={() => navigate(rutaVertical)}
                      className="btn-deep-black text-xs sm:text-sm font-semibold px-7 py-3.5 rounded-full flex items-center gap-2.5 cursor-pointer">
                      <IconRocket size={17} />
                      <span>Entrar a {vertical.name} (Cloud Web)</span>
                      <span className="text-base">→</span>
                    </button>

                    <a
                      href="https://github.com"
                      target="_blank"
                      rel="noreferrer"
                      className="bg-[#F5F5F7] hover:bg-[#E5E5EA] border border-[#E5E5EA] text-xs sm:text-sm font-semibold px-5 py-3.5 rounded-full flex items-center gap-2 text-[#1D1D1F] cursor-pointer transition-colors">
                      <IconDownload size={15} />
                      <span>Descargar para Windows (.exe)</span>
                    </a>

                    <button
                      onClick={() => alert("Tu API Token de Licencia: AURORA-MED-PRO-9842-SECURE")}
                      className="bg-[#F5F5F7] hover:bg-[#E5E5EA] border border-[#E5E5EA] text-xs font-mono px-4 py-3.5 rounded-full text-[#86868B] hover:text-[#1D1D1F] cursor-pointer flex items-center gap-2 transition-colors">
                      <IconKey size={14} />
                      <span>Clave de Licencia</span>
                    </button>
                  </div>
                </div>

                {/* Lado Derecho: Métricas Reales en Grid 2x2 */}
                <div className="lg:col-span-5 grid grid-cols-2 gap-3.5">
                  {(metricasEnVivo || vertical.stats).map((s) => (
                    <div key={s.label} className="bg-[#F5F5F7] rounded-2xl p-4 sm:p-5 text-left border border-[#E5E5EA]">
                      <div className="text-[#86868B] text-[11px] font-medium leading-tight">{s.label}</div>
                      <div className={`font-bold text-2xl sm:text-3xl mt-1.5 ${s.color}`}>{s.val}</div>
                      <div className="text-[10px] text-[#86868B] mt-1">{s.change}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── MÓDULOS DE TU EMPRESA / ECOSISTEMA AURORA ── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-[#1D1D1F] flex items-center gap-2">
                    <span>Módulos de tu Empresa</span>
                    <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#177E89]/10 text-[#177E89] border border-[#177E89]/30 font-semibold">
                      Multi-Tenant Cloud
                    </span>
                  </h3>
                  <p className="text-[#86868B] text-xs mt-0.5">
                    Acceso directo a los módulos operativos y administrativos habilitados para tu negocio.
                  </p>
                </div>
              </div>

              <div className={`grid grid-cols-1 md:grid-cols-3 ${user?.rol === "DUENO_ADMIN" ? "lg:grid-cols-4" : ""} gap-5`}>
                {/* 1. Módulo Operativo Principal (Vertical Activa) */}
                <div
                  onClick={() => navigate(rutaVertical)}
                  className="bg-white rounded-2xl p-6 border border-[#E5E5EA] hover:border-[#D1D1D6] transition-colors group cursor-pointer shadow-sm flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-[#177E89]/10 text-[#177E89] flex items-center justify-center border border-[#177E89]/20 group-hover:scale-110 transition-transform">
                        <VerticalIcon size={24} />
                      </div>
                      <span className="text-[10px] font-semibold font-mono tracking-wider px-2.5 py-1 rounded-full bg-[#177E89]/10 text-[#177E89] border border-[#177E89]/30 uppercase">
                        Vertical Activa
                      </span>
                    </div>

                    <div>
                      <h4 className="text-lg font-bold text-[#1D1D1F] group-hover:text-[#177E89] transition-colors">
                        {vertical.name}
                      </h4>
                      <p className="text-[#86868B] text-xs mt-1 leading-relaxed line-clamp-2">
                        {vertical.desc}
                      </p>
                    </div>
                  </div>

                  <div className="pt-5 mt-4 border-t border-[#E5E5EA] flex items-center justify-between text-xs font-semibold text-[#177E89]">
                    <span>Entrar al Sistema</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>

                {/* 2. Centro Financiero & Control Contable */}
                <div
                  onClick={() => navigate("/finanzas")}
                  className="bg-white rounded-2xl p-6 border border-[#E5E5EA] hover:border-[#D1D1D6] transition-colors group cursor-pointer shadow-sm flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-[#177E89]/10 text-[#177E89] flex items-center justify-center border border-[#177E89]/20 group-hover:scale-110 transition-transform">
                        <IconBank size={24} />
                      </div>
                      <span className="text-[10px] font-semibold font-mono tracking-wider px-2.5 py-1 rounded-full bg-[#177E89]/10 text-[#177E89] border border-[#177E89]/30 uppercase">
                        Finanzas & Control
                      </span>
                    </div>

                    <div>
                      <h4 className="text-lg font-bold text-[#1D1D1F] group-hover:text-[#177E89] transition-colors">
                        Aurora Finanzas
                      </h4>
                      <p className="text-[#86868B] text-xs mt-1 leading-relaxed line-clamp-2">
                        Consolidación de ventas, margen bruto, costeo operativo, cobertura y comprobantes no fiscales.
                      </p>
                    </div>
                  </div>

                  <div className="pt-5 mt-4 border-t border-[#E5E5EA] flex items-center justify-between text-xs font-semibold text-[#177E89]">
                    <span>Abrir Centro Financiero</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>

                {/* 3. Gestión de Personal & Nómina */}
                <div
                  onClick={() => navigate("/personal")}
                  className="bg-white rounded-2xl p-6 border border-[#E5E5EA] hover:border-[#D1D1D6] transition-colors group cursor-pointer shadow-sm flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-[#177E89]/10 text-[#177E89] flex items-center justify-center border border-[#177E89]/20 group-hover:scale-110 transition-transform">
                        <IconUsers size={24} />
                      </div>
                      <span className="text-[10px] font-semibold font-mono tracking-wider px-2.5 py-1 rounded-full bg-[#177E89]/10 text-[#177E89] border border-[#177E89]/30 uppercase">
                        Talento & Nómina
                      </span>
                    </div>

                    <div>
                      <h4 className="text-lg font-bold text-[#1D1D1F] group-hover:text-[#177E89] transition-colors">
                        Gestión de Personal
                      </h4>
                      <p className="text-[#86868B] text-xs mt-1 leading-relaxed line-clamp-2">
                        Control de turnos, asistencias biométricas, comisiones por venta y liquidación periódica.
                      </p>
                    </div>
                  </div>

                  <div className="pt-5 mt-4 border-t border-[#E5E5EA] flex items-center justify-between text-xs font-semibold text-[#177E89]">
                    <span>Abrir Gestión de Personal</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>

                {/* 4. Auditoría — solo el Dueño/Administrador la ve */}
                {user?.rol === "DUENO_ADMIN" && (
                  <div
                    onClick={() => navigate("/auditoria")}
                    className="bg-white rounded-2xl p-6 border border-[#E5E5EA] hover:border-[#D1D1D6] transition-colors group cursor-pointer shadow-sm flex flex-col justify-between relative overflow-hidden"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-[#177E89]/10 text-[#177E89] flex items-center justify-center border border-[#177E89]/20 group-hover:scale-110 transition-transform">
                          <IconShield size={24} />
                        </div>
                        <span className="text-[10px] font-semibold font-mono tracking-wider px-2.5 py-1 rounded-full bg-[#177E89]/10 text-[#177E89] border border-[#177E89]/30 uppercase">
                          Solo Dueño/Admin
                        </span>
                      </div>

                      <div>
                        <h4 className="text-lg font-bold text-[#1D1D1F] group-hover:text-[#177E89] transition-colors">
                          Auditoría
                        </h4>
                        <p className="text-[#86868B] text-xs mt-1 leading-relaxed line-clamp-2">
                          Quién creó, editó o eliminó cada registro sensible en tu negocio, con fecha y usuario.
                        </p>
                      </div>
                    </div>

                    <div className="pt-5 mt-4 border-t border-[#E5E5EA] flex items-center justify-between text-xs font-semibold text-[#177E89]">
                      <span>Abrir Auditoría</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SIMULADOR EN VIVO / WORKSPACE INTEGRADO */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E5E5EA] shadow-sm space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E5E5EA]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#177E89]/10 text-[#177E89] flex items-center justify-center">
                    <VerticalIcon size={20} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-bold text-[#1D1D1F]">
                      {userIndustry === "restaurante" ? "Espacio Gastronómico & POS en Vivo" :
                       userIndustry === "farmacia" ? "Espacio de Farmacia & Droguería en Vivo" :
                       esRubroComercio ? "Espacio de Comercio en Vivo" :
                       userIndustry === "finca" || userIndustry === "ganaderia" ? "Espacio Agropecuario & Ganadería en Vivo" :
                       userIndustry === "veterinaria" ? "Espacio Veterinario & Mascotas en Vivo" :
                       "Espacio de Trabajo Clínico en Vivo"}
                    </h3>
                    <p className="text-[#86868B] text-xs">
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
                <div className="bg-[#F5F5F7] border border-[#E5E5EA] rounded-full p-1.5 flex items-center gap-1 text-xs">
                  <button
                    onClick={() => setWorkspaceTab("kpis")}
                    className={`px-3.5 py-1.5 rounded-full font-semibold transition-colors ${
                      workspaceTab === "kpis" ? "bg-white text-[#1D1D1F] shadow-sm" : "text-[#86868B] hover:text-[#1D1D1F]"
                    }`}>
                    Panel General
                  </button>
                  <button
                    onClick={() => setWorkspaceTab("patients")}
                    className={`px-3.5 py-1.5 rounded-full font-semibold transition-colors ${
                      workspaceTab === "patients" ? "bg-white text-[#1D1D1F] shadow-sm" : "text-[#86868B] hover:text-[#1D1D1F]"
                    }`}>
                    {userIndustry === "finca" || userIndustry === "ganaderia" ? "Hato & Animales" :
                     userIndustry === "restaurante" ? "Mesas & Comandas" :
                     esRubroComercio || userIndustry === "farmacia" ? "Kárdex & Stock" :
                     userIndustry === "veterinaria" ? "Expedientes Mascotas" :
                     "Expedientes & Triaje"}
                  </button>
                  <button
                    onClick={() => setWorkspaceTab("agenda")}
                    className={`px-3.5 py-1.5 rounded-full font-semibold transition-colors ${
                      workspaceTab === "agenda" ? "bg-white text-[#1D1D1F] shadow-sm" : "text-[#86868B] hover:text-[#1D1D1F]"
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
                    <h4 className="font-bold text-sm text-[#1D1D1F]">
                      {userIndustry === "finca" || userIndustry === "ganaderia" ? "Inventario Reciente de Animales en el Hato" :
                       userIndustry === "restaurante" ? "Mesas y Comandas en el Salón" :
                       esRubroComercio || userIndustry === "farmacia" ? "Artículos en Catálogo & Kárdex" :
                       userIndustry === "veterinaria" ? "Expedientes Veterinarios & Pacientes" :
                       "Lista de Pacientes en Consulta / Triaje"}
                    </h4>
                    <button
                      onClick={() => navigate(rutaVertical)}
                      className="bg-[#177E89] text-white text-xs font-semibold px-4 py-2 rounded-full cursor-pointer hover:bg-[#136570] transition-colors">
                      {userIndustry === "finca" || userIndustry === "ganaderia" ? "+ Registrar Animal" :
                       userIndustry === "restaurante" ? "+ Abrir Mesa" :
                       esRubroComercio || userIndustry === "farmacia" ? "+ Nuevo Artículo" :
                       "+ Ingresar Paciente"}
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-[#E5E5EA]">
                    <table className="w-full text-left text-xs">
                      {userIndustry === "finca" || userIndustry === "ganaderia" ? (
                        <>
                          <thead className="bg-[#F5F5F7] text-[#86868B] border-b border-[#E5E5EA]">
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
                          <tbody className="divide-y divide-[#E5E5EA]">
                            {animalesGanaderia === null ? (
                              <tr><td colSpan={7} className="p-4 text-center text-[#86868B]">Cargando datos del hato…</td></tr>
                            ) : animalesGanaderia.length === 0 ? (
                              <tr><td colSpan={7} className="p-4 text-center text-[#86868B]">Sin animales registrados aún. Entra a Ganadería para registrar tu primer lote.</td></tr>
                            ) : (
                              animalesGanaderia.slice(0, 8).map((a) => (
                                <tr key={a.id} className="hover:bg-[#F5F5F7] transition-colors">
                                  <td className="p-3.5 font-bold font-mono text-[#177E89]">{a.arete}</td>
                                  <td className="p-3.5 font-bold text-[#1D1D1F]">{a.nombre || "—"}</td>
                                  <td className="p-3.5 text-[#6E6E73]">{a.raza || a.especie || "Bovino"}</td>
                                  <td className="p-3.5 text-[#1D1D1F]">{a.tipoAnimal || "VACA"} · {a.sexo}</td>
                                  <td className="p-3.5 text-[#86868B] font-mono">{a.pesoActual ? `${a.pesoActual} kg` : "—"}</td>
                                  <td className="p-3.5">
                                    <span className="px-2.5 py-1 rounded-full bg-[#177E89]/10 border border-[#177E89]/20 text-[#177E89] font-semibold text-[10px]">
                                      {a.estado || "ACTIVO"}
                                    </span>
                                  </td>
                                  <td className="p-3.5 text-right">
                                    <button
                                      onClick={() => navigate(rutaVertical)}
                                      className="text-[#177E89] font-semibold hover:underline cursor-pointer">
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
                          <thead className="bg-[#F5F5F7] text-[#86868B] border-b border-[#E5E5EA]">
                            <tr>
                              <th className="p-3.5">SKU / Código</th>
                              <th className="p-3.5">Descripción</th>
                              <th className="p-3.5">Stock Actual</th>
                              <th className="p-3.5">Unidad</th>
                              <th className="p-3.5">Precio Venta</th>
                              <th className="p-3.5 text-right">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E5EA]">
                            {repuestosReales === null ? (
                              <tr><td colSpan={6} className="p-4 text-center text-[#86868B]">Cargando catálogo…</td></tr>
                            ) : repuestosReales.length === 0 ? (
                              <tr><td colSpan={6} className="p-4 text-center text-[#86868B]">Sin artículos registrados aún en inventario.</td></tr>
                            ) : (
                              repuestosReales.slice(0, 8).map((r) => (
                                <tr key={r.id} className="hover:bg-[#F5F5F7] transition-colors">
                                  <td className="p-3.5 font-bold font-mono text-[#177E89]">{r.codigoSku}</td>
                                  <td className="p-3.5 font-bold text-[#1D1D1F]">{r.descripcion}</td>
                                  <td className="p-3.5 text-[#1D1D1F] font-mono">{r.stockActual}</td>
                                  <td className="p-3.5 text-[#86868B]">{r.unidadBase || "UNIDAD"}</td>
                                  <td className="p-3.5 font-bold text-[#177E89]">${Number(r.precioVenta || 0).toFixed(2)}</td>
                                  <td className="p-3.5 text-right">
                                    <button
                                      onClick={() => navigate(rutaVertical)}
                                      className="text-[#177E89] font-semibold hover:underline cursor-pointer">
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
                          <thead className="bg-[#F5F5F7] text-[#86868B] border-b border-[#E5E5EA]">
                            <tr>
                              <th className="p-3.5">Mesa</th>
                              <th className="p-3.5">Zona / Capacidad</th>
                              <th className="p-3.5">Estado</th>
                              <th className="p-3.5">Comanda Abierta</th>
                              <th className="p-3.5">Consumo</th>
                              <th className="p-3.5 text-right">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E5EA]">
                            {mapaReales === null ? (
                              <tr><td colSpan={6} className="p-4 text-center text-[#86868B]">Cargando salón…</td></tr>
                            ) : mapaReales.length === 0 ? (
                              <tr><td colSpan={6} className="p-4 text-center text-[#86868B]">Sin mesas configuradas en el salón aún.</td></tr>
                            ) : (
                              mapaReales.slice(0, 8).map((m) => (
                                <tr key={m.mesa.id} className="hover:bg-[#F5F5F7] transition-colors">
                                  <td className="p-3.5 font-bold text-[#1D1D1F]">Mesa #{m.mesa.numero}</td>
                                  <td className="p-3.5 text-[#86868B]">{m.mesa.zona || "Principal"} · {m.mesa.capacidad || 4}p</td>
                                  <td className="p-3.5">
                                    <span className={`px-2.5 py-1 rounded-full font-semibold text-[10px] ${
                                      m.estado === "OCUPADA"
                                        ? "bg-[#F5F5F7] border border-[#E5E5EA] text-[#1D1D1F]"
                                        : "bg-[#177E89]/10 border border-[#177E89]/20 text-[#177E89]"
                                    }`}>
                                      {m.estado}
                                    </span>
                                  </td>
                                  <td className="p-3.5 text-[#1D1D1F]">{m.comandaAbierta ? `Comanda #${m.comandaAbierta.id} (${m.comandaAbierta.mesero})` : "Sin comanda"}</td>
                                  <td className="p-3.5 font-bold text-[#177E89]">{m.comandaAbierta ? `$${Number(m.comandaAbierta.totalConsumo || 0).toFixed(2)}` : "—"}</td>
                                  <td className="p-3.5 text-right">
                                    <button
                                      onClick={() => navigate(rutaVertical)}
                                      className="text-[#177E89] font-semibold hover:underline cursor-pointer">
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
                          <thead className="bg-[#F5F5F7] text-[#86868B] border-b border-[#E5E5EA]">
                            <tr>
                              <th className="p-3.5">Paciente</th>
                              <th className="p-3.5">Edad / Info</th>
                              <th className="p-3.5">Motivo de Consulta</th>
                              <th className="p-3.5">Hora</th>
                              <th className="p-3.5">Estado</th>
                              <th className="p-3.5 text-right">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E5EA]">
                            {citasReales === null ? (
                              <tr><td colSpan={6} className="p-4 text-center text-[#86868B]">Cargando…</td></tr>
                            ) : citasReales.length === 0 ? (
                              <tr><td colSpan={6} className="p-4 text-center text-[#86868B]">No hay citas registradas hoy.</td></tr>
                            ) : (
                              citasReales.map((c) => (
                                <tr key={c.id} className="hover:bg-[#F5F5F7] transition-colors">
                                  <td className="p-3.5 font-bold text-[#1D1D1F]">{c.paciente?.nombreCompleto || "—"}</td>
                                  <td className="p-3.5 text-[#86868B]">{c.paciente?.edad ? `${c.paciente.edad} años` : "—"}</td>
                                  <td className="p-3.5 text-[#1D1D1F]">{c.motivo || c.especialidad || "—"}</td>
                                  <td className="p-3.5 text-[#86868B] font-mono">{c.horaInicio}</td>
                                  <td className="p-3.5">
                                    <span className="px-2.5 py-1 rounded-full bg-[#177E89]/10 border border-[#177E89]/20 text-[#177E89] font-semibold text-[10px]">
                                      {c.estado}
                                    </span>
                                  </td>
                                  <td className="p-3.5 text-right">
                                    <button
                                      onClick={() => alert(`Abriendo historia clínica de ${c.paciente?.nombreCompleto}`)}
                                      className="text-[#177E89] font-semibold hover:underline cursor-pointer">
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
                        <div key={i} className="bg-white rounded-2xl p-4 border border-[#E5E5EA] text-left space-y-2 shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-[#177E89] text-xs font-mono font-bold">{item.tag}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#177E89]/10 text-[#177E89]">Pendiente</span>
                          </div>
                          <div className="font-bold text-sm text-[#1D1D1F]">{item.titulo}</div>
                          <p className="text-[#86868B] text-xs">{item.sub}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-[#86868B] text-sm col-span-3 text-center py-6">
                        No hay tareas sanitarias ni partos próximos programados para hoy en el hato.
                      </p>
                    )
                  ) : (userIndustry === "clinica" || userIndustry === "veterinaria" || userIndustry === "odontologia") ? (
                    citasReales === null ? (
                      <p className="text-[#86868B] text-sm col-span-3 text-center py-4">Cargando…</p>
                    ) : citasReales.length === 0 ? (
                      <p className="text-[#86868B] text-sm col-span-3 text-center py-4">No hay citas agendadas para hoy.</p>
                    ) : (
                      citasReales.map((c) => (
                        <div key={c.id} className="bg-white rounded-2xl p-4 border border-[#E5E5EA] text-left space-y-2 shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-[#177E89] text-xs font-mono font-bold">{c.horaInicio} — {c.horaFin}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#177E89]/10 text-[#177E89]">{c.estado}</span>
                          </div>
                          <div className="font-bold text-sm text-[#1D1D1F]">{c.paciente?.nombreCompleto} — {c.especialidad || c.motivo}</div>
                          <p className="text-[#86868B] text-xs">{c.motivo}</p>
                        </div>
                      ))
                    )
                  ) : (
                    <p className="text-[#86868B] text-sm col-span-3 text-center py-6">
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
                      className="bg-white rounded-2xl p-5 text-left cursor-pointer border border-[#E5E5EA] hover:border-[#D1D1D6] shadow-sm transition-colors space-y-2">
                      <div className="text-[#177E89]"><ActIcon size={22} /></div>
                      <h4 className="font-bold text-[#1D1D1F] text-sm">{act.label}</h4>
                      <p className="text-[#86868B] text-xs leading-relaxed">{act.desc}</p>
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
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E5E5EA] shadow-sm space-y-6 text-left">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#E5E5EA]">
                <div>
                  <h3 className="text-2xl font-bold text-[#1D1D1F]">
                    Centro de Suscripción & Pagos
                  </h3>
                  <p className="text-[#86868B] text-sm mt-1">
                    Gestiona tu plan activo, métodos de pago autorizados y reporte de comprobantes.
                  </p>
                </div>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="bg-[#177E89] text-white text-xs font-semibold px-6 py-3 rounded-full cursor-pointer hover:bg-[#136570] transition-colors flex items-center gap-2">
                  <IconCard size={14} />
                  <span>Reportar Nuevo Pago</span>
                </button>
              </div>

              {/* Tarjetas de Estado del Plan */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-[#F5F5F7] rounded-2xl p-5 border border-[#E5E5EA] space-y-2">
                  <div className="text-xs font-semibold text-[#177E89] uppercase tracking-wider">Plan Actual</div>
                  <div className="text-2xl font-bold text-[#1D1D1F]">
                    {user?.plan || "Estándar"} ($35/mes)
                  </div>
                  <p className="text-xs text-[#86868B]">
                    Módulos ilimitados para tu clínica + versión móvil.
                  </p>
                </div>

                <div className="bg-[#F5F5F7] rounded-2xl p-5 border border-[#E5E5EA] space-y-2">
                  <div className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">Próxima Fecha de Corte</div>
                  <div className="text-2xl font-bold text-[#1D1D1F]">
                    25 Septiembre 2026
                  </div>
                  <p className="text-xs text-[#86868B]">
                    Recordatorio automático por WhatsApp 5 días antes.
                  </p>
                </div>

                <div className="bg-[#F5F5F7] rounded-2xl p-5 border border-[#E5E5EA] space-y-2">
                  <div className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">Métodos Disponibles</div>
                  <div className="text-sm font-semibold text-[#1D1D1F]">
                    Pago Móvil · Binance · Zelle · Tarjeta
                  </div>
                  <p className="text-xs text-[#86868B]">
                    Tasa oficial BCV para pagos en bolívares.
                  </p>
                </div>
              </div>

              {/* Historial de Pagos y Facturas */}
              <div className="space-y-4 pt-4">
                <h4 className="font-bold text-base text-[#1D1D1F]">
                  Historial de Pagos & Recibos
                </h4>

                <div className="overflow-x-auto rounded-2xl border border-[#E5E5EA]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F5F5F7] text-[#86868B] border-b border-[#E5E5EA]">
                      <tr>
                        <th className="p-3.5">ID Recibo</th>
                        <th className="p-3.5">Fecha</th>
                        <th className="p-3.5">Monto</th>
                        <th className="p-3.5">Método / Referencia</th>
                        <th className="p-3.5">Estado</th>
                        <th className="p-3.5 text-right">Comprobante</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5EA]">
                      {(user?.payments && user.payments.length > 0) ? (
                        user.payments.map((p) => (
                          <tr key={p.id}>
                            <td className="p-3.5 font-mono font-bold text-[#1D1D1F]">{p.id}</td>
                            <td className="p-3.5 text-[#86868B]">{p.fecha}</td>
                            <td className="p-3.5 font-bold text-[#177E89]">{p.monto}</td>
                            <td className="p-3.5 text-[#1D1D1F]">{p.metodo} · Ref: {p.referencia}</td>
                            <td className="p-3.5">
                              <span className="px-2 py-0.5 rounded-full bg-[#177E89]/10 text-[#177E89] font-semibold text-[10px]">
                                {p.estado.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <button
                                onClick={() => alert(`Descargando factura en PDF del pago ${p.id}`)}
                                className="text-[#177E89] font-semibold hover:underline cursor-pointer inline-flex items-center gap-1">
                                <IconFileText size={12} /> Descargar PDF
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-[#86868B]">
                            Sin pagos ni recibos registrados aún en esta cuenta. Usa &ldquo;Reportar Nuevo Pago&rdquo; para registrar tu comprobante.
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
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E5E5EA] shadow-sm space-y-6 text-left">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#E5E5EA]">
              <div>
                <h3 className="text-2xl font-bold text-[#1D1D1F]">
                  Equipo de Trabajo & Accesos
                </h3>
                <p className="text-[#86868B] text-sm mt-1">
                  Crea un usuario y contraseña por cada colaborador, con su propio rol. Solo tú, como Dueño/Administrador, ves esta pantalla y la Auditoría.
                </p>
              </div>
              <button
                onClick={() => setModalNuevoColaborador(true)}
                className="bg-[#177E89] text-white text-xs font-semibold px-6 py-3 rounded-full cursor-pointer hover:bg-[#136570] transition-colors">
                + Nuevo Colaborador
              </button>
            </div>

            {errorEquipo && (
              <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{errorEquipo}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#F5F5F7] rounded-2xl p-5 border border-[#E5E5EA] space-y-2">
                <div className="text-[#177E89]"><IconUser size={26} /></div>
                <div className="font-bold text-base text-[#1D1D1F]">
                  {user?.nombre || "Usuario Administrador"}
                </div>
                <div className="text-xs font-semibold text-[#177E89]">
                  {ROL_LABEL[user?.rol || ""] || user?.rol || "Propietario / Admin"}
                </div>
                <div className="text-xs text-[#86868B] font-mono">
                  {user?.email || "admin@auroraplus.com"}
                </div>
                <span className="inline-block text-[9px] font-semibold uppercase tracking-wider bg-[#177E89]/10 text-[#177E89] px-2 py-0.5 rounded-full">
                  Tú (Dueño/Administrador)
                </span>
              </div>

              {cargandoEquipo ? (
                <div className="bg-[#F5F5F7] rounded-2xl p-6 border border-[#E5E5EA] flex items-center justify-center col-span-1 md:col-span-2 text-xs text-[#86868B]">
                  Cargando equipo…
                </div>
              ) : colaboradores.length === 0 ? (
                <div className="bg-[#F5F5F7] rounded-2xl p-6 border border-dashed border-[#D1D1D6] flex flex-col justify-center items-center text-center col-span-1 md:col-span-2 space-y-2">
                  <p className="text-[#86868B] text-xs max-w-sm">
                    Sin colaboradores adicionales registrados aún. Crea uno con usuario, contraseña y rol (encargado de almacén, cajero, veterinario, etc. según tu vertical).
                  </p>
                </div>
              ) : (
                <div className="col-span-1 md:col-span-2 space-y-2">
                  {colaboradores.map((u) => (
                    <div key={u.id} className="bg-[#F5F5F7] rounded-2xl p-4 border border-[#E5E5EA] flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#1D1D1F] truncate">
                            {u.nombreCompleto || u.username}
                          </span>
                          {!u.activo && (
                            <span className="text-[9px] font-semibold uppercase tracking-wider bg-[#E5E5EA] text-[#86868B] px-2 py-0.5 rounded-full shrink-0">
                              Desactivado
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#86868B] font-mono">@{u.username}</div>
                        <div className="text-[11px] font-semibold text-[#177E89]">{ROL_LABEL[u.rol] || u.rol}</div>
                      </div>
                      {u.activo && (
                        <button
                          onClick={() => desactivarColaborador(u.id)}
                          className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer transition-colors shrink-0"
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
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 cursor-pointer" onClick={() => setModalNuevoColaborador(false)}>
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-sm border border-[#E5E5EA] cursor-default text-left" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E5EA]">
                <h3 className="text-lg font-bold text-[#1D1D1F]">Nuevo Colaborador</h3>
                <button onClick={() => setModalNuevoColaborador(false)} className="text-[#86868B] hover:text-[#1D1D1F] cursor-pointer">
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
                  <label className="text-xs font-semibold text-[#86868B] block mb-1">Nombre completo</label>
                  <input name="nombreCompleto" className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E5EA] text-[#1D1D1F]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#86868B] block mb-1">Usuario (para iniciar sesión)</label>
                  <input required name="username" className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E5EA] text-[#1D1D1F] font-mono" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#86868B] block mb-1">Contraseña</label>
                  <input required name="password" type="password" minLength={6} className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E5EA] text-[#1D1D1F] font-mono" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#86868B] block mb-1">Rol</label>
                  <select required name="rol" defaultValue="" className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E5EA] text-[#1D1D1F]">
                    <option value="" disabled>Selecciona un rol…</option>
                    {Object.entries(ROL_LABEL).filter(([id]) => id !== "DUENO_ADMIN").map(([id, label]) => (
                      <option key={id} value={id}>{label}</option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-[#86868B]">
                  Este colaborador no tendrá acceso a Equipo & Roles ni a Auditoría — eso queda reservado al Dueño/Administrador.
                </p>
                <div className="pt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setModalNuevoColaborador(false)} className="px-4 py-2 rounded-full bg-[#F5F5F7] hover:bg-[#E5E5EA] border border-[#E5E5EA] text-xs font-semibold text-[#1D1D1F] cursor-pointer transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={guardandoColaborador} className="px-5 py-2 rounded-full bg-[#177E89] text-white text-xs font-semibold cursor-pointer hover:bg-[#136570] transition-colors disabled:opacity-60">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-lg w-full border border-[#E5E5EA] shadow-sm relative text-left space-y-5">

            <div className="flex items-center justify-between pb-4 border-b border-[#E5E5EA]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#177E89]/10 text-[#177E89] flex items-center justify-center">
                  <IconCard size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1D1D1F]">
                    Pagar Suscripción Aurora Plus
                  </h3>
                  <p className="text-[#86868B] text-xs">
                    Activación automática para {vertical.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="w-8 h-8 rounded-full bg-[#F5F5F7] text-[#1D1D1F] flex items-center justify-center cursor-pointer hover:bg-[#E5E5EA] transition-colors">
                <IconClose size={14} />
              </button>
            </div>

            {paymentSuccessMsg ? (
              <div className="p-6 text-center space-y-3">
                <div className="flex justify-center text-[#177E89]"><IconCheckCircle size={40} /></div>
                <h4 className="font-bold text-lg text-[#177E89]">{paymentSuccessMsg}</h4>
              </div>
            ) : (
              <form onSubmit={handleReportPaymentSubmit} className="space-y-4">

                {/* Datos bancarios oficiales para transferir */}
                <div className="p-4 rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA] text-xs space-y-2.5">
                  <div className="font-bold text-[#177E89] font-sans text-xs flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <IconBank size={14} /> Cuentas Oficiales para Transferir:
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-[#177E89]/10 text-[#177E89] px-2 py-0.5 rounded-full">
                      Tasa BCV Oficial: {tasaBcv.toFixed(2)} Bs/$
                    </span>
                  </div>

                  {/* Pago Movil Banesco */}
                  <div className="p-3 rounded-xl bg-white border border-[#E5E5EA] space-y-1.5 font-mono text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="font-sans font-bold text-[#1D1D1F] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#177E89]"></span>
                        Pago Movil {cuentasCobro.banco || "Banesco (0134)"}
                      </span>
                      <button
                        type="button"
                        onClick={() => copiarTexto(`${cuentasCobro.telefono} ${cuentasCobro.cedula}`, "todo")}
                        className="text-[10px] text-[#177E89] font-bold hover:underline cursor-pointer font-sans"
                      >
                        {copiadoCampo === "todo" ? "Copiado!" : "Copiar Datos"}
                      </button>
                    </div>

                    <div className="text-[#1D1D1F] space-y-0.5">
                      <div className="flex justify-between items-center">
                        <span>Telefono: <strong>{cuentasCobro.telefono}</strong></span>
                        <button
                          type="button"
                          onClick={() => copiarTexto(cuentasCobro.telefono, "tel")}
                          className="text-[9px] text-[#86868B] hover:text-[#177E89] cursor-pointer"
                        >
                          {copiadoCampo === "tel" ? "OK" : "Copiar"}
                        </button>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Cedula / RIF: <strong>{cuentasCobro.cedula}</strong></span>
                        <button
                          type="button"
                          onClick={() => copiarTexto(cuentasCobro.cedula, "ci")}
                          className="text-[9px] text-[#86868B] hover:text-[#177E89] cursor-pointer"
                        >
                          {copiadoCampo === "ci" ? "OK" : "Copiar"}
                        </button>
                      </div>
                      {cuentasCobro.titular && (
                        <div className="text-[10px] text-[#86868B]">
                          Titular: {cuentasCobro.titular}
                        </div>
                      )}
                    </div>

                    {/* Total equivalente en Bs */}
                    <div className="pt-1.5 border-t border-[#E5E5EA] flex items-center justify-between text-[11px] font-sans">
                      <span className="text-[#86868B]">Monto exacto a transferir:</span>
                      <span className="font-mono font-bold text-[#177E89] text-xs">
                        Bs. {((parseFloat(paymentForm.monto.replace(/[^0-9.]/g, "")) || 35.0) * tasaBcv).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Binance USDT si existe */}
                  {cuentasCobro.binanceUsdt && (
                    <div className="p-2 rounded-xl bg-white border border-[#E5E5EA] flex items-center justify-between text-[11px]">
                      <span className="font-mono truncate mr-2">Binance USDT: {cuentasCobro.binanceUsdt}</span>
                      <button
                        type="button"
                        onClick={() => copiarTexto(cuentasCobro.binanceUsdt, "binance")}
                        className="text-[10px] text-[#177E89] font-bold hover:underline cursor-pointer flex-shrink-0"
                      >
                        {copiadoCampo === "binance" ? "Copiado!" : "Copiar"}
                      </button>
                    </div>
                  )}

                  {/* Zelle si existe */}
                  {cuentasCobro.zelle && (
                    <div className="p-2 rounded-xl bg-white border border-[#E5E5EA] flex items-center justify-between text-[11px]">
                      <span className="font-mono truncate mr-2">Zelle: {cuentasCobro.zelle}</span>
                      <button
                        type="button"
                        onClick={() => copiarTexto(cuentasCobro.zelle, "zelle")}
                        className="text-[10px] text-[#177E89] font-bold hover:underline cursor-pointer flex-shrink-0"
                      >
                        {copiadoCampo === "zelle" ? "Copiado!" : "Copiar"}
                      </button>
                    </div>
                  )}

                  {cuentasCobro.instrucciones && (
                    <p className="text-[10px] text-[#86868B] italic font-sans pt-0.5">
                      {cuentasCobro.instrucciones}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1D1D1F] mb-1">
                    Metodo de Pago Utilizado
                  </label>
                  <select
                    value={paymentForm.metodo}
                    onChange={(e) => setPaymentForm({ ...paymentForm, metodo: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E5E5EA] bg-white text-xs font-medium text-[#1D1D1F]">
                    <option value="Pago Móvil (Bolívares - Tasa BCV)">Pago Móvil (Bolívares - Tasa BCV)</option>
                    <option value="Transferencia Bancaria Nacional (Banesco/Mercantil)">Transferencia Bancaria Nacional</option>
                    <option value="Binance Pay / USDT">Binance Pay / USDT</option>
                    <option value="Zelle">Zelle</option>
                    <option value="Tarjeta de Crédito / Débito Internacional">Tarjeta Internacional</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1D1D1F] mb-1">
                      Monto a Reportar
                    </label>
                    <input
                      type="text"
                      value={paymentForm.monto}
                      onChange={(e) => setPaymentForm({ ...paymentForm, monto: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#E5E5EA] bg-white text-xs text-[#1D1D1F] font-mono"
                      placeholder="$35.00 USD"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1D1D1F] mb-1">
                      Número de Referencia
                    </label>
                    <input
                      type="text"
                      required
                      value={paymentForm.referencia}
                      onChange={(e) => setPaymentForm({ ...paymentForm, referencia: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#E5E5EA] bg-white text-xs text-[#1D1D1F] font-mono"
                      placeholder="Ej. 984021"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="bg-[#F5F5F7] hover:bg-[#E5E5EA] border border-[#E5E5EA] text-xs font-semibold px-4 py-2.5 rounded-full text-[#1D1D1F] cursor-pointer transition-colors">
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-[#177E89] text-white text-xs font-semibold px-6 py-2.5 rounded-full cursor-pointer hover:bg-[#136570] transition-colors">
                    Confirmar y Activar Plan →
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* ── BOTÓN FLOTANTE DE SOPORTE WHATSAPP ── */}
      <TenantSoporteWidget />

    </div>
  );
}
