"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Compass,
  Library,
  MessageSquare,
  Network,
  Shapes,
  ArrowUpRight,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { motion, MotionConfig } from "framer-motion";

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
  const reading = path.startsWith("/documents/");
  return (
    <MotionConfig reducedMotion="user">
      <header className={`research-header ${reading ? "is-reading" : ""}`}>
        <Link
          href="/"
          className="atlas-brand"
          aria-label="BRH Intelligence, accueil"
        >
          <span className="atlas-brand-mark">
            <Compass size={23} />
          </span>
          <span>
            BRH<span className="font-normal text-ink-muted"> Intelligence</span>
            <small>ATLAS DOCUMENTAIRE</small>
          </span>
        </Link>
        <div className="hidden items-center gap-2 text-caption text-ink-muted md:flex">
          <span className="atlas-live-dot" />
          Publications & savoirs économiques
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/assistant" className="atlas-assistant">
            <MessageSquare size={16} />
            <span className="hidden sm:inline">Assistant</span>
            <ArrowUpRight size={14} />
          </Link>
          <ThemeToggle />
        </div>
        <nav
          className={`research-navigation ${reading ? "reader-hidden" : ""}`}
          aria-label="Navigation de recherche"
        >
          <Link
            href="/"
            className="hidden pb-6 pt-2 text-ink-muted xl:block"
            aria-label="Accueil"
          >
            <Compass size={26} />
          </Link>
          {destinations.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={active === href ? "page" : undefined}
              className={active === href ? "active" : ""}
            >
              {active === href && (
                <motion.span
                  layoutId="research-destination"
                  className="atlas-nav-active"
                  transition={{ duration: 0.22 }}
                />
              )}
              <Icon size={21} />
              <span>{label}</span>
            </Link>
          ))}
          <span
            className="mt-auto hidden pb-5 text-ink-muted xl:block"
            aria-hidden
          >
            <BookOpen size={19} />
          </span>
        </nav>
      </header>
    </MotionConfig>
  );
}
