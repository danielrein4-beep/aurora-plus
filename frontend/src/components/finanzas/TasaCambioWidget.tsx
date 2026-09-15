import React, { useEffect, useState } from 'react';
import { actualizarTasaExterna, ApiError, obtenerTasaVigente, TasaCambioResponse, FuenteTasaCambio } from '../../api';
import { IconRefresh } from '../../Icons';

const FUENTES: { id: FuenteTasaCambio; label: string }[] = [
  { id: 'BCV', label: 'BCV oficial' },
  { id: 'BINANCE', label: 'Binance P2P' }
];

// Refresca la tasa USD/VES desde una fuente pública real (BCV o Binance P2P) con un clic —
// ninguna de las dos la controla el negocio. Nunca se muestra un valor inventado: si la
// consulta falla, se ve el error real y se conserva la última tasa registrada.
export const TasaCambioWidget: React.FC = () => {
  const [tasa, setTasa] = useState<TasaCambioResponse | null>(null);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState<FuenteTasaCambio | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargarVigente = async () => {
    setCargando(true);
    try {
      setTasa(await obtenerTasaVigente('USD', 'VES'));
    } catch {
      // Sin tasa vigente registrada aún: se trata como estado vacío, no como error.
      setTasa(null);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void cargarVigente();
  }, []);

  const handleActualizar = async (fuente: FuenteTasaCambio) => {
    setActualizando(fuente);
    setError(null);
    try {
      const nueva = await actualizarTasaExterna(fuente, 'VES');
      setTasa(nueva);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'No fue posible actualizar la tasa.');
    } finally {
      setActualizando(null);
    }
  };

  return (
    <div className="bg-[#0b2341] border border-white/10 rounded-2xl p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-white">Tasa de Cambio USD / VES</h4>
          <p className="text-xs text-white/60 mt-0.5">
            Cifra pública que se actualiza seguido — ninguna de las dos la define el negocio. Tráela en vivo desde el BCV o Binance P2P.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {FUENTES.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => void handleActualizar(f.id)}
              disabled={actualizando !== null}
              className="flex items-center gap-1.5 rounded-lg border border-[#35d7c3]/40 bg-[#35d7c3]/15 px-3 py-2 text-xs font-semibold text-[#35d7c3] transition-colors hover:bg-[#35d7c3]/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <IconRefresh size={14} className={actualizando === f.id ? 'animate-spin' : ''} />
              {actualizando === f.id ? 'Consultando…' : `Actualizar desde ${f.label}`}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/10">
        {cargando ? (
          <p className="text-xs text-white/50">Consultando tasa vigente…</p>
        ) : error ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
            {error}
          </div>
        ) : tasa ? (
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-2xl font-bold font-['IBM_Plex_Mono',monospace] text-white">
              {tasa.tasa.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} Bs.
            </span>
            <span className="text-xs text-white/50 font-['IBM_Plex_Mono',monospace]">
              1 USD · fuente {tasa.origenApi} · {new Date(tasa.fechaActualizacion).toLocaleString('es-VE')}
            </span>
            {tasa.obsoleta && (
              <span className="text-[10px] uppercase tracking-wide font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded">
                Sin refrescar hace más de 24h
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs text-white/50">Aún no hay una tasa USD/VES registrada para este negocio.</p>
        )}
      </div>
    </div>
  );
};
