import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import {
  obtenerDatosFiscalesNegocio, obtenerLibroCompras, obtenerLibroVentas,
  type DatosFiscalesNegocio, type LibroFiscal, type RenglonLibroCompras, type RenglonLibroVentas,
} from "../api";

type Toast = (m: string, t?: "success" | "error" | "info") => void;
type Tipo = "ventas" | "compras";

const hoy = () => new Date().toISOString().slice(0, 10);
const primeroDelMes = (ym: string) => `${ym}-01`;
const ultimoDelMes = (ym: string) => {
  const [a, m] = ym.split("-").map(Number);
  return `${ym}-${String(new Date(a, m, 0).getDate()).padStart(2, "0")}`;
};
const fechaCorta = (iso: string) => {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
};
const r2 = (n: number) => Math.round(n * 100) / 100;
const bs = (monto: number, tasa: number | null) => (tasa == null ? null : r2(monto * tasa));
const fmt = (n: number | null) => (n == null ? "sin tasa" : n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

/** Columnas de cada libro, ya en bolívares. Lo mismo alimenta la tabla, el Excel y el PDF. */
interface Columna<T> { titulo: string; ancho: number; numero?: boolean; valor: (r: T, i: number) => string | number | null }

const COLUMNAS_VENTAS: Columna<RenglonLibroVentas>[] = [
  { titulo: "N°", ancho: 8, valor: (_r, i) => i + 1 },
  { titulo: "Fecha", ancho: 18, valor: (r) => fechaCorta(r.fecha) },
  { titulo: "N° Documento", ancho: 22, valor: (r) => r.numeroTicket },
  { titulo: "N° Control", ancho: 22, valor: (r) => r.numeroControl || "" },
  { titulo: "Cliente", ancho: 40, valor: (r) => r.clienteNombre || "Consumidor final" },
  { titulo: "RIF / C.I.", ancho: 22, valor: (r) => r.clienteRif || "" },
  { titulo: "Tasa BCV", ancho: 16, numero: true, valor: (r) => r.tasaBcv },
  { titulo: "Total Bs", ancho: 22, numero: true, valor: (r) => bs(r.total, r.tasaBcv) },
  { titulo: "Exento Bs", ancho: 20, numero: true, valor: (r) => bs(r.exento, r.tasaBcv) },
  { titulo: "Base Bs", ancho: 22, numero: true, valor: (r) => bs(r.baseImponible, r.tasaBcv) },
  { titulo: "Alíc. %", ancho: 11, numero: true, valor: (r) => r.alicuotaIva },
  { titulo: "IVA Bs", ancho: 20, numero: true, valor: (r) => bs(r.iva, r.tasaBcv) },
  { titulo: "IGTF Bs", ancho: 18, numero: true, valor: (r) => bs(r.igtf, r.tasaBcv) },
  { titulo: "Nota", ancho: 36, valor: (r) => [r.ivaQuitado ? `IVA quitado por ${r.ivaQuitadoPor || "?"}` : "", r.esCredito ? "Crédito" : "", r.tasaEstimada ? "Tasa estimada" : ""].filter(Boolean).join(" · ") },
];

const COLUMNAS_COMPRAS: Columna<RenglonLibroCompras>[] = [
  { titulo: "N°", ancho: 8, valor: (_r, i) => i + 1 },
  { titulo: "Fecha", ancho: 18, valor: (r) => fechaCorta(r.fecha) },
  { titulo: "Proveedor", ancho: 42, valor: (r) => r.proveedor },
  { titulo: "RIF", ancho: 22, valor: (r) => r.proveedorRif || "" },
  { titulo: "N° Factura", ancho: 22, valor: (r) => r.numeroFactura || "" },
  { titulo: "N° Control", ancho: 22, valor: (r) => r.numeroControl || "" },
  { titulo: "Tasa BCV", ancho: 16, numero: true, valor: (r) => r.tasaBcv },
  { titulo: "Total Bs", ancho: 22, numero: true, valor: (r) => bs(r.total, r.tasaBcv) },
  { titulo: "Exento Bs", ancho: 20, numero: true, valor: (r) => bs(r.exento, r.tasaBcv) },
  { titulo: "Base Bs", ancho: 22, numero: true, valor: (r) => bs(r.baseImponible, r.tasaBcv) },
  { titulo: "Alíc. %", ancho: 11, numero: true, valor: (r) => r.alicuotaIva },
  { titulo: "IVA Bs", ancho: 20, numero: true, valor: (r) => bs(r.iva, r.tasaBcv) },
  { titulo: "IVA ret. Bs", ancho: 20, numero: true, valor: (r) => bs(r.ivaRetenido, r.tasaBcv) },
  { titulo: "Nota", ancho: 30, valor: (r) => [r.sinFacturaFiscal ? "Sin factura fiscal" : "", r.tasaEstimada ? "Tasa estimada" : ""].filter(Boolean).join(" · ") },
];

/** Columnas que se suman en la fila de totales (las de montos en Bs). */
const SUMABLES = new Set(["Total Bs", "Exento Bs", "Base Bs", "IVA Bs", "IGTF Bs", "IVA ret. Bs"]);

function totales<T>(cols: Columna<T>[], filas: T[]): (number | string)[] {
  return cols.map((c, idx) => {
    if (idx === 0) return "TOTALES";
    if (!SUMABLES.has(c.titulo)) return "";
    return r2(filas.reduce((acc, f, i) => acc + (Number(c.valor(f, i)) || 0), 0));
  });
}

export default function LibrosFiscalesComercio({ nombreNegocio, mostrarToast }: { nombreNegocio: string; mostrarToast: Toast }) {
  const [tipo, setTipo] = useState<Tipo>("ventas");
  const [mes, setMes] = useState(hoy().slice(0, 7));
  const [desde, setDesde] = useState(primeroDelMes(hoy().slice(0, 7)));
  const [hasta, setHasta] = useState(ultimoDelMes(hoy().slice(0, 7)));
  const [ventas, setVentas] = useState<LibroFiscal<RenglonLibroVentas> | null>(null);
  const [compras, setCompras] = useState<LibroFiscal<RenglonLibroCompras> | null>(null);
  const [negocio, setNegocio] = useState<DatosFiscalesNegocio>({});
  const [cargando, setCargando] = useState(false);

  useEffect(() => { obtenerDatosFiscalesNegocio().then(setNegocio).catch(() => {}); }, []);

  useEffect(() => {
    if (!desde || !hasta || hasta < desde) return;
    setCargando(true);
    Promise.all([obtenerLibroVentas(desde, hasta), obtenerLibroCompras(desde, hasta)])
      .then(([v, c]) => { setVentas(v); setCompras(c); })
      .catch((e) => mostrarToast(e?.message || "No se pudieron cargar los libros.", "error"))
      .finally(() => setCargando(false));
  }, [desde, hasta]);

  const elegirMes = (ym: string) => {
    setMes(ym);
    if (ym) { setDesde(primeroDelMes(ym)); setHasta(ultimoDelMes(ym)); }
  };

  const resumen = useMemo(() => {
    const debito = r2((ventas?.renglones || []).reduce((a, r) => a + (bs(r.iva, r.tasaBcv) || 0), 0));
    const credito = r2((compras?.renglones || []).filter((r) => !r.sinFacturaFiscal).reduce((a, r) => a + (bs(r.iva, r.tasaBcv) || 0), 0));
    const retenido = r2((compras?.renglones || []).reduce((a, r) => a + (bs(r.ivaRetenido, r.tasaBcv) || 0), 0));
    const igtf = r2((ventas?.renglones || []).reduce((a, r) => a + (bs(r.igtf, r.tasaBcv) || 0), 0));
    const quitados = (ventas?.renglones || []).filter((r) => r.ivaQuitado).length;
    const sinTasa = [...(ventas?.renglones || []), ...(compras?.renglones || [])].filter((r) => r.tasaBcv == null).length;
    return { debito, credito, retenido, igtf, quitados, sinTasa, cuota: r2(debito - credito) };
  }, [ventas, compras]);

  const periodoTexto = `${fechaCorta(desde)} al ${fechaCorta(hasta)}`;
  const tituloLibro = tipo === "ventas" ? "Libro de Ventas" : "Libro de Compras";
  const nombreArchivo = `${tipo === "ventas" ? "libro-ventas" : "libro-compras"}_${desde}_${hasta}`;

  const datosActuales = (): { cols: Columna<any>[]; filas: any[] } =>
    tipo === "ventas" ? { cols: COLUMNAS_VENTAS, filas: ventas?.renglones || [] } : { cols: COLUMNAS_COMPRAS, filas: compras?.renglones || [] };

  const exportarExcel = () => {
    const { cols, filas } = datosActuales();
    const encabezado = [
      [tituloLibro],
      [negocio.razonSocial || nombreNegocio],
      [`RIF: ${negocio.rif || "sin cargar"}`],
      [`Período: ${periodoTexto}`, "", "", "", "", "Montos en bolívares a la tasa BCV del día de cada operación"],
      [],
      cols.map((c) => c.titulo),
    ];
    const cuerpo = filas.map((f, i) => cols.map((c) => c.valor(f, i) ?? ""));
    const hoja = XLSX.utils.aoa_to_sheet([...encabezado, ...cuerpo, totales(cols, filas)]);
    hoja["!cols"] = cols.map((c) => ({ wch: Math.max(8, Math.round(c.ancho / 1.6)) }));
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, tipo === "ventas" ? "Ventas" : "Compras");
    if (tipo === "ventas") {
      XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet([
        ["Resumen del período", periodoTexto],
        ["Débito fiscal (IVA de ventas) Bs", resumen.debito],
        ["Crédito fiscal (IVA de compras) Bs", resumen.credito],
        ["Diferencia Bs", resumen.cuota],
        ["IVA retenido en compras Bs", resumen.retenido],
        ["IGTF percibido Bs", resumen.igtf],
        ["Ventas con IVA quitado por el cajero", resumen.quitados],
      ]), "Resumen");
    }
    XLSX.writeFile(libro, `${nombreArchivo}.xlsx`);
  };

  const exportarPdf = () => {
    const { cols, filas } = datosActuales();
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const anchoPagina = doc.internal.pageSize.getWidth();
    const altoPagina = doc.internal.pageSize.getHeight();
    const margen = 8;
    const escala = (anchoPagina - margen * 2) / cols.reduce((a, c) => a + c.ancho, 0);
    const anchos = cols.map((c) => c.ancho * escala);
    const altoFila = 5.2;
    let pagina = 1;

    const texto = (v: string | number | null, numero?: boolean) =>
      v == null || v === "" ? "" : typeof v === "number" && numero ? fmt(v) : String(v);
    const recortar = (t: string, ancho: number) => {
      let s = t;
      while (s.length > 1 && doc.getTextWidth(s) > ancho - 1.6) s = s.slice(0, -1);
      return s === t ? s : s.slice(0, -1) + "…";
    };
    const fila = (valores: (string | number | null)[], y: number, opciones: { negrita?: boolean; fondo?: [number, number, number] } = {}) => {
      if (opciones.fondo) {
        doc.setFillColor(...opciones.fondo);
        doc.rect(margen, y - 3.8, anchoPagina - margen * 2, altoFila, "F");
      }
      doc.setFont("helvetica", opciones.negrita ? "bold" : "normal");
      let x = margen;
      valores.forEach((v, i) => {
        const t = recortar(texto(v, cols[i].numero), anchos[i]);
        if (cols[i].numero) doc.text(t, x + anchos[i] - 0.8, y, { align: "right" });
        else doc.text(t, x + 0.8, y);
        x += anchos[i];
      });
    };
    const encabezado = () => {
      doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(15, 23, 42);
      doc.text(tituloLibro, margen, 12);
      doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(71, 85, 105);
      doc.text(`${negocio.razonSocial || nombreNegocio}  ·  RIF ${negocio.rif || "sin cargar"}`, margen, 17);
      doc.text(`Período: ${periodoTexto}  ·  Montos en bolívares a la tasa BCV del día de cada operación`, margen, 21);
      doc.text(`Página ${pagina}`, anchoPagina - margen, 12, { align: "right" });
      doc.setFontSize(6.8); doc.setTextColor(255, 255, 255);
      fila(cols.map((c) => c.titulo), 28, { negrita: true, fondo: [15, 118, 110] });
      doc.setTextColor(30, 41, 59);
      return 28 + altoFila;
    };

    let y = encabezado();
    filas.forEach((f, i) => {
      if (y > altoPagina - 14) { doc.addPage(); pagina++; y = encabezado(); }
      const marcada = tipo === "ventas" && (f as RenglonLibroVentas).ivaQuitado;
      fila(cols.map((c) => c.valor(f, i)), y, { fondo: marcada ? [254, 243, 199] : i % 2 ? [248, 250, 252] : undefined });
      y += altoFila;
    });
    if (y > altoPagina - 14) { doc.addPage(); pagina++; y = encabezado(); }
    doc.setDrawColor(148, 163, 184); doc.line(margen, y - 3.9, anchoPagina - margen, y - 3.9);
    fila(totales(cols, filas), y, { negrita: true });

    if (tipo === "ventas") {
      y += 9;
      if (y > altoPagina - 30) { doc.addPage(); pagina++; y = 16; }
      doc.setFontSize(8.5); doc.setFont("helvetica", "bold"); doc.text("Resumen del período", margen, y);
      doc.setFont("helvetica", "normal");
      [
        `Débito fiscal (IVA de ventas): Bs ${fmt(resumen.debito)}`,
        `Crédito fiscal (IVA de compras con factura): Bs ${fmt(resumen.credito)}`,
        `Diferencia: Bs ${fmt(resumen.cuota)}`,
        `IGTF percibido: Bs ${fmt(resumen.igtf)}`,
        resumen.quitados ? `Ventas con IVA quitado por el cajero: ${resumen.quitados} (resaltadas en amarillo)` : "",
      ].filter(Boolean).forEach((t, i) => doc.text(t, margen, y + 5 + i * 4.5));
    }
    doc.save(`${nombreArchivo}.pdf`);
  };

  const { cols, filas } = datosActuales();
  const inputFecha = "px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white";
  const tarjeta = (titulo: string, valor: string, detalle?: string, tono?: "teal" | "amber") => (
    <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{titulo}</div>
      <div className={`text-lg font-black font-mono mt-1 ${tono === "teal" ? "text-teal-700 dark:text-teal-400" : tono === "amber" ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>{valor}</div>
      {detalle && <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{detalle}</div>}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">Libros de Compras y Ventas</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">En bolívares, a la tasa BCV del día de cada operación. Listos para entregar a tu contador.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
            Mes
            <input type="month" value={mes} onChange={(e) => elegirMes(e.target.value)} className={`${inputFecha} block mt-1`} />
          </label>
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
            Desde
            <input type="date" value={desde} max={hasta} onChange={(e) => { setMes(""); setDesde(e.target.value); }} className={`${inputFecha} block mt-1`} />
          </label>
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
            Hasta
            <input type="date" value={hasta} min={desde} onChange={(e) => { setMes(""); setHasta(e.target.value); }} className={`${inputFecha} block mt-1`} />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tarjeta("Débito fiscal", `Bs ${fmt(resumen.debito)}`, "IVA cobrado en ventas")}
        {tarjeta("Crédito fiscal", `Bs ${fmt(resumen.credito)}`, "IVA pagado en compras con factura")}
        {tarjeta("Diferencia", `Bs ${fmt(resumen.cuota)}`, resumen.cuota >= 0 ? "Débito menos crédito" : "Excedente de crédito", resumen.cuota >= 0 ? undefined : "teal")}
        {tarjeta("IGTF percibido", `Bs ${fmt(resumen.igtf)}`, resumen.quitados ? `${resumen.quitados} venta${resumen.quitados === 1 ? "" : "s"} con IVA quitado` : undefined, resumen.quitados ? "amber" : undefined)}
      </div>

      {resumen.sinTasa > 0 && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-xs text-amber-800 dark:text-amber-300">
          {resumen.sinTasa} operación{resumen.sinTasa === 1 ? "" : "es"} no tiene{resumen.sinTasa === 1 ? "" : "n"} tasa BCV registrada y no se puede{resumen.sinTasa === 1 ? "" : "n"} pasar a bolívares. Registra la tasa del día en el panel de tasas.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
          {(["ventas", "compras"] as const).map((t) => (
            <button
              key={t} type="button" onClick={() => setTipo(t)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${tipo === t ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400"}`}
            >
              {t === "ventas" ? `Ventas (${ventas?.renglones.length ?? 0})` : `Compras (${compras?.renglones.length ?? 0})`}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={exportarExcel} disabled={cargando || filas.length === 0}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-[#FFFFFF] font-bold text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            Descargar Excel
          </button>
          <button type="button" onClick={exportarPdf} disabled={cargando || filas.length === 0}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-[#FFFFFF] font-bold text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            Descargar PDF
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto">
        {cargando ? (
          <div className="p-8 text-center text-xs text-slate-400">Cargando...</div>
        ) : filas.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
            {tipo === "ventas" ? "No hay ventas cobradas en este período." : "No hay compras registradas en este período."}
          </div>
        ) : (
          <table className="w-full text-[11.5px] whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400">
                {cols.map((c) => (
                  <th key={c.titulo} className={`px-2.5 py-2 font-bold ${c.numero ? "text-right" : "text-left"}`}>{c.titulo}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((f, i) => {
                const marcada = tipo === "ventas" && (f as RenglonLibroVentas).ivaQuitado;
                return (
                  <tr key={i} className={`border-t border-slate-100 dark:border-slate-800 ${marcada ? "bg-amber-50 dark:bg-amber-500/10" : ""}`}>
                    {cols.map((c) => {
                      const v = c.valor(f, i);
                      return (
                        <td key={c.titulo} className={`px-2.5 py-1.5 text-slate-700 dark:text-slate-300 ${c.numero ? "text-right font-mono" : ""}`}>
                          {c.numero && typeof v === "number" ? fmt(v) : v == null ? (c.numero ? "sin tasa" : "") : String(v)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              <tr className="border-t-2 border-slate-300 dark:border-slate-600 font-black text-slate-900 dark:text-white">
                {totales(cols, filas).map((v, i) => (
                  <td key={i} className={`px-2.5 py-2 ${cols[i].numero ? "text-right font-mono" : ""}`}>{typeof v === "number" ? fmt(v) : v}</td>
                ))}
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
