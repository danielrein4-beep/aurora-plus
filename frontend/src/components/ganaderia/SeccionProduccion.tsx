import { IconTruck, IconMilk, IconEdit, IconSettings } from "../../Icons";
import type { RegistroOrdenoGanaderia, TanqueLeche, VentaLecheTanque } from "../../api";
import type { MonedasConfig } from "./tipos";
import { num, verFecha, verTurno } from "./formato";

interface Props {
  monedasConfig: MonedasConfig;
  ordenos: RegistroOrdenoGanaderia[];
  precioLecheUSD: number;
  tanqueLeche: TanqueLeche | null;
  tasaBCV: number;
  tasaCOP: number;
  ventasLeche: VentaLecheTanque[];
  abrirVaqueraRapida: () => void;
  setModalAjusteTanque: (abierto: boolean) => void;
  setModalEditarPrecioLeche: (abierto: boolean) => void;
  setModalEditarTasas: (abierto: boolean) => void;
  setModalVentaLeche: (abierto: boolean) => void;
  setOrdenoAbierto: (abierto: boolean) => void;
}

/** Producción de leche: tanque, precio del litro, ordeños del día y despachos. */
export default function SeccionProduccion({
  monedasConfig, ordenos, precioLecheUSD, tanqueLeche, tasaBCV, tasaCOP, ventasLeche,
  abrirVaqueraRapida, setModalAjusteTanque, setModalEditarPrecioLeche, setModalEditarTasas,
  setModalVentaLeche, setOrdenoAbierto,
}: Props) {
  return (
    <div className="space-y-6 text-left">
      
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
            Producción de Leche
          </h3>
          <p className="text-xs text-slate-500 dark:text-white/40">
            Ordeños por vaca y turno, tanque de frío y despachos a planta o cisterna.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={abrirVaqueraRapida}
            className="btn-cyber-neon text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md hover:scale-105 transition-all flex items-center gap-2 cursor-pointer">
            <span>Jornada de ordeño (todo el rebaño)</span>
          </button>
          <button
            onClick={() => setOrdenoAbierto(true)}
            className="apple-glass px-4 py-2 rounded-xl border border-white/20 text-slate-700 dark:text-white text-xs font-bold hover:bg-white/10 cursor-pointer">
            + Ordeño Individual
          </button>
        </div>
      </div>

      {/* Resumen de Producción */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="apple-glass rounded-2xl p-5 border border-white/10 text-left space-y-1">
          <div className="text-xs text-slate-400 font-medium">Producción Total Registrada</div>
          <div className="font-['Outfit'] font-black text-3xl text-slate-900 dark:text-white">
            {ordenos.reduce((sum, o) => sum + (Number(o.cantidadLitros) || 0), 0).toFixed(1)} L
          </div>
          <div className="text-[11px] text-slate-500 dark:text-white/40">En {ordenos.length} registros individuales</div>
        </div>

        <div className="apple-glass rounded-2xl p-5 border border-white/10 text-left space-y-1">
          <div className="text-xs text-slate-400 font-medium">Valor de la leche ordeñada (USD)</div>
          <div className="font-['Outfit'] font-black text-3xl text-teal-700 dark:text-teal-300">
            ${ordenos.reduce((sum, o) => sum + (Number(o.montoVenta) || 0), 0).toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-white/40 flex items-center justify-between">
            <span>{precioLecheUSD > 0 ? `Precio actual: $${num(precioLecheUSD, 2)} por litro` : "Precio del litro sin fijar"}</span>
            <button
              type="button"
              onClick={() => setModalEditarPrecioLeche(true)}
              className="text-sky-400 hover:text-sky-300 font-bold ml-1 underline cursor-pointer text-[10px]">
              <span className="inline-flex items-center gap-1"><IconEdit size={11} /> Editar Precio</span>
            </button>
          </div>
        </div>

        <div className="apple-glass rounded-2xl p-5 border border-white/10 text-left space-y-1">
          <div className="text-xs text-slate-400 font-medium">Equivalente en Moneda Local</div>
          <div className="font-['Outfit'] font-black text-2xl text-slate-900 dark:text-white">
            {monedasConfig.VES && (
              <div>Bs. {(ordenos.reduce((sum, o) => sum + (Number(o.montoVenta) || 0), 0) * tasaBCV).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            )}
            {monedasConfig.COP && (
              <div className="text-lg text-sky-400">COP ${Math.round(ordenos.reduce((sum, o) => sum + (Number(o.montoVenta) || 0), 0) * tasaCOP).toLocaleString()}</div>
            )}
            {!monedasConfig.VES && !monedasConfig.COP && (
              <div className="text-base text-slate-400">Solo USD (Base)</div>
            )}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-white/40 flex items-center justify-between">
            <span>{monedasConfig.VES ? `Tasa Bs: ${num(tasaBCV, 2)}` : "Configuración de monedas"}</span>
            <button onClick={() => setModalEditarTasas(true)} className="text-purple-400 hover:text-purple-300 font-bold ml-2 underline cursor-pointer">
              <span className="inline-flex items-center gap-1"><IconSettings size={11} /> Monedas & Tasas</span>
            </button>
          </div>
        </div>
      </div>

      {/* Subsección: Tanque de Leche & Despacho a Cisterna */}
      <div className="apple-glass rounded-3xl p-5 border border-sky-500/20 bg-sky-950/20 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sky-400"><IconMilk size={26} /></span>
          <div>
            <h4 className="font-['Outfit'] font-bold text-base text-slate-900 dark:text-white">
              Tanque Frío: {num((tanqueLeche?.stockActualLitros ?? 0), 0)} L en el tanque
            </h4>
            <p className="text-xs text-slate-500 dark:text-white/50">
              Capacidad {num((tanqueLeche?.capacidadLitros ?? 2000), 0)} L • Temperatura {tanqueLeche?.temperaturaCelsius ?? 4.0}°C
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModalAjusteTanque(true)}
            className="px-3 py-1.5 rounded-xl apple-glass border border-white/15 text-slate-700 dark:text-white text-xs font-semibold cursor-pointer">
            <span className="inline-flex items-center gap-1.5"><IconSettings size={13} /> Calibrar</span> Tanque
          </button>
          <button
            type="button"
            onClick={() => setModalVentaLeche(true)}
            className="btn-cyber-neon text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5"><IconTruck size={14} /> Despachar / Venta Cisterna</span>
          </button>
        </div>
      </div>

      {/* Tabla de Registros de Ordeño */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-['Outfit'] font-bold text-sm text-slate-900 dark:text-white">
            Registros de Ordeño por Vaca & Turno
          </h4>
          <span className="text-xs text-slate-400">{ordenos.length} registros</span>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-slate-200/80 dark:border-white/10 apple-glass">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/50 border-b border-slate-200/80 dark:border-white/10">
              <tr>
                <th className="p-4">Fecha</th>
                <th className="p-4">Arete / Animal</th>
                <th className="p-4">Turno</th>
                <th className="p-4">Destino</th>
                <th className="p-4">Litros</th>
                <th className="p-4">% Grasa / Prot.</th>
                <th className="p-4">Monto USD</th>
                {monedasConfig.VES && <th className="p-4 text-right">Monto Bs.</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
              {ordenos.map(o => (
                <tr key={o.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 tabular-nums">{verFecha(o.fecha)}</td>
                  <td className="p-4 font-bold text-slate-900 dark:text-white">
                    {o.animal?.arete} - {o.animal?.nombre || "Sin nombre"}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      o.turno === "MANANA" ? "bg-amber-500/15 text-amber-500" : "bg-indigo-500/15 text-indigo-400"
                    }`}>
                      {verTurno(o.turno)}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      o.destino === "VENTA_DIRECTA"
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                        : "bg-sky-500/15 text-sky-400 border border-sky-500/30"
                    }`}>
                      {o.destino === "VENTA_DIRECTA" ? "Venta Directa" : "Tanque"}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-sky-500 text-sm">{o.cantidadLitros} L</td>
                  <td className="p-4 text-slate-400">{o.porcentajeGrasa || 3.8}% / {o.porcentajeProteina || 3.2}%</td>
                  <td className="p-4 font-bold text-emerald-500">${Number(o.montoVenta || 0).toFixed(2)}</td>
                  {monedasConfig.VES && (
                    <td className="p-4 text-right tabular-nums text-slate-500 dark:text-white/70">
                      Bs. {(Number(o.montoVenta || 0) * tasaBCV).toFixed(2)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Histórico de Ventas de Leche (Despachos de Tanque) */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-['Outfit'] font-bold text-sm text-slate-900 dark:text-white">
              Histórico de Despachos & Ventas de Leche en Tanque
            </h4>
            <p className="text-[11px] text-slate-400">Entregas de cisterna a receptoras, queseras o plantas industriales</p>
          </div>
          <button
            type="button"
            onClick={() => setModalVentaLeche(true)}
            className="text-xs font-bold text-sky-400 hover:text-sky-300 underline cursor-pointer">
            + Registrar Despacho
          </button>
        </div>

        {ventasLeche.length === 0 ? (
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center text-xs text-slate-400">
            No hay ventas registradas aún. El stock del tanque se acumula de los ordeños diarios con destino "Tanque".
          </div>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-slate-200/80 dark:border-white/10 apple-glass">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/50 border-b border-slate-200/80 dark:border-white/10">
                <tr>
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Comprador / Planta</th>
                  <th className="p-4">Litros Vendidos</th>
                  <th className="p-4">Precio x Litro</th>
                  <th className="p-4">Total USD</th>
                  <th className="p-4">Moneda Pago</th>
                  <th className="p-4">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                {ventasLeche.map(v => (
                  <tr key={v.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 tabular-nums">{verFecha(v.fecha)}</td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white">{v.compradorOPlanta}</td>
                    <td className="p-4 font-bold text-sky-400">{v.litrosVendidos} L</td>
                    <td className="p-4 tabular-nums">${Number(v.precioLitroUSD).toFixed(4)}</td>
                    <td className="p-4 font-bold text-emerald-400">${Number(v.totalUSD).toFixed(2)}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white border border-white/15">
                        {v.monedaPago || "USD"}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 italic max-w-xs truncate">{v.notas || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
