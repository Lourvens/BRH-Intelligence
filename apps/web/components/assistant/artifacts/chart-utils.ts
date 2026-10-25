import {
  BarChart3,
  ChartLine,
  ChartNoAxesColumn,
  ChartPie,
  CircleDot,
  type LucideIcon,
} from "lucide-react";

import type { ChartType } from "@/lib/chat/types";

export { format, formatTick } from "@/lib/charts/format";

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
