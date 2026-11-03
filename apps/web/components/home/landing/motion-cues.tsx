"use client";

import { useEffect } from "react";

/** Once-only explanatory accents. SSR content stays visible with or without JS. */
export function LandingMotionCues() {
  useEffect(() => {
    const root = document.querySelector(".brh-home");
    if (
      !root ||
      !("IntersectionObserver" in window) ||
      !("animate" in Element.prototype)
    )
      return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const phone = window.matchMedia("(max-width: 600px)");
    const easing =
      getComputedStyle(root).getPropertyValue("--motion-ease").trim() ||
      "cubic-bezier(0.23, 1, 0.32, 1)";
    const animations = new Set<Animation>();
    type Cue = {
      target: Element;
      kind: "agent" | "corpus" | "connector" | "source";
      index: number;
    };
    const cues = new Map<Element, Cue[]>();
    const register = (trigger: Element, cue: Cue) => {
      cues.set(trigger, [...(cues.get(trigger) ?? []), cue]);
    };
    root
      .querySelectorAll(".job-icon")
      .forEach((target, index) =>
        register(target, { target, kind: "agent", index }),
      );
    root
      .querySelectorAll(".bento-copy > i")
      .forEach((target, index) =>
        register(target, { target, kind: "corpus", index }),
      );
    root.querySelectorAll(".step").forEach((trigger, index) => {
      const target = trigger.querySelector(".step-top i");
      if (target) register(trigger, { target, kind: "connector", index });
    });
    root
      .querySelectorAll(".paper-source > span")
      .forEach((target) =>
        register(target.parentElement!, { target, kind: "source", index: 0 }),
      );

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.25) continue;
          observer.unobserve(entry.target);
          if (preference.matches) continue;
          for (const { target, kind, index } of cues.get(entry.target) ?? []) {
            const connector = kind === "connector";
            const source = kind === "source";
            const frames: Keyframe[] = source
              ? [{ opacity: 0.5 }, { opacity: 1 }]
              : connector
                ? [
                    { transform: phone.matches ? "scaleY(0)" : "scaleX(0)" },
                    { transform: "scale(1)" },
                  ]
                : [
                    {
                      transform: `translateY(${kind === "agent" ? 8 : 6}px)`,
                      opacity: 0.7,
                    },
                    { transform: "translateY(0)", opacity: 1 },
                  ];
            const animation = target.animate(frames, {
              duration: kind === "agent" ? 300 : 250,
              delay:
                phone.matches || source ? 0 : index * (connector ? 60 : 50),
              easing,
              // Only decorative targets use backwards fill during the short stagger.
              fill: "backwards",
            });
            animations.add(animation);
            animation.onfinish = animation.oncancel = () =>
              animations.delete(animation);
          }
        }
      },
      { threshold: 0.25 },
    );
    cues.forEach((_, trigger) => observer.observe(trigger));
    const settle = () => {
      animations.forEach((animation) => animation.cancel());
      animations.clear();
    };
    const cancel = () => {
      if (preference.matches) settle();
    };
    preference.addEventListener("change", cancel);
    // A rotation settles current effects rather than scaling along the old axis.
    phone.addEventListener("change", settle);
    return () => {
      observer.disconnect();
      settle();
      preference.removeEventListener("change", cancel);
      phone.removeEventListener("change", settle);
    };
  }, []);
  return null;
}
