import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuroraLogo from "../AuroraLogo";
import { AuroraGradientDef } from "../Icons";
import { useAuth } from "../context/AuthContext";

interface IndustryItem {
  id: string;
  label: string;
  icon: string;
  desc: string;
  badge: string;
  isReady: boolean;
  tagline?: string;
}

const INDUSTRIES: IndustryItem[] = [
  {
    id: "clinica",
    label: "Clínica & Salud",
    icon: "🏥",
    desc: "Historias clínicas, triaje, agenda médica y facturación",
    badge: "⚡ 100% DISPONIBLE (Listo)",
    isReady: true,
    tagline: "Vertical Insignia: Mediclinic Pro",
  },
  {
    id: "veterinaria",
    label: "Veterinaria & Mascotas",
    icon: "🐾",
    desc: "Consultas, vacunas, hospitalización y control de peso",
    badge: "🔒 Próximamente (Fase 2)",
    isReady: false,
  },
  {
    id: "ferreteria",
    label: "Ferretería & Materiales",
    icon: "🔧",
    desc: "Control de stock, POS mostrador, compras y créditos",
    badge: "🔒 Próximamente (Fase 2)",
    isReady: false,
  },
  {
    id: "restaurante",
    label: "Restaurante & Gastronomía",
    icon: "🍽️",
    desc: "Comandas digitales, pantalla de cocina y mesas",
    badge: "🔒 Próximamente (Fase 2)",
    isReady: false,
  },
  {
    id: "finca",
    label: "Control de Fincas & Ganado",
    icon: "🌿",
    desc: "Lotes de ganado, pesaje, potreros y vacunación",
    badge: "🔒 Próximamente (Fase 2)",
    isReady: false,
  },
  {
    id: "mineria",
    label: "Minería & Maquinaria",
    icon: "⛏️",
    desc: "Control de horas máquina, turnos y seguridad industrial",
    badge: "🔒 Próximamente (Fase 2)",
    isReady: false,
  },
  {
    id: "educacion",
    label: "Educación & Colegios",
    icon: "🎓",
    desc: "Matrículas, calificaciones, boletines y pagos",
    badge: "🔒 Próximamente (Fase 2)",
    isReady: false,
  },
  {
    id: "retail",
    label: "Retail & Comercio",
    icon: "🛒",
    desc: "Punto de venta multi-caja y fidelización",
    badge: "🔒 Próximamente (Fase 2)",
    isReady: false,
  },
  {
    id: "construccion",
    label: "Construcción & Obras",
    icon: "🏗️",
    desc: "Avance de obra, presupuestos y compras de insumos",
    badge: "🔒 Próximamente (Fase 2)",
    isReady: false,
  },
  {
    id: "otro",
    label: "Otro Rubro Comercial",
    icon: "✦",
    desc: "Arquitectura modular para industrias a medida",
    badge: "🔒 Lista de Espera",
    isReady: false,
  },
];

