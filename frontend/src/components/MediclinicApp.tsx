import { useState, useEffect } from "react";
import {
  IconStethoscope, IconUsers, IconFileText, IconPrescription, IconHourglass, IconCalendar,
  IconCard, IconCustomize, IconSearch, IconUser, IconCheck, IconTrash, IconRefresh,
  IconChevronLeft, IconChevronRight, IconCheckCircle,
} from "../Icons";
import { useAuth } from "../context/AuthContext";
import {
  listarPacientes, crearPaciente, listarCitasDelDia, agendarCita, listarCobrosDelDia,
  listarSalaEspera, registrarLlegadaSalaEspera, finalizarAtencionSalaEspera,
  listarProcedimientos, crearProcedimiento, historialConsultasPaciente, registrarConsulta,
  type Paciente, type CitaMedica, type SalaEsperaEntrada, type ProcedimientoMedico, type ConsultaMedica,
} from "../api";

type Pagina = "general" | "pacientes" | "historias" | "procedimientos" | "sala-espera" | "agenda" | "financiero" | "configuracion";

const NAV: { id: Pagina; label: string; Icon: (p: { size?: number }) => JSX.Element }[] = [
  { id: "general", label: "Vista General", Icon: IconCustomize },
  { id: "pacientes", label: "Gestión de Pacientes", Icon: IconUsers },
  { id: "historias", label: "Historias Clínicas", Icon: IconFileText },
  { id: "procedimientos", label: "Procedimientos / Cotizaciones", Icon: IconPrescription },
  { id: "sala-espera", label: "Sala de Espera", Icon: IconHourglass },
  { id: "agenda", label: "Agenda Médica", Icon: IconCalendar },
  { id: "financiero", label: "Resúmenes Financieros", Icon: IconCard },
  { id: "configuracion", label: "Configuración & Perfil", Icon: IconCustomize },
];

const hoy = () => new Date().toISOString().slice(0, 10);

