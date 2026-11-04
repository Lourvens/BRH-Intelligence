import { feedbackMessageError, type FeedbackInput } from "./types";

export async function submitFeedback(input: FeedbackInput, signal?: AbortSignal): Promise<{ id: string }> {
  const validationError = feedbackMessageError(input.message);
  if (validationError) throw new Error(validationError);

  const response = await fetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, message: input.message.trim() }),
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(12000)]) : AbortSignal.timeout(12000),
  }).catch(() => {
    throw new Error("La connexion a échoué. Votre texte est conservé : vérifiez votre connexion puis réessayez.");
  });
  const body = await response.json().catch(() => null);
  if (response.status === 429) {
    throw new Error("Vous avez envoyé plusieurs avis récemment. Patientez quelques minutes avant de réessayer.");
  }
  if (!response.ok || typeof body?.id !== "string" || !body.id) {
    throw new Error("Votre avis n’a pas pu être enregistré. Votre texte est conservé : réessayez dans un instant.");
  }
  return { id: body.id };
}
