import { IconSettings } from "../../Icons";
import type { AnimalGanaderia, PotreroGanaderia, RegistroOrdenoGanaderia, VacunaGanaderia, AlertaSanitariaGanaderia, TanqueLeche, VentaLecheTanque } from "../../api";
import { fechaLocalISO } from "../ReportesCampoGanaderia";
import { KG_POR_UG, num } from "./formato";
import type { FormAltaAnimal } from "./ModalAltaAnimal";
import type { MonedasConfig, TabGanaderia, SubPotreros } from "./tipos";

interface Props {
  alertasSanitarias: AlertaSanitariaGanaderia[];
  animales: AnimalGanaderia[];
  animalesActivos: AnimalGanaderia[];
  monedasConfig: MonedasConfig;
  ordenos: RegistroOrdenoGanaderia[];
  potreros: PotreroGanaderia[];
  precioLecheUSD: number;
  tanqueLeche: TanqueLeche | null;
  tasaBCV: number;
  tasaCOP: number;
  tenantId: number;
  totalAnimales: number;
  vacunas: VacunaGanaderia[];
  ventasLeche: VentaLecheTanque[];
  abrirNuevoPotrero: () => void;
  setAltaAnimal: (valores: Partial<FormAltaAnimal> | null) => void;
  setModalAjusteTanque: (abierto: boolean) => void;
  setModalRotar: (potrero: PotreroGanaderia | null) => void;
  setModalVentaLeche: (abierto: boolean) => void;
  setOrdenoAbierto: (abierto: boolean) => void;
  setSubPotreros: (sub: SubPotreros) => void;
  setTab: (tab: TabGanaderia) => void;
}

