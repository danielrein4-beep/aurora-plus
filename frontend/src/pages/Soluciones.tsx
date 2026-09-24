import { useNavigate } from "react-router-dom";
import SpecularButton from "../components/SpecularButton";
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
    <main className="w-full bg-white text-[#1D1D1F] antialiased pt-28">

      {/* Header */}
      <section className="py-20 md:py-28 px-6 sm:px-8 border-b border-[#E5E5EA]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#F5F5F7] border border-[#E5E5EA] rounded-full px-4 py-1.5 text-xs font-semibold text-[#177E89] mb-6">
            Capacidades de la plataforma
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.06] text-[#1D1D1F] mb-5">
            Una plataforma,<br />
            <span className="text-[#177E89]">todas las herramientas</span>
          </h1>
          <p className="text-base sm:text-lg text-[#86868B] max-w-2xl mx-auto leading-relaxed">
            Aurora Plus reúne en un solo sistema todo lo que tu empresa necesita para operar con eficiencia — desde el primer día y sin complicaciones técnicas.
          </p>
        </div>
      </section>

      {/* Solutions grid */}
      <section className="py-20 md:py-28 px-6 sm:px-8 bg-[#F5F5F7] border-b border-[#E5E5EA]">
        <div className="max-w-6xl mx-auto space-y-5">
          {SOLUCIONES.map((sol, i) => (
            <div key={sol.title}
              className={`bg-white border border-[#E5E5EA] rounded-3xl overflow-hidden shadow-sm flex flex-col ${
                i % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
              }`}>

              {/* Icon panel */}
              <div className="lg:w-64 flex-shrink-0 flex items-center justify-center p-12 bg-[#F5F5F7]">
                <div className="w-20 h-20 rounded-2xl bg-white border border-[#E5E5EA] flex items-center justify-center text-[#177E89] shadow-sm">
                  <sol.Icon size={36} />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 p-8 sm:p-10">
                <div className="inline-block bg-[#F5F5F7] border border-[#E5E5EA] rounded-full px-3 py-1 text-xs text-[#177E89] font-semibold tracking-widest uppercase mb-3">
                  {sol.tag}
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1D1D1F] mb-3">{sol.title}</h2>
                <p className="text-[#86868B] text-base leading-relaxed mb-6 max-w-xl">{sol.desc}</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sol.puntos.map((p) => (
                    <li key={p} className="flex items-center gap-2.5 text-sm text-[#1D1D1F] font-medium">
                      <span className="w-4 h-4 rounded-full bg-[#177E89]/10 text-[#177E89] flex items-center justify-center flex-shrink-0"><IconCheck size={9} /></span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28 px-6 sm:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1D1D1F] mb-4">
            ¿Quieres ver todo esto<br />
            <span className="text-[#177E89]">funcionando en tu negocio?</span>
          </h2>
          <p className="text-[#86868B] mb-8">Agenda una demo personalizada — te mostramos exactamente lo que necesitas, sin perder tu tiempo.</p>
          <SpecularButton
            size="lg"
            radius={999}
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
            onClick={() => navigate("/onboarding")}
          >
            Solicitar demo gratuita
          </SpecularButton>
        </div>
      </section>
    </main>
  );
}
