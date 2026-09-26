import React, { useEffect, useMemo, useState } from "react";
import { abrirTurno, cerrarTurno, historialTurnos, registrarEgresoTurno, turnoAbierto, type Turno } from "../api";

// Caja del dia en una sola pantalla: dolares, bolivares y pesos lado a lado.
// El backend sigue llevando un turno por moneda (/api/financiero/turnos); esta pantalla
// abre y cierra los turnos juntos para que el cajero no cambie de pestana por moneda.
//
// Al cerrar solo se declara EFECTIVO: el backend calcula lo esperado de cada turno con el
// dinero fisico de esa moneda (TurnoService.cerrarTurno). Punto, pago movil y Zelle no
// estan en la gaveta y no se cuentan aqui.

type Moneda = "USD" | "VES" | "COP";

interface Props {
  tenantId: number;
  tasaUsdVes: number;
  tasaUsdCop: number;
  // En modo euro solo hay una moneda; lo decide quien usa el componente.
  monedas: readonly Moneda[];
}

const INFO: Record<Moneda, { nombre: string; simbolo: string; decimales: number; acento: string }> = {
  USD: { nombre: "Dólares", simbolo: "$", decimales: 2, acento: "text-emerald-700 dark:text-emerald-300" },
  VES: { nombre: "Bolívares", simbolo: "Bs.", decimales: 2, acento: "text-sky-700 dark:text-sky-300" },
  COP: { nombre: "Pesos", simbolo: "COP", decimales: 0, acento: "text-amber-700 dark:text-amber-300" },
};

const fmt = (m: Moneda, v: number) =>
  `${INFO[m].simbolo} ${Number(v || 0).toLocaleString("es-VE", { minimumFractionDigits: INFO[m].decimales, maximumFractionDigits: INFO[m].decimales })}`;

const vacioPorMoneda = (): Record<Moneda, string> => ({ USD: "", VES: "", COP: "" });

