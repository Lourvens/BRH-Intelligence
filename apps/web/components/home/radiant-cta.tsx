"use client";

import { motion } from "framer-motion";
import { ArrowRight, BookOpen, ExternalLink, Sparkles } from "lucide-react";

import {
  AuthenticSealIcon,
  BookStackIcon,
  PageSourceIcon,
  RefusalGateIcon,
} from "@/components/illustrations/icons";
import { ShimmerLink } from "@/components/ui/shimmer-button";
import { finalCta } from "@/lib/content/home";

export function RadiantCta() {
  return (
    <section className="py-20 bg-bg">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-navy-deep to-navy p-8 sm:p-14 lg:p-16 text-white shadow-lift">
          {/* Ambient Glowing Orbs */}
          <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-azure/20 blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 size-96 rounded-full bg-gold/15 blur-[100px]" />

          {/* Masked technical grid */}
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.4) 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />

          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-caption font-semibold text-white/90 backdrop-blur-md">
              <Sparkles className="size-3.5 text-gold" />
              <span>{finalCta.eyebrow}</span>
            </div>

            <h2 className="mt-5 font-display text-[2.25rem] font-black tracking-tight text-white sm:text-[3.25rem] lg:text-[3.75rem]">
              La réponse est dans le document.
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-body leading-relaxed text-white/80 sm:text-lead">
              {finalCta.intro}
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <ShimmerLink href="#apercu">
                <span>{finalCta.primary}</span>
                <ArrowRight className="size-4" />
              </ShimmerLink>

              <a
                href="#corpus"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-6 py-2.5 font-display text-small font-semibold text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <BookStackIcon className="size-4 text-azure" />
                <span>{finalCta.secondary}</span>
              </a>
            </div>

            {/* Bottom Trust Signatures */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 border-t border-white/15 pt-8 text-micro text-white/70">
              <div className="flex items-center gap-1.5">
                <PageSourceIcon className="size-4 text-azure" />
                <span>Citations page par page</span>
              </div>
              <div className="flex items-center gap-1.5">
                <RefusalGateIcon className="size-4 text-emerald" />
                <span>Refus explicite garanti</span>
              </div>
              <div className="flex items-center gap-1.5">
                <AuthenticSealIcon className="size-4 text-gold" />
                <span>Source officielle brh.ht</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
