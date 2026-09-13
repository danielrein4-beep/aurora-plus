import { useState, useRef, useEffect, type RefObject } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import AuroraLogo from "../AuroraLogo";
import TrueFocus from "../components/TrueFocus";
import SpecularButton from "../components/SpecularButton";
import ScrollReveal from "../components/ScrollReveal";
import AccordionGallery from "../components/AccordionGallery";
import CursorGrid from "../components/CursorGrid";
import GlareHover from "../components/GlareHover";
import DepthCarousel from "../components/DepthCarousel";
import { useAuth } from "../context/AuthContext";
import {
  IconClinic, IconHardware, IconMining,
  IconRestaurant, IconFarm, IconRetail,
  IconCustomize, IconChart, IconLink, IconCloud, IconLock, IconMobile,
  IconLaptop, IconPhone, IconPlane, IconCheck,
} from "../Icons";

const INDUSTRIES = [
  { Icon: IconClinic,     name: "Clínicas Médicas",   desc: "Expedientes digitales, agenda de consultas, laboratorio, farmacia y cobranza integrada." },
  { Icon: IconHardware,   name: "Ferretería",          desc: "Control de stock, proveedores, ventas por mostrador, cotizaciones y reportes de rotación." },
  { Icon: IconMining,     name: "Minería",             desc: "Gestión de maquinaria, turnos, órdenes de trabajo, seguridad e informes regulatorios." },
  { Icon: IconRestaurant, name: "Restaurantes",        desc: "Comandas digitales, mesas, cocina en tiempo real, inventario y cierres de caja automáticos." },
  { Icon: IconFarm,       name: "Control de Fincas",   desc: "Gestión integral de ganadería, rotación de potreros, registro sanitario, vacunación y trazabilidad animal por lote." },
  { Icon: IconRetail,     name: "Retail",              desc: "POS multitienda, e-commerce, fidelización de clientes y análisis de ventas por categoría." },
];

const VERTICAL_PREVIEWS = [
  { image: "/verticales/mediclinic.png", label: "Mediclinic Pro", link: "/industrias" },
  { image: "/verticales/restaurante.png", label: "Aurora Horeca", link: "/industrias" },
  { image: "/verticales/retail.png", label: "Aurora Retail", link: "/industrias" },
  { image: "/verticales/comercio.png", label: "Ferretería & Repuestos", link: "/industrias" },
  { image: "/verticales/ganaderia.jpg", label: "Control de Fincas", link: "/industrias" },
];

const FEATURES = [
  { Icon: IconCustomize, title: "100% Personalizable",    desc: "Cada módulo se adapta al flujo exacto de tu negocio. Sin código extra, sin consultores costosos." },
  { Icon: IconChart,     title: "Reportes en Tiempo Real", desc: "Paneles con KPIs críticos actualizados al instante. Toma decisiones con datos, no intuición." },
  { Icon: IconLink,      title: "Módulos Integrados",      desc: "Ventas, inventario, RRHH, contabilidad y operaciones hablan entre sí sin fricciones." },
  { Icon: IconCloud,     title: "Nube + Local",            desc: "Trabaja con o sin internet. Sincronización automática cuando vuelvas a conectarte." },
  { Icon: IconLock,      title: "Seguridad Empresarial",   desc: "Roles y permisos granulares. Auditoría completa de cada acción dentro del sistema." },
  { Icon: IconMobile,    title: "Web y Móvil",             desc: "Accede desde cualquier dispositivo. Versión móvil optimizada incluida en todos los planes." },
];

const PLANS = [
  {
    name: "Aurora Plus", price: "$25", period: "/mes", desc: "Un solo plan, acceso completo — sin niveles ni funciones bloqueadas",
    features: ["Acceso a TODOS los módulos, sin excepción", "Acceso web + versión móvil", "Sin costo extra por usuario adicional", "Multi-moneda (USD · VES · COP)", "Reportes y BI avanzado"],
    cta: "Ver planes y precios", highlight: true, badge: "",
  },
  {
    name: "Página Web", price: "Cotizable", period: "", desc: "Presencia digital profesional",
    features: ["Diseño personalizado con tu marca", "Catálogo de productos o servicios", "Ventana de pagos integrada", "Dominio y hosting incluido", "Optimización para Google (SEO)", "Integración con Aurora Plus"],
    cta: "Solicitar cotización", highlight: false, badge: "NUEVO",
  },
];

const STATS = [
  { value: "3",       label: "Verticales con producto real" },
  { value: "100%",    label: "Offline-first en punto de venta" },
  { value: "3",       label: "Monedas: USD · VES · COP" },
  { value: "< 2 sem", label: "Tiempo de implementación esperado" },
];

