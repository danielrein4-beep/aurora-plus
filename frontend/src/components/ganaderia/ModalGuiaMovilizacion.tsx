import { useEffect, useState } from "react";
import { IconFileText, IconTruck } from "../../Icons";
import {
  crearGuiaMovilizacion, listarGuiasMovilizacion, descargarNotaMovilizacionPdf,
  type AnimalGanaderia, type GuiaMovilizacionGanaderia,
} from "../../api";
import { abrirPdf, fechaLocalISO } from "../ReportesCampoGanaderia";
import { kg, num, verFecha } from "./formato";
import type { Notificar } from "./tipos";

const MOTIVOS = [
  { valor: "VENTA", etiqueta: "Venta" },
  { valor: "MATADERO", etiqueta: "Matadero" },
  { valor: "FERIA", etiqueta: "Feria o subasta" },
  { valor: "CAMBIO_DE_FINCA", etiqueta: "Cambio de finca" },
  { valor: "TRATAMIENTO_VETERINARIO", etiqueta: "Tratamiento veterinario" },
];

interface Props {
  animales: AnimalGanaderia[];
  /** Animales que ya vienen marcados (p. ej. los de una venta recién hecha). */
  animalIdsIniciales?: number[];
  nombreFinca: string;
  notificar: Notificar;
  onCerrar: () => void;
}

/**
 * Nota de movilización: arma la lista de animales que salen de la finca con los datos del viaje
 * y genera el PDF que acompaña a la guía oficial del INSAI. Muestra las últimas notas emitidas.
 */
