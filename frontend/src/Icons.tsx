// Los íconos son lineales y heredan el color de su contexto. Esto mantiene una
// interfaz institucional y evita degradados decorativos inconsistentes.
export const GRAD = "aurora-icon-grad";

// Render this once near the top of the app (hidden)
export function AuroraGradientDef() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }}>
      <defs>
        <linearGradient id={GRAD} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#177E89" />
          <stop offset="50%"  stopColor="#177E89" />
          <stop offset="100%" stopColor="#0D3B3D" />
        </linearGradient>
      </defs>
    </svg>
  );
}

interface IconProps { size?: number; className?: string; stroke?: string }

const s = { stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };

const getStyle = (className?: string, stroke?: string) => ({
  stroke: stroke || "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none"
});

export function IconVet({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <ellipse cx="12" cy="14" rx="4" ry="3.5" {...s} />
      <circle cx="8.5"  cy="9.5" r="1.2" {...s} />
      <circle cx="15.5" cy="9.5" r="1.2" {...s} />
      <circle cx="6.5"  cy="12"  r="1"   {...s} />
      <circle cx="17.5" cy="12"  r="1"   {...s} />
    </svg>
  );
}

export function IconTooth({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 4c-2.2 0-3.2 1.1-4.3 1.1-1.7 0-3.2 1.4-3.2 3.6 0 2.8 1.1 4.4 1.6 7 .4 2 .8 3.3 1.9 3.3.9 0 1-2.3 1.6-3.9.4-1 .8-1.6 1.4-1.6s1 .6 1.4 1.6c.6 1.6.7 3.9 1.6 3.9 1.1 0 1.5-1.3 1.9-3.3.5-2.6 1.6-4.2 1.6-7 0-2.2-1.5-3.6-3.2-3.6C15.2 5.1 14.2 4 12 4z" {...s} />
    </svg>
  );
}

export function IconClinic({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="18" height="15" rx="1.5" {...s} />
      <path d="M3 10h18" {...s} />
      <line x1="12" y1="13" x2="12" y2="18" {...s} />
      <line x1="9.5" y1="15.5" x2="14.5" y2="15.5" {...s} />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" {...s} />
    </svg>
  );
}

export function IconHardware({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l2-2a4 4 0 0 1-5 5l-7 7a2 2 0 0 1-3-3l7-7a4 4 0 0 1 5-5l-2 2z" {...s} />
    </svg>
  );
}

export function IconMining({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M14 10l-8.5 8.5a2.12 2.12 0 0 1-3-3L11 7" {...s} />
      <path d="M14 10l3-3 3 3-7 7-3-3 4-4z" {...s} />
      <path d="M10 4l3-1 5 5-1 3" {...s} />
    </svg>
  );
}

export function IconRestaurant({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="13" r="5" {...s} />
      <path d="M12 8V3" {...s} />
      <path d="M8 3v4a2 2 0 0 0 4 0V3" {...s} />
      <line x1="17" y1="3" x2="17" y2="21" {...s} />
    </svg>
  );
}

export function IconFarm({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="7" y="8" width="10" height="9" rx="3" {...s} />
      <path d="M9 8V6a2 2 0 0 0-2-2H5" {...s} />
      <path d="M15 8V6a2 2 0 0 1 2-2h2" {...s} />
      <circle cx="10" cy="13" r="1" {...s} />
      <circle cx="14" cy="13" r="1" {...s} />
      <path d="M10 17h4" {...s} />
    </svg>
  );
}

export function IconEducation({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <polygon points="12,2 22,8.5 12,15 2,8.5" {...s} />
      <path d="M6 10.5v5a6 6 0 0 0 12 0v-5" {...s} />
      <line x1="22" y1="8.5" x2="22" y2="15" {...s} />
    </svg>
  );
}

export function IconRetail({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" {...s} />
      <line x1="3" y1="6" x2="21" y2="6" {...s} />
      <path d="M16 10a4 4 0 0 1-8 0" {...s} />
    </svg>
  );
}

export function IconCustomize({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" {...s} />
      <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" {...s} />
    </svg>
  );
}

export function IconChart({ size = 24, className, stroke }: IconProps) {
  const st = getStyle(className, stroke);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" {...st} />
    </svg>
  );
}

