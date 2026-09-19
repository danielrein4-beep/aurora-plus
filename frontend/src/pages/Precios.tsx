import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SpecularButton from "../components/SpecularButton";
import { IconCheck, IconWhatsApp, IconCloud, IconCard, IconLock, IconBolt, IconScale } from "../Icons";

const PRECIO_BASE_MENSUAL = 25;

const PERIODOS = [
  { id: "mensual", label: "Mensual", meses: 1, descuento: 0 },
  { id: "semestral", label: "Semestral", meses: 6, descuento: 0.10 },
  { id: "anual", label: "Anual", meses: 12, descuento: 0.15 },
] as const;

const FEATURES_PLAN_UNICO = [
  "Acceso completo a tu vertical especializada (Comercio, Salud, Odonto, Horeca o Ganaderia)",
  "Usuarios y puestos de trabajo ilimitados (sin cargos por cajero o medico)",
  "Multi-moneda nativa: precios y cobros en USD y Bolivares a tasa oficial BCV",
  "Operatividad offline garantizada ante cortes de luz o internet",
  "Respaldos automaticos diarios en la nube con cifrado HTTPS",
  "Soporte tecnico directo y capacitacion por el equipo fundador",
];

const FEATURES_WHATSAPP_IA = [
  "Conexion con la API oficial de Meta WhatsApp Cloud",
  "Motor de inteligencia artificial Google Gemini 1.5 Flash",
  "Consulta de inventario y stock en tiempo real",
  "Cotizaciones instantaneas en USD y Bs. con tasa BCV del dia",
  "Coordenadas bancarias de Pago Movil aisladas por negocio",
  "1.000 conversaciones de servicio al mes incluidas",
];

const FAQ = [
  {
    q: "Por que tienen un plan unico de $25 al mes?",
    a: "Porque creemos en la honestidad comercial. No te cobramos licencias por cada usuario, cajero, mesonero o medico que agregues, ni bloqueamos funciones esenciales detras de planes 'Enterprise' costosos. Con $25/mes tienes tu operacion completa cubierta."
  },
  {
    q: "Que sucede si se va la luz o el internet en mi local?",
    a: "Aurora Plus incluye arquitectura offline en el navegador (IndexedDB). Tus cajeros pueden seguir registrando cobros, o los medicos y veterinarios pueden seguir consultando historias. Cuando la conexion regresa, el sistema sincroniza todo automaticamente con la base de datos central."
  },
  {
    q: "Como manejan las divisas y la tasa de cambio en Venezuela?",
    a: "El sistema actualiza de forma automatica la tasa oficial del Banco Central de Venezuela (BCV). Puedes configurar precios base en USD y el sistema calcula en tiempo real el monto exacto en Bolivares para emitir tickets, presupuestos o cobrar por Pago Movil."
  },
  {
    q: "Como funciona el Add-on de WhatsApp con Inteligencia Artificial?",
    a: "Se conecta directamente a la linea de WhatsApp de tu empresa mediante la API oficial de Meta y el modelo Google Gemini 1.5 Flash. Cuando un cliente te escribe pidiendo precios, stock o delivery, la IA consulta tu inventario real y responde en segundos. Cuesta $15 adicionales al mes e incluye hasta 1.000 clientes atendidos."
  },
  {
    q: "Hay contratos de permanencia o penalizaciones por cancelar?",
    a: "No. Puedes cancelar tu suscripcion en cualquier momento sin penalizaciones ni letras pequenas. Tus datos siempre te pertenecen y puedes exportarlos cuando lo desees."
  },
  {
    q: "Cuanto tiempo toma empezar a usar el sistema?",
    a: "En menos de 10 minutos tu negocio queda registrado y configurado. Si tienes una lista de productos o pacientes en Excel, te ayudamos a importarla de inmediato."
  },
];

