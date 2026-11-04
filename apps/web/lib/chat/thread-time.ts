import {
  differenceInCalendarDays,
  differenceInHours,
  differenceInMinutes,
  differenceInSeconds,
  format,
  isSameDay,
  parseISO,
  subDays,
} from "date-fns";
import { fr } from "date-fns/locale";

function threadDate(value: string): Date | null {
  const date = parseISO(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Compact French timestamp used in the conversation sidebar. */
export function threadTimestamp(value: string, now = new Date()): string {
  const date = threadDate(value);
  if (!date) return "Date inconnue";
  const seconds = differenceInSeconds(now, date);
  if (seconds < 60) return "à l’instant";
  if (isSameDay(date, now)) {
    const minutes = differenceInMinutes(now, date);
    if (minutes < 60) return `il y a ${minutes} min`;
    return `il y a ${differenceInHours(now, date)} h`;
  }
  if (isSameDay(date, subDays(now, 1))) return "hier";
  if (differenceInCalendarDays(now, date) < 7) {
    return format(date, "EEEE", { locale: fr });
  }
  return date.getFullYear() === now.getFullYear()
    ? format(date, "d MMM", { locale: fr })
    : format(date, "d MMM yyyy", { locale: fr });
}

/** Full date for the native tooltip and accessible `<time>` element. */
export function threadTimestampTitle(value: string): string {
  const date = threadDate(value);
  return date
    ? format(date, "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })
    : "Date inconnue";
}
