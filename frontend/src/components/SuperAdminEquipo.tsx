import { useEffect, useState } from "react";
import {
  listarEquipoSuperAdmin,
  crearMiembroEquipoSuperAdmin,
  cambiarRolMiembroSuperAdmin,
  cambiarActivoMiembroSuperAdmin,
  resetearAccesoMiembroSuperAdmin,
  type MiembroEquipoSuperAdmin,
  type RolEquipoSuperAdmin,
} from "../api";

interface Props {
  avisar: (mensaje: string, tipo?: "success" | "error") => void;
}

export const ROLES_EQUIPO: { id: RolEquipoSuperAdmin; label: string; descripcion: string }[] = [
  { id: "PROPIETARIO", label: "Propietario", descripcion: "Acceso total, incluido el equipo y la auditoría." },
  { id: "SOPORTE", label: "Soporte", descripcion: "Tickets, entrar como soporte a un negocio y gestionar sus usuarios." },
  { id: "FINANZAS", label: "Finanzas", descripcion: "Cobros, cortesías, planes, suspensiones y finanzas del SaaS." },
  { id: "ANALISTA", label: "Analista", descripcion: "Solo lectura: directorio, métricas, actividad y Canal Endémico." },
];

const campo = "w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:border-slate-800 bg-white text-sm";

function fecha(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("es-VE", { dateStyle: "medium", timeStyle: "short" }) : "Nunca";
}

