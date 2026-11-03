"use client";

import { useEffect, useState } from "react";
import { animateMini, scroll } from "framer-motion/dom";

const easeOut = [0.23, 1, 0.32, 1] as const;
const easeInOut = [0.77, 0, 0.175, 1] as const;

type Reveal = {
  trigger: string;
  targets: string;
  y?: number;
  scale?: number;
  duration?: number;
  stagger?: number;
  amount?: number;
  delay?: number;
};

const reveals: Reveal[] = [
  {
    trigger: ".proof-strip",
    targets: ".proof-grid > div",
    y: 10,
    scale: 0.96,
    duration: 0.35,
    stagger: 0.05,
  },
  {
    trigger: ".jobs-section",
    targets: ".section-heading > *, .job-card",
    y: 18,
    scale: 0.985,
    duration: 0.5,
    stagger: 0.07,
  },
  {
    trigger: ".corpus-section",
    targets: ".corpus-heading > *, .bento-card",
    y: 18,
    scale: 0.985,
    duration: 0.55,
    stagger: 0.08,
    amount: 0.08,
  },
  {
    trigger: ".graph-section",
    targets: ".graph-section-heading > *",
    y: 16,
    scale: 0.99,
    duration: 0.6,
    stagger: 0.1,
    amount: 0.08,
  },
  {
    trigger: ".method-section",
    targets: ".method-title, .step, .method-note",
    y: 14,
    duration: 0.4,
    stagger: 0.08,
  },
  {
    trigger: ".provenance-section",
    targets:
      ".provenance-copy > .eyebrow, .provenance-copy > h2, .provenance-copy > .lead",
    y: 14,
    duration: 0.48,
    stagger: 0.07,
    amount: 0.1,
  },
  {
    trigger: ".faq-section",
    targets: ".faq-heading, .faq-item",
    y: 12,
    duration: 0.36,
    stagger: 0.035,
  },
  {
    trigger: ".closing-section",
    targets: ".closing-copy > *, .closing-panel form, .closing-proof",
    y: 14,
    duration: 0.5,
    stagger: 0.06,
    amount: 0.15,
    delay: 0.12,
  },
  {
    trigger: "footer",
    targets: ".footer-inner > *, .footer-links > div, .footer-bottom",
    y: 6,
    duration: 0.3,
    stagger: 0.05,
    amount: 0.1,
  },
];

function mix(from: number, to: number, progress: number) {
  return from + (to - from) * Math.min(1, Math.max(0, progress));
}

function phase(progress: number, start: number, end: number) {
  return Math.min(1, Math.max(0, (progress - start) / (end - start)));
}

