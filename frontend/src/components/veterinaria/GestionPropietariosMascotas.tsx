import React, { useState } from 'react';
import {
  IconUsers,
  IconVet,
  IconSearch,
  IconFileText,
  IconClose,
  IconTrash,
} from '../../Icons';
import {
  type Propietario,
  type Mascota,
  type EspecieMascota,
  crearPropietario,
  crearMascota,
  eliminarPropietario,
  eliminarMascota,
} from '../../api';

export default function GestionPropietariosMascotas({
  tenantId,
  propietarios,
  mascotas,
  propietarioSeleccionado,
  mascotaSeleccionada,
  onSeleccionarPropietario,
  onSeleccionarMascota,
  onRecargarPropietarios,
  onRecargarMascotas,
  onVerHistorias,
}: {
  tenantId: number;
  propietarios: Propietario[];
  mascotas: Mascota[];
  propietarioSeleccionado: Propietario | null;
  mascotaSeleccionada: Mascota | null;
  onSeleccionarPropietario: (p: Propietario | null) => void;
  onSeleccionarMascota: (m: Mascota | null) => void;
  onRecargarPropietarios: () => void;
  onRecargarMascotas: () => void;
  onVerHistorias: (m: Mascota) => void;
}) {
  const [filtro, setFiltro] = useState('');
  const [modalPropietario, setModalPropietario] = useState(false);
  const [modalMascota, setModalMascota] = useState(false);

  const [formProp, setFormProp] = useState({
    identificacion: '',
    nombres: '',
    apellidos: '',
    telefono: '',
    email: '',
    direccion: '',
  });

  const [formMascota, setFormMascota] = useState<{
    nombre: string;
    especie: EspecieMascota;
    raza: string;
    sexo: 'MACHO' | 'HEMBRA';
    fechaNacimiento: string;
    colorSenas: string;
    microchip: string;
    pesoActualKg: string;
    esterilizado: boolean;
    alergias: string;
    antecedentesPatologicos: string;
  }>({
    nombre: '',
    especie: 'PERRO',
    raza: '',
    sexo: 'MACHO',
    fechaNacimiento: '',
    colorSenas: '',
    microchip: '',
    pesoActualKg: '',
    esterilizado: false,
    alergias: '',
    antecedentesPatologicos: '',
  });

  const propietariosFiltrados = propietarios.filter(
    (p) =>
      p.nombreCompleto?.toLowerCase().includes(filtro.toLowerCase()) ||
      p.identificacion?.toLowerCase().includes(filtro.toLowerCase()) ||
      (p.telefono && p.telefono.includes(filtro))
  );

  const mascotasDelPropietario = propietarioSeleccionado
    ? mascotas.filter((m) => m.propietario?.id === propietarioSeleccionado.id)
    : [];

  const handleGuardarPropietario = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const nuevo = await crearPropietario(tenantId, formProp);
      setModalPropietario(false);
      setFormProp({ identificacion: '', nombres: '', apellidos: '', telefono: '', email: '', direccion: '' });
      onRecargarPropietarios();
      onSeleccionarPropietario(nuevo);
    } catch (err: any) {
      alert('Error guardando propietario: ' + err.message);
    }
  };

  const handleGuardarMascota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propietarioSeleccionado) return;
    try {
      await crearMascota(tenantId, {
        propietarioId: propietarioSeleccionado.id,
        nombre: formMascota.nombre,
        especie: formMascota.especie,
        raza: formMascota.raza || undefined,
        sexo: formMascota.sexo,
        fechaNacimiento: formMascota.fechaNacimiento || undefined,
        colorSenas: formMascota.colorSenas || undefined,
        microchip: formMascota.microchip || undefined,
        pesoActualKg: formMascota.pesoActualKg ? Number(formMascota.pesoActualKg) : undefined,
        esterilizado: formMascota.esterilizado,
        alergias: formMascota.alergias || undefined,
        antecedentesPatologicos: formMascota.antecedentesPatologicos || undefined,
      });
      setModalMascota(false);
      setFormMascota({
        nombre: '',
        especie: 'PERRO',
        raza: '',
        sexo: 'MACHO',
        fechaNacimiento: '',
        colorSenas: '',
        microchip: '',
        pesoActualKg: '',
        esterilizado: false,
        alergias: '',
        antecedentesPatologicos: '',
      });
      onRecargarMascotas();
    } catch (err: any) {
      alert('Error guardando mascota: ' + err.message);
    }
  };

  const handleEliminarProp = async (id: number) => {
    if (!confirm('¿Seguro de eliminar este propietario y sus mascotas asociadas?')) return;
    try {
      await eliminarPropietario(tenantId, id);
      if (propietarioSeleccionado?.id === id) {
        onSeleccionarPropietario(null);
        onSeleccionarMascota(null);
      }
      onRecargarPropietarios();
      onRecargarMascotas();
    } catch (err: any) {
      alert('Error eliminando: ' + err.message);
    }
  };

  const handleEliminarMascota = async (id: number) => {
    if (!confirm('¿Seguro de dar de baja a esta mascota?')) return;
    try {
      await eliminarMascota(tenantId, id);
      if (mascotaSeleccionada?.id === id) {
        onSeleccionarMascota(null);
      }
      onRecargarMascotas();
    } catch (err: any) {
      alert('Error eliminando mascota: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Gestión de Pacientes y Propietarios</h2>
          <p className="text-slate-400 text-sm">Estructura jerárquica de 2 niveles: Propietario (Humano) → Mascotas (Pacientes)</p>
        </div>
        <button
          onClick={() => setModalPropietario(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition"
        >
          <span>+ Nuevo Propietario</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* NIVEL 1: PROPIETARIOS */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <IconUsers size={18} className="text-emerald-400" />
              <span>Propietarios ({propietariosFiltrados.length})</span>
            </h3>
          </div>

          <div className="relative">
            <IconSearch size={16} className="absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nombre, cédula o teléfono..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {propietariosFiltrados.map((p) => {
              const isSelected = propietarioSeleccionado?.id === p.id;
              const numMascotas = mascotas.filter((m) => m.propietario?.id === p.id).length;
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    onSeleccionarPropietario(p);
                    onSeleccionarMascota(null);
                  }}
                  className={"p-3 rounded-xl border cursor-pointer transition flex items-center justify-between " + (
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-500/50'
                      : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                  )}
                >
                  <div>
                    <h4 className="font-bold text-slate-200 text-sm">{p.nombreCompleto || (p.nombres + ' ' + p.apellidos)}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      CI: {p.identificacion} • Tel: {p.telefono || 'Sin teléfono'}
                    </p>
                    <span className="inline-block text-[10px] mt-1 px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 font-medium">
                      {numMascotas} {numMascotas === 1 ? 'mascota' : 'mascotas'}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEliminarProp(p.id);
                    }}
                    className="text-slate-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition"
                    title="Eliminar propietario"
                  >
                    <IconTrash size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* NIVEL 2: MASCOTAS DEL PROPIETARIO */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4">
          {propietarioSeleccionado ? (
            <>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-4 gap-2">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>{propietarioSeleccionado.nombreCompleto || (propietarioSeleccionado.nombres + ' ' + propietarioSeleccionado.apellidos)}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      CI: {propietarioSeleccionado.identificacion}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {propietarioSeleccionado.telefono ? 'Tel: ' + propietarioSeleccionado.telefono + ' • ' : ''}
                    {propietarioSeleccionado.direccion || 'Sin dirección'}
                  </p>
                </div>
                <button
                  onClick={() => setModalMascota(true)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <span>+ Agregar Mascota</span>
                </button>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                  <IconVet size={16} className="text-emerald-400" />
                  <span>Mascotas Registradas ({mascotasDelPropietario.length})</span>
                </h4>

                {mascotasDelPropietario.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {mascotasDelPropietario.map((m) => (
                      <div
                        key={m.id}
                        className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3 hover:border-slate-700 transition"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <h5 className="font-bold text-slate-100 text-base">{m.nombre}</h5>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                              {m.especie}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            Raza: {m.raza || 'Mestizo'} • Sexo: {m.sexo || 'N/A'}
                          </p>
                          <p className="text-xs text-slate-400">
                            Peso: {m.pesoActualKg ? m.pesoActualKg + ' kg' : 'Sin peso'} •{' '}
                            {m.esterilizado ? 'Esterilizado(a)' : 'Sin esterilizar'}
                          </p>
                          {m.alergias && (
                            <div className="mt-2 text-[11px] bg-red-500/10 border border-red-500/20 text-red-400 p-1.5 rounded-lg">
                              ⚠️ Alertas: {m.alergias}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                          <button
                            onClick={() => onVerHistorias(m)}
                            className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs rounded-lg font-medium flex items-center gap-1.5 transition"
                          >
                            <IconFileText size={14} />
                            <span>Historial / Consultas</span>
                          </button>
                          <button
                            onClick={() => handleEliminarMascota(m.id)}
                            className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition"
                            title="Eliminar mascota"
                          >
                            <IconTrash size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500 text-sm bg-slate-950/50 rounded-xl border border-dashed border-slate-800">
                    Este propietario no tiene mascotas registradas todavía.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-24 text-slate-500 text-sm">
              👈 Seleccione un propietario de la lista izquierda para ver y gestionar sus mascotas.
            </div>
          )}
        </div>
      </div>

      {/* MODAL NUEVO PROPIETARIO */}
      {modalPropietario && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-lg">Nuevo Propietario</h3>
              <button onClick={() => setModalPropietario(false)} className="text-slate-400 hover:text-white"><IconClose size={20} /></button>
            </div>
            <form onSubmit={handleGuardarPropietario} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Cédula / RIF / DNI *</label>
                <input type="text" required value={formProp.identificacion} onChange={(e) => setFormProp({ ...formProp, identificacion: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Nombres *</label>
                  <input type="text" required value={formProp.nombres} onChange={(e) => setFormProp({ ...formProp, nombres: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Apellidos *</label>
                  <input type="text" required value={formProp.apellidos} onChange={(e) => setFormProp({ ...formProp, apellidos: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Teléfono</label>
                <input type="text" value={formProp.telefono} onChange={(e) => setFormProp({ ...formProp, telefono: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
                <input type="email" value={formProp.email} onChange={(e) => setFormProp({ ...formProp, email: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Dirección</label>
                <input type="text" value={formProp.direccion} onChange={(e) => setFormProp({ ...formProp, direccion: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setModalPropietario(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NUEVA MASCOTA */}
      {modalMascota && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-lg">Nueva Mascota</h3>
              <button onClick={() => setModalMascota(false)} className="text-slate-400 hover:text-white"><IconClose size={20} /></button>
            </div>
            <form onSubmit={handleGuardarMascota} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Nombre *</label>
                  <input type="text" required value={formMascota.nombre} onChange={(e) => setFormMascota({ ...formMascota, nombre: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Especie *</label>
                  <select value={formMascota.especie} onChange={(e) => setFormMascota({ ...formMascota, especie: e.target.value as EspecieMascota })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white">
                    <option value="PERRO">Perro</option>
                    <option value="GATO">Gato</option>
                    <option value="AVE">Ave</option>
                    <option value="EXOTICO">Exótico</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Raza</label>
                  <input type="text" value={formMascota.raza} onChange={(e) => setFormMascota({ ...formMascota, raza: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Sexo *</label>
                  <select value={formMascota.sexo} onChange={(e) => setFormMascota({ ...formMascota, sexo: e.target.value as any })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white">
                    <option value="MACHO">Macho</option>
                    <option value="HEMBRA">Hembra</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Peso Actual (kg)</label>
                  <input type="number" step="0.1" value={formMascota.pesoActualKg} onChange={(e) => setFormMascota({ ...formMascota, pesoActualKg: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Color / Señas</label>
                  <input type="text" value={formMascota.colorSenas} onChange={(e) => setFormMascota({ ...formMascota, colorSenas: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" />
                </div>
              </div>

              <div className="flex items-center gap-2 py-1">
                <input type="checkbox" id="esterilizado" checked={formMascota.esterilizado} onChange={(e) => setFormMascota({ ...formMascota, esterilizado: e.target.checked })} className="rounded accent-emerald-500" />
                <label htmlFor="esterilizado" className="text-xs text-slate-300">Mascota Esterilizada / Castrada</label>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Alergias</label>
                <input type="text" placeholder="Ej. Alérgico a penicilina" value={formMascota.alergias} onChange={(e) => setFormMascota({ ...formMascota, alergias: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setModalMascota(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold">Guardar Mascota</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
