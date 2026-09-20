import React, { useState } from 'react';
import { ProyectoConstruccion } from './types';
import { IconTruck, IconWrench, IconWarning, IconCheckCircle, IconClose } from '../../Icons';

interface Props {
  proyecto: ProyectoConstruccion;
  tasaBcv: number;
  esModoTerreno?: boolean;
}

export interface MaquinariaPesada {
  id: string;
  codigoInterno: string; // ej: EXC-01
  marcaModelo: string; // ej: Caterpillar 320D3
  tipo: 'EXCAVADORA' | 'RETROEXCAVADORA' | 'VOLQUETA' | 'MOTONIVELADORA' | 'BOMBA_CONCRETO' | 'COMPACTADORA';
  horometroActual: number; // Horas
  horometroUltimoServicio: number;
  intervaloServicioHoras: number; // 250h estándar
  consumoDieselGalonesHora: number;
  operadorAsignado: string;
  frenteTrabajo: string;
  estado: 'OPERATIVA' | 'MANTENIMIENTO_PREVENTIVO' | 'PARADA_CRITICA' | 'EN_RESERVA';
  desgasteOrugasDientesPorc: number; // 0-100%
  proximoServicioDetalle: string;
}

const MAQUINAS_INICIALES: MaquinariaPesada[] = [
  {
    id: 'MAQ-01',
    codigoInterno: 'EXC-01',
    marcaModelo: 'Caterpillar 320D3 (22 Ton)',
    tipo: 'EXCAVADORA',
    horometroActual: 3410,
    horometroUltimoServicio: 3250,
    intervaloServicioHoras: 250,
    consumoDieselGalonesHora: 5.4,
    operadorAsignado: 'Eustiquio Palacios',
    frenteTrabajo: 'Frente 1 - Excavación de Zapatas',
    estado: 'OPERATIVA',
    desgasteOrugasDientesPorc: 35,
    proximoServicioDetalle: 'Cambio aceite motor 15W40 + Filtros de combustible (Faltan 90h)'
  },
  {
    id: 'MAQ-02',
    codigoInterno: 'RET-02',
    marcaModelo: 'Caterpillar 420F2 4x4',
    tipo: 'RETROEXCAVADORA',
    horometroActual: 2245,
    horometroUltimoServicio: 2000,
    intervaloServicioHoras: 250,
    consumoDieselGalonesHora: 3.2,
    operadorAsignado: 'Nelson Rengifo',
    frenteTrabajo: 'Zanjeo de Tuberías Sanitarias 4"',
    estado: 'MANTENIMIENTO_PREVENTIVO',
    desgasteOrugasDientesPorc: 78,
    proximoServicioDetalle: 'ALERTA: Faltan solo 5h para Servicio 250h y cambio de puntas de balde'
  },
  {
    id: 'MAQ-03',
    codigoInterno: 'VOL-05',
    marcaModelo: 'Mack Granite 16m³ Tolva',
    tipo: 'VOLQUETA',
    horometroActual: 4890,
    horometroUltimoServicio: 4750,
    intervaloServicioHoras: 250,
    consumoDieselGalonesHora: 4.8,
    operadorAsignado: 'Marcos Viloria',
    frenteTrabajo: 'Acarreo de Bote a 10 km',
    estado: 'OPERATIVA',
    desgasteOrugasDientesPorc: 20,
    proximoServicioDetalle: 'Engrase de cardán y revisión sistema de frenos de aire (Faltan 110h)'
  },
  {
    id: 'MAQ-04',
    codigoInterno: 'BOM-01',
    marcaModelo: 'Schwing SP-1000 Estacionaria',
    tipo: 'BOMBA_CONCRETO',
    horometroActual: 1480,
    horometroUltimoServicio: 1250,
    intervaloServicioHoras: 250,
    consumoDieselGalonesHora: 4.0,
    operadorAsignado: 'Pedro Yánez',
    frenteTrabajo: 'Vaciado de Columnas Nivel +3.50',
    estado: 'OPERATIVA',
    desgasteOrugasDientesPorc: 45,
    proximoServicioDetalle: 'Revisión de copa de goma de pistón de concreto + aceite hidráulico'
  }
];

