import { easeInOut } from "./config";
import type { MotionRuntime } from "./runtime";

export function setupJobsMotion(runtime: MotionRuntime): void {
  const jobs = runtime.root.querySelector(".jobs-section");
  if (jobs) {
    runtime.onCleanup(
      runtime.onceInView(
        jobs,
        () => {
          const line = jobs.querySelector<SVGPathElement>(".micro-chart path");
          if (line) {
            const length = line.getTotalLength();
            runtime.play(
              line,
              { strokeDasharray: length, strokeDashoffset: length },
              { strokeDasharray: length, strokeDashoffset: 0 },
              0.5,
              0.32,
            );
          }
          jobs.querySelectorAll(".comparison-bars i").forEach((bar, index) =>
            runtime.play(
              bar,
              { transform: "scaleX(0)" },
              { transform: "scaleX(1)" },
              0.4,
              0.38 + index * 0.06,
            ),
          );
          const citation = jobs.querySelector(".citation-line");
          if (citation)
            runtime.play(
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
}

export function setupCorpusMotion(runtime: MotionRuntime): void {
  const corpus = runtime.root.querySelector(".corpus-section");
  if (corpus) {
    runtime.onCleanup(
      runtime.onceInView(
        corpus,
        () => {
          const transition = corpus.querySelector(".transition-line");
          if (transition)
            runtime.play(
              transition,
              { opacity: 0.7, clipPath: "inset(0 0 100% 0)" },
              { opacity: 1, clipPath: "inset(0 0 0% 0)" },
              0.6,
              0,
              easeInOut,
            );
          const result = corpus.querySelector(".result-line");
          if (result)
            runtime.play(
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
              runtime.play(
                card,
                { opacity: 0.65, transform: collectionFrames[index][0] },
                { opacity: 1, transform: collectionFrames[index][1] },
                0.45,
                0.42 + index * 0.06,
              ),
            );
          const citation = corpus.querySelector(".citation-pin");
          if (citation)
            runtime.play(
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
}

export function setupMethodMotion(runtime: MotionRuntime): void {
  const method = runtime.root.querySelector(".method-section");
  if (method) {
    runtime.onCleanup(
      runtime.onceInView(
        method,
        () => {
          const phone = runtime.phone();
          method
            .querySelectorAll(".step-top i")
            .forEach((line, index) =>
              runtime.play(
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
}

export function setupGraphMotion(runtime: MotionRuntime): void {
  const graph = runtime.root.querySelector(".graph-section");
  const explorer = graph?.querySelector(".graph-explorer");
  if (graph && explorer) {
    runtime.onCleanup(
      runtime.onceInView(
        graph,
        () => {
          runtime.play(
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
              runtime.play(
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
}
