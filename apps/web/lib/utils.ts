import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * The design system names its type scale (`text-hero`, `text-caption`, …).
 * tailwind-merge does not know those names by default and would confuse them
 * with text colours, silently dropping `text-white` from a navy button. Teach
 * it that the scale is a font-size group.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "micro",
            "caption",
            "small",
            "body",
            "lead",
            "title",
            "headline",
            "display",
            "hero",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
