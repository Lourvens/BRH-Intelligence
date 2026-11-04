import type { AgentActivity } from "./agent-activity";
import type { ChatMessage } from "./types";

/** The published answer takes ownership before the transport finishes closing. */
export function answerOwnsActivity(
  message: ChatMessage | undefined,
  activities: AgentActivity[],
) {
  if (message?.role !== "assistant") return false;
  if (message.streaming) return true;
  const turnId = activities[0]?.turn_id;
  return Boolean(turnId && (
    message.id === `answer-${turnId}` ||
    message.activities?.some((item) => item.turn_id === turnId)
  ));
}

export function retainPublishedActivity(
  messages: ChatMessage[],
  activities: AgentActivity[],
): ChatMessage[] {
  const last = messages.at(-1);
  if (!answerOwnsActivity(last, activities) || !activities.length) return messages;
  return messages.map((message) => message === last
    ? { ...message, activities: activities.map((item) => {
        const published = message.activities?.find((event) => event.id === item.id);
        return published ? { ...item, ...Object.fromEntries(
          Object.entries(published).filter(([, value]) => value !== undefined),
        ) } : item;
      }).concat(message.activities?.filter((item) =>
        !activities.some((event) => event.id === item.id)) ?? []) }
    : message);
}
