"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Check, ChevronRight, CircleAlert, Search } from "lucide-react";
import { ACTIVITY_LABELS, type AgentActivity as Activity } from "@/lib/chat/agent-activity";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { disclosureVariants, feedbackTransition } from "@/lib/motion";
import { cn } from "@/lib/utils";

const TOOL_STAGES = new Set(["search", "assess_coverage", "refine"]);

const LIST_VARIANTS: Variants = {
  closed: {},
  open: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
};
const LIST_VARIANTS_REDUCED: Variants = {
  closed: {},
  open: { transition: { staggerChildren: 0, delayChildren: 0 } },
};
const ITEM_VARIANTS: Variants = {
  closed: { opacity: 0, y: 4 },
  open: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: [0.23, 1, 0.32, 1] },
  },
};
const ITEM_VARIANTS_REDUCED: Variants = {
  closed: { opacity: 0 },
  open: { opacity: 1, transition: { duration: 0 } },
};

export function AgentActivity({ activities, stopped, isStopping, failed, live = false, streaming = false }: {
  activities: Activity[]; stopped: boolean; isStopping: boolean; failed: boolean;
  live?: boolean; streaming?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const userClosed = useRef(false);
  const responseStarted = useRef(false);
  const reduceMotion = useReducedMotion();
  const listVariants = reduceMotion ? LIST_VARIANTS_REDUCED : LIST_VARIANTS;
  const itemVariants = reduceMotion ? ITEM_VARIANTS_REDUCED : ITEM_VARIANTS;
  const drafting = activities.some(
    (item) => item.stage === "draft" && item.status === "running",
  );
  const active = activities.findLast((item) => item.status === "running");

  useEffect(() => {
    if (!live || activities.length) return;
    userClosed.current = false;
    responseStarted.current = false;
    setOpen(false);
  }, [activities.length, live]);

  useEffect(() => {
    if (!live || !streaming || responseStarted.current) return;
    responseStarted.current = true;
    setOpen(false);
  }, [live, streaming]);

  useEffect(() => {
    if (!live || streaming || !drafting || responseStarted.current) return;
    responseStarted.current = true;
    setOpen(false);
  }, [drafting, live, streaming]);

  useEffect(() => {
    if (!live || streaming || responseStarted.current || userClosed.current)
      return;
    if (activities.some((item) => TOOL_STAGES.has(item.stage))) setOpen(true);
  }, [activities, live, streaming]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    userClosed.current = !next;
  }
  const title = isStopping ? "Arrêt en cours…" : failed ? "Connexion interrompue" :
    stopped ? "Traitement interrompu" : active ? ACTIVITY_LABELS[active.stage] :
      activities.length ? "Activité terminée" : "Connexion à l’assistant…";
  return (
    <Collapsible open={open} onOpenChange={handleOpenChange} className="min-w-0">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="group h-auto min-h-11 max-w-full justify-start gap-2 rounded-lg px-2 text-left text-small text-ink-muted hover:bg-surface-alt">
          {failed ? <CircleAlert className="size-3.5" aria-hidden /> :
            <span className={cn("size-1.5 shrink-0 rounded-full", active && !stopped ? "bg-azure motion-safe:animate-pulse" : "bg-ink-muted/50")} aria-hidden />}
          <span className="truncate">{title}</span>
          <ChevronRight className="size-3.5 shrink-0 transition-transform duration-150 group-data-[state=open]:rotate-90 motion-reduce:transition-none" aria-hidden />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent forceMount asChild>
        <motion.div
          initial={false}
          animate={open ? "open" : "closed"}
          variants={disclosureVariants}
          transition={reduceMotion ? { duration: 0 } : feedbackTransition}
          inert={!open}
          aria-hidden={!open}
          className="grid pl-3"
        >
          <div className="-ml-2 min-h-0 overflow-hidden pl-2">
            <motion.ol
              initial={false}
              animate="open"
              variants={listVariants}
              className="my-3 space-y-5 border-l border-border pl-5"
              aria-label="Activité de l’assistant"
            >
              {!activities.length && <li className="text-small text-ink-muted">En attente du premier événement.</li>}
              {activities.map((item) => {
                const Icon = item.status === "error" ? CircleAlert : item.status === "complete" ? Check : Search;
                return <motion.li
                  key={item.id}
                  initial={false}
                  variants={itemVariants}
                  className="relative"
                >
                  <span className="absolute -left-7 top-0.5 bg-surface p-0.5"><Icon className="size-3 text-ink-muted" aria-hidden /></span>
                  <p className="text-small font-medium text-ink">{ACTIVITY_LABELS[item.stage]} <span className="ml-2 text-caption font-normal text-ink-muted">{item.status === "complete" ? "Terminé" : item.status === "error" ? "À reprendre" : stopped ? "Interrompu" : "En cours"}</span></p>
                  {item.query && <p className="mt-1 break-words text-small text-ink-muted">{item.query}</p>}
                  {item.summary && <p className="mt-1 text-small text-ink-muted">{item.summary}</p>}
                  {item.result_count !== undefined && <p className="mt-1 text-caption text-ink-muted">{item.result_count} passage{item.result_count > 1 ? "s" : ""} retrouvé{item.result_count > 1 ? "s" : ""}</p>}
                  {item.sources?.map((source, index) => <div key={`${source.title}:${source.page}:${index}`} className="mt-2 rounded-lg bg-surface-alt/60 px-3 py-2">
                    <p className="text-caption text-ink"><span className="mr-2 rounded bg-gold px-1.5 py-0.5 text-navy-deep">p. {source.page}</span>{source.title}</p>
                    <p className="mt-1 line-clamp-2 font-reading text-small leading-relaxed text-ink-muted">{source.excerpt}</p>
                  </div>)}
                </motion.li>;
              })}
            </motion.ol>
          </div>
        </motion.div>
      </CollapsibleContent>
    </Collapsible>
  );
}
