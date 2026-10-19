/**
 * Welcome-page content, split by section so each file stays small.
 *
 * Facts are grounded in the OCR corpus under `data/ocr/` and the crawl ledger.
 * Keep `source`, `page` and `date` attached to every claim — the UI uses them
 * as citations.
 */
export { hero, demo } from "./hero";
export { corpus, inflationSeries } from "./corpus";
export { questionsSection, questions } from "./questions";
export type { QuestionExample } from "./questions";
export { method } from "./method";
export { limitsSection, finalCta, footer } from "./closing";
