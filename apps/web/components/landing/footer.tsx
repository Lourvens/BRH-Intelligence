import Link from "next/link";

import { Brand } from "@/components/brand";

export function LandingFooter() {
  return (
    <footer>
      <div className="footer-inner">
        <div>
          <Brand subtitle="Recherche documentaire" />
          <p>
            Un environnement de recherche sur les publications de la Banque de
            la République d’Haïti.
          </p>
        </div>
        <div className="footer-links">
          <div>
            <b>Produit</b>
            <a href="/assistant">Agent</a>
            <a href="/brh-corpus">Corpus</a>
          </div>
          <div>
            <b>Recherche</b>
            <a href="#methode">Méthode</a>
            <a href="#sources">Sources</a>
          </div>
          <div>
            <b>Institution</b>
            <Link href="/brh-corpus">Tout le corpus</Link>
            <a href="https://www.brh.ht" target="_blank" rel="noreferrer">
              Portail brh.ht
            </a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>BRH Intelligence</span>
        <span>Données publiques · Interface en français</span>
      </div>
    </footer>
  );
}
