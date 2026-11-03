import { animateMini } from "framer-motion/dom";

import {
  COMPACT_QUERY,
  DESKTOP_QUERY,
  PHONE_QUERY,
  REDUCED_QUERY,
  easeOut,
  type Reveal,
} from "./config";

export type MotionRuntime = {
  root: HTMLElement;
  reduced: MediaQueryList;
  compact: MediaQueryList;
  desktop: MediaQueryList;
  phone: () => boolean;
  prepare: (element: Element) => void;
  prepareReveals: (reveals: readonly Reveal[]) => void;
  prepareSelectors: (selector: string) => void;
  onceInView: (
    element: Element,
    onStart: () => void,
    opts?: { amount?: number },
  ) => () => void;
  play: (
    element: Element,
    from: Record<string, string | number>,
    to: Record<string, string | number>,
    duration: number,
    delay?: number,
    easing?: readonly [number, number, number, number],
  ) => void;
  onCleanup: (fn: () => void) => void;
  destroy: () => void;
};

export function mix(from: number, to: number, progress: number) {
  return from + (to - from) * Math.min(1, Math.max(0, progress));
}

export function phase(progress: number, start: number, end: number) {
  return Math.min(1, Math.max(0, (progress - start) / (end - start)));
}

export function createMotionRuntime(root: HTMLElement): MotionRuntime {
  const reduced = window.matchMedia(REDUCED_QUERY);
  const desktop = window.matchMedia(DESKTOP_QUERY);
  const compact = window.matchMedia(COMPACT_QUERY);
  const cleanups: Array<() => void> = [];
  const animated = new Set<Element>();
  const running = new Set<ReturnType<typeof animateMini>>();
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
        if (!entry?.isIntersecting || entry.intersectionRatio < amount) return;
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
    const compactLayout = compact.matches;
    const bounds = element.getBoundingClientRect();
    if (
      !reduced.matches &&
      compactLayout &&
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

  return {
    root,
    reduced,
    compact,
    desktop,
    phone: () => window.matchMedia(PHONE_QUERY).matches,
    prepare,
    prepareReveals: (list) => {
      for (const reveal of list) {
        root
          .querySelector(reveal.trigger)
          ?.querySelectorAll(reveal.targets)
          .forEach(prepare);
      }
    },
    prepareSelectors: (selector) => {
      root.querySelectorAll(selector).forEach(prepare);
    },
    onceInView,
    play,
    onCleanup: (fn) => {
      cleanups.push(fn);
    },
    destroy: () => {
      running.forEach((animation) => animation.complete());
      running.clear();
      cleanups.forEach((cleanup) => cleanup());
      restorePrepared();
      root.removeEventListener("focusin", revealFocused);
      delete root.dataset.motionReady;
    },
  };
}
