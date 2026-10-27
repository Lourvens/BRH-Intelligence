"use client";
import { useState } from "react";
import { Expand } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
export function DocumentFigure({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span
      role="status"
      className="my-5 block rounded-xl border border-border p-4 text-sm text-ink-muted"
    >
      Figure indisponible · {alt}. Le texte reste consultable.
    </span>
  ) : (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="group relative my-5 block max-w-full overflow-hidden rounded-xl border border-border text-left"
          aria-label={`Agrandir : ${alt}`}
        >
          <img
            src={src}
            alt={alt}
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-auto max-w-full"
          />
          <span className="absolute bottom-3 right-3 rounded-lg bg-surface p-2 shadow-card">
            <Expand size={17} />
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-[90vw]">
        <DialogHeader>
          <DialogTitle>Figure du document</DialogTitle>
          <DialogDescription>{alt}</DialogDescription>
        </DialogHeader>
        <img src={src} alt={alt} className="mx-auto h-auto max-w-none" />
      </DialogContent>
    </Dialog>
  );
}
