import {
  BarChart,
  GraphChart,
  LineChart,
  PieChart,
  ScatterChart,
} from "echarts/charts";
import {
  AriaComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  LineChart,
  BarChart,
  PieChart,
  ScatterChart,
  GraphChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  AriaComponent,
  CanvasRenderer,
]);

export { echarts };

/** Resolve a BRH CSS custom property to a concrete colour for canvas charts. */
export function cssColor(value: string) {
  if (!value.startsWith("var(")) return value;
  const name = value.slice(4, -1).trim();
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    value
  );
}
