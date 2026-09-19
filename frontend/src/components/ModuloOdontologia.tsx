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
import PeriodontogramaInteractivo from "./PeriodontogramaInteractivo";
import PlanesTratamientoFases from "./PlanesTratamientoFases";
import VisorRadiografiasDental from "./VisorRadiografiasDental";
import AgendaSillonesOdontologia from "./AgendaSillonesOdontologia";

interface ModuloOdontologiaProps {
  pacientes: Paciente[] | null;
  pacienteInicialId?: number | null;
  config: any;
  onSeleccionarPaciente?: (id: number) => void;
  onIrAHistorias?: (id: number) => void;
  onIrACotizador?: (id: number) => void;
}

type PestanaOdonto = "odontograma" | "periodonto" | "planes" | "agenda" | "radiografias";

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

  const [pestanaActiva, setPestanaActiva] = useState<PestanaOdonto>("odontograma");
  const [busqueda, setBusqueda] = useState("");

  const pacienteSeleccionado = useMemo(() => {
    if (!pacientes || !pacienteId) return null;
    return pacientes.find((p) => p.id === pacienteId) || null;
  }, [pacientes, pacienteId]);

  const seleccionarPaciente = (id: number) => {
    setPacienteId(id);
    if (onSeleccionarPaciente) onSeleccionarPaciente(id);
  };

  const pacientesFiltrados = useMemo(() => {
    if (!pacientes) return [];
    if (!busqueda.trim()) return pacientes.slice(0, 8);
    const q = busqueda.toLowerCase().trim();
    return pacientes
      .filter(
        (p) =>
          p.nombreCompleto.toLowerCase().includes(q) ||
          (p.identificacion && p.identificacion.toLowerCase().includes(q))
      )
      .slice(0, 10);
  }, [pacientes, busqueda]);

  const tasaBcvNum = useMemo(() => {
    if (config?.tasaBcv && typeof config.tasaBcv === "number") return config.tasaBcv;
    if (config?.tasaCambio && typeof config.tasaCambio === "number") return config.tasaCambio;
    return 50.0;
  }, [config]);

  return (
    <div className="space-y-6">
      {/* Cabecera Principal del Modulo Dental */}
      <div className="apple-glass rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#071322]/70 text-left shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <IconTooth size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white leading-tight">
                  Odontologia Especializada & Clinica Dental
                </h2>
                <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-mono">
                  OdontoPlus Pro
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-white/60">
                Odontograma anatomico FDI, periodontograma de 6 puntos, presupuestos por fases, agenda por sillones y visor radiografico
              </p>
            </div>
          </div>

          {/* Selector / Buscador Rapido de Paciente */}
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
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
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

            {/* Dropdown flotante si se esta buscando */}
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
                        <span className="text-[10px] text-slate-400 font-mono">CI: {p.identificacion || "S/C"}</span>
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

        {/* Ficha Rapida del Paciente Seleccionado */}
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
                    CI: {pacienteSeleccionado.identificacion || "No registrada"}
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
                  title="Ver expediente clinico completo en Historias Clinicas"
                >
                  <IconFileText size={14} />
                  <span>Historia Clinica</span>
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
            <span>Ningun paciente seleccionado. Busca un paciente arriba para cargar su expediente odontologico.</span>
          </div>
        )}

        {/* Barra de Pestanas de Navegacion Clinica */}
        <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-white/10 flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setPestanaActiva("odontograma")}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              pestanaActiva === "odontograma"
                ? "bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20"
                : "bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300"
            }`}
          >
            <span>Odontograma FDI & Superficies</span>
          </button>

          <button
            type="button"
            onClick={() => setPestanaActiva("periodonto")}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              pestanaActiva === "periodonto"
                ? "bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20"
                : "bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300"
            }`}
          >
            <span>Periodontograma (6 Puntos & BOP)</span>
          </button>

          <button
            type="button"
            onClick={() => setPestanaActiva("planes")}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              pestanaActiva === "planes"
                ? "bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20"
                : "bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300"
            }`}
          >
            <span>Planes de Tratamiento & Fases</span>
          </button>

          <button
            type="button"
            onClick={() => setPestanaActiva("agenda")}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              pestanaActiva === "agenda"
                ? "bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20"
                : "bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300"
            }`}
          >
            <span>Agenda de Sillones & Recordatorios WA</span>
          </button>

          <button
            type="button"
            onClick={() => setPestanaActiva("radiografias")}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              pestanaActiva === "radiografias"
                ? "bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20"
                : "bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300"
            }`}
          >
            <span>Radiografias & Imagenologia</span>
          </button>
        </div>
      </div>

      {/* Vistas segun la pestana activa */}
      {pacienteSeleccionado ? (
        <>
          {pestanaActiva === "odontograma" && (
            <Odontograma
              pacienteId={pacienteSeleccionado.id}
              nombrePaciente={pacienteSeleccionado.nombreCompleto}
              cedulaPaciente={pacienteSeleccionado.identificacion}
              tasaBcv={tasaBcvNum}
            />
          )}

          {pestanaActiva === "periodonto" && (
            <PeriodontogramaInteractivo
              pacienteId={pacienteSeleccionado.id}
              pacienteNombre={pacienteSeleccionado.nombreCompleto}
            />
          )}

          {pestanaActiva === "planes" && (
            <PlanesTratamientoFases
              pacienteId={pacienteSeleccionado.id}
              pacienteNombre={pacienteSeleccionado.nombreCompleto}
              tasaBcv={tasaBcvNum}
            />
          )}

          {pestanaActiva === "agenda" && (
            <AgendaSillonesOdontologia
              pacientes={pacientes}
              pacienteActivoId={pacienteSeleccionado.id}
            />
          )}

          {pestanaActiva === "radiografias" && (
            <VisorRadiografiasDental
              pacienteId={pacienteSeleccionado.id}
              pacienteNombre={pacienteSeleccionado.nombreCompleto}
            />
          )}
        </>
      ) : (
        <div className="apple-glass rounded-3xl p-8 border border-dashed border-slate-300 dark:border-white/10 text-center space-y-3 bg-white/50 dark:bg-[#071322]/40">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-400 flex items-center justify-center">
            <IconUser size={24} />
          </div>
          <h3 className="font-['Outfit'] font-bold text-slate-800 dark:text-white text-base">
            Selecciona un Paciente Odontologico
          </h3>
          <p className="text-xs text-slate-500 dark:text-white/60 max-w-md mx-auto">
            Utiliza el buscador en la barra superior para cargar su odontograma interactivo, periodontograma, planes por fases y radiografias.
          </p>
        </div>
      )}
    </div>
  );
}
