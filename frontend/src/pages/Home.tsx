import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuroraLogo from "../AuroraLogo";
import {
  IconVet, IconClinic, IconHardware, IconMining,
  IconRestaurant, IconFarm, IconEducation, IconRetail,
  IconCustomize, IconChart, IconLink, IconCloud, IconLock, IconMobile,
  IconLaptop, IconPhone, IconPlane,
} from "../Icons";

const INDUSTRIES = [
  { Icon: IconVet,        name: "Veterinaria",        desc: "Historial clínico, citas, vacunas, inventario de medicamentos y facturación en un solo módulo." },
  { Icon: IconClinic,     name: "Clínicas Médicas",   desc: "Expedientes digitales, agenda de consultas, laboratorio, farmacia y cobranza integrada." },
  { Icon: IconHardware,   name: "Ferretería",          desc: "Control de stock, proveedores, ventas por mostrador, cotizaciones y reportes de rotación." },
  { Icon: IconMining,     name: "Minería",             desc: "Gestión de maquinaria, turnos, órdenes de trabajo, seguridad e informes regulatorios." },
  { Icon: IconRestaurant, name: "Restaurantes",        desc: "Comandas digitales, mesas, cocina en tiempo real, inventario y cierres de caja automáticos." },
  { Icon: IconFarm,       name: "Control de Fincas",   desc: "Gestión integral de ganadería, rotación de potreros, registro sanitario, vacunación y trazabilidad animal por lote." },
  { Icon: IconEducation,  name: "Educación",           desc: "Matrícula, horarios, calificaciones, comunicación padres-escuela y nómina docente." },
  { Icon: IconRetail,     name: "Retail",              desc: "POS multitienda, e-commerce, fidelización de clientes y análisis de ventas por categoría." },
];

const FEATURES = [
  { Icon: IconCustomize, title: "100% Personalizable",    desc: "Cada módulo se adapta al flujo exacto de tu negocio. Sin código extra, sin consultores costosos.", color: "from-teal-400 to-cyan-400" },
  { Icon: IconChart,     title: "Reportes en Tiempo Real", desc: "Paneles con KPIs críticos actualizados al instante. Toma decisiones con datos, no intuición.",    color: "from-sky-400 to-blue-500" },
  { Icon: IconLink,      title: "Módulos Integrados",      desc: "Ventas, inventario, RRHH, contabilidad y operaciones hablan entre sí sin fricciones.",            color: "from-violet-400 to-purple-600" },
  { Icon: IconCloud,     title: "Nube + Local",            desc: "Trabaja con o sin internet. Sincronización automática cuando vuelvas a conectarte.",               color: "from-teal-400 to-blue-500" },
  { Icon: IconLock,      title: "Seguridad Empresarial",   desc: "Roles y permisos granulares. Auditoría completa de cada acción dentro del sistema.",               color: "from-blue-400 to-violet-500" },
  { Icon: IconMobile,    title: "Web y Móvil",             desc: "Accede desde cualquier dispositivo. Versión móvil optimizada incluida en todos los planes.",       color: "from-purple-400 to-pink-500" },
];

const PLANS = [
  {
    name: "Básico",    price: "$25", period: "/mes", desc: "Para negocios que están comenzando",
    features: ["Acceso web + versión móvil", "3 módulos esenciales", "1 sucursal", "Hasta 3 usuarios", "Reportes básicos", "Soporte por correo"],
    cta: "Comenzar ahora", highlight: false, badge: "",
  },
  {
    name: "Estándar",  price: "$35", period: "/mes", desc: "Para negocios en crecimiento",
    features: ["Acceso web + versión móvil", "6 módulos a elegir", "Hasta 3 sucursales", "Hasta 10 usuarios", "Reportes avanzados", "Facturación electrónica", "Soporte prioritario"],
    cta: "Empezar ahora", highlight: true, badge: "MÁS POPULAR",
  },
  {
    name: "Full",      price: "$60", period: "/mes", desc: "Para operaciones de gran escala",
    features: ["Acceso web + versión móvil", "Módulos ilimitados", "Sucursales ilimitadas", "Usuarios ilimitados", "BI y analítica avanzada", "Integraciones contables", "Capacitación incluida", "Soporte 24/7"],
    cta: "Solicitar demo", highlight: false, badge: "",
  },
  {
    name: "Página Web", price: "Cotizable", period: "", desc: "Presencia digital profesional",
    features: ["Diseño personalizado con tu marca", "Catálogo de productos o servicios", "Ventana de pagos integrada", "Dominio y hosting incluido", "Optimización para Google (SEO)", "Integración con Aurora Plus"],
    cta: "Solicitar cotización", highlight: false, badge: "NUEVO",
  },
];

