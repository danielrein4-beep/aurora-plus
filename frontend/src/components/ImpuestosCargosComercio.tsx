import { useEffect, useState } from "react";
import { actualizarImpuestosNegocio, obtenerImpuestosNegocio, type ImpuestosNegocio } from "../api";

type Toast = (m: string, t?: "success" | "error" | "info") => void;

function Interruptor({ activo, onChange, deshabilitado }: { activo: boolean; onChange: (v: boolean) => void; deshabilitado?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      disabled={deshabilitado}
      onClick={() => onChange(!activo)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
        activo ? "bg-teal-500" : "bg-slate-300 dark:bg-slate-700"
      }`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-[#FFFFFF] shadow transition-transform ${activo ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

function Fila({ titulo, detalle, children }: { titulo: string; detalle: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className="min-w-0">
        <div className="text-sm font-bold text-slate-900 dark:text-white">{titulo}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{detalle}</div>
      </div>
      <div className="flex-shrink-0 pt-0.5">{children}</div>
    </div>
  );
}

function Opcion({ activo, titulo, detalle, onClick, deshabilitado }: { activo: boolean; titulo: string; detalle: string; onClick: () => void; deshabilitado?: boolean }) {
  return (
    <button
      type="button"
      disabled={deshabilitado}
      onClick={onClick}
      className={`text-left p-3 rounded-xl border transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
        activo ? "border-teal-500 bg-teal-50/80 dark:bg-teal-500/10" : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
      }`}
    >
      <div className="text-[13px] font-bold text-slate-900 dark:text-white">{titulo}</div>
      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{detalle}</div>
    </button>
  );
}

/** Ejemplo en vivo con un producto de 10 en la moneda base, para que el dueño vea qué va a pasar. */
function Ejemplo({ c }: { c: ImpuestosNegocio }) {
  const precio = 10;
  const a = c.alicuotaIva / 100;
  const base = !c.cobraIva ? precio : c.preciosIncluyenIva ? precio / (1 + a) : precio;
  const iva = c.cobraIva ? (c.preciosIncluyenIva ? precio - base : base * a) : 0;
  const subtotal = base + iva;
  const igtf = c.igtfActivo ? subtotal * (c.alicuotaIgtf / 100) : 0;
  const fila = (t: string, v: number, fuerte = false) => (
    <div className={`flex justify-between ${fuerte ? "font-black text-slate-900 dark:text-white pt-1.5 mt-1.5 border-t border-slate-200 dark:border-slate-700" : ""}`}>
      <span>{t}</span>
      <span className="font-mono">{v.toFixed(2)}</span>
    </div>
  );
  return (
    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Así se cobra un producto de 10,00</div>
      {c.cobraIva ? fila("Base imponible", base) : fila("Precio", base)}
      {c.cobraIva && fila(`IVA ${c.alicuotaIva}%`, iva)}
      {fila("Pagando en bolívares", subtotal, true)}
      {c.igtfActivo && (
        <>
          {fila(`IGTF ${c.alicuotaIgtf}% (solo si paga en divisas)`, igtf)}
          {fila("Pagando en divisas", subtotal + igtf, true)}
        </>
      )}
    </div>
  );
}

/**
 * IVA, IGTF y delivery del negocio. Todo apagado por defecto: sin tocar nada, el POS cobra igual
 * que siempre. El cálculo que vale lo hace el servidor al cobrar; esta pantalla solo lo configura.
 */
export default function ImpuestosCargosComercio({ esDuenoAdmin, mostrarToast }: { esDuenoAdmin: boolean; mostrarToast: Toast }) {
  const [config, setConfig] = useState<ImpuestosNegocio | null>(null);
  const [original, setOriginal] = useState<ImpuestosNegocio | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    obtenerImpuestosNegocio()
      .then((c) => { setConfig(c); setOriginal(c); })
      .catch(() => mostrarToast("No se pudo cargar la configuración de impuestos.", "error"));
  }, []);

  if (!config) return <div className="p-8 text-center text-xs text-slate-400">Cargando...</div>;

  const cambiar = (parcial: Partial<ImpuestosNegocio>) => setConfig({ ...config, ...parcial });
  const hayCambios = JSON.stringify(config) !== JSON.stringify(original);
  const soloLectura = !esDuenoAdmin;

  const guardar = async () => {
    if (config.cobraIva && !(config.alicuotaIva > 0 && config.alicuotaIva < 100)) {
      mostrarToast("La alícuota de IVA debe estar entre 0 y 100.", "error");
      return;
    }
    setGuardando(true);
    try {
      const guardado = await actualizarImpuestosNegocio(config);
      setConfig(guardado);
      setOriginal(guardado);
      mostrarToast("Impuestos y cargos guardados.", "success");
    } catch (err: any) {
      mostrarToast(err?.message || "No se pudo guardar.", "error");
    } finally {
      setGuardando(false);
    }
  };

  const inputNumero = "w-20 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-right font-mono text-slate-900 dark:text-white disabled:opacity-60";

  return (
    <div className="max-w-2xl mx-auto w-full space-y-4">
      <div>
        <h3 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">Impuestos y cargos</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Si tu negocio no factura con IVA, deja todo apagado: el punto de venta cobra igual que siempre.
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">IVA</span>
        <Fila titulo="Cobrar IVA" detalle="Las ventas llevan IVA y salen desglosadas en el libro de ventas. Los productos marcados como exentos no lo llevan.">
          <Interruptor activo={config.cobraIva} onChange={(v) => cambiar({ cobraIva: v })} deshabilitado={soloLectura} />
        </Fila>
        {config.cobraIva && (
          <>
            <Fila titulo="Alícuota" detalle="La general en Venezuela es 16%.">
              <div className="flex items-center gap-1.5">
                <input
                  type="number" min={0.01} max={99} step={0.01} value={config.alicuotaIva} disabled={soloLectura}
                  onChange={(e) => cambiar({ alicuotaIva: Number(e.target.value) })}
                  className={inputNumero}
                />
                <span className="text-sm text-slate-500">%</span>
              </div>
            </Fila>
            <div className="py-3 space-y-2">
              <div className="text-sm font-bold text-slate-900 dark:text-white">Tus precios de venta</div>
              <div className="grid sm:grid-cols-2 gap-2">
                <Opcion
                  activo={config.preciosIncluyenIva} deshabilitado={soloLectura}
                  onClick={() => cambiar({ preciosIncluyenIva: true })}
                  titulo="Ya incluyen el IVA"
                  detalle="Lo más común en tienda: el cliente paga el precio de la etiqueta y el sistema separa el IVA."
                />
                <Opcion
                  activo={!config.preciosIncluyenIva} deshabilitado={soloLectura}
                  onClick={() => cambiar({ preciosIncluyenIva: false })}
                  titulo="El IVA se suma al cobrar"
                  detalle="Usual en ventas al mayor: el precio es la base y el IVA se agrega en la caja."
                />
              </div>
            </div>
            <div className="py-3 space-y-2 border-t border-slate-100 dark:border-slate-800">
              <div className="text-sm font-bold text-slate-900 dark:text-white">En tu catálogo online</div>
              <div className="grid sm:grid-cols-2 gap-2">
                <Opcion
                  activo={config.catalogoPrecioConIva} deshabilitado={soloLectura}
                  onClick={() => cambiar({ catalogoPrecioConIva: true })}
                  titulo="Precio final con IVA"
                  detalle="El cliente ve lo que va a pagar."
                />
                <Opcion
                  activo={!config.catalogoPrecioConIva} deshabilitado={soloLectura}
                  onClick={() => cambiar({ catalogoPrecioConIva: false })}
                  titulo='Precio sin IVA, con "+ IVA"'
                  detalle="Útil si vendes a empresas que miran la base."
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
              En el punto de venta el cajero puede quitar el IVA de una venta con una casilla. Esa venta queda marcada en el libro con el nombre de quien lo quitó.
            </p>
          </>
        )}
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">IGTF</span>
        <Fila titulo="Cobrar IGTF en pagos con divisas" detalle="Se suma solo sobre lo que el cliente paga en dólares, pesos u otra divisa. Los pagos en bolívares no lo llevan.">
          <Interruptor activo={config.igtfActivo} onChange={(v) => cambiar({ igtfActivo: v })} deshabilitado={soloLectura} />
        </Fila>
        {config.igtfActivo && (
          <Fila titulo="Alícuota" detalle="Hoy es 3%.">
            <div className="flex items-center gap-1.5">
              <input
                type="number" min={0.01} max={99} step={0.01} value={config.alicuotaIgtf} disabled={soloLectura}
                onChange={(e) => cambiar({ alicuotaIgtf: Number(e.target.value) })}
                className={inputNumero}
              />
              <span className="text-sm text-slate-500">%</span>
            </div>
          </Fila>
        )}
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Delivery</span>
        <Fila titulo="Costo de envío por defecto" detalle="Es el monto que sugiere la casilla Delivery del punto de venta y el que ve el cliente en tu catálogo. En el POS se puede cambiar en cada venta.">
          <input
            type="number" min={0} step={0.5} value={config.costoEnvioDelivery ?? 0} disabled={soloLectura}
            onChange={(e) => cambiar({ costoEnvioDelivery: Math.max(0, Number(e.target.value)) })}
            className={inputNumero}
          />
        </Fila>
      </div>

      <Ejemplo c={config} />

      {esDuenoAdmin ? (
        <button
          type="button" onClick={guardar} disabled={guardando || !hayCambios}
          className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {guardando ? "Guardando..." : hayCambios ? "Guardar impuestos y cargos" : "Sin cambios"}
        </button>
      ) : (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">Solo el Dueño o Administrador puede cambiar los impuestos.</p>
      )}
    </div>
  );
}
