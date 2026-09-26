import React, { useState } from 'react';
import { Empleado, PeriodoNomina, RegistroAsistencia, AsignacionTurno, SeccionPersonal, formatearMoneda } from './types';
import { EstadoNominaBadge } from './EstadoNominaBadge';
import { useVocabularioPersonal } from './vocabulario';
import { crearEmpleadoPersonal } from '../../api';

interface ResumenEquipoProps {
  empleados: Empleado[];
  periodoActual: PeriodoNomina;
  /** Marcajes de los últimos 30 días (de aquí se sacan los de hoy y los de la semana). */
  asistenciasHoy: RegistroAsistencia[];
  turnosHoy: AsignacionTurno[];
  onNavegarSeccion: (seccion: SeccionPersonal) => void;
  ocultarSueldo: boolean;
  nominaHabilitada: boolean;
  /** Puede agregar trabajadores (dueño o RRHH). */
  puedeAgregar?: boolean;
  onEmpleadoCreado?: () => void;
}

const fechaLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Panel para vigilar la empresa: quién está trabajando ahora, quién ya marcó y quién falta hoy,
 * las horas de la semana y los horarios de hoy. Antes "Asistencia hoy" contaba los marcajes de
 * los últimos 30 días y "En puesto" siempre salía en 0.
 */
