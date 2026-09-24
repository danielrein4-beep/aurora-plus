import { useEffect, useState } from "react";
import {
  publicarEnMercado, listarAnimalesGanaderia, obtenerMiPuestoMercado,
  type AnimalGanaderia, type CategoriaMercado,
} from "../../api";
import {
  CAJA, INPUT, BOTON, BOTON_SUAVE, CATEGORIAS, ESTADOS_VE, sexoTexto, comprimirImagen, mensajeError,
} from "./comun";

/** Categoría probable según lo que Aurora ya sabe del animal; el vendedor puede cambiarla. */
function sugerirCategoria(a: AnimalGanaderia): CategoriaMercado {
  const tipo = (a.tipoAnimal ?? "").toUpperCase();
  if (a.sexo === "MACHO") {
    if (tipo.includes("TORO")) return "PADROTE";
    if (tipo.includes("BECERRO") || tipo.includes("MAUTE")) return "MAUTE";
    return "CEBA";
  }
  if (tipo.includes("NOVILLA")) return "NOVILLA";
  if (tipo.includes("BECERRA") || tipo.includes("MAUTA")) return "MAUTE";
  if ((a.estadoProductivo ?? "").toUpperCase().includes("ORDE")) return "VACA_ORDENO";
  if ((a.estadoProductivo ?? "").toUpperCase().includes("CRIANDO")) return "VACA_PARIDA";
  return "VACA_PARIDA";
}

