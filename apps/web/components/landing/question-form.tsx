"use client";

import { useRef, type ReactNode } from "react";

import { LandingIcon } from "./icons";

export function QuestionForm({
  id,
  placeholder,
  variant = "hero",
  chips = [],
  children,
}: {
  id: string;
  placeholder: string;
  variant?: "hero" | "closing";
  chips?: string[];
  children?: ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);

  function pick(question: string) {
    if (!input.current) return;
    input.current.value = question;
    input.current.focus();
  }

  return (
    <>
      <form
        className={variant === "hero" ? "question-form" : undefined}
        id={variant === "hero" ? "question" : undefined}
        action="/assistant"
        method="get"
      >
        <label htmlFor={id}>Votre question</label>
        <div className={variant === "hero" ? "question-control" : undefined}>
          <input
            ref={input}
            id={id}
            name="q"
            placeholder={placeholder}
            autoComplete="off"
          />
          <button
            className={variant === "closing" ? "button gold-button" : "button"}
            type="submit"
          >
            Analyser <LandingIcon name="arrow" size={17} />
          </button>
        </div>
        {children}
      </form>
      {chips.length ? (
        <div className="example-chips" aria-label="Exemples de questions">
          {chips.map((chip) => (
            <button key={chip} type="button" onClick={() => pick(chip)}>
              {chip}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}
