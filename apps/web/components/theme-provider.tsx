"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { MotionConfig } from "framer-motion";
import type { ComponentProps } from "react";
import { CorpusStatsProvider } from "@/components/corpus/stats-provider";

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}><MotionConfig reducedMotion="user"><CorpusStatsProvider>{children}</CorpusStatsProvider></MotionConfig></NextThemesProvider>;
}
