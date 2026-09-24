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
    <div className="bg-white border border-[#E5E5EA] rounded-2xl p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-[#1D1D1F]">Tasa de Cambio USD / VES</h4>
          <p className="text-xs text-[#86868B] mt-0.5">
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
              className="flex items-center gap-1.5 rounded-full border border-[#E5E5EA] bg-[#F5F5F7] px-3 py-2 text-xs font-semibold text-[#177E89] transition-colors hover:bg-[#E5E5EA] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <IconRefresh size={14} className={actualizando === f.id ? 'animate-spin' : ''} />
              {actualizando === f.id ? 'Consultando…' : `Actualizar desde ${f.label}`}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-[#E5E5EA]">
        {cargando ? (
          <p className="text-xs text-[#86868B]">Consultando tasa vigente…</p>
        ) : error ? (
          <div className="rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/5 p-3 text-xs text-[#DC2626]">
            {error}
          </div>
        ) : tasa ? (
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-2xl font-bold text-[#1D1D1F]">
              {tasa.tasa.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} Bs.
            </span>
            <span className="text-xs text-[#86868B]">
              1 USD · fuente {tasa.origenApi} · {new Date(tasa.fechaActualizacion).toLocaleString('es-VE')}
            </span>
            {tasa.obsoleta && (
              <span className="text-[10px] uppercase tracking-wide font-semibold text-[#DC2626] bg-[#DC2626]/10 border border-[#DC2626]/30 px-1.5 py-0.5 rounded-full">
                Sin refrescar hace más de 24h
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs text-[#86868B]">Aún no hay una tasa USD/VES registrada para este negocio.</p>
        )}
      </div>
    </div>
  );
};