export default function SuperAdminEquipo({ avisar }: Props) {
  const [miembros, setMiembros] = useState<MiembroEquipoSuperAdmin[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [mostrarAlta, setMostrarAlta] = useState(false);
  const [nuevo, setNuevo] = useState<{ username: string; nombreCompleto: string; rol: RolEquipoSuperAdmin }>({ username: "", nombreCompleto: "", rol: "SOPORTE" });
  /** Clave temporal recién generada: se muestra una sola vez. */
  const [credencial, setCredencial] = useState<{ username: string; clave: string } | null>(null);

  const cargar = () => listarEquipoSuperAdmin().then(setMiembros).catch((e: Error) => setError(e.message));
  useEffect(() => { cargar(); }, []);

  const ejecutar = async (accion: () => Promise<void>) => {
    setProcesando(true);
    setError(null);
    try { await accion(); await cargar(); } catch (e: any) { setError(e?.message || "No se pudo completar la operación"); } finally { setProcesando(false); }
  };

  const crear = () => ejecutar(async () => {
    const m = await crearMiembroEquipoSuperAdmin(nuevo);
    setCredencial({ username: m.username, clave: m.claveTemporal! });
    setNuevo({ username: "", nombreCompleto: "", rol: "SOPORTE" });
    setMostrarAlta(false);
    avisar(`Cuenta ${m.username} creada`);
  });

  const cambiarRol = (m: MiembroEquipoSuperAdmin, rol: RolEquipoSuperAdmin) => ejecutar(async () => {
    await cambiarRolMiembroSuperAdmin(m.id, rol);
    avisar(`Rol de ${m.username} actualizado`);
  });

  const alternarActivo = (m: MiembroEquipoSuperAdmin) => ejecutar(async () => {
    if (m.activo && !window.confirm(`¿Suspender la cuenta ${m.username}? Se cerrarán sus sesiones abiertas.`)) return;
    await cambiarActivoMiembroSuperAdmin(m.id, !m.activo);
    avisar(m.activo ? `Cuenta ${m.username} suspendida` : `Cuenta ${m.username} reactivada`);
  });

  const resetear = (m: MiembroEquipoSuperAdmin) => ejecutar(async () => {
    if (!window.confirm(`¿Resetear el acceso de ${m.username}? Recibirá una clave temporal nueva y se desactivará su verificación en dos pasos.`)) return;
    const r = await resetearAccesoMiembroSuperAdmin(m.id);
    setCredencial({ username: r.username, clave: r.claveTemporal! });
  });

  return (
    <div className="max-w-5xl space-y-6">
      {error && <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}

      {credencial && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-300 space-y-2">
          <div className="font-bold text-amber-900 text-sm">Clave temporal de {credencial.username}</div>
          <div className="px-4 py-3 rounded-xl bg-white border border-amber-200 font-mono text-lg tracking-wider text-slate-900 select-all">{credencial.clave}</div>
          <p className="text-xs text-amber-900">
            Cópiela y entréguela por un canal privado. No se volverá a mostrar. Al entrar por primera vez, el sistema le pedirá cambiarla.
          </p>
          <button onClick={() => setCredencial(null)} className="text-xs font-bold text-amber-900 underline cursor-pointer">Ya la copié</button>
        </div>
      )}

      {/* ROLES */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {ROLES_EQUIPO.map((r) => (
          <div key={r.id} className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="font-bold text-slate-900 text-sm">{r.label}</div>
            <div className="text-[11px] text-slate-500 mt-1">{r.descripcion}</div>
          </div>
        ))}
      </div>

      {/* LISTA */}
      <div className="bg-white rounded-3xl border border-slate-200">
        <div className="p-5 flex items-center justify-between border-b border-slate-100">
          <h3 className="font-bold text-slate-900">
            Miembros <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs">{miembros.length}</span>
          </h3>
          <button onClick={() => setMostrarAlta((v) => !v)} className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs cursor-pointer">
            + Agregar miembro
          </button>
        </div>

        {mostrarAlta && (
          <div className="p-5 border-b border-slate-100 bg-slate-50 grid md:grid-cols-[1fr_1fr_180px_auto] gap-2">
            <input placeholder="Usuario o correo" value={nuevo.username} onChange={(e) => setNuevo({ ...nuevo, username: e.target.value })} className={campo} />
            <input placeholder="Nombre completo" value={nuevo.nombreCompleto} onChange={(e) => setNuevo({ ...nuevo, nombreCompleto: e.target.value })} className={campo} />
            <select value={nuevo.rol} onChange={(e) => setNuevo({ ...nuevo, rol: e.target.value as RolEquipoSuperAdmin })} className={campo}>
              {ROLES_EQUIPO.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
            <button onClick={crear} disabled={procesando || nuevo.username.trim().length < 3} className="px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer disabled:opacity-50">
              Crear cuenta
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-bold text-slate-500 uppercase">
                <th className="px-5 py-3">Miembro</th>
                <th className="px-3 py-3">Rol</th>
                <th className="px-3 py-3">Estado</th>
                <th className="px-3 py-3">Último acceso</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {miembros.map((m) => (
                <tr key={m.id} className="border-t border-slate-100">
                  <td className="px-5 py-3">
                    <div className="font-bold text-slate-900">{m.nombreCompleto || m.username}{m.esUstedMismo && <span className="ml-2 text-[10px] text-emerald-700">(usted)</span>}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{m.username}</div>
                    <div className="text-[11px] text-slate-500">
                      {m.email || <span className="text-amber-700">Sin correo</span>} · {m.telefono || <span className="text-amber-700">Sin teléfono</span>}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <select
                      value={m.rol}
                      disabled={m.esUstedMismo || procesando}
                      onChange={(e) => cambiarRol(m, e.target.value as RolEquipoSuperAdmin)}
                      className="px-2 py-1 rounded-lg border border-slate-200 text-xs font-bold bg-white disabled:opacity-60"
                    >
                      {ROLES_EQUIPO.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${m.activo ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                        {m.activo ? "Activa" : "Suspendida"}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${m.totpActivo ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
                        {m.totpActivo ? "Con 2FA" : "Sin 2FA"}
                      </span>
                      {m.debeCambiarClave && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">Clave temporal</span>}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-600 whitespace-nowrap">{fecha(m.ultimoAcceso)}</td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    {!m.esUstedMismo && (
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => resetear(m)} disabled={procesando} className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-[11px] cursor-pointer">
                          Resetear acceso
                        </button>
                        <button
                          onClick={() => alternarActivo(m)}
                          disabled={procesando}
                          className={`px-2.5 py-1 rounded-lg border font-bold text-[11px] cursor-pointer ${m.activo ? "border-rose-200 text-rose-700 hover:bg-rose-50" : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"}`}
                        >
                          {m.activo ? "Suspender" : "Reactivar"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
