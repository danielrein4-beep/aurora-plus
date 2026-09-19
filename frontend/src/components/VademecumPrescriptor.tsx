import React, { useState, useMemo } from "react";
import { VADEMECUM_CLINICO, type MedicamentoVademecum } from "../data/vademecum";

export interface ItemRecipePrescrito {
  id: string;
  medicamento: string;
  nombreGenerico: string;
  presentacion: string;
  via: string;
  posologia: string;
  duracionDias: number;
  indicacionesEspeciales: string;
  alertaInteraccion?: string;
}

interface Props {
  alergiasPaciente?: string;
  itemsRecipe: ItemRecipePrescrito[];
  onChangeItems: (items: ItemRecipePrescrito[]) => void;
  onGenerarPdfRecipe?: () => void;
  onEnviarWhatsAppRecipe?: () => void;
}

const CATEGORIAS_FILTRO = [
  "Todos",
  "Antibioticos",
  "Analgesicos / AINEs",
  "Cardiovascular",
  "Gastroenterologia",
  "Metabolismo",
  "Respiratorio",
  "Corticoides",
];

export const VademecumPrescriptor: React.FC<Props> = ({
  alergiasPaciente = "",
  itemsRecipe,
  onChangeItems,
  onGenerarPdfRecipe,
  onEnviarWhatsAppRecipe,
}) => {
  const [busqueda, setBusqueda] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("Todos");
  const [medSeleccionado, setMedSeleccionado] = useState<MedicamentoVademecum | null>(null);

  // Formulario para anadir medicamento seleccionado al recipe
  const [posologiaPersonalizada, setPosologiaPersonalizada] = useState("");
  const [presentacionPersonalizada, setPresentacionPersonalizada] = useState("");
  const [viaPersonalizada, setViaPersonalizada] = useState<string>("Oral");
  const [duracionPersonalizada, setDuracionPersonalizada] = useState(7);
  const [indicacionesPersonalizadas, setIndicacionesPersonalizadas] = useState("");

  // Modo medicamento libre / manual
  const [modoManual, setModoManual] = useState(false);
  const [nombreManual, setNombreManual] = useState("");

  // Filtrado reactivo del vademecum
  const medicamentosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return VADEMECUM_CLINICO.filter((m) => {
      const matchCat =
        categoriaSeleccionada === "Todos" ||
        (categoriaSeleccionada === "Antibioticos" && m.categoria.includes("Antibiotico")) ||
        (categoriaSeleccionada === "Analgesicos / AINEs" && (m.categoria.includes("Analgesico") || m.categoria.includes("AINE"))) ||
        (categoriaSeleccionada === "Cardiovascular" && (m.categoria.includes("Antihipertensivo") || m.categoria.includes("Cardiovascular") || m.categoria.includes("Estatina"))) ||
        (categoriaSeleccionada === "Gastroenterologia" && (m.categoria.includes("Inhibidor") || m.categoria.includes("Antiemetico") || m.categoria.includes("Antiespasmodico"))) ||
        (categoriaSeleccionada === "Metabolismo" && (m.categoria.includes("Antidiabetico") || m.categoria.includes("Tiroidea"))) ||
        (categoriaSeleccionada === "Respiratorio" && (m.categoria.includes("Antihistaminico") || m.categoria.includes("Broncodilatador"))) ||
        (categoriaSeleccionada === "Corticoides" && m.categoria.includes("Corticoide"));

      if (!matchCat) return false;
      if (!q) return true;

      return (
        m.nombreGenerico.toLowerCase().includes(q) ||
        m.nombresComerciales.toLowerCase().includes(q) ||
        m.indicaciones.toLowerCase().includes(q) ||
        m.categoria.toLowerCase().includes(q)
      );
    });
  }, [busqueda, categoriaSeleccionada]);

  // Detector de alerta de alergias
  const verificarAlergia = (med: MedicamentoVademecum | string): string | null => {
    const alergias = alergiasPaciente.toLowerCase();
    if (!alergias || alergias.includes("niega") || alergias.includes("ninguna")) return null;

    const nombre = typeof med === "string" ? med.toLowerCase() : (med.nombreGenerico + " " + med.categoria).toLowerCase();

    if ((alergias.includes("penicilina") || alergias.includes("betalactam")) && (nombre.includes("amoxicilina") || nombre.includes("penicilina") || nombre.includes("ampicilina"))) {
      return "ALERTA CRITICA: El paciente tiene alergia registrada a Penicilina / Betalactamicos.";
    }
    if ((alergias.includes("aine") || alergias.includes("aspirina") || alergias.includes("ibuprofeno")) && (nombre.includes("ibuprofeno") || nombre.includes("diclofenac") || nombre.includes("ketoprofeno") || nombre.includes("meloxicam") || nombre.includes("dexketoprofeno"))) {
      return "ALERTA CRITICA: El paciente tiene alergia registrada a AINEs / Acido Acetilsalicilico.";
    }
    if (alergias.includes("sulfa") && nombre.includes("sulfa")) {
      return "ALERTA: El paciente registra hipersensibilidad a Sulfonamidas.";
    }
    return null;
  };

  const handleSeleccionarMed = (med: MedicamentoVademecum) => {
    setMedSeleccionado(med);
    setPresentacionPersonalizada(med.presentacion);
    setViaPersonalizada(med.via);
    setPosologiaPersonalizada(med.posologiaSugerida);
    setIndicacionesPersonalizadas(med.advertencias || "");
    setDuracionPersonalizada(7);
  };

  const handleAgregarAlRecipe = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (modoManual) {
      if (!nombreManual.trim() || !posologiaPersonalizada.trim()) return;
      const nuevo: ItemRecipePrescrito = {
        id: "man_" + Date.now(),
        medicamento: nombreManual.trim(),
        nombreGenerico: nombreManual.trim(),
        presentacion: presentacionPersonalizada.trim() || "Segun indicacion",
        via: viaPersonalizada,
        posologia: posologiaPersonalizada.trim() || "1 toma segun horario",
        duracionDias: duracionPersonalizada,
        indicacionesEspeciales: indicacionesPersonalizadas.trim(),
        alertaInteraccion: verificarAlergia(nombreManual) || undefined,
      };
      onChangeItems([...itemsRecipe, nuevo]);
      setModoManual(false);
      setNombreManual("");
      setPosologiaPersonalizada("");
      setIndicacionesPersonalizadas("");
    } else if (medSeleccionado) {
      if (!(posologiaPersonalizada || medSeleccionado.posologiaSugerida || "").trim()) return;
      const nuevo: ItemRecipePrescrito = {
        id: medSeleccionado.id + "_" + Date.now(),
        medicamento: `${medSeleccionado.nombreGenerico} (${medSeleccionado.nombresComerciales.split(",")[0].trim()})`,
        nombreGenerico: medSeleccionado.nombreGenerico,
        presentacion: presentacionPersonalizada || medSeleccionado.presentacion,
        via: viaPersonalizada,
        posologia: posologiaPersonalizada || medSeleccionado.posologiaSugerida,
        duracionDias: duracionPersonalizada,
        indicacionesEspeciales: indicacionesPersonalizadas || medSeleccionado.advertencias,
        alertaInteraccion: verificarAlergia(medSeleccionado) || undefined,
      };
      onChangeItems([...itemsRecipe, nuevo]);
      setMedSeleccionado(null);
    }
  };

  const handleQuitarItem = (id: string) => {
    onChangeItems(itemsRecipe.filter((it) => it.id !== id));
  };

  return (
    <div className="space-y-4 text-left">
      {/* Cabecera & Alertas de Alergia del Paciente */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse"></span>
            <h4 className="font-['Outfit'] font-black text-slate-900 dark:text-white text-base">
              Vademecum & Prescripcion Farmacologica Asistida
            </h4>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Busqueda instantanea de principios activos, presentaciones comerciales, dosificacion y alertas de seguridad.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setModoManual(!modoManual);
              setMedSeleccionado(null);
            }}
            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            {modoManual ? "Ver Vademecum" : "+ Farmaco Libre"}
          </button>
        </div>
      </div>

      {/* Banner de Advertencia si el Paciente tiene Alergias */}
      {alergiasPaciente && !alergiasPaciente.toLowerCase().includes("niega") && !alergiasPaciente.toLowerCase().includes("ninguna") && (
        <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center gap-3 text-xs text-amber-800 dark:text-amber-300">
          <svg className="w-5 h-5 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <span className="font-bold block">Alergias Conocidas del Paciente:</span>
            <span>{alergiasPaciente}</span>
          </div>
        </div>
      )}

      {/* Formulario de Prescripcion Manual — <div>, NUNCA <form>: este componente ya vive
          dentro del <form> de la consulta médica (handleGuardarSolo) y HTML no permite
          formularios anidados. Un <form> aquí hacía que el navegador reordenara el árbol y
          el botón "Agregar al Recipe" terminara disparando el submit del formulario externo
          (guardaba la consulta a medias y sacaba al médico de la pantalla). */}
      {modoManual && (
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-teal-500/30 shadow-sm space-y-3">
          <div className="font-bold text-xs text-teal-600 dark:text-teal-400">Prescribir Medicamento No Listado / Formula Magistral:</div>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div className="sm:col-span-6">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Medicamento y Concentracion *</label>
              <input
                type="text"
                required
                placeholder="Ej: Trimetoprim + Sulfametoxazol 800/160 mg"
                value={nombreManual}
                onChange={(e) => setNombreManual(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Presentacion</label>
              <input
                type="text"
                placeholder="Comprimidos / Jarabe / Ampolla"
                value={presentacionPersonalizada}
                onChange={(e) => setPresentacionPersonalizada(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Via</label>
              <select
                value={viaPersonalizada}
                onChange={(e) => setViaPersonalizada(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              >
                <option value="Oral">Oral</option>
                <option value="Intramuscular">Intramuscular</option>
                <option value="Intravenosa">Intravenosa</option>
                <option value="Sublingual">Sublingual</option>
                <option value="Topica">Topica</option>
                <option value="Inhalatoria">Inhalatoria</option>
                <option value="Oftalmica">Oftalmica</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div className="sm:col-span-8">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Posologia e Intervalo *</label>
              <input
                type="text"
                required
                placeholder="Ej: Tomar 1 comprimido cada 12 horas despues de comida"
                value={posologiaPersonalizada}
                onChange={(e) => setPosologiaPersonalizada(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div className="sm:col-span-4">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Duracion (Dias)</label>
              <input
                type="number"
                min="1"
                max="90"
                value={duracionPersonalizada}
                onChange={(e) => setDuracionPersonalizada(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-bold"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setModoManual(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => handleAgregarAlRecipe()}
              disabled={!nombreManual.trim() || !posologiaPersonalizada.trim()}
              className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Agregar al Recipe
            </button>
          </div>
        </div>
      )}

      {/* Buscador y Filtro del Vademecum */}
      {!modoManual && !medSeleccionado && (
        <div className="space-y-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por principio activo, nombre comercial (ej. Amoxil, Atamel, Augmentin, Lipitor) o indicacion..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 shadow-sm"
            />
            <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Categorias Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {CATEGORIAS_FILTRO.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoriaSeleccionada(cat)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                  categoriaSeleccionada === cat
                    ? "bg-teal-500 text-slate-950 shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grid de Medicamentos del Vademecum */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
            {medicamentosFiltrados.slice(0, 16).map((med) => {
              const alerta = verificarAlergia(med);
              return (
                <div
                  key={med.id}
                  onClick={() => handleSeleccionarMed(med)}
                  className={`p-3 rounded-2xl border text-left cursor-pointer transition flex flex-col justify-between gap-1 shadow-sm hover:scale-[1.01] ${
                    alerta
                      ? "bg-rose-500/10 border-rose-500/40 hover:border-rose-500"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-teal-500/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-['Outfit'] font-black text-xs text-slate-900 dark:text-white block">
                        {med.nombreGenerico}
                      </span>
                      <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold block">
                        {med.nombresComerciales}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                      {med.via}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                    {med.presentacion} &bull; {med.posologiaSugerida}
                  </p>

                  {alerta && (
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                      {alerta}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal / Panel de Dosificacion del Medicamento Seleccionado */}
      {medSeleccionado && (
        <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-teal-500/40 shadow-lg space-y-3 animate-fade-in">
          <div className="flex items-start justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400 block">
                {medSeleccionado.categoria}
              </span>
              <h5 className="font-['Outfit'] font-black text-slate-900 dark:text-white text-sm">
                {medSeleccionado.nombreGenerico} ({medSeleccionado.nombresComerciales})
              </h5>
            </div>
            <button
              type="button"
              onClick={() => setMedSeleccionado(null)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs font-bold"
            >
              &times; Cerrar
            </button>
          </div>

          {verificarAlergia(medSeleccionado) && (
            <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500 text-rose-700 dark:text-rose-300 text-xs font-bold">
              {verificarAlergia(medSeleccionado)}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
            <div className="sm:col-span-6">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Presentacion Seleccionada</label>
              <input
                type="text"
                value={presentacionPersonalizada}
                onChange={(e) => setPresentacionPersonalizada(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Via</label>
              <select
                value={viaPersonalizada}
                onChange={(e) => setViaPersonalizada(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-bold"
              >
                <option value="Oral">Oral</option>
                <option value="Intramuscular">Intramuscular</option>
                <option value="Intravenosa">Intravenosa</option>
                <option value="Sublingual">Sublingual</option>
                <option value="Topica">Topica</option>
                <option value="Inhalatoria">Inhalatoria</option>
                <option value="Oftalmica">Oftalmica</option>
              </select>
            </div>
            <div className="sm:col-span-3">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Duracion (Dias)</label>
              <input
                type="number"
                min="1"
                max="90"
                value={duracionPersonalizada}
                onChange={(e) => setDuracionPersonalizada(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-bold text-center"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Posologia e Instrucciones para el Paciente *</label>
            <textarea
              rows={2}
              value={posologiaPersonalizada}
              onChange={(e) => setPosologiaPersonalizada(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-slate-700 dark:text-slate-300 space-y-0.5">
            <div><span className="font-bold text-amber-600 dark:text-amber-400">Contraindicaciones:</span> {medSeleccionado.contraindicaciones}</div>
            <div><span className="font-bold text-amber-600 dark:text-amber-400">Precauciones:</span> {medSeleccionado.advertencias}</div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setMedSeleccionado(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => handleAgregarAlRecipe()}
              disabled={!(posologiaPersonalizada || medSeleccionado.posologiaSugerida || "").trim()}
              className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black shadow-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Agregar al Recipe
            </button>
          </div>
        </div>
      )}

      {/* Lista del Recipe Medico Actual */}
      <div className="p-4 rounded-3xl bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="font-['Outfit'] font-black text-slate-900 dark:text-white text-sm">
              Recipe Medico (Rp / Prescripciones: {itemsRecipe.length})
            </span>
          </div>

          {itemsRecipe.length > 0 && (
            <div className="flex items-center gap-2">
              {onGenerarPdfRecipe && (
                <button
                  type="button"
                  onClick={onGenerarPdfRecipe}
                  className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Imprimir / PDF Recipe</span>
                </button>
              )}

              {onEnviarWhatsAppRecipe && (
                <button
                  type="button"
                  onClick={onEnviarWhatsAppRecipe}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>WhatsApp Recipe</span>
                </button>
              )}
            </div>
          )}
        </div>

        {itemsRecipe.length === 0 ? (
          <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-400">
            No hay farmacos prescritos aun. Busca en el vademecum superior o agrega un farmaco libre para componer el recipe del paciente.
          </div>
        ) : (
          <div className="space-y-2">
            {itemsRecipe.map((item, idx) => (
              <div
                key={item.id}
                className="p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-400 font-bold flex items-center justify-center text-[11px] shrink-0">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {item.medicamento}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">
                        {item.presentacion} &bull; {item.via}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                      <span className="font-semibold text-teal-600 dark:text-teal-400">Indicacion:</span> {item.posologia} &bull; <span className="font-semibold">Por:</span> {item.duracionDias} dias.
                    </p>
                    {item.alertaInteraccion && (
                      <span className="text-[10px] font-bold text-rose-500 block mt-0.5">
                        {item.alertaInteraccion}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleQuitarItem(item.id)}
                  className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 font-bold text-xs p-1"
                  title="Quitar farmaco"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
