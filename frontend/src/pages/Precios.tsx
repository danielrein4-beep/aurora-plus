import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SpecularButton from "../components/SpecularButton";
import { IconCheck } from "../Icons";

// La única diferencia entre períodos es el descuento por compromiso más largo,
// no qué módulos incluye — eso lo define el plan (Básico vs Full).
const PERIODOS = [
  { id: "mensual", label: "Mensual", meses: 1, descuento: 0 },
  { id: "semestral", label: "Semestral", meses: 6, descuento: 0.10 },
  { id: "anual", label: "Anual", meses: 12, descuento: 0.15 },
] as const;

const PLANES = [
  {
    id: "basico",
    nombre: "Aurora Básico",
    precioBase: 25,
    tagline: "Lo esencial para dejar de operar a mano",
    destacado: false,
    features: [
      "Módulos base de tu vertical (POS/agenda, inventario, caja)",
      "Acceso web + versión móvil",
      "Sin costo extra por usuario adicional",
      "Multi-moneda (USD · VES · COP)",
      "Reportes esenciales",
      "Offline con sincronización automática",
    ],
    nota: "",
  },
  {
    id: "full",
    nombre: "Aurora Full",
    precioBase: 40,
    tagline: "Todo lo del Básico + nuestras herramientas más fuertes",
    destacado: true,
    features: [
      "Todo lo incluido en Aurora Básico",
      "Comercio: catálogo público + asistente de IA por WhatsApp",
      "Mediclinic/Odontología: vademécum y récipe médico oficial en PDF",
      "Ganadería: mapa satelital de potreros y básculas bluetooth",
      "Reportes y BI avanzado",
      "Acompañamiento directo del equipo fundador",
    ],
    nota: "Mediclinic Pro Full: $50/mes (incluye vademécum, récipe oficial y firma electrónica).",
  },
] as const;

const FAQ = [
  { q: "¿Puedo cambiar de período de facturación después?", a: "Sí, puedes pasar de mensual a semestral o anual (o al revés) cuando quieras. El cambio aplica en el siguiente ciclo de facturación." },
  { q: "¿Cuánto tarda la implementación?", a: "Nuestra meta es tenerte operando en menos de 2 semanas, con capacitación y acompañamiento directo incluidos." },
  { q: "¿Los datos son seguros?", a: "Toda la comunicación va cifrada (HTTPS), las contraseñas nunca se guardan en texto plano, y la base de datos tiene respaldo automático diario." },
  { q: "¿Necesito instalar algo?", a: "No. Aurora Plus funciona 100% desde el navegador. La versión móvil también es web, sin necesidad de descargar apps." },
  { q: "¿Cuál es la diferencia entre Básico y Full?", a: "Básico trae los módulos esenciales de tu vertical (punto de venta o agenda, inventario, caja). Full agrega nuestras herramientas más fuertes: catálogo con IA por WhatsApp en Comercio, récipe médico y vademécum en Mediclinic/Odontología, y mapa satelital con básculas bluetooth en Ganadería." },
  { q: "¿Ofrecen descuentos por pago semestral o anual?", a: "Sí: 10% de descuento pagando cada 6 meses, y 15% pagando anual, en cualquiera de los dos planes." },
  { q: "¿Puedo empezar en Básico y subir a Full después?", a: "Sí, puedes subir de plan cuando quieras — el cambio aplica en tu siguiente ciclo de facturación." },
];

