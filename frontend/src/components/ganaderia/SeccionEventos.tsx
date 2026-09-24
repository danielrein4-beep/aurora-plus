import type { AnimalGanaderia, PotreroGanaderia } from "../../api";
import { fechaLocalISO } from "../ReportesCampoGanaderia";
import type { FormAltaAnimal } from "./ModalAltaAnimal";
import type { ModoVenta } from "./ModalVentaAnimales";
import type { Notificar, TabGanaderia, SubInventario } from "./tipos";

interface Props {
  animales: AnimalGanaderia[];
  notificar: Notificar;
  potreros: PotreroGanaderia[];
  abrirNuevoPotrero: () => void;
  abrirVaqueraRapida: () => void;
  abrirVentaAnimales: (modo: ModoVenta) => void;
  setAltaAnimal: (valores: Partial<FormAltaAnimal> | null) => void;
  setCeloAbierto: (abierto: boolean) => void;
  setMastitisAbierta: (abierta: boolean) => void;
  setModalPesaje: (animal: AnimalGanaderia | null) => void;
  setModalRotar: (potrero: PotreroGanaderia | null) => void;
  setModalVentaLeche: (abierto: boolean) => void;
  setOrdenoAbierto: (abierto: boolean) => void;
  setReproAbierta: (valores: { tipo?: string; resultado?: string } | null) => void;
  setSubInventario: (sub: SubInventario) => void;
  setTab: (tab: TabGanaderia) => void;
  setVacunaAbierta: (valores: { animalId?: number } | null) => void;
  /** Abre el registro de muerte o pérdida (robo) de un animal. */
  setBajaAbierta: (valores: { animalId?: number } | null) => void;
}

