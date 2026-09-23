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
import SeccionPanel from "./ganaderia/SeccionPanel";
import SeccionHato from "./ganaderia/SeccionHato";
import SeccionSanidad from "./ganaderia/SeccionSanidad";
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

  // Modales
  const [altaAnimal, setAltaAnimal] = useState<Partial<FormAltaAnimal> | null>(null);
  const [modalImportarHato, setModalImportarHato] = useState(false);
  // Última jornada de vacunación registrada: ofrece descargar su constancia PDF.
  const [ultimaVacunacion, setUltimaVacunacion] = useState<{ fecha: string; vacunaId: number; nombre: string; cantidad: number } | null>(null);
  const [prenezActual, setPrenezActual] = useState<PrenezActualGanaderia[]>([]);
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
          <SeccionPanel
            alertasSanitarias={alertasSanitarias}
            animales={animales}
            animalesActivos={animalesActivos}
            monedasConfig={monedasConfig}
            ordenos={ordenos}
            potreros={potreros}
            precioLecheUSD={precioLecheUSD}
            tanqueLeche={tanqueLeche}
            tasaBCV={tasaBCV}
            tasaCOP={tasaCOP}
            tenantId={tenantId}
            totalAnimales={totalAnimales}
            vacunas={vacunas}
            ventasLeche={ventasLeche}
            abrirNuevoPotrero={abrirNuevoPotrero}
            setAltaAnimal={setAltaAnimal}
            setModalAjusteTanque={setModalAjusteTanque}
            setModalRotar={setModalRotar}
            setModalVentaLeche={setModalVentaLeche}
            setOrdenoAbierto={setOrdenoAbierto}
            setSubPotreros={setSubPotreros}
            setTab={setTab}
          />
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
          <SeccionHato
            alertasSanitarias={alertasSanitarias}
            animales={animales}
            animalesActivos={animalesActivos}
            notificar={notificar}
            potreros={potreros}
            prenezActual={prenezActual}
            puedeImportarHato={puedeImportarHato}
            subInventario={subInventario}
            totalAnimales={totalAnimales}
            abrirEditarAnimal={abrirEditarAnimal}
            abrirVentaAnimales={abrirVentaAnimales}
            exportarInventarioXLSX={exportarInventarioXLSX}
            setAltaAnimal={setAltaAnimal}
            setAnimalFichaId={setAnimalFichaId}
            setModalFichaAnimal={setModalFichaAnimal}
            setModalImportarHato={setModalImportarHato}
            setModalPesaje={setModalPesaje}
            setSubInventario={setSubInventario}
            setSubSanidad={setSubSanidad}
            setTab={setTab}
          />
        )}

        {/* ─────────────────────────────────────────────────────────────
            PESTAÑA 4: CENTRO DE EVENTOS (INSPIRADO EN GANSOFT)
        ───────────────────────────────────────────────────────────── */}
                {/* ═════════════════════════════════════════════════════════════
            PESTAÑA 3.5: SANIDAD & TRAZABILIDAD (INDIVIDUAL Y POR LOTE)
        ═════════════════════════════════════════════════════════════ */}
        {tab === "sanidad" && (
          <SeccionSanidad
            alertas={alertas}
            alertasSanitarias={alertasSanitarias}
            animales={animales}
            animalFichaId={animalFichaId}
            notificar={notificar}
            subSanidad={subSanidad}
            tenantId={tenantId}
            vacunas={vacunas}
            abrirEditarAnimal={abrirEditarAnimal}
            setAltaAnimal={setAltaAnimal}
            setAnimalFichaId={setAnimalFichaId}
            setSubSanidad={setSubSanidad}
            setVacunaAbierta={setVacunaAbierta}
          />
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
