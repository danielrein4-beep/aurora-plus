import { Fragment, useState } from "react";
import * as XLSX from "xlsx";
import { IconEdit, IconCow, IconCoins, IconUpload } from "../../Icons";
import { type AnimalGanaderia, type PotreroGanaderia, type AlertaSanitariaGanaderia, type PrenezActualGanaderia, descargarInventarioHatoPdf } from "../../api";
import { BotonPdf } from "../ReportesCampoGanaderia";
import { kg } from "./formato";
import type { FormAltaAnimal } from "./ModalAltaAnimal";
import type { ModoVenta } from "./ModalVentaAnimales";
import type { Notificar, TabGanaderia, SubInventario, SubSanidad } from "./tipos";

interface Props {
  alertasSanitarias: AlertaSanitariaGanaderia[];
  animales: AnimalGanaderia[];
  animalesActivos: AnimalGanaderia[];
  notificar: Notificar;
  potreros: PotreroGanaderia[];
  prenezActual: PrenezActualGanaderia[];
  puedeImportarHato: boolean;
  subInventario: SubInventario;
  totalAnimales: number;
  abrirEditarAnimal: (animal: AnimalGanaderia) => void;
  abrirVentaAnimales: (modo: ModoVenta) => void;
  exportarInventarioXLSX: () => void;
  setAltaAnimal: (valores: Partial<FormAltaAnimal> | null) => void;
  setAnimalFichaId: (id: number | null) => void;
  setModalFichaAnimal: (animal: AnimalGanaderia | null) => void;
  setModalImportarHato: (abierto: boolean) => void;
  setModalPesaje: (animal: AnimalGanaderia | null) => void;
  setSubInventario: (sub: SubInventario) => void;
  setSubSanidad: (sub: SubSanidad) => void;
  setTab: (tab: TabGanaderia) => void;
}

/**
 * Hato e inventario: matriz por categoría con su desglose por raza y preñez por padrote,
 * fichas de cada animal con búsqueda y filtros, y distribución por potrero.
 */
