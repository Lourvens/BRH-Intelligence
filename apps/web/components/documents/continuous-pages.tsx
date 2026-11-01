"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { DocumentPage } from "@/lib/corpus/types";
import { Button } from "@/components/ui/button";
import { MarkdownPage } from "./markdown-page";
import { CopyReference } from "./copy-reference";
import { loadReaderBatch } from "@/lib/corpus/reader-batch";

export function ContinuousPages({
  initial,
  slug,
  onActive,
}: {
  initial: DocumentPage;
  slug: string;
  onActive: (page: DocumentPage) => void;
}) {
  const [pages, setPages] = useState<DocumentPage[]>([initial]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [automatic, setAutomatic] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const controller = useRef<AbortController | null>(null);
  const anchor = useRef<{ page: number; top: number } | null>(null);
  const last = pages[pages.length - 1].page_number;
  const first = pages[0].page_number;
  const load = useCallback(
    async (direction: "next" | "previous", initialBatch = false) => {
      if (controller.current) return;
      const start = direction === "next" ? last + 1 : Math.max(1, first - 5);
      const end =
        direction === "next"
          ? Math.min(initial.page_count, last + (initialBatch ? 4 : 5))
          : first - 1;
      if (start > end) return;
      const request = new AbortController();
      controller.current = request;
      setBusy(true);
      setError("");
      try {
        const batch = await loadReaderBatch(
          initial,
          start,
          end,
          request.signal,
        );
        if (request.signal.aborted) return;
        if (direction === "previous") {
          const element = root.current?.querySelector(
            `[data-reading-page="${first}"]`,
          );
          if (element)
            anchor.current = {
              page: first,
              top: element.getBoundingClientRect().top,
            };
        }
        setPages((current) =>
          direction === "next"
            ? [...current, ...batch]
            : [...batch, ...current],
        );
      } catch (failure) {
        if (!request.signal.aborted) {
          setError(
            failure instanceof Error
              ? failure.message
              : "Chargement impossible. Réessayez.",
          );
          setAutomatic(false);
        }
      } finally {
        if (controller.current === request) {
          controller.current = null;
          setBusy(false);
        }
      }
    },
    [last, first, slug, initial],
  );
  useEffect(() => {
    void load("next", true);
    return () => {
      controller.current?.abort();
      controller.current = null;
    };
  }, []); // Initial five-page window; this component is keyed by the entry page.
  useLayoutEffect(() => {
    if (!anchor.current) return;
    const element = root.current?.querySelector(
      `[data-reading-page="${anchor.current.page}"]`,
    );
    if (element)
      window.scrollBy({
        top: element.getBoundingClientRect().top - anchor.current.top,
        behavior: "instant",
      });
    anchor.current = null;
  }, [pages]);
  useEffect(() => {
    if (
      !automatic ||
      busy ||
      error ||
      last >= initial.page_count ||
      !sentinel.current
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void load("next");
      },
      { rootMargin: "500px 0px" },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [automatic, busy, error, last, initial.page_count, load]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          )[0];
        if (!visible) return;
        const page = pages.find(
          (item) =>
            item.page_number ===
            Number((visible.target as HTMLElement).dataset.readingPage),
        );
        if (page) {
          onActive(page);
          const url = new URL(window.location.href);
          url.searchParams.set("page", String(page.page_number));
          // Update the shareable address without asking Next to remount the reader.
          window.history.replaceState(window.history.state, "", url);
        }
      },
      { rootMargin: "-180px 0px -55% 0px", threshold: 0 },
    );
    root.current
      ?.querySelectorAll("[data-reading-page]")
      .forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [pages, onActive]);
  return (
    <div ref={root} className="corpus-continuous">
      <div className="corpus-reading-options">
        <span>Lecture continue</span>
        <label>
          <input
            type="checkbox"
            checked={automatic}
            onChange={(event) => setAutomatic(event.target.checked)}
          />{" "}
          Charger la suite automatiquement
        </label>
      </div>
      {first > 1 && (
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => load("previous")}
        >
          Charger les pages précédentes
        </Button>
      )}
      {pages.map((page) => (
        <section
          key={page.page_number}
          id={`page-${page.page_number}`}
          data-reading-page={page.page_number}
          className="atlas-reading-paper"
          aria-label={`Transcription, page ${page.page_number}`}
        >
          <header className="corpus-page-folio">
            <a href={`#page-${page.page_number}`}>Page {page.page_number}</a>
            <CopyReference
              title={page.title}
              page={page.page_number}
              pdfUrl={page.pdf_url}
            />
          </header>
          <MarkdownPage
            markdown={page.markdown}
            slug={slug}
            publicationId={page.publication_id}
          />
          <footer className="corpus-page-footer">
            Fin de la page {page.page_number}
            {page.pdf_url && (
              <a href={page.pdf_url} target="_blank" rel="noreferrer">
                Vérifier dans le PDF officiel
              </a>
            )}
          </footer>
        </section>
      ))}
      <div ref={sentinel} className="corpus-load-more" aria-busy={busy}>
        <p role={error ? "alert" : "status"}>
          {error ||
            (busy
              ? "Chargement des pages…"
              : last === initial.page_count
                ? "Vous avez atteint la fin du document."
                : `Pages ${first} à ${last} chargées sur ${initial.page_count}.`)}
        </p>
        {last < initial.page_count && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => load("next")}
          >
            {error ? "Réessayer" : "Charger les 5 pages suivantes"}
          </Button>
        )}
      </div>
    </div>
  );
}
