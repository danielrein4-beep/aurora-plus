import { useState } from "react";
import { crearGuiaMovilizacion, descargarNotaMovilizacionPdf } from "../../api";
import { BOTON, BOTON_SUAVE, INPUT, mensajeError } from "./comun";

export interface DatosNotaMovilizacion {
  animalIds: number[];
  destino: string | null;
  origen: string | null;
  emitidas: { id: number; numeroGuia: string; fecha: string }[];
}

async function abrirPdf(id: number) {
  const blob = await descargarNotaMovilizacionPdf(id);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Nota de movilización para un trato cerrado del mercado: la emite quien vende (los animales
 * salen de su finca) con los mismos animales del trato y la finca compradora como destino.
 * Usa la misma nota que Ganadería (/api/ganaderia/guias-traslado), así queda en su historial.
 */
export default function NotaMovilizacionTrato({ datos, onEmitida }: { datos: DatosNotaMovilizacion; onEmitida: () => void }) {
  const [abierta, setAbierta] = useState(false);
  const [transportista, setTransportista] = useState("");
  const [placa, setPlaca] = useState("");
  const [responsable, setResponsable] = useState("");
  const [guiaOficial, setGuiaOficial] = useState("");
  const [destino, setDestino] = useState(datos.destino ?? "");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emitir = async () => {
    setError(null);
    if (!destino.trim()) { setError("Indica a qué finca van los animales"); return; }
    setEnviando(true);
    try {
      const hoy = new Date();
      const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
      const guia = await crearGuiaMovilizacion({
        fecha,
        origen: datos.origen ?? undefined,
        destino: destino.trim(),
        motivo: "VENTA",
        transportista: transportista.trim() || undefined,
        placaVehiculo: placa.trim() || undefined,
        responsable: responsable.trim() || undefined,
        numeroGuiaOficial: guiaOficial.trim() || undefined,
        animalIds: datos.animalIds,
      });
      setAbierta(false);
      onEmitida();
      await abrirPdf(guia.id);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="pt-3 mt-1 border-t border-stone-200 dark:border-white/10 space-y-2">
      <div className="text-sm font-bold text-stone-900 dark:text-white">Nota de movilización</div>
      {datos.emitidas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {datos.emitidas.map((g) => (
            <button key={g.id} type="button" onClick={() => abrirPdf(g.id).catch((e) => setError(mensajeError(e)))} className={BOTON_SUAVE}>
              Descargar {g.numeroGuia}
            </button>
          ))}
        </div>
      )}
      {!abierta ? (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={datos.emitidas.length ? BOTON_SUAVE : BOTON} onClick={() => setAbierta(true)}>
            {datos.emitidas.length ? "Emitir otra nota" : "Armar nota de movilización"}
          </button>
          <span className="text-xs text-stone-500">
            Con {datos.animalIds.length === 1 ? "el animal" : `los ${datos.animalIds.length} animales`} de este trato, para el traslado a la finca compradora.
          </span>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input className={INPUT} placeholder="Destino (finca compradora)" value={destino} onChange={(e) => setDestino(e.target.value)} />
            <input className={INPUT} placeholder="N° de guía oficial INSAI (si ya la tienes)" value={guiaOficial} onChange={(e) => setGuiaOficial(e.target.value)} />
            <input className={INPUT} placeholder="Transportista" value={transportista} onChange={(e) => setTransportista(e.target.value)} />
            <input className={INPUT} placeholder="Placa del vehículo" value={placa} onChange={(e) => setPlaca(e.target.value)} />
            <input className={`${INPUT} sm:col-span-2`} placeholder="Responsable del traslado" value={responsable} onChange={(e) => setResponsable(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={BOTON} onClick={emitir} disabled={enviando}>{enviando ? "Generando…" : "Generar nota en PDF"}</button>
            <button type="button" className={BOTON_SUAVE} onClick={() => setAbierta(false)} disabled={enviando}>Cancelar</button>
          </div>
        </div>
      )}
      {error && <p className="text-xs text-rose-700">{error}</p>}
    </div>
  );
}
