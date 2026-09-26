import { useMemo, useState } from "react";
import { IconClose, IconWarning, IconCheckCircle } from "../Icons";
import {
  importarHatoGanaderia,
  leerHatoDesdeFoto,
  type FilaImportacionHato,
  type PotreroGanaderia,
  type ResultadoImportacionHato,
} from "../api";
import SelectorRaza from "./ganaderia/SelectorRaza";
import { comprimirImagenFactura } from "../utils/imageCompression";

/**
 * Registro rápido del hato en 3 pasos, pensado para quien recién compra Aurora con el ganado
 * ya en la finca: 1) en qué potrero están, 2) una fila corta por animal (arete, sexo,
 * categoría), 3) confirmar. Cada animal queda con su potrero; un potrero que no existe se crea
 * solo con el nombre y se ubica en el mapa después (Mapa & Potreros).
 *
 * Guarda por la misma vía que la importación desde Excel: el servidor valida todo (aretes
 * repetidos, categorías) y guarda todo o nada.
 */

interface Props {
  potreros: PotreroGanaderia[];
  onCerrar: () => void;
  onGuardado: (cantidad: number) => void;
  /** Cambia a la importación desde Excel (para quien ya tiene el hato en una hoja). */
  onUsarExcel?: () => void;
}

const CATEGORIAS: Record<string, { valor: string; texto: string }[]> = {
  HEMBRA: [
    { valor: "VACA", texto: "Vaca" },
    { valor: "NOVILLA", texto: "Novilla" },
    { valor: "MAUTA", texto: "Mauta" },
    { valor: "BECERRA", texto: "Becerra" },
  ],
  MACHO: [
    { valor: "TORO", texto: "Toro" },
    { valor: "NOVILLO", texto: "Novillo" },
    { valor: "MAUTE", texto: "Maute" },
    { valor: "TERNERO", texto: "Ternero" },
  ],
};

interface FilaRapida {
  id: number;
  arete: string;
  sexo: "HEMBRA" | "MACHO";
  tipoAnimal: string;
  raza: string;
  peso: string;
  potrero: string;
}

const INPUT = "w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white";
const ETIQUETA = "text-slate-400 block mb-1";
let siguienteId = 1;

