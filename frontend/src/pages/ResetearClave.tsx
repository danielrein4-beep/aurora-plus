import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AuroraLogo from "../AuroraLogo";
import { IconLock, IconCheck } from "../Icons";
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
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4 antialiased">
      <div className="w-full max-w-sm bg-white border border-[#E5E5EA] rounded-3xl p-7 text-[#1D1D1F] space-y-5 shadow-sm">
        <div className="flex justify-center mb-1">
          <AuroraLogo size={36} />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-center">Elige tu nueva contraseña</h1>

        {!token ? (
          <p className="text-sm text-red-600 text-center">
            Este enlace no es válido — falta el token de recuperación. Solicita uno nuevo desde la pantalla de inicio de sesión.
          </p>
        ) : exito ? (
          <p className="text-sm text-[#177E89] text-center flex items-center justify-center gap-1.5">
            <IconCheck size={14} /> Contraseña actualizada. Redirigiendo al inicio de sesión…
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>
            )}
            <div className="space-y-1.5">
              <label className="text-[11px] text-[#86868B] uppercase tracking-wider font-medium">Nueva contraseña</label>
              <input
                type="password"
                required
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-4 py-2.5 rounded-xl border border-[#E5E5EA] bg-white text-[#1D1D1F] text-sm focus:outline-none focus:border-[#177E89] transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] text-[#86868B] uppercase tracking-wider font-medium">Confirmar contraseña</label>
              <input
                type="password"
                required
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                placeholder="Repite la contraseña"
                className="w-full px-4 py-2.5 rounded-xl border border-[#E5E5EA] bg-white text-[#1D1D1F] text-sm focus:outline-none focus:border-[#177E89] transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={enviando}
              className="btn-deep-black w-full py-3 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
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
