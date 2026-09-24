import { useEffect, useState } from "react";
import {
  listarPagosSuperAdmin,
  listarAuditoriaGlobalSuperAdmin,
  obtenerActividadTenantSuperAdmin,
  type LicenciaTenant,
  type PagoSuscripcion,
  type RegistroAuditoriaItem,
  type ActividadTenant,
} from "../api";

interface Props {
  tenant: LicenciaTenant;
  diasRestantes: number;
  onCerrar: () => void;
  onCobro: () => void;
  onCortesia: () => void;
  onModulos: () => void;
  onUsuarios: () => void;
  onSoporte: () => void;
  onActivar: () => void;
  onSuspender: () => void;
}

type Pestana = "RESUMEN" | "COBROS" | "AUDITORIA";

const numero = new Intl.NumberFormat("es-VE");
const moneda = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric" });
}

/** Ficha completa de un negocio: datos, acciones, actividad, cobros y auditoría en un solo lugar. */
export default function SuperAdminFichaTenant({
  tenant, diasRestantes, onCerrar, onCobro, onCortesia, onModulos, onUsuarios, onSoporte, onActivar, onSuspender,
}: Props) {
  const [pestana, setPestana] = useState<Pestana>("RESUMEN");
  const [actividad, setActividad] = useState<ActividadTenant | null>(null);
  const [pagos, setPagos] = useState<PagoSuscripcion[] | null>(null);
  const [auditoria, setAuditoria] = useState<RegistroAuditoriaItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setActividad(null); setPagos(null); setAuditoria(null); setError(null); setPestana("RESUMEN");
    obtenerActividadTenantSuperAdmin(tenant.tenantId, 30).then(setActividad).catch((e: Error) => setError(e.message));
  }, [tenant.tenantId]);

  useEffect(() => {
    if (pestana === "COBROS" && pagos === null) {
      listarPagosSuperAdmin(tenant.tenantId).then(setPagos).catch((e: Error) => { setPagos([]); setError(e.message); });
    }
    if (pestana === "AUDITORIA" && auditoria === null) {
      listarAuditoriaGlobalSuperAdmin({ tenantId: tenant.tenantId, tamano: 50 })
        .then((r) => setAuditoria(r.content))
        .catch((e: Error) => { setAuditoria([]); setError(e.message); });
    }
  }, [pestana, tenant.tenantId, pagos, auditoria]);

  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => { if (e.key === "Escape") onCerrar(); };
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, [onCerrar]);

  const estado = !tenant.activa
    ? { texto: "Suspendido", clase: "bg-rose-50 text-rose-700 border-rose-200" }
    : diasRestantes <= 5
    ? { texto: `Vence en ${diasRestantes} días`, clase: "bg-amber-50 text-amber-800 border-amber-200" }
    : { texto: `Activo · ${diasRestantes} días`, clase: "bg-emerald-50 text-emerald-700 border-emerald-200" };

  const botonSecundario = "px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer";

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onCerrar} />
      <aside className="relative w-full max-w-2xl h-full bg-slate-50 shadow-2xl flex flex-col animate-fadeIn">
        {/* CABECERA */}
        <div className="bg-white border-b border-slate-200 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[11px] font-mono text-slate-400">Negocio #{tenant.tenantId}</div>
              <h2 className="font-['Outfit'] font-black text-2xl text-slate-900 truncate">{tenant.nombreEmpresa}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${estado.clase}`}>{estado.texto}</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] font-bold uppercase">{tenant.moduloPrincipal}</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">Plan {tenant.tipoLicencia}</span>
              </div>
            </div>
            <button onClick={onCerrar} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer" title="Cerrar (Esc)">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ACCIONES */}
          <div className="flex flex-wrap gap-2 mt-5">
            <button onClick={onCobro} className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs cursor-pointer">Registrar cobro</button>
            <button onClick={onCortesia} className={botonSecundario}>Días de cortesía</button>
            <button onClick={onModulos} className={botonSecundario}>Módulos</button>
            <button onClick={onUsuarios} className={botonSecundario}>Usuarios</button>
            <button onClick={onSoporte} className={botonSecundario} title="Entrar a la cuenta del negocio como soporte (queda registrado en auditoría)">Entrar como soporte</button>
            {tenant.activa ? (
              <button onClick={onSuspender} className="px-3 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs cursor-pointer">Suspender</button>
            ) : (
              <button onClick={onActivar} className="px-3 py-2 rounded-xl border border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-bold text-xs cursor-pointer">Reactivar</button>
            )}
          </div>

          {/* PESTAÑAS */}
          <div className="flex gap-1 mt-5 -mb-6">
            {([["RESUMEN", "Resumen"], ["COBROS", "Cobros"], ["AUDITORIA", "Auditoría"]] as [Pestana, string][]).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setPestana(id)}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 cursor-pointer ${pestana === id ? "border-emerald-500 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* CONTENIDO */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">{error}</div>}

          {pestana === "RESUMEN" && (
            <>
              <div className="bg-white rounded-2xl border border-slate-200 p-5 grid grid-cols-2 gap-4 text-xs">
                <Dato titulo="Correo" valor={tenant.emailContacto || "Sin correo"} />
                <Dato titulo="Teléfono" valor={tenant.telefonoContacto || "-"} />
                <Dato titulo="Razón social" valor={tenant.razonSocial || "-"} />
                <Dato titulo="RIF" valor={tenant.rif || "-"} />
                <Dato titulo="Vencimiento de licencia" valor={tenant.fechaVencimientoPago || "Indefinido"} />
                <Dato titulo="Usuarios" valor={`${tenant.cantidadUsuarios ?? 0} de ${tenant.limiteUsuarios ? tenant.limiteUsuarios : "ilimitados"}`} />
                <Dato titulo="Moneda base" valor={tenant.monedaBase || "USD"} />
                <Dato titulo="Última actividad" valor={actividad ? fechaCorta(actividad.ultimaActividad) : "..."} />
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h3 className="font-bold text-slate-900 text-sm">Uso en los últimos 30 días</h3>
                <p className="text-[11px] text-slate-500 mb-4">Lo que el negocio registró dentro de Aurora.</p>
                {!actividad ? (
                  <div className="text-xs text-slate-400">Cargando...</div>
                ) : actividad.metricas.length === 0 ? (
                  <div className="text-xs text-slate-500">Este negocio todavía no ha registrado operaciones.</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {actividad.metricas.map((m) => (
                      <div key={m.clave} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <div className="text-[11px] font-bold text-slate-600">{m.etiqueta}</div>
                        <div className="text-xl font-bold text-slate-900">{numero.format(m.conFecha ? m.periodo ?? 0 : m.total)}</div>
                        <div className="text-[10px] text-slate-500">{m.conFecha ? `${numero.format(m.total)} históricos` : "acumulado"}</div>
                        {m.monto !== null && <div className="text-[10px] font-mono text-emerald-700">Monto: {moneda.format(m.monto)}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {pestana === "COBROS" && (
            <div className="bg-white rounded-2xl border border-slate-200">
              {pagos === null ? (
                <div className="p-5 text-xs text-slate-400">Cargando...</div>
              ) : pagos.length === 0 ? (
                <div className="p-5 text-xs text-slate-500">No hay cobros registrados para este negocio.</div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="text-[10px] uppercase text-slate-400 font-bold">
                    <tr><th className="text-left p-3">Fecha</th><th className="text-left p-3">Método</th><th className="text-right p-3">Monto</th><th className="text-left p-3">Estado</th></tr>
                  </thead>
                  <tbody>
                    {pagos.map((p) => (
                      <tr key={p.id} className="border-t border-slate-100">
                        <td className="p-3">{fechaCorta(p.fechaPago)}</td>
                        <td className="p-3">{p.metodoPago}{p.referenciaComprobante ? ` · ${p.referenciaComprobante}` : ""}</td>
                        <td className="p-3 text-right font-mono">{moneda.format(p.monto)} {p.moneda}</td>
                        <td className="p-3">{p.estado}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {pestana === "AUDITORIA" && (
            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
              {auditoria === null ? (
                <div className="p-5 text-xs text-slate-400">Cargando...</div>
              ) : auditoria.length === 0 ? (
                <div className="p-5 text-xs text-slate-500">Sin registros de auditoría para este negocio.</div>
              ) : (
                auditoria.map((a) => (
                  <div key={a.id} className="p-4 text-xs">
                    <div className="flex justify-between gap-3">
                      <span className="font-bold text-slate-800">{a.accion} · {a.modulo}</span>
                      <span className="text-slate-400 font-mono shrink-0">{new Date(a.fecha).toLocaleString("es-VE")}</span>
                    </div>
                    <div className="text-slate-600 mt-1">{a.descripcion}</div>
                    <div className="text-[10px] text-slate-400 mt-1">Por {a.usuario}{a.rolUsuario ? ` (${a.rolUsuario})` : ""}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-bold uppercase text-slate-400">{titulo}</div>
      <div className="text-slate-800 font-semibold truncate">{valor}</div>
    </div>
  );
}
