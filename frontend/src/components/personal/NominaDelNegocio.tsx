import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  descartarPeriodoNomina, listarPeriodosNomina, listarTrabajadoresNomina, obtenerDetallePeriodoNomina,
  obtenerReciboNomina, pagarPeriodoNomina, ponerSueldoTrabajador, prepararNomina, quitarReciboNomina,
  revisarReciboNomina,
  type DetallePeriodoNominaApi, type FrecuenciaPagoNomina, type PeriodoNominaApi, type ReciboNominaImprimible,
  type TipoSalarioNomina, type TrabajadorNomina,
} from '../../api';
import { useVocabularioPersonal, type NominaDelRubro } from './vocabulario';

/**
 * Nómina del negocio, igual para todos los rubros (cambian las palabras y lo que se propone):
 * 1. Cada trabajador con su sueldo: cargo, cuánto gana, en qué moneda y si cobra semanal, quincenal o mensual.
 * 2. "Pagar": se elige la semana, la quincena o el mes y se calcula el recibo de cada quien con lo que marcó.
 * 3. Se revisa (días, horas, bono, descuento), se paga (sale de caja) y se imprimen los recibos.
 */

// ---------------------------------------------------------------- utilidades

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fechaCorta = (s?: string | null) => {
  if (!s) return '';
  const [a, m, d] = s.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
};
const monto = (n: number | null | undefined, moneda?: string | null) => {
  const v = Number(n ?? 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return moneda === 'USD' || !moneda ? `$${v}` : `${v} ${moneda}`;
};

export const NOMBRE_FRECUENCIA: Record<FrecuenciaPagoNomina, string> = { SEMANAL: 'semanal', QUINCENAL: 'quincenal', MENSUAL: 'mensual' };
const PERIODO_DE: Record<FrecuenciaPagoNomina, string> = { SEMANAL: 'la semana', QUINCENAL: 'la quincena', MENSUAL: 'el mes' };

export const FORMAS_DE_PAGO: { id: TipoSalarioNomina; nombre: string; ayuda: string; unidad: string }[] = [
  { id: 'FIJO_MENSUAL', nombre: 'Sueldo mensual', ayuda: 'Gana un monto fijo al mes y se le paga por partes.', unidad: 'al mes' },
  { id: 'POR_JORNADA', nombre: 'Por jornada (jornal)', ayuda: 'Se le paga cada jornada trabajada.', unidad: 'por jornada' },
  { id: 'DIARIO', nombre: 'Por día', ayuda: 'Se le paga cada día trabajado.', unidad: 'por día' },
  { id: 'POR_HORA', nombre: 'Por hora', ayuda: 'Se le pagan las horas que marca con su usuario.', unidad: 'por hora' },
];
const formaDe = (t?: TipoSalarioNomina | null) => FORMAS_DE_PAGO.find((f) => f.id === t);

/** Cuánto le toca por período a un sueldo mensual (la semana es 7 de 30 días, la quincena la mitad). */
const porPeriodo = (salario: number, frecuencia: FrecuenciaPagoNomina) =>
  frecuencia === 'MENSUAL' ? salario : frecuencia === 'QUINCENAL' ? salario / 2 : (salario * 7) / 30;

interface OpcionPeriodo { etiqueta: string; desde: string; hasta: string }

/** Las fechas que tiene sentido pagar hoy para cada frecuencia (la primera es la que se propone). */
function periodosSugeridos(frecuencia: FrecuenciaPagoNomina, hoy = new Date()): OpcionPeriodo[] {
  const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  if (frecuencia === 'SEMANAL') {
    const lunes = new Date(d);
    lunes.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6);
    const lunesPasado = new Date(lunes); lunesPasado.setDate(lunes.getDate() - 7);
    const domingoPasado = new Date(lunes); domingoPasado.setDate(lunes.getDate() - 1);
    const esta = { etiqueta: 'Esta semana', desde: iso(lunes), hasta: iso(domingo) };
    const pasada = { etiqueta: 'La semana pasada', desde: iso(lunesPasado), hasta: iso(domingoPasado) };
    // De lunes a jueves normalmente se paga la semana que ya terminó.
    return d.getDay() >= 1 && d.getDay() <= 4 ? [pasada, esta] : [esta, pasada];
  }
  const finMes = (a: number, m: number) => new Date(a, m + 1, 0);
  if (frecuencia === 'QUINCENAL') {
    const a = d.getFullYear(); const m = d.getMonth();
    const primera = { etiqueta: 'Quincena del 1 al 15', desde: iso(new Date(a, m, 1)), hasta: iso(new Date(a, m, 15)) };
    const segunda = { etiqueta: `Quincena del 16 al ${finMes(a, m).getDate()}`, desde: iso(new Date(a, m, 16)), hasta: iso(finMes(a, m)) };
    const anterior = { etiqueta: 'La quincena pasada (16 a fin de mes)', desde: iso(new Date(a, m - 1, 16)), hasta: iso(finMes(a, m - 1)) };
    return d.getDate() <= 15 ? [primera, anterior] : [segunda, primera];
  }
  const a = d.getFullYear(); const m = d.getMonth();
  const este = { etiqueta: 'Este mes', desde: iso(new Date(a, m, 1)), hasta: iso(finMes(a, m)) };
  const pasado = { etiqueta: 'El mes pasado', desde: iso(new Date(a, m - 1, 1)), hasta: iso(finMes(a, m - 1)) };
  return d.getDate() <= 10 ? [pasado, este] : [este, pasado];
}

