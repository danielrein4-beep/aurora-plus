import React from 'react';
import { AccountingEntry } from './types';

interface DetalleContableModalProps {
  entry: AccountingEntry | null;
  onClose: () => void;
}

export const DetalleContableModal: React.FC<DetalleContableModalProps> = ({
  entry,
  onClose
}) => {
  if (!entry) return null;

  const totalDebit = entry.lines.reduce((acc, curr) => acc + curr.debit, 0);
  const totalCredit = entry.lines.reduce((acc, curr) => acc + curr.credit, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-[#0b2341] border border-[#00FFC2]/30 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="p-5 bg-[#071a2e] border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#00FFC2]/15 text-[#00FFC2] border border-[#00FFC2]/30">
                {entry.id}
              </span>
              <h3 className="text-base font-semibold text-white">
                Comprobante de Diario Contable
              </h3>
            </div>
            <p className="text-xs text-white/60 mt-1">
              Ref: <span className="text-white font-medium">{entry.referenceDoc}</span> • Fecha: {entry.date}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center text-lg transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Descripción de Negocio */}
        <div className="p-4 bg-white/[0.02] border-b border-white/5 text-xs text-white/80">
          <span className="font-semibold text-white">Glosa de la Operación: </span>
          {entry.description}
        </div>

        {/* Tabla Partida Doble */}
        <div className="overflow-y-auto p-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-white/50 text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Cuenta PUC</th>
                <th className="py-2.5 px-3">Nombre de Cuenta</th>
                <th className="py-2.5 px-3 text-right">Debe (USD)</th>
                <th className="py-2.5 px-3 text-right">Haber (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {entry.lines.map((line, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-3 text-[#00FFC2]">{line.accountCode}</td>
                  <td className="py-3 px-3 font-sans text-white">{line.accountName}</td>
                  <td className="py-3 px-3 text-right text-white">
                    {line.debit > 0 ? `$${line.debit.toFixed(2)}` : '-'}
                  </td>
                  <td className="py-3 px-3 text-right text-white">
                    {line.credit > 0 ? `$${line.credit.toFixed(2)}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-white/20 font-bold text-white bg-white/[0.04]">
                <td colSpan={2} className="py-3 px-3 font-sans text-right">
                  Totales Cuadrados:
                </td>
                <td className="py-3 px-3 text-right text-emerald-400">
                  ${totalDebit.toFixed(2)}
                </td>
                <td className="py-3 px-3 text-right text-emerald-400">
                  ${totalCredit.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Pie de modal */}
        <div className="p-4 bg-[#071a2e] border-t border-white/10 flex items-center justify-between">
          <span className="text-[11px] text-white/50 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Principio contable de partida doble cumplido (Debe = Haber)
          </span>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all cursor-pointer"
          >
            Cerrar Inspección
          </button>
        </div>
      </div>
    </div>
  );
};
