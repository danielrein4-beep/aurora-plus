import React, { useState, useEffect } from 'react';
import {
  ProyectoConstruccion,
  CapituloObra,
  PartidaObra,
  ValuacionObra,
  InsumoObra,
  RegistroBitacora,
  EstadoValuacion
} from './construccion/types';
import {
  PROYECTOS_INICIALES,
  CAPITULOS_INICIALES,
  PARTIDAS_INICIALES,
  VALUACIONES_INICIALES,
  INSUMOS_INICIALES,
  BITACORA_INICIAL
} from './construccion/mockData';

import PresupuestoPartidasView from './construccion/PresupuestoPartidasView';
import ValuacionesAvanceView from './construccion/ValuacionesAvanceView';
import GeneradorPdfCotizacion from './construccion/GeneradorPdfCotizacion';
import InsumosComprasObraView from './construccion/InsumosComprasObraView';
import BitacoraDiarioObraView from './construccion/BitacoraDiarioObraView';
import VisorBimInteroperabilidadView from './construccion/VisorBimInteroperabilidadView';
import LogisticaSuministrosPesadosView from './construccion/LogisticaSuministrosPesadosView';
import MaquinariaMantenimientoView from './construccion/MaquinariaMantenimientoView';
import NominaCuadrillasView from './construccion/NominaCuadrillasView';
import MatrizRiesgosPredictivaView from './construccion/MatrizRiesgosPredictivaView';

import {
  contarPendientesOffline,
  sincronizarColaOfflineConServidor,
  encolarAccionOffline
} from './construccion/offlineQueueConstruccion';

import {
  IconConstruction,
  IconFileText,
  IconChart,
  IconTruck,
  IconCalendar,
  IconClose,
  IconCheckCircle,
  IconWarning,
  IconDownload,
  IconWrench,
  IconUsers
} from '../Icons';

interface Props {
  onSalir: () => void;
}

type TabType =
  | 'presupuesto'
  | 'valuaciones'
  | 'bim'
  | 'logistica'
  | 'maquinaria'
  | 'cuadrillas'
  | 'riesgos'
  | 'cotizacion'
  | 'insumos'
  | 'bitacora';

const STORAGE_KEYS = {
  proyectos: 'aurora_obras_proyectos_v1',
  capitulos: 'aurora_obras_capitulos_v1',
  partidas: 'aurora_obras_partidas_v1',
  valuaciones: 'aurora_obras_valuaciones_v1',
  insumos: 'aurora_obras_insumos_v1',
  bitacora: 'aurora_obras_bitacora_v1',
  tasaBcv: 'aurora_obras_tasa_bcv_v1',
  proyectoActivoId: 'aurora_obras_activo_id_v1',
  modoTerreno: 'aurora_obras_modo_terreno_v1'
};

