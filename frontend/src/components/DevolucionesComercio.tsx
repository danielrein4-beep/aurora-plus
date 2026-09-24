import { useEffect, useRef, useState } from "react";
import { devolverTicketPos, lineasDeTicketPos, type LineaVendidaTicket } from "../api";

/**
 * Devolución total o parcial de un ticket del POS. Se busca el ticket, se marca cuánto vuelve
 * de cada producto y el motivo; el servidor devuelve el stock, rebaja el crédito si lo hubo y
 * saca de caja el resto con el método elegido.
 */
export default function DevolucionesComercio({ ticketInicial, onDevuelto }: {
  ticketInicial?: string;
  onDevuelto: (mensaje: string) => void;
}) {
  const [numero, setNumero] = useState(ticketInicial || "");
  const [lineas, setLineas] = useState<LineaVendidaTicket[] | null>(null);
  const [cantidades, setCantidades] = useState<Record<number, string>>({});
  const [motivo, setMotivo] = useState("");
  const [metodo, setMetodo] = useState("EFECTIVO");
  const [moneda, setMoneda] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Clave estable mientras no cambie lo que se devuelve: un doble clic o un reintento no devuelve dos veces.
  const claveRef = useRef<{ firma: string; clave: string } | null>(null);

  const buscar = async (n = numero) => {
    const limpio = n.trim().toUpperCase();
    if (!limpio) return;
    setError(null);
    setBuscando(true);
    try {
      const encontradas = await lineasDeTicketPos(limpio);
      setLineas(encontradas);
      setCantidades({});
      if (encontradas.length === 0) setError("No hay ventas con ese número de ticket");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo buscar el ticket");
      setLineas(null);
    } finally {
      setBuscando(false);
    }
  };

  useEffect(() => {
    if (ticketInicial) { setNumero(ticketInicial); buscar(ticketInicial); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketInicial]);

  const pendiente = (l: LineaVendidaTicket) => Math.max(0, Number(l.cantidad) - Number(l.devuelto || 0));
  const montoLinea = (l: LineaVendidaTicket, cant: number) =>
    l.total != null && Number(l.cantidad) > 0 ? (Number(l.total) * cant) / Number(l.cantidad) : 0;

  const seleccion = (lineas || [])
    .map((l) => ({ l, cant: Number(cantidades[l.movimientoId] || 0) }))
    .filter((x) => x.cant > 0);
  const totalADevolver = seleccion.reduce((acc, x) => acc + montoLinea(x.l, x.cant), 0);

  const devolverTodo = () => {
    const todas: Record<number, string> = {};
    (lineas || []).forEach((l) => { if (pendiente(l) > 0) todas[l.movimientoId] = String(pendiente(l)); });
    setCantidades(todas);
  };

  const confirmar = async () => {
    setError(null);
    if (seleccion.length === 0) { setError("Indica cuántas unidades vuelven"); return; }
    const excedida = seleccion.find((x) => x.cant > pendiente(x.l));
    if (excedida) { setError(`De ${excedida.l.codigoSku} solo quedan ${pendiente(excedida.l)} por devolver`); return; }
    if (!motivo.trim()) { setError("Escribe el motivo de la devolución"); return; }
    const lineasEnvio = seleccion.map((x) => ({ movimientoId: x.l.movimientoId, cantidad: x.cant }));
    const firma = JSON.stringify([numero.trim().toUpperCase(), lineasEnvio, motivo.trim(), metodo, moneda]);
    if (!claveRef.current || claveRef.current.firma !== firma) {
      claveRef.current = { firma, clave: `${numero.trim().toUpperCase()}-${Date.now()}-${Math.floor(Math.random() * 1e6)}` };
    }
    setEnviando(true);
    try {
      const r = await devolverTicketPos({
        numeroTicket: numero.trim().toUpperCase(),
        lineas: lineasEnvio,
        motivo: motivo.trim(),
        metodoReembolso: metodo,
        monedaReembolso: moneda || undefined,
        clave: claveRef.current.clave,
      });
      claveRef.current = null;
      if (r.yaProcesada) {
        onDevuelto("Esta devolución ya estaba registrada: no se hizo dos veces");
      } else {
        const partes = [`Devolución registrada por ${Number(r.montoDevuelto || 0).toFixed(2)}`];
        if (Number(r.rebajadoDeCredito || 0) > 0) partes.push(`${Number(r.rebajadoDeCredito).toFixed(2)} rebajado del crédito`);
        if (Number(r.reembolsadoEnCaja || 0) > 0) partes.push(`${Number(r.reembolsadoEnCaja).toFixed(2)} ${r.monedaReembolso} devueltos de caja`);
        onDevuelto(partes.join(" · "));
      }
      setMotivo("");
      await buscar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar la devolución");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-4">
      <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Devolver una venta</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            La mercancía vuelve al inventario. Si la venta fue a crédito, primero se rebaja lo que el cliente debe; el resto sale de caja.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") buscar(); }}
            placeholder="Número de ticket (ej. TKT-123456)"
            className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono text-slate-900 dark:text-white"
          />
          <button
            onClick={() => buscar()}
            disabled={buscando}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
          >
            {buscando ? "Buscando…" : "Buscar ticket"}
          </button>
        </div>
      </div>

      {lineas && lineas.length > 0 && (
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-bold text-xs text-slate-700 dark:text-slate-200 uppercase tracking-wider">Productos del ticket</h4>
            <button onClick={devolverTodo} className="text-xs font-bold text-teal-700 dark:text-teal-300 cursor-pointer hover:underline">
              Devolver todo lo pendiente
            </button>
          </div>
          <div className="space-y-2">
            {lineas.map((l) => {
              const quedan = pendiente(l);
              return (
                <div key={l.movimientoId} className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{l.descripcion}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      {l.codigoSku} · vendido {Number(l.cantidad)} · total {Number(l.total || 0).toFixed(2)}
                      {Number(l.devuelto) > 0 && ` · ya devuelto ${Number(l.devuelto)}`}
                    </div>
                  </div>
                  {quedan > 0 ? (
                    <input
                      type="number"
                      min={0}
                      max={quedan}
                      step="any"
                      value={cantidades[l.movimientoId] || ""}
                      onChange={(e) => setCantidades((c) => ({ ...c, [l.movimientoId]: e.target.value }))}
                      placeholder={`máx. ${quedan}`}
                      className="w-24 px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-right text-slate-900 dark:text-white"
                    />
                  ) : (
                    <span className="text-[11px] font-bold text-slate-400">Devuelto completo</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700/60">
            <input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Motivo (defecto, cambio, error de cobro…)"
              className="sm:col-span-3 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
            />
            <select
              value={metodo}
              onChange={(e) => setMetodo(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
            >
              <option value="EFECTIVO">Se devuelve en efectivo</option>
              <option value="PAGO_MOVIL">Por pago móvil</option>
              <option value="TRANSFERENCIA">Por transferencia</option>
              <option value="TARJETA">Reverso de tarjeta</option>
            </select>
            <select
              value={moneda}
              onChange={(e) => setMoneda(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
            >
              <option value="">En la moneda base</option>
              <option value="USD">En dólares</option>
              <option value="VES">En bolívares</option>
              <option value="COP">En pesos</option>
              <option value="EUR">En euros</option>
            </select>
            <div className="flex items-center justify-end text-sm font-bold text-slate-900 dark:text-white">
              A devolver: <span className="font-mono ml-1.5">{totalADevolver.toFixed(2)}</span>
            </div>
          </div>
          <button
            onClick={confirmar}
            disabled={enviando || seleccion.length === 0}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold cursor-pointer disabled:opacity-50"
          >
            {enviando ? "Registrando…" : "Registrar devolución"}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}