export default function MediclinicApp({ onSalir }: { onSalir: () => void }) {
  const { user } = useAuth();
  const tenantId = user!.tenantId!;
  const [pagina, setPagina] = useState<Pagina>("general");

  const [pacientes, setPacientes] = useState<Paciente[] | null>(null);
  const [citasHoy, setCitasHoy] = useState<CitaMedica[] | null>(null);
  const [salaEspera, setSalaEspera] = useState<SalaEsperaEntrada[] | null>(null);
  const [procedimientos, setProcedimientos] = useState<ProcedimientoMedico[] | null>(null);
  const [ingresosHoy, setIngresosHoy] = useState<number | null>(null);

  const recargarTodo = () => {
    listarPacientes(tenantId).then(setPacientes).catch(() => setPacientes([]));
    listarCitasDelDia(tenantId, hoy()).then(setCitasHoy).catch(() => setCitasHoy([]));
    listarSalaEspera().then(setSalaEspera).catch(() => setSalaEspera([]));
    listarProcedimientos().then(setProcedimientos).catch(() => setProcedimientos([]));
    listarCobrosDelDia(`${hoy()}T00:00:00`, `${hoy()}T23:59:59`)
      .then((c) => setIngresosHoy(c.reduce((s, x) => s + Number(x.montoTotal), 0)))
      .catch(() => setIngresosHoy(0));
  };

  useEffect(() => { recargarTodo(); }, [tenantId]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex">
      {/* SIDEBAR */}
      <aside className="w-64 flex-shrink-0 border-r border-slate-300/60 dark:border-white/10 flex flex-col p-4 space-y-1">
        <div className="px-2 pb-4 mb-2 border-b border-slate-300/60 dark:border-white/10">
          <div className="font-['Outfit'] font-black text-lg text-aurora">Mediclinic Pro</div>
          <div className="text-[10px] text-slate-500 dark:text-white/40 uppercase tracking-wider mt-0.5">Panel del Médico</div>
        </div>
        {NAV.map((n) => (
          <button
            key={n.id}
            onClick={() => setPagina(n.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-all ${
              pagina === n.id
                ? "bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30"
                : "text-slate-600 dark:text-white/60 hover:bg-slate-200/60 dark:hover:bg-white/5"
            }`}
          >
            <n.Icon size={16} />
            <span>{n.label}</span>
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={onSalir}
          className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold text-left text-slate-500 dark:text-white/40 hover:bg-slate-200/60 dark:hover:bg-white/5"
        >
          ← Volver al Hub
        </button>
      </aside>

      {/* CONTENIDO */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-300/60 dark:border-white/10">
          <div>
            <div className="font-['Outfit'] font-bold text-sm text-slate-900 dark:text-white">
              Bienvenido{user?.nombre ? `, ${user.nombre}` : ""}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-white/40">{user?.empresa}</div>
          </div>
          <button
            onClick={recargarTodo}
            className="apple-glass-btn text-xs font-semibold px-3 py-2 rounded-full flex items-center gap-1.5 text-slate-700 dark:text-white/80">
            <IconRefresh size={13} /> Actualizar
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {pagina === "general" && (
            <VistaGeneral pacientes={pacientes} citasHoy={citasHoy} salaEspera={salaEspera} procedimientos={procedimientos} ingresosHoy={ingresosHoy} irA={setPagina} />
          )}
          {pagina === "pacientes" && (
            <GestionPacientes tenantId={tenantId} pacientes={pacientes} onCambio={recargarTodo} irA={setPagina} />
          )}
          {pagina === "historias" && (
            <HistoriasClinicas tenantId={tenantId} pacientes={pacientes} />
          )}
          {pagina === "procedimientos" && (
            <Procedimientos tenantId={tenantId} procedimientos={procedimientos} onCambio={recargarTodo} />
          )}
          {pagina === "sala-espera" && (
            <SalaEspera tenantId={tenantId} pacientes={pacientes} entradas={salaEspera} onCambio={recargarTodo} />
          )}
          {pagina === "agenda" && (
            <AgendaMedica tenantId={tenantId} pacientes={pacientes} citasHoy={citasHoy} onCambio={recargarTodo} />
          )}
          {pagina === "financiero" && (
            <ResumenesFinancieros ingresosHoy={ingresosHoy} citasHoy={citasHoy} />
          )}
          {pagina === "configuracion" && <Configuracion />}
        </main>
      </div>
    </div>
  );
}

function KpiCard({ label, val, sub, color }: { label: string; val: string; sub: string; color: string }) {
  return (
    <div className={`apple-glass rounded-2xl p-4 border-l-4 flex-1`} style={{ borderLeftColor: color }}>
      <div className="text-[11px] font-bold text-slate-500 dark:text-white/40 uppercase">{label}</div>
      <div className="font-['Outfit'] font-black text-2xl mt-1" style={{ color }}>{val}</div>
      <div className="text-[11px] text-slate-500 dark:text-white/40 mt-0.5">{sub}</div>
    </div>
  );
}

function VistaGeneral({ pacientes, citasHoy, salaEspera, procedimientos, ingresosHoy, irA }: {
  pacientes: Paciente[] | null; citasHoy: CitaMedica[] | null; salaEspera: SalaEsperaEntrada[] | null;
  procedimientos: ProcedimientoMedico[] | null; ingresosHoy: number | null; irA: (p: Pagina) => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const resultado = busqueda.trim() && pacientes
    ? pacientes.find((p) => p.identificacion.toLowerCase().includes(busqueda.toLowerCase()) || p.nombreCompleto.toLowerCase().includes(busqueda.toLowerCase()))
    : null;

  return (
    <div className="space-y-6">
      <div className="apple-glass rounded-2xl p-5 border-l-4 border-teal-500 space-y-3">
        <div className="flex items-center gap-2">
          <IconSearch size={16} />
          <h3 className="font-['Outfit'] font-bold text-sm text-slate-900 dark:text-white">Búsqueda Instantánea de Pacientes</h3>
        </div>
        <div className="flex gap-2">
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Cédula o nombre del paciente…"
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-sm text-slate-900 dark:text-white"
          />
          <button onClick={() => irA("pacientes")} className="btn-electric-blue text-xs font-bold px-4 py-2 rounded-xl">+ Nuevo Paciente</button>
        </div>
        {busqueda.trim() && (
          resultado ? (
            <div className="p-3 rounded-xl bg-slate-100/60 dark:bg-white/5 flex items-center gap-3">
              <IconUser size={20} />
              <div className="flex-1">
                <div className="font-bold text-sm text-slate-900 dark:text-white">{resultado.nombreCompleto}</div>
                <div className="text-xs text-slate-500 dark:text-white/40">C.I: {resultado.identificacion} {resultado.telefono ? `· Tel: ${resultado.telefono}` : ""}</div>
              </div>
              <button onClick={() => irA("historias")} className="text-teal-600 dark:text-teal-400 text-xs font-bold">Ver Historia →</button>
            </div>
          ) : (
            <p className="text-xs text-amber-600 dark:text-amber-400">No se encontró ningún paciente con ese criterio.</p>
          )
        )}
      </div>

      <div className="flex flex-wrap gap-4">
        <KpiCard label="En Sala de Espera" val={salaEspera ? String(salaEspera.filter(s => s.estado !== "FINALIZADO").length) : "…"} sub="Turnos pendientes hoy" color="#f59e0b" />
        <KpiCard label="Citas de Hoy" val={citasHoy ? String(citasHoy.length) : "…"} sub="Consultas agendadas" color="#0ea5e9" />
        <KpiCard label="Expedientes Registrados" val={pacientes ? String(pacientes.length) : "…"} sub="Pacientes en base de datos" color="#10b981" />
        <KpiCard label="Ingresos del Día" val={ingresosHoy !== null ? `$${ingresosHoy.toFixed(2)}` : "…"} sub="Multi-moneda" color="#6366f1" />
      </div>

      <div className="apple-glass rounded-2xl p-5 space-y-3">
        <h3 className="font-['Outfit'] font-bold text-base text-slate-900 dark:text-white">Panel de Control Médico</h3>
        <p className="text-sm text-slate-600 dark:text-white/60">Gestiona expedientes, historias clínicas de consulta, cotizaciones y sala de espera en tiempo real.</p>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => irA("pacientes")} className="btn-electric-blue text-xs font-bold px-4 py-2.5 rounded-full">Ver Directorio de Pacientes</button>
          <button onClick={() => irA("historias")} className="apple-glass-btn text-xs font-semibold px-4 py-2.5 rounded-full">Ver Historias Clínicas</button>
          <button onClick={() => irA("procedimientos")} className="apple-glass-btn text-xs font-semibold px-4 py-2.5 rounded-full">Cotizaciones y Procedimientos</button>
        </div>
      </div>
    </div>
  );
}

function GestionPacientes({ tenantId, pacientes, onCambio, irA }: { tenantId: number; pacientes: Paciente[] | null; onCambio: () => void; irA: (p: Pagina) => void }) {
  const [seleccionado, setSeleccionado] = useState<Paciente | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({ identificacion: "", nombres: "", apellidos: "", telefono: "", email: "", fechaNacimiento: "", direccion: "" });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

  const filtrados = (pacientes || []).filter((p) =>
    !busqueda.trim() || p.nombreCompleto.toLowerCase().includes(busqueda.toLowerCase()) || p.identificacion.includes(busqueda)
  );

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await crearPaciente(tenantId, form);
      setForm({ identificacion: "", nombres: "", apellidos: "", telefono: "", email: "", fechaNacimiento: "", direccion: "" });
      setMostrarForm(false);
      onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el paciente");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="apple-glass rounded-2xl p-4 flex items-center gap-3">
        <IconSearch size={16} />
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por cédula o nombre…"
          className="flex-1 bg-transparent outline-none text-sm text-slate-900 dark:text-white"
        />
        <button onClick={() => setMostrarForm((v) => !v)} className="btn-electric-blue text-xs font-bold px-4 py-2 rounded-full">
          {mostrarForm ? "Cancelar" : "+ Registrar Nuevo Paciente"}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={guardar} className="apple-glass rounded-2xl p-5 space-y-3">
          {error && <p className="text-[#ff3b80] text-xs">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input required placeholder="Cédula de Identidad *" value={form.identificacion} onChange={(e) => setForm({ ...form, identificacion: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-sm" />
            <input placeholder="Teléfono / WhatsApp" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-sm" />
            <input required placeholder="Nombres *" value={form.nombres} onChange={(e) => setForm({ ...form, nombres: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-sm" />
            <input required placeholder="Apellidos *" value={form.apellidos} onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-sm" />
            <input type="date" placeholder="Fecha de Nacimiento" value={form.fechaNacimiento} onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-sm" />
            <input placeholder="Correo Electrónico" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-sm" />
            <input placeholder="Dirección" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-sm sm:col-span-2" />
          </div>
          <button disabled={guardando} className="btn-electric-blue text-xs font-bold px-5 py-2.5 rounded-full disabled:opacity-60">
            {guardando ? "Guardando…" : "Guardar Paciente"}
          </button>
        </form>
      )}

      <div className="flex gap-4">
        <div className="flex-1 apple-glass rounded-2xl p-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-500 dark:text-white/40 border-b border-slate-300/60 dark:border-white/10">
              <tr><th className="p-2">Cédula</th><th className="p-2">Nombre</th><th className="p-2">Teléfono</th><th className="p-2">Edad</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
              {pacientes === null ? (
                <tr><td colSpan={4} className="p-4 text-center text-slate-400">Cargando…</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={4} className="p-4 text-center text-slate-400">Sin pacientes registrados.</td></tr>
              ) : filtrados.map((p) => (
                <tr key={p.id} onClick={() => setSeleccionado(p)} className="cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/[0.03]">
                  <td className="p-2 font-mono">{p.identificacion}</td>
                  <td className="p-2 font-bold">{p.nombreCompleto}</td>
                  <td className="p-2">{p.telefono || "—"}</td>
                  <td className="p-2">{p.edad ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {seleccionado && (
          <div className="w-72 flex-shrink-0 apple-glass rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <IconUser size={20} />
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">{seleccionado.nombreCompleto}</div>
                <div className="text-[11px] text-teal-600 dark:text-teal-400">{seleccionado.identificacion}</div>
              </div>
            </div>
            <div className="text-xs space-y-1 text-slate-600 dark:text-white/60">
              <div>Teléfono: {seleccionado.telefono || "—"}</div>
              <div>Edad: {seleccionado.edad ?? "—"} años</div>
            </div>
            <button onClick={() => irA("historias")} className="w-full btn-electric-blue text-xs font-bold py-2 rounded-full">Iniciar Consulta / Historia</button>
            <button onClick={() => irA("procedimientos")} className="w-full apple-glass-btn text-xs font-semibold py-2 rounded-full">Cotizar Procedimiento</button>
          </div>
        )}
      </div>
    </div>
  );
}

function HistoriasClinicas({ tenantId, pacientes }: { tenantId: number; pacientes: Paciente[] | null }) {
  const [pacienteId, setPacienteId] = useState<number | "">("");
  const [historial, setHistorial] = useState<ConsultaMedica[] | null>(null);
  const [form, setForm] = useState({ motivoConsulta: "", descripcionDiagnostico: "", planTratamiento: "" });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pacienteId) { setHistorial(null); return; }
    historialConsultasPaciente(Number(pacienteId)).then(setHistorial).catch(() => setHistorial([]));
  }, [pacienteId]);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pacienteId) return;
    setError(null);
    setGuardando(true);
    try {
      await registrarConsulta(tenantId, Number(pacienteId), form);
      setForm({ motivoConsulta: "", descripcionDiagnostico: "", planTratamiento: "" });
      historialConsultasPaciente(Number(pacienteId)).then(setHistorial);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar la consulta");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="apple-glass rounded-2xl p-4">
        <label className="text-xs font-semibold text-slate-500 dark:text-white/40">Seleccionar Paciente</label>
        <select value={pacienteId} onChange={(e) => setPacienteId(e.target.value ? Number(e.target.value) : "")}
          className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-sm">
          <option value="">— Elige un paciente —</option>
          {(pacientes || []).map((p) => <option key={p.id} value={p.id}>{p.nombreCompleto} ({p.identificacion})</option>)}
        </select>
      </div>

      {pacienteId && (
        <>
          <form onSubmit={guardar} className="apple-glass rounded-2xl p-5 space-y-3">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Nueva Consulta</h4>
            {error && <p className="text-[#ff3b80] text-xs">{error}</p>}
            <textarea required placeholder="Motivo de consulta *" value={form.motivoConsulta} onChange={(e) => setForm({ ...form, motivoConsulta: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-sm" rows={2} />
            <textarea placeholder="Diagnóstico" value={form.descripcionDiagnostico} onChange={(e) => setForm({ ...form, descripcionDiagnostico: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-sm" rows={2} />
            <textarea placeholder="Plan de tratamiento" value={form.planTratamiento} onChange={(e) => setForm({ ...form, planTratamiento: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-sm" rows={2} />
            <button disabled={guardando} className="btn-electric-blue text-xs font-bold px-5 py-2.5 rounded-full disabled:opacity-60">
              {guardando ? "Guardando…" : "Guardar Consulta"}
            </button>
          </form>

          <div className="apple-glass rounded-2xl p-4">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2">Historial</h4>
            {historial === null ? (
              <p className="text-xs text-slate-400">Cargando…</p>
            ) : historial.length === 0 ? (
              <p className="text-xs text-slate-400">Sin consultas registradas todavía.</p>
            ) : (
              <div className="space-y-2">
                {historial.map((c) => (
                  <div key={c.id} className="p-3 rounded-xl bg-slate-100/60 dark:bg-white/5 text-xs">
                    <div className="font-bold text-slate-900 dark:text-white">{c.motivoConsulta}</div>
                    {c.descripcionDiagnostico && <div className="text-slate-600 dark:text-white/60 mt-1">Dx: {c.descripcionDiagnostico}</div>}
                    {c.planTratamiento && <div className="text-slate-600 dark:text-white/60">Tto: {c.planTratamiento}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Procedimientos({ tenantId, procedimientos, onCambio }: { tenantId: number; procedimientos: ProcedimientoMedico[] | null; onCambio: () => void }) {
  const [form, setForm] = useState({ nombre: "", descripcion: "", costo: "", moneda: "USD", duracionMinutos: "" });
  const [guardando, setGuardando] = useState(false);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await crearProcedimiento(tenantId, {
        nombre: form.nombre, descripcion: form.descripcion || null,
        costo: Number(form.costo), moneda: form.moneda,
        duracionMinutos: form.duracionMinutos ? Number(form.duracionMinutos) : null,
      });
      setForm({ nombre: "", descripcion: "", costo: "", moneda: "USD", duracionMinutos: "" });
      onCambio();
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={guardar} className="apple-glass rounded-2xl p-5 space-y-3">
        <h4 className="font-bold text-sm text-slate-900 dark:text-white">Nuevo Procedimiento / Cotización</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input required placeholder="Nombre del procedimiento *" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-sm" />
          <input required type="number" step="0.01" placeholder="Precio (USD) *" value={form.costo} onChange={(e) => setForm({ ...form, costo: e.target.value })}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-sm" />
          <input placeholder="Duración (minutos)" type="number" value={form.duracionMinutos} onChange={(e) => setForm({ ...form, duracionMinutos: e.target.value })}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-sm" />
          <input placeholder="Descripción" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-sm" />
        </div>
        <button disabled={guardando} className="btn-electric-blue text-xs font-bold px-5 py-2.5 rounded-full disabled:opacity-60">
          {guardando ? "Guardando…" : "Guardar Procedimiento"}
        </button>
      </form>

      <div className="apple-glass rounded-2xl p-4">
        <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2">Catálogo</h4>
        {procedimientos === null ? (
          <p className="text-xs text-slate-400">Cargando…</p>
        ) : procedimientos.length === 0 ? (
          <p className="text-xs text-slate-400">Sin procedimientos registrados todavía.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {procedimientos.map((p) => (
              <div key={p.id} className="p-3 rounded-xl bg-slate-100/60 dark:bg-white/5">
                <div className="font-bold text-sm text-slate-900 dark:text-white">{p.nombre}</div>
                <div className="text-teal-600 dark:text-teal-400 font-bold text-sm">{p.moneda} ${Number(p.costo).toFixed(2)}</div>
                {p.descripcion && <div className="text-xs text-slate-500 dark:text-white/40 mt-1">{p.descripcion}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SalaEspera({ tenantId, pacientes, entradas, onCambio }: { tenantId: number; pacientes: Paciente[] | null; entradas: SalaEsperaEntrada[] | null; onCambio: () => void }) {
  const [pacienteId, setPacienteId] = useState<number | "">("");
  const [consultorio, setConsultorio] = useState("");
  const [enviando, setEnviando] = useState(false);

  const checkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pacienteId) return;
    setEnviando(true);
    try {
      await registrarLlegadaSalaEspera(tenantId, Number(pacienteId), consultorio || undefined);
      setPacienteId(""); setConsultorio("");
      onCambio();
    } finally {
      setEnviando(false);
    }
  };

  const finalizar = async (id: number) => {
    await finalizarAtencionSalaEspera(id);
    onCambio();
  };

  const activos = (entradas || []).filter((e) => e.estado !== "FINALIZADO");

  return (
    <div className="space-y-4">
      <form onSubmit={checkIn} className="apple-glass rounded-2xl p-5 space-y-3">
        <h4 className="font-bold text-sm text-slate-900 dark:text-white">Registrar Llegada a Sala</h4>
        <div className="flex gap-3">
          <select required value={pacienteId} onChange={(e) => setPacienteId(e.target.value ? Number(e.target.value) : "")}
            className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-sm">
            <option value="">— Elige un paciente —</option>
            {(pacientes || []).map((p) => <option key={p.id} value={p.id}>{p.nombreCompleto} ({p.identificacion})</option>)}
          </select>
          <input placeholder="Consultorio (opcional)" value={consultorio} onChange={(e) => setConsultorio(e.target.value)}
            className="w-48 px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-sm" />
          <button disabled={enviando} className="btn-electric-blue text-xs font-bold px-5 rounded-full disabled:opacity-60">
            {enviando ? "…" : "Ingresar"}
          </button>
        </div>
      </form>

      <div className="apple-glass rounded-2xl p-4">
        <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2">Turnos en Espera</h4>
        {entradas === null ? (
          <p className="text-xs text-slate-400">Cargando…</p>
        ) : activos.length === 0 ? (
          <p className="text-xs text-slate-400">No hay pacientes en sala de espera.</p>
        ) : (
          <div className="space-y-2">
            {activos.map((e) => (
              <div key={e.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-100/60 dark:bg-white/5">
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">{e.paciente?.nombreCompleto}</div>
                  <div className="text-[11px] text-slate-500 dark:text-white/40">{e.estado} · {new Date(e.horaLlegada).toLocaleTimeString()}</div>
                </div>
                <button onClick={() => finalizar(e.id)} className="text-teal-600 dark:text-teal-400 text-xs font-bold flex items-center gap-1">
                  <IconCheck size={12} /> Finalizar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AgendaMedica({ tenantId, pacientes, citasHoy, onCambio }: { tenantId: number; pacientes: Paciente[] | null; citasHoy: CitaMedica[] | null; onCambio: () => void }) {
  const [form, setForm] = useState({ pacienteId: "", fecha: hoy(), horaInicio: "", horaFin: "", motivo: "" });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.pacienteId) return;
    setError(null);
    setGuardando(true);
    try {
      await agendarCita(tenantId, { pacienteId: Number(form.pacienteId), fecha: form.fecha, horaInicio: form.horaInicio, horaFin: form.horaFin, motivo: form.motivo });
      setForm({ pacienteId: "", fecha: hoy(), horaInicio: "", horaFin: "", motivo: "" });
      onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agendar la cita");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={guardar} className="apple-glass rounded-2xl p-5 space-y-3">
        <h4 className="font-bold text-sm text-slate-900 dark:text-white">Agendar Nueva Cita</h4>
        {error && <p className="text-[#ff3b80] text-xs">{error}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select required value={form.pacienteId} onChange={(e) => setForm({ ...form, pacienteId: e.target.value })}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-sm sm:col-span-2">
            <option value="">— Elige un paciente —</option>
            {(pacientes || []).map((p) => <option key={p.id} value={p.id}>{p.nombreCompleto} ({p.identificacion})</option>)}
          </select>
          <input required type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-sm" />
          <input placeholder="Motivo de la cita" value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-sm" />
          <input required type="time" value={form.horaInicio} onChange={(e) => setForm({ ...form, horaInicio: e.target.value })}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-sm" />
          <input required type="time" value={form.horaFin} onChange={(e) => setForm({ ...form, horaFin: e.target.value })}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-sm" />
        </div>
        <button disabled={guardando} className="btn-electric-blue text-xs font-bold px-5 py-2.5 rounded-full disabled:opacity-60">
          {guardando ? "Guardando…" : "Guardar Cita en Agenda"}
        </button>
      </form>

      <div className="apple-glass rounded-2xl p-4">
        <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2">Citas de Hoy</h4>
        {citasHoy === null ? (
          <p className="text-xs text-slate-400">Cargando…</p>
        ) : citasHoy.length === 0 ? (
          <p className="text-xs text-slate-400">No hay citas agendadas para hoy.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {citasHoy.map((c) => (
              <div key={c.id} className="p-3 rounded-xl bg-slate-100/60 dark:bg-white/5">
                <div className="text-teal-600 dark:text-teal-400 text-xs font-mono font-bold">{c.horaInicio} – {c.horaFin}</div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">{c.paciente?.nombreCompleto}</div>
                <div className="text-xs text-slate-500 dark:text-white/40">{c.motivo}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ResumenesFinancieros({ ingresosHoy, citasHoy }: { ingresosHoy: number | null; citasHoy: CitaMedica[] | null }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <KpiCard label="Total Recaudado Hoy (USD)" val={ingresosHoy !== null ? `$${ingresosHoy.toFixed(2)}` : "…"} sub="Consolidado en dólares" color="#10b981" />
        <KpiCard label="Pacientes Atendidos" val={citasHoy ? String(citasHoy.length) : "…"} sub="Citas del día" color="#0ea5e9" />
      </div>
      <div className="apple-glass rounded-2xl p-5">
        <p className="text-sm text-slate-500 dark:text-white/40">
          El historial de cierres de caja por rango de fechas y el desglose VES/COP se pueden agregar sobre esta misma base — por ahora esta vista muestra el total real cobrado hoy.
        </p>
      </div>
    </div>
  );
}

function Configuracion() {
  const { user } = useAuth();
  return (
    <div className="apple-glass rounded-2xl p-5 space-y-3 max-w-lg">
      <h4 className="font-bold text-sm text-slate-900 dark:text-white">Configuración & Perfil</h4>
      <div className="text-xs text-slate-600 dark:text-white/60 space-y-1.5">
        <div>Negocio: <strong className="text-slate-900 dark:text-white">{user?.empresa}</strong></div>
        <div>Usuario: <strong className="text-slate-900 dark:text-white">{user?.email}</strong></div>
        <div>Rol: <strong className="text-slate-900 dark:text-white">{user?.rol}</strong></div>
        <div>Plan: <strong className="text-slate-900 dark:text-white">{user?.plan} ({user?.planStatus})</strong></div>
      </div>
    </div>
  );
}
