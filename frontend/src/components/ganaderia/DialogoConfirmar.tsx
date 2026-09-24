import { useState } from "react";
import { IconWarning } from "../../Icons";

interface Pedido {
  mensaje: string;
  accion: string;
  peligro: boolean;
  resolver: (ok: boolean) => void;
}

/**
 * Confirmación con el estilo de Aurora en lugar del window.confirm del navegador.
 *
 *   const { confirmar, dialogo } = useConfirmar();
 *   if (!(await confirmar("¿Eliminar el pesaje?", { accion: "Eliminar", peligro: true }))) return;
 *   ...
 *   return <div>{dialogo}...</div>;
 */
export function useConfirmar() {
  const [pedido, setPedido] = useState<Pedido | null>(null);

  const confirmar = (mensaje: string, opciones: { accion?: string; peligro?: boolean } = {}) =>
    new Promise<boolean>(resolver =>
      setPedido({ mensaje, accion: opciones.accion ?? "Confirmar", peligro: opciones.peligro ?? false, resolver }));

  const responder = (ok: boolean) => {
    pedido?.resolver(ok);
    setPedido(null);
  };

  const dialogo = pedido ? (
    <div
      className="fixed inset-0 z-[2050] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={() => responder(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 shadow-xl p-5 space-y-4 text-left"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${pedido.peligro ? "bg-rose-50 text-rose-600" : "bg-teal-50 text-teal-700"}`}>
            <IconWarning size={18} />
          </span>
          <p className="text-sm text-slate-800 leading-relaxed pt-1.5">{pedido.mensaje}</p>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => responder(false)}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => responder(true)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold !text-white cursor-pointer ${pedido.peligro ? "bg-rose-600 hover:bg-rose-700" : "bg-teal-700 hover:bg-teal-800"}`}
          >
            {pedido.accion}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirmar, dialogo };
}
