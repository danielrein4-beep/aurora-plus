import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { listarConversacionesMercado, obtenerComisionesMercado, obtenerResumenMercado, obtenerVerificacionMercado, type ConversacionMercado, type VerificacionMercado } from "../../api";
import Explorar from "./Explorar";
import FichaAnimal from "./FichaAnimal";
import Publicar from "./Publicar";
import Verificacion from "./Verificacion";
import { MiPuesto, MisCompras, BandejaMensajes } from "./Paneles";
import { useCondiciones, dinero, mensajeError, BOTON } from "./comun";

type Vista = "EXPLORAR" | "PUESTO" | "COMPRAS" | "MENSAJES" | "PUBLICAR" | "VERIFICACION";

const ICONOS: Record<string, string> = {
  EXPLORAR: "M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z",
  PUESTO: "M3 9l1.5-5h15L21 9M3 9h18M3 9v11h18V9M9 20v-6h6v6",
  COMPRAS: "M3 3h2l2.4 12.2a2 2 0 002 1.6h8.8a2 2 0 002-1.6L22 7H6M10 21a1 1 0 100-2 1 1 0 000 2zm9 0a1 1 0 100-2 1 1 0 000 2z",
  MENSAJES: "M8 10h8M8 14h5M21 12c0 4.4-4 8-9 8a9.9 9.9 0 01-4.3-.9L3 20l1.4-3.7C3.5 15 3 13.6 3 12c0-4.4 4-8 9-8s9 3.6 9 8z",
};

