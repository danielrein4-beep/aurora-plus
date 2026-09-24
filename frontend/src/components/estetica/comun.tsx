import React, { useEffect } from "react";
import { IconClose } from "../../Icons";

export type PaginaEstetica = "general" | "clientas" | "agenda" | "servicios" | "paquetes" | "productos" | "equipo" | "caja";

// Paleta de la vertical: misma estructura que MediClinic, con tono propio (ciruela y rosa).
export const COLOR = {
  sidebar: "#2A1B2E",
  primario: "#9E4A63",
  primarioHover: "#873C54",
  acento: "#E3A6B4",
};

export function mensajeError(e: unknown, porDefecto = "No se pudo completar la operación."): string {
  if (e instanceof Error && e.message) return e.message;
  return porDefecto;
}

export function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function sumarDias(fechaISO: string, dias: number): string {
  const [y, m, d] = fechaISO.split("-").map(Number);
  const f = new Date(y, m - 1, d + dias);
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;
}

export function formatearFecha(fecha?: string | number | null): string {
  if (fecha === null || fecha === undefined || fecha === "") return "—";
  // Fecha y hora (llegan en UTC): se muestra el día local, no el de Greenwich.
  if (typeof fecha === "number" || fecha.length > 10) {
    const f = new Date(fecha);
    if (isNaN(f.getTime())) return String(fecha);
    return f.toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric" });
  }
  const [y, m, d] = fecha.split("-");
  if (!y || !m || !d) return fecha;
  return `${d}/${m}/${y}`;
}

export function formatearHora(fecha?: string | null): string {
  if (!fecha) return "";
  const f = new Date(fecha);
  if (isNaN(f.getTime())) return "";
  return f.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" });
}

export function formatearMonto(monto: number | string | null | undefined, moneda = "USD"): string {
  const n = Number(monto ?? 0);
  const texto = n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (moneda === "USD") return `$${texto}`;
  if (moneda === "VES") return `Bs ${texto}`;
  return `${moneda} ${texto}`;
}

export function enlaceWhatsApp(telefono: string | null | undefined, texto: string): string | null {
  if (!telefono) return null;
  let num = telefono.replace(/\D/g, "");
  if (!num) return null;
  // Números venezolanos escritos localmente (0414...) pasan a formato internacional.
  if (num.startsWith("0")) num = "58" + num.slice(1);
  return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
}

/** Reduce una foto del teléfono a JPEG de 1280 px como máximo: pesa ~10 veces menos y se ve igual. */
export function comprimirImagen(archivo: File, maxLado = 1280, calidad = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!archivo.type.startsWith("image/")) {
      reject(new Error("El archivo no es una imagen."));
      return;
    }
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("No se pudo procesar la imagen."));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", calidad));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };
    img.src = url;
  });
}

// ─── Piezas de interfaz ───────────────────────────────────────────────

export const claseInput =
  "w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#9E4A63]/30 focus:border-[#9E4A63] transition";

export function Campo({ label, children, ayuda, className = "" }: { label: string; children: React.ReactNode; ayuda?: string; className?: string }) {
  return (
    <label className={`block space-y-1 ${className}`}>
      <span className="text-xs font-semibold text-slate-600 dark:text-white/60">{label}</span>
      {children}
      {ayuda && <span className="block text-[11px] text-slate-400">{ayuda}</span>}
    </label>
  );
}

export function Boton({
  children, onClick, tipo = "primario", disabled, type = "button", className = "", title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tipo?: "primario" | "secundario" | "peligro" | "fantasma";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
  title?: string;
}) {
  const estilos = {
    primario: "bg-[#9E4A63] hover:bg-[#873C54] text-white shadow-sm",
    secundario: "bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/80 hover:bg-slate-50 dark:hover:bg-white/10",
    peligro: "bg-white dark:bg-white/5 border border-rose-200 dark:border-rose-500/30 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10",
    fantasma: "text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10",
  }[tipo];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${estilos} ${className}`}
    >
      {children}
    </button>
  );
}

export function Tarjeta({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-white/[0.04] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-[0_1px_3px_rgba(15,23,42,0.04)] ${className}`}>
      {children}
    </div>
  );
}

