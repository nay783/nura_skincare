"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MessageCircle, ShoppingBag, ImageOff } from "lucide-react";
import { useCart } from "@/components/cart/cart-context";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/shared/button";
import { createClient } from "@/lib/supabase/client";
import { logRecommendationEvent } from "@/lib/recommendations";

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  sku: string;
  stock_quantity: number;
  status: string;
  images: string[];
  benefits: string[];
  brand: string | null;
  hashtags: string[];
  seo_title?: string | null;
  seo_description?: string | null;
  search_keywords?: string | null;
  how_to_use?: string | null;
  ingredients?: string | null;
  image_url?: string | null;
  main_image_url?: string | null;
  external_images?: string[] | null;
  skin_goals?: string[] | null;
}

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(true);

  const isOutOfStock = product.stock_quantity <= 0;
  const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= 5;

  const imageUrl =
    product.main_image_url ||
    product.images?.[0] ||
    product.external_images?.[0] ||
    product.image_url ||
    null;
  const showPlaceholder = !imageUrl || imageError;

  // Prefilled WhatsApp message
  const whatsappUrl = `https://wa.me/258840000000?text=Ol%C3%A1%20Nura%2C%20gostaria%20de%20saber%20mais%20sobre%20o%20produto%3A%20${encodeURIComponent(
    product.name
  )}`;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOutOfStock) {
      const supabase = createClient();
      logRecommendationEvent(supabase, "cart_add", product.id);

      addToCart({
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        brand: product.brand || "K-Beauty",
        image: imageUrl || "/images/placeholder-product.jpg",
        sku: product.sku,
      });
    }
  };

  return (
    <div className="group relative flex flex-col bg-card border border-border overflow-hidden transition-all duration-300 hover:border-primary/30 max-w-sm rounded-[4px] h-full">
      {/* Product Image Link */}
      <Link href={`/products/${product.slug}`} className="relative block aspect-square w-full overflow-hidden bg-muted">
        {showPlaceholder ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#FAF9F6] p-4 text-center">
            <ImageOff className="h-6 w-6 stroke-[1.2] text-neutral-300 mb-2" />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Imagem indisponível</span>
          </div>
        ) : (
          <>
            {imageUrl && imageUrl.startsWith("http") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={product.name}
                className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                referrerPolicy="no-referrer"
                onLoad={() => setLoading(false)}
                onError={() => {
                  setImageError(true);
                  setLoading(false);
                }}
              />
            ) : imageUrl ? (
              <Image
                src={imageUrl}
                alt={product.name}
                fill
                sizes="(max-w-7xl) 33vw, 50vw"
                className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                onLoad={() => setLoading(false)}
                onError={() => {
                  setImageError(true);
                  setLoading(false);
                }}
                priority={false}
              />
            ) : null}
            
            {loading && (
              <div className="absolute inset-0 bg-neutral-100 animate-pulse" />
            )}
          </>
        )}
        
        {/* Stock Badges */}
        {isOutOfStock && (
          <div className="absolute top-2 right-2 bg-neutral-900/90 text-white text-[10px] uppercase font-semibold px-2 py-0.5 tracking-wider rounded-sm">
            Esgotado
          </div>
        )}
        {!isOutOfStock && isLowStock && (
          <div className="absolute top-2 right-2 bg-accent/90 text-primary-foreground text-[10px] uppercase font-semibold px-2 py-0.5 tracking-wider rounded-sm">
            Poucas unidades
          </div>
        )}
      </Link>

      {/* Info Section */}
      <div className="flex flex-col flex-1 p-5 space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground font-medium uppercase tracking-wider">
          <span>{product.brand || "K-Beauty"}</span>
          {/* Dynamic Category Tag */}
          {product.hashtags?.[0] && (
            <span className="text-[10px] text-secondary lowercase">#{product.hashtags[0]}</span>
          )}
        </div>

        <Link href={`/products/${product.slug}`} className="block">
          <h3 className="font-serif text-lg font-medium text-primary group-hover:text-secondary transition-colors line-clamp-1">
            {product.name}
          </h3>
        </Link>

        {product.benefits?.[0] && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {product.benefits[0]}
          </p>
        )}

        <div className="flex-1 flex flex-col justify-end pt-4 space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold text-primary">
              {formatCurrency(product.price)}
            </span>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <span className="text-xs line-through text-muted-foreground">
                {formatCurrency(product.compare_at_price)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            {isOutOfStock ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="col-span-2 text-center inline-flex items-center justify-center gap-1.5 h-10 border border-primary text-xs font-semibold text-primary hover:bg-primary hover:text-white transition-all uppercase tracking-wider rounded-sm"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Avisar-me
              </a>
            ) : (
              <>
                <Button
                  onClick={handleAddToCart}
                  variant="primary"
                  className="w-full h-10 flex items-center justify-center gap-1.5 rounded-sm !text-xs px-0"
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  Comprar
                </Button>
                <Link
                  href={`/products/${product.slug}`}
                  className="w-full text-center inline-flex items-center justify-center h-10 border border-border text-xs font-semibold text-primary hover:border-primary transition-all uppercase tracking-wider rounded-sm bg-transparent"
                >
                  Ver detalhes
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
