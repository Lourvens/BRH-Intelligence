import { chartSeries, chartUnit } from "@/lib/chat/decision";
import type { TableArtifact } from "@/lib/chat/types";
import { formatTick } from "./format";

export type ChartColors = {
  ink: string;
  muted: string;
  border: string;
  surface: string;
  palette: string[];
};

export function buildChartOption(artifact: TableArtifact, colors: ChartColors, reduceMotion: boolean) {
  const data = chartSeries(artifact);
  const labels = data[0]?.points.map((point) => point.label) ?? [];
  if (!data.length || !labels.length) return null;

  const { ink, muted, border, surface, palette } = colors;
  const chartType = artifact.decision.chartType ?? "line";
  const unit = chartUnit(artifact);
  const isPie = chartType === "pie" || chartType === "donut";
  const showLegend = data.length > 1 || isPie;
  const series = isPie ? [{
    type: "pie" as const,
    radius: chartType === "donut" ? ["42%", "66%"] : ["0%", "66%"],
    center: ["50%", "44%"],
    avoidLabelOverlap: true,
    itemStyle: { borderColor: surface, borderWidth: 2, borderRadius: 0 },
    label: { show: true, color: ink, fontSize: 12, formatter: "{d}%" },
    labelLine: { lineStyle: { color: border } },
    labelLayout: { hideOverlap: true },
    data: data[0].points.map((point, index) => ({ name: point.label, value: point.value, itemStyle: { color: palette[index % palette.length] } })),
  }] : data.map((item, index) => {
    const color = palette[index % palette.length];
    const values = item.points.map((point) => point.value);
    if (chartType === "bar") return {
      type: "bar" as const, name: item.label, data: values,
      barMaxWidth: 32, itemStyle: { color, borderRadius: 0 },
      emphasis: { focus: "series" as const },
    };
    if (chartType === "scatter") return {
      type: "scatter" as const, name: item.label, data: values,
      symbolSize: 8, itemStyle: { color },
    };
    return {
      type: "line" as const, name: item.label, data: values,
      smooth: false, symbol: "circle" as const, symbolSize: 6,
      lineStyle: { width: 2.5, color }, itemStyle: { color },
      emphasis: { focus: "series" as const },
      areaStyle: chartType === "area" ? { color, opacity: 0.12 } : undefined,
    };
  });

  return {
    animation: !reduceMotion,
    animationDuration: 200,
    color: palette,
    backgroundColor: surface,
    textStyle: { fontFamily: "Inter, ui-sans-serif, sans-serif", color: ink },
    aria: { enabled: true, description: `${artifact.title}. ${artifact.subtitle}. Source : ${artifact.source}.` },
    tooltip: {
      trigger: isPie ? "item" : "axis",
      confine: true,
      axisPointer: { type: chartType === "bar" ? "shadow" : "line" },
      backgroundColor: surface, borderColor: border, borderWidth: 1,
      padding: [10, 12],
      textStyle: { color: ink, fontSize: 12, fontFamily: "Inter, sans-serif" },
      extraCssText: "box-shadow:none;border-radius:2px;max-width:280px;white-space:normal;",
      formatter: isPie ? "{b}<br/>{c} ({d}%)" : undefined,
      valueFormatter: (value: unknown) => formatTick(Number(value), unit),
    },
    legend: showLegend ? {
      type: "scroll", bottom: 4, left: "center", width: "90%",
      icon: "rect", itemWidth: 10, itemHeight: 10, itemGap: 18,
      textStyle: { color: muted, fontSize: 12, fontFamily: "Inter, sans-serif" },
      pageTextStyle: { color: muted },
    } : undefined,
    grid: !isPie ? { left: 12, right: 20, top: 28, bottom: showLegend ? 56 : 16, containLabel: true } : undefined,
    xAxis: !isPie ? {
      type: "category", data: labels, boundaryGap: chartType === "bar",
      axisLine: { lineStyle: { color: border } }, axisTick: { show: false },
      axisLabel: { color: muted, fontSize: 11, interval: "auto", hideOverlap: true, margin: 12, width: 85, overflow: "truncate" },
    } : undefined,
    yAxis: !isPie ? {
      type: "value", axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: muted, fontSize: 11, formatter: (value: number) => formatTick(value, unit) },
      splitLine: { lineStyle: { color: border, type: "solid" } },
    } : undefined,
    series,
  };
}
