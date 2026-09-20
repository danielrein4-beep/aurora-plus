import React, { useState } from 'react';
import { ProyectoConstruccion } from './types';
import { IconUsers, IconCheckCircle, IconWarning, IconCard, IconDownload } from '../../Icons';

interface Props {
  proyecto: ProyectoConstruccion;
  tasaBcv: number;
  esModoTerreno?: boolean;
}

export interface CuadrillaObra {
  id: string;
  codigo: string;
  nombre: string;
  especialidad: 'ENCOFRADO' | 'ACERO_REFUERZO' | 'VACIADO_CONCRETO' | 'ALBANILERIA' | 'ELECTRICIDAD' | 'PLOMERIA';
  capataz: string;
  integrantesCantidad: number;
  frenteAsignado: string;
  horasHombreSemana: number;
  rendimientoEsperadoDia: string; // ej: 220 kg/día
  rendimientoRealMedido: string; // ej: 245 kg/día
  bonoProductividadPorc: number; // ej: 11.3%
  montoSemanalUSD: number;
  estado: 'ACTIVA_EN_CAMPO' | 'EN_REPOSO' | 'TRANSFERIDA';
  geocercaValidada: boolean; // GPS verificado en obra
}

const CUADRILLAS_INICIALES: CuadrillaObra[] = [
  {
    id: 'CD-01',
    codigo: 'CUAD-ACR-01',
    nombre: 'Cuadrilla de Acero y Armado #1',
    especialidad: 'ACERO_REFUERZO',
    capataz: 'Maestro Ramón Escalona',
    integrantesCantidad: 7,
    frenteAsignado: 'Patio de Armado y Doblado (Zapatas y Columnas)',
    horasHombreSemana: 280,
    rendimientoEsperadoDia: '220.0 kg/día/cuadrilla',
    rendimientoRealMedido: '248.5 kg/día/cuadrilla',
    bonoProductividadPorc: 12.9,
    montoSemanalUSD: 1450.00,
    estado: 'ACTIVA_EN_CAMPO',
    geocercaValidada: true
  },
  {
    id: 'CD-02',
    codigo: 'CUAD-ENC-02',
    nombre: 'Cuadrilla de Encofrado y Carpintería',
    especialidad: 'ENCOFRADO',
    capataz: 'Maestro Luis Bermúdez',
    integrantesCantidad: 6,
    frenteAsignado: 'Encofrado Metálico Columnas Nivel +3.50',
    horasHombreSemana: 240,
    rendimientoEsperadoDia: '18.0 m²/día',
    rendimientoRealMedido: '19.2 m²/día',
    bonoProductividadPorc: 6.6,
    montoSemanalUSD: 1280.00,
    estado: 'ACTIVA_EN_CAMPO',
    geocercaValidada: true
  },
  {
    id: 'CD-03',
    codigo: 'CUAD-VAC-03',
    nombre: 'Cuadrilla de Vaciado y Concreteros',
    especialidad: 'VACIADO_CONCRETO',
    capataz: 'Oficial Héctor Colmenares',
    integrantesCantidad: 8,
    frenteAsignado: 'Vaciado con Bomba en Losa Principal',
    horasHombreSemana: 320,
    rendimientoEsperadoDia: '25.0 m³/día',
    rendimientoRealMedido: '28.0 m³/día',
    bonoProductividadPorc: 12.0,
    montoSemanalUSD: 1650.00,
    estado: 'ACTIVA_EN_CAMPO',
    geocercaValidada: true
  },
  {
    id: 'CD-04',
    codigo: 'CUAD-ALB-04',
    nombre: 'Cuadrilla de Albañilería y Pegado de Bloques',
    especialidad: 'ALBANILERIA',
    capataz: 'Maestro Domingo Briceño',
    integrantesCantidad: 5,
    frenteAsignado: 'Paredes Perimetrales Galpón',
    horasHombreSemana: 200,
    rendimientoEsperadoDia: '16.0 m²/día',
    rendimientoRealMedido: '15.5 m²/día',
    bonoProductividadPorc: 0.0,
    montoSemanalUSD: 980.00,
    estado: 'ACTIVA_EN_CAMPO',
    geocercaValidada: true
  }
];

