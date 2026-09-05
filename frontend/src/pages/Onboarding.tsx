import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuroraLogo from "../AuroraLogo";
import { AuroraGradientDef } from "../Icons";
import { useAuth } from "../context/AuthContext";

const INDUSTRIES = [
  { id: "veterinaria",  label: "Veterinaria",        icon: "🐾", desc: "Clínica, consultas, vacunas, farmacia" },
  { id: "clinica",      label: "Clínica Médica",      icon: "🏥", desc: "Expedientes, agenda, laboratorio" },
  { id: "ferreteria",   label: "Ferretería",          icon: "🔧", desc: "Inventario, POS, proveedores" },
  { id: "mineria",      label: "Minería",             icon: "⛏️", desc: "Equipos, turnos, seguridad" },
  { id: "restaurante",  label: "Restaurante",         icon: "🍽️", desc: "Comandas, mesas, cocina" },
  { id: "finca",        label: "Control de Fincas",   icon: "🌿", desc: "Ganado, potreros, vacunación" },
  { id: "educacion",    label: "Educación",           icon: "🎓", desc: "Matrícula, horarios, calificaciones" },
  { id: "retail",       label: "Retail",              icon: "🛒", desc: "Tienda, inventario, clientes" },
  { id: "construccion", label: "Construcción",        icon: "🏗️", desc: "Proyectos, materiales, personal" },
  { id: "otro",         label: "Otro rubro",          icon: "✦",  desc: "Lo configuramos juntos" },
];

const MODULE_MAP: Record<string, { id: string; label: string; desc: string }[]> = {
  veterinaria: [
    { id: "expedientes", label: "Expedientes clínicos",  desc: "Historial por paciente" },
    { id: "citas",       label: "Agenda de citas",        desc: "Calendarios y recordatorios" },
    { id: "farmacia",    label: "Farmacia / inventario",  desc: "Stock de medicamentos" },
    { id: "factura",     label: "Facturación",            desc: "Cobros y recibos" },
    { id: "vacunas",     label: "Control de vacunas",     desc: "Calendario de vacunación" },
  ],
  clinica: [
    { id: "expedientes", label: "Historia clínica",       desc: "Expediente digital" },
    { id: "agenda",      label: "Agenda médica",          desc: "Por especialista" },
    { id: "lab",         label: "Laboratorio",            desc: "Resultados y órdenes" },
    { id: "farmacia",    label: "Farmacia interna",       desc: "Dispensación y stock" },
    { id: "factura",     label: "Cobranza y seguros",     desc: "Cobros y aseguradoras" },
  ],
  ferreteria: [
    { id: "inventario",  label: "Inventario",             desc: "Control de stock" },
    { id: "pos",         label: "Punto de venta",         desc: "Ventas por mostrador" },
    { id: "compras",     label: "Proveedores y compras",  desc: "Órdenes de compra" },
    { id: "cxc",         label: "Cuentas por cobrar",     desc: "Crédito a clientes" },
    { id: "cotizacion",  label: "Cotizaciones",           desc: "Presupuestos rápidos" },
  ],
  mineria: [
    { id: "maquinaria",  label: "Maquinaria y equipos",   desc: "Control y mantención" },
    { id: "turnos",      label: "Turnos y personal",      desc: "Gestión de horarios" },
    { id: "ot",          label: "Órdenes de trabajo",     desc: "Asignación y seguimiento" },
    { id: "seguridad",   label: "Seguridad e incidentes", desc: "Reportes regulatorios" },
    { id: "materiales",  label: "Control de materiales",  desc: "Inventario de insumos" },
  ],
  restaurante: [
    { id: "comandas",    label: "Comandas digitales",     desc: "Por mesa o para llevar" },
    { id: "cocina",      label: "Pantalla de cocina",     desc: "Vista en tiempo real" },
    { id: "inventario",  label: "Inventario de insumos",  desc: "Control de stock" },
    { id: "caja",        label: "Cierres de caja",        desc: "Cortes automáticos" },
    { id: "reservas",    label: "Reservas",               desc: "Gestión de mesas" },
  ],
  finca: [
    { id: "ganado",       label: "Registro de ganado",     desc: "Por animal individual" },
    { id: "vacunas",      label: "Vacunación",             desc: "Calendario por lote" },
    { id: "potreros",     label: "Control de potreros",    desc: "Rotación y ocupación" },
    { id: "insumos",      label: "Inventario de insumos",  desc: "Concentrados y medicamentos" },
    { id: "trazabilidad", label: "Trazabilidad",           desc: "Historial por lote" },
  ],
  educacion: [
    { id: "matricula",   label: "Matrícula",              desc: "Expediente estudiantil" },
    { id: "horarios",    label: "Horarios y aulas",       desc: "Planificación académica" },
    { id: "notas",       label: "Calificaciones",         desc: "Boletines digitales" },
    { id: "padres",      label: "Portal de padres",       desc: "Comunicación directa" },
    { id: "nomina",      label: "Nómina docente",         desc: "Asistencia y pagos" },
  ],
  retail: [
    { id: "pos",          label: "Punto de venta",         desc: "POS multitienda" },
    { id: "inventario",   label: "Inventario",             desc: "Stock en tiempo real" },
    { id: "clientes",     label: "Fidelización",           desc: "Programa de puntos" },
    { id: "devoluciones", label: "Devoluciones",           desc: "Gestión de cambios" },
    { id: "reportes",     label: "Reportes de ventas",     desc: "Por categoría y período" },
  ],
  construccion: [
    { id: "proyectos",   label: "Proyectos y obras",      desc: "Avance y seguimiento" },
    { id: "presupuesto", label: "Presupuestos",           desc: "Estimados y cotizaciones" },
    { id: "materiales",  label: "Control de materiales",  desc: "Bodega en obra" },
    { id: "personal",    label: "Personal y subcontratos",desc: "Asistencia y pagos" },
    { id: "reportes",    label: "Reportes de avance",     desc: "Para clientes y dirección" },
  ],
  otro: [
    { id: "ventas",       label: "Ventas / POS",          desc: "Punto de venta general" },
    { id: "inventario",   label: "Inventario",            desc: "Control de stock" },
    { id: "rrhh",         label: "RRHH y nómina",         desc: "Personal y pagos" },
    { id: "contabilidad", label: "Contabilidad",          desc: "Finanzas y reportes" },
    { id: "crm",          label: "CRM",                   desc: "Clientes y seguimiento" },
  ],
};

