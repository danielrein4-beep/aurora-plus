import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Cambiar a modo ${isDark ? "claro" : "oscuro"}`}
      className={`relative inline-flex items-center select-none cursor-pointer focus:outline-none transition-transform duration-300 active:scale-95 group ${className}`}
    >
      {/* Pista de la Cápsula (Track) */}
      <div
        className={`w-[110px] h-[38px] rounded-full flex items-center justify-between px-3.5 transition-all duration-500 backdrop-blur-xl relative overflow-hidden ${
          isDark
            ? "bg-[#161826]/90 border border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6),0_4px_16px_rgba(0,0,0,0.4)]"
            : "bg-[#d8dde6]/90 border border-white/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.08)]"
        }`}
      >
        {/* Texto "Dark" a la izquierda */}
        <span
          className={`font-['Outfit'] text-[13px] font-semibold tracking-wide transition-all duration-500 z-0 ${
            isDark
              ? "text-slate-300 opacity-100 translate-x-0"
              : "text-transparent opacity-0 -translate-x-2"
          }`}
        >
          Dark
        </span>

        {/* Texto "Light" a la derecha */}
        <span
          className={`font-['Outfit'] text-[13px] font-semibold tracking-wide ml-auto transition-all duration-500 z-0 ${
            !isDark
              ? "text-slate-700 opacity-100 translate-x-0"
              : "text-transparent opacity-0 translate-x-2"
          }`}
        >
          Light
        </span>

        {/* Sutil resplandor interno de la pista */}
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${
            isDark
              ? "bg-gradient-to-r from-purple-500/10 via-transparent to-teal-500/10 opacity-60"
              : "bg-gradient-to-r from-amber-500/10 via-transparent to-sky-500/10 opacity-60"
          }`}
        />
      </div>

      {/* Lente Circular de Cristal Líquido 3D (Magnifying Glass Droplet Knob) */}
      <div
        className={`absolute top-1/2 -translate-y-1/2 w-[46px] h-[46px] rounded-full transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) flex items-center justify-center pointer-events-none ${
          isDark
            ? "left-[64px] bg-gradient-to-br from-white/20 via-white/5 to-white/10 border border-white/30 backdrop-blur-2xl shadow-[0_8px_20px_rgba(0,0,0,0.7),inset_0_2px_4px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(0,0,0,0.4)]"
            : "left-0 bg-gradient-to-br from-white/95 via-white/70 to-white/80 border border-white/90 backdrop-blur-2xl shadow-[0_6px_18px_rgba(0,0,0,0.18),inset_0_2px_4px_rgba(255,255,255,1),inset_0_-2px_4px_rgba(0,0,0,0.06)]"
        }`}
      >
        {/* Resplandor Especular del Domo de Cristal */}
        <div className="absolute inset-0.5 rounded-full bg-gradient-to-b from-white/40 via-transparent to-transparent opacity-80 pointer-events-none" />

        {/* Icono Luna (Modo Oscuro) */}
        <div
          className={`transition-all duration-500 absolute flex items-center justify-center ${
            isDark
              ? "opacity-100 scale-100 rotate-0"
              : "opacity-0 scale-50 rotate-90"
          }`}
        >
          <svg className="w-5 h-5 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.85)]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21.64 13a1 1 0 0 0-1.05-.14 8.05 8.05 0 0 1-3.37.73A8.15 8.15 0 0 1 9.08 5.49a8.59 8.59 0 0 1 .25-2A1 1 0 0 0 8 2.36a10.14 10.14 0 1 0 14 11.69 1 1 0 0 0-.36-1.05z" />
          </svg>
        </div>

        {/* Icono Sol con Rayos (Modo Claro) */}
        <div
          className={`transition-all duration-500 absolute flex items-center justify-center ${
            !isDark
              ? "opacity-100 scale-100 rotate-0"
              : "opacity-0 scale-50 -rotate-90"
          }`}
        >
          <svg className="w-5 h-5 text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" fill="#f59e0b" stroke="none" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
          </svg>
        </div>
      </div>
    </button>
  );
}
