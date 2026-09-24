import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  listarPaquetesEstetica, crearPaqueteEstetica, vincularCobroPaqueteEstetica, anularPaqueteEstetica,
  type PaqueteEstetica, type Paciente, type ProcedimientoMedico,
} from "../../api";
import { IconWhatsApp } from "../../Icons";
import {
  Aviso, Boton, Campo, Cargando, EncabezadoPagina, Insignia, Modal, Tarjeta, Vacio, claseInput,
  enlaceWhatsApp, formatearFecha, formatearMonto, hoyISO, mensajeError, sumarDias,
} from "./comun";
import { FormularioPago, PAGO_INICIAL, cobrar, claveIdempotencia, useTasaBs, type DatosPago } from "./Cobro";

function colorEstado(e: PaqueteEstetica["estado"]): "verde" | "slate" | "ambar" | "rojo" {
  return e === "ACTIVO" ? "verde" : e === "AGOTADO" ? "slate" : e === "VENCIDO" ? "ambar" : "rojo";
}
const NOMBRE_ESTADO: Record<PaqueteEstetica["estado"], string> = {
  ACTIVO: "Activo", AGOTADO: "Completado", VENCIDO: "Vencido", ANULADO: "Anulado",
};

function TarjetaPaquete({ p, mostrarClienta, onCobrar, onAnular }: {
  p: PaqueteEstetica; mostrarClienta?: boolean; onCobrar: (p: PaqueteEstetica) => void; onAnular: (p: PaqueteEstetica) => void;
}) {
  const restantes = p.sesiones_total - p.sesiones_usadas;
  const pct = Math.round((p.sesiones_usadas / p.sesiones_total) * 100);
  const venceProntoDias = p.fecha_vencimiento && p.estado === "ACTIVO"
    ? Math.ceil((new Date(p.fecha_vencimiento + "T00:00:00").getTime() - Date.now()) / 86400000)
    : null;
  const wa = mostrarClienta
    ? enlaceWhatsApp(p.paciente_telefono, `Hola ${p.paciente_nombre.split(" ")[0]}, te quedan ${restantes} sesiones de tu paquete "${p.nombre}". ¿Agendamos la próxima?`)
    : null;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-4 bg-white dark:bg-white/[0.03] space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {mostrarClienta && <div className="text-xs font-semibold text-[#9E4A63] dark:text-[#E3A6B4] truncate">{p.paciente_nombre}</div>}
          <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">{p.nombre}</div>
          <div className="text-xs text-slate-500 dark:text-white/50">
            {formatearMonto(p.precio, p.moneda)} · comprado el {formatearFecha(p.fecha_compra)}
          </div>
        </div>
        <Insignia color={colorEstado(p.estado)}>{NOMBRE_ESTADO[p.estado]}</Insignia>
      </div>

      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-600 dark:text-white/70 font-medium">{p.sesiones_usadas} de {p.sesiones_total} sesiones</span>
          <span className="text-slate-400">{restantes > 0 ? `quedan ${restantes}` : "completo"}</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-[#E3A6B4] to-[#9E4A63]" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {(p.fecha_vencimiento || !p.cobro_id) && (
        <div className="flex flex-wrap gap-1.5">
          {p.fecha_vencimiento && (
            <Insignia color={venceProntoDias !== null && venceProntoDias <= 15 ? "ambar" : "slate"}>
              Vence {formatearFecha(p.fecha_vencimiento)}
            </Insignia>
          )}
          {!p.cobro_id && Number(p.precio) > 0 && p.estado !== "ANULADO" && <Insignia color="rojo">Sin cobrar</Insignia>}
        </div>
      )}

      {p.estado !== "ANULADO" && (
        <div className="flex flex-wrap gap-2">
          {!p.cobro_id && Number(p.precio) > 0 && (
            <Boton className="!py-1.5 text-xs" onClick={() => onCobrar(p)}>Cobrar</Boton>
          )}
          {wa && restantes > 0 && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-500/10">
              <IconWhatsApp size={14} /> Recordar
            </a>
          )}
          {p.sesiones_usadas === 0 && (
            <Boton tipo="fantasma" className="!py-1.5 text-xs" onClick={() => onAnular(p)}>Anular</Boton>
          )}
        </div>
      )}
    </div>
  );
}