const MODULES = ["Ventas & POS", "Inventario", "RRHH & Nómina", "Contabilidad", "CRM", "Compras", "Producción", "Proyectos", "Reportes BI"];

// Revelado escalonado del hero al cargar la página: cada bloque aparece un
// poco después del anterior en vez de todos de golpe.
const heroContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};
const heroItem = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
};

const previewData: Record<string, { metric: string; value: string; sub: string; color: string }[]> = {
  "Ferretería": [
    { metric: "Ventas hoy",         value: "$14,820", sub: "+9% vs ayer",           color: "text-teal-500 dark:text-teal-400" },
    { metric: "Artículos en stock", value: "4,231",   sub: "12 bajo mínimo",        color: "text-slate-700 dark:text-white/70" },
    { metric: "Órdenes pendientes", value: "18",      sub: "3 urgentes",            color: "text-slate-700 dark:text-white/70" },
  ],
  "Veterinaria": [
    { metric: "Citas hoy",          value: "34",      sub: "6 cirugías",            color: "text-teal-500 dark:text-teal-400" },
    { metric: "Pacientes activos",  value: "1,820",   sub: "+12 esta semana",       color: "text-slate-700 dark:text-white/70" },
    { metric: "Stock farmacia",     value: "98%",     sub: "2 alertas",             color: "text-slate-700 dark:text-white/70" },
  ],
  "Minería": [
    { metric: "Equipos activos",    value: "47/52",   sub: "5 en mantención",       color: "text-teal-500 dark:text-teal-400" },
    { metric: "Toneladas / día",    value: "8,400 t", sub: "+3.2% vs meta",         color: "text-slate-700 dark:text-white/70" },
    { metric: "Incidentes mes",     value: "0",       sub: "32 días sin accidentes", color: "text-slate-700 dark:text-white/70" },
  ],
};

// Estela: cada movimiento del mouse deja un pequeño trazo de aurora que se
// desvanece solo, en vez de un blob que persigue el cursor en tiempo real.
// El canvas cubre el viewport (fixed) porque la estela puede cruzar zonas
// amplias de la pantalla; sigue sin capturar input y sigue apagándose con
// prefers-reduced-motion, touch, blur de pestaña, etc.
function HomePointerAurora({ hostRef }: { hostRef: RefObject<HTMLElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!host || !canvas || !context) return;

    const motionAllowed = window.matchMedia("(prefers-reduced-motion: no-preference) and (any-hover: hover) and (any-pointer: fine)");
    const colors = ["44, 134, 224", "48, 203, 132", "53, 215, 195"];
    const trailDuration = 1200; // ms que tarda cada trazo en desvanecerse por completo (humo dura más que un rayo fino)
    const minDistance = 7; // px mínimos entre puntos. Ya no usamos "lighter" (ver drawWisp),
    // así que puntos densos ya no saturan a blanco — y a velocidad normal de mouse
    // (más lenta que las pruebas automatizadas) hace falta esta densidad para
    // que la estela se sienta pegada al cursor en vez de aparecer a saltos.

    type Point = { x: number; y: number; born: number; hue: number };
    let points: Point[] = [];
    let lastX = -Infinity;
    let lastY = -Infinity;
    let frame = 0;
    let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);

    const resize = () => {
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = window.innerWidth * pixelRatio;
      canvas.height = window.innerHeight * pixelRatio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };
    resize();

    const drawWisp = (p: Point, age: number) => {
      // age: 0 = recién nacido, 1 = totalmente desvanecido.
      // Como el humo real: nace denso y compacto, y a medida que envejece se
      // expande, se difumina y sube levemente — no es un rayo fino, es una
      // nube de varias capas superpuestas.
      const fade = Math.pow(1 - age, 1.3);
      if (fade <= 0.01) return;
      const color = colors[p.hue % colors.length];
      const baseRadius = 30 + age * 46;
      const drift = age * 26; // sube un poco mientras se desvanece
      // source-over (no "lighter"): con muchos puntos superpuestos, el modo
      // aditivo satura a blanco sólido casi de inmediato. El brillo tipo
      // aurora ya lo da mix-blend-mode:screen del canvas completo contra la
      // página, una sola vez, no cada blob contra sí mismo.
      context.globalCompositeOperation = "source-over";
      for (let i = 0; i < 2; i++) {
        const angle = i * 2.4 + p.born * 0.001;
        const spread = baseRadius * 0.28;
        const cx = p.x + Math.cos(angle) * spread;
        const cy = p.y - drift + Math.sin(angle) * spread * 0.6;
        const r = baseRadius * (0.8 + i * 0.22);
        const glow = context.createRadialGradient(cx, cy, 0, cx, cy, r);
        glow.addColorStop(0, `rgba(${color}, ${0.24 * fade})`);
        glow.addColorStop(0.45, `rgba(${color}, ${0.13 * fade})`);
        glow.addColorStop(1, `rgba(${color}, 0)`);
        context.fillStyle = glow;
        context.beginPath();
        context.arc(cx, cy, r, 0, Math.PI * 2);
        context.fill();
      }
    };

    const render = (now: number) => {
      frame = 0;
      context.clearRect(0, 0, canvas.width, canvas.height);
      points = points.filter((p) => now - p.born < trailDuration);
      for (const p of points) drawWisp(p, (now - p.born) / trailDuration);
      if (points.length > 0) frame = requestAnimationFrame(render);
    };
    const start = () => {
      if (!frame) frame = requestAnimationFrame(render);
    };
    const addPoint = (x: number, y: number) => {
      const dx = x - lastX;
      const dy = y - lastY;
      if (dx * dx + dy * dy < minDistance * minDistance) return;
      lastX = x;
      lastY = y;
      points.push({ x, y, born: performance.now(), hue: points.length });
      if (points.length > 140) points.shift();
      start();
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !motionAllowed.matches || document.hidden) return;
      addPoint(event.clientX, event.clientY);
    };
    const clear = () => {
      points = [];
      lastX = lastY = -Infinity;
      context.clearRect(0, 0, canvas.width, canvas.height);
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("resize", resize);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", clear);
    motionAllowed.addEventListener("change", clear);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("resize", resize);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", clear);
      motionAllowed.removeEventListener("change", clear);
    };
  }, [hostRef]);

  return <canvas ref={canvasRef} className="home-pointer-aurora" aria-hidden="true" />;
}

