import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  listarConsentimientosEstetica, obtenerConsentimientoEstetica, firmarConsentimientoEstetica,
  type ConsentimientoEstetica, type Paciente,
} from "../../api";
import { IconPrinter } from "../../Icons";
import { Aviso, Boton, Campo, Cargando, Modal, Vacio, claseInput, formatearFecha, formatearHora, mensajeError } from "./comun";

const COMUN = (proc: string, riesgos: string, cuidados: string) =>
  `Yo, {clienta}, identificada con el documento {documento}, declaro que el personal de {negocio} me explicó en qué consiste el procedimiento de ${proc}, sus beneficios esperados y sus posibles efectos.

Entiendo que pueden presentarse: ${riesgos}

Me comprometo a: ${cuidados}

Declaro que informé con verdad mis antecedentes de salud, medicamentos, alergias y si estoy embarazada o en lactancia. Entiendo que los resultados varían en cada persona y que no se me garantiza un resultado específico.

Autorizo la realización del procedimiento y la toma de fotografías de la zona tratada para mi historial, que no se publicarán sin mi permiso por escrito.`;

export const PLANTILLAS: { id: string; nombre: string; texto: string }[] = [
  {
    id: "peeling", nombre: "Peeling químico",
    texto: COMUN("peeling químico",
      "enrojecimiento, ardor, descamación, sensibilidad, costras y, con menor frecuencia, cambios de pigmentación temporales o permanentes, sobre todo si hay exposición al sol.",
      "usar protector solar todos los días, no exponerme al sol ni arrancar la piel que se descama, y suspender productos irritantes (retinoides, ácidos) según me indiquen."),
  },
  {
    id: "microneedling", nombre: "Microneedling / Dermapen",
    texto: COMUN("microneedling (micropunción con agujas finas)",
      "enrojecimiento, pequeños puntos de sangrado, inflamación leve, sensibilidad, brotes de acné o herpes y, rara vez, infección o manchas.",
      "no maquillarme durante 24 horas, no exponerme al sol, no ir a piscinas ni hacer ejercicio intenso ese día, y seguir la rutina indicada."),
  },
  {
    id: "radiofrecuencia", nombre: "Radiofrecuencia",
    texto: COMUN("radiofrecuencia (calor controlado en la piel)",
      "calor, enrojecimiento pasajero, inflamación leve y, rara vez, quemaduras superficiales.",
      "avisar si tengo marcapasos, implantes metálicos, prótesis o estoy embarazada, e hidratar la zona como se me indique."),
  },
  {
    id: "laser", nombre: "Depilación láser / IPL",
    texto: COMUN("depilación con láser o luz pulsada",
      "enrojecimiento, ardor, inflamación alrededor del folículo, costras y, con menor frecuencia, quemaduras o cambios de pigmentación.",
      "no exponerme al sol ni usar autobronceante antes y después, no depilarme con cera ni pinzas entre sesiones y avisar si tomo medicamentos que aumentan la sensibilidad a la luz."),
  },
  {
    id: "limpieza", nombre: "Limpieza facial profunda",
    texto: COMUN("limpieza facial profunda con extracción",
      "enrojecimiento, sensibilidad y pequeñas marcas por la extracción que desaparecen en pocos días.",
      "no maquillarme durante 12 horas y usar protector solar."),
  },
  {
    id: "general", nombre: "Tratamiento estético (general)",
    texto: COMUN("{procedimiento}",
      "enrojecimiento, sensibilidad, inflamación leve y otras reacciones que se me explicaron.",
      "seguir las indicaciones de cuidado que se me dieron."),
  },
];

function rellenar(texto: string, clienta: Paciente, negocio: string, procedimiento: string): string {
  return texto
    .replace(/\{clienta\}/g, clienta.nombreCompleto)
    .replace(/\{documento\}/g, clienta.identificacion || "________")
    .replace(/\{negocio\}/g, negocio || "este centro")
    .replace(/\{procedimiento\}/g, procedimiento || "{procedimiento}");
}

