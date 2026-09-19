import { useState, useRef, useEffect, type RefObject } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import AuroraLogo from "../AuroraLogo";
import TrueFocus from "../components/TrueFocus";
import SpecularButton from "../components/SpecularButton";
import ScrollReveal from "../components/ScrollReveal";
import AccordionGallery from "../components/AccordionGallery";
import CursorGrid from "../components/CursorGrid";
import DepthCarousel from "../components/DepthCarousel";
import { useAuth } from "../context/AuthContext";
import {
  IconClinic, IconHardware, IconRestaurant, IconFarm, IconTooth,
  IconWhatsApp, IconCustomize, IconChart, IconLink, IconCloud,
  IconLock, IconMobile, IconLaptop, IconPhone, IconPlane,
  IconCheck, IconCard, IconBox, IconBolt, IconShield, IconScale,
} from "../Icons";

const VERTICALS = [
  {
    id: "comercio",
    name: "Comercio & Retail",
    tagline: "Ventas agiles, stock multialmacen y catalogo web",
    desc: "Punto de venta (POS) para mostrador, lector de codigos de barra, cotizaciones en USD y Bs. a tasa BCV del dia, inventario multialmacen y catalogo digital para pedidos en linea.",
    Icon: IconHardware,
    color: "from-amber-500/20 to-teal-500/10",
    badge: "Alta demanda",
    stats: [
      { label: "Ventas hoy", value: "$1,480.00", sub: "38 tickets procesados", color: "text-teal-600 dark:text-teal-400" },
      { label: "Tasa BCV del dia", value: "50.00 Bs/$", sub: "Sincronizacion oficial", color: "text-slate-800 dark:text-white/80" },
      { label: "Articulos en stock", value: "2,410", sub: "4 alertas de reposicion", color: "text-slate-800 dark:text-white/80" },
    ],
    features: [
      "POS rapido para cajeros con cobro mixto (Divisas, Pago Movil, Punto)",
      "Catalogo digital publico por negocio para recibir pedidos directos",
      "Control estricto de caja diaria, turnos de empleados y faltantes",
    ],
  },
  {
    id: "salud",
    name: "Salud & Mediclinic Pro",
    tagline: "Expediente medico, vademecum y recipe oficial en PDF",
    desc: "Software de gestion clinica profesional con historias medicas completas, vademecum farmacologico con 100+ principios activos, prescriptor asistido con deteccion de alergias y emision de recipe oficial (Rx) en PDF con QR.",
    Icon: IconClinic,
    color: "from-teal-500/20 to-cyan-500/10",
    badge: "Grado clinico",
    stats: [
      { label: "Pacientes atendidos", value: "32 hoy", sub: "4 consultas pendientes", color: "text-teal-600 dark:text-teal-400" },
      { label: "Vademecum activo", value: "100+ farmacos", sub: "7 categorias terapeuticas", color: "text-slate-800 dark:text-white/80" },
      { label: "Recipes emitidos", value: "100% validados", sub: "Con QR y matricula", color: "text-slate-800 dark:text-white/80" },
    ],
    features: [
      "Historia clinica electronica con antecedentes, signos vitales y diagnostico",
      "Prescriptor inteligente con alerta cruzada de alergias (penicilinas, AINEs)",
      "Generacion instantanea de recipe medico (Rx) e indicaciones para el paciente",
    ],
  },
  {
    id: "odontologia",
    name: "Odontologia Integral",
    tagline: "Odontograma anatomico 3D y presupuesto por fases",
    desc: "Odontograma interactivo con las 5 caras de las 32 piezas permanentes y 20 deciduas, registro de caries, restauraciones, endodoncias e implantes, periodontograma clinico y presupuestacion por fases.",
    Icon: IconTooth,
    color: "from-blue-500/20 to-teal-500/10",
    badge: "Especializado",
    stats: [
      { label: "Odontograma", value: "5 caras / pieza", sub: "Adulto e infantil", color: "text-teal-600 dark:text-teal-400" },
      { label: "Presupuestos", value: "Por fases", sub: "Conversion USD y Bs.", color: "text-slate-800 dark:text-white/80" },
      { label: "Periodontograma", value: "Sondaje y sangrado", sub: "Grafica visual en tiempo real", color: "text-slate-800 dark:text-white/80" },
    ],
    features: [
      "Diagrama dental anatomico con selector de procedimientos por cara",
      "Presupuesto clinico dividido por citas y etapas de tratamiento",
      "Historial evolutivo del paciente sin riesgo de sobreescritura",
    ],
  },
  {
    id: "restaurante",
    name: "Restaurantes & Horeca",
    tagline: "Comandas digitales, control de mesas y KDS de cocina",
    desc: "Gestion integral para restaurantes, cafeterias y bares. Mapa visual interactivo de mesas, toma de comandas en tabletas o movil, pantalla KDS de cocina en tiempo real y cierres de turno.",
    Icon: IconRestaurant,
    color: "from-orange-500/20 to-amber-500/10",
    badge: "Operacion en vivo",
    stats: [
      { label: "Mesas activas", value: "18 / 24", sub: "75% de ocupacion", color: "text-teal-600 dark:text-teal-400" },
      { label: "Tiempo cocina KDS", value: "8.4 min", sub: "Promedio por plato", color: "text-slate-800 dark:text-white/80" },
      { label: "Caja turno tarde", value: "$940.00", sub: "Cero descuadre", color: "text-slate-800 dark:text-white/80" },
    ],
    features: [
      "Comandas directas de salon a la pantalla KDS de cocina sin papel",
      "Division de cuentas por comensal o pago grupal en multiples divisas",
      "Menu digital interactivo accesible mediante codigo QR en cada mesa",
    ],
  },
  {
    id: "ganaderia",
    name: "Ganaderia & Fincas",
    tagline: "Mapas satelitales, calculo de hectareas y pesaje Bluetooth",
    desc: "Cartografia satelital Leaflet en vivo con capas Esri de alta resolucion. Trazo geodesico de potreros con calculo exacto de hectareas (WGS84), aforo forrajero, rotacion de lotes, pesaje automatico con basculas Bluetooth/Serial y sincronizacion offline en campo.",
    Icon: IconFarm,
    color: "from-emerald-500/20 to-teal-500/10",
    badge: "Tecnologia de campo",
    stats: [
      { label: "Area delimitada", value: "480 Has", sub: "Calculo geodesico WGS84", color: "text-teal-600 dark:text-teal-400" },
      { label: "Carga animal", value: "1.4 UGM/Ha", sub: "Aforo forrajero optimo", color: "text-slate-800 dark:text-white/80" },
      { label: "Captura de peso", value: "Bluetooth", sub: "Cero error de tipeo", color: "text-slate-800 dark:text-white/80" },
    ],
    features: [
      "Trazado de potreros sobre satelite con hectareas calculadas al instante",
      "Rotacion de lotes de ganado con control de dias de reposo y pastoreo",
      "Modo offline en campo: registra pesajes y eventos sin necesidad de internet",
    ],
  },
];