export default function NominaCuadrillasView({ proyecto, tasaBcv, esModoTerreno }: Props) {
  const [cuadrillas, setCuadrillas] = useState<CuadrillaObra[]>(CUADRILLAS_INICIALES);
  const [cuadrillaSeleccionada, setCuadrillaSeleccionada] = useState<CuadrillaObra | null>(null);

  const totalObrerosActivos = cuadrillas.reduce((acc, c) => acc + c.integrantesCantidad, 0);
  const totalHorasHombre = cuadrillas.reduce((acc, c) => acc + c.horasHombreSemana, 0);
  const totalNominaSemanalUSD = cuadrillas.reduce((acc, c) => acc + c.montoSemanalUSD, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* HEADER DE NÓMINA Y CUADRILLAS */}
      <div style={{ background: '#0d1322', border: '1px solid #1e293b', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#38bdf8' }}>GESTIÓN DE CUADRILLAS & NÓMINA POR RENDIMIENTO EN CAMPO</span>
            <span style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8', padding: '0.2rem 0.6rem', borderRadius: '0.35rem', fontSize: '0.7rem', fontWeight: 800 }}>HORAS HOMBRE · GEOCERCA · RENDIMIENTO APU</span>
          </div>
          <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
            Control biométrico y georreferenciado en frentes de obra. Liquidación de nómina estructurada por avance físico y bonificaciones de rendimiento sobre partidas.
          </p>
        </div>
      </div>

      {/* TARJETAS DE CONSOLIDADO DE PERSONAL */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '1rem', borderRadius: '0.75rem' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Personal Obrero en Campo</span>
          <div style={{ fontSize: '1.5rem', color: '#38bdf8', fontWeight: 900, marginTop: '0.3rem' }}>
            {totalObrerosActivos} Trabajadores
          </div>
          <span style={{ fontSize: '0.72rem', color: '#10b981' }}>{cuadrillas.length} Cuadrillas activas con geocerca</span>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '1rem', borderRadius: '0.75rem' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Horas Hombre Semanales (HH)</span>
          <div style={{ fontSize: '1.5rem', color: '#10b981', fontWeight: 900, marginTop: '0.3rem' }}>
            {totalHorasHombre} HH
          </div>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Promedio 40h/obrero regular</span>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '1rem', borderRadius: '0.75rem' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Nómina Semanal Estimada</span>
          <div style={{ fontSize: '1.5rem', color: '#38bdf8', fontWeight: 900, marginTop: '0.3rem' }}>
            ${totalNominaSemanalUSD.toLocaleString('es-VE', { minimumFractionDigits: 2 })} USD
          </div>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
            Bs. {(totalNominaSemanalUSD * tasaBcv).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '1rem', borderRadius: '0.75rem' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Cumplimiento de Rendimiento</span>
          <div style={{ fontSize: '1.5rem', color: '#10b981', fontWeight: 900, marginTop: '0.3rem' }}>
            +7.8%
          </div>
          <span style={{ fontSize: '0.72rem', color: '#10b981' }}>Supera tabla de rendimientos APU</span>
        </div>
      </div>

      {/* TABLA DETALLADA DE CUADRILLAS */}
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '0.75rem', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #1e293b', background: '#131b2e' }}>
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc' }}>
            Desglose de Cuadrillas por Especialidad y Frentes de Obra
          </h4>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#090e1a', color: '#64748b', borderBottom: '1px solid #1e293b', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Cuadrilla / Especialidad</th>
                <th style={{ padding: '0.75rem 1rem' }}>Capataz Responsable</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Obreros</th>
                <th style={{ padding: '0.75rem 1rem' }}>Frente Asignado</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Rendimiento Real vs APU</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Bono Prod.</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Nómina Semanal</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Geocerca</th>
              </tr>
            </thead>
            <tbody>
              {cuadrillas.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #172033' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 800, color: '#f1f5f9' }}>{c.nombre}</div>
                    <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontFamily: 'monospace' }}>{c.codigo}</span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#cbd5e1', fontWeight: 600 }}>
                    {c.capataz}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#38bdf8', fontWeight: 800 }}>
                    {c.integrantesCantidad}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#94a3b8' }}>
                    {c.frenteAsignado}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <div style={{ color: '#10b981', fontWeight: 700 }}>{c.rendimientoRealMedido}</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>APU: {c.rendimientoEsperadoDia}</div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <span style={{
                      background: c.bonoProductividadPorc > 0 ? 'rgba(16,185,129,0.15)' : '#1e293b',
                      color: c.bonoProductividadPorc > 0 ? '#34d399' : '#64748b',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '0.3rem',
                      fontWeight: 800,
                      fontSize: '0.72rem'
                    }}>
                      +{c.bonoProductividadPorc}%
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 900, color: '#38bdf8' }}>
                    ${c.montoSemanalUSD.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    {c.geocercaValidada ? (
                      <span style={{ color: '#10b981', fontSize: '0.72rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                        <IconCheckCircle size={14} /> GPS OK
                      </span>
                    ) : (
                      <span style={{ color: '#ef4444', fontSize: '0.72rem', fontWeight: 700 }}>
                        Fuera de Obra
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
