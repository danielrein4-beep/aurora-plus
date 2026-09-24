import { contarSinLeerMercado } from "../api";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import * as XLSX from "xlsx";

import {
  listarAnimalesGanaderia, listarPotrerosGanaderia, rotarPotreroGanaderia, registrarOrdenoGanaderia,
  obtenerReporteOrdenoGanaderia, registrarPesoGanaderia, listarVacunasGanaderia,
  aplicarVacunaGanaderia, obtenerAlertasGanaderia, obtenerAlertasSanitariasGanaderia,
  obtenerStockTanqueLeche, obtenerVentasLecheTanque, listarGastosGanaderia, listarVentasGanaderia,
  type AnimalGanaderia, type PotreroGanaderia, type RegistroOrdenoGanaderia,
  type TableroAlertasGanaderia, type VacunaGanaderia, type AlertaSanitariaGanaderia,
  type TanqueLeche, type VentaLecheTanque, type GastoGanaderia, type VentaGanaderiaResumen,
  listarPrenezActualGanaderia, type PrenezActualGanaderia, descargarConstanciaVacunacionPdf,
  tasaVigente, actualizarTasa,
} from "../api";

import { AuroraGradientDef, IconCheckCircle, IconClose, IconDownload } from "../Icons";
import { useAuth } from "../context/AuthContext";
import { contarPendientesGanaderia, procesarColaGanaderia } from "../offlineQueueGanaderia";

import BitacoraAuditoria from "./BitacoraAuditoria";
import ModalImportarHato from "./ModalImportarHato";
import TenantSoporteWidget from "./TenantSoporteWidget";
import EngordeGanadero from "./EngordeGanadero";
import SociedadesCeba from "./SociedadesCeba";
import { abrirPdf, fechaLocalISO } from "./ReportesCampoGanaderia";

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
import BarraLateralGanaderia from "./ganaderia/BarraLateralGanaderia";
import BarraSuperiorGanaderia from "./ganaderia/BarraSuperiorGanaderia";
import type { TabGanaderia, SubPotreros, SubInventario, SubSanidad } from "./ganaderia/tipos";

interface Props {
  onSalir: () => void;
  // Presente cuando se entra por el QR de un animal (deep link /ganaderia/animal/:id):
  // salta directo a su ficha en Sanidad & Trazabilidad en vez del Panel General.
  deepLinkAnimalId?: number;
}

const DEFAULT_VACUNAS_CATALOGO: VacunaGanaderia[] = [
  { id: 1, tenantId: 1, nombre: "Aftosa Bivalente (A+O)", diasParaRefuerzo: 180, diasRetiroLeche: 0, diasRetiroCarne: 0 },
  { id: 2, tenantId: 1, nombre: "Rabia Paralítica Bovina", diasParaRefuerzo: 365, diasRetiroLeche: 0, diasRetiroCarne: 0 },
  { id: 3, tenantId: 1, nombre: "Triple Bovina (Clostridiosis)", diasParaRefuerzo: 365, diasRetiroLeche: 0, diasRetiroCarne: 21 },
  { id: 4, tenantId: 1, nombre: "Ivermectina 1% Endectocida", diasParaRefuerzo: 90, diasRetiroLeche: 28, diasRetiroCarne: 35 },
];

export default function GanaderiaApp({ onSalir, deepLinkAnimalId }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const tenantId = user?.tenantId ? Number(user.tenantId) : 1;

  // Tasas de cambio multi-moneda (configurables a mano y persistidas)
  const [tasaBCV, setTasaBCV] = useState<number>(() => {
    try {
      const g = localStorage.getItem(`aurora_ganaderia_tasa_bcv_${tenantId}`);
      return g ? Number(g) || 0 : 0;
    } catch {
      return 0;
    }
  });

  const [tasaCOP, setTasaCOP] = useState<number>(() => {
    try {
      const g = localStorage.getItem(`aurora_ganaderia_tasa_cop_${tenantId}`);
      return g ? Number(g) || 0 : 0;
    } catch {
      return 0;
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
      return p ? Number(p) || 0 : 0;
    } catch {
      return 0;
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
      localStorage.setItem(`aurora_ganaderia_tasa_bcv_${tenantId}`, String(nuevaBcv));
      localStorage.setItem(`aurora_ganaderia_tasa_cop_${tenantId}`, String(nuevaCop));
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
  const [sinLeerMercado, setSinLeerMercado] = useState(0);
  // Mensajes del mercado sin leer, para avisar en el menú aunque se esté en otra sección.
  useEffect(() => {
    const contar = () => contarSinLeerMercado().then((r) => setSinLeerMercado(Number(r.sinLeer))).catch(() => {});
    contar();
    const intervalo = setInterval(contar, 60_000);
    return () => clearInterval(intervalo);
  }, []);

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
      <BarraLateralGanaderia
        alertasSanitarias={alertasSanitarias}
        animales={animales}
        potreros={potreros}
        puedeImportarHato={puedeImportarHato}
        sidebarAbierto={sidebarAbierto}
        tab={tab}
        nombreFinca={user?.empresa || "Mi Finca"}
        puedeVerAuditoria={user?.rol === "DUENO_ADMIN"}
        sinLeerMercado={sinLeerMercado}
        abrirMercado={() => navigate("/mercado")}
        abrirVaqueraRapida={abrirVaqueraRapida}
        abrirVentaAnimales={abrirVentaAnimales}
        onSalir={onSalir}
        setAltaAnimal={setAltaAnimal}
        setAperturaSoporte={setAperturaSoporte}
        setModalImportarHato={setModalImportarHato}
        setSidebarAbierto={setSidebarAbierto}
        setTab={setTab}
      />

      {/* ══════════════════════ COLUMNA DERECHA: TOPBAR + CONTENIDO ══════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">

      {/* ── TOPBAR: SINCRONIZACIÓN, MONEDAS, LECHE, FISCAL Y TEMA ── */}
      <BarraSuperiorGanaderia
        estaOnline={estaOnline}
        monedasConfig={monedasConfig}
        pendientesOffline={pendientesOffline}
        precioLecheUSD={precioLecheUSD}
        sincronizandoOffline={sincronizandoOffline}
        tasaBCV={tasaBCV}
        tasaCOP={tasaCOP}
        handleSincronizarManual={handleSincronizarManual}
        setModalDatosFiscales={setModalDatosFiscales}
        setModalEditarPrecioLeche={setModalEditarPrecioLeche}
        setModalEditarTasas={setModalEditarTasas}
        setSidebarAbierto={setSidebarAbierto}
      />

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
