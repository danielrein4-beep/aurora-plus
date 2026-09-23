import React, { useState, useEffect, useMemo } from "react";
import { IconTooth, IconClose, IconPrinter, IconCheck, IconFileText, IconCoins, IconEdit, IconTrash } from "../Icons";
import FiguraDienteAnatomico, { categorizarDienteFdi } from "./FiguraDienteAnatomico";
import {
  listarOdontograma,
  actualizarDienteOdontograma,
  listarHistorialOdontograma,
  listarProcedimientos,
  leerSesion,
  type OdontogramaDiente,
  type OdontogramaHistorialEntrada,
  type EstadoDiente,
  type ProcedimientoMedico,
} from "../api";

// Arcadas Permanentes (Adultos, cuadrantes 1-4)
const ARCADA_SUPERIOR_PERMANENTE = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const ARCADA_INFERIOR_PERMANENTE = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

// Arcadas Temporales / Deciduas (Infantil / Dientes de Leche, cuadrantes 5-8)
const ARCADA_SUPERIOR_DECIDUA = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
const ARCADA_INFERIOR_DECIDUA = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

export const ESTADO_INFO: Record<EstadoDiente, { label: string; color: string; bg: string; badge: string }> = {
  SANO: { label: "Sano", color: "#10b981", bg: "bg-white hover:bg-slate-50 dark:bg-slate-800/90 dark:hover:bg-slate-700/90 text-slate-800 dark:text-white border-slate-200/90 dark:border-white/15 shadow-xs", badge: "border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  CARIES: { label: "Caries", color: "#ef4444", bg: "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400", badge: "border-red-500/30" },
  OBTURADO: { label: "Obturado", color: "#0ea5e9", bg: "bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-400", badge: "border-sky-500/30" },
  AUSENTE: { label: "Ausente", color: "#64748b", bg: "bg-slate-200 dark:bg-white/5 text-slate-500 dark:text-slate-400", badge: "border-slate-500/30" },
  CORONA: { label: "Corona", color: "#eab308", bg: "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400", badge: "border-amber-500/30" },
  ENDODONCIA: { label: "Endodoncia", color: "#a855f7", bg: "bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400", badge: "border-purple-500/30" },
  EXTRACCION_INDICADA: { label: "Extracción indicada", color: "#f97316", bg: "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400", badge: "border-orange-500/30" },
  IMPLANTE: { label: "Implante", color: "#14b8a6", bg: "bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400", badge: "border-teal-500/30" },
};

const CARAS_DENTALES = [
  { id: "O", label: "Oclusal / Incisal", corto: "O/I" },
  { id: "M", label: "Mesial", corto: "M" },
  { id: "D", label: "Distal", corto: "D" },
  { id: "V", label: "Vestibular", corto: "V" },
  { id: "L", label: "Lingual / Palatino", corto: "L/P" },
];

function nombreDiente(fdi: number): string {
  const c = Math.floor(fdi / 10);
  const p = fdi % 10;
  const esDeciduo = c >= 5;
  const posicionesAdulto = ["", "Incisivo Central", "Incisivo Lateral", "Canino", "Primer Premolar", "Segundo Premolar", "Primer Molar", "Segundo Molar", "Tercer Molar"];
  const posicionesDeciduo = ["", "Incisivo Central Temporal", "Incisivo Lateral Temporal", "Canino Temporal", "Primer Molar Temporal", "Segundo Molar Temporal"];
  const lado = (c === 1 || c === 4 || c === 5 || c === 8) ? "Derecho" : "Izquierdo";
  const arcada = (c === 1 || c === 2 || c === 5 || c === 6) ? "Superior" : "Inferior";
  const posNombre = esDeciduo ? (posicionesDeciduo[p] || `Pieza ${p}`) : (posicionesAdulto[p] || `Pieza ${p}`);
  return `${posNombre} ${arcada} ${lado} (#${fdi})`;
}

function sextanteDe(fdi: number): string {
  const c = Math.floor(fdi / 10);
  const p = fdi % 10;
  if (c >= 5) {
    return c <= 6 ? "Superior Temporal" : "Inferior Temporal";
  }
  const esAnterior = p <= 3;
  if (c === 1) return esAnterior ? "Sextante 2 (Anterior Superior)" : "Sextante 1 (Post. Sup. Der.)";
  if (c === 2) return esAnterior ? "Sextante 2 (Anterior Superior)" : "Sextante 3 (Post. Sup. Izq.)";
  if (c === 4) return esAnterior ? "Sextante 5 (Anterior Inferior)" : "Sextante 6 (Post. Inf. Der.)";
  if (c === 3) return esAnterior ? "Sextante 5 (Anterior Inferior)" : "Sextante 4 (Post. Inf. Izq.)";
  return "Sextante Odontológico";
}

interface PresupuestoItem {
  id: string;
  fdi?: number;
  caras?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  fase: string;
  // false cuando no hay un procedimiento equivalente en el catalogo de la clinica
  // y se usa un precio sugerido que el odontologo debe confirmar.
  desdeCatalogo: boolean;
}

// Tratamiento sugerido por hallazgo: palabras para buscarlo en el catalogo de
// procedimientos de la clinica, precio sugerido si no existe y fase del plan.
const TRATAMIENTO_POR_ESTADO: Partial<Record<EstadoDiente, { nombre: string; claves: string[]; precio: number; fase: string }>> = {
  CARIES: { nombre: "Restauracion con resina", claves: ["resina", "restaura", "obtura"], precio: 30, fase: "FASE_1_HIGIENE" },
  ENDODONCIA: { nombre: "Endodoncia / tratamiento de conducto", claves: ["endodon", "conducto"], precio: 80, fase: "FASE_2_QUIRURGICA" },
  EXTRACCION_INDICADA: { nombre: "Exodoncia", claves: ["exodon", "extrac"], precio: 25, fase: "FASE_2_QUIRURGICA" },
  CORONA: { nombre: "Corona", claves: ["corona"], precio: 140, fase: "FASE_3_REHABILITACION" },
  IMPLANTE: { nombre: "Rehabilitacion sobre implante", claves: ["implant"], precio: 350, fase: "FASE_3_REHABILITACION" },
};

const PROFILAXIS = { nombre: "Profilaxis y tartrectomia", claves: ["profilax", "tartrect", "limpieza"], precio: 25, fase: "FASE_1_HIGIENE" };

function buscarEnCatalogo(catalogo: ProcedimientoMedico[], claves: string[]): ProcedimientoMedico | undefined {
  return catalogo.find((p) => {
    // El presupuesto es en USD: un precio del catalogo en otra moneda no se mezcla.
    if ((p as { activo?: boolean }).activo === false || (p.moneda && p.moneda !== "USD")) return false;
    const nombre = p.nombre.toLowerCase();
    return claves.some((c) => nombre.includes(c));
  });
}

// Caras guardadas antes de V80 venian embebidas como "[Caras: O, M] nota".
function separarCarasLegado(nota: string): { caras: string[]; nota: string } {
  const match = nota.match(/^\[Caras:\s*([^\]]+)\]\s*(.*)$/);
  if (!match) return { caras: [], nota };
  return { caras: match[1].split(",").map((c) => c.trim()).filter(Boolean), nota: match[2] || "" };
}

