import React, { useState } from 'react';
import { ProyectoConstruccion } from './types';
import { IconTruck, IconCheckCircle, IconWarning, IconDownload, IconClose } from '../../Icons';

interface Props {
  proyecto: ProyectoConstruccion;
  tasaBcv: number;
  esModoTerreno?: boolean;
}

export interface DespachoPesado {
  id: string;
  guiaNumero: string;
  tipoMaterial: 'CONCRETO_PREMEZCLADO' | 'ACERO_CABILLAS' | 'AGREGADOS_CANTERA' | 'MAQUINARIA_IMPORTADA';
  origen: string; // ej: Planta Cemex / Cantera El Roble / Puerto Cabello
  destinoFrente: string; // ej: Frente 1 - Losa Nivel +3.50
  unidadTransporte: string; // Placa y tipo (ej: Camión Mixer Mack #08)
  chofer: string;
  horaSalida: string;
  horaLlegadaEstimada: string;
  tiempoTransitoMinutos: number;
  estado: 'EN_TRANSITO' | 'EN_BASCULA' | 'DESCARGANDO' | 'CONCLUIDO' | 'RETRASADO';
  
  // Parámetros técnicos específicos
  cantidad: number;
  unidadMedida: string; // m3, ton, kg, unidad
  pesoBrutoKg?: number;
  pesoTaraKg?: number;
  pesoNetoKg?: number;
  slumpConoPulgadas?: number; // Para concreto (ej: 5.5")
  horaFinVaciadoLimite?: string; // Para evitar fraguado (>90 min)
  numeroAduanaDUA?: string; // Para maquinaria pesada
}

const DESPACHOS_INICIALES: DespachoPesado[] = [
  {
    id: 'DSP-801',
    guiaNumero: 'GUIA-MIX-2026-089',
    tipoMaterial: 'CONCRETO_PREMEZCLADO',
    origen: 'Planta de Concreto San Joaquín',
    destinoFrente: 'Vaciado de Losa Entrepaño Nivel +3.50',
    unidadTransporte: 'Camión Mixer Mack 8x4 #12 (Placa A92BJ2K)',
    chofer: 'Carlos Benítez',
    horaSalida: '09:15',
    horaLlegadaEstimada: '10:05',
    tiempoTransitoMinutos: 50,
    estado: 'DESCARGANDO',
    cantidad: 8.0,
    unidadMedida: 'm³',
    slumpConoPulgadas: 6.0,
    horaFinVaciadoLimite: '10:45'
  },
  {
    id: 'DSP-802',
    guiaNumero: 'GUIA-ACR-2026-042',
    tipoMaterial: 'ACERO_CABILLAS',
    origen: 'Siderúrgica del Turbio (SIDETUR)',
    destinoFrente: 'Patio de Doblado y Armado de Acero',
    unidadTransporte: 'Gandola Chuto Mack Batea (Placa 77XBAT)',
    chofer: 'Rafael Moncada',
    horaSalida: '07:30',
    horaLlegadaEstimada: '11:30',
    tiempoTransitoMinutos: 240,
    estado: 'EN_BASCULA',
    cantidad: 24.5,
    unidadMedida: 'ton',
    pesoBrutoKg: 38200,
    pesoTaraKg: 13700,
    pesoNetoKg: 24500
  },
  {
    id: 'DSP-803',
    guiaNumero: 'GUIA-CAN-2026-301',
    tipoMaterial: 'AGREGADOS_CANTERA',
    origen: 'Cantera La Guásima (Áridos y Agregados)',
    destinoFrente: 'Sub-base Granular Vialidad Interna',
    unidadTransporte: 'Camión Volqueta Toronca 16m³ (Placa 12YTAR)',
    chofer: 'José Gregorio Silva',
    horaSalida: '10:00',
    horaLlegadaEstimada: '10:45',
    tiempoTransitoMinutos: 45,
    estado: 'EN_TRANSITO',
    cantidad: 16.0,
    unidadMedida: 'm³',
    pesoBrutoKg: 32400,
    pesoTaraKg: 11200,
    pesoNetoKg: 21200
  },
  {
    id: 'DSP-804',
    guiaNumero: 'DUA-ADU-2026-991',
    tipoMaterial: 'MAQUINARIA_IMPORTADA',
    origen: 'Puerto Cabello (Almacén Aduanero #3)',
    destinoFrente: 'Frente de Excavación y Movimiento de Tierra',
    unidadTransporte: 'Lowboy 60 Toneladas (Placa LB-8812)',
    chofer: 'Marcos Viloria',
    horaSalida: 'Ayer 16:00',
    horaLlegadaEstimada: '12:00',
    tiempoTransitoMinutos: 360,
    estado: 'EN_TRANSITO',
    cantidad: 1,
    unidadMedida: 'Pza (Excavadora CAT 320D3)',
    numeroAduanaDUA: 'DUA-PC-2026-004812'
  }
];

