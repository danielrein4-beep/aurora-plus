import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AuroraLogo from "../AuroraLogo";
import SpecularButton from "../components/SpecularButton";
import { useAuth } from "../context/AuthContext";
import {
  IconClinic, IconHardware,
  IconRestaurant, IconFarm,
  IconTooth, IconCheck,
} from "../Icons";

const INDUSTRIES = [
  { Icon: IconClinic,     name: "Mediclinic Pro",    desc: "Historias clínicas, agenda, sala de espera en vivo, cotizador multidivisa.", imgs: ["/industrias/mediclinic.jpg"], placeholder: "" },
  { Icon: IconTooth,      name: "Odontología",       desc: "Odontograma FDI interactivo, periodontograma de 6 puntos, planes por fases.", imgs: ["/industrias/odontologia.jpg"], placeholder: "linear-gradient(135deg,#0ea5b8,#0d3b3d)" },
  { Icon: IconHardware,   name: "Comercio",          desc: "POS mostrador, inventario en tiempo real, catálogo con pedidos por WhatsApp.", imgs: ["/industrias/comercio-electronica.jpg", "/industrias/comercio-ferreteria.jpg", "/industrias/comercio-telefonos.jpg"], placeholder: "linear-gradient(135deg,#d97706,#7c2d12)" },
  { Icon: IconRestaurant, name: "Restaurantes",      desc: "Comandas digitales, mesas, cocina en tiempo real y cierres de caja automáticos.", imgs: ["/industrias/restaurantes.jpg"], placeholder: "linear-gradient(135deg,#e11d48,#4c0519)" },
  { Icon: IconFarm,       name: "Control de Fincas", desc: "Mapa satelital de potreros, básculas bluetooth y control sanitario.", imgs: ["/industrias/ganaderia.jpg"], placeholder: "linear-gradient(135deg,#16a34a,#052e16)" },
  // Veterinaria: aún en construcción, no se muestra en esta grilla hasta que tenga foto y esté lista.
];

