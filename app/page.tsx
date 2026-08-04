import React from "react";
import Link from "next/link";
import { 
  Droplet, 
  Sparkles, 
  Flame, 
  Clock, 
  Compass, 
  ShieldCheck, 
  Truck, 
  PhoneCall, 
  Store, 
  FileText,
  ArrowRight,
  MessageCircle,
  Star,
  Camera
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/product/ProductCard";
import type { Product } from "@/components/product/ProductCard";
import RecommendationsWidget from "@/components/shared/RecommendationsWidget";
import { HeroSection } from "@/components/product/HeroSection";
import { AddToCartButton } from "@/components/product/AddToCartButton";
import { ProductImage } from "@/components/product/ProductImage";
import { getLocalFallbackProducts } from "@/lib/supabase/fallback";
import { formatCurrency } from "@/lib/utils";

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

const REDESIGNED_CATEGORIES = [
  { name: "Hidratação", slug: "hidratacao", image: "/images/categories/hidratacao.jpg" },
  { name: "Acne", slug: "acne", image: "/images/categories/acne.jpg" },
  { name: "Manchas", slug: "manchas", image: "/images/categories/manchas.jpg" },
  { name: "Oleosidade", slug: "oleosidade", image: "/images/categories/oleosidade.jpg" },
  { name: "Anti-idade", slug: "anti-idade", image: "/images/categories/anti-idade.jpg" },
  { name: "Pele sensível", slug: "pele-sensivel", image: "/images/categories/pele-sensivel.jpg" }
];

export default async function Home() {
  const products = await getProducts();
  
  // Filter to only products with positive stock and valid image urls
  const eligibleProducts = products.filter(p => {
    const img = p.main_image_url || p.images?.[0] || p.external_images?.[0] || p.image_url;
    return p.stock_quantity > 0 && !!img && img.trim() !== "";
  });

  // Asymmetric Favorites Selection (curated list)
  const favLarge = eligibleProducts[0] || products[0];
  const favSmall1 = eligibleProducts[1] || products[1];
  const favSmall2 = eligibleProducts[2] || products[2];

  // New arrivals (first 4 items)
  const newArrivals = products.slice(0, 4);

  const whatsappAdviceUrl = "https://wa.me/258840000000?text=Ol%C3%A1%20Nura%2C%20gostaria%20de%20ajuda%20para%20escolher%20a%20minha%20rotina%20de%20skincare.";

  return (
    <div className="flex flex-col w-full font-sans bg-[#F7F3EC]">
      
      {/* 1. Sleek Two-Column Hero with Curated Campaign Image */}
      <HeroSection 
        whatsappAdviceUrl={whatsappAdviceUrl} 
      />

      {/* 2. Shop By Skin Goal - Redesigned Image Category Tiles */}
      <section id="skin-goals" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#C49A5A] block">
            META CUTÂNEA
          </span>
          <h2 className="text-3xl font-serif text-[#173E32] tracking-tight font-bold">
            Comprar por Objectivo
          </h2>
          <p className="text-xs text-muted-foreground font-sans max-w-md mx-auto">
            Selecione soluções concebidas especificamente para as necessidades e metas individuais da sua pele.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          {REDESIGNED_CATEGORIES.map((cat) => (
            <Link
              key={cat.name}
              href={`/products?goal=${encodeURIComponent(cat.slug)}`}
              className="group relative aspect-[4/5] overflow-hidden rounded-lg border border-border/20 shadow-sm hover:shadow-md transition-all duration-500 bg-white"
            >
              {/* Category Background Image */}
              <div className="absolute inset-0 w-full h-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover transition-transform duration-[700ms] ease-out group-hover:scale-103"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              </div>

              {/* Overlay Caption Bar at the Bottom */}
              <div className="absolute bottom-4 inset-x-4 bg-white/95 backdrop-blur-sm px-5 py-4 rounded-sm flex items-center justify-between shadow-sm transition-all duration-300 group-hover:bg-white">
                <span className="text-xs font-bold uppercase tracking-wider text-[#173E32] font-sans">
                  {cat.name}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C49A5A] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Explorar &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Curated Favorites - Asymmetric Product Grid */}
      {favLarge && (
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white border-t border-border/40 w-full">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#C49A5A] block">
                CURADORIA EXCLUSIVA
              </span>
              <h2 className="text-3xl font-serif text-[#173E32] tracking-tight font-bold">
                Favoritos da Nura
              </h2>
              <p className="text-xs text-muted-foreground font-sans max-w-md mx-auto">
                Seleção premium com formulas consagradas que oferecem resultados visíveis e duradouros.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              
              {/* Left: Large Curated Product (takes up 60%) */}
              <div className="lg:col-span-7 bg-[#F7F3EC] rounded-lg border border-border/20 p-8 sm:p-10 flex flex-col sm:flex-row gap-8 items-center hover:shadow-md transition-all duration-500">
                {/* Product Image Box */}
                <div className="w-full sm:w-1/2 aspect-square relative bg-white rounded-md overflow-hidden p-6 border border-border/10 shrink-0 shadow-sm">
                  <ProductImage
                    product={favLarge}
                    alt={favLarge.name}
                    fill
                    className="object-contain p-4"
                  />
                </div>

                {/* Info Block */}
                <div className="flex-1 space-y-4 text-left flex flex-col justify-between h-full">
                  <div className="space-y-3">
                    <span className="inline-block text-[9px] uppercase tracking-widest text-[#C49A5A] font-bold">
                      Recomendado
                    </span>
                    <Link href={`/products/${favLarge.slug}`} className="block">
                      <h3 className="font-serif text-2xl font-bold text-[#173E32] hover:text-accent transition-colors leading-tight">
                        {favLarge.name}
                      </h3>
                    </Link>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                      {favLarge.brand || "K-Beauty"}
                    </p>
                    
                    {favLarge.benefits?.[0] && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {favLarge.benefits[0]}
                      </p>
                    )}
                  </div>

                  <div className="space-y-4 pt-4 border-t border-border/30">
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-[#173E32]">
                        {formatCurrency(favLarge.price)}
                      </span>
                      {favLarge.compare_at_price && favLarge.compare_at_price > favLarge.price && (
                        <span className="text-xs line-through text-muted-foreground/70">
                          {formatCurrency(favLarge.compare_at_price)}
                        </span>
                      )}
                    </div>

                    <div>
                      {favLarge.stock_quantity > 0 ? (
                        <AddToCartButton product={favLarge} />
                      ) : (
                        <a
                          href={`https://wa.me/258840000000?text=Ol%C3%A1%2C%20gostaria%20de%20encomendar%20o%20${encodeURIComponent(favLarge.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-11 items-center justify-center px-6 border border-[#173E32] text-xs font-bold tracking-widest uppercase text-[#173E32] hover:bg-primary hover:text-white transition-colors rounded-sm"
                        >
                          Encomendar no WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Two Smaller Curated Products Stacked */}
              <div className="lg:col-span-5 flex flex-col gap-6 justify-between">
                {[favSmall1, favSmall2].map((prod) => {
                  if (!prod) return null;
                  return (
                    <div key={prod.id} className="bg-white rounded-lg border border-border/20 p-6 flex gap-6 items-center flex-1 hover:shadow-sm transition-all duration-500">
                      <div className="relative h-28 w-28 bg-[#FAF9F5] rounded-md overflow-hidden p-3 border border-border/10 shrink-0 shadow-inner">
                        <ProductImage
                          product={prod}
                          alt={prod.name}
                          fill
                          sizes="112px"
                          className="object-contain p-2"
                        />
                      </div>
                      <div className="flex-1 space-y-3 text-left">
                        <div className="space-y-1">
                          <Link href={`/products/${prod.slug}`} className="block">
                            <h4 className="font-sans text-sm font-semibold tracking-tight text-[#173E32] line-clamp-2 hover:text-accent transition-colors">
                              {prod.name}
                            </h4>
                          </Link>
                          <p className="text-[9px] uppercase tracking-widest text-muted-foreground/80 font-bold">
                            {prod.brand || "K-Beauty"}
                          </p>
                        </div>
                        <p className="text-xs font-bold text-[#173E32]">
                          {formatCurrency(prod.price)}
                        </p>
                        <div className="pt-1">
                          {prod.stock_quantity > 0 ? (
                            <AddToCartButton product={prod} size="sm" />
                          ) : (
                            <span className="text-[10px] uppercase font-bold text-[#C49A5A] tracking-wider">
                              Esgotado
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        </section>
      )}

      {/* 4. New Arrivals */}
      {newArrivals.length > 0 && (
        <section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-border/40 bg-[#FAF9F5]/40 w-full">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row items-baseline justify-between mb-16">
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#C49A5A] block">
                  COLECÇÕES RECENTES
                </span>
                <h2 className="text-3xl font-serif text-[#173E32] tracking-tight font-bold">
                  Novidades Skincare
                </h2>
              </div>
              <Link
                href="/products"
                className="text-xs font-bold text-[#173E32] hover:text-accent transition-all uppercase tracking-widest mt-4 sm:mt-0 flex items-center gap-1.5"
              >
                Ver todos os produtos <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
              {newArrivals.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. Personalized Recommendations */}
      <div className="border-t border-border/40 bg-white w-full py-6">
        <RecommendationsWidget placement="homepage" limit={4} />
      </div>

      {/* 6. Why Korean Skincare / Curation Philosophy */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-border/40 bg-[#F7F3EC] w-full">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-5 space-y-6 text-left">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#C49A5A] block">
              FILOSOFIA DE BELEZA
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif text-[#173E32] tracking-tight leading-tight font-bold">
              Porque escolher skincare coreano?
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed font-sans">
              O segredo do K-Beauty não reside em soluções rápidas, mas sim em nutrir a saúde a longo prazo da barreira da sua pele. As fórmulas atuam de forma progressiva e integrada.
            </p>
          </div>
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-8 text-left">
            <div className="space-y-2.5">
              <h3 className="font-serif text-lg text-[#173E32] font-bold">Rotinas por etapas</h3>
              <p className="text-xs text-muted-foreground leading-relaxed font-sans">
                Abordagem inteligente em camadas que limpa, equilibra o pH, trata e sela a hidratação profundamente na derme.
              </p>
            </div>
            <div className="space-y-2.5">
              <h3 className="font-serif text-lg text-[#173E32] font-bold">Fórmulas leves & calmantes</h3>
              <p className="text-xs text-muted-foreground leading-relaxed font-sans">
                Texturas fluidas de rápida absorção, ideais para climas tropicais, livres de acabamentos pesados ou oleosos.
              </p>
            </div>
            <div className="space-y-2.5">
              <h3 className="font-serif text-lg text-[#173E32] font-bold">Foco em hidratação & barreira</h3>
              <p className="text-xs text-muted-foreground leading-relaxed font-sans">
                Ingredientes que restauram a barreira lipídica para proteger o rosto de poluentes agressivos e raios UV diários.
              </p>
            </div>
            <div className="space-y-2.5">
              <h3 className="font-serif text-lg text-[#173E32] font-bold">Ingredientes botânicos inovadores</h3>
              <p className="text-xs text-muted-foreground leading-relaxed font-sans">
                Uso de ativos consagrados e suaves como mucina de caracol, ginseng vermelho, centelha asiática e probióticos do arroz.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white border-t border-border/40 w-full text-center">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#C49A5A] block">
              TESTEMUNHOS
            </span>
            <h2 className="text-3xl font-serif text-[#173E32] tracking-tight font-bold">
              Quem usa Nura Skincare
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#FAF9F6] rounded-lg p-8 border border-border/10 shadow-sm space-y-4 text-left">
              <div className="flex gap-1 text-[#C49A5A]">
                <Star className="h-3.5 w-3.5 fill-current" />
                <Star className="h-3.5 w-3.5 fill-current" />
                <Star className="h-3.5 w-3.5 fill-current" />
                <Star className="h-3.5 w-3.5 fill-current" />
                <Star className="h-3.5 w-3.5 fill-current" />
              </div>
              <p className="text-xs text-[#242722]/80 leading-relaxed font-sans">
                "Minha pele mudou completamente desde que comecei a usar a rotina de hidratação sugerida pela Nura. O atendimento no WhatsApp foi incrível!"
              </p>
              <div className="pt-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#173E32]">
                  Sara M.
                </p>
                <p className="text-[9px] text-muted-foreground mt-0.5 font-semibold">Maputo</p>
              </div>
            </div>
            <div className="bg-[#FAF9F6] rounded-lg p-8 border border-border/10 shadow-sm space-y-4 text-left">
              <div className="flex gap-1 text-[#C49A5A]">
                <Star className="h-3.5 w-3.5 fill-current" />
                <Star className="h-3.5 w-3.5 fill-current" />
                <Star className="h-3.5 w-3.5 fill-current" />
                <Star className="h-3.5 w-3.5 fill-current" />
                <Star className="h-3.5 w-3.5 fill-current" />
              </div>
              <p className="text-xs text-[#242722]/80 leading-relaxed font-sans">
                "Os produtos de Centelha Asiática acalmaram muito a minha acne ativa. Texturas super leves ideais para o nosso clima."
              </p>
              <div className="pt-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#173E32]">
                  Edmilson L.
                </p>
                <p className="text-[9px] text-muted-foreground mt-0.5 font-semibold">Matola</p>
              </div>
            </div>
            <div className="bg-[#FAF9F6] rounded-lg p-8 border border-border/10 shadow-sm space-y-4 text-left">
              <div className="flex gap-1 text-[#C49A5A]">
                <Star className="h-3.5 w-3.5 fill-current" />
                <Star className="h-3.5 w-3.5 fill-current" />
                <Star className="h-3.5 w-3.5 fill-current" />
                <Star className="h-3.5 w-3.5 fill-current" />
                <Star className="h-3.5 w-3.5 fill-current" />
              </div>
              <p className="text-xs text-[#242722]/80 leading-relaxed font-sans">
                "Tive manchas de sol por anos e os produtos com Vitamina C realmente clarearam o meu rosto de forma suave. Recomendadíssimo!"
              </p>
              <div className="pt-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#173E32]">
                  Carla T.
                </p>
                <p className="text-[9px] text-muted-foreground mt-0.5 font-semibold">Nampula</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Instagram Feed / Inspiration Grid */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#F7F3EC] border-t border-border/40 w-full text-center">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#C49A5A] block">
              INSTAGRAM
            </span>
            <h2 className="text-3xl font-serif text-[#173E32] tracking-tight font-bold">
              Inspiração & Brilho no @nura.skincare
            </h2>
            <p className="text-xs text-muted-foreground font-sans max-w-sm mx-auto">
              Junte-se à nossa comunidade digital e partilhe a sua jornada de beleza coreana.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="group relative aspect-square bg-[#FAF9F5] rounded-lg overflow-hidden border border-border/10">
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 flex items-center justify-center">
                <Camera className="h-6 w-6 text-white" />
              </div>
              <img
                src="/images/categories/hidratacao.jpg"
                alt="Instagram skin tip 1"
                className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
              />
            </div>
            <div className="group relative aspect-square bg-[#FAF9F5] rounded-lg overflow-hidden border border-border/10">
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 flex items-center justify-center">
                <Camera className="h-6 w-6 text-white" />
              </div>
              <img
                src="/images/categories/pele-sensivel.jpg"
                alt="Instagram skin tip 2"
                className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
              />
            </div>
            <div className="group relative aspect-square bg-[#FAF9F5] rounded-lg overflow-hidden border border-border/10">
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 flex items-center justify-center">
                <Camera className="h-6 w-6 text-white" />
              </div>
              <img
                src="/images/categories/manchas.jpg"
                alt="Instagram skin tip 3"
                className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
              />
            </div>
            <div className="group relative aspect-square bg-[#FAF9F5] rounded-lg overflow-hidden border border-border/10">
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 flex items-center justify-center">
                <Camera className="h-6 w-6 text-white" />
              </div>
              <img
                src="/images/categories/anti-idade.jpg"
                alt="Instagram skin tip 4"
                className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 7. Trust Badges Section */}
      <section className="py-16 border-t border-b border-border/40 bg-white w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-5 gap-8 text-center">
          <div className="flex flex-col items-center p-2 space-y-2">
            <ShieldCheck className="h-6 w-6 stroke-[1.5] text-[#C49A5A]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#173E32]">Curadoria autêntica</h4>
            <p className="text-[10px] text-muted-foreground font-sans">100% produtos autênticos</p>
          </div>
          <div className="flex flex-col items-center p-2 space-y-2">
            <Truck className="h-6 w-6 stroke-[1.5] text-[#C49A5A]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#173E32]">Entrega nacional</h4>
            <p className="text-[10px] text-muted-foreground font-sans">Maputo e todas as províncias</p>
          </div>
          <div className="flex flex-col items-center p-2 space-y-2">
            <PhoneCall className="h-6 w-6 stroke-[1.5] text-[#C49A5A]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#173E32]">Apoio especializado</h4>
            <p className="text-[10px] text-muted-foreground font-sans">Conselhos grátis no WhatsApp</p>
          </div>
          <div className="flex flex-col items-center p-2 space-y-2">
            <ShieldCheck className="h-6 w-6 stroke-[1.5] text-[#C49A5A]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#173E32]">Pagamento seguro</h4>
            <p className="text-[10px] text-muted-foreground font-sans">M-Pesa e Transferência</p>
          </div>
          <div className="flex flex-col items-center p-2 space-y-2">
            <Store className="h-6 w-6 stroke-[1.5] text-[#C49A5A]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#173E32]">Ponto de Recolha</h4>
            <p className="text-[10px] text-muted-foreground font-sans">Levantamentos em Maputo</p>
          </div>
        </div>
      </section>

      {/* 8. Delivery Details info */}
      <section id="delivery-info" className="py-24 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto text-center w-full">
        <div className="space-y-6">
          <Truck className="h-8 w-8 stroke-[1.5] text-[#173E32] mx-auto mb-2" />
          <h2 className="text-3xl font-serif text-[#173E32] tracking-tight font-bold">Entrega e levantamento</h2>
          <div className="text-sm text-muted-foreground space-y-3 leading-relaxed font-sans">
            <p><strong>Maputo e Matola:</strong> Entregas rápidas ao domicílio mediante confirmação de taxa e morada.</p>
            <p><strong>Outras províncias:</strong> Envios organizados e confirmados previamente por telefone ou WhatsApp.</p>
            <p><strong>Levantamento físico:</strong> Disponível no nosso ponto de recolha em Maputo (após aviso da encomenda estar pronta).</p>
          </div>
        </div>
      </section>

      {/* 9. Blog Preview / Skincare Guide */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-border/40 bg-white w-full">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-baseline justify-between mb-16">
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#C49A5A] block">
                CONTEÚDO EDITORIAL
              </span>
              <h2 className="text-3xl font-serif text-[#173E32] tracking-tight font-bold">Guia de skincare</h2>
            </div>
            <Link
              href="/blog"
              className="text-xs font-bold text-[#173E32] hover:text-accent transition-all uppercase tracking-widest flex items-center gap-1.5"
            >
              Ver artigos <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4 border border-border/30 p-8 rounded-lg bg-[#F7F3EC]">
              <span className="text-[9px] text-[#C49A5A] uppercase tracking-widest font-bold font-sans">Rotinas</span>
              <h3 className="font-serif text-xl text-[#173E32] font-bold">Os 5 passos essenciais para peles oleosas</h3>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 font-sans">
                Regular o excesso de sebo e o brilho sem danificar a hidratação natural é o maior desafio na pele mista e oleosa...
              </p>
              <Link href="/blog" className="text-xs font-bold text-[#173E32] hover:text-accent inline-flex items-center gap-1">
                <FileText className="h-3 w-3" /> Ler artigo (4 min)
              </Link>
            </div>
            <div className="space-y-4 border border-border/30 p-8 rounded-lg bg-[#F7F3EC]">
              <span className="text-[9px] text-[#C49A5A] uppercase tracking-widest font-bold font-sans">Ingredientes</span>
              <h3 className="font-serif text-xl text-[#173E32] font-bold">O que é a Centelha Asiática e como ajuda peles sensíveis</h3>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 font-sans">
                Muito utilizada na cosmética coreana tradicional, este ativo botânico atua na redução da inflamação e acelera a cicatrização...
              </p>
              <Link href="/blog" className="text-xs font-bold text-[#173E32] hover:text-accent inline-flex items-center gap-1">
                <FileText className="h-3 w-3" /> Ler artigo (5 min)
              </Link>
            </div>
            <div className="space-y-4 border border-border/30 p-8 rounded-lg bg-[#F7F3EC]">
              <span className="text-[9px] text-[#C49A5A] uppercase tracking-widest font-bold font-sans">Proteção</span>
              <h3 className="font-serif text-xl text-[#173E32] font-bold">Sol e calor: por que os protetores coreanos são tão leves?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 font-sans">
                A tecnologia por trás das fórmulas de proteção solar coreanas garante um acabamento invisível perfeito para a rotina diurna...
              </p>
              <Link href="/blog" className="text-xs font-bold text-[#173E32] hover:text-accent inline-flex items-center gap-1">
                <FileText className="h-3 w-3" /> Ler artigo (3 min)
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 10. Newsletter */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-border/40 bg-[#FAF9F5] w-full text-center">
        <div className="max-w-md mx-auto space-y-6">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#C49A5A] block">
            NEWSLETTER
          </span>
          <h2 className="text-3xl font-serif text-[#173E32] tracking-tight font-bold">Subscrever Newsletter</h2>
          <p className="text-xs text-muted-foreground font-sans">
            Receba dicas de skincare exclusivas, ofertas limitadas e novidades de K-Beauty da equipa Nura.
          </p>
          <form className="flex flex-col sm:flex-row gap-2 pt-2">
            <input
              type="email"
              placeholder="O seu email"
              required
              className="flex-1 h-11 px-4 border border-border text-xs rounded-sm bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-sans"
            />
            <button
              type="submit"
              className="h-11 px-6 bg-[#173E32] text-[#F7F3EC] text-[10px] font-bold uppercase tracking-widest hover:bg-[#242722] transition-colors rounded-sm shrink-0 font-sans"
            >
              Subscrever
            </button>
          </form>
        </div>
      </section>

    </div>
  );
}
