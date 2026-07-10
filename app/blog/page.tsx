import React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Clock, Calendar, ChevronRight } from "lucide-react";

export const revalidate = 300; // Cache and revalidate blog index every 5 minutes

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  keywords: string[];
  read_time: number;
  featured_image: string | null;
  html_content: string;
  created_at: string;
}

// Fallback high-quality editorial articles
export const MOCK_BLOG_POSTS: BlogPost[] = [
  {
    id: "mock-1",
    title: "Os 5 passos essenciais para peles oleosas e mistas",
    slug: "5-passos-peles-oleosas",
    excerpt: "Regular o excesso de sebo e o brilho sem danificar a hidratação natural é o maior desafio na pele em climas tropicais.",
    keywords: ["Rotinas", "Pele Oleosa", "K-Beauty"],
    read_time: 4,
    featured_image: null,
    html_content: `
      <p class="mb-4">Diferente do que muitos pensam, a pele oleosa e mista necessita de tanta hidratação como qualquer outra. Retirar a gordura natural de forma agressiva gera o chamado efeito ricochete, onde a pele produz ainda mais óleo para se defender.</p>
      
      <h3 class="font-serif text-xl text-primary font-medium mt-6 mb-3">1. Limpeza Dupla (Double Cleansing)</h3>
      <p class="mb-4">O primeiro passo da rotina noturna consiste em usar um óleo de limpeza para dissolver o excesso de sebo e o protetor solar, seguido por um gel de limpeza à base de água para limpar as impurezas profundas.</p>

      <h3 class="font-serif text-xl text-primary font-medium mt-6 mb-3">2. Tonificação de Equilíbrio</h3>
      <p class="mb-4">Evite tónicos que contêm álcool desnaturado. Opte por fórmulas coreanas hidratantes com centelha asiática ou ácido hialurónico, que restauram o pH da epiderme sem repuxar.</p>

      <h3 class="font-serif text-xl text-primary font-medium mt-6 mb-3">3. Esfoliação Química Suave (BHA)</h3>
      <p class="mb-4">O ácido salicílico (BHA) é solúvel em óleo, permitindo-lhe penetrar no interior dos poros para dissolver o sebo acumulado e prevenir cravos e espinhas.</p>

      <h3 class="font-serif text-xl text-primary font-medium mt-6 mb-3">4. Hidratação Fluida (Géis-Creme)</h3>
      <p class="mb-4">Utilize hidratantes em formato gel ou emulsão. Ingredientes como mucina de caracol e aloe vera fornecem água e reparam a barreira lipídica com toque seco.</p>

      <h3 class="font-serif text-xl text-primary font-medium mt-6 mb-3">5. Proteção Solar Invisível</h3>
      <p class="mb-4">A proteção solar diária é obrigatória. Os protetores coreanos modernos possuem texturas aquosas leves, de rápida absorção, ideais para o dia a dia quente em Moçambique.</p>
    `,
    created_at: new Date("2026-07-05").toISOString()
  },
  {
    id: "mock-2",
    title: "O que é a Centelha Asiática e como ajuda peles sensíveis",
    slug: "centelha-asiatica-pele-sensivel",
    excerpt: "Muito utilizada na cosmética coreana tradicional, este ativo botânico atua na redução da inflamação e acelera a cicatrização da barreira cutânea.",
    keywords: ["Ingredientes", "Pele Sensível", "Centelha"],
    read_time: 5,
    featured_image: null,
    html_content: `
      <p class="mb-4">A Centelha Asiática (frequentemente listada como Cica ou Tiger Grass) é uma planta medicinal milenar. Conta a lenda que os tigres asiáticos se esfregavam nas suas folhas para cicatrizar feridas após combates.</p>

      <h3 class="font-serif text-xl text-primary font-medium mt-6 mb-3">Por que acalma a pele?</h3>
      <p class="mb-4">Esta planta é rica em compostos ativos chamados saponinas (madecassoside, asiaticoside), que possuem propriedades anti-inflamatórias potentes. Ela atua na redução imediata de vermelhidões, comichões e sensibilidade cutânea.</p>

      <h3 class="font-serif text-xl text-primary font-medium mt-6 mb-3">Reconstrução da Barreira Lipídica</h3>
      <p class="mb-4">Para além de acalmar, a Centelha Asiática estimula a síntese de colagénio e fortalece a barreira de proteção natural da pele, reduzindo a perda de água transepidérmica.</p>
    `,
    created_at: new Date("2026-07-01").toISOString()
  },
  {
    id: "mock-3",
    title: "Sol e calor: por que os protetores coreanos são tão leves?",
    slug: "protetor-solar-coreano-leve",
    excerpt: "A tecnologia por trás das fórmulas de proteção solar coreanas garante um acabamento invisível perfeito para a rotina diurna tropical.",
    keywords: ["Proteção Solar", "Verão", "K-Beauty"],
    read_time: 3,
    featured_image: null,
    html_content: `
      <p class="mb-4">Diferente de muitos protetores ocidentais espessos e gordurosos, as fórmulas coreanas destacam-se pelo conforto e leveza. Mas qual é o segredo por trás desta inovação tecnológica?</p>

      <h3 class="font-serif text-xl text-primary font-medium mt-6 mb-3">Filtros Químicos Modernos</h3>
      <p class="mb-4">A Coreia do Sul utiliza filtros orgânicos de nova geração aprovados que são altamente estáveis à luz solar, transparentes na pele e não deixam o resíduo branco (white cast).</p>

      <h3 class="font-serif text-xl text-primary font-medium mt-6 mb-3">Texturas Híbridas de Gel e Essência</h3>
      <p class="mb-4">Fórmulas ricas em água purificada, extrato de centelha asiática e ácido hialurónico absorvem-se de imediato como se fossem um sérum ou creme hidratante comum.</p>
    `,
    created_at: new Date("2026-06-28").toISOString()
  }
];

