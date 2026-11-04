import { UTCDate } from "@date-fns/utc";
import { format, isValid } from "date-fns";
import { fr } from "date-fns/locale";

const numbers = new Intl.NumberFormat("fr-HT");
export function adminNumber(value: number | null | undefined) {
  return value == null ? "Indisponible" : numbers.format(value);
}
export function adminDate(
  value: string | null | undefined,
  pattern = "dd MMM yyyy, HH:mm 'UTC'",
) {
  if (!value) return "Indisponible";
  const date = new UTCDate(value);
  return isValid(date)
    ? format(date, pattern, { locale: fr })
    : "Date inconnue";
}
