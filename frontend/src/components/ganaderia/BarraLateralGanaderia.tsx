import { IconFileText, IconCalendar, IconChart, IconUsers, IconSyringe, IconMilk, IconPin, IconCow, IconTag, IconScale, IconCoins, IconDashboardGrid, IconUpload, IconClipboardCheck, IconWheat } from "../../Icons";
import type { AnimalGanaderia, PotreroGanaderia, AlertaSanitariaGanaderia } from "../../api";
import type { FormAltaAnimal } from "./ModalAltaAnimal";
import type { ModoVenta } from "./ModalVentaAnimales";
import type { TabGanaderia } from "./tipos";

interface Props {
  alertasSanitarias: AlertaSanitariaGanaderia[];
  animales: AnimalGanaderia[];
  potreros: PotreroGanaderia[];
  puedeImportarHato: boolean;
  sidebarAbierto: boolean;
  tab: TabGanaderia;
  nombreFinca: string;
  /** Solo el dueño ve la bitácora de auditoría. */
  puedeVerAuditoria: boolean;
  /** Mensajes sin leer del Mercado ganadero. */
  sinLeerMercado: number;
  abrirMercado: () => void;
  abrirVaqueraRapida: () => void;
  abrirVentaAnimales: (modo: ModoVenta) => void;
  onSalir: () => void;
  setAltaAnimal: (valores: Partial<FormAltaAnimal> | null) => void;
  setAperturaSoporte: (actualizar: (n: number) => number) => void;
  setModalImportarHato: (abierto: boolean) => void;
  /** Registro rápido del hato con potrero por animal (solo quien puede importar). */
  abrirRegistroRapido?: () => void;
  setSidebarAbierto: (abierto: boolean) => void;
  setTab: (tab: TabGanaderia) => void;
}

