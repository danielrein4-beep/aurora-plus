import BitacoraAuditoria from "./BitacoraAuditoria";
import ModalBasculaBluetooth from "./ModalBasculaBluetooth";
import ModalImportarHato from "./ModalImportarHato";
import TenantSoporteWidget from "./TenantSoporteWidget";
import EngordeGanadero from "./EngordeGanadero";
import SociedadesCeba from "./SociedadesCeba";
import ModalVentaAnimales, { type ModoVenta } from "./ganaderia/ModalVentaAnimales";
import ModalJornadaOrdeno, { vacasDeOrdeno } from "./ganaderia/ModalJornadaOrdeno";
import ModalVacunacion, { type VacunacionAplicada } from "./ganaderia/ModalVacunacion";
import ModalReproduccion from "./ganaderia/ModalReproduccion";
import ModalCelo from "./ganaderia/ModalCelo";
import ModalMastitis from "./ganaderia/ModalMastitis";
import ModalOrdeno from "./ganaderia/ModalOrdeno";
import ModalGasto from "./ganaderia/ModalGasto";
import ModalRotarPotrero from "./ganaderia/ModalRotarPotrero";
import ModalPotrero, { potreroVacio, type FormPotrero } from "./ganaderia/ModalPotrero";
import { CATEGORIAS_GASTO_GANADERIA } from "./ganaderia/catalogos";
import ModalAltaAnimal, { type FormAltaAnimal } from "./ganaderia/ModalAltaAnimal";
import ModalEditarAnimal from "./ganaderia/ModalEditarAnimal";
import ModalPesaje from "./ganaderia/ModalPesaje";
import ModalFichaAnimal from "./ganaderia/ModalFichaAnimal";
import ModalTasasMonedas from "./ganaderia/ModalTasasMonedas";
import ModalPrecioLeche from "./ganaderia/ModalPrecioLeche";
import ModalDatosFiscales from "./ganaderia/ModalDatosFiscales";
import ModalDespachoLeche from "./ganaderia/ModalDespachoLeche";
import ModalCalibrarTanque from "./ganaderia/ModalCalibrarTanque";
import SeccionProduccion from "./ganaderia/SeccionProduccion";
import SeccionEventos from "./ganaderia/SeccionEventos";
import SeccionFinanzas from "./ganaderia/SeccionFinanzas";
import SeccionPotreros from "./ganaderia/SeccionPotreros";
import type { TabGanaderia, SubPotreros, SubInventario, SubSanidad } from "./ganaderia/tipos";
import ReportesCampoGanaderia, { abrirPdf, fechaLocalISO, BotonPdf } from "./ReportesCampoGanaderia";
import {
  encolarAccionGanaderia,
  contarPendientesGanaderia,
  procesarColaGanaderia,
  esFalloDeConexion,
  generarClaveIdempotencia,
} from "../offlineQueueGanaderia";
import { Fragment, useState, useEffect } from "react";
import { AuroraGradientDef } from "../Icons";
import ThemeToggle from "./ThemeToggle";
import {
  IconCheckCircle, IconClose, IconDownload, IconFileText,
  IconCalendar, IconCard, IconCustomize, IconRocket, IconChart,
  IconPrescription, IconUsers, IconHourglass,
  IconWheat, IconSyringe, IconWrench, IconTractor, IconTruck, IconBolt, IconBox,
  IconWarning, IconFire, IconMilk, IconEdit, IconSettings, IconPin, IconCow,
  IconSnowflake, IconTag, IconShield, IconDna, IconScale, IconSprout, IconCart,
  IconMeat, IconRefresh, IconBulb, IconCoins, IconDashboardGrid, IconUpload
} from "../Icons";
import GanaderiaMapa from "./GanaderiaMapa";
import { useAuth } from "../context/AuthContext";
import * as XLSX from "xlsx";
import {
  listarAnimalesGanaderia, crearAnimalGanaderia, actualizarAnimalGanaderia, moverAnimalGanaderia,
  registrarVentaGanaderia,
  listarPotrerosGanaderia, crearPotreroGanaderia, actualizarPotreroGanaderia, rotarPotreroGanaderia,
  registrarOrdenoGanaderia, obtenerReporteOrdenoGanaderia,
  registrarPesoGanaderia, obtenerGdpGanaderia,
  listarVacunasGanaderia, crearVacunaGanaderia, aplicarVacunaGanaderia, aplicarVacunaLoteGanaderia,
  obtenerAlertasGanaderia, registrarEventoReproductivoGanaderia,
  obtenerAlertasSanitariasGanaderia, obtenerVacunasPorAnimal, obtenerMedicamentosPorAnimal,
  obtenerDatosFiscalesNegocio, actualizarDatosFiscalesNegocio,
  descargarNotaEntregaVentaAnimalPdf, descargarNotaEntregaDespachoLechePdf, descargarAlertasSanitariasExcel,
  obtenerEventosReproductivosPorHembra, obtenerCurvaPesoGanaderia,
  registrarMastitisGanaderia,
  obtenerStockTanqueLeche, registrarDespachoLecheTanque, obtenerVentasLecheTanque, configurarTanqueLeche,
  listarGastosGanaderia, crearGastoGanaderia, listarVentasGanaderia,
  type AnimalGanaderia, type PotreroGanaderia, type RegistroOrdenoGanaderia,
  type TableroAlertasGanaderia, type VacunaGanaderia,
  type AlertaSanitariaGanaderia, type AplicacionVacunaGanaderia, type AplicacionMedicamentoGanaderia,
  type EventoReproductivoGanaderia, type RegistroPesoGanaderia,
  type GdpGanaderiaResponse,
  type TanqueLeche, type VentaLecheTanque,
  type GastoGanaderia, type VentaGanaderiaResumen,
  listarPrenezActualGanaderia, type PrenezActualGanaderia, descargarConstanciaVacunacionPdf,
  tasaVigente, actualizarTasa, descargarInventarioHatoPdf, descargarReportePotrerosPdf,
} from "../api";

interface Props {
  onSalir: () => void;
  // Presente cuando se entra por el QR de un animal (deep link /ganaderia/animal/:id):
  // salta directo a su ficha en Sanidad & Trazabilidad en vez del Panel General.
  deepLinkAnimalId?: number;
}

// Datos de demostración de alto realismo para cuando el backend está sin datos o en carga
const DEMO_POTREROS: PotreroGanaderia[] = [
  { id: 101, tenantId: 1, codigo: "POT-01", nombre: "Potrero 1 - El Roble", areaHectareas: 14.5, capacidadAnimales: 25, tipoPasto: "Brachiaria decumbens", color: "#10B981", diasDescansoMinimo: 28, estado: "ACTIVO", ordenRotacion: 1, observaciones: "Cerca viva de matarratón, agua de morichal." },
  { id: 102, tenantId: 1, codigo: "POT-02", nombre: "Potrero 2 - Los Samanes", areaHectareas: 18.0, capacidadAnimales: 32, tipoPasto: "Guinea Mombaza", color: "#F59E0B", diasDescansoMinimo: 35, estado: "EN_DESCANSO", ordenRotacion: 2, fechaInicioDescanso: "2026-09-01", observaciones: "Sombra natural abundante, descanso de 10 días." },
  { id: 103, tenantId: 1, codigo: "POT-03", nombre: "Potrero 3 - La Vega", areaHectareas: 12.0, capacidadAnimales: 20, tipoPasto: "Estrella Africana", color: "#3B82F6", diasDescansoMinimo: 24, estado: "EN_DESCANSO", ordenRotacion: 3, fechaInicioDescanso: "2026-09-05", observaciones: "Borde de río, drenaje rápido." },
  { id: 104, tenantId: 1, codigo: "POT-04", nombre: "Potrero 4 - Maternidad", areaHectareas: 6.5, capacidadAnimales: 10, tipoPasto: "Pasto Mulato II", color: "#8B5CF6", diasDescansoMinimo: 21, estado: "ACTIVO", ordenRotacion: 4, observaciones: "Junto a la vaquera para monitoreo 24/7." }
];

const DEMO_ANIMALES: AnimalGanaderia[] = [
  { id: 201, tenantId: 1, arete: "V-042", nombre: "Mariposa", especie: "BOVINO", raza: "Gyr Lechero", sexo: "HEMBRA", tipoAnimal: "VACA", fechaNacimiento: "2021-04-12", pesoActual: 465, estado: "ACTIVO", potrero: DEMO_POTREROS[0], valorEstimado: 1200, lote: "Lote Entrada Marzo 2026" },
  { id: 202, tenantId: 1, arete: "V-089", nombre: "Lucero", especie: "BOVINO", raza: "Jersey", sexo: "HEMBRA", tipoAnimal: "VACA", fechaNacimiento: "2022-01-20", pesoActual: 420, estado: "ACTIVO", potrero: DEMO_POTREROS[0], valorEstimado: 1350, lote: "Lote Entrada Marzo 2026" },
  { id: 203, tenantId: 1, arete: "T-015", nombre: "Diamante", especie: "BOVINO", raza: "Brahman Blanco", sexo: "MACHO", tipoAnimal: "TORO", fechaNacimiento: "2020-08-15", pesoActual: 820, estado: "ACTIVO", potrero: DEMO_POTREROS[0], valorEstimado: 2800, lote: "Compra Feria San Cristóbal" },
  { id: 204, tenantId: 1, arete: "N-104", nombre: "Esperanza", especie: "BOVINO", raza: "F1 Girolando", sexo: "HEMBRA", tipoAnimal: "NOVILLA", fechaNacimiento: "2024-03-10", pesoActual: 330, estado: "ACTIVO", potrero: DEMO_POTREROS[3], valorEstimado: 850, lote: "Lote Entrada Marzo 2026" },
  { id: 205, tenantId: 1, arete: "C-205", nombre: "Relámpago", especie: "BOVINO", raza: "Gyr x Holstein", sexo: "MACHO", tipoAnimal: "TERNERO", fechaNacimiento: "2026-06-02", pesoActual: 98, estado: "ACTIVO", potrero: DEMO_POTREROS[3], valorEstimado: 400, lote: "Nacimientos Finca 2026" },
  { id: 206, tenantId: 1, arete: "M-112", nombre: "Bandera", especie: "BOVINO", raza: "Carora", sexo: "HEMBRA", tipoAnimal: "MAUTA", fechaNacimiento: "2025-02-14", pesoActual: 240, estado: "ACTIVO", potrero: DEMO_POTREROS[0], valorEstimado: 650, lote: "Compra Feria San Cristóbal" },
  { id: 207, tenantId: 1, arete: "NV-08", nombre: "Barcino", especie: "BOVINO", raza: "Brahman Rojo", sexo: "MACHO", tipoAnimal: "NOVILLO", fechaNacimiento: "2023-11-05", pesoActual: 510, estado: "ACTIVO", potrero: DEMO_POTREROS[0], valorEstimado: 1100, lote: "Lote Entrada Marzo 2026" },
  { id: 208, tenantId: 1, arete: "B-031", nombre: "Canela", especie: "BOVINO", raza: "Senepol", sexo: "HEMBRA", tipoAnimal: "BECERRA", fechaNacimiento: "2026-05-18", pesoActual: 85, estado: "ACTIVO", potrero: DEMO_POTREROS[3], valorEstimado: 380, lote: "Nacimientos Finca 2026" },
];

const DEMO_ORDENOS: RegistroOrdenoGanaderia[] = [
  { id: 301, tenantId: 1, animal: DEMO_ANIMALES[0], fecha: "2026-09-11", turno: "MANANA", cantidadLitros: 14.5, precioVentaLitro: 0.55, montoVenta: 7.97, porcentajeGrasa: 3.8, porcentajeProteina: 3.2 },
  { id: 302, tenantId: 1, animal: DEMO_ANIMALES[1], fecha: "2026-09-11", turno: "MANANA", cantidadLitros: 16.2, precioVentaLitro: 0.55, montoVenta: 8.91, porcentajeGrasa: 4.4, porcentajeProteina: 3.5 },
  { id: 303, tenantId: 1, animal: DEMO_ANIMALES[0], fecha: "2026-09-10", turno: "TARDE", cantidadLitros: 9.8, precioVentaLitro: 0.55, montoVenta: 5.39, porcentajeGrasa: 3.9, porcentajeProteina: 3.1 },
];

const DEFAULT_VACUNAS_CATALOGO: VacunaGanaderia[] = [
  { id: 1, tenantId: 1, nombre: "Aftosa Bivalente (A+O)", diasParaRefuerzo: 180, diasRetiroLeche: 0, diasRetiroCarne: 0 },
  { id: 2, tenantId: 1, nombre: "Rabia Paralítica Bovina", diasParaRefuerzo: 365, diasRetiroLeche: 0, diasRetiroCarne: 0 },
  { id: 3, tenantId: 1, nombre: "Triple Bovina (Clostridiosis)", diasParaRefuerzo: 365, diasRetiroLeche: 0, diasRetiroCarne: 21 },
  { id: 4, tenantId: 1, nombre: "Ivermectina 1% Endectocida", diasParaRefuerzo: 90, diasRetiroLeche: 28, diasRetiroCarne: 35 },
];

