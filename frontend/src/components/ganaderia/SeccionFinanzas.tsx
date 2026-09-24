import * as XLSX from "xlsx";
import { IconFileText, IconCalendar, IconChart, IconMilk, IconCow, IconTag, IconScale, IconCoins } from "../../Icons";
import type { PotreroGanaderia, RegistroOrdenoGanaderia, VacunaGanaderia, VentaLecheTanque, GastoGanaderia, VentaGanaderiaResumen } from "../../api";
import ReportesCampoGanaderia, { fechaLocalISO } from "../ReportesCampoGanaderia";
import { CATEGORIAS_GASTO_GANADERIA } from "./catalogos";
import type { MonedasConfig, Notificar, TabGanaderia, SubPotreros } from "./tipos";
import { num, verFecha } from "./formato";

interface Props {
  gastos: GastoGanaderia[];
  monedasConfig: MonedasConfig;
  notificar: Notificar;
  ordenos: RegistroOrdenoGanaderia[];
  potreros: PotreroGanaderia[];
  precioLecheUSD: number;
  tasaBCV: number;
  tasaCOP: number;
  vacunas: VacunaGanaderia[];
  ventasAnimales: VentaGanaderiaResumen[];
  ventasLeche: VentaLecheTanque[];
  exportarInventarioXLSX: () => void;
  setGastoAbierto: (abierto: boolean) => void;
  setSubPotreros: (sub: SubPotreros) => void;
  setTab: (tab: TabGanaderia) => void;
}

