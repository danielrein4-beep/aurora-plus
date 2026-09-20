import React, { useState } from 'react';
import { ProyectoConstruccion } from './types';
import { IconWarning, IconCheckCircle, IconChart, IconCalendar } from '../../Icons';

interface Props {
  proyecto: ProyectoConstruccion;
  tasaBcv: number;
  esModoTerreno?: boolean;
}

export interface RiesgoObra {
  id: string;
  categoria: 'CLIMATICO' | 'VOLATILIDAD_PRECIOS' | 'CADENA_SUMINISTRO' | 'DESVIO_RENDIMIENTO' | 'PERMISOLOGIA';
  titulo: string;
  descripcion: string;
  probabilidad: 'ALTA' | 'MEDIA' | 'BAJA';
  impactoFinancieroUSD: number;
  impactoDiasRetraso: number;
  estado: 'ACTIVO' | 'MITIGADO' | 'EN_OBSERVACION';
  accionMitigacionRecomendada: string;
}

const RIESGOS_INICIALES: RiesgoObra[] = [
  {
    id: 'RSK-01',
    categoria: 'CLIMATICO',
    titulo: 'Pronóstico de Lluvias Fuertes en Días de Vaciado',
    descripcion: 'Alerta meteorológica: 75% de probabilidad de tormenta el Jueves y Viernes. Impacto crítico en vaciado de losa nivel +3.50 y anegamiento en excavación de zapatas.',
    probabilidad: 'ALTA',
    impactoFinancieroUSD: 3800.00,
    impactoDiasRetraso: 4,
    estado: 'ACTIVO',
    accionMitigacionRecomendada: 'Adelantar vaciado con planta de concreto para el Miércoles en la mañana. Cubrir patio de acero con lonas industriales.'
  },
  {
    id: 'RSK-02',
    categoria: 'VOLATILIDAD_PRECIOS',
    titulo: 'Incremento en Precio de Cabilla de Acero por Ajuste Siderúrgico',
    descripcion: 'Análisis de mercado siderúrgico prevé un alza de +4.8% en el precio de la tonelada de cabilla para el próximo mes por costo de palanquilla.',
    probabilidad: 'ALTA',
    impactoFinancieroUSD: 2450.00,
    impactoDiasRetraso: 0,
    estado: 'ACTIVO',
    accionMitigacionRecomendada: 'Emitir orden de compra anticipada y acopio inmediato de 24 toneladas en el patio de obra para congelar precio.'
  },
  {
    id: 'RSK-03',
    categoria: 'CADENA_SUMINISTRO',
    titulo: 'Mantenimiento en Horno Principal de Fábrica de Cemento',
    descripcion: 'Parada programada de 7 días en la línea de molienda de cemento gris granel. Posible retraso en suministro para mixers.',
    probabilidad: 'MEDIA',
    impactoFinancieroUSD: 1600.00,
    impactoDiasRetraso: 3,
    estado: 'EN_OBSERVACION',
    accionMitigacionRecomendada: 'Activar proveedor de contingencia en planta secundaria de San Joaquín con cupo reservado de 60m³.'
  },
  {
    id: 'RSK-04',
    categoria: 'DESVIO_RENDIMIENTO',
    titulo: 'Desgaste en Puntas de Balde de Retroexcavadora RET-02',
    descripcion: 'Desgaste al 78% en terreno arcilloso duro. Puede reducir el rendimiento de zanjeo en un 25% si no se reemplazan.',
    probabilidad: 'MEDIA',
    impactoFinancieroUSD: 650.00,
    impactoDiasRetraso: 1,
    estado: 'EN_OBSERVACION',
    accionMitigacionRecomendada: 'Instalar juego de puntas de balde de repuesto durante el turno nocturno para no parar el frente de obra.'
  }
];

