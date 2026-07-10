import React from "react";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductFilters } from "@/components/product/ProductFilters";
import type { Product } from "@/components/product/ProductCard";
import SearchLogger from "@/components/shared/SearchLogger";

export const revalidate = 60; // Cache and revalidate pages every 60 seconds

interface SearchParams {
  search?: string;
  brand?: string;
  goal?: string;
  sort?: string;
}

interface ProductsPageProps {
  searchParams: Promise<SearchParams>;
}

async function getFilterMetadata() {
  try {
    const supabase = await createClient();
    const { data: allProducts, error } = await supabase
      .from("products")
      .select("brand, skin_goals, hashtags")
      .eq("status", "published");

    if (error || !allProducts) {
      return { brands: [], goals: [], hasSkinGoalsColumn: false };
    }

    const hasSkinGoalsColumn = allProducts.length > 0 && "skin_goals" in allProducts[0];

    const brandCounts: Record<string, number> = {};
    const goalCounts: Record<string, number> = {};

    const VALID_GOALS = [
      { name: "Hidratação", slug: "hidratacao" },
      { name: "Acne", slug: "acne" },
      { name: "Manchas", slug: "manchas" },
      { name: "Oleosidade", slug: "oleosidade" },
      { name: "Anti-idade", slug: "anti-idade" },
      { name: "Textura", slug: "textura" },
      { name: "Pele sensível", slug: "pele-sensivel" },
      { name: "Luminosidade", slug: "luminosidade" }
    ];

    allProducts.forEach((product: { brand: string | null; skin_goals?: string[] | null; hashtags?: string[] | null }) => {
      // brand
      const brand = product.brand || "K-Beauty";
      brandCounts[brand] = (brandCounts[brand] || 0) + 1;

      // goals
      const goals: string[] = [];
      if (hasSkinGoalsColumn && Array.isArray(product.skin_goals)) {
        goals.push(...product.skin_goals);
      } else if (product.hashtags && Array.isArray(product.hashtags)) {
        product.hashtags.forEach((tag: string) => {
          if (tag.startsWith("goal:")) {
            goals.push(tag.substring(5));
          }
        });
      }

      goals.forEach(goal => {
        goalCounts[goal] = (goalCounts[goal] || 0) + 1;
      });
    });

    const brands = Object.entries(brandCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const goals = VALID_GOALS.map(goal => ({
      ...goal,
      count: goalCounts[goal.slug] || 0
    })).filter(goal => goal.count > 0);

    return { brands, goals, hasSkinGoalsColumn };
  } catch (err) {
    console.error("Failed to load filter metadata:", err);
    return { brands: [], goals: [], hasSkinGoalsColumn: false };
  }
}

async function getFilteredProducts(filters: SearchParams, hasSkinGoalsColumn: boolean) {
  try {
    const supabase = await createClient();
    let query = supabase.from("products").select("*").eq("status", "published");

    // 1. Text Search Filter (scans name, brand, and keywords)
    if (filters.search) {
      const searchPattern = `%${filters.search}%`;
      query = query.or(`name.ilike.${searchPattern},brand.ilike.${searchPattern},search_keywords.ilike.${searchPattern}`);
    }

    // 2. Brand Filter (OR within brands)
    if (filters.brand) {
      const selectedBrands = filters.brand.split(",").map(b => b.trim()).filter(Boolean);
      if (selectedBrands.length > 0) {
        query = query.in("brand", selectedBrands);
      }
    }

    // 3. Skin Goal Filter (OR within goals)
    if (filters.goal) {
      const selectedGoals = filters.goal.split(",").map(g => g.trim()).filter(Boolean);
      if (selectedGoals.length > 0) {
        if (hasSkinGoalsColumn) {
          query = query.overlaps("skin_goals", selectedGoals);
        } else {
          const goalTags = selectedGoals.map(g => `goal:${g}`);
          query = query.overlaps("hashtags", goalTags);
        }
      }
    }

    // 4. Sort selection
    const sort = filters.sort || "newest";
    if (sort === "price-asc") {
      query = query.order("price", { ascending: true });
    } else if (sort === "price-desc") {
      query = query.order("price", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data, error } = await query;
    if (error) {
      console.error("Supabase query error:", error.message || error);
      return [];
    }
    return data as Product[];
  } catch (error) {
    console.error("Failed to run product query:", error);
    return [];
  }
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedParams = await searchParams;
  const { brands, goals, hasSkinGoalsColumn } = await getFilterMetadata();
  const products = await getFilteredProducts(resolvedParams, hasSkinGoalsColumn);

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full font-sans">
      <SearchLogger query={resolvedParams.search} />
      <div className="max-w-3xl mb-8">
        <h1 className="text-4xl font-serif text-primary tracking-tight mb-4">
          Catálogo Nura Skincare
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Cuide da sua pele com a nossa curadoria selecionada de cosméticos coreanos. 
          Use os filtros abaixo para encontrar o produto perfeito para o seu objectivo.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Filters Pane Component */}
        <div className="lg:col-span-1">
          <ProductFilters
            currentSearch={resolvedParams.search}
            currentBrand={resolvedParams.brand}
            currentGoal={resolvedParams.goal}
            currentSort={resolvedParams.sort}
            availableBrands={brands}
            availableGoals={goals}
          />
        </div>

        {/* Products Grid Pane */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <span className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold">
              {products.length === 1 ? "1 produto encontrado" : `${products.length} produtos encontrados`}
            </span>
          </div>

          {products.length === 0 ? (
            <div className="p-12 border border-dashed border-border rounded-sm text-center max-w-lg mx-auto bg-white space-y-6">
              <SlidersHorizontal className="h-8 w-8 stroke-[1.2] text-neutral-400 mx-auto" />
              <div className="space-y-2">
                <h3 className="font-serif text-lg text-primary font-medium">Nenhum produto encontrado</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Não encontrámos produtos com estes filtros. Ajuste os filtros ou entre em contacto para recomendações personalizadas.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Link
                  href="/products"
                  className="inline-flex h-10 items-center justify-center px-5 border border-border text-primary hover:bg-neutral-50 text-xs font-semibold uppercase tracking-wider rounded-sm transition-all"
                >
                  Limpar filtros
                </Link>
                <a
                  href="https://wa.me/258840000000?text=Olá! Gostaria de uma recomendação de produtos para a minha pele."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center justify-center px-5 bg-[#25D366] text-white hover:bg-[#20ba5a] text-xs font-semibold uppercase tracking-wider rounded-sm transition-all gap-2"
                >
                  Falar no WhatsApp
                </a>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