function leerCarasJson(texto: string | null): string[] {
  if (!texto) return [];
  try {
    const valor = JSON.parse(texto);
    return Array.isArray(valor) ? valor : [];
  } catch {
    return [];
  }
}

export interface OdontogramaProps {
  pacienteId: number;
  nombrePaciente?: string;
  cedulaPaciente?: string;
  tasaBcv?: number;
  onPlanCreado?: () => void;
}

export default function Odontograma({
  pacienteId,
  nombrePaciente,
  cedulaPaciente,
  tasaBcv = 36.5,
  onPlanCreado,
}: OdontogramaProps) {
  const [dientes, setDientes] = useState<OdontogramaDiente[] | null>(null);
  const [dienteSeleccionado, setDienteSeleccionado] = useState<number | null>(null);
  const [modoDenticion, setModoDenticion] = useState<"permanente" | "decidua" | "mixta">("permanente");

  // Estado del modal de diente
  const [estadoForm, setEstadoForm] = useState<EstadoDiente>("SANO");
  const [carasSeleccionadas, setCarasSeleccionadas] = useState<string[]>([]);
  const [notasForm, setNotasForm] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal de Presupuesto / Plan de Tratamiento
  const [mostrarPresupuesto, setMostrarPresupuesto] = useState(false);
  const [itemsPresupuesto, setItemsPresupuesto] = useState<PresupuestoItem[]>([]);
  const [notaPresupuesto, setNotaPresupuesto] = useState("Plan de tratamiento sujeto a evolución clínica y radiográfica.");
  const [nuevoItemDesc, setNuevoItemDesc] = useState("");
  const [nuevoItemPrecio, setNuevoItemPrecio] = useState<number | "">("");
  const [catalogo, setCatalogo] = useState<ProcedimientoMedico[]>([]);
  const [nombrePlan, setNombrePlan] = useState("");
  const [guardandoPlan, setGuardandoPlan] = useState(false);
  const [errorPlan, setErrorPlan] = useState<string | null>(null);
  const [historialDiente, setHistorialDiente] = useState<OdontogramaHistorialEntrada[] | null>(null);

  useEffect(() => {
    const tenantId = leerSesion()?.tenantId;
    if (!tenantId) return;
    listarProcedimientos(tenantId).then(setCatalogo).catch(() => setCatalogo([]));
  }, []);

  const agregarItemManual = () => {
    if (!nuevoItemDesc.trim()) return;
    const precio = typeof nuevoItemPrecio === "number" ? nuevoItemPrecio : 0;
    setItemsPresupuesto((prev) => [
      ...prev,
      {
        id: `manual-${Date.now()}`,
        descripcion: nuevoItemDesc.trim(),
        cantidad: 1,
        precioUnitario: Math.max(0, precio),
        fase: "FASE_1_HIGIENE",
        desdeCatalogo: true,
      },
    ]);
    setNuevoItemDesc("");
    setNuevoItemPrecio("");
  };

  const cargar = () => listarOdontograma(pacienteId).then(setDientes).catch(() => setDientes([]));
  useEffect(() => { cargar(); }, [pacienteId]);

  const dientesPorFdi: Record<number, EstadoDiente> = useMemo(() => {
    const mapa: Record<number, EstadoDiente> = {};
    (dientes || []).forEach((d) => { mapa[d.numeroFdi] = d.estado; });
    return mapa;
  }, [dientes]);

  const notasPorFdi: Record<number, string> = useMemo(() => {
    const mapa: Record<number, string> = {};
    (dientes || []).forEach((d) => { if (d.notas) mapa[d.numeroFdi] = d.notas; });
    return mapa;
  }, [dientes]);

  // Conteo de patologías
  const resumenPatologias = useMemo(() => {
    const counts: Record<EstadoDiente, number> = {
      SANO: 0,
      CARIES: 0,
      OBTURADO: 0,
      AUSENTE: 0,
      CORONA: 0,
      ENDODONCIA: 0,
      EXTRACCION_INDICADA: 0,
      IMPLANTE: 0,
    };
    (dientes || []).forEach((d) => {
      if (counts[d.estado] !== undefined) {
        counts[d.estado]++;
      }
    });
    return counts;
  }, [dientes]);

  const abrirDiente = (fdi: number) => {
    setDienteSeleccionado(fdi);
    const existente = (dientes || []).find((d) => d.numeroFdi === fdi);
    setEstadoForm(existente?.estado || "SANO");
    
    const legado = separarCarasLegado(existente?.notas || "");
    setCarasSeleccionadas(existente?.caras && existente.caras.length > 0 ? existente.caras : legado.caras);
    setNotasForm(legado.nota);
    setError(null);
    setHistorialDiente(null);
    listarHistorialOdontograma(pacienteId, fdi).then(setHistorialDiente).catch(() => setHistorialDiente([]));
  };

  const toggleCara = (caraId: string) => {
    setCarasSeleccionadas((prev) =>
      prev.includes(caraId) ? prev.filter((c) => c !== caraId) : [...prev, caraId]
    );
  };

  const guardarDiente = async () => {
    if (dienteSeleccionado == null) return;
    setGuardando(true);
    setError(null);
    try {
      await actualizarDienteOdontograma(pacienteId, dienteSeleccionado, {
        estado: estadoForm,
        notas: notasForm.trim() || undefined,
        caras: carasSeleccionadas,
      });
      setDienteSeleccionado(null);
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el diente");
    } finally {
      setGuardando(false);
    }
  };

  // Presupuesto a partir de los hallazgos, con los precios del catalogo de la clinica.
  const itemDesdeTratamiento = (
    id: string,
    t: { nombre: string; claves: string[]; precio: number; fase: string },
    fdi?: number,
    caras?: string[]
  ): PresupuestoItem => {
    const proc = buscarEnCatalogo(catalogo, t.claves);
    const carasTexto = caras && caras.length > 0 ? caras.join("") : undefined;
    return {
      id,
      fdi,
      caras: carasTexto,
      descripcion: `${proc ? proc.nombre : t.nombre}${fdi ? ` - Pieza #${fdi}` : ""}${carasTexto ? ` (${carasTexto})` : ""}`,
      cantidad: 1,
      precioUnitario: proc ? Number(proc.costo) : t.precio,
      fase: t.fase,
      desdeCatalogo: !!proc,
    };
  };

  const generarPresupuesto = () => {
    const items: PresupuestoItem[] = [itemDesdeTratamiento("item-0", PROFILAXIS)];
    (dientes || []).forEach((d) => {
      const t = TRATAMIENTO_POR_ESTADO[d.estado];
      if (!t) return;
      const caras = d.caras && d.caras.length > 0 ? d.caras : separarCarasLegado(d.notas || "").caras;
      items.push(itemDesdeTratamiento(`item-${d.numeroFdi}`, t, d.numeroFdi, caras));
    });
    setItemsPresupuesto(items);
    setNombrePlan(`Plan integral ${new Date().toLocaleDateString("es-VE")}`);
    setErrorPlan(null);
    setMostrarPresupuesto(true);
  };

  const guardarComoPlan = async () => {
    if (itemsPresupuesto.length === 0 || !nombrePlan.trim()) return;
    setGuardandoPlan(true);
    setErrorPlan(null);
    try {
      const res = await fetch("/api/salud/odontologia/planes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${leerSesion()?.token || ""}`,
        },
        body: JSON.stringify({
          pacienteId,
          nombrePlan: nombrePlan.trim(),
          notas: notaPresupuesto,
          items: itemsPresupuesto.flatMap((it) =>
            Array.from({ length: Math.max(1, it.cantidad) }, () => ({
              fase: it.fase,
              dienteFdi: it.fdi ?? null,
              cara: it.caras ?? null,
              procedimiento: it.descripcion,
              costoUsd: it.precioUnitario,
            }))
          ),
        }),
      });
      if (!res.ok) {
        const cuerpo = await res.json().catch(() => null);
        throw new Error(cuerpo?.message || `No se pudo guardar el plan (error ${res.status}).`);
      }
      setMostrarPresupuesto(false);
      onPlanCreado?.();
    } catch (e) {
      setErrorPlan(e instanceof Error ? e.message : "No se pudo guardar el plan.");
    } finally {
      setGuardandoPlan(false);
    }
  };

  const actualizarPrecioItem = (id: string, precio: number) => {
    setItemsPresupuesto((prev) =>
      prev.map((it) => (it.id === id ? { ...it, precioUnitario: Math.max(0, precio) } : it))
    );
  };

  const eliminarItemPresupuesto = (id: string) => {
    setItemsPresupuesto((prev) => prev.filter((it) => it.id !== id));
  };

  const totalPresupuestoUsd = useMemo(() => {
    return itemsPresupuesto.reduce((sum, it) => sum + it.cantidad * it.precioUnitario, 0);
  }, [itemsPresupuesto]);

  const totalPresupuestoBs = totalPresupuestoUsd * (tasaBcv || 36.5);

  const imprimirPresupuesto = () => {
    window.print();
  };

  return (
    <div className="apple-glass rounded-3xl p-5 sm:p-7 border border-slate-300/70 dark:border-white/15 shadow-sm space-y-5 bg-white/90 dark:bg-[#071322]/80">
      {/* Encabezado Odontograma */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <IconTooth size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-['Outfit'] font-black text-slate-900 dark:text-white text-lg">
                Odontograma Clínico Internacional FDI
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                FDI Two-Digit
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-white/60">
              {nombrePaciente ? `Paciente: ${nombrePaciente}` : "Mapa anatómico y registro de patologías por pieza dental"}
              {cedulaPaciente ? ` · CI: ${cedulaPaciente}` : ""}
            </p>
          </div>
        </div>

        {/* Controles: Selector de Dentición y Botón Presupuesto */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex p-1 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
            <button
              onClick={() => setModoDenticion("permanente")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                modoDenticion === "permanente"
                  ? "bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:text-white/60"
              }`}
            >
              Permanente (Adulto)
            </button>
            <button
              onClick={() => setModoDenticion("decidua")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                modoDenticion === "decidua"
                  ? "bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:text-white/60"
              }`}
            >
              Decidua (Infantil)
            </button>
            <button
              onClick={() => setModoDenticion("mixta")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                modoDenticion === "mixta"
                  ? "bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:text-white/60"
              }`}
            >
              Mixta
            </button>
          </div>

          <button
            onClick={generarPresupuesto}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-all shadow-sm hover:shadow"
          >
            <IconCoins size={14} />
            <span>Presupuesto Dental</span>
          </button>
        </div>
      </div>

      {/* Resumen Clínico / Métricas Rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {(Object.keys(ESTADO_INFO) as EstadoDiente[]).map((estado) => {
          const info = ESTADO_INFO[estado];
          const count = resumenPatologias[estado] || 0;
          return (
            <div
              key={estado}
              className={`p-2 rounded-xl border flex flex-col items-center text-center justify-center transition-all ${info.bg} ${info.badge}`}
            >
              <span className="text-[10px] uppercase font-bold tracking-tight opacity-80">{info.label}</span>
              <span className="text-base font-black font-mono mt-0.5">{count}</span>
            </div>
          );
        })}
      </div>

      {/* Renderizado de Arcadas según modo de dentición */}
      {dientes === null ? (
        <div className="py-12 text-center text-slate-400 text-xs">Cargando odontograma...</div>
      ) : (
        <div className="space-y-6 overflow-x-auto py-2">
          {/* Arcadas Permanentes */}
          {(modoDenticion === "permanente" || modoDenticion === "mixta") && (
            <div className="space-y-3 min-w-[620px]">
              <div className="flex items-center justify-between px-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-wider">
                  Dentición Permanente · Arcada Superior (18 - 28)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Cuadrantes 1 y 2</span>
              </div>
              <div className="grid grid-cols-16 gap-1" style={{ gridTemplateColumns: "repeat(16, minmax(0, 1fr))" }}>
                {ARCADA_SUPERIOR_PERMANENTE.map((fdi) => {
                  const estado = dientesPorFdi[fdi] || "SANO";
                  const info = ESTADO_INFO[estado];
                  const tieneNota = Boolean(notasPorFdi[fdi]);
                  return (
                    <button
                      key={fdi}
                      onClick={() => abrirDiente(fdi)}
                      title={`${nombreDiente(fdi)}: ${info.label}${tieneNota ? ` — ${notasPorFdi[fdi]}` : ""}`}
                      className={`relative flex flex-col items-center gap-1 p-2 rounded-xl cursor-pointer transition-all hover:scale-110 hover:shadow-md border border-slate-200/60 dark:border-white/10 ${info.bg}`}
                    >
                      <FiguraDienteAnatomico fdi={fdi} estado={estado} size={26} />
                      <span className="text-[10px] font-mono font-bold">{fdi}</span>
                      {tieneNota && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-sky-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Arcadas Deciduas (Infantil) */}
          {(modoDenticion === "decidua" || modoDenticion === "mixta") && (
            <div className="space-y-3 min-w-[620px] p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5">
              <div className="flex items-center justify-between px-2">
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Dentición Decidua / Infantil · Arcada Superior (55 - 65)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Cuadrantes 5 y 6</span>
              </div>
              <div className="flex justify-center">
                <div className="grid grid-cols-10 gap-1.5 max-w-[420px] w-full" style={{ gridTemplateColumns: "repeat(10, minmax(0, 1fr))" }}>
                  {ARCADA_SUPERIOR_DECIDUA.map((fdi) => {
                    const estado = dientesPorFdi[fdi] || "SANO";
                    const info = ESTADO_INFO[estado];
                    const tieneNota = Boolean(notasPorFdi[fdi]);
                    return (
                      <button
                        key={fdi}
                        onClick={() => abrirDiente(fdi)}
                        title={`${nombreDiente(fdi)}: ${info.label}${tieneNota ? ` — ${notasPorFdi[fdi]}` : ""}`}
                        className={`relative flex flex-col items-center gap-1 p-2 rounded-xl cursor-pointer transition-all hover:scale-110 hover:shadow-md border border-slate-200/60 dark:border-white/10 ${info.bg}`}
                      >
                        <FiguraDienteAnatomico fdi={fdi} estado={estado} size={22} />
                        <span className="text-[10px] font-mono font-bold">{fdi}</span>
                        {tieneNota && (
                          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-sky-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Arcada Inferior Decidua */}
              <div className="flex justify-center pt-2">
                <div className="grid grid-cols-10 gap-1.5 max-w-[420px] w-full" style={{ gridTemplateColumns: "repeat(10, minmax(0, 1fr))" }}>
                  {ARCADA_INFERIOR_DECIDUA.map((fdi) => {
                    const estado = dientesPorFdi[fdi] || "SANO";
                    const info = ESTADO_INFO[estado];
                    const tieneNota = Boolean(notasPorFdi[fdi]);
                    return (
                      <button
                        key={fdi}
                        onClick={() => abrirDiente(fdi)}
                        title={`${nombreDiente(fdi)}: ${info.label}${tieneNota ? ` — ${notasPorFdi[fdi]}` : ""}`}
                        className={`relative flex flex-col items-center gap-1 p-2 rounded-xl cursor-pointer transition-all hover:scale-110 hover:shadow-md border border-slate-200/60 dark:border-white/10 ${info.bg}`}
                      >
                        <FiguraDienteAnatomico fdi={fdi} estado={estado} size={22} />
                        <span className="text-[10px] font-mono font-bold">{fdi}</span>
                        {tieneNota && (
                          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-sky-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center justify-between px-2 pt-1">
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Dentición Decidua / Infantil · Arcada Inferior (85 - 75)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Cuadrantes 8 y 7</span>
              </div>
            </div>
          )}

          {/* Arcada Inferior Permanente */}
          {(modoDenticion === "permanente" || modoDenticion === "mixta") && (
            <div className="space-y-3 min-w-[620px]">
              <div className="flex items-center justify-between px-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-wider">
                  Dentición Permanente · Arcada Inferior (48 - 38)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Cuadrantes 4 y 3</span>
              </div>
              <div className="grid grid-cols-16 gap-1" style={{ gridTemplateColumns: "repeat(16, minmax(0, 1fr))" }}>
                {ARCADA_INFERIOR_PERMANENTE.map((fdi) => {
                  const estado = dientesPorFdi[fdi] || "SANO";
                  const info = ESTADO_INFO[estado];
                  const tieneNota = Boolean(notasPorFdi[fdi]);
                  return (
                    <button
                      key={fdi}
                      onClick={() => abrirDiente(fdi)}
                      title={`${nombreDiente(fdi)}: ${info.label}${tieneNota ? ` — ${notasPorFdi[fdi]}` : ""}`}
                      className={`relative flex flex-col items-center gap-1 p-2 rounded-xl cursor-pointer transition-all hover:scale-110 hover:shadow-md border border-slate-200/60 dark:border-white/10 ${info.bg}`}
                    >
                      <FiguraDienteAnatomico fdi={fdi} estado={estado} size={26} />
                      <span className="text-[10px] font-mono font-bold">{fdi}</span>
                      {tieneNota && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-sky-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Leyenda de Estados */}
      <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-200/80 dark:border-white/10">
        {(Object.keys(ESTADO_INFO) as EstadoDiente[]).map((k) => (
          <div key={k} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-white/60">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ESTADO_INFO[k].color }} />
            <span>{ESTADO_INFO[k].label}</span>
          </div>
        ))}
      </div>

      {/* Modal de Detalle / Edición de Diente */}
      {dienteSeleccionado != null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setDienteSeleccionado(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#0c1421] text-slate-900 dark:text-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-white/15 space-y-4"
          >
            <div className="flex items-start justify-between border-b border-slate-200/80 dark:border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center">
                  <FiguraDienteAnatomico fdi={dienteSeleccionado} estado={estadoForm} size={42} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">
                      Pieza #{dienteSeleccionado}
                    </h4>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                      {categorizarDienteFdi(dienteSeleccionado).nombreCorto}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    {nombreDiente(dienteSeleccionado)}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {sextanteDe(dienteSeleccionado)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDienteSeleccionado(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <IconClose size={18} />
              </button>
            </div>

            {/* Selector de Estado */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Estado Patológico o Clínico
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(ESTADO_INFO) as EstadoDiente[]).map((k) => {
                  const info = ESTADO_INFO[k];
                  const activo = estadoForm === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setEstadoForm(k)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left ${
                        activo
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm"
                          : "border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-white/80"
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: info.color }} />
                      <span className="truncate">{info.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selector de Caras Dentales */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Superficies / Caras Afectadas (Opcional)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CARAS_DENTALES.map((c) => {
                  const sel = carasSeleccionadas.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCara(c.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all border ${
                        sel
                          ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                          : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/70 border-slate-200 dark:border-white/10 hover:bg-slate-200"
                      }`}
                    >
                      {c.corto} · {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notas / Observaciones */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Diagnóstico / Indicaciones Específicas
              </label>
              <textarea
                value={notasForm}
                onChange={(e) => setNotasForm(e.target.value)}
                rows={2}
                placeholder="Ej. Caries de segundo grado, requiere perno de fibra y corona..."
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Historial de la pieza
              </span>
              {historialDiente === null ? (
                <p className="text-xs text-slate-400">Cargando historial...</p>
              ) : historialDiente.length === 0 ? (
                <p className="text-xs text-slate-400">Sin cambios registrados todavia.</p>
              ) : (
                <ul className="max-h-32 overflow-y-auto space-y-1 pr-1">
                  {historialDiente.map((h) => {
                    const caras = leerCarasJson(h.caras_json);
                    return (
                      <li key={h.id} className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                        <span className="font-mono text-slate-400 shrink-0">
                          {new Date(h.fecha_registro).toLocaleDateString("es-VE")}
                        </span>
                        <span>
                          <span className="font-semibold">{ESTADO_INFO[h.estado]?.label || h.estado}</span>
                          {caras.length > 0 && <span className="font-mono"> ({caras.join("")})</span>}
                          {h.usuario && <span className="text-slate-400"> - {h.usuario}</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDienteSeleccionado(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 text-slate-600 dark:text-white/70 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarDiente}
                disabled={guardando}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-all disabled:opacity-60 shadow-sm"
              >
                {guardando ? "Guardando..." : "Guardar Pieza"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Presupuesto Dental & Plan de Tratamiento Imprimible */}
      {mostrarPresupuesto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setMostrarPresupuesto(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#0c1421] text-slate-900 dark:text-white rounded-3xl p-6 sm:p-7 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-white/15 space-y-5"
          >
            {/* Encabezado del Presupuesto */}
            <div className="flex items-start justify-between border-b border-slate-200/80 dark:border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center border border-emerald-500/30">
                  <IconCoins size={22} />
                </div>
                <div>
                  <h4 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
                    Plan de Tratamiento & Presupuesto Dental
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-white/60">
                    Generado automáticamente a partir del odontograma clínico
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMostrarPresupuesto(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <IconClose size={18} />
              </button>
            </div>

            {/* Datos del Paciente */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Paciente</span>
                <span className="font-bold">{nombrePaciente || "Paciente General"}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Identificación</span>
                <span className="font-mono font-bold">{cedulaPaciente || "No registrada"}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Fecha Emisión</span>
                <span>{new Date().toLocaleDateString("es-VE")}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Tasa BCV Aplicada</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {tasaBcv.toFixed(2)} Bs/$
                </span>
              </div>
            </div>

            {/* Tabla de Items del Presupuesto */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-white/40 uppercase tracking-wider px-2">
                <span>Procedimiento / Pieza</span>
                <span>Precio Unitario (USD)</span>
              </div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {itemsPresupuesto.length === 0 ? (
                  <p className="p-4 text-center text-xs text-slate-400 border border-dashed rounded-xl">
                    No se detectaron piezas con tratamientos requeridos en el odontograma.
                  </p>
                ) : (
                  itemsPresupuesto.map((it) => (
                    <div
                      key={it.id}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-100/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-white truncate">{it.descripcion}</p>
                        {it.fdi && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                            Pieza #{it.fdi}
                          </span>
                        )}
                        {!it.desdeCatalogo && (
                          <span className="ml-2 text-[10px] font-semibold text-amber-600 dark:text-amber-400" title="No hay un procedimiento equivalente en el catalogo de la clinica">
                            Precio sugerido, confirmar
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-mono">$</span>
                          <input
                            type="number"
                            min="0"
                            step="5"
                            value={it.precioUnitario}
                            onChange={(e) => actualizarPrecioItem(it.id, parseFloat(e.target.value) || 0)}
                            className="w-20 pl-5 pr-2 py-1 bg-white dark:bg-black/30 border border-slate-300 dark:border-white/15 rounded-lg text-right font-mono font-bold text-xs"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => eliminarItemPresupuesto(it.id)}
                          className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                          title="Eliminar ítem"
                        >
                          <IconTrash size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Agregar procedimiento manual al presupuesto */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Agregar servicio adicional (ej. Radiografía, Férula...)"
                  value={nuevoItemDesc}
                  onChange={(e) => setNuevoItemDesc(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">$</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Precio"
                    value={nuevoItemPrecio}
                    onChange={(e) => setNuevoItemPrecio(e.target.value === "" ? "" : parseFloat(e.target.value))}
                    className="w-24 pl-5 pr-2 py-1.5 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-right font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={agregarItemManual}
                  disabled={!nuevoItemDesc.trim()}
                  className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-white/80 font-semibold text-xs transition-colors disabled:opacity-50"
                >
                  + Agregar
                </button>
              </div>
            </div>

            {/* Totalizador Dual (USD y Bs) */}
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">
                  Total Estimado Tratamiento
                </span>
                <span className="text-[11px] text-slate-500 dark:text-white/60">
                  Calculado en base a {itemsPresupuesto.length} procedimiento(s)
                </span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  ${totalPresupuestoUsd.toFixed(2)} USD
                </div>
                <div className="text-xs font-bold font-mono text-slate-500 dark:text-white/70">
                  {totalPresupuestoBs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
                </div>
              </div>
            </div>

            {/* Nota clínica del presupuesto */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Observaciones y Condiciones del Plan de Tratamiento
              </label>
              <textarea
                value={notaPresupuesto}
                onChange={(e) => setNotaPresupuesto(e.target.value)}
                rows={2}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Nombre del plan
              </label>
              <input
                type="text"
                value={nombrePlan}
                onChange={(e) => setNombrePlan(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {errorPlan && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-xs font-semibold">
                {errorPlan}
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/80 dark:border-white/10">
              <button
                type="button"
                onClick={() => setMostrarPresupuesto(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-white/10 text-slate-600 dark:text-white/70 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-white/5"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={imprimirPresupuesto}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm"
              >
                <IconPrinter size={15} />
                <span>Imprimir Plan Dental</span>
              </button>
              <button
                type="button"
                onClick={guardarComoPlan}
                disabled={guardandoPlan || itemsPresupuesto.length === 0 || !nombrePlan.trim()}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold text-xs shadow-sm disabled:opacity-50"
              >
                <IconCheck size={15} />
                <span>{guardandoPlan ? "Guardando..." : "Guardar como plan de tratamiento"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
