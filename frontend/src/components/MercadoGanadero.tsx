import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import {
  listarMercadoGanadero, listarMisPublicacionesMercado, obtenerPublicacionMercado, publicarEnMercado,
  editarPublicacionMercado, retirarPublicacionMercado, ofertarEnMercado, aceptarOfertaMercado, rechazarOfertaMercado,
  recibirAnimalMercado, listarConversacionesMercado, listarMensajesMercado, enviarMensajeMercado,
  obtenerComisionesMercado, listarAnimalesGanaderia,
  type PublicacionMercado, type DetallePublicacionMercado, type FiltrosMercado, type ConversacionMercado,
  type MensajeMercado, type AnimalGanaderia, type PublicarMercadoRequest,
} from "../api";

type Vista = "VITRINA" | "MIAS" | "MENSAJES" | "PUBLICAR";

interface Props {
  /** Dueño o administrador de finca: puede publicar, ofertar, aceptar y escribir. Los demás solo miran. */
  puedeNegociar: boolean;
  /** Avisa a la barra de pestañas cuántos mensajes quedan sin leer. */
  onSinLeer?: (n: number) => void;
}

const dinero = new Intl.NumberFormat("es-VE", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 2 });
const numero = new Intl.NumberFormat("es-VE", { maximumFractionDigits: 1 });

const CAJA = "apple-glass rounded-3xl p-5 border border-slate-200/80 dark:border-white/10";
const INPUT = "w-full px-3 py-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#071a2e]/70 text-slate-900 dark:text-white text-sm";
const BOTON = "px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold cursor-pointer disabled:opacity-50";
const BOTON_SUAVE = "px-4 py-2 rounded-xl border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-white/80 text-sm font-bold cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-50";

function precioTexto(p: { precio: number; tipoPrecio: string }) {
  return `${dinero.format(p.precio)}${p.tipoPrecio === "POR_KG" ? " / kg" : ""}`;
}

function edadTexto(meses: number | null) {
  if (meses == null) return null;
  if (meses < 24) return `${meses} meses`;
  const anios = Math.floor(meses / 12);
  return `${anios} años`;
}

function sexoTexto(sexo: string) {
  return sexo === "MACHO" ? "Macho" : sexo === "HEMBRA" ? "Hembra" : sexo;
}

function fechaCorta(iso: string) {
  // Las ofertas guardan solo el día: sin hora, "2026-09-24" se leería como medianoche UTC y saldría el día anterior.
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return new Date(`${iso}T12:00:00`).toLocaleDateString("es-VE", { day: "numeric", month: "short" });
  }
  return new Date(iso).toLocaleString("es-VE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Reduce la foto en el navegador antes de subirla: las fotos del teléfono pesan varios MB. */
function comprimirImagen(archivo: File, ladoMax: number, calidad: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onerror = () => reject(new Error("No se pudo leer la foto"));
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("El archivo no es una imagen válida"));
      img.onload = () => {
        const escala = Math.min(1, ladoMax / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", calidad));
      };
      img.src = String(lector.result);
    };
    lector.readAsDataURL(archivo);
  });
}

function mensajeError(e: unknown) {
  return e instanceof Error ? e.message : "Ocurrió un error";
}