export default function SeccionHato({
  alertasSanitarias, animales, animalesActivos, notificar, potreros, prenezActual,
  puedeImportarHato, subInventario, totalAnimales, abrirEditarAnimal, abrirVentaAnimales,
  exportarInventarioXLSX, setAltaAnimal, setAnimalFichaId, setModalFichaAnimal,
  setModalImportarHato, setModalPesaje, setSubInventario, setSubSanidad, setTab,
}: Props) {
  const [filtroCategoria, setFiltroCategoria] = useState<string>("TODOS");
  const [busquedaArete, setBusquedaArete] = useState<string>("");

  const [categoriaExpandida, setCategoriaExpandida] = useState<string | null>(null);

  // Matriz de Categorías Canónicas del Hato (GanSoft Style)
  // El tipoAnimal elegido por el usuario en el Alta SIEMPRE manda; el peso solo
  // clasifica como respaldo cuando el animal no trae un tipoAnimal reconocido
  // (dato legado). Antes el respaldo por peso se evaluaba en paralelo al tipo
  // real, así que un Toro joven (p.ej. 259 kg) se contaba a la vez en "Toros" y
  // en "Mautes" por caer en ese rango de peso.
  const TIPOS_HEMBRA_CONOCIDOS = ["BECERRA", "MAUTA", "NOVILLA", "VACA"];
  const TIPOS_MACHO_CONOCIDOS = ["TERNERO", "BECERRO", "MAUTE", "NOVILLO", "TORO"];
  const categoriasHato = [
    { key: "BECERRA", label: "Becerras", filter: (a: AnimalGanaderia) => a.sexo === "HEMBRA" && (a.tipoAnimal === "BECERRA" || (!TIPOS_HEMBRA_CONOCIDOS.includes(a.tipoAnimal || "") && (a.pesoActual || 0) < 120)) },
    { key: "MAUTA", label: "Mautas", filter: (a: AnimalGanaderia) => a.sexo === "HEMBRA" && (a.tipoAnimal === "MAUTA" || (!TIPOS_HEMBRA_CONOCIDOS.includes(a.tipoAnimal || "") && (a.pesoActual || 0) >= 120 && (a.pesoActual || 0) < 280)) },
    { key: "NOVILLA", label: "Novillas", filter: (a: AnimalGanaderia) => a.sexo === "HEMBRA" && a.tipoAnimal === "NOVILLA" },
    { key: "VACA", label: "Vacas", filter: (a: AnimalGanaderia) => a.sexo === "HEMBRA" && a.tipoAnimal === "VACA" },
    { key: "BECERRO", label: "Becerros", filter: (a: AnimalGanaderia) => a.sexo === "MACHO" && (a.tipoAnimal === "TERNERO" || a.tipoAnimal === "BECERRO" || (!TIPOS_MACHO_CONOCIDOS.includes(a.tipoAnimal || "") && (a.pesoActual || 0) < 130)) },
    { key: "MAUTE", label: "Mautes", filter: (a: AnimalGanaderia) => a.sexo === "MACHO" && (a.tipoAnimal === "MAUTE" || (!TIPOS_MACHO_CONOCIDOS.includes(a.tipoAnimal || "") && (a.pesoActual || 0) >= 130 && (a.pesoActual || 0) < 320)) },
    { key: "NOVILLO", label: "Novillos", filter: (a: AnimalGanaderia) => a.sexo === "MACHO" && (a.tipoAnimal === "NOVILLO" || (!TIPOS_MACHO_CONOCIDOS.includes(a.tipoAnimal || "") && (a.pesoActual || 0) >= 320 && (a.pesoActual || 0) < 600)) },
    { key: "TORO", label: "Toros", filter: (a: AnimalGanaderia) => a.sexo === "MACHO" && a.tipoAnimal === "TORO" },
  ];

  // Conteo por categoría
  const matrizConteos = categoriasHato.map(cat => ({
    ...cat,
    count: animalesActivos.filter(cat.filter).length,
    pesoPromedio: Math.round(
      animalesActivos.filter(cat.filter).reduce((sum, a) => sum + (a.pesoActual || 0), 0) /
      Math.max(1, animalesActivos.filter(cat.filter).length)
    ),
  }));

  // Desglose del hato: dentro de cada categoría, cuántos por raza y, de las
  // hembras, cuántas preñadas y de qué padrote (último servicio/diagnóstico).
  const SIN_PADROTE = "Sin padrote registrado";
  const prenezPorHembra = new Map(prenezActual.map(p => [p.hembraId, p]));
  const padroteDe = (a: AnimalGanaderia) => {
    const p = prenezPorHembra.get(a.id);
    return p ? (p.padrote || SIN_PADROTE) : null;
  };
  const desglosePorRaza = (lista: AnimalGanaderia[]) => {
    const grupos = new Map<string, { raza: string; cabezas: number; prenadas: number; porPadrote: Map<string, number> }>();
    for (const a of lista) {
      const raza = a.raza?.trim() || "Sin raza";
      const g = grupos.get(raza) ?? { raza, cabezas: 0, prenadas: 0, porPadrote: new Map<string, number>() };
      g.cabezas++;
      const padrote = padroteDe(a);
      if (padrote) {
        g.prenadas++;
        g.porPadrote.set(padrote, (g.porPadrote.get(padrote) ?? 0) + 1);
      }
      grupos.set(raza, g);
    }
    return [...grupos.values()].sort((x, y) => y.cabezas - x.cabezas);
  };
  const prenezPorPadrote = (() => {
    const grupos = new Map<string, { padrote: string; prenadas: number; porRaza: Map<string, number> }>();
    for (const a of animalesActivos) {
      const padrote = padroteDe(a);
      if (!padrote) continue;
      const g = grupos.get(padrote) ?? { padrote, prenadas: 0, porRaza: new Map<string, number>() };
      g.prenadas++;
      const raza = a.raza?.trim() || "Sin raza";
      g.porRaza.set(raza, (g.porRaza.get(raza) ?? 0) + 1);
      grupos.set(padrote, g);
    }
    // "Sin padrote registrado" siempre al final
    return [...grupos.values()].sort((x, y) =>
      (x.padrote === SIN_PADROTE ? 1 : 0) - (y.padrote === SIN_PADROTE ? 1 : 0) || y.prenadas - x.prenadas);
  })();
  const totalPrenadas = prenezPorPadrote.reduce((s, g) => s + g.prenadas, 0);

  // Filtrado de animales
  // Mismas categorías que la matriz ("Ver fichas" de Becerros incluye los TERNERO); los vendidos aparte.
  const esActivo = (a: AnimalGanaderia) => a.estado === "ACTIVO" || !a.estado;
  const vendidos = animales.filter(a => a.estado === "VENDIDO").length;
  const animalesFiltrados = animales.filter(a => {
    const categoria = categoriasHato.find(c => c.key === filtroCategoria);
    const coincideCat = filtroCategoria === "TODOS" ? esActivo(a)
      : filtroCategoria === "VENDIDOS" ? a.estado === "VENDIDO"
      : categoria ? esActivo(a) && categoria.filter(a)
      : a.tipoAnimal?.toUpperCase() === filtroCategoria.toUpperCase();
    const coincideBusqueda =
      a.arete.toLowerCase().includes(busquedaArete.toLowerCase()) ||
      (a.nombre && a.nombre.toLowerCase().includes(busquedaArete.toLowerCase())) ||
      (a.raza && a.raza.toLowerCase().includes(busquedaArete.toLowerCase()));
    return coincideCat && coincideBusqueda;
  });

  return (
    <div className="space-y-6 text-left">
      
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
            Inventario Consolidado del Hato
          </h3>
          <p className="text-xs text-slate-500 dark:text-white/40">
            Desglose por categorías productivas, locaciones en potrero y trazabilidad individual.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Sub-selector de Inventario */}
          <div className="apple-glass-pill rounded-full p-1 flex items-center gap-1 text-xs">
            <button
              onClick={() => setSubInventario("matriz")}
              className={`px-3.5 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
                subInventario === "matriz" ? "bg-white text-black shadow-sm" : "text-slate-600 dark:text-white/60"
              }`}>
              Matriz de Lotes
            </button>
            <button
              onClick={() => setSubInventario("fichas")}
              className={`px-3.5 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
                subInventario === "fichas" ? "bg-white text-black shadow-sm" : "text-slate-600 dark:text-white/60"
              }`}>
              Fichas Individuales
            </button>
            <button
              onClick={() => setSubInventario("distribucion")}
              className={`px-3.5 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
                subInventario === "distribucion" ? "bg-white text-black shadow-sm" : "text-slate-600 dark:text-white/60"
              }`}>
              Locación & Estatus
            </button>
          </div>

          <BotonPdf etiqueta="PDF del hato" obtener={descargarInventarioHatoPdf} notificar={notificar} />

          <button
            onClick={() => abrirVentaAnimales("MULTIPLE")}
            className="apple-glass-btn text-xs font-bold px-3.5 py-2 rounded-xl border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-all cursor-pointer flex items-center gap-1.5">
            <IconCoins size={13} />
            <span>Vender lote</span>
          </button>

          {puedeImportarHato && (
            <button
              onClick={() => setModalImportarHato(true)}
              className="apple-glass-btn text-xs font-bold px-3.5 py-2 rounded-xl border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-all cursor-pointer flex items-center gap-1.5">
              <IconUpload size={13} />
              <span>Importar hato</span>
            </button>
          )}

          <button
            onClick={exportarInventarioXLSX}
            className="apple-glass-btn text-xs font-bold px-3.5 py-2 rounded-xl border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-all cursor-pointer">
            Descargar Excel
          </button>
        </div>
      </div>

      {/* SUB-VISTA 1: MATRIZ DE CATEGORÍAS GANSOFT */}
      {subInventario === "matriz" && (
        <div className="space-y-6">
          {/* Tabla Matriz Canónica */}
          <div className="overflow-x-auto rounded-3xl border border-slate-200/80 dark:border-white/10 apple-glass">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/50 border-b border-slate-200/80 dark:border-white/10">
                <tr>
                  <th className="p-4">Lotes / Categoría</th>
                  <th className="p-4 text-center">Cabezas</th>
                  <th className="p-4 text-center">Peso Promedio</th>
                  <th className="p-4 text-center">% del Hato</th>
                  <th className="p-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                {matrizConteos.map(cat => {
                  const pct = totalAnimales > 0 ? ((cat.count / totalAnimales) * 100).toFixed(1) : "0.0";
                  const expandida = categoriaExpandida === cat.key && cat.count > 0;
                  return (
                    <Fragment key={cat.key}>
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-bold text-slate-900 dark:text-white">
                        <button
                          type="button"
                          disabled={cat.count === 0}
                          onClick={() => setCategoriaExpandida(expandida ? null : cat.key)}
                          className="flex items-center gap-2 cursor-pointer disabled:cursor-default"
                          title={cat.count > 0 ? "Ver desglose por raza" : undefined}>
                          <span className={`inline-block w-3 text-slate-400 transition-transform ${expandida ? "rotate-90" : ""} ${cat.count === 0 ? "opacity-0" : ""}`}>›</span>
                          <span>{cat.label}</span>
                        </button>
                      </td>
                      <td className="p-4 text-center tabular-nums font-black text-emerald-500 dark:text-emerald-400 text-sm">
                        {cat.count}
                      </td>
                      <td className="p-4 text-center tabular-nums text-slate-600 dark:text-white/70">
                        {cat.pesoPromedio > 0 ? `${cat.pesoPromedio} kg` : "-"}
                      </td>
                      <td className="p-4 text-center">
                        <div className="inline-flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="tabular-nums text-[11px] text-slate-400">{pct}%</span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => { setFiltroCategoria(cat.key); setSubInventario("fichas"); }}
                          className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer">
                          Ver Fichas →
                        </button>
                      </td>
                    </tr>
                    {expandida && desglosePorRaza(animalesActivos.filter(cat.filter)).map(g => (
                      <tr key={`${cat.key}-${g.raza}`} className="bg-slate-50/70 dark:bg-white/[0.02]">
                        <td className="py-2.5 pl-11 pr-4 text-slate-700 dark:text-white/80">{g.raza}</td>
                        <td className="py-2.5 px-4 text-center tabular-nums font-bold text-slate-900 dark:text-white">{g.cabezas}</td>
                        <td colSpan={3} className="py-2.5 px-4 text-slate-600 dark:text-white/60">
                          {g.prenadas > 0 ? (
                            <span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">{g.prenadas} preñadas</span>
                              {" · "}
                              {[...g.porPadrote.entries()].map(([padrote, n]) => `${n} de ${padrote}`).join(" · ")}
                            </span>
                          ) : cat.key === "VACA" || cat.key === "NOVILLA" ? (
                            <span className="text-slate-400 dark:text-white/40">Ninguna preñada</span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                    </Fragment>
                  );
                })}
                <tr className="bg-emerald-500/5 font-bold">
                  <td className="p-4 text-slate-900 dark:text-white">
                    TOTAL ACTIVOS
                    {animalesActivos.some(a => a.sociedadCebaId) && (
                      <div className="text-[10px] font-semibold text-slate-500 mt-0.5">
                        {animalesActivos.filter(a => !a.sociedadCebaId).length} propios · {animalesActivos.filter(a => a.sociedadCebaId).length} en sociedad
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-center tabular-nums text-emerald-500 dark:text-emerald-400 text-base">{totalAnimales}</td>
                  <td className="p-4 text-center tabular-nums text-slate-600 dark:text-white/70">
                    {Math.round(animalesActivos.reduce((sum, a) => sum + (a.pesoActual || 0), 0) / Math.max(1, totalAnimales))} kg
                  </td>
                  <td className="p-4 text-center tabular-nums text-slate-400">100%</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => { setFiltroCategoria("TODOS"); setSubInventario("fichas"); }}
                      className="text-emerald-500 font-bold hover:underline">
                      Ver Todos
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Preñez por padrote */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 apple-glass p-5 space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h4 className="font-['Outfit'] font-black text-base text-slate-900 dark:text-white">Preñez por padrote</h4>
              <span className="text-xs text-slate-500 dark:text-white/50">
                <span className="tabular-nums font-black text-emerald-600 dark:text-emerald-400">{totalPrenadas}</span> hembras preñadas
              </span>
            </div>
            {prenezPorPadrote.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-white/50">
                No hay hembras preñadas registradas. Registre el diagnóstico en Centro de Eventos o impórtelas con su padrote.
              </p>
            ) : (
              <div className="divide-y divide-slate-200/60 dark:divide-white/5">
                {prenezPorPadrote.map(g => (
                  <div key={g.padrote} className="py-2.5 flex items-center justify-between gap-4 text-xs">
                    <div className="min-w-0">
                      <div className={`font-bold truncate ${g.padrote === SIN_PADROTE ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>
                        {g.padrote}
                      </div>
                      <div className="text-slate-500 dark:text-white/50 truncate">
                        {[...g.porRaza.entries()].map(([raza, n]) => `${n} ${raza}`).join(" · ")}
                      </div>
                    </div>
                    <div className="tabular-nums font-black text-sm text-emerald-600 dark:text-emerald-400 flex-shrink-0">{g.prenadas}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-VISTA 2: FICHAS INDIVIDUALES */}
      {subInventario === "fichas" && (
        <div className="space-y-5">
          {/* Barra de Filtros y Búsqueda */}
          <div className="apple-glass rounded-2xl p-4 border border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { key: "TODOS", label: `Activos (${animalesActivos.length})` },
                ...matrizConteos.filter(c => c.count > 0).map(c => ({ key: c.key, label: `${c.label} (${c.count})` })),
                ...(vendidos > 0 ? [{ key: "VENDIDOS", label: `Vendidos (${vendidos})` }] : []),
              ].map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setFiltroCategoria(cat.key)}
                  className={`px-3.5 py-1.5 rounded-full font-semibold transition-all cursor-pointer ${
                    filtroCategoria === cat.key
                      ? "bg-teal-700 !text-white shadow-sm"
                      : "bg-white border border-slate-200 text-slate-600 hover:border-teal-300"
                  }`}>
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Buscar por arete, nombre o raza..."
                value={busquedaArete}
                onChange={e => setBusquedaArete(e.target.value)}
                className="px-4 py-2 rounded-xl bg-white/5 border border-slate-300/80 dark:border-white/15 text-slate-900 dark:text-white text-xs w-64 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={() => setAltaAnimal({})}
                className="btn-cyber-neon text-white font-bold px-4 py-2 rounded-xl cursor-pointer">
                + Alta Animal
              </button>
            </div>
          </div>

          {/* Listado de Animales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {animalesFiltrados.map(animal => (
              <div
                key={animal.id}
                className="apple-glass rounded-3xl p-5 border border-white/10 hover-card text-left space-y-4 relative overflow-hidden">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] tabular-nums font-bold text-emerald-500 dark:text-emerald-400">
                      ARETE: {animal.arete}
                    </div>
                    <h4 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white mt-1">
                      {animal.nombre || `Animal ${animal.arete}`}
                    </h4>
                    <div className="text-slate-500 dark:text-white/40 text-xs">
                      {animal.raza || "Mestizo"} • {animal.tipoAnimal} • {animal.sexo}
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-500 dark:text-white/60 text-[10px] font-bold">
                    {animal.estado || "ACTIVO"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-white/5 text-xs">
                  <div>
                    <span className="text-slate-400 dark:text-white/40 text-[10px] block">Peso Actual</span>
                    <span className="font-bold text-slate-900 dark:text-white">{animal.pesoActual ? kg(animal.pesoActual) : "Sin pesar"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-white/40 text-[10px] block">Potrero Asignado</span>
                    <span className={`font-bold truncate block ${animal.potrero ? "text-slate-800 dark:text-white" : "text-amber-700"}`}>
                      {animal.potrero?.nombre || "Sin potrero"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-white/5 text-xs">
                  <button
                    onClick={() => {
                      setModalPesaje(animal);
                    }}
                    className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer">
                    Pesar
                  </button>
                  <button
                    onClick={() => abrirEditarAnimal(animal)}
                    title="Editar animal"
                    className="text-slate-500 dark:text-white/60 hover:text-emerald-500 dark:hover:text-emerald-400 cursor-pointer">
                    <IconEdit size={14} />
                  </button>
                  <button
                    onClick={() => setModalFichaAnimal(animal)}
                    className="apple-glass-btn px-3 py-1 rounded-xl text-[11px] font-semibold text-slate-700 dark:text-white/80 cursor-pointer">
                    Ficha & QR →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-VISTA 3: DISTRIBUCIÓN POR LOCACIÓN & ESTATUS */}
      {subInventario === "distribucion" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Distribución por Potrero / Locación */}
          <div className="apple-glass rounded-3xl p-6 border border-white/10 space-y-4">
            <h4 className="font-['Outfit'] font-bold text-base text-slate-900 dark:text-white">
              Distribución por Locación & Potrero
            </h4>
            <div className="space-y-3 text-xs">
              {potreros.map(pot => {
                const count = animales.filter(a => a.potrero?.id === pot.id).length;
                return (
                  <div key={pot.id} className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{pot.nombre}</div>
                      <div className="text-[11px] text-slate-400">{pot.areaHectareas} ha • {pot.estado}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-['Outfit'] font-black text-lg text-emerald-400">{count}</span>
                      <span className="text-[10px] text-slate-400 block">cabezas</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Distribución por Estatus Productivo */}
          <div className="apple-glass rounded-3xl p-6 border border-white/10 space-y-4">
            <h4 className="font-['Outfit'] font-bold text-base text-slate-900 dark:text-white">
              Distribución por Estatus Productivo
            </h4>
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white">Vacas en Ordeño Activo</span>
                <span className="tabular-nums font-bold text-sky-400 text-base">
                  {animalesActivos.filter(a => a.tipoAnimal === "VACA" && a.sexo === "HEMBRA" && a.estadoProductivo === "ORDEÑO").length}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white">Hembras Gestantes Confirmadas</span>
                <span className="tabular-nums font-bold text-purple-400 text-base">
                  {animalesActivos.filter(a => a.estadoReproductivo === "PREÑADA").length}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white">Novillos en Fase de Engorde</span>
                <span className="tabular-nums font-bold text-amber-400 text-base">
                  {animalesActivos.filter(a => a.tipoAnimal === "NOVILLO").length}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white">Crías Lactantes en Corral</span>
                <span className="tabular-nums font-bold text-emerald-400 text-base">
                  {animalesActivos.filter(a => a.tipoAnimal === "TERNERO" || a.tipoAnimal === "BECERRA").length}
                </span>
              </div>
            </div>
          </div>

          {/* Seguimiento General del Hato: peso y estado sanitario de cada animal de un vistazo */}
          <div className="lg:col-span-2 apple-glass rounded-3xl p-6 border border-white/10 space-y-4">
            <h4 className="font-['Outfit'] font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <IconCow size={16} className="text-emerald-400" />
              <span>Seguimiento General del Hato</span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-white/40 -mt-2">
              Peso actual y estado sanitario de cada animal activo, de un solo vistazo.
            </p>
            {animalesActivos.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center bg-white/5 rounded-2xl">
                Sin animales activos registrados todavía.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 text-slate-500 dark:text-white/50 border-b border-white/10">
                    <tr>
                      <th className="p-3">Arete</th>
                      <th className="p-3">Nombre</th>
                      <th className="p-3">Categoría</th>
                      <th className="p-3">Peso Actual</th>
                      <th className="p-3">Potrero</th>
                      <th className="p-3">Estado Sanitario</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {animalesActivos.map(a => {
                      const alertasAnimal = alertasSanitarias.filter(al => al.animal?.id === a.id);
                      return (
                        <tr
                          key={a.id}
                          onClick={() => { setTab("sanidad"); setSubSanidad("individual"); setAnimalFichaId(a.id); }}
                          className="hover:bg-white/5 cursor-pointer transition-colors">
                          <td className="p-3 tabular-nums font-bold text-emerald-400">{a.arete}</td>
                          <td className="p-3 text-slate-900 dark:text-white">{a.nombre || "—"}</td>
                          <td className="p-3 text-slate-500 dark:text-white/60">{a.tipoAnimal}</td>
                          <td className="p-3 tabular-nums text-slate-900 dark:text-white">{a.pesoActual ? `${a.pesoActual} kg` : "Sin pesar"}</td>
                          <td className="p-3 text-sky-500 dark:text-sky-400">{a.potrero?.nombre || "Sin potrero"}</td>
                          <td className="p-3">
                            {alertasAnimal.length === 0 ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                                Al día
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 dark:text-rose-400 text-[10px] font-bold border border-rose-500/20">
                                {alertasAnimal.length} alerta{alertasAnimal.length > 1 ? "s" : ""}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
