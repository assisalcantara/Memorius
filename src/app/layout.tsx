import type { Metadata } from "next";
import { TenantProvider } from "@/context/TenantContext";
import { ToastProvider } from "@/context/ToastContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Memorius | CRM para Planos de Assistência Familiar",
  description:
    "Organize clientes, contratos, mensalidades, atendimentos, cobranças e relatórios em uma única plataforma para empresas de assistência familiar.",
  keywords: [
    "CRM funerário",
    "sistema funerário",
    "gestão funerária",
    "planos de assistência familiar",
    "software para funerária",
    "cobrança recorrente",
    "contratos funerários",
  ],
  metadataBase: new URL("https://www.memorius.com.br"),
  alternates: {
    canonical: "https://www.memorius.com.br",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Memorius | CRM para Planos de Assistência Familiar",
    description:
      "Organize clientes, contratos, mensalidades, atendimentos, cobranças e relatórios em uma única plataforma para empresas de assistência familiar.",
    url: "https://www.memorius.com.br",
    siteName: "Memorius",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Memorius | CRM para Planos de Assistência Familiar",
    description:
      "Organize clientes, contratos, mensalidades, atendimentos, cobranças e relatórios em uma única plataforma para empresas de assistência familiar.",
  },
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
