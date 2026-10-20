import {
  BarChart3,
  ChartLine,
  ChartNoAxesColumn,
  ChartPie,
  CircleDot,
  type LucideIcon,
} from "lucide-react";

import type { ChartType } from "@/lib/chat/types";

export function format(value: number, unit: string) {
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 1,
  }).format(value)} ${unit}`.trim();
}

export function formatTick(value: number, unit: string) {
  if (unit && unit.length <= 2) return format(value, unit);
  return new Intl.NumberFormat("fr-FR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function iconFor(type: ChartType): LucideIcon {
  if (type === "bar") return ChartNoAxesColumn;
  if (type === "area") return BarChart3;
  if (type === "scatter") return CircleDot;
  if (type === "pie" || type === "donut") return ChartPie;
  return ChartLine;
}

export function labelFor(type: ChartType) {
  if (type === "bar") return "Barres";
  if (type === "area") return "Aire";
  if (type === "scatter") return "Nuage";
  if (type === "pie") return "Camembert";
  if (type === "donut") return "Donut";
  return "Courbe";
}
