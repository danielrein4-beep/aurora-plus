import React, { useState, useMemo } from "react";
import {
  IconTooth,
  IconSearch,
  IconUser,
  IconFileText,
  IconCoins,
  IconPhone,
  IconCalendar,
  IconClose,
} from "../Icons";
import { type Paciente } from "../api";
import Odontograma from "./Odontograma";

interface ModuloOdontologiaProps {
  pacientes: Paciente[] | null;
  pacienteInicialId?: number | null;
  config: any;
  onSeleccionarPaciente?: (id: number) => void;
  onIrAHistorias?: (id: number) => void;
  onIrACotizador?: (id: number) => void;
}

export default function ModuloOdontologia({
  pacientes,
  pacienteInicialId,
  config,
  onSeleccionarPaciente,
  onIrAHistorias,
  onIrACotizador,
}: ModuloOdontologiaProps) {
  const [pacienteId, setPacienteId] = useState<number | null>(() => {
    if (pacienteInicialId) return pacienteInicialId;
    if (pacientes && pacientes.length > 0) return pacientes[0].id;
    return null;
  });

  const [busqueda, setBusqueda] = useState("");

  const pacienteSeleccionado = useMemo(() => {
    if (!pacienteId || !pacientes) return null;
    return pacientes.find((p) => p.id === pacienteId) || null;
  }, [pacienteId, pacientes]);

  const pacientesFiltrados = useMemo(() => {
    if (!pacientes) return [];
    const q = busqueda.trim().toLowerCase();
    if (!q) return pacientes;
    return pacientes.filter(
      (p) =>
        p.nombreCompleto.toLowerCase().includes(q) ||
        (p.cedula && p.cedula.toLowerCase().includes(q)) ||
        (p.telefono && p.telefono.toLowerCase().includes(q))
    );
  }, [pacientes, busqueda]);

  const seleccionarPaciente = (id: number) => {
    setPacienteId(id);
    if (onSeleccionarPaciente) onSeleccionarPaciente(id);
  };

  const tasaBcvNum = Number(config?.tasaBCV) || 36.5;

  return (
    <div className="space-y-6">
      {/* Barra Superior del Módulo Odontológico */}
      <div className="apple-glass rounded-3xl p-5 sm:p-6 border border-slate-300/70 dark:border-white/10 shadow-sm bg-white/90 dark:bg-[#071322]/80">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
              <IconTooth size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-['Outfit'] font-black text-slate-900 dark:text-white text-xl">
                  Módulo de Odontología & Salud Bucal
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  Mediclinic Odonto
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-white/60">
                Gestión clínica dental, odontograma internacional FDI, superficies dentales y planes de tratamiento
              </p>
            </div>
          </div>

          {/* Selector / Buscador Rápido de Paciente */}
          <div className="w-full md:w-80 relative">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <IconSearch size={16} />
              </span>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar paciente por nombre o CI..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {busqueda && (
                <button
                  onClick={() => setBusqueda("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <IconClose size={14} />
                </button>
              )}
            </div>

            {/* Dropdown flotante si se está buscando */}
            {busqueda.trim().length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-white dark:bg-[#0c1421] border border-slate-200 dark:border-white/15 rounded-2xl shadow-xl max-h-56 overflow-y-auto p-1">
                {pacientesFiltrados.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400">
                    No se encontraron pacientes para &quot;{busqueda}&quot;
                  </div>
                ) : (
                  pacientesFiltrados.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        seleccionarPaciente(p.id);
                        setBusqueda("");
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center justify-between transition-colors"
                    >
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">{p.nombreCompleto}</span>
                        <span className="text-[10px] text-slate-400 font-mono">CI: {p.cedula || "S/C"}</span>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400">
                        Cargar
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Ficha Rápida del Paciente Seleccionado */}
        {pacienteSeleccionado ? (
          <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white flex items-center justify-center font-bold font-mono text-sm border border-slate-200 dark:border-white/10">
                {pacienteSeleccionado.nombreCompleto.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {pacienteSeleccionado.nombreCompleto}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                    CI: {pacienteSeleccionado.cedula || "No registrada"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-white/60 mt-0.5">
                  {pacienteSeleccionado.telefono && (
                    <span className="flex items-center gap-1 font-mono">
                      <IconPhone size={12} />
                      {pacienteSeleccionado.telefono}
                    </span>
                  )}
                  {pacienteSeleccionado.fechaNacimiento && (
                    <span className="flex items-center gap-1">
                      <IconCalendar size={12} />
                      Nac: {pacienteSeleccionado.fechaNacimiento}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Accesos directos a Historia y Procedimientos */}
            <div className="flex items-center gap-2">
              {onIrAHistorias && (
                <button
                  type="button"
                  onClick={() => onIrAHistorias(pacienteSeleccionado.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-white/10 text-slate-700 dark:text-white/80 hover:bg-slate-100 dark:hover:bg-white/5 text-xs font-semibold transition-all"
                  title="Ver expediente clínico completo en Historias Clínicas"
                >
                  <IconFileText size={14} />
                  <span>Historia Clínica</span>
                </button>
              )}
              {onIrACotizador && (
                <button
                  type="button"
                  onClick={() => onIrACotizador(pacienteSeleccionado.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all shadow-sm"
                  title="Ir al cotizador de procedimientos para este paciente"
                >
                  <IconCoins size={14} />
                  <span>Cotizar Tratamiento</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between text-xs text-slate-400">
            <span>Ningún paciente seleccionado. Busca un paciente arriba o selecciónalo de la lista para ver su odontograma.</span>
          </div>
        )}
      </div>

      {/* Odontograma del Paciente Seleccionado */}
      {pacienteSeleccionado ? (
        <Odontograma
          pacienteId={pacienteSeleccionado.id}
          nombrePaciente={pacienteSeleccionado.nombreCompleto}
          cedulaPaciente={pacienteSeleccionado.cedula}
          tasaBcv={tasaBcvNum}
        />
      ) : (
        <div className="apple-glass rounded-3xl p-8 border border-dashed border-slate-300 dark:border-white/10 text-center space-y-3 bg-white/50 dark:bg-[#071322]/40">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-400 flex items-center justify-center">
            <IconUser size={24} />
          </div>
          <h3 className="font-['Outfit'] font-bold text-slate-800 dark:text-white text-base">
            Selecciona un Paciente Odontológico
          </h3>
          <p className="text-xs text-slate-500 dark:text-white/60 max-w-md mx-auto">
            Utiliza el buscador en la barra superior o selecciona un paciente registrado en el consultorio para cargar su odontograma interactivo, registrar superficies y generar presupuestos.
          </p>
        </div>
      )}
    </div>
  );
}
