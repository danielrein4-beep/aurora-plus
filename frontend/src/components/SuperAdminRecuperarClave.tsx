import { useState } from "react";
import { solicitarRecuperacionClaveSuperAdmin, confirmarRecuperacionClaveSuperAdmin } from "../api";

interface Props {
  usernameInicial: string;
  /** Vuelve al login; `mensaje` se muestra allí si la clave se cambió. */
  onVolver: (mensaje?: string) => void;
}

const campo = "w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:border-slate-800 bg-white font-mono";
const etiqueta = "font-bold text-slate-600 uppercase tracking-wider text-[10px]";

function soloDigitos(v: string) {
  return v.replace(/\D/g, "").slice(0, 6);
}

/** "Olvidé mi contraseña" del equipo de administración: códigos a su correo y/o WhatsApp verificados. */
export default function SuperAdminRecuperarClave({ usernameInicial, onVolver }: Props) {
  const [username, setUsername] = useState(usernameInicial);
  const [enviado, setEnviado] = useState<{ mensaje: string; simulado: boolean } | null>(null);
  const [codigoEmail, setCodigoEmail] = useState("");
  const [codigoTelefono, setCodigoTelefono] = useState("");
  const [clave, setClave] = useState("");
  const [claveRepetida, setClaveRepetida] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  const ejecutar = async (fn: () => Promise<void>) => {
    setProcesando(true);
    setError(null);
    try { await fn(); } catch (e: any) { setError(e?.message || "No se pudo completar la operación"); } finally { setProcesando(false); }
  };

  const solicitar = (e: React.FormEvent) => {
    e.preventDefault();
    ejecutar(async () => setEnviado(await solicitarRecuperacionClaveSuperAdmin(username.trim())));
  };

  const confirmar = (e: React.FormEvent) => {
    e.preventDefault();
    ejecutar(async () => {
      if (clave !== claveRepetida) throw new Error("Las contraseñas no coinciden");
      const r = await confirmarRecuperacionClaveSuperAdmin({
        username: username.trim(),
        codigoEmail: codigoEmail || undefined,
        codigoTelefono: codigoTelefono || undefined,
        nuevaClave: clave,
      });
      onVolver(r.mensaje);
    });
  };

  return (
    <div className="space-y-4 text-xs">
      <div>
        <h2 className="font-bold text-slate-900 text-sm">Recuperar contraseña</h2>
        <p className="text-slate-500 mt-1">
          Le enviaremos un código a cada dato de contacto verificado de su cuenta (correo y WhatsApp).
          Si no tiene ninguno registrado, pida al propietario de la plataforma que resetee su acceso.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-center">{error}</div>
      )}

      {!enviado ? (
        <form onSubmit={solicitar} className="space-y-4">
          <div className="space-y-1">
            <label className={etiqueta}>Usuario</label>
            <input required value={username} onChange={(e) => setUsername(e.target.value)} className={campo} autoFocus />
          </div>
          <button type="submit" disabled={procesando || !username.trim()} className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm cursor-pointer disabled:opacity-50">
            {procesando ? "Enviando..." : "Enviar códigos"}
          </button>
        </form>
      ) : (
        <form onSubmit={confirmar} className="space-y-4">
          <p className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">{enviado.mensaje} Vencen en 10 minutos.</p>
          {enviado.simulado && (
            <p className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
              Modo desarrollo: el envío no está configurado y los códigos quedaron en el log del servidor.
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className={etiqueta}>Código del correo</label>
              <input inputMode="numeric" placeholder="000000" value={codigoEmail} onChange={(e) => setCodigoEmail(soloDigitos(e.target.value))} className={`${campo} text-center tracking-[0.3em]`} />
            </div>
            <div className="space-y-1">
              <label className={etiqueta}>Código de WhatsApp</label>
              <input inputMode="numeric" placeholder="000000" value={codigoTelefono} onChange={(e) => setCodigoTelefono(soloDigitos(e.target.value))} className={`${campo} text-center tracking-[0.3em]`} />
            </div>
          </div>
          <p className="text-[11px] text-slate-500">Escriba el código de cada medio donde lo recibió. Si solo tiene uno registrado, deje el otro vacío.</p>
          <div className="space-y-1">
            <label className={etiqueta}>Nueva contraseña (mínimo 10 caracteres)</label>
            <input type="password" required value={clave} onChange={(e) => setClave(e.target.value)} className={campo} />
          </div>
          <div className="space-y-1">
            <label className={etiqueta}>Repita la nueva contraseña</label>
            <input type="password" required value={claveRepetida} onChange={(e) => setClaveRepetida(e.target.value)} className={campo} />
          </div>
          <button
            type="submit"
            disabled={procesando || clave.length < 10 || (codigoEmail.length !== 6 && codigoTelefono.length !== 6)}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm cursor-pointer disabled:opacity-50"
          >
            {procesando ? "Verificando..." : "Cambiar contraseña"}
          </button>
        </form>
      )}

      <div className="text-center">
        <button type="button" onClick={() => onVolver()} className="text-slate-500 hover:text-slate-800 font-semibold cursor-pointer">
          Volver al inicio de sesión
        </button>
      </div>
    </div>
  );
}
