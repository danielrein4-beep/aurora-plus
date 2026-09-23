import React, { useState, useEffect } from "react";

// El objeto de sesion completo vive en localStorage["aurora_token"] (JSON.stringify),
// no el JWT crudo — hay que extraer el campo .token antes de mandarlo como Bearer.
function obtenerTokenSesion(): string {
  try {
    const raw = localStorage.getItem("aurora_token");
    if (!raw) return "";
    return JSON.parse(raw).token || "";
  } catch {
    return "";
  }
}


interface VisorRadiografiasDentalProps {
  pacienteId: number;
  pacienteNombre?: string;
}

interface RadiografiaItem {
  id: number;
  tipo_estudio: string;
  titulo: string;
  url_archivo: string;
  hallazgos: string | null;
  diente_asociado: number | null;
  fecha_toma: string;
  // PACIENTE = lo subio el propio paciente desde su portal; queda sin revisar hasta que el odontologo lo vea.
  origen?: string;
  revisada?: boolean;
}

export const VisorRadiografiasDental: React.FC<VisorRadiografiasDentalProps> = ({
  pacienteId,
  pacienteNombre,
}) => {
  const [estudios, setEstudios] = useState<RadiografiaItem[]>([]);
  const [seleccionado, setSeleccionado] = useState<RadiografiaItem | null>(null);
  const [cargando, setCargando] = useState(false);

  // Controles de procesamiento visual radiologico
  const [brillo, setBrillo] = useState<number>(100);
  const [contraste, setContraste] = useState<number>(120);
  const [invertido, setInvertido] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);
  const [rotacion, setRotacion] = useState<number>(0);

  // Modal para agregar radiografia
  const [modalSubir, setModalSubir] = useState(false);
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [nuevoTipo, setNuevoTipo] = useState("PANORAMICA");
  const [nuevoDiente, setNuevoDiente] = useState<number | "">("");
  const [nuevosHallazgos, setNuevosHallazgos] = useState("");
  const [nuevaUrl, setNuevaUrl] = useState("");
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const leerImagenComoBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSeleccionarArchivo = async (file: File | null) => {
    if (!file) return;
    setSubiendoArchivo(true);
    try {
      const b64 = await leerImagenComoBase64(file);
      setNuevaUrl(b64);
      if (!nuevoTitulo.trim()) setNuevoTitulo(file.name.replace(/\.[^.]+$/, ""));
    } finally {
      setSubiendoArchivo(false);
    }
  };

  useEffect(() => {
    cargarEstudios();
  }, [pacienteId]);

  const marcarRevisada = async (id: number) => {
    try {
      const res = await fetch(`/api/salud/odontologia/radiografias/${id}/revisada`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${obtenerTokenSesion()}` },
      });
      if (!res.ok) throw new Error(`error ${res.status}`);
      setEstudios((prev) => prev.map((e) => (e.id === id ? { ...e, revisada: true } : e)));
      setSeleccionado((prev) => (prev && prev.id === id ? { ...prev, revisada: true } : prev));
    } catch {
      setMensaje("No se pudo marcar el estudio como revisado.");
    }
  };

  const cargarEstudios = async () => {
    setCargando(true);
    try {
      const token = obtenerTokenSesion();
      const res = await fetch(`/api/salud/odontologia/radiografias?pacienteId=${pacienteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEstudios(data);
        if (data.length > 0) {
          setSeleccionado(data[0]);
        }
      }
    } catch {
      // Fallback
    } finally {
      setCargando(false);
    }
  };

  const handleGuardarRadiografia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoTitulo.trim() || !nuevaUrl.trim()) return;

    try {
      const token = obtenerTokenSesion();
      const res = await fetch("/api/salud/odontologia/radiografias", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pacienteId,
          tipoEstudio: nuevoTipo,
          titulo: nuevoTitulo,
          urlArchivo: nuevaUrl,
          hallazgos: nuevosHallazgos,
          dienteAsociado: nuevoDiente !== "" ? Number(nuevoDiente) : null,
        }),
      });

      if (res.ok) {
        setModalSubir(false);
        setNuevoTitulo("");
        setNuevaUrl("");
        setNuevosHallazgos("");
        setNuevoDiente("");
        setMensaje("Radiografia guardada en el expediente.");
        cargarEstudios();
      } else {
        setMensaje(`No se pudo guardar la radiografia (error ${res.status}).`);
      }
      setTimeout(() => setMensaje(""), 3500);
    } catch {
      setMensaje("Fallo de conexion — la radiografia NO se guardo.");
      setTimeout(() => setMensaje(""), 3500);
    }
  };

  const resetearFiltros = () => {
    setBrillo(100);
    setContraste(120);
    setInvertido(false);
    setZoom(1);
    setRotacion(0);
  };

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100 text-left">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 backdrop-blur-md">
        <div>
          <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white flex items-center gap-2">
            <span>Visor Radiografico Dental de Alto Contraste</span>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40">
              Filtro Negativo & Zoom
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Galeria documental e imagenologia dental para {pacienteNombre || "Paciente Activo"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalSubir(true)}
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs hover:brightness-110 transition cursor-pointer shadow-lg shadow-cyan-500/20 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Adjuntar Radiografia o Foto Clinica</span>
        </button>
      </div>

      {mensaje && (
        <div className="p-3.5 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-xs font-bold">
          {mensaje}
        </div>
      )}

      {/* Galeria y Visor Principal */}
      {estudios.length === 0 ? (
        <div className="p-8 rounded-3xl bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 text-center text-slate-500 dark:text-slate-400 text-xs">
          No hay estudios radiograficos registrados para este paciente. Haga clic en "Adjuntar Radiografia" para comenzar.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Columna Lateral: Listado de Estudios */}
          <div className="space-y-3 lg:col-span-1">
            <div className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider mb-2">
              Estudios Disponibles ({estudios.length})
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {estudios.map((est) => {
                const esActivo = seleccionado?.id === est.id;

                return (
                  <button
                    key={est.id}
                    type="button"
                    onClick={() => {
                      setSeleccionado(est);
                      resetearFiltros();
                    }}
                    className={`w-full p-3.5 rounded-2xl border text-left transition flex flex-col gap-1 ${
                      esActivo
                        ? "bg-cyan-500/20 border-cyan-400 text-slate-900 dark:text-white ring-2 ring-cyan-500/30"
                        : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-cyan-700 dark:text-cyan-300">{est.tipo_estudio}</span>
                      <span className="text-slate-500 dark:text-slate-400">{est.fecha_toma}</span>
                    </div>
                    <div className="font-bold text-xs truncate">{est.titulo}</div>
                    {est.diente_asociado && (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Pieza FDI: {est.diente_asociado}</div>
                    )}
                    {est.origen === "PACIENTE" && (
                      <div
                        className={`text-[10px] font-bold ${
                          est.revisada ? "text-slate-500 dark:text-slate-400" : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {est.revisada ? "Enviado por el paciente" : "Enviado por el paciente - sin revisar"}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Visor Interactivo Central */}
          <div className="lg:col-span-3 space-y-4">
            {seleccionado && (
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 space-y-4 shadow-2xl">
                {/* Barra de herramientas del visor */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
                  <div>
                    <h4 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">{seleccionado.titulo}</h4>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Tipo: {seleccionado.tipo_estudio} &bull; Fecha: {seleccionado.fecha_toma}
                      {seleccionado.diente_asociado && ` • Pieza FDI: ${seleccionado.diente_asociado}`}
                    </span>
                    {seleccionado.origen === "PACIENTE" && !seleccionado.revisada && (
                      <button
                        type="button"
                        onClick={() => marcarRevisada(seleccionado.id)}
                        className="mt-2 block px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-300 text-xs font-bold"
                      >
                        Enviado por el paciente: marcar como revisado
                      </button>
                    )}
                  </div>

                  {/* Controles de Filtros */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Boton Modo Negativo / Invertir */}
                    <button
                      type="button"
                      onClick={() => setInvertido(!invertido)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
                        invertido
                          ? "bg-cyan-500 text-slate-950 border-cyan-400"
                          : "bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-white/15 hover:bg-slate-300 dark:hover:bg-white/15"
                      }`}
                    >
                      <span>Modo Negativo</span>
                    </button>

                    {/* Controles Zoom */}
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
                      className="p-2 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 text-xs font-bold"
                      title="Acercar Zoom"
                    >
                      + Zoom
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.max(z - 0.25, 0.75))}
                      className="p-2 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 text-xs font-bold"
                      title="Alejar Zoom"
                    >
                      - Zoom
                    </button>

                    {/* Rotar */}
                    <button
                      type="button"
                      onClick={() => setRotacion((r) => (r + 90) % 360)}
                      className="p-2 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 text-xs font-bold"
                      title="Rotar 90 grados"
                    >
                      Rotar
                    </button>

                    {/* Reset */}
                    <button
                      type="button"
                      onClick={resetearFiltros}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 text-xs"
                      title="Restablecer"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Sliders de Brillo y Contraste */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-100 dark:bg-white/5 p-3 rounded-2xl border border-slate-200 dark:border-white/10 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 dark:text-slate-400 min-w-[70px]">Brillo: {brillo}%</span>
                    <input
                      type="range"
                      min="50"
                      max="200"
                      value={brillo}
                      onChange={(e) => setBrillo(Number(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 dark:text-slate-400 min-w-[70px]">Contraste: {contraste}%</span>
                    <input
                      type="range"
                      min="50"
                      max="250"
                      value={contraste}
                      onChange={(e) => setContraste(Number(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>
                </div>

                {/* Pantalla del Negatoscopio Digital */}
                <div className="relative w-full h-[450px] bg-black rounded-2xl overflow-hidden border-2 border-cyan-500/30 flex items-center justify-center p-4">
                  <img
                    src={seleccionado.url_archivo}
                    alt={seleccionado.titulo}
                    style={{
                      filter: `brightness(${brillo}%) contrast(${contraste}%) ${invertido ? "invert(1) hue-rotate(180deg)" : ""}`,
                      transform: `scale(${zoom}) rotate(${rotacion}deg)`,
                      transition: "filter 0.15s ease, transform 0.2s ease",
                      maxHeight: "100%",
                      maxWidth: "100%",
                      objectFit: "contain",
                    }}
                    className="select-none pointer-events-auto cursor-grab active:cursor-grabbing"
                  />

                  <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-black/75 border border-slate-300 dark:border-white/20 text-[10px] text-slate-600 dark:text-slate-300 font-mono">
                    Zoom: {Math.round(zoom * 100)}% &bull; Rot: {rotacion}&deg; &bull; Negativo: {invertido ? "ON" : "OFF"}
                  </div>
                </div>

                {/* Hallazgos e interpretacion clinica */}
                {seleccionado.hallazgos && (
                  <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-xs space-y-1">
                    <span className="font-bold text-cyan-700 dark:text-cyan-300 uppercase tracking-wider text-[10px]">
                      Interpretacion Radiologica & Hallazgos:
                    </span>
                    <p className="text-slate-700 dark:text-slate-200">{seleccionado.hallazgos}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Subir Radiografia */}
      {modalSubir && (
        <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/20 rounded-3xl p-6 max-w-lg w-full text-left space-y-4 shadow-2xl">
            <h4 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">Adjuntar Estudio Radiografico</h4>
            <form onSubmit={handleGuardarRadiografia} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-500 dark:text-slate-400 block mb-1">Titulo del Estudio *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Radiografia Panoramica Inicial o Periapical Pieza 24"
                  value={nuevoTitulo}
                  onChange={(e) => setNuevoTitulo(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 dark:text-slate-400 block mb-1">Tipo de Estudio *</label>
                  <select
                    value={nuevoTipo}
                    onChange={(e) => setNuevoTipo(e.target.value)}
                    className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="PANORAMICA">Panoramica (Ortopanto)</option>
                    <option value="PERIAPICAL">Periapical</option>
                    <option value="BITEWING">Aleta de Mordida (Bitewing)</option>
                    <option value="CEFALOMETRICA">Cefalometrica</option>
                    <option value="FOTOGRAFIA_CLINICA">Fotografia Intraoral</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-500 dark:text-slate-400 block mb-1">Pieza FDI Asociada (Opcional)</label>
                  <input
                    type="number"
                    min="11"
                    max="85"
                    placeholder="Ej: 24"
                    value={nuevoDiente}
                    onChange={(e) => setNuevoDiente(e.target.value ? Number(e.target.value) : "")}
                    className="w-full p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white text-center font-bold font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-500 dark:text-slate-400 block mb-1">Imagen del Estudio *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleSeleccionarArchivo(e.target.files?.[0] || null)}
                  className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white text-[11px] file:mr-2 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-cyan-500 file:text-slate-950 file:font-bold file:cursor-pointer cursor-pointer"
                />
                {subiendoArchivo && <p className="text-[11px] text-cyan-600 dark:text-cyan-400 mt-1">Cargando imagen...</p>}
                {nuevaUrl && !subiendoArchivo && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">Imagen lista para guardar.</p>
                )}
                <details className="mt-1.5">
                  <summary className="text-[10px] text-slate-500 dark:text-slate-400 cursor-pointer">O pegar una URL en vez de subir el archivo</summary>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={nuevaUrl.startsWith("data:") ? "" : nuevaUrl}
                    onChange={(e) => setNuevaUrl(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white mt-1.5"
                  />
                </details>
              </div>

              <div>
                <label className="text-slate-500 dark:text-slate-400 block mb-1">Hallazgos y Diagnostico Radiologico</label>
                <textarea
                  rows={2}
                  value={nuevosHallazgos}
                  onChange={(e) => setNuevosHallazgos(e.target.value)}
                  placeholder="Zona radiolucida apical compatible con lesion periapical, reabsorcion osea horizontal leve..."
                  className="w-full p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalSubir(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-black hover:brightness-110 transition"
                >
                  Guardar en Expediente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisorRadiografiasDental;
