import { useState, useMemo, useRef, useEffect } from "react";

interface DiagnosticoCie10 {
  codigo: string;
  descripcion: string;
}

// El catálogo (14,000+ códigos, ~1.3MB) se carga en un chunk aparte y solo la
// primera vez que se usa este buscador — así no infla el bundle principal que
// carga toda la app en el primer arranque. Una vez cargado queda en memoria
// para el resto de la sesión (no se vuelve a pedir).
let catalogoCache: DiagnosticoCie10[] | null = null;
let catalogoPromise: Promise<DiagnosticoCie10[]> | null = null;

function cargarCatalogo(): Promise<DiagnosticoCie10[]> {
  if (catalogoCache) return Promise.resolve(catalogoCache);
  if (!catalogoPromise) {
    catalogoPromise = import("../data/cie10.json").then((mod) => {
      catalogoCache = (mod.default as DiagnosticoCie10[]) ?? (mod as unknown as DiagnosticoCie10[]);
      return catalogoCache;
    });
  }
  return catalogoPromise;
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // quita tildes para que buscar sin acentos (ej. "hipertension") funcione igual
}

interface Props {
  /** Código CIE-10 ya seleccionado (para mostrarlo si se está editando una consulta existente). */
  valorCodigo?: string;
  valorDescripcion?: string;
  onSeleccionar: (diagnostico: DiagnosticoCie10) => void;
  placeholder?: string;
}

/**
 * Buscador de diagnósticos probables sobre el catálogo CIE-10 completo
 * (14,000+ códigos, en español) — el médico escribe libremente (por código o
 * por nombre de la enfermedad) y elige de la lista, en vez de escribir el
 * código a mano. Corre 100% en el cliente (catálogo estático embebido, sin
 * ida y vuelta al servidor) para no romper el flujo "offline-first" de
 * recepción/consulta.
 *
 * El código elegido aquí es exactamente el dato que alimenta el Canal
 * Endémico (ver CanalEndemicoService en el backend) — por eso este buscador
 * existe: sin un código CIE-10 real y consistente por consulta, no hay canal
 * que calcular.
 */
export default function Cie10Buscador({ valorCodigo, valorDescripcion, onSeleccionar, placeholder }: Props) {
  const [query, setQuery] = useState(valorCodigo && valorDescripcion ? `${valorCodigo} — ${valorDescripcion}` : "");
  const [abierto, setAbierto] = useState(false);
  const [catalogo, setCatalogo] = useState<DiagnosticoCie10[] | null>(catalogoCache);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function alClicFuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", alClicFuera);
    return () => document.removeEventListener("mousedown", alClicFuera);
  }, []);

  const alEnfocar = () => {
    setAbierto(true);
    if (!catalogo && !cargandoCatalogo) {
      setCargandoCatalogo(true);
      cargarCatalogo()
        .then(setCatalogo)
        .finally(() => setCargandoCatalogo(false));
    }
  };

  const resultados = useMemo(() => {
    if (!catalogo) return [];
    const q = normalizar(query.trim());
    if (q.length < 2) return [];
    const porCodigo = q.toUpperCase();
    const coincidencias: DiagnosticoCie10[] = [];
    for (const d of catalogo) {
      if (d.codigo.startsWith(porCodigo) || normalizar(d.descripcion).includes(q)) {
        coincidencias.push(d);
        if (coincidencias.length >= 30) break;
      }
    }
    return coincidencias;
  }, [query, catalogo]);

  const elegir = (d: DiagnosticoCie10) => {
    setQuery(`${d.codigo} — ${d.descripcion}`);
    setAbierto(false);
    onSeleccionar(d);
  };

  return (
    <div className="relative" ref={contenedorRef}>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setAbierto(true);
        }}
        onFocus={alEnfocar}
        placeholder={placeholder || "Buscar por código o nombre (ej. A90, dengue, hipertensión)..."}
        className="w-full px-3 py-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#071a2e]/70 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
      />
      {abierto && cargandoCatalogo && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0a1f36] shadow-lg px-3 py-2 text-xs text-slate-400">
          Cargando catálogo de diagnósticos…
        </div>
      )}
      {abierto && resultados.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0a1f36] shadow-lg">
          {resultados.map((d) => (
            <button
              key={d.codigo}
              type="button"
              onClick={() => elegir(d)}
              className="w-full text-left px-3 py-2 hover:bg-teal-500/10 text-xs border-b border-slate-100/60 dark:border-white/5 last:border-0"
            >
              <span className="font-bold text-teal-600 dark:text-teal-400">{d.codigo}</span>{" "}
              <span className="text-slate-700 dark:text-white/80">{d.descripcion}</span>
            </button>
          ))}
        </div>
      )}
      {abierto && !cargandoCatalogo && catalogo && query.trim().length >= 2 && resultados.length === 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0a1f36] shadow-lg px-3 py-2 text-xs text-slate-400">
          Sin coincidencias en el catálogo CIE-10.
        </div>
      )}
    </div>
  );
}
