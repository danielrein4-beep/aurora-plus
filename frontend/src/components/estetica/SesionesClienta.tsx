import React, { useCallback, useEffect, useState } from "react";
import {
  listarSesionesEstetica, registrarSesionEstetica, eliminarSesionEstetica, fotosSesionEstetica,
  listarPaquetesEstetica, obtenerFichaEstetica,
  type SesionEstetica, type PaqueteEstetica, type ProcedimientoMedico,
} from "../../api";
import { IconCamera, IconTrash } from "../../Icons";
import {
  Aviso, Boton, Campo, Cargando, Insignia, Modal, Vacio, claseInput, comprimirImagen, formatearFecha, hoyISO, mensajeError,
} from "./comun";
import { alertasDeFicha } from "./FichaPiel";

export default function SesionesClienta({ pacienteId, servicios }: { pacienteId: number; servicios: ProcedimientoMedico[] }) {
  const [sesiones, setSesiones] = useState<SesionEstetica[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nueva, setNueva] = useState(false);
  const [viendo, setViendo] = useState<SesionEstetica | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setSesiones(await listarSesionesEstetica(pacienteId));
    } catch (e) {
      setError(mensajeError(e, "No se pudieron cargar las sesiones."));
    } finally {
      setCargando(false);
    }
  }, [pacienteId]);

  useEffect(() => { setCargando(true); cargar(); }, [cargar]);

  const eliminar = async (s: SesionEstetica) => {
    const extra = s.paquete_id ? " La sesión se le devuelve al paquete." : "";
    if (!window.confirm(`¿Eliminar la sesión de ${s.servicio} del ${formatearFecha(s.fecha_sesion)}?${extra}`)) return;
    try {
      await eliminarSesionEstetica(s.id);
      await cargar();
    } catch (e) {
      setError(mensajeError(e, "No se pudo eliminar la sesión."));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-white/50">
          {sesiones.length === 0 ? "Sin sesiones registradas" : `${sesiones.length} ${sesiones.length === 1 ? "sesión" : "sesiones"}`}
        </p>
        <Boton onClick={() => setNueva(true)}>Registrar sesión</Boton>
      </div>

      {error && <Aviso onCerrar={() => setError(null)}>{error}</Aviso>}

      {cargando ? (
        <Cargando texto="Cargando sesiones…" />
      ) : sesiones.length === 0 ? (
        <Vacio titulo="Todavía no hay sesiones" texto="Cada tratamiento que le hagas queda aquí, con sus fotos de antes y después." />
      ) : (
        <ol className="relative border-l-2 border-[#E3A6B4]/40 ml-2 space-y-4">
          {sesiones.map((s) => (
            <li key={s.id} className="ml-5">
              <span className="absolute -left-[7px] mt-1.5 w-3 h-3 rounded-full bg-[#9E4A63] ring-4 ring-white dark:ring-[#1a1220]" />
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-4 bg-white dark:bg-white/[0.03]">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-sm text-slate-900 dark:text-white">{s.servicio}</div>
                    <div className="text-xs text-slate-500 dark:text-white/50 mt-0.5">
                      {formatearFecha(s.fecha_sesion)}{s.zona ? ` · ${s.zona}` : ""}{s.profesional ? ` · ${s.profesional}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {s.paquete_nombre && <Insignia color="rosa">{s.paquete_nombre}</Insignia>}
                    {(s.tiene_foto_antes || s.tiene_foto_despues) && (
                      <Boton tipo="secundario" className="!px-2.5 !py-1 text-xs" onClick={() => setViendo(s)}>
                        <IconCamera size={14} /> Fotos
                      </Boton>
                    )}
                    <button onClick={() => eliminar(s)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer" title="Eliminar sesión">
                      <IconTrash size={15} />
                    </button>
                  </div>
                </div>
                <dl className="mt-3 grid sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  {s.parametros && <Dato t="Parámetros" v={s.parametros} />}
                  {s.productos && <Dato t="Productos" v={s.productos} />}
                  {s.reaccion && <Dato t="Reacción de la piel" v={s.reaccion} />}
                  {s.indicaciones && <Dato t="Cuidados en casa" v={s.indicaciones} />}
                </dl>
                {s.proxima_sesion && (
                  <div className="mt-3 text-xs font-medium text-[#9E4A63] dark:text-[#E3A6B4]">Próxima sesión: {formatearFecha(s.proxima_sesion)}</div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      {nueva && (
        <NuevaSesion
          pacienteId={pacienteId}
          servicios={servicios}
          onCerrar={() => setNueva(false)}
          onGuardada={() => { setNueva(false); cargar(); }}
        />
      )}
      {viendo && <VisorFotos sesion={viendo} onCerrar={() => setViendo(null)} />}
    </div>
  );
}

function Dato({ t, v }: { t: string; v: string }) {
  return (
    <div>
      <dt className="text-slate-400 dark:text-white/40">{t}</dt>
      <dd className="text-slate-700 dark:text-white/80 whitespace-pre-line">{v}</dd>
    </div>
  );
}

function NuevaSesion({ pacienteId, servicios, onCerrar, onGuardada }: {
  pacienteId: number; servicios: ProcedimientoMedico[]; onCerrar: () => void; onGuardada: () => void;
}) {
  const [paquetes, setPaquetes] = useState<PaqueteEstetica[]>([]);
  const [alertas, setAlertas] = useState<string[]>([]);
  const [f, setF] = useState({
    servicio: "", paqueteId: "", fechaSesion: hoyISO(), zona: "", parametros: "", productos: "",
    reaccion: "", indicaciones: "", proximaSesion: "",
  });
  const [fotoAntes, setFotoAntes] = useState<string | null>(null);
  const [fotoDespues, setFotoDespues] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listarPaquetesEstetica(pacienteId)
      .then((ps) => setPaquetes(ps.filter((p) => p.estado === "ACTIVO")))
      .catch((e) => setError(mensajeError(e, "No se pudieron cargar los paquetes de la clienta.")));
    obtenerFichaEstetica(pacienteId).then((fi) => setAlertas(alertasDeFicha(fi))).catch(() => setAlertas([]));
  }, [pacienteId]);

  const set = (k: keyof typeof f, v: string) => setF((prev) => ({ ...prev, [k]: v }));

  const elegirPaquete = (id: string) => {
    const p = paquetes.find((x) => String(x.id) === id);
    setF((prev) => ({ ...prev, paqueteId: id, servicio: p && !prev.servicio ? p.nombre : prev.servicio }));
  };

  const cargarFoto = async (archivo: File | undefined, cual: "antes" | "despues") => {
    if (!archivo) return;
    try {
      const data = await comprimirImagen(archivo);
      if (cual === "antes") setFotoAntes(data); else setFotoDespues(data);
    } catch (e) {
      setError(mensajeError(e));
    }
  };

  const guardar = async () => {
    if (!f.servicio.trim()) { setError("Indica el servicio realizado."); return; }
    setGuardando(true);
    setError(null);
    try {
      await registrarSesionEstetica({
        pacienteId,
        paqueteId: f.paqueteId ? Number(f.paqueteId) : undefined,
        fechaSesion: f.fechaSesion || undefined,
        servicio: f.servicio.trim(),
        zona: f.zona || undefined,
        parametros: f.parametros || undefined,
        productos: f.productos || undefined,
        reaccion: f.reaccion || undefined,
        indicaciones: f.indicaciones || undefined,
        proximaSesion: f.proximaSesion || undefined,
        fotoAntes: fotoAntes ?? undefined,
        fotoDespues: fotoDespues ?? undefined,
      });
      onGuardada();
    } catch (e) {
      setError(mensajeError(e, "No se pudo registrar la sesión."));
      setGuardando(false);
    }
  };

  const paqueteElegido = paquetes.find((p) => String(p.id) === f.paqueteId);

  return (
    <Modal titulo="Registrar sesión" onCerrar={onCerrar} ancho="max-w-2xl">
      <div className="space-y-4">
        {alertas.length > 0 && (
          <Aviso tipo="info">
            <div className="font-semibold mb-1">Revisar antes de tratar</div>
            <ul className="list-disc pl-4 space-y-0.5">{alertas.map((a) => <li key={a}>{a}</li>)}</ul>
          </Aviso>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          {paquetes.length > 0 && (
            <Campo label="Descontar de un paquete" ayuda={paqueteElegido ? `Le quedarán ${paqueteElegido.sesiones_total - paqueteElegido.sesiones_usadas - 1} sesiones.` : "Déjalo vacío si esta sesión se cobra aparte."}>
              <select className={claseInput} value={f.paqueteId} onChange={(e) => elegirPaquete(e.target.value)}>
                <option value="">No, sesión suelta</option>
                {paquetes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.sesiones_total - p.sesiones_usadas} de {p.sesiones_total} disponibles)
                  </option>
                ))}
              </select>
            </Campo>
          )}
          <Campo label="Servicio realizado">
            <input className={claseInput} list="servicios-estetica" value={f.servicio} onChange={(e) => set("servicio", e.target.value)} placeholder="Limpieza facial profunda" />
            <datalist id="servicios-estetica">{servicios.map((s) => <option key={s.id} value={s.nombre} />)}</datalist>
          </Campo>
          <Campo label="Fecha">
            <input type="date" className={claseInput} value={f.fechaSesion} max={hoyISO()} onChange={(e) => set("fechaSesion", e.target.value)} />
          </Campo>
          <Campo label="Zona tratada">
            <input className={claseInput} value={f.zona} onChange={(e) => set("zona", e.target.value)} placeholder="Rostro completo" />
          </Campo>
        </div>

        <Campo label="Parámetros y técnica" ayuda="Equipo, intensidad, concentración del ácido, tiempo de exposición, número de pasadas…">
          <textarea className={claseInput} rows={2} value={f.parametros} onChange={(e) => set("parametros", e.target.value)} />
        </Campo>
        <div className="grid sm:grid-cols-2 gap-3">
          <Campo label="Productos usados">
            <textarea className={claseInput} rows={2} value={f.productos} onChange={(e) => set("productos", e.target.value)} />
          </Campo>
          <Campo label="Reacción de la piel">
            <textarea className={claseInput} rows={2} value={f.reaccion} onChange={(e) => set("reaccion", e.target.value)} placeholder="Eritema leve, sin descamación…" />
          </Campo>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Campo label="Cuidados en casa">
            <textarea className={claseInput} rows={2} value={f.indicaciones} onChange={(e) => set("indicaciones", e.target.value)} placeholder="Protector solar cada 3 horas…" />
          </Campo>
          <Campo label="Próxima sesión">
            <input type="date" className={claseInput} value={f.proximaSesion} min={f.fechaSesion || hoyISO()} onChange={(e) => set("proximaSesion", e.target.value)} />
          </Campo>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SelectorFoto titulo="Antes" foto={fotoAntes} onElegir={(a) => cargarFoto(a, "antes")} onQuitar={() => setFotoAntes(null)} />
          <SelectorFoto titulo="Después" foto={fotoDespues} onElegir={(a) => cargarFoto(a, "despues")} onQuitar={() => setFotoDespues(null)} />
        </div>

        {error && <Aviso onCerrar={() => setError(null)}>{error}</Aviso>}

        <div className="flex justify-end gap-2 pt-1">
          <Boton tipo="secundario" onClick={onCerrar}>Cancelar</Boton>
          <Boton onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar sesión"}</Boton>
        </div>
      </div>
    </Modal>
  );
}

function SelectorFoto({ titulo, foto, onElegir, onQuitar }: { titulo: string; foto: string | null; onElegir: (a: File | undefined) => void; onQuitar: () => void }) {
  return (
    <div className="space-y-1">
      <span className="text-xs font-semibold text-slate-600 dark:text-white/60">Foto de {titulo.toLowerCase()}</span>
      {foto ? (
        <div className="relative aspect-[4/5] rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10">
          <img src={foto} alt={titulo} className="w-full h-full object-cover" />
          <button onClick={onQuitar} className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-black/60 text-white text-[11px] font-semibold cursor-pointer">Quitar</button>
        </div>
      ) : (
        <label className="aspect-[4/5] rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/15 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-[#9E4A63]/50 hover:text-[#9E4A63] cursor-pointer transition">
          <IconCamera size={26} />
          <span className="text-xs font-medium">Tomar o subir</span>
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { onElegir(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      )}
    </div>
  );
}

function VisorFotos({ sesion, onCerrar }: { sesion: SesionEstetica; onCerrar: () => void }) {
  const [fotos, setFotos] = useState<{ antes: string | null; despues: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [corte, setCorte] = useState(50);

  useEffect(() => {
    fotosSesionEstetica(sesion.id).then(setFotos).catch((e) => setError(mensajeError(e, "No se pudieron cargar las fotos.")));
  }, [sesion.id]);

  const ambas = fotos?.antes && fotos?.despues;

  return (
    <Modal titulo={`${sesion.servicio} · ${formatearFecha(sesion.fecha_sesion)}`} onCerrar={onCerrar} ancho="max-w-3xl">
      {error ? (
        <Aviso>{error}</Aviso>
      ) : !fotos ? (
        <Cargando texto="Cargando fotos…" />
      ) : ambas ? (
        <div className="space-y-3">
          <div className="relative w-full aspect-[4/5] sm:aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 select-none">
            <img src={fotos.despues!} alt="Después" className="absolute inset-0 w-full h-full object-contain" />
            <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - corte}% 0 0)` }}>
              <img src={fotos.antes!} alt="Antes" className="absolute inset-0 w-full h-full object-contain bg-slate-100" />
            </div>
            <div className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)]" style={{ left: `${corte}%` }} />
            <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-black/55 text-white text-[11px] font-semibold">Antes</span>
            <span className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-black/55 text-white text-[11px] font-semibold">Después</span>
          </div>
          <input type="range" min={0} max={100} value={corte} onChange={(e) => setCorte(Number(e.target.value))} className="w-full accent-[#9E4A63]" aria-label="Deslizar para comparar" />
          <p className="text-center text-xs text-slate-400">Desliza para comparar</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {fotos.antes && <FotoSola titulo="Antes" src={fotos.antes} />}
          {fotos.despues && <FotoSola titulo="Después" src={fotos.despues} />}
        </div>
      )}
    </Modal>
  );
}

function FotoSola({ titulo, src }: { titulo: string; src: string }) {
  return (
    <figure className="space-y-1">
      <img src={src} alt={titulo} className="w-full rounded-2xl object-contain bg-slate-100 max-h-[70vh]" />
      <figcaption className="text-xs text-slate-500 text-center">{titulo}</figcaption>
    </figure>
  );
}