function useAccionesPaquete(recargar: () => void, setError: (e: string | null) => void) {
  const [cobrando, setCobrando] = useState<PaqueteEstetica | null>(null);
  const anular = async (p: PaqueteEstetica) => {
    if (!window.confirm(`¿Anular el paquete "${p.nombre}"? No se podrá usar para descontar sesiones.`)) return;
    try {
      await anularPaqueteEstetica(p.id);
      recargar();
    } catch (e) {
      setError(mensajeError(e, "No se pudo anular el paquete."));
    }
  };
  return { cobrando, setCobrando, anular };
}

/** Pestaña de paquetes dentro de la ficha de una clienta. */
export function PaquetesClienta({ clienta, servicios }: { clienta: Paciente; servicios: ProcedimientoMedico[] }) {
  const [paquetes, setPaquetes] = useState<PaqueteEstetica[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vendiendo, setVendiendo] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setPaquetes(await listarPaquetesEstetica(clienta.id));
      setError(null);
    } catch (e) {
      setError(mensajeError(e, "No se pudieron cargar los paquetes."));
    } finally {
      setCargando(false);
    }
  }, [clienta.id]);

  useEffect(() => { setCargando(true); cargar(); }, [cargar]);
  const acciones = useAccionesPaquete(cargar, setError);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-white/50">Sesiones prepagadas de la clienta</p>
        <Boton onClick={() => setVendiendo(true)}>Vender paquete</Boton>
      </div>
      {error && <Aviso onCerrar={() => setError(null)}>{error}</Aviso>}
      {cargando ? (
        <Cargando />
      ) : paquetes.length === 0 ? (
        <Vacio titulo="Sin paquetes" texto="Vende un bono de varias sesiones y el sistema lleva la cuenta de cuántas le quedan." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {paquetes.map((p) => (
            <TarjetaPaquete key={p.id} p={p} onCobrar={acciones.setCobrando} onAnular={acciones.anular} />
          ))}
        </div>
      )}
      {vendiendo && (
        <VenderPaquete
          clientas={[clienta]}
          clientaFija={clienta}
          servicios={servicios}
          onCerrar={() => setVendiendo(false)}
          onListo={() => { setVendiendo(false); cargar(); }}
        />
      )}
      {acciones.cobrando && (
        <CobrarPaquete paquete={acciones.cobrando} onCerrar={() => acciones.setCobrando(null)} onListo={() => { acciones.setCobrando(null); cargar(); }} />
      )}
    </div>
  );
}

/** Página del menú: todos los paquetes activos del negocio. */
export default function PaginaPaquetes({ clientas, servicios, onCambio }: { clientas: Paciente[]; servicios: ProcedimientoMedico[]; onCambio?: () => void }) {
  const [paquetes, setPaquetes] = useState<PaqueteEstetica[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vendiendo, setVendiendo] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const cargar = useCallback(async () => {
    try {
      setPaquetes(await listarPaquetesEstetica());
      setError(null);
    } catch (e) {
      setError(mensajeError(e, "No se pudieron cargar los paquetes."));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);
  const recargar = () => { cargar(); onCambio?.(); };
  const acciones = useAccionesPaquete(recargar, setError);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return q ? paquetes.filter((p) => p.paciente_nombre.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q)) : paquetes;
  }, [paquetes, busqueda]);

  const pendientes = paquetes.reduce((s, p) => s + (p.sesiones_total - p.sesiones_usadas), 0);
  const sinCobrar = paquetes.filter((p) => !p.cobro_id && Number(p.precio) > 0).length;

  return (
    <div>
      <EncabezadoPagina
        titulo="Paquetes de sesiones"
        subtitulo={paquetes.length ? `${paquetes.length} activos · ${pendientes} sesiones por realizar${sinCobrar ? ` · ${sinCobrar} sin cobrar` : ""}` : "Bonos prepagados y su saldo"}
        acciones={<Boton onClick={() => setVendiendo(true)} disabled={clientas.length === 0}>Vender paquete</Boton>}
      />
      {error && <div className="mb-4"><Aviso onCerrar={() => setError(null)}>{error}</Aviso></div>}
      <Tarjeta className="p-4 sm:p-5">
        {paquetes.length > 0 && (
          <input className={`${claseInput} mb-4 sm:max-w-xs`} placeholder="Buscar por clienta o paquete" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        )}
        {cargando ? (
          <Cargando />
        ) : paquetes.length === 0 ? (
          <Vacio
            titulo="No hay paquetes activos"
            texto={clientas.length === 0 ? "Primero registra una clienta en Clientas." : "Vende un bono de sesiones (por ejemplo, 10 de radiofrecuencia) y aquí verás cuántas le quedan a cada clienta."}
          />
        ) : filtrados.length === 0 ? (
          <Vacio titulo="Sin resultados" />
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtrados.map((p) => (
              <TarjetaPaquete key={p.id} p={p} mostrarClienta onCobrar={acciones.setCobrando} onAnular={acciones.anular} />
            ))}
          </div>
        )}
      </Tarjeta>
      {vendiendo && (
        <VenderPaquete clientas={clientas} servicios={servicios} onCerrar={() => setVendiendo(false)} onListo={() => { setVendiendo(false); recargar(); }} />
      )}
      {acciones.cobrando && (
        <CobrarPaquete paquete={acciones.cobrando} onCerrar={() => acciones.setCobrando(null)} onListo={() => { acciones.setCobrando(null); recargar(); }} />
      )}
    </div>
  );
}

