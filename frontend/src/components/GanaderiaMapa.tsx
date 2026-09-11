import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { PotreroGanaderia, AnimalGanaderia } from "../api";

interface Props {
  potreros: PotreroGanaderia[];
  animales: AnimalGanaderia[];
  onRotarHato: (potrero: PotreroGanaderia) => void;
  onCrearPotrero: () => void;
  onGuardarPotreroTrazado?: (datos: {
    poligono: [number, number][];
    hectareas: number;
  }) => void;
}

// Coordenadas base de demostración para la finca (Llanos / Región Ganadera)
const FINCA_CENTRO: [number, number] = [8.5520, -70.3650];

// Georreferenciación base de polígonos para cada potrero alrededor del centro de la finca
const POLIGONOS_POTREROS: Record<number, [number, number][]> = {
  101: [
    [8.5540, -70.3680],
    [8.5545, -70.3640],
    [8.5515, -70.3635],
    [8.5510, -70.3675],
  ],
  102: [
    [8.5545, -70.3640],
    [8.5550, -70.3600],
    [8.5520, -70.3595],
    [8.5515, -70.3635],
  ],
  103: [
    [8.5510, -70.3675],
    [8.5515, -70.3635],
    [8.5485, -70.3630],
    [8.5480, -70.3670],
  ],
  104: [
    [8.5515, -70.3635],
    [8.5520, -70.3595],
    [8.5490, -70.3590],
    [8.5485, -70.3630],
  ],
};

