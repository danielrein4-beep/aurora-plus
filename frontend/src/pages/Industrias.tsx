import { useState } from "react";
import {
  IconVet, IconClinic, IconHardware, IconMining,
  IconRestaurant, IconFarm, IconEducation, IconRetail, IconCheck,
} from "../Icons";

const INDUSTRIES = [
  {
    Icon: IconVet,
    name: "Veterinaria",
    color: "from-teal-400 to-cyan-500",
    tagline: "Tu clínica, completamente digital",
    desc: "Gestiona tu veterinaria de principio a fin: desde la agenda de citas hasta el control de medicamentos y la historia clínica de cada paciente.",
    modulos: ["Expediente clínico por paciente", "Agenda de citas y cirugías", "Inventario de medicamentos", "Facturación y cobros", "Recordatorios automáticos de vacunas", "Historial de tratamientos"],
    caso: { empresa: "Clínica VetSur", resultado: "40% más pacientes atendidos al mes tras digitalizar expedientes y agenda." },
  },
  {
    Icon: IconClinic,
    name: "Clínicas Médicas",
    color: "from-sky-400 to-blue-500",
    tagline: "Atención al paciente sin papeles",
    desc: "Expedientes digitales, agenda médica, gestión de laboratorio, farmacia interna y cobranza integrada en una sola plataforma.",
    modulos: ["Historia clínica digital", "Agenda por especialista", "Módulo de laboratorio", "Farmacia interna", "Cobranza y seguros", "Reportes de productividad médica"],
    caso: { empresa: "Centro Médico Integral", resultado: "Reducción del 60% en errores de prescripción con expedientes digitales." },
  },
  {
    Icon: IconHardware,
    name: "Ferretería",
    color: "from-orange-400 to-amber-500",
    tagline: "Tu bodega bajo control total",
    desc: "Control de inventario en tiempo real, punto de venta por mostrador, gestión de proveedores y cotizaciones rápidas para tus clientes.",
    modulos: ["POS por mostrador", "Inventario con alertas de stock", "Gestión de proveedores", "Cotizaciones y órdenes de compra", "Cuentas por cobrar", "Reportes de rotación de productos"],
    caso: { empresa: "Ferretería El Constructor", resultado: "Eliminaron 3 horas diarias de conteo manual con alertas automáticas de inventario." },
  },
  {
    Icon: IconMining,
    name: "Minería",
    color: "from-slate-400 to-gray-500",
    tagline: "Operaciones a gran escala, bajo control",
    desc: "Trazabilidad de maquinaria, gestión de turnos, órdenes de trabajo, control de seguridad e informes regulatorios desde una sola plataforma.",
    modulos: ["Control de maquinaria y equipos", "Gestión de turnos y personal", "Órdenes de trabajo y mantención", "Reportes de seguridad e incidentes", "Control de materiales y explosivos", "Cumplimiento regulatorio"],
    caso: { empresa: "MinPetrol S.A.", resultado: "80 horas mensuales ahorradas en papeleo de seguridad y trazabilidad." },
  },
  {
    Icon: IconRestaurant,
    name: "Restaurantes",
    color: "from-rose-400 to-pink-500",
    tagline: "Del pedido a la mesa sin errores",
    desc: "Comandas digitales, gestión de mesas, comunicación directa con cocina, control de inventario y cierres de caja automáticos.",
    modulos: ["Comandas digitales por mesa", "Pantalla en cocina en tiempo real", "Control de inventario de insumos", "Cierres de caja automáticos", "Gestión de reservas", "Reportes de platos más vendidos"],
    caso: { empresa: "Restaurante La Terraza", resultado: "Tiempo de entrega reducido en 35% con comandas digitales y pantalla de cocina." },
  },
  {
    Icon: IconFarm,
    name: "Control de Fincas",
    color: "from-green-400 to-emerald-500",
    tagline: "Tu ganado y tus potreros, organizados",
    desc: "Registro sanitario por animal, vacunación, rotación de potreros, control de inventario ganadero y trazabilidad completa desde nacimiento.",
    modulos: ["Registro individual por animal", "Calendario de vacunación", "Rotación y control de potreros", "Inventario de insumos agrícolas", "Trazabilidad de lotes", "Reportes de producción ganadera"],
    caso: { empresa: "Finca Los Alamos", resultado: "Tasa de vacunación al 100% del hato con recordatorios automáticos por lote." },
  },
  {
    Icon: IconEducation,
    name: "Educación",
    color: "from-indigo-400 to-violet-500",
    tagline: "Administra tu institución sin estrés",
    desc: "Matrícula digital, gestión de horarios, calificaciones, comunicación con padres, nómina docente y pagos de mensualidades en un solo lugar.",
    modulos: ["Matrícula y expediente estudiantil", "Gestión de horarios y aulas", "Calificaciones y boletines digitales", "Portal de comunicación padres-escuela", "Nómina y asistencia docente", "Cobro de mensualidades"],
    caso: { empresa: "Colegio Bilingüe Horizonte", resultado: "Morosidad reducida en 45% con cobros automáticos y notificaciones a padres." },
  },
  {
    Icon: IconRetail,
    name: "Retail",
    color: "from-violet-400 to-purple-600",
    tagline: "Vende más, gestiona menos",
    desc: "POS para tiendas físicas, control de inventario multitienda, programa de fidelización de clientes y analítica de ventas por categoría.",
    modulos: ["Punto de venta multitienda", "Inventario en tiempo real", "Programa de puntos y fidelización", "Gestión de devoluciones", "Reportes por categoría y temporada", "Integración con e-commerce"],
    caso: { empresa: "Tiendas Moda Express", resultado: "Inventario sincronizado entre 4 tiendas eliminó el sobrestock en un 30%." },
  },
];

