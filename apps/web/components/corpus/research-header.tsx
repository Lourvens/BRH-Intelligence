import { ArrowLeft, Library, MessageSquare } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function ResearchHeader() {
  return (
    <header className="border-b border-border bg-surface">
      <nav aria-label="Navigation de recherche" className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-5 sm:px-8">
        <Link href="/" aria-label="BRH Intelligence — accueil" className="flex items-center gap-2 text-small font-semibold text-navy-ink">
          <ArrowLeft className="size-4" aria-hidden /><span className="hidden sm:inline">BRH Intelligence</span>
        </Link>
        <Link href="/brh-corpus" className="flex flex-1 items-center gap-2 border-l border-border pl-4 text-small font-semibold text-navy-ink">
          <Library className="size-4" aria-hidden /> Corpus
        </Link>
        <Button asChild variant="ghost" size="sm"><Link href="/assistant"><MessageSquare className="size-4" aria-hidden />Assistant</Link></Button>
        <ThemeToggle />
      </nav>
    </header>
  );
}
