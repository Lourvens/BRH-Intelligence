"use client";

import { useEffect, useRef, type DependencyList } from "react";

import { echarts } from "@/lib/echarts";

export function useECharts(
  buildOption: () => object | null,
  deps: DependencyList,
) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const chart = echarts.init(node, undefined, { renderer: "canvas" });
    const option = buildOption();
    if (option) chart.setOption(option as Parameters<typeof chart.setOption>[0]);

    let disposed = false;
    const observer = new ResizeObserver(() => {
      if (!disposed) chart.resize();
    });
    observer.observe(node);

    return () => {
      disposed = true;
      observer.disconnect();
      chart.dispose();
    };
    // The caller owns the dependency list; option builders intentionally stay
    // outside it so a render does not tear down the canvas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}
