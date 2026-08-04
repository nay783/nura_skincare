"use client";

import React, { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";

interface BrandFilterItem {
  name: string;
  count: number;
}

interface GoalFilterItem {
  name: string;
  slug: string;
  count: number;
}

interface ProductFiltersProps {
  currentSearch?: string;
  currentBrand?: string;
  currentGoal?: string;
  currentSort?: string;
  availableBrands: BrandFilterItem[];
  availableGoals: GoalFilterItem[];
}

export function ProductFilters({
  currentSearch = "",
  currentBrand = "",
  currentGoal = "",
  currentSort = "newest",
  availableBrands = [],
  availableGoals = [],
}: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchVal, setSearchVal] = useState(currentSearch);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Parse multi-select values from URL parameters
  const selectedBrands = currentBrand ? currentBrand.split(",").map(b => b.trim()).filter(Boolean) : [];
  const selectedGoals = currentGoal ? currentGoal.split(",").map(g => g.trim()).filter(Boolean) : [];

  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    startTransition(() => {
      router.push(`/products?${params.toString()}`);
    });
  };

  const handleBrandToggle = (brandName: string) => {
    let newBrands: string[];
    if (selectedBrands.includes(brandName)) {
      newBrands = selectedBrands.filter(b => b !== brandName);
    } else {
      newBrands = [...selectedBrands, brandName];
    }
    updateFilters({ brand: newBrands.length > 0 ? newBrands.join(",") : null });
  };

  const handleGoalToggle = (goalSlug: string) => {
    let newGoals: string[];
    if (selectedGoals.includes(goalSlug)) {
      newGoals = selectedGoals.filter(g => g !== goalSlug);
    } else {
      newGoals = [...selectedGoals, goalSlug];
    }
    updateFilters({ goal: newGoals.length > 0 ? newGoals.join(",") : null });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchVal || null });
  };

  const handleClearFilters = () => {
    setSearchVal("");
    startTransition(() => {
      router.push("/products");
    });
  };

  const filtersForm = (
    <div className="space-y-6 font-sans">
      {/* Goal Filter */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">Objectivo da Pele</h4>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => updateFilters({ goal: null })}
            className={`px-3 py-1.5 text-xs rounded-sm border transition-all cursor-pointer ${
              selectedGoals.length === 0
                ? "bg-primary text-white border-primary"
                : "bg-transparent text-primary border-border hover:border-primary/50"
            }`}
          >
            Todos
          </button>
          {availableGoals.map((goal) => {
            const isActive = selectedGoals.includes(goal.name);
            return (
              <button
                key={goal.name}
                onClick={() => handleGoalToggle(goal.name)}
                className={`px-3 py-1.5 text-xs rounded-sm border transition-all cursor-pointer ${
                  isActive
                    ? "bg-primary text-white border-primary"
                    : "bg-transparent text-primary border-border hover:border-primary/50"
                }`}
              >
                {goal.name} <span className={`text-[10px] ml-0.5 ${isActive ? "text-white/80" : "text-muted-foreground"}`}>{goal.count > 0 ? `(${goal.count})` : ""}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Clear Filters CTA */}
      {(currentSearch || currentGoal) && (
        <Button
          onClick={handleClearFilters}
          variant="outline"
          className="w-full h-10 text-xs mt-4 rounded-sm cursor-pointer"
        >
          Limpar todos os filtros
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      
      {/* Search Input Box */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Input
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="Pesquisar produtos ou objectivos..."
            className="pr-10 !h-10 border border-border focus:ring-primary focus:border-primary"
          />
          <button
            type="submit"
            className="absolute right-3 top-2.5 text-neutral-400 hover:text-primary transition-colors cursor-pointer"
            aria-label="Submeter pesquisa"
          >
            <Search className="h-5 w-5 stroke-[1.5]" />
          </button>
        </div>
        
        {/* Mobile Filter Drawer Button */}
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className="lg:hidden flex items-center justify-center border border-border hover:border-primary px-3 rounded-sm text-primary transition-all bg-white cursor-pointer"
          aria-label="Filtros"
        >
          <SlidersHorizontal className="h-5 w-5 stroke-[1.5]" />
        </button>
      </form>

      {/* Sort Selector & Results Count */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-2 border-b border-border">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">
          {isPending ? "Actualizando catálogo..." : "Resultados do catálogo"}
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Ordenar por:</span>
          <select
            value={currentSort}
            onChange={(e) => updateFilters({ sort: e.target.value || null })}
            className="text-xs font-medium text-primary bg-transparent border-none focus:outline-none cursor-pointer pr-4"
          >
            <option value="newest">Mais recentes</option>
            <option value="price-asc">Preço: menor para maior</option>
            <option value="price-desc">Preço: maior para menor</option>
            <option value="popular">Mais procurados</option>
          </select>
        </div>
      </div>

      {/* Desktop Filters Pane (Always visible on big screens) */}
      <div className="hidden lg:block border border-border p-6 bg-white rounded-sm">
        {filtersForm}
      </div>

      {/* Mobile Drawer Overlay */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px]">
          <div className="relative w-full max-w-xs bg-card p-6 shadow-xl border-l border-border flex flex-col h-full animate-in slide-in-from-right duration-250">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
              <h3 className="text-sm font-serif font-semibold text-primary uppercase tracking-wider">Filtros</h3>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1 rounded-sm text-neutral-400 hover:text-primary transition-colors cursor-pointer"
                aria-label="Fechar filtros"
              >
                <X className="h-5 w-5 stroke-[1.5]" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-1">
              {filtersForm}
            </div>

            <div className="pt-4 border-t border-border mt-auto">
              <Button
                onClick={() => setIsDrawerOpen(false)}
                variant="primary"
                className="w-full h-11 text-xs rounded-sm cursor-pointer"
              >
                Ver resultados
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

