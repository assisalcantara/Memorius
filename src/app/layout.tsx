import type { Metadata } from "next";
import { TenantProvider } from "@/context/TenantContext";
import { ToastProvider } from "@/context/ToastContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "LegacyFlow - Gestão Funerária",
  description: "Sistema de Gestão para Funerárias",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <ToastProvider>
          <TenantProvider>{children}</TenantProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