/** Landing storytelling motion. Content is SSR-visible until this enhancement mounts. */
export function useLandingMotionCues() {
  const [motionRevision, setMotionRevision] = useState(0);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".brh-home");
    if (!root) return;
    root.dataset.motionReady = "true";

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktopStory = window.matchMedia("(min-width: 820px)");
    const compactLayout = window.matchMedia("(max-width: 819px)");
    const cleanups: Array<() => void> = [];
    const animated = new Set<Element>();
    const running = new Set<ReturnType<typeof animateMini>>();
    if (!("IntersectionObserver" in window)) {
      return () => {
        delete root.dataset.motionReady;
      };
    }
    const prepared = new Map<HTMLElement, string>();
    const alreadyVisible = new Set<Element>();
    const prepare = (element: Element) => {
      const bounds = element.getBoundingClientRect();
      if (bounds.top < window.innerHeight && bounds.bottom > 0) {
        alreadyVisible.add(element);
        return;
      }
      if (reduced.matches || bounds.bottom <= 0) {
        alreadyVisible.add(element);
        return;
      }
      const target = element as HTMLElement;
      if (!prepared.has(target)) prepared.set(target, target.style.opacity);
      target.style.opacity = "0";
    };
    for (const reveal of reveals) {
      root
        .querySelector(reveal.trigger)
        ?.querySelectorAll(reveal.targets)
        .forEach(prepare);
    }
    root
      .querySelectorAll(
        ".graph-explorer, .graph-toolbar, .graph-inspector, .transition-line, .result-line, .collection-stack > *, .citation-pin, .citation-line, .closing-panel",
      )
      .forEach(prepare);
    const restorePrepared = () => {
      prepared.forEach((opacity, element) => {
        element.style.opacity = opacity;
      });
      prepared.clear();
    };
    const revealFocused = (event: FocusEvent) => {
      prepared.forEach((opacity, element) => {
        if (element.contains(event.target as Node)) {
          element.style.opacity = opacity;
          prepared.delete(element);
          animated.add(element);
        }
      });
    };
    root.addEventListener("focusin", revealFocused);

    const onceInView = (
      element: Element,
      onStart: () => void,
      { amount = 0.2 }: { amount?: number } = {},
    ) => {
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry?.isIntersecting || entry.intersectionRatio < amount)
            return;
          observer.disconnect();
          onStart();
        },
        { threshold: amount, rootMargin: "0px 0px -8% 0px" },
      );
      observer.observe(element);
      return () => observer.disconnect();
    };

    const play = (
      element: Element,
      from: Record<string, string | number>,
      to: Record<string, string | number>,
      duration: number,
      delay = 0,
      easing: readonly [number, number, number, number] = easeOut,
    ) => {
      if (animated.has(element)) return;
      if (alreadyVisible.has(element)) {
        animated.add(element);
        return;
      }
      // Stacked phone layouts must reveal each card when it reaches the reader,
      // rather than spending its entrance below the viewport.
      const compact = compactLayout.matches;
      const bounds = element.getBoundingClientRect();
      if (
        !reduced.matches &&
        compact &&
        bounds.top >= window.innerHeight * 0.9
      ) {
        cleanups.push(
          onceInView(
            element,
            () => play(element, from, to, duration, 0, easing),
            { amount: 0.1 },
          ),
        );
        return;
      }
      animated.add(element);
      if (reduced.matches) {
        Object.assign((element as HTMLElement).style, to);
        return;
      }
      const target = element as HTMLElement;
      const wasPrepared = prepared.has(target);
      const final = wasPrepared ? { ...to, opacity: 1 } : to;
      const initial = wasPrepared ? { ...from, opacity: 0 } : from;
      const keyframes = Object.fromEntries(
        Object.keys(final).map((property) => [
          property,
          [initial[property], final[property]],
        ]),
      );
      const animation = animateMini(element, keyframes, {
        duration: Math.max(duration * 1.5, 0.65),
        delay,
        ease: easing,
      });
      running.add(animation);
      animation.then(() => {
        running.delete(animation);
        if (prepared.has(target)) {
          target.style.opacity = prepared.get(target)!;
          prepared.delete(target);
        }
      });
    };

    for (const reveal of reveals) {
      const trigger = root.querySelector(reveal.trigger);
      if (!trigger) continue;
      if (compactLayout.matches) {
        trigger.querySelectorAll(reveal.targets).forEach((element) => {
          cleanups.push(
            onceInView(
              element,
              () => {
                play(
                  element,
                  { opacity: 0, transform: "translateY(12px) scale(.99)" },
                  { opacity: 1, transform: "translateY(0) scale(1)" },
                  reveal.duration ?? 0.5,
                );
              },
              { amount: 0.12 },
            ),
          );
        });
        continue;
      }
      cleanups.push(
        onceInView(
          trigger,
          () => {
            const phone = window.matchMedia("(max-width: 600px)").matches;
            trigger
              .querySelectorAll(reveal.targets)
              .forEach((element, index) => {
                const y = phone
                  ? Math.min(reveal.y ?? 12, 8)
                  : (reveal.y ?? 12);
                play(
                  element,
                  {
                    opacity: 0,
                    transform: `translateY(${y}px) scale(${reveal.scale ?? 1})`,
                  },
                  { opacity: 1, transform: "translateY(0) scale(1)" },
                  reveal.duration ?? 0.45,
                  (reveal.delay ?? 0) +
                    (phone ? 0 : index * (reveal.stagger ?? 0.06)),
                );
              });
          },
          { amount: reveal.amount ?? 0.2 },
        ),
      );
    }

    const jobs = root.querySelector(".jobs-section");
    if (jobs) {
      cleanups.push(
        onceInView(
          jobs,
          () => {
            const line =
              jobs.querySelector<SVGPathElement>(".micro-chart path");
            if (line) {
              const length = line.getTotalLength();
              play(
                line,
                { strokeDasharray: length, strokeDashoffset: length },
                { strokeDasharray: length, strokeDashoffset: 0 },
                0.5,
                0.32,
              );
            }
            jobs
              .querySelectorAll(".comparison-bars i")
              .forEach((bar, index) =>
                play(
                  bar,
                  { transform: "scaleX(0)" },
                  { transform: "scaleX(1)" },
                  0.4,
                  0.38 + index * 0.06,
                ),
              );
            const citation = jobs.querySelector(".citation-line");
            if (citation)
              play(
                citation,
                { opacity: 0, transform: "translateY(6px)" },
                { opacity: 1, transform: "translateY(0)" },
                0.35,
                0.44,
              );
          },
          { amount: 0.2 },
        ),
      );
    }

    const corpus = root.querySelector(".corpus-section");
    if (corpus) {
      cleanups.push(
        onceInView(
          corpus,
          () => {
            const transition = corpus.querySelector(".transition-line");
            if (transition)
              play(
                transition,
                { opacity: 0.7, clipPath: "inset(0 0 100% 0)" },
                { opacity: 1, clipPath: "inset(0 0 0% 0)" },
                0.6,
                0,
                easeInOut,
              );
            const result = corpus.querySelector(".result-line");
            if (result)
              play(
                result,
                { opacity: 0, transform: "translateY(8px)" },
                { opacity: 1, transform: "translateY(0)" },
                0.38,
                0.38,
              );
            const collectionFrames = [
              ["translateX(12px) rotate(-2deg)", "rotate(-5deg)"],
              ["translateY(0) scale(.97)", "translateY(-9px) scale(1)"],
              ["translateX(-12px) rotate(2deg)", "rotate(5deg)"],
            ];
            corpus
              .querySelectorAll(".collection-stack > *")
              .forEach((card, index) =>
                play(
                  card,
                  { opacity: 0.65, transform: collectionFrames[index][0] },
                  { opacity: 1, transform: collectionFrames[index][1] },
                  0.45,
                  0.42 + index * 0.06,
                ),
              );
            const citation = corpus.querySelector(".citation-pin");
            if (citation)
              play(
                citation,
                { opacity: 0, transform: "scale(.94)" },
                { opacity: 1, transform: "scale(1)" },
                0.35,
                0.52,
              );
          },
          { amount: 0.08 },
        ),
      );
    }

    const method = root.querySelector(".method-section");
    if (method) {
      cleanups.push(
        onceInView(
          method,
          () => {
            const phone = window.matchMedia("(max-width: 600px)").matches;
            method
              .querySelectorAll(".step-top i")
              .forEach((line, index) =>
                play(
                  line,
                  { transform: phone ? "scaleY(0)" : "scaleX(0)" },
                  { transform: "scale(1)" },
                  0.35,
                  phone ? 0 : 0.18 + index * 0.08,
                ),
              );
          },
          { amount: 0.2 },
        ),
      );
    }

    const graph = root.querySelector(".graph-section");
    const explorer = graph?.querySelector(".graph-explorer");
    if (graph && explorer) {
      cleanups.push(
        onceInView(
          graph,
          () => {
            play(
              explorer,
              { opacity: 0.72, clipPath: "inset(0 0 8% 0)" },
              { opacity: 1, clipPath: "inset(0 0 0% 0)" },
              0.65,
              0.08,
              easeInOut,
            );
            graph
              .querySelectorAll(".graph-toolbar, .graph-inspector")
              .forEach((item, index) =>
                play(
                  item,
                  { opacity: 0 },
                  { opacity: 1 },
                  0.35,
                  0.2 + index * 0.06,
                ),
              );
          },
          { amount: 0.08 },
        ),
      );
    }

    const closing = root.querySelector(".closing-section");
    const closingPanel = closing?.querySelector<HTMLElement>(".closing-panel");
    if (closing && closingPanel) {
      cleanups.push(
        onceInView(
          closing,
          () => {
            play(
              closingPanel,
              {
                opacity: 0.8,
                clipPath: "inset(0 0 9% 0 round 24px)",
                transform: "scale(.985)",
              },
              {
                opacity: 1,
                clipPath: "inset(0 0 0% 0 round 24px)",
                transform: "scale(1)",
              },
              0.7,
              0,
              easeInOut,
            );
          },
          { amount: 0.15 },
        ),
      );
      if (!reduced.matches && window.matchMedia("(min-width: 820px)").matches) {
        cleanups.push(
          scroll(
            (progress) => {
              closingPanel.style.setProperty(
                "--closing-glow-x",
                `${mix(-8, 8, progress)}px`,
              );
            },
            { target: closing, offset: ["start end", "end start"] },
          ),
        );
      }
    }

    const provenance = root.querySelector<HTMLElement>(".provenance-section");
    const setupProvenance = () => {
      if (!provenance) return () => undefined;
      const documentPreview =
        provenance.querySelector<HTMLElement>(".document-preview");
      const quote = provenance.querySelector<HTMLElement>(
        ".paper-content > p:nth-of-type(2)",
      );
      const mark = provenance.querySelector<HTMLElement>("mark");
      const evidence = provenance.querySelectorAll<HTMLElement>(
        ".paper-lines, .paper-source, .paper-content > a",
      );
      const assurances = provenance.querySelectorAll<HTMLElement>(
        ".assurance-list > div",
      );
      const reset = () => {
        [documentPreview, quote, mark, ...evidence, ...assurances].forEach(
          (element) => element?.style.removeProperty("opacity"),
        );
        documentPreview?.style.removeProperty("transform");
        mark?.style.removeProperty("background-size");
        evidence.forEach((element) =>
          element.style.removeProperty("transform"),
        );
        assurances.forEach((element) =>
          element.style.removeProperty("transform"),
        );
      };
      reset();
      if (reduced.matches) return reset;
      if (!desktopStory.matches) {
        const stop = onceInView(
          provenance,
          () => {
            [documentPreview, quote, ...evidence, ...assurances].forEach(
              (element, index) => {
                if (!element) return;
                play(
                  element,
                  { opacity: 0, transform: "translateY(8px)" },
                  { opacity: 1, transform: "translateY(0)" },
                  0.45,
                  index * 0.05,
                );
              },
            );
          },
          { amount: 0.1 },
        );
        return () => {
          stop();
          reset();
        };
      }
      return scroll(
        (progress) => {
          if (documentPreview) {
            const settle = phase(progress, 0, 0.2);
            documentPreview.style.opacity = String(mix(0.72, 1, settle));
            documentPreview.style.transform = `translateY(${mix(28, 0, settle)}px) rotate(${mix(-3, -1, settle)}deg) scale(${mix(0.975, 1, settle)})`;
          }
          const quoteProgress = phase(progress, 0.2, 0.45);
          if (quote) quote.style.opacity = String(mix(0.35, 1, quoteProgress));
          if (mark)
            mark.style.backgroundSize = `${mix(0, 100, quoteProgress)}% 100%`;
          evidence.forEach((element, index) => {
            const item = phase(
              progress,
              0.45 + index * 0.06,
              0.64 + index * 0.06,
            );
            element.style.opacity = String(item);
            element.style.transform = `translateY(${mix(8, 0, item)}px)`;
          });
          assurances.forEach((element, index) => {
            const item = phase(
              progress,
              0.7 + index * 0.06,
              0.86 + index * 0.06,
            );
            element.style.opacity = String(item);
            element.style.transform = `translateY(${mix(10, 0, item)}px)`;
          });
        },
        { target: provenance, offset: ["start start", "end end"] },
      );
    };

    let stopProvenance = setupProvenance();
    const rebuildMotion = () => setMotionRevision((revision) => revision + 1);
    reduced.addEventListener("change", rebuildMotion);
    compactLayout.addEventListener("change", rebuildMotion);

    return () => {
      running.forEach((animation) => animation.complete());
      running.clear();
      cleanups.forEach((cleanup) => cleanup());
      restorePrepared();
      root.removeEventListener("focusin", revealFocused);
      stopProvenance();
      reduced.removeEventListener("change", rebuildMotion);
      compactLayout.removeEventListener("change", rebuildMotion);
      delete root.dataset.motionReady;
    };
  }, [motionRevision]);
}
