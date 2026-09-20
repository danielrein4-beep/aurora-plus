import React, { useState, useMemo } from "react";
import { ProyectoConstruccion, PartidaObra, ValuacionObra, ItemValuacion, EstadoValuacion } from "./types";
import {
  IconCheck,
  IconClock,
  IconClose,
  IconPlus,
  IconFileText,
  IconCard,
  IconConstruction,
} from "../../Icons";

interface Props {
  proyecto: ProyectoConstruccion;
  partidas: PartidaObra[];
  valuaciones: ValuacionObra[];
  tasaBcv: number;
  onCrearValuacion: (val: ValuacionObra) => void;
  onCambiarEstadoValuacion: (id: string, nuevoEstado: EstadoValuacion) => void;
}

export default function ValuacionesAvanceView({
  proyecto,
  partidas,
  valuaciones,
  tasaBcv,
  onCrearValuacion,
  onCambiarEstadoValuacion,
}: Props) {
  const [valuacionActivaId, setValuacionActivaId] = useState<string>(
    valuaciones[valuaciones.length - 1]?.id || ""
  );
  const [modalNuevaValuacion, setModalNuevaValuacion] = useState(false);

  // Form nueva valuación
  const [periodoDesde, setPeriodoDesde] = useState(new Date().toISOString().slice(0, 10));
  const [periodoHasta, setPeriodoHasta] = useState(new Date().toISOString().slice(0, 10));
  const [notasValuacion, setNotasValuacion] = useState("");
  // Mediciones de campo para la nueva valuación { partidaId: cantidadPeriodo }
  const [medicionesCampo, setMedicionesCampo] = useState<Record<string, number>>({});

  const valuacionActiva = useMemo(() => {
    return valuaciones.find((v) => v.id === valuacionActivaId) || valuaciones[0];
  }, [valuaciones, valuacionActivaId]);

  // Avance global acumulado de la obra
  const avanceGlobal = useMemo(() => {
    if (partidas.length === 0) return 0;
    const totalPresupuestado = partidas.reduce((acc, p) => acc + p.totalUSD, 0);
    if (totalPresupuestado === 0) return 0;

    // Sumar montos brutos de valuaciones aprobadas o cobradas
    const totalValuado = valuaciones
      .filter((v) => v.estado === "APROBADA" || v.estado === "COBRADA")
      .reduce((acc, v) => acc + v.montoBrutoUSD, 0);

    return Math.min(100, (totalValuado / totalPresupuestado) * 100);
  }, [partidas, valuaciones]);

  // Crear nueva valuación
  const handleGuardarNuevaValuacion = (e: React.FormEvent) => {
    e.preventDefault();

    const itemsValuacion: ItemValuacion[] = [];
    let montoBruto = 0;

    partidas.forEach((p) => {
      const cantidadPeriodo = medicionesCampo[p.id] || 0;
      if (cantidadPeriodo <= 0) return;

      // Calcular cantidad acumulada anterior en valuaciones previas
      const cantidadAnterior = valuaciones
        .filter((v) => v.estado !== "RECHAZADA" && v.estado !== "ANULADA")
        .reduce((acc, v) => {
          const itemPrev = v.items.find((it) => it.partidaId === p.id);
          return acc + (itemPrev ? itemPrev.cantidadPeriodo : 0);
        }, 0);

      const cantidadAcumulada = cantidadAnterior + cantidadPeriodo;
      const montoPeriodo = cantidadPeriodo * p.precioUnitarioUSD;
      // Auditoría Civil: Reflejar porcentaje real sin truncar para alertar sobre-cómputos
      const porcentajeAvance = Number(((cantidadAcumulada / (p.cantidad || 1)) * 100).toFixed(1));

      montoBruto += montoPeriodo;

      itemsValuacion.push({
        id: `item-val-${Date.now()}-${p.id}`,
        valuacionId: "",
        partidaId: p.id,
        cantidadAnterior,
        cantidadPeriodo,
        cantidadAcumulada,
        precioUnitarioUSD: p.precioUnitarioUSD,
        montoPeriodoUSD: montoPeriodo,
        porcentajeAvance,
      });
    });

    if (itemsValuacion.length === 0) {
      alert("Debes ingresar al menos una medición mayor a cero para crear la valuación.");
      return;
    }

    const amortizacion = (montoBruto * proyecto.anticipoPorcentaje) / 100;
    const retencion = (montoBruto * proyecto.retencionPorcentaje) / 100;
    const montoNeto = montoBruto - amortizacion - retencion;

    const nuevaVal: ValuacionObra = {
      id: `val-${Date.now()}`,
      proyectoId: proyecto.id,
      numeroValuacion: valuaciones.length + 1,
      fechaCorte: periodoHasta,
      periodoDesde,
      periodoHasta,
      montoBrutoUSD: montoBruto,
      amortizacionAnticipoUSD: amortizacion,
      retencionGarantiaUSD: retencion,
      montoNetoUSD: montoNeto,
      estado: "PRESENTADA",
      notas: notasValuacion.trim() || undefined,
      fechaRegistro: new Date().toISOString().slice(0, 10),
      items: itemsValuacion,
    };

    onCrearValuacion(nuevaVal);
    setValuacionActivaId(nuevaVal.id);
    setModalNuevaValuacion(false);
    setMedicionesCampo({});
    setNotasValuacion("");
  };
  return (
    <div className="space-y-6">
      {/* TARJETAS RESUMEN DE VALUACIONES Y AVANCE FÍSICO */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="apple-glass rounded-2xl p-4 border border-teal-500/30 bg-teal-500/10">
          <div className="text-teal-300 text-xs font-mono uppercase tracking-wider">Avance Físico Global</div>
          <div className="text-3xl font-black text-teal-300 font-['Outfit'] mt-1">
            {avanceGlobal.toFixed(1)}%
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-2">
            <div className="bg-teal-400 h-full rounded-full transition-all duration-500" style={{ width: `${avanceGlobal}%` }} />
          </div>
        </div>

        <div className="apple-glass rounded-2xl p-4 border border-white/10 bg-slate-900/40">
          <div className="text-white/50 text-xs font-mono uppercase tracking-wider">Valuaciones Emitidas</div>
          <div className="text-2xl font-black text-white font-['Outfit'] mt-1">{valuaciones.length}</div>
          <div className="text-[11px] text-teal-400 mt-0.5">Actas de medición registradas</div>
        </div>

        <div className="apple-glass rounded-2xl p-4 border border-amber-500/20 bg-amber-500/5">
          <div className="text-amber-300 text-xs font-mono uppercase tracking-wider">Anticipo & Retenciones</div>
          <div className="text-2xl font-black text-amber-400 font-['Outfit'] mt-1">
            {proyecto.anticipoPorcentaje}% / {proyecto.retencionPorcentaje}%
          </div>
          <div className="text-[11px] text-amber-300/70 mt-0.5">Amortización y Fiel Cumplimiento</div>
        </div>

        <div className="apple-glass rounded-2xl p-4 border border-emerald-500/20 bg-emerald-500/5">
          <div className="text-emerald-300 text-xs font-mono uppercase tracking-wider">Total Neto Valuado</div>
          <div className="text-2xl font-black text-emerald-400 font-['Outfit'] mt-1">
            ${valuaciones.reduce((acc, v) => acc + v.montoNetoUSD, 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-emerald-300/70 mt-0.5 font-mono">Cobrado por contratista</div>
        </div>
      </div>

      {/* BARRA DE ACCIÓN Y SELECTOR DE VALUACIÓN */}
      <div className="apple-glass rounded-2xl p-4 border border-white/10 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-white/50 font-semibold mr-1">Seleccionar Valuación:</span>
          {valuaciones.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setValuacionActivaId(v.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                valuacionActiva?.id === v.id
                  ? "bg-teal-500 text-black shadow-md font-black scale-105"
                  : "bg-white/5 hover:bg-white/10 text-white/70"
              }`}
            >
              Valuación N° {v.numeroValuacion} ({v.estado})
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setModalNuevaValuacion(true)}
          className="btn-cyber-neon px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-lg hover:scale-105 transition-transform cursor-pointer"
        >
          <IconPlus size={14} />
          <span>+ Nueva Valuación de Obra</span>
        </button>
      </div>

      {/* DETALLE DE LA VALUACIÓN ACTIVA */}
      {valuacionActiva && (
        <div className="apple-glass rounded-3xl p-6 border border-white/10 shadow-2xl space-y-5">
          <div className="flex flex-wrap items-center justify-between border-b border-white/10 pb-4 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-teal-400 uppercase font-bold">Acta de Medición de Campo</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  valuacionActiva.estado === "COBRADA"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : valuacionActiva.estado === "APROBADA"
                    ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                    : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                }`}>
                  {valuacionActiva.estado}
                </span>
              </div>
              <h3 className="font-['Outfit'] font-black text-2xl text-white mt-1">
                Valuación N° {valuacionActiva.numeroValuacion}
              </h3>
              <p className="text-xs text-white/50 font-mono">
                Período: {valuacionActiva.periodoDesde} al {valuacionActiva.periodoHasta} | Corte: {valuacionActiva.fechaCorte}
              </p>
            </div>

            {/* Acciones de cambio de estado de la valuación */}
            <div className="flex items-center gap-2">
              {valuacionActiva.estado === "PRESENTADA" && (
                <button
                  type="button"
                  onClick={() => onCambiarEstadoValuacion(valuacionActiva.id, "APROBADA")}
                  className="px-3 py-1.5 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-500/40 text-xs font-bold hover:bg-sky-500/30 transition-colors cursor-pointer"
                >
                  Aprobar Valuación
                </button>
              )}

              {valuacionActiva.estado === "APROBADA" && (
                <button
                  type="button"
                  onClick={() => onCambiarEstadoValuacion(valuacionActiva.id, "COBRADA")}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 text-black text-xs font-black hover:bg-emerald-400 transition-colors cursor-pointer"
                >
                  Marcar como Cobrada
                </button>
              )}
            </div>
          </div>

          {/* Liquidación de la Valuación */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-black/30 p-4 rounded-2xl border border-white/10 text-xs">
            <div>
              <span className="text-white/40 block text-[10px]">Monto Bruto Valuado:</span>
              <span className="font-mono font-bold text-white text-sm">
                ${valuacionActiva.montoBrutoUSD.toFixed(2)} USD
              </span>
            </div>
            <div>
              <span className="text-white/40 block text-[10px]">Amortización Anticipo ({proyecto.anticipoPorcentaje}%):</span>
              <span className="font-mono font-bold text-red-300 text-sm">
                -${valuacionActiva.amortizacionAnticipoUSD.toFixed(2)} USD
              </span>
            </div>
            <div>
              <span className="text-white/40 block text-[10px]">Retención Fiel Cumplimiento ({proyecto.retencionPorcentaje}%):</span>
              <span className="font-mono font-bold text-amber-300 text-sm">
                -${valuacionActiva.retencionGarantiaUSD.toFixed(2)} USD
              </span>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <span className="text-emerald-300 font-bold block text-[10px] uppercase">Neto a Cobrar:</span>
              <span className="font-mono font-black text-emerald-400 text-base">
                ${valuacionActiva.montoNetoUSD.toFixed(2)} USD
              </span>
              <div className="text-[10px] font-mono text-white/50 mt-0.5">
                ≈ Bs. {(valuacionActiva.montoNetoUSD * tasaBcv).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Tabla de Partidas Medidas en esta Valuación */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-white/50 font-mono uppercase text-[10px]">
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Descripción de la Partida</th>
                  <th className="py-2.5 px-2 text-center">Unidad</th>
                  <th className="py-2.5 px-2 text-right">Cant. Anterior</th>
                  <th className="py-2.5 px-2 text-right text-teal-300">Esta Valuación</th>
                  <th className="py-2.5 px-2 text-right">Acumulada</th>
                  <th className="py-2.5 px-2 text-center">% Avance</th>
                  <th className="py-2.5 px-3 text-right">Total Período</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {valuacionActiva.items.map((it) => {
                  const part = partidas.find((p) => p.id === it.partidaId);
                  return (
                    <tr key={it.id} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-300">
                        {part?.codigoPartida || "E-PART"}
                      </td>
                      <td className="py-2.5 px-3 text-white font-medium">
                        {part?.descripcion || "Partida de obra"}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-teal-300 font-bold">
                        {part?.unidad || "und"}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-white/60">
                        {it.cantidadAnterior.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-teal-300">
                        +{it.cantidadPeriodo.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-white">
                        {it.cantidadAcumulada.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono">
                        <span className={`px-1.5 py-0.5 rounded font-bold text-[11px] ${
                          it.porcentajeAvance > 100
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-white/5 text-white/80"
                        }`} title={it.porcentajeAvance > 100 ? "Supera cómputo contractual (Aumento de obra)" : "Avance dentro del contrato"}>
                          {it.porcentajeAvance.toFixed(1)}%{it.porcentajeAvance > 100 ? " (Aumento)" : ""}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                        ${it.montoPeriodoUSD.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL NUEVA VALUACIÓN DE OBRA */}
      {modalNuevaValuacion && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="apple-glass rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-teal-500/40 shadow-2xl relative space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-mono text-teal-400 uppercase font-bold">Control de Avance Físico</span>
                <h3 className="font-['Outfit'] font-black text-xl text-white">
                  Generar Valuación N° {valuaciones.length + 1}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalNuevaValuacion(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white cursor-pointer"
              >
                <IconClose size={18} />
              </button>
            </div>

            <form onSubmit={handleGuardarNuevaValuacion} className="space-y-4 text-xs flex-1 flex flex-col overflow-hidden">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/70 mb-1">Período Desde</label>
                  <input
                    type="date"
                    required
                    value={periodoDesde}
                    onChange={(e) => setPeriodoDesde(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-white/70 mb-1">Período Hasta (Fecha Corte)</label>
                  <input
                    type="date"
                    required
                    value={periodoHasta}
                    onChange={(e) => setPeriodoHasta(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white/70 mb-1">Ingresa las Cantidades Medidas en Campo en este Período:</label>
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1 border border-white/10 rounded-xl p-2 bg-black/20">
                  {partidas.map((p) => {
                    const cant = medicionesCampo[p.id] || 0;
                    return (
                      <div key={p.id} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-white/[0.02]">
                        <div className="flex-1">
                          <div className="font-mono text-amber-300 font-bold text-[11px]">{p.codigoPartida}</div>
                          <div className="text-white text-[11px] truncate max-w-sm">{p.descripcion}</div>
                          <div className="text-[10px] text-white/40">Presupuestado: {p.cantidad} {p.unidad}</div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            placeholder="0.0"
                            value={cant || ""}
                            onChange={(e) =>
                              setMedicionesCampo({ ...medicionesCampo, [p.id]: parseFloat(e.target.value) || 0 })
                            }
                            className="w-20 px-2 py-1 rounded-lg bg-black/50 border border-white/10 text-white font-mono text-right text-xs focus:border-teal-400"
                          />
                          <span className="text-[10px] font-mono text-white/60 w-6">{p.unidad}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-white/70 mb-1">Observaciones de la Valuación</label>
                <input
                  type="text"
                  placeholder="Detalles sobre ensayos de compresión, inspección de campo..."
                  value={notasValuacion}
                  onChange={(e) => setNotasValuacion(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalNuevaValuacion(false)}
                  className="px-4 py-2 rounded-xl text-white/70 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-black font-black text-xs hover:brightness-110 cursor-pointer"
                >
                  Generar Valuación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
