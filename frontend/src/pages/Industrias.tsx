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
    <main className="w-full bg-white text-[#1D1D1F] antialiased pt-28">

      {/* Header */}
      <section className="py-20 md:py-28 px-6 sm:px-8 border-b border-[#E5E5EA]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#F5F5F7] border border-[#E5E5EA] rounded-full px-4 py-1.5 text-xs font-semibold text-[#177E89] mb-6">
            6 industrias con módulos propios
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.06] text-[#1D1D1F] mb-5">
            Hecho para tu industria,<br />
            <span className="text-[#177E89]">no para todas en general</span>
          </h1>
          <p className="text-base sm:text-lg text-[#86868B] max-w-2xl mx-auto leading-relaxed">
            Cada vertical tiene sus propios módulos preconfigurados y flujos adaptados. Elige tu industria y ve exactamente qué incluye.
          </p>
        </div>
      </section>

      {/* Selector + detail */}
      <section className="py-20 md:py-28 px-6 sm:px-8 bg-[#F5F5F7]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-6">

            {/* Industry selector */}
            <div className="lg:w-64 flex-shrink-0 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
              {INDUSTRIES.map((it) => (
                <button key={it.name}
                  onClick={() => setActive(it.name)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap lg:whitespace-normal flex-shrink-0 cursor-pointer ${
                    active === it.name
                      ? "bg-[#177E89] text-white"
                      : "bg-white text-[#1D1D1F] border border-[#E5E5EA] hover:border-[#D1D1D6]"
                  }`}>
                  {it.name}
                </button>
              ))}
            </div>

            {/* Detail panel */}
            <div className="flex-1 min-w-0">
              <div className="bg-white border border-[#E5E5EA] rounded-3xl overflow-hidden shadow-sm">
                <div className="p-8 sm:p-10">
                  {/* Header */}
                  <div className="mb-6">
                    <div className="text-[#177E89] text-xs font-semibold tracking-widest uppercase mb-2">{ind.tagline}</div>
                    <h2 className="text-3xl font-bold tracking-tight text-[#1D1D1F]">{ind.name}</h2>
                  </div>

                  <p className="text-[#6E6E73] text-base leading-relaxed mb-8 max-w-2xl">{ind.desc}</p>

                  {/* Modules */}
                  <div className="mb-8">
                    <p className="text-xs font-semibold tracking-widest text-[#177E89] uppercase mb-4">Módulos incluidos</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {ind.modulos.map((m) => (
                        <div key={m} className="flex items-center gap-3 bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl px-4 py-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#177E89] flex-shrink-0" aria-hidden="true" />
                          <span className="text-[#1D1D1F] text-sm font-medium">{m}</span>
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
                  Quiero una demo para {ind.name}
                </SpecularButton>
                <SpecularButton
                  size="md"
                  radius={999}
                  tint="#F5F5F7"
                  tintOpacity={0.92}
                  blur={14}
                  textColor="#1D1D1F"
                  lineColor="#ffffff"
                  baseColor="#D1D1D6"
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
        </div>
      </section>
    </main>
  );
}
