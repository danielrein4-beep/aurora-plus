import { useState, useEffect } from "react";
import AuroraLogo from "../AuroraLogo";
import {
  IconFarm, IconCheckCircle, IconClose, IconDownload, IconFileText,
  IconCalendar, IconCard, IconCustomize, IconRocket, IconChart,
  IconPrescription, IconUsers, IconHourglass
} from "../Icons";
import GanaderiaMapa from "./GanaderiaMapa";
import { useAuth } from "../context/AuthContext";
import * as XLSX from "xlsx";
import {
  listarAnimalesGanaderia, crearAnimalGanaderia,
  listarPotrerosGanaderia, crearPotreroGanaderia, rotarPotreroGanaderia,
  registrarOrdenoGanaderia, obtenerReporteOrdenoGanaderia,
  registrarPesoGanaderia, obtenerGdpGanaderia,
  listarVacunasGanaderia, aplicarVacunaGanaderia,
  obtenerAlertasGanaderia, registrarEventoReproductivoGanaderia,
  type AnimalGanaderia, type PotreroGanaderia, type RegistroOrdenoGanaderia,
  type TableroAlertasGanaderia, type VacunaGanaderia
} from "../api";

interface Props {
  onSalir: () => void;
}

// Datos de demostración de alto realismo para cuando el backend está sin datos o en carga
const DEMO_POTREROS: PotreroGanaderia[] = [
  { id: 101, tenantId: 1, codigo: "POT-01", nombre: "Potrero 1 - El Roble", areaHectareas: 14.5, capacidadAnimales: 25, tipoPasto: "Brachiaria decumbens", color: "#10B981", diasDescansoMinimo: 28, estado: "ACTIVO", ordenRotacion: 1, observaciones: "Cerca viva de matarratón, agua de morichal." },
  { id: 102, tenantId: 1, codigo: "POT-02", nombre: "Potrero 2 - Los Samanes", areaHectareas: 18.0, capacidadAnimales: 32, tipoPasto: "Guinea Mombaza", color: "#F59E0B", diasDescansoMinimo: 35, estado: "EN_DESCANSO", ordenRotacion: 2, fechaInicioDescanso: "2026-09-01", observaciones: "Sombra natural abundante, descanso de 10 días." },
  { id: 103, tenantId: 1, codigo: "POT-03", nombre: "Potrero 3 - La Vega", areaHectareas: 12.0, capacidadAnimales: 20, tipoPasto: "Estrella Africana", color: "#3B82F6", diasDescansoMinimo: 24, estado: "EN_DESCANSO", ordenRotacion: 3, fechaInicioDescanso: "2026-09-05", observaciones: "Borde de río, drenaje rápido." },
  { id: 104, tenantId: 1, codigo: "POT-04", nombre: "Potrero 4 - Maternidad", areaHectareas: 6.5, capacidadAnimales: 10, tipoPasto: "Pasto Mulato II", color: "#8B5CF6", diasDescansoMinimo: 21, estado: "ACTIVO", ordenRotacion: 4, observaciones: "Junto a la vaquera para monitoreo 24/7." }
];

const DEMO_ANIMALES: AnimalGanaderia[] = [
  { id: 201, tenantId: 1, arete: "V-042", nombre: "Mariposa", especie: "BOVINO", raza: "Gyr Lechero", sexo: "HEMBRA", tipoAnimal: "VACA", fechaNacimiento: "2021-04-12", pesoActual: 465, estado: "ACTIVO", potrero: DEMO_POTREROS[0], valorEstimado: 1200 },
  { id: 202, tenantId: 1, arete: "V-089", nombre: "Lucero", especie: "BOVINO", raza: "Jersey", sexo: "HEMBRA", tipoAnimal: "VACA", fechaNacimiento: "2022-01-20", pesoActual: 420, estado: "ACTIVO", potrero: DEMO_POTREROS[0], valorEstimado: 1350 },
  { id: 203, tenantId: 1, arete: "T-015", nombre: "Diamante", especie: "BOVINO", raza: "Brahman Blanco", sexo: "MACHO", tipoAnimal: "TORO", fechaNacimiento: "2020-08-15", pesoActual: 820, estado: "ACTIVO", potrero: DEMO_POTREROS[0], valorEstimado: 2800 },
  { id: 204, tenantId: 1, arete: "N-104", nombre: "Esperanza", especie: "BOVINO", raza: "F1 Girolando", sexo: "HEMBRA", tipoAnimal: "NOVILLA", fechaNacimiento: "2024-03-10", pesoActual: 330, estado: "ACTIVO", potrero: DEMO_POTREROS[3], valorEstimado: 850 },
  { id: 205, tenantId: 1, arete: "C-205", nombre: "Relámpago", especie: "BOVINO", raza: "Gyr x Holstein", sexo: "MACHO", tipoAnimal: "TERNERO", fechaNacimiento: "2026-06-02", pesoActual: 98, estado: "ACTIVO", potrero: DEMO_POTREROS[3], valorEstimado: 400 },
  { id: 206, tenantId: 1, arete: "M-112", nombre: "Bandera", especie: "BOVINO", raza: "Carora", sexo: "HEMBRA", tipoAnimal: "MAUTA", fechaNacimiento: "2025-02-14", pesoActual: 240, estado: "ACTIVO", potrero: DEMO_POTREROS[0], valorEstimado: 650 },
  { id: 207, tenantId: 1, arete: "NV-08", nombre: "Barcino", especie: "BOVINO", raza: "Brahman Rojo", sexo: "MACHO", tipoAnimal: "NOVILLO", fechaNacimiento: "2023-11-05", pesoActual: 510, estado: "ACTIVO", potrero: DEMO_POTREROS[0], valorEstimado: 1100 },
  { id: 208, tenantId: 1, arete: "B-031", nombre: "Canela", especie: "BOVINO", raza: "Senepol", sexo: "HEMBRA", tipoAnimal: "BECERRA", fechaNacimiento: "2026-05-18", pesoActual: 85, estado: "ACTIVO", potrero: DEMO_POTREROS[3], valorEstimado: 380 },
];

