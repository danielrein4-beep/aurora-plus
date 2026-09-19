import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  type Propietario,
  type Mascota,
  type ConsultaVeterinaria,
  type CitaVeterinaria,
  type CobroConsultaVet,
  type SalaEsperaVetEntrada,
  type ProcedimientoVeterinario,
  type CotizacionVeterinariaApi,
  type CierreCajaVetRegistro,
  listarPropietarios,
  listarMascotas,
  historialConsultasMascota,
  listarCitasVetDelDia,
  listarCobrosVetDelDia,
  listarSalaEsperaVet,
  listarProcedimientosVet,
  listarCotizacionesVet,
  listarCierresCajaVet,
} from '../api';
import {
  IconVet,
  IconUsers,
  IconFileText,
  IconCalendar,
  IconHourglass,
  IconCard,
  IconPrescription,
  IconSettings,
  IconWarning,
} from '../Icons';

import { type PaginaVet } from './veterinaria/types';
import VistaGeneralVet from './veterinaria/VistaGeneralVet';
import GestionPropietariosMascotas from './veterinaria/GestionPropietariosMascotas';
import HistoriasClinicasVet from './veterinaria/HistoriasClinicasVet';
import ProcedimientosCotizadorVet from './veterinaria/ProcedimientosCotizadorVet';
import SalaEsperaCajaVet from './veterinaria/SalaEsperaCajaVet';
import AgendaVet from './veterinaria/AgendaVet';
import FinancieroVet from './veterinaria/FinancieroVet';
import ConfiguracionVet from './veterinaria/ConfiguracionVet';

