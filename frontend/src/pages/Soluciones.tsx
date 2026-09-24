import { useNavigate } from "react-router-dom";
import SpecularButton from "../components/SpecularButton";
import Kicker from "../components/Kicker";
import {
  IconCustomize, IconChart, IconLink, IconCloud, IconLock, IconMobile, IconCheck,
} from "../Icons";

const SOLUCIONES = [
  {
    Icon: IconCustomize,
    title: "Personalización Total",
    tag: "Adaptabilidad",
    desc: "Aurora Plus no te obliga a cambiar cómo trabajas. Configuramos los módulos, flujos y formularios según los procesos exactos de tu empresa. Sin código, sin consultores externos.",
    puntos: ["Formularios y campos a medida", "Flujos de aprobación configurables", "Nomenclatura adaptada a tu industria", "Roles y vistas por departamento"],
  },
  {
    Icon: IconChart,
    title: "Inteligencia de Negocio",
    tag: "Analítica",
    desc: "Convierte los datos de tu operación en decisiones. Dashboards en tiempo real con los KPIs que importan, reportes automáticos y alertas configurables.",
    puntos: ["Paneles con más de 40 tipos de gráficos", "Reportes exportables a Excel y PDF", "Alertas automáticas por umbral", "Comparativas de períodos y sucursales"],
  },
  {
    Icon: IconLink,
    title: "Módulos Integrados",
    tag: "Integración",
    desc: "Todos los módulos comparten la misma base de datos. Una venta actualiza el inventario, genera la factura y alimenta la contabilidad — sin doble ingreso.",
    puntos: ["Ventas → Inventario en tiempo real", "Compras → Cuentas por pagar automático", "RRHH → Nómina sin pasos manuales", "CRM conectado a todo el ciclo"],
  },
  {
    Icon: IconCloud,
    title: "Nube + Resiliente a Cortes",
    tag: "Disponibilidad",
    desc: "Si se corta la conexión en plena operación, puedes seguir tomando pedidos y cobrando mesas ya abiertas — se guardan en el dispositivo y se sincronizan solos al reconectarse.",
    puntos: ["Acceso desde cualquier navegador", "Sobrevive cortes breves de conexión sin perder ventas", "Sincronización automática en segundo plano", "Backups diarios en la nube"],
  },
  {
    Icon: IconLock,
    title: "Seguridad y Control",
    tag: "Seguridad",
    desc: "Define exactamente qué puede ver y hacer cada persona. Registro de auditoría completo de cada acción, con historial de cambios por usuario.",
    puntos: ["Roles y permisos granulares", "Auditoría completa por usuario", "Historial de cambios en registros", "Sesiones con tiempo de expiración"],
  },
  {
    Icon: IconMobile,
    title: "Versión Móvil",
    tag: "Movilidad",
    desc: "Todo el poder de Aurora Plus desde tu celular. Consulta métricas, aprueba solicitudes y revisa alertas desde cualquier lugar, sin instalar nada.",
    puntos: ["Diseño responsivo para cualquier pantalla", "Consulta de dashboards y reportes", "Aprobación de órdenes y solicitudes", "Notificaciones de alertas importantes"],
  },
];

export default function Soluciones() {
  const navigate = useNavigate();
  return (
    <main className="pt-32 pb-24 relative">

      {/* Header */}
      <section className="px-4 sm:px-6 max-w-7xl mx-auto text-center mb-20">
        <Kicker>Capacidades de la plataforma</Kicker>
        <h1 className="font-bold text-5xl sm:text-6xl lg:text-7xl leading-tight tracking-tight text-slate-900 mb-5">
          Una plataforma,<br />
          <span className="text-[#177E89]">todas las herramientas</span>
        </h1>
        <p className="text-slate-500 text-lg font-light uppercase tracking-wide max-w-2xl mx-auto leading-relaxed">
          Aurora Plus reúne en un solo sistema todo lo que tu empresa necesita para operar con eficiencia — desde el primer día y sin complicaciones técnicas.
        </p>
      </section>

      {/* Solutions grid */}
      <section className="px-4 sm:px-6 max-w-7xl mx-auto space-y-5">
        {SOLUCIONES.map((sol, i) => (
          <div key={sol.title}
            className={`relative apple-glass rounded-3xl overflow-hidden flex flex-col transition-all duration-300 ${
              i % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
            }`}>
            <div className="absolute inset-x-0 top-0 h-px bg-[#177E89]/30" />

            {/* Icon panel */}
            <div className="lg:w-64 flex-shrink-0 flex items-center justify-center p-12 bg-slate-50/70">
              <div className="w-20 h-20 rounded-2xl bg-[#177E89]/10 border border-[#177E89]/20 flex items-center justify-center">
                <sol.Icon size={36} />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-8 sm:p-10">
              <p className="font-light uppercase tracking-wide text-sm text-[#177E89] mb-2">{sol.tag}</p>
              <h2 className="font-bold text-2xl sm:text-3xl text-slate-900 mb-3">{sol.title}</h2>
              <p className="text-slate-500 text-base font-light uppercase tracking-wide leading-relaxed mb-6 max-w-xl">{sol.desc}</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sol.puntos.map((p) => (
                  <li key={p} className="flex items-center gap-2.5 text-sm font-light uppercase tracking-wide text-slate-700">
                    <span className="w-4 h-4 rounded-full bg-[#177E89]/15 text-[#177E89] flex items-center justify-center flex-shrink-0"><IconCheck size={9} /></span>
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
        <h2 className="font-bold text-3xl sm:text-4xl text-slate-900 mb-4">
          ¿Quieres ver todo esto<br />
          <span className="text-[#177E89]">funcionando en tu negocio?</span>
        </h2>
        <p className="text-slate-500 font-light uppercase tracking-wide mb-8">Crea tu cuenta y úsalo gratis durante 15 días, con tus propios datos.</p>
        <SpecularButton
          size="lg"
          radius={12}
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
          onClick={() => navigate("/auth?registro=1")}
        >
          Probar gratis 15 días
        </SpecularButton>
      </section>
    </main>
  );
}
