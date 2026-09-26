import React, { useEffect, useState } from "react";
import { enviarEmailDocumento, leerSesion, type Paciente } from "../api";
import { VademecumPrescriptor, type ItemRecipePrescrito } from "./VademecumPrescriptor";
import { construirDocRecipeMedico, type RecipeReportData, type RecipeItemData } from "../utils/pdfReports";

interface RecetasOdontologicasProps {
  paciente: Paciente;
  config: any;
}

interface RecetaGuardada {
  id: number;
  odontologo: string;
  diagnostico: string | null;
  items_json: string;
  indicaciones: string | null;
  fecha_registro: string;
}

// Diagnosticos frecuentes en consulta dental para no escribirlos cada vez.
const DIAGNOSTICOS_FRECUENTES = [
  "Pulpitis irreversible sintomatica",
  "Absceso periapical agudo",
  "Pericoronaritis",
  "Post-exodoncia",
  "Alveolitis",
  "Gingivitis asociada a placa",
  "Periodontitis",
];

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${leerSesion()?.token || ""}` };
}

// Enlace personal del paciente a su portal; se crea una vez por visita de esta pantalla.
async function crearEnlacePortal(pacienteId: number): Promise<{ url: string; qrPng: string }> {
  const res = await fetch("/api/salud/odontologia/portal/enlaces", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ pacienteId, origen: window.location.origin }),
  });
  if (!res.ok) throw new Error(`error ${res.status}`);
  return res.json();
}

// El QR va en el centro del pie, entre el recuadro del sello y la firma.
function recipeConQr(data: RecipeReportData, qrPng: string | null) {
  const doc = construirDocRecipeMedico(data);
  if (qrPng) {
    const ancho = doc.internal.pageSize.getWidth();
    const alto = doc.internal.pageSize.getHeight();
    const lado = 24;
    const x = ancho / 2 - lado / 2 - 6;
    const y = alto - 42 - 8;
    doc.addImage(qrPng, "PNG", x, y, lado, lado);
    doc.setFontSize(6.5);
    doc.setTextColor(90, 90, 90);
    doc.text("Escanee para ver su historia dental", x + lado / 2, y + lado + 3, { align: "center" });
  }
  return doc;
}

function escaparHtml(texto: string) {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function nombreArchivo(data: RecipeReportData) {
  return `Receta_${data.paciente.nombre.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now() % 100000}.pdf`;
}

function edadDesde(fechaNac?: string | null): number | undefined {
  if (!fechaNac) return undefined;
  const n = new Date(fechaNac);
  if (Number.isNaN(n.getTime())) return undefined;
  const hoy = new Date();
  let edad = hoy.getFullYear() - n.getFullYear();
  const m = hoy.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < n.getDate())) edad--;
  return edad;
}

export default function RecetasOdontologicas({ paciente, config }: RecetasOdontologicasProps) {
  const [items, setItems] = useState<ItemRecipePrescrito[]>([]);
  const [diagnostico, setDiagnostico] = useState("");
  const [indicaciones, setIndicaciones] = useState("");
  const [recetas, setRecetas] = useState<RecetaGuardada[]>([]);
  const [cargandoRecetas, setCargandoRecetas] = useState(true);
  const [alergiasAnamnesis, setAlergiasAnamnesis] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [enlacePortal, setEnlacePortal] = useState<{ url: string; qrPng: string } | null>(null);
  const [enviando, setEnviando] = useState<number | "nueva" | null>(null);

  // Si el enlace no se puede crear, la receta sale igual, solo que sin QR.
  const obtenerEnlace = async (): Promise<{ url: string; qrPng: string } | null> => {
    if (enlacePortal) return enlacePortal;
    try {
      const e = await crearEnlacePortal(paciente.id);
      setEnlacePortal(e);
      return e;
    } catch {
      return null;
    }
  };

  const obtenerQr = async () => (await obtenerEnlace())?.qrPng ?? null;

  const enviarPorCorreo = async (data: RecipeReportData, clave: number | "nueva") => {
    if (!paciente.email) {
      setMensaje({ tipo: "error", texto: "El paciente no tiene correo registrado. Agregalo en su ficha para poder enviarle la receta." });
      return;
    }
    setEnviando(clave);
    try {
      const enlace = await obtenerEnlace();
      const doc = recipeConQr(data, enlace?.qrPng ?? null);
      const base64 = (doc.output("datauristring") as string).split(",")[1];
      const clinica = escaparHtml(data.clinicaNombre || "su clinica odontologica");
      await enviarEmailDocumento({
        destinatario: paciente.email,
        asunto: `Su receta de ${data.clinicaNombre || "su clinica odontologica"}`,
        cuerpo:
          `<p>Hola ${escaparHtml(paciente.nombreCompleto)},</p><p>Le enviamos adjunta la receta de su consulta del ${escaparHtml(data.paciente.fechaConsulta)}.</p>` +
          (enlace ? `<p>Puede ver su historia dental, su plan y sus citas aqui: <a href="${enlace.url}">${enlace.url}</a></p>` : "") +
          `<p>${clinica}</p>`,
        pdfBase64: base64,
        nombreArchivo: nombreArchivo(data),
      });
      setMensaje({ tipo: "ok", texto: `Receta enviada a ${paciente.email}.` });
    } catch (e) {
      setMensaje({ tipo: "error", texto: `La receta NO se envio: ${e instanceof Error ? e.message : "fallo de conexion"}.` });
    } finally {
      setEnviando(null);
    }
  };

  const cargarRecetas = async () => {
    setCargandoRecetas(true);
    try {
      const res = await fetch(`/api/salud/odontologia/recetas?pacienteId=${paciente.id}`, { headers: authHeaders() });
      if (res.ok) setRecetas(await res.json());
    } catch {
      setRecetas([]);
    } finally {
      setCargandoRecetas(false);
    }
  };

  useEffect(() => {
    setEnlacePortal(null);
    setItems([]);
    setDiagnostico("");
    setIndicaciones("");
    setMensaje(null);
    cargarRecetas();
    // Las alergias de la ficha odontologica se suman a las del paciente para el cruce del vademecum.
    fetch(`/api/salud/odontologia/anamnesis?pacienteId=${paciente.id}`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((a) => {
        if (!a) return setAlergiasAnamnesis("");
        const partes = [a.detalle_alergias || ""];
        if (a.alergia_anestesia) partes.push("Alergia a anestesicos locales");
        setAlergiasAnamnesis(partes.filter(Boolean).join(", "));
      })
      .catch(() => setAlergiasAnamnesis(""));
  }, [paciente.id]);

  const alergias = [paciente.alergias || "", alergiasAnamnesis].filter(Boolean).join(", ");

  const construirPdf = (medicamentos: RecipeItemData[], diag: string, indic: string, fecha: string): RecipeReportData => ({
    clinicaNombre: config?.clinicaNombre || "Clinica Odontologica",
    doctorNombre: config?.doctorNombre || "",
    especialidad: config?.especialidad || "Odontologia",
    matriculaMPPS: config?.matriculaMPPS,
    colegioMedicos: config?.colegioMedicos,
    telefonoContacto: config?.telefonoContacto,
    direccionClinica: config?.direccionClinica,
    logoBase64: config?.logoBase64,
    paciente: {
      nombre: paciente.nombreCompleto,
      identificacion: paciente.identificacion,
      edad: edadDesde(paciente.fechaNacimiento) ?? paciente.edad ?? "",
      sexo: paciente.genero || "No especificado",
      alergias: alergias || undefined,
      fechaConsulta: fecha,
      expediente: `HC-${String(paciente.id).padStart(4, "0")}`,
      telefono: paciente.telefono || undefined,
    },
    diagnostico: diag || undefined,
    medicamentos,
    indicacionesGenerales: indic || undefined,
  });

  const [ultimaGuardada, setUltimaGuardada] = useState<RecipeReportData | null>(null);

  // Una receta sin nombre, matrícula MPPS ni N° de Colegio no es válida: no se emite (antes salía "MPPS: N/A").
  const faltanDatosLegales = (): boolean => {
    if (config?.doctorNombre?.trim() && config?.matriculaMPPS?.trim() && config?.colegioMedicos?.trim()) return false;
    setMensaje({ tipo: "error", texto: "Para emitir recetas, completa tu nombre, matrícula MPPS y N° del Colegio de Odontólogos en Configuración & Perfil." });
    return true;
  };

  const guardarEImprimir = async () => {
    if (faltanDatosLegales()) return;
    if (items.length === 0) {
      setMensaje({ tipo: "error", texto: "Agrega al menos un medicamento a la receta." });
      return;
    }
    setGuardando(true);
    setMensaje(null);
    const medicamentos: RecipeItemData[] = items.map((it) => ({
      medicamento: it.medicamento,
      presentacion: it.presentacion,
      via: it.via,
      posologia: it.posologia,
      duracionDias: it.duracionDias,
      indicacionesEspeciales: it.indicacionesEspeciales,
    }));
    try {
      const res = await fetch("/api/salud/odontologia/recetas", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ pacienteId: paciente.id, diagnostico, items: medicamentos, indicaciones }),
      });
      if (!res.ok) {
        const cuerpo = await res.json().catch(() => null);
        throw new Error(cuerpo?.message || `error ${res.status}`);
      }
      const pdf = construirPdf(medicamentos, diagnostico, indicaciones, new Date().toLocaleDateString("es-VE"));
      recipeConQr(pdf, await obtenerQr()).save(nombreArchivo(pdf));
      setUltimaGuardada(pdf);
      setItems([]);
      setDiagnostico("");
      setIndicaciones("");
      setMensaje({ tipo: "ok", texto: "Receta guardada en el expediente y descargada en PDF." });
      cargarRecetas();
    } catch (e) {
      setMensaje({ tipo: "error", texto: `La receta NO se guardo: ${e instanceof Error ? e.message : "fallo de conexion"}.` });
    } finally {
      setGuardando(false);
    }
  };

  const datosDeGuardada = (r: RecetaGuardada): RecipeReportData => {
    let meds: RecipeItemData[] = [];
    try {
      meds = JSON.parse(r.items_json);
    } catch {
      meds = [];
    }
    return construirPdf(meds, r.diagnostico || "", r.indicaciones || "", new Date(r.fecha_registro).toLocaleDateString("es-VE"));
  };

  const reimprimir = async (r: RecetaGuardada) => {
    if (faltanDatosLegales()) return;
    const pdf = datosDeGuardada(r);
    recipeConQr(pdf, await obtenerQr()).save(nombreArchivo(pdf));
  };

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100 text-left">
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 space-y-4">
        <div>
          <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">Receta odontologica</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Prescripcion con vademecum y cruce de alergias para {paciente.nombreCompleto}
          </p>
        </div>

        {alergias && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-bold">
            Alergias registradas: {alergias}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <label className="block">
            <span className="block text-slate-500 dark:text-slate-400 mb-1">Diagnostico</span>
            <input
              type="text"
              list="diagnosticos-odonto"
              value={diagnostico}
              onChange={(e) => setDiagnostico(e.target.value)}
              placeholder="Ej: Pulpitis irreversible pieza 36"
              className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/15"
            />
            <datalist id="diagnosticos-odonto">
              {DIAGNOSTICOS_FRECUENTES.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </label>
          <label className="block">
            <span className="block text-slate-500 dark:text-slate-400 mb-1">Indicaciones generales</span>
            <input
              type="text"
              value={indicaciones}
              onChange={(e) => setIndicaciones(e.target.value)}
              placeholder="Ej: Dieta blanda, no enjuagar en 24 horas, compresas frias"
              className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/15"
            />
          </label>
        </div>

        <VademecumPrescriptor alergiasPaciente={alergias} itemsRecipe={items} onChangeItems={setItems} />

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

        <div className="flex flex-wrap justify-end gap-2">
          {ultimaGuardada && (
            <button
              type="button"
              onClick={() => enviarPorCorreo(ultimaGuardada, "nueva")}
              disabled={enviando !== null}
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-white/15 font-bold text-xs disabled:opacity-50"
            >
              {enviando === "nueva" ? "Enviando..." : "Enviar la receta por correo"}
            </button>
          )}
          <button
            type="button"
            onClick={guardarEImprimir}
            disabled={guardando || items.length === 0}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Guardar y descargar receta"}
          </button>
        </div>
      </div>

      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 space-y-3">
        <h4 className="font-['Outfit'] font-bold text-base text-slate-900 dark:text-white">Recetas anteriores</h4>
        {cargandoRecetas ? (
          <p className="text-xs text-slate-400 dark:text-slate-500">Cargando recetas...</p>
        ) : recetas.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">Aún no hay recetas de este paciente. La primera que guardes arriba aparecerá aquí.</p>
        ) : (
          <ul className="space-y-2">
            {recetas.map((r) => {
              let meds: RecipeItemData[] = [];
              try {
                meds = JSON.parse(r.items_json);
              } catch {
                meds = [];
              }
              return (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 dark:text-white truncate">
                      {meds.map((m) => m.medicamento).join(", ") || "Sin medicamentos"}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {new Date(r.fecha_registro).toLocaleDateString("es-VE")} - {r.odontologo}
                      {r.diagnostico ? ` - ${r.diagnostico}` : ""}
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => enviarPorCorreo(datosDeGuardada(r), r.id)}
                      disabled={enviando !== null}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/15 font-semibold hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-50"
                    >
                      {enviando === r.id ? "Enviando..." : "Correo"}
                    </button>
                    <button
                      type="button"
                      onClick={() => reimprimir(r)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/15 font-semibold hover:bg-slate-200 dark:hover:bg-white/10"
                    >
                      Descargar PDF
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
