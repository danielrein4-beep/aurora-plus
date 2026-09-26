import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { listarPacientes, listarProcedimientos, listarProfesionalesEstetica, obtenerMiNegocio, type Paciente, type ProcedimientoMedico, type ProfesionalEstetica } from "../api";
import { IconCalendarSolido, IconDashboardGrid, IconDoorExit, IconSparkles, IconTag, IconUsers, IconWallet, IconWarning } from "../Icons";
import { IconoCaja, IconoPersona } from "./estetica/iconos";
import { COLOR, mensajeError, type PaginaEstetica } from "./estetica/comun";
import VistaGeneral from "./estetica/VistaGeneral";
import Clientas from "./estetica/Clientas";
import Agenda from "./estetica/Agenda";
import Servicios from "./estetica/Servicios";
import PaginaPaquetes from "./estetica/Paquetes";
import Caja from "./estetica/Caja";
import Productos from "./estetica/Productos";
import Equipo from "./estetica/Equipo";

const NAV: { id: PaginaEstetica; label: string; Icon: (p: { size?: number }) => React.ReactNode }[] = [
  { id: "general", label: "Vista General", Icon: IconDashboardGrid },
  { id: "clientas", label: "Clientas", Icon: IconUsers },
  { id: "agenda", label: "Agenda", Icon: IconCalendarSolido },
  { id: "paquetes", label: "Paquetes", Icon: IconSparkles },
  { id: "servicios", label: "Servicios", Icon: IconTag },
  { id: "productos", label: "Productos", Icon: IconoCaja },
  { id: "caja", label: "Caja", Icon: IconWallet },
  { id: "equipo", label: "Equipo y comisiones", Icon: IconoPersona },
];

