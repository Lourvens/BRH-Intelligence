"use client";

import { useEffect, useRef } from "react";

export function useChatScroll(threadId: string | undefined, messageCount: number, isThinking: boolean, reduceMotion: boolean | null) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const followRef = useRef(true);

  useEffect(() => { followRef.current = true; }, [threadId]);
  useEffect(() => {
    const node = scrollRef.current;
    if (node && followRef.current) node.scrollTo({ top: node.scrollHeight, behavior: reduceMotion ? "instant" : "smooth" });
  }, [threadId, messageCount, isThinking, reduceMotion]);

  function handleScroll() {
    const node = scrollRef.current;
    if (node) followRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80;
  }
  function followMessages() { followRef.current = true; }
  return { scrollRef, handleScroll, followMessages };
}
