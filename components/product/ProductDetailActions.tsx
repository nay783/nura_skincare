"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShoppingBag, MessageCircle, ArrowRight, HelpCircle, ImageOff } from "lucide-react";
import { useCart } from "@/components/cart/cart-context";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/shared/button";
import type { Product } from "./ProductCard";
import { createClient } from "@/lib/supabase/client";
import { logRecommendationEvent } from "@/lib/recommendations";

interface ProductDetailActionsProps {
  product: Product;
}

export function ProductDetailActions({ product }: ProductDetailActionsProps) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);


  const isOutOfStock = product.stock_quantity <= 0;
  const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= 5;
  const imageUrls = [
    product.main_image_url,
    ...(product.images || []),
    ...(product.external_images || []),
    product.image_url
  ].filter(Boolean) as string[];
  const uniqueImageUrls = Array.from(new Set(imageUrls));
  const activeImage = uniqueImageUrls[activeImageIndex] || null;
  const showPlaceholder = !activeImage || imageError;

  // 1. WhatsApp prefills
  const whatsappAdviceUrl = `https://wa.me/258840000000?text=Ol%C3%A1%20Nura%2C%20estou%20na%20p%C3%A1gina%20do%20produto%20${encodeURIComponent(
    product.name
  )}%20e%20gostaria%20de%20saber%20se%20%C3%A9%20adequado%20para%20a%20minha%20pele.`;

  // 2. Track Recently Viewed on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("nura_recently_viewed");
      let items: Product[] = [];
      if (stored) {
        items = JSON.parse(stored);
      }
      
      // Filter out current product and keep last 4 items
      const filtered = items.filter((p) => p.id !== product.id);
      const updated = [product, ...filtered].slice(0, 4);
      
      localStorage.setItem("nura_recently_viewed", JSON.stringify(updated));
      setTimeout(() => {
        setRecentlyViewed(filtered.slice(0, 4)); // Show other items in UI
      }, 0);
    } catch (e) {
      console.error("Failed to parse recently viewed:", e);
    }
  }, [product]);

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    const supabase = createClient();
    logRecommendationEvent(supabase, "cart_add", product.id);

    addToCart(
      {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        brand: product.brand || "K-Beauty",
        image: uniqueImageUrls[0] || "/images/placeholder-product.jpg",
        sku: product.sku,
      },
      quantity
    );
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    handleAddToCart();
    router.push("/checkout");
  };

  return (
    <div className="font-sans space-y-12">
      {/* Product Hero: Image + Details Panel */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
        
        {/* Left: Image Gallery */}
        <div className="md:col-span-6 space-y-4">
          <div className="relative aspect-square w-full bg-muted rounded-[4px] overflow-hidden border border-border">
            {showPlaceholder ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#FAF9F6] p-4 text-center">
                <ImageOff className="h-8 w-8 stroke-[1.2] text-neutral-300 mb-2" />
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Imagem indisponível</span>
              </div>
            ) : (
              <>
                {activeImage && activeImage.startsWith("http") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeImage}
                    alt={product.name}
                    className="absolute inset-0 h-full w-full object-cover object-center"
                    referrerPolicy="no-referrer"
                    onLoad={() => setLoading(false)}
                    onError={() => {
                      setImageError(true);
                      setLoading(false);
                    }}
                  />
                ) : activeImage ? (
                  <Image
                    src={activeImage}
                    alt={product.name}
                    fill
                    sizes="(max-w-7xl) 50vw, 100vw"
                    className="object-cover object-center"
                    priority
                    onLoad={() => setLoading(false)}
                    onError={() => {
                      setImageError(true);
                      setLoading(false);
                    }}
                  />
                ) : null}
                
                {loading && (
                  <div className="absolute inset-0 bg-neutral-100 animate-pulse" />
                )}
              </>
            )}
          </div>
          {uniqueImageUrls.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto py-1">
              {uniqueImageUrls.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveImageIndex(idx);
                    setImageError(false);
                    setLoading(true);
                  }}
                  className={`relative shrink-0 w-16 h-16 bg-muted rounded-sm overflow-hidden border ${
                    activeImageIndex === idx ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50"
                  }`}
                >
                  {img.startsWith("http") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt={`${product.name} - Imagem ${idx + 1}`}
                      className="absolute inset-0 h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Image
                      src={img}
                      alt={`${product.name} - Imagem ${idx + 1}`}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Buy Panel */}
        <div className="md:col-span-6 space-y-6 flex flex-col justify-center">
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-widest text-secondary font-bold">
              {product.brand || "K-Beauty"}
            </span>
            <h1 className="text-3xl font-serif text-primary tracking-tight font-medium">
              {product.name}
            </h1>
            <div className="flex items-center gap-3 pt-2">
              <span className="text-2xl font-bold text-primary">
                {formatCurrency(product.price)}
              </span>
              {product.compare_at_price && product.compare_at_price > product.price && (
                <span className="text-sm line-through text-muted-foreground">
                  {formatCurrency(product.compare_at_price)}
                </span>
              )}
            </div>
          </div>

          <hr className="border-border" />

          {/* Stock Badges */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Disponibilidade:</span>
            {isOutOfStock ? (
              <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-sm uppercase tracking-wider">
                Esgotado
              </span>
            ) : isLowStock ? (
              <span className="text-xs font-semibold text-accent bg-amber-50 px-2 py-0.5 rounded-sm uppercase tracking-wider">
                Poucas unidades ({product.stock_quantity})
              </span>
            ) : (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-sm uppercase tracking-wider">
                Disponível
              </span>
            )}
          </div>

          {/* Buy actions */}
          {!isOutOfStock && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Quantidade:</span>
                <div className="flex items-center border border-border rounded-sm bg-white">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-10 h-10 flex items-center justify-center text-primary font-medium hover:bg-muted transition-all"
                  >
                    -
                  </button>
                  <span className="w-10 text-center text-sm font-semibold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(q => Math.min(product.stock_quantity, q + 1))}
                    className="w-10 h-10 flex items-center justify-center text-primary font-medium hover:bg-muted transition-all"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <Button
                  onClick={handleAddToCart}
                  variant="outline"
                  className="h-12 w-full flex items-center justify-center gap-2 rounded-sm text-xs"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Adicionar ao carrinho
                </Button>
                <Button
                  onClick={handleBuyNow}
                  variant="primary"
                  className="h-12 w-full flex items-center justify-center gap-2 rounded-sm text-xs"
                >
                  Comprar agora
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Out of Stock Call to Action */}
          {isOutOfStock && (
            <div className="pt-2 space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Este produto está temporariamente indisponível. Fale connosco no WhatsApp para reservar a sua unidade ou pedir sugestões semelhantes.
              </p>
              <a
                href={whatsappAdviceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center inline-flex items-center justify-center gap-2 h-12 bg-primary text-white text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-opacity-95 transition-all"
              >
                <MessageCircle className="h-4 w-4" />
                Avisar-me quando disponível
              </a>
            </div>
          )}

          {/* WhatsApp advice button */}
          <div className="border border-border p-4 rounded-sm bg-glass flex items-start gap-3.5 mt-4">
            <HelpCircle className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">Dúvidas sobre este produto?</h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Não sabe se este produto é indicado para o seu tipo de pele ou rotina? Peça conselhos personalizados.
              </p>
              <a
                href={whatsappAdviceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:text-primary transition-all pt-1.5 uppercase tracking-wider"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Pedir recomendação no WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Recently Viewed Panel */}
      {recentlyViewed.length > 0 && (
        <div className="border-t border-border pt-12">
          <h3 className="font-serif text-2xl text-primary tracking-tight mb-8">
            Visto recentemente
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {recentlyViewed.map((viewed) => (
              <div
                key={viewed.id}
                className="group relative flex flex-col border border-border p-3 rounded-sm bg-white hover:border-primary/30 transition-all"
              >
                <Link href={`/products/${viewed.slug}`} className="relative aspect-square w-full overflow-hidden bg-muted mb-3 rounded-sm">
                  <Image
                    src={viewed.images?.[0] || "/images/placeholder-product.jpg"}
                    alt={viewed.name}
                    fill
                    sizes="120px"
                    className="object-cover group-hover:scale-103 transition-all duration-300"
                  />
                </Link>
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">
                  {viewed.brand || "K-Beauty"}
                </span>
                <Link href={`/products/${viewed.slug}`} className="block mt-1">
                  <h4 className="font-serif text-sm text-primary line-clamp-1 group-hover:text-secondary transition-all">
                    {viewed.name}
                  </h4>
                </Link>
                <span className="text-xs font-bold text-primary mt-2">
                  {formatCurrency(viewed.price)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