export default function Precios() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [periodoId, setPeriodoId] = useState<(typeof PERIODOS)[number]["id"]>("mensual");
  const navigate = useNavigate();

  const periodo = PERIODOS.find((p) => p.id === periodoId) ?? PERIODOS[0];

  return (
    <main className="aurora-public-page pt-32 pb-24 relative">

      {/* Header */}
      <section className="px-4 sm:px-6 max-w-7xl mx-auto text-center mb-16">
        <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 text-xs text-violet-600 dark:text-violet-300 mb-6 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          Sin contratos de permanencia
        </div>
        <h1 className="font-['Outfit'] font-black text-5xl sm:text-6xl lg:text-7xl leading-tight tracking-tight text-slate-900 dark:text-white mb-5">
          Dos planes claros,<br />
          <span className="text-aurora">sin letra pequeña</span>
        </h1>
        <p className="text-slate-500 dark:text-white/45 text-lg max-w-xl mx-auto leading-relaxed">
          Desde $25 al mes con lo esencial de tu vertical. Sube a Full desde $40 y desbloquea nuestras herramientas más fuertes. Cancela cuando quieras.
        </p>
      </section>

      {/* Dos planes con selector de período */}
      <section className="px-4 sm:px-6 max-w-5xl mx-auto mb-20">
        {/* Selector de período de facturación */}
        <div className="flex items-center justify-center gap-1.5 mb-10 p-1.5 rounded-2xl bg-white/5 border border-white/10 max-w-md mx-auto">
          {PERIODOS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriodoId(p.id)}
              className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                periodoId === p.id
                  ? "g-aurora text-white shadow-md"
                  : "text-white/60 hover:text-white"
              }`}
            >
              {p.label}
              {p.descuento > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  periodoId === p.id ? "bg-white/20" : "bg-teal-500/15 text-teal-300"
                }`}>
                  -{Math.round(p.descuento * 100)}%
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-stretch">
          {PLANES.map((plan) => {
            const precioMensualConDescuento = plan.precioBase * (1 - periodo.descuento);
            const totalPeriodo = precioMensualConDescuento * periodo.meses;
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-8 sm:p-10 flex flex-col items-center text-center apple-glass shadow-2xl ${
                  plan.destacado ? "border-2 border-teal-500/50 sm:scale-[1.03]" : "border border-slate-300/60 dark:border-white/10"
                }`}
              >
                {plan.destacado && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 g-aurora text-white text-[11px] font-bold px-4 py-1.5 rounded-full whitespace-nowrap shadow-md">
                    LO MÁS FUERTE DE AURORA
                  </div>
                )}

                <h2 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-2xl mb-1">{plan.nombre}</h2>
                <p className="text-slate-500 dark:text-white/35 text-xs mb-5">{plan.tagline}</p>

                <div className="flex items-end gap-1 mb-1">
                  <span className="font-['Outfit'] font-black text-6xl text-slate-900 dark:text-white leading-none">
                    ${precioMensualConDescuento.toFixed(2).replace(/\.00$/, "")}
                  </span>
                  <span className="text-slate-500 dark:text-white/35 text-base mb-2">/mes</span>
                </div>

                {periodo.descuento > 0 ? (
                  <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold mb-6">
                    Facturado {periodo.meses === 6 ? "cada 6 meses" : "una vez al año"}: ${totalPeriodo.toFixed(2).replace(/\.00$/, "")} total
                    <span className="text-slate-400 dark:text-white/30 font-normal"> (antes ${(plan.precioBase * periodo.meses).toFixed(0)})</span>
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-white/30 mb-6">Facturado mes a mes</p>
                )}

                <ul className="space-y-3 mb-8 w-full max-w-xs text-left flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-slate-700 dark:text-white/60 font-medium">
                      <span className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${plan.destacado ? "bg-teal-500/15 text-teal-600 dark:text-teal-400" : "bg-slate-500/15 text-slate-600 dark:text-white/60"}`}><IconCheck size={9} /></span>
                      {f}
                    </li>
                  ))}
                </ul>

                <SpecularButton
                  size="md"
                  radius={12}
                  tint={plan.destacado ? "#35d7c3" : "#ffffff"}
                  tintOpacity={plan.destacado ? 0.16 : 0}
                  textColor={plan.destacado ? "#ffffff" : "#f8f6ef"}
                  lineColor={plan.destacado ? "#7cf3e3" : "#ffffff"}
                  baseColor={plan.destacado ? "#0f766e" : "#4b4b4b"}
                  shineSize={12}
                  shineFade={45}
                  intensity={1.3}
                  proximity={280}
                  className="w-full max-w-xs"
                  onClick={() => navigate("/onboarding")}
                >
                  {plan.destacado ? "Quiero Aurora Full" : "Comenzar con Básico"}
                </SpecularButton>

                {plan.nota && (
                  <p className="mt-4 text-[11px] text-slate-400 dark:text-white/30 max-w-xs leading-relaxed">
                    {plan.nota}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Web page service */}
      <section className="px-4 sm:px-6 max-w-5xl mx-auto mb-20">
        <div className="relative apple-glass border border-violet-500/30 rounded-3xl overflow-hidden p-8 sm:p-12 shadow-xl">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500 to-transparent" />
          <div className="absolute inset-0 opacity-15"
            style={{ background: "radial-gradient(ellipse at 80% 50%, rgba(168,85,247,0.4) 0%, transparent 60%)" }} />

          <div className="relative flex flex-col lg:flex-row items-start gap-8">
            <div className="flex-1">
              <div className="inline-block bg-violet-500/15 border border-violet-500/30 rounded-full px-3 py-1 text-xs text-violet-600 dark:text-violet-300 font-semibold tracking-widest uppercase mb-4">
                Servicio adicional
              </div>
              <h2 className="font-['Outfit'] font-bold text-3xl sm:text-4xl text-slate-900 dark:text-white mb-3">
                Página Web Profesional
              </h2>
              <p className="text-slate-500 dark:text-white/50 text-base leading-relaxed mb-6 max-w-lg">
                Diseño personalizado con tu identidad de marca, catálogo de productos o servicios, y ventana de pagos integrada. Tu presencia digital, lista para vender.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {[
                  "Diseño 100% personalizado",
                  "Catálogo de productos / servicios",
                  "Pasarela de pagos integrada",
                  "Dominio y hosting incluido por 1 año",
                  "Optimizado para celulares",
                  "Panel auto-administrable",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-white/60 font-medium">
                    <span className="w-4 h-4 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center flex-shrink-0"><IconCheck size={9} /></span>
                    {item}
                  </li>
                ))}
              </ul>
              <SpecularButton
                size="md"
                radius={12}
                tint="#a855f7"
                tintOpacity={0.22}
                textColor="#ffffff"
                lineColor="#e9d5ff"
                baseColor="#7c3aed"
                shineSize={12}
                shineFade={45}
                intensity={1.3}
                proximity={280}
                onClick={() => navigate("/nosotros")}
              >
                Cotizar mi página web →
              </SpecularButton>
            </div>
            <div className="lg:w-64 flex-shrink-0 apple-glass rounded-2xl p-6 text-center border border-violet-500/20">
              <div className="text-slate-500 dark:text-white/35 text-xs mb-1 font-medium">Inversión única</div>
              <div className="font-['Outfit'] font-black text-3xl text-slate-900 dark:text-white mb-1">Cotizable</div>
              <div className="text-xs text-violet-600 dark:text-violet-400 mb-4 font-semibold">según requerimientos</div>
              <div className="text-slate-500 dark:text-white/30 text-xs leading-relaxed">
                Entrega estimada en 7–14 días hábiles con soporte post-lanzamiento.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 sm:px-6 max-w-3xl mx-auto">
        <h2 className="font-['Outfit'] font-bold text-3xl text-slate-900 dark:text-white text-center mb-10">Preguntas Frecuentes</h2>
        <div className="space-y-3">
          {FAQ.map((faq, i) => (
            <div key={i}
              className="apple-glass rounded-2xl overflow-hidden transition-all shadow-sm">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full text-left p-5 flex items-center justify-between gap-4 cursor-pointer">
                <span className="font-['Outfit'] font-semibold text-slate-900 dark:text-white text-base">{faq.q}</span>
                <span className={`text-slate-400 dark:text-white/40 text-lg transition-transform ${openFaq === i ? "rotate-45" : ""}`}>+</span>
              </button>
              {openFaq === i && (
                <div className="px-5 pb-5 text-slate-500 dark:text-white/50 text-sm leading-relaxed border-t border-slate-200/60 dark:border-white/5 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-4 sm:px-6 max-w-3xl mx-auto text-center mt-20">
        <p className="text-white/35 text-sm mb-4">¿Tienes dudas sobre qué plan es el adecuado para ti?</p>
        <button
          onClick={() => navigate("/nosotros")}
          className="text-teal-400 hover:text-teal-300 transition-colors text-sm font-medium">
          Hablar con nuestro equipo →
        </button>
      </section>
    </main>
  );
}
