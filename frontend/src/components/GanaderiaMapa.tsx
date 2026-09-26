import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  guardarFincaGanaderia,
  obtenerFincaGanaderia,
  type PotreroGanaderia,
  type AnimalGanaderia,
} from "../api";
import { useAuth } from "../context/AuthContext";
import { IconEdit } from "../Icons";

interface Props {
  potreros: PotreroGanaderia[];
  animales: AnimalGanaderia[];
  onRotarHato: (potrero: PotreroGanaderia) => void;
  onCrearPotrero: () => void;
  onEditarPotrero?: (potrero: PotreroGanaderia) => void;
  onGuardarPotreroTrazado?: (datos: {
    poligono: [number, number][];
    hectareas: number;
  }) => void;
  tenantId?: number;
  /** Potrero ya creado (solo con nombre) que se está ubicando: el mapa abre en modo trazar. */
  potreroAUbicar?: PotreroGanaderia | null;
  onCancelarUbicar?: () => void;
}

export interface FincaConfig {
  nombre: string;
  coords: [number, number];
  guardada: boolean;
}

export interface PuntoInteresFinca {
  id: string;
  nombre: string;
  coords: [number, number];
  tipo: "ORDENO" | "MANGA" | "AGUA" | "SILO" | "CASA" | "OTRO";
}

// Vista neutra de panorama inicial regional (sin inventar finca en un punto falso)
const PANORAMA_INICIAL: [number, number] = [8.5379, -66.9036];

// Cálculo geodésico exacto del área de un polígono en hectáreas sobre la superficie terrestre (WGS84)
export function calcularHectareasPoligono(coords: [number, number][]): number {
  if (coords.length < 3) return 0;
  const R = 6378137; // Radio terrestre medio en metros
  let areaM2 = 0;
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    const p1 = coords[i];
    const p2 = coords[j];
    const lat1 = (p1[0] * Math.PI) / 180;
    const lat2 = (p2[0] * Math.PI) / 180;
    const lng1 = (p1[1] * Math.PI) / 180;
    const lng2 = (p2[1] * Math.PI) / 180;
    areaM2 += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  areaM2 = Math.abs((areaM2 * R * R) / 2.0);
  const hectareas = areaM2 / 10000;
  return Number(hectareas.toFixed(2));
}

