import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SpecularButton from "../components/SpecularButton";
import { IconCheck } from "../Icons";

const INDUSTRIES = [
  {
    name: "Mediclinic Pro",
    tagline: "Atención al paciente sin papeles",
    desc: "Expedientes digitales, agenda médica, sala de espera reactiva y cobranza multidivisa — con vademécum de fármacos y récipe médico oficial en PDF integrados a la consulta.",
    modulos: ["Historia clínica digital", "Agenda por especialista", "Sala de espera en vivo (secretaria ↔ doctor)", "Vademécum de 36+ fármacos con alergias cruzadas", "Récipe médico oficial en PDF", "Cobranza multidivisa (USD·VES·COP)"],
  },
  {
    name: "Odontología",
    tagline: "El consultorio dental, sin hojas sueltas",
    desc: "Odontograma internacional FDI con figuras anatómicas por tipo de diente, periodontograma de sondaje real y planes de tratamiento presupuestados por fases.",
    modulos: ["Odontograma FDI interactivo (32 piezas)", "Periodontograma de sondaje de 6 puntos", "Planes de tratamiento por fases", "Presupuesto dental dual USD/Bs.", "Agenda por sillón/consultorio", "Historial clínico unificado con Mediclinic"],
  },
  {
    name: "Comercio",
    tagline: "Tu mostrador, tu inventario y tu WhatsApp, en un solo lugar",
    desc: "Punto de venta por mostrador, inventario en tiempo real, catálogo público con pedidos por WhatsApp, y un asistente de IA que responde precios y stock sin que nadie esté pegado al teléfono.",
    modulos: ["POS por mostrador con escáner de código de barras", "Catálogo público con pedidos por WhatsApp", "Asistente de IA (precios, stock, tasa BCV, delivery)", "Inventario con alertas de stock", "Gestión de proveedores y cuentas por cobrar", "Reportes de rotación de productos"],
  },
  {
    name: "Restaurantes",
    tagline: "Del pedido a la mesa sin errores",
    desc: "Comandas digitales, gestión de mesas, comunicación directa con cocina, control de inventario y cierres de caja automáticos.",
    modulos: ["Comandas digitales por mesa", "Pantalla en cocina en tiempo real", "Control de inventario de insumos", "Cierres de caja automáticos", "Gestión de reservas", "Reportes de platos más vendidos"],
  },
  {
    name: "Control de Fincas",
    tagline: "Tu ganado y tus potreros, organizados",
    desc: "Mapa satelital de potreros, básculas bluetooth para pesaje en manga, y control sanitario que impide vender un animal todavía en período de retiro por vacuna o medicamento.",
    modulos: ["Mapa satelital de potreros con cálculo de hectáreas", "Pesaje en manga vía báscula bluetooth/USB", "Calendario de vacunación con refuerzos automáticos", "Bloqueo de venta en período de retiro sanitario", "Trazabilidad individual por animal desde nacimiento", "Modo offline de campo con sincronización posterior"],
  },
  {
    name: "Veterinaria",
    tagline: "El mismo motor de Mediclinic, para mascotas",
    desc: "Agenda, historias clínicas, sala de espera y cotizador para clínicas veterinarias — construido sobre el mismo motor probado de Mediclinic Pro.",
    modulos: ["Historia clínica por mascota y propietario", "Agenda de citas y cirugías", "Sala de espera en vivo", "Cotizador de procedimientos", "Cobros y caja diaria", "Cierres de caja"],
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
          6 industrias con módulos propios
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
                <div className="mb-6">
                  <div className="text-teal-600 dark:text-white/35 text-xs font-semibold tracking-widest uppercase mb-2">{ind.tagline}</div>
                  <h2 className="font-['Outfit'] font-bold text-3xl text-slate-900 dark:text-white">{ind.name}</h2>
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
                Quiero una demo para {ind.name}
              </SpecularButton>
              <SpecularButton
                size="md"
                radius={12}
                tint="#F5F5F7"
                tintOpacity={0.92}
                blur={14}
                textColor="#1D1D1F"
                lineColor="#ffffff"
                baseColor="#4b4b4b"
                shineSize={10}
                shineFade={40}
                proximity={280}
                className="shadow-sm"
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