export default function LogisticaSuministrosPesadosView({ proyecto, tasaBcv, esModoTerreno }: Props) {
  const [despachos, setDespachos] = useState<DespachoPesado[]>(DESPACHOS_INICIALES);
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [modalNuevoDespacho, setModalNuevoDespacho] = useState<boolean>(false);

  const [formNuevo, setFormNuevo] = useState({
    guiaNumero: '',
    tipoMaterial: 'CONCRETO_PREMEZCLADO' as DespachoPesado['tipoMaterial'],
    origen: '',
    destinoFrente: '',
    unidadTransporte: '',
    chofer: '',
    cantidad: 8,
    unidadMedida: 'm³',
    slumpConoPulgadas: 5.5,
    pesoBrutoKg: 30000,
    pesoTaraKg: 12000
  });

  const handleCrearDespacho = (e: React.FormEvent) => {
    e.preventDefault();
    const nuevo: DespachoPesado = {
      id: 'DSP-' + (despachos.length + 801),
      guiaNumero: formNuevo.guiaNumero || 'GUIA-' + Date.now().toString().slice(-4),
      tipoMaterial: formNuevo.tipoMaterial,
      origen: formNuevo.origen || 'Planta de Suministro',
      destinoFrente: formNuevo.destinoFrente || 'Frente Principal',
      unidadTransporte: formNuevo.unidadTransporte || 'Camión de Carga',
      chofer: formNuevo.chofer || 'Conductor Autorizado',
      horaSalida: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
      horaLlegadaEstimada: 'En 45 min',
      tiempoTransitoMinutos: 45,
      estado: 'EN_TRANSITO',
      cantidad: Number(formNuevo.cantidad),
      unidadMedida: formNuevo.unidadMedida,
      pesoBrutoKg: formNuevo.pesoBrutoKg,
      pesoTaraKg: formNuevo.pesoTaraKg,
      pesoNetoKg: Math.max(0, formNuevo.pesoBrutoKg - formNuevo.pesoTaraKg),
      slumpConoPulgadas: formNuevo.tipoMaterial === 'CONCRETO_PREMEZCLADO' ? Number(formNuevo.slumpConoPulgadas) : undefined
    };

    setDespachos([nuevo, ...despachos]);
    setModalNuevoDespacho(false);
  };

  const handleCambiarEstado = (id: string, nuevoEstado: DespachoPesado['estado']) => {
    setDespachos(prev => prev.map(d => d.id === id ? { ...d, estado: nuevoEstado } : d));
  };

  const despachosFiltrados = filtroTipo === 'TODOS'
    ? despachos
    : despachos.filter(d => d.tipoMaterial === filtroTipo);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* HEADER DE LOGÍSTICA PESADA */}
      <div style={{ background: '#0d1322', border: '1px solid #1e293b', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#38bdf8' }}>TRAZABILIDAD LOGÍSTICA & CADENA DE SUMINISTROS PESADOS</span>
            <span style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8', padding: '0.2rem 0.6rem', borderRadius: '0.35rem', fontSize: '0.7rem', fontWeight: 800 }}>CANTERAS · MIXERS · ACERO · ADUANAS</span>
          </div>
          <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
            Control de pesaje en romana, monitoreo de fraguado de concreto en ruta, y despacho de agregados desde zona de extracción a obra.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => setModalNuevoDespacho(true)}
            style={{ background: '#0284c7', border: 'none', color: '#fff', padding: '0.6rem 1.25rem', borderRadius: '0.5rem', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 14px rgba(2,132,199,0.35)' }}
          >
            <IconTruck size={16} /> + Registrar Guía / Despacho
          </button>
        </div>
      </div>

      {/* METRICAS DE CADENA DE SUMINISTROS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '1rem', borderRadius: '0.75rem' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Mixers en Ruta / Vaciado</span>
          <div style={{ fontSize: '1.4rem', color: '#38bdf8', fontWeight: 900, marginTop: '0.3rem' }}>
            {despachos.filter(d => d.tipoMaterial === 'CONCRETO_PREMEZCLADO').length} Unidades
          </div>
          <span style={{ fontSize: '0.72rem', color: '#10b981' }}>Alerta de fraguado activa (&lt; 90 min)</span>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '1rem', borderRadius: '0.75rem' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Acero en Tránsito</span>
          <div style={{ fontSize: '1.4rem', color: '#10b981', fontWeight: 900, marginTop: '0.3rem' }}>
            24.50 Toneladas
          </div>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Certificado SIDETUR en regla</span>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '1rem', borderRadius: '0.75rem' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Agregados en Cantera</span>
          <div style={{ fontSize: '1.4rem', color: '#f59e0b', fontWeight: 900, marginTop: '0.3rem' }}>
            48.00 m³ Arena / Piedra
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Control de báscula bruta/tara</span>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '1rem', borderRadius: '0.75rem' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Trámites Aduaneros / DUA</span>
          <div style={{ fontSize: '1.4rem', color: '#c084fc', fontWeight: 900, marginTop: '0.3rem' }}>
            1 Maquinaria
          </div>
          <span style={{ fontSize: '0.72rem', color: '#c084fc' }}>Excavadora CAT 320D3 Lowboy</span>
        </div>
      </div>

      {/* FILTROS DE MATERIAL */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
        {[
          { id: 'TODOS', label: 'Todos los Suministros' },
          { id: 'CONCRETO_PREMEZCLADO', label: 'Concreto Premezclado (Mixers)' },
          { id: 'ACERO_CABILLAS', label: 'Acero de Refuerzo (Gandolas)' },
          { id: 'AGREGADOS_CANTERA', label: 'Agregados de Cantera (Tolvas)' },
          { id: 'MAQUINARIA_IMPORTADA', label: 'Maquinaria & Aduanas (Lowboy)' },
        ].map(filtro => (
          <button
            key={filtro.id}
            onClick={() => setFiltroTipo(filtro.id)}
            style={{
              background: filtroTipo === filtro.id ? '#0284c7' : '#131b2e',
              color: filtroTipo === filtro.id ? '#fff' : '#94a3b8',
              border: '1px solid',
              borderColor: filtroTipo === filtro.id ? '#0284c7' : '#1e293b',
              padding: '0.45rem 0.9rem',
              borderRadius: '0.45rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {filtro.label}
          </button>
        ))}
      </div>

      {/* LISTADO DETALLADO DE DESPACHOS EN RUTA */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {despachosFiltrados.map(d => (
          <div
            key={d.id}
            style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
              transition: 'border-color 0.2s'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#f8fafc' }}>{d.guiaNumero}</span>
                  <span style={{
                    background:
                      d.estado === 'DESCARGANDO' ? 'rgba(16,185,129,0.2)' :
                      d.estado === 'EN_TRANSITO' ? 'rgba(56,189,248,0.2)' :
                      d.estado === 'EN_BASCULA' ? 'rgba(245,158,11,0.2)' : 'rgba(100,116,139,0.2)',
                    color:
                      d.estado === 'DESCARGANDO' ? '#34d399' :
                      d.estado === 'EN_TRANSITO' ? '#38bdf8' :
                      d.estado === 'EN_BASCULA' ? '#fbbf24' : '#94a3b8',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '0.35rem',
                    fontSize: '0.7rem',
                    fontWeight: 800
                  }}>
                    {d.estado}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>
                  {d.unidadTransporte} · Chofer: <strong style={{ color: '#cbd5e1' }}>{d.chofer}</strong>
                </div>
              </div>

              {/* Controles de estado rápido */}
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  onClick={() => handleCambiarEstado(d.id, 'EN_BASCULA')}
                  style={{ background: '#1e293b', border: '1px solid #334155', color: '#fbbf24', padding: '0.3rem 0.65rem', borderRadius: '0.35rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Romana / Báscula
                </button>
                <button
                  onClick={() => handleCambiarEstado(d.id, 'DESCARGANDO')}
                  style={{ background: '#1e293b', border: '1px solid #334155', color: '#38bdf8', padding: '0.3rem 0.65rem', borderRadius: '0.35rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Descargar
                </button>
                <button
                  onClick={() => handleCambiarEstado(d.id, 'CONCLUIDO')}
                  style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid #10b981', color: '#34d399', padding: '0.3rem 0.65rem', borderRadius: '0.35rem', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  Completar
                </button>
              </div>
            </div>

            {/* Trayecto y tiempos */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', background: '#131b2e', padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid #1e293b' }}>
              <div>
                <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Origen</span>
                <div style={{ fontSize: '0.82rem', color: '#e2e8f0', fontWeight: 600 }}>{d.origen}</div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Salida: {d.horaSalida}</div>
              </div>

              <div>
                <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Destino en Obra</span>
                <div style={{ fontSize: '0.82rem', color: '#38bdf8', fontWeight: 700 }}>{d.destinoFrente}</div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>ETA: {d.horaLlegadaEstimada} ({d.tiempoTransitoMinutos} min)</div>
              </div>

              <div>
                <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Carga Entregada</span>
                <div style={{ fontSize: '0.95rem', color: '#10b981', fontWeight: 900 }}>
                  {d.cantidad} {d.unidadMedida}
                </div>
                {d.pesoNetoKg && (
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    Neto: {d.pesoNetoKg.toLocaleString('es-VE')} kg (Tara: {d.pesoTaraKg} kg)
                  </div>
                )}
                {d.slumpConoPulgadas && (
                  <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700 }}>
                    Asentamiento Slump: {d.slumpConoPulgadas}" (Máx fraguado: {d.horaFinVaciadoLimite})
                  </div>
                )}
                {d.numeroAduanaDUA && (
                  <div style={{ fontSize: '0.72rem', color: '#c084fc', fontWeight: 700 }}>
                    DUA Aduana: {d.numeroAduanaDUA}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL NUEVO DESPACHO */}
      {modalNuevoDespacho && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(6px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '1rem', width: '100%', maxWidth: '600px', padding: '1.75rem', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>Registrar Ingreso de Suministro Pesado</h3>
              <button onClick={() => setModalNuevoDespacho(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <IconClose size={20} />
              </button>
            </div>

            <form onSubmit={handleCrearDespacho} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.2rem' }}>N° de Guía de Transporte *</label>
                  <input
                    type="text"
                    required
                    placeholder="p. ej. GUIA-2026-904"
                    value={formNuevo.guiaNumero}
                    onChange={e => setFormNuevo({ ...formNuevo, guiaNumero: e.target.value })}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '0.5rem', borderRadius: '0.4rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.2rem' }}>Tipo de Suministro</label>
                  <select
                    value={formNuevo.tipoMaterial}
                    onChange={e => setFormNuevo({ ...formNuevo, tipoMaterial: e.target.value as any })}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#38bdf8', fontWeight: 700, padding: '0.5rem', borderRadius: '0.4rem', boxSizing: 'border-box' }}
                  >
                    <option value="CONCRETO_PREMEZCLADO">Concreto Premezclado (Mixer)</option>
                    <option value="ACERO_CABILLAS">Acero de Refuerzo (Cabillas)</option>
                    <option value="AGREGADOS_CANTERA">Agregados de Cantera (Tolva)</option>
                    <option value="MAQUINARIA_IMPORTADA">Maquinaria Pesada / DUA</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.2rem' }}>Origen (Cantera/Planta/Puerto)</label>
                  <input
                    type="text"
                    placeholder="Cantera El Roble"
                    value={formNuevo.origen}
                    onChange={e => setFormNuevo({ ...formNuevo, origen: e.target.value })}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '0.5rem', borderRadius: '0.4rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.2rem' }}>Frente de Destino en Obra</label>
                  <input
                    type="text"
                    placeholder="Vaciado Losa Nivel +3.50"
                    value={formNuevo.destinoFrente}
                    onChange={e => setFormNuevo({ ...formNuevo, destinoFrente: e.target.value })}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '0.5rem', borderRadius: '0.4rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.2rem' }}>Unidad de Transporte y Placa</label>
                  <input
                    type="text"
                    placeholder="Mixer Mack #04 (A81KJ2)"
                    value={formNuevo.unidadTransporte}
                    onChange={e => setFormNuevo({ ...formNuevo, unidadTransporte: e.target.value })}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '0.5rem', borderRadius: '0.4rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.2rem' }}>Nombre Chofer</label>
                  <input
                    type="text"
                    placeholder="Manuel Pereira"
                    value={formNuevo.chofer}
                    onChange={e => setFormNuevo({ ...formNuevo, chofer: e.target.value })}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '0.5rem', borderRadius: '0.4rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.2rem' }}>Cantidad</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formNuevo.cantidad}
                    onChange={e => setFormNuevo({ ...formNuevo, cantidad: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#38bdf8', fontWeight: 700, padding: '0.5rem', borderRadius: '0.4rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.2rem' }}>Unidad Medida</label>
                  <input
                    type="text"
                    value={formNuevo.unidadMedida}
                    onChange={e => setFormNuevo({ ...formNuevo, unidadMedida: e.target.value })}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '0.5rem', borderRadius: '0.4rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.2rem' }}>Slump (Pulg.)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formNuevo.slumpConoPulgadas}
                    onChange={e => setFormNuevo({ ...formNuevo, slumpConoPulgadas: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#f59e0b', fontWeight: 700, padding: '0.5rem', borderRadius: '0.4rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setModalNuevoDespacho(false)}
                  style={{ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', padding: '0.5rem 1rem', borderRadius: '0.4rem', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ background: '#0284c7', border: 'none', color: '#fff', padding: '0.5rem 1.25rem', borderRadius: '0.4rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  Registrar Despacho
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
