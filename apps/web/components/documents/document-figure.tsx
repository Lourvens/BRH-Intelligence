"use client";

import { useState } from "react";

export function DocumentFigure({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? <span role="status" className="my-5 block border border-border p-4 text-sm text-ink-muted">Figure indisponible · {alt}. Le texte reste consultable.</span> :
    <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className="my-5 h-auto max-w-full" />;
}
