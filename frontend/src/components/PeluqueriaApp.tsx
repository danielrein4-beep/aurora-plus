import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  PaginaPeluqueria,
  CitaPeluqueria,
  TurnoWalkIn,
  ClientePeluqueria,
  TransaccionCobroPeluqueria,
  PresupuestoBelleza,
  CitaEstado,
  FichaTecnicaColorimetria,
} from "./peluqueria/types";
import {
  ESPECIALISTAS_INICIALES,
  SERVICIOS_INICIALES,
  CLIENTES_INICIALES,
  CITAS_INICIALES,
  TURNOS_WALKIN_INICIALES,
  TRANSACCIONES_INICIALES,
} from "./peluqueria/mockData";

import AgendaReservasPeluqueria from "./peluqueria/AgendaReservasPeluqueria";
import FilaAtencionWalkIn from "./peluqueria/FilaAtencionWalkIn";
import ClientesFichasBelleza from "./peluqueria/ClientesFichasBelleza";
import ModuloRetencion21Dias from "./peluqueria/ModuloRetencion21Dias";
import CobroCajaPeluqueria from "./peluqueria/CobroCajaPeluqueria";
import PresupuestosBelleza from "./peluqueria/PresupuestosBelleza";
import EstadisticasBelleza from "./peluqueria/EstadisticasBelleza";

import {
  IconCalendar,
  IconHourglass,
  IconUsers,
  IconSparkles,
  IconCard,
  IconFileText,
  IconChart,
  IconScissors,
  IconWarning,
} from "../Icons";

