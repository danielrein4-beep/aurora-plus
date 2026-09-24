import { useEffect, useState } from "react";
import {
  obtenerMiPuestoMercado, listarMisOfertasMercado, listarGuardadosMercado, guardarPublicacionMercado,
  type MiPuestoMercado, type PublicacionMercado, type OfertaMercado, type ConversacionMercado,
} from "../../api";
import { TarjetaAnimal } from "./Explorar";
import { CAJA, BOTON, dinero, numero, fechaCorta } from "./comun";

// ─────────────────────────── vendedor ───────────────────────────

export function MiPuesto({ onAbrir, onPublicar }: { onAbrir: (id: number) => void; onPublicar?: () => void }) {
  const [datos, setDatos] = useState<MiPuestoMercado | null>(null);
  useEffect(() => { obtenerMiPuestoMercado().then(setDatos).catch(() => setDatos({ resumen: { activas: 0, ofertasPendientes: 0, vendidas: 0, montoVendido: 0 }, publicaciones: [] })); }, []);
  if (!datos) return <p className="text-sm text-stone-400 p-10 text-center">Cargando tu puesto...</p>;
  const { resumen, publicaciones } = datos;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-white font-['Outfit']">Mi puesto</h1>
          <p className="text-sm text-stone-500">Tus animales en venta, las ofertas que te hacen y cómo están frente al mercado.</p>
        </div>
        {onPublicar && <button className={BOTON} onClick={onPublicar}>Publicar animal</button>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Indicador titulo="En venta" valor={numero.format(resumen.activas)} />
        <Indicador titulo="Ofertas por responder" valor={numero.format(resumen.ofertasPendientes)} resaltado={resumen.ofertasPendientes > 0} />
        <Indicador titulo="Vendidos en Aurora" valor={numero.format(resumen.vendidas)} />
        <Indicador titulo="Total vendido" valor={dinero.format(resumen.montoVendido)} />
      </div>

      {publicaciones.length === 0 ? (
        <div className={`${CAJA} text-center py-14 space-y-3`}>
          <p className="font-bold text-stone-800 dark:text-white">Aún no has publicado animales</p>
          {onPublicar && <button onClick={onPublicar} className={BOTON}>Publicar mi primer animal</button>}
        </div>
      ) : (
        <div className={`${CAJA} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold text-stone-500 uppercase bg-stone-50 dark:bg-white/5">
                  <th className="px-5 py-3">Animal</th>
                  <th className="px-3 py-3 text-right">Pides</th>
                  <th className="px-3 py-3 text-right">Mejor oferta</th>
                  <th className="px-3 py-3 text-right">Promedio del mercado</th>
                  <th className="px-3 py-3 text-center">Ofertas</th>
                  <th className="px-5 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {publicaciones.map((p) => {
                  const pctOferta = p.mejorOferta ? Math.round((Number(p.mejorOferta) / p.precio) * 100) : null;
                  const pctMercado = p.referencia ? Math.round(((p.precio - p.referencia.promedio) / p.referencia.promedio) * 100) : null;
                  return (
                    <tr key={p.id} onClick={() => onAbrir(p.id)} className="border-t border-stone-100 dark:border-white/5 cursor-pointer hover:bg-stone-50 dark:hover:bg-white/5">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-11 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                            {p.miniatura && <img src={p.miniatura} alt="" className="w-full h-full object-cover" />}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-stone-900 dark:text-white truncate">{p.titulo}</div>
                            <div className="text-[11px] text-stone-500">{p.arete} · {p.raza ?? "sin raza"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono">{dinero.format(p.precio)}</td>
                      <td className="px-3 py-3 text-right">
                        {p.mejorOferta ? (
                          <>
                            <div className="font-mono font-bold text-[#2F6B4F] dark:text-emerald-300">{dinero.format(Number(p.mejorOferta))}</div>
                            <div className="text-[10px] text-stone-500">{pctOferta}% de lo que pides</div>
                          </>
                        ) : <span className="text-stone-300">-</span>}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {p.referencia ? (
                          <>
                            <div className="font-mono">{dinero.format(p.referencia.promedio)}</div>
                            <div className={`text-[10px] ${pctMercado! > 10 ? "text-rose-600" : pctMercado! < -10 ? "text-[#3E8A66]" : "text-stone-500"}`}>
                              {pctMercado === 0 ? "en el promedio" : `pides ${Math.abs(pctMercado!)}% ${pctMercado! > 0 ? "más" : "menos"}`}
                            </div>
                          </>
                        ) : <span className="text-[11px] text-stone-400">Aún sin datos</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {p.ofertasPendientes > 0
                          ? <span className="px-2 py-1 rounded-full bg-[#66B891] text-white text-[11px] font-bold">{p.ofertasPendientes}</span>
                          : <span className="text-stone-300">0</span>}
                      </td>
                      <td className="px-5 py-3 text-xs">
                        {p.estado === "ACTIVA" ? <span className="text-[#3E8A66] font-bold">En venta</span>
                          : p.estado === "VENDIDA" ? <span className="font-bold">Vendido por {dinero.format(Number(p.precioFinal))}</span>
                          : <span className="text-stone-400">Retirado</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Indicador({ titulo, valor, resaltado }: { titulo: string; valor: string; resaltado?: boolean }) {
  return (
    <div className={`${CAJA} p-5 ${resaltado ? "ring-2 ring-[#9CD1B5]" : ""}`}>
      <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wide">{titulo}</div>
      <div className="text-3xl font-bold text-stone-900 dark:text-white font-['Outfit'] mt-1">{valor}</div>
    </div>
  );
}

// ─────────────────────────── comprador ───────────────────────────

const ESTADO_OFERTA: Record<string, { texto: string; clase: string }> = {
  PENDIENTE: { texto: "Esperando respuesta", clase: "bg-sky-50 text-sky-800" },
  ACEPTADA: { texto: "Aceptada", clase: "bg-[#EEF6F1] text-[#2F6B4F]" },
  RECHAZADA: { texto: "Rechazada", clase: "bg-rose-50 text-rose-700" },
  RETIRADA: { texto: "Reemplazada", clase: "bg-stone-100 text-stone-600" },
};

export function MisCompras({ onAbrir }: { onAbrir: (id: number) => void }) {
  const [ofertas, setOfertas] = useState<{ oferta: OfertaMercado; publicacion: PublicacionMercado }[] | null>(null);
  const [guardados, setGuardados] = useState<PublicacionMercado[] | null>(null);

  useEffect(() => {
    listarMisOfertasMercado().then(setOfertas).catch(() => setOfertas([]));
    listarGuardadosMercado().then(setGuardados).catch(() => setGuardados([]));
  }, []);

  const quitarGuardado = async (p: PublicacionMercado) => {
    try { await guardarPublicacionMercado(p.id, false); setGuardados((g) => g?.filter((x) => x.id !== p.id) ?? g); } catch { /* sin cambios */ }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-white font-['Outfit']">Mis compras</h1>
        <p className="text-sm text-stone-500">Tus ofertas y los animales que guardaste.</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-stone-900 dark:text-white font-['Outfit']">Mis ofertas</h2>
        {ofertas === null ? <p className="text-sm text-stone-400">Cargando...</p> : ofertas.length === 0 ? (
          <div className={`${CAJA} p-8 text-center text-sm text-stone-500`}>Todavía no has ofertado por ningún animal.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {ofertas.map(({ oferta, publicacion }) => (
              <TarjetaAnimal
                key={oferta.id}
                p={publicacion}
                onAbrir={() => onAbrir(publicacion.id)}
                extra={
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-stone-600">Ofreciste <strong>{dinero.format(oferta.monto)}</strong> · {fechaCorta(oferta.fecha)}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ESTADO_OFERTA[oferta.estado]?.clase ?? ""}`}>
                      {oferta.estado === "ACEPTADA" && oferta.traspasado ? "En tu hato" : ESTADO_OFERTA[oferta.estado]?.texto ?? oferta.estado}
                    </span>
                  </div>
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-stone-900 dark:text-white font-['Outfit']">Guardados</h2>
        {guardados === null ? <p className="text-sm text-stone-400">Cargando...</p> : guardados.length === 0 ? (
          <div className={`${CAJA} p-8 text-center text-sm text-stone-500`}>Toca el corazón de un animal para guardarlo aquí.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {guardados.map((p) => <TarjetaAnimal key={p.id} p={p} onAbrir={() => onAbrir(p.id)} onGuardar={() => quitarGuardado(p)} />)}
          </div>
        )}
      </section>
    </div>
  );
}

// ─────────────────────────── mensajes ───────────────────────────

export function BandejaMensajes({ conversaciones, onAbrir }: {
  conversaciones: ConversacionMercado[]; onAbrir: (id: number, comprador?: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-white font-['Outfit']">Mensajes</h1>
        <p className="text-sm text-stone-500">Conversaciones con otras fincas, como vendedor y como comprador.</p>
      </div>
      {conversaciones.length === 0 ? (
        <div className={`${CAJA} p-10 text-center text-sm text-stone-500`}>No tienes conversaciones todavía.</div>
      ) : (
        <div className={`${CAJA} divide-y divide-stone-100 dark:divide-white/5 overflow-hidden`}>
          {conversaciones.map((c) => (
            <button
              key={`${c.publicacionId}-${c.compradorRef}`}
              onClick={() => onAbrir(c.publicacionId, c.soyVendedor ? c.compradorRef : undefined)}
              className="w-full flex items-center gap-4 p-4 text-left cursor-pointer hover:bg-stone-50 dark:hover:bg-white/5"
            >
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-stone-100 shrink-0">
                {c.miniatura && <img src={c.miniatura} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-2">
                  <span className="font-bold text-sm text-stone-900 dark:text-white truncate">{c.otraFinca} · {c.titulo}</span>
                  <span className="text-[10px] text-stone-400 whitespace-nowrap">{fechaCorta(c.ultimaFecha)}</span>
                </div>
                <div className="text-xs text-stone-500 truncate">
                  <span className={`mr-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${c.soyVendedor ? "bg-[#DDEFE4] text-[#2F6B4F]" : "bg-sky-100 text-sky-900"}`}>
                    {c.soyVendedor ? "Te quiere comprar" : "Le compras"}
                  </span>
                  {c.ultimoMensaje}
                </div>
              </div>
              {Number(c.sinLeer) > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#66B891] text-white text-[10px] font-bold">{c.sinLeer}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
