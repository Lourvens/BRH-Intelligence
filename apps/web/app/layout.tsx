import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "BRH Intelligence",
  description:
    "Posez vos questions sur les publications officielles de la Banque de la République d'Haïti. Réponses sourcées, avec la page exacte du document.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