const VERTICAL_PREVIEWS = [
  { image: "/verticales/comercio.png", label: "Aurora Comercio", link: "/industrias" },
  { image: "/verticales/mediclinic.png", label: "Mediclinic Pro", link: "/industrias" },
  { image: "/verticales/restaurante.png", label: "Aurora Horeca", link: "/industrias" },
  { image: "/verticales/ganaderia.jpg", label: "Ganaderia Satelital", link: "/industrias" },
];

const SISTEMA_POR_INDUSTRIA: Record<string, { ruta: string; label: string; nombre: string; desc: string; Icon: typeof IconClinic }> = {
  restaurante: { ruta: "/restaurante", label: "Aurora Horeca", nombre: "Aurora Horeca", desc: "Comandas digitales, mesas, cocina en tiempo real, inventario y cierres de caja automaticos.", Icon: IconRestaurant },
  ferreteria: { ruta: "/comercio", label: "Aurora Comercio", nombre: "Aurora Comercio", desc: "Control de stock, proveedores, ventas por mostrador, cotizaciones y reportes de rotacion.", Icon: IconHardware },
  repuestos: { ruta: "/comercio", label: "Aurora Comercio", nombre: "Aurora Comercio", desc: "Control de stock, proveedores, ventas por mostrador, cotizaciones y reportes de rotacion.", Icon: IconHardware },
  farmacia: { ruta: "/comercio", label: "Aurora Comercio", nombre: "Aurora Comercio", desc: "Control de stock, proveedores, ventas por mostrador, cotizaciones y reportes de rotacion.", Icon: IconHardware },
  retail: { ruta: "/comercio", label: "Aurora Comercio", nombre: "Aurora Comercio", desc: "POS multitienda, e-commerce, fidelizacion de clientes y analisis de ventas por categoria.", Icon: IconHardware },
  finca: { ruta: "/ganaderia", label: "Aurora Ganaderia", nombre: "Aurora Ganaderia", desc: "Gestion integral de ganaderia, rotacion de potreros, registro sanitario y trazabilidad animal.", Icon: IconFarm },
  ganaderia: { ruta: "/ganaderia", label: "Aurora Ganaderia", nombre: "Aurora Ganaderia", desc: "Gestion integral de ganaderia, rotacion de potreros, registro sanitario y trazabilidad animal.", Icon: IconFarm },
  odontologia: { ruta: "/mediclinic", label: "Odontologia Pro", nombre: "Odontologia & Mediclinic", desc: "Odontograma anatomico interactivo, periodontograma, presupuesto por fases y expedientes.", Icon: IconTooth },
  salud: { ruta: "/mediclinic", label: "Mediclinic Pro", nombre: "Mediclinic Pro - Espacio Clinico", desc: "Historias clinicas digitales, vademecum, recipes oficiales en PDF con QR y caja diaria.", Icon: IconClinic },
};
const SISTEMA_POR_DEFECTO = { ruta: "/mediclinic", label: "Mediclinic Pro", nombre: "Mediclinic Pro - Espacio Clinico", desc: "Historias clinicas digitales, vademecum farmacologico, prescriptor asistido y caja diaria.", Icon: IconClinic };

