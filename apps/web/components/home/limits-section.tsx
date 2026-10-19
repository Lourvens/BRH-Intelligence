import {
  ClockIcon,
  LanguageIcon,
  RefusalGateIcon,
  ShieldCheckIcon,
} from "@/components/illustrations/icons";
import { SectionHeading } from "@/components/home/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { limitsSection } from "@/lib/content/home";

const icons = [
  LanguageIcon,
  ClockIcon,
  ShieldCheckIcon,
  RefusalGateIcon,
];

export function LimitsSection() {
  return (
    <section
      id="limites"
      aria-labelledby="titre-limites"
      className="scroll-mt-20 border-t border-border bg-surface"
    >
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <Reveal>
          <SectionHeading
            titleId="titre-limites"
            eyebrow={limitsSection.eyebrow}
            title={limitsSection.title}
            intro={limitsSection.intro}
          />
        </Reveal>

        <Stagger className="grid gap-4 sm:grid-cols-2">
          {limitsSection.items.map((item, index) => {
            const Icon = icons[index] ?? ShieldCheckIcon;

            return (
              <StaggerItem key={item.title}>
                <div className="flex h-full gap-4 rounded-card border border-border bg-bg p-5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface text-navy">
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <h3 className="font-display text-small font-semibold text-navy">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-small leading-relaxed text-ink-muted">
                      {item.body}
                    </p>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}
