import { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import AuroraLogo from "../AuroraLogo";
import SpecularButton from "../components/SpecularButton";
import {
  AuroraGradientDef, IconClinic, IconVet, IconTooth, IconHardware, IconRestaurant, IconFarm,
  IconEducation, IconConstruction, IconWarning, IconClose, IconCheck, IconLock,
  IconCard, IconBank, IconPrescription,
} from "../Icons";
import { useAuth } from "../context/AuthContext";

const METODOS_PAGO = [
  { id: "PAGO_MOVIL", label: "Pago Móvil (Bolívares, tasa BCV)" },
  { id: "ZELLE", label: "Zelle" },
  { id: "BINANCE", label: "Binance Pay / USDT" },
  { id: "TRANSFERENCIA", label: "Transferencia Bancaria Nacional" },
];

interface IndustryItem {
  id: string;
  label: string;
  Icon: (props: { size?: number }) => React.ReactNode;
  desc: string;
  badge: string;
  isReady: boolean;
  tagline?: string;
}

const INDUSTRIES: IndustryItem[] = [
  {
    id: "restaurante",
    label: "Restaurante & Gastronomía",
    Icon: IconRestaurant,
    desc: "Mapa de mesas, comandas digitales, cocina en tiempo real y escandallo de recetas",
    badge: "100% DISPONIBLE (Listo)",
    isReady: true,
    tagline: "Vertical Insignia: Aurora Horeca",
  },
  {
    id: "farmacia",
    label: "Farmacia & Droguería",
    Icon: IconPrescription,
    desc: "Dispensación de medicamentos, control de lotes, alertas de vencimiento y POS mostrador",
    badge: "En Construcción (Próximamente)",
    isReady: false,
  },
  {
    id: "comercio",
    label: "Comercio",
    Icon: IconHardware,
    desc: "POS mostrador con código de barras, inventario en tiempo real, compras a proveedores y cuentas por cobrar",
    badge: "100% DISPONIBLE (Listo)",
    isReady: true,
    tagline: "Vertical Insignia: Aurora Comercio",
  },
  {
    id: "clinica",
    label: "Clínica & Salud",
    Icon: IconClinic,
    desc: "Historias clínicas, triaje, agenda médica y facturación",
    badge: "100% DISPONIBLE (Listo)",
    isReady: true,
    tagline: "Vertical Insignia: Mediclinic Pro",
  },
  {
    id: "veterinaria",
    label: "Veterinaria & Mascotas",
    Icon: IconVet,
    desc: "Consultas, vacunas, hospitalización y control de peso",
    badge: "En Construcción (Próximamente)",
    isReady: false,
  },
  {
    id: "odontologia",
    label: "Odontología",
    Icon: IconTooth,
    desc: "Historia clínica, agenda, odontograma FDI y facturación para consultorios dentales",
    badge: "100% DISPONIBLE (Listo)",
    isReady: true,
    tagline: "Vertical: Mediclinic Odonto",
  },
  {
    id: "finca",
    label: "Control de Fincas & Ganado",
    Icon: IconFarm,
    desc: "Lotes de ganado, pesaje, potreros y vacunación",
    badge: "100% DISPONIBLE (Listo)",
    isReady: true,
    tagline: "Vertical Insignia: Aurora Ganadería",
  },
  {
    id: "educacion",
    label: "Educación & Colegios",
    Icon: IconEducation,
    desc: "Matrículas, calificaciones, boletines y pagos",
    badge: "Próximamente (Fase 2)",
    isReady: false,
  },
  {
    id: "construccion",
    label: "Construcción & Obras",
    Icon: IconConstruction,
    desc: "Presupuestos por partidas (COVENIN/APU), valuaciones de avance, cómputos métricos y cotizaciones en PDF",
    badge: "En Construcción (Próximamente)",
    isReady: false,
    tagline: "Vertical en Desarrollo: Aurora Obras & Construcción Civil Pro",
  },
];

const CLINIC_MODULES = [
  { id: "expedientes", label: "Historia Clínica Digital & Triaje", desc: "Antecedentes, diagnósticos CIE-10 y prescripción electrónica", defaultOn: true },
  { id: "agenda", label: "Agenda de Citas & Especialistas", desc: "Turnos por consultorio, sala de espera reactiva y recordatorios", defaultOn: true },
  { id: "farmacia", label: "Farmacia & Control de Insumos", desc: "Dispensación de medicamentos, stock mínimo y alertas", defaultOn: true },
  { id: "factura", label: "Facturación & Cierres Multi-Moneda", desc: "Cobros en USD/VES a tasa oficial BCV, recibos y caja diaria", defaultOn: true },
  { id: "reportes", label: "Generador de Informes Médicos PDF", desc: "Descarga de reportes clínicos con membrete y firma digital", defaultOn: true },
];

const PHARMACY_MODULES = [
  { id: "dispensacion", label: "Dispensación & Venta Mostrador", desc: "Cobro rápido de fármacos con o sin récipe médico", defaultOn: true },
  { id: "lotes", label: "Control de Lotes & Vencimientos", desc: "Trazabilidad por lote y alertas automáticas de caducidad", defaultOn: true },
  { id: "stock", label: "Stock Mínimo & Reposición", desc: "Alertas de reorden y pedidos automáticos a droguerías", defaultOn: true },
  { id: "caja", label: "Caja Multi-Moneda (USD / Bs / COP)", desc: "Cobros en efectivo, punto de venta y pago móvil a tasa del día", defaultOn: true },
  { id: "proveedores", label: "Proveedores & Facturas de Compra", desc: "Recepción de mercancía y cuentas por pagar", defaultOn: true },
];

const HARDWARE_MODULES = [
  { id: "pos", label: "Punto de Venta Mostrador (POS)", desc: "Búsqueda rápida de códigos, tornillos y materiales", defaultOn: true },
  { id: "kardex", label: "Kardex Multi-Unidad & Stock", desc: "Metros, kilos, bultos y unidades sueltas con costo promedio", defaultOn: true },
  { id: "cotizaciones", label: "Cotizaciones & Presupuestos", desc: "Generación de proformas con vigencia temporal", defaultOn: true },
  { id: "creditos", label: "Cuentas por Cobrar & Créditos", desc: "Gestión de clientes de confianza y límites de saldo", defaultOn: true },
  { id: "compras", label: "Órdenes de Compra & Proveedores", desc: "Control de insumos de construcción y repuestos", defaultOn: true },
];

const RESTAURANT_MODULES = [
  // Salón/Mesas y Cocina (KDS) ya están activos en producción para el piloto
  // (ver PLAN_ACTUAL="PRO" en RestauranteApp.tsx, que los deja visibles para
  // todos los tenants) — este onboarding había quedado desactualizado
  // marcándolos "Próximamente" cuando el tenant nuevo sí los encuentra
  // disponibles al entrar.
  { id: "salon", label: "Salón & Mapa de Mesas", desc: "Abrir comandas por mesa, delivery propio o recoger en tienda", defaultOn: true },
  { id: "cocina", label: "Cocina en Tiempo Real (KDS)", desc: "Tablero por estación: pendiente, preparando, listo", defaultOn: true },
  { id: "recetas", label: "Recetas & Escandallo de Costos", desc: "Costeo por ingrediente y margen real por plato", defaultOn: true },
  { id: "fastbar", label: "Fast-Bar", desc: "Venta rápida de tragos por botella/mililitraje", defaultOn: true },
  { id: "compras", label: "Compras, Proveedores & Vencimientos", desc: "Registro de facturas de insumos con alertas de caducidad", defaultOn: true },
];

// Ferretería/Farmacia/Repuestos/Retail comparten el mismo motor (Aurora
// Retail) y por lo tanto el mismo set de módulos — lo que las distingue no
// es un módulo opcional más, es comportamiento automático de la vertical
// (FEFO en Farmacia, catálogo de cruce en Repuestos, fraccionado en
// Ferretería), no algo que el dueño prenda/apague acá.
const RETAIL_MODULES = [
  { id: "pos", label: "Punto de Venta & Código de Barras", desc: "Venta de mostrador rápida, escaneo de productos y cobro multi-moneda", defaultOn: true },
  { id: "inventario", label: "Inventario & Kárdex", desc: "Stock por artículo, lotes y alertas de reposición", defaultOn: true },
  { id: "compras", label: "Compras & Proveedores", desc: "Registro de facturas de proveedor y control de pagos", defaultOn: true },
  { id: "clientes", label: "Clientes & Créditos", desc: "Ficha de cliente y ventas fiadas (cuentas por cobrar)", defaultOn: true },
  { id: "caja", label: "Caja & Moneda Base", desc: "Ingresos, gastos y tasas de cambio del negocio", defaultOn: true },
];

const CONSTRUCTION_MODULES = [
  { id: "partidas", label: "Presupuestos por Partidas (COVENIN / APU)", desc: "Capítulos, partidas normalizadas, cómputos métricos y análisis de costos", defaultOn: true },
  { id: "valuaciones", label: "Valuaciones de Obra & Avance Físico", desc: "Medición en campo, amortización de anticipos y retenciones de ley", defaultOn: true },
  { id: "cotizaciones_pdf", label: "Generador de Cotizaciones en PDF", desc: "Presupuestos formales de ingeniería con membrete, indirectos, utilidad y firmas", defaultOn: true },
  { id: "insumos_cuadrillas", label: "Insumos, Maquinaria & Cuadrillas", desc: "Control de compras de materiales, equipos pesados y personal obrero", defaultOn: true },
  { id: "bitacora", label: "Bitácora & Libro Diario de Obra", desc: "Registro diario de campo, condiciones climáticas y reporte de novedades", defaultOn: true },
];

const GANADERIA_MODULES = [
  { id: "hato", label: "Registro de Hato & Aretes", desc: "Ficha por animal: raza, peso, categoría y trazabilidad", defaultOn: true },
  { id: "potreros", label: "Potreros & Rotación de Pastoreo", desc: "Mapa satelital de potreros, capacidad y descanso mínimo", defaultOn: true },
  { id: "ordeno", label: "Ordeño & Producción de Leche", desc: "Registro diario por vaca, jornadas en lote y modo vaquera rápida", defaultOn: true },
  { id: "sanidad", label: "Sanidad & Vacunación", desc: "Esquema de vacunas, tratamientos y responsable veterinario", defaultOn: true },
  { id: "reproduccion", label: "Reproducción & Genética", desc: "Servicios, preñez, partos y control de sementales", defaultOn: true },
  { id: "ventas", label: "Ventas & Guías de Traslado", desc: "Venta de animales y documentación de movilización", defaultOn: true },
];

// Mapa de "clinica"/"restaurante"/etc. (id del onboarding) al moduloPrincipal
// real que entiende el backend (ver TenantProvisioningService y
// LicenciaService.VERTICALES_CONTROLADAS). "comercio" es el nombre unificado
// para tenants nuevos (Ferretería/Repuestos/Retail bajo una sola identidad) en
// la UI (`industria`/user.industry) — pero el moduloPrincipal que se contrata
// en el backend sigue siendo "repuestos", porque LicenciaInterceptor gatea
// /api/repuestos/* por ese segmento exacto de URL (ver LicenciaInterceptor):
// si se contratara "comercio" en vez de "repuestos", el tenant quedaría con
// 403 en todo el inventario/POS. "ferreteria"/"retail" se mantienen solo para
// no romper tenants ya registrados con esos valores.
const INDUSTRIA_A_MODULO: Record<string, string> = {
  clinica: "salud",
  farmacia: "farmacia",
  restaurante: "horeca",
  comercio: "repuestos",
  ferreteria: "ferreteria",
  repuestos: "repuestos",
  retail: "repuestos",
  veterinaria: "salud",
  odontologia: "odontologia",
  finca: "ganaderia",
  construccion: "construccion",
  otro: "horeca",
};

const MODULOS_POR_INDUSTRIA: Record<string, typeof CLINIC_MODULES> = {
  clinica: CLINIC_MODULES,
  farmacia: PHARMACY_MODULES,
  restaurante: RESTAURANT_MODULES,
  comercio: RETAIL_MODULES,
  ferreteria: RETAIL_MODULES,
  repuestos: RETAIL_MODULES,
  retail: RETAIL_MODULES,
  veterinaria: CLINIC_MODULES,
  odontologia: CLINIC_MODULES,
  finca: GANADERIA_MODULES,
  construccion: CONSTRUCTION_MODULES,
  otro: RESTAURANT_MODULES,
};

const NOMBRE_POR_DEFECTO: Record<string, string> = {
  clinica: "Mi Consultorio Médico",
  farmacia: "Mi Farmacia",
  restaurante: "Mi Restaurante",
  comercio: "Mi Negocio",
  ferreteria: "Mi Ferretería",
  repuestos: "Mi Casa de Repuestos",
  retail: "Mi Tienda",
  veterinaria: "Mi Veterinaria",
  odontologia: "Mi Consultorio Dental",
  finca: "Mi Finca",
  construccion: "Constructora & Proyectos Civiles",
  otro: "Mi Negocio",
};

const VERTICAL_LABEL: Record<string, string> = {
  clinica: "Mediclinic Pro (Clínica & Salud)",
  farmacia: "Aurora Retail (Farmacia & Droguería)",
  restaurante: "Aurora Horeca (Restaurante & Gastronomía)",
  comercio: "Aurora Comercio (Ferretería, Repuestos & Tiendas)",
  ferreteria: "Aurora Comercio (Ferretería, Repuestos & Tiendas)",
  repuestos: "Aurora Comercio (Ferretería, Repuestos & Tiendas)",
  retail: "Aurora Comercio (Ferretería, Repuestos & Tiendas)",
  veterinaria: "Mediclinic Vet",
  odontologia: "Mediclinic Odonto",
  finca: "Aurora Ganadería (Control de Fincas & Ganado)",
  otro: "Aurora Suite Comercial",
};

export default function Onboarding() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, completeOnboarding, completarRegistro } = useAuth();

  // Datos básicos recogidos en Auth.tsx (registro) — si no hay sesión activa
  // ni datos pendientes de un registro recién iniciado, no hay nada que
  // configurar aquí todavía.
  const pendingSignup = location.state as { nombre: string; email: string; password: string; empresa?: string; industry?: string } | undefined;

  const initialIndustry = pendingSignup?.industry || user?.industry || "restaurante";
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedIndustry, setSelectedIndustry] = useState<string>(initialIndustry);
  const [empresaNombre, setEmpresaNombre] = useState<string>(
    pendingSignup?.empresa || user?.empresa || NOMBRE_POR_DEFECTO[initialIndustry] || "Mi Negocio"
  );
  const [modules, setModules] = useState<string[]>(
    (MODULOS_POR_INDUSTRIA[initialIndustry] || RESTAURANT_MODULES).map((m) => m.id)
  );
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);
  const [metodoPago, setMetodoPago] = useState<string>(METODOS_PAGO[0].id);
  const [activando, setActivando] = useState(false);
  const [errorActivacion, setErrorActivacion] = useState<string | null>(null);

  const modulosDisponibles = MODULOS_POR_INDUSTRIA[selectedIndustry] || CLINIC_MODULES;
  const esRetail = ["comercio", "ferreteria", "farmacia", "repuestos", "retail"].includes(selectedIndustry);
  const esGanaderia = selectedIndustry === "finca";

  const handleSelectIndustry = (ind: IndustryItem) => {
    if (!ind.isReady) {
      setLockedNotice(
        `El rubro "${ind.label}" está en fase de desarrollo. Las verticales listas y operativas hoy son Mediclinic Pro (Clínica & Salud, incluye Mediclinic Vet), Aurora Horeca (Restaurante & Gastronomía), Aurora Comercio (Ferretería, Farmacia y Repuestos) y Aurora Ganadería (Control de Fincas & Ganado).`
      );
      return;
    }
    setLockedNotice(null);
    setSelectedIndustry(ind.id);
    setModules((MODULOS_POR_INDUSTRIA[ind.id] || CLINIC_MODULES).filter((m: any) => m.disponible !== false).map((m) => m.id));
    if (!user?.empresa) {
      setEmpresaNombre(NOMBRE_POR_DEFECTO[ind.id] || NOMBRE_POR_DEFECTO.restaurante);
    }
  };

  const toggleModule = (id: string) => {
    setModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleActivate = async () => {
    setErrorActivacion(null);
    setActivando(true);
    const nombrePorDefecto = NOMBRE_POR_DEFECTO[selectedIndustry] || NOMBRE_POR_DEFECTO.restaurante;
    const modulosPorDefecto = modulosDisponibles.map((m) => m.id);
    const rutaDestino =
      selectedIndustry === "restaurante"
        ? "/restaurante"
        : selectedIndustry === "construccion"
        ? "/construccion"
        : selectedIndustry === "veterinaria"
        ? "/veterinaria"
        : selectedIndustry === "clinica" || selectedIndustry === "farmacia" || selectedIndustry === "odontologia"
        ? "/mediclinic"
        : "/dashboard";

    try {
      if (pendingSignup) {
        // Registro real de un negocio nuevo — DEBE crear el tenant de verdad en el backend. Si
        // falla (email duplicado, backend caído, validación), el error se muestra tal cual: antes
        // esto se "resolvía" fingiendo éxito y entrando de todos modos sin que existiera ninguna
        // cuenta real, lo cual dejaba a la persona pensando que se registró cuando no pasó nada.
        await completarRegistro({
          nombreEmpresa: empresaNombre.trim() || nombrePorDefecto,
          moduloPrincipal: INDUSTRIA_A_MODULO[selectedIndustry] || "horeca",
          industria: selectedIndustry,
          emailContacto: pendingSignup.email,
          username: pendingSignup.email,
          password: pendingSignup.password,
          modules: modules.length > 0 ? modules : modulosPorDefecto,
          metodoPagoPreferido: METODOS_PAGO.find((m) => m.id === metodoPago)?.label,
        });
      } else {
        // Usuario ya existente reconfigurando su rubro/módulos (ej. "Cambiar Rubro") — esto no crea
        // ninguna cuenta nueva, solo actualiza preferencias del usuario ya autenticado.
        completeOnboarding({
          industry: selectedIndustry,
          empresa: empresaNombre.trim() || nombrePorDefecto,
          modules: modules.length > 0 ? modules : modulosPorDefecto,
          hasCompletedOnboarding: true,
        });
      }
      navigate(rutaDestino);
    } catch (err) {
      setErrorActivacion(err instanceof Error ? err.message : "No se pudo completar el registro. Intenta de nuevo.");
    } finally {
      setActivando(false);
    }
  };


  if (!user && !pendingSignup) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] flex flex-col items-center justify-center px-4 py-12 antialiased">
      <AuroraGradientDef />

      <div className="relative z-10 w-full max-w-3xl">
        {/* Cabecera superior con Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="p-2.5 rounded-2xl bg-white border border-[#E5E5EA] shadow-sm mb-3">
            <AuroraLogo size={42} animated />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1D1D1F]">
            Configuración del Ecosistema Aurora Plus
          </h1>
          <p className="text-[#86868B] text-xs mt-1 tracking-wider uppercase">
            Paso {step} de 4 · Selección de Rubro & Arquitectura
          </p>
        </div>

        {/* Barra de progreso de pasos */}
        <div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
          {[
            { num: 1, label: "1. Elegir Rubro" },
            { num: 2, label: "2. Módulos Activos" },
            { num: 3, label: "3. Método de Pago" },
            { num: 4, label: "4. Activación" },
          ].map((s) => (
            <div
              key={s.num}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                s.num === step
                  ? "btn-deep-black font-semibold"
                  : s.num < step
                  ? "bg-[#177E89]/10 text-[#177E89] border border-[#177E89]/30"
                  : "bg-white text-[#86868B] border border-[#E5E5EA]"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${s.num === step ? "bg-[#5BC0BE]" : s.num < step ? "bg-[#177E89]" : "bg-[#D1D1D6]"}`} />
              {s.label}
            </div>
          ))}
        </div>

        {/* Tarjeta Principal */}
        <div className="bg-white rounded-3xl p-6 sm:p-9 shadow-sm border border-[#E5E5EA] relative overflow-hidden">

          {/* ════════════ PASO 1: SELECCIONAR RUBRO / INDUSTRIA ════════════ */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <div className="inline-block px-3 py-1 rounded-full bg-[#177E89]/10 border border-[#177E89]/30 text-[#177E89] text-[11px] font-semibold uppercase tracking-wider mb-2">
                  Selección de Sector Comercial
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1D1D1F] leading-tight">
                  ¿A qué rubro se dedica tu negocio?
                </h2>
                <p className="text-[#6E6E73] text-sm mt-1">
                  Actualmente <strong className="text-[#177E89]">Mediclinic Pro</strong>, <strong className="text-[#177E89]">Aurora Horeca</strong>, <strong className="text-[#177E89]">Aurora Retail</strong> (Ferretería, Farmacia y Repuestos) y <strong className="text-[#177E89]">Aurora Ganadería</strong> están 100% habilitadas y listas para operar. Las demás verticales se encuentran en proceso de despliegue.
                </p>
              </div>

              {/* Banner de aviso si hizo clic en un rubro con candado */}
              {lockedNotice && (
                <div className="rounded-2xl p-4 border border-[#E5E5EA] bg-[#F5F5F7] text-[#1D1D1F] text-xs sm:text-sm flex items-start gap-3 shadow-sm">
                  <span className="text-[#177E89]"><IconWarning size={20} /></span>
                  <div className="flex-1">
                    <p className="font-semibold text-[#1D1D1F] mb-1">Módulo en Desarrollo</p>
                    <p className="text-[#6E6E73] leading-relaxed">{lockedNotice}</p>
                    <div className="flex flex-wrap gap-2 mt-2.5">
                      <button
                        type="button"
                        onClick={() => { handleSelectIndustry(INDUSTRIES.find((i) => i.id === "clinica")!); }}
                        className="px-3 py-1.5 rounded-full bg-[#F5F5F7] hover:bg-[#E5E5EA] border border-[#E5E5EA] text-[#1D1D1F] font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <IconClinic size={14} /> Seleccionar Mediclinic Pro
                      </button>
                      <button
                        type="button"
                        onClick={() => { handleSelectIndustry(INDUSTRIES.find((i) => i.id === "restaurante")!); }}
                        className="px-3 py-1.5 rounded-full bg-[#F5F5F7] hover:bg-[#E5E5EA] border border-[#E5E5EA] text-[#1D1D1F] font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <IconRestaurant size={14} /> Seleccionar Aurora Horeca
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => setLockedNotice(null)}
                    className="text-[#86868B] hover:text-[#1D1D1F] text-xs cursor-pointer"
                  >
                    <IconClose size={14} />
                  </button>
                </div>
              )}

              {/* Grid de rubros: primero los disponibles, luego los que vienen en camino */}
              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                <div>
                  <p className="text-[11px] font-semibold tracking-wider uppercase text-[#177E89] mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#177E89]" />
                    Disponibles ahora ({INDUSTRIES.filter((i) => i.isReady).length})
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {INDUSTRIES.filter((i) => i.isReady).map((ind) => {
                      const isSelected = selectedIndustry === ind.id;
                      return (
                        <button
                          key={ind.id}
                          type="button"
                          onClick={() => handleSelectIndustry(ind)}
                          className={`relative flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                            isSelected
                              ? "bg-[#177E89]/10 border-[#177E89]"
                              : "bg-white border-[#E5E5EA] hover:border-[#D1D1D6]"
                          }`}
                        >
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-white border border-[#E5E5EA] text-[#177E89]">
                            <ind.Icon size={17} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-xs leading-tight block text-[#1D1D1F]">
                              {ind.label}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold inline-block mt-1 bg-[#177E89]/10 text-[#177E89] border border-[#177E89]/20">
                              Listo para operar
                            </span>
                          </div>

                          <div
                            className={`flex-shrink-0 self-center w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                              isSelected
                                ? "bg-[#177E89] text-white"
                                : "border border-[#D1D1D6] text-transparent"
                            }`}
                          >
                            <IconCheck size={11} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-semibold tracking-wider uppercase text-[#86868B] mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D1D1D6]" />
                    En camino ({INDUSTRIES.filter((i) => !i.isReady).length})
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {INDUSTRIES.filter((i) => !i.isReady).map((ind) => (
                      <button
                        key={ind.id}
                        type="button"
                        onClick={() => handleSelectIndustry(ind)}
                        className="relative flex items-center gap-3 p-3 rounded-xl border text-left transition-colors bg-[#F5F5F7] border-[#E5E5EA] hover:border-[#D1D1D6]"
                      >
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-white border border-[#E5E5EA] text-[#86868B]">
                          <ind.Icon size={17} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-xs leading-tight block text-[#6E6E73]">
                            {ind.label}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold inline-block mt-1 bg-white text-[#86868B] border border-[#E5E5EA]">
                            {ind.badge}
                          </span>
                        </div>

                        <div className="flex-shrink-0 self-center w-5 h-5 rounded-full bg-white border border-[#E5E5EA] flex items-center justify-center text-[#86868B]">
                          <IconLock size={10} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Botón de continuar */}
              <div className="pt-2 flex items-center justify-between border-t border-[#E5E5EA]">
                <button
                  type="button"
                  onClick={() => navigate("/auth")}
                  className="text-[#86868B] hover:text-[#1D1D1F] text-xs transition-colors cursor-pointer"
                >
                  ← Volver a inicio de sesión
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!INDUSTRIES.find((i) => i.id === selectedIndustry)?.isReady}
                  className={`btn-deep-black font-semibold px-7 py-3 rounded-full text-sm flex items-center gap-2 cursor-pointer ${
                    INDUSTRIES.find((i) => i.id === selectedIndustry)?.isReady ? "" : "opacity-40 cursor-not-allowed"
                  }`}
                >
                  Continuar a Selección de Módulos →
                </button>
              </div>
            </div>
          )}

          {/* ════════════ PASO 2: SELECCIONAR MÓDULOS DE LA VERTICAL ════════════ */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <div className="inline-block px-3 py-1 rounded-full bg-[#177E89]/10 border border-[#177E89]/30 text-[#177E89] text-[11px] font-semibold uppercase tracking-wider mb-2">
                  Paso 2 · {selectedIndustry === "restaurante" ? "Arquitectura del Local" : esRetail ? "Arquitectura del Negocio" : esGanaderia ? "Arquitectura de la Finca" : "Arquitectura Médica"}
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1D1D1F] leading-tight">
                  {selectedIndustry === "restaurante" ? "Personaliza tu Restaurante" : esRetail ? "Personaliza tu Negocio" : esGanaderia ? "Personaliza tu Finca" : "Personaliza tu Consultorio"}
                </h2>
                <p className="text-[#6E6E73] text-sm mt-1">
                  {selectedIndustry === "restaurante"
                    ? "Indica el nombre de tu local y activa los módulos que utilizará tu equipo."
                    : esRetail
                    ? "Indica el nombre de tu negocio y activa los módulos que utilizará tu equipo."
                    : esGanaderia
                    ? "Indica el nombre de tu finca y activa los módulos que utilizará tu equipo de campo."
                    : "Indica el nombre de tu consultorio y activa los módulos que utilizarán tú y tu secretaria."}
                </p>
              </div>

              {/* Nombre del negocio */}
              <div>
                <label className="block text-[#86868B] text-[11px] font-medium uppercase tracking-wider mb-1.5">
                  {selectedIndustry === "restaurante" ? "Nombre del Restaurante / Local" : esRetail ? "Nombre del Negocio" : esGanaderia ? "Nombre de la Finca" : "Nombre de tu Consultorio (o tu nombre, Dr./Dra.)"}
                </label>
                <input
                  type="text"
                  placeholder={selectedIndustry === "restaurante" ? "Ej. Restaurante La Terraza" : esRetail ? "Ej. Ferretería El Tornillo Feliz" : esGanaderia ? "Ej. Finca Los Alpes" : "Ej. Consultorio Dr. Carlos Mendoza"}
                  value={empresaNombre}
                  onChange={(e) => setEmpresaNombre(e.target.value)}
                  className="w-full bg-white border border-[#E5E5EA] focus:border-[#177E89] rounded-xl px-4 py-3 text-sm text-[#1D1D1F] placeholder-[#86868B] focus:outline-none transition-colors"
                />
              </div>

              {/* Lista de módulos */}
              <div className="space-y-2.5">
                <label className="block text-[#86868B] text-[11px] font-medium uppercase tracking-wider">
                  Módulos de {VERTICAL_LABEL[selectedIndustry]?.split(" (")[0] || "la vertical"} habilitados ({modules.length}/{modulosDisponibles.length})
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  {modulosDisponibles.map((m: any) => {
                    const isChecked = modules.includes(m.id);
                    const disponible = m.disponible !== false;
                    if (!disponible) {
                      return (
                        <div key={m.id} title="Próximamente disponible" aria-disabled
                          className="flex items-center gap-3.5 p-3.5 rounded-2xl border text-left bg-[#F5F5F7] border-[#E5E5EA] text-[#86868B] cursor-not-allowed">
                          <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border border-[#E5E5EA] text-[#86868B]">
                            <IconLock size={11} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm flex items-center gap-2">
                              {m.label}
                              <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-white text-[#86868B] border border-[#E5E5EA]">Próximamente</span>
                            </div>
                            <div className="text-xs mt-0.5 text-[#86868B]">{m.desc}</div>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleModule(m.id)}
                        className={`flex items-center gap-3.5 p-3.5 rounded-2xl border text-left transition-colors ${
                          isChecked
                            ? "bg-[#177E89]/10 border-[#177E89]/40 text-[#1D1D1F]"
                            : "bg-white border-[#E5E5EA] text-[#6E6E73] hover:bg-[#F5F5F7]"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${
                            isChecked ? "bg-[#177E89] text-white" : "border border-[#D1D1D6]"
                          }`}
                        >
                          {isChecked && <IconCheck size={11} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">{m.label}</div>
                          <div className={`text-xs mt-0.5 ${isChecked ? "text-[#6E6E73]" : "text-[#86868B]"}`}>
                            {m.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Botones de navegación */}
              <div className="pt-2 flex items-center justify-between border-t border-[#E5E5EA]">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-[#86868B] hover:text-[#1D1D1F] text-xs transition-colors cursor-pointer"
                >
                  ← Cambiar de rubro
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={modules.length === 0}
                  className="btn-deep-black font-semibold px-7 py-3 rounded-full text-sm flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continuar a Método de Pago →
                </button>
              </div>
            </div>
          )}

          {/* ════════════ PASO 3: MÉTODO DE PAGO PARA LA PRUEBA GRATUITA ════════════ */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <div className="inline-block px-3 py-1 rounded-full bg-[#F5F5F7] border border-[#E5E5EA] text-[#6E6E73] text-[11px] font-semibold uppercase tracking-wider mb-2">
                  Paso 3 · Método de Pago
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1D1D1F] leading-tight">
                  ¿Cómo prefieres pagar cuando termine tu prueba?
                </h2>
                <p className="text-[#6E6E73] text-sm mt-1">
                  Tu prueba de <strong className="text-[#1D1D1F]">30 días es 100% gratis</strong> — no se te cobra nada ahora. Esto solo queda guardado como tu método preferido para cuando decidas continuar.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {METODOS_PAGO.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMetodoPago(m.id)}
                    className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-colors ${
                      metodoPago === m.id
                        ? "bg-[#177E89]/10 border-[#177E89]/40 text-[#1D1D1F]"
                        : "bg-white border-[#E5E5EA] text-[#6E6E73] hover:bg-[#F5F5F7]"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${metodoPago === m.id ? "bg-[#177E89]/15 text-[#177E89]" : "bg-[#F5F5F7] text-[#86868B]"}`}>
                      <IconCard size={16} />
                    </div>
                    <span className="font-semibold text-sm">{m.label}</span>
                    {metodoPago === m.id && <IconCheck size={14} />}
                  </button>
                ))}
              </div>

              <div className="p-4 rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA] flex items-start gap-3 text-xs text-[#6E6E73]">
                <IconBank size={16} />
                <p>Ningún cobro se procesa ahora. Cuando termine tu prueba, te avisamos y reportas tu pago por este método directamente desde el Hub.</p>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-[#E5E5EA]">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-[#86868B] hover:text-[#1D1D1F] text-xs transition-colors cursor-pointer"
                >
                  ← Volver a módulos
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="btn-deep-black font-semibold px-7 py-3 rounded-full text-sm flex items-center gap-2 cursor-pointer"
                >
                  Revisar y Activar Prueba →
                </button>
              </div>
            </div>
          )}

          {/* ════════════ PASO 4: RESUMEN Y ACTIVACIÓN ════════════ */}
          {step === 4 && (
            <div className="text-center space-y-6 py-2">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-2xl bg-[#177E89]/10 border border-[#177E89]/30 flex items-center justify-center text-[#177E89]">
                  {(() => { const Icon = INDUSTRIES.find((i) => i.id === selectedIndustry)?.Icon || IconClinic; return <Icon size={26} />; })()}
                </div>
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1D1D1F]">
                  {selectedIndustry === "restaurante" ? "¡Todo Listo para tu Restaurante!" : esRetail ? "¡Todo Listo para tu Negocio!" : esGanaderia ? "¡Todo Listo para tu Finca!" : "¡Todo Listo para tu Consultorio!"}
                </h2>
                <p className="text-[#6E6E73] text-sm mt-1 max-w-md mx-auto">
                  Tu entorno privado en <strong className="text-[#1D1D1F]">Aurora Hub</strong> ha sido preparado con la vertical{" "}
                  <strong className="text-[#177E89]">{VERTICAL_LABEL[selectedIndustry]?.split(" (")[0] || "Mediclinic Pro"}</strong>.
                </p>
              </div>

              {/* Resumen de configuración */}
              <div className="bg-[#F5F5F7] border border-[#E5E5EA] rounded-2xl p-5 text-left space-y-3.5 max-w-md mx-auto">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#86868B] uppercase tracking-wider">Organización:</span>
                  <span className="text-[#1D1D1F] font-bold">{empresaNombre || NOMBRE_POR_DEFECTO[selectedIndustry] || "Centro Médico Pro"}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#86868B] uppercase tracking-wider">Vertical:</span>
                  <span className="text-[#177E89] font-semibold flex items-center gap-1.5">
                    {(() => { const Icon = INDUSTRIES.find((i) => i.id === selectedIndustry)?.Icon || IconClinic; return <Icon size={13} />; })()} {VERTICAL_LABEL[selectedIndustry] || "Mediclinic Pro (Clínica & Salud)"}
                  </span>
                </div>
                <div className="flex items-start justify-between text-xs">
                  <span className="text-[#86868B] uppercase tracking-wider mt-0.5">Módulos:</span>
                  <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                    {modules.map((m) => (
                      <span
                        key={m}
                        className="bg-[#177E89]/10 border border-[#177E89]/30 text-[#177E89] text-[10px] px-2 py-0.5 rounded-full"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="h-px bg-[#E5E5EA]" />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#86868B] uppercase tracking-wider">Prueba Gratuita:</span>
                  <span className="text-[#177E89] font-bold">30 días de acceso completo</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#86868B] uppercase tracking-wider">Método de Pago:</span>
                  <span className="text-[#1D1D1F] font-semibold">{METODOS_PAGO.find((m) => m.id === metodoPago)?.label}</span>
                </div>
              </div>

              {errorActivacion && (
                <p className="text-red-600 text-xs max-w-md mx-auto">{errorActivacion}</p>
              )}

              <div className="space-y-3 max-w-md mx-auto">
                <SpecularButton
                  size="lg"
                  radius={999}
                  tint="#177E89"
                  tintOpacity={1}
                  textColor="#f5f5f5"
                  lineColor="#5BC0BE"
                  baseColor="#177E89"
                  shineSize={10}
                  shineFade={40}
                  intensity={1}
                  thickness={1}
                  proximity={280}
                  className="w-full"
                  onClick={handleActivate}
                  disabled={activando}
                >
                  {activando ? "Creando tu cuenta…" : `Entrar a ${VERTICAL_LABEL[selectedIndustry]?.split(" (")[0] || "Mediclinic Pro"} en Aurora Hub →`}
                </SpecularButton>
                <p className="text-[#86868B] text-xs">
                  Sin cobros obligatorios. Podrás gestionar pagos, planes y roles desde el Hub.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
