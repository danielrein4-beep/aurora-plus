import { useEffect, useState } from "react";
import {
  listarPagosReportadosSuperAdmin, verificarPagoReportadoSuperAdmin, rechazarPagoReportadoSuperAdmin,
  type PagoReportadoSuperAdmin,
} from "../api";
import { avisar } from "../avisos";

const METODOS: [string, string][] = [
  ["PAGO_MOVIL", "Pago Móvil"],
  ["TRANSFERENCIA_VES", "Transferencia Bs"],
  ["ZELLE", "Zelle"],
  ["BINANCE_USDT", "Binance USDT"],
  ["EFECTIVO_USD", "Efectivo USD"],
];

/** Traduce lo que el cliente escribió como método al código que usa el registro de pagos. */
function metodoDesde(texto: string | null): string {
  const t = (texto || "").toLowerCase();
  if (t.includes("móvil") || t.includes("movil")) return "PAGO_MOVIL";
  if (t.includes("zelle")) return "ZELLE";
  if (t.includes("binance") || t.includes("usdt")) return "BINANCE_USDT";
  if (t.includes("efectivo")) return "EFECTIVO_USD";
  if (t.includes("transfer")) return "TRANSFERENCIA_VES";
  const exacto = METODOS.find(([codigo]) => codigo === (texto || "").toUpperCase());
  return exacto ? exacto[0] : "PAGO_MOVIL";
}

