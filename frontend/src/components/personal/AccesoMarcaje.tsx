import { useEffect, useState } from "react";
import {
  leerSesion, listarUsuariosPropios, verAccesoTrabajador, vincularAccesoTrabajador, quitarAccesoTrabajador,
  type AccesoTrabajador, type UsuarioTenant,
} from "../../api";

/**
 * En la ficha del trabajador (solo el dueño): elegir con qué usuario del negocio marca su
 * entrada y su salida. Sin este vínculo el trabajador no puede marcarse a sí mismo.
 */
export default function AccesoMarcaje({ empleadoId }: { empleadoId: number }) {
  const [acceso, setAcceso] = useState<AccesoTrabajador | null | undefined>(undefined);
  const [usuarios, setUsuarios] = useState<UsuarioTenant[]>([]);
  const [elegido, setElegido] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; error?: boolean } | null>(null);

  useEffect(() => {
    const tenantId = leerSesion()?.tenantId;
    verAccesoTrabajador(empleadoId).then(setAcceso).catch(() => setAcceso(null));
    if (tenantId) {
      listarUsuariosPropios(tenantId)
        .then((lista) => setUsuarios(lista.filter((u) => u.rol !== "DUENO_ADMIN" && u.activo !== false)))
        .catch(() => setUsuarios([]));
    }
  }, [empleadoId]);

  const vincular = async () => {
    if (!elegido) return;
    setGuardando(true);
    setMensaje(null);
    try {
      setAcceso(await vincularAccesoTrabajador(empleadoId, Number(elegido)));
      setElegido("");
      setMensaje({ texto: "Listo: con ese usuario ya puede marcar su entrada y su salida." });
    } catch (e) {
      setMensaje({ texto: e instanceof Error ? e.message : "No se pudo dar el acceso", error: true });
    } finally {
      setGuardando(false);
    }
  };

  const quitar = async () => {
    setGuardando(true);
    setMensaje(null);
    try {
      await quitarAccesoTrabajador(empleadoId);
      setAcceso(null);
    } catch (e) {
      setMensaje({ texto: e instanceof Error ? e.message : "No se pudo quitar el acceso", error: true });
    } finally {
      setGuardando(false);
    }
  };

  if (acceso === undefined) return null;

  return (
    <div className="space-y-2">
      <h4 className="font-bold text-slate-900 text-sm">Acceso para marcar su asistencia</h4>
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
        {acceso ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-slate-700">
              Marca con el usuario <strong>{acceso.username || `#${acceso.usuarioId}`}</strong>: entra a Aurora y toca "Marcar entrada" o "Marcar salida".
            </span>
            <button type="button" onClick={quitar} disabled={guardando} className="text-xs font-bold text-rose-600 cursor-pointer disabled:opacity-60">
              Quitar acceso
            </button>
          </div>
        ) : usuarios.length === 0 ? (
          <p className="text-sm text-slate-600">
            Primero crea un usuario para este trabajador en Aurora Hub › Equipo &amp; Roles. Después vuelve aquí para darle el acceso.
          </p>
        ) : (
          <>
            <p className="text-sm text-slate-600">Elige el usuario con el que este trabajador entra a Aurora. La hora la pone el sistema, no el teléfono.</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <select value={elegido} onChange={(e) => setElegido(e.target.value)} className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm">
                <option value="">Elige un usuario…</option>
                {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombreCompleto || u.username} ({u.username})</option>)}
              </select>
              <button type="button" onClick={vincular} disabled={!elegido || guardando}
                style={{ backgroundColor: "#0F766E", color: "#FFFFFF" }}
                className="px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50">
                Dar acceso
              </button>
            </div>
          </>
        )}
        {mensaje && <p className={`text-xs font-semibold ${mensaje.error ? "text-rose-600" : "text-emerald-700"}`}>{mensaje.texto}</p>}
      </div>
    </div>
  );
}
