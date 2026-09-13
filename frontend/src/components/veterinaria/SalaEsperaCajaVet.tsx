import React, { useState } from 'react';
import { IconHourglass, IconCard, IconClose } from '../../Icons';
import {
  type SalaEsperaVetEntrada,
  type CobroConsultaVet,
  type Mascota,
  registrarLlegadaSalaEsperaVet,
  llamarAConsultorioSalaEsperaVet,
  finalizarAtencionSalaEsperaVet,
  procesarCobroVet,
} from '../../api';

export default function SalaEsperaCajaVet({
  tenantId,
  salaEspera,
  cobros,
  mascotas,
  onRecargarSala,
  onRecargarCobros
}: {
  tenantId: number;
  salaEspera: SalaEsperaVetEntrada[];
  cobros: CobroConsultaVet[];
  mascotas: Mascota[];
  onRecargarSala: () => void;
  onRecargarCobros: () => void;
}) {
  const [modalCheckIn, setModalCheckIn] = useState(false);
  const [checkInForm, setCheckInForm] = useState({ mascotaId: 0, consultorio: 'Consultorio 1' });
  const [modalCobro, setModalCobro] = useState(false);
  const [cobroForm, setCobroForm] = useState<{
    mascotaId: number; concepto: string; montoTotal: number;
    monedaCobrada: string; montoRecibido: number; monedaPago: string;
    metodoPago: 'EFECTIVO' | 'TRANSFERENCIA' | 'PUNTO_VENTA' | 'PAGO_MOVIL' | 'ZELLE' | 'OTRO';
    referenciaPago: string;
  }>({
    mascotaId: 0, concepto: 'Consulta Médica General', montoTotal: 25.0,
    monedaCobrada: 'USD', montoRecibido: 25.0, monedaPago: 'USD',
    metodoPago: 'EFECTIVO', referenciaPago: ''
  });

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInForm.mascotaId) {
      alert('Seleccione una mascota');
      return;
    }
    try {
      await registrarLlegadaSalaEsperaVet(tenantId, checkInForm.mascotaId, checkInForm.consultorio);
      setModalCheckIn(false);
      onRecargarSala();
    } catch (err: any) {
      alert('Error en check-in: ' + err.message);
    }
  };

  const handleLlamar = async (s: SalaEsperaVetEntrada) => {
    try {
      await llamarAConsultorioSalaEsperaVet(tenantId, s.id, s.consultorio || 'Consultorio 1');
      onRecargarSala();
    } catch (err: any) {
      alert('Error llamando a paciente: ' + err.message);
    }
  };

  const handleFinalizar = async (s: SalaEsperaVetEntrada) => {
    try {
      await finalizarAtencionSalaEsperaVet(tenantId, s.id);
      onRecargarSala();
    } catch (err: any) {
      alert('Error finalizando atención: ' + err.message);
    }
  };

  const handleCobro = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await procesarCobroVet(tenantId, {
        mascotaId: cobroForm.mascotaId || undefined,
        concepto: cobroForm.concepto,
        montoTotal: Number(cobroForm.montoTotal),
        monedaCobrada: cobroForm.monedaCobrada,
        montoRecibido: Number(cobroForm.montoRecibido),
        monedaPago: cobroForm.monedaPago,
        metodoPago: cobroForm.metodoPago,
        referenciaPago: cobroForm.referenciaPago || undefined,
      });
      setModalCobro(false);
      onRecargarCobros();
    } catch (err: any) {
      alert('Error procesando cobro: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Sala de Espera y Caja</h2>
          <p className="text-slate-400 text-sm">Flujo de recepción y cobros veterinarios</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalCheckIn(true)}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold transition"
          >
            + Check-in
          </button>
          <button
            onClick={() => setModalCobro(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition"
          >
            + Procesar Cobro
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <IconHourglass size={18} className="text-amber-400" />
            <span>Pacientes en Espera ({salaEspera.length})</span>
          </h3>
          <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1">
            {salaEspera.map((s) => (
              <div key={s.id} className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-100 text-sm">{s.mascota?.nombre}</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">{s.mascota?.especie}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">{s.estado}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{s.consultorio || 'Sin consultorio'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {s.estado === 'EN_ESPERA' && (
                    <button onClick={() => handleLlamar(s)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold">
                      Llamar
                    </button>
                  )}
                  <button onClick={() => handleFinalizar(s)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs">
                    Finalizar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <IconCard size={18} className="text-emerald-400" />
            <span>Cobros del Día ({cobros.length})</span>
          </h3>
          <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
            {cobros.map((c) => (
              <div key={c.id} className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-200 text-sm">{c.concepto}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{c.metodoPago}</p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-emerald-400 text-sm">${c.montoTotal.toFixed(2)} USD</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {modalCheckIn && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-lg">Check-in Mascota</h3>
              <button onClick={() => setModalCheckIn(false)} className="text-slate-400 hover:text-white"><IconClose size={20} /></button>
            </div>
            <form onSubmit={handleCheckIn} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Mascota *</label>
                <select required value={checkInForm.mascotaId} onChange={(e) => setCheckInForm({ ...checkInForm, mascotaId: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white">
                  <option value="0">Seleccionar...</option>
                  {mascotas.map((m) => (<option key={m.id} value={m.id}>{m.nombre}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Consultorio</label>
                <input type="text" value={checkInForm.consultorio} onChange={(e) => setCheckInForm({ ...checkInForm, consultorio: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setModalCheckIn(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-amber-600 text-white rounded-xl text-sm font-semibold">Turno</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalCobro && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-lg">Procesar Cobro</h3>
              <button onClick={() => setModalCobro(false)} className="text-slate-400 hover:text-white"><IconClose size={20} /></button>
            </div>
            <form onSubmit={handleCobro} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Concepto *</label>
                <input type="text" required value={cobroForm.concepto} onChange={(e) => setCobroForm({ ...cobroForm, concepto: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Monto USD *</label>
                <input type="number" step="0.01" required value={cobroForm.montoTotal} onChange={(e) => setCobroForm({ ...cobroForm, montoTotal: Number(e.target.value), montoRecibido: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Método de Pago</label>
                <select value={cobroForm.metodoPago} onChange={(e) => setCobroForm({ ...cobroForm, metodoPago: e.target.value as any })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white">
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="PAGO_MOVIL">Pago Móvil</option>
                  <option value="PUNTO_VENTA">Punto de Venta</option>
                  <option value="ZELLE">Zelle</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setModalCobro(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold">Cobrar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
