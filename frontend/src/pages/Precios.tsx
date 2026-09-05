import { useState } from "react";
import { useNavigate } from "react-router-dom";

const PLANS = [
  {
    name: "Básico",
    price: "$25",
    period: "/mes",
    desc: "Para negocios que están comenzando",
    color: "border-white/5",
    features: [
      "Acceso web + versión móvil",
      "3 módulos esenciales",
      "1 sucursal",
      "Hasta 3 usuarios",
      "Reportes básicos",
      "Soporte por correo",
    ],
    cta: "Comenzar ahora",
    highlight: false,
  },
  {
    name: "Estándar",
    price: "$35",
    period: "/mes",
    desc: "Para negocios en crecimiento",
    color: "border-teal-500/40",
    features: [
      "Acceso web + versión móvil",
      "6 módulos a elegir",
      "Hasta 3 sucursales",
      "Hasta 10 usuarios",
      "Reportes avanzados",
      "Facturación electrónica",
      "Soporte prioritario",
    ],
    cta: "Empezar ahora",
    highlight: true,
  },
  {
    name: "Full",
    price: "$60",
    period: "/mes",
    desc: "Para operaciones de gran escala",
    color: "border-white/5",
    features: [
      "Acceso web + versión móvil",
      "Módulos ilimitados",
      "Sucursales ilimitadas",
      "Usuarios ilimitados",
      "BI y analítica avanzada",
      "Integraciones contables",
      "Capacitación incluida",
      "Soporte 24/7",
    ],
    cta: "Solicitar demo",
    highlight: false,
  },
];

const FAQ = [
  { q: "¿Puedo cambiar de plan después?", a: "Sí, puedes subir o bajar de plan en cualquier momento. El cambio aplica en el siguiente ciclo de facturación." },
  { q: "¿Cuánto tarda la implementación?", a: "La mayoría de nuestros clientes están operando en menos de 2 semanas. Incluimos capacitación y acompañamiento inicial." },
  { q: "¿Los datos son seguros?", a: "Todos los datos se almacenan cifrados en servidores con respaldo diario. Cumplimos con estándares internacionales de seguridad." },
  { q: "¿Necesito instalar algo?", a: "No. Aurora Plus funciona 100% desde el navegador. La versión móvil también es web, sin necesidad de descargar apps." },
  { q: "¿Qué pasa si necesito más módulos de los incluidos?", a: "Puedes agregar módulos adicionales a tu plan o actualizar al siguiente nivel. Nuestro equipo te ayuda a encontrar la opción más conveniente." },
  { q: "¿Ofrecen descuentos por pago anual?", a: "Sí, contamos con descuentos especiales para planes anuales. Contáctanos para obtener tu cotización personalizada." },
];

