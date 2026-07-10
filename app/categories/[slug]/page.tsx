import React from "react";
import Link from "next/link";
import { Compass, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/product/ProductCard";
import type { Product } from "@/components/product/ProductCard";

export const revalidate = 60;

interface CategoryPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Educational descriptions for skin goals
const GOAL_DATA: Record<string, { title: string; description: string; intro: string; term: string }> = {
  "hidratacao": {
    title: "Produtos para Hidratação",
    description: "Fórmulas ricas em humectantes e lípidos para repor a água essencial, restaurar o conforto e selar a barreira da sua pele.",
    intro: "A hidratação é o pilar fundamental de qualquer rotina de beleza coreana. Peles desidratadas tornam-se sensíveis e propensas a inflamações. Selecione produtos pensados para reforçar a hidratação, suavizar a pele e apoiar uma rotina diária consistente.",
    term: "hidratantes"
  },
  "acne": {
    title: "Produtos para Pele com Acne",
    description: "Cuidado purificante com centelha asiática, BHA e mucina para acalmar inflamações e acelerar a cicatrização.",
    intro: "Tratar a acne com K-Beauty significa acalmar e nutrir em vez de secar e agredir a pele. Fórmulas com ativos botânicos purificam os poros suavemente, mantendo a humidade equilibrada para evitar o efeito ricochete.",
    term: "acne"
  },
  "manchas": {
    title: "Tratamentos para Manchas & Tons Irregulares",
    description: "Séruns iluminadores enriquecidos com niacinamida, ginseng e extrato de arroz para reduzir hiperpigmentação.",
    intro: "Recupere a luminosidade natural e uniformize as marcas de acne ou sol. A nossa curadoria contém ingredientes clareadores tradicionais coreanos que atuam com suavidade sem irritar a derme.",
    term: "manchas"
  },
  "oleosidade": {
    title: "Controlo de Oleosidade & Poros",
    description: "Texturas leves em gel e tonificantes sebo-reguladores que purificam e equilibram o excesso de brilho diário.",
    intro: "Manter a pele mate e equilibrada em Moçambique exige fórmulas de rápida absorção. Descubra hidratantes fluidos que reduzem a aparência dos poros dilatados sem obstruir a pele.",
    term: "oleosidade"
  },
  "anti-idade": {
    title: "Fórmulas de Prevenção & Anti-Idade",
    description: "Nutrição rica em antioxidantes, péptidos e extrato de ginseng vermelho para combater linhas finas e flacidez.",
    intro: "A filosofia coreana foca-se na prevenção. Proteja o colagénio da derme com ingredientes antioxidantes concentrados que devolvem a elasticidade e restauram o viço saudável.",
    term: "anti-idade"
  },
  "textura": {
    title: "Renovação & Textura da Pele",
    description: "Essências de mucina e esfoliantes químicos suaves para uniformizar a aspereza e suavizar cicatrizes.",
    intro: "Livre-se das células mortas e recupere o toque aveludado. A combinação de secreção de caracol e ácidos suaves promove a renovação celular, revelando uma pele lisa e rejuvenescida.",
    term: "textura"
  },
  "pele-sensivel": {
    title: "Cuidados para Pele Sensível",
    description: "Ingredientes hipoalergénicos e pantenol para acalmar a vermelhidão e combater comichões ou irritações.",
    intro: "Pele que repuxa ou apresenta vermelhidão necessita de ingredientes puros. Escolha produtos minimalistas com extratos naturais que acalmam de imediato e reconstroem a barreira defensiva.",
    term: "sensível"
  },
  "luminosidade": {
    title: "Luminosidade & Brilho Natural",
    description: "Loções iluminadoras e probióticos que combatem o aspeto baço e cansado de forma instantânea.",
    intro: "Adicione o famoso efeito 'glass skin' (pele radiante e translúcida) à sua rotina. As fermentações de arroz e ginseng fornecem a energia celular que a sua tez precisa para brilhar.",
    term: "brilho"
  }
};

const RELATED_GOALS = [
  { name: "Hidratação", slug: "hidratacao" },
  { name: "Acne", slug: "acne" },
  { name: "Manchas", slug: "manchas" },
  { name: "Pele sensível", slug: "pele-sensivel" }
];

async function getCategoryData(slug: string) {
  const supabase = await createClient();
  
  // 1. Check if it is a registered category in the DB
  const { data: category } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (category) {
    // Fetch products belonging to this category via junction
    const { data: junctions } = await supabase
      .from("product_category_junction")
      .select("product_id")
      .eq("category_id", category.id);
    
    const productIds = junctions?.map(j => j.product_id) || [];
    
    let products: Product[] = [];
    if (productIds.length > 0) {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("status", "published")
        .in("id", productIds)
        .order("created_at", { ascending: false });
      
      products = (data as Product[]) || [];
    }

    return {
      isCategory: true,
      title: category.name,
      description: category.description || "Produtos selecionados de skincare coreano.",
      intro: `Explore a nossa gama de produtos na categoria ${category.name}. Fórmulas autênticas trazidas de Seul para Maputo, ideais para nutrir e manter a beleza natural da sua pele.`,
      products
    };
  }

  // 2. Check if it matches a predefined Skin Goal concern
  const goal = GOAL_DATA[slug];
  if (goal) {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("status", "published")
      .ilike("search_keywords", `%${goal.term}%`)
      .order("created_at", { ascending: false });

    return {
      isCategory: false,
      title: goal.title,
      description: goal.description,
      intro: goal.intro,
      products: (data as Product[]) || []
    };
  }

  return null;
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const data = await getCategoryData(slug);

  if (!data) {
    return (
      <div className="py-20 text-center max-w-xl mx-auto px-4 font-sans space-y-4">
        <Compass className="h-8 w-8 stroke-[1.2] text-neutral-400 mx-auto" />
        <h1 className="text-2xl font-serif text-primary">Categoria não encontrada</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          A página ou objetivo de pele que procura não existe ou foi removida.
        </p>
        <Link
          href="/products"
          className="inline-flex h-10 items-center justify-center px-6 bg-primary text-white text-xs font-semibold uppercase tracking-wider rounded-sm"
        >
          Ver todos os produtos
        </Link>
      </div>
    );
  }

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full font-sans">
      
      {/* Back link */}
      <div className="mb-6">
        <Link
          href="/products"
          className="text-xs font-semibold text-secondary hover:text-primary transition-all uppercase tracking-wider"
        >
          ← Catálogo completo
        </Link>
      </div>

      {/* Header Info Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center border-b border-border pb-10 mb-12">
        <div className="lg:col-span-8 space-y-4">
          <h1 className="text-3xl sm:text-4xl font-serif text-primary tracking-tight">
            {data.title}
          </h1>
          <p className="text-base text-primary/80 font-serif leading-relaxed">
            {data.description}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {data.intro}
          </p>
        </div>
        
        {/* Related concerns navigation widget */}
        <div className="lg:col-span-4 lg:border-l lg:border-border lg:pl-8 space-y-4">
          <h3 className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Outros objectivos
          </h3>
          <div className="flex flex-wrap gap-2">
            {RELATED_GOALS.filter(g => g.slug !== slug).map(goal => (
              <Link
                key={goal.slug}
                href={`/categories/${goal.slug}`}
                className="px-3 py-1.5 border border-border text-[11px] hover:border-primary text-primary transition-all rounded-sm bg-white font-medium"
              >
                {goal.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="space-y-8">
        {data.products.length === 0 ? (
          <div className="py-16 text-center max-w-md mx-auto border border-dashed border-border rounded-sm bg-white space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Ainda não há produtos publicados nesta categoria.
            </p>
            <Link
              href="/products"
              className="inline-flex h-10 items-center justify-center px-6 bg-primary text-white text-xs font-semibold uppercase tracking-wider rounded-sm"
            >
              Comprar outros produtos
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {data.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
