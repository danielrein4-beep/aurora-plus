import React, { useState, useEffect, useCallback } from "react";
import { listarAuditoria, type RegistroAuditoriaApi, type PaginaAuditoria } from "../api";

interface BitacoraAuditoriaProps {
  moduloSugerido?: string;
  className?: string;
}

const MODULOS_DISPONIBLES = [
  { valor: "", etiqueta: "Todos los Modulos" },
  { valor: "HORECA", etiqueta: "Gastronomia & HORECA" },
  { valor: "SALUD", etiqueta: "Salud & Mediclinic" },
  { valor: "GANADERIA", etiqueta: "Ganaderia & Agro" },
  { valor: "COMERCIO", etiqueta: "Comercio & Retail" },
  { valor: "PERSONAL", etiqueta: "Personal & Nomina" },
  { valor: "TAMANACO_COMERCIAL", etiqueta: "Tamanaco Comercial" },
  { valor: "AUTH", etiqueta: "Seguridad & Accesos" },
];

const ACCIONES_DISPONIBLES = [
  { valor: "", etiqueta: "Todas las Acciones" },
  { valor: "CREAR", etiqueta: "CREAR (Nuevos registros)" },
  { valor: "EDITAR", etiqueta: "EDITAR (Modificaciones)" },
  { valor: "ELIMINAR", etiqueta: "ELIMINAR (Bajas y anulaciones)" },
];

function formatearFecha(isoStr: string): { fecha: string; hora: string } {
  if (!isoStr) return { fecha: "-", hora: "" };
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return { fecha: isoStr, hora: "" };
    const pad = (n: number) => String(n).padStart(2, "0");
    const fecha = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const hora = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    return { fecha, hora };
  } catch {
    return { fecha: isoStr, hora: "" };
  }
}

function AccionBadge({ accion }: { accion: string }) {
  const acc = (accion || "").toUpperCase();
  if (acc === "CREAR") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
        CREAR
      </span>
    );
  }
  if (acc === "EDITAR") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
        EDITAR
      </span>
    );
  }
  if (acc === "ELIMINAR") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
        ELIMINAR
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30">
      {acc || "ACCION"}
    </span>
  );
}

function ModuloBadge({ modulo }: { modulo: string }) {
  const mod = (modulo || "").toUpperCase();
  const etiquetas: Record<string, string> = {
    HORECA: "HORECA",
    SALUD: "Salud",
    GANADERIA: "Ganaderia",
    COMERCIO: "Comercio",
    PERSONAL: "Nomina",
    TAMANACO_COMERCIAL: "Tamanaco",
    AUTH: "Auth",
  };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-200/70 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-300/60 dark:border-white/10">
      {etiquetas[mod] || mod}
    </span>
  );
}

