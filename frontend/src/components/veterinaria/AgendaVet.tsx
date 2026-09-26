import { avisar } from "../../avisos";
import React, { useState } from 'react';
import { IconCalendar, IconClose } from '../../Icons';
import {
  type CitaVeterinaria,
  type Mascota,
  type Propietario,
  agendarCitaVet,
  actualizarEstadoCitaVet,
} from '../../api';

export default function AgendaVet({
  tenantId,
  citas,
  mascotas,
  propietarios,
  onRecargar,
}: {
  tenantId: number;
  citas: CitaVeterinaria[];
  mascotas: Mascota[];
  propietarios: Propietario[];
  onRecargar: () => void;
}) {
  const [modalNuevaCita, setModalNuevaCita] = useState(false);
  const [citaForm, setCitaForm] = useState({
    mascotaId: 0,
    fecha: new Date().toISOString().split('T')[0],
    horaInicio: '09:00',
    horaFin: '09:30',
    motivo: '',
    notas: '',
  });

  const guardarCita = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!citaForm.mascotaId) {
      avisar('Por favor seleccione una mascota.');
      return;
    }
    try {
      await agendarCitaVet(tenantId, {
        mascotaId: citaForm.mascotaId,
        fecha: citaForm.fecha,
        horaInicio: citaForm.horaInicio,
        horaFin: citaForm.horaFin,
        motivo: citaForm.motivo,
        notas: citaForm.notas || undefined,
      });
      setModalNuevaCita(false);
      setCitaForm({
        mascotaId: 0,
        fecha: new Date().toISOString().split('T')[0],
        horaInicio: '09:00',
        horaFin: '09:30',
        motivo: '',
        notas: '',
      });
      onRecargar();
    } catch (err: any) {
      avisar('Error agendando cita: ' + err.message);
    }
  };

  const cambiarEstado = async (id: number, estado: string) => {
    try {
      await actualizarEstadoCitaVet(tenantId, id, estado);
      onRecargar();
    } catch (err: any) {
      avisar('Error actualizando estado: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Agenda de Citas Veterinarias</h2>
          <p className="text-slate-400 text-sm">Programación de consultas, vacunaciones y cirugías</p>
        </div>
        <button
          onClick={() => setModalNuevaCita(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition"
        >
          <span>+ Nueva Cita</span>
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <IconCalendar size={18} className="text-emerald-400" />
          <h3 className="font-bold text-white text-base">Citas Registradas ({citas.length})</h3>
        </div>

        {citas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {citas.map((c) => {
              const mascota = c.mascota || mascotas.find((m) => m.id === c.mascota?.id);
              const prop = mascota?.propietario || propietarios.find((p) => p.id === mascota?.propietario?.id);
              return (
                <div key={c.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-emerald-400">
                        {c.fecha} • {c.horaInicio} - {c.horaFin}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                        {c.estado}
                      </span>
                    </div>
                    <h4 className="font-bold text-white text-sm">{c.motivo}</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Paciente: <span className="text-slate-200">{mascota?.nombre || 'Mascota'} ({mascota?.especie})</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      Propietario: {prop?.nombreCompleto || (prop?.nombres ? prop.nombres + ' ' + prop.apellidos : 'N/A')} {prop?.telefono ? '• ' + prop.telefono : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-900">
                    <button
                      onClick={() => cambiarEstado(c.id, 'COMPLETADA')}
                      className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs rounded-lg transition"
                    >
                      Completar
                    </button>
                    <button
                      onClick={() => cambiarEstado(c.id, 'CANCELADA')}
                      className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs rounded-lg transition"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-500 text-sm">
            No hay citas programadas en la agenda.
          </div>
        )}
      </div>

      {modalNuevaCita && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-lg">Agendar Cita</h3>
              <button onClick={() => setModalNuevaCita(false)} className="text-slate-400 hover:text-white"><IconClose size={20} /></button>
            </div>
            <form onSubmit={guardarCita} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Mascota *</label>
                <select
                  required
                  value={citaForm.mascotaId}
                  onChange={(e) => setCitaForm({ ...citaForm, mascotaId: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                >
                  <option value="0">Seleccionar mascota...</option>
                  {mascotas.map((m) => (
                    <option key={m.id} value={m.id}>{m.nombre} ({m.especie})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Fecha *</label>
                <input
                  type="date"
                  required
                  value={citaForm.fecha}
                  onChange={(e) => setCitaForm({ ...citaForm, fecha: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Hora Inicio *</label>
                  <input
                    type="time"
                    required
                    value={citaForm.horaInicio}
                    onChange={(e) => setCitaForm({ ...citaForm, horaInicio: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Hora Fin *</label>
                  <input
                    type="time"
                    required
                    value={citaForm.horaFin}
                    onChange={(e) => setCitaForm({ ...citaForm, horaFin: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Motivo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Vacunación séxtuple, Control postoperatorio"
                  value={citaForm.motivo}
                  onChange={(e) => setCitaForm({ ...citaForm, motivo: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Notas</label>
                <textarea
                  rows={2}
                  value={citaForm.notas}
                  onChange={(e) => setCitaForm({ ...citaForm, notas: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setModalNuevaCita(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold">Guardar Cita</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
