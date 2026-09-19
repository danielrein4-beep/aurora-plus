import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SpecularButton from "../components/SpecularButton";
import {
  IconClinic, IconHardware, IconRestaurant, IconFarm, IconTooth, IconCheck, IconWhatsApp
} from "../Icons";

const INDUSTRIES = [
  {
    Icon: IconHardware,
    name: "Comercio & Retail",
    color: "from-orange-400 to-amber-500",
    tagline: "Tu mostrador, inventario y atencion WhatsApp bajo control",
    desc: "Punto de venta (POS) para mostrador con lector de codigo de barras, catalogo digital publico por negocio, cotizaciones instantaneas a tasa BCV y asistente comercial 24/7 en WhatsApp con Google Gemini 1.5 Flash.",
    modulos: [
      "POS rapido con cobro mixto (Divisas, Pago Movil, Tarjeta)",
      "Catalogo digital en linea para recibir pedidos directos",
      "Asistente IA de WhatsApp para responder precios y stock",
      "Control multialmacen y alertas automaticas de reposicion",
      "Arqueo y cierre de caja diario por cajero y turno",
      "Reportes de rotacion de inventario y margen de ganancia",
    ],
  },
  {
    Icon: IconClinic,
    name: "Salud & Mediclinic Pro",
    color: "from-sky-400 to-blue-500",
    tagline: "Gestion clinica profesional, vademecum y recipe oficial",
    desc: "Expedientes medicos digitales, vademecum farmacologico con mas de 100 principios activos, prescriptor asistido con deteccion de contraindicaciones y alergias, y emision de recipe medico oficial (Rx) en PDF con QR.",
    modulos: [
      "Historia clinica electronica completa por paciente",
      "Vademecum integrado con pautas de dosificacion",
      "Prescriptor asistido con alertas de alergias cruzadas",
      "Emision oficial de recipe medico (Rx) en PDF con QR",
      "Agenda de citas y control de sala de espera en vivo",
      "Caja y cobranza de consultas y procedimientos medicos",
    ],
  },
  {
    Icon: IconTooth,
    name: "Odontologia Integral",
    color: "from-teal-400 to-cyan-500",
    tagline: "Odontograma anatomico 3D y presupuesto por fases",
    desc: "Odontograma interactivo con las 5 caras de las 32 piezas permanentes y 20 temporales, periodontograma para medicion de sondaje y sangrado, y planes de tratamiento estructurados por citas clinicas.",
    modulos: [
      "Odontograma interactivo con registro por cara dental",
      "Catalogo de procedimientos (caries, endodoncia, coronas, implantes)",
      "Periodontograma grafico para salud gingival y bolsas",
      "Presupuesto clinico dividido por fases de tratamiento",
      "Historial fotografico y radiologico del paciente",
      "Consentimientos informados y evolucion clinica",
    ],
  },
  {
    Icon: IconRestaurant,
    name: "Restaurantes & Horeca",
    color: "from-rose-400 to-pink-500",
    tagline: "Del pedido a la mesa sin papel ni demoras",
    desc: "Mapa visual interactivo de mesas, comandas digitales enviadas directo desde salon a la pantalla KDS de cocina, control de stock de ingredientes y cierres de turno automaticos.",
    modulos: [
      "Mapa interactivo de mesas con estado en tiempo real",
      "Comandas digitales por mesero en tablet o celular",
      "Pantalla KDS en cocina con tiempos de preparacion",
      "Menu digital interactivo mediante codigo QR por mesa",
      "Division de cuentas por comensal y cobro multimoneda",
      "Control de mermas e inventario de insumos de cocina",
    ],
  },
  {
    Icon: IconFarm,
    name: "Ganaderia, Rebanos y Fincas",
    color: "from-green-400 to-emerald-500",
    tagline: "Administracion de ganado, ordeno, sanidad, mapas y pesaje",
    desc: "Software agropecuario integral: administracion de rebanos con trazabilidad individual, control diario de ordeno y tanque enfriador, calendario oficial de vacunacion y sanidad animal, mapas satelitales con calculo geodesico WGS84 de hectareas y pesaje con basculas Bluetooth en modo offline.",
    modulos: [
      "Administracion de ganado: hoja de vida por arete, categoria, raza y genealogia",
      "Control de ordeno: registro diario por vaca (manana/tarde) y monitoreo de tanque de leche",
      "Seguimiento de vacunacion: cronograma sanitario (aftosa, rabia), desparasitacion y control de mastitis",
      "Cartografia satelital: imagenes Esri en vivo y calculo geodesico exacto de hectareas por potrero",
      "Aforo forrajero, capacidad de carga animal y rotacion de lotes de pastoreo",
      "Captura de peso con basculas Bluetooth/Serial y modo offline sin internet en corrales",
    ],
  },
];