const DEMO_ORDENOS: RegistroOrdenoGanaderia[] = [
  { id: 301, tenantId: 1, animal: DEMO_ANIMALES[0], fecha: "2026-09-11", turno: "MANANA", cantidadLitros: 14.5, precioVentaLitro: 0.55, montoVenta: 7.97, porcentajeGrasa: 3.8, porcentajeProteina: 3.2 },
  { id: 302, tenantId: 1, animal: DEMO_ANIMALES[1], fecha: "2026-09-11", turno: "MANANA", cantidadLitros: 16.2, precioVentaLitro: 0.55, montoVenta: 8.91, porcentajeGrasa: 4.4, porcentajeProteina: 3.5 },
  { id: 303, tenantId: 1, animal: DEMO_ANIMALES[0], fecha: "2026-09-10", turno: "TARDE", cantidadLitros: 9.8, precioVentaLitro: 0.55, montoVenta: 5.39, porcentajeGrasa: 3.9, porcentajeProteina: 3.1 },
];

export default function GanaderiaApp({ onSalir }: Props) {
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

  const [modalEditarTasas, setModalEditarTasas] = useState(false);

  const guardarTasas = (nuevaBcv: number, nuevaCop: number) => {
    setTasaBCV(nuevaBcv);
    setTasaCOP(nuevaCop);
    setVaqueraTasaVES(nuevaBcv);
    try {
      localStorage.setItem("aurora_ganaderia_tasa_bcv", String(nuevaBcv));
      localStorage.setItem("aurora_ganaderia_tasa_cop", String(nuevaCop));
    } catch {}
    setModalEditarTasas(false);
  };

  // Pestaña principal activa
  const [tab, setTab] = useState<"resumen" | "potreros" | "inventario" | "eventos" | "produccion" | "reportes">("resumen");

  // Sub-vistas por pestaña
  const [subPotreros, setSubPotreros] = useState<"mapa" | "lista">("mapa");
  const [subInventario, setSubInventario] = useState<"matriz" | "fichas" | "distribucion">("matriz");

  // Estados de datos
  const [animales, setAnimales] = useState<AnimalGanaderia[]>(DEMO_ANIMALES);
  const [potreros, setPotreros] = useState<PotreroGanaderia[]>(DEMO_POTREROS);
  const [ordenos, setOrdenos] = useState<RegistroOrdenoGanaderia[]>(DEMO_ORDENOS);
  const [vacunas, setVacunas] = useState<VacunaGanaderia[]>([]);
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
  const [modalFichaAnimal, setModalFichaAnimal] = useState<AnimalGanaderia | null>(null);
  const [modalEventoGenerico, setModalEventoGenerico] = useState<{ tipo: string; titulo: string; descripcion: string } | null>(null);

  // Formulario nuevo animal
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
    potreroId: DEMO_POTREROS[0]?.id || 101,
  });

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
  const [potreroDestinoId, setPotreroDestinoId] = useState<number>(DEMO_POTREROS[1]?.id || 102);

  // Formulario ordeño rápido
  const [formOrdeno, setFormOrdeno] = useState({
    animalId: DEMO_ANIMALES[0]?.id || 201,
    turno: "MANANA",
    cantidadLitros: 12.5,
    precioVentaLitro: 0.55,
    porcentajeGrasa: 3.8,
    porcentajeProteina: 3.2,
  });

  // Formulario pesaje
  const [pesoNuevo, setPesoNuevo] = useState<number>(400);
  const [gdpData, setGdpData] = useState<any>(null);

  // Formulario vacunación
  const [formVacuna, setFormVacuna] = useState({
    animalId: DEMO_ANIMALES[0]?.id || 201,
    vacunaId: 1,
    nombreVacuna: "Fiebre Aftosa / Rabia",
    lote: "L-2026-98",
    veterinario: "Dr. Mendoza MV",
    costo: 3.5,
  });

  // Formulario reproducción
  const [formRepro, setFormRepro] = useState({
    hembraId: DEMO_ANIMALES[0]?.id || 201,
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
  }, [tenantId]);

  const cargarDatos = async () => {
    try {
      const [resAnimales, resPotreros, resVacunas, resAlertas] = await Promise.allSettled([
        listarAnimalesGanaderia(),
        listarPotrerosGanaderia(),
        listarVacunasGanaderia(),
        obtenerAlertasGanaderia(tenantId, 30),
      ]);

      if (resAnimales.status === "fulfilled" && resAnimales.value?.length > 0) {
        setAnimales(resAnimales.value);
      }
      if (resPotreros.status === "fulfilled" && resPotreros.value?.length > 0) {
        setPotreros(resPotreros.value);
      }
      if (resVacunas.status === "fulfilled" && resVacunas.value?.length > 0) {
        setVacunas(resVacunas.value);
      }
      if (resAlertas.status === "fulfilled" && resAlertas.value) {
        setAlertas(resAlertas.value);
      }

      const hoy = new Date().toISOString().slice(0, 10);
      const hace30d = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      try {
        const repOrdeno = await obtenerReporteOrdenoGanaderia(tenantId, hace30d, hoy);
        if (repOrdeno?.registros?.length > 0) {
          setOrdenos(repOrdeno.registros);
        }
      } catch {}
    } catch (err) {
      console.warn("Usando catálogo optimista de demostración mientras se conecta el backend:", err);
    }
  };

  // Métricas calculadas
  const totalAnimales = animales.length;
  const vacasOrdeno = animales.filter(a => a.tipoAnimal === "VACA" && a.sexo === "HEMBRA").length;
  const totalHectareas = potreros.reduce((sum, p) => sum + (Number(p.areaHectareas) || 0), 0);
  const cargaAnimalHa = totalHectareas > 0 ? (totalAnimales / totalHectareas).toFixed(2) : "0.00";
  const litrosHoy = ordenos
    .filter(o => o.fecha === new Date().toISOString().slice(0, 10))
    .reduce((sum, o) => sum + (Number(o.cantidadLitros) || 0), 0);
  const ingresosLecheHoy = litrosHoy * 0.55;

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
    count: animales.filter(cat.filter).length,
    pesoPromedio: Math.round(
      animales.filter(cat.filter).reduce((sum, a) => sum + (a.pesoActual || 0), 0) /
      Math.max(1, animales.filter(cat.filter).length)
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

  // Manejador: Crear nuevo animal
  const handleGuardarAnimal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAnimal.arete.trim()) return;

    try {
      const nuevo = await crearAnimalGanaderia(tenantId, formAnimal);
      setAnimales(prev => [nuevo, ...prev]);
      notificar(`Animal arete ${nuevo.arete} registrado con éxito en el hato.`);
    } catch {
      notificar(`⚠️ No se pudo registrar el animal arete ${formAnimal.arete} — revisa tu conexión e inténtalo de nuevo.`);
      return;
    }

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
      potreroId: potreros[0]?.id || 101,
    });
  };

  // Manejador: Crear nuevo potrero con color
  const handleGuardarPotrero = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPotrero.nombre.trim()) return;

    const nuevo: PotreroGanaderia = {
      id: Date.now(),
      tenantId,
      codigo: formPotrero.codigo,
      nombre: formPotrero.nombre,
      areaHectareas: Number(formPotrero.areaHectareas),
      capacidadAnimales: Number(formPotrero.capacidadAnimales),
      tipoPasto: formPotrero.tipoPasto,
      color: formPotrero.color,
      diasDescansoMinimo: Number(formPotrero.diasDescansoMinimo),
      observaciones: formPotrero.observaciones,
      poligono: formPotrero.poligono,
      estado: "ACTIVO",
      ordenRotacion: potreros.length + 1,
    };

    try {
      await crearPotreroGanaderia(tenantId, nuevo);
    } catch {
      notificar(`⚠️ No se pudo guardar el potrero ${nuevo.nombre} — revisa tu conexión e inténtalo de nuevo.`);
      return;
    }

    setPotreros(prev => [...prev, nuevo]);
    notificar(`Potrero ${nuevo.nombre} (${nuevo.areaHectareas} ha) guardado en el mapa satelital.`);
    setModalNuevoPotrero(false);
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
    setModalNuevoPotrero(true);
    notificar(`Potrero trazado con ${datos.hectareas} ha. Completa los datos para guardarlo.`);
  };

  // Abrir Modo Vaquera Rápida (Bulk Entry de Ordeño)
  const abrirVaqueraRapida = () => {
    const vacas = animales.filter(a => a.sexo === "HEMBRA" && (a.tipoAnimal === "VACA" || a.tipoAnimal === "NOVILLA"));
    const vacasBase = vacas.length > 0 ? vacas : [
      { id: 201, arete: "V-402", nombre: "Mariposa", tipoAnimal: "VACA", sexo: "HEMBRA" },
      { id: 202, arete: "V-115", nombre: "Lucero", tipoAnimal: "VACA", sexo: "HEMBRA" },
      { id: 203, arete: "V-089", nombre: "Esperanza", tipoAnimal: "VACA", sexo: "HEMBRA" },
      { id: 204, arete: "V-210", nombre: "Canela", tipoAnimal: "VACA", sexo: "HEMBRA" },
      { id: 205, arete: "V-305", nombre: "Barinesa", tipoAnimal: "VACA", sexo: "HEMBRA" },
    ];

    const filas = vacasBase.map((v, i) => ({
      animalId: v.id,
      arete: v.arete,
      nombre: v.nombre || `Vaca ${v.arete}`,
      litrosManana: i === 0 ? 11.5 : i === 1 ? 9.0 : i === 2 ? 8.5 : i === 3 ? 12.0 : 10.0,
      litrosTarde: "",
      estado: "NORMAL" as const,
      notas: "",
    }));

    setVaqueraFilas(filas);
    setModalVaqueraRapida(true);
  };

  // Guardar Jornada de Ordeño en Lote desde Modo Vaquera Rápida
  const guardarJornadaVaquera = () => {
    const filasValidas = vaqueraFilas.filter(f => Number(f.litrosManana) > 0 || Number(f.litrosTarde) > 0);
    if (filasValidas.length === 0) {
      notificar("No se ingresaron litros en ninguna vaca.");
      return;
    }

    const nuevosOrdenos: RegistroOrdenoGanaderia[] = [];
    let mastitisCount = 0;

    filasValidas.forEach(f => {
      const litrosTotales = (Number(f.litrosManana) || 0) + (Number(f.litrosTarde) || 0);
      const esComercial = f.estado !== "MASTITIS";
      if (f.estado === "MASTITIS") mastitisCount++;

      const animalObj = animales.find(a => a.id === f.animalId) || ({
        id: f.animalId,
        tenantId,
        arete: f.arete,
        nombre: f.nombre,
        tipoAnimal: "VACA",
        sexo: "HEMBRA",
      } as AnimalGanaderia);

      nuevosOrdenos.push({
        id: Date.now() + Math.floor(Math.random() * 1000),
        tenantId,
        animal: animalObj,
        fecha: vaqueraFecha,
        turno: vaqueraTurno === "DOBLE" ? "MANANA" : vaqueraTurno,
        cantidadLitros: litrosTotales,
        precioVentaLitro: vaqueraPrecioUSD,
        montoVenta: esComercial ? Number((litrosTotales * vaqueraPrecioUSD).toFixed(2)) : 0,
        porcentajeGrasa: 3.8,
        porcentajeProteina: 3.2,
      });
    });

    setOrdenos(prev => [...nuevosOrdenos, ...prev]);
    setModalVaqueraRapida(false);

    const litrosComerciales = nuevosOrdenos.reduce((s, o) => s + (Number(o.montoVenta) > 0 ? o.cantidadLitros : 0), 0);
    const ingresoUSD = (litrosComerciales * vaqueraPrecioUSD).toFixed(2);
    const ingresoBs = (litrosComerciales * vaqueraPrecioUSD * vaqueraTasaVES).toFixed(2);

    if (mastitisCount > 0) {
      notificar(`Jornada guardada: ${litrosComerciales.toFixed(1)} L comerciales ($${ingresoUSD} / Bs. ${ingresoBs}). ¡Atención! ${mastitisCount} vaca(s) aislada(s) con Mastitis.`);
    } else {
      notificar(`Jornada registrada: ${litrosComerciales.toFixed(1)} L recolectados ($${ingresoUSD} USD / Bs. ${ingresoBs}).`);
    }
  };

  // Manejador: Rotar potrero
  const handleEjecutarRotacion = async () => {
    if (!modalRotar) return;
    try {
      await rotarPotreroGanaderia(modalRotar.id, tenantId, potreroDestinoId);
    } catch {
      notificar(`⚠️ No se pudo rotar el hato de ${modalRotar.nombre} — revisa tu conexión e inténtalo de nuevo.`);
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

  // Manejador: Registrar ordeño
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
      });
      setOrdenos(prev => [nuevoReg, ...prev]);
    } catch {
      notificar(`⚠️ No se pudo registrar el ordeño de ${animalSeleccionado.nombre || animalSeleccionado.arete} — revisa tu conexión e inténtalo de nuevo.`);
      return;
    }

    notificar(`${formOrdeno.cantidadLitros} L registrados para ${animalSeleccionado.nombre || animalSeleccionado.arete}.`);
    setModalOrdeno(false);
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
      notificar(`⚠️ No se pudo registrar el pesaje — revisa tu conexión e inténtalo de nuevo.`);
      return;
    }

    setAnimales(prev => prev.map(a => a.id === modalPesaje.id ? { ...a, pesoActual: Number(pesoNuevo) } : a));
    notificar(`Pesaje registrado: ${pesoNuevo} kg.`);
    setTimeout(() => {
      setModalPesaje(null);
      setGdpData(null);
    }, 1500);
  };

  // Manejador: Aplicar vacuna
  const handleGuardarVacuna = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await aplicarVacunaGanaderia(tenantId, {
        animalId: Number(formVacuna.animalId),
        vacunaId: Number(formVacuna.vacunaId),
        fechaAplicacion: new Date().toISOString().slice(0, 10),
        lote: formVacuna.lote,
        veterinarioResponsable: formVacuna.veterinario,
        costo: Number(formVacuna.costo),
      });
    } catch {
      notificar(`⚠️ No se pudo registrar el tratamiento sanitario — revisa tu conexión e inténtalo de nuevo.`);
      return;
    }
    notificar(`Tratamiento sanitario aplicado con éxito.`);
    setModalVacuna(false);
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
      notificar(`⚠️ No se pudo registrar el evento reproductivo — revisa tu conexión e inténtalo de nuevo.`);
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
      
      {/* Notificación Flotante */}
      {notificacion && (
        <div className="fixed top-5 right-5 z-50 apple-glass px-5 py-3 rounded-2xl border border-emerald-500/50 shadow-2xl text-emerald-600 dark:text-emerald-300 text-xs font-bold flex items-center gap-3 animate-fade-in">
          <IconCheckCircle size={18} />
          <span>{notificacion}</span>
        </div>
      )}

      {/* ── HEADER SUPERIOR DEL CENTRO AGROPECUARIO: APPLE GLASS ── */}
      <header className="nav-glass border-b border-slate-300/60 dark:border-white/10 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40 backdrop-blur-2xl">
        <div className="flex items-center gap-3.5">
          <div className="p-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <IconFarm size={26} />
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

        {/* Barra de Tasas Multi-Moneda (Editable con 1 clic) */}
        <button
          type="button"
          onClick={() => setModalEditarTasas(true)}
          title="Haga clic para actualizar las tasas de cambio a mano"
          className="flex items-center gap-2 apple-glass-pill rounded-full px-3.5 py-1.5 border border-slate-300/80 dark:border-white/15 text-[11px] hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all cursor-pointer group shadow-sm"
        >
          <span className="text-slate-500 dark:text-white/40 font-medium flex items-center gap-1">
            <span>Tasas:</span>
          </span>
          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">1$ = Bs. {tasaBCV.toFixed(2)}</span>
          <span className="text-slate-400 dark:text-white/20">•</span>
          <span className="font-mono font-bold text-sky-600 dark:text-sky-400">{tasaCOP.toLocaleString()} COP</span>
          <span className="text-[11px] opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all">✏️</span>
        </button>

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
                  <div className="text-[10px] text-slate-400 dark:text-white/40">${ingresosLecheHoy.toFixed(2)} USD • Bs. {(ingresosLecheHoy * tasaBCV).toFixed(2)}</div>
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

            {/* Cuadrícula Inferior: Alertas Sanitarias & Potreros Activos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Alertas del Hato */}
              <div className="apple-glass rounded-3xl p-6 border border-white/10 space-y-4 text-left">
                <div className="flex items-center justify-between">
                  <h3 className="font-['Outfit'] font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <IconHourglass size={16} />
                    <span>Alertas Sanitarias & Reproductivas</span>
                  </h3>
                  <span className="text-xs font-bold text-emerald-500 dark:text-emerald-400">Próximos 30 días</span>
                </div>

                <div className="space-y-2.5">
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">Refuerzo Vacuna Antiaftosa Pendiente</div>
                      <div className="text-slate-500 dark:text-white/50 text-[11px] mt-0.5">Lote de 8 novillas en Potrero Maternidad. Vence en 5 días.</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">Parto Estimado: Vaca V-042 (Mariposa)</div>
                      <div className="text-slate-500 dark:text-white/50 text-[11px] mt-0.5">Fecha probable de parto: 28 de Septiembre 2026. Preparar corral de maternidad.</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">Carencia y Retiro en Leche al 100% Libre</div>
                      <div className="text-slate-500 dark:text-white/50 text-[11px] mt-0.5">Ningún animal en ordeño presenta restricciones de despacho actualmente.</div>
                    </div>
                  </div>
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
                  onClick={() => setModalNuevoPotrero(true)}
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
                onCrearPotrero={() => setModalNuevoPotrero(true)}
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
                      <span className="font-mono font-bold text-sky-400 text-base">{vacasOrdeno}</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">Hembras Gestantes Confirmadas</span>
                      <span className="font-mono font-bold text-purple-400 text-base">2</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">Novillos en Fase de Engorde</span>
                      <span className="font-mono font-bold text-amber-400 text-base">
                        {animales.filter(a => a.tipoAnimal === "NOVILLO").length}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">Crías Lactantes en Corral</span>
                      <span className="font-mono font-bold text-emerald-400 text-base">
                        {animales.filter(a => a.tipoAnimal === "TERNERO" || a.tipoAnimal === "BECERRA").length}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            PESTAÑA 4: CENTRO DE EVENTOS (INSPIRADO EN GANSOFT)
        ───────────────────────────────────────────────────────────── */}
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
                    onClick={() => { setModalReproduccion(true); setFormRepro({ ...formRepro, tipo: "PARTO" }); }}
                    className="w-full text-left p-2 rounded-xl hover:bg-white/5 text-slate-700 dark:text-white/80 hover:text-emerald-400 cursor-pointer flex items-center justify-between">
                    <span>• Partos (Alta Cría)</span>
                    <span className="text-[10px] text-slate-400">Registrar →</span>
                  </button>
                  <button
                    onClick={() => setModalEventoGenerico({ tipo: "ABORTO", titulo: "Registro de Aborto / Pérdida", descripcion: "Registra la pérdida gestacional y pasa la hembra a descanso reproductivo." })}
                    className="w-full text-left p-2 rounded-xl hover:bg-white/5 text-slate-700 dark:text-white/80 hover:text-emerald-400 cursor-pointer flex items-center justify-between">
                    <span>• Abortos & Pérdidas</span>
                    <span className="text-[10px] text-slate-400">Registrar →</span>
                  </button>
                  <button
                    onClick={() => setModalEventoGenerico({ tipo: "CELO", titulo: "Detección de Celo", descripcion: "Registra el celo natural o inducido para programar inseminación en 12 horas." })}
                    className="w-full text-left p-2 rounded-xl hover:bg-white/5 text-slate-700 dark:text-white/80 hover:text-emerald-400 cursor-pointer flex items-center justify-between">
                    <span>• Celos & Sincronización</span>
                    <span className="text-[10px] text-slate-400">Registrar →</span>
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
                    onClick={() => setModalEventoGenerico({ tipo: "SECADO", titulo: "Secado de Vaca", descripcion: "Pasa la hembra a período seco 60 días antes del parto para recuperación de ubre." })}
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
                    onClick={() => setModalNuevoAnimal(true)}
                    className="w-full text-left p-2 rounded-xl hover:bg-white/5 text-slate-700 dark:text-white/80 hover:text-emerald-400 cursor-pointer flex items-center justify-between">
                    <span>• Alta de Animales</span>
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
                    onClick={() => setModalEventoGenerico({ tipo: "MASTITIS", titulo: "Control de Mastitis", descripcion: "Registro de prueba de California Mastitis Test (CMT) y tratamiento antibiótico intramamario." })}
                    className="w-full text-left p-2 rounded-xl hover:bg-white/5 text-slate-700 dark:text-white/80 hover:text-emerald-400 cursor-pointer flex items-center justify-between">
                    <span>• Mastitis / Prueba CMT</span>
                    <span className="text-[10px] text-slate-400">Registrar →</span>
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
                    onClick={() => setModalNuevoPotrero(true)}
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
                    onClick={() => setModalEventoGenerico({ tipo: "AFORO", titulo: "Aforo de Pastura", descripcion: "Pesaje de metro cuadrado de forraje verde para calcular disponibilidad de materia seca." })}
                    className="w-full text-left p-2 rounded-xl hover:bg-white/5 text-slate-700 dark:text-white/80 hover:text-emerald-400 cursor-pointer flex items-center justify-between">
                    <span>• Aforos & Planificación</span>
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
                    onClick={() => setModalEventoGenerico({ tipo: "COMPRA", titulo: "Ingreso por Compra", descripcion: "Registro de lote adquirido en subasta o compra directa con guía de traslado." })}
                    className="w-full text-left p-2 rounded-xl hover:bg-white/5 text-slate-700 dark:text-white/80 hover:text-emerald-400 cursor-pointer flex items-center justify-between">
                    <span>• Compras de Ganado</span>
                    <span className="text-[10px] text-slate-400">Ingresar →</span>
                  </button>
                  <button
                    onClick={() => setModalEventoGenerico({ tipo: "VENTA", titulo: "Despacho por Venta", descripcion: "Salida de ganado para beneficio o cría con liquidación en báscula." })}
                    className="w-full text-left p-2 rounded-xl hover:bg-white/5 text-slate-700 dark:text-white/80 hover:text-emerald-400 cursor-pointer flex items-center justify-between">
                    <span>• Venta / Beneficio</span>
                    <span className="text-[10px] text-slate-400">Despachar →</span>
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
                <div className="text-[11px] text-slate-500 dark:text-white/40">En {ordenos.length} ordeños</div>
              </div>

              <div className="apple-glass rounded-2xl p-5 border border-white/10 text-left space-y-1">
                <div className="text-xs text-slate-400 font-medium">Ingresos Estimados (USD)</div>
                <div className="font-['Outfit'] font-black text-3xl text-emerald-500 dark:text-emerald-400">
                  ${ordenos.reduce((sum, o) => sum + (Number(o.montoVenta) || 0), 0).toFixed(2)}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-white/40">A razón de $0.55 / Litro</div>
              </div>

              <div className="apple-glass rounded-2xl p-5 border border-white/10 text-left space-y-1">
                <div className="text-xs text-slate-400 font-medium">Equivalente en Moneda Local</div>
                <div className="font-['Outfit'] font-black text-3xl text-purple-500 dark:text-purple-400">
                  Bs. {(ordenos.reduce((sum, o) => sum + (Number(o.montoVenta) || 0), 0) * tasaBCV).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-white/40 flex items-center justify-between">
                  <span>Tasa Bs: {tasaBCV.toFixed(2)}</span>
                  <button onClick={() => setModalEditarTasas(true)} className="text-purple-400 hover:text-purple-300 font-bold ml-2 underline cursor-pointer">Editar</button>
                </div>
              </div>
            </div>

            {/* Tabla de Registros */}
            <div className="overflow-x-auto rounded-3xl border border-slate-200/80 dark:border-white/10 apple-glass">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/50 border-b border-slate-200/80 dark:border-white/10">
                  <tr>
                    <th className="p-4">Fecha</th>
                    <th className="p-4">Arete / Animal</th>
                    <th className="p-4">Turno</th>
                    <th className="p-4">Litros</th>
                    <th className="p-4">% Grasa / Prot.</th>
                    <th className="p-4">Monto USD</th>
                    <th className="p-4 text-right">Monto Bs.</th>
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
                      <td className="p-4 font-bold text-sky-500 text-sm">{o.cantidadLitros} L</td>
                      <td className="p-4 text-slate-400">{o.porcentajeGrasa || 3.8}% / {o.porcentajeProteina || 3.2}%</td>
                      <td className="p-4 font-bold text-emerald-500">${Number(o.montoVenta || 0).toFixed(2)}</td>
                      <td className="p-4 text-right font-mono text-slate-500 dark:text-white/70">
                        Bs. {(Number(o.montoVenta || 0) * tasaBCV).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            PESTAÑA 6: CENTRO DE REPORTES (GANSOFT STYLE)
        ───────────────────────────────────────────────────────────── */}
        {tab === "reportes" && (
          <div className="space-y-6 text-left">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
                  Centro de Reportes
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/40">
                  Exportación de informes consolidados para gestión ganadera, técnica y fiscal.
                </p>
              </div>

              <button
                onClick={exportarInventarioXLSX}
                className="btn-cyber-neon text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer">
                Exportar XLSX Consolidado
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              
              {/* Reportes de Gestión */}
              <div className="apple-glass rounded-3xl p-5 border border-white/10 space-y-3">
                <h4 className="font-['Outfit'] font-bold text-sm text-slate-900 dark:text-white pb-2 border-b border-white/10">
                  Gestión del Hato
                </h4>
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
                <h4 className="font-['Outfit'] font-bold text-sm text-slate-900 dark:text-white pb-2 border-b border-white/10">
                  Animales & Vientres
                </h4>
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
                <h4 className="font-['Outfit'] font-bold text-sm text-slate-900 dark:text-white pb-2 border-b border-white/10">
                  Potreros & Pasturas
                </h4>
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
        )}

      </main>

      {/* ── MODAL: ACTUALIZAR TASAS A MANO ── */}
      {modalEditarTasas && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="apple-glass rounded-3xl p-6 sm:p-7 max-w-md w-full border border-emerald-500/40 text-left space-y-5 shadow-2xl bg-slate-900/90 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">💱</span>
                <div>
                  <h3 className="font-['Outfit'] font-black text-lg text-white">
                    Actualizar Tasas de Cambio
                  </h3>
                  <p className="text-[11px] text-slate-400">Ajusta los valores de cambio a mano para la finca</p>
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
                const bcv = parseFloat(String(fd.get("tasaBcv") || "0"));
                const cop = parseFloat(String(fd.get("tasaCop") || "0"));
                if (bcv > 0 && cop > 0) {
                  guardarTasas(bcv, cop);
                }
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="text-[11px] font-bold text-emerald-400 block mb-1">
                  Tasa Bolívares (Bs. por 1 USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-mono font-bold text-xs">Bs.</span>
                  <input
                    name="tasaBcv"
                    type="number"
                    step="0.01"
                    min="0.01"
                    defaultValue={tasaBCV}
                    required
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-800/90 border border-white/15 text-white font-mono text-sm focus:border-emerald-500 focus:outline-none"
                    placeholder="43.50"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Usada para liquidar el ordeño y pagos en moneda local.</p>
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
                    step="1"
                    min="1"
                    defaultValue={tasaCOP}
                    required
                    className="w-full pl-14 pr-3 py-2.5 rounded-xl bg-slate-800/90 border border-white/15 text-white font-mono text-sm focus:border-sky-500 focus:outline-none"
                    placeholder="4150"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Referencia fronteriza para transacciones en efectivo.</p>
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
                  Guardar Tasas
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
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

            <form onSubmit={handleGuardarAnimal} className="space-y-4 text-xs">
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
                    value={formAnimal.raza}
                    onChange={e => setFormAnimal({ ...formAnimal, raza: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Sexo</label>
                  <select
                    value={formAnimal.sexo}
                    onChange={e => setFormAnimal({ ...formAnimal, sexo: e.target.value })}
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
                    <option value="VACA">Vaca</option>
                    <option value="TORO">Toro</option>
                    <option value="NOVILLA">Novilla</option>
                    <option value="MAUTA">Mauta</option>
                    <option value="BECERRA">Becerra</option>
                    <option value="TERNERO">Ternero/a</option>
                    <option value="NOVILLO">Novillo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Peso Inicial (kg)</label>
                  <input
                    type="number"
                    value={formAnimal.pesoActual}
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

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalNuevoAnimal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer">
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-cyber-neon text-white font-bold px-6 py-2 rounded-xl cursor-pointer">
                  Guardar Animal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AGREGAR POTRERO (MEJORADO CON COLOR PICKER GANSOFT) */}
      {modalNuevoPotrero && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
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
                  {animales.filter(a => a.sexo === "HEMBRA").map(a => (
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
                    step="0.01"
                    value={formOrdeno.precioVentaLitro}
                    onChange={e => setFormOrdeno({ ...formOrdeno, precioVentaLitro: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-emerald-400 font-mono font-bold"
                  />
                </div>
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
      {modalPesaje && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
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

      {/* MODAL: VACUNACIÓN */}
      {modalVacuna && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="apple-glass rounded-3xl p-6 sm:p-8 max-w-md w-full border border-emerald-500/30 text-left space-y-4">
            <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
              Aplicar Tratamiento Sanitario
            </h3>
            <form onSubmit={handleGuardarVacuna} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Animal</label>
                <select
                  value={formVacuna.animalId}
                  onChange={e => setFormVacuna({ ...formVacuna, animalId: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white">
                  {animales.map(a => (
                    <option key={a.id} value={a.id}>{a.arete} - {a.nombre || a.tipoAnimal}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Fármaco / Biológico</label>
                <input
                  type="text"
                  value={formVacuna.nombreVacuna}
                  onChange={e => setFormVacuna({ ...formVacuna, nombreVacuna: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Número de Lote</label>
                  <input
                    type="text"
                    value={formVacuna.lote}
                    onChange={e => setFormVacuna({ ...formVacuna, lote: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Costo (USD)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formVacuna.costo}
                    onChange={e => setFormVacuna({ ...formVacuna, costo: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Médico Veterinario</label>
                <input
                  type="text"
                  value={formVacuna.veterinario}
                  onChange={e => setFormVacuna({ ...formVacuna, veterinario: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalVacuna(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer">
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-cyber-neon text-white font-bold px-6 py-2 rounded-xl cursor-pointer">
                  Guardar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REPRODUCCIÓN */}
      {modalReproduccion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
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
                  {animales.filter(a => a.sexo === "HEMBRA").map(a => (
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

      {/* MODAL: EVENTO GENÉRICO DE CAMPO */}
      {modalEventoGenerico && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="apple-glass rounded-3xl p-6 sm:p-8 max-w-md w-full border border-emerald-500/30 text-left space-y-4">
            <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
              {modalEventoGenerico.titulo}
            </h3>
            <p className="text-xs text-slate-500 dark:text-white/60">
              {modalEventoGenerico.descripcion}
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Animal o Lote Afectado</label>
                <select className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white">
                  <option value="">Todo el Lote en Potrero Activo</option>
                  {animales.map(a => (
                    <option key={a.id} value={a.id}>{a.arete} - {a.nombre || a.tipoAnimal}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Notas Técnicas / Diagnóstico</label>
                <textarea
                  rows={3}
                  placeholder="Detalles de la labor o tratamiento aplicado..."
                  className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white resize-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
              <button
                onClick={() => setModalEventoGenerico(null)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer">
                Cancelar
              </button>
              <button
                onClick={() => {
                  notificar(`Evento ${modalEventoGenerico.titulo} guardado exitosamente.`);
                  setModalEventoGenerico(null);
                }}
                className="btn-cyber-neon text-white font-bold px-6 py-2 rounded-xl cursor-pointer">
                Registrar Novedad
              </button>
            </div>
          </div>
        </div>
      )}

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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto">
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs">
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
                  <label className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Precio Leche ($/L)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-emerald-400 font-bold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={vaqueraPrecioUSD}
                      onChange={e => setVaqueraPrecioUSD(Math.max(0, Number(e.target.value)))}
                      className="w-full p-2 pl-7 rounded-xl bg-slate-900 border border-white/15 text-white font-mono font-bold text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Tasa Cambio (Bs.)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-purple-400 font-bold">Bs.</span>
                    <input
                      type="number"
                      step="0.5"
                      value={vaqueraTasaVES}
                      onChange={e => setVaqueraTasaVES(Math.max(1, Number(e.target.value)))}
                      className="w-full p-2 pl-9 rounded-xl bg-slate-900 border border-white/15 text-white font-mono font-bold text-xs"
                    />
                  </div>
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
                  <span className="text-slate-400 text-[10px] uppercase block">Promedio / Vaca</span>
                  <div className="font-['Outfit'] font-bold text-xl text-white">
                    {promedioPorVaca.toFixed(1)} <span className="text-slate-400 text-xs">L/vaca</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-0.5">
                  <span className="text-emerald-400 text-[10px] uppercase block font-bold">Ingreso Proyectado</span>
                  <div className="font-['Outfit'] font-black text-xl text-emerald-400">
                    ${ingresoUSD}
                  </div>
                  <span className="text-[10px] text-emerald-300/80 font-mono block">
                    Bs. {ingresoVES}
                  </span>
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

    </div>
  );
}
