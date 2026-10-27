"use client";
import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { useReducedMotion } from "framer-motion";
import { useTheme } from "next-themes";
import { echarts, cssColor } from "@/lib/echarts";
import { ATLAS_KIND_TOKENS } from "@/lib/corpus/atlas-palette";
import type { AtlasGraph } from "@/lib/corpus/types";
export type AtlasControls = { zoom: (factor: number) => void; fit: () => void };
export default function AtlasNetwork({
  data,
  selected,
  onSelect,
  ref,
}: {
  data: AtlasGraph;
  selected: string;
  onSelect: (id: string) => void;
  ref?: Ref<AtlasControls>;
}) {
  const node = useRef<HTMLDivElement>(null);
  const chart = useRef<ReturnType<typeof echarts.init> | null>(null);
  const pick = useRef(onSelect);
  pick.current = onSelect;
  const reduced = useReducedMotion();
  const { resolvedTheme } = useTheme();
  useImperativeHandle(
    ref,
    () => ({
      zoom: (zoom) => {
        const c = chart.current;
        if (c)
          c.dispatchAction({
            type: "graphRoam",
            seriesIndex: 0,
            zoom,
            originX: c.getWidth() / 2,
            originY: c.getHeight() / 2,
          });
      },
      fit: () =>
        chart.current?.setOption({
          series: [{ zoom: 1, center: ["50%", "50%"] }],
        }),
    }),
    [],
  );
  useEffect(() => {
    if (!node.current) return;
    const c = echarts.init(node.current, undefined, { renderer: "canvas" });
    chart.current = c;
    c.setOption({
      animation: !reduced,
      animationDurationUpdate: 200,
      aria: {
        enabled: true,
        description:
          "Carte des documents et entités. Une liste accessible est disponible dans l’onglet Liste.",
      },
      tooltip: { show: false },
      series: [
        {
          type: "graph",
          layout: reduced ? "circular" : "force",
          roam: true,
          draggable: true,
          scaleLimit: { min: 0.15, max: 8 },
          force: {
            repulsion: 170,
            gravity: 0.06,
            edgeLength: [55, 120],
            friction: 0.65,
            layoutAnimation: !reduced,
          },
          label: {
            show: data.nodes.length < 40,
            color: cssColor("var(--color-ink)"),
            fontSize: 11,
            fontFamily: "Inter",
            position: "right",
            width: 130,
            overflow: "truncate",
          },
          edgeSymbol:
            data.view === "relations" ? ["none", "arrow"] : ["none", "none"],
          edgeSymbolSize: 6,
          lineStyle: {
            color: cssColor("var(--color-steel)"),
            opacity: 0.28,
            curveness: 0.08,
          },
          emphasis: {
            focus: "adjacency",
            label: { show: true },
            lineStyle: { opacity: 0.9, width: 2 },
          },
          data: data.nodes.map((n) => ({
            id: n.id,
            name: n.label,
            symbol: n.kind === "document" ? "roundRect" : "circle",
            symbolSize: Math.min(38, 12 + Math.sqrt(n.degree) * 3),
            itemStyle: {
              color: cssColor(
                `var(${n.kind === "document" ? "--color-navy-ink" : (ATLAS_KIND_TOKENS[n.kind] ?? "--color-teal")})`,
              ),
              borderWidth: 2,
              borderColor: cssColor("var(--color-surface)"),
            },
          })),
          links: data.edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            value: e.weight,
            lineStyle: { type: e.type === "mention" ? "dashed" : "solid" },
          })),
        },
      ],
    });
    c.on("click", (event: unknown) => {
      const e = event as { data?: { id?: string } };
      if (e.data?.id) pick.current(e.data.id);
    });
    let labelsVisible = data.nodes.length < 40;
    c.on("graphroam", (event: unknown) => {
      if (!(event as { zoom?: number }).zoom) return;
      const opt = c.getOption() as { series: { zoom?: number }[] };
      const next = (opt.series[0].zoom ?? 1) > 1.6 || data.nodes.length < 40;
      if (next !== labelsVisible) {
        labelsVisible = next;
        c.setOption({ series: [{ label: { show: next } }] });
      }
    });
    const observer = new ResizeObserver(() => c.resize());
    observer.observe(node.current);
    return () => {
      observer.disconnect();
      c.dispose();
      chart.current = null;
    };
  }, [data, resolvedTheme, reduced]);
  useEffect(() => {
    const c = chart.current;
    if (!c) return;
    c.dispatchAction({ type: "downplay", seriesIndex: 0 });
    const index = data.nodes.findIndex((n) => n.id === selected);
    if (index >= 0)
      c.dispatchAction({ type: "highlight", seriesIndex: 0, dataIndex: index });
  }, [selected, data]);
  return (
    <div
      ref={node}
      className="atlas-network"
      role="img"
      aria-label="Graphe interactif des connaissances. Utilisez la vue Liste pour une navigation au clavier."
    />
  );
}
