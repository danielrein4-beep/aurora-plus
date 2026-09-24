import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AuroraLogo from "../AuroraLogo";
import SpecularButton from "../components/SpecularButton";
import Kicker from "../components/Kicker";
import { useAuth } from "../context/AuthContext";
import {
  IconClinic, IconHardware,
  IconRestaurant, IconFarm,
  IconTooth, IconCheck,
} from "../Icons";

const INDUSTRIES = [
  { Icon: IconClinic,     name: "Mediclinic Pro",    desc: "Historias clínicas, agenda, sala de espera en vivo, cotizador multidivisa.", imgs: ["/industrias/mediclinic.jpg"] },
  { Icon: IconTooth,      name: "Odontología",       desc: "Odontograma FDI interactivo, periodontograma de 6 puntos, planes por fases.", imgs: ["/industrias/odontologia.jpg"] },
  { Icon: IconHardware,   name: "Comercio",          desc: "POS mostrador, inventario en tiempo real, catálogo con pedidos por WhatsApp.", imgs: ["/industrias/comercio-electronica.jpg", "/industrias/comercio-ferreteria.jpg", "/industrias/comercio-telefonos.jpg"] },
  { Icon: IconRestaurant, name: "Restaurantes",      desc: "Comandas digitales, mesas, cocina en tiempo real y cierres de caja automáticos.", imgs: ["/industrias/restaurantes.jpg"] },
  { Icon: IconFarm,       name: "Control de Fincas", desc: "Mapa satelital de potreros, básculas bluetooth y control sanitario.", imgs: ["/industrias/ganaderia.jpg"] },
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
  { title: "Seguridad y Auditoría", desc: "Cada persona entra con su rol y sus permisos, y queda registrado quién hizo qué y cuándo." },
];

const PLANS = [
  {
    name: "Aurora Básico", price: "$25", period: "/mes", desc: "Lo esencial de tu vertical para dejar de operar a mano",
    features: ["Módulos base (POS/agenda, inventario, caja)", "Acceso web + versión móvil", "Sin costo extra por usuario adicional", "Multi-moneda (USD · VES · COP)", "Cobros sin duplicados aunque se caiga la conexión"],
    cta: "Comenzar con Básico", highlight: false, badge: "", plan: "basico",
  },
  {
    name: "Aurora Full", price: "Desde $40", period: "/mes", desc: "Todo lo del Básico + nuestras herramientas avanzadas",
    features: ["Comercio: catálogo público + IA por WhatsApp", "Mediclinic/Odontología: vademécum y récipe oficial", "Ganadería: mapa satelital y básculas bluetooth", "Reportes y BI avanzado", "Acompañamiento prioritario"],
    cta: "Quiero Aurora Full", highlight: true, badge: "Más popular", plan: "full",
  },
];

