"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ProductCard, Product } from "@/components/product/ProductCard";
import { getRecommendations, logRecommendationEvent } from "@/lib/recommendations";

interface RecommendationsWidgetProps {
  title?: string;
  limit?: number;
  currentProductId?: string;
  placement: "homepage" | "product_page" | "cart";
}

export default function RecommendationsWidget({
  title,
  limit = 4,
  currentProductId,
  placement,
}: RecommendationsWidgetProps) {
  const supabase = createClient();
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecs() {
      setLoading(true);
      const recProducts = await getRecommendations(supabase, {
        limit,
        currentProductId,
        excludeCurrent: placement === "product_page", // Only exclude the current details page item
      });

      // Map any missing values and cast to match the Product interface
      const mapped: Product[] = recProducts.map(p => ({
        ...p,
        description: p.description || "",
        price: Number(p.price),
        compare_at_price: p.compare_at_price ? Number(p.compare_at_price) : null,
        sku: p.sku || "",
        status: p.status || "published",
        stock_quantity: Number(p.stock_quantity),
        images: Array.isArray(p.images) ? p.images : [],
        benefits: Array.isArray(p.benefits) ? p.benefits : [],
        hashtags: Array.isArray(p.hashtags) ? p.hashtags : [],
      }));

      setRecommendations(mapped);
      setLoading(false);
    }
    fetchRecs();
  }, [supabase, limit, currentProductId, placement]);

  // Log a view event if we successfully load recommendations
  useEffect(() => {
    if (recommendations.length > 0 && currentProductId && placement === "product_page") {
      logRecommendationEvent(supabase, "product_view", currentProductId);
    }
  }, [recommendations, currentProductId, placement, supabase]);

  if (loading) {
    return (
      <div className="space-y-4 font-sans max-w-7xl mx-auto py-6 animate-pulse">
        <div className="h-6 bg-neutral-200 w-48 rounded" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-64 bg-neutral-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null; // Don't render empty shells
  }

  // Set default title depending on placement
  const displayTitle = title || (
    placement === "homepage" 
      ? "Recomendado para si" 
      : placement === "product_page" 
      ? "Também poderá gostar" 
      : "Complete a sua rotina"
  );

  return (
    <section className="py-8 font-sans max-w-7xl mx-auto w-full">
      <div className="mb-6">
        <h2 className="text-xl font-serif text-primary tracking-tight font-medium">
          {displayTitle}
        </h2>
        <div className="h-[1px] bg-border mt-3 w-full" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {recommendations.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
