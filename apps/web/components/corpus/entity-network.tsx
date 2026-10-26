"use client";

import { useReducedMotion } from "framer-motion";
import { useTheme } from "next-themes";
import { useECharts } from "@/components/assistant/artifacts/use-echarts";
import { researchGraphOption } from "@/lib/corpus/graph";
import type { GraphResult } from "@/lib/corpus/types";

export default function EntityNetwork({ graph, onSelect }: { graph: GraphResult; onSelect: (kind: string, id: string) => void }) {
  const { resolvedTheme } = useTheme();
  const reduceMotion = useReducedMotion();
  const ref = useECharts(() => researchGraphOption(graph, Boolean(reduceMotion)), [graph, resolvedTheme, reduceMotion, onSelect], (event) => {
    const click = event as { dataType?: string; data?: { id?: string } };
    if (click.data?.id && click.dataType) onSelect(click.dataType, click.data.id);
  });
  return <div ref={ref} role="img" aria-label="Réseau des entités. Les mêmes relations sont accessibles dans la liste ci-dessous." className="h-[440px] w-full bg-surface" />;
}
