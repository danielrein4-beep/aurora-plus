import { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import AuroraLogo from "../AuroraLogo";
import {
  AuroraGradientDef, IconClinic, IconVet, IconHardware, IconRestaurant, IconFarm, IconMining,
  IconEducation, IconRetail, IconConstruction, IconCustomize, IconWarning, IconClose, IconCheck, IconLock,
  IconCard, IconBank, IconPrescription, IconFactory,
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
    badge: "100% DISPONIBLE (Listo)",
    isReady: true,
    tagline: "Vertical Insignia: Farmacia & Insumos",
  },
  {
    id: "ferreteria",
    label: "Ferretería & Materiales",
    Icon: IconHardware,
    desc: "Control de stock, POS mostrador, compras a proveedores y cuentas por cobrar",
    badge: "100% DISPONIBLE (Listo)",
    isReady: true,
    tagline: "Vertical Insignia: FerrePlus ERP",
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
    id: "retail",
    label: "Retail & Comercio",
    Icon: IconRetail,
    desc: "Punto de venta multi-caja, inventario en tiempo real y catálogo de productos",
    badge: "100% DISPONIBLE (Listo)",
    isReady: true,
    tagline: "Vertical Insignia: Retail POS",
  },
  {
    id: "veterinaria",
    label: "Veterinaria & Mascotas",
    Icon: IconVet,
    desc: "Consultas, vacunas, hospitalización y control de peso",
    badge: "100% DISPONIBLE (Listo)",
    isReady: true,
    tagline: "Vertical: Mediclinic Vet",
  },
  {
    id: "repuestos",
    label: "Repuestos Automotrices",
    Icon: IconFactory,
    desc: "POS mostrador con catálogo de cruce: código OEM y compatibilidad por vehículo",
    badge: "100% DISPONIBLE (Listo)",
    isReady: true,
    tagline: "Vertical Insignia: Aurora Retail",
  },
  {
    id: "finca",
    label: "Control de Fincas & Ganado",
    Icon: IconFarm,
    desc: "Lotes de ganado, pesaje, potreros y vacunación",
    badge: "Próximamente (Fase 2)",
    isReady: false,
  },
  {
    id: "mineria",
    label: "Minería & Maquinaria",
    Icon: IconMining,
    desc: "Control de horas máquina, turnos y seguridad industrial",
    badge: "Próximamente (Fase 2)",
    isReady: false,
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
    desc: "Avance de obra, presupuestos y compras de insumos",
    badge: "Próximamente (Fase 2)",
    isReady: false,
  },
  {
    id: "otro",
    label: "Otro Rubro Comercial",
    Icon: IconCustomize,
    desc: "Arquitectura modular para industrias a medida",
    badge: "Disponible",
    isReady: true,
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
  // Salón/Mesas y Cocina (KDS) todavía no están disponibles en producción
  // (ver PLAN_ACTUAL/premium en RestauranteApp.tsx — quedan en pausa
  // mientras el negocio se enfoca en Ventas/Inventario/Administración) —
  // ofrecerlos como si ya se pudieran activar acá sería prometer algo que
  // el tenant nuevo no va a encontrar disponible al entrar.
  { id: "salon", label: "Salón & Mapa de Mesas", desc: "Abrir comandas por mesa, delivery propio o recoger en tienda", defaultOn: true, disponible: false },
  { id: "cocina", label: "Cocina en Tiempo Real (KDS)", desc: "Tablero por estación: pendiente, preparando, listo", defaultOn: true, disponible: false },
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

// Mapa de "clinica"/"restaurante"/etc. (id del onboarding) al moduloPrincipal
// real que entiende el backend (ver TenantProvisioningService y
// LicenciaService.VERTICALES_CONTROLADAS — farmacia/ferreteria/repuestos ya
// están dadas de alta ahí con ese mismo nombre exacto; "retail" no existe
// como vertical propia en el backend y cae en "repuestos" como motor base).
const INDUSTRIA_A_MODULO: Record<string, string> = {
  clinica: "salud",
  farmacia: "farmacia",
  restaurante: "horeca",
  ferreteria: "ferreteria",
  repuestos: "repuestos",
  retail: "repuestos",
  veterinaria: "salud",
  otro: "horeca",
};

const MODULOS_POR_INDUSTRIA: Record<string, typeof CLINIC_MODULES> = {
  clinica: CLINIC_MODULES,
  farmacia: PHARMACY_MODULES,
  restaurante: RESTAURANT_MODULES,
  ferreteria: RETAIL_MODULES,
  repuestos: RETAIL_MODULES,
  retail: RETAIL_MODULES,
  veterinaria: CLINIC_MODULES,
  otro: RESTAURANT_MODULES,
};

const NOMBRE_POR_DEFECTO: Record<string, string> = {
  clinica: "Clínica & Consultorios Médicos",
  farmacia: "Mi Farmacia",
  restaurante: "Mi Restaurante",
  ferreteria: "Mi Ferretería",
  repuestos: "Mi Casa de Repuestos",
  retail: "Mi Tienda",
  veterinaria: "Mi Veterinaria",
  otro: "Mi Negocio",
};

const VERTICAL_LABEL: Record<string, string> = {
  clinica: "Mediclinic Pro (Clínica & Salud)",
  farmacia: "Aurora Retail (Farmacia & Droguería)",
  restaurante: "Aurora Horeca (Restaurante & Gastronomía)",
  ferreteria: "Aurora Retail (Ferretería & Materiales)",
  repuestos: "Aurora Retail (Repuestos Automotrices)",
  retail: "Retail POS (Comercio & Tiendas)",
  veterinaria: "Mediclinic Vet",
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
  const esRetail = ["ferreteria", "farmacia", "repuestos"].includes(selectedIndustry);

  const handleSelectIndustry = (ind: IndustryItem) => {
    if (!ind.isReady) {
      setLockedNotice(
        `El rubro "${ind.label}" está en fase de desarrollo. Las verticales listas y operativas hoy son Mediclinic Pro (Clínica & Salud, incluye Mediclinic Vet), Aurora Horeca (Restaurante & Gastronomía) y Aurora Retail (Ferretería, Farmacia y Repuestos).`
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
        : selectedIndustry === "clinica" || selectedIndustry === "farmacia" || selectedIndustry === "veterinaria"
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
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden transition-colors duration-300">
      <AuroraGradientDef />

      {/* ── FONDOS ATMOSFÉRICOS: AURORAS BOREALES EN MOVIMIENTO ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="aurora-ribbon-1 -top-32 -left-28 opacity-60" />
        <div className="aurora-ribbon-2 -bottom-20 -right-28 opacity-70" />
        <div className="cyber-grid absolute inset-0 opacity-20" />
        <div className="absolute w-[600px] h-[600px] rounded-full blur-[150px] bg-gradient-to-tr from-[#00f2fe]/15 via-[#7928ca]/20 to-[#ff007f]/15 -top-24" />
      </div>

      <div className="relative z-10 w-full max-w-3xl">
        {/* Cabecera superior con Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 shadow-inner mb-3">
            <AuroraLogo size={42} animated />
          </div>
          <h1 className="font-['Outfit'] font-black text-2xl sm:text-3xl text-white tracking-tight">
            Configuración del Ecosistema Aurora Plus
          </h1>
          <p className="text-white/40 text-xs mt-1 tracking-widest uppercase font-mono">
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
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                s.num === step
                  ? "bg-white text-black font-bold shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                  : s.num < step
                  ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                  : "bg-white/5 text-white/40 border border-white/5"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${s.num === step ? "bg-teal-500 animate-pulse" : s.num < step ? "bg-teal-400" : "bg-white/20"}`} />
              {s.label}
            </div>
          ))}
        </div>

        {/* Tarjeta Principal Liquid Glass */}
        <div className="apple-glass rounded-[32px] p-6 sm:p-9 shadow-[0_25px_70px_rgba(0,0,0,0.7)] border border-white/15 relative overflow-hidden">
          <div className="line-aurora absolute top-0 left-0 right-0" />

          {/* ════════════ PASO 1: SELECCIONAR RUBRO / INDUSTRIA ════════════ */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <div className="inline-block px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-[11px] font-mono uppercase tracking-wider mb-2">
                  Selección de Sector Comercial
                </div>
                <h2 className="font-['Outfit'] font-black text-2xl sm:text-3xl text-white leading-tight">
                  ¿A qué rubro se dedica tu negocio?
                </h2>
                <p className="text-white/50 text-sm mt-1">
                  Actualmente <strong className="text-teal-400">Mediclinic Pro</strong>, <strong className="text-teal-400">Aurora Horeca</strong> y <strong className="text-teal-400">Aurora Retail</strong> (Ferretería, Farmacia y Repuestos) están 100% habilitadas y listas para operar. Las demás verticales se encuentran en proceso de despliegue.
                </p>
              </div>

              {/* Banner de aviso si hizo clic en un rubro con candado */}
              {lockedNotice && (
                <div className="apple-glass rounded-2xl p-4 border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs sm:text-sm flex items-start gap-3 animate-fade-in shadow-lg">
                  <span className="text-amber-300"><IconWarning size={20} /></span>
                  <div className="flex-1">
                    <p className="font-semibold text-amber-300 mb-1">Módulo en Desarrollo</p>
                    <p className="text-white/80 leading-relaxed">{lockedNotice}</p>
                    <div className="flex flex-wrap gap-2 mt-2.5">
                      <button
                        type="button"
                        onClick={() => { handleSelectIndustry(INDUSTRIES.find((i) => i.id === "clinica")!); }}
                        className="px-3 py-1.5 rounded-lg bg-teal-500 text-black font-bold text-xs hover:bg-teal-400 transition-all flex items-center gap-1.5"
                      >
                        <IconClinic size={14} /> Seleccionar Mediclinic Pro
                      </button>
                      <button
                        type="button"
                        onClick={() => { handleSelectIndustry(INDUSTRIES.find((i) => i.id === "restaurante")!); }}
                        className="px-3 py-1.5 rounded-lg bg-teal-500 text-black font-bold text-xs hover:bg-teal-400 transition-all flex items-center gap-1.5"
                      >
                        <IconRestaurant size={14} /> Seleccionar Aurora Horeca
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => setLockedNotice(null)}
                    className="text-white/40 hover:text-white text-xs"
                  >
                    <IconClose size={14} />
                  </button>
                </div>
              )}

              {/* Grid de rubros con indicación clara de candado y disponibilidad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[380px] overflow-y-auto pr-1">
                {INDUSTRIES.map((ind) => {
                  const isSelected = selectedIndustry === ind.id;
                  return (
                    <button
                      key={ind.id}
                      type="button"
                      onClick={() => handleSelectIndustry(ind)}
                      className={`relative flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all duration-300 ${
                        ind.isReady
                          ? isSelected
                            ? "bg-gradient-to-r from-teal-500/20 via-cyan-500/15 to-purple-500/20 border-teal-400/80 shadow-[0_0_25px_rgba(0,242,254,0.3)] scale-[1.01]"
                            : "bg-teal-950/20 border-teal-500/30 hover:border-teal-400/60 hover:bg-teal-900/30 text-white"
                          : "bg-white/[0.02] border-white/10 opacity-60 hover:opacity-85 hover:border-white/20 cursor-pointer"
                      }`}
                    >
                      {/* Icono */}
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          ind.isReady
                            ? "bg-teal-400/15 border border-teal-400/30 shadow-inner text-teal-300"
                            : "bg-white/5 border border-white/10 text-white/50"
                        }`}
                      >
                        <ind.Icon size={16} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <span className={`font-bold text-xs leading-tight block ${ind.isReady ? "text-white" : "text-white/70"}`}>
                          {ind.label}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono font-semibold inline-block mt-0.5 ${
                            ind.isReady
                              ? "bg-teal-400/20 text-teal-300 border border-teal-400/40"
                              : "bg-white/10 text-white/40 border border-white/10"
                          }`}
                        >
                          {ind.badge}
                        </span>
                      </div>

                      {/* Check / Lock indicator */}
                      <div className="flex-shrink-0 self-center">
                        {ind.isReady ? (
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                              isSelected
                                ? "bg-teal-400 text-black shadow-[0_0_10px_#00f2fe]"
                                : "border border-teal-400/40 text-transparent"
                            }`}
                          >
                            <IconCheck size={11} />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
                            <IconLock size={10} />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Botón de continuar */}
              <div className="pt-2 flex items-center justify-between border-t border-white/10">
                <button
                  type="button"
                  onClick={() => navigate("/auth")}
                  className="text-white/40 hover:text-white text-xs transition-colors"
                >
                  ← Volver a inicio de sesión
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!INDUSTRIES.find((i) => i.id === selectedIndustry)?.isReady}
                  className={`btn-cyber-neon text-white font-bold px-7 py-3 rounded-full text-sm flex items-center gap-2 cursor-pointer ${
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
                <div className="inline-block px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-[11px] font-mono uppercase tracking-wider mb-2">
                  Paso 2 · {selectedIndustry === "restaurante" ? "Arquitectura del Local" : esRetail ? "Arquitectura del Negocio" : "Arquitectura Médica"}
                </div>
                <h2 className="font-['Outfit'] font-black text-2xl sm:text-3xl text-white leading-tight">
                  {selectedIndustry === "restaurante" ? "Personaliza tu Restaurante" : esRetail ? "Personaliza tu Negocio" : "Personaliza tu Clínica o Consultorio"}
                </h2>
                <p className="text-white/50 text-sm mt-1">
                  {selectedIndustry === "restaurante"
                    ? "Indica el nombre de tu local y activa los módulos que utilizará tu equipo."
                    : esRetail
                    ? "Indica el nombre de tu negocio y activa los módulos que utilizará tu equipo."
                    : "Indica el nombre de tu centro de salud y activa los módulos que utilizará tu equipo médico."}
                </p>
              </div>

              {/* Nombre del negocio */}
              <div>
                <label className="block text-white/50 text-[11px] font-medium uppercase tracking-wider mb-1.5">
                  {selectedIndustry === "restaurante" ? "Nombre del Restaurante / Local" : esRetail ? "Nombre del Negocio" : "Nombre de la Clínica / Consultorio / Doctor"}
                </label>
                <input
                  type="text"
                  placeholder={selectedIndustry === "restaurante" ? "Ej. Restaurante La Terraza" : esRetail ? "Ej. Ferretería El Tornillo Feliz" : "Ej. Centro Médico Especializado San Cristóbal"}
                  value={empresaNombre}
                  onChange={(e) => setEmpresaNombre(e.target.value)}
                  className="w-full bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 focus:border-teal-400/60 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none transition-all shadow-inner"
                />
              </div>

              {/* Lista de módulos */}
              <div className="space-y-2.5">
                <label className="block text-white/50 text-[11px] font-medium uppercase tracking-wider">
                  Módulos de {VERTICAL_LABEL[selectedIndustry]?.split(" (")[0] || "la vertical"} habilitados ({modules.length}/{modulosDisponibles.length})
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  {modulosDisponibles.map((m: any) => {
                    const isChecked = modules.includes(m.id);
                    const disponible = m.disponible !== false;
                    if (!disponible) {
                      return (
                        <div key={m.id} title="Próximamente disponible" aria-disabled
                          className="flex items-center gap-3.5 p-3.5 rounded-2xl border text-left bg-white/[0.02] border-white/10 text-white/30 cursor-not-allowed">
                          <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border border-white/10 text-white/30">
                            <IconLock size={11} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm flex items-center gap-2">
                              {m.label}
                              <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-white/10 text-white/40">Próximamente</span>
                            </div>
                            <div className="text-xs mt-0.5 text-white/25">{m.desc}</div>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleModule(m.id)}
                        className={`flex items-center gap-3.5 p-3.5 rounded-2xl border text-left transition-all ${
                          isChecked
                            ? "bg-teal-500/15 border-teal-500/40 text-white shadow-[0_0_15px_rgba(0,242,254,0.15)]"
                            : "bg-white/[0.03] border-white/10 text-white/50 hover:bg-white/[0.06] hover:text-white/70"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all ${
                            isChecked ? "bg-teal-400 text-black" : "border border-white/20"
                          }`}
                        >
                          {isChecked && <IconCheck size={11} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">{m.label}</div>
                          <div className={`text-xs mt-0.5 ${isChecked ? "text-white/60" : "text-white/30"}`}>
                            {m.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Botones de navegación */}
              <div className="pt-2 flex items-center justify-between border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-white/40 hover:text-white text-xs transition-colors"
                >
                  ← Cambiar de rubro
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={modules.length === 0}
                  className="btn-cyber-neon text-white font-bold px-7 py-3 rounded-full text-sm flex items-center gap-2 cursor-pointer"
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
                <div className="inline-block px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-[11px] font-mono uppercase tracking-wider mb-2">
                  Paso 3 · Método de Pago
                </div>
                <h2 className="font-['Outfit'] font-black text-2xl sm:text-3xl text-white leading-tight">
                  ¿Cómo prefieres pagar cuando termine tu prueba?
                </h2>
                <p className="text-white/50 text-sm mt-1">
                  Tu prueba de <strong className="text-teal-400">30 días es 100% gratis</strong> — no se te cobra nada ahora. Esto solo queda guardado como tu método preferido para cuando decidas continuar.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {METODOS_PAGO.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMetodoPago(m.id)}
                    className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${
                      metodoPago === m.id
                        ? "bg-teal-500/15 border-teal-400/60 text-white shadow-[0_0_15px_rgba(0,242,254,0.15)]"
                        : "bg-white/[0.03] border-white/10 text-white/60 hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${metodoPago === m.id ? "bg-teal-400/20 text-teal-300" : "bg-white/5 text-white/40"}`}>
                      <IconCard size={16} />
                    </div>
                    <span className="font-semibold text-sm">{m.label}</span>
                    {metodoPago === m.id && <IconCheck size={14} />}
                  </button>
                ))}
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-start gap-3 text-xs text-white/50">
                <IconBank size={16} />
                <p>Ningún cobro se procesa ahora. Cuando termine tu prueba, te avisamos y reportas tu pago por este método directamente desde el Hub.</p>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-white/40 hover:text-white text-xs transition-colors"
                >
                  ← Volver a módulos
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="btn-cyber-neon text-white font-bold px-7 py-3 rounded-full text-sm flex items-center gap-2 cursor-pointer"
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
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#00f2fe] via-[#7928ca] to-[#ff007f] p-0.5 shadow-[0_0_30px_rgba(0,242,254,0.5)]">
                  <div className="w-full h-full bg-[#0d131f] rounded-2xl flex items-center justify-center text-teal-300">
                    {(() => { const Icon = INDUSTRIES.find((i) => i.id === selectedIndustry)?.Icon || IconClinic; return <Icon size={26} />; })()}
                  </div>
                </div>
              </div>

              <div>
                <h2 className="font-['Outfit'] font-black text-2xl sm:text-3xl text-white">
                  {selectedIndustry === "restaurante" ? "¡Todo Listo para tu Restaurante!" : esRetail ? "¡Todo Listo para tu Negocio!" : "¡Todo Listo para tu Clínica!"}
                </h2>
                <p className="text-white/50 text-sm mt-1 max-w-md mx-auto">
                  Tu entorno privado en <strong>Aurora Hub</strong> ha sido preparado con la vertical{" "}
                  <strong className="text-teal-300">{VERTICAL_LABEL[selectedIndustry]?.split(" (")[0] || "Mediclinic Pro"}</strong>.
                </p>
              </div>

              {/* Resumen de configuración */}
              <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 text-left space-y-3.5 max-w-md mx-auto shadow-inner">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40 uppercase tracking-wider font-mono">Organización:</span>
                  <span className="text-white font-bold">{empresaNombre || NOMBRE_POR_DEFECTO[selectedIndustry] || "Centro Médico Pro"}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40 uppercase tracking-wider font-mono">Vertical:</span>
                  <span className="text-teal-300 font-semibold flex items-center gap-1.5">
                    {(() => { const Icon = INDUSTRIES.find((i) => i.id === selectedIndustry)?.Icon || IconClinic; return <Icon size={13} />; })()} {VERTICAL_LABEL[selectedIndustry] || "Mediclinic Pro (Clínica & Salud)"}
                  </span>
                </div>
                <div className="flex items-start justify-between text-xs">
                  <span className="text-white/40 uppercase tracking-wider font-mono mt-0.5">Módulos:</span>
                  <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                    {modules.map((m) => (
                      <span
                        key={m}
                        className="bg-teal-500/15 border border-teal-500/30 text-teal-300 text-[10px] px-2 py-0.5 rounded-full"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="h-px bg-white/10" />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40 uppercase tracking-wider font-mono">Prueba Gratuita:</span>
                  <span className="text-emerald-400 font-bold">30 días de acceso completo</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40 uppercase tracking-wider font-mono">Método de Pago:</span>
                  <span className="text-white font-semibold">{METODOS_PAGO.find((m) => m.id === metodoPago)?.label}</span>
                </div>
              </div>

              {errorActivacion && (
                <p className="text-[#ff3b80] text-xs max-w-md mx-auto">{errorActivacion}</p>
              )}

              <div className="space-y-3 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={handleActivate}
                  disabled={activando}
                  className="w-full btn-cyber-neon text-white font-bold py-4 rounded-full text-base shadow-[0_0_30px_rgba(255,59,128,0.4)] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {activando ? "Creando tu cuenta…" : `Entrar a ${VERTICAL_LABEL[selectedIndustry]?.split(" (")[0] || "Mediclinic Pro"} en Aurora Hub →`}
                </button>
                <p className="text-white/30 text-xs">
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

