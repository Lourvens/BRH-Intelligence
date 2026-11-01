"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Library,
  MessageSquare,
  Network,
  Shapes,
  Menu,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
  SheetDescription,
} from "@/components/ui/sheet";
const destinations = [
  { href: "/brh-corpus", label: "Documents", icon: Library },
  { href: "/brh-corpus/entities", label: "Entités", icon: Shapes },
  { href: "/brh-corpus/graph", label: "Graphe", icon: Network },
];
export function ResearchHeader() {
  const path = usePathname();
  const active = path.includes("/entities")
    ? "/brh-corpus/entities"
    : path.includes("/graph")
      ? "/brh-corpus/graph"
      : "/brh-corpus";
  return (
    <header className="research-header corpus-header">
      <Link
        href="/"
        className="corpus-wordmark"
        aria-label="BRH Intelligence, accueil"
      >
        <BookOpen size={22} aria-hidden />
        <span>
          BRH <strong>Corpus</strong>
        </span>
      </Link>
      <nav className="corpus-desktop-nav" aria-label="Navigation de recherche">
        {destinations.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={active === href ? "page" : undefined}
          >
            <Icon size={17} aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
      <div className="corpus-header-actions">
        <Link
          href="/assistant"
          className="corpus-assistant-link"
          aria-label="Ouvrir l’assistant"
        >
          <MessageSquare size={17} aria-hidden />
          <span>Assistant</span>
        </Link>
        <ThemeToggle />
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="corpus-menu-trigger"
              aria-label="Ouvrir la navigation"
            >
              <Menu size={21} aria-hidden />
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Votre espace de recherche</SheetTitle>
              <SheetDescription>
                Documents, entités et connexions du corpus BRH.
              </SheetDescription>
            </SheetHeader>
            <nav aria-label="Navigation mobile" className="corpus-mobile-nav">
              {destinations.map(({ href, label, icon: Icon }) => (
                <SheetClose asChild key={href}>
                  <Link
                    href={href}
                    aria-current={active === href ? "page" : undefined}
                  >
                    <Icon size={20} aria-hidden />
                    {label}
                  </Link>
                </SheetClose>
              ))}
              <SheetClose asChild>
                <Link href="/assistant">
                  <MessageSquare size={20} aria-hidden />
                  Assistant
                </Link>
              </SheetClose>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