function IconoNav({ vista }: { vista: string }) {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={ICONOS[vista]} />
    </svg>
  );
}

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
  const [abierta, setAbierta] = useState<{ id: number; comprador?: string } | null>(null);
  const [conversaciones, setConversaciones] = useState<ConversacionMercado[]>([]);
  const [pendiente, setPendiente] = useState(0);
  const [sinAcceso, setSinAcceso] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [verificacion, setVerificacion] = useState<VerificacionMercado | null>(null);

  const sinLeer = conversaciones.reduce((s, c) => s + Number(c.sinLeer), 0);

  const refrescar = useCallback(() => {
    listarConversacionesMercado().then(setConversaciones).catch(() => {});
    obtenerComisionesMercado().then((c) => setPendiente(Number(c.pendiente))).catch(() => {});
  }, []);

  useEffect(() => {
    obtenerResumenMercado().catch((e) => setSinAcceso(mensajeError(e)));
    obtenerVerificacionMercado().then(setVerificacion).catch(() => {});
    refrescar();
    const intervalo = setInterval(refrescar, 20_000);
    return () => clearInterval(intervalo);
  }, [refrescar]);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [vista, abierta]);

  // En teléfono hay barra de navegación abajo: se avisa al resto de la app (el botón de soporte sube).
  useEffect(() => {
    document.body.classList.add("con-barra-inferior");
    return () => document.body.classList.remove("con-barra-inferior");
  }, []);

  const ir = (v: Vista) => { setAbierta(null); setAviso(null); setVista(v); };
  const abrir = (id: number, comprador?: string) => setAbierta({ id, comprador });

  // Mirar es libre; ofertar y escribir piden la verificación de comprador, publicar la de vendedor.
  // Si falta, se lleva a la pantalla de verificación en vez de dejar que el servidor lo rechace.
  const exigirNivel = (nivel: "COMPRAR" | "VENDER") => (accion: () => void) => {
    const ok = nivel === "VENDER" ? verificacion?.puedeVender : verificacion?.puedeComprar;
    if (ok || !verificacion) { conCondiciones(accion); return; }
    ir("VERIFICACION");
    setAviso(nivel === "VENDER"
      ? "Para publicar ganado, Aurora verifica primero tu cédula y tu registro de hierro."
      : "Para ofertar o escribir, Aurora verifica primero la ubicación de tu finca y la cédula del titular.");
  };
  const conCompra = exigirNivel("COMPRAR");
  const conVenta = exigirNivel("VENDER");

  const nav: [Vista, string, number?][] = [
    ["EXPLORAR", "Explorar"],
    ["PUESTO", "Mi puesto"],
    ["COMPRAS", "Mis compras"],
    ["MENSAJES", "Mensajes", sinLeer],
  ];

  return (
    <div className="mercado-ganadero min-h-screen bg-[#F7F6F2] dark:bg-[#07140e]">
      {/* CABECERA */}
      <header className="sticky top-0 z-40 bg-[#FBFAF7]/95 dark:bg-[#0c1f17]/95 backdrop-blur border-b border-stone-200/80 dark:border-white/10 text-stone-900 dark:text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <button onClick={() => ir("EXPLORAR")} className="flex items-center gap-2.5 cursor-pointer shrink-0">
            <span className="w-9 h-9 rounded-xl bg-[#66B891] text-white flex items-center justify-center font-black font-['Outfit']">M</span>
            <span className="leading-tight text-left hidden sm:block">
              <span className="block font-bold font-['Outfit'] text-stone-900 dark:text-white">Mercado Ganadero</span>
              <span className="block text-[10px] text-stone-500 tracking-wider uppercase">Aurora Plus</span>
            </span>
          </button>
          <nav className="flex-1 hidden md:flex items-center gap-1 overflow-x-auto">
            {nav.map(([id, label, badge]) => (
              <button
                key={id}
                onClick={() => ir(id)}
                className={`px-3.5 py-2 rounded-xl text-sm font-bold whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  vista === id && !abierta ? "bg-[#EEF6F1] text-[#3E8A66]" : "text-stone-500 hover:text-stone-900"
                }`}
              >
                {label}
                {!!badge && badge > 0 && <span className="px-1.5 py-0.5 rounded-full bg-[#66B891] text-white text-[10px] leading-none">{badge}</span>}
              </button>
            ))}
          </nav>
          <span className="flex-1 md:hidden font-bold font-['Outfit'] text-stone-900 dark:text-white truncate">Mercado Ganadero</span>
          {puedeNegociar && (
            <button onClick={() => (verificacion && !verificacion.puedeVender ? conVenta(() => ir("PUBLICAR")) : ir("PUBLICAR"))} className="px-4 py-2 rounded-xl bg-[#66B891] hover:bg-[#57A882] text-white text-sm font-bold cursor-pointer shrink-0 shadow-sm">
              Publicar
            </button>
          )}
          <button onClick={() => navigate("/ganaderia")} className="text-xs text-stone-500 hover:text-stone-900 cursor-pointer shrink-0 hidden md:block">
            Volver a mi finca
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-28 md:pb-8 space-y-6">
        {sinAcceso ? (
          <div className="rounded-3xl bg-white border border-stone-200 p-10 text-center space-y-3">
            <h1 className="text-2xl font-bold text-stone-900 font-['Outfit']">
              {sinAcceso.includes("suspendida") ? "Tu finca está suspendida del Mercado Ganadero" : "El Mercado Ganadero es para fincas con Aurora Ganadería"}
            </h1>
            <p className="text-sm text-stone-500">{sinAcceso}</p>
            {sinAcceso.includes("suspendida") && (
              <p className="text-sm text-stone-500">El resto de Aurora sigue funcionando normal. Si crees que es un error, escríbenos desde Soporte Aurora.</p>
            )}
            <button className={BOTON} onClick={() => navigate("/dashboard")}>Volver</button>
          </div>
        ) : (
          <>
            {pendiente > 0 && (
              <div className="rounded-2xl px-4 py-3 bg-[#EEF6F1] border border-[#CFE6D9] text-sm text-[#2F6B4F]">
                Tienes <strong>{dinero.format(pendiente)}</strong> en comisiones del mercado que se sumarán a tu próxima factura de Aurora.
              </div>
            )}
            {verificacion && !verificacion.puedeVender && vista !== "VERIFICACION" && (
              <button
                type="button"
                onClick={() => ir("VERIFICACION")}
                className="w-full text-left rounded-2xl px-4 py-3 bg-white border border-[#CFE6D9] text-sm text-stone-700 flex flex-wrap items-center gap-2 cursor-pointer hover:bg-[#F4F8F5]"
              >
                <span className="flex-1 min-w-0">
                  {verificacion.puedeComprar
                    ? "Ya puedes comprar. Para publicar tu ganado, verifica tu registro de hierro."
                    : Object.keys(verificacion.documentos).length > 0
                      ? "Tu verificación está en revisión. Mientras tanto puedes mirar el mercado."
                      : "Puedes mirar el mercado. Para ofertar, escribir o vender, verifica tu finca: toma unos minutos."}
                </span>
                <span className="font-bold text-[#3E8A66]">Ver verificación</span>
              </button>
            )}
            {aviso && (
              <div className="rounded-2xl px-4 py-3 bg-[#EEF6F1] border border-[#CFE6D9] text-sm text-[#2F6B4F] font-bold">{aviso}</div>
            )}

            {abierta ? (
              <FichaAnimal
                id={abierta.id}
                compradorInicial={abierta.comprador}
                puedeNegociar={puedeNegociar}
                conCondiciones={conCompra}
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
            ) : vista === "VERIFICACION" ? (
              <Verificacion estado={verificacion} onActualizado={setVerificacion} puedeEditar={puedeNegociar} />
            ) : (
              <Publicar
                conCondiciones={conVenta}
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

      {/* NAVEGACIÓN EN TELÉFONO */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#FBFAF7] dark:bg-[#0c1f17] border-t border-stone-200 dark:border-white/10 shadow-[0_-4px_16px_rgba(0,0,0,0.05)] grid grid-cols-4 pb-[env(safe-area-inset-bottom)]">
        {nav.map(([id, label, badge]) => {
          const activo = vista === id && !abierta;
          return (
            <button
              key={id}
              onClick={() => ir(id)}
              className={`relative flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-bold cursor-pointer ${activo ? "text-[#3E8A66]" : "text-stone-400"}`}
            >
              <IconoNav vista={id} />
              {label}
              {!!badge && badge > 0 && (
                <span className="absolute top-1.5 right-[calc(50%-18px)] min-w-[16px] px-1 py-0.5 rounded-full bg-[#66B891] text-white text-[9px] leading-none">{badge}</span>
              )}
            </button>
          );
        })}
      </nav>
      {modal}
    </div>
  );
}
