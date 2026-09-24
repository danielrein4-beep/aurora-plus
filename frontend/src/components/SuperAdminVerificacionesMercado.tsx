import { useEffect, useState } from "react";
import { avisar } from "../avisos";
import {
  abrirDocumentoVerificacionMercado,
  listarVerificacionesMercado,
  revisarDocumentoVerificacionMercado,
  type SolicitudVerificacionMercado,
} from "../api";

const NOMBRE_DOC: Record<string, string> = { CEDULA: "Cédula del titular", HIERRO: "Registro de hierro", TIERRA: "Documento de la tierra" };
const NIVEL: Record<string, string> = { MIRAR: "Solo mira", COMPRAR: "Puede comprar", VENDER: "Puede vender" };

/**
 * Bandeja del equipo verificador del Mercado Ganadero. Solo PROPIETARIO y SOPORTE: el
 * servidor rechaza al resto y aquí se muestra un aviso en vez de la lista. Cada documento se
 * abre descifrado en una pestaña nueva y la apertura queda anotada con el usuario.
 */
export default function SuperAdminVerificacionesMercado() {
  const [estado, setEstado] = useState<"PENDIENTE" | "APROBADO" | "RECHAZADO" | "TODOS">("PENDIENTE");
  const [lista, setLista] = useState<SolicitudVerificacionMercado[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<number | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    setLista(null);
    setError(null);
    listarVerificacionesMercado(estado).then(setLista).catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar"));
  }, [estado, version]);

  const abrir = async (id: number) => {
    setOcupado(id);
    try {
      const blob = await abrirDocumentoVerificacionMercado(id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo abrir el documento");
    } finally {
      setOcupado(null);
    }
  };

  const revisar = async (id: number, aprobar: boolean) => {
    let motivo: string | undefined;
    if (!aprobar) {
      const m = prompt("Motivo del rechazo (la finca lo verá para corregirlo):");
      if (!m || !m.trim()) return;
      motivo = m.trim();
    }
    setOcupado(id);
    try {
      await revisarDocumentoVerificacionMercado(id, aprobar, motivo);
      setVersion((v) => v + 1);
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo guardar la revisión");
    } finally {
      setOcupado(null);
    }
  };

  const sinPermiso = error && /permiso|403|forbidden/i.test(error);

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-900">Verificación de fincas</h3>
          <p className="text-xs text-slate-500">Cédula para comprar, hierro para vender. Compara el nombre y el número escritos con el documento antes de aprobar.</p>
        </div>
        <div className="flex gap-1 p-1 rounded-xl bg-slate-100 text-xs">
          {(["PENDIENTE", "APROBADO", "RECHAZADO", "TODOS"] as const).map((e) => (
            <button key={e} onClick={() => setEstado(e)}
              className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${estado === e ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
              {e === "PENDIENTE" ? "Por revisar" : e === "APROBADO" ? "Aprobadas" : e === "RECHAZADO" ? "Rechazadas" : "Todas"}
            </button>
          ))}
        </div>
      </div>

      {sinPermiso ? (
        <p className="text-sm text-slate-500">Solo el propietario y el equipo de soporte pueden ver los documentos de verificación.</p>
      ) : error ? (
        <p className="text-sm text-rose-600">{error}</p>
      ) : lista === null ? (
        <p className="text-sm text-slate-400">Cargando…</p>
      ) : lista.length === 0 ? (
        <p className="text-sm text-slate-400">{estado === "PENDIENTE" ? "No hay fincas esperando revisión." : "Sin resultados."}</p>
      ) : (
        <div className="space-y-3">
          {lista.map((s) => (
            <div key={s.tenant_id} className="rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900">{s.nombre_empresa ?? `Negocio ${s.tenant_id}`}</div>
                  <div className="text-xs text-slate-500">
                    Titular: <strong className="text-slate-700">{s.titular_nombre ?? "—"}</strong> · Cédula: <strong className="text-slate-700">{s.titular_cedula ?? "—"}</strong>
                    {s.numero_hierro && <> · Hierro N° <strong className="text-slate-700">{s.numero_hierro}</strong></>}
                    {s.tipo_tierra && <> · Tierra: {s.tipo_tierra.toLowerCase()}</>}
                  </div>
                </div>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${s.ubicacionCargada ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {s.ubicacionCargada ? "Ubicación cargada" : "Sin ubicación"}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{NIVEL[s.nivel] ?? s.nivel}</span>
              </div>
              <div className="space-y-2">
                {s.documentos.map((d) => (
                  <div key={d.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                    <span className="text-sm font-semibold text-slate-800 flex-1 min-w-0">
                      {NOMBRE_DOC[d.tipo] ?? d.tipo}
                      <span className="text-[11px] font-normal text-slate-400"> · {(d.tamano_bytes / 1024).toFixed(0)} KB · {new Date(d.subido_en).toLocaleString()}</span>
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      d.estado === "APROBADO" ? "bg-emerald-50 text-emerald-700" : d.estado === "RECHAZADO" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>
                      {d.estado === "APROBADO" ? `Aprobado${d.revisado_por ? ` por ${d.revisado_por}` : ""}` : d.estado === "RECHAZADO" ? "Rechazado" : "Por revisar"}
                    </span>
                    <button onClick={() => abrir(d.id)} disabled={ocupado === d.id}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 text-[11px] font-bold hover:bg-white cursor-pointer disabled:opacity-50">
                      Ver documento
                    </button>
                    {d.estado !== "APROBADO" && (
                      <button onClick={() => revisar(d.id, true)} disabled={ocupado === d.id}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 cursor-pointer disabled:opacity-50">
                        Aprobar
                      </button>
                    )}
                    {d.estado !== "RECHAZADO" && (
                      <button onClick={() => revisar(d.id, false)} disabled={ocupado === d.id}
                        className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-700 text-[11px] font-bold hover:bg-rose-50 cursor-pointer disabled:opacity-50">
                        Rechazar
                      </button>
                    )}
                    {d.motivo_rechazo && <span className="basis-full text-[11px] text-rose-600">Motivo: {d.motivo_rechazo}</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
