import { useEffect, useState } from "react";
import {
  listarMercadoGanadero, obtenerResumenMercado, guardarPublicacionMercado,
  type PublicacionMercado, type FiltrosMercado, type ResumenMercado, type CategoriaMercado,
} from "../../api";
import {
  CATEGORIAS, RAZAS_COMUNES, ESTADOS_VE, CAJA, INPUT, BOTON, numero, dinero, precioTexto, totalEstimado, edadTexto, sexoTexto,
  nombreCategoria, mensajeError, SelloVerificado, Estrellas,
} from "./comun";

export default function Explorar({ onAbrir }: { onAbrir: (id: number) => void }) {
  const [resumen, setResumen] = useState<ResumenMercado | null>(null);
  const [filtros, setFiltros] = useState<FiltrosMercado>({ orden: "recientes" });
  const [busqueda, setBusqueda] = useState("");
  const [lista, setLista] = useState<PublicacionMercado[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [masFiltros, setMasFiltros] = useState(false);

  useEffect(() => { obtenerResumenMercado().then(setResumen).catch(() => {}); }, []);

  useEffect(() => {
    let vigente = true;
    setError(null);
    listarMercadoGanadero(filtros)
      .then((l) => { if (vigente) setLista(l); })
      .catch((e) => { if (vigente) { setLista([]); setError(mensajeError(e)); } });
    return () => { vigente = false; };
  }, [filtros]);

  const cambiar = (cambios: Partial<FiltrosMercado>) => setFiltros((f) => ({ ...f, ...cambios }));
  const conteoCategoria = (id: CategoriaMercado) => resumen?.categorias.find((c) => c.categoria === id)?.total ?? 0;
  const razas = Array.from(new Set([...(resumen?.razas.map((r) => r.raza) ?? []), ...RAZAS_COMUNES]));
  const conteoRaza = (r: string) => resumen?.razas.find((x) => x.raza.toLowerCase() === r.toLowerCase())?.total ?? 0;
  const hayFiltros = !!(filtros.categoria || filtros.raza || filtros.sexo || filtros.estadoRegion || filtros.pesoMin || filtros.pesoMax || filtros.precioMax || filtros.q);

  const alternarGuardado = async (p: PublicacionMercado) => {
    try {
      await guardarPublicacionMercado(p.id, !p.guardado);
      setLista((l) => l?.map((x) => (x.id === p.id ? { ...x, guardado: !p.guardado } : x)) ?? l);
    } catch { /* si falla, la tarjeta queda como estaba */ }
  };

  return (
    <div className="space-y-8">
      {/* PORTADA */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-white via-[#FBFAF6] to-[#EEF6F1] border border-stone-200/80 text-stone-900 px-6 py-10 sm:px-10 sm:py-14">
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-[#DDEFE4]/60 blur-3xl" aria-hidden="true" />
        <div className="absolute right-10 bottom-0 w-64 h-64 rounded-full bg-teal-50 blur-3xl" aria-hidden="true" />
        <div className="relative max-w-2xl space-y-5">
          <span className="inline-flex items-center gap-2 pl-1.5 pr-3.5 py-1 rounded-full bg-white/80 border border-[#CFE6D9] shadow-sm text-[11px] font-bold tracking-[0.14em] uppercase text-[#3E8A66]">
            <span className="w-5 h-5 rounded-full bg-[#57A882] text-[#ffffff] flex items-center justify-center" aria-hidden="true">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            </span>
            Exclusivo Aurora Partners
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold font-['Outfit'] leading-tight">
            Compra y vende ganado seguro con Aurora
          </h1>
          <p className="text-sm sm:text-base text-stone-600">
            Solo entran fincas verificadas por Aurora. Cada animal trae su curva de peso y sus vacunas desde el registro de la finca: negocia por chat y recíbelo en tu hato con un clic.
          </p>
          <form
            onSubmit={(e) => { e.preventDefault(); cambiar({ q: busqueda.trim() || undefined }); }}
            className="flex gap-2 bg-white rounded-2xl p-1.5 border border-stone-200 shadow-sm max-w-xl"
          >
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Busca Brahman, toro padrote, novilla..."
              className="flex-1 px-3 py-2 text-stone-900 text-sm bg-transparent focus:outline-none"
            />
            <button type="submit" className="px-5 py-2 rounded-xl bg-[#57A882] hover:bg-[#4A9673] text-white text-sm font-bold cursor-pointer">Buscar</button>
          </form>
          <div className="flex flex-wrap gap-6 pt-2 text-sm">
            <div><div className="text-2xl font-bold font-['Outfit']">{resumen ? numero.format(resumen.total) : "-"}</div><div className="text-stone-500 text-xs">animales en venta</div></div>
            <div><div className="text-2xl font-bold font-['Outfit']">{resumen ? numero.format(resumen.tratosCerrados) : "-"}</div><div className="text-stone-500 text-xs">tratos cerrados</div></div>
            <div><div className="text-2xl font-bold font-['Outfit']">{resumen?.estados.length ?? "-"}</div><div className="text-stone-500 text-xs">estados con oferta</div></div>
          </div>
        </div>
      </section>

      {/* CATEGORÍAS */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-stone-900 dark:text-white font-['Outfit']">Categorías</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {CATEGORIAS.map((c) => {
            const activa = filtros.categoria === c.id;
            return (
              <button
                key={c.id}
                onClick={() => cambiar({ categoria: activa ? undefined : c.id })}
                className={`relative overflow-hidden rounded-2xl p-4 h-32 text-left border text-stone-800 ${c.fondo} cursor-pointer transition-all ${activa ? "ring-2 ring-[#9CD1B5] scale-[1.02] shadow-md" : "hover:scale-[1.02]"}`}
              >
                <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/60" aria-hidden="true" />
                <div className="relative h-full flex flex-col justify-between">
                  <div>
                    <div className="font-bold font-['Outfit'] text-base leading-tight">{c.nombre}</div>
                    <div className="text-[11px] text-stone-500 leading-snug mt-1">{c.descripcion}</div>
                  </div>
                  <div className="text-xs font-bold text-[#3E8A66]">{conteoCategoria(c.id)} en venta</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* RAZAS */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-stone-900 dark:text-white font-['Outfit']">Razas</h2>
        <div className="flex flex-wrap gap-2">
          {razas.map((r) => {
            const activa = filtros.raza?.toLowerCase() === r.toLowerCase();
            const n = conteoRaza(r);
            return (
              <button
                key={r}
                onClick={() => cambiar({ raza: activa ? undefined : r })}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold border cursor-pointer transition-colors ${
                  activa ? "bg-[#66B891] text-white border-[#66B891]" : "bg-white dark:bg-white/5 text-stone-700 dark:text-white/70 border-stone-200 dark:border-white/10 hover:border-[#66B891]"
                }`}
              >
                {r}{n > 0 && <span className={`ml-1.5 ${activa ? "text-white/80" : "text-stone-400"}`}>{n}</span>}
              </button>
            );
          })}
        </div>
      </section>

      {/* FILTROS */}
      <section className={`${CAJA} p-4 space-y-3`}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-44">
            <label className="text-[11px] text-stone-500">Estado</label>
            <select className={INPUT} value={filtros.estadoRegion ?? ""} onChange={(e) => cambiar({ estadoRegion: e.target.value || undefined })}>
              <option value="">Todo el país</option>
              {ESTADOS_VE.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div className="w-36">
            <label className="text-[11px] text-stone-500">Sexo</label>
            <select className={INPUT} value={filtros.sexo ?? ""} onChange={(e) => cambiar({ sexo: e.target.value || undefined })}>
              <option value="">Todos</option>
              <option value="MACHO">Machos</option>
              <option value="HEMBRA">Hembras</option>
            </select>
          </div>
          <div className="w-44">
            <label className="text-[11px] text-stone-500">Ordenar por</label>
            <select className={INPUT} value={filtros.orden} onChange={(e) => cambiar({ orden: e.target.value as FiltrosMercado["orden"] })}>
              <option value="recientes">Más recientes</option>
              <option value="precio_asc">Precio: menor a mayor</option>
              <option value="precio_desc">Precio: mayor a menor</option>
              <option value="peso_desc">Más pesados</option>
            </select>
          </div>
          <button onClick={() => setMasFiltros(!masFiltros)} className="px-3 py-2.5 text-xs font-bold text-[#2F6B4F] dark:text-emerald-300 cursor-pointer">
            {masFiltros ? "Menos filtros" : "Peso y precio"}
          </button>
          {hayFiltros && (
            <button onClick={() => { setFiltros({ orden: filtros.orden }); setBusqueda(""); }} className="px-3 py-2.5 text-xs font-bold text-rose-700 cursor-pointer ml-auto">
              Quitar filtros
            </button>
          )}
        </div>
        {masFiltros && (
          <div className="flex flex-wrap gap-3">
            <NumeroFiltro etiqueta="Peso mín. (kg)" valor={filtros.pesoMin} onCambio={(v) => cambiar({ pesoMin: v })} />
            <NumeroFiltro etiqueta="Peso máx. (kg)" valor={filtros.pesoMax} onCambio={(v) => cambiar({ pesoMax: v })} />
            <NumeroFiltro etiqueta="Precio máx. ($)" valor={filtros.precioMax} onCambio={(v) => cambiar({ precioMax: v })} />
          </div>
        )}
      </section>

      {/* RESULTADOS */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-stone-900 dark:text-white font-['Outfit']">
            {filtros.categoria ? nombreCategoria(filtros.categoria) : "Todos los animales"}
            {filtros.raza ? ` · ${filtros.raza}` : ""}
          </h2>
          {lista && <span className="text-xs text-stone-500">{lista.length} resultado(s)</span>}
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        {lista === null ? (
          <p className="text-sm text-stone-400 p-10 text-center">Cargando el mercado...</p>
        ) : lista.length === 0 ? (
          <div className={`${CAJA} text-center py-14 space-y-1`}>
            <p className="font-bold text-stone-800 dark:text-white">No hay animales con esos filtros todavía</p>
            <p className="text-sm text-stone-500">Prueba con otra categoría o quita algún filtro.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {lista.map((p) => <TarjetaAnimal key={p.id} p={p} onAbrir={() => onAbrir(p.id)} onGuardar={() => alternarGuardado(p)} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function NumeroFiltro({ etiqueta, valor, onCambio }: { etiqueta: string; valor?: number; onCambio: (v?: number) => void }) {
  const [texto, setTexto] = useState(valor != null ? String(valor) : "");
  return (
    <div className="w-40">
      <label className="text-[11px] text-stone-500">{etiqueta}</label>
      <input
        type="number"
        min="0"
        className={INPUT}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={() => onCambio(texto ? Number(texto) : undefined)}
        onKeyDown={(e) => { if (e.key === "Enter") onCambio(texto ? Number(texto) : undefined); }}
      />
    </div>
  );
}

export function TarjetaAnimal({ p, onAbrir, onGuardar, extra }: {
  p: PublicacionMercado; onAbrir: () => void; onGuardar?: () => void; extra?: React.ReactNode;
}) {
  const esLote = (p.cantidad ?? 1) > 1;
  const detalles = esLote
    ? [p.raza, `${p.cantidad} animales`].filter(Boolean).join(" · ")
    : [p.raza, sexoTexto(p.sexo), edadTexto(p.edadMeses)].filter(Boolean).join(" · ");
  const total = totalEstimado(p);
  return (
    <article className={`${CAJA} overflow-hidden group flex flex-col`}>
      <button onClick={onAbrir} className="relative aspect-[4/3] bg-stone-100 dark:bg-white/5 cursor-pointer overflow-hidden">
        {p.miniatura ? (
          <img src={p.miniatura} alt={p.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-stone-400">Sin foto</div>
        )}
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 text-stone-700 text-[10px] font-bold backdrop-blur shadow-sm">
          {nombreCategoria(p.categoria)}
        </span>
        {esLote && (
          <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/95 text-[#3E8A66] text-[10px] font-bold shadow-sm">
            Lote de {p.cantidad}
          </span>
        )}
        {p.estado !== "ACTIVA" && (
          <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-white/90 text-stone-900 text-[10px] font-bold">
            {p.estado === "VENDIDA" ? "Vendido" : "Retirado"}
          </span>
        )}
        {p.esMia && p.ofertasPendientes > 0 && (
          <span className={`absolute ${esLote ? "top-10" : "top-3"} right-3 px-2.5 py-1 rounded-full bg-[#66B891] text-white text-[10px] font-bold`}>
            {p.ofertasPendientes} oferta(s)
          </span>
        )}
      </button>
      <div className="p-4 flex-1 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <button onClick={onAbrir} className="text-left cursor-pointer min-w-0">
            <div className="font-bold text-stone-900 dark:text-white truncate">{p.titulo}</div>
            <div className="text-xs text-stone-500 dark:text-white/50 truncate">{detalles}</div>
          </button>
          {onGuardar && !p.esMia && (
            <button
              onClick={onGuardar}
              title={p.guardado ? "Quitar de guardados" : "Guardar para después"}
              className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer ${p.guardado ? "bg-rose-50 text-rose-600" : "bg-stone-100 dark:bg-white/5 text-stone-400 hover:text-rose-500"}`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill={p.guardado ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.3 6.3a4.5 4.5 0 016.4 0L12 7.6l1.3-1.3a4.5 4.5 0 116.4 6.4L12 20.4l-7.7-7.7a4.5 4.5 0 010-6.4z" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xl font-bold text-[#3E8A66] dark:text-emerald-300 font-['Outfit']">{precioTexto(p)}</span>
          {p.peso != null && <span className="text-xs font-mono text-stone-600 dark:text-white/60">{esLote ? "prom. " : ""}{numero.format(p.peso)} kg</span>}
        </div>
        {total != null && <div className="text-[11px] text-stone-500 -mt-1">{esLote ? "Lote completo" : "Total"} aprox. {dinero.format(total)}</div>}
        <div className="mt-auto pt-2 border-t border-stone-100 dark:border-white/5 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] text-stone-600 dark:text-white/60 min-w-0">
            <span className="truncate">{p.esMia ? "Tu publicación" : p.vendedor.nombre}</span>
          </div>
          {!p.esMia && (
            <div className="flex flex-wrap items-center gap-2">
              {p.vendedor.verificado && <SelloVerificado pequeno />}
              <Estrellas valor={p.vendedor.calificacion} />
            </div>
          )}
          {extra}
        </div>
      </div>
    </article>
  );
}
