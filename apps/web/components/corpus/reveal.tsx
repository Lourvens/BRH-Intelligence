"use client";
import { motion } from "framer-motion";
export function Reveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
      className={`atlas-reveal ${className}`}
    >
      {children}
    </motion.div>
  );
}
