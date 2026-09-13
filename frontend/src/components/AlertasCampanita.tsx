import { useEffect, useRef, useState } from "react";
import { listarAlertas, marcarAlertaLeida, type AlertaAdmin } from "../api";
import { IconBell, IconCheck } from "../Icons";

const ETIQUETA_TIPO: Record<AlertaAdmin["tipo"], { label: string; clase: string }> = {
  DESCUADRE_CAJA: { label: "Descuadre de caja", clase: "bg-red-500/15 text-red-600 dark:text-red-300" },
  CUENTA_POR_VENCER: { label: "Por vencer", clase: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  CUENTA_VENCIDA: { label: "Vencida", clase: "bg-red-500/15 text-red-600 dark:text-red-300" },
};

function formatearFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-VE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

/**
 * Campanita de alertas silenciosas (descuadres de caja, CXC/CXP por vencer o vencidas — ver
 * AlertaAdmin en el backend). Refresca al abrir el panel y cada 5 minutos mientras está montada
 * — no hay push real todavía, así que esto es lo que hace que el dueño se entere sin tener que
 * ir a buscarlo a propósito.
 *
 * Solo trae NO leídas (soloNoLeidas=true): el backend no pagina
 * findByTenantIdOrderByFechaCreacionDesc, así que traer el historial completo crecería sin
 * límite con los meses. Marcar como leída saca la alerta de la lista en vez de solo atenuarla.
 */
export default function AlertasCampanita({ tenantId }: { tenantId: number }) {
  const [alertas, setAlertas] = useState<AlertaAdmin[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  const cargar = () => {
    setCargando(true);
    listarAlertas(tenantId, true)
      .then(setAlertas)
      .catch(() => {
        // Silencioso a propósito: una campanita que falla no debe tapar el resto del Hub con un error.
      })
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargar();
    const intervalo = setInterval(cargar, 5 * 60 * 1000);
    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  useEffect(() => {
    function alHacerClicAfuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", alHacerClicAfuera);
    return () => document.removeEventListener("mousedown", alHacerClicAfuera);
  }, []);

  const marcarLeida = async (id: number) => {
    // Optimista: la lista solo trae no-leídas, así que marcarla como leída es sacarla de la
    // vista directamente. Si el PATCH falla, la próxima recarga (5 min o abrir de nuevo) la
    // vuelve a traer.
    setAlertas((prev) => prev.filter((a) => a.id !== id));
    try {
      await marcarAlertaLeida(id, tenantId);
    } catch {
      cargar();
    }
  };

  return (
    <div className="relative" ref={contenedorRef}>
      <button
        onClick={() => setAbierto((v) => !v)}
        className="relative apple-glass-btn w-9 h-9 rounded-full flex items-center justify-center text-slate-600 dark:text-white/70 hover:text-teal-600 dark:hover:text-teal-300 border border-slate-300/60 dark:border-white/15 transition-colors cursor-pointer"
        title="Alertas"
      >
        <IconBell size={17} />
        {alertas.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {alertas.length > 9 ? "9+" : alertas.length}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-2xl border border-slate-300/60 dark:border-white/15 bg-white dark:bg-slate-900 shadow-xl z-50">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
            <span className="font-bold text-sm text-slate-800 dark:text-white">Alertas</span>
            {cargando && <span className="text-[11px] text-slate-400">Actualizando…</span>}
          </div>

          {alertas.length === 0 && !cargando && (
            <div className="px-4 py-8 text-center text-sm text-slate-400 dark:text-white/40">
              Sin alertas pendientes.
            </div>
          )}

          <ul>
            {alertas.map((alerta) => {
              const etiqueta = ETIQUETA_TIPO[alerta.tipo] ?? { label: alerta.tipo, clase: "bg-slate-500/15 text-slate-600" };
              return (
                <li key={alerta.id} className="px-4 py-3 border-b border-slate-100 dark:border-white/5 flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mb-1 ${etiqueta.clase}`}>
                      {etiqueta.label}
                    </span>
                    <p className="text-xs text-slate-700 dark:text-white/80 leading-snug">{alerta.mensaje}</p>
                    <p className="text-[10px] text-slate-400 dark:text-white/35 mt-1">{formatearFecha(alerta.fechaCreacion)}</p>
                  </div>
                  <button
                    onClick={() => marcarLeida(alerta.id)}
                    className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-teal-500 hover:bg-teal-500/10 transition-colors cursor-pointer"
                    title="Marcar como leída"
                  >
                    <IconCheck size={12} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
