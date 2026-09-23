import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { IconCalendar, IconFileText, IconLock, IconPrescription, IconShield, IconTooth } from "../Icons";
import AuroraLogo from "../AuroraLogo";

// Portal publico del paciente odontologico. Se llega solo por el QR de la receta (o el
// enlace que envia la clinica). Tener el enlace no basta: el paciente confirma su identidad
// con los ultimos 4 digitos de su cedula y recibe una sesion de 30 minutos.
// El token se saca de la barra de direcciones apenas se abre, para que no quede en el
// historial ni se reenvie por accidente; vive solo en sessionStorage de esta pestana.

const CLAVE_TOKEN = "aurora_portal_odonto_token";
const CLAVE_SESION = "aurora_portal_odonto_sesion";

interface Hallazgo {
  numero_fdi: number;
  estado: string;
}

interface ItemPlan {
  fase: string;
  diente_fdi: number | null;
  procedimiento: string;
  costo_usd: number;
  estado: string;
}

interface Plan {
  nombre_plan: string;
  estado: string;
  monto_total_usd: number;
  monto_pagado_usd: number;
  items: ItemPlan[];
  cuotas: { numero: number; fecha_vencimiento: string; monto_usd: number }[];
}

interface Portal {
  clinica: string;
  doctor: string | null;
  paciente: string;
  hallazgos: Hallazgo[];
  planes: Plan[];
  proximasCitas: { fecha_cita: string; hora_inicio: string; odontologo: string; motivo: string }[];
  recetas: { fecha_registro: string; odontologo: string; diagnostico: string | null; items: string; indicaciones: string | null }[];
  radiografias: { id: number; titulo: string; tipo_estudio: string; fecha_toma: string; origen: string }[];
}

const ESTADO_PIEZA: Record<string, { texto: string; clase: string }> = {
  CARIES: { texto: "Caries por tratar", clase: "bg-rose-500 text-[#FFFFFF]" },
  EXTRACCION_INDICADA: { texto: "Extracción indicada", clase: "bg-orange-500 text-[#FFFFFF]" },
  ENDODONCIA: { texto: "Tratamiento de conducto", clase: "bg-violet-500 text-[#FFFFFF]" },
  OBTURADO: { texto: "Restaurada", clase: "bg-sky-500 text-[#FFFFFF]" },
  CORONA: { texto: "Corona", clase: "bg-amber-400 text-slate-900" },
  IMPLANTE: { texto: "Implante", clase: "bg-aurora-primary text-[#FFFFFF]" },
  AUSENTE: { texto: "Ausente", clase: "bg-slate-300 text-slate-600" },
};

const ESTADO_PLAN: Record<string, string> = {
  PROPUESTO: "Por aprobar",
  APROBADO: "Aprobado",
  EN_CURSO: "En curso",
  COMPLETADO: "Completado",
};

const FASE: Record<string, string> = {
  FASE_1_HIGIENE: "Limpieza y control de infección",
  FASE_2_QUIRURGICA: "Conductos y cirugías",
  FASE_3_REHABILITACION: "Rehabilitación",
};

const ESTUDIOS = [
  { id: "PANORAMICA", nombre: "Radiografía panorámica" },
  { id: "PERIAPICAL", nombre: "Radiografía de una pieza" },
  { id: "TOMOGRAFIA", nombre: "Tomografía" },
  { id: "FOTOGRAFIA_CLINICA", nombre: "Foto de mi boca" },
  { id: "OTRO", nombre: "Otro estudio" },
];

const SUPERIOR = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const INFERIOR = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

