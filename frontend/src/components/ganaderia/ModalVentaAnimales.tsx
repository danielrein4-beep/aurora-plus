import { useState } from "react";
import { IconCheckCircle, IconDownload, IconTag } from "../../Icons";
import {
  registrarPesoGanaderia, registrarVentaGanaderia, descargarNotaEntregaVentaAnimalPdf,
  type AnimalGanaderia,
} from "../../api";
import { fechaLocalISO } from "../ReportesCampoGanaderia";

export type ModoVenta = "INDIVIDUAL" | "MULTIPLE";

interface Props {
  modoInicial: ModoVenta;
  animales: AnimalGanaderia[];
  tenantId: number;
  notificar: (msg: string) => void;
  /** Animales ya vendidos en el backend: el padre los marca VENDIDO en su lista. */
  onVendidos: (ids: number[]) => void;
  onCerrar: () => void;
}

/**
 * Despacho por venta o beneficio, de un animal o de un lote. Cada animal del lote
 * trae su peso del sistema y se puede corregir con el de báscula; ese peso queda
 * guardado como pesaje. Al terminar ofrece la nota de entrega en PDF.
 */
export default function ModalVentaAnimales({ modoInicial, animales, tenantId, notificar, onVendidos, onCerrar }: Props) {
  // Estado inicial al abrir: el primer animal activo preseleccionado con su peso del sistema.
  const primerActivo = animales.find(a => a.estado === "ACTIVO" || !a.estado);
  const [formVenta, setFormVenta] = useState({
    animalId: primerActivo?.id ?? 0,
    comprador: "",
    precioUSD: 0,
    precioPorKg: 0,
    pesoSalida: primerActivo?.pesoActual || 0,
    motivo: "BENEFICIO",
  });
  const [ventaModo, setVentaModo] = useState<ModoVenta>(modoInicial);
  const [animalesVentaSeleccionados, setAnimalesVentaSeleccionados] = useState<number[]>([]);
  // Venta en lote: filtro por arete/nombre y peso de báscula por animal (precargado con el del sistema).
  const [busquedaVenta, setBusquedaVenta] = useState("");
  const [pesosVenta, setPesosVenta] = useState<Record<number, string>>({});
  /** Peso con el que se vende: el de báscula si se escribió, si no el del sistema. */
  const pesoVentaDe = (id: number) => {
    const escrito = Number(String(pesosVenta[id] ?? "").replace(",", "."));
    return escrito > 0 ? escrito : (animales.find(a => a.id === id)?.pesoActual || 0);
  };
  const [ultimaVentaId, setUltimaVentaId] = useState<number | null>(null);

  // Manejador: Despacho por Venta / Beneficio (POST /api/ganaderia/ventas a través de VentaAnimalController)
  const handleRegistrarVentaAnimal = async (e: React.FormEvent) => {
    e.preventDefault();
    const idsVenta = ventaModo === "INDIVIDUAL"
      ? (formVenta.animalId ? [Number(formVenta.animalId)] : [])
      : animalesVentaSeleccionados;

    if (idsVenta.length === 0 || !formVenta.comprador.trim()) return;

    const animalesAVender = idsVenta.map(id => animales.find(a => a.id === id)).filter(Boolean) as AnimalGanaderia[];

    // Precio por animal: si se indicó precio/kg, se calcula peso propio × precio/kg
    // (así se vende "por kilo" real, cada uno con su peso); si no, en modo individual
    // se usa el precio total tal cual, y en lote se reparte el precio total en partes iguales.
    const precioPorAnimal = (id: number): number => {
      const peso = ventaModo === "INDIVIDUAL" ? (Number(formVenta.pesoSalida) || animales.find(a => a.id === id)?.pesoActual || 0) : pesoVentaDe(id);
      if (formVenta.precioPorKg > 0 && peso > 0) {
        return Number((peso * formVenta.precioPorKg).toFixed(2));
      }
      if (ventaModo === "INDIVIDUAL") return Number(formVenta.precioUSD) || 0;
      return Number((Number(formVenta.precioUSD) / idsVenta.length).toFixed(2));
    };

    if (!formVenta.precioPorKg && !formVenta.precioUSD) {
      notificar("Indica un precio total o un precio por kilo para calcular la venta.");
      return;
    }

    try {
      // 1. Si se registró nuevo peso en báscula antes del despacho (solo modo individual), actualizar peso del animal
      // El peso de báscula al vender se guarda como pesaje: cierra la curva de engorde del animal.
      const fechaVenta = fechaLocalISO();
      if (ventaModo === "INDIVIDUAL" && formVenta.pesoSalida && Number(formVenta.pesoSalida) > 0
          && Number(formVenta.pesoSalida) !== animales.find(a => a.id === formVenta.animalId)?.pesoActual) {
        await registrarPesoGanaderia(tenantId, formVenta.animalId, Number(formVenta.pesoSalida), fechaVenta);
      }
      if (ventaModo === "MULTIPLE") {
        for (const id of idsVenta) {
          const peso = pesoVentaDe(id);
          if (peso > 0 && peso !== animales.find(a => a.id === id)?.pesoActual) {
            await registrarPesoGanaderia(tenantId, id, peso, fechaVenta);
          }
        }
      }

      // 2. Registrar la venta oficial en el backend con VentaAnimalController (guarda comprador, precio,
      // ticket y marca cada animal como VENDIDO en un solo servicio transaccional — soporta lote completo)
      const ticket = `VTA-${Date.now().toString().slice(-6)}`;
      const ventaCreada = await registrarVentaGanaderia({
        numeroTicket: ticket,
        comprador: `${formVenta.comprador.trim()} [${formVenta.motivo}]`,
        items: idsVenta.map(id => ({
          animalId: id,
          precioVenta: precioPorAnimal(id),
        })),
      });

      // 3. Reflejar inmediatamente en el estado local: animales marcados como VENDIDO y sin potrero asignado
      onVendidos(idsVenta);
      notificar(`Venta registrada exitosamente (Ticket ${ticket}). ${animalesAVender.length} animal(es) despachado(s) y liquidado(s).`);
      setUltimaVentaId(ventaCreada?.id ?? null);
    } catch (err: any) {
      const msg = err?.message || "Revisa tu conexión e inténtalo de nuevo";
      notificar(`No se pudo procesar la venta: ${msg}`);
      return;
    }

    setFormVenta({
      animalId: 0,
      comprador: "",
      precioUSD: 0,
      precioPorKg: 0,
      pesoSalida: 0,
      motivo: "BENEFICIO",
    });
    setAnimalesVentaSeleccionados([]);
    setPesosVenta({});
  };


    const animalesActivosVenta = animales.filter(a => a.estado === "ACTIVO");
    const idsSeleccionados = ventaModo === "INDIVIDUAL"
      ? (formVenta.animalId ? [formVenta.animalId] : [])
      : animalesVentaSeleccionados;
    const pesoTotalSeleccion = ventaModo === "INDIVIDUAL"
      ? (Number(formVenta.pesoSalida) || animales.find(a => a.id === formVenta.animalId)?.pesoActual || 0)
      : idsSeleccionados.reduce((sum, id) => sum + pesoVentaDe(id), 0);
    const termino = busquedaVenta.trim().toLowerCase();
    const animalesVentaFiltrados = termino
      ? animalesActivosVenta.filter(a =>
          a.arete.toLowerCase().includes(termino) ||
          (a.nombre || "").toLowerCase().includes(termino) ||
          (a.raza || "").toLowerCase().includes(termino) ||
          (a.tipoAnimal || "").toLowerCase().includes(termino))
      : animalesActivosVenta;
    const totalEstimado = formVenta.precioPorKg > 0
      ? pesoTotalSeleccion * formVenta.precioPorKg
      : Number(formVenta.precioUSD) || 0;

    return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
      <div className="apple-glass rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-rose-500/30 text-left space-y-4 my-auto">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white flex items-center gap-2">
              <IconTag size={16} />
              <span>Despacho por Venta / Beneficio</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-white/60 mt-1">
              Registra la salida formal (uno o varios animales) y márcalos como vendidos en el hato.
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="text-slate-400 hover:text-white cursor-pointer">
            ✕
          </button>
        </div>

        {ultimaVentaId ? (
          <div className="space-y-4 text-xs text-center py-4">
            <div className="text-emerald-400 flex flex-col items-center gap-2">
              <IconCheckCircle size={36} />
              <span className="font-bold text-sm text-white">Venta registrada correctamente</span>
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  const blob = await descargarNotaEntregaVentaAnimalPdf(tenantId, ultimaVentaId);
                  const url = URL.createObjectURL(blob);
                  window.open(url, "_blank");
                  setTimeout(() => URL.revokeObjectURL(url), 30000);
                } catch (e) {
                  notificar("No se pudo descargar la nota de entrega");
                }
              }}
              className="btn-cyber-neon text-white font-bold px-5 py-2.5 rounded-xl cursor-pointer inline-flex items-center gap-2">
              <IconDownload size={14} />
              Descargar Nota de Entrega (PDF)
            </button>
            <div>
              <button
                type="button"
                onClick={onCerrar}
                className="text-slate-400 hover:text-white text-[11px] underline cursor-pointer">
                Cerrar
              </button>
            </div>
          </div>
        ) : (
        <form onSubmit={handleRegistrarVentaAnimal} className="space-y-3 text-xs">
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/5 border border-white/10 w-fit">
            <button
              type="button"
              onClick={() => setVentaModo("INDIVIDUAL")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                ventaModo === "INDIVIDUAL" ? "bg-teal-700 !text-white shadow-sm" : "text-slate-400 hover:text-white"
              }`}>
              Individual
            </button>
            <button
              type="button"
              onClick={() => setVentaModo("MULTIPLE")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                ventaModo === "MULTIPLE" ? "bg-teal-700 !text-white shadow-sm" : "text-slate-400 hover:text-white"
              }`}>
              Lote / Varios Animales
            </button>
          </div>

          {ventaModo === "INDIVIDUAL" ? (
            <div>
              <label className="text-slate-400 block mb-1">Animal a Despachar *</label>
              <select
                required
                value={formVenta.animalId}
                onChange={e => {
                  const selId = Number(e.target.value);
                  const animalObj = animales.find(a => a.id === selId);
                  setFormVenta({
                    ...formVenta,
                    animalId: selId,
                    pesoSalida: animalObj?.pesoActual || formVenta.pesoSalida,
                  });
                }}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-bold"
              >
                <option value="">Selecciona un animal activo...</option>
                {animalesActivosVenta.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.arete} - {a.nombre || a.tipoAnimal} ({a.pesoActual || 0} kg)
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-slate-400 block">Animales a Despachar *</label>
                <button
                  type="button"
                  onClick={() => {
                    const idsFiltro = animalesVentaFiltrados.map(a => a.id);
                    const todosMarcados = idsFiltro.length > 0 && idsFiltro.every(id => animalesVentaSeleccionados.includes(id));
                    setAnimalesVentaSeleccionados(prev => todosMarcados
                      ? prev.filter(id => !idsFiltro.includes(id))
                      : [...new Set([...prev, ...idsFiltro])]);
                  }}
                  className="text-[11px] font-bold text-teal-700 hover:text-teal-900 cursor-pointer">
                  {animalesVentaFiltrados.length > 0 && animalesVentaFiltrados.every(a => animalesVentaSeleccionados.includes(a.id))
                    ? "Desmarcar los mostrados"
                    : `Marcar los mostrados (${animalesVentaFiltrados.length})`}
                </button>
              </div>
              <input
                type="search"
                value={busquedaVenta}
                onChange={e => setBusquedaVenta(e.target.value)}
                placeholder="Buscar por número de arete, nombre, raza o tipo..."
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:border-teal-600 focus:outline-none"
              />
              <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 space-y-0.5">
                {animalesVentaFiltrados.length === 0 && (
                  <div className="p-3 text-center text-[11px] text-slate-500">Ningún animal coincide con “{busquedaVenta}”.</div>
                )}
                {animalesVentaFiltrados.map(a => {
                  const isSel = animalesVentaSeleccionados.includes(a.id);
                  return (
                    <div key={a.id} className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-[11px] transition-colors ${
                      isSel ? "bg-teal-50 text-slate-900 font-semibold" : "hover:bg-slate-50 text-slate-700"
                    }`}>
                      <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={e => setAnimalesVentaSeleccionados(prev =>
                            e.target.checked ? [...prev, a.id] : prev.filter(id => id !== a.id)
                          )}
                          className="rounded accent-teal-700 focus:ring-0"
                        />
                        <span className="font-mono text-teal-800">{a.arete}</span>
                        <span className="truncate">{a.nombre || a.tipoAnimal}{a.raza ? ` · ${a.raza}` : ""}</span>
                      </label>
                      {isSel ? (
                        <div className="flex items-center gap-1 flex-shrink-0" title="Peso en báscula al momento de la venta">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={pesosVenta[a.id] ?? String(a.pesoActual || "")}
                            onFocus={e => e.target.select()}
                            onChange={e => setPesosVenta(prev => ({ ...prev, [a.id]: e.target.value }))}
                            className="w-20 px-2 py-1 rounded-md border border-slate-300 bg-white text-right font-mono text-[11px] text-slate-900 focus:border-teal-600 focus:outline-none"
                          />
                          <span className="text-[10px] text-slate-500">kg</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500 flex-shrink-0">{a.pesoActual || 0} kg</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="text-[10px] text-slate-500">
                Al marcar un animal se muestra su peso del sistema; cámbielo si lo pesó en báscula al vender. El nuevo peso queda guardado en su ficha.
              </div>
              <div className="text-[11px] text-right font-bold text-teal-800">
                {animalesVentaSeleccionados.length} animal(es) · {pesoTotalSeleccion} kg total
              </div>
            </div>
          )}

          <div>
            <label className="text-slate-400 block mb-1">Comprador / Frigorífico / Destino *</label>
            <input
              type="text"
              required
              placeholder="Ej. Matadero Frigorífico Central / Ganadería La Gloria"
              value={formVenta.comprador}
              onChange={e => setFormVenta({ ...formVenta, comprador: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-medium"
            />
          </div>

          {ventaModo === "INDIVIDUAL" && (
            <div>
              <label className="text-slate-400 block mb-1">Peso en Báscula (kg)</label>
              <input
                type="number"
                onFocus={e => e.target.select()}
                step="1"
                min="0"
                placeholder="Ej. 480"
                value={formVenta.pesoSalida || ""}
                onChange={e => setFormVenta({ ...formVenta, pesoSalida: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Precio por Kilo (USD)</label>
              <input
                type="number"
                onFocus={e => e.target.select()}
                step="0.01"
                min="0"
                placeholder="Ej. 2.20"
                value={formVenta.precioPorKg || ""}
                onChange={e => setFormVenta({ ...formVenta, precioPorKg: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-emerald-500/30 text-emerald-300 font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">
                Precio Total (USD) {formVenta.precioPorKg > 0 ? "(calculado)" : "*"}
              </label>
              <input
                type="number"
                onFocus={e => e.target.select()}
                step="0.01"
                min="0"
                required={!formVenta.precioPorKg}
                disabled={formVenta.precioPorKg > 0}
                placeholder="Ej. 1100"
                value={formVenta.precioPorKg > 0 ? totalEstimado.toFixed(2) : (formVenta.precioUSD || "")}
                onChange={e => setFormVenta({ ...formVenta, precioUSD: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono disabled:opacity-60"
              />
            </div>
          </div>
          {formVenta.precioPorKg > 0 && (
            <p className="text-[10px] text-emerald-400 -mt-1">
              {pesoTotalSeleccion} kg × ${formVenta.precioPorKg}/kg = ${totalEstimado.toFixed(2)} USD
              {ventaModo === "MULTIPLE" ? " (repartido por el peso real de cada animal)" : ""}
            </p>
          )}

          <div>
            <label className="text-slate-400 block mb-1">Motivo / Tipo de Salida</label>
            <select
              value={formVenta.motivo}
              onChange={e => setFormVenta({ ...formVenta, motivo: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white"
            >
              <option value="BENEFICIO">Venta para Beneficio / Matadero (Carne)</option>
              <option value="CRIA">Venta para Cría / Hato Comercial</option>
              <option value="SUBASTA">Subasta Ganadera</option>
            </select>
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCerrar}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer">
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 !text-white font-bold cursor-pointer transition-colors shadow-sm">
              Confirmar Salida por Venta
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
    );
}
