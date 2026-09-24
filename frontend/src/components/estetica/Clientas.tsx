import React, { useMemo, useState } from "react";
import { crearPaciente, actualizarPaciente, type Paciente, type NuevoPaciente, type ProcedimientoMedico } from "../../api";
import { IconChevronLeft, IconEdit, IconSearch, IconWhatsApp } from "../../Icons";
import { Aviso, Boton, Campo, EncabezadoPagina, Modal, Tarjeta, Vacio, claseInput, enlaceWhatsApp, formatearFecha, mensajeError } from "./comun";
import FichaPiel from "./FichaPiel";
import SesionesClienta from "./SesionesClienta";
import { PaquetesClienta } from "./Paquetes";
import Consentimientos from "./Consentimientos";

type Pestana = "sesiones" | "ficha" | "paquetes" | "consentimientos" | "datos";
const PESTANAS: { id: Pestana; label: string }[] = [
  { id: "sesiones", label: "Sesiones" },
  { id: "ficha", label: "Ficha de piel" },
  { id: "paquetes", label: "Paquetes" },
  { id: "consentimientos", label: "Consentimientos" },
  { id: "datos", label: "Datos" },
];

function iniciales(nombre: string): string {
  return nombre.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

function edad(fecha?: string | null): number | null {
  if (!fecha) return null;
  const n = new Date(fecha + "T00:00:00");
  if (isNaN(n.getTime())) return null;
  const h = new Date();
  let e = h.getFullYear() - n.getFullYear();
  if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) e--;
  return e >= 0 ? e : null;
}

