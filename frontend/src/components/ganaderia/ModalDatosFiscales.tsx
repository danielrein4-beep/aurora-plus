import { useEffect, useState } from "react";
import { IconFileText } from "../../Icons";
import { obtenerDatosFiscalesNegocio, actualizarDatosFiscalesNegocio } from "../../api";
import type { Notificar } from "./tipos";

interface Props {
  notificar: Notificar;
  onCerrar: () => void;
}

/** Datos fiscales opcionales (RIF, razón social, domicilio) que salen en las notas de entrega. */
export default function ModalDatosFiscales({ notificar, onCerrar }: Props) {
  const [formDatosFiscales, setFormDatosFiscales] = useState({ rif: "", razonSocial: "", domicilioFiscal: "" });

  // Precarga lo que ya está guardado para el negocio.
  useEffect(() => {
    obtenerDatosFiscalesNegocio().then(d => setFormDatosFiscales({
      rif: d.rif || "", razonSocial: d.razonSocial || "", domicilioFiscal: d.domicilioFiscal || "",
    })).catch(() => {});
  }, []);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="apple-glass modal-siempre-oscuro rounded-3xl p-6 sm:p-7 max-w-md w-full border border-purple-500/40 text-left space-y-4 shadow-2xl bg-slate-900/95 text-white">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <IconFileText size={22} className="text-purple-400" />
            <div>
              <h3 className="font-['Outfit'] font-black text-lg text-white">
                Datos Fiscales (Opcional)
              </h3>
              <p className="text-[11px] text-slate-400">Se estampan en tus notas de entrega de ventas y despachos de leche</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onCerrar()}
            className="text-slate-400 hover:text-white text-lg p-1 cursor-pointer">
            ✕
          </button>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await actualizarDatosFiscalesNegocio(formDatosFiscales);
              notificar("Datos fiscales actualizados.");
              onCerrar();
            } catch {
              notificar("No se pudieron guardar los datos fiscales — revisa tu conexión.");
            }
          }}
          className="space-y-3.5 text-xs"
        >
          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">Razón Social / Nombre del Negocio</label>
            <input
              type="text"
              value={formDatosFiscales.razonSocial}
              onChange={e => setFormDatosFiscales({ ...formDatosFiscales, razonSocial: e.target.value })}
              placeholder="Ej. Agropecuaria El Roble, C.A."
              className="w-full p-2.5 rounded-xl bg-slate-800/90 border border-white/15 text-white focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">RIF</label>
            <input
              type="text"
              value={formDatosFiscales.rif}
              onChange={e => setFormDatosFiscales({ ...formDatosFiscales, rif: e.target.value })}
              placeholder="Ej. J-12345678-9"
              className="w-full p-2.5 rounded-xl bg-slate-800/90 border border-white/15 text-white font-mono focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">Domicilio Fiscal</label>
            <textarea
              rows={2}
              value={formDatosFiscales.domicilioFiscal}
              onChange={e => setFormDatosFiscales({ ...formDatosFiscales, domicilioFiscal: e.target.value })}
              placeholder="Dirección de la finca o del negocio"
              className="w-full p-2.5 rounded-xl bg-slate-800/90 border border-white/15 text-white focus:border-purple-500 focus:outline-none"
            />
          </div>
          <p className="text-[10px] text-slate-400">
            Ninguno de estos datos es obligatorio — las notas de entrega se generan igual sin ellos, solo sin esa línea.
          </p>

          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => onCerrar()}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer">
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-cyber-neon text-white font-bold px-6 py-2.5 rounded-xl cursor-pointer">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