const TESTIMONIALS = [
  { name: "Dr. Andrés Molina",  role: "Director, Clínica VetSur",             avatar: "AM", text: "Antes llevábamos todo en papel. Con Aurora Plus digitalizamos expedientes, citas y farmacia en 2 semanas. Ahora atendemos 40% más pacientes.", color: "from-teal-500 to-cyan-400" },
  { name: "Carla Mendoza",      role: "Gerente, Ferretería El Constructor",   avatar: "CM", text: "El control de inventario era nuestro punto débil. Hoy sabemos exactamente qué tenemos en bodega, cuándo reordenar y qué nos da más margen.",  color: "from-blue-500 to-violet-400" },
  { name: "Ing. Roberto Salas", role: "Ops Manager, MinPetrol S.A.",          avatar: "RS", text: "Gestionamos 3 faenas con Aurora Plus. La trazabilidad de equipos y los reportes de seguridad nos ahorraron más de 80 horas mensuales de papeleo.", color: "from-violet-500 to-purple-400" },
];

const STATS = [
  { value: "1,200+",  label: "Empresas activas" },
  { value: "18",      label: "Industrias cubiertas" },
  { value: "99.9%",   label: "Uptime garantizado" },
  { value: "< 2 sem", label: "Tiempo de implementación" },
];

const MODULES = ["Ventas & POS", "Inventario", "RRHH & Nómina", "Contabilidad", "CRM", "Compras", "Producción", "Proyectos", "Reportes BI", "Facturación Electrónica"];

const previewData: Record<string, { metric: string; value: string; sub: string; color: string }[]> = {
  "Ferretería": [
    { metric: "Ventas hoy",         value: "$14,820", sub: "+9% vs ayer",           color: "text-teal-400" },
    { metric: "Artículos en stock", value: "4,231",   sub: "12 bajo mínimo",        color: "text-sky-400" },
    { metric: "Órdenes pendientes", value: "18",      sub: "3 urgentes",            color: "text-violet-400" },
  ],
  "Veterinaria": [
    { metric: "Citas hoy",          value: "34",      sub: "6 cirugías",            color: "text-teal-400" },
    { metric: "Pacientes activos",  value: "1,820",   sub: "+12 esta semana",       color: "text-sky-400" },
    { metric: "Stock farmacia",     value: "98%",     sub: "2 alertas",             color: "text-violet-400" },
  ],
  "Minería": [
    { metric: "Equipos activos",    value: "47/52",   sub: "5 en mantención",       color: "text-teal-400" },
    { metric: "Toneladas / día",    value: "8,400 t", sub: "+3.2% vs meta",         color: "text-sky-400" },
    { metric: "Incidentes mes",     value: "0",       sub: "32 días sin accidentes", color: "text-violet-400" },
  ],
};