// Puntos de interés fijos de la finca
const PUNTOS_INTERES: Array<{ id: string; nombre: string; coords: [number, number]; tipo: string }> = [
  { id: "vaquera", nombre: "Vaquera & Sala de Ordeño", coords: [8.5516, -70.3636], tipo: "ORDEÑO" },
  { id: "corral", nombre: "Corral de Maternidad & Manga", coords: [8.5505, -70.3620], tipo: "MANGA" },
  { id: "tanque", nombre: "Tanque Australiano & Molino", coords: [8.5530, -70.3655], tipo: "AGUA" },
];

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
  onGuardarPotreroTrazado,
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polygonsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const drawingLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [capaActiva, setCapaActiva] = useState<"satelital" | "terreno" | "calles">("satelital");
  const [potreroSeleccionado, setPotreroSeleccionado] = useState<PotreroGanaderia | null>(null);
  const [busquedaLugar, setBusquedaLugar] = useState("");

  // Estado del Modo Trazar Potrero interactivo
  const [modoTrazar, setModoTrazar] = useState(false);
  const [verticesTrazado, setVerticesTrazado] = useState<[number, number][]>([]);

  const hectareasTrazadas = calcularHectareasPoligono(verticesTrazado);

  // Inicializar mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: FINCA_CENTRO,
      zoom: 16,
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

    const polyGroup = L.layerGroup().addTo(map);
    polygonsLayerGroupRef.current = polyGroup;

    const drawGroup = L.layerGroup().addTo(map);
    drawingLayerGroupRef.current = drawGroup;

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
    (map as any)._currentBaseLayer = newLayer;
  }, [capaActiva]);

  // Manejar clics en el mapa durante el Modo Trazar
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (modoTrazar) {
      map.getContainer().style.cursor = "crosshair";

      const handleMapClick = (e: L.LeafletMouseEvent) => {
        const nuevaCoord: [number, number] = [Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6))];
        setVerticesTrazado(prev => [...prev, nuevaCoord]);
      };

      map.on("click", handleMapClick);

      return () => {
        map.off("click", handleMapClick);
        map.getContainer().style.cursor = "";
      };
    } else {
      map.getContainer().style.cursor = "";
    }
  }, [modoTrazar]);

  // Renderizar vértices y polígono interactivo mientras se dibuja
  useEffect(() => {
    const group = drawingLayerGroupRef.current;
    if (!group) return;

    group.clearLayers();

    if (!modoTrazar || verticesTrazado.length === 0) return;

    // Marcador para cada vértice (poste de cerca)
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

    // Líneas entre vértices
    if (verticesTrazado.length >= 2) {
      const polyline = L.polyline(verticesTrazado, {
        color: "#00FFC2",
        weight: 3,
        dashArray: "6, 6",
      });
      group.addLayer(polyline);
    }

    // Polígono cerrado preliminar cuando hay 3 o más puntos
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

  // Dibujar potreros guardados y puntos de interés sobre el mapa
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = polygonsLayerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    // Dibujar cada potrero como polígono georreferenciado
    potreros.forEach((pot, idx) => {
      // Coordenadas personalizadas si fueron trazadas, o base fija
      const coords = (pot.poligono && pot.poligono.length >= 3)
        ? pot.poligono
        : (POLIGONOS_POTREROS[pot.id] || [
            [FINCA_CENTRO[0] + (idx * 0.003), FINCA_CENTRO[1] + (idx * 0.003)],
            [FINCA_CENTRO[0] + (idx * 0.003), FINCA_CENTRO[1] + 0.003 + (idx * 0.003)],
            [FINCA_CENTRO[0] - 0.002 + (idx * 0.003), FINCA_CENTRO[1] + 0.003 + (idx * 0.003)],
            [FINCA_CENTRO[0] - 0.002 + (idx * 0.003), FINCA_CENTRO[1] + (idx * 0.003)],
          ]);

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
        if (!modoTrazar) {
          setPotreroSeleccionado(pot);
        }
      });

      polygon.addTo(group);

      // Centroide para etiqueta flotante
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
        if (!modoTrazar) {
          setPotreroSeleccionado(pot);
        }
      });
      marker.addTo(group);
    });

    // Puntos de interés (Vaquera, mangas, corrales)
    PUNTOS_INTERES.forEach(pt => {
      const pinIcon = L.divIcon({
        className: "bg-transparent border-0",
        html: `
          <div style="
            transform: translate(-50%, -50%);
            background: rgba(11, 61, 145, 0.9);
            border: 1px solid #38BDF8;
            border-radius: 8px;
            padding: 2px 8px;
            color: #E0F2FE;
            font-size: 10px;
            font-weight: 600;
            white-space: nowrap;
            box-shadow: 0 2px 10px rgba(0,0,0,0.4);
          ">
            ${pt.nombre}
          </div>
        `,
      });

      L.marker(pt.coords, { icon: pinIcon }).addTo(group);
    });
  }, [potreros, animales, modoTrazar]);

  // Manejador de zoom
  const handleZoom = (delta: number) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.setZoom(map.getZoom() + delta);
  };

  // Centrar mapa en la finca
  const handleCentrarFinca = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo(FINCA_CENTRO, 16, { duration: 1.2 });
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
    <div className="relative w-full h-[680px] rounded-3xl overflow-hidden border border-slate-300/60 dark:border-white/10 shadow-2xl flex flex-col font-['Inter']">
      
      {/* ── BARRA DE HERRAMIENTAS SUPERIOR DEL MAPA ── */}
      <div className="absolute top-4 left-4 right-4 z-[500] flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        
        {/* Izquierda: Buscador & Centrar */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="apple-glass rounded-2xl px-3.5 py-2 border border-white/20 shadow-lg flex items-center gap-2 bg-slate-900/80 backdrop-blur-xl">
            <span className="text-slate-400 text-xs font-semibold">Finca:</span>
            <span className="font-['Outfit'] font-bold text-xs text-white">Santa Elena • Llanos</span>
            <button
              onClick={handleCentrarFinca}
              className="text-[11px] font-bold text-emerald-400 hover:underline ml-2 cursor-pointer"
              title="Centrar en las coordenadas de la finca">
              Centrar
            </button>
          </div>

          <div className="hidden sm:flex apple-glass rounded-2xl px-3 py-1.5 border border-white/15 bg-slate-900/75 backdrop-blur-xl">
            <input
              type="text"
              placeholder="Buscar potrero o coordenada..."
              value={busquedaLugar}
              onChange={e => setBusquedaLugar(e.target.value)}
              className="bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none w-48"
            />
          </div>
        </div>

        {/* Derecha: Selector de Capas, Modo Trazar & Agregar Potrero */}
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

          {/* Botón Trazar Potrero Interactivo */}
          <button
            onClick={() => {
              if (modoTrazar) {
                handleCancelarTrazado();
              } else {
                setModoTrazar(true);
                setPotreroSeleccionado(null);
              }
            }}
            className={`text-xs font-bold px-3.5 py-2 rounded-2xl shadow-lg cursor-pointer transition-all border ${
              modoTrazar
                ? "bg-amber-500 text-slate-950 border-amber-300 font-extrabold scale-105"
                : "bg-slate-900/80 text-emerald-400 border-emerald-400/50 hover:bg-emerald-500/20"
            }`}>
            {modoTrazar ? "Cancelar Trazado" : "Trazar en Mapa"}
          </button>

          <button
            onClick={onCrearPotrero}
            className="btn-cyber-neon text-white text-xs font-bold px-4 py-2 rounded-2xl shadow-lg cursor-pointer hover:scale-105 transition-all">
            + Agregar Potrero
          </button>
        </div>
      </div>

      {/* ── BANNER ASISTENTE FLOTANTE DURANTE MODO TRAZAR ── */}
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
          <span>Potrero Activo (En Uso)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-md bg-amber-400/40 border border-amber-400 border-dashed" />
          <span>Potrero en Descanso Agronómico</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-md bg-sky-400/40 border border-sky-400" />
          <span>Instalaciones (Ordeño / Corrales)</span>
        </div>
      </div>

      {/* ── CONTENEDOR DEL MAPA LEAFLET ── */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* ── PANEL LATERAL FLOTANTE: DETALLE DEL POTRERO SELECCIONADO ── */}
      {potreroSeleccionado && !modoTrazar && (
        <div className="absolute top-20 right-4 bottom-4 w-80 sm:w-96 z-[500] apple-glass rounded-3xl p-5 border border-emerald-500/40 bg-slate-950/90 backdrop-blur-2xl shadow-2xl flex flex-col justify-between text-left pointer-events-auto animate-fade-in">
          
          <div className="space-y-4">
            {/* Cabecera del Panel */}
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
              <button
                onClick={() => setPotreroSeleccionado(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer">
                ✕
              </button>
            </div>

            {/* Métricas Agronómicas */}
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

            {/* Detalles del Forraje */}
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

            {/* Animales Presentes */}
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

          {/* Botón de Acción de Rotación */}
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
