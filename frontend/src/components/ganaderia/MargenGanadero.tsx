import { useEffect, useMemo, useState } from "react";
import { IconScale } from "../../Icons";
import {
  obtenerMargenGanaderia, descargarMargenLotesPdf, descargarMargenAnimalPdf,
  type AlcanceMargen, type MargenAnimalGanaderia, type MargenGanaderia,
} from "../../api";
import { BotonPdf } from "../ReportesCampoGanaderia";
import { num, usd } from "./formato";
import type { Notificar } from "./tipos";

const ALCANCES: { valor: AlcanceMargen; etiqueta: string }[] = [
  { valor: "TODOS", etiqueta: "Todo el hato" },
  { valor: "ACTIVOS", etiqueta: "Solo activos" },
  { valor: "VENDIDOS", etiqueta: "Solo vendidos" },
];

const INGRESO: Record<MargenAnimalGanaderia["tipoIngreso"], string> = {
  VENTA: "Venta",
  PROYECTADO: "Proyectado",
  BAJA: "Muerte o robo",
  SIN_VALORAR: "Sin valorar",
};

const colorMargen = (v: number | null | undefined) =>
  v == null ? "text-slate-400" : v < 0 ? "text-rose-600" : "text-emerald-700";

/**
 * Margen por animal y por lote: compra, vacunas, medicinas, alimento y sal mineral (directos) y
 * nómina y gastos generales (indirectos) contra la venta o el valor del animal al precio del kilo.
 */