async function getBlogPosts() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return MOCK_BLOG_POSTS;
    }
    return data as BlogPost[];
  } catch {
    return MOCK_BLOG_POSTS;
  }
}

export default async function BlogIndexPage() {
  const posts = await getBlogPosts();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-MZ", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full font-sans">
      <div className="max-w-3xl mb-12">
        <h1 className="text-4xl font-serif text-primary tracking-tight mb-4">
          Nura Skincare Journal
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Explore os nossos guias práticos de cuidados da pele, análises de ingredientes de K-Beauty, 
          e conselhos editoriais para uma rotina saudável em Moçambique.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {posts.map((post) => (
          <article 
            key={post.id} 
            className="flex flex-col border border-border bg-white rounded-sm overflow-hidden transition-all duration-300 hover:border-primary/30 h-full p-6 space-y-4"
          >
            {/* Meta headers */}
            <div className="flex items-center gap-4 text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 stroke-[1.5]" />
                {formatDate(post.created_at)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 stroke-[1.5]" />
                {post.read_time} min de leitura
              </span>
            </div>

            {/* Title */}
            <Link href={`/blog/${post.slug}`} className="block">
              <h2 className="font-serif text-xl text-primary font-medium hover:text-secondary transition-colors leading-tight">
                {post.title}
              </h2>
            </Link>

            {/* Excerpt */}
            <p className="text-xs text-muted-foreground leading-relaxed flex-1">
              {post.excerpt}
            </p>

            {/* Tags/Keywords footer */}
            {post.keywords && post.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {post.keywords.map((tag) => (
                  <span
                    key={tag}
                    className="text-[9px] bg-background border border-border text-secondary font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <hr className="border-border/50 pt-1" />

            {/* Read CTA */}
            <div>
              <Link 
                href={`/blog/${post.slug}`} 
                className="text-xs font-semibold text-secondary hover:text-primary transition-all uppercase tracking-wider inline-flex items-center gap-1"
              >
                Ler artigo <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