export default function VeterinariaApp({ onSalir }: { onSalir?: () => void }) {
  const { user, logout } = useAuth();
  const tenantId = user?.tenantId;

  const [pagina, setPagina] = useState<PaginaVet>('general');

  // Estados Core
  const [propietarios, setPropietarios] = useState<Propietario[]>([]);
  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [propietarioSeleccionado, setPropietarioSeleccionado] = useState<Propietario | null>(null);
  const [mascotaSeleccionada, setMascotaSeleccionada] = useState<Mascota | null>(null);

  // Estados Módulos Clínicos
  const [consultas, setConsultas] = useState<ConsultaVeterinaria[]>([]);
  const [cargandoConsultas, setCargandoConsultas] = useState(false);
  const [citas, setCitas] = useState<CitaVeterinaria[]>([]);
  const [cobros, setCobros] = useState<CobroConsultaVet[]>([]);
  const [salaEspera, setSalaEspera] = useState<SalaEsperaVetEntrada[]>([]);
  const [procedimientos, setProcedimientos] = useState<ProcedimientoVeterinario[]>([]);
  const [cotizaciones, setCotizaciones] = useState<CotizacionVeterinariaApi[]>([]);
  const [cierresCaja, setCierresCaja] = useState<CierreCajaVetRegistro[]>([]);

  // Recargas
  const recargarPropietarios = useCallback(async () => {
    if (!tenantId) return;
    try {
      const data = await listarPropietarios(tenantId);
      setPropietarios(data);
    } catch (e) {
      console.error('Error listando propietarios:', e);
    }
  }, [tenantId]);

  const recargarMascotas = useCallback(async () => {
    if (!tenantId) return;
    try {
      const data = await listarMascotas(tenantId);
      setMascotas(data);
    } catch (e) {
      console.error('Error listando mascotas:', e);
    }
  }, [tenantId]);

  const recargarConsultas = useCallback(
    async (mascotaId: number) => {
      if (!tenantId) return;
      setCargandoConsultas(true);
      try {
        const data = await historialConsultasMascota(tenantId, mascotaId);
        setConsultas(data);
      } catch (e) {
        console.error('Error cargando consultas:', e);
      } finally {
        setCargandoConsultas(false);
      }
    },
    [tenantId]
  );

  const recargarCitas = useCallback(async () => {
    if (!tenantId) return;
    try {
      const hoy = new Date().toISOString().split('T')[0];
      const data = await listarCitasVetDelDia(tenantId, hoy);
      setCitas(data);
    } catch (e) {
      console.error('Error cargando citas:', e);
    }
  }, [tenantId]);

  const recargarCobros = useCallback(async () => {
    if (!tenantId) return;
    try {
      const inicio = new Date();
      inicio.setHours(0, 0, 0, 0);
      const fin = new Date();
      fin.setHours(23, 59, 59, 999);
      const data = await listarCobrosVetDelDia(tenantId, inicio.toISOString(), fin.toISOString());
      setCobros(data);
    } catch (e) {
      console.error('Error cargando cobros:', e);
    }
  }, [tenantId]);

  const recargarSalaEspera = useCallback(async () => {
    if (!tenantId) return;
    try {
      const data = await listarSalaEsperaVet(tenantId);
      setSalaEspera(data);
    } catch (e) {
      console.error('Error cargando sala de espera:', e);
    }
  }, [tenantId]);

  const recargarProcedimientos = useCallback(async () => {
    if (!tenantId) return;
    try {
      const procs = await listarProcedimientosVet(tenantId);
      setProcedimientos(procs);
      const cots = await listarCotizacionesVet(tenantId);
      setCotizaciones(cots);
    } catch (e) {
      console.error('Error cargando procedimientos:', e);
    }
  }, [tenantId]);

  const recargarCierres = useCallback(async () => {
    if (!tenantId) return;
    try {
      const data = await listarCierresCajaVet(tenantId);
      setCierresCaja(data);
    } catch (e) {
      console.error('Error cargando cierres:', e);
    }
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) {
      recargarPropietarios();
      recargarMascotas();
      recargarCitas();
      recargarCobros();
      recargarSalaEspera();
      recargarProcedimientos();
      recargarCierres();
    }
  }, [
    tenantId,
    recargarPropietarios,
    recargarMascotas,
    recargarCitas,
    recargarCobros,
    recargarSalaEspera,
    recargarProcedimientos,
    recargarCierres,
  ]);

  useEffect(() => {
    if (mascotaSeleccionada && tenantId) {
      recargarConsultas(mascotaSeleccionada.id);
    } else {
      setConsultas([]);
    }
  }, [mascotaSeleccionada, tenantId, recargarConsultas]);

  if (!tenantId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6">
        <div className="bg-slate-800 p-8 rounded-2xl border border-red-500/30 max-w-md text-center">
          <IconWarning size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Tenant ID no detectado</h2>
          <p className="text-slate-400 text-sm mb-6">
            Por seguridad estricta multi-tenant, debe iniciar sesión con una cuenta y tenant válido de veterinaria.
          </p>
          <button
            onClick={logout}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition"
          >
            Cerrar Sesión / Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans">
      <aside className="w-full md:w-64 bg-[#0D3B3D] border-r border-white/10 p-4 flex flex-col gap-6">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-10 h-10 rounded-xl bg-[#177E89] flex items-center justify-center text-white font-black shadow-lg shadow-[#177E89]/20">
            <IconVet size={24} />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-white leading-none">Aurora Vet</h1>
            <p className="text-[11px] text-[#5BC0BE] font-medium mt-1">Clínica Veterinaria</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1.5 flex-1">
          <button
            onClick={() => setPagina('general')}
            className={"flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition " + (
              pagina === 'general' ? 'bg-[#177E89] text-white shadow-md' : 'text-white/60 hover:bg-white/10 hover:text-white'
            )}
          >
            <IconVet size={18} />
            <span>Vista General</span>
          </button>

          <button
            onClick={() => setPagina('pacientes')}
            className={"flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition " + (
              pagina === 'pacientes' ? 'bg-[#177E89] text-white shadow-md' : 'text-white/60 hover:bg-white/10 hover:text-white'
            )}
          >
            <IconUsers size={18} />
            <span>Pacientes & Dueños</span>
          </button>

          <button
            onClick={() => setPagina('historias')}
            className={"flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition " + (
              pagina === 'historias' ? 'bg-[#177E89] text-white shadow-md' : 'text-white/60 hover:bg-white/10 hover:text-white'
            )}
          >
            <IconFileText size={18} />
            <span>Historias Clínicas</span>
          </button>

          <button
            onClick={() => setPagina('procedimientos')}
            className={"flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition " + (
              pagina === 'procedimientos' ? 'bg-[#177E89] text-white shadow-md' : 'text-white/60 hover:bg-white/10 hover:text-white'
            )}
          >
            <IconPrescription size={18} />
            <span>Procedimientos & Cot.</span>
          </button>

          <button
            onClick={() => setPagina('sala-espera')}
            className={"flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition " + (
              pagina === 'sala-espera' ? 'bg-[#177E89] text-white shadow-md' : 'text-white/60 hover:bg-white/10 hover:text-white'
            )}
          >
            <IconHourglass size={18} />
            <span>Sala de Espera</span>
          </button>

          <button
            onClick={() => setPagina('agenda')}
            className={"flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition " + (
              pagina === 'agenda' ? 'bg-[#177E89] text-white shadow-md' : 'text-white/60 hover:bg-white/10 hover:text-white'
            )}
          >
            <IconCalendar size={18} />
            <span>Agenda de Citas</span>
          </button>

          <button
            onClick={() => setPagina('financiero')}
            className={"flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition " + (
              pagina === 'financiero' ? 'bg-[#177E89] text-white shadow-md' : 'text-white/60 hover:bg-white/10 hover:text-white'
            )}
          >
            <IconCard size={18} />
            <span>Caja & Finanzas</span>
          </button>

          <button
            onClick={() => setPagina('configuracion')}
            className={"flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition " + (
              pagina === 'configuracion' ? 'bg-[#177E89] text-white shadow-md' : 'text-white/60 hover:bg-white/10 hover:text-white'
            )}
          >
            <IconSettings size={18} />
            <span>Configuración</span>
          </button>
        </nav>

        <div className="pt-4 border-t border-white/10 flex flex-col gap-2">
          {onSalir && (
            <button
              onClick={onSalir}
              className="w-full text-left px-3 py-2 text-xs text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition"
            >
              Volver al Hub Principal
            </button>
          )}
          <button
            onClick={logout}
            className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-xl transition"
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-h-screen">
        {pagina === 'general' && (
          <VistaGeneralVet
            propietariosCount={propietarios.length}
            mascotasCount={mascotas.length}
            citasHoy={citas.length}
            salaEsperaCount={salaEspera.filter((s) => s.estado === 'EN_ESPERA').length}
            cobrosHoy={cobros}
            onNavigate={(p) => setPagina(p)}
          />
        )}

        {pagina === 'pacientes' && (
          <GestionPropietariosMascotas
            tenantId={tenantId}
            propietarios={propietarios}
            mascotas={mascotas}
            propietarioSeleccionado={propietarioSeleccionado}
            mascotaSeleccionada={mascotaSeleccionada}
            onSeleccionarPropietario={(p) => setPropietarioSeleccionado(p)}
            onSeleccionarMascota={(m) => setMascotaSeleccionada(m)}
            onRecargarPropietarios={recargarPropietarios}
            onRecargarMascotas={recargarMascotas}
            onVerHistorias={(m) => {
              setMascotaSeleccionada(m);
              setPagina('historias');
            }}
          />
        )}

        {pagina === 'historias' && (
          <HistoriasClinicasVet
            tenantId={tenantId}
            propietarios={propietarios}
            mascotas={mascotas}
            mascotaSeleccionada={mascotaSeleccionada}
            consultas={consultas}
            cargando={cargandoConsultas}
            onSeleccionarMascota={(m) => setMascotaSeleccionada(m)}
            onRecargarConsultas={() => mascotaSeleccionada && recargarConsultas(mascotaSeleccionada.id)}
          />
        )}

        {pagina === 'procedimientos' && (
          <ProcedimientosCotizadorVet
            tenantId={tenantId}
            procedimientos={procedimientos}
            cotizaciones={cotizaciones}
            mascotas={mascotas}
            onRecargar={recargarProcedimientos}
          />
        )}

        {pagina === 'sala-espera' && (
          <SalaEsperaCajaVet
            tenantId={tenantId}
            salaEspera={salaEspera}
            cobros={cobros}
            mascotas={mascotas}
            onRecargarSala={recargarSalaEspera}
            onRecargarCobros={recargarCobros}
          />
        )}

        {pagina === 'agenda' && (
          <AgendaVet
            tenantId={tenantId}
            citas={citas}
            mascotas={mascotas}
            propietarios={propietarios}
            onRecargar={recargarCitas}
          />
        )}

        {pagina === 'financiero' && (
          <FinancieroVet
            tenantId={tenantId}
            cobros={cobros}
            cierresCaja={cierresCaja}
            onRecargar={() => {
              recargarCobros();
              recargarCierres();
            }}
          />
        )}

        {pagina === 'configuracion' && <ConfiguracionVet tenantId={tenantId} />}
      </main>
    </div>
  );
}
