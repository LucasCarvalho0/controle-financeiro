import type { Metadata, Viewport } from "next";
import { PwaInstaller } from "@/components/pwa/pwa-installer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Controle Pro - Controle Financeiro",
  description:
    "Controle financeiro pessoal e empresarial completo: receitas, despesas, contas e relatórios.",
  applicationName: "Controle Pro",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Controle Pro",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
  other: { "mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: "#1e3a8a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <PwaInstaller />
      </body>
    </html>
  );
}