function VenderPaquete({ clientas, clientaFija, servicios, onCerrar, onListo }: {
  clientas: Paciente[]; clientaFija?: Paciente; servicios: ProcedimientoMedico[]; onCerrar: () => void; onListo: () => void;
}) {
  const { tasa } = useTasaBs();
  const [clientaId, setClientaId] = useState(clientaFija ? String(clientaFija.id) : "");
  const [nombre, setNombre] = useState("");
  const [sesiones, setSesiones] = useState("10");
  const [precio, setPrecio] = useState("");
  const [vence, setVence] = useState("");
  const [notas, setNotas] = useState("");
  const [cobrarAhora, setCobrarAhora] = useState(true);
  const [pago, setPago] = useState<DatosPago>(PAGO_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clave = useRef(claveIdempotencia());

  const desdeServicio = (id: string) => {
    const s = servicios.find((x) => String(x.id) === id);
    if (!s) return;
    const n = Number(sesiones) || 1;
    setNombre(`${n} sesiones de ${s.nombre}`);
    if (s.costo) setPrecio(String(Number(s.costo) * n));
  };

  const montoNum = Number(precio) || 0;

  const guardar = async () => {
    const n = Number(sesiones);
    if (!clientaId) { setError("Elige la clienta."); return; }
    if (!nombre.trim()) { setError("Ponle nombre al paquete."); return; }
    if (!Number.isInteger(n) || n < 1) { setError("Indica cuántas sesiones incluye."); return; }
    if (montoNum < 0) { setError("El precio no puede ser negativo."); return; }
    setGuardando(true);
    setError(null);
    let paqueteId: number | null = null;
    try {
      const creado = await crearPaqueteEstetica({
        pacienteId: Number(clientaId), nombre: nombre.trim(), sesionesTotal: n, precio: montoNum, moneda: "USD",
        fechaVencimiento: vence || undefined, notas: notas.trim() || undefined,
      });
      paqueteId = creado.id;
      if (cobrarAhora && montoNum > 0) {
        const cobro = await cobrar({
          pacienteId: Number(clientaId), concepto: `Paquete: ${nombre.trim()}`, monto: montoNum, moneda: "USD", pago, tasa, clave: clave.current,
        });
        await vincularCobroPaqueteEstetica(creado.id, cobro.id);
      }
      onListo();
    } catch (e) {
      const msg = mensajeError(e, "No se pudo registrar el paquete.");
      // El paquete ya existe: no se pierde, queda marcado "Sin cobrar" para cobrarlo después.
      setError(paqueteId ? `El paquete quedó registrado, pero el cobro falló: ${msg} Puedes cobrarlo desde la lista de paquetes.` : msg);
      // Con el paquete ya creado el botón sigue bloqueado: reintentar crearía un segundo paquete.
      if (paqueteId) setTimeout(onListo, 3500); else setGuardando(false);
    }
  };

  return (
    <Modal titulo="Vender paquete de sesiones" onCerrar={onCerrar} ancho="max-w-xl">
      <div className="space-y-4">
        {!clientaFija && (
          <Campo label="Clienta">
            <select className={claseInput} value={clientaId} onChange={(e) => setClientaId(e.target.value)}>
              <option value="">Elegir clienta…</option>
              {clientas.map((c) => <option key={c.id} value={c.id}>{c.nombreCompleto}</option>)}
            </select>
          </Campo>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Número de sesiones">
            <input type="number" min={1} max={200} className={claseInput} value={sesiones} onChange={(e) => setSesiones(e.target.value)} />
          </Campo>
          {servicios.length > 0 ? (
            <Campo label="Basado en el servicio" ayuda="Rellena nombre y precio.">
              <select className={claseInput} defaultValue="" onChange={(e) => desdeServicio(e.target.value)}>
                <option value="">Elegir…</option>
                {servicios.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </Campo>
          ) : <div />}
        </div>
        <Campo label="Nombre del paquete">
          <input className={claseInput} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="10 sesiones de radiofrecuencia facial" />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Precio total (USD)">
            <input type="number" min={0} step="0.01" className={claseInput} value={precio} onChange={(e) => setPrecio(e.target.value)} />
          </Campo>
          <Campo label="Vence (opcional)">
            <input type="date" className={claseInput} value={vence} min={hoyISO()} onChange={(e) => setVence(e.target.value)} />
          </Campo>
        </div>
        <div className="flex flex-wrap gap-1.5 -mt-2">
          {[3, 6, 12].map((m) => (
            <button key={m} onClick={() => setVence(sumarDias(hoyISO(), m * 30))} className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/70 hover:bg-slate-200 cursor-pointer">
              {m} meses
            </button>
          ))}
        </div>
        <Campo label="Notas">
          <input className={claseInput} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Promoción, forma de pago acordada…" />
        </Campo>

        {montoNum > 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-4 space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={cobrarAhora} onChange={(e) => setCobrarAhora(e.target.checked)} className="w-4 h-4 accent-[#9E4A63]" />
              <span className="text-sm font-semibold text-slate-800 dark:text-white">Cobrar ahora</span>
            </label>
            {cobrarAhora ? (
              <FormularioPago monto={montoNum} moneda="USD" valor={pago} onChange={setPago} tasa={tasa} />
            ) : (
              <p className="text-xs text-slate-500">Quedará marcado como "Sin cobrar" hasta que registres el pago.</p>
            )}
          </div>
        )}

        {error && <Aviso onCerrar={() => setError(null)}>{error}</Aviso>}
        <div className="flex justify-end gap-2">
          <Boton tipo="secundario" onClick={onCerrar}>Cancelar</Boton>
          <Boton onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando…" : cobrarAhora && montoNum > 0 ? `Vender y cobrar ${formatearMonto(montoNum)}` : "Registrar paquete"}
          </Boton>
        </div>
      </div>
    </Modal>
  );
}

function CobrarPaquete({ paquete, onCerrar, onListo }: { paquete: PaqueteEstetica; onCerrar: () => void; onListo: () => void }) {
  const { tasa } = useTasaBs();
  const [pago, setPago] = useState<DatosPago>(PAGO_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clave = useRef(claveIdempotencia());
  const monto = Number(paquete.precio);

  const confirmar = async () => {
    setGuardando(true);
    setError(null);
    try {
      const cobro = await cobrar({
        pacienteId: paquete.paciente_id, concepto: `Paquete: ${paquete.nombre}`, monto, moneda: paquete.moneda, pago, tasa, clave: clave.current,
      });
      await vincularCobroPaqueteEstetica(paquete.id, cobro.id);
      onListo();
    } catch (e) {
      setError(mensajeError(e, "No se pudo registrar el cobro."));
      setGuardando(false);
    }
  };

  return (
    <Modal titulo={`Cobrar: ${paquete.nombre}`} onCerrar={onCerrar}>
      <div className="space-y-4">
        <FormularioPago monto={monto} moneda={paquete.moneda} valor={pago} onChange={setPago} tasa={tasa} />
        {error && <Aviso onCerrar={() => setError(null)}>{error}</Aviso>}
        <div className="flex justify-end gap-2">
          <Boton tipo="secundario" onClick={onCerrar}>Cancelar</Boton>
          <Boton onClick={confirmar} disabled={guardando}>{guardando ? "Cobrando…" : `Cobrar ${formatearMonto(monto, paquete.moneda)}`}</Boton>
        </div>
      </div>
    </Modal>
  );
}
