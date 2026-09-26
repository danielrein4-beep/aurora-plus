import { avisar } from "../../avisos";
import React, { useState } from 'react';
import { IconPrescription, IconCard, IconClose } from '../../Icons';
import {
  type ProcedimientoVeterinario,
  type CotizacionVeterinariaApi,
  type Mascota,
  crearProcedimientoVet,
  crearCotizacionVet,
} from '../../api';

export default function ProcedimientosCotizadorVet({
  tenantId,
  procedimientos,
  cotizaciones,
  mascotas,
  onRecargar
}: {
  tenantId: number;
  procedimientos: ProcedimientoVeterinario[];
  cotizaciones: CotizacionVeterinariaApi[];
  mascotas: Mascota[];
  onRecargar: () => void;
}) {
  const [modalProc, setModalProc] = useState(false);
  const [procForm, setProcForm] = useState({
    nombre: '',
    descripcion: '',
    costo: 0,
    moneda: 'USD',
    duracionMinutos: 30,
  });

  const [modalCot, setModalCot] = useState(false);
  const [cotForm, setCotForm] = useState({
    mascotaId: 0,
    procedimientoNombre: '',
    costoUSD: 0,
    observaciones: '',
  });

  const guardarProc = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await crearProcedimientoVet(tenantId, procForm);
      setModalProc(false);
      setProcForm({ nombre: '', descripcion: '', costo: 0, moneda: 'USD', duracionMinutos: 30 });
      onRecargar();
    } catch (err: any) {
      avisar('Error creando procedimiento: ' + err.message);
    }
  };

  const guardarCot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cotForm.mascotaId) {
      avisar('Seleccione una mascota');
      return;
    }
    try {
      await crearCotizacionVet(tenantId, cotForm);
      setModalCot(false);
      onRecargar();
    } catch (err: any) {
      avisar('Error guardando cotización: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Procedimientos y Cotizador</h2>
          <p className="text-slate-400 text-sm">Catálogo de servicios clínicos y presupuestos veterinarios</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalProc(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
          >
            + Nuevo Procedimiento
          </button>
          <button
            onClick={() => setModalCot(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition"
          >
            + Nueva Cotización
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <IconPrescription size={18} className="text-emerald-400" />
            <span>Catálogo de Procedimientos ({procedimientos.length})</span>
          </h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {procedimientos.map((p) => (
              <div key={p.id} className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-200 text-sm">{p.nombre}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{p.descripcion || 'Sin descripción adicional'}</p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-emerald-400 text-sm">${p.costo.toFixed(2)} USD</span>
                  <span className="block text-[10px] text-slate-500">{p.duracionMinutos || 30} min</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <IconCard size={18} className="text-emerald-400" />
            <span>Presupuestos & Cotizaciones ({cotizaciones.length})</span>
          </h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {cotizaciones.map((c) => (
              <div key={c.id} className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-slate-200 text-sm">{c.procedimientoNombre}</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {c.estado}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Paciente: {c.mascota?.nombre || 'Mascota'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-emerald-400 text-sm">${c.costoUSD.toFixed(2)} USD</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {modalProc && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-lg">Nuevo Procedimiento</h3>
              <button onClick={() => setModalProc(false)} className="text-slate-400 hover:text-white"><IconClose size={20} /></button>
            </div>
            <form onSubmit={guardarProc} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Nombre *</label>
                <input type="text" required value={procForm.nombre} onChange={(e) => setProcForm({ ...procForm, nombre: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Costo (USD) *</label>
                <input type="number" step="0.01" required value={procForm.costo} onChange={(e) => setProcForm({ ...procForm, costo: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setModalProc(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalCot && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-lg">Crear Cotización</h3>
              <button onClick={() => setModalCot(false)} className="text-slate-400 hover:text-white"><IconClose size={20} /></button>
            </div>
            <form onSubmit={guardarCot} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Mascota *</label>
                <select required value={cotForm.mascotaId} onChange={(e) => setCotForm({ ...cotForm, mascotaId: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white">
                  <option value="0">Seleccionar mascota...</option>
                  {mascotas.map((m) => (<option key={m.id} value={m.id}>{m.nombre}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Procedimiento *</label>
                <input type="text" required value={cotForm.procedimientoNombre} onChange={(e) => setCotForm({ ...cotForm, procedimientoNombre: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Monto USD *</label>
                <input type="number" step="0.01" required value={cotForm.costoUSD} onChange={(e) => setCotForm({ ...cotForm, costoUSD: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setModalCot(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold">Generar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
