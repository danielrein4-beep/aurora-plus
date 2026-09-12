import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { PotreroGanaderia, AnimalGanaderia } from "../api";
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
}: Props) {
  const { user } = useAuth();
  const effectiveTenantId = propTenantId || (user?.tenantId ? Number(user.tenantId) : 1);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polygonsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const drawingLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const pointsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const fincaMarkerRef = useRef<L.Marker | null>(null);
  const referenceLayerRef = useRef<L.TileLayer | null>(null);

  const [capaActiva, setCapaActiva] = useState<"satelital" | "terreno" | "calles">("satelital");
  const [potreroSeleccionado, setPotreroSeleccionado] = useState<PotreroGanaderia | null>(null);
  const [busquedaLugar, setBusquedaLugar] = useState("");
  const [busquedaError, setBusquedaError] = useState<string | null>(null);

  // ── ESTADO DE CONFIGURACIÓN REAL DE LA FINCA (PERSISTIDA POR TENANT) ──
  const [fincaConfig, setFincaConfig] = useState<FincaConfig>(() => {
    try {
      const raw = localStorage.getItem(`aurora_finca_config_${effectiveTenantId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.coords && parsed.nombre) {
          return { nombre: parsed.nombre, coords: parsed.coords, guardada: true };
        }
      }
    } catch {}
    return { nombre: "", coords: PANORAMA_INICIAL, guardada: false };
  });

  // ── PUNTOS DE REFERENCIA / INSTALACIONES (CREADOS POR EL USUARIO) ──
  const [puntosInteres, setPuntosInteres] = useState<PuntoInteresFinca[]>(() => {
    try {
      const raw = localStorage.getItem(`aurora_finca_puntos_${effectiveTenantId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

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
            background: ${isFirst ? "#00FFC2" : "#38BDF8"};
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
        color: "#00FFC2",
        weight: 3,
        dashArray: "6, 6",
      });
      group.addLayer(polyline);
    }

    if (verticesTrazado.length >= 3) {
      const polygonPreview = L.polygon(verticesTrazado, {
        color: "#00FFC2",
        weight: 2,
        fillColor: "#00FFC2",
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

    // Dibujar cada potrero que tenga polígono trazado (o alrededor de la finca si está ubicada)
    potreros.forEach((pot, idx) => {
      let coords: [number, number][] | undefined = undefined;

      if (pot.poligono && pot.poligono.length >= 3) {
        coords = pot.poligono;
      } else if (fincaConfig.guardada) {
        const base = fincaConfig.coords;
        coords = [
          [base[0] + (idx * 0.002) + 0.001, base[1] + (idx * 0.002) - 0.001],
          [base[0] + (idx * 0.002) + 0.001, base[1] + (idx * 0.002) + 0.002],
          [base[0] + (idx * 0.002) - 0.0015, base[1] + (idx * 0.002) + 0.002],
          [base[0] + (idx * 0.002) - 0.0015, base[1] + (idx * 0.002) - 0.001],
        ];
      }

      if (!coords) return;

      const enDescanso = pot.estado === "EN_DESCANSO";
      const colorBorde = pot.color || (enDescanso ? "#F59E0B" : "#00FFC2");
      const colorRelleno = pot.color || (enDescanso ? "#F59E0B" : "#00C9A7");

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
            ${animalesEnPotrero.length > 0 ? `<span style="background: rgba(0,255,194,0.2); color: #00FFC2; border-radius: 9999px; padding: 1px 6px; font-size: 10px;">${animalesEnPotrero.length} anim.</span>` : ""}
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
  const handleGuardarUbicacionFinca = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!coordsTempFinca) return;

    const nombreLimpio = nombreFincaInput.trim() || "Mi Finca";
    const nuevaConfig: FincaConfig = {
      nombre: nombreLimpio,
      coords: coordsTempFinca,
      guardada: true,
    };

    setFincaConfig(nuevaConfig);
    try {
      localStorage.setItem(`aurora_finca_config_${effectiveTenantId}`, JSON.stringify(nuevaConfig));
    } catch {}

    setModalGuardarFinca(false);
    setCoordsTempFinca(null);

    const map = mapInstanceRef.current;
    if (map) {
      map.flyTo(nuevaConfig.coords, 15, { duration: 1.0 });
    }
  };

  // Guardar un nuevo punto de referencia / instalación
  const handleGuardarNuevoPunto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoPuntoForm.coords || !nuevoPuntoForm.nombre.trim()) return;

    const nuevo: PuntoInteresFinca = {
      id: `pt_${Date.now()}`,
      nombre: nuevoPuntoForm.nombre.trim(),
      tipo: nuevoPuntoForm.tipo,
      coords: nuevoPuntoForm.coords,
    };

    const actualizados = [...puntosInteres, nuevo];
    setPuntosInteres(actualizados);
    try {
      localStorage.setItem(`aurora_finca_puntos_${effectiveTenantId}`, JSON.stringify(actualizados));
    } catch {}

    setModalNuevoPunto(false);
    setNuevoPuntoForm({ nombre: "", tipo: "ORDENO", coords: null });
  };

  // Eliminar un punto de referencia
  const handleEliminarPunto = (id: string) => {
    const filtrados = puntosInteres.filter(p => p.id !== id);
    setPuntosInteres(filtrados);
    try {
      localStorage.setItem(`aurora_finca_puntos_${effectiveTenantId}`, JSON.stringify(filtrados));
    } catch {}
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
  };

  const animalesSeleccionados = potreroSeleccionado
    ? animales.filter(a => a.potrero?.id === potreroSeleccionado.id)
    : [];

  return (
    <div className="modal-siempre-oscuro relative w-full h-[680px] rounded-3xl overflow-hidden border border-slate-300/60 dark:border-white/10 shadow-2xl flex flex-col font-['Inter']">
      
      {/* ── BARRA DE HERRAMIENTAS SUPERIOR DEL MAPA ── */}
      <div className="absolute top-4 left-4 right-4 z-[500] flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        
        {/* Izquierda: Buscador & Centrar */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="apple-glass rounded-2xl px-3.5 py-2 border border-white/20 shadow-lg flex items-center gap-2 bg-slate-900/80 backdrop-blur-xl">
            <span className="text-slate-400 text-xs font-semibold">Finca:</span>
            <span className="font-['Outfit'] font-bold text-xs text-white">
              {fincaConfig.guardada ? fincaConfig.nombre : "Sin ubicar"}
            </span>

            {fincaConfig.guardada ? (
              <div className="flex items-center gap-1.5 ml-1">
                <button
                  onClick={handleCentrarFinca}
                  className="text-[11px] font-bold text-emerald-400 hover:underline cursor-pointer"
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
                  ✎ Editar
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setModoFijarFinca(true);
                  setModoTrazar(false);
                  setModoAgregarPunto(false);
                }}
                className="text-[11px] font-bold text-amber-400 hover:underline ml-1 cursor-pointer">
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

        {/* Derecha: Selector de Capas, Modo Trazar, Instalaciones & Agregar Potrero */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="apple-glass rounded-2xl p-1 border border-white/15 shadow-lg flex items-center gap-1 bg-slate-900/80 backdrop-blur-xl text-xs font-semibold">
            <button
              onClick={() => setCapaActiva("satelital")}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                capaActiva === "satelital"
                  ? "bg-emerald-500 text-white shadow-md font-bold"
                  : "text-slate-300 hover:text-white"
              }`}>
              Satelital
            </button>
            <button
              onClick={() => setCapaActiva("terreno")}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                capaActiva === "terreno"
                  ? "bg-emerald-500 text-white shadow-md font-bold"
                  : "text-slate-300 hover:text-white"
              }`}>
              Terreno
            </button>
            <button
              onClick={() => setCapaActiva("calles")}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                capaActiva === "calles"
                  ? "bg-emerald-500 text-white shadow-md font-bold"
                  : "text-slate-300 hover:text-white"
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
                : "bg-slate-900/80 text-sky-400 border-sky-400/50 hover:bg-sky-500/20"
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
                : "bg-slate-900/80 text-emerald-400 border-emerald-400/50 hover:bg-emerald-500/20"
            }`}>
            {modoTrazar ? "Cancelar Trazado" : "Trazar Potrero"}
          </button>

          <button
            onClick={onCrearPotrero}
            className="btn-cyber-neon text-white text-xs font-bold px-4 py-2 rounded-2xl shadow-lg cursor-pointer hover:scale-105 transition-all">
            + Agregar Potrero
          </button>
        </div>
      </div>

      {/* ── BANNER HONESTO DE ESTADO VACÍO (SIN UBICACIÓN GUARDADA) ── */}
      {!fincaConfig.guardada && !modoFijarFinca && (
        <div className="absolute top-18 left-1/2 -translate-x-1/2 z-[550] apple-glass rounded-2xl px-5 py-2.5 border border-amber-400/60 bg-slate-950/90 backdrop-blur-2xl shadow-2xl flex flex-wrap items-center gap-3 text-xs pointer-events-auto animate-fade-in">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-slate-200">
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
        <div className="absolute top-18 left-1/2 -translate-x-1/2 z-[600] apple-glass rounded-2xl px-5 py-2.5 border border-amber-400 bg-slate-950/95 backdrop-blur-2xl shadow-2xl flex items-center gap-4 text-xs pointer-events-auto animate-fade-in">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          <span className="font-['Outfit'] font-bold text-white text-sm">
            Modo Ubicar Finca:
          </span>
          <span className="text-slate-200">
            Haz clic exactamente sobre la sede o entrada de tu finca en el mapa satelital.
          </span>
          <button
            onClick={() => setModoFijarFinca(false)}
            className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 font-medium cursor-pointer">
            Cancelar
          </button>
        </div>
      )}

      {/* ── BANNER ASISTENTE AL AGREGAR PUNTO DE REFERENCIA ── */}
      {modoAgregarPunto && (
        <div className="absolute top-18 left-1/2 -translate-x-1/2 z-[600] apple-glass rounded-2xl px-5 py-2.5 border border-sky-400 bg-slate-950/95 backdrop-blur-2xl shadow-2xl flex items-center gap-4 text-xs pointer-events-auto animate-fade-in">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
          <span className="font-['Outfit'] font-bold text-white text-sm">
            Agregar Instalación:
          </span>
          <span className="text-slate-200">
            Haz clic en el mapa donde se ubica tu vaquera, corral, manga o tanque.
          </span>
          <button
            onClick={() => setModoAgregarPunto(false)}
            className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 font-medium cursor-pointer">
            Cancelar
          </button>
        </div>
      )}

      {/* ── BANNER ASISTENTE FLOTANTE DURANTE MODO TRAZAR POTRERO ── */}
      {modoTrazar && (
        <div className="absolute top-18 left-1/2 -translate-x-1/2 z-[600] apple-glass rounded-2xl px-5 py-2.5 border border-emerald-400 bg-slate-950/90 backdrop-blur-2xl shadow-2xl flex items-center gap-4 text-xs pointer-events-auto animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-['Outfit'] font-bold text-white text-sm">
              Trazador de Potrero Activo
            </span>
          </div>

          <div className="h-4 w-px bg-white/20" />

          <div className="text-slate-300">
            {verticesTrazado.length === 0 ? (
              <span>Haz clic en el mapa satelital para marcar el primer poste de la cerca.</span>
            ) : verticesTrazado.length < 3 ? (
              <span>
                <strong>{verticesTrazado.length}</strong> {verticesTrazado.length === 1 ? "vértice" : "vértices"} marcados (mínimo 3 requeridos).
              </span>
            ) : (
              <span className="text-emerald-400 font-bold">
                {verticesTrazado.length} vértices • Superficie calculada: {hectareasTrazadas} ha
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-2">
            {verticesTrazado.length > 0 && (
              <button
                onClick={handleDeshacerVertice}
                className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 font-medium cursor-pointer transition-all">
                Deshacer
              </button>
            )}

            <button
              onClick={handleFinalizarTrazado}
              disabled={verticesTrazado.length < 3}
              className="px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black cursor-pointer shadow-md transition-all">
              Guardar Potrero ({hectareasTrazadas} ha)
            </button>
          </div>
        </div>
      )}

      {/* ── CONTROLES DE ZOOM LATERALES ── */}
      <div className="absolute top-20 left-4 z-[500] flex flex-col gap-1.5 pointer-events-auto">
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
      <div className="absolute bottom-4 left-4 z-[500] apple-glass rounded-2xl p-2.5 border border-white/15 bg-slate-900/85 backdrop-blur-xl shadow-lg text-[11px] text-slate-300 space-y-1.5 pointer-events-auto">
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
              <label className="block text-xs font-semibold text-slate-300 mb-1">
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

            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] font-mono text-slate-300 space-y-1">
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
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-medium cursor-pointer">
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
              <label className="block text-xs font-semibold text-slate-300 mb-1">
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
              <label className="block text-xs font-semibold text-slate-300 mb-1">
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

            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-mono text-slate-300">
              Coordenadas: {nuevoPuntoForm.coords[0].toFixed(6)}, {nuevoPuntoForm.coords[1].toFixed(6)}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setModalNuevoPunto(false);
                  setNuevoPuntoForm({ nombre: "", tipo: "ORDENO", coords: null });
                }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-medium cursor-pointer">
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
        <div className="absolute top-20 right-4 bottom-4 w-80 sm:w-96 z-[500] apple-glass rounded-3xl p-5 border border-emerald-500/40 bg-slate-950/90 backdrop-blur-2xl shadow-2xl flex flex-col justify-between text-left pointer-events-auto animate-fade-in">
          
          <div className="space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-white/10">
              <div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                  potreroSeleccionado.estado === "EN_DESCANSO"
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
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
                    className="text-slate-400 hover:text-emerald-400 p-1 cursor-pointer">
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

            <div className="space-y-2 text-xs text-slate-300">
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
                <span className="font-bold text-emerald-400">{animalesSeleccionados.length} animales</span>
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
                      <span className="font-mono font-bold text-emerald-400">{a.arete}</span>
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
          </div>

        </div>
      )}

    </div>
  );
}
