"use client";

import { useTheme } from "next-themes";

import { chartSeries, chartUnit, SERIES_COLORS } from "@/lib/chat/decision";
import type { TableArtifact } from "@/lib/chat/types";
import { cssColor } from "@/lib/echarts";

import { formatTick } from "./chart-utils";
import { useECharts } from "./use-echarts";

function buildOption(artifact: TableArtifact, isDark: boolean) {
  const data = chartSeries(artifact);
  const labels = data[0]?.points.map((point) => point.label) ?? [];
  if (!data.length || !labels.length) return null;

  const chartType = artifact.decision.chartType ?? "line";
  const unit = chartUnit(artifact);
  const navy = cssColor("var(--color-navy)");
  const navyInk = cssColor("var(--color-navy-ink)");
  const navyDeep = cssColor("var(--color-navy-deep)");
  const ink = cssColor("var(--color-ink)");
  const muted = cssColor("var(--color-ink-muted)");
  const border = cssColor("var(--color-border)");
  const surface = cssColor("var(--color-surface)");
  const palette = SERIES_COLORS.map(cssColor);
  const isPie = chartType === "pie" || chartType === "donut";
  const isCartesian = !isPie;
  const showLegend = data.length > 1 || isPie;

  const pieData = data[0].points.map((point, index) => ({
    name: point.label,
    value: point.value,
    itemStyle: { color: palette[index % palette.length] },
  }));

  const series = isPie
    ? [
        {
          type: "pie" as const,
          radius: chartType === "donut" ? ["42%", "68%"] : ["0%", "68%"],
          center: ["50%", "44%"],
          avoidLabelOverlap: true,
          itemStyle: { borderColor: surface, borderWidth: 2 },
          label: {
            show: true,
            color: ink,
            fontSize: 10,
            formatter: "{b}\n{d}%",
          },
          labelLine: { lineStyle: { color: border } },
          data: pieData,
        },
      ]
    : data.map((item, index) => {
        const color = palette[index % palette.length];
        const values = item.points.map((point) => point.value);
        if (chartType === "bar") {
          return {
            type: "bar" as const,
            name: item.label,
            data: values,
            barMaxWidth: 18,
            itemStyle: { color, borderRadius: [3, 3, 0, 0] },
            emphasis: { focus: "series" as const },
            label: data.length === 1
              ? {
                  show: true,
                  position: "top" as const,
                  color: navyInk,
                  fontSize: 9,
                  formatter: (params: { value?: unknown }) => formatTick(Number(params.value), unit),
                }
              : undefined,
          };
        }
        if (chartType === "scatter") {
          return {
            type: "scatter" as const,
            name: item.label,
            data: values,
            symbolSize: 7,
            itemStyle: { color },
          };
        }
        return {
          type: "line" as const,
          name: item.label,
          data: values,
          smooth: false,
          symbol: "circle" as const,
          symbolSize: 5,
          lineStyle: { width: 2.25, color },
          itemStyle: { color },
          emphasis: { focus: "series" as const },
          areaStyle:
            chartType === "area" || (chartType === "line" && index === 0)
              ? { opacity: chartType === "area" ? 0.08 : 0.04 }
              : undefined,
        };
      });

  return {
    animationDuration: 450,
    color: palette,
    textStyle: { fontFamily: "Inter, ui-sans-serif, sans-serif", color: ink },
    aria: {
      enabled: true,
      description: `${artifact.title}. ${artifact.subtitle}. Source : ${artifact.source}.`,
    },
    tooltip: {
      trigger: isPie ? "item" : "axis",
      axisPointer: { type: "line", lineStyle: { color: navyInk } },
      backgroundColor: isDark ? cssColor("var(--color-surface-alt)") : navyDeep,
      borderColor: isDark ? border : navy,
      borderWidth: 1,
      textStyle: {
        color: isDark ? ink : "#ffffff",
        fontSize: 11,
        fontFamily: "Inter, sans-serif",
      },
      formatter: isPie ? "{b}<br/>{c} ({d}%)" : undefined,
    },
    legend: showLegend
      ? {
          bottom: 0,
          icon: "roundRect",
          itemWidth: 8,
          itemHeight: 8,
          itemGap: 16,
          textStyle: { color: muted, fontSize: 10, fontFamily: "Inter, sans-serif" },
        }
      : undefined,
    grid: isCartesian
      ? {
          left: 44,
          right: 16,
          top: 20,
          bottom: showLegend ? 44 : 28,
        }
      : undefined,
    xAxis: isCartesian
      ? {
          type: "category",
          data: labels,
          boundaryGap: chartType === "bar",
          axisLine: { lineStyle: { color: border } },
          axisTick: { show: false },
          axisLabel: { color: muted, fontSize: 9, interval: 0 },
        }
      : undefined,
    yAxis: isCartesian
      ? {
          type: "value",
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            color: muted,
            fontSize: 9,
            formatter: (value: number) => formatTick(value, unit),
          },
          splitLine: { lineStyle: { color: border, type: "dashed" } },
        }
      : undefined,
    series,
  };
}

export function EChartsChart({
  artifact,
  expanded = false,
}: {
  artifact: TableArtifact;
  expanded?: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const ref = useECharts(() => buildOption(artifact, resolvedTheme === "dark"), [
    artifact,
    resolvedTheme,
  ]);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={`${artifact.title}. ${artifact.subtitle}. Source : ${artifact.source}.`}
      className={
        expanded
          ? "h-[min(68vh,720px)] w-full bg-bg/40 p-3"
          : "h-[260px] w-full bg-bg/40 p-2.5 sm:h-[290px]"
      }
    />
  );
}
