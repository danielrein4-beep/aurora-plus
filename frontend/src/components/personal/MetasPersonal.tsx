import React, { useState } from 'react';
import { MetaPersonal, DepartamentoPersonal, TipoMeta } from './types';

interface MetasPersonalProps {
  metas: MetaPersonal[];
}

export const MetasPersonal: React.FC<MetasPersonalProps> = ({ metas }) => {
  const [tipoFiltro, setTipoFiltro] = useState<'TODAS' | TipoMeta>('TODAS');
  const [deptoFiltro, setDeptoFiltro] = useState<string>('TODOS');
  const [toastMensaje, setToastMensaje] = useState<string | null>(null);

  const mostrarNotificacion = (msg: string) => {
    setToastMensaje(msg);
    setTimeout(() => setToastMensaje(null), 3000);
  };

  const departamentos: (DepartamentoPersonal | 'TODOS')[] = [
    'TODOS',
    'Médico',
    'Enfermería',
    'Administración',
    'Laboratorio / Farmacia',
    'Operaciones / Servicios',
    'Soporte y Sistemas',
  ];

  const filtradas = metas.filter((m) => {
    const coincideTipo = tipoFiltro === 'TODAS' || m.tipo === tipoFiltro;
    const coincideDepto =
      deptoFiltro === 'TODOS' ||
      m.departamentoObjetivo === deptoFiltro ||
      m.departamentoObjetivo === 'TODOS';
    return coincideTipo && coincideDepto;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMensaje && (
        <div className="p-3 bg-[#10b981]/20 border border-[#10b981]/40 rounded-xl text-xs text-[#34d399] font-medium flex items-center justify-between animate-fade-in">
          <span>{toastMensaje}</span>
          <button onClick={() => setToastMensaje(null)} className="text-xs text-[#34d399] hover:underline">
            ✕
          </button>
        </div>
      )}

      {/* Declaración de Rendimiento No Punitivo */}
      <div className="p-4 bg-[#131c2e] border border-[#1e2d48] rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#35d7c3]" />
            <h3 className="font-bold text-[#f8fafc]">
              Garantía de Rendimiento No Punitivo
            </h3>
            <span className="px-2 py-0.2 rounded bg-[#35d7c3]/15 text-[#35d7c3] font-mono text-[10px]">
              Política Ética Aurora Plus
            </span>
          </div>
          <p className="text-[#94a3b8] leading-relaxed">
            Las metas y métricas del personal son herramientas formativas de excelencia clínica y operativa. Ningún algoritmo ni objetivo incumplido ejecuta sanciones automáticas, reducciones forzosas de honorarios ni despidos.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-[#cbd5e1] bg-[#0b111e] px-3 py-2 rounded-lg border border-[#1e293b] whitespace-nowrap">
          <span>🎯 {metas.filter((m) => m.estado === 'COMPLETADA').length} de {metas.length} Logradas</span>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="p-4 bg-[#131c2e] border border-[#1e2d48] rounded-xl flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="tipo-meta" className="text-xs text-[#94a3b8] font-medium">
              Tipo de Meta:
            </label>
            <select
              id="tipo-meta"
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value as any)}
              className="bg-[#0b111e] border border-[#1e293b] rounded-lg px-3 py-1.5 text-xs text-[#cbd5e1] focus:outline-none focus:ring-2 focus:ring-[#35d7c3]"
            >
              <option value="TODAS">Todas (Automáticas y Manuales)</option>
              <option value="AUTOMATICA">Solo Automáticas [Sistema]</option>
              <option value="MANUAL">Solo Manuales [Supervisión]</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="depto-meta" className="text-xs text-[#94a3b8] font-medium">
              Departamento:
            </label>
            <select
              id="depto-meta"
              value={deptoFiltro}
              onChange={(e) => setDeptoFiltro(e.target.value)}
              className="bg-[#0b111e] border border-[#1e293b] rounded-lg px-3 py-1.5 text-xs text-[#cbd5e1] focus:outline-none focus:ring-2 focus:ring-[#35d7c3]"
            >
              {departamentos.map((d) => (
                <option key={d} value={d}>
                  {d === 'TODOS' ? 'Todos los Departamentos' : d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => mostrarNotificacion('Formulario de nueva meta formativa abierto [DEMO]')}
          className="px-3.5 py-2 rounded-lg bg-[#35d7c3] hover:bg-[#28b8a6] text-black font-semibold text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-white"
        >
          + Crear Meta Formativa [DEMO]
        </button>
      </div>

      {/* Grid de Metas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtradas.map((meta) => {
          const porcentaje = Math.min(100, Math.round((meta.progresoActual / meta.metaValor) * 100));
          const esAutomatica = meta.tipo === 'AUTOMATICA';

          return (
            <div
              key={meta.id}
              className="p-5 bg-[#131c2e] border border-[#1e2d48] rounded-xl space-y-4 hover:border-[#35d7c3]/40 transition-colors flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                          esAutomatica
                            ? 'bg-[#38bdf8]/15 text-[#38bdf8] border-[#38bdf8]/30'
                            : 'bg-[#a855f7]/15 text-[#a855f7] border-[#a855f7]/30'
                        }`}
                      >
                        {esAutomatica ? '⚡ Automática (ERP)' : '📝 Manual (Supervisión)'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#0b111e] text-[#94a3b8]">
                        {meta.departamentoObjetivo}
                      </span>
                    </div>
                    <h4 className="font-semibold text-[#f8fafc] text-sm mt-1.5">{meta.titulo}</h4>
                  </div>

                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      meta.estado === 'COMPLETADA'
                        ? 'bg-[#10b981]/15 text-[#34d399]'
                        : 'bg-[#fbbf24]/15 text-[#fbbf24]'
                    }`}
                  >
                    {meta.estado === 'COMPLETADA' ? 'Cumplida' : 'En progreso'}
                  </span>
                </div>

                <p className="text-xs text-[#94a3b8] leading-relaxed">{meta.descripcion}</p>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#1e293b]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#64748b]">Progreso computado:</span>
                  <span className="font-mono font-bold text-[#35d7c3]">
                    {meta.progresoActual} / {meta.metaValor} {meta.unidadMedida} ({porcentaje}%)
                  </span>
                </div>

                <div className="w-full bg-[#0b111e] h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      meta.estado === 'COMPLETADA' ? 'bg-[#35d7c3]' : 'bg-[#38bdf8]'
                    }`}
                    style={{ width: `${porcentaje}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#64748b] pt-1">
                  <span>Fuente: {meta.origenMetrica}</span>
                  <span className="font-mono">Límite: {meta.fechaLimite}</span>
                </div>

                {meta.premioOReconocimiento && (
                  <div className="p-2 bg-[#0b111e] rounded-lg border border-[#1e293b] text-[11px] text-[#cbd5e1] flex items-center gap-1.5">
                    <span>🏆</span>
                    <span>{meta.premioOReconocimiento}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