class ErrorBoundaryConstruccion extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: string }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error capturado en Aurora Construcción:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '3rem', textAlign: 'center', background: '#0f172a', color: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '1rem', padding: '2rem', maxWidth: '600px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f87171', marginBottom: '1rem' }}>Recuperación del Módulo de Obras</h2>
            <p style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Se ha presentado una excepción en el renderizado del módulo de construcción.
            </p>
            <div style={{ background: '#020617', padding: '1rem', borderRadius: '0.5rem', textAlign: 'left', fontSize: '0.8rem', fontFamily: 'monospace', color: '#fca5a5', overflowX: 'auto', marginBottom: '1.5rem' }}>
              {this.state.error}
            </div>
            <button
              onClick={() => {
                localStorage.removeItem(STORAGE_KEYS.partidas);
                localStorage.removeItem(STORAGE_KEYS.valuaciones);
                window.location.reload();
              }}
              style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Restablecer Datos y Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function ConstruccionApp({ onSalir }: Props) {
  // 1. Proyectos
  const [proyectos, setProyectos] = useState<ProyectoConstruccion[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.proyectos);
    return saved ? JSON.parse(saved) : PROYECTOS_INICIALES;
  });

  const [selectedProyectoId, setSelectedProyectoId] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.proyectoActivoId);
    if (saved && proyectos.some(p => p.id === saved)) return saved;
    return proyectos[0]?.id || 'OBR-2026-001';
  });

  // 2. Capítulos y Partidas
  const [capitulos, setCapitulos] = useState<CapituloObra[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.capitulos);
    return saved ? JSON.parse(saved) : CAPITULOS_INICIALES;
  });

  const [partidas, setPartidas] = useState<PartidaObra[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.partidas);
    return saved ? JSON.parse(saved) : PARTIDAS_INICIALES;
  });

  // 3. Valuaciones
  const [valuaciones, setValuaciones] = useState<ValuacionObra[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.valuaciones);
    return saved ? JSON.parse(saved) : VALUACIONES_INICIALES;
  });

  // 4. Insumos y Bitácora
  const [insumos, setInsumos] = useState<InsumoObra[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.insumos);
    return saved ? JSON.parse(saved) : INSUMOS_INICIALES;
  });

  const [bitacora, setBitacora] = useState<RegistroBitacora[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.bitacora);
    return saved ? JSON.parse(saved) : BITACORA_INICIAL;
  });

  // 5. Tasa BCV y Pestaña
  const [tasaBcv, setTasaBcv] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.tasaBcv);
    return saved ? parseFloat(saved) : 36.50;
  });

  const [tabActiva, setTabActiva] = useState<TabType>('presupuesto');
  const [modalNuevaObra, setModalNuevaObra] = useState<boolean>(false);
  const [notificacion, setNotificacion] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  // 6. Modo Terreno
  const [esModoTerreno, setEsModoTerreno] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.modoTerreno) === 'true';
  });

  // 7. Estado Offline
  const [estaEnLinea, setEstaEnLinea] = useState<boolean>(navigator.onLine);
  const [pendientesOffline, setPendientesOffline] = useState<number>(contarPendientesOffline());
  const [sincronizando, setSincronizando] = useState<boolean>(false);

  // Formulario nueva obra
  const [formNuevaObra, setFormNuevaObra] = useState({
    codigo: '',
    nombre: '',
    clienteNombre: '',
    ubicacion: '',
    ingenieroResidente: 'Ing. Alejandro Rivas',
    ingenieroCiv: 'CIV 182.491',
    anticipoPorcentaje: 20,
    retencionPorcentaje: 10,
    fechaInicio: new Date().toISOString().slice(0, 10),
    fechaFinEstimada: ''
  });

  // Sincronización localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.proyectos, JSON.stringify(proyectos));
  }, [proyectos]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.proyectoActivoId, selectedProyectoId);
  }, [selectedProyectoId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.capitulos, JSON.stringify(capitulos));
  }, [capitulos]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.partidas, JSON.stringify(partidas));
  }, [partidas]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.valuaciones, JSON.stringify(valuaciones));
  }, [valuaciones]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.insumos, JSON.stringify(insumos));
  }, [insumos]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.bitacora, JSON.stringify(bitacora));
  }, [bitacora]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.tasaBcv, tasaBcv.toString());
  }, [tasaBcv]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.modoTerreno, esModoTerreno ? 'true' : 'false');
  }, [esModoTerreno]);

  useEffect(() => {
    const handleOnline = () => {
      setEstaEnLinea(true);
      handleSincronizar();
    };
    const handleOffline = () => setEstaEnLinea(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const mostrarMensaje = (texto: string, tipo: 'exito' | 'error' = 'exito') => {
    setNotificacion({ tipo, texto });
    setTimeout(() => setNotificacion(null), 4000);
  };

  const handleSincronizar = async () => {
    setSincronizando(true);
    const res = await sincronizarColaOfflineConServidor();
    setPendientesOffline(contarPendientesOffline());
    setSincronizando(false);
    if (res.sincronizados > 0) {
      mostrarMensaje(`Sincronizadas ${res.sincronizados} operaciones de campo con el servidor.`);
    }
  };

  // Proyecto activo actual
  const proyectoActual = proyectos.find(p => p.id === selectedProyectoId) || proyectos[0];

  // Partidas del proyecto activo
  const capituloIdsProyecto = capitulos.filter(c => c.proyectoId === proyectoActual.id).map(c => c.id);
  const partidasProyecto = partidas.filter(p => capituloIdsProyecto.includes(p.capituloId));
  const valuacionesProyecto = valuaciones.filter(v => v.proyectoId === proyectoActual.id);
  const bitacoraProyecto = bitacora.filter(b => b.proyectoId === proyectoActual.id);

  // Cálculos consolidados
  const costoDirectoTotal = partidasProyecto.reduce((acc, p) => acc + (p.cantidad * p.precioUnitarioUSD), 0);
  const gastosAdminMonto = (costoDirectoTotal * (proyectoActual.porcentajeAdministracion || 12)) / 100;
  const subtotal1 = costoDirectoTotal + gastosAdminMonto;
  const utilidadMonto = (subtotal1 * (proyectoActual.porcentajeUtilidad || 10)) / 100;
  const subtotal2 = subtotal1 + utilidadMonto;
  const ivaMonto = (subtotal2 * (proyectoActual.porcentajeIva || 16)) / 100;
  const presupuestoTotalCalculado = subtotal2 + ivaMonto;

  // Valuaciones y Avance
  const valuacionesAprobadas = valuacionesProyecto.filter(v => v.estado === 'APROBADA' || v.estado === 'COBRADA');
  const totalValuadoCobrado = valuacionesAprobadas.reduce((acc, v) => acc + (v.montoNetoUSD || 0), 0);
  const totalBrutoValuado = valuacionesAprobadas.reduce((acc, v) => acc + (v.montoBrutoUSD || 0), 0);
  const avanceFisicoPonderado = costoDirectoTotal > 0 ? (totalBrutoValuado / costoDirectoTotal) * 100 : 0;

  // Handlers
  const handleCrearProyecto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNuevaObra.codigo || !formNuevaObra.nombre || !formNuevaObra.clienteNombre) {
      mostrarMensaje('Por favor complete Código, Nombre y Cliente.', 'error');
      return;
    }

    const nuevo: ProyectoConstruccion = {
      id: formNuevaObra.codigo.trim().toUpperCase(),
      codigo: formNuevaObra.codigo.trim().toUpperCase(),
      nombre: formNuevaObra.nombre.trim(),
      clienteNombre: formNuevaObra.clienteNombre.trim(),
      clienteRif: 'J-50182910-2',
      clienteTelefono: '+58 414 555-1234',
      ubicacion: formNuevaObra.ubicacion.trim() || 'Venezuela',
      ingenieroResidente: formNuevaObra.ingenieroResidente.trim(),
      ingenieroCiv: formNuevaObra.ingenieroCiv.trim(),
      fechaInicio: formNuevaObra.fechaInicio,
      fechaFinEstimada: formNuevaObra.fechaFinEstimada || '2026-12-31',
      estado: 'EN_EJECUCION',
      anticipoPorcentaje: Number(formNuevaObra.anticipoPorcentaje),
      retencionPorcentaje: Number(formNuevaObra.retencionPorcentaje),
      porcentajeAdministracion: 12,
      porcentajeUtilidad: 10,
      porcentajeIva: 16,
      totalPresupuestadoUSD: 0,
      costoDirectoUSD: 0,
      monedaPrincipal: 'USD'
    };

    // Crear capítulo inicial básico para la obra
    const capInicial: CapituloObra = {
      id: `CAP-${nuevo.id}-01`,
      proyectoId: nuevo.id,
      numero: '1.0',
      nombre: 'Obras Preliminares y Movimiento de Tierra',
      orden: 1
    };

    setCapitulos(prev => [...prev, capInicial]);
    setProyectos(prev => [nuevo, ...prev]);
    setSelectedProyectoId(nuevo.id);
    setModalNuevaObra(false);
    setFormNuevaObra({
      codigo: '',
      nombre: '',
      clienteNombre: '',
      ubicacion: '',
      ingenieroResidente: 'Ing. Alejandro Rivas',
      ingenieroCiv: 'CIV 182.491',
      anticipoPorcentaje: 20,
      retencionPorcentaje: 10,
      fechaInicio: new Date().toISOString().slice(0, 10),
      fechaFinEstimada: ''
    });
    mostrarMensaje(`Proyecto ${nuevo.codigo} creado exitosamente.`);
  };

  const handleActualizarPartidas = (nuevasPartidasProyecto: PartidaObra[]) => {
    setPartidas(prev => {
      const idsActualizados = nuevasPartidasProyecto.map(p => p.id);
      const otrasPartidas = prev.filter(p => !idsActualizados.includes(p.id));
      return [...otrasPartidas, ...nuevasPartidasProyecto];
    });
    if (!estaEnLinea) {
      encolarAccionOffline('PARAMETRO_BIM', nuevasPartidasProyecto);
      setPendientesOffline(contarPendientesOffline());
    }
    mostrarMensaje('Partidas y cómputos actualizados correctamente.');
  };

  const handleActualizarParametrosProyecto = (params: Partial<ProyectoConstruccion>) => {
    setProyectos(prev => prev.map(p => {
      if (p.id === proyectoActual.id) {
        return { ...p, ...params };
      }
      return p;
    }));
    mostrarMensaje('Parámetros económicos actualizados.');
  };

  const handleCrearValuacion = (val: ValuacionObra) => {
    setValuaciones(prev => [...prev, val]);
    if (!estaEnLinea) {
      encolarAccionOffline('VALUACION', val);
      setPendientesOffline(contarPendientesOffline());
    }
    mostrarMensaje(`Valuación N° ${val.numeroValuacion} generada.`);
  };

  const handleCambiarEstadoValuacion = (id: string, nuevoEstado: EstadoValuacion) => {
    setValuaciones(prev => prev.map(v => v.id === id ? { ...v, estado: nuevoEstado } : v));
    mostrarMensaje(`Valuación actualizada a estado: ${nuevoEstado}`);
  };

  const handleCrearInsumo = (insumo: InsumoObra) => {
    setInsumos(prev => [insumo, ...prev]);
    mostrarMensaje(`Insumo/Equipo ${insumo.codigo} registrado.`);
  };

  const handleRegistrarConsumoInsumo = (insumoId: string, cantidad: number) => {
    setInsumos(prev => prev.map(ins => {
      if (ins.id === insumoId) {
        return { ...ins, cantidadConsumida: ins.cantidadConsumida + cantidad };
      }
      return ins;
    }));
    if (!estaEnLinea) {
      encolarAccionOffline('CONSUMO_INSUMO', { insumoId, cantidad });
      setPendientesOffline(contarPendientesOffline());
    }
    mostrarMensaje('Consumo de material registrado en obra.');
  };

  const handleAgregarBitacora = (registro: RegistroBitacora) => {
    setBitacora(prev => [registro, ...prev]);
    if (!estaEnLinea) {
      encolarAccionOffline('BITACORA', registro);
      setPendientesOffline(contarPendientesOffline());
    }
    mostrarMensaje('Entrada de bitácora diaria asentada.');
  };

  return (
    <ErrorBoundaryConstruccion>
      <div style={{
        minHeight: '100vh',
        background: esModoTerreno ? '#000000' : '#090d16',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
      }}>
        
        {/* TOP BAR / HEADER DE INGENIERÍA */}
        <header style={{
          background: esModoTerreno ? '#0a192f' : '#0d1322',
          borderBottom: esModoTerreno ? '2px solid #38bdf8' : '1px solid #1e293b',
          padding: esModoTerreno ? '1rem 1.75rem' : '0.875rem 1.5rem',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          boxShadow: '0 4px 25px rgba(0,0,0,0.5)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            
            {/* Logo & Marca */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={onSalir}
                title="Regresar al Dashboard Principal"
                style={{
                  background: esModoTerreno ? '#0284c7' : '#1e293b',
                  border: esModoTerreno ? '2px solid #38bdf8' : '1px solid #334155',
                  color: esModoTerreno ? '#ffffff' : '#94a3b8',
                  borderRadius: '0.5rem',
                  padding: esModoTerreno ? '0.75rem 1.25rem' : '0.5rem 0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: esModoTerreno ? '0.95rem' : '0.85rem',
                  fontWeight: 800
                }}
              >
                ← Dashboard
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: esModoTerreno ? '48px' : '42px',
                  height: esModoTerreno ? '48px' : '42px',
                  borderRadius: '0.65rem',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: '0 0 20px rgba(2,132,199,0.5)'
                }}>
                  <IconConstruction size={esModoTerreno ? 28 : 24} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: esModoTerreno ? '1.25rem' : '1.05rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#f1f5f9' }}>
                      AURORA OBRAS & CONSTRUCCIÓN
                    </span>
                    <span style={{
                      background: 'rgba(2,132,199,0.25)',
                      color: '#38bdf8',
                      border: '1px solid rgba(56,189,248,0.4)',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '0.35rem',
                      fontSize: '0.7rem',
                      fontWeight: 900,
                      textTransform: 'uppercase'
                    }}>
                      BIM-ERP CIVIL PRO
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    Interoperabilidad BIM 3D · Partidas COVENIN · Suministros · Maquinaria · Cuadrillas · Matriz Predictiva
                  </div>
                </div>
              </div>
            </div>

            {/* Controles: Modo Terreno, Conexión Offline, Obra Activa, Tasa BCV */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              
              {/* BOTÓN TOGGLE MODO TERRENO */}
              <button
                onClick={() => setEsModoTerreno(!esModoTerreno)}
                style={{
                  background: esModoTerreno ? '#f59e0b' : '#1e293b',
                  color: esModoTerreno ? '#000' : '#fbbf24',
                  border: esModoTerreno ? '2px solid #fbbf24' : '1px solid #d97706',
                  borderRadius: '0.5rem',
                  padding: esModoTerreno ? '0.6rem 1rem' : '0.45rem 0.75rem',
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: esModoTerreno ? '0 0 15px rgba(245,158,11,0.6)' : 'none'
                }}
              >
                ☀ {esModoTerreno ? 'MODO TERRENO ACTIVO (Luz Solar)' : 'Modo Terreno'}
              </button>

              {/* INDICADOR OFFLINE */}
              <div style={{
                background: estaEnLinea ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.2)',
                border: estaEnLinea ? '1px solid rgba(16,185,129,0.3)' : '1px solid #f59e0b',
                borderRadius: '0.5rem',
                padding: '0.35rem 0.65rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.75rem'
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: estaEnLinea ? '#10b981' : '#f59e0b',
                  boxShadow: estaEnLinea ? '0 0 8px #10b981' : '0 0 8px #f59e0b'
                }}></span>
                <span style={{ color: estaEnLinea ? '#6ee7b7' : '#fbbf24', fontWeight: 800 }}>
                  {estaEnLinea ? 'En Línea' : 'Offline Campo'}
                </span>
                {pendientesOffline > 0 && (
                  <button
                    onClick={handleSincronizar}
                    disabled={sincronizando}
                    style={{
                      background: '#0284c7',
                      border: 'none',
                      color: '#fff',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '0.15rem 0.4rem',
                      borderRadius: '0.25rem',
                      cursor: 'pointer'
                    }}
                  >
                    {sincronizando ? 'Sincronizando...' : `Sync (${pendientesOffline})`}
                  </button>
                )}
              </div>

              {/* Selector de Obra */}
              <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '0.5rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Obra:</span>
                <select
                  value={selectedProyectoId}
                  onChange={e => setSelectedProyectoId(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontWeight: 800, fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
                >
                  {proyectos.map(p => (
                    <option key={p.id} value={p.id} style={{ background: '#0f172a', color: '#f8fafc' }}>
                      {p.codigo} - {p.nombre.length > 30 ? p.nombre.slice(0, 30) + '...' : p.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setModalNuevaObra(true)}
                style={{ background: '#0284c7', border: 'none', color: '#fff', borderRadius: '0.5rem', padding: '0.45rem 0.8rem', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
              >
                + Nueva Obra
              </button>

              {/* Tasa BCV */}
              <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '0.5rem', padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800 }}>BCV:</span>
                <input
                  type="number"
                  step="0.01"
                  value={tasaBcv}
                  onChange={e => setTasaBcv(parseFloat(e.target.value) || 1)}
                  style={{ width: '55px', background: 'transparent', border: 'none', color: '#10b981', fontWeight: 900, fontSize: '0.85rem', textAlign: 'right', outline: 'none' }}
                />
              </div>
            </div>
          </div>

          {/* BARRA DE ESTADO TÉCNICO Y ECONÓMICO */}
          <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid #172033', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Contratante / Residente</span>
              <div style={{ fontSize: '0.85rem', color: '#f1f5f9', fontWeight: 700, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {proyectoActual.clienteNombre}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#38bdf8' }}>{proyectoActual.ingenieroResidente} ({proyectoActual.ingenieroCiv})</div>
            </div>

            <div>
              <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Presupuesto Total Contractual</span>
              <div style={{ fontSize: '1.1rem', color: '#38bdf8', fontWeight: 900 }}>
                ${presupuestoTotalCalculado.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                Bs. {(presupuestoTotalCalculado * tasaBcv).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Avance Físico Ponderado</span>
                <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 900 }}>{avanceFisicoPonderado.toFixed(1)}%</span>
              </div>
              <div style={{ width: '100%', height: '7px', background: '#1e293b', borderRadius: '999px', overflow: 'hidden', marginTop: '0.35rem' }}>
                <div style={{ width: `${Math.min(100, avanceFisicoPonderado)}%`, height: '100%', background: 'linear-gradient(90deg, #0284c7, #10b981)', borderRadius: '999px' }}></div>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Total Valuado Neto Cobrado</span>
              <div style={{ fontSize: '1.1rem', color: '#10b981', fontWeight: 900 }}>
                ${totalValuadoCobrado.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{valuacionesProyecto.length} Valuaciones emitidas</div>
            </div>
          </div>

          {/* BARRA DE PESTAÑAS INTEGRAL: 10 MÓDULOS DE ALTA INGENIERÍA */}
          <div style={{
            display: 'flex',
            gap: '0.4rem',
            marginTop: '1rem',
            borderBottom: '1px solid #1e293b',
            overflowX: 'auto',
            paddingBottom: '0.35rem'
          }}>
            {[
              { id: 'presupuesto', label: 'Partidas COVENIN / APU', icon: IconChart },
              { id: 'bim', label: 'Interoperabilidad BIM 3D', icon: IconConstruction },
              { id: 'valuaciones', label: `Valuaciones (${valuacionesProyecto.length})`, icon: IconFileText },
              { id: 'logistica', label: 'Logística & Canteras', icon: IconTruck },
              { id: 'maquinaria', label: 'Maquinaria & Horómetros', icon: IconWrench },
              { id: 'cuadrillas', label: 'Cuadrillas & Nómina HH', icon: IconUsers },
              { id: 'riesgos', label: 'Matriz Predictiva Riesgos', icon: IconWarning },
              { id: 'cotizacion', label: 'Cotización PDF', icon: IconDownload },
              { id: 'insumos', label: `Insumos (${insumos.length})`, icon: IconTruck },
              { id: 'bitacora', label: `Bitácora (${bitacoraProyecto.length})`, icon: IconCalendar },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setTabActiva(tab.id as TabType)}
                style={{
                  background: tabActiva === tab.id ? (esModoTerreno ? '#0284c7' : '#1e293b') : 'transparent',
                  color: tabActiva === tab.id ? (esModoTerreno ? '#fff' : '#38bdf8') : '#94a3b8',
                  border: 'none',
                  borderBottom: tabActiva === tab.id ? '2px solid #38bdf8' : '2px solid transparent',
                  padding: esModoTerreno ? '0.75rem 1rem' : '0.55rem 0.85rem',
                  fontSize: esModoTerreno ? '0.88rem' : '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  borderRadius: '0.35rem 0.35rem 0 0',
                  whiteSpace: 'nowrap'
                }}
              >
                <tab.icon size={15} /> {tab.label}
              </button>
            ))}
          </div>
        </header>

        {/* NOTIFICACIÓN FLOTANTE */}
        {notificacion && (
          <div style={{
            position: 'fixed',
            top: '90px',
            right: '20px',
            zIndex: 100,
            background: notificacion.tipo === 'exito' ? '#065f46' : '#991b1b',
            color: '#fff',
            padding: '0.75rem 1.25rem',
            borderRadius: '0.5rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem',
            fontWeight: 700,
            border: notificacion.tipo === 'exito' ? '1px solid #10b981' : '1px solid #ef4444'
          }}>
            {notificacion.tipo === 'exito' ? <IconCheckCircle size={18} /> : <IconWarning size={18} />}
            {notificacion.texto}
          </div>
        )}

        {/* CONTENIDO PRINCIPAL SEGÚN PESTAÑA */}
        <main style={{
          flex: 1,
          padding: esModoTerreno ? '1.75rem' : '1.5rem',
          maxWidth: '1700px',
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {tabActiva === 'presupuesto' && (
            <PresupuestoPartidasView
              proyecto={proyectoActual}
              capitulos={capitulos}
              partidas={partidasProyecto}
              tasaBcv={tasaBcv}
              onActualizarPartidas={handleActualizarPartidas}
              onActualizarParametrosProyecto={handleActualizarParametrosProyecto}
              onIrACotizacionPdf={() => setTabActiva('cotizacion')}
            />
          )}

          {tabActiva === 'bim' && (
            <VisorBimInteroperabilidadView
              proyecto={proyectoActual}
              partidas={partidasProyecto}
              onActualizarPartidas={handleActualizarPartidas}
              esModoTerreno={esModoTerreno}
            />
          )}

          {tabActiva === 'valuaciones' && (
            <ValuacionesAvanceView
              proyecto={proyectoActual}
              partidas={partidasProyecto}
              valuaciones={valuacionesProyecto}
              tasaBcv={tasaBcv}
              onCrearValuacion={handleCrearValuacion}
              onCambiarEstadoValuacion={handleCambiarEstadoValuacion}
            />
          )}

          {tabActiva === 'logistica' && (
            <LogisticaSuministrosPesadosView
              proyecto={proyectoActual}
              tasaBcv={tasaBcv}
              esModoTerreno={esModoTerreno}
            />
          )}

          {tabActiva === 'maquinaria' && (
            <MaquinariaMantenimientoView
              proyecto={proyectoActual}
              tasaBcv={tasaBcv}
              esModoTerreno={esModoTerreno}
            />
          )}

          {tabActiva === 'cuadrillas' && (
            <NominaCuadrillasView
              proyecto={proyectoActual}
              tasaBcv={tasaBcv}
              esModoTerreno={esModoTerreno}
            />
          )}

          {tabActiva === 'riesgos' && (
            <MatrizRiesgosPredictivaView
              proyecto={proyectoActual}
              tasaBcv={tasaBcv}
              esModoTerreno={esModoTerreno}
            />
          )}

          {tabActiva === 'cotizacion' && (
            <GeneradorPdfCotizacion
              proyecto={proyectoActual}
              capitulos={capitulos}
              partidas={partidasProyecto}
              tasaBcv={tasaBcv}
            />
          )}

          {tabActiva === 'insumos' && (
            <InsumosComprasObraView
              insumos={insumos}
              tasaBcv={tasaBcv}
              onCrearInsumo={handleCrearInsumo}
              onRegistrarConsumo={handleRegistrarConsumoInsumo}
            />
          )}

          {tabActiva === 'bitacora' && (
            <BitacoraDiarioObraView
              proyecto={proyectoActual}
              bitacora={bitacoraProyecto}
              onAgregarEntradaBitacora={handleAgregarBitacora}
            />
          )}
        </main>

        {/* MODAL CREAR NUEVA OBRA */}
        {modalNuevaObra && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(6px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '1rem', width: '100%', maxWidth: '640px', padding: '1.75rem', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>Registrar Nueva Obra / Proyecto Civil</h3>
                <button onClick={() => setModalNuevaObra(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                  <IconClose size={20} />
                </button>
              </div>

              <form onSubmit={handleCrearProyecto} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>Código de Obra *</label>
                    <input
                      type="text"
                      placeholder="p. ej. OBR-2026-003"
                      value={formNuevaObra.codigo}
                      onChange={e => setFormNuevaObra({ ...formNuevaObra, codigo: e.target.value })}
                      required
                      style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', padding: '0.55rem', borderRadius: '0.45rem', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>Nombre de la Obra *</label>
                    <input
                      type="text"
                      placeholder="Construcción Galpón Industrial..."
                      value={formNuevaObra.nombre}
                      onChange={e => setFormNuevaObra({ ...formNuevaObra, nombre: e.target.value })}
                      required
                      style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', padding: '0.55rem', borderRadius: '0.45rem', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>Ente Contratante / Cliente *</label>
                    <input
                      type="text"
                      placeholder="Inversiones del Centro C.A."
                      value={formNuevaObra.clienteNombre}
                      onChange={e => setFormNuevaObra({ ...formNuevaObra, clienteNombre: e.target.value })}
                      required
                      style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', padding: '0.55rem', borderRadius: '0.45rem', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>Ubicación Geográfica</label>
                    <input
                      type="text"
                      placeholder="Valencia, Edo. Carabobo"
                      value={formNuevaObra.ubicacion}
                      onChange={e => setFormNuevaObra({ ...formNuevaObra, ubicacion: e.target.value })}
                      style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', padding: '0.55rem', borderRadius: '0.45rem', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setModalNuevaObra(false)}
                    style={{ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', padding: '0.65rem 1.25rem', borderRadius: '0.5rem', cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    style={{ background: '#0284c7', border: 'none', color: '#fff', padding: '0.65rem 1.5rem', borderRadius: '0.5rem', fontWeight: 800, cursor: 'pointer' }}
                  >
                    Crear Proyecto
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </ErrorBoundaryConstruccion>
  );
}
