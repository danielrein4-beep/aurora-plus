import { useNavigate } from "react-router-dom";
import AuroraLogo from "../AuroraLogo";
import { AuroraGradientDef } from "../Icons";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout, trialDaysLeft } = useAuth();

  const daysLeft = trialDaysLeft;
  const pct = Math.round((daysLeft / 30) * 100);

  return (
    <div className="min-h-full bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-500 relative overflow-hidden">
      <AuroraGradientDef />

      <div className="absolute inset-0 pointer-events-none">
        <div className="blob1 absolute -top-48 -left-48 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(0,229,184,0.10) 0%, transparent 70%)" }} />
        <div className="blob2 absolute top-1/2 -right-48 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(168,85,247,0.09) 0%, transparent 70%)" }} />
      </div>

      {/* Top bar */}
      <header className="nav-glass border-b border-slate-200/60 dark:border-white/5 px-4 sm:px-6 h-16 flex items-center justify-between relative transition-colors duration-500">
        <div className="flex items-center gap-3">
          <AuroraLogo size={32} animated />
          <span className="font-['Outfit'] font-bold text-aurora text-sm">Aurora Plus</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-teal-600 dark:text-teal-300 text-xs font-semibold">{daysLeft} días de prueba</span>
          </div>
          <button className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-700 dark:text-white text-xs font-bold border border-teal-500/30">
            {user?.nombre?.charAt(0).toUpperCase() ?? "U"}
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 relative">

        {/* Welcome */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl g-aurora flex items-center justify-center text-3xl glow-teal shadow-lg">🎉</div>
          </div>
          <h1 className="font-['Outfit'] font-black text-4xl sm:text-5xl text-slate-900 dark:text-white mb-3">
            ¡Bienvenido{user?.nombre ? `, ${user.nombre.split(" ")[0]}` : ""}! <span className="text-aurora">Aurora Plus</span>
          </h1>
          <p className="text-slate-500 dark:text-white/45 text-base max-w-lg mx-auto leading-relaxed">
            Tu licencia gratuita está activa. Tienes <strong className="text-teal-600 dark:text-teal-400">{daysLeft} días</strong> para explorar todo el sistema sin límites.
          </p>
        </div>

        {/* Trial progress */}
        <div className="apple-glass rounded-2xl p-6 mb-6 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-700 dark:text-white/60 text-sm font-semibold">Período de prueba gratuita</span>
            <span className="text-teal-600 dark:text-teal-400 text-sm font-bold">{daysLeft} días restantes</span>
          </div>
          <div className="h-2.5 bg-slate-200/80 dark:bg-white/5 rounded-full overflow-hidden">
            <div className="h-full g-aurora rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-400 dark:text-white/25">
            <span>Inicio</span>
            <span>Vence en 30 días</span>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { icon: "⚙️", title: "Configurar módulos",   desc: "Personaliza tu sistema",           action: "Configurar" },
            { icon: "👥", title: "Invitar usuarios",      desc: "Agrega a tu equipo",               action: "Invitar" },
            { icon: "📊", title: "Ver tutoriales",        desc: "Aprende a usar la plataforma",      action: "Ver guías" },
          ].map((item) => (
            <div key={item.title} className="apple-glass rounded-2xl p-5 hover-card card-shadow shadow-md">
              <div className="text-2xl mb-3">{item.icon}</div>
              <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-sm mb-1">{item.title}</h3>
              <p className="text-slate-500 dark:text-white/35 text-xs mb-4">{item.desc}</p>
              <button className="text-teal-600 dark:text-teal-400 hover:text-teal-500 dark:hover:text-teal-300 text-xs font-semibold transition-colors cursor-pointer">{item.action} →</button>
            </div>
          ))}
        </div>

        {/* Plan upgrade prompt */}
        <div className="relative apple-glass border border-teal-500/30 rounded-2xl p-6 sm:p-8 overflow-hidden shadow-xl">
          <div className="absolute inset-x-0 top-0 h-px line-aurora" />
          <div className="absolute inset-0 opacity-15"
            style={{ background: "radial-gradient(ellipse at 80% 50%, rgba(0,229,184,0.3) 0%, transparent 55%)" }} />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div>
              <p className="text-xs font-semibold tracking-widest text-teal-600 dark:text-teal-400 uppercase mb-1">Cuando termines de probar</p>
              <h3 className="font-['Outfit'] font-bold text-xl text-slate-900 dark:text-white mb-1">Elige el plan que mejor se adapte a ti</h3>
              <p className="text-slate-500 dark:text-white/40 text-sm">Desde <strong className="text-slate-900 dark:text-white/70">$25/mes</strong>. Sin contratos ni cobros automáticos.</p>
            </div>
            <button
              onClick={() => navigate("/precios")}
              className="g-aurora text-white font-semibold px-6 py-3 rounded-xl text-sm hover:opacity-90 transition-opacity flex-shrink-0 shadow-md cursor-pointer">
              Ver planes →
            </button>
          </div>
        </div>

        <p className="text-center text-slate-400 dark:text-white/20 text-xs mt-8">
          ¿Necesitas ayuda? <span className="text-teal-600 dark:text-teal-400 font-semibold cursor-pointer hover:underline" onClick={() => navigate("/nosotros")}>Contáctanos →</span>
        </p>
      </div>
    </div>
  );
}