const CLINIC_MODULES = [
  { id: "expedientes", label: "Historia Clínica Digital & Triaje", desc: "Antecedentes, diagnósticos CIE-10 y prescripción electrónica", defaultOn: true },
  { id: "agenda", label: "Agenda de Citas & Especialistas", desc: "Turnos por consultorio, sala de espera reactiva y recordatorios", defaultOn: true },
  { id: "farmacia", label: "Farmacia & Control de Insumos", desc: "Dispensación de medicamentos, stock mínimo y alertas", defaultOn: true },
  { id: "factura", label: "Facturación & Cierres Multi-Moneda", desc: "Cobros en USD/VES a tasa oficial BCV, recibos y caja diaria", defaultOn: true },
  { id: "reportes", label: "Generador de Informes Médicos PDF", desc: "Descarga de reportes clínicos con membrete y firma digital", defaultOn: true },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, completeOnboarding } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedIndustry, setSelectedIndustry] = useState<string>("clinica");
  const [empresaNombre, setEmpresaNombre] = useState<string>(user?.empresa || "Clínica & Consultorios Médicos");
  const [modules, setModules] = useState<string[]>(CLINIC_MODULES.map((m) => m.id));
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);

  const handleSelectIndustry = (ind: IndustryItem) => {
    if (!ind.isReady) {
      setLockedNotice(
        `El rubro "${ind.label}" está en fase de desarrollo con candado 🔒. La vertical insignia actualmente lista y operativa es Mediclinic Pro (Clínica & Salud). Puedes probar Mediclinic Pro ahora mismo.`
      );
      return;
    }
    setLockedNotice(null);
    setSelectedIndustry(ind.id);
  };

  const toggleModule = (id: string) => {
    setModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleActivate = () => {
    completeOnboarding({
      industry: "clinica",
      empresa: empresaNombre.trim() || "Clínica & Consultorios Médicos",
      modules: modules.length > 0 ? modules : CLINIC_MODULES.map((m) => m.id),
      plan: "Estándar",
      planStatus: "trial",
      hasCompletedOnboarding: true,
    });
    navigate("/dashboard");
  };

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
            Paso {step} de 3 · Selección de Rubro & Arquitectura
          </p>
        </div>

        {/* Barra de progreso de pasos */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {[
            { num: 1, label: "1. Elegir Rubro" },
            { num: 2, label: "2. Módulos Activos" },
            { num: 3, label: "3. Activación" },
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
                  Actualmente <strong className="text-teal-400">Mediclinic Pro</strong> está 100% habilitado y listo para operar. Las demás verticales se encuentran en proceso de despliegue con candado 🔒.
                </p>
              </div>

              {/* Banner de aviso si hizo clic en un rubro con candado */}
              {lockedNotice && (
                <div className="apple-glass rounded-2xl p-4 border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs sm:text-sm flex items-start gap-3 animate-fade-in shadow-lg">
                  <span className="text-xl">⚠️</span>
                  <div className="flex-1">
                    <p className="font-semibold text-amber-300 mb-1">Módulo en Desarrollo</p>
                    <p className="text-white/80 leading-relaxed">{lockedNotice}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedIndustry("clinica");
                        setLockedNotice(null);
                      }}
                      className="mt-2.5 px-3 py-1.5 rounded-lg bg-teal-500 text-black font-bold text-xs hover:bg-teal-400 transition-all flex items-center gap-1.5"
                    >
                      <span>🏥</span> Seleccionar Mediclinic Pro (Listo para usar)
                    </button>
                  </div>
                  <button
                    onClick={() => setLockedNotice(null)}
                    className="text-white/40 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Grid de rubros con indicación clara de candado y disponibilidad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[380px] overflow-y-auto pr-1">
                {INDUSTRIES.map((ind) => {
                  const isSelected = selectedIndustry === ind.id;
                  return (
                    <button
                      key={ind.id}
                      type="button"
                      onClick={() => handleSelectIndustry(ind)}
                      className={`relative flex items-start gap-3.5 p-4 rounded-2xl border text-left transition-all duration-300 ${
                        ind.isReady
                          ? isSelected
                            ? "bg-gradient-to-r from-teal-500/20 via-cyan-500/15 to-purple-500/20 border-teal-400/80 shadow-[0_0_25px_rgba(0,242,254,0.3)] scale-[1.01]"
                            : "bg-teal-950/20 border-teal-500/30 hover:border-teal-400/60 hover:bg-teal-900/30 text-white"
                          : "bg-white/[0.02] border-white/10 opacity-60 hover:opacity-85 hover:border-white/20 cursor-pointer"
                      }`}
                    >
                      {/* Icono */}
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                          ind.isReady
                            ? "bg-teal-400/15 border border-teal-400/30 shadow-inner"
                            : "bg-white/5 border border-white/10"
                        }`}
                      >
                        {ind.icon}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-bold text-sm truncate ${ind.isReady ? "text-white" : "text-white/70"}`}>
                            {ind.label}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold flex-shrink-0 ${
                              ind.isReady
                                ? "bg-teal-400/20 text-teal-300 border border-teal-400/40 animate-pulse"
                                : "bg-white/10 text-white/40 border border-white/10"
                            }`}
                          >
                            {ind.badge}
                          </span>
                        </div>
                        <p className="text-xs text-white/50 mt-1 leading-snug">
                          {ind.desc}
                        </p>
                        {ind.tagline && (
                          <div className="text-[11px] font-semibold text-teal-300 mt-1.5 flex items-center gap-1">
                            <span>✦</span> {ind.tagline}
                          </div>
                        )}
                      </div>

                      {/* Check / Lock indicator */}
                      <div className="flex-shrink-0 self-center">
                        {ind.isReady ? (
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                              isSelected
                                ? "bg-teal-400 text-black font-black text-xs shadow-[0_0_10px_#00f2fe]"
                                : "border border-teal-400/40 text-transparent"
                            }`}
                          >
                            ✓
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs text-white/40">
                            🔒
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
                  disabled={selectedIndustry !== "clinica"}
                  className={`btn-cyber-neon text-white font-bold px-7 py-3 rounded-full text-sm flex items-center gap-2 cursor-pointer ${
                    selectedIndustry === "clinica" ? "" : "opacity-40 cursor-not-allowed"
                  }`}
                >
                  Continuar a Selección de Módulos →
                </button>
              </div>
            </div>
          )}

          {/* ════════════ PASO 2: SELECCIONAR MÓDULOS DE MEDICLINIC PRO ════════════ */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <div className="inline-block px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-[11px] font-mono uppercase tracking-wider mb-2">
                  Paso 2 · Arquitectura Médica
                </div>
                <h2 className="font-['Outfit'] font-black text-2xl sm:text-3xl text-white leading-tight">
                  Personaliza tu Clínica o Consultorio
                </h2>
                <p className="text-white/50 text-sm mt-1">
                  Indica el nombre de tu centro de salud y activa los módulos que utilizará tu equipo médico.
                </p>
              </div>

              {/* Nombre de la clínica */}
              <div>
                <label className="block text-white/50 text-[11px] font-medium uppercase tracking-wider mb-1.5">
                  Nombre de la Clínica / Consultorio / Doctor
                </label>
                <input
                  type="text"
                  placeholder="Ej. Centro Médico Especializado San Cristóbal"
                  value={empresaNombre}
                  onChange={(e) => setEmpresaNombre(e.target.value)}
                  className="w-full bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 focus:border-teal-400/60 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none transition-all shadow-inner"
                />
              </div>

              {/* Lista de módulos */}
              <div className="space-y-2.5">
                <label className="block text-white/50 text-[11px] font-medium uppercase tracking-wider">
                  Módulos de Mediclinic Pro habilitados ({modules.length}/{CLINIC_MODULES.length})
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  {CLINIC_MODULES.map((m) => {
                    const isChecked = modules.includes(m.id);
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
                            isChecked ? "bg-teal-400 text-black font-bold text-xs" : "border border-white/20"
                          }`}
                        >
                          {isChecked && "✓"}
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
                  Revisar y Activar Prueba →
                </button>
              </div>
            </div>
          )}

          {/* ════════════ PASO 3: RESUMEN Y ACTIVACIÓN ════════════ */}
          {step === 3 && (
            <div className="text-center space-y-6 py-2">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#00f2fe] via-[#7928ca] to-[#ff007f] p-0.5 shadow-[0_0_30px_rgba(0,242,254,0.5)]">
                  <div className="w-full h-full bg-[#0d131f] rounded-2xl flex items-center justify-center text-2xl">
                    🏥
                  </div>
                </div>
              </div>

              <div>
                <h2 className="font-['Outfit'] font-black text-2xl sm:text-3xl text-white">
                  ¡Todo Listo para tu Clínica!
                </h2>
                <p className="text-white/50 text-sm mt-1 max-w-md mx-auto">
                  Tu entorno privado en <strong>Aurora Hub</strong> ha sido preparado con la vertical{" "}
                  <strong className="text-teal-300">Mediclinic Pro</strong>.
                </p>
              </div>

              {/* Resumen de configuración */}
              <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 text-left space-y-3.5 max-w-md mx-auto shadow-inner">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40 uppercase tracking-wider font-mono">Organización:</span>
                  <span className="text-white font-bold">{empresaNombre || "Centro Médico Pro"}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40 uppercase tracking-wider font-mono">Vertical:</span>
                  <span className="text-teal-300 font-semibold flex items-center gap-1">
                    <span>🏥</span> Mediclinic Pro (Clínica & Salud)
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
                  <span className="text-emerald-400 font-bold">14 días de acceso completo</span>
                </div>
              </div>

              <div className="space-y-3 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={handleActivate}
                  className="w-full btn-cyber-neon text-white font-bold py-4 rounded-full text-base shadow-[0_0_30px_rgba(255,59,128,0.4)] cursor-pointer"
                >
                  Entrar a Mediclinic Pro en Aurora Hub →
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

