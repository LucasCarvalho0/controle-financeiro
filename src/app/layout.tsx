import type { Metadata, Viewport } from "next";
import { PwaInstaller } from "@/components/pwa/pwa-installer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Controle Pro - Controle Financeiro",
  description: "Controle financeiro pessoal e empresarial completo: receitas, despesas, contas e relatórios.",
  applicationName: "Controle Pro",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Controle Pro",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#1e3a8a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body>
        {children}
        <PwaInstaller />
      </body>
    </html>
  );
}
