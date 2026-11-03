"use client";

import { useEffect, useState } from "react";

import { PREPARED_SELECTORS, reveals } from "@/lib/landing/motion/config";
import {
  setupClosingMotion,
  setupProvenanceMotion,
} from "@/lib/landing/motion/provenance";
import { createMotionRuntime } from "@/lib/landing/motion/runtime";
import {
  setupCorpusMotion,
  setupGraphMotion,
  setupJobsMotion,
  setupMethodMotion,
} from "@/lib/landing/motion/sections";

/** Landing storytelling motion. Content is SSR-visible until this enhancement mounts. */
export function useLandingMotionCues() {
  const [motionRevision, setMotionRevision] = useState(0);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".brh-home");
    if (!root) return;
    root.dataset.motionReady = "true";

    if (!("IntersectionObserver" in window)) {
      return () => {
        delete root.dataset.motionReady;
      };
    }

    const runtime = createMotionRuntime(root);
    runtime.prepareReveals(reveals);
    runtime.prepareSelectors(PREPARED_SELECTORS);

    for (const reveal of reveals) {
      const trigger = runtime.root.querySelector(reveal.trigger);
      if (!trigger) continue;
      if (runtime.compact.matches) {
        trigger.querySelectorAll(reveal.targets).forEach((element) => {
          runtime.onCleanup(
            runtime.onceInView(
              element,
              () => {
                runtime.play(
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
      runtime.onCleanup(
        runtime.onceInView(
          trigger,
          () => {
            const phone = runtime.phone();
            trigger
              .querySelectorAll(reveal.targets)
              .forEach((element, index) => {
                const y = phone
                  ? Math.min(reveal.y ?? 12, 8)
                  : (reveal.y ?? 12);
                runtime.play(
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

    setupJobsMotion(runtime);
    setupCorpusMotion(runtime);
    setupMethodMotion(runtime);
    setupGraphMotion(runtime);
    setupClosingMotion(runtime);
    runtime.onCleanup(setupProvenanceMotion(runtime));

    const rebuildMotion = () => setMotionRevision((revision) => revision + 1);
    runtime.reduced.addEventListener("change", rebuildMotion);
    runtime.compact.addEventListener("change", rebuildMotion);

    return () => {
      runtime.destroy();
      runtime.reduced.removeEventListener("change", rebuildMotion);
      runtime.compact.removeEventListener("change", rebuildMotion);
    };
  }, [motionRevision]);
}
