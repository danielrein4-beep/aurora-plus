import React, { useState, useEffect, useRef } from 'react';
import { ProyectoConstruccion, PartidaObra } from './types';
import { IconConstruction, IconCheckCircle, IconRefresh } from '../../Icons';

interface Props {
  proyecto: ProyectoConstruccion;
  partidas: PartidaObra[];
  onActualizarPartidas: (nuevasPartidas: PartidaObra[]) => void;
  esModoTerreno?: boolean;
}

interface ElementoBIM {
  id: string;
  guid: string;
  nombre: string;
  capa: 'FUNDACIONES' | 'COLUMNAS' | 'VIGAS' | 'LOSAS' | 'MUROS';
  tipoConcreto: string; // f'c=250 kg/cm2
  dimensiones: { largo: number; ancho: number; alto: number; cantidad: number };
  cuantiaAceroKgM3: number;
  codigoPartidaCovenin: string;
}

const ELEMENTOS_BIM_INICIALES: ElementoBIM[] = [
  {
    id: 'BIM-001',
    guid: '2O2$U$point_zap_01',
    nombre: 'Zapatas Aisladas Z-01 (4 Unidades)',
    capa: 'FUNDACIONES',
    tipoConcreto: "Concreto f'c=250 kg/cm2",
    dimensiones: { largo: 1.80, ancho: 1.80, alto: 0.50, cantidad: 4 },
    cuantiaAceroKgM3: 85,
    codigoPartidaCovenin: 'E-311.110'
  },
  {
    id: 'BIM-002',
    guid: '2O2$U$point_ped_02',
    nombre: 'Pedestales de Fundación P-01',
    capa: 'FUNDACIONES',
    tipoConcreto: "Concreto f'c=250 kg/cm2",
    dimensiones: { largo: 0.45, ancho: 0.45, alto: 1.20, cantidad: 4 },
    cuantiaAceroKgM3: 120,
    codigoPartidaCovenin: 'E-311.110'
  },
  {
    id: 'BIM-003',
    guid: '1A9$X$point_col_03',
    nombre: 'Columnas Estructurales C-01 (Nivel +0.00 a +3.50)',
    capa: 'COLUMNAS',
    tipoConcreto: "Concreto f'c=280 kg/cm2",
    dimensiones: { largo: 0.40, ancho: 0.40, alto: 3.50, cantidad: 4 },
    cuantiaAceroKgM3: 135,
    codigoPartidaCovenin: 'E-311.200'
  },
  {
    id: 'BIM-004',
    guid: '3B8$Y$point_vig_04',
    nombre: 'Vigas de Carga VC-01 (Ejes 1-A y 2-B)',
    capa: 'VIGAS',
    tipoConcreto: "Concreto f'c=280 kg/cm2",
    dimensiones: { largo: 6.00, ancho: 0.30, alto: 0.50, cantidad: 4 },
    cuantiaAceroKgM3: 140,
    codigoPartidaCovenin: 'E-311.200'
  },
  {
    id: 'BIM-005',
    guid: '5C7$Z$point_los_05',
    nombre: 'Losa de Entrepaño Nervada e=25cm',
    capa: 'LOSAS',
    tipoConcreto: "Concreto f'c=250 kg/cm2",
    dimensiones: { largo: 12.00, ancho: 8.00, alto: 0.25, cantidad: 1 },
    cuantiaAceroKgM3: 95,
    codigoPartidaCovenin: 'E-311.110'
  },
  {
    id: 'BIM-006',
    guid: '8D4$W$point_mur_06',
    nombre: 'Muros Perimetrales Bloque Arcilla e=15cm',
    capa: 'MUROS',
    tipoConcreto: "Mortero 1:4 + Bloque e=15cm",
    dimensiones: { largo: 40.00, ancho: 0.15, alto: 2.80, cantidad: 1 },
    cuantiaAceroKgM3: 0,
    codigoPartidaCovenin: 'E-411.110'
  }
];

