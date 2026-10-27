import { ResearchHeader } from "@/components/corpus/research-header";
export default function ResearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-bg text-ink">
      <ResearchHeader />
      <main id="contenu">{children}</main>
    </div>
  );
}
