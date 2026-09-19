import React from 'react';
import { IconVet, IconCalendar, IconHourglass, IconCard, IconUsers, IconFileText } from '../../Icons';
import { type CobroConsultaVet } from '../../api';
import { type PaginaVet } from './types';

export default function VistaGeneralVet({
  propietariosCount,
  mascotasCount,
  citasHoy,
  salaEsperaCount,
  cobrosHoy,
  onNavigate,
}: {
  propietariosCount: number;
  mascotasCount: number;
  citasHoy: number;
  salaEsperaCount: number;
  cobrosHoy: CobroConsultaVet[];
  onNavigate: (p: PaginaVet) => void;
}) {
  const totalCobradoUSD = cobrosHoy.reduce((sum, c) => sum + (c.montoTotal || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Panel de Control Clínico</h2>
        <p className="text-slate-400 text-sm">Resumen de operaciones veterinarias del día</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Mascotas Registradas</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <IconVet size={18} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">{mascotasCount}</div>
          <div className="text-xs text-slate-500 mt-1">{propietariosCount} propietarios activos</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Citas para Hoy</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <IconCalendar size={18} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">{citasHoy}</div>
          <div className="text-xs text-slate-500 mt-1">En agenda programada</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">En Sala de Espera</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <IconHourglass size={18} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">{salaEsperaCount}</div>
          <div className="text-xs text-slate-500 mt-1">Pacientes esperando turno</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ingresos Hoy (USD)</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <IconCard size={18} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">${totalCobradoUSD.toFixed(2)}</div>
          <div className="text-xs text-slate-500 mt-1">{cobrosHoy.length} cobros procesados</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        <button
          onClick={() => onNavigate('pacientes')}
          className="p-5 bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-2xl text-left transition group"
        >
          <div className="flex items-center gap-3 mb-2 text-emerald-400 font-semibold">
            <IconUsers size={20} />
            <span>Registrar Paciente / Mascota</span>
          </div>
          <p className="text-xs text-slate-400">Dar de alta a un nuevo propietario y su mascota con historial clínico.</p>
        </button>

        <button
          onClick={() => onNavigate('historias')}
          className="p-5 bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-2xl text-left transition group"
        >
          <div className="flex items-center gap-3 mb-2 text-emerald-400 font-semibold">
            <IconFileText size={20} />
            <span>Nueva Consulta Veterinaria</span>
          </div>
          <p className="text-xs text-slate-400">Registrar examen clínico, anamnesis, peso, condición corporal BCS y receta.</p>
        </button>

        <button
          onClick={() => onNavigate('sala-espera')}
          className="p-5 bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-2xl text-left transition group"
        >
          <div className="flex items-center gap-3 mb-2 text-emerald-400 font-semibold">
            <IconHourglass size={20} />
            <span>Check-in Sala de Espera</span>
          </div>
          <p className="text-xs text-slate-400">Marcar llegada de pacientes a recepción y asignar consultorio.</p>
        </button>
      </div>
    </div>
  );
}
