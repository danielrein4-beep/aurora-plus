import React, { useState } from 'react';
import { Empleado, DepartamentoPersonal, EstadoEmpleado, formatearMoneda } from './types';
import { useVocabularioPersonal } from './vocabulario';

interface ListaEmpleadosProps {
  empleados: Empleado[];
  onSeleccionarEmpleado: (empleado: Empleado) => void;
  ocultarSueldo: boolean;
  onAlternarPrivacidadSueldo: () => void;
}

export const ListaEmpleados: React.FC<ListaEmpleadosProps> = ({
  empleados,
  onSeleccionarEmpleado,
  ocultarSueldo,
  onAlternarPrivacidadSueldo,
}) => {
  const v = useVocabularioPersonal();
  const [busqueda, setBusqueda] = useState('');
  const [deptoFiltro, setDeptoFiltro] = useState<string>('TODOS');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('TODOS');

  const departamentos: (DepartamentoPersonal | 'TODOS')[] = ['TODOS', ...v.areas];

  const filtrados = empleados.filter((emp) => {
    const coincideTexto =
      emp.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      emp.apellidos.toLowerCase().includes(busqueda.toLowerCase()) ||
      emp.cargo.toLowerCase().includes(busqueda.toLowerCase()) ||
      emp.identificacion.toLowerCase().includes(busqueda.toLowerCase()) ||
      emp.codigoEmpleado.toLowerCase().includes(busqueda.toLowerCase());

    const coincideDepto = deptoFiltro === 'TODOS' || emp.departamento === deptoFiltro;
    const coincideEstado = estadoFiltro === 'TODOS' || emp.estado === estadoFiltro;

    return coincideTexto && coincideDepto && coincideEstado;
  });

  const getEstadoBadge = (estado: EstadoEmpleado) => {
    switch (estado) {
      case 'ACTIVO':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-light uppercase tracking-wide text-[#177E89] bg-[#177E89]/10 px-2 py-0.5 rounded-full border border-[#177E89]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#177E89]" />
            Activo
          </span>
        );
      case 'DE_VACACIONES':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-light uppercase tracking-wide text-amber-600 bg-[#fbbf24]/10 px-2 py-0.5 rounded-full border border-[#fbbf24]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24]" />
            Vacaciones
          </span>
        );
      case 'LICENCIA':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-light uppercase tracking-wide text-sky-600 bg-[#38bdf8]/10 px-2 py-0.5 rounded-full border border-[#38bdf8]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
            Licencia
          </span>
        );
      case 'INACTIVO':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-light uppercase tracking-wide text-rose-600 bg-[#f87171]/10 px-2 py-0.5 rounded-full border border-[#f87171]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f87171]" />
            Inactivo
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra superior de controles y filtros */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Buscador */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Buscar por nombre, cargo, cédula o código..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 placeholder-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#177E89]"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="absolute right-2.5 top-2.5 text-xs text-slate-500 hover:text-slate-900"
              aria-label="Limpiar búsqueda"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filtros de Departamento y Estado */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={deptoFiltro}
            onChange={(e) => setDeptoFiltro(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#177E89]"
          >
            {departamentos.map((d) => (
              <option key={d} value={d}>
                {d === 'TODOS' ? v.todasLasAreas : v.nombreArea(d)}
              </option>
            ))}
          </select>

          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#177E89]"
          >
            <option value="TODOS">Todos los Estados</option>
            <option value="ACTIVO">Activos</option>
            <option value="DE_VACACIONES">De Vacaciones</option>
            <option value="LICENCIA">Con Licencia</option>
            <option value="INACTIVO">Inactivos</option>
          </select>

          {/* Botón de Privacidad Salarial */}
          <button
            onClick={onAlternarPrivacidadSueldo}
            className={`px-3 py-2 rounded-lg text-xs font-light uppercase tracking-wide border flex items-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#177E89] ${
              ocultarSueldo
                ? 'bg-slate-100 border-slate-300 text-slate-500 hover:text-slate-900'
                : 'bg-[#177E89]/15 border-[#177E89]/40 text-[#177E89]'
            }`}
            title="Alternar modo privacidad de remuneraciones"
          >
            <span>{ocultarSueldo ? 'Sueldos ocultos' : 'Sueldos visibles'}</span>
          </button>
        </div>
      </div>

      {/* Lista de Empleados: Vista Tarjetas (Móvil / Tablet 360-768px) */}
      <div className="grid grid-cols-1 md:hidden gap-3">
        {filtrados.map((emp) => (
          <div
            key={emp.id}
            onClick={() => onSeleccionarEmpleado(emp)}
            className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 cursor-pointer hover:border-[#177E89]/50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#177E89]"
            tabIndex={0}
            role="button"
            onKeyDown={(e) => e.key === 'Enter' && onSeleccionarEmpleado(emp)}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-[#177E89] font-light uppercase tracking-wide">{emp.codigoEmpleado}</span>
                  {getEstadoBadge(emp.estado)}
                </div>
                <h4 className="font-bold tracking-tight text-slate-900 text-sm mt-0.5">
                  {emp.nombre} {emp.apellidos}
                </h4>
                <p className="text-xs font-light uppercase tracking-wide text-slate-500">{emp.cargo}</p>
              </div>
              <span className="text-xs text-slate-500 font-mono">{emp.identificacion}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200">
              <div>
                <span className="text-slate-500 block text-[10px] font-light uppercase tracking-wide">{v.area}</span>
                <span className="text-slate-700 truncate block font-light uppercase tracking-wide">{v.nombreArea(emp.departamento)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-light uppercase tracking-wide">Sueldo pactado</span>
                <span className="font-mono font-light uppercase tracking-wide text-[#177E89]">
                  {ocultarSueldo ? '••••••' : formatearMoneda(emp.salarioBaseReferencial, emp.moneda)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-light uppercase tracking-wide text-slate-500 pt-1">
              <span>Turno: {emp.turnoAsignado}</span>
              <span className="text-[#177E89] font-light uppercase tracking-wide">Ver Ficha &rarr;</span>
            </div>
          </div>
        ))}
        {filtrados.length === 0 && (
          <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-xs font-light uppercase tracking-wide text-slate-500">
            No se encontraron {v.personas} con los criterios seleccionados.
          </div>
        )}
      </div>

      {/* Lista de Empleados: Vista Tabla (Desktop 768px+) */}
      <div className="hidden md:block bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white text-slate-500 border-b border-slate-200 uppercase tracking-wider font-light">
              <tr>
                <th className="py-3 px-4">Código / Cédula</th>
                <th className="py-3 px-4">{v.Persona}</th>
                <th className="py-3 px-4">{v.area} / Cargo</th>
                <th className="py-3 px-4">Turno Asignado</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Sueldo pactado</th>
                <th className="py-3 px-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {filtrados.map((emp) => (
                <tr
                  key={emp.id}
                  className="hover:bg-slate-100 transition-colors cursor-pointer"
                  onClick={() => onSeleccionarEmpleado(emp)}
                >
                  <td className="py-3 px-4">
                    <div className="font-mono text-[#177E89] font-light uppercase tracking-wide">{emp.codigoEmpleado}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{emp.identificacion}</div>
                  </td>
                  <td className="py-3 px-4 font-bold tracking-tight text-slate-900">
                    <div>
                      {emp.nombre} {emp.apellidos}
                    </div>
                    <div className="text-[11px] text-slate-500 font-light uppercase tracking-wide">{emp.email}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold tracking-tight text-slate-900">{v.nombreArea(emp.departamento)}</div>
                    <div className="text-[11px] text-slate-500 font-light uppercase tracking-wide">{emp.cargo}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-light uppercase tracking-wide">{emp.turnoAsignado}</td>
                  <td className="py-3 px-4">{getEstadoBadge(emp.estado)}</td>
                  <td className="py-3 px-4 text-right font-mono font-light uppercase tracking-wide text-[#177E89]">
                    {ocultarSueldo ? '••••••' : formatearMoneda(emp.salarioBaseReferencial, emp.moneda)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSeleccionarEmpleado(emp);
                      }}
                      className="px-2.5 py-1 rounded bg-white border border-slate-200 text-xs font-light uppercase tracking-wide text-[#177E89] hover:border-[#177E89]/50 focus:outline-none focus:ring-2 focus:ring-[#177E89]"
                    >
                      Ver Ficha
                    </button>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-light uppercase tracking-wide">
                    No se encontraron {v.personas} con los criterios seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
