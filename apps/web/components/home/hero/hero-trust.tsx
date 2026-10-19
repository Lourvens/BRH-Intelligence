import { BarChart3, BookOpen, Scale, ShieldCheck } from "lucide-react";

const trust = [
  {
    icon: ShieldCheck,
    label: "Corpus francophone",
    tone: "text-navy",
  },
  {
    icon: BookOpen,
    label: "Citations page par page",
    tone: "text-azure",
  },
  {
    icon: Scale,
    label: "Refus explicite",
    tone: "text-gold-ink",
  },
  {
    icon: BarChart3,
    label: "1\u202F169 PDF recensés",
    tone: "text-emerald",
  },
];

export function HeroTrust() {
  return (
    <div className="mt-12 grid grid-cols-2 gap-4 border-t border-border pt-8 md:grid-cols-4">
      {trust.map((item) => {
        const Icon = item.icon;

        return (
          <div
            key={item.label}
            className="flex items-center gap-2.5 rounded-xl border border-border bg-surface p-3 text-caption font-semibold text-ink shadow-sm"
          >
            <Icon className={`size-4 shrink-0 ${item.tone}`} aria-hidden />
            <span>{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}
