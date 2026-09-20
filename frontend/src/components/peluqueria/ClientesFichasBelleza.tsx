import React, { useState } from "react";
import { ClientePeluqueria, FichaTecnicaColorimetria } from "./types";
import { IconUsers, IconSearch, IconPlus, IconClose, IconSparkles, IconCheck, IconChat, IconEdit } from "../../Icons";

interface Props {
  clientes: ClientePeluqueria[];
  onActualizarFicha: (clienteId: string, nuevaFicha: FichaTecnicaColorimetria) => void;
  onCrearCliente: (cliente: Omit<ClientePeluqueria, "id">) => void;
}

export default function ClientesFichasBelleza({
  clientes,
  onActualizarFicha,
  onCrearCliente,
}: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClientePeluqueria | null>(clientes[0] || null);
  const [editandoFicha, setEditandoFicha] = useState(false);
  const [modalNuevoCliente, setModalNuevoCliente] = useState(false);

  // Form nueva clienta
  const [formNombre, setFormNombre] = useState("");
  const [formTelefono, setFormTelefono] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formTonoNatural, setFormTonoNatural] = useState("");
  const [formFormula, setFormFormula] = useState("");
  const [formAlergias, setFormAlergias] = useState("");
  const [formBebida, setFormBebida] = useState("");

  // Estado temporal de edicion de ficha
  const [tempFicha, setTempFicha] = useState<FichaTecnicaColorimetria>(clienteSeleccionado?.fichaTecnica || {});

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.telefono.includes(busqueda) ||
      (c.fichaTecnica.formulaTinte && c.fichaTecnica.formulaTinte.toLowerCase().includes(busqueda.toLowerCase()))
  );

  const seleccionarCliente = (c: ClientePeluqueria) => {
    setClienteSeleccionado(c);
    setTempFicha(c.fichaTecnica);
    setEditandoFicha(false);
  };

  const handleGuardarFicha = () => {
    if (!clienteSeleccionado) return;
    onActualizarFicha(clienteSeleccionado.id, {
      ...tempFicha,
      ultimaActualizacion: new Date().toISOString().slice(0, 10),
    });
    setClienteSeleccionado({
      ...clienteSeleccionado,
      fichaTecnica: {
        ...tempFicha,
        ultimaActualizacion: new Date().toISOString().slice(0, 10),
      },
    });
    setEditandoFicha(false);
  };

  const handleCrearClienteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombre.trim()) return;

    onCrearCliente({
      nombre: formNombre.trim(),
      telefono: formTelefono.trim() || "+58 412 000-0000",
      email: formEmail.trim() || undefined,
      totalVisitas: 1,
      fechaUltimaVisita: new Date().toISOString().slice(0, 10),
      totalGastadoUSD: 0,
      fichaTecnica: {
        tonoNatural: formTonoNatural.trim() || undefined,
        formulaTinte: formFormula.trim() || undefined,
        sensibilidadAlergias: formAlergias.trim() || undefined,
        bebidaPreferida: formBebida.trim() || undefined,
        ultimaActualizacion: new Date().toISOString().slice(0, 10),
      },
    });

    setFormNombre("");
    setFormTelefono("");
    setFormEmail("");
    setModalNuevoCliente(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="apple-glass rounded-3xl p-6 border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-300 text-xs font-mono uppercase tracking-wider mb-2">
            <IconSparkles size={14} />
            <span>Fichas de Belleza & Colorimetria</span>
          </div>
          <h2 className="font-['Outfit'] font-black text-2xl sm:text-3xl text-white">
            Expediente de Clientas & Formulas Quimicas
          </h2>
          <p className="text-white/60 text-xs sm:text-sm mt-1">
            Almacena las proporciones exactas de tinte, peroxido, decoloracion, sensibilidad y preferencias personales de cada cliente.
          </p>
        </div>

        <button
          onClick={() => setModalNuevoCliente(true)}
          className="btn-cyber-neon px-5 py-2.5 rounded-2xl text-xs font-black text-white flex items-center gap-2 shadow-lg hover:scale-105 transition-all"
        >
          <IconPlus size={16} />
          <span>+ Nueva Clienta</span>
        </button>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda: Buscador y Lista de Clientes (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por nombre, telefono o formula..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white text-xs focus:border-teal-400 focus:outline-none placeholder:text-white/30"
            />
            <span className="absolute left-3.5 top-3 text-white/40">
              <IconSearch size={16} />
            </span>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {clientesFiltrados.map((c) => {
              const isSelected = clienteSeleccionado?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => seleccionarCliente(c)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-gradient-to-r from-rose-500/20 via-pink-500/10 to-transparent border-rose-400 shadow-md scale-[1.01]"
                      : "apple-glass border-white/10 hover:border-white/25 text-white/80"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-sm text-white">{c.nombre}</h4>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-300">
                      {c.totalVisitas} visitas
                    </span>
                  </div>
                  <div className="text-white/50 text-xs font-mono">{c.telefono}</div>
                  {c.fichaTecnica.formulaTinte && (
                    <div className="mt-2 text-[11px] text-pink-300 bg-pink-500/10 p-1.5 rounded-lg font-mono truncate">
                      Formula: {c.fichaTecnica.formulaTinte}
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between text-[10px] text-white/40">
                    <span>Ultima visita: {c.fechaUltimaVisita}</span>
                    <span className="font-bold text-teal-400">${c.totalGastadoUSD} USD gastados</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Columna Derecha: Detalle de Ficha Tecnica (7 cols) */}
        <div className="lg:col-span-7">
          {clienteSeleccionado ? (
            <div className="apple-glass rounded-3xl p-6 border border-white/15 space-y-6 shadow-xl relative overflow-hidden">
              <div className="line-aurora absolute top-0 left-0 right-0" />

              {/* Header de la Ficha */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-['Outfit'] font-black text-2xl text-white">
                      {clienteSeleccionado.nombre}
                    </h3>
                    <span className="text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-0.5 rounded-full font-bold">
                      Clienta VIP
                    </span>
                  </div>
                  <div className="text-white/50 text-xs font-mono mt-0.5 flex items-center gap-3">
                    <span>Tel: {clienteSeleccionado.telefono}</span>
                    {clienteSeleccionado.email && <span>Email: {clienteSeleccionado.email}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`https://wa.me/${clienteSeleccionado.telefono.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs font-bold flex items-center gap-1.5"
                  >
                    <IconChat size={14} />
                    <span>WhatsApp</span>
                  </a>
                  {!editandoFicha ? (
                    <button
                      onClick={() => setEditandoFicha(true)}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5"
                    >
                      <IconEdit size={14} />
                      <span>Editar Ficha</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleGuardarFicha}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-500 text-black font-bold text-xs hover:brightness-110 shadow-md flex items-center gap-1.5"
                    >
                      <IconCheck size={14} />
                      <span>Guardar Cambios</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Contenido Ficha Tecnica */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Tono Natural */}
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-1">
                    <span className="text-[11px] font-mono text-white/40 uppercase">Tono Base / Natural</span>
                    {!editandoFicha ? (
                      <p className="text-sm font-semibold text-white">
                        {clienteSeleccionado.fichaTecnica.tonoNatural || "No especificado"}
                      </p>
                    ) : (
                      <input
                        type="text"
                        value={tempFicha.tonoNatural || ""}
                        onChange={(e) => setTempFicha({ ...tempFicha, tonoNatural: e.target.value })}
                        placeholder="ej. Castano Claro 5.0"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/20 text-xs text-white"
                      />
                    )}
                  </div>

                  {/* Tono Deseado */}
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-1">
                    <span className="text-[11px] font-mono text-white/40 uppercase">Tono Deseado / Objetivo</span>
                    {!editandoFicha ? (
                      <p className="text-sm font-semibold text-rose-300">
                        {clienteSeleccionado.fichaTecnica.tonoDeseado || "Rubio Miel / Balayage"}
                      </p>
                    ) : (
                      <input
                        type="text"
                        value={tempFicha.tonoDeseado || ""}
                        onChange={(e) => setTempFicha({ ...tempFicha, tonoDeseado: e.target.value })}
                        placeholder="ej. Rubio Cenizo 8.1"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/20 text-xs text-white"
                      />
                    )}
                  </div>
                </div>

                {/* Formula Exacta de Colorimetria */}
                <div className="bg-gradient-to-r from-pink-500/10 via-rose-500/5 to-purple-500/10 p-5 rounded-2xl border border-pink-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-pink-300 uppercase">
                      Formula Quimica & Colorimetria Exacta
                    </span>
                    <span className="text-[10px] text-white/40">
                      Actualizado: {clienteSeleccionado.fichaTecnica.ultimaActualizacion || "Reciente"}
                    </span>
                  </div>

                  {!editandoFicha ? (
                    <div className="font-mono text-sm font-semibold text-white bg-black/30 p-3 rounded-xl border border-white/10 leading-relaxed">
                      {clienteSeleccionado.fichaTecnica.formulaTinte || "Sin formula guardada aun."}
                    </div>
                  ) : (
                    <textarea
                      rows={3}
                      value={tempFicha.formulaTinte || ""}
                      onChange={(e) => setTempFicha({ ...tempFicha, formulaTinte: e.target.value })}
                      placeholder="ej. Igora Royal 8.1 (45g) + 20 Vol (45g) + 5g 0-22 Anti-Naranja..."
                      className="w-full font-mono text-xs p-3 rounded-xl bg-slate-900 border border-white/20 text-white focus:outline-none focus:border-pink-400"
                    />
                  )}
                </div>

                {/* Historial Quimico & Decoloracion */}
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-1">
                  <span className="text-[11px] font-mono text-white/40 uppercase">Historial Decoloracion & Tratamientos</span>
                  {!editandoFicha ? (
                    <p className="text-xs text-white/80 leading-relaxed">
                      {clienteSeleccionado.fichaTecnica.historialDecoloracion || "Sin tratamientos previos registrados."}
                    </p>
                  ) : (
                    <input
                      type="text"
                      value={tempFicha.historialDecoloracion || ""}
                      onChange={(e) => setTempFicha({ ...tempFicha, historialDecoloracion: e.target.value })}
                      placeholder="ej. Decoloracion a 20 vol hace 3 meses..."
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/20 text-xs text-white"
                    />
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Sensibilidad y Alergias */}
                  <div className="bg-white/5 p-4 rounded-2xl border border-amber-500/20 space-y-1">
                    <span className="text-[11px] font-mono text-amber-300 uppercase">Sensibilidad & Alergias</span>
                    {!editandoFicha ? (
                      <p className="text-xs text-white/80">
                        {clienteSeleccionado.fichaTecnica.sensibilidadAlergias || "Sin alergias reportadas."}
                      </p>
                    ) : (
                      <input
                        type="text"
                        value={tempFicha.sensibilidadAlergias || ""}
                        onChange={(e) => setTempFicha({ ...tempFicha, sensibilidadAlergias: e.target.value })}
                        placeholder="ej. Sensible a peroxido de 30 vol..."
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/20 text-xs text-white"
                      />
                    )}
                  </div>

                  {/* Bebida & Trato Preferencial */}
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-1">
                    <span className="text-[11px] font-mono text-teal-300 uppercase">Bebida & Preferencias</span>
                    {!editandoFicha ? (
                      <p className="text-xs text-white/80">
                        {clienteSeleccionado.fichaTecnica.bebidaPreferida || "Agua con gas / Cafe con leche"}
                      </p>
                    ) : (
                      <input
                        type="text"
                        value={tempFicha.bebidaPreferida || ""}
                        onChange={(e) => setTempFicha({ ...tempFicha, bebidaPreferida: e.target.value })}
                        placeholder="ej. Capuchino con canela..."
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/20 text-xs text-white"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="apple-glass rounded-3xl p-12 text-center border border-white/10 text-white/40">
              Selecciona una clienta de la lista para ver o editar su ficha tecnica.
            </div>
          )}
        </div>
      </div>

      {/* Modal Nueva Clienta */}
      {modalNuevoCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="apple-glass rounded-3xl p-6 sm:p-8 max-w-md w-full border border-white/20 shadow-2xl relative">
            <button
              onClick={() => setModalNuevoCliente(false)}
              className="absolute top-5 right-5 text-white/50 hover:text-white"
            >
              <IconClose size={20} />
            </button>

            <h3 className="font-['Outfit'] font-black text-2xl text-white mb-4">
              Alta de Nueva Clienta
            </h3>

            <form onSubmit={handleCrearClienteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Genesis Rivas"
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-pink-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Telefono / WhatsApp</label>
                <input
                  type="text"
                  required
                  placeholder="+58 412 000-0000"
                  value={formTelefono}
                  onChange={(e) => setFormTelefono(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-pink-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Tono Base / Natural</label>
                <input
                  type="text"
                  placeholder="ej. Castano Oscuro 3"
                  value={formTonoNatural}
                  onChange={(e) => setFormTonoNatural(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-pink-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Formula Inicial (Opcional)</label>
                <textarea
                  rows={2}
                  placeholder="ej. Igora 7.1 + 20 vol..."
                  value={formFormula}
                  onChange={(e) => setFormFormula(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-pink-400 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalNuevoCliente(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-white/60 hover:text-white text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-xs hover:brightness-110 shadow-lg"
                >
                  Crear Ficha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
