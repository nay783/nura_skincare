"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductImage } from "./ProductImage";
import { formatCurrency } from "@/lib/utils";

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
  benefits: string[];
  hashtags: string[];
  main_image_url?: string | null;
  external_images?: string[] | null;
}

interface HeroSectionProps {
  featuredProducts: Product[];
  whatsappAdviceUrl: string;
}

export function HeroSection({ featuredProducts, whatsappAdviceUrl }: HeroSectionProps) {
  const selectorProducts = featuredProducts.slice(0, 3);
  const [activeProduct, setActiveProduct] = useState<Product | null>(
    selectorProducts[0] || null
  );

  if (!activeProduct) return null;

  return (
    <section className="relative min-h-[80vh] flex items-center py-16 lg:py-24 px-4 sm:px-6 lg:px-8 border-b border-border bg-[#F7F3EC]">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center w-full">
        
        {/* Left Column: Editorial content and Selector */}
        <div className="lg:col-span-7 space-y-8 flex flex-col justify-center h-full">
          <div className="space-y-6">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C49A5A] block">
              CUIDADOS COREANOS, ESCOLHIDOS PARA SI
            </span>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#173E32] tracking-tight leading-[1.1] max-w-xl font-bold">
              Skincare coreano para uma pele mais saudável e luminosa.
            </h1>

            <p className="text-sm sm:text-base text-[#173E32]/85 max-w-lg leading-relaxed font-sans">
              Produtos seleccionados para hidratação, textura, manchas, oleosidade e uma rotina mais confiante.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                href="/products"
                className="inline-flex h-12 items-center justify-center px-8 bg-[#173E32] text-[#F7F3EC] text-xs font-bold tracking-widest uppercase hover:bg-[#242722] transition-colors rounded-sm gap-2"
              >
                Comprar produtos <ArrowRight className="h-4 w-4" />
              </Link>
              
              <a
                href={whatsappAdviceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center px-8 border border-[#173E32] text-xs font-bold tracking-widest uppercase text-[#173E32] bg-transparent hover:bg-[#E9E3D7] transition-colors rounded-sm"
              >
                Descobrir a minha rotina
              </a>
            </div>
          </div>

          {/* Selector Row */}
          {selectorProducts.length > 1 && (
            <div className="pt-8 border-t border-border/60 space-y-4">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#242722]/55 block">
                Destaques da colecção
              </span>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
                {selectorProducts.map((product) => {
                  const isActive = activeProduct.id === product.id;
                  return (
                    <button
                      key={product.id}
                      onClick={() => setActiveProduct(product)}
                      className={`flex items-center gap-3 text-left p-2.5 rounded-md border transition-all duration-300 shrink-0 ${
                        isActive
                          ? "border-[#173E32] bg-white shadow-sm"
                          : "border-transparent bg-white/40 hover:bg-white/70"
                      }`}
                    >
                      <div className="relative h-10 w-10 bg-[#F7F3EC] rounded-sm overflow-hidden flex items-center justify-center shrink-0 border border-border/20">
                        <ProductImage
                          product={{
                            id: product.id,
                            name: product.name,
                            slug: product.slug,
                            images: product.images,
                            main_image_url: product.main_image_url,
                            external_images: product.external_images,
                          }}
                          alt={product.name}
                          fill
                          sizes="40px"
                        />
                      </div>
                      <div className="max-w-[120px] leading-tight">
                        <p className={`text-[10px] font-bold tracking-tight line-clamp-1 ${isActive ? "text-[#173E32]" : "text-muted-foreground"}`}>
                          {product.name}
                        </p>
                        <p className="text-[9px] font-sans text-muted-foreground/80 mt-0.5">
                          {formatCurrency(product.price)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Large skincare image in rounded frame */}
        <div className="lg:col-span-5 flex items-center justify-center w-full h-full relative">
          <Link
            href={`/products/${activeProduct.slug}`}
            className="group relative block w-full aspect-[4/5] bg-white rounded-lg overflow-hidden border border-border/20 shadow-md hover:shadow-lg transition-all duration-500"
          >
            {/* Overlapping Badge */}
            <div className="absolute top-4 left-4 z-10 bg-[#C49A5A] text-white text-[9px] uppercase font-bold px-3 py-1 tracking-widest rounded-sm shadow-sm select-none">
              K-BEAUTY AUTÊNTICA
            </div>

            {/* Product Image inside warm editorial surface */}
            <div className="w-full h-full bg-[#FAF9F5]/80 flex items-center justify-center p-8 sm:p-12 relative">
              <ProductImage
                product={{
                  id: activeProduct.id,
                  name: activeProduct.name,
                  slug: activeProduct.slug,
                  images: activeProduct.images,
                  main_image_url: activeProduct.main_image_url,
                  external_images: activeProduct.external_images,
                }}
                alt={activeProduct.name}
                fill
                className="object-contain p-8 transform group-hover:scale-103 transition-transform duration-700 ease-out select-none"
              />
            </div>

            {/* Restrained Bottom Overlay for metadata */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/25 via-black/5 to-transparent p-6 text-white flex justify-between items-end">
              <div className="space-y-1">
                <span className="text-[9px] uppercase tracking-widest text-[#F7F3EC]/80 font-bold font-sans">
                  {activeProduct.brand || "K-Beauty"}
                </span>
                <h3 className="font-serif text-base sm:text-lg font-medium leading-tight">
                  {activeProduct.name}
                </h3>
              </div>
              <span className="text-xs font-bold font-sans whitespace-nowrap bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-sm hover:bg-white hover:text-[#173E32] transition-colors">
                Ver produto &rarr;
              </span>
            </div>
          </Link>
        </div>

      </div>
    </section>
  );
}
