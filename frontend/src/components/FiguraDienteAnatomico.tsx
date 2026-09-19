import React from "react";
import { type EstadoDiente } from "../api";

export type CategoriaDiente = "incisivo" | "canino" | "premolar" | "molar";

export function categorizarDienteFdi(fdi: number): {
  tipo: CategoriaDiente;
  esSuperior: boolean;
  esDerecho: boolean;
  esDeciduo: boolean;
  nombreCorto: string;
} {
  const c = Math.floor(fdi / 10);
  const p = fdi % 10;
  const esSuperior = c === 1 || c === 2 || c === 5 || c === 6;
  const esDerecho = c === 1 || c === 4 || c === 5 || c === 8;
  const esDeciduo = c >= 5;

  let tipo: CategoriaDiente = "molar";
  let nombreCorto = "Molar";

  if (p === 1) {
    tipo = "incisivo";
    nombreCorto = "Inc. Central";
  } else if (p === 2) {
    tipo = "incisivo";
    nombreCorto = "Inc. Lateral";
  } else if (p === 3) {
    tipo = "canino";
    nombreCorto = "Canino";
  } else if (p === 4) {
    if (esDeciduo) {
      tipo = "molar";
      nombreCorto = "1er Molar T.";
    } else {
      tipo = "premolar";
      nombreCorto = "1er Premolar";
    }
  } else if (p === 5) {
    if (esDeciduo) {
      tipo = "molar";
      nombreCorto = "2do Molar T.";
    } else {
      tipo = "premolar";
      nombreCorto = "2do Premolar";
    }
  } else if (p === 6) {
    tipo = "molar";
    nombreCorto = "1er Molar";
  } else if (p === 7) {
    tipo = "molar";
    nombreCorto = "2do Molar";
  } else if (p === 8) {
    tipo = "molar";
    nombreCorto = "Cordal (3er M.)";
  }

  return { tipo, esSuperior, esDerecho, esDeciduo, nombreCorto };
}

interface FiguraDienteAnatomicoProps {
  fdi: number;
  estado: EstadoDiente;
  size?: number;
  className?: string;
}

