import React from "react";

// Íconos de trazo con el color del texto (currentColor). Los de Icons.tsx que usan el degradado de
// Aurora necesitan <AuroraGradientDef /> en la página y además saldrían verde azulado, no ciruela.
type P = { size?: number; className?: string };

function Base({ size = 24, className, children }: P & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {children}
    </svg>
  );
}

export const IconoCaja = (p: P) => (
  <Base {...p}><path d="M3 8l9-5 9 5-9 5-9-5z" /><path d="M3 8v9l9 5 9-5V8" /><path d="M12 13v9" /></Base>
);

export const IconoPersona = (p: P) => (
  <Base {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Base>
);

export const IconoPapelera = (p: P) => (
  <Base {...p}><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13" /><path d="M9 7V4h6v3" /></Base>
);

export const IconoAnterior = (p: P) => (
  <Base {...p}><path d="M15 18l-6-6 6-6" /></Base>
);

export const IconoSiguiente = (p: P) => (
  <Base {...p}><path d="M9 18l6-6-6-6" /></Base>
);
