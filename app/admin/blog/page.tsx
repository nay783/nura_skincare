"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Plus, Search, Edit2, Trash2, RefreshCw, BookOpen, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/shared/input";

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
};

export default function AdminBlogPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<any[]>([]);
  
  // Search & tab filters
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all"); // 'all', 'draft', 'published', 'archived'

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const loadPosts = async () => {
    setLoading(true);
    setErrorMsg("");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      router.push("/account");
      return;
    }

    // 1. Fetch profile
    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();
    setAdminProfile(prof);

    // 2. Fetch Blog posts + Author profile
    const { data: bPosts, error } = await supabase
      .from("blog_posts")
      .select(`
        *,
        author:author_id (
          first_name,
          last_name
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMsg("Erro ao carregar posts: " + error.message);
    } else {
      setPosts(bPosts || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPosts();
  }, [supabase]);

  // Apply search & tab filters
  useEffect(() => {
    let result = [...posts];

    if (searchTerm.trim() !== "") {
      const q = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.title?.toLowerCase().includes(q) ||
        p.excerpt?.toLowerCase().includes(q) ||
        p.slug?.toLowerCase().includes(q)
      );
    }

    if (activeTab === "draft") {
      result = result.filter(p => p.status === "draft");
    } else if (activeTab === "published") {
      result = result.filter(p => p.status === "published");
    } else if (activeTab === "archived") {
      result = result.filter(p => p.status === "archived");
    }

    setFilteredPosts(result);
  }, [posts, searchTerm, activeTab]);

  const handleStatusChange = async (postId: string, status: "draft" | "published" | "archived") => {
    try {
      setSuccessMsg("");
      setErrorMsg("");

      const { error } = await supabase
        .from("blog_posts")
        .update({ status })
        .eq("id", postId);

      if (error) throw error;

      // Log action
      await supabase.from("audit_logs").insert({
        admin_id: adminProfile.id,
        action: `blog.${status}`,
        entity_type: "blog",
        entity_id: postId,
        metadata: { status }
      });

      setSuccessMsg(`Estado do artigo alterado para ${STATUS_LABELS[status]}!`);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, status } : p));
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao alterar estado do artigo.");
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("Tem a certeza de que deseja eliminar este artigo permanentemente?")) {
      return;
    }

    try {
      setSuccessMsg("");
      setErrorMsg("");

      const { error } = await supabase
        .from("blog_posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;

      // Log action
      await supabase.from("audit_logs").insert({
        admin_id: adminProfile.id,
        action: "blog.deleted",
        entity_type: "blog",
        entity_id: postId,
      });

      setSuccessMsg("Artigo eliminado com sucesso!");
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao eliminar artigo.");
    }
  };

  const hasWritePermission = adminProfile?.role === "master_admin" || 
    (Array.isArray(adminProfile?.scopes) && adminProfile.scopes.includes("blog.create"));

  const hasPublishPermission = adminProfile?.role === "master_admin" || 
    (Array.isArray(adminProfile?.scopes) && adminProfile.scopes.includes("blog.publish"));

  const hasDeletePermission = adminProfile?.role === "master_admin" || 
    (Array.isArray(adminProfile?.scopes) && adminProfile.scopes.includes("blog.delete"));

  if (loading && posts.length === 0) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-neutral-200 w-1/4 rounded" />
        <div className="h-64 bg-neutral-200 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-primary font-medium">Blog CMS</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Publique novidades, rotinas de K-Beauty e artigos editoriais.
          </p>
        </div>

        {hasWritePermission && (
          <Link
            href="/admin/blog/new"
            className="inline-flex h-10 items-center justify-center px-4 bg-primary text-white text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-primary/95 transition-all"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Novo Artigo
          </Link>
        )}
      </div>

      {successMsg && (
        <div className="p-3 bg-green-50 border-l-2 border-green-500 text-green-700 text-xs rounded-sm">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-50 border-l-2 border-red-500 text-red-700 text-xs rounded-sm">
          {errorMsg}
        </div>
      )}

      {/* TABS */}
      <div className="flex flex-wrap gap-1 border-b border-border">
        {[
          { id: "all", label: "Todos" },
          { id: "published", label: "Publicados" },
          { id: "draft", label: "Rascunhos" },
          { id: "archived", label: "Arquivados" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SEARCH BAR */}
      <div className="flex items-center gap-3 bg-white p-3 border border-border rounded-[4px] shadow-sm">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          type="text"
          placeholder="Pesquisar artigo por título ou excerto..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="border-none p-0 focus:ring-0 focus:outline-none !h-auto text-sm w-full bg-transparent"
        />
        <button 
          onClick={loadPosts}
          className="p-1 hover:bg-neutral-50 rounded border border-border cursor-pointer text-primary shrink-0"
          title="Recarregar"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ARTICLES TABLE */}
      <div className="bg-white border border-border rounded-[4px] overflow-hidden shadow-sm">
        {filteredPosts.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground italic">
            Nenhum artigo publicado ou criado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 text-[10px] uppercase font-bold tracking-wider text-muted-foreground border-b border-border">
                  <th className="p-4 w-16">Imagem</th>
                  <th className="p-4">Título</th>
                  <th className="p-4">Autor</th>
                  <th className="p-4 text-center">Tempo Leitura</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4">Criado Em</th>
                  <th className="p-4 text-right">Acções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs">
                {filteredPosts.map(post => {
                  const authorName = post.author
                    ? `${post.author.first_name || ""} ${post.author.last_name || ""}`.trim()
                    : "Autor";
                  
                  return (
                    <tr key={post.id} className="hover:bg-neutral-50/50">
                      {/* Image Thumbnail */}
                      <td className="p-4">
                        <div className="h-10 w-16 bg-neutral-100 border border-border rounded-sm overflow-hidden flex items-center justify-center text-neutral-400">
                          {post.featured_image ? (
                            <img src={post.featured_image} alt={post.title} className="h-full w-full object-cover" />
                          ) : (
                            <BookOpen className="h-4 w-4" />
                          )}
                        </div>
                      </td>

                      {/* Title */}
                      <td className="p-4 min-w-[250px]">
                        <Link href={`/admin/blog/${post.id}`} className="font-semibold text-primary hover:underline block leading-tight">
                          {post.title}
                        </Link>
                        <span className="text-[10px] text-muted-foreground font-mono mt-0.5 block">/{post.slug}</span>
                      </td>

                      {/* Author */}
                      <td className="p-4 font-medium text-primary">{authorName}</td>

                      {/* Read time */}
                      <td className="p-4 text-center font-semibold text-muted-foreground">{post.read_time} min</td>

                      {/* Status */}
                      <td className="p-4">
                        <span className={`inline-block text-[9px] font-bold uppercase px-2 py-0.5 rounded-sm ${
                          post.status === "published"
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : post.status === "archived"
                            ? "bg-neutral-100 text-neutral-600"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          {STATUS_LABELS[post.status] || post.status}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="p-4 text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString("pt-MZ")}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/blog/${post.id}`}
                            className="p-1 hover:bg-neutral-100 text-neutral-600 rounded"
                            title="Editar Artigo"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Link>

                          {hasPublishPermission && (
                            <>
                              {post.status === "published" ? (
                                <button
                                  onClick={() => handleStatusChange(post.id, "draft")}
                                  className="p-1 hover:bg-neutral-100 text-amber-600 rounded cursor-pointer"
                                  title="Mudar para Rascunho"
                                >
                                  <EyeOff className="h-3.5 w-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleStatusChange(post.id, "published")}
                                  className="p-1 hover:bg-neutral-100 text-green-600 rounded cursor-pointer"
                                  title="Publicar Artigo"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </>
                          )}

                          {hasDeletePermission && (
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              className="p-1 hover:bg-red-50 text-red-600 rounded cursor-pointer"
                              title="Eliminar Artigo"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