export default function Precios() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [periodoId, setPeriodoId] = useState<(typeof PERIODOS)[number]["id"]>("mensual");
  const navigate = useNavigate();

  const periodo = PERIODOS.find((p) => p.id === periodoId) ?? PERIODOS[0];
  const precioMensualConDescuento = PRECIO_BASE_MENSUAL * (1 - periodo.descuento);
  const totalPeriodo = precioMensualConDescuento * periodo.meses;

  return (
    <main className="aurora-public-page pt-32 pb-24 relative">

      {/* Header */}
      <section className="px-4 sm:px-6 max-w-7xl mx-auto text-center mb-16">
        <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/25 rounded-full px-4 py-1.5 text-xs text-teal-600 dark:text-teal-400 mb-6 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
          Precios transparentes - Cero costos ocultos
        </div>
        <h1 className="font-['Outfit'] font-black text-5xl sm:text-6xl lg:text-7xl leading-tight tracking-tight text-slate-900 dark:text-white mb-5">
          Un solo plan base,<br />
          <span className="text-aurora">operacion completa</span>
        </h1>
        <p className="text-slate-500 dark:text-white/50 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          Desde $25 al mes por negocio con usuarios ilimitados y todas las herramientas de tu vertical. Cancela cuando quieras, sin contratos forzados.
        </p>
      </section>

      {/* Grilla de Planes: Plan Principal + Add-on IA */}
      <section className="px-4 sm:px-6 max-w-5xl mx-auto mb-20">
        
        {/* Selector de periodo de facturacion */}
        <div className="flex items-center justify-center gap-1.5 mb-10 p-1.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 max-w-md mx-auto">
          {PERIODOS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriodoId(p.id)}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                periodoId === p.id
                  ? "bg-slate-900 text-white dark:bg-teal-500 dark:text-slate-950 shadow-md"
                  : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {p.label}
              {p.descuento > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  periodoId === p.id ? "bg-white/20 dark:bg-slate-950/20" : "bg-teal-500/15 text-teal-600 dark:text-teal-300"
                }`}>
                  -{Math.round(p.descuento * 100)}%
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Tarjeta Plan Principal */}
          <div className="lg:col-span-7 relative rounded-3xl p-8 sm:p-10 flex flex-col apple-glass border-2 border-teal-500/60 shadow-2xl">
            <div className="absolute -top-3.5 left-8 g-aurora text-white text-[11px] font-bold px-4 py-1.5 rounded-full whitespace-nowrap shadow-md uppercase tracking-wider font-mono">
              TODO INCLUIDO EN TU VERTICAL
            </div>

            <div className="mb-6 mt-2">
              <h2 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-3xl mb-1">Aurora Plus</h2>
              <p className="text-slate-500 dark:text-white/45 text-xs sm:text-sm">
                Software especializado para Comercio, Salud, Odontologia, Restaurantes o Ganaderia.
              </p>
            </div>

            <div className="flex items-end gap-1 mb-2">
              <span className="font-['Outfit'] font-black text-6xl text-slate-900 dark:text-white leading-none">
                ${precioMensualConDescuento.toFixed(2).replace(/\.00$/, "")}
              </span>
              <span className="text-slate-500 dark:text-white/40 text-base mb-2">/mes</span>
            </div>

            {periodo.descuento > 0 ? (
              <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold mb-6">
                Facturado {periodo.meses === 6 ? "semestralmente" : "anualmente"}: ${totalPeriodo.toFixed(2).replace(/\.00$/, "")} total
                <span className="text-slate-400 dark:text-white/30 font-normal"> (ahorras ${(PRECIO_BASE_MENSUAL * periodo.meses * periodo.descuento).toFixed(0)})</span>
              </p>
            ) : (
              <p className="text-xs text-slate-400 dark:text-white/35 mb-6">Facturacion mensual recurrente sin permanencia</p>
            )}

            <ul className="space-y-3 mb-8 flex-1">
              {FEATURES_PLAN_UNICO.map((f) => (
                <li key={f} className="flex items-start gap-3 text-xs sm:text-sm text-slate-700 dark:text-white/70">
                  <span className="mt-0.5 w-4 h-4 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0">
                    <IconCheck size={10} />
                  </span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <SpecularButton
              size="md"
              radius={12}
              tint="#35d7c3"
              tintOpacity={0.16}
              textColor="#ffffff"
              lineColor="#7cf3e3"
              baseColor="#0f766e"
              shineSize={12}
              shineFade={45}
              intensity={1.3}
              proximity={280}
              className="w-full"
              onClick={() => navigate("/onboarding")}
            >
              Comenzar prueba o activar
            </SpecularButton>
          </div>

          {/* Tarjeta Add-on WhatsApp IA */}
          <div className="lg:col-span-5 relative rounded-3xl p-8 flex flex-col apple-glass border border-slate-300/80 dark:border-white/10 shadow-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-wider bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 self-start mb-4">
              <IconWhatsApp size={14} />
              <span>MODULO ADD-ON</span>
            </div>

            <div className="mb-4">
              <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-2xl mb-1">
                Asistente IA WhatsApp
              </h3>
              <p className="text-slate-500 dark:text-white/45 text-xs">
                Atencion y ventas en piloto automatico 24/7 con Google Gemini 1.5 Flash.
              </p>
            </div>

            <div className="flex items-end gap-1 mb-6">
              <span className="font-['Outfit'] font-black text-5xl text-slate-900 dark:text-white leading-none">
                +$15
              </span>
              <span className="text-slate-500 dark:text-white/40 text-base mb-1">/mes</span>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {FEATURES_WHATSAPP_IA.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-white/70">
                  <span className="mt-0.5 w-4 h-4 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0">
                    <IconCheck size={9} />
                  </span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => navigate("/onboarding")}
              className="w-full py-3.5 rounded-xl text-sm font-semibold bg-slate-900 text-white dark:bg-white/10 dark:text-white hover:bg-slate-800 dark:hover:bg-white/20 transition-all cursor-pointer"
            >
              Agregar a mi suscripcion
            </button>
          </div>

        </div>
      </section>

      {/* Preguntas Frecuentes Honestas */}
      <section className="px-4 sm:px-6 max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold tracking-widest text-teal-600 dark:text-teal-400 uppercase mb-2">Transparencia</p>
          <h2 className="font-['Outfit'] font-bold text-3xl sm:text-4xl text-slate-900 dark:text-white">
            Preguntas Frecuentes
          </h2>
        </div>

        <div className="space-y-3">
          {FAQ.map((faq, i) => (
            <div key={i} className="apple-glass rounded-2xl overflow-hidden transition-all shadow-sm border border-slate-200/80 dark:border-white/10">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full text-left p-5 flex items-center justify-between gap-4 cursor-pointer"
              >
                <span className="font-['Outfit'] font-semibold text-slate-900 dark:text-white text-base">{faq.q}</span>
                <span className={`text-slate-400 dark:text-white/40 text-lg transition-transform ${openFaq === i ? "rotate-45" : ""}`}>+</span>
              </button>
              {openFaq === i && (
                <div className="px-5 pb-5 text-slate-600 dark:text-white/60 text-sm leading-relaxed border-t border-slate-200/60 dark:border-white/5 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-4 sm:px-6 max-w-3xl mx-auto text-center mt-20">
        <p className="text-slate-500 dark:text-white/40 text-sm mb-4">Tienes preguntas tecnicas o necesitas una demostracion guiada?</p>
        <button
          onClick={() => navigate("/nosotros")}
          className="text-teal-600 dark:text-teal-400 hover:text-teal-500 dark:hover:text-teal-300 transition-colors text-sm font-semibold cursor-pointer"
        >
          Contactar con nuestro equipo de ingenieria -&gt;
        </button>
      </section>
    </main>
  );
}
