import { useEffect, useState } from "react";
import {
  obtenerEstadoSeguridadSuperAdmin,
  iniciar2faSuperAdmin,
  confirmar2faSuperAdmin,
  desactivar2faSuperAdmin,
  cambiarClaveSuperAdmin,
  solicitarCambioContactoSuperAdmin,
  confirmarCambioContactoSuperAdmin,
  type PerfilSuperAdmin,
  type CanalContactoSuperAdmin,
  type AccionContactoSuperAdmin,
  type SolicitudContactoSuperAdmin,
} from "../api";

interface Props {
  /** Cambiar la clave invalida todas las sesiones; el backend devuelve un token nuevo para esta. */
  onNuevoToken: (token: string) => void;
  avisar: (mensaje: string, tipo?: "success" | "error") => void;
}

const campo = "w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:border-slate-800 bg-white text-sm";
const botonPrincipal = "px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs cursor-pointer disabled:opacity-50";

function soloDigitos(v: string) {
  return v.replace(/\D/g, "").slice(0, 6);
}

export default function SuperAdminSeguridad({ onNuevoToken, avisar }: Props) {
  const [estado, setEstado] = useState<PerfilSuperAdmin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  // Activación del 2FA
  const [claveActivacion, setClaveActivacion] = useState("");
  const [configuracion, setConfiguracion] = useState<{ secreto: string; uri: string } | null>(null);
  const [codigoConfirmacion, setCodigoConfirmacion] = useState("");

  // Desactivación del 2FA
  const [claveDesactivar, setClaveDesactivar] = useState("");
  const [codigoDesactivar, setCodigoDesactivar] = useState("");

  // Cambio de contraseña
  const [claveActual, setClaveActual] = useState("");
  const [claveNueva, setClaveNueva] = useState("");
  const [claveRepetida, setClaveRepetida] = useState("");
  const [codigoCambio, setCodigoCambio] = useState("");

  const cargar = () => obtenerEstadoSeguridadSuperAdmin().then(setEstado).catch((e: Error) => setError(e.message));
  useEffect(() => { cargar(); }, []);

  const ejecutar = async (accion: () => Promise<void>) => {
    setProcesando(true);
    setError(null);
    try { await accion(); } catch (e: any) { setError(e?.message || "No se pudo completar la operación"); } finally { setProcesando(false); }
  };

  const iniciar = () => ejecutar(async () => {
    setConfiguracion(await iniciar2faSuperAdmin(claveActivacion));
    setClaveActivacion("");
  });

  const confirmar = () => ejecutar(async () => {
    await confirmar2faSuperAdmin(codigoConfirmacion);
    setConfiguracion(null);
    setCodigoConfirmacion("");
    avisar("Verificación en dos pasos activada");
    await cargar();
  });

  const desactivar = () => ejecutar(async () => {
    if (!window.confirm("La cuenta quedará protegida solo con contraseña. ¿Desactivar la verificación en dos pasos?")) return;
    await desactivar2faSuperAdmin(claveDesactivar, codigoDesactivar);
    setClaveDesactivar("");
    setCodigoDesactivar("");
    avisar("Verificación en dos pasos desactivada");
    await cargar();
  });

  const cambiarClave = () => ejecutar(async () => {
    if (claveNueva !== claveRepetida) throw new Error("Las contraseñas nuevas no coinciden");
    const { token } = await cambiarClaveSuperAdmin(claveActual, claveNueva, estado?.totpActivo ? codigoCambio : undefined);
    onNuevoToken(token);
    setClaveActual(""); setClaveNueva(""); setClaveRepetida(""); setCodigoCambio("");
    avisar("Contraseña actualizada. Las demás sesiones abiertas se cerraron.");
  });

  const secretoAgrupado = configuracion?.secreto.match(/.{1,4}/g)?.join(" ") ?? "";

  return (
    <div className="max-w-3xl space-y-6">
      {error && <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}

      {/* DATOS DE CONTACTO */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
        <div>
          <h2 className="font-bold text-slate-900">Datos de contacto</h2>
          <p className="text-xs text-slate-500 mt-1">
            Solo se guardan verificados. Para cambiarlos o quitarlos se pide un código enviado al dato actual,
            así nadie puede desviar su cuenta aunque tenga su sesión abierta.
          </p>
        </div>
        {estado && (
          <div className="divide-y divide-slate-100">
            <DatoContacto canal="EMAIL" titulo="Correo electrónico" valor={estado.email} ejemplo="nombre@empresa.com" onCambio={cargar} avisar={avisar} />
            <DatoContacto canal="TELEFONO" titulo="Teléfono (WhatsApp)" valor={estado.telefono} ejemplo="+584141234567" onCambio={cargar} avisar={avisar} />
          </div>
        )}
      </section>

      {/* VERIFICACIÓN EN DOS PASOS */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-bold text-slate-900">Verificación en dos pasos</h2>
            <p className="text-xs text-slate-500 mt-1">
              Además de la contraseña, se pide un código de 6 dígitos que genera una app en su teléfono
              (Google Authenticator, Microsoft Authenticator o Authy). Esta cuenta puede entrar a cualquier negocio,
              así que es obligatoria antes de salir a producción.
            </p>
          </div>
          {estado && (
            <span className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold border ${
              estado.totpActivo ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
            }`}>
              {estado.totpActivo ? "Activa" : "Desactivada"}
            </span>
          )}
        </div>

        {estado && !estado.totpActivo && !configuracion && (
          <div className="flex flex-col sm:flex-row gap-2">
            <input type="password" placeholder="Confirme su contraseña" value={claveActivacion} onChange={(e) => setClaveActivacion(e.target.value)} className={campo} />
            <button onClick={iniciar} disabled={procesando || !claveActivacion} className={`${botonPrincipal} shrink-0`}>Activar</button>
          </div>
        )}

        {configuracion && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4 text-sm">
            <ol className="list-decimal pl-5 space-y-2 text-slate-700 text-xs">
              <li>En la app de autenticación, elija <b>Agregar cuenta</b> y luego <b>Introducir clave de configuración</b>.</li>
              <li>
                Escriba esta clave (tipo <b>basada en el tiempo</b>):
                <div className="mt-2 px-4 py-3 rounded-xl bg-white border border-slate-200 font-mono text-base tracking-wider text-slate-900 select-all break-all">
                  {secretoAgrupado}
                </div>
                <a href={configuracion.uri} className="inline-block mt-2 text-emerald-700 font-bold underline">
                  Si está en el teléfono, toque aquí para abrir la app directamente
                </a>
              </li>
              <li>Escriba el código de 6 dígitos que muestra la app para confirmar.</li>
            </ol>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                inputMode="numeric" autoComplete="one-time-code" placeholder="000000"
                value={codigoConfirmacion} onChange={(e) => setCodigoConfirmacion(soloDigitos(e.target.value))}
                className={`${campo} font-mono tracking-[0.4em] text-center`}
              />
              <button onClick={confirmar} disabled={procesando || codigoConfirmacion.length !== 6} className={`${botonPrincipal} shrink-0`}>Confirmar y activar</button>
            </div>
            <p className="text-[11px] text-slate-500">Guarde esta clave en un lugar seguro: si pierde el teléfono, es la única forma de recuperar el acceso.</p>
          </div>
        )}

        {estado?.totpActivo && (
          <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-2">
            <input type="password" placeholder="Contraseña" value={claveDesactivar} onChange={(e) => setClaveDesactivar(e.target.value)} className={campo} />
            <input inputMode="numeric" placeholder="Código actual" value={codigoDesactivar} onChange={(e) => setCodigoDesactivar(soloDigitos(e.target.value))} className={`${campo} font-mono`} />
            <button
              onClick={desactivar}
              disabled={procesando || !claveDesactivar || codigoDesactivar.length !== 6}
              className="px-4 py-2.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs cursor-pointer disabled:opacity-50"
            >
              Desactivar
            </button>
          </div>
        )}
      </section>

      {/* CONTRASEÑA */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
        <div>
          <h2 className="font-bold text-slate-900">Cambiar contraseña</h2>
          <p className="text-xs text-slate-500 mt-1">
            Mínimo 10 caracteres. Al cambiarla se cierran todas las demás sesiones abiertas con esta cuenta.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          <input type="password" placeholder="Contraseña actual" value={claveActual} onChange={(e) => setClaveActual(e.target.value)} className={campo} />
          {estado?.totpActivo && (
            <input inputMode="numeric" placeholder="Código de verificación" value={codigoCambio} onChange={(e) => setCodigoCambio(soloDigitos(e.target.value))} className={`${campo} font-mono`} />
          )}
          <input type="password" placeholder="Nueva contraseña" value={claveNueva} onChange={(e) => setClaveNueva(e.target.value)} className={campo} />
          <input type="password" placeholder="Repita la nueva contraseña" value={claveRepetida} onChange={(e) => setClaveRepetida(e.target.value)} className={campo} />
        </div>
        <button
          onClick={cambiarClave}
          disabled={procesando || !claveActual || claveNueva.length < 10 || (estado?.totpActivo && codigoCambio.length !== 6)}
          className={botonPrincipal}
        >
          Cambiar contraseña
        </button>
      </section>
    </div>
  );
}

function DatoContacto({ canal, titulo, valor, ejemplo, onCambio, avisar }: {
  canal: CanalContactoSuperAdmin;
  titulo: string;
  valor: string | null;
  ejemplo: string;
  onCambio: () => void;
  avisar: Props["avisar"];
}) {
  const [accion, setAccion] = useState<AccionContactoSuperAdmin | null>(null);
  const [valorNuevo, setValorNuevo] = useState("");
  const [password, setPassword] = useState("");
  const [solicitud, setSolicitud] = useState<SolicitudContactoSuperAdmin | null>(null);
  const [codigoActual, setCodigoActual] = useState("");
  const [codigoNuevo, setCodigoNuevo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  const reiniciar = () => {
    setAccion(null); setValorNuevo(""); setPassword(""); setSolicitud(null);
    setCodigoActual(""); setCodigoNuevo(""); setError(null);
  };

  const ejecutar = async (fn: () => Promise<void>) => {
    setProcesando(true);
    setError(null);
    try { await fn(); } catch (e: any) { setError(e?.message || "No se pudo completar la operación"); } finally { setProcesando(false); }
  };

  const enviarCodigos = () => ejecutar(async () => {
    setSolicitud(await solicitarCambioContactoSuperAdmin({ canal, accion: accion!, valor: accion === "QUITAR" ? undefined : valorNuevo, password }));
    setPassword("");
  });

  const confirmar = () => ejecutar(async () => {
    await confirmarCambioContactoSuperAdmin({
      solicitudId: solicitud!.solicitudId,
      codigoActual: solicitud!.pideCodigoActual ? codigoActual : undefined,
      codigoNuevo: solicitud!.pideCodigoNuevo ? codigoNuevo : undefined,
    });
    avisar(`${titulo}: ${accion === "QUITAR" ? "eliminado" : "verificado y guardado"}`);
    reiniciar();
    onCambio();
  });

  const codigosCompletos = (!solicitud?.pideCodigoActual || codigoActual.length === 6) && (!solicitud?.pideCodigoNuevo || codigoNuevo.length === 6);
  const medio = canal === "EMAIL" ? "correo" : "WhatsApp";

  return (
    <div className="py-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase text-slate-400">{titulo}</div>
          <div className="text-sm font-semibold text-slate-900">
            {valor || <span className="text-amber-700">No registrado</span>}
            {valor && <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">Verificado</span>}
          </div>
        </div>
        {!accion && (
          <div className="flex gap-2">
            {valor ? (
              <>
                <button onClick={() => setAccion("CAMBIAR")} className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs cursor-pointer">Cambiar</button>
                <button onClick={() => setAccion("QUITAR")} className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs cursor-pointer">Quitar</button>
              </>
            ) : (
              <button onClick={() => setAccion("AGREGAR")} className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs cursor-pointer">Agregar</button>
            )}
          </div>
        )}
      </div>

      {accion && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">{error}</div>}

          {!solicitud ? (
            <>
              <p className="text-xs text-slate-600">
                {accion === "AGREGAR" && `Le enviaremos un código por ${medio} al dato nuevo para confirmar que es suyo.`}
                {accion === "CAMBIAR" && `Le enviaremos un código por ${medio} al dato actual y otro al nuevo.`}
                {accion === "QUITAR" && `Le enviaremos un código por ${medio} al dato actual para autorizar que se quite.`}
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {accion !== "QUITAR" && (
                  <input
                    type={canal === "EMAIL" ? "email" : "tel"} placeholder={ejemplo}
                    value={valorNuevo} onChange={(e) => setValorNuevo(e.target.value)} className={campo}
                  />
                )}
                <input type="password" placeholder="Su contraseña" value={password} onChange={(e) => setPassword(e.target.value)} className={campo} />
              </div>
              <div className="flex gap-2">
                <button onClick={enviarCodigos} disabled={procesando || !password || (accion !== "QUITAR" && !valorNuevo.trim())} className={botonPrincipal}>
                  {procesando ? "Enviando..." : "Enviar código"}
                </button>
                <button onClick={reiniciar} className="px-4 py-2.5 rounded-xl text-slate-600 font-bold text-xs cursor-pointer">Cancelar</button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-slate-600">Códigos enviados a: <b>{solicitud.destinos.join(" y ")}</b>. Vencen en 10 minutos.</p>
              {solicitud.simulado && (
                <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
                  Modo desarrollo: el envío por {medio} no está configurado y el código quedó en el log del servidor.
                </p>
              )}
              <div className="grid sm:grid-cols-2 gap-2">
                {solicitud.pideCodigoActual && (
                  <input inputMode="numeric" placeholder="Código del dato actual" value={codigoActual} onChange={(e) => setCodigoActual(soloDigitos(e.target.value))} className={`${campo} font-mono`} />
                )}
                {solicitud.pideCodigoNuevo && (
                  <input inputMode="numeric" placeholder="Código del dato nuevo" value={codigoNuevo} onChange={(e) => setCodigoNuevo(soloDigitos(e.target.value))} className={`${campo} font-mono`} />
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={confirmar} disabled={procesando || !codigosCompletos} className={botonPrincipal}>Confirmar</button>
                <button onClick={reiniciar} className="px-4 py-2.5 rounded-xl text-slate-600 font-bold text-xs cursor-pointer">Cancelar</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
