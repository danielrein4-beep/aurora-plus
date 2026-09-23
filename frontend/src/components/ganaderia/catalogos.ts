/** Catálogos fijos de Ganadería usados por varias pantallas. */

import { IconBolt, IconBox, IconSyringe, IconTractor, IconTruck, IconUsers, IconWheat, IconWrench } from "../../Icons";

export const CATEGORIAS_GASTO_GANADERIA = [
  { id: "ALIMENTACION", label: "Alimentación / Suplementos / Sal", icon: IconWheat, colorBadge: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  { id: "SANIDAD", label: "Sanidad / Vacunas / Fármacos", icon: IconSyringe, colorBadge: "text-sky-400 bg-sky-500/10 border-sky-500/30" },
  { id: "MANO_DE_OBRA", label: "Mano de Obra / Jornales / Nómina", icon: IconUsers, colorBadge: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  { id: "MANTENIMIENTO", label: "Mantenimiento / Cercas / Potreros", icon: IconWrench, colorBadge: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" },
  { id: "MAQUINARIA", label: "Maquinaria / Repuestos / Combustible", icon: IconTractor, colorBadge: "text-purple-400 bg-purple-500/10 border-purple-500/30" },
  { id: "TRANSPORTE", label: "Fletes / Transporte de Ganado", icon: IconTruck, colorBadge: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
  { id: "SERVICIOS", label: "Servicios Básicos / Electricidad / Agua", icon: IconBolt, colorBadge: "text-orange-400 bg-orange-500/10 border-orange-500/30" },
  { id: "OTROS", label: "Otros Gastos Operativos", icon: IconBox, colorBadge: "text-slate-300 bg-slate-500/10 border-slate-500/30" },
];

// Catálogo sugerido de razas bovinas — se ofrece como datalist (autocompletar)
// pero el campo sigue siendo texto libre por si la raza real no está en la lista.
export const RAZAS_BOVINAS_COMUNES = [
  "Brahman", "Gyr", "Gyrolando", "Pardo Suizo", "Holstein", "Jersey",
  "Angus", "Brangus", "Simmental", "Charolais", "Nelore", "Senepol",
  "Guzerat", "Criollo Limonero", "Carora", "Romosinuano", "Mestizo",
  // Cruces / F1 más comunes en fincas de doble propósito — el campo sigue
  // siendo texto libre, así que cualquier otra combinación se puede escribir igual.
  "F1 Brahman x Gyr", "F1 Brahman x Holstein", "F1 Gyr x Holstein",
  "F1 Pardo Suizo x Cebú", "F1 Angus x Brahman (Brangus)",
  "5/8 Holstein x Cebú", "3/4 Cebú x Europeo", "Cruzado (especificar)",
];