export function Kpi({ label, valor, sub, color, onClick }: { label: string; valor: string; sub?: string; color: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-white/[0.04] rounded-2xl p-5 border border-slate-200/80 dark:border-white/10 border-l-4 transition ${onClick ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md" : ""}`}
      style={{ borderLeftColor: color }}
    >
      <div className="text-xs text-slate-500 dark:text-white/50">{label}</div>
      <div className="font-['Outfit'] font-black text-2xl text-slate-900 dark:text-white mt-1">{valor}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export function EncabezadoPagina({ titulo, subtitulo, acciones }: { titulo: string; subtitulo?: string; acciones?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h2 className="font-['Outfit'] font-bold text-xl text-slate-900 dark:text-white tracking-tight">{titulo}</h2>
        {subtitulo && <p className="text-sm text-slate-500 dark:text-white/50 mt-0.5">{subtitulo}</p>}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </div>
  );
}

export function Vacio({ titulo, texto, accion }: { titulo: string; texto?: string; accion?: React.ReactNode }) {
  return (
    <div className="text-center py-10 px-4">
      <div className="text-sm font-semibold text-slate-700 dark:text-white/80">{titulo}</div>
      {texto && <div className="text-xs text-slate-500 dark:text-white/50 mt-1 max-w-sm mx-auto">{texto}</div>}
      {accion && <div className="mt-4">{accion}</div>}
    </div>
  );
}

export function Cargando({ texto = "Cargando…" }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500 dark:text-white/50">
      <span className="w-4 h-4 rounded-full border-2 border-[#9E4A63]/30 border-t-[#9E4A63] animate-spin" />
      {texto}
    </div>
  );
}

export function Aviso({ tipo = "error", children, onCerrar }: { tipo?: "error" | "ok" | "info"; children: React.ReactNode; onCerrar?: () => void }) {
  const estilos = {
    error: "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300",
    ok: "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300",
    info: "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300",
  }[tipo];
  return (
    <div className={`flex items-start justify-between gap-3 px-3.5 py-2.5 rounded-xl border text-sm ${estilos}`}>
      <div>{children}</div>
      {onCerrar && (
        <button onClick={onCerrar} className="opacity-60 hover:opacity-100 cursor-pointer" aria-label="Cerrar aviso">
          <IconClose size={14} />
        </button>
      )}
    </div>
  );
}

export function Modal({ titulo, onCerrar, children, ancho = "max-w-lg" }: { titulo: string; onCerrar: () => void; children: React.ReactNode; ancho?: string }) {
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => { if (e.key === "Escape") onCerrar(); };
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, [onCerrar]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onCerrar} />
      <div className={`relative w-full ${ancho} max-h-[92vh] overflow-y-auto bg-white dark:bg-[#1E1422] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 estetica-modal`}>
        <style>{"@keyframes estetica-modal-in{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}.estetica-modal{animation:estetica-modal-in .18s ease-out}"}</style>
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10 bg-white/95 dark:bg-[#1E1422]/95 backdrop-blur">
          <h3 className="font-['Outfit'] font-bold text-base text-slate-900 dark:text-white">{titulo}</h3>
          <button onClick={onCerrar} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer" aria-label="Cerrar">
            <IconClose size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Insignia({ children, color = "slate" }: { children: React.ReactNode; color?: "slate" | "rosa" | "verde" | "ambar" | "rojo" }) {
  const estilos = {
    slate: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/70",
    rosa: "bg-[#9E4A63]/10 text-[#9E4A63] dark:bg-[#E3A6B4]/15 dark:text-[#E3A6B4]",
    verde: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    ambar: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    rojo: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  }[color];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${estilos}`}>{children}</span>;
}
