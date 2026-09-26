import { useEffect, useState } from "react";
import { IconCart, IconCoins, IconSprout } from "../../Icons";
import { crearAnimalGanaderia, type AnimalGanaderia, type PotreroGanaderia } from "../../api";
import { encolarAccionGanaderia, esFalloDeConexion, generarClaveIdempotencia } from "../../offlineQueueGanaderia";
import { fechaLocalISO } from "../ReportesCampoGanaderia";
import { RAZAS_BOVINAS_COMUNES } from "./catalogos";
import type { Notificar } from "./tipos";

/** Formulario vacío de alta: nacimiento en finca, hembra, en el potrero indicado. */
export function altaVacia(potreroId: number) {
  return {
    arete: "",
    tipoIdentificador: "ARETE",
    nombre: "",
    especie: "BOVINO",
    raza: "Brahman",
    sexo: "HEMBRA",
    tipoAnimal: "VACA",
    fechaNacimiento: fechaLocalISO(),
    pesoActual: 0,
    potreroId,
    lote: "",
    origen: "NACIMIENTO" as "NACIMIENTO" | "COMPRA",
    madreId: null as number | null,
    proveedor: "",
    costoCompra: 0,
    fechaCompra: fechaLocalISO(),
    estadoReproductivo: "VACIA" as "VACIA" | "PREÑADA" | "EN_ESPERA",
    estadoProductivo: "SECA" as "CRIANDO" | "ORDEÑO" | "SECA",
  };
}

export type FormAltaAnimal = ReturnType<typeof altaVacia>;

interface Props {
  animales: AnimalGanaderia[];
  animalesActivos: AnimalGanaderia[];
  potreros: PotreroGanaderia[];
  /** Campos con que abre según el botón (compra, parto de becerra...). */
  valoresIniciales?: Partial<FormAltaAnimal>;
  tenantId: number;
  notificar: Notificar;
  onCreado: (animal: AnimalGanaderia) => void;
  /** Se guardó en la cola offline (sin señal): el padre refresca el contador de pendientes. */
  onEncolado: () => void;
  onCerrar: () => void;
}

/**
 * Alta de un animal por nacimiento o por compra. "Guardar y seguir" deja el modal
 * abierto con raza, potrero y origen para dar de alta varios del mismo lote.
 */
