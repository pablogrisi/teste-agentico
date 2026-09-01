import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";

const kanit = Kanit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-kanit",
});

export const metadata: Metadata = {
  title: "LicIA Analisadora",
  description:
    "Verificação assistida por IA da conformidade de documentos de processos licitatórios.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={kanit.variable}>
      <body>{children}</body>
    </html>
  );
}