export default function MaquinariaMantenimientoView({ proyecto, tasaBcv, esModoTerreno }: Props) {
  const [maquinas, setMaquinas] = useState<MaquinariaPesada[]>(MAQUINAS_INICIALES);
  const [modalHorometro, setModalHorometro] = useState<MaquinariaPesada | null>(null);
  const [nuevasHorasInput, setNuevasHorasInput] = useState<number>(8);
  const [dieselConsumidoInput, setDieselConsumidoInput] = useState<number>(40);

  const handleActualizarHorometro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalHorometro) return;

    setMaquinas(prev => prev.map(m => {
      if (m.id === modalHorometro.id) {
        const nuevoHoro = m.horometroActual + Number(nuevasHorasInput);
        const horasDesdeServicio = nuevoHoro - m.horometroUltimoServicio;
        const requiereServicio = horasDesdeServicio >= m.intervaloServicioHoras;

        return {
          ...m,
          horometroActual: nuevoHoro,
          estado: requiereServicio ? 'MANTENIMIENTO_PREVENTIVO' : m.estado,
          proximoServicioDetalle: requiereServicio
            ? `¡ALERTA CRÍTICA! Ha superado el ciclo de ${m.intervaloServicioHoras}h. Requiere cambio urgente de aceite y filtros.`
            : `Faltan ${m.intervaloServicioHoras - horasDesdeServicio}h para el próximo mantenimiento preventivo.`
        };
      }
      return m;
    }));

    setModalHorometro(null);
  };

  const handleRegistrarMantenimientoRealizado = (maqId: string) => {
    setMaquinas(prev => prev.map(m => {
      if (m.id === maqId) {
        return {
          ...m,
          horometroUltimoServicio: m.horometroActual,
          estado: 'OPERATIVA',
          proximoServicioDetalle: `Mantenimiento preventivo completado en horómetro ${m.horometroActual}h. Próximo ciclo en ${m.horometroActual + m.intervaloServicioHoras}h.`
        };
      }
      return m;
    }));
  };

  const totalMaquinas = maquinas.length;
  const operativas = maquinas.filter(m => m.estado === 'OPERATIVA').length;
  const enAlerta = maquinas.filter(m => m.estado === 'MANTENIMIENTO_PREVENTIVO' || m.estado === 'PARADA_CRITICA').length;
  const consumoDieselTotalDia = maquinas.reduce((acc, m) => acc + (m.consumoDieselGalonesHora * 8), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* HEADER DE TELEMETRÍA Y MANTENIMIENTO */}
      <div style={{ background: '#0d1322', border: '1px solid #1e293b', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#38bdf8' }}>TELEMETRÍA & MANTENIMIENTO PREDICTIVO DE MAQUINARIA PESADA</span>
            <span style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8', padding: '0.2rem 0.6rem', borderRadius: '0.35rem', fontSize: '0.7rem', fontWeight: 800 }}>HORÓMETROS · DIÉSEL · DESGASTE</span>
          </div>
          <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
            Control diario de horas operativas, galonaje de diésel y alertas predictivas de cambio de aceite y desgaste de componentes para evitar paradas críticas de obra.
          </p>
        </div>
      </div>

      {/* TARJETAS DE ESTADO DE FLOTA PESADA */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '1rem', borderRadius: '0.75rem' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Flota de Obra Asignada</span>
          <div style={{ fontSize: '1.5rem', color: '#38bdf8', fontWeight: 900, marginTop: '0.3rem' }}>{totalMaquinas} Equipos Pesados</div>
          <span style={{ fontSize: '0.72rem', color: '#10b981' }}>{operativas} Operativas activas en frentes</span>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '1rem', borderRadius: '0.75rem' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Alertas de Servicio Preventivo</span>
          <div style={{ fontSize: '1.5rem', color: enAlerta > 0 ? '#f59e0b' : '#10b981', fontWeight: 900, marginTop: '0.3rem' }}>
            {enAlerta} Maquinaria
          </div>
          <span style={{ fontSize: '0.72rem', color: enAlerta > 0 ? '#fbbf24' : '#64748b' }}>
            {enAlerta > 0 ? 'Requieren intervención inmediata' : 'Flota al día'}
          </span>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '1rem', borderRadius: '0.75rem' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Consumo Proyectado Diésel</span>
          <div style={{ fontSize: '1.5rem', color: '#f59e0b', fontWeight: 900, marginTop: '0.3rem' }}>
            {consumoDieselTotalDia.toFixed(1)} Gal/día
          </div>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Jornada de 8 horas continuas</span>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '1rem', borderRadius: '0.75rem' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Disponibilidad Mecánica</span>
          <div style={{ fontSize: '1.5rem', color: '#10b981', fontWeight: 900, marginTop: '0.3rem' }}>
            {((operativas / totalMaquinas) * 100).toFixed(0)}%
          </div>
          <span style={{ fontSize: '0.72rem', color: '#10b981' }}>Estándar superior a meta (85%)</span>
        </div>
      </div>

      {/* LISTADO DE MAQUINARIA PESADA */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {maquinas.map(m => {
          const horasDesdeServicio = m.horometroActual - m.horometroUltimoServicio;
          const porcCiclo = Math.min(100, (horasDesdeServicio / m.intervaloServicioHoras) * 100);

          return (
            <div
              key={m.id}
              style={{
                background: '#0f172a',
                border: '1px solid',
                borderColor: m.estado === 'MANTENIMIENTO_PREVENTIVO' ? 'rgba(245,158,11,0.5)' : '#1e293b',
                borderRadius: '0.75rem',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ background: '#1e293b', color: '#38bdf8', padding: '0.2rem 0.6rem', borderRadius: '0.35rem', fontSize: '0.75rem', fontWeight: 900 }}>
                      {m.codigoInterno}
                    </span>
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>{m.marcaModelo}</span>
                    <span style={{
                      background: m.estado === 'OPERATIVA' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                      color: m.estado === 'OPERATIVA' ? '#34d399' : '#fbbf24',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '0.35rem',
                      fontSize: '0.7rem',
                      fontWeight: 800
                    }}>
                      {m.estado}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.3rem' }}>
                    Operador: <strong style={{ color: '#cbd5e1' }}>{m.operadorAsignado}</strong> · Frente: <span style={{ color: '#94a3b8' }}>{m.frenteTrabajo}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setModalHorometro(m)}
                    style={{ background: '#0284c7', border: 'none', color: '#fff', padding: '0.45rem 0.9rem', borderRadius: '0.4rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    + Cargar Horas / Jornada
                  </button>
                  {m.estado === 'MANTENIMIENTO_PREVENTIVO' && (
                    <button
                      onClick={() => handleRegistrarMantenimientoRealizado(m.id)}
                      style={{ background: '#059669', border: 'none', color: '#fff', padding: '0.45rem 0.9rem', borderRadius: '0.4rem', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
                    >
                      ✓ Asentar Servicio Realizado
                    </button>
                  )}
                </div>
              </div>

              {/* BARRA DE HORÓMETRO Y DESGASTE */}
              <div style={{ background: '#131b2e', padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid #1e293b', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Horómetro Acumulado</span>
                  <div style={{ fontSize: '1.25rem', color: '#38bdf8', fontWeight: 900 }}>{m.horometroActual} h</div>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Último servicio: {m.horometroUltimoServicio} h</span>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: '#94a3b8' }}>Ciclo Preventivo ({m.intervaloServicioHoras}h):</span>
                    <span style={{ color: porcCiclo > 85 ? '#f59e0b' : '#38bdf8', fontWeight: 700 }}>{porcCiclo.toFixed(0)}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#1e293b', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ width: `${porcCiclo}%`, height: '100%', background: porcCiclo > 85 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : '#0284c7', borderRadius: '999px' }}></div>
                  </div>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                    {m.proximoServicioDetalle}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Consumo Horario Diésel</span>
                  <div style={{ fontSize: '1.05rem', color: '#f59e0b', fontWeight: 800 }}>{m.consumoDieselGalonesHora} Gal/h</div>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Desgaste Puntas/Orugas: {m.desgasteOrugasDientesPorc}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL CARGA DE HORAS Y DIÉSEL */}
      {modalHorometro && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(6px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '1rem', width: '100%', maxWidth: '500px', padding: '1.75rem', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
                  Asentar Parte Diario: {modalHorometro.codigoInterno}
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{modalHorometro.marcaModelo}</span>
              </div>
              <button onClick={() => setModalHorometro(null)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <IconClose size={20} />
              </button>
            </div>

            <form onSubmit={handleActualizarHorometro} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem' }}>Horas Trabajadas Hoy *</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={nuevasHorasInput}
                  onChange={e => setNuevasHorasInput(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#38bdf8', fontSize: '1.1rem', fontWeight: 800, padding: '0.6rem', borderRadius: '0.45rem', boxSizing: 'border-box' }}
                />
                <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                  Horómetro actual: {modalHorometro.horometroActual} h ➔ Proyectado: {(modalHorometro.horometroActual + nuevasHorasInput).toFixed(1)} h
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem' }}>Galones de Diésel Suministrados</label>
                <input
                  type="number"
                  step="1"
                  value={dieselConsumidoInput}
                  onChange={e => setDieselConsumidoInput(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#f59e0b', fontSize: '1.1rem', fontWeight: 800, padding: '0.6rem', borderRadius: '0.45rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setModalHorometro(null)}
                  style={{ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', padding: '0.55rem 1.1rem', borderRadius: '0.4rem', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ background: '#0284c7', border: 'none', color: '#fff', padding: '0.55rem 1.4rem', borderRadius: '0.4rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  Registrar Horómetro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
