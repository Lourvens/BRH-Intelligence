import { BadgeCheck } from "lucide-react";

const points = [
  { x: 40, y: 55.2, label: "Nov 2022" },
  { x: 120, y: 57.0, label: "Avr 2023" },
  { x: 200, y: 165.0, label: "Oct 2023" },
  { x: 280, y: 132.0, label: "Fév 2024" },
  { x: 360, y: 123.0, label: "Juil 2024" },
  { x: 440, y: 126.0, label: "Déc 2024" },
  { x: 520, y: 114.0, label: "Mai 2025" },
  { x: 580, y: 130.2, label: "Nov 2025" },
];

const xLabels = [
  "Nov 2022",
  "Avr 2023",
  "Oct 2023",
  "Fév 2024",
  "Juil 2024",
  "Mai 2025",
  "Nov 2025",
];

const linePath = points
  .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
  .join(" ");

const areaPath = `${linePath} L ${points.at(-1)?.x} 240 L ${points[0].x} 240 Z`;

export function InflationChart() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="mb-6 flex flex-col justify-between gap-3 border-b border-border pb-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="font-display text-lead font-semibold text-navy">
            Inflation annuelle en Haïti
          </h3>
          <p className="text-caption font-medium text-ink-muted">
            Novembre 2022 → novembre 2025 · Glissement annuel
          </p>
        </div>
        <span className="self-start rounded-md border border-azure/30 bg-surface-alt px-2.5 py-1 text-caption font-semibold text-navy sm:self-auto">
          Série officielle IHSI / BRH
        </span>
      </div>

      <div className="relative h-64 w-full sm:h-72">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex flex-col justify-between text-[11px] text-ink-muted"
        >
          {["50,0 %", "40,0 %", "30,0 %", "20,0 %", "10,0 %"].map((label) => (
            <div key={label} className="border-b border-border pb-1">
              {label}
            </div>
          ))}
        </div>

        <svg
          role="img"
          aria-label="Inflation annuelle en Haïti, de 40,8 % en novembre 2022 à 28,3 % en novembre 2025."
          viewBox="0 0 600 240"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
        >
          <title>Inflation annuelle en Haïti, novembre 2022 à novembre 2025</title>
          <defs>
            <linearGradient id="inflation-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#009CDC" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#009CDC" stopOpacity="0" />
            </linearGradient>
          </defs>

          <path d={areaPath} fill="url(#inflation-area)" />
          <path
            d={linePath}
            fill="none"
            stroke="#031A71"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.75"
          />

          {points.map((point) => (
            <circle
              key={point.label}
              cx={point.x}
              cy={point.y}
              r="3.5"
              fill="#FFFFFF"
              stroke="#031A71"
              strokeWidth="2"
            />
          ))}

          <circle
            className="animate-ping"
            cx="580"
            cy="130.2"
            r="9"
            fill="#009CDC"
            fillOpacity="0.25"
            style={{ transformOrigin: "580px 130.2px" }}
          />
          <circle
            cx="580"
            cy="130.2"
            r="5"
            fill="#009CDC"
            stroke="#FFFFFF"
            strokeWidth="2"
          />
        </svg>

        <div className="pointer-events-none absolute right-1 top-[38%] rounded-md bg-navy px-2.5 py-1 text-caption font-bold text-white shadow-lg">
          Nov 2025 : 28,3 %
        </div>
      </div>

      <div className="mt-4 flex justify-between border-t border-border pt-2 text-[11px] font-medium text-ink-muted">
        {xLabels.map((label, index) => (
          <span
            key={label}
            className={[
              "whitespace-nowrap",
              index === xLabels.length - 1 ? "font-bold text-navy" : "",
              index === 1 || index === 3 || index === 5
                ? "hidden sm:inline"
                : "",
            ].join(" ")}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-[11px] text-ink-muted">
        <span className="flex items-center gap-1">
          <BadgeCheck className="size-3.5 text-azure" aria-hidden />
          Source : IHSI / BRH · Note mensuelle d’inflation, novembre 2025, p. 3
        </span>
        <span className="font-medium text-navy">Extrait sourcé</span>
      </div>
    </div>
  );
}
