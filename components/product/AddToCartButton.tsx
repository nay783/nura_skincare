"use client";

import React from "react";
import { useCart } from "@/components/cart/cart-context";
import { createClient } from "@/lib/supabase/client";
import { logRecommendationEvent } from "@/lib/recommendations";
import { Button } from "@/components/shared/button";
import { ShoppingBag } from "lucide-react";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  sku: string;
  brand: string | null;
  images?: string[];
  main_image_url?: string | null;
  external_images?: string[] | null;
}

interface AddToCartButtonProps {
  product: Product;
  size?: "default" | "sm";
}

export function AddToCartButton({ product, size = "default" }: AddToCartButtonProps) {
  const { addToCart } = useCart();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const imageUrl =
      product.main_image_url ||
      product.images?.[0] ||
      product.external_images?.[0] ||
      "/images/placeholder-product.jpg";

    const supabase = createClient();
    logRecommendationEvent(supabase, "cart_add", product.id);

    addToCart({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      brand: product.brand || "K-Beauty",
      image: imageUrl,
      sku: product.sku,
    });
  };

  if (size === "sm") {
    return (
      <Button
        onClick={handleAddToCart}
        variant="primary"
        className="h-8 px-4 flex items-center justify-center gap-1.5 rounded-sm text-[9px] font-bold uppercase tracking-widest font-sans"
      >
        <ShoppingBag className="h-3 w-3" />
        Adicionar
      </Button>
    );
  }

  return (
    <Button
      onClick={handleAddToCart}
      variant="primary"
      className="h-11 px-6 flex items-center justify-center gap-2 rounded-sm text-[10px] font-bold uppercase tracking-widest font-sans"
    >
      <ShoppingBag className="h-4 w-4" />
      Adicionar ao Carrinho
    </Button>
  );
}