const STORAGE_KEYS = {
  citas: "aurora_peluqueria_citas_v1",
  walkin: "aurora_peluqueria_walkin_v1",
  clientes: "aurora_peluqueria_clientes_v1",
  txs: "aurora_peluqueria_txs_v1",
  presupuestos: "aurora_peluqueria_presupuestos_v1",
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTab: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundaryBelleza extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error capturado en módulo de Peluquería:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="apple-glass rounded-3xl p-8 max-w-lg mx-auto text-center border border-amber-500/30 bg-amber-500/5 space-y-4 my-12 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center mx-auto text-2xl">
            <IconWarning size={28} />
          </div>
          <h3 className="font-['Outfit'] font-black text-xl text-white">
            Módulo Temporalmente No Disponible
          </h3>
          <p className="text-white/70 text-xs leading-relaxed">
            Se ha interceptado una anomalía de renderizado de forma segura sin cerrar la aplicación ni interrumpir tu sesión.
          </p>
          <div className="text-[11px] font-mono text-red-300 bg-black/40 p-2.5 rounded-xl text-left overflow-x-auto">
            {this.state.error?.message || "Error desconocido"}
          </div>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false });
              this.props.fallbackTab();
            }}
            className="px-5 py-2 rounded-xl bg-teal-500 text-black font-bold text-xs hover:bg-teal-400 transition-all cursor-pointer"
          >
            Volver a la Agenda Principal
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function PeluqueriaApp({ onSalir }: { onSalir?: () => void }) {
  const { user } = useAuth();
  const [pagina, setPagina] = useState<PaginaPeluqueria>("agenda");
  const tasaBcv = 36.50;

  // Estados persistentes
  const [citas, setCitas] = useState<CitaPeluqueria[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.citas);
      return raw ? JSON.parse(raw) : CITAS_INICIALES;
    } catch {
      return CITAS_INICIALES;
    }
  });

  const [turnosWalkIn, setTurnosWalkIn] = useState<TurnoWalkIn[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.walkin);
      return raw ? JSON.parse(raw) : TURNOS_WALKIN_INICIALES;
    } catch {
      return TURNOS_WALKIN_INICIALES;
    }
  });

  const [clientes, setClientes] = useState<ClientePeluqueria[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.clientes);
      return raw ? JSON.parse(raw) : CLIENTES_INICIALES;
    } catch {
      return CLIENTES_INICIALES;
    }
  });

  const [transacciones, setTransacciones] = useState<TransaccionCobroPeluqueria[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.txs);
      return raw ? JSON.parse(raw) : TRANSACCIONES_INICIALES;
    } catch {
      return TRANSACCIONES_INICIALES;
    }
  });

  const [presupuestos, setPresupuestos] = useState<PresupuestoBelleza[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.presupuestos);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Guardar en localStorage
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.citas, JSON.stringify(citas)); } catch {}
  }, [citas]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.walkin, JSON.stringify(turnosWalkIn)); } catch {}
  }, [turnosWalkIn]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.clientes, JSON.stringify(clientes)); } catch {}
  }, [clientes]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.txs, JSON.stringify(transacciones)); } catch {}
  }, [transacciones]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.presupuestos, JSON.stringify(presupuestos)); } catch {}
  }, [presupuestos]);

  // Handlers Citas
  const handleCrearCita = (nueva: Omit<CitaPeluqueria, "id" | "fechaCreacion">) => {
    const citaConId: CitaPeluqueria = {
      ...nueva,
      id: `cit-${Date.now()}`,
      fechaCreacion: new Date().toISOString().slice(0, 10),
    };
    setCitas([citaConId, ...citas]);
  };

  const handleCambiarEstadoCita = (id: string, nuevoEstado: CitaEstado) => {
    setCitas(citas.map((c) => (c.id === id ? { ...c, estado: nuevoEstado } : c)));
  };

  const handleIniciarCobroCita = (cita: CitaPeluqueria) => {
    setPagina("caja");
    handleCambiarEstadoCita(cita.id, "FINALIZADA");
  };

  // Handlers Walk-In
  const handleAgregarWalkIn = (turno: Omit<TurnoWalkIn, "id">) => {
    const turnoConId: TurnoWalkIn = {
      ...turno,
      id: `tur-${Date.now()}`,
    };
    setTurnosWalkIn([turnoConId, ...turnosWalkIn]);
  };

  const handleCambiarEstadoWalkIn = (id: string, nuevoEstado: TurnoWalkIn["estado"], datosExtra?: Partial<TurnoWalkIn>) => {
    setTurnosWalkIn(turnosWalkIn.map((t) => (t.id === id ? { ...t, estado: nuevoEstado, ...datosExtra } : t)));
  };

  const handleCobrarWalkIn = (turno: TurnoWalkIn) => {
    setPagina("caja");
    handleCambiarEstadoWalkIn(turno.id, "COBRADO");
  };

  // Handlers Clientes y Fichas
  const handleActualizarFicha = (clienteId: string, nuevaFicha: FichaTecnicaColorimetria) => {
    setClientes(clientes.map((c) => (c.id === clienteId ? { ...c, fichaTecnica: nuevaFicha } : c)));
  };

  const handleCrearCliente = (nuevo: Omit<ClientePeluqueria, "id">) => {
    const clienteConId: ClientePeluqueria = {
      ...nuevo,
      id: `cli-${Date.now()}`,
    };
    setClientes([clienteConId, ...clientes]);
  };

  // Handlers Caja
  const handleRegistrarCobro = (cobro: Omit<TransaccionCobroPeluqueria, "id">) => {
    const txConId: TransaccionCobroPeluqueria = {
      ...cobro,
      id: `cob-${Date.now()}`,
    };
    setTransacciones([txConId, ...transacciones]);
  };

  // Handlers Presupuestos
  const handleCrearPresupuesto = (presupuesto: PresupuestoBelleza) => {
    setPresupuestos([presupuesto, ...presupuestos]);
  };

  const NAV_ITEMS: { id: PaginaPeluqueria; label: string; Icon: (p: { size?: number }) => React.ReactNode; badge?: number }[] = [
    { id: "agenda", label: "Agenda & Citas", Icon: IconCalendar, badge: citas.filter((c) => c.estado === "EN_ATENCION").length },
    { id: "walkin", label: "Turno Rápido / Walk-In", Icon: IconHourglass, badge: turnosWalkIn.filter((t) => t.estado === "ESPERANDO").length },
    { id: "clientes", label: "Fichas & Colorimetría", Icon: IconUsers },
    { id: "retencion", label: "Retención & WhatsApp", Icon: IconSparkles },
    { id: "caja", label: "Caja & Comisiones", Icon: IconCard },
    { id: "presupuestos", label: "Presupuestos", Icon: IconFileText },
    { id: "estadisticas", label: "Estadísticas & KPIs", Icon: IconChart },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-500 relative flex flex-col">
      {/* HEADER SUPERIOR */}
      <header className="nav-glass border-b border-white/10 px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40 backdrop-blur-2xl">
        <div className="flex items-center gap-3.5">
          <div className="p-2 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-600 text-white shadow-md">
            <IconScissors size={20} />
          </div>
          <div>
            <div className="font-['Outfit'] font-black text-lg text-white flex items-center gap-2">
              <span>Aurora Beauty & Hair Suite</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase font-bold">
                Peluquería & Barbería Pro
              </span>
            </div>
            <div className="text-[11px] text-white/50 font-mono flex items-center gap-2 mt-0.5">
              <span>{user?.empresa || "Salón de Belleza & Spa"}</span>
              <span>•</span>
              <span className="text-teal-400 font-bold">Tasa Oficial: {tasaBcv.toFixed(2)} Bs/$</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/reservar"
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-1.5 rounded-xl bg-pink-500/20 text-pink-300 border border-pink-500/40 text-xs font-bold hover:bg-pink-500/30 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <IconCalendar size={14} />
            <span>Portal de Reservas Clientas</span>
          </a>

          {onSalir && (
            <button
              onClick={onSalir}
              className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-semibold border border-white/10 transition-colors"
            >
              Volver al Hub
            </button>
          )}
        </div>
      </header>

      {/* SUBNAV HORIZONTAL FLUIDO */}
      <div className="border-b border-white/5 px-4 sm:px-8 py-2.5 bg-black/20 backdrop-blur-md overflow-x-auto">
        <nav className="flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap max-w-7xl mx-auto">
          {NAV_ITEMS.map((item) => {
            const isSelected = pagina === item.id;
            const ItemIcon = item.Icon;
            return (
              <button
                key={item.id}
                onClick={() => setPagina(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                  isSelected
                    ? "bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold shadow-md shadow-rose-500/20 scale-[1.02]"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <ItemIcon size={15} />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="w-4 h-4 rounded-full bg-amber-400 text-black text-[10px] font-black flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* CONTENIDO PRINCIPAL CON ERROR BOUNDARY */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8">
        <ErrorBoundaryBelleza fallbackTab={() => setPagina("agenda")}>
          {pagina === "agenda" && (
            <AgendaReservasPeluqueria
              citas={citas}
              especialistas={ESPECIALISTAS_INICIALES}
              servicios={SERVICIOS_INICIALES}
              onCrearCita={handleCrearCita}
              onCambiarEstadoCita={handleCambiarEstadoCita}
              onIniciarCobroCita={handleIniciarCobroCita}
            />
          )}

          {pagina === "walkin" && (
            <FilaAtencionWalkIn
              turnos={turnosWalkIn}
              especialistas={ESPECIALISTAS_INICIALES}
              servicios={SERVICIOS_INICIALES}
              onAgregarWalkIn={handleAgregarWalkIn}
              onCambiarEstadoWalkIn={handleCambiarEstadoWalkIn}
              onCobrarWalkIn={handleCobrarWalkIn}
            />
          )}

          {pagina === "clientes" && (
            <ClientesFichasBelleza
              clientes={clientes}
              onActualizarFicha={handleActualizarFicha}
              onCrearCliente={handleCrearCliente}
            />
          )}

          {pagina === "retencion" && (
            <ModuloRetencion21Dias clientes={clientes} />
          )}

          {pagina === "caja" && (
            <CobroCajaPeluqueria
              transacciones={transacciones}
              especialistas={ESPECIALISTAS_INICIALES}
              servicios={SERVICIOS_INICIALES}
              tasaBcv={tasaBcv}
              onRegistrarCobro={handleRegistrarCobro}
            />
          )}

          {pagina === "presupuestos" && (
            <PresupuestosBelleza
              presupuestos={presupuestos}
              especialistas={ESPECIALISTAS_INICIALES}
              onCrearPresupuesto={handleCrearPresupuesto}
            />
          )}

          {pagina === "estadisticas" && (
            <EstadisticasBelleza
              transacciones={transacciones}
              especialistas={ESPECIALISTAS_INICIALES}
              clientes={clientes}
              servicios={SERVICIOS_INICIALES}
            />
          )}
        </ErrorBoundaryBelleza>
      </main>
    </div>
  );
}