export default function VisorBimInteroperabilidadView({ proyecto, partidas, onActualizarPartidas, esModoTerreno }: Props) {
  const [elementos, setElementos] = useState<ElementoBIM[]>(ELEMENTOS_BIM_INICIALES);
  const [elementoSeleccionadoId, setElementoSeleccionadoId] = useState<string>(ELEMENTOS_BIM_INICIALES[0].id);
  const [capasVisibles, setCapasVisibles] = useState<Record<string, boolean>>({
    FUNDACIONES: true,
    COLUMNAS: true,
    VIGAS: true,
    LOSAS: true,
    MUROS: true
  });
  const [rotacion, setRotacion] = useState<number>(45);
  const [zoom, setZoom] = useState<number>(1);
  const [mensajeSync, setMensajeSync] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const elemActivo = elementos.find(e => e.id === elementoSeleccionadoId) || elementos[0];

  // Cálculo de cubicación paramétrica del elemento
  const calcularVolumenConcreto = (elem: ElementoBIM): number => {
    return Number((elem.dimensiones.largo * elem.dimensiones.ancho * elem.dimensiones.alto * elem.dimensiones.cantidad).toFixed(3));
  };

  const calcularPesoAcero = (elem: ElementoBIM): number => {
    const vol = calcularVolumenConcreto(elem);
    return Number((vol * elem.cuantiaAceroKgM3).toFixed(1));
  };

  const calcularAreaEncofrado = (elem: ElementoBIM): number => {
    const d = elem.dimensiones;
    if (elem.capa === 'COLUMNAS') {
      return Number((2 * (d.largo + d.ancho) * d.alto * d.cantidad).toFixed(2));
    } else if (elem.capa === 'VIGAS') {
      return Number(((2 * d.alto + d.ancho) * d.largo * d.cantidad).toFixed(2));
    } else if (elem.capa === 'FUNDACIONES') {
      return Number((2 * (d.largo + d.ancho) * d.alto * d.cantidad).toFixed(2));
    } else if (elem.capa === 'LOSAS') {
      return Number((d.largo * d.ancho * d.cantidad).toFixed(2));
    }
    return Number((d.largo * d.alto * d.cantidad).toFixed(2));
  };

  // Totales de todo el modelo BIM
  const totalConcretoM3 = elementos.reduce((acc, el) => acc + (capasVisibles[el.capa] ? calcularVolumenConcreto(el) : 0), 0);
  const totalAceroKg = elementos.reduce((acc, el) => acc + (capasVisibles[el.capa] ? calcularPesoAcero(el) : 0), 0);
  const totalEncofradoM2 = elementos.reduce((acc, el) => acc + (capasVisibles[el.capa] ? calcularAreaEncofrado(el) : 0), 0);

  // Render 3D Isométrico interactivo en HTML5 Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Fondo blueprint o modo terreno
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    if (esModoTerreno) {
      bgGradient.addColorStop(0, '#000000');
      bgGradient.addColorStop(1, '#0a192f');
    } else {
      bgGradient.addColorStop(0, '#0b1329');
      bgGradient.addColorStop(1, '#030712');
    }
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Grilla isométrica de referencia
    ctx.strokeStyle = esModoTerreno ? 'rgba(56, 189, 248, 0.35)' : 'rgba(56, 189, 248, 0.12)';
    ctx.lineWidth = 1;
    const cx = width / 2;
    const cy = height / 2 + 50;

    for (let i = -6; i <= 6; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * 35 * Math.cos(rotacion * Math.PI / 180), cy + i * 20 * Math.sin(rotacion * Math.PI / 180) - 150);
      ctx.lineTo(cx + i * 35 * Math.cos(rotacion * Math.PI / 180), cy + i * 20 * Math.sin(rotacion * Math.PI / 180) + 150);
      ctx.stroke();
    }

    // Dibujar modelo estructural en perspectiva isométrica
    const scale = 28 * zoom;
    const rad = rotacion * Math.PI / 180;
    const cosR = Math.cos(rad);
    const sinR = Math.sin(rad);

    function project(x: number, y: number, z: number) {
      const rx = x * cosR - y * sinR;
      const ry = x * sinR + y * cosR;
      const isoX = cx + (rx - ry) * scale * 0.866;
      const isoY = cy + (rx + ry) * scale * 0.5 - z * scale;
      return { x: isoX, y: isoY };
    }

    function drawBoxInner(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, dx: number, dy: number, dz: number, colorTop: string, colorFront: string, colorSide: string, isSelected: boolean) {
      const p1 = project(x, y, z);
      const p2 = project(x + dx, y, z);
      const p3 = project(x + dx, y + dy, z);
      const p4 = project(x, y + dy, z);

      const p5 = project(x, y, z + dz);
      const p6 = project(x + dx, y, z + dz);
      const p7 = project(x + dx, y + dy, z + dz);
      const p8 = project(x, y + dy, z + dz);

      // Cara frontal
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p6.x, p6.y);
      ctx.lineTo(p5.x, p5.y);
      ctx.closePath();
      ctx.fillStyle = isSelected ? '#f59e0b' : colorFront;
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#fbbf24' : 'rgba(255,255,255,0.25)';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      // Cara lateral
      ctx.beginPath();
      ctx.moveTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.lineTo(p7.x, p7.y);
      ctx.lineTo(p6.x, p6.y);
      ctx.closePath();
      ctx.fillStyle = isSelected ? '#d97706' : colorSide;
      ctx.fill();
      ctx.stroke();

      // Cara superior
      ctx.beginPath();
      ctx.moveTo(p5.x, p5.y);
      ctx.lineTo(p6.x, p6.y);
      ctx.lineTo(p7.x, p7.y);
      ctx.lineTo(p8.x, p8.y);
      ctx.closePath();
      ctx.fillStyle = isSelected ? '#fde68a' : colorTop;
      ctx.fill();
      ctx.stroke();
    }

    // 1. Fundaciones
    if (capasVisibles.FUNDACIONES) {
      const isSelZap = elementoSeleccionadoId === 'BIM-001';
      drawBoxInner(ctx, -3, -2, -0.6, 1.2, 1.2, 0.4, '#38bdf8', '#0284c7', '#0369a1', isSelZap);
      drawBoxInner(ctx, 2, -2, -0.6, 1.2, 1.2, 0.4, '#38bdf8', '#0284c7', '#0369a1', isSelZap);
      drawBoxInner(ctx, -3, 2, -0.6, 1.2, 1.2, 0.4, '#38bdf8', '#0284c7', '#0369a1', isSelZap);
      drawBoxInner(ctx, 2, 2, -0.6, 1.2, 1.2, 0.4, '#38bdf8', '#0284c7', '#0369a1', isSelZap);

      const isSelPed = elementoSeleccionadoId === 'BIM-002';
      drawBoxInner(ctx, -2.7, -1.7, -0.2, 0.6, 0.6, 0.6, '#60a5fa', '#3b82f6', '#1d4ed8', isSelPed);
      drawBoxInner(ctx, 2.3, -1.7, -0.2, 0.6, 0.6, 0.6, '#60a5fa', '#3b82f6', '#1d4ed8', isSelPed);
      drawBoxInner(ctx, -2.7, 2.3, -0.2, 0.6, 0.6, 0.6, '#60a5fa', '#3b82f6', '#1d4ed8', isSelPed);
      drawBoxInner(ctx, 2.3, 2.3, -0.2, 0.6, 0.6, 0.6, '#60a5fa', '#3b82f6', '#1d4ed8', isSelPed);
    }

    // 2. Columnas
    if (capasVisibles.COLUMNAS) {
      const isSelCol = elementoSeleccionadoId === 'BIM-003';
      const colH = elemActivo.id === 'BIM-003' ? elemActivo.dimensiones.alto : 3.5;
      drawBoxInner(ctx, -2.6, -1.6, 0.4, 0.4, 0.4, colH, '#34d399', '#10b981', '#047857', isSelCol);
      drawBoxInner(ctx, 2.4, -1.6, 0.4, 0.4, 0.4, colH, '#34d399', '#10b981', '#047857', isSelCol);
      drawBoxInner(ctx, -2.6, 2.4, 0.4, 0.4, 0.4, colH, '#34d399', '#10b981', '#047857', isSelCol);
      drawBoxInner(ctx, 2.4, 2.4, 0.4, 0.4, 0.4, colH, '#34d399', '#10b981', '#047857', isSelCol);
    }

    // 3. Vigas de Carga
    if (capasVisibles.VIGAS) {
      const isSelVig = elementoSeleccionadoId === 'BIM-004';
      const vigZ = 3.9;
      drawBoxInner(ctx, -2.6, -1.6, vigZ, 5.4, 0.4, 0.5, '#a78bfa', '#8b5cf6', '#6d28d9', isSelVig);
      drawBoxInner(ctx, -2.6, 2.4, vigZ, 5.4, 0.4, 0.5, '#a78bfa', '#8b5cf6', '#6d28d9', isSelVig);
      drawBoxInner(ctx, -2.6, -1.6, vigZ, 0.4, 4.4, 0.5, '#a78bfa', '#8b5cf6', '#6d28d9', isSelVig);
      drawBoxInner(ctx, 2.4, -1.6, vigZ, 0.4, 4.4, 0.5, '#a78bfa', '#8b5cf6', '#6d28d9', isSelVig);
    }

    // 4. Losa
    if (capasVisibles.LOSAS) {
      const isSelLos = elementoSeleccionadoId === 'BIM-005';
      drawBoxInner(ctx, -2.8, -1.8, 4.4, 5.8, 4.8, 0.25, '#f43f5e', '#e11d48', '#be123c', isSelLos);
    }

    // 5. Muros
    if (capasVisibles.MUROS) {
      const isSelMur = elementoSeleccionadoId === 'BIM-006';
      drawBoxInner(ctx, -2.55, -1.5, 0.4, 0.2, 3.8, 2.8, '#fbbf24', '#f59e0b', '#b45309', isSelMur);
    }

    // Coordenadas
    ctx.fillStyle = '#64748b';
    ctx.font = '11px monospace';
    ctx.fillText(`ROTACIÓN: ${rotacion}° | ZOOM: ${(zoom * 100).toFixed(0)}% | MODELO BIM IFC-4`, 15, 25);
    ctx.fillText(`ELEMENTO ACTIVO: ${elemActivo.nombre} [${elemActivo.guid}]`, 15, 42);

  }, [elementos, elementoSeleccionadoId, capasVisibles, rotacion, zoom, esModoTerreno]);

  // Actualizar parámetro dimensional de un elemento
  const handleUpdateDimension = (campo: 'largo' | 'ancho' | 'alto' | 'cantidad', valor: number) => {
    setElementos(prev => prev.map(el => {
      if (el.id === elemActivo.id) {
        return {
          ...el,
          dimensiones: {
            ...el.dimensiones,
            [campo]: Math.max(0.01, valor)
          }
        };
      }
      return el;
    }));
  };

  // Sincronizar cómputos BIM con partidas contractuales COVENIN
  const handleSincronizarConERP = () => {
    // 1. Agrupar cubicaciones consolidadas del modelo 3D por código COVENIN
    const computosPorPartida: Record<string, { volumenM3: number; encofradoM2: number; aceroKg: number }> = {};

    elementos.forEach(elem => {
      const cod = elem.codigoPartidaCovenin;
      if (!computosPorPartida[cod]) {
        computosPorPartida[cod] = { volumenM3: 0, encofradoM2: 0, aceroKg: 0 };
      }
      computosPorPartida[cod].volumenM3 += calcularVolumenConcreto(elem);
      computosPorPartida[cod].encofradoM2 += calcularAreaEncofrado(elem);
      computosPorPartida[cod].aceroKg += calcularPesoAcero(elem);
    });

    let partidasActualizadas = 0;
    const nuevasPartidas = partidas.map(p => {
      const computoBim = computosPorPartida[p.codigoPartida];
      if (!computoBim) return p;

      partidasActualizadas++;
      let nuevaCantidad = p.cantidad;

      if (p.unidad.toLowerCase().includes('m3') || p.unidad.toLowerCase().includes('m³')) {
        nuevaCantidad = Number(computoBim.volumenM3.toFixed(2));
      } else if (p.unidad.toLowerCase().includes('m2') || p.unidad.toLowerCase().includes('m²')) {
        nuevaCantidad = Number(computoBim.encofradoM2.toFixed(2));
      } else if (p.unidad.toLowerCase().includes('kg') || p.unidad.toLowerCase().includes('ton')) {
        nuevaCantidad = Number(computoBim.aceroKg.toFixed(1));
      }

      return {
        ...p,
        cantidad: nuevaCantidad,
        totalUSD: Number((nuevaCantidad * p.precioUnitarioUSD).toFixed(2))
      };
    });

    onActualizarPartidas(nuevasPartidas);
    setMensajeSync(`¡Cómputos métricos BIM actualizados! ${partidasActualizadas} partidas sincronizadas con el modelo 3D sin duplicación.`);
    setTimeout(() => setMensajeSync(null), 4500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* HEADER DE INTEROPERABILIDAD BIM */}
      <div style={{ background: '#0d1322', border: '1px solid #1e293b', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#38bdf8' }}>INTEROPERABILIDAD BIM-ERP</span>
            <span style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8', padding: '0.2rem 0.6rem', borderRadius: '0.35rem', fontSize: '0.7rem', fontWeight: 800 }}>IFC / REVIT COMPATIBLE</span>
          </div>
          <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
            Extracción paramétrica en tiempo real: Cualquier cambio en la geometría 3D actualiza al instante volúmenes de concreto, kilos de cabilla y encofrados en el presupuesto.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={handleSincronizarConERP}
            style={{ background: '#0284c7', border: 'none', color: '#fff', padding: '0.6rem 1.25rem', borderRadius: '0.5rem', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 14px rgba(2,132,199,0.35)' }}
          >
            <IconRefresh size={16} /> Sincronizar Volúmenes con Partidas COVENIN
          </button>
        </div>
      </div>

      {mensajeSync && (
        <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981', color: '#6ee7b7', padding: '0.75rem 1.25rem', borderRadius: '0.5rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <IconCheckCircle size={18} /> {mensajeSync}
        </div>
      )}

      {/* DASHBOARD BIM: VISOR 3D Y PANEL DE EDICIÓN PARAMÉTRICA */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem' }}>
        
        {/* VISOR 3D INTERACTIVO */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '0.75rem', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          
          {/* Controles de visualización y capas */}
          <div style={{ background: '#131b2e', padding: '0.75rem 1rem', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Capas BIM:</span>
              {(['FUNDACIONES', 'COLUMNAS', 'VIGAS', 'LOSAS', 'MUROS'] as const).map(capa => (
                <button
                  key={capa}
                  onClick={() => setCapasVisibles({ ...capasVisibles, [capa]: !capasVisibles[capa] })}
                  style={{
                    background: capasVisibles[capa] ? 'rgba(56,189,248,0.2)' : '#1e293b',
                    color: capasVisibles[capa] ? '#38bdf8' : '#64748b',
                    border: '1px solid',
                    borderColor: capasVisibles[capa] ? '#38bdf8' : '#334155',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '0.35rem',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {capa}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => setRotacion(r => (r - 15) % 360)}
                style={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', borderRadius: '0.35rem', padding: '0.3rem 0.6rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
              >
                ⟲ Rotar -
              </button>
              <button
                onClick={() => setRotacion(r => (r + 15) % 360)}
                style={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', borderRadius: '0.35rem', padding: '0.3rem 0.6rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
              >
                ⟳ Rotar +
              </button>
              <button
                onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
                style={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', borderRadius: '0.35rem', padding: '0.3rem 0.6rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
              >
                - Zoom
              </button>
              <button
                onClick={() => setZoom(z => Math.min(2.0, z + 0.1))}
                style={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', borderRadius: '0.35rem', padding: '0.3rem 0.6rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
              >
                + Zoom
              </button>
            </div>
          </div>

          {/* Canvas 3D */}
          <div style={{ position: 'relative', width: '100%', height: '480px' }}>
            <canvas
              ref={canvasRef}
              width={860}
              height={480}
              style={{ width: '100%', height: '100%', display: 'block' }}
            />
          </div>

          {/* BARRA DE TOTALES EXTRAÍDOS DEL MODELO BIM */}
          <div style={{ background: '#0b1220', padding: '1rem', borderTop: '1px solid #1e293b', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center' }}>
            <div style={{ background: 'rgba(56,189,248,0.08)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(56,189,248,0.2)' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Concreto Volumétrico</div>
              <div style={{ fontSize: '1.35rem', color: '#38bdf8', fontWeight: 900 }}>{totalConcretoM3.toFixed(2)} m³</div>
            </div>
            <div style={{ background: 'rgba(16,185,129,0.08)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(16,185,129,0.2)' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Acero de Refuerzo Total</div>
              <div style={{ fontSize: '1.35rem', color: '#10b981', fontWeight: 900 }}>{totalAceroKg.toLocaleString('es-VE')} kg</div>
            </div>
            <div style={{ background: 'rgba(245,158,11,0.08)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(245,158,11,0.2)' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Encofrado de Contacto</div>
              <div style={{ fontSize: '1.35rem', color: '#f59e0b', fontWeight: 900 }}>{totalEncofradoM2.toFixed(2)} m²</div>
            </div>
          </div>
        </div>

        {/* PANEL LATERAL: PROPIEDADES PARAMÉTRICAS DEL ELEMENTO SELECCIONADO */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Inspector de Elemento BIM</span>
            <select
              value={elementoSeleccionadoId}
              onChange={e => setElementoSeleccionadoId(e.target.value)}
              style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#38bdf8', fontWeight: 700, padding: '0.6rem', borderRadius: '0.45rem', marginTop: '0.4rem', outline: 'none' }}
            >
              {elementos.map(el => (
                <option key={el.id} value={el.id} style={{ background: '#0f172a', color: '#fff' }}>
                  [{el.capa}] {el.nombre}
                </option>
              ))}
            </select>
          </div>

          <div style={{ background: '#131b2e', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #1e293b', fontSize: '0.75rem' }}>
            <div style={{ color: '#94a3b8', marginBottom: '0.2rem' }}>IFC GUID: <code style={{ color: '#f1f5f9' }}>{elemActivo.guid}</code></div>
            <div style={{ color: '#94a3b8', marginBottom: '0.2rem' }}>Resistencia: <span style={{ color: '#38bdf8', fontWeight: 700 }}>{elemActivo.tipoConcreto}</span></div>
            <div style={{ color: '#94a3b8' }}>Partida COVENIN vinculada: <span style={{ color: '#10b981', fontWeight: 700 }}>{elemActivo.codigoPartidaCovenin}</span></div>
          </div>

          <div style={{ borderTop: '1px solid #1e293b', paddingTop: '0.75rem' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: '#f8fafc', fontWeight: 800 }}>Modificación Paramétrica</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.2rem' }}>Largo (m)</label>
                <input
                  type="number"
                  step="0.05"
                  value={elemActivo.dimensiones.largo}
                  onChange={e => handleUpdateDimension('largo', parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '0.45rem', borderRadius: '0.35rem', fontWeight: 700, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.2rem' }}>Ancho (m)</label>
                <input
                  type="number"
                  step="0.05"
                  value={elemActivo.dimensiones.ancho}
                  onChange={e => handleUpdateDimension('ancho', parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '0.45rem', borderRadius: '0.35rem', fontWeight: 700, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.2rem' }}>Alto / Espesor (m)</label>
                <input
                  type="number"
                  step="0.05"
                  value={elemActivo.dimensiones.alto}
                  onChange={e => handleUpdateDimension('alto', parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '0.45rem', borderRadius: '0.35rem', fontWeight: 700, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.2rem' }}>Cantidad (U)</label>
                <input
                  type="number"
                  step="1"
                  value={elemActivo.dimensiones.cantidad}
                  onChange={e => handleUpdateDimension('cantidad', parseInt(e.target.value) || 1)}
                  style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '0.45rem', borderRadius: '0.35rem', fontWeight: 700, boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          <div style={{ background: '#131b2e', padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid #1e293b', marginTop: 'auto' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Cálculos Derivados de Este Elemento</div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.8rem' }}>
              <span style={{ color: '#94a3b8' }}>Volumen Concreto:</span>
              <span style={{ color: '#38bdf8', fontWeight: 800 }}>{calcularVolumenConcreto(elemActivo)} m³</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.8rem' }}>
              <span style={{ color: '#94a3b8' }}>Acero Estimado:</span>
              <span style={{ color: '#10b981', fontWeight: 800 }}>{calcularPesoAcero(elemActivo)} kg</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: '#94a3b8' }}>Área de Encofrado:</span>
              <span style={{ color: '#f59e0b', fontWeight: 800 }}>{calcularAreaEncofrado(elemActivo)} m²</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