export default function ModalRegistroRapidoHato({ potreros, onCerrar, onGuardado, onUsarExcel }: Props) {
  const [paso, setPaso] = useState<1 | 2 | 3>(1);

  // Paso 1: potrero por defecto (existente, nuevo o ninguno) y raza más común
  const [potreroElegido, setPotreroElegido] = useState<string>(potreros[0]?.nombre ?? "__nuevo__");
  const [potreroNuevo, setPotreroNuevo] = useState("");
  const [razaComun, setRazaComun] = useState("");
  const [nuevosCreados, setNuevosCreados] = useState<string[]>([]);

  // Paso 2: filas
  const [filas, setFilas] = useState<FilaRapida[]>([]);
  const [prefijo, setPrefijo] = useState("");
  const [desde, setDesde] = useState("1");
  const [cuantos, setCuantos] = useState("10");

  // Foto de la libreta o planilla: la IA propone las filas y se revisan aquí antes de guardar.
  const [leyendoFoto, setLeyendoFoto] = useState(false);
  const [avisoFoto, setAvisoFoto] = useState("");

  // Paso 3: vista previa del servidor
  const [vistaPrevia, setVistaPrevia] = useState<ResultadoImportacionHato | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");

  const nombresPotrero = useMemo(() => {
    const existentes = potreros.map((p) => p.nombre);
    return [...existentes, ...nuevosCreados.filter((n) => !existentes.some((e) => e.toLowerCase() === n.toLowerCase()))];
  }, [potreros, nuevosCreados]);

  const potreroPorDefecto = potreroElegido === "__nuevo__" ? potreroNuevo.trim() : potreroElegido;

  const filaVacia = (arete = ""): FilaRapida => ({
    id: siguienteId++, arete, sexo: "HEMBRA", tipoAnimal: "VACA", raza: razaComun.trim(), peso: "", potrero: potreroPorDefecto,
  });

  const irAlPaso2 = () => {
    setError("");
    if (potreroElegido === "__nuevo__") {
      const nombre = potreroNuevo.trim();
      if (!nombre) { setError("Escribe el nombre del potrero, o elige \"Sin potrero por ahora\"."); return; }
      if (!nuevosCreados.some((n) => n.toLowerCase() === nombre.toLowerCase())) setNuevosCreados((prev) => [...prev, nombre]);
    }
    if (filas.length === 0) setFilas([filaVacia(), filaVacia(), filaVacia()]);
    setPaso(2);
  };

  const actualizar = (id: number, cambios: Partial<FilaRapida>) =>
    setFilas((prev) => prev.map((f) => {
      if (f.id !== id) return f;
      const nueva = { ...f, ...cambios };
      // La categoría depende del sexo: al cambiar el sexo se corrige para no guardar "Hembra" con "Toro".
      if (cambios.sexo && !CATEGORIAS[cambios.sexo].some((c) => c.valor === nueva.tipoAnimal)) {
        nueva.tipoAnimal = CATEGORIAS[cambios.sexo][0].valor;
      }
      return nueva;
    }));

  const generarAretes = () => {
    const inicio = parseInt(desde, 10);
    const total = parseInt(cuantos, 10);
    if (!(inicio >= 0) || !(total > 0) || total > 500) { setError("Indica desde qué número y cuántos (máximo 500)."); return; }
    setError("");
    const ancho = Math.max(desde.trim().length, String(inicio + total - 1).length);
    const nuevas = Array.from({ length: total }, (_, i) => filaVacia(`${prefijo}${String(inicio + i).padStart(ancho, "0")}`));
    // Reemplaza las filas vacías del principio y agrega el resto.
    setFilas((prev) => [...prev.filter((f) => f.arete.trim()), ...nuevas]);
  };

  const leerFoto = async (archivo: File | undefined) => {
    if (!archivo) return;
    setError("");
    setAvisoFoto("");
    setLeyendoFoto(true);
    try {
      const leidas = await leerHatoDesdeFoto(await comprimirImagenFactura(archivo));
      if (leidas.length === 0) {
        setAvisoFoto("No se encontraron animales en la foto. Asegúrate de que se vea la lista completa y con buena luz.");
        return;
      }
      const nuevosPotreros = new Set<string>();
      const filasLeidas: FilaRapida[] = leidas.map((l) => {
        const sexo: FilaRapida["sexo"] = l.sexo === "MACHO" ? "MACHO" : "HEMBRA";
        const tipo = CATEGORIAS[sexo].some((c) => c.valor === l.tipoAnimal) ? l.tipoAnimal : CATEGORIAS[sexo][0].valor;
        let potrero = potreroPorDefecto;
        if (l.potrero) {
          const existente = nombresPotrero.find((n) => n.toLowerCase() === l.potrero.toLowerCase());
          potrero = existente ?? l.potrero;
          if (!existente) nuevosPotreros.add(l.potrero);
        }
        return { id: siguienteId++, arete: l.arete, sexo, tipoAnimal: tipo, raza: l.raza || razaComun.trim(), peso: l.peso, potrero };
      });
      if (nuevosPotreros.size > 0) setNuevosCreados((prev) => [...prev, ...[...nuevosPotreros].filter((n) => !prev.includes(n))]);
      setFilas((prev) => [...prev.filter((f) => f.arete.trim()), ...filasLeidas]);
      setAvisoFoto(`Se leyeron ${filasLeidas.length} animales. Revisa cada uno: la foto puede tener errores de lectura.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo leer la foto");
    } finally {
      setLeyendoFoto(false);
    }
  };

  const crearPotreroEnFila = (id: number) => {
    const nombre = prompt("Nombre del nuevo potrero (lo ubicas en el mapa después):")?.trim();
    if (!nombre) return;
    if (!nombresPotrero.some((n) => n.toLowerCase() === nombre.toLowerCase())) setNuevosCreados((prev) => [...prev, nombre]);
    actualizar(id, { potrero: nombre });
  };

  const filasConArete = filas.filter((f) => f.arete.trim());
  const aFilasServidor = (): FilaImportacionHato[] => filasConArete.map((f) => ({
    arete: f.arete.trim(),
    sexo: f.sexo,
    tipoAnimal: f.tipoAnimal,
    raza: f.raza.trim() || undefined,
    pesoActual: f.peso.trim() || undefined,
    potrero: f.potrero || undefined,
  }));

  const revisar = async () => {
    setError("");
    if (filasConArete.length === 0) { setError("Escribe el arete de al menos un animal."); return; }
    setProcesando(true);
    try {
      setVistaPrevia(await importarHatoGanaderia(aFilasServidor(), false));
      setPaso(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo revisar la lista");
    } finally {
      setProcesando(false);
    }
  };

  const confirmar = async () => {
    setError("");
    setProcesando(true);
    try {
      const r = await importarHatoGanaderia(aFilasServidor(), true);
      if (r.confirmado) onGuardado(r.animalesImportados);
      else setVistaPrevia(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el ganado");
    } finally {
      setProcesando(false);
    }
  };

  // Las filas enviadas al servidor se numeran desde 2 (como en Excel): fila 2 = primer animal con arete.
  const areteDeFila = (fila: number) => filasConArete[fila - 2]?.arete ?? `fila ${fila}`;
  const sinErrores = vistaPrevia !== null && vistaPrevia.errores.length === 0;

  return (
    <div className="fixed inset-0 z-[2000] flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto bg-black/60 backdrop-blur-md">
      <div className="apple-glass rounded-3xl p-5 sm:p-8 my-2 sm:my-0 min-w-0 max-w-3xl w-full border border-emerald-500/30 text-left space-y-5">
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-white/10">
          <div>
            <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">Registrar mi ganado</h3>
            <p className="text-xs text-slate-500 dark:text-white/50 mt-1">
              Paso {paso} de 3 · {paso === 1 ? "¿Dónde están los animales?" : paso === 2 ? "Los animales" : "Revisar y guardar"}
            </p>
          </div>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer" aria-label="Cerrar">
            <IconClose size={20} />
          </button>
        </div>

        {/* PASO 1 */}
        {paso === 1 && (
          <div className="space-y-4 text-xs">
            <p className="text-sm text-slate-600 dark:text-white/70">
              Elige el potrero donde está este grupo de animales. En el siguiente paso puedes cambiar el potrero de cada uno.
              Si el potrero aún no existe, escríbelo: se crea solo con el nombre y lo ubicas en el mapa después.
            </p>
            <div>
              <label className={ETIQUETA}>Potrero</label>
              <select value={potreroElegido} onChange={(e) => setPotreroElegido(e.target.value)} className={INPUT}>
                {potreros.map((p) => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
                <option value="__nuevo__">+ Nuevo potrero…</option>
                <option value="">Sin potrero por ahora</option>
              </select>
            </div>
            {potreroElegido === "__nuevo__" && (
              <div>
                <label className={ETIQUETA}>Nombre del nuevo potrero</label>
                <input value={potreroNuevo} onChange={(e) => setPotreroNuevo(e.target.value)} maxLength={100} placeholder="Ej. Potrero La Vega" className={INPUT} autoFocus />
              </div>
            )}
            {onUsarExcel && (
              <p className="text-[11px] text-slate-500 dark:text-white/50">
                ¿Ya tienes el hato en una hoja de Excel?{" "}
                <button type="button" onClick={onUsarExcel} className="font-bold text-emerald-700 underline cursor-pointer">Importar desde Excel</button>
              </p>
            )}
            <div>
              <label className={ETIQUETA}>Raza más común (opcional)</label>
              <SelectorRaza value={razaComun} onChange={setRazaComun} placeholder="Ej. Brahman" className={INPUT} />
              <p className="text-[11px] text-slate-400 mt-1">Se pone en cada animal; la cambias en los que sean distintos.</p>
            </div>
          </div>
        )}

        {/* PASO 2 */}
        {paso === 2 && (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <div className="font-bold text-slate-700 dark:text-white/80">¿Tienes el hato anotado en una libreta o planilla?</div>
              <p className="text-[11px] text-slate-500 dark:text-white/50">Tómale una foto y Aurora llena la lista. Después revisas cada animal antes de guardar.</p>
              <label className={`inline-flex w-full sm:w-auto justify-center apple-glass-btn text-slate-700 dark:text-white font-bold px-4 py-2 rounded-xl border border-emerald-500/30 ${leyendoFoto ? "opacity-60" : "cursor-pointer"}`}>
                {leyendoFoto ? "Leyendo la foto…" : "Leer desde foto"}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  disabled={leyendoFoto}
                  onChange={(e) => { leerFoto(e.target.files?.[0]); e.target.value = ""; }}
                />
              </label>
              {avisoFoto && <p className="text-[11px] font-semibold text-emerald-700">{avisoFoto}</p>}
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <div className="font-bold text-slate-700 dark:text-white/80">¿Los aretes van seguidos? Créalos de una vez</div>
              <div className="grid [&>*]:min-w-0 grid-cols-3 gap-2">
                <div>
                  <label className={ETIQUETA}>Prefijo</label>
                  <input value={prefijo} onChange={(e) => setPrefijo(e.target.value)} placeholder="Ej. V-" className={INPUT} />
                </div>
                <div>
                  <label className={ETIQUETA}>Desde</label>
                  <input value={desde} onChange={(e) => setDesde(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="001" className={INPUT} />
                </div>
                <div>
                  <label className={ETIQUETA}>Cuántos</label>
                  <input value={cuantos} onChange={(e) => setCuantos(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className={INPUT} />
                </div>
              </div>
              <button type="button" onClick={generarAretes} className="w-full sm:w-auto apple-glass-btn text-slate-700 dark:text-white font-bold px-4 py-2 rounded-xl cursor-pointer border border-emerald-500/30">
                Crear {cuantos || 0} animales ({prefijo}{desde || "1"} en adelante)
              </button>
            </div>

            <div className="space-y-2">
              {filas.map((f, i) => (
                <div key={f.id} className="p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-500">Animal {i + 1}</span>
                    <button type="button" onClick={() => setFilas((prev) => prev.filter((x) => x.id !== f.id))} className="text-slate-400 hover:text-rose-500 cursor-pointer" aria-label="Quitar">
                      <IconClose size={14} />
                    </button>
                  </div>
                  <div className="grid [&>*]:min-w-0 grid-cols-2 sm:grid-cols-6 gap-2">
                    <div className="sm:col-span-1">
                      <label className={ETIQUETA}>Arete *</label>
                      <input value={f.arete} onChange={(e) => actualizar(f.id, { arete: e.target.value })} placeholder="V-105" className={INPUT} />
                    </div>
                    <div>
                      <label className={ETIQUETA}>Sexo</label>
                      <select value={f.sexo} onChange={(e) => actualizar(f.id, { sexo: e.target.value as FilaRapida["sexo"] })} className={INPUT}>
                        <option value="HEMBRA">Hembra</option>
                        <option value="MACHO">Macho</option>
                      </select>
                    </div>
                    <div>
                      <label className={ETIQUETA}>Categoría</label>
                      <select value={f.tipoAnimal} onChange={(e) => actualizar(f.id, { tipoAnimal: e.target.value })} className={INPUT}>
                        {CATEGORIAS[f.sexo].map((c) => <option key={c.valor} value={c.valor}>{c.texto}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={ETIQUETA}>Potrero</label>
                      <select
                        value={f.potrero}
                        onChange={(e) => (e.target.value === "__nuevo__" ? crearPotreroEnFila(f.id) : actualizar(f.id, { potrero: e.target.value }))}
                        className={INPUT}
                      >
                        {nombresPotrero.map((n) => <option key={n} value={n}>{n}</option>)}
                        <option value="">Sin potrero</option>
                        <option value="__nuevo__">+ Nuevo potrero…</option>
                      </select>
                    </div>
                    <div>
                      <label className={ETIQUETA}>Raza</label>
                      <SelectorRaza value={f.raza} onChange={(raza) => actualizar(f.id, { raza })} placeholder="Opcional" className={INPUT} />
                    </div>
                    <div>
                      <label className={ETIQUETA}>Peso (kg)</label>
                      <input value={f.peso} onChange={(e) => actualizar(f.id, { peso: e.target.value.replace(/[^\d.,]/g, "") })} inputMode="decimal" placeholder="Opcional" className={INPUT} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button type="button" onClick={() => setFilas((prev) => [...prev, filaVacia()])} className="w-full sm:w-auto apple-glass-btn text-slate-700 dark:text-white font-bold px-4 py-2 rounded-xl cursor-pointer border border-emerald-500/30">
                + Agregar animal
              </button>
              {filas.length > 1 && (
                <select
                  value=""
                  onChange={(e) => {
                    const destino = e.target.value;
                    if (destino === "") return;
                    const nombre = destino === "__ninguno__" ? "" : destino;
                    setFilas((prev) => prev.map((x) => ({ ...x, potrero: nombre })));
                  }}
                  className={`${INPUT} sm:w-auto`}
                >
                  <option value="">Poner todos en un potrero…</option>
                  {nombresPotrero.map((n) => <option key={n} value={n}>{n}</option>)}
                  <option value="__ninguno__">Todos sin potrero</option>
                </select>
              )}
            </div>
            <p className="text-[11px] text-slate-400">{filasConArete.length} animales con arete. Las filas sin arete no se guardan.</p>
          </div>
        )}

        {/* PASO 3 */}
        {paso === 3 && vistaPrevia && (
          <div className="space-y-4 text-xs">
            {sinErrores ? (
              <>
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                  <IconCheckCircle size={18} /> Todo listo para guardar {vistaPrevia.totalFilas} animales
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <div className="font-bold text-slate-700 dark:text-white/80 mb-1">Por potrero</div>
                  {Object.entries(vistaPrevia.porPotrero ?? {}).map(([nombre, n]) => (
                    <div key={nombre} className="flex justify-between text-slate-600 dark:text-white/70">
                      <span>{nombre}{vistaPrevia.potrerosNuevos?.includes(nombre) ? " (nuevo)" : ""}</span>
                      <span className="font-bold">{n}</span>
                    </div>
                  ))}
                </div>
                {(vistaPrevia.potrerosNuevos?.length ?? 0) > 0 && (
                  <p className="text-[11px] text-slate-500 dark:text-white/50">
                    Se crearán {vistaPrevia.potrerosNuevos!.length === 1 ? "el potrero" : "los potreros"} {vistaPrevia.potrerosNuevos!.join(", ")} solo con el nombre.
                    Después los ubicas en el mapa desde Mapa & Potreros.
                  </p>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                  <IconWarning size={18} /> Hay que corregir {vistaPrevia.errores.length} {vistaPrevia.errores.length === 1 ? "cosa" : "cosas"} antes de guardar
                </div>
                <ul className="space-y-1">
                  {vistaPrevia.errores.map((e, i) => (
                    <li key={i} className="p-2 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-300">
                      {e.fila >= 2 ? <strong>{areteDeFila(e.fila)}: </strong> : null}{e.mensaje}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-xs font-bold text-rose-600">{error}</p>}

        <div className="pt-3 border-t border-white/10 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 text-xs">
          <button
            type="button"
            onClick={() => (paso === 1 ? onCerrar() : setPaso(paso === 3 ? 2 : 1))}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            {paso === 1 ? "Cancelar" : "Atrás"}
          </button>
          {paso === 1 && (
            <button type="button" onClick={irAlPaso2} className="w-full sm:w-auto btn-cyber-neon text-white font-bold px-6 py-2.5 sm:py-2 rounded-xl cursor-pointer">
              Siguiente
            </button>
          )}
          {paso === 2 && (
            <button type="button" onClick={revisar} disabled={procesando} className="w-full sm:w-auto btn-cyber-neon text-white font-bold px-6 py-2.5 sm:py-2 rounded-xl cursor-pointer disabled:opacity-60">
              {procesando ? "Revisando…" : `Revisar ${filasConArete.length} animales`}
            </button>
          )}
          {paso === 3 && sinErrores && (
            <button type="button" onClick={confirmar} disabled={procesando} className="w-full sm:w-auto btn-cyber-neon text-white font-bold px-6 py-2.5 sm:py-2 rounded-xl cursor-pointer disabled:opacity-60">
              {procesando ? "Guardando…" : `Guardar ${vistaPrevia?.totalFilas ?? 0} animales`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
