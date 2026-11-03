import {
  ArrowRight,
  BookOpen,
  FileText,
  Network,
  Quote,
  Search,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export type LandingIconName =
  | "arrow"
  | "search"
  | "book"
  | "nodes"
  | "quote"
  | "shield"
  | "file";

const icons: Record<LandingIconName, LucideIcon> = {
  arrow: ArrowRight,
  search: Search,
  book: BookOpen,
  nodes: Network,
  quote: Quote,
  shield: ShieldCheck,
  file: FileText,
};

export function LandingIcon({
  name,
  size = 20,
  className,
}: {
  name: LandingIconName;
  size?: number;
  className?: string;
}) {
  const Icon = icons[name];

  return (
    <Icon
      size={size}
      strokeWidth={1.7}
      className={className}
      aria-hidden
    />
  );
}
