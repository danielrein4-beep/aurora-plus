import { useState } from "react";
import * as XLSX from "xlsx";
import { IconClose, IconDownload, IconUpload, IconWarning, IconCheckCircle } from "../Icons";
import {
  importarHatoGanaderia,
  type FilaImportacionHato,
  type ResultadoImportacionHato,
} from "../api";

/**
 * Carga inicial del hato para una finca que recién adquiere Aurora.
 * El navegador lee el Excel/CSV y manda las filas como texto; el backend valida
 * todo el archivo y solo guarda si no hay un solo error (todo o nada).
 */

// Encabezado de la plantilla → campo del backend. Obligatorios marcados con *.
const COLUMNAS: Array<{ encabezado: string; campo: keyof FilaImportacionHato; ejemplo: [string, string, string] }> = [
  { encabezado: "Arete*", campo: "arete", ejemplo: ["T-001", "V-014", "B-102"] },
  { encabezado: "Tipo identificador", campo: "tipoIdentificador", ejemplo: ["ARETE", "ARETE", "ARETE"] },
  { encabezado: "Nombre", campo: "nombre", ejemplo: ["Lucero", "Mariposa", ""] },
  { encabezado: "Especie", campo: "especie", ejemplo: ["BOVINO", "BOVINO", "BOVINO"] },
  { encabezado: "Raza", campo: "raza", ejemplo: ["Brahman", "Gyr", "Gyr"] },
  { encabezado: "Sexo*", campo: "sexo", ejemplo: ["MACHO", "HEMBRA", "MACHO"] },
  { encabezado: "Tipo animal", campo: "tipoAnimal", ejemplo: ["TORO", "VACA", "BECERRO"] },
  { encabezado: "Fecha nacimiento", campo: "fechaNacimiento", ejemplo: ["10/02/2019", "22/08/2020", "05/05/2026"] },
  { encabezado: "Peso (kg)", campo: "pesoActual", ejemplo: ["780", "450", "95"] },
  { encabezado: "Valor estimado (USD)", campo: "valorEstimado", ejemplo: ["", "", ""] },
  { encabezado: "Potrero", campo: "potrero", ejemplo: ["", "", ""] },
  { encabezado: "Lote", campo: "lote", ejemplo: ["Padrotes", "Ordeño", "Becerros 2026"] },
  { encabezado: "Arete madre", campo: "areteMadre", ejemplo: ["", "", "V-014"] },
  { encabezado: "Arete padre", campo: "aretePadre", ejemplo: ["", "", "T-001"] },
  { encabezado: "Estado reproductivo", campo: "estadoReproductivo", ejemplo: ["", "PREÑADA", ""] },
  { encabezado: "Estado productivo", campo: "estadoProductivo", ejemplo: ["", "ORDEÑO", "CRIANDO"] },
  { encabezado: "Padrote de la preñez", campo: "padrotePrenez", ejemplo: ["", "T-001", ""] },
  { encabezado: "Fecha probable de parto", campo: "fechaProbableParto", ejemplo: ["", "15/12/2026", ""] },
];

const INSTRUCCIONES: string[][] = [
  ["Cómo llenar la plantilla de carga inicial del hato"],
  [""],
  ["Una fila por animal. Solo Arete y Sexo son obligatorios; lo demás puede quedar vacío y completarse luego."],
  ["Arete: identificador único dentro de su finca (arete, chip o QR). No puede repetirse."],
  ["Sexo: MACHO o HEMBRA (también se acepta M, H o F)."],
  ["Tipo animal: hembras BECERRA, MAUTA, NOVILLA, VACA; machos BECERRO/TERNERO, MAUTE, NOVILLO, TORO. Si lo deja vacío se calcula por la edad."],
  ["Fechas: día/mes/año, por ejemplo 15/03/2021."],
  ["Potrero: nombre exacto de un potrero ya creado en Mapa & Potreros. Si aún no los tiene, deje la columna vacía."],
  ["Arete madre / Arete padre: aretes de animales que vienen en este mismo archivo o que ya están en Aurora."],
  ["Estado reproductivo: VACIA, PREÑADA o EN_ESPERA. Estado productivo: CRIANDO, ORDEÑO o SECA."],
  ["Padrote de la preñez (solo preñadas): arete del toro si está en su hato, o el nombre del toro o la pajuela si es externo."],
  ["Valor estimado: referencia contable opcional. La carga inicial NO registra compras ni gastos."],
  [""],
  ["Si una sola fila tiene error, no se guarda nada: Aurora le indica fila por fila qué corregir y vuelve a subir el archivo."],
];

