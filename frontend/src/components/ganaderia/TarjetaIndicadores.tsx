import { useEffect, useState } from "react";
import { obtenerIndicadoresGanaderia, type IndicadoresGanaderia } from "../../api";
import { num } from "./formato";

interface Props {
  /** Cambia cuando el hato se recarga, para volver a calcular. */
  version: number;
}

interface Indicador {
  titulo: string;
  valor: string | null;
  detalle: string;
  /** Qué falta cargar para que el indicador tenga dato. */
  sinDato: string;
  ayuda: string;
}

/**
 * Indicadores de gestión del hato para el administrador: preñez, natalidad, intervalo entre
 * partos, días abiertos, mortalidad, leche por vaca y GDP. Sin datos muestra qué cargar, nunca un número supuesto.
 */
export default function TarjetaIndicadores({ version }: Props) {
  const [ind, setInd] = useState<IndicadoresGanaderia | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
    obtenerIndicadoresGanaderia().then(setInd).catch(() => setError(true));
  }, [version]);

  if (error) {
    return (
      <div className="bg-white rounded-3xl p-5 border border-slate-200 text-xs text-slate-500">
        No se pudieron calcular los indicadores del hato en este momento.
      </div>
    );
  }
  if (!ind) return null;

  const indicadores: Indicador[] = [
    {
      titulo: "Preñez",
      valor: ind.porcentajePrenez != null ? `${num(ind.porcentajePrenez, 1)} %` : null,
      detalle: `${ind.prenadas} de ${ind.hembrasReproductivas} vacas y novillas`,
      sinDato: "Registra vacas o novillas",
      ayuda: "Vacas y novillas activas preñadas sobre el total de vacas y novillas.",
    },
    {
      titulo: "Natalidad (12 meses)",
      valor: ind.natalidad12Meses != null ? `${num(ind.natalidad12Meses, 1)} %` : null,
      detalle: `${ind.nacimientos12Meses} nacimientos · ${ind.vacas} vacas`,
      sinDato: "Registra las vacas del hato",
      ayuda: "Crías nacidas en la finca (con su madre registrada) en los últimos 12 meses por cada 100 vacas.",
    },
    {
      titulo: "Intervalo entre partos",
      valor: ind.intervaloEntrePartosDias != null ? `${num(ind.intervaloEntrePartosDias)} días` : null,
      detalle: `${ind.intervalosMedidos} intervalo${ind.intervalosMedidos === 1 ? "" : "s"} medido${ind.intervalosMedidos === 1 ? "" : "s"}`,
      sinDato: "Hace falta registrar dos partos de la misma vaca",
      ayuda: "Días promedio entre partos consecutivos de la misma vaca (a partir de sus crías registradas). Ideal: cerca de 365.",
    },
    {
      titulo: "Días abiertos",
      valor: ind.diasAbiertos != null ? `${num(ind.diasAbiertos)} días` : null,
      detalle: `${ind.diasAbiertosMedidos} vaca${ind.diasAbiertosMedidos === 1 ? "" : "s"} con el dato`,
      sinDato: "Registra el parto y el diagnóstico de preñez con fecha probable de parto",
      ayuda: "Días promedio desde el último parto hasta la nueva concepción (fecha probable de parto menos 283 días).",
    },
    {
      titulo: "Mortalidad (12 meses)",
      valor: ind.mortalidad12Meses != null ? `${num(ind.mortalidad12Meses, 1)} %` : null,
      detalle: `${ind.muertes12Meses} muerte${ind.muertes12Meses === 1 ? "" : "s"} en el año`,
      sinDato: "Sin animales en el hato",
      ayuda: "Muertes registradas en los últimos 12 meses sobre el hato activo más esas muertes.",
    },
    {
      titulo: "Leche por vaca",
      valor: ind.litrosPorVacaDia != null ? `${num(ind.litrosPorVacaDia, 1)} L/día` : null,
      detalle: `${ind.vacasOrdenadas30Dias} vaca${ind.vacasOrdenadas30Dias === 1 ? "" : "s"} ordeñada${ind.vacasOrdenadas30Dias === 1 ? "" : "s"} en 30 días`,
      sinDato: "Registra ordeños por vaca",
      ayuda: "Litros promedio por vaca en cada día de ordeño de los últimos 30 días.",
    },
    {
      titulo: "Ganancia diaria (GDP)",
      valor: ind.gdpPromedioKgDia != null ? `${num(ind.gdpPromedioKgDia, 3)} kg/día` : null,
      detalle: `${ind.animalesConGdp} animal${ind.animalesConGdp === 1 ? "" : "es"} con dos pesajes`,
      sinDato: "Hacen falta dos pesajes por animal",
      ayuda: "Ganancia de peso diaria promedio entre el primer y el último pesaje de cada animal.",
    },
  ];

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4 text-left">
      <div>
        <h3 className="font-['Outfit'] font-black text-lg text-slate-900">Indicadores del hato</h3>
        <p className="text-xs text-slate-500">Reproducción, producción y pérdidas calculadas con lo registrado en la finca.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {indicadores.map(i => (
          <div key={i.titulo} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5" title={i.ayuda}>
            <div className="text-[11px] font-semibold text-slate-500">{i.titulo}</div>
            {i.valor != null ? (
              <>
                <div className="mt-1 text-xl font-black text-slate-900 font-['Outfit'] tabular-nums">{i.valor}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{i.detalle}</div>
              </>
            ) : (
              <>
                <div className="mt-1 text-sm font-semibold text-slate-400">Sin datos aún</div>
                <div className="text-[11px] text-amber-700 mt-0.5">{i.sinDato}</div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
