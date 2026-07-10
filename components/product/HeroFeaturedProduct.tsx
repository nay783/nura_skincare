"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ImageOff } from "lucide-react";

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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [alternativeIndex, setAlternativeIndex] = useState(0);
  
  // Image error state
  const [imageError, setImageError] = useState(false);
  
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

  // Retrieve current image url candidates
  const allImages = [
    currentProduct.main_image_url,
    ...(currentProduct.images || []),
    ...(currentProduct.external_images || []),
  ].filter(Boolean) as string[];

  const uniqueImages = Array.from(new Set(allImages));
  const activeImageUrl = uniqueImages[currentImageIndex] || null;

  const handleImageError = () => {
    // 1. Try next image in current product array
    if (currentImageIndex + 1 < uniqueImages.length) {
      setCurrentImageIndex(prev => prev + 1);
    } 
    // 2. Try next product in alternative products list
    else if (alternativeProducts.length > 0 && alternativeIndex < alternativeProducts.length) {
      const nextAltProduct = alternativeProducts[alternativeIndex];
      setAlternativeIndex(prev => prev + 1);
      setCurrentProduct(nextAltProduct);
      setCurrentImageIndex(0);
    } 
    // 3. Fallback to placeholder image
    else {
      setImageError(true);
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
        {imageError || !activeImageUrl ? (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
            <ImageOff className="h-8 w-8 stroke-[1.2] text-neutral-300 mb-2" />
            <span className="text-[9px] uppercase tracking-wider font-semibold">Imagem indisponível</span>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeImageUrl}
              alt={currentProduct.name}
              onError={handleImageError}
              className={`max-h-[220px] max-w-[220px] object-contain select-none transition-all duration-700 ease-out transform ${
                imageVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
              } group-hover:scale-[1.01]`}
            />
          </div>
        )}
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