export default function GanaderiaMapa({
  potreros,
  animales,
  onRotarHato,
  onCrearPotrero,
  onEditarPotrero,
  onGuardarPotreroTrazado,
  tenantId: propTenantId,
  potreroAUbicar,
  onCancelarUbicar,
}: Props) {
  const { user } = useAuth();
  const effectiveTenantId = propTenantId || (user?.tenantId ? Number(user.tenantId) : 1);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const encuadradoRef = useRef(false);
  const polygonsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const drawingLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const pointsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const fincaMarkerRef = useRef<L.Marker | null>(null);
  const referenceLayerRef = useRef<L.TileLayer | null>(null);

  const [capaActiva, setCapaActiva] = useState<"satelital" | "terreno" | "calles">("satelital");
  const [potreroSeleccionado, setPotreroSeleccionado] = useState<PotreroGanaderia | null>(null);
  const [busquedaLugar, setBusquedaLugar] = useState("");
  const [busquedaError, setBusquedaError] = useState<string | null>(null);

  // ── CONFIGURACIÓN CANÓNICA: backend por tenant, nunca localStorage ──
  const [fincaConfig, setFincaConfig] = useState<FincaConfig>({ nombre: "", coords: PANORAMA_INICIAL, guardada: false });
  const [puntosInteres, setPuntosInteres] = useState<PuntoInteresFinca[]>([]);

  // Modos interactivos
  const [modoFijarFinca, setModoFijarFinca] = useState(false);
  const [modalGuardarFinca, setModalGuardarFinca] = useState(false);
  const [nombreFincaInput, setNombreFincaInput] = useState(fincaConfig.nombre || "");
  const [coordsTempFinca, setCoordsTempFinca] = useState<[number, number] | null>(null);

  const [modoAgregarPunto, setModoAgregarPunto] = useState(false);
  const [modalNuevoPunto, setModalNuevoPunto] = useState(false);
  const [nuevoPuntoForm, setNuevoPuntoForm] = useState<{
    nombre: string;
    tipo: PuntoInteresFinca["tipo"];
    coords: [number, number] | null;
  }>({
    nombre: "",
    tipo: "ORDENO",
    coords: null,
  });

  // Estado del Modo Trazar Potrero interactivo
  const [modoTrazar, setModoTrazar] = useState(false);
  const [verticesTrazado, setVerticesTrazado] = useState<[number, number][]>([]);

  const hectareasTrazadas = calcularHectareasPoligono(verticesTrazado);

  // Al pedir "Ubicar en el mapa" desde la lista, el mapa abre directo en modo trazar.
  useEffect(() => {
    if (!potreroAUbicar) return;
    setVerticesTrazado([]);
    setModoTrazar(true);
  }, [potreroAUbicar?.id]);

  // Teléfono: mapa a pantalla completa y capas en un menú de la barra inferior.
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const [capasAbierto, setCapasAbierto] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => mapInstanceRef.current?.invalidateSize(), 250);
    return () => clearTimeout(t);
  }, [pantallaCompleta]);

  // Caminar la cerca: marcado automático de un poste cada 15 m mientras la persona camina.
  const [autoGps, setAutoGps] = useState(false);
  const [precisionGps, setPrecisionGps] = useState<number | null>(null);
  useEffect(() => {
    if (!autoGps || !modoTrazar) return;
    if (!window.isSecureContext || !navigator.geolocation) {
      setAvisoGps("El GPS del teléfono solo funciona cuando Aurora abre con https (en el servidor). Por ahora marca los puntos tocando el mapa.");
      setAutoGps(false);
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setPrecisionGps(pos.coords.accuracy);
        if (pos.coords.accuracy > 30) return; // lectura poco confiable: se espera la siguiente
        const punto: [number, number] = [Number(pos.coords.latitude.toFixed(6)), Number(pos.coords.longitude.toFixed(6))];
        setVerticesTrazado((prev) => {
          const ultimo = prev[prev.length - 1];
          if (ultimo && L.latLng(ultimo).distanceTo(L.latLng(punto)) < 15) return prev;
          return [...prev, punto];
        });
        mapInstanceRef.current?.panTo(punto);
      },
      () => {
        setAvisoGps("No se pudo seguir tu ubicación. Revisa el permiso del GPS e intenta de nuevo.");
        setAutoGps(false);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [autoGps, modoTrazar]);

  // "Mi ubicación": centra el mapa donde está el teléfono y lo marca con un punto azul.
  const miUbicacionRef = useRef<L.CircleMarker | null>(null);
  const irAMiUbicacion = () => {
    setAvisoGps(null);
    if (!window.isSecureContext || !navigator.geolocation) {
      setAvisoGps("Ver tu ubicación solo funciona cuando Aurora abre con https (en el servidor).");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const map = mapInstanceRef.current;
        if (!map) return;
        const punto: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        miUbicacionRef.current?.remove();
        miUbicacionRef.current = L.circleMarker(punto, { radius: 8, color: "#FFFFFF", weight: 3, fillColor: "#2563EB", fillOpacity: 1 }).addTo(map);
        map.flyTo(punto, Math.max(map.getZoom(), 16), { duration: 0.8 });
      },
      () => setAvisoGps("No se pudo leer tu ubicación. Revisa el permiso del GPS."),
      { enableHighAccuracy: true, timeout: 20000 },
    );
  };

  // Caminar el borde del potrero con el teléfono: cada toque agrega un poste donde está la persona.
  const [buscandoGps, setBuscandoGps] = useState(false);
  const [avisoGps, setAvisoGps] = useState<string | null>(null);
  const agregarPuntoGps = () => {
    setAvisoGps(null);
    if (!window.isSecureContext || !navigator.geolocation) {
      setAvisoGps("El GPS del teléfono solo funciona cuando Aurora abre con https (en el servidor). Por ahora marca los puntos tocando el mapa.");
      return;
    }
    setBuscandoGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBuscandoGps(false);
        setPrecisionGps(pos.coords.accuracy);
        const punto: [number, number] = [Number(pos.coords.latitude.toFixed(6)), Number(pos.coords.longitude.toFixed(6))];
        setVerticesTrazado((prev) => [...prev, punto]);
        mapInstanceRef.current?.flyTo(punto, Math.max(mapInstanceRef.current.getZoom(), 17), { duration: 0.6 });
        if (pos.coords.accuracy > 25) setAvisoGps(`Punto agregado con precisión de ±${Math.round(pos.coords.accuracy)} m. Si puedes, espera unos segundos al aire libre.`);
      },
      (err) => {
        setBuscandoGps(false);
        setAvisoGps(err.code === err.PERMISSION_DENIED
          ? "Aurora no tiene permiso para usar tu ubicación. Actívalo en los ajustes del navegador."
          : "No se pudo leer el GPS. Intenta de nuevo al aire libre.");
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  };

  useEffect(() => {
    let activo = true;
    obtenerFincaGanaderia().then((finca) => {
      if (!activo || !finca) return;
      let puntos: PuntoInteresFinca[] = [];
      try {
        const parsed = JSON.parse(finca.puntosInteresJson || "[]");
        if (Array.isArray(parsed)) puntos = parsed;
      } catch { /* una configuración corrupta no inutiliza el mapa */ }
      setFincaConfig({ nombre: finca.nombre, coords: [Number(finca.latitud), Number(finca.longitud)], guardada: true });
      setPuntosInteres(puntos);
      setNombreFincaInput(finca.nombre);
    }).catch(() => {
      if (activo) setBusquedaError("No se pudo cargar la configuración compartida de la finca.");
    });
    return () => { activo = false; };
  }, []);

  // Inicializar mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialCenter = fincaConfig.guardada ? fincaConfig.coords : PANORAMA_INICIAL;
    const initialZoom = fincaConfig.guardada ? 15 : 6;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: false,
    });

    const esriSatellite = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Esri World Imagery",
        maxZoom: 19,
      }
    ).addTo(map);

    (map as any)._currentBaseLayer = esriSatellite;

    // Capa de referencia (ciudades, carreteras, fronteras) sobre la foto satelital —
    // sin esto, la imagen satelital pura no tiene ningún texto ni punto de
    // orientación, especialmente notorio en la vista panorámica inicial sin
    // finca fijada todavía (zoom alejado).
    const referenceLayer = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19, attribution: "Esri Reference" }
    ).addTo(map);
    referenceLayerRef.current = referenceLayer;

    const polyGroup = L.layerGroup().addTo(map);
    polygonsLayerGroupRef.current = polyGroup;

    const drawGroup = L.layerGroup().addTo(map);
    drawingLayerGroupRef.current = drawGroup;

    const ptsGroup = L.layerGroup().addTo(map);
    pointsLayerGroupRef.current = ptsGroup;

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      encuadradoRef.current = false;
    };
  }, []);

  // Cambiar capa de satélite / terreno / calles
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentLayer = (map as any)._currentBaseLayer;
    if (currentLayer) {
      map.removeLayer(currentLayer);
    }

    let newLayer: L.TileLayer;
    if (capaActiva === "satelital") {
      newLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19, attribution: "Esri World Imagery" }
      );
    } else if (capaActiva === "terreno") {
      newLayer = L.tileLayer(
        "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
        { maxZoom: 17, attribution: "OpenTopoMap" }
      );
    } else {
      newLayer = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        { maxZoom: 19, attribution: "OpenStreetMap" }
      );
    }

    newLayer.addTo(map);

    // La capa de referencia (ciudades/carreteras) solo hace falta sobre la foto
    // satelital pura — Terreno y Calles ya traen sus propias etiquetas.
    const ref = referenceLayerRef.current;
    if (ref) {
      if (capaActiva === "satelital") {
        if (!map.hasLayer(ref)) ref.addTo(map);
        ref.bringToFront();
      } else if (map.hasLayer(ref)) {
        map.removeLayer(ref);
      }
    }

    (map as any)._currentBaseLayer = newLayer;
  }, [capaActiva]);

  // Manejar clics en el mapa según el modo activo
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (modoTrazar || modoFijarFinca || modoAgregarPunto) {
      map.getContainer().style.cursor = "crosshair";

      const handleMapClick = (e: L.LeafletMouseEvent) => {
        const nuevaCoord: [number, number] = [
          Number(e.latlng.lat.toFixed(6)),
          Number(e.latlng.lng.toFixed(6)),
        ];

        if (modoTrazar) {
          setVerticesTrazado(prev => [...prev, nuevaCoord]);
        } else if (modoFijarFinca) {
          setCoordsTempFinca(nuevaCoord);
          setModalGuardarFinca(true);
          setModoFijarFinca(false);
        } else if (modoAgregarPunto) {
          setNuevoPuntoForm(prev => ({ ...prev, coords: nuevaCoord }));
          setModalNuevoPunto(true);
          setModoAgregarPunto(false);
        }
      };

      map.on("click", handleMapClick);

      return () => {
        map.off("click", handleMapClick);
        map.getContainer().style.cursor = "";
      };
    } else {
      map.getContainer().style.cursor = "";
    }
  }, [modoTrazar, modoFijarFinca, modoAgregarPunto]);

  // Renderizar vértices y polígono interactivo mientras se dibuja potrero
  useEffect(() => {
    const group = drawingLayerGroupRef.current;
    if (!group) return;

    group.clearLayers();

    if (!modoTrazar || verticesTrazado.length === 0) return;

    verticesTrazado.forEach((coord, idx) => {
      const isFirst = idx === 0;
      const markerIcon = L.divIcon({
        className: "bg-transparent border-0",
        html: `
          <div style="
            transform: translate(-50%, -50%);
            width: ${isFirst ? "22px" : "18px"};
            height: ${isFirst ? "22px" : "18px"};
            border-radius: 9999px;
            background: ${isFirst ? "#177E89" : "#38BDF8"};
            border: 2px solid #ffffff;
            box-shadow: 0 0 10px ${isFirst ? "rgba(0,255,194,0.9)" : "rgba(56,189,248,0.8)"};
            display: flex;
            align-items: center;
            justify-content: center;
            color: #03101E;
            font-size: 10px;
            font-weight: 900;
            cursor: pointer;
          ">
            ${idx + 1}
          </div>
        `,
      });

      const marker = L.marker(coord, { icon: markerIcon });
      group.addLayer(marker);
    });

    if (verticesTrazado.length >= 2) {
      const polyline = L.polyline(verticesTrazado, {
        color: "#177E89",
        weight: 3,
        dashArray: "6, 6",
      });
      group.addLayer(polyline);
    }

    if (verticesTrazado.length >= 3) {
      const polygonPreview = L.polygon(verticesTrazado, {
        color: "#177E89",
        weight: 2,
        fillColor: "#177E89",
        fillOpacity: 0.25,
      });
      group.addLayer(polygonPreview);
    }
  }, [modoTrazar, verticesTrazado]);

  // Renderizar potreros guardados y marcador del centro de finca
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = polygonsLayerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    // Marcador central de la finca si está guardada
    if (fincaConfig.guardada) {
      const fincaIcon = L.divIcon({
        className: "bg-transparent border-0",
        html: `
          <div style="
            transform: translate(-50%, -100%);
            background: linear-gradient(135deg, #10B981, #047857);
            border: 2px solid #ffffff;
            border-radius: 12px;
            padding: 4px 10px;
            color: #ffffff;
            font-size: 11px;
            font-weight: 800;
            white-space: nowrap;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            gap: 5px;
          ">
            <span><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.4-7-11.5A7 7 0 0 1 19 9.5C19 14.6 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg></span>
            <span>${fincaConfig.nombre}</span>
          </div>
        `,
      });
      const fincaMarker = L.marker(fincaConfig.coords, { icon: fincaIcon }).addTo(group);
      fincaMarkerRef.current = fincaMarker;
    }

    // Sin la finca ubicada el mapa arranca mostrando todo el país y los potreros quedan como un
    // punto: se encuadran los potreros dibujados (una sola vez, para no pelear con el usuario).
    if (!fincaConfig.guardada && !encuadradoRef.current) {
      const puntos = potreros.flatMap((p) => (p.poligono && p.poligono.length >= 3 ? p.poligono : []));
      if (puntos.length >= 3) {
        encuadradoRef.current = true;
        setTimeout(() => {
          const vigente = mapInstanceRef.current;
          if (!vigente) return;
          vigente.invalidateSize();
          vigente.fitBounds(L.latLngBounds(puntos), { padding: [40, 40], maxZoom: 17 });
        }, 300);
      }
    }

    // Dibujar cada potrero que tenga polígono trazado (o alrededor de la finca si está ubicada)
    potreros.forEach((pot, idx) => {
      let coords: [number, number][] | undefined = undefined;

      if (pot.poligono && pot.poligono.length >= 3) {
        coords = pot.poligono;
      }
      // Nunca dibujar áreas inventadas alrededor de la finca: si no hay
      // polígono real, el potrero queda visible en la lista como pendiente de
      // georreferenciar, pero no aparenta una ubicación precisa en el mapa.
      if (!coords) return;

      const enDescanso = pot.estado === "EN_DESCANSO";
      const colorBorde = pot.color || (enDescanso ? "#F59E0B" : "#177E89");
      const colorRelleno = pot.color || (enDescanso ? "#F59E0B" : "#177E89");

      const polygon = L.polygon(coords, {
        color: colorBorde,
        weight: 2.5,
        opacity: 0.9,
        fillColor: colorRelleno,
        fillOpacity: enDescanso ? 0.22 : 0.32,
        dashArray: enDescanso ? "6, 6" : undefined,
      });

      polygon.on("click", () => {
        if (!modoTrazar && !modoFijarFinca && !modoAgregarPunto) {
          setPotreroSeleccionado(pot);
        }
      });

      polygon.addTo(group);

      const latPromedio = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
      const lngPromedio = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;

      const animalesEnPotrero = animales.filter(a => a.potrero?.id === pot.id);

      const labelIcon = L.divIcon({
        className: "bg-transparent border-0",
        html: `
          <div style="
            transform: translate(-50%, -50%);
            background: rgba(5, 19, 34, 0.85);
            backdrop-filter: blur(8px);
            border: 1px solid ${colorBorde};
            border-radius: 9999px;
            padding: 3px 10px;
            color: #ffffff;
            font-size: 11px;
            font-weight: 700;
            white-space: nowrap;
            box-shadow: 0 4px 14px rgba(0,0,0,0.5);
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
          ">
            <span style="width: 7px; height: 7px; border-radius: 9999px; background: ${colorBorde};"></span>
            <span>${pot.nombre}</span>
            <span style="opacity: 0.65; font-size: 10px;">• ${pot.areaHectareas} ha</span>
            ${animalesEnPotrero.length > 0 ? `<span style="background: rgba(0,255,194,0.2); color: #177E89; border-radius: 9999px; padding: 1px 6px; font-size: 10px;">${animalesEnPotrero.length} anim.</span>` : ""}
          </div>
        `,
      });

      const marker = L.marker([latPromedio, lngPromedio], { icon: labelIcon });
      marker.on("click", () => {
        if (!modoTrazar && !modoFijarFinca && !modoAgregarPunto) {
          setPotreroSeleccionado(pot);
        }
      });
      marker.addTo(group);
    });
  }, [potreros, animales, modoTrazar, modoFijarFinca, modoAgregarPunto, fincaConfig]);

  // Renderizar puntos de interés / instalaciones reales del usuario
  useEffect(() => {
    const group = pointsLayerGroupRef.current;
    if (!group) return;

    group.clearLayers();

    puntosInteres.forEach(pt => {
      const svgIcon = (path: string) =>
        `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
      const getIconEmoji = (tipo: string) => {
        switch (tipo) {
          case "ORDENO": return svgIcon('<path d="M9 2h6"/><path d="M9 2v4l-3 4v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10l-3-4V2"/><path d="M6 13h12"/>');
          case "MANGA": return svgIcon('<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M15 12h.01"/>');
          case "AGUA": return svgIcon('<path d="M12 2s6 7 6 12a6 6 0 0 1-12 0c0-5 6-12 6-12z"/>');
          case "SILO": return svgIcon('<path d="M12 2v20"/><path d="M12 5c-1.5 0-3 1-3 2.5S10.5 10 12 10"/><path d="M12 5c1.5 0 3 1 3 2.5S13.5 10 12 10"/><path d="M12 9c-1.5 0-3 1-3 2.5S10.5 14 12 14"/><path d="M12 9c1.5 0 3 1 3 2.5S13.5 14 12 14"/>');
          case "CASA": return svgIcon('<path d="M3 11l9-7 9 7"/><path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10"/>');
          default: return svgIcon('<path d="M12 21s-7-6.4-7-11.5A7 7 0 0 1 19 9.5C19 14.6 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>');
        }
      };

      const pinIcon = L.divIcon({
        className: "bg-transparent border-0",
        html: `
          <div style="
            transform: translate(-50%, -50%);
            background: rgba(11, 61, 145, 0.92);
            border: 1.5px solid #38BDF8;
            border-radius: 10px;
            padding: 3px 8px;
            color: #E0F2FE;
            font-size: 10px;
            font-weight: 700;
            white-space: nowrap;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            gap: 4px;
            cursor: pointer;
          ">
            <span>${getIconEmoji(pt.tipo)}</span>
            <span>${pt.nombre}</span>
          </div>
        `,
      });

      const marker = L.marker(pt.coords, { icon: pinIcon });
      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; color: #1e293b; padding: 4px;">
          <div style="font-weight: bold; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">${getIconEmoji(pt.tipo)} <span>${pt.nombre}</span></div>
          <div style="color: #64748b; font-size: 10px; margin-bottom: 8px;">Coords: ${pt.coords[0].toFixed(5)}, ${pt.coords[1].toFixed(5)}</div>
          <button id="btn-borrar-punto-${pt.id}" style="
            background: #ef4444;
            color: #ffffff;
            border: none;
            padding: 3px 8px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: bold;
            cursor: pointer;
          ">Eliminar Instalación</button>
        </div>
      `);

      marker.on("popupopen", () => {
        const btn = document.getElementById(`btn-borrar-punto-${pt.id}`);
        if (btn) {
          btn.onclick = () => handleEliminarPunto(pt.id);
        }
      });

      marker.addTo(group);
    });
  }, [puntosInteres]);

  // Manejador de zoom
  const handleZoom = (delta: number) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.setZoom(map.getZoom() + delta);
  };

  // Centrar mapa en la finca real
  const handleCentrarFinca = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (fincaConfig.guardada) {
      map.flyTo(fincaConfig.coords, 15, { duration: 1.2 });
    } else {
      map.flyTo(PANORAMA_INICIAL, 6, { duration: 1.0 });
    }
  };

  // Guardar ubicación y nombre de la finca para este tenant
  const handleGuardarUbicacionFinca = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!coordsTempFinca) return;

    const nombreLimpio = nombreFincaInput.trim() || "Mi Finca";
    const nuevaConfig: FincaConfig = {
      nombre: nombreLimpio,
      coords: coordsTempFinca,
      guardada: true,
    };

    try {
      const guardada = await guardarFincaGanaderia({
        nombre: nuevaConfig.nombre,
        latitud: nuevaConfig.coords[0],
        longitud: nuevaConfig.coords[1],
        puntosInteresJson: JSON.stringify(puntosInteres),
      });
      setFincaConfig({ nombre: guardada.nombre, coords: [Number(guardada.latitud), Number(guardada.longitud)], guardada: true });
    } catch {
      setBusquedaError("No se pudo guardar la ubicación de la finca. Verifica la conexión e inténtalo de nuevo.");
      return;
    }

    setModalGuardarFinca(false);
    setCoordsTempFinca(null);

    const map = mapInstanceRef.current;
    if (map) {
      map.flyTo(nuevaConfig.coords, 15, { duration: 1.0 });
    }
  };

  // Guardar un nuevo punto de referencia / instalación
  const handleGuardarNuevoPunto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoPuntoForm.coords || !nuevoPuntoForm.nombre.trim()) return;

    const nuevo: PuntoInteresFinca = {
      id: `pt_${Date.now()}`,
      nombre: nuevoPuntoForm.nombre.trim(),
      tipo: nuevoPuntoForm.tipo,
      coords: nuevoPuntoForm.coords,
    };

    if (!fincaConfig.guardada) {
      setBusquedaError("Primero fija y guarda la ubicación de la finca.");
      return;
    }
    const actualizados = [...puntosInteres, nuevo];
    try {
      await guardarFincaGanaderia({ nombre: fincaConfig.nombre, latitud: fincaConfig.coords[0], longitud: fincaConfig.coords[1], puntosInteresJson: JSON.stringify(actualizados) });
      setPuntosInteres(actualizados);
    } catch {
      setBusquedaError("No se pudo guardar la instalación de la finca.");
      return;
    }

    setModalNuevoPunto(false);
    setNuevoPuntoForm({ nombre: "", tipo: "ORDENO", coords: null });
  };

  // Eliminar un punto de referencia
  const handleEliminarPunto = async (id: string) => {
    const filtrados = puntosInteres.filter(p => p.id !== id);
    try {
      await guardarFincaGanaderia({ nombre: fincaConfig.nombre, latitud: fincaConfig.coords[0], longitud: fincaConfig.coords[1], puntosInteresJson: JSON.stringify(filtrados) });
      setPuntosInteres(filtrados);
    } catch {
      setBusquedaError("No se pudo eliminar la instalación de la finca.");
    }
  };

  // Buscador funcional: analiza coordenadas o busca potreros/localidades
  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusquedaError(null);
    const query = busquedaLugar.trim();
    if (!query) return;

    const map = mapInstanceRef.current;
    if (!map) return;

    // 1. Verificar si son coordenadas numéricas directas "lat, lng" o "lat lng"
    const coordRegex = /^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/;
    const matchCoord = query.match(coordRegex);
    if (matchCoord) {
      const lat = parseFloat(matchCoord[1]);
      const lng = parseFloat(matchCoord[2]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        map.flyTo([lat, lng], 15, { duration: 1.2 });
        setCoordsTempFinca([lat, lng]);
        setNombreFincaInput(fincaConfig.nombre || "");
        setModalGuardarFinca(true);
        return;
      }
    }

    // 2. Verificar si coincide con el nombre de un potrero ya registrado
    const potMatch = potreros.find(p =>
      p.nombre.toLowerCase().includes(query.toLowerCase()) ||
      (p.codigo && p.codigo.toLowerCase().includes(query.toLowerCase()))
    );
    if (potMatch) {
      if (potMatch.poligono && potMatch.poligono.length >= 3) {
        const latAvg = potMatch.poligono.reduce((s, c) => s + c[0], 0) / potMatch.poligono.length;
        const lngAvg = potMatch.poligono.reduce((s, c) => s + c[1], 0) / potMatch.poligono.length;
        map.flyTo([latAvg, lngAvg], 16, { duration: 1.2 });
      }
      setPotreroSeleccionado(potMatch);
      return;
    }

    // 3. Búsqueda geográfica vía Nominatim OpenStreetMap
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        { headers: { "Accept-Language": "es" } }
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        map.flyTo([lat, lng], 14, { duration: 1.2 });
        return;
      }
    } catch {}

    setBusquedaError("No se encontró esa ubicación o potrero.");
    setTimeout(() => setBusquedaError(null), 3000);
  };

  // Deshacer último vértice del trazado
  const handleDeshacerVertice = () => {
    setVerticesTrazado(prev => prev.slice(0, -1));
  };

  // Cancelar trazado
  const handleCancelarTrazado = () => {
    setVerticesTrazado([]);
    setModoTrazar(false);
    setAvisoGps(null);
    setAutoGps(false);
    onCancelarUbicar?.();
  };

  // Finalizar trazado y guardar potrero
  const handleFinalizarTrazado = () => {
    if (verticesTrazado.length < 3) return;
    if (onGuardarPotreroTrazado) {
      onGuardarPotreroTrazado({
        poligono: verticesTrazado,
        hectareas: hectareasTrazadas,
      });
    }
    setVerticesTrazado([]);
    setModoTrazar(false);
    setAutoGps(false);
  };

  const animalesSeleccionados = potreroSeleccionado
    ? animales.filter(a => a.potrero?.id === potreroSeleccionado.id)
    : [];

  return (
    <div className={`modal-siempre-oscuro ${pantallaCompleta ? "fixed inset-0 z-[90] h-[100dvh] rounded-none" : "relative h-[72dvh] min-h-[460px] sm:h-[680px] rounded-3xl"} w-full overflow-hidden border border-slate-300/60 dark:border-white/10 shadow-2xl flex flex-col font-['Inter']`}>
      
      {/* ── BARRA DE HERRAMIENTAS SUPERIOR DEL MAPA ── */}
      <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 z-[500] flex flex-nowrap sm:flex-wrap items-center sm:justify-between gap-2 sm:gap-3 overflow-x-auto sm:overflow-visible pointer-events-auto sm:pointer-events-none [scrollbar-width:none] [&>*]:shrink-0 whitespace-nowrap">
        
        {/* Izquierda: Buscador & Centrar */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="apple-glass rounded-2xl px-3 sm:px-3.5 py-2 border border-white/20 shadow-lg flex items-center gap-1.5 sm:gap-2 bg-slate-900/80 backdrop-blur-xl">
            <span className="hidden sm:inline text-slate-400 text-xs font-semibold">Finca:</span>
            <span className="font-['Outfit'] font-bold text-xs text-white">
              {fincaConfig.guardada ? fincaConfig.nombre : "Sin ubicar"}
            </span>

            {fincaConfig.guardada ? (
              <div className="flex items-center gap-1.5 ml-1">
                <button
                  onClick={handleCentrarFinca}
                  className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                  title="Centrar en las coordenadas de tu finca">
                  Centrar
                </button>
                <button
                  onClick={() => {
                    setCoordsTempFinca(fincaConfig.coords);
                    setNombreFincaInput(fincaConfig.nombre);
                    setModalGuardarFinca(true);
                  }}
                  className="text-[10px] text-slate-400 hover:text-white cursor-pointer ml-1">
                  Editar
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setModoFijarFinca(true);
                  setModoTrazar(false);
                  setModoAgregarPunto(false);
                }}
                className="text-[11px] font-bold text-amber-700 hover:underline ml-1 cursor-pointer">
                + Ubicar Finca
              </button>
            )}
          </div>

          <form onSubmit={handleBuscar} className="hidden sm:flex apple-glass rounded-2xl px-3 py-1.5 border border-white/15 bg-slate-900/75 backdrop-blur-xl relative">
            <input
              type="text"
              placeholder="Buscar potrero o coordenada (ej. 8.55, -70.36)..."
              value={busquedaLugar}
              onChange={e => setBusquedaLugar(e.target.value)}
              className="bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none w-56"
            />
            {busquedaError && (
              <div className="absolute top-10 left-0 bg-rose-950/90 border border-rose-500/50 text-rose-300 text-[10px] px-2.5 py-1 rounded-xl shadow-lg whitespace-nowrap">
                {busquedaError}
              </div>
            )}
          </form>
        </div>

        {/* Teléfono: ampliar el mapa a pantalla completa (las demás herramientas van abajo) */}
        <button
          type="button"
          onClick={() => setPantallaCompleta((v) => !v)}
          className="sm:hidden ml-auto px-3 py-2 rounded-2xl bg-white border border-slate-200 shadow-lg text-xs font-bold text-slate-700 cursor-pointer">
          {pantallaCompleta ? "Cerrar mapa" : "Ampliar mapa"}
        </button>

        {/* Derecha: Selector de Capas, Modo Trazar, Instalaciones & Agregar Potrero */}
        <div className="hidden sm:flex items-center gap-2 pointer-events-auto">
          <div className="apple-glass rounded-2xl p-1 border border-white/15 shadow-lg flex items-center gap-1 bg-slate-900/80 backdrop-blur-xl text-xs font-semibold">
            <button
              onClick={() => setCapaActiva("satelital")}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                capaActiva === "satelital"
                  ? "bg-emerald-500 text-white shadow-md font-bold"
                  : "text-slate-600 hover:text-white"
              }`}>
              Satelital
            </button>
            <button
              onClick={() => setCapaActiva("terreno")}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                capaActiva === "terreno"
                  ? "bg-emerald-500 text-white shadow-md font-bold"
                  : "text-slate-600 hover:text-white"
              }`}>
              Terreno
            </button>
            <button
              onClick={() => setCapaActiva("calles")}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                capaActiva === "calles"
                  ? "bg-emerald-500 text-white shadow-md font-bold"
                  : "text-slate-600 hover:text-white"
              }`}>
              Calles
            </button>
          </div>

          {/* Botón Punto de Referencia / Instalación */}
          <button
            onClick={() => {
              if (modoAgregarPunto) {
                setModoAgregarPunto(false);
              } else {
                setModoAgregarPunto(true);
                setModoTrazar(false);
                setModoFijarFinca(false);
              }
            }}
            className={`text-xs font-bold px-3 py-2 rounded-2xl shadow-lg cursor-pointer transition-all border ${
              modoAgregarPunto
                ? "bg-sky-500 text-slate-950 border-sky-300 font-extrabold scale-105"
                : "bg-slate-900/80 text-sky-700 border-sky-400/50 hover:bg-sky-500/20"
            }`}>
            {modoAgregarPunto ? "Cancelar Punto" : "+ Instalación"}
          </button>

          {/* Botón Trazar Potrero Interactivo */}
          <button
            onClick={() => {
              if (modoTrazar) {
                handleCancelarTrazado();
              } else {
                setModoTrazar(true);
                setModoFijarFinca(false);
                setModoAgregarPunto(false);
                setPotreroSeleccionado(null);
              }
            }}
            className={`text-xs font-bold px-3.5 py-2 rounded-2xl shadow-lg cursor-pointer transition-all border ${
              modoTrazar
                ? "bg-amber-500 text-slate-950 border-amber-300 font-extrabold scale-105"
                : "bg-slate-900/80 text-emerald-700 border-emerald-400/50 hover:bg-emerald-500/20"
            }`}>
            {modoTrazar ? "Cancelar Trazado" : "Trazar Potrero"}
          </button>

          <button
            onClick={onCrearPotrero}
            className="hidden sm:inline-block btn-cyber-neon text-white text-xs font-bold px-4 py-2 rounded-2xl shadow-lg cursor-pointer hover:scale-105 transition-all">
            + Agregar Potrero
          </button>
        </div>
      </div>

      {/* ── BANNER HONESTO DE ESTADO VACÍO (SIN UBICACIÓN GUARDADA) ── */}
      {!fincaConfig.guardada && !modoFijarFinca && (
        <div className="hidden sm:flex absolute top-16 left-3 right-3 sm:top-18 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[550] apple-glass rounded-2xl px-5 py-2.5 border border-amber-400/60 bg-slate-950/90 backdrop-blur-2xl shadow-2xl flex-wrap items-center gap-3 text-xs pointer-events-auto animate-fade-in">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-slate-700">
            Aún no has ubicado tu finca — busca tu ubicación o haz clic en el mapa para marcarla.
          </span>
          <button
            onClick={() => {
              setModoFijarFinca(true);
              setModoTrazar(false);
              setModoAgregarPunto(false);
            }}
            className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer transition-all">
            Fijar Ubicación con Clic →
          </button>
        </div>
      )}

      {/* ── BANNER ASISTENTE AL FIJAR FINCA ── */}
      {modoFijarFinca && (
        <div className="absolute top-16 left-3 right-3 sm:top-18 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[600] apple-glass rounded-2xl px-5 py-2.5 border border-amber-400 bg-slate-950/95 backdrop-blur-2xl shadow-2xl flex items-center gap-4 text-xs pointer-events-auto animate-fade-in">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          <span className="font-['Outfit'] font-bold text-white text-sm">
            Modo Ubicar Finca:
          </span>
          <span className="text-slate-700">
            Haz clic exactamente sobre la sede o entrada de tu finca en el mapa satelital.
          </span>
          <button
            onClick={() => setModoFijarFinca(false)}
            className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-slate-700 font-medium cursor-pointer">
            Cancelar
          </button>
        </div>
      )}

      {/* ── BANNER ASISTENTE AL AGREGAR PUNTO DE REFERENCIA ── */}
      {modoAgregarPunto && (
        <div className="absolute top-16 left-3 right-3 sm:top-18 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[600] apple-glass rounded-2xl px-5 py-2.5 border border-sky-400 bg-slate-950/95 backdrop-blur-2xl shadow-2xl flex items-center gap-4 text-xs pointer-events-auto animate-fade-in">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
          <span className="font-['Outfit'] font-bold text-white text-sm">
            Agregar Instalación:
          </span>
          <span className="text-slate-700">
            Haz clic en el mapa donde se ubica tu vaquera, corral, manga o tanque.
          </span>
          <button
            onClick={() => setModoAgregarPunto(false)}
            className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-slate-700 font-medium cursor-pointer">
            Cancelar
          </button>
        </div>
      )}

      {/* ── BANNER ASISTENTE FLOTANTE DURANTE MODO TRAZAR POTRERO ── */}
      {modoTrazar && (
        <div className="absolute bottom-3 left-3 right-3 sm:bottom-auto sm:top-18 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[600] apple-glass rounded-2xl px-4 sm:px-5 py-3 sm:py-2.5 border border-emerald-400 bg-slate-950/90 backdrop-blur-2xl shadow-2xl flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-xs pointer-events-auto animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-['Outfit'] font-bold text-white text-sm">
              {potreroAUbicar ? `Ubicando: ${potreroAUbicar.nombre}` : "Trazador de Potrero Activo"}
            </span>
          </div>

          <div className="hidden sm:block h-4 w-px bg-white/20" />

          <div className="text-slate-600">
            {verticesTrazado.length === 0 ? (
              <span>Toca el mapa en cada esquina de la cerca, o camina el borde y marca los postes con el GPS.</span>
            ) : verticesTrazado.length < 3 ? (
              <span>
                <strong>{verticesTrazado.length}</strong> {verticesTrazado.length === 1 ? "poste marcado" : "postes marcados"} (mínimo 3).
              </span>
            ) : (
              <span className="text-emerald-700 font-bold">
                {verticesTrazado.length} postes · {hectareasTrazadas} ha
              </span>
            )}
          </div>

          {precisionGps != null && (
            <div className={`text-[11px] font-semibold ${precisionGps <= 10 ? "text-emerald-700" : precisionGps <= 30 ? "text-amber-700" : "text-rose-700"}`}>
              Precisión del GPS: ±{Math.round(precisionGps)} m · {precisionGps <= 10 ? "buena" : precisionGps <= 30 ? "regular" : "baja, espera al aire libre"}
            </div>
          )}
          <div className="w-full sm:w-auto grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:ml-2">
            <button
              onClick={agregarPuntoGps}
              disabled={buscandoGps}
              style={{ backgroundColor: "#059669", color: "#FFFFFF" }}
              className="col-span-2 sm:col-span-1 px-3 py-3 sm:py-1 rounded-xl text-sm sm:text-xs font-bold cursor-pointer transition-all disabled:opacity-50">
              {buscandoGps ? "Buscando GPS…" : "Marcar poste aquí (GPS)"}
            </button>
            <label className="col-span-2 sm:col-span-1 flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer">
              <input type="checkbox" checked={autoGps} onChange={(e) => setAutoGps(e.target.checked)} className="w-4 h-4" />
              Marcar solo cada 15 m mientras camino
            </label>
            {verticesTrazado.length > 0 && (
              <button
                onClick={handleDeshacerVertice}
                className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-slate-700 font-medium cursor-pointer transition-all">
                Deshacer
              </button>
            )}

            <button
              onClick={handleFinalizarTrazado}
              disabled={verticesTrazado.length < 3}
              className="px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black cursor-pointer shadow-md transition-all">
              Guardar Potrero ({hectareasTrazadas} ha)
            </button>
            <button
              onClick={handleCancelarTrazado}
              className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-slate-700 font-medium cursor-pointer transition-all">
              Cancelar
            </button>
          </div>
          {avisoGps && <div className="w-full text-amber-700 text-[11px]">{avisoGps}</div>}
        </div>
      )}

      {/* ── CONTROLES DE ZOOM LATERALES ── */}
      <div className="hidden sm:flex absolute bottom-36 left-3 sm:bottom-auto sm:top-20 sm:left-4 z-[500] flex-col gap-1.5 pointer-events-auto">
        <button
          onClick={() => handleZoom(1)}
          className="apple-glass w-9 h-9 rounded-xl border border-white/20 text-white font-black text-base flex items-center justify-center bg-slate-900/80 backdrop-blur-xl shadow-lg hover:border-emerald-400 cursor-pointer transition-colors"
          title="Acercar mapa">
          +
        </button>
        <button
          onClick={() => handleZoom(-1)}
          className="apple-glass w-9 h-9 rounded-xl border border-white/20 text-white font-black text-base flex items-center justify-center bg-slate-900/80 backdrop-blur-xl shadow-lg hover:border-emerald-400 cursor-pointer transition-colors"
          title="Alejar mapa">
          −
        </button>
      </div>

      {/* ── LEYENDA DEL MAPA ── */}
      <div className="hidden sm:block absolute bottom-4 left-4 z-[500] apple-glass rounded-2xl p-2.5 border border-white/15 bg-slate-900/85 backdrop-blur-xl shadow-lg text-[11px] text-slate-600 space-y-1.5 pointer-events-auto">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-md bg-emerald-400/40 border border-emerald-400" />
          <span>Potrero Activo (En Pastoreo)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-md bg-amber-400/40 border border-amber-400 border-dashed" />
          <span>Potrero en Descanso Agronómico</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-md bg-sky-400/40 border border-sky-400" />
          <span>Instalaciones creadas ({puntosInteres.length})</span>
        </div>
      </div>

      {/* ── TELÉFONO: BARRA INFERIOR AL ALCANCE DEL PULGAR ── */}
      {!modoTrazar && !modoFijarFinca && !modoAgregarPunto && !potreroSeleccionado && (
        <div className="sm:hidden absolute bottom-3 left-3 right-3 z-[520] grid grid-cols-4 gap-2 pointer-events-auto">
          <button type="button" onClick={() => setCapasAbierto((v) => !v)} className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-2xl bg-white border border-slate-200 shadow-lg text-[11px] font-bold text-slate-700 cursor-pointer active:scale-95 transition-transform">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 3l9 5-9 5-9-5 9-5zm-9 9l9 5 9-5M3 16l9 5 9-5" /></svg>
            Capas
          </button>
          <button type="button" onClick={() => { setCapasAbierto(false); setModoTrazar(true); setModoFijarFinca(false); setModoAgregarPunto(false); setPotreroSeleccionado(null); }} className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-2xl bg-white border border-slate-200 shadow-lg text-[11px] font-bold text-slate-700 cursor-pointer active:scale-95 transition-transform">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M4 20l4-1 11-11-3-3L5 16l-1 4zM14 6l3 3" /></svg>
            Trazar
          </button>
          <button type="button" onClick={() => { setCapasAbierto(false); setModoAgregarPunto(true); setModoTrazar(false); setModoFijarFinca(false); }} className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-2xl bg-white border border-slate-200 shadow-lg text-[11px] font-bold text-slate-700 cursor-pointer active:scale-95 transition-transform">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 21s-7-6.4-7-11.5A7 7 0 0 1 19 9.5C19 14.6 12 21 12 21zM12 7v5M9.5 9.5h5" /></svg>
            Instalación
          </button>
          <button type="button" onClick={() => { setCapasAbierto(false); irAMiUbicacion(); }} className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-2xl bg-white border border-slate-200 shadow-lg text-[11px] font-bold text-slate-700 cursor-pointer active:scale-95 transition-transform">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 2v3M12 19v3M2 12h3M19 12h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" /></svg>
            Mi ubicación
          </button>
        </div>
      )}
      {capasAbierto && !modoTrazar && !potreroSeleccionado && (
        <div className="sm:hidden absolute bottom-24 left-3 right-3 z-[530] rounded-2xl bg-white border border-slate-200 shadow-xl p-3 space-y-3 pointer-events-auto">
          <div className="grid grid-cols-3 gap-2">
            {([["satelital", "Satelital"], ["terreno", "Terreno"], ["calles", "Calles"]] as const).map(([valor, texto]) => (
              <button
                key={valor}
                type="button"
                onClick={() => { setCapaActiva(valor); setCapasAbierto(false); }}
                style={capaActiva === valor ? { backgroundColor: "#10B981", color: "#FFFFFF" } : undefined}
                className="py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer">
                {texto}
              </button>
            ))}
          </div>
          <div className="space-y-1 text-[11px] text-slate-600">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-md bg-emerald-400/40 border border-emerald-400" />Potrero en uso</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-md bg-amber-400/40 border border-amber-400 border-dashed" />Potrero en descanso</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-md bg-sky-400/40 border border-sky-400" />Instalaciones ({puntosInteres.length})</div>
          </div>
        </div>
      )}
      {avisoGps && !modoTrazar && (
        <div className="sm:hidden absolute bottom-24 left-3 right-3 z-[540] rounded-2xl bg-white border border-amber-300 shadow-lg p-3 text-[11px] text-amber-800 pointer-events-auto" onClick={() => setAvisoGps(null)}>
          {avisoGps}
        </div>
      )}

      {/* ── CONTENEDOR DEL MAPA LEAFLET ── */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* ── MODAL: CONFIRMAR Y GUARDAR UBICACIÓN DE FINCA ── */}
      {modalGuardarFinca && coordsTempFinca && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="apple-glass rounded-3xl p-6 max-w-md w-full border border-white/20 shadow-2xl text-left space-y-4">
            <h3 className="font-['Outfit'] font-bold text-lg text-white">
              Guardar Ubicación de tu Finca
            </h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Esta ubicación se guardará exclusivamente para tu cuenta y servirá como centro de tu hato, potreros e instalaciones.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Nombre de la Finca / Hato
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Ej. Hato El Cedro, Finca Santa Elena..."
                value={nombreFincaInput}
                onChange={e => setNombreFincaInput(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-xs focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] font-mono text-slate-600 space-y-1">
              <div><strong>Latitud:</strong> {coordsTempFinca[0].toFixed(6)}</div>
              <div><strong>Longitud:</strong> {coordsTempFinca[1].toFixed(6)}</div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setModalGuardarFinca(false);
                  setCoordsTempFinca(null);
                }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-600 text-xs font-medium cursor-pointer">
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleGuardarUbicacionFinca()}
                disabled={!nombreFincaInput.trim()}
                className="btn-cyber-neon text-white text-xs font-bold px-5 py-2 rounded-xl cursor-pointer shadow-lg disabled:opacity-40">
                Guardar Ubicación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CREAR PUNTO DE REFERENCIA / INSTALACIÓN ── */}
      {modalNuevoPunto && nuevoPuntoForm.coords && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <form onSubmit={handleGuardarNuevoPunto} className="apple-glass rounded-3xl p-6 max-w-md w-full border border-white/20 shadow-2xl text-left space-y-4">
            <h3 className="font-['Outfit'] font-bold text-lg text-white">
              Nueva Instalación / Punto de Referencia
            </h3>
            <p className="text-slate-400 text-xs">
              Registra puntos clave como sala de ordeño, manga de vacunación, comederos o pozos de agua.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Nombre de la Instalación
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Ej. Vaquera Principal, Corral de Maternidad..."
                value={nuevoPuntoForm.nombre}
                onChange={e => setNuevoPuntoForm({ ...nuevoPuntoForm, nombre: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-xs focus:outline-none focus:border-sky-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Tipo de Instalación
              </label>
              <select
                value={nuevoPuntoForm.tipo}
                onChange={e => setNuevoPuntoForm({ ...nuevoPuntoForm, tipo: e.target.value as any })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/20 text-white text-xs focus:outline-none focus:border-sky-400">
                <option value="ORDENO">Vaquera & Sala de Ordeño</option>
                <option value="MANGA">Corral de Trabajo & Manga</option>
                <option value="AGUA">Tanque de Agua & Molino</option>
                <option value="SILO">Silo & Depósito de Forraje</option>
                <option value="CASA">Casa Principal / Galpón</option>
                <option value="OTRO">Otro Punto de Referencia</option>
              </select>
            </div>

            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-mono text-slate-600">
              Coordenadas: {nuevoPuntoForm.coords[0].toFixed(6)}, {nuevoPuntoForm.coords[1].toFixed(6)}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setModalNuevoPunto(false);
                  setNuevoPuntoForm({ nombre: "", tipo: "ORDENO", coords: null });
                }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-600 text-xs font-medium cursor-pointer">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!nuevoPuntoForm.nombre.trim()}
                className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer shadow-lg disabled:opacity-40">
                Guardar Instalación
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── PANEL LATERAL FLOTANTE: DETALLE DEL POTRERO SELECCIONADO ── */}
      {potreroSeleccionado && !modoTrazar && !modoFijarFinca && !modoAgregarPunto && (
        <div className="absolute left-0 right-0 bottom-0 max-h-[75%] overflow-y-auto rounded-t-3xl sm:rounded-3xl sm:left-auto sm:top-20 sm:right-4 sm:bottom-4 sm:w-96 sm:max-h-none z-[500] apple-glass p-5 border border-emerald-500/40 bg-slate-950/90 backdrop-blur-2xl shadow-2xl flex flex-col justify-between text-left pointer-events-auto animate-fade-in">
          
          <div className="space-y-4">
            <div className="sm:hidden mx-auto -mt-2 w-10 h-1.5 rounded-full bg-slate-300" aria-hidden="true" />
            <div className="flex items-start justify-between pb-3 border-b border-white/10">
              <div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                  potreroSeleccionado.estado === "EN_DESCANSO"
                    ? "bg-amber-500/20 text-amber-700 border border-amber-500/30"
                    : "bg-emerald-500/20 text-emerald-700 border border-emerald-500/30"
                }`}>
                  {potreroSeleccionado.estado === "EN_DESCANSO" ? "EN DESCANSO" : "ACTIVO / EN PASTOREO"}
                </span>
                <h3 className="font-['Outfit'] font-black text-xl text-white mt-1.5">
                  {potreroSeleccionado.nombre}
                </h3>
              </div>
              <div className="flex items-center gap-1">
                {onEditarPotrero && (
                  <button
                    onClick={() => onEditarPotrero(potreroSeleccionado)}
                    title="Editar potrero"
                    className="text-slate-400 hover:text-emerald-700 p-1 cursor-pointer">
                    <IconEdit size={16} />
                  </button>
                )}
                <button
                  onClick={() => setPotreroSeleccionado(null)}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer">
                  ✕
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-slate-400 text-[10px] block">Superficie</span>
                <span className="font-bold text-white text-base">{potreroSeleccionado.areaHectareas} ha</span>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-slate-400 text-[10px] block">Capacidad</span>
                <span className="font-bold text-white text-base">{potreroSeleccionado.capacidadAnimales || 25} cabezas</span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Pasto:</span>
                <span className="font-semibold text-white">{potreroSeleccionado.tipoPasto || "Pasto Natural"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Descanso Mínimo:</span>
                <span className="font-semibold text-white">{potreroSeleccionado.diasDescansoMinimo || 28} días</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Hato Pastando:</span>
                <span className="font-bold text-emerald-700">{animalesSeleccionados.length} animales</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Animales en este Lote ({animalesSeleccionados.length})
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 text-xs">
                {animalesSeleccionados.length === 0 ? (
                  <div className="text-slate-400 text-xs italic py-2">No hay animales asignados actualmente.</div>
                ) : (
                  animalesSeleccionados.map(a => (
                    <div key={a.id} className="p-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                      <span className="font-mono font-bold text-emerald-700">{a.arete}</span>
                      <span className="text-white font-medium">{a.nombre || a.tipoAnimal}</span>
                      <span className="text-slate-400 text-[11px]">{a.pesoActual} kg</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 space-y-2">
            <button
              onClick={() => onRotarHato(potreroSeleccionado)}
              className="w-full btn-cyber-neon text-white text-xs font-bold py-2.5 rounded-xl shadow-md cursor-pointer text-center hover:scale-105 transition-all">
              Rotar Hato a este Potrero →
            </button>
            {onEditarPotrero && (
              <button
                onClick={() => onEditarPotrero(potreroSeleccionado)}
                className="sm:hidden w-full py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold cursor-pointer">
                Editar potrero
              </button>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
