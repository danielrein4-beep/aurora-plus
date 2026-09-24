import { useEffect, useState } from "react";
import { IconMeat, IconMilk, IconRefresh, IconSyringe } from "../../Icons";
import { crearVacunaGanaderia, aplicarVacunaLoteGanaderia, type AnimalGanaderia, type PotreroGanaderia, type VacunaGanaderia } from "../../api";
import { fechaLocalISO } from "../ReportesCampoGanaderia";
import type { Notificar } from "./tipos";

// Catálogo de referencia de biológicos/antiparasitarios de uso común en ganadería
// venezolana — se ofrece como lista buscable de un clic al agregar al catálogo real
// del tenant (con los días de retiro/refuerzo típicos ya cargados, editables antes
// de guardar); no reemplaza la opción de registrar cualquier otro producto a mano.
const CATALOGO_VACUNAS_SUGERIDAS: { nombre: string; enfermedadPrevenida: string; diasRetiroLeche: number; diasRetiroCarne: number; diasParaRefuerzo: number }[] = [
  { nombre: "Fiebre Aftosa Trivalente", enfermedadPrevenida: "Fiebre Aftosa", diasRetiroLeche: 4, diasRetiroCarne: 21, diasParaRefuerzo: 180 },
  { nombre: "Carbón Bacteridiano y Sintomático (Carbón Combinado)", enfermedadPrevenida: "Carbunco / Carbón Sintomático", diasRetiroLeche: 0, diasRetiroCarne: 21, diasParaRefuerzo: 365 },
  { nombre: "Brucelosis Cepa 19 (Becerras 3-8 meses)", enfermedadPrevenida: "Brucelosis", diasRetiroLeche: 0, diasRetiroCarne: 0, diasParaRefuerzo: 0 },
  { nombre: "Brucelosis Cepa RB51", enfermedadPrevenida: "Brucelosis", diasRetiroLeche: 0, diasRetiroCarne: 0, diasParaRefuerzo: 0 },
  { nombre: "Rabia Paralítica Bovina", enfermedadPrevenida: "Rabia (transmitida por murciélago hematófago)", diasRetiroLeche: 0, diasRetiroCarne: 0, diasParaRefuerzo: 365 },
  { nombre: "Triple Bovina (Clostridiosis)", enfermedadPrevenida: "Clostridiosis (Pierna Negra, Enterotoxemia, Edema Maligno)", diasRetiroLeche: 0, diasRetiroCarne: 21, diasParaRefuerzo: 180 },
  { nombre: "IBR + DVB + PI3 + BRSV (Respiratoria Bovina)", enfermedadPrevenida: "Complejo Respiratorio Bovino", diasRetiroLeche: 4, diasRetiroCarne: 30, diasParaRefuerzo: 180 },
  { nombre: "Leptospirosis (5 vías)", enfermedadPrevenida: "Leptospirosis", diasRetiroLeche: 0, diasRetiroCarne: 21, diasParaRefuerzo: 180 },
  { nombre: "Vitaminas ADE Inyectable", enfermedadPrevenida: "Suplemento — deficiencia de vitaminas A, D y E", diasRetiroLeche: 0, diasRetiroCarne: 0, diasParaRefuerzo: 90 },
  { nombre: "Ivermectina 1% Endectocida", enfermedadPrevenida: "Parásitos internos y externos", diasRetiroLeche: 28, diasRetiroCarne: 35, diasParaRefuerzo: 90 },
  { nombre: "Doramectina 1% Endectocida", enfermedadPrevenida: "Parásitos internos y externos (mayor persistencia que ivermectina)", diasRetiroLeche: 28, diasRetiroCarne: 45, diasParaRefuerzo: 120 },
  { nombre: "Closantel (Antiparasitario Interno)", enfermedadPrevenida: "Fasciola hepática y parásitos internos", diasRetiroLeche: 28, diasRetiroCarne: 30, diasParaRefuerzo: 90 },
  { nombre: "Baño Garrapaticida (Amitraz / Cipermetrina)", enfermedadPrevenida: "Garrapatas y ectoparásitos", diasRetiroLeche: 0, diasRetiroCarne: 0, diasParaRefuerzo: 21 },
];

interface DatosRecordados { lote?: string; veterinario?: string; costo?: number }

const claveRecordados = (tenantId: number) => `aurora_ganaderia_ultima_vacunacion_${tenantId}`;

