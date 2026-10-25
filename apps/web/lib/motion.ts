import type { Variants } from "framer-motion";

export const feedbackTransition = { duration: 0.16, ease: [0.2, 0, 0, 1] as const };

export const feedbackVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const disclosureVariants: Variants = {
  closed: { gridTemplateRows: "0fr", opacity: 0 },
  open: { gridTemplateRows: "1fr", opacity: 1 },
};
