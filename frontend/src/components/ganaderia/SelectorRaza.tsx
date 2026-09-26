import { useMemo, useRef, useState } from "react";
import { RAZAS_BOVINAS_CRUCES, RAZAS_BOVINAS_PURAS } from "./catalogos";

/**
 * Raza con búsqueda: al escribir se filtra la lista (sin importar tildes ni mayúsculas),
 * separada en razas puras y cruces F1. "Otra…" deja escribir cualquier nombre, por ejemplo el
 * cruce propio de la finca. Reemplaza al <datalist>, que en el iPhone casi no se ve.
 */

interface Props {
  value: string;
  onChange: (raza: string) => void;
  className: string;
  placeholder?: string;
}

const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export default function SelectorRaza({ value, onChange, className, placeholder = "Busca o escribe la raza" }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [modoOtra, setModoOtra] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const texto = normalizar(value);
  const { puras, cruces } = useMemo(() => {
    // Cada palabra por separado: "f1 gy" encuentra "F1 Brahman x Gyr" y "F1 Gyr x Holstein".
    const palabras = texto.split(/\s+/).filter(Boolean);
    const filtra = (lista: string[]) => (palabras.length ? lista.filter((r) => palabras.every((p) => normalizar(r).includes(p))) : lista);
    return { puras: filtra(RAZAS_BOVINAS_PURAS), cruces: filtra(RAZAS_BOVINAS_CRUCES) };
  }, [texto]);
  const coincideExacto = [...RAZAS_BOVINAS_PURAS, ...RAZAS_BOVINAS_CRUCES].some((r) => normalizar(r) === texto);

  const elegir = (raza: string) => {
    onChange(raza);
    setModoOtra(false);
    setAbierto(false);
  };

  const opcion = "w-full text-left px-3 py-2 text-xs text-slate-800 hover:bg-emerald-50 cursor-pointer";
  const titulo = "px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400";

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); if (!modoOtra) setAbierto(true); }}
        onFocus={() => { if (!modoOtra) setAbierto(true); }}
        // Espera un instante: si se tocó una opción, primero se registra el toque.
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && abierto) {
            e.preventDefault();
            const primera = puras[0] ?? cruces[0];
            if (primera) elegir(primera);
            else setAbierto(false);
          }
          if (e.key === "Escape") setAbierto(false);
        }}
        placeholder={modoOtra ? "Escribe la raza o el cruce de tu finca" : placeholder}
        autoComplete="off"
        className={className}
      />
      {abierto && !modoOtra && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {puras.length > 0 && <div className={titulo}>Razas</div>}
          {puras.map((r) => (
            <button key={r} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => elegir(r)} className={opcion}>{r}</button>
          ))}
          {cruces.length > 0 && <div className={titulo}>Cruces F1 y mestizajes</div>}
          {cruces.map((r) => (
            <button key={r} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => elegir(r)} className={opcion}>{r}</button>
          ))}
          {value.trim() && !coincideExacto && (
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => elegir(value.trim())} className={`${opcion} font-bold text-emerald-700 border-t border-slate-100`}>
              Usar «{value.trim()}»
            </button>
          )}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { setModoOtra(true); setAbierto(false); onChange(""); setTimeout(() => inputRef.current?.focus(), 0); }}
            className={`${opcion} font-bold text-slate-600 border-t border-slate-100`}
          >
            Otra… (escribir el nombre)
          </button>
        </div>
      )}
      {modoOtra && (
        <button type="button" onClick={() => { setModoOtra(false); setAbierto(true); inputRef.current?.focus(); }} className="mt-1 text-[10px] font-bold text-emerald-700 cursor-pointer">
          Ver la lista de razas
        </button>
      )}
    </div>
  );
}