export default function Industrias() {
  const [active, setActive] = useState(INDUSTRIES[0].name);
  const ind = INDUSTRIES.find((i) => i.name === active)!;

  return (
    <main className="pt-28 pb-24 relative">

      {/* Header */}
      <section className="px-4 sm:px-6 max-w-7xl mx-auto text-center mb-16">
        <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 rounded-full px-4 py-1.5 text-xs text-teal-600 dark:text-teal-300 mb-6 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
          18+ industrias cubiertas
        </div>
        <h1 className="font-['Outfit'] font-black text-5xl sm:text-6xl lg:text-7xl leading-tight tracking-tight text-slate-900 dark:text-white mb-5">
          Hecho para tu industria,<br />
          <span className="text-aurora">no para todas en general</span>
        </h1>
        <p className="text-slate-500 dark:text-white/45 text-lg max-w-2xl mx-auto leading-relaxed">
          Cada vertical tiene sus propios módulos preconfigurados y flujos adaptados. Elige tu industria y ve exactamente qué incluye.
        </p>
      </section>

      {/* Selector + detail */}
      <section className="px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Industry selector */}
          <div className="lg:w-64 flex-shrink-0 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {INDUSTRIES.map((ind) => (
              <button key={ind.name}
                onClick={() => setActive(ind.name)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap lg:whitespace-normal flex-shrink-0 cursor-pointer ${
                  active === ind.name
                    ? "g-aurora text-white shadow-lg"
                    : "bg-white/70 dark:bg-white/5 text-slate-700 dark:text-white/50 hover:bg-white dark:hover:bg-white/8 hover:text-black dark:hover:text-white border border-slate-200/80 dark:border-white/5"
                }`}>
                <div className="w-7 h-7 rounded-lg bg-teal-500/10 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                  <ind.Icon size={16} />
                </div>
                {ind.name}
              </button>
            ))}
          </div>

          {/* Detail panel */}
          <div className="flex-1 min-w-0">
            <div className="relative apple-glass rounded-3xl overflow-hidden shadow-xl">
              <div className="line-aurora absolute top-0 left-0 right-0" />

              <div className="p-8 sm:p-10">
                {/* Header */}
                <div className="flex items-start gap-5 mb-6">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${ind.color} flex items-center justify-center flex-shrink-0 text-white shadow-md`}>
                    <ind.Icon size={30} />
                  </div>
                  <div>
                    <div className="text-teal-600 dark:text-white/35 text-xs font-semibold tracking-widest uppercase mb-1">{ind.tagline}</div>
                    <h2 className="font-['Outfit'] font-bold text-3xl text-slate-900 dark:text-white">{ind.name}</h2>
                  </div>
                </div>

                <p className="text-slate-600 dark:text-white/55 text-base leading-relaxed mb-8 max-w-2xl">{ind.desc}</p>

                {/* Modules */}
                <div className="mb-8">
                  <p className="text-xs font-semibold tracking-widest text-teal-600 dark:text-teal-400 uppercase mb-4">Módulos incluidos</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ind.modulos.map((m) => (
                      <div key={m} className="flex items-center gap-3 bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5 rounded-xl px-4 py-3">
                        <span className="w-5 h-5 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0"><IconCheck size={10} /></span>
                        <span className="text-slate-700 dark:text-white/65 text-sm font-medium">{m}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Case study */}
                <div className="bg-slate-50/90 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/8 rounded-2xl p-5 flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${ind.color} flex items-center justify-center flex-shrink-0 text-white font-bold text-xs shadow-sm`}>
                    {ind.caso.empresa.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-slate-400 dark:text-white/35 text-xs mb-1 font-medium">{ind.caso.empresa}</div>
                    <div className="text-slate-700 dark:text-white/70 text-sm leading-relaxed italic">"{ind.caso.resultado}"</div>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <button className="g-aurora glow-teal text-white font-semibold px-8 py-3.5 rounded-xl hover:opacity-90 transition-opacity text-sm shadow-md cursor-pointer">
                Quiero una demo para {ind.name}
              </button>
              <button className="bg-white/70 dark:bg-transparent border border-slate-300 dark:border-white/10 text-slate-800 dark:text-white/55 hover:border-slate-400 dark:hover:border-white/25 hover:text-black dark:hover:text-white px-6 py-3.5 rounded-xl text-sm font-semibold transition-all cursor-pointer">
                Ver precios →
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
