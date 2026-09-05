// Shared gradient ID used by all icons — defined once in <AuroraGradientDef />
export const GRAD = "aurora-icon-grad";

// Render this once near the top of the app (hidden)
export function AuroraGradientDef() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }}>
      <defs>
        <linearGradient id={GRAD} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#00e5b8" />
          <stop offset="50%"  stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
    </svg>
  );
}

interface IconProps { size?: number }

const s = { stroke: `url(#${GRAD})`, strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };

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

export function IconChart({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" {...s} />
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

export function IconCloud({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" {...s} />
    </svg>
  );
}

export function IconLock({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="11" width="18" height="11" rx="2" {...s} />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" {...s} />
      <circle cx="12" cy="16" r="1" {...s} />
    </svg>
  );
}

export function IconMobile({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="5" y="2" width="14" height="20" rx="2" {...s} />
      <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth={2.5} stroke={`url(#${GRAD})`} strokeLinecap="round" />
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
