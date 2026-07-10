"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Search, Plus, Filter, RefreshCw, Edit2, 
  Trash2, Eye, EyeOff, Archive, CheckCircle2, AlertTriangle, ShoppingBag 
} from "lucide-react";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";
import { formatCurrency } from "@/lib/utils";
import { importProductsAction, updateProductStatusAction, deleteProductAction } from "./actions";

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
};

export default function AdminProductsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all"); // 'all', 'draft', 'published', 'archived', 'low_stock', 'no_image', 'imported'

  // CSV Import state
  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState<any | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Feedback messages
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const loadProducts = async () => {
    setLoading(true);
    setErrorMsg("");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      router.push("/account");
      return;
    }

    // 1. Fetch Profile
    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();
    setAdminProfile(prof);

    // 2. Fetch Products
    const { data: prods, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMsg("Erro ao carregar catálogo: " + error.message);
    } else {
      setProducts(prods || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, [supabase]);

  // Apply filters and searches client-side for fluid performance
  useEffect(() => {
    let result = [...products];

    // Search query match
    if (searchTerm.trim() !== "") {
      const q = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.name?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.instagram_post_id?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    }

    // Tab filter match
    if (activeTab === "draft") {
      result = result.filter(p => p.status === "draft");
    } else if (activeTab === "published") {
      result = result.filter(p => p.status === "published");
    } else if (activeTab === "archived") {
      result = result.filter(p => p.status === "archived");
    } else if (activeTab === "low_stock") {
      result = result.filter(p => p.stock_quantity <= 5 && p.status === "published");
    } else if (activeTab === "no_image") {
      result = result.filter(p => !p.images || p.images.length === 0 || p.images[0] === "");
    } else if (activeTab === "imported") {
      result = result.filter(p => p.source_import === "instagram" || p.source_import === "csv");
    }

    setFilteredProducts(result);
  }, [products, searchTerm, activeTab]);

  const handleStatusChange = async (productId: string, status: "draft" | "published" | "archived") => {
    try {
      setSuccessMsg("");
      setErrorMsg("");
      await updateProductStatusAction(productId, status);
      setSuccessMsg(`Estado do produto alterado para ${STATUS_LABELS[status]}!`);
      // Update local state
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, status } : p));
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao alterar estado do produto.");
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm("Tem a certeza de que deseja eliminar este produto? Esta acção é irreversível.")) {
      return;
    }

    try {
      setSuccessMsg("");
      setErrorMsg("");
      await deleteProductAction(productId);
      setSuccessMsg("Produto eliminado com sucesso!");
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao eliminar produto.");
    }
  };

  const handleImportCatalog = async () => {
    setImporting(true);
    setImportReport(null);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const report = await importProductsAction();
      setImportReport(report);
      setSuccessMsg("Importação de catálogo concluída!");
      // Reload products catalog
      await loadProducts();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao importar catálogo.");
    } finally {
      setImporting(false);
    }
  };

  const hasCreatePermission = adminProfile?.role === "master_admin" || 
    (Array.isArray(adminProfile?.scopes) && adminProfile.scopes.includes("products.create"));

  const hasPublishPermission = adminProfile?.role === "master_admin" || 
    (Array.isArray(adminProfile?.scopes) && adminProfile.scopes.includes("products.publish"));

  const hasDeletePermission = adminProfile?.role === "master_admin" || 
    (Array.isArray(adminProfile?.scopes) && adminProfile.scopes.includes("products.delete"));

  if (loading && products.length === 0) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-neutral-200 w-1/4 rounded" />
          <div className="h-10 bg-neutral-200 w-32 rounded" />
        </div>
        <div className="h-64 bg-neutral-200 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      {/* Header and buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-primary font-medium">Produtos</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gerencie o catálogo de produtos, stocks, preços e importações de posts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasCreatePermission && (
            <>
              <button
                onClick={() => {
                  setImportReport(null);
                  setShowImportModal(true);
                }}
                className="inline-flex h-10 items-center justify-center px-4 border border-border bg-white text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-neutral-50 transition-colors cursor-pointer text-primary"
              >
                Importar CSV
              </button>
              <Link
                href="/admin/products/new"
                className="inline-flex h-10 items-center justify-center px-4 bg-primary text-white text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-primary/95 transition-all"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Novo Produto
              </Link>
            </>
          )}
        </div>
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

      {/* FILTER TABS */}
      <div className="flex flex-wrap gap-1 border-b border-border">
        {[
          { id: "all", label: "Todos" },
          { id: "published", label: "Publicados" },
          { id: "draft", label: "Rascunhos" },
          { id: "archived", label: "Arquivados" },
          { id: "low_stock", label: "Baixo Stock" },
          { id: "no_image", label: "Sem Imagem" },
          { id: "imported", label: "Importados" },
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
          placeholder="Pesquisar por nome, marca, SKU, post ID..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="border-none p-0 focus:ring-0 focus:outline-none !h-auto text-sm w-full bg-transparent"
        />
        <button 
          onClick={loadProducts}
          className="p-1 hover:bg-neutral-50 rounded border border-border cursor-pointer text-primary shrink-0"
          title="Recarregar dados"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* PRODUCTS GRID / TABLE */}
      <div className="bg-white border border-border rounded-[4px] overflow-hidden shadow-sm">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground italic">
            Nenhum produto encontrado correspondente aos filtros aplicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 text-[10px] uppercase font-bold tracking-wider text-muted-foreground border-b border-border">
                  <th className="p-4 w-16">Imagem</th>
                  <th className="p-4">Nome / Marca</th>
                  <th className="p-4">SKU</th>
                  <th className="p-4 text-right">Preço</th>
                  <th className="p-4 text-center">Stock</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4">Origem</th>
                  <th className="p-4 text-right">Acções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs">
                {filteredProducts.map(product => {
                  const hasImage = product.images && product.images.length > 0 && product.images[0] !== "";
                  const thumb = hasImage ? product.images[0] : null;
                  
                  return (
                    <tr key={product.id} className="hover:bg-neutral-50/50">
                      {/* Image Thumbnail */}
                      <td className="p-4">
                        <div className="h-10 w-10 bg-neutral-100 border border-border rounded-sm overflow-hidden flex items-center justify-center text-neutral-400">
                          {thumb ? (
                            <img src={thumb} alt={product.name} className="h-full w-full object-cover" />
                          ) : (
                            <ShoppingBag className="h-4 w-4" />
                          )}
                        </div>
                      </td>

                      {/* Name / Brand */}
                      <td className="p-4 min-w-[200px]">
                        <Link href={`/admin/products/${product.id}`} className="font-semibold text-primary hover:underline block leading-tight">
                          {product.name}
                        </Link>
                        <span className="text-[10px] text-muted-foreground font-medium">{product.brand || "K-Beauty"}</span>
                      </td>

                      {/* SKU */}
                      <td className="p-4 font-mono font-medium text-muted-foreground">{product.sku || "N/A"}</td>

                      {/* Price */}
                      <td className="p-4 text-right font-semibold text-primary">{formatCurrency(Number(product.price))}</td>

                      {/* Stock */}
                      <td className="p-4 text-center">
                        <span className={`font-semibold ${product.stock_quantity <= 5 ? "text-amber-600 font-bold" : "text-primary"}`}>
                          {product.stock_quantity}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <span className={`inline-block text-[9px] font-bold uppercase px-2 py-0.5 rounded-sm ${
                          product.status === "published"
                            ? "bg-green-50 text-green-700 border border-green-200/50"
                            : product.status === "archived"
                            ? "bg-neutral-100 text-neutral-600"
                            : "bg-amber-50 text-amber-700 border border-amber-200/50"
                        }`}>
                          {STATUS_LABELS[product.status] || product.status}
                        </span>
                      </td>

                      {/* Source */}
                      <td className="p-4">
                        <span className="text-[10px] text-muted-foreground capitalize font-semibold">
                          {product.source_import === "instagram" ? "Instagram" : "Manual"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/products/${product.id}`}
                            className="p-1 hover:bg-neutral-100 text-neutral-600 rounded"
                            title="Editar"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Link>

                          {hasPublishPermission && (
                            <>
                              {product.status === "published" ? (
                                <button
                                  onClick={() => handleStatusChange(product.id, "draft")}
                                  className="p-1 hover:bg-neutral-100 text-amber-600 rounded cursor-pointer"
                                  title="Mudar para Rascunho"
                                >
                                  <EyeOff className="h-3.5 w-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleStatusChange(product.id, "published")}
                                  className="p-1 hover:bg-neutral-100 text-green-600 rounded cursor-pointer"
                                  title="Publicar"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                              )}
                              
                              {product.status !== "archived" && (
                                <button
                                  onClick={() => handleStatusChange(product.id, "archived")}
                                  className="p-1 hover:bg-neutral-100 text-neutral-500 rounded cursor-pointer"
                                  title="Arquivar"
                                >
                                  <Archive className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </>
                          )}

                          {hasDeletePermission && (
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="p-1 hover:bg-red-50 text-red-600 rounded cursor-pointer"
                              title="Eliminar"
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

      {/* CSV IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[1px]">
          <div className="bg-white border border-border p-6 rounded-[4px] max-w-lg w-full space-y-6 shadow-lg animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-base font-serif text-primary font-medium">Importação de Catálogo</h3>
              <button 
                onClick={() => setShowImportModal(false)}
                className="text-muted-foreground hover:text-primary cursor-pointer text-sm font-semibold"
                disabled={importing}
              >
                Fechar
              </button>
            </div>

            {importing ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-muted-foreground">Processando o ficheiro CSV do catálogo Nura no servidor...</p>
              </div>
            ) : importReport ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-sm border border-green-200/50 text-xs">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Importação efetuada com sucesso!</span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs bg-neutral-50 p-4 border border-border rounded-sm">
                  <div>
                    <p className="text-muted-foreground">Linhas no CSV:</p>
                    <p className="font-semibold text-primary text-base">{importReport.rowsRead}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Linhas da Nura:</p>
                    <p className="font-semibold text-primary text-base">{importReport.rowsMatchingBusiness}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Produtos Criados:</p>
                    <p className="font-semibold text-green-700 text-base">{importReport.productsCreated}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Produtos Atualizados:</p>
                    <p className="font-semibold text-blue-700 text-base">{importReport.productsUpdated}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Ignorados/Sem Preço:</p>
                    <p className="font-semibold text-primary text-base">{importReport.productsSkipped}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Erros:</p>
                    <p className="font-semibold text-red-600 text-base">{importReport.errors}</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowImportModal(false)}
                  className="w-full h-10 bg-primary text-white text-xs font-semibold uppercase tracking-wider rounded-sm cursor-pointer"
                >
                  OK, Fechar Relatório
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Esta acção lê o catálogo de importação armazenado no servidor em <code className="bg-neutral-100 px-1 py-0.5 rounded text-[11px] font-mono">/data/imports/nura_products.csv</code>, filtra as postagens da <strong>Nura Skincare</strong>, detecta os preços corretos em Meticais (MT) e cria ou atualiza as fichas de produtos como rascunhos.
                </p>

                <div className="p-3 bg-amber-50 border-l-2 border-amber-500 text-amber-700 text-xs rounded-sm">
                  <strong>Aviso:</strong> A importação actualizará os preços e imagens dos produtos existentes com base nas chaves identificadoras das postagens (source_post_id).
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-neutral-100">
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="h-10 px-4 border border-border bg-white text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-neutral-50 transition-colors cursor-pointer text-primary"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleImportCatalog}
                    className="h-10 px-6 bg-primary text-white text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-primary/95 transition-all cursor-pointer"
                  >
                    Iniciar Importação
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
