import React, { useEffect, useRef, useState } from "react";
import jsPDF from "jspdf";
import { leerSesion, type Paciente } from "../api";

interface ConsentimientosOdontologicosProps {
  paciente: Paciente;
  config: any;
}

interface ConsentimientoResumen {
  id: number;
  tipo: string;
  titulo: string;
  diente_fdi: number | null;
  firmante_nombre: string;
  firmante_identificacion: string | null;
  firmante_relacion: string;
  odontologo: string;
  fecha_firma: string;
}

interface ConsentimientoCompleto extends ConsentimientoResumen {
  texto: string;
  firma_png: string;
}

// Textos base de consentimiento. El odontologo puede ajustarlos antes de firmar;
// lo que se guarda es exactamente el texto que el paciente leyo.
const PLANTILLAS: { tipo: string; titulo: string; texto: string }[] = [
  {
    tipo: "EXODONCIA",
    titulo: "Consentimiento informado para exodoncia",
    texto:
      "Declaro que he sido informado(a) de que el procedimiento consiste en la extraccion de la pieza dental indicada, bajo anestesia local.\n\n" +
      "Se me explicaron los riesgos posibles: dolor e inflamacion postoperatoria, sangrado, hematoma, infeccion, alveolitis (alveolo seco), " +
      "fractura de la raiz o de la tabla osea, lesion de dientes vecinos, limitacion de la apertura bucal y, en piezas inferiores posteriores, " +
      "alteracion temporal o permanente de la sensibilidad del labio, menton o lengua. En piezas superiores posteriores existe riesgo de comunicacion con el seno maxilar.\n\n" +
      "Se me explicaron las alternativas de tratamiento y las consecuencias de no realizarlo. He informado de forma veraz mis enfermedades, " +
      "alergias y medicamentos que tomo, en especial anticoagulantes. Me comprometo a seguir las indicaciones postoperatorias.",
  },
  {
    tipo: "CIRUGIA_TERCER_MOLAR",
    titulo: "Consentimiento informado para cirugia de tercer molar",
    texto:
      "Declaro que he sido informado(a) de que el procedimiento consiste en la extraccion quirurgica del tercer molar (cordal) indicado, " +
      "que puede requerir incision de la encia, remocion de hueso, seccion del diente y sutura.\n\n" +
      "Se me explicaron los riesgos posibles: dolor, inflamacion y hematoma importantes durante varios dias, limitacion de la apertura bucal, " +
      "sangrado, infeccion, alveolitis, fractura de instrumentos o de raices, lesion de dientes vecinos, comunicacion con el seno maxilar y " +
      "alteracion temporal o permanente de la sensibilidad del labio inferior, menton o lengua por cercania al nervio dentario inferior o lingual.\n\n" +
      "Se me explicaron las alternativas y las consecuencias de no realizar el procedimiento. He informado mis enfermedades, alergias y medicamentos.",
  },
  {
    tipo: "ENDODONCIA",
    titulo: "Consentimiento informado para endodoncia",
    texto:
      "Declaro que he sido informado(a) de que el tratamiento de conducto consiste en retirar el tejido pulpar de la pieza indicada, " +
      "limpiar y desinfectar los conductos y sellarlos, en una o varias sesiones.\n\n" +
      "Se me explico que el tratamiento tiene una alta tasa de exito pero no garantiza la conservacion de la pieza. Riesgos posibles: dolor " +
      "o inflamacion entre sesiones, fractura de instrumentos dentro del conducto, perforaciones, conductos calcificados o no localizables, " +
      "fractura del diente y necesidad de retratamiento, cirugia apical o extraccion.\n\n" +
      "Entiendo que la pieza tratada debe restaurarse de forma definitiva (resina, incrustacion o corona) para evitar su fractura.",
  },
  {
    tipo: "IMPLANTE",
    titulo: "Consentimiento informado para implante dental",
    texto:
      "Declaro que he sido informado(a) de que el procedimiento consiste en colocar un implante de titanio en el hueso maxilar o mandibular, " +
      "que requiere un periodo de integracion de varios meses antes de colocar la protesis.\n\n" +
      "Se me explicaron los riesgos posibles: dolor, inflamacion, hematoma, infeccion, falta de integracion o perdida del implante, necesidad de " +
      "injerto oseo, lesion de estructuras vecinas (nervio dentario, seno maxilar, fosas nasales) y alteraciones de la sensibilidad.\n\n" +
      "Entiendo que el tabaquismo, la diabetes no controlada y la mala higiene aumentan el riesgo de fracaso, y que el implante requiere controles periodicos.",
  },
  {
    tipo: "ANESTESIA_LOCAL",
    titulo: "Consentimiento informado para anestesia local",
    texto:
      "Declaro que he sido informado(a) de que se me aplicara anestesia local para realizar el tratamiento odontologico indicado.\n\n" +
      "Se me explicaron los riesgos posibles: dolor en el sitio de puncion, hematoma, mordedura accidental del labio o la lengua mientras dure " +
      "el efecto, palpitaciones o mareo, reacciones alergicas y, de forma poco frecuente, alteraciones prolongadas de la sensibilidad.\n\n" +
      "He informado de forma veraz mis enfermedades (en especial cardiacas e hipertension), alergias, embarazo y medicamentos que tomo.",
  },
  {
    tipo: "ORTODONCIA",
    titulo: "Consentimiento informado para ortodoncia",
    texto:
      "Declaro que he sido informado(a) de que el tratamiento de ortodoncia busca corregir la posicion de los dientes y la mordida mediante " +
      "aparatos fijos o removibles, durante un tiempo estimado que puede variar segun la respuesta de cada paciente.\n\n" +
      "Se me explicaron los riesgos posibles: molestias al ajustar los aparatos, lesiones en encia o mucosa, descalcificacion y caries si la higiene " +
      "es deficiente, reabsorcion radicular, problemas de articulacion temporomandibular y recidiva si no se usan los retenedores indicados.\n\n" +
      "Me comprometo a asistir a los controles, mantener una higiene oral adecuada y usar la retencion al finalizar.",
  },
];

