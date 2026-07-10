"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface HeroTextProps {
  whatsappAdviceUrl: string;
}

export function HeroText({ whatsappAdviceUrl }: HeroTextProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  return (
    <div 
      className={`lg:col-span-7 space-y-6 sm:space-y-8 transition-all duration-1000 ease-out transform ${
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <span className="text-[10px] font-bold uppercase tracking-widest text-secondary block">
        CUIDADOS COREANOS, ESCOLHIDOS PARA SI
      </span>
      
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-primary tracking-tight leading-tight max-w-xl">
        Skincare coreano para uma pele<br />mais saudável e luminosa.
      </h1>

      <p className="text-sm sm:text-base text-muted-foreground max-w-lg leading-relaxed">
        Descubra produtos seleccionados para hidratação, acne, manchas, textura, oleosidade, anti-idade e uma rotina de cuidados mais confiante.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 pt-3">
        <Link
          href="/products"
          className="inline-flex h-11 items-center justify-center px-8 bg-primary text-white text-xs font-semibold tracking-wider uppercase hover:bg-opacity-95 transition-all rounded-sm gap-2"
        >
          Comprar produtos <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        
        <a
          href={whatsappAdviceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center justify-center px-8 border border-primary text-xs font-semibold tracking-wider uppercase text-primary hover:bg-muted transition-all rounded-sm"
        >
          Descobrir a minha rotina
        </a>
      </div>

      <div className="pt-6 border-t border-border/50 text-[10px] font-semibold tracking-wider text-secondary/80">
        Produtos seleccionados &middot; Entrega em Maputo &middot; Apoio no WhatsApp
      </div>
    </div>
  );
}