function leerDatosRecordados(tenantId: number): DatosRecordados {
  try {
    return JSON.parse(localStorage.getItem(claveRecordados(tenantId)) || "{}");
  } catch {
    return {};
  }
}

function recordarDatos(tenantId: number, datos: DatosRecordados) {
  try {
    localStorage.setItem(claveRecordados(tenantId), JSON.stringify(datos));
  } catch {}
}

export interface VacunacionAplicada {
  fecha: string;
  vacunaId: number;
  nombre: string;
  cantidad: number;
}

interface Props {
  animales: AnimalGanaderia[];
  animalesActivos: AnimalGanaderia[];
  potreros: PotreroGanaderia[];
  vacunas: VacunaGanaderia[];
  /** Animal preseleccionado al abrir desde su ficha. */
  animalIdInicial?: number;
  tenantId: number;
  notificar: Notificar;
  onVacunaCreada: (vacuna: VacunaGanaderia) => void;
  onAplicada: (aplicacion: VacunacionAplicada) => void;
  onCerrar: () => void;
}

/**
 * Aplicación de vacunas y desparasitantes a un animal, a varios, a un lote o a un
 * potrero, con el catálogo de la finca (y uno de referencia para agregar de un clic)
 * y los días de retiro de leche y carne de cada producto.
 */
