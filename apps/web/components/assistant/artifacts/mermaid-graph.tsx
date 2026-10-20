"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { graphData } from "@/lib/chat/decision";
import type { TableArtifact } from "@/lib/chat/types";
import { cssColor } from "@/lib/echarts";

function labelText(value: string) {
  return value.replace(/["<>\n]/g, " ").replace(/\s+/g, " ").trim();
}

function buildDiagram(
  artifact: TableArtifact,
  colors: string[],
  surface: string,
  ink: string,
  orientation: "TD" | "LR",
) {
  const { nodes, edges } = graphData(artifact);
  const ids = new Map(nodes.map((node, index) => [node.id, `n${index}`]));
  const kinds = [...new Set(nodes.map((node) => node.kind))];
  const lines = [`flowchart ${orientation}`];

  nodes.forEach((node, index) => {
    const meta = [node.kind, node.page ? `p. ${node.page}` : null]
      .filter(Boolean)
      .join(" · ");
    lines.push(`  n${index}["${labelText(node.label)}<br/>${labelText(meta)}"]`);
    lines.push(`  class n${index} kind${kinds.indexOf(node.kind)}`);
  });

  edges.forEach((edge) => {
    const from = ids.get(edge.from);
    const to = ids.get(edge.to);
    if (!from || !to) return;
    const label = edge.label ? `|${labelText(edge.label)}|` : "";
    lines.push(`  ${from} -->${label} ${to}`);
  });

  kinds.forEach((kind, index) => {
    const color = colors[index % colors.length];
    lines.push(
      `  classDef kind${index} fill:${surface},stroke:${color},stroke-width:2px,color:${ink}`,
    );
  });

  return lines.join("\n");
}

export function MermaidGraph({
  artifact,
  expanded = false,
  orientation = "LR",
}: {
  artifact: TableArtifact;
  expanded?: boolean;
  orientation?: "TD" | "LR";
}) {
  const [svg, setSvg] = useState("");
  const [failed, setFailed] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    // `resolvedTheme` is undefined during the first client render. Wait for it
    // so the diagram is rendered once, with the final tokens.
    if (!resolvedTheme) return;

    let cancelled = false;
    setSvg("");
    setFailed(false);

    const colors = [
      cssColor("var(--color-navy-ink)"),
      cssColor("var(--color-azure)"),
      cssColor("var(--color-gold-ink)"),
      cssColor("var(--color-purple)"),
      cssColor("var(--color-teal)"),
      cssColor("var(--color-steel)"),
    ];

    async function render() {
      // Let next-themes apply the theme class before reading CSS variables.
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      if (cancelled) return;

      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "base",
        fontFamily: "Inter, sans-serif",
        themeVariables: {
          primaryColor: cssColor("var(--color-surface)"),
          primaryTextColor: cssColor("var(--color-ink)"),
          primaryBorderColor: cssColor("var(--color-navy-ink)"),
          lineColor: cssColor("var(--color-steel)"),
          secondaryColor: cssColor("var(--color-surface-alt)"),
          tertiaryColor: cssColor("var(--color-bg)"),
          fontSize: "11px",
        },
        flowchart: {
          htmlLabels: true,
          curve: "basis",
          nodeSpacing: 42,
          rankSpacing: 64,
          useMaxWidth: true,
        },
      });

      const diagram = buildDiagram(
        artifact,
        colors,
        cssColor("var(--color-surface)"),
        cssColor("var(--color-ink)"),
        orientation,
      );
      const id = `mermaid-${artifact.id.replace(/[^a-z0-9]/gi, "-")}-${Date.now()}`;
      const result = await mermaid.render(id, diagram);
      if (!cancelled) setSvg(result.svg);
    }

    render().catch(() => {
      if (!cancelled) setFailed(true);
    });

    return () => {
      cancelled = true;
    };
  }, [artifact, orientation, resolvedTheme]);

  if (failed) {
    return (
      <div
        role="alert"
        className="grid min-h-[300px] place-items-center px-6 text-center text-[11px] text-ink-muted"
      >
        Le diagramme n’a pas pu être rendu. Le graphe interactif reste
        disponible.
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="mx-auto h-16 w-2/3" />
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={`${artifact.title}. Diagramme de ${graphData(artifact).nodes.length} nœuds. Source : ${artifact.source}.`}
      className={
        expanded
          ? "mermaid-diagram flex min-h-[min(64vh,680px)] items-center justify-center overflow-auto bg-bg/40 p-4 [&_svg]:h-auto [&_svg]:max-w-full"
          : "mermaid-diagram flex min-h-[300px] items-center justify-center overflow-auto bg-bg/40 p-4 [&_svg]:h-auto [&_svg]:max-w-full"
      }
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