const STATS = [
  { value: "5",       label: "Rubros especializados" },
  { value: "15 días", label: "De prueba gratis" },
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
      <section className="relative pt-28 pb-16 md:pt-36 md:pb-20 px-6 sm:px-8 border-b border-[#E5E5EA] overflow-hidden">
        {/* Imagen de fondo a todo el ancho de la página, difuminada en los 4 bordes para fundirse con el blanco */}
        <div className="absolute inset-x-0 bottom-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
          <div className="relative w-full h-[760px] sm:h-[900px] md:h-[1080px] translate-y-20">
            <img
              src="/hero-laptop.png"
              alt="Aurora Productividad"
              className="w-full h-full object-cover object-center opacity-60 select-none mix-blend-multiply"
              style={{ filter: "contrast(1.08) drop-shadow(0 24px 32px rgba(13,59,61,0.3))" }}
            />
            {/* Difuminado perimetral: arriba fuerte (no pelea con el texto), abajo hacia el blanco del borde de sección, y en ambos lados para que no se vea recortada */}
            <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white pointer-events-none" />
            <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-white to-transparent pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-white to-transparent pointer-events-none" />
          </div>
        </div>

        <div className="relative z-10 w-full max-w-5xl mx-auto text-center flex flex-col items-center">

          <p className="text-sm font-light uppercase tracking-wide text-[#177E89] mb-4">Software de gestión, hecho a tu medida</p>

          {/* H1 Monumental */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-[#1D1D1F] max-w-4xl leading-[1.06] mb-6">
            Automatiza, simplifica y haz crecer tu negocio.
          </h1>

          {/* Subtítulo */}
          <p className="text-base sm:text-lg text-[#424245] max-w-2xl leading-relaxed mb-8">
            De la libreta y las hojas de Excel a la tranquilidad de un sistema integrado. Controla caja, inventario, agenda clínica y producción en tiempo real.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mb-10">
            <SpecularButton
              size="lg"
              radius={4}
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
              Probar gratis 15 días
            </SpecularButton>
            <button
              onClick={() => navigate("/industrias")}
              className="text-sm font-medium text-[#1D1D1F] border-b border-[#1D1D1F]/30 hover:border-[#1D1D1F] pb-0.5 transition-colors cursor-pointer"
            >
              Ver los rubros →
            </button>
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
                    <div className="text-xs font-medium uppercase tracking-wide text-[#177E89]">
                      Sistema asignado
                    </div>
                    <div className="font-bold text-base text-[#1D1D1F]">
                      {miSistema.nombre}
                    </div>
                    <div className="text-sm text-[#6E6E73]">{miSistema.desc}</div>
                  </div>
                </div>
                <button
                  onClick={() => navigate(miSistema.ruta)}
                  className="btn-deep-black text-sm font-semibold px-5 py-2.5 rounded-md cursor-pointer whitespace-nowrap"
                >
                  Abrir {miSistema.label} →
                </button>
              </div>
            );
          })()}

          {/* Métricas / Stats — deliberadamente más abajo, para que aparezcan al hacer scroll y no compitan con los botones en la primera vista */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full mt-16 sm:mt-24 pt-10 border-t border-[#E5E5EA] text-center">
            {STATS.map((s) => (
              <div key={s.label}>
                <div className="text-4xl sm:text-5xl font-bold tracking-tight text-[#1D1D1F] mb-1">
                  {s.value}
                </div>
                <div className="text-xs font-medium uppercase text-[#6E6E73] tracking-wide">
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
            <Kicker>Cinco rubros, un mismo sistema</Kicker>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1D1D1F] mb-4">
              Diseñado para la realidad de cada sector
            </h2>
            <p className="text-base sm:text-lg text-[#6E6E73]">
              No adaptamos un sistema genérico: cada módulo responde a los flujos operativos reales de tu empresa.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {INDUSTRIES.map((ind, idx) => {
              return (
                <div
                  key={ind.name}
                  onClick={() => setActiveIndustry(idx)}
                  className={`group relative overflow-hidden bg-[#0D3B3D] cursor-pointer transition-all ${
                    idx === 2 ? "sm:col-span-2 aspect-[4/5] sm:aspect-[16/9]" : "aspect-[4/5]"
                  } ${
                    activeIndustry === idx ? "ring-2 ring-inset ring-[#177E89]" : ""
                  }`}
                >
                  <IndustryPhoto imgs={ind.imgs} />
                  {/* Degradado oscuro para que el texto blanco sea legible sobre la foto */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent pointer-events-none" />
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <p className="text-[11px] font-light uppercase tracking-wide text-[#ffffff]/70 mb-1">Aurora Plus</p>
                    <h3 className="font-['Fraunces'] text-3xl sm:text-4xl text-[#ffffff] mb-2">
                      {ind.name}
                    </h3>
                    <p className="text-sm text-white/85 leading-relaxed mb-4 max-w-[85%]">
                      {ind.desc}
                    </p>
                    <span className="text-sm font-medium text-white border-b border-white/50 group-hover:border-[#ffffff] pb-0.5 transition-colors">
                      Ver más
                    </span>
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
                  <h3 className="text-xl font-bold tracking-tight text-[#1D1D1F]">Todo tu negocio en un solo lugar</h3>
                  <p className="text-sm text-[#6E6E73] mt-0.5">Lo que registras en un módulo aparece al instante en los demás, sin volver a escribirlo.</p>
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
                  <div className="text-[11px] font-semibold uppercase text-[#177E89] tracking-wide mb-1">{item.label}</div>
                  <div className="text-sm font-medium text-[#1D1D1F]">{item.val}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── CARACTERÍSTICAS DESTACADAS: fondo petróleo de la marca, para no encadenar secciones blancas ── */}
      <section className="py-20 md:py-28 px-6 sm:px-8 bg-[#0D3B3D]">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Kicker className="!text-[#5BC0BE]">Lo que te ahorra trabajo</Kicker>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
              Herramientas que se notan desde el primer día
            </h2>
            <p className="text-base sm:text-lg text-white/70">
              Pensadas para el trabajo diario de un negocio en Venezuela, sin complicaciones.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feat) => {
              return (
                <div key={feat.title} className="bg-white/[0.06] border border-white/10 rounded-2xl p-7 hover:bg-white/[0.09] transition-colors">
                  <div className="w-8 h-0.5 bg-[#5BC0BE] mb-5" aria-hidden="true" />
                  <h3 className="text-base font-semibold text-white mb-2">{feat.title}</h3>
                  <p className="text-sm text-white/70 leading-relaxed">{feat.desc}</p>
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
            <Kicker>Sin letra pequeña</Kicker>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1D1D1F] mb-4">
              Planes claros y transparentes
            </h2>
            <p className="text-base text-[#6E6E73]">
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
                  <span className="absolute -top-3 right-8 bg-[#177E89] text-white text-[11px] font-['Fraunces'] italic px-3 py-1 rounded-full shadow-sm">
                    {p.badge}
                  </span>
                )}

                <div>
                  <h3 className="text-xl font-bold tracking-tight text-[#1D1D1F] mb-2">{p.name}</h3>
                  <p className="text-sm text-[#6E6E73] mb-6">{p.desc}</p>

                  <div className="flex items-baseline gap-1 mb-8">
                    <span className="text-4xl sm:text-5xl font-bold tracking-tight text-[#1D1D1F]">{p.price}</span>
                    <span className="text-sm text-[#6E6E73]">{p.period}</span>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {p.features.map((feat) => (
                      <li key={feat} className="text-sm text-[#1D1D1F] flex items-center gap-3">
                        <span className="w-4 h-4 rounded-full bg-[#177E89]/10 text-[#177E89] flex items-center justify-center flex-shrink-0">
                          <IconCheck size={9} />
                        </span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => navigate(`/auth?registro=1&plan=${p.plan}`)}
                  className={`w-full py-3.5 rounded-md text-sm font-semibold transition-all cursor-pointer ${
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
