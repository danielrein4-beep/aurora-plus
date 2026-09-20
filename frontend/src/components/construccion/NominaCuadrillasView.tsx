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
  const [modalNuevaCuadrilla, setModalNuevaCuadrilla] = useState<boolean>(false);
  const [formNueva, setFormNueva] = useState({
    nombre: '',
    especialidad: 'ACERO_REFUERZO' as CuadrillaObra['especialidad'],
    capataz: '',
    integrantesCantidad: 6,
    frenteAsignado: 'Frente Principal',
    horasHombreSemana: 240,
    rendimientoEsperadoDia: '200 kg/día',
    rendimientoRealMedido: '215 kg/día',
    montoSemanalUSD: 1200
  });

  const handleCrearCuadrilla = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNueva.nombre || !formNueva.capataz) return;
    const nueva: CuadrillaObra = {
      id: 'CD-' + (cuadrillas.length + 1).toString().padStart(2, '0'),
      codigo: 'CUAD-' + formNueva.especialidad.slice(0, 3) + '-' + (cuadrillas.length + 1),
      nombre: formNueva.nombre,
      especialidad: formNueva.especialidad,
      capataz: formNueva.capataz,
      integrantesCantidad: Number(formNueva.integrantesCantidad),
      frenteAsignado: formNueva.frenteAsignado,
      horasHombreSemana: Number(formNueva.horasHombreSemana),
      rendimientoEsperadoDia: formNueva.rendimientoEsperadoDia,
      rendimientoRealMedido: formNueva.rendimientoRealMedido,
      bonoProductividadPorc: 7.5,
      montoSemanalUSD: Number(formNueva.montoSemanalUSD),
      estado: 'ACTIVA_EN_CAMPO',
      geocercaValidada: true
    };
    setCuadrillas(prev => [...prev, nueva]);
    setModalNuevaCuadrilla(false);
  };

  const handleToggleGeocerca = (id: string) => {
    setCuadrillas(prev => prev.map(c => c.id === id ? { ...c, geocercaValidada: !c.geocercaValidada } : c));
    if (cuadrillaSeleccionada && cuadrillaSeleccionada.id === id) {
      setCuadrillaSeleccionada(prev => prev ? { ...prev, geocercaValidada: !prev.geocercaValidada } : null);
    }
  };

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

        <button
          type="button"
          onClick={() => setModalNuevaCuadrilla(true)}
          style={{ background: '#0284c7', border: 'none', color: '#fff', padding: '0.6rem 1.25rem', borderRadius: '0.5rem', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 14px rgba(2,132,199,0.35)' }}
        >
          + Nueva Cuadrilla
        </button>
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
                <tr key={c.id} onClick={() => setCuadrillaSeleccionada(c)} style={{ borderBottom: '1px solid #172033', cursor: 'pointer' }} className="hover:bg-slate-800/50 transition-colors">
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

      {/* MODAL DETALLE DE CUADRILLA */}
      {cuadrillaSeleccionada && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#0f172a', border: '1px solid #38bdf8', borderRadius: '1rem', padding: '1.5rem', maxWidth: '520px', width: '100%', color: '#fff', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontFamily: 'monospace', fontWeight: 800 }}>FICHA TÉCNICA DE CUADRILLA</span>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>{cuadrillaSeleccionada.nombre}</h3>
              </div>
              <button onClick={() => setCuadrillaSeleccionada(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8rem' }}>
              <div style={{ background: '#1e293b', padding: '0.75rem', borderRadius: '0.5rem' }}>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>Capataz Responsable:</span>
                <strong style={{ color: '#f8fafc' }}>{cuadrillaSeleccionada.capataz}</strong>
              </div>
              <div style={{ background: '#1e293b', padding: '0.75rem', borderRadius: '0.5rem' }}>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>Obreros Integrantes:</span>
                <strong style={{ color: '#38bdf8' }}>{cuadrillaSeleccionada.integrantesCantidad} Especialistas</strong>
              </div>
              <div style={{ background: '#1e293b', padding: '0.75rem', borderRadius: '0.5rem' }}>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>Frente de Asignación:</span>
                <strong style={{ color: '#cbd5e1' }}>{cuadrillaSeleccionada.frenteAsignado}</strong>
              </div>
              <div style={{ background: '#1e293b', padding: '0.75rem', borderRadius: '0.5rem' }}>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>Horas-Hombre Semanales:</span>
                <strong style={{ color: '#10b981' }}>{cuadrillaSeleccionada.horasHombreSemana} HH</strong>
              </div>
            </div>

            <div style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: '#94a3b8' }}>Rendimiento Medido en Campo:</span>
                <strong style={{ color: '#10b981' }}>{cuadrillaSeleccionada.rendimientoRealMedido}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: '#94a3b8' }}>Rendimiento Teórico APU:</span>
                <span style={{ color: '#cbd5e1' }}>{cuadrillaSeleccionada.rendimientoEsperadoDia}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Bono de Productividad (+{cuadrillaSeleccionada.bonoProductividadPorc}%):</span>
                <strong style={{ color: '#38bdf8' }}>${(cuadrillaSeleccionada.montoSemanalUSD * (cuadrillaSeleccionada.bonoProductividadPorc / 100)).toFixed(2)} USD</strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid #1e293b' }}>
              <button
                type="button"
                onClick={() => handleToggleGeocerca(cuadrillaSeleccionada.id)}
                style={{
                  background: cuadrillaSeleccionada.geocercaValidada ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                  border: '1px solid',
                  borderColor: cuadrillaSeleccionada.geocercaValidada ? '#10b981' : '#ef4444',
                  color: cuadrillaSeleccionada.geocercaValidada ? '#34d399' : '#f87171',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                {cuadrillaSeleccionada.geocercaValidada ? '✓ Geocerca GPS Validada en Obra' : '⚠ Fichaje Fuera de Obra'}
              </button>

              <button
                type="button"
                onClick={() => setCuadrillaSeleccionada(null)}
                style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '0.5rem 1.25rem', borderRadius: '0.5rem', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR NUEVA CUADRILLA */}
      {modalNuevaCuadrilla && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#0f172a', border: '1px solid #0284c7', borderRadius: '1rem', padding: '1.5rem', maxWidth: '480px', width: '100%', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900 }}>+ Registrar Nueva Cuadrilla</h3>
              <button onClick={() => setModalNuevaCuadrilla(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            <form onSubmit={handleCrearCuadrilla} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.8rem' }}>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.25rem' }}>Nombre de la Cuadrilla</label>
                <input
                  type="text"
                  required
                  placeholder="ej: Cuadrilla de Enfierradores #2"
                  value={formNueva.nombre}
                  onChange={e => setFormNueva({ ...formNueva, nombre: e.target.value })}
                  style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '0.4rem', padding: '0.5rem', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.25rem' }}>Especialidad</label>
                  <select
                    value={formNueva.especialidad}
                    onChange={e => setFormNueva({ ...formNueva, especialidad: e.target.value as any })}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '0.4rem', padding: '0.5rem', color: '#fff' }}
                  >
                    <option value="ACERO_REFUERZO">Acero y Armado</option>
                    <option value="ENCOFRADO">Encofrado y Madera</option>
                    <option value="VACIADO_CONCRETO">Vaciado Concreto</option>
                    <option value="ALBANILERIA">Albañilería y Bloque</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.25rem' }}>Capataz / Maestro</label>
                  <input
                    type="text"
                    required
                    placeholder="ej: Maestro Ramón"
                    value={formNueva.capataz}
                    onChange={e => setFormNueva({ ...formNueva, capataz: e.target.value })}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '0.4rem', padding: '0.5rem', color: '#fff' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.25rem' }}>Nº Integrantes</label>
                  <input
                    type="number"
                    min="1"
                    value={formNueva.integrantesCantidad}
                    onChange={e => setFormNueva({ ...formNueva, integrantesCantidad: Number(e.target.value) })}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '0.4rem', padding: '0.5rem', color: '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.25rem' }}>Nómina Semanal ($ USD)</label>
                  <input
                    type="number"
                    min="1"
                    value={formNueva.montoSemanalUSD}
                    onChange={e => setFormNueva({ ...formNueva, montoSemanalUSD: Number(e.target.value) })}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '0.4rem', padding: '0.5rem', color: '#fff' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setModalNuevaCuadrilla(false)}
                  style={{ background: '#334155', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.4rem', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '0.5rem 1.25rem', borderRadius: '0.4rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  Guardar Cuadrilla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
