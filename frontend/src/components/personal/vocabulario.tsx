import { createContext, useContext } from 'react';
import type { DepartamentoPersonal } from './types';

/**
 * Palabras del módulo Personal según el rubro que lo usa. El módulo es el mismo para todos;
 * una finca habla de obreros, jornadas y áreas del campo, no de colaboradores y departamentos.
 */
export interface VocabularioPersonal {
  titulo: string;
  subtitulo: string;
  persona: string;
  personas: string;
  Persona: string;
  Personas: string;
  pestanaEmpleados: string;
  pestanaTurnos: string;
  /** "Departamento" o "Área". */
  area: string;
  todasLasAreas: string;
  areas: DepartamentoPersonal[];
  /** Nombre visible de cada área (en el campo, "Operaciones & Campo" es "Campo y ganado"). */
  nombreArea: (d: string) => string;
  distribucion: string;
  distribucionDetalle: string;
  coberturaTurnos: string;
  areasActivas: string;
  turnosTitulo: string;
  turnosDetalle: string;
  turnosAccion: string;
  tuNegocio: string;
  mostrarMetas: boolean;
}

const TODAS_LAS_AREAS: DepartamentoPersonal[] = [
  'Atención & Salud',
  'Cocina & Restauración',
  'Operaciones & Campo',
  'Administración & Finanzas',
  'Logística & Mantenimiento',
  'Sistemas & Soporte',
];

export const VOCABULARIO_GENERAL: VocabularioPersonal = {
  titulo: 'Gestión de Personal & Aurora Nómina',
  subtitulo: 'Tu equipo, sus turnos, su asistencia, metas y nómina en un solo lugar.',
  persona: 'colaborador',
  personas: 'colaboradores',
  Persona: 'Colaborador',
  Personas: 'Colaboradores',
  pestanaEmpleados: 'Empleados',
  pestanaTurnos: 'Turnos',
  area: 'Departamento',
  todasLasAreas: 'Todos los Departamentos',
  areas: TODAS_LAS_AREAS,
  nombreArea: (d) => d,
  distribucion: 'Distribución del Equipo',
  distribucionDetalle: 'Colaboradores por departamento operativo',
  coberturaTurnos: 'Cobertura de Turnos',
  areasActivas: 'Áreas clínicas, cocina y campo activas',
  turnosTitulo: 'Turnos de la Jornada',
  turnosDetalle: 'Personal actualmente en servicio programado',
  turnosAccion: 'Gestionar matriz',
  tuNegocio: 'tu negocio',
  mostrarMetas: true,
};

const AREAS_FINCA: Record<string, string> = {
  'Operaciones & Campo': 'Campo y ganado',
  'Administración & Finanzas': 'Administración',
  'Logística & Mantenimiento': 'Maquinaria y mantenimiento',
};

export const VOCABULARIO_GANADERIA: VocabularioPersonal = {
  titulo: 'Obreros y nómina de la finca',
  subtitulo: 'Tus obreros, sus jornadas, la asistencia y la nómina en un solo lugar.',
  persona: 'obrero',
  personas: 'obreros',
  Persona: 'Obrero',
  Personas: 'Obreros',
  pestanaEmpleados: 'Obreros',
  pestanaTurnos: 'Jornadas',
  area: 'Área',
  todasLasAreas: 'Todas las áreas',
  areas: ['Operaciones & Campo', 'Administración & Finanzas', 'Logística & Mantenimiento'],
  nombreArea: (d) => AREAS_FINCA[d] ?? d,
  distribucion: 'Obreros por área',
  distribucionDetalle: 'Campo, maquinaria y administración de la finca',
  coberturaTurnos: 'En el campo hoy',
  areasActivas: 'Obreros trabajando ahora en la finca',
  turnosTitulo: 'Jornadas de hoy',
  turnosDetalle: 'Quién está trabajando y en qué horario',
  turnosAccion: 'Organizar jornadas',
  tuNegocio: 'tu finca',
  mostrarMetas: false,
};

export const vocabularioDeRubro = (rubro?: string): VocabularioPersonal =>
  rubro === 'ganaderia' ? VOCABULARIO_GANADERIA : VOCABULARIO_GENERAL;

export const ContextoVocabularioPersonal = createContext<VocabularioPersonal>(VOCABULARIO_GENERAL);

export const useVocabularioPersonal = () => useContext(ContextoVocabularioPersonal);