/** Panel general: indicadores del hato, leche del día, alertas sanitarias y accesos rápidos. */
export default function SeccionPanel({
  alertasSanitarias, animales, animalesActivos, monedasConfig, ordenos, potreros, precioLecheUSD,
  tanqueLeche, tasaBCV, tasaCOP, tenantId, totalAnimales, vacunas, ventasLeche, abrirNuevoPotrero,
  setAltaAnimal, setModalAjusteTanque, setModalRotar, setModalVentaLeche, setOrdenoAbierto,
  setSubPotreros, setTab,
}: Props) {
  const vacasOrdeno = animalesActivos.filter(a => a.tipoAnimal === "VACA" && a.sexo === "HEMBRA").length;
  const totalHectareas = potreros.reduce((sum, p) => sum + (Number(p.areaHectareas) || 0), 0);
  // Carga animal en UG/ha: una unidad ganadera = 450 kg de peso vivo. Los animales sin peso
  // cargado no suman (se avisa cuántos son) en vez de suponerles un peso.
  const pesoVivoTotal = animalesActivos.reduce((s, a) => s + (Number(a.pesoActual) || 0), 0);
  const sinPeso = animalesActivos.filter(a => !(Number(a.pesoActual) > 0)).length;
  const cargaUgHa = totalHectareas > 0 ? pesoVivoTotal / KG_POR_UG / totalHectareas : null;
  const litrosHoy = ordenos
    .filter(o => o.fecha === fechaLocalISO())
    .reduce((sum, o) => sum + (Number(o.cantidadLitros) || 0), 0);
  const ingresosLecheHoy = litrosHoy * precioLecheUSD;

  return (
    <div className="space-y-6">

      {/* Checklist de Primeros Pasos (Onboarding de Finca Vacía) */}
      {(() => {
        const fincaUbicada = typeof window !== "undefined" && !!localStorage.getItem(`aurora_finca_config_${tenantId}`);
        const tienePotreros = potreros.length > 0;
        const tieneAnimales = animales.length > 0;
        const pasosCompletados = (fincaUbicada ? 1 : 0) + (tienePotreros ? 1 : 0) + (tieneAnimales ? 1 : 0);

        return (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-['Outfit'] font-black text-lg text-slate-900">
                    Checklist de Primeros Pasos para tu Finca
                  </h3>
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 font-bold border border-teal-200">
                    {pasosCompletados} de 3 completados
                  </span>
                </div>
                <p className="text-xs text-slate-500">
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
                  ? "bg-teal-50 border-teal-200"
                  : "bg-slate-50 border-slate-200 hover:border-teal-300"
              }`}>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Paso 1</span>
                    {fincaUbicada ? (
                      <span className="text-[11px] font-bold text-teal-700">Completado</span>
                    ) : (
                      <span className="text-[11px] font-bold text-amber-600">Pendiente</span>
                    )}
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    Fijar Ubicación Real
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {fincaUbicada
                      ? "Coordenadas fijadas en el satélite."
                      : "Busca tu predio en el mapa y fija las coordenadas de tu finca."}
                  </p>
                </div>
                <button
                  onClick={() => { setTab("potreros"); setSubPotreros("mapa"); }}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    fincaUbicada
                      ? "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                      : "btn-cyber-neon text-white shadow-sm"
                  }`}
                >
                  {fincaUbicada ? "Ver en Mapa →" : "Ubicar en Mapa →"}
                </button>
              </div>

              {/* Paso 2: Crear Primer Potrero */}
              <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                tienePotreros
                  ? "bg-teal-50 border-teal-200"
                  : "bg-slate-50 border-slate-200 hover:border-teal-300"
              }`}>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Paso 2</span>
                    {tienePotreros ? (
                      <span className="text-[11px] font-bold text-teal-700">Completado ({potreros.length})</span>
                    ) : (
                      <span className="text-[11px] font-bold text-amber-600">Pendiente</span>
                    )}
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    Crear Primer Potrero
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {tienePotreros
                      ? `${potreros.length} potreros registrados.`
                      : "Delimita un potrero para asignar pastos, área y carga animal."}
                  </p>
                </div>
                <button
                  onClick={abrirNuevoPotrero}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    tienePotreros
                      ? "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                      : "btn-cyber-neon text-white shadow-sm"
                  }`}
                >
                  {tienePotreros ? "+ Nuevo Potrero" : "+ Crear Potrero"}
                </button>
              </div>

              {/* Paso 3: Dar de Alta Primer Animal */}
              <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                tieneAnimales
                  ? "bg-teal-50 border-teal-200"
                  : "bg-slate-50 border-slate-200 hover:border-teal-300"
              }`}>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Paso 3</span>
                    {tieneAnimales ? (
                      <span className="text-[11px] font-bold text-teal-700">Completado ({totalAnimales})</span>
                    ) : (
                      <span className="text-[11px] font-bold text-amber-600">Pendiente</span>
                    )}
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    Dar de Alta Primer Animal
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {tieneAnimales
                      ? `${totalAnimales} cabezas activas en el hato.`
                      : "Registra tu primer animal por nacimiento o compra con su arete."}
                  </p>
                </div>
                <button
                  onClick={() => setAltaAnimal({})}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    tieneAnimales
                      ? "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                      : "btn-cyber-neon text-white shadow-sm"
                  }`}
                >
                  {tieneAnimales ? "+ Nuevo Animal" : "+ Dar de Alta"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Cabecera: tarjeta héroe (hato total) + cinta de métricas secundarias ── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1 text-left">
            <h2 className="font-['Outfit'] font-black text-2xl text-slate-900">
              Control Integral de Finca & Hato
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setOrdenoAbierto(true)}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer">
              + Registrar Ordeño
            </button>
            <button
              onClick={() => { setTab("potreros"); setSubPotreros("mapa"); }}
              className="btn-cyber-neon text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm cursor-pointer">
              Ver Mapa Satelital →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Tarjeta héroe: Hato Total */}
          <div className="lg:col-span-7 bg-white border-2 border-teal-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
                  Hato Total
                </span>
                <div className="mt-2.5 flex items-baseline gap-2.5">
                  <span className="text-3xl font-black text-slate-900 font-['Outfit']">{totalAnimales}</span>
                  <span className="text-xs font-medium text-slate-500">cabezas · {vacasOrdeno} vacas productivas</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-3 flex-wrap text-xs text-slate-500">
              <span>{totalHectareas > 0 ? `${num(totalHectareas, 1)} ha en potreros` : "Sin hectáreas cargadas en los potreros"}</span>
              <span className="font-semibold text-teal-700" title="Unidad ganadera (UG) = 450 kg de peso vivo">
                {cargaUgHa != null ? `${num(cargaUgHa, 2)} UG/ha de carga animal` : "Carga animal: falta el área"}
                {cargaUgHa != null && sinPeso > 0 && <span className="font-normal text-slate-500"> ({sinPeso} sin peso)</span>}
              </span>
            </div>
          </div>

          {/* Cinta de métricas secundarias */}
          <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Producción & Rotación
            </div>
            <div className="grid grid-cols-2 divide-x divide-slate-200 text-center">
              <div className="px-1.5">
                <div className="text-xl font-black text-slate-900 font-['Outfit']">{litrosHoy.toFixed(1)}</div>
                <div className="text-[10px] font-medium text-slate-500 mt-0.5">Litros Hoy</div>
              </div>
              <div className="px-1.5">
                <div className="text-xl font-black text-slate-900 font-['Outfit']">
                  {potreros.filter(p => p.estado === "EN_DESCANSO").length}/{potreros.length}
                </div>
                <div className="text-[10px] font-medium text-slate-500 mt-0.5">Potreros Descanso</div>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
              <span>
                ${ingresosLecheHoy.toFixed(2)} USD
                {monedasConfig.VES && ` · Bs. ${(ingresosLecheHoy * tasaBCV).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Widget: Tanque de Leche Frío (Stock en Finca & Despacho a Cisterna) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 text-left">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-['Outfit'] font-black text-lg text-slate-900">
                  Tanque de Leche Frío
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-50 text-sky-700 border border-sky-200">
                  <span>{tanqueLeche?.temperaturaCelsius != null ? `${num(tanqueLeche.temperaturaCelsius, 1)} °C` : "Sin temperatura"}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Stock recolectado en sala de ordeño listo para despacho a planta o camión cisterna.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setModalAjusteTanque(true)}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition-all">
              <span className="inline-flex items-center gap-1.5"><IconSettings size={13} /> Calibrar</span>
            </button>
            <button
              type="button"
              onClick={() => setModalVentaLeche(true)}
              className="btn-cyber-neon text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer">
              <span>Venta Cisterna / Planta</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">Stock en Tanque</span>
              <span className="text-[11px] font-mono font-bold text-sky-700">
                {Math.round(((tanqueLeche?.stockActualLitros ?? 0) / (tanqueLeche?.capacidadLitros ?? 2000)) * 100)}%
              </span>
            </div>
            <div className="font-['Outfit'] font-black text-2xl text-slate-900">
              {(tanqueLeche?.stockActualLitros ?? 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">/ {(tanqueLeche?.capacidadLitros ?? 2000).toLocaleString()} L</span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, ((tanqueLeche?.stockActualLitros ?? 0) / (tanqueLeche?.capacidadLitros ?? 2000)) * 100))}%` }}
              />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-[11px] text-slate-500 font-medium">Valor Comercial del Stock</div>
            <div className="font-['Outfit'] font-black text-2xl text-emerald-700">
              ${((tanqueLeche?.stockActualLitros ?? 0) * precioLecheUSD).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-500">
              A ${precioLecheUSD.toFixed(2)} USD/L
              {monedasConfig.VES && ` • Bs. ${(((tanqueLeche?.stockActualLitros ?? 0) * precioLecheUSD) * tasaBCV).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              {monedasConfig.COP && ` • COP $${Math.round(((tanqueLeche?.stockActualLitros ?? 0) * precioLecheUSD) * tasaCOP).toLocaleString()}`}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-[11px] text-slate-500 font-medium">Último Despacho Registrado</div>
            <div className="font-bold text-sm text-slate-900 truncate">
              {ventasLeche[0] ? `${ventasLeche[0].litrosVendidos} L • ${ventasLeche[0].compradorOPlanta}` : "Sin despachos recientes"}
            </div>
            <div className="text-[10px] text-slate-500">
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
                    {[
                      pot.areaHectareas ? `${num(pot.areaHectareas, 1)} ha` : null,
                      pot.tipoPasto || null,
                      pot.capacidadAnimales ? `capacidad ${pot.capacidadAnimales} cabezas` : null,
                    ].filter(Boolean).join(" · ") || "Faltan área, pasto y capacidad"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    pot.estado === "EN_DESCANSO"
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                      : pot.estado === "EN_MANTENIMIENTO"
                        ? "bg-slate-100 text-slate-600 border border-slate-200"
                        : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                  }`}>
                    {pot.estado === "EN_DESCANSO" ? "En descanso" : pot.estado === "EN_MANTENIMIENTO" ? "Mantenimiento" : "En uso"}
                  </span>
                  {pot.estado !== "EN_DESCANSO" && pot.estado !== "EN_MANTENIMIENTO" && (
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
  );
}
