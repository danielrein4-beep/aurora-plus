import React from 'react';
import { CostItem } from './types';

interface CostosFinancieroProps {
  costs: CostItem[];
}

export const CostosFinanciero: React.FC<CostosFinancieroProps> = ({ costs }) => {
  const formatUsd = (val: number) => `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatVes = (val: number) => `Bs. ${val.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const totalCostsUsd = costs.reduce((acc, c) => acc + c.amountUsd, 0);
  const totalCostsVes = costs.reduce((acc, c) => acc + c.amountVes, 0);

  return (
    <div className="space-y-6">
      {/* Alerta de Costeo Incompleto / Contexto de Escandallo */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4.5 flex items-start gap-3.5 backdrop-blur-md">
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400 font-bold">
          !
        </div>
        <div>
          <h4 className="text-sm font-semibold text-amber-300">
            Aviso de Costeo: Artículos o Recetas sin Escandallo Completo
          </h4>
          <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
            Si algún plato o producto de tu inventario tiene costo en $0.00 (por ejemplo, recetas sin ingredientes asociados o pendientes por recalcular), el margen comercial real podría ser inferior al estimado aquí. Aurora Plus te avisa para que no tomes decisiones con costos ciegos.
          </p>
        </div>
      </div>

      {/* Resumen de Estructura de Costos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 bg-[#0b2341]/80 border border-white/10 rounded-2xl p-5 backdrop-blur-xl flex flex-col justify-between shadow-lg">
          <div>
            <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              Total Costos y Gastos Operativos
            </span>
            <div className="text-3xl font-extrabold text-white mt-2">
              {formatUsd(totalCostsUsd)}
            </div>
            <div className="text-xs font-mono text-[#00FFC2] mt-0.5">
              {formatVes(totalCostsVes)}
            </div>
            <p className="text-xs text-white/60 mt-3 leading-relaxed">
              Representa el 64.0% de las ventas brutas del mes. Mantener los costos directos de materia prima por debajo del 35% es clave para la rentabilidad de tu negocio gastronómico o comercial.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 space-y-2">
            <div className="flex justify-between text-xs text-white/70">
              <span>Costo Materia Prima:</span>
              <span className="font-semibold text-white">51.0%</span>
            </div>
            <div className="flex justify-between text-xs text-white/70">
              <span>Nómina Operativa:</span>
              <span className="font-semibold text-white">27.4%</span>
            </div>
            <div className="flex justify-between text-xs text-white/70">
              <span>Gastos Fijos & Servicios:</span>
              <span className="font-semibold text-white">21.6%</span>
            </div>
          </div>
        </div>

        {/* Desglose de Categorías de Costo */}
        <div className="lg:col-span-2 bg-[#0b2341]/80 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-lg">
          <h3 className="text-base font-semibold text-white mb-1">
            Desglose por Categoría de Costo
          </h3>
          <p className="text-xs text-white/60 mb-5">
            Entiende exactamente en qué se va el dinero operativo de tu empresa.
          </p>

          <div className="space-y-4">
            {costs.map((item) => (
              <div key={item.id} className="bg-[#071a2e]/70 border border-white/5 p-4 rounded-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div>
                    <span className="text-xs font-semibold text-white">
                      {item.category}
                    </span>
                    {item.isEstimated && (
                      <span className="ml-2 text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded">
                        Estimado
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold text-white">
                      {formatUsd(item.amountUsd)}
                    </span>
                    <span className="text-xs text-white/50 ml-2">
                      ({item.percentageOfTotal}%)
                    </span>
                  </div>
                </div>

                <div className="w-full bg-white/5 rounded-full h-2 mb-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      item.isEstimated ? 'bg-amber-400' : 'bg-[#00FFC2]'
                    }`}
                    style={{ width: `${item.percentageOfTotal}%` }}
                  />
                </div>

                {item.missingDataWarning && (
                  <p className="text-[11px] text-amber-300/80 mt-1 flex items-center gap-1">
                    <span>⚠</span> {item.missingDataWarning}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