const escapar = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

/**
 * Abre los recibos listos para imprimir (o guardar como PDF desde el menú de imprimir). La ventana
 * se abre en el mismo toque del botón para que el teléfono no la bloquee, y se llena al llegar los datos.
 */
export async function imprimirRecibosNomina(ids: number[], persona = 'trabajador') {
  // Si el navegador no deja abrir otra ventana (algunos teléfonos y navegadores dentro de apps), el
  // recibo se muestra encima de la pantalla con su botón de imprimir.
  const ventana = window.open('', '_blank');
  if (ventana) ventana.document.write('<p style="font-family:sans-serif;padding:24px">Preparando recibos…</p>');
  try {
    const recibos: ReciboNominaImprimible[] = await Promise.all(ids.map((id) => obtenerReciboNomina(id)));
    const html = recibos.map((r) => {
      const asignaciones = r.lineas.filter((l) => l.tipo === 'ASIGNACION');
      const deducciones = r.lineas.filter((l) => l.tipo === 'DEDUCCION');
      const filas = (ls: typeof r.lineas) => ls.map((l) => `<tr><td>${escapar(l.descripcion)}</td><td class="n">${escapar(monto(l.monto, r.moneda))}</td></tr>`).join('');
      const forma = formaDe(r.formaDePago)?.nombre;
      return `<section class="recibo">
        <header>
          <div><div class="negocio">${escapar(r.razonSocial || r.negocio || 'Mi negocio')}</div>
          ${r.rif ? `<div class="sub">RIF: ${escapar(r.rif)}</div>` : ''}
          ${r.direccion ? `<div class="sub">${escapar(r.direccion)}</div>` : ''}
          ${r.telefono ? `<div class="sub">Tel: ${escapar(r.telefono)}</div>` : ''}</div>
          <div class="titulo">Recibo de pago<div class="sub">N.º ${r.id}</div></div>
        </header>
        <div class="datos">
          <div><b>${escapar(persona.charAt(0).toUpperCase() + persona.slice(1))}:</b> ${escapar(r.trabajador)}</div>
          ${r.cedula ? `<div><b>Cédula:</b> ${escapar(r.cedula)}</div>` : ''}
          ${r.cargo ? `<div><b>Cargo:</b> ${escapar(r.cargo)}</div>` : ''}
          <div><b>Período:</b> ${escapar(fechaCorta(r.desde))} al ${escapar(fechaCorta(r.hasta))}</div>
          ${forma ? `<div><b>Forma de pago:</b> ${escapar(forma)}${r.frecuencia ? ` · cobra ${escapar(NOMBRE_FRECUENCIA[r.frecuencia])}` : ''}</div>` : ''}
          <div><b>Fecha de pago:</b> ${r.fechaPago ? escapar(fechaCorta(r.fechaPago)) : 'Pendiente'}</div>
          ${r.diasTrabajados != null ? `<div><b>Días trabajados:</b> ${escapar(Number(r.diasTrabajados))}</div>` : ''}
          ${r.horasMarcadas != null && Number(r.horasMarcadas) > 0 ? `<div><b>Horas marcadas:</b> ${escapar(Number(r.horasMarcadas).toFixed(1))}</div>` : ''}
        </div>
        <table>
          <thead><tr><th>Concepto</th><th class="n">Monto</th></tr></thead>
          <tbody>${filas(asignaciones)}
          ${deducciones.length ? `<tr class="sep"><td colspan="2">Descuentos</td></tr>${filas(deducciones)}` : ''}</tbody>
          <tfoot><tr><td>Total a recibir</td><td class="n">${escapar(monto(r.netoEfectivo ?? r.neto, r.moneda))}</td></tr></tfoot>
        </table>
        ${r.nota ? `<p class="nota">Nota: ${escapar(r.nota)}</p>` : ''}
        <div class="firmas"><div>Entregado por</div><div>Recibí conforme</div></div>
      </section>`;
    }).join('');
    const documento = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Recibos de pago</title><style>
      *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;padding:16px;background:#fff}
      .recibo{border:1px solid #bbb;border-radius:8px;padding:18px;margin:0 auto 18px;max-width:720px;page-break-inside:avoid;break-inside:avoid}
      header{display:flex;justify-content:space-between;gap:12px;border-bottom:2px solid #177E89;padding-bottom:10px;margin-bottom:10px}
      .negocio{font-size:16px;font-weight:bold} .sub{font-size:11px;color:#555;font-weight:normal}
      .titulo{text-align:right;font-size:15px;font-weight:bold;color:#177E89}
      .datos{display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;font-size:12px;margin-bottom:10px}
      table{width:100%;border-collapse:collapse;font-size:12px} th,td{padding:6px 4px;border-bottom:1px solid #e5e5e5;text-align:left}
      th{background:#f3f6f6} .n{text-align:right;white-space:nowrap} .sep td{font-weight:bold;color:#555;background:#fafafa}
      tfoot td{font-weight:bold;font-size:14px;border-top:2px solid #111;border-bottom:none}
      .nota{font-size:11px;color:#444;margin:8px 0 0} .firmas{display:flex;gap:40px;margin-top:40px;font-size:11px;color:#444}
      .firmas div{flex:1;border-top:1px solid #333;padding-top:4px;text-align:center}
      .acciones{max-width:720px;margin:0 auto 12px;display:flex;gap:8px} .acciones button{padding:10px 16px;border-radius:8px;border:0;background:#177E89;color:#fff;font-weight:bold;font-size:14px}
      @media (max-width:520px){.datos{grid-template-columns:1fr}} @media print{.acciones{display:none} body{padding:0}}
      </style></head><body>${ventana ? '<div class="acciones"><button onclick="window.print()">Imprimir o guardar en PDF</button></div>' : ''}${html}
      ${ventana ? '<script>setTimeout(function(){window.print()},400)</script>' : ''}</body></html>`;
    if (ventana) {
      ventana.document.open();
      ventana.document.write(documento);
      ventana.document.close();
    } else {
      mostrarRecibosEnPantalla(documento);
    }
  } catch (e) {
    ventana?.close();
    throw e;
  }
}

/** Recibos encima de la pantalla, en un marco aparte para imprimir solo el recibo. */
function mostrarRecibosEnPantalla(documento: string) {
  document.getElementById('aurora-recibos-nomina')?.remove();
  const capa = document.createElement('div');
  capa.id = 'aurora-recibos-nomina';
  capa.style.cssText = 'position:fixed;inset:0;z-index:6000;background:#fff;display:flex;flex-direction:column';
  const barra = document.createElement('div');
  barra.style.cssText = 'display:flex;gap:8px;padding:10px 16px;border-bottom:1px solid #e5e5e5;background:#f8fafa';
  const boton = (texto: string, principal: boolean) => {
    const b = document.createElement('button');
    b.textContent = texto;
    b.style.cssText = `padding:10px 16px;border-radius:8px;font-weight:bold;font-size:14px;cursor:pointer;${principal ? 'background:#177E89;color:#fff;border:0' : 'background:#fff;color:#333;border:1px solid #ccc'}`;
    return b;
  };
  const imprimir = boton('Imprimir o guardar en PDF', true);
  const cerrar = boton('Cerrar', false);
  const marco = document.createElement('iframe');
  marco.title = 'Recibos de pago';
  marco.style.cssText = 'flex:1;width:100%;border:0';
  marco.srcdoc = documento;
  imprimir.onclick = () => { marco.contentWindow?.focus(); marco.contentWindow?.print(); };
  cerrar.onclick = () => capa.remove();
  barra.append(imprimir, cerrar);
  capa.append(barra, marco);
  document.body.appendChild(capa);
}

// ---------------------------------------------------------------- sueldo de un trabajador

const MONEDAS = ['USD', 'VES', 'COP', 'EUR'];

export const EditorSueldo: React.FC<{
  trabajador: TrabajadorNomina;
  sugerencia: NominaDelRubro;
  onGuardado: () => void;
  onCancelar: () => void;
}> = ({ trabajador, sugerencia, onGuardado, onCancelar }) => {
  const [cargo, setCargo] = useState(trabajador.cargo || '');
  const [tipo, setTipo] = useState<TipoSalarioNomina>(trabajador.tipoSalario || sugerencia.tipoSalario);
  const [salario, setSalario] = useState(trabajador.salario != null ? String(trabajador.salario) : '');
  const [moneda, setMoneda] = useState(trabajador.moneda || 'USD');
  const [frecuencia, setFrecuencia] = useState<FrecuenciaPagoNomina>(trabajador.frecuencia || sugerencia.frecuencia);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const forma = formaDe(tipo);
  const valor = Number(salario.replace(',', '.'));

  const guardar = async () => {
    setError(null);
    if (!cargo.trim()) return setError('Escribe el cargo.');
    if (!(valor > 0)) return setError('Escribe cuánto gana.');
    setGuardando(true);
    try {
      await ponerSueldoTrabajador(trabajador.id, { cargo: cargo.trim(), tipoSalario: tipo, salario: valor, moneda, frecuencia });
      onGuardado();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el sueldo.');
    } finally {
      setGuardando(false);
    }
  };

  const campo = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#177E89]';
  return (
    <div className="rounded-xl border border-[#177E89]/30 bg-[#177E89]/5 p-4 space-y-3">
      <div className="text-sm font-bold text-slate-900">Sueldo de {trabajador.nombre}</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-600 space-y-1">
          <span>Cargo</span>
          <input list={`cargos-${trabajador.id}`} value={cargo} onChange={(e) => setCargo(e.target.value)} className={campo} placeholder="Ej.: cajero" />
          <datalist id={`cargos-${trabajador.id}`}>{sugerencia.cargos.map((c) => <option key={c} value={c} />)}</datalist>
        </label>
        <label className="text-xs font-semibold text-slate-600 space-y-1">
          <span>Cómo se le paga</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoSalarioNomina)} className={campo}>
            {FORMAS_DE_PAGO.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600 space-y-1">
          <span>Cuánto gana {forma?.unidad}</span>
          <div className="flex gap-2">
            <input inputMode="decimal" value={salario} onChange={(e) => setSalario(e.target.value)} className={`${campo} min-w-0 flex-1`} placeholder="0,00" />
            <select value={moneda} onChange={(e) => setMoneda(e.target.value)}
              className="w-24 shrink-0 rounded-lg border border-slate-300 bg-white px-2 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#177E89]">
              {MONEDAS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </label>
        <label className="text-xs font-semibold text-slate-600 space-y-1">
          <span>Cada cuánto cobra</span>
          <select value={frecuencia} onChange={(e) => setFrecuencia(e.target.value as FrecuenciaPagoNomina)} className={campo}>
            <option value="SEMANAL">Semanal</option>
            <option value="QUINCENAL">Quincenal</option>
            <option value="MENSUAL">Mensual</option>
          </select>
        </label>
      </div>
      <p className="text-xs text-slate-500">
        {forma?.ayuda}{' '}
        {tipo === 'FIJO_MENSUAL' && valor > 0 && frecuencia !== 'MENSUAL'
          && `Le tocan unos ${monto(porPeriodo(valor, frecuencia), moneda)} por ${frecuencia === 'SEMANAL' ? 'semana' : 'quincena'}.`}
      </p>
      {error && <p role="alert" className="text-xs font-semibold text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button onClick={guardar} disabled={guardando} className="rounded-lg bg-[#177E89] px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
          {guardando ? 'Guardando…' : 'Guardar sueldo'}
        </button>
        <button onClick={onCancelar} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Cancelar</button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- revisar un recibo antes de pagar

type ReciboPeriodo = DetallePeriodoNominaApi['recibos'][number];

const FilaRevision: React.FC<{ recibo: ReciboPeriodo; onCambio: () => void; onError: (m: string) => void }> = ({ recibo, onCambio, onError }) => {
  const porHora = recibo.tipoSalario === 'POR_HORA';
  const inicialCantidad = porHora ? recibo.horasMarcadas : recibo.diasTrabajados;
  const [cantidad, setCantidad] = useState(inicialCantidad != null ? String(Number(inicialCantidad)) : '');
  const [bono, setBono] = useState(recibo.bono ? String(recibo.bono) : '');
  const [descuento, setDescuento] = useState(recibo.descuento ? String(recibo.descuento) : '');
  const [nota, setNota] = useState(recibo.nota || '');
  const [guardando, setGuardando] = useState(false);
  const num = (s: string) => (s.trim() === '' ? null : Number(s.replace(',', '.')));
  const cambiado = num(cantidad) !== (inicialCantidad != null ? Number(inicialCantidad) : null)
    || (num(bono) ?? 0) !== Number(recibo.bono ?? 0) || (num(descuento) ?? 0) !== Number(recibo.descuento ?? 0)
    || nota.trim() !== (recibo.nota || '');

  const aplicar = async () => {
    setGuardando(true);
    try {
      await revisarReciboNomina(recibo.id, {
        dias: porHora ? null : num(cantidad), horas: porHora ? num(cantidad) : null,
        bono: num(bono), descuento: num(descuento), nota: nota.trim() || null,
      });
      onCambio();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'No se pudo aplicar el cambio');
    } finally {
      setGuardando(false);
    }
  };
  const quitar = async () => {
    if (!window.confirm(`¿Sacar a ${recibo.empleadoNombre} de este pago? Podrás pagarle después.`)) return;
    try { await quitarReciboNomina(recibo.id); onCambio(); } catch (e) { onError(e instanceof Error ? e.message : 'No se pudo quitar'); }
  };

  const campo = 'w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#177E89]';
  const sueldo = recibo.lineas.find((l) => l.conceptoId == null && l.tipo === 'ASIGNACION' && l.descripcion !== 'Bono');
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-bold text-slate-900 truncate">{recibo.empleadoNombre}</div>
          <div className="text-xs text-slate-500">
            {recibo.cargo || 'Sin cargo'} · {formaDe(recibo.tipoSalario)?.nombre}: {monto(recibo.salario, recibo.moneda)} {formaDe(recibo.tipoSalario)?.unidad}
          </div>
          {sueldo && <div className="text-xs text-slate-500">{sueldo.descripcion}: {monto(sueldo.montoTotal, recibo.moneda)}</div>}
          {!porHora && recibo.horasMarcadas != null && Number(recibo.horasMarcadas) > 0 && (
            <div className="text-xs text-slate-500">Marcó {Number(recibo.horasMarcadas).toFixed(1)} horas en el período</div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-[11px] text-slate-500">Le toca</div>
          <div className="text-lg font-bold text-slate-900">{monto(recibo.netoCalculado, recibo.moneda)}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <label className="text-[11px] font-semibold text-slate-600 space-y-1">
          <span>{porHora ? 'Horas' : recibo.tipoSalario === 'POR_JORNADA' ? 'Jornadas' : 'Días trabajados'}</span>
          <input inputMode="decimal" value={cantidad} onChange={(e) => setCantidad(e.target.value)} className={campo} />
        </label>
        <label className="text-[11px] font-semibold text-slate-600 space-y-1">
          <span>Bono</span>
          <input inputMode="decimal" value={bono} onChange={(e) => setBono(e.target.value)} className={campo} placeholder="0" />
        </label>
        <label className="text-[11px] font-semibold text-slate-600 space-y-1">
          <span>Descuento o adelanto</span>
          <input inputMode="decimal" value={descuento} onChange={(e) => setDescuento(e.target.value)} className={campo} placeholder="0" />
        </label>
        <label className="text-[11px] font-semibold text-slate-600 space-y-1">
          <span>Nota (sale en el recibo)</span>
          <input value={nota} onChange={(e) => setNota(e.target.value)} className={campo} placeholder="Opcional" />
        </label>
      </div>
      {Number(recibo.netoCalculado) === 0 && (
        <p className="text-xs font-semibold text-amber-700">
          {porHora ? 'No marcó horas en este período: escribe las horas que trabajó y toca "Aplicar cambios".'
            : 'Le toca $0: revisa los días trabajados.'}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {cambiado && (
          <button onClick={aplicar} disabled={guardando} className="rounded-lg bg-[#177E89] px-3 py-2 text-xs font-bold text-white disabled:opacity-60">
            {guardando ? 'Calculando…' : 'Aplicar cambios'}
          </button>
        )}
        <button onClick={quitar} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600">No pagarle ahora</button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- pantalla

const totalesPorMoneda = (recibos: { netoCalculado?: number; netoEfectivo?: number; moneda: string }[]) => {
  const t = new Map<string, number>();
  recibos.forEach((r) => t.set(r.moneda, (t.get(r.moneda) || 0) + Number(r.netoEfectivo ?? r.netoCalculado ?? 0)));
  return [...t.entries()].map(([m, v]) => monto(v, m)).join(' + ') || monto(0);
};

export const NominaDelNegocio: React.FC<{ ocultarSueldo?: boolean }> = ({ ocultarSueldo = false }) => {
  const v = useVocabularioPersonal();
  const [trabajadores, setTrabajadores] = useState<TrabajadorNomina[] | null>(null);
  const [periodos, setPeriodos] = useState<PeriodoNominaApi[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [preparando, setPreparando] = useState<FrecuenciaPagoNomina | null>(null);
  const [opcionElegida, setOpcionElegida] = useState<OpcionPeriodo | null>(null);
  const [abierto, setAbierto] = useState<DetallePeriodoNominaApi | null>(null);
  const [historialAbierto, setHistorialAbierto] = useState<DetallePeriodoNominaApi | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [t, p] = await Promise.all([listarTrabajadoresNomina(), listarPeriodosNomina()]);
      setTrabajadores(t);
      setPeriodos(p);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos cargar la nómina');
      setTrabajadores([]);
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const recargarAbierto = useCallback(async (id: number) => {
    try {
      const detalle = await obtenerDetallePeriodoNomina(id);
      setAbierto(detalle.recibos.length > 0 ? detalle : null);
      if (detalle.recibos.length === 0) {
        await descartarPeriodoNomina(id).catch(() => {});
        setAviso('No quedó nadie en esta nómina; se descartó.');
        cargar();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos abrir la nómina');
    }
  }, [cargar]);

  const conSueldo = (trabajadores || []).filter((t) => t.salario != null && !t.fechaEgreso);
  const sinSueldo = (trabajadores || []).filter((t) => t.salario == null && !t.fechaEgreso);
  const frecuencias = useMemo(() => (['SEMANAL', 'QUINCENAL', 'MENSUAL'] as FrecuenciaPagoNomina[])
    .map((f) => ({ f, personas: conSueldo.filter((t) => t.frecuencia === f).length }))
    .filter((x) => x.personas > 0), [conSueldo]);
  const pendientes = periodos.filter((p) => p.estado === 'BORRADOR' || p.estado === 'CALCULADA' || p.estado === 'EN_REVISION');
  const pagados = periodos.filter((p) => p.estado === 'PAGADA' || p.estado === 'APROBADA');

  /** Si esas fechas ya se pagaron para esa frecuencia (no se pueden volver a pagar). */
  const yaPagado = (f: FrecuenciaPagoNomina, o: OpcionPeriodo) => pagados.some((p) =>
    (p.frecuencia == null || p.frecuencia === f) && p.fechaInicio <= o.hasta && p.fechaFin >= o.desde);

  const empezar = (f: FrecuenciaPagoNomina) => {
    setAviso(null);
    setPreparando(f);
    const opciones = periodosSugeridos(f);
    setOpcionElegida(opciones.find((o) => !yaPagado(f, o)) ?? opciones[0]);
  };

  const calcular = async () => {
    if (!preparando || !opcionElegida) return;
    setOcupado(true);
    setError(null);
    try {
      const periodo = await prepararNomina({ frecuencia: preparando, desde: opcionElegida.desde, hasta: opcionElegida.hasta });
      setPreparando(null);
      await recargarAbierto(periodo.id);
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo calcular la nómina');
    } finally {
      setOcupado(false);
    }
  };

  const pagar = async () => {
    if (!abierto) return;
    const total = totalesPorMoneda(abierto.recibos);
    if (!window.confirm(`Vas a pagar ${abierto.periodo.nombre.toLowerCase()} a ${abierto.recibos.length} ${abierto.recibos.length === 1 ? v.persona : v.personas} por ${total}. Se registra como salida de caja. ¿Pagar?`)) return;
    setOcupado(true);
    try {
      await pagarPeriodoNomina(abierto.periodo.id);
      const detalle = await obtenerDetallePeriodoNomina(abierto.periodo.id);
      setAbierto(null);
      setHistorialAbierto(detalle);
      setAviso(`Nómina pagada: ${total}. Ya puedes imprimir los recibos.`);
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo pagar');
    } finally {
      setOcupado(false);
    }
  };

  const descartar = async () => {
    if (!abierto || !window.confirm('¿Descartar esta nómina sin pagarla?')) return;
    try {
      await descartarPeriodoNomina(abierto.periodo.id);
      setAbierto(null);
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo descartar');
    }
  };

  const imprimir = async (ids: number[]) => {
    try { await imprimirRecibosNomina(ids, v.persona); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo abrir el recibo'); }
  };

  const tarjeta = 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-5';
  if (trabajadores === null) return <div className={`${tarjeta} text-sm text-[#177E89]`}>Cargando nómina…</div>;

  return (
    <div className="space-y-5">
      {error && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
      {aviso && <div role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{aviso}</div>}

      {/* Revisión de una nómina preparada */}
      {abierto ? (
        <section className={`${tarjeta} space-y-4`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-[#177E89]">Paso 2 de 3 · Revisa antes de pagar</div>
              <h2 className="text-lg font-bold text-slate-900">{abierto.periodo.nombre}</h2>
              <p className="text-sm text-slate-500">Corrige días, horas, bonos o adelantos si hace falta. Lo marcado con su usuario ya está contado.</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">Total a pagar</div>
              <div className="text-xl font-bold text-slate-900">{totalesPorMoneda(abierto.recibos)}</div>
            </div>
          </div>
          <div className="space-y-3">
            {abierto.recibos.map((r) => (
              <FilaRevision key={`${r.id}-${r.netoCalculado}-${r.bono}-${r.descuento}-${r.diasTrabajados}-${r.horasMarcadas}`}
                recibo={r} onCambio={() => recargarAbierto(abierto.periodo.id)} onError={setError} />
            ))}
          </div>
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <button onClick={pagar} disabled={ocupado} className="rounded-lg bg-[#177E89] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
              {ocupado ? 'Pagando…' : 'Paso 3: pagar y sacar recibos'}
            </button>
            <button onClick={() => imprimir(abierto.recibos.map((r) => r.id))} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">Ver recibos antes</button>
            <button onClick={descartar} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-red-600">Descartar</button>
          </div>
        </section>
      ) : (
        <section className={`${tarjeta} space-y-4`}>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Pagar nómina</h2>
            <p className="text-sm text-slate-500">
              {conSueldo.length === 0
                ? `Primero ponle el sueldo a cada ${v.persona}: cuánto gana, en qué moneda y si cobra semanal, quincenal o mensual.`
                : `Elige qué vas a pagar. Se calcula con lo que cada ${v.persona} trabajó y lo revisas antes de pagar.`}
            </p>
          </div>
          {pendientes.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 space-y-2">
              {pendientes.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-semibold text-amber-900">Sin terminar: {p.nombre}</span>
                  <button onClick={() => recargarAbierto(p.id)} className="rounded-lg bg-[#177E89] px-3 py-1.5 text-xs font-bold text-white">Continuar</button>
                </div>
              ))}
            </div>
          )}
          {preparando ? (
            <div className="rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="text-xs font-semibold text-[#177E89]">Paso 1 de 3 · ¿Qué vas a pagar?</div>
              <div className="flex flex-wrap gap-2">
                {periodosSugeridos(preparando).map((o) => {
                  const pagado = yaPagado(preparando, o);
                  return (
                    <button key={o.desde} onClick={() => setOpcionElegida(o)} disabled={pagado}
                      className={`rounded-full border px-3 py-1.5 text-sm font-semibold disabled:opacity-50 ${opcionElegida?.desde === o.desde && opcionElegida?.hasta === o.hasta ? 'border-[#177E89] bg-[#177E89] text-white' : 'border-slate-300 bg-white text-slate-700'}`}>
                      {o.etiqueta}{pagado ? ' (ya pagada)' : ''}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-end gap-2 text-xs font-semibold text-slate-600">
                <label className="space-y-1"><span className="block">Desde</span>
                  <input type="date" value={opcionElegida?.desde || ''} onChange={(e) => setOpcionElegida((o) => ({ etiqueta: 'Otras fechas', desde: e.target.value, hasta: o?.hasta || e.target.value }))}
                    className="rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-900" /></label>
                <label className="space-y-1"><span className="block">Hasta</span>
                  <input type="date" value={opcionElegida?.hasta || ''} onChange={(e) => setOpcionElegida((o) => ({ etiqueta: 'Otras fechas', desde: o?.desde || e.target.value, hasta: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-900" /></label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={calcular} disabled={ocupado} className="rounded-lg bg-[#177E89] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
                  {ocupado ? 'Calculando…' : 'Calcular'}
                </button>
                <button onClick={() => setPreparando(null)} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">Cancelar</button>
              </div>
            </div>
          ) : frecuencias.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {frecuencias.map(({ f, personas }) => (
                <button key={f} onClick={() => empezar(f)} className="rounded-xl bg-[#177E89] px-4 py-3 text-left text-white shadow-sm">
                  <div className="text-sm font-bold">Pagar {PERIODO_DE[f]}</div>
                  <div className="text-xs text-white/85">{personas} {personas === 1 ? v.persona : v.personas} cobra{personas === 1 ? '' : 'n'} {NOMBRE_FRECUENCIA[f]}</div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Sueldos y lo trabajado esta semana */}
      <section className={`${tarjeta} space-y-3`}>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Sueldos y horas de esta semana</h2>
          <p className="text-sm text-slate-500">Las horas salen de lo que cada {v.persona} marca con su usuario. Quien no tiene usuario se paga con los días que tú indiques.</p>
        </div>
        {trabajadores.length === 0 && (
          <p className="text-sm text-slate-500">Todavía no hay {v.personas}. Agrégalos desde el Resumen.</p>
        )}
        {sinSueldo.length > 0 && (
          <p className="text-xs font-semibold text-amber-700">{sinSueldo.length} sin sueldo: no entran en la nómina hasta que se lo pongas.</p>
        )}
        <div className="divide-y divide-slate-100">
          {trabajadores.filter((t) => !t.fechaEgreso).map((t) => (
            <div key={t.id} className="py-3 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">{t.nombre}</span>
                    {t.trabajandoAhora && <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-700">Trabajando ahora</span>}
                  </div>
                  <div className="text-xs text-slate-500">
                    {t.salario == null ? 'Sin sueldo' : (
                      <>{t.cargo} · {ocultarSueldo ? '••••' : monto(t.salario, t.moneda)} {formaDe(t.tipoSalario)?.unidad} · cobra {t.frecuencia ? NOMBRE_FRECUENCIA[t.frecuencia] : ''}</>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    {t.diasSemana > 0
                      ? `Esta semana: ${Number(t.horasSemana).toFixed(1)} h en ${t.diasSemana} ${t.diasSemana === 1 ? 'día' : 'días'}`
                      : t.tieneUsuario ? 'Esta semana todavía no ha marcado'
                        : 'No marca con usuario (se paga con los días que indiques)'}
                    {t.ultimoPagoHasta && ` · pagado hasta el ${fechaCorta(t.ultimoPagoHasta)}`}
                  </div>
                </div>
                {editandoId !== t.id && (
                  <button onClick={() => setEditandoId(t.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold ${t.salario == null ? 'bg-[#177E89] text-white' : 'border border-slate-300 bg-white text-slate-700'}`}>
                    {t.salario == null ? 'Poner sueldo' : 'Cambiar sueldo'}
                  </button>
                )}
              </div>
              {editandoId === t.id && (
                <EditorSueldo trabajador={t} sugerencia={v.nomina}
                  onGuardado={() => { setEditandoId(null); setAviso(`Sueldo de ${t.nombre} guardado.`); cargar(); }}
                  onCancelar={() => setEditandoId(null)} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Lo ya pagado */}
      {pagados.length > 0 && (
        <section className={`${tarjeta} space-y-3`}>
          <h2 className="text-lg font-bold text-slate-900">Pagos hechos</h2>
          <div className="divide-y divide-slate-100">
            {pagados.map((p) => (
              <div key={p.id} className="py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-800">{p.nombre}</div>
                  <button onClick={async () => {
                    if (historialAbierto?.periodo.id === p.id) return setHistorialAbierto(null);
                    try { setHistorialAbierto(await obtenerDetallePeriodoNomina(p.id)); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo abrir'); }
                  }} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                    {historialAbierto?.periodo.id === p.id ? 'Cerrar' : 'Ver recibos'}
                  </button>
                </div>
                {historialAbierto?.periodo.id === p.id && (
                  <div className="mt-2 space-y-2">
                    {historialAbierto.recibos.map((r) => (
                      <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <span className="text-slate-800">{r.empleadoNombre}</span>
                        <span className="flex items-center gap-3">
                          <span className="font-bold text-slate-900">{ocultarSueldo ? '••••' : monto(r.netoEfectivo, r.moneda)}</span>
                          <button onClick={() => imprimir([r.id])} className="rounded-lg bg-[#177E89] px-3 py-1.5 text-xs font-bold text-white">Imprimir recibo</button>
                        </span>
                      </div>
                    ))}
                    {historialAbierto.recibos.length > 1 && (
                      <button onClick={() => imprimir(historialAbierto.recibos.map((r) => r.id))} className="rounded-lg border border-[#177E89] px-3 py-1.5 text-xs font-bold text-[#177E89]">
                        Imprimir todos los recibos
                      </button>
                    )}
                    <div className="text-xs text-slate-500">Total pagado: {ocultarSueldo ? '••••' : totalesPorMoneda(historialAbierto.recibos)}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default NominaDelNegocio;