export default function MatrizRiesgosPredictivaView({ proyecto, tasaBcv, esModoTerreno }: Props) {
  const [riesgos, setRiesgos] = useState<RiesgoObra[]>(RIESGOS_INICIALES);

  const totalImpactoFinanciero = riesgos.filter(r => r.estado === 'ACTIVO').reduce((acc, r) => acc + r.impactoFinancieroUSD, 0);
  const totalDiasRetrasoPotencial = riesgos.filter(r => r.estado === 'ACTIVO').reduce((acc, r) => acc + r.impactoDiasRetraso, 0);

  const handleMitigarRiesgo = (id: string) => {
    setRiesgos(prev => prev.map(r => r.id === id ? { ...r, estado: 'MITIGADO' } : r));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* HEADER DE GESTIÓN PREDICTIVA */}
      <div style={{ background: '#0d1322', border: '1px solid #1e293b', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#38bdf8' }}>GESTIÓN PREDICTIVA DE RIESGOS & CONTROL DE DESVÍOS</span>
            <span style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', padding: '0.2rem 0.6rem', borderRadius: '0.35rem', fontSize: '0.7rem', fontWeight: 800 }}>ALERTA TEMPRANA · CLIMA · COSTOS</span>
          </div>
          <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
            Modelos predictivos que analizan variables externas (pronóstico hidrometeorológico, alzas siderúrgicas y cuellos de botella) para alertar antes de que ocurra el sobrecosto.
          </p>
        </div>
      </div>

      {/* METRICAS DE EXPOSICIÓN AL RIESGO */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '1rem', borderRadius: '0.75rem' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Exposición a Sobrecosto</span>
          <div style={{ fontSize: '1.4rem', color: '#ef4444', fontWeight: 900, marginTop: '0.3rem' }}>
            ${totalImpactoFinanciero.toLocaleString('es-VE', { minimumFractionDigits: 2 })} USD
          </div>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
            Equivale a Bs. {(totalImpactoFinanciero * tasaBcv).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '1rem', borderRadius: '0.75rem' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Impacto Potencial en Plazo</span>
          <div style={{ fontSize: '1.4rem', color: '#f59e0b', fontWeight: 900, marginTop: '0.3rem' }}>
            +{totalDiasRetrasoPotencial} Días Calendario
          </div>
          <span style={{ fontSize: '0.72rem', color: '#f59e0b' }}>Ruta crítica protegida por mitigaciones</span>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '1rem', borderRadius: '0.75rem' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Índice de Desempeño Costo (CPI)</span>
          <div style={{ fontSize: '1.4rem', color: '#10b981', fontWeight: 900, marginTop: '0.3rem' }}>
            1.04 (Favorable)
          </div>
          <span style={{ fontSize: '0.72rem', color: '#10b981' }}>Ejecutando por debajo del presupuesto base</span>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '1rem', borderRadius: '0.75rem' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Índice Desempeño Cronograma (SPI)</span>
          <div style={{ fontSize: '1.4rem', color: '#38bdf8', fontWeight: 900, marginTop: '0.3rem' }}>
            0.98 (En Rango)
          </div>
          <span style={{ fontSize: '0.72rem', color: '#38bdf8' }}>Avance físico según curva S programada</span>
        </div>
      </div>

      {/* MATRIZ DE RIESGOS IDENTIFICADOS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {riesgos.map(r => (
          <div
            key={r.id}
            style={{
              background: '#0f172a',
              border: '1px solid',
              borderColor: r.estado === 'ACTIVO' ? 'rgba(239,68,68,0.4)' : '#1e293b',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{
                    background: r.categoria === 'CLIMATICO' ? 'rgba(56,189,248,0.15)' : 'rgba(245,158,11,0.15)',
                    color: r.categoria === 'CLIMATICO' ? '#38bdf8' : '#fbbf24',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '0.35rem',
                    fontSize: '0.7rem',
                    fontWeight: 800
                  }}>
                    {r.categoria}
                  </span>
                  <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>{r.titulo}</span>
                  <span style={{
                    background: r.probabilidad === 'ALTA' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                    color: r.probabilidad === 'ALTA' ? '#f87171' : '#fbbf24',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '0.3rem',
                    fontSize: '0.68rem',
                    fontWeight: 800
                  }}>
                    PROBABILIDAD {r.probabilidad}
                  </span>
                </div>
                <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.45' }}>
                  {r.descripcion}
                </p>
              </div>

              {r.estado === 'ACTIVO' ? (
                <button
                  onClick={() => handleMitigarRiesgo(r.id)}
                  style={{ background: '#059669', border: 'none', color: '#fff', padding: '0.45rem 1rem', borderRadius: '0.4rem', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <IconCheckCircle size={15} /> Aplicar Plan de Mitigación
                </button>
              ) : (
                <span style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid #10b981', padding: '0.3rem 0.75rem', borderRadius: '0.4rem', fontSize: '0.75rem', fontWeight: 800 }}>
                  ✓ MITIGADO CON ÉXITO
                </span>
              )}
            </div>

            {/* IMPACTO Y PLAN DE MITIGACIÓN RECOMENDADO */}
            <div style={{ background: '#131b2e', padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid #1e293b', display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: '1rem', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Impacto Estimado</div>
                <div style={{ fontSize: '1.05rem', color: '#ef4444', fontWeight: 900 }}>
                  +${r.impactoFinancieroUSD.toLocaleString('es-VE')} USD
                </div>
                <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700 }}>
                  {r.impactoDiasRetraso > 0 ? `+${r.impactoDiasRetraso} días de retraso` : 'Sin retraso en plazo'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: '#38bdf8', textTransform: 'uppercase', fontWeight: 700 }}>Plan de Acción Inmediato (IA / Experiencia Técnica)</div>
                <div style={{ fontSize: '0.82rem', color: '#e2e8f0', marginTop: '0.2rem' }}>
                  {r.accionMitigacionRecomendada}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