export default function EsteticaApp({ onSalir }: { onSalir?: () => void }) {
  const { user, logout } = useAuth();
  const tenantId = user?.tenantId ? Number(user.tenantId) : null;

  const [pagina, setPagina] = useState<PaginaEstetica>("general");
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [clientas, setClientas] = useState<Paciente[]>([]);
  const [cargandoClientas, setCargandoClientas] = useState(true);
  const [errorClientas, setErrorClientas] = useState<string | null>(null);
  const [seleccionada, setSeleccionada] = useState<Paciente | null>(null);
  const [servicios, setServicios] = useState<ProcedimientoMedico[]>([]);
  const [errorServicios, setErrorServicios] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [profesionales, setProfesionales] = useState<ProfesionalEstetica[]>([]);
  const [errorEquipo, setErrorEquipo] = useState<string | null>(null);
  // Estética aún no se ofrece al público: solo la abren las cuentas de verificación del superadmin
  // (las que pueden cambiar de vertical en el Hub). null = verificando.
  const [habilitada, setHabilitada] = useState<boolean | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    let activo = true;
    obtenerMiNegocio()
      .then((n) => activo && setHabilitada(!!n.permiteCambioVertical))
      .catch(() => activo && setHabilitada(false));
    return () => { activo = false; };
  }, [tenantId]);

  const recargarClientas = useCallback(async () => {
    try {
      const lista = await listarPacientes();
      setClientas(lista);
      setErrorClientas(null);
      return lista;
    } catch (e) {
      setErrorClientas(mensajeError(e, "No se pudieron cargar las clientas."));
    } finally {
      setCargandoClientas(false);
    }
  }, []);

  const recargarServicios = useCallback(async () => {
    if (!tenantId) return;
    try {
      setServicios(await listarProcedimientos(tenantId));
      setErrorServicios(null);
    } catch (e) {
      setErrorServicios(mensajeError(e, "No se pudieron cargar los servicios."));
    }
  }, [tenantId]);

  const recargarProfesionales = useCallback(async () => {
    try {
      setProfesionales(await listarProfesionalesEstetica());
      setErrorEquipo(null);
    } catch (e) {
      setErrorEquipo(mensajeError(e, "No se pudo cargar el equipo."));
    }
  }, []);

  useEffect(() => {
    if (!tenantId || !habilitada) return;
    recargarClientas();
    recargarServicios();
    recargarProfesionales();
  }, [tenantId, habilitada, recargarClientas, recargarServicios, recargarProfesionales]);

  const ir = (p: PaginaEstetica) => {
    setPagina(p);
    setMenuAbierto(false);
    if (p === "general") setVersion((v) => v + 1);
  };

  if (!tenantId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-6">
        <div className="bg-white p-8 rounded-3xl border border-rose-200 max-w-md text-center shadow-sm">
          <span className="inline-flex text-rose-500 mb-3"><IconWarning size={40} /></span>
          <h2 className="text-lg font-bold text-slate-900 mb-1">No hay un negocio en la sesión</h2>
          <p className="text-sm text-slate-500 mb-5">Inicia sesión con la cuenta de tu centro de estética para continuar.</p>
          <button onClick={logout} className="px-4 py-2 rounded-xl bg-[#9E4A63] text-[#ffffff] text-sm font-semibold cursor-pointer">Cerrar sesión</button>
        </div>
      </div>
    );
  }

  if (habilitada !== true) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-6">
        {habilitada === null ? (
          <span className="w-6 h-6 rounded-full border-2 border-[#9E4A63]/30 border-t-[#9E4A63] animate-spin" aria-label="Verificando acceso" />
        ) : (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 max-w-md text-center shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Estética aún no está disponible</h2>
            <p className="text-sm text-slate-500 mb-5">Este módulo está en preparación y todavía no se ofrece a los negocios.</p>
            {onSalir && (
              <button onClick={onSalir} className="px-4 py-2 rounded-xl bg-[#9E4A63] text-[#ffffff] text-sm font-semibold cursor-pointer">Volver al Hub</button>
            )}
          </div>
        )}
      </div>
    );
  }

  const negocio = user?.empresa || "Mi Centro de Estética";

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex">
      {menuAbierto && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMenuAbierto(false)} aria-hidden="true" />}

      <aside
        className={`w-64 flex-shrink-0 border-r border-white/10 flex flex-col p-4 space-y-1.5 fixed inset-y-0 left-0 z-50 overflow-y-auto transform transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${menuAbierto ? "translate-x-0" : "-translate-x-full"}`}
        style={{ backgroundColor: COLOR.sidebar }}
      >
        <div className="px-2 pb-3 mb-2 border-b border-white/10">
          <div className="font-['Outfit'] font-black text-lg text-[#ffffff] flex items-center gap-2">
            <span className="text-[#E3A6B4]"><IconSparkles size={20} /></span>
            Aurora Estética
          </div>
          <div className="text-[10px] text-[#ffffff]/40 uppercase tracking-wider mt-0.5 truncate">{negocio}</div>
        </div>

        <div className="px-2 pb-1 text-[11px] font-bold text-[#ffffff]/30 uppercase tracking-wider">Estética y cosmiatría</div>

        <div className="space-y-1">
          {NAV.map((n) => {
            const activo = pagina === n.id;
            return (
              <button
                key={n.id}
                onClick={() => ir(n.id)}
                className={`sidebar-glare w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer ${
                  activo ? "sidebar-glare--active bg-white/10 text-[#ffffff]" : "text-[#ffffff]/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <n.Icon size={16} />
                <span className="truncate">{n.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 min-h-[10px]" />

        <div className="space-y-1 pt-1 border-t border-white/10">
          {onSalir && (
            <button onClick={onSalir} className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-left text-[#ffffff]/70 hover:bg-white/10 cursor-pointer">
              ← Volver a Aurora Hub
            </button>
          )}
          <button onClick={logout} className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-left text-rose-300 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer">
            <IconDoorExit size={14} /> Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 py-3 px-3 sm:px-5 border-b border-slate-200 dark:border-white/10 flex items-center gap-3 bg-white/75 dark:bg-[#140d17]/75 backdrop-blur-md">
          <button onClick={() => setMenuAbierto(true)} className="lg:hidden p-2 -ml-1 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer" aria-label="Abrir menú">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
          </button>
          <div className="min-w-0">
            <h1 className="font-['Outfit'] font-bold text-sm text-slate-900 dark:text-white tracking-tight truncate">{negocio}</h1>
            <p className="text-[11px] text-slate-500 dark:text-white/50 truncate">{NAV.find((n) => n.id === pagina)?.label}</p>
          </div>
        </header>

        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {pagina === "general" && <VistaGeneral key={version} nombre={user?.nombre || ""} totalClientas={clientas.length} onIr={ir} />}
          {pagina === "clientas" && (
            <Clientas
              clientas={clientas}
              servicios={servicios}
              profesionales={profesionales}
              negocio={negocio}
              seleccionada={seleccionada}
              onSeleccionar={setSeleccionada}
              onRecargar={recargarClientas}
              cargando={cargandoClientas}
              error={errorClientas}
            />
          )}
          {pagina === "agenda" && <Agenda clientas={clientas} servicios={servicios} />}
          {pagina === "paquetes" && <PaginaPaquetes clientas={clientas} servicios={servicios} />}
          {pagina === "servicios" && <Servicios tenantId={tenantId} servicios={servicios} onRecargar={recargarServicios} error={errorServicios} />}
          {pagina === "caja" && <Caja clientas={clientas} servicios={servicios} />}
          {pagina === "productos" && <Productos clientas={clientas} profesionales={profesionales} />}
          {pagina === "equipo" && <Equipo profesionales={profesionales} onRecargar={recargarProfesionales} error={errorEquipo} />}
        </div>
      </main>
    </div>
  );
}
