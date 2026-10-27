"use client";
import Link from "next/link";
import type { ComponentProps } from "react";
/** Keep the exact research view available after reading, including page jumps. */
export function ResearchLink({
  onClick,
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        try {
          sessionStorage.setItem(
            "brh-research-return",
            location.pathname + location.search,
          );
          sessionStorage.setItem("brh-research-scroll", String(scrollY));
        } catch {
          /* Navigation remains usable when browser storage is unavailable. */
        }
      }}
    />
  );
}
