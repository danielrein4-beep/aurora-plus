import { useEffect, useState } from "react";
import {
  obtenerMiAsistencia, marcarMiEntrada, marcarMiSalida, leerSesion,
  type EstadoMiAsistencia,
} from "../../api";

/**
 * "Mi asistencia": el trabajador marca SU entrada y SU salida con su propio usuario. La hora la
 * pone el servidor. Solo aparece si el usuario está vinculado a una ficha de trabajador (el dueño
 * da ese acceso desde la ficha del trabajador); para el dueño y los usuarios sin vínculo no se ve.
 */
export default function MiAsistencia({ compacto = false }: { compacto?: boolean }) {
  const [estado, setEstado] = useState<EstadoMiAsistencia | null>(null);
  const [marcando, setMarcando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; error?: boolean } | null>(null);

  const cargar = () => obtenerMiAsistencia().then(setEstado).catch(() => setEstado(null));

  useEffect(() => {
    // El dueño no marca asistencia: no se consulta.
    if (leerSesion()?.rol === "DUENO_ADMIN") return;
    cargar();
  }, []);

  if (!estado) return null;

  const abierta = estado.entradaAbierta;
  const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" });
  const dia = (iso: string) => new Date(iso).toLocaleDateString("es-VE", { weekday: "short", day: "numeric", month: "short" });

  const marcar = async () => {
    setMarcando(true);
    setMensaje(null);
    try {
      const r = abierta ? await marcarMiSalida() : await marcarMiEntrada();
      setMensaje({ texto: abierta ? `Salida marcada a las ${hora(r.fechaHoraSalida || new Date().toISOString())}.` : `Entrada marcada a las ${hora(r.fechaHoraEntrada)}.` });
      await cargar();
    } catch (e) {
      setMensaje({ texto: e instanceof Error ? e.message : "No se pudo marcar. Revisa la conexión.", error: true });
    } finally {
      setMarcando(false);
    }
  };

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3 ${compacto ? "max-w-md" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-slate-900">Mi asistencia</div>
          <div className="text-xs text-slate-500">{estado.nombre}</div>
        </div>
        <span className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold ${abierta ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600 border border-slate-200"}`}>
          {abierta ? `Trabajando desde las ${hora(abierta.fechaHoraEntrada)}` : "Fuera de turno"}
        </span>
      </div>

      <button
        type="button"
        onClick={marcar}
        disabled={marcando}
        style={{ backgroundColor: abierta ? "#B45309" : "#0F766E", color: "#FFFFFF" }}
        className="w-full py-3.5 rounded-xl text-base font-bold cursor-pointer disabled:opacity-60"
      >
        {marcando ? "Marcando…" : abierta ? "Marcar salida" : "Marcar entrada"}
      </button>
      {mensaje && <p className={`text-xs font-semibold ${mensaje.error ? "text-rose-600" : "text-emerald-700"}`}>{mensaje.texto}</p>}

      {!compacto && estado.recientes.length > 0 && (
        <div className="pt-2 border-t border-slate-100 space-y-1">
          <div className="text-[11px] font-bold text-slate-400">Tus últimos días</div>
          {estado.recientes.slice(0, 5).map((r) => (
            <div key={r.id} className="flex justify-between text-xs text-slate-600">
              <span>{dia(r.fechaHoraEntrada)}</span>
              <span>{hora(r.fechaHoraEntrada)} – {r.fechaHoraSalida ? hora(r.fechaHoraSalida) : "en curso"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
