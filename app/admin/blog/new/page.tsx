"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ChevronLeft, Upload, X } from "lucide-react";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";
import { slugify } from "@/lib/utils";
import RichTextEditor from "@/components/admin/RichTextEditor";

export default function AdminNewBlogPostPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [adminProfile, setAdminProfile] = useState<any>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [readTime, setReadTime] = useState("5");
  const [keywordsInput, setKeywordsInput] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");

  // Rich Content
  const [htmlContent, setHtmlContent] = useState("");

  // Featured Image
  const [featuredImage, setFeaturedImage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadAdmin() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/account");
        return;
      }
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      setAdminProfile(prof);
      setLoading(false);
    }
    loadAdmin();
  }, [supabase, router]);

  // Auto slug
  useEffect(() => {
    if (title) {
      setSlug(slugify(title));
    }
  }, [title]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setErrorMsg("");

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `blog/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images") // Re-use public images bucket
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      setFeaturedImage(publicUrl);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Erro ao fazer upload da imagem de destaque: " + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!title.trim()) {
      setErrorMsg("O título é obrigatório.");
      return;
    }
    if (!slug.trim()) {
      setErrorMsg("O slug é obrigatório.");
      return;
    }
    if (!excerpt.trim()) {
      setErrorMsg("O excerto/resumo é obrigatório.");
      return;
    }
    if (!htmlContent.trim()) {
      setErrorMsg("O conteúdo do artigo está em branco.");
      return;
    }

    setSubmitting(true);

    // Keywords parse
    const keywords = keywordsInput
      .split(",")
      .map(k => k.trim())
      .filter(k => k.length > 0);

    try {
      const { data: insertedPost, error } = await supabase
        .from("blog_posts")
        .insert({
          title: title.trim(),
          slug: slug.trim(),
          excerpt: excerpt.trim(),
          read_time: parseInt(readTime) || 5,
          keywords,
          featured_image: featuredImage || null,
          html_content: htmlContent.trim(),
          rich_content: { html: htmlContent.trim() }, // TipTap JSON format fallback
          status,
          author_id: adminProfile.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Log action
      if (insertedPost) {
        await supabase.from("audit_logs").insert({
          admin_id: adminProfile.id,
          action: "blog.created",
          entity_type: "blog",
          entity_id: insertedPost.id,
          metadata: { title: insertedPost.title, status: insertedPost.status }
        });
      }

      router.push("/admin/blog");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Erro ao publicar artigo.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-neutral-200 w-1/4 rounded" />
        <div className="h-64 bg-neutral-200 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Navigation Header */}
      <div className="flex items-center gap-2">
        <Link
          href="/admin/blog"
          className="p-1.5 hover:bg-white rounded border border-border text-primary cursor-pointer transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-serif text-primary font-medium">Novo Artigo</h1>
          <p className="text-xs text-muted-foreground">Publique rotinas, dicas e novidades de cosméticos.</p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border-l-2 border-red-500 text-red-700 text-xs rounded-sm">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleCreatePost} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left main text editor */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-border p-6 rounded-[4px] space-y-4 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary border-b border-neutral-100 pb-2">
              Conteúdo Editorial
            </h3>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                Título do Artigo *
              </label>
              <Input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                disabled={submitting}
                required
                className="w-full text-sm"
                placeholder="Ex: Como montar uma rotina K-Beauty para pele oleosa"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                Slug (URL do artigo) *
              </label>
              <Input
                type="text"
                value={slug}
                onChange={e => setSlug(e.target.value)}
                disabled={submitting}
                required
                className="w-full text-sm"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                Excerto / Resumo Curto *
              </label>
              <textarea
                value={excerpt}
                onChange={e => setExcerpt(e.target.value)}
                disabled={submitting}
                rows={3}
                required
                className="w-full p-3 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary rounded-sm font-sans"
                placeholder="Um pequeno parágrafo chamativo para listar nos cartões de blog..."
              />
            </div>

            {/* TipTap Rich Editor */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1.5">
                Corpo do Artigo *
              </label>
              <RichTextEditor
                value={htmlContent}
                onChange={setHtmlContent}
                disabled={submitting}
              />
            </div>
          </div>
        </div>

        {/* Right side configuration panel */}
        <div className="space-y-6">
          {/* Status & Save */}
          <div className="bg-white border border-border p-6 rounded-[4px] space-y-4 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary border-b border-neutral-100 pb-2">
              Estado de Publicação
            </h3>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                Estado
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                disabled={submitting}
                className="w-full h-10 px-3 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary rounded-sm font-sans"
              >
                <option value="draft">Rascunho (Privado)</option>
                <option value="published">Publicado (Público)</option>
              </select>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={submitting}
                variant="primary"
                className="w-full h-10 text-xs font-semibold uppercase tracking-wider rounded-sm cursor-pointer"
              >
                {submitting ? "A guardar..." : "Publicar Artigo"}
              </Button>
            </div>
          </div>

          {/* Reading specs */}
          <div className="bg-white border border-border p-6 rounded-[4px] space-y-4 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary border-b border-neutral-100 pb-2">
              Filtros & Leitura
            </h3>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                Tempo de Leitura Estimado (Minutos)
              </label>
              <Input
                type="number"
                value={readTime}
                onChange={e => setReadTime(e.target.value)}
                disabled={submitting}
                required
                className="w-full text-sm"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                Tags / Palavras-chave (Separadas por vírgula)
              </label>
              <Input
                type="text"
                placeholder="Ex: acne, oleosidade, doublecleansing"
                value={keywordsInput}
                onChange={e => setKeywordsInput(e.target.value)}
                disabled={submitting}
                className="w-full text-sm"
              />
            </div>
          </div>

          {/* Feature Image */}
          <div className="bg-white border border-border p-6 rounded-[4px] space-y-4 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary border-b border-neutral-100 pb-2">
              Imagem de Destaque
            </h3>

            {featuredImage ? (
              <div className="space-y-3">
                <div className="h-40 bg-neutral-100 border border-border rounded-sm overflow-hidden relative">
                  <img src={featuredImage} alt="Featured preview" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFeaturedImage("")}
                    className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full cursor-pointer shadow-md"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <p className="text-[9px] truncate text-muted-foreground">{featuredImage}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                    URL da Imagem
                  </label>
                  <Input
                    type="url"
                    placeholder="https://..."
                    value={featuredImage}
                    onChange={e => setFeaturedImage(e.target.value)}
                    disabled={submitting}
                    className="w-full text-xs"
                  />
                </div>

                <div className="border-t border-dashed border-border pt-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                    Upload de ficheiro
                  </label>
                  <div className="relative border border-dashed border-border rounded-sm p-4 text-center hover:bg-neutral-50 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage || submitting}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <Upload className="h-5 w-5 mx-auto text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground block mt-1">
                      {uploadingImage ? "A carregar..." : "PNG ou JPG de Destaque"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