const RELACIONES = [
  { id: "PACIENTE", nombre: "El paciente" },
  { id: "PADRE_MADRE", nombre: "Padre o madre" },
  { id: "REPRESENTANTE_LEGAL", nombre: "Representante legal" },
  { id: "TUTOR", nombre: "Tutor" },
];

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${leerSesion()?.token || ""}` };
}

function descargarPdfConsentimiento(c: ConsentimientoCompleto, paciente: Paciente, config: any) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const margen = 20;
  let y = 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(config?.clinicaNombre || "Clinica Odontologica", margen, y);
  y += 10;
  doc.setFontSize(14);
  doc.text(c.titulo, ancho / 2, y, { align: "center" });
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const encabezado = [
    `Paciente: ${paciente.nombreCompleto}    C.I.: ${paciente.identificacion || "No registrada"}`,
    `Fecha: ${new Date(c.fecha_firma).toLocaleString("es-VE")}${c.diente_fdi ? `    Pieza: ${c.diente_fdi}` : ""}`,
    `Odontologo tratante: ${c.odontologo}`,
  ];
  for (const linea of encabezado) {
    doc.text(linea, margen, y);
    y += 6;
  }
  y += 4;

  const lineas = doc.splitTextToSize(c.texto, ancho - margen * 2);
  for (const linea of lineas) {
    if (y > alto - 70) {
      doc.addPage();
      y = 20;
    }
    doc.text(linea, margen, y);
    y += 5;
  }

  y += 8;
  if (y > alto - 60) {
    doc.addPage();
    y = 20;
  }
  doc.text("Habiendo leido y comprendido lo anterior, y aclaradas mis dudas, autorizo el procedimiento.", margen, y);
  y += 6;
  doc.addImage(c.firma_png, "PNG", margen, y, 70, 28);
  y += 30;
  doc.line(margen, y, margen + 70, y);
  y += 5;
  doc.text(c.firmante_nombre, margen, y);
  y += 5;
  const relacion = RELACIONES.find((r) => r.id === c.firmante_relacion)?.nombre || c.firmante_relacion;
  doc.text(`${relacion}${c.firmante_identificacion ? ` - C.I. ${c.firmante_identificacion}` : ""}`, margen, y);

  const nombreArchivo = `consentimiento-${c.tipo.toLowerCase()}-${paciente.identificacion || paciente.id}.pdf`;
  doc.save(nombreArchivo);
}

// Lienzo de firma: dibujo con mouse, dedo o lapiz (pointer events).
function PanelFirma({ onCambio }: { onCambio: (png: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dibujando = useRef(false);
  const hayTrazo = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const escala = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * escala;
    canvas.height = rect.height * escala;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(escala, escala);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
  }, []);

  const punto = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const iniciar = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dibujando.current = true;
    const p = punto(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const mover = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dibujando.current) return;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const p = punto(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    hayTrazo.current = true;
  };

  const terminar = () => {
    if (!dibujando.current) return;
    dibujando.current = false;
    if (hayTrazo.current && canvasRef.current) onCambio(canvasRef.current.toDataURL("image/png"));
  };

  const limpiar = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hayTrazo.current = false;
    onCambio(null);
  };

  return (
    <div className="space-y-1.5">
      <canvas
        ref={canvasRef}
        onPointerDown={iniciar}
        onPointerMove={mover}
        onPointerUp={terminar}
        onPointerLeave={terminar}
        className="w-full h-40 rounded-2xl bg-white border-2 border-dashed border-slate-300 touch-none cursor-crosshair"
        aria-label="Area de firma"
      />
      <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span>Firme dentro del recuadro</span>
        <button type="button" onClick={limpiar} className="font-semibold hover:text-rose-600">
          Borrar firma
        </button>
      </div>
    </div>
  );
}

export default function ConsentimientosOdontologicos({ paciente, config }: ConsentimientosOdontologicosProps) {
  const [lista, setLista] = useState<ConsentimientoResumen[]>([]);
  const [plantilla, setPlantilla] = useState<(typeof PLANTILLAS)[number] | null>(null);
  const [texto, setTexto] = useState("");
  const [dienteFdi, setDienteFdi] = useState("");
  const [firmanteNombre, setFirmanteNombre] = useState("");
  const [firmanteCi, setFirmanteCi] = useState("");
  const [relacion, setRelacion] = useState("PACIENTE");
  const [firma, setFirma] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const cargar = async () => {
    try {
      const res = await fetch(`/api/salud/odontologia/consentimientos?pacienteId=${paciente.id}`, { headers: authHeaders() });
      if (res.ok) setLista(await res.json());
    } catch {
      setLista([]);
    }
  };

  useEffect(() => {
    setPlantilla(null);
    setMensaje(null);
    cargar();
  }, [paciente.id]);

  const abrir = (p: (typeof PLANTILLAS)[number]) => {
    setPlantilla(p);
    setTexto(p.texto);
    setDienteFdi("");
    setFirmanteNombre(paciente.nombreCompleto);
    setFirmanteCi(paciente.identificacion || "");
    setRelacion("PACIENTE");
    setFirma(null);
    setMensaje(null);
  };

  const firmar = async () => {
    if (!plantilla || !firma || !firmanteNombre.trim()) return;
    setGuardando(true);
    setMensaje(null);
    try {
      const res = await fetch("/api/salud/odontologia/consentimientos", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          pacienteId: paciente.id,
          tipo: plantilla.tipo,
          titulo: plantilla.titulo,
          texto,
          dienteFdi: dienteFdi.trim() ? Number(dienteFdi) : null,
          firmanteNombre: firmanteNombre.trim(),
          firmanteIdentificacion: firmanteCi.trim() || null,
          firmanteRelacion: relacion,
          firmaPng: firma,
        }),
      });
      if (!res.ok) {
        const cuerpo = await res.json().catch(() => null);
        throw new Error(cuerpo?.message || `error ${res.status}`);
      }
      setPlantilla(null);
      setMensaje({ tipo: "ok", texto: "Consentimiento firmado y archivado en el expediente." });
      cargar();
    } catch (e) {
      setMensaje({ tipo: "error", texto: `El consentimiento NO se guardo: ${e instanceof Error ? e.message : "fallo de conexion"}.` });
    } finally {
      setGuardando(false);
    }
  };

  const descargar = async (id: number) => {
    try {
      const res = await fetch(`/api/salud/odontologia/consentimientos/${id}`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`error ${res.status}`);
      descargarPdfConsentimiento(await res.json(), paciente, config);
    } catch (e) {
      setMensaje({ tipo: "error", texto: `No se pudo descargar el consentimiento: ${e instanceof Error ? e.message : "fallo de conexion"}.` });
    }
  };

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100 text-left">
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 space-y-4">
        <div>
          <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">Consentimientos informados</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            El paciente lee y firma en la pantalla; el documento queda archivado y no se puede modificar.
          </p>
        </div>

        {mensaje && (
          <div
            className={`p-3 rounded-2xl text-xs font-bold ${
              mensaje.tipo === "ok"
                ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                : "bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300"
            }`}
          >
            {mensaje.texto}
          </div>
        )}

        {!plantilla ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {PLANTILLAS.map((p) => (
              <button
                key={p.tipo}
                type="button"
                onClick={() => abrir(p)}
                className="p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 hover:border-emerald-500/50 hover:bg-emerald-500/10 text-left text-xs font-bold transition"
              >
                {p.titulo}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">{plantilla.titulo}</h4>
              <button type="button" onClick={() => setPlantilla(null)} className="font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white">
                Cancelar
              </button>
            </div>

            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={10}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/15 leading-relaxed"
            />

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <label className="block">
                <span className="block text-slate-500 dark:text-slate-400 mb-1">Pieza (opcional)</span>
                <input
                  type="number"
                  min="11"
                  max="85"
                  value={dienteFdi}
                  onChange={(e) => setDienteFdi(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/15"
                />
              </label>
              <label className="block">
                <span className="block text-slate-500 dark:text-slate-400 mb-1">Firma</span>
                <select
                  value={relacion}
                  onChange={(e) => setRelacion(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/15"
                >
                  {RELACIONES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-slate-500 dark:text-slate-400 mb-1">Nombre de quien firma *</span>
                <input
                  type="text"
                  value={firmanteNombre}
                  onChange={(e) => setFirmanteNombre(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/15"
                />
              </label>
              <label className="block">
                <span className="block text-slate-500 dark:text-slate-400 mb-1">C.I. de quien firma</span>
                <input
                  type="text"
                  value={firmanteCi}
                  onChange={(e) => setFirmanteCi(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/15"
                />
              </label>
            </div>

            <PanelFirma onCambio={setFirma} />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={firmar}
                disabled={guardando || !firma || !firmanteNombre.trim() || !texto.trim()}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm disabled:opacity-50"
              >
                {guardando ? "Archivando..." : "Firmar y archivar"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 space-y-3">
        <h4 className="font-['Outfit'] font-bold text-base text-slate-900 dark:text-white">Consentimientos firmados</h4>
        {lista.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">Este paciente no tiene consentimientos firmados.</p>
        ) : (
          <ul className="space-y-2">
            {lista.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 dark:text-white truncate">
                    {c.titulo}
                    {c.diente_fdi ? ` - pieza ${c.diente_fdi}` : ""}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Firmado el {new Date(c.fecha_firma).toLocaleString("es-VE")} por {c.firmante_nombre}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => descargar(c.id)}
                  className="shrink-0 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/15 font-semibold hover:bg-slate-200 dark:hover:bg-white/10"
                >
                  Descargar PDF
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
