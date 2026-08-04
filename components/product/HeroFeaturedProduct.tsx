"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ImageOff } from "lucide-react";
import { ProductImage } from "./ProductImage";

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  sku: string;
  stock_quantity: number;
  images: string[];
  brand: string | null;
  hashtags: string[];
  skin_goals?: string[] | null;
  main_image_url?: string | null;
  external_images?: string[] | null;
}

interface HeroFeaturedProductProps {
  initialProduct: Product | null;
  alternativeProducts: Product[];
}

export function HeroFeaturedProduct({ initialProduct, alternativeProducts }: HeroFeaturedProductProps) {
  const [currentProduct, setCurrentProduct] = useState<Product | null>(initialProduct);
  const [alternativeIndex, setAlternativeIndex] = useState(0);
  
  // Animation states
  const [imageVisible, setImageVisible] = useState(false);

  // Trigger animations on product changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImageVisible(false);
    const imgTimer = setTimeout(() => setImageVisible(true), 150);
    return () => clearTimeout(imgTimer);
  }, [currentProduct]);

  if (!currentProduct) {
    return (
      <div className="aspect-square w-full bg-[#FAF9F5] border border-border rounded-[4px] flex flex-col items-center justify-center p-8 text-center text-muted-foreground text-xs">
        <ImageOff className="h-6 w-6 stroke-[1.2] mb-2 text-neutral-300" />
        Nenhum produto em destaque disponível
      </div>
    );
  }

  const handleImageError = () => {
    // Try next product in alternative products list
    if (alternativeProducts.length > 0 && alternativeIndex < alternativeProducts.length) {
      const nextAltProduct = alternativeProducts[alternativeIndex];
      setAlternativeIndex(prev => prev + 1);
      setCurrentProduct(nextAltProduct);
    } else {
      console.warn("All alternative products images failed to load.");
    }
  };

  // Format price beautifully: thousands separator, e.g., "3 200 MT"
  const formattedPrice = Math.round(currentProduct.price)
    .toLocaleString("fr-FR")
    .replace(",", " ") + " MT";

  return (
    <Link 
      href={`/products/${currentProduct.slug}`}
      className="block w-full border border-border rounded-[4px] bg-[#FAF9F5] p-8 sm:p-10 flex flex-col items-center justify-between text-center select-none shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:border-primary/20 transition-all duration-500 group h-[480px] sm:h-[530px]"
    >
      {/* Featured Header Badge - Typography only, gold hue */}
      <span className="text-[10px] uppercase tracking-[0.25em] text-[#C5A059] font-sans font-semibold">
        Escolha da Nura
      </span>

      {/* Product Image composition container (60-70% height space) */}
      <div className="flex-1 w-full flex items-center justify-center py-6 relative overflow-hidden">
        <ProductImage
          product={currentProduct}
          alt={currentProduct.name}
          fill
          objectFit="contain"
          className={`max-h-[220px] max-w-[220px] object-contain select-none transition-all duration-700 ease-out transform ${
            imageVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
          } group-hover:scale-[1.01]`}
          onError={handleImageError}
        />
      </div>

      {/* Product Info Block (restrained, no divider, whitespace only) */}
      <div className="space-y-2 pt-2">
        <h4 className="font-serif text-sm sm:text-base text-primary font-medium tracking-tight leading-tight line-clamp-1">
          {currentProduct.name}
        </h4>
        
        <p className="text-sm font-semibold text-primary tracking-wide">
          {formattedPrice}
        </p>

        <span className="text-[11px] font-medium text-primary group-hover:underline inline-block pt-1.5">
          Ver produto &rarr;
        </span>
      </div>
    </Link>
  );
}