export function IconLink({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="7" width="6" height="10" rx="1.5" {...s} />
      <rect x="9" y="4" width="6" height="16" rx="1.5" {...s} />
      <rect x="16" y="9" width="6" height="6" rx="1.5" {...s} />
    </svg>
  );
}

export function IconCloud({ size = 24, className, stroke }: IconProps) {
  const st = getStyle(className, stroke);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" {...st} />
    </svg>
  );
}

export function IconLock({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function IconUnlock({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  );
}

export function IconMobile({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="5" y="2" width="14" height="20" rx="2" {...s} />
      <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth={2.5} stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}

export function IconLaptop({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Screen */}
      <rect x="2" y="3" width="20" height="13" rx="2" {...s} />
      {/* Keyboard base */}
      <path d="M1 20h22" {...s} />
      {/* Hinge feet */}
      <path d="M7 20l1-4h8l1 4" {...s} />
      {/* Screen content lines */}
      <line x1="7" y1="8" x2="12" y2="8" {...s} strokeWidth={1.4} />
      <line x1="7" y1="11" x2="17" y2="11" {...s} strokeWidth={1.4} />
    </svg>
  );
}

export function IconPhone({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Phone body */}
      <rect x="6" y="2" width="12" height="20" rx="2.5" {...s} />
      {/* Notch */}
      <path d="M10 5h4" {...s} strokeWidth={1.4} />
      {/* Home dot */}
      <circle cx="12" cy="19" r="1" {...s} strokeWidth={1.4} />
      {/* Screen lines */}
      <line x1="9" y1="9"  x2="15" y2="9"  {...s} strokeWidth={1.3} />
      <line x1="9" y1="12" x2="13" y2="12" {...s} strokeWidth={1.3} />
    </svg>
  );
}

export function IconPlane({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Fuselage */}
      <path d="M22 2L11 13" {...s} />
      {/* Wing */}
      <path d="M22 2L15 22l-4-9-9-4 20-7z" {...s} />
    </svg>
  );
}

export function IconStethoscope({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 3v6a4 4 0 0 0 8 0V3" {...s} />
      <path d="M9 13v2a5 5 0 0 0 10 0v-2.5" {...s} />
      <circle cx="19.5" cy="10.5" r="1.75" {...s} />
    </svg>
  );
}

export function IconCalendar({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="16" rx="2" {...s} />
      <path d="M3 10h18" {...s} />
      <path d="M8 3v4M16 3v4" {...s} />
    </svg>
  );
}

export function IconPrescription({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6 2h9a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" {...s} />
      <path d="M8 7h7M8 11h7M8 15h4" {...s} />
    </svg>
  );
}

export function IconCard({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="5" width="20" height="14" rx="2" {...s} />
      <path d="M2 10h20" {...s} />
      <path d="M6 15h4" {...s} />
    </svg>
  );
}

export function IconRocket({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M14.5 3.5c2.5 1 4 3.5 4 6.5-2 .5-4.5 2-6.5 4l-3-3c2-2 3.5-4.5 4-6.5a7 7 0 0 1 1.5-1z" {...s} />
      <path d="M9 15l-3 1 1-3" {...s} />
      <path d="M6 18c-1.5.5-2.5 1.5-3 3 1.5-.5 2.5-1.5 3-3z" {...s} />
      <circle cx="15" cy="9" r="1.3" {...s} />
    </svg>
  );
}

export function IconDownload({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 3v12" {...s} />
      <path d="M7 10l5 5 5-5" {...s} />
      <path d="M4 19h16" {...s} />
    </svg>
  );
}

export function IconKey({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="8" cy="15" r="4" {...s} />
      <path d="M11 12l9-9" {...s} />
      <path d="M17 6l2.5 2.5M14 9l2 2" {...s} />
    </svg>
  );
}

export function IconHourglass({ size = 24, className, stroke }: IconProps) {
  const st = getStyle(className, stroke);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 3h12M6 21h12" {...st} />
      <path d="M7 3c0 4 3 6 5 8 2-2 5-4 5-8" {...st} />
      <path d="M7 21c0-4 3-6 5-8 2 2 5 4 5 8" {...st} />
    </svg>
  );
}

