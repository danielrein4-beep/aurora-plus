import { avisar } from "../avisos";
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
  AuroraGradientDef,
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
  type CuadrillaConstruccionApi,
  listarCuadrillasConstruccionApi,
  crearCuadrillaConstruccionApi,
  cambiarEstadoCuadrillaConstruccionApi,
} from '../api';

interface NavItemConstruccion {
  id: TabConstruccion;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; stroke?: number }>;
  count?: number;
  badge?: string;
}

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
  | 'cuadrillas';

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
  const [cuadrillas, setCuadrillas] = useState<CuadrillaConstruccionApi[]>([]);
  const [cargandoCuadrillas, setCargandoCuadrillas] = useState(false);
  const [filtroEspecialidadCuadrilla, setFiltroEspecialidadCuadrilla] = useState('TODAS');
  const [modalCuadrillaAbierto, setModalCuadrillaAbierto] = useState(false);
  const [guardandoCuadrilla, setGuardandoCuadrilla] = useState(false);
  const [formCuadrilla, setFormCuadrilla] = useState({
    codigo: '',
    nombre: '',
    frenteTrabajo: '',
    capatazResponsable: '',
    cantidadOficiales: 2,
    cantidadAyudantes: 4,
    especialidad: 'CONCRETO_Y_ENCOFRADO',
    partidaId: '',
    fechaInicio: new Date().toISOString().split('T')[0],
    observaciones: ''
  });

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
      const [caps, parts, vals, desps, bit, cuads, maqs, rsg, docsBim, rfisList] = await Promise.all([
        listarCapitulosConstruccionApi(proyId),
        listarPartidasConstruccionApi(proyId),
        listarValuacionesConstruccionApi(proyId),
        listarDespachosConstruccionApi(proyId),
        listarBitacoraConstruccionApi(proyId),
        listarCuadrillasConstruccionApi(proyId),
        listarMaquinariasConstruccionApi(proyId),
        listarRiesgosConstruccionApi(proyId),
        listarDocumentosBimApi(proyId),
        listarRfisConstruccionApi(proyId),
      ]);
      setCapitulos(caps);
      setPartidas(parts);
      setValuaciones(vals);
      setDespachos(desps);
      setBitacora(bit);
      setCuadrillas(cuads);
      setMaquinarias(maqs);
      setRiesgos(rsg);
      setDocumentosBim(docsBim);
      setRfis(rfisList);
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
      setCuadrillas([]);
      setMaquinarias([]);
      setRiesgos([]);
      setDocumentosBim([]);
      setRfis([]);
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-900">
      {/* Sin esto los íconos con trazo en degradado (IconChart, IconBox...) quedaban invisibles */}
      <AuroraGradientDef />
      {/* BARRA SUPERIOR INSTITUCIONAL */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-30 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 shadow-lg shadow-amber-500/5">
            <IconConstruction size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base tracking-tight text-slate-900 leading-none">
                Control de Obras Civiles & Inspección Pro
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 border border-amber-500/25">
                Norma COVENIN
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Gestión Contractual, Partidas Presupuestarias, Valuaciones y Logística
            </p>
          </div>
        </div>

        {/* SELECTOR DE PROYECTO ACTIVO */}
        <div className="flex items-center gap-2">
          {proyectos.length > 0 && (
            <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3 py-1.5 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-500">Obra:</span>
              <select
                value={proyectoSeleccionadoId ?? ''}
                onChange={(e) => setProyectoSeleccionadoId(Number(e.target.value))}
                className="bg-transparent text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer max-w-[220px] truncate"
              >
                {proyectos.map((p) => (
                  <option key={p.id} value={p.id} className="bg-white text-slate-900">
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
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <IconRefresh size={16} />
          </button>

          {onSalir && (
            <button
              onClick={onSalir}
              className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-medium transition cursor-pointer"
            >
              Volver
            </button>
          )}
        </div>
      </header>

      {/* MENSAJES DE ESTADO */}
      {mensajeExito && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/25 text-emerald-700 px-4 py-2.5 text-xs font-medium flex items-center gap-2">
          <IconCheckCircle size={16} className="text-emerald-600 shrink-0" />
          <span>{mensajeExito}</span>
        </div>
      )}

      {errorGlobal && (
        <div className="bg-red-500/10 border-b border-red-500/25 text-red-700 px-4 py-2.5 text-xs font-medium flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <IconWarning size={16} className="text-red-600 shrink-0" />
            <span>{errorGlobal}</span>
          </div>
          <button
            onClick={() => setErrorGlobal(null)}
            className="text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            <IconClose size={14} />
          </button>
        </div>
      )}

      {/* Menú lateral en escritorio, como el resto de las verticales; en teléfono queda como
          una barra que se desliza de lado. Antes eran 11 pestañas horizontales. */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
      <nav className="border-b lg:border-b-0 lg:border-r border-slate-200 bg-white px-4 lg:px-3 lg:py-4 flex lg:flex-col items-center lg:items-stretch gap-1 overflow-x-auto lg:overflow-y-auto lg:w-60 flex-shrink-0 lg:sticky lg:top-[69px] lg:h-[calc(100vh-69px)]">
        {([
          { id: 'resumen', label: 'Vista General', icon: IconChart },
          { id: 'proyectos', label: 'Proyectos & Contratos', icon: IconConstruction, count: proyectos.length },
          { id: 'presupuesto', label: 'Capítulos & Partidas', icon: IconFileText, count: partidas.length },
          { id: 'valuaciones', label: 'Valuaciones de Obra', icon: IconCheckCircle, count: valuaciones.length },
          { id: 'insumos', label: 'Insumos & Stock', icon: IconBox, count: insumos.length },
          { id: 'logistica', label: 'Logística & Despachos', icon: IconTruck, count: despachos.length },
          { id: 'maquinaria', label: 'Maquinaria & Equipos', icon: IconWrench, count: maquinarias.length },
          { id: 'riesgos', label: 'Riesgos y Seguridad', icon: IconWarning, count: riesgos.length },
          { id: 'bim', label: 'Planos y Consultas', icon: IconFileText, count: documentosBim.length + rfis.length },
          { id: 'bitacora', label: 'Bitácora de Obra', icon: IconCalendar, count: bitacora.length },
          { id: 'cuadrillas', label: 'Cuadrillas & Frentes', icon: IconUsers, count: cuadrillas.length },
        ] as NavItemConstruccion[]).map((item) => {
          const Icon = item.icon;
          const activa = tabActiva === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTabActiva(item.id)}
              className={
                'flex items-center gap-2 px-3.5 py-3 lg:py-2.5 lg:rounded-md text-xs font-semibold border-b-2 lg:border-b-0 lg:border-l-2 transition-colors whitespace-nowrap cursor-pointer ' +
                (activa
                  ? 'border-amber-400 text-amber-700 bg-amber-500/5'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300')
              }
            >
              <Icon size={16} />
              <span>{item.label}</span>
              {typeof item.count === 'number' && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 font-mono">
                  {item.count}
                </span>
              )}
              {item.badge && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 border border-sky-500/20 font-bold uppercase">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 min-w-0 p-4 md:p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* VISTA 1: RESUMEN EJECUTIVO */}
        {tabActiva === 'resumen' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 p-4 rounded-2xl">
                <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
                  <span>Presupuesto Contratado Total</span>
                  <IconConstruction size={18} className="text-amber-600" />
                </div>
                <div className="text-xl font-bold font-mono text-slate-900">
                  Bs. {formatVE(resumenCalculos.totalPresupuesto)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  En {proyectos.length} proyecto(s) registrados
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-4 rounded-2xl">
                <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
                  <span>Valuaciones Aprobadas / Cobradas</span>
                  <IconCheckCircle size={18} className="text-emerald-600" />
                </div>
                <div className="text-xl font-bold font-mono text-emerald-700">
                  Bs. {formatVE(resumenCalculos.totalValuacionesAprobadas)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Avance financiero auditado
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-4 rounded-2xl">
                <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
                  <span>Partidas de Obra Activas</span>
                  <IconFileText size={18} className="text-sky-600" />
                </div>
                <div className="text-xl font-bold font-mono text-slate-900">
                  {resumenCalculos.totalPartidas}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {resumenCalculos.partidasEjecutadas} con ejecución física reportada
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-4 rounded-2xl">
                <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
                  <span>Logística en Tránsito</span>
                  <IconTruck size={18} className="text-amber-600" />
                </div>
                <div className="text-xl font-bold font-mono text-slate-900">
                  {resumenCalculos.despachosEnTransito}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  De {resumenCalculos.despachosTotales} despachos registrados
                </div>
              </div>
            </div>

            {/* DETALLE DEL PROYECTO SELECCIONADO */}
            {proyectoActivo ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-amber-600 border border-slate-300">
                        {proyectoActivo.codigo}
                      </span>
                      <h2 className="text-base font-bold text-slate-900">{proyectoActivo.nombre}</h2>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 font-semibold">
                        {proyectoActivo.estado}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Cliente: <strong className="text-slate-800">{proyectoActivo.cliente}</strong> &bull; Ubicación: {proyectoActivo.ubicacion || 'No especificada'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Presupuesto del Contrato</div>
                    <div className="text-lg font-bold font-mono text-slate-900">
                      Bs. {formatVE(proyectoActivo.montoPresupuestoTotal)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-slate-500 text-[11px]">Ingeniero Residente</div>
                    <div className="font-semibold text-slate-800 mt-0.5">
                      {proyectoActivo.ingenieroResidente || 'Sin asignar'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      CIV: {proyectoActivo.civResidente || 'N/A'}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-slate-500 text-[11px]">Anticipo Contractual</div>
                    <div className="font-semibold text-slate-800 mt-0.5 font-mono">
                      {formatVE(proyectoActivo.porcentajeAnticipo)}%
                    </div>
                    <div className="text-[10px] text-slate-500">Amortizable en valuaciones</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-slate-500 text-[11px]">Retención de Garantía</div>
                    <div className="font-semibold text-slate-800 mt-0.5 font-mono">
                      {formatVE(proyectoActivo.porcentajeRetencionGarantia)}%
                    </div>
                    <div className="text-[10px] text-slate-500">Fiel cumplimiento</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-slate-500 text-[11px]">Período de Obra</div>
                    <div className="font-semibold text-slate-800 mt-0.5 font-mono">
                      {proyectoActivo.fechaInicio || 'Inicio s/d'}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Fin est: {proyectoActivo.fechaFinEstimada || 's/d'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center">
                <IconConstruction size={36} className="text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-700">No hay proyectos registrados</h3>
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
                <h2 className="text-base font-bold text-slate-900">Proyectos y Obras Civiles</h2>
                <p className="text-xs text-slate-500">
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
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-xs">
                Todavía no tienes proyectos registrados.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {proyectos.map((proy) => (
                  <div
                    key={proy.id}
                    className={
                      'bg-white border rounded-2xl p-4 space-y-3 transition-all ' +
                      (proy.id === proyectoSeleccionadoId
                        ? 'border-amber-500/50 shadow-lg shadow-amber-500/5'
                        : 'border-slate-200 hover:border-slate-300')
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-bold text-amber-600 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                            {proy.codigo}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {proy.estado}
                          </span>
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 mt-1.5">{proy.nombre}</h3>
                        <p className="text-xs text-slate-500">Cliente: {proy.cliente}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-500 uppercase font-semibold">Presupuesto</div>
                        <div className="font-mono text-sm font-bold text-slate-900">
                          Bs. {formatVE(proy.montoPresupuestoTotal)}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs grid grid-cols-2 gap-2 text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Residente</span>
                        <span className="text-slate-800 font-medium truncate block">
                          {proy.ingenieroResidente || 'No asignado'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Carnet CIV</span>
                        <span className="text-slate-800 font-mono block">
                          {proy.civResidente || 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                      <button
                        onClick={() => setProyectoSeleccionadoId(proy.id!)}
                        className={
                          'px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ' +
                          (proy.id === proyectoSeleccionadoId
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700')
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
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer"
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
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-600 cursor-pointer"
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
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-xs">
                Selecciona o crea un proyecto para ver y gestionar sus partidas.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Presupuesto y Partidas COVENIN</h2>
                    <p className="text-xs text-slate-500">
                      Obra activa: <strong className="text-amber-700">{proyectoActivo.nombre}</strong> &bull; {capitulos.length} capítulo(s) &bull; {partidas.length} partida(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setModalCapituloAbierto(true)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition cursor-pointer border border-slate-300"
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
                  <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center">
                    <IconFileText size={36} className="text-slate-600 mx-auto mb-3" />
                    <h3 className="text-sm font-semibold text-slate-700">Sin partidas presupuestadas</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Agrega partidas con su código COVENIN, cómputo métrico y precio unitario para iniciar el presupuesto.
                    </p>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-white text-slate-500 font-semibold border-b border-slate-200">
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
                        <tbody className="divide-y divide-slate-200 font-sans">
                          {partidas.map((part) => {
                            const cant = Number(part.cantidadPresupuestada) || 0;
                            const pu = Number(part.precioUnitario) || 0;
                            const total = cant * pu;
                            const ejec = Number(part.cantidadEjecutadaAcumulada) || 0;

                            return (
                              <tr key={part.id} className="hover:bg-slate-50 transition-colors">
                                <td className="py-3 px-3 font-mono font-bold text-amber-600 whitespace-nowrap">
                                  {part.codigoCovenin || part.codigoPartida}
                                </td>
                                <td className="py-3 px-3 text-slate-800 font-medium max-w-xs">
                                  {part.descripcion}
                                </td>
                                <td className="py-3 px-2 text-center font-mono text-slate-500">
                                  {part.unidad}
                                </td>
                                <td className="py-3 px-3 text-right font-mono text-slate-900">
                                  {formatVE(cant)}
                                </td>
                                <td className="py-3 px-3 text-right font-mono text-slate-700">
                                  {formatVE(pu)}
                                </td>
                                <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                                  {formatVE(total)}
                                </td>
                                <td className="py-3 px-3 text-right font-mono text-slate-500">
                                  {formatVE(ejec)}
                                </td>
                                <td className="py-3 px-2 text-center whitespace-nowrap">
                                  <button
                                    onClick={() => {
                                      setPartidaEditando(part);
                                      setModalPartidaAbierto(true);
                                    }}
                                    className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-900 cursor-pointer mr-1"
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
                                    className="p-1.5 hover:bg-red-500/10 rounded text-slate-500 hover:text-red-600 cursor-pointer"
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
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-xs">
                Selecciona un proyecto para emitir y consultar valuaciones de obra.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Valuaciones de Obra Ejecutada</h2>
                    <p className="text-xs text-slate-500">
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
                  <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center">
                    <IconCheckCircle size={36} className="text-slate-600 mx-auto mb-3" />
                    <h3 className="text-sm font-semibold text-slate-700">No hay valuaciones registradas</h3>
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
                          className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-2.5">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                                  Valuación N° {val.numeroValuacion}
                                </span>
                                <span
                                  className={
                                    'text-[10px] font-bold uppercase px-2 py-0.5 rounded ' +
                                    (val.estado === 'APROBADA' || val.estado === 'COBRADA'
                                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                      : val.estado === 'RECHAZADA'
                                      ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                                      : 'bg-amber-500/10 text-amber-700 border border-amber-500/20')
                                  }
                                >
                                  {val.estado}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-1 font-mono">
                                Período: {val.periodoDesde} &rarr; {val.periodoHasta}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-500 uppercase font-semibold">Neto a Cobrar</span>
                              <div className="font-mono text-base font-bold text-emerald-600">
                                Bs. {formatVE(neto)}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-mono">
                            <div>
                              <span className="text-slate-500 font-sans block">Monto Bruto:</span>
                              <span className="text-slate-800">Bs. {formatVE(bruto)}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 font-sans block">Amort. Anticipo:</span>
                              <span className="text-amber-700">- Bs. {formatVE(amort)}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 font-sans block">Ret. Garantía:</span>
                              <span className="text-slate-700">- Bs. {formatVE(retFiel)}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 font-sans block">Ret. Laboral:</span>
                              <span className="text-slate-700">- Bs. {formatVE(retLab)}</span>
                            </div>
                          </div>

                          {val.observaciones && (
                            <p className="text-xs text-slate-500 italic">
                              &ldquo;{val.observaciones}&rdquo;
                            </p>
                          )}

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
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
                                className="px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 border border-sky-500/30 text-xs font-semibold cursor-pointer"
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
                                className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 border border-emerald-500/30 text-xs font-semibold cursor-pointer"
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
                <h2 className="text-base font-bold text-slate-900">Insumos, Materiales y Equipos</h2>
                <p className="text-xs text-slate-500">
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
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-xs">
                Todavía no tienes insumos registrados.
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white text-slate-500 font-semibold border-b border-slate-200">
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
                    <tbody className="divide-y divide-slate-200 font-sans">
                      {insumos.map((ins) => {
                        const actual = Number(ins.stockActual) || 0;
                        const min = Number(ins.stockMinimo) || 0;
                        const bajoStock = actual <= min;

                        return (
                          <tr key={ins.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-3 font-mono font-bold text-amber-600 whitespace-nowrap">
                              {ins.codigo}
                            </td>
                            <td className="py-3 px-3 text-slate-800 font-medium">
                              {ins.nombre}
                              {ins.proveedor && (
                                <span className="text-[10px] text-slate-500 block font-normal">
                                  Prov: {ins.proveedor}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                                {ins.tipo}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-center font-mono text-slate-500">
                              {ins.unidad}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-slate-700">
                              {formatVE(ins.costoUnitario)}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold">
                              <span className={bajoStock ? 'text-red-600' : 'text-emerald-600'}>
                                {formatVE(actual)}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-slate-500">
                              {formatVE(min)}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <button
                                onClick={() => {
                                  setInsumoConsumo(ins);
                                  setModalConsumoAbierto(true);
                                }}
                                className="px-2.5 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 border border-amber-500/30 text-[11px] font-semibold transition cursor-pointer"
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
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-xs">
                Selecciona un proyecto para gestionar sus guías de despacho y recepción en obra.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Logística & Despachos de Suministros</h2>
                    <p className="text-xs text-slate-500">
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
                  <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center">
                    <IconTruck size={36} className="text-slate-600 mx-auto mb-3" />
                    <h3 className="text-sm font-semibold text-slate-700">Sin despachos registrados en esta obra</h3>
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
                          className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-2.5">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                                  {desp.guiaNumero}
                                </span>
                                <span
                                  className={
                                    'text-[10px] font-bold uppercase px-2 py-0.5 rounded ' +
                                    (desp.estado === 'RECIBIDO'
                                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                      : desp.estado === 'RECHAZADO'
                                      ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                                      : desp.estado === 'DESCARGANDO'
                                      ? 'bg-sky-500/10 text-sky-600 border border-sky-500/20'
                                      : 'bg-amber-500/10 text-amber-700 border border-amber-500/20')
                                  }
                                >
                                  {desp.estado}
                                </span>
                              </div>
                              <h3 className="text-sm font-bold text-slate-900 mt-1">
                                {desp.tipoMaterial.replace(/_/g, ' ')}
                              </h3>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-500 uppercase font-semibold">Cantidad</span>
                              <div className="font-mono text-base font-bold text-slate-900">
                                {formatVE(desp.cantidad)} {desp.unidadMedida}
                              </div>
                            </div>
                          </div>

                          <div className="text-xs space-y-1.5 text-slate-700">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Ruta:</span>
                              <span className="font-medium text-slate-800">
                                {desp.origen} &rarr; {desp.destinoFrente}
                              </span>
                            </div>
                            {desp.unidadTransporte && (
                              <div className="flex justify-between">
                                <span className="text-slate-500">Unidad de Transporte:</span>
                                <span className="font-mono text-slate-800">{desp.unidadTransporte}</span>
                              </div>
                            )}
                            {desp.chofer && (
                              <div className="flex justify-between">
                                <span className="text-slate-500">Conductor:</span>
                                <span className="text-slate-800">{desp.chofer}</span>
                              </div>
                            )}
                          </div>

                          {(desp.pesoNetoKg != null || desp.slumpConoPulgadas != null) && (
                            <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-mono">
                              {desp.pesoNetoKg != null && (
                                <div>
                                  <span className="text-slate-500 font-sans block">Peso Neto Báscula:</span>
                                  <span className="text-slate-800">{formatVE(desp.pesoNetoKg)} kg</span>
                                </div>
                              )}
                              {desp.slumpConoPulgadas != null && (
                                <div>
                                  <span className="text-slate-500 font-sans block">Ensayo Asentamiento:</span>
                                  <span className="text-amber-700">{formatVE(desp.slumpConoPulgadas)}&quot; (Pulgadas)</span>
                                </div>
                              )}
                            </div>
                          )}

                          {desp.observaciones && (
                            <p className="text-xs text-slate-500 italic">
                              &ldquo;{desp.observaciones}&rdquo;
                            </p>
                          )}

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
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
                                className="px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 border border-sky-500/30 text-xs font-semibold cursor-pointer"
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
                                className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 border border-amber-500/30 text-xs font-semibold cursor-pointer"
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
                                className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 border border-emerald-500/30 text-xs font-semibold cursor-pointer"
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
        
        {/* VISTA 7: MAQUINARIA Y EQUIPOS DE OBRA */}
        {tabActiva === 'maquinaria' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shadow-lg shadow-amber-500/5">
                    <IconWrench size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-lg text-slate-900">Parque de Maquinaria & Equipos de Construcción</h2>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 border border-amber-500/25">
                        Horómetros & Mantenimiento
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Control operativo de equipos pesados, control de intervalos de servicio preventivo y costo horario
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setModalMaquinariaAbierto(true)}
                  disabled={!proyectoActivo}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  <IconWrench size={16} />
                  <span>+ Registrar Equipo / Máquina</span>
                </button>
              </div>

              {/* TARJETAS DE RESUMEN DE MAQUINARIA */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Equipos en Obra</div>
                  <div className="text-2xl font-black text-amber-600 mt-1">
                    {maquinarias.length}
                    <span className="text-xs font-normal text-slate-500 ml-1.5">unidades</span>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Operativos</div>
                  <div className="text-2xl font-black text-emerald-600 mt-1">
                    {maquinarias.filter((m) => m.estado === 'OPERATIVO').length}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">En Mantenimiento</div>
                  <div className="text-2xl font-black text-rose-600 mt-1">
                    {maquinarias.filter((m) => m.estado === 'EN_MANTENIMIENTO' || (Number(m.horometroActual) >= Number(m.horometroUltimoMantenimiento || 0) + Number(m.intervaloMantenimientoHoras || 250))).length}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Horas Acumuladas</div>
                  <div className="text-2xl font-black text-sky-600 mt-1">
                    {formatVE(maquinarias.reduce((acc, m) => acc + (Number(m.horometroActual) || 0), 0))}
                    <span className="text-xs font-normal text-slate-500 ml-1.5">hrs</span>
                  </div>
                </div>
              </div>
            </div>

            {/* FILTROS Y TABLA DE MAQUINARIA */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-x-auto text-xs">
                  <span className="text-slate-500 font-semibold px-2">Tipo de Equipo:</span>
                  {['TODOS', 'PESADA', 'TRANSPORTE', 'LIVIANA', 'ELEVACION', 'GENERACION'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setFiltroTipoMaq(t)}
                      className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                        filtroTipoMaq === t
                          ? 'bg-amber-500/20 text-amber-700 border border-amber-500/30'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white text-slate-500 uppercase tracking-wider border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="p-4">Código & Equipo</th>
                      <th className="p-4">Tipo & Marca / Modelo</th>
                      <th className="p-4">Placa / Serial</th>
                      <th className="p-4 text-right">Horómetro Actual</th>
                      <th className="p-4 text-right">Próx. Mantenimiento</th>
                      <th className="p-4">Operador Asignado</th>
                      <th className="p-4">Estado</th>
                      <th className="p-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {maquinarias
                      .filter((m) => filtroTipoMaq === 'TODOS' || m.tipo === filtroTipoMaq)
                      .map((maq) => {
                        const proxMant = Number(maq.horometroUltimoMantenimiento || 0) + Number(maq.intervaloMantenimientoHoras || 250);
                        const actual = Number(maq.horometroActual || 0);
                        const alertaMant = proxMant > 0 && actual >= proxMant - 25;
                        return (
                          <tr key={maq.id} className="hover:bg-slate-50 transition">
                            <td className="p-4">
                              <div className="font-bold text-slate-900 text-sm">{maq.codigo}</div>
                              <div className="text-slate-500 text-[11px]">{maq.nombre}</div>
                            </td>
                            <td className="p-4">
                              <span className="text-amber-700 font-medium bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                {maq.tipo}
                              </span>
                              <div className="text-slate-500 text-[11px] mt-1">{maq.marca} {maq.modelo}</div>
                            </td>
                            <td className="p-4 text-slate-700 font-mono text-[11px]">
                              {maq.placa || maq.serialChasis || 'S/N'}
                            </td>
                            <td className="p-4 text-right font-mono font-bold text-sky-600 text-sm">
                              {formatVE(maq.horometroActual)} hrs
                            </td>
                            <td className="p-4 text-right">
                              <span className={`font-mono font-semibold px-2 py-0.5 rounded text-[11px] ${
                                alertaMant
                                  ? 'bg-rose-500/20 text-rose-700 border border-rose-500/30 animate-pulse'
                                  : 'text-slate-700 bg-slate-100'
                              }`}>
                                {proxMant > 0 ? `${formatVE(proxMant)} hrs` : 'N/A'}
                              </span>
                            </td>
                            <td className="p-4 text-slate-700 font-medium">
                              {maq.operadorResponsable || <span className="text-slate-500 italic">Sin operador</span>}
                            </td>
                            <td className="p-4">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  maq.estado === 'OPERATIVO'
                                    ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30'
                                    : maq.estado === 'EN_MANTENIMIENTO'
                                    ? 'bg-rose-500/15 text-rose-700 border-rose-500/30'
                                    : 'bg-slate-200 text-slate-700 border-slate-300'
                                }`}
                              >
                                {maq.estado}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setModalHorometroTarget(maq);
                                    setNuevoHorometroInput(String(maq.horometroActual || 0));
                                    setNuevoOperadorInput(maq.operadorResponsable || '');
                                  }}
                                  title="Actualizar horómetro"
                                  className="px-2 py-1 rounded bg-sky-600/20 hover:bg-sky-600/40 text-sky-700 border border-sky-500/30 text-[11px] font-semibold cursor-pointer"
                                >
                                  Horómetro
                                </button>
                                <button
                                  onClick={async () => {
                                    setModalMantTarget(maq);
                                    setMostrarFormMant(false);
                                    setCargandoMantenimientos(true);
                                    try {
                                      const hist = await listarMantenimientosMaquinariaApi(maq.id!);
                                      setHistorialMantenimientos(hist);
                                    } catch (e: any) {
                                      setErrorGlobal(e.message);
                                    } finally {
                                      setCargandoMantenimientos(false);
                                    }
                                  }}
                                  title="Gestionar mantenimientos"
                                  className="px-2 py-1 rounded bg-amber-600/20 hover:bg-amber-600/40 text-amber-700 border border-amber-500/30 text-[11px] font-semibold cursor-pointer"
                                >
                                  Mantenimientos
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    {maquinarias.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500">
                          No hay maquinaria ni equipos registrados en esta obra. Haga clic en "+ Registrar Equipo / Máquina".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}


        {/* VISTA 8: MATRIZ DE RIESGOS Y SST / IPERC */}
        {tabActiva === 'riesgos' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 shadow-lg shadow-rose-500/5">
                    <IconWarning size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-lg text-slate-900">Matriz IPERC & Seguridad Laboral (SST)</h2>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/15 text-rose-700 border border-rose-500/25">
                        Norma COVENIN 2260 / 4004
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Identificación de Peligros, Evaluación de Riesgos y Medidas de Control Operativo en frentes de obra
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setModalRiesgoAbierto(true)}
                  disabled={!proyectoActivo}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-rose-600/20 cursor-pointer"
                >
                  <IconWarning size={16} />
                  <span>+ Evaluar Nuevo Riesgo SST</span>
                </button>
              </div>

              {/* TARJETAS DE RESUMEN DE RIESGOS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Riesgos Identificados</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {riesgos.length}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Riesgos Críticos (P×S ≥ 15)</div>
                  <div className="text-2xl font-black text-rose-600 mt-1">
                    {riesgos.filter((r) => r.nivelRiesgo === 'CRITICO').length}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">En Mitigación Activa</div>
                  <div className="text-2xl font-black text-amber-600 mt-1">
                    {riesgos.filter((r) => r.estado === 'EN_MITIGACION').length}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Controlados / Residuales</div>
                  <div className="text-2xl font-black text-emerald-600 mt-1">
                    {riesgos.filter((r) => r.estado === 'CONTROLADO' || r.estado === 'RESIDUAL_ACEPTABLE').length}
                  </div>
                </div>
              </div>
            </div>

            {/* TABLA MATRIZ IPERC */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-x-auto text-xs">
                  <span className="text-slate-500 font-semibold px-2">Severidad:</span>
                  {['TODOS', 'CRITICO', 'ALTO', 'MEDIO', 'BAJO'].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setFiltroNivelRiesgo(lvl)}
                      className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                        filtroNivelRiesgo === lvl
                          ? 'bg-rose-500/20 text-rose-700 border border-rose-500/30'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white text-slate-500 uppercase tracking-wider border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="p-4">Código & Frente</th>
                      <th className="p-4">Peligro Identificado</th>
                      <th className="p-4">Riesgo / Consecuencia</th>
                      <th className="p-4">Categoría</th>
                      <th className="p-4 text-center">P (1-5)</th>
                      <th className="p-4 text-center">S (1-5)</th>
                      <th className="p-4 text-center">P×S</th>
                      <th className="p-4">Nivel COVENIN</th>
                      <th className="p-4">Medidas de Control</th>
                      <th className="p-4">Estado</th>
                      <th className="p-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {riesgos
                      .filter((r) => filtroNivelRiesgo === 'TODOS' || r.nivelRiesgo === filtroNivelRiesgo)
                      .map((rsg) => (
                        <tr key={rsg.id} className="hover:bg-slate-50 transition">
                          <td className="p-4">
                            <div className="font-bold text-slate-900 text-sm">{rsg.codigo}</div>
                            <div className="text-slate-500 text-[11px]">{rsg.procesoFrente}</div>
                          </td>
                          <td className="p-4 font-semibold text-slate-800 max-w-[180px]">
                            {rsg.peligro}
                          </td>
                          <td className="p-4 text-slate-700 text-[11px] max-w-[200px]">
                            {rsg.riesgoConsecuencia}
                          </td>
                          <td className="p-4">
                            <span className="text-slate-700 font-medium bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                              {rsg.categoria}
                            </span>
                          </td>
                          <td className="p-4 text-center font-bold text-slate-700">{rsg.probabilidad}</td>
                          <td className="p-4 text-center font-bold text-slate-700">{rsg.severidad}</td>
                          <td className="p-4 text-center">
                            <span className="font-black text-sm text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 font-mono">
                              {rsg.probabilidad * rsg.severidad}
                            </span>
                          </td>
                          <td className="p-4">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                rsg.nivelRiesgo === 'CRITICO'
                                  ? 'bg-rose-500/20 text-rose-700 border-rose-500/40 animate-pulse'
                                  : rsg.nivelRiesgo === 'ALTO'
                                  ? 'bg-amber-500/20 text-amber-700 border-amber-500/30'
                                  : rsg.nivelRiesgo === 'MEDIO'
                                  ? 'bg-sky-500/20 text-sky-700 border-sky-500/30'
                                  : 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30'
                              }`}
                            >
                              {rsg.nivelRiesgo}
                            </span>
                          </td>
                          <td className="p-4 text-slate-700 text-[11px] max-w-[220px]">
                            {rsg.medidasControl}
                          </td>
                          <td className="p-4">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                rsg.estado === 'CONTROLADO' || rsg.estado === 'RESIDUAL_ACEPTABLE'
                                  ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30'
                                  : rsg.estado === 'EN_MITIGACION'
                                  ? 'bg-amber-500/15 text-amber-700 border-amber-500/30'
                                  : 'bg-rose-500/15 text-rose-700 border-rose-500/30'
                              }`}
                            >
                              {rsg.estado}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => {
                                setModalMitigarTarget(rsg);
                                setNuevoEstadoRiesgo(rsg.estado === 'IDENTIFICADO' ? 'EN_MITIGACION' : 'CONTROLADO');
                                setMedidasAdicionalesInput('');
                              }}
                              className="px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600/40 text-rose-700 border border-rose-500/30 text-[11px] font-semibold cursor-pointer"
                            >
                              Mitigar
                            </button>
                          </td>
                        </tr>
                      ))}
                    {riesgos.length === 0 && (
                      <tr>
                        <td colSpan={11} className="p-8 text-center text-slate-500">
                          No hay riesgos evaluados en la matriz IPERC. Haga clic en "+ Evaluar Nuevo Riesgo SST".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}


        {/* VISTA 9: GESTIÓN DOCUMENTAL BIM Y CONTROL DE RFIS */}
        {tabActiva === 'bim' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 shadow-lg shadow-sky-500/5">
                    <IconFileText size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-lg text-slate-900">Modelos BIM, Planos Técnicos & RFIs</h2>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-500/15 text-sky-700 border border-sky-500/25">
                        Gestión Técnica de Proyecto
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Control de planos (IFC, RVT, DWG, PDF) y solicitudes formales de información de obra (RFIs)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="bg-white border border-slate-200 p-1 rounded-xl flex items-center">
                    <button
                      onClick={() => setSubtabBim('modelos')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        subtabBim === 'modelos'
                          ? 'bg-sky-500 text-slate-950 shadow-md'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Planos & Modelos ({documentosBim.length})
                    </button>
                    <button
                      onClick={() => setSubtabBim('rfis')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        subtabBim === 'rfis'
                          ? 'bg-sky-500 text-slate-950 shadow-md'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Control de RFIs ({rfis.length})
                    </button>
                  </div>

                  {subtabBim === 'modelos' ? (
                    <button
                      onClick={() => setModalBimAbierto(true)}
                      disabled={!proyectoActivo}
                      className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-sky-500/20 cursor-pointer"
                    >
                      <IconFileText size={16} />
                      <span>+ Subir Modelo / Plano</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setModalRfiAbierto(true)}
                      disabled={!proyectoActivo}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer"
                    >
                      <IconFileText size={16} />
                      <span>+ Emitir Nuevo RFI</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* SUBTAB: MODELOS Y PLANOS */}
            {subtabBim === 'modelos' && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 overflow-x-auto text-xs">
                    <span className="text-slate-500 font-semibold px-2">Disciplina:</span>
                    {['TODAS', 'ARQUITECTURA', 'ESTRUCTURAS', 'INSTALACIONES_SANITARIAS', 'INSTALACIONES_ELECTRICAS', 'COORDINACION_GENERAL'].map((d) => (
                      <button
                        key={d}
                        onClick={() => setFiltroDisciplinaBim(d)}
                        className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                          filtroDisciplinaBim === d
                            ? 'bg-sky-500/20 text-sky-700 border border-sky-500/30'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        {d.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white text-slate-500 uppercase tracking-wider border-b border-slate-200 font-semibold">
                      <tr>
                        <th className="p-4">Código & Título</th>
                        <th className="p-4">Disciplina</th>
                        <th className="p-4 text-center">Formato</th>
                        <th className="p-4 text-center">Versión</th>
                        <th className="p-4">Proyectista</th>
                        <th className="p-4 text-right">Peso MB</th>
                        <th className="p-4">Estado Revisión</th>
                        <th className="p-4 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {documentosBim
                        .filter((d) => filtroDisciplinaBim === 'TODAS' || d.disciplina === filtroDisciplinaBim)
                        .map((doc) => (
                          <tr key={doc.id} className="hover:bg-slate-50 transition">
                            <td className="p-4">
                              <div className="font-bold text-slate-900 text-sm">{doc.codigo}</div>
                              <div className="text-slate-500 text-[11px]">{doc.titulo}</div>
                            </td>
                            <td className="p-4">
                              <span className="text-sky-700 font-medium bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                                {doc.disciplina.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <span className="font-mono font-bold text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                {doc.formato}
                              </span>
                            </td>
                            <td className="p-4 text-center font-mono text-slate-700 font-semibold">
                              {doc.version}
                            </td>
                            <td className="p-4 text-slate-700 font-medium">
                              {doc.autorProyectista || 'Ing. Proyectista'}
                            </td>
                            <td className="p-4 text-right font-mono text-slate-700">
                              {doc.pesoMb ? `${formatVE(doc.pesoMb)} MB` : '-'}
                            </td>
                            <td className="p-4">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  doc.estadoRevision === 'APROBADO_PARA_CONSTRUCCION'
                                    ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30'
                                    : doc.estadoRevision === 'EN_REVISION'
                                    ? 'bg-amber-500/15 text-amber-700 border-amber-500/30'
                                    : 'bg-rose-500/15 text-rose-700 border-rose-500/30'
                                }`}
                              >
                                {doc.estadoRevision.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              {doc.estadoRevision !== 'APROBADO_PARA_CONSTRUCCION' && (
                                <button
                                  onClick={async () => {
                                    try {
                                      await cambiarEstadoDocumentoBimApi(doc.id!, 'APROBADO_PARA_CONSTRUCCION');
                                      notificarExito(`Plano ${doc.codigo} aprobado para construcción.`);
                                      if (proyectoSeleccionadoId) recargarSubrecursosProyecto(proyectoSeleccionadoId);
                                    } catch (e: any) {
                                      setErrorGlobal(e.message);
                                    }
                                  }}
                                  className="px-2 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-700 border border-emerald-500/30 text-[11px] font-semibold cursor-pointer"
                                >
                                  Aprobar
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      {documentosBim.length === 0 && (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-500">
                            No hay modelos BIM ni planos técnicos registrados en este proyecto.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUBTAB: CONTROL DE RFIS */}
            {subtabBim === 'rfis' && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white text-slate-500 uppercase tracking-wider border-b border-slate-200 font-semibold">
                      <tr>
                        <th className="p-4">N° RFI & Asunto</th>
                        <th className="p-4">Disciplina</th>
                        <th className="p-4">Solicitante</th>
                        <th className="p-4">Consulta Técnica</th>
                        <th className="p-4">Respuesta Oficial</th>
                        <th className="p-4">Fecha Límite</th>
                        <th className="p-4">Estado</th>
                        <th className="p-4 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {rfis.map((rfi) => (
                        <tr key={rfi.id} className="hover:bg-slate-50 transition">
                          <td className="p-4">
                            <div className="font-bold text-amber-600 font-mono text-sm">{rfi.numeroRfi}</div>
                            <div className="text-slate-900 font-semibold text-[11px]">{rfi.asunto}</div>
                          </td>
                          <td className="p-4">
                            <span className="text-sky-700 font-medium bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                              {rfi.disciplina}
                            </span>
                          </td>
                          <td className="p-4 text-slate-700 font-medium">{rfi.solicitante}</td>
                          <td className="p-4 text-slate-700 text-[11px] max-w-[220px]">
                            {rfi.preguntaConsulta}
                          </td>
                          <td className="p-4 text-[11px] max-w-[220px]">
                            {rfi.respuestaOficial ? (
                              <span className="text-emerald-700">{rfi.respuestaOficial}</span>
                            ) : (
                              <span className="text-slate-500 italic">Pendiente de respuesta</span>
                            )}
                          </td>
                          <td className="p-4 font-mono text-slate-700">{rfi.fechaLimite || '-'}</td>
                          <td className="p-4">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                rfi.estado === 'RESPONDIDO' || rfi.estado === 'CERRADO'
                                  ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30'
                                  : rfi.estado === 'EN_EVALUACION'
                                  ? 'bg-amber-500/15 text-amber-700 border-amber-500/30'
                                  : 'bg-sky-500/15 text-sky-700 border-sky-500/30'
                              }`}
                            >
                              {rfi.estado}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {rfi.estado !== 'CERRADO' && (
                              <button
                                onClick={() => {
                                  setModalResponderRfiTarget(rfi);
                                  setFormRespuestaRfi({
                                    respuestaOficial: rfi.respuestaOficial || '',
                                    responsableRespuesta: rfi.responsableRespuesta || 'Ing. Proyectista',
                                    estado: 'RESPONDIDO'
                                  });
                                }}
                                className="px-2.5 py-1 rounded bg-amber-600/20 hover:bg-amber-600/40 text-amber-700 border border-amber-500/30 text-[11px] font-semibold cursor-pointer"
                              >
                                Responder
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {rfis.length === 0 && (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-500">
                            No hay solicitudes de información (RFIs) abiertas en esta obra.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

{tabActiva === 'bitacora' && (
          <div className="space-y-4">
            {!proyectoActivo ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-xs">
                Selecciona un proyecto para ver y registrar el diario de obra.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Libro Diario de Obra (Bitácora)</h2>
                    <p className="text-xs text-slate-500">
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
                  <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center">
                    <IconCalendar size={36} className="text-slate-600 mx-auto mb-3" />
                    <h3 className="text-sm font-semibold text-slate-700">Sin asientos en el libro diario</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Registra el primer día de trabajo para documentar el progreso en sitio.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bitacora.map((asiento) => (
                      <div
                        key={asiento.id}
                        className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded">
                              {asiento.fecha}
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 border border-amber-500/20 font-semibold uppercase">
                              Clima: {asiento.clima || asiento.condicionClimatica || 'SOLEADO'}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Personal activo: <strong className="text-slate-800">{asiento.personalActivo ?? 0} operarios</strong>
                            </span>
                          </div>
                          {asiento.elaboradoPor && (
                            <span className="text-[11px] text-slate-500">
                              Por: <strong className="text-slate-800">{asiento.elaboradoPor}</strong>
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-800 space-y-2">
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">
                              Actividades Ejecutadas
                            </span>
                            <p className="text-slate-800 leading-relaxed whitespace-pre-line">
                              {asiento.actividadesEjecutadas || asiento.actividadesRealizadas}
                            </p>
                          </div>

                          {(asiento.observacionesEIncidentes || asiento.incidentesRetrasos) && (
                            <div className="bg-amber-500/5 border border-amber-500/20 p-2.5 rounded-xl">
                              <span className="text-[10px] text-amber-600 uppercase font-bold block mb-0.5">
                                Observaciones / Incidentes
                              </span>
                              <p className="text-amber-700 text-xs">
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
        {tabActiva === 'cuadrillas' && (
          <div className="space-y-6">
            {/* ENCABEZADO Y ACCIONES */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shadow-lg shadow-amber-500/5">
                    <IconUsers size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-lg text-slate-900">Planificación de Cuadrillas & Frentes Operativos</h2>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 border border-amber-500/25">
                        Rendimiento de Mano de Obra
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Control del personal civil distribuido por frentes de trabajo y vinculación a partidas COVENIN
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setModalCuadrillaAbierto(true)}
                  disabled={!proyectoActivo}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  <IconUsers size={16} />
                  <span>+ Asignar Nueva Cuadrilla</span>
                </button>
              </div>

              {/* TARJETAS DE MÉTRICAS DE PERSONAL */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cuadrillas Activas</div>
                  <div className="text-2xl font-black text-amber-600 mt-1">
                    {cuadrillas.filter((c) => c.estado === 'ACTIVA').length}
                    <span className="text-xs font-normal text-slate-500 ml-1.5">/ {cuadrillas.length} tot.</span>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Oficiales & Maestros</div>
                  <div className="text-2xl font-black text-sky-600 mt-1">
                    {cuadrillas.reduce((acc, c) => acc + (Number(c.cantidadOficiales) || 0), 0)}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Ayudantes & Obreros</div>
                  <div className="text-2xl font-black text-slate-800 mt-1">
                    {cuadrillas.reduce((acc, c) => acc + (Number(c.cantidadAyudantes) || 0), 0)}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Dotación Total</div>
                  <div className="text-2xl font-black text-emerald-600 mt-1">
                    {cuadrillas.reduce((acc, c) => acc + (Number(c.cantidadTotalPersonal) || (Number(c.cantidadOficiales) || 0) + (Number(c.cantidadAyudantes) || 0)), 0)}
                    <span className="text-xs font-normal text-slate-500 ml-1.5">obreros</span>
                  </div>
                </div>
              </div>
            </div>

            {/* BARRA DE FILTROS */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white/70 border border-slate-200 rounded-xl p-3">
              <div className="flex items-center gap-2 overflow-x-auto text-xs">
                <span className="text-slate-500 font-semibold px-2">Especialidad:</span>
                {['TODAS', 'CONCRETO_Y_ENCOFRADO', 'ACERO_Y_CABILLAS', 'ALBANILERIA', 'MOVIMIENTO_TIERRAS', 'INSTALACIONES_ELECTRICAS', 'INSTALACIONES_SANITARIAS', 'ACABADOS_Y_PINTURA', 'SOLDADURA_ESTRUCTURAL', 'GENERAL'].map((esp) => (
                  <button
                    key={esp}
                    onClick={() => setFiltroEspecialidadCuadrilla(esp)}
                    className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer whitespace-nowrap ${
                      filtroEspecialidadCuadrilla === esp
                        ? 'bg-amber-500/20 text-amber-700 border border-amber-500/30'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    {esp.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* TABLA DE CUADRILLAS */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white text-slate-500 uppercase tracking-wider border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="p-4">Código & Cuadrilla</th>
                      <th className="p-4">Frente de Trabajo</th>
                      <th className="p-4">Especialidad</th>
                      <th className="p-4">Capataz / Maestro</th>
                      <th className="p-4 text-center">Oficiales</th>
                      <th className="p-4 text-center">Ayudantes</th>
                      <th className="p-4 text-center">Total</th>
                      <th className="p-4">Partida Vinculada</th>
                      <th className="p-4">Estado</th>
                      <th className="p-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {cuadrillas
                      .filter((c) => filtroEspecialidadCuadrilla === 'TODAS' || c.especialidad === filtroEspecialidadCuadrilla)
                      .map((cuad) => {
                        const partidaAsoc = partidas.find((p) => p.id === cuad.partidaId);
                        return (
                          <tr key={cuad.id} className="hover:bg-slate-50 transition">
                            <td className="p-4">
                              <div className="font-bold text-slate-900 text-sm">{cuad.codigo}</div>
                              <div className="text-slate-500 text-[11px]">{cuad.nombre}</div>
                            </td>
                            <td className="p-4">
                              <span className="font-semibold text-sky-700 bg-sky-500/10 px-2.5 py-1 rounded-md border border-sky-500/20">
                                {cuad.frenteTrabajo}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className="text-slate-700 font-medium bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                                {cuad.especialidad.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="p-4 text-slate-700 font-medium">
                              {cuad.capatazResponsable || cuad.capatazLider}
                            </td>
                            <td className="p-4 text-center font-bold text-sky-600">
                              {cuad.cantidadOficiales}
                            </td>
                            <td className="p-4 text-center font-bold text-slate-700">
                              {cuad.cantidadAyudantes}
                            </td>
                            <td className="p-4 text-center">
                              <span className="font-black text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                                {cuad.cantidadTotalPersonal || cuad.cantidadOficiales + cuad.cantidadAyudantes}
                              </span>
                            </td>
                            <td className="p-4 max-w-[200px] truncate text-slate-500 text-[11px]">
                              {partidaAsoc ? (
                                <span title={partidaAsoc.descripcion} className="text-slate-700">
                                  <strong className="text-amber-600">{partidaAsoc.codigoCovenin}</strong> - {partidaAsoc.descripcion}
                                </span>
                              ) : (
                                <span className="text-slate-500 italic">General de Obra</span>
                              )}
                            </td>
                            <td className="p-4">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  cuad.estado === 'ACTIVA'
                                    ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30'
                                    : cuad.estado === 'EN_STANDBY'
                                    ? 'bg-amber-500/15 text-amber-700 border-amber-500/30'
                                    : cuad.estado === 'REASIGNADA'
                                    ? 'bg-sky-500/15 text-sky-700 border-sky-500/30'
                                    : 'bg-slate-200 text-slate-700 border-slate-300'
                                }`}
                              >
                                {cuad.estado}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {cuad.estado !== 'ACTIVA' && (
                                  <button
                                    onClick={async () => {
                                      try {
                                        await cambiarEstadoCuadrillaConstruccionApi(cuad.id!, 'ACTIVA');
                                        notificarExito(`Cuadrilla ${cuad.codigo} activada.`);
                                        if (proyectoSeleccionadoId) recargarSubrecursosProyecto(proyectoSeleccionadoId);
                                      } catch (e: any) {
                                        setErrorGlobal(e.message);
                                      }
                                    }}
                                    title="Activar cuadrilla"
                                    className="px-2 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-700 border border-emerald-500/30 text-[11px] font-semibold cursor-pointer"
                                  >
                                    Activar
                                  </button>
                                )}
                                {cuad.estado === 'ACTIVA' && (
                                  <button
                                    onClick={async () => {
                                      try {
                                        await cambiarEstadoCuadrillaConstruccionApi(cuad.id!, 'EN_STANDBY');
                                        notificarExito(`Cuadrilla ${cuad.codigo} puesta en standby.`);
                                        if (proyectoSeleccionadoId) recargarSubrecursosProyecto(proyectoSeleccionadoId);
                                      } catch (e: any) {
                                        setErrorGlobal(e.message);
                                      }
                                    }}
                                    title="Poner en Standby"
                                    className="px-2 py-1 rounded bg-amber-600/20 hover:bg-amber-600/40 text-amber-700 border border-amber-500/30 text-[11px] font-semibold cursor-pointer"
                                  >
                                    Standby
                                  </button>
                                )}
                                {cuad.estado !== 'FINALIZADA' && (
                                  <button
                                    onClick={async () => {
                                      if (window.confirm(`¿Finalizar y desmovilizar cuadrilla ${cuad.codigo}?`)) {
                                        try {
                                          await cambiarEstadoCuadrillaConstruccionApi(cuad.id!, 'FINALIZADA');
                                          notificarExito(`Cuadrilla ${cuad.codigo} finalizada.`);
                                          if (proyectoSeleccionadoId) recargarSubrecursosProyecto(proyectoSeleccionadoId);
                                        } catch (e: any) {
                                          setErrorGlobal(e.message);
                                        }
                                      }
                                    }}
                                    title="Finalizar cuadrilla"
                                    className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300 text-[11px] font-semibold cursor-pointer"
                                  >
                                    Finalizar
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    {cuadrillas.length === 0 && (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-slate-500">
                          No hay cuadrillas registradas para este proyecto de obra. Haga clic en "+ Asignar Nueva Cuadrilla" para comenzar la distribución de personal en campo.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
      </div>

      {/* MODAL 1: CREAR / EDITAR PROYECTO */}
      {modalProyectoAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">
                {proyectoEditando ? 'Editar Proyecto de Obra' : 'Nuevo Proyecto de Obra'}
              </h3>
              <button
                onClick={() => setModalProyectoAbierto(false)}
                className="text-slate-500 hover:text-slate-900 cursor-pointer"
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
                  avisar(err.message || 'Error guardando proyecto');
                }
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Código *</label>
                  <input
                    name="codigo"
                    required
                    defaultValue={proyectoEditando?.codigo || ''}
                    placeholder="OBRA-2026-01"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-slate-500 block mb-1 font-semibold">Nombre de la Obra *</label>
                  <input
                    name="nombre"
                    required
                    defaultValue={proyectoEditando?.nombre || ''}
                    placeholder="Construcción Módulo Industrial"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Cliente / Contratante *</label>
                  <input
                    name="cliente"
                    required
                    defaultValue={proyectoEditando?.cliente || ''}
                    placeholder="Corporación Minera"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Ubicación</label>
                  <input
                    name="ubicacion"
                    defaultValue={proyectoEditando?.ubicacion || ''}
                    placeholder="Zona Industrial, Galpón 4"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Ingeniero Residente</label>
                  <input
                    name="ingenieroResidente"
                    defaultValue={proyectoEditando?.ingenieroResidente || ''}
                    placeholder="Ing. Carlos Pérez"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Carnet CIV</label>
                  <input
                    name="civResidente"
                    defaultValue={proyectoEditando?.civResidente || ''}
                    placeholder="CIV-189.420"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Presupuesto (Bs.)</label>
                  <input
                    name="montoPresupuestoTotal"
                    type="number"
                    step="0.01"
                    defaultValue={proyectoEditando?.montoPresupuestoTotal ?? ''}
                    placeholder="50000.00"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">% Anticipo</label>
                  <input
                    name="porcentajeAnticipo"
                    type="number"
                    step="0.01"
                    defaultValue={proyectoEditando?.porcentajeAnticipo ?? 20}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">% Ret. Garantía</label>
                  <input
                    name="porcentajeRetencionGarantia"
                    type="number"
                    step="0.01"
                    defaultValue={proyectoEditando?.porcentajeRetencionGarantia ?? 10}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-500 block mb-1 font-semibold">Estado</label>
                <select
                  name="estado"
                  defaultValue={proyectoEditando?.estado || 'EN_EJECUCION'}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900"
                >
                  <option value="EN_EJECUCION">EN_EJECUCION</option>
                  <option value="PARALIZADA">PARALIZADA</option>
                  <option value="FINALIZADA">FINALIZADA</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalProyectoAbierto(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">Nuevo Capítulo Presupuestario</h3>
              <button
                onClick={() => setModalCapituloAbierto(false)}
                className="text-slate-500 hover:text-slate-900 cursor-pointer"
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
                  avisar(err.message || 'Error creando capítulo');
                }
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Código *</label>
                  <input
                    name="codigo"
                    required
                    placeholder="1.0"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-slate-500 block mb-1 font-semibold">Nombre del Capítulo *</label>
                  <input
                    name="nombre"
                    required
                    placeholder="Obras Preliminares"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-500 block mb-1 font-semibold">Orden correlativo</label>
                <input
                  name="orden"
                  type="number"
                  defaultValue={capitulos.length + 1}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalCapituloAbierto(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">
                {partidaEditando ? 'Editar Partida' : 'Nueva Partida de Obra'}
              </h3>
              <button
                onClick={() => setModalPartidaAbierto(false)}
                className="text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <IconClose size={18} />
              </button>
            </div>

            {/* Buscador de catálogo COVENIN asistido */}
            {!partidaEditando && (
              <div className="bg-white p-3 rounded-2xl border border-slate-200 space-y-2">
                <div className="text-[11px] font-semibold text-amber-600 flex items-center gap-1.5">
                  <IconSearch size={14} />
                  <span>Buscador del Catálogo Oficial COVENIN</span>
                </div>
                <input
                  type="text"
                  value={busquedaCovenin}
                  onChange={(e) => setBusquedaCovenin(e.target.value)}
                  placeholder="Ej: concreto, tubería, acero..."
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-300 text-xs text-slate-900"
                />
                {buscandoCovenin && (
                  <span className="text-[10px] text-slate-500">Buscando en catálogo...</span>
                )}
                {catalogoCovenin.length > 0 && (
                  <div className="max-h-28 overflow-y-auto divide-y divide-slate-200 border border-slate-200 rounded-xl bg-slate-100">
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
                        className="p-2 hover:bg-slate-50 cursor-pointer text-[11px]"
                      >
                        <span className="font-mono text-amber-600 font-bold mr-2">{item.codigoCovenin}</span>
                        <span className="text-slate-800">{item.descripcion}</span>
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
                  avisar(err.message || 'Error guardando partida');
                }
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Código COVENIN *</label>
                  <input
                    name="codigoCovenin"
                    required
                    defaultValue={partidaEditando?.codigoCovenin || partidaEditando?.codigoPartida || ''}
                    placeholder="E-311.100"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Capítulo</label>
                  <select
                    name="capituloId"
                    defaultValue={partidaEditando?.capituloId ?? ''}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900"
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
                <label className="text-slate-500 block mb-1 font-semibold">Descripción de la Partida *</label>
                <textarea
                  name="descripcion"
                  required
                  rows={3}
                  defaultValue={partidaEditando?.descripcion || ''}
                  placeholder="Vaciado de concreto en zapatas..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Unidad *</label>
                  <input
                    name="unidad"
                    required
                    defaultValue={partidaEditando?.unidad || 'm3'}
                    placeholder="m3, m2, kg..."
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Cómputo / Cantidad *</label>
                  <input
                    name="cantidadPresupuestada"
                    type="number"
                    step="0.0001"
                    required
                    defaultValue={partidaEditando?.cantidadPresupuestada ?? ''}
                    placeholder="25.00"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">P.U. (Bs.) *</label>
                  <input
                    name="precioUnitario"
                    type="number"
                    step="0.01"
                    required
                    defaultValue={partidaEditando?.precioUnitario ?? ''}
                    placeholder="120.50"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-500 block mb-1 font-semibold">Rendimiento Diario Estimado</label>
                <input
                  name="rendimientoDiario"
                  type="number"
                  step="0.01"
                  defaultValue={partidaEditando?.rendimientoDiario ?? ''}
                  placeholder="10.00"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalPartidaAbierto(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">Nueva Valuación de Obra</h3>
              <button
                onClick={() => setModalValuacionAbierto(false)}
                className="text-slate-500 hover:text-slate-900 cursor-pointer"
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
                  avisar(err.message || 'Error registrando valuación');
                }
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">N° Valuación *</label>
                  <input
                    name="numeroValuacion"
                    type="number"
                    required
                    defaultValue={valuaciones.length + 1}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Monto Bruto Ejecutado (Bs.) *</label>
                  <input
                    name="montoBruto"
                    type="number"
                    step="0.01"
                    required
                    placeholder="15000.00"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Período Desde *</label>
                  <input
                    name="periodoDesde"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Período Hasta *</label>
                  <input
                    name="periodoHasta"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-500 block mb-1 font-semibold">Fecha Emisión *</label>
                <input
                  name="fechaEmision"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <label className="text-slate-500 block mb-1 font-semibold">Observaciones</label>
                <textarea
                  name="observaciones"
                  rows={2}
                  placeholder="Corte de obra quincenal correspondiente a fundaciones..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalValuacionAbierto(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">Nuevo Insumo de Construcción</h3>
              <button
                onClick={() => setModalInsumoAbierto(false)}
                className="text-slate-500 hover:text-slate-900 cursor-pointer"
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
                  avisar(err.message || 'Error guardando insumo');
                }
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Código *</label>
                  <input
                    name="codigo"
                    required
                    placeholder="MAT-CEM-01"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Tipo *</label>
                  <select
                    name="tipo"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900"
                  >
                    <option value="MATERIAL">MATERIAL</option>
                    <option value="EQUIPO">EQUIPO</option>
                    <option value="MANO_OBRA">MANO DE OBRA</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-500 block mb-1 font-semibold">Nombre del Insumo *</label>
                <input
                  name="nombre"
                  required
                  placeholder="Cemento Portland Tipo I (Saco 42.5 kg)"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Unidad *</label>
                  <input
                    name="unidad"
                    required
                    placeholder="saco, kg, m3"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Stock Inicial *</label>
                  <input
                    name="stockActual"
                    type="number"
                    step="0.01"
                    required
                    placeholder="100.00"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Stock Mínimo</label>
                  <input
                    name="stockMinimo"
                    type="number"
                    step="0.01"
                    defaultValue="10.00"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Costo Unitario (Bs.)</label>
                  <input
                    name="costoUnitario"
                    type="number"
                    step="0.01"
                    placeholder="250.00"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Proveedor</label>
                  <input
                    name="proveedor"
                    placeholder="Cemex / Distribuidora"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalInsumoAbierto(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Descontar Consumo en Obra</h3>
                <p className="text-[11px] text-amber-600 font-mono mt-0.5">{insumoConsumo.nombre}</p>
              </div>
              <button
                onClick={() => setModalConsumoAbierto(false)}
                className="text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <IconClose size={18} />
              </button>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between text-slate-500">
                <span>Stock Disponible:</span>
                <span className="font-bold font-mono text-emerald-600">
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
                  avisar('La cantidad a consumir debe ser mayor a 0');
                  return;
                }
                if (cant > (Number(insumoConsumo.stockActual) || 0)) {
                  avisar('La cantidad supera el stock disponible');
                  return;
                }

                try {
                  const ik = generarIdempotencyKey();
                  await registrarConsumoInsumoConstruccionApi(insumoConsumo.id!, cant, ik);
                  notificarExito(`Se consumieron ${formatVE(cant)} ${insumoConsumo.unidad} con éxito`);
                  setModalConsumoAbierto(false);
                  recargarProyectosEInsumos();
                } catch (err: any) {
                  avisar(err.message || 'Error procesando consumo');
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="text-slate-500 block mb-1 font-semibold">
                  Cantidad a Descontar ({insumoConsumo.unidad}) *
                </label>
                <input
                  name="cantidad"
                  type="number"
                  step="0.01"
                  required
                  placeholder="10.00"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalConsumoAbierto(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">Registrar Guía de Despacho</h3>
              <button
                onClick={() => setModalDespachoAbierto(false)}
                className="text-slate-500 hover:text-slate-900 cursor-pointer"
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
                  avisar(err.message || 'Error guardando guía de despacho');
                }
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">N° Guía / Remisión *</label>
                  <input
                    name="guiaNumero"
                    required
                    placeholder="GUIA-MIX-2026-001"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Tipo de Material *</label>
                  <select
                    name="tipoMaterial"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900"
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
                  <label className="text-slate-500 block mb-1 font-semibold">Origen / Proveedor *</label>
                  <input
                    name="origen"
                    required
                    placeholder="Planta Mezcladora Central"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Destino / Frente de Obra *</label>
                  <input
                    name="destinoFrente"
                    required
                    placeholder="Losa Nivel +3.50"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Unidad de Transporte</label>
                  <input
                    name="unidadTransporte"
                    placeholder="Mixer Mack #12 (Placa A92BJ2K)"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Chofer</label>
                  <input
                    name="chofer"
                    placeholder="Carlos Benítez"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Cantidad *</label>
                  <input
                    name="cantidad"
                    type="number"
                    step="0.01"
                    required
                    placeholder="8.00"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Unidad *</label>
                  <input
                    name="unidadMedida"
                    required
                    defaultValue="m3"
                    placeholder="m3, ton, kg"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Asentamiento (Slump)</label>
                  <input
                    name="slumpConoPulgadas"
                    type="number"
                    step="0.1"
                    placeholder="5.5 (pulgadas)"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Peso Bruto (kg)</label>
                  <input
                    name="pesoBrutoKg"
                    type="number"
                    step="0.01"
                    placeholder="38000"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Peso Tara (kg)</label>
                  <input
                    name="pesoTaraKg"
                    type="number"
                    step="0.01"
                    placeholder="13000"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Peso Neto (kg)</label>
                  <input
                    name="pesoNetoKg"
                    type="number"
                    step="0.01"
                    placeholder="25000"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Asociar con Insumo (Opcional)</label>
                  <select
                    name="insumoId"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900"
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
                  <label className="text-slate-500 block mb-1 font-semibold">Estado Inicial</label>
                  <select
                    name="estado"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900"
                  >
                    <option value="EN_TRANSITO">EN TRANSITO</option>
                    <option value="EN_BASCULA">EN BASCULA</option>
                    <option value="DESCARGANDO">DESCARGANDO</option>
                    <option value="RECIBIDO">RECIBIDO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-500 block mb-1 font-semibold">Observaciones</label>
                <textarea
                  name="observaciones"
                  rows={2}
                  placeholder="Muestra tomada para ensayo de compresión cilíndrica a 7 y 28 días..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalDespachoAbierto(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">Nuevo Asiento en Libro Diario</h3>
              <button
                onClick={() => setModalBitacoraAbierto(false)}
                className="text-slate-500 hover:text-slate-900 cursor-pointer"
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
                  avisar(err.message || 'Error guardando en bitácora');
                }
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Fecha *</label>
                  <input
                    name="fecha"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Condición Clima *</label>
                  <select
                    name="clima"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900"
                  >
                    <option value="SOLEADO">SOLEADO</option>
                    <option value="NUBLADO">NUBLADO</option>
                    <option value="LLUVIOSO">LLUVIOSO</option>
                    <option value="LLUVIA_FUERTE">LLUVIA FUERTE</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Operarios en Sitio</label>
                  <input
                    name="personalActivo"
                    type="number"
                    defaultValue="10"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-500 block mb-1 font-semibold">
                  Actividades Ejecutadas en la Jornada *
                </label>
                <textarea
                  name="actividadesEjecutadas"
                  required
                  rows={3}
                  placeholder="Se realizó el encofrado y armado de acero en zapatas Z-1 a Z-4..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <label className="text-slate-500 block mb-1 font-semibold">
                  Observaciones, Incidentes o Novedades
                </label>
                <textarea
                  name="observacionesEIncidentes"
                  rows={2}
                  placeholder="Retraso de 40 min por lluvia al mediodía..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <label className="text-slate-500 block mb-1 font-semibold">Elaborado Por</label>
                <input
                  name="elaboradoPor"
                  defaultValue={proyectoActivo.ingenieroResidente || user?.nombre || ''}
                  placeholder="Ing. Residente"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalBitacoraAbierto(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
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
    
      {/* MODAL: ASIGNAR NUEVA CUADRILLA */}
      {modalCuadrillaAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 flex items-center justify-center">
                  <IconUsers size={18} />
                </div>
                <h3 className="font-bold text-base text-slate-900">Asignar Nueva Cuadrilla de Obra</h3>
              </div>
              <button
                onClick={() => setModalCuadrillaAbierto(false)}
                className="text-slate-500 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <IconClose size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!proyectoSeleccionadoId) return;
                setGuardandoCuadrilla(true);
                setErrorGlobal(null);
                try {
                  const idemKey = generarIdempotencyKey();
                  await crearCuadrillaConstruccionApi(
                    proyectoSeleccionadoId,
                    {
                      codigo: formCuadrilla.codigo.trim(),
                      nombre: formCuadrilla.nombre.trim(),
                      frenteTrabajo: formCuadrilla.frenteTrabajo.trim(),
                      capatazResponsable: formCuadrilla.capatazResponsable.trim(),
                      cantidadOficiales: Number(formCuadrilla.cantidadOficiales) || 0,
                      cantidadAyudantes: Number(formCuadrilla.cantidadAyudantes) || 0,
                      especialidad: formCuadrilla.especialidad,
                      fechaInicio: formCuadrilla.fechaInicio,
                      partidaId: formCuadrilla.partidaId ? Number(formCuadrilla.partidaId) : undefined,
                      observaciones: formCuadrilla.observaciones.trim() || undefined
                    },
                    idemKey
                  );
                  notificarExito(`Cuadrilla ${formCuadrilla.codigo} asignada exitosamente al frente ${formCuadrilla.frenteTrabajo}.`);
                  setModalCuadrillaAbierto(false);
                  setFormCuadrilla({
                    codigo: '',
                    nombre: '',
                    frenteTrabajo: '',
                    capatazResponsable: '',
                    cantidadOficiales: 2,
                    cantidadAyudantes: 4,
                    especialidad: 'CONCRETO_Y_ENCOFRADO',
                    partidaId: '',
                    fechaInicio: new Date().toISOString().split('T')[0],
                    observaciones: ''
                  });
                  recargarSubrecursosProyecto(proyectoSeleccionadoId);
                } catch (err: any) {
                  setErrorGlobal(err.message || 'Error registrando la cuadrilla en el servidor');
                } finally {
                  setGuardandoCuadrilla(false);
                }
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Código *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. CD-ENC-01"
                    value={formCuadrilla.codigo}
                    onChange={(e) => setFormCuadrilla({ ...formCuadrilla, codigo: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Especialidad *</label>
                  <select
                    value={formCuadrilla.especialidad}
                    onChange={(e) => setFormCuadrilla({ ...formCuadrilla, especialidad: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="CONCRETO_Y_ENCOFRADO">Concreto & Encofrado</option>
                    <option value="ACERO_Y_CABILLAS">Acero & Cabillas</option>
                    <option value="ALBANILERIA">Albañilería & Bloque</option>
                    <option value="MOVIMIENTO_TIERRAS">Movimiento de Tierras</option>
                    <option value="INSTALACIONES_ELECTRICAS">Instalaciones Eléctricas</option>
                    <option value="INSTALACIONES_SANITARIAS">Instalaciones Sanitarias</option>
                    <option value="ACABADOS_Y_PINTURA">Acabados & Pintura</option>
                    <option value="SOLDADURA_ESTRUCTURAL">Soldadura Estructural</option>
                    <option value="GENERAL">General de Obra</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Nombre de la Cuadrilla *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Cuadrilla Encofrado Losa Nivel 2"
                  value={formCuadrilla.nombre}
                  onChange={(e) => setFormCuadrilla({ ...formCuadrilla, nombre: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Frente de Trabajo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Sector B - Losa 2"
                    value={formCuadrilla.frenteTrabajo}
                    onChange={(e) => setFormCuadrilla({ ...formCuadrilla, frenteTrabajo: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Capataz / Responsable *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. José Castillo"
                    value={formCuadrilla.capatazResponsable}
                    onChange={(e) => setFormCuadrilla({ ...formCuadrilla, capatazResponsable: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Oficiales *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formCuadrilla.cantidadOficiales}
                    onChange={(e) => setFormCuadrilla({ ...formCuadrilla, cantidadOficiales: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold text-sky-600 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Ayudantes *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formCuadrilla.cantidadAyudantes}
                    onChange={(e) => setFormCuadrilla({ ...formCuadrilla, cantidadAyudantes: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold text-slate-700 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Total Personal</label>
                  <div className="w-full bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 text-emerald-600 font-black text-sm flex items-center justify-center">
                    {(Number(formCuadrilla.cantidadOficiales) || 0) + (Number(formCuadrilla.cantidadAyudantes) || 0)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Fecha de Inicio *</label>
                  <input
                    type="date"
                    required
                    value={formCuadrilla.fechaInicio}
                    onChange={(e) => setFormCuadrilla({ ...formCuadrilla, fechaInicio: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Partida COVENIN Vinculada</label>
                  <select
                    value={formCuadrilla.partidaId}
                    onChange={(e) => setFormCuadrilla({ ...formCuadrilla, partidaId: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none text-xs"
                  >
                    <option value="">General de Obra (Sin vinculación directa)</option>
                    {partidas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.codigoCovenin} - {p.descripcion.substring(0, 30)}...
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Observaciones</label>
                <textarea
                  rows={2}
                  placeholder="Turno, herramientas asignadas, requerimientos de EPP..."
                  value={formCuadrilla.observaciones}
                  onChange={(e) => setFormCuadrilla({ ...formCuadrilla, observaciones: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalCuadrillaAbierto(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoCuadrilla}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold transition shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  {guardandoCuadrilla ? 'Registrando...' : 'Asignar Cuadrilla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR NUEVA MAQUINARIA */}
      {modalMaquinariaAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 flex items-center justify-center">
                  <IconWrench size={18} />
                </div>
                <h3 className="font-bold text-base text-slate-900">Registrar Equipo / Maquinaria en Obra</h3>
              </div>
              <button
                onClick={() => setModalMaquinariaAbierto(false)}
                className="text-slate-500 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <IconClose size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setErrorGlobal(null);
                try {
                  const idemKey = generarIdempotencyKey();
                  await crearMaquinariaConstruccionApi(
                    {
                      codigo: formNuevaMaquinaria.codigo.trim(),
                      nombre: formNuevaMaquinaria.nombre.trim(),
                      tipo: formNuevaMaquinaria.tipo,
                      marca: formNuevaMaquinaria.marca.trim() || undefined,
                      modelo: formNuevaMaquinaria.modelo.trim() || undefined,
                      serialChasis: formNuevaMaquinaria.serialChasis.trim() || undefined,
                      placa: formNuevaMaquinaria.placa.trim() || undefined,
                      horometroActual: Number(formNuevaMaquinaria.horometroActual) || 0,
                      intervaloMantenimientoHoras: Number(formNuevaMaquinaria.intervaloMantenimientoHoras) || 250,
                      estado: formNuevaMaquinaria.estado,
                      operadorResponsable: formNuevaMaquinaria.operadorResponsable.trim() || undefined,
                      combustibleTipo: formNuevaMaquinaria.combustibleTipo,
                      proyectoId: formNuevaMaquinaria.asignarAProyecto && proyectoSeleccionadoId ? proyectoSeleccionadoId : undefined,
                      observaciones: formNuevaMaquinaria.observaciones.trim() || undefined
                    },
                    idemKey
                  );
                  notificarExito(`Equipo ${formNuevaMaquinaria.codigo} registrado exitosamente.`);
                  setModalMaquinariaAbierto(false);
                  if (proyectoSeleccionadoId) recargarSubrecursosProyecto(proyectoSeleccionadoId);
                } catch (err: any) {
                  setErrorGlobal(err.message || 'Error registrando maquinaria');
                }
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Código *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. RET-01"
                    value={formNuevaMaquinaria.codigo}
                    onChange={(e) => setFormNuevaMaquinaria({ ...formNuevaMaquinaria, codigo: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Tipo de Equipo *</label>
                  <select
                    value={formNuevaMaquinaria.tipo}
                    onChange={(e) => setFormNuevaMaquinaria({ ...formNuevaMaquinaria, tipo: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="PESADA">Pesada (Excavadora / Retro)</option>
                    <option value="TRANSPORTE">Transporte (Volqueta / Batea)</option>
                    <option value="LIVIANA">Liviana (Compactadora / Trompo)</option>
                    <option value="ELEVACION">Elevación (Grúa / Montacarga)</option>
                    <option value="GENERACION">Generación (Planta / Compresor)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Nombre / Descripción del Equipo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Retroexcavadora sobre orugas 20T"
                  value={formNuevaMaquinaria.nombre}
                  onChange={(e) => setFormNuevaMaquinaria({ ...formNuevaMaquinaria, nombre: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Marca</label>
                  <input
                    type="text"
                    placeholder="Ej. Caterpillar"
                    value={formNuevaMaquinaria.marca}
                    onChange={(e) => setFormNuevaMaquinaria({ ...formNuevaMaquinaria, marca: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Modelo</label>
                  <input
                    type="text"
                    placeholder="Ej. 320D"
                    value={formNuevaMaquinaria.modelo}
                    onChange={(e) => setFormNuevaMaquinaria({ ...formNuevaMaquinaria, modelo: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Horómetro Inicial</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formNuevaMaquinaria.horometroActual}
                    onChange={(e) => setFormNuevaMaquinaria({ ...formNuevaMaquinaria, horometroActual: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Intervalo Mant. (hrs)</label>
                  <input
                    type="number"
                    value={formNuevaMaquinaria.intervaloMantenimientoHoras}
                    onChange={(e) => setFormNuevaMaquinaria({ ...formNuevaMaquinaria, intervaloMantenimientoHoras: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Operador Responsable</label>
                  <input
                    type="text"
                    placeholder="Ej. Carlos Mendoza"
                    value={formNuevaMaquinaria.operadorResponsable}
                    onChange={(e) => setFormNuevaMaquinaria({ ...formNuevaMaquinaria, operadorResponsable: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Placa / Serial Chasis</label>
                  <input
                    type="text"
                    placeholder="Ej. A12BC3D"
                    value={formNuevaMaquinaria.placa}
                    onChange={(e) => setFormNuevaMaquinaria({ ...formNuevaMaquinaria, placa: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalMaquinariaAbierto(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  Registrar Equipo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ACTUALIZAR HOROMETRO */}
      {modalHorometroTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">Actualizar Horómetro: {modalHorometroTarget.codigo}</h3>
              <button onClick={() => setModalHorometroTarget(null)} className="text-slate-500 hover:text-slate-900 p-1">
                <IconClose size={18} />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setErrorGlobal(null);
                try {
                  await actualizarHorometroMaquinariaApi(
                    modalHorometroTarget.id!,
                    Number(nuevoHorometroInput) || 0,
                    nuevoOperadorInput.trim() || undefined
                  );
                  notificarExito(`Horómetro actualizado para ${modalHorometroTarget.codigo}.`);
                  setModalHorometroTarget(null);
                  if (proyectoSeleccionadoId) recargarSubrecursosProyecto(proyectoSeleccionadoId);
                } catch (err: any) {
                  setErrorGlobal(err.message);
                }
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Horómetro Actual (Horas) *</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={nuevoHorometroInput}
                  onChange={(e) => setNuevoHorometroInput(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono text-base font-bold text-sky-600 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Operador</label>
                <input
                  type="text"
                  value={nuevoOperadorInput}
                  onChange={(e) => setNuevoOperadorInput(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalHorometroTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                >
                  Guardar Lectura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MANTENIMIENTOS DE MAQUINARIA */}
      {modalMantTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-base text-slate-900">Mantenimientos: {modalMantTarget.codigo} - {modalMantTarget.nombre}</h3>
                <p className="text-xs text-slate-500">Horómetro: {formatVE(modalMantTarget.horometroActual)} hrs</p>
              </div>
              <button onClick={() => setModalMantTarget(null)} className="text-slate-500 hover:text-slate-900 p-1">
                <IconClose size={18} />
              </button>
            </div>

            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-xs text-slate-700">Historial Registrado ({historialMantenimientos.length})</h4>
              <button
                type="button"
                onClick={() => setMostrarFormMant(!mostrarFormMant)}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-700 border border-amber-500/30 text-xs font-semibold cursor-pointer"
              >
                {mostrarFormMant ? 'Ver Historial' : '+ Registrar Mantenimiento'}
              </button>
            </div>

            {mostrarFormMant ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setErrorGlobal(null);
                  try {
                    await crearMantenimientoMaquinariaApi(
                      modalMantTarget.id!,
                      {
                        tipo: formMant.tipo,
                        fechaMantenimiento: formMant.fechaMantenimiento,
                        horometroEnMantenimiento: Number(formMant.horometroEnMantenimiento) || Number(modalMantTarget.horometroActual) || 0,
                        descripcionTrabajo: formMant.descripcionTrabajo.trim(),
                        mecanicoOTaller: formMant.mecanicoOTaller.trim() || undefined,
                        repuestosUtilizados: formMant.repuestosUtilizados.trim() || undefined
                      }
                    );
                    notificarExito('Mantenimiento registrado y próximo servicio recalculado.');
                    setMostrarFormMant(false);
                    const hist = await listarMantenimientosMaquinariaApi(modalMantTarget.id!);
                    setHistorialMantenimientos(hist);
                    if (proyectoSeleccionadoId) recargarSubrecursosProyecto(proyectoSeleccionadoId);
                  } catch (err: any) {
                    setErrorGlobal(err.message);
                  }
                }}
                className="space-y-3 text-xs bg-white p-4 rounded-xl border border-slate-200"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 mb-1">Tipo de Servicio *</label>
                    <select
                      value={formMant.tipo}
                      onChange={(e) => setFormMant({ ...formMant, tipo: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                    >
                      <option value="PREVENTIVO">Preventivo (Filtros / Aceites)</option>
                      <option value="CORRECTIVO">Correctivo (Reparación)</option>
                      <option value="OVERHAUL">Overhaul Mayor</option>
                      <option value="INSPECCION">Inspección de Seguridad</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Fecha de Intervención *</label>
                    <input
                      type="date"
                      required
                      value={formMant.fechaMantenimiento}
                      onChange={(e) => setFormMant({ ...formMant, fechaMantenimiento: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 mb-1">Horómetro al Momento</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formMant.horometroEnMantenimiento || modalMantTarget.horometroActual}
                      onChange={(e) => setFormMant({ ...formMant, horometroEnMantenimiento: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Mecánico o Taller Especializado</label>
                  <input
                    type="text"
                    placeholder="Ej. Taller Central Diesel / Mecánico Pedro Ruiz"
                    value={formMant.mecanicoOTaller}
                    onChange={(e) => setFormMant({ ...formMant, mecanicoOTaller: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Descripción del Trabajo Realizado *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Cambio de filtro de aire, combustible, aceite 15W40, engrase general..."
                    value={formMant.descripcionTrabajo}
                    onChange={(e) => setFormMant({ ...formMant, descripcionTrabajo: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                  >
                    Guardar Mantenimiento
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto text-xs">
                {historialMantenimientos.map((h) => (
                  <div key={h.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-700">{h.tipo} - {h.fechaMantenimiento}</span>
                    </div>
                    <p className="text-slate-700">{h.descripcionTrabajo}</p>
                    <div className="text-[11px] text-slate-500 flex items-center gap-3">
                      <span>Horómetro: {formatVE(h.horometroEnMantenimiento)} hrs</span>
                      {h.mecanicoOTaller && <span>Taller: {h.mecanicoOTaller}</span>}
                    </div>
                  </div>
                ))}
                {historialMantenimientos.length === 0 && (
                  <p className="text-center py-6 text-slate-500">No hay registros de mantenimiento para esta máquina.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR NUEVO RIESGO SST */}
      {modalRiesgoAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-600 flex items-center justify-center">
                  <IconWarning size={18} />
                </div>
                <h3 className="font-bold text-base text-slate-900">Nueva Evaluación de Riesgo IPERC (SST)</h3>
              </div>
              <button onClick={() => setModalRiesgoAbierto(false)} className="text-slate-500 hover:text-slate-900 p-1">
                <IconClose size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!proyectoSeleccionadoId) return;
                setErrorGlobal(null);
                try {
                  const idemKey = generarIdempotencyKey();
                  await crearRiesgoConstruccionApi(
                    proyectoSeleccionadoId,
                    {
                      codigo: formNuevoRiesgo.codigo.trim(),
                      procesoFrente: formNuevoRiesgo.procesoFrente.trim(),
                      peligro: formNuevoRiesgo.peligro.trim(),
                      riesgoConsecuencia: formNuevoRiesgo.riesgoConsecuencia.trim(),
                      categoria: formNuevoRiesgo.categoria,
                      probabilidad: Number(formNuevoRiesgo.probabilidad) || 1,
                      severidad: Number(formNuevoRiesgo.severidad) || 1,
                      medidasControl: formNuevoRiesgo.medidasControl.trim(),
                      responsable: formNuevoRiesgo.responsable.trim() || undefined,
                      fechaEvaluacion: formNuevoRiesgo.fechaEvaluacion,
                      observaciones: formNuevoRiesgo.observaciones.trim() || undefined
                    },
                    idemKey
                  );
                  notificarExito(`Riesgo ${formNuevoRiesgo.codigo} evaluado y registrado en la matriz.`);
                  setModalRiesgoAbierto(false);
                  recargarSubrecursosProyecto(proyectoSeleccionadoId);
                } catch (err: any) {
                  setErrorGlobal(err.message);
                }
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Código *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. RSG-ALT-01"
                    value={formNuevoRiesgo.codigo}
                    onChange={(e) => setFormNuevoRiesgo({ ...formNuevoRiesgo, codigo: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:border-rose-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Categoría *</label>
                  <select
                    value={formNuevoRiesgo.categoria}
                    onChange={(e) => setFormNuevoRiesgo({ ...formNuevoRiesgo, categoria: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-rose-500 focus:outline-none"
                  >
                    <option value="ALTURA">Trabajo en Altura</option>
                    <option value="ELECTRICO">Riesgo Eléctrico</option>
                    <option value="EXCAVACION">Excavación / Zanjas</option>
                    <option value="MAQUINARIA">Maquinaria y Atrapamiento</option>
                    <option value="QUIMICO">Químico / Asfaltos / Solutos</option>
                    <option value="ERGONOMICO">Ergonómico / Esfuerzo Físico</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Proceso o Frente de Obra *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Vaciado de Losas - Nivel 4"
                  value={formNuevoRiesgo.procesoFrente}
                  onChange={(e) => setFormNuevoRiesgo({ ...formNuevoRiesgo, procesoFrente: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Peligro Identificado *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Borde desprotegido sin barandas"
                    value={formNuevoRiesgo.peligro}
                    onChange={(e) => setFormNuevoRiesgo({ ...formNuevoRiesgo, peligro: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-rose-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Riesgo / Consecuencia *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Caída a distinto nivel / Traumatismo"
                    value={formNuevoRiesgo.riesgoConsecuencia}
                    onChange={(e) => setFormNuevoRiesgo({ ...formNuevoRiesgo, riesgoConsecuencia: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Probabilidad (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={formNuevoRiesgo.probabilidad}
                    onChange={(e) => setFormNuevoRiesgo({ ...formNuevoRiesgo, probabilidad: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Severidad (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={formNuevoRiesgo.severidad}
                    onChange={(e) => setFormNuevoRiesgo({ ...formNuevoRiesgo, severidad: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Evaluación P×S</label>
                  <div className="w-full bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 text-center font-black text-rose-600 font-mono text-sm">
                    {Number(formNuevoRiesgo.probabilidad) * Number(formNuevoRiesgo.severidad)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Medidas de Control Propuestas *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Instalación de líneas de vida, uso obligatorio de arnés con doble cabo y barandillas perimetrales..."
                  value={formNuevoRiesgo.medidasControl}
                  onChange={(e) => setFormNuevoRiesgo({ ...formNuevoRiesgo, medidasControl: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalRiesgoAbierto(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold"
                >
                  Registrar en Matriz IPERC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MITIGAR RIESGO */}
      {modalMitigarTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">Gestionar Riesgo: {modalMitigarTarget.codigo}</h3>
              <button onClick={() => setModalMitigarTarget(null)} className="text-slate-500 hover:text-slate-900 p-1">
                <IconClose size={18} />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setErrorGlobal(null);
                try {
                  await cambiarEstadoRiesgoConstruccionApi(
                    modalMitigarTarget.id!,
                    nuevoEstadoRiesgo,
                    medidasAdicionalesInput.trim() || undefined
                  );
                  notificarExito(`Estado de riesgo actualizado a ${nuevoEstadoRiesgo}.`);
                  setModalMitigarTarget(null);
                  if (proyectoSeleccionadoId) recargarSubrecursosProyecto(proyectoSeleccionadoId);
                } catch (err: any) {
                  setErrorGlobal(err.message);
                }
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Nuevo Estado *</label>
                <select
                  value={nuevoEstadoRiesgo}
                  onChange={(e) => setNuevoEstadoRiesgo(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                >
                  <option value="EN_MITIGACION">En Mitigación Activa</option>
                  <option value="CONTROLADO">Controlado / Mitigado</option>
                  <option value="RESIDUAL_ACEPTABLE">Riesgo Residual Aceptable</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Medidas Adicionales Aplicadas</label>
                <textarea
                  rows={3}
                  placeholder="Detallar inspección de seguridad, charlas de 5 min, verificación de arneses..."
                  value={medidasAdicionalesInput}
                  onChange={(e) => setMedidasAdicionalesInput(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalMitigarTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold"
                >
                  Actualizar Mitigación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SUBIR DOCUMENTO BIM O PLANO */}
      {modalBimAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">Registrar Plano Técnico o Modelo BIM</h3>
              <button onClick={() => setModalBimAbierto(false)} className="text-slate-500 hover:text-slate-900 p-1">
                <IconClose size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!proyectoSeleccionadoId) return;
                setErrorGlobal(null);
                try {
                  const idemKey = generarIdempotencyKey();
                  await crearDocumentoBimApi(
                    proyectoSeleccionadoId,
                    {
                      codigo: formNuevoBim.codigo.trim(),
                      titulo: formNuevoBim.titulo.trim(),
                      disciplina: formNuevoBim.disciplina,
                      formato: formNuevoBim.formato,
                      version: formNuevoBim.version.trim(),
                      autorProyectista: formNuevoBim.autorProyectista.trim() || undefined,
                      archivoUrl: formNuevoBim.archivoUrl.trim() || undefined,
                      pesoMb: Number(formNuevoBim.pesoMb) || undefined,
                      estadoRevision: formNuevoBim.estadoRevision,
                      observaciones: formNuevoBim.observaciones.trim() || undefined
                    },
                    idemKey
                  );
                  notificarExito(`Documento ${formNuevoBim.codigo} registrado exitosamente.`);
                  setModalBimAbierto(false);
                  recargarSubrecursosProyecto(proyectoSeleccionadoId);
                } catch (err: any) {
                  setErrorGlobal(err.message);
                }
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Código del Plano *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. PLN-EST-001"
                    value={formNuevoBim.codigo}
                    onChange={(e) => setFormNuevoBim({ ...formNuevoBim, codigo: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Formato *</label>
                  <select
                    value={formNuevoBim.formato}
                    onChange={(e) => setFormNuevoBim({ ...formNuevoBim, formato: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-sky-500 focus:outline-none"
                  >
                    <option value="IFC">IFC (Modelo BIM Abierto)</option>
                    <option value="RVT_REVIT">Revit (.RVT)</option>
                    <option value="DWG_AUTOCAD">AutoCAD (.DWG)</option>
                    <option value="PDF_PLANO">PDF Técnico</option>
                    <option value="NWD_NAVISWORKS">Navisworks (.NWD)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Título del Documento / Plano *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Planta Estructural Vigas y Losas Nivel +3.00"
                  value={formNuevoBim.titulo}
                  onChange={(e) => setFormNuevoBim({ ...formNuevoBim, titulo: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Disciplina *</label>
                  <select
                    value={formNuevoBim.disciplina}
                    onChange={(e) => setFormNuevoBim({ ...formNuevoBim, disciplina: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-sky-500 focus:outline-none"
                  >
                    <option value="ESTRUCTURAS">Estructuras</option>
                    <option value="ARQUITECTURA">Arquitectura</option>
                    <option value="INSTALACIONES_SANITARIAS">Instalaciones Sanitarias</option>
                    <option value="INSTALACIONES_ELECTRICAS">Instalaciones Eléctricas</option>
                    <option value="MECANICA_CLIMATIZACION">Mecánica / Climatización</option>
                    <option value="COORDINACION_GENERAL">Coordinación General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Versión *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Rev-B / v1.2"
                    value={formNuevoBim.version}
                    onChange={(e) => setFormNuevoBim({ ...formNuevoBim, version: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Autor Proyectista</label>
                  <input
                    type="text"
                    placeholder="Ej. Ing. Calculista"
                    value={formNuevoBim.autorProyectista}
                    onChange={(e) => setFormNuevoBim({ ...formNuevoBim, autorProyectista: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Peso (MB)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ej. 18.5"
                    value={formNuevoBim.pesoMb}
                    onChange={(e) => setFormNuevoBim({ ...formNuevoBim, pesoMb: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalBimAbierto(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold"
                >
                  Guardar Documento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EMITIR NUEVO RFI */}
      {modalRfiAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">Emitir Consulta Técnica (RFI)</h3>
              <button onClick={() => setModalRfiAbierto(false)} className="text-slate-500 hover:text-slate-900 p-1">
                <IconClose size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!proyectoSeleccionadoId) return;
                setErrorGlobal(null);
                try {
                  const idemKey = generarIdempotencyKey();
                  await crearRfiConstruccionApi(
                    proyectoSeleccionadoId,
                    {
                      numeroRfi: formNuevoRfi.numeroRfi.trim(),
                      asunto: formNuevoRfi.asunto.trim(),
                      disciplina: formNuevoRfi.disciplina,
                      documentoBimId: formNuevoRfi.documentoBimId ? Number(formNuevoRfi.documentoBimId) : undefined,
                      preguntaConsulta: formNuevoRfi.preguntaConsulta.trim(),
                      propuestaSolucion: formNuevoRfi.propuestaSolucion.trim() || undefined,
                      solicitante: formNuevoRfi.solicitante.trim(),
                      fechaLimite: formNuevoRfi.fechaLimite || undefined
                    },
                    idemKey
                  );
                  notificarExito(`RFI ${formNuevoRfi.numeroRfi} emitido a los proyectistas.`);
                  setModalRfiAbierto(false);
                  recargarSubrecursosProyecto(proyectoSeleccionadoId);
                } catch (err: any) {
                  setErrorGlobal(err.message);
                }
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Número RFI *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. RFI-EST-001"
                    value={formNuevoRfi.numeroRfi}
                    onChange={(e) => setFormNuevoRfi({ ...formNuevoRfi, numeroRfi: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Disciplina *</label>
                  <select
                    value={formNuevoRfi.disciplina}
                    onChange={(e) => setFormNuevoRfi({ ...formNuevoRfi, disciplina: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="ESTRUCTURAS">Estructuras</option>
                    <option value="ARQUITECTURA">Arquitectura</option>
                    <option value="MEP">MEP (Sanitarias / Eléctricas)</option>
                    <option value="GENERAL">General</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Asunto de la Consulta *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Interferencia de tubería sanitaria en viga de carga Eje 4"
                  value={formNuevoRfi.asunto}
                  onChange={(e) => setFormNuevoRfi({ ...formNuevoRfi, asunto: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Pregunta / Consulta Técnica *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Describa con precisión la discrepancia o duda de plano..."
                  value={formNuevoRfi.preguntaConsulta}
                  onChange={(e) => setFormNuevoRfi({ ...formNuevoRfi, preguntaConsulta: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Solicitante (Ing. Residente) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Ing. Juan Pérez"
                    value={formNuevoRfi.solicitante}
                    onChange={(e) => setFormNuevoRfi({ ...formNuevoRfi, solicitante: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Fecha Límite Requerida</label>
                  <input
                    type="date"
                    value={formNuevoRfi.fechaLimite}
                    onChange={(e) => setFormNuevoRfi({ ...formNuevoRfi, fechaLimite: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalRfiAbierto(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                >
                  Emitir RFI
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESPONDER RFI */}
      {modalResponderRfiTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">Responder RFI: {modalResponderRfiTarget.numeroRfi}</h3>
              <button onClick={() => setModalResponderRfiTarget(null)} className="text-slate-500 hover:text-slate-900 p-1">
                <IconClose size={18} />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setErrorGlobal(null);
                try {
                  await responderRfiConstruccionApi(
                    modalResponderRfiTarget.id!,
                    formRespuestaRfi.respuestaOficial.trim(),
                    formRespuestaRfi.responsableRespuesta.trim(),
                    formRespuestaRfi.estado
                  );
                  notificarExito(`Respuesta técnica emitida para ${modalResponderRfiTarget.numeroRfi}.`);
                  setModalResponderRfiTarget(null);
                  if (proyectoSeleccionadoId) recargarSubrecursosProyecto(proyectoSeleccionadoId);
                } catch (err: any) {
                  setErrorGlobal(err.message);
                }
              }}
              className="space-y-4 text-xs"
            >
              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <span className="text-slate-500 text-[11px] block font-semibold">Consulta planteada:</span>
                <p className="text-slate-800 mt-1">{modalResponderRfiTarget.preguntaConsulta}</p>
              </div>
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Respuesta Oficial del Proyectista *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detallar solución estructural aprobada o remitir a plano aclaratorio..."
                  value={formRespuestaRfi.respuestaOficial}
                  onChange={(e) => setFormRespuestaRfi({ ...formRespuestaRfi, respuestaOficial: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Profesional Responsable *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Ing. Proyectista Estructural"
                  value={formRespuestaRfi.responsableRespuesta}
                  onChange={(e) => setFormRespuestaRfi({ ...formRespuestaRfi, responsableRespuesta: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Estado de la Consulta</label>
                <select
                  value={formRespuestaRfi.estado}
                  onChange={(e) => setFormRespuestaRfi({ ...formRespuestaRfi, estado: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none"
                >
                  <option value="RESPONDIDO">Respondido (Conforme para ejecutar)</option>
                  <option value="CERRADO">Cerrado Definitivo</option>
                  <option value="EN_EVALUACION">En Evaluación Adicional</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalResponderRfiTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                >
                  Emitir Respuesta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

</div>
  );
}
