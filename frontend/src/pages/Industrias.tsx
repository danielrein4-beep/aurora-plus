import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SpecularButton from "../components/SpecularButton";
import {
  IconClinic, IconHardware,
  IconRestaurant, IconFarm, IconCheck,
} from "../Icons";

const INDUSTRIES = [
  {
    Icon: IconClinic,
    name: "Clínicas Médicas",
    color: "from-sky-400 to-blue-500",
    tagline: "Atención al paciente sin papeles",
    desc: "Expedientes digitales, agenda médica, gestión de laboratorio, farmacia interna y cobranza integrada en una sola plataforma.",
    modulos: ["Historia clínica digital", "Agenda por especialista", "Módulo de laboratorio", "Farmacia interna", "Cobranza y seguros", "Reportes de productividad médica"],
  },
  {
    Icon: IconHardware,
    name: "Comercio",
    color: "from-orange-400 to-amber-500",
    tagline: "Tu mostrador y tu inventario bajo control total",
    desc: "Punto de venta por mostrador, código de barras, inventario en tiempo real, gestión de proveedores y cuentas por cobrar — para ferreterías, tiendas y comercios de todo tipo.",
    modulos: ["POS por mostrador con escáner de código de barras", "Inventario con alertas de stock", "Gestión de proveedores", "Cotizaciones y órdenes de compra", "Cuentas por cobrar", "Reportes de rotación de productos"],
  },
  {
    Icon: IconRestaurant,
    name: "Restaurantes",
    color: "from-rose-400 to-pink-500",
    tagline: "Del pedido a la mesa sin errores",
    desc: "Comandas digitales, gestión de mesas, comunicación directa con cocina, control de inventario y cierres de caja automáticos.",
    modulos: ["Comandas digitales por mesa", "Pantalla en cocina en tiempo real", "Control de inventario de insumos", "Cierres de caja automáticos", "Gestión de reservas", "Reportes de platos más vendidos"],
  },
  {
    Icon: IconFarm,
    name: "Control de Fincas",
    color: "from-green-400 to-emerald-500",
    tagline: "Tu ganado y tus potreros, organizados",
    desc: "Registro sanitario por animal, vacunación, rotación de potreros, control de inventario ganadero y trazabilidad completa desde nacimiento.",
    modulos: ["Registro individual por animal", "Calendario de vacunación", "Rotación y control de potreros", "Inventario de insumos agrícolas", "Trazabilidad de lotes", "Reportes de producción ganadera"],
  },
];

export default function Industrias() {
  const navigate = useNavigate();
  const [active, setActive] = useState(INDUSTRIES[0].name);
  const ind = INDUSTRIES.find((i) => i.name === active)!;

  return (
    <main className="aurora-public-page pt-32 pb-24 relative">

      {/* Header */}
      <section className="px-4 sm:px-6 max-w-7xl mx-auto text-center mb-16">
        <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 rounded-full px-4 py-1.5 text-xs text-teal-600 dark:text-teal-300 mb-6 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
          4 industrias con módulos propios
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
              </div>
            </div>

            {/* CTA */}
            <div className="mt-5 flex flex-col sm:flex-row gap-3">
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
                onClick={() => navigate("/onboarding")}
              >
                Quiero una demo para {ind.name}
              </SpecularButton>
              <SpecularButton
                size="md"
                radius={12}
                tint="#ffffff"
                tintOpacity={0}
                textColor="#f8f6ef"
                lineColor="#ffffff"
                baseColor="#4b4b4b"
                shineSize={10}
                shineFade={40}
                proximity={280}
                onClick={() => navigate("/precios")}
              >
                Ver precios →
              </SpecularButton>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