export default function Consentimientos({ clienta, negocio }: { clienta: Paciente; negocio: string }) {
  const [lista, setLista] = useState<ConsentimientoEstetica[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const [viendo, setViendo] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    try {
      setLista(await listarConsentimientosEstetica(clienta.id));
      setError(null);
    } catch (e) {
      setError(mensajeError(e, "No se pudieron cargar los consentimientos."));
    } finally {
      setCargando(false);
    }
  }, [clienta.id]);

  useEffect(() => { setCargando(true); cargar(); }, [cargar]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-white/50">Firmados por la clienta antes del tratamiento</p>
        <Boton onClick={() => setNuevo(true)}>Nuevo consentimiento</Boton>
      </div>
      {error && <Aviso onCerrar={() => setError(null)}>{error}</Aviso>}
      {cargando ? (
        <Cargando />
      ) : lista.length === 0 ? (
        <Vacio titulo="Sin consentimientos firmados" texto="Antes de un peeling, microneedling o láser, la clienta lo lee y firma aquí mismo con el dedo." />
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-white/10 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
          {lista.map((c) => (
            <li key={c.id}>
              <button onClick={() => setViendo(c.id)} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{c.procedimiento}</div>
                  <div className="text-xs text-slate-500 dark:text-white/50">Firmado por {c.nombre_firmante} · {formatearFecha(c.fecha_firma)} {formatearHora(c.fecha_firma)}</div>
                </div>
                <span className="text-xs font-semibold text-[#9E4A63] dark:text-[#E3A6B4]">Ver</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {nuevo && <NuevoConsentimiento clienta={clienta} negocio={negocio} onCerrar={() => setNuevo(false)} onFirmado={() => { setNuevo(false); cargar(); }} />}
      {viendo !== null && <VerConsentimiento id={viendo} negocio={negocio} onCerrar={() => setViendo(null)} />}
    </div>
  );
}

function NuevoConsentimiento({ clienta, negocio, onCerrar, onFirmado }: { clienta: Paciente; negocio: string; onCerrar: () => void; onFirmado: () => void }) {
  const [plantilla, setPlantilla] = useState(PLANTILLAS[0].id);
  const [procedimiento, setProcedimiento] = useState(PLANTILLAS[0].nombre);
  const [texto, setTexto] = useState(() => rellenar(PLANTILLAS[0].texto, clienta, negocio, PLANTILLAS[0].nombre));
  const [firmante, setFirmante] = useState(clienta.nombreCompleto);
  const [documento, setDocumento] = useState(clienta.identificacion || "");
  const [firma, setFirma] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const elegir = (id: string) => {
    const p = PLANTILLAS.find((x) => x.id === id)!;
    const proc = p.id === "general" ? "" : p.nombre;
    setPlantilla(id);
    setProcedimiento(proc);
    setTexto(rellenar(p.texto, clienta, negocio, proc));
  };

  const firmar = async () => {
    if (!procedimiento.trim()) { setError("Indica el procedimiento."); return; }
    if (!firmante.trim()) { setError("Falta el nombre de quien firma."); return; }
    if (!firma) { setError("Falta la firma de la clienta."); return; }
    setGuardando(true);
    setError(null);
    try {
      await firmarConsentimientoEstetica({
        pacienteId: clienta.id, procedimiento: procedimiento.trim(),
        texto: texto.replace(/\{procedimiento\}/g, procedimiento.trim()),
        nombreFirmante: firmante.trim(), identificacionFirmante: documento.trim() || undefined, firma,
      });
      onFirmado();
    } catch (e) {
      setError(mensajeError(e, "No se pudo guardar el consentimiento."));
      setGuardando(false);
    }
  };

  return (
    <Modal titulo="Consentimiento informado" onCerrar={onCerrar} ancho="max-w-2xl">
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <Campo label="Plantilla">
            <select className={claseInput} value={plantilla} onChange={(e) => elegir(e.target.value)}>
              {PLANTILLAS.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </Campo>
          <Campo label="Procedimiento">
            <input className={claseInput} value={procedimiento} onChange={(e) => setProcedimiento(e.target.value)} />
          </Campo>
        </div>
        <Campo label="Texto que lee la clienta" ayuda="Puedes ajustarlo antes de firmar. Se guarda exactamente como quedó.">
          <textarea className={`${claseInput} leading-relaxed`} rows={10} value={texto} onChange={(e) => setTexto(e.target.value)} />
        </Campo>
        <div className="grid sm:grid-cols-2 gap-3">
          <Campo label="Nombre de quien firma">
            <input className={claseInput} value={firmante} onChange={(e) => setFirmante(e.target.value)} />
          </Campo>
          <Campo label="Documento">
            <input className={claseInput} value={documento} onChange={(e) => setDocumento(e.target.value)} />
          </Campo>
        </div>
        <PadFirma onCambio={setFirma} />
        {error && <Aviso onCerrar={() => setError(null)}>{error}</Aviso>}
        <div className="flex justify-end gap-2">
          <Boton tipo="secundario" onClick={onCerrar}>Cancelar</Boton>
          <Boton onClick={firmar} disabled={guardando || !firma}>{guardando ? "Guardando…" : "Guardar firmado"}</Boton>
        </div>
      </div>
    </Modal>
  );
}

function PadFirma({ onCambio }: { onCambio: (dataUrl: string | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dibujando = useRef(false);
  const hayTrazo = useRef(false);
  const [vacio, setVacio] = useState(true);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const escala = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * escala;
    c.height = c.offsetHeight * escala;
    const ctx = c.getContext("2d")!;
    ctx.scale(escala, escala);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1e1b2e";
  }, []);

  const punto = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const empezar = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dibujando.current = true;
    const ctx = e.currentTarget.getContext("2d")!;
    const p = punto(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };
  const mover = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dibujando.current) return;
    const ctx = e.currentTarget.getContext("2d")!;
    const p = punto(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    if (!hayTrazo.current) { hayTrazo.current = true; setVacio(false); }
  };
  const terminar = () => {
    if (!dibujando.current) return;
    dibujando.current = false;
    if (hayTrazo.current && ref.current) onCambio(ref.current.toDataURL("image/png"));
  };
  const limpiar = () => {
    const c = ref.current;
    if (!c) return;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    hayTrazo.current = false;
    setVacio(true);
    onCambio(null);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600 dark:text-white/60">Firma de la clienta</span>
        {!vacio && <button onClick={limpiar} className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer">Borrar</button>}
      </div>
      <div className="relative rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/20 bg-white overflow-hidden">
        <canvas
          ref={ref}
          className="w-full h-40 touch-none cursor-crosshair block"
          onPointerDown={empezar}
          onPointerMove={mover}
          onPointerUp={terminar}
          onPointerLeave={terminar}
        />
        {vacio && <span className="absolute inset-0 flex items-center justify-center text-sm text-slate-300 pointer-events-none">Firme aquí con el dedo</span>}
        <div className="absolute left-6 right-6 bottom-8 border-b border-slate-200 pointer-events-none" />
      </div>
    </div>
  );
}

function VerConsentimiento({ id, negocio, onCerrar }: { id: number; negocio: string; onCerrar: () => void }) {
  const [c, setC] = useState<ConsentimientoEstetica | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtenerConsentimientoEstetica(id).then(setC).catch((e) => setError(mensajeError(e, "No se pudo abrir el consentimiento.")));
  }, [id]);

  const imprimir = () => {
    if (!c) return;
    const v = window.open("", "_blank", "width=800,height=900");
    if (!v) return;
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    v.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Consentimiento - ${esc(c.procedimiento)}</title>
      <style>body{font-family:Georgia,serif;max-width:680px;margin:40px auto;color:#1e1b2e;line-height:1.6;padding:0 24px}
      h1{font-size:20px;margin:0}h2{font-size:13px;font-weight:normal;color:#666;margin:4px 0 28px}
      p{white-space:pre-line;font-size:14px}.firma{margin-top:40px}.firma img{height:90px}
      .linea{border-top:1px solid #999;width:280px;padding-top:6px;font-size:13px}</style></head><body>
      <h1>${esc(negocio || "Consentimiento informado")}</h1>
      <h2>Consentimiento informado · ${esc(c.procedimiento)} · ${esc(formatearFecha(c.fecha_firma))} ${esc(formatearHora(c.fecha_firma))}</h2>
      <p>${esc(c.texto ?? "")}</p>
      <div class="firma"><img src="${c.firma}" alt="Firma"/><div class="linea">${esc(c.nombre_firmante)}${c.identificacion_firmante ? " · " + esc(c.identificacion_firmante) : ""}</div></div>
      ${c.profesional ? `<p style="font-size:12px;color:#666;margin-top:24px">Profesional: ${esc(c.profesional)}</p>` : ""}
      <script>window.onload=function(){window.print()}</script></body></html>`);
    v.document.close();
  };

  return (
    <Modal titulo="Consentimiento firmado" onCerrar={onCerrar} ancho="max-w-2xl">
      {error ? (
        <Aviso>{error}</Aviso>
      ) : !c ? (
        <Cargando />
      ) : (
        <div className="space-y-4">
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">{c.procedimiento}</div>
            <div className="text-xs text-slate-500">{formatearFecha(c.fecha_firma)} {formatearHora(c.fecha_firma)}{c.profesional ? ` · ${c.profesional}` : ""}</div>
          </div>
          <p className="text-sm text-slate-700 dark:text-white/80 whitespace-pre-line leading-relaxed">{c.texto}</p>
          <div className="rounded-2xl bg-white border border-slate-200 p-3 inline-block">
            {c.firma && <img src={c.firma} alt="Firma" className="h-24" />}
            <div className="text-xs text-slate-600 border-t border-slate-200 pt-1 mt-1">
              {c.nombre_firmante}{c.identificacion_firmante ? ` · ${c.identificacion_firmante}` : ""}
            </div>
          </div>
          <div className="flex justify-end">
            <Boton tipo="secundario" onClick={imprimir}><IconPrinter size={15} /> Imprimir</Boton>
          </div>
        </div>
      )}
    </Modal>
  );
}
