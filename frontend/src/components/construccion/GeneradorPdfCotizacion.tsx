import React, { useRef } from "react";
import jsPDF from "jspdf";
import { ProyectoConstruccion, CapituloObra, PartidaObra } from "./types";
import {
  IconFileText,
  IconDownload,
  IconPrinter,
  IconChat,
  IconCheck,
  IconConstruction,
} from "../../Icons";

interface Props {
  proyecto: ProyectoConstruccion;
  capitulos: CapituloObra[];
  partidas: PartidaObra[];
  tasaBcv: number;
}

export default function GeneradorPdfCotizacion({
  proyecto,
  capitulos,
  partidas,
  tasaBcv,
}: Props) {
  const hojaImpresionRef = useRef<HTMLDivElement>(null);

  // Cálculos económicos
  const costoDirecto = partidas.reduce((acc, p) => acc + p.cantidad * p.precioUnitarioUSD, 0);
  const montoAdmin = (costoDirecto * proyecto.porcentajeAdministracion) / 100;
  const montoUtilidad = ((costoDirecto + montoAdmin) * proyecto.porcentajeUtilidad) / 100;
  const subtotalNeto = costoDirecto + montoAdmin + montoUtilidad;
  const montoIva = (subtotalNeto * proyecto.porcentajeIva) / 100;
  const totalGeneralUSD = subtotalNeto + montoIva;
  const totalGeneralBs = totalGeneralUSD * tasaBcv;

  // Generación formal con jsPDF
  const descargarPdf = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });

    // Cabecera formal
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(0, 0, 216, 26, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("PRESUPUESTO Y OFERTA TÉCNICA DE OBRA", 14, 11);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`CÓDIGO: ${proyecto.codigo} | EMISIÓN: ${new Date().toLocaleDateString("es-VE")}`, 14, 18);
    doc.text(`VALIDEZ: 15 DÍAS | TASA BCV: ${tasaBcv.toFixed(2)} Bs/$`, 140, 18);

    // Datos del Proyecto y Contratante
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("DATOS DE LA OBRA / PROYECTO:", 14, 34);
    doc.setFont("helvetica", "normal");
    doc.text(`Proyecto: ${proyecto.nombre}`, 14, 40);
    doc.text(`Ubicación: ${proyecto.ubicacion}`, 14, 45);
    doc.text(`Ing. Residente: ${proyecto.ingenieroResidente} (${proyecto.ingenieroCiv})`, 14, 50);

    doc.setFont("helvetica", "bold");
    doc.text("DATOS DEL CLIENTE / CONTRATANTE:", 120, 34);
    doc.setFont("helvetica", "normal");
    doc.text(`Cliente: ${proyecto.clienteNombre}`, 120, 40);
    doc.text(`RIF: ${proyecto.clienteRif}`, 120, 45);
    doc.text(`Teléfono: ${proyecto.clienteTelefono}`, 120, 50);

    doc.setDrawColor(203, 213, 225);
    doc.line(14, 55, 202, 55);

    // Encabezado de la tabla de partidas
    let y = 62;
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y - 4, 188, 7, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text("CÓDIGO", 16, y);
    doc.text("DESCRIPCIÓN DE LA PARTIDA", 36, y);
    doc.text("UND", 132, y);
    doc.text("CANT", 146, y);
    doc.text("P.U. ($)", 164, y);
    doc.text("TOTAL ($)", 186, y);

    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);

    // Agrupación y listado por capítulos
    capitulos.forEach((cap) => {
      const partidasCap = partidas.filter((p) => p.capituloId === cap.id);
      if (partidasCap.length === 0) return;

      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      // Título del capítulo
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 3, 188, 5, "F");
      doc.text(`${cap.numero} ${cap.nombre.toUpperCase()}`, 16, y);
      y += 5;

      // Partidas del capítulo
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);

      partidasCap.forEach((p) => {
        if (y > 255) {
          doc.addPage();
          y = 20;
        }

        doc.text(p.codigoPartida, 16, y);
        const descCorta = doc.splitTextToSize(p.descripcion, 92);
        doc.text(descCorta[0] || "", 36, y);
        doc.text(p.unidad, 134, y);
        doc.text(p.cantidad.toFixed(1), 150, y, { align: "right" });
        doc.text(`$${p.precioUnitarioUSD.toFixed(2)}`, 172, y, { align: "right" });
        doc.text(`$${p.totalUSD.toFixed(2)}`, 198, y, { align: "right" });

        y += 4.5;
      });

      y += 2;
    });

    // Cuadro de Totales
    if (y > 220) {
      doc.addPage();
      y = 25;
    }

    y += 4;
    doc.setDrawColor(203, 213, 225);
    doc.line(120, y, 202, y);
    y += 5;

    doc.setFontSize(8);
    doc.text("Costo Directo:", 125, y);
    doc.text(`$${costoDirecto.toFixed(2)}`, 198, y, { align: "right" });
    y += 4.5;

    doc.text(`Administración e Imprevistos (${proyecto.porcentajeAdministracion}%):`, 125, y);
    doc.text(`$${montoAdmin.toFixed(2)}`, 198, y, { align: "right" });
    y += 4.5;

    doc.text(`Utilidad del Contratista (${proyecto.porcentajeUtilidad}%):`, 125, y);
    doc.text(`$${montoUtilidad.toFixed(2)}`, 198, y, { align: "right" });
    y += 4.5;

    doc.text(`IVA (${proyecto.porcentajeIva}%):`, 125, y);
    doc.text(`$${montoIva.toFixed(2)}`, 198, y, { align: "right" });
    y += 5;

    doc.setFillColor(15, 23, 42);
    doc.rect(120, y - 4, 82, 11, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("TOTAL OFERTA USD:", 123, y);
    doc.text(`$${totalGeneralUSD.toFixed(2)}`, 199, y, { align: "right" });

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text(`Equivalente: Bs. ${totalGeneralBs.toFixed(2)}`, 123, y + 5);

    // Cuadro de Firmas
    y += 24;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");

    doc.line(24, y, 80, y);
    doc.text(proyecto.ingenieroResidente, 52, y + 4, { align: "center" });
    doc.text(`Ingeniero Residente (${proyecto.ingenieroCiv})`, 52, y + 8, { align: "center" });

    doc.line(134, y, 190, y);
    doc.text("Por el Contratante / Cliente", 162, y + 4, { align: "center" });
    doc.text("Aceptado Conforme", 162, y + 8, { align: "center" });

    doc.save(`Presupuesto_${proyecto.codigo}_${proyecto.nombre.replace(/\s+/g, "_")}.pdf`);
  };

  // Enviar por WhatsApp
  const compartirWhatsApp = () => {
    const texto = `*PRESUPUESTO DE OBRA — ${proyecto.nombre}*\n` +
      `Código: ${proyecto.codigo}\n` +
      `Contratante: ${proyecto.clienteNombre}\n` +
      `Ubicación: ${proyecto.ubicacion}\n\n` +
      `*Costo Directo:* $${costoDirecto.toFixed(2)} USD\n` +
      `*Administración (${proyecto.porcentajeAdministracion}%):* $${montoAdmin.toFixed(2)} USD\n` +
      `*Utilidad (${proyecto.porcentajeUtilidad}%):* $${montoUtilidad.toFixed(2)} USD\n` +
      `*IVA (${proyecto.porcentajeIva}%):* $${montoIva.toFixed(2)} USD\n\n` +
      `*TOTAL ESTIMADO:* $${totalGeneralUSD.toFixed(2)} USD\n` +
      `*(Equivalente Oficial: Bs. ${totalGeneralBs.toFixed(2)} a tasa BCV ${tasaBcv.toFixed(2)})*\n\n` +
      `Elaborado por: ${proyecto.ingenieroResidente} (${proyecto.ingenieroCiv})\n` +
      `Validez de la oferta: 15 días continuos.`;

    const tel = proyecto.clienteTelefono.replace(/[^0-9]/g, "");
    const url = `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank");
  };
  return (
    <div className="space-y-6">
      {/* BARRA DE BOTONES DE ACCIÓN */}
      <div className="apple-glass rounded-2xl p-4 border border-white/10 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300">
            <IconFileText size={18} />
          </div>
          <div>
            <h3 className="font-['Outfit'] font-black text-base text-white">
              Cotización Formal de Obra & Presupuesto
            </h3>
            <p className="text-xs text-white/50">
              Vista previa maquetada según normas de ingeniería civil con descarga PDF y envío directo.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={compartirWhatsApp}
            className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold hover:bg-emerald-500/30 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <IconChat size={14} />
            <span>Compartir WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
          >
            <IconPrinter size={14} />
            <span>Imprimir</span>
          </button>

          <button
            type="button"
            onClick={descargarPdf}
            className="btn-cyber-neon px-5 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-lg hover:scale-105 transition-transform cursor-pointer"
          >
            <IconDownload size={14} />
            <span>Descargar Cotización en PDF</span>
          </button>
        </div>
      </div>

      {/* HOJA DE VISTA PREVIA PROFESIONAL (ESTILO PLANO DE INGENIERÍA) */}
      <div className="flex justify-center">
        <div
          ref={hojaImpresionRef}
          className="bg-white text-slate-900 rounded-3xl p-8 sm:p-12 max-w-4xl w-full shadow-2xl space-y-6 font-sans border border-slate-200"
        >
          {/* Cabecera Membrete */}
          <div className="border-b-2 border-slate-900 pb-5 flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-teal-400 flex items-center justify-center font-black">
                  <IconConstruction size={18} />
                </div>
                <h1 className="font-['Outfit'] font-black text-xl text-slate-900 tracking-tight">
                  AURORA OBRAS & INGENIERÍA CIVIL
                </h1>
              </div>
              <p className="text-xs text-slate-600">
                Construcción, Cómputos Métricos, Presupuestos y Gerencia de Proyectos
              </p>
              <p className="text-[11px] text-slate-500 font-mono">
                RIF: J-50493821-4 | Tlf: +58 (243) 234-8899 | contacto@auroraobras.com
              </p>
            </div>

            <div className="text-right space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div className="text-xs font-mono font-bold text-slate-500 uppercase">Oferta de Obra</div>
              <div className="text-base font-mono font-black text-slate-900">{proyecto.codigo}</div>
              <div className="text-[11px] text-slate-600">Fecha: {new Date().toLocaleDateString("es-VE")}</div>
              <div className="text-[11px] text-emerald-700 font-semibold">Validez: 15 días continuos</div>
            </div>
          </div>

          {/* Cuadro de Datos de la Obra y Contratante */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="space-y-1">
              <div className="font-bold text-slate-900 uppercase text-[10px] tracking-wider text-teal-800">
                Proyecto / Obra
              </div>
              <div className="font-bold text-sm text-slate-900">{proyecto.nombre}</div>
              <div className="text-slate-600"><strong>Ubicación:</strong> {proyecto.ubicacion}</div>
              <div className="text-slate-600">
                <strong>Ing. Residente:</strong> {proyecto.ingenieroResidente} ({proyecto.ingenieroCiv})
              </div>
            </div>

            <div className="space-y-1">
              <div className="font-bold text-slate-900 uppercase text-[10px] tracking-wider text-teal-800">
                Cliente / Contratante
              </div>
              <div className="font-bold text-sm text-slate-900">{proyecto.clienteNombre}</div>
              <div className="text-slate-600"><strong>RIF:</strong> {proyecto.clienteRif}</div>
              <div className="text-slate-600"><strong>Teléfono:</strong> {proyecto.clienteTelefono}</div>
            </div>
          </div>

          {/* Desglose de Partidas por Capítulos */}
          <div className="space-y-4">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-mono uppercase text-[10px]">
                  <th className="py-2.5 px-3 rounded-l-lg">Código</th>
                  <th className="py-2.5 px-3">Descripción de la Partida</th>
                  <th className="py-2.5 px-2 text-center">Unidad</th>
                  <th className="py-2.5 px-3 text-right">Cómputo</th>
                  <th className="py-2.5 px-3 text-right">P.U. ($)</th>
                  <th className="py-2.5 px-3 rounded-r-lg text-right">Total ($ USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {capitulos.map((cap) => {
                  const partidasCap = partidas.filter((p) => p.capituloId === cap.id);
                  if (partidasCap.length === 0) return null;
                  const totalCap = partidasCap.reduce((acc, p) => acc + p.totalUSD, 0);

                  return (
                    <React.Fragment key={cap.id}>
                      <tr className="bg-slate-100 font-bold font-mono text-[11px] text-slate-800">
                        <td colSpan={5} className="py-2 px-3">
                          {cap.numero} {cap.nombre.toUpperCase()}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-900 font-black">
                          ${totalCap.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>

                      {partidasCap.map((p) => (
                        <tr key={p.id} className="text-slate-700 hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono text-slate-900 font-semibold">{p.codigoPartida}</td>
                          <td className="py-2 px-3 leading-snug">{p.descripcion}</td>
                          <td className="py-2 px-2 text-center font-mono font-bold text-teal-800">{p.unidad}</td>
                          <td className="py-2 px-3 text-right font-mono">{p.cantidad.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-mono">${p.precioUnitarioUSD.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            ${p.totalUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Cuadro de Cierre Económico */}
          <div className="flex justify-end pt-4 border-t-2 border-slate-900">
            <div className="w-full sm:w-80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Costo Directo de Obra:</span>
                <span className="font-mono font-bold text-slate-900">
                  ${costoDirecto.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Administración e Imprevistos ({proyecto.porcentajeAdministracion}%):</span>
                <span className="font-mono font-bold text-slate-900">
                  ${montoAdmin.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Utilidad del Contratista ({proyecto.porcentajeUtilidad}%):</span>
                <span className="font-mono font-bold text-slate-900">
                  ${montoUtilidad.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Impuesto IVA ({proyecto.porcentajeIva}%):</span>
                <span className="font-mono font-bold text-slate-900">
                  ${montoIva.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-900 p-3 bg-slate-900 text-white rounded-xl space-y-1">
                <div className="flex justify-between text-sm font-black font-['Outfit']">
                  <span>TOTAL OFERTA:</span>
                  <span className="text-teal-400 font-mono">
                    ${totalGeneralUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 font-mono text-right">
                  Equivalente Oficial: Bs. {totalGeneralBs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* Cuadro de Firmas Oficiales */}
          <div className="pt-12 grid grid-cols-2 gap-8 text-center text-xs text-slate-700">
            <div className="space-y-1">
              <div className="border-t border-slate-400 pt-2 w-48 mx-auto font-bold text-slate-900">
                {proyecto.ingenieroResidente}
              </div>
              <div className="text-[11px] text-slate-500">Ingeniero Residente ({proyecto.ingenieroCiv})</div>
              <div className="text-[10px] text-slate-400">Por la Empresa Contratista</div>
            </div>

            <div className="space-y-1">
              <div className="border-t border-slate-400 pt-2 w-48 mx-auto font-bold text-slate-900">
                {proyecto.clienteNombre}
              </div>
              <div className="text-[11px] text-slate-500">Ingeniero Inspector / Contratante</div>
              <div className="text-[10px] text-slate-400">Aprobación Conforme de la Oferta</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
