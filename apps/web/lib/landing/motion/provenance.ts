import { scroll } from "framer-motion/dom";

import { easeInOut } from "./config";
import { mix, phase, type MotionRuntime } from "./runtime";

export function setupClosingMotion(runtime: MotionRuntime): void {
  const closing = runtime.root.querySelector(".closing-section");
  const closingPanel = closing?.querySelector<HTMLElement>(".closing-panel");
  if (closing && closingPanel) {
    runtime.onCleanup(
      runtime.onceInView(
        closing,
        () => {
          runtime.play(
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
    if (!runtime.reduced.matches && runtime.desktop.matches) {
      runtime.onCleanup(
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
}

export function setupProvenanceMotion(runtime: MotionRuntime): () => void {
  const provenance =
    runtime.root.querySelector<HTMLElement>(".provenance-section");
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
    evidence.forEach((element) => element.style.removeProperty("transform"));
    assurances.forEach((element) =>
      element.style.removeProperty("transform"),
    );
  };
  reset();
  if (runtime.reduced.matches) return reset;
  if (!runtime.desktop.matches) {
    const stop = runtime.onceInView(
      provenance,
      () => {
        [documentPreview, quote, ...evidence, ...assurances].forEach(
          (element, index) => {
            if (!element) return;
            runtime.play(
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
        const item = phase(progress, 0.45 + index * 0.06, 0.64 + index * 0.06);
        element.style.opacity = String(item);
        element.style.transform = `translateY(${mix(8, 0, item)}px)`;
      });
      assurances.forEach((element, index) => {
        const item = phase(progress, 0.7 + index * 0.06, 0.86 + index * 0.06);
        element.style.opacity = String(item);
        element.style.transform = `translateY(${mix(10, 0, item)}px)`;
      });
    },
    { target: provenance, offset: ["start start", "end end"] },
  );
}
