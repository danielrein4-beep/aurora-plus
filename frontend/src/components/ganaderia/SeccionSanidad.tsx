import { useState, useEffect } from "react";
import { IconCheckCircle, IconDownload, IconSyringe, IconWarning, IconEdit, IconCow, IconTag, IconShield, IconDna, IconScale } from "../../Icons";
import { obtenerGdpGanaderia, obtenerVacunasPorAnimal, obtenerMedicamentosPorAnimal, descargarAlertasSanitariasExcel, obtenerEventosReproductivosPorHembra, obtenerCurvaPesoGanaderia, type AnimalGanaderia, type TableroAlertasGanaderia, type VacunaGanaderia, type AlertaSanitariaGanaderia, type AplicacionVacunaGanaderia, type AplicacionMedicamentoGanaderia, type EventoReproductivoGanaderia, type RegistroPesoGanaderia, type GdpGanaderiaResponse } from "../../api";
import type { FormAltaAnimal } from "./ModalAltaAnimal";
import type { Notificar, SubSanidad } from "./tipos";

interface Props {
  alertas: TableroAlertasGanaderia | null;
  alertasSanitarias: AlertaSanitariaGanaderia[];
  animales: AnimalGanaderia[];
  animalFichaId: number | null;
  notificar: Notificar;
  subSanidad: SubSanidad;
  tenantId: number;
  vacunas: VacunaGanaderia[];
  abrirEditarAnimal: (animal: AnimalGanaderia) => void;
  setAltaAnimal: (valores: Partial<FormAltaAnimal> | null) => void;
  setAnimalFichaId: (id: number | null) => void;
  setSubSanidad: (sub: SubSanidad) => void;
  setVacunaAbierta: (valores: { animalId?: number } | null) => void;
}

/**
 * Sanidad y trazabilidad: ficha de cada animal (pesos, GDP, vacunas, tratamientos y
 * reproducción) y el control por lotes con las alertas de retiro de leche y carne.
 */
export default function SeccionSanidad({
  alertas, alertasSanitarias, animales, animalFichaId, notificar, subSanidad, tenantId, vacunas,
  abrirEditarAnimal, setAltaAnimal, setAnimalFichaId, setSubSanidad, setVacunaAbierta,
}: Props) {
  const [fichaVacunas, setFichaVacunas] = useState<AplicacionVacunaGanaderia[]>([]);
  const [fichaMedicamentos, setFichaMedicamentos] = useState<AplicacionMedicamentoGanaderia[]>([]);
  const [fichaEventosRepro, setFichaEventosRepro] = useState<EventoReproductivoGanaderia[]>([]);
  const [fichaPesos, setFichaPesos] = useState<RegistroPesoGanaderia[]>([]);
  const [fichaGdp, setFichaGdp] = useState<GdpGanaderiaResponse | null>(null);
  const [cargandoFicha, setCargandoFicha] = useState(false);

  // Carga la ficha completa del animal elegido: vacunas, tratamientos, reproducción y curva de peso.
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

  return (
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
          onClick={() => setVacunaAbierta({})}
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
                setAltaAnimal({ origen: "NACIMIENTO" });
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
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 min-w-0">
              <label className="text-xs font-bold text-slate-700 dark:text-white/70">
                Seleccionar Animal por Arete para ver Ficha Completa:
              </label>
              <select
                value={animalFichaId || ""}
                onChange={(e) => setAnimalFichaId(Number(e.target.value))}
                className="w-full sm:w-auto max-w-full min-w-0 truncate px-4 py-2 rounded-xl bg-slate-800 border border-white/15 text-white font-mono font-bold text-xs cursor-pointer focus:border-emerald-500"
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
                        {fichaGdp?.gdpKgDia != null ? `${fichaGdp.gdpKgDia >= 0 ? "+" : ""}${Number(fichaGdp.gdpKgDia).toFixed(2)} kg/día` : "Faltan pesajes"}
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
                            onClick={() => setVacunaAbierta({ animalId: animalSel.id })}
                            className="text-[11px] text-emerald-400 hover:text-emerald-300 underline mt-1 inline-block cursor-pointer">
                            Aplicar dosis ahora →
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {fichaVacunas.map((v) => {
                            const hoyStr = new Date().toISOString().slice(0, 10);
                            const refuerzoVencido = v.fechaProximaDosis && v.fechaProximaDosis < hoyStr;
                            return (
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
                              {v.fechaProximaDosis && (
                                <div className={`text-[10px] font-bold ${refuerzoVencido ? "text-rose-400" : "text-amber-400"}`}>
                                  {refuerzoVencido ? "Refuerzo VENCIDO: " : "Proximo refuerzo: "}{v.fechaProximaDosis}
                                </div>
                              )}
                            </div>
                            );
                          })}
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
  );
}
