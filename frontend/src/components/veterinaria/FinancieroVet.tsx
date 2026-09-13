import React, { useState } from 'react';
import { IconCard, IconClose } from '../../Icons';
import {
  type CobroConsultaVet,
  type CierreCajaVetRegistro,
  registrarCierreCajaVet,
} from '../../api';

export default function FinancieroVet({
  tenantId,
  cobros,
  cierresCaja,
  onRecargar,
}: {
  tenantId: number;
  cobros: CobroConsultaVet[];
  cierresCaja: CierreCajaVetRegistro[];
  onRecargar: () => void;
}) {
  const [modalCierre, setModalCierre] = useState(false);
  const [cierreForm, setCierreForm] = useState({
    totalUSD: 0,
    totalVES: 0,
    totalPacientes: 0,
    observaciones: '',
  });

  const totalUSD = cobros.filter(c => c.monedaCobrada === 'USD').reduce((s, c) => s + (c.montoTotal || 0), 0);
  const totalVES = cobros.filter(c => c.monedaCobrada === 'VES').reduce((s, c) => s + (c.montoTotal || 0), 0);

  const guardarCierre = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const now = new Date();
      await registrarCierreCajaVet(tenantId, {
        fecha: now.toISOString().split('T')[0],
        horaCierre: now.toTimeString().split(' ')[0],
        totalUSD: Number(cierreForm.totalUSD) || totalUSD,
        totalVES: Number(cierreForm.totalVES) || totalVES,
        totalPacientes: Number(cierreForm.totalPacientes) || cobros.length,
        observaciones: cierreForm.observaciones || undefined,
      });
      setModalCierre(false);
      onRecargar();
    } catch (err: any) {
      alert('Error registrando cierre de caja: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Módulo Financiero y Caja</h2>
          <p className="text-slate-400 text-sm">Gestión de ingresos, arqueos y cierres de caja veterinaria</p>
        </div>
        <button
          onClick={() => {
            setCierreForm({
              totalUSD,
              totalVES,
              totalPacientes: cobros.length,
              observaciones: '',
            });
            setModalCierre(true);
          }}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 transition"
        >
          + Cierre de Caja
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Cobrado (USD)</span>
          <div className="text-3xl font-black text-emerald-400 mt-2">${totalUSD.toFixed(2)}</div>
          <div className="text-xs text-slate-500 mt-1">{cobros.length} transacciones registradas</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Cobrado (VES)</span>
          <div className="text-3xl font-black text-blue-400 mt-2">Bs. {totalVES.toFixed(2)}</div>
          <div className="text-xs text-slate-500 mt-1">Moneda nacional</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Cierres Realizados</span>
          <div className="text-3xl font-black text-purple-400 mt-2">{cierresCaja.length}</div>
          <div className="text-xs text-slate-500 mt-1">Historial de arqueos</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <IconCard size={18} className="text-emerald-400" />
            <span>Últimos Cobros Registrados</span>
          </h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {cobros.map((c) => (
              <div key={c.id} className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-200 text-sm">{c.concepto}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {c.metodoPago} {c.referenciaPago ? '• Ref: ' + c.referenciaPago : ''}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-emerald-400 text-sm">
                    {c.monedaCobrada === 'USD' ? '$' : 'Bs. '}{c.montoTotal.toFixed(2)}
                  </span>
                  <span className="block text-[10px] text-slate-500">
                    {c.fechaHora ? new Date(c.fechaHora).toLocaleDateString('es-ES') : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <IconCard size={18} className="text-purple-400" />
            <span>Historial de Cierres de Caja</span>
          </h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {cierresCaja.map((cc) => (
              <div key={cc.id} className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-200 text-sm">
                    Cierre {cc.fecha} {cc.horaCierre}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pacientes atendidos: {cc.totalPacientes} {cc.responsableNombre ? '• ' + cc.responsableNombre : ''}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-purple-400 text-sm">${(cc.totalUSD || 0).toFixed(2)} USD</span>
                  <span className="block text-[10px] text-slate-500">Bs. {(cc.totalVES || 0).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {modalCierre && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-lg">Registrar Cierre de Caja</h3>
              <button onClick={() => setModalCierre(false)} className="text-slate-400 hover:text-white"><IconClose size={20} /></button>
            </div>
            <form onSubmit={guardarCierre} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Total USD</label>
                  <input type="number" step="0.01" value={cierreForm.totalUSD} onChange={(e) => setCierreForm({ ...cierreForm, totalUSD: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Total VES</label>
                  <input type="number" step="0.01" value={cierreForm.totalVES} onChange={(e) => setCierreForm({ ...cierreForm, totalVES: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Total Pacientes Atendidos</label>
                <input type="number" value={cierreForm.totalPacientes} onChange={(e) => setCierreForm({ ...cierreForm, totalPacientes: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Observaciones</label>
                <textarea rows={2} value={cierreForm.observaciones} onChange={(e) => setCierreForm({ ...cierreForm, observaciones: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setModalCierre(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold">Guardar Cierre</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
