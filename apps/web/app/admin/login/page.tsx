import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { adminConfigured, isAdminSession } from "@/lib/admin/session";

export default async function AdminLoginPage() {
  if (await isAdminSession()) redirect("/admin");
  return (
    <main id="contenu" className="grid min-h-dvh place-items-center bg-surface-alt px-4 py-12 text-ink">
      <section className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-9">
        <Link href="/" className="text-small font-semibold text-navy-ink hover:underline">BRH Intelligence</Link>
        <p className="mb-3 mt-10 text-caption font-semibold uppercase tracking-widest text-ink-muted">Espace administrateur</p>
        <h1 className="font-display text-2xl font-semibold">Gardez une vue d’ensemble.</h1>
        <p className="mb-8 mt-3 text-small leading-relaxed text-ink-muted">Consultez l’état du corpus, l’activité enregistrée et les avis des utilisateurs.</p>
        <LoginForm configured={adminConfigured()} />
        <Link href="/assistant" className="mt-7 inline-block text-small text-azure hover:underline">Retour à l’assistant</Link>
      </section>
    </main>
  );
}
