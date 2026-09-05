import {
  IconCustomize, IconChart, IconLink, IconCloud, IconLock, IconMobile,
} from "../Icons";

const SOLUCIONES = [
  {
    Icon: IconCustomize,
    title: "Personalización Total",
    tag: "Adaptabilidad",
    desc: "Aurora Plus no te obliga a cambiar cómo trabajas. Configuramos los módulos, flujos y formularios según los procesos exactos de tu empresa. Sin código, sin consultores externos.",
    puntos: ["Formularios y campos a medida", "Flujos de aprobación configurables", "Nomenclatura adaptada a tu industria", "Roles y vistas por departamento"],
    color: "from-teal-400 to-cyan-400",
  },
  {
    Icon: IconChart,
    title: "Inteligencia de Negocio",
    tag: "Analítica",
    desc: "Convierte los datos de tu operación en decisiones. Dashboards en tiempo real con los KPIs que importan, reportes automáticos y alertas configurables.",
    puntos: ["Paneles con más de 40 tipos de gráficos", "Reportes exportables a Excel y PDF", "Alertas automáticas por umbral", "Comparativas de períodos y sucursales"],
    color: "from-sky-400 to-blue-500",
  },
  {
    Icon: IconLink,
    title: "Módulos Integrados",
    tag: "Integración",
    desc: "Todos los módulos comparten la misma base de datos. Una venta actualiza el inventario, genera la factura y alimenta la contabilidad — sin doble ingreso.",
    puntos: ["Ventas → Inventario en tiempo real", "Compras → Cuentas por pagar automático", "RRHH → Nómina sin pasos manuales", "CRM conectado a todo el ciclo"],
    color: "from-violet-400 to-purple-500",
  },
  {
    Icon: IconCloud,
    title: "Nube + Modo Offline",
    tag: "Disponibilidad",
    desc: "Trabaja sin interrupciones. Si pierdes internet, el sistema sigue funcionando en modo local y sincroniza todo automáticamente al reconectarse.",
    puntos: ["Acceso desde cualquier navegador", "Modo offline sin pérdida de datos", "Sincronización automática en segundo plano", "Backups diarios en la nube"],
    color: "from-teal-400 to-blue-500",
  },
  {
    Icon: IconLock,
    title: "Seguridad y Control",
    tag: "Seguridad",
    desc: "Define exactamente qué puede ver y hacer cada persona. Registro de auditoría completo de cada acción, con historial de cambios por usuario.",
    puntos: ["Roles y permisos granulares", "Auditoría completa por usuario", "Historial de cambios en registros", "Sesiones con tiempo de expiración"],
    color: "from-blue-400 to-violet-500",
  },
  {
    Icon: IconMobile,
    title: "Versión Móvil",
    tag: "Movilidad",
    desc: "Todo el poder de Aurora Plus desde tu celular. Consulta métricas, aprueba solicitudes y revisa alertas desde cualquier lugar, sin instalar nada.",
    puntos: ["Diseño responsivo para cualquier pantalla", "Consulta de dashboards y reportes", "Aprobación de órdenes y solicitudes", "Notificaciones de alertas importantes"],
    color: "from-purple-400 to-pink-500",
  },
];

export default function Soluciones() {
  return (
    <main className="pt-28 pb-24 relative">

      {/* Header */}
      <section className="px-4 sm:px-6 max-w-7xl mx-auto text-center mb-20">
        <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 rounded-full px-4 py-1.5 text-xs text-teal-600 dark:text-teal-300 mb-6 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
          Capacidades de la plataforma
        </div>
        <h1 className="font-['Outfit'] font-black text-5xl sm:text-6xl lg:text-7xl leading-tight tracking-tight text-slate-900 dark:text-white mb-5">
          Una plataforma,<br />
          <span className="text-aurora">todas las herramientas</span>
        </h1>
        <p className="text-slate-500 dark:text-white/45 text-lg max-w-2xl mx-auto leading-relaxed">
          Aurora Plus reúne en un solo sistema todo lo que tu empresa necesita para operar con eficiencia — desde el primer día y sin complicaciones técnicas.
        </p>
      </section>

      {/* Solutions grid */}
      <section className="px-4 sm:px-6 max-w-7xl mx-auto space-y-5">
        {SOLUCIONES.map((sol, i) => (
          <div key={sol.title}
            className={`relative apple-glass rounded-3xl overflow-hidden flex flex-col shadow-lg hover:shadow-2xl transition-all duration-300 ${
              i % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
            }`}>
            <div className="absolute inset-x-0 top-0 h-px line-aurora" />

            {/* Icon panel */}
            <div className={`lg:w-64 flex-shrink-0 flex items-center justify-center p-12 bg-slate-50/70 dark:bg-white/[0.02]`}>
              <div className={`w-20 h-20 rounded-2xl bg-teal-500/10 dark:bg-white/5 border border-teal-500/20 dark:border-white/8 flex items-center justify-center shadow-inner`}>
                <sol.Icon size={36} />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-8 sm:p-10">
              <div className="inline-block bg-teal-500/10 dark:bg-white/5 border border-teal-500/20 dark:border-white/8 rounded-full px-3 py-1 text-xs text-teal-600 dark:text-white/40 font-semibold tracking-widest uppercase mb-3">
                {sol.tag}
              </div>
              <h2 className="font-['Outfit'] font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white mb-3">{sol.title}</h2>
              <p className="text-slate-500 dark:text-white/50 text-base leading-relaxed mb-6 max-w-xl">{sol.desc}</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sol.puntos.map((p) => (
                  <li key={p} className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-white/55 font-medium">
                    <span className="w-4 h-4 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0">✓</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-6 max-w-3xl mx-auto text-center mt-24">
        <h2 className="font-['Outfit'] font-bold text-3xl sm:text-4xl text-slate-900 dark:text-white mb-4">
          ¿Quieres ver todo esto<br />
          <span className="text-aurora">funcionando en tu negocio?</span>
        </h2>
        <p className="text-slate-500 dark:text-white/40 mb-8">Agenda una demo personalizada — te mostramos exactamente lo que necesitas, sin perder tu tiempo.</p>
        <button className="g-aurora glow-teal text-white font-semibold px-10 py-4 rounded-xl hover:opacity-90 transition-opacity shadow-lg cursor-pointer">
          Solicitar demo gratuita
        </button>
      </section>
    </main>
  );
}