export default function MercadoGanadero({ puedeNegociar, onSinLeer }: Props) {
  const [vista, setVista] = useState<Vista>("VITRINA");
  const [abierta, setAbierta] = useState<number | null>(null);
  const [chatInicial, setChatInicial] = useState<number | undefined>(undefined);
  const [conversaciones, setConversaciones] = useState<ConversacionMercado[]>([]);
  const [pendienteComisiones, setPendienteComisiones] = useState(0);

  const sinLeer = conversaciones.reduce((s, c) => s + Number(c.sinLeer), 0);

  const cargarConversaciones = useCallback(() => {
    listarConversacionesMercado().then(setConversaciones).catch(() => {});
  }, []);

  useEffect(() => {
    cargarConversaciones();
    obtenerComisionesMercado().then((c) => setPendienteComisiones(Number(c.pendiente))).catch(() => {});
    const intervalo = setInterval(cargarConversaciones, 20_000);
    return () => clearInterval(intervalo);
  }, [cargarConversaciones]);

  useEffect(() => { onSinLeer?.(sinLeer); }, [sinLeer, onSinLeer]);

  const abrir = (id: number, comprador?: number) => {
    setChatInicial(comprador);
    setAbierta(id);
  };

  if (abierta != null) {
    return (
      <DetallePublicacion
        id={abierta}
        compradorInicial={chatInicial}
        puedeNegociar={puedeNegociar}
        onVolver={() => { setAbierta(null); cargarConversaciones(); }}
        onCambio={cargarConversaciones}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white font-['Outfit']">Mercado ganadero</h2>
          <p className="text-xs text-slate-500 dark:text-white/50">
            Solo fincas con Aurora Ganadería. Publica, negocia por chat y cierra el trato aquí mismo.
          </p>
        </div>
        <div className="flex gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-white/5">
          {([
            ["VITRINA", "Vitrina"],
            ["MIAS", "Mis publicaciones"],
            ["MENSAJES", sinLeer > 0 ? `Mensajes (${sinLeer})` : "Mensajes"],
            ...(puedeNegociar ? [["PUBLICAR", "Publicar animal"]] : []),
          ] as [Vista, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setVista(id)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${vista === id ? "bg-emerald-500 text-white" : "text-slate-600 dark:text-white/60"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {pendienteComisiones > 0 && (
        <p className="text-xs rounded-xl px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200">
          Tienes {dinero.format(pendienteComisiones)} en comisiones del mercado que se sumarán a tu próxima factura de Aurora.
        </p>
      )}

      {vista === "VITRINA" && <Vitrina onAbrir={abrir} />}
      {vista === "MIAS" && <MisPublicaciones onAbrir={abrir} onPublicar={puedeNegociar ? () => setVista("PUBLICAR") : undefined} />}
      {vista === "MENSAJES" && <BandejaMensajes conversaciones={conversaciones} onAbrir={abrir} />}
      {vista === "PUBLICAR" && puedeNegociar && (
        <FormularioPublicacion
          onListo={(id) => { setVista("MIAS"); abrir(id); }}
          onCancelar={() => setVista("VITRINA")}
        />
      )}
    </div>
  );
}

// ─────────────────────────── vitrina ───────────────────────────

function Vitrina({ onAbrir }: { onAbrir: (id: number) => void }) {
  const [filtros, setFiltros] = useState<FiltrosMercado>({ orden: "recientes" });
  const [aplicados, setAplicados] = useState<FiltrosMercado>({ orden: "recientes" });
  const [lista, setLista] = useState<PublicacionMercado[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    setError(null);
    listarMercadoGanadero(aplicados)
      .then((l) => { if (vigente) setLista(l); })
      .catch((e) => { if (vigente) { setLista([]); setError(mensajeError(e)); } });
    return () => { vigente = false; };
  }, [aplicados]);

  const campo = (k: keyof FiltrosMercado, v: string) =>
    setFiltros({ ...filtros, [k]: v === "" ? undefined : ["pesoMin", "pesoMax", "precioMax"].includes(k) ? Number(v) : v });

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => { e.preventDefault(); setAplicados(filtros); }}
        className={`${CAJA} grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 items-end`}
      >
        <div className="col-span-2">
          <label className="text-[11px] text-slate-500 dark:text-white/50">Buscar</label>
          <input className={INPUT} placeholder="Brahman, novillo, nombre de la finca..." value={filtros.q ?? ""} onChange={(e) => campo("q", e.target.value)} />
        </div>
        <div>
          <label className="text-[11px] text-slate-500 dark:text-white/50">Sexo</label>
          <select className={INPUT} value={filtros.sexo ?? ""} onChange={(e) => campo("sexo", e.target.value)}>
            <option value="">Todos</option>
            <option value="MACHO">Machos</option>
            <option value="HEMBRA">Hembras</option>
          </select>
        </div>
        <div>
          <label className="text-[11px] text-slate-500 dark:text-white/50">Peso mín. (kg)</label>
          <input type="number" min="0" className={INPUT} value={filtros.pesoMin ?? ""} onChange={(e) => campo("pesoMin", e.target.value)} />
        </div>
        <div>
          <label className="text-[11px] text-slate-500 dark:text-white/50">Peso máx. (kg)</label>
          <input type="number" min="0" className={INPUT} value={filtros.pesoMax ?? ""} onChange={(e) => campo("pesoMax", e.target.value)} />
        </div>
        <div>
          <label className="text-[11px] text-slate-500 dark:text-white/50">Precio máx. ($)</label>
          <input type="number" min="0" className={INPUT} value={filtros.precioMax ?? ""} onChange={(e) => campo("precioMax", e.target.value)} />
        </div>
        <div>
          <label className="text-[11px] text-slate-500 dark:text-white/50">Ordenar</label>
          <select className={INPUT} value={filtros.orden} onChange={(e) => campo("orden", e.target.value)}>
            <option value="recientes">Más recientes</option>
            <option value="precio_asc">Precio: menor</option>
            <option value="precio_desc">Precio: mayor</option>
            <option value="peso_desc">Más pesados</option>
          </select>
        </div>
        <button type="submit" className={BOTON}>Buscar</button>
      </form>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {lista === null ? (
        <p className="text-sm text-slate-400 p-6 text-center">Cargando vitrina...</p>
      ) : lista.length === 0 ? (
        <div className={`${CAJA} text-center py-10`}>
          <p className="font-bold text-slate-800 dark:text-white">Todavía no hay animales publicados con esos filtros</p>
          <p className="text-xs text-slate-500 dark:text-white/50 mt-1">Cuando otras fincas publiquen, aparecerán aquí.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {lista.map((p) => <TarjetaAnimal key={p.id} p={p} onAbrir={() => onAbrir(p.id)} />)}
        </div>
      )}
    </div>
  );
}

function TarjetaAnimal({ p, onAbrir }: { p: PublicacionMercado; onAbrir: () => void }) {
  const detalles = [p.raza, sexoTexto(p.sexo), edadTexto(p.edadMeses)].filter(Boolean).join(" · ");
  return (
    <button onClick={onAbrir} className="apple-glass rounded-3xl border border-slate-200/80 dark:border-white/10 overflow-hidden text-left cursor-pointer hover:border-emerald-400 transition-all">
      <div className="aspect-[4/3] bg-slate-100 dark:bg-white/5 relative">
        {p.miniatura ? (
          <img src={p.miniatura} alt={p.titulo} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">Sin foto</div>
        )}
        {p.estado !== "ACTIVA" && (
          <span className="absolute top-2 left-2 px-2 py-1 rounded-full text-[10px] font-bold bg-slate-900/80 text-white">
            {p.estado === "VENDIDA" ? "Vendido" : "Retirado"}
          </span>
        )}
        {p.esMia && p.ofertasPendientes > 0 && (
          <span className="absolute top-2 right-2 px-2 py-1 rounded-full text-[10px] font-bold bg-amber-500 text-white">
            {p.ofertasPendientes} oferta(s)
          </span>
        )}
      </div>
      <div className="p-4 space-y-1">
        <div className="font-bold text-slate-900 dark:text-white truncate">{p.titulo}</div>
        <div className="text-xs text-slate-500 dark:text-white/50 truncate">{detalles}</div>
        <div className="flex items-baseline justify-between pt-1">
          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{precioTexto(p)}</span>
          {p.peso != null && <span className="text-xs font-mono text-slate-600 dark:text-white/60">{numero.format(p.peso)} kg</span>}
        </div>
        <div className="text-[11px] text-slate-500 dark:text-white/50 truncate">
          {p.esMia ? "Tu publicación" : p.finca}{p.ubicacion ? ` · ${p.ubicacion}` : ""}
        </div>
      </div>
    </button>
  );
}

function MisPublicaciones({ onAbrir, onPublicar }: { onAbrir: (id: number) => void; onPublicar?: () => void }) {
  const [lista, setLista] = useState<PublicacionMercado[] | null>(null);
  useEffect(() => { listarMisPublicacionesMercado().then(setLista).catch(() => setLista([])); }, []);
  if (lista === null) return <p className="text-sm text-slate-400 p-6 text-center">Cargando...</p>;
  if (lista.length === 0) {
    return (
      <div className={`${CAJA} text-center py-10 space-y-3`}>
        <p className="font-bold text-slate-800 dark:text-white">Aún no has publicado animales</p>
        {onPublicar && <button onClick={onPublicar} className={BOTON}>Publicar mi primer animal</button>}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {lista.map((p) => <TarjetaAnimal key={p.id} p={p} onAbrir={() => onAbrir(p.id)} />)}
    </div>
  );
}

function BandejaMensajes({ conversaciones, onAbrir }: { conversaciones: ConversacionMercado[]; onAbrir: (id: number, comprador?: number) => void }) {
  if (conversaciones.length === 0) {
    return <div className={`${CAJA} text-center py-10 text-sm text-slate-500 dark:text-white/50`}>No tienes conversaciones todavía.</div>;
  }
  return (
    <div className={`${CAJA} divide-y divide-slate-100 dark:divide-white/5 p-0`}>
      {conversaciones.map((c) => (
        <button
          key={`${c.publicacionId}-${c.compradorTenantId}`}
          onClick={() => onAbrir(c.publicacionId, c.soyVendedor ? c.compradorTenantId : undefined)}
          className="w-full flex items-center gap-3 p-4 text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5"
        >
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-white/5 shrink-0">
            {c.miniatura && <img src={c.miniatura} alt="" className="w-full h-full object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex justify-between gap-2">
              <span className="font-bold text-sm text-slate-900 dark:text-white truncate">{c.otraFinca ?? "Finca"} · {c.titulo}</span>
              <span className="text-[10px] text-slate-400 whitespace-nowrap">{fechaCorta(c.ultimaFecha)}</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-white/50 truncate">
              {c.soyVendedor ? "Te quiere comprar · " : "Le compras · "}{c.ultimoMensaje}
            </div>
          </div>
          {Number(c.sinLeer) > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">{c.sinLeer}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────── ficha del animal ───────────────────────────

function DetallePublicacion({ id, compradorInicial, puedeNegociar, onVolver, onCambio }: {
  id: number; compradorInicial?: number; puedeNegociar: boolean; onVolver: () => void; onCambio: () => void;
}) {
  const [d, setD] = useState<DetallePublicacionMercado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fotoGrande, setFotoGrande] = useState(0);
  const [trabajando, setTrabajando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [montoOferta, setMontoOferta] = useState("");
  const [mensajeOferta, setMensajeOferta] = useState("");
  const [compradorChat, setCompradorChat] = useState<number | undefined>(compradorInicial);
  const [editando, setEditando] = useState(false);

  const cargar = useCallback(() => {
    obtenerPublicacionMercado(id).then(setD).catch((e) => setError(mensajeError(e)));
  }, [id]);
  useEffect(() => { cargar(); }, [cargar]);

  const accion = async (fn: () => Promise<DetallePublicacionMercado>, exito: string) => {
    setTrabajando(true);
    setAviso(null);
    try {
      setD(await fn());
      setAviso(exito);
      onCambio();
    } catch (e) {
      setAviso(mensajeError(e));
    } finally {
      setTrabajando(false);
    }
  };

  // Vendedor: por defecto conversa con quien hizo la mejor oferta, si no eligió otro.
  const compradores = useMemo(() => {
    const m = new Map<number, string>();
    (d?.ofertas ?? []).forEach((o) => { if (o.compradorTenantId) m.set(o.compradorTenantId, o.compradorNombre ?? `Finca #${o.compradorTenantId}`); });
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
  if (!d) return <p className="text-sm text-slate-400 p-6 text-center">Cargando...</p>;

  const activa = d.estado === "ACTIVA";
  const ofertaAceptada = d.misOfertas?.find((o) => o.estado === "ACEPTADA");
  const ultimaOfertaMia = d.misOfertas?.[0];
  const datos: [string, string | null][] = [
    ["Raza", d.raza],
    ["Sexo", sexoTexto(d.sexo)],
    ["Edad", edadTexto(d.edadMeses)],
    ["Peso", d.peso != null ? `${numero.format(d.peso)} kg` : null],
    ["Arete", d.arete],
    ["Tipo", d.tipoAnimal],
    ["Ubicación", d.ubicacion],
    ["Publicado", new Date(d.fechaPublicacion + "T12:00:00").toLocaleDateString("es-VE")],
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={onVolver} className={BOTON_SUAVE}>Volver al mercado</button>
        {aviso && <span className="text-xs font-bold text-slate-600 dark:text-white/70">{aviso}</span>}
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        {/* FOTOS */}
        <div className="lg:col-span-3 space-y-3">
          <div className="aspect-[4/3] rounded-3xl overflow-hidden bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10">
            {d.fotos[fotoGrande] ? (
              <img src={d.fotos[fotoGrande].imagen} alt={d.titulo} className="w-full h-full object-contain bg-black/5" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-slate-400">Sin fotos</div>
            )}
          </div>
          {d.fotos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {d.fotos.map((f, i) => (
                <button key={f.id} onClick={() => setFotoGrande(i)} className={`w-20 h-16 rounded-xl overflow-hidden shrink-0 border-2 cursor-pointer ${i === fotoGrande ? "border-emerald-500" : "border-transparent"}`}>
                  <img src={f.imagen} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* DATOS Y PRECIO */}
        <div className="lg:col-span-2 space-y-4">
          <div className={CAJA}>
            <div className="text-xs text-slate-500 dark:text-white/50">{d.esMia ? "Tu publicación" : d.finca}</div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-['Outfit']">{d.titulo}</h2>
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{precioTexto(d)}</div>
            {d.tipoPrecio === "POR_KG" && d.peso != null && (
              <div className="text-xs text-slate-500 dark:text-white/50">Aprox. {dinero.format(d.precio * d.peso)} por el animal</div>
            )}
            <div className="text-xs text-slate-500 dark:text-white/50 mt-1">{d.negociable ? "Precio negociable" : "Precio fijo"}</div>
            {!activa && (
              <div className="mt-3 px-3 py-2 rounded-xl bg-slate-900/80 text-white text-xs font-bold">
                {d.estado === "VENDIDA" ? `Vendido${d.precioFinal != null ? ` por ${dinero.format(d.precioFinal)}` : ""}` : "Publicación retirada"}
              </div>
            )}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-sm">
              {datos.filter(([, v]) => v).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[11px] text-slate-500 dark:text-white/50">{k}</dt>
                  <dd className="font-bold text-slate-800 dark:text-white">{v}</dd>
                </div>
              ))}
            </dl>
            {d.descripcion && <p className="text-sm text-slate-700 dark:text-white/70 mt-4 whitespace-pre-line">{d.descripcion}</p>}
          </div>

          {/* COMPRADOR: ofertar o recibir */}
          {!d.esMia && puedeNegociar && (
            <div className={`${CAJA} space-y-3`}>
              {ofertaAceptada ? (
                ofertaAceptada.traspasado ? (
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Compraste este animal y ya está en tu hato.</p>
                ) : (
                  <>
                    <p className="text-sm text-slate-700 dark:text-white/80">
                      El vendedor aceptó tu oferta de <strong>{dinero.format(ofertaAceptada.monto)}</strong>. Cuando lo tengas, recíbelo en tu hato con su historial de pesos.
                    </p>
                    <button disabled={trabajando} className={BOTON} onClick={() => accion(() => recibirAnimalMercado(ofertaAceptada.id), "Animal agregado a tu hato")}>
                      Recibir en mi hato
                    </button>
                  </>
                )
              ) : activa ? (
                <form
                  className="space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const monto = Number(montoOferta);
                    if (!(monto > 0)) { setAviso("Escribe el monto de tu oferta"); return; }
                    accion(() => ofertarEnMercado(d.id, monto, mensajeOferta || undefined), "Oferta enviada").then(() => { setMontoOferta(""); setMensajeOferta(""); });
                  }}
                >
                  <div className="font-bold text-sm text-slate-900 dark:text-white">Hacer una oferta</div>
                  {ultimaOfertaMia && (
                    <p className="text-xs text-slate-500 dark:text-white/50">
                      Tu última oferta: {dinero.format(ultimaOfertaMia.monto)} ({ultimaOfertaMia.estado.toLowerCase()})
                    </p>
                  )}
                  <input type="number" min="0" step="0.01" className={INPUT} placeholder="Monto total que ofreces ($)" value={montoOferta} onChange={(e) => setMontoOferta(e.target.value)} />
                  <input className={INPUT} placeholder="Mensaje opcional" value={mensajeOferta} onChange={(e) => setMensajeOferta(e.target.value)} />
                  <button type="submit" disabled={trabajando} className={`${BOTON} w-full`}>Enviar oferta</button>
                  <p className="text-[11px] text-slate-500 dark:text-white/50">Si el vendedor la acepta, Aurora cobra 1% del trato en tu próxima factura.</p>
                </form>
              ) : null}
            </div>
          )}

          {/* VENDEDOR: ofertas recibidas */}
          {d.esMia && (
            <div className={`${CAJA} space-y-3`}>
              <div className="flex items-center justify-between">
                <div className="font-bold text-sm text-slate-900 dark:text-white">Ofertas recibidas</div>
                {activa && puedeNegociar && (
                  <div className="flex gap-2">
                    <button className="text-xs font-bold text-slate-600 dark:text-white/70 cursor-pointer" onClick={() => setEditando(!editando)}>
                      {editando ? "Cerrar edición" : "Editar"}
                    </button>
                    <button
                      className="text-xs font-bold text-rose-600 cursor-pointer"
                      onClick={() => { if (confirm("¿Retirar esta publicación del mercado?")) accion(() => retirarPublicacionMercado(d.id), "Publicación retirada"); }}
                    >
                      Retirar
                    </button>
                  </div>
                )}
              </div>
              {editando && activa && <EditarPrecio d={d} onGuardar={(req) => accion(() => editarPublicacionMercado(d.id, req), "Publicación actualizada").then(() => setEditando(false))} />}
              {(d.ofertas ?? []).length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-white/50">Aún no hay ofertas.</p>
              ) : (d.ofertas ?? []).map((o) => (
                <div key={o.id} className={`rounded-2xl border p-3 ${o.estado === "ACEPTADA" ? "border-emerald-400 bg-emerald-500/5" : "border-slate-200/80 dark:border-white/10"}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <button className="font-bold text-sm text-slate-900 dark:text-white cursor-pointer hover:underline text-left" onClick={() => setCompradorChat(o.compradorTenantId)}>
                      {o.compradorNombre}
                    </button>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{dinero.format(o.monto)}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-white/50">{fechaCorta(o.fecha)} · {o.estado.toLowerCase()}</div>
                  {o.mensaje && <p className="text-xs text-slate-700 dark:text-white/70 mt-1">{o.mensaje}</p>}
                  {o.estado === "PENDIENTE" && activa && puedeNegociar && (
                    <div className="flex gap-2 mt-2">
                      <button
                        disabled={trabajando}
                        className={BOTON}
                        onClick={() => {
                          if (confirm(`¿Aceptar ${dinero.format(o.monto)} de ${o.compradorNombre}? El animal quedará vendido y Aurora cobrará 1% a cada parte en la próxima factura.`)) {
                            accion(() => aceptarOfertaMercado(o.id), "Trato cerrado");
                          }
                        }}
                      >
                        Aceptar
                      </button>
                      <button disabled={trabajando} className={BOTON_SUAVE} onClick={() => accion(() => rechazarOfertaMercado(o.id), "Oferta rechazada")}>
                        Rechazar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 space-y-5">
          {d.pesos.length > 0 && (
            <div className={CAJA}>
              <div className="font-bold text-sm text-slate-900 dark:text-white mb-3">Curva de peso</div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={d.pesos.map((p) => ({ fecha: p.fecha, peso: Number(p.pesoKg) }))} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(f: string) => String(f).substring(0, 7)} minTickGap={24} />
                    <YAxis tick={{ fontSize: 10, fill: "#64748b" }} unit=" kg" />
                    <Tooltip formatter={(v) => [`${numero.format(Number(v))} kg`, "Peso"]} />
                    <Line type="monotone" dataKey="peso" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {d.vacunas.length > 0 && (
            <div className={CAJA}>
              <div className="font-bold text-sm text-slate-900 dark:text-white mb-3">Vacunas aplicadas</div>
              <div className="space-y-1.5">
                {d.vacunas.map((v, i) => (
                  <div key={i} className="flex justify-between gap-3 text-sm">
                    <span className="text-slate-800 dark:text-white">{v.nombre}{v.enfermedadPrevenida ? <span className="text-slate-500 dark:text-white/50"> · {v.enfermedadPrevenida}</span> : null}</span>
                    <span className="text-xs text-slate-500 dark:text-white/50 whitespace-nowrap">{new Date(v.fechaAplicacion + "T12:00:00").toLocaleDateString("es-VE")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {d.esMia ? (
            compradorChat !== undefined ? (
              <Chat
                publicacionId={d.id}
                comprador={compradorChat}
                titulo={`Chat con ${compradores.get(compradorChat) ?? "la finca compradora"}`}
                puedeEscribir={puedeNegociar}
                selector={compradores.size > 1 ? (
                  <select className={`${INPUT} mb-2`} value={compradorChat} onChange={(e) => setCompradorChat(Number(e.target.value))}>
                    {Array.from(compradores.entries()).map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
                  </select>
                ) : null}
              />
            ) : (
              <div className={`${CAJA} text-sm text-slate-500 dark:text-white/50`}>Cuando una finca te escriba u oferte, la conversación aparecerá aquí.</div>
            )
          ) : (
            <Chat publicacionId={d.id} titulo={`Chat con ${d.finca}`} puedeEscribir={puedeNegociar && (activa || !!d.misOfertas?.length)} />
          )}
        </div>
      </div>
    </div>
  );
}

function EditarPrecio({ d, onGuardar }: { d: DetallePublicacionMercado; onGuardar: (req: PublicarMercadoRequest) => void }) {
  const [precio, setPrecio] = useState(String(d.precio));
  const [tipoPrecio, setTipoPrecio] = useState(d.tipoPrecio);
  const [ubicacion, setUbicacion] = useState(d.ubicacion ?? "");
  const [descripcion, setDescripcion] = useState(d.descripcion ?? "");
  const [negociable, setNegociable] = useState(d.negociable);
  return (
    <form
      className="space-y-2 p-3 rounded-2xl bg-slate-50 dark:bg-white/5"
      onSubmit={(e) => { e.preventDefault(); onGuardar({ precio: Number(precio), tipoPrecio, ubicacion, descripcion, negociable, titulo: d.titulo }); }}
    >
      <div className="grid grid-cols-2 gap-2">
        <input type="number" min="0" step="0.01" className={INPUT} value={precio} onChange={(e) => setPrecio(e.target.value)} />
        <select className={INPUT} value={tipoPrecio} onChange={(e) => setTipoPrecio(e.target.value as "POR_CABEZA" | "POR_KG")}>
          <option value="POR_CABEZA">Por cabeza</option>
          <option value="POR_KG">Por kilo</option>
        </select>
      </div>
      <input className={INPUT} placeholder="Ubicación" value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} />
      <textarea className={INPUT} rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-white/70">
        <input type="checkbox" checked={negociable} onChange={(e) => setNegociable(e.target.checked)} /> Precio negociable
      </label>
      <button type="submit" className={BOTON}>Guardar cambios</button>
    </form>
  );
}

// ─────────────────────────── chat ───────────────────────────

function Chat({ publicacionId, comprador, titulo, puedeEscribir, selector }: {
  publicacionId: number; comprador?: number; titulo: string; puedeEscribir: boolean; selector?: React.ReactNode;
}) {
  const [mensajes, setMensajes] = useState<MensajeMercado[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vigente = true;
    const cargar = () => listarMensajesMercado(publicacionId, comprador)
      .then((m) => { if (vigente) setMensajes(m); })
      .catch(() => {});
    cargar();
    const intervalo = setInterval(cargar, 5_000);
    return () => { vigente = false; clearInterval(intervalo); };
  }, [publicacionId, comprador]);

  useEffect(() => { finRef.current?.scrollIntoView({ block: "end" }); }, [mensajes.length]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    setError(null);
    try {
      setMensajes(await enviarMensajeMercado(publicacionId, texto.trim(), comprador));
      setTexto("");
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className={`${CAJA} flex flex-col h-[480px]`}>
      <div className="font-bold text-sm text-slate-900 dark:text-white mb-2">{titulo}</div>
      {selector}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {mensajes.length === 0 && (
          <p className="text-xs text-slate-500 dark:text-white/50 text-center mt-8">Escribe para preguntar por el animal. Solo lo leen las dos fincas.</p>
        )}
        {mensajes.map((m) => m.esSistema ? (
          <div key={m.id} className="text-center">
            <span className="inline-block px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-[11px] text-slate-600 dark:text-white/60">{m.contenido}</span>
          </div>
        ) : (
          <div key={m.id} className={`flex ${m.esMio ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.esMio ? "bg-emerald-500 text-white rounded-br-md" : "bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white rounded-bl-md"}`}>
              {!m.esMio && m.emisorNombre && <div className="text-[10px] font-bold opacity-70">{m.emisorNombre}</div>}
              <div className="whitespace-pre-line break-words">{m.contenido}</div>
              <div className={`text-[10px] mt-0.5 ${m.esMio ? "text-white/70" : "text-slate-400"}`}>{fechaCorta(m.fecha)}</div>
            </div>
          </div>
        ))}
        <div ref={finRef} />
      </div>
      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
      {puedeEscribir ? (
        <form onSubmit={enviar} className="flex gap-2 mt-3">
          <input className={INPUT} placeholder="Escribe un mensaje..." value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={2000} />
          <button type="submit" disabled={enviando || !texto.trim()} className={BOTON}>Enviar</button>
        </form>
      ) : (
        <p className="text-[11px] text-slate-500 dark:text-white/50 mt-3">Solo el dueño o el administrador de la finca pueden escribir.</p>
      )}
    </div>
  );
}

// ─────────────────────────── publicar ───────────────────────────

function FormularioPublicacion({ onListo, onCancelar }: { onListo: (id: number) => void; onCancelar: () => void }) {
  const [animales, setAnimales] = useState<AnimalGanaderia[] | null>(null);
  const [publicados, setPublicados] = useState<Set<string>>(new Set());
  const [animalId, setAnimalId] = useState<number | "">("");
  const [titulo, setTitulo] = useState("");
  const [precio, setPrecio] = useState("");
  const [tipoPrecio, setTipoPrecio] = useState<"POR_CABEZA" | "POR_KG">("POR_CABEZA");
  const [ubicacion, setUbicacion] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [negociable, setNegociable] = useState(true);
  const [fotos, setFotos] = useState<string[]>([]);
  const [miniatura, setMiniatura] = useState<string | undefined>(undefined);
  const [procesandoFotos, setProcesandoFotos] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listarAnimalesGanaderia("ACTIVO").then(setAnimales).catch(() => setAnimales([]));
    listarMisPublicacionesMercado()
      .then((l) => setPublicados(new Set(l.filter((p) => p.estado === "ACTIVA").map((p) => p.arete))))
      .catch(() => {});
  }, []);

  const animal = animales?.find((a) => a.id === animalId);

  const agregarFotos = async (archivos: FileList | null) => {
    if (!archivos || archivos.length === 0) return;
    setProcesandoFotos(true);
    setError(null);
    try {
      const nuevas = [...fotos];
      let mini = miniatura;
      for (const archivo of Array.from(archivos).slice(0, 6 - fotos.length)) {
        nuevas.push(await comprimirImagen(archivo, 1280, 0.78));
        if (!mini) mini = await comprimirImagen(archivo, 480, 0.7);
      }
      setFotos(nuevas);
      setMiniatura(mini);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setProcesandoFotos(false);
    }
  };

  const quitarFoto = (i: number) => {
    const nuevas = fotos.filter((_, j) => j !== i);
    setFotos(nuevas);
    if (i === 0) setMiniatura(undefined); // se regenera al guardar desde la nueva portada
  };

  const publicar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!animalId) { setError("Elige el animal"); return; }
    if (!(Number(precio) > 0)) { setError("Escribe el precio"); return; }
    if (fotos.length === 0) { setError("Agrega al menos una foto"); return; }
    setGuardando(true);
    setError(null);
    try {
      const portada = miniatura ?? await miniaturaDesde(fotos[0]);
      const creada = await publicarEnMercado({
        animalId: Number(animalId), titulo: titulo || undefined, precio: Number(precio), tipoPrecio,
        ubicacion: ubicacion || undefined, descripcion: descripcion || undefined, negociable, fotos, miniatura: portada,
      });
      onListo(creada.id);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={publicar} className="grid lg:grid-cols-2 gap-5">
      <div className={`${CAJA} space-y-3`}>
        <div className="font-bold text-slate-900 dark:text-white">1. El animal</div>
        <select className={INPUT} value={animalId} onChange={(e) => setAnimalId(e.target.value ? Number(e.target.value) : "")}>
          <option value="">{animales === null ? "Cargando tu hato..." : "Elige un animal activo de tu hato"}</option>
          {(animales ?? []).filter((a) => !publicados.has(a.arete)).map((a) => (
            <option key={a.id} value={a.id}>
              {a.arete}{a.nombre ? ` · ${a.nombre}` : ""} · {a.raza ?? "sin raza"} · {sexoTexto(a.sexo)}{a.pesoActual ? ` · ${a.pesoActual} kg` : ""}
            </option>
          ))}
        </select>
        {animal && (
          <p className="text-xs text-slate-500 dark:text-white/50">
            Se mostrará su raza, sexo, edad, peso actual, curva de peso y vacunas registradas en Aurora.
          </p>
        )}
        <input className={INPUT} placeholder={animal ? `Título (ej. Toro ${animal.raza ?? ""} reproductor)` : "Título de la publicación"} value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} />
        <textarea className={INPUT} rows={4} placeholder="Descripción: genética, carácter, alimentación, por qué lo vendes..." value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={2000} />

        <div className="font-bold text-slate-900 dark:text-white pt-2">2. Precio y ubicación</div>
        <div className="grid grid-cols-2 gap-3">
          <input type="number" min="0" step="0.01" className={INPUT} placeholder="Precio ($)" value={precio} onChange={(e) => setPrecio(e.target.value)} />
          <select className={INPUT} value={tipoPrecio} onChange={(e) => setTipoPrecio(e.target.value as "POR_CABEZA" | "POR_KG")}>
            <option value="POR_CABEZA">Por cabeza</option>
            <option value="POR_KG">Por kilo</option>
          </select>
        </div>
        <input className={INPUT} placeholder="Estado y municipio (ej. Barinas, Obispos)" value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} maxLength={120} />
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-white/70">
          <input type="checkbox" checked={negociable} onChange={(e) => setNegociable(e.target.checked)} /> Acepto ofertas por debajo del precio
        </label>
      </div>

      <div className={`${CAJA} space-y-3`}>
        <div className="font-bold text-slate-900 dark:text-white">3. Fotos ({fotos.length}/6)</div>
        <div className="grid grid-cols-3 gap-2">
          {fotos.map((f, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-white/5">
              <img src={f} alt="" className="w-full h-full object-cover" />
              {i === 0 && <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-bold">Portada</span>}
              <button type="button" onClick={() => quitarFoto(i)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs cursor-pointer">x</button>
            </div>
          ))}
          {fotos.length < 6 && (
            <label className="aspect-square rounded-xl border-2 border-dashed border-slate-300 dark:border-white/20 flex items-center justify-center text-xs text-slate-500 dark:text-white/50 cursor-pointer text-center p-2">
              {procesandoFotos ? "Procesando..." : "Agregar fotos"}
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { agregarFotos(e.target.files); e.target.value = ""; }} />
            </label>
          )}
        </div>
        <p className="text-[11px] text-slate-500 dark:text-white/50">
          Buenas fotos de costado y de frente venden más. Solo las ven fincas con Aurora Ganadería.
        </p>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={guardando || procesandoFotos} className={BOTON}>{guardando ? "Publicando..." : "Publicar en el mercado"}</button>
          <button type="button" onClick={onCancelar} className={BOTON_SUAVE}>Cancelar</button>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-white/50">Publicar es gratis. Si cierras un trato aquí, Aurora cobra 1% en tu próxima factura.</p>
      </div>
    </form>
  );
}

function miniaturaDesde(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const escala = Math.min(1, 480 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
