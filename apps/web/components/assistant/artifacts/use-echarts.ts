"use client";

import { useEffect, useRef, type DependencyList } from "react";

import { echarts } from "@/lib/echarts";

export function useECharts(
  buildOption: () => object | null,
  deps: DependencyList,
  onClick?: (event: unknown) => void,
) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let disposed = false;
    let chart: ReturnType<typeof echarts.init> | null = null;
    const observer = new ResizeObserver(() => {
      if (!disposed) chart?.resize();
    });

    // One frame of delay lets next-themes finish applying the `.dark` class
    // before the option resolves CSS variables. Without it, the first redraw
    // after a theme switch can read the previous theme's tokens.
    const frame = requestAnimationFrame(() => {
      if (disposed) return;

      chart = echarts.init(node, undefined, { renderer: "canvas" });
      const option = buildOption();
      if (option) {
        chart.setOption(option as Parameters<typeof chart.setOption>[0]);
      }
      if (onClick) chart.on("click", onClick);
      observer.observe(node);
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      chart?.dispose();
    };
    // The caller owns the dependency list; option builders intentionally stay
    // outside it so a render does not tear down the canvas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}
