import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  IconConstruction,
  IconChart,
  IconFileText,
  IconBox,
  IconWrench,
  IconCheckCircle,
  IconWarning,
  IconSearch,
  IconRefresh,
  IconTrash,
  IconEdit,
  IconClose,
  IconCheck,
  IconCalendar,
  IconUsers,
  IconTruck,
} from '../Icons';
import {
  type ProyectoConstruccionApi,
  type CapituloConstruccionApi,
  type PartidaConstruccionApi,
  type ValuacionConstruccionApi,
  type InsumoConstruccionApi,
  type BitacoraConstruccionApi,
  type CatalogoCoveninApi,
  type DespachoConstruccionApi,
  listarProyectosConstruccionApi,
  crearProyectoConstruccionApi,
  actualizarProyectoConstruccionApi,
  eliminarProyectoConstruccionApi,
  listarCapitulosConstruccionApi,
  crearCapituloConstruccionApi,
  listarPartidasConstruccionApi,
  crearPartidaConstruccionApi,
  actualizarPartidaConstruccionApi,
  eliminarPartidaConstruccionApi,
  listarValuacionesConstruccionApi,
  crearValuacionConstruccionApi,
  cambiarEstadoValuacionConstruccionApi,
  listarInsumosConstruccionApi,
  crearInsumoConstruccionApi,
  registrarConsumoInsumoConstruccionApi,
  listarBitacoraConstruccionApi,
  registrarBitacoraConstruccionApi,
  buscarCatalogoCoveninApi,
  listarDespachosConstruccionApi,
  crearDespachoConstruccionApi,
  cambiarEstadoDespachoConstruccionApi,
  type MaquinariaConstruccionApi,
  type MantenimientoMaquinariaApi,
  type RiesgoConstruccionApi,
  type DocumentoBimApi,
  type RfiConstruccionApi,
  listarDocumentosBimApi,
  crearDocumentoBimApi,
  cambiarEstadoDocumentoBimApi,
  listarRfisConstruccionApi,
  crearRfiConstruccionApi,
  responderRfiConstruccionApi,
  listarRiesgosConstruccionApi,
  crearRiesgoConstruccionApi,
  cambiarEstadoRiesgoConstruccionApi,
  listarMaquinariasConstruccionApi,
  crearMaquinariaConstruccionApi,
  actualizarMaquinariaConstruccionApi,
  actualizarHorometroMaquinariaApi,
  listarMantenimientosMaquinariaApi,
  crearMantenimientoMaquinariaApi,
} from '../api';

interface Props {
  onSalir?: () => void;
}

type TabConstruccion =
  | 'resumen'
  | 'proyectos'
  | 'presupuesto'
  | 'valuaciones'
  | 'insumos'
  | 'logistica'
  | 'maquinaria'
  | 'riesgos'
  | 'bim'
  | 'bitacora'
  | 'avanzado';

function formatVE(num: number | undefined | null): string {
  const n = Number(num) || 0;
  return new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function generarIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'ik-' + [1e7, 1e3, 4e3, 8e3, 1e11].join('-').replace(/[018]/g, (c: any) =>
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
  );
}

