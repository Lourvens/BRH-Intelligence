export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-brand)] text-sm font-bold text-white">
          BRH
        </div>
        <div className="leading-tight">
          <h1 className="text-lg font-semibold">BRH Intelligence</h1>
          <p className="text-xs text-[var(--color-muted)]">
            Banque de la République d&apos;Haïti
          </p>
        </div>
      </div>

      <p className="text-sm text-[var(--color-muted)]">
        Scaffold prêt. Le chat, les citations et le lecteur de PDF restent à
        construire (voir{" "}
        <code className="rounded bg-[var(--color-surface)] px-1 py-0.5 text-xs">
          apps/web/README.md
        </code>
        ).
      </p>

      <ol className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm">
        <li>1. `lib/agent.ts` — brancher `useStream` sur le serveur LangGraph</li>
        <li>2. un composant chat + rendu des messages</li>
        <li>3. des puces de citation vers `/documents/[slug]?page=N`</li>
        <li>4. la route `/api/pdfs/[slug]` et le lecteur PDF</li>
      </ol>
    </main>
  );
}