export default function ModalVacunacion({
  animales, animalesActivos, potreros, vacunas, animalIdInicial, tenantId, notificar, onVacunaCreada, onAplicada, onCerrar,
}: Props) {
  // Formulario vacunación (soporte de catálogo real, días de retiro fidedignos y aplicación masiva)
  // Lote, veterinario y costo se recuerdan por finca: en una jornada de vacunación se repiten.
  const recordados = leerDatosRecordados(tenantId);
  const [formVacuna, setFormVacuna] = useState({
    animalId: animalIdInicial ?? animalesActivos[0]?.id ?? 0,
    vacunaId: vacunas[0]?.id ?? 0,
    lote: recordados.lote ?? "",
    veterinario: recordados.veterinario ?? "",
    costo: recordados.costo ?? 0,
  });
  const [vacunacionModo, setVacunacionModo] = useState<"INDIVIDUAL" | "MULTIPLE">("INDIVIDUAL");
  const [animalesVacunaSeleccionados, setAnimalesVacunaSeleccionados] = useState<number[]>([]);
  const [mostrarCrearVacuna, setMostrarCrearVacuna] = useState(false);
  const [busquedaVacunaCatalogo, setBusquedaVacunaCatalogo] = useState("");
  const [nuevaVacunaForm, setNuevaVacunaForm] = useState({
    nombre: "",
    enfermedadPrevenida: "",
    diasRetiroLeche: 0,
    diasRetiroCarne: 0,
    diasParaRefuerzo: 180,
  });

  // Si la vacuna elegida deja de estar en el catálogo, se toma la primera disponible.
  useEffect(() => {
    if (vacunas.length > 0 && !vacunas.some(v => v.id === formVacuna.vacunaId)) {
      setFormVacuna(prev => ({ ...prev, vacunaId: vacunas[0].id }));
    }
  }, [vacunas]);

  // Manejador: Aplicar vacuna (Soporte individual y masivo con verificación de catálogo y tiempos de retiro)
  const handleGuardarVacuna = async (e: React.FormEvent) => {
    e.preventDefault();

    const idsParaAplicar = vacunacionModo === "INDIVIDUAL"
      ? (formVacuna.animalId ? [Number(formVacuna.animalId)] : [])
      : animalesVacunaSeleccionados;

    if (idsParaAplicar.length === 0) {
      notificar("Debes seleccionar al menos un animal para aplicar el tratamiento sanitario.");
      return;
    }
    if (!formVacuna.vacunaId) {
      notificar("Selecciona o crea primero una vacuna del catálogo antes de aplicarla.");
      return;
    }

    const vacunaSeleccionada = vacunas.find(v => v.id === Number(formVacuna.vacunaId));

    try {
      const fechaAplicacion = fechaLocalISO();
      await aplicarVacunaLoteGanaderia(tenantId, {
        animalIds: idsParaAplicar,
        vacunaId: Number(formVacuna.vacunaId),
        fechaAplicacion,
        lote: formVacuna.lote,
        veterinarioResponsable: formVacuna.veterinario,
        costo: Number(formVacuna.costo),
      });

      const retiroMsg = [];
      if (vacunaSeleccionada?.diasRetiroLeche && vacunaSeleccionada.diasRetiroLeche > 0) {
        retiroMsg.push(`Retiro leche: ${vacunaSeleccionada.diasRetiroLeche}d`);
      }
      if (vacunaSeleccionada?.diasRetiroCarne && vacunaSeleccionada.diasRetiroCarne > 0) {
        retiroMsg.push(`Retiro carne: ${vacunaSeleccionada.diasRetiroCarne}d`);
      }
      const detalleRetiro = retiroMsg.length > 0 ? ` (${retiroMsg.join(" • ")})` : " (Sin tiempo de retiro obligatorio)";

      notificar(`Vacuna '${vacunaSeleccionada?.nombre || "aplicada"}' aplicada a ${idsParaAplicar.length} animal(es)${detalleRetiro}. Alertas sanitarias actualizadas.`);
      onAplicada({
        fecha: fechaAplicacion,
        vacunaId: Number(formVacuna.vacunaId),
        nombre: vacunaSeleccionada?.nombre || "Vacuna",
        cantidad: idsParaAplicar.length,
      });
      recordarDatos(tenantId, { lote: formVacuna.lote, veterinario: formVacuna.veterinario, costo: Number(formVacuna.costo) });
    } catch (err: any) {
      const msg = err?.message || "Revisa tu conexión e inténtalo de nuevo";
      notificar(`No se pudo registrar el tratamiento sanitario: ${msg}`);
      return;
    }

    onCerrar();
  };

  // Agrega al catálogo real del tenant una vacuna del listado de referencia con un clic
  // (ya trae días de retiro/refuerzo típicos precargados, sin tener que teclearlos).
  const handleAgregarVacunaDesdeCatalogoSugerido = async (item: typeof CATALOGO_VACUNAS_SUGERIDAS[number]) => {
    if (vacunas.some(v => v.nombre.toLowerCase() === item.nombre.toLowerCase())) {
      const existente = vacunas.find(v => v.nombre.toLowerCase() === item.nombre.toLowerCase())!;
      setFormVacuna(prev => ({ ...prev, vacunaId: existente.id }));
      notificar(`'${item.nombre}' ya estaba en tu catálogo — seleccionada.`);
      return;
    }
    try {
      const creada = await crearVacunaGanaderia(tenantId, {
        nombre: item.nombre,
        enfermedadPrevenida: item.enfermedadPrevenida,
        diasRetiroLeche: item.diasRetiroLeche,
        diasRetiroCarne: item.diasRetiroCarne,
        diasParaRefuerzo: item.diasParaRefuerzo,
      });
      onVacunaCreada(creada);
      setFormVacuna(prev => ({ ...prev, vacunaId: creada.id }));
      setBusquedaVacunaCatalogo("");
      notificar(`'${creada.nombre}' agregada a tu catálogo y seleccionada.`);
    } catch {
      notificar(`No se pudo agregar '${item.nombre}' al catálogo.`);
    }
  };

  // Manejador: Crear nueva vacuna en catálogo in-situ
  const handleCrearNuevaVacunaInSitu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaVacunaForm.nombre.trim()) return;

    try {
      const creada = await crearVacunaGanaderia(tenantId, {
        nombre: nuevaVacunaForm.nombre.trim(),
        enfermedadPrevenida: nuevaVacunaForm.enfermedadPrevenida.trim() || undefined,
        diasRetiroLeche: Number(nuevaVacunaForm.diasRetiroLeche) || 0,
        diasRetiroCarne: Number(nuevaVacunaForm.diasRetiroCarne) || 0,
        diasParaRefuerzo: Number(nuevaVacunaForm.diasParaRefuerzo) || 0,
      });

      onVacunaCreada(creada);
      setFormVacuna(prev => ({ ...prev, vacunaId: creada.id }));
      setMostrarCrearVacuna(false);
      setNuevaVacunaForm({
        nombre: "",
        enfermedadPrevenida: "",
        diasRetiroLeche: 0,
        diasRetiroCarne: 0,
        diasParaRefuerzo: 180,
      });
      notificar(`Vacuna '${creada.nombre}' guardada en el catálogo oficial.`);
    } catch {
      notificar("No se pudo registrar la nueva vacuna en el catálogo.");
    }
  };

    const vacunaSel = vacunas.find(v => v.id === Number(formVacuna.vacunaId));
    const lotesUnicos = Array.from(new Set(animales.map(a => a.lote).filter(Boolean))) as string[];
    const totalSeleccionados = vacunacionModo === "INDIVIDUAL"
      ? (formVacuna.animalId ? 1 : 0)
      : animalesVacunaSeleccionados.length;

    return (
      <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
        <div className="apple-glass rounded-3xl p-5 sm:p-7 max-w-xl w-full border border-emerald-500/40 text-left space-y-4 my-auto max-h-[92vh] flex flex-col font-['Inter']">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400"><IconSyringe size={20} /></span>
              <div>
                <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
                  Aplicar Tratamiento Sanitario / Biológico
                </h3>
                <p className="text-[11px] text-slate-400">
                  Cálculo estricto de tiempos de retiro y registro individual o en lote.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onCerrar()}
              className="text-slate-400 hover:text-white cursor-pointer text-base">
              ✕
            </button>
          </div>

          <form onSubmit={handleGuardarVacuna} className="space-y-4 text-xs overflow-y-auto pr-1">
            {/* 1. SELECCIÓN DE ANIMAL(ES): INDIVIDUAL VS LOTE */}
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-300">Modo de Aplicación</label>
                <div className="inline-flex rounded-xl bg-slate-900 p-1 border border-white/10">
                  <button
                    type="button"
                    onClick={() => setVacunacionModo("INDIVIDUAL")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      vacunacionModo === "INDIVIDUAL"
                        ? "bg-emerald-500 text-white shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Individual (1 animal)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVacunacionModo("MULTIPLE");
                      if (animalesVacunaSeleccionados.length === 0 && formVacuna.animalId) {
                        setAnimalesVacunaSeleccionados([Number(formVacuna.animalId)]);
                      }
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      vacunacionModo === "MULTIPLE"
                        ? "bg-emerald-500 text-white shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Múltiple / Lote ({animalesVacunaSeleccionados.length})
                  </button>
                </div>
              </div>

              {vacunacionModo === "INDIVIDUAL" ? (
                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Animal a Tratar *</label>
                  <select
                    value={formVacuna.animalId}
                    onChange={e => setFormVacuna({ ...formVacuna, animalId: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-bold text-xs"
                  >
                    {animalesActivos.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.arete} - {a.nombre || a.tipoAnimal} ({a.raza || "Bovino"}) {a.lote ? `[${a.lote}]` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setAnimalesVacunaSeleccionados(animalesActivos.map(a => a.id))}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold hover:bg-emerald-500/30 cursor-pointer"
                    >
                      Todos ({animalesActivos.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnimalesVacunaSeleccionados([])}
                      className="px-2.5 py-1 rounded-lg bg-white/5 text-slate-400 border border-white/10 text-[11px] hover:text-white cursor-pointer"
                    >
                      Desmarcar
                    </button>

                    {/* Filtros rápidos por Lote */}
                    {lotesUnicos.map(loteNombre => (
                      <button
                        key={loteNombre}
                        type="button"
                        onClick={() => {
                          const idsLote = animalesActivos.filter(a => a.lote === loteNombre).map(a => a.id);
                          setAnimalesVacunaSeleccionados(prev => Array.from(new Set([...prev, ...idsLote])));
                        }}
                        className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-bold hover:bg-purple-500/30 cursor-pointer"
                      >
                        + Lote: {loteNombre}
                      </button>
                    ))}

                    {/* Filtros rápidos por Potrero */}
                    {potreros.slice(0, 3).map(pot => (
                      <button
                        key={pot.id}
                        type="button"
                        onClick={() => {
                          const idsPot = animalesActivos.filter(a => a.potrero?.id === pot.id).map(a => a.id);
                          setAnimalesVacunaSeleccionados(prev => Array.from(new Set([...prev, ...idsPot])));
                        }}
                        className="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[11px] font-bold hover:bg-sky-500/30 cursor-pointer"
                      >
                        + Potrero: {pot.nombre}
                      </button>
                    ))}
                  </div>

                  {/* Lista scrolleable de animales seleccionables */}
                  <div className="max-h-36 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/70 p-2 space-y-1">
                    {animalesActivos.map(a => {
                      const isSel = animalesVacunaSeleccionados.includes(a.id);
                      return (
                        <label
                          key={a.id}
                          className={`flex items-center justify-between p-1.5 rounded-lg text-[11px] cursor-pointer transition-colors ${
                            isSel ? "bg-emerald-500/20 text-white font-bold" : "hover:bg-white/5 text-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSel}
                              onChange={e => {
                                if (e.target.checked) {
                                  setAnimalesVacunaSeleccionados(prev => [...prev, a.id]);
                                } else {
                                  setAnimalesVacunaSeleccionados(prev => prev.filter(id => id !== a.id));
                                }
                              }}
                              className="rounded text-emerald-500 focus:ring-0"
                            />
                            <span className="font-mono text-emerald-400">{a.arete}</span>
                            <span>{a.nombre || a.tipoAnimal}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">{a.lote || a.potrero?.nombre || ""}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="text-[11px] text-right font-bold text-emerald-400">
                    {animalesVacunaSeleccionados.length} de {animalesActivos.length} animales seleccionados
                  </div>
                </div>
              )}
            </div>

            {/* 2. CATÁLOGO DE VACUNAS CON DÍAS DE RETIRO REALES */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-300 block">Fármaco / Biológico del Catálogo *</label>
                <button
                  type="button"
                  onClick={() => setMostrarCrearVacuna(!mostrarCrearVacuna)}
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                >
                  {mostrarCrearVacuna ? "Cerrar creación" : "+ Nueva Vacuna en Catálogo"}
                </button>
              </div>

              {/* Buscador de vacunas/antiparasitarios de uso común — agrega al catálogo real con un clic */}
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    value={busquedaVacunaCatalogo}
                    onChange={e => setBusquedaVacunaCatalogo(e.target.value)}
                    placeholder="Buscar vacuna o antiparasitario común (ej. Aftosa, Ivermectina, Brucelosis...)"
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs placeholder:text-slate-500"
                  />
                </div>
                {busquedaVacunaCatalogo.trim() && (
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/60 divide-y divide-white/5">
                    {CATALOGO_VACUNAS_SUGERIDAS.filter(v =>
                      v.nombre.toLowerCase().includes(busquedaVacunaCatalogo.toLowerCase()) ||
                      v.enfermedadPrevenida.toLowerCase().includes(busquedaVacunaCatalogo.toLowerCase())
                    ).length === 0 ? (
                      <div className="p-3 text-[11px] text-slate-400 text-center">
                        No hay coincidencias en el catálogo de referencia — usa "+ Nueva Vacuna en Catálogo" para registrar un producto distinto.
                      </div>
                    ) : (
                      CATALOGO_VACUNAS_SUGERIDAS.filter(v =>
                        v.nombre.toLowerCase().includes(busquedaVacunaCatalogo.toLowerCase()) ||
                        v.enfermedadPrevenida.toLowerCase().includes(busquedaVacunaCatalogo.toLowerCase())
                      ).map(item => (
                        <button
                          key={item.nombre}
                          type="button"
                          onClick={() => handleAgregarVacunaDesdeCatalogoSugerido(item)}
                          className="w-full text-left p-2.5 hover:bg-emerald-500/10 cursor-pointer transition-colors flex items-center justify-between gap-2"
                        >
                          <div>
                            <div className="text-xs font-bold text-white">{item.nombre}</div>
                            <div className="text-[10px] text-slate-400">{item.enfermedadPrevenida}</div>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-400 shrink-0">
                            Retiro leche {item.diasRetiroLeche}d · carne {item.diasRetiroCarne}d
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Sub-formulario in-situ para crear vacuna nueva */}
              {mostrarCrearVacuna ? (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-2.5">
                  <div className="text-[11px] font-bold text-emerald-300">Registrar Nuevo Biológico en Catálogo</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 block mb-1 text-[10px]">Nombre Comercial / Biológico *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Cydectin / Vacuna Antirrábica"
                        value={nuevaVacunaForm.nombre}
                        onChange={e => setNuevaVacunaForm({ ...nuevaVacunaForm, nombre: e.target.value })}
                        className="w-full p-2 rounded-lg bg-slate-900 border border-white/15 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1 text-[10px]">Enfermedad Prevenida</label>
                      <input
                        type="text"
                        placeholder="Ej. Rabia, Aftosa, Parásitos"
                        value={nuevaVacunaForm.enfermedadPrevenida}
                        onChange={e => setNuevaVacunaForm({ ...nuevaVacunaForm, enfermedadPrevenida: e.target.value })}
                        className="w-full p-2 rounded-lg bg-slate-900 border border-white/15 text-white text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-rose-400 block mb-1 text-[10px] font-bold">Retiro Leche (días)</label>
                      <input
                        type="number"
                        onFocus={e => e.target.select()}
                        min="0"
                        value={nuevaVacunaForm.diasRetiroLeche}
                        onChange={e => setNuevaVacunaForm({ ...nuevaVacunaForm, diasRetiroLeche: Number(e.target.value) })}
                        className="w-full p-2 rounded-lg bg-slate-900 border border-rose-500/30 text-rose-300 font-mono font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-amber-400 block mb-1 text-[10px] font-bold">Retiro Carne (días)</label>
                      <input
                        type="number"
                        onFocus={e => e.target.select()}
                        min="0"
                        value={nuevaVacunaForm.diasRetiroCarne}
                        onChange={e => setNuevaVacunaForm({ ...nuevaVacunaForm, diasRetiroCarne: Number(e.target.value) })}
                        className="w-full p-2 rounded-lg bg-slate-900 border border-amber-500/30 text-amber-300 font-mono font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-sky-400 block mb-1 text-[10px] font-bold">Refuerzo (días)</label>
                      <input
                        type="number"
                        onFocus={e => e.target.select()}
                        min="0"
                        value={nuevaVacunaForm.diasParaRefuerzo}
                        onChange={e => setNuevaVacunaForm({ ...nuevaVacunaForm, diasParaRefuerzo: Number(e.target.value) })}
                        className="w-full p-2 rounded-lg bg-slate-900 border border-sky-500/30 text-sky-300 font-mono font-bold text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleCrearNuevaVacunaInSitu}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow"
                    >
                      Guardar y Seleccionar
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <select
                    value={formVacuna.vacunaId}
                    onChange={e => setFormVacuna({ ...formVacuna, vacunaId: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-emerald-500/30 text-white font-bold text-xs"
                  >
                    {vacunas.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.nombre} — [Retiro Leche: {v.diasRetiroLeche ?? 0}d | Carne: {v.diasRetiroCarne ?? 0}d | Refuerzo: {v.diasParaRefuerzo ?? 0}d]
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Ficha técnica de seguridad de la vacuna seleccionada */}
              {vacunaSel && (
                <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                  <div className={`p-2 rounded-xl border text-center ${
                    (vacunaSel.diasRetiroLeche && vacunaSel.diasRetiroLeche > 0)
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  }`}>
                    <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1"><IconMilk size={10} /> Retiro Leche</span>
                    <span className="font-bold font-mono text-xs">{vacunaSel.diasRetiroLeche ?? 0} días</span>
                  </div>

                  <div className={`p-2 rounded-xl border text-center ${
                    (vacunaSel.diasRetiroCarne && vacunaSel.diasRetiroCarne > 0)
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  }`}>
                    <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1"><IconMeat size={10} /> Retiro Carne</span>
                    <span className="font-bold font-mono text-xs">{vacunaSel.diasRetiroCarne ?? 0} días</span>
                  </div>

                  <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-300 text-center">
                    <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1"><IconRefresh size={10} /> Próx. Refuerzo</span>
                    <span className="font-bold font-mono text-xs">{vacunaSel.diasParaRefuerzo ?? 0} días</span>
                  </div>
                </div>
              )}
            </div>

            {/* 3. DATOS DE LOTE, COSTO Y RESPONSABLE */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Número de Lote del Biológico</label>
                <input
                  type="text"
                  value={formVacuna.lote}
                  onChange={e => setFormVacuna({ ...formVacuna, lote: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono"
                  placeholder="Ej. B-2026-09"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Costo Total Estimado (USD)</label>
                <input
                  type="number"
                  onFocus={e => e.target.select()}
                  step="0.1"
                  min="0"
                  placeholder="0,00"
                  value={formVacuna.costo || ""}
                  onChange={e => setFormVacuna({ ...formVacuna, costo: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Médico Veterinario / Técnico Responsable</label>
              <input
                type="text"
                value={formVacuna.veterinario}
                onChange={e => setFormVacuna({ ...formVacuna, veterinario: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white"
                placeholder="Ej. Dr. Carlos Mendoza MV"
              />
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400">
                Se aplicará a <strong>{totalSeleccionados}</strong> animal(es).
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onCerrar()}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer">
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-cyber-neon text-white font-bold px-6 py-2 rounded-xl cursor-pointer shadow-lg shadow-emerald-500/20">
                  Aplicar a {totalSeleccionados} Animal(es)
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
}