export default function Publicar({ conCondiciones, onListo, onCancelar }: {
  conCondiciones: (accion: () => void) => void;
  onListo: (id: number, avisoOculto: boolean) => void;
  onCancelar: () => void;
}) {
  const [animales, setAnimales] = useState<AnimalGanaderia[] | null>(null);
  const [publicados, setPublicados] = useState<Set<string>>(new Set());
  const [animalId, setAnimalId] = useState<number | "">("");
  const [categoria, setCategoria] = useState<CategoriaMercado | "">("");
  const [titulo, setTitulo] = useState("");
  const [precio, setPrecio] = useState("");
  const [tipoPrecio, setTipoPrecio] = useState<"POR_CABEZA" | "POR_KG">("POR_CABEZA");
  const [estadoRegion, setEstadoRegion] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [negociable, setNegociable] = useState(true);
  const [fotos, setFotos] = useState<string[]>([]);
  const [procesando, setProcesando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listarAnimalesGanaderia("ACTIVO").then(setAnimales).catch(() => setAnimales([]));
    obtenerMiPuestoMercado()
      .then((m) => setPublicados(new Set(m.publicaciones.filter((p) => p.estado === "ACTIVA" && p.arete).map((p) => p.arete as string))))
      .catch(() => {});
  }, []);

  const animal = animales?.find((a) => a.id === animalId);

  const elegirAnimal = (id: number | "") => {
    setAnimalId(id);
    const a = animales?.find((x) => x.id === id);
    if (a) setCategoria(sugerirCategoria(a));
  };

  const agregarFotos = async (archivos: FileList | null) => {
    if (!archivos || archivos.length === 0) return;
    setProcesando(true);
    setError(null);
    try {
      const nuevas = [...fotos];
      for (const archivo of Array.from(archivos).slice(0, 6 - fotos.length)) nuevas.push(await comprimirImagen(archivo, 1280, 0.8));
      setFotos(nuevas);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setProcesando(false);
    }
  };

  const moverAPortada = (i: number) => setFotos([fotos[i], ...fotos.filter((_, j) => j !== i)]);

  const publicar = () => {
    if (!animalId) { setError("Elige el animal"); return; }
    if (!categoria) { setError("Elige la categoría"); return; }
    if (!(Number(precio) > 0)) { setError("Escribe el precio"); return; }
    if (!estadoRegion) { setError("Elige el estado donde está el animal"); return; }
    if (fotos.length === 0) { setError("Agrega al menos una foto"); return; }
    conCondiciones(async () => {
      setGuardando(true);
      setError(null);
      try {
        const miniatura = await comprimirImagen(fotos[0], 520, 0.72);
        const creada = await publicarEnMercado({
          animalId: Number(animalId), categoria, titulo: titulo || undefined, precio: Number(precio), tipoPrecio,
          estadoRegion, municipio: municipio || undefined, descripcion: descripcion || undefined, negociable, fotos, miniatura,
        });
        onListo(creada.id, !!creada.datosOcultos);
      } catch (err) {
        setError(mensajeError(err));
      } finally {
        setGuardando(false);
      }
    });
  };

  const disponibles = (animales ?? []).filter((a) => !publicados.has(a.arete));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-white font-['Outfit']">Publicar un animal</h1>
        <p className="text-sm text-stone-500">Toma los datos de tu hato: raza, peso, curva de peso y vacunas se muestran solos.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <section className={`${CAJA} p-6 space-y-4`}>
            <Paso numero={1} titulo="El animal" />
            <select className={INPUT} value={animalId} onChange={(e) => elegirAnimal(e.target.value ? Number(e.target.value) : "")}>
              <option value="">{animales === null ? "Cargando tu hato..." : disponibles.length === 0 ? "No tienes animales activos sin publicar" : "Elige un animal activo de tu hato"}</option>
              {disponibles.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.arete}{a.nombre ? ` · ${a.nombre}` : ""} · {a.raza ?? "sin raza"} · {sexoTexto(a.sexo)}{a.pesoActual ? ` · ${a.pesoActual} kg` : ""}
                </option>
              ))}
            </select>
            <div>
              <label className="text-[11px] text-stone-500">Categoría</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                {CATEGORIAS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoria(c.id)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold border text-left cursor-pointer ${
                      categoria === c.id ? "bg-emerald-800 text-white border-emerald-800" : "bg-white dark:bg-white/5 text-stone-700 dark:text-white/70 border-stone-200 dark:border-white/10"
                    }`}
                  >
                    {c.nombre}
                  </button>
                ))}
              </div>
            </div>
            <input className={INPUT} placeholder={animal ? `Título (ej. Toro ${animal.raza ?? ""} padrote de 3 años)` : "Título de la publicación"} value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} />
            <textarea className={INPUT} rows={4} placeholder="Genética, carácter, alimentación, por qué lo vendes..." value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={2000} />
            <p className="text-[11px] text-stone-500">No escribas teléfonos, redes ni correos: se ocultan solos. Tus datos se comparten al cerrar el trato.</p>
          </section>

          <section className={`${CAJA} p-6 space-y-4`}>
            <Paso numero={2} titulo="Precio y ubicación" />
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-sm">$</span>
                <input type="number" min="0" step="1" className={`${INPUT} pl-7`} placeholder="Precio" value={precio} onChange={(e) => setPrecio(e.target.value)} />
              </div>
              <select className={INPUT} value={tipoPrecio} onChange={(e) => setTipoPrecio(e.target.value as "POR_CABEZA" | "POR_KG")}>
                <option value="POR_CABEZA">Por cabeza</option>
                <option value="POR_KG">Por kilo</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select className={INPUT} value={estadoRegion} onChange={(e) => setEstadoRegion(e.target.value)}>
                <option value="">Estado</option>
                {ESTADOS_VE.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
              <input className={INPUT} placeholder="Municipio (opcional)" value={municipio} onChange={(e) => setMunicipio(e.target.value)} maxLength={80} />
            </div>
            <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-white/70">
              <input type="checkbox" checked={negociable} onChange={(e) => setNegociable(e.target.checked)} /> Acepto ofertas por debajo del precio
            </label>
          </section>
        </div>

        <section className={`${CAJA} p-6 space-y-4 h-fit`}>
          <Paso numero={3} titulo={`Fotos (${fotos.length}/6)`} />
          <div className="grid grid-cols-3 gap-2">
            {fotos.map((f, i) => (
              <div key={i} className="relative aspect-square rounded-2xl overflow-hidden bg-stone-100 group">
                <img src={f} alt="" className="w-full h-full object-cover" />
                {i === 0 ? (
                  <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-full bg-amber-500 text-stone-950 text-[10px] font-bold">Portada</span>
                ) : (
                  <button type="button" onClick={() => moverAPortada(i)} className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-full bg-white/90 text-stone-900 text-[10px] font-bold cursor-pointer opacity-0 group-hover:opacity-100">
                    Usar de portada
                  </button>
                )}
                <button type="button" onClick={() => setFotos(fotos.filter((_, j) => j !== i))} className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-stone-950/60 text-white text-xs cursor-pointer" aria-label="Quitar foto">x</button>
              </div>
            ))}
            {fotos.length < 6 && (
              <label className="aspect-square rounded-2xl border-2 border-dashed border-stone-300 dark:border-white/20 flex flex-col items-center justify-center gap-1 text-xs text-stone-500 cursor-pointer text-center p-2 hover:border-emerald-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h2l1.5-2h7L17 5h2a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                  <circle cx="12" cy="12" r="3.5" />
                </svg>
                {procesando ? "Procesando..." : "Agregar fotos"}
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { agregarFotos(e.target.files); e.target.value = ""; }} />
              </label>
            )}
          </div>
          <p className="text-[11px] text-stone-500">Buenas fotos de costado y de frente, con luz de día, venden más. No pongas teléfonos ni letreros en la foto.</p>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" disabled={guardando || procesando} className={BOTON} onClick={publicar}>{guardando ? "Publicando..." : "Publicar en el mercado"}</button>
            <button type="button" onClick={onCancelar} className={BOTON_SUAVE}>Cancelar</button>
          </div>
          <p className="text-[11px] text-stone-500">Publicar es gratis. Si cierras un trato aquí, Aurora cobra 1% en tu próxima factura.</p>
        </section>
      </div>
    </div>
  );
}

function Paso({ numero, titulo }: { numero: number; titulo: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-7 h-7 rounded-full bg-emerald-800 text-white text-xs font-bold flex items-center justify-center">{numero}</span>
      <span className="font-bold text-stone-900 dark:text-white">{titulo}</span>
    </div>
  );
}
