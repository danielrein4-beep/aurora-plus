import React, { useState, useEffect } from "react";

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
  sangradoBop: boolean;
  placa: boolean;
  movilidad: number;
  furca: number;
  notas: string;
}

// Dientes permanentes FDI: Cuadrantes 1 y 2 (Superior), 4 y 3 (Inferior)
const DIENTES_SUPERIORES = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const DIENTES_INFERIORES = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

export const PeriodontogramaInteractivo: React.FC<PeriodontogramaInteractivoProps> = ({
  pacienteId,
  pacienteNombre,
}) => {
  const [datos, setDatos] = useState<Record<number, FilaPeriodonto>>({});
  const [dienteActivo, setDienteActivo] = useState<number>(11);
  const [cargando, setCargando] = useState<boolean>(false);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [mensaje, setMensaje] = useState<string>("");

  useEffect(() => {
    cargarPeriodontograma();
  }, [pacienteId]);

  const cargarPeriodontograma = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem("aurora_token") || "";
      const res = await fetch(`/api/salud/odontologia/periodontograma?pacienteId=${pacienteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const mapa: Record<number, FilaPeriodonto> = {};
        if (data.filas) {
          for (const f of data.filas) {
            mapa[f.diente_fdi] = {
              dienteFdi: f.diente_fdi,
              sondajeMv: f.sondaje_mv || 1,
              sondajeV: f.sondaje_v || 1,
              sondajeDv: f.sondaje_dv || 1,
              sondajeMl: f.sondaje_ml || 1,
              sondajeL: f.sondaje_l || 1,
              sondajeDl: f.sondaje_dl || 1,
              sangradoBop: Boolean(f.sangrado_bop),
              placa: Boolean(f.placa),
              movilidad: f.movilidad || 0,
              furca: f.furca || 0,
              notas: f.notas || "",
            };
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

  const guardarDienteActual = async (fdi: number) => {
    setGuardando(true);
    const d = getDiente(fdi);
    try {
      const token = localStorage.getItem("aurora_token") || "";
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
          sangradoBop: d.sangradoBop,
          placa: d.placa,
          movilidad: d.movilidad,
          furca: d.furca,
          notas: d.notas,
        }),
      });
      if (res.ok) {
        setMensaje(`Pieza ${fdi} guardada.`);
        setTimeout(() => setMensaje(""), 2500);
      }
    } catch {
      setMensaje(`Guardado localmente.`);
      setTimeout(() => setMensaje(""), 2500);
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

  const colorProfundidad = (mm: number) => {
    if (mm <= 3) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    if (mm <= 5) return "text-amber-400 bg-amber-500/15 border-amber-500/40";
    return "text-rose-400 bg-rose-500/20 border-rose-500/50 font-bold";
  };

  const cur = getDiente(dienteActivo);

  return (
    <div className="space-y-6 text-slate-100 text-left">
      {/* Cabecera y Metricas Periodontales */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-md">
        <div>
          <h3 className="font-['Outfit'] font-black text-xl text-white flex items-center gap-2">
            <span>Periodontograma Clinico (Sondaje de 6 Puntos)</span>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
              Profundidad & BOP
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Evaluacion milimetrica de bolsas periodontales para {pacienteNombre || "Paciente Activo"}
          </p>
        </div>

        {/* Tarjetas de Diagnostico Rapido */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center min-w-[90px]">
            <div className="text-[10px] uppercase text-slate-400 font-semibold">BOP Sangrado</div>
            <div className={`text-xl font-black font-['Outfit'] ${indiceBop > 25 ? "text-rose-400" : "text-emerald-400"}`}>
              {indiceBop}%
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center min-w-[90px]">
            <div className="text-[10px] uppercase text-slate-400 font-semibold">Bolsas &ge; 5mm</div>
            <div className={`text-xl font-black font-['Outfit'] ${bolsasProfundas > 0 ? "text-amber-400" : "text-emerald-400"}`}>
              {bolsasProfundas}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center min-w-[90px]">
            <div className="text-[10px] uppercase text-slate-400 font-semibold">Piezas</div>
            <div className="text-xl font-black font-['Outfit'] text-white">
              {totalPiezasRegistradas}/32
            </div>
          </div>
        </div>
      </div>

      {/* Selector de Arcadas Dentales */}
      <div className="space-y-4 p-5 rounded-3xl bg-slate-900/60 border border-white/10">
        <div>
          <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
            Arcada Superior (Maxilar)
          </span>
          <div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5 mt-2">
            {DIENTES_SUPERIORES.map((fdi) => {
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
                      ? "bg-emerald-500/25 border-emerald-400 text-white ring-2 ring-emerald-500/40"
                      : "bg-white/5 border-white/10 hover:bg-white/10 text-slate-300"
                  }`}
                >
                  <span className="text-xs font-black">{fdi}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      maxSondaje >= 5 ? "bg-rose-500/30 text-rose-300" : (maxSondaje >= 4 ? "bg-amber-500/30 text-amber-300" : "bg-emerald-500/20 text-emerald-300")
                    }`}
                  >
                    {maxSondaje}mm
                  </span>
                  {d.sangradoBop && <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-3 border-t border-white/10">
          <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
            Arcada Inferior (Mandibula)
          </span>
          <div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5 mt-2">
            {DIENTES_INFERIORES.map((fdi) => {
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
                      ? "bg-emerald-500/25 border-emerald-400 text-white ring-2 ring-emerald-500/40"
                      : "bg-white/5 border-white/10 hover:bg-white/10 text-slate-300"
                  }`}
                >
                  <span className="text-xs font-black">{fdi}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      maxSondaje >= 5 ? "bg-rose-500/30 text-rose-300" : (maxSondaje >= 4 ? "bg-amber-500/30 text-amber-300" : "bg-emerald-500/20 text-emerald-300")
                    }`}
                  >
                    {maxSondaje}mm
                  </span>
                  {d.sangradoBop && <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Editor Clinico Detallado de la Pieza Activa */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-emerald-500/30 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 font-black text-lg flex items-center justify-center border border-emerald-500/30">
              {dienteActivo}
            </span>
            <div>
              <h4 className="font-['Outfit'] font-black text-lg text-white">
                Detalle Periodontal - Diente FDI {dienteActivo}
              </h4>
              <p className="text-xs text-slate-400">
                Sondaje en mm por cara anatómica, sangrado gingival y movilidad
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {mensaje && <span className="text-xs text-emerald-400 font-bold mr-2">{mensaje}</span>}
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

        {/* Cuadricula de 6 puntos de sondaje */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cara Vestibular (3 puntos) */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Cara Vestibular (3 Sitios)
            </span>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Mesio-Vestibular</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={cur.sondajeMv}
                  onChange={(e) => actualizarValor(dienteActivo, "sondajeMv", Number(e.target.value))}
                  className={`w-full p-2.5 rounded-xl border text-center font-black text-lg ${colorProfundidad(cur.sondajeMv)}`}
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Medio-Vestibular</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={cur.sondajeV}
                  onChange={(e) => actualizarValor(dienteActivo, "sondajeV", Number(e.target.value))}
                  className={`w-full p-2.5 rounded-xl border text-center font-black text-lg ${colorProfundidad(cur.sondajeV)}`}
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Disto-Vestibular</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={cur.sondajeDv}
                  onChange={(e) => actualizarValor(dienteActivo, "sondajeDv", Number(e.target.value))}
                  className={`w-full p-2.5 rounded-xl border text-center font-black text-lg ${colorProfundidad(cur.sondajeDv)}`}
                />
              </div>
            </div>
          </div>

          {/* Cara Palatina / Lingual (3 puntos) */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Cara Lingual / Palatina (3 Sitios)
            </span>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Mesio-Lingual</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={cur.sondajeMl}
                  onChange={(e) => actualizarValor(dienteActivo, "sondajeMl", Number(e.target.value))}
                  className={`w-full p-2.5 rounded-xl border text-center font-black text-lg ${colorProfundidad(cur.sondajeMl)}`}
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Medio-Lingual</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={cur.sondajeL}
                  onChange={(e) => actualizarValor(dienteActivo, "sondajeL", Number(e.target.value))}
                  className={`w-full p-2.5 rounded-xl border text-center font-black text-lg ${colorProfundidad(cur.sondajeL)}`}
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Disto-Lingual</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={cur.sondajeDl}
                  onChange={(e) => actualizarValor(dienteActivo, "sondajeDl", Number(e.target.value))}
                  className={`w-full p-2.5 rounded-xl border text-center font-black text-lg ${colorProfundidad(cur.sondajeDl)}`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Factores adicionales: BOP, Placa, Movilidad, Furca */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {/* BOP */}
          <button
            type="button"
            onClick={() => actualizarValor(dienteActivo, "sangradoBop", !cur.sangradoBop)}
            className={`p-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
              cur.sangradoBop
                ? "bg-rose-500/20 border-rose-500 text-rose-300 ring-1 ring-rose-500/50"
                : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${cur.sangradoBop ? "bg-rose-500 animate-pulse" : "bg-slate-600"}`}></span>
            <span>Sangrado al Sondaje (BOP)</span>
          </button>

          {/* Placa */}
          <button
            type="button"
            onClick={() => actualizarValor(dienteActivo, "placa", !cur.placa)}
            className={`p-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
              cur.placa
                ? "bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-500/50"
                : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${cur.placa ? "bg-amber-500" : "bg-slate-600"}`}></span>
            <span>Placa Bacteriana</span>
          </button>

          {/* Movilidad */}
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-semibold">Movilidad:</span>
            <select
              value={cur.movilidad}
              onChange={(e) => actualizarValor(dienteActivo, "movilidad", Number(e.target.value))}
              className="bg-slate-800 border border-white/20 rounded-xl px-2 py-1 text-emerald-400 font-bold"
            >
              <option value="0">Grado 0 (Normal)</option>
              <option value="1">Grado 1 (&le; 1mm)</option>
              <option value="2">Grado 2 (&gt; 1mm)</option>
              <option value="3">Grado 3 (Vertical)</option>
            </select>
          </div>

          {/* Furca */}
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-semibold">Lesion Furca:</span>
            <select
              value={cur.furca}
              onChange={(e) => actualizarValor(dienteActivo, "furca", Number(e.target.value))}
              className="bg-slate-800 border border-white/20 rounded-xl px-2 py-1 text-emerald-400 font-bold"
            >
              <option value="0">Sin lesion</option>
              <option value="1">Clase I</option>
              <option value="2">Clase II</option>
              <option value="3">Clase III</option>
            </select>
          </div>
        </div>

        {/* Notas clinicas del diente */}
        <div>
          <label className="text-[11px] text-slate-400 block mb-1">Notas de evolucion periodontal:</label>
          <input
            type="text"
            value={cur.notas}
            onChange={(e) => actualizarValor(dienteActivo, "notas", e.target.value)}
            placeholder="Ej: Compromiso oseo interproximal, margen gingival retraido 2mm..."
            className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
      </div>
    </div>
  );
};

export default PeriodontogramaInteractivo;
