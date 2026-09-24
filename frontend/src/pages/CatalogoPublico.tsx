import { avisar } from "../avisos";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import jsPDF from "jspdf";

// Iconos nativos SVG de alto rendimiento y cero dependencias
function SvgBag({ className = "w-5 h-5", style, strokeWidth = 1.8 }: { className?: string; style?: React.CSSProperties; strokeWidth?: number }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  );
}

function SvgSearch({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function SvgClose({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function SvgCheck({ className = "w-3 h-3", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function SvgCheckCircle({ className = "w-8 h-8", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function SvgDownload({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-6l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function SvgUpload({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}

function SvgPlus({ className = "w-3.5 h-3.5", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function SvgMinus({ className = "w-3.5 h-3.5", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
    </svg>
  );
}

function SvgTrash({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function SvgStore({ className = "w-5 h-5", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h18v4a3 3 0 01-3 3 3 3 0 01-3-3 3 3 0 01-3 3 3 3 0 01-3-3 3 3 0 01-3 3 3 3 0 01-3-3V3zm1 7v10a1 1 0 001 1h14a1 1 0 001-1V10" />
    </svg>
  );
}

function SvgTruck({ className = "w-5 h-5", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zm11 0a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10h10zm0 0h5l3 3v2h-8v-5z" />
    </svg>
  );
}

function SvgWhatsApp({ className = "w-5 h-5", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12.031 2c-5.522 0-9.998 4.476-9.998 9.998 0 1.764.46 3.486 1.332 5.006l-1.417 5.176 5.305-1.391a9.948 9.948 0 004.778 1.209h.004c5.52 0 9.997-4.476 9.997-9.998 0-2.67-1.04-5.18-2.929-7.07A9.924 9.924 0 0012.031 2zm0 18.292c-1.498 0-2.966-.402-4.246-1.163l-.305-.181-3.153.827.842-3.076-.198-.315a8.27 8.27 0 01-1.268-4.386c0-4.59 3.736-8.326 8.328-8.326 2.224 0 4.316.866 5.889 2.439a8.267 8.267 0 012.441 5.889c0 4.59-3.737 8.326-8.33 8.326zm4.566-6.233c-.25-.125-1.479-.73-1.708-.813-.23-.083-.396-.125-.563.125-.166.25-.646.813-.792.979-.146.167-.292.188-.542.063s-1.057-.39-2.014-1.244c-.744-.664-1.246-1.484-1.392-1.734-.146-.25-.016-.385.109-.51.112-.112.25-.292.375-.438.125-.146.167-.25.25-.417.083-.167.042-.313-.021-.438s-.563-1.354-.771-1.854c-.203-.488-.41-.422-.563-.43-.146-.008-.313-.01-.479-.01s-.438.063-.667.313c-.229.25-.875.854-.875 2.083s.896 2.417 1.021 2.583c.125.167 1.764 2.694 4.274 3.777.597.258 1.064.412 1.428.528.6.191 1.146.164 1.578.1.481-.072 1.479-.604 1.688-1.188.208-.583.208-1.083.146-1.188-.063-.104-.229-.167-.479-.292z" />
    </svg>
  );
}

function SvgSparkles({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.286L13 21l-2.286-6.857L5 12l5.714-2.286L13 3z" />
    </svg>
  );
}

function SvgCopy({ className = "w-3.5 h-3.5", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

/* =========================================================================
   ILUSTRACIONES VECTORIALES EXCLUSIVAS PARA CADA PRODUCTO (CERO REPETICION)
   ========================================================================= */

// Silueta genérica de caja/producto — usada cuando un producto no tiene foto
// Y no coincide con ninguna ilustración de la muestra de lujo (ej. un negocio
// real de ferretería o calzado, no la demo de perfumería). Antes el "default"
// caía en el frasco de Baccarat Rouge 540, que no tiene ningún sentido fuera
// de esa muestra.
function VisualProductoGenerico({ className = "w-24 h-24" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 8L12 3L3 8M21 8L12 13M21 8V16L12 21M3 8L12 13M3 8V16L12 21M12 13V21" stroke="#A3A3A3" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 1. Frasco de Baccarat Rouge 540 (Cristal rubí y tapón ámbar/dorado)
function VisualBaccaratRouge({ className = "w-28 h-40" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 170" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="36" y="8" width="48" height="24" rx="3" fill="#D4AF37" stroke="#997A15" strokeWidth="1.5" />
      <rect x="42" y="2" width="36" height="8" rx="2" fill="#E6CA65" />
      <rect x="52" y="32" width="16" height="12" fill="#C5A028" />
      <rect x="18" y="44" width="84" height="116" rx="14" fill="#8B1824" stroke="#660E18" strokeWidth="2" />
      <rect x="24" y="50" width="72" height="104" rx="10" fill="#A82030" />
      <path d="M28 54L38 144" stroke="#E55B6E" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
      <rect x="32" y="78" width="56" height="48" rx="4" fill="#F4E8C1" stroke="#D4AF37" strokeWidth="1" />
      <rect x="36" y="82" width="48" height="40" fill="#FAF6E8" />
      <text x="60" y="98" textAnchor="middle" fill="#8B1824" fontSize="6.5" fontFamily="serif" fontWeight="bold" letterSpacing="0.5">
        BACCARAT
      </text>
      <text x="60" y="108" textAnchor="middle" fill="#111" fontSize="8" fontFamily="sans-serif" fontWeight="900" letterSpacing="1">
        540
      </text>
      <text x="60" y="116" textAnchor="middle" fill="#666" fontSize="4.5" fontFamily="sans-serif" letterSpacing="0.5">
        EXTRAIT DE PARFUM
      </text>
      <ellipse cx="60" cy="164" rx="42" ry="4" fill="#000" opacity="0.1" />
    </svg>
  );
}

// 2. Frasco Monolítico Tom Ford Oud Wood (Ahumado carbón oscuro y placa plateada)
function VisualTomFordOud({ className = "w-28 h-40" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 170" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="38" y="6" width="44" height="28" rx="2" fill="#1F2421" stroke="#111" strokeWidth="1.5" />
      <rect x="34" y="2" width="52" height="6" rx="1" fill="#2E3530" />
      <rect x="53" y="34" width="14" height="10" fill="#999" />
      <rect x="22" y="44" width="76" height="116" rx="4" fill="#1A1D1A" stroke="#0D0E0D" strokeWidth="2" />
      <rect x="27" y="49" width="66" height="106" rx="2" fill="#242924" />
      <path d="M30 52L30 150" stroke="#4B554E" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <rect x="34" y="80" width="52" height="38" rx="2" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1" />
      <text x="60" y="93" textAnchor="middle" fill="#0F172A" fontSize="6.5" fontFamily="sans-serif" fontWeight="900" letterSpacing="0.8">
        TOM FORD
      </text>
      <text x="60" y="103" textAnchor="middle" fill="#334155" fontSize="6" fontFamily="sans-serif" fontWeight="bold" letterSpacing="0.5">
        OUD WOOD
      </text>
      <text x="60" y="111" textAnchor="middle" fill="#64748B" fontSize="4" fontFamily="sans-serif" letterSpacing="0.3">
        EAU DE PARFUM
      </text>
      <ellipse cx="60" cy="164" rx="38" ry="4" fill="#000" opacity="0.12" />
    </svg>
  );
}

// 3. Frasco Botica Le Labo Santal 33 (Vidrio transparente y etiqueta artesanal)
function VisualLeLaboSantal({ className = "w-28 h-40" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 170" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="44" y="8" width="32" height="26" rx="3" fill="#64748B" stroke="#475569" strokeWidth="1" />
      <rect x="52" y="34" width="16" height="10" fill="#94A3B8" />
      <path
        d="M26 62C26 52 34 44 44 44H76C86 44 94 52 94 62V150C94 156 89 160 83 160H37C31 160 26 156 26 150V62Z"
        fill="#F8FAFC"
        stroke="#CBD5E1"
        strokeWidth="2"
      />
      <rect x="30" y="60" width="60" height="96" rx="4" fill="#F1F5F9" opacity="0.7" />
      <rect x="30" y="75" width="60" height="60" fill="#FFFDF8" stroke="#E2E8F0" strokeWidth="1" />
      <text x="60" y="90" textAnchor="middle" fill="#0F172A" fontSize="7" fontFamily="monospace" fontWeight="bold" letterSpacing="0.5">
        LE LABO
      </text>
      <text x="60" y="103" textAnchor="middle" fill="#0F172A" fontSize="8.5" fontFamily="monospace" fontWeight="900" letterSpacing="0.8">
        SANTAL 33
      </text>
      <text x="60" y="113" textAnchor="middle" fill="#64748B" fontSize="4.5" fontFamily="monospace">
        100ml 3.4 FL.OZ.
      </text>
      <text x="60" y="123" textAnchor="middle" fill="#94A3B8" fontSize="4" fontFamily="monospace">
        LABORATORY CRAFT
      </text>
      <ellipse cx="60" cy="164" rx="36" ry="4" fill="#000" opacity="0.08" />
    </svg>
  );
}

// 4. Frasco Imperial Creed Aventus (Hombros plateados y cuerpo texturizado)
function VisualCreedAventus({ className = "w-28 h-40" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 170" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="42" y="6" width="36" height="24" rx="4" fill="#1E293B" stroke="#0F172A" strokeWidth="1.5" />
      <circle cx="60" cy="18" r="4" fill="#E2E8F0" />
      <path
        d="M20 62C20 48 30 40 46 40H74C90 40 100 48 100 62V152C100 158 95 162 89 162H31C25 162 20 158 20 152V62Z"
        fill="#0F172A"
        stroke="#020617"
        strokeWidth="2"
      />
      <path
        d="M21 60C21 48 30 41 46 41H74C90 41 99 48 99 60V84H21V60Z"
        fill="#E2E8F0"
        stroke="#94A3B8"
        strokeWidth="1"
      />
      <rect x="30" y="98" width="60" height="38" rx="2" fill="#1E293B" stroke="#475569" strokeWidth="1" />
      <text x="60" y="112" textAnchor="middle" fill="#F8FAFC" fontSize="7" fontFamily="serif" fontWeight="bold" letterSpacing="1">
        CREED
      </text>
      <text x="60" y="123" textAnchor="middle" fill="#E2E8F0" fontSize="7.5" fontFamily="serif" fontWeight="900" letterSpacing="1">
        AVENTUS
      </text>
      <ellipse cx="60" cy="165" rx="40" ry="4" fill="#000" opacity="0.14" />
    </svg>
  );
}

// 5. Frasco de Porcelana Kilian Paris Love (Blanco inmaculado con placa dorada)
function VisualKilianLove({ className = "w-28 h-40" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 170" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="42" y="8" width="36" height="24" rx="2" fill="#D4AF37" stroke="#A17B1B" strokeWidth="1.5" />
      <rect x="52" y="32" width="16" height="12" fill="#B8942A" />
      <rect x="24" y="44" width="72" height="116" rx="8" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
      <path d="M27 48V156" stroke="#F1F5F9" strokeWidth="3" />
      <path d="M93 48V156" stroke="#F1F5F9" strokeWidth="3" />
      <rect x="34" y="78" width="52" height="48" rx="3" fill="#FAF6E8" stroke="#D4AF37" strokeWidth="1.2" />
      <text x="60" y="95" textAnchor="middle" fill="#1E293B" fontSize="6.5" fontFamily="serif" letterSpacing="0.8">
        KILIAN PARIS
      </text>
      <text x="60" y="106" textAnchor="middle" fill="#991B1B" fontSize="7.5" fontFamily="serif" fontWeight="bold">
        LOVE
      </text>
      <text x="60" y="115" textAnchor="middle" fill="#64748B" fontSize="4.5" fontFamily="sans-serif">
        DON'T BE SHY
      </text>
      <ellipse cx="60" cy="164" rx="36" ry="4" fill="#000" opacity="0.08" />
    </svg>
  );
}

// 6. Sneaker Escultórico Chunky Balenciaga Triple S
function VisualBalenciagaTripleS({ className = "w-44 h-28" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M20 74C20 74 38 68 60 62C82 56 108 34 136 34C156 34 172 44 182 58C188 66 190 74 186 78C176 86 160 84 140 84C108 84 80 88 56 88C36 88 20 84 20 74Z"
        fill="#E2E8F0"
        stroke="#94A3B8"
        strokeWidth="2"
      />
      <path
        d="M24 78C38 78 72 82 108 80C144 78 176 80 186 76C186 86 166 94 134 94C94 94 56 94 28 92C18 90 18 84 24 78Z"
        fill="#CBD5E1"
        stroke="#94A3B8"
        strokeWidth="1.5"
      />
      <path
        d="M18 88C32 88 70 94 112 92C154 90 182 92 192 86C190 98 168 104 128 104C80 104 40 102 14 98C10 94 12 90 18 88Z"
        fill="#0F172A"
      />
      <path
        d="M92 48L114 66M110 44L128 62M128 42L142 58"
        stroke="#0F172A"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <rect x="144" y="60" width="18" height="8" rx="2" fill="#0F172A" />
      <text x="153" y="66" textAnchor="middle" fill="#FFF" fontSize="4.5" fontFamily="sans-serif" fontWeight="bold">
        42
      </text>
      <ellipse cx="106" cy="106" rx="84" ry="4" fill="#000" opacity="0.12" />
    </svg>
  );
}

// 7. Zapato Derby Formal en Cuero Spazzolato Prada
function VisualPradaDerby({ className = "w-44 h-28" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M26 68C26 68 44 64 68 58C92 52 116 38 136 38C152 38 166 46 178 58C186 66 188 74 182 78C168 84 148 82 120 82C84 82 56 84 32 84C22 84 22 74 26 68Z"
        fill="#0A0A0A"
        stroke="#000000"
        strokeWidth="2"
      />
      <path d="M50 56C72 48 114 38 138 46" stroke="#404040" strokeWidth="2.5" strokeLinecap="round" />
      <path
        d="M18 78C30 78 70 82 114 82C158 82 182 80 188 76C188 84 172 90 144 90C108 90 60 90 24 88C16 86 14 82 18 78Z"
        fill="#171717"
      />
      <rect x="18" y="86" width="34" height="12" rx="2" fill="#000000" />
      <path d="M102 50L112 62M112 48L122 60M122 46L130 58" stroke="#525252" strokeWidth="1.8" strokeLinecap="round" />
      <ellipse cx="106" cy="98" rx="82" ry="4" fill="#000" opacity="0.14" />
    </svg>
  );
}

// 8. Bota Acordonada Alexander McQueen Tread Slick
function VisualMcQueenBoot({ className = "w-44 h-32" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 130" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M50 20H86C92 20 96 24 96 30V62C122 62 152 68 168 80C176 86 176 94 168 98C148 104 116 102 86 102C58 102 44 100 42 90L42 28C42 24 46 20 50 20Z"
        fill="#111827"
        stroke="#030712"
        strokeWidth="2"
      />
      <path d="M96 32V64" stroke="#D1D5DB" strokeWidth="2.5" strokeDasharray="3 3" />
      <path
        d="M36 94C56 94 108 98 148 98C172 98 182 92 184 88C184 102 164 114 128 114C80 114 46 112 28 106C22 100 26 94 36 94Z"
        fill="#FFFFFF"
        stroke="#E5E7EB"
        strokeWidth="2"
      />
      <rect x="28" y="104" width="154" height="8" rx="2" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="1" />
      <path d="M38 112L42 120M62 112L66 120M86 112L90 120M110 112L114 120M134 112L138 120M158 112L162 120" stroke="#9CA3AF" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="106" cy="124" rx="80" ry="4" fill="#000" opacity="0.12" />
    </svg>
  );
}

/** Una variante real de inventario (su propio SKU/stock) dentro de un producto agrupado — ver CatalogoPublicoController.construirTarjetaAgrupada. */
interface VarianteCatalogo {
  id: string; // "rep-N" real, vendible — nunca el id sintético "grp-..." de la tarjeta
  atributo: string; // talla/modelo
  color?: string | null;
  precioUsd: number;
  precioBs: number;
  precioCop?: number | null; // solo viene si el dueño configuró una tasa USD->COP
  precioSinIvaUsd?: number;
  stock: number;
  imagenUrl?: string | null; // foto propia de ESTA variante (ej. el mismo zapato en otro color) — si no tiene, se usa la de la tarjeta
}

interface ProductoCatalogo {
  id: string;
  codigo: string;
  oem?: string;
  nombre: string;
  categoria: string;
  marca?: string;
  precioUsd: number;
  precioBs: number;
  precioCop?: number | null;
  /** precioUsd es siempre lo que paga el cliente; este es sin IVA, para mostrar "+ IVA". */
  precioSinIvaUsd?: number;
  exentoIva?: boolean;
  stock: number;
  unidad?: string;
  descripcion?: string;
  tallas?: string[];
  imagenUrl?: string;
  tipoVisual?: string;
  esNuevo?: boolean;
  variantes?: VarianteCatalogo[]; // producto real con variantes (color/talla) — ver id "grp-..."
}

interface DatosTienda {
  tenantId: number;
  nombreTienda: string;
  moduloPrincipal?: string;
  slogan?: string;
  telefonoWhatsapp?: string;
  emailContacto?: string;
  logoBase64?: string;
  colorAcentoTienda?: string | null;
  bannerBase64?: string | null;
  estiloBannerTienda?: string | null;
  tasaVes: number;
  monedaBase?: string; // "EUR" = negocio solo en euros: sin Bs, COP ni tasas
  tasaCop?: number | null;
  domicilioFiscal?: string;
  costoEnvioDelivery?: number;
  impuestos?: {
    cobraIva: boolean;
    alicuotaIva: number;
    catalogoPrecioConIva: boolean;
    igtfActivo: boolean;
    alicuotaIgtf: number;
  };
  pagoMovil?: {
    activo: boolean;
    banco: string;
    telefono: string;
    documento: string;
    titular: string;
  };
  zelle?: {
    activo: boolean;
    correo: string;
    titular: string;
  };
  binance?: {
    activo: boolean;
    payId: string;
  };
  bancolombia?: {
    activo: boolean;
    cuenta: string;
    tipoCuenta: string;
    titular: string;
    documento: string;
  };
  productos: ProductoCatalogo[];
}

interface ItemCarrito {
  producto: ProductoCatalogo;
  tallaSeleccionada: string;
  cantidad: number;
}

// Catalogo exclusivo de Alta Gama: Perfumería de Nicho y Calzado de Diseñador
const PRODUCTOS_MUESTRA_ALTA_GAMA: Omit<ProductoCatalogo, "precioBs">[] = [
  {
    id: "demo-lux-01",
    codigo: "MFK-540",
    nombre: "Baccarat Rouge 540",
    marca: "MAISON FRANCIS KURKDJIAN",
    categoria: "PERFUMES",
    precioUsd: 425.00,
    stock: 9,
    unidad: "Frasco",
    esNuevo: true,
    tipoVisual: "baccarat",
    tallas: ["70ml Extrait", "200ml Flacon", "Travel Set 3x11ml"],
    descripcion: "El aura luminosa y ambarada más aclamada del mundo: jazmín grandiflorum de Egipto, madera de cedro de Virginia y acordes minerales de ámbar gris."
  },
  {
    id: "demo-lux-02",
    codigo: "BAL-3S",
    nombre: "Triple S Clear Sole",
    marca: "BALENCIAGA",
    categoria: "CALZADO",
    precioUsd: 1050.00,
    stock: 6,
    unidad: "Par",
    esNuevo: true,
    tipoVisual: "balenciaga",
    tallas: ["EU 40 (US 7)", "EU 41 (US 8)", "EU 42 (US 9)", "EU 43 (US 10)", "EU 44 (US 11)"],
    descripcion: "Sneaker de silueta escultórica oversize con triple suela de amortiguación transparente, malla técnica respirable y cuero nobuk lavado a mano."
  },
  {
    id: "demo-lux-03",
    codigo: "TF-OUD",
    nombre: "Oud Wood Private Blend",
    marca: "TOM FORD",
    categoria: "PERFUMES",
    precioUsd: 395.00,
    stock: 11,
    unidad: "Frasco",
    esNuevo: false,
    tipoVisual: "tomford",
    tallas: ["50ml EDP", "100ml EDP", "250ml Decanter"],
    descripcion: "Una composición exótica de madera de oud de primera selección, sándalo oriental, cardamomo y haba tonka ahumada en frasco arquitectónico monolítico."
  },
  {
    id: "demo-lux-04",
    codigo: "PRD-DRB",
    nombre: "Derby en Cuero Spazzolato",
    marca: "PRADA",
    categoria: "CALZADO",
    precioUsd: 980.00,
    stock: 7,
    unidad: "Par",
    esNuevo: false,
    tipoVisual: "prada",
    tallas: ["EU 40", "EU 41", "EU 42", "EU 43", "EU 44"],
    descripcion: "Zapato de vestir italiano en cuero spazzolato de brillo espejo, ribete cosido a mano y suela monobloque microcelular de máxima ligereza y elegancia."
  },
  {
    id: "demo-lux-05",
    codigo: "CRD-AVN",
    nombre: "Aventus Millésime",
    marca: "CREED",
    categoria: "PERFUMES",
    precioUsd: 495.00,
    stock: 5,
    unidad: "Frasco",
    esNuevo: true,
    tipoVisual: "creed",
    tallas: ["50ml Millésime", "100ml Millésime", "Splash 250ml"],
    descripcion: "La creación maestra de la casa real Creed: bergamota de Calabria, manzana francesa crujiente, abedul de Luisiana y musgo de roble en frasco con hombros plateados."
  },
  {
    id: "demo-lux-06",
    codigo: "MCQ-TRD",
    nombre: "Tread Slick Lace-Up Boot",
    marca: "ALEXANDER MCQUEEN",
    categoria: "CALZADO",
    precioUsd: 820.00,
    stock: 8,
    unidad: "Par",
    esNuevo: false,
    tipoVisual: "mcqueen",
    tallas: ["EU 40", "EU 41", "EU 42", "EU 43", "EU 44"],
    descripcion: "Bota acordonada en lona de algodón reforzada con suela dentada de goma oversize tonal y cinta posterior tejida con la firma en jacquard."
  },
  {
    id: "demo-lux-07",
    codigo: "LLB-S33",
    nombre: "Santal 33 Eau de Parfum",
    marca: "LE LABO",
    categoria: "PERFUMES",
    precioUsd: 320.00,
    stock: 14,
    unidad: "Frasco",
    esNuevo: false,
    tipoVisual: "lelabo",
    tallas: ["50ml", "100ml", "Edición Personalizada"],
    descripcion: "La esencia del espíritu independiente: cardamomo, iris, violeta y ambrox que chisporrotean sobre una base cálida de cuero y cedro ahumado."
  },
  {
    id: "demo-lux-08",
    codigo: "KLN-LV",
    nombre: "Love, Don't Be Shy",
    marca: "KILIAN PARIS",
    categoria: "PERFUMES",
    precioUsd: 310.00,
    stock: 6,
    unidad: "Frasco",
    esNuevo: true,
    tipoVisual: "kilian",
    tallas: ["50ml Recargable", "Carafe 250ml"],
    descripcion: "Un manjar olfativo de alta costura: flor de azahar suculenta, madreselva, jazmín y un fondo irresistible de nube de azúcar y malvavisco."
  }
];

const METODO_PAGO_LABELS: Record<string, string> = {
  PAGO_MOVIL: "Pago Móvil",
  BINANCE: "Binance Pay (USDT)",
  ZELLE: "Zelle",
  BANCOLOMBIA: "Bancolombia",
  EFECTIVO_USD: "Efectivo Divisas (USD)",
  EFECTIVO_BS: "Efectivo Bolívares",
  TRANSFERENCIA: "Transferencia Bancaria",
};

/** Comprobante de pedido en PDF — logo del negocio, datos del cliente, renglones,
 *  método de pago y totales. Mismo patrón que generarNotaEntregaPDF en ComercioApp,
 *  pero pensado para el cliente final (quien pide desde el catálogo público), no
 *  para el dueño del negocio. */
function generarComprobantePedidoPDF(
  pedido: {
    numeroPedido: string;
    items: { nombre: string; codigo: string; cantidad: number; precioUnitarioUsd: number }[];
    totalUsd: number;
    totalBs: number;
    tasaCambio: number;
    clienteNombre: string;
    clienteTelefono: string;
    tipoEntrega: "DELIVERY" | "PICKUP";
    direccionEntrega: string;
    metodoPago: string;
    numeroReferencia: string;
    fecha: string;
  },
  nombreTienda: string,
  logoBase64?: string | null
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const margin = 14;
  const colRight = W - margin;
  let y = 18;

  // ─── Encabezado: logo (si tiene) + nombre de la tienda ────────────────
  if (logoBase64 && logoBase64.startsWith("data:image")) {
    try {
      doc.addImage(logoBase64, margin, y - 10, 18, 18, undefined, "FAST");
    } catch {
      // Un logo corrupto/formato no soportado por jsPDF no debe tumbar la
      // generación del comprobante — se sigue sin logo.
    }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text(nombreTienda, margin + (logoBase64 ? 22 : 0), y);

  const ndX = W - 72;
  doc.setDrawColor(23, 23, 23);
  doc.setLineWidth(0.6);
  doc.rect(ndX, y - 8, 58, 22, "S");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(23, 23, 23);
  doc.text("COMPROBANTE DE PEDIDO", ndX + 29, y - 2, { align: "center" });
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text(`N°: ${pedido.numeroPedido}`, ndX + 29, y + 4, { align: "center" });
  doc.text(pedido.fecha, ndX + 29, y + 9, { align: "center" });

  y += 20;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, colRight, y);
  y += 7;

  // ─── Datos del cliente y entrega ───────────────────────────────────
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 20);
  doc.text("CLIENTE:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(pedido.clienteNombre || "-", margin + 22, y);
  doc.setFont("helvetica", "bold");
  doc.text("TEL:", margin + 110, y);
  doc.setFont("helvetica", "normal");
  doc.text(pedido.clienteTelefono || "-", margin + 122, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("ENTREGA:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(pedido.tipoEntrega === "DELIVERY" ? "Delivery" : "Retiro en tienda", margin + 22, y);
  if (pedido.tipoEntrega === "DELIVERY" && pedido.direccionEntrega) {
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.text("DIRECCIÓN:", margin, y);
    doc.setFont("helvetica", "normal");
    const direccionLineas = doc.splitTextToSize(pedido.direccionEntrega, 150);
    doc.text(direccionLineas, margin + 24, y);
    y += (direccionLineas.length - 1) * 5;
  }
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("MÉTODO DE PAGO:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(METODO_PAGO_LABELS[pedido.metodoPago] || pedido.metodoPago, margin + 34, y);
  if (pedido.numeroReferencia) {
    doc.setFont("helvetica", "bold");
    doc.text("REF:", margin + 110, y);
    doc.setFont("helvetica", "normal");
    doc.text(pedido.numeroReferencia, margin + 122, y);
  }
  y += 8;

  // ─── Tabla de renglones ─────────────────────────────────────────────
  doc.setFillColor(245, 245, 247);
  doc.rect(margin, y - 4, colRight - margin, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(23, 23, 23);
  doc.text("Cant.", margin + 2, y);
  doc.text("Código", margin + 16, y);
  doc.text("Producto", margin + 45, y);
  doc.text(`P. Unit. (${COD})`, margin + 130, y, { align: "right" });
  doc.text(`Subtotal ${COD}`, colRight - 2, y, { align: "right" });
  y += 3;
  doc.setDrawColor(210, 210, 210);
  doc.line(margin, y, colRight, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(8);
  pedido.items.forEach((item) => {
    const subtotal = item.precioUnitarioUsd * item.cantidad;
    const nombre = item.nombre.length > 45 ? item.nombre.substring(0, 42) + "..." : item.nombre;
    doc.text(String(item.cantidad), margin + 2, y);
    doc.text(item.codigo || "-", margin + 16, y);
    doc.text(nombre, margin + 45, y);
    doc.text(`${SIMB}${item.precioUnitarioUsd.toFixed(2)}`, margin + 130, y, { align: "right" });
    doc.text(`${SIMB}${subtotal.toFixed(2)}`, colRight - 2, y, { align: "right" });
    y += 6;
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
  });

  y += 3;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, colRight, y);
  y += 7;

  // ─── Totales ─────────────────────────────────────────────────────
  const totX = colRight - 60;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text("Tasa BCV aplicada:", totX, y);
  doc.text(`Bs.${pedido.tasaCambio.toFixed(2)}/USD`, colRight - 2, y, { align: "right" });
  y += 6;
  doc.text("Total en Bolívares:", totX, y);
  doc.text(`Bs.${pedido.totalBs.toFixed(2)}`, colRight - 2, y, { align: "right" });
  y += 7;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text(`TOTAL ${COD}:`, totX, y);
  doc.text(`${SIMB}${pedido.totalUsd.toFixed(2)}`, colRight - 2, y, { align: "right" });

  y += 15;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(140, 140, 140);
  doc.text("Comprobante generado automáticamente. No reemplaza factura fiscal.", margin, y);

  doc.save(`Pedido_${pedido.numeroPedido}.pdf`);
}

// Símbolo y código de la moneda del negocio; se fijan al cargar la tienda (los PDFs los leen fuera del componente).
let SIMB = "$";
let COD = "USD";

export default function CatalogoPublico() {
  const { tenantId } = useParams<{ tenantId: string }>();

  const [tienda, setTienda] = useState<DatosTienda | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [monedaElegida, setMoneda] = useState<"USD" | "VES">("USD");
  const [busqueda, setBusqueda] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("TODOS");
  const [categoriasAbiertas, setCategoriasAbiertas] = useState(false);
  const categoriasMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!categoriasAbiertas) return;
    const cerrarSiEsFuera = (e: MouseEvent) => {
      if (categoriasMenuRef.current && !categoriasMenuRef.current.contains(e.target as Node)) {
        setCategoriasAbiertas(false);
      }
    };
    document.addEventListener("mousedown", cerrarSiEsFuera);
    return () => document.removeEventListener("mousedown", cerrarSiEsFuera);
  }, [categoriasAbiertas]);

  // Modo muestra interactiva
  const [mostrarDemo, setMostrarDemo] = useState(false);

  // Modal de Detalle de Producto seleccionado
  const [productoDetalle, setProductoDetalle] = useState<ProductoCatalogo | null>(null);
  const [tallaModal, setTallaModal] = useState<string>("");
  // Selector de dos pasos para productos con variantes reales (color, después talla) —
  // como cualquier tienda de ropa/calzado. colorModal vacío = el producto no tiene
  // color propio, o el cliente aún no eligió uno.
  const [colorModal, setColorModal] = useState<string>("");
  const [cantidadModal, setCantidadModal] = useState<number>(1);
  const [agregadoAnim, setAgregadoAnim] = useState<boolean>(false);

  // Carrito de compras
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [drawerAbierto, setDrawerAbierto] = useState(false);
  // La bolsa (carrito) es un panel lateral normal; el checkout (datos de entrega
  // y pago) es su propia página dedicada de pantalla completa, a la que se llega
  // con "Proceder al Checkout" — dos pasos distintos, no todo mezclado en un solo panel.
  const [mostrandoCheckout, setMostrandoCheckout] = useState(false);
  const [copiadoPagoMovil, setCopiadoPagoMovil] = useState(false);

  // Abrir la bolsa empuja una entrada al historial — así el botón "Atrás" del
  // navegador cierra la bolsa en vez de sacar al cliente del catálogo, que es
  // lo que espera cualquiera que use "Atrás" con un modal/drawer abierto.
  const abrirDrawerCarrito = () => {
    window.history.pushState({ drawerCarrito: true }, "");
    setDrawerAbierto(true);
  };
  const cerrarDrawerCarrito = () => {
    setMostrandoCheckout(false);
    if (window.history.state?.drawerCarrito) {
      window.history.back();
    } else {
      setDrawerAbierto(false);
    }
  };
  useEffect(() => {
    const onPopState = () => { setDrawerAbierto(false); setMostrandoCheckout(false); };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Formulario del cliente y checkout
  const [nombreCliente, setNombreCliente] = useState("");
  const [telefonoCliente, setTelefonoCliente] = useState("");
  const [emailCliente, setEmailCliente] = useState("");
  const [tipoEntrega, setTipoEntrega] = useState<"DELIVERY" | "PICKUP">("DELIVERY");
  const [direccionEntrega, setDireccionEntrega] = useState("");
  const [metodoPago, setMetodoPago] = useState("EFECTIVO_USD");

  // El método seleccionado por defecto no puede ser uno que el dueño nunca
  // configuró (antes quedaba en "Pago Móvil" fijo aunque el negocio solo
  // aceptara efectivo, mostrando una caja de datos vacía o inexistente).
  useEffect(() => {
    if (!tienda) return;
    if (tienda.pagoMovil?.activo) setMetodoPago("PAGO_MOVIL");
    else if (tienda.zelle?.activo) setMetodoPago("ZELLE");
    else if (tienda.binance?.activo) setMetodoPago("BINANCE");
    else if (tienda.bancolombia?.activo) setMetodoPago("BANCOLOMBIA");
  }, [tienda]);
  const [numeroReferencia, setNumeroReferencia] = useState("");
  const [notas, setNotas] = useState("");

  const [enviandoPedido, setEnviandoPedido] = useState(false);
  // Se guarda una "foto" completa del pedido (no solo el número) porque el
  // carrito se vacía justo después de confirmar — sin esto, el botón de PDF
  // en la pantalla de confirmación no tendría de dónde sacar los renglones.
  const [pedidoConfirmado, setPedidoConfirmado] = useState<{
    pedidoId: number;
    accessToken: string;
    numeroPedido: string;
    whatsappUrl: string | null;
    items: { nombre: string; codigo: string; cantidad: number; precioUnitarioUsd: number }[];
    totalUsd: number;
    totalBs: number;
    tasaCambio: number;
    clienteNombre: string;
    clienteTelefono: string;
    tipoEntrega: "DELIVERY" | "PICKUP";
    direccionEntrega: string;
    metodoPago: string;
    numeroReferencia: string;
    fecha: string;
  } | null>(null);

  // Comprobante de pago (captura de Pago Móvil/Zelle/transferencia/etc.) que el
  // cliente sube DESPUÉS de confirmar — así el dueño solo tiene que verificarlo,
  // sin pedirlo aparte por WhatsApp.
  const [comprobanteSubiendo, setComprobanteSubiendo] = useState(false);
  const [comprobanteSubido, setComprobanteSubido] = useState(false);
  const [errorComprobante, setErrorComprobante] = useState<string | null>(null);
  const comprobanteInputRef = useRef<HTMLInputElement | null>(null);

  const subirComprobantePago = (file: File) => {
    if (!pedidoConfirmado || !tenantId) return;
    if (!file.type.startsWith("image/")) {
      setErrorComprobante("El comprobante debe ser una imagen.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setErrorComprobante("La imagen no debe superar los 4MB.");
      return;
    }
    setErrorComprobante(null);
    setComprobanteSubiendo(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const capturaBase64 = typeof reader.result === "string" ? reader.result : "";
        const res = await fetch(`/api/public/catalogo/${tenantId}/pedidos/${pedidoConfirmado.pedidoId}/comprobante`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: pedidoConfirmado.accessToken, capturaBase64 })
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => null);
          throw new Error(errBody?.error || "No se pudo subir el comprobante.");
        }
        setComprobanteSubido(true);
      } catch (err: any) {
        setErrorComprobante(err.message || "No se pudo subir el comprobante.");
      } finally {
        setComprobanteSubiendo(false);
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    // Navegar de una tienda a otra sin recarga completa (dos links de
    // catálogo distintos en la misma pestaña) no reseteaba nada de esto —
    // el carrito, el modal de producto y los datos del formulario de la
    // tienda anterior seguían visibles mezclados con el catálogo nuevo.
    setCarrito([]);
    setDrawerAbierto(false);
    setProductoDetalle(null);
    setPedidoConfirmado(null);
    setTienda(null);

    const fetchCatalogo = async () => {
      setCargando(true);
      setError(null);
      try {
        const tid = tenantId || "2";
        const res = await fetch(`/api/public/catalogo/${tid}`);
        if (!res.ok) {
          throw new Error("No se pudo cargar el catálogo de la tienda.");
        }
        const data = await res.json();
        setTienda(data);
      } catch (err: any) {
        setError(err.message || "Error al conectar con la tienda.");
      } finally {
        setCargando(false);
      }
    };

    fetchCatalogo();
  }, [tenantId]);

  // Sin tasa cargada por el negocio no se inventa una: en cero no se muestra nada en bolívares.
  const tasa = tienda?.tasaVes && tienda.tasaVes > 0 ? tienda.tasaVes : 0;
  const esEuro = tienda?.monedaBase === "EUR";
  SIMB = esEuro ? "€" : "$";
  COD = esEuro ? "EUR" : "USD";
  const sinBs = esEuro || !(tasa > 0);
  const moneda = sinBs ? "USD" : monedaElegida;

  // Bs y COP se cotizan en montos grandes (miles/millones) — con separador de miles
  // se leen de un vistazo; toFixed(2) puro los deja ilegibles ("8485460.00 Bs").
  const formatearMonto = (n: number) => n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Lista activa de productos: productos reales de la tienda o catálogo de alta gama
  const productosActivos = useMemo<ProductoCatalogo[]>(() => {
    if (!tienda) return [];
    if (tienda.productos && tienda.productos.length > 0) {
      // Antes se le forzaba a TODO producto real (tornillos, filtros de
      // aceite, repuestos...) tallas de perfume/calzado ("50ml", "EU 42")
      // sin importar el rubro de la tienda — el tamaño elegido terminaba
      // metido tal cual en el nombre del pedido que recibe el comerciante
      // ("Filtro de Aceite [100ml]"). Sin `tallas`, el selector de tamaño no
      // se muestra (ver el condicional más abajo) y el pedido usa "Estándar".
      return tienda.productos.map((p) => ({
        ...p,
        marca: p.categoria || "Atelier"
      }));
    }
    if (mostrarDemo) {
      return PRODUCTOS_MUESTRA_ALTA_GAMA.map((item) => ({
        ...item,
        precioBs: Number((item.precioUsd * tasa).toFixed(2))
      }));
    }
    return [];
  }, [tienda, mostrarDemo, tasa]);

  // Lista de categorías únicas para las píldoras superiores
  const categorias = useMemo(() => {
    if (!productosActivos || productosActivos.length === 0) return ["TODOS"];
    const setCat = new Set<string>();
    productosActivos.forEach((p) => {
      if (p.categoria) setCat.add(p.categoria.toUpperCase());
    });
    return ["TODOS", ...Array.from(setCat)];
  }, [productosActivos]);

  // Productos filtrados según categoría y búsqueda
  const productosFiltrados = useMemo(() => {
    return productosActivos.filter((p) => {
      const cumpleCat =
        categoriaSeleccionada === "TODOS" ||
        p.categoria.toUpperCase() === categoriaSeleccionada;
      const q = busqueda.toLowerCase().trim();
      const cumpleBusqueda =
        !q ||
        p.nombre.toLowerCase().includes(q) ||
        p.codigo.toLowerCase().includes(q) ||
        (p.marca && p.marca.toLowerCase().includes(q)) ||
        (p.categoria && p.categoria.toLowerCase().includes(q));
      return cumpleCat && cumpleBusqueda;
    });
  }, [productosActivos, categoriaSeleccionada, busqueda]);

  // Renderizar la silueta adecuada para cada producto
  const renderVisualProducto = (tipo?: string) => {
    switch (tipo) {
      case "baccarat":
        return <VisualBaccaratRouge className="w-24 sm:w-28 h-36 sm:h-44 transition-transform duration-300 group-hover:scale-105" />;
      case "tomford":
        return <VisualTomFordOud className="w-24 sm:w-28 h-36 sm:h-44 transition-transform duration-300 group-hover:scale-105" />;
      case "lelabo":
        return <VisualLeLaboSantal className="w-24 sm:w-28 h-36 sm:h-44 transition-transform duration-300 group-hover:scale-105" />;
      case "creed":
        return <VisualCreedAventus className="w-24 sm:w-28 h-36 sm:h-44 transition-transform duration-300 group-hover:scale-105" />;
      case "kilian":
        return <VisualKilianLove className="w-24 sm:w-28 h-36 sm:h-44 transition-transform duration-300 group-hover:scale-105" />;
      case "balenciaga":
        return <VisualBalenciagaTripleS className="w-40 sm:w-48 h-auto transition-transform duration-300 group-hover:scale-105" />;
      case "prada":
        return <VisualPradaDerby className="w-40 sm:w-48 h-auto transition-transform duration-300 group-hover:scale-105" />;
      case "mcqueen":
        return <VisualMcQueenBoot className="w-40 sm:w-48 h-auto transition-transform duration-300 group-hover:scale-105" />;
      default:
        return <VisualProductoGenerico className="w-20 sm:w-24 h-20 sm:h-24 transition-transform duration-300 group-hover:scale-105" />;
    }
  };

  // Abrir modal de detalle al hacer clic en un producto
  const abrirDetalle = (prod: ProductoCatalogo) => {
    setProductoDetalle(prod);
    if (prod.variantes && prod.variantes.length > 0) {
      // Selector real de dos pasos: color primero (si el producto tiene), después talla.
      const primerColor = prod.variantes.find((v) => v.color)?.color || "";
      setColorModal(primerColor);
      const primeraDeEseColor = prod.variantes.find((v) => (primerColor ? v.color === primerColor : true));
      setTallaModal(primeraDeEseColor?.atributo || "");
    } else {
      setColorModal("");
      const primeraTalla = prod.tallas && prod.tallas.length > 0 ? prod.tallas[0] : "Estándar";
      setTallaModal(primeraTalla);
    }
    setCantidadModal(1);
    setAgregadoAnim(false);
  };

  // Colores únicos disponibles del producto abierto, en el orden en que aparecen sus
  // variantes (que ya vienen ordenadas por ordenVisualizacion desde el backend).
  const coloresDisponibles = useMemo(() => {
    if (!productoDetalle?.variantes) return [];
    const vistos = new Set<string>();
    const colores: string[] = [];
    for (const v of productoDetalle.variantes) {
      if (v.color && !vistos.has(v.color)) { vistos.add(v.color); colores.push(v.color); }
    }
    return colores;
  }, [productoDetalle]);

  // Tallas/modelos disponibles para el color actualmente seleccionado (o todas, si el
  // producto no varía por color).
  const variantesDelColorActual = useMemo(() => {
    if (!productoDetalle?.variantes) return [];
    return productoDetalle.variantes.filter((v) => (coloresDisponibles.length > 0 ? v.color === colorModal : true));
  }, [productoDetalle, coloresDisponibles, colorModal]);

  // La variante real (SKU/stock/precio propios) que resulta de la combinación color+talla
  // elegida — esto, no la tarjeta agrupada, es lo que se vende de verdad.
  const varianteActual = useMemo(() => {
    return variantesDelColorActual.find((v) => v.atributo === tallaModal) || variantesDelColorActual[0] || null;
  }, [variantesDelColorActual, tallaModal]);

  /** Producto "resuelto": si tiene variantes, sustituye id/precio/stock por los de la variante elegida — esto es lo que de verdad se agrega al carrito y se vende (nunca la tarjeta agrupada, que no es un SKU vendible). */
  const resolverProductoParaCarrito = (prod: ProductoCatalogo): ProductoCatalogo => {
    if (!prod.variantes || prod.variantes.length === 0) return prod;
    const v = prod === productoDetalle ? varianteActual : prod.variantes[0];
    if (!v) return prod;
    return { ...prod, id: v.id, precioUsd: v.precioUsd, precioBs: v.precioBs, stock: v.stock };
  };

  const cerrarDetalle = () => {
    setProductoDetalle(null);
  };

  // Operaciones de Carrito
  const agregarAlCarritoConTalla = (prod: ProductoCatalogo, talla: string, cant: number = 1) => {
    if (prod.stock <= 0) return;
    setCarrito((prev) => {
      const idx = prev.findIndex(
        (it) => it.producto.id === prod.id && it.tallaSeleccionada === talla
      );
      if (idx >= 0) {
        const nuevaCant = Math.min(prev[idx].cantidad + cant, prod.stock);
        const nuevo = [...prev];
        nuevo[idx] = { ...nuevo[idx], cantidad: nuevaCant };
        return nuevo;
      }
      return [...prev, { producto: prod, tallaSeleccionada: talla, cantidad: cant }];
    });

    setAgregadoAnim(true);
    setTimeout(() => setAgregadoAnim(false), 1500);
  };

  const modificarCantidad = (id: string, talla: string, delta: number) => {
    setCarrito((prev) => {
      return prev
        .map((item) => {
          if (item.producto.id === id && item.tallaSeleccionada === talla) {
            const nuevaCantidad = Math.min(item.cantidad + delta, item.producto.stock);
            return nuevaCantidad > 0 ? { ...item, cantidad: nuevaCantidad } : null;
          }
          return item;
        })
        .filter(Boolean) as ItemCarrito[];
    });
  };

  const eliminarDelCarrito = (id: string, talla: string) => {
    setCarrito((prev) =>
      prev.filter((it) => !(it.producto.id === id && it.tallaSeleccionada === talla))
    );
  };

  // IVA según Configuración > Impuestos y cargos del negocio. precioUsd ya trae el IVA (es lo que
  // se paga y lo que cobra el servidor); con "+ IVA" se muestra el precio sin IVA solo como vitrina.
  const impuestosTienda = tienda?.impuestos;
  const mostrarSinIva = !!impuestosTienda?.cobraIva && impuestosTienda.catalogoPrecioConIva === false;
  const precioVisible = (p: { precioUsd: number; precioSinIvaUsd?: number }) =>
    mostrarSinIva && p.precioSinIvaUsd != null ? p.precioSinIvaUsd : p.precioUsd;
  const etiquetaIvaDe = (p: { exentoIva?: boolean }) =>
    !impuestosTienda?.cobraIva ? null : p.exentoIva ? "Exento de IVA" : mostrarSinIva ? "+ IVA" : "IVA incluido";

  const subtotalUsd = useMemo(() => {
    return carrito.reduce((acc, item) => acc + item.producto.precioUsd * item.cantidad, 0);
  }, [carrito]);

  // Elegir "Delivery" no sumaba ningún costo de envío al total, sin importar
  // qué configurara la tienda — el backend ahora recalcula esto mismo server-side
  // al registrar el pedido (nunca confía en lo que mande el cliente); esto es
  // solo para que el cliente vea el total real ANTES de confirmar.
  const costoEnvio = tipoEntrega === "DELIVERY" ? (tienda?.costoEnvioDelivery || 0) : 0;

  const totalUsd = useMemo(() => {
    return subtotalUsd + costoEnvio;
  }, [subtotalUsd, costoEnvio]);

  const totalBs = useMemo(() => {
    return totalUsd * tasa;
  }, [totalUsd, tasa]);

  const totalItems = useMemo(() => {
    return carrito.reduce((acc, item) => acc + item.cantidad, 0);
  }, [carrito]);

  const handleCopiarPagoMovil = () => {
    if (!tienda?.pagoMovil) return;
    const txt = `Pago Móvil:\nBanco: ${tienda.pagoMovil.banco}\nTeléfono: ${tienda.pagoMovil.telefono}\nRIF: ${tienda.pagoMovil.documento}\nTitular: ${tienda.pagoMovil.titular}\nMonto: ${totalBs.toFixed(2)} Bs.`;
    navigator.clipboard.writeText(txt);
    setCopiadoPagoMovil(true);
    setTimeout(() => setCopiadoPagoMovil(false), 2500);
  };

  // Enviar pedido (Checkout Directo o vía WhatsApp)
  const procesarPedido = async (directoAWhatsApp: boolean) => {
    if (carrito.length === 0) return;
    if (!nombreCliente.trim()) {
      avisar("Por favor ingrese su nombre y apellido");
      return;
    }
    if (!telefonoCliente.trim()) {
      avisar("Por favor ingrese su número de teléfono o WhatsApp");
      return;
    }
    if (tipoEntrega === "DELIVERY" && !direccionEntrega.trim()) {
      avisar("Por favor ingrese la dirección exacta de entrega");
      return;
    }

    setEnviandoPedido(true);
    try {
      // Mismo identificador de la URL con el que se cargó el catálogo (el slug
      // público) — el backend ya no resuelve tiendas por tenantId numérico
      // (ver resolverLicencia), así que reusar ese id evita un 404 al enviar
      // el pedido.
      const tid = tenantId || "2";
      const payload = {
        clienteNombre: nombreCliente.trim(),
        clienteTelefono: telefonoCliente.trim(),
        clienteEmail: emailCliente.trim(),
        tipoEntrega,
        direccionEntrega: tipoEntrega === "DELIVERY" ? direccionEntrega.trim() : "Retiro en tienda",
        metodoPago,
        numeroReferencia: numeroReferencia.trim(),
        totalUsd,
        totalBs,
        tasaCambio: tasa,
        notas: notas.trim(),
        items: carrito.map((item) => ({
          productoId: item.producto.id,
          codigo: item.producto.codigo,
          nombre: `${item.producto.nombre} [${item.tallaSeleccionada}]`,
          cantidad: item.cantidad,
          precioUnitarioUsd: item.producto.precioUsd,
          subtotalUsd: Number((item.producto.precioUsd * item.cantidad).toFixed(2))
        }))
      };

      const res = await fetch(`/api/public/catalogo/${tid}/pedidos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      // Antes, si el backend rechazaba el pedido (stock insuficiente, tienda no
      // encontrada, error de validación), este código seguía de largo: inventaba
      // un número de pedido y mostraba "orden confirmada" igual, sin que el
      // pedido hubiera quedado guardado en ningún lado. Ahora un fallo real
      // se muestra como lo que es.
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.error || "No se pudo registrar el pedido. Intenta de nuevo.");
      }
      const data = await res.json();

      setPedidoConfirmado({
        pedidoId: data.pedidoId,
        accessToken: data.accessToken,
        numeroPedido: data.numeroPedido,
        // El backend solo arma este link cuando la tienda configuró un
        // teléfono de contacto real — si no, queda null y la pantalla de
        // confirmación lo indica en vez de ofrecer un chat que no le llega
        // a nadie (antes se fabricaba un número falso acá mismo).
        whatsappUrl: data.whatsappUrl || null,
        items: payload.items,
        totalUsd,
        totalBs,
        tasaCambio: tasa,
        clienteNombre: nombreCliente.trim(),
        clienteTelefono: telefonoCliente.trim(),
        tipoEntrega,
        direccionEntrega: payload.direccionEntrega,
        metodoPago,
        numeroReferencia: numeroReferencia.trim(),
        fecha: new Date().toLocaleString("es-VE", { dateStyle: "long", timeStyle: "short" })
      });

      if (directoAWhatsApp && data.whatsappUrl) {
        window.open(data.whatsappUrl, "_blank");
      }
      setCarrito([]);
    } catch (err: any) {
      avisar(err.message || "Error al procesar el pedido.");
    } finally {
      setEnviandoPedido(false);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center text-neutral-600 font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin mb-4" />
        <p className="text-[11px] font-bold tracking-[0.25em] uppercase text-neutral-800">Cargando Catálogo</p>
      </div>
    );
  }

  if (error || !tienda) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-6 text-center text-neutral-800 font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="w-16 h-16 rounded-3xl bg-white border border-neutral-200 flex items-center justify-center text-neutral-400 mb-4 shadow-sm">
          <SvgStore className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-semibold text-neutral-900 mb-2 font-['Cormorant_Garamond',serif]">Boutique no disponible</h2>
        <p className="text-xs text-neutral-500 max-w-md mb-6">{error || "No se ha encontrado la tienda solicitada."}</p>
        <Link
          to="/"
          className="px-6 py-2.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase transition-all hover:opacity-90"
          style={{ backgroundColor: "#171717", color: "#ffffff" }}
        >
          <span style={{ color: "#ffffff" }}>Volver al Inicio</span>
        </Link>
      </div>
    );
  }

  const phoneHref = tienda.telefonoWhatsapp
    ? `https://wa.me/${tienda.telefonoWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Hola, me comunico desde el catálogo de ${tienda.nombreTienda} para realizar una consulta.`
      )}`
    : null;

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] font-['Plus_Jakarta_Sans',sans-serif] selection:bg-neutral-900 selection:text-white relative">
      {/* Marca de Agua Fija del Logo del Comercio - Visible durante todo el scroll */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden select-none"
        aria-hidden="true"
      >
        {tienda.logoBase64 && tienda.logoBase64.trim().length > 15 ? (
          <img
            src={tienda.logoBase64}
            alt=""
            className="w-[340px] sm:w-[520px] md:w-[700px] max-h-[75vh] object-contain opacity-[0.055] filter contrast-125 select-none pointer-events-none transform -rotate-6 transition-all duration-700"
          />
        ) : (
          <div className="font-serif text-[20vw] font-bold text-neutral-900 opacity-[0.035] select-none pointer-events-none tracking-widest uppercase transform -rotate-6">
            {(tienda.nombreTienda || "AP").substring(0, 4)}
          </div>
        )}
      </div>

      {tienda.bannerBase64 && tienda.estiloBannerTienda === "VITRINA" && (
        // Hero editorial a pantalla completa (inspirado en marcas de moda tipo Ralph
        // Lauren): la misma foto que en modo Compacto, pero grande, con el nombre de
        // la tienda superpuesto. El scrim oscuro (no el difuminado blanco de Compacto)
        // es lo que hace legible el texto sobre la foto; solo el borde inferior se
        // funde a blanco para no cortar seco contra el header que sigue.
        <div className="relative z-10 w-full h-72 sm:h-[28rem] overflow-hidden bg-neutral-900">
          <img src={tienda.bannerBase64} alt={`Portada de ${tienda.nombreTienda}`} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-[#fafafa]" />
          <div className="relative h-full flex flex-col items-center justify-center text-center px-4">
            <h1 className="font-['Cormorant_Garamond',serif] text-4xl sm:text-6xl font-semibold text-white tracking-[0.08em] uppercase drop-shadow-lg">
              {tienda.nombreTienda}
            </h1>
            {tienda.slogan && (
              <p className="mt-3 text-xs sm:text-sm text-white/85 tracking-[0.2em] uppercase font-medium max-w-lg">
                {tienda.slogan}
              </p>
            )}
          </div>
        </div>
      )}

      {tienda.bannerBase64 && tienda.estiloBannerTienda !== "VITRINA" && (
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="relative h-32 sm:h-48 w-full rounded-2xl overflow-hidden bg-white">
            <img src={tienda.bannerBase64} alt={`Portada de ${tienda.nombreTienda}`} className="absolute inset-0 h-full w-full object-cover" />
            {/* Difuminado hacia blanco en los 4 bordes, mismo tratamiento del Hero de la landing —
                así el banner se funde con el catálogo en vez de verse como un recorte pegado. */}
            <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white" />
            <div className="absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-white to-transparent" />
            <div className="absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-white to-transparent" />
          </div>
        </div>
      )}

      {/* 1. Header Minimalista de Alta Gama con Marca y Controles */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200/60 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Logo del Comercio / Identidad */}
          <div className="flex items-center gap-4 min-w-0">
            {tienda.logoBase64 && tienda.logoBase64.trim().length > 15 ? (
              <div className="flex items-center gap-3">
                <img
                  src={tienda.logoBase64}
                  alt={tienda.nombreTienda}
                  className="h-10 sm:h-12 w-auto max-w-[140px] sm:max-w-[200px] object-contain rounded-lg"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="hidden sm:block">
                  <h1 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-neutral-950 uppercase leading-none">
                    {tienda.nombreTienda}
                  </h1>
                  <span className="text-[10px] tracking-[0.25em] text-neutral-400 uppercase block mt-0.5">
                    Catalogo Oficial
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div 
                  className="w-11 h-11 rounded-2xl bg-gradient-to-br from-white to-neutral-100 border border-neutral-200/90 flex items-center justify-center font-serif text-base font-bold tracking-wider shadow-sm"
                  style={{ color: '#171717' }}
                >
                  {tienda.nombreTienda.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-['Cormorant_Garamond',serif] font-semibold tracking-wide text-neutral-950 uppercase leading-none">
                    {tienda.nombreTienda}
                  </h1>
                  <span className="text-[9px] font-bold text-neutral-400 tracking-[0.25em] uppercase block mt-0.5">
                    Catálogo Oficial
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Selector de Moneda y Carrito */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Tasa BCV Pill */}
            <div style={sinBs ? { display: "none" } : undefined} className="hidden md:flex items-center px-3 py-1 rounded-full bg-neutral-100/90 border border-neutral-200/80 text-[11px] font-mono text-neutral-600">
              BCV: {tasa.toFixed(2)} Bs/$
            </div>

            {/* Toggle de Moneda */}
            <div style={sinBs ? { display: "none" } : undefined} className="flex items-center p-1 rounded-full bg-neutral-100 border border-neutral-200 text-xs">
              <button
                type="button"
                onClick={() => setMoneda("USD")}
                className="px-3.5 py-1 rounded-full transition-all text-xs font-bold shadow-sm"
                style={{
                  backgroundColor: moneda === "USD" ? "#171717" : "transparent",
                  color: moneda === "USD" ? "#ffffff" : "#64748b"
                }}
              >
                <span style={{ color: moneda === "USD" ? "#ffffff" : "#64748b" }}>USD ($)</span>
              </button>
              <button
                type="button"
                onClick={() => setMoneda("VES")}
                className="px-3.5 py-1 rounded-full transition-all text-xs font-bold shadow-sm"
                style={{
                  backgroundColor: moneda === "VES" ? "#171717" : "transparent",
                  color: moneda === "VES" ? "#ffffff" : "#64748b"
                }}
              >
                <span style={{ color: moneda === "VES" ? "#ffffff" : "#64748b" }}>VES (Bs.)</span>
              </button>
            </div>

            {/* Botón Carrito */}
            <button
              type="button"
              onClick={abrirDrawerCarrito}
              className="relative w-11 h-11 rounded-2xl bg-white hover:bg-neutral-100 border border-neutral-200/90 text-neutral-800 flex items-center justify-center transition-all shadow-sm active:scale-95"
              title="Ver Bolsa de Compras"
            >
              <SvgBag className="w-5 h-5" />
              {totalItems > 0 && (
                <span 
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 font-bold text-[10px] rounded-full flex items-center justify-center shadow-md animate-scale-up"
                  style={{ color: '#ffffff' }}
                >
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 2. Menú desplegable de Categorías (único selector de categoría de la
            página — reemplaza tanto las píldoras como el panel lateral que hubo
            antes, para no repetir el mismo filtro dos veces) + Buscador */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4 border-t border-neutral-100">
          {categorias.length > 2 ? (
            <div ref={categoriasMenuRef} className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => setCategoriasAbiertas((v) => !v)}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-medium tracking-wide text-[#1D1D1F] bg-white border border-[#E5E5EA] hover:border-[#D1D1D6] transition-colors"
              >
                <span>{categoriaSeleccionada === "TODOS" ? "Categorías" : categoriaSeleccionada}</span>
                <span className={`text-[8px] text-[#86868B] transition-transform duration-300 ${categoriasAbiertas ? "rotate-180" : ""}`}>▼</span>
              </button>

              {/* Panel: siempre montado, animado con opacity + translate-y para que
                  abra/cierre con una transición suave en vez de aparecer de golpe. */}
              <div
                className={`absolute left-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-lg border border-[#E5E5EA] py-2 z-30 origin-top transition-all duration-300 ease-out ${
                  categoriasAbiertas
                    ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
                    : "opacity-0 -translate-y-2 scale-95 pointer-events-none"
                }`}
              >
                {categorias.map((cat, idx) => {
                  const active = categoriaSeleccionada === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => { setCategoriaSeleccionada(cat); setCategoriasAbiertas(false); }}
                      className={`w-full text-left px-4 py-2 text-[13px] tracking-tight transition-colors ${
                        idx !== categorias.length - 1 ? "border-b border-[#E5E5EA]" : ""
                      } ${active ? "text-[#1D1D1F] font-semibold bg-[#F5F5F7]" : "text-[#1D1D1F] hover:bg-[#F5F5F7]"}`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <span />
          )}

          {/* Buscador Integrado */}
          <div className="relative w-48 sm:w-64 flex-shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
              <SvgSearch className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por aroma, marca o estilo..."
              className="w-full pl-9 pr-7 py-1.5 rounded-full bg-neutral-100 border border-neutral-200/80 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:bg-white focus:border-neutral-900 transition-all"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda("")}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-neutral-400 hover:text-neutral-900"
              >
                <SvgClose className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Banner de Tienda / Estado Vacío si no hay productos cargados */}
        {productosActivos.length === 0 && (
          <div className="my-10 p-10 sm:p-16 rounded-[2.5rem] bg-white border border-neutral-100 shadow-[0_4px_30px_rgba(0,0,0,0.03)] text-center max-w-2xl mx-auto">
            <div className="w-20 h-20 rounded-3xl bg-neutral-100 flex items-center justify-center text-neutral-800 mx-auto mb-6">
              <SvgStore className="w-10 h-10" />
            </div>

            <span className="inline-block px-3 py-1 rounded-full bg-neutral-100 text-neutral-700 text-[10px] font-bold tracking-[0.25em] uppercase mb-3">
              Actualización de Colección
            </span>

            <h3 className="text-2xl sm:text-3xl font-['Cormorant_Garamond',serif] font-semibold text-neutral-950 uppercase tracking-wide">
              Catálogo en Preparación
            </h3>

            <p className="text-sm text-neutral-500 mt-2 max-w-md mx-auto leading-relaxed">
              <strong className="text-neutral-900">{tienda.nombreTienda}</strong> está actualizando su catálogo digital. Puedes solicitar información directa o explorar la muestra exclusiva con fragancias y calzado de lujo.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              {phoneHref && (
                <a
                  href={phoneHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold text-xs tracking-[0.15em] uppercase transition-all shadow-md active:scale-95 hover:opacity-90"
                  style={{ backgroundColor: "#171717", color: "#ffffff" }}
                >
                  <SvgWhatsApp className="w-4 h-4" style={{ color: "#ffffff" }} />
                  <span style={{ color: "#ffffff" }}>Consultar por WhatsApp</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => setMostrarDemo(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-bold text-xs tracking-[0.15em] uppercase transition-all active:scale-95"
              >
                <SvgSparkles className="w-4 h-4 text-neutral-700" />
                <span>Ver Colección de Muestra</span>
              </button>
            </div>
          </div>
        )}

        {/* Banner Informativo si el modo muestra está activo */}
        {mostrarDemo && (
          <div className="mb-8 p-4 rounded-3xl bg-white border border-neutral-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-neutral-950 text-white flex items-center justify-center flex-shrink-0">
                <SvgSparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-950">Muestra Interactiva de Fragancias y Calzado</h4>
                <p className="text-xs text-neutral-500">
                  Haz clic en cualquier artículo para ver su descripción sensorial, elegir volumen/talla y probar el carrito de compras con delivery y Pago Móvil.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMostrarDemo(false)}
              className="px-4 py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold uppercase tracking-wider transition-colors self-start sm:self-center"
            >
              Cerrar Muestra
            </button>
          </div>
        )}

        {/* 3. Grid de Tarjetas de Producto */}
        {productosFiltrados.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
            {productosFiltrados.map((prod) => {
              const pUsd = precioVisible(prod);
              const pBs = Number((pUsd * tasa).toFixed(2));
              const etiquetaIva = etiquetaIvaDe(prod);
              const tallaDefault = prod.tallas && prod.tallas.length > 0 ? prod.tallas[0] : "Estándar";

              return (
                <div
                  key={prod.id}
                  className="group relative bg-white rounded-2xl p-7 sm:p-8 shadow-sm hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 transition-all duration-300 ease-out flex flex-col justify-between"
                >
                  {/* Fila Superior: Marca en pequeño e insignia NUEVO */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-medium tracking-widest text-[#86868B] uppercase">
                      {prod.marca || prod.categoria}
                    </span>

                    {prod.esNuevo && (
                      <span 
                        className="px-2.5 py-0.5 rounded-full border text-[9px] font-bold tracking-[0.2em] uppercase"
                        style={{ backgroundColor: "#f8fafc", color: "#334155", borderColor: "#cbd5e1" }}
                      >
                        Nuevo
                      </span>
                    )}
                  </div>

                  {/* Imagen / Silueta Central del Producto (Diferente para cada producto) */}
                  <div
                    onClick={() => abrirDetalle(prod)}
                    className="h-52 sm:h-56 w-full flex items-center justify-center p-3 cursor-pointer relative"
                  >
                    {prod.imagenUrl ? (
                      <img
                        src={prod.imagenUrl}
                        alt={prod.nombre}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      renderVisualProducto(prod.tipoVisual)
                    )}
                  </div>

                  {/* Información del Producto con Tipografía Elegante */}
                  <div className="mt-2">
                    <h3
                      onClick={() => abrirDetalle(prod)}
                      className="text-lg font-semibold text-[#1D1D1F] tracking-tight leading-snug line-clamp-1 cursor-pointer hover:text-[#6E6E73] transition-colors"
                    >
                      {prod.nombre}
                    </h3>
                  </div>

                  {/* Precios y Botón de Acción */}
                  <div className="mt-5 pt-3 border-t border-[#E5E5EA] flex items-center justify-between gap-3">
                    <div>
                      {moneda === "USD" ? (
                        <>
                          <div className="text-base font-medium text-[#1D1D1F] tracking-tight leading-none" style={tienda.colorAcentoTienda ? { color: tienda.colorAcentoTienda } : undefined}>
                            {SIMB}{pUsd.toFixed(2)}
                          </div>
                          <div style={sinBs ? { display: "none" } : undefined} className="text-xs text-[#86868B] mt-1">
                            {pBs.toFixed(2)} Bs.
                          </div>
                          {etiquetaIva && <div className="text-[10px] text-[#86868B] mt-0.5">{etiquetaIva}</div>}
                        </>
                      ) : (
                        <>
                          <div className="text-base font-medium text-[#1D1D1F] tracking-tight leading-none" style={tienda.colorAcentoTienda ? { color: tienda.colorAcentoTienda } : undefined}>
                            {pBs.toFixed(2)} Bs.
                          </div>
                          <div className="text-xs text-[#86868B] mt-1">
                            {SIMB}{pUsd.toFixed(2)} {COD}
                          </div>
                          {etiquetaIva && <div className="text-[10px] text-[#86868B] mt-0.5">{etiquetaIva}</div>}
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        // Con variantes (color/talla) reales, no hay forma segura de "adivinar" cuál
                        // vender de un clic — se abre el detalle para que el cliente elija, igual que
                        // en cualquier tienda real de ropa/calzado.
                        prod.variantes && prod.variantes.length > 0
                          ? abrirDetalle(prod)
                          : agregarAlCarritoConTalla(prod, tallaDefault, 1)
                      }
                      className="w-10 h-10 rounded-full bg-white hover:bg-[#1D1D1F] hover:text-white text-[#1D1D1F] border border-[#E5E5EA] flex items-center justify-center transition-all duration-300 active:scale-90"
                      title={prod.variantes && prod.variantes.length > 0 ? "Elegir color y talla" : "Añadir a la bolsa"}
                    >
                      <SvgBag className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 4. MODAL DE DETALLE DE PRODUCTO */}
      {productoDetalle && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div
            className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botón Cerrar */}
            <button
              type="button"
              onClick={cerrarDetalle}
              className="absolute top-6 right-6 w-9 h-9 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 flex items-center justify-center transition-colors z-10"
            >
              <SvgClose className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              {/* Imagen Grande / Visual — si la variante elegida (ej. este color) tiene su
                  propia foto, se muestra esa en vez de la genérica de la tarjeta; cambia
                  sola al elegir otro color porque cada color es su propio RepuestoItem con
                  su propia foto (ver construirTarjetaAgrupada en el backend). */}
              <div className="bg-[#f9fafb] rounded-3xl h-64 sm:h-80 flex flex-col items-center justify-center p-6 relative">
                {(varianteActual?.imagenUrl || productoDetalle.imagenUrl) ? (
                  <img
                    src={varianteActual?.imagenUrl || productoDetalle.imagenUrl}
                    alt={productoDetalle.nombre}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  renderVisualProducto(productoDetalle.tipoVisual)
                )}
                <span className="absolute bottom-4 text-[9px] font-mono text-neutral-400 tracking-[0.2em] uppercase">
                  SKU: {productoDetalle.codigo}
                </span>
              </div>

              {/* Información y Especificaciones */}
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 tracking-[0.25em] uppercase">
                    {productoDetalle.marca || productoDetalle.categoria}
                  </span>
                  <h3 className="text-3xl sm:text-4xl font-['Cormorant_Garamond',serif] font-semibold text-neutral-950 leading-tight mt-0.5">
                    {productoDetalle.nombre}
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-4xl sm:text-5xl font-black text-rose-600 tracking-tight leading-none" style={tienda.colorAcentoTienda ? { color: tienda.colorAcentoTienda } : undefined}>
                      {SIMB}{precioVisible(varianteActual ?? productoDetalle).toFixed(2)}
                    </span>
                    <span className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase">{COD}</span>
                    {etiquetaIvaDe(productoDetalle) && (
                      <span className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase">{etiquetaIvaDe(productoDetalle)}</span>
                    )}
                  </div>
                  <div style={sinBs ? { display: "none" } : undefined} className="mt-1.5 flex flex-col gap-0.5 text-xs font-mono text-neutral-500">
                    <span>
                      {formatearMonto(precioVisible(varianteActual ?? productoDetalle) * tasa)} Bs. <span className="text-neutral-400">(BCV)</span>
                    </span>
                    {tienda?.tasaCop != null && tienda.tasaCop > 0 && (
                      <span>
                        {formatearMonto(precioVisible(varianteActual ?? productoDetalle) * tienda.tasaCop)} COP
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-neutral-600 leading-relaxed font-normal">
                  {productoDetalle.descripcion}
                </p>

                {/* Selector real de variantes: 1. Color, 2. Talla/Modelo — en ese orden, como
                    cualquier tienda de ropa/calzado real. Cada botón corresponde a un SKU real
                    con su propio stock (ver CatalogoPublicoController.construirTarjetaAgrupada). */}
                {productoDetalle.variantes && productoDetalle.variantes.length > 0 ? (
                  <>
                    {coloresDisponibles.length > 0 && (
                      <div>
                        <span className="block text-[10px] font-bold text-neutral-900 tracking-[0.2em] uppercase mb-2">
                          1. Color
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {coloresDisponibles.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => {
                                setColorModal(c);
                                // Al cambiar de color, la talla elegida puede no existir en ese
                                // color — se cae a la primera talla disponible de ese color.
                                const primeraDeEseColor = productoDetalle.variantes!.find((v) => v.color === c);
                                setTallaModal(primeraDeEseColor?.atributo || "");
                              }}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                                colorModal === c
                                  ? "bg-neutral-900 text-white"
                                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-800 hover:text-white"
                              }`}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <span className="block text-[10px] font-bold text-neutral-900 tracking-[0.2em] uppercase mb-2">
                        {coloresDisponibles.length > 0 ? "2. Talla" : "Seleccionar"}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {variantesDelColorActual.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            disabled={v.stock <= 0}
                            onClick={() => setTallaModal(v.atributo)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                              tallaModal === v.atributo
                                ? "bg-neutral-900 text-white"
                                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-800 hover:text-white"
                            }`}
                            title={v.stock <= 0 ? "Agotado en esta variante" : undefined}
                          >
                            {v.atributo}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  productoDetalle.tallas && productoDetalle.tallas.length > 0 && (
                    <div>
                      <span className="block text-[10px] font-bold text-neutral-900 tracking-[0.2em] uppercase mb-2">
                        Seleccionar Tamaño / Talla
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {productoDetalle.tallas.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setTallaModal(t)}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all"
                            style={{
                              backgroundColor: tallaModal === t ? "#171717" : "#f5f5f5",
                              color: tallaModal === t ? "#ffffff" : "#525252"
                            }}
                          >
                            <span style={{ color: tallaModal === t ? "#ffffff" : "#525252" }}>{t}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                )}

                {/* Selector de Cantidad */}
                <div className="flex items-center gap-4 pt-1">
                  <div className="flex items-center border border-neutral-200 rounded-xl p-1 bg-neutral-50">
                    <button
                      type="button"
                      onClick={() => setCantidadModal((c) => Math.max(1, c - 1))}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-600 hover:bg-white"
                    >
                      <SvgMinus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 text-sm font-bold font-mono min-w-[28px] text-center">
                      {cantidadModal}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCantidadModal((c) => Math.min(c + 1, varianteActual ? varianteActual.stock : productoDetalle.stock))
                      }
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-600 hover:bg-white"
                    >
                      <SvgPlus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {(varianteActual ? varianteActual.stock : productoDetalle.stock) > 0 ? "Disponible en Boutique" : "Agotado"}
                  </span>
                </div>

                {/* Botón Añadir al Carrito */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={!!productoDetalle.variantes?.length && (!varianteActual || varianteActual.stock <= 0)}
                    onClick={() => {
                      const etiquetaVariante = [colorModal, tallaModal].filter(Boolean).join(" — ") || tallaModal;
                      agregarAlCarritoConTalla(resolverProductoParaCarrito(productoDetalle), etiquetaVariante, cantidadModal);
                      setTimeout(() => cerrarDetalle(), 700);
                    }}
                    className="w-full py-3.5 rounded-full font-bold text-xs tracking-[0.15em] uppercase transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: agregadoAnim ? "#059669" : "#1e293b",
                      color: "#ffffff"
                    }}
                  >
                    <SvgBag className="w-4 h-4" />
                    <span>{agregadoAnim ? "Añadido a la Bolsa" : "Añadir a la Bolsa"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. BOLSA (panel lateral) + CHECKOUT (página dedicada de pantalla completa) */}
      {drawerAbierto && (
        <div className={
          mostrandoCheckout || pedidoConfirmado
            ? "fixed inset-0 z-50 bg-white overflow-y-auto animate-fade-in"
            : "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-fade-in"
        }>
          <div
            className={
              mostrandoCheckout || pedidoConfirmado
                ? "relative w-full max-w-2xl mx-auto min-h-full flex flex-col"
                : "relative w-full max-w-lg bg-white h-full flex flex-col shadow-2xl overflow-hidden"
            }
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Carrito / Checkout */}
            <div className="sticky top-0 z-10 px-6 py-5 border-b border-neutral-200 bg-white/95 backdrop-blur-sm flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {mostrandoCheckout && !pedidoConfirmado ? (
                  <button
                    type="button"
                    onClick={() => setMostrandoCheckout(false)}
                    className="flex items-center gap-1.5 text-neutral-500 hover:text-neutral-950 transition-colors text-xs font-bold uppercase tracking-wider"
                  >
                    <span aria-hidden>←</span> Volver a la Bolsa
                  </button>
                ) : (
                  <>
                    <SvgBag className="w-5 h-5 text-neutral-950" />
                    <h3 className="text-base font-['Cormorant_Garamond',serif] font-semibold text-neutral-950 uppercase tracking-wide">
                      {pedidoConfirmado ? "Tu Pedido" : `Bolsa de Compras (${totalItems})`}
                    </h3>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={cerrarDrawerCarrito}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-500 hover:text-neutral-950 transition-colors"
              >
                <SvgClose className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido del Carrito */}
            {pedidoConfirmado ? (
              <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                  <SvgCheckCircle className="w-10 h-10" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600">
                  Orden Confirmada
                </span>
                <h4 className="text-2xl font-black text-neutral-950 font-mono mt-1">
                  #{pedidoConfirmado.numeroPedido}
                </h4>
                <p className="text-xs text-neutral-500 mt-2 max-w-xs leading-relaxed">
                  {(() => {
                    const requierePago = pedidoConfirmado.metodoPago !== "EFECTIVO_USD" && pedidoConfirmado.metodoPago !== "EFECTIVO_BS";
                    if (requierePago && !comprobanteSubido) return "Realiza el pago con los datos de abajo y notifícanos con la captura para confirmar tu orden más rápido.";
                    if (requierePago && comprobanteSubido) return "Ya recibimos tu comprobante — lo estamos verificando. Puedes escribirnos por WhatsApp si quieres coordinar el despacho de una vez.";
                    return "Tu orden ha sido registrada con los datos de entrega y monto oficial. La tienda se pondrá en contacto contigo al teléfono que dejaste.";
                  })()}
                </p>

                <div className="w-full mt-6 space-y-3">
                  {/* 1. Instrucciones de pago reales — mismos datos que se mostraron al
                      elegir el método, para que no tenga que volver atrás a buscarlos. */}
                  {pedidoConfirmado.metodoPago === "PAGO_MOVIL" && tienda.pagoMovil?.activo && (
                    <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1.5 text-left">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span>Datos de Pago Móvil</span>
                        <span className="font-mono text-rose-600">{pedidoConfirmado.totalBs.toFixed(2)} Bs.</span>
                      </div>
                      <div className="text-[11px] text-neutral-600 font-mono space-y-0.5">
                        <div><span className="text-neutral-400 font-sans">Banco:</span> {tienda.pagoMovil.banco}</div>
                        <div><span className="text-neutral-400 font-sans">Teléfono:</span> {tienda.pagoMovil.telefono}</div>
                        <div><span className="text-neutral-400 font-sans">RIF:</span> {tienda.pagoMovil.documento}</div>
                        {tienda.pagoMovil.titular && <div><span className="text-neutral-400 font-sans">Titular:</span> {tienda.pagoMovil.titular}</div>}
                      </div>
                    </div>
                  )}
                  {pedidoConfirmado.metodoPago === "BINANCE" && tienda.binance?.activo && (
                    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs space-y-1 text-left">
                      <span className="font-bold text-amber-900 block">Binance Pay (USDT)</span>
                      <p className="text-[11px] text-amber-800">Transfiere <strong className="text-black">${pedidoConfirmado.totalUsd.toFixed(2)} USDT</strong> al Pay ID:</p>
                      <p className="font-mono font-bold text-amber-900">{tienda.binance.payId}</p>
                    </div>
                  )}
                  {pedidoConfirmado.metodoPago === "ZELLE" && tienda.zelle?.activo && (
                    <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-xs space-y-1 text-left">
                      <span className="font-bold text-neutral-900 block">Zelle</span>
                      <p className="text-[11px] text-neutral-600">Envía <strong className="text-black">{SIMB}{pedidoConfirmado.totalUsd.toFixed(2)} {COD}</strong> a:</p>
                      <p className="font-mono font-bold text-neutral-900">{tienda.zelle.correo}</p>
                      {tienda.zelle.titular && <p className="text-[11px] text-neutral-600">Titular: {tienda.zelle.titular}</p>}
                    </div>
                  )}
                  {pedidoConfirmado.metodoPago === "BANCOLOMBIA" && tienda.bancolombia?.activo && (
                    <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-xs space-y-1 text-left">
                      <span className="font-bold text-neutral-900 block">Bancolombia</span>
                      <div className="text-[11px] text-neutral-600 font-mono space-y-0.5 pt-1">
                        <div><span className="text-neutral-400 font-sans">Cuenta {tienda.bancolombia.tipoCuenta}:</span> {tienda.bancolombia.cuenta}</div>
                        <div><span className="text-neutral-400 font-sans">Titular:</span> {tienda.bancolombia.titular}</div>
                      </div>
                    </div>
                  )}

                  {/* 2. Notificar pago (subir captura) — acción principal mientras no se
                      haya enviado; efectivo no la necesita, ahí no hay nada que capturar. */}
                  {pedidoConfirmado.metodoPago !== "EFECTIVO_USD" && pedidoConfirmado.metodoPago !== "EFECTIVO_BS" && (
                    comprobanteSubido ? (
                      <div className="w-full py-3 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs uppercase tracking-[0.15em] flex items-center justify-center gap-2">
                        <SvgCheckCircle className="w-4 h-4" />
                        <span>Comprobante Recibido</span>
                      </div>
                    ) : (
                      <div className="w-full">
                        <input
                          ref={comprobanteInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) subirComprobantePago(file);
                          }}
                        />
                        <button
                          type="button"
                          disabled={comprobanteSubiendo}
                          onClick={() => comprobanteInputRef.current?.click()}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-[0.15em] transition-all disabled:opacity-50"
                        >
                          <SvgUpload className="w-4 h-4" />
                          <span>{comprobanteSubiendo ? "Subiendo..." : "Notificar Pago (Subir Captura)"}</span>
                        </button>
                        {errorComprobante && (
                          <p className="text-[11px] text-rose-500 mt-1.5 text-center">{errorComprobante}</p>
                        )}
                        {pedidoConfirmado.accessToken && emailCliente.trim() && (
                          <p className="text-[10px] text-neutral-400 mt-1.5 text-center">
                            Cuando confirmemos tu pago, te llega el comprobante a {emailCliente.trim()}.
                          </p>
                        )}
                      </div>
                    )
                  )}

                  {/* 3. WhatsApp — disponible siempre, pero es el paso natural DESPUÉS de
                      notificar el pago (o inmediato si el método es efectivo). */}
                  {pedidoConfirmado.whatsappUrl && (
                    <a
                      href={pedidoConfirmado.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-[0.15em] shadow-lg shadow-emerald-500/25 transition-all"
                    >
                      <SvgWhatsApp className="w-5 h-5" />
                      <span>Escribir por WhatsApp con el Pedido</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => generarComprobantePedidoPDF(pedidoConfirmado, tienda.nombreTienda, tienda.logoBase64)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs uppercase tracking-[0.15em] transition-all"
                  >
                    <SvgDownload className="w-4 h-4" />
                    <span>Descargar Comprobante PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPedidoConfirmado(null);
                      setComprobanteSubido(false);
                      setErrorComprobante(null);
                      cerrarDrawerCarrito();
                    }}
                    className="w-full py-2.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-xs font-bold uppercase tracking-[0.15em] text-neutral-700 transition-colors"
                  >
                    Hacer otro pedido
                  </button>
                </div>
              </div>
            ) : mostrandoCheckout ? (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* PASO CHECKOUT: Formulario de Envío y Pago — la lista de artículos ya
                    se vio y confirmó en la Bolsa (paso anterior), acá no se repite. */}
                {carrito.length > 0 && (
                  <div className="p-5 rounded-2xl bg-white border border-neutral-200 space-y-4">
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400 block">
                      Método de Despacho
                    </span>

                    {/* Selector Delivery / Pickup */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setTipoEntrega("DELIVERY")}
                        className="py-2.5 rounded-2xl border text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                        style={{
                          backgroundColor: tipoEntrega === "DELIVERY" ? "#171717" : "#f5f5f5",
                          color: tipoEntrega === "DELIVERY" ? "#ffffff" : "#525252",
                          borderColor: tipoEntrega === "DELIVERY" ? "#171717" : "#e5e5e5"
                        }}
                      >
                        <SvgTruck className="w-4 h-4" style={{ color: tipoEntrega === "DELIVERY" ? "#ffffff" : "#525252" }} />
                        <span style={{ color: tipoEntrega === "DELIVERY" ? "#ffffff" : "#525252" }}>Delivery</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTipoEntrega("PICKUP")}
                        className="py-2.5 rounded-2xl border text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                        style={{
                          backgroundColor: tipoEntrega === "PICKUP" ? "#171717" : "#f5f5f5",
                          color: tipoEntrega === "PICKUP" ? "#ffffff" : "#525252",
                          borderColor: tipoEntrega === "PICKUP" ? "#171717" : "#e5e5e5"
                        }}
                      >
                        <SvgStore className="w-4 h-4" style={{ color: tipoEntrega === "PICKUP" ? "#ffffff" : "#525252" }} />
                        <span style={{ color: tipoEntrega === "PICKUP" ? "#ffffff" : "#525252" }}>Retiro en Boutique</span>
                      </button>
                    </div>

                    {/* Campos de Contacto */}
                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-600 tracking-[0.15em] uppercase mb-1">
                          Nombre y Apellido *
                        </label>
                        <input
                          type="text"
                          required
                          value={nombreCliente}
                          onChange={(e) => setNombreCliente(e.target.value)}
                          placeholder="Ej: Daniel Reina"
                          className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-900 font-medium focus:outline-none focus:border-neutral-950 focus:bg-white transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-neutral-600 tracking-[0.15em] uppercase mb-1">
                          Teléfono o WhatsApp *
                        </label>
                        <input
                          type="tel"
                          required
                          value={telefonoCliente}
                          onChange={(e) => setTelefonoCliente(e.target.value)}
                          placeholder="Ej: 04141234567"
                          className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-900 font-medium focus:outline-none focus:border-neutral-950 focus:bg-white transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-neutral-600 tracking-[0.15em] uppercase mb-1">
                          Correo Electrónico (Opcional)
                        </label>
                        <input
                          type="email"
                          value={emailCliente}
                          onChange={(e) => setEmailCliente(e.target.value)}
                          placeholder="Para enviarte el comprobante cuando confirmemos tu pago"
                          className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-900 font-medium focus:outline-none focus:border-neutral-950 focus:bg-white transition-all"
                        />
                      </div>

                      {tipoEntrega === "DELIVERY" && (
                        <div>
                          <label className="block text-[10px] font-bold text-neutral-600 tracking-[0.15em] uppercase mb-1">
                            Dirección de Entrega *
                          </label>
                          <input
                            type="text"
                            required
                            value={direccionEntrega}
                            onChange={(e) => setDireccionEntrega(e.target.value)}
                            placeholder="Calle, Edificio, Apartamento o Punto de Referencia"
                            className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-900 font-medium focus:outline-none focus:border-neutral-950 focus:bg-white transition-all"
                          />
                        </div>
                      )}

                      {/* Método de Pago */}
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-600 tracking-[0.15em] uppercase mb-1">
                          Método de Pago
                        </label>
                        <select
                          value={metodoPago}
                          onChange={(e) => setMetodoPago(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-900 font-medium focus:outline-none focus:border-neutral-950 focus:bg-white"
                        >
                          {!sinBs && tienda.pagoMovil?.activo && <option value="PAGO_MOVIL">Pago Móvil (Bolívares al BCV)</option>}
                          {!esEuro && tienda.binance?.activo && <option value="BINANCE">Binance Pay (USDT sin comisiones)</option>}
                          {!esEuro && tienda.zelle?.activo && <option value="ZELLE">Zelle</option>}
                          {!esEuro && tienda.bancolombia?.activo && <option value="BANCOLOMBIA">Bancolombia</option>}
                          <option value="EFECTIVO_USD">{esEuro ? "Efectivo (€ EUR)" : "Efectivo Divisas ($ USD)"}</option>
                          {!sinBs && <option value="EFECTIVO_BS">Efectivo Bolívares (Bs.)</option>}
                          <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                        </select>
                      </div>

                      {/* Caja de Datos de Pago Móvil con Botón de Copiar y Referencia */}
                      {metodoPago === "PAGO_MOVIL" && tienda.pagoMovil?.activo && (
                        <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span>Datos Oficiales Pago Móvil</span>
                            <span className="font-mono text-rose-600 font-bold">
                              {totalBs.toFixed(2)} Bs.
                            </span>
                          </div>

                          <div className="text-[11px] text-neutral-600 font-mono space-y-0.5">
                            <div>
                              <span className="text-neutral-400 font-sans">Banco:</span>{" "}
                              {tienda.pagoMovil.banco}
                            </div>
                            <div>
                              <span className="text-neutral-400 font-sans">Teléfono:</span>{" "}
                              {tienda.pagoMovil.telefono}
                            </div>
                            <div>
                              <span className="text-neutral-400 font-sans">RIF:</span>{" "}
                              {tienda.pagoMovil.documento}
                            </div>
                            {tienda.pagoMovil.titular && (
                              <div>
                                <span className="text-neutral-400 font-sans">Titular:</span>{" "}
                                {tienda.pagoMovil.titular}
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={handleCopiarPagoMovil}
                            className="w-full py-1.5 rounded-xl bg-white border border-neutral-300 hover:bg-neutral-100 text-[11px] font-bold text-neutral-800 flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <SvgCopy className="w-3.5 h-3.5" />
                            <span>
                              {copiadoPagoMovil
                                ? "Datos Copiados al Portapapeles"
                                : "Copiar Datos de Pago Móvil"}
                            </span>
                          </button>

                          <div className="pt-2">
                            <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">
                              Número de Referencia Bancaria (Opcional)
                            </label>
                            <input
                              type="text"
                              value={numeroReferencia}
                              onChange={(e) => setNumeroReferencia(e.target.value)}
                              placeholder="Últimos 4 o 6 dígitos de la transferencia"
                              className="w-full px-3 py-1.5 rounded-xl bg-white border border-neutral-200 text-xs font-mono focus:outline-none"
                            />
                          </div>
                        </div>
                      )}

                      {metodoPago === "BINANCE" && tienda.binance?.activo && (
                        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs space-y-1">
                          <span className="font-bold text-amber-900 block">
                            Binance Pay (USDT)
                          </span>
                          <p className="text-[11px] text-amber-800">
                            Transfiere exactamente <strong className="text-black">${totalUsd.toFixed(2)} USDT</strong> al Pay ID:
                          </p>
                          <p className="font-mono font-bold text-amber-900">{tienda.binance.payId}</p>
                        </div>
                      )}

                      {metodoPago === "ZELLE" && tienda.zelle?.activo && (
                        <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-xs space-y-1">
                          <span className="font-bold text-neutral-900 block">Zelle</span>
                          <p className="text-[11px] text-neutral-600">
                            Envía <strong className="text-black">{SIMB}{totalUsd.toFixed(2)} {COD}</strong> a:
                          </p>
                          <p className="font-mono font-bold text-neutral-900">{tienda.zelle.correo}</p>
                          {tienda.zelle.titular && <p className="text-[11px] text-neutral-600">Titular: {tienda.zelle.titular}</p>}
                        </div>
                      )}

                      {metodoPago === "BANCOLOMBIA" && tienda.bancolombia?.activo && (
                        <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-xs space-y-1">
                          <span className="font-bold text-neutral-900 block">Bancolombia</span>
                          <div className="text-[11px] text-neutral-600 font-mono space-y-0.5 pt-1">
                            <div><span className="text-neutral-400 font-sans">Cuenta {tienda.bancolombia.tipoCuenta}:</span> {tienda.bancolombia.cuenta}</div>
                            <div><span className="text-neutral-400 font-sans">Titular:</span> {tienda.bancolombia.titular}</div>
                            {tienda.bancolombia.documento && <div><span className="text-neutral-400 font-sans">Documento:</span> {tienda.bancolombia.documento}</div>}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] font-bold text-neutral-600 tracking-[0.15em] uppercase mb-1">
                          Instrucciones Especiales (Opcional)
                        </label>
                        <input
                          type="text"
                          value={notas}
                          onChange={(e) => setNotas(e.target.value)}
                          placeholder="Ej: Empaque para obsequio / Recibir después de las 2pm"
                          className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-900 font-medium focus:outline-none focus:border-neutral-950 focus:bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* PASO BOLSA: solo los artículos — el formulario de entrega y pago
                    vive en su propia página de Checkout (paso siguiente). */}
                {carrito.length === 0 ? (
                  <div className="py-16 text-center text-neutral-400">
                    <SvgBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-semibold text-neutral-700 font-['Cormorant_Garamond',serif]">Tu bolsa está vacía</p>
                    <p className="text-xs text-neutral-400 mt-1">
                      Selecciona artículos de la colección para comenzar tu pedido.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {carrito.map((item) => {
                      const subUsd = item.producto.precioUsd * item.cantidad;
                      return (
                        <div
                          key={`${item.producto.id}-${item.tallaSeleccionada}`}
                          className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <h5 className="text-sm font-['Cormorant_Garamond',serif] font-semibold text-neutral-950 truncate">
                              {item.producto.nombre}
                            </h5>
                            <div className="text-[11px] text-neutral-500 mt-0.5 flex items-center gap-2">
                              <span className="font-medium bg-white px-2 py-0.5 rounded border border-neutral-200 text-[10px]">
                                {item.tallaSeleccionada}
                              </span>
                              <span className="font-mono text-rose-600 font-bold">
                                {SIMB}{item.producto.precioUsd.toFixed(2)} c/u
                              </span>
                            </div>
                          </div>

                          {/* Controles */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="flex items-center bg-white border border-neutral-200 rounded-xl p-0.5 shadow-sm">
                              <button
                                type="button"
                                onClick={() =>
                                  modificarCantidad(item.producto.id, item.tallaSeleccionada, -1)
                                }
                                className="w-6 h-6 flex items-center justify-center text-neutral-500 hover:text-neutral-900"
                              >
                                <SvgMinus className="w-3 h-3" />
                              </button>
                              <span className="px-2 text-xs font-mono font-bold min-w-[20px] text-center">
                                {item.cantidad}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  modificarCantidad(item.producto.id, item.tallaSeleccionada, 1)
                                }
                                className="w-6 h-6 flex items-center justify-center text-neutral-500 hover:text-neutral-900"
                              >
                                <SvgPlus className="w-3 h-3" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                eliminarDelCarrito(item.producto.id, item.tallaSeleccionada)
                              }
                              className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-rose-600 transition-colors"
                            >
                              <SvgTrash className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Footer de la Bolsa (paso 1): solo subtotal + pasar al Checkout */}
            {carrito.length > 0 && !pedidoConfirmado && !mostrandoCheckout && (
              <div className="sticky bottom-0 p-6 border-t border-neutral-200 bg-white/95 backdrop-blur-sm shadow-[0_-8px_24px_rgba(0,0,0,0.05)] space-y-3">
                <div className="flex justify-between items-baseline text-sm">
                  <span className="text-neutral-500 font-mono">Subtotal ({totalItems} artículo{totalItems === 1 ? "" : "s"})</span>
                  <span className="font-bold text-neutral-900 font-mono">{SIMB}{subtotalUsd.toFixed(2)} {COD}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMostrandoCheckout(true)}
                  className="w-full py-3 rounded-full font-bold text-xs uppercase tracking-[0.15em] transition-all shadow-md active:scale-95"
                  style={{ backgroundColor: "#171717", color: "#ffffff" }}
                >
                  Proceder al Checkout →
                </button>
              </div>
            )}

            {/* Footer del Checkout (paso 2): totales completos + confirmar */}
            {carrito.length > 0 && !pedidoConfirmado && mostrandoCheckout && (
              <div className="sticky bottom-0 p-6 border-t border-neutral-200 bg-white/95 backdrop-blur-sm shadow-[0_-8px_24px_rgba(0,0,0,0.05)] space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-neutral-500 font-mono">
                    <span>Subtotal Divisas:</span>
                    <span className="font-bold text-neutral-900">{SIMB}{subtotalUsd.toFixed(2)} {COD}</span>
                  </div>
                  {costoEnvio > 0 && (
                    <div className="flex justify-between text-xs text-neutral-500 font-mono">
                      <span>Envío (Delivery):</span>
                      <span className="font-bold text-neutral-900">{SIMB}{costoEnvio.toFixed(2)} {COD}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-neutral-500 font-mono">
                    <span>Total Divisas:</span>
                    <span className="font-bold text-neutral-900">{SIMB}{totalUsd.toFixed(2)} {COD}</span>
                  </div>
                  <div style={sinBs ? { display: "none" } : undefined} className="flex justify-between text-xs text-neutral-500 font-mono">
                    <span>Total Bolívares (BCV {tasa.toFixed(2)}):</span>
                    <span className="font-bold text-rose-600 text-sm">{totalBs.toFixed(2)} Bs.</span>
                  </div>
                  {impuestosTienda?.cobraIva && (
                    <p className="text-[10.5px] text-neutral-400">Los montos ya incluyen el IVA ({impuestosTienda.alicuotaIva}%).</p>
                  )}
                  {impuestosTienda?.igtfActivo && (
                    <p className="text-[10.5px] text-neutral-500">
                      Si pagas en divisas se suma el IGTF ({impuestosTienda.alicuotaIgtf}%): {SIMB}{(Math.round(totalUsd * impuestosTienda.alicuotaIgtf) / 100).toFixed(2)} {COD}. Pagando en bolívares no aplica.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => procesarPedido(false)}
                    disabled={enviandoPedido}
                    className="w-full py-3 rounded-full font-bold text-xs uppercase tracking-[0.15em] transition-all shadow-md active:scale-95 disabled:opacity-50"
                    style={{ backgroundColor: "#1e293b", color: "#ffffff" }}
                  >
                    {enviandoPedido ? "Procesando..." : "Confirmar Orden"}
                  </button>

                  <button
                    type="button"
                    onClick={() => procesarPedido(true)}
                    disabled={enviandoPedido}
                    className="w-full py-3 rounded-full font-bold text-xs uppercase tracking-[0.15em] flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
                    style={{ backgroundColor: "#059669", color: "#ffffff" }}
                  >
                    <SvgWhatsApp className="w-4 h-4" style={{ color: "#ffffff" }} />
                    <span style={{ color: "#ffffff" }}>Pedir por WhatsApp</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Botón Flotante de WhatsApp en la esquina inferior derecha */}
      {phoneHref && (
                <a
          href={phoneHref}
          target="_blank"
          rel="noopener noreferrer"
          title="Atencion directa por WhatsApp"
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300"
          style={{ backgroundColor: "#059669", color: "#ffffff" }}
        >
          <SvgWhatsApp className="w-7 h-7" style={{ color: "#ffffff" }} />
        </a>
      )}
    </div>
  );
}