/** Menú lateral de Ganadería: identidad de la finca, secciones, acciones rápidas y soporte. */
export default function BarraLateralGanaderia({
  alertasSanitarias, animales, potreros, puedeImportarHato, sidebarAbierto, tab, nombreFinca, puedeVerAuditoria, sinLeerMercado, abrirMercado,
  abrirVaqueraRapida, abrirVentaAnimales, onSalir, setAltaAnimal, setAperturaSoporte,
  setModalImportarHato, abrirRegistroRapido, setSidebarAbierto, setTab,
}: Props) {
  return (
    <>
  {sidebarAbierto && (
    <div
      // Por encima del aviso de la prueba gratis y del botón de soporte; touch-none evita que
      // en el iPhone se desplace la página de atrás al tocar el fondo oscuro.
      className="fixed inset-0 z-[70] bg-black/50 lg:hidden touch-none"
      onClick={() => setSidebarAbierto(false)}
      aria-hidden="true"
    />
  )}
  <aside
    className={`w-64 flex-shrink-0 h-screen flex flex-col bg-[#fcfdfd] border-r border-slate-200 shadow-none fixed inset-y-0 left-0 z-[80] transform transition-transform duration-200 ease-out lg:static lg:translate-x-0 ${
      sidebarAbierto ? "translate-x-0" : "-translate-x-full"
    }`}
  >
    {/* Identidad de la finca — mismo patrón institucional que Comercio (A+ de respaldo, sin íconos de rubro). */}
    <button
      onClick={onSalir}
      className="flex items-center gap-3 text-left group cursor-pointer px-5 py-4 border-b border-slate-200"
      title="Volver al inicio de Aurora"
    >
      <div className="w-10 h-10 rounded-md border border-slate-200 bg-white text-slate-700 flex items-center justify-center overflow-hidden group-hover:border-teal-300 transition-colors flex-shrink-0">
        <span className="font-semibold tracking-[-0.06em] text-sm" aria-label="Aurora Plus">A+</span>
      </div>
      <div className="min-w-0">
        <div className="font-['IBM_Plex_Sans'] font-semibold text-sm text-slate-900 leading-tight tracking-tight truncate">
          {nombreFinca}
        </div>
        <div className="text-[10px] text-slate-400 tracking-[0.02em] truncate font-medium mt-1">
          Ganadería by <span className="font-semibold text-slate-600">A+</span>
        </div>
      </div>
    </button>

    <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-5 space-y-6">
      {/* Mercado ganadero: arriba y destacado, no escondido entre las acciones rápidas. */}
      <button
        type="button"
        onClick={() => { abrirMercado(); setSidebarAbierto(false); }}
        title="Compra y venta de ganado entre fincas de Aurora"
        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50 hover:from-teal-100 hover:to-emerald-100 hover:border-teal-300 text-left cursor-pointer transition-colors"
      >
        <span className="w-8 h-8 rounded-lg bg-teal-700 text-[#ffffff] flex items-center justify-center flex-shrink-0"><IconCow size={16} /></span>
        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-[13px] text-teal-900">Mercado ganadero</span>
          <span className="block text-[11px] text-teal-700/80">Compra y vende entre fincas</span>
        </span>
        {sinLeerMercado > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500 text-[#ffffff]" title="Mensajes sin leer">{sinLeerMercado}</span>
        )}
      </button>

      {([
        {
          titulo: "Operación",
          items: [
            { id: "resumen" as const, Icon: IconDashboardGrid, etiqueta: "Panel General", badge: 0 },
            { id: "inventario" as const, Icon: IconCow, etiqueta: "Hato & Inventario", badge: 0 },
            { id: "potreros" as const, Icon: IconPin, etiqueta: "Potreros", badge: 0 },
            { id: "alimentacion" as const, Icon: IconWheat, etiqueta: "Alimento y sal", badge: 0 },
            { id: "engorde" as const, Icon: IconScale, etiqueta: "Engorde (GDP)", badge: 0 },
            { id: "sociedades" as const, Icon: IconUsers, etiqueta: "Ceba en sociedad", badge: 0 },
            { id: "produccion" as const, Icon: IconMilk, etiqueta: "Producción de leche", badge: 0 },
          ],
        },
        {
          titulo: "Control",
          items: [
            { id: "sanidad" as const, Icon: IconSyringe, etiqueta: "Sanidad & Trazabilidad", badge: alertasSanitarias.length },
            { id: "eventos" as const, Icon: IconCalendar, etiqueta: "Centro de Eventos", badge: 0 },
            { id: "reportes" as const, Icon: IconChart, etiqueta: "Finanzas y reportes", badge: 0 },
            { id: "personal" as const, Icon: IconClipboardCheck, etiqueta: "Personal y nómina", badge: 0 },
            ...(puedeVerAuditoria ? [{ id: "auditoria" as const, Icon: IconFileText, etiqueta: "Bitácora de Auditoría", badge: 0 }] : []),
          ],
        },
      ]).map((grupo) => (
        <div key={grupo.titulo} className="space-y-1.5">
          <div className="px-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {grupo.titulo}
          </div>
          {grupo.items.map((item) => (
            <button
              key={item.id}
              onClick={() => { setTab(item.id); setSidebarAbierto(false); }}
              className={`sidebar-glare w-full flex items-center gap-3 border-l-2 px-3 py-2.5 rounded-md font-medium text-[13px] transition-colors cursor-pointer ${
                tab === item.id
                  ? "sidebar-glare--active bg-teal-50/80 text-teal-900 border-teal-700"
                  : "text-slate-800 border-transparent hover:bg-slate-100/70 hover:text-slate-900"
              }`}
            >
              <span className={tab === item.id ? "text-teal-700" : "text-slate-500"}><item.Icon size={15} /></span>
              <span className="flex-1 text-left">{item.etiqueta}</span>
              {item.badge > 0 && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      ))}

      {/* Acciones rápidas de campo */}
      <div className="pt-3 mt-3 border-t border-slate-100 space-y-1">
        <div className="px-3 pb-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Acciones rápidas
        </div>
        <button
          type="button"
          onClick={() => { abrirVaqueraRapida(); setSidebarAbierto(false); }}
          className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg font-semibold text-[13px] cursor-pointer text-slate-800 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <span className="text-slate-400"><IconMilk size={16} /></span>
          <span className="flex-1 text-left">Ordeño rápido</span>
        </button>
        {abrirRegistroRapido && (
          <button
            type="button"
            onClick={() => { abrirRegistroRapido(); setSidebarAbierto(false); }}
            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg font-semibold text-[13px] cursor-pointer text-slate-800 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <span className="text-slate-400"><IconTag size={16} /></span>
            <span className="flex-1 text-left">Registrar mi ganado</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => { setAltaAnimal({}); setSidebarAbierto(false); }}
          className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg font-semibold text-[13px] cursor-pointer text-slate-800 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <span className="text-slate-400"><IconTag size={16} /></span>
          <span className="flex-1 text-left">Alta de animal</span>
        </button>
        <button
          type="button"
          onClick={() => { abrirVentaAnimales("MULTIPLE"); setSidebarAbierto(false); }}
          className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg font-semibold text-[13px] cursor-pointer text-slate-800 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <span className="text-slate-400"><IconCoins size={16} /></span>
          <span className="flex-1 text-left">Vender animales</span>
        </button>
        {puedeImportarHato && (
          <button
            type="button"
            onClick={() => { setModalImportarHato(true); setSidebarAbierto(false); }}
            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg font-semibold text-[13px] cursor-pointer text-slate-800 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <span className="text-slate-400"><IconUpload size={16} /></span>
            <span className="flex-1 text-left">Importar hato</span>
          </button>
        )}
      </div>
    </nav>

    {/* Soporte: tickets con el equipo de Aurora (super admin) */}
    <div className="px-3 pt-3 border-t border-slate-100">
      <button
        type="button"
        onClick={() => { setAperturaSoporte(n => n + 1); setSidebarAbierto(false); }}
        title="Solicitar ayuda al equipo de Aurora y ver tus tickets"
        className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg font-semibold text-[13px] cursor-pointer text-slate-800 hover:bg-slate-50 hover:text-slate-900 transition-colors"
      >
        <span className="text-slate-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </span>
        <span className="flex-1 text-left">Soporte</span>
      </button>
    </div>

    {/* Salir al Hub */}
    <div className="p-4 border-t border-slate-100">
      <button
        onClick={onSalir}
        className="w-full text-xs font-semibold px-2.5 py-2 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer text-left"
      >
        ← Volver a Aurora
      </button>
    </div>
  </aside>
    </>
  );
}
