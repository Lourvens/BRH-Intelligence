import { ResearchLink } from "./research-link";
import { ArrowUpRight, FileText, Quote } from "lucide-react";
import type { Evidence } from "@/lib/corpus/types";
export function EvidenceCard({ evidence }: { evidence: Evidence }) {
  return (
    <div className="atlas-evidence">
      <Quote size={20} className="mb-3 text-gold-ink" aria-hidden />
      <blockquote className="font-reading text-[15px] leading-7 text-ink">
        {evidence.quote}
      </blockquote>
      <div className="mt-4 flex flex-wrap items-start gap-3 border-t border-border pt-4 text-caption">
        <ResearchLink
          href={`/documents/${evidence.slug}?page=${evidence.page_number}`}
          className="flex items-start gap-2 text-teal"
        >
          <FileText size={15} className="mt-0.5 shrink-0" />
          <span>
            {evidence.title}
            <strong className="mt-1 block font-medium">
              Page {evidence.page_number}{" "}
              <ArrowUpRight size={12} className="inline" />
            </strong>
          </span>
        </ResearchLink>
        {evidence.pdf_url && (
          <a
            href={evidence.pdf_url}
            target="_blank"
            rel="noreferrer"
            className="ml-auto min-h-8 text-gold-ink underline underline-offset-4"
          >
            PDF officiel
          </a>
        )}
      </div>
    </div>
  );
}
