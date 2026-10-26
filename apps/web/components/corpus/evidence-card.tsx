import Link from "next/link";
import type { Evidence } from "@/lib/corpus/types";

export function EvidenceCard({ evidence }: { evidence: Evidence }) {
  return <div className="border-l-2 border-gold bg-surface-alt/50 p-4">
    <blockquote className="font-reading text-[15px] leading-7 text-ink">{evidence.quote}</blockquote>
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-caption">
      <Link href={`/documents/${evidence.slug}?page=${evidence.page_number}`} className="text-teal underline underline-offset-4">{evidence.title} · p. {evidence.page_number}</Link>
      {evidence.pdf_url ? <a href={evidence.pdf_url} target="_blank" rel="noreferrer" className="text-gold-ink underline underline-offset-4">PDF officiel</a> : null}
    </div>
  </div>;
}
