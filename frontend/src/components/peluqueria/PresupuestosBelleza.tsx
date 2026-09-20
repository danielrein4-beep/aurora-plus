import React, { useState } from "react";
import { PresupuestoBelleza, Especialista } from "./types";
import { IconSparkles, IconPrinter, IconPlus, IconClose, IconChat } from "../../Icons";

interface Props {
  presupuestos: PresupuestoBelleza[];
  especialistas: Especialista[];
  onCrearPresupuesto: (presupuesto: PresupuestoBelleza) => void;
}

export default function PresupuestosBelleza({
  presupuestos,
  especialistas,
  onCrearPresupuesto,
}: Props) {
  const [modalNuevo, setModalNuevo] = useState(false);
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [especialistaNombre, setEspecialistaNombre] = useState(especialistas[0]?.nombre || "");
  const [items, setItems] = useState<{ descripcion: string; cantidad: number; precioUnitarioUSD: number }[]>([
    { descripcion: "Balayage & Decoloración Blondme 20 Vol", cantidad: 1, precioUnitarioUSD: 65 },
    { descripcion: "Tratamiento Sellador Olaplex Paso 1 y 2", cantidad: 1, precioUnitarioUSD: 20 },
    { descripcion: "Matiz Gloss Cenizo 9.1", cantidad: 1, precioUnitarioUSD: 15 },
  ]);
  const [notasTecnicas, setNotasTecnicas] = useState("Prueba de mecha previa requerida. Duración aproximada: 3.5 horas.");

  const handleAgregarFila = () => {
    setItems([...items, { descripcion: "Servicio / Insumo adicional", cantidad: 1, precioUnitarioUSD: 10 }]);
  };

  const handleQuitarFila = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, campo: string, valor: any) => {
    const nuevos = [...items];
    nuevos[index] = { ...nuevos[index], [campo]: valor };
    setItems(nuevos);
  };

  const totalUSD = items.reduce((acc, item) => acc + item.cantidad * item.precioUnitarioUSD, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteNombre.trim() || items.length === 0) return;

    const nuevo: PresupuestoBelleza = {
      id: `pre-${Date.now()}`,
      codigo: `COT-PEL-${Math.floor(1000 + Math.random() * 9000)}`,
      clienteNombre: clienteNombre.trim(),
      clienteTelefono: clienteTelefono.trim() || "+58 412 000-0000",
      especialistaNombre,
      fecha: new Date().toISOString().slice(0, 10),
      validezDias: 15,
      items,
      totalUSD,
      notasTecnicas,
    };

    onCrearPresupuesto(nuevo);
    setModalNuevo(false);
    setClienteNombre("");
    setClienteTelefono("");
  };

  const enviarWhatsAppPresupuesto = (p: PresupuestoBelleza) => {
    const desglose = p.items.map((it) => `• ${it.descripcion} (${it.cantidad}x): $${(it.cantidad * it.precioUnitarioUSD).toFixed(2)}`).join("\n");
    const texto = `Hola ${p.clienteNombre}. Te enviamos tu presupuesto de belleza de *${p.codigo}*:\n\n${desglose}\n\n*TOTAL ESTIMADO: ${p.totalUSD.toFixed(2)} USD*\n\nNotas: ${p.notasTecnicas || "Válido por 15 días"}.\n¿Deseas agendar tu cita para este servicio?`;
    const url = `https://wa.me/${p.clienteTelefono.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="apple-glass rounded-3xl p-6 border border-white/10 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-purple-500/10 via-slate-900/40 to-pink-500/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-mono uppercase tracking-wider mb-2">
            <IconSparkles size={14} />
            <span>Cotizador de Transformaciones & Paquetes</span>
          </div>
          <h2 className="font-['Outfit'] font-black text-2xl sm:text-3xl text-white">
            Presupuestos de Belleza Capilar & Spa
          </h2>
          <p className="text-white/60 text-xs sm:text-sm mt-1">
            Genera presupuestos claros para trabajos de alta complejidad (Balayage, Keratinas, Extensiones, Novias) y compártelos con la clienta por WhatsApp.
          </p>
        </div>

        <button
          onClick={() => setModalNuevo(true)}
          className="btn-cyber-neon px-5 py-2.5 rounded-2xl text-xs font-black text-white flex items-center gap-2 shadow-lg hover:scale-105 transition-all"
        >
          <IconPlus size={16} />
          <span>+ Nuevo Presupuesto</span>
        </button>
      </div>

      {/* Grid de Presupuestos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {presupuestos.map((p) => (
          <div
            key={p.id}
            className="apple-glass rounded-2xl p-5 border border-white/10 hover:border-purple-400/40 transition-all flex flex-col justify-between space-y-4 shadow-lg"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md">
                  {p.codigo}
                </span>
                <span className="text-[11px] text-white/40">{p.fecha}</span>
              </div>

              <h4 className="font-bold text-lg text-white">{p.clienteNombre}</h4>
              <div className="text-white/50 text-xs font-mono">{p.clienteTelefono}</div>
              <div className="text-[11px] text-white/60 mt-1">Especialista: <strong className="text-white/90">{p.especialistaNombre}</strong></div>

              <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5 text-xs">
                {p.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-white/80">
                    <span className="truncate pr-2">{it.descripcion}</span>
                    <span className="font-mono font-bold text-purple-300">
                      ${(it.cantidad * it.precioUnitarioUSD).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-white/40 uppercase">Total Estimado</div>
                <div className="font-mono text-xl font-black text-emerald-400">
                  ${p.totalUSD.toFixed(2)} USD
                </div>
              </div>

              <button
                onClick={() => enviarWhatsAppPresupuesto(p)}
                className="px-3.5 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <span className="flex items-center gap-1.5"><IconChat size={14} /> Enviar WhatsApp</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Nuevo Presupuesto */}
      {modalNuevo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="apple-glass rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-white/20 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-['Outfit'] font-black text-2xl text-white">
                Cotizar Trabajo de Belleza
              </h3>
              <button onClick={() => setModalNuevo(false)} className="text-white/50 hover:text-white">
                <IconClose size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1">Nombre de la Clienta</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Valentina Henríquez"
                    value={clienteNombre}
                    onChange={(e) => setClienteNombre(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1">WhatsApp / Teléfono</label>
                  <input
                    type="text"
                    required
                    placeholder="+58 414 000-0000"
                    value={clienteTelefono}
                    onChange={(e) => setClienteTelefono(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Especialista que Realizará el Trabajo</label>
                <select
                  value={especialistaNombre}
                  onChange={(e) => setEspecialistaNombre(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs"
                >
                  {especialistas.map((esp) => (
                    <option key={esp.id} value={esp.nombre}>
                      {esp.nombre} ({esp.rol})
                    </option>
                  ))}
                </select>
              </div>

              {/* Lista Dinámica de Partidas */}
              <div className="space-y-2 bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="flex justify-between items-center text-xs font-mono text-white/60">
                  <span>Partidas / Insumos / Servicios</span>
                  <button
                    type="button"
                    onClick={handleAgregarFila}
                    className="text-teal-400 font-bold hover:underline"
                  >
                    + Añadir Partida
                  </button>
                </div>

                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      value={item.descripcion}
                      onChange={(e) => handleItemChange(idx, "descripcion", e.target.value)}
                      placeholder="Descripción del servicio o insumo"
                      className="col-span-7 px-2 py-1.5 rounded-lg bg-black/30 border border-white/10 text-white text-xs"
                    />
                    <input
                      type="number"
                      min="1"
                      value={item.cantidad}
                      onChange={(e) => handleItemChange(idx, "cantidad", Number(e.target.value) || 1)}
                      className="col-span-2 px-2 py-1.5 rounded-lg bg-black/30 border border-white/10 text-white text-xs font-mono text-center"
                    />
                    <input
                      type="number"
                      step="0.5"
                      value={item.precioUnitarioUSD}
                      onChange={(e) => handleItemChange(idx, "precioUnitarioUSD", Number(e.target.value) || 0)}
                      className="col-span-2 px-2 py-1.5 rounded-lg bg-black/30 border border-white/10 text-white text-xs font-mono text-right"
                    />
                    <button type="button" onClick={() => handleQuitarFila(idx)} className="col-span-1 text-red-400 text-xs font-bold hover:text-red-300 flex items-center justify-center" title="Quitar fila"><IconClose size={14} /></button>
                  </div>
                ))}

                <div className="pt-2 border-t border-white/10 flex justify-between items-center text-xs font-bold">
                  <span className="text-white/60">TOTAL PRESUPUESTADO:</span>
                  <span className="font-mono text-base text-emerald-400 font-black">${totalUSD.toFixed(2)} USD</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Notas Técnicas / Advertencias</label>
                <textarea
                  rows={2}
                  value={notasTecnicas}
                  onChange={(e) => setNotasTecnicas(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalNuevo(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-white/60 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-xs hover:brightness-110 shadow-lg"
                >
                  Guardar Presupuesto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
