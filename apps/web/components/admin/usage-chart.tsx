"use client";

import { useTheme } from "next-themes";
import { cssColor } from "@/lib/echarts";
import { useECharts } from "@/lib/hooks/use-echarts";
import { adminDate, adminNumber } from "@/lib/admin/format";
import type { AdminOverview } from "@/lib/admin/types";

export function UsageChart({ usage }: { usage: AdminOverview["usage"] }) {
  const { resolvedTheme } = useTheme();
  const ref = useECharts(
    () => ({
      animation: false,
      aria: { enabled: true },
      textStyle: {
        fontFamily: "Inter, sans-serif",
        color: cssColor("var(--color-ink-muted)"),
      },
      grid: { left: 42, right: 12, top: 16, bottom: 32 },
      tooltip: { trigger: "axis", renderMode: "richText" },
      xAxis: {
        type: "category",
        data: usage.daily.map((day) => adminDate(day.date, "dd MMM")),
        axisLine: { lineStyle: { color: cssColor("var(--color-border)") } },
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        splitLine: { lineStyle: { color: cssColor("var(--color-border)") } },
      },
      series: [
        {
          name: "Tours enregistrés",
          type: "bar",
          barMaxWidth: 18,
          data: usage.daily.map((day) => day.completed_turns),
          itemStyle: {
            color: cssColor("var(--color-navy-ink)"),
            borderRadius: [3, 3, 0, 0],
          },
        },
      ],
    }),
    [usage, resolvedTheme],
  );
  return (
    <section className="min-w-0 rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lead font-semibold">
            Activité de l’assistant
          </h2>
          <p className="mt-1 text-small text-ink-muted">
            Tours terminés enregistrés · {usage.days} jours · UTC
          </p>
        </div>
        <span className="rounded-lg bg-surface-alt px-3 py-2 text-caption text-navy-ink">
          {adminNumber(usage.total_tokens)} jetons
        </span>
      </div>
      {usage.daily.length ? (
        <div
          ref={ref}
          className="mt-3 h-56 w-full"
          role="img"
          aria-label={`${adminNumber(usage.completed_turns)} tours enregistrés sur ${usage.days} jours`}
        />
      ) : (
        <p className="flex h-56 items-center justify-center text-small text-ink-muted">
          Aucune activité enregistrée sur cette période.
        </p>
      )}
      <p className="border-t border-border pt-3 text-caption leading-relaxed text-ink-muted">
        Source : registre de consommation de l’assistant.{" "}
        {adminNumber(usage.active_identities)} identité(s) anonyme(s) ; ce
        nombre ne représente pas des comptes utilisateurs. Les requêtes sans
        consommation enregistrée sont exclues. Le registre ne couvre pas les
        périodes où le quota quotidien est désactivé.
      </p>
      <table className="sr-only">
        <caption>Tours enregistrés par jour (UTC)</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Tours enregistrés</th>
            <th scope="col">Jetons</th>
          </tr>
        </thead>
        <tbody>
          {usage.daily.map((day) => (
            <tr key={day.date}>
              <th scope="row">{adminDate(day.date, "dd MMM yyyy")}</th>
              <td>{day.completed_turns}</td>
              <td>{day.total_tokens}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