export default function Home() {
  const [activeTab, setActiveTab] = useState("Ferretería");
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const navigate = useNavigate();

  const HERO_VERTICALS = [
    { title: "Salud & Clínicas", subtitle: "Historias clínicas, citas y triaje", badge: "NUEVO", stat: "100% Digital", img: "🏥" },
    { title: "Minería & Faenas", subtitle: "Control de mineral, cuadrillas y romana", badge: "ACTIVO", stat: "Balanza Real", img: "⛏️" },
    { title: "Horeca & Restaurantes", subtitle: "Comandas POS, cocina y escandallo", badge: "POPULAR", stat: "Offline POS", img: "🍽️" },
    { title: "Ganadería & Fincas", subtitle: "Hato, potreros y control sanitario", badge: "PRO", stat: "Trazabilidad", img: "🐂" },
    { title: "Ferreterías & Retail", subtitle: "Kardex multi-unidad y listas por volumen", badge: "PRO", stat: "Stock en Vivo", img: "🔧" },
    { title: "Moda & Boutique", subtitle: "Variantes talla/color y fidelización", badge: "SMART", stat: "Puntos & Gift", img: "👗" },
    { title: "Tamanaco Industrial", subtitle: "Operación integral, tesorería y OCR", badge: "ENTERPRISE", stat: "Multi-Empresa", img: "🏭" },
  ];

  return (
    <main className="relative overflow-hidden">
      {/* ── HERO MONUMENTAL CON CAPAS 3D ── */}
      <section className="relative min-h-[92vh] flex flex-col justify-between pt-24 pb-12 px-4 sm:px-8 max-w-7xl mx-auto">
        
        {/* Capa de Fondo: Tipografía Monumental Gigante y Cuadrícula Cyber */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center overflow-hidden">
          <div className="cyber-grid absolute inset-0 opacity-40" />
          <div className="monumental-text text-[20vw] sm:text-[18vw] lg:text-[16vw] font-black leading-none tracking-widest text-center select-none -translate-y-12">
            AURORA
          </div>
          {/* Luces volumétricas de neón */}
          <div className="absolute w-[600px] h-[350px] bg-teal-500/15 rounded-full blur-[120px] -top-20 -left-20 animate-pulse" />
          <div className="absolute w-[600px] h-[350px] bg-purple-600/15 rounded-full blur-[140px] top-1/3 -right-20 animate-pulse" />
        </div>

        {/* Capa Central: Título Superior y Automatización */}
        <div className="relative z-10 text-center max-w-4xl mx-auto pt-6">
          {/* Badge interactivo con pulso */}
          <div className="inline-flex items-center gap-2.5 bg-white/5 border border-teal-500/30 backdrop-blur-xl rounded-full px-4 py-1.5 text-xs text-teal-300 mb-6 shadow-[0_0_20px_rgba(0,229,184,0.15)]">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
            <span className="font-semibold tracking-wide">SOFTWARE ERP MULTI-INDUSTRIA & AUTOMATIZACIÓN</span>
          </div>

          <h1 className="font-['Outfit'] font-black text-4xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight text-white mb-6 drop-shadow-2xl">
            Controla y escala tu empresa <br className="hidden sm:inline" />
            <span className="text-aurora">desde un solo ecosistema</span>
          </h1>
        </div>

        {/* Capa Flotante Visual de Automatización / Core */}
        <div className="relative z-10 max-w-4xl mx-auto my-4 w-full">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative overflow-hidden group">
            <div className="line-aurora absolute top-0 left-0 right-0" />
            
            {/* Cabecera del panel de automatización */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <AuroraLogo size={40} animated />
                <div>
                  <div className="font-['Outfit'] font-bold text-base text-white flex items-center gap-2">
                    Aurora Core Engine <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono">v2.4 ONLINE</span>
                  </div>
                  <div className="text-white/40 text-xs font-mono">Spring Boot 3.3 · Postgres Multi-Tenant · Offline Sync</div>
                </div>
              </div>

              {/* Status Pills */}
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-teal-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" /> Multi-Moneda (USD/VES/COP)
                </span>
                <span className="hidden sm:inline-flex px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-purple-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" /> 7 Verticales
                </span>
              </div>
            </div>

            {/* Grid de Nodos de Automatización */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6">
              {[
                { label: "Caja Central", val: "Sincronizada", icon: "💳", color: "text-teal-400" },
                { label: "Kardex e Insumos", val: "Auto-Descuento", icon: "📦", color: "text-sky-400" },
                { label: "Offline POS", val: "100% Idempotente", icon: "⚡", color: "text-purple-400" },
                { label: "Roles & Privacidad", val: "RBAC Estricto", icon: "🛡️", color: "text-amber-400" },
              ].map((n) => (
                <div key={n.label} className="bg-black/30 rounded-2xl p-3.5 border border-white/5 hover:border-teal-500/30 transition-all">
                  <div className="text-xl mb-1">{n.icon}</div>
                  <div className="text-white font-medium text-xs">{n.label}</div>
                  <div className={`text-[11px] font-mono mt-0.5 ${n.color}`}>{n.val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Capa Inferior (Métricas a la Izquierda + CTA + Preview Interactivo a la Derecha) */}
        <div className="relative z-10 pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            
            {/* Lado Izquierdo: Métricas y Botón de Acción Principal */}
            <div className="lg:col-span-7 space-y-6">
              {/* Bloque de Métricas Estilo Monumental */}
              <div className="grid grid-cols-3 gap-4 sm:gap-6 border-b border-white/10 pb-6">
                <div>
                  <div className="font-['Outfit'] font-black text-3xl sm:text-4xl text-white">7+</div>
                  <div className="text-white/40 text-xs mt-1 font-medium leading-snug">Industrias nativas</div>
                </div>
                <div>
                  <div className="font-['Outfit'] font-black text-3xl sm:text-4xl text-teal-400">100%</div>
                  <div className="text-white/40 text-xs mt-1 font-medium leading-snug">Offline-First POS</div>
                </div>
                <div>
                  <div className="font-['Outfit'] font-black text-2xl sm:text-3xl text-purple-400">Multi</div>
                  <div className="text-white/40 text-xs mt-1 font-medium leading-snug">USD · VES · COP</div>
                </div>
              </div>

              {/* Botón de Acción y Descripción */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate("/onboarding")}
                    className="bg-white text-black hover:bg-teal-300 font-bold px-7 py-3.5 rounded-full text-sm transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-105 flex items-center gap-2">
                    Solicitar demo ahora
                  </button>
                  <button
                    onClick={() => navigate("/onboarding")}
                    className="w-11 h-11 rounded-full bg-white text-black hover:bg-teal-300 flex items-center justify-center font-bold transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-105">
                    ↗
                  </button>
                </div>
                <p className="text-white/45 text-xs sm:text-sm leading-relaxed max-w-sm">
                  Automatiza clínicas, fincas, restaurantes, ferreterías y minería desde una sola plataforma.
                </p>
              </div>
            </div>

            {/* Lado Derecho: Tarjeta Flotante Interactiva de Verticales (01/07) */}
            <div className="lg:col-span-5">
              <div className="glass-panel rounded-2xl p-5 border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{HERO_VERTICALS[activeHeroIndex].img}</span>
                    <div>
                      <h4 className="font-['Outfit'] font-bold text-white text-sm">
                        {HERO_VERTICALS[activeHeroIndex].title}
                      </h4>
                      <p className="text-white/40 text-xs">
                        {HERO_VERTICALS[activeHeroIndex].subtitle}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    {HERO_VERTICALS[activeHeroIndex].badge}
                  </span>
                </div>

                {/* Barra de progreso y Switcher 01/07 */}
                <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs text-white/50">
                  <span className="font-mono text-teal-400 font-bold">
                    0{activeHeroIndex + 1} <span className="text-white/20">/ 07</span>
                  </span>
                  
                  {/* Selector de pestañas */}
                  <div className="flex items-center gap-1.5">
                    {HERO_VERTICALS.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveHeroIndex(idx)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          activeHeroIndex === idx ? "w-6 bg-teal-400 shadow-[0_0_10px_#00e5b8]" : "w-2 bg-white/20 hover:bg-white/40"
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => setActiveHeroIndex((prev) => (prev + 1) % HERO_VERTICALS.length)}
                    className="text-white/60 hover:text-teal-300 transition-colors font-semibold flex items-center gap-1">
                    Siguiente →
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

      </section>

      {/* ── TICKER ── */}
      <div className="relative overflow-hidden py-4 border-y border-white/5">
        <div className="line-aurora absolute top-0 left-0 right-0" />
        <div className="flex gap-6 whitespace-nowrap" style={{ animation: "ticker 22s linear infinite" }}>
          {[...MODULES, ...MODULES, ...MODULES].map((m, i) => (
            <span key={i} className="text-sm text-white/30 font-medium flex items-center gap-3 flex-shrink-0">
              <span className="text-aurora opacity-60">✦</span> {m}
            </span>
          ))}
        </div>
        <div className="line-aurora absolute bottom-0 left-0 right-0" />
      </div>

      {/* ── INDUSTRIES ── */}
      <section className="py-24 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold tracking-widest text-teal-400 uppercase mb-3">Para tu industria</p>
          <h2 className="font-['Outfit'] font-bold text-4xl sm:text-5xl text-white">
            Un sistema que entiende<br /><span className="text-aurora">cómo funciona tu negocio</span>
          </h2>
          <p className="text-white/40 text-base mt-4 max-w-xl mx-auto">Más de 18 verticales con módulos preconfigurados y flujos adaptados a cada operación.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {INDUSTRIES.map((ind) => (
            <div key={ind.name}
              onClick={() => navigate("/industrias")}
              className="hover-card bg-[#0c0c20] border border-white/5 rounded-2xl p-5 cursor-pointer card-shadow">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center mb-3">
                <ind.Icon size={20} />
              </div>
              <h3 className="font-['Outfit'] font-semibold text-white text-base mb-1.5">{ind.name}</h3>
              <p className="text-white/40 text-xs leading-relaxed">{ind.desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-8">
          <button onClick={() => navigate("/industrias")} className="text-teal-400 hover:text-teal-300 text-sm transition-colors">
            Ver todas las industrias →
          </button>
        </div>
      </section>

      {/* ── DASHBOARD PREVIEW ── */}
      <section className="py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="relative bg-[#0c0c20] rounded-3xl border border-white/5 overflow-hidden">
          <div className="line-aurora absolute top-0 left-0 right-0" />
          <div className="p-6 sm:p-10 flex flex-col lg:flex-row gap-10">
            <div className="lg:w-80 flex-shrink-0">
              <p className="text-xs font-semibold tracking-widest text-violet-400 uppercase mb-3">Vista en vivo</p>
              <h2 className="font-['Outfit'] font-bold text-3xl text-white leading-tight mb-4">Tu operación,<br />en tiempo real</h2>
              <p className="text-white/45 text-sm leading-relaxed mb-6">Paneles configurables que muestran exactamente lo que necesitas ver.</p>
              <div className="flex flex-col gap-2">
                {Object.keys(previewData).map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === tab ? "g-aurora text-white" : "bg-white/5 text-white/50 hover:bg-white/8 hover:text-white/75"}`}>
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="bg-[#111128] rounded-2xl p-5 border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-['Outfit'] font-semibold text-white">{activeTab} — Panel Principal</div>
                    <div className="text-white/30 text-xs mt-0.5">Última actualización: hace 12 segundos</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                    <span className="text-xs text-teal-400">En vivo</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {previewData[activeTab].map((m) => (
                    <div key={m.metric} className="bg-[#0c0c20] rounded-xl p-4">
                      <div className="text-white/35 text-xs mb-1">{m.metric}</div>
                      <div className={`font-['Outfit'] font-bold text-xl ${m.color}`}>{m.value}</div>
                      <div className="text-white/30 text-xs mt-0.5">{m.sub}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-[#0c0c20] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white/40 text-xs">Actividad semanal</span>
                    <span className="text-teal-400 text-xs">↑ 12.4%</span>
                  </div>
                  <div className="flex items-end gap-1.5 h-20">
                    {[55,70,48,85,62,90,74].map((h, i) => (
                      <div key={i} className="flex-1 rounded-sm"
                        style={{ height: `${h}%`, background: "linear-gradient(to top, rgba(0,229,184,0.9), rgba(14,165,233,0.4))", opacity: i === 5 ? 1 : 0.55 }} />
                    ))}
                  </div>
                  <div className="flex justify-between mt-2">
                    {["L","M","X","J","V","S","D"].map((d) => (
                      <span key={d} className="flex-1 text-center text-white/20 text-[10px]">{d}</span>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { label: "Pedido #4821 procesado",      time: "hace 2 min",  dot: "bg-teal-400" },
                    { label: "Alerta de stock: Producto X", time: "hace 8 min",  dot: "bg-amber-400" },
                    { label: "Cierre de caja registrado",   time: "hace 31 min", dot: "bg-violet-400" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center gap-3 bg-[#0c0c20] rounded-lg px-3 py-2.5">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${row.dot}`} />
                      <span className="text-white/60 text-xs flex-1">{row.label}</span>
                      <span className="text-white/25 text-[11px]">{row.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-24 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold tracking-widest text-blue-400 uppercase mb-3">Características</p>
          <h2 className="font-['Outfit'] font-bold text-4xl sm:text-5xl text-white">
            Construido para la<br /><span className="text-aurora-r">operación real</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="hover-card bg-[#0c0c20] border border-white/5 rounded-2xl p-6 card-shadow">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <f.Icon size={22} />
              </div>
              <h3 className="font-['Outfit'] font-semibold text-white text-lg mb-2">{f.title}</h3>
              <p className="text-white/45 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-8">
          <button onClick={() => navigate("/soluciones")} className="text-teal-400 hover:text-teal-300 text-sm transition-colors">
            Ver todas las soluciones →
          </button>
        </div>
      </section>

      {/* ── ANYWHERE ── */}
      <section className="py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="relative bg-[#0c0c20] rounded-3xl border border-white/5 overflow-hidden">
          <div className="line-aurora absolute top-0 left-0 right-0" />
          <div className="absolute inset-0 opacity-20"
            style={{ background: "radial-gradient(ellipse at 80% 50%, rgba(168,85,247,0.3) 0%, transparent 55%)" }} />
          <div className="relative p-8 sm:p-14 flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 max-w-xl">
              <p className="text-xs font-semibold tracking-widest text-violet-400 uppercase mb-4">Siempre conectado</p>
              <h2 className="font-['Outfit'] font-black text-4xl sm:text-5xl text-white leading-tight mb-5">
                Tu negocio en la palma<br /><span className="text-aurora">de tu mano, donde estés</span>
              </h2>
              <p className="text-white/50 text-base leading-relaxed mb-8">
                Estés en la oficina, en una reunión o de viaje al otro lado del mundo — Aurora Plus viaja contigo. Monitorea ventas, aprueba operaciones y toma decisiones en tiempo real.
              </p>
              <div className="space-y-4">
                {[
                  { Icon: IconLaptop, title: "Desde tu computadora", desc: "Panel completo con todos los módulos, reportes y configuración avanzada." },
                  { Icon: IconPhone,  title: "Desde tu celular",      desc: "Versión móvil optimizada para cualquier celular. Consulta y gestiona desde el navegador." },
                  { Icon: IconPlane,  title: "Desde cualquier lugar", desc: "Con o sin conexión estable. Sincronización automática en segundo plano." },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center flex-shrink-0">
                      <item.Icon size={20} />
                    </div>
                    <div>
                      <div className="text-white text-sm font-semibold">{item.title}</div>
                      <div className="text-white/40 text-xs mt-0.5 leading-relaxed">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Device mockups */}
            <div className="flex-shrink-0 flex items-end gap-4">
              <div className="w-64 sm:w-72">
                <div className="bg-[#111128] rounded-xl border border-white/10 overflow-hidden shadow-2xl">
                  <div className="bg-[#0c0c20] px-3 py-2 flex items-center gap-1.5 border-b border-white/5">
                    <span className="w-2 h-2 rounded-full bg-red-500/60" /><span className="w-2 h-2 rounded-full bg-amber-500/60" /><span className="w-2 h-2 rounded-full bg-teal-500/60" />
                    <div className="flex-1 mx-2 bg-white/5 rounded text-[9px] text-white/20 text-center py-0.5">app.auroraplus.com</div>
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex gap-2">
                      {[{ label: "Ventas", val: "$8,240", color: "text-teal-400" }, { label: "Pedidos", val: "24", color: "text-sky-400" }].map((m) => (
                        <div key={m.label} className="flex-1 bg-[#0c0c20] rounded-lg p-2">
                          <div className="text-white/30 text-[9px]">{m.label}</div>
                          <div className={`font-['Outfit'] font-bold text-sm ${m.color}`}>{m.val}</div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-[#0c0c20] rounded-lg p-2">
                      <div className="text-white/30 text-[9px] mb-1.5">Actividad hoy</div>
                      <div className="flex items-end gap-0.5 h-10">
                        {[40,65,50,80,55,90,70,85,60,95,72,88].map((h, i) => (
                          <div key={i} className="flex-1 rounded-sm"
                            style={{ height: `${h}%`, background: "linear-gradient(to top, rgba(0,229,184,0.8), rgba(14,165,233,0.3))", opacity: i === 10 ? 1 : 0.5 }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-center mt-2 text-white/20 text-[10px]">Escritorio</div>
              </div>
              <div className="w-28 sm:w-32 mb-4">
                <div className="bg-[#111128] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                  <div className="bg-[#0c0c20] flex justify-center pt-2 pb-1 border-b border-white/5">
                    <div className="w-10 h-1.5 rounded-full bg-white/10" />
                  </div>
                  <div className="p-2.5 space-y-2">
                    <div className="text-white/50 text-[9px] font-['Outfit'] font-semibold">Aurora Plus</div>
                    <div className="bg-[#0c0c20] rounded-lg p-2">
                      <div className="text-white/25 text-[8px]">Ventas hoy</div>
                      <div className="font-['Outfit'] font-bold text-sm text-teal-400">$8,240</div>
                      <div className="text-emerald-400 text-[8px]">↑ 12%</div>
                    </div>
                    <div className="bg-[#0c0c20] rounded-lg p-2">
                      <div className="text-white/25 text-[8px]">Alertas</div>
                      <div className="space-y-1 mt-1">
                        <div className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-amber-400" /><span className="text-white/35 text-[8px]">Stock bajo</span></div>
                        <div className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-teal-400" /><span className="text-white/35 text-[8px]">Pedido listo</span></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center pb-2 pt-1"><div className="w-8 h-1 rounded-full bg-white/10" /></div>
                </div>
                <div className="text-center mt-2 text-white/20 text-[10px]">Móvil</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING PREVIEW ── */}
      <section className="py-24 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold tracking-widest text-violet-400 uppercase mb-3">Planes</p>
          <h2 className="font-['Outfit'] font-bold text-4xl sm:text-5xl text-white">
            Inversión que escala<br /><span className="text-aurora">con tu empresa</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {PLANS.map((plan) => (
            <div key={plan.name}
              className={`relative rounded-2xl p-6 transition-all duration-300 flex flex-col ${
                plan.highlight
                  ? "bg-gradient-to-b from-[#171740] to-[#0c0c20] border-2 border-teal-500/40 scale-[1.02] glow-teal"
                  : plan.name === "Página Web"
                  ? "bg-gradient-to-b from-[#16102a] to-[#0c0c20] border border-violet-500/25 hover:border-violet-500/40"
                  : "bg-[#0c0c20] border border-white/5 hover:border-white/15"
              }`}>
              {plan.badge && (
                <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 text-white text-[11px] font-bold px-4 py-1 rounded-full whitespace-nowrap ${plan.badge === "NUEVO" ? "bg-gradient-to-r from-violet-500 to-purple-600" : "g-aurora"}`}>
                  {plan.badge}
                </div>
              )}
              <div className="mb-5">
                <h3 className="font-['Outfit'] font-bold text-white text-xl">{plan.name}</h3>
                <p className="text-white/35 text-xs mt-0.5 leading-snug">{plan.desc}</p>
                <div className="mt-4 flex items-end gap-1">
                  <span className={`font-['Outfit'] font-black leading-none ${plan.price === "Cotizable" ? "text-2xl text-aurora" : "text-4xl text-white"}`}>{plan.price}</span>
                  {plan.period && <span className="text-white/35 text-sm mb-1">{plan.period}</span>}
                </div>
              </div>
              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5 text-xs text-white/55">
                    <span className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] flex-shrink-0 ${plan.name === "Página Web" ? "bg-violet-500/15 text-violet-400" : "bg-teal-500/15 text-teal-400"}`}>✓</span>
                    {feat}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate("/precios")}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition-all mt-auto ${
                  plan.highlight ? "g-aurora text-white hover:opacity-90"
                  : plan.name === "Página Web" ? "bg-violet-500/15 border border-violet-500/30 text-violet-300 hover:bg-violet-500/25"
                  : "border border-white/10 text-white/60 hover:border-white/25 hover:text-white"
                }`}>
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold tracking-widest text-teal-400 uppercase mb-3">Casos de éxito</p>
          <h2 className="font-['Outfit'] font-bold text-4xl sm:text-5xl text-white">
            Empresas reales,<br /><span className="text-aurora">resultados reales</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="bg-[#0c0c20] border border-white/5 rounded-2xl p-6 card-shadow hover-card">
              <div className="flex gap-1 mb-4">{[1,2,3,4,5].map((s) => <span key={s} className="text-amber-400 text-sm">★</span>)}</div>
              <p className="text-white/65 text-sm leading-relaxed mb-6 italic">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>{t.avatar}</div>
                <div>
                  <div className="text-white text-sm font-semibold">{t.name}</div>
                  <div className="text-white/35 text-xs">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-24 px-4 sm:px-6 max-w-4xl mx-auto text-center">
        <div className="relative bg-[#0c0c20] rounded-3xl border border-white/5 p-12 sm:p-16 overflow-hidden">
          <div className="line-aurora absolute top-0 left-0 right-0" />
          <div className="absolute inset-0 opacity-25"
            style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(0,229,184,0.25) 0%, transparent 55%)" }} />
          <div className="relative">
            <div className="flex justify-center mb-6"><AuroraLogo size={64} animated /></div>
            <h2 className="font-['Outfit'] font-black text-4xl sm:text-6xl text-white mb-4 leading-tight">
              ¿Listo para transformar<br /><span className="text-aurora">tu operación?</span>
            </h2>
            <p className="text-white/45 text-lg mb-10 max-w-lg mx-auto">
              Implementación en menos de 2 semanas. Sin migraciones complicadas. Tu equipo trabajando mejor desde el primer día.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => navigate("/precios")}
                className="g-aurora glow-teal text-white font-semibold px-10 py-4 rounded-xl text-base hover:opacity-90 transition-opacity w-full sm:w-auto">
                Solicitar demo gratuita
              </button>
              <button onClick={() => navigate("/nosotros")} className="text-white/45 hover:text-white transition-colors text-sm">
                Hablar con un especialista →
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
