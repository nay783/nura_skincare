import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { Compass, Calendar, Clock, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MOCK_BLOG_POSTS } from "../page";
import type { BlogPost } from "../page";

interface BlogPostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Generate SEO Metadata for Articles
export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const supabase = await createClient();
    const { data: post } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    const resolvedPost = post || MOCK_BLOG_POSTS.find((p) => p.slug === slug);
    if (!resolvedPost) return { title: "Artigo não encontrado" };

    return {
      title: `${resolvedPost.title} | Journal`,
      description: resolvedPost.excerpt,
      keywords: resolvedPost.keywords,
      openGraph: {
        title: resolvedPost.title,
        description: resolvedPost.excerpt,
        type: "article",
        locale: "pt_MZ"
      }
    };
  } catch {
    return { title: "Nura Journal" };
  }
}

async function getPostData(slug: string) {
  try {
    const supabase = await createClient();
    const { data: post, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (error || !post) {
      // Fallback to mock posts
      const mockPost = MOCK_BLOG_POSTS.find((p) => p.slug === slug);
      return mockPost || null;
    }

    return post as BlogPost;
  } catch {
    const mockPost = MOCK_BLOG_POSTS.find((p) => p.slug === slug);
    return mockPost || null;
  }
}

export default async function BlogPostDetailPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getPostData(slug);

  if (!post) {
    return (
      <div className="py-20 text-center max-w-xl mx-auto px-4 font-sans space-y-4">
        <Compass className="h-8 w-8 stroke-[1.2] text-neutral-400 mx-auto" />
        <h1 className="text-2xl font-serif text-primary">Artigo não encontrado</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          O artigo solicitado não existe ou foi removido do nosso diário de skincare.
        </p>
        <Link
          href="/blog"
          className="inline-flex h-10 items-center justify-center px-6 bg-primary text-white text-xs font-semibold uppercase tracking-wider rounded-sm"
        >
          Voltar ao Journal
        </Link>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-MZ", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  };

  // Get other articles for "Related Read" block
  const otherPosts = MOCK_BLOG_POSTS.filter((p) => p.slug !== slug).slice(0, 2);

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto w-full font-sans">
      
      {/* Back link */}
      <div className="mb-8">
        <Link
          href="/blog"
          className="text-xs font-semibold text-secondary hover:text-primary transition-all uppercase tracking-wider inline-flex items-center gap-1"
        >
          ← Voltar ao Journal
        </Link>
      </div>

      {/* Article Header info */}
      <header className="space-y-6 mb-12">
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground uppercase tracking-widest font-semibold pb-2 border-b border-border/50">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 stroke-[1.5]" />
            {formatDate(post.created_at)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 stroke-[1.5]" />
            {post.read_time} min de leitura
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-primary tracking-tight leading-tight font-medium">
          {post.title}
        </h1>

        <p className="text-base text-primary/80 font-serif leading-relaxed italic border-l-2 border-accent pl-4 py-1">
          {post.excerpt}
        </p>
      </header>

      {/* HTML Body article content */}
      <article 
        className="prose prose-sm max-w-none text-sm text-muted-foreground leading-relaxed space-y-6"
        dangerouslySetInnerHTML={{ __html: post.html_content }}
      />

      {/* Tags footer */}
      {post.keywords && post.keywords.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-8 border-t border-border mt-12">
          {post.keywords.map((tag) => (
            <span
              key={tag}
              className="text-[10px] bg-background border border-border text-secondary font-semibold uppercase tracking-wider px-3 py-1 rounded-sm"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Related articles suggestions box */}
      <div className="border-t border-border pt-12 mt-16 space-y-6">
        <h3 className="font-serif text-xl text-primary font-medium">Outros artigos do Journal</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {otherPosts.map((other) => (
            <Link
              key={other.id}
              href={`/blog/${other.slug}`}
              className="group border border-border p-5 rounded-sm bg-white hover:border-primary/30 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <span className="text-[9px] text-muted-foreground uppercase tracking-widest block font-medium">
                  {other.read_time} min de leitura
                </span>
                <h4 className="font-serif text-sm font-semibold text-primary group-hover:text-secondary transition-colors line-clamp-2">
                  {other.title}
                </h4>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-secondary font-semibold group-hover:text-primary transition-all mt-4 inline-flex items-center gap-1">
                Ler artigo <ChevronRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