export default function BitacoraAuditoria({ moduloSugerido = "", className = "" }: BitacoraAuditoriaProps) {
  const [registros, setRegistros] = useState<RegistroAuditoriaApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [moduloFiltro, setModuloFiltro] = useState<string>(moduloSugerido);
  const [accionFiltro, setAccionFiltro] = useState<string>("");

  // Paginacion (0-indexed en backend)
  const [pagina, setPagina] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const tamano = 25;

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const resp: PaginaAuditoria = await listarAuditoria({
        modulo: moduloFiltro || undefined,
        accion: accionFiltro || undefined,
        pagina,
        tamano,
      });
      setRegistros(resp.content || []);
      setTotalPages(resp.totalPages || 1);
      setTotalElements(resp.totalElements || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar la bitacora de auditoria");
    } finally {
      setCargando(false);
    }
  }, [moduloFiltro, accionFiltro, pagina]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleModuloChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setModuloFiltro(e.target.value);
    setPagina(0);
  };

  const handleAccionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setAccionFiltro(e.target.value);
    setPagina(0);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Cabecera Informativa */}
      <div className="apple-glass rounded-2xl p-5 border border-slate-200/80 dark:border-white/10 shadow-sm bg-white/70 dark:bg-slate-900/50 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Bitacora de Auditoria</span>
                  <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40">
                    Solo Dueno Admin
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/60">
                  Registro inmutable de trazabilidad de operaciones (crear, editar, eliminar) en el negocio.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={cargarDatos}
              disabled={cargando}
              className="apple-glass px-3 py-1.5 rounded-xl border border-slate-300/80 dark:border-white/15 text-slate-700 dark:text-white text-xs font-semibold hover:bg-slate-200/50 dark:hover:bg-white/10 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Recargar eventos"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cargando ? "animate-spin" : ""}>
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M8 16H3v5" />
              </svg>
              <span>{cargando ? "Actualizando..." : "Refrescar"}</span>
            </button>
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">
              Filtrar por Modulo
            </label>
            <select
              value={moduloFiltro}
              onChange={handleModuloChange}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              {MODULOS_DISPONIBLES.map((m) => (
                <option key={m.valor} value={m.valor}>
                  {m.etiqueta}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">
              Filtrar por Accion
            </label>
            <select
              value={accionFiltro}
              onChange={handleAccionChange}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              {ACCIONES_DISPONIBLES.map((a) => (
                <option key={a.valor} value={a.valor}>
                  {a.etiqueta}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-2 flex items-end justify-between sm:justify-end gap-3">
            <div className="text-right">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total de Eventos:</span>{" "}
              <span className="font-mono font-bold text-xs text-slate-800 dark:text-white">{totalElements}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error si ocurre */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Tabla de Registros */}
      <div className="apple-glass rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-sm bg-white/70 dark:bg-slate-900/50 backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-100/60 dark:bg-white/[0.03] text-slate-500 dark:text-white/50 text-[10px] uppercase font-mono tracking-wider">
                <th className="py-3 px-4">Fecha & Hora</th>
                <th className="py-3 px-3">Usuario & Rol</th>
                <th className="py-3 px-3">Modulo</th>
                <th className="py-3 px-3">Accion</th>
                <th className="py-3 px-3">Entidad Afectada</th>
                <th className="py-3 px-4">Detalle / Descripcion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-white/5">
              {cargando && registros.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-white/40">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin text-emerald-500">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      <span className="text-xs font-medium">Consultando registros de auditoria...</span>
                    </div>
                  </td>
                </tr>
              ) : registros.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-white/40">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                      <div className="w-12 h-12 rounded-full bg-slate-200/60 dark:bg-white/5 flex items-center justify-center text-slate-400">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect width="18" height="18" x="3" y="3" rx="2" />
                          <path d="M9 12h6" />
                          <path d="M12 9v6" />
                        </svg>
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-white/80">
                        Sin eventos de auditoria encontrados
                      </span>
                      <p className="text-xs text-slate-500 dark:text-white/50">
                        No hay operaciones registradas con los filtros actuales. Todas las altas, bajas y modificaciones
                        futuras en los modulos activos seran asentadas aqui automaticamente.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                registros.map((r) => {
                  const { fecha, hora } = formatearFecha(r.fecha);
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-100/40 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Fecha y Hora */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono text-slate-800 dark:text-slate-200 font-semibold">{fecha}</div>
                        <div className="font-mono text-[10px] text-slate-500 dark:text-white/40">{hora}</div>
                      </td>

                      {/* Usuario y Rol */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-bold text-slate-900 dark:text-white">{r.usuario || "sistema"}</div>
                        {r.rolUsuario && (
                          <div className="text-[10px] font-mono text-slate-500 dark:text-white/50">
                            {r.rolUsuario}
                          </div>
                        )}
                      </td>

                      {/* Modulo */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <ModuloBadge modulo={r.modulo} />
                      </td>

                      {/* Accion */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <AccionBadge accion={r.accion} />
                      </td>

                      {/* Entidad Afectada */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                          <span className="capitalize">{r.entidad || "-"}</span>
                          {r.entidadId && (
                            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                              #{r.entidadId}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Descripcion */}
                      <td className="py-3 px-4">
                        <span className="text-slate-700 dark:text-slate-300 break-words font-mono text-[11px]">
                          {r.descripcion || "-"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginador */}
        {totalPages > 1 && (
          <div className="p-3.5 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between gap-2">
            <div className="text-xs text-slate-500 dark:text-white/60">
              Pagina <span className="font-bold text-slate-800 dark:text-white">{pagina + 1}</span> de{" "}
              <span className="font-bold text-slate-800 dark:text-white">{totalPages}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagina((p) => Math.max(0, p - 1))}
                disabled={pagina === 0 || cargando}
                className="apple-glass px-3 py-1.5 rounded-xl border border-slate-300 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-white hover:bg-slate-200/50 dark:hover:bg-white/10 transition-all disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => setPagina((p) => Math.min(totalPages - 1, p + 1))}
                disabled={pagina >= totalPages - 1 || cargando}
                className="apple-glass px-3 py-1.5 rounded-xl border border-slate-300 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-white hover:bg-slate-200/50 dark:hover:bg-white/10 transition-all disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
