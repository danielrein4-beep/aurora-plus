import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconUsers } from "../Icons";
import { obtenerCapacidadesPersonal } from "../api";

/**
 * Navegación común para los portales operativos. Expone Personal solamente
 * cuando RBAC lo permite. Finanzas se accede desde el Dashboard, no desde aquí.
 */
export default function ModuleAccessBar() {
  const navigate = useNavigate();
  const [puedeVerPersonal, setPuedeVerPersonal] = useState(false);

  useEffect(() => {
    let activo = true;
    obtenerCapacidadesPersonal()
      .then((capacidades) => activo && setPuedeVerPersonal(capacidades.accesoPersonal))
      .catch(() => activo && setPuedeVerPersonal(false));
    return () => { activo = false; };
  }, []);

  return (
    <nav
      aria-label="Módulos transversales"
      className="relative z-50 flex min-h-11 items-center justify-between gap-3 border-b border-[#35d7c3]/20 bg-[#061316] px-3 py-2 font-['IBM_Plex_Sans',sans-serif] text-xs sm:px-5"
    >
      <button
        type="button"
        onClick={() => navigate("/dashboard")}
        className="font-['IBM_Plex_Mono',monospace] text-[10px] font-semibold uppercase tracking-[.12em] text-white/65 transition-colors hover:text-[#35d7c3]"
      >
        Aurora / Hub
      </button>

      <div className="flex items-center gap-1.5">
        {puedeVerPersonal && (
          <button
            type="button"
            onClick={() => navigate("/personal")}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-transparent px-3 py-1.5 font-semibold text-white/75 transition-colors hover:border-[#35d7c3]/55 hover:text-[#35d7c3]"
          >
            <IconUsers size={14} />
            <span>Personal</span>
          </button>
        )}
      </div>
    </nav>
  );
}