export default function ConstruccionApp({ onSalir }: Props) {
  const { user } = useAuth();
  const [tabActiva, setTabActiva] = useState<TabConstruccion>('resumen');

  // Datos del Backend
  const [proyectos, setProyectos] = useState<ProyectoConstruccionApi[]>([]);
  const [proyectoSeleccionadoId, setProyectoSeleccionadoId] = useState<number | null>(null);
  const [capitulos, setCapitulos] = useState<CapituloConstruccionApi[]>([]);
  const [partidas, setPartidas] = useState<PartidaConstruccionApi[]>([]);
  const [valuaciones, setValuaciones] = useState<ValuacionConstruccionApi[]>([]);
  const [insumos, setInsumos] = useState<InsumoConstruccionApi[]>([]);
  const [despachos, setDespachos] = useState<DespachoConstruccionApi[]>([]);
  const [bitacora, setBitacora] = useState<BitacoraConstruccionApi[]>([]);

  // Estados de interfaz
  const [cargando, setCargando] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Modales
  const [modalProyectoAbierto, setModalProyectoAbierto] = useState(false);
  const [proyectoEditando, setProyectoEditando] = useState<ProyectoConstruccionApi | null>(null);

  const [modalCapituloAbierto, setModalCapituloAbierto] = useState(false);
  const [modalPartidaAbierto, setModalPartidaAbierto] = useState(false);
  const [partidaEditando, setPartidaEditando] = useState<PartidaConstruccionApi | null>(null);

  const [modalValuacionAbierto, setModalValuacionAbierto] = useState(false);
  const [modalInsumoAbierto, setModalInsumoAbierto] = useState(false);
  const [modalConsumoAbierto, setModalConsumoAbierto] = useState(false);
  const [insumoConsumo, setInsumoConsumo] = useState<InsumoConstruccionApi | null>(null);

  const [modalDespachoAbierto, setModalDespachoAbierto] = useState(false);

  // Estados de Maquinaria y Equipos
  const [maquinarias, setMaquinarias] = useState<MaquinariaConstruccionApi[]>([]);
  const [cargandoMaquinarias, setCargandoMaquinarias] = useState(false);
  const [filtroTipoMaq, setFiltroTipoMaq] = useState<string>('TODOS');
  const [modalMaquinariaAbierto, setModalMaquinariaAbierto] = useState(false);

  // Estados de Matriz de Riesgos y SST
  const [riesgos, setRiesgos] = useState<RiesgoConstruccionApi[]>([]);
  const [cargandoRiesgos, setCargandoRiesgos] = useState(false);
  const [filtroNivelRiesgo, setFiltroNivelRiesgo] = useState<string>('TODOS');
  const [modalRiesgoAbierto, setModalRiesgoAbierto] = useState(false);

  // Estados de BIM & RFIs
  const [subtabBim, setSubtabBim] = useState<'modelos' | 'rfis'>('modelos');
  const [documentosBim, setDocumentosBim] = useState<DocumentoBimApi[]>([]);
  const [cargandoBim, setCargandoBim] = useState(false);
  const [filtroDisciplinaBim, setFiltroDisciplinaBim] = useState<string>('TODAS');
  const [modalBimAbierto, setModalBimAbierto] = useState(false);
  const [rfis, setRfis] = useState<RfiConstruccionApi[]>([]);
  const [cargandoRfis, setCargandoRfis] = useState(false);
  const [modalRfiAbierto, setModalRfiAbierto] = useState(false);
  const [modalResponderRfiTarget, setModalResponderRfiTarget] = useState<RfiConstruccionApi | null>(null);
  const [formNuevoBim, setFormNuevoBim] = useState({
    codigo: '',
    titulo: '',
    disciplina: 'ESTRUCTURAS',
    formato: 'IFC',
    version: 'v1.0',
    autorProyectista: '',
    archivoUrl: '',
    pesoMb: '',
    estadoRevision: 'APROBADO_PARA_CONSTRUCCION',
    observaciones: ''
  });
  const [formNuevoRfi, setFormNuevoRfi] = useState({
    numeroRfi: '',
    asunto: '',
    disciplina: 'ESTRUCTURAS',
    documentoBimId: '',
    preguntaConsulta: '',
    propuestaSolucion: '',
    solicitante: '',
    fechaLimite: ''
  });
  const [formRespuestaRfi, setFormRespuestaRfi] = useState({
    respuestaOficial: '',
    responsableRespuesta: '',
    estado: 'RESPONDIDO'
  });
  const [modalMitigarTarget, setModalMitigarTarget] = useState<RiesgoConstruccionApi | null>(null);
  const [nuevoEstadoRiesgo, setNuevoEstadoRiesgo] = useState('EN_MITIGACION');
  const [medidasAdicionalesInput, setMedidasAdicionalesInput] = useState('');
  const [formNuevoRiesgo, setFormNuevoRiesgo] = useState({
    codigo: '',
    procesoFrente: '',
    peligro: '',
    riesgoConsecuencia: '',
    categoria: 'ALTURA',
    probabilidad: 3,
    severidad: 3,
    medidasControl: '',
    responsable: '',
    fechaEvaluacion: new Date().toISOString().split('T')[0],
    observaciones: ''
  });
  const [modalHorometroTarget, setModalHorometroTarget] = useState<MaquinariaConstruccionApi | null>(null);
  const [nuevoHorometroInput, setNuevoHorometroInput] = useState('');
  const [nuevoOperadorInput, setNuevoOperadorInput] = useState('');
  const [modalMantTarget, setModalMantTarget] = useState<MaquinariaConstruccionApi | null>(null);
  const [historialMantenimientos, setHistorialMantenimientos] = useState<MantenimientoMaquinariaApi[]>([]);
  const [cargandoMantenimientos, setCargandoMantenimientos] = useState(false);
  const [mostrarFormMant, setMostrarFormMant] = useState(false);
  const [formMant, setFormMant] = useState({
    tipo: 'PREVENTIVO',
    fechaMantenimiento: new Date().toISOString().split('T')[0],
    horometroEnMantenimiento: '',
    descripcionTrabajo: '',
    mecanicoOTaller: '',
    costoTotalUsd: '0',
    repuestosUtilizados: ''
  });
  const [formNuevaMaquinaria, setFormNuevaMaquinaria] = useState({
    codigo: '',
    nombre: '',
    tipo: 'PESADA',
    marca: '',
    modelo: '',
    serialChasis: '',
    placa: '',
    horometroActual: '0',
    intervaloMantenimientoHoras: '250',
    estado: 'OPERATIVO',
    operadorResponsable: '',
    costoHoraUsd: '0',
    combustibleTipo: 'DIESEL',
    asignarAProyecto: true,
    observaciones: ''
  });
  const [modalBitacoraAbierto, setModalBitacoraAbierto] = useState(false);

  // Catálogo COVENIN
  const [catalogoCovenin, setCatalogoCovenin] = useState<CatalogoCoveninApi[]>([]);
  const [busquedaCovenin, setBusquedaCovenin] = useState('');
  const [buscandoCovenin, setBuscandoCovenin] = useState(false);

  // Notificación temporal
  const notificarExito = (msg: string) => {
    setMensajeExito(msg);
    setTimeout(() => setMensajeExito(null), 4000);
  };

  // Cargar Proyectos e Insumos base
  const recargarProyectosEInsumos = useCallback(async () => {
    setCargando(true);
    setErrorGlobal(null);
    try {
      const [listaProy, listaIns] = await Promise.all([
        listarProyectosConstruccionApi(),
        listarInsumosConstruccionApi(),
      ]);
      setProyectos(listaProy);
      setInsumos(listaIns);

      if (listaProy.length > 0) {
        setProyectoSeleccionadoId((prev) => {
          if (prev && listaProy.some((p) => p.id === prev)) return prev;
          return listaProy[0].id ?? null;
        });
      } else {
        setProyectoSeleccionadoId(null);
      }
    } catch (err: any) {
      setErrorGlobal(err.message || 'Error al conectar con el servidor de construcción');
    } finally {
      setCargando(false);
    }
  }, []);

  // Cargar subrecursos del proyecto activo
  const recargarSubrecursosProyecto = useCallback(async (proyId: number) => {
    setErrorGlobal(null);
    try {
      const [caps, parts, vals, desps, bit] = await Promise.all([
        listarCapitulosConstruccionApi(proyId),
        listarPartidasConstruccionApi(proyId),
        listarValuacionesConstruccionApi(proyId),
        listarDespachosConstruccionApi(proyId),
        listarBitacoraConstruccionApi(proyId),
      ]);
      setCapitulos(caps);
      setPartidas(parts);
      setValuaciones(vals);
      setDespachos(desps);
      setBitacora(bit);
    } catch (err: any) {
      setErrorGlobal(err.message || 'Error cargando datos del proyecto seleccionado');
    }
  }, []);

  useEffect(() => {
    recargarProyectosEInsumos();
  }, [recargarProyectosEInsumos]);

  useEffect(() => {
    if (proyectoSeleccionadoId) {
      recargarSubrecursosProyecto(proyectoSeleccionadoId);
    } else {
      setCapitulos([]);
      setPartidas([]);
      setValuaciones([]);
      setDespachos([]);
      setBitacora([]);
    }
  }, [proyectoSeleccionadoId, recargarSubrecursosProyecto]);

  // Proyecto Activo
  const proyectoActivo = useMemo(() => {
    return proyectos.find((p) => p.id === proyectoSeleccionadoId) || null;
  }, [proyectos, proyectoSeleccionadoId]);

  // Búsqueda en catálogo COVENIN
  useEffect(() => {
    if (!busquedaCovenin.trim()) {
      setCatalogoCovenin([]);
      return;
    }
    const timer = setTimeout(async () => {
      setBuscandoCovenin(true);
      try {
        const resultados = await buscarCatalogoCoveninApi(busquedaCovenin);
        setCatalogoCovenin(resultados);
      } catch (e) {
        console.error('Error buscando catálogo COVENIN:', e);
      } finally {
        setBuscandoCovenin(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [busquedaCovenin]);

  // Cálculos para Resumen Ejecutivo
  const resumenCalculos = useMemo(() => {
    const totalPresupuesto = proyectos.reduce(
      (acc, p) => acc + (Number(p.montoPresupuestoTotal) || 0),
      0
    );
    const totalValuacionesAprobadas = valuaciones
      .filter((v) => v.estado === 'APROBADA' || v.estado === 'COBRADA')
      .reduce((acc, v) => acc + (Number(v.montoNetoACobrar || v.montoNetoAPagar) || 0), 0);

    const partidasEjecutadas = partidas.filter(
      (p) => (Number(p.cantidadEjecutadaAcumulada) || 0) > 0
    ).length;

    const insumosCriticos = insumos.filter(
      (i) => (Number(i.stockActual) || 0) <= (Number(i.stockMinimo) || 0)
    ).length;

    const despachosEnTransito = despachos.filter(
      (d) => d.estado === 'EN_TRANSITO' || d.estado === 'EN_BASCULA' || d.estado === 'DESCARGANDO'
    ).length;

    return {
      totalPresupuesto,
      totalValuacionesAprobadas,
      totalPartidas: partidas.length,
      partidasEjecutadas,
      totalInsumos: insumos.length,
      insumosCriticos,
      despachosTotales: despachos.length,
      despachosEnTransito,
    };
  }, [proyectos, valuaciones, partidas, insumos, despachos]);

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* BARRA SUPERIOR INSTITUCIONAL */}
      <header className="border-b border-slate-800 bg-[#0d1322]/90 backdrop-blur sticky top-0 z-30 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/5">
            <IconConstruction size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base tracking-tight text-white leading-none">
                Control de Obras Civiles & Inspección Pro
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25">
                Norma COVENIN
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Gestión Contractual, Partidas Presupuestarias, Valuaciones y Logística
            </p>
          </div>
        </div>

        {/* SELECTOR DE PROYECTO ACTIVO */}
        <div className="flex items-center gap-2">
          {proyectos.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-400">Obra:</span>
              <select
                value={proyectoSeleccionadoId ?? ''}
                onChange={(e) => setProyectoSeleccionadoId(Number(e.target.value))}
                className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer max-w-[220px] truncate"
              >
                {proyectos.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    {p.codigo} - {p.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => {
              recargarProyectosEInsumos();
              if (proyectoSeleccionadoId) recargarSubrecursosProyecto(proyectoSeleccionadoId);
            }}
            title="Recargar datos desde el servidor"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <IconRefresh size={16} />
          </button>

          {onSalir && (
            <button
              onClick={onSalir}
              className="px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer"
            >
              Volver
            </button>
          )}
        </div>
      </header>

      {/* MENSAJES DE ESTADO */}
      {mensajeExito && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/25 text-emerald-300 px-4 py-2.5 text-xs font-medium flex items-center gap-2">
          <IconCheckCircle size={16} className="text-emerald-400 shrink-0" />
          <span>{mensajeExito}</span>
        </div>
      )}

      {errorGlobal && (
        <div className="bg-red-500/10 border-b border-red-500/25 text-red-300 px-4 py-2.5 text-xs font-medium flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <IconWarning size={16} className="text-red-400 shrink-0" />
            <span>{errorGlobal}</span>
          </div>
          <button
            onClick={() => setErrorGlobal(null)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <IconClose size={14} />
          </button>
        </div>
      )}

      {/* NAVEGACIÓN PRINCIPAL */}
      <nav className="border-b border-slate-800/80 bg-[#0d1322]/50 px-4 flex items-center gap-1 overflow-x-auto">
        {[
          { id: 'resumen', label: 'Resumen Ejecutivo', icon: IconChart },
          { id: 'proyectos', label: 'Proyectos & Contratos', icon: IconConstruction, count: proyectos.length },
          { id: 'presupuesto', label: 'Capítulos & Partidas', icon: IconFileText, count: partidas.length },
          { id: 'valuaciones', label: 'Valuaciones de Obra', icon: IconCheckCircle, count: valuaciones.length },
          { id: 'insumos', label: 'Insumos & Stock', icon: IconBox, count: insumos.length },
          { id: 'logistica', label: 'Logística & Despachos', icon: IconTruck, count: despachos.length },
          { id: 'maquinaria', label: 'Maquinaria & Equipos', icon: IconWrench, count: maquinarias.length },
          { id: 'riesgos', label: 'Matriz Riesgos & SST', icon: IconWarning, count: riesgos.length },
          { id: 'bim', label: 'BIM & Planos (RFIs)', icon: IconFileText, count: documentosBim.length + rfis.length },
          { id: 'bitacora', label: 'Libro Diario / Bitácora', icon: IconCalendar, count: bitacora.length },
          { id: 'avanzado', label: 'Cuadrillas & Frentes', icon: IconUsers, badge: 'Paso 6' },
        ].map((item) => {
          const Icon = item.icon;
          const activa = tabActiva === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTabActiva(item.id as TabConstruccion)}
              className={
                'flex items-center gap-2 px-3.5 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ' +
                (activa
                  ? 'border-amber-400 text-amber-300 bg-amber-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700')
              }
            >
              <Icon size={16} />
              <span>{item.label}</span>
              {typeof item.count === 'number' && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {item.count}
                </span>
              )}
              {item.badge && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold uppercase">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* VISTA 1: RESUMEN EJECUTIVO */}
        {tabActiva === 'resumen' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#101726] border border-slate-800 p-4 rounded-2xl">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>Presupuesto Contratado Total</span>
                  <IconConstruction size={18} className="text-amber-400" />
                </div>
                <div className="text-xl font-bold font-mono text-white">
                  Bs. {formatVE(resumenCalculos.totalPresupuesto)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  En {proyectos.length} proyecto(s) registrados
                </div>
              </div>

              <div className="bg-[#101726] border border-slate-800 p-4 rounded-2xl">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>Valuaciones Aprobadas / Cobradas</span>
                  <IconCheckCircle size={18} className="text-emerald-400" />
                </div>
                <div className="text-xl font-bold font-mono text-emerald-300">
                  Bs. {formatVE(resumenCalculos.totalValuacionesAprobadas)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Avance financiero auditado
                </div>
              </div>

              <div className="bg-[#101726] border border-slate-800 p-4 rounded-2xl">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>Partidas de Obra Activas</span>
                  <IconFileText size={18} className="text-sky-400" />
                </div>
                <div className="text-xl font-bold font-mono text-white">
                  {resumenCalculos.totalPartidas}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {resumenCalculos.partidasEjecutadas} con ejecución física reportada
                </div>
              </div>

              <div className="bg-[#101726] border border-slate-800 p-4 rounded-2xl">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>Logística en Tránsito</span>
                  <IconTruck size={18} className="text-amber-400" />
                </div>
                <div className="text-xl font-bold font-mono text-white">
                  {resumenCalculos.despachosEnTransito}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  De {resumenCalculos.despachosTotales} despachos registrados
                </div>
              </div>
            </div>

            {/* DETALLE DEL PROYECTO SELECCIONADO */}
            {proyectoActivo ? (
              <div className="bg-[#101726] border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                        {proyectoActivo.codigo}
                      </span>
                      <h2 className="text-base font-bold text-white">{proyectoActivo.nombre}</h2>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
                        {proyectoActivo.estado}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Cliente: <strong className="text-slate-200">{proyectoActivo.cliente}</strong> &bull; Ubicación: {proyectoActivo.ubicacion || 'No especificada'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Presupuesto del Contrato</div>
                    <div className="text-lg font-bold font-mono text-white">
                      Bs. {formatVE(proyectoActivo.montoPresupuestoTotal)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60">
                    <div className="text-slate-400 text-[11px]">Ingeniero Residente</div>
                    <div className="font-semibold text-slate-200 mt-0.5">
                      {proyectoActivo.ingenieroResidente || 'Sin asignar'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      CIV: {proyectoActivo.civResidente || 'N/A'}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60">
                    <div className="text-slate-400 text-[11px]">Anticipo Contractual</div>
                    <div className="font-semibold text-slate-200 mt-0.5 font-mono">
                      {formatVE(proyectoActivo.porcentajeAnticipo)}%
                    </div>
                    <div className="text-[10px] text-slate-500">Amortizable en valuaciones</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60">
                    <div className="text-slate-400 text-[11px]">Retención de Garantía</div>
                    <div className="font-semibold text-slate-200 mt-0.5 font-mono">
                      {formatVE(proyectoActivo.porcentajeRetencionGarantia)}%
                    </div>
                    <div className="text-[10px] text-slate-500">Fiel cumplimiento</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60">
                    <div className="text-slate-400 text-[11px]">Período de Obra</div>
                    <div className="font-semibold text-slate-200 mt-0.5 font-mono">
                      {proyectoActivo.fechaInicio || 'Inicio s/d'}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Fin est: {proyectoActivo.fechaFinEstimada || 's/d'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#101726] border border-dashed border-slate-800 rounded-2xl p-8 text-center">
                <IconConstruction size={36} className="text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-300">No hay proyectos registrados</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Crea tu primer proyecto u obra civil para iniciar el cómputo métrico y valuaciones.
                </p>
                <button
                  onClick={() => {
                    setProyectoEditando(null);
                    setModalProyectoAbierto(true);
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer"
                >
                  Registrar Primer Proyecto
                </button>
              </div>
            )}
          </div>
        )}

        {/* VISTA 2: PROYECTOS */}
        {tabActiva === 'proyectos' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Proyectos y Obras Civiles</h2>
                <p className="text-xs text-slate-400">
                  Expediente de contratos, ingenieros colegiados y especificaciones económicas
                </p>
              </div>
              <button
                onClick={() => {
                  setProyectoEditando(null);
                  setModalProyectoAbierto(true);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/10"
              >
                <span>+ Nuevo Proyecto</span>
              </button>
            </div>

            {proyectos.length === 0 ? (
              <div className="bg-[#101726] border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
                No hay proyectos registrados en este tenant.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {proyectos.map((proy) => (
                  <div
                    key={proy.id}
                    className={
                      'bg-[#101726] border rounded-2xl p-4 space-y-3 transition-all ' +
                      (proy.id === proyectoSeleccionadoId
                        ? 'border-amber-500/50 shadow-lg shadow-amber-500/5'
                        : 'border-slate-800 hover:border-slate-700')
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                            {proy.codigo}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                            {proy.estado}
                          </span>
                        </div>
                        <h3 className="font-bold text-sm text-white mt-1.5">{proy.nombre}</h3>
                        <p className="text-xs text-slate-400">Cliente: {proy.cliente}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-500 uppercase font-semibold">Presupuesto</div>
                        <div className="font-mono text-sm font-bold text-white">
                          Bs. {formatVE(proy.montoPresupuestoTotal)}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs grid grid-cols-2 gap-2 text-slate-400 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/40">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Residente</span>
                        <span className="text-slate-200 font-medium truncate block">
                          {proy.ingenieroResidente || 'No asignado'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Carnet CIV</span>
                        <span className="text-slate-200 font-mono block">
                          {proy.civResidente || 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                      <button
                        onClick={() => setProyectoSeleccionadoId(proy.id!)}
                        className={
                          'px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ' +
                          (proy.id === proyectoSeleccionadoId
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300')
                        }
                      >
                        {proy.id === proyectoSeleccionadoId ? 'Obra Activa' : 'Seleccionar'}
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setProyectoEditando(proy);
                            setModalProyectoAbierto(true);
                          }}
                          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                          title="Editar especificaciones del proyecto"
                        >
                          <IconEdit size={14} />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`¿Eliminar proyecto "${proy.nombre}" y todos sus registros asociados?`)) {
                              try {
                                await eliminarProyectoConstruccionApi(proy.id!);
                                notificarExito('Proyecto eliminado correctamente');
                                recargarProyectosEInsumos();
                              } catch (e: any) {
                                setErrorGlobal(e.message || 'Error eliminando proyecto');
                              }
                            }
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 cursor-pointer"
                          title="Eliminar proyecto"
                        >
                          <IconTrash size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VISTA 3: CAPÍTULOS Y PARTIDAS */}
        {tabActiva === 'presupuesto' && (
          <div className="space-y-4">
            {!proyectoActivo ? (
              <div className="bg-[#101726] border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
                Selecciona o crea un proyecto para ver y gestionar sus partidas.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-white">Presupuesto y Partidas COVENIN</h2>
                    <p className="text-xs text-slate-400">
                      Obra activa: <strong className="text-amber-300">{proyectoActivo.nombre}</strong> &bull; {capitulos.length} capítulo(s) &bull; {partidas.length} partida(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setModalCapituloAbierto(true)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition cursor-pointer border border-slate-700"
                    >
                      + Nuevo Capítulo
                    </button>
                    <button
                      onClick={() => {
                        setPartidaEditando(null);
                        setModalPartidaAbierto(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/10"
                    >
                      <span>+ Nueva Partida</span>
                    </button>
                  </div>
                </div>

                {partidas.length === 0 ? (
                  <div className="bg-[#101726] border border-dashed border-slate-800 rounded-2xl p-8 text-center">
                    <IconFileText size={36} className="text-slate-600 mx-auto mb-3" />
                    <h3 className="text-sm font-semibold text-slate-300">Sin partidas presupuestadas</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Agrega partidas con su código COVENIN, cómputo métrico y precio unitario para iniciar el presupuesto.
                    </p>
                  </div>
                ) : (
                  <div className="bg-[#101726] border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                          <tr>
                            <th className="py-3 px-3">Código COVENIN</th>
                            <th className="py-3 px-3">Descripción de la Partida</th>
                            <th className="py-3 px-2 text-center">Unidad</th>
                            <th className="py-3 px-3 text-right">Cant. Presupuestada</th>
                            <th className="py-3 px-3 text-right">P.U. (Bs.)</th>
                            <th className="py-3 px-3 text-right">Total (Bs.)</th>
                            <th className="py-3 px-3 text-right">Ejecutado</th>
                            <th className="py-3 px-2 text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-sans">
                          {partidas.map((part) => {
                            const cant = Number(part.cantidadPresupuestada) || 0;
                            const pu = Number(part.precioUnitario) || 0;
                            const total = cant * pu;
                            const ejec = Number(part.cantidadEjecutadaAcumulada) || 0;

                            return (
                              <tr key={part.id} className="hover:bg-slate-900/40 transition-colors">
                                <td className="py-3 px-3 font-mono font-bold text-amber-400 whitespace-nowrap">
                                  {part.codigoCovenin || part.codigoPartida}
                                </td>
                                <td className="py-3 px-3 text-slate-200 font-medium max-w-xs">
                                  {part.descripcion}
                                </td>
                                <td className="py-3 px-2 text-center font-mono text-slate-400">
                                  {part.unidad}
                                </td>
                                <td className="py-3 px-3 text-right font-mono text-white">
                                  {formatVE(cant)}
                                </td>
                                <td className="py-3 px-3 text-right font-mono text-slate-300">
                                  {formatVE(pu)}
                                </td>
                                <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                                  {formatVE(total)}
                                </td>
                                <td className="py-3 px-3 text-right font-mono text-slate-400">
                                  {formatVE(ejec)}
                                </td>
                                <td className="py-3 px-2 text-center whitespace-nowrap">
                                  <button
                                    onClick={() => {
                                      setPartidaEditando(part);
                                      setModalPartidaAbierto(true);
                                    }}
                                    className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white cursor-pointer mr-1"
                                    title="Editar partida"
                                  >
                                    <IconEdit size={14} />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (confirm(`¿Eliminar partida ${part.codigoCovenin || part.codigoPartida}?`)) {
                                        try {
                                          await eliminarPartidaConstruccionApi(part.id!);
                                          notificarExito('Partida eliminada');
                                          recargarSubrecursosProyecto(proyectoActivo.id!);
                                        } catch (e: any) {
                                          setErrorGlobal(e.message || 'Error eliminando partida');
                                        }
                                      }
                                    }}
                                    className="p-1.5 hover:bg-red-500/10 rounded text-slate-400 hover:text-red-400 cursor-pointer"
                                    title="Eliminar partida"
                                  >
                                    <IconTrash size={14} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* VISTA 4: VALUACIONES */}
        {tabActiva === 'valuaciones' && (
          <div className="space-y-4">
            {!proyectoActivo ? (
              <div className="bg-[#101726] border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
                Selecciona un proyecto para emitir y consultar valuaciones de obra.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-white">Valuaciones de Obra Ejecutada</h2>
                    <p className="text-xs text-slate-400">
                      Cortes de obra auditados con cálculo automático de anticipo, retenciones de ley e IVA
                    </p>
                  </div>
                  <button
                    onClick={() => setModalValuacionAbierto(true)}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/10"
                  >
                    <span>+ Nueva Valuación</span>
                  </button>
                </div>

                {valuaciones.length === 0 ? (
                  <div className="bg-[#101726] border border-dashed border-slate-800 rounded-2xl p-8 text-center">
                    <IconCheckCircle size={36} className="text-slate-600 mx-auto mb-3" />
                    <h3 className="text-sm font-semibold text-slate-300">No hay valuaciones registradas</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Registra los cortes periódicos de ejecución para certificar cantidades y cobros.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {valuaciones.map((val) => {
                      const bruto = Number(val.montoBruto) || 0;
                      const amort = Number(val.amortizacionAnticipo || val.montoAmortizacionAnticipo) || 0;
                      const retFiel = Number(val.retencionFielCumplimiento || val.montoRetencionFielCumplimiento) || 0;
                      const retLab = Number(val.retencionLaboral || val.montoRetencionLaboral) || 0;
                      const subtotal = Number(val.montoSubtotal) || bruto - amort - retFiel - retLab;
                      const iva = Number(val.montoIva) || subtotal * 0.16;
                      const neto = Number(val.montoNetoACobrar || val.montoNetoAPagar) || subtotal + iva;

                      return (
                        <div
                          key={val.id}
                          className="bg-[#101726] border border-slate-800 rounded-2xl p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                                  Valuación N° {val.numeroValuacion}
                                </span>
                                <span
                                  className={
                                    'text-[10px] font-bold uppercase px-2 py-0.5 rounded ' +
                                    (val.estado === 'APROBADA' || val.estado === 'COBRADA'
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : val.estado === 'RECHAZADA'
                                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                      : 'bg-amber-500/10 text-amber-300 border border-amber-500/20')
                                  }
                                >
                                  {val.estado}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-1 font-mono">
                                Período: {val.periodoDesde} &rarr; {val.periodoHasta}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-500 uppercase font-semibold">Neto a Cobrar</span>
                              <div className="font-mono text-base font-bold text-emerald-400">
                                Bs. {formatVE(neto)}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60 font-mono">
                            <div>
                              <span className="text-slate-400 font-sans block">Monto Bruto:</span>
                              <span className="text-slate-200">Bs. {formatVE(bruto)}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-sans block">Amort. Anticipo:</span>
                              <span className="text-amber-300">- Bs. {formatVE(amort)}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-sans block">Ret. Garantía:</span>
                              <span className="text-slate-300">- Bs. {formatVE(retFiel)}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-sans block">Ret. Laboral:</span>
                              <span className="text-slate-300">- Bs. {formatVE(retLab)}</span>
                            </div>
                          </div>

                          {val.observaciones && (
                            <p className="text-xs text-slate-400 italic">
                              &ldquo;{val.observaciones}&rdquo;
                            </p>
                          )}

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                            {val.estado === 'BORRADOR' && (
                              <button
                                onClick={async () => {
                                  try {
                                    await cambiarEstadoValuacionConstruccionApi(val.id!, 'PRESENTADA');
                                    notificarExito('Valuación presentada formalmente a la inspección');
                                    recargarSubrecursosProyecto(proyectoActivo.id!);
                                  } catch (e: any) {
                                    setErrorGlobal(e.message || 'Error cambiando estado');
                                  }
                                }}
                                className="px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-semibold cursor-pointer"
                              >
                                Presentar a Inspección
                              </button>
                            )}

                            {val.estado === 'PRESENTADA' && (
                              <button
                                onClick={async () => {
                                  try {
                                    await cambiarEstadoValuacionConstruccionApi(val.id!, 'APROBADA');
                                    notificarExito('Valuación aprobada por la inspección de obra');
                                    recargarSubrecursosProyecto(proyectoActivo.id!);
                                  } catch (e: any) {
                                    setErrorGlobal(e.message || 'Error cambiando estado');
                                  }
                                }}
                                className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold cursor-pointer"
                              >
                                Aprobar Valuación
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* VISTA 5: INSUMOS Y STOCK */}
        {tabActiva === 'insumos' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white">Insumos, Materiales y Equipos</h2>
                <p className="text-xs text-slate-400">
                  Control de inventario en sitio con descuento atómico concurrente e idempotencia
                </p>
              </div>
              <button
                onClick={() => setModalInsumoAbierto(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/10"
              >
                <span>+ Registrar Insumo</span>
              </button>
            </div>

            {insumos.length === 0 ? (
              <div className="bg-[#101726] border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
                No hay insumos registrados en este tenant.
              </div>
            ) : (
              <div className="bg-[#101726] border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-3">Código</th>
                        <th className="py-3 px-3">Descripción del Material</th>
                        <th className="py-3 px-2 text-center">Tipo</th>
                        <th className="py-3 px-2 text-center">Unidad</th>
                        <th className="py-3 px-3 text-right">Costo Unit. (Bs.)</th>
                        <th className="py-3 px-3 text-right">Stock Actual</th>
                        <th className="py-3 px-3 text-right">Stock Mínimo</th>
                        <th className="py-3 px-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      {insumos.map((ins) => {
                        const actual = Number(ins.stockActual) || 0;
                        const min = Number(ins.stockMinimo) || 0;
                        const bajoStock = actual <= min;

                        return (
                          <tr key={ins.id} className="hover:bg-slate-900/40 transition-colors">
                            <td className="py-3 px-3 font-mono font-bold text-amber-400 whitespace-nowrap">
                              {ins.codigo}
                            </td>
                            <td className="py-3 px-3 text-slate-200 font-medium">
                              {ins.nombre}
                              {ins.proveedor && (
                                <span className="text-[10px] text-slate-400 block font-normal">
                                  Prov: {ins.proveedor}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                                {ins.tipo}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-center font-mono text-slate-400">
                              {ins.unidad}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-slate-300">
                              {formatVE(ins.costoUnitario)}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold">
                              <span className={bajoStock ? 'text-red-400' : 'text-emerald-400'}>
                                {formatVE(actual)}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-slate-400">
                              {formatVE(min)}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <button
                                onClick={() => {
                                  setInsumoConsumo(ins);
                                  setModalConsumoAbierto(true);
                                }}
                                className="px-2.5 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-semibold transition cursor-pointer"
                              >
                                Descontar Consumo
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VISTA 6: LOGÍSTICA & DESPACHOS */}
        {tabActiva === 'logistica' && (
          <div className="space-y-4">
            {!proyectoActivo ? (
              <div className="bg-[#101726] border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
                Selecciona un proyecto para gestionar sus guías de despacho y recepción en obra.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-white">Logística & Despachos de Suministros</h2>
                    <p className="text-xs text-slate-400">
                      Trazabilidad de transporte de carga pesada, control de pesaje y ensayos de cono de Abrams
                    </p>
                  </div>
                  <button
                    onClick={() => setModalDespachoAbierto(true)}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/10"
                  >
                    <span>+ Registrar Despacho / Guía</span>
                  </button>
                </div>

                {despachos.length === 0 ? (
                  <div className="bg-[#101726] border border-dashed border-slate-800 rounded-2xl p-8 text-center">
                    <IconTruck size={36} className="text-slate-600 mx-auto mb-3" />
                    <h3 className="text-sm font-semibold text-slate-300">Sin despachos registrados en esta obra</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Registra camiones mixer de concreto premezclado, gandolas de acero o agregados de cantera.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {despachos.map((desp) => {
                      return (
                        <div
                          key={desp.id}
                          className="bg-[#101726] border border-slate-800 rounded-2xl p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                                  {desp.guiaNumero}
                                </span>
                                <span
                                  className={
                                    'text-[10px] font-bold uppercase px-2 py-0.5 rounded ' +
                                    (desp.estado === 'RECIBIDO'
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : desp.estado === 'RECHAZADO'
                                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                      : desp.estado === 'DESCARGANDO'
                                      ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                      : 'bg-amber-500/10 text-amber-300 border border-amber-500/20')
                                  }
                                >
                                  {desp.estado}
                                </span>
                              </div>
                              <h3 className="text-sm font-bold text-white mt-1">
                                {desp.tipoMaterial.replace(/_/g, ' ')}
                              </h3>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-500 uppercase font-semibold">Cantidad</span>
                              <div className="font-mono text-base font-bold text-white">
                                {formatVE(desp.cantidad)} {desp.unidadMedida}
                              </div>
                            </div>
                          </div>

                          <div className="text-xs space-y-1.5 text-slate-300">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Ruta:</span>
                              <span className="font-medium text-slate-200">
                                {desp.origen} &rarr; {desp.destinoFrente}
                              </span>
                            </div>
                            {desp.unidadTransporte && (
                              <div className="flex justify-between">
                                <span className="text-slate-500">Unidad de Transporte:</span>
                                <span className="font-mono text-slate-200">{desp.unidadTransporte}</span>
                              </div>
                            )}
                            {desp.chofer && (
                              <div className="flex justify-between">
                                <span className="text-slate-500">Conductor:</span>
                                <span className="text-slate-200">{desp.chofer}</span>
                              </div>
                            )}
                          </div>

                          {(desp.pesoNetoKg != null || desp.slumpConoPulgadas != null) && (
                            <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60 font-mono">
                              {desp.pesoNetoKg != null && (
                                <div>
                                  <span className="text-slate-500 font-sans block">Peso Neto Báscula:</span>
                                  <span className="text-slate-200">{formatVE(desp.pesoNetoKg)} kg</span>
                                </div>
                              )}
                              {desp.slumpConoPulgadas != null && (
                                <div>
                                  <span className="text-slate-500 font-sans block">Ensayo Asentamiento:</span>
                                  <span className="text-amber-300">{formatVE(desp.slumpConoPulgadas)}&quot; (Pulgadas)</span>
                                </div>
                              )}
                            </div>
                          )}

                          {desp.observaciones && (
                            <p className="text-xs text-slate-400 italic">
                              &ldquo;{desp.observaciones}&rdquo;
                            </p>
                          )}

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                            {desp.estado === 'EN_TRANSITO' && (
                              <button
                                onClick={async () => {
                                  try {
                                    await cambiarEstadoDespachoConstruccionApi(desp.id!, 'EN_BASCULA');
                                    notificarExito('Unidad reportada en báscula de obra');
                                    recargarSubrecursosProyecto(proyectoActivo.id!);
                                  } catch (e: any) {
                                    setErrorGlobal(e.message || 'Error actualizando despacho');
                                  }
                                }}
                                className="px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-semibold cursor-pointer"
                              >
                                Llegó a Báscula
                              </button>
                            )}

                            {desp.estado === 'EN_BASCULA' && (
                              <button
                                onClick={async () => {
                                  try {
                                    await cambiarEstadoDespachoConstruccionApi(desp.id!, 'DESCARGANDO');
                                    notificarExito('Iniciando descarga en frente de trabajo');
                                    recargarSubrecursosProyecto(proyectoActivo.id!);
                                  } catch (e: any) {
                                    setErrorGlobal(e.message || 'Error actualizando despacho');
                                  }
                                }}
                                className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold cursor-pointer"
                              >
                                Iniciar Descarga
                              </button>
                            )}

                            {(desp.estado === 'DESCARGANDO' || desp.estado === 'EN_TRANSITO' || desp.estado === 'EN_BASCULA') && (
                              <button
                                onClick={async () => {
                                  try {
                                    await cambiarEstadoDespachoConstruccionApi(desp.id!, 'RECIBIDO');
                                    notificarExito('Despacho recibido y certificado conforme en sitio');
                                    recargarSubrecursosProyecto(proyectoActivo.id!);
                                  } catch (e: any) {
                                    setErrorGlobal(e.message || 'Error actualizando despacho');
                                  }
                                }}
                                className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold cursor-pointer"
                              >
                                Certificar Recepción
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* VISTA 7: BITÁCORA / LIBRO DIARIO */}
        {tabActiva === 'bitacora' && (
          <div className="space-y-4">
            {!proyectoActivo ? (
              <div className="bg-[#101726] border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
                Selecciona un proyecto para ver y registrar el diario de obra.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-white">Libro Diario de Obra (Bitácora)</h2>
                    <p className="text-xs text-slate-400">
                      Registro cronológico legal de actividades, clima, personal y novedades técnicas
                    </p>
                  </div>
                  <button
                    onClick={() => setModalBitacoraAbierto(true)}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/10"
                  >
                    <span>+ Registrar Asiento Diario</span>
                  </button>
                </div>

                {bitacora.length === 0 ? (
                  <div className="bg-[#101726] border border-dashed border-slate-800 rounded-2xl p-8 text-center">
                    <IconCalendar size={36} className="text-slate-600 mx-auto mb-3" />
                    <h3 className="text-sm font-semibold text-slate-300">Sin asientos en el libro diario</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Registra el primer día de trabajo para documentar el progreso en sitio.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bitacora.map((asiento) => (
                      <div
                        key={asiento.id}
                        className="bg-[#101726] border border-slate-800 rounded-2xl p-4 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-white bg-slate-800 px-2.5 py-1 rounded">
                              {asiento.fecha}
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold uppercase">
                              Clima: {asiento.clima || asiento.condicionClimatica || 'SOLEADO'}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              Personal activo: <strong className="text-slate-200">{asiento.personalActivo ?? 0} operarios</strong>
                            </span>
                          </div>
                          {asiento.elaboradoPor && (
                            <span className="text-[11px] text-slate-400">
                              Por: <strong className="text-slate-200">{asiento.elaboradoPor}</strong>
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-200 space-y-2">
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">
                              Actividades Ejecutadas
                            </span>
                            <p className="text-slate-200 leading-relaxed whitespace-pre-line">
                              {asiento.actividadesEjecutadas || asiento.actividadesRealizadas}
                            </p>
                          </div>

                          {(asiento.observacionesEIncidentes || asiento.incidentesRetrasos) && (
                            <div className="bg-amber-500/5 border border-amber-500/20 p-2.5 rounded-xl">
                              <span className="text-[10px] text-amber-400 uppercase font-bold block mb-0.5">
                                Observaciones / Incidentes
                              </span>
                              <p className="text-amber-200 text-xs">
                                {asiento.observacionesEIncidentes || asiento.incidentesRetrasos}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* VISTA 8: INGENIERÍA AVANZADA / PRÓXIMAMENTE */}
        {tabActiva === 'avanzado' && (
          <div className="space-y-6">
            <div className="bg-[#101726] border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <IconWrench size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Módulos de Maquinaria, Riesgos y BIM (Fase 3)</h3>
                  <p className="text-xs text-slate-400">
                    Planificación técnica sin datos simulados ni mocks de papel
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">Maquinaria & Horómetros</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">Siguiente Lote</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Control de horas máquina, combustible y mantenimiento preventivo por frente de obra.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">Matriz de Riesgos & BIM</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">Siguiente Lote</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Gestión documental de planos IFC / Revit y evaluación probabilística de severidad de contingencias.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: CREAR / EDITAR PROYECTO */}
      {modalProyectoAbierto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101726] border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">
                {proyectoEditando ? 'Editar Proyecto de Obra' : 'Nuevo Proyecto de Obra'}
              </h3>
              <button
                onClick={() => setModalProyectoAbierto(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <IconClose size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const fd = new FormData(form);

                const proyData: ProyectoConstruccionApi = {
                  codigo: (fd.get('codigo') as string).trim(),
                  nombre: (fd.get('nombre') as string).trim(),
                  cliente: (fd.get('cliente') as string).trim(),
                  ubicacion: (fd.get('ubicacion') as string).trim(),
                  ingenieroResidente: (fd.get('ingenieroResidente') as string).trim(),
                  civResidente: (fd.get('civResidente') as string).trim(),
                  montoPresupuestoTotal: Number(fd.get('montoPresupuestoTotal')) || 0,
                  porcentajeAnticipo: Number(fd.get('porcentajeAnticipo')) || 20,
                  porcentajeRetencionGarantia: Number(fd.get('porcentajeRetencionGarantia')) || 10,
                  estado: (fd.get('estado') as string) || 'EN_EJECUCION',
                };

                try {
                  if (proyectoEditando?.id) {
                    await actualizarProyectoConstruccionApi(proyectoEditando.id, proyData);
                    notificarExito('Proyecto actualizado');
                  } else {
                    await crearProyectoConstruccionApi(proyData);
                    notificarExito('Proyecto creado exitosamente');
                  }
                  setModalProyectoAbierto(false);
                  recargarProyectosEInsumos();
                } catch (err: any) {
                  alert(err.message || 'Error guardando proyecto');
                }
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Código *</label>
                  <input
                    name="codigo"
                    required
                    defaultValue={proyectoEditando?.codigo || ''}
                    placeholder="OBRA-2026-01"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-slate-400 block mb-1 font-semibold">Nombre de la Obra *</label>
                  <input
                    name="nombre"
                    required
                    defaultValue={proyectoEditando?.nombre || ''}
                    placeholder="Construcción Módulo Industrial"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Cliente / Contratante *</label>
                  <input
                    name="cliente"
                    required
                    defaultValue={proyectoEditando?.cliente || ''}
                    placeholder="Corporación Minera"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Ubicación</label>
                  <input
                    name="ubicacion"
                    defaultValue={proyectoEditando?.ubicacion || ''}
                    placeholder="Zona Industrial, Galpón 4"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Ingeniero Residente</label>
                  <input
                    name="ingenieroResidente"
                    defaultValue={proyectoEditando?.ingenieroResidente || ''}
                    placeholder="Ing. Carlos Pérez"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Carnet CIV</label>
                  <input
                    name="civResidente"
                    defaultValue={proyectoEditando?.civResidente || ''}
                    placeholder="CIV-189.420"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Presupuesto (Bs.)</label>
                  <input
                    name="montoPresupuestoTotal"
                    type="number"
                    step="0.01"
                    defaultValue={proyectoEditando?.montoPresupuestoTotal ?? ''}
                    placeholder="50000.00"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">% Anticipo</label>
                  <input
                    name="porcentajeAnticipo"
                    type="number"
                    step="0.01"
                    defaultValue={proyectoEditando?.porcentajeAnticipo ?? 20}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">% Ret. Garantía</label>
                  <input
                    name="porcentajeRetencionGarantia"
                    type="number"
                    step="0.01"
                    defaultValue={proyectoEditando?.porcentajeRetencionGarantia ?? 10}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Estado</label>
                <select
                  name="estado"
                  defaultValue={proyectoEditando?.estado || 'EN_EJECUCION'}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                >
                  <option value="EN_EJECUCION">EN_EJECUCION</option>
                  <option value="PARALIZADA">PARALIZADA</option>
                  <option value="FINALIZADA">FINALIZADA</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalProyectoAbierto(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-lg shadow-amber-500/10"
                >
                  Guardar Proyecto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREAR CAPÍTULO */}
      {modalCapituloAbierto && proyectoActivo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101726] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">Nuevo Capítulo Presupuestario</h3>
              <button
                onClick={() => setModalCapituloAbierto(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <IconClose size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const fd = new FormData(form);

                try {
                  await crearCapituloConstruccionApi(proyectoActivo.id!, {
                    proyectoId: proyectoActivo.id!,
                    codigo: (fd.get('codigo') as string).trim(),
                    nombre: (fd.get('nombre') as string).trim(),
                    orden: Number(fd.get('orden')) || 1,
                  });
                  notificarExito('Capítulo creado');
                  setModalCapituloAbierto(false);
                  recargarSubrecursosProyecto(proyectoActivo.id!);
                } catch (err: any) {
                  alert(err.message || 'Error creando capítulo');
                }
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Código *</label>
                  <input
                    name="codigo"
                    required
                    placeholder="1.0"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-slate-400 block mb-1 font-semibold">Nombre del Capítulo *</label>
                  <input
                    name="nombre"
                    required
                    placeholder="Obras Preliminares"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Orden correlativo</label>
                <input
                  name="orden"
                  type="number"
                  defaultValue={capitulos.length + 1}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalCapituloAbierto(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  Guardar Capítulo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CREAR / EDITAR PARTIDA */}
      {modalPartidaAbierto && proyectoActivo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101726] border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">
                {partidaEditando ? 'Editar Partida' : 'Nueva Partida de Obra'}
              </h3>
              <button
                onClick={() => setModalPartidaAbierto(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <IconClose size={18} />
              </button>
            </div>

            {/* Buscador de catálogo COVENIN asistido */}
            {!partidaEditando && (
              <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 space-y-2">
                <div className="text-[11px] font-semibold text-amber-400 flex items-center gap-1.5">
                  <IconSearch size={14} />
                  <span>Buscador del Catálogo Oficial COVENIN</span>
                </div>
                <input
                  type="text"
                  value={busquedaCovenin}
                  onChange={(e) => setBusquedaCovenin(e.target.value)}
                  placeholder="Ej: concreto, tubería, acero..."
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                />
                {buscandoCovenin && (
                  <span className="text-[10px] text-slate-400">Buscando en catálogo...</span>
                )}
                {catalogoCovenin.length > 0 && (
                  <div className="max-h-28 overflow-y-auto divide-y divide-slate-800 border border-slate-800 rounded-xl bg-slate-950">
                    {catalogoCovenin.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          const f = document.getElementById('form-partida') as HTMLFormElement;
                          if (f) {
                            (f.elements.namedItem('codigoCovenin') as HTMLInputElement).value = item.codigoCovenin;
                            (f.elements.namedItem('descripcion') as HTMLTextAreaElement).value = item.descripcion;
                            (f.elements.namedItem('unidad') as HTMLInputElement).value = item.unidad;
                          }
                          setCatalogoCovenin([]);
                          setBusquedaCovenin('');
                        }}
                        className="p-2 hover:bg-slate-900 cursor-pointer text-[11px]"
                      >
                        <span className="font-mono text-amber-400 font-bold mr-2">{item.codigoCovenin}</span>
                        <span className="text-slate-200">{item.descripcion}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <form
              id="form-partida"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const fd = new FormData(form);

                const data: PartidaConstruccionApi = {
                  proyectoId: proyectoActivo.id!,
                  capituloId: fd.get('capituloId') ? Number(fd.get('capituloId')) : undefined,
                  codigoCovenin: (fd.get('codigoCovenin') as string).trim(),
                  descripcion: (fd.get('descripcion') as string).trim(),
                  unidad: (fd.get('unidad') as string).trim(),
                  cantidadPresupuestada: Number(fd.get('cantidadPresupuestada')) || 0,
                  precioUnitario: Number(fd.get('precioUnitario')) || 0,
                  rendimientoDiario: Number(fd.get('rendimientoDiario')) || 0,
                };

                try {
                  if (partidaEditando?.id) {
                    await actualizarPartidaConstruccionApi(partidaEditando.id, data);
                    notificarExito('Partida actualizada');
                  } else {
                    await crearPartidaConstruccionApi(proyectoActivo.id!, data);
                    notificarExito('Partida creada exitosamente');
                  }
                  setModalPartidaAbierto(false);
                  recargarSubrecursosProyecto(proyectoActivo.id!);
                } catch (err: any) {
                  alert(err.message || 'Error guardando partida');
                }
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Código COVENIN *</label>
                  <input
                    name="codigoCovenin"
                    required
                    defaultValue={partidaEditando?.codigoCovenin || partidaEditando?.codigoPartida || ''}
                    placeholder="E-311.100"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Capítulo</label>
                  <select
                    name="capituloId"
                    defaultValue={partidaEditando?.capituloId ?? ''}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  >
                    <option value="">(Sin capítulo)</option>
                    {capitulos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.codigo} - {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Descripción de la Partida *</label>
                <textarea
                  name="descripcion"
                  required
                  rows={3}
                  defaultValue={partidaEditando?.descripcion || ''}
                  placeholder="Vaciado de concreto en zapatas..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Unidad *</label>
                  <input
                    name="unidad"
                    required
                    defaultValue={partidaEditando?.unidad || 'm3'}
                    placeholder="m3, m2, kg..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Cómputo / Cantidad *</label>
                  <input
                    name="cantidadPresupuestada"
                    type="number"
                    step="0.0001"
                    required
                    defaultValue={partidaEditando?.cantidadPresupuestada ?? ''}
                    placeholder="25.00"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">P.U. (Bs.) *</label>
                  <input
                    name="precioUnitario"
                    type="number"
                    step="0.01"
                    required
                    defaultValue={partidaEditando?.precioUnitario ?? ''}
                    placeholder="120.50"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Rendimiento Diario Estimado</label>
                <input
                  name="rendimientoDiario"
                  type="number"
                  step="0.01"
                  defaultValue={partidaEditando?.rendimientoDiario ?? ''}
                  placeholder="10.00"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalPartidaAbierto(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-lg shadow-amber-500/10"
                >
                  Guardar Partida
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CREAR VALUACIÓN */}
      {modalValuacionAbierto && proyectoActivo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101726] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">Nueva Valuación de Obra</h3>
              <button
                onClick={() => setModalValuacionAbierto(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <IconClose size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const fd = new FormData(form);

                const bruto = Number(fd.get('montoBruto')) || 0;
                const porcAnticipo = (Number(proyectoActivo.porcentajeAnticipo) || 20) / 100;
                const porcRetGarantia = (Number(proyectoActivo.porcentajeRetencionGarantia) || 10) / 100;
                const porcRetLab = 0.05;

                const amort = bruto * porcAnticipo;
                const retFiel = bruto * porcRetGarantia;
                const retLab = bruto * porcRetLab;
                const subtotal = bruto - amort - retFiel - retLab;
                const iva = subtotal * 0.16;
                const neto = subtotal + iva;

                const valData: ValuacionConstruccionApi = {
                  proyectoId: proyectoActivo.id!,
                  numeroValuacion: Number(fd.get('numeroValuacion')) || valuaciones.length + 1,
                  periodoDesde: fd.get('periodoDesde') as string,
                  periodoHasta: fd.get('periodoHasta') as string,
                  fechaEmision: fd.get('fechaEmision') as string,
                  montoBruto: bruto,
                  amortizacionAnticipo: amort,
                  retencionFielCumplimiento: retFiel,
                  retencionLaboral: retLab,
                  montoSubtotal: subtotal,
                  montoIva: iva,
                  montoNetoACobrar: neto,
                  estado: 'BORRADOR',
                  observaciones: (fd.get('observaciones') as string).trim(),
                };

                try {
                  const ik = generarIdempotencyKey();
                  await crearValuacionConstruccionApi(proyectoActivo.id!, valData, ik);
                  notificarExito('Valuación registrada con éxito');
                  setModalValuacionAbierto(false);
                  recargarSubrecursosProyecto(proyectoActivo.id!);
                } catch (err: any) {
                  alert(err.message || 'Error registrando valuación');
                }
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">N° Valuación *</label>
                  <input
                    name="numeroValuacion"
                    type="number"
                    required
                    defaultValue={valuaciones.length + 1}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Monto Bruto Ejecutado (Bs.) *</label>
                  <input
                    name="montoBruto"
                    type="number"
                    step="0.01"
                    required
                    placeholder="15000.00"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Período Desde *</label>
                  <input
                    name="periodoDesde"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Período Hasta *</label>
                  <input
                    name="periodoHasta"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Fecha Emisión *</label>
                <input
                  name="fechaEmision"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Observaciones</label>
                <textarea
                  name="observaciones"
                  rows={2}
                  placeholder="Corte de obra quincenal correspondiente a fundaciones..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalValuacionAbierto(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-lg shadow-amber-500/10"
                >
                  Registrar Valuación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: REGISTRAR INSUMO */}
      {modalInsumoAbierto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101726] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">Nuevo Insumo de Construcción</h3>
              <button
                onClick={() => setModalInsumoAbierto(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <IconClose size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const fd = new FormData(form);

                const data: InsumoConstruccionApi = {
                  codigo: (fd.get('codigo') as string).trim(),
                  nombre: (fd.get('nombre') as string).trim(),
                  tipo: fd.get('tipo') as string,
                  unidad: (fd.get('unidad') as string).trim(),
                  costoUnitario: Number(fd.get('costoUnitario')) || 0,
                  stockActual: Number(fd.get('stockActual')) || 0,
                  stockMinimo: Number(fd.get('stockMinimo')) || 0,
                  proveedor: (fd.get('proveedor') as string).trim(),
                };

                try {
                  await crearInsumoConstruccionApi(data);
                  notificarExito('Insumo registrado');
                  setModalInsumoAbierto(false);
                  recargarProyectosEInsumos();
                } catch (err: any) {
                  alert(err.message || 'Error guardando insumo');
                }
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Código *</label>
                  <input
                    name="codigo"
                    required
                    placeholder="MAT-CEM-01"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Tipo *</label>
                  <select
                    name="tipo"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  >
                    <option value="MATERIAL">MATERIAL</option>
                    <option value="EQUIPO">EQUIPO</option>
                    <option value="MANO_OBRA">MANO DE OBRA</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Nombre del Insumo *</label>
                <input
                  name="nombre"
                  required
                  placeholder="Cemento Portland Tipo I (Saco 42.5 kg)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Unidad *</label>
                  <input
                    name="unidad"
                    required
                    placeholder="saco, kg, m3"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Stock Inicial *</label>
                  <input
                    name="stockActual"
                    type="number"
                    step="0.01"
                    required
                    placeholder="100.00"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Stock Mínimo</label>
                  <input
                    name="stockMinimo"
                    type="number"
                    step="0.01"
                    defaultValue="10.00"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Costo Unitario (Bs.)</label>
                  <input
                    name="costoUnitario"
                    type="number"
                    step="0.01"
                    placeholder="250.00"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Proveedor</label>
                  <input
                    name="proveedor"
                    placeholder="Cemex / Distribuidora"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalInsumoAbierto(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-lg shadow-amber-500/10"
                >
                  Guardar Insumo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: DESCONTAR CONSUMO (CON IDEMPOTENCIA REAL) */}
      {modalConsumoAbierto && insumoConsumo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101726] border border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-white">Descontar Consumo en Obra</h3>
                <p className="text-[11px] text-amber-400 font-mono mt-0.5">{insumoConsumo.nombre}</p>
              </div>
              <button
                onClick={() => setModalConsumoAbierto(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <IconClose size={18} />
              </button>
            </div>

            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Stock Disponible:</span>
                <span className="font-bold font-mono text-emerald-400">
                  {formatVE(insumoConsumo.stockActual)} {insumoConsumo.unidad}
                </span>
              </div>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const fd = new FormData(form);
                const cant = Number(fd.get('cantidad'));

                if (!cant || cant <= 0) {
                  alert('La cantidad a consumir debe ser mayor a 0');
                  return;
                }
                if (cant > (Number(insumoConsumo.stockActual) || 0)) {
                  alert('La cantidad supera el stock disponible');
                  return;
                }

                try {
                  const ik = generarIdempotencyKey();
                  await registrarConsumoInsumoConstruccionApi(insumoConsumo.id!, cant, ik);
                  notificarExito(`Se consumieron ${formatVE(cant)} ${insumoConsumo.unidad} con éxito`);
                  setModalConsumoAbierto(false);
                  recargarProyectosEInsumos();
                } catch (err: any) {
                  alert(err.message || 'Error procesando consumo');
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">
                  Cantidad a Descontar ({insumoConsumo.unidad}) *
                </label>
                <input
                  name="cantidad"
                  type="number"
                  step="0.01"
                  required
                  placeholder="10.00"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalConsumoAbierto(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-lg shadow-amber-500/10"
                >
                  Confirmar Descuento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: REGISTRAR DESPACHO / GUÍA */}
      {modalDespachoAbierto && proyectoActivo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101726] border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">Registrar Guía de Despacho</h3>
              <button
                onClick={() => setModalDespachoAbierto(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <IconClose size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const fd = new FormData(form);

                const data: DespachoConstruccionApi = {
                  proyectoId: proyectoActivo.id!,
                  insumoId: fd.get('insumoId') ? Number(fd.get('insumoId')) : undefined,
                  guiaNumero: (fd.get('guiaNumero') as string).trim(),
                  tipoMaterial: fd.get('tipoMaterial') as string,
                  origen: (fd.get('origen') as string).trim(),
                  destinoFrente: (fd.get('destinoFrente') as string).trim(),
                  unidadTransporte: (fd.get('unidadTransporte') as string).trim(),
                  chofer: (fd.get('chofer') as string).trim(),
                  estado: (fd.get('estado') as string) || 'EN_TRANSITO',
                  cantidad: Number(fd.get('cantidad')) || 0,
                  unidadMedida: (fd.get('unidadMedida') as string).trim() || 'm3',
                  pesoBrutoKg: fd.get('pesoBrutoKg') ? Number(fd.get('pesoBrutoKg')) : undefined,
                  pesoTaraKg: fd.get('pesoTaraKg') ? Number(fd.get('pesoTaraKg')) : undefined,
                  pesoNetoKg: fd.get('pesoNetoKg') ? Number(fd.get('pesoNetoKg')) : undefined,
                  slumpConoPulgadas: fd.get('slumpConoPulgadas') ? Number(fd.get('slumpConoPulgadas')) : undefined,
                  observaciones: (fd.get('observaciones') as string).trim(),
                };

                try {
                  const ik = generarIdempotencyKey();
                  await crearDespachoConstruccionApi(proyectoActivo.id!, data, ik);
                  notificarExito('Guía de despacho registrada exitosamente');
                  setModalDespachoAbierto(false);
                  recargarSubrecursosProyecto(proyectoActivo.id!);
                } catch (err: any) {
                  alert(err.message || 'Error guardando guía de despacho');
                }
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">N° Guía / Remisión *</label>
                  <input
                    name="guiaNumero"
                    required
                    placeholder="GUIA-MIX-2026-001"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Tipo de Material *</label>
                  <select
                    name="tipoMaterial"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  >
                    <option value="CONCRETO_PREMEZCLADO">CONCRETO PREMEZCLADO</option>
                    <option value="ACERO_CABILLAS">ACERO / CABILLAS</option>
                    <option value="AGREGADOS_CANTERA">AGREGADOS DE CANTERA</option>
                    <option value="CEMENTO_GRANEL">CEMENTO A GRANEL</option>
                    <option value="OTROS">OTROS MATERIALES</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Origen / Proveedor *</label>
                  <input
                    name="origen"
                    required
                    placeholder="Planta Mezcladora Central"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Destino / Frente de Obra *</label>
                  <input
                    name="destinoFrente"
                    required
                    placeholder="Losa Nivel +3.50"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Unidad de Transporte</label>
                  <input
                    name="unidadTransporte"
                    placeholder="Mixer Mack #12 (Placa A92BJ2K)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Chofer</label>
                  <input
                    name="chofer"
                    placeholder="Carlos Benítez"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Cantidad *</label>
                  <input
                    name="cantidad"
                    type="number"
                    step="0.01"
                    required
                    placeholder="8.00"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Unidad *</label>
                  <input
                    name="unidadMedida"
                    required
                    defaultValue="m3"
                    placeholder="m3, ton, kg"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Asentamiento (Slump)</label>
                  <input
                    name="slumpConoPulgadas"
                    type="number"
                    step="0.1"
                    placeholder="5.5 (pulgadas)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Peso Bruto (kg)</label>
                  <input
                    name="pesoBrutoKg"
                    type="number"
                    step="0.01"
                    placeholder="38000"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Peso Tara (kg)</label>
                  <input
                    name="pesoTaraKg"
                    type="number"
                    step="0.01"
                    placeholder="13000"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Peso Neto (kg)</label>
                  <input
                    name="pesoNetoKg"
                    type="number"
                    step="0.01"
                    placeholder="25000"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Asociar con Insumo (Opcional)</label>
                  <select
                    name="insumoId"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  >
                    <option value="">(Ninguno)</option>
                    {insumos.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.codigo} - {i.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Estado Inicial</label>
                  <select
                    name="estado"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  >
                    <option value="EN_TRANSITO">EN TRANSITO</option>
                    <option value="EN_BASCULA">EN BASCULA</option>
                    <option value="DESCARGANDO">DESCARGANDO</option>
                    <option value="RECIBIDO">RECIBIDO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Observaciones</label>
                <textarea
                  name="observaciones"
                  rows={2}
                  placeholder="Muestra tomada para ensayo de compresión cilíndrica a 7 y 28 días..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalDespachoAbierto(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-lg shadow-amber-500/10"
                >
                  Guardar Guía
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 8: REGISTRAR ASIENTO EN BITÁCORA */}
      {modalBitacoraAbierto && proyectoActivo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101726] border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">Nuevo Asiento en Libro Diario</h3>
              <button
                onClick={() => setModalBitacoraAbierto(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <IconClose size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const fd = new FormData(form);

                const data: BitacoraConstruccionApi = {
                  proyectoId: proyectoActivo.id!,
                  fecha: fd.get('fecha') as string,
                  clima: fd.get('clima') as string,
                  personalActivo: Number(fd.get('personalActivo')) || 0,
                  actividadesEjecutadas: (fd.get('actividadesEjecutadas') as string).trim(),
                  observacionesEIncidentes: (fd.get('observacionesEIncidentes') as string).trim(),
                  elaboradoPor: (fd.get('elaboradoPor') as string).trim(),
                };

                try {
                  const ik = generarIdempotencyKey();
                  await registrarBitacoraConstruccionApi(proyectoActivo.id!, data, ik);
                  notificarExito('Asiento diario registrado');
                  setModalBitacoraAbierto(false);
                  recargarSubrecursosProyecto(proyectoActivo.id!);
                } catch (err: any) {
                  alert(err.message || 'Error guardando en bitácora');
                }
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Fecha *</label>
                  <input
                    name="fecha"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Condición Clima *</label>
                  <select
                    name="clima"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  >
                    <option value="SOLEADO">SOLEADO</option>
                    <option value="NUBLADO">NUBLADO</option>
                    <option value="LLUVIOSO">LLUVIOSO</option>
                    <option value="LLUVIA_FUERTE">LLUVIA FUERTE</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Operarios en Sitio</label>
                  <input
                    name="personalActivo"
                    type="number"
                    defaultValue="10"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">
                  Actividades Ejecutadas en la Jornada *
                </label>
                <textarea
                  name="actividadesEjecutadas"
                  required
                  rows={3}
                  placeholder="Se realizó el encofrado y armado de acero en zapatas Z-1 a Z-4..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">
                  Observaciones, Incidentes o Novedades
                </label>
                <textarea
                  name="observacionesEIncidentes"
                  rows={2}
                  placeholder="Retraso de 40 min por lluvia al mediodía..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Elaborado Por</label>
                <input
                  name="elaboradoPor"
                  defaultValue={proyectoActivo.ingenieroResidente || user?.nombre || ''}
                  placeholder="Ing. Residente"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalBitacoraAbierto(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-lg shadow-amber-500/10"
                >
                  Guardar en Bitácora
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
