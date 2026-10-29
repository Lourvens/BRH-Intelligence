"use client";

import { Check, ChevronDown, Circle, CircleAlert, Sparkles } from "lucide-react";
import { ACTIVITY_LABELS, type AgentActivity as Activity } from "@/lib/chat/agent-activity";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useChatScroll } from "@/lib/hooks/use-chat-scroll";
import { useReducedMotion } from "framer-motion";

export function AgentActivity({ activities, stopped, isStopping, failed }: {
  activities: Activity[];
  stopped: boolean;
  isStopping: boolean;
  failed: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const progressVersion = activities.length + activities.filter((item) => item.status !== "running").length;
  const { scrollRef, handleScroll } = useChatScroll(activities[0]?.turn_id, progressVersion, !stopped, reducedMotion);
  const active = activities.findLast((item) => item.status === "running");
  const latest = active ?? activities.at(-1);
  const title = isStopping ? "Arrêt en cours…" : failed ? "Connexion interrompue" : stopped ? "Traitement interrompu" :
    latest ? ACTIVITY_LABELS[latest.stage] : "Connexion à l’assistant…";

  return (
    <Collapsible defaultOpen className="min-w-0 rounded-xl border border-border bg-surface-alt/40">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="group h-auto min-h-14 w-full justify-between gap-3 whitespace-normal rounded-xl px-4 py-3 text-left hover:bg-surface-alt">
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-navy-ink">
              <Sparkles className="size-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-caption text-ink-muted">Activité de l’assistant</span>
              <span className="block text-small font-medium text-navy-ink">{title}</span>
            </span>
          </span>
          <ChevronDown aria-hidden className="size-4 shrink-0 text-ink-muted transition-transform duration-150 group-data-[state=open]:rotate-180 motion-reduce:transition-none" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div ref={scrollRef} onScroll={handleScroll} className="max-h-80 overflow-y-auto overscroll-contain border-t border-border px-4 py-4 sm:px-5">
          {!activities.length && <p className="text-small text-ink-muted">Votre demande a été envoyée. En attente du premier événement.</p>}
          <ol className="space-y-4" aria-label="Étapes observées pendant cette demande">
            {activities.map((item) => {
              const running = item.status === "running" && !stopped;
              const Icon = item.status === "error" ? CircleAlert : item.status === "complete" ? Check : Circle;
              return (
                <li key={item.id} className="flex min-w-0 gap-3">
                  <span className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full", running ? "bg-navy text-white" : "text-ink-muted")}>
                    <Icon className="size-3.5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-small font-medium text-ink">
                      {ACTIVITY_LABELS[item.stage]}
                      <span className="ml-2 text-caption font-normal text-ink-muted">
                        {running ? "En cours" : item.status === "error" ? "À reprendre" : item.status === "complete" ? "Terminé" : "Interrompu"}
                      </span>
                    </p>
                    {item.query && <p className="mt-1 break-words text-small leading-relaxed text-ink-muted">« {item.query} »</p>}
                    {item.summary && <p className="mt-1 text-small leading-relaxed text-ink-muted">{item.summary}</p>}
                    {item.goals?.length ? <ul className="mt-2 space-y-1 border-l border-border pl-3 text-small text-ink-muted">
                      {item.goals.map((goal, index) => <li key={index} className="break-words">{goal}</li>)}
                    </ul> : null}
                    {item.result_count !== undefined && <p className="mt-1 text-caption text-ink-muted">
                      {item.result_count === 0 ? "Aucun passage trouvé pour cette recherche." : `${item.result_count} passage${item.result_count > 1 ? "s" : ""} repéré${item.result_count > 1 ? "s" : ""}`}
                    </p>}
                    {item.sources?.map((source, index) => <div key={`${source.title}:${source.page}:${index}`} className="mt-2 rounded-lg border border-border bg-surface px-3 py-2">
                      <p className="break-words text-caption font-medium text-navy-ink">
                        <span className="mr-2 inline-block rounded bg-gold px-1.5 py-0.5 text-navy-deep">p. {source.page}</span>{source.title || "Publication BRH"}
                      </p>
                      <p className="mt-1.5 break-words font-reading text-small leading-relaxed text-ink-muted">{source.excerpt}…</p>
                    </div>)}
                  </div>
                </li>
              );
            })}
          </ol>
          {activities.some((item) => item.stage === "search") && <p className="mt-4 border-t border-border pt-3 text-caption text-ink-muted">Les passages repérés seront vérifiés avant d’être cités dans la réponse.</p>}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