export default function Home() {
  const homeRef = useRef<HTMLElement>(null);
  const [activeTab, setActiveTab] = useState("Ferretería");
  const [heroTitleSettled, setHeroTitleSettled] = useState(false);
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();

  const featureCarouselItems = FEATURES.map((f) => ({
    content: (
      <div className="w-full h-full bg-[#0b1014] border border-white/10 shadow-xl p-6 flex flex-col justify-center">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 bg-teal-500/10 border border-teal-500/20">
          <f.Icon size={22} />
        </div>
        <h3 className="font-['Outfit'] font-semibold text-white text-lg mb-2">{f.title}</h3>
        <p className="text-white/45 text-sm leading-relaxed">{f.desc}</p>
      </div>
    ),
  }));

  // Parallax sutil: la foto de fondo se desplaza unos pocos píxeles según la
  // posición del mouse dentro del hero, dando sensación de profundidad.
  const heroRef = useRef<HTMLElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const photoX = useSpring(useTransform(mouseX, [-1, 1], [-14, 14]), { stiffness: 60, damping: 20 });
  const photoY = useSpring(useTransform(mouseY, [-1, 1], [-14, 14]), { stiffness: 60, damping: 20 });
  const handleHeroMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set(((e.clientX - rect.left) / rect.width) * 2 - 1);
    mouseY.set(((e.clientY - rect.top) / rect.height) * 2 - 1);
  };

  return (
    <main ref={homeRef} className="aurora-public-page relative overflow-hidden bg-transparent transition-colors duration-500">
      <HomePointerAurora hostRef={homeRef} />
      {/* ── HERO: composición editorial sobre una fotografía real ── */}
      <section
        ref={heroRef}
        onMouseMove={handleHeroMouseMove}
        className="aurora-home-hero relative min-h-[1080px] lg:min-h-[1160px] flex flex-col pt-28 sm:pt-36 pb-0 px-5 sm:px-10 max-w-[1536px] mx-auto overflow-hidden">

        <div className="absolute inset-0 -z-10 overflow-hidden">
          <motion.div className="home-hero-photo" style={{ x: photoX, y: photoY }} />
        </div>

        <div
          className="absolute inset-0 z-0 pointer-events-auto transition-opacity duration-[1400ms] ease-out"
          style={{ opacity: heroTitleSettled ? 1 : 0 }}
          aria-hidden="true"
        >
          <CursorGrid
            cellSize={65}
            color="#b2aee3"
            radius={140}
            falloff="smooth"
            holdTime={400}
            fadeDuration={950}
            lineWidth={1.2}
            maxOpacity={0.35}
            fillOpacity={0}
            gridOpacity={0}
            cellRadius={0}
            clickPulse
            pulseSpeed={600}
          />
        </div>

        <motion.div
          variants={heroContainer}
          initial="hidden"
          animate="show"
          className="relative z-10 w-full max-w-5xl mx-auto">
          <motion.p variants={heroItem} className="font-mono text-[11px] sm:text-xs font-semibold tracking-[0.18em] uppercase text-[#3fe0ce]">• Un motor · seis rubros · tres monedas</motion.p>
          <motion.h1 variants={heroItem} className="mt-5 max-w-3xl font-['IBM_Plex_Sans'] text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.02] tracking-[-0.055em] text-[#f8f6ef]">
            <TrueFocus
              sentence="Automatiza, simplifica, crece..."
              manualMode={false}
              blurAmount={6}
              borderColor="#35d7c3"
              glowColor="rgba(53, 215, 195, 0.6)"
              animationDuration={0.3}
              pauseBetweenAnimations={0.5}
              onSettle={() => setHeroTitleSettled(true)}
            />
          </motion.h1>
          <motion.p variants={heroItem} className="mt-8 max-w-xl text-base leading-7 text-[#e5e1d5]/90">
            De la libreta y la hoja de Excel a medianoche, a la comodidad de tu teléfono y tu computadora. Aurora Plus corre la caja, el inventario y la sanidad regulatoria de clínicas, restaurantes, minas, talleres, boutiques y fincas venezolanas.
          </motion.p>
          <motion.div variants={heroItem} className="mt-10 flex flex-wrap gap-3">
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
              Solicitar demo
            </SpecularButton>
            <SpecularButton
              size="md"
              radius={10}
              tint="#ffffff"
              tintOpacity={0}
              textColor="#f8f6ef"
              lineColor="#ffffff"
              baseColor="#4b4b4b"
              shineSize={10}
              shineFade={40}
              proximity={260}
              onClick={() => navigate("/industrias")}
            >
              Ver los 6 rubros ↓
            </SpecularButton>
          </motion.div>

          <motion.div variants={heroItem} className="mt-16 grid w-full max-w-5xl mx-auto grid-cols-2 gap-x-8 gap-y-12 border-t border-white/15 pt-10 sm:grid-cols-4 text-center justify-items-center">
            {[
              ["6", "industrias nativas"],
              ["100%", "caja offline-first"],
              ["3", "monedas convertidas"],
              ["RBAC", "roles estrictos"],
            ].map(([value, label]) => (
              <div key={label}>
                <div className="font-['IBM_Plex_Sans'] text-4xl sm:text-5xl font-bold text-[#f8f6ef]">{value}</div>
                <ScrollReveal
                  baseOpacity={0.15}
                  enableBlur
                  baseRotation={2}
                  blurStrength={3}
                  containerClassName="mt-2"
                  textClassName="font-mono text-xs sm:text-sm uppercase tracking-wide text-[#d9d8ce]/85"
                >
                  {label}
                </ScrollReveal>
              </div>
            ))}
          </motion.div>

          <motion.div variants={heroItem} className="mt-16 w-full">
            <AccordionGallery
              items={VERTICAL_PREVIEWS}
              defaultIndex={2}
              expandRatio={0.85}
              trigger="hover"
              accentColor="#35d7c3"
              overlayColor="#04100f"
              textColor="#ffffff"
              grayscale
              showLabels
              duration={0.6}
              ease="power3.out"
              parallax={0.5}
              tilt={8}
              stagger={0.06}
              height={420}
              gap={10}
              radius={16}
              orientation="horizontal"
            />
          </motion.div>

          {/* ── ACCESO DIRECTO PARA USUARIOS EN SESIÓN ── */}
          {isLoggedIn && (
            <div className="mt-8 w-full max-w-2xl rounded-2xl p-6 sm:p-7 border border-[#35d7c3]/25 bg-[#030c0f]/80">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4 text-left">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#35d7c3", color: "#062323" }}>
                    <IconClinic size={26} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#35d7c3]/15 text-[#35d7c3] border border-[#35d7c3]/25 tracking-wider uppercase font-mono">
                        Tu sistema asignado &amp; activo
                      </span>
                      <span className="text-xs text-white/45">• {user?.empresa || "Clínica & Consultorios"}</span>
                    </div>
                    <h3 className="text-lg font-bold text-[#f8f6ef] font-['IBM_Plex_Sans'] mt-1">
                      Mediclinic Pro — Espacio Clínico de {user?.nombre || user?.email?.split("@")[0]}
                    </h3>
                    <p className="text-xs text-white/55 mt-0.5">
                      Historias clínicas digitales, agenda médica, sala de espera reactiva, cotizador y caja diaria.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/mediclinic")}
                  className="aurora-solid-button px-6 py-3 text-sm font-semibold cursor-pointer whitespace-nowrap flex items-center gap-2">
                  <span>Abrir Mediclinic Pro</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          )}

        </motion.div>

      </section>

      {/* ── TICKER ── */}
      <div className="relative overflow-hidden py-4 border-y border-slate-200/60 dark:border-white/5 transition-colors duration-500">
        <div className="line-aurora absolute top-0 left-0 right-0" />
        <div className="flex gap-6 whitespace-nowrap" style={{ animation: "ticker 22s linear infinite" }}>
          {[...MODULES, ...MODULES, ...MODULES].map((m, i) => (
            <span key={i} className="text-sm text-slate-500 dark:text-white/30 font-medium flex items-center gap-3 flex-shrink-0">
              <span className="text-aurora opacity-80">·</span> {m}
            </span>
          ))}
        </div>
        <div className="line-aurora absolute bottom-0 left-0 right-0" />
      </div>

      {/* ── INDUSTRIES ── */}
      <section className="py-24 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold tracking-widest text-teal-600 dark:text-teal-400 uppercase mb-3">Para tu industria</p>
          <h2 className="font-['Outfit'] font-bold text-4xl sm:text-5xl text-slate-900 dark:text-white">
            Un sistema que entiende<br /><span className="text-aurora">cómo funciona tu negocio</span>
          </h2>
          <p className="text-slate-500 dark:text-white/40 text-base mt-4 max-w-xl mx-auto">Módulos preconfigurados y flujos adaptados a cada operación.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {INDUSTRIES.map((ind) => (
            <GlareHover
              key={ind.name}
              width="100%"
              height="100%"
              background="transparent"
              borderRadius="1rem"
              borderColor="transparent"
              glareColor="#35d7c3"
              glareOpacity={0.3}
              glareAngle={-45}
              glareSize={250}
              transitionDuration={650}
              onClick={() => navigate("/industrias")}
              className="hover-card apple-glass p-5 cursor-pointer card-shadow"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 dark:bg-white/5 border border-teal-500/20 dark:border-white/8 flex items-center justify-center mb-3">
                <ind.Icon size={20} />
              </div>
              <h3 className="font-['Outfit'] font-semibold text-slate-900 dark:text-white text-base mb-1.5">{ind.name}</h3>
              <p className="text-slate-500 dark:text-white/40 text-xs leading-relaxed">{ind.desc}</p>
            </GlareHover>
          ))}
        </div>
        <div className="text-center mt-8">
          <button onClick={() => navigate("/industrias")} className="text-teal-600 dark:text-teal-400 hover:text-teal-500 dark:hover:text-teal-300 text-sm font-semibold transition-colors cursor-pointer">
            Ver todas las industrias →
          </button>
        </div>
      </section>

      {/* ── DASHBOARD PREVIEW ── */}
      <section className="py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="relative apple-glass rounded-3xl overflow-hidden shadow-xl">
          <div className="line-aurora absolute top-0 left-0 right-0" />
          <div className="p-6 sm:p-10 flex flex-col lg:flex-row gap-10">
            <div className="lg:w-80 flex-shrink-0">
              <p className="text-xs font-semibold tracking-widest text-teal-600 dark:text-teal-400 uppercase mb-3">Vista en vivo</p>
              <h2 className="font-['Outfit'] font-bold text-3xl text-slate-900 dark:text-white leading-tight mb-4">Tu operación,<br />en tiempo real</h2>
              <p className="text-slate-500 dark:text-white/45 text-sm leading-relaxed mb-6">Paneles configurables que muestran exactamente lo que necesitas ver.</p>
              <div className="flex flex-col gap-2">
                {Object.keys(previewData).map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`text-left px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${activeTab === tab ? "g-aurora text-white shadow-md font-semibold" : "bg-black/[0.03] dark:bg-white/5 text-slate-600 dark:text-white/50 hover:bg-black/[0.06] dark:hover:bg-white/8 hover:text-slate-950 dark:hover:text-white"}`}>
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="apple-glass rounded-2xl p-5 space-y-4 border border-slate-200/80 dark:border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-['Outfit'] font-semibold text-slate-900 dark:text-white">{activeTab} — Panel Principal</div>
                    <div className="text-slate-400 dark:text-white/30 text-xs mt-0.5">Última actualización: hace 12 segundos</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                    <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">En vivo</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {previewData[activeTab].map((m) => (
                    <div key={m.metric} className="bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5 rounded-xl p-4">
                      <div className="text-slate-400 dark:text-white/35 text-xs mb-1">{m.metric}</div>
                      <div className={`font-['Outfit'] font-bold text-xl ${m.color}`}>{m.value}</div>
                      <div className="text-slate-400 dark:text-white/30 text-xs mt-0.5">{m.sub}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-slate-500 dark:text-white/40 text-xs font-medium">Actividad semanal</span>
                    <span className="text-teal-600 dark:text-teal-400 text-xs font-semibold">↑ 12.4%</span>
                  </div>
                  <div className="flex items-end gap-1.5 h-20">
                    {[55,70,48,85,62,90,74].map((h, i) => (
                      <div key={i} className="flex-1 rounded-sm"
                        style={{ height: `${h}%`, background: "linear-gradient(to top, rgba(0,229,184,0.9), rgba(14,165,233,0.4))", opacity: i === 5 ? 1 : 0.65 }} />
                    ))}
                  </div>
                  <div className="flex justify-between mt-2">
                    {["L","M","X","J","V","S","D"].map((d) => (
                      <span key={d} className="flex-1 text-center text-slate-400 dark:text-white/20 text-[10px] font-medium">{d}</span>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { label: "Pedido #4821 procesado",      time: "hace 2 min",  dot: "bg-teal-400" },
                    { label: "Alerta de stock: Producto X", time: "hace 8 min",  dot: "bg-amber-400" },
                    { label: "Cierre de caja registrado",   time: "hace 31 min", dot: "bg-slate-400" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center gap-3 bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 rounded-lg px-3 py-2.5">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${row.dot}`} />
                      <span className="text-slate-700 dark:text-white/60 text-xs flex-1 font-medium">{row.label}</span>
                      <span className="text-slate-400 dark:text-white/25 text-[11px]">{row.time}</span>
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
          <p className="text-xs font-semibold tracking-widest text-teal-600 dark:text-teal-400 uppercase mb-3">Características</p>
          <h2 className="font-['Outfit'] font-bold text-4xl sm:text-5xl text-slate-900 dark:text-white">
            Construido para la<br /><span className="text-aurora-r">operación real</span>
          </h2>
        </div>
        <div style={{ height: 440, position: "relative" }}>
          <DepthCarousel
            items={featureCarouselItems}
            depth={220}
            spread={90}
            tilt={22}
            tiltDirection="right"
            perspective={1400}
            visibleCards={4}
            falloff={0.2}
            blur={6}
            autoplay
            loop
            cardWidth={300}
            cardHeight={380}
            radius={18}
            tint="#05060a"
            duration={700}
            ease="power3.out"
            autoplayDelay={3200}
            showControls
            showIndicators
          />
        </div>
        <div className="text-center mt-8">
          <button onClick={() => navigate("/soluciones")} className="text-teal-600 dark:text-teal-400 hover:text-teal-500 dark:hover:text-teal-300 text-sm font-semibold transition-colors cursor-pointer">
            Ver todas las soluciones →
          </button>
        </div>
      </section>

      {/* ── ANYWHERE ── */}
      <section className="py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="relative apple-glass rounded-3xl overflow-hidden shadow-xl">
          <div className="line-aurora absolute top-0 left-0 right-0" />
          <div className="absolute inset-0 opacity-20"
            style={{ background: "radial-gradient(ellipse at 80% 50%, rgba(0,201,167,0.3) 0%, transparent 55%)" }} />
          <div className="relative p-8 sm:p-14 flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 max-w-xl">
              <p className="text-xs font-semibold tracking-widest text-teal-600 dark:text-teal-400 uppercase mb-4">Siempre conectado</p>
              <h2 className="font-['Outfit'] font-black text-4xl sm:text-5xl text-slate-900 dark:text-white leading-tight mb-5">
                Tu negocio en la palma<br /><span className="text-aurora">de tu mano, donde estés</span>
              </h2>
              <p className="text-slate-500 dark:text-white/50 text-base leading-relaxed mb-8">
                Estés en la oficina, en una reunión o de viaje al otro lado del mundo — Aurora Plus viaja contigo. Monitorea ventas, aprueba operaciones y toma decisiones en tiempo real.
              </p>
              <div className="space-y-4">
                {[
                  { Icon: IconLaptop, title: "Desde tu computadora", desc: "Panel completo con todos los módulos, reportes y configuración avanzada." },
                  { Icon: IconPhone,  title: "Desde tu celular",      desc: "Versión móvil optimizada para cualquier celular. Consulta y gestiona desde el navegador." },
                  { Icon: IconPlane,  title: "Desde cualquier lugar", desc: "Con o sin conexión estable. Sincronización automática en segundo plano." },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 dark:bg-white/5 border border-teal-500/20 dark:border-white/8 flex items-center justify-center flex-shrink-0">
                      <item.Icon size={20} />
                    </div>
                    <div>
                      <div className="text-slate-900 dark:text-white text-sm font-semibold">{item.title}</div>
                      <div className="text-slate-500 dark:text-white/40 text-xs mt-0.5 leading-relaxed">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Device mockups */}
            <div className="flex-shrink-0 flex items-end gap-4">
              <div className="w-64 sm:w-72">
                <div className="bg-white dark:bg-[#111128] rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-2xl">
                  <div className="bg-slate-100 dark:bg-[#0c0c20] px-3 py-2 flex items-center gap-1.5 border-b border-slate-200 dark:border-white/5">
                    <span className="w-2 h-2 rounded-full bg-red-500/60" /><span className="w-2 h-2 rounded-full bg-amber-500/60" /><span className="w-2 h-2 rounded-full bg-teal-500/60" />
                    <div className="flex-1 mx-2 bg-slate-200 dark:bg-white/5 rounded text-[9px] text-slate-500 dark:text-white/20 text-center py-0.5 font-mono">app.auroraplus.com</div>
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex gap-2">
                      {[{ label: "Ventas", val: "$8,240", color: "text-teal-600 dark:text-teal-400" }, { label: "Pedidos", val: "24", color: "text-sky-600 dark:text-sky-400" }].map((m) => (
                        <div key={m.label} className="flex-1 bg-slate-50 dark:bg-[#0c0c20] rounded-lg p-2 border border-slate-200/60 dark:border-transparent">
                          <div className="text-slate-400 dark:text-white/30 text-[9px]">{m.label}</div>
                          <div className={`font-['Outfit'] font-bold text-sm ${m.color}`}>{m.val}</div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-slate-50 dark:bg-[#0c0c20] rounded-lg p-2 border border-slate-200/60 dark:border-transparent">
                      <div className="text-slate-400 dark:text-white/30 text-[9px] mb-1.5 font-medium">Actividad hoy</div>
                      <div className="flex items-end gap-0.5 h-10">
                        {[40,65,50,80,55,90,70,85,60,95,72,88].map((h, i) => (
                          <div key={i} className="flex-1 rounded-sm"
                            style={{ height: `${h}%`, background: "linear-gradient(to top, rgba(0,229,184,0.8), rgba(14,165,233,0.3))", opacity: i === 10 ? 1 : 0.6 }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-center mt-2 text-slate-400 dark:text-white/20 text-[10px] font-medium">Escritorio</div>
              </div>
              <div className="w-28 sm:w-32 mb-4">
                <div className="bg-white dark:bg-[#111128] rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-2xl">
                  <div className="bg-slate-100 dark:bg-[#0c0c20] flex justify-center pt-2 pb-1 border-b border-slate-200 dark:border-white/5">
                    <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-white/10" />
                  </div>
                  <div className="p-2.5 space-y-2">
                    <div className="text-slate-700 dark:text-white/50 text-[9px] font-['Outfit'] font-semibold">Aurora Plus</div>
                    <div className="bg-slate-50 dark:bg-[#0c0c20] rounded-lg p-2 border border-slate-200/60 dark:border-transparent">
                      <div className="text-slate-400 dark:text-white/25 text-[8px]">Ventas hoy</div>
                      <div className="font-['Outfit'] font-bold text-sm text-teal-600 dark:text-teal-400">$8,240</div>
                      <div className="text-emerald-600 dark:text-emerald-400 text-[8px] font-semibold">↑ 12%</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-[#0c0c20] rounded-lg p-2 border border-slate-200/60 dark:border-transparent">
                      <div className="text-slate-400 dark:text-white/25 text-[8px]">Alertas</div>
                      <div className="space-y-1 mt-1">
                        <div className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-amber-500" /><span className="text-slate-500 dark:text-white/35 text-[8px]">Stock bajo</span></div>
                        <div className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-teal-500" /><span className="text-slate-500 dark:text-white/35 text-[8px]">Pedido listo</span></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center pb-2 pt-1"><div className="w-8 h-1 rounded-full bg-slate-300 dark:bg-white/10" /></div>
                </div>
                <div className="text-center mt-2 text-slate-400 dark:text-white/20 text-[10px] font-medium">Móvil</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING PREVIEW ── */}
      <section className="py-24 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold tracking-widest text-teal-600 dark:text-teal-400 uppercase mb-3">Planes</p>
          <h2 className="font-['Outfit'] font-bold text-4xl sm:text-5xl text-slate-900 dark:text-white">
            Inversión que escala<br /><span className="text-aurora">con tu empresa</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {PLANS.map((plan) => (
            <div key={plan.name}
              className={`relative rounded-2xl p-6 transition-all duration-300 flex flex-col ${
                plan.highlight
                  ? "apple-glass border-2 border-teal-500/50 scale-[1.02] shadow-xl"
                  : plan.name === "Página Web"
                  ? "apple-glass border border-slate-300/60 dark:border-white/15 hover:border-slate-400/80 dark:hover:border-white/25"
                  : "apple-glass border border-slate-200/80 dark:border-white/5 hover:border-teal-400/30"
              }`}>
              {plan.badge && (
                <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 text-white text-[11px] font-bold px-4 py-1 rounded-full whitespace-nowrap shadow-md ${plan.badge === "NUEVO" ? "bg-slate-800 dark:bg-white/20" : "g-aurora"}`}>
                  {plan.badge}
                </div>
              )}
              <div className="mb-5">
                <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-xl">{plan.name}</h3>
                <p className="text-slate-500 dark:text-white/35 text-xs mt-0.5 leading-snug">{plan.desc}</p>
                <div className="mt-4 flex items-end gap-1">
                  <span className={`font-['Outfit'] font-black leading-none ${plan.price === "Cotizable" ? "text-2xl text-aurora" : "text-4xl text-slate-900 dark:text-white"}`}>{plan.price}</span>
                  {plan.period && <span className="text-slate-500 dark:text-white/35 text-sm mb-1">{plan.period}</span>}
                </div>
              </div>
              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-white/55">
                    <span className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${plan.name === "Página Web" ? "bg-slate-500/15 text-slate-600 dark:text-white/70" : "bg-teal-500/15 text-teal-600 dark:text-teal-400"}`}><IconCheck size={9} /></span>
                    {feat}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate("/precios")}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition-all mt-auto cursor-pointer ${
                  plan.highlight ? "g-aurora text-white hover:opacity-90 shadow-md"
                  : plan.name === "Página Web" ? "bg-slate-500/10 border border-slate-400/30 text-slate-700 dark:text-white/70 hover:bg-slate-500/20"
                  : "bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-800 dark:text-white/60 hover:border-slate-400 dark:hover:border-white/25 hover:text-black dark:hover:text-white"
                }`}>
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── QUIÉNES SOMOS ── */}
      <section className="py-24 px-4 sm:px-6 max-w-4xl mx-auto text-center">
        <p className="text-xs font-semibold tracking-widest text-teal-600 dark:text-teal-400 uppercase mb-3">Quiénes construyen esto</p>
        <h2 className="font-['Outfit'] font-bold text-4xl sm:text-5xl text-slate-900 dark:text-white mb-6">
          Negocio real, ingeniería real
        </h2>
        <p className="text-slate-500 dark:text-white/45 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
          Aurora Plus lo construye un equipo con formación en <span className="text-slate-800 dark:text-white/80 font-medium">Administración de Empresas</span> e <span className="text-slate-800 dark:text-white/80 font-medium">Ingeniería Informática</span> — estamos en fase de piloto con negocios de confianza, ajustando el sistema con uso real antes de abrirlo al público.
        </p>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-24 px-4 sm:px-6 max-w-4xl mx-auto text-center">
        <div className="relative apple-glass rounded-3xl p-12 sm:p-16 overflow-hidden shadow-2xl">
          <div className="line-aurora absolute top-0 left-0 right-0" />
          <div className="absolute inset-0 opacity-20"
            style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(0,229,184,0.25) 0%, transparent 55%)" }} />
          <div className="relative">
            <div className="flex justify-center mb-6"><AuroraLogo size={64} animated /></div>
            <h2 className="font-['Outfit'] font-black text-4xl sm:text-6xl text-slate-900 dark:text-white mb-4 leading-tight">
              ¿Listo para transformar<br /><span className="text-aurora">tu operación?</span>
            </h2>
            <p className="text-slate-500 dark:text-white/45 text-lg mb-10 max-w-lg mx-auto">
              Implementación en menos de 2 semanas. Sin migraciones complicadas. Tu equipo trabajando mejor desde el primer día.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <SpecularButton
                size="lg"
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
                className="w-full sm:w-auto"
                onClick={() => navigate("/precios")}
              >
                Solicitar demo gratuita
              </SpecularButton>
              <button onClick={() => navigate("/nosotros")} className="text-slate-500 dark:text-white/45 hover:text-slate-900 dark:hover:text-white transition-colors text-sm font-semibold cursor-pointer">
                Hablar con un especialista →
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