export default function Industrias() {
  const navigate = useNavigate();
  const [active, setActive] = useState(INDUSTRIES[0].name);
  const ind = INDUSTRIES.find((i) => i.name === active) || INDUSTRIES[0];

  return (
    <main className="aurora-public-page pt-32 pb-24 relative">

      {/* Header */}
      <section className="px-4 sm:px-6 max-w-7xl mx-auto text-center mb-16">
        <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 rounded-full px-4 py-1.5 text-xs text-teal-600 dark:text-teal-300 mb-6 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
          5 verticales especializadas con producto funcional
        </div>
        <h1 className="font-['Outfit'] font-black text-5xl sm:text-6xl lg:text-7xl leading-tight tracking-tight text-slate-900 dark:text-white mb-5">
          Hecho para tu sector real,<br />
          <span className="text-aurora">no un ERP generico</span>
        </h1>
        <p className="text-slate-500 dark:text-white/50 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          Cada industria tiene flujos unicos. Diseñamos la arquitectura de cada modulo con profesionales del area: comerciantes, medicos, odontologos, chefs y productores agropecuarios.
        </p>
      </section>

      {/* Selector de Industrias */}
      <section className="px-4 sm:px-6 max-w-6xl mx-auto mb-16">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-12">
          {INDUSTRIES.map((i) => {
            const isSelected = i.name === active;
            return (
              <button
                key={i.name}
                onClick={() => setActive(i.name)}
                className={`flex items-center gap-2.5 px-4 sm:px-5 py-3 rounded-2xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-lg scale-105"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
                }`}
              >
                <i.Icon size={18} />
                <span>{i.name}</span>
              </button>
            );
          })}
        </div>

        {/* Detalle de la industria activa */}
        <div className="apple-glass rounded-3xl p-8 sm:p-12 border border-slate-200/80 dark:border-white/10 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            <div className="lg:col-span-6 space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-500 flex items-center justify-center">
                <ind.Icon size={28} />
              </div>

              <div>
                <h2 className="font-['Outfit'] font-bold text-3xl sm:text-4xl text-slate-900 dark:text-white mb-2">
                  {ind.name}
                </h2>
                <p className="text-teal-600 dark:text-teal-400 font-medium text-sm sm:text-base">
                  {ind.tagline}
                </p>
              </div>

              <p className="text-slate-600 dark:text-white/60 text-sm sm:text-base leading-relaxed">
                {ind.desc}
              </p>

              <div className="pt-2">
                <SpecularButton
                  size="md"
                  radius={10}
                  tint="#35d7c3"
                  tintOpacity={0.16}
                  textColor="#ffffff"
                  lineColor="#7cf3e3"
                  baseColor="#0f766e"
                  shineSize={12}
                  shineFade={45}
                  intensity={1.3}
                  proximity={260}
                  onClick={() => navigate("/onboarding")}
                >
                  Probar demo de {ind.name}
                </SpecularButton>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="p-6 sm:p-8 rounded-2xl bg-slate-50/90 dark:bg-[#080d11] border border-slate-200/80 dark:border-white/10 space-y-4">
                <div className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-lg border-b border-slate-200/70 dark:border-white/10 pb-3">
                  Herramientas y Modulos Incluidos
                </div>
                <div className="space-y-3">
                  {ind.modulos.map((m, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-700 dark:text-white/75">
                      <span className="mt-0.5 w-4 h-4 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0">
                        <IconCheck size={10} />
                      </span>
                      <span>{m}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="px-4 sm:px-6 max-w-4xl mx-auto text-center mt-12">
        <div className="p-8 sm:p-12 apple-glass rounded-3xl border border-teal-500/30">
          <h3 className="font-['Outfit'] font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white mb-3">
            Quieres ver como funciona en tu negocio real?
          </h3>
          <p className="text-slate-500 dark:text-white/45 text-sm sm:text-base mb-6 max-w-md mx-auto">
            Te mostramos el sistema operando con datos de tu sector. Sin compromisos ni pagos previos.
          </p>
          <SpecularButton
            size="md"
            radius={10}
            tint="#35d7c3"
            tintOpacity={0.16}
            textColor="#ffffff"
            lineColor="#7cf3e3"
            baseColor="#0f766e"
            shineSize={12}
            shineFade={45}
            intensity={1.3}
            proximity={260}
            onClick={() => navigate("/onboarding")}
          >
            Solicitar demostracion guiada
          </SpecularButton>
        </div>
      </section>
    </main>
  );
}
