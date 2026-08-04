"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface HeroSectionProps {
  whatsappAdviceUrl: string;
}

export function HeroSection({ whatsappAdviceUrl }: HeroSectionProps) {
  return (
    <section className="relative min-h-[70vh] lg:min-h-[75vh] flex items-center py-12 lg:py-16 px-4 sm:px-6 lg:px-8 border-b border-border bg-[#F7F3EC]">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center w-full">
        
        {/* Left Column: Editorial content */}
        <div className="lg:col-span-7 space-y-6 sm:space-y-8 flex flex-col justify-center h-full text-left">
          <div className="space-y-4 sm:space-y-5">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#C49A5A] block">
              CUIDADOS COREANOS, ESCOLHIDOS PARA SI
            </span>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#173E32] tracking-tight leading-[1.15] max-w-xl font-bold text-pretty">
              Skincare coreano para<br />uma pele mais saudável<br />e luminosa.
            </h1>

            <p className="text-sm sm:text-base text-[#173E32]/85 max-w-lg leading-relaxed font-sans">
              Produtos seleccionados para hidratação, textura, manchas, oleosidade e uma rotina de cuidados mais confiante.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 pt-1">
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

        {/* Right Column: Large skincare lifestyle image with rounded corners and subtle overlay */}
        <div className="lg:col-span-5 flex items-center justify-center w-full h-full relative">
          <Link
            href="/products"
            className="group relative block w-full aspect-[4/5] bg-[#E9E3D7] rounded-lg overflow-hidden border border-border/10 shadow-md hover:shadow-lg transition-all duration-500"
          >
            {/* The stable local hero image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/hero/nura-skincare-hero.jpg"
              alt="Campanha Nura Skincare"
              className="w-full h-full object-cover transform group-hover:scale-102 transition-transform duration-700 ease-out select-none"
            />
            
            {/* Soft gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

            {/* Editorial overlay caption */}
            <div className="absolute bottom-0 inset-x-0 p-6 sm:p-8 text-[#F7F3EC] text-left space-y-1.5">
              <span className="text-[9px] uppercase tracking-[0.25em] text-[#C49A5A] font-bold block">
                K-BEAUTY AUTÊNTICA
              </span>
              <h3 className="font-serif text-lg sm:text-xl font-bold leading-tight">
                Rotinas pensadas para si
              </h3>
              <p className="text-[10px] sm:text-xs font-sans font-bold flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                Explorar produtos <ArrowRight className="h-3 w-3" />
              </p>
            </div>
          </Link>
        </div>

      </div>
    </section>
  );
}