export default function ModalAltaAnimal({
  animales, animalesActivos, potreros, valoresIniciales, tenantId, notificar, onCreado, onEncolado, onCerrar,
}: Props) {
  const [formAnimal, setFormAnimal] = useState<FormAltaAnimal>(() => ({ ...altaVacia(potreros[0]?.id || 0), ...valoresIniciales }));

  // El formulario de Alta de Animal arranca con potreroId: 0 (sin potrero real
  // todavía cargado) — en cuanto la lista real de potreros llega del backend,
  // si el potrero seleccionado no existe de verdad, se corrige al primero real.
  // Sin esto, el <select> mostraba visualmente el potrero correcto pero el
  // estado interno se quedaba en 0/un id inventado y el guardado fallaba con
  // "Potrero no encontrado".
  useEffect(() => {
    if (potreros.length > 0 && !potreros.some(p => p.id === formAnimal.potreroId)) {
      setFormAnimal(prev => ({ ...prev, potreroId: potreros[0].id }));
    }
  }, [potreros]);

  // Manejador: Crear nuevo animal (Nacimiento en Finca o Ingreso por Compra)
  // cerrarAlTerminar=false deja el modal abierto y solo limpia arete/nombre — pensado para
  // dar de alta varios animales seguidos (una compra grande, varios nacimientos del día)
  // sin tener que reabrir el modal y volver a llenar raza/potrero/origen cada vez.
  const handleGuardarAnimal = async (e: React.FormEvent, cerrarAlTerminar: boolean = true) => {
    e.preventDefault();
    if (!formAnimal.arete.trim()) return;

    // Fuera del try: si no hay señal se reutiliza para guardarlo en la cola offline.
    let payload: any = {};
    try {
      payload = {
        arete: formAnimal.arete.trim(),
        tipoIdentificador: formAnimal.tipoIdentificador,
        nombre: formAnimal.nombre.trim() || undefined,
        especie: formAnimal.especie,
        raza: formAnimal.raza,
        sexo: formAnimal.sexo,
        tipoAnimal: formAnimal.tipoAnimal,
        fechaNacimiento: formAnimal.fechaNacimiento,
        pesoActual: Number(formAnimal.pesoActual) > 0 ? Number(formAnimal.pesoActual) : undefined,
        potreroId: formAnimal.potreroId ? Number(formAnimal.potreroId) : undefined,
        costoAdquisicion: formAnimal.origen === "COMPRA" ? Number(formAnimal.costoCompra) : undefined,
        madreId: (formAnimal.origen === "NACIMIENTO" && formAnimal.madreId) ? Number(formAnimal.madreId) : undefined,
        valorEstimado: formAnimal.origen === "COMPRA" && Number(formAnimal.costoCompra) > 0 ? Number(formAnimal.costoCompra) : undefined,
        estadoReproductivo: formAnimal.sexo === "HEMBRA" ? formAnimal.estadoReproductivo : undefined,
        estadoProductivo: formAnimal.sexo === "HEMBRA" ? formAnimal.estadoProductivo : undefined,
      };

      if (formAnimal.origen === "COMPRA" && formAnimal.proveedor.trim()) {
        payload.lote = formAnimal.lote.trim()
          ? `${formAnimal.lote} (Proveedor: ${formAnimal.proveedor.trim()})`
          : `Compra: ${formAnimal.proveedor.trim()}`;
      } else if (formAnimal.lote.trim()) {
        payload.lote = formAnimal.lote.trim();
      }

      const nuevo = await crearAnimalGanaderia(tenantId, payload);
      onCreado(nuevo);
      notificar(`Animal arete ${nuevo.arete} (${formAnimal.origen === "COMPRA" ? "Compra" : "Nacimiento en Finca"}) registrado con éxito en el hato.`);
    } catch (err) {
      if (!esFalloDeConexion(err)) {
        notificar(`No se pudo registrar el animal arete ${formAnimal.arete}: ${err instanceof Error ? err.message : "inténtalo de nuevo"}`);
        return;
      }
      // Sin señal (potrero, manga): queda en la cola y se guarda solo al volver la conexión.
      const payloadOffline = { ...payload, arete: formAnimal.arete.trim() };
      encolarAccionGanaderia(tenantId, {
        tipo: "alta_animal",
        id: generarClaveIdempotencia(),
        claveIdempotencia: generarClaveIdempotencia(),
        descripcion: `Alta de ${payloadOffline.arete}`,
        creadaEn: Date.now(),
        payload: payloadOffline,
      });
      onEncolado();
      // Se muestra en el hato con un id provisional hasta que se sincronice.
      onCreado({ ...(payloadOffline as unknown as AnimalGanaderia), id: -Date.now(), estado: "ACTIVO",
        potrero: potreros.find(p => p.id === Number(formAnimal.potreroId)) });
      notificar(`Sin señal: el alta de ${payloadOffline.arete} quedó guardada en el teléfono y se enviará al volver la conexión.`);
    }

    if (cerrarAlTerminar) {
      onCerrar();
    } else {
      // Batch: se mantiene raza/sexo/categoría/potrero/origen/proveedor tal como están
      // (lo típico al dar de alta varios animales del mismo lote/compra seguidos) y solo
      // se limpian el arete y el nombre para el siguiente.
      setFormAnimal(prev => ({ ...prev, arete: "", nombre: "" }));
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto bg-black/60 backdrop-blur-md">
      <div className="apple-glass rounded-3xl p-5 sm:p-8 my-2 sm:my-0 min-w-0 max-w-lg w-full border border-emerald-500/30 text-left space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
            Alta de Animal en el Hato
          </h3>
          <button
            onClick={() => onCerrar()}
            className="text-slate-400 hover:text-white cursor-pointer">
            ✕
          </button>
        </div>

        <form onSubmit={(e) => handleGuardarAnimal(e, false)} className="space-y-4 text-xs">
          {/* Selector de Origen: Nacimiento vs Compra */}
          <div>
            <label className="text-slate-400 block mb-1.5 font-bold">Origen del Animal *</label>
            <div className="grid [&>*]:min-w-0 grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormAnimal({ ...formAnimal, origen: "NACIMIENTO", tipoAnimal: formAnimal.tipoAnimal === "VACA" ? "BECERRA" : formAnimal.tipoAnimal })}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                  formAnimal.origen === "NACIMIENTO"
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-md"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                }`}
              >
                <IconSprout size={15} />
                <span>Nacimiento en Finca</span>
              </button>
              <button
                type="button"
                onClick={() => setFormAnimal({ ...formAnimal, origen: "COMPRA" })}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                  formAnimal.origen === "COMPRA"
                    ? "bg-sky-500/20 border-sky-500 text-sky-400 shadow-md"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                }`}
              >
                <IconCart size={15} />
                <span>Ingreso por Compra</span>
              </button>
            </div>
          </div>

          {/* Campos específicos según Origen */}
          {formAnimal.origen === "NACIMIENTO" ? (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
              <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                <IconSprout size={13} />
                <span>Datos de Nacimiento & Trazabilidad Maternal</span>
              </div>
              <div className="grid [&>*]:min-w-0 grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Madre (Opcional - Genealogía)</label>
                  <select
                    value={formAnimal.madreId || ""}
                    onChange={e => setFormAnimal({ ...formAnimal, madreId: e.target.value ? Number(e.target.value) : null })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-slate-900 dark:text-white text-xs">
                    <option value="">Sin madre vinculada</option>
                    {animalesActivos.filter(a => a.sexo === "HEMBRA").map(h => (
                      <option key={h.id} value={h.id}>
                        {h.arete} - {h.nombre || h.tipoAnimal} ({h.raza || "Brahman"})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Fecha de Nacimiento</label>
                  <input
                    type="date"
                    value={formAnimal.fechaNacimiento}
                    onChange={e => setFormAnimal({ ...formAnimal, fechaNacimiento: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-slate-900 dark:text-white tabular-nums text-xs"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 space-y-3">
              <div className="text-[11px] font-bold text-sky-400 flex items-center gap-1.5">
                <IconCoins size={13} />
                <span>Datos de Adquisición & Proveedor</span>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Proveedor / Subasta / Vendedor *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Subasta Barinas / Agropecuaria El Samán"
                  value={formAnimal.proveedor}
                  onChange={e => setFormAnimal({ ...formAnimal, proveedor: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-slate-900 dark:text-white font-medium text-xs"
                />
              </div>
              <div className="grid [&>*]:min-w-0 grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Precio de Compra (USD) *</label>
                  <input
                    type="number"
                    onFocus={e => e.target.select()}
                    step="0.01"
                    min="0"
                    required
                    placeholder="Ej. 850"
                    value={formAnimal.costoCompra}
                    onChange={e => setFormAnimal({ ...formAnimal, costoCompra: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-slate-900 dark:text-white tabular-nums text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Fecha de Compra / Entrada</label>
                  <input
                    type="date"
                    value={formAnimal.fechaCompra}
                    onChange={e => setFormAnimal({ ...formAnimal, fechaCompra: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-slate-900 dark:text-white tabular-nums text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid [&>*]:min-w-0 grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Número de Arete / Chapeta *</label>
              <input
                type="text"
                required
                placeholder="Ej. V-105"
                value={formAnimal.arete}
                onChange={e => setFormAnimal({ ...formAnimal, arete: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white tabular-nums font-bold"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Nombre (Opcional)</label>
              <input
                type="text"
                placeholder="Ej. Paloma"
                value={formAnimal.nombre}
                onChange={e => setFormAnimal({ ...formAnimal, nombre: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid [&>*]:min-w-0 grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Raza</label>
              <input
                type="text"
                list="razas-bovinas-catalogo"
                value={formAnimal.raza}
                onChange={e => setFormAnimal({ ...formAnimal, raza: e.target.value })}
                onFocus={e => {
                  // Vaciar al enfocar muestra el catálogo completo en el datalist
                  // (el navegador solo sugiere lo que empieza igual al texto actual);
                  // si el usuario se va sin escribir nada, se restaura el valor previo.
                  e.target.dataset.prevRaza = formAnimal.raza;
                  setFormAnimal(prev => ({ ...prev, raza: "" }));
                }}
                onBlur={e => {
                  if (!formAnimal.raza.trim() && e.target.dataset.prevRaza) {
                    setFormAnimal(prev => ({ ...prev, raza: e.target.dataset.prevRaza || "" }));
                  }
                }}
                placeholder="Ej. Brahman, F1 Brahman x Gyr..."
                className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white"
              />
              <datalist id="razas-bovinas-catalogo">
                {RAZAS_BOVINAS_COMUNES.map(r => <option key={r} value={r} />)}
              </datalist>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Sexo</label>
              <select
                value={formAnimal.sexo}
                onChange={e => {
                  const nuevoSexo = e.target.value;
                  // La categoría depende del sexo (Vaca/Novilla/... son hembra, Toro/Novillo/... son macho) —
                  // si no se corrige acá, se podía guardar "Hembra" con categoría "Toro" sin darse cuenta.
                  const categoriasValidas = nuevoSexo === "HEMBRA"
                    ? ["VACA", "NOVILLA", "MAUTA", "BECERRA"]
                    : ["TORO", "NOVILLO", "MAUTE", "TERNERO"];
                  const categoriaCorregida = categoriasValidas.includes(formAnimal.tipoAnimal)
                    ? formAnimal.tipoAnimal
                    : categoriasValidas[0];
                  setFormAnimal({ ...formAnimal, sexo: nuevoSexo, tipoAnimal: categoriaCorregida });
                }}
                className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white">
                <option value="HEMBRA">Hembra</option>
                <option value="MACHO">Macho</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Categoría</label>
              <select
                value={formAnimal.tipoAnimal}
                onChange={e => setFormAnimal({ ...formAnimal, tipoAnimal: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white">
                {(formAnimal.sexo === "HEMBRA"
                  ? [["VACA", "Vaca"], ["NOVILLA", "Novilla"], ["MAUTA", "Mauta"], ["BECERRA", "Becerra"]]
                  : [["TORO", "Toro"], ["NOVILLO", "Novillo"], ["MAUTE", "Maute"], ["TERNERO", "Ternero"]]
                ).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid [&>*]:min-w-0 grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Peso Inicial (kg)</label>
              <input
                type="number"
                onFocus={e => e.target.select()}
                value={formAnimal.pesoActual || ""}
                onChange={e => setFormAnimal({ ...formAnimal, pesoActual: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white tabular-nums"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Potrero Asignado</label>
              <select
                value={formAnimal.potreroId}
                onChange={e => setFormAnimal({ ...formAnimal, potreroId: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white">
                {potreros.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Lote o Grupo de Entrada (Opcional)</label>
            <input
              type="text"
              placeholder="Ej. Lote Marzo 2026 / Compra Feria San Cristóbal"
              value={formAnimal.lote}
              onChange={e => setFormAnimal({ ...formAnimal, lote: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white font-medium"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Permite agrupar y trazar animales nacidos o comprados en un mismo embarque/feria.
            </p>
          </div>

          {/* Estados Reproductivo & Productivo — solo aplican a hembras */}
          {formAnimal.sexo === "HEMBRA" && (
            <div className="grid [&>*]:min-w-0 grid-cols-2 gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
              <div>
                <label className="text-slate-400 block mb-1">Estado Reproductivo</label>
                <select
                  value={formAnimal.estadoReproductivo}
                  onChange={e => setFormAnimal({ ...formAnimal, estadoReproductivo: e.target.value as any })}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-slate-900 dark:text-white font-medium text-xs">
                  <option value="VACIA">Vacía</option>
                  <option value="PREÑADA">Preñada</option>
                  <option value="EN_ESPERA">En Espera (Celo / IA)</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Estado Productivo</label>
                <select
                  value={formAnimal.estadoProductivo}
                  onChange={e => setFormAnimal({ ...formAnimal, estadoProductivo: e.target.value as any })}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-slate-900 dark:text-white font-medium text-xs">
                  <option value="SECA">Seca</option>
                  <option value="ORDEÑO">En Ordeño</option>
                  <option value="CRIANDO">Criando / Amamantando</option>
                </select>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-white/10 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => onCerrar()}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer">
              Cancelar
            </button>
            <button
              type="button"
              onClick={(e) => handleGuardarAnimal(e, true)}
              className="w-full sm:w-auto apple-glass-btn text-slate-700 dark:text-white font-bold px-5 py-2.5 sm:py-2 rounded-xl cursor-pointer border border-emerald-500/30">
              Guardar y Cerrar
            </button>
            <button
              type="submit"
              title="Deja el formulario abierto, listo para dar de alta el siguiente animal del mismo lote/compra"
              className="w-full sm:w-auto btn-cyber-neon text-white font-bold px-6 py-2.5 sm:py-2 rounded-xl cursor-pointer">
              Guardar y Agregar Otro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