export default function ModalGuiaMovilizacion({ animales, animalIdsIniciales, nombreFinca, notificar, onCerrar }: Props) {
  const iniciales = new Set(animalIdsIniciales ?? []);
  // Pueden viajar los animales activos y los que vienen marcados de una venta (ya figuran como vendidos).
  const disponibles = animales.filter(a => a.estado === "ACTIVO" || !a.estado || iniciales.has(a.id));

  const [seleccion, setSeleccion] = useState<Set<number>>(iniciales);
  const [busqueda, setBusqueda] = useState("");
  const [fecha, setFecha] = useState(fechaLocalISO());
  const [numeroGuia, setNumeroGuia] = useState("");
  const [origen, setOrigen] = useState(nombreFinca);
  const [destino, setDestino] = useState("");
  const [motivo, setMotivo] = useState(iniciales.size > 0 ? "VENTA" : "");
  const [transportista, setTransportista] = useState("");
  const [placa, setPlaca] = useState("");
  const [responsable, setResponsable] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [recientes, setRecientes] = useState<GuiaMovilizacionGanaderia[]>([]);

  useEffect(() => {
    listarGuiasMovilizacion().then(g => setRecientes(g.slice(0, 5))).catch(() => {});
  }, []);

  const termino = busqueda.trim().toLowerCase();
  const visibles = termino
    ? disponibles.filter(a => a.arete.toLowerCase().includes(termino) || (a.nombre || "").toLowerCase().includes(termino)
        || (a.lote || "").toLowerCase().includes(termino) || (a.potrero?.nombre || "").toLowerCase().includes(termino))
    : disponibles;
  const elegidos = disponibles.filter(a => seleccion.has(a.id));
  const pesoTotal = elegidos.reduce((s, a) => s + (Number(a.pesoActual) || 0), 0);

  const alternar = (id: number) => setSeleccion(prev => {
    const s = new Set(prev);
    if (s.has(id)) s.delete(id); else s.add(id);
    return s;
  });
  const todosVisiblesMarcados = visibles.length > 0 && visibles.every(a => seleccion.has(a.id));
  const marcarVisibles = () => setSeleccion(prev => {
    const s = new Set(prev);
    visibles.forEach(a => (todosVisiblesMarcados ? s.delete(a.id) : s.add(a.id)));
    return s;
  });

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (seleccion.size === 0) {
      notificar("Marca al menos un animal para la nota de movilización.");
      return;
    }
    setGuardando(true);
    try {
      const guia = await crearGuiaMovilizacion({
        numeroGuiaOficial: numeroGuia.trim() || undefined,
        fecha,
        origen: origen.trim() || undefined,
        destino: destino.trim(),
        motivo: motivo || undefined,
        transportista: transportista.trim() || undefined,
        placaVehiculo: placa.trim().toUpperCase() || undefined,
        responsable: responsable.trim() || undefined,
        animalIds: [...seleccion],
      });
      notificar(`Nota ${guia.numeroGuia} lista: ${seleccion.size} animal${seleccion.size === 1 ? "" : "es"} hacia ${destino.trim()}.`);
      abrirPdf(await descargarNotaMovilizacionPdf(guia.id));
      onCerrar();
    } catch (err) {
      notificar(`No se pudo crear la nota de movilización: ${err instanceof Error ? err.message : "revisa tu conexión"}`);
    } finally {
      setGuardando(false);
    }
  };

  const campo = "w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:border-teal-600 focus:outline-none";
  const etiqueta = "text-xs font-semibold text-slate-600 block mb-1";

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <form onSubmit={guardar} className="w-full max-w-3xl rounded-3xl bg-white border border-slate-200 shadow-xl p-5 sm:p-6 space-y-4 text-left my-auto max-h-[94vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center"><IconTruck size={18} /></span>
            <div>
              <h3 className="font-['Outfit'] font-black text-lg text-slate-900">Nota de movilización</h3>
              <p className="text-xs text-slate-500">Acompaña el traslado junto con la guía oficial del INSAI; no la sustituye.</p>
            </div>
          </div>
          <button type="button" onClick={onCerrar} className="text-slate-400 hover:text-slate-700 cursor-pointer" aria-label="Cerrar">✕</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Datos del viaje */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={etiqueta}>Fecha *</label>
                <input type="date" required value={fecha} onChange={e => setFecha(e.target.value)} className={campo} />
              </div>
              <div>
                <label className={etiqueta}>N° guía INSAI</label>
                <input value={numeroGuia} onChange={e => setNumeroGuia(e.target.value)} placeholder="Si ya la tienes" className={campo} />
              </div>
            </div>
            <div>
              <label className={etiqueta}>Origen</label>
              <input value={origen} onChange={e => setOrigen(e.target.value)} className={campo} />
            </div>
            <div>
              <label className={etiqueta}>Destino *</label>
              <input required value={destino} onChange={e => setDestino(e.target.value)} placeholder="Ej. Matadero Industrial Centro, Barinas" className={campo} />
            </div>
            <div>
              <label className={etiqueta}>Motivo</label>
              <select value={motivo} onChange={e => setMotivo(e.target.value)} className={campo}>
                <option value="">Selecciona...</option>
                {MOTIVOS.map(m => <option key={m.valor} value={m.valor}>{m.etiqueta}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={etiqueta}>Transportista</label>
                <input value={transportista} onChange={e => setTransportista(e.target.value)} placeholder="Nombre o empresa" className={campo} />
              </div>
              <div>
                <label className={etiqueta}>Placa</label>
                <input value={placa} onChange={e => setPlaca(e.target.value)} placeholder="Ej. A12BC3D" className={`${campo} uppercase`} />
              </div>
            </div>
            <div>
              <label className={etiqueta}>Responsable en la finca</label>
              <input value={responsable} onChange={e => setResponsable(e.target.value)} placeholder="Quien entrega los animales" className={campo} />
            </div>
          </div>

          {/* Animales */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-600">Animales que viajan *</label>
              <button type="button" onClick={marcarVisibles} className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 cursor-pointer">
                {todosVisiblesMarcados ? "Desmarcar los mostrados" : `Marcar los mostrados (${visibles.length})`}
              </button>
            </div>
            <input type="search" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por arete, nombre, lote o potrero..." className={campo} />
            <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 p-1.5 space-y-0.5">
              {visibles.length === 0 && <div className="p-3 text-center text-xs text-slate-500">Ningún animal coincide.</div>}
              {visibles.map(a => (
                <label key={a.id} className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer ${seleccion.has(a.id) ? "bg-teal-50 text-slate-900 font-semibold" : "hover:bg-slate-50 text-slate-700"}`}>
                  <span className="flex items-center gap-2 min-w-0">
                    <input type="checkbox" checked={seleccion.has(a.id)} onChange={() => alternar(a.id)} className="accent-teal-700" />
                    <span className="text-teal-800">{a.arete}</span>
                    <span className="truncate">{a.nombre || a.tipoAnimal}{a.potrero?.nombre ? ` · ${a.potrero.nombre}` : ""}</span>
                  </span>
                  <span className="text-[11px] text-slate-500 tabular-nums flex-shrink-0">{kg(Number(a.pesoActual) || null)}</span>
                </label>
              ))}
            </div>
            <div className="text-xs text-right font-semibold text-teal-800">
              {seleccion.size} animal{seleccion.size === 1 ? "" : "es"} · {pesoTotal > 0 ? `${num(pesoTotal)} kg` : "sin peso registrado"}
            </div>
          </div>
        </div>

        {recientes.length > 0 && (
          <div className="border-t border-slate-100 pt-3">
            <div className="text-xs font-semibold text-slate-600 mb-1.5">Últimas notas emitidas</div>
            <div className="space-y-1">
              {recientes.map(g => (
                <div key={g.id} className="flex items-center justify-between gap-2 text-xs text-slate-600">
                  <span className="truncate">
                    {g.numeroGuia} · {verFecha(g.fecha)} · {g.destino || "Sin destino"} · {g.animales.length} animal{g.animales.length === 1 ? "" : "es"}
                    {g.numeroGuiaOficial ? ` · INSAI ${g.numeroGuiaOficial}` : ""}
                  </span>
                  <button
                    type="button"
                    onClick={async () => { try { abrirPdf(await descargarNotaMovilizacionPdf(g.id)); } catch { notificar("No se pudo abrir la nota."); } }}
                    className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:text-teal-900 cursor-pointer flex-shrink-0">
                    <IconFileText size={12} /> PDF
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCerrar} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer">
            Cancelar
          </button>
          <button type="submit" disabled={guardando} className="px-5 py-2 rounded-xl text-sm font-semibold bg-teal-700 hover:bg-teal-800 !text-white cursor-pointer disabled:opacity-50">
            {guardando ? "Generando..." : "Crear nota y abrir PDF"}
          </button>
        </div>
      </form>
    </div>
  );
}
