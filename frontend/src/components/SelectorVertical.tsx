import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { obtenerMiNegocio } from "../api";

// Verticales listas para usar. `industry` es lo que cada app lee para saber en qué modo arrancar.
const VERTICALES: { industry: string; nombre: string; ruta: string }[] = [
  { industry: "clinica", nombre: "Mediclinic (Clínica)", ruta: "/mediclinic" },
  { industry: "odontologia", nombre: "Mediclinic Odonto", ruta: "/mediclinic" },
  { industry: "estetica", nombre: "Estética & Cosmiatría", ruta: "/estetica" },
  { industry: "veterinaria", nombre: "Veterinaria", ruta: "/veterinaria" },
  { industry: "restaurante", nombre: "Restaurante", ruta: "/restaurante" },
  { industry: "comercio", nombre: "Comercio", ruta: "/comercio" },
  { industry: "farmacia", nombre: "Farmacia", ruta: "/comercio" },
  { industry: "finca", nombre: "Ganadería", ruta: "/ganaderia" },
];

/**
 * Solo para cuentas de verificación (creadas desde el superadmin, ver V101): permite saltar entre
 * verticales desde el Hub sin crear otra cuenta. El servidor decide quién lo ve; el resto no lo ve.
 */
export default function SelectorVertical() {
  const { user, completeOnboarding } = useAuth();
  const navigate = useNavigate();
  const [permitido, setPermitido] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.tenantId) return;
    let activo = true;
    obtenerMiNegocio()
      .then((n) => activo && setPermitido(!!n.permiteCambioVertical))
      .catch(() => activo && setPermitido(false));
    return () => { activo = false; };
  }, [user?.tenantId]);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false); };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]);

  if (!permitido) return null;

  const cambiar = (v: (typeof VERTICALES)[number]) => {
    setAbierto(false);
    completeOnboarding({ industry: v.industry });
    navigate(v.ruta);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAbierto((a) => !a)}
        className="text-xs font-bold px-3.5 py-2 rounded-full border border-amber-400/50 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-colors cursor-pointer"
        title="Cuenta de verificación: cambiar de vertical"
      >
        Cambiar vertical ▾
      </button>
      {abierto && (
        <div className="absolute right-0 mt-2 w-60 z-50 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-xl p-1.5 whitespace-normal">
          <div className="px-3 pt-1.5 pb-2 text-[11px] text-slate-500 dark:text-white/50">
            Cuenta de verificación. Los datos siguen siendo los de este negocio.
          </div>
          {VERTICALES.map((v) => {
            const actual = user?.industry === v.industry;
            return (
              <button
                key={v.industry}
                onClick={() => cambiar(v)}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm transition cursor-pointer ${
                  actual ? "bg-slate-100 dark:bg-white/10 font-semibold text-slate-900 dark:text-white" : "text-slate-700 dark:text-white/80 hover:bg-slate-50 dark:hover:bg-white/5"
                }`}
              >
                {v.nombre}{actual ? " (actual)" : ""}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
