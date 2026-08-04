"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";

export interface Product {
  id: string;
  name: string;
  slug: string;
  images: string[];
  image_url?: string | null;
  main_image_url?: string | null;
  external_images?: string[] | null;
}

interface ProductImageProps {
  product: Product;
  alt?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
  objectFit?: "cover" | "contain";
  index?: number;
  onError?: () => void;
}

export function ProductImage({
  product,
  alt,
  fill = true,
  width,
  height,
  className = "",
  priority = false,
  sizes,
  objectFit = "cover",
  index = 0,
  onError,
}: ProductImageProps) {
  const imageUrls = [
    product.main_image_url,
    ...(product.images || []),
    ...(product.external_images || []),
    product.image_url
  ].filter(Boolean) as string[];
  
  const uniqueUrls = Array.from(new Set(imageUrls));
  
  const [activeUrlIndex, setActiveUrlIndex] = useState(index);
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(true);

  // Reset when index or product changes
  useEffect(() => {
    setActiveUrlIndex(index);
    setImageError(false);
    setLoading(true);
  }, [index, product]);

  const activeUrl = uniqueUrls[activeUrlIndex] || null;
  const isFallbackFailed = !activeUrl || imageError;

  const handleImageError = () => {
    if (activeUrlIndex + 1 < uniqueUrls.length) {
      setActiveUrlIndex(prev => prev + 1);
      setLoading(true);
    } else {
      setImageError(true);
      setLoading(false);
      if (onError) {
        onError();
      }
    }
  };

  const handleImageLoad = () => {
    setLoading(false);
  };

  if (isFallbackFailed) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#FAF9F6] p-4 text-center">
        <ImageOff className="h-6 w-6 stroke-[1.2] text-neutral-300 mb-2" />
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
          Imagem indisponível
        </span>
      </div>
    );
  }

  const isSupabaseOrLocal = activeUrl.includes("supabase.co") || activeUrl.startsWith("/") || activeUrl.startsWith(".");

  const imgAlt = alt || product.name || "Nura Skincare Product";
  const fitClass = objectFit === "contain" ? "object-contain" : "object-cover";

  return (
    <>
      {isSupabaseOrLocal ? (
        <Image
          src={activeUrl}
          alt={imgAlt}
          fill={fill}
          width={fill ? undefined : (width || 300)}
          height={fill ? undefined : (height || 300)}
          priority={priority}
          sizes={sizes || "(max-w-7xl) 33vw, 50vw"}
          className={`${fitClass} transition-opacity duration-300 ${loading ? "opacity-0" : "opacity-100"} ${className}`}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={activeUrl}
          alt={imgAlt}
          referrerPolicy="no-referrer"
          className={`absolute inset-0 w-full h-full ${fitClass} transition-opacity duration-300 ${loading ? "opacity-0" : "opacity-100"} ${className}`}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}
      {loading && (
        <div className="absolute inset-0 bg-neutral-100 animate-pulse animate-duration-1000" />
      )}
    </>
  );
}
export default ProductImage;
