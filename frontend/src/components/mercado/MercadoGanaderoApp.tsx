import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { listarConversacionesMercado, obtenerComisionesMercado, obtenerResumenMercado, type ConversacionMercado } from "../../api";
import Explorar from "./Explorar";
import FichaAnimal from "./FichaAnimal";
import Publicar from "./Publicar";
import { MiPuesto, MisCompras, BandejaMensajes } from "./Paneles";
import { useCondiciones, dinero, mensajeError, BOTON } from "./comun";

type Vista = "EXPLORAR" | "PUESTO" | "COMPRAS" | "MENSAJES" | "PUBLICAR";

/**
 * Mercado Ganadero de Aurora: una página propia, fuera del módulo de
 * ganadería, donde las fincas compran y venden entre sí. Solo entra quien
 * tiene Ganadería activa (lo controla el backend).
 */
export default function MercadoGanaderoApp() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const puedeNegociar = user?.rol === "DUENO_ADMIN" || user?.rol === "ADMINISTRADOR_FINCA";
  const { conCondiciones, modal } = useCondiciones();

  const [vista, setVista] = useState<Vista>("EXPLORAR");
  const [abierta, setAbierta] = useState<{ id: number; comprador?: number } | null>(null);
  const [conversaciones, setConversaciones] = useState<ConversacionMercado[]>([]);
  const [pendiente, setPendiente] = useState(0);
  const [sinAcceso, setSinAcceso] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const sinLeer = conversaciones.reduce((s, c) => s + Number(c.sinLeer), 0);

  const refrescar = useCallback(() => {
    listarConversacionesMercado().then(setConversaciones).catch(() => {});
    obtenerComisionesMercado().then((c) => setPendiente(Number(c.pendiente))).catch(() => {});
  }, []);

  useEffect(() => {
    obtenerResumenMercado().catch((e) => setSinAcceso(mensajeError(e)));
    refrescar();
    const intervalo = setInterval(refrescar, 20_000);
    return () => clearInterval(intervalo);
  }, [refrescar]);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [vista, abierta]);

  const ir = (v: Vista) => { setAbierta(null); setAviso(null); setVista(v); };
  const abrir = (id: number, comprador?: number) => setAbierta({ id, comprador });

  const nav: [Vista, string, number?][] = [
    ["EXPLORAR", "Explorar"],
    ["PUESTO", "Mi puesto"],
    ["COMPRAS", "Mis compras"],
    ["MENSAJES", "Mensajes", sinLeer],
  ];

  return (
    <div className="mercado-ganadero min-h-screen bg-stone-50 dark:bg-[#07140e]">
      {/* CABECERA */}
      <header className="sticky top-0 z-40 bg-emerald-950 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <button onClick={() => ir("EXPLORAR")} className="flex items-center gap-2.5 cursor-pointer shrink-0">
            <span className="w-9 h-9 rounded-xl bg-amber-500 text-emerald-950 flex items-center justify-center font-black font-['Outfit']">M</span>
            <span className="leading-tight text-left hidden sm:block">
              <span className="block font-bold font-['Outfit']">Mercado Ganadero</span>
              <span className="block text-[10px] text-emerald-200/70 tracking-wider uppercase">Aurora Plus</span>
            </span>
          </button>
          <nav className="flex-1 flex items-center gap-1 overflow-x-auto">
            {nav.map(([id, label, badge]) => (
              <button
                key={id}
                onClick={() => ir(id)}
                className={`px-3.5 py-2 rounded-xl text-sm font-bold whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  vista === id && !abierta ? "bg-white/15 text-white" : "text-emerald-100/70 hover:text-white"
                }`}
              >
                {label}
                {!!badge && badge > 0 && <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-emerald-950 text-[10px] leading-none">{badge}</span>}
              </button>
            ))}
          </nav>
          {puedeNegociar && (
            <button onClick={() => ir("PUBLICAR")} className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-emerald-950 text-sm font-bold cursor-pointer shrink-0">
              Publicar
            </button>
          )}
          <button onClick={() => navigate("/ganaderia")} className="text-xs text-emerald-100/70 hover:text-white cursor-pointer shrink-0 hidden md:block">
            Volver a mi finca
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {sinAcceso ? (
          <div className="rounded-3xl bg-white border border-stone-200 p-10 text-center space-y-3">
            <h1 className="text-2xl font-bold text-stone-900 font-['Outfit']">El Mercado Ganadero es para fincas con Aurora Ganadería</h1>
            <p className="text-sm text-stone-500">{sinAcceso}</p>
            <button className={BOTON} onClick={() => navigate("/dashboard")}>Volver</button>
          </div>
        ) : (
          <>
            {pendiente > 0 && (
              <div className="rounded-2xl px-4 py-3 bg-amber-50 border border-amber-200 text-sm text-amber-900">
                Tienes <strong>{dinero.format(pendiente)}</strong> en comisiones del mercado que se sumarán a tu próxima factura de Aurora.
              </div>
            )}
            {aviso && (
              <div className="rounded-2xl px-4 py-3 bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 font-bold">{aviso}</div>
            )}

            {abierta ? (
              <FichaAnimal
                id={abierta.id}
                compradorInicial={abierta.comprador}
                puedeNegociar={puedeNegociar}
                conCondiciones={conCondiciones}
                onVolver={() => { setAbierta(null); setAviso(null); refrescar(); }}
                onCambio={refrescar}
              />
            ) : vista === "EXPLORAR" ? (
              <Explorar onAbrir={abrir} />
            ) : vista === "PUESTO" ? (
              <MiPuesto onAbrir={abrir} onPublicar={puedeNegociar ? () => ir("PUBLICAR") : undefined} />
            ) : vista === "COMPRAS" ? (
              <MisCompras onAbrir={abrir} />
            ) : vista === "MENSAJES" ? (
              <BandejaMensajes conversaciones={conversaciones} onAbrir={abrir} />
            ) : (
              <Publicar
                conCondiciones={conCondiciones}
                onCancelar={() => ir("EXPLORAR")}
                onListo={(id, oculto) => {
                  setVista("PUESTO");
                  setAviso(oculto
                    ? "Publicado. Ocultamos datos de contacto que escribiste: se comparten solos al cerrar el trato."
                    : "Tu animal ya está en el mercado.");
                  abrir(id);
                }}
              />
            )}
          </>
        )}
      </main>
      {modal}
    </div>
  );
}
