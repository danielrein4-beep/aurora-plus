import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AuroraLogo from "../AuroraLogo";
import { IconLock } from "../Icons";
import { resetearClave } from "../api";

export default function ResetearClave() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();

  const [clave, setClave] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (clave.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (clave !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setEnviando(true);
    try {
      await resetearClave(token, clave);
      setExito(true);
      setTimeout(() => navigate("/auth"), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo restablecer la contraseña.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#05070d] p-4">
      <div className="w-full max-w-sm rounded-3xl p-7 bg-[#0a0e17] border border-white/10 text-white shadow-2xl space-y-5">
        <div className="flex justify-center mb-1">
          <AuroraLogo size={36} />
        </div>
        <h1 className="text-xl font-bold text-center">Elige tu nueva contraseña</h1>

        {!token ? (
          <p className="text-sm text-rose-300 text-center">
            Este enlace no es válido — falta el token de recuperación. Solicita uno nuevo desde la pantalla de inicio de sesión.
          </p>
        ) : exito ? (
          <p className="text-sm text-teal-300 text-center">
            ✓ Contraseña actualizada. Redirigiendo al inicio de sesión…
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">{error}</p>
            )}
            <div className="space-y-1.5">
              <label className="text-[11px] text-white/50 uppercase font-mono">Nueva contraseña</label>
              <input
                type="password"
                required
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 text-white text-sm focus:outline-none focus:border-teal-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] text-white/50 uppercase font-mono">Confirmar contraseña</label>
              <input
                type="password"
                required
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                placeholder="Repite la contraseña"
                className="w-full px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 text-white text-sm focus:outline-none focus:border-teal-400"
              />
            </div>
            <button
              type="submit"
              disabled={enviando}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-900 text-sm font-bold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <IconLock size={14} />
              {enviando ? "Guardando…" : "Guardar nueva contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