// ── Steps: 1 → industria, 2 → módulos, 3 → listo ──────────────────────────

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, completeOnboarding } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [industry, setIndustry] = useState("");
  const [modules, setModules] = useState<string[]>([]);

  const selectedInd = INDUSTRIES.find((i) => i.id === industry);
  const availableMods = MODULE_MAP[industry] ?? MODULE_MAP["otro"];

  const toggleModule = (id: string) =>
    setModules((prev) => prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]);

  const handleActivate = () => {
    completeOnboarding({ industry, empresa: user?.empresa });
    navigate("/dashboard");
  };

  return (
    <div className="min-h-full bg-[#060612] text-white flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">
      <AuroraGradientDef />

      <div className="absolute inset-0 pointer-events-none">
        <div className="blob1 absolute -top-48 -left-48 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(0,229,184,0.10) 0%, transparent 70%)" }} />
        <div className="blob2 absolute -bottom-32 -right-48 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(168,85,247,0.09) 0%, transparent 70%)" }} />
      </div>

      <div className="relative w-full max-w-2xl">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <AuroraLogo size={48} animated />
          <p className="text-white/30 text-xs mt-2 tracking-widest uppercase">Aurora Plus · Configuración inicial</p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`rounded-full transition-all duration-300 ${
              s === step ? "w-8 h-2 g-aurora" :
              s < step  ? "w-2 h-2 bg-teal-400/60" :
                          "w-2 h-2 bg-white/10"
            }`} />
          ))}
        </div>

        {/* Card */}
        <div className="bg-[#0c0c20] border border-white/5 rounded-3xl overflow-hidden">
          <div className="line-aurora" />

          <div className="p-8 sm:p-10">

            {/* ── Step 1: Industria ── */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <p className="text-teal-400 text-xs font-semibold tracking-widest uppercase mb-2">Paso 1 de 2</p>
                  <h2 className="font-['Outfit'] font-black text-3xl sm:text-4xl text-white leading-tight mb-2">
                    ¿A qué se dedica<br />tu empresa?
                  </h2>
                  <p className="text-white/40 text-sm">
                    Selecciona la industria que mejor describe tu negocio — configuraremos la plataforma para ti.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {INDUSTRIES.map((ind) => (
                    <button key={ind.id}
                      onClick={() => setIndustry(ind.id)}
                      className={`flex flex-col items-start gap-2 p-4 rounded-2xl border text-left transition-all duration-200 ${
                        industry === ind.id
                          ? "g-aurora border-transparent text-white scale-[1.03] shadow-lg"
                          : "bg-white/3 border-white/8 text-white/60 hover:bg-white/6 hover:border-white/15 hover:text-white/80"
                      }`}>
                      <span className="text-2xl">{ind.icon}</span>
                      <div>
                        <div className="font-semibold text-sm leading-tight">{ind.label}</div>
                        <div className={`text-xs mt-0.5 leading-snug ${industry === ind.id ? "text-white/70" : "text-white/30"}`}>
                          {ind.desc}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {industry && (
                  <div className="flex items-center gap-2 bg-teal-500/8 border border-teal-500/20 rounded-xl px-4 py-3 text-sm text-teal-300">
                    <span>✓</span>
                    <span>Seleccionaste <strong>{selectedInd?.label}</strong></span>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 2: Módulos ── */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <p className="text-teal-400 text-xs font-semibold tracking-widest uppercase mb-2">Paso 2 de 2</p>
                  <h2 className="font-['Outfit'] font-black text-3xl sm:text-4xl text-white leading-tight mb-2">
                    ¿Qué quieres<br />gestionar?
                  </h2>
                  <p className="text-white/40 text-sm">
                    Módulos para <strong className="text-white/60">{selectedInd?.label}</strong>. Elige los que necesitas — puedes cambiarlos después.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableMods.map((m) => {
                    const on = modules.includes(m.id);
                    return (
                      <button key={m.id} onClick={() => toggleModule(m.id)}
                        className={`flex items-center gap-3.5 p-4 rounded-2xl border text-left transition-all duration-200 ${
                          on
                            ? "bg-teal-500/10 border-teal-500/35 text-white"
                            : "bg-white/3 border-white/8 text-white/55 hover:bg-white/6 hover:border-white/15 hover:text-white/80"
                        }`}>
                        {/* Chulito */}
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all ${
                          on ? "g-aurora" : "border-2 border-white/15"
                        }`}>
                          {on && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{m.label}</div>
                          <div className={`text-xs mt-0.5 ${on ? "text-white/50" : "text-white/25"}`}>{m.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {modules.length > 0 && (
                  <p className="text-teal-400 text-xs">
                    {modules.length} módulo{modules.length > 1 ? "s" : ""} seleccionado{modules.length > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            )}

            {/* ── Step 3: Listo ── */}
            {step === 3 && (
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-2xl g-aurora glow-teal flex items-center justify-center">
                    <svg width="36" height="28" viewBox="0 0 36 28" fill="none">
                      <path d="M2 14L12 24L34 2" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>

                <div>
                  <h2 className="font-['Outfit'] font-black text-3xl sm:text-4xl text-white mb-2">
                    ¡Todo configurado{user?.nombre ? `, ${user.nombre.split(" ")[0]}` : ""}!
                  </h2>
                  <p className="text-white/45 text-sm leading-relaxed max-w-md mx-auto">
                    Aurora Plus está listo para <strong className="text-white/70">{selectedInd?.label}</strong>.
                    Tu licencia gratuita de <strong className="text-teal-400">30 días</strong> está activándose ahora.
                  </p>
                </div>

                {/* Summary */}
                <div className="bg-white/3 border border-white/8 rounded-2xl p-5 text-left space-y-3 max-w-sm mx-auto">
                  <div className="flex items-center justify-between">
                    <span className="text-white/35 text-xs uppercase tracking-widest">Industria</span>
                    <span className="text-white/80 text-sm font-medium">{selectedInd?.icon} {selectedInd?.label}</span>
                  </div>
                  <div className="h-px bg-white/5" />
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-white/35 text-xs uppercase tracking-widest mt-0.5">Módulos</span>
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      {modules.map((mid) => {
                        const mod = availableMods.find((m) => m.id === mid);
                        return mod ? (
                          <span key={mid} className="bg-teal-500/10 border border-teal-500/20 text-teal-300 text-[11px] px-2 py-0.5 rounded-full">
                            {mod.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                  <div className="h-px bg-white/5" />
                  <div className="flex items-center justify-between">
                    <span className="text-white/35 text-xs uppercase tracking-widest">Prueba</span>
                    <span className="text-teal-400 text-sm font-bold">30 días · Sin tarjeta</span>
                  </div>
                </div>

                <button onClick={handleActivate}
                  className="w-full g-aurora glow-teal text-white font-semibold py-4 rounded-xl hover:opacity-90 transition-opacity text-base">
                  Entrar a mi plataforma →
                </button>
                <p className="text-white/20 text-xs">
                  Al vencer los 30 días te avisamos para elegir un plan. Sin cobros automáticos.
                </p>
              </div>
            )}
          </div>

          {/* Footer nav */}
          {step < 3 && (
            <div className="px-8 sm:px-10 pb-8 flex items-center justify-between">
              <button
                onClick={() => step === 1 ? navigate("/auth") : setStep(1)}
                className="text-white/30 hover:text-white/55 text-sm transition-colors flex items-center gap-1.5">
                ← {step === 1 ? "Volver" : "Cambiar industria"}
              </button>
              <button
                onClick={() => {
                  if (step === 1 && industry) setStep(2);
                  else if (step === 2 && modules.length > 0) setStep(3);
                }}
                disabled={step === 1 ? !industry : modules.length === 0}
                className={`g-aurora text-white font-semibold px-8 py-3 rounded-xl text-sm transition-all ${
                  (step === 1 ? !!industry : modules.length > 0) ? "hover:opacity-90" : "opacity-30 cursor-not-allowed"
                }`}>
                {step === 1 ? "Elegir módulos →" : "Ver resumen →"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
