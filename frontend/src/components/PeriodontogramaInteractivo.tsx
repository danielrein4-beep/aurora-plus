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


interface PeriodontogramaInteractivoProps {
  pacienteId: number;
  pacienteNombre?: string;
}

interface FilaPeriodonto {
  dienteFdi: number;
  sondajeMv: number;
  sondajeV: number;
  sondajeDv: number;
  sondajeMl: number;
  sondajeL: number;
  sondajeDl: number;
  // Margen gingival en mm respecto al limite amelocementario:
  // positivo = recesion, negativo = agrandamiento. NIC = sondaje + margen.
  margenMv: number;
  margenV: number;
  margenDv: number;
  margenMl: number;
  margenL: number;
  margenDl: number;
  sangradoBop: boolean;
  placa: boolean;
  movilidad: number;
  furca: number;
  notas: string;
}

// Dientes permanentes FDI: Cuadrantes 1 y 2 (Superior), 4 y 3 (Inferior)
const DIENTES_SUPERIORES = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const DIENTES_INFERIORES = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

// Solo los molares (ultimo digito FDI 6, 7 u 8) son multirradiculares — incisivos,
// caninos y premolares tienen raiz unica y no pueden presentar lesion de furca.
const esPiezaMultirradicular = (fdi: number): boolean => {
  const p = fdi % 10;
  return p >= 6 && p <= 8;
};

type Sitio = "Mv" | "V" | "Dv" | "Ml" | "L" | "Dl";

const SITIOS_VESTIBULAR: { id: Sitio; nombre: string }[] = [
  { id: "Mv", nombre: "Mesio-Vestibular" },
  { id: "V", nombre: "Medio-Vestibular" },
  { id: "Dv", nombre: "Disto-Vestibular" },
];

const SITIOS_LINGUAL: { id: Sitio; nombre: string }[] = [
  { id: "Ml", nombre: "Mesio-Lingual" },
  { id: "L", nombre: "Medio-Lingual" },
  { id: "Dl", nombre: "Disto-Lingual" },
];

const SITIOS: Sitio[] = ["Mv", "V", "Dv", "Ml", "L", "Dl"];

const sitioSnake: Record<Sitio, string> = { Mv: "mv", V: "v", Dv: "dv", Ml: "ml", L: "l", Dl: "dl" };

const filaDesdeApi = (f: any): FilaPeriodonto => ({
  dienteFdi: f.diente_fdi,
  sondajeMv: f.sondaje_mv || 1,
  sondajeV: f.sondaje_v || 1,
  sondajeDv: f.sondaje_dv || 1,
  sondajeMl: f.sondaje_ml || 1,
  sondajeL: f.sondaje_l || 1,
  sondajeDl: f.sondaje_dl || 1,
  margenMv: f.margen_mv || 0,
  margenV: f.margen_v || 0,
  margenDv: f.margen_dv || 0,
  margenMl: f.margen_ml || 0,
  margenL: f.margen_l || 0,
  margenDl: f.margen_dl || 0,
  sangradoBop: Boolean(f.sangrado_bop),
  placa: Boolean(f.placa),
  movilidad: f.movilidad || 0,
  furca: f.furca || 0,
  notas: f.notas || "",
});

const maxSondajeDe = (d: FilaPeriodonto) => Math.max(...SITIOS.map((s) => d[`sondaje${s}` as keyof FilaPeriodonto] as number));

const maxNicDe = (d: FilaPeriodonto) =>
  Math.max(...SITIOS.map((s) => (d[`sondaje${s}` as keyof FilaPeriodonto] as number) + (d[`margen${s}` as keyof FilaPeriodonto] as number)));

