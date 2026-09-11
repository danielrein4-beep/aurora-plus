import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconCheck } from "../Icons";

const PRECIO_BASE_MENSUAL = 25;

// Un solo plan, acceso completo — la única diferencia entre opciones es el período de
// facturación y el descuento por compromiso más largo, no qué módulos incluye.
const PERIODOS = [
  { id: "mensual", label: "Mensual", meses: 1, descuento: 0 },
  { id: "semestral", label: "Semestral", meses: 6, descuento: 0.10 },
  { id: "anual", label: "Anual", meses: 12, descuento: 0.15 },
] as const;

const FEATURES_PLAN_UNICO = [
  "Acceso a TODOS los módulos, sin excepción",
  "Acceso web + versión móvil",
  "Sin costo extra por usuario adicional",
  "Multi-moneda (USD · VES · COP)",
  "Reportes y BI avanzado",
  "Acompañamiento directo del equipo fundador",
];

const FAQ = [
  { q: "¿Puedo cambiar de período de facturación después?", a: "Sí, puedes pasar de mensual a semestral o anual (o al revés) cuando quieras. El cambio aplica en el siguiente ciclo de facturación." },
  { q: "¿Cuánto tarda la implementación?", a: "Nuestra meta es tenerte operando en menos de 2 semanas, con capacitación y acompañamiento directo incluidos." },
  { q: "¿Los datos son seguros?", a: "Toda la comunicación va cifrada (HTTPS), las contraseñas nunca se guardan en texto plano, y la base de datos tiene respaldo automático diario." },
  { q: "¿Necesito instalar algo?", a: "No. Aurora Plus funciona 100% desde el navegador. La versión móvil también es web, sin necesidad de descargar apps." },
  { q: "¿Hay un plan con menos módulos y más barato?", a: "No — el plan es único y siempre incluye acceso completo a todos los módulos. Así nunca te quedas corto ni tienes que negociar un upgrade." },
  { q: "¿Ofrecen descuentos por pago semestral o anual?", a: "Sí: 10% de descuento pagando cada 6 meses, y 15% pagando anual — el precio se aplica automáticamente al elegir el período arriba." },
];

export default function Precios() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [periodoId, setPeriodoId] = useState<(typeof PERIODOS)[number]["id"]>("mensual");
  const navigate = useNavigate();

  const periodo = PERIODOS.find((p) => p.id === periodoId) ?? PERIODOS[0];
  const precioMensualConDescuento = PRECIO_BASE_MENSUAL * (1 - periodo.descuento);
  const totalPeriodo = precioMensualConDescuento * periodo.meses;

  return (
    <main className="pt-28 pb-24 relative">

      {/* Header */}
      <section className="px-4 sm:px-6 max-w-7xl mx-auto text-center mb-16">
        <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 text-xs text-violet-600 dark:text-violet-300 mb-6 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          Sin contratos de permanencia
        </div>
        <h1 className="font-['Outfit'] font-black text-5xl sm:text-6xl lg:text-7xl leading-tight tracking-tight text-slate-900 dark:text-white mb-5">
          Un solo plan,<br />
          <span className="text-aurora">acceso completo</span>
        </h1>
        <p className="text-slate-500 dark:text-white/45 text-lg max-w-xl mx-auto leading-relaxed">
          Desde $25 al mes con acceso a TODOS los módulos — sin niveles, sin funciones bloqueadas. Cancela cuando quieras.
        </p>
      </section>

      {/* Plan único con selector de período */}
      <section className="px-4 sm:px-6 max-w-2xl mx-auto mb-20">
        {/* Selector de período de facturación */}
        <div className="flex items-center justify-center gap-1.5 mb-8 p-1.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 max-w-md mx-auto">
          {PERIODOS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriodoId(p.id)}
              className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                periodoId === p.id
                  ? "g-aurora text-white shadow-md"
                  : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {p.label}
              {p.descuento > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  periodoId === p.id ? "bg-white/20" : "bg-teal-500/15 text-teal-600 dark:text-teal-400"
                }`}>
                  -{Math.round(p.descuento * 100)}%
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative rounded-2xl p-8 sm:p-10 flex flex-col items-center text-center apple-glass border-2 border-teal-500/50 shadow-2xl">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 g-aurora text-white text-[11px] font-bold px-4 py-1.5 rounded-full whitespace-nowrap shadow-md">
            TODO INCLUIDO
          </div>

          <h2 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-2xl mb-1">Aurora Plus</h2>
          <p className="text-slate-500 dark:text-white/35 text-xs mb-5">Para cualquier negocio, sin importar el tamaño</p>

          <div className="flex items-end gap-1 mb-1">
            <span className="font-['Outfit'] font-black text-6xl text-slate-900 dark:text-white leading-none">
              ${precioMensualConDescuento.toFixed(2).replace(/\.00$/, "")}
            </span>
            <span className="text-slate-500 dark:text-white/35 text-base mb-2">/mes</span>
          </div>

          {periodo.descuento > 0 ? (
            <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold mb-6">
              Facturado {periodo.meses === 6 ? "cada 6 meses" : "una vez al año"}: ${totalPeriodo.toFixed(2).replace(/\.00$/, "")} total
              <span className="text-slate-400 dark:text-white/30 font-normal"> (antes ${(PRECIO_BASE_MENSUAL * periodo.meses).toFixed(0)})</span>
            </p>
          ) : (
            <p className="text-xs text-slate-400 dark:text-white/30 mb-6">Facturado mes a mes</p>
          )}

          <ul className="space-y-3 mb-8 w-full max-w-xs text-left">
            {FEATURES_PLAN_UNICO.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm text-slate-700 dark:text-white/60 font-medium">
                <span className="mt-0.5 w-4 h-4 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0"><IconCheck size={9} /></span>
                {f}
              </li>
            ))}
          </ul>

          <button className="w-full max-w-xs py-3.5 rounded-xl text-sm font-semibold transition-all cursor-pointer g-aurora text-white hover:opacity-90 shadow-md">
            Comenzar ahora
          </button>
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
              <button className="bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold px-8 py-3.5 rounded-xl hover:opacity-90 transition-opacity text-sm shadow-md cursor-pointer">
                Cotizar mi página web →
              </button>
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
