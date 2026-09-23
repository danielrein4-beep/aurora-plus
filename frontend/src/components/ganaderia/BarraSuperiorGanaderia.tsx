import { IconFileText, IconEdit, IconSettings } from "../../Icons";
import ThemeToggle from "../ThemeToggle";
import type { MonedasConfig } from "./tipos";

interface Props {
  estaOnline: boolean;
  monedasConfig: MonedasConfig;
  pendientesOffline: number;
  precioLecheUSD: number;
  sincronizandoOffline: boolean;
  tasaBCV: number;
  tasaCOP: number;
  handleSincronizarManual: () => void;
  setModalDatosFiscales: (abierto: boolean) => void;
  setModalEditarPrecioLeche: (abierto: boolean) => void;
  setModalEditarTasas: (abierto: boolean) => void;
  setSidebarAbierto: (abierto: boolean) => void;
}

/** Barra superior: conexión y cola offline, tasas y monedas, precio de la leche, datos fiscales y tema. */
export default function BarraSuperiorGanaderia({
  estaOnline, monedasConfig, pendientesOffline, precioLecheUSD, sincronizandoOffline, tasaBCV,
  tasaCOP, handleSincronizarManual, setModalDatosFiscales, setModalEditarPrecioLeche,
  setModalEditarTasas, setSidebarAbierto,
}: Props) {
  return (
    <>
  <header className="nav-glass border-b border-slate-300/60 dark:border-white/10 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between lg:justify-end gap-3 sticky top-0 z-30 backdrop-blur-2xl">
    <button
      onClick={() => setSidebarAbierto(true)}
      className="lg:hidden p-2 -ml-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
      aria-label="Abrir menú"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>

            {/* Barra de Tasas Multi-Moneda & Precio Leche Centralizado */}
    <div className="flex flex-wrap items-center gap-2 min-w-0">
      {/* Badge Modo Campo / Sincronizacion Offline */}
      <button
        type="button"
        onClick={handleSincronizarManual}
        disabled={sincronizandoOffline || pendientesOffline === 0}
        title={pendientesOffline > 0 ? "Haga clic para sincronizar cambios locales con el servidor" : "Conexion activa con el servidor"}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all shadow-sm ${
          !estaOnline || pendientesOffline > 0
            ? "bg-amber-500/15 border-amber-500/40 text-amber-500 dark:text-amber-400 hover:bg-amber-500/25 cursor-pointer"
            : "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400"
        }`}
      >
        <span className={`w-2 h-2 rounded-full ${
          !estaOnline ? "bg-amber-400 animate-pulse" : (pendientesOffline > 0 ? "bg-amber-400" : "bg-emerald-400")
        }`}></span>
        <span>
          {!estaOnline 
            ? `Modo Campo (${pendientesOffline} pend.)`
            : (pendientesOffline > 0 ? `Sincronizar (${pendientesOffline})` : "En Linea")
          }
        </span>
        {pendientesOffline > 0 && (
          <svg className={`w-3.5 h-3.5 ${sincronizandoOffline ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )}
      </button>
      {/* Tasas de cambio */}
      <button
        type="button"
        onClick={() => setModalEditarTasas(true)}
        title="Configurar monedas activas y tasas de cambio de la finca"
        className="flex items-center gap-2 apple-glass-pill rounded-full px-3.5 py-1.5 border border-slate-300/80 dark:border-white/15 text-[11px] hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all cursor-pointer group shadow-sm"
      >
        <span className="text-slate-500 dark:text-white/40 font-medium flex items-center gap-1">
          <span>Monedas:</span>
        </span>
        <span className="font-mono font-bold text-slate-700 dark:text-white">USD</span>
        {monedasConfig.VES && (
          <>
            <span className="text-slate-400 dark:text-white/20">•</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">1$ = Bs. {tasaBCV.toFixed(2)}</span>
          </>
        )}
        {monedasConfig.COP && (
          <>
            <span className="text-slate-400 dark:text-white/20">•</span>
            <span className="font-mono font-bold text-sky-600 dark:text-sky-400">{tasaCOP.toLocaleString()} COP</span>
          </>
        )}
        <span className="opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all"><IconSettings size={13} /></span>
      </button>

      {/* Precio Leche */}
      <button
        type="button"
        onClick={() => setModalEditarPrecioLeche(true)}
        title="Precio centralizado de leche por litro — Haga clic para editar"
        className="flex items-center gap-1.5 apple-glass-pill rounded-full px-3 py-1.5 border border-sky-400/30 text-[11px] hover:border-sky-400/60 hover:bg-sky-500/10 transition-all cursor-pointer group shadow-sm"
      >
        <span className="text-slate-500 dark:text-white/40 font-medium">Leche:</span>
        <span className="font-mono font-bold text-sky-500 dark:text-sky-400">${precioLecheUSD.toFixed(2)}/L</span>
        <span className="opacity-70 group-hover:opacity-100"><IconEdit size={12} /></span>
      </button>

      {/* Datos Fiscales (RIF / Razón Social / Domicilio) para notas de entrega */}
      <button
        type="button"
        onClick={() => setModalDatosFiscales(true)}
        title="Datos fiscales opcionales para tus notas de entrega (RIF, razón social, domicilio)"
        className="flex items-center gap-1.5 apple-glass-pill rounded-full px-3 py-1.5 border border-purple-400/30 text-[11px] hover:border-purple-400/60 hover:bg-purple-500/10 transition-all cursor-pointer group shadow-sm"
      >
        <IconFileText size={13} className="text-purple-500 dark:text-purple-400" />
        <span className="text-slate-500 dark:text-white/40 font-medium">Fiscal</span>
      </button>
    </div>

    <ThemeToggle className="scale-[0.72] origin-right" />
  </header>
    </>
  );
}
