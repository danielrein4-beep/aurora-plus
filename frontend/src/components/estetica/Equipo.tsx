import React, { useCallback, useEffect, useState } from "react";
import {
  crearProfesionalEstetica, actualizarProfesionalEstetica, comisionesEstetica,
  type ProfesionalEstetica, type ComisionProfesional,
} from "../../api";
import { IconEdit, IconWhatsApp } from "../../Icons";
import {
  Aviso, Boton, Campo, Cargando, EncabezadoPagina, Insignia, Modal, Tarjeta, Vacio, claseInput,
  enlaceWhatsApp, formatearFecha, formatearMonto, hoyISO, mensajeError, sumarDias,
} from "./comun";

type Periodo = "mes" | "quincena" | "anterior" | "otro";

function rango(p: Periodo, desde: string, hasta: string): [string, string] {
  const hoy = hoyISO();
  const inicioMes = `${hoy.slice(0, 8)}01`;
  if (p === "mes") return [inicioMes, hoy];
  if (p === "quincena") return [sumarDias(hoy, -14), hoy];
  if (p === "anterior") {
    const finAnterior = sumarDias(inicioMes, -1);
    return [`${finAnterior.slice(0, 8)}01`, finAnterior];
  }
  return [desde, hasta];
}

export default function Equipo({ profesionales, onRecargar, error }: {
  profesionales: ProfesionalEstetica[]; onRecargar: () => void; error: string | null;
}) {
  const [editando, setEditando] = useState<{ p: ProfesionalEstetica | null } | null>(null);
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [desde, setDesde] = useState(`${hoyISO().slice(0, 8)}01`);
  const [hasta, setHasta] = useState(hoyISO());
  const [comisiones, setComisiones] = useState<ComisionProfesional[] | null>(null);
  const [sinAsignar, setSinAsignar] = useState(0);
  const [errorCom, setErrorCom] = useState<string | null>(null);

  const [ini, fin] = rango(periodo, desde, hasta);

  const cargar = useCallback(async () => {
    try {
      const r = await comisionesEstetica(ini, fin);
      setComisiones(r.profesionales);
      setSinAsignar(r.sesionesSinProfesional);
      setErrorCom(null);
    } catch (e) {
      setErrorCom(mensajeError(e, "No se pudieron calcular las comisiones."));
    }
  }, [ini, fin]);

  useEffect(() => { setComisiones(null); cargar(); }, [cargar]);

  const totalComisiones = (comisiones ?? []).reduce((s, c) => s + Number(c.comision_servicios_monto) + Number(c.comision_productos_monto), 0);

  return (
    <div>
      <EncabezadoPagina
        titulo="Equipo y comisiones"
        subtitulo="Quién atiende, cuánto gana por servicio y por venta de productos"
        acciones={<Boton onClick={() => setEditando({ p: null })}>Agregar profesional</Boton>}
      />
      {error && <div className="mb-4"><Aviso>{error}</Aviso></div>}

      <Tarjeta className="overflow-hidden mb-6">
        {profesionales.length === 0 ? (
          <Vacio
            titulo="Aún no hay profesionales"
            texto="Agrega a quienes atienden en cabina con su porcentaje de comisión. Al registrar una sesión eliges quién la hizo."
            accion={<Boton onClick={() => setEditando({ p: null })}>Agregar profesional</Boton>}
          />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-white/10">
            {profesionales.map((p) => (
              <li key={p.id} className={`flex items-center gap-3 px-4 sm:px-5 py-3 ${p.activo ? "" : "opacity-50"}`}>
                <span className="w-9 h-9 rounded-full bg-[#E3A6B4]/25 text-[#9E4A63] flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {p.nombre.split(" ").slice(0, 2).map((x) => x[0]?.toUpperCase()).join("")}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{p.nombre} {!p.activo && <Insignia>Inactiva</Insignia>}</div>
                  <div className="text-xs text-slate-500 dark:text-white/50">
                    {Number(p.comision_servicios)}% en servicios · {Number(p.comision_productos)}% en productos
                  </div>
                </div>
                <button onClick={() => setEditando({ p })} className="p-2 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer" title="Editar">
                  <IconEdit size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
        <div>
          <h3 className="font-['Outfit'] font-bold text-lg text-slate-900 dark:text-white">Comisiones</h3>
          <p className="text-xs text-slate-500 dark:text-white/50">Del {formatearFecha(ini)} al {formatearFecha(fin)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-white/5 text-xs font-semibold">
            {([["mes", "Este mes"], ["quincena", "15 días"], ["anterior", "Mes pasado"], ["otro", "Otro"]] as [Periodo, string][]).map(([id, t]) => (
              <button key={id} onClick={() => setPeriodo(id)} className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${periodo === id ? "bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-white/50"}`}>{t}</button>
            ))}
          </div>
          {periodo === "otro" && (
            <>
              <input type="date" className={`${claseInput} !w-auto`} value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} />
              <input type="date" className={`${claseInput} !w-auto`} value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} />
            </>
          )}
        </div>
      </div>

      {errorCom && <div className="mb-4"><Aviso>{errorCom}</Aviso></div>}
      {sinAsignar > 0 && (
        <div className="mb-4"><Aviso tipo="info">{sinAsignar} {sinAsignar === 1 ? "sesión no tiene" : "sesiones no tienen"} profesional asignada en este período y no suman comisión.</Aviso></div>
      )}

      <Tarjeta className="overflow-x-auto">
        {comisiones === null && !errorCom ? (
          <Cargando />
        ) : !comisiones || comisiones.length === 0 ? (
          <Vacio titulo="Sin movimientos en el período" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 dark:text-white/50 border-b border-slate-100 dark:border-white/10">
                <th className="px-4 py-3 font-semibold">Profesional</th>
                <th className="px-3 py-3 font-semibold text-right">Sesiones</th>
                <th className="px-3 py-3 font-semibold text-right">Servicios</th>
                <th className="px-3 py-3 font-semibold text-right">Productos</th>
                <th className="px-4 py-3 font-semibold text-right">A pagar</th>
                <th className="px-2 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {comisiones.map((c) => {
                const aPagar = Number(c.comision_servicios_monto) + Number(c.comision_productos_monto);
                const tel = profesionales.find((p) => p.id === c.id)?.telefono;
                const wa = aPagar > 0 ? enlaceWhatsApp(tel, `Hola ${c.nombre.split(" ")[0]}, tu comisión del ${formatearFecha(ini)} al ${formatearFecha(fin)} es ${formatearMonto(aPagar)}: ${c.sesiones} sesiones (${formatearMonto(c.comision_servicios_monto)}) y ${formatearMonto(c.comision_productos_monto)} por productos.`) : null;
                return (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{c.nombre}</td>
                    <td className="px-3 py-3 text-right">
                      {c.sesiones}
                      {c.sesiones_sin_valor > 0 && <div className="text-[11px] text-amber-600">{c.sesiones_sin_valor} sin valor</div>}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatearMonto(c.total_servicios)}
                      <div className="text-[11px] text-slate-400">{Number(c.comision_servicios)}% = {formatearMonto(c.comision_servicios_monto)}</div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatearMonto(c.total_productos)}
                      <div className="text-[11px] text-slate-400">{Number(c.comision_productos)}% = {formatearMonto(c.comision_productos_monto)}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[#9E4A63] dark:text-[#E3A6B4]">{formatearMonto(aPagar)}</td>
                    <td className="px-2 py-3">
                      {wa && (
                        <a href={wa} target="_blank" rel="noopener noreferrer" title="Enviar resumen por WhatsApp" className="inline-flex p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10">
                          <IconWhatsApp size={15} />
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 dark:border-white/10">
                <td className="px-4 py-3 font-semibold text-slate-700 dark:text-white/80" colSpan={4}>Total a pagar</td>
                <td className="px-4 py-3 text-right font-black text-slate-900 dark:text-white">{formatearMonto(totalComisiones)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </Tarjeta>

      {editando && (
        <FormularioProfesional
          profesional={editando.p}
          onCerrar={() => setEditando(null)}
          onGuardado={() => { setEditando(null); onRecargar(); cargar(); }}
        />
      )}
    </div>
  );
}

function FormularioProfesional({ profesional, onCerrar, onGuardado }: { profesional: ProfesionalEstetica | null; onCerrar: () => void; onGuardado: () => void }) {
  const [nombre, setNombre] = useState(profesional?.nombre ?? "");
  const [telefono, setTelefono] = useState(profesional?.telefono ?? "");
  const [servicios, setServicios] = useState(String(profesional ? Number(profesional.comision_servicios) : 30));
  const [productos, setProductos] = useState(String(profesional ? Number(profesional.comision_productos) : 10));
  const [activo, setActivo] = useState(profesional?.activo ?? true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async () => {
    const s = Number(servicios), p = Number(productos);
    if (!nombre.trim()) { setError("El nombre es obligatorio."); return; }
    if (!(s >= 0 && s <= 100) || !(p >= 0 && p <= 100)) { setError("Las comisiones van de 0 a 100%."); return; }
    setGuardando(true);
    setError(null);
    const datos = { nombre: nombre.trim(), telefono: telefono.trim() || undefined, comisionServicios: s, comisionProductos: p, activo };
    try {
      if (profesional) await actualizarProfesionalEstetica(profesional.id, datos);
      else await crearProfesionalEstetica(datos);
      onGuardado();
    } catch (e) {
      setError(mensajeError(e, "No se pudo guardar."));
      setGuardando(false);
    }
  };

  return (
    <Modal titulo={profesional ? "Editar profesional" : "Agregar profesional"} onCerrar={onCerrar}>
      <div className="space-y-3">
        <Campo label="Nombre"><input className={claseInput} value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus /></Campo>
        <Campo label="Teléfono (WhatsApp)"><input className={claseInput} type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="0414-1234567" /></Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Comisión por servicios (%)"><input type="number" min={0} max={100} step="0.5" className={claseInput} value={servicios} onChange={(e) => setServicios(e.target.value)} /></Campo>
          <Campo label="Comisión por productos (%)"><input type="number" min={0} max={100} step="0.5" className={claseInput} value={productos} onChange={(e) => setProductos(e.target.value)} /></Campo>
        </div>
        {profesional && (
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="w-4 h-4 accent-[#9E4A63]" />
            <span className="text-sm text-slate-700 dark:text-white/80">Activa (aparece al registrar sesiones y ventas)</span>
          </label>
        )}
        {error && <Aviso onCerrar={() => setError(null)}>{error}</Aviso>}
        <div className="flex justify-end gap-2 pt-1">
          <Boton tipo="secundario" onClick={onCerrar}>Cancelar</Boton>
          <Boton onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</Boton>
        </div>
      </div>
    </Modal>
  );
}
