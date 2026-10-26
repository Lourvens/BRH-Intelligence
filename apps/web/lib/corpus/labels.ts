import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export const familyLabels: Record<string, string> = {
  circular: "Circulaires et réglementation", inflation: "Notes d’inflation",
  "annual-report": "Rapports et bilans", bulletin: "Bulletins et conjoncture",
  notice: "Avis et communiqués", study: "Études et recherches", unknown: "Non classé",
};
export const entityLabels: Record<string, string> = {
  institution: "Institution", person: "Personne", place: "Lieu", regulation: "Texte réglementaire",
  program: "Programme", instrument: "Instrument financier", indicator: "Indicateur",
};
export const relationshipLabels: Record<string, string> = {
  references: "fait référence à", publishes: "publie", regulates: "réglemente",
  supervises: "supervise", measures: "mesure", reports_on: "documente",
  participates_in: "participe à", finances: "finance", part_of: "fait partie de",
};
export const numberLabel = (value: number) => new Intl.NumberFormat("fr-FR").format(value);
export const dateLabel = (value: string) => format(parseISO(value), "d MMM yyyy", { locale: fr });
