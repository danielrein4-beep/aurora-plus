import { useState, useEffect } from "react";
import AuroraLogo from "../AuroraLogo";
import { AuroraGradientDef } from "../Icons";
import ThemeToggle from "./ThemeToggle";
import {
  IconCheckCircle, IconClose, IconDownload, IconFileText,
  IconCalendar, IconCard, IconCustomize, IconRocket, IconChart,
  IconPrescription, IconUsers, IconHourglass,
  IconWheat, IconSyringe, IconWrench, IconTractor, IconTruck, IconBolt, IconBox,
  IconWarning, IconFire, IconMilk, IconEdit, IconSettings, IconPin, IconCow,
  IconSnowflake, IconTag, IconShield, IconDna, IconScale, IconSprout, IconCart,
  IconMeat, IconRefresh, IconBulb, IconCoins
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
  type GastoGanaderia, type VentaGanaderiaResumen
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

// Catálogo sugerido de razas bovinas — se ofrece como datalist (autocompletar)
// pero el campo sigue siendo texto libre por si la raza real no está en la lista.
const RAZAS_BOVINAS_COMUNES = [
  "Brahman", "Gyr", "Gyrolando", "Pardo Suizo", "Holstein", "Jersey",
  "Angus", "Brangus", "Simmental", "Charolais", "Nelore", "Senepol",
  "Guzerat", "Criollo Limonero", "Carora", "Romosinuano", "Mestizo",
  // Cruces / F1 más comunes en fincas de doble propósito — el campo sigue
  // siendo texto libre, así que cualquier otra combinación se puede escribir igual.
  "F1 Brahman x Gyr", "F1 Brahman x Holstein", "F1 Gyr x Holstein",
  "F1 Pardo Suizo x Cebú", "F1 Angus x Brahman (Brangus)",
  "5/8 Holstein x Cebú", "3/4 Cebú x Europeo", "Cruzado (especificar)",
];

const DEFAULT_VACUNAS_CATALOGO: VacunaGanaderia[] = [
  { id: 1, tenantId: 1, nombre: "Aftosa Bivalente (A+O)", diasParaRefuerzo: 180, diasRetiroLeche: 0, diasRetiroCarne: 0 },
  { id: 2, tenantId: 1, nombre: "Rabia Paralítica Bovina", diasParaRefuerzo: 365, diasRetiroLeche: 0, diasRetiroCarne: 0 },
  { id: 3, tenantId: 1, nombre: "Triple Bovina (Clostridiosis)", diasParaRefuerzo: 365, diasRetiroLeche: 0, diasRetiroCarne: 21 },
  { id: 4, tenantId: 1, nombre: "Ivermectina 1% Endectocida", diasParaRefuerzo: 90, diasRetiroLeche: 28, diasRetiroCarne: 35 },
];

// Catálogo de referencia de biológicos/antiparasitarios de uso común en ganadería
// venezolana — se ofrece como lista buscable de un clic al agregar al catálogo real
// del tenant (con los días de retiro/refuerzo típicos ya cargados, editables antes
// de guardar); no reemplaza la opción de registrar cualquier otro producto a mano.
const CATALOGO_VACUNAS_SUGERIDAS: { nombre: string; enfermedadPrevenida: string; diasRetiroLeche: number; diasRetiroCarne: number; diasParaRefuerzo: number }[] = [
  { nombre: "Fiebre Aftosa Trivalente", enfermedadPrevenida: "Fiebre Aftosa", diasRetiroLeche: 4, diasRetiroCarne: 21, diasParaRefuerzo: 180 },
  { nombre: "Carbón Bacteridiano y Sintomático (Carbón Combinado)", enfermedadPrevenida: "Carbunco / Carbón Sintomático", diasRetiroLeche: 0, diasRetiroCarne: 21, diasParaRefuerzo: 365 },
  { nombre: "Brucelosis Cepa 19 (Becerras 3-8 meses)", enfermedadPrevenida: "Brucelosis", diasRetiroLeche: 0, diasRetiroCarne: 0, diasParaRefuerzo: 0 },
  { nombre: "Brucelosis Cepa RB51", enfermedadPrevenida: "Brucelosis", diasRetiroLeche: 0, diasRetiroCarne: 0, diasParaRefuerzo: 0 },
  { nombre: "Rabia Paralítica Bovina", enfermedadPrevenida: "Rabia (transmitida por murciélago hematófago)", diasRetiroLeche: 0, diasRetiroCarne: 0, diasParaRefuerzo: 365 },
  { nombre: "Triple Bovina (Clostridiosis)", enfermedadPrevenida: "Clostridiosis (Pierna Negra, Enterotoxemia, Edema Maligno)", diasRetiroLeche: 0, diasRetiroCarne: 21, diasParaRefuerzo: 180 },
  { nombre: "IBR + DVB + PI3 + BRSV (Respiratoria Bovina)", enfermedadPrevenida: "Complejo Respiratorio Bovino", diasRetiroLeche: 4, diasRetiroCarne: 30, diasParaRefuerzo: 180 },
  { nombre: "Leptospirosis (5 vías)", enfermedadPrevenida: "Leptospirosis", diasRetiroLeche: 0, diasRetiroCarne: 21, diasParaRefuerzo: 180 },
  { nombre: "Vitaminas ADE Inyectable", enfermedadPrevenida: "Suplemento — deficiencia de vitaminas A, D y E", diasRetiroLeche: 0, diasRetiroCarne: 0, diasParaRefuerzo: 90 },
  { nombre: "Ivermectina 1% Endectocida", enfermedadPrevenida: "Parásitos internos y externos", diasRetiroLeche: 28, diasRetiroCarne: 35, diasParaRefuerzo: 90 },
  { nombre: "Doramectina 1% Endectocida", enfermedadPrevenida: "Parásitos internos y externos (mayor persistencia que ivermectina)", diasRetiroLeche: 28, diasRetiroCarne: 45, diasParaRefuerzo: 120 },
  { nombre: "Closantel (Antiparasitario Interno)", enfermedadPrevenida: "Fasciola hepática y parásitos internos", diasRetiroLeche: 28, diasRetiroCarne: 30, diasParaRefuerzo: 90 },
  { nombre: "Baño Garrapaticida (Amitraz / Cipermetrina)", enfermedadPrevenida: "Garrapatas y ectoparásitos", diasRetiroLeche: 0, diasRetiroCarne: 0, diasParaRefuerzo: 21 },
];

const CATEGORIAS_GASTO_GANADERIA = [
  { id: "ALIMENTACION", label: "Alimentación / Suplementos / Sal", icon: IconWheat, colorBadge: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  { id: "SANIDAD", label: "Sanidad / Vacunas / Fármacos", icon: IconSyringe, colorBadge: "text-sky-400 bg-sky-500/10 border-sky-500/30" },
  { id: "MANO_DE_OBRA", label: "Mano de Obra / Jornales / Nómina", icon: IconUsers, colorBadge: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  { id: "MANTENIMIENTO", label: "Mantenimiento / Cercas / Potreros", icon: IconWrench, colorBadge: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" },
  { id: "MAQUINARIA", label: "Maquinaria / Repuestos / Combustible", icon: IconTractor, colorBadge: "text-purple-400 bg-purple-500/10 border-purple-500/30" },
  { id: "TRANSPORTE", label: "Fletes / Transporte de Ganado", icon: IconTruck, colorBadge: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
  { id: "SERVICIOS", label: "Servicios Básicos / Electricidad / Agua", icon: IconBolt, colorBadge: "text-orange-400 bg-orange-500/10 border-orange-500/30" },
  { id: "OTROS", label: "Otros Gastos Operativos", icon: IconBox, colorBadge: "text-slate-300 bg-slate-500/10 border-slate-500/30" },
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
    setFormOrdeno(prev => ({ ...prev, precioVentaLitro: nuevoPrecio }));
    setVaqueraPrecioUSD(nuevoPrecio);
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
    setVaqueraTasaVES(nuevaBcv);
    if (vesActivo !== undefined && copActivo !== undefined) {
      guardarMonedasConfig(vesActivo, copActivo);
    }
    try {
      localStorage.setItem("aurora_ganaderia_tasa_bcv", String(nuevaBcv));
      localStorage.setItem("aurora_ganaderia_tasa_cop", String(nuevaCop));
    } catch {}
    setModalEditarTasas(false);
  };

  // Tanque de Leche & Ventas en Cisterna
  const [tanqueLeche, setTanqueLeche] = useState<TanqueLeche | null>(null);
  const [ventasLeche, setVentasLeche] = useState<VentaLecheTanque[]>([]);
  const [modalVentaLeche, setModalVentaLeche] = useState(false);
  const [modalAjusteTanque, setModalAjusteTanque] = useState(false);
  const [vaqueraDestino, setVaqueraDestino] = useState<"TANQUE" | "VENTA_DIRECTA">("TANQUE");

  const [formVentaLeche, setFormVentaLeche] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    litrosVendidos: 200,
    precioLitroUSD: 0.55,
    compradorOPlanta: "",
    monedaPago: "USD",
    notas: "",
  });

  // Gastos Operativos del Hato & Ventas de Animales
  const [gastos, setGastos] = useState<GastoGanaderia[]>([]);
  const [ventasAnimales, setVentasAnimales] = useState<VentaGanaderiaResumen[]>([]);
  const [modalGasto, setModalGasto] = useState(false);
  const [formGasto, setFormGasto] = useState({
    categoria: "ALIMENTACION",
    descripcion: "",
    monto: "" as number | string,
    fecha: new Date().toISOString().slice(0, 10),
  });

  // Pestaña principal activa
  const [tab, setTab] = useState<"resumen" | "potreros" | "inventario" | "sanidad" | "eventos" | "produccion" | "reportes">("resumen");

  // Sub-vistas Sanidad & Trazabilidad
  const [subSanidad, setSubSanidad] = useState<"individual" | "lotes">("individual");
  const [animalFichaId, setAnimalFichaId] = useState<number | null>(null);
  const [alertasSanitarias, setAlertasSanitarias] = useState<AlertaSanitariaGanaderia[]>([]);
  const [fichaVacunas, setFichaVacunas] = useState<AplicacionVacunaGanaderia[]>([]);
  const [fichaMedicamentos, setFichaMedicamentos] = useState<AplicacionMedicamentoGanaderia[]>([]);
  const [fichaEventosRepro, setFichaEventosRepro] = useState<EventoReproductivoGanaderia[]>([]);
  const [fichaPesos, setFichaPesos] = useState<RegistroPesoGanaderia[]>([]);
  const [fichaGdp, setFichaGdp] = useState<GdpGanaderiaResponse | null>(null);
  const [cargandoFicha, setCargandoFicha] = useState(false);

  // Sub-vistas por pestaña
  const [subPotreros, setSubPotreros] = useState<"mapa" | "lista">("mapa");
  const [subInventario, setSubInventario] = useState<"matriz" | "fichas" | "distribucion">("matriz");

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
  const [modalNuevoAnimal, setModalNuevoAnimal] = useState(false);
  const [modalNuevoPotrero, setModalNuevoPotrero] = useState(false);
  const [modalRotar, setModalRotar] = useState<PotreroGanaderia | null>(null);
  const [modalOrdeno, setModalOrdeno] = useState(false);
  const [modalPesaje, setModalPesaje] = useState<AnimalGanaderia | null>(null);
  const [modalVacuna, setModalVacuna] = useState(false);
  const [modalReproduccion, setModalReproduccion] = useState(false);
  const [modalCelo, setModalCelo] = useState(false);
  const [modalMastitis, setModalMastitis] = useState(false);
  const [modalFichaAnimal, setModalFichaAnimal] = useState<AnimalGanaderia | null>(null);
  const [modalVentaAnimal, setModalVentaAnimal] = useState(false);
  const [modalEditarAnimal, setModalEditarAnimal] = useState<AnimalGanaderia | null>(null);
  const [modalDatosFiscales, setModalDatosFiscales] = useState(false);
  const [formDatosFiscales, setFormDatosFiscales] = useState({ rif: "", razonSocial: "", domicilioFiscal: "" });
  const [formEditarAnimal, setFormEditarAnimal] = useState({
    nombre: "",
    raza: "",
    tipoAnimal: "VACA",
    pesoActual: 0,
    lote: "",
    potreroId: 0,
    estadoReproductivo: "VACIA" as "VACIA" | "PREÑADA" | "EN_ESPERA",
    estadoProductivo: "SECA" as "CRIANDO" | "ORDEÑO" | "SECA",
  });

  // Formulario nuevo animal con soporte de Origen (Nacimiento / Compra) y Estados Reproductivo/Productivo
  const [formAnimal, setFormAnimal] = useState({
    arete: "",
    tipoIdentificador: "ARETE",
    nombre: "",
    especie: "BOVINO",
    raza: "Brahman",
    sexo: "HEMBRA",
    tipoAnimal: "VACA",
    fechaNacimiento: new Date().toISOString().slice(0, 10),
    pesoActual: 380,
    valorEstimado: 900,
    potreroId: 0,
    lote: "",
    origen: "NACIMIENTO" as "NACIMIENTO" | "COMPRA",
    madreId: null as number | null,
    proveedor: "",
    costoCompra: 0,
    fechaCompra: new Date().toISOString().slice(0, 10),
    estadoReproductivo: "VACIA" as "VACIA" | "PREÑADA" | "EN_ESPERA",
    estadoProductivo: "SECA" as "CRIANDO" | "ORDEÑO" | "SECA",
  });

  // Formulario de Celos (Evento Reproductivo dedicado)
  const [formCelo, setFormCelo] = useState({
    hembraId: 0,
    fecha: new Date().toISOString().slice(0, 10),
    tipoCelo: "NATURAL",
    sintomasCelo: "Acepta monta, moco cristalino abundante, hiperactividad",
    horaOptimaIA: "AM/PM: Inseminar 12 horas después de observado el celo",
  });

  // Formulario de Mastitis (Sanidad dedicada con retiro de leche)
  const [formMastitis, setFormMastitis] = useState({
    animalId: 0,
    fecha: new Date().toISOString().slice(0, 10),
    cuartoAfectado: "PD",
    gradoCmt: "GRADO_2",
    farmacoAplicado: "Cefalexina + Gentamicina Intramamaria",
    diasRetiroLeche: 4,
    veterinario: "Dr. Médico Veterinario",
    costo: 12.0,
    notas: "Cuarto posterior derecho caliente y reactivo al reactivo California Mastitis Test (CMT).",
  });

  // Formulario de Venta / Beneficio
  const [formVenta, setFormVenta] = useState({
    animalId: 0,
    comprador: "",
    precioUSD: 0,
    precioPorKg: 0,
    pesoSalida: 0,
    motivo: "BENEFICIO",
  });
  const [ventaModo, setVentaModo] = useState<"INDIVIDUAL" | "MULTIPLE">("INDIVIDUAL");
  const [animalesVentaSeleccionados, setAnimalesVentaSeleccionados] = useState<number[]>([]);
  const [ultimaVentaId, setUltimaVentaId] = useState<number | null>(null);
  const [ultimoDespachoLecheId, setUltimoDespachoLecheId] = useState<number | null>(null);

  // Formulario nuevo potrero con color distintivo (estilo GanSoft)
  const [formPotrero, setFormPotrero] = useState({
    codigo: "POT-05",
    nombre: "",
    areaHectareas: 15.0,
    capacidadAnimales: 25,
    tipoPasto: "Brachiaria brizantha",
    color: "#10B981",
    diasDescansoMinimo: 28,
    observaciones: "",
    poligono: undefined as [number, number][] | undefined,
  });
  // Si tiene valor, el modal de "Agregar Potrero" edita ese potrero en vez de crear uno nuevo.
  const [potreroEditandoId, setPotreroEditandoId] = useState<number | null>(null);

  // Estados para Modo Vaquera Rápida (Bulk Entry de Ordeño Diario)
  const [modalVaqueraRapida, setModalVaqueraRapida] = useState(false);
  const [vaqueraFecha, setVaqueraFecha] = useState(new Date().toISOString().slice(0, 10));
  const [vaqueraTurno, setVaqueraTurno] = useState<"MANANA" | "TARDE" | "DOBLE">("MANANA");
  const [vaqueraPrecioUSD, setVaqueraPrecioUSD] = useState<number>(0.45);
  const [vaqueraTasaVES, setVaqueraTasaVES] = useState<number>(tasaBCV);
  const [vaqueraFilas, setVaqueraFilas] = useState<Array<{
    animalId: number;
    arete: string;
    nombre: string;
    litrosManana: number | string;
    litrosTarde: number | string;
    estado: "NORMAL" | "MASTITIS" | "CALOSTRO" | "SECA";
    notas: string;
  }>>([]);

  // Formulario rotación
  const [potreroDestinoId, setPotreroDestinoId] = useState<number>(0);

  // Formulario ordeño rápido
  const [formOrdeno, setFormOrdeno] = useState({
    animalId: 0,
    turno: "MANANA",
    cantidadLitros: 12.5,
    precioVentaLitro: precioLecheUSD,
    porcentajeGrasa: 3.8,
    porcentajeProteina: 3.2,
    destino: "TANQUE" as "TANQUE" | "VENTA_DIRECTA",
  });

  // Formulario pesaje
  const [pesoNuevo, setPesoNuevo] = useState<number>(400);
  const [gdpData, setGdpData] = useState<any>(null);

  // Formulario vacunación (soporte de catálogo real, días de retiro fidedignos y aplicación masiva)
  const [formVacuna, setFormVacuna] = useState({
    animalId: 0,
    vacunaId: 0,
    lote: "L-2026-98",
    veterinario: "Dr. Médico Veterinario",
    costo: 3.5,
  });
  const [vacunacionModo, setVacunacionModo] = useState<"INDIVIDUAL" | "MULTIPLE">("INDIVIDUAL");
  const [animalesVacunaSeleccionados, setAnimalesVacunaSeleccionados] = useState<number[]>([]);
  const [mostrarCrearVacuna, setMostrarCrearVacuna] = useState(false);
  const [busquedaVacunaCatalogo, setBusquedaVacunaCatalogo] = useState("");
  const [nuevaVacunaForm, setNuevaVacunaForm] = useState({
    nombre: "",
    enfermedadPrevenida: "",
    diasRetiroLeche: 0,
    diasRetiroCarne: 0,
    diasParaRefuerzo: 180,
  });

  // Formulario reproducción
  const [formRepro, setFormRepro] = useState({
    hembraId: 0,
    tipo: "DIAGNOSTICO_PRENEZ",
    fecha: new Date().toISOString().slice(0, 10),
    resultado: "PREÑADA_CONFIRMADA",
    fechaProbableParto: new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
    sementalReferenciaExterna: "Pajuela Toro Don Juan (IA)",
  });

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

  // El formulario de Alta de Animal arranca con potreroId: 0 (sin potrero real
  // todavía cargado) — en cuanto la lista real de potreros llega del backend,
  // si el potrero seleccionado no existe de verdad, se corrige al primero real.
  // Sin esto, el <select> mostraba visualmente el potrero correcto pero el
  // estado interno se quedaba en 0/un id inventado y el guardado fallaba con
  // "Potrero no encontrado".
  useEffect(() => {
    if (potreros.length > 0 && !potreros.some(p => p.id === formAnimal.potreroId)) {
      setFormAnimal(prev => ({ ...prev, potreroId: potreros[0].id }));
    }
  }, [potreros]);

  // Mismo problema para el potrero destino al abrir "Rotar Potrero" — debe ser
  // un potrero real distinto del origen, nunca el 0/id inventado inicial.
  useEffect(() => {
    if (!modalRotar) return;
    const opciones = potreros.filter(p => p.id !== modalRotar.id);
    if (opciones.length > 0 && !opciones.some(p => p.id === potreroDestinoId)) {
      setPotreroDestinoId(opciones[0].id);
    }
  }, [modalRotar, potreros]);

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

  // Mismo saneamiento para el resto de formularios que empiezan en 0/sin
  // selección: en cuanto la lista real de animales carga, si el animal
  // seleccionado no existe de verdad, se corrige al primero real disponible.
  useEffect(() => {
    if (animalesActivos.length === 0) return;
    const hembras = animalesActivos.filter(a => a.sexo === "HEMBRA");
    if (!animalesActivos.some(a => a.id === formOrdeno.animalId)) {
      setFormOrdeno(prev => ({ ...prev, animalId: animalesActivos[0].id }));
    }
    if (!animalesActivos.some(a => a.id === formVacuna.animalId)) {
      setFormVacuna(prev => ({ ...prev, animalId: animalesActivos[0].id }));
    }
    if (hembras.length > 0) {
      if (!hembras.some(a => a.id === formRepro.hembraId)) {
        setFormRepro(prev => ({ ...prev, hembraId: hembras[0].id }));
      }
      if (!hembras.some(a => a.id === formCelo.hembraId)) {
        setFormCelo(prev => ({ ...prev, hembraId: hembras[0].id }));
      }
      if (!hembras.some(a => a.id === formMastitis.animalId)) {
        setFormMastitis(prev => ({ ...prev, animalId: hembras[0].id }));
      }
    }
  }, [animalesActivos]);

  // Igual para la vacuna seleccionada en el formulario de aplicación.
  useEffect(() => {
    if (vacunas.length > 0 && !vacunas.some(v => v.id === formVacuna.vacunaId)) {
      setFormVacuna(prev => ({ ...prev, vacunaId: vacunas[0].id }));
    }
  }, [vacunas]);

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
      const [resAnimales, resPotreros, resVacunas, resAlertas] = await Promise.allSettled([
        listarAnimalesGanaderia(),
        listarPotrerosGanaderia(),
        listarVacunasGanaderia(),
        obtenerAlertasGanaderia(tenantId, 30),
      ]);

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
          listarVentasGanaderia(tenantId),
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
  const categoriasHato = [
    { key: "BECERRA", label: "Becerras", filter: (a: AnimalGanaderia) => a.sexo === "HEMBRA" && (a.tipoAnimal === "BECERRA" || (a.pesoActual || 0) < 120) },
    { key: "MAUTA", label: "Mautas", filter: (a: AnimalGanaderia) => a.sexo === "HEMBRA" && (a.tipoAnimal === "MAUTA" || ((a.pesoActual || 0) >= 120 && (a.pesoActual || 0) < 280)) },
    { key: "NOVILLA", label: "Novillas", filter: (a: AnimalGanaderia) => a.sexo === "HEMBRA" && a.tipoAnimal === "NOVILLA" },
    { key: "VACA", label: "Vacas", filter: (a: AnimalGanaderia) => a.sexo === "HEMBRA" && a.tipoAnimal === "VACA" },
    { key: "BECERRO", label: "Becerros", filter: (a: AnimalGanaderia) => a.sexo === "MACHO" && (a.tipoAnimal === "TERNERO" || a.tipoAnimal === "BECERRO" || (a.pesoActual || 0) < 130) },
    { key: "MAUTE", label: "Mautes", filter: (a: AnimalGanaderia) => a.sexo === "MACHO" && (a.tipoAnimal === "MAUTE" || ((a.pesoActual || 0) >= 130 && (a.pesoActual || 0) < 320)) },
    { key: "NOVILLO", label: "Novillos", filter: (a: AnimalGanaderia) => a.sexo === "MACHO" && (a.tipoAnimal === "NOVILLO" || ((a.pesoActual || 0) >= 320 && (a.pesoActual || 0) < 600 && a.tipoAnimal !== "TORO")) },
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

  // Filtrado de animales
  const animalesFiltrados = animales.filter(a => {
    const coincideCat = filtroCategoria === "TODOS" || a.tipoAnimal?.toUpperCase() === filtroCategoria.toUpperCase();
    const coincideBusqueda =
      a.arete.toLowerCase().includes(busquedaArete.toLowerCase()) ||
      (a.nombre && a.nombre.toLowerCase().includes(busquedaArete.toLowerCase())) ||
      (a.raza && a.raza.toLowerCase().includes(busquedaArete.toLowerCase()));
    return coincideCat && coincideBusqueda;
  });

  // Manejador: Crear nuevo animal (Nacimiento en Finca o Ingreso por Compra)
  // cerrarAlTerminar=false deja el modal abierto y solo limpia arete/nombre — pensado para
  // dar de alta varios animales seguidos (una compra grande, varios nacimientos del día)
  // sin tener que reabrir el modal y volver a llenar raza/potrero/origen cada vez.
  const handleGuardarAnimal = async (e: React.FormEvent, cerrarAlTerminar: boolean = true) => {
    e.preventDefault();
    if (!formAnimal.arete.trim()) return;

    try {
      const payload: any = {
        arete: formAnimal.arete.trim(),
        tipoIdentificador: formAnimal.tipoIdentificador,
        nombre: formAnimal.nombre.trim() || undefined,
        especie: formAnimal.especie,
        raza: formAnimal.raza,
        sexo: formAnimal.sexo,
        tipoAnimal: formAnimal.tipoAnimal,
        fechaNacimiento: formAnimal.fechaNacimiento,
        pesoActual: Number(formAnimal.pesoActual) || 0,
        potreroId: formAnimal.potreroId ? Number(formAnimal.potreroId) : undefined,
        costoAdquisicion: formAnimal.origen === "COMPRA" ? Number(formAnimal.costoCompra) : undefined,
        madreId: (formAnimal.origen === "NACIMIENTO" && formAnimal.madreId) ? Number(formAnimal.madreId) : undefined,
        valorEstimado: formAnimal.origen === "COMPRA" ? Number(formAnimal.costoCompra) : Number(formAnimal.valorEstimado),
        estadoReproductivo: formAnimal.sexo === "HEMBRA" ? formAnimal.estadoReproductivo : undefined,
        estadoProductivo: formAnimal.sexo === "HEMBRA" ? formAnimal.estadoProductivo : undefined,
      };

      if (formAnimal.origen === "COMPRA" && formAnimal.proveedor.trim()) {
        payload.lote = formAnimal.lote.trim()
          ? `${formAnimal.lote} (Proveedor: ${formAnimal.proveedor.trim()})`
          : `Compra: ${formAnimal.proveedor.trim()}`;
      } else if (formAnimal.lote.trim()) {
        payload.lote = formAnimal.lote.trim();
      }

      const nuevo = await crearAnimalGanaderia(tenantId, payload);
      setAnimales(prev => [nuevo, ...prev]);
      setAnimalFichaId(nuevo.id);
      notificar(`Animal arete ${nuevo.arete} (${formAnimal.origen === "COMPRA" ? "Compra" : "Nacimiento en Finca"}) registrado con éxito en el hato.`);
    } catch {
      notificar(`No se pudo registrar el animal arete ${formAnimal.arete} — revisa tu conexión e inténtalo de nuevo.`);
      return;
    }

    if (cerrarAlTerminar) {
      setModalNuevoAnimal(false);
      setFormAnimal({
        arete: "",
        tipoIdentificador: "ARETE",
        nombre: "",
        especie: "BOVINO",
        raza: "Brahman",
        sexo: "HEMBRA",
        tipoAnimal: "VACA",
        fechaNacimiento: new Date().toISOString().slice(0, 10),
        pesoActual: 380,
        valorEstimado: 900,
        potreroId: potreros[0]?.id || 0,
        lote: "",
        origen: "NACIMIENTO",
        madreId: null,
        proveedor: "",
        costoCompra: 0,
        fechaCompra: new Date().toISOString().slice(0, 10),
        estadoReproductivo: "VACIA",
        estadoProductivo: "SECA",
      });
    } else {
      // Batch: se mantiene raza/sexo/categoría/potrero/origen/proveedor tal como están
      // (lo típico al dar de alta varios animales del mismo lote/compra seguidos) y solo
      // se limpian el arete y el nombre para el siguiente.
      setFormAnimal(prev => ({ ...prev, arete: "", nombre: "" }));
    }
  };

  // Abre el modal de edición precargado con los datos reales del animal
  const abrirEditarAnimal = (animal: AnimalGanaderia) => {
    setModalEditarAnimal(animal);
    setFormEditarAnimal({
      nombre: animal.nombre || "",
      raza: animal.raza || "",
      tipoAnimal: animal.tipoAnimal || "VACA",
      pesoActual: Number(animal.pesoActual) || 0,
      lote: animal.lote || "",
      potreroId: animal.potrero?.id || 0,
      estadoReproductivo: (animal.estadoReproductivo as any) || "VACIA",
      estadoProductivo: (animal.estadoProductivo as any) || "SECA",
    });
  };

  // Guarda los cambios del animal (PUT) y, si cambió de potrero, lo mueve por separado
  // (POST /mover) para que quede el kardex de ubicación correcto.
  const handleGuardarEdicionAnimal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalEditarAnimal) return;

    try {
      const datos: any = {
        nombre: formEditarAnimal.nombre.trim() || undefined,
        raza: formEditarAnimal.raza.trim() || undefined,
        tipoAnimal: formEditarAnimal.tipoAnimal,
        pesoActual: Number(formEditarAnimal.pesoActual) || undefined,
        lote: formEditarAnimal.lote.trim() || undefined,
      };
      if (modalEditarAnimal.sexo === "HEMBRA") {
        datos.estadoReproductivo = formEditarAnimal.estadoReproductivo;
        datos.estadoProductivo = formEditarAnimal.estadoProductivo;
      }

      const actualizado = await actualizarAnimalGanaderia(modalEditarAnimal.id, tenantId, datos);

      const potreroCambio = formEditarAnimal.potreroId && formEditarAnimal.potreroId !== modalEditarAnimal.potrero?.id;
      if (potreroCambio) {
        await moverAnimalGanaderia(modalEditarAnimal.id, tenantId, Number(formEditarAnimal.potreroId), "Edición de ficha del animal");
        const potreroNuevo = potreros.find(p => p.id === Number(formEditarAnimal.potreroId));
        actualizado.potrero = potreroNuevo;
      }

      setAnimales(prev => prev.map(a => a.id === modalEditarAnimal.id ? { ...a, ...actualizado } : a));
      notificar(`Animal arete ${modalEditarAnimal.arete} actualizado.`);
      setModalEditarAnimal(null);
    } catch {
      notificar(`No se pudo actualizar el animal arete ${modalEditarAnimal.arete} — revisa tu conexión e inténtalo de nuevo.`);
    }
  };

  // Manejador: Despacho por Venta / Beneficio (POST /api/ganaderia/ventas a través de VentaAnimalController)
  const handleRegistrarVentaAnimal = async (e: React.FormEvent) => {
    e.preventDefault();
    const idsVenta = ventaModo === "INDIVIDUAL"
      ? (formVenta.animalId ? [Number(formVenta.animalId)] : [])
      : animalesVentaSeleccionados;

    if (idsVenta.length === 0 || !formVenta.comprador.trim()) return;

    const animalesAVender = idsVenta.map(id => animales.find(a => a.id === id)).filter(Boolean) as AnimalGanaderia[];

    // Precio por animal: si se indicó precio/kg, se calcula peso propio × precio/kg
    // (así se vende "por kilo" real, cada uno con su peso); si no, en modo individual
    // se usa el precio total tal cual, y en lote se reparte el precio total en partes iguales.
    const precioPorAnimal = (id: number): number => {
      const animal = animales.find(a => a.id === id);
      if (formVenta.precioPorKg > 0 && animal?.pesoActual) {
        return Number((animal.pesoActual * formVenta.precioPorKg).toFixed(2));
      }
      if (ventaModo === "INDIVIDUAL") return Number(formVenta.precioUSD) || 0;
      return Number((Number(formVenta.precioUSD) / idsVenta.length).toFixed(2));
    };

    if (!formVenta.precioPorKg && !formVenta.precioUSD) {
      notificar("Indica un precio total o un precio por kilo para calcular la venta.");
      return;
    }

    try {
      // 1. Si se registró nuevo peso en báscula antes del despacho (solo modo individual), actualizar peso del animal
      if (ventaModo === "INDIVIDUAL" && formVenta.pesoSalida && Number(formVenta.pesoSalida) > 0) {
        await actualizarAnimalGanaderia(formVenta.animalId, tenantId, { pesoActual: Number(formVenta.pesoSalida) });
      }

      // 2. Registrar la venta oficial en el backend con VentaAnimalController (guarda comprador, precio,
      // ticket y marca cada animal como VENDIDO en un solo servicio transaccional — soporta lote completo)
      const ticket = `VTA-${Date.now().toString().slice(-6)}`;
      const ventaCreada = await registrarVentaGanaderia(tenantId, {
        numeroTicket: ticket,
        comprador: `${formVenta.comprador.trim()} [${formVenta.motivo}]`,
        items: idsVenta.map(id => ({
          animalId: id,
          precioVenta: precioPorAnimal(id),
        })),
      });

      // 3. Reflejar inmediatamente en el estado local: animales marcados como VENDIDO y sin potrero asignado
      setAnimales(prev => prev.map(a => idsVenta.includes(a.id) ? { ...a, estado: "VENDIDO", potrero: undefined } : a));
      notificar(`Venta registrada exitosamente (Ticket ${ticket}). ${animalesAVender.length} animal(es) despachado(s) y liquidado(s).`);
      setUltimaVentaId(ventaCreada?.id ?? null);
    } catch (err: any) {
      const msg = err?.message || "Revisa tu conexión e inténtalo de nuevo";
      notificar(`No se pudo procesar la venta: ${msg}`);
      return;
    }

    setFormVenta({
      animalId: 0,
      comprador: "",
      precioUSD: 0,
      precioPorKg: 0,
      pesoSalida: 0,
      motivo: "BENEFICIO",
    });
    setAnimalesVentaSeleccionados([]);
  };

  // Manejador: Registrar Celo (Evento Reproductivo dedicado)
  const handleGuardarCelo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await registrarEventoReproductivoGanaderia(tenantId, {
        hembraId: Number(formCelo.hembraId),
        tipo: "CELO",
        fecha: formCelo.fecha,
        tipoCelo: formCelo.tipoCelo,
        sintomasCelo: formCelo.sintomasCelo,
        horaOptimaIA: formCelo.horaOptimaIA,
      });
      setAnimales(prev => prev.map(a => a.id === Number(formCelo.hembraId) ? { ...a, estadoReproductivo: "EN_ESPERA" } : a));
      const hembra = animales.find(a => a.id === Number(formCelo.hembraId));
      notificar(`Celo registrado para hembra ${hembra?.arete || ''}. Estado reproductivo actualizado a 'EN_ESPERA' (programada para IA).`);
    } catch {
      notificar("No se pudo registrar el evento de celo — revisa tu conexión.");
      return;
    }
    setModalCelo(false);
  };

  // Manejador: Registrar Mastitis (Sanidad dedicada con retiro de leche)
  const handleGuardarMastitis = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await registrarMastitisGanaderia(tenantId, {
        animalId: Number(formMastitis.animalId),
        fecha: formMastitis.fecha,
        cuartoAfectado: formMastitis.cuartoAfectado,
        gradoCmt: formMastitis.gradoCmt,
        farmacoAplicado: formMastitis.farmacoAplicado,
        diasRetiroLeche: Number(formMastitis.diasRetiroLeche),
        veterinario: formMastitis.veterinario,
        costo: Number(formMastitis.costo),
        notas: formMastitis.notas,
      });
      const vaca = animales.find(a => a.id === Number(formMastitis.animalId));
      notificar(`Alerta sanitaria: Mastitis registrada en ${vaca?.arete || 'vaca'}. Cuarto ${formMastitis.cuartoAfectado} en tratamiento. Bloqueo de leche activo por ${formMastitis.diasRetiroLeche} días.`);
    } catch {
      notificar("No se pudo registrar el tratamiento de mastitis — revisa tu conexión.");
      return;
    }
    setModalMastitis(false);
  };

  // Manejador: Crear nuevo potrero con color
  const handleGuardarPotrero = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPotrero.nombre.trim()) return;

    const datos: Partial<PotreroGanaderia> = {
      codigo: formPotrero.codigo,
      nombre: formPotrero.nombre,
      areaHectareas: Number(formPotrero.areaHectareas),
      capacidadAnimales: Number(formPotrero.capacidadAnimales),
      tipoPasto: formPotrero.tipoPasto,
      color: formPotrero.color,
      diasDescansoMinimo: Number(formPotrero.diasDescansoMinimo),
      observaciones: formPotrero.observaciones,
      poligono: formPotrero.poligono,
    };

    let guardado: PotreroGanaderia;
    try {
      if (potreroEditandoId) {
        guardado = await actualizarPotreroGanaderia(potreroEditandoId, tenantId, datos);
      } else {
        guardado = await crearPotreroGanaderia(tenantId, {
          ...datos,
          estado: "ACTIVO",
          ordenRotacion: potreros.length + 1,
        });
      }
    } catch {
      notificar(`No se pudo guardar el potrero ${formPotrero.nombre} — revisa tu conexión e inténtalo de nuevo.`);
      return;
    }

    if (potreroEditandoId) {
      setPotreros(prev => prev.map(p => p.id === potreroEditandoId ? guardado : p));
    } else {
      setPotreros(prev => [...prev, guardado]);
    }
    notificar(`Potrero ${guardado.nombre} (${guardado.areaHectareas} ha) guardado en el mapa satelital.`);
    setModalNuevoPotrero(false);
    setPotreroEditandoId(null);
    setFormPotrero({
      codigo: `POT-0${potreros.length + 2}`,
      nombre: "",
      areaHectareas: 15.0,
      capacidadAnimales: 25,
      tipoPasto: "Brachiaria brizantha",
      color: "#10B981",
      diasDescansoMinimo: 28,
      observaciones: "",
      poligono: undefined,
    });
  };

  // Abre el modal en modo "crear" (limpio, sin arrastrar datos de una edición previa)
  const abrirNuevoPotrero = () => {
    setPotreroEditandoId(null);
    setFormPotrero({
      codigo: `POT-0${potreros.length + 1}`,
      nombre: "",
      areaHectareas: 15.0,
      capacidadAnimales: 25,
      tipoPasto: "Brachiaria brizantha",
      color: "#10B981",
      diasDescansoMinimo: 28,
      observaciones: "",
      poligono: undefined,
    });
    setModalNuevoPotrero(true);
  };

  // Abre el modal en modo "editar", precargado con los datos reales del potrero
  const abrirEditarPotrero = (potrero: PotreroGanaderia) => {
    setPotreroEditandoId(potrero.id);
    setFormPotrero({
      codigo: potrero.codigo || "",
      nombre: potrero.nombre,
      areaHectareas: Number(potrero.areaHectareas) || 0,
      capacidadAnimales: Number(potrero.capacidadAnimales) || 0,
      tipoPasto: potrero.tipoPasto || "",
      color: potrero.color || "#10B981",
      diasDescansoMinimo: Number(potrero.diasDescansoMinimo) || 28,
      observaciones: potrero.observaciones || "",
      poligono: potrero.poligono,
    });
    setModalNuevoPotrero(true);
  };

  // Manejador cuando el usuario traza un potrero en el mapa satelital
  const handleGuardarPotreroTrazado = (datos: { poligono: [number, number][]; hectareas: number }) => {
    setFormPotrero({
      codigo: `POT-${(potreros.length + 1).toString().padStart(2, "0")}`,
      nombre: `Potrero Trazado #${potreros.length + 1}`,
      areaHectareas: datos.hectareas,
      capacidadAnimales: Math.max(1, Math.round(datos.hectareas * 1.8)),
      tipoPasto: "Brachiaria brizantha",
      color: "#10B981",
      diasDescansoMinimo: 28,
      observaciones: `Georreferenciado sobre imagen satelital (${datos.poligono.length} postes).`,
      poligono: datos.poligono,
    });
    setPotreroEditandoId(null);
    setModalNuevoPotrero(true);
    notificar(`Potrero trazado con ${datos.hectareas} ha. Completa los datos para guardarlo.`);
  };

  // Abrir Modo Vaquera Rápida (Bulk Entry de Ordeño)
  const abrirVaqueraRapida = () => {
    const vacas = animalesActivos.filter(a => a.sexo === "HEMBRA" && (a.tipoAnimal === "VACA" || a.tipoAnimal === "NOVILLA"));
    if (vacas.length === 0) {
      notificar("No hay vacas u novillas registradas en el hato todavía. Da de alta tus animales antes de usar Vaquera Rápida.");
      return;
    }

    const filas = vacas.map((v) => ({
      animalId: v.id,
      arete: v.arete,
      nombre: v.nombre || `Vaca ${v.arete}`,
      litrosManana: "",
      litrosTarde: "",
      estado: "NORMAL" as const,
      notas: "",
    }));

    setVaqueraFilas(filas);
    setModalVaqueraRapida(true);
  };

  // Guardar Jornada de Ordeño en Lote desde Modo Vaquera Rápida
  const guardarJornadaVaquera = async () => {
    const filasValidas = vaqueraFilas.filter(f => Number(f.litrosManana) > 0 || Number(f.litrosTarde) > 0);
    if (filasValidas.length === 0) {
      notificar("No se ingresaron litros en ninguna vaca.");
      return;
    }

    let mastitisCount = 0;
    let litrosComercialesTotal = 0;
    const nuevosOrdenos: RegistroOrdenoGanaderia[] = [];
    const fallidas: string[] = [];

    for (const f of filasValidas) {
      const litrosTotales = (Number(f.litrosManana) || 0) + (Number(f.litrosTarde) || 0);
      const esComercial = f.estado !== "MASTITIS";

      try {
        const reg = await registrarOrdenoGanaderia(tenantId, {
          animalId: f.animalId,
          fecha: vaqueraFecha,
          turno: vaqueraTurno === "DOBLE" ? "MANANA" : vaqueraTurno,
          cantidadLitros: litrosTotales,
          precioVentaLitro: vaqueraPrecioUSD,
          porcentajeGrasa: 3.8,
          porcentajeProteina: 3.2,
          destino: vaqueraDestino,
        });
        nuevosOrdenos.push(reg);
        if (f.estado === "MASTITIS") {
          mastitisCount++;
        } else {
          litrosComercialesTotal += litrosTotales;
        }
      } catch {
        fallidas.push(f.arete);
      }
    }

    setOrdenos(prev => [...nuevosOrdenos, ...prev]);

    if (vaqueraDestino === "TANQUE") {
      setTanqueLeche(prev => prev ? {
        ...prev,
        stockActualLitros: (Number(prev.stockActualLitros) || 0) + litrosComercialesTotal
      } : {
        id: 1,
        tenantId,
        stockActualLitros: litrosComercialesTotal,
        capacidadLitros: 2000,
        temperaturaCelsius: 4.0
      });
    }

    setModalVaqueraRapida(false);

    const ingresoUSD = (litrosComercialesTotal * vaqueraPrecioUSD).toFixed(2);
    const destinoLabel = vaqueraDestino === "TANQUE" ? "almacenados en tanque" : "venta directa";

    if (fallidas.length > 0) {
      notificar(`Se guardaron ${nuevosOrdenos.length} de ${filasValidas.length} registros. No se pudo registrar: ${fallidas.join(", ")} — revisa tu conexión e inténtalo de nuevo con esas vacas.`);
    } else if (mastitisCount > 0) {
      notificar(`Jornada guardada: ${litrosComercialesTotal.toFixed(1)} L comerciales (${destinoLabel}). ¡Atención! ${mastitisCount} vaca(s) aislada(s) con Mastitis.`);
    } else {
      notificar(`Jornada registrada: ${litrosComercialesTotal.toFixed(1)} L recolectados (${destinoLabel}) por $${ingresoUSD} USD.`);
    }
  };

  // Manejador: Rotar potrero
  const handleEjecutarRotacion = async () => {
    if (!modalRotar) return;
    try {
      await rotarPotreroGanaderia(modalRotar.id, tenantId, potreroDestinoId);
    } catch {
      notificar(`No se pudo rotar el hato de ${modalRotar.nombre} — revisa tu conexión e inténtalo de nuevo.`);
      return;
    }

    setPotreros(prev => prev.map(p => {
      if (p.id === modalRotar.id) return { ...p, estado: "EN_DESCANSO", fechaInicioDescanso: new Date().toISOString().slice(0, 10) };
      if (p.id === potreroDestinoId) return { ...p, estado: "ACTIVO", fechaInicioUso: new Date().toISOString().slice(0, 10) };
      return p;
    }));

    notificar(`Hato rotado de ${modalRotar.nombre} al destino.`);
    setModalRotar(null);
  };

  // Manejador: Registrar ordeño individual
  const handleGuardarOrdeno = async (e: React.FormEvent) => {
    e.preventDefault();
    const animalSeleccionado = animales.find(a => a.id === Number(formOrdeno.animalId)) || animales[0];

    try {
      const nuevoReg = await registrarOrdenoGanaderia(tenantId, {
        animalId: Number(formOrdeno.animalId),
        fecha: new Date().toISOString().slice(0, 10),
        turno: formOrdeno.turno,
        cantidadLitros: Number(formOrdeno.cantidadLitros),
        precioVentaLitro: Number(formOrdeno.precioVentaLitro),
        porcentajeGrasa: Number(formOrdeno.porcentajeGrasa),
        porcentajeProteina: Number(formOrdeno.porcentajeProteina),
        destino: formOrdeno.destino,
      });
      setOrdenos(prev => [nuevoReg, ...prev]);

      if (formOrdeno.destino === "TANQUE") {
        setTanqueLeche(prev => prev ? {
          ...prev,
          stockActualLitros: (Number(prev.stockActualLitros) || 0) + Number(formOrdeno.cantidadLitros)
        } : {
          id: 1,
          tenantId,
          stockActualLitros: Number(formOrdeno.cantidadLitros),
          capacidadLitros: 2000,
          temperaturaCelsius: 4.0
        });
      }
    } catch {
      notificar(`No se pudo registrar el ordeño de ${animalSeleccionado.nombre || animalSeleccionado.arete} — revisa tu conexión e inténtalo de nuevo.`);
      return;
    }

    const destinoTexto = formOrdeno.destino === "TANQUE" ? "almacenados en tanque de leche" : "registrados como venta directa";
    notificar(`${formOrdeno.cantidadLitros} L ${destinoTexto} para ${animalSeleccionado.nombre || animalSeleccionado.arete}.`);
    setModalOrdeno(false);
  };

  // Manejador: Despacho / Venta de Leche desde el Tanque
  const handleGuardarVentaLeche = async (e: React.FormEvent) => {
    e.preventDefault();
    const litros = Number(formVentaLeche.litrosVendidos);
    const precio = Number(formVentaLeche.precioLitroUSD);
    const stockActual = Number(tanqueLeche?.stockActualLitros) || 0;

    if (litros <= 0) {
      notificar("La cantidad de litros a despachar debe ser mayor a cero.");
      return;
    }
    if (litros > stockActual) {
      notificar(`Stock insuficiente en el tanque (${stockActual.toFixed(1)} L disponibles). No se pueden despachar ${litros} L.`);
      return;
    }
    if (!formVentaLeche.compradorOPlanta.trim()) {
      notificar("Debe indicar el comprador o planta receptora.");
      return;
    }

    try {
      const res = await registrarDespachoLecheTanque(tenantId, {
        fecha: formVentaLeche.fecha,
        litrosVendidos: litros,
        precioLitroUSD: precio,
        compradorOPlanta: formVentaLeche.compradorOPlanta.trim(),
        monedaPago: formVentaLeche.monedaPago,
        notas: formVentaLeche.notas,
      });

      setTanqueLeche(res.tanque);
      setVentasLeche(prev => [res.venta, ...prev]);
      setUltimoDespachoLecheId(res.venta?.id ?? null);
      notificar(`Despacho registrado: ${litros} L entregados a ${formVentaLeche.compradorOPlanta} por $${(litros * precio).toFixed(2)} USD.`);
      setFormVentaLeche({
        fecha: new Date().toISOString().slice(0, 10),
        litrosVendidos: Math.min(200, res.tanque.stockActualLitros),
        precioLitroUSD: precioLecheUSD,
        compradorOPlanta: "",
        monedaPago: "USD",
        notas: "",
      });
    } catch (err: any) {
      notificar(`Error al despachar leche: ${err.message || "revisa la conexión"}`);
    }
  };

  // Manejador: Ajuste / Calibración de Tanque
  const handleAjustarTanque = async (capacidad: number, temp: number, stockAjuste: number) => {
    try {
      const res = await configurarTanqueLeche(tenantId, {
        capacidadLitros: capacidad,
        temperaturaCelsius: temp,
        stockAjuste: stockAjuste,
      });
      setTanqueLeche(res);
      setModalAjusteTanque(false);
      notificar("Tanque de leche calibrado exitosamente.");
    } catch {
      notificar("No se pudo guardar la configuración del tanque.");
    }
  };

  // Manejador: Registrar Gasto Operativo del Hato
  const handleGuardarGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    const montoNum = Number(formGasto.monto);
    if (!formGasto.descripcion.trim()) {
      notificar("Ingrese una descripción detallada del gasto.");
      return;
    }
    if (isNaN(montoNum) || montoNum <= 0) {
      notificar("El monto del gasto debe ser mayor a cero.");
      return;
    }

    const catInfo = CATEGORIAS_GASTO_GANADERIA.find(c => c.id === formGasto.categoria);
    const catLabel = catInfo ? catInfo.label.split("/")[0].trim() : formGasto.categoria;

    try {
      const nuevo = await crearGastoGanaderia(tenantId, {
        categoria: formGasto.categoria,
        descripcion: formGasto.descripcion.trim(),
        monto: montoNum,
        fecha: formGasto.fecha || new Date().toISOString().slice(0, 10),
      });
      setGastos(prev => [nuevo, ...prev]);
      setModalGasto(false);
      setFormGasto({
        categoria: "ALIMENTACION",
        descripcion: "",
        monto: "",
        fecha: new Date().toISOString().slice(0, 10),
      });
      notificar(`Gasto registrado: $${montoNum.toFixed(2)} USD en ${catLabel}`);
    } catch (err: any) {
      notificar(`Error al registrar gasto: ${err?.message || "revisa tu conexión e inténtalo de nuevo"}.`);
    }
  };

  // Manejador: Registrar pesaje
  const handleGuardarPesaje = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalPesaje) return;

    try {
      await registrarPesoGanaderia(tenantId, modalPesaje.id, Number(pesoNuevo));
      const resGdp = await obtenerGdpGanaderia(modalPesaje.id).catch(() => null);
      if (resGdp) setGdpData(resGdp);
    } catch {
      notificar(`No se pudo registrar el pesaje — revisa tu conexión e inténtalo de nuevo.`);
      return;
    }

    setAnimales(prev => prev.map(a => a.id === modalPesaje.id ? { ...a, pesoActual: Number(pesoNuevo) } : a));
    notificar(`Pesaje registrado: ${pesoNuevo} kg.`);
    setTimeout(() => {
      setModalPesaje(null);
      setGdpData(null);
    }, 1500);
  };

  // Manejador: Aplicar vacuna (Soporte individual y masivo con verificación de catálogo y tiempos de retiro)
  const handleGuardarVacuna = async (e: React.FormEvent) => {
    e.preventDefault();

    const idsParaAplicar = vacunacionModo === "INDIVIDUAL"
      ? (formVacuna.animalId ? [Number(formVacuna.animalId)] : [])
      : animalesVacunaSeleccionados;

    if (idsParaAplicar.length === 0) {
      notificar("Debes seleccionar al menos un animal para aplicar el tratamiento sanitario.");
      return;
    }
    if (!formVacuna.vacunaId) {
      notificar("Selecciona o crea primero una vacuna del catálogo antes de aplicarla.");
      return;
    }

    const vacunaSeleccionada = vacunas.find(v => v.id === Number(formVacuna.vacunaId));

    try {
      await aplicarVacunaLoteGanaderia(tenantId, {
        animalIds: idsParaAplicar,
        vacunaId: Number(formVacuna.vacunaId),
        fechaAplicacion: new Date().toISOString().slice(0, 10),
        lote: formVacuna.lote,
        veterinarioResponsable: formVacuna.veterinario,
        costo: Number(formVacuna.costo),
      });

      const retiroMsg = [];
      if (vacunaSeleccionada?.diasRetiroLeche && vacunaSeleccionada.diasRetiroLeche > 0) {
        retiroMsg.push(`Retiro leche: ${vacunaSeleccionada.diasRetiroLeche}d`);
      }
      if (vacunaSeleccionada?.diasRetiroCarne && vacunaSeleccionada.diasRetiroCarne > 0) {
        retiroMsg.push(`Retiro carne: ${vacunaSeleccionada.diasRetiroCarne}d`);
      }
      const detalleRetiro = retiroMsg.length > 0 ? ` (${retiroMsg.join(" • ")})` : " (Sin tiempo de retiro obligatorio)";

      notificar(`Vacuna '${vacunaSeleccionada?.nombre || "aplicada"}' aplicada a ${idsParaAplicar.length} animal(es)${detalleRetiro}. Alertas sanitarias actualizadas.`);

      // Recargar alertas sanitarias para reflejar inmediatamente los bloqueos de leche y carne
      obtenerAlertasSanitariasGanaderia(tenantId).then(setAlertasSanitarias).catch(() => {});
    } catch (err: any) {
      const msg = err?.message || "Revisa tu conexión e inténtalo de nuevo";
      notificar(`No se pudo registrar el tratamiento sanitario: ${msg}`);
      return;
    }

    setModalVacuna(false);
    setAnimalesVacunaSeleccionados([]);
  };

  // Agrega al catálogo real del tenant una vacuna del listado de referencia con un clic
  // (ya trae días de retiro/refuerzo típicos precargados, sin tener que teclearlos).
  const handleAgregarVacunaDesdeCatalogoSugerido = async (item: typeof CATALOGO_VACUNAS_SUGERIDAS[number]) => {
    if (vacunas.some(v => v.nombre.toLowerCase() === item.nombre.toLowerCase())) {
      const existente = vacunas.find(v => v.nombre.toLowerCase() === item.nombre.toLowerCase())!;
      setFormVacuna(prev => ({ ...prev, vacunaId: existente.id }));
      notificar(`'${item.nombre}' ya estaba en tu catálogo — seleccionada.`);
      return;
    }
    try {
      const creada = await crearVacunaGanaderia(tenantId, {
        nombre: item.nombre,
        enfermedadPrevenida: item.enfermedadPrevenida,
        diasRetiroLeche: item.diasRetiroLeche,
        diasRetiroCarne: item.diasRetiroCarne,
        diasParaRefuerzo: item.diasParaRefuerzo,
      });
      setVacunas(prev => [...prev, creada]);
      setFormVacuna(prev => ({ ...prev, vacunaId: creada.id }));
      setBusquedaVacunaCatalogo("");
      notificar(`'${creada.nombre}' agregada a tu catálogo y seleccionada.`);
    } catch {
      notificar(`No se pudo agregar '${item.nombre}' al catálogo.`);
    }
  };

  // Manejador: Crear nueva vacuna en catálogo in-situ
  const handleCrearNuevaVacunaInSitu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaVacunaForm.nombre.trim()) return;

    try {
      const creada = await crearVacunaGanaderia(tenantId, {
        nombre: nuevaVacunaForm.nombre.trim(),
        enfermedadPrevenida: nuevaVacunaForm.enfermedadPrevenida.trim() || undefined,
        diasRetiroLeche: Number(nuevaVacunaForm.diasRetiroLeche) || 0,
        diasRetiroCarne: Number(nuevaVacunaForm.diasRetiroCarne) || 0,
        diasParaRefuerzo: Number(nuevaVacunaForm.diasParaRefuerzo) || 0,
      });

      setVacunas(prev => [...prev, creada]);
      setFormVacuna(prev => ({ ...prev, vacunaId: creada.id }));
      setMostrarCrearVacuna(false);
      setNuevaVacunaForm({
        nombre: "",
        enfermedadPrevenida: "",
        diasRetiroLeche: 0,
        diasRetiroCarne: 0,
        diasParaRefuerzo: 180,
      });
      notificar(`Vacuna '${creada.nombre}' guardada en el catálogo oficial.`);
    } catch {
      notificar("No se pudo registrar la nueva vacuna en el catálogo.");
    }
  };

  // Manejador: Registrar evento reproductivo
  const handleGuardarRepro = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await registrarEventoReproductivoGanaderia(tenantId, {
        hembraId: Number(formRepro.hembraId),
        tipo: formRepro.tipo,
        fecha: formRepro.fecha,
        resultado: formRepro.resultado,
        fechaProbableParto: formRepro.fechaProbableParto,
        sementalReferenciaExterna: formRepro.sementalReferenciaExterna,
      });
    } catch {
      notificar(`No se pudo registrar el evento reproductivo — revisa tu conexión e inténtalo de nuevo.`);
      return;
    }
    notificar(`Evento reproductivo registrado en el expediente.`);
    setModalReproduccion(false);
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
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-500 relative flex flex-col font-['Inter']">
      <AuroraGradientDef />

      {/* Notificación Flotante */}
      {notificacion && (
        <div className="fixed top-5 right-5 z-[2000] apple-glass px-5 py-3 rounded-2xl border border-emerald-500/50 shadow-2xl text-emerald-600 dark:text-emerald-300 text-xs font-bold flex items-center gap-3 animate-fade-in">
          <IconCheckCircle size={18} />
          <span>{notificacion}</span>
        </div>
      )}

      {/* ── HEADER SUPERIOR DEL CENTRO AGROPECUARIO: APPLE GLASS ── */}
      <header className="nav-glass border-b border-slate-300/60 dark:border-white/10 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40 backdrop-blur-2xl">
        <div className="flex items-center gap-3.5">
          <div className="p-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <AuroraLogo size={26} />
          </div>
          <div className="text-left">
            <div className="font-['Outfit'] font-black text-lg sm:text-xl text-aurora leading-none flex items-center gap-2">
              <span>Aurora Agro & Finca</span>
              <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold">
                Cattle Pro
              </span>
            </div>
            <div className="text-slate-500 dark:text-white/45 text-[11px] font-medium mt-0.5">
              Hato, Potreros, Leche, GDP & Sanidad • {user?.empresa || "Finca Santa Elena"}
            </div>
          </div>
        </div>

        {/* Barra de Tasas Multi-Moneda & Precio Leche Centralizado */}
        <div className="flex items-center gap-2">
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
            onClick={() => {
              obtenerDatosFiscalesNegocio().then(d => setFormDatosFiscales({
                rif: d.rif || "", razonSocial: d.razonSocial || "", domicilioFiscal: d.domicilioFiscal || "",
              })).catch(() => {});
              setModalDatosFiscales(true);
            }}
            title="Datos fiscales opcionales para tus notas de entrega (RIF, razón social, domicilio)"
            className="flex items-center gap-1.5 apple-glass-pill rounded-full px-3 py-1.5 border border-purple-400/30 text-[11px] hover:border-purple-400/60 hover:bg-purple-500/10 transition-all cursor-pointer group shadow-sm"
          >
            <IconFileText size={13} className="text-purple-500 dark:text-purple-400" />
            <span className="text-slate-500 dark:text-white/40 font-medium">Fiscal</span>
          </button>
        </div>

        {/* Acciones de Cabecera */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={abrirVaqueraRapida}
            className="btn-cyber-neon text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-md hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer">
            <span>Ordeño Rápido</span>
          </button>

          <button
            onClick={() => setModalNuevoAnimal(true)}
            className="apple-glass px-3.5 py-2 rounded-xl border border-white/20 text-slate-700 dark:text-white text-xs font-bold hover:bg-white/10 transition-all flex items-center gap-2 cursor-pointer">
            <span>+ Alta Animal</span>
          </button>

          <ThemeToggle className="scale-[0.72] origin-right" />

          <button
            onClick={onSalir}
            className="apple-glass-btn text-xs font-semibold px-4 py-2 rounded-xl text-slate-700 dark:text-white/70 hover:text-red-500 dark:hover:text-red-400 border border-slate-300/60 dark:border-white/15 transition-colors cursor-pointer">
            ← Volver al Hub
          </button>
        </div>
      </header>

      {/* ── NAVEGACIÓN INTELIGENTE Y ORDENADA (SEGMENTED PILLS) ── */}
      <div className="border-b border-slate-300/50 dark:border-white/10 px-4 sm:px-8 py-2.5 bg-slate-100/60 dark:bg-white/[0.02] backdrop-blur-md overflow-x-auto">
        <div className="max-w-7xl mx-auto flex items-center gap-1.5 text-xs whitespace-nowrap">
          
          <button
            onClick={() => setTab("resumen")}
            className={`px-4 py-2 rounded-full font-bold transition-all cursor-pointer flex items-center gap-2 ${
              tab === "resumen"
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5"
            }`}>
            <span>Panel General</span>
          </button>

          <button
            onClick={() => setTab("potreros")}
            className={`px-4 py-2 rounded-full font-bold transition-all cursor-pointer flex items-center gap-2 ${
              tab === "potreros"
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5"
            }`}>
            <span>Mapa & Potreros</span>
          </button>

          <button
            onClick={() => setTab("inventario")}
            className={`px-4 py-2 rounded-full font-bold transition-all cursor-pointer flex items-center gap-2 ${
              tab === "inventario"
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5"
            }`}>
            <span>Hato & Inventario</span>
          </button>

          <button
            onClick={() => setTab("sanidad")}
            className={`px-4 py-2 rounded-full font-bold transition-all cursor-pointer flex items-center gap-2 ${
              tab === "sanidad"
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5"
            }`}>
            <span>Sanidad & Trazabilidad</span>
            {alertasSanitarias.length > 0 && (
              <span className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-amber-500 text-slate-950">
                {alertasSanitarias.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setTab("eventos")}
            className={`px-4 py-2 rounded-full font-bold transition-all cursor-pointer flex items-center gap-2 ${
              tab === "eventos"
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5"
            }`}>
            <span>Centro de Eventos</span>
          </button>

          <button
            onClick={() => setTab("produccion")}
            className={`px-4 py-2 rounded-full font-bold transition-all cursor-pointer flex items-center gap-2 ${
              tab === "produccion"
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5"
            }`}>
            <span>Producción & Pesajes</span>
          </button>

          <button
            onClick={() => setTab("reportes")}
            className={`px-4 py-2 rounded-full font-bold transition-all cursor-pointer flex items-center gap-2 ${
              tab === "reportes"
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5"
            }`}>
            <span>Centro de Reportes</span>
          </button>

        </div>
      </div>

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
                <div className="apple-glass rounded-3xl p-6 border border-emerald-500/30 bg-gradient-to-r from-slate-900/90 via-emerald-950/20 to-slate-900/90 shadow-xl space-y-4 text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        
                        <h3 className="font-['Outfit'] font-black text-lg text-white">
                          Checklist de Primeros Pasos para tu Finca
                        </h3>
                        <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                          {pasosCompletados} de 3 completados
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
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
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                        : "bg-white/5 border-white/10 hover:border-emerald-500/40"
                    }`}>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-400">Paso 1</span>
                          {fincaUbicada ? (
                            <span className="text-[11px] font-bold text-emerald-400">Completado</span>
                          ) : (
                            <span className="text-[11px] font-bold text-amber-400">Pendiente</span>
                          )}
                        </div>
                        <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                          Fijar Ubicación Real
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {fincaUbicada 
                            ? "Coordenadas fijadas en el satélite." 
                            : "Busca tu predio en el mapa y fija las coordenadas de tu finca."}
                        </p>
                      </div>
                      <button
                        onClick={() => { setTab("potreros"); setSubPotreros("mapa"); }}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          fincaUbicada
                            ? "bg-white/10 text-white hover:bg-white/20"
                            : "btn-cyber-neon text-white shadow-md"
                        }`}
                      >
                        {fincaUbicada ? "Ver en Mapa →" : "Ubicar en Mapa →"}
                      </button>
                    </div>

                    {/* Paso 2: Crear Primer Potrero */}
                    <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                      tienePotreros 
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                        : "bg-white/5 border-white/10 hover:border-emerald-500/40"
                    }`}>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-400">Paso 2</span>
                          {tienePotreros ? (
                            <span className="text-[11px] font-bold text-emerald-400">Completado ({potreros.length})</span>
                          ) : (
                            <span className="text-[11px] font-bold text-amber-400">Pendiente</span>
                          )}
                        </div>
                        <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                          Crear Primer Potrero
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {tienePotreros 
                            ? `${potreros.length} potreros registrados.` 
                            : "Delimita un potrero para asignar pastos, área y carga animal."}
                        </p>
                      </div>
                      <button
                        onClick={abrirNuevoPotrero}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          tienePotreros
                            ? "bg-white/10 text-white hover:bg-white/20"
                            : "btn-cyber-neon text-white shadow-md"
                        }`}
                      >
                        {tienePotreros ? "+ Nuevo Potrero" : "+ Crear Potrero"}
                      </button>
                    </div>

                    {/* Paso 3: Dar de Alta Primer Animal */}
                    <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                      tieneAnimales 
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                        : "bg-white/5 border-white/10 hover:border-emerald-500/40"
                    }`}>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-400">Paso 3</span>
                          {tieneAnimales ? (
                            <span className="text-[11px] font-bold text-emerald-400">Completado ({animales.length})</span>
                          ) : (
                            <span className="text-[11px] font-bold text-amber-400">Pendiente</span>
                          )}
                        </div>
                        <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                          Dar de Alta Primer Animal
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {tieneAnimales 
                            ? `${animales.length} cabezas en el hato.` 
                            : "Registra tu primer animal por nacimiento o compra con su arete."}
                        </p>
                      </div>
                      <button
                        onClick={() => setModalNuevoAnimal(true)}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          tieneAnimales
                            ? "bg-white/10 text-white hover:bg-white/20"
                            : "btn-cyber-neon text-white shadow-md"
                        }`}
                      >
                        {tieneAnimales ? "+ Nuevo Animal" : "+ Dar de Alta"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
            
            {/* Banner Superior con KPIs Vivos */}
            <div className="apple-glass rounded-3xl p-6 sm:p-8 border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-[#0a1818]/60 to-slate-900/60 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1 text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-extrabold text-emerald-400 uppercase">
                    <span>Sincronización Agronómica Activa</span>
                  </div>
                  <h2 className="font-['Outfit'] font-black text-2xl sm:text-3xl text-slate-900 dark:text-white">
                    Control Integral de Finca & Hato
                  </h2>
                  <p className="text-slate-500 dark:text-white/60 text-xs sm:text-sm max-w-2xl">
                    Monitoreo en tiempo real de rotación de potreros, ordeño diario, curvas de ganancia de peso (GDP) y alertas de retiro farmacológico.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => setModalOrdeno(true)}
                    className="apple-glass-btn text-xs font-bold px-4 py-2.5 rounded-xl border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-all cursor-pointer">
                    + Registrar Ordeño
                  </button>
                  <button
                    onClick={() => { setTab("potreros"); setSubPotreros("mapa"); }}
                    className="btn-cyber-neon text-white text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-md cursor-pointer">
                    Ver Mapa Satelital →
                  </button>
                </div>
              </div>

              {/* Tarjetas de Métricas en Grid 4x */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3">
                <div className="apple-glass rounded-2xl p-4 border border-white/10 text-left space-y-1">
                  <div className="text-slate-500 dark:text-white/50 text-[11px] font-medium">Hato Total</div>
                  <div className="font-['Outfit'] font-black text-2xl text-emerald-500 dark:text-emerald-400">
                    {totalAnimales} <span className="text-xs font-normal text-slate-400">cabezas</span>
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-white/40">{vacasOrdeno} vacas productivas</div>
                </div>

                <div className="apple-glass rounded-2xl p-4 border border-white/10 text-left space-y-1">
                  <div className="text-slate-500 dark:text-white/50 text-[11px] font-medium">Ordeño Hoy</div>
                  <div className="font-['Outfit'] font-black text-2xl text-sky-500 dark:text-sky-400">
                    {litrosHoy.toFixed(1)} <span className="text-xs font-normal text-slate-400">Litros</span>
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-white/40">
                    ${ingresosLecheHoy.toFixed(2)} USD
                    {monedasConfig.VES && ` • Bs. ${(ingresosLecheHoy * tasaBCV).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    {monedasConfig.COP && ` • COP $${Math.round(ingresosLecheHoy * tasaCOP).toLocaleString()}`}
                  </div>
                </div>

                <div className="apple-glass rounded-2xl p-4 border border-white/10 text-left space-y-1">
                  <div className="text-slate-500 dark:text-white/50 text-[11px] font-medium">Carga Animal</div>
                  <div className="font-['Outfit'] font-black text-2xl text-purple-500 dark:text-purple-400">
                    {cargaAnimalHa} <span className="text-xs font-normal text-slate-400">UG/ha</span>
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-white/40">{totalHectareas.toFixed(1)} hectáreas totales</div>
                </div>

                <div className="apple-glass rounded-2xl p-4 border border-white/10 text-left space-y-1">
                  <div className="text-slate-500 dark:text-white/50 text-[11px] font-medium">Potreros en Descanso</div>
                  <div className="font-['Outfit'] font-black text-2xl text-amber-500 dark:text-amber-400">
                    {potreros.filter(p => p.estado === "EN_DESCANSO").length} <span className="text-xs font-normal text-slate-400">de {potreros.length}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-white/40">Recuperación forrajera activa</div>
                </div>
              </div>
            </div>

            {/* Widget: Tanque de Leche Frío (Stock en Finca & Despacho a Cisterna) */}
            <div className="apple-glass rounded-3xl p-6 border border-sky-500/30 bg-gradient-to-r from-sky-950/40 via-slate-900/70 to-slate-900/50 shadow-xl space-y-4 text-left">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">
                        Tanque de Leche Frío
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                        <span>{tanqueLeche?.temperaturaCelsius ?? 4.0}°C Óptima</span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-white/50">
                      Stock recolectado en sala de ordeño listo para despacho a planta o camión cisterna.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalAjusteTanque(true)}
                    className="px-3.5 py-2 rounded-xl apple-glass border border-white/15 text-slate-700 dark:text-white/80 hover:text-white text-xs font-semibold cursor-pointer transition-all">
                    <span className="inline-flex items-center gap-1.5"><IconSettings size={13} /> Calibrar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setUltimoDespachoLecheId(null); setModalVentaLeche(true); }}
                    className="btn-cyber-neon text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer">
                    <span>Venta Cisterna / Planta</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">Stock en Tanque</span>
                    <span className="text-[11px] font-mono font-bold text-sky-400">
                      {Math.round(((tanqueLeche?.stockActualLitros ?? 0) / (tanqueLeche?.capacidadLitros ?? 2000)) * 100)}%
                    </span>
                  </div>
                  <div className="font-['Outfit'] font-black text-2xl text-sky-400">
                    {(tanqueLeche?.stockActualLitros ?? 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">/ {(tanqueLeche?.capacidadLitros ?? 2000).toLocaleString()} L</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, ((tanqueLeche?.stockActualLitros ?? 0) / (tanqueLeche?.capacidadLitros ?? 2000)) * 100))}%` }}
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <div className="text-[11px] text-slate-400 font-medium">Valor Comercial del Stock</div>
                  <div className="font-['Outfit'] font-black text-2xl text-emerald-400">
                    ${((tanqueLeche?.stockActualLitros ?? 0) * precioLecheUSD).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    A ${precioLecheUSD.toFixed(2)} USD/L
                    {monedasConfig.VES && ` • Bs. ${(((tanqueLeche?.stockActualLitros ?? 0) * precioLecheUSD) * tasaBCV).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    {monedasConfig.COP && ` • COP $${Math.round(((tanqueLeche?.stockActualLitros ?? 0) * precioLecheUSD) * tasaCOP).toLocaleString()}`}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <div className="text-[11px] text-slate-400 font-medium">Último Despacho Registrado</div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {ventasLeche[0] ? `${ventasLeche[0].litrosVendidos} L • ${ventasLeche[0].compradorOPlanta}` : "Sin despachos recientes"}
                  </div>
                  <div className="text-[10px] text-slate-400">
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
          <div className="space-y-5 text-left">
            
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
                  Sistema de Pastoreo & Delimitación de Potreros
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/40">
                  Visualización satelital en alta resolución, rotación Voisin y registro de forrajes.
                </p>
              </div>

              {/* Sub-selector: Mapa Satelital vs. Lista de Potreros */}
              <div className="flex items-center gap-2">
                <div className="apple-glass-pill rounded-full p-1 flex items-center gap-1 text-xs">
                  <button
                    onClick={() => setSubPotreros("mapa")}
                    className={`px-3.5 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
                      subPotreros === "mapa" ? "bg-white text-black shadow-sm" : "text-slate-600 dark:text-white/60"
                    }`}>
                    Mapa Satelital
                  </button>
                  <button
                    onClick={() => setSubPotreros("lista")}
                    className={`px-3.5 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
                      subPotreros === "lista" ? "bg-white text-black shadow-sm" : "text-slate-600 dark:text-white/60"
                    }`}>
                    Lista & Aforos ({potreros.length})
                  </button>
                </div>

                <button
                  onClick={abrirNuevoPotrero}
                  className="btn-cyber-neon text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer">
                  + Agregar Potrero
                </button>
              </div>
            </div>

            {subPotreros === "mapa" ? (
              <GanaderiaMapa
                potreros={potreros}
                animales={animales}
                onRotarHato={(pot) => setModalRotar(pot)}
                onCrearPotrero={abrirNuevoPotrero}
                onEditarPotrero={abrirEditarPotrero}
                onGuardarPotreroTrazado={handleGuardarPotreroTrazado}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {potreros.map(pot => {
                  const enDescanso = pot.estado === "EN_DESCANSO";
                  return (
                    <div
                      key={pot.id}
                      className={`apple-glass rounded-3xl p-6 border text-left space-y-4 transition-all ${
                        enDescanso
                          ? "border-amber-500/30 bg-amber-500/[0.02]"
                          : "border-emerald-500/40 bg-emerald-500/[0.03]"
                      }`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            {pot.color && (
                              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: pot.color }} />
                            )}
                            <span className="font-mono text-[10px] text-slate-400 font-bold">{pot.codigo || `POT-${pot.id}`}</span>
                          </div>
                          <h4 className="font-['Outfit'] font-bold text-lg text-slate-900 dark:text-white mt-1">
                            {pot.nombre}
                          </h4>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          enDescanso
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                            : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        }`}>
                          {enDescanso ? "EN DESCANSO" : "ACTIVO"}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs text-slate-600 dark:text-white/70">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Área:</span>
                          <span className="font-semibold">{pot.areaHectareas} ha</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Especie Forrajera:</span>
                          <span className="font-semibold">{pot.tipoPasto || "Pasto Natural"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Capacidad Máxima:</span>
                          <span className="font-semibold">{pot.capacidadAnimales || 25} animales</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Descanso Mínimo:</span>
                          <span className="font-semibold">{pot.diasDescansoMinimo || 28} días</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between">
                        {pot.estado === "ACTIVO" ? (
                          <button
                            onClick={() => setModalRotar(pot)}
                            className="w-full btn-cyber-neon text-white text-xs font-bold py-2 rounded-xl cursor-pointer text-center">
                            Rotar Hato de este Potrero →
                          </button>
                        ) : (
                          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                            <span>Recuperación de forraje activa</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
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
                        return (
                          <tr key={cat.key} className="hover:bg-white/5 transition-colors">
                            <td className="p-4 font-bold text-slate-900 dark:text-white">
                              {cat.label}
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
                        );
                      })}
                      <tr className="bg-emerald-500/5 font-bold">
                        <td className="p-4 text-slate-900 dark:text-white">TOTAL ACTIVOS</td>
                        <td className="p-4 text-center font-mono text-emerald-500 dark:text-emerald-400 text-base">{totalAnimales}</td>
                        <td className="p-4 text-center font-mono text-slate-600 dark:text-white/70">
                          {Math.round(animales.reduce((sum, a) => sum + (a.pesoActual || 0), 0) / Math.max(1, totalAnimales))} kg
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
                      onClick={() => setModalNuevoAnimal(true)}
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
                            setPesoNuevo(animal.pesoActual || 400);
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
                onClick={() => {
                  setVacunacionModo("INDIVIDUAL");
                  setModalVacuna(true);
                }}
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
                      setFormAnimal(prev => ({ ...prev, origen: "NACIMIENTO" }));
                      setModalNuevoAnimal(true);
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
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <label className="text-xs font-bold text-slate-700 dark:text-white/70">
                      Seleccionar Animal por Arete para ver Ficha Completa:
                    </label>
                    <select
                      value={animalFichaId || ""}
                      onChange={(e) => setAnimalFichaId(Number(e.target.value))}
                      className="px-4 py-2 rounded-xl bg-slate-800 border border-white/15 text-white font-mono font-bold text-xs cursor-pointer focus:border-emerald-500"
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
                              {fichaGdp?.gdpKgDia ? `+${fichaGdp.gdpKgDia.toFixed(2)} kg/día` : "+0.68 kg/día"}
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
                                  onClick={() => {
                                    setVacunacionModo("INDIVIDUAL");
                                    setFormVacuna(prev => ({ ...prev, animalId: animalSel.id }));
                                    setModalVacuna(true);
                                  }}
                                  className="text-[11px] text-emerald-400 hover:text-emerald-300 underline mt-1 inline-block cursor-pointer">
                                  Aplicar dosis ahora →
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-2 max-h-60 overflow-y-auto">
                                {fichaVacunas.map((v) => (
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
                                  </div>
                                ))}
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
          <div className="space-y-6 text-left">
            <div>
              <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
                Centro de Eventos
              </h3>
              <p className="text-xs text-slate-500 dark:text-white/40">
                Hub de registro directo para novedades sanitarias, productivas, reproductivas y labores de campo.
              </p>
            </div>

            {/* Cuadrícula de Bloques de Eventos estilo GanSoft */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              
              {/* 1. REPRODUCTIVOS */}
              <div className="apple-glass rounded-3xl p-5 border border-white/10 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                  <h4 className="font-['Outfit'] font-bold text-sm text-slate-900 dark:text-white">Reproductivos</h4>
                </div>
                <div className="space-y-1 text-xs">
                  <button
                    onClick={() => { setModalReproduccion(true); setFormRepro({ ...formRepro, tipo: "SERVICIO" }); }}
                    className="w-full text-left p-2 rounded-xl hover:bg-white/5 text-slate-700 dark:text-white/80 hover:text-emerald-400 cursor-pointer flex items-center justify-between">
                    <span>• Servicios (Monta / IA)</span>
                    <span className="text-[10px] text-slate-400">Registrar →</span>
                  </button>
                  <button
                    onClick={() => { setModalReproduccion(true); setFormRepro({ ...formRepro, tipo: "DIAGNOSTICO_PRENEZ" }); }}
                    className="w-full text-left p-2 rounded-xl hover:bg-white/5 text-slate-700 dark:text-white/80 hover:text-emerald-400 cursor-pointer flex items-center justify-between">
                    <span>• Revisiones & Palpación</span>
                    <span className="text-[10px] text-slate-400">Registrar →</span>
                  </button>
                  <button
                    onClick={() => {
                      setFormAnimal(prev => ({
                        ...prev,
                        origen: "NACIMIENTO",
                        tipoAnimal: "BECERRA",
                        fechaNacimiento: new Date().toISOString().slice(0, 10),
                      }));
                      setModalNuevoAnimal(true);
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-white/5 text-slate-700 dark:text-white/80 hover:text-emerald-400 cursor-pointer flex items-center justify-between">
                    <span>• Partos / Alta de Cría en Finca</span>
                    <span className="text-[10px] text-emerald-400 font-bold">Dar de alta →</span>
                  </button>
                  <button
                    onClick={() => {
                      setModalReproduccion(true);
                      setFormRepro({ ...formRepro, tipo: "DIAGNOSTICO_PRENEZ", resultado: "ABORTO_NO_GESTANTE" });
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-white/5 text-slate-700 dark:text-white/80 hover:text-emerald-400 cursor-pointer flex items-center justify-between">
                    <span>• Abortos & Pérdidas</span>
                    <span className="text-[10px] text-slate-400">Registrar →</span>
                  </button>
                  <button
                    onClick={() => setModalCelo(true)}
                    className="w-full text-left p-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 font-bold cursor-pointer flex items-center justify-between border border-purple-500/20">
                    <span>• Celos & Detección para IA</span>
                    <span className="text-[10px] text-purple-300">Registrar →</span>
                  </button>
                </div>
              </div>

              {/* 2. PRODUCTIVOS */}
              <div className="apple-glass rounded-3xl p-5 border border-white/10 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                  <h4 className="font-['Outfit'] font-bold text-sm text-slate-900 dark:text-white">Productivos</h4>
                </div>
                <div className="space-y-1 text-xs">
                  <button
                    onClick={abrirVaqueraRapida}
                    className="w-full text-left p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold cursor-pointer flex items-center justify-between">
                    <span>• Ordeño Rápido (Modo Vaquera)</span>
                    <span className="text-[10px] bg-emerald-500/30 px-1.5 py-0.5 rounded text-emerald-300">Teclado →</span>
                  </button>
                  <button
                    onClick={() => setModalOrdeno(true)}
                    className="w-full text-left p-2 rounded-xl hover:bg-white/5 text-slate-700 dark:text-white/80 hover:text-emerald-400 cursor-pointer flex items-center justify-between">
                    <span>• Pesaje Individual de Leche</span>
                    <span className="text-[10px] text-slate-400">Registrar →</span>
                  </button>
                  <button
                    onClick={() => { setUltimoDespachoLecheId(null); setModalVentaLeche(true); }}
                    className="w-full text-left p-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 font-bold cursor-pointer flex items-center justify-between">
                    <span>• Venta Cisterna / Planta (Tanque)</span>
                    <span className="text-[10px] bg-sky-500/30 px-1.5 py-0.5 rounded text-sky-300">Despacho →</span>
                  </button>
                  <button
                    onClick={() => {
                      setModalReproduccion(true);
                      setFormRepro({ ...formRepro, tipo: "DIAGNOSTICO_PRENEZ", resultado: "SECADO_PREVIO_PARTO" });
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-white/5 text-slate-700 dark:text-white/80 hover:text-emerald-400 cursor-pointer flex items-center justify-between">
                    <span>• Secados</span>
                    <span className="text-[10px] text-slate-400">Registrar →</span>
                  </button>
                  <button
                    onClick={() => { setModalPesaje(animales[0]); setPesoNuevo(animales[0]?.pesoActual || 400); }}
                    className="w-full text-left p-2 rounded-xl hover:bg-white/5 text-slate-700 dark:text-white/80 hover:text-emerald-400 cursor-pointer flex items-center justify-between">
                    <span>• Pesajes de Carne & GDP</span>
                    <span className="text-[10px] text-slate-400">Registrar →</span>
                  </button>
                </div>
              </div>

              {/* 3. INVENTARIOS */}
              <div className="apple-glass rounded-3xl p-5 border border-white/10 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <h4 className="font-['Outfit'] font-bold text-sm text-slate-900 dark:text-white">Inventarios</h4>
                </div>
                <div className="space-y-1 text-xs">
                  <button
                    onClick={() => { setTab("inventario"); setSubInventario("matriz"); }}
                    className="w-full text-left p-2 rounded-xl hover:bg-white/5 text-slate-700 dark:text-white/80 hover:text-emerald-400 cursor-pointer flex items-center justify-between">
                    <span>• Matriz de Lotes</span>
                    <span className="text-[10px] text-slate-400">Abrir →</span>
                  </button>
                  <button
                    onClick={() => { setModalRotar(potreros[0]); }}
                    className="w-full text-left p-2 rounded-xl hover:bg-white/5 text-slate-700 dark:text-white/80 hover:text-emerald-400 cursor-pointer flex items-center justify-between">
                    <span>• Cambios de Lote / Potrero</span>
                    <span className="text-[10px] text-slate-400">Ejecutar →</span>
                  </button>
                  <button
                    onClick={() => {
                      setFormAnimal(prev => ({ ...prev, origen: "NACIMIENTO" }));
                      setModalNuevoAnimal(true);
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-white/5 text-slate-700 dark:text-white/80 hover:text-emerald-400 cursor-pointer flex items-center justify-between">
                    <span>• Alta de Animales (Nacimiento / Compra)</span>
                    <span className="text-[10px] text-slate-400">Registrar →</span>
                  </button>
                </div>
              </div>

              {/* 4. VETERINARIOS & SANIDAD */}
              <div className="apple-glass rounded-3xl p-5 border border-white/10 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <h4 className="font-['Outfit'] font-bold text-sm text-slate-900 dark:text-white">Veterinarios & Sanidad</h4>
                </div>
                <div className="space-y-1 text-xs">
                  <button
                    onClick={() => setModalVacuna(true)}
                    className="w-full text-left p-2 rounded-xl hover:bg-white/5 text-slate-700 dark:text-white/80 hover:text-emerald-400 cursor-pointer flex items-center justify-between">
                    <span>• Vacunación & Desparasitación</span>
                    <span className="text-[10px] text-slate-400">Aplicar →</span>
                  </button>
                  <button
                    onClick={() => setModalMastitis(true)}
                    className="w-full text-left p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold cursor-pointer flex items-center justify-between border border-rose-500/20">
                    <span>• Mastitis (Prueba CMT & Retiro Leche)</span>
                    <span className="text-[10px] text-rose-300">Registrar →</span>
                  </button>
                  <button
                    onClick={() => setModalVacuna(true)}
                    className="w-full text-left p-2 rounded-xl hover:bg-white/5 text-slate-700 dark:text-white/80 hover:text-emerald-400 cursor-pointer flex items-center justify-between">
                    <span>• Control de Tiempos de Retiro</span>
                    <span className="text-[10px] text-slate-400">Verificar →</span>
                  </button>
                </div>
              </div>

              {/* 5. POTREROS */}
              <div className="apple-glass rounded-3xl p-5 border border-white/10 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <h4 className="font-['Outfit'] font-bold text-sm text-slate-900 dark:text-white">Potreros</h4>
                </div>
                <div className="space-y-1 text-xs">
                  <button
                    onClick={abrirNuevoPotrero}
                    className="w-full text-left p-2 rounded-xl hover:bg-white/5 text-slate-700 dark:text-white/80 hover:text-emerald-400 cursor-pointer flex items-center justify-between">
                    <span>• Agregar Potrero al Mapa</span>
                    <span className="text-[10px] text-slate-400">Crear →</span>
                  </button>
                  <button
                    onClick={() => { setModalRotar(potreros[0]); }}
                    className="w-full text-left p-2 rounded-xl hover:bg-white/5 text-slate-700 dark:text-white/80 hover:text-emerald-400 cursor-pointer flex items-center justify-between">
                    <span>• Rotaciones Voisin</span>
                    <span className="text-[10px] text-slate-400">Rotar →</span>
                  </button>
                  <button
                    onClick={() => {
                      setTab("potreros");
                      notificar("Selecciona un potrero para calcular y registrar el aforo de forraje.");
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-white/5 text-slate-700 dark:text-white/80 hover:text-emerald-400 cursor-pointer flex items-center justify-between">
                    <span>• Aforos & Planificación de Pastoreo</span>
                    <span className="text-[10px] text-slate-400">Calcular →</span>
                  </button>
                </div>
              </div>

              {/* 6. OTROS */}
              <div className="apple-glass rounded-3xl p-5 border border-white/10 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  <h4 className="font-['Outfit'] font-bold text-sm text-slate-900 dark:text-white">Movimientos & Otros</h4>
                </div>
                <div className="space-y-1 text-xs">
                  <button
                    onClick={() => {
                      setFormAnimal(prev => ({
                        ...prev,
                        origen: "COMPRA",
                        proveedor: "",
                        costoCompra: 0,
                        lote: prev.lote || "Lote Compra",
                      }));
                      setModalNuevoAnimal(true);
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-white/5 text-slate-700 dark:text-white/80 hover:text-emerald-400 cursor-pointer flex items-center justify-between">
                    <span>• Compras de Ganado (Ingreso Real)</span>
                    <span className="text-[10px] text-emerald-400 font-bold">Ingresar →</span>
                  </button>
                  <button
                    onClick={() => {
                      if (animales.length > 0) {
                        setFormVenta({
                          animalId: animales[0].id,
                          comprador: "",
                          precioUSD: 0,
                          precioPorKg: 0,
                          pesoSalida: animales[0].pesoActual || 0,
                          motivo: "BENEFICIO",
                        });
                      }
                      setVentaModo("INDIVIDUAL");
                      setAnimalesVentaSeleccionados([]);
                      setUltimaVentaId(null);
                      setModalVentaAnimal(true);
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-white/5 text-slate-700 dark:text-white/80 hover:text-emerald-400 cursor-pointer flex items-center justify-between">
                    <span>• Venta / Beneficio (Salida Real)</span>
                    <span className="text-[10px] text-rose-400 font-bold">Despachar →</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            PESTAÑA 5: PRODUCCIÓN & PESAJES
        ───────────────────────────────────────────────────────────── */}
        {tab === "produccion" && (
          <div className="space-y-6 text-left">
            
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
                  Producción Lechera & Curvas de Crecimiento (GDP)
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/40">
                  Pesaje por turno en sala de ordeño y seguimiento de ganancia diaria de peso.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={abrirVaqueraRapida}
                  className="btn-cyber-neon text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md hover:scale-105 transition-all flex items-center gap-2 cursor-pointer">
                  <span>Modo Vaquera Rápida (Bulk Entry)</span>
                </button>
                <button
                  onClick={() => setModalOrdeno(true)}
                  className="apple-glass px-4 py-2 rounded-xl border border-white/20 text-slate-700 dark:text-white text-xs font-bold hover:bg-white/10 cursor-pointer">
                  + Ordeño Individual
                </button>
              </div>
            </div>

            {/* Resumen de Producción */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="apple-glass rounded-2xl p-5 border border-white/10 text-left space-y-1">
                <div className="text-xs text-slate-400 font-medium">Producción Total Registrada</div>
                <div className="font-['Outfit'] font-black text-3xl text-sky-500 dark:text-sky-400">
                  {ordenos.reduce((sum, o) => sum + (Number(o.cantidadLitros) || 0), 0).toFixed(1)} L
                </div>
                <div className="text-[11px] text-slate-500 dark:text-white/40">En {ordenos.length} registros individuales</div>
              </div>

              <div className="apple-glass rounded-2xl p-5 border border-white/10 text-left space-y-1">
                <div className="text-xs text-slate-400 font-medium">Ingresos Estimados (USD)</div>
                <div className="font-['Outfit'] font-black text-3xl text-emerald-500 dark:text-emerald-400">
                  ${ordenos.reduce((sum, o) => sum + (Number(o.montoVenta) || 0), 0).toFixed(2)}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-white/40 flex items-center justify-between">
                  <span>A razón de ${precioLecheUSD.toFixed(2)} / Litro</span>
                  <button
                    type="button"
                    onClick={() => setModalEditarPrecioLeche(true)}
                    className="text-sky-400 hover:text-sky-300 font-bold ml-1 underline cursor-pointer text-[10px]">
                    <span className="inline-flex items-center gap-1"><IconEdit size={11} /> Editar Precio</span>
                  </button>
                </div>
              </div>

              <div className="apple-glass rounded-2xl p-5 border border-white/10 text-left space-y-1">
                <div className="text-xs text-slate-400 font-medium">Equivalente en Moneda Local</div>
                <div className="font-['Outfit'] font-black text-2xl text-purple-500 dark:text-purple-400">
                  {monedasConfig.VES && (
                    <div>Bs. {(ordenos.reduce((sum, o) => sum + (Number(o.montoVenta) || 0), 0) * tasaBCV).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  )}
                  {monedasConfig.COP && (
                    <div className="text-lg text-sky-400">COP ${Math.round(ordenos.reduce((sum, o) => sum + (Number(o.montoVenta) || 0), 0) * tasaCOP).toLocaleString()}</div>
                  )}
                  {!monedasConfig.VES && !monedasConfig.COP && (
                    <div className="text-base text-slate-400">Solo USD (Base)</div>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-white/40 flex items-center justify-between">
                  <span>{monedasConfig.VES ? `Tasa Bs: ${tasaBCV.toFixed(2)}` : "Configuración de monedas"}</span>
                  <button onClick={() => setModalEditarTasas(true)} className="text-purple-400 hover:text-purple-300 font-bold ml-2 underline cursor-pointer">
                    <span className="inline-flex items-center gap-1"><IconSettings size={11} /> Monedas & Tasas</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Subsección: Tanque de Leche & Despacho a Cisterna */}
            <div className="apple-glass rounded-3xl p-5 border border-sky-500/20 bg-sky-950/20 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sky-400"><IconMilk size={26} /></span>
                <div>
                  <h4 className="font-['Outfit'] font-bold text-base text-slate-900 dark:text-white">
                    Tanque Frío: {(tanqueLeche?.stockActualLitros ?? 0).toLocaleString()} L en Stock
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-white/50">
                    Capacidad {(tanqueLeche?.capacidadLitros ?? 2000).toLocaleString()} L • Temperatura {tanqueLeche?.temperaturaCelsius ?? 4.0}°C
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalAjusteTanque(true)}
                  className="px-3 py-1.5 rounded-xl apple-glass border border-white/15 text-slate-700 dark:text-white text-xs font-semibold cursor-pointer">
                  <span className="inline-flex items-center gap-1.5"><IconSettings size={13} /> Calibrar</span> Tanque
                </button>
                <button
                  type="button"
                  onClick={() => { setUltimoDespachoLecheId(null); setModalVentaLeche(true); }}
                  className="btn-cyber-neon text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1.5"><IconTruck size={14} /> Despachar / Venta Cisterna</span>
                </button>
              </div>
            </div>

            {/* Tabla de Registros de Ordeño */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-['Outfit'] font-bold text-sm text-slate-900 dark:text-white">
                  Registros de Ordeño por Vaca & Turno
                </h4>
                <span className="text-xs text-slate-400">{ordenos.length} registros</span>
              </div>

              <div className="overflow-x-auto rounded-3xl border border-slate-200/80 dark:border-white/10 apple-glass">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/50 border-b border-slate-200/80 dark:border-white/10">
                    <tr>
                      <th className="p-4">Fecha</th>
                      <th className="p-4">Arete / Animal</th>
                      <th className="p-4">Turno</th>
                      <th className="p-4">Destino</th>
                      <th className="p-4">Litros</th>
                      <th className="p-4">% Grasa / Prot.</th>
                      <th className="p-4">Monto USD</th>
                      {monedasConfig.VES && <th className="p-4 text-right">Monto Bs.</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                    {ordenos.map(o => (
                      <tr key={o.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-mono">{o.fecha}</td>
                        <td className="p-4 font-bold text-slate-900 dark:text-white">
                          {o.animal?.arete} - {o.animal?.nombre || "Sin nombre"}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            o.turno === "MANANA" ? "bg-amber-500/15 text-amber-500" : "bg-indigo-500/15 text-indigo-400"
                          }`}>
                            {o.turno}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            o.destino === "VENTA_DIRECTA"
                              ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                              : "bg-sky-500/15 text-sky-400 border border-sky-500/30"
                          }`}>
                            {o.destino === "VENTA_DIRECTA" ? "Venta Directa" : "Tanque"}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-sky-500 text-sm">{o.cantidadLitros} L</td>
                        <td className="p-4 text-slate-400">{o.porcentajeGrasa || 3.8}% / {o.porcentajeProteina || 3.2}%</td>
                        <td className="p-4 font-bold text-emerald-500">${Number(o.montoVenta || 0).toFixed(2)}</td>
                        {monedasConfig.VES && (
                          <td className="p-4 text-right font-mono text-slate-500 dark:text-white/70">
                            Bs. {(Number(o.montoVenta || 0) * tasaBCV).toFixed(2)}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Histórico de Ventas de Leche (Despachos de Tanque) */}
            <div className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-['Outfit'] font-bold text-sm text-slate-900 dark:text-white">
                    Histórico de Despachos & Ventas de Leche en Tanque
                  </h4>
                  <p className="text-[11px] text-slate-400">Entregas de cisterna a receptoras, queseras o plantas industriales</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setUltimoDespachoLecheId(null); setModalVentaLeche(true); }}
                  className="text-xs font-bold text-sky-400 hover:text-sky-300 underline cursor-pointer">
                  + Registrar Despacho
                </button>
              </div>

              {ventasLeche.length === 0 ? (
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center text-xs text-slate-400">
                  No hay ventas registradas aún. El stock del tanque se acumula de los ordeños diarios con destino "Tanque".
                </div>
              ) : (
                <div className="overflow-x-auto rounded-3xl border border-slate-200/80 dark:border-white/10 apple-glass">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/50 border-b border-slate-200/80 dark:border-white/10">
                      <tr>
                        <th className="p-4">Fecha</th>
                        <th className="p-4">Comprador / Planta</th>
                        <th className="p-4">Litros Vendidos</th>
                        <th className="p-4">Precio x Litro</th>
                        <th className="p-4">Total USD</th>
                        <th className="p-4">Moneda Pago</th>
                        <th className="p-4">Notas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                      {ventasLeche.map(v => (
                        <tr key={v.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-4 font-mono">{v.fecha}</td>
                          <td className="p-4 font-bold text-slate-900 dark:text-white">{v.compradorOPlanta}</td>
                          <td className="p-4 font-bold text-sky-400">{v.litrosVendidos} L</td>
                          <td className="p-4 font-mono">${Number(v.precioLitroUSD).toFixed(4)}</td>
                          <td className="p-4 font-bold text-emerald-400">${Number(v.totalUSD).toFixed(2)}</td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white border border-white/15">
                              {v.monedaPago || "USD"}
                            </span>
                          </td>
                          <td className="p-4 text-slate-400 italic max-w-xs truncate">{v.notas || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            PESTAÑA 6: CENTRO DE REPORTES (GANSOFT STYLE)
        ───────────────────────────────────────────────────────────── */}
        {/* ─────────────────────────────────────────────────────────────
            PESTAÑA 6: CENTRO DE REPORTES & FINANZAS DEL HATO
        ───────────────────────────────────────────────────────────── */}
        {tab === "reportes" && (() => {
          // Helper para calcular semana ISO (YYYY-Www)
          const getISOWeekInfo = (dateStr: string) => {
            if (!dateStr) return null;
            const cleanDate = dateStr.slice(0, 10);
            const d = new Date(cleanDate + "T12:00:00Z");
            if (isNaN(d.getTime())) return null;

            const day = d.getUTCDay() || 7;
            d.setUTCDate(d.getUTCDate() + 4 - day);
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
            const year = d.getUTCFullYear();
            const weekKey = `${year}-W${String(weekNo).padStart(2, "0")}`;

            const orig = new Date(cleanDate + "T12:00:00Z");
            const origDay = orig.getUTCDay() || 7;
            const monday = new Date(orig);
            monday.setUTCDate(orig.getUTCDate() - (origDay - 1));
            const sunday = new Date(monday);
            sunday.setUTCDate(monday.getUTCDate() + 6);

            const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", timeZone: "UTC" };
            const rangoTexto = `${monday.toLocaleDateString("es-ES", opts)} – ${sunday.toLocaleDateString("es-ES", opts)}`;

            return { weekKey, year, weekNo, rangoTexto, mondayTime: monday.getTime() };
          };

          const hoyInfo = getISOWeekInfo(new Date().toISOString().slice(0, 10));
          const semanaActualKey = hoyInfo?.weekKey ?? "2026-W37";

          const listaGastos = gastos;

          interface SemanaBucket {
            weekKey: string;
            rangoTexto: string;
            mondayTime: number;
            esSemanaActual: boolean;
            ingresosLeche: number;
            ingresosAnimales: number;
            ingresosTotales: number;
            gastosTotales: number;
            neto: number;
            gastosCount: number;
          }

          const weekMap = new Map<string, SemanaBucket>();

          const getOrCreateBucket = (info: NonNullable<ReturnType<typeof getISOWeekInfo>>) => {
            if (!weekMap.has(info.weekKey)) {
              weekMap.set(info.weekKey, {
                weekKey: info.weekKey,
                rangoTexto: info.rangoTexto,
                mondayTime: info.mondayTime,
                esSemanaActual: info.weekKey === semanaActualKey,
                ingresosLeche: 0,
                ingresosAnimales: 0,
                ingresosTotales: 0,
                gastosTotales: 0,
                neto: 0,
                gastosCount: 0,
              });
            }
            return weekMap.get(info.weekKey)!;
          };

          // Asegurar que la semana actual siempre esté inicializada
          if (hoyInfo) {
            getOrCreateBucket(hoyInfo);
          }

          // 1. Ingresos: Ventas de leche de tanque
          for (const v of ventasLeche) {
            const info = getISOWeekInfo(v.fecha);
            if (!info) continue;
            const b = getOrCreateBucket(info);
            const monto = Number(v.totalUSD) || (Number(v.litrosVendidos || 0) * Number(v.precioLitroUSD || precioLecheUSD));
            b.ingresosLeche += monto;
            b.ingresosTotales += monto;
          }

          // 2. Ingresos: Ordeños con venta directa
          for (const o of ordenos) {
            if (o.destino === "VENTA_DIRECTA" || (Number(o.montoVenta) > 0 && o.destino !== "TANQUE")) {
              const info = getISOWeekInfo(o.fecha);
              if (!info) continue;
              const b = getOrCreateBucket(info);
              const monto = Number(o.montoVenta) || (Number(o.cantidadLitros || 0) * (Number(o.precioVentaLitro) || precioLecheUSD));
              b.ingresosLeche += monto;
              b.ingresosTotales += monto;
            }
          }

          // 3. Ingresos: Ventas de Animales
          for (const va of ventasAnimales) {
            const info = getISOWeekInfo(va.fecha);
            if (!info) continue;
            const b = getOrCreateBucket(info);
            const monto = Number(va.total) || 0;
            b.ingresosAnimales += monto;
            b.ingresosTotales += monto;
          }

          // 4. Gastos Operativos
          for (const g of listaGastos) {
            const info = getISOWeekInfo(g.fecha);
            if (!info) continue;
            const b = getOrCreateBucket(info);
            const monto = Number(g.monto) || 0;
            b.gastosTotales += monto;
            b.gastosCount++;
          }

          // Calcular balances netos
          for (const b of weekMap.values()) {
            b.neto = b.ingresosTotales - b.gastosTotales;
          }

          // Orden cronológico descendente
          const listaSemanas = Array.from(weekMap.values()).sort((a, b) => b.mondayTime - a.mondayTime);

          const semActual = weekMap.get(semanaActualKey) || {
            weekKey: semanaActualKey,
            rangoTexto: hoyInfo?.rangoTexto ?? "Esta semana",
            mondayTime: 0,
            esSemanaActual: true,
            ingresosLeche: 0,
            ingresosAnimales: 0,
            ingresosTotales: 0,
            gastosTotales: 0,
            neto: 0,
            gastosCount: 0,
          };

          return (
            <div className="space-y-7 text-left">
              {/* Encabezado Principal de la Pestaña */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-extrabold text-emerald-400 uppercase tracking-wider mb-2">
                    <span>Módulo Financiero & Operativo</span>
                  </div>
                  <h3 className="font-['Outfit'] font-black text-2xl sm:text-3xl text-slate-900 dark:text-white">
                    Centro Financiero & Reportes
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-white/50 max-w-2xl">
                    Flujo de caja semanal del hato (Semanas ISO), balance de ingresos por ventas de leche y ganado vs gastos operativos, y exportaciones oficiales.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setModalGasto(true)}
                    className="btn-cyber-neon text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg hover:scale-105 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <IconCoins size={15} />
                    <span>+ Registrar Gasto</span>
                  </button>
                  <button
                    onClick={exportarInventarioXLSX}
                    className="apple-glass px-4 py-2.5 rounded-xl border border-white/20 text-slate-700 dark:text-white text-xs font-bold hover:bg-white/10 cursor-pointer flex items-center gap-1.5"
                  >
                    <IconChart size={15} />
                    <span>Exportar XLSX</span>
                  </button>
                </div>
              </div>

              {/* 3 Tarjetas de Resumen Financiero Semanal (Semana Actual) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Tarjeta 1: Ingresos de la Semana */}
                <div className="apple-glass rounded-3xl p-6 border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-slate-900/60 to-slate-900/80 text-left space-y-2 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <IconChart size={13} /> Ingresos Semanales
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {semActual.weekKey}
                    </span>
                  </div>
                  <div className="font-['Outfit'] font-black text-3xl text-emerald-400">
                    ${semActual.ingresosTotales.toFixed(2)} <span className="text-sm font-normal text-slate-400">USD</span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="inline-flex items-center gap-1"><IconMilk size={11} /> Leche: ${semActual.ingresosLeche.toFixed(2)}</span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1"><IconCow size={11} /> Ganado: ${semActual.ingresosAnimales.toFixed(2)}</span>
                  </div>
                  {(monedasConfig.VES || monedasConfig.COP) && (
                    <div className="pt-2 border-t border-white/10 text-[11px] text-slate-300 flex flex-col gap-0.5">
                      {monedasConfig.VES && (
                        <div className="font-mono text-emerald-300">
                          Bs. {(semActual.ingresosTotales * tasaBCV).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      )}
                      {monedasConfig.COP && (
                        <div className="font-mono text-sky-300">
                          COP ${Math.round(semActual.ingresosTotales * tasaCOP).toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Tarjeta 2: Gastos de la Semana */}
                <div className="apple-glass rounded-3xl p-6 border border-rose-500/30 bg-gradient-to-br from-rose-950/20 via-slate-900/60 to-slate-900/80 text-left space-y-2 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                      <IconChart size={13} className="rotate-180" /> Gastos Semanales
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {semActual.gastosCount} registro(s)
                    </span>
                  </div>
                  <div className="font-['Outfit'] font-black text-3xl text-rose-400">
                    ${semActual.gastosTotales.toFixed(2)} <span className="text-sm font-normal text-slate-400">USD</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Egresos de caja en insumos, mano de obra y mantenimiento
                  </div>
                  {(monedasConfig.VES || monedasConfig.COP) && (
                    <div className="pt-2 border-t border-white/10 text-[11px] text-slate-300 flex flex-col gap-0.5">
                      {monedasConfig.VES && (
                        <div className="font-mono text-rose-300">
                          Bs. {(semActual.gastosTotales * tasaBCV).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      )}
                      {monedasConfig.COP && (
                        <div className="font-mono text-sky-300">
                          COP ${Math.round(semActual.gastosTotales * tasaCOP).toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Tarjeta 3: Neto de la Semana */}
                <div className={`apple-glass rounded-3xl p-6 border text-left space-y-2 shadow-lg ${
                  semActual.neto >= 0
                    ? "border-sky-500/30 bg-gradient-to-br from-sky-950/20 via-slate-900/60 to-slate-900/80"
                    : "border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-slate-900/60 to-slate-900/80"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                      <IconScale size={13} /> Neto de la Semana
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      semActual.neto >= 0 ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    }`}>
                      {semActual.neto >= 0 ? "Superávit" : "Déficit"}
                    </span>
                  </div>
                  <div className={`font-['Outfit'] font-black text-3xl ${semActual.neto >= 0 ? "text-sky-400" : "text-amber-400"}`}>
                    {semActual.neto >= 0 ? `+$${semActual.neto.toFixed(2)}` : `-$${Math.abs(semActual.neto).toFixed(2)}`} <span className="text-sm font-normal text-slate-400">USD</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {semActual.rangoTexto}
                  </div>
                  {(monedasConfig.VES || monedasConfig.COP) && (
                    <div className="pt-2 border-t border-white/10 text-[11px] text-slate-300 flex flex-col gap-0.5">
                      {monedasConfig.VES && (
                        <div className="font-mono text-slate-200">
                          Bs. {(semActual.neto * tasaBCV).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      )}
                      {monedasConfig.COP && (
                        <div className="font-mono text-sky-300">
                          COP ${Math.round(semActual.neto * tasaCOP).toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Sección 1: Gastos Operativos Recientes */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-['Outfit'] font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                      <IconCoins size={15} /> Gastos Operativos Recientes
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-white/40">
                      Registro de egresos por categoría (alimentación, sanidad, jornales, repuestos)
                    </p>
                  </div>
                  <button
                    onClick={() => setModalGasto(true)}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                  >
                    + Registrar Gasto
                  </button>
                </div>

                {listaGastos.length === 0 ? (
                  <div className="p-8 rounded-3xl border border-white/10 apple-glass text-center space-y-2">
                    <span className="text-amber-400 flex justify-center"><IconFileText size={30} /></span>
                    <h5 className="font-bold text-sm text-white">Sin gastos operativos registrados aún</h5>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Esta finca no tiene salidas de caja registradas. Presiona el botón "+ Registrar Gasto" para registrar alimentación, sanidad, insumos o jornales.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-3xl border border-slate-200/80 dark:border-white/10 apple-glass">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/50 border-b border-slate-200/80 dark:border-white/10">
                        <tr>
                          <th className="p-4">Fecha</th>
                          <th className="p-4">Categoría</th>
                          <th className="p-4">Descripción</th>
                          <th className="p-4">Monto USD</th>
                          {monedasConfig.VES && <th className="p-4 text-right">Monto Bs.</th>}
                          {monedasConfig.COP && <th className="p-4 text-right">Monto COP</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                        {listaGastos.map(g => {
                          const cat = CATEGORIAS_GASTO_GANADERIA.find(c => c.id === g.categoria);
                          return (
                            <tr key={g.id} className="hover:bg-white/5 transition-colors">
                              <td className="p-4 font-mono">{g.fecha}</td>
                              <td className="p-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${cat?.colorBadge || "text-slate-300 bg-white/10 border-white/20"}`}>
                                  {cat ? <cat.icon size={12} /> : <IconTag size={12} />}
                                  <span>{cat ? cat.label.split("/")[0].trim() : g.categoria}</span>
                                </span>
                              </td>
                              <td className="p-4 text-slate-800 dark:text-white/90 font-medium max-w-sm truncate">{g.descripcion}</td>
                              <td className="p-4 font-mono font-bold text-rose-400">${Number(g.monto).toFixed(2)}</td>
                              {monedasConfig.VES && (
                                <td className="p-4 text-right font-mono text-slate-400">
                                  Bs. {(Number(g.monto) * tasaBCV).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              )}
                              {monedasConfig.COP && (
                                <td className="p-4 text-right font-mono text-sky-400/80">
                                  COP ${Math.round(Number(g.monto) * tasaCOP).toLocaleString()}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Sección 2: Flujo de Caja Semanal (Semanas ISO) */}
              <div className="space-y-3 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-['Outfit'] font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                      <IconCalendar size={13} /> Flujo de Caja Semanal (Semanas ISO)
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-white/40">
                      Balance neto: Ingresos (Leche en cisterna + ordeño + ganado) menos Gastos Operativos agrupados por semana ISO
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-3xl border border-slate-200/80 dark:border-white/10 apple-glass">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/50 border-b border-slate-200/80 dark:border-white/10">
                      <tr>
                        <th className="p-4">Semana ISO</th>
                        <th className="p-4">Venta Leche</th>
                        <th className="p-4">Venta Ganado</th>
                        <th className="p-4">Total Ingresos</th>
                        <th className="p-4">Gastos Operativos</th>
                        <th className="p-4">Balance Neto</th>
                        {(monedasConfig.VES || monedasConfig.COP) && <th className="p-4 text-right">Equivalente Local</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                      {listaSemanas.map(s => (
                        <tr key={s.weekKey} className={`hover:bg-white/5 transition-colors ${s.esSemanaActual ? "bg-emerald-500/[0.04]" : ""}`}>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 dark:text-white">{s.weekKey}</span>
                              {s.esSemanaActual && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  Semana Actual
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 block">{s.rangoTexto}</span>
                          </td>
                          <td className="p-4 font-mono text-sky-400">${s.ingresosLeche.toFixed(2)}</td>
                          <td className="p-4 font-mono text-emerald-400">${s.ingresosAnimales.toFixed(2)}</td>
                          <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">${s.ingresosTotales.toFixed(2)}</td>
                          <td className="p-4 font-mono font-bold text-rose-400">${s.gastosTotales.toFixed(2)}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-xl font-mono font-black text-xs ${
                              s.neto >= 0
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                            }`}>
                              {s.neto >= 0 ? `+$${s.neto.toFixed(2)}` : `-$${Math.abs(s.neto).toFixed(2)}`}
                            </span>
                          </td>
                          {(monedasConfig.VES || monedasConfig.COP) && (
                            <td className="p-4 text-right font-mono text-xs">
                              {monedasConfig.VES && (
                                <div className={s.neto >= 0 ? "text-emerald-400" : "text-rose-400"}>
                                  Bs. {(s.neto * tasaBCV).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                              )}
                              {monedasConfig.COP && (
                                <div className="text-[10px] text-slate-400">
                                  COP ${Math.round(s.neto * tasaCOP).toLocaleString()}
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sección 3: Informes Oficiales & Exportaciones Consolidadas */}
              <div className="space-y-3 pt-4">
                <div>
                  <h4 className="font-['Outfit'] font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <IconFileText size={13} /> Informes Consolidados & Exportaciones
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-white/40">
                    Informes ejecutivos y de gestión técnica para auditoría, registros sanitarios y fiscales
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {/* Reportes de Gestión */}
                  <div className="apple-glass rounded-3xl p-5 border border-white/10 space-y-3">
                    <h5 className="font-['Outfit'] font-bold text-sm text-slate-900 dark:text-white pb-2 border-b border-white/10">
                      Gestión del Hato
                    </h5>
                    <div className="space-y-2 text-xs">
                      <div className="p-2 rounded-xl hover:bg-white/5 cursor-pointer flex justify-between" onClick={exportarInventarioXLSX}>
                        <span>Inventario de Animales</span>
                        <span className="text-emerald-400 font-bold">XLSX</span>
                      </div>
                      <div className="p-2 rounded-xl hover:bg-white/5 cursor-pointer flex justify-between" onClick={() => notificar("Generando informe de movimientos de potrero...")}>
                        <span>Historial de Movimientos</span>
                        <span className="text-emerald-400 font-bold">PDF</span>
                      </div>
                      <div className="p-2 rounded-xl hover:bg-white/5 cursor-pointer flex justify-between" onClick={() => notificar("Generando distribución reproductiva...")}>
                        <span>Reproductores & Vientres</span>
                        <span className="text-emerald-400 font-bold">XLSX</span>
                      </div>
                    </div>
                  </div>

                  {/* Reportes de Animales */}
                  <div className="apple-glass rounded-3xl p-5 border border-white/10 space-y-3">
                    <h5 className="font-['Outfit'] font-bold text-sm text-slate-900 dark:text-white pb-2 border-b border-white/10">
                      Animales & Vientres
                    </h5>
                    <div className="space-y-2 text-xs">
                      <div className="p-2 rounded-xl hover:bg-white/5 cursor-pointer flex justify-between" onClick={() => notificar("Cargando vientres confirmados...")}>
                        <span>Vientres Preñados</span>
                        <span className="text-emerald-400 font-bold">Ver</span>
                      </div>
                      <div className="p-2 rounded-xl hover:bg-white/5 cursor-pointer flex justify-between" onClick={() => notificar("Cargando hembras próximas a parir...")}>
                        <span>Próximas a Parir (30d)</span>
                        <span className="text-emerald-400 font-bold">Ver</span>
                      </div>
                      <div className="p-2 rounded-xl hover:bg-white/5 cursor-pointer flex justify-between" onClick={() => notificar("Cargando hembras en ordeño...")}>
                        <span>Animales en Lactancia</span>
                        <span className="text-emerald-400 font-bold">Ver</span>
                      </div>
                    </div>
                  </div>

                  {/* Reportes de Potreros */}
                  <div className="apple-glass rounded-3xl p-5 border border-white/10 space-y-3">
                    <h5 className="font-['Outfit'] font-bold text-sm text-slate-900 dark:text-white pb-2 border-b border-white/10">
                      Potreros & Pasturas
                    </h5>
                    <div className="space-y-2 text-xs">
                      <div className="p-2 rounded-xl hover:bg-white/5 cursor-pointer flex justify-between" onClick={() => { setTab("potreros"); setSubPotreros("lista"); }}>
                        <span>Aforo General de Pastos</span>
                        <span className="text-emerald-400 font-bold">Ver</span>
                      </div>
                      <div className="p-2 rounded-xl hover:bg-white/5 cursor-pointer flex justify-between" onClick={() => notificar("Generando registro de descansos...")}>
                        <span>Días de Descanso Acumulados</span>
                        <span className="text-emerald-400 font-bold">XLSX</span>
                      </div>
                      <div className="p-2 rounded-xl hover:bg-white/5 cursor-pointer flex justify-between" onClick={() => notificar("Calculando carga animal global...")}>
                        <span>Carga Animal por Hectárea</span>
                        <span className="text-emerald-400 font-bold">XLSX</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      </main>

      {/* ── MODAL: ACTUALIZAR TASAS A MANO ── */}
      {modalEditarTasas && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="apple-glass modal-siempre-oscuro rounded-3xl p-6 sm:p-7 max-w-md w-full border border-emerald-500/40 text-left space-y-5 shadow-2xl bg-slate-900/95 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <span className="text-emerald-400"><IconCoins size={20} /></span>
                <div>
                  <h3 className="font-['Outfit'] font-black text-lg text-white">
                    Configuración de Monedas & Tasas
                  </h3>
                  <p className="text-[11px] text-slate-400">Activa las monedas operativas de la finca y ajusta sus tasas</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalEditarTasas(false)}
                className="text-slate-400 hover:text-white text-lg p-1 cursor-pointer">
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const bcv = parseFloat(String(fd.get("tasaBcv") || String(tasaBCV)));
                const cop = parseFloat(String(fd.get("tasaCop") || String(tasaCOP)));
                const vesActivo = fd.get("vesActivo") === "on";
                const copActivo = fd.get("copActivo") === "on";
                guardarTasas(bcv > 0 ? bcv : tasaBCV, cop > 0 ? cop : tasaCOP, vesActivo, copActivo);
              }}
              className="space-y-4 text-xs"
            >
              {/* Selector de Monedas Activas */}
              <div className="space-y-2 p-3 rounded-2xl bg-white/5 border border-white/10">
                <label className="text-[11px] font-bold text-slate-300 block">
                  Monedas Activas en esta Finca
                </label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white/5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-400">USD ($)</span>
                      <span className="text-[10px] text-slate-400">Dólar Estadounidense (Moneda Base)</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">Fija</span>
                  </div>

                  <label className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-purple-400">VES (Bs.)</span>
                      <span className="text-[10px] text-slate-400">Bolívares (Tasa Oficial / Mercado)</span>
                    </div>
                    <input
                      name="vesActivo"
                      type="checkbox"
                      defaultChecked={monedasConfig.VES}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sky-400">COP ($)</span>
                      <span className="text-[10px] text-slate-400">Pesos Colombianos (Frontera)</span>
                    </div>
                    <input
                      name="copActivo"
                      type="checkbox"
                      defaultChecked={monedasConfig.COP}
                      className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                    />
                  </label>
                </div>
              </div>

              {/* Inputs de Tasas */}
              <div>
                <label className="text-[11px] font-bold text-emerald-400 block mb-1">
                  Tasa Bolívares (Bs. por 1 USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-mono font-bold text-xs">Bs.</span>
                  <input
                    name="tasaBcv"
                    type="number"
                    onFocus={e => e.target.select()}
                    step="0.01"
                    min="0.01"
                    defaultValue={tasaBCV}
                    required
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-800/90 border border-white/15 text-white font-mono text-sm focus:border-emerald-500 focus:outline-none"
                    placeholder="43.50"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Usada para liquidar el ordeño y compras de ganado en moneda local.</p>
              </div>

              <div>
                <label className="text-[11px] font-bold text-sky-400 block mb-1">
                  Tasa Pesos Colombianos (COP por 1 USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-mono font-bold text-xs">COP $</span>
                  <input
                    name="tasaCop"
                    type="number"
                    onFocus={e => e.target.select()}
                    step="1"
                    min="1"
                    defaultValue={tasaCOP}
                    required
                    className="w-full pl-14 pr-3 py-2.5 rounded-xl bg-slate-800/90 border border-white/15 text-white font-mono text-sm focus:border-sky-500 focus:outline-none"
                    placeholder="4150"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Referencia fronteriza para transacciones y compras en efectivo.</p>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalEditarTasas(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold cursor-pointer">
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition-all cursor-pointer">
                  Guardar Configuración
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DATOS FISCALES OPCIONALES (RIF, RAZÓN SOCIAL, DOMICILIO) */}
      {modalDatosFiscales && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="apple-glass modal-siempre-oscuro rounded-3xl p-6 sm:p-7 max-w-md w-full border border-purple-500/40 text-left space-y-4 shadow-2xl bg-slate-900/95 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <IconFileText size={22} className="text-purple-400" />
                <div>
                  <h3 className="font-['Outfit'] font-black text-lg text-white">
                    Datos Fiscales (Opcional)
                  </h3>
                  <p className="text-[11px] text-slate-400">Se estampan en tus notas de entrega de ventas y despachos de leche</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalDatosFiscales(false)}
                className="text-slate-400 hover:text-white text-lg p-1 cursor-pointer">
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await actualizarDatosFiscalesNegocio(formDatosFiscales);
                  notificar("Datos fiscales actualizados.");
                  setModalDatosFiscales(false);
                } catch {
                  notificar("No se pudieron guardar los datos fiscales — revisa tu conexión.");
                }
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Razón Social / Nombre del Negocio</label>
                <input
                  type="text"
                  value={formDatosFiscales.razonSocial}
                  onChange={e => setFormDatosFiscales({ ...formDatosFiscales, razonSocial: e.target.value })}
                  placeholder="Ej. Agropecuaria El Roble, C.A."
                  className="w-full p-2.5 rounded-xl bg-slate-800/90 border border-white/15 text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">RIF</label>
                <input
                  type="text"
                  value={formDatosFiscales.rif}
                  onChange={e => setFormDatosFiscales({ ...formDatosFiscales, rif: e.target.value })}
                  placeholder="Ej. J-12345678-9"
                  className="w-full p-2.5 rounded-xl bg-slate-800/90 border border-white/15 text-white font-mono focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Domicilio Fiscal</label>
                <textarea
                  rows={2}
                  value={formDatosFiscales.domicilioFiscal}
                  onChange={e => setFormDatosFiscales({ ...formDatosFiscales, domicilioFiscal: e.target.value })}
                  placeholder="Dirección de la finca o del negocio"
                  className="w-full p-2.5 rounded-xl bg-slate-800/90 border border-white/15 text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-400">
                Ninguno de estos datos es obligatorio — las notas de entrega se generan igual sin ellos, solo sin esa línea.
              </p>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalDatosFiscales(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer">
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-cyber-neon text-white font-bold px-6 py-2.5 rounded-xl cursor-pointer">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR PRECIO DE LA LECHE CENTRALIZADO */}
      {modalEditarPrecioLeche && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="apple-glass modal-siempre-oscuro rounded-3xl p-6 sm:p-7 max-w-sm w-full border border-sky-500/40 text-left space-y-4 shadow-2xl bg-slate-900/95 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <span className="text-sky-400"><IconMilk size={26} /></span>
                <div>
                  <h3 className="font-['Outfit'] font-black text-lg text-white">
                    Precio Base de la Leche
                  </h3>
                  <p className="text-[11px] text-slate-400">Valor de referencia por litro en USD</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalEditarPrecioLeche(false)}
                className="text-slate-400 hover:text-white text-lg p-1 cursor-pointer">
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const precio = parseFloat(String(fd.get("precioLeche") || "0"));
                if (precio > 0) {
                  guardarPrecioLeche(precio);
                }
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="text-[11px] font-bold text-sky-400 block mb-1">
                  Precio por Litro (USD $)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-mono font-bold text-sm">$</span>
                  <input
                    name="precioLeche"
                    type="number"
                    onFocus={e => e.target.select()}
                    step="0.01"
                    min="0.01"
                    defaultValue={precioLecheUSD}
                    required
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-800/90 border border-white/15 text-white font-mono text-base font-bold focus:border-sky-500 focus:outline-none"
                    placeholder="0.55"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  Este precio se sincroniza automáticamente en la sala de ordeño, Modo Vaquera Rápida y los despachos de tanque.
                </p>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalEditarPrecioLeche(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold cursor-pointer">
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg transition-all cursor-pointer">
                  Guardar Precio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VENTA DE LECHE EN TANQUE (CISTERNA / PLANTA) */}
      {modalVentaLeche && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="apple-glass modal-siempre-oscuro rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-sky-500/40 text-left space-y-4 shadow-2xl bg-slate-900/95 text-white font-['Inter']">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <span className="text-sky-400"><IconTruck size={22} /></span>
                <div>
                  <h3 className="font-['Outfit'] font-black text-lg text-white">
                    Despacho de Leche en Tanque
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Venta de cisterna a receptoría, planta pasteurizadora o quesera
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setModalVentaLeche(false); setUltimoDespachoLecheId(null); }}
                className="text-slate-400 hover:text-white text-lg p-1 cursor-pointer">
                ✕
              </button>
            </div>

            {ultimoDespachoLecheId ? (
              <div className="space-y-4 text-xs text-center py-4">
                <div className="text-emerald-400 flex flex-col items-center gap-2">
                  <IconCheckCircle size={36} />
                  <span className="font-bold text-sm text-white">Despacho registrado correctamente</span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const blob = await descargarNotaEntregaDespachoLechePdf(tenantId, ultimoDespachoLecheId);
                      const url = URL.createObjectURL(blob);
                      window.open(url, "_blank");
                      setTimeout(() => URL.revokeObjectURL(url), 30000);
                    } catch (e) {
                      notificar("No se pudo descargar la nota de entrega");
                    }
                  }}
                  className="btn-cyber-neon text-white font-bold px-5 py-2.5 rounded-xl cursor-pointer inline-flex items-center gap-2">
                  <IconDownload size={14} />
                  Descargar Nota de Entrega (PDF)
                </button>
                <div>
                  <button
                    type="button"
                    onClick={() => { setModalVentaLeche(false); setUltimoDespachoLecheId(null); }}
                    className="text-slate-400 hover:text-white text-[11px] underline cursor-pointer">
                    Cerrar
                  </button>
                </div>
              </div>
            ) : (
            <>
            {/* Alerta de Stock Actual Disponible en Tanque */}
            <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-sky-400">Stock Actual en Tanque</span>
                <div className="font-mono font-black text-xl text-white">
                  {(tanqueLeche?.stockActualLitros ?? 0).toLocaleString()} <span className="text-xs text-slate-400">L disponibles</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFormVentaLeche({ ...formVentaLeche, litrosVendidos: Number(tanqueLeche?.stockActualLitros) || 0 })}
                className="px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-[11px] font-bold border border-sky-500/30 transition-all cursor-pointer">
                Despachar Todo
              </button>
            </div>

            <form onSubmit={handleGuardarVentaLeche} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Fecha de Despacho *</label>
                  <input
                    type="date"
                    required
                    value={formVentaLeche.fecha}
                    onChange={e => setFormVentaLeche({ ...formVentaLeche, fecha: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-white/15 text-white font-mono text-xs focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Litros a Despachar *</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max={Number(tanqueLeche?.stockActualLitros) || 999999}
                    required
                    value={formVentaLeche.litrosVendidos || ""}
                    onChange={e => setFormVentaLeche({ ...formVentaLeche, litrosVendidos: Number(e.target.value) })}
                    onFocus={e => e.target.select()}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-white/15 text-sky-400 font-mono font-bold text-sm focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Comprador / Planta Receptora *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Planta Lácteos San Simón, Camión Cisterna #04, Quesera Don Luis"
                  value={formVentaLeche.compradorOPlanta}
                  onChange={e => setFormVentaLeche({ ...formVentaLeche, compradorOPlanta: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-white/15 text-white text-xs focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Precio x Litro (USD) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-emerald-400 font-bold">$</span>
                    <input
                      type="number"
                      onFocus={e => e.target.select()}
                      step="0.0001"
                      min="0.0001"
                      required
                      value={formVentaLeche.precioLitroUSD}
                      onChange={e => setFormVentaLeche({ ...formVentaLeche, precioLitroUSD: Number(e.target.value) })}
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-800 border border-white/15 text-emerald-400 font-mono font-bold text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Moneda de Pago</label>
                  <select
                    value={formVentaLeche.monedaPago}
                    onChange={e => setFormVentaLeche({ ...formVentaLeche, monedaPago: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-white/15 text-white text-xs focus:border-sky-500 focus:outline-none">
                    <option value="USD">USD ($ Dólares)</option>
                    {monedasConfig.VES && <option value="VES">VES (Bs. Bolívares)</option>}
                    {monedasConfig.COP && <option value="COP">COP ($ Pesos Colombianos)</option>}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Notas / Guía de Movilización (Opcional)</label>
                <input
                  type="text"
                  placeholder="Número de guía INSAI / chofer / precinto de cisterna..."
                  value={formVentaLeche.notas}
                  onChange={e => setFormVentaLeche({ ...formVentaLeche, notas: e.target.value })}
                  className="w-full p-2 rounded-xl bg-slate-800 border border-white/15 text-white text-xs focus:border-sky-500 focus:outline-none"
                />
              </div>

              {/* Liquidación Total en Tiempo Real */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium text-xs">Total Facturado (USD):</span>
                  <span className="font-mono font-black text-xl text-emerald-400">
                    ${(formVentaLeche.litrosVendidos * formVentaLeche.precioLitroUSD).toFixed(2)} USD
                  </span>
                </div>
                {monedasConfig.VES && formVentaLeche.monedaPago === "VES" && (
                  <div className="flex items-center justify-between text-[11px] text-emerald-300">
                    <span>Equivalente en Bolívares:</span>
                    <span className="font-mono font-bold">
                      Bs. {((formVentaLeche.litrosVendidos * formVentaLeche.precioLitroUSD) * tasaBCV).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {monedasConfig.COP && formVentaLeche.monedaPago === "COP" && (
                  <div className="flex items-center justify-between text-[11px] text-sky-300">
                    <span>Equivalente en Pesos:</span>
                    <span className="font-mono font-bold">
                      COP ${Math.round((formVentaLeche.litrosVendidos * formVentaLeche.precioLitroUSD) * tasaCOP).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalVentaLeche(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold cursor-pointer">
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl btn-cyber-neon text-white text-xs font-bold shadow-lg transition-all cursor-pointer flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1.5"><IconTruck size={14} /> Confirmar Despacho & Descontar Stock</span>
                </button>
              </div>
            </form>
            </>
            )}
          </div>
        </div>
      )}

      {/* MODAL: CALIBRACIÓN Y AJUSTE DE TANQUE DE LECHE */}
      {modalAjusteTanque && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="apple-glass modal-siempre-oscuro rounded-3xl p-6 sm:p-7 max-w-md w-full border border-sky-500/40 text-left space-y-4 shadow-2xl bg-slate-900/95 text-white font-['Inter']">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <span className="text-sky-400"><IconSettings size={20} /></span>
                <div>
                  <h3 className="font-['Outfit'] font-black text-lg text-white">
                    Calibrar Tanque de Leche
                  </h3>
                  <p className="text-[11px] text-slate-400">Ajuste técnico de capacidad y vara medidora</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalAjusteTanque(false)}
                className="text-slate-400 hover:text-white text-lg p-1 cursor-pointer">
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const cap = parseFloat(String(fd.get("capacidad") || "2000"));
                const temp = parseFloat(String(fd.get("temperatura") || "4.0"));
                const stock = parseFloat(String(fd.get("stock") || "0"));
                handleAjustarTanque(cap, temp, stock);
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Capacidad Total del Tanque (Litros)</label>
                <input
                  name="capacidad"
                  type="number"
                  onFocus={e => e.target.select()}
                  step="50"
                  min="100"
                  defaultValue={tanqueLeche?.capacidadLitros ?? 2000}
                  required
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-white/15 text-white font-mono text-sm focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Temperatura de Enfriamiento (°C)</label>
                <input
                  name="temperatura"
                  type="number"
                  onFocus={e => e.target.select()}
                  step="0.1"
                  defaultValue={tanqueLeche?.temperaturaCelsius ?? 4.0}
                  required
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-white/15 text-white font-mono text-sm focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-sky-400 block mb-1">Stock Actual Calibrado (Litros)</label>
                <input
                  name="stock"
                  type="number"
                  onFocus={e => e.target.select()}
                  step="0.5"
                  min="0"
                  defaultValue={tanqueLeche?.stockActualLitros ?? 0}
                  required
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-sky-500/40 text-sky-300 font-mono text-sm font-bold focus:border-sky-400 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">Útil tras aforar la regla o realizar limpieza técnica del tanque.</p>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalAjusteTanque(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold cursor-pointer">
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg transition-all cursor-pointer">
                  Guardar Calibración
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODALES DE ACCIÓN
      ───────────────────────────────────────────────────────────── */}

      {/* MODAL: ALTA DE ANIMAL */}
      {modalNuevoAnimal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="apple-glass rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-emerald-500/30 text-left space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
                Alta de Animal en el Hato
              </h3>
              <button
                onClick={() => setModalNuevoAnimal(false)}
                className="text-slate-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={(e) => handleGuardarAnimal(e, false)} className="space-y-4 text-xs">
              {/* Selector de Origen: Nacimiento vs Compra */}
              <div>
                <label className="text-slate-400 block mb-1.5 font-bold">Origen del Animal *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormAnimal({ ...formAnimal, origen: "NACIMIENTO", tipoAnimal: formAnimal.tipoAnimal === "VACA" ? "BECERRA" : formAnimal.tipoAnimal })}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                      formAnimal.origen === "NACIMIENTO"
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-md"
                        : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <IconSprout size={15} />
                    <span>Nacimiento en Finca</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormAnimal({ ...formAnimal, origen: "COMPRA" })}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                      formAnimal.origen === "COMPRA"
                        ? "bg-sky-500/20 border-sky-500 text-sky-400 shadow-md"
                        : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <IconCart size={15} />
                    <span>Ingreso por Compra</span>
                  </button>
                </div>
              </div>

              {/* Campos específicos según Origen */}
              {formAnimal.origen === "NACIMIENTO" ? (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                  <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                    <IconSprout size={13} />
                    <span>Datos de Nacimiento & Trazabilidad Maternal</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1">Madre (Opcional - Genealogía)</label>
                      <select
                        value={formAnimal.madreId || ""}
                        onChange={e => setFormAnimal({ ...formAnimal, madreId: e.target.value ? Number(e.target.value) : null })}
                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-slate-900 dark:text-white text-xs">
                        <option value="">Sin madre vinculada</option>
                        {animalesActivos.filter(a => a.sexo === "HEMBRA").map(h => (
                          <option key={h.id} value={h.id}>
                            {h.arete} - {h.nombre || h.tipoAnimal} ({h.raza || "Brahman"})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Fecha de Nacimiento</label>
                      <input
                        type="date"
                        value={formAnimal.fechaNacimiento}
                        onChange={e => setFormAnimal({ ...formAnimal, fechaNacimiento: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-slate-900 dark:text-white font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 space-y-3">
                  <div className="text-[11px] font-bold text-sky-400 flex items-center gap-1.5">
                    <IconCoins size={13} />
                    <span>Datos de Adquisición & Proveedor</span>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Proveedor / Subasta / Vendedor *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Subasta Barinas / Agropecuaria El Samán"
                      value={formAnimal.proveedor}
                      onChange={e => setFormAnimal({ ...formAnimal, proveedor: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-slate-900 dark:text-white font-medium text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1">Precio de Compra (USD) *</label>
                      <input
                        type="number"
                        onFocus={e => e.target.select()}
                        step="0.01"
                        min="0"
                        required
                        placeholder="Ej. 850"
                        value={formAnimal.costoCompra}
                        onChange={e => setFormAnimal({ ...formAnimal, costoCompra: Number(e.target.value) })}
                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-slate-900 dark:text-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Fecha de Compra / Entrada</label>
                      <input
                        type="date"
                        value={formAnimal.fechaCompra}
                        onChange={e => setFormAnimal({ ...formAnimal, fechaCompra: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-slate-900 dark:text-white font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Número de Arete / Chapeta *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. V-105"
                    value={formAnimal.arete}
                    onChange={e => setFormAnimal({ ...formAnimal, arete: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Nombre (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. Paloma"
                    value={formAnimal.nombre}
                    onChange={e => setFormAnimal({ ...formAnimal, nombre: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Raza</label>
                  <input
                    type="text"
                    list="razas-bovinas-catalogo"
                    value={formAnimal.raza}
                    onChange={e => setFormAnimal({ ...formAnimal, raza: e.target.value })}
                    onFocus={e => {
                      // Vaciar al enfocar muestra el catálogo completo en el datalist
                      // (el navegador solo sugiere lo que empieza igual al texto actual);
                      // si el usuario se va sin escribir nada, se restaura el valor previo.
                      e.target.dataset.prevRaza = formAnimal.raza;
                      setFormAnimal(prev => ({ ...prev, raza: "" }));
                    }}
                    onBlur={e => {
                      if (!formAnimal.raza.trim() && e.target.dataset.prevRaza) {
                        setFormAnimal(prev => ({ ...prev, raza: e.target.dataset.prevRaza || "" }));
                      }
                    }}
                    placeholder="Ej. Brahman, F1 Brahman x Gyr..."
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white"
                  />
                  <datalist id="razas-bovinas-catalogo">
                    {RAZAS_BOVINAS_COMUNES.map(r => <option key={r} value={r} />)}
                  </datalist>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Sexo</label>
                  <select
                    value={formAnimal.sexo}
                    onChange={e => {
                      const nuevoSexo = e.target.value;
                      // La categoría depende del sexo (Vaca/Novilla/... son hembra, Toro/Novillo/... son macho) —
                      // si no se corrige acá, se podía guardar "Hembra" con categoría "Toro" sin darse cuenta.
                      const categoriasValidas = nuevoSexo === "HEMBRA"
                        ? ["VACA", "NOVILLA", "MAUTA", "BECERRA"]
                        : ["TORO", "NOVILLO", "MAUTE", "TERNERO"];
                      const categoriaCorregida = categoriasValidas.includes(formAnimal.tipoAnimal)
                        ? formAnimal.tipoAnimal
                        : categoriasValidas[0];
                      setFormAnimal({ ...formAnimal, sexo: nuevoSexo, tipoAnimal: categoriaCorregida });
                    }}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white">
                    <option value="HEMBRA">Hembra</option>
                    <option value="MACHO">Macho</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Categoría</label>
                  <select
                    value={formAnimal.tipoAnimal}
                    onChange={e => setFormAnimal({ ...formAnimal, tipoAnimal: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white">
                    {(formAnimal.sexo === "HEMBRA"
                      ? [["VACA", "Vaca"], ["NOVILLA", "Novilla"], ["MAUTA", "Mauta"], ["BECERRA", "Becerra"]]
                      : [["TORO", "Toro"], ["NOVILLO", "Novillo"], ["MAUTE", "Maute"], ["TERNERO", "Ternero"]]
                    ).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Peso Inicial (kg)</label>
                  <input
                    type="number"
                    onFocus={e => e.target.select()}
                    value={formAnimal.pesoActual || ""}
                    onChange={e => setFormAnimal({ ...formAnimal, pesoActual: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Potrero Asignado</label>
                  <select
                    value={formAnimal.potreroId}
                    onChange={e => setFormAnimal({ ...formAnimal, potreroId: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white">
                    {potreros.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Lote o Grupo de Entrada (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej. Lote Marzo 2026 / Compra Feria San Cristóbal"
                  value={formAnimal.lote}
                  onChange={e => setFormAnimal({ ...formAnimal, lote: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white font-medium"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Permite agrupar y trazar animales nacidos o comprados en un mismo embarque/feria.
                </p>
              </div>

              {/* Estados Reproductivo & Productivo — solo aplican a hembras */}
              {formAnimal.sexo === "HEMBRA" && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div>
                    <label className="text-slate-400 block mb-1">Estado Reproductivo</label>
                    <select
                      value={formAnimal.estadoReproductivo}
                      onChange={e => setFormAnimal({ ...formAnimal, estadoReproductivo: e.target.value as any })}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-slate-900 dark:text-white font-medium text-xs">
                      <option value="VACIA">Vacía</option>
                      <option value="PREÑADA">Preñada</option>
                      <option value="EN_ESPERA">En Espera (Celo / IA)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Estado Productivo</label>
                    <select
                      value={formAnimal.estadoProductivo}
                      onChange={e => setFormAnimal({ ...formAnimal, estadoProductivo: e.target.value as any })}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-slate-900 dark:text-white font-medium text-xs">
                      <option value="SECA">Seca</option>
                      <option value="ORDEÑO">En Ordeño</option>
                      <option value="CRIANDO">Criando / Amamantando</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalNuevoAnimal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={(e) => handleGuardarAnimal(e, true)}
                  className="apple-glass-btn text-slate-700 dark:text-white font-bold px-5 py-2 rounded-xl cursor-pointer border border-emerald-500/30">
                  Guardar y Cerrar
                </button>
                <button
                  type="submit"
                  title="Deja el formulario abierto, listo para dar de alta el siguiente animal del mismo lote/compra"
                  className="btn-cyber-neon text-white font-bold px-6 py-2 rounded-xl cursor-pointer">
                  Guardar y Agregar Otro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AGREGAR POTRERO (MEJORADO CON COLOR PICKER GANSOFT) */}
      {modalNuevoPotrero && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="apple-glass rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-emerald-500/30 text-left space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
                Agregar Potrero
              </h3>
              <button
                onClick={() => setModalNuevoPotrero(false)}
                className="text-slate-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarPotrero} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Código *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. POT-05"
                    value={formPotrero.codigo}
                    onChange={e => setFormPotrero({ ...formPotrero, codigo: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Descripción / Nombre *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Potrero La Esperanza"
                    value={formPotrero.nombre}
                    onChange={e => setFormPotrero({ ...formPotrero, nombre: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Pasto Predominante</label>
                  <input
                    type="text"
                    placeholder="Ej. Brachiaria decumbens"
                    value={formPotrero.tipoPasto}
                    onChange={e => setFormPotrero({ ...formPotrero, tipoPasto: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Color Distintivo en el Mapa</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formPotrero.color}
                      onChange={e => setFormPotrero({ ...formPotrero, color: e.target.value })}
                      className="w-10 h-9 rounded-xl bg-transparent border-0 cursor-pointer"
                    />
                    <div className="flex items-center gap-1.5">
                      {["#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#EF4444"].map(c => (
                        <button
                          type="button"
                          key={c}
                          onClick={() => setFormPotrero({ ...formPotrero, color: c })}
                          className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                            formPotrero.color === c ? "scale-110 border-white" : "border-transparent"
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Superficie (Hectáreas) *</label>
                  <input
                    type="number"
                    onFocus={e => e.target.select()}
                    step="0.1"
                    required
                    value={formPotrero.areaHectareas}
                    onChange={e => setFormPotrero({ ...formPotrero, areaHectareas: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Capacidad Animal Máxima</label>
                  <input
                    type="number"
                    onFocus={e => e.target.select()}
                    value={formPotrero.capacidadAnimales}
                    onChange={e => setFormPotrero({ ...formPotrero, capacidadAnimales: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Observaciones</label>
                <textarea
                  rows={2}
                  placeholder="Relieve, presencia de agua, tipo de cerca..."
                  value={formPotrero.observaciones}
                  onChange={e => setFormPotrero({ ...formPotrero, observaciones: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white resize-none"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalNuevoPotrero(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer">
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-cyber-neon text-white font-bold px-6 py-2 rounded-xl cursor-pointer">
                  Guardar Potrero
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ROTAR POTRERO */}
      {modalRotar && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="apple-glass rounded-3xl p-6 sm:p-8 max-w-md w-full border border-emerald-500/30 text-left space-y-4">
            <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
              Rotación de Potrero
            </h3>
            <p className="text-xs text-slate-500 dark:text-white/60">
              Mover el hato del potrero <strong className="text-emerald-400">{modalRotar.nombre}</strong> a un nuevo potrero. El origen pasará automáticamente a estado <strong>EN DESCANSO</strong> para recuperar el pasto.
            </p>

            <div className="space-y-2 text-xs">
              <label className="text-slate-400 block">Seleccionar Potrero Destino:</label>
              <select
                value={potreroDestinoId}
                onChange={e => setPotreroDestinoId(Number(e.target.value))}
                className="w-full p-3 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white font-bold">
                {potreros.filter(p => p.id !== modalRotar.id).map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.tipoPasto || "Pasto"}) • {p.estado}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
              <button
                onClick={() => setModalRotar(null)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer">
                Cancelar
              </button>
              <button
                onClick={handleEjecutarRotacion}
                className="btn-cyber-neon text-white font-bold px-5 py-2.5 rounded-xl cursor-pointer">
                Confirmar Rotación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR ORDEÑO */}
      {modalOrdeno && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="apple-glass rounded-3xl p-6 sm:p-8 max-w-md w-full border border-sky-500/30 text-left space-y-4">
            <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
              Registrar Ordeño
            </h3>

            <form onSubmit={handleGuardarOrdeno} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Vaca / Hembra</label>
                <select
                  value={formOrdeno.animalId}
                  onChange={e => setFormOrdeno({ ...formOrdeno, animalId: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white">
                  {animalesActivos.filter(a => a.sexo === "HEMBRA").map(a => (
                    <option key={a.id} value={a.id}>{a.arete} - {a.nombre || "Sin nombre"}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Turno</label>
                  <select
                    value={formOrdeno.turno}
                    onChange={e => setFormOrdeno({ ...formOrdeno, turno: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white">
                    <option value="MANANA">Mañana</option>
                    <option value="TARDE">Tarde</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Litros Ordeñados *</label>
                  <input
                    type="number"
                    onFocus={e => e.target.select()}
                    step="0.1"
                    required
                    value={formOrdeno.cantidadLitros}
                    onChange={e => setFormOrdeno({ ...formOrdeno, cantidadLitros: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-sky-400 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">% Grasa</label>
                  <input
                    type="number"
                    onFocus={e => e.target.select()}
                    step="0.1"
                    value={formOrdeno.porcentajeGrasa}
                    onChange={e => setFormOrdeno({ ...formOrdeno, porcentajeGrasa: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Precio x Litro (USD)</label>
                  <input
                    type="number"
                    onFocus={e => e.target.select()}
                    step="0.01"
                    value={formOrdeno.precioVentaLitro}
                    onChange={e => setFormOrdeno({ ...formOrdeno, precioVentaLitro: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-emerald-400 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Destino de la Leche *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormOrdeno({ ...formOrdeno, destino: "TANQUE" })}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      formOrdeno.destino === "TANQUE"
                        ? "bg-sky-500/20 border-sky-400 text-sky-400 shadow-md shadow-sky-500/20"
                        : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                    }`}>
                    <span className="inline-flex items-center gap-1.5"><IconMilk size={13} /> Al Tanque (Stock)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormOrdeno({ ...formOrdeno, destino: "VENTA_DIRECTA" })}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      formOrdeno.destino === "VENTA_DIRECTA"
                        ? "bg-amber-500/20 border-amber-400 text-amber-400 shadow-md shadow-amber-500/20"
                        : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                    }`}>
                    <span className="inline-flex items-center gap-1.5"><IconBolt size={13} /> Venta Directa</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {formOrdeno.destino === "TANQUE"
                    ? "Suma los litros al tanque refrigerado de la finca para posterior despacho a cisterna."
                    : "Ingreso inmediato por venta directa a pie de vaca o despacho sin almacenamiento."}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Liquidación estimada:</span>
                <span className="font-mono font-bold text-emerald-400">
                  ${(formOrdeno.cantidadLitros * formOrdeno.precioVentaLitro).toFixed(2)} USD
                  {monedasConfig.VES && ` • Bs. ${((formOrdeno.cantidadLitros * formOrdeno.precioVentaLitro) * tasaBCV).toFixed(2)}`}
                  {monedasConfig.COP && ` • COP $${Math.round((formOrdeno.cantidadLitros * formOrdeno.precioVentaLitro) * tasaCOP).toLocaleString()}`}
                </span>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOrdeno(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer">
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-cyber-neon text-white font-bold px-6 py-2 rounded-xl cursor-pointer">
                  Guardar Ordeño
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR PESAJE & GDP */}
      {/* MODAL: EDITAR ANIMAL */}
      {modalEditarAnimal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="apple-glass rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-emerald-500/30 text-left space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white flex items-center gap-2">
                  <IconEdit size={18} />
                  <span>Editar Animal</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/60 mt-1">
                  Arete: <strong className="text-emerald-400">{modalEditarAnimal.arete}</strong> (no editable — es la identidad del animal)
                </p>
              </div>
              <button
                onClick={() => setModalEditarAnimal(null)}
                className="text-slate-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarEdicionAnimal} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Nombre</label>
                  <input
                    type="text"
                    value={formEditarAnimal.nombre}
                    onChange={e => setFormEditarAnimal({ ...formEditarAnimal, nombre: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Raza</label>
                  <input
                    type="text"
                    list="razas-bovinas-catalogo"
                    value={formEditarAnimal.raza}
                    onChange={e => setFormEditarAnimal({ ...formEditarAnimal, raza: e.target.value })}
                    onFocus={e => e.target.select()}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Categoría</label>
                  <select
                    value={formEditarAnimal.tipoAnimal}
                    onChange={e => setFormEditarAnimal({ ...formEditarAnimal, tipoAnimal: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white">
                    {(modalEditarAnimal.sexo === "HEMBRA"
                      ? ["VACA", "NOVILLA", "MAUTA", "BECERRA"]
                      : ["TORO", "NOVILLO", "MAUTE", "TERNERO"]
                    ).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Peso Actual (kg)</label>
                  <input
                    type="number"
                    onFocus={e => e.target.select()}
                    value={formEditarAnimal.pesoActual}
                    onChange={e => setFormEditarAnimal({ ...formEditarAnimal, pesoActual: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Potrero Asignado</label>
                  <select
                    value={formEditarAnimal.potreroId}
                    onChange={e => setFormEditarAnimal({ ...formEditarAnimal, potreroId: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white">
                    <option value={0}>Sin potrero</option>
                    {potreros.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Lote</label>
                  <input
                    type="text"
                    value={formEditarAnimal.lote}
                    onChange={e => setFormEditarAnimal({ ...formEditarAnimal, lote: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {modalEditarAnimal.sexo === "HEMBRA" && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div>
                    <label className="text-slate-400 block mb-1">Estado Reproductivo</label>
                    <select
                      value={formEditarAnimal.estadoReproductivo}
                      onChange={e => setFormEditarAnimal({ ...formEditarAnimal, estadoReproductivo: e.target.value as any })}
                      className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white">
                      <option value="VACIA">Vacía</option>
                      <option value="PREÑADA">Preñada</option>
                      <option value="EN_ESPERA">En Espera (Celo / IA)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Estado Productivo</label>
                    <select
                      value={formEditarAnimal.estadoProductivo}
                      onChange={e => setFormEditarAnimal({ ...formEditarAnimal, estadoProductivo: e.target.value as any })}
                      className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white">
                      <option value="SECA">Seca</option>
                      <option value="ORDEÑO">En Ordeño</option>
                      <option value="CRIANDO">Criando / Amamantando</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalEditarAnimal(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer">
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-cyber-neon text-white font-bold px-6 py-2.5 rounded-xl cursor-pointer">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalPesaje && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="apple-glass rounded-3xl p-6 sm:p-8 max-w-md w-full border border-emerald-500/30 text-left space-y-4">
            <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
              Pesaje: {modalPesaje.nombre || modalPesaje.arete}
            </h3>
            <p className="text-xs text-slate-500 dark:text-white/60">
              Arete: <strong className="text-emerald-400">{modalPesaje.arete}</strong> • Raza: {modalPesaje.raza}
            </p>

            <form onSubmit={handleGuardarPesaje} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Nuevo Peso (kg) *</label>
                <input
                  type="number"
                  onFocus={e => e.target.select()}
                  step="0.5"
                  required
                  value={pesoNuevo}
                  onChange={e => setPesoNuevo(Number(e.target.value))}
                  className="w-full p-3 rounded-2xl bg-white/5 border border-white/15 text-emerald-400 font-['Outfit'] font-black text-3xl text-center"
                />
              </div>

              {gdpData && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
                  <div className="text-emerald-400 font-bold">Ganancia Diaria de Peso (GDP):</div>
                  <div className="font-['Outfit'] font-black text-lg text-white">
                    {gdpData.gdpKgDia ? `+${gdpData.gdpKgDia} kg/día` : "Calculando..."}
                  </div>
                  <div className="text-[10px] text-slate-400">Total acumulado: +{gdpData.gananciaTotalKg} kg en {gdpData.dias} días</div>
                </div>
              )}

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalPesaje(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer">
                  Cerrar
                </button>
                <button
                  type="submit"
                  className="btn-cyber-neon text-white font-bold px-6 py-2.5 rounded-xl cursor-pointer">
                  Registrar Pesaje
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FICHA & QR */}
      {modalFichaAnimal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="apple-glass rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-emerald-500/30 text-center space-y-4">
            <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
              Ficha de Trazabilidad
            </h3>

            {/* Visualización de código QR vectorial */}
            <div className="w-36 h-36 mx-auto bg-white rounded-2xl p-3 flex items-center justify-center shadow-lg border-2 border-emerald-400">
              <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900" fill="currentColor">
                <rect x="5" y="5" width="25" height="25" rx="3" fill="none" stroke="currentColor" strokeWidth="6" />
                <rect x="12" y="12" width="11" height="11" rx="1" />
                <rect x="70" y="5" width="25" height="25" rx="3" fill="none" stroke="currentColor" strokeWidth="6" />
                <rect x="77" y="12" width="11" height="11" rx="1" />
                <rect x="5" y="70" width="25" height="25" rx="3" fill="none" stroke="currentColor" strokeWidth="6" />
                <rect x="12" y="77" width="11" height="11" rx="1" />
                <rect x="36" y="10" width="8" height="8" />
                <rect x="50" y="10" width="8" height="8" />
                <rect x="36" y="24" width="8" height="8" />
                <rect x="50" y="36" width="8" height="8" />
                <rect x="10" y="40" width="8" height="8" />
                <rect x="24" y="40" width="8" height="8" />
                <rect x="70" y="40" width="8" height="8" />
                <rect x="84" y="40" width="8" height="8" />
                <rect x="40" y="52" width="8" height="8" />
                <rect x="54" y="52" width="8" height="8" />
                <rect x="40" y="70" width="8" height="8" />
                <rect x="54" y="70" width="8" height="8" />
                <rect x="70" y="70" width="8" height="8" />
                <rect x="84" y="84" width="8" height="8" />
              </svg>
            </div>

            <div className="text-xs text-slate-500 dark:text-white/70 space-y-1">
              <div className="font-bold text-slate-900 dark:text-white text-base">
                {modalFichaAnimal.nombre || `Animal ${modalFichaAnimal.arete}`}
              </div>
              <div>Arete: <span className="font-mono font-bold text-emerald-400">{modalFichaAnimal.arete}</span></div>
              <div>Raza: {modalFichaAnimal.raza} • Sexo: {modalFichaAnimal.sexo}</div>
              <div>Peso: {modalFichaAnimal.pesoActual} kg</div>
            </div>

            <button
              onClick={() => setModalFichaAnimal(null)}
              className="apple-glass-btn w-full py-2.5 rounded-xl text-xs font-bold text-slate-900 dark:text-white cursor-pointer">
              Cerrar Ficha
            </button>
          </div>
        </div>
      )}

      {/* MODAL: VACUNACIÓN & TRATAMIENTOS SANITARIOS */}
      {modalVacuna && (() => {
        const vacunaSel = vacunas.find(v => v.id === Number(formVacuna.vacunaId));
        const lotesUnicos = Array.from(new Set(animales.map(a => a.lote).filter(Boolean))) as string[];
        const totalSeleccionados = vacunacionModo === "INDIVIDUAL"
          ? (formVacuna.animalId ? 1 : 0)
          : animalesVacunaSeleccionados.length;

        return (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
            <div className="apple-glass rounded-3xl p-5 sm:p-7 max-w-xl w-full border border-emerald-500/40 text-left space-y-4 my-auto max-h-[92vh] flex flex-col font-['Inter']">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400"><IconSyringe size={20} /></span>
                  <div>
                    <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
                      Aplicar Tratamiento Sanitario / Biológico
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Cálculo estricto de tiempos de retiro y registro individual o en lote.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalVacuna(false)}
                  className="text-slate-400 hover:text-white cursor-pointer text-base">
                  ✕
                </button>
              </div>

              <form onSubmit={handleGuardarVacuna} className="space-y-4 text-xs overflow-y-auto pr-1">
                {/* 1. SELECCIÓN DE ANIMAL(ES): INDIVIDUAL VS LOTE */}
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-300">Modo de Aplicación</label>
                    <div className="inline-flex rounded-xl bg-slate-900 p-1 border border-white/10">
                      <button
                        type="button"
                        onClick={() => setVacunacionModo("INDIVIDUAL")}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          vacunacionModo === "INDIVIDUAL"
                            ? "bg-emerald-500 text-white shadow"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Individual (1 animal)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setVacunacionModo("MULTIPLE");
                          if (animalesVacunaSeleccionados.length === 0 && formVacuna.animalId) {
                            setAnimalesVacunaSeleccionados([Number(formVacuna.animalId)]);
                          }
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          vacunacionModo === "MULTIPLE"
                            ? "bg-emerald-500 text-white shadow"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Múltiple / Lote ({animalesVacunaSeleccionados.length})
                      </button>
                    </div>
                  </div>

                  {vacunacionModo === "INDIVIDUAL" ? (
                    <div>
                      <label className="text-slate-400 block mb-1 font-medium">Animal a Tratar *</label>
                      <select
                        value={formVacuna.animalId}
                        onChange={e => setFormVacuna({ ...formVacuna, animalId: Number(e.target.value) })}
                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-bold text-xs"
                      >
                        {animalesActivos.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.arete} - {a.nombre || a.tipoAnimal} ({a.raza || "Bovino"}) {a.lote ? `[${a.lote}]` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setAnimalesVacunaSeleccionados(animalesActivos.map(a => a.id))}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold hover:bg-emerald-500/30 cursor-pointer"
                        >
                          Todos ({animalesActivos.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setAnimalesVacunaSeleccionados([])}
                          className="px-2.5 py-1 rounded-lg bg-white/5 text-slate-400 border border-white/10 text-[11px] hover:text-white cursor-pointer"
                        >
                          Desmarcar
                        </button>

                        {/* Filtros rápidos por Lote */}
                        {lotesUnicos.map(loteNombre => (
                          <button
                            key={loteNombre}
                            type="button"
                            onClick={() => {
                              const idsLote = animalesActivos.filter(a => a.lote === loteNombre).map(a => a.id);
                              setAnimalesVacunaSeleccionados(prev => Array.from(new Set([...prev, ...idsLote])));
                            }}
                            className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-bold hover:bg-purple-500/30 cursor-pointer"
                          >
                            + Lote: {loteNombre}
                          </button>
                        ))}

                        {/* Filtros rápidos por Potrero */}
                        {potreros.slice(0, 3).map(pot => (
                          <button
                            key={pot.id}
                            type="button"
                            onClick={() => {
                              const idsPot = animalesActivos.filter(a => a.potrero?.id === pot.id).map(a => a.id);
                              setAnimalesVacunaSeleccionados(prev => Array.from(new Set([...prev, ...idsPot])));
                            }}
                            className="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[11px] font-bold hover:bg-sky-500/30 cursor-pointer"
                          >
                            + Potrero: {pot.nombre}
                          </button>
                        ))}
                      </div>

                      {/* Lista scrolleable de animales seleccionables */}
                      <div className="max-h-36 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/70 p-2 space-y-1">
                        {animalesActivos.map(a => {
                          const isSel = animalesVacunaSeleccionados.includes(a.id);
                          return (
                            <label
                              key={a.id}
                              className={`flex items-center justify-between p-1.5 rounded-lg text-[11px] cursor-pointer transition-colors ${
                                isSel ? "bg-emerald-500/20 text-white font-bold" : "hover:bg-white/5 text-slate-300"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSel}
                                  onChange={e => {
                                    if (e.target.checked) {
                                      setAnimalesVacunaSeleccionados(prev => [...prev, a.id]);
                                    } else {
                                      setAnimalesVacunaSeleccionados(prev => prev.filter(id => id !== a.id));
                                    }
                                  }}
                                  className="rounded text-emerald-500 focus:ring-0"
                                />
                                <span className="font-mono text-emerald-400">{a.arete}</span>
                                <span>{a.nombre || a.tipoAnimal}</span>
                              </div>
                              <span className="text-[10px] text-slate-400">{a.lote || a.potrero?.nombre || ""}</span>
                            </label>
                          );
                        })}
                      </div>
                      <div className="text-[11px] text-right font-bold text-emerald-400">
                        {animalesVacunaSeleccionados.length} de {animalesActivos.length} animales seleccionados
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. CATÁLOGO DE VACUNAS CON DÍAS DE RETIRO REALES */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-300 block">Fármaco / Biológico del Catálogo *</label>
                    <button
                      type="button"
                      onClick={() => setMostrarCrearVacuna(!mostrarCrearVacuna)}
                      className="text-xs font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                    >
                      {mostrarCrearVacuna ? "Cerrar creación" : "+ Nueva Vacuna en Catálogo"}
                    </button>
                  </div>

                  {/* Buscador de vacunas/antiparasitarios de uso común — agrega al catálogo real con un clic */}
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type="text"
                        value={busquedaVacunaCatalogo}
                        onChange={e => setBusquedaVacunaCatalogo(e.target.value)}
                        placeholder="Buscar vacuna o antiparasitario común (ej. Aftosa, Ivermectina, Brucelosis...)"
                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs placeholder:text-slate-500"
                      />
                    </div>
                    {busquedaVacunaCatalogo.trim() && (
                      <div className="max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/60 divide-y divide-white/5">
                        {CATALOGO_VACUNAS_SUGERIDAS.filter(v =>
                          v.nombre.toLowerCase().includes(busquedaVacunaCatalogo.toLowerCase()) ||
                          v.enfermedadPrevenida.toLowerCase().includes(busquedaVacunaCatalogo.toLowerCase())
                        ).length === 0 ? (
                          <div className="p-3 text-[11px] text-slate-400 text-center">
                            No hay coincidencias en el catálogo de referencia — usa "+ Nueva Vacuna en Catálogo" para registrar un producto distinto.
                          </div>
                        ) : (
                          CATALOGO_VACUNAS_SUGERIDAS.filter(v =>
                            v.nombre.toLowerCase().includes(busquedaVacunaCatalogo.toLowerCase()) ||
                            v.enfermedadPrevenida.toLowerCase().includes(busquedaVacunaCatalogo.toLowerCase())
                          ).map(item => (
                            <button
                              key={item.nombre}
                              type="button"
                              onClick={() => handleAgregarVacunaDesdeCatalogoSugerido(item)}
                              className="w-full text-left p-2.5 hover:bg-emerald-500/10 cursor-pointer transition-colors flex items-center justify-between gap-2"
                            >
                              <div>
                                <div className="text-xs font-bold text-white">{item.nombre}</div>
                                <div className="text-[10px] text-slate-400">{item.enfermedadPrevenida}</div>
                              </div>
                              <span className="text-[10px] font-bold text-emerald-400 shrink-0">
                                Retiro leche {item.diasRetiroLeche}d · carne {item.diasRetiroCarne}d
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Sub-formulario in-situ para crear vacuna nueva */}
                  {mostrarCrearVacuna ? (
                    <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-2.5">
                      <div className="text-[11px] font-bold text-emerald-300">Registrar Nuevo Biológico en Catálogo</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-slate-400 block mb-1 text-[10px]">Nombre Comercial / Biológico *</label>
                          <input
                            type="text"
                            required
                            placeholder="Ej. Cydectin / Vacuna Antirrábica"
                            value={nuevaVacunaForm.nombre}
                            onChange={e => setNuevaVacunaForm({ ...nuevaVacunaForm, nombre: e.target.value })}
                            className="w-full p-2 rounded-lg bg-slate-900 border border-white/15 text-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 block mb-1 text-[10px]">Enfermedad Prevenida</label>
                          <input
                            type="text"
                            placeholder="Ej. Rabia, Aftosa, Parásitos"
                            value={nuevaVacunaForm.enfermedadPrevenida}
                            onChange={e => setNuevaVacunaForm({ ...nuevaVacunaForm, enfermedadPrevenida: e.target.value })}
                            className="w-full p-2 rounded-lg bg-slate-900 border border-white/15 text-white text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-rose-400 block mb-1 text-[10px] font-bold">Retiro Leche (días)</label>
                          <input
                            type="number"
                            onFocus={e => e.target.select()}
                            min="0"
                            value={nuevaVacunaForm.diasRetiroLeche}
                            onChange={e => setNuevaVacunaForm({ ...nuevaVacunaForm, diasRetiroLeche: Number(e.target.value) })}
                            className="w-full p-2 rounded-lg bg-slate-900 border border-rose-500/30 text-rose-300 font-mono font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-amber-400 block mb-1 text-[10px] font-bold">Retiro Carne (días)</label>
                          <input
                            type="number"
                            onFocus={e => e.target.select()}
                            min="0"
                            value={nuevaVacunaForm.diasRetiroCarne}
                            onChange={e => setNuevaVacunaForm({ ...nuevaVacunaForm, diasRetiroCarne: Number(e.target.value) })}
                            className="w-full p-2 rounded-lg bg-slate-900 border border-amber-500/30 text-amber-300 font-mono font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-sky-400 block mb-1 text-[10px] font-bold">Refuerzo (días)</label>
                          <input
                            type="number"
                            onFocus={e => e.target.select()}
                            min="0"
                            value={nuevaVacunaForm.diasParaRefuerzo}
                            onChange={e => setNuevaVacunaForm({ ...nuevaVacunaForm, diasParaRefuerzo: Number(e.target.value) })}
                            className="w-full p-2 rounded-lg bg-slate-900 border border-sky-500/30 text-sky-300 font-mono font-bold text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={handleCrearNuevaVacunaInSitu}
                          className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow"
                        >
                          Guardar y Seleccionar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <select
                        value={formVacuna.vacunaId}
                        onChange={e => setFormVacuna({ ...formVacuna, vacunaId: Number(e.target.value) })}
                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-emerald-500/30 text-white font-bold text-xs"
                      >
                        {vacunas.map(v => (
                          <option key={v.id} value={v.id}>
                            {v.nombre} — [Retiro Leche: {v.diasRetiroLeche ?? 0}d | Carne: {v.diasRetiroCarne ?? 0}d | Refuerzo: {v.diasParaRefuerzo ?? 0}d]
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Ficha técnica de seguridad de la vacuna seleccionada */}
                  {vacunaSel && (
                    <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                      <div className={`p-2 rounded-xl border text-center ${
                        (vacunaSel.diasRetiroLeche && vacunaSel.diasRetiroLeche > 0)
                          ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                          : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      }`}>
                        <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1"><IconMilk size={10} /> Retiro Leche</span>
                        <span className="font-bold font-mono text-xs">{vacunaSel.diasRetiroLeche ?? 0} días</span>
                      </div>

                      <div className={`p-2 rounded-xl border text-center ${
                        (vacunaSel.diasRetiroCarne && vacunaSel.diasRetiroCarne > 0)
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                          : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      }`}>
                        <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1"><IconMeat size={10} /> Retiro Carne</span>
                        <span className="font-bold font-mono text-xs">{vacunaSel.diasRetiroCarne ?? 0} días</span>
                      </div>

                      <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-300 text-center">
                        <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1"><IconRefresh size={10} /> Próx. Refuerzo</span>
                        <span className="font-bold font-mono text-xs">{vacunaSel.diasParaRefuerzo ?? 0} días</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. DATOS DE LOTE, COSTO Y RESPONSABLE */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Número de Lote del Biológico</label>
                    <input
                      type="text"
                      value={formVacuna.lote}
                      onChange={e => setFormVacuna({ ...formVacuna, lote: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono"
                      placeholder="Ej. B-2026-09"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Costo Total Estimado (USD)</label>
                    <input
                      type="number"
                      onFocus={e => e.target.select()}
                      step="0.1"
                      min="0"
                      value={formVacuna.costo}
                      onChange={e => setFormVacuna({ ...formVacuna, costo: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Médico Veterinario / Técnico Responsable</label>
                  <input
                    type="text"
                    value={formVacuna.veterinario}
                    onChange={e => setFormVacuna({ ...formVacuna, veterinario: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white"
                    placeholder="Ej. Dr. Carlos Mendoza MV"
                  />
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400">
                    Se aplicará a <strong>{totalSeleccionados}</strong> animal(es).
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setModalVacuna(false)}
                      className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer">
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn-cyber-neon text-white font-bold px-6 py-2 rounded-xl cursor-pointer shadow-lg shadow-emerald-500/20">
                      Aplicar a {totalSeleccionados} Animal(es)
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MODAL: REPRODUCCIÓN */}
      {modalReproduccion && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="apple-glass rounded-3xl p-6 sm:p-8 max-w-md w-full border border-purple-500/30 text-left space-y-4">
            <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
              Registro Reproductivo
            </h3>
            <form onSubmit={handleGuardarRepro} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Hembra</label>
                <select
                  value={formRepro.hembraId}
                  onChange={e => setFormRepro({ ...formRepro, hembraId: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white">
                  {animalesActivos.filter(a => a.sexo === "HEMBRA").map(a => (
                    <option key={a.id} value={a.id}>{a.arete} - {a.nombre || a.tipoAnimal}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Tipo de Evento</label>
                <select
                  value={formRepro.tipo}
                  onChange={e => setFormRepro({ ...formRepro, tipo: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white font-bold">
                  <option value="DIAGNOSTICO_PRENEZ">Diagnóstico de Preñez (Palpación / Eco)</option>
                  <option value="SERVICIO">Servicio / Inseminación Artificial</option>
                  <option value="PARTO">Parto / Nacimiento</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Semental / Pajuela de IA</label>
                <input
                  type="text"
                  value={formRepro.sementalReferenciaExterna}
                  onChange={e => setFormRepro({ ...formRepro, sementalReferenciaExterna: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Fecha Estimada de Parto</label>
                <input
                  type="date"
                  value={formRepro.fechaProbableParto}
                  onChange={e => setFormRepro({ ...formRepro, fechaProbableParto: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalReproduccion(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer">
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-cyber-neon text-white font-bold px-6 py-2 rounded-xl cursor-pointer">
                  Guardar Evento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EVENTO DEDICADO DE CELO & SINCRONIZACIÓN */}
      {modalCelo && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="apple-glass rounded-3xl p-6 sm:p-8 max-w-md w-full border border-purple-500/40 text-left space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-rose-400"><IconFire size={20} /></span>
                <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
                  Detección de Celo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalCelo(false)}
                className="text-slate-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarCelo} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Hembra en Celo *</label>
                <select
                  required
                  value={formCelo.hembraId}
                  onChange={e => setFormCelo({ ...formCelo, hembraId: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-bold">
                  {animalesActivos.filter(a => a.sexo === "HEMBRA").map(a => (
                    <option key={a.id} value={a.id}>
                      {a.arete} - {a.nombre || a.tipoAnimal} ({a.raza || "Bovino"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Fecha de Detección</label>
                  <input
                    type="date"
                    required
                    value={formCelo.fecha}
                    onChange={e => setFormCelo({ ...formCelo, fecha: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Tipo de Celo</label>
                  <select
                    value={formCelo.tipoCelo}
                    onChange={e => setFormCelo({ ...formCelo, tipoCelo: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white">
                    <option value="NATURAL">Celo Natural</option>
                    <option value="SINCRONIZADO">Sincronizado (IATF / Protocolo)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Signos Clínicos y Síntomas Observados</label>
                <input
                  type="text"
                  value={formCelo.sintomasCelo}
                  onChange={e => setFormCelo({ ...formCelo, sintomasCelo: e.target.value })}
                  placeholder="Ej. Acepta monta, moco cristalino filante, vulva edematosa"
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Hora Óptima de Inseminación (Regla AM/PM)</label>
                <input
                  type="text"
                  value={formCelo.horaOptimaIA}
                  onChange={e => setFormCelo({ ...formCelo, horaOptimaIA: e.target.value })}
                  placeholder="Ej. Detectado AM → Inseminar PM (12 horas después)"
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-[11px]"
                />
                <p className="text-[10px] text-purple-400 mt-1 flex items-start gap-1">
                  <IconBulb size={12} className="shrink-0 mt-0.5" /> Al guardar, el estado reproductivo de la hembra cambiará automáticamente a <strong>EN_ESPERA</strong>.
                </p>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalCelo(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer">
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-cyber-neon text-white font-bold px-6 py-2 rounded-xl cursor-pointer shadow-lg shadow-purple-500/20">
                  Registrar Celo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EVENTO DEDICADO DE MASTITIS (SANIDAD & RETIRO DE LECHE) */}
      {modalMastitis && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="apple-glass rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-rose-500/40 text-left space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-rose-400"><IconWarning size={20} /></span>
                <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
                  Diagnóstico y Tratamiento de Mastitis
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalMastitis(false)}
                className="text-slate-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarMastitis} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Vaca Afectada *</label>
                <select
                  required
                  value={formMastitis.animalId}
                  onChange={e => setFormMastitis({ ...formMastitis, animalId: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-bold">
                  {animalesActivos.filter(a => a.sexo === "HEMBRA").map(a => (
                    <option key={a.id} value={a.id}>
                      {a.arete} - {a.nombre || a.tipoAnimal} ({a.raza || "Bovino"}) · Potrero: {a.potrero?.nombre || "Sin Potrero"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Cuarto Mamario Afectado *</label>
                  <select
                    value={formMastitis.cuartoAfectado}
                    onChange={e => setFormMastitis({ ...formMastitis, cuartoAfectado: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-bold">
                    <option value="AD">AD (Anterior Derecho)</option>
                    <option value="AI">AI (Anterior Izquierdo)</option>
                    <option value="PD">PD (Posterior Derecho)</option>
                    <option value="PI">PI (Posterior Izquierdo)</option>
                    <option value="MULTIPLES">Múltiples Cuartos</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Severidad / Prueba CMT</label>
                  <select
                    value={formMastitis.gradoCmt}
                    onChange={e => setFormMastitis({ ...formMastitis, gradoCmt: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-bold">
                    <option value="TRAZAS">Trazas (Subclínica leve)</option>
                    <option value="GRADO_1">Grado 1 (Gel ligero sin grumos)</option>
                    <option value="GRADO_2">Grado 2 (Gel espeso marcado)</option>
                    <option value="GRADO_3">Grado 3 (Clínica aguda / Cuajo)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Fármaco Intramamario / Antibiótico</label>
                  <input
                    type="text"
                    required
                    value={formMastitis.farmacoAplicado}
                    onChange={e => setFormMastitis({ ...formMastitis, farmacoAplicado: e.target.value })}
                    placeholder="Ej. Cefalexina Intramamaria"
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white"
                  />
                </div>
                <div>
                  <label className="text-rose-400 block mb-1 font-bold">Días de Retiro de Leche *</label>
                  <input
                    type="number"
                    onFocus={e => e.target.select()}
                    min="0"
                    max="30"
                    required
                    value={formMastitis.diasRetiroLeche}
                    onChange={e => setFormMastitis({ ...formMastitis, diasRetiroLeche: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-rose-500/40 text-rose-300 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Veterinario / Técnico</label>
                  <input
                    type="text"
                    value={formMastitis.veterinario}
                    onChange={e => setFormMastitis({ ...formMastitis, veterinario: e.target.value })}
                    placeholder="Ej. Dr. González"
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Costo Estimado Tratamiento (USD)</label>
                  <input
                    type="number"
                    onFocus={e => e.target.select()}
                    step="0.5"
                    min="0"
                    value={formMastitis.costo}
                    onChange={e => setFormMastitis({ ...formMastitis, costo: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Notas Clínicas</label>
                <textarea
                  rows={2}
                  value={formMastitis.notas}
                  onChange={e => setFormMastitis({ ...formMastitis, notas: e.target.value })}
                  placeholder="Detalles de síntomas o respuesta al tratamiento..."
                  className="w-full p-2 rounded-xl bg-slate-900 border border-white/15 text-white text-xs"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-300 flex items-center gap-2">
                <IconWarning size={14} />
                <span>La leche de esta vaca quedará bloqueada en las alertas sanitarias y en el modo de ordeño diario durante el período de retiro.</span>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalMastitis(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer">
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer transition-colors shadow-lg shadow-rose-600/30">
                  Registrar Tratamiento & Alerta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRO DE VENTA / DESPACHO DE ANIMAL (individual o lote, por precio total o por kilo) */}
      {modalVentaAnimal && (() => {
        const animalesActivosVenta = animales.filter(a => a.estado === "ACTIVO");
        const idsSeleccionados = ventaModo === "INDIVIDUAL"
          ? (formVenta.animalId ? [formVenta.animalId] : [])
          : animalesVentaSeleccionados;
        const pesoTotalSeleccion = idsSeleccionados.reduce((sum, id) => sum + (animales.find(a => a.id === id)?.pesoActual || 0), 0);
        const totalEstimado = formVenta.precioPorKg > 0
          ? pesoTotalSeleccion * formVenta.precioPorKg
          : Number(formVenta.precioUSD) || 0;

        return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
          <div className="apple-glass rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-rose-500/30 text-left space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white flex items-center gap-2">
                  <IconTag size={16} />
                  <span>Despacho por Venta / Beneficio</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/60 mt-1">
                  Registra la salida formal (uno o varios animales) y márcalos como vendidos en el hato.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setModalVentaAnimal(false); setUltimaVentaId(null); }}
                className="text-slate-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            {ultimaVentaId ? (
              <div className="space-y-4 text-xs text-center py-4">
                <div className="text-emerald-400 flex flex-col items-center gap-2">
                  <IconCheckCircle size={36} />
                  <span className="font-bold text-sm text-white">Venta registrada correctamente</span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const blob = await descargarNotaEntregaVentaAnimalPdf(tenantId, ultimaVentaId);
                      const url = URL.createObjectURL(blob);
                      window.open(url, "_blank");
                      setTimeout(() => URL.revokeObjectURL(url), 30000);
                    } catch (e) {
                      notificar("No se pudo descargar la nota de entrega");
                    }
                  }}
                  className="btn-cyber-neon text-white font-bold px-5 py-2.5 rounded-xl cursor-pointer inline-flex items-center gap-2">
                  <IconDownload size={14} />
                  Descargar Nota de Entrega (PDF)
                </button>
                <div>
                  <button
                    type="button"
                    onClick={() => { setModalVentaAnimal(false); setUltimaVentaId(null); }}
                    className="text-slate-400 hover:text-white text-[11px] underline cursor-pointer">
                    Cerrar
                  </button>
                </div>
              </div>
            ) : (
            <form onSubmit={handleRegistrarVentaAnimal} className="space-y-3 text-xs">
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/5 border border-white/10 w-fit">
                <button
                  type="button"
                  onClick={() => setVentaModo("INDIVIDUAL")}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    ventaModo === "INDIVIDUAL" ? "bg-rose-500 text-white shadow-md" : "text-slate-400 hover:text-white"
                  }`}>
                  Individual
                </button>
                <button
                  type="button"
                  onClick={() => setVentaModo("MULTIPLE")}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    ventaModo === "MULTIPLE" ? "bg-rose-500 text-white shadow-md" : "text-slate-400 hover:text-white"
                  }`}>
                  Lote / Varios Animales
                </button>
              </div>

              {ventaModo === "INDIVIDUAL" ? (
                <div>
                  <label className="text-slate-400 block mb-1">Animal a Despachar *</label>
                  <select
                    required
                    value={formVenta.animalId}
                    onChange={e => {
                      const selId = Number(e.target.value);
                      const animalObj = animales.find(a => a.id === selId);
                      setFormVenta({
                        ...formVenta,
                        animalId: selId,
                        pesoSalida: animalObj?.pesoActual || formVenta.pesoSalida,
                      });
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-bold"
                  >
                    <option value="">Selecciona un animal activo...</option>
                    {animalesActivosVenta.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.arete} - {a.nombre || a.tipoAnimal} ({a.pesoActual || 0} kg)
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-400 block">Animales a Despachar *</label>
                    <button
                      type="button"
                      onClick={() => setAnimalesVentaSeleccionados(
                        animalesVentaSeleccionados.length === animalesActivosVenta.length ? [] : animalesActivosVenta.map(a => a.id)
                      )}
                      className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer">
                      {animalesVentaSeleccionados.length === animalesActivosVenta.length ? "Desmarcar todos" : `Todos (${animalesActivosVenta.length})`}
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/70 p-2 space-y-1">
                    {animalesActivosVenta.map(a => {
                      const isSel = animalesVentaSeleccionados.includes(a.id);
                      return (
                        <label key={a.id} className={`flex items-center justify-between p-1.5 rounded-lg text-[11px] cursor-pointer transition-colors ${
                          isSel ? "bg-rose-500/20 text-white font-bold" : "hover:bg-white/5 text-slate-300"
                        }`}>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSel}
                              onChange={e => setAnimalesVentaSeleccionados(prev =>
                                e.target.checked ? [...prev, a.id] : prev.filter(id => id !== a.id)
                              )}
                              className="rounded text-rose-500 focus:ring-0"
                            />
                            <span className="font-mono text-rose-300">{a.arete}</span>
                            <span>{a.nombre || a.tipoAnimal}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">{a.pesoActual || 0} kg</span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="text-[11px] text-right font-bold text-rose-400">
                    {animalesVentaSeleccionados.length} animal(es) · {pesoTotalSeleccion} kg total
                  </div>
                </div>
              )}

              <div>
                <label className="text-slate-400 block mb-1">Comprador / Frigorífico / Destino *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Matadero Frigorífico Central / Ganadería La Gloria"
                  value={formVenta.comprador}
                  onChange={e => setFormVenta({ ...formVenta, comprador: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-medium"
                />
              </div>

              {ventaModo === "INDIVIDUAL" && (
                <div>
                  <label className="text-slate-400 block mb-1">Peso en Báscula (kg)</label>
                  <input
                    type="number"
                    onFocus={e => e.target.select()}
                    step="1"
                    min="0"
                    placeholder="Ej. 480"
                    value={formVenta.pesoSalida || ""}
                    onChange={e => setFormVenta({ ...formVenta, pesoSalida: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Precio por Kilo (USD)</label>
                  <input
                    type="number"
                    onFocus={e => e.target.select()}
                    step="0.01"
                    min="0"
                    placeholder="Ej. 2.20"
                    value={formVenta.precioPorKg || ""}
                    onChange={e => setFormVenta({ ...formVenta, precioPorKg: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-emerald-500/30 text-emerald-300 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">
                    Precio Total (USD) {formVenta.precioPorKg > 0 ? "(calculado)" : "*"}
                  </label>
                  <input
                    type="number"
                    onFocus={e => e.target.select()}
                    step="0.01"
                    min="0"
                    required={!formVenta.precioPorKg}
                    disabled={formVenta.precioPorKg > 0}
                    placeholder="Ej. 1100"
                    value={formVenta.precioPorKg > 0 ? totalEstimado.toFixed(2) : (formVenta.precioUSD || "")}
                    onChange={e => setFormVenta({ ...formVenta, precioUSD: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono disabled:opacity-60"
                  />
                </div>
              </div>
              {formVenta.precioPorKg > 0 && (
                <p className="text-[10px] text-emerald-400 -mt-1">
                  {pesoTotalSeleccion} kg × ${formVenta.precioPorKg}/kg = ${totalEstimado.toFixed(2)} USD
                  {ventaModo === "MULTIPLE" ? " (repartido por el peso real de cada animal)" : ""}
                </p>
              )}

              <div>
                <label className="text-slate-400 block mb-1">Motivo / Tipo de Salida</label>
                <select
                  value={formVenta.motivo}
                  onChange={e => setFormVenta({ ...formVenta, motivo: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white"
                >
                  <option value="BENEFICIO">Venta para Beneficio / Matadero (Carne)</option>
                  <option value="CRIA">Venta para Cría / Hato Comercial</option>
                  <option value="SUBASTA">Subasta Ganadera</option>
                </select>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalVentaAnimal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer">
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer transition-colors shadow-lg">
                  Confirmar Salida por Venta
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
        );
      })()}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: MODO VAQUERA RÁPIDA (BULK ENTRY DE ORDEÑO DIARIO)
      ───────────────────────────────────────────────────────────── */}
      {modalVaqueraRapida && (() => {
        const totalVacasFila = vaqueraFilas.length;
        const vacasConLitros = vaqueraFilas.filter(f => Number(f.litrosManana) > 0 || Number(f.litrosTarde) > 0).length;
        const totalLitrosTodos = vaqueraFilas.reduce((s, f) => s + (Number(f.litrosManana) || 0) + (Number(f.litrosTarde) || 0), 0);
        const litrosMastitis = vaqueraFilas
          .filter(f => f.estado === "MASTITIS")
          .reduce((s, f) => s + (Number(f.litrosManana) || 0) + (Number(f.litrosTarde) || 0), 0);
        const litrosComerciales = Math.max(0, totalLitrosTodos - litrosMastitis);
        const promedioPorVaca = vacasConLitros > 0 ? (totalLitrosTodos / vacasConLitros) : 0;
        const ingresoUSD = (litrosComerciales * vaqueraPrecioUSD).toFixed(2);
        const ingresoVES = (litrosComerciales * vaqueraPrecioUSD * vaqueraTasaVES).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        return (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto">
            <div className="apple-glass rounded-3xl p-5 sm:p-7 max-w-5xl w-full border border-emerald-500/40 bg-slate-950/95 shadow-2xl text-left space-y-5 my-auto max-h-[92vh] flex flex-col font-['Inter']">
              
              {/* Cabecera del Modal */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold uppercase">
                    <span>Modo Vaquera Rápida • Carga Masiva</span>
                  </div>
                  <h3 className="font-['Outfit'] font-black text-xl sm:text-2xl text-white mt-1">
                    Pesaje Diario de Leche
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Usa las teclas <strong>ENTER</strong> o <strong>TAB</strong> para registrar vaca tras vaca sin despegar las manos del teclado.
                  </p>
                </div>

                <button
                  onClick={() => setModalVaqueraRapida(false)}
                  className="w-8 h-8 rounded-full apple-glass border border-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer">
                  ✕
                </button>
              </div>

              {/* Barra Superior de Parámetros Económicos y de Jornada */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs">
                <div>
                  <label className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Fecha</label>
                  <input
                    type="date"
                    value={vaqueraFecha}
                    onChange={e => setVaqueraFecha(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Turno</label>
                  <div className="flex gap-1">
                    {(["MANANA", "TARDE", "DOBLE"] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setVaqueraTurno(t)}
                        className={`flex-1 py-2 px-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                          vaqueraTurno === t ? "bg-emerald-500 text-slate-950 font-black shadow-md" : "bg-white/5 text-slate-300 hover:bg-white/10"
                        }`}>
                        {t === "MANANA" ? "AM" : t === "TARDE" ? "PM" : "Doble"}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Destino Leche</label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setVaqueraDestino("TANQUE")}
                      className={`flex-1 py-2 px-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                        vaqueraDestino === "TANQUE" ? "bg-sky-500 text-slate-950 font-black shadow-md" : "bg-white/5 text-slate-300 hover:bg-white/10"
                      }`}>
                      <span className="inline-flex items-center gap-1"><IconMilk size={11} /> Tanque</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVaqueraDestino("VENTA_DIRECTA")}
                      className={`flex-1 py-2 px-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                        vaqueraDestino === "VENTA_DIRECTA" ? "bg-amber-500 text-slate-950 font-black shadow-md" : "bg-white/5 text-slate-300 hover:bg-white/10"
                      }`}>
                      <span className="inline-flex items-center gap-1"><IconBolt size={11} /> Directa</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Precio Leche ($/L)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-emerald-400 font-bold">$</span>
                    <input
                      type="number"
                      onFocus={e => e.target.select()}
                      step="0.01"
                      value={vaqueraPrecioUSD}
                      onChange={e => setVaqueraPrecioUSD(Math.max(0, Number(e.target.value)))}
                      className="w-full p-2 pl-7 rounded-xl bg-slate-900 border border-white/15 text-white font-mono font-bold text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                    {monedasConfig.VES ? "Tasa Cambio (Bs.)" : monedasConfig.COP ? "Tasa Cambio (COP)" : "Moneda Base"}
                  </label>
                  {monedasConfig.VES ? (
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-purple-400 font-bold">Bs.</span>
                      <input
                        type="number"
                        onFocus={e => e.target.select()}
                        step="0.5"
                        value={vaqueraTasaVES}
                        onChange={e => setVaqueraTasaVES(Math.max(1, Number(e.target.value)))}
                        className="w-full p-2 pl-9 rounded-xl bg-slate-900 border border-white/15 text-white font-mono font-bold text-xs"
                      />
                    </div>
                  ) : monedasConfig.COP ? (
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-sky-400 font-bold text-[10px]">COP</span>
                      <input
                        type="number"
                        onFocus={e => e.target.select()}
                        step="10"
                        value={tasaCOP}
                        readOnly
                        className="w-full p-2 pl-11 rounded-xl bg-slate-900 border border-white/15 text-white font-mono font-bold text-xs"
                      />
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-slate-900 border border-white/15 text-slate-400 font-mono text-xs">
                      USD ($) Fijo
                    </div>
                  )}
                </div>
              </div>

              {/* Tarjetas de Totales en Tiempo Real (Apple Liquid Glass) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-0.5">
                  <span className="text-slate-400 text-[10px] uppercase block">Vacas Ordeñadas</span>
                  <div className="font-['Outfit'] font-bold text-xl text-white">
                    {vacasConLitros} <span className="text-slate-500 text-xs font-normal">/ {totalVacasFila}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-sky-500/30 space-y-0.5">
                  <span className="text-sky-400 text-[10px] uppercase block font-bold">Litros Comerciales</span>
                  <div className="font-['Outfit'] font-black text-xl text-sky-400">
                    {litrosComerciales.toFixed(1)} L
                  </div>
                  {litrosMastitis > 0 && (
                    <span className="text-[10px] text-red-400 font-bold block">
                      −{litrosMastitis.toFixed(1)} L descarte (Mastitis)
                    </span>
                  )}
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-0.5">
                  <span className="text-slate-400 text-[10px] uppercase block">Destino Asignado</span>
                  <div className="font-['Outfit'] font-bold text-lg text-white">
                    {vaqueraDestino === "TANQUE" ? "Al Tanque" : "Venta Directa"}
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    Prom. {promedioPorVaca.toFixed(1)} L/vaca
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-0.5">
                  <span className="text-emerald-400 text-[10px] uppercase block font-bold">Ingreso Proyectado</span>
                  <div className="font-['Outfit'] font-black text-xl text-emerald-400">
                    ${ingresoUSD}
                  </div>
                  {monedasConfig.VES && (
                    <span className="text-[10px] text-emerald-300/80 font-mono block">
                      Bs. {ingresoVES}
                    </span>
                  )}
                  {monedasConfig.COP && (
                    <span className="text-[10px] text-sky-300/80 font-mono block">
                      COP ${Math.round(Number(ingresoUSD) * tasaCOP).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Tabla de Entrada Ultrarrápida por Teclado */}
              <div className="flex-1 overflow-y-auto max-h-72 rounded-2xl border border-white/10 bg-slate-900/60">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-900 border-b border-white/10 text-slate-400 text-[11px] uppercase font-bold z-10">
                    <tr>
                      <th className="p-3 w-12 text-center">#</th>
                      <th className="p-3">Arete / Vaca</th>
                      {(vaqueraTurno === "MANANA" || vaqueraTurno === "DOBLE") && (
                        <th className="p-3 w-28">Litros AM</th>
                      )}
                      {(vaqueraTurno === "TARDE" || vaqueraTurno === "DOBLE") && (
                        <th className="p-3 w-28">Litros PM</th>
                      )}
                      <th className="p-3 w-24">Total</th>
                      <th className="p-3 w-36">Estatus de Ubre</th>
                      <th className="p-3">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {vaqueraFilas.map((fila, idx) => {
                      const totalFila = (Number(fila.litrosManana) || 0) + (Number(fila.litrosTarde) || 0);
                      const esMastitis = fila.estado === "MASTITIS";
                      const esCalostro = fila.estado === "CALOSTRO";

                      return (
                        <tr
                          key={fila.animalId || idx}
                          className={`transition-colors ${
                            esMastitis
                              ? "bg-red-500/10 hover:bg-red-500/15"
                              : esCalostro
                              ? "bg-amber-500/10 hover:bg-amber-500/15"
                              : "hover:bg-white/5"
                          }`}>
                          <td className="p-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                          
                          <td className="p-3">
                            <div className="font-bold text-white flex items-center gap-2">
                              <span className="font-mono text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                                {fila.arete}
                              </span>
                              <span>{fila.nombre}</span>
                            </div>
                          </td>

                          {(vaqueraTurno === "MANANA" || vaqueraTurno === "DOBLE") && (
                            <td className="p-2">
                              <input
                                id={`vaquera-input-am-${idx}`}
                                type="number"
                                onFocus={e => e.target.select()}
                                step="0.1"
                                placeholder="0.0"
                                value={fila.litrosManana}
                                onChange={e => {
                                  const val = e.target.value;
                                  setVaqueraFilas(prev => prev.map((f, i) => i === idx ? { ...f, litrosManana: val } : f));
                                }}
                                onKeyDown={e => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    const nextInput = document.getElementById(
                                      vaqueraTurno === "DOBLE"
                                        ? `vaquera-input-pm-${idx}`
                                        : `vaquera-input-am-${idx + 1}`
                                    );
                                    if (nextInput) nextInput.focus();
                                  }
                                }}
                                className="w-full p-2 rounded-xl bg-slate-950 border border-white/20 focus:border-emerald-400 focus:bg-emerald-950/20 text-white font-mono font-bold text-sm text-center outline-none transition-all shadow-inner"
                              />
                            </td>
                          )}

                          {(vaqueraTurno === "TARDE" || vaqueraTurno === "DOBLE") && (
                            <td className="p-2">
                              <input
                                id={`vaquera-input-pm-${idx}`}
                                type="number"
                                onFocus={e => e.target.select()}
                                step="0.1"
                                placeholder="0.0"
                                value={fila.litrosTarde}
                                onChange={e => {
                                  const val = e.target.value;
                                  setVaqueraFilas(prev => prev.map((f, i) => i === idx ? { ...f, litrosTarde: val } : f));
                                }}
                                onKeyDown={e => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    const nextInput = document.getElementById(`vaquera-input-am-${idx + 1}`);
                                    if (nextInput) nextInput.focus();
                                  }
                                }}
                                className="w-full p-2 rounded-xl bg-slate-950 border border-white/20 focus:border-emerald-400 focus:bg-emerald-950/20 text-white font-mono font-bold text-sm text-center outline-none transition-all shadow-inner"
                              />
                            </td>
                          )}

                          <td className="p-3 font-mono font-black text-sm text-white">
                            {totalFila > 0 ? `${totalFila.toFixed(1)} L` : "-"}
                          </td>

                          <td className="p-2">
                            <select
                              value={fila.estado}
                              onChange={e => {
                                const nuevoEstado = e.target.value as any;
                                setVaqueraFilas(prev => prev.map((f, i) => i === idx ? { ...f, estado: nuevoEstado } : f));
                              }}
                              className={`w-full p-1.5 rounded-xl border text-xs font-bold ${
                                esMastitis
                                  ? "bg-red-500/20 border-red-500 text-red-400"
                                  : esCalostro
                                  ? "bg-amber-500/20 border-amber-500 text-amber-400"
                                  : "bg-slate-900 border-white/15 text-slate-300"
                              }`}>
                              <option value="NORMAL">Normal</option>
                              <option value="MASTITIS">Mastitis (Descarte)</option>
                              <option value="CALOSTRO">Calostro (Cría)</option>
                              <option value="SECA">Vaca Seca</option>
                            </select>
                          </td>

                          <td className="p-2">
                            <input
                              type="text"
                              placeholder="Observación..."
                              value={fila.notas}
                              onChange={e => {
                                const val = e.target.value;
                                setVaqueraFilas(prev => prev.map((f, i) => i === idx ? { ...f, notas: val } : f));
                              }}
                              className="w-full p-1.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Barra de Acciones del Modal */}
              <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const idNuevo = Date.now();
                    setVaqueraFilas(prev => [
                      ...prev,
                      {
                        animalId: idNuevo,
                        arete: `V-${prev.length + 101}`,
                        nombre: `Vaca ${prev.length + 1}`,
                        litrosManana: "",
                        litrosTarde: "",
                        estado: "NORMAL",
                        notas: "",
                      }
                    ]);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold cursor-pointer">
                  + Agregar Fila de Vaca
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setModalVaqueraRapida(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-bold cursor-pointer">
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={guardarJornadaVaquera}
                    className="btn-cyber-neon text-white font-black text-xs px-6 py-2.5 rounded-xl shadow-lg hover:scale-105 cursor-pointer transition-all">
                    Guardar Jornada ({litrosComerciales.toFixed(1)} L • ${ingresoUSD})
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ── MODAL: REGISTRAR GASTO OPERATIVO DEL HATO ── */}
      {modalGasto && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in font-['Inter']">
          <div className="apple-glass modal-siempre-oscuro rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-emerald-500/40 text-left space-y-4 shadow-2xl bg-slate-900/95 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <span className="text-emerald-400"><IconCoins size={24} /></span>
                <div>
                  <h3 className="font-['Outfit'] font-black text-lg text-white">
                    Registrar Gasto Operativo
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Egreso de caja para insumos, alimentación, veterinario o jornales
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalGasto(false)}
                className="text-slate-400 hover:text-white text-lg p-1 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarGasto} className="space-y-4 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
                  Categoría del Gasto *
                </label>
                <select
                  value={formGasto.categoria}
                  onChange={e => setFormGasto({ ...formGasto, categoria: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-white/15 text-white text-xs focus:border-emerald-500 focus:outline-none"
                >
                  {CATEGORIAS_GASTO_GANADERIA.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
                  Descripción Detallada *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 10 sacos de sal mineralizada y 2 tambores de melaza..."
                  value={formGasto.descripcion}
                  onChange={e => setFormGasto({ ...formGasto, descripcion: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-white/15 text-white text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
                    Monto en Dólares (USD) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-emerald-400 font-bold">$</span>
                    <input
                      type="number"
                      onFocus={e => e.target.select()}
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={formGasto.monto}
                      onChange={e => setFormGasto({ ...formGasto, monto: e.target.value })}
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-800 border border-white/15 text-emerald-400 font-mono font-bold text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
                    Fecha del Gasto *
                  </label>
                  <input
                    type="date"
                    required
                    value={formGasto.fecha}
                    onChange={e => setFormGasto({ ...formGasto, fecha: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-white/15 text-white font-mono text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Conversión en vivo a monedas activas */}
              {Number(formGasto.monto) > 0 && (monedasConfig.VES || monedasConfig.COP) && (
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1 text-[11px]">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Equivalencia al cambio actual:</span>
                  {monedasConfig.VES && (
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Bolívares (Tasa {tasaBCV.toFixed(2)}):</span>
                      <span className="font-mono font-bold text-emerald-300">
                        Bs. {(Number(formGasto.monto) * tasaBCV).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {monedasConfig.COP && (
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Pesos Colombianos (Tasa {tasaCOP}):</span>
                      <span className="font-mono font-bold text-sky-300">
                        COP ${Math.round(Number(formGasto.monto) * tasaCOP).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalGasto(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold cursor-pointer">
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl btn-cyber-neon text-white text-xs font-bold shadow-lg transition-all cursor-pointer flex items-center gap-1.5">
                  <span>Guardar Gasto Operativo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
