import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AuroraLogo from "../AuroraLogo";
import {
  AuroraGradientDef, IconClinic, IconVet, IconHardware, IconCard, IconUsers, IconCustomize,
  IconStethoscope, IconCalendar, IconPrescription, IconRocket, IconDownload, IconKey,
  IconHourglass, IconUser, IconClose, IconCheckCircle, IconBank, IconChat, IconFileText,
} from "../Icons";
import { useAuth } from "../context/AuthContext";
import { listarPacientes, listarCitasDelDia, listarCobrosDelDia, type Paciente, type CitaMedica } from "../api";
import MediclinicApp from "../components/MediclinicApp";

const VERTICAL_ICON: Record<string, (props: { size?: number }) => JSX.Element> = {
  clinica: IconClinic,
  veterinaria: IconVet,
  ferreteria: IconHardware,
};

const ACTION_ICON: Record<string, (props: { size?: number }) => JSX.Element> = {
  "Nueva Consulta": IconStethoscope,
  "Agendar Cita": IconCalendar,
  "Emitir Receta": IconPrescription,
  "Cobrar Factura": IconCard,
  "Ficha Mascota": IconVet,
  "Plan Vacunación": IconPrescription,
  "Venta PetShop": IconCard,
  "Cirugías": IconClinic,
  "Abrir Caja / POS": IconCard,
  "Consultar Kardex": IconHardware,
  "Nueva Cotización": IconFileText,
  "Cierre de Turno": IconCard,
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
      { label: "Pacientes Hoy", val: "28", change: "+4 vs ayer", color: "text-teal-500 dark:text-teal-400" },
      { label: "Consultas Pendientes", val: "6", change: "2 en triaje", color: "text-sky-500 dark:text-sky-400" },
      { label: "Ingresos del Día", val: "$840", change: "Multi-moneda (USD/VES)", color: "text-purple-500 dark:text-purple-400" },
      { label: "Stock Farmacia", val: "94%", change: "2 alertas de reorden", color: "text-amber-500 dark:text-amber-400" },
    ],
    actions: [
      { label: "Nueva Consulta", desc: "Abrir historia clínica y registrar diagnóstico" },
      { label: "Agendar Cita", desc: "Asignar horario y notificar por WhatsApp" },
      { label: "Emitir Receta", desc: "Generar récipe digital con firma" },
      { label: "Cobrar Factura", desc: "Punto de venta multi-moneda" },
    ],
    defaultPatients: [
      { name: "Carlos Mendoza", age: "42 años", reason: "Control Cardiología", status: "En Espera", time: "09:30 AM" },
      { name: "Elena Rostova", age: "29 años", reason: "Consulta Dermatología", status: "En Consulta", time: "10:00 AM" },
      { name: "Santiago Pérez", age: "8 años", reason: "Chequeo Pediátrico", status: "Confirmado", time: "10:45 AM" },
      { name: "Mariana Rivas", age: "35 años", reason: "Entrega de Laboratorio", status: "Finalizado", time: "08:45 AM" },
    ],
  },
  veterinaria: {
    name: "Mediclinic Vet",
    badge: "EDICIÓN VETERINARIA",
    desc: "Expedientes por mascota, plan de vacunas, cirugías e inventario veterinario.",
    stats: [
      { label: "Mascotas Atendidas", val: "19", change: "+3 vs ayer", color: "text-teal-500 dark:text-teal-400" },
      { label: "Vacunaciones", val: "8", change: "Plan antirrábico", color: "text-sky-500 dark:text-sky-400" },
      { label: "Venta Farmacia Vet", val: "$560", change: "Alimentos y fármacos", color: "text-purple-500 dark:text-purple-400" },
      { label: "Hospitalizaciones", val: "2", change: "En recuperación", color: "text-amber-500 dark:text-amber-400" },
    ],
    actions: [
      { label: "Ficha Mascota", desc: "Historial por paciente y tutor" },
      { label: "Plan Vacunación", desc: "Recordatorios automáticos" },
      { label: "Venta PetShop", desc: "Cobro rápido por mostrador" },
      { label: "Cirugías", desc: "Registro pre y post operatorio" },
    ],
    defaultPatients: [
      { name: "Max (Golden Retriever)", age: "3 años", reason: "Vacuna Séxtuple", status: "En Espera", time: "09:15 AM" },
      { name: "Luna (Gato Siamés)", age: "1 año", reason: "Esterilización", status: "En Quirófano", time: "10:00 AM" },
      { name: "Rocky (Bulldog)", age: "5 años", reason: "Alergia cutánea", status: "Confirmado", time: "11:30 AM" },
    ],
  },
  ferreteria: {
    name: "FerrePlus ERP",
    badge: "EDICIÓN FERRETERÍA & RETAIL",
    desc: "Kardex multi-unidad, lista de precios por volumen, compras y POS mostrador.",
    stats: [
      { label: "Ventas de Hoy", val: "$3,420", change: "142 tickets", color: "text-teal-500 dark:text-teal-400" },
      { label: "Artículos en Stock", val: "6,210", change: "8 bajo mínimo", color: "text-sky-500 dark:text-sky-400" },
      { label: "Cuentas x Cobrar", val: "$1,890", change: "Créditos al día", color: "text-purple-500 dark:text-purple-400" },
      { label: "Órdenes de Compra", val: "4", change: "En despacho", color: "text-amber-500 dark:text-amber-400" },
    ],
    actions: [
      { label: "Abrir Caja / POS", desc: "Venta por mostrador y códigos de barra" },
      { label: "Consultar Kardex", desc: "Stock por bodega y listas de precio" },
      { label: "Nueva Cotización", desc: "Presupuesto con validez temporal" },
      { label: "Cierre de Turno", desc: "Arqueo de caja y corte Z" },
    ],
    defaultPatients: [
      { name: "Constructora del Este", age: "Cliente VIP", reason: "50 Sacos Cemento + Cabillas", status: "Despachado", time: "08:30 AM" },
      { name: "Taller Mecánico Ramos", age: "Crédito 15d", reason: "Tornillería y Discos de Corte", status: "Facturado", time: "09:45 AM" },
    ],
  },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout, trialDaysLeft, reportPayment, marcarPrimerIngresoCompletado } = useAuth();

  // El Hub (launcher + hero de bienvenida) solo se muestra la primera vez que
  // este tenant entra a su módulo — en el uso diario sería un estorbo, así que
  // de ahí en adelante se entra directo al espacio de trabajo clínico.
  const mostrarHero = user?.primerIngreso !== false;

  const [activeTab, setActiveTab] = useState<"vertical" | "billing" | "team" | "settings">("vertical");
  const [workspaceTab, setWorkspaceTab] = useState<"kpis" | "patients" | "agenda" | "pos">(mostrarHero ? "kpis" : "patients");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
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

  // Datos reales de Mediclinic Pro — solo hay backend conectado para "clinica"
  // por ahora; el resto de verticales del onboarding siguen en demo estática
  // (ver Onboarding.tsx: solo esta está marcada "100% disponible").
  const [pacientesReales, setPacientesReales] = useState<Paciente[] | null>(null);
  const [citasReales, setCitasReales] = useState<CitaMedica[] | null>(null);
  const [ingresosHoy, setIngresosHoy] = useState<number | null>(null);
  const esClinicaReal = userIndustry === "clinica" && !!user?.tenantId;

  // En visitas siguientes (no primer ingreso) se salta el Hub por completo y
  // entra directo a la app de Mediclinic — igual que pasa al hacer clic en
  // "Abrir Mediclinic Pro" la primera vez.
  const [abrirMediclinicApp, setAbrirMediclinicApp] = useState(!mostrarHero);

  useEffect(() => {
    if (!esClinicaReal || !user?.tenantId) return;
    const hoy = new Date().toISOString().slice(0, 10);
    listarPacientes(user.tenantId).then(setPacientesReales).catch(() => setPacientesReales([]));
    listarCitasDelDia(user.tenantId, hoy).then(setCitasReales).catch(() => setCitasReales([]));
    listarCobrosDelDia(`${hoy}T00:00:00`, `${hoy}T23:59:59`)
      .then((cobros) => setIngresosHoy(cobros.reduce((sum, c) => sum + Number(c.montoTotal), 0)))
      .catch(() => setIngresosHoy(0));
  }, [esClinicaReal, user?.tenantId]);

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

  if (esClinicaReal && abrirMediclinicApp) {
    return <MediclinicApp onSalir={() => setAbrirMediclinicApp(false)} />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-500 relative overflow-hidden flex flex-col">
      <AuroraGradientDef />

      {/* Fondos atmosféricos suaves */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="aurora-ribbon-1 -top-32 -left-20 opacity-30" />
        <div className="aurora-ribbon-2 top-1/3 -right-20 opacity-35" />
      </div>

      {/* ── HEADER SUPERIOR DEL PORTAL DE CLIENTE ── */}
      <header className="nav-glass border-b border-slate-300/60 dark:border-white/10 px-4 sm:px-8 h-18 flex items-center justify-between relative z-30 sticky top-0 transition-colors duration-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <AuroraLogo size={34} animated />
            <div>
              <div className="font-['Outfit'] font-black text-lg text-aurora leading-none">Aurora Hub</div>
              <div className="text-slate-500 dark:text-white/40 text-[10px] tracking-wider uppercase mt-0.5">
                {user?.empresa || "Portal de Empresa"}
              </div>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-slate-300 dark:bg-white/10 hidden md:block mx-1" />

          {/* Selector de navegación del Dashboard */}
          <div className="hidden md:flex items-center gap-1.5 apple-glass-pill rounded-full p-1 text-xs">
            <button
              onClick={() => setActiveTab("vertical")}
              className={`px-3.5 py-1.5 rounded-full font-semibold transition-all ${
                activeTab === "vertical" ? "bg-white text-black shadow-sm" : "text-slate-600 dark:text-white/70 hover:text-black dark:hover:text-white"
              }`}>
              <span className="inline-flex items-center gap-1.5"><VerticalIcon size={14} /> {vertical.name}</span>
            </button>
            <button
              onClick={() => setActiveTab("billing")}
              className={`px-3.5 py-1.5 rounded-full font-semibold transition-all ${
                activeTab === "billing" ? "bg-white text-black shadow-sm" : "text-slate-600 dark:text-white/70 hover:text-black dark:hover:text-white"
              }`}>
              <span className="inline-flex items-center gap-1.5"><IconCard size={14} /> Facturación & Pagos</span>
            </button>
            <button
              onClick={() => setActiveTab("team")}
              className={`px-3.5 py-1.5 rounded-full font-semibold transition-all ${
                activeTab === "team" ? "bg-white text-black shadow-sm" : "text-slate-600 dark:text-white/70 hover:text-black dark:hover:text-white"
              }`}>
              <span className="inline-flex items-center gap-1.5"><IconUsers size={14} /> Equipo & Roles</span>
            </button>
            <button
              onClick={() => navigate("/onboarding")}
              title="Cambiar o configurar rubro"
              className="px-2.5 py-1.5 rounded-full text-slate-500 dark:text-white/40 hover:text-teal-500 dark:hover:text-teal-300 font-medium transition-all text-[11px]">
              <span className="inline-flex items-center gap-1.5"><IconCustomize size={13} /> Cambiar Rubro</span>
            </button>
          </div>
        </div>


        {/* Estado de Suscripción & Perfil */}
        <div className="flex items-center gap-3">
          {/* Badge de Licencia */}
          <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${
            isTrial
              ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
              : "bg-teal-500/10 border-teal-500/30 text-teal-700 dark:text-teal-300"
          }`}>
            <span className={`w-2 h-2 rounded-full ${isTrial ? "bg-amber-400 animate-ping" : "bg-teal-400"}`} />
            <span>{isTrial ? `Trial (${daysLeft} días restantes)` : "Licencia ACTIVA Pro"}</span>
          </div>

          <button
            onClick={() => setShowPaymentModal(true)}
            className="btn-electric-blue text-xs font-bold px-4 py-2 rounded-full cursor-pointer shadow-md">
            {isTrial ? "Activar Plan Pro" : "Gestionar Pago"}
          </button>

          <button
            onClick={logout}
            className="apple-glass-btn text-xs font-semibold px-3.5 py-2 rounded-full text-slate-700 dark:text-white/80 cursor-pointer">
            Salir
          </button>
        </div>
      </header>

      {/* ── CONTENIDO PRINCIPAL ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 space-y-8">
        
        {/* BARRA DE RECORDATORIO DE TRIAL / PAGO */}
        {isTrial && (
          <div className="apple-glass border-l-4 border-l-teal-500 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-md">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-300 flex items-center justify-center">
                <IconHourglass size={20} />
              </div>
              <div>
                <h4 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-sm">
                  Estás disfrutando de tu prueba gratuita de {vertical.name}
                </h4>
                <p className="text-slate-500 dark:text-white/45 text-xs mt-0.5">
                  Te quedan <strong className="text-teal-600 dark:text-teal-400">{daysLeft} días</strong> de acceso completo. Tus historias clínicas y datos quedarán guardados de forma permanente.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPaymentModal(true)}
                className="g-aurora text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md cursor-pointer hover:opacity-90">
                Pagar Suscripción ($35/mes) →
              </button>
            </div>
          </div>
        )}

        {/* ── PESTAÑA 1: LAUNCHER & ENTORNO DE LA VERTICAL (MEDICLINIC PRO) ── */}
        {activeTab === "vertical" && (
          <div className="space-y-8">
            
            {/* HERO LAUNCHER CARD — solo la primera vez (ver mostrarHero) */}
            {mostrarHero && (
            <div className="relative apple-glass rounded-3xl p-6 sm:p-8 overflow-hidden shadow-xl border border-teal-500/20">
              <div className="line-aurora absolute top-0 left-0 right-0" />
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-8 space-y-4 text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-xs font-bold text-teal-600 dark:text-teal-300">
                    <span>{vertical.badge}</span>
                  </div>

                  <h2 className="font-['Outfit'] font-black text-3xl sm:text-4xl text-slate-900 dark:text-white leading-tight">
                    {vertical.name} — Centro de Operaciones
                  </h2>

                  <p className="text-slate-600 dark:text-white/60 text-sm sm:text-base leading-relaxed max-w-2xl">
                    {vertical.desc} Administra consultas, pacientes, especialistas, citas y recetas desde la nube o sincroniza sin internet en tu consultorio.
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      onClick={() => { setAbrirMediclinicApp(true); marcarPrimerIngresoCompletado(); }}
                      className="btn-electric-blue text-xs sm:text-sm font-bold px-6 py-3 rounded-full flex items-center gap-2 shadow-lg cursor-pointer">
                      <IconRocket size={15} />
                      <span>Abrir {vertical.name} (Cloud Web)</span>
                      <span>→</span>
                    </button>

                    <a
                      href="https://github.com"
                      target="_blank"
                      rel="noreferrer"
                      className="apple-glass-btn text-xs sm:text-sm font-semibold px-5 py-3 rounded-full flex items-center gap-2 text-slate-800 dark:text-white cursor-pointer">
                      <IconDownload size={15} />
                      <span>Descargar para Windows (.exe)</span>
                    </a>

                    <button
                      onClick={() => alert("Tu API Token de Licencia: AURORA-MED-PRO-9842-SECURE")}
                      className="apple-glass-btn text-xs font-mono px-4 py-3 rounded-full text-slate-600 dark:text-white/60 cursor-pointer flex items-center gap-2">
                      <IconKey size={14} />
                      <span>Clave de Licencia</span>
                    </button>
                  </div>
                </div>

                {/* Métricas destacadas del día — reales para Mediclinic Pro cuando hay
                    sesión de un tenant real; el resto de verticales aún es demo. */}
                <div className="lg:col-span-4 grid grid-cols-2 gap-3">
                  {(esClinicaReal
                    ? [
                        { label: "Pacientes Registrados", val: pacientesReales ? String(pacientesReales.length) : "…", change: "Total en el consultorio", color: "text-teal-500 dark:text-teal-400" },
                        { label: "Citas de Hoy", val: citasReales ? String(citasReales.length) : "…", change: citasReales ? `${citasReales.filter(c => c.estado === "CONFIRMADA").length} confirmadas` : "", color: "text-sky-500 dark:text-sky-400" },
                        { label: "Ingresos del Día", val: ingresosHoy !== null ? `$${ingresosHoy.toFixed(2)}` : "…", change: "Multi-moneda (USD/VES/COP)", color: "text-purple-500 dark:text-purple-400" },
                        { label: "Módulo Farmacia", val: "—", change: "Próximamente", color: "text-amber-500 dark:text-amber-400" },
                      ]
                    : vertical.stats
                  ).map((s) => (
                    <div key={s.label} className="apple-glass rounded-2xl p-4 text-left border border-white/10 shadow-sm">
                      <div className="text-slate-500 dark:text-white/40 text-[11px] font-medium leading-tight">{s.label}</div>
                      <div className={`font-['Outfit'] font-black text-2xl mt-1 ${s.color}`}>{s.val}</div>
                      <div className="text-[10px] text-slate-400 dark:text-white/30 mt-0.5">{s.change}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            )}

            {/* SIMULADOR EN VIVO / WORKSPACE INTEGRADO */}
            <div className="apple-glass rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-300/60 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-300 flex items-center justify-center">
                    <IconStethoscope size={20} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-['Outfit'] font-bold text-lg text-slate-900 dark:text-white">
                      Espacio de Trabajo Clínico en Vivo
                    </h3>
                    <p className="text-slate-500 dark:text-white/40 text-xs">
                      Base de datos PostgreSQL Multi-tenant sincronizada en tiempo real.
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
                    Expedientes & Triaje
                  </button>
                  <button
                    onClick={() => setWorkspaceTab("agenda")}
                    className={`px-3.5 py-1.5 rounded-full font-semibold transition-all ${
                      workspaceTab === "agenda" ? "bg-white text-black shadow-sm" : "text-slate-600 dark:text-white/60"
                    }`}>
                    Agenda de Citas
                  </button>
                </div>
              </div>

              {/* CONTENIDO DE LA PESTAÑA SELECCIONADA EN EL SIMULADOR */}
              {workspaceTab === "patients" ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-['Outfit'] font-bold text-sm text-slate-900 dark:text-white">
                      Lista de Pacientes en Consulta / Triaje
                    </h4>
                    <button
                      onClick={() => alert("Formulario de admisión médica abierto")}
                      className="btn-electric-blue text-xs font-semibold px-4 py-2 rounded-full cursor-pointer">
                      + Ingresar Paciente
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/10">
                    <table className="w-full text-left text-xs">
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
                        {esClinicaReal ? (
                          citasReales === null ? (
                            <tr><td colSpan={6} className="p-4 text-center text-slate-400 dark:text-white/30">Cargando…</td></tr>
                          ) : citasReales.length === 0 ? (
                            <tr><td colSpan={6} className="p-4 text-center text-slate-400 dark:text-white/30">No hay citas registradas hoy.</td></tr>
                          ) : citasReales.map((c) => (
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
                                  onClick={() => alert(`Abriendo historia clínica de ${c.paciente?.nombreCompleto}`)}
                                  className="text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer">
                                  Abrir Historia →
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          vertical.defaultPatients.map((p) => (
                          <tr key={p.name} className="hover:bg-slate-100/50 dark:hover:bg-white/[0.02] transition-colors">
                            <td className="p-3.5 font-bold text-slate-900 dark:text-white">{p.name}</td>
                            <td className="p-3.5 text-slate-500 dark:text-white/60">{p.age}</td>
                            <td className="p-3.5 text-slate-700 dark:text-white/80">{p.reason}</td>
                            <td className="p-3.5 text-slate-500 dark:text-white/50 font-mono">{p.time}</td>
                            <td className="p-3.5">
                              <span className="px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-300 font-semibold text-[10px]">
                                {p.status}
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <button
                                onClick={() => alert(`Abriendo historia clínica de ${p.name}`)}
                                className="text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer">
                                Abrir Historia →
                              </button>
                            </td>
                          </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : workspaceTab === "agenda" ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {esClinicaReal ? (
                    citasReales === null ? (
                      <p className="text-slate-400 dark:text-white/30 text-sm col-span-3 text-center py-4">Cargando…</p>
                    ) : citasReales.length === 0 ? (
                      <p className="text-slate-400 dark:text-white/30 text-sm col-span-3 text-center py-4">No hay citas agendadas para hoy.</p>
                    ) : citasReales.map((c) => (
                      <div key={c.id} className="apple-glass rounded-2xl p-4 border border-white/10 text-left space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-teal-600 dark:text-teal-400 text-xs font-mono font-bold">{c.horaInicio} — {c.horaFin}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/15 text-teal-600 dark:text-teal-300">{c.estado}</span>
                        </div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white">{c.paciente?.nombreCompleto} — {c.especialidad || c.motivo}</div>
                        <p className="text-slate-500 dark:text-white/40 text-xs">{c.motivo}</p>
                      </div>
                    ))
                  ) : (
                    ["09:00 AM - Dr. Carlos (Cardiología)", "10:30 AM - Dra. Soto (Pediatría)", "02:00 PM - Laboratorio / Tomas"].map((slot, i) => (
                      <div key={i} className="apple-glass rounded-2xl p-4 border border-white/10 text-left space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-teal-600 dark:text-teal-400 text-xs font-mono font-bold">Bloque Activo</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/15 text-teal-600 dark:text-teal-300">Confirmado</span>
                        </div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white">{slot}</div>
                        <p className="text-slate-500 dark:text-white/40 text-xs">Recordatorio enviado vía WhatsApp SMS</p>
                      </div>
                    ))
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
                      onClick={() => alert(`Ejecutando acción: ${act.label}`)}
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
                    {user?.plan || "Estándar"} ($35/mes)
                  </div>
                  <p className="text-xs text-slate-500 dark:text-white/40">
                    Módulos ilimitados para tu clínica + versión offline y móvil.
                  </p>
                </div>

                <div className="apple-glass rounded-2xl p-5 border border-white/10 space-y-2">
                  <div className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">Próxima Fecha de Corte</div>
                  <div className="font-['Outfit'] font-black text-2xl text-slate-900 dark:text-white">
                    25 Septiembre 2026
                  </div>
                  <p className="text-xs text-slate-500 dark:text-white/40">
                    Recordatorio automático por WhatsApp 5 días antes.
                  </p>
                </div>

                <div className="apple-glass rounded-2xl p-5 border border-white/10 space-y-2">
                  <div className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Métodos Disponibles</div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-white/90">
                    Pago Móvil · Binance · Zelle · Tarjeta
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
                        <th className="p-3.5 text-right">Comprobante</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                      {(user?.payments && user.payments.length > 0) ? (
                        user.payments.map((p) => (
                          <tr key={p.id}>
                            <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-white">{p.id}</td>
                            <td className="p-3.5 text-slate-600 dark:text-white/60">{p.fecha}</td>
                            <td className="p-3.5 font-bold text-teal-600 dark:text-teal-400">{p.monto}</td>
                            <td className="p-3.5 text-slate-600 dark:text-white/70">{p.metodo} · Ref: {p.referencia}</td>
                            <td className="p-3.5">
                              <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-300 font-semibold text-[10px]">
                                {p.estado.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <button
                                onClick={() => alert(`Descargando factura en PDF del pago ${p.id}`)}
                                className="text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer inline-flex items-center gap-1">
                                <IconFileText size={12} /> Descargar PDF
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-white">REC-001924</td>
                          <td className="p-3.5 text-slate-600 dark:text-white/60">01/09/2026</td>
                          <td className="p-3.5 font-bold text-teal-600 dark:text-teal-400">$35.00 USD</td>
                          <td className="p-3.5 text-slate-600 dark:text-white/70">Pago Móvil Banesco · Ref: 489201</td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-300 font-semibold text-[10px]">
                              APROBADO
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => alert("Descargando factura fiscal en PDF")}
                              className="text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer inline-flex items-center gap-1">
                              <IconFileText size={12} /> Descargar PDF
                            </button>
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
        {activeTab === "team" && (
          <div className="apple-glass rounded-3xl p-6 sm:p-8 space-y-6 text-left shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-300/60 dark:border-white/10">
              <div>
                <h3 className="font-['Outfit'] font-black text-2xl text-slate-900 dark:text-white">
                  Equipo de Trabajo & Accesos
                </h3>
                <p className="text-slate-500 dark:text-white/45 text-sm mt-1">
                  Administra los médicos, recepcionistas y administradores autorizados.
                </p>
              </div>
              <button
                onClick={() => alert("Enlace de invitación enviado al correo del colaborador")}
                className="btn-electric-blue text-xs font-bold px-6 py-3 rounded-full cursor-pointer shadow-md">
                + Invitar Colaborador
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: user?.nombre || "Dr. Alejandro Ramos", role: "Director Médico / Admin", email: user?.email || "admin@clinica.com" },
                { name: "Dra. Valentina Soto", role: "Especialista en Pediatría", email: "pediatria@clinica.com" },
                { name: "Mariana Pérez", role: "Recepción & Caja", email: "recepcion@clinica.com" },
              ].map((m) => (
                <div key={m.email} className="apple-glass rounded-2xl p-5 border border-white/10 space-y-2">
                  <div className="text-teal-600 dark:text-teal-300"><IconUser size={26} /></div>
                  <div className="font-['Outfit'] font-bold text-base text-slate-900 dark:text-white">{m.name}</div>
                  <div className="text-xs font-semibold text-teal-600 dark:text-teal-400">{m.role}</div>
                  <div className="text-xs text-slate-500 dark:text-white/40 font-mono">{m.email}</div>
                </div>
              ))}
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
                    Activación automática para {vertical.name}
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
                <div className="p-4 rounded-2xl bg-slate-200/60 dark:bg-white/5 border border-slate-300/80 dark:border-white/10 text-xs space-y-1.5 font-mono">
                  <div className="font-bold text-teal-600 dark:text-teal-300 font-sans text-xs mb-1.5 flex items-center gap-1.5">
                    <IconBank size={13} /> Cuentas Oficiales para Transferir:
                  </div>
                  <div>• <strong>Pago Móvil:</strong> Banesco (0134) · CI: 28.123.456 · Tel: 0414-1234567</div>
                  <div>• <strong>Binance USDT (TRC-20):</strong> TQ3j8K9vP2sL... [Copiar]</div>
                  <div>• <strong>Zelle:</strong> pagos@auroraplus.com</div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-white/70 mb-1">
                    Método de Pago Utilizado
                  </label>
                  <select
                    value={paymentForm.metodo}
                    onChange={(e) => setPaymentForm({ ...paymentForm, metodo: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-xs font-medium text-slate-900 dark:text-white">
                    <option value="Pago Móvil (Bolívares - Tasa BCV)">Pago Móvil (Bolívares - Tasa BCV)</option>
                    <option value="Transferencia Bancaria Nacional (Banesco/Mercantil)">Transferencia Bancaria Nacional</option>
                    <option value="Binance Pay / USDT">Binance Pay / USDT</option>
                    <option value="Zelle">Zelle</option>
                    <option value="Tarjeta de Crédito / Débito Internacional">Tarjeta Internacional</option>
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
                      placeholder="$35.00 USD"
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

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="apple-glass-btn text-xs font-semibold px-4 py-2.5 rounded-xl text-slate-700 dark:text-white cursor-pointer">
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-electric-blue text-xs font-bold px-6 py-2.5 rounded-xl cursor-pointer shadow-md">
                    Confirmar y Activar Plan →
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* ── BOTÓN FLOTANTE DE SOPORTE WHATSAPP ── */}
      <a
        href="https://wa.me/584141234567?text=Hola%20Aurora%20Plus,%20necesito%20asistencia%20con%20mi%20cuenta"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 bg-[#25D366] text-white font-bold text-xs px-4 py-3 rounded-full shadow-[0_8px_25px_rgba(37,211,102,0.4)] hover:scale-105 transition-transform">
        <IconChat size={16} />
        <span className="hidden sm:inline">Soporte WhatsApp</span>
      </a>

    </div>
  );
}