export const ResumenEquipo: React.FC<ResumenEquipoProps> = ({
  empleados,
  periodoActual,
  asistenciasHoy: asistencias,
  turnosHoy: turnos,
  onNavegarSeccion,
  ocultarSueldo,
  nominaHabilitada,
  puedeAgregar = false,
  onEmpleadoCreado,
}) => {
  const v = useVocabularioPersonal();
  const hoy = fechaLocal(new Date());
  const haceUnaSemana = fechaLocal(new Date(Date.now() - 6 * 86400000));

  const activos = empleados.filter((e) => e.estado === 'ACTIVO');
  const deHoy = asistencias.filter((a) => a.fecha === hoy);
  const trabajandoAhora = deHoy.filter((a) => !a.horaSalidaReal);
  const yaMarcaron = new Set(deHoy.map((a) => a.empleadoId));
  const faltan = activos.filter((e) => !yaMarcaron.has(e.id));
  const usanMarcaje = asistencias.length > 0;
  const horasSemana = asistencias.filter((a) => a.fecha >= haceUnaSemana).reduce((s, a) => s + (a.horasTrabajadas || 0), 0);
  const horariosDeHoy = turnos.filter((t) => t.fecha === hoy);

  const porArea = empleados.reduce<Record<string, number>>((acc, emp) => {
    acc[emp.departamento] = (acc[emp.departamento] || 0) + 1;
    return acc;
  }, {});

  if (empleados.length === 0) {
    return <PrimerTrabajador puedeAgregar={puedeAgregar} onCreado={onEmpleadoCreado} />;
  }

  const Numero = ({ valor, texto, color, onClick }: { valor: number | string; texto: string; color: string; onClick?: () => void }) => (
    <button type="button" onClick={onClick} className="text-left p-4 bg-white border border-slate-200 rounded-2xl hover:border-[#177E89]/50 transition-colors cursor-pointer">
      <div className={`text-3xl font-bold ${color}`}>{valor}</div>
      <div className="text-sm text-slate-600 mt-1">{texto}</div>
    </button>
  );

  return (
    <div className="space-y-6">
      {puedeAgregar && (
        <div className="flex justify-end">
          <AgregarTrabajador onCreado={onEmpleadoCreado} />
        </div>
      )}

      {/* Hoy */}
      <section className="space-y-3">
        <h3 className="text-base font-bold text-slate-900">Hoy en {v.tuNegocio}</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Numero valor={trabajandoAhora.length} texto="Trabajando ahora" color="text-[#177E89]" onClick={() => onNavegarSeccion('asistencia')} />
          <Numero valor={yaMarcaron.size} texto="Ya marcaron hoy" color="text-slate-900" onClick={() => onNavegarSeccion('asistencia')} />
          <Numero valor={usanMarcaje ? faltan.length : '—'} texto="Faltan por marcar" color={faltan.length > 0 && usanMarcaje ? 'text-amber-600' : 'text-slate-900'} onClick={() => onNavegarSeccion('asistencia')} />
          <Numero valor={`${Math.round(horasSemana)} h`} texto="Trabajadas en 7 días" color="text-slate-900" onClick={() => onNavegarSeccion('asistencia')} />
        </div>
        {!usanMarcaje && (
          <p className="text-sm text-slate-500">
            Todavía nadie ha marcado entrada. Puedes registrarla tú en Asistencia, o darle a cada {v.persona} acceso para que marque desde su teléfono (en su ficha).
          </p>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quién está y quién falta */}
        <section className="p-5 bg-white border border-slate-200 rounded-2xl space-y-3">
          <h3 className="text-base font-bold text-slate-900">Quién está trabajando</h3>
          {trabajandoAhora.length === 0 ? (
            <p className="text-sm text-slate-500">Nadie tiene una entrada abierta en este momento.</p>
          ) : (
            <ul className="space-y-2">
              {trabajandoAhora.map((a) => (
                <li key={a.id} className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-800">{a.empleadoNombre}</span>
                  <span className="text-slate-500">desde las {a.horaEntradaReal}</span>
                </li>
              ))}
            </ul>
          )}
          {usanMarcaje && faltan.length > 0 && (
            <div className="pt-3 border-t border-slate-100">
              <div className="text-sm font-semibold text-amber-700 mb-1">No han marcado hoy</div>
              <p className="text-sm text-slate-600">{faltan.slice(0, 8).map((e) => e.nombre).join(', ')}{faltan.length > 8 ? ` y ${faltan.length - 8} más` : ''}</p>
            </div>
          )}
        </section>

        {/* Horarios de hoy */}
        <section className="p-5 bg-white border border-slate-200 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">{v.turnosTitulo}</h3>
            <button onClick={() => onNavegarSeccion('turnos')} className="text-sm text-[#177E89] font-semibold hover:underline cursor-pointer">
              {v.turnosAccion} →
            </button>
          </div>
          {horariosDeHoy.length === 0 ? (
            <p className="text-sm text-slate-500">No hay horarios asignados para hoy.</p>
          ) : (
            <ul className="space-y-2">
              {horariosDeHoy.map((t) => (
                <li key={t.id} className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-800">{t.empleadoNombre}</span>
                  <span className="text-slate-500">{t.turnoNombre}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Equipo */}
        <section className="p-5 bg-white border border-slate-200 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">{v.distribucion}</h3>
            <button onClick={() => onNavegarSeccion('empleados')} className="text-sm text-[#177E89] font-semibold hover:underline cursor-pointer">
              Ver {v.personas} →
            </button>
          </div>
          <p className="text-sm text-slate-600">{activos.length} {activos.length === 1 ? v.persona : v.personas} activos de {empleados.length}.</p>
          <div className="space-y-2">
            {Object.entries(porArea).map(([area, cantidad]) => (
              <div key={area} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700">{v.nombreArea(area)}</span>
                  <span className="text-slate-500">{cantidad}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-[#177E89] h-full rounded-full" style={{ width: `${Math.round((cantidad / empleados.length) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pagos */}
        {nominaHabilitada && (
          <section className="p-5 bg-white border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Último pago de nómina</h3>
              <EstadoNominaBadge estado={periodoActual.estado} />
            </div>
            <div className="text-2xl font-bold text-[#177E89]">
              {ocultarSueldo ? '••••••' : formatearMoneda(periodoActual.montoTotalNeto, periodoActual.monedaPrincipal)}
            </div>
            <p className="text-sm text-slate-500">{periodoActual.nombre}</p>
            <button onClick={() => onNavegarSeccion('nomina')} className="text-sm text-[#177E89] font-semibold hover:underline cursor-pointer">
              Ver nómina →
            </button>
          </section>
        )}
      </div>
    </div>
  );
};

/** Primer paso cuando todavía no hay nadie registrado. */
const PrimerTrabajador: React.FC<{ puedeAgregar: boolean; onCreado?: () => void }> = ({ puedeAgregar, onCreado }) => {
  const v = useVocabularioPersonal();
  return (
    <div className="p-8 bg-white border border-dashed border-slate-300 rounded-2xl text-center space-y-3">
      <h3 className="text-lg font-bold text-slate-900">Agrega a tu primer {v.persona}</h3>
      <p className="text-sm text-slate-600 max-w-md mx-auto">
        Con tu equipo registrado vas a ver quién está trabajando, quién faltó, cuántas horas trabajó cada uno y lo que toca pagar.
      </p>
      {puedeAgregar ? <AgregarTrabajador onCreado={onCreado} grande /> : (
        <p className="text-sm text-slate-500">Pide al dueño del negocio que registre al equipo.</p>
      )}
    </div>
  );
};

/** Alta rápida: nombre, cédula y fecha de ingreso. */
const AgregarTrabajador: React.FC<{ onCreado?: () => void; grande?: boolean }> = ({ onCreado, grande = false }) => {
  const v = useVocabularioPersonal();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState('');
  const [cedula, setCedula] = useState('');
  const [ingreso, setIngreso] = useState(fechaLocal(new Date()));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!nombre.trim() || !cedula.trim()) { setError('Escribe el nombre y la cédula.'); return; }
    setGuardando(true);
    try {
      await crearEmpleadoPersonal({ nombreCompleto: nombre.trim(), documentoIdentidad: cedula.trim(), fechaIngreso: ingreso });
      setNombre(''); setCedula(''); setAbierto(false);
      onCreado?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)}
        style={{ backgroundColor: '#0F766E', color: '#FFFFFF' }}
        className={`${grande ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm'} rounded-xl font-bold cursor-pointer`}>
        + Agregar {v.persona}
      </button>
    );
  }
  return (
    <form onSubmit={guardar} className="w-full max-w-md mx-auto text-left p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
      <div className="text-sm font-bold text-slate-900">Nuevo {v.persona}</div>
      <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre y apellido" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm" autoFocus />
      <input value={cedula} onChange={(e) => setCedula(e.target.value)} placeholder="Cédula (ej. V-12345678)" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm" />
      <label className="block text-xs text-slate-500">Fecha de ingreso
        <input type="date" value={ingreso} onChange={(e) => setIngreso(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm" />
      </label>
      {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => setAbierto(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 cursor-pointer">Cancelar</button>
        <button type="submit" disabled={guardando} style={{ backgroundColor: '#0F766E', color: '#FFFFFF' }} className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-60">
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
};