const usd = (n: number) => `$${Number(n || 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fecha = (f: string) =>
  new Date(f.length === 10 ? `${f}T00:00:00` : f).toLocaleDateString("es-VE", { day: "numeric", month: "long", year: "numeric" });

function leer(clave: string) {
  try {
    return sessionStorage.getItem(clave);
  } catch {
    return null;
  }
}

function guardar(clave: string, valor: string | null) {
  try {
    if (valor === null) sessionStorage.removeItem(clave);
    else sessionStorage.setItem(clave, valor);
  } catch {
    // Sin sessionStorage (navegacion privada estricta) el portal sigue funcionando en esta vista.
  }
}

// Las fotos del telefono pesan varios MB: se reducen a 2000 px y JPEG antes de subir.
function comprimirImagen(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onerror = reject;
    lector.onload = () => {
      const original = lector.result as string;
      if (file.type === "application/pdf") return resolve(original);
      const img = new Image();
      img.onerror = () => resolve(original);
      img.onload = () => {
        const escala = Math.min(1, 2000 / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(original);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = original;
    };
    lector.readAsDataURL(file);
  });
}

// El nombre del odontologo solo se muestra si existe y no repite el de la clinica
// (en consultorios individuales el usuario suele llevar el mismo nombre).
function doctorVisible(doctor: string | null | undefined, clinica: string): doctor is string {
  return !!doctor && doctor.trim().toLowerCase() !== clinica.trim().toLowerCase();
}

// Firma discreta de Aurora: la clinica es la protagonista del portal.
function SelloAurora({ conTecnologia = false }: { conTecnologia?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/70 backdrop-blur-sm border border-slate-200/70 opacity-80 select-none">
      <AuroraLogo size={16} animated={false} />
      <span className="text-[11px] text-slate-500">
        {conTecnologia && "Con tecnología de "}
        <span className="font-semibold text-slate-600">Aurora Plus</span>
      </span>
    </div>
  );
}

function Tarjeta({ icono, titulo, children }: { icono?: React.ReactNode; titulo: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_1px_2px_rgba(13,59,61,0.04),0_8px_24px_-12px_rgba(13,59,61,0.12)] p-5 space-y-4">
      <h2 className="flex items-center gap-2.5 font-semibold text-[15px] text-aurora-dark">
        {icono && <span className="w-8 h-8 rounded-xl bg-teal-50 text-aurora-primary flex items-center justify-center">{icono}</span>}
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function MapaDental({ hallazgos }: { hallazgos: Hallazgo[] }) {
  const porPieza = useMemo(() => {
    const m: Record<number, string> = {};
    hallazgos.forEach((h) => (m[h.numero_fdi] = h.estado));
    return m;
  }, [hallazgos]);
  const presentes = Array.from(new Set(hallazgos.map((h) => h.estado)));

  const fila = (piezas: number[]) => (
    <div className="grid grid-cols-16 gap-[3px]" style={{ gridTemplateColumns: "repeat(16, minmax(0, 1fr))" }}>
      {piezas.map((n) => {
        const estado = porPieza[n];
        return (
          <div
            key={n}
            title={estado ? `Pieza ${n}: ${ESTADO_PIEZA[estado]?.texto || estado}` : `Pieza ${n}: sana`}
            className={`aspect-[3/4] rounded-md flex items-center justify-center text-[9px] font-semibold tabular-nums ${
              estado ? ESTADO_PIEZA[estado]?.clase || "bg-slate-400 text-[#FFFFFF]" : "bg-teal-50 text-aurora-dark/50 border border-teal-100"
            }`}
          >
            {n}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400 text-center">Arriba</div>
        {fila(SUPERIOR)}
        <div className="h-px bg-slate-200 my-2" />
        {fila(INFERIOR)}
        <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400 text-center">Abajo</div>
      </div>
      {presentes.length === 0 ? (
        <p className="text-sm text-slate-600">No hay hallazgos registrados en sus piezas dentales.</p>
      ) : (
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600">
          {presentes.map((e) => (
            <li key={e} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded ${ESTADO_PIEZA[e]?.clase || "bg-slate-400"}`} />
              {ESTADO_PIEZA[e]?.texto || e} ({hallazgos.filter((h) => h.estado === e).length})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PortalOdontologiaPaciente() {
  const { token: tokenUrl } = useParams<{ token: string }>();
  const [token] = useState<string | null>(() => tokenUrl || leer(CLAVE_TOKEN));
  const [sesion, setSesion] = useState<string | null>(() => leer(CLAVE_SESION));
  const [inicio, setInicio] = useState<{ clinica: string; doctor: string | null; metodo: string } | null>(null);
  const [datos, setDatos] = useState<Portal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [respuesta, setRespuesta] = useState("");
  const [verificando, setVerificando] = useState(false);
  const [errorVerif, setErrorVerif] = useState<string | null>(null);
  const [imagen, setImagen] = useState<{ titulo: string; archivo: string } | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [tipo, setTipo] = useState("PANORAMICA");
  // Si elige "Otro estudio", el paciente escribe cual es y ese nombre queda como titulo.
  const [otroEstudio, setOtroEstudio] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);

  // Saca el token de la URL y evita que se filtre como Referer a recursos externos.
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "referrer";
    meta.content = "no-referrer";
    document.head.appendChild(meta);
    const tituloPrevio = document.title;
    document.title = "Mi historia dental";
    if (tokenUrl) {
      guardar(CLAVE_TOKEN, tokenUrl);
      window.history.replaceState({}, "", "/odonto-paciente");
    }
    return () => {
      document.head.removeChild(meta);
      document.title = tituloPrevio;
    };
  }, [tokenUrl]);

  const cabeceras = (s: string | null): Record<string, string> => (s ? { "X-Portal-Sesion": s } : {});

  const cerrarSesion = (motivo?: string) => {
    guardar(CLAVE_SESION, null);
    setSesion(null);
    setDatos(null);
    if (motivo) setErrorVerif(motivo);
  };

  useEffect(() => {
    if (!token) {
      setError("Para ver su historia dental, escanee el código QR de su receta.");
      return;
    }
    fetch(`/api/public/odontologia/portal/${token}/inicio`)
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        if (!r.ok) throw new Error(d?.message || "Este enlace no es válido o ya venció. Pídale uno nuevo a su clínica.");
        setInicio(d);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo abrir el portal."));
  }, [token]);

  const cargar = async (s: string) => {
    const r = await fetch(`/api/public/odontologia/portal/${token}`, { headers: cabeceras(s) });
    if (r.status === 401) return cerrarSesion("Su sesión venció. Confirme su identidad de nuevo.");
    if (!r.ok) return setError("Este enlace no es válido o ya venció. Pídale uno nuevo a su clínica.");
    setDatos(await r.json());
  };

  useEffect(() => {
    if (token && sesion && inicio) cargar(sesion);
  }, [token, sesion, inicio]);

  const verificar = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerificando(true);
    setErrorVerif(null);
    try {
      const r = await fetch(`/api/public/odontologia/portal/${token}/verificar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ respuesta }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(r.status === 429 && !d?.message ? "Demasiados intentos. Espere unos minutos." : d?.message || "No se pudo verificar.");
      guardar(CLAVE_SESION, d.sesion);
      setRespuesta("");
      setSesion(d.sesion);
    } catch (err) {
      setErrorVerif(err instanceof Error ? err.message : "No se pudo verificar.");
    } finally {
      setVerificando(false);
    }
  };

  const verImagen = async (id: number, titulo: string) => {
    const r = await fetch(`/api/public/odontologia/portal/${token}/radiografias/${id}`, { headers: cabeceras(sesion) });
    if (r.status === 401) return cerrarSesion("Su sesión venció. Confirme su identidad de nuevo.");
    if (!r.ok) return setAviso({ ok: false, texto: "No se pudo abrir el estudio. Intente de nuevo." });
    const d = await r.json();
    setImagen({ titulo, archivo: d.archivo });
  };

  const subir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archivo) return;
    setSubiendo(true);
    setAviso(null);
    try {
      const contenido = await comprimirImagen(archivo);
      const r = await fetch(`/api/public/odontologia/portal/${token}/radiografias`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...cabeceras(sesion) },
        body: JSON.stringify({
          titulo: tipo === "OTRO" ? otroEstudio.trim() : ESTUDIOS.find((x) => x.id === tipo)?.nombre,
          tipoEstudio: tipo,
          archivo: contenido,
        }),
      });
      if (r.status === 401) return cerrarSesion("Su sesión venció. Confirme su identidad de nuevo.");
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.message || "No se pudo enviar el archivo.");
      setAviso({ ok: true, texto: d?.mensaje || "Recibimos su estudio." });
      setArchivo(null);
      setOtroEstudio("");
      if (sesion) cargar(sesion);
    } catch (err) {
      setAviso({ ok: false, texto: err instanceof Error ? err.message : "No se pudo enviar el archivo." });
    } finally {
      setSubiendo(false);
    }
  };

  const fondo = "min-h-screen bg-[radial-gradient(1200px_600px_at_50%_-10%,#D3E8E8_0%,#F4F8F8_45%,#F7F9F9_100%)] text-slate-800";

  if (error) {
    return (
      <main className={`${fondo} flex items-center justify-center p-6`}>
        <div className="max-w-sm text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white shadow-sm text-aurora-primary flex items-center justify-center">
            <IconTooth size={26} />
          </div>
          <p className="text-slate-700">{error}</p>
        </div>
      </main>
    );
  }

  if (!inicio) {
    return <main className={`${fondo} flex items-center justify-center text-slate-500 text-sm`}>Abriendo su portal...</main>;
  }

  // Pantalla de confirmacion de identidad
  if (!sesion || !datos) {
    const esCedula = inicio.metodo !== "ANIO_NACIMIENTO";
    return (
      <main className={`${fondo} flex items-center justify-center p-5`}>
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-[22px] bg-gradient-to-br from-aurora-primary to-aurora-dark text-[#FFFFFF] flex items-center justify-center shadow-lg shadow-teal-900/20">
              <IconTooth size={30} />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-aurora-primary font-semibold">{inicio.clinica}</p>
              <h1 className="text-2xl font-semibold text-aurora-dark mt-1">Su historia dental</h1>
              {doctorVisible(inicio.doctor, inicio.clinica) && (
                <p className="text-sm text-slate-500 mt-1">Consultorio de {inicio.doctor}</p>
              )}
            </div>
          </div>

          {sesion && !datos ? (
            <p className="text-center text-sm text-slate-500">Cargando su historia...</p>
          ) : (
            <form onSubmit={verificar} className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_-12px_rgba(13,59,61,0.18)] p-6 space-y-4">
              <div className="flex items-start gap-3">
                <span className="w-9 h-9 shrink-0 rounded-xl bg-teal-50 text-aurora-primary flex items-center justify-center">
                  <IconLock size={18} />
                </span>
                <p className="text-sm text-slate-600">
                  Para proteger su información, confirme que es usted.
                  {esCedula ? " Escriba los últimos 4 dígitos de su cédula." : " Escriba su año de nacimiento."}
                </p>
              </div>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                value={respuesta}
                onChange={(e) => setRespuesta(e.target.value.replace(/\D/g, "").slice(0, 4))}
                aria-label={esCedula ? "Últimos 4 dígitos de su cédula" : "Año de nacimiento"}
                placeholder="· · · ·"
                className="w-full text-center text-3xl tracking-[0.5em] font-semibold tabular-nums py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-aurora-primary/40 focus:border-aurora-primary text-aurora-dark placeholder:text-slate-300"
              />
              {errorVerif && <p className="text-sm text-rose-600 font-medium">{errorVerif}</p>}
              <button
                type="submit"
                disabled={respuesta.length !== 4 || verificando}
                className="w-full py-3.5 rounded-2xl bg-aurora-primary hover:bg-teal-600 text-[#FFFFFF] font-semibold transition disabled:opacity-40"
              >
                {verificando ? "Verificando..." : "Entrar"}
              </button>
            </form>
          )}

          <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <IconShield size={13} /> Enlace personal y protegido
          </p>
        </div>
        <div className="fixed bottom-4 right-4">
          <SelloAurora />
        </div>
      </main>
    );
  }

  const proxima = datos.proximasCitas[0];

  return (
    <main className={fondo}>
      <header className="bg-gradient-to-br from-aurora-dark via-teal-800 to-aurora-primary text-[#FFFFFF]">
        <div className="max-w-xl mx-auto px-5 pt-8 pb-16">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.18em] text-teal-100/90 font-semibold">{datos.clinica}</p>
            <button type="button" onClick={() => cerrarSesion()} className="text-xs text-teal-100/90 hover:text-[#FFFFFF] underline-offset-2 hover:underline">
              Salir
            </button>
          </div>
          <h1 className="text-[28px] font-semibold mt-3 leading-tight">Hola, {datos.paciente}</h1>
          <p className="text-teal-50/80 text-sm mt-1">
            {doctorVisible(datos.doctor, datos.clinica) ? `Atendido por ${datos.doctor}` : "Su historia dental, siempre a mano."}
          </p>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 -mt-10 pb-10 space-y-4">
        {proxima && (
          <section className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_12px_32px_-14px_rgba(13,59,61,0.25)] p-5 flex items-center gap-4">
            <div className="w-14 h-14 shrink-0 rounded-2xl bg-teal-50 text-aurora-primary flex flex-col items-center justify-center">
              <span className="text-lg font-semibold leading-none tabular-nums">{new Date(`${proxima.fecha_cita}T00:00:00`).getDate()}</span>
              <span className="text-[10px] uppercase tracking-wider">
                {new Date(`${proxima.fecha_cita}T00:00:00`).toLocaleDateString("es-VE", { month: "short" })}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Próxima cita</p>
              <p className="font-semibold text-aurora-dark">
                {fecha(proxima.fecha_cita)}, {proxima.hora_inicio.substring(0, 5)}
              </p>
              <p className="text-sm text-slate-500 truncate">
                {proxima.motivo} con {proxima.odontologo}
              </p>
            </div>
          </section>
        )}

        <Tarjeta icono={<IconTooth size={16} />} titulo="Su diagnóstico">
          <MapaDental hallazgos={datos.hallazgos} />
        </Tarjeta>

        {datos.planes.map((plan, i) => {
          const hechos = plan.items.filter((it) => it.estado === "REALIZADO").length;
          const avance = plan.items.length ? Math.round((hechos / plan.items.length) * 100) : 0;
          const saldo = Number(plan.monto_total_usd) - Number(plan.monto_pagado_usd);
          const fases = Array.from(new Set(plan.items.map((it) => it.fase)));
          return (
            <Tarjeta key={i} icono={<IconFileText size={16} />} titulo={plan.nombre_plan}>
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span className="font-medium text-aurora-primary">{ESTADO_PLAN[plan.estado] || plan.estado}</span>
                  <span className="tabular-nums">
                    {hechos} de {plan.items.length} tratamientos
                  </span>
                </div>
                <div className="h-2 rounded-full bg-teal-50 overflow-hidden" role="progressbar" aria-valuenow={avance} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-gradient-to-r from-aurora-light to-aurora-primary transition-all" style={{ width: `${avance}%` }} />
                </div>
              </div>

              {fases.map((f, n) => (
                <div key={f} className="space-y-1">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                    Etapa {n + 1}: {FASE[f] || f}
                  </p>
                  <ul>
                    {plan.items
                      .filter((it) => it.fase === f)
                      .map((it, k) => {
                        const hecho = it.estado === "REALIZADO";
                        return (
                          <li key={k} className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
                            <span className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`w-4 h-4 shrink-0 rounded-full border-2 ${hecho ? "bg-aurora-primary border-aurora-primary" : "border-slate-300"}`}
                                aria-label={hecho ? "Realizado" : "Pendiente"}
                              />
                              <span className={`text-sm truncate ${hecho ? "text-slate-400 line-through" : "text-slate-700"}`}>{it.procedimiento}</span>
                            </span>
                            <span className="text-sm tabular-nums text-slate-500 shrink-0">{usd(it.costo_usd)}</span>
                          </li>
                        );
                      })}
                  </ul>
                </div>
              ))}

              <div className="grid grid-cols-3 rounded-2xl bg-slate-50 divide-x divide-slate-200 text-center py-3">
                <div>
                  <p className="text-[11px] text-slate-400">Total</p>
                  <p className="font-semibold tabular-nums text-aurora-dark">{usd(plan.monto_total_usd)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">Pagado</p>
                  <p className="font-semibold tabular-nums text-aurora-primary">{usd(plan.monto_pagado_usd)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">Saldo</p>
                  <p className="font-semibold tabular-nums text-aurora-dark">{usd(saldo)}</p>
                </div>
              </div>

              {plan.cuotas.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Sus cuotas</p>
                  {plan.cuotas.map((c) => (
                    <div key={c.numero} className="flex justify-between text-sm py-1">
                      <span className="text-slate-600">
                        Cuota {c.numero} · {fecha(c.fecha_vencimiento)}
                      </span>
                      <span className="tabular-nums text-slate-700">{usd(c.monto_usd)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Tarjeta>
          );
        })}

        {datos.recetas.length > 0 && (
          <Tarjeta icono={<IconPrescription size={16} />} titulo="Sus recetas">
            <ul className="space-y-3">
              {datos.recetas.map((r, i) => {
                let meds: { medicamento: string; posologia: string; duracionDias: number }[] = [];
                try {
                  meds = JSON.parse(r.items);
                } catch {
                  meds = [];
                }
                return (
                  <li key={i} className="rounded-2xl bg-slate-50 p-4 space-y-2">
                    <p className="text-xs text-slate-400">
                      {fecha(r.fecha_registro)} · {r.odontologo}
                    </p>
                    {r.diagnostico && <p className="text-sm font-medium text-aurora-dark">{r.diagnostico}</p>}
                    <ul className="space-y-1">
                      {meds.map((m, k) => (
                        <li key={k} className="text-sm text-slate-700">
                          <span className="font-semibold">{m.medicamento}</span> · {m.posologia}
                          {m.duracionDias ? ` por ${m.duracionDias} días` : ""}
                        </li>
                      ))}
                    </ul>
                    {r.indicaciones && <p className="text-sm text-slate-500">{r.indicaciones}</p>}
                  </li>
                );
              })}
            </ul>
          </Tarjeta>
        )}

        <Tarjeta icono={<IconCalendar size={16} />} titulo="Sus radiografías y estudios">
          {datos.radiografias.length === 0 ? (
            <p className="text-sm text-slate-500">Aún no hay estudios en su historia.</p>
          ) : (
            <ul>
              {datos.radiografias.map((rx) => (
                <li key={rx.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-100 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{rx.titulo}</p>
                    <p className="text-xs text-slate-400">
                      {fecha(rx.fecha_toma)} · {rx.origen === "PACIENTE" ? "Enviado por usted" : "Tomado en la clínica"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => verImagen(rx.id, rx.titulo)}
                    className="shrink-0 px-3.5 py-1.5 rounded-xl text-sm font-medium text-aurora-primary bg-teal-50 hover:bg-teal-100 transition"
                  >
                    Ver
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={subir} className="rounded-2xl border border-dashed border-teal-200 bg-teal-50/40 p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-aurora-dark">Enviar un estudio a su odontólogo</p>
              <p className="text-xs text-slate-500 mt-0.5">Si se hizo una radiografía en otro lugar, tómele una foto o suba el PDF.</p>
            </div>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              aria-label="Tipo de estudio"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-aurora-primary/30"
            >
              {ESTUDIOS.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nombre}
                </option>
              ))}
            </select>
            {tipo === "OTRO" && (
              <input
                type="text"
                value={otroEstudio}
                onChange={(e) => setOtroEstudio(e.target.value.slice(0, 120))}
                placeholder="¿Qué estudio es? Ej: Resonancia de ATM"
                aria-label="Nombre del estudio"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-aurora-primary/30"
              />
            )}
            <label className="flex items-center justify-center gap-2 w-full px-3 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-600 cursor-pointer hover:border-aurora-primary/50 transition">
              <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => setArchivo(e.target.files?.[0] || null)} />
              <span className="truncate">{archivo ? archivo.name : "Elegir foto o PDF"}</span>
            </label>
            {aviso && <p className={`text-sm font-medium ${aviso.ok ? "text-aurora-primary" : "text-rose-600"}`}>{aviso.texto}</p>}
            <button
              type="submit"
              disabled={!archivo || subiendo || (tipo === "OTRO" && !otroEstudio.trim())}
              className="w-full py-3 rounded-xl bg-aurora-primary hover:bg-teal-600 text-[#FFFFFF] text-sm font-semibold transition disabled:opacity-40"
            >
              {subiendo ? "Enviando..." : "Enviar estudio"}
            </button>
          </form>
        </Tarjeta>

        <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400 pt-2">
          <IconShield size={13} /> Enlace personal y protegido. No lo comparta.
        </p>
        <div className="flex justify-center pt-1">
          <SelloAurora conTecnologia />
        </div>
      </div>

      {imagen && (
        <div className="fixed inset-0 z-50 bg-aurora-dark/95 backdrop-blur-sm flex flex-col" onClick={() => setImagen(null)}>
          <div className="flex justify-between items-center gap-3 p-4 text-[#FFFFFF]">
            <span className="font-medium truncate">{imagen.titulo}</span>
            <button type="button" className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm">
              Cerrar
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-3" onClick={(e) => e.stopPropagation()}>
            {imagen.archivo.startsWith("data:application/pdf") ? (
              <iframe title={imagen.titulo} src={imagen.archivo} className="w-full h-full rounded-xl bg-white" />
            ) : (
              <img src={imagen.archivo} alt={imagen.titulo} className="max-w-full max-h-full object-contain rounded-xl" />
            )}
          </div>
        </div>
      )}
    </main>
  );
}
