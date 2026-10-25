export function format(value: number, unit: string) {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value)} ${unit}`.trim();
}

export function formatTick(value: number, unit: string) {
  if (unit && unit.length <= 2) return format(value, unit);
  return new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
