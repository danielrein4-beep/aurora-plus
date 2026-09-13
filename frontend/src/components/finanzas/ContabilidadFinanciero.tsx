import React, { useState } from 'react';
import { AccountingEntry } from './types';

interface ContabilidadFinancieroProps {
  sampleEntry: AccountingEntry;
  onViewEntryDetails: (entry: AccountingEntry) => void;
}

export const ContabilidadFinanciero: React.FC<ContabilidadFinancieroProps> = ({
  sampleEntry,
  onViewEntryDetails
}) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  return (
    <div className="space-y-6">
      {/* Explicación de Contabilidad para Dueños sin Jerga */}
      <div className="bg-[#0b2341]/80 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base">🧭</span>
              <h3 className="text-base font-semibold text-white">
                Contabilidad en Lenguaje Simple
              </h3>
            </div>
            <p className="text-xs text-white/65 mt-1">
              ¿De dónde vino el dinero y en qué se transformó? Aurora Plus registra cada operación automáticamente para que no tengas que ser contador para entender tu negocio.
            </p>
          </div>

          <button
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
              showTechnicalDetails
                ? 'bg-[#00FFC2] text-[#051322] border-[#00FFC2] shadow-[0_0_12px_rgba(0,255,194,0.3)]'
                : 'bg-white/5 hover:bg-white/10 text-white/80 border-white/15'
            }`}
          >
            {showTechnicalDetails ? 'Ocultar Asientos Técnicos' : 'Ver Asientos Técnicos (Debe/Haber)'}
          </button>
        </div>

        {/* Las 3 Preguntas Clave del Dueño de Negocio */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <div className="bg-[#071a2e]/70 border border-white/5 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#00FFC2] mb-1">
              <span>📥</span> 1. ¿De dónde entró dinero?
            </div>
            <p className="text-xs text-white/70 leading-relaxed">
              De las ventas de alimentos, bebidas y productos en el restaurante. Cada ticket comanda genera un ingreso reconocido al instante.
            </p>
          </div>

          <div className="bg-[#071a2e]/70 border border-white/5 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 mb-1">
              <span>📤</span> 2. ¿En qué se gastó?
            </div>
            <p className="text-xs text-white/70 leading-relaxed">
              En compra de carnes, vegetales, gas doméstico y sueldos semanales del equipo. Cada gasto tiene su factura o comprobante.
            </p>
          </div>

          <div className="bg-[#071a2e]/70 border border-white/5 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-300 mb-1">
              <span>⚖</span> 3. ¿Qué queda disponible?
            </div>
            <p className="text-xs text-white/70 leading-relaxed">
              El saldo neto en boveda ($2,450) y en cuentas Banesco / Pago Móvil (Bs. 526,621), listo para reposición y obligaciones tributarias.
            </p>
          </div>
        </div>
      </div>

      {/* Modo Técnico Contable (Expandible) */}
      {showTechnicalDetails && (
        <div className="bg-[#0b2341]/90 border border-[#00FFC2]/30 rounded-2xl p-5 backdrop-blur-xl shadow-xl transition-all animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00FFC2]" />
                <h4 className="text-sm font-semibold text-white">
                  Auditoría Contable: Partida Doble (Catálogo PUC y Cuentas)
                </h4>
              </div>
              <p className="text-[11px] text-white/60 mt-0.5">
                Comprobante generado por el motor financiero para auditoría externa y exportación al sistema contable.
              </p>
            </div>

            <button
              onClick={() => onViewEntryDetails(sampleEntry)}
              className="text-xs text-[#00FFC2] hover:underline font-semibold"
            >
              Inspeccionar en Modal Completo →
            </button>
          </div>

          {/* Resumen del Asiento Muestra */}
          <div className="mt-4 bg-[#071a2e] rounded-xl border border-white/10 overflow-hidden">
            <div className="p-3 bg-white/5 flex flex-wrap items-center justify-between gap-2 text-xs border-b border-white/10">
              <span className="font-mono text-white font-bold">{sampleEntry.id}</span>
              <span className="text-white/60">Doc: {sampleEntry.referenceDoc}</span>
              <span className="text-white/60">{sampleEntry.date}</span>
              <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-medium border border-emerald-500/20">
                {sampleEntry.isBalanced ? '✓ Asiento Cuadrado' : '⚠ Descuadrado'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-white/50 bg-white/[0.02]">
                    <th className="p-3">Código PUC</th>
                    <th className="p-3">Cuenta Contable</th>
                    <th className="p-3 text-right">Debe (Cargos)</th>
                    <th className="p-3 text-right">Haber (Abonos)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white/80 font-mono">
                  {sampleEntry.lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02]">
                      <td className="p-3 text-[#00FFC2]">{line.accountCode}</td>
                      <td className="p-3 font-sans text-white font-medium">{line.accountName}</td>
                      <td className="p-3 text-right">
                        {line.debit > 0 ? `$${line.debit.toFixed(2)}` : '-'}
                      </td>
                      <td className="p-3 text-right">
                        {line.credit > 0 ? `$${line.credit.toFixed(2)}` : '-'}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-white/5 font-bold text-white">
                    <td colSpan={2} className="p-3 font-sans text-right">Totales Cuadrados:</td>
                    <td className="p-3 text-right text-emerald-400">
                      ${sampleEntry.lines.reduce((a, c) => a + c.debit, 0).toFixed(2)}
                    </td>
                    <td className="p-3 text-right text-emerald-400">
                      ${sampleEntry.lines.reduce((a, c) => a + c.credit, 0).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
