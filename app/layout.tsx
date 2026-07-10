import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import Providers from "@/components/shared/providers";
import { CartProvider } from "@/components/cart/cart-context";
import { Header, Footer } from "@/components/shared/navigation";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | Nura Skincare",
    default: "Nura Skincare | Cuidados Premium da Pele Coreana em Moçambique",
  },
  description: "Descubra a melhor seleção de produtos de K-Beauty (cosméticos coreanos) em Moçambique. Fórmulas calmas, luxuosas e eficazes para uma pele saudável.",
  metadataBase: new URL("https://nura.co.mz"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Nura Skincare | Cuidados Premium da Pele Coreana em Moçambique",
    description: "Cosméticos coreanos autênticos e premium em Moçambique.",
    url: "https://nura.co.mz",
    siteName: "Nura Skincare",
    locale: "pt_MZ",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nura Skincare",
    description: "Cosméticos coreanos autênticos e premium em Moçambique.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-MZ"
      className={`${inter.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground selection:bg-primary selection:text-white">
        <div className="w-full bg-primary text-white text-[10px] sm:text-xs py-2 px-4 text-center tracking-widest uppercase font-medium border-b border-white/5">
          Entrega disponível em Maputo e para outras províncias mediante confirmação.
        </div>
        <Providers>
          <CartProvider>
            <Header />
            <main className="flex-1 flex flex-col">{children}</main>
            <Footer />
          </CartProvider>
        </Providers>
      </body>
    </html>
  );
}
