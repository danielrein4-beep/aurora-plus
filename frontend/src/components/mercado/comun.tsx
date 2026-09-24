import { useCallback, useEffect, useState } from "react";
import {
  obtenerCondicionesMercado, aceptarCondicionesMercado,
  type CategoriaMercado, type PerfilMercado,
} from "../../api";

export const CATEGORIAS: { id: CategoriaMercado; nombre: string; descripcion: string; fondo: string }[] = [
  { id: "PADROTE", nombre: "Padrotes", descripcion: "Toros reproductores listos para servicio", fondo: "from-amber-900 via-amber-800 to-orange-700" },
  { id: "VACA_PARIDA", nombre: "Vacas paridas", descripcion: "Con su cría al pie", fondo: "from-emerald-900 via-emerald-800 to-teal-700" },
  { id: "VACA_ORDENO", nombre: "Vacas de ordeño", descripcion: "En producción de leche", fondo: "from-sky-900 via-sky-800 to-cyan-700" },
  { id: "NOVILLA", nombre: "Novillas", descripcion: "Hembras jóvenes de reemplazo", fondo: "from-rose-900 via-rose-800 to-pink-700" },
  { id: "MAUTE", nombre: "Mautes y becerros", descripcion: "Destetados para levante", fondo: "from-lime-900 via-lime-800 to-green-700" },
  { id: "CEBA", nombre: "Ganado de ceba", descripcion: "Para engorde y matadero", fondo: "from-stone-800 via-stone-700 to-amber-800" },
];

export const nombreCategoria = (id: string | null | undefined) => CATEGORIAS.find((c) => c.id === id)?.nombre ?? "Sin categoría";

/** Razas más comunes en Venezuela; la vitrina suma las que publiquen las fincas. */
export const RAZAS_COMUNES = [
  "Brahman", "Gyr", "Carora", "Holstein", "Pardo Suizo", "Simmental", "Nelore", "Guzerat", "Senepol", "Angus",
  "Romosinuano", "Criollo Limonero", "Girolando", "Jersey", "Mestizo",
];

export const ESTADOS_VE = [
  "Amazonas", "Anzoátegui", "Apure", "Aragua", "Barinas", "Bolívar", "Carabobo", "Cojedes", "Delta Amacuro", "Distrito Capital",
  "Falcón", "Guárico", "La Guaira", "Lara", "Mérida", "Miranda", "Monagas", "Nueva Esparta", "Portuguesa", "Sucre", "Táchira",
  "Trujillo", "Yaracuy", "Zulia",
];

export const dinero = new Intl.NumberFormat("es-VE", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
export const numero = new Intl.NumberFormat("es-VE", { maximumFractionDigits: 1 });

export function precioTexto(p: { precio: number; tipoPrecio: string }) {
  return `${dinero.format(p.precio)}${p.tipoPrecio === "POR_KG" ? " / kg" : ""}`;
}

export function edadTexto(meses: number | null) {
  if (meses == null) return null;
  if (meses < 1) return "Menos de 1 mes";
  if (meses < 24) return `${meses} ${meses === 1 ? "mes" : "meses"}`;
  return `${Math.floor(meses / 12)} años`;
}

export function sexoTexto(sexo: string) {
  return sexo === "MACHO" ? "Macho" : sexo === "HEMBRA" ? "Hembra" : sexo;
}

export function antiguedadTexto(p: PerfilMercado) {
  if (p.diasEnAurora == null) return null;
  if (p.diasEnAurora < 30) return "Nuevo en Aurora";
  if ((p.mesesEnAurora ?? 0) < 12) return `${p.mesesEnAurora} ${p.mesesEnAurora === 1 ? "mes" : "meses"} en Aurora`;
  const anios = Math.floor((p.mesesEnAurora ?? 0) / 12);
  return `${anios} ${anios === 1 ? "año" : "años"} en Aurora`;
}

export function fechaCorta(iso: string) {
  // Las ofertas guardan solo el día: sin hora, "2026-09-24" se leería como medianoche UTC y saldría el día anterior.
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return new Date(`${iso}T12:00:00`).toLocaleDateString("es-VE", { day: "numeric", month: "short" });
  }
  return new Date(iso).toLocaleString("es-VE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function mensajeError(e: unknown) {
  return e instanceof Error ? e.message : "Ocurrió un error";
}

/** Reduce la foto en el navegador antes de subirla: las fotos del teléfono pesan varios MB. */
export function comprimirImagen(fuente: File | string, ladoMax: number, calidad: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const dibujar = (src: string) => {
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
      img.src = src;
    };
    if (typeof fuente === "string") { dibujar(fuente); return; }
    const lector = new FileReader();
    lector.onerror = () => reject(new Error("No se pudo leer la foto"));
    lector.onload = () => dibujar(String(lector.result));
    lector.readAsDataURL(fuente);
  });
}

// ─────────────────────────── piezas visuales ───────────────────────────

export const CAJA = "rounded-3xl bg-white dark:bg-[#0c1f17] border border-stone-200/80 dark:border-white/10 shadow-sm";
export const INPUT = "w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#0a1a13] text-stone-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/30";
export const BOTON = "px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold cursor-pointer disabled:opacity-50 transition-colors";
export const BOTON_ORO = "px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 text-sm font-bold cursor-pointer disabled:opacity-50 transition-colors";
export const BOTON_SUAVE = "px-4 py-2.5 rounded-xl border border-stone-200 dark:border-white/10 text-stone-700 dark:text-white/80 text-sm font-bold cursor-pointer hover:bg-stone-50 dark:hover:bg-white/5 disabled:opacity-50";