function CampoMoneda({
  moneda,
  valor,
  onChange,
  ayuda,
}: {
  moneda: Moneda;
  valor: string;
  onChange: (v: string) => void;
  ayuda?: string;
}) {
  const info = INFO[moneda];
  return (
    <label className="block rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20 transition">
      <span className={`block text-xs font-bold uppercase tracking-wider ${info.acento}`}>{info.nombre}</span>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-lg font-bold text-slate-400">{info.simbolo}</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step={info.decimales ? "0.01" : "1"}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          aria-label={`${info.nombre} (${info.simbolo})`}
          className="w-full bg-transparent text-2xl font-bold tabular-nums text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none"
        />
      </div>
      {ayuda && <span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">{ayuda}</span>}
    </label>
  );
}

export default function ArqueoCajaMultimoneda({ tenantId, tasaUsdVes, tasaUsdCop, monedas }: Props) {
  const [turnos, setTurnos] = useState<Partial<Record<Moneda, Turno | null>>>({});
  const [cargando, setCargando] = useState(true);
  const [historial, setHistorial] = useState<Turno[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const [cajero, setCajero] = useState("");
  const [bases, setBases] = useState(vacioPorMoneda);
  const [contado, setContado] = useState(vacioPorMoneda);
  const [egreso, setEgreso] = useState<{ moneda: Moneda; monto: string; concepto: string }>({ moneda: monedas[0], monto: "", concepto: "" });
  const [cierres, setCierres] = useState<Turno[] | null>(null);

  const cargar = async () => {
    setCargando(true);
    const pares = await Promise.all(
      monedas.map(async (m) => [m, await turnoAbierto(tenantId, m).catch(() => null)] as const)
    );
    setTurnos(Object.fromEntries(pares));
    historialTurnos(tenantId).then(setHistorial).catch(() => setHistorial([]));
    setCargando(false);
  };

  useEffect(() => {
    cargar();
  }, [tenantId, monedas.join(",")]);

  const abiertas = monedas.filter((m) => turnos[m]);
  const cerradas = monedas.filter((m) => !turnos[m]);

  // Equivalente en dolares de lo contado, solo como referencia para el cajero.
  const totalContadoUsd = useMemo(
    () =>
      abiertas.reduce((suma, m) => {
        const v = Number(contado[m]) || 0;
        if (m === "USD") return suma + v;
        if (m === "VES") return suma + (tasaUsdVes > 0 ? v / tasaUsdVes : 0);
        return suma + (tasaUsdCop > 0 ? v / tasaUsdCop : 0);
      }, 0),
    [contado, abiertas.join(","), tasaUsdVes, tasaUsdCop]
  );

  const mostrarError = (e: unknown, porDefecto: string) => setError(e instanceof Error ? e.message : porDefecto);

  const abrir = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!cajero.trim()) return setError("Escribe quién abre la caja.");
    setOcupado(true);
    try {
      for (const m of cerradas) {
        await abrirTurno(tenantId, { idCajero: cajero.trim(), montoBase: Number(bases[m]) || 0, moneda: m });
      }
      setBases(vacioPorMoneda());
      setAviso("Caja abierta. Ya puedes vender.");
      await cargar();
    } catch (err) {
      mostrarError(err, "No se pudo abrir la caja.");
      await cargar();
    } finally {
      setOcupado(false);
    }
  };

  const registrarGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    const turno = turnos[egreso.moneda];
    if (!turno) return;
    setError(null);
    if (!(Number(egreso.monto) > 0)) return setError("Indica el monto del gasto.");
    setOcupado(true);
    try {
      await registrarEgresoTurno(tenantId, turno.id, Number(egreso.monto), egreso.concepto.trim() || undefined);
      setAviso(`Gasto de ${fmt(egreso.moneda, Number(egreso.monto))} registrado.`);
      setEgreso({ ...egreso, monto: "", concepto: "" });
    } catch (err) {
      mostrarError(err, "No se pudo registrar el gasto.");
    } finally {
      setOcupado(false);
    }
  };

  const cerrar = async () => {
    setError(null);
    const vacias = abiertas.filter((m) => contado[m] === "");
    const resumen = abiertas.map((m) => `${INFO[m].nombre}: ${fmt(m, Number(contado[m]) || 0)}`).join("\n");
    const advertencia = vacias.length ? `\n\nNo escribiste nada en ${vacias.map((m) => INFO[m].nombre).join(", ")}: se cerrará con 0.` : "";
    if (!window.confirm(`¿Cerrar la caja con este efectivo contado?\n\n${resumen}${advertencia}\n\nSe genera el Cierre Z y no se puede deshacer.`)) return;
    setOcupado(true);
    const resultados: Turno[] = [];
    try {
      for (const m of abiertas) {
        const turno = turnos[m];
        if (turno) resultados.push(await cerrarTurno(tenantId, turno.id, Number(contado[m]) || 0));
      }
      setContado(vacioPorMoneda());
      setCierres(resultados);
    } catch (err) {
      mostrarError(err, "No se pudo cerrar la caja.");
      if (resultados.length) setCierres(resultados);
    } finally {
      setOcupado(false);
      await cargar();
    }
  };

  const tarjeta = "rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6";

  return (
    <div className="max-w-4xl mx-auto w-full space-y-5 text-slate-900 dark:text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-['Outfit'] font-black text-xl">Caja del día</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {monedas.length > 1 ? "Dólares, bolívares y pesos en una sola pantalla." : "Apertura, gastos y cierre de la caja."}
          </p>
        </div>
        <div className="flex gap-1.5">
          {monedas.map((m) => (
            <span
              key={m}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                turnos[m]
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30"
                  : "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
              }`}
            >
              {INFO[m].simbolo} {turnos[m] ? "abierta" : "cerrada"}
            </span>
          ))}
        </div>
      </div>

      {error && <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300">{error}</div>}
      {aviso && !error && (
        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300">{aviso}</div>
      )}

      {cargando ? (
        <p className="text-sm text-slate-500">Cargando la caja…</p>
      ) : (
        <>
          {cerradas.length > 0 && (
            <form onSubmit={abrir} className={`${tarjeta} space-y-4`}>
              <div>
                <h4 className="font-bold text-base">{abiertas.length ? "Abrir las monedas que faltan" : "Abrir caja"}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Escribe el fondo con el que arranca cada moneda. Si no hay fondo, déjalo vacío.</p>
              </div>
              <label className="block text-xs">
                <span className="block font-bold text-slate-500 dark:text-slate-400 mb-1">Cajero o responsable</span>
                <input
                  value={cajero}
                  onChange={(e) => setCajero(e.target.value)}
                  placeholder="Nombre de quien abre"
                  className="w-full sm:w-80 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                />
              </label>
              <div className={`grid grid-cols-1 gap-3 ${cerradas.length > 2 ? "sm:grid-cols-3" : cerradas.length === 2 ? "sm:grid-cols-2" : ""}`}>
                {cerradas.map((m) => (
                  <CampoMoneda key={m} moneda={m} valor={bases[m]} onChange={(v) => setBases({ ...bases, [m]: v })} ayuda="Fondo inicial" />
                ))}
              </div>
              <button
                type="submit"
                disabled={ocupado}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-[#FFFFFF] font-bold text-sm disabled:opacity-50"
              >
                {ocupado ? "Abriendo…" : cerradas.length > 1 ? "Abrir caja en todas las monedas" : `Abrir caja en ${INFO[cerradas[0]].nombre.toLowerCase()}`}
              </button>
            </form>
          )}

          {abiertas.length > 0 && (
            <>
              <div className={`grid grid-cols-1 gap-3 ${abiertas.length > 2 ? "sm:grid-cols-3" : abiertas.length === 2 ? "sm:grid-cols-2" : ""}`}>
                {abiertas.map((m) => {
                  const t = turnos[m]!;
                  return (
                    <div key={m} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                      <div className={`text-xs font-bold uppercase tracking-wider ${INFO[m].acento}`}>{INFO[m].nombre}</div>
                      <div className="mt-1 text-xl font-bold tabular-nums">{fmt(m, Number(t.montoBase))}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Fondo inicial · {t.idCajero} · desde {new Date(t.fechaApertura).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={registrarGasto} className={`${tarjeta} space-y-3`}>
                <div>
                  <h4 className="font-bold text-sm">Registrar un gasto</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Pago a proveedor, compra menor u otra salida de efectivo.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  {abiertas.length > 1 && (
                    <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0" role="radiogroup" aria-label="Moneda del gasto">
                      {abiertas.map((m) => (
                        <button
                          key={m}
                          type="button"
                          role="radio"
                          aria-checked={egreso.moneda === m}
                          onClick={() => setEgreso({ ...egreso, moneda: m })}
                          className={`px-3 py-2 rounded-lg text-xs font-bold transition ${
                            egreso.moneda === m ? "bg-white dark:bg-slate-900 shadow-sm text-teal-700 dark:text-teal-300" : "text-slate-500"
                          }`}
                        >
                          {INFO[m].simbolo}
                        </button>
                      ))}
                    </div>
                  )}
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={egreso.monto}
                    onChange={(e) => setEgreso({ ...egreso, monto: e.target.value })}
                    placeholder={`Monto en ${INFO[egreso.moneda].simbolo}`}
                    aria-label="Monto del gasto"
                    className="sm:w-40 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm tabular-nums"
                  />
                  <input
                    value={egreso.concepto}
                    onChange={(e) => setEgreso({ ...egreso, concepto: e.target.value })}
                    placeholder="Concepto (ej. pago a proveedor)"
                    aria-label="Concepto del gasto"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                  />
                  <button type="submit" disabled={ocupado} className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold disabled:opacity-50">
                    Registrar
                  </button>
                </div>
              </form>

              <div className={`${tarjeta} border-amber-200 dark:border-amber-500/30 space-y-4`}>
                <div>
                  <h4 className="font-bold text-base">Cerrar caja</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Cuenta el efectivo de la gaveta y escríbelo en cada moneda. Punto, pago móvil y Zelle no se cuentan aquí: ya quedaron
                    registrados con cada venta.
                  </p>
                </div>
                <div className={`grid grid-cols-1 gap-3 ${abiertas.length > 2 ? "sm:grid-cols-3" : abiertas.length === 2 ? "sm:grid-cols-2" : ""}`}>
                  {abiertas.map((m) => (
                    <CampoMoneda key={m} moneda={m} valor={contado[m]} onChange={(v) => setContado({ ...contado, [m]: v })} ayuda="Efectivo contado" />
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  {abiertas.length > 1 ? (
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      Total contado equivale a <span className="font-bold tabular-nums">{fmt("USD", totalContadoUsd)}</span>
                    </span>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    onClick={cerrar}
                    disabled={ocupado}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm disabled:opacity-50"
                  >
                    {ocupado ? "Cerrando…" : "Cerrar caja y generar Cierre Z"}
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {cierres && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setCierres(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-['Outfit'] font-black text-lg">Cierre Z registrado</h3>
            <div className="space-y-2">
              {cierres.map((c) => {
                const m = c.moneda as Moneda;
                const d = Number(c.descuadre) || 0;
                return (
                  <div key={c.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold uppercase tracking-wider ${INFO[m]?.acento || ""}`}>{INFO[m]?.nombre || c.moneda}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          d === 0
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                            : d > 0
                            ? "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
                        }`}
                      >
                        {d === 0 ? "Cuadrada" : d > 0 ? `Sobra ${fmt(m, d)}` : `Falta ${fmt(m, Math.abs(d))}`}
                      </span>
                    </div>
                    <div className="mt-1 grid grid-cols-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>Esperado: <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{fmt(m, Number(c.montoEsperado))}</span></span>
                      <span>Contado: <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{fmt(m, Number(c.montoDeclarado))}</span></span>
                    </div>
                  </div>
                );
              })}
            </div>
            <button type="button" onClick={() => setCierres(null)} className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-semibold">
              Listo
            </button>
          </div>
        </div>
      )}

      {historial.length > 0 && (
        <div className={tarjeta}>
          <h4 className="font-bold text-sm mb-3">Cierres anteriores</h4>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-xs">
              <thead>
                <tr className="text-left text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2 pr-2">Apertura</th>
                  <th className="py-2 px-2">Cajero</th>
                  <th className="py-2 px-2">Moneda</th>
                  <th className="py-2 px-2 text-right">Esperado</th>
                  <th className="py-2 px-2 text-right">Contado</th>
                  <th className="py-2 pl-2 text-right">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {historial.slice(0, 15).map((t) => {
                  const m = t.moneda as Moneda;
                  const d = t.descuadre == null ? null : Number(t.descuadre);
                  return (
                    <tr key={t.id} className="border-b border-slate-100 dark:border-slate-800/60">
                      <td className="py-2 pr-2 whitespace-nowrap">{new Date(t.fechaApertura).toLocaleString("es-VE", { dateStyle: "short", timeStyle: "short" })}</td>
                      <td className="py-2 px-2">{t.idCajero}</td>
                      <td className="py-2 px-2">{INFO[m]?.nombre || t.moneda}</td>
                      <td className="py-2 px-2 text-right tabular-nums">{t.montoEsperado == null ? "—" : fmt(m, Number(t.montoEsperado))}</td>
                      <td className="py-2 px-2 text-right tabular-nums">{t.montoDeclarado == null ? "—" : fmt(m, Number(t.montoDeclarado))}</td>
                      <td
                        className={`py-2 pl-2 text-right tabular-nums font-semibold ${
                          d == null ? "text-slate-400" : d === 0 ? "text-emerald-600" : d > 0 ? "text-sky-600" : "text-rose-600"
                        }`}
                      >
                        {d == null ? "Abierta" : d === 0 ? "Cuadrada" : `${d > 0 ? "+" : "−"}${fmt(m, Math.abs(d))}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
