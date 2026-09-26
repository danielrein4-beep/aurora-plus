import React, { useState } from "react";
import { crearProcedimiento, actualizarProcedimiento, type ProcedimientoMedico } from "../../api";
import { IconEdit } from "../../Icons";
import { Aviso, Boton, Campo, EncabezadoPagina, Modal, Tarjeta, Vacio, claseInput, formatearMonto, mensajeError } from "./comun";

const SUGERIDOS: { nombre: string; duracion: number }[] = [
  { nombre: "Limpieza facial profunda", duracion: 60 },
  { nombre: "Peeling químico", duracion: 45 },
  { nombre: "Microneedling", duracion: 60 },
  { nombre: "Radiofrecuencia facial", duracion: 45 },
  { nombre: "Hidratación facial", duracion: 45 },
  { nombre: "Depilación láser", duracion: 30 },
  { nombre: "Masaje reductor", duracion: 60 },
  { nombre: "Drenaje linfático", duracion: 60 },
];

export default function Servicios({ tenantId, servicios, onRecargar, error }: {
  tenantId: number; servicios: ProcedimientoMedico[]; onRecargar: () => void; error: string | null;
}) {
  const [editando, setEditando] = useState<{ s: ProcedimientoMedico | null; sugerido?: { nombre: string; duracion: number } } | null>(null);
  const ordenados = [...servicios].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const nombresExistentes = new Set(servicios.map((s) => s.nombre.toLowerCase()));
  const sugerencias = SUGERIDOS.filter((s) => !nombresExistentes.has(s.nombre.toLowerCase()));

  return (
    <div>
      <EncabezadoPagina
        titulo="Servicios"
        subtitulo="Lo que ofreces, con su precio y duración. Se usan en la agenda, los paquetes y la caja."
        acciones={<Boton onClick={() => setEditando({ s: null })}>Nuevo servicio</Boton>}
      />
      {error && <div className="mb-4"><Aviso>{error}</Aviso></div>}

      <Tarjeta className="overflow-hidden">
        {ordenados.length === 0 ? (
          <Vacio titulo="Aún no tienes servicios" texto="Carga tu menú de tratamientos. Puedes empezar por uno de los sugeridos de abajo." />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-white/10">
            {ordenados.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{s.nombre}</div>
                  <div className="text-xs text-slate-500 dark:text-white/50 truncate">
                    {s.duracionMinutos ? `${s.duracionMinutos} min` : "Sin duración"}{s.descripcion ? ` · ${s.descripcion}` : ""}
                  </div>
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{formatearMonto(s.costo, s.moneda || "USD")}</div>
                <button onClick={() => setEditando({ s })} className="p-2 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer" title="Editar">
                  <IconEdit size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      {sugerencias.length > 0 && (
        <div className="mt-5">
          <div className="text-xs font-semibold text-slate-500 dark:text-white/50 mb-2">Sugeridos para agregar rápido</div>
          <div className="flex flex-wrap gap-2">
            {sugerencias.map((s) => (
              <button
                key={s.nombre}
                onClick={() => setEditando({ s: null, sugerido: s })}
                className="px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-slate-300 dark:border-white/20 text-slate-600 dark:text-white/70 hover:border-[#9E4A63] hover:text-[#9E4A63] cursor-pointer"
              >
                + {s.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      {editando && (
        <FormularioServicio
          tenantId={tenantId}
          servicio={editando.s}
          sugerido={editando.sugerido}
          onCerrar={() => setEditando(null)}
          onGuardado={() => { setEditando(null); onRecargar(); }}
        />
      )}
    </div>
  );
}

function FormularioServicio({ tenantId, servicio, sugerido, onCerrar, onGuardado }: {
  tenantId: number; servicio: ProcedimientoMedico | null; sugerido?: { nombre: string; duracion: number };
  onCerrar: () => void; onGuardado: () => void;
}) {
  const [nombre, setNombre] = useState(servicio?.nombre ?? sugerido?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(servicio?.descripcion ?? "");
  const [precio, setPrecio] = useState(servicio ? String(servicio.costo) : "");
  const [duracion, setDuracion] = useState(String(servicio?.duracionMinutos ?? sugerido?.duracion ?? 60));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async () => {
    const costo = Number(precio);
    if (!nombre.trim()) { setError("Ponle nombre al servicio."); return; }
    if (!(costo >= 0) || precio === "") { setError("Indica el precio."); return; }
    setGuardando(true);
    setError(null);
    const datos = {
      nombre: nombre.trim(), descripcion: descripcion.trim() || null, costo, moneda: "USD",
      duracionMinutos: Number(duracion) || null,
    };
    try {
      if (servicio) await actualizarProcedimiento(tenantId, servicio.id, datos);
      else await crearProcedimiento(tenantId, datos);
      onGuardado();
    } catch (e) {
      setError(mensajeError(e, "No se pudo guardar el servicio."));
      setGuardando(false);
    }
  };

  return (
    <Modal titulo={servicio ? "Editar servicio" : "Nuevo servicio"} onCerrar={onCerrar}>
      <div className="space-y-3">
        <Campo label="Nombre"><input className={claseInput} value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus /></Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Precio (USD)"><input type="number" min={0} step="0.01" className={claseInput} value={precio} onChange={(e) => setPrecio(e.target.value)} /></Campo>
          <Campo label="Duración (min)"><input type="number" min={5} step={5} className={claseInput} value={duracion} onChange={(e) => setDuracion(e.target.value)} /></Campo>
        </div>
        <Campo label="Descripción (opcional)"><input className={claseInput} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} /></Campo>
        {error && <Aviso onCerrar={() => setError(null)}>{error}</Aviso>}
        <div className="flex justify-end gap-2 pt-1">
          <Boton tipo="secundario" onClick={onCerrar}>Cancelar</Boton>
          <Boton onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</Boton>
        </div>
      </div>
    </Modal>
  );
}
