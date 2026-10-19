"use client";

import { motion, useReducedMotion } from "framer-motion";

import { DrawPath } from "@/components/motion/draw-path";
import { easeOut } from "@/components/motion/tokens";

const cards = [
  { label: "Note d'inflation", page: "p. 3", y: 20, selected: true },
  { label: "Politique monétaire", page: "p. 6", y: 92 },
  { label: "Inclusion financière", page: "p. 10", y: 164 },
  { label: "Bulletin statistique", page: "p. 21", y: 236 },
];

const bezier = (targetY: number) =>
  `M158 150 C 228 150, 262 ${targetY}, 330 ${targetY}`;

/**
 * Retrieval is selective, not magic: one question, four candidate documents,
 * one path that lands on the cited page.
 */
export function RetrievalFan() {
  const reduce = useReducedMotion();

  return (
    <svg
      viewBox="0 0 520 300"
      className="h-auto w-full overflow-visible"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <marker
          id="fan-dot"
          viewBox="0 0 6 6"
          refX="3"
          refY="3"
          markerWidth="6"
          markerHeight="6"
        >
          <circle cx="3" cy="3" r="2.5" fill="var(--color-azure)" />
        </marker>
      </defs>

      <motion.g
        initial={reduce ? false : { opacity: 0, x: -8 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.5, ease: easeOut }}
      >
        <rect
          x={8}
          y={112}
          width={150}
          height={76}
          rx={14}
          fill="var(--color-bg)"
          stroke="var(--color-border)"
        />
        <text
          x={22}
          y={134}
          className="fill-ink-muted text-[9px] font-semibold uppercase tracking-[0.12em]"
        >
          Question
        </text>
        <text
          x={22}
          y={153}
          className="fill-navy font-display text-[11px] font-semibold"
        >
          Inflation annuelle
        </text>
        <text
          x={22}
          y={169}
          className="fill-navy font-display text-[11px] font-semibold"
        >
          novembre 2025
        </text>
        <text x={22} y={184} className="fill-ink-muted text-[9px]">
          3 passages retenus
        </text>
      </motion.g>

      {cards.map((card, index) => (
        <DrawPath
          key={card.label}
          d={bezier(card.y + 26)}
          className={card.selected ? "text-azure" : "text-slate/40"}
          strokeWidth={card.selected ? 1.8 : 1}
          duration={0.8}
          delay={0.15 + index * 0.1}
          markerEnd={card.selected ? "url(#fan-dot)" : undefined}
        />
      ))}

      {cards.map((card, index) => (
        <motion.g
          key={card.label}
          initial={reduce ? false : { opacity: 0, x: 10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{
            duration: 0.45,
            delay: 0.3 + index * 0.1,
            ease: easeOut,
          }}
        >
          <rect
            x={330}
            y={card.y}
            width={178}
            height={52}
            rx={11}
            fill={card.selected ? "var(--color-surface)" : "var(--color-surface)"}
            stroke={card.selected ? "var(--color-azure)" : "var(--color-border)"}
            strokeWidth={card.selected ? 1.5 : 1}
          />
          <circle
            cx={349}
            cy={card.y + 26}
            r={4}
            fill={card.selected ? "var(--color-navy)" : "var(--color-border)"}
          />
          <text
            x={362}
            y={card.y + 22}
            className={
              card.selected
                ? "fill-navy text-[10px] font-medium"
                : "fill-ink-muted text-[10px] font-medium"
            }
          >
            {card.label}
          </text>
          <text
            x={362}
            y={card.y + 37}
            className="fill-ink-muted text-[9px]"
          >
            {card.page}
          </text>
          {card.selected && (
            <rect
              x={482}
              y={card.y + 17}
              width={16}
              height={18}
              rx={4}
              fill="var(--color-gold)"
            />
          )}
        </motion.g>
      ))}
    </svg>
  );
}
