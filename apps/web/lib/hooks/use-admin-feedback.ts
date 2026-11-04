"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadFeedback, updateFeedback } from "@/lib/admin/client";
import type {
  AdminFeedback,
  FeedbackPage,
  FeedbackStatus,
} from "@/lib/admin/types";

export function useAdminFeedback(initial: FeedbackPage | null) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [status, setStatus] = useState<FeedbackStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [pending, setPending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const first = useRef(true);
  const savingRef = useRef(false);

  useEffect(() => {
    if (first.current && initial) {
      first.current = false;
      return;
    }
    first.current = false;
    const controller = new AbortController();
    setPending(true);
    setError("");
    loadFeedback(status, page, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
          const lastPage = Math.max(
            1,
            Math.ceil(result.total / result.page_size),
          );
          if (page > lastPage) setPage(lastPage);
        }
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Les avis sont indisponibles.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setPending(false);
      });
    return () => controller.abort();
  }, [status, page, revision, initial]);

  async function save(
    item: AdminFeedback,
    nextStatus: FeedbackStatus,
    note: string,
  ) {
    if (savingRef.current) return false;
    savingRef.current = true;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await updateFeedback(item.id, nextStatus, note);
      setNotice("Le statut et la note interne ont été enregistrés.");
      return true;
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "L’enregistrement a échoué.",
      );
      return false;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return {
    data,
    status,
    page,
    pending,
    saving,
    error,
    notice,
    save,
    reviewClosed: () => {
      setRevision((value) => value + 1);
      router.refresh();
    },
    filter: (value: FeedbackStatus | "all") => {
      setStatus(value);
      setPage(1);
    },
    setPage,
    refresh: () => setRevision((value) => value + 1),
  };
}