export default function Precios() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const navigate = useNavigate();

  return (
    <main className="pt-28 pb-24 relative">

      {/* Header */}
      <section className="px-4 sm:px-6 max-w-7xl mx-auto text-center mb-16">
        <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 text-xs text-violet-300 mb-6 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          Sin contratos de permanencia
        </div>
        <h1 className="font-['Outfit'] font-black text-5xl sm:text-6xl lg:text-7xl leading-tight tracking-tight text-white mb-5">
          Planes simples,<br />
          <span className="text-aurora">precios transparentes</span>
        </h1>
        <p className="text-white/45 text-lg max-w-xl mx-auto leading-relaxed">
          Desde $25 al mes. Sin cobros ocultos, sin letra pequeña. Cancela cuando quieras.
        </p>
      </section>

      {/* Plans */}
      <section className="px-4 sm:px-6 max-w-5xl mx-auto mb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map((plan) => (
            <div key={plan.name}
              className={`relative rounded-2xl p-7 flex flex-col transition-all ${
                plan.highlight
                  ? "bg-gradient-to-b from-[#171740] to-[#0c0c20] border-2 border-teal-500/40 scale-[1.03] glow-teal"
                  : "bg-[#0c0c20] border border-white/5 hover:border-white/15"
              }`}>
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 g-aurora text-white text-[11px] font-bold px-4 py-1.5 rounded-full whitespace-nowrap">
                  MÁS POPULAR
                </div>
              )}

              <div className="mb-6">
                <h2 className="font-['Outfit'] font-bold text-white text-2xl">{plan.name}</h2>
                <p className="text-white/35 text-xs mt-0.5">{plan.desc}</p>
                <div className="mt-5 flex items-end gap-1">
                  <span className="font-['Outfit'] font-black text-5xl text-white leading-none">{plan.price}</span>
                  <span className="text-white/35 text-base mb-1">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-white/60">
                    <span className="mt-0.5 w-4 h-4 rounded-full bg-teal-500/15 text-teal-400 flex items-center justify-center text-[10px] flex-shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-all ${
                plan.highlight
                  ? "g-aurora text-white hover:opacity-90"
                  : "border border-white/10 text-white/60 hover:border-white/30 hover:text-white"
              }`}>
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Web page service */}
      <section className="px-4 sm:px-6 max-w-5xl mx-auto mb-20">
        <div className="relative bg-gradient-to-br from-[#16102a] to-[#0c0c20] border border-violet-500/25 rounded-3xl overflow-hidden p-8 sm:p-12">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500 to-transparent" />
          <div className="absolute inset-0 opacity-15"
            style={{ background: "radial-gradient(ellipse at 80% 50%, rgba(168,85,247,0.4) 0%, transparent 60%)" }} />

          <div className="relative flex flex-col lg:flex-row items-start gap-8">
            <div className="flex-1">
              <div className="inline-block bg-violet-500/15 border border-violet-500/30 rounded-full px-3 py-1 text-xs text-violet-300 font-semibold tracking-widest uppercase mb-4">
                Servicio adicional
              </div>
              <h2 className="font-['Outfit'] font-bold text-3xl sm:text-4xl text-white mb-3">
                Página Web Profesional
              </h2>
              <p className="text-white/50 text-base leading-relaxed mb-6 max-w-lg">
                Diseño personalizado con tu identidad de marca, catálogo de productos o servicios, y ventana de pagos integrada. Tu presencia digital, lista para vender.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {[
                  "Diseño 100% personalizado",
                  "Catálogo de productos / servicios",
                  "Pasarela de pagos integrada",
                  "Dominio y hosting incluido",
                  "Optimización SEO para Google",
                  "Integración con Aurora Plus",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-white/55">
                    <span className="w-4 h-4 rounded-full bg-violet-500/15 text-violet-400 flex items-center justify-center text-[10px] flex-shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex-shrink-0 lg:w-56 flex flex-col items-center justify-center bg-white/3 border border-white/8 rounded-2xl p-8 text-center">
              <div className="font-['Outfit'] font-black text-3xl text-aurora mb-1">Cotizable</div>
              <div className="text-white/35 text-xs mb-6">Precio según requerimientos</div>
              <button className="w-full bg-violet-500/15 border border-violet-500/30 text-violet-300 hover:bg-violet-500/25 py-3 rounded-xl text-sm font-semibold transition-all">
                Solicitar cotización
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 sm:px-6 max-w-3xl mx-auto">
        <h2 className="font-['Outfit'] font-bold text-3xl text-white text-center mb-10">
          Preguntas frecuentes
        </h2>
        <div className="space-y-3">
          {FAQ.map((item, i) => (
            <div key={i}
              className="bg-[#0c0c20] border border-white/5 rounded-2xl overflow-hidden transition-all">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left">
                <span className="text-white/80 text-sm font-medium pr-4">{item.q}</span>
                <span className={`text-teal-400 text-lg transition-transform flex-shrink-0 ${openFaq === i ? "rotate-45" : ""}`}>+</span>
              </button>
              {openFaq === i && (
                <div className="px-6 pb-5">
                  <div className="h-px bg-white/5 mb-4" />
                  <p className="text-white/45 text-sm leading-relaxed">{item.a}</p>
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