const FEATURES = [
  { Icon: IconWhatsApp, title: "Asistente IA WhatsApp", desc: "Atencion automatica 24/7 con Google Gemini 1.5 Flash. Responde stock, precios y delivery directo a tus clientes." },
  { Icon: IconCloud,    title: "Nube + Modo Offline",  desc: "Sigue vendiendo y registrando datos aunque se caiga el internet o la luz. Se sincroniza solo al reconectar." },
  { Icon: IconCard,     title: "Multi-Moneda Nativa",   desc: "Manejo simultaneo de USD y Bolivares con actualizacion automatica a la tasa oficial BCV del dia." },
  { Icon: IconLock,     title: "Seguridad y Roles",     desc: "Control estricto de acceso por usuario (cajero, mesonero, medico, supervisor) con auditoria de cambios." },
  { Icon: IconMobile,   title: "Computadora y Celular", desc: "Funciona 100% desde el navegador en cualquier PC, laptop o telefono sin instalar programas pesados." },
  { Icon: IconChart,    title: "Reportes Operativos",   desc: "Metricas de facturacion, rotacion de inventario y cierres de turno calculados al instante con precision." },
];

const PLANS = [
  {
    name: "Aurora Plus",
    price: "$25",
    period: "/mes",
    desc: "Un solo plan con acceso completo a tu vertical especializada",
    features: [
      "Acceso a todas las funciones de tu vertical",
      "Usuarios y puestos de trabajo ilimitados",
      "Multi-moneda nativa (USD y Bolivares a tasa BCV)",
      "Resiliencia offline ante caidas de internet",
      "Respaldos automaticos diarios en la nube",
      "Acompanamiento directo del equipo fundador",
    ],
    cta: "Comenzar prueba o activar",
    highlight: true,
    badge: "PLAN PRINCIPAL",
  },
  {
    name: "Add-on IA WhatsApp",
    price: "+$15",
    period: "/mes",
    desc: "Asistente comercial automatizado 24/7 para WhatsApp",
    features: [
      "Conexion con la API oficial de Meta WhatsApp Cloud",
      "Motor conversacional Google Gemini 1.5 Flash",
      "Consulta reactiva de inventario y precios en vivo",
      "Calculo exacto a tasa oficial BCV y delivery",
      "Multi-tenant: 100% aislado con los datos de tu tienda",
      "1.000 conversaciones de servicio al mes incluidas",
    ],
    cta: "Agregar asistente IA",
    highlight: false,
    badge: "OPCIONAL",
  },
];

const HONESTIDAD_PUNTOS = [
  {
    no: "No te cobramos licencias por cada cajero, medico o mesero adicional.",
    si: "Un solo precio plano de $25 USD al mes por negocio, con usuarios ilimitados.",
  },
  {
    no: "No somos un ERP pesado y burocratico que tarda 6 meses en implementarse.",
    si: "Software agil y moderno listo para operar el mismo dia, con capacitacion practica.",
  },
  {
    no: "No te dejamos varado si se corta el servicio electrico o el internet.",
    si: "Modo offline local: el cajero o veterinario sigue trabajando y sincroniza al volver la red.",
  },
  {
    no: "No prometemos modulos ficticios de mineria o manufactura que no necesitas.",
    si: "Especializacion real en 5 verticales clave: Comercio, Salud, Odonto, Restaurantes y Fincas.",
  },
];

