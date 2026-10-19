import { Hero } from "@/components/home/hero";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <SiteHeader />
      <main id="contenu">
        <Hero />
      </main>
    </div>
  );
}
