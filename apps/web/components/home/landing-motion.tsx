"use client";

import {
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import { Pause, Play } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";

/** Visible server output; movement enhances rather than gates the content. */
export function LandingReveal({
  children,
  className = "",
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={false}
      whileInView={
        reduced ? { y: 0, opacity: 1 } : { y: [14, 0], opacity: [0.7, 1] }
      }
      viewport={{ once: true, amount: 0.12 }}
      whileHover={reduced || !interactive ? undefined : { y: -5 }}
      whileTap={reduced || !interactive ? undefined : { scale: 0.99 }}
      data-interactive={interactive || undefined}
      transition={{ duration: reduced ? 0 : 0.35 }}
    >
      {children}
    </motion.div>
  );
}

export function ConstellationMotion({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.1 });
  const tiltX = useSpring(0, { stiffness: 110, damping: 22 });
  const tiltY = useSpring(0, { stiffness: 110, damping: 22 });
  const spotX = useMotionValue(50);
  const spotY = useMotionValue(50);
  const spotlight = useMotionTemplate`radial-gradient(circle at ${spotX}% ${spotY}%, color-mix(in srgb, var(--color-azure) 18%, transparent), transparent 58%)`;
  const enabled = reduced === false && !paused && inView;
  function reset() {
    tiltX.set(0);
    tiltY.set(0);
  }
  function follow(event: PointerEvent<HTMLDivElement>) {
    if (!enabled || event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(
      0,
      Math.min(1, (event.clientX - bounds.left) / bounds.width),
    );
    const y = Math.max(
      0,
      Math.min(1, (event.clientY - bounds.top) / bounds.height),
    );
    tiltX.set((0.5 - y) * 7);
    tiltY.set((x - 0.5) * 7);
    spotX.set(x * 100);
    spotY.set(y * 100);
  }
  return (
    <div
      ref={ref}
      className="landing-motion-stage"
      onPointerMove={follow}
      onPointerLeave={reset}
    >
      <motion.div
        aria-hidden
        className="landing-pointer-light"
        style={{ background: spotlight }}
        animate={{ opacity: enabled ? 1 : 0 }}
      />
      <motion.div
        className="landing-tilt-layer"
        style={{ rotateX: enabled ? tiltX : 0, rotateY: enabled ? tiltY : 0 }}
      >
        <motion.div
          className="landing-constellation"
          initial={false}
          animate={
            enabled
              ? { y: [0, -7, 0], rotate: [0, 0.5, 0] }
              : { y: 0, rotate: 0 }
          }
          transition={
            enabled
              ? { duration: 9, repeat: Infinity, ease: "easeInOut" }
              : { duration: reduced ? 0 : 0.2 }
          }
        >
          {children}
        </motion.div>
      </motion.div>
      {hydrated && reduced === false && (
        <button
          type="button"
          className="landing-motion-toggle"
          aria-pressed={paused}
          onClick={() => {
            reset();
            setPaused(!paused);
          }}
        >
          {paused ? (
            <Play size={12} aria-hidden />
          ) : (
            <Pause size={12} aria-hidden />
          )}
          {paused ? "Reprendre l’animation" : "Suspendre l’animation"}
        </button>
      )}
    </div>
  );
}
