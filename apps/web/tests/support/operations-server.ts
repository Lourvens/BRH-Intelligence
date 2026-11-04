/** Deterministic operations service for browser tests; never used by the app. */
import type { AdminFeedback, AdminOverview, FeedbackStatus } from "../../lib/admin/types";

const fixtureTime = "2026-11-04T12:00:00.000Z";
const pageSize = 20;
const feedback: AdminFeedback[] = Array.from({ length: 26 }, (_, index) => ({
  id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  category: "suggestion",
  message: `Avis de référence ${index + 1} : améliorer les explications du corpus.`,
  page_path: "/assistant",
  thread_id: null,
  answer_excerpt: null,
  status: "new",
  admin_note: "",
  created_at: fixtureTime,
  updated_at: fixtureTime,
}));

function overview(): AdminOverview {
  return {
    generated_at: fixtureTime,
    corpus: {
      discovered_urls: 30, readable_documents: 24, readable_pages: 240,
      entities: 15, graph_documents: 20, relationships: 35,
      processed_documents: 26, as_of: fixtureTime, indexed_documents: 22, indexed_vectors: 800,
    },
    readiness: {
      ready: false, database: true, artifact_storage: true, documents: 26,
      published_documents: 24, unpublished_documents: 2, last_synced_at: fixtureTime,
    },
    usage: {
      days: 30, completed_turns: 17, active_identities: 5,
      input_tokens: 12000, output_tokens: 5000, total_tokens: 17000,
      daily: [{ date: "2026-11-03", completed_turns: 9, total_tokens: 9000 }, { date: "2026-11-04", completed_turns: 8, total_tokens: 8000 }],
    },
    jobs: {
      counts: { pending: 1, running: 1, succeeded: 24, failed: 2 },
      recent: [{ job_id: "fixture-job", title: "Rapport de conjoncture", stage: "extract", status: "failed", started_at: fixtureTime, finished_at: fixtureTime }],
    },
    feedback: {
      total: feedback.length,
      new: feedback.filter((item) => item.status === "new").length,
      in_review: feedback.filter((item) => item.status === "in_review").length,
      resolved: feedback.filter((item) => item.status === "resolved").length,
    },
  };
}

export function operationsResponse(request: Request): Promise<Response> | Response {
  const url = new URL(request.url);
  if (url.pathname === "/ok") return Response.json({ ok: true });
  const authorization = request.headers.get("authorization") ?? "";
  const expected = process.env.BRH_ADMIN_API_TOKEN;
  if (expected ? authorization !== `Bearer ${expected}` : !/^Bearer .{32,}$/.test(authorization)) {
    return Response.json({ error: { message: "Accès non autorisé." } }, { status: 401 });
  }
  if (url.pathname === "/admin/v1/overview") return Response.json(overview());
  if (url.pathname === "/admin/v1/feedback" && request.method === "GET") {
    const status = url.searchParams.get("status");
    const page = Number(url.searchParams.get("page") ?? 1);
    const items = status ? feedback.filter((item) => item.status === status) : feedback;
    return Response.json({ items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length, page, page_size: pageSize });
  }
  if (url.pathname === "/feedback/v1" && request.method === "POST") return createFeedback(request);
  if (url.pathname.startsWith("/admin/v1/feedback/") && request.method === "PATCH") return updateFeedback(request, url.pathname.split("/").at(-1)!);
  return Response.json({ error: { message: "Introuvable." } }, { status: 404 });
}

async function createFeedback(request: Request) {
  if (!/^[a-f0-9]{64}$/.test(request.headers.get("x-brh-feedback-identity") ?? "")) {
    return Response.json({ error: { message: "Identité invalide." } }, { status: 400 });
  }
  const input = await request.json();
  if (!input.message || input.message.trim().length < 10) return Response.json({ error: { message: "Avis trop court." } }, { status: 400 });
  const item: AdminFeedback = {
    id: crypto.randomUUID(), category: input.category, message: input.message.trim(),
    page_path: input.page_path, thread_id: input.thread_id ?? null,
    answer_excerpt: input.answer_excerpt ?? null, status: "new", admin_note: "",
    created_at: fixtureTime, updated_at: fixtureTime,
  };
  feedback.unshift(item);
  return Response.json({ id: item.id, status: item.status }, { status: 201 });
}

async function updateFeedback(request: Request, id: string) {
  const item = feedback.find((entry) => entry.id === id);
  if (!item) return Response.json({ error: { message: "Introuvable." } }, { status: 404 });
  const input = await request.json();
  if (!["new", "in_review", "resolved"].includes(input.status)) return Response.json({ error: { message: "Statut invalide." } }, { status: 400 });
  item.status = input.status as FeedbackStatus;
  item.admin_note = input.admin_note;
  item.updated_at = fixtureTime;
  return Response.json(item);
}

if (import.meta.main) Bun.serve({ port: 2025, hostname: "127.0.0.1", fetch: operationsResponse });