export default function MargenGanadero({ notificar }: { notificar: Notificar }) {
  const [datos, setDatos] = useState<MargenGanaderia | null>(null);
  const [cargando, setCargando] = useState(true);
  const [alcance, setAlcance] = useState<AlcanceMargen>("TODOS");
  const [precioTexto, setPrecioTexto] = useState("");
  const [precioAplicado, setPrecioAplicado] = useState<number | undefined>(undefined);
  const [loteAbierto, setLoteAbierto] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    obtenerMargenGanaderia({ precioKg: precioAplicado, alcance })
      .then(r => {
        if (!vigente) return;
        setDatos(r);
        if (!precioTexto && r.precioKg) setPrecioTexto(String(r.precioKg));
      })
      .catch(err => vigente && notificar(`No se pudo calcular el margen: ${err instanceof Error ? err.message : "revisa tu conexión"}`))
      .finally(() => vigente && setCargando(false));
    return () => { vigente = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alcance, precioAplicado]);

  const aplicarPrecio = () => {
    const v = Number(precioTexto.replace(",", "."));
    setPrecioAplicado(Number.isFinite(v) && v > 0 ? v : undefined);
  };

  const animalesDelLote = useMemo(
    () => (datos?.animales ?? []).filter(a => (a.lote ?? "Sin lote") === loteAbierto),
    [datos, loteAbierto]);

  const t = datos?.totales;
  const campo = "px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:border-teal-600 focus:outline-none";

  return (
    <div className="space-y-4 pt-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-['Outfit'] font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <IconScale size={15} /> Margen por animal y por lote
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-white/40 max-w-2xl">
            Lo que cuesta cada animal (compra, vacunas, medicinas, alimento y sal mineral, más su parte de la nómina y los gastos de la finca) contra lo que deja su venta.
          </p>
        </div>
        <BotonPdf
          etiqueta="PDF por lote"
          variante="primario"
          notificar={notificar}
          obtener={() => descargarMargenLotesPdf({ precioKg: precioAplicado ?? datos?.precioKg ?? undefined, alcance })}
        />
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Animales</label>
          <select value={alcance} onChange={e => setAlcance(e.target.value as AlcanceMargen)} className={campo}>
            {ALCANCES.map(a => <option key={a.valor} value={a.valor}>{a.etiqueta}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Precio del kilo en pie (USD)</label>
          <div className="flex gap-1.5">
            <input
              inputMode="decimal"
              value={precioTexto}
              onChange={e => setPrecioTexto(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") aplicarPrecio(); }}
              placeholder="Ej. 2,10"
              className={`${campo} w-28`}
            />
            <button type="button" onClick={aplicarPrecio} className="px-3 py-2 rounded-xl text-xs font-semibold bg-teal-700 hover:bg-teal-800 !text-white cursor-pointer">
              Aplicar
            </button>
          </div>
        </div>
        {datos?.precioKgSugerido != null && (
          <p className="text-[11px] text-slate-500 pb-2">Tus ventas del último año salieron a {usd(datos.precioKgSugerido)}/kg.</p>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { etiqueta: "Costo total", valor: t ? usd(t.costoTotal) : "—", clase: "text-slate-900" },
          { etiqueta: "Ingreso (venta + proyectado)", valor: t ? usd(t.ingreso) : "—", clase: "text-slate-900" },
          { etiqueta: "Margen neto", valor: t ? usd(t.margenNeto) : "—", clase: colorMargen(t?.margenNeto) },
          { etiqueta: "Margen por animal", valor: t?.margenPorAnimal != null ? usd(t.margenPorAnimal) : "—", clase: colorMargen(t?.margenPorAnimal) },
        ].map(k => (
          <div key={k.etiqueta} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{k.etiqueta}</div>
            <div className={`tabular-nums font-black text-xl mt-1 ${k.clase}`}>{cargando ? "..." : k.valor}</div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
            <tr>
              <th className="p-3">Lote</th>
              <th className="p-3 text-right">Animales</th>
              <th className="p-3 text-right">Compra</th>
              <th className="p-3 text-right">Sanidad</th>
              <th className="p-3 text-right">Alimentación</th>
              <th className="p-3 text-right">Indirectos</th>
              <th className="p-3 text-right">Costo total</th>
              <th className="p-3 text-right">Ingreso</th>
              <th className="p-3 text-right">Margen neto</th>
              <th className="p-3 text-right">Por animal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cargando && <tr><td colSpan={10} className="p-6 text-center text-slate-500">Calculando...</td></tr>}
            {!cargando && datos?.lotes.length === 0 && (
              <tr><td colSpan={10} className="p-6 text-center text-slate-500">No hay animales en este alcance.</td></tr>
            )}
            {!cargando && datos?.lotes.map(l => (
              <tr
                key={l.lote}
                onClick={() => setLoteAbierto(loteAbierto === l.lote ? null : l.lote)}
                className={`cursor-pointer ${loteAbierto === l.lote ? "bg-teal-50/60" : "hover:bg-slate-50"}`}
                title="Ver los animales del lote"
              >
                <td className="p-3 font-semibold text-slate-900">{l.lote}</td>
                <td className="p-3 text-right tabular-nums text-slate-700">
                  {l.animales}
                  {(l.vendidos > 0 || l.bajas > 0) && (
                    <div className="text-[10px] text-slate-400">{[l.vendidos ? `${l.vendidos} vendidos` : "", l.bajas ? `${l.bajas} bajas` : ""].filter(Boolean).join(" · ")}</div>
                  )}
                </td>
                <td className="p-3 text-right tabular-nums text-slate-700">{usd(l.adquisicion)}</td>
                <td className="p-3 text-right tabular-nums text-slate-700">{usd(l.sanidad)}</td>
                <td className="p-3 text-right tabular-nums text-slate-700">{usd(l.alimentacion)}</td>
                <td className="p-3 text-right tabular-nums text-slate-700">{usd(l.costoIndirecto)}</td>
                <td className="p-3 text-right tabular-nums font-semibold text-slate-900">{usd(l.costoTotal)}</td>
                <td className="p-3 text-right tabular-nums text-slate-700">{usd(l.ingreso)}</td>
                <td className={`p-3 text-right tabular-nums font-bold ${colorMargen(l.margenNeto)}`}>{usd(l.margenNeto)}</td>
                <td className={`p-3 text-right tabular-nums ${colorMargen(l.margenPorAnimal)}`}>{l.margenPorAnimal != null ? usd(l.margenPorAnimal) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loteAbierto && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-bold text-slate-700">Animales del lote {loteAbierto} ({animalesDelLote.length})</div>
            <BotonPdf
              etiqueta={`PDF del lote ${loteAbierto}`}
              notificar={notificar}
              obtener={() => descargarMargenLotesPdf({ precioKg: precioAplicado ?? datos?.precioKg ?? undefined, alcance, lote: loteAbierto })}
            />
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white max-h-[28rem] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold tracking-wider sticky top-0">
                <tr>
                  <th className="p-3">Animal</th>
                  <th className="p-3 text-right">Días</th>
                  <th className="p-3 text-right">Directos</th>
                  <th className="p-3 text-right">Indirectos</th>
                  <th className="p-3 text-right">Costo total</th>
                  <th className="p-3 text-right">Ingreso</th>
                  <th className="p-3 text-right">Margen neto</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {animalesDelLote.map(a => (
                  <tr key={a.animalId} className="hover:bg-slate-50">
                    <td className="p-3">
                      <span className="tabular-nums font-semibold text-teal-800">{a.arete}</span>
                      <span className="ml-2 text-slate-700">{a.nombre || a.tipoAnimal || ""}</span>
                    </td>
                    <td className="p-3 text-right tabular-nums text-slate-600">{a.dias > 0 ? num(a.dias) : "—"}</td>
                    <td className="p-3 text-right tabular-nums text-slate-700">{usd(a.costoDirecto)}</td>
                    <td className="p-3 text-right tabular-nums text-slate-700">{usd(a.costoIndirecto)}</td>
                    <td className="p-3 text-right tabular-nums font-semibold text-slate-900">{usd(a.costoTotal)}</td>
                    <td className="p-3 text-right tabular-nums text-slate-700">
                      {a.ingreso != null ? usd(a.ingreso) : "—"}
                      <div className="text-[10px] text-slate-400">{INGRESO[a.tipoIngreso]}</div>
                    </td>
                    <td className={`p-3 text-right tabular-nums font-bold ${colorMargen(a.margenNeto)}`}>{a.margenNeto != null ? usd(a.margenNeto) : "—"}</td>
                    <td className="p-3 text-right">
                      <BotonPdf
                        etiqueta="PDF"
                        notificar={notificar}
                        obtener={() => descargarMargenAnimalPdf(a.animalId, precioAplicado ?? datos?.precioKg ?? undefined)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {datos && datos.notas.length > 0 && (
        <ul className="text-[11px] text-slate-500 space-y-1 list-disc pl-4">
          {datos.notas.map(n => <li key={n}>{n}</li>)}
          <li>Para cargarle la sal mineral o el alimento a un lote, indica el lote al registrar el gasto.</li>
        </ul>
      )}
    </div>
  );
}
