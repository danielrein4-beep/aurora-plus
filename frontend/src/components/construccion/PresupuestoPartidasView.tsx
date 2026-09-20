import React, { useState, useMemo } from "react";
import {
  ProyectoConstruccion,
  CapituloObra,
  PartidaObra,
  PartidaCatalogoCOVENIN,
  UnidadMedidaPartida,
} from "./types";
import { CATALOGO_PARTIDAS_COVENIN } from "./mockData";
import {
  IconPlus,
  IconClose,
  IconCheck,
  IconScissors,
  IconConstruction,
  IconFileText,
  IconCard,
  IconSparkles,
} from "../../Icons";

interface Props {
  proyecto: ProyectoConstruccion;
  capitulos: CapituloObra[];
  partidas: PartidaObra[];
  tasaBcv: number;
  onActualizarPartidas: (nuevasPartidas: PartidaObra[]) => void;
  onActualizarParametrosProyecto: (params: Partial<ProyectoConstruccion>) => void;
  onIrACotizacionPdf: () => void;
}

export default function PresupuestoPartidasView({
  proyecto,
  capitulos,
  partidas,
  tasaBcv,
  onActualizarPartidas,
  onActualizarParametrosProyecto,
  onIrACotizacionPdf,
}: Props) {
  const [capituloSeleccionadoId, setCapituloSeleccionadoId] = useState<string>("TODOS");
  const [busqueda, setBusqueda] = useState("");
  const [modalCatalogo, setModalCatalogo] = useState(false);
  const [modalManual, setModalManual] = useState(false);
  const [filtroCatalogo, setFiltroCatalogo] = useState("");

  // Form partida manual
  const [formCapituloId, setFormCapituloId] = useState(capitulos[0]?.id || "");
  const [formCodigo, setFormCodigo] = useState("E-");
  const [formDesc, setFormDesc] = useState("");
  const [formUnidad, setFormUnidad] = useState<UnidadMedidaPartida>("m²");
  const [formCantidad, setFormCantidad] = useState(1);
  const [formPrecioUnitario, setFormPrecioUnitario] = useState(10);

  // Cálculos económicos de ingeniería
  const costoDirecto = useMemo(() => {
    return partidas.reduce((acc, p) => acc + (p.cantidad * p.precioUnitarioUSD), 0);
  }, [partidas]);

  const montoAdministracion = (costoDirecto * proyecto.porcentajeAdministracion) / 100;
  const montoUtilidad = ((costoDirecto + montoAdministracion) * proyecto.porcentajeUtilidad) / 100;
  const subtotalNeto = costoDirecto + montoAdministracion + montoUtilidad;
  const montoIva = (subtotalNeto * proyecto.porcentajeIva) / 100;
  const totalPresupuestoUSD = subtotalNeto + montoIva;
  const totalPresupuestoBs = totalPresupuestoUSD * tasaBcv;

  // Filtrado de partidas en pantalla
  const partidasFiltradas = useMemo(() => {
    return partidas.filter((p) => {
      const matchCap = capituloSeleccionadoId === "TODOS" || p.capituloId === capituloSeleccionadoId;
      const matchBusqueda =
        !busqueda.trim() ||
        p.codigoPartida.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.descripcion.toLowerCase().includes(busqueda.toLowerCase());
      return matchCap && matchBusqueda;
    });
  }, [partidas, capituloSeleccionadoId, busqueda]);

  // Insertar partida desde el catálogo COVENIN
  const handleInsertarDesdeCatalogo = (item: PartidaCatalogoCOVENIN, capId: string) => {
    const nueva: PartidaObra = {
      id: `part-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      capituloId: capId || capitulos[0]?.id || "cap-1",
      codigoPartida: item.codigo,
      descripcion: item.descripcion,
      unidad: item.unidad,
      cantidad: 10, // Cómputo métrico por defecto
      precioUnitarioUSD: item.precioUnitarioEstimadoUSD,
      totalUSD: 10 * item.precioUnitarioEstimadoUSD,
      rendimientoDiario: item.rendimientoDiario,
    };
    onActualizarPartidas([...partidas, nueva]);
    setModalCatalogo(false);
  };

  // Guardar partida manual
  const handleGuardarPartidaManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDesc.trim() || !formCodigo.trim()) return;

    const nueva: PartidaObra = {
      id: `part-${Date.now()}`,
      capituloId: formCapituloId || capitulos[0]?.id || "cap-1",
      codigoPartida: formCodigo.trim(),
      descripcion: formDesc.trim(),
      unidad: formUnidad,
      cantidad: Number(formCantidad) || 1,
      precioUnitarioUSD: Number(formPrecioUnitario) || 0,
      totalUSD: (Number(formCantidad) || 1) * (Number(formPrecioUnitario) || 0),
    };

    onActualizarPartidas([...partidas, nueva]);
    setFormCodigo("E-");
    setFormDesc("");
    setModalManual(false);
  };

  // Eliminar partida
  const handleEliminarPartida = (partidaId: string) => {
    onActualizarPartidas(partidas.filter((p) => p.id !== partidaId));
  };

  // Actualizar cantidad en línea
  const handleCambiarCantidad = (partidaId: string, cant: number) => {
    onActualizarPartidas(
      partidas.map((p) => {
        if (p.id === partidaId) {
          const c = Math.max(0, cant);
          return { ...p, cantidad: c, totalUSD: c * p.precioUnitarioUSD };
        }
        return p;
      })
    );
  };

  // Actualizar precio unitario en línea
  const handleCambiarPU = (partidaId: string, pu: number) => {
    onActualizarPartidas(
      partidas.map((p) => {
        if (p.id === partidaId) {
          const precio = Math.max(0, pu);
          return { ...p, precioUnitarioUSD: precio, totalUSD: p.cantidad * precio };
        }
        return p;
      })
    );
  };
  return (
    <div className="space-y-6">
      {/* TARJETAS RESUMEN ECONÓMICO DEL PROYECTO */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="apple-glass rounded-2xl p-4 border border-white/10 bg-slate-900/40">
          <div className="text-white/50 text-xs font-mono uppercase tracking-wider">Costo Directo Obra</div>
          <div className="text-2xl font-black text-white font-['Outfit'] mt-1">
            ${costoDirecto.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-teal-400 mt-0.5 font-mono">{partidas.length} partidas presupuestadas</div>
        </div>

        <div className="apple-glass rounded-2xl p-4 border border-amber-500/20 bg-amber-500/5">
          <div className="text-amber-300 text-xs font-mono uppercase tracking-wider">Admin ({proyecto.porcentajeAdministracion}%) + Util ({proyecto.porcentajeUtilidad}%)</div>
          <div className="text-2xl font-black text-amber-400 font-['Outfit'] mt-1">
            ${(montoAdministracion + montoUtilidad).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-amber-300/70 mt-0.5">Gastos indirectos de obra</div>
        </div>

        <div className="apple-glass rounded-2xl p-4 border border-teal-500/30 bg-teal-500/10">
          <div className="text-teal-300 text-xs font-mono uppercase tracking-wider">Total Presupuesto USD</div>
          <div className="text-2xl font-black text-teal-300 font-['Outfit'] mt-1">
            ${totalPresupuestoUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-teal-200/70 mt-0.5">IVA {proyecto.porcentajeIva}% incluido</div>
        </div>

        <div className="apple-glass rounded-2xl p-4 border border-sky-500/20 bg-sky-500/5">
          <div className="text-sky-300 text-xs font-mono uppercase tracking-wider">Equivalente en Bolívares</div>
          <div className="text-2xl font-black text-sky-400 font-['Outfit'] mt-1 truncate">
            Bs. {totalPresupuestoBs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-sky-300/70 mt-0.5 font-mono">Tasa BCV: {tasaBcv.toFixed(2)} Bs/$</div>
        </div>
      </div>

      {/* BARRA DE ACCIONES Y CONTROLES */}
      <div className="apple-glass rounded-2xl p-4 border border-white/10 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Capítulo */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white">
            <IconConstruction size={14} className="text-amber-400" />
            <select
              value={capituloSeleccionadoId}
              onChange={(e) => setCapituloSeleccionadoId(e.target.value)}
              className="bg-transparent text-white border-none focus:outline-none cursor-pointer text-xs"
            >
              <option value="TODOS" className="bg-slate-900 text-white">Todos los Capítulos ({capitulos.length})</option>
              {capitulos.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                  {c.numero} {c.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Buscador */}
          <input
            type="text"
            placeholder="Buscar por código o descripción..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-teal-400 w-56"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setModalCatalogo(true)}
            className="px-3.5 py-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/40 text-xs font-bold hover:bg-teal-500/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <IconSparkles size={14} />
            <span>Catálogo COVENIN</span>
          </button>

          <button
            type="button"
            onClick={() => setModalManual(true)}
            className="px-3.5 py-2 rounded-xl bg-white/10 text-white hover:bg-white/15 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <IconPlus size={14} />
            <span>Partida Manual</span>
          </button>

          <button
            type="button"
            onClick={onIrACotizacionPdf}
            className="btn-cyber-neon px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-lg hover:scale-105 transition-transform cursor-pointer"
          >
            <IconFileText size={14} />
            <span>Exportar Cotización PDF</span>
          </button>
        </div>
      </div>

      {/* TABLA PRINCIPAL DE PARTIDAS DE OBRA */}
      <div className="apple-glass rounded-3xl p-4 sm:p-6 border border-white/10 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-['Outfit'] font-black text-lg text-white flex items-center gap-2">
            <span>Partidas & Cómputos Métricos</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-teal-500/20 text-teal-300 font-bold">
              {partidasFiltradas.length} partidas
            </span>
          </h3>
          <div className="text-xs text-white/50 font-mono">
            Valores editables en línea
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white/80 border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-white/50 font-mono uppercase text-[10px]">
                <th className="py-2.5 px-3">Código</th>
                <th className="py-2.5 px-3 min-w-[280px]">Descripción Técnica de la Partida</th>
                <th className="py-2.5 px-2 text-center">Unidad</th>
                <th className="py-2.5 px-3 text-right">Cómputo (Cant)</th>
                <th className="py-2.5 px-3 text-right">P.U. ($ USD)</th>
                <th className="py-2.5 px-3 text-right">Total ($ USD)</th>
                <th className="py-2.5 px-2 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {partidasFiltradas.map((p) => {
                const cap = capitulos.find((c) => c.id === p.capituloId);
                return (
                  <tr key={p.id} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="py-2.5 px-3 font-mono font-bold text-amber-300 whitespace-nowrap">
                      {p.codigoPartida}
                      {cap && (
                        <span className="block text-[9px] text-white/30 font-normal">
                          {cap.numero}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="text-white font-medium leading-relaxed">{p.descripcion}</div>
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono text-teal-300 font-bold">
                      {p.unidad}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={p.cantidad}
                        onChange={(e) => handleCambiarCantidad(p.id, parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 rounded-lg bg-black/40 border border-white/10 text-right text-white font-mono text-xs focus:outline-none focus:border-teal-400"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={p.precioUnitarioUSD}
                        onChange={(e) => handleCambiarPU(p.id, parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1 rounded-lg bg-black/40 border border-white/10 text-right text-teal-300 font-mono text-xs font-bold focus:outline-none focus:border-teal-400"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-white whitespace-nowrap">
                      ${p.totalUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleEliminarPartida(p.id)}
                        className="p-1 rounded-md text-red-400/60 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Eliminar partida"
                      >
                        <IconClose size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* AJUSTES ECONÓMICOS DE LA OFERTA */}
        <div className="pt-4 border-t border-white/10 bg-black/20 p-4 rounded-2xl space-y-3">
          <div className="text-xs font-bold text-white flex items-center justify-between">
            <span>Parámetros de Costo Indirecto & Margen de Ganancia:</span>
            <span className="text-white/40 text-[11px]">Estándar de Contratación de Obras</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-white/60 mb-1">Administración e Imprevistos (%)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={proyecto.porcentajeAdministracion}
                  onChange={(e) =>
                    onActualizarParametrosProyecto({ porcentajeAdministracion: parseFloat(e.target.value) || 0 })
                  }
                  className="w-20 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white font-mono"
                />
                <span className="font-mono text-amber-300 font-bold">
                  = ${montoAdministracion.toFixed(2)} USD
                </span>
              </div>
            </div>

            <div>
              <label className="block text-white/60 mb-1">Utilidad del Contratista (%)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={proyecto.porcentajeUtilidad}
                  onChange={(e) =>
                    onActualizarParametrosProyecto({ porcentajeUtilidad: parseFloat(e.target.value) || 0 })
                  }
                  className="w-20 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white font-mono"
                />
                <span className="font-mono text-emerald-300 font-bold">
                  = ${montoUtilidad.toFixed(2)} USD
                </span>
              </div>
            </div>

            <div>
              <label className="block text-white/60 mb-1">Impuesto IVA (%)</label>
              <div className="flex items-center gap-2">
                <select
                  value={proyecto.porcentajeIva}
                  onChange={(e) => onActualizarParametrosProyecto({ porcentajeIva: parseFloat(e.target.value) || 0 })}
                  className="px-2 py-1 rounded-lg bg-slate-900 border border-white/10 text-white font-mono"
                >
                  <option value={16}>16% (General)</option>
                  <option value={0}>0% (Exento de IVA)</option>
                </select>
                <span className="font-mono text-teal-300 font-bold">
                  = ${montoIva.toFixed(2)} USD
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL CATÁLOGO COVENIN */}
      {modalCatalogo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="apple-glass rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-teal-500/40 shadow-2xl relative space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-mono text-teal-400 uppercase font-bold">Base de Datos de Ingeniería</span>
                <h3 className="font-['Outfit'] font-black text-xl text-white">Catálogo de Partidas COVENIN</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalCatalogo(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white cursor-pointer"
              >
                <IconClose size={18} />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Buscar partida por nombre o código..."
                value={filtroCatalogo}
                onChange={(e) => setFiltroCatalogo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-teal-400"
              />
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {CATALOGO_PARTIDAS_COVENIN.filter((item) =>
                !filtroCatalogo.trim() ||
                item.codigo.toLowerCase().includes(filtroCatalogo.toLowerCase()) ||
                item.descripcion.toLowerCase().includes(filtroCatalogo.toLowerCase()) ||
                item.capituloSugerido.toLowerCase().includes(filtroCatalogo.toLowerCase())
              ).map((item) => (
                <div
                  key={item.codigo}
                  className="p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-teal-400/40 hover:bg-white/[0.06] transition-all flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded text-[11px]">
                        {item.codigo}
                      </span>
                      <span className="text-[10px] text-white/40 font-mono">
                        {item.capituloSugerido}
                      </span>
                      <span className="text-[10px] font-mono text-teal-300 bg-teal-500/10 px-1 rounded">
                        {item.unidad}
                      </span>
                    </div>
                    <p className="text-white/80 leading-snug">{item.descripcion}</p>
                  </div>

                  <div className="text-right whitespace-nowrap pl-2">
                    <div className="font-mono font-bold text-teal-300 text-sm">
                      ${item.precioUnitarioEstimadoUSD.toFixed(2)}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const targetCap = (capituloSeleccionadoId !== "TODOS" ? capitulos.find(c => c.id === capituloSeleccionadoId) : null)
                          || capitulos.find(c => item.capituloSugerido.toLowerCase().includes(c.numero.toLowerCase()) || c.nombre.toLowerCase().includes(item.capituloSugerido.toLowerCase()))
                          || capitulos[0];
                        handleInsertarDesdeCatalogo(item, targetCap?.id || "cap-1");
                      }}
                      className="mt-1 px-3 py-1 rounded-lg bg-teal-500 text-black font-bold text-xs hover:bg-teal-400 transition-colors cursor-pointer"
                    >
                      + Insertar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARTIDA MANUAL */}
      {modalManual && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="apple-glass rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-teal-500/40 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-['Outfit'] font-black text-xl text-white">Nueva Partida Manual</h3>
              <button
                type="button"
                onClick={() => setModalManual(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white cursor-pointer"
              >
                <IconClose size={18} />
              </button>
            </div>

            <form onSubmit={handleGuardarPartidaManual} className="space-y-3 text-xs">
              <div>
                <label className="block text-white/70 mb-1">Capítulo de Obra</label>
                <select
                  value={formCapituloId}
                  onChange={(e) => setFormCapituloId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-teal-400"
                >
                  {capitulos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.numero} {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="block text-white/70 mb-1">Código</label>
                  <input
                    type="text"
                    required
                    value={formCodigo}
                    onChange={(e) => setFormCodigo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-white/70 mb-1">Unidad</label>
                  <select
                    value={formUnidad}
                    onChange={(e) => setFormUnidad(e.target.value as UnidadMedidaPartida)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white font-mono"
                  >
                    {(["m³", "m²", "ml", "kg", "ton", "pza", "pto", "gl", "día", "hora"] as UnidadMedidaPartida[]).map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-white/70 mb-1">Cómputo</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    required
                    value={formCantidad}
                    onChange={(e) => setFormCantidad(parseFloat(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-right"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white/70 mb-1">Descripción Técnica</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ej: Vaciado de concreto f'c=250 kg/cm2 para vigas de corona..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-teal-400"
                />
              </div>

              <div>
                <label className="block text-white/70 mb-1">Precio Unitario ($ USD / Unidad)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={formPrecioUnitario}
                  onChange={(e) => setFormPrecioUnitario(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-teal-300 font-bold font-mono"
                />
              </div>

              <div className="pt-2 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalManual(false)}
                  className="px-4 py-2 rounded-xl text-white/70 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-black font-black text-xs hover:brightness-110 cursor-pointer"
                >
                  Agregar Partida
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