export default function GanaderiaApp({ onSalir, deepLinkAnimalId }: Props) {
  const { user } = useAuth();
  const tenantId = user?.tenantId ? Number(user.tenantId) : 1;

  // Tasas de cambio multi-moneda (configurables a mano y persistidas)
  const [tasaBCV, setTasaBCV] = useState<number>(() => {
    try {
      const g = localStorage.getItem("aurora_ganaderia_tasa_bcv");
      return g ? Number(g) || 43.50 : 43.50;
    } catch {
      return 43.50;
    }
  });

  const [tasaCOP, setTasaCOP] = useState<number>(() => {
    try {
      const g = localStorage.getItem("aurora_ganaderia_tasa_cop");
      return g ? Number(g) || 4150.0 : 4150.0;
    } catch {
      return 4150.0;
    }
  });

  // Configuración de monedas activables por finca (USD siempre activa, VES y COP configurables)
  const [monedasConfig, setMonedasConfig] = useState<{ USD: boolean; VES: boolean; COP: boolean }>(() => {
    try {
      const c = localStorage.getItem(`aurora_finca_config_${tenantId}`);
      if (c) {
        const parsed = JSON.parse(c);
        return {
          USD: true,
          VES: parsed.VES !== false,
          COP: parsed.COP !== false,
        };
      }
    } catch {}
    return { USD: true, VES: true, COP: true };
  });

  const guardarMonedasConfig = (ves: boolean, cop: boolean) => {
    const conf = { USD: true, VES: ves, COP: cop };
    setMonedasConfig(conf);
    try {
      localStorage.setItem(`aurora_finca_config_${tenantId}`, JSON.stringify(conf));
    } catch {}
  };

  // Precio de leche centralizado editable por tenant
  const [precioLecheUSD, setPrecioLecheUSD] = useState<number>(() => {
    try {
      const p = localStorage.getItem(`aurora_ganaderia_precio_leche_usd_${tenantId}`);
      return p ? Number(p) || 0.55 : 0.55;
    } catch {
      return 0.55;
    }
  });
  const [modalEditarPrecioLeche, setModalEditarPrecioLeche] = useState(false);

  const guardarPrecioLeche = (nuevoPrecio: number) => {
    setPrecioLecheUSD(nuevoPrecio);
    try {
      localStorage.setItem(`aurora_ganaderia_precio_leche_usd_${tenantId}`, String(nuevoPrecio));
    } catch {}
    setModalEditarPrecioLeche(false);
    notificar(`Precio de la leche actualizado a $${nuevoPrecio.toFixed(2)} USD / Litro`);
  };

  const [modalEditarTasas, setModalEditarTasas] = useState(false);

  const guardarTasas = (nuevaBcv: number, nuevaCop: number, vesActivo?: boolean, copActivo?: boolean) => {
    setTasaBCV(nuevaBcv);
    setTasaCOP(nuevaCop);
    if (vesActivo !== undefined && copActivo !== undefined) {
      guardarMonedasConfig(vesActivo, copActivo);
    }
    try {
      localStorage.setItem("aurora_ganaderia_tasa_bcv", String(nuevaBcv));
      localStorage.setItem("aurora_ganaderia_tasa_cop", String(nuevaCop));
    } catch {}
    setModalEditarTasas(false);
    // El motor financiero (caja, despachos, ventas) usa las tasas del backend:
    // sin esto Ganadería mostraba una tasa y el backend rechazaba toda venta en Bs/COP.
    Promise.all([
      nuevaBcv > 0 ? actualizarTasa(tenantId, { monedaOrigen: "USD", monedaDestino: "VES", tasa: nuevaBcv, origen: "PERSONALIZADA" }) : null,
      nuevaCop > 0 ? actualizarTasa(tenantId, { monedaOrigen: "USD", monedaDestino: "COP", tasa: nuevaCop, origen: "PERSONALIZADA" }) : null,
    ]).catch((err: any) => notificar(`Las tasas quedaron en pantalla pero no se guardaron en el sistema: ${err?.message || "revise la conexión"}`));
  };

  // Tanque de Leche & Ventas en Cisterna
  const [tanqueLeche, setTanqueLeche] = useState<TanqueLeche | null>(null);
  const [ventasLeche, setVentasLeche] = useState<VentaLecheTanque[]>([]);
  const [modalVentaLeche, setModalVentaLeche] = useState(false);
  const [modalAjusteTanque, setModalAjusteTanque] = useState(false);

  // Gastos Operativos del Hato & Ventas de Animales
  const [gastos, setGastos] = useState<GastoGanaderia[]>([]);
  const [ventasAnimales, setVentasAnimales] = useState<VentaGanaderiaResumen[]>([]);
  const [gastoAbierto, setGastoAbierto] = useState(false);

  // Pestaña principal activa
  const [tab, setTab] = useState<TabGanaderia>("resumen");
  const [sidebarAbierto, setSidebarAbierto] = useState(false);
  const [aperturaSoporte, setAperturaSoporte] = useState(0);

  // Sub-vistas Sanidad & Trazabilidad
  const [subSanidad, setSubSanidad] = useState<SubSanidad>("individual");
  const [animalFichaId, setAnimalFichaId] = useState<number | null>(null);
  const [alertasSanitarias, setAlertasSanitarias] = useState<AlertaSanitariaGanaderia[]>([]);
  const [fichaVacunas, setFichaVacunas] = useState<AplicacionVacunaGanaderia[]>([]);
  const [fichaMedicamentos, setFichaMedicamentos] = useState<AplicacionMedicamentoGanaderia[]>([]);
  const [fichaEventosRepro, setFichaEventosRepro] = useState<EventoReproductivoGanaderia[]>([]);
  const [fichaPesos, setFichaPesos] = useState<RegistroPesoGanaderia[]>([]);
  const [fichaGdp, setFichaGdp] = useState<GdpGanaderiaResponse | null>(null);
  const [cargandoFicha, setCargandoFicha] = useState(false);

  // Sub-vistas por pestaña
  const [subPotreros, setSubPotreros] = useState<SubPotreros>("lista");
  const [subInventario, setSubInventario] = useState<SubInventario>("matriz");

  // Estados de datos
  const [animales, setAnimales] = useState<AnimalGanaderia[]>([]);
  // Animales activos en el hato (excluye vendidos/muertos) — usado en conteos y selectores operativos
  const animalesActivos = animales.filter(a => a.estado === "ACTIVO" || !a.estado);
  const [potreros, setPotreros] = useState<PotreroGanaderia[]>([]);
  const [ordenos, setOrdenos] = useState<RegistroOrdenoGanaderia[]>([]);
  const [vacunas, setVacunas] = useState<VacunaGanaderia[]>(DEFAULT_VACUNAS_CATALOGO);
  const [alertas, setAlertas] = useState<TableroAlertasGanaderia | null>(null);

  // Filtros
  const [filtroCategoria, setFiltroCategoria] = useState<string>("TODOS");
  const [busquedaArete, setBusquedaArete] = useState<string>("");

  // Modales
  const [altaAnimal, setAltaAnimal] = useState<Partial<FormAltaAnimal> | null>(null);
  const [modalImportarHato, setModalImportarHato] = useState(false);
  // Última jornada de vacunación registrada: ofrece descargar su constancia PDF.
  const [ultimaVacunacion, setUltimaVacunacion] = useState<{ fecha: string; vacunaId: number; nombre: string; cantidad: number } | null>(null);
  const [prenezActual, setPrenezActual] = useState<PrenezActualGanaderia[]>([]);
  const [categoriaExpandida, setCategoriaExpandida] = useState<string | null>(null);
  const puedeImportarHato = user?.rol === "DUENO_ADMIN" || user?.rol === "ADMINISTRADOR_FINCA";
  const [potreroEnModal, setPotreroEnModal] = useState<{ form: FormPotrero; editandoId: number | null } | null>(null);
  const [modalRotar, setModalRotar] = useState<PotreroGanaderia | null>(null);
  const [ordenoAbierto, setOrdenoAbierto] = useState(false);
  const [modalPesaje, setModalPesaje] = useState<AnimalGanaderia | null>(null);
  const [estaOnline, setEstaOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [pendientesOffline, setPendientesOffline] = useState(0);
  const [sincronizandoOffline, setSincronizandoOffline] = useState(false);
  const [vacunaAbierta, setVacunaAbierta] = useState<{ animalId?: number } | null>(null);
  const [reproAbierta, setReproAbierta] = useState<{ tipo?: string; resultado?: string } | null>(null);
  const [celoAbierto, setCeloAbierto] = useState(false);
  const [mastitisAbierta, setMastitisAbierta] = useState(false);
  const [modalFichaAnimal, setModalFichaAnimal] = useState<AnimalGanaderia | null>(null);
  const [ventaAbierta, setVentaAbierta] = useState<ModoVenta | null>(null);
  const [modalEditarAnimal, setModalEditarAnimal] = useState<AnimalGanaderia | null>(null);
  const [modalDatosFiscales, setModalDatosFiscales] = useState(false);


  // Modo vaquera rápida (jornada de ordeño de todo el rebaño): ver ganaderia/ModalJornadaOrdeno
  const [vaqueraAbierta, setVaqueraAbierta] = useState(false);


  // Notificaciones flotantes
  const [notificacion, setNotificacion] = useState<string | null>(null);

  const notificar = (msg: string) => {
    setNotificacion(msg);
    setTimeout(() => setNotificacion(null), 3500);
  };

  // Cargar datos iniciales desde el backend
  useEffect(() => {
    cargarDatos();
    obtenerAlertasSanitariasGanaderia(tenantId)
      .then(setAlertasSanitarias)
      .catch(() => setAlertasSanitarias([]));
  }, [tenantId]);

  // Auto-seleccionar primer animal real para Ficha Sanitaria si no hay ninguno seleccionado
  useEffect(() => {
    if (animales.length > 0) {
      if (!animalFichaId || !animales.some(a => a.id === animalFichaId)) {
        setAnimalFichaId(animales[0].id);
      }
    } else {
      setAnimalFichaId(null);
    }
  }, [animales, animalFichaId]);

  // Deep link desde el QR de un animal (/ganaderia/animal/:id): en cuanto
  // carga la lista real, salta directo a su ficha en Sanidad & Trazabilidad
  // en vez de dejar al usuario en el Panel General.
  useEffect(() => {
    if (!deepLinkAnimalId || animales.length === 0) return;
    if (!animales.some(a => a.id === deepLinkAnimalId)) return;
    setTab("sanidad");
    setSubSanidad("individual");
    setAnimalFichaId(deepLinkAnimalId);
  }, [deepLinkAnimalId, animales]);


  useEffect(() => {
    if (!animalFichaId) return;
    setCargandoFicha(true);
    const sel = animales.find(a => a.id === animalFichaId);
    Promise.all([
      obtenerVacunasPorAnimal(animalFichaId).catch(() => []),
      obtenerMedicamentosPorAnimal(animalFichaId).catch(() => []),
      sel && sel.sexo === "HEMBRA" ? obtenerEventosReproductivosPorHembra(animalFichaId).catch(() => []) : Promise.resolve([]),
      obtenerCurvaPesoGanaderia(animalFichaId).catch(() => []),
      obtenerGdpGanaderia(animalFichaId).catch(() => null)
    ]).then(([vacs, meds, repros, pesos, gdp]) => {
      setFichaVacunas(vacs);
      setFichaMedicamentos(meds);
      setFichaEventosRepro(repros);
      setFichaPesos(pesos);
      setFichaGdp(gdp);
    }).finally(() => {
      setCargandoFicha(false);
    });
  }, [animalFichaId, animales]);

  const cargarDatos = async () => {
    try {
      const [resAnimales, resPotreros, resVacunas, resAlertas, resPrenez] = await Promise.allSettled([
        listarAnimalesGanaderia(),
        listarPotrerosGanaderia(),
        listarVacunasGanaderia(),
        obtenerAlertasGanaderia(tenantId, 30),
        listarPrenezActualGanaderia(),
      ]);

      if (resPrenez.status === "fulfilled") {
        setPrenezActual(resPrenez.value ?? []);
      }

      // Tasas: la vigente del backend es la que usa caja; si existe, es la que se muestra.
      const [tVes, tCop] = await Promise.allSettled([tasaVigente(tenantId, "USD", "VES"), tasaVigente(tenantId, "USD", "COP")]);
      if (tVes.status === "fulfilled" && Number(tVes.value?.tasa) > 0) setTasaBCV(Number(tVes.value.tasa));
      if (tCop.status === "fulfilled" && Number(tCop.value?.tasa) > 0) setTasaCOP(Number(tCop.value.tasa));

      if (resAnimales.status === "fulfilled") {
        setAnimales(resAnimales.value ?? []);
      }
      if (resPotreros.status === "fulfilled") {
        setPotreros(resPotreros.value ?? []);
      }
      if (resVacunas.status === "fulfilled") {
        setVacunas(resVacunas.value ?? []);
      }
      if (resAlertas.status === "fulfilled" && resAlertas.value) {
        setAlertas(resAlertas.value);
      }

      const hoy = new Date().toISOString().slice(0, 10);
      const hace30d = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      try {
        const repOrdeno = await obtenerReporteOrdenoGanaderia(tenantId, hace30d, hoy);
        setOrdenos(repOrdeno?.registros ?? []);
      } catch {}

      // Cargar estado del tanque de leche y ventas históricas
      try {
        const tanque = await obtenerStockTanqueLeche(tenantId);
        setTanqueLeche(tanque);
      } catch {}
      try {
        const ventas = await obtenerVentasLecheTanque(tenantId);
        setVentasLeche(ventas ?? []);
      } catch {}

      // Cargar gastos operativos y ventas de animales
      try {
        const [resGastos, resVentasAnimales] = await Promise.allSettled([
          listarGastosGanaderia(tenantId),
          listarVentasGanaderia(),
        ]);
        if (resGastos.status === "fulfilled" && resGastos.value) {
          setGastos(resGastos.value ?? []);
        }
        if (resVentasAnimales.status === "fulfilled" && resVentasAnimales.value) {
          setVentasAnimales(resVentasAnimales.value ?? []);
        }
      } catch {}
    } catch (err) {
      console.warn("No se pudo cargar la información real de Ganadería desde el backend:", err);
    }
  };

  // Métricas calculadas
  const totalAnimales = animalesActivos.length;
  const vacasOrdeno = animalesActivos.filter(a => a.tipoAnimal === "VACA" && a.sexo === "HEMBRA").length;
  const totalHectareas = potreros.reduce((sum, p) => sum + (Number(p.areaHectareas) || 0), 0);
  const cargaAnimalHa = totalHectareas > 0 ? (totalAnimales / totalHectareas).toFixed(2) : "0.00";
  const litrosHoy = ordenos
    .filter(o => o.fecha === new Date().toISOString().slice(0, 10))
    .reduce((sum, o) => sum + (Number(o.cantidadLitros) || 0), 0);
  const ingresosLecheHoy = litrosHoy * precioLecheUSD;

  // Matriz de Categorías Canónicas del Hato (GanSoft Style)
  // El tipoAnimal elegido por el usuario en el Alta SIEMPRE manda; el peso solo
  // clasifica como respaldo cuando el animal no trae un tipoAnimal reconocido
  // (dato legado). Antes el respaldo por peso se evaluaba en paralelo al tipo
  // real, así que un Toro joven (p.ej. 259 kg) se contaba a la vez en "Toros" y
  // en "Mautes" por caer en ese rango de peso.
  const TIPOS_HEMBRA_CONOCIDOS = ["BECERRA", "MAUTA", "NOVILLA", "VACA"];
  const TIPOS_MACHO_CONOCIDOS = ["TERNERO", "BECERRO", "MAUTE", "NOVILLO", "TORO"];
  const categoriasHato = [
    { key: "BECERRA", label: "Becerras", filter: (a: AnimalGanaderia) => a.sexo === "HEMBRA" && (a.tipoAnimal === "BECERRA" || (!TIPOS_HEMBRA_CONOCIDOS.includes(a.tipoAnimal || "") && (a.pesoActual || 0) < 120)) },
    { key: "MAUTA", label: "Mautas", filter: (a: AnimalGanaderia) => a.sexo === "HEMBRA" && (a.tipoAnimal === "MAUTA" || (!TIPOS_HEMBRA_CONOCIDOS.includes(a.tipoAnimal || "") && (a.pesoActual || 0) >= 120 && (a.pesoActual || 0) < 280)) },
    { key: "NOVILLA", label: "Novillas", filter: (a: AnimalGanaderia) => a.sexo === "HEMBRA" && a.tipoAnimal === "NOVILLA" },
    { key: "VACA", label: "Vacas", filter: (a: AnimalGanaderia) => a.sexo === "HEMBRA" && a.tipoAnimal === "VACA" },
    { key: "BECERRO", label: "Becerros", filter: (a: AnimalGanaderia) => a.sexo === "MACHO" && (a.tipoAnimal === "TERNERO" || a.tipoAnimal === "BECERRO" || (!TIPOS_MACHO_CONOCIDOS.includes(a.tipoAnimal || "") && (a.pesoActual || 0) < 130)) },
    { key: "MAUTE", label: "Mautes", filter: (a: AnimalGanaderia) => a.sexo === "MACHO" && (a.tipoAnimal === "MAUTE" || (!TIPOS_MACHO_CONOCIDOS.includes(a.tipoAnimal || "") && (a.pesoActual || 0) >= 130 && (a.pesoActual || 0) < 320)) },
    { key: "NOVILLO", label: "Novillos", filter: (a: AnimalGanaderia) => a.sexo === "MACHO" && (a.tipoAnimal === "NOVILLO" || (!TIPOS_MACHO_CONOCIDOS.includes(a.tipoAnimal || "") && (a.pesoActual || 0) >= 320 && (a.pesoActual || 0) < 600)) },
    { key: "TORO", label: "Toros", filter: (a: AnimalGanaderia) => a.sexo === "MACHO" && a.tipoAnimal === "TORO" },
  ];

  // Conteo por categoría
  const matrizConteos = categoriasHato.map(cat => ({
    ...cat,
    count: animalesActivos.filter(cat.filter).length,
    pesoPromedio: Math.round(
      animalesActivos.filter(cat.filter).reduce((sum, a) => sum + (a.pesoActual || 0), 0) /
      Math.max(1, animalesActivos.filter(cat.filter).length)
    ),
  }));

  // Desglose del hato: dentro de cada categoría, cuántos por raza y, de las
  // hembras, cuántas preñadas y de qué padrote (último servicio/diagnóstico).
  const SIN_PADROTE = "Sin padrote registrado";
  const prenezPorHembra = new Map(prenezActual.map(p => [p.hembraId, p]));
  const padroteDe = (a: AnimalGanaderia) => {
    const p = prenezPorHembra.get(a.id);
    return p ? (p.padrote || SIN_PADROTE) : null;
  };
  const desglosePorRaza = (lista: AnimalGanaderia[]) => {
    const grupos = new Map<string, { raza: string; cabezas: number; prenadas: number; porPadrote: Map<string, number> }>();
    for (const a of lista) {
      const raza = a.raza?.trim() || "Sin raza";
      const g = grupos.get(raza) ?? { raza, cabezas: 0, prenadas: 0, porPadrote: new Map<string, number>() };
      g.cabezas++;
      const padrote = padroteDe(a);
      if (padrote) {
        g.prenadas++;
        g.porPadrote.set(padrote, (g.porPadrote.get(padrote) ?? 0) + 1);
      }
      grupos.set(raza, g);
    }
    return [...grupos.values()].sort((x, y) => y.cabezas - x.cabezas);
  };
  const prenezPorPadrote = (() => {
    const grupos = new Map<string, { padrote: string; prenadas: number; porRaza: Map<string, number> }>();
    for (const a of animalesActivos) {
      const padrote = padroteDe(a);
      if (!padrote) continue;
      const g = grupos.get(padrote) ?? { padrote, prenadas: 0, porRaza: new Map<string, number>() };
      g.prenadas++;
      const raza = a.raza?.trim() || "Sin raza";
      g.porRaza.set(raza, (g.porRaza.get(raza) ?? 0) + 1);
      grupos.set(padrote, g);
    }
    // "Sin padrote registrado" siempre al final
    return [...grupos.values()].sort((x, y) =>
      (x.padrote === SIN_PADROTE ? 1 : 0) - (y.padrote === SIN_PADROTE ? 1 : 0) || y.prenadas - x.prenadas);
  })();
  const totalPrenadas = prenezPorPadrote.reduce((s, g) => s + g.prenadas, 0);

  // Filtrado de animales
  const animalesFiltrados = animales.filter(a => {
    const coincideCat = filtroCategoria === "TODOS" || a.tipoAnimal?.toUpperCase() === filtroCategoria.toUpperCase();
    const coincideBusqueda =
      a.arete.toLowerCase().includes(busquedaArete.toLowerCase()) ||
      (a.nombre && a.nombre.toLowerCase().includes(busquedaArete.toLowerCase())) ||
      (a.raza && a.raza.toLowerCase().includes(busquedaArete.toLowerCase()));
    return coincideCat && coincideBusqueda;
  });

  // Abre el modal de edición precargado con los datos reales del animal
  const abrirEditarAnimal = (animal: AnimalGanaderia) => setModalEditarAnimal(animal);

  // Abre la venta de animales; "MULTIPLE" = vender un lote seleccionando varios animales.
  const abrirVentaAnimales = (modo: ModoVenta) => setVentaAbierta(modo);
  // Abre el modal en modo "crear" (limpio, sin arrastrar datos de una edición previa)
  const abrirNuevoPotrero = () => setPotreroEnModal({ form: potreroVacio(potreros.length + 1), editandoId: null });

  // Abre el modal en modo "editar", precargado con los datos reales del potrero
  const abrirEditarPotrero = (potrero: PotreroGanaderia) => setPotreroEnModal({
    editandoId: potrero.id,
    form: {
      codigo: potrero.codigo || "",
      nombre: potrero.nombre,
      areaHectareas: Number(potrero.areaHectareas) || 0,
      capacidadAnimales: Number(potrero.capacidadAnimales) || 0,
      tipoPasto: potrero.tipoPasto || "",
      color: potrero.color || "#10B981",
      diasDescansoMinimo: Number(potrero.diasDescansoMinimo) || 28,
      observaciones: potrero.observaciones || "",
      poligono: potrero.poligono,
    },
  });

  // Manejador cuando el usuario traza un potrero en el mapa satelital
  const handleGuardarPotreroTrazado = (datos: { poligono: [number, number][]; hectareas: number }) => {
    setPotreroEnModal({
      editandoId: null,
      form: {
        codigo: `POT-${(potreros.length + 1).toString().padStart(2, "0")}`,
        nombre: `Potrero Trazado #${potreros.length + 1}`,
        areaHectareas: datos.hectareas,
        capacidadAnimales: Math.max(1, Math.round(datos.hectareas * 1.8)),
        tipoPasto: "Brachiaria brizantha",
        color: "#10B981",
        diasDescansoMinimo: 28,
        observaciones: `Georreferenciado sobre imagen satelital (${datos.poligono.length} postes).`,
        poligono: datos.poligono,
      },
    });
    notificar(`Potrero trazado con ${datos.hectareas} ha. Completa los datos para guardarlo.`);
  };

  const alGuardarPotrero = (guardado: PotreroGanaderia, esEdicion: boolean) =>
    setPotreros(prev => esEdicion ? prev.map(p => p.id === guardado.id ? guardado : p) : [...prev, guardado]);

  // Abrir Modo Vaquera Rápida (Bulk Entry de Ordeño)
  const abrirVaqueraRapida = () => {
    if (vacasDeOrdeno(animalesActivos).length === 0) {
      notificar("No hay vacas u novillas registradas en el hato todavía. Da de alta tus animales antes de usar Vaquera Rápida.");
      return;
    }
    setVaqueraAbierta(true);
  };

  // Jornada guardada: suma los ordeños a la lista y los litros comerciales al tanque.
  const alGuardarJornada = (nuevosOrdenos: RegistroOrdenoGanaderia[], litrosAlTanque: number) => {
    setOrdenos(prev => [...nuevosOrdenos, ...prev]);
    if (litrosAlTanque > 0) {
      setTanqueLeche(prev => prev ? {
        ...prev,
        stockActualLitros: (Number(prev.stockActualLitros) || 0) + litrosAlTanque
      } : {
        id: 1,
        tenantId,
        stockActualLitros: litrosAlTanque,
        capacidadLitros: 2000,
        temperaturaCelsius: 4.0
      });
    }
  };

  // Rotación hecha (o encolada sin señal): el origen entra en descanso y el destino en uso.
  const alRotarPotrero = (origenId: number, destinoId: number, offline: boolean) => {
    const hoy = fechaLocalISO();
    if (offline) setPendientesOffline(contarPendientesGanaderia(tenantId));
    setPotreros(prev => prev.map(p => {
      if (p.id === origenId) return { ...p, estado: "EN_DESCANSO", fechaInicioDescanso: hoy };
      if (p.id === destinoId) return { ...p, estado: "ACTIVO", fechaInicioUso: hoy };
      return p;
    }));
  };

  // Ordeño individual guardado: a la lista y, si fue al tanque, al stock del tanque.
  const alRegistrarOrdeno = (nuevoReg: RegistroOrdenoGanaderia, litrosAlTanque: number) =>
    alGuardarJornada([nuevoReg], litrosAlTanque);


  // Sincronizacion de operaciones de campo realizadas offline (manga/potreros)
  const handleSincronizarManual = async () => {
    if (sincronizandoOffline) return;
    setSincronizandoOffline(true);
    try {
      const res = await procesarColaGanaderia(tenantId, {
        registrar_peso: async (acc) => {
          await registrarPesoGanaderia(tenantId, acc.payload.animalId, acc.payload.peso);
        },
        rotar_potrero: async (acc) => {
          await rotarPotreroGanaderia(acc.payload.potreroOrigenId, tenantId, acc.payload.potreroDestinoId);
        },
        registrar_ordeno: async (acc) => {
          await registrarOrdenoGanaderia(tenantId, {
            animalId: acc.payload.animalId,
            cantidadLitros: acc.payload.litros,
            turno: acc.payload.sesion,
            fecha: new Date().toISOString().slice(0, 10),
            precioVentaLitro: 0.5,
          });
        },
        aplicar_vacuna: async (acc) => {
          await aplicarVacunaGanaderia(tenantId, {
            animalId: acc.payload.animalId || 0,
            vacunaId: acc.payload.vacunaId,
            fechaAplicacion: new Date(acc.creadaEn).toISOString().slice(0, 10),
          });
        }
      });

      setPendientesOffline(res.quedanPendientes);
      if (res.sincronizadas.length > 0) {
        notificar(`Sincronizacion completada: ${res.sincronizadas.length} registros de campo sincronizados.`);
      }
    } catch {
      notificar("No se pudo completar la sincronizacion en este momento.");
    } finally {
      setSincronizandoOffline(false);
    }
  };

  useEffect(() => {
    setPendientesOffline(contarPendientesGanaderia(tenantId));
    const handleOnline = () => {
      setEstaOnline(true);
      handleSincronizarManual();
    };
    const handleOffline = () => setEstaOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [tenantId]);

  // Vacunación aplicada: queda lista la constancia y se recargan las alertas de retiro.
  const alAplicarVacuna = (aplicacion: VacunacionAplicada) => {
    setUltimaVacunacion(aplicacion);
    obtenerAlertasSanitariasGanaderia(tenantId).then(setAlertasSanitarias).catch(() => {});
  };

  // Exportar matriz a XLSX
  const exportarInventarioXLSX = () => {
    const data = animales.map(a => ({
      "Arete": a.arete,
      "Nombre": a.nombre || "-",
      "Raza": a.raza || "-",
      "Sexo": a.sexo,
      "Categoría": a.tipoAnimal,
      "Peso Actual (kg)": a.pesoActual || 0,
      "Potrero": a.potrero?.nombre || "Sin Asignar",
      "Estado": a.estado || "ACTIVO",
      "Valor Estimado (USD)": a.valorEstimado || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario Hato");
    XLSX.writeFile(wb, "Inventario_Hato_Aurora.xlsx");
    notificar("Reporte XLSX exportado correctamente.");
  };

  return (
    <div className="h-screen flex overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-500 font-['Inter']">
      <AuroraGradientDef />

      {/* Notificación Flotante */}
      {notificacion && (
        <div className="fixed top-5 right-5 z-[2100] apple-glass px-5 py-3 rounded-2xl border border-emerald-500/50 shadow-2xl text-emerald-600 dark:text-emerald-300 text-xs font-bold flex items-center gap-3 animate-fade-in">
          <IconCheckCircle size={18} />
          <span>{notificacion}</span>
        </div>
      )}

      {/* ══════════════════════ SIDEBAR (drawer en móvil, fijo en desktop) — mismo patrón institucional que Comercio/Horeca ══════════════════════ */}
      {sidebarAbierto && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarAbierto(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`w-64 flex-shrink-0 h-screen flex flex-col bg-[#fcfdfd] border-r border-slate-200 shadow-none fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-out lg:static lg:translate-x-0 ${
          sidebarAbierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Identidad de la finca — mismo patrón institucional que Comercio (A+ de respaldo, sin íconos de rubro). */}
        <button
          onClick={onSalir}
          className="flex items-center gap-3 text-left group cursor-pointer px-5 py-4 border-b border-slate-200"
          title="Volver al Hub General"
        >
          <div className="w-10 h-10 rounded-md border border-slate-200 bg-white text-slate-700 flex items-center justify-center overflow-hidden group-hover:border-teal-300 transition-colors flex-shrink-0">
            <span className="font-semibold tracking-[-0.06em] text-sm" aria-label="Aurora Plus">A+</span>
          </div>
          <div className="min-w-0">
            <div className="font-['IBM_Plex_Sans'] font-semibold text-sm text-slate-900 leading-tight tracking-tight truncate">
              {user?.empresa || "Mi Finca"}
            </div>
            <div className="text-[10px] text-slate-400 tracking-[0.02em] truncate font-medium mt-1">
              Ganadería by <span className="font-semibold text-slate-600">A+</span>
            </div>
          </div>
        </button>

        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
          {([
            {
              titulo: "Operación",
              items: [
                { id: "resumen" as const, Icon: IconDashboardGrid, etiqueta: "Panel General", badge: 0 },
                { id: "inventario" as const, Icon: IconCow, etiqueta: "Hato & Inventario", badge: 0 },
                { id: "potreros" as const, Icon: IconPin, etiqueta: "Potreros", badge: 0 },
                { id: "engorde" as const, Icon: IconScale, etiqueta: "Engorde (GDP)", badge: 0 },
                { id: "sociedades" as const, Icon: IconUsers, etiqueta: "Ceba en sociedad", badge: 0 },
                { id: "produccion" as const, Icon: IconMilk, etiqueta: "Producción & Pesajes", badge: 0 },
              ],
            },
            {
              titulo: "Control",
              items: [
                { id: "sanidad" as const, Icon: IconSyringe, etiqueta: "Sanidad & Trazabilidad", badge: alertasSanitarias.length },
                { id: "eventos" as const, Icon: IconCalendar, etiqueta: "Centro de Eventos", badge: 0 },
                { id: "reportes" as const, Icon: IconChart, etiqueta: "Centro de Reportes", badge: 0 },
                ...(user?.rol === "DUENO_ADMIN" ? [{ id: "auditoria" as const, Icon: IconFileText, etiqueta: "Bitácora de Auditoría", badge: 0 }] : []),
              ],
            },
          ]).map((grupo) => (
            <div key={grupo.titulo} className="space-y-1.5">
              <div className="px-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {grupo.titulo}
              </div>
              {grupo.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setTab(item.id); setSidebarAbierto(false); }}
                  className={`sidebar-glare w-full flex items-center gap-3 border-l-2 px-3 py-2.5 rounded-md font-medium text-[13px] transition-colors cursor-pointer ${
                    tab === item.id
                      ? "sidebar-glare--active bg-teal-50/80 text-teal-900 border-teal-700"
                      : "text-slate-800 border-transparent hover:bg-slate-100/70 hover:text-slate-900"
                  }`}
                >
                  <span className={tab === item.id ? "text-teal-700" : "text-slate-500"}><item.Icon size={15} /></span>
                  <span className="flex-1 text-left">{item.etiqueta}</span>
                  {item.badge > 0 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}

          {/* Acciones rápidas de campo */}
          <div className="pt-3 mt-3 border-t border-slate-100 space-y-1">
            <div className="px-3 pb-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Acciones rápidas
            </div>
            <button
              type="button"
              onClick={() => { abrirVaqueraRapida(); setSidebarAbierto(false); }}
              className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg font-semibold text-[13px] cursor-pointer text-slate-800 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <span className="text-slate-400"><IconMilk size={16} /></span>
              <span className="flex-1 text-left">Ordeño rápido</span>
            </button>
            <button
              type="button"
              onClick={() => { setAltaAnimal({}); setSidebarAbierto(false); }}
              className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg font-semibold text-[13px] cursor-pointer text-slate-800 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <span className="text-slate-400"><IconTag size={16} /></span>
              <span className="flex-1 text-left">Alta de animal</span>
            </button>
            <button
              type="button"
              onClick={() => { abrirVentaAnimales("MULTIPLE"); setSidebarAbierto(false); }}
              className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg font-semibold text-[13px] cursor-pointer text-slate-800 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <span className="text-slate-400"><IconCoins size={16} /></span>
              <span className="flex-1 text-left">Vender animales</span>
            </button>
            {puedeImportarHato && (
              <button
                type="button"
                onClick={() => { setModalImportarHato(true); setSidebarAbierto(false); }}
                className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg font-semibold text-[13px] cursor-pointer text-slate-800 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <span className="text-slate-400"><IconUpload size={16} /></span>
                <span className="flex-1 text-left">Importar hato</span>
              </button>
            )}
          </div>
        </nav>

        {/* Soporte: tickets con el equipo de Aurora (super admin) */}
        <div className="px-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => { setAperturaSoporte(n => n + 1); setSidebarAbierto(false); }}
            title="Solicitar ayuda al equipo de Aurora y ver tus tickets"
            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg font-semibold text-[13px] cursor-pointer text-slate-800 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <span className="text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </span>
            <span className="flex-1 text-left">Soporte</span>
          </button>
        </div>

        {/* Salir al Hub */}
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={onSalir}
            className="w-full text-xs font-semibold px-2.5 py-2 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer text-left"
          >
            ← Salir al Hub
          </button>
        </div>
      </aside>

      {/* ══════════════════════ COLUMNA DERECHA: TOPBAR + CONTENIDO ══════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">

      {/* ── TOPBAR: SINCRONIZACIÓN, MONEDAS, LECHE, FISCAL Y TEMA ── */}
      <header className="nav-glass border-b border-slate-300/60 dark:border-white/10 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between lg:justify-end gap-3 sticky top-0 z-30 backdrop-blur-2xl">
        <button
          onClick={() => setSidebarAbierto(true)}
          className="lg:hidden p-2 -ml-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          aria-label="Abrir menú"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

                {/* Barra de Tasas Multi-Moneda & Precio Leche Centralizado */}
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {/* Badge Modo Campo / Sincronizacion Offline */}
          <button
            type="button"
            onClick={handleSincronizarManual}
            disabled={sincronizandoOffline || pendientesOffline === 0}
            title={pendientesOffline > 0 ? "Haga clic para sincronizar cambios locales con el servidor" : "Conexion activa con el servidor"}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all shadow-sm ${
              !estaOnline || pendientesOffline > 0
                ? "bg-amber-500/15 border-amber-500/40 text-amber-500 dark:text-amber-400 hover:bg-amber-500/25 cursor-pointer"
                : "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${
              !estaOnline ? "bg-amber-400 animate-pulse" : (pendientesOffline > 0 ? "bg-amber-400" : "bg-emerald-400")
            }`}></span>
            <span>
              {!estaOnline 
                ? `Modo Campo (${pendientesOffline} pend.)`
                : (pendientesOffline > 0 ? `Sincronizar (${pendientesOffline})` : "En Linea")
              }
            </span>
            {pendientesOffline > 0 && (
              <svg className={`w-3.5 h-3.5 ${sincronizandoOffline ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
          </button>
          {/* Tasas de cambio */}
          <button
            type="button"
            onClick={() => setModalEditarTasas(true)}
            title="Configurar monedas activas y tasas de cambio de la finca"
            className="flex items-center gap-2 apple-glass-pill rounded-full px-3.5 py-1.5 border border-slate-300/80 dark:border-white/15 text-[11px] hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all cursor-pointer group shadow-sm"
          >
            <span className="text-slate-500 dark:text-white/40 font-medium flex items-center gap-1">
              <span>Monedas:</span>
            </span>
            <span className="font-mono font-bold text-slate-700 dark:text-white">USD</span>
            {monedasConfig.VES && (
              <>
                <span className="text-slate-400 dark:text-white/20">•</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">1$ = Bs. {tasaBCV.toFixed(2)}</span>
              </>
            )}
            {monedasConfig.COP && (
              <>
                <span className="text-slate-400 dark:text-white/20">•</span>
                <span className="font-mono font-bold text-sky-600 dark:text-sky-400">{tasaCOP.toLocaleString()} COP</span>
              </>
            )}
            <span className="opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all"><IconSettings size={13} /></span>
          </button>

          {/* Precio Leche */}
          <button
            type="button"
            onClick={() => setModalEditarPrecioLeche(true)}
            title="Precio centralizado de leche por litro — Haga clic para editar"
            className="flex items-center gap-1.5 apple-glass-pill rounded-full px-3 py-1.5 border border-sky-400/30 text-[11px] hover:border-sky-400/60 hover:bg-sky-500/10 transition-all cursor-pointer group shadow-sm"
          >
            <span className="text-slate-500 dark:text-white/40 font-medium">Leche:</span>
            <span className="font-mono font-bold text-sky-500 dark:text-sky-400">${precioLecheUSD.toFixed(2)}/L</span>
            <span className="opacity-70 group-hover:opacity-100"><IconEdit size={12} /></span>
          </button>

          {/* Datos Fiscales (RIF / Razón Social / Domicilio) para notas de entrega */}
          <button
            type="button"
            onClick={() => setModalDatosFiscales(true)}
            title="Datos fiscales opcionales para tus notas de entrega (RIF, razón social, domicilio)"
            className="flex items-center gap-1.5 apple-glass-pill rounded-full px-3 py-1.5 border border-purple-400/30 text-[11px] hover:border-purple-400/60 hover:bg-purple-500/10 transition-all cursor-pointer group shadow-sm"
          >
            <IconFileText size={13} className="text-purple-500 dark:text-purple-400" />
            <span className="text-slate-500 dark:text-white/40 font-medium">Fiscal</span>
          </button>
        </div>

        <ThemeToggle className="scale-[0.72] origin-right" />
      </header>

      {/* ── CUERPO PRINCIPAL ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ─────────────────────────────────────────────────────────────
            PESTAÑA 1: PANEL GENERAL (RESUMEN EJECUTIVO & CLIMA)
        ───────────────────────────────────────────────────────────── */}
        {tab === "resumen" && (
          <div className="space-y-6">

            {/* Checklist de Primeros Pasos (Onboarding de Finca Vacía) */}
            {(() => {
              const fincaUbicada = typeof window !== "undefined" && !!localStorage.getItem(`aurora_finca_config_${tenantId}`);
              const tienePotreros = potreros.length > 0;
              const tieneAnimales = animales.length > 0;
              const pasosCompletados = (fincaUbicada ? 1 : 0) + (tienePotreros ? 1 : 0) + (tieneAnimales ? 1 : 0);

              return (
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h3 className="font-['Outfit'] font-black text-lg text-slate-900">
                          Checklist de Primeros Pasos para tu Finca
                        </h3>
                        <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 font-bold border border-teal-200">
                          {pasosCompletados} de 3 completados
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {pasosCompletados === 3
                          ? "¡Felicidades! Has completado la configuración esencial de tu predio."
                          : "Configura tu predio en 3 pasos clave para desbloquear el control agronómico completo:"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Paso 1: Fijar Ubicación */}
                    <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                      fincaUbicada
                        ? "bg-teal-50 border-teal-200"
                        : "bg-slate-50 border-slate-200 hover:border-teal-300"
                    }`}>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-400">Paso 1</span>
                          {fincaUbicada ? (
                            <span className="text-[11px] font-bold text-teal-700">Completado</span>
                          ) : (
                            <span className="text-[11px] font-bold text-amber-600">Pendiente</span>
                          )}
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                          Fijar Ubicación Real
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {fincaUbicada
                            ? "Coordenadas fijadas en el satélite."
                            : "Busca tu predio en el mapa y fija las coordenadas de tu finca."}
                        </p>
                      </div>
                      <button
                        onClick={() => { setTab("potreros"); setSubPotreros("mapa"); }}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          fincaUbicada
                            ? "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                            : "btn-cyber-neon text-white shadow-sm"
                        }`}
                      >
                        {fincaUbicada ? "Ver en Mapa →" : "Ubicar en Mapa →"}
                      </button>
                    </div>

                    {/* Paso 2: Crear Primer Potrero */}
                    <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                      tienePotreros
                        ? "bg-teal-50 border-teal-200"
                        : "bg-slate-50 border-slate-200 hover:border-teal-300"
                    }`}>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-400">Paso 2</span>
                          {tienePotreros ? (
                            <span className="text-[11px] font-bold text-teal-700">Completado ({potreros.length})</span>
                          ) : (
                            <span className="text-[11px] font-bold text-amber-600">Pendiente</span>
                          )}
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                          Crear Primer Potrero
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {tienePotreros
                            ? `${potreros.length} potreros registrados.`
                            : "Delimita un potrero para asignar pastos, área y carga animal."}
                        </p>
                      </div>
                      <button
                        onClick={abrirNuevoPotrero}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          tienePotreros
                            ? "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                            : "btn-cyber-neon text-white shadow-sm"
                        }`}
                      >
                        {tienePotreros ? "+ Nuevo Potrero" : "+ Crear Potrero"}
                      </button>
                    </div>

                    {/* Paso 3: Dar de Alta Primer Animal */}
                    <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                      tieneAnimales
                        ? "bg-teal-50 border-teal-200"
                        : "bg-slate-50 border-slate-200 hover:border-teal-300"
                    }`}>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-400">Paso 3</span>
                          {tieneAnimales ? (
                            <span className="text-[11px] font-bold text-teal-700">Completado ({animales.length})</span>
                          ) : (
                            <span className="text-[11px] font-bold text-amber-600">Pendiente</span>
                          )}
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                          Dar de Alta Primer Animal
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {tieneAnimales
                            ? `${animales.length} cabezas en el hato.`
                            : "Registra tu primer animal por nacimiento o compra con su arete."}
                        </p>
                      </div>
                      <button
                        onClick={() => setAltaAnimal({})}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          tieneAnimales
                            ? "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                            : "btn-cyber-neon text-white shadow-sm"
                        }`}
                      >
                        {tieneAnimales ? "+ Nuevo Animal" : "+ Dar de Alta"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ── Cabecera: tarjeta héroe (hato total) + cinta de métricas secundarias ── */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 text-left">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-[10px] font-bold text-teal-700 uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                    Sincronización Agronómica Activa
                  </div>
                  <h2 className="font-['Outfit'] font-black text-2xl text-slate-900">
                    Control Integral de Finca & Hato
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => setOrdenoAbierto(true)}
                    className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer">
                    + Registrar Ordeño
                  </button>
                  <button
                    onClick={() => { setTab("potreros"); setSubPotreros("mapa"); }}
                    className="btn-cyber-neon text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm cursor-pointer">
                    Ver Mapa Satelital →
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                {/* Tarjeta héroe: Hato Total */}
                <div className="lg:col-span-7 bg-white border-2 border-teal-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
                        Hato Total
                      </span>
                      <div className="mt-2.5 flex items-baseline gap-2.5">
                        <span className="text-3xl font-black text-slate-900 font-['Outfit']">{totalAnimales}</span>
                        <span className="text-xs font-medium text-slate-500">cabezas · {vacasOrdeno} vacas productivas</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-3 flex-wrap text-xs text-slate-500">
                    <span>{totalHectareas.toFixed(1)} hectáreas totales</span>
                    <span className="font-semibold text-teal-700">{cargaAnimalHa} UG/ha de carga animal</span>
                  </div>
                </div>

                {/* Cinta de métricas secundarias */}
                <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Producción & Rotación
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-slate-200 text-center">
                    <div className="px-1.5">
                      <div className="text-xl font-black text-slate-900 font-['Outfit']">{litrosHoy.toFixed(1)}</div>
                      <div className="text-[10px] font-medium text-slate-500 mt-0.5">Litros Hoy</div>
                    </div>
                    <div className="px-1.5">
                      <div className="text-xl font-black text-slate-900 font-['Outfit']">
                        {potreros.filter(p => p.estado === "EN_DESCANSO").length}/{potreros.length}
                      </div>
                      <div className="text-[10px] font-medium text-slate-500 mt-0.5">Potreros Descanso</div>
                    </div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                    <span>
                      ${ingresosLecheHoy.toFixed(2)} USD
                      {monedasConfig.VES && ` · Bs. ${(ingresosLecheHoy * tasaBCV).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </span>
                    <span className="text-emerald-700 font-semibold">Sincronizado</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Widget: Tanque de Leche Frío (Stock en Finca & Despacho a Cisterna) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 text-left">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-['Outfit'] font-black text-lg text-slate-900">
                        Tanque de Leche Frío
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-50 text-sky-700 border border-sky-200">
                        <span>{tanqueLeche?.temperaturaCelsius ?? 4.0}°C Óptima</span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Stock recolectado en sala de ordeño listo para despacho a planta o camión cisterna.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalAjusteTanque(true)}
                    className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition-all">
                    <span className="inline-flex items-center gap-1.5"><IconSettings size={13} /> Calibrar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalVentaLeche(true)}
                    className="btn-cyber-neon text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer">
                    <span>Venta Cisterna / Planta</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-medium">Stock en Tanque</span>
                    <span className="text-[11px] font-mono font-bold text-sky-700">
                      {Math.round(((tanqueLeche?.stockActualLitros ?? 0) / (tanqueLeche?.capacidadLitros ?? 2000)) * 100)}%
                    </span>
                  </div>
                  <div className="font-['Outfit'] font-black text-2xl text-slate-900">
                    {(tanqueLeche?.stockActualLitros ?? 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">/ {(tanqueLeche?.capacidadLitros ?? 2000).toLocaleString()} L</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, ((tanqueLeche?.stockActualLitros ?? 0) / (tanqueLeche?.capacidadLitros ?? 2000)) * 100))}%` }}
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-[11px] text-slate-500 font-medium">Valor Comercial del Stock</div>
                  <div className="font-['Outfit'] font-black text-2xl text-emerald-700">
                    ${((tanqueLeche?.stockActualLitros ?? 0) * precioLecheUSD).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    A ${precioLecheUSD.toFixed(2)} USD/L
                    {monedasConfig.VES && ` • Bs. ${(((tanqueLeche?.stockActualLitros ?? 0) * precioLecheUSD) * tasaBCV).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    {monedasConfig.COP && ` • COP $${Math.round(((tanqueLeche?.stockActualLitros ?? 0) * precioLecheUSD) * tasaCOP).toLocaleString()}`}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-[11px] text-slate-500 font-medium">Último Despacho Registrado</div>
                  <div className="font-bold text-sm text-slate-900 truncate">
                    {ventasLeche[0] ? `${ventasLeche[0].litrosVendidos} L • ${ventasLeche[0].compradorOPlanta}` : "Sin despachos recientes"}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {ventasLeche[0] ? `${ventasLeche[0].fecha} • $${Number(ventasLeche[0].totalUSD).toFixed(2)} USD (${ventasLeche[0].monedaPago || "USD"})` : "Tanque en fase de recolección"}
                  </div>
                </div>
              </div>
            </div>

            {/* Cuadrícula Inferior: Alertas Sanitarias & Potreros Activos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Alertas del Hato */}
              <div className="apple-glass rounded-3xl p-6 border border-white/10 space-y-4 text-left">
                <div className="flex items-center justify-between">
                  <h3 className="font-['Outfit'] font-bold text-base text-slate-900 dark:text-white">
                    Alertas Sanitarias & Reproductivas
                  </h3>
                  <span className="text-xs font-bold text-emerald-500 dark:text-emerald-400">Próximos 30 días</span>
                </div>

                <div className="space-y-2.5">
                  {alertasSanitarias.length === 0 ? (
                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-start gap-3">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">Todo el hato está al día</div>
                        <div className="text-slate-500 dark:text-white/50 text-[11px] mt-0.5">No hay retiros de leche/carne activos ni vacunas vencidas registradas.</div>
                      </div>
                    </div>
                  ) : (
                    alertasSanitarias.slice(0, 3).map((alerta, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-2xl border text-xs flex items-start gap-3 ${
                          alerta.tipo.includes("RETIRO")
                            ? "bg-red-500/10 border-red-500/20"
                            : "bg-amber-500/10 border-amber-500/20"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${alerta.tipo.includes("RETIRO") ? "bg-red-400" : "bg-amber-400"}`} />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {alerta.producto || alerta.tipo.replace("_", " ")} — Arete {alerta.animal?.arete}
                          </div>
                          <div className="text-slate-500 dark:text-white/50 text-[11px] mt-0.5">{alerta.mensaje}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Estado de Rotación de Potreros */}
              <div className="apple-glass rounded-3xl p-6 border border-white/10 space-y-4 text-left">
                <div className="flex items-center justify-between">
                  <h3 className="font-['Outfit'] font-bold text-base text-slate-900 dark:text-white">
                    Rotación & Estado de Potreros
                  </h3>
                  <button
                    onClick={() => { setTab("potreros"); setSubPotreros("lista"); }}
                    className="text-xs font-bold text-emerald-500 dark:text-emerald-400 hover:underline cursor-pointer">
                    Ver todos ({potreros.length}) →
                  </button>
                </div>

                <div className="space-y-3">
                  {potreros.slice(0, 3).map(pot => (
                    <div key={pot.id} className="p-3.5 rounded-2xl border border-white/10 apple-glass flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white">{pot.nombre}</div>
                        <div className="text-xs text-slate-500 dark:text-white/40">
                          {pot.areaHectareas} ha • {pot.tipoPasto || "Pasto Natural"} • Capacidad: {pot.capacidadAnimales || 20} cabezas
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          pot.estado === "ACTIVO"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                        }`}>
                          {pot.estado === "ACTIVO" ? "EN USO" : "DESCANSO"}
                        </span>
                        {pot.estado === "ACTIVO" && (
                          <button
                            onClick={() => { setModalRotar(pot); }}
                            className="px-2.5 py-1 rounded-xl bg-emerald-500 text-white text-[11px] font-bold cursor-pointer hover:scale-105 transition-all">
                            Rotar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            PESTAÑA 2: MAPA & POTREROS (INTEGRACIÓN INTELIGENTE)
        ───────────────────────────────────────────────────────────── */}
        {tab === "potreros" && (
          <SeccionPotreros
            animales={animales}
            animalesActivos={animalesActivos}
            notificar={notificar}
            potreros={potreros}
            subPotreros={subPotreros}
            abrirEditarPotrero={abrirEditarPotrero}
            abrirNuevoPotrero={abrirNuevoPotrero}
            handleGuardarPotreroTrazado={handleGuardarPotreroTrazado}
            setModalRotar={setModalRotar}
            setSubPotreros={setSubPotreros}
          />
        )}

        {/* ─────────────────────────────────────────────────────────────
            PESTAÑA 3: HATO & INVENTARIO (MATRIZ POR CATEGORÍAS GANSOFT)
        ───────────────────────────────────────────────────────────── */}
        {tab === "inventario" && (
          <div className="space-y-6 text-left">
            
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
                  Inventario Consolidado del Hato
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/40">
                  Desglose por categorías productivas, locaciones en potrero y trazabilidad individual.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                {/* Sub-selector de Inventario */}
                <div className="apple-glass-pill rounded-full p-1 flex items-center gap-1 text-xs">
                  <button
                    onClick={() => setSubInventario("matriz")}
                    className={`px-3.5 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
                      subInventario === "matriz" ? "bg-white text-black shadow-sm" : "text-slate-600 dark:text-white/60"
                    }`}>
                    Matriz de Lotes
                  </button>
                  <button
                    onClick={() => setSubInventario("fichas")}
                    className={`px-3.5 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
                      subInventario === "fichas" ? "bg-white text-black shadow-sm" : "text-slate-600 dark:text-white/60"
                    }`}>
                    Fichas Individuales
                  </button>
                  <button
                    onClick={() => setSubInventario("distribucion")}
                    className={`px-3.5 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
                      subInventario === "distribucion" ? "bg-white text-black shadow-sm" : "text-slate-600 dark:text-white/60"
                    }`}>
                    Locación & Estatus
                  </button>
                </div>

                <BotonPdf etiqueta="PDF del hato" obtener={descargarInventarioHatoPdf} notificar={notificar} />

                <button
                  onClick={() => abrirVentaAnimales("MULTIPLE")}
                  className="apple-glass-btn text-xs font-bold px-3.5 py-2 rounded-xl border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-all cursor-pointer flex items-center gap-1.5">
                  <IconCoins size={13} />
                  <span>Vender lote</span>
                </button>

                {puedeImportarHato && (
                  <button
                    onClick={() => setModalImportarHato(true)}
                    className="apple-glass-btn text-xs font-bold px-3.5 py-2 rounded-xl border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-all cursor-pointer flex items-center gap-1.5">
                    <IconUpload size={13} />
                    <span>Importar hato</span>
                  </button>
                )}

                <button
                  onClick={exportarInventarioXLSX}
                  className="apple-glass-btn text-xs font-bold px-3.5 py-2 rounded-xl border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-all cursor-pointer">
                  Descargar XLSX
                </button>
              </div>
            </div>

            {/* SUB-VISTA 1: MATRIZ DE CATEGORÍAS GANSOFT */}
            {subInventario === "matriz" && (
              <div className="space-y-6">
                {/* Tabla Matriz Canónica */}
                <div className="overflow-x-auto rounded-3xl border border-slate-200/80 dark:border-white/10 apple-glass">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/50 border-b border-slate-200/80 dark:border-white/10">
                      <tr>
                        <th className="p-4">Lotes / Categoría</th>
                        <th className="p-4 text-center">Cabezas</th>
                        <th className="p-4 text-center">Peso Promedio</th>
                        <th className="p-4 text-center">% del Hato</th>
                        <th className="p-4 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                      {matrizConteos.map(cat => {
                        const pct = totalAnimales > 0 ? ((cat.count / totalAnimales) * 100).toFixed(1) : "0.0";
                        const expandida = categoriaExpandida === cat.key && cat.count > 0;
                        return (
                          <Fragment key={cat.key}>
                          <tr className="hover:bg-white/5 transition-colors">
                            <td className="p-4 font-bold text-slate-900 dark:text-white">
                              <button
                                type="button"
                                disabled={cat.count === 0}
                                onClick={() => setCategoriaExpandida(expandida ? null : cat.key)}
                                className="flex items-center gap-2 cursor-pointer disabled:cursor-default"
                                title={cat.count > 0 ? "Ver desglose por raza" : undefined}>
                                <span className={`inline-block w-3 text-slate-400 transition-transform ${expandida ? "rotate-90" : ""} ${cat.count === 0 ? "opacity-0" : ""}`}>›</span>
                                <span>{cat.label}</span>
                              </button>
                            </td>
                            <td className="p-4 text-center font-mono font-black text-emerald-500 dark:text-emerald-400 text-sm">
                              {cat.count}
                            </td>
                            <td className="p-4 text-center font-mono text-slate-600 dark:text-white/70">
                              {cat.pesoPromedio > 0 ? `${cat.pesoPromedio} kg` : "-"}
                            </td>
                            <td className="p-4 text-center">
                              <div className="inline-flex items-center gap-2">
                                <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="font-mono text-[11px] text-slate-400">{pct}%</span>
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => { setFiltroCategoria(cat.key); setSubInventario("fichas"); }}
                                className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer">
                                Ver Fichas →
                              </button>
                            </td>
                          </tr>
                          {expandida && desglosePorRaza(animalesActivos.filter(cat.filter)).map(g => (
                            <tr key={`${cat.key}-${g.raza}`} className="bg-slate-50/70 dark:bg-white/[0.02]">
                              <td className="py-2.5 pl-11 pr-4 text-slate-700 dark:text-white/80">{g.raza}</td>
                              <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-900 dark:text-white">{g.cabezas}</td>
                              <td colSpan={3} className="py-2.5 px-4 text-slate-600 dark:text-white/60">
                                {g.prenadas > 0 ? (
                                  <span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{g.prenadas} preñadas</span>
                                    {" · "}
                                    {[...g.porPadrote.entries()].map(([padrote, n]) => `${n} de ${padrote}`).join(" · ")}
                                  </span>
                                ) : cat.key === "VACA" || cat.key === "NOVILLA" ? (
                                  <span className="text-slate-400 dark:text-white/40">Ninguna preñada</span>
                                ) : null}
                              </td>
                            </tr>
                          ))}
                          </Fragment>
                        );
                      })}
                      <tr className="bg-emerald-500/5 font-bold">
                        <td className="p-4 text-slate-900 dark:text-white">
                          TOTAL ACTIVOS
                          {animalesActivos.some(a => a.sociedadCebaId) && (
                            <div className="text-[10px] font-semibold text-slate-500 mt-0.5">
                              {animalesActivos.filter(a => !a.sociedadCebaId).length} propios · {animalesActivos.filter(a => a.sociedadCebaId).length} en sociedad
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-center font-mono text-emerald-500 dark:text-emerald-400 text-base">{totalAnimales}</td>
                        <td className="p-4 text-center font-mono text-slate-600 dark:text-white/70">
                          {Math.round(animalesActivos.reduce((sum, a) => sum + (a.pesoActual || 0), 0) / Math.max(1, totalAnimales))} kg
                        </td>
                        <td className="p-4 text-center font-mono text-slate-400">100%</td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => { setFiltroCategoria("TODOS"); setSubInventario("fichas"); }}
                            className="text-emerald-500 font-bold hover:underline">
                            Ver Todos
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Preñez por padrote */}
                <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 apple-glass p-5 space-y-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <h4 className="font-['Outfit'] font-black text-base text-slate-900 dark:text-white">Preñez por padrote</h4>
                    <span className="text-xs text-slate-500 dark:text-white/50">
                      <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">{totalPrenadas}</span> hembras preñadas
                    </span>
                  </div>
                  {prenezPorPadrote.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-white/50">
                      No hay hembras preñadas registradas. Registre el diagnóstico en Centro de Eventos o impórtelas con su padrote.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-200/60 dark:divide-white/5">
                      {prenezPorPadrote.map(g => (
                        <div key={g.padrote} className="py-2.5 flex items-center justify-between gap-4 text-xs">
                          <div className="min-w-0">
                            <div className={`font-bold truncate ${g.padrote === SIN_PADROTE ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>
                              {g.padrote}
                            </div>
                            <div className="text-slate-500 dark:text-white/50 truncate">
                              {[...g.porRaza.entries()].map(([raza, n]) => `${n} ${raza}`).join(" · ")}
                            </div>
                          </div>
                          <div className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400 flex-shrink-0">{g.prenadas}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SUB-VISTA 2: FICHAS INDIVIDUALES */}
            {subInventario === "fichas" && (
              <div className="space-y-5">
                {/* Barra de Filtros y Búsqueda */}
                <div className="apple-glass rounded-2xl p-4 border border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    {["TODOS", "VACA", "TORO", "NOVILLA", "TERNERO", "MAUTA", "NOVILLO"].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setFiltroCategoria(cat)}
                        className={`px-3.5 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
                          filtroCategoria === cat
                            ? "bg-emerald-500 text-white shadow-sm"
                            : "apple-glass-btn text-slate-600 dark:text-white/60"
                        }`}>
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Buscar por arete, nombre o raza..."
                      value={busquedaArete}
                      onChange={e => setBusquedaArete(e.target.value)}
                      className="px-4 py-2 rounded-xl bg-white/5 border border-slate-300/80 dark:border-white/15 text-slate-900 dark:text-white text-xs w-64 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={() => setAltaAnimal({})}
                      className="btn-cyber-neon text-white font-bold px-4 py-2 rounded-xl cursor-pointer">
                      + Alta Animal
                    </button>
                  </div>
                </div>

                {/* Listado de Animales */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {animalesFiltrados.map(animal => (
                    <div
                      key={animal.id}
                      className="apple-glass rounded-3xl p-5 border border-white/10 hover-card text-left space-y-4 relative overflow-hidden">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono font-bold text-emerald-500 dark:text-emerald-400">
                            ARETE: {animal.arete}
                          </div>
                          <h4 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white mt-1">
                            {animal.nombre || `Animal ${animal.arete}`}
                          </h4>
                          <div className="text-slate-500 dark:text-white/40 text-xs">
                            {animal.raza || "Mestizo"} • {animal.tipoAnimal} • {animal.sexo}
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-500 dark:text-white/60 text-[10px] font-bold">
                          {animal.estado || "ACTIVO"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-white/5 text-xs">
                        <div>
                          <span className="text-slate-400 dark:text-white/40 text-[10px] block">Peso Actual</span>
                          <span className="font-bold text-slate-900 dark:text-white">{animal.pesoActual ? `${animal.pesoActual} kg` : "Sin pesar"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 dark:text-white/40 text-[10px] block">Potrero Asignado</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 truncate block">
                            {animal.potrero?.nombre || "Sin potrero"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-white/5 text-xs">
                        <button
                          onClick={() => {
                            setModalPesaje(animal);
                          }}
                          className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer">
                          Pesar
                        </button>
                        <button
                          onClick={() => abrirEditarAnimal(animal)}
                          title="Editar animal"
                          className="text-slate-500 dark:text-white/60 hover:text-emerald-500 dark:hover:text-emerald-400 cursor-pointer">
                          <IconEdit size={14} />
                        </button>
                        <button
                          onClick={() => setModalFichaAnimal(animal)}
                          className="apple-glass-btn px-3 py-1 rounded-xl text-[11px] font-semibold text-slate-700 dark:text-white/80 cursor-pointer">
                          Ficha & QR →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SUB-VISTA 3: DISTRIBUCIÓN POR LOCACIÓN & ESTATUS */}
            {subInventario === "distribucion" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Distribución por Potrero / Locación */}
                <div className="apple-glass rounded-3xl p-6 border border-white/10 space-y-4">
                  <h4 className="font-['Outfit'] font-bold text-base text-slate-900 dark:text-white">
                    Distribución por Locación & Potrero
                  </h4>
                  <div className="space-y-3 text-xs">
                    {potreros.map(pot => {
                      const count = animales.filter(a => a.potrero?.id === pot.id).length;
                      return (
                        <div key={pot.id} className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{pot.nombre}</div>
                            <div className="text-[11px] text-slate-400">{pot.areaHectareas} ha • {pot.estado}</div>
                          </div>
                          <div className="text-right">
                            <span className="font-['Outfit'] font-black text-lg text-emerald-400">{count}</span>
                            <span className="text-[10px] text-slate-400 block">cabezas</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Distribución por Estatus Productivo */}
                <div className="apple-glass rounded-3xl p-6 border border-white/10 space-y-4">
                  <h4 className="font-['Outfit'] font-bold text-base text-slate-900 dark:text-white">
                    Distribución por Estatus Productivo
                  </h4>
                  <div className="space-y-3 text-xs">
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">Vacas en Ordeño Activo</span>
                      <span className="font-mono font-bold text-sky-400 text-base">
                        {animalesActivos.filter(a => a.tipoAnimal === "VACA" && a.sexo === "HEMBRA" && a.estadoProductivo === "ORDEÑO").length}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">Hembras Gestantes Confirmadas</span>
                      <span className="font-mono font-bold text-purple-400 text-base">
                        {animalesActivos.filter(a => a.estadoReproductivo === "PREÑADA").length}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">Novillos en Fase de Engorde</span>
                      <span className="font-mono font-bold text-amber-400 text-base">
                        {animalesActivos.filter(a => a.tipoAnimal === "NOVILLO").length}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">Crías Lactantes en Corral</span>
                      <span className="font-mono font-bold text-emerald-400 text-base">
                        {animalesActivos.filter(a => a.tipoAnimal === "TERNERO" || a.tipoAnimal === "BECERRA").length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Seguimiento General del Hato: peso y estado sanitario de cada animal de un vistazo */}
                <div className="lg:col-span-2 apple-glass rounded-3xl p-6 border border-white/10 space-y-4">
                  <h4 className="font-['Outfit'] font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <IconCow size={16} className="text-emerald-400" />
                    <span>Seguimiento General del Hato</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-white/40 -mt-2">
                    Peso actual y estado sanitario de cada animal activo, de un solo vistazo.
                  </p>
                  {animalesActivos.length === 0 ? (
                    <div className="text-xs text-slate-400 py-6 text-center bg-white/5 rounded-2xl">
                      Sin animales activos registrados todavía.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-white/10">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-white/5 text-slate-500 dark:text-white/50 border-b border-white/10">
                          <tr>
                            <th className="p-3">Arete</th>
                            <th className="p-3">Nombre</th>
                            <th className="p-3">Categoría</th>
                            <th className="p-3">Peso Actual</th>
                            <th className="p-3">Potrero</th>
                            <th className="p-3">Estado Sanitario</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {animalesActivos.map(a => {
                            const alertasAnimal = alertasSanitarias.filter(al => al.animal?.id === a.id);
                            return (
                              <tr
                                key={a.id}
                                onClick={() => { setTab("sanidad"); setSubSanidad("individual"); setAnimalFichaId(a.id); }}
                                className="hover:bg-white/5 cursor-pointer transition-colors">
                                <td className="p-3 font-mono font-bold text-emerald-400">{a.arete}</td>
                                <td className="p-3 text-slate-900 dark:text-white">{a.nombre || "—"}</td>
                                <td className="p-3 text-slate-500 dark:text-white/60">{a.tipoAnimal}</td>
                                <td className="p-3 font-mono text-slate-900 dark:text-white">{a.pesoActual ? `${a.pesoActual} kg` : "Sin pesar"}</td>
                                <td className="p-3 text-sky-500 dark:text-sky-400">{a.potrero?.nombre || "Sin potrero"}</td>
                                <td className="p-3">
                                  {alertasAnimal.length === 0 ? (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                                      Al día
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 dark:text-rose-400 text-[10px] font-bold border border-rose-500/20">
                                      {alertasAnimal.length} alerta{alertasAnimal.length > 1 ? "s" : ""}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            PESTAÑA 4: CENTRO DE EVENTOS (INSPIRADO EN GANSOFT)
        ───────────────────────────────────────────────────────────── */}
                {/* ═════════════════════════════════════════════════════════════
            PESTAÑA 3.5: SANIDAD & TRAZABILIDAD (INDIVIDUAL Y POR LOTE)
        ═════════════════════════════════════════════════════════════ */}
        {tab === "sanidad" && (
          <div className="space-y-6 animate-fade-in text-left">
            
            {/* Header de Sección y Selector de Sub-vista */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-['Outfit'] font-black text-2xl text-slate-900 dark:text-white flex items-center gap-2.5">
                  <span>Sanidad & Trazabilidad</span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                    Ficha Arete • Grupos de Lote
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/40 mt-1">
                  Control sanitario consolidado, trazabilidad por arete y monitoreo de compras conjuntas por lote.
                </p>
              </div>

              {/* Selector Sub-vista (Segmented Pills) */}
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-200/80 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-xs">
                <button
                  onClick={() => setSubSanidad("individual")}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    subSanidad === "individual"
                      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                      : "text-slate-600 dark:text-white/60 hover:text-white"
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5"><IconCow size={14} /> Ficha por Animal</span>
                </button>
                <button
                  onClick={() => setSubSanidad("lotes")}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    subSanidad === "lotes"
                      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                      : "text-slate-600 dark:text-white/60 hover:text-white"
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5"><IconTag size={14} /> Monitoreo por Lote</span>
                </button>
              </div>

              <button
                onClick={() => setVacunaAbierta({})}
                className="btn-cyber-neon text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer">
                <IconSyringe size={14} />
                <span>+ Vacunar</span>
              </button>
            </div>

            {/* Banner de Alertas Sanitarias (GET /api/ganaderia/sanidad/alertas) */}
            <div className="p-4 rounded-3xl apple-glass border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400"><IconShield size={18} /></span>
                  <span className="font-['Outfit'] font-black text-sm text-slate-900 dark:text-white">
                    Alertas Sanitarias Activas (Refuerzos & Períodos de Retiro)
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-bold">
                    {alertasSanitarias.length} pendientes
                  </span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const blob = await descargarAlertasSanitariasExcel(tenantId);
                      const url = URL.createObjectURL(blob);
                      window.open(url, "_blank");
                      setTimeout(() => URL.revokeObjectURL(url), 30000);
                    } catch (e) {
                      notificar("No se pudo exportar el Excel de alertas");
                    }
                  }}
                  className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-slate-700 dark:text-white/80 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <IconDownload size={12} />
                  <span>Exportar Alertas</span>
                </button>
              </div>

              {alertasSanitarias.length === 0 ? (
                <div className="text-xs text-emerald-500 dark:text-emerald-400 font-medium py-1 flex items-center gap-2">
                  <IconCheckCircle size={14} />
                  <span>Todo el hato está al día. No hay retiros de leche/carne activos ni vacunas vencidas.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                  {alertasSanitarias.map((alerta, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl border text-xs space-y-1 ${
                        alerta.tipo.includes("RETIRO")
                          ? "bg-red-500/10 border-red-500/30 text-red-300"
                          : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono font-bold text-[11px]">
                        <span className="px-1.5 py-0.5 rounded bg-black/30">Arete: {alerta.animal?.arete}</span>
                        <span className="text-[10px] uppercase font-bold">{alerta.tipo.replace("_", " ")}</span>
                      </div>
                      <div className="font-bold text-white text-xs">{alerta.producto || "Tratamiento"}</div>
                      <p className="text-[11px] opacity-90 leading-tight">{alerta.mensaje}</p>
                      <div className="text-[10px] text-white/50 font-mono pt-1">
                        Fecha: {alerta.fechaRelevante}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* VISTA 1: FICHA CONSOLIDADA POR ANIMAL ÚNICO */}
            {subSanidad === "individual" && (
              animales.length === 0 ? (
                <div className="p-12 text-center rounded-3xl apple-glass border border-white/10 space-y-4 max-w-md mx-auto my-8">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <IconSyringe size={28} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Ficha Sanitaria por Animal</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Registra tu primer animal para ver su ficha sanitaria aquí.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setAltaAnimal({ origen: "NACIMIENTO" });
                    }}
                    className="btn-cyber-neon text-white font-bold px-5 py-2.5 rounded-xl cursor-pointer text-xs"
                  >
                    + Registrar Primer Animal
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                {/* Selector rápido de Arete */}
                <div className="p-4 rounded-3xl apple-glass border border-white/10 space-y-3">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 min-w-0">
                    <label className="text-xs font-bold text-slate-700 dark:text-white/70">
                      Seleccionar Animal por Arete para ver Ficha Completa:
                    </label>
                    <select
                      value={animalFichaId || ""}
                      onChange={(e) => setAnimalFichaId(Number(e.target.value))}
                      className="w-full sm:w-auto max-w-full min-w-0 truncate px-4 py-2 rounded-xl bg-slate-800 border border-white/15 text-white font-mono font-bold text-xs cursor-pointer focus:border-emerald-500"
                    >
                      {animales.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.arete} - {a.nombre || "Sin nombre"} ({a.raza || a.especie}) · {a.tipoAnimal} {a.lote ? `[${a.lote}]` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Pills de selección rápida con scroll horizontal */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
                    {animales.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setAnimalFichaId(a.id)}
                        className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                          animalFichaId === a.id
                            ? "bg-emerald-500 text-white shadow-md"
                            : "bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10"
                        }`}
                      >
                        {a.arete} {a.nombre ? `· ${a.nombre}` : ""}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ficha Consolidada del Animal Seleccionado */}
                {(() => {
                  const animalSel = animales.find((a) => a.id === animalFichaId) || animales[0];
                  if (!animalSel) return null;

                  return (
                    <div className="space-y-5">
                      {/* Cabecera del Animal */}
                      <div className="p-6 rounded-3xl apple-glass border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-['Outfit'] font-black text-3xl font-mono text-emerald-500 dark:text-emerald-400">
                              {animalSel.arete}
                            </span>
                            {animalSel.nombre && (
                              <span className="text-xl font-bold text-white">
                                {animalSel.nombre}
                              </span>
                            )}
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-white/10 text-white border border-white/15">
                              {animalSel.tipoAnimal || animalSel.sexo}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              animalSel.estado === "ACTIVO" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-slate-500/20 text-slate-300"
                            }`}>
                              {animalSel.estado}
                            </span>
                            {animalSel.estadoReproductivo && (
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                                animalSel.estadoReproductivo === "PREÑADA"
                                  ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                                  : animalSel.estadoReproductivo === "EN_ESPERA"
                                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                  : "bg-slate-500/20 text-slate-300 border-white/10"
                              }`}>
                                Repro: {animalSel.estadoReproductivo}
                              </span>
                            )}
                            {animalSel.estadoProductivo && (
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                                animalSel.estadoProductivo === "ORDEÑO"
                                  ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                                  : animalSel.estadoProductivo === "CRIANDO"
                                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                  : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                              }`}>
                                Prod: {animalSel.estadoProductivo}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-3 flex-wrap pt-1">
                            <span>Raza: <b className="text-white">{animalSel.raza || "Mestizo"}</b></span>
                            <span>•</span>
                            <span>Sexo: <b className="text-white">{animalSel.sexo}</b></span>
                            <span>•</span>
                            <span>Potrero: <b className="text-sky-400">{animalSel.potrero?.nombre || "Sin Potrero"}</b></span>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          {/* Badge de Lote */}
                          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-right space-y-0.5">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Lote de Entrada</span>
                            <div className="font-bold text-sm text-purple-400 flex items-center gap-1.5 justify-end">
                              <IconTag size={14} />
                              <span>{animalSel.lote || "Sin Lote Asignado"}</span>
                            </div>
                            {animalSel.valorEstimado && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                Costo / Valor: ${animalSel.valorEstimado} USD
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => abrirEditarAnimal(animalSel)}
                            title="Editar animal"
                            className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 cursor-pointer transition-colors">
                            <IconEdit size={16} />
                          </button>
                        </div>
                      </div>

                      {/* 3 Bloques Consolidados: Peso & GDP | Vacunas | Reproducción */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        
                        {/* 1. Peso & GDP */}
                        <div className="p-5 rounded-3xl apple-glass border border-white/10 space-y-4">
                          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                            <h4 className="font-['Outfit'] font-black text-sm text-white flex items-center gap-2">
                              <span className="text-sky-400"><IconScale size={16} /></span>
                              <span>Control de Peso & GDP</span>
                            </h4>
                            <span className="font-mono font-bold text-sky-400 text-sm">
                              {animalSel.pesoActual} kg
                            </span>
                          </div>

                          <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-between">
                            <span className="text-xs text-sky-300 font-medium">Ganancia Diaria (GDP):</span>
                            <span className="font-mono font-black text-sm text-white">
                              {fichaGdp?.gdpKgDia != null ? `${fichaGdp.gdpKgDia >= 0 ? "+" : ""}${Number(fichaGdp.gdpKgDia).toFixed(2)} kg/día` : "Faltan pesajes"}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Historial de Pesajes</span>
                            {fichaPesos.length === 0 ? (
                              <div className="text-xs text-slate-400 py-3 text-center bg-white/5 rounded-2xl">
                                Registrado: {animalSel.pesoActual} kg al ingresar.
                              </div>
                            ) : (
                              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                {fichaPesos.map((p) => (
                                  <div key={p.id} className="p-2 rounded-xl bg-white/5 text-xs flex justify-between font-mono">
                                    <span className="text-slate-400">{p.fecha}</span>
                                    <span className="font-bold text-white">{p.pesoKg} kg</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 2. Sanidad & Vacunación */}
                        <div className="p-5 rounded-3xl apple-glass border border-white/10 space-y-4">
                          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                            <h4 className="font-['Outfit'] font-black text-sm text-white flex items-center gap-2">
                              <span className="text-emerald-400"><IconSyringe size={16} /></span>
                              <span>Vacunas & Sanidad</span>
                            </h4>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold">
                              {fichaVacunas.length + fichaMedicamentos.length} eventos
                            </span>
                          </div>

                          <div className="space-y-2">
                            <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-white/40">
                              Vacunas ({fichaVacunas.length})
                            </div>
                            {fichaVacunas.length === 0 ? (
                              <div className="text-xs text-slate-400 py-6 text-center bg-white/5 rounded-2xl">
                                No registra vacunas aún en backend.<br />
                                <button
                                  type="button"
                                  onClick={() => setVacunaAbierta({ animalId: animalSel.id })}
                                  className="text-[11px] text-emerald-400 hover:text-emerald-300 underline mt-1 inline-block cursor-pointer">
                                  Aplicar dosis ahora →
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-2 max-h-60 overflow-y-auto">
                                {fichaVacunas.map((v) => {
                                  const hoyStr = new Date().toISOString().slice(0, 10);
                                  const refuerzoVencido = v.fechaProximaDosis && v.fechaProximaDosis < hoyStr;
                                  return (
                                  <div key={v.id} className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs space-y-1">
                                    <div className="flex justify-between font-bold text-white">
                                      <span>{v.vacuna?.nombre || "Vacuna Sanitaria"}</span>
                                      <span className="text-emerald-400 font-mono text-[11px]">${v.costo || 0} USD</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                                      <span>Fecha: {v.fechaAplicacion}</span>
                                      <span>Lote: {v.lote || "S/L"}</span>
                                    </div>
                                    {v.veterinarioResponsable && (
                                      <div className="text-[10px] text-slate-400">Vet: {v.veterinarioResponsable}</div>
                                    )}
                                    {v.fechaProximaDosis && (
                                      <div className={`text-[10px] font-bold ${refuerzoVencido ? "text-rose-400" : "text-amber-400"}`}>
                                        {refuerzoVencido ? "Refuerzo VENCIDO: " : "Proximo refuerzo: "}{v.fechaProximaDosis}
                                      </div>
                                    )}
                                  </div>
                                  );
                                })}
                              </div>
                            )}

                            <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-white/40 pt-2">
                              Tratamientos & Medicamentos ({fichaMedicamentos.length})
                            </div>
                            {fichaMedicamentos.length === 0 ? (
                              <div className="text-xs text-slate-400 py-4 text-center bg-white/5 rounded-2xl">
                                Sin tratamientos con medicamentos registrados.
                              </div>
                            ) : (
                              <div className="space-y-2 max-h-60 overflow-y-auto">
                                {fichaMedicamentos.map((m) => {
                                  const hoy = new Date().toISOString().slice(0, 10);
                                  const retiroLecheActivo = m.fechaFinRetiroLeche && m.fechaFinRetiroLeche >= hoy;
                                  const retiroCarneActivo = m.fechaFinRetiroCarne && m.fechaFinRetiroCarne >= hoy;
                                  return (
                                    <div key={m.id} className="p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/15 text-xs space-y-1">
                                      <div className="flex justify-between font-bold text-white">
                                        <span>{m.medicamento?.nombre || "Tratamiento"}</span>
                                        <span className="text-rose-300 font-mono text-[11px]">${m.costo || 0} USD</span>
                                      </div>
                                      {m.motivoDiagnostico && (
                                        <div className="text-[10px] text-slate-300">{m.motivoDiagnostico}</div>
                                      )}
                                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                                        <span>Fecha: {m.fechaAplicacion}</span>
                                        {m.veterinarioResponsable && <span>Vet: {m.veterinarioResponsable}</span>}
                                      </div>
                                      {(retiroLecheActivo || retiroCarneActivo) && (
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                          {retiroLecheActivo && (
                                            <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                                              Retiro leche hasta {m.fechaFinRetiroLeche}
                                            </span>
                                          )}
                                          {retiroCarneActivo && (
                                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                                              Retiro carne hasta {m.fechaFinRetiroCarne}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 3. Historial Reproductivo */}
                        <div className="p-5 rounded-3xl apple-glass border border-white/10 space-y-4">
                          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                            <h4 className="font-['Outfit'] font-black text-sm text-white flex items-center gap-2">
                              <span className="text-purple-400"><IconDna size={16} /></span>
                              <span>Historial Reproductivo</span>
                            </h4>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-bold">
                              {animalSel.sexo === "HEMBRA" ? "Hembra Activa" : "Macho / Semental"}
                            </span>
                          </div>

                          {animalSel.sexo !== "HEMBRA" ? (
                            <div className="text-xs text-slate-400 py-6 text-center bg-white/5 rounded-2xl">
                              Toro reproductor / semental del hato.<br />
                              <span className="text-[11px] text-purple-400 mt-1 inline-block">Disponible para montas naturales</span>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {fichaEventosRepro.length === 0 ? (
                                <div className="text-xs text-slate-400 py-6 text-center bg-white/5 rounded-2xl">
                                  Sin eventos reproductivos registrados.<br />
                                  <span className="text-[11px] text-purple-400 mt-1 inline-block">Registra celos o montas en Eventos</span>
                                </div>
                              ) : (
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                  {fichaEventosRepro.map((e) => (
                                    <div key={e.id} className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs space-y-1">
                                      <div className="flex justify-between font-bold text-white">
                                        <span className="uppercase">{e.tipo}</span>
                                        <span className="text-purple-400 text-[10px]">{e.resultado || "REGISTRADO"}</span>
                                      </div>
                                      <div className="text-[10px] text-slate-400 font-mono">
                                        Fecha: {e.fecha}
                                      </div>
                                      {e.fechaProbableParto && (
                                        <div className="text-[10px] text-emerald-400 font-bold">
                                          Parto estimado: {e.fechaProbableParto}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })()}
                </div>
              )
            )}

            {/* VISTA 2: CONSOLIDADO POR LOTE */}
            {subSanidad === "lotes" && (
              <div className="space-y-6">
                {/* Métricas por Lote */}
                {(() => {
                  // Agrupar animales por lote
                  const lotesMap = new Map<string, AnimalGanaderia[]>();
                  for (const a of animales) {
                    const l = a.lote && a.lote.trim() ? a.lote.trim() : "Sin Lote Asignado";
                    if (!lotesMap.has(l)) lotesMap.set(l, []);
                    lotesMap.get(l)!.push(a);
                  }

                  const listaLotes = Array.from(lotesMap.entries());

                  return (
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {listaLotes.map(([nombreLote, grupo]) => {
                          const totalCabezas = grupo.length;
                          const pesoTotal = grupo.reduce((s, it) => s + (Number(it.pesoActual) || 0), 0);
                          const pesoPromedio = totalCabezas > 0 ? (pesoTotal / totalCabezas).toFixed(1) : "0";
                          const machos = grupo.filter(a => a.sexo === "MACHO").length;
                          const hembras = grupo.filter(a => a.sexo === "HEMBRA").length;
                          const activos = grupo.filter(a => a.estado === "ACTIVO").length;
                          const bajas = grupo.filter(a => a.estado === "MUERTO" || a.estado === "VENDIDO").length;

                          // Vacunas pendientes de este lote
                          const aretesLote = new Set(grupo.map(a => a.arete));
                          const alertasLote = alertasSanitarias.filter(al => aretesLote.has(al.animal?.arete));

                          return (
                            <div
                              key={nombreLote}
                              className="p-5 rounded-3xl apple-glass border border-white/10 space-y-3.5 text-left hover:border-purple-500/40 transition-all"
                            >
                              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Lote de Entrada</span>
                                  <h4 className="font-['Outfit'] font-black text-base text-white truncate max-w-[200px]">
                                    {nombreLote}
                                  </h4>
                                </div>
                                <span className="font-mono font-black text-xl text-emerald-400">
                                  {totalCabezas} <span className="text-xs font-normal text-slate-400">cab.</span>
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="p-2 rounded-xl bg-white/5">
                                  <span className="text-[10px] text-slate-400 block">Peso Promedio</span>
                                  <span className="font-mono font-bold text-white text-sm">{pesoPromedio} kg</span>
                                </div>
                                <div className="p-2 rounded-xl bg-white/5">
                                  <span className="text-[10px] text-slate-400 block">Composición</span>
                                  <span className="font-bold text-white text-xs">{hembras} Hembras / {machos} M.</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                                <span className="text-slate-400">Estado:</span>
                                <span className="font-bold text-white">{activos} Activos {bajas > 0 ? `· ${bajas} Bajas` : ""}</span>
                              </div>

                              {alertasLote.length > 0 ? (
                                <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[11px] text-amber-300 flex items-center justify-between">
                                  <span className="inline-flex items-center gap-1"><IconWarning size={12} /> Vacunas / Retiros pendientes:</span>
                                  <span className="font-black font-mono">{alertasLote.length}</span>
                                </div>
                              ) : (
                                <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                                  <IconCheckCircle size={13} />
                                  <span>Plan sanitario al día en este lote</span>
                                </div>
                              )}

                              {/* Lista de Aretes del Lote */}
                              <div className="pt-2">
                                <span className="text-[10px] font-bold text-slate-400 block mb-1">Aretes en este Lote:</span>
                                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                                  {grupo.map(a => (
                                    <button
                                      key={a.id}
                                      onClick={() => {
                                        setAnimalFichaId(a.id);
                                        setSubSanidad("individual");
                                      }}
                                      title={`Ver ficha individual de ${a.arete}`}
                                      className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-emerald-600 text-white font-mono text-[10px] font-bold transition-colors cursor-pointer"
                                    >
                                      {a.arete}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

          </div>
        )}

        {tab === "eventos" && (
          <SeccionEventos
            animales={animales}
            notificar={notificar}
            potreros={potreros}
            abrirNuevoPotrero={abrirNuevoPotrero}
            abrirVaqueraRapida={abrirVaqueraRapida}
            abrirVentaAnimales={abrirVentaAnimales}
            setAltaAnimal={setAltaAnimal}
            setCeloAbierto={setCeloAbierto}
            setMastitisAbierta={setMastitisAbierta}
            setModalPesaje={setModalPesaje}
            setModalRotar={setModalRotar}
            setModalVentaLeche={setModalVentaLeche}
            setOrdenoAbierto={setOrdenoAbierto}
            setReproAbierta={setReproAbierta}
            setSubInventario={setSubInventario}
            setTab={setTab}
            setVacunaAbierta={setVacunaAbierta}
          />
        )}

        {/* ─────────────────────────────────────────────────────────────
            PESTAÑA 5: PRODUCCIÓN & PESAJES
        ───────────────────────────────────────────────────────────── */}
        {tab === "produccion" && (
          <SeccionProduccion
            monedasConfig={monedasConfig}
            ordenos={ordenos}
            precioLecheUSD={precioLecheUSD}
            tanqueLeche={tanqueLeche}
            tasaBCV={tasaBCV}
            tasaCOP={tasaCOP}
            ventasLeche={ventasLeche}
            abrirVaqueraRapida={abrirVaqueraRapida}
            setModalAjusteTanque={setModalAjusteTanque}
            setModalEditarPrecioLeche={setModalEditarPrecioLeche}
            setModalEditarTasas={setModalEditarTasas}
            setModalVentaLeche={setModalVentaLeche}
            setOrdenoAbierto={setOrdenoAbierto}
          />
        )}

        {/* ─────────────────────────────────────────────────────────────
            PESTAÑA 6: CENTRO DE REPORTES (GANSOFT STYLE)
        ───────────────────────────────────────────────────────────── */}
        {/* ─────────────────────────────────────────────────────────────
            PESTAÑA 6: CENTRO DE REPORTES & FINANZAS DEL HATO
        ───────────────────────────────────────────────────────────── */}
        {tab === "reportes" && (
          <SeccionFinanzas
            gastos={gastos}
            monedasConfig={monedasConfig}
            notificar={notificar}
            ordenos={ordenos}
            potreros={potreros}
            precioLecheUSD={precioLecheUSD}
            tasaBCV={tasaBCV}
            tasaCOP={tasaCOP}
            vacunas={vacunas}
            ventasAnimales={ventasAnimales}
            ventasLeche={ventasLeche}
            exportarInventarioXLSX={exportarInventarioXLSX}
            setGastoAbierto={setGastoAbierto}
            setSubPotreros={setSubPotreros}
            setTab={setTab}
          />
        )}

        {tab === "engorde" && (
          <EngordeGanadero
            tenantId={tenantId}
            puedeCorregir={puedeImportarHato}
            notificar={notificar}
            onCambio={cargarDatos}
          />
        )}

        {tab === "sociedades" && (
          <SociedadesCeba
            animales={animales}
            puedeGestionar={puedeImportarHato}
            notificar={notificar}
            onCambio={cargarDatos}
          />
        )}

        {tab === "auditoria" && user?.rol === "DUENO_ADMIN" && (
          <BitacoraAuditoria moduloSugerido="GANADERIA" />
        )}

      </main>
      </div>

      {/* ── MODAL: ACTUALIZAR TASAS A MANO ── */}
      {modalEditarTasas && (
        <ModalTasasMonedas
          tasaBCV={tasaBCV}
          tasaCOP={tasaCOP}
          monedasConfig={monedasConfig}
          onGuardar={guardarTasas}
          onCerrar={() => setModalEditarTasas(false)}
        />
      )}

      {/* MODAL: DATOS FISCALES OPCIONALES (RIF, RAZÓN SOCIAL, DOMICILIO) */}
      {modalDatosFiscales && (
        <ModalDatosFiscales notificar={notificar} onCerrar={() => setModalDatosFiscales(false)} />
      )}

      {/* MODAL: EDITAR PRECIO DE LA LECHE CENTRALIZADO */}
      {modalEditarPrecioLeche && (
        <ModalPrecioLeche
          precioLecheUSD={precioLecheUSD}
          onGuardar={guardarPrecioLeche}
          onCerrar={() => setModalEditarPrecioLeche(false)}
        />
      )}

      {/* MODAL: VENTA DE LECHE EN TANQUE (CISTERNA / PLANTA) */}
      {modalVentaLeche && (
        <ModalDespachoLeche
          tanqueLeche={tanqueLeche}
          precioLecheUSD={precioLecheUSD}
          tasaBCV={tasaBCV}
          tasaCOP={tasaCOP}
          monedasConfig={monedasConfig}
          tenantId={tenantId}
          notificar={notificar}
          onDespachado={(tanque, venta) => { setTanqueLeche(tanque); setVentasLeche(prev => [venta, ...prev]); }}
          onCerrar={() => setModalVentaLeche(false)}
        />
      )}

      {/* MODAL: CALIBRACIÓN Y AJUSTE DE TANQUE DE LECHE */}
      {modalAjusteTanque && (
        <ModalCalibrarTanque
          tanqueLeche={tanqueLeche}
          tenantId={tenantId}
          notificar={notificar}
          onAjustado={setTanqueLeche}
          onCerrar={() => setModalAjusteTanque(false)}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODALES DE ACCIÓN
      ───────────────────────────────────────────────────────────── */}

      {/* MODAL: ALTA DE ANIMAL */}
      {ultimaVacunacion && (
        <div className="fixed bottom-5 right-5 z-30 apple-glass rounded-2xl border border-emerald-500/40 shadow-2xl p-4 max-w-sm text-left space-y-2.5 animate-fade-in">
          <div className="flex items-start justify-between gap-3">
            <div className="text-xs">
              <div className="font-bold text-slate-900 dark:text-white">Vacunación registrada</div>
              <div className="text-slate-500 dark:text-white/60">
                {ultimaVacunacion.nombre} · {ultimaVacunacion.cantidad} animal(es)
              </div>
            </div>
            <button onClick={() => setUltimaVacunacion(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer" aria-label="Cerrar">
              <IconClose size={16} />
            </button>
          </div>
          <button
            onClick={async () => {
              try {
                abrirPdf(await descargarConstanciaVacunacionPdf(ultimaVacunacion.fecha, ultimaVacunacion.fecha, ultimaVacunacion.vacunaId));
              } catch (e) {
                notificar(`No se pudo generar la constancia: ${e instanceof Error ? e.message : "intente de nuevo"}`);
              }
            }}
            className="w-full btn-cyber-neon text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer flex items-center justify-center gap-1.5">
            <IconDownload size={13} />
            <span>Descargar constancia PDF</span>
          </button>
        </div>
      )}

      <TenantSoporteWidget solicitudApertura={aperturaSoporte} soloConTicketActivo />

      {modalImportarHato && (
        <ModalImportarHato
          onCerrar={() => setModalImportarHato(false)}
          onImportado={(cantidad) => {
            setModalImportarHato(false);
            notificar(`${cantidad} animales importados al hato.`);
            cargarDatos();
          }}
        />
      )}

      {altaAnimal && (
        <ModalAltaAnimal
          animales={animales}
          animalesActivos={animalesActivos}
          potreros={potreros}
          valoresIniciales={altaAnimal}
          tenantId={tenantId}
          notificar={notificar}
          onCreado={nuevo => { setAnimales(prev => [nuevo, ...prev]); setAnimalFichaId(nuevo.id); }}
          onCerrar={() => setAltaAnimal(null)}
        />
      )}

      {/* MODAL: AGREGAR POTRERO (MEJORADO CON COLOR PICKER GANSOFT) */}
      {potreroEnModal && (
        <ModalPotrero
          inicial={potreroEnModal.form}
          editandoId={potreroEnModal.editandoId}
          potreros={potreros}
          tenantId={tenantId}
          notificar={notificar}
          onGuardado={alGuardarPotrero}
          onCerrar={() => setPotreroEnModal(null)}
        />
      )}

      {/* MODAL: ROTAR POTRERO */}
      {modalRotar && (
        <ModalRotarPotrero
          origen={modalRotar}
          potreros={potreros}
          tenantId={tenantId}
          notificar={notificar}
          onRotado={alRotarPotrero}
          onCerrar={() => setModalRotar(null)}
        />
      )}

      {/* MODAL: REGISTRAR ORDEÑO */}
      {ordenoAbierto && (
        <ModalOrdeno
          animales={animales}
          animalesActivos={animalesActivos}
          precioLecheUSD={precioLecheUSD}
          tasaBCV={tasaBCV}
          tasaCOP={tasaCOP}
          monedasConfig={monedasConfig}
          tenantId={tenantId}
          notificar={notificar}
          onRegistrado={alRegistrarOrdeno}
          onCerrar={() => setOrdenoAbierto(false)}
        />
      )}

      {/* MODAL: REGISTRAR PESAJE & GDP */}
      {/* MODAL: EDITAR ANIMAL */}
      {modalEditarAnimal && (
        <ModalEditarAnimal
          animal={modalEditarAnimal}
          potreros={potreros}
          notificar={notificar}
          onActualizado={act => setAnimales(prev => prev.map(a => a.id === modalEditarAnimal.id ? { ...a, ...act } : a))}
          onCerrar={() => setModalEditarAnimal(null)}
        />
      )}

      {modalPesaje && (
        <ModalPesaje
          animal={modalPesaje}
          tenantId={tenantId}
          notificar={notificar}
          onPesado={peso => setAnimales(prev => prev.map(a => a.id === modalPesaje.id ? { ...a, pesoActual: peso } : a))}
          onEncolado={() => setPendientesOffline(contarPendientesGanaderia(tenantId))}
          onCerrar={() => setModalPesaje(null)}
        />
      )}

      {/* MODAL: FICHA & QR */}
      {modalFichaAnimal && (
        <ModalFichaAnimal animal={modalFichaAnimal} onCerrar={() => setModalFichaAnimal(null)} />
      )}

      {/* MODAL: VACUNACIÓN & TRATAMIENTOS SANITARIOS */}
      {vacunaAbierta && (
        <ModalVacunacion
          animales={animales}
          animalesActivos={animalesActivos}
          potreros={potreros}
          vacunas={vacunas}
          animalIdInicial={vacunaAbierta.animalId}
          tenantId={tenantId}
          notificar={notificar}
          onVacunaCreada={v => setVacunas(prev => [...prev, v])}
          onAplicada={alAplicarVacuna}
          onCerrar={() => setVacunaAbierta(null)}
        />
      )}

      {/* MODAL: REPRODUCCIÓN */}
      {reproAbierta && (
        <ModalReproduccion
          animalesActivos={animalesActivos}
          valoresIniciales={reproAbierta}
          tenantId={tenantId}
          notificar={notificar}
          onCerrar={() => setReproAbierta(null)}
        />
      )}

      {/* MODAL: EVENTO DEDICADO DE CELO & SINCRONIZACIÓN */}
      {celoAbierto && (
        <ModalCelo
          animales={animales}
          animalesActivos={animalesActivos}
          tenantId={tenantId}
          notificar={notificar}
          onRegistrado={id => setAnimales(prev => prev.map(a => a.id === id ? { ...a, estadoReproductivo: "EN_ESPERA" } : a))}
          onCerrar={() => setCeloAbierto(false)}
        />
      )}

      {/* MODAL: EVENTO DEDICADO DE MASTITIS (SANIDAD & RETIRO DE LECHE) */}
      {mastitisAbierta && (
        <ModalMastitis
          animales={animales}
          animalesActivos={animalesActivos}
          tenantId={tenantId}
          notificar={notificar}
          onCerrar={() => setMastitisAbierta(false)}
        />
      )}

      {/* MODAL: REGISTRO DE VENTA / DESPACHO DE ANIMAL (individual o lote, por precio total o por kilo) */}
      {ventaAbierta && (
        <ModalVentaAnimales
          modoInicial={ventaAbierta}
          animales={animales}
          tenantId={tenantId}
          notificar={notificar}
          onVendidos={ids => setAnimales(prev => prev.map(a => ids.includes(a.id) ? { ...a, estado: "VENDIDO", potrero: undefined } : a))}
          onCerrar={() => setVentaAbierta(null)}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: MODO VAQUERA RÁPIDA (BULK ENTRY DE ORDEÑO DIARIO)
      ───────────────────────────────────────────────────────────── */}
      {vaqueraAbierta && (
        <ModalJornadaOrdeno
          animalesActivos={animalesActivos}
          tenantId={tenantId}
          precioLecheUSD={precioLecheUSD}
          tasaBCV={tasaBCV}
          tasaCOP={tasaCOP}
          monedasConfig={monedasConfig}
          notificar={notificar}
          onJornadaGuardada={alGuardarJornada}
          onCerrar={() => setVaqueraAbierta(false)}
        />
      )}

      {/* ── MODAL: REGISTRAR GASTO OPERATIVO DEL HATO ── */}
      {gastoAbierto && (
        <ModalGasto
          tasaBCV={tasaBCV}
          tasaCOP={tasaCOP}
          monedasConfig={monedasConfig}
          tenantId={tenantId}
          notificar={notificar}
          onRegistrado={g => setGastos(prev => [g, ...prev])}
          onCerrar={() => setGastoAbierto(false)}
        />
      )}

    </div>
  );
}
