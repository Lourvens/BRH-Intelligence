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
