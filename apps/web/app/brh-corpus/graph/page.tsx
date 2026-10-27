import type { Metadata } from "next";
import { Suspense } from "react";
import { AtlasWorkspace } from "@/components/corpus/atlas-workspace";
export const metadata: Metadata = {
  title: "Atlas des connaissances",
  description:
    "Explorer les publications, les entités et leurs relations documentées.",
};
export default function GraphPage() {
  return (
    <>
      <Suspense
        fallback={
          <div className="atlas-page" role="status">
            Préparation de l’atlas…
          </div>
        }
      >
        <AtlasWorkspace />
      </Suspense>
    </>
  );
}
