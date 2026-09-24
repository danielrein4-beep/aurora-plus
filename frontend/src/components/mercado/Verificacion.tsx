import { useEffect, useState, type ReactNode } from "react";
import {
  enviarVerificacionMercado,
  guardarFincaGanaderia,
  obtenerFincaGanaderia,
  type DocumentoVerificacionMercado,
  type TipoDocumentoMercado,
  type VerificacionMercado,
} from "../../api";
import { BOTON, BOTON_SUAVE, CAJA, INPUT, mensajeError } from "./comun";

const MAX_BYTES = 5 * 1024 * 1024;

function leerArchivo(f: File): Promise<string> {
  return new Promise((ok, falla) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => falla(new Error("No se pudo leer el archivo"));
    r.readAsDataURL(f);
  });
}

function EstadoDocumento({ doc }: { doc?: DocumentoVerificacionMercado }) {
  if (!doc) return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">Falta cargarlo</span>;
  if (doc.estado === "APROBADO") return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EEF6F1] text-[#3E8A66]">Verificado</span>;
  if (doc.estado === "RECHAZADO") return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">Rechazado</span>;
  return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">En revisión</span>;
}

function Paso({ numero, titulo, estado, children, opcional }: {
  numero: number; titulo: string; estado: ReactNode; children: ReactNode; opcional?: boolean;
}) {
  return (
    <div className={`${CAJA} p-5 space-y-3`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-7 h-7 rounded-full bg-[#EEF6F1] text-[#3E8A66] text-sm font-bold flex items-center justify-center">{numero}</span>
        <h3 className="flex-1 min-w-0 font-bold text-stone-900 dark:text-white">
          {titulo} {opcional && <span className="text-xs font-normal text-stone-400">(opcional)</span>}
        </h3>
        {estado}
      </div>
      {children}
    </div>
  );
}

/**
 * Verificación de la finca para el mercado. Mirar es libre; para ofertar y escribir hace falta
 * la ubicación y la cédula del titular verificada; para publicar, además el registro de hierro.
 * Los documentos se guardan cifrados y solo los ve el equipo verificador de Aurora.
 */
export default function Verificacion({ estado, onActualizado, puedeEditar }: {
  estado: VerificacionMercado | null;
  onActualizado: (v: VerificacionMercado) => void;
  puedeEditar: boolean;
}) {
  const [titular, setTitular] = useState("");
  const [cedula, setCedula] = useState("");
  const [hierro, setHierro] = useState("");
  const [tipoTierra, setTipoTierra] = useState("");
  const [archivos, setArchivos] = useState<Partial<Record<TipoDocumentoMercado, File>>>({});
  const [enviando, setEnviando] = useState(false);
  const [ubicando, setUbicando] = useState(false);
  const [latitud, setLatitud] = useState("");
  const [longitud, setLongitud] = useState("");
  const [aviso, setAviso] = useState<{ texto: string; tipo: "ok" | "error" } | null>(null);

  useEffect(() => {
    if (!estado) return;
    setTitular(estado.titularNombre ?? "");
    setCedula(estado.titularCedula ?? "");
    setHierro(estado.numeroHierro ?? "");
    setTipoTierra(estado.tipoTierra ?? "");
  }, [estado]);

  if (!estado) return <div className={`${CAJA} p-8 text-sm text-stone-500`}>Cargando la verificación de tu finca…</div>;

  const doc = (t: TipoDocumentoMercado) => estado.documentos[t];

  const elegir = (t: TipoDocumentoMercado, f: File | undefined) => {
    setAviso(null);
    if (!f) return;
    if (f.size > MAX_BYTES) { setAviso({ texto: "Cada documento puede pesar hasta 5 MB", tipo: "error" }); return; }
    if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      setAviso({ texto: "Sube el documento en PDF, JPG o PNG", tipo: "error" }); return;
    }
    setArchivos((a) => ({ ...a, [t]: f }));
  };

  const guardarUbicacion = async (lat: number, lng: number) => {
    setUbicando(true);
    setAviso(null);
    try {
      const actual = await obtenerFincaGanaderia().catch(() => undefined);
      await guardarFincaGanaderia({
        nombre: actual?.nombre || "Mi finca",
        latitud: lat,
        longitud: lng,
        puntosInteresJson: actual?.puntosInteresJson || "[]",
      });
      onActualizado({ ...estado, ubicacionCargada: true });
      setAviso({ texto: "Ubicación de la finca guardada", tipo: "ok" });
    } catch (e) {
      setAviso({ texto: mensajeError(e), tipo: "error" });
    } finally {
      setUbicando(false);
    }
  };

  const usarGps = () => {
    if (!navigator.geolocation) { setAviso({ texto: "Tu navegador no permite leer la ubicación: escribe las coordenadas", tipo: "error" }); return; }
    setUbicando(true);
    navigator.geolocation.getCurrentPosition(
      (p) => guardarUbicacion(p.coords.latitude, p.coords.longitude),
      () => { setUbicando(false); setAviso({ texto: "No pudimos leer tu ubicación. Da permiso al navegador o escribe las coordenadas.", tipo: "error" }); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const enviar = async () => {
    setAviso(null);
    const faltaCedula = !doc("CEDULA") && !archivos.CEDULA;
    if (!titular.trim() || !cedula.trim()) { setAviso({ texto: "Escribe el nombre y la cédula del titular de la finca", tipo: "error" }); return; }
    if (faltaCedula) { setAviso({ texto: "Adjunta una foto o PDF de la cédula del titular", tipo: "error" }); return; }
    if (archivos.HIERRO && !hierro.trim()) { setAviso({ texto: "Escribe el número del registro de hierro", tipo: "error" }); return; }
    if (archivos.TIERRA && !tipoTierra) { setAviso({ texto: "Indica qué documento de la tierra adjuntas", tipo: "error" }); return; }
    setEnviando(true);
    try {
      const adjuntos: Partial<Record<TipoDocumentoMercado, { nombre: string; dataUrl: string }>> = {};
      for (const [t, f] of Object.entries(archivos) as [TipoDocumentoMercado, File][]) {
        adjuntos[t] = { nombre: f.name, dataUrl: await leerArchivo(f) };
      }
      const nuevo = await enviarVerificacionMercado({
        titularNombre: titular.trim(),
        titularCedula: cedula.trim(),
        numeroHierro: hierro.trim() || undefined,
        tipoTierra: tipoTierra || undefined,
        archivos: adjuntos,
      });
      setArchivos({});
      onActualizado(nuevo);
      setAviso({ texto: "Recibido. El equipo de Aurora revisa los documentos en menos de 48 horas y te avisamos aquí.", tipo: "ok" });
    } catch (e) {
      setAviso({ texto: mensajeError(e), tipo: "error" });
    } finally {
      setEnviando(false);
    }
  };

  const selectorArchivo = (t: TipoDocumentoMercado, etiqueta: string) => (
    <label className={`${BOTON_SUAVE} inline-flex items-center gap-2`}>
      <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" disabled={!puedeEditar}
        onChange={(e) => { elegir(t, e.target.files?.[0]); e.target.value = ""; }} />
      {archivos[t] ? `Listo: ${archivos[t]!.name}` : doc(t) ? `Reemplazar ${etiqueta}` : `Adjuntar ${etiqueta}`}
    </label>
  );

  const motivo = (t: TipoDocumentoMercado) => doc(t)?.estado === "RECHAZADO" && doc(t)?.motivoRechazo && (
    <p className="text-xs text-rose-700 bg-rose-50 rounded-xl px-3 py-2">Motivo del rechazo: {doc(t)!.motivoRechazo}. Corrige y vuelve a enviarlo.</p>
  );

  return (
    <div className="max-w-3xl space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold font-['Outfit'] text-stone-900 dark:text-white">Verifica tu finca</h1>
        <p className="text-sm text-stone-600 dark:text-white/60">
          Todos pueden mirar el mercado. Para ofertar y escribir pedimos la ubicación de la finca y la cédula del titular; para publicar ganado,
          también el registro de hierro. Así cada trato es entre fincas reales.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${estado.puedeComprar ? "bg-[#EEF6F1] text-[#3E8A66]" : "bg-stone-100 text-stone-500"}`}>
            {estado.puedeComprar ? "Ya puedes ofertar y escribir" : "Aún no puedes ofertar"}
          </span>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${estado.puedeVender ? "bg-[#EEF6F1] text-[#3E8A66]" : "bg-stone-100 text-stone-500"}`}>
            {estado.puedeVender ? "Ya puedes publicar" : "Aún no puedes publicar"}
          </span>
        </div>
      </div>

      <div className="rounded-2xl px-4 py-3 bg-[#F4F8F5] border border-[#DCEBE2] text-xs text-stone-600 dark:bg-white/5 dark:border-white/10 dark:text-white/60">
        Tus documentos se guardan cifrados. Solo los abre el equipo verificador de Aurora y cada apertura queda registrada.
        Ninguna otra finca los ve: en el mercado solo aparece el sello de "Verificado".
      </div>

      <Paso numero={1} titulo="Ubicación de la finca" estado={estado.ubicacionCargada
        ? <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EEF6F1] text-[#3E8A66]">Cargada</span>
        : <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">Falta</span>}>
        {estado.ubicacionCargada ? (
          <p className="text-sm text-stone-500">Tu finca ya tiene su ubicación. Puedes ajustarla en el mapa de tu finca en Ganadería.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-stone-500">Si estás en la finca, usa tu ubicación actual. Si no, escribe las coordenadas (las ves en Google Maps al tocar el punto).</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={BOTON} onClick={usarGps} disabled={ubicando || !puedeEditar}>
                {ubicando ? "Guardando…" : "Estoy en la finca: usar mi ubicación"}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
              <input className={INPUT} placeholder="Latitud (ej. 8.6226)" value={latitud} onChange={(e) => setLatitud(e.target.value)} inputMode="decimal" />
              <input className={INPUT} placeholder="Longitud (ej. -70.2075)" value={longitud} onChange={(e) => setLongitud(e.target.value)} inputMode="decimal" />
              <button type="button" className={BOTON_SUAVE} disabled={ubicando || !puedeEditar}
                onClick={() => {
                  const lat = Number(latitud.replace(",", ".")), lng = Number(longitud.replace(",", "."));
                  if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180) || !latitud || !longitud) { setAviso({ texto: "Revisa las coordenadas", tipo: "error" }); return; }
                  guardarUbicacion(lat, lng);
                }}>
                Guardar
              </button>
            </div>
          </div>
        )}
      </Paso>

      <Paso numero={2} titulo="Cédula del titular" estado={<EstadoDocumento doc={doc("CEDULA")} />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input className={INPUT} placeholder="Nombre completo del titular" value={titular} onChange={(e) => setTitular(e.target.value)} disabled={!puedeEditar} />
          <input className={INPUT} placeholder="Cédula (V-12345678)" value={cedula} onChange={(e) => setCedula(e.target.value)} disabled={!puedeEditar} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectorArchivo("CEDULA", "cédula")}
          <span className="text-[11px] text-stone-400">Foto clara por ambos lados o PDF, hasta 5 MB.</span>
        </div>
        {motivo("CEDULA")}
      </Paso>

      <Paso numero={3} titulo="Registro de hierro" estado={<EstadoDocumento doc={doc("HIERRO")} />}>
        <p className="text-sm text-stone-500">Es lo que prueba que el ganado es tuyo. Solo hace falta para publicar.</p>
        <input className={INPUT} placeholder="Número del registro de hierro" value={hierro} onChange={(e) => setHierro(e.target.value)} disabled={!puedeEditar} />
        <div className="flex flex-wrap items-center gap-2">{selectorArchivo("HIERRO", "registro de hierro")}</div>
        {motivo("HIERRO")}
      </Paso>

      <Paso numero={4} titulo="Documento de la tierra" opcional estado={<EstadoDocumento doc={doc("TIERRA")} />}>
        <p className="text-sm text-stone-500">Título de propiedad, contrato de arrendamiento o comodato. No es obligatorio, pero suma un sello más en tu tarjeta de vendedor.</p>
        <select className={INPUT} value={tipoTierra} onChange={(e) => setTipoTierra(e.target.value)} disabled={!puedeEditar}>
          <option value="">¿Qué documento tienes?</option>
          <option value="PROPIEDAD">Título de propiedad</option>
          <option value="ARRENDAMIENTO">Contrato de arrendamiento</option>
          <option value="COMODATO">Comodato</option>
        </select>
        <div className="flex flex-wrap items-center gap-2">{selectorArchivo("TIERRA", "documento")}</div>
        {motivo("TIERRA")}
      </Paso>

      {aviso && (
        <p className={`text-sm rounded-xl px-4 py-3 ${aviso.tipo === "ok" ? "bg-[#EEF6F1] text-[#2F6B4F]" : "bg-rose-50 text-rose-700"}`}>{aviso.texto}</p>
      )}
      {puedeEditar ? (
        <button type="button" className={BOTON} onClick={enviar} disabled={enviando}>
          {enviando ? "Enviando…" : "Enviar a verificación"}
        </button>
      ) : (
        <p className="text-sm text-stone-500">Solo el dueño o el administrador de la finca puede cargar estos documentos.</p>
      )}
    </div>
  );
}
