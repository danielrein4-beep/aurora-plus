import { useEffect, useRef, useState } from "react";
import { listarMensajesMercado, enviarMensajeMercado, type MensajeMercado } from "../../api";
import { CAJA, INPUT, BOTON, fechaCorta, mensajeError } from "./comun";

/** Chat entre la finca vendedora y una compradora. El vendedor indica con qué comprador habla. */
export default function Chat({ publicacionId, comprador, titulo, puedeEscribir, conCondiciones, cabecera }: {
  publicacionId: number;
  comprador?: string;
  titulo: string;
  puedeEscribir: boolean;
  conCondiciones: (accion: () => void) => void;
  cabecera?: React.ReactNode;
}) {
  const [mensajes, setMensajes] = useState<MensajeMercado[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vigente = true;
    const cargar = () => listarMensajesMercado(publicacionId, comprador)
      .then((m) => { if (vigente) setMensajes(m); })
      .catch(() => {});
    cargar();
    const intervalo = setInterval(cargar, 5_000);
    return () => { vigente = false; clearInterval(intervalo); };
  }, [publicacionId, comprador]);

  useEffect(() => { finRef.current?.scrollIntoView({ block: "end" }); }, [mensajes.length]);

  const enviar = () => {
    if (!texto.trim()) return;
    conCondiciones(async () => {
      setEnviando(true);
      setError(null);
      try {
        const r = await enviarMensajeMercado(publicacionId, texto.trim(), comprador);
        setMensajes(r.mensajes);
        setAviso(r.datosOcultos);
        setTexto("");
      } catch (err) {
        setError(mensajeError(err));
      } finally {
        setEnviando(false);
      }
    });
  };

  return (
    <div className={`${CAJA} p-5 flex flex-col h-[520px]`}>
      <div className="font-bold text-sm text-stone-900 dark:text-white">{titulo}</div>
      <div className="text-[11px] text-stone-500 dark:text-white/50 mb-3">Solo lo leen las dos fincas. Los datos de contacto se ocultan hasta cerrar el trato.</div>
      {cabecera}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {mensajes.length === 0 && (
          <p className="text-xs text-stone-500 text-center mt-10">Escribe para preguntar por el animal.</p>
        )}
        {mensajes.map((m) => m.esSistema ? (
          <div key={m.id} className="text-center">
            <span className="inline-block px-3 py-1 rounded-full bg-[#EEF6F1] dark:bg-emerald-500/10 text-[11px] text-[#2F6B4F] dark:text-emerald-200">{m.contenido}</span>
          </div>
        ) : (
          <div key={m.id} className={`flex ${m.esMio ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm ${m.esMio ? "bg-[#66B891] text-white rounded-br-md" : "bg-stone-100 dark:bg-white/10 text-stone-800 dark:text-white rounded-bl-md"}`}>
              {!m.esMio && m.emisorNombre && <div className="text-[10px] font-bold opacity-70">{m.emisorNombre}</div>}
              <div className="whitespace-pre-line break-words">{m.contenido}</div>
              <div className={`text-[10px] mt-0.5 ${m.esMio ? "text-white/70" : "text-stone-400"}`}>{fechaCorta(m.fecha)}</div>
            </div>
          </div>
        ))}
        <div ref={finRef} />
      </div>
      {aviso && (
        <p className="text-[11px] mt-2 px-3 py-2 rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-900 dark:text-sky-200">
          Ocultamos un dato de contacto de tu mensaje. Los datos de cada finca se muestran solos cuando se cierra el trato.
        </p>
      )}
      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
      {puedeEscribir ? (
        <form onSubmit={(e) => { e.preventDefault(); enviar(); }} className="flex gap-2 mt-3">
          <input className={INPUT} placeholder="Escribe un mensaje..." value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={2000} />
          <button type="submit" disabled={enviando || !texto.trim()} className={BOTON}>Enviar</button>
        </form>
      ) : (
        <p className="text-[11px] text-stone-500 mt-3">Solo el dueño o el administrador de la finca pueden escribir.</p>
      )}
    </div>
  );
}
