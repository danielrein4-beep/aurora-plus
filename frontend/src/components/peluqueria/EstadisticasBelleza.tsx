import React from "react";
import { TransaccionCobroPeluqueria, Especialista, ClientePeluqueria, ServicioPeluqueria } from "./types";
import { IconSparkles, IconUsers, IconCard } from "../../Icons";

interface Props {
  transacciones: TransaccionCobroPeluqueria[];
  especialistas: Especialista[];
  clientes: ClientePeluqueria[];
  servicios: ServicioPeluqueria[];
}

export default function EstadisticasBelleza({
  transacciones,
  especialistas,
  clientes,
  servicios,
}: Props) {
  const totalFacturadoUSD = transacciones.reduce((acc, t) => acc + t.totalUSD, 0);
  const totalComisionesUSD = transacciones.reduce((acc, t) => acc + t.montoComisionUSD, 0);
  const margenNetoSalonUSD = totalFacturadoUSD - totalComisionesUSD;
  const ticketPromedioUSD = transacciones.length > 0 ? totalFacturadoUSD / transacciones.length : 0;

  // Rendimiento por Especialista
  const rendimientoPorEspecialista = especialistas.map((esp) => {
    const txsEsp = transacciones.filter((t) => t.especialistaId === esp.id);
    const facturado = txsEsp.reduce((acc, t) => acc + t.totalUSD, 0);
    const comision = txsEsp.reduce((acc, t) => acc + t.montoComisionUSD, 0);
    const propinas = txsEsp.reduce((acc, t) => acc + t.propinaUSD, 0);
    const clientesAtendidos = txsEsp.length;
    return {
      ...esp,
      facturado,
      comision,
      propinas,
      clientesAtendidos,
      ticketPromedio: clientesAtendidos > 0 ? facturado / clientesAtendidos : 0,
    };
  });

  return (
    <div className="space-y-6">
      {/* Top Banner KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="apple-glass rounded-2xl p-5 border border-white/10 bg-slate-900/40">
          <div className="text-white/50 text-xs font-mono uppercase">Facturación Total</div>
          <div className="text-3xl font-black text-emerald-400 font-['Outfit'] mt-1">
            ${totalFacturadoUSD.toFixed(2)}
          </div>
          <div className="text-[11px] text-emerald-400/80 mt-1">Ingresos brutos acumulados</div>
        </div>

        <div className="apple-glass rounded-2xl p-5 border border-purple-500/20 bg-purple-500/5">
          <div className="text-purple-300 text-xs font-mono uppercase">Comisiones Especialistas</div>
          <div className="text-3xl font-black text-purple-400 font-['Outfit'] mt-1">
            ${totalComisionesUSD.toFixed(2)}
          </div>
          <div className="text-[11px] text-purple-300/80 mt-1">Repartición a profesionales</div>
        </div>

        <div className="apple-glass rounded-2xl p-5 border border-teal-500/20 bg-teal-500/5">
          <div className="text-teal-300 text-xs font-mono uppercase">Margen Salón (Neto)</div>
          <div className="text-3xl font-black text-teal-400 font-['Outfit'] mt-1">
            ${margenNetoSalonUSD.toFixed(2)}
          </div>
          <div className="text-[11px] text-teal-300/80 mt-1">Ganancia neta del negocio</div>
        </div>

        <div className="apple-glass rounded-2xl p-5 border border-amber-500/20 bg-amber-500/5">
          <div className="text-amber-300 text-xs font-mono uppercase">Ticket Promedio</div>
          <div className="text-3xl font-black text-amber-400 font-['Outfit'] mt-1">
            ${ticketPromedioUSD.toFixed(2)}
          </div>
          <div className="text-[11px] text-amber-300/80 mt-1">Por cliente atendido</div>
        </div>
      </div>

      {/* Tabla de Rendimiento por Especialista */}
      <div className="apple-glass rounded-3xl p-6 border border-white/15 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-['Outfit'] font-black text-xl text-white">
              Liquidación y Rendimiento por Especialista
            </h3>
            <p className="text-white/50 text-xs mt-0.5">
              Control de comisiones generadas, propinas y volumen de clientas por profesional.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white">
            <thead>
              <tr className="border-b border-white/10 text-white/50 font-mono text-[11px]">
                <th className="pb-3 font-semibold">ESPECIALISTA</th>
                <th className="pb-3 font-semibold">ROL / ÁREA</th>
                <th className="pb-3 font-semibold text-center">% COMISIÓN</th>
                <th className="pb-3 font-semibold text-center">CLIENTES</th>
                <th className="pb-3 font-semibold text-right">TOTAL FACTURADO</th>
                <th className="pb-3 font-semibold text-right">COMISIÓN A PAGAR</th>
                <th className="pb-3 font-semibold text-right">PROPINAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rendimientoPorEspecialista.map((esp) => (
                <tr key={esp.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 font-bold text-white flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full bg-gradient-to-tr ${esp.colorAvatar}`} />
                    <span>{esp.nombre}</span>
                  </td>
                  <td className="py-3.5 text-white/70">{esp.rol}</td>
                  <td className="py-3.5 text-center font-mono font-bold text-purple-300">
                    {esp.porcentajeComision}%
                  </td>
                  <td className="py-3.5 text-center font-mono font-bold">
                    {esp.clientesAtendidos}
                  </td>
                  <td className="py-3.5 text-right font-mono font-bold text-emerald-400">
                    ${esp.facturado.toFixed(2)} USD
                  </td>
                  <td className="py-3.5 text-right font-mono font-black text-purple-400">
                    ${esp.comision.toFixed(2)} USD
                  </td>
                  <td className="py-3.5 text-right font-mono text-amber-300">
                    +${esp.propinas.toFixed(2)} USD
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Estadísticas de Clientes & Servicios Top */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Servicios Estrella */}
        <div className="apple-glass rounded-3xl p-6 border border-white/15 space-y-4">
          <h4 className="font-['Outfit'] font-bold text-base text-white flex items-center gap-2">
            <IconSparkles size={16} className="text-pink-400" />
            <span>Servicios de Mayor Demanda</span>
          </h4>
          <div className="space-y-3">
            {servicios.slice(0, 5).map((s, idx) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-white/40 font-bold">#{idx + 1}</span>
                  <div>
                    <div className="font-bold text-white">{s.nombre}</div>
                    <div className="text-[10px] text-white/40">{s.categoria} • {s.duracionMinutos} min</div>
                  </div>
                </div>
                <span className="font-mono font-bold text-teal-300">${s.precioUSD} USD</span>
              </div>
            ))}
          </div>
        </div>

        {/* Clientes más Fieles */}
        <div className="apple-glass rounded-3xl p-6 border border-white/15 space-y-4">
          <h4 className="font-['Outfit'] font-bold text-base text-white flex items-center gap-2">
            <IconUsers size={16} className="text-teal-400" />
            <span>Top Clientas Más Frecuentes</span>
          </h4>
          <div className="space-y-3">
            {clientes.slice(0, 4).map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 text-xs">
                <div>
                  <div className="font-bold text-white">{c.nombre}</div>
                  <div className="text-[10px] text-white/40">{c.totalVisitas} visitas • Última: {c.fechaUltimaVisita}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-emerald-400">${c.totalGastadoUSD} USD</div>
                  <div className="text-[10px] text-white/40">Total gastado</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