/** Centro de eventos del hato: accesos rápidos a registrar partos, servicios, sanidad, pesajes, ventas y rotaciones. */
export default function SeccionEventos({
  animales, notificar, potreros, abrirNuevoPotrero, abrirVaqueraRapida, abrirVentaAnimales,
  setAltaAnimal, setCeloAbierto, setMastitisAbierta, setModalPesaje, setModalRotar,
  setModalVentaLeche, setOrdenoAbierto, setReproAbierta, setSubInventario, setTab,
  setVacunaAbierta, setBajaAbierta,
}: Props) {
  return (
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
              onClick={() => { setReproAbierta({ tipo: "SERVICIO" }); }}
              className="w-full text-left p-2 rounded-xl hover:bg-white/5 text-slate-700 dark:text-white/80 hover:text-emerald-400 cursor-pointer flex items-center justify-between">
              <span>• Servicios (Monta / IA)</span>
              <span className="text-[10px] text-slate-400">Registrar →</span>
            </button>
            <button
              onClick={() => { setReproAbierta({ tipo: "DIAGNOSTICO_PRENEZ" }); }}
              className="w-full text-left p-2 rounded-xl hover:bg-white/5 text-slate-700 dark:text-white/80 hover:text-emerald-400 cursor-pointer flex items-center justify-between">
              <span>• Revisiones & Palpación</span>
              <span className="text-[10px] text-slate-400">Registrar →</span>
            </button>
            <button
              onClick={() => {
                setAltaAnimal({ origen: "NACIMIENTO", tipoAnimal: "BECERRA", fechaNacimiento: fechaLocalISO() });
              }}
              className="w-full text-left p-2 rounded-xl hover:bg-white/5 text-slate-700 dark:text-white/80 hover:text-emerald-400 cursor-pointer flex items-center justify-between">
              <span>• Partos / Alta de Cría en Finca</span>
              <span className="text-[10px] text-emerald-400 font-bold">Dar de alta →</span>
            </button>
            <button
              onClick={() => {
                setReproAbierta({ tipo: "DIAGNOSTICO_PRENEZ", resultado: "ABORTO_NO_GESTANTE" });
              }}
              className="w-full text-left p-2 rounded-xl hover:bg-white/5 text-slate-700 dark:text-white/80 hover:text-emerald-400 cursor-pointer flex items-center justify-between">
              <span>• Abortos & Pérdidas</span>
              <span className="text-[10px] text-slate-400">Registrar →</span>
            </button>
            <button
              onClick={() => setCeloAbierto(true)}
              className="w-full text-left p-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 font-semibold cursor-pointer flex items-center justify-between border border-teal-200">
              <span>• Celos & Detección para IA</span>
              <span className="text-[10px] font-bold text-teal-700">Registrar →</span>
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
              className="w-full text-left p-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 font-semibold cursor-pointer flex items-center justify-between border border-teal-200">
              <span>• Ordeño Rápido (Modo Vaquera)</span>
              <span className="text-[10px] font-bold text-teal-700">Teclado →</span>
            </button>
            <button
              onClick={() => setOrdenoAbierto(true)}
              className="w-full text-left p-2 rounded-xl hover:bg-white/5 text-slate-700 dark:text-white/80 hover:text-emerald-400 cursor-pointer flex items-center justify-between">
              <span>• Pesaje Individual de Leche</span>
              <span className="text-[10px] text-slate-400">Registrar →</span>
            </button>
            <button
              onClick={() => setModalVentaLeche(true)}
              className="w-full text-left p-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 font-semibold cursor-pointer flex items-center justify-between border border-teal-200">
              <span>• Venta Cisterna / Planta (Tanque)</span>
              <span className="text-[10px] font-bold text-teal-700">Despacho →</span>
            </button>
            <button
              onClick={() => {
                setReproAbierta({ tipo: "DIAGNOSTICO_PRENEZ", resultado: "SECADO_PREVIO_PARTO" });
              }}
              className="w-full text-left p-2 rounded-xl hover:bg-white/5 text-slate-700 dark:text-white/80 hover:text-emerald-400 cursor-pointer flex items-center justify-between">
              <span>• Secados</span>
              <span className="text-[10px] text-slate-400">Registrar →</span>
            </button>
            <button
              onClick={() => { setModalPesaje(animales[0]); }}
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
              onClick={() => {
                setAltaAnimal({ origen: "NACIMIENTO" });
              }}
              className="w-full text-left p-2 rounded-xl hover:bg-white/5 text-slate-700 dark:text-white/80 hover:text-emerald-400 cursor-pointer flex items-center justify-between">
              <span>• Alta de Animales (Nacimiento / Compra)</span>
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
              onClick={() => setVacunaAbierta({})}
              className="w-full text-left p-2 rounded-xl hover:bg-white/5 text-slate-700 dark:text-white/80 hover:text-emerald-400 cursor-pointer flex items-center justify-between">
              <span>• Vacunación & Desparasitación</span>
              <span className="text-[10px] text-slate-400">Aplicar →</span>
            </button>
            <button
              onClick={() => setMastitisAbierta(true)}
              className="w-full text-left p-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 font-semibold cursor-pointer flex items-center justify-between border border-teal-200">
              <span>• Mastitis (Prueba CMT & Retiro Leche)</span>
              <span className="text-[10px] font-bold text-teal-700">Registrar →</span>
            </button>
            <button
              onClick={() => setVacunaAbierta({})}
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
              onClick={abrirNuevoPotrero}
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
              onClick={() => {
                setTab("potreros");
                notificar("Selecciona un potrero para calcular y registrar el aforo de forraje.");
              }}
              className="w-full text-left p-2 rounded-xl hover:bg-white/5 text-slate-700 dark:text-white/80 hover:text-emerald-400 cursor-pointer flex items-center justify-between">
              <span>• Aforos & Planificación de Pastoreo</span>
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
              onClick={() => {
                setAltaAnimal({ origen: "COMPRA", proveedor: "", costoCompra: 0, lote: "Lote Compra" });
              }}
              className="w-full text-left p-2 rounded-xl hover:bg-white/5 text-slate-700 dark:text-white/80 hover:text-emerald-400 cursor-pointer flex items-center justify-between">
              <span>• Compras de Ganado (Ingreso Real)</span>
              <span className="text-[10px] text-emerald-400 font-bold">Ingresar →</span>
            </button>
            <button
              onClick={() => abrirVentaAnimales("INDIVIDUAL")}
              className="w-full text-left p-2 rounded-xl hover:bg-white/5 text-slate-700 dark:text-white/80 hover:text-emerald-400 cursor-pointer flex items-center justify-between">
              <span>• Venta / Beneficio (Salida Real)</span>
              <span className="text-[10px] text-rose-400 font-bold">Despachar →</span>
            </button>
            <button
              onClick={() => setBajaAbierta({})}
              className="w-full text-left p-2 rounded-xl hover:bg-white/5 text-slate-700 dark:text-white/80 hover:text-emerald-400 cursor-pointer flex items-center justify-between">
              <span>• Muertes y pérdidas (robo / abigeato)</span>
              <span className="text-[10px] text-rose-400 font-bold">Registrar →</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
