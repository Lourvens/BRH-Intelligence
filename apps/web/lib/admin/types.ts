import type { CorpusStats } from "@/lib/corpus/types";
import type { FeedbackCategory } from "@/lib/feedback/types";

export { feedbackCategories } from "@/lib/feedback/types";

export const feedbackStatuses = {
  new: "Nouveau",
  in_review: "En cours",
  resolved: "Résolu",
} as const;
export type FeedbackStatus = keyof typeof feedbackStatuses;
export type AdminFeedback = {
  id: string;
  category: FeedbackCategory;
  message: string;
  page_path: string;
  thread_id: string | null;
  answer_excerpt: string | null;
  status: FeedbackStatus;
  admin_note: string;
  created_at: string;
  updated_at: string;
};
export type FeedbackPage = {
  items: AdminFeedback[];
  total: number;
  page: number;
  page_size: number;
};
export type AdminOverview = {
  generated_at: string;
  corpus: CorpusStats | null;
  readiness: {
    ready: boolean;
    database: boolean;
    artifact_storage: boolean;
    documents: number;
    published_documents: number;
    unpublished_documents: number;
    last_synced_at: string | null;
  } | null;
  usage: {
    days: number;
    completed_turns: number;
    active_identities: number;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    daily: { date: string; completed_turns: number; total_tokens: number }[];
  };
  jobs: {
    counts: Record<"pending" | "running" | "succeeded" | "failed", number>;
    recent: {
      job_id: string;
      title: string;
      stage: string;
      status: string;
      started_at: string;
      finished_at: string | null;
    }[];
  };
  feedback: Record<FeedbackStatus | "total", number>;
};