function HomePointerAurora({ hostRef }: { hostRef: RefObject<HTMLElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!host || !canvas || !context) return;

    const motionAllowed = window.matchMedia("(prefers-reduced-motion: no-preference) and (any-hover: hover) and (any-pointer: fine)");
    const colors = ["44, 134, 224", "48, 203, 132", "53, 215, 195"];
    const trailDuration = 1200;
    const minDistance = 7;

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
      const fade = Math.pow(1 - age, 1.3);
      if (fade <= 0.01) return;
      const color = colors[p.hue % colors.length];
      const baseRadius = 30 + age * 46;
      const drift = age * 26;
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
  const [selectedVerticalId, setSelectedVerticalId] = useState("comercio");
  const [heroTitleSettled, setHeroTitleSettled] = useState(false);
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();

  const currentVertical = VERTICALS.find((v) => v.id === selectedVerticalId) || VERTICALS[0];

  const featureCarouselItems = FEATURES.map((f) => ({
    content: (
      <div className="w-full h-full bg-[#0b1014] border border-white/10 shadow-xl p-6 flex flex-col justify-center rounded-2xl">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 bg-teal-500/10 border border-teal-500/20 text-teal-400">
          <f.Icon size={22} />
        </div>
        <h3 className="font-['Outfit'] font-semibold text-white text-lg mb-2">{f.title}</h3>
        <p className="text-white/55 text-sm leading-relaxed">{f.desc}</p>
      </div>
    ),
  }));

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

  const heroContainer = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
  };
  const heroItem = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <main ref={homeRef} className="aurora-public-page relative overflow-hidden bg-transparent transition-colors duration-500">
      <HomePointerAurora hostRef={homeRef} />

      {/* HERO PRINCIPAL */}
      <section
        ref={heroRef}
        onMouseMove={handleHeroMouseMove}
        className="aurora-home-hero relative min-h-[1020px] lg:min-h-[1080px] flex flex-col pt-28 sm:pt-36 pb-12 px-5 sm:px-10 max-w-[1536px] mx-auto overflow-hidden"
      >
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
          className="relative z-10 w-full max-w-5xl mx-auto"
        >
          <motion.div variants={heroItem} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-teal-500/30 bg-teal-500/10 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span className="font-mono text-[11px] sm:text-xs font-semibold tracking-[0.16em] uppercase text-[#3fe0ce]">
              SOFTWARE OPERATIVO REAL - MULTIMONEDA - MODO OFFLINE
            </span>
          </motion.div>

          <motion.h1 variants={heroItem} className="mt-5 max-w-3xl font-['IBM_Plex_Sans'] text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.02] tracking-[-0.055em] text-[#f8f6ef]">
            <TrueFocus
              sentence="El software que tu negocio real necesita..."
              manualMode={false}
              blurAmount={6}
              borderColor="#35d7c3"
              glowColor="rgba(53, 215, 195, 0.6)"
              animationDuration={0.3}
              pauseBetweenAnimations={0.5}
              onSettle={() => setHeroTitleSettled(true)}
            />
          </motion.h1>

          <motion.p variants={heroItem} className="mt-7 max-w-2xl text-base sm:text-lg leading-relaxed text-[#e5e1d5]/90">
            Control de ventas e inventario multimoneda (USD y Bs. a tasa BCV), historias medicas con odontograma, mapas satelitales de potreros y atencion automatica por WhatsApp con Inteligencia Artificial. Sin costos por usuario adicional y tolerante a fallas de internet.
          </motion.p>

          <motion.div variants={heroItem} className="mt-9 flex flex-wrap gap-3.5">
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
              Comenzar prueba o demo
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
              onClick={() => navigate("/precios")}
            >
              Ver precios transparentes
            </SpecularButton>
          </motion.div>

          {/* METRICAS REALES Y HONESTAS */}
          <motion.div variants={heroItem} className="mt-14 grid w-full max-w-5xl mx-auto grid-cols-2 gap-x-8 gap-y-10 border-t border-white/15 pt-9 sm:grid-cols-4 text-center justify-items-center">
            {[
              ["5", "Verticales en produccion"],
              ["100%", "Tolerante a caidas de red"],
              ["USD / Bs.", "Tasa oficial BCV en vivo"],
              ["24 / 7", "Asistente IA en WhatsApp"],
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

          {/* GALERIA VISUAL */}
          <motion.div variants={heroItem} className="mt-14 w-full">
            <AccordionGallery
              items={VERTICAL_PREVIEWS}
              defaultIndex={0}
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
              height={400}
              gap={10}
              radius={16}
              orientation="horizontal"
            />
          </motion.div>

          {/* ACCESO DIRECTO PARA USUARIOS CON SESION ACTIVA */}
          {isLoggedIn && (() => {
            const miSistema = SISTEMA_POR_INDUSTRIA[user?.industry || ""] || SISTEMA_POR_DEFECTO;
            return (
              <div className="mt-8 w-full max-w-3xl rounded-2xl p-6 sm:p-7 border border-[#35d7c3]/30 bg-[#030c0f]/85 backdrop-blur-xl">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4 text-left">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#35d7c3", color: "#062323" }}>
                      <miSistema.Icon size={26} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#35d7c3]/15 text-[#35d7c3] border border-[#35d7c3]/25 tracking-wider uppercase font-mono">
                          Tu espacio de trabajo
                        </span>
                        <span className="text-xs text-white/50">- {user?.empresa || "Tu negocio"}</span>
                      </div>
                      <h3 className="text-lg font-bold text-[#f8f6ef] font-['IBM_Plex_Sans'] mt-1">
                        {miSistema.nombre}
                      </h3>
                      <p className="text-xs text-white/60 mt-0.5">
                        {miSistema.desc}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(miSistema.ruta)}
                    className="aurora-solid-button px-6 py-3 text-sm font-semibold cursor-pointer whitespace-nowrap flex items-center gap-2"
                  >
                    <span>Abrir mi panel</span>
                    <span>-&gt;</span>
                  </button>
                </div>
              </div>
            );
          })()}
        </motion.div>
      </section>

      {/* SECCION DESTACADA: EL ASISTENTE INTELIGENTE DE WHATSAPP */}
      <section className="py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="relative apple-glass rounded-3xl p-8 sm:p-14 overflow-hidden border border-teal-500/30 shadow-2xl">
          <div className="line-aurora absolute top-0 left-0 right-0" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/25 text-teal-600 dark:text-teal-400 font-mono text-xs uppercase tracking-wider">
                <IconWhatsApp size={16} />
                <span>Modulo Add-on: WhatsApp Comercial con IA</span>
              </div>
              
              <h2 className="font-['Outfit'] font-bold text-3xl sm:text-4xl text-slate-900 dark:text-white leading-tight">
                Tus clientes compran por WhatsApp.<br />
                <span className="text-aurora">Aurora responde y cierra ventas 24/7.</span>
              </h2>

              <p className="text-slate-600 dark:text-white/65 text-sm sm:text-base leading-relaxed">
                Impulsado por el modelo <strong className="text-slate-900 dark:text-white">Google Gemini 1.5 Flash</strong> e integrado con la API oficial de Meta. El asistente consulta tu inventario real, cotiza en dolares y bolivares a la tasa BCV del dia, comparte datos bancarios y coordina entregas sin que tengas que responder a mano cada mensaje repetitivo.
              </p>

              <div className="space-y-3 pt-2">
                {[
                  "Respuestas en menos de 1 segundo para consultar precios, stock y tasa oficial.",
                  "Multi-tenant aislado: solo lee los productos y datos bancarios de tu negocio.",
                  "Ahorro radical: costo de tokens de centavos al mes gracias a nuestra capa hibrida.",
                  "Opcion de transferencia inmediata a un asesor humano cuando el cliente lo pida.",
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-700 dark:text-white/75">
                    <span className="mt-0.5 w-4 h-4 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0">
                      <IconCheck size={10} />
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* MOCKUP INTERACTIVO DEL CHAT DE WHATSAPP */}
            <div className="lg:col-span-6">
              <div className="max-w-md mx-auto rounded-3xl overflow-hidden shadow-2xl border border-slate-300 dark:border-white/10 bg-[#0c1317]">
                {/* Header de WhatsApp */}
                <div className="bg-[#1f2c34] px-4 py-3 flex items-center justify-between text-white border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 font-bold border border-teal-500/30">
                      AP
                    </div>
                    <div>
                      <div className="font-semibold text-sm">Ferreteria Central (Demo)</div>
                      <div className="text-[11px] text-teal-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block" />
                        Asistente IA activo
                      </div>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/70">Meta Cloud API</span>
                </div>

                {/* Cuerpo del chat con simulacion real */}
                <div className="p-4 space-y-3 text-xs font-sans bg-[#0b141a]">
                  {/* Mensaje cliente 1 */}
                  <div className="flex justify-end">
                    <div className="bg-[#005c4b] text-white p-3 rounded-2xl rounded-tr-none max-w-[85%] shadow-sm">
                      <p>Buenas tardes, tienen taladro percutor disponible? A como reciben el dolar hoy?</p>
                      <div className="text-[10px] text-white/50 text-right mt-1">2:14 PM</div>
                    </div>
                  </div>

                  {/* Respuesta Bot 1 */}
                  <div className="flex justify-start">
                    <div className="bg-[#202c33] text-white/90 p-3 rounded-2xl rounded-tl-none max-w-[85%] shadow-sm border border-white/5">
                      <p>Hola. En Ferreteria Central trabajamos con la tasa oficial BCV de <strong>50.00 Bs/$</strong>.</p>
                      <p className="mt-1.5">Si, tenemos disponible: <strong>Taladro Percutor Inalambrico 20V</strong></p>
                      <p className="text-teal-300 font-semibold mt-1">Precio: $68.00 USD / 3.400,00 Bs.</p>
                      <p className="text-white/60 text-[11px] mt-0.5">Stock en tienda: 8 piezas.</p>
                      <p className="mt-1.5 text-white/80">Deseas que te lo reservemos o prefieres entrega con delivery?</p>
                      <div className="text-[10px] text-teal-400/60 text-right mt-1 font-mono">Gemini 1.5 Flash (0.4s)</div>
                    </div>
                  </div>

                  {/* Mensaje cliente 2 */}
                  <div className="flex justify-end">
                    <div className="bg-[#005c4b] text-white p-3 rounded-2xl rounded-tr-none max-w-[85%] shadow-sm">
                      <p>Quiero delivery para Los Palos Grandes. Aceptan pago movil?</p>
                      <div className="text-[10px] text-white/50 text-right mt-1">2:15 PM</div>
                    </div>
                  </div>

                  {/* Respuesta Bot 2 */}
                  <div className="flex justify-start">
                    <div className="bg-[#202c33] text-white/90 p-3 rounded-2xl rounded-tl-none max-w-[85%] shadow-sm border border-white/5">
                      <p>Con gusto. Estos son los datos oficiales para Pago Movil:</p>
                      <div className="mt-1.5 p-2 rounded bg-black/30 font-mono text-[11px] text-teal-300 border border-teal-500/20">
                        Banco: 0102 - Banco de Venezuela<br />
                        Telefono: 0414-1112233<br />
                        RIF: J-12345678-0
                      </div>
                      <p className="mt-1.5 text-white/70">Por favor envianos el capture del comprobante cuando realices el pago para despacharte de inmediato.</p>
                      <div className="text-[10px] text-teal-400/60 text-right mt-1 font-mono">Respuesta automatica</div>
                    </div>
                  </div>
                </div>

                {/* Footer de prueba */}
                <div className="bg-[#1f2c34] p-3 text-center border-t border-white/5">
                  <span className="text-[11px] text-white/60">Disponible como modulo adicional en cualquier plan de Aurora Plus</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SELECTOR INTERACTIVO DE LAS 5 VERTICALES REALES */}
      <section id="verticales" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold tracking-widest text-teal-600 dark:text-teal-400 uppercase mb-3">Verticales Especializadas</p>
          <h2 className="font-['Outfit'] font-bold text-4xl sm:text-5xl text-slate-900 dark:text-white">
            Cinco soluciones reales.<br /><span className="text-aurora">Cero relleno generico.</span>
          </h2>
          <p className="text-slate-500 dark:text-white/50 text-sm sm:text-base max-w-2xl mx-auto mt-4">
            Cada vertical fue disenada con el flujo de trabajo exacto de su sector. No es un software generico adaptado a la fuerza.
          </p>
        </div>

        {/* Pestanas de las 5 verticales */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-10">
          {VERTICALS.map((vert) => {
            const isSelected = vert.id === selectedVerticalId;
            return (
              <button
                key={vert.id}
                onClick={() => setSelectedVerticalId(vert.id)}
                className={`flex items-center gap-2.5 px-4 sm:px-5 py-3 rounded-2xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-lg scale-105"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
                }`}
              >
                <vert.Icon size={18} />
                <span>{vert.name}</span>
              </button>
            );
          })}
        </div>

        {/* Tarjeta de Detalle y Metricas de la Vertical Seleccionada */}
        <div className="apple-glass rounded-3xl p-6 sm:p-10 border border-slate-200/80 dark:border-white/10 shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-5 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-wider bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                {currentVertical.badge}
              </div>
              <h3 className="font-['Outfit'] font-bold text-3xl text-slate-900 dark:text-white">
                {currentVertical.name}
              </h3>
              <p className="text-slate-600 dark:text-teal-300/90 font-medium text-sm">
                {currentVertical.tagline}
              </p>
              <p className="text-slate-500 dark:text-white/60 text-sm leading-relaxed">
                {currentVertical.desc}
              </p>

              <div className="space-y-2.5 pt-2">
                {currentVertical.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-white/75">
                    <span className="mt-0.5 w-4 h-4 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0">
                      <IconCheck size={10} />
                    </span>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <SpecularButton
                  size="sm"
                  radius={8}
                  tint="#35d7c3"
                  tintOpacity={0.16}
                  textColor="#ffffff"
                  lineColor="#7cf3e3"
                  baseColor="#0f766e"
                  shineSize={10}
                  shineFade={40}
                  intensity={1.2}
                  proximity={220}
                  onClick={() => navigate("/onboarding")}
                >
                  Solicitar acceso a {currentVertical.name}
                </SpecularButton>
              </div>
            </div>

            {/* Panel de Metricas y Visualizacion de la Vertical */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl p-6 bg-slate-50/90 dark:bg-[#080d11] border border-slate-200/80 dark:border-white/10 space-y-6">
                
                <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-500">
                      <currentVertical.Icon size={22} />
                    </div>
                    <div>
                      <div className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-base">
                        Panel de Control Operativo
                      </div>
                      <div className="text-xs text-slate-500 dark:text-white/40">
                        {currentVertical.name} - Modo en vivo
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 text-xs font-semibold font-mono">
                    <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                    <span>Sincronizado</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {currentVertical.stats.map((st) => (
                    <div key={st.label} className="p-4 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5">
                      <div className="text-xs text-slate-500 dark:text-white/40 mb-1">{st.label}</div>
                      <div className={`font-['Outfit'] font-bold text-xl ${st.color}`}>{st.value}</div>
                      <div className="text-[11px] text-slate-400 dark:text-white/30 mt-0.5">{st.sub}</div>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5 space-y-2.5">
                  <div className="text-xs font-semibold text-slate-700 dark:text-white/70 uppercase tracking-wider font-mono">
                    Flujo de Operacion Diaria
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-slate-100/60 dark:bg-white/[0.02]">
                      <span className="text-slate-600 dark:text-white/60">Actualizacion de tasa BCV y conversion</span>
                      <span className="font-mono font-semibold text-teal-600 dark:text-teal-400">Automatica</span>
                    </div>
                    <div className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-slate-100/60 dark:bg-white/[0.02]">
                      <span className="text-slate-600 dark:text-white/60">Resguardo en cola offline si falla internet</span>
                      <span className="font-mono font-semibold text-teal-600 dark:text-teal-400">Activo (IndexedDB)</span>
                    </div>
                    <div className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-slate-100/60 dark:bg-white/[0.02]">
                      <span className="text-slate-600 dark:text-white/60">Aislamiento de base de datos por negocio</span>
                      <span className="font-mono font-semibold text-teal-600 dark:text-teal-400">100% Multi-tenant</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SECCION HONESTIDAD RADICAL: LO QUE SOMOS VS LO QUE NO SOMOS */}
      <section className="py-20 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold tracking-widest text-teal-600 dark:text-teal-400 uppercase mb-3">Honestidad y Confianza</p>
          <h2 className="font-['Outfit'] font-bold text-4xl sm:text-5xl text-slate-900 dark:text-white">
            Lo que somos y<br /><span className="text-aurora">lo que no somos</span>
          </h2>
          <p className="text-slate-500 dark:text-white/50 text-sm sm:text-base max-w-xl mx-auto mt-4">
            Preferimos la transparencia desde el primer momento. Asi es como trabajamos y cuidamos la operacion de tu empresa.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {HONESTIDAD_PUNTOS.map((pt, idx) => (
            <div key={idx} className="apple-glass rounded-2xl p-6 border border-slate-200/80 dark:border-white/10 space-y-4">
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-start gap-3">
                <span className="font-bold text-rose-500 text-base leading-none">x</span>
                <div>
                  <div className="font-semibold uppercase text-[10px] tracking-wider text-rose-500 mb-0.5">Lo que NO hacemos</div>
                  <div>{pt.no}</div>
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-800 dark:text-teal-200 text-xs sm:text-sm flex items-start gap-3">
                <span className="font-bold text-teal-500 text-base leading-none">&#10003;</span>
                <div>
                  <div className="font-semibold uppercase text-[10px] tracking-wider text-teal-500 mb-0.5">Nuestra realidad</div>
                  <div>{pt.si}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CARACTERISTICAS CON DEPTH CAROUSEL */}
      <section className="py-24 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold tracking-widest text-teal-600 dark:text-teal-400 uppercase mb-3">Infraestructura</p>
          <h2 className="font-['Outfit'] font-bold text-4xl sm:text-5xl text-slate-900 dark:text-white">
            Construido para la<br /><span className="text-aurora">operacion real</span>
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
      </section>

      {/* SECCION DISPOSITIVOS Y MOVIL */}
      <section className="py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="relative apple-glass rounded-3xl overflow-hidden shadow-xl border border-slate-200/80 dark:border-white/10">
          <div className="line-aurora absolute top-0 left-0 right-0" />
          <div className="relative p-8 sm:p-14 flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 max-w-xl">
              <p className="text-xs font-semibold tracking-widest text-teal-600 dark:text-teal-400 uppercase mb-4">Portabilidad total</p>
              <h2 className="font-['Outfit'] font-black text-4xl sm:text-5xl text-slate-900 dark:text-white leading-tight mb-5">
                Tu negocio en la palma<br /><span className="text-aurora">de tu mano, donde estes</span>
              </h2>
              <p className="text-slate-600 dark:text-white/55 text-base leading-relaxed mb-8">
                Ya sea en el mostrador de tu tienda, en el consultorio medico, en las mesas del restaurante o en el potrero de la finca: Aurora Plus funciona directo en el navegador de tu computadora, tablet o celular.
              </p>
              <div className="space-y-4">
                {[
                  { Icon: IconLaptop, title: "Computadora y Laptops", desc: "Panel completo de administracion, facturacion, reportes y configuracion avanzada." },
                  { Icon: IconPhone,  title: "Telefonos y Tablets",   desc: "Version movil rapida para mesoneros, toma de pedidos en mostrador y pesaje en corral." },
                  { Icon: IconPlane,  title: "Operacion sin Internet", desc: "Continua registrando ventas y consultas. Al volver la conexion, se sincroniza automaticamente." },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-500 flex items-center justify-center flex-shrink-0">
                      <item.Icon size={20} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{item.title}</h4>
                      <p className="text-slate-500 dark:text-white/45 text-xs mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ilustracion / Mockup de dispositivo */}
            <div className="flex-1 flex justify-center w-full">
              <div className="w-full max-w-sm rounded-3xl p-6 bg-slate-900 text-white shadow-2xl border border-white/10 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <AuroraLogo size={24} />
                    <span className="font-bold text-sm">Aurora Plus Movil</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-mono">Modo Web</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center">
                    <span className="text-white/60">Caja Actual</span>
                    <span className="font-mono font-bold text-teal-400">$1,480.00 USD</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center">
                    <span className="text-white/60">Tasa Oficial</span>
                    <span className="font-mono font-bold text-white">50.00 Bs/$</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center">
                    <span className="text-white/60">Estado de Conexion</span>
                    <span className="font-mono text-teal-300 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" /> Sincronizado
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PLANES Y PRECIOS TRANSPARENTES */}
      <section className="py-24 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold tracking-widest text-teal-600 dark:text-teal-400 uppercase mb-3">Inversion Transparente</p>
          <h2 className="font-['Outfit'] font-bold text-4xl sm:text-5xl text-slate-900 dark:text-white">
            Un precio claro.<br /><span className="text-aurora">Sin sorpresas ni contratos forzados.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-3xl p-7 transition-all duration-300 flex flex-col ${
                plan.highlight
                  ? "apple-glass border-2 border-teal-500/60 shadow-2xl scale-[1.02]"
                  : "apple-glass border border-slate-300/70 dark:border-white/10 hover:border-teal-500/40"
              }`}
            >
              {plan.badge && (
                <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 text-white text-[11px] font-bold px-4 py-1 rounded-full whitespace-nowrap shadow-md ${
                  plan.highlight ? "g-aurora" : "bg-slate-800 dark:bg-white/20"
                }`}>
                  {plan.badge}
                </div>
              )}
              <div className="mb-5">
                <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-2xl">{plan.name}</h3>
                <p className="text-slate-500 dark:text-white/40 text-xs mt-1 leading-snug">{plan.desc}</p>
                <div className="mt-4 flex items-end gap-1">
                  <span className="font-['Outfit'] font-black leading-none text-4xl text-slate-900 dark:text-white">{plan.price}</span>
                  {plan.period && <span className="text-slate-500 dark:text-white/40 text-sm mb-1">{plan.period}</span>}
                </div>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-white/70">
                    <span className="mt-0.5 w-4 h-4 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0">
                      <IconCheck size={9} />
                    </span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate(plan.highlight ? "/onboarding" : "/precios")}
                className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-all mt-auto cursor-pointer ${
                  plan.highlight
                    ? "g-aurora text-white hover:opacity-95 shadow-lg"
                    : "bg-slate-900 text-white dark:bg-white/10 hover:bg-slate-800 dark:hover:bg-white/20"
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* QUIENES CONSTRUYEN ESTO */}
      <section className="py-20 px-4 sm:px-6 max-w-4xl mx-auto text-center">
        <p className="text-xs font-semibold tracking-widest text-teal-600 dark:text-teal-400 uppercase mb-3">Equipo Fundador</p>
        <h2 className="font-['Outfit'] font-bold text-3xl sm:text-4xl text-slate-900 dark:text-white mb-5">
          Negocio real, ingenieria real
        </h2>
        <p className="text-slate-600 dark:text-white/55 text-base leading-relaxed max-w-2xl mx-auto">
          Aurora Plus es desarrollado por profesionales con formacion en Administracion de Empresas e Ingenieria Informatica. Probado en campo en comercios, clinicas odontologicas y fincas antes de abrirlo al mercado.
        </p>
      </section>

      {/* CTA FINAL */}
      <section className="py-20 px-4 sm:px-6 max-w-4xl mx-auto text-center">
        <div className="relative apple-glass rounded-3xl p-10 sm:p-14 overflow-hidden shadow-2xl border border-teal-500/30">
          <div className="line-aurora absolute top-0 left-0 right-0" />
          <div className="relative">
            <div className="flex justify-center mb-6"><AuroraLogo size={60} animated /></div>
            <h2 className="font-['Outfit'] font-black text-3xl sm:text-5xl text-slate-900 dark:text-white mb-4 leading-tight">
              Listo para ordenar tu negocio<br /><span className="text-aurora">sin complicaciones?</span>
            </h2>
            <p className="text-slate-600 dark:text-white/55 text-base sm:text-lg mb-8 max-w-md mx-auto">
              Configuracion rapida. Sin migraciones traumaticas. Tu equipo trabajando con claridad desde el primer dia.
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
                onClick={() => navigate("/onboarding")}
              >
                Comenzar ahora
              </SpecularButton>
              <button
                onClick={() => navigate("/precios")}
                className="text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-colors text-sm font-semibold cursor-pointer"
              >
                Conocer planes y detalles -&gt;
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
