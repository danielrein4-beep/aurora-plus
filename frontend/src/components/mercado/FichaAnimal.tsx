import { useCallback, useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import {
  obtenerPublicacionMercado, ofertarEnMercado, aceptarOfertaMercado, rechazarOfertaMercado, recibirAnimalMercado,
  confirmarPagoMercado, anularTratoMercado,
  retirarPublicacionMercado, editarPublicacionMercado, calificarTratoMercado, guardarPublicacionMercado,
  type DetallePublicacionMercado, type PublicarMercadoRequest,
} from "../../api";
import Chat from "./Chat";
import NotaMovilizacionTrato from "./NotaMovilizacionTrato";
import {
  CAJA, INPUT, BOTON, BOTON_ORO, BOTON_SUAVE, CATEGORIAS, ESTADOS_VE, dinero, numero, precioTexto, totalEstimado, edadTexto, sexoTexto,
  nombreCategoria, fechaCorta, mensajeError, PerfilFinca,
} from "./comun";

export default function FichaAnimal({ id, compradorInicial, puedeNegociar, conCondiciones, onVolver, onCambio }: {
  id: number;
  compradorInicial?: string;
  puedeNegociar: boolean;
  conCondiciones: (accion: () => void) => void;
  onVolver: () => void;
  onCambio: () => void;
}) {
  const [d, setD] = useState<DetallePublicacionMercado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [foto, setFoto] = useState(0);
  const [trabajando, setTrabajando] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; tipo: "ok" | "error" | "info" } | null>(null);
  const [monto, setMonto] = useState("");
  const [mensajeOferta, setMensajeOferta] = useState("");
  const [compradorChat, setCompradorChat] = useState<string | undefined>(compradorInicial);
  const [editando, setEditando] = useState(false);

  const cargar = useCallback(() => {
    obtenerPublicacionMercado(id).then(setD).catch((e) => setError(mensajeError(e)));
  }, [id]);
  useEffect(() => { cargar(); }, [cargar]);

  const accion = async (fn: () => Promise<DetallePublicacionMercado>, exito: string) => {
    setTrabajando(true);
    setAviso(null);
    try {
      const nuevo = await fn();
      setD(nuevo);
      setAviso(nuevo.datosOcultos
        ? { texto: `${exito}. Ocultamos datos de contacto que escribiste: se comparten solos al cerrar el trato.`, tipo: "info" }
        : { texto: exito, tipo: "ok" });
      onCambio();
    } catch (e) {
      setAviso({ texto: mensajeError(e), tipo: "error" });
    } finally {
      setTrabajando(false);
    }
  };

  const compradores = useMemo(() => {
    const m = new Map<string, string>();
    (d?.ofertas ?? []).forEach((o) => { if (o.compradorRef && o.comprador) m.set(o.compradorRef, o.comprador.nombre); });
    return m;
  }, [d]);
  useEffect(() => {
    if (d?.esMia && compradorChat === undefined && compradores.size > 0) setCompradorChat(compradores.keys().next().value);
  }, [d, compradorChat, compradores]);

  if (error) return (
    <div className="space-y-3">
      <button onClick={onVolver} className={BOTON_SUAVE}>Volver</button>
      <p className="text-sm text-rose-600">{error}</p>
    </div>
  );
  if (!d) return <p className="text-sm text-stone-400 p-10 text-center">Cargando...</p>;

  const activa = d.estado === "ACTIVA";
  const miUltimaOferta = d.misOfertas?.[0];
  const aceptadaMia = d.misOfertas?.find((o) => o.estado === "ACEPTADA");
  const esLote = (d.cantidad ?? 1) > 1;
  const total = totalEstimado(d);
  const diferenciaReferencia = d.referencia ? Math.round(((d.precio - d.referencia.promedio) / d.referencia.promedio) * 100) : null;
  const datos: [string, string | null][] = [
    ["Categoría", nombreCategoria(d.categoria)],
    ["Raza", d.raza],
    ...(esLote ? [
      ["Animales", String(d.cantidad)] as [string, string],
      ["Peso promedio", d.peso != null ? `${numero.format(d.peso)} kg` : null] as [string, string | null],
      ["Peso total", d.pesoTotal != null ? `${numero.format(d.pesoTotal)} kg` : null] as [string, string | null],
    ] : [
      ["Sexo", sexoTexto(d.sexo)] as [string, string],
      ["Edad", edadTexto(d.edadMeses)] as [string, string | null],
      ["Peso", d.peso != null ? `${numero.format(d.peso)} kg` : null] as [string, string | null],
    ]),
    ["Ubicación", [d.municipio, d.estadoRegion].filter(Boolean).join(", ") || null],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={onVolver} className={BOTON_SUAVE}>Volver al mercado</button>
        {!d.esMia && (
          <button
            onClick={async () => {
              try { await guardarPublicacionMercado(d.id, !d.guardado); setD({ ...d, guardado: !d.guardado }); } catch { /* sin cambios */ }
            }}
            className={`${BOTON_SUAVE} ${d.guardado ? "text-rose-600" : ""}`}
          >
            {d.guardado ? "Guardado" : "Guardar"}
          </button>
        )}
      </div>

      {aviso && (
        <div className={`px-4 py-3 rounded-2xl text-sm font-bold ${
          aviso.tipo === "error" ? "bg-rose-50 text-rose-700" : aviso.tipo === "info" ? "bg-sky-50 text-sky-900" : "bg-[#EEF6F1] text-[#2F6B4F]"
        }`}>
          {aviso.texto}
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        {/* GALERÍA */}
        <div className="lg:col-span-3 space-y-3 min-w-0">
          <div className="aspect-[4/3] rounded-[2rem] overflow-hidden bg-stone-100 dark:bg-white/5">
            {d.fotos[foto] ? (
              <img src={d.fotos[foto].imagen} alt={d.titulo} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-stone-400">Sin fotos</div>
            )}
          </div>
          {d.fotos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {d.fotos.map((f, i) => (
                <button key={f.id} onClick={() => setFoto(i)} className={`w-24 h-18 aspect-[4/3] rounded-xl overflow-hidden shrink-0 border-2 cursor-pointer ${i === foto ? "border-[#66B891]" : "border-transparent opacity-70 hover:opacity-100"}`}>
                  <img src={f.imagen} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* PRECIO Y CONFIANZA */}
        <div className="lg:col-span-2 space-y-4 min-w-0">
          <div className={`${CAJA} p-6 space-y-4`}>
            <div>
              <span className="inline-flex px-2.5 py-1 rounded-full bg-[#EEF6F1] dark:bg-emerald-500/15 text-[#3E8A66] dark:text-emerald-200 text-[11px] font-bold">
                {nombreCategoria(d.categoria)}
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-white font-['Outfit'] mt-2">{d.titulo}</h1>
            </div>
            <div>
              <div className="text-4xl font-bold text-[#3E8A66] dark:text-emerald-300 font-['Outfit']">{precioTexto(d)}</div>
              {total != null && <div className="text-xs text-stone-500">Aprox. {dinero.format(total)} por {esLote ? `el lote de ${d.cantidad}` : "el animal"}</div>}
              <div className="text-xs text-stone-500 mt-1">{d.negociable ? "Acepta ofertas" : "Precio fijo"}</div>
            </div>
            {d.referencia && (
              <div className="rounded-2xl bg-stone-50 dark:bg-white/5 p-3 text-xs space-y-1">
                <div className="font-bold text-stone-800 dark:text-white">Precio de referencia del mercado</div>
                <div className="text-stone-600 dark:text-white/60">
                  Promedio de {d.referencia.muestras} animales de la misma {d.referencia.alcance}: <strong>{dinero.format(d.referencia.promedio)}</strong>
                  {" "}(de {dinero.format(d.referencia.minimo)} a {dinero.format(d.referencia.maximo)})
                </div>
                {diferenciaReferencia != null && (
                  <div className={diferenciaReferencia > 10 ? "text-rose-700" : diferenciaReferencia < -10 ? "text-[#3E8A66]" : "text-stone-600"}>
                    {diferenciaReferencia === 0 ? "En el promedio" : `${Math.abs(diferenciaReferencia)}% ${diferenciaReferencia > 0 ? "por encima" : "por debajo"} del promedio`}
                  </div>
                )}
              </div>
            )}
            {!activa && (
              <div className="px-3 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold">
                {d.estado === "VENDIDA" ? `Vendido${d.precioFinal != null ? ` por ${dinero.format(d.precioFinal)}` : ""}` : "Publicación retirada"}
              </div>
            )}
            <div className="pt-3 border-t border-stone-100 dark:border-white/5">
              <div className="text-[11px] uppercase tracking-wider font-bold text-stone-400 mb-1.5">{d.esMia ? "Tu finca" : "Vendedor"}</div>
              <PerfilFinca perfil={d.vendedor} rol="VENDEDOR" />
            </div>
          </div>

          {/* CONTACTO REVELADO AL CERRAR */}
          {d.contraparte && (
            <div className={`${CAJA} p-5 space-y-2 border-[#9CD1B5]`}>
              <div className="font-bold text-sm text-stone-900 dark:text-white">Trato cerrado: datos para coordinar la entrega</div>
              <div className="text-sm text-stone-700 dark:text-white/80 space-y-0.5">
                <div><strong>{d.contraparte.nombre}</strong></div>
                {d.contraparte.telefono && <div>Teléfono: {d.contraparte.telefono}</div>}
                {d.contraparte.email && <div>Correo: {d.contraparte.email}</div>}
              </div>
              {d.ofertaCerrada && !d.yaCalifique && puedeNegociar && (
                <Calificar onCalificar={(estrellas, comentario) => accion(() => calificarTratoMercado(d.ofertaCerrada!.id, estrellas, comentario), "Gracias por calificar")} />
              )}
              {d.yaCalifique && <p className="text-xs text-[#3E8A66]">Ya calificaste este trato.</p>}
              {d.notaMovilizacion && puedeNegociar && <NotaMovilizacionTrato datos={d.notaMovilizacion} onEmitida={cargar} />}
            </div>
          )}

          {/* COMPRADOR */}
          {!d.esMia && puedeNegociar && (
            <div className={`${CAJA} p-5 space-y-3`}>
              {aceptadaMia ? (
                aceptadaMia.traspasado ? (
                  <p className="text-sm font-bold text-[#2F6B4F] dark:text-emerald-300">Compraste este animal y ya está en tu hato.</p>
                ) : (
                  aceptadaMia.pagoConfirmado ? (
                    <>
                      <p className="text-sm text-stone-700 dark:text-white/80">
                        El vendedor confirmó tu pago de <strong>{dinero.format(aceptadaMia.monto)}</strong>. Cuando tengas el animal, recíbelo en tu hato con su historial.
                      </p>
                      <button disabled={trabajando} className={`${BOTON} w-full`} onClick={() => accion(() => recibirAnimalMercado(aceptadaMia.id), "Animal agregado a tu hato")}>
                        Recibir en mi hato
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-stone-700 dark:text-white/80">
                        El vendedor aceptó tu oferta de <strong>{dinero.format(aceptadaMia.monto)}</strong>. Paga lo acordado por el chat; cuando el vendedor confirme que recibió el pago, podrás recibir el animal en tu hato.
                      </p>
                      <button
                        disabled={trabajando}
                        className={`${BOTON_SUAVE} w-full text-rose-700`}
                        onClick={() => {
                          const motivo = prompt("¿Por qué anulas el trato? El vendedor verá el motivo.");
                          if (motivo && motivo.trim()) accion(() => anularTratoMercado(aceptadaMia.id, motivo.trim()), "Trato anulado");
                        }}
                      >
                        Anular trato
                      </button>
                    </>
                  )
                )
              ) : activa ? (
                <form
                  className="space-y-2.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const valor = Number(monto);
                    if (!(valor > 0)) { setAviso({ texto: "Escribe el monto de tu oferta", tipo: "error" }); return; }
                    conCondiciones(() => {
                      accion(() => ofertarEnMercado(d.id, valor, mensajeOferta || undefined), "Oferta enviada").then(() => { setMonto(""); setMensajeOferta(""); });
                    });
                  }}
                >
                  <div className="font-bold text-stone-900 dark:text-white">Hacer una oferta</div>
                  {miUltimaOferta && (
                    <p className="text-xs text-stone-500">Tu última oferta: {dinero.format(miUltimaOferta.monto)} ({miUltimaOferta.estado.toLowerCase()})</p>
                  )}
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-sm">$</span>
                    <input type="number" min="0" step="1" className={`${INPUT} pl-7`} placeholder={esLote ? `Monto total por el lote de ${d.cantidad}` : "Monto total que ofreces"} value={monto} onChange={(e) => setMonto(e.target.value)} />
                  </div>
                  <input className={INPUT} placeholder="Mensaje (opcional)" value={mensajeOferta} onChange={(e) => setMensajeOferta(e.target.value)} maxLength={500} />
                  <button type="submit" disabled={trabajando} className={`${BOTON_ORO} w-full`}>Enviar oferta</button>
                  <p className="text-[11px] text-stone-500">Si el vendedor acepta, Aurora cobra 1% del trato a cada parte en su próxima factura.</p>
                </form>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* VENDEDOR: OFERTAS RECIBIDAS */}
      {d.esMia && (
        <div className={`${CAJA} p-6 space-y-4`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-bold text-lg text-stone-900 dark:text-white font-['Outfit']">Ofertas recibidas</h2>
              <p className="text-xs text-stone-500">Ordenadas de mayor a menor. Pides {precioTexto(d)}{total != null ? ` (aprox. ${dinero.format(total)} en total)` : ""}.</p>
            </div>
            {activa && puedeNegociar && (
              <div className="flex gap-2">
                <button className={BOTON_SUAVE} onClick={() => setEditando(!editando)}>{editando ? "Cerrar edición" : "Editar publicación"}</button>
                <button
                  className={`${BOTON_SUAVE} text-rose-700`}
                  onClick={() => { if (confirm("¿Retirar esta publicación del mercado?")) accion(() => retirarPublicacionMercado(d.id), "Publicación retirada"); }}
                >
                  Retirar
                </button>
              </div>
            )}
          </div>
          {editando && activa && (
            <EditarPublicacion d={d} onGuardar={(req) => accion(() => editarPublicacionMercado(d.id, req), "Publicación actualizada").then(() => setEditando(false))} />
          )}
          {(d.ofertas ?? []).length === 0 ? (
            <p className="text-sm text-stone-500">Aún no hay ofertas. Cuando alguien oferte, te avisamos en Mensajes.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {(d.ofertas ?? []).map((o, i) => {
                const pct = Math.round((o.monto / (total ?? d.precio)) * 100);
                return (
                  <div key={o.id} className={`rounded-2xl border p-4 space-y-2 ${o.estado === "ACEPTADA" ? "border-[#9CD1B5] bg-[#EEF6F1]/50" : i === 0 && o.estado === "PENDIENTE" ? "border-[#9CD1B5] bg-[#EEF6F1]/50" : "border-stone-200 dark:border-white/10"}`}>
                    <div className="flex items-start justify-between gap-2">
                      {o.comprador && <PerfilFinca perfil={o.comprador} rol="COMPRADOR" />}
                      <div className="text-right shrink-0">
                        <div className="text-xl font-bold text-[#2F6B4F] dark:text-emerald-300 font-['Outfit']">{dinero.format(o.monto)}</div>
                        <div className="text-[11px] text-stone-500">{pct}% de lo que pides</div>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
                      <div className={`h-full ${pct >= 100 ? "bg-[#57A882]" : pct >= 90 ? "bg-teal-400" : "bg-sky-300"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <div className="text-[11px] text-stone-500">{fechaCorta(o.fecha)} · {o.estado.toLowerCase()}{i === 0 && o.estado === "PENDIENTE" ? " · mejor oferta" : ""}</div>
                    {o.mensaje && <p className="text-sm text-stone-700 dark:text-white/70">"{o.mensaje}"</p>}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button className="text-xs font-bold text-[#2F6B4F] cursor-pointer" onClick={() => setCompradorChat(o.compradorRef)}>Abrir chat</button>
                      {o.estado === "ACEPTADA" && !o.traspasado && puedeNegociar && (
                        o.pagoConfirmado ? (
                          <span className="text-xs font-bold text-[#2F6B4F] ml-auto">Pago confirmado · esperando que el comprador lo reciba</span>
                        ) : (
                          <>
                            <button
                              disabled={trabajando}
                              className={`${BOTON} py-1.5 text-xs ml-auto`}
                              onClick={() => {
                                if (confirm(`¿Confirmas que ya recibiste ${dinero.format(o.monto)}? Se registra el ingreso en tu caja y el comprador podrá recibir el animal.`)) {
                                  accion(() => confirmarPagoMercado(o.id), "Pago confirmado");
                                }
                              }}
                            >
                              Confirmar pago recibido
                            </button>
                            <button
                              disabled={trabajando}
                              className={`${BOTON_SUAVE} py-1.5 text-xs text-rose-700`}
                              onClick={() => {
                                const motivo = prompt("¿Por qué anulas el trato? El comprador verá el motivo. El animal vuelve a quedar publicado.");
                                if (motivo && motivo.trim()) accion(() => anularTratoMercado(o.id, motivo.trim()), "Trato anulado");
                              }}
                            >
                              Anular trato
                            </button>
                          </>
                        )
                      )}
                      {o.estado === "ANULADA" && o.motivoAnulacion && (
                        <span className="text-xs text-rose-700 w-full">Anulado: {o.motivoAnulacion}</span>
                      )}
                      {o.estado === "PENDIENTE" && activa && puedeNegociar && (
                        <>
                          <button
                            disabled={trabajando}
                            className={`${BOTON} py-1.5 text-xs ml-auto`}
                            onClick={() => {
                              if (confirm(`¿Aceptar ${dinero.format(o.monto)}? El animal quedará vendido, se revelarán los datos de ambas fincas y Aurora cobrará 1% a cada parte en la próxima factura.`)) {
                                accion(() => aceptarOfertaMercado(o.id), "Trato cerrado");
                              }
                            }}
                          >
                            Aceptar
                          </button>
                          <button disabled={trabajando} className={`${BOTON_SUAVE} py-1.5 text-xs`} onClick={() => accion(() => rechazarOfertaMercado(o.id), "Oferta rechazada")}>
                            Rechazar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* HISTORIAL Y CHAT */}
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6 min-w-0">
          <div className={`${CAJA} p-6`}>
            <h2 className="font-bold text-stone-900 dark:text-white font-['Outfit'] mb-4">Ficha del animal</h2>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              {datos.filter(([, v]) => v).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[11px] text-stone-500">{k}</dt>
                  <dd className="font-bold text-stone-900 dark:text-white">{v}</dd>
                </div>
              ))}
            </dl>
            {d.descripcion && <p className="text-sm text-stone-700 dark:text-white/70 mt-5 whitespace-pre-line leading-relaxed">{d.descripcion}</p>}
          </div>
          <div className={`${CAJA} p-6`}>
            <h2 className="font-bold text-stone-900 dark:text-white font-['Outfit'] mb-1">{esLote ? "Animales del lote" : "Curva de peso"}</h2>
            <p className="text-xs text-stone-500 mb-4">{esLote ? "Peso actual de cada animal según el registro de la finca." : "Pesajes registrados por la finca en Aurora."}</p>
            {esLote ? (
              <div className="overflow-x-auto max-h-80">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] text-stone-500 uppercase border-b border-stone-100">
                      <th className="py-2 pr-4">#</th><th className="py-2 pr-4">Arete</th><th className="py-2 pr-4">Raza</th><th className="py-2 pr-4">Sexo</th><th className="py-2 pr-4">Edad</th><th className="py-2 text-right">Peso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(d.animales ?? []).map((a, i) => (
                      <tr key={i} className="border-b border-stone-50">
                        <td className="py-1.5 pr-4 text-stone-400">{i + 1}</td>
                        <td className="py-1.5 pr-4 font-mono">{a.arete ?? "—"}</td>
                        <td className="py-1.5 pr-4">{a.raza ?? "—"}</td>
                        <td className="py-1.5 pr-4">{sexoTexto(a.sexo)}</td>
                        <td className="py-1.5 pr-4">{edadTexto(a.edadMeses) ?? "—"}</td>
                        <td className="py-1.5 text-right font-mono">{a.peso != null ? `${numero.format(a.peso)} kg` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : d.pesos.length === 0 ? (
              <p className="text-sm text-stone-400">La finca aún no registró pesajes de este animal.</p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={d.pesos.map((p) => ({ fecha: p.fecha, peso: Number(p.pesoKg) }))} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                    <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: "#78716c" }} tickFormatter={(f: string) => String(f).substring(0, 7)} minTickGap={24} />
                    <YAxis tick={{ fontSize: 10, fill: "#78716c" }} unit=" kg" />
                    <Tooltip formatter={(v) => [`${numero.format(Number(v))} kg`, "Peso"]} />
                    <Line type="monotone" dataKey="peso" stroke="#047857" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <div className={`${CAJA} p-6`}>
            <h2 className="font-bold text-stone-900 dark:text-white font-['Outfit'] mb-4">Sanidad</h2>
            {d.vacunas.length === 0 ? (
              <p className="text-sm text-stone-400">Sin vacunas registradas en Aurora para este animal.</p>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-white/5">
                {d.vacunas.map((v, i) => (
                  <div key={i} className="flex justify-between gap-3 py-2 text-sm">
                    <span className="text-stone-800 dark:text-white">
                      {v.nombre}{v.enfermedadPrevenida ? <span className="text-stone-500"> · {v.enfermedadPrevenida}</span> : null}
                      {esLote && <span className="text-stone-500"> · {v.animales} de {d.cantidad} animales</span>}
                    </span>
                    <span className="text-xs text-stone-500 whitespace-nowrap">{new Date(v.fechaAplicacion + "T12:00:00").toLocaleDateString("es-VE")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 min-w-0">
          {d.esMia ? (
            compradorChat !== undefined ? (
              <Chat
                publicacionId={d.id}
                comprador={compradorChat}
                titulo={`Chat con ${compradores.get(compradorChat) ?? "la finca compradora"}`}
                puedeEscribir={puedeNegociar}
                conCondiciones={conCondiciones}
                cabecera={compradores.size > 1 ? (
                  <select className={`${INPUT} mb-3`} value={compradorChat} onChange={(e) => setCompradorChat(e.target.value)}>
                    {Array.from(compradores.entries()).map(([cid, nombre]) => <option key={cid} value={cid}>{nombre}</option>)}
                  </select>
                ) : null}
              />
            ) : (
              <div className={`${CAJA} p-6 text-sm text-stone-500`}>Cuando una finca te escriba u oferte, la conversación aparece aquí.</div>
            )
          ) : (
            <Chat
              publicacionId={d.id}
              titulo={`Chat con ${d.vendedor.nombre}`}
              puedeEscribir={puedeNegociar && (activa || !!d.misOfertas?.length)}
              conCondiciones={conCondiciones}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Calificar({ onCalificar }: { onCalificar: (estrellas: number, comentario?: string) => void }) {
  const [estrellas, setEstrellas] = useState(0);
  const [comentario, setComentario] = useState("");
  return (
    <div className="pt-3 border-t border-stone-100 space-y-2">
      <div className="text-xs font-bold text-stone-700">¿Cómo fue el trato?</div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" onClick={() => setEstrellas(i)} className="cursor-pointer" aria-label={`${i} estrellas`}>
            <svg className={`w-7 h-7 ${i <= estrellas ? "text-amber-400" : "text-stone-300"}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
            </svg>
          </button>
        ))}
      </div>
      <input className={INPUT} placeholder="Comentario (opcional)" value={comentario} onChange={(e) => setComentario(e.target.value)} maxLength={500} />
      <button className={BOTON} disabled={estrellas === 0} onClick={() => onCalificar(estrellas, comentario || undefined)}>Calificar</button>
    </div>
  );
}

function EditarPublicacion({ d, onGuardar }: { d: DetallePublicacionMercado; onGuardar: (req: PublicarMercadoRequest) => void }) {
  const [precio, setPrecio] = useState(String(d.precio));
  const [tipoPrecio, setTipoPrecio] = useState(d.tipoPrecio);
  const [categoria, setCategoria] = useState(d.categoria ?? "PADROTE");
  const [estadoRegion, setEstadoRegion] = useState(d.estadoRegion ?? "");
  const [municipio, setMunicipio] = useState(d.municipio ?? "");
  const [descripcion, setDescripcion] = useState(d.descripcion ?? "");
  const [negociable, setNegociable] = useState(d.negociable);
  return (
    <form
      className="grid md:grid-cols-2 gap-3 p-4 rounded-2xl bg-stone-50 dark:bg-white/5"
      onSubmit={(e) => {
        e.preventDefault();
        onGuardar({ precio: Number(precio), tipoPrecio, categoria, estadoRegion, municipio, descripcion, negociable, titulo: d.titulo });
      }}
    >
      <div className="grid grid-cols-2 gap-2">
        <input type="number" min="0" className={INPUT} value={precio} onChange={(e) => setPrecio(e.target.value)} />
        <select className={INPUT} value={tipoPrecio} onChange={(e) => setTipoPrecio(e.target.value as "POR_CABEZA" | "POR_KG")}>
          <option value="POR_CABEZA">Por cabeza</option>
          <option value="POR_KG">Por kilo</option>
        </select>
      </div>
      <select className={INPUT} value={categoria} onChange={(e) => setCategoria(e.target.value as typeof categoria)}>
        {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
      </select>
      <select className={INPUT} value={estadoRegion} onChange={(e) => setEstadoRegion(e.target.value)}>
        {ESTADOS_VE.map((e) => <option key={e} value={e}>{e}</option>)}
      </select>
      <input className={INPUT} placeholder="Municipio" value={municipio} onChange={(e) => setMunicipio(e.target.value)} />
      <textarea className={`${INPUT} md:col-span-2`} rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input type="checkbox" checked={negociable} onChange={(e) => setNegociable(e.target.checked)} /> Acepto ofertas
      </label>
      <button type="submit" className={`${BOTON} md:justify-self-end`}>Guardar cambios</button>
    </form>
  );
}
