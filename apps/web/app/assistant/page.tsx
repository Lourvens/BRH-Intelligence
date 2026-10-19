import type { Metadata } from "next";

import { AssistantShell } from "@/components/assistant/assistant-shell";

export const metadata: Metadata = {
  title: "Assistant documentaire",
  description:
    "Posez une question sur les publications de la Banque de la République d’Haïti. Chaque réponse renvoie au document et à la page.",
};

export default function AssistantPage() {
  return <AssistantShell />;
}
