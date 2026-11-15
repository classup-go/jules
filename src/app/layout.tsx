import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "Jules Class Go - Plateforme éducative",
  description: "Connecter élèves et professeurs pour la réussite",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${inter.className} bg-[#f6f7f8] text-[#111418] antialiased`}>
        {children}
      </body>
    </html>
  );
}