export function SelloVerificado({ pequeno }: { pequeno?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-bold ${pequeno ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-[11px]"}`}
      title="Cliente con pagos confirmados en Aurora Plus"
    >
      <svg className={pequeno ? "w-3 h-3" : "w-3.5 h-3.5"} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2l2.4 2.2 3.2-.5.9 3.1 2.9 1.5-1 3.1 1 3.1-2.9 1.5-.9 3.1-3.2-.5L12 22l-2.4-2.2-3.2.5-.9-3.1-2.9-1.5 1-3.1-1-3.1 2.9-1.5.9-3.1 3.2.5L12 2zm-1.2 13.6l5.5-5.5-1.4-1.4-4.1 4.1-2-2-1.4 1.4 3.4 3.4z" />
      </svg>
      Verificado por Aurora Plus
    </span>
  );
}

export function Estrellas({ valor, total }: { valor: number | null; total?: number }) {
  if (valor == null) return <span className="text-[11px] text-stone-400">Sin calificaciones</span>;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-stone-600 dark:text-white/60">
      <span className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <svg key={i} className={`w-3.5 h-3.5 ${i <= Math.round(valor) ? "text-amber-500" : "text-stone-300 dark:text-white/20"}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
          </svg>
        ))}
      </span>
      <span className="font-bold">{valor}</span>
      {total != null && <span>({total})</span>}
    </span>
  );
}

/** Tarjeta de confianza de una finca: nombre (o alias), sello, antigüedad, tratos y estrellas. */
export function PerfilFinca({ perfil, rol }: { perfil: PerfilMercado; rol: "VENDEDOR" | "COMPRADOR" }) {
  const tratos = rol === "VENDEDOR" ? perfil.ventas : perfil.compras;
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold text-stone-900 dark:text-white">{perfil.nombre}</span>
        {perfil.verificado && <SelloVerificado pequeno />}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-stone-500 dark:text-white/50">
        {antiguedadTexto(perfil) && <span>{antiguedadTexto(perfil)}</span>}
        <span>{tratos} {rol === "VENDEDOR" ? (tratos === 1 ? "venta" : "ventas") : (tratos === 1 ? "compra" : "compras")} en Aurora</span>
        <Estrellas valor={perfil.calificacion} total={perfil.totalCalificaciones} />
      </div>
      {!perfil.revelado && (
        <p className="text-[11px] text-stone-400">El nombre de la finca se muestra al cerrar el trato.</p>
      )}
    </div>
  );
}

// ─────────────────────────── condiciones del mercado ───────────────────────────

/** Pide aceptar las condiciones una sola vez antes de publicar, ofertar o escribir. */
export function useCondiciones() {
  const [aceptadas, setAceptadas] = useState<boolean | null>(null);
  const [pendiente, setPendiente] = useState<null | (() => void)>(null);

  useEffect(() => {
    obtenerCondicionesMercado().then((c) => setAceptadas(c.aceptadas)).catch(() => setAceptadas(false));
  }, []);

  const conCondiciones = useCallback((accion: () => void) => {
    if (aceptadas) accion();
    else setPendiente(() => accion);
  }, [aceptadas]);

  const modal = pendiente ? (
    <ModalCondiciones
      onAceptar={async () => {
        await aceptarCondicionesMercado();
        setAceptadas(true);
        const accion = pendiente;
        setPendiente(null);
        accion();
      }}
      onCerrar={() => setPendiente(null)}
    />
  ) : null;

  return { aceptadas, conCondiciones, modal };
}

function ModalCondiciones({ onAceptar, onCerrar }: { onAceptar: () => Promise<void>; onCerrar: () => void }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm">
      <div className={`${CAJA} w-full max-w-lg p-7 space-y-4`}>
        <h3 className="text-xl font-bold text-stone-900 dark:text-white font-['Outfit']">Condiciones del Mercado Ganadero</h3>
        <ul className="space-y-2.5 text-sm text-stone-700 dark:text-white/75">
          <li><strong>Solo fincas de Aurora.</strong> Aquí compran y venden fincas con Aurora Ganadería, identificadas y verificadas.</li>
          <li><strong>Anonimato hasta cerrar.</strong> Mientras negocian no se ven los nombres ni los datos de contacto; al aceptar una oferta, cada parte ve los datos de la otra para coordinar la entrega.</li>
          <li><strong>Comisión del 1% a cada parte.</strong> Al cerrar un trato, Aurora cobra 1% al vendedor y 1% al comprador en su próxima factura.</li>
          <li><strong>El trato que nace aquí, se cierra aquí.</strong> Si un negocio que empezó en el mercado se cierra por fuera, la comisión aplica igual y la finca puede perder el acceso al mercado.</li>
          <li><strong>Sin datos de contacto en el chat.</strong> Teléfonos, redes, correos y enlaces se ocultan automáticamente y quedan registrados.</li>
        </ul>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button className={BOTON_SUAVE} onClick={onCerrar}>Ahora no</button>
          <button
            className={BOTON}
            disabled={enviando}
            onClick={async () => {
              setEnviando(true);
              setError(null);
              try { await onAceptar(); } catch (e) { setError(mensajeError(e)); setEnviando(false); }
            }}
          >
            {enviando ? "Guardando..." : "Acepto las condiciones"}
          </button>
        </div>
      </div>
    </div>
  );
}