/** Finanzas del hato: ingresos por leche y ventas de animales, gastos operativos y rentabilidad. */
export default function SeccionFinanzas({
  gastos, monedasConfig, notificar, ordenos, potreros, precioLecheUSD, tasaBCV, tasaCOP, vacunas,
  ventasAnimales, ventasLeche, exportarInventarioXLSX, setGastoAbierto, setSubPotreros, setTab,
}: Props) {
  // Helper para calcular semana ISO (YYYY-Www)
  const getISOWeekInfo = (dateStr: string) => {
    if (!dateStr) return null;
    const cleanDate = dateStr.slice(0, 10);
    const d = new Date(cleanDate + "T12:00:00Z");
    if (isNaN(d.getTime())) return null;

    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    const year = d.getUTCFullYear();
    const weekKey = `${year}-W${String(weekNo).padStart(2, "0")}`;

    const orig = new Date(cleanDate + "T12:00:00Z");
    const origDay = orig.getUTCDay() || 7;
    const monday = new Date(orig);
    monday.setUTCDate(orig.getUTCDate() - (origDay - 1));
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);

    const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", timeZone: "UTC" };
    const rangoTexto = `${monday.toLocaleDateString("es-ES", opts)} – ${sunday.toLocaleDateString("es-ES", opts)}`;

    return { weekKey, year, weekNo, rangoTexto, mondayTime: monday.getTime() };
  };

  const hoyInfo = getISOWeekInfo(fechaLocalISO());
  const semanaActualKey = hoyInfo?.weekKey ?? "2026-W37";

  const listaGastos = gastos;

  interface SemanaBucket {
    weekKey: string;
    rangoTexto: string;
    mondayTime: number;
    esSemanaActual: boolean;
    ingresosLeche: number;
    ingresosAnimales: number;
    ingresosTotales: number;
    gastosTotales: number;
    neto: number;
    gastosCount: number;
  }

  const weekMap = new Map<string, SemanaBucket>();

  const getOrCreateBucket = (info: NonNullable<ReturnType<typeof getISOWeekInfo>>) => {
    if (!weekMap.has(info.weekKey)) {
      weekMap.set(info.weekKey, {
        weekKey: info.weekKey,
        rangoTexto: info.rangoTexto,
        mondayTime: info.mondayTime,
        esSemanaActual: info.weekKey === semanaActualKey,
        ingresosLeche: 0,
        ingresosAnimales: 0,
        ingresosTotales: 0,
        gastosTotales: 0,
        neto: 0,
        gastosCount: 0,
      });
    }
    return weekMap.get(info.weekKey)!;
  };

  // Asegurar que la semana actual siempre esté inicializada
  if (hoyInfo) {
    getOrCreateBucket(hoyInfo);
  }

  // 1. Ingresos: Ventas de leche de tanque
  for (const v of ventasLeche) {
    const info = getISOWeekInfo(v.fecha);
    if (!info) continue;
    const b = getOrCreateBucket(info);
    const monto = Number(v.totalUSD) || (Number(v.litrosVendidos || 0) * Number(v.precioLitroUSD || precioLecheUSD));
    b.ingresosLeche += monto;
    b.ingresosTotales += monto;
  }

  // 2. Ingresos: Ordeños con venta directa
  for (const o of ordenos) {
    if (o.destino === "VENTA_DIRECTA" || (Number(o.montoVenta) > 0 && o.destino !== "TANQUE")) {
      const info = getISOWeekInfo(o.fecha);
      if (!info) continue;
      const b = getOrCreateBucket(info);
      const monto = Number(o.montoVenta) || (Number(o.cantidadLitros || 0) * (Number(o.precioVentaLitro) || precioLecheUSD));
      b.ingresosLeche += monto;
      b.ingresosTotales += monto;
    }
  }

  // 3. Ingresos: Ventas de Animales
  for (const va of ventasAnimales) {
    const info = getISOWeekInfo(va.fecha);
    if (!info) continue;
    const b = getOrCreateBucket(info);
    const monto = Number(va.total) || 0;
    b.ingresosAnimales += monto;
    b.ingresosTotales += monto;
  }

  // 4. Gastos Operativos
  for (const g of listaGastos) {
    const info = getISOWeekInfo(g.fecha);
    if (!info) continue;
    const b = getOrCreateBucket(info);
    const monto = Number(g.monto) || 0;
    b.gastosTotales += monto;
    b.gastosCount++;
  }

  // Calcular balances netos
  for (const b of weekMap.values()) {
    b.neto = b.ingresosTotales - b.gastosTotales;
  }

  // Orden cronológico descendente
  const listaSemanas = Array.from(weekMap.values()).sort((a, b) => b.mondayTime - a.mondayTime);

  const semActual = weekMap.get(semanaActualKey) || {
    weekKey: semanaActualKey,
    rangoTexto: hoyInfo?.rangoTexto ?? "Esta semana",
    mondayTime: 0,
    esSemanaActual: true,
    ingresosLeche: 0,
    ingresosAnimales: 0,
    ingresosTotales: 0,
    gastosTotales: 0,
    neto: 0,
    gastosCount: 0,
  };

  return (
    <div className="space-y-7 text-left">
      {/* Encabezado Principal de la Pestaña */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-['Outfit'] font-black text-2xl sm:text-3xl text-slate-900 dark:text-white">
            Finanzas y Reportes
          </h3>
          <p className="text-xs text-slate-500 dark:text-white/50 max-w-2xl">
            Caja semanal del hato: ingresos por leche y ganado frente a los gastos, y los reportes en PDF y Excel.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setGastoAbierto(true)}
            className="btn-cyber-neon text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg hover:scale-105 transition-all cursor-pointer flex items-center gap-2"
          >
            <IconCoins size={15} />
            <span>+ Registrar Gasto</span>
          </button>
          <button
            onClick={exportarInventarioXLSX}
            className="apple-glass px-4 py-2.5 rounded-xl border border-white/20 text-slate-700 dark:text-white text-xs font-bold hover:bg-white/10 cursor-pointer flex items-center gap-1.5"
          >
            <IconChart size={15} />
            <span>Exportar a Excel</span>
          </button>
        </div>
      </div>

      <ReportesCampoGanaderia vacunas={vacunas} notificar={notificar} />

      {/* 3 Tarjetas de Resumen Financiero Semanal (Semana Actual) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tarjeta 1: Ingresos de la Semana */}
        <div className="apple-glass rounded-3xl p-6 border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-slate-900/60 to-slate-900/80 text-left space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <IconChart size={13} /> Ingresos Semanales
            </span>
            <span className="text-[10px] tabular-nums font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {semActual.weekKey}
            </span>
          </div>
          <div className="font-['Outfit'] font-black text-3xl text-emerald-400">
            ${num(semActual.ingresosTotales, 2)} <span className="text-sm font-normal text-slate-400">USD</span>
          </div>
          <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="inline-flex items-center gap-1"><IconMilk size={11} /> Leche: ${num(semActual.ingresosLeche, 2)}</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1"><IconCow size={11} /> Ganado: ${num(semActual.ingresosAnimales, 2)}</span>
          </div>
          {(monedasConfig.VES || monedasConfig.COP) && (
            <div className="pt-2 border-t border-white/10 text-[11px] text-slate-300 flex flex-col gap-0.5">
              {monedasConfig.VES && (
                <div className="tabular-nums text-emerald-300">
                  Bs. {num((semActual.ingresosTotales * tasaBCV), 2)}
                </div>
              )}
              {monedasConfig.COP && (
                <div className="tabular-nums text-sky-300">
                  COP ${num(Math.round(semActual.ingresosTotales * tasaCOP), 0)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tarjeta 2: Gastos de la Semana */}
        <div className="apple-glass rounded-3xl p-6 border border-rose-500/30 bg-gradient-to-br from-rose-950/20 via-slate-900/60 to-slate-900/80 text-left space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <IconChart size={13} className="rotate-180" /> Gastos Semanales
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
              {semActual.gastosCount} registro(s)
            </span>
          </div>
          <div className="font-['Outfit'] font-black text-3xl text-rose-400">
            ${num(semActual.gastosTotales, 2)} <span className="text-sm font-normal text-slate-400">USD</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Egresos de caja en insumos, mano de obra y mantenimiento
          </div>
          {(monedasConfig.VES || monedasConfig.COP) && (
            <div className="pt-2 border-t border-white/10 text-[11px] text-slate-300 flex flex-col gap-0.5">
              {monedasConfig.VES && (
                <div className="tabular-nums text-rose-300">
                  Bs. {num((semActual.gastosTotales * tasaBCV), 2)}
                </div>
              )}
              {monedasConfig.COP && (
                <div className="tabular-nums text-sky-300">
                  COP ${num(Math.round(semActual.gastosTotales * tasaCOP), 0)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tarjeta 3: Neto de la Semana */}
        <div className={`apple-glass rounded-3xl p-6 border text-left space-y-2 shadow-lg ${
          semActual.neto >= 0
            ? "border-sky-500/30 bg-gradient-to-br from-sky-950/20 via-slate-900/60 to-slate-900/80"
            : "border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-slate-900/60 to-slate-900/80"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
              <IconScale size={13} /> Neto de la Semana
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              semActual.neto >= 0 ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
            }`}>
              {semActual.neto >= 0 ? "Superávit" : "Déficit"}
            </span>
          </div>
          <div className={`font-['Outfit'] font-black text-3xl ${semActual.neto >= 0 ? "text-sky-400" : "text-amber-400"}`}>
            {semActual.neto >= 0 ? `+$${num(semActual.neto, 2)}` : `-$${num(Math.abs(semActual.neto), 2)}`} <span className="text-sm font-normal text-slate-400">USD</span>
          </div>
          <div className="text-[11px] text-slate-400">
            {semActual.rangoTexto}
          </div>
          {(monedasConfig.VES || monedasConfig.COP) && (
            <div className="pt-2 border-t border-white/10 text-[11px] text-slate-300 flex flex-col gap-0.5">
              {monedasConfig.VES && (
                <div className="tabular-nums text-slate-200">
                  Bs. {num((semActual.neto * tasaBCV), 2)}
                </div>
              )}
              {monedasConfig.COP && (
                <div className="tabular-nums text-sky-300">
                  COP ${num(Math.round(semActual.neto * tasaCOP), 0)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sección 1: Gastos Operativos Recientes */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-['Outfit'] font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <IconCoins size={15} /> Gastos Operativos Recientes
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-white/40">
              Registro de egresos por categoría (alimentación, sanidad, jornales, repuestos)
            </p>
          </div>
          <button
            onClick={() => setGastoAbierto(true)}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
          >
            + Registrar Gasto
          </button>
        </div>

        {listaGastos.length === 0 ? (
          <div className="p-8 rounded-3xl border border-white/10 apple-glass text-center space-y-2">
            <span className="text-amber-400 flex justify-center"><IconFileText size={30} /></span>
            <h5 className="font-bold text-sm text-white">Sin gastos operativos registrados aún</h5>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Esta finca no tiene salidas de caja registradas. Presiona el botón "+ Registrar Gasto" para registrar alimentación, sanidad, insumos o jornales.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-slate-200/80 dark:border-white/10 apple-glass">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/50 border-b border-slate-200/80 dark:border-white/10">
                <tr>
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Categoría</th>
                  <th className="p-4">Descripción</th>
                  <th className="p-4">Monto USD</th>
                  {monedasConfig.VES && <th className="p-4 text-right">Monto Bs.</th>}
                  {monedasConfig.COP && <th className="p-4 text-right">Monto COP</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                {listaGastos.map(g => {
                  const cat = CATEGORIAS_GASTO_GANADERIA.find(c => c.id === g.categoria);
                  return (
                    <tr key={g.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 tabular-nums">{verFecha(g.fecha)}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${cat?.colorBadge || "text-slate-300 bg-white/10 border-white/20"}`}>
                          {cat ? <cat.icon size={12} /> : <IconTag size={12} />}
                          <span>{cat ? cat.label.split("/")[0].trim() : g.categoria}</span>
                        </span>
                      </td>
                      <td className="p-4 text-slate-800 dark:text-white/90 font-medium max-w-sm truncate">{g.descripcion}</td>
                      <td className="p-4 tabular-nums font-bold text-rose-400">${Number(g.monto).toFixed(2)}</td>
                      {monedasConfig.VES && (
                        <td className="p-4 text-right tabular-nums text-slate-400">
                          Bs. {num((Number(g.monto) * tasaBCV), 2)}
                        </td>
                      )}
                      {monedasConfig.COP && (
                        <td className="p-4 text-right tabular-nums text-sky-400/80">
                          COP ${num(Math.round(Number(g.monto) * tasaCOP), 0)}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sección 2: Flujo de Caja Semanal (Semanas ISO) */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-['Outfit'] font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <IconCalendar size={13} /> Flujo de Caja Semanal (Semanas ISO)
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-white/40">
              Balance neto: Ingresos (Leche en cisterna + ordeño + ganado) menos Gastos Operativos agrupados por semana ISO
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-slate-200/80 dark:border-white/10 apple-glass">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/50 border-b border-slate-200/80 dark:border-white/10">
              <tr>
                <th className="p-4">Semana</th>
                <th className="p-4">Venta Leche</th>
                <th className="p-4">Venta Ganado</th>
                <th className="p-4">Total Ingresos</th>
                <th className="p-4">Gastos Operativos</th>
                <th className="p-4">Balance Neto</th>
                {(monedasConfig.VES || monedasConfig.COP) && <th className="p-4 text-right">Equivalente Local</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
              {listaSemanas.map(s => (
                <tr key={s.weekKey} className={`hover:bg-white/5 transition-colors ${s.esSemanaActual ? "bg-emerald-500/[0.04]" : ""}`}>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums font-bold text-slate-900 dark:text-white">{s.weekKey}</span>
                      {s.esSemanaActual && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Semana Actual
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 block">{s.rangoTexto}</span>
                  </td>
                  <td className="p-4 tabular-nums text-sky-400">${num(s.ingresosLeche, 2)}</td>
                  <td className="p-4 tabular-nums text-emerald-400">${num(s.ingresosAnimales, 2)}</td>
                  <td className="p-4 tabular-nums font-bold text-slate-900 dark:text-white">${num(s.ingresosTotales, 2)}</td>
                  <td className="p-4 tabular-nums font-bold text-rose-400">${num(s.gastosTotales, 2)}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-xl tabular-nums font-black text-xs ${
                      s.neto >= 0
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                    }`}>
                      {s.neto >= 0 ? `+$${num(s.neto, 2)}` : `-$${num(Math.abs(s.neto), 2)}`}
                    </span>
                  </td>
                  {(monedasConfig.VES || monedasConfig.COP) && (
                    <td className="p-4 text-right tabular-nums text-xs">
                      {monedasConfig.VES && (
                        <div className={s.neto >= 0 ? "text-emerald-400" : "text-rose-400"}>
                          Bs. {num((s.neto * tasaBCV), 2)}
                        </div>
                      )}
                      {monedasConfig.COP && (
                        <div className="text-[10px] text-slate-400">
                          COP ${num(Math.round(s.neto * tasaCOP), 0)}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sección 3: Informes Oficiales & Exportaciones Consolidadas */}
      <div className="space-y-3 pt-4">
        <div>
          <h4 className="font-['Outfit'] font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <IconFileText size={13} /> Informes Consolidados & Exportaciones
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-white/40">
            Informes ejecutivos y de gestión técnica para auditoría, registros sanitarios y fiscales
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Reportes de Gestión */}
          <div className="apple-glass rounded-3xl p-5 border border-white/10 space-y-3">
            <h5 className="font-['Outfit'] font-bold text-sm text-slate-900 dark:text-white pb-2 border-b border-white/10">
              Gestión del Hato
            </h5>
            <div className="space-y-2 text-xs">
              <div className="p-2 rounded-xl hover:bg-white/5 cursor-pointer flex justify-between" onClick={exportarInventarioXLSX}>
                <span>Inventario de Animales</span>
                <span className="text-emerald-400 font-bold">Excel</span>
              </div>
              <div className="p-2 rounded-xl hover:bg-white/5 cursor-pointer flex justify-between" onClick={() => notificar("Generando informe de movimientos de potrero...")}>
                <span>Historial de Movimientos</span>
                <span className="text-emerald-400 font-bold">PDF</span>
              </div>
              <div className="p-2 rounded-xl hover:bg-white/5 cursor-pointer flex justify-between" onClick={() => notificar("Generando distribución reproductiva...")}>
                <span>Reproductores & Vientres</span>
                <span className="text-emerald-400 font-bold">Excel</span>
              </div>
            </div>
          </div>

          {/* Reportes de Animales */}
          <div className="apple-glass rounded-3xl p-5 border border-white/10 space-y-3">
            <h5 className="font-['Outfit'] font-bold text-sm text-slate-900 dark:text-white pb-2 border-b border-white/10">
              Animales & Vientres
            </h5>
            <div className="space-y-2 text-xs">
              <div className="p-2 rounded-xl hover:bg-white/5 cursor-pointer flex justify-between" onClick={() => notificar("Cargando vientres confirmados...")}>
                <span>Vientres Preñados</span>
                <span className="text-emerald-400 font-bold">Ver</span>
              </div>
              <div className="p-2 rounded-xl hover:bg-white/5 cursor-pointer flex justify-between" onClick={() => notificar("Cargando hembras próximas a parir...")}>
                <span>Próximas a Parir (30d)</span>
                <span className="text-emerald-400 font-bold">Ver</span>
              </div>
              <div className="p-2 rounded-xl hover:bg-white/5 cursor-pointer flex justify-between" onClick={() => notificar("Cargando hembras en ordeño...")}>
                <span>Animales en Lactancia</span>
                <span className="text-emerald-400 font-bold">Ver</span>
              </div>
            </div>
          </div>

          {/* Reportes de Potreros */}
          <div className="apple-glass rounded-3xl p-5 border border-white/10 space-y-3">
            <h5 className="font-['Outfit'] font-bold text-sm text-slate-900 dark:text-white pb-2 border-b border-white/10">
              Potreros & Pasturas
            </h5>
            <div className="space-y-2 text-xs">
              <div className="p-2 rounded-xl hover:bg-white/5 cursor-pointer flex justify-between" onClick={() => { setTab("potreros"); setSubPotreros("lista"); }}>
                <span>Aforo General de Pastos</span>
                <span className="text-emerald-400 font-bold">Ver</span>
              </div>
              <div className="p-2 rounded-xl hover:bg-white/5 cursor-pointer flex justify-between" onClick={() => notificar("Generando registro de descansos...")}>
                <span>Días de Descanso Acumulados</span>
                <span className="text-emerald-400 font-bold">Excel</span>
              </div>
              <div className="p-2 rounded-xl hover:bg-white/5 cursor-pointer flex justify-between" onClick={() => notificar("Calculando carga animal global...")}>
                <span>Carga Animal por Hectárea</span>
                <span className="text-emerald-400 font-bold">Excel</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
