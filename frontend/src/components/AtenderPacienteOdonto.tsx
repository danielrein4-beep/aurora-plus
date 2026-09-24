import React, { useEffect, useMemo, useState } from "react";
import { crearPaciente, leerSesion, type Paciente } from "../api";
import { IconSearch } from "../Icons";

// Entrada de un clic a la consulta dental: los citados de hoy arriba y un buscador
// para cualquier otro paciente. Elegir uno abre directo su "Consulta en sillon".

interface Props {
  pacientes: Paciente[] | null;
  onAtender: (pacienteId: number) => void;
  // Paciente que llega por primera vez: se registra aqui mismo y se entra a su consulta.
  onRegistradoYAtender: (paciente: Paciente) => void;
}

const vacio = { identificacion: "", nombres: "", apellidos: "", telefono: "", alergias: "" };

interface CitaHoy {
  id: number;
  paciente_id: number;
  nombre_paciente: string;
  hora_inicio: string;
  motivo: string;
  estado: string;
  sillon_box: string;
}

const ESTADO: Record<string, { texto: string; clase: string }> = {
  PROGRAMADA: { texto: "Programada", clase: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300" },
  CONFIRMADA: { texto: "Confirmada", clase: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  EN_SALA: { texto: "En sala", clase: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  EN_ATENCION: { texto: "En sillon", clase: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  COMPLETADA: { texto: "Atendido", clase: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
};

export default function AtenderPacienteOdonto({ pacientes, onAtender, onRegistradoYAtender }: Props) {
  const [citas, setCitas] = useState<CitaHoy[] | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [nuevo, setNuevo] = useState<typeof vacio | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorNuevo, setErrorNuevo] = useState<string | null>(null);

  // Lo escrito en el buscador llena el formulario: numeros van a la cedula, texto al nombre.
  const abrirNuevo = () => {
    const q = busqueda.trim();
    const esCedula = /\d{4,}/.test(q);
    const partes = esCedula ? [] : q.split(/\s+/).filter(Boolean);
    setNuevo({
      ...vacio,
      identificacion: esCedula ? q : "",
      nombres: partes.slice(0, Math.max(1, partes.length - 1)).join(" "),
      apellidos: partes.length > 1 ? partes[partes.length - 1] : "",
    });
    setErrorNuevo(null);
  };

  const registrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevo) return;
    setGuardando(true);
    setErrorNuevo(null);
    try {
      const p = await crearPaciente({
        identificacion: nuevo.identificacion.trim(),
        nombres: nuevo.nombres.trim(),
        apellidos: nuevo.apellidos.trim(),
        telefono: nuevo.telefono.trim() || undefined,
        alergias: nuevo.alergias.trim() || undefined,
      });
      onRegistradoYAtender(p);
    } catch (err) {
      setErrorNuevo(err instanceof Error ? err.message : "No se pudo registrar el paciente.");
    } finally {
      setGuardando(false);
    }
  };

  useEffect(() => {
    fetch(`/api/salud/odontologia/agenda?fecha=${new Date().toISOString().slice(0, 10)}`, {
      headers: { Authorization: `Bearer ${leerSesion()?.token || ""}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((d: CitaHoy[]) => setCitas(d.filter((c) => c.estado !== "CANCELADA" && c.estado !== "NO_ASISTIO")))
      .catch(() => setCitas([]));
  }, []);

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q || !pacientes) return [];
    return pacientes
      .filter((p) => p.nombreCompleto.toLowerCase().includes(q) || (p.identificacion || "").toLowerCase().includes(q))
      .slice(0, 8);
  }, [busqueda, pacientes]);

  // Primero los que estan en sala o en sillon, luego por hora; los atendidos al final.
  const orden = (c: CitaHoy) => (c.estado === "EN_ATENCION" ? 0 : c.estado === "EN_SALA" ? 1 : c.estado === "COMPLETADA" ? 3 : 2);
  const citasOrdenadas = (citas || []).slice().sort((a, b) => orden(a) - orden(b) || a.hora_inicio.localeCompare(b.hora_inicio));

  return (
    <div className="max-w-3xl mx-auto space-y-6 text-left text-slate-900 dark:text-slate-100">
      <div>
        <h2 className="font-['Outfit'] font-black text-2xl text-slate-900 dark:text-[#FFFFFF]">¿A quién vas a atender?</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Elige un paciente y entras directo a su consulta en sillón.</p>
      </div>

      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <IconSearch size={18} />
        </span>
        <input
          type="text"
          autoFocus
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar paciente por nombre o cédula..."
          aria-label="Buscar paciente"
          className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white dark:bg-white/5 border border-slate-300 dark:border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
        />
        {resultados.length > 0 && (
          <ul className="absolute top-full left-0 right-0 mt-2 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/15 rounded-2xl shadow-xl p-1.5">
            {resultados.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onAtender(p.id)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-violet-500/10 text-left"
                >
                  <span>
                    <span className="block text-sm font-semibold">{p.nombreCompleto}</span>
                    <span className="block text-xs text-slate-500">CI {p.identificacion || "sin cédula"}</span>
                  </span>
                  <span className="text-xs font-bold text-violet-700 dark:text-violet-300">Atender</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {busqueda.trim() && resultados.length === 0 && !nuevo && (
          <div className="mt-2 flex items-center justify-between gap-3 p-3 rounded-2xl bg-violet-500/10 border border-violet-500/30">
            <span className="text-sm">No hay ningún paciente con "{busqueda}". ¿Viene por primera vez?</span>
            <button type="button" onClick={abrirNuevo} className="shrink-0 px-3 py-1.5 rounded-xl bg-violet-600 text-[#FFFFFF] text-xs font-bold">
              Registrarlo y atender
            </button>
          </div>
        )}
      </div>

      {!nuevo && !busqueda.trim() && (
        <button type="button" onClick={abrirNuevo} className="text-sm font-semibold text-violet-700 dark:text-violet-300 hover:underline">
          + Paciente nuevo (primera vez)
        </button>
      )}

      {nuevo && (
        <form onSubmit={registrar} className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-violet-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-['Outfit'] font-bold text-base">Paciente nuevo</h3>
            <button type="button" onClick={() => setNuevo(null)} className="text-xs font-semibold text-slate-500 hover:underline">
              Cancelar
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Solo lo necesario para atenderlo ahora. El resto de su ficha lo completas después en Gestión de Pacientes.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(
              [
                ["identificacion", "Cédula *", "V-12345678"],
                ["nombres", "Nombres *", "Carlos Andrés"],
                ["apellidos", "Apellidos *", "Gómez Peña"],
              ] as const
            ).map(([campo, etiqueta, ejemplo]) => (
              <label key={campo} className="block text-xs">
                <span className="block text-slate-500 dark:text-slate-400 mb-1">{etiqueta}</span>
                <input
                  type="text"
                  required
                  value={nuevo[campo]}
                  onChange={(e) => setNuevo({ ...nuevo, [campo]: e.target.value })}
                  placeholder={ejemplo}
                  className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/15 text-sm"
                />
              </label>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <label className="block text-xs">
              <span className="block text-slate-500 dark:text-slate-400 mb-1">Teléfono (WhatsApp)</span>
              <input
                type="tel"
                value={nuevo.telefono}
                onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })}
                placeholder="0414-1234567"
                className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/15 text-sm"
              />
            </label>
            <label className="block text-xs sm:col-span-2">
              <span className="block text-rose-600 dark:text-rose-400 font-semibold mb-1">Alergias conocidas</span>
              <input
                type="text"
                value={nuevo.alergias}
                onChange={(e) => setNuevo({ ...nuevo, alergias: e.target.value })}
                placeholder="Ej: penicilina, látex, anestesia... (vacío si no tiene)"
                className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-rose-300 dark:border-rose-500/30 text-sm"
              />
            </label>
          </div>
          {errorNuevo && <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{errorNuevo}</p>}
          <button
            type="submit"
            disabled={guardando}
            className="w-full p-3 rounded-xl bg-violet-600 text-[#FFFFFF] text-sm font-bold disabled:opacity-50"
          >
            {guardando ? "Registrando..." : "Registrar y atender"}
          </button>
        </form>
      )}

      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Citados hoy</h3>
        {citas === null ? (
          <p className="text-sm text-slate-500">Cargando la agenda de hoy...</p>
        ) : citasOrdenadas.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No hay citas para hoy. Usa el buscador para atender a cualquier paciente.</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {citasOrdenadas.map((c) => {
              const est = ESTADO[c.estado] || ESTADO.PROGRAMADA;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onAtender(c.paciente_id)}
                    className={`w-full p-4 rounded-2xl border text-left transition hover:border-violet-400 hover:shadow-md ${
                      c.estado === "COMPLETADA"
                        ? "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 opacity-70"
                        : "bg-white dark:bg-slate-900/80 border-slate-200 dark:border-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-lg font-bold text-violet-700 dark:text-violet-300">{c.hora_inicio.substring(0, 5)}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${est.clase}`}>{est.texto}</span>
                    </div>
                    <div className="mt-1 font-semibold text-sm truncate">{c.nombre_paciente}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{c.motivo}</div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