const fmtFecha = (iso: string) => new Date(iso).toLocaleString("es-VE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * Pagos que los clientes reportaron desde Aurora Hub y faltan por verificar. Mientras un reporte
 * esté aquí (hasta 15 días), al negocio no se le suspende el servicio por vencimiento.
 * Verificar registra el pago (acredita el tiempo, reactiva y habilita el recibo) y cierra el reporte.
 */
export default function PagosPorVerificar({ onCambio, onConteo }: { onCambio: () => void; onConteo?: (n: number) => void }) {
  const [reportes, setReportes] = useState<PagoReportadoSuperAdmin[] | null>(null);
  const [abierto, setAbierto] = useState<PagoReportadoSuperAdmin | null>(null);
  const [form, setForm] = useState({ monto: "", moneda: "USD", metodoPago: "PAGO_MOVIL", referencia: "", meses: "1", dias: "" });
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [trabajando, setTrabajando] = useState(false);

  const cargar = () => {
    listarPagosReportadosSuperAdmin()
      .then((r) => { setReportes(r); onConteo?.(r.length); })
      .catch((e) => { setReportes([]); avisar(`No se pudieron cargar los pagos reportados: ${e?.message || "error"}`, "error"); });
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(cargar, []);

  const abrir = (r: PagoReportadoSuperAdmin) => {
    setAbierto(r);
    setMotivoRechazo("");
    setForm({
      monto: r.monto != null ? String(r.monto) : "",
      moneda: r.moneda || "USD",
      metodoPago: metodoDesde(r.metodo),
      referencia: r.referencia || "",
      meses: "1",
      dias: "",
    });
  };

  const verificar = async () => {
    if (!abierto) return;
    const monto = Number(form.monto);
    if (!(monto > 0)) { avisar("Indica el monto que llegó al banco.", "error"); return; }
    const meses = Number(form.meses) || 0;
    const dias = Number(form.dias) || 0;
    if (meses <= 0 && dias <= 0) { avisar("Indica cuántos meses o días se acreditan.", "error"); return; }
    setTrabajando(true);
    try {
      await verificarPagoReportadoSuperAdmin(abierto.ticketId, {
        monto, moneda: form.moneda, metodoPago: form.metodoPago, referencia: form.referencia.trim() || undefined,
        meses: meses || undefined, dias: dias || undefined,
      });
      avisar(`Pago de ${abierto.nombreEmpresa} verificado. Se acreditó el tiempo y el cliente ya tiene su recibo.`);
      setAbierto(null);
      cargar();
      onCambio();
    } catch (e: any) {
      avisar(e?.message || "No se pudo verificar el pago", "error");
    } finally {
      setTrabajando(false);
    }
  };

  const rechazar = async () => {
    if (!abierto) return;
    if (!motivoRechazo.trim()) { avisar("Escribe el motivo del rechazo; se le envía al cliente.", "error"); return; }
    setTrabajando(true);
    try {
      await rechazarPagoReportadoSuperAdmin(abierto.ticketId, motivoRechazo.trim());
      avisar(`Reporte de ${abierto.nombreEmpresa} rechazado. El cliente recibió el motivo en soporte.`);
      setAbierto(null);
      cargar();
    } catch (e: any) {
      avisar(e?.message || "No se pudo rechazar el reporte", "error");
    } finally {
      setTrabajando(false);
    }
  };

  const input = "w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-emerald-500";

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-['Outfit'] font-black text-base text-slate-900">Pagos por verificar</h3>
          <p className="text-xs text-slate-500">
            Reportados por los clientes desde Aurora Hub. Mientras esperan aquí (hasta 15 días), el negocio no se suspende.
          </p>
        </div>
        <button onClick={cargar} className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-xs cursor-pointer">
          Refrescar
        </button>
      </div>

      {reportes === null ? (
        <p className="text-xs text-slate-400">Cargando…</p>
      ) : reportes.length === 0 ? (
        <p className="text-xs text-slate-500 bg-slate-50 rounded-xl p-4 text-center">No hay pagos pendientes de verificar.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <th className="py-2 pr-3">Reportado</th>
                <th className="py-2 pr-3">Negocio</th>
                <th className="py-2 pr-3">Monto</th>
                <th className="py-2 pr-3">Método / Ref.</th>
                <th className="py-2 pr-3">Plan vence</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {reportes.map((r) => (
                <tr key={r.ticketId} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 pr-3 text-slate-500 whitespace-nowrap">{fmtFecha(r.fecha)}</td>
                  <td className="py-2.5 pr-3">
                    <div className="font-bold text-slate-900">{r.nombreEmpresa}</div>
                    <div className="text-[10px] text-slate-400">#{r.tenantId}{r.usuario ? ` · ${r.usuario}` : ""}{r.plan ? ` · ${r.plan}` : ""}</div>
                  </td>
                  <td className="py-2.5 pr-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                    {r.monto != null ? `${Number(r.monto).toLocaleString("es-VE", { minimumFractionDigits: 2 })} ${r.moneda}` : "—"}
                  </td>
                  <td className="py-2.5 pr-3 text-slate-600">
                    {r.metodo || "—"}
                    <div className="font-mono text-[10px] text-slate-400">{r.referencia || "sin referencia"}</div>
                  </td>
                  <td className="py-2.5 pr-3 whitespace-nowrap">
                    <span className={r.vencida ? "text-rose-600 font-bold" : "text-slate-600"}>
                      {r.fechaVencimiento ? new Date(r.fechaVencimiento + "T00:00:00").toLocaleDateString("es-VE") : "—"}
                    </span>
                    {r.vencida && <div className="text-[10px] text-rose-500">vencido, sin suspender</div>}
                  </td>
                  <td className="py-2.5 text-right">
                    <button onClick={() => abrir(r)} className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer">
                      Revisar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {abierto && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => !trabajando && setAbierto(null)}>
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="font-['Outfit'] font-black text-lg text-slate-900">Verificar pago de {abierto.nombreEmpresa}</h3>
              <p className="text-xs text-slate-500">
                Reporte #{abierto.ticketId} del {fmtFecha(abierto.fecha)}. Confirma en el banco y ajusta lo que haga falta.
                {abierto.nota ? ` Nota del cliente: ${abierto.nota}` : ""}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-[11px] font-bold text-slate-500">Monto recibido
                <input type="number" step="0.01" min="0" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} className={input} />
              </label>
              <label className="text-[11px] font-bold text-slate-500">Moneda
                <select value={form.moneda} onChange={(e) => setForm({ ...form, moneda: e.target.value })} className={input}>
                  {["USD", "USDT", "VES", "COP", "EUR"].map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </label>
              <label className="text-[11px] font-bold text-slate-500">Método
                <select value={form.metodoPago} onChange={(e) => setForm({ ...form, metodoPago: e.target.value })} className={input}>
                  {METODOS.map(([c, l]) => <option key={c} value={c}>{l}</option>)}
                </select>
              </label>
              <label className="text-[11px] font-bold text-slate-500">Referencia
                <input value={form.referencia} onChange={(e) => setForm({ ...form, referencia: e.target.value })} className={input} />
              </label>
              <label className="text-[11px] font-bold text-slate-500">Meses que se acreditan
                <input type="number" min="0" value={form.meses} onChange={(e) => setForm({ ...form, meses: e.target.value })} className={input} />
              </label>
              <label className="text-[11px] font-bold text-slate-500">Días adicionales
                <input type="number" min="0" placeholder="0" value={form.dias} onChange={(e) => setForm({ ...form, dias: e.target.value })} className={input} />
              </label>
            </div>

            <button onClick={verificar} disabled={trabajando}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm cursor-pointer disabled:opacity-60">
              {trabajando ? "Guardando…" : "Pago verificado: registrar y acreditar"}
            </button>

            <div className="pt-3 border-t border-slate-100 space-y-2">
              <label className="text-[11px] font-bold text-slate-500 block">Si el pago no aparece o no coincide
                <input value={motivoRechazo} onChange={(e) => setMotivoRechazo(e.target.value)}
                  placeholder="Ej. La referencia no aparece en el banco" className={input} />
              </label>
              <div className="flex gap-2">
                <button onClick={() => setAbierto(null)} disabled={trabajando}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer">
                  Cerrar
                </button>
                <button onClick={rechazar} disabled={trabajando}
                  className="flex-1 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs cursor-pointer disabled:opacity-60">
                  Rechazar reporte
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