function normalizarEncabezado(s: string) {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

const CAMPO_POR_ENCABEZADO: Record<string, keyof FilaImportacionHato> = Object.fromEntries(
  COLUMNAS.flatMap(c => [
    [normalizarEncabezado(c.encabezado), c.campo],
    [normalizarEncabezado(c.campo), c.campo],
  ])
);

function descargarPlantilla() {
  const hoja = XLSX.utils.aoa_to_sheet([
    COLUMNAS.map(c => c.encabezado),
    ...[0, 1, 2].map(i => COLUMNAS.map(c => c.ejemplo[i])),
  ]);
  hoja["!cols"] = COLUMNAS.map(c => ({ wch: Math.max(12, c.encabezado.length + 2) }));
  const instrucciones = XLSX.utils.aoa_to_sheet(INSTRUCCIONES);
  instrucciones["!cols"] = [{ wch: 120 }];
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Hato");
  XLSX.utils.book_append_sheet(libro, instrucciones, "Instrucciones");
  XLSX.writeFile(libro, "Plantilla_Carga_Hato_Aurora.xlsx");
}

function fechaDiaMesAnio(d: Date) {
  // SheetJS puede entregar la medianoche corrida unos segundos hacia el día
  // anterior (desfase horario histórico); sumar 12 h deja la fecha en su día.
  const f = new Date(d.getTime() + 12 * 3600 * 1000);
  const dd = String(f.getDate()).padStart(2, "0");
  const mm = String(f.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${f.getFullYear()}`;
}

async function leerArchivo(archivo: File): Promise<{ filas: FilaImportacionHato[]; columnasIgnoradas: string[] }> {
  // cellDates + raw: las fechas llegan como Date y se escriben siempre día/mes/año.
  // Con raw:false SheetJS devolvería el texto con el formato regional de la celda
  // (p. ej. "3/15/21" en un Excel en inglés) y el día y el mes se confundirían.
  const libro = XLSX.read(await archivo.arrayBuffer(), { cellDates: true });
  const hoja = libro.Sheets[libro.SheetNames[0]];
  const crudas = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, { raw: true, defval: "" });
  const columnasIgnoradas = new Set<string>();
  const filas = crudas
    .map(cruda => {
      const fila: FilaImportacionHato = {};
      for (const [encabezado, valor] of Object.entries(cruda)) {
        const campo = CAMPO_POR_ENCABEZADO[normalizarEncabezado(encabezado)];
        if (!campo) {
          if (!encabezado.startsWith("__EMPTY")) columnasIgnoradas.add(encabezado);
          continue;
        }
        const texto = valor instanceof Date ? fechaDiaMesAnio(valor) : String(valor ?? "").trim();
        if (texto) fila[campo] = texto;
      }
      return fila;
    })
    // Filas totalmente vacías (típicas al final de un Excel) no cuentan.
    .filter(f => Object.keys(f).length > 0);
  return { filas, columnasIgnoradas: [...columnasIgnoradas] };
}

interface Props {
  onCerrar: () => void;
  onImportado: (cantidad: number) => void;
}

export default function ModalImportarHato({ onCerrar, onImportado }: Props) {
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [filas, setFilas] = useState<FilaImportacionHato[]>([]);
  const [columnasIgnoradas, setColumnasIgnoradas] = useState<string[]>([]);
  const [vistaPrevia, setVistaPrevia] = useState<ResultadoImportacionHato | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [error, setError] = useState("");

  const seleccionarArchivo = async (archivo: File | undefined) => {
    if (!archivo) return;
    setError("");
    setVistaPrevia(null);
    setNombreArchivo(archivo.name);
    setProcesando(true);
    try {
      const leido = await leerArchivo(archivo);
      if (leido.filas.length === 0) {
        setError("El archivo no trae animales. Verifique que la primera hoja tenga los encabezados de la plantilla.");
        return;
      }
      setFilas(leido.filas);
      setColumnasIgnoradas(leido.columnasIgnoradas);
      setVistaPrevia(await importarHatoGanaderia(leido.filas, false));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo leer el archivo");
    } finally {
      setProcesando(false);
    }
  };

  const confirmar = async () => {
    setProcesando(true);
    setImportando(true);
    setError("");
    try {
      const r = await importarHatoGanaderia(filas, true);
      if (r.confirmado) {
        onImportado(r.animalesImportados);
      } else {
        // Otro usuario cargó algo entre la vista previa y la confirmación.
        setVistaPrevia(r);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar la importación");
    } finally {
      setImportando(false);
      setProcesando(false);
    }
  };

  const sinErrores = vistaPrevia !== null && vistaPrevia.errores.length === 0;
  const etiquetaCampo = (campo: string | null) =>
    COLUMNAS.find(c => c.campo === campo)?.encabezado.replace("*", "") ?? "";

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="apple-glass rounded-3xl p-6 sm:p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-emerald-500/30 text-left space-y-5">
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-white/10">
          <div>
            <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">Importar hato</h3>
            <p className="text-xs text-slate-500 dark:text-white/50 mt-1">
              Carga inicial de los animales que su finca ya tiene. No registra compras ni gastos.
            </p>
          </div>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer" aria-label="Cerrar">
            <IconClose size={20} />
          </button>
        </div>

        {/* Paso 1 y 2 */}
        <div className="grid sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={descargarPlantilla}
            className="flex items-center gap-3 p-4 rounded-2xl border border-slate-300/70 dark:border-white/15 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-colors cursor-pointer text-left"
          >
            <IconDownload size={20} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">1. Descargar plantilla</div>
              <div className="text-[11px] text-slate-500 dark:text-white/50">Excel con columnas, ejemplos e instrucciones</div>
            </div>
          </button>
          <label className="flex items-center gap-3 p-4 rounded-2xl border border-dashed border-emerald-500/50 hover:bg-emerald-500/5 transition-colors cursor-pointer">
            <IconUpload size={20} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-900 dark:text-white">2. Subir archivo</div>
              <div className="text-[11px] text-slate-500 dark:text-white/50 truncate">
                {nombreArchivo || "Excel (.xlsx, .xls) o CSV"}
              </div>
            </div>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              disabled={procesando}
              onChange={e => { seleccionarArchivo(e.target.files?.[0]); e.target.value = ""; }}
            />
          </label>
        </div>

        {procesando && (
          <div className="text-xs font-semibold text-slate-500 dark:text-white/60">
            {importando ? "Importando animales, no cierre esta ventana..." : "Revisando el archivo..."}
          </div>
        )}

        {error && (
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-300 flex items-start gap-2">
            <IconWarning size={16} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {columnasIgnoradas.length > 0 && (
          <div className="text-[11px] text-amber-600 dark:text-amber-400">
            Columnas no reconocidas (se ignoran): {columnasIgnoradas.join(", ")}
          </div>
        )}

        {vistaPrevia && (
          <div className="space-y-4">
            {/* Resumen de lo que se va a cargar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-white/5">
                <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-white/40">Animales en el archivo</div>
                <div className="font-mono font-black text-2xl text-slate-900 dark:text-white">{vistaPrevia.totalFilas}</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-white/5">
                <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-white/40">Preñadas</div>
                <div className="font-mono font-black text-2xl text-slate-900 dark:text-white">{vistaPrevia.preneces}</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-white/5 col-span-2 sm:col-span-1">
                <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-white/40">Filas con error</div>
                <div className={`font-mono font-black text-2xl ${sinErrores ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                  {new Set(vistaPrevia.errores.map(e => e.fila)).size}
                </div>
              </div>
            </div>

            {sinErrores && (
              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-2xl border border-slate-200 dark:border-white/10">
                  <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-white/40 mb-2">Por categoría</div>
                  {Object.entries(vistaPrevia.porTipo).map(([tipo, n]) => (
                    <div key={tipo} className="flex justify-between py-0.5">
                      <span className="text-slate-700 dark:text-white/80">{tipo}</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{n}</span>
                    </div>
                  ))}
                </div>
                <div className="p-3 rounded-2xl border border-slate-200 dark:border-white/10">
                  <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-white/40 mb-2">Por raza</div>
                  {Object.entries(vistaPrevia.porRaza).map(([raza, n]) => (
                    <div key={raza} className="flex justify-between py-0.5">
                      <span className="text-slate-700 dark:text-white/80">{raza}</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{n}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!sinErrores && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-red-600 dark:text-red-300">
                  Corrija estas filas en su Excel y vuelva a subirlo. No se guardó ningún animal.
                </div>
                <div className="max-h-64 overflow-y-auto rounded-2xl border border-red-500/30">
                  <table className="w-full text-xs">
                    <thead className="bg-red-500/10 text-slate-600 dark:text-white/60 sticky top-0">
                      <tr>
                        <th className="p-2.5 text-left w-16">Fila</th>
                        <th className="p-2.5 text-left w-40">Columna</th>
                        <th className="p-2.5 text-left">Qué corregir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                      {vistaPrevia.errores.map((e, i) => (
                        <tr key={i}>
                          <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-white">{e.fila || "-"}</td>
                          <td className="p-2.5 text-slate-600 dark:text-white/70">{etiquetaCampo(e.campo)}</td>
                          <td className="p-2.5 text-slate-800 dark:text-white/90">{e.mensaje}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
          <button
            type="button"
            onClick={onCerrar}
            className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-xs font-semibold cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={!sinErrores || procesando}
            className="px-5 py-2.5 rounded-xl btn-cyber-neon text-white text-xs font-bold shadow-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <IconCheckCircle size={14} />
            <span>{sinErrores ? `Importar ${vistaPrevia!.totalFilas} animales` : "Importar"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
