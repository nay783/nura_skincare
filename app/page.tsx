import React from "react";
import Link from "next/link";
import { 
  Droplet, 
  Sparkles, 
  Flame, 
  Sun, 
  Clock, 
  Compass, 
  ShieldCheck, 
  Truck, 
  PhoneCall, 
  Store, 
  FileText
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/product/ProductCard";
import type { Product } from "@/components/product/ProductCard";
import RecommendationsWidget from "@/components/shared/RecommendationsWidget";
import { HeroText } from "@/components/shared/HeroText";
import { HeroFeaturedProduct } from "@/components/product/HeroFeaturedProduct";
import { getLocalFallbackProducts } from "@/lib/supabase/fallback";

export const revalidate = 60; // Revalidate every minute

async function getProducts() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      console.warn("Failed to fetch products or table empty, loading local fallbacks:", error);
      return getLocalFallbackProducts();
    }
    return data as Product[];
  } catch (err) {
    console.warn("Failed to connect to Supabase, loading local fallbacks:", err);
    return getLocalFallbackProducts();
  }
}

// Custom icons mapping for skin goals
const GOAL_ICONS: Record<string, React.ReactNode> = {
  "Hidratação": <Droplet className="h-5 w-5 stroke-[1.5] text-primary" />,
  "Acne": <Flame className="h-5 w-5 stroke-[1.5] text-primary" />,
  "Manchas": <Sparkles className="h-5 w-5 stroke-[1.5] text-primary" />,
  "Oleosidade": <Compass className="h-5 w-5 stroke-[1.5] text-primary" />,
  "Anti-idade": <Clock className="h-5 w-5 stroke-[1.5] text-primary" />,
  "Textura": <Compass className="h-5 w-5 stroke-[1.5] text-primary" />,
  "Pele sensível": <ShieldCheck className="h-5 w-5 stroke-[1.5] text-primary" />,
  "Luminosidade": <Sparkles className="h-5 w-5 stroke-[1.5] text-primary" />,
  "Poros": <Compass className="h-5 w-5 stroke-[1.5] text-primary" />,
  "Rotina diária": <Sun className="h-5 w-5 stroke-[1.5] text-primary" />
};

const SKIN_GOALS = [
  { name: "Hidratação", desc: "Reforçar a barreira cutânea e reter a humidade essencial.", slug: "hidratacao" },
  { name: "Acne", desc: "Acalmar inflamações, purificar os poros e cicatrizar a pele.", slug: "acne" },
  { name: "Manchas", desc: "Uniformizar o tom da pele e reduzir a hiperpigmentação.", slug: "manchas" },
  { name: "Oleosidade", desc: "Regular o sebo sem desidratar ou repuxar a pele.", slug: "oleosidade" },
  { name: "Anti-idade", desc: "Estimular o colagénio e suavizar linhas de expressão.", slug: "anti-idade" },
  { name: "Textura", desc: "Renovar a superfície cutânea para um toque macio e liso.", slug: "textura" },
  { name: "Pele sensível", desc: "Fórmulas calmantes com ingredientes hipoalergénicos.", slug: "pele-sensivel" },
  { name: "Luminosidade", desc: "Devolver o brilho natural e revitalizar peles baças.", slug: "luminosidade" }
];