export default function Clientas({
  clientas, servicios, negocio, seleccionada, onSeleccionar, onRecargar, cargando, error,
}: {
  clientas: Paciente[];
  servicios: ProcedimientoMedico[];
  negocio: string;
  seleccionada: Paciente | null;
  onSeleccionar: (c: Paciente | null) => void;
  onRecargar: () => Promise<Paciente[] | void>;
  cargando: boolean;
  error: string | null;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [formulario, setFormulario] = useState<{ clienta: Paciente | null } | null>(null);
  const [pestana, setPestana] = useState<Pestana>("sesiones");

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const orden = [...clientas].sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto, "es"));
    if (!q) return orden;
    return orden.filter((c) =>
      c.nombreCompleto.toLowerCase().includes(q) || c.identificacion?.toLowerCase().includes(q) || c.telefono?.includes(q));
  }, [clientas, busqueda]);

  const alGuardar = async (id: number) => {
    setFormulario(null);
    const lista = await onRecargar();
    const actualizada = (lista || clientas).find((c) => c.id === id);
    if (actualizada) onSeleccionar(actualizada);
  };

  return (
    <div>
      <div className={seleccionada ? "hidden lg:block" : ""}>
        <EncabezadoPagina
          titulo="Clientas"
          subtitulo={clientas.length ? `${clientas.length} registradas` : "Tu cartera de clientas"}
          acciones={<Boton onClick={() => setFormulario({ clienta: null })}>Nueva clienta</Boton>}
        />
      </div>

      {error && <div className="mb-4"><Aviso>{error}</Aviso></div>}

      <div className="grid lg:grid-cols-[340px_1fr] gap-5 items-start">
        <Tarjeta className={`p-3 ${seleccionada ? "hidden lg:block" : ""}`}>
          <div className="relative mb-2">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><IconSearch size={15} /></span>
            <input className={`${claseInput} pl-9`} placeholder="Buscar por nombre, cédula o teléfono" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          {cargando && clientas.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">Cargando clientas…</div>
          ) : clientas.length === 0 ? (
            <Vacio titulo="Aún no tienes clientas" texto="Registra la primera para abrirle su ficha." accion={<Boton onClick={() => setFormulario({ clienta: null })}>Nueva clienta</Boton>} />
          ) : filtradas.length === 0 ? (
            <Vacio titulo="Sin resultados" />
          ) : (
            <ul className="max-h-[68vh] overflow-y-auto -mx-1">
              {filtradas.map((c) => {
                const activa = seleccionada?.id === c.id;
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => { onSeleccionar(c); setPestana("sesiones"); }}
                      className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left transition cursor-pointer ${activa ? "bg-[#9E4A63]/10" : "hover:bg-slate-50 dark:hover:bg-white/5"}`}
                    >
                      <span className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${activa ? "bg-[#9E4A63] text-white" : "bg-[#E3A6B4]/25 text-[#9E4A63]"}`}>
                        {iniciales(c.nombreCompleto)}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-900 dark:text-white truncate">{c.nombreCompleto}</span>
                        <span className="block text-xs text-slate-500 dark:text-white/50 truncate">{c.telefono || c.identificacion}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Tarjeta>

        {seleccionada ? (
          <DetalleClienta
            clienta={seleccionada}
            servicios={servicios}
            negocio={negocio}
            pestana={pestana}
            onPestana={setPestana}
            onVolver={() => onSeleccionar(null)}
            onEditar={() => setFormulario({ clienta: seleccionada })}
          />
        ) : (
          <Tarjeta className="hidden lg:flex min-h-[320px] items-center justify-center">
            <Vacio titulo="Elige una clienta" texto="Verás sus sesiones con fotos, su ficha de piel, los paquetes que tiene y sus consentimientos." />
          </Tarjeta>
        )}
      </div>

      {formulario && (
        <FormularioClienta clienta={formulario.clienta} onCerrar={() => setFormulario(null)} onGuardada={alGuardar} />
      )}
    </div>
  );
}

function DetalleClienta({ clienta, servicios, negocio, pestana, onPestana, onVolver, onEditar }: {
  clienta: Paciente; servicios: ProcedimientoMedico[]; negocio: string; pestana: Pestana;
  onPestana: (p: Pestana) => void; onVolver: () => void; onEditar: () => void;
}) {
  const wa = enlaceWhatsApp(clienta.telefono, `Hola ${clienta.nombres || clienta.nombreCompleto.split(" ")[0]}, `);
  const anos = edad(clienta.fechaNacimiento);

  return (
    <Tarjeta className="overflow-hidden">
      <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-0 bg-gradient-to-br from-[#E3A6B4]/15 via-transparent to-transparent">
        <button onClick={onVolver} className="lg:hidden inline-flex items-center gap-1 text-xs font-semibold text-slate-500 mb-3 cursor-pointer">
          <IconChevronLeft size={14} /> Clientas
        </button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-12 h-12 rounded-full bg-[#9E4A63] text-white flex items-center justify-center font-bold flex-shrink-0">{iniciales(clienta.nombreCompleto)}</span>
            <div className="min-w-0">
              <h2 className="font-['Outfit'] font-bold text-lg text-slate-900 dark:text-white truncate">{clienta.nombreCompleto}</h2>
              <p className="text-xs text-slate-500 dark:text-white/50">
                {clienta.identificacion}{anos !== null ? ` · ${anos} años` : ""}{clienta.telefono ? ` · ${clienta.telefono}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-500/10">
                <IconWhatsApp size={15} /> <span className="hidden sm:inline">WhatsApp</span>
              </a>
            )}
            <Boton tipo="secundario" onClick={onEditar} title="Editar datos"><IconEdit size={15} /></Boton>
          </div>
        </div>
        {clienta.alergias && (
          <div className="mt-3"><Aviso tipo="info">Alergias: {clienta.alergias}</Aviso></div>
        )}
        <nav className="flex gap-1 mt-4 overflow-x-auto -mx-1 px-1">
          {PESTANAS.map((p) => (
            <button
              key={p.id}
              onClick={() => onPestana(p.id)}
              className={`px-3 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition cursor-pointer ${
                pestana === p.id ? "border-[#9E4A63] text-[#9E4A63] dark:text-[#E3A6B4] dark:border-[#E3A6B4]" : "border-transparent text-slate-500 hover:text-slate-800 dark:text-white/50 dark:hover:text-white"
              }`}
            >
              {p.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-white/10">
        {pestana === "sesiones" && <SesionesClienta pacienteId={clienta.id} servicios={servicios} />}
        {pestana === "ficha" && <FichaPiel pacienteId={clienta.id} />}
        {pestana === "paquetes" && <PaquetesClienta clienta={clienta} servicios={servicios} />}
        {pestana === "consentimientos" && <Consentimientos clienta={clienta} negocio={negocio} />}
        {pestana === "datos" && <DatosClienta clienta={clienta} onEditar={onEditar} />}
      </div>
    </Tarjeta>
  );
}

function DatosClienta({ clienta, onEditar }: { clienta: Paciente; onEditar: () => void }) {
  const filas: [string, string | null | undefined][] = [
    ["Documento", clienta.identificacion],
    ["Teléfono", clienta.telefono],
    ["Correo", clienta.email],
    ["Fecha de nacimiento", clienta.fechaNacimiento ? formatearFecha(clienta.fechaNacimiento) : null],
    ["Dirección", clienta.direccion],
    ["Alergias", clienta.alergias],
    ["Antecedentes de salud", clienta.antecedentesPatologicos],
    ["Cirugías o procedimientos previos", clienta.antecedentesQuirurgicos],
  ];
  return (
    <div className="space-y-4">
      <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
        {filas.map(([t, v]) => (
          <div key={t}>
            <dt className="text-xs text-slate-400 dark:text-white/40">{t}</dt>
            <dd className="text-sm text-slate-800 dark:text-white/85">{v || "—"}</dd>
          </div>
        ))}
      </dl>
      <Boton tipo="secundario" onClick={onEditar}>Editar datos</Boton>
    </div>
  );
}

function FormularioClienta({ clienta, onCerrar, onGuardada }: { clienta: Paciente | null; onCerrar: () => void; onGuardada: (id: number) => void }) {
  const [f, setF] = useState<NuevoPaciente>({
    identificacion: clienta?.identificacion ?? "",
    nombres: clienta?.nombres ?? "",
    apellidos: clienta?.apellidos ?? "",
    telefono: clienta?.telefono ?? "",
    email: clienta?.email ?? "",
    fechaNacimiento: clienta?.fechaNacimiento ?? "",
    direccion: clienta?.direccion ?? "",
    genero: clienta?.genero ?? "FEMENINO",
    alergias: clienta?.alergias ?? "",
    antecedentesPatologicos: clienta?.antecedentesPatologicos ?? "",
    antecedentesQuirurgicos: clienta?.antecedentesQuirurgicos ?? "",
    // El servidor reemplaza el registro completo al editar: los campos que esta pantalla no
    // muestra viajan con su valor actual para no borrarlos.
    grupoSanguineo: clienta?.grupoSanguineo ?? "",
    antecedentesFamiliares: clienta?.antecedentesFamiliares ?? "",
    contactoEmergenciaNombre: clienta?.contactoEmergenciaNombre ?? "",
    contactoEmergenciaTelefono: clienta?.contactoEmergenciaTelefono ?? "",
    tipoOrigen: clienta?.tipoOrigen ?? "",
    origen: clienta?.origen ?? "",
    ciudadOrigen: clienta?.ciudadOrigen ?? "",
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof NuevoPaciente, v: string) => setF((prev) => ({ ...prev, [k]: v }));

  const guardar = async () => {
    if (!f.nombres.trim() || !f.apellidos.trim()) { setError("Nombre y apellido son obligatorios."); return; }
    if (!f.identificacion.trim()) { setError("La cédula o documento es obligatoria."); return; }
    setGuardando(true);
    setError(null);
    // Los campos vacíos no se mandan: el servidor los guarda como "sin dato", no como texto vacío.
    const datos = Object.fromEntries(
      Object.entries(f).map(([k, v]) => [k, typeof v === "string" ? v.trim() || undefined : v]),
    ) as unknown as NuevoPaciente;
    try {
      const r = clienta ? await actualizarPaciente(clienta.id, datos) : await crearPaciente(datos);
      onGuardada(r.id);
    } catch (e) {
      setError(mensajeError(e, "No se pudo guardar la clienta."));
      setGuardando(false);
    }
  };

  return (
    <Modal titulo={clienta ? "Editar clienta" : "Nueva clienta"} onCerrar={onCerrar} ancho="max-w-xl">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Nombres"><input className={claseInput} value={f.nombres} onChange={(e) => set("nombres", e.target.value)} autoFocus /></Campo>
          <Campo label="Apellidos"><input className={claseInput} value={f.apellidos} onChange={(e) => set("apellidos", e.target.value)} /></Campo>
          <Campo label="Cédula o documento"><input className={claseInput} value={f.identificacion} onChange={(e) => set("identificacion", e.target.value)} placeholder="V-12345678" /></Campo>
          <Campo label="Teléfono (WhatsApp)"><input className={claseInput} type="tel" value={f.telefono} onChange={(e) => set("telefono", e.target.value)} placeholder="0414-1234567" /></Campo>
          <Campo label="Correo"><input className={claseInput} type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></Campo>
          <Campo label="Fecha de nacimiento"><input className={claseInput} type="date" value={f.fechaNacimiento} onChange={(e) => set("fechaNacimiento", e.target.value)} /></Campo>
        </div>
        <Campo label="Género">
          <select className={claseInput} value={f.genero} onChange={(e) => set("genero", e.target.value)}>
            <option value="FEMENINO">Femenino</option>
            <option value="MASCULINO">Masculino</option>
            <option value="OTRO">Otro</option>
          </select>
        </Campo>
        <Campo label="Alergias"><input className={claseInput} value={f.alergias} onChange={(e) => set("alergias", e.target.value)} placeholder="Ninguna conocida" /></Campo>
        <Campo label="Antecedentes de salud" ayuda="Enfermedades, tratamientos en curso, cualquier cosa relevante para la piel.">
          <textarea className={claseInput} rows={2} value={f.antecedentesPatologicos} onChange={(e) => set("antecedentesPatologicos", e.target.value)} />
        </Campo>
        <Campo label="Cirugías o procedimientos estéticos previos">
          <textarea className={claseInput} rows={2} value={f.antecedentesQuirurgicos} onChange={(e) => set("antecedentesQuirurgicos", e.target.value)} placeholder="Rellenos, bótox, cirugías…" />
        </Campo>
        {error && <Aviso onCerrar={() => setError(null)}>{error}</Aviso>}
        <div className="flex justify-end gap-2 pt-1">
          <Boton tipo="secundario" onClick={onCerrar}>Cancelar</Boton>
          <Boton onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : clienta ? "Guardar cambios" : "Registrar clienta"}</Boton>
        </div>
      </div>
    </Modal>
  );
}
