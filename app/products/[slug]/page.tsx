import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ProductDetailActions } from "@/components/product/ProductDetailActions";
import type { Product } from "@/components/product/ProductCard";
import { 
  Sparkles, 
  BookOpen, 
  FlaskConical, 
  Truck, 
  ChevronRight, 
  Compass 
} from "lucide-react";
import RecommendationsWidget from "@/components/shared/RecommendationsWidget";

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Generate SEO Metadata dynamically
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const supabase = await createClient();
    const { data: product } = await supabase
      .from("products")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (!product) return { title: "Produto não encontrado" };

    return {
      title: `${product.brand || "K-Beauty"} ${product.name}`,
      description: product.seo_description || product.description || `Compre ${product.name} na Nura Skincare.`,
      openGraph: {
        title: product.seo_title || product.name,
        description: product.seo_description || product.description || "",
        images: product.images?.[0] ? [{ url: product.images[0] }] : [],
      },
    };
  } catch {
    return { title: "Nura Skincare" };
  }
}

async function getProductAndRelated(slug: string) {
  try {
    const supabase = await createClient();
    
    // 1. Fetch current product
    const { data: product, error } = await supabase
      .from("products")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (error || !product) {
      return { product: null, related: [] };
    }

    // 2. Fetch related products from the same brand
    let related: Product[] = [];
    if (product.brand) {
      const { data: brandRelated } = await supabase
        .from("products")
        .select("*")
        .eq("status", "published")
        .eq("brand", product.brand)
        .neq("id", product.id)
        .limit(4);
      
      related = (brandRelated as Product[]) || [];
    }

    // 3. Fallback padding if we have less than 4 related products
    if (related.length < 4) {
      const excludeIds = [product.id, ...related.map((r) => r.id)];
      const { data: fallbackRelated } = await supabase
        .from("products")
        .select("*")
        .eq("status", "published")
        .not("id", "in", `(${excludeIds.join(",")})`)
        .limit(4 - related.length);

      if (fallbackRelated) {
        related = [...related, ...(fallbackRelated as Product[])];
      }
    }

    return { product: product as Product, related };
  } catch (error) {
    console.error("Failed to load product detail:", error);
    return { product: null, related: [] };
  }
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const { product } = await getProductAndRelated(slug);

  if (!product) {
    return (
      <div className="py-20 text-center max-w-xl mx-auto px-4 font-sans space-y-4">
        <Compass className="h-8 w-8 stroke-[1.2] text-neutral-400 mx-auto" />
        <h1 className="text-2xl font-serif text-primary">Produto não encontrado</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          O produto solicitado não foi encontrado ou está atualmente inativo no catálogo.
        </p>
        <Link
          href="/products"
          className="inline-flex h-10 items-center justify-center px-6 bg-primary text-white text-xs font-semibold uppercase tracking-wider rounded-sm"
        >
          Voltar para a loja
        </Link>
      </div>
    );
  }

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full font-sans">
      
      {/* Breadcrumbs navigation */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-widest font-medium mb-10 overflow-x-auto whitespace-nowrap py-1">
        <Link href="/" className="hover:text-primary transition-all">Nura</Link>
        <ChevronRight className="h-3 w-3 stroke-[1.5]" />
        <Link href="/products" className="hover:text-primary transition-all">Loja</Link>
        {product.brand && (
          <>
            <ChevronRight className="h-3 w-3 stroke-[1.5]" />
            <span className="text-primary">{product.brand}</span>
          </>
        )}
      </nav>

      {/* Main product purchase layout (Client Component Actions) */}
      <div className="mb-20">
        <ProductDetailActions product={product} />
      </div>

      {/* Product Details Section (Tabs & Information) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 border-t border-border pt-16 mb-20">
        
        {/* Left pane: Description & Details */}
        <div className="lg:col-span-8 space-y-10">
          
          {/* Description Block */}
          <div className="space-y-4">
            <h2 className="font-serif text-2xl text-primary font-medium">Sobre este produto</h2>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>

          {/* Benefits Block */}
          {product.benefits && product.benefits.length > 0 && (
            <div className="space-y-4 border-t border-border pt-8">
              <h3 className="font-serif text-xl text-primary font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                Principais Benefícios
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-1">
                {product.benefits.map((benefit, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-muted-foreground leading-relaxed">
                    <span className="h-1.5 w-1.5 bg-accent mt-2 rounded-full shrink-0"></span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-neutral-400 italic pt-2">
                *Nota: Os resultados podem variar dependendo de cada tipo de pele. Fórmulas cosméticas de uso preventivo.
              </p>
            </div>
          )}

          {/* How to Use Block */}
          {product.how_to_use && (
            <div className="space-y-4 border-t border-border pt-8">
              <h3 className="font-serif text-xl text-primary font-medium flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-accent" />
                Como usar na sua rotina
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                {product.how_to_use}
              </p>
            </div>
          )}

          {/* Ingredients Block */}
          {product.ingredients && (
            <div className="space-y-4 border-t border-border pt-8">
              <h3 className="font-serif text-xl text-primary font-medium flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-accent" />
                Ingredientes principais
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line bg-background p-4 border border-border rounded-sm">
                {product.ingredients}
              </p>
            </div>
          )}
        </div>

        {/* Right pane: Goals & Delivery specs */}
        <div className="lg:col-span-4 space-y-8 lg:border-l lg:border-border lg:pl-10">
          
          {/* Skin Goal Tags */}
          {product.hashtags && product.hashtags.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">Indicado para:</h4>
              <div className="flex flex-wrap gap-2">
                {product.hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-white border border-border text-primary text-[10px] uppercase font-semibold tracking-wider rounded-sm"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <hr className="border-border" />

          {/* Delivery terms */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Truck className="h-4 w-4 text-secondary" />
              Entrega e levantamento
            </h4>
            <div className="text-xs text-muted-foreground space-y-2.5 leading-relaxed">
              <p>
                <strong>Maputo e Matola:</strong> Entrega disponível mediante confirmação telefónica da morada (taxa calculada à distância).
              </p>
              <p>
                <strong>Resto do país:</strong> Envio organizado por transportadoras parceiras após confirmação da encomenda.
              </p>
              <p>
                <strong>Levantamento Físico:</strong> Disponível gratuitamente no nosso ponto de recolha em Maputo.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products grid */}
      <div className="border-t border-border pt-8">
        <RecommendationsWidget 
          placement="product_page" 
          currentProductId={product.id} 
          limit={4} 
        />
      </div>

    </div>
  );
}