export default function FiguraDienteAnatomico({
  fdi,
  estado,
  size = 36,
  className = "",
}: FiguraDienteAnatomicoProps) {
  const { tipo, esSuperior } = categorizarDienteFdi(fdi);

  // Colores clínicos según el estado
  const colorBorde =
    estado === "CARIES" ? "#ef4444" :
    estado === "OBTURADO" ? "#0ea5e9" :
    estado === "CORONA" ? "#eab308" :
    estado === "ENDODONCIA" ? "#a855f7" :
    estado === "EXTRACCION_INDICADA" ? "#f97316" :
    estado === "IMPLANTE" ? "#14b8a6" :
    estado === "AUSENTE" ? "#94a3b8" :
    "#64748b"; // Sano: contorno anatomico neutro

  const rellenoEsmalte =
    estado === "AUSENTE" ? "transparent" :
    estado === "CORONA" ? "#fef3c7" : // Fondo dorado suave
    "currentColor";

  const strokeWidth = estado === "AUSENTE" ? 1.2 : 1.75;
  const strokeDash = estado === "AUSENTE" ? "3 3" : undefined;

  // Calculamos ancho y alto proporcionales (ancho base 32, alto base 44)
  const width = size;
  const height = Math.round(size * 1.375);

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 32 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 1. IMPLANTE: Se dibuja el tornillo de titanio en vez de la raíz */}
      {estado === "IMPLANTE" ? (
        <g stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round">
          {esSuperior ? (
            <>
              {/* Tornillo superior */}
              <line x1="16" y1="4" x2="16" y2="20" strokeWidth="2.5" />
              <line x1="11" y1="7" x2="21" y2="7" />
              <line x1="12" y1="11" x2="20" y2="11" />
              <line x1="13" y1="15" x2="19" y2="15" />
              <line x1="14" y1="19" x2="18" y2="19" />
              <circle cx="16" cy="4" r="2" fill="#14b8a6" />
            </>
          ) : (
            <>
              {/* Tornillo inferior */}
              <line x1="16" y1="24" x2="16" y2="40" strokeWidth="2.5" />
              <line x1="14" y1="25" x2="18" y2="25" />
              <line x1="13" y1="29" x2="19" y2="29" />
              <line x1="12" y1="33" x2="20" y2="33" />
              <line x1="11" y1="37" x2="21" y2="37" />
              <circle cx="16" cy="40" r="2" fill="#14b8a6" />
            </>
          )}
        </g>
      ) : null}

      {/* 2. RAÍCES ANATÓMICAS (Si no es implante) */}
      {estado !== "IMPLANTE" && (
        <g
          stroke={colorBorde}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDash}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={estado === "AUSENTE" ? "none" : "#f1f5f9"}
          opacity={estado === "AUSENTE" ? 0.4 : 1}
        >
          {/* INCISIVO */}
          {tipo === "incisivo" && (
            esSuperior ? (
              // Raíz superior simple y cónica
              <path d="M 12 21 C 13 12, 14 5, 16 3 C 18 5, 19 12, 20 21" />
            ) : (
              // Raíz inferior simple fina
              <path d="M 13 23 C 14 30, 15 37, 16 41 C 17 37, 18 30, 19 23" />
            )
          )}

          {/* CANINO */}
          {tipo === "canino" && (
            esSuperior ? (
              // Raíz superior canina (más potente y larga)
              <path d="M 10 20 C 12 10, 14 3, 16 2 C 18 3, 20 10, 22 20" />
            ) : (
              // Raíz inferior canina
              <path d="M 11 24 C 13 32, 14 39, 16 42 C 18 39, 19 32, 21 24" />
            )
          )}

          {/* PREMOLAR */}
          {tipo === "premolar" && (
            esSuperior ? (
              // Raíz superior premolar bífida
              <path d="M 9 20 C 10 12, 11 5, 13 3 C 14 7, 15 13, 16 16 C 17 13, 18 7, 19 3 C 21 5, 22 12, 23 20" />
            ) : (
              // Raíz inferior premolar
              <path d="M 10 24 C 11 31, 13 37, 16 41 C 19 37, 21 31, 22 24" />
            )
          )}

          {/* MOLAR */}
          {tipo === "molar" && (
            esSuperior ? (
              // Raíz superior molar con trifurcación / 3 ápices
              <path d="M 7 21 C 7 13, 8 6, 9 3 C 11 7, 12 13, 16 15 C 20 13, 21 7, 23 3 C 24 6, 25 13, 25 21" />
            ) : (
              // Raíz inferior molar con 2 raíces divergentes y horquilla central
              <path d="M 7 23 C 8 30, 9 36, 10 41 C 12 37, 14 31, 16 27 C 18 31, 20 37, 22 41 C 23 36, 24 30, 25 23" />
            )
          )}
        </g>
      )}

      {/* 3. CONDUCTO DE ENDODONCIA (Guta-percha púrpura en el interior de la raíz) */}
      {estado === "ENDODONCIA" && (
        <g stroke="#a855f7" strokeWidth="2" strokeLinecap="round">
          {esSuperior ? (
            <line x1="16" y1="5" x2="16" y2="20" />
          ) : (
            <line x1="16" y1="24" x2="16" y2="39" />
          )}
        </g>
      )}

      {/* 4. CORONA ANATÓMICA (Diferenciada según tipo de diente) */}
      <g
        stroke={colorBorde}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDash}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={estado === "CORONA" ? "#fef08a" : estado === "AUSENTE" ? "none" : "#ffffff"}
      >
        {/* INCISIVO */}
        {tipo === "incisivo" && (
          esSuperior ? (
            // Corona incisiva superior (borde incisal recto abajo)
            <path d="M 12 21 C 9 24, 8 32, 8 39 C 10 41, 22 41, 24 39 C 24 32, 23 24, 20 21 Z" />
          ) : (
            // Corona incisiva inferior (borde incisal recto arriba)
            <path d="M 8 5 C 10 3, 22 3, 24 5 C 24 12, 23 20, 19 23 C 16 24, 15 24, 13 23 C 9 20, 8 12, 8 5 Z" />
          )
        )}

        {/* CANINO */}
        {tipo === "canino" && (
          esSuperior ? (
            // Corona canina superior (cúspide puntiaguda abajo)
            <path d="M 10 20 C 7 24, 7 32, 10 36 L 16 42 L 22 36 C 25 32, 25 24, 22 20 Z" />
          ) : (
            // Corona canina inferior (cúspide puntiaguda arriba)
            <path d="M 16 2 L 10 8 C 7 12, 7 20, 11 24 C 13 25, 19 25, 21 24 C 25 20, 25 12, 22 8 Z" />
          )
        )}

        {/* PREMOLAR */}
        {tipo === "premolar" && (
          esSuperior ? (
            // Corona premolar superior (bicúspide redondeada abajo)
            <path d="M 9 20 C 6 24, 6 34, 10 39 C 13 41, 19 41, 22 39 C 26 34, 26 24, 23 20 Z" />
          ) : (
            // Corona premolar inferior (bicúspide redondeada arriba)
            <path d="M 10 5 C 13 3, 19 3, 22 5 C 26 10, 26 20, 22 24 C 19 25, 13 25, 10 24 C 6 20, 6 10, 10 5 Z" />
          )
        )}

        {/* MOLAR */}
        {tipo === "molar" && (
          esSuperior ? (
            // Corona molar superior (ancha con fisuras oclusales abajo)
            <>
              <path d="M 7 21 C 4 25, 4 35, 7 40 C 11 42, 21 42, 25 40 C 28 35, 28 25, 25 21 Z" />
              <path d="M 11 38 Q 16 36 21 38" strokeWidth="1" strokeOpacity="0.6" />
            </>
          ) : (
            // Corona molar inferior (ancha con fisuras oclusales arriba)
            <>
              <path d="M 7 4 C 11 2, 21 2, 25 4 C 28 9, 28 19, 25 23 C 21 24, 11 24, 7 23 C 4 19, 4 9, 7 4 Z" />
              <path d="M 11 6 Q 16 8 21 6" strokeWidth="1" strokeOpacity="0.6" />
            </>
          )
        )}
      </g>

      {/* 5. PATOLOGÍAS ESPECÍFICAS VISIBLES EN LA CORONA */}
      {/* Caries: Mancha roja en la corona */}
      {estado === "CARIES" && (
        <circle
          cx="16"
          cy={esSuperior ? 33 : 11}
          r="4"
          fill="#ef4444"
          stroke="#991b1b"
          strokeWidth="0.8"
        />
      )}

      {/* Obturación: Resina azul cielo en la superficie */}
      {estado === "OBTURADO" && (
        <rect
          x="12"
          y={esSuperior ? 30 : 8}
          width="8"
          height="6"
          rx="2"
          fill="#0ea5e9"
          stroke="#0284c7"
          strokeWidth="0.8"
        />
      )}

      {/* Extracción indicada: Flecha o aspa naranja */}
      {estado === "EXTRACCION_INDICADA" && (
        <g stroke="#f97316" strokeWidth="2" strokeLinecap="round">
          <line x1="9" y1={esSuperior ? 27 : 5} x2="23" y2={esSuperior ? 37 : 19} />
          <line x1="23" y1={esSuperior ? 27 : 5} x2="9" y2={esSuperior ? 37 : 19} />
        </g>
      )}

      {/* Ausente: Aspa gris completa */}
      {estado === "AUSENTE" && (
        <g stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" opacity="0.6">
          <line x1="8" y1="8" x2="24" y2="36" />
          <line x1="24" y1="8" x2="8" y2="36" />
        </g>
      )}

      {/* Corona Protésica: Decoración de corona dorada sobrepuesta */}
      {estado === "CORONA" && (
        <path
          d={
            esSuperior
              ? "M 11 27 L 13 32 L 16 28 L 19 32 L 21 27 L 21 37 L 11 37 Z"
              : "M 11 17 L 13 12 L 16 16 L 19 12 L 21 17 L 21 7 L 11 7 Z"
          }
          fill="#eab308"
          stroke="#ca8a04"
          strokeWidth="0.75"
        />
      )}
    </svg>
  );
}