export const PeriodontogramaInteractivo: React.FC<PeriodontogramaInteractivoProps> = ({
  pacienteId,
  pacienteNombre,
}) => {
  const [datos, setDatos] = useState<Record<number, FilaPeriodonto>>({});
  const [dienteActivo, setDienteActivo] = useState<number>(11);
  const [cargando, setCargando] = useState<boolean>(false);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [mensaje, setMensaje] = useState<string>("");
  // Comparacion con un examen anterior: fecha elegida y el estado de cada pieza a esa fecha.
  const [fechasHistorial, setFechasHistorial] = useState<string[]>([]);
  const [fechaComparar, setFechaComparar] = useState<string>("");
  const [datosPrevios, setDatosPrevios] = useState<Record<number, FilaPeriodonto>>({});

  const cargarHistorial = async (fecha: string) => {
    try {
      const qs = fecha ? `&fecha=${fecha}` : "";
      const res = await fetch(`/api/salud/odontologia/periodontograma/historial?pacienteId=${pacienteId}${qs}`, {
        headers: { Authorization: `Bearer ${obtenerTokenSesion()}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setFechasHistorial(data.fechas || []);
      const mapa: Record<number, FilaPeriodonto> = {};
      for (const f of data.filas || []) mapa[f.diente_fdi] = filaDesdeApi(f);
      setDatosPrevios(mapa);
    } catch {
      // Sin historial disponible: la comparacion simplemente no se muestra.
    }
  };

  useEffect(() => {
    setFechaComparar("");
    setDatosPrevios({});
    cargarHistorial("");
  }, [pacienteId]);

  useEffect(() => {
    cargarPeriodontograma();
  }, [pacienteId]);

  const cargarPeriodontograma = async () => {
    setCargando(true);
    try {
      const token = obtenerTokenSesion();
      const res = await fetch(`/api/salud/odontologia/periodontograma?pacienteId=${pacienteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const mapa: Record<number, FilaPeriodonto> = {};
        if (data.filas) {
          for (const f of data.filas) {
            mapa[f.diente_fdi] = filaDesdeApi(f);
          }
        }
        setDatos(mapa);
      }
    } catch {
      // Usar estado local si hay error de red
    } finally {
      setCargando(false);
    }
  };

  const getDiente = (fdi: number): FilaPeriodonto => {
    return (
      datos[fdi] || {
        dienteFdi: fdi,
        sondajeMv: 1,
        sondajeV: 1,
        sondajeDv: 1,
        sondajeMl: 1,
        sondajeL: 1,
        sondajeDl: 1,
        margenMv: 0,
        margenV: 0,
        margenDv: 0,
        margenMl: 0,
        margenL: 0,
        margenDl: 0,
        sangradoBop: false,
        placa: false,
        movilidad: 0,
        furca: 0,
        notas: "",
      }
    );
  };

  const actualizarValor = (fdi: number, campo: keyof FilaPeriodonto, valor: any) => {
    setDatos((prev) => ({
      ...prev,
      [fdi]: {
        ...getDiente(fdi),
        [campo]: valor,
      },
    }));
  };

  // Los inputs de sondaje son type="text" (no type="number") a proposito: con
  // type="number" React no siempre redibuja el "03" residual al escribir un digito
  // despues de un 0, porque Number("03") === 3 y React ve el mismo valor. Con texto
  // controlamos el string mostrado directamente y el glitch desaparece.
  const manejarCambioSondaje = (campo: keyof FilaPeriodonto, texto: string) => {
    const soloDigitos = texto.replace(/\D/g, "");
    const num = soloDigitos === "" ? 0 : Math.min(12, parseInt(soloDigitos, 10));
    actualizarValor(dienteActivo, campo, num);
  };

  // El margen admite negativos (agrandamiento gingival); "-" solo se deja pasar mientras se escribe.
  const [margenEnEdicion, setMargenEnEdicion] = useState<{ campo: string; texto: string } | null>(null);
  const manejarCambioMargen = (campo: keyof FilaPeriodonto, texto: string) => {
    const limpio = texto.replace(/[^\d-]/g, "").replace(/(?!^)-/g, "");
    setMargenEnEdicion({ campo, texto: limpio });
    if (limpio === "" || limpio === "-") {
      actualizarValor(dienteActivo, campo, 0);
      return;
    }
    actualizarValor(dienteActivo, campo, Math.max(-10, Math.min(15, parseInt(limpio, 10))));
  };

  const guardarDienteActual = async (fdi: number) => {
    setGuardando(true);
    const d = getDiente(fdi);
    try {
      const token = obtenerTokenSesion();
      const res = await fetch("/api/salud/odontologia/periodontograma", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pacienteId,
          dienteFdi: fdi,
          sondajeMv: d.sondajeMv,
          sondajeV: d.sondajeV,
          sondajeDv: d.sondajeDv,
          sondajeMl: d.sondajeMl,
          sondajeL: d.sondajeL,
          sondajeDl: d.sondajeDl,
          margenMv: d.margenMv,
          margenV: d.margenV,
          margenDv: d.margenDv,
          margenMl: d.margenMl,
          margenL: d.margenL,
          margenDl: d.margenDl,
          sangradoBop: d.sangradoBop,
          placa: d.placa,
          movilidad: d.movilidad,
          furca: d.furca,
          notas: d.notas,
        }),
      });
      if (res.ok) {
        setMensaje(`Pieza ${fdi} guardada.`);
        cargarHistorial(fechaComparar);
      } else {
        setMensaje(`No se pudo guardar la pieza ${fdi} (error ${res.status}). Intenta de nuevo.`);
      }
      setTimeout(() => setMensaje(""), 3500);
    } catch {
      setMensaje("Fallo de conexion — la medicion NO se guardo. Verifica tu internet e intenta de nuevo.");
      setTimeout(() => setMensaje(""), 3500);
    } finally {
      setGuardando(false);
    }
  };

  // Metricas globales del paciente
  const totalPiezasRegistradas = Object.keys(datos).length;
  const piezasConSangrado = Object.values(datos).filter((d) => d.sangradoBop).length;
  const bolsasProfundas = Object.values(datos).filter(
    (d) =>
      d.sondajeMv >= 5 ||
      d.sondajeV >= 5 ||
      d.sondajeDv >= 5 ||
      d.sondajeMl >= 5 ||
      d.sondajeL >= 5 ||
      d.sondajeDl >= 5
  ).length;
  const indiceBop = totalPiezasRegistradas > 0 ? Math.round((piezasConSangrado / totalPiezasRegistradas) * 100) : 0;
  const nicMaximo = Object.values(datos).reduce((max, d) => Math.max(max, maxNicDe(d)), 0);

  const colorProfundidad = (mm: number) => {
    if (mm <= 3) return "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    if (mm <= 5) return "text-amber-600 dark:text-amber-400 bg-amber-500/15 border-amber-500/40";
    return "text-rose-600 dark:text-rose-400 bg-rose-500/20 border-rose-500/50 font-bold";
  };

  const cur = getDiente(dienteActivo);

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100 text-left">
      {/* Cabecera y Metricas Periodontales */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 backdrop-blur-md">
        <div>
          <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white flex items-center gap-2">
            <span>Periodontograma Clinico (Sondaje de 6 Puntos)</span>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/40">
              Profundidad & BOP
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Evaluacion milimetrica de bolsas periodontales para {pacienteNombre || "Paciente Activo"}
          </p>
        </div>

        {/* Tarjetas de Diagnostico Rapido */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="p-3 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center min-w-[130px]">
            <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-semibold">Comparar con</div>
            <select
              value={fechaComparar}
              onChange={(e) => {
                setFechaComparar(e.target.value);
                if (e.target.value) cargarHistorial(e.target.value);
                else setDatosPrevios({});
              }}
              className="mt-1 bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="">Sin comparar</option>
              {fechasHistorial.map((f) => (
                <option key={f} value={f}>
                  {new Date(`${f}T00:00:00`).toLocaleDateString("es-VE")}
                </option>
              ))}
            </select>
          </label>
          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center min-w-[90px]">
            <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-semibold">BOP Sangrado</div>
            <div className={`text-xl font-black font-['Outfit'] ${indiceBop > 25 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
              {indiceBop}%
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center min-w-[90px]">
            <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-semibold">Bolsas &ge; 5mm</div>
            <div className={`text-xl font-black font-['Outfit'] ${bolsasProfundas > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
              {bolsasProfundas}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center min-w-[90px]">
            <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-semibold">NIC max.</div>
            <div className={`text-xl font-black font-['Outfit'] ${nicMaximo >= 5 ? "text-rose-600 dark:text-rose-400" : nicMaximo >= 3 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
              {nicMaximo}mm
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center min-w-[90px]">
            <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-semibold">Piezas</div>
            <div className="text-xl font-black font-['Outfit'] text-slate-900 dark:text-white">
              {totalPiezasRegistradas}/32
            </div>
          </div>
        </div>
      </div>

      {/* Selector de Arcadas Dentales */}
      <div className="space-y-4 p-5 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10">
        <div>
          <span className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
            Arcada Superior (Maxilar)
          </span>
          <div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5 mt-2">
            {DIENTES_SUPERIORES.map((fdi) => {
              const medido = datos[fdi] !== undefined;
              const d = getDiente(fdi);
              const maxSondaje = Math.max(d.sondajeMv, d.sondajeV, d.sondajeDv, d.sondajeMl, d.sondajeL, d.sondajeDl);
              const esActivo = dienteActivo === fdi;

              return (
                <button
                  key={fdi}
                  type="button"
                  onClick={() => setDienteActivo(fdi)}
                  className={`p-2 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                    esActivo
                      ? "bg-emerald-500/25 border-emerald-400 text-slate-900 dark:text-white ring-2 ring-emerald-500/40"
                      : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <span className="text-xs font-black">{fdi}</span>
                  {medido ? (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        maxSondaje >= 5 ? "bg-rose-500/30 text-rose-700 dark:text-rose-300" : (maxSondaje >= 4 ? "bg-amber-500/30 text-amber-700 dark:text-amber-300" : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300")
                      }`}
                    >
                      {maxSondaje}mm
                    </span>
                  ) : (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400"
                      title="Pieza sin sondaje registrado"
                    >
                      Sin medir
                    </span>
                  )}
                  {d.sangradoBop && <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>}
                  {fechaComparar && medido && datosPrevios[fdi] && (() => {
                    const delta = maxSondaje - maxSondajeDe(datosPrevios[fdi]);
                    if (delta === 0) return <span className="text-[9px] font-bold text-slate-400">=</span>;
                    return (
                      <span
                        className={`text-[9px] font-black ${delta > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}
                        title={`Profundidad maxima ${delta > 0 ? "aumento" : "disminuyo"} ${Math.abs(delta)} mm desde ${fechaComparar}`}
                      >
                        {delta > 0 ? `+${delta}` : delta}
                      </span>
                    );
                  })()}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 dark:border-white/10">
          <span className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
            Arcada Inferior (Mandibula)
          </span>
          <div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5 mt-2">
            {DIENTES_INFERIORES.map((fdi) => {
              const medido = datos[fdi] !== undefined;
              const d = getDiente(fdi);
              const maxSondaje = Math.max(d.sondajeMv, d.sondajeV, d.sondajeDv, d.sondajeMl, d.sondajeL, d.sondajeDl);
              const esActivo = dienteActivo === fdi;

              return (
                <button
                  key={fdi}
                  type="button"
                  onClick={() => setDienteActivo(fdi)}
                  className={`p-2 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                    esActivo
                      ? "bg-emerald-500/25 border-emerald-400 text-slate-900 dark:text-white ring-2 ring-emerald-500/40"
                      : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <span className="text-xs font-black">{fdi}</span>
                  {medido ? (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        maxSondaje >= 5 ? "bg-rose-500/30 text-rose-700 dark:text-rose-300" : (maxSondaje >= 4 ? "bg-amber-500/30 text-amber-700 dark:text-amber-300" : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300")
                      }`}
                    >
                      {maxSondaje}mm
                    </span>
                  ) : (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400"
                      title="Pieza sin sondaje registrado"
                    >
                      Sin medir
                    </span>
                  )}
                  {d.sangradoBop && <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>}
                  {fechaComparar && medido && datosPrevios[fdi] && (() => {
                    const delta = maxSondaje - maxSondajeDe(datosPrevios[fdi]);
                    if (delta === 0) return <span className="text-[9px] font-bold text-slate-400">=</span>;
                    return (
                      <span
                        className={`text-[9px] font-black ${delta > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}
                        title={`Profundidad maxima ${delta > 0 ? "aumento" : "disminuyo"} ${Math.abs(delta)} mm desde ${fechaComparar}`}
                      >
                        {delta > 0 ? `+${delta}` : delta}
                      </span>
                    );
                  })()}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Editor Clinico Detallado de la Pieza Activa */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-emerald-500/30 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-lg flex items-center justify-center border border-emerald-500/30">
              {dienteActivo}
            </span>
            <div>
              <h4 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">
                Detalle Periodontal - Diente FDI {dienteActivo}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sondaje en mm por cara anatómica, sangrado gingival y movilidad
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {mensaje && (
              <span className={`text-xs font-bold mr-2 ${mensaje.includes("NO se") || mensaje.includes("No se pudo") ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                {mensaje}
              </span>
            )}
            <button
              type="button"
              onClick={() => guardarDienteActual(dienteActivo)}
              disabled={guardando}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black text-xs hover:brightness-110 transition cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              {guardando ? "Guardando..." : "Guardar Medicion"}
            </button>
          </div>
        </div>

        {/* Cuadricula de 6 puntos: sondaje, margen gingival y nivel de insercion (NIC) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { titulo: "Cara Vestibular (3 Sitios)", sitios: SITIOS_VESTIBULAR },
            { titulo: "Cara Lingual / Palatina (3 Sitios)", sitios: SITIOS_LINGUAL },
          ].map((cara) => (
            <div key={cara.titulo} className="p-4 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                {cara.titulo}
              </span>
              <div className="grid grid-cols-3 gap-3">
                {cara.sitios.map((sitio) => {
                  const campoSondaje = `sondaje${sitio.id}` as keyof FilaPeriodonto;
                  const campoMargen = `margen${sitio.id}` as keyof FilaPeriodonto;
                  const ps = cur[campoSondaje] as number;
                  const mg = cur[campoMargen] as number;
                  const previo = datosPrevios[dienteActivo];
                  const textoMargen =
                    margenEnEdicion && margenEnEdicion.campo === campoMargen ? margenEnEdicion.texto : mg === 0 ? "" : String(mg);
                  return (
                    <div key={sitio.id} className="space-y-1">
                      <label className="text-[10px] text-slate-500 dark:text-slate-400 block">{sitio.nombre}</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        aria-label={`Sondaje ${sitio.nombre} (mm)`}
                        value={ps === 0 ? "" : String(ps)}
                        onChange={(e) => manejarCambioSondaje(campoSondaje, e.target.value)}
                        className={`w-full p-2.5 rounded-xl border text-center font-black text-lg ${colorProfundidad(ps)}`}
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        aria-label={`Margen gingival ${sitio.nombre} (mm)`}
                        placeholder="MG 0"
                        value={textoMargen}
                        onChange={(e) => manejarCambioMargen(campoMargen, e.target.value)}
                        onBlur={() => setMargenEnEdicion(null)}
                        title="Margen gingival: + recesion, - agrandamiento"
                        className="w-full p-1.5 rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-black/30 text-center text-xs font-bold text-slate-700 dark:text-slate-200"
                      />
                      <div className="text-[10px] text-center font-mono text-slate-500 dark:text-slate-400">
                        NIC <span className={`font-black ${ps + mg >= 5 ? "text-rose-600 dark:text-rose-400" : ps + mg >= 3 ? "text-amber-600 dark:text-amber-400" : "text-slate-700 dark:text-slate-200"}`}>{ps + mg}</span>
                        {fechaComparar && previo && (
                          <span className="block text-slate-400">
                            antes {previo[campoSondaje] as number}/{(previo[campoSondaje] as number) + (previo[campoMargen] as number)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Factores adicionales: BOP, Placa, Movilidad, Furca */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {/* BOP */}
          <button
            type="button"
            onClick={() => actualizarValor(dienteActivo, "sangradoBop", !cur.sangradoBop)}
            className={`p-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
              cur.sangradoBop
                ? "bg-rose-500/20 border-rose-500 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500/50"
                : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${cur.sangradoBop ? "bg-rose-500 animate-pulse" : "bg-slate-300 dark:bg-slate-600"}`}></span>
            <span>Sangrado al Sondaje (BOP)</span>
          </button>

          {/* Placa */}
          <button
            type="button"
            onClick={() => actualizarValor(dienteActivo, "placa", !cur.placa)}
            className={`p-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
              cur.placa
                ? "bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/50"
                : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${cur.placa ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-600"}`}></span>
            <span>Placa Bacteriana</span>
          </button>

          {/* Movilidad */}
          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-semibold">Movilidad:</span>
            <select
              value={cur.movilidad}
              onChange={(e) => actualizarValor(dienteActivo, "movilidad", Number(e.target.value))}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/20 rounded-xl px-2 py-1 text-emerald-600 dark:text-emerald-400 font-bold"
            >
              <option value="0">Grado 0 (Normal)</option>
              <option value="1">Grado 1 (&le; 1mm)</option>
              <option value="2">Grado 2 (&gt; 1mm)</option>
              <option value="3">Grado 3 (Vertical)</option>
            </select>
          </div>

          {/* Furca — solo aplica a piezas multirradiculares (molares); un incisivo, canino o
              premolar tiene raiz unica y no puede tener compromiso de furcacion. */}
          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-semibold">Lesion Furca:</span>
            {esPiezaMultirradicular(dienteActivo) ? (
              <select
                value={cur.furca}
                onChange={(e) => actualizarValor(dienteActivo, "furca", Number(e.target.value))}
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/20 rounded-xl px-2 py-1 text-emerald-600 dark:text-emerald-400 font-bold"
              >
                <option value="0">Sin lesion</option>
                <option value="1">Clase I</option>
                <option value="2">Clase II</option>
                <option value="3">Clase III</option>
              </select>
            ) : (
              <span className="text-slate-400 dark:text-slate-500 font-semibold italic">
                No aplica (raiz unica)
              </span>
            )}
          </div>
        </div>

        {/* Notas clinicas del diente */}
        <div>
          <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Notas de evolucion periodontal:</label>
          <input
            type="text"
            value={cur.notas}
            onChange={(e) => actualizarValor(dienteActivo, "notas", e.target.value)}
            placeholder="Ej: Compromiso oseo interproximal, margen gingival retraido 2mm..."
            className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
      </div>
    </div>
  );
};

export default PeriodontogramaInteractivo;
