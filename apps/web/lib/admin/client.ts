import type { AdminFeedback, FeedbackPage, FeedbackStatus } from "./types";

async function adminRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options });
  if (!response.ok) {
    if (response.status === 401)
      throw new Error(
        "Votre session a expiré. Reconnectez-vous à l’administration.",
      );
    throw new Error(
      "L’opération a échoué. Vos modifications sont conservées ; réessayez.",
    );
  }
  return response.json() as Promise<T>;
}
export function loadFeedback(
  status: FeedbackStatus | "all",
  page: number,
  signal: AbortSignal,
) {
  const search = new URLSearchParams({ page: String(page) });
  if (status !== "all") search.set("status", status);
  return adminRequest<FeedbackPage>(`/api/admin/feedback?${search}`, {
    signal,
  });
}
export function updateFeedback(
  id: string,
  status: FeedbackStatus,
  admin_note: string,
) {
  return adminRequest<AdminFeedback>(
    `/api/admin/feedback/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, admin_note }),
    },
  );
}
