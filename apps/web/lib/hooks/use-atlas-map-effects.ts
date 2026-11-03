"use client";

import {
  useEffect,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";

export function useAtlasMapEffects({
  boundary,
  exploreRef,
  inspectorRef,
  selected,
  showInspector,
  mobile,
  filtersOpen,
  onDismissInspector,
}: {
  boundary: HTMLElement | null;
  exploreRef: RefObject<HTMLDivElement | null>;
  inspectorRef: RefObject<HTMLElement | null>;
  selected: string;
  showInspector: boolean;
  mobile: boolean | null;
  filtersOpen: boolean;
  onDismissInspector: () => void;
}): { fullscreen: boolean; setFullscreen: Dispatch<SetStateAction<boolean>> } {
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const element = exploreRef.current;
    if (!element || !boundary) return;
    const observer = new ResizeObserver(() => {
      boundary.style.setProperty(
        "--map-tools-height",
        `${element.offsetHeight}px`,
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [boundary]);
  useEffect(() => {
    if (!showInspector || mobile !== false) return;
    inspectorRef.current?.focus({ preventScroll: true });
  }, [selected, showInspector, mobile]);
  useEffect(() => {
    if (!fullscreen) return;
    const previous = document.body.style.overflow;
    const header = document.querySelector<HTMLElement>(".research-header");
    const wasInert = header?.inert ?? false;
    document.body.style.overflow = "hidden";
    if (header) header.inert = true;
    return () => {
      document.body.style.overflow = previous;
      if (header) header.inert = wasInert;
    };
  }, [fullscreen]);
  useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (
        event.key !== "Escape" ||
        event.defaultPrevented ||
        filtersOpen ||
        (mobile && showInspector)
      )
        return;
      if (showInspector && !mobile) {
        event.preventDefault();
        onDismissInspector();
      } else if (fullscreen) setFullscreen(false);
    }
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  });
  return { fullscreen, setFullscreen };
}
