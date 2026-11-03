"use client";

import { useEffect, useRef, useState } from "react";

export function useChatScroll(threadId: string | undefined, messageCount: number, isThinking: boolean, reduceMotion: boolean | null, progressVersion = 0) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const followRef = useRef(true);
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => { followRef.current = true; }, [threadId]);
  useEffect(() => {
    const node = scrollRef.current;
    if (node && followRef.current) node.scrollTo({ top: node.scrollHeight, behavior: reduceMotion || isThinking ? "instant" : "smooth" });
  }, [threadId, messageCount, isThinking, reduceMotion, progressVersion]);

  useEffect(() => {
    const node = scrollRef.current;
    const content = node?.firstElementChild;
    if (!node || !content || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (followRef.current) node.scrollTo({ top: node.scrollHeight, behavior: "instant" });
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [threadId]);

  function handleScroll() {
    const node = scrollRef.current;
    if (node) {
      followRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80;
      setIsAtBottom(followRef.current);
    }
  }
  function followMessages({ smooth = false }: { smooth?: boolean } = {}) {
    followRef.current = true;
    setIsAtBottom(true);
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: smooth && !reduceMotion ? "smooth" : "instant",
    });
  }
  return { scrollRef, handleScroll, followMessages, isAtBottom };
}
