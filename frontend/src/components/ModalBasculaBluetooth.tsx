import React, { useState, useEffect } from "react";
import {
  basculaGanaderaService,
  LecturaBascula,
  TipoConexionBascula,
  EstadoConexionBascula,
} from "../services/basculaGanaderaService";

interface ModalBasculaBluetoothProps {
  abierto: boolean;
  onCerrar: () => void;
  onCapturarPeso: (peso: number) => void;
  animalNombre?: string;
  animalArete?: string;
  pesoAnterior?: number;
}

export const ModalBasculaBluetooth: React.FC<ModalBasculaBluetoothProps> = ({
  abierto,
  onCerrar,
  onCapturarPeso,
  animalNombre,
  animalArete,
  pesoAnterior,
}) => {
  const [tipoConexion, setTipoConexion] = useState<TipoConexionBascula>("ninguna");
  const [estado, setEstado] = useState<EstadoConexionBascula>("desconectado");
  const [mensajeEstado, setMensajeEstado] = useState<string>("");
  const [lectura, setLectura] = useState<LecturaBascula>({
    peso: 0,
    estable: false,
    unidad: "kg",
    tara: false,
    timestamp: Date.now(),
    tramaOriginal: "--",
  });
  const [baudRate, setBaudRate] = useState<number>(9600);
  const [pesoSimulado, setPesoSimulado] = useState<number>(450);

  useEffect(() => {
    if (!abierto) {
      basculaGanaderaService.desconectar();
      setEstado("desconectado");
      setTipoConexion("ninguna");
      setMensajeEstado("");
    }
  }, [abierto]);

  if (!abierto) return null;

  const handleConectarBluetooth = async () => {
    setTipoConexion("bluetooth");
    await basculaGanaderaService.conectarBluetooth(
      (nuevaLectura) => setLectura(nuevaLectura),
      (nuevoEstado, msg) => {
        setEstado(nuevoEstado);
        if (msg) setMensajeEstado(msg);
      }
    );
  };

  const handleConectarSerial = async () => {
    setTipoConexion("serial");
    await basculaGanaderaService.conectarSerial(
      baudRate,
      (nuevaLectura) => setLectura(nuevaLectura),
      (nuevoEstado, msg) => {
        setEstado(nuevoEstado);
        if (msg) setMensajeEstado(msg);
      }
    );
  };

  const handleIniciarSimulador = () => {
    setTipoConexion("simulador");
    const objetivo = pesoSimulado > 0 ? pesoSimulado : 465.0;
    basculaGanaderaService.iniciarSimulador(
      objetivo,
      (nuevaLectura) => setLectura(nuevaLectura),
      (nuevoEstado, msg) => {
        setEstado(nuevoEstado);
        if (msg) setMensajeEstado(msg);
      }
    );
  };

  const handleDesconectar = () => {
    basculaGanaderaService.desconectar();
    setTipoConexion("ninguna");
    setEstado("desconectado");
    setMensajeEstado("Balanza desconectada.");
    setLectura({
      peso: 0,
      estable: false,
      unidad: "kg",
      tara: false,
      timestamp: Date.now(),
      tramaOriginal: "--",
    });
  };

  const handleTransferir = (forzar = false) => {
    if (lectura.peso > 0 && (lectura.estable || forzar)) {
      onCapturarPeso(lectura.peso);
      handleDesconectar();
      onCerrar();
    }
  };

  const diferenciaPeso = pesoAnterior && lectura.peso > 0 ? (lectura.peso - pesoAnterior) : null;

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-left shadow-2xl space-y-6 text-slate-100">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <h3 className="font-['Outfit'] font-black text-xl text-white tracking-wide">
                Balanza Ganadera Digital
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Lectura automatica en manga y brete de pesaje
            </p>
          </div>
          <button
            onClick={() => {
              handleDesconectar();
              onCerrar();
            }}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Informacion del animal en pesaje */}
        {(animalNombre || animalArete) && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400">Animal en manga: </span>
              <strong className="text-emerald-400 text-sm">{animalNombre || "Sin nombre"}</strong>
              {animalArete && <span className="text-slate-400 ml-2">(Arete: {animalArete})</span>}
            </div>
            {pesoAnterior && (
              <div className="text-slate-400">
                Peso anterior: <strong className="text-white">{pesoAnterior} kg</strong>
              </div>
            )}
          </div>
        )}

        {/* Display LED de Pesaje */}
        <div className="bg-black/80 border-2 border-emerald-500/40 rounded-3xl p-6 relative overflow-hidden shadow-inner text-center">
          {/* Luz de fondo digital */}
          <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none"></div>

          {/* Estado de estabilidad de peso */}
          <div className="flex items-center justify-between text-xs font-semibold mb-3">
            <div className="flex items-center gap-2">
              {estado === "conectado" ? (
                lectura.estable ? (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    ESTABLE
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    EN MOVIMIENTO
                  </span>
                )
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-slate-700/50 text-slate-400 border border-slate-600">
                  {estado === "conectando" ? "CONECTANDO..." : "SIN SENAL"}
                </span>
              )}
            </div>

            <div className="text-slate-400 text-[11px] font-mono">
              {tipoConexion === "bluetooth" && "VINCULO: BLUETOOTH LE"}
              {tipoConexion === "serial" && "VINCULO: USB / RS232"}
              {tipoConexion === "simulador" && "VINCULO: SIMULADOR DIGITAL"}
              {tipoConexion === "ninguna" && "EN ESPERA"}
            </div>
          </div>

          {/* Digitos de peso fluorescentes */}
          <div className="py-3">
            <div className="font-['Outfit'] font-black text-6xl sm:text-7xl text-emerald-400 tracking-wider font-mono drop-shadow-[0_0_20px_rgba(16,185,129,0.35)]">
              {lectura.peso > 0 ? lectura.peso.toFixed(1) : "0.0"}
              <span className="text-2xl text-emerald-400/60 ml-2 font-sans">kg</span>
            </div>
          </div>

          {/* Metricas auxiliares en display */}
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 font-mono">
            <div>TARA: 0.0 kg</div>
            <div>
              {diferenciaPeso !== null && (
                <span className={diferenciaPeso >= 0 ? "text-emerald-400" : "text-rose-400"}>
                  VARIACION: {diferenciaPeso >= 0 ? `+${diferenciaPeso.toFixed(1)}` : diferenciaPeso.toFixed(1)} kg
                </span>
              )}
            </div>
            <div>TRAMA: {lectura.tramaOriginal || "--"}</div>
          </div>
        </div>

        {/* Mensaje de estado */}
        {mensajeEstado && (
          <div className={`p-3 rounded-2xl text-xs ${
            estado === "error" ? "bg-rose-500/10 border border-rose-500/30 text-rose-300" : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
          }`}>
            {mensajeEstado}
          </div>
        )}

        {/* Opciones de conexion */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Modo de Captura en Manga:
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Boton Bluetooth */}
            <button
              type="button"
              onClick={handleConectarBluetooth}
              disabled={estado === "conectando"}
              className={`p-3 rounded-2xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 text-center ${
                tipoConexion === "bluetooth" && estado === "conectado"
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                  : "bg-white/5 border-white/10 hover:bg-white/10 text-slate-200"
              }`}
            >
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19l6-6-6-6m6 6l-6-6 6 6-6 6" />
              </svg>
              <span>Bluetooth LE</span>
              <span className="text-[10px] text-slate-400 font-normal">Tru-Test / Gallagher</span>
            </button>

            {/* Boton USB / Serial */}
            <button
              type="button"
              onClick={handleConectarSerial}
              disabled={estado === "conectando"}
              className={`p-3 rounded-2xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 text-center ${
                tipoConexion === "serial" && estado === "conectado"
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                  : "bg-white/5 border-white/10 hover:bg-white/10 text-slate-200"
              }`}
            >
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Cable USB / COM</span>
              <span className="text-[10px] text-slate-400 font-normal">9600 bps RS232</span>
            </button>

            {/* Boton Simulador */}
            <button
              type="button"
              onClick={handleIniciarSimulador}
              className={`p-3 rounded-2xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 text-center ${
                tipoConexion === "simulador"
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                  : "bg-white/5 border-white/10 hover:bg-white/10 text-slate-200"
              }`}
            >
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Simulador Manga</span>
              <span className="text-[10px] text-slate-400 font-normal">Animal fluctuando</span>
            </button>
          </div>

          {/* Configuracion avanzada de baud rate para USB */}
          {tipoConexion === "serial" && (
            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-3 text-xs">
              <span className="text-slate-400">Velocidad del puerto COM:</span>
              <select
                value={baudRate}
                onChange={(e) => setBaudRate(Number(e.target.value))}
                className="bg-slate-800 border border-white/20 rounded-xl px-2.5 py-1 text-emerald-400 font-bold"
              >
                <option value="4800">4800 Baud</option>
                <option value="9600">9600 Baud (Estandar)</option>
                <option value="19200">19200 Baud</option>
              </select>
            </div>
          )}

          {/* Ajuste de peso en simulador */}
          {tipoConexion === "simulador" && (
            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-3 text-xs">
              <span className="text-slate-400">Peso objetivo simulado (kg):</span>
              <input
                type="number"
                value={pesoSimulado}
                onChange={(e) => setPesoSimulado(Number(e.target.value))}
                className="w-24 bg-slate-800 border border-white/20 rounded-xl px-2.5 py-1 text-emerald-400 font-bold text-center"
              />
            </div>
          )}
        </div>

        {/* Boton de accion principal */}
        <div className="pt-2 flex gap-3">
          {estado === "conectado" && (
            <button
              type="button"
              onClick={handleDesconectar}
              className="px-4 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-bold transition"
            >
              Desconectar
            </button>
          )}

          <button
            type="button"
            onClick={() => handleTransferir(false)}
            disabled={lectura.peso <= 0 || !lectura.estable}
            className={`flex-1 py-3.5 rounded-2xl font-bold text-xs transition flex items-center justify-center gap-2 ${
              lectura.peso > 0 && lectura.estable
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 hover:brightness-110 shadow-lg shadow-emerald-500/20 font-black cursor-pointer"
                : "bg-white/10 text-slate-500 cursor-not-allowed"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>Transferir {lectura.peso > 0 ? `${lectura.peso.toFixed(1)} kg` : "Peso"} al Formulario</span>
          </button>
        </div>

        {/* Escape para basculas sin deteccion de estabilidad confiable — el usuario asume
            que el peso puede no ser exacto si lo fuerza mientras aun marca "EN MOVIMIENTO". */}
        {lectura.peso > 0 && !lectura.estable && (
          <button
            type="button"
            onClick={() => handleTransferir(true)}
            className="w-full text-center text-[11px] text-slate-500 hover:text-amber-400 underline underline-offset-2 transition"
          >
            Forzar transferencia sin esperar estabilizacion (no recomendado)
          </button>
        )}

      </div>
    </div>
  );
};

export default ModalBasculaBluetooth;
