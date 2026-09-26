import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { reporteCobrosSalud, type CobroSaludDetalle, type Paciente, type ProcedimientoMedico } from "../../api";
import {
  Aviso, Boton, Campo, Cargando, EncabezadoPagina, Kpi, Modal, Tarjeta, Vacio, claseInput,
  formatearFecha, formatearHora, formatearMonto, hoyISO, mensajeError, sumarDias,
} from "./comun";
import { FormularioPago, NOMBRE_METODO, PAGO_INICIAL, cobrar, claveIdempotencia, useTasaBs, type DatosPago } from "./Cobro";

type Rango = "hoy" | "semana" | "mes";

function rangoFechas(r: Rango): [string, string] {
  const hoy = hoyISO();
  if (r === "hoy") return [hoy, hoy];
  if (r === "semana") return [sumarDias(hoy, -6), hoy];
  return [`${hoy.slice(0, 8)}01`, hoy];
}

export default function Caja({ clientas, servicios, onCambio }: { clientas: Paciente[]; servicios: ProcedimientoMedico[]; onCambio?: () => void }) {
  const [rango, setRango] = useState<Rango>("hoy");
  const [cobros, setCobros] = useState<CobroSaludDetalle[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cobrando, setCobrando] = useState(false);

  const cargar = useCallback(async () => {
    const [ini, fin] = rangoFechas(rango);
    try {
      setCobros(await reporteCobrosSalud(`${ini}T00:00:00`, `${fin}T23:59:59`));
      setError(null);
    } catch (e) {
      setError(mensajeError(e, "No se pudieron cargar los cobros."));
    } finally {
      setCargando(false);
    }
  }, [rango]);

  useEffect(() => { setCargando(true); cargar(); }, [cargar]);

  const validos = cobros.filter((c) => c.estado !== "ANULADO");
  const totales = useMemo(() => {
    const porMoneda: Record<string, number> = {};
    const porMetodo: Record<string, number> = {};
    for (const c of validos) {
      porMoneda[c.monedaPago] = (porMoneda[c.monedaPago] ?? 0) + Number(c.montoRecibido);
      porMetodo[c.metodoPago] = (porMetodo[c.metodoPago] ?? 0) + 1;
    }
    return { porMoneda, porMetodo };
  }, [validos]);

  const etiqueta = rango === "hoy" ? "hoy" : rango === "semana" ? "últimos 7 días" : "este mes";

  return (
    <div>
      <EncabezadoPagina
        titulo="Caja"
        subtitulo="Cobros de servicios y paquetes"
        acciones={<Boton onClick={() => setCobrando(true)}>Cobrar servicio</Boton>}
      />
      <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-white/5 text-xs font-semibold mb-4">
        {(["hoy", "semana", "mes"] as Rango[]).map((r) => (
          <button key={r} onClick={() => setRango(r)} className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${rango === r ? "bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-white/50"}`}>
            {r === "hoy" ? "Hoy" : r === "semana" ? "7 días" : "Mes"}
          </button>
        ))}
      </div>

      {error && <div className="mb-4"><Aviso onCerrar={() => setError(null)}>{error}</Aviso></div>}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <Kpi label={`Dólares ${etiqueta}`} valor={formatearMonto(totales.porMoneda.USD ?? 0, "USD")} color="#9E4A63" />
        <Kpi label={`Bolívares ${etiqueta}`} valor={formatearMonto(totales.porMoneda.VES ?? 0, "VES")} color="#E3A6B4" />
        <Kpi label="Cobros" valor={String(validos.length)} sub={Object.entries(totales.porMetodo).map(([m, n]) => `${NOMBRE_METODO[m] ?? m}: ${n}`).join(" · ") || undefined} color="#64748b" />
      </div>

      <Tarjeta className="overflow-hidden">
        {cargando ? (
          <Cargando texto="Cargando cobros…" />
        ) : cobros.length === 0 ? (
          <Vacio titulo={`Sin cobros ${etiqueta}`} />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-white/10">
            {cobros.map((c) => (
              <li key={c.id} className={`flex items-center gap-3 px-4 sm:px-5 py-3 ${c.estado === "ANULADO" ? "opacity-50 line-through" : ""}`}>
                <div className="w-14 flex-shrink-0 text-xs text-slate-500">
                  {rango === "hoy" ? formatearHora(c.fechaHora) : formatearFecha(c.fechaHora)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{c.concepto.replace(/^SALUD:\s*/, "")}</div>
                  <div className="text-xs text-slate-500 dark:text-white/50 truncate">
                    {c.paciente?.nombreCompleto ?? "Sin clienta"} · {NOMBRE_METODO[c.metodoPago] ?? c.metodoPago}{c.referenciaPago ? ` · Ref. ${c.referenciaPago}` : ""}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{formatearMonto(c.montoRecibido, c.monedaPago)}</div>
                  {c.monedaPago !== c.monedaCobrada && <div className="text-[11px] text-slate-400">{formatearMonto(c.montoTotal, c.monedaCobrada)}</div>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      {cobrando && (
        <CobrarServicio
          clientas={clientas}
          servicios={servicios}
          onCerrar={() => setCobrando(false)}
          onListo={() => { setCobrando(false); if (rango !== "hoy") setRango("hoy"); else cargar(); onCambio?.(); }}
        />
      )}
    </div>
  );
}

function CobrarServicio({ clientas, servicios, onCerrar, onListo }: {
  clientas: Paciente[]; servicios: ProcedimientoMedico[]; onCerrar: () => void; onListo: () => void;
}) {
  const { tasa } = useTasaBs();
  const [clientaId, setClientaId] = useState("");
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [pago, setPago] = useState<DatosPago>(PAGO_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clave = useRef(claveIdempotencia());

  const elegirServicio = (nombre: string) => {
    setConcepto(nombre);
    const s = servicios.find((x) => x.nombre === nombre);
    if (s) setMonto(String(s.costo));
  };

  const montoNum = Number(monto) || 0;

  const confirmar = async () => {
    if (!concepto.trim()) { setError("Indica qué se cobra."); return; }
    setGuardando(true);
    setError(null);
    try {
      await cobrar({
        pacienteId: clientaId ? Number(clientaId) : undefined, concepto: concepto.trim(), monto: montoNum, moneda: "USD", pago, tasa, clave: clave.current,
      });
      onListo();
    } catch (e) {
      setError(mensajeError(e, "No se pudo registrar el cobro."));
      setGuardando(false);
    }
  };

  return (
    <Modal titulo="Cobrar servicio" onCerrar={onCerrar}>
      <div className="space-y-3">
        <Campo label="Clienta (opcional)">
          <select className={claseInput} value={clientaId} onChange={(e) => setClientaId(e.target.value)}>
            <option value="">Sin clienta registrada</option>
            {[...clientas].sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto, "es")).map((c) => (
              <option key={c.id} value={c.id}>{c.nombreCompleto}</option>
            ))}
          </select>
        </Campo>
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <Campo label="Servicio o concepto">
            <input className={claseInput} list="servicios-caja" value={concepto} onChange={(e) => elegirServicio(e.target.value)} autoFocus />
            <datalist id="servicios-caja">{servicios.map((s) => <option key={s.id} value={s.nombre} />)}</datalist>
          </Campo>
          <Campo label="Monto (USD)">
            <input type="number" min={0} step="0.01" className={claseInput} value={monto} onChange={(e) => setMonto(e.target.value)} />
          </Campo>
        </div>
        {montoNum > 0 && <FormularioPago monto={montoNum} moneda="USD" valor={pago} onChange={setPago} tasa={tasa} />}
        {error && <Aviso onCerrar={() => setError(null)}>{error}</Aviso>}
        <div className="flex justify-end gap-2 pt-1">
          <Boton tipo="secundario" onClick={onCerrar}>Cancelar</Boton>
          <Boton onClick={confirmar} disabled={guardando || montoNum <= 0}>{guardando ? "Cobrando…" : montoNum > 0 ? `Cobrar ${formatearMonto(montoNum)}` : "Cobrar"}</Boton>
        </div>
      </div>
    </Modal>
  );
}
