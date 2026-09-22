import React, { useState } from 'react';
import { IconFileText, IconTrash, IconClose } from '../../Icons';
import {
  type Propietario,
  type Mascota,
  type ConsultaVeterinaria,
  registrarConsultaVet,
  eliminarConsultaVet,
} from '../../api';

export default function HistoriasClinicasVet({
  tenantId,
  propietarios,
  mascotas,
  mascotaSeleccionada,
  consultas,
  cargando,
  onSeleccionarMascota,
  onRecargarConsultas,
}: {
  tenantId: number;
  propietarios: Propietario[];
  mascotas: Mascota[];
  mascotaSeleccionada: Mascota | null;
  consultas: ConsultaVeterinaria[];
  cargando: boolean;
  onSeleccionarMascota: (m: Mascota | null) => void;
  onRecargarConsultas: () => void;
}) {
  const [modalNuevaConsulta, setModalNuevaConsulta] = useState(false);
  const [formConsulta, setFormConsulta] = useState({
    motivoConsulta: '',
    enfermedadActual: '',
    frecuenciaCardiaca: '',
    frecuenciaRespiratoria: '',
    temperatura: '',
    pesoKg: '',
    condicionCorporal: 5,
    observacionFisica: '',
    diagnosticoPrincipal: '',
    descripcionDiagnostico: '',
    planTratamiento: '',
  });

  const bcsLabels: Record<number, string> = {
    1: '1/9 - Muy demacrado',
    2: '2/9 - Demacrado',
    3: '3/9 - Bajo peso',
    4: '4/9 - Ligeramente delgado',
    5: '5/9 - Ideal',
    6: '6/9 - Ligeramente sobrepeso',
    7: '7/9 - Sobrepeso',
    8: '8/9 - Obeso',
    9: '9/9 - Muy obeso',
  };

  const abrirNueva = () => {
    if (!mascotaSeleccionada) {
      alert('Seleccione primero una mascota para registrar su consulta.');
      return;
    }
    setFormConsulta({
      motivoConsulta: '',
      enfermedadActual: '',
      frecuenciaCardiaca: '',
      frecuenciaRespiratoria: '',
      temperatura: '',
      pesoKg: mascotaSeleccionada.pesoActualKg ? String(mascotaSeleccionada.pesoActualKg) : '',
      condicionCorporal: 5,
      observacionFisica: '',
      diagnosticoPrincipal: '',
      descripcionDiagnostico: '',
      planTratamiento: '',
    });
    setModalNuevaConsulta(true);
  };

  const guardarConsulta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mascotaSeleccionada) return;
    try {
      await registrarConsultaVet(tenantId, mascotaSeleccionada.id, {
        motivoConsulta: formConsulta.motivoConsulta,
        enfermedadActual: formConsulta.enfermedadActual || undefined,
        frecuenciaCardiaca: formConsulta.frecuenciaCardiaca ? Number(formConsulta.frecuenciaCardiaca) : undefined,
        frecuenciaRespiratoria: formConsulta.frecuenciaRespiratoria ? Number(formConsulta.frecuenciaRespiratoria) : undefined,
        temperatura: formConsulta.temperatura ? Number(formConsulta.temperatura) : undefined,
        pesoKg: formConsulta.pesoKg ? Number(formConsulta.pesoKg) : undefined,
        condicionCorporal: formConsulta.condicionCorporal,
        observacionFisica: formConsulta.observacionFisica || undefined,
        diagnosticoPrincipal: formConsulta.diagnosticoPrincipal,
        descripcionDiagnostico: formConsulta.descripcionDiagnostico || undefined,
        planTratamiento: formConsulta.planTratamiento || undefined,
      });
      setModalNuevaConsulta(false);
      onRecargarConsultas();
    } catch (err: any) {
      alert('Error guardando consulta veterinaria: ' + err.message);
    }
  };

  const eliminarConsulta = async (id: number) => {
    if (!mascotaSeleccionada) return;
    if (!confirm('¿Seguro que desea eliminar esta consulta médica?')) return;
    try {
      await eliminarConsultaVet(tenantId, mascotaSeleccionada.id, id);
      onRecargarConsultas();
    } catch (err: any) {
      alert('Error eliminando consulta: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Historias Clínicas Veterinarias</h2>
          <p className="text-slate-400 text-sm">Consultas, constantes vitales por especie, BCS y evolución</p>
        </div>
        {mascotaSeleccionada && (
          <button
            onClick={abrirNueva}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 transition"
          >
            + Nueva Consulta
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <IconFileText size={16} className="text-emerald-400" />
            <span>Seleccionar Paciente</span>
          </h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {mascotas.map((m) => {
              const prop = m.propietario || propietarios.find((p) => p.id === m.propietario?.id);
              const isSelected = mascotaSeleccionada?.id === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => onSeleccionarMascota(m)}
                  className={"p-3 rounded-xl border cursor-pointer transition " + (
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-500/50'
                      : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-200 text-sm">{m.nombre}</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 font-medium">
                      {m.especie}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {m.raza || 'Raza no especificada'} • {prop?.nombreCompleto || (prop?.nombres ? prop.nombres + ' ' + prop.apellidos : 'Propietario')}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4">
          {mascotaSeleccionada ? (
            <>
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>{mascotaSeleccionada.nombre}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                      {mascotaSeleccionada.especie}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Raza: {mascotaSeleccionada.raza || 'N/A'} • Sexo: {mascotaSeleccionada.sexo || 'N/A'} • Peso:{' '}
                    {mascotaSeleccionada.pesoActualKg ? mascotaSeleccionada.pesoActualKg + ' kg' : 'Sin registrar'}
                  </p>
                </div>
                <button
                  onClick={abrirNueva}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition"
                >
                  + Consulta
                </button>
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {cargando ? (
                  <div className="text-center py-10 text-slate-400 text-sm">Cargando historial clínico...</div>
                ) : consultas.length > 0 ? (
                  consultas.map((c) => (
                    <div key={c.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                        <div>
                          <span className="text-xs font-semibold text-emerald-400">
                            {c.fechaHora ? new Date(c.fechaHora).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : 'Consulta'}
                          </span>
                          <h4 className="font-bold text-white text-base mt-0.5">{c.motivoConsulta}</h4>
                        </div>
                        <button
                          onClick={() => eliminarConsulta(c.id)}
                          className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition"
                          title="Eliminar consulta"
                        >
                          <IconTrash size={16} />
                        </button>
                      </div>

                      {c.enfermedadActual && (
                        <p className="text-xs text-slate-300"><span className="text-slate-500">Anamnesis:</span> {c.enfermedadActual}</p>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/50 text-xs">
                        <div>
                          <span className="text-slate-500 block text-[10px]">Peso</span>
                          <span className="font-medium text-slate-200">{c.pesoKg ? c.pesoKg + ' kg' : '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Temp</span>
                          <span className="font-medium text-slate-200">{c.temperatura ? c.temperatura + ' °C' : '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">FC / FR</span>
                          <span className="font-medium text-slate-200">
                            {(c.frecuenciaCardiaca || '-') + ' lpm / ' + (c.frecuenciaRespiratoria || '-') + ' rpm'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Cond. Corporal (BCS)</span>
                          <span className="font-medium text-emerald-400">{c.condicionCorporal ? c.condicionCorporal + '/9' : '-'}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1 text-xs">
                        <div>
                          <span className="font-semibold text-slate-300">Diagnóstico: </span>
                          <span className="text-emerald-300 font-medium">{c.diagnosticoPrincipal}</span>
                          {c.descripcionDiagnostico && <p className="text-slate-400 mt-0.5">{c.descripcionDiagnostico}</p>}
                        </div>
                        {c.planTratamiento && (
                          <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/40 mt-2">
                            <span className="font-semibold text-slate-300 block mb-1">Plan de Tratamiento / Rx:</span>
                            <p className="text-slate-300 whitespace-pre-wrap">{c.planTratamiento}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-500 text-sm">
                    No hay consultas registradas para esta mascota.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-slate-500 text-sm">
              Seleccione una mascota de la lista para ver o registrar su historial clínico.
            </div>
          )}
        </div>
      </div>

      {modalNuevaConsulta && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-lg">Nueva Consulta Médica Veterinaria</h3>
                <p className="text-xs text-emerald-400 mt-0.5">Paciente: {mascotaSeleccionada?.nombre} ({mascotaSeleccionada?.especie})</p>
              </div>
              <button onClick={() => setModalNuevaConsulta(false)} className="text-slate-400 hover:text-white"><IconClose size={20} /></button>
            </div>

            <form onSubmit={guardarConsulta} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Motivo de Consulta *</label>
                <input
                  type="text"
                  required
                  value={formConsulta.motivoConsulta}
                  onChange={(e) => setFormConsulta({ ...formConsulta, motivoConsulta: e.target.value })}
                  placeholder="Ej. Vómitos, vacunación, chequeo general"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Anamnesis / Historia Actual</label>
                <textarea
                  rows={2}
                  value={formConsulta.enfermedadActual}
                  onChange={(e) => setFormConsulta({ ...formConsulta, enfermedadActual: e.target.value })}
                  placeholder="Evolución de los síntomas, dieta, comportamiento..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 space-y-3">
                <span className="text-xs font-semibold text-slate-300 block">
                  Constantes Vitales y Examen Físico ({mascotaSeleccionada?.especie})
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Peso (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formConsulta.pesoKg}
                      onChange={(e) => setFormConsulta({ ...formConsulta, pesoKg: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Temp (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formConsulta.temperatura}
                      onChange={(e) => setFormConsulta({ ...formConsulta, temperatura: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">FC (lpm)</label>
                    <input
                      type="number"
                      value={formConsulta.frecuenciaCardiaca}
                      onChange={(e) => setFormConsulta({ ...formConsulta, frecuenciaCardiaca: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">FR (rpm)</label>
                    <input
                      type="number"
                      value={formConsulta.frecuenciaRespiratoria}
                      onChange={(e) => setFormConsulta({ ...formConsulta, frecuenciaRespiratoria: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    {"Condición Corporal (BCS 1-9): "}
                    <span className="text-emerald-400 font-semibold">
                      {bcsLabels[formConsulta.condicionCorporal] || formConsulta.condicionCorporal}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="9"
                    step="1"
                    value={formConsulta.condicionCorporal}
                    onChange={(e) => setFormConsulta({ ...formConsulta, condicionCorporal: Number(e.target.value) })}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Diagnóstico Principal (Texto Libre - Sin CIE10) *
                </label>
                <input
                  type="text"
                  required
                  value={formConsulta.diagnosticoPrincipal}
                  onChange={(e) => setFormConsulta({ ...formConsulta, diagnosticoPrincipal: e.target.value })}
                  placeholder="Ej. Gastroenteritis infecciosa, Otitis externa"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Plan de Tratamiento / Receta</label>
                <textarea
                  rows={3}
                  value={formConsulta.planTratamiento}
                  onChange={(e) => setFormConsulta({ ...formConsulta, planTratamiento: e.target.value })}
                  placeholder="Medicamentos, dosis, recomendaciones..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalNuevaConsulta(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-600/20 transition"
                >
                  Guardar Consulta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