export default async function Home() {
  const products = await getProducts();
  
  // Filter to only products with positive stock and valid image urls
  const eligibleProducts = products.filter(p => {
    const img = p.main_image_url || p.images?.[0] || p.external_images?.[0] || p.image_url;
    return p.stock_quantity > 0 && !!img && img.trim() !== "";
  });

  // Check if is_featured column exists in response
  const hasFeaturedCol = eligibleProducts.length > 0 && ("is_featured" in eligibleProducts[0]);

  // Sort by is_featured = true
  const sortedEligibles = [...eligibleProducts];
  if (hasFeaturedCol) {
    sortedEligibles.sort((a, b) => {
      const aFeatured = (a as { is_featured?: boolean }).is_featured ? 1 : 0;
      const bFeatured = (b as { is_featured?: boolean }).is_featured ? 1 : 0;
      return bFeatured - aFeatured; // Featured first
    });
  }

  const featuredProduct = sortedEligibles[0] || null;
  const alternativeProducts = sortedEligibles.slice(1);
  
  // Featured products (slice first 4)
  const featuredProducts = products.slice(0, 4);
  // New arrivals (same for now, or reversed)
  const newArrivals = products.slice(0, 4);
  // Best sellers (fallback)
  const bestSellers = products.slice(0, 4);

  const whatsappAdviceUrl = "https://wa.me/258840000000?text=Ol%C3%A1%20Nura%2C%20gostaria%20de%20ajuda%20para%20escolher%20a%20minha%20rotina%20de%20skincare.";

  return (
    <div className="flex flex-col w-full font-sans bg-background">
      
      {/* 1. Hero Section */}
      <section className="relative min-h-[78vh] lg:min-h-[82vh] flex items-center py-12 lg:py-16 px-4 sm:px-6 lg:px-8 border-b border-border bg-[#FAF9F6]/30">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">
          {/* Left: Editorial Content */}
          <HeroText whatsappAdviceUrl={whatsappAdviceUrl} />

          {/* Right: Dynamic Featured Product Visual Card */}
          <div className="lg:col-span-5 flex items-center justify-center w-full">
            <HeroFeaturedProduct 
              initialProduct={featuredProduct} 
              alternativeProducts={alternativeProducts} 
            />
          </div>
        </div>
      </section>

      {/* 2. Shop By Skin Goal */}
      <section id="skin-goals" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-serif text-primary tracking-tight mb-4">
            Comprar por objectivo da pele
          </h2>
          <p className="text-sm text-muted-foreground">
            Escolha produtos desenhados especificamente para tratar as necessidades e metas individuais da sua pele.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {SKIN_GOALS.map((goal) => (
            <Link
              key={goal.name}
              href={`/products?goal=${encodeURIComponent(goal.slug)}`}
              className="group p-6 border border-border hover:border-primary/30 bg-white transition-all rounded-sm flex flex-col space-y-4"
            >
              <div className="p-3 bg-background inline-block w-fit rounded-sm group-hover:bg-muted transition-colors">
                {GOAL_ICONS[goal.name] || <Compass className="h-5 w-5 text-primary" />}
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-lg text-primary group-hover:text-secondary transition-colors font-medium">
                  {goal.name}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {goal.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Featured Products */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border bg-white w-full">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-baseline justify-between mb-12">
            <h2 className="text-3xl font-serif text-primary tracking-tight">
              Produtos em destaque
            </h2>
            <Link
              href="/products"
              className="text-xs font-semibold text-secondary hover:text-primary transition-all uppercase tracking-wider mt-2 sm:mt-0"
            >
              Ver todos os produtos →
            </Link>
          </div>

          {featuredProducts.length === 0 ? (
            <div className="p-12 border border-dashed border-border rounded-sm text-center max-w-xl mx-auto bg-background">
              <p className="text-sm text-muted-foreground mb-6">
                Os produtos estão a ser preparados. Volte em breve ou fale connosco no WhatsApp.
              </p>
              <a
                href={whatsappAdviceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-xs font-semibold uppercase tracking-wider rounded-sm"
              >
                <PhoneCall className="h-4 w-4" />
                Falar no WhatsApp
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. New Arrivals */}
      {newArrivals.length > 0 && (
        <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border bg-background w-full">
          <div className="max-w-7xl mx-auto">
            <div className="mb-12">
              <h2 className="text-3xl font-serif text-primary tracking-tight">
                Novidades
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
              {newArrivals.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. Best Sellers */}
      {bestSellers.length > 0 && (
        <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border bg-white w-full">
          <div className="max-w-7xl mx-auto">
            <div className="mb-12">
              <h2 className="text-3xl font-serif text-primary tracking-tight">
                Mais procurados
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
              {bestSellers.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Personalized Recommendations */}
      <div className="border-t border-border bg-background w-full px-4 sm:px-6 lg:px-8">
        <RecommendationsWidget placement="homepage" limit={4} />
      </div>

      {/* 6. Why Korean Skincare */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border bg-background w-full">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-6">
            <h2 className="text-3xl sm:text-4xl font-serif text-primary tracking-tight leading-tight">
              Porque escolher skincare coreano?
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              O segredo do K-Beauty não reside em soluções rápidas, mas sim em nutrir a saúde a longo prazo da barreira da sua pele.
            </p>
          </div>
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="space-y-2">
              <h3 className="font-serif text-lg text-primary font-medium">Rotinas pensadas por etapas</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Abordagem em camadas que limpa, equilibra o pH, trata imperfeições e sela a hidratação profundamente.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-serif text-lg text-primary font-medium">Fórmulas leves & calmantes</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Texturas fluidas de rápida absorção, ideais para climas tropicais, livres de acabamentos pesados ou gordurosos.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-serif text-lg text-primary font-medium">Foco em hidratação & barreira</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ingredientes que restauram a barreira lipídica para proteger a epiderme de poluentes e raios UV agressivos.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-serif text-lg text-primary font-medium">Ingredientes inovadores</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Uso de ativos consagrados como mucina de caracol, ginseng vermelho, centelha asiática e probióticos do arroz.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Trust Section */}
      <section className="py-12 border-t border-b border-border bg-white w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
          <div className="flex flex-col items-center p-4 space-y-2">
            <ShieldCheck className="h-6 w-6 stroke-[1.5] text-secondary" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">Produtos seleccionados</h4>
            <p className="text-[10px] text-muted-foreground">100% autênticos curados</p>
          </div>
          <div className="flex flex-col items-center p-4 space-y-2">
            <Truck className="h-6 w-6 stroke-[1.5] text-secondary" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">Entrega disponível</h4>
            <p className="text-[10px] text-muted-foreground">Maputo e províncias</p>
          </div>
          <div className="flex flex-col items-center p-4 space-y-2">
            <PhoneCall className="h-6 w-6 stroke-[1.5] text-secondary" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">Apoio via WhatsApp</h4>
            <p className="text-[10px] text-muted-foreground">Conselho personalizado</p>
          </div>
          <div className="flex flex-col items-center p-4 space-y-2">
            <ShieldCheck className="h-6 w-6 stroke-[1.5] text-secondary" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">Compra segura</h4>
            <p className="text-[10px] text-muted-foreground">Pagamento simplificado</p>
          </div>
          <div className="flex flex-col items-center p-4 space-y-2">
            <Store className="h-6 w-6 stroke-[1.5] text-secondary" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">Levantamento em loja</h4>
            <p className="text-[10px] text-muted-foreground">Em Maputo mediante aviso</p>
          </div>
        </div>
      </section>

      {/* 8. Delivery Section */}
      <section id="delivery-info" className="py-20 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto text-center w-full">
        <div className="space-y-4">
          <Truck className="h-8 w-8 stroke-[1.5] text-primary mx-auto mb-2" />
          <h2 className="text-3xl font-serif text-primary tracking-tight">Entrega e levantamento</h2>
          <div className="text-sm text-muted-foreground space-y-2 leading-relaxed">
            <p><strong>Maputo e Matola:</strong> Entregas rápidas ao domicílio mediante confirmação de taxa e morada.</p>
            <p><strong>Outras províncias:</strong> Envios organizados e confirmados previamente por telefone ou WhatsApp.</p>
            <p><strong>Levantamento físico:</strong> Disponível no nosso ponto de recolha em Maputo (após aviso da encomenda estar pronta).</p>
          </div>
        </div>
      </section>

      {/* 9. Blog Preview (Guia de skincare) */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border bg-white w-full">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-baseline justify-between mb-12">
            <h2 className="text-3xl font-serif text-primary tracking-tight">Guia de skincare</h2>
            <Link
              href="/blog"
              className="text-xs font-semibold text-secondary hover:text-primary transition-all uppercase tracking-wider"
            >
              Ver artigos →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Seed mock articles or static card designs */}
            <div className="space-y-4 border border-border p-6 rounded-sm bg-background">
              <span className="text-[10px] text-accent uppercase tracking-widest font-semibold">Rotinas</span>
              <h3 className="font-serif text-xl text-primary font-medium">Os 5 passos essenciais para peles oleosas</h3>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                Regular o excesso de sebo e o brilho sem danificar a hidratação natural é o maior desafio na pele mista e oleosa...
              </p>
              <Link href="/blog" className="text-xs font-medium text-secondary hover:text-primary inline-flex items-center gap-1">
                <FileText className="h-3 w-3" /> Ler artigo (4 min)
              </Link>
            </div>
            <div className="space-y-4 border border-border p-6 rounded-sm bg-background">
              <span className="text-[10px] text-accent uppercase tracking-widest font-semibold">Ingredientes</span>
              <h3 className="font-serif text-xl text-primary font-medium">O que é a Centelha Asiática e como ajuda peles sensíveis</h3>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                Muito utilizada na cosmética coreana tradicional, este ativo botânico atua na redução da inflamação e acelera a cicatrização...
              </p>
              <Link href="/blog" className="text-xs font-medium text-secondary hover:text-primary inline-flex items-center gap-1">
                <FileText className="h-3 w-3" /> Ler artigo (5 min)
              </Link>
            </div>
            <div className="space-y-4 border border-border p-6 rounded-sm bg-background">
              <span className="text-[10px] text-accent uppercase tracking-widest font-semibold">Proteção</span>
              <h3 className="font-serif text-xl text-primary font-medium">Sol e calor: por que os protetores coreanos são tão leves?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                A tecnologia por trás das fórmulas de proteção solar coreanas garante um acabamento invisível perfeito para a rotina diurna...
              </p>
              <Link href="/blog" className="text-xs font-medium text-secondary hover:text-primary inline-flex items-center gap-1">
                <FileText className="h-3 w-3" /> Ler artigo (3 min)
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 10. Newsletter */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border bg-glass w-full text-center">
        <div className="max-w-md mx-auto space-y-6">
          <h2 className="text-3xl font-serif text-primary tracking-tight">Subscrever Newsletter</h2>
          <p className="text-sm text-muted-foreground">
            Receba dicas de skincare exclusivas, ofertas limitadas e novidades de K-Beauty da equipa Nura.
          </p>
          <form className="flex flex-col sm:flex-row gap-2 pt-2">
            <input
              type="email"
              placeholder="O seu email"
              required
              className="flex-1 h-11 px-4 border border-border text-sm rounded-sm bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              className="h-11 px-6 bg-primary text-white text-xs font-semibold uppercase tracking-wider hover:bg-opacity-95 transition-all rounded-sm shrink-0"
            >
              Subscrever
            </button>
          </form>
        </div>
      </section>

    </div>
  );
}
