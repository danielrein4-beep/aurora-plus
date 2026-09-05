export default function AuroraLogo({ size = 48, animated = true }: { size?: number; animated?: boolean }) {
  const id = "al";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id={`${id}-main`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00e5b8">
            {animated && <animate attributeName="stopColor" values="#00e5b8;#00c8ff;#a855f7;#00e5b8" dur="4s" repeatCount="indefinite" />}
          </stop>
          <stop offset="50%" stopColor="#0ea5e9">
            {animated && <animate attributeName="stopColor" values="#0ea5e9;#8b5cf6;#00e5b8;#0ea5e9" dur="4s" repeatCount="indefinite" />}
          </stop>
          <stop offset="100%" stopColor="#a855f7">
            {animated && <animate attributeName="stopColor" values="#a855f7;#00e5b8;#0ea5e9;#a855f7" dur="4s" repeatCount="indefinite" />}
          </stop>
        </linearGradient>

        <linearGradient id={`${id}-glow`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00e5b8" stopOpacity="0.6">
            {animated && <animate attributeName="stopOpacity" values="0.6;0.9;0.4;0.6" dur="3s" repeatCount="indefinite" />}
          </stop>
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0.6">
            {animated && <animate attributeName="stopOpacity" values="0.6;0.3;0.8;0.6" dur="3s" repeatCount="indefinite" />}
          </stop>
        </linearGradient>

        <filter id={`${id}-f1`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>

        <filter id={`${id}-f2`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Outer rotating arc */}
      <circle cx="50" cy="50" r="44"
        stroke={`url(#${id}-glow)`} strokeWidth="1.5"
        fill="none" strokeDasharray="60 80" strokeLinecap="round"
        filter={`url(#${id}-f1)`}>
        {animated && (
          <animateTransform attributeName="transform" type="rotate"
            from="0 50 50" to="360 50 50" dur="8s" repeatCount="indefinite" />
        )}
      </circle>

      {/* Inner counter-rotating arc */}
      <circle cx="50" cy="50" r="38"
        stroke={`url(#${id}-main)`} strokeWidth="1"
        fill="none" strokeDasharray="30 50" strokeLinecap="round" opacity="0.5">
        {animated && (
          <animateTransform attributeName="transform" type="rotate"
            from="360 50 50" to="0 50 50" dur="12s" repeatCount="indefinite" />
        )}
      </circle>

      {/* Background circle */}
      <circle cx="50" cy="50" r="34" fill="#060612" />
      <circle cx="50" cy="50" r="32" fill={`url(#${id}-main)`} opacity="0.12" />

      {/* Letter A */}
      <path d="M32 68 L50 28 L68 68"
        stroke={`url(#${id}-main)`} strokeWidth="5.5"
        strokeLinecap="round" strokeLinejoin="round"
        fill="none" filter={`url(#${id}-f2)`} />
      {/* A crossbar */}
      <line x1="38" y1="52" x2="62" y2="52"
        stroke={`url(#${id}-main)`} strokeWidth="4"
        strokeLinecap="round" filter={`url(#${id}-f2)`} />

      {/* Orbiting + sign */}
      {animated && (
        <g filter={`url(#${id}-f1)`}>
          <animateTransform attributeName="transform" type="rotate"
            from="0 50 50" to="360 50 50" dur="5s" repeatCount="indefinite" />
          {/* Vertical bar of + */}
          <line x1="50" y1="3" x2="50" y2="9"
            strokeWidth="2" strokeLinecap="round">
            <animate attributeName="stroke" values="#00e5b8;#0ea5e9;#a855f7;#00e5b8" dur="5s" repeatCount="indefinite" />
          </line>
          {/* Horizontal bar of + */}
          <line x1="47" y1="6" x2="53" y2="6"
            strokeWidth="2" strokeLinecap="round">
            <animate attributeName="stroke" values="#00e5b8;#0ea5e9;#a855f7;#00e5b8" dur="5s" repeatCount="indefinite" />
          </line>
        </g>
      )}
    </svg>
  );
}
