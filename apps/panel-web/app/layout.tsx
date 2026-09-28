import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { Inter, JetBrains_Mono, Montserrat } from "next/font/google";
import "./globals.css";
import { THEME_COOKIE, normalizeTheme } from "@/lib/theme";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Panel · SolversHub",
    template: "%s · SolversHub",
  },
  description: "Centro de control de SolversHub — Centro de soluciones impulsado con IA.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const store = await cookies();
  const theme = normalizeTheme(store.get(THEME_COOKIE)?.value);

  return (
    <html
      lang="es"
      data-theme={theme}
      className={`${montserrat.variable} ${inter.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
