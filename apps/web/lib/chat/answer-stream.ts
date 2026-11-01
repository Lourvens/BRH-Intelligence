/** A user-visible conversational delta emitted by the graph. */
export type AnswerDelta = { turnId: string; text: string; sequence?: number };

export function parseAnswerDelta(value: unknown): AnswerDelta | null {
  if (!value || typeof value !== "object") return null;
  const event = value as Record<string, unknown>;
  if (event.type !== "brh.answer.delta" || typeof event.turn_id !== "string" ||
      typeof event.text !== "string" || !event.turn_id || !event.text) return null;
  return { turnId: event.turn_id, text: event.text,
    ...(typeof event.sequence === "number" ? { sequence: event.sequence } : {}) };
}

export function appendAnswerDelta(
  previous: AnswerDelta | null, delta: AnswerDelta,
): AnswerDelta {
  return previous && (previous.turnId !== delta.turnId ||
      (previous.sequence !== undefined && delta.sequence !== undefined && delta.sequence <= previous.sequence))
    ? previous
    : { ...delta, text: (previous?.text ?? "") + delta.text };
}