// Grupo de personas, silueta sólida gris — sin degradado, dibujado a mano (sin depender de
// ningún paquete de íconos externo). Usado en la sección de Pacientes.
export function IconUsers({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={className ? "currentColor" : "#6B7280"} className={className}>
      <circle cx="5.8" cy="8.2" r="2" />
      <ellipse cx="5.8" cy="21" rx="3.6" ry="4.4" />
      <circle cx="18.2" cy="8.2" r="2" />
      <ellipse cx="18.2" cy="21" rx="3.6" ry="4.4" />
      <circle cx="12" cy="8.8" r="3.1" />
      <ellipse cx="12" cy="21.5" rx="6.4" ry="5.4" />
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// SET DE ÍCONOS DEL PANEL LATERAL DE MEDICLINIC — misma estética que IconUsers:
// silueta sólida gris (currentColor si hay className, si no #6B7280), CERO
// degradados. Los detalles internos (líneas de texto, tapa de frasco, dientes
// de engranaje...) se logran con el MISMO color a menor opacidad, nunca con
// un segundo color ni con degradado — así se distinguen sin "ensuciar" nada.
// ══════════════════════════════════════════════════════════════════════════

/** Vista General — cuadrícula de panel/dashboard. */
export function IconDashboardGrid({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={className ? "currentColor" : "#6B7280"} className={className}>
      <rect x="3" y="3" width="8.5" height="8.5" rx="2" />
      <rect x="12.5" y="3" width="8.5" height="8.5" rx="2" />
      <rect x="3" y="12.5" width="8.5" height="8.5" rx="2" />
      <rect x="12.5" y="12.5" width="8.5" height="8.5" rx="2" />
    </svg>
  );
}

/** Historias Clínicas — hoja con esquina doblada y líneas de texto. */
export function IconDocumentoMedico({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={className ? "currentColor" : "#6B7280"} className={className}>
      <path d="M5 2.5A1.5 1.5 0 0 1 6.5 1H14l6 6v14.5A1.5 1.5 0 0 1 18.5 23h-12A1.5 1.5 0 0 1 5 21.5V2.5Z" />
      <path d="M14 1v4.5A1.5 1.5 0 0 0 15.5 7H20L14 1Z" opacity="0.45" />
      <rect x="8" y="12" width="8" height="1.8" rx="0.9" opacity="0.5" />
      <rect x="8" y="15.6" width="8" height="1.8" rx="0.9" opacity="0.5" />
      <rect x="8" y="19.2" width="5" height="1.8" rx="0.9" opacity="0.5" />
    </svg>
  );
}

/** Red Laboratorios & Inbox — frasco de laboratorio con muestra. */
export function IconFrascoLab({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={className ? "currentColor" : "#6B7280"} className={className}>
      <path d="M10 2h4a1 1 0 0 1 0 2v4.4l5 8.7A2.3 2.3 0 0 1 17 20.8H7A2.3 2.3 0 0 1 5 17.1l5-8.7V4a1 1 0 0 1 0-2Z" />
      <path d="M7.6 14.5h8.8l1.9 3.3a.8.8 0 0 1-.7 1.2H6.4a.8.8 0 0 1-.7-1.2l1.9-3.3Z" opacity="0.45" />
      <circle cx="14.2" cy="11.6" r="0.9" opacity="0.7" />
    </svg>
  );
}

/** Procedimientos & Cotizador — tablilla con check. */
export function IconClipboardCheck({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={className ? "currentColor" : "#6B7280"} className={className}>
      <rect x="4.5" y="3" width="15" height="19" rx="2.4" />
      <rect x="8.5" y="1" width="7" height="4.2" rx="1.4" opacity="0.5" />
      <path d="M8.2 12.6l2.6 2.6 5-5.3" stroke="#fff" strokeWidth="1.9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Sala de Espera & Caja — reloj de arena. */
export function IconRelojArena({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={className ? "currentColor" : "#6B7280"} className={className}>
      <path d="M5 2h14a1 1 0 0 1 0 2h-1.2c-.3 3-1.9 5.6-4.4 7-2.5 1.4-4.1 4-4.4 7H19a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2h1.2c.3-3 1.9-5.6 4.4-7C13.1 9.6 14.7 7 15 4H5a1 1 0 0 1 0-2Z" />
      <path d="M8.6 18.6c.5-2 1.7-3.7 3.4-4.6 1.7.9 2.9 2.6 3.4 4.6H8.6Z" opacity="0.5" />
    </svg>
  );
}

/** Agenda Médica & Calendario — calendario con anillas. */
export function IconCalendarSolido({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={className ? "currentColor" : "#6B7280"} className={className}>
      <rect x="3" y="4.5" width="18" height="17" rx="2.4" />
      <rect x="3" y="4.5" width="18" height="4.5" rx="2.4" opacity="0.5" />
      <rect x="6.5" y="1.5" width="2" height="5" rx="1" />
      <rect x="15.5" y="1.5" width="2" height="5" rx="1" />
      <circle cx="12" cy="15" r="2.4" opacity="0.65" />
    </svg>
  );
}

/** Canal Endémico — barras de tendencia ascendentes. */
export function IconChartTrend({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={className ? "currentColor" : "#6B7280"} className={className}>
      <rect x="3" y="14" width="4" height="8" rx="1.2" opacity="0.5" />
      <rect x="10" y="9" width="4" height="13" rx="1.2" opacity="0.75" />
      <rect x="17" y="4" width="4" height="18" rx="1.2" />
    </svg>
  );
}

/** Resúmenes Financieros — billetera / tarjeta. */
export function IconWallet({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={className ? "currentColor" : "#6B7280"} className={className}>
      <rect x="2.5" y="6" width="19" height="14" rx="2.4" />
      <rect x="2.5" y="6" width="19" height="4" rx="2.4" opacity="0.5" />
      <circle cx="17" cy="14" r="1.7" opacity="0.7" />
    </svg>
  );
}

/** Configuración & Perfil — engranaje. */
export function IconGearSolido({ size = 24, className }: IconProps) {
  const dientes = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={className ? "currentColor" : "#6B7280"} className={className}>
      {dientes.map((deg) => (
        <rect key={deg} x="10.5" y="0.5" width="3" height="6" rx="1" transform={`rotate(${deg} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="7.4" />
      <circle cx="12" cy="12" r="3.2" opacity="0.5" />
    </svg>
  );
}

export function IconUser({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" {...s} />
      <path d="M4 21a8 8 0 0 1 16 0" {...s} />
    </svg>
  );
}

export function IconClose({ size = 24, className, stroke }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke || "currentColor"}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export function IconCheckCircle({ size = 24, className, stroke }: IconProps) {
  const st = getStyle(className, stroke);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" {...st} />
      <path d="M8 12.5l2.5 2.5L16 9.5" {...st} />
    </svg>
  );
}

export function IconBank({ size = 24, className, stroke }: IconProps) {
  const st = getStyle(className, stroke);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M3 10l9-6 9 6" {...st} />
      <path d="M4.5 10.5v8M9.5 10.5v8M14.5 10.5v8M19.5 10.5v8" {...st} />
      <path d="M2.5 21h19" {...st} />
    </svg>
  );
}

export function IconChat({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 5h16v11H9l-4 4V5z" {...s} />
    </svg>
  );
}

export function IconConstruction({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 21l7-14 7 14" {...s} />
      <path d="M13 10l6 11" {...s} />
      <path d="M6 15h12" {...s} />
    </svg>
  );
}

export function IconWarning({ size = 24, className, stroke }: IconProps) {
  const st = getStyle(className, stroke);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 3l10 18H2L12 3z" {...st} />
      <path d="M12 10v4" {...st} />
      <circle cx="12" cy="17.3" r="0.6" fill={st.stroke} stroke="none" />
    </svg>
  );
}

export function IconCheck({ size = 24, className, stroke }: IconProps) {
  const st = getStyle(className, stroke);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5 12.5l4.5 4.5L19 7" {...st} strokeWidth={2.25} />
    </svg>
  );
}

export function IconInfo({ size = 24, className, stroke }: IconProps) {
  const st = getStyle(className, stroke);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" {...st} />
      <line x1="12" y1="8" x2="12.01" y2="8" strokeWidth={2.5} stroke={st.stroke} strokeLinecap="round" />
      <line x1="12" y1="12" x2="12" y2="16" {...st} />
    </svg>
  );
}

export function IconBoutique({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M9 4h6l2 4H7l2-4z" {...s} />
      <path d="M7 8l-2 12h14L17 8" {...s} />
      <path d="M10 12v2M14 12v2" {...s} />
    </svg>
  );
}

export function IconFactory({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 21V11l5 3v-3l5 3v-3l5 3v7H3z" {...s} />
      <path d="M17 8V4l3 2.5V8" {...s} />
    </svg>
  );
}

export function IconBox({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 8l9-5 9 5-9 5-9-5z" {...s} />
      <path d="M3 8v9l9 5 9-5V8" {...s} />
      <path d="M12 13v9" {...s} />
    </svg>
  );
}

export function IconBolt({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" {...s} />
    </svg>
  );
}

export function IconShield({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" {...s} />
      <path d="M9 12l2 2 4-4" {...s} />
    </svg>
  );
}

export function IconStar({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 3l2.6 5.8 6.4.6-4.8 4.2 1.4 6.2-5.6-3.4-5.6 3.4 1.4-6.2-4.8-4.2 6.4-.6L12 3z" {...s} />
    </svg>
  );
}

export function IconMail({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="4" width="20" height="16" rx="3" />
      <path d="M22 7l-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

export function IconInstagram({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <path d="M17.2 6.8h.01" />
    </svg>
  );
}

export function IconSearch({ size = 24, className, stroke }: IconProps) {
  const st = getStyle(className, stroke);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="11" cy="11" r="7" {...st} />
      <path d="M20 20l-4.35-4.35" {...st} />
    </svg>
  );
}

export function IconTrash({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 7h16" {...s} />
      <path d="M9 7V4h6v3" {...s} />
      <path d="M6 7l1 13h10l1-13" {...s} />
      <path d="M10 11v6M14 11v6" {...s} />
    </svg>
  );
}

export function IconRefresh({ size = 24, className, stroke }: IconProps) {
  const st = getStyle(className, stroke);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 4v6h6" {...st} />
      <path d="M20 20v-6h-6" {...st} />
      <path d="M5.5 9a7 7 0 0112.4-2.5M18.5 15a7 7 0 01-12.4 2.5" {...st} />
    </svg>
  );
}

export function IconChevronLeft({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M15 5l-7 7 7 7" {...s} />
    </svg>
  );
}

export function IconChevronRight({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M9 5l7 7-7 7" {...s} />
    </svg>
  );
}

export function IconFileText({ size = 24, className, stroke }: IconProps) {
  const st = getStyle(className, stroke);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 2h8l5 5v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" {...st} />
      <path d="M14 2v5h5" {...st} />
      <path d="M8 13h8M8 17h5" {...st} />
    </svg>
  );
}

export function IconWhatsApp({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm5.79 14.07c-.24.68-1.4 1.28-1.92 1.35-.49.07-1.12.1-3.23-.77-2.69-1.12-4.43-3.87-4.57-4.05-.13-.18-1.1-1.46-1.1-2.79 0-1.32.69-1.97.94-2.24.25-.26.54-.33.72-.33.18 0 .36.01.52.01.17 0 .4-.06.63.48.24.57.81 1.97.88 2.12.07.15.12.33.02.53-.1.19-.15.31-.3.48-.15.18-.31.4-.45.54-.15.15-.31.31-.13.62.18.31.79 1.3 1.7 2.11 1.17 1.04 2.15 1.36 2.46 1.51.31.15.49.13.67-.08.18-.21.78-.91.99-1.22.21-.31.42-.26.71-.15.29.11 1.83.86 2.15 1.02.31.15.52.23.6.36.07.13.07.76-.17 1.44z" />
    </svg>
  );
}

export function IconSettings({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function IconShoppingBag({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

export function IconUtensils({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2" />
      <path d="M15 2v19" />
      <path d="M5 2v8a3 3 0 0 0 3 3h1v8" />
    </svg>
  );
}

export function IconTruck({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <polygon points="16,8 20,8 23,11 23,16 16,16" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

export function IconScissors({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  );
}

export function IconPrinter({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="6,9 6,2 18,2 18,9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

export function IconEdit({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

export function IconNote({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

export function IconReceipt({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" />
      <line x1="8" y1="8" x2="16" y2="8" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="16" x2="13" y2="16" />
    </svg>
  );
}

export function IconCoins({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="8" cy="8" r="6" />
      <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
      <path d="M7 6h1v4" />
      <path d="M16.7 13.3a4 4 0 0 0-2.4-2.4" />
    </svg>
  );
}

export function IconTerminal({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

export function IconWheat({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2v20" />
      <path d="M12 5c-1.5 0-3 1-3 2.5S10.5 10 12 10" />
      <path d="M12 5c1.5 0 3 1 3 2.5S13.5 10 12 10" />
      <path d="M12 9c-1.5 0-3 1-3 2.5S10.5 14 12 14" />
      <path d="M12 9c1.5 0 3 1 3 2.5S13.5 14 12 14" />
      <path d="M12 13c-1.5 0-3 1-3 2.5S10.5 18 12 18" />
      <path d="M12 13c1.5 0 3 1 3 2.5S13.5 18 12 18" />
    </svg>
  );
}

export function IconSyringe({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="21" y1="3" x2="17" y2="7" />
      <path d="M18.5 5.5l-11 11-3 5 5-3 11-11z" />
      <line x1="13" y1="9" x2="15" y2="11" />
      <line x1="10" y1="12" x2="12" y2="14" />
    </svg>
  );
}

export function IconWrench({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.1-2.1z" />
    </svg>
  );
}

export function IconTractor({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="2" />
      <path d="M6 15V7h6l3 5h3a2 2 0 0 1 2 2v2" />
      <path d="M9 15h6" />
      <path d="M3 11h3" />
    </svg>
  );
}

export function IconFire({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2c1 3-3 4-3 8a3 3 0 0 0 6 0c1 1 2 2.5 2 4.5A5 5 0 0 1 7 15c0-4 3-6 3-9 0 0 2 1 2 3 0-3 0-5-0-7z" />
    </svg>
  );
}

export function IconMilk({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 2h6" />
      <path d="M9 2v4l-3 4v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10l-3-4V2" />
      <path d="M6 13h12" />
    </svg>
  );
}

export function IconPin({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 21s-7-6.4-7-11.5A7 7 0 0 1 19 9.5C19 14.6 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

export function IconCow({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 10c0-2 1.5-3 3-3 1 0 1.5.5 2 1 .8-.6 1.9-1 3-1s2.2.4 3 1c.5-.5 1-1 2-1 1.5 0 3 1 3 3 0 1-.5 2-1.5 2.5V15a4 4 0 0 1-4 4H9.5a4 4 0 0 1-4-4v-2.5C4.5 12 4 11 4 10z" />
      <circle cx="9.5" cy="12" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="12" r="0.6" fill="currentColor" stroke="none" />
      <path d="M3 8.5L4.5 10" />
      <path d="M21 8.5L19.5 10" />
    </svg>
  );
}

export function IconSnowflake({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="12" y1="2" x2="12" y2="22" />
      <line x1="4" y1="7" x2="20" y2="17" />
      <line x1="4" y1="17" x2="20" y2="7" />
    </svg>
  );
}

export function IconTag({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 12.5L12.5 20a1.5 1.5 0 0 1-2.1 0l-6.4-6.4a1.5 1.5 0 0 1 0-2.1L11.5 4H19a1 1 0 0 1 1 1v7.5z" />
      <circle cx="15.5" cy="8.5" r="1.2" />
    </svg>
  );
}

export function IconDna({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 3c0 6 12 12 12 18" />
      <path d="M18 3c0 6-12 12-12 18" />
      <line x1="7.5" y1="7" x2="16.5" y2="7" />
      <line x1="7.5" y1="17" x2="16.5" y2="17" />
      <line x1="9" y1="12" x2="15" y2="12" />
    </svg>
  );
}

export function IconScale({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="5" y1="7" x2="19" y2="7" />
      <path d="M5 7l-3 6a3 3 0 0 0 6 0l-3-6z" />
      <path d="M19 7l-3 6a3 3 0 0 0 6 0l-3-6z" />
      <line x1="8" y1="21" x2="16" y2="21" />
    </svg>
  );
}

export function IconSprout({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22v-9" />
      <path d="M12 13c0-4-3-6-7-6 0 4 3 6 7 6z" />
      <path d="M12 10c0-3.5 2.5-5.5 6-5.5 0 3.5-2.5 5.5-6 5.5z" />
    </svg>
  );
}

export function IconCart({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="9" cy="20" r="1.2" />
      <circle cx="18" cy="20" r="1.2" />
      <path d="M2 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L21 7H6" />
    </svg>
  );
}

export function IconMeat({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14 3c4 0 7 3 7 7 0 3-2 5-4 6l-6 6-3-3c-1-2 0-4 1-5l2-2c-1.5-1-2-2.5-2-4 0-3 2.5-5 5-5z" />
      <circle cx="8" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconBulb({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 18h6" />
      <path d="M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V17h5v-1.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3z" />
    </svg>
  );
}