// Comercio sirve muchos rubros (ferretería, farmacia, retail...): la tarjeta
// rota entre varias fotos si hay más de una en `imgs`, en vez de una sola foto fija.
function IndustryPhoto({ imgs }: { imgs: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (imgs.length < 2) return;
    const id = setInterval(() => setI((n) => (n + 1) % imgs.length), 4000);
    return () => clearInterval(id);
  }, [imgs.length]);
  if (imgs.length === 0) return null;
  return (
    <>
      {imgs.map((src, idx) => (
        <img
          key={src}
          src={src}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition duration-1000 ease-in-out group-hover:scale-105 ${
            idx === i ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
    </>
  );
}

const SISTEMA_POR_INDUSTRIA: Record<string, { ruta: string; label: string; nombre: string; desc: string; Icon: typeof IconClinic }> = {
  restaurante: { ruta: "/restaurante", label: "Aurora Horeca", nombre: "Aurora Horeca", desc: "Comandas digitales, mesas, cocina en tiempo real, inventario y cierres de caja automáticos.", Icon: IconRestaurant },
  ferreteria: { ruta: "/comercio", label: "Aurora Comercio", nombre: "Aurora Comercio", desc: "Control de stock, proveedores, ventas por mostrador, cotizaciones y reportes de rotación.", Icon: IconHardware },
  repuestos: { ruta: "/comercio", label: "Aurora Comercio", nombre: "Aurora Comercio", desc: "Control de stock, proveedores, ventas por mostrador, cotizaciones y reportes de rotación.", Icon: IconHardware },
  farmacia: { ruta: "/comercio", label: "Aurora Comercio", nombre: "Aurora Comercio", desc: "Control de stock, proveedores, ventas por mostrador, cotizaciones y reportes de rotación.", Icon: IconHardware },
  retail: { ruta: "/comercio", label: "Aurora Comercio", nombre: "Aurora Comercio", desc: "POS multitienda, e-commerce, fidelización de clientes y análisis de ventas por categoría.", Icon: IconHardware },
  finca: { ruta: "/ganaderia", label: "Aurora Ganadería", nombre: "Aurora Ganadería", desc: "Gestión integral de ganadería, rotación de potreros, registro sanitario y trazabilidad animal.", Icon: IconFarm },
  ganaderia: { ruta: "/ganaderia", label: "Aurora Ganadería", nombre: "Aurora Ganadería", desc: "Gestión integral de ganadería, rotación de potreros, registro sanitario y trazabilidad animal.", Icon: IconFarm },
};
const SISTEMA_POR_DEFECTO = { ruta: "/mediclinic", label: "Mediclinic Pro", nombre: "Mediclinic Pro — Espacio Clínico", desc: "Historias clínicas digitales, agenda médica, sala de espera reactiva, cotizador y caja diaria.", Icon: IconClinic };

const FEATURES = [
  { title: "Asistente de IA por WhatsApp", desc: "En Comercio: responde precios, stock y tasa BCV al instante y sin costo. Con límites de costo por negocio." },
  { title: "Control Sanitario Estricto", desc: "En Ganadería: si un animal sigue en período de retiro por vacuna o tratamiento, el sistema bloquea su venta." },
  { title: "Récipe Médico y Vademécum", desc: "En Mediclinic y Odontología: 36+ fármacos con posología, detección de alergias y récipe oficial en PDF." },
  { title: "Módulos Integrados", desc: "Ventas, inventario, caja y auditoría conectados sin planillas paralelas ni datos duplicados." },
  { title: "Cobros a prueba de cortes", desc: "Si se cae la conexión en pleno cobro, reintentar no duplica el pago ni el movimiento de caja. En Ganadería puedes trabajar sin internet y se sincroniza al volver." },
  { title: "Seguridad y Auditoría", desc: "Roles y permisos granulares por tenant, con trazabilidad completa de cada acción." },
];

const PLANS = [
  {
    name: "Aurora Básico", price: "$25", period: "/mes", desc: "Lo esencial de tu vertical para dejar de operar a mano",
    features: ["Módulos base (POS/agenda, inventario, caja)", "Acceso web + versión móvil", "Sin costo extra por usuario adicional", "Multi-moneda (USD · VES · COP)", "Cobros sin duplicados aunque se caiga la conexión"],
    cta: "Comenzar con Básico", highlight: false, badge: "",
  },
  {
    name: "Aurora Full", price: "Desde $40", period: "/mes", desc: "Todo lo del Básico + nuestras herramientas avanzadas",
    features: ["Comercio: catálogo público + IA por WhatsApp", "Mediclinic/Odontología: vademécum y récipe oficial", "Ganadería: mapa satelital y básculas bluetooth", "Reportes y BI avanzado", "Acompañamiento prioritario"],
    cta: "Quiero Aurora Full", highlight: true, badge: "MÁS POPULAR",
  },
];

const STATS = [
  { value: "5",       label: "Rubros especializados" },
  { value: "1 mes",   label: "De prueba gratis" },
  { value: "3",       label: "Monedas: USD · VES · COP" },
  { value: "$0",      label: "Por usuario adicional" },
];

export default function Home() {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();
  const [activeIndustry, setActiveIndustry] = useState(0);

  return (
    <main className="w-full bg-white text-[#1D1D1F] antialiased">
      
      {/* ── HERO SECTION APPLE AESTHETIC ── */}
      <section className="relative pt-28 pb-20 md:pt-40 md:pb-28 px-6 sm:px-8 border-b border-[#E5E5EA] overflow-hidden">
        {/* Imagen de fondo a todo el ancho de la página, difuminada en los 4 bordes para fundirse con el blanco */}
        <div className="absolute inset-x-0 bottom-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
          <div className="relative w-full h-[760px] sm:h-[900px] md:h-[1080px]">
            <img
              src="/hero-laptop.png"
              alt="Aurora Productividad"
              className="w-full h-full object-cover object-center opacity-45 select-none mix-blend-multiply"
            />
            {/* Difuminado perimetral: arriba fuerte (no pelea con el texto), abajo hacia el blanco del borde de sección, y en ambos lados para que no se vea recortada */}
            <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white pointer-events-none" />
            <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-white to-transparent pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-white to-transparent pointer-events-none" />
          </div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center flex flex-col items-center">

          {/* H1 Monumental */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[#1D1D1F] max-w-4xl leading-[1.06] mb-6">
            Automatiza, simplifica y haz crecer tu negocio.
          </h1>

          {/* Subtítulo */}
          <p className="text-lg sm:text-xl md:text-2xl text-[#6E6E73] max-w-2xl font-normal leading-relaxed mb-10 tracking-tight">
            De la libreta y las hojas de Excel a la tranquilidad de un sistema integrado. Controla caja, inventario, agenda clínica y producción en tiempo real.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mb-16">
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
              className="w-full sm:w-auto"
              onClick={() => navigate("/auth?registro=1")}
            >
              Probar gratis 1 mes
            </SpecularButton>
            <SpecularButton
              size="lg"
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
              className="w-full sm:w-auto shadow-sm"
              onClick={() => navigate("/industrias")}
            >
              Ver los rubros
            </SpecularButton>
          </div>

          {/* Acceso Directo de Sesión (si está logueado) */}
          {isLoggedIn && (() => {
            const miSistema = SISTEMA_POR_INDUSTRIA[user?.industry || ""] || SISTEMA_POR_DEFECTO;
            return (
              <div className="w-full max-w-2xl bg-[#F5F5F7] border border-[#E5E5EA] rounded-2xl p-6 mb-16 text-left flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white border border-[#E5E5EA] flex items-center justify-center text-[#177E89] shadow-sm">
                    <miSistema.Icon size={24} />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-[#177E89]">
                      Sistema Asignado
                    </div>
                    <div className="font-bold text-base text-[#1D1D1F]">
                      {miSistema.nombre}
                    </div>
                    <div className="text-xs text-[#86868B]">{miSistema.desc}</div>
                  </div>
                </div>
                <button
                  onClick={() => navigate(miSistema.ruta)}
                  className="btn-deep-black text-xs font-semibold px-5 py-2.5 rounded-full cursor-pointer whitespace-nowrap"
                >
                  Abrir {miSistema.label} →
                </button>
              </div>
            );
          })()}

          {/* Métricas / Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full pt-10 border-t border-[#E5E5EA] text-center">
            {STATS.map((s) => (
              <div key={s.label}>
                <div className="text-4xl sm:text-5xl font-bold tracking-tight text-[#1D1D1F] mb-1">
                  {s.value}
                </div>
                <div className="text-xs font-medium text-[#86868B] uppercase tracking-wider">
                  {s.label}
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── SECCIÓN DE INDUSTRIAS ── */}
      <section className="py-20 md:py-28 px-6 sm:px-8 bg-[#F5F5F7] border-b border-[#E5E5EA]">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1D1D1F] mb-4">
              Diseñado para la realidad de cada sector
            </h2>
            <p className="text-base sm:text-lg text-[#86868B]">
              No adaptamos un sistema genérico: cada módulo responde a los flujos operativos reales de tu empresa.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {INDUSTRIES.map((ind, idx) => {
              return (
                <div
                  key={ind.name}
                  onClick={() => setActiveIndustry(idx)}
                  className={`bg-white border rounded-2xl overflow-hidden cursor-pointer shadow-sm transition-all ${
                    activeIndustry === idx ? "border-[#177E89] ring-1 ring-[#177E89]" : "border-[#E5E5EA] hover:border-[#D1D1D6]"
                  }`}
                >
                  <div className="group relative aspect-[16/10] overflow-hidden" style={ind.imgs.length === 0 ? { background: ind.placeholder } : undefined}>
                    <IndustryPhoto imgs={ind.imgs} />
                  </div>
                  <div className="p-5">
                    <h3 className="text-base font-bold text-[#1D1D1F] tracking-tight mb-1">
                      {ind.name}
                    </h3>
                    <p className="text-xs text-[#86868B] leading-relaxed">
                      {ind.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ── AURORA ENGINE CORE (ARQUITECTURA) ── */}
      <section className="py-20 md:py-28 px-6 sm:px-8 bg-white border-b border-[#E5E5EA]">
        <div className="max-w-5xl mx-auto">
          
          <div className="bg-[#F5F5F7] border border-[#E5E5EA] rounded-3xl p-8 sm:p-12">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-8 border-b border-[#E5E5EA]">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-2xl bg-white border border-[#E5E5EA] shadow-sm">
                  <AuroraLogo size={36} animated={false} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#1D1D1F] tracking-tight">Todo tu negocio en un solo lugar</h3>
                  <p className="text-xs text-[#86868B] mt-0.5">Lo que registras en un módulo aparece al instante en los demás, sin volver a escribirlo.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-8 text-left">
              {[
                { label: "Caja", val: "Cada cobro entra solo a caja" },
                { label: "Inventario", val: "Se descuenta al vender o atender" },
                { label: "Tasa del día", val: "Bolívares y dólares al cambio vigente" },
                { label: "Historial", val: "Quién hizo qué y cuándo" },
              ].map((item) => (
                <div key={item.label} className="bg-white border border-[#E5E5EA] rounded-2xl p-5 shadow-sm">
                  <div className="w-8 h-px bg-[#177E89] mb-4" aria-hidden="true" />
                  <div className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1">{item.label}</div>
                  <div className="text-sm font-bold text-[#1D1D1F]">{item.val}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── CARACTERÍSTICAS DESTACADAS ── */}
      <section className="py-20 md:py-28 px-6 sm:px-8 bg-white border-b border-[#E5E5EA]">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1D1D1F] mb-4">
              Potencia tecnológica sin complicaciones
            </h2>
            <p className="text-base sm:text-lg text-[#86868B]">
              Herramientas de nivel empresarial preparadas para el trabajo diario.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feat) => {
              return (
                <div key={feat.title} className="bg-[#F5F5F7] border border-[#E5E5EA] rounded-2xl p-7">
                  <div className="w-8 h-px bg-[#177E89] mb-5" aria-hidden="true" />
                  <h3 className="text-base font-bold text-[#1D1D1F] mb-2">{feat.title}</h3>
                  <p className="text-xs text-[#86868B] leading-relaxed">{feat.desc}</p>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ── PLANES Y PRECIOS ── */}
      <section className="py-20 md:py-28 px-6 sm:px-8 bg-[#F5F5F7]">
        <div className="max-w-4xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1D1D1F] mb-4">
              Planes claros y transparentes
            </h2>
            <p className="text-base text-[#86868B]">
              Sin sorpresas ni cargos ocultos. Elige el plan que mejor se adapte a tu escala.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`bg-white border rounded-3xl p-8 sm:p-10 flex flex-col justify-between shadow-sm relative ${
                  p.highlight ? "border-[#177E89] ring-2 ring-[#177E89]" : "border-[#E5E5EA]"
                }`}
              >
                {p.badge && (
                  <span className="absolute -top-3 right-8 bg-[#177E89] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                    {p.badge}
                  </span>
                )}

                <div>
                  <h3 className="text-xl font-bold text-[#1D1D1F] mb-2">{p.name}</h3>
                  <p className="text-xs text-[#86868B] mb-6">{p.desc}</p>
                  
                  <div className="flex items-baseline gap-1 mb-8">
                    <span className="text-4xl sm:text-5xl font-bold tracking-tight text-[#1D1D1F]">{p.price}</span>
                    <span className="text-sm font-medium text-[#86868B]">{p.period}</span>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {p.features.map((feat) => (
                      <li key={feat} className="text-xs text-[#1D1D1F] flex items-center gap-3">
                        <span className="w-4 h-4 rounded-full bg-[#177E89]/10 text-[#177E89] flex items-center justify-center flex-shrink-0">
                          <IconCheck size={9} />
                        </span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => navigate("/auth?registro=1")}
                  className={`w-full py-3.5 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                    p.highlight
                      ? "btn-deep-black"
                      : "bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] border border-[#E5E5EA]"
                  }`}
                >
                  {p.cta}
                </button>
              </div>
            ))}
          </div>

        </div>
      </section>

    </main>
  );
}
