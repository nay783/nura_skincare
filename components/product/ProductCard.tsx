"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ProductImage } from "./ProductImage";
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
  is_featured?: boolean;
  created_at?: string;
  updated_at?: string;
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
    <div className="group relative flex flex-col bg-white overflow-hidden transition-all duration-500 hover:shadow-md max-w-sm rounded-md h-full border border-border/30">
      {/* Product Image Link */}
      <Link href={`/products/${product.slug}`} className="relative block aspect-square w-full overflow-hidden bg-muted rounded-t-md">
        <ProductImage
          product={product}
          alt={product.name}
          fill
          className="transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Stock Badges */}
        {isOutOfStock && (
          <div className="absolute top-2 right-2 bg-neutral-900/90 text-white text-[9px] uppercase font-bold px-2 py-0.5 tracking-wider rounded-sm">
            Esgotado
          </div>
        )}
        {!isOutOfStock && isLowStock && (
          <div className="absolute top-2 right-2 bg-accent/90 text-primary-foreground text-[9px] uppercase font-bold px-2 py-0.5 tracking-wider rounded-sm">
            Poucas unidades
          </div>
        )}
      </Link>

      {/* Info Section */}
      <div className="flex flex-col flex-1 p-5 space-y-2">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
          <span>{product.brand || "K-Beauty"}</span>
        </div>

        <Link href={`/products/${product.slug}`} className="block">
          <h3 className="font-sans text-sm font-semibold tracking-tight text-primary group-hover:text-accent transition-colors line-clamp-1">
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
            <span className="text-sm font-bold text-primary">
              {formatCurrency(product.price)}
            </span>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <span className="text-xs line-through text-muted-foreground/75">
                {formatCurrency(product.compare_at_price)}
              </span>
            )}
          </div>

          <div className="pt-1">
            {isOutOfStock ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center inline-flex items-center justify-center gap-1.5 h-10 border border-primary text-[10px] font-bold text-primary hover:bg-primary hover:text-white transition-all uppercase tracking-wider rounded-sm font-sans"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Avisar-me
              </a>
            ) : (
              <Button
                onClick={handleAddToCart}
                variant="primary"
                className="w-full h-10 flex items-center justify-center gap-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider font-sans"
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                Comprar
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
