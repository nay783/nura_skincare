"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";
import { slugify } from "@/lib/utils";
import { Upload, X, Check, ArrowUp, ArrowDown } from "lucide-react";

interface ProductFormProps {
  initialData?: any;
  onSubmit: (formData: any) => Promise<void>;
  submitLabel: string;
}

const CATEGORIES = [
  { id: "b27abfb2-ce37-4d7a-8fbb-574944ecbb01", name: "Limpeza" },
  { id: "b27abfb2-ce37-4d7a-8fbb-574944ecbb02", name: "Tónicos & Essências" },
  { id: "b27abfb2-ce37-4d7a-8fbb-574944ecbb03", name: "Séruns & Tratamentos" },
  { id: "b27abfb2-ce37-4d7a-8fbb-574944ecbb04", name: "Hidratantes" },
  { id: "b27abfb2-ce37-4d7a-8fbb-574944ecbb05", name: "Protetores Solares" },
];

const SKIN_GOALS = [
  { slug: "hidratacao", name: "Hidratação" },
  { slug: "acne", name: "Acne" },
  { slug: "manchas", name: "Manchas" },
  { slug: "oleosidade", name: "Oleosidade" },
  { slug: "anti-idade", name: "Anti-idade" },
  { slug: "textura", name: "Textura" },
  { slug: "pele-sensivel", name: "Pele sensível" },
  { slug: "luminosidade", name: "Luminosidade" },
];

export default function ProductForm({ initialData, onSubmit, submitLabel }: ProductFormProps) {
  const router = useRouter();
  const supabase = createClient();

  // General fields
  const [name, setName] = useState(initialData?.name || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [brand, setBrand] = useState(initialData?.brand || "");
  const [sku, setSku] = useState(initialData?.sku || "");
  const [price, setPrice] = useState(initialData?.price ? String(initialData.price) : "");
  const [compareAtPrice, setCompareAtPrice] = useState(
    initialData?.compare_at_price ? String(initialData.compare_at_price) : ""
  );
  const [stockQuantity, setStockQuantity] = useState(
    initialData?.stock_quantity !== undefined ? String(initialData.stock_quantity) : "0"
  );
  const [status, setStatus] = useState<"draft" | "published" | "archived">(initialData?.status || "draft");

  // Descriptions & usage
  const [description, setDescription] = useState(initialData?.description || "");
  const [ingredients, setIngredients] = useState(initialData?.ingredients || "");
  const [howToUse, setHowToUse] = useState(initialData?.how_to_use || "");

  // Benefits (list)
  const [benefitsText, setBenefitsText] = useState(
    Array.isArray(initialData?.benefits) ? initialData.benefits.join("\n") : ""
  );

  // Category
  const [categoryId, setCategoryId] = useState(initialData?.category_id || "");

  // Skin goals (array)
  const [selectedGoals, setSelectedGoals] = useState<string[]>(
    Array.isArray(initialData?.skin_goals) ? initialData.skin_goals : []
  );

  // SEO details
  const [seoTitle, setSeoTitle] = useState(initialData?.seo_title || "");
  const [seoDescription, setSeoDescription] = useState(initialData?.seo_description || "");
  const [searchKeywords, setSearchKeywords] = useState(initialData?.search_keywords || "");

  // Images state
  const [images, setImages] = useState<string[]>(
    Array.isArray(initialData?.images) ? initialData.images : []
  );
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form states
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Auto-slug generation helper
  const handleNameChange = (val: string) => {
    setName(val);
    if (!initialData) {
      setSlug(slugify(val));
    }
  };

  // Sync category if editing
  useEffect(() => {
    async function loadCategoryJunction() {
      if (initialData?.id) {
        const { data } = await supabase
          .from("product_category_junction")
          .select("category_id")
          .eq("product_id", initialData.id)
          .maybeSingle();
        if (data) {
          setCategoryId(data.category_id);
        }
      }
    }
    loadCategoryJunction();
  }, [initialData, supabase]);

  const handleGoalCheckbox = (slug: string) => {
    setSelectedGoals(prev => 
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    );
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setErrorMsg("");

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      setImages(prev => [...prev, publicUrl]);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Erro ao carregar imagem: " + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddImageUrl = () => {
    if (imageUrlInput.trim() !== "") {
      setImages(prev => [...prev, imageUrlInput.trim()]);
      setImageUrlInput("");
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSetMainImage = (index: number) => {
    if (index === 0) return;
    const target = images[index];
    const rest = images.filter((_, i) => i !== index);
    setImages([target, ...rest]);
  };

  const handleMoveImage = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === images.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const newImages = [...images];
    const temp = newImages[index];
    newImages[index] = newImages[targetIndex];
    newImages[targetIndex] = temp;
    setImages(newImages);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setValidationErrors([]);

    // Publish Validation checks
    const errors: string[] = [];
    if (!name.trim()) errors.push("Nome do produto em falta.");
    if (!slug.trim()) errors.push("Slug do produto em falta.");
    
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      errors.push("Preço do produto inválido.");
    }

    const parsedStock = parseInt(stockQuantity);
    if (isNaN(parsedStock) || parsedStock < 0) {
      errors.push("Quantidade de stock inválida.");
    }

    if (!categoryId) {
      errors.push("Por favor, selecione uma Categoria.");
    }

    if (status === "published") {
      // Stringent requirements before public launch
      if (images.length === 0 || images[0] === "") {
        errors.push("É obrigatório associar pelo menos uma imagem para publicar o produto.");
      }
      if (!description.trim()) {
        errors.push("É obrigatório fornecer uma descrição curta/completa para publicar o produto.");
      }
      if (!brand.trim()) {
        errors.push("É obrigatório preencher a marca para publicar o produto.");
      }
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      // Scroll to top
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSubmitting(true);

    // Build benefits list array
    const benefits = benefitsText
      .split("\n")
      .map((b: string) => b.trim())
      .filter((b: string) => b.length > 0);

    const payload = {
      name: name.trim(),
      slug: slug.trim(),
      brand: brand.trim() || "K-Beauty",
      sku: sku.trim() || `NURA-${Math.random().toString(36).substring(7).toUpperCase()}`,
      price: parsedPrice,
      compare_at_price: compareAtPrice ? parseFloat(compareAtPrice) : null,
      stock_quantity: parsedStock,
      status,
      description: description.trim(),
      ingredients: ingredients.trim(),
      how_to_use: howToUse.trim(),
      benefits,
      images,
      main_image_url: images[0] || null,
      external_images: images.filter(img => !img.includes("supabase.co")),
      skin_goals: selectedGoals,
      categoryId, // junction update
      seo_title: seoTitle.trim() || `${name} | Nura Skincare`,
      seo_description: seoDescription.trim() || description.substring(0, 155),
      search_keywords: searchKeywords.trim() || `${name} ${brand} ${selectedGoals.join(" ")}`.toLowerCase(),
    };

    try {
      await onSubmit(payload);
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao gravar produto.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-8 font-sans pb-12">
      {/* Validation alert banners */}
      {validationErrors.length > 0 && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-sm text-xs text-red-700 space-y-2">
          <p className="font-bold">Este produto ainda não está pronto para publicação:</p>
          <ul className="list-disc list-inside space-y-1 pl-1">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-50 border-l-2 border-red-500 text-red-700 text-xs rounded-sm">
          {errorMsg}
        </div>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN (2 spans): Primary info fields */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Identidade */}
          <div className="bg-white border border-border p-6 rounded-[4px] space-y-4 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary border-b border-neutral-100 pb-2">
              Identidade do Produto
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                  Nome do Produto *
                </label>
                <Input
                  type="text"
                  value={name}
                  onChange={e => handleNameChange(e.target.value)}
                  disabled={submitting}
                  required
                  className="w-full text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                  Slug do Produto (URL) *
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                  Marca
                </label>
                <Input
                  type="text"
                  value={brand}
                  onChange={e => setBrand(e.target.value)}
                  disabled={submitting}
                  className="w-full text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                  SKU *
                </label>
                <Input
                  type="text"
                  value={sku}
                  onChange={e => setSku(e.target.value)}
                  disabled={submitting}
                  className="w-full text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                  Categoria *
                </label>
                <select
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  disabled={submitting}
                  required
                  className="w-full h-10 px-3 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary rounded-sm font-sans"
                >
                  <option value="">Selecione uma Categoria...</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Descrições detalhadas */}
          <div className="bg-white border border-border p-6 rounded-[4px] space-y-4 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary border-b border-neutral-100 pb-2">
              Detalhes & Ficha Técnica
            </h3>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                Descrição Curta / Completa *
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                disabled={submitting}
                rows={4}
                required
                className="w-full p-3 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary rounded-sm font-sans"
                placeholder="Insira os detalhes principais do produto e indicações..."
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                Benefícios (Um por linha)
              </label>
              <textarea
                value={benefitsText}
                onChange={e => setBenefitsText(e.target.value)}
                disabled={submitting}
                rows={3}
                className="w-full p-3 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary rounded-sm font-sans"
                placeholder="Exemplo:&#10;Hidratação profunda sem pesar&#10;Repara barreira danificada"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                  Como usar
                </label>
                <textarea
                  value={howToUse}
                  onChange={e => setHowToUse(e.target.value)}
                  disabled={submitting}
                  rows={4}
                  className="w-full p-3 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary rounded-sm font-sans"
                  placeholder="Instruções de aplicação..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                  Ingredientes (Lista completa)
                </label>
                <textarea
                  value={ingredients}
                  onChange={e => setIngredients(e.target.value)}
                  disabled={submitting}
                  rows={4}
                  className="w-full p-3 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary rounded-sm font-sans"
                  placeholder="Lista de compostos químicos ou extratos naturais..."
                />
              </div>
            </div>
          </div>

          {/* SEO Metadata */}
          <div className="bg-white border border-border p-6 rounded-[4px] space-y-4 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary border-b border-neutral-100 pb-2">
              Motores de Busca (SEO)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                  SEO Título
                </label>
                <Input
                  type="text"
                  value={seoTitle}
                  onChange={e => setSeoTitle(e.target.value)}
                  disabled={submitting}
                  className="w-full text-sm"
                  placeholder="Auto-gerado a partir do nome se em branco"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                  Palavras-chave de Pesquisa (separadas por espaço)
                </label>
                <Input
                  type="text"
                  value={searchKeywords}
                  onChange={e => setSearchKeywords(e.target.value)}
                  disabled={submitting}
                  className="w-full text-sm"
                  placeholder="Ex: acne hidratante cosrx mucina"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                SEO Descrição
              </label>
              <textarea
                value={seoDescription}
                onChange={e => setSeoDescription(e.target.value)}
                disabled={submitting}
                rows={2}
                className="w-full p-3 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary rounded-sm font-sans"
                placeholder="Meta descrição de resultados de pesquisa (150-160 caracteres)..."
              />
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN (1 span): Pricing, Stock, Goals, and Status */}
        <div className="space-y-6">
          
          {/* Status & Guardar */}
          <div className="bg-white border border-border p-6 rounded-[4px] space-y-4 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary border-b border-neutral-100 pb-2">
              Estado & Publicação
            </h3>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                Estado do Produto
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as "draft" | "published" | "archived")}
                disabled={submitting}
                className="w-full h-10 px-3 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary rounded-sm font-sans"
              >
                <option value="draft">Rascunho (Privado)</option>
                <option value="published">Publicado (Público)</option>
                <option value="archived">Arquivado</option>
              </select>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                disabled={submitting}
                className="w-full h-10 text-xs font-semibold uppercase tracking-wider rounded-sm cursor-pointer"
              >
                {submitting ? "A gravar..." : submitLabel}
              </Button>
            </div>
          </div>

          {/* Preço e Stock */}
          <div className="bg-white border border-border p-6 rounded-[4px] space-y-4 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary border-b border-neutral-100 pb-2">
              Valores & Stock
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                  Preço (MZN) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  disabled={submitting}
                  required
                  className="w-full text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                  Preço Anterior (MZN)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={compareAtPrice}
                  onChange={e => setCompareAtPrice(e.target.value)}
                  disabled={submitting}
                  className="w-full text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                Quantidade em Stock *
              </label>
              <Input
                type="number"
                value={stockQuantity}
                onChange={e => setStockQuantity(e.target.value)}
                disabled={submitting}
                required
                className="w-full text-sm"
              />
            </div>
          </div>

          {/* Objectivos da Pele */}
          <div className="bg-white border border-border p-6 rounded-[4px] space-y-4 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary border-b border-neutral-100 pb-2">
              Objectivos da Pele
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {SKIN_GOALS.map(goal => {
                const checked = selectedGoals.includes(goal.slug);
                return (
                  <label key={goal.slug} className="flex items-center gap-2 cursor-pointer py-1 text-xs select-none">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleGoalCheckbox(goal.slug)}
                      disabled={submitting}
                      className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                    />
                    <span className="text-primary font-medium">{goal.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Imagens do Produto */}
          <div className="bg-white border border-border p-6 rounded-[4px] space-y-4 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary border-b border-neutral-100 pb-2">
              Galeria de Imagens
            </h3>

            {/* Upload form block */}
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                  Adicionar por URL
                </label>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    placeholder="https://..."
                    value={imageUrlInput}
                    onChange={e => setImageUrlInput(e.target.value)}
                    disabled={submitting}
                    className="flex-1 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    className="h-10 px-3 border border-border bg-neutral-50 hover:bg-neutral-100 text-xs font-semibold uppercase rounded-sm cursor-pointer text-primary"
                  >
                    Adicionar
                  </button>
                </div>
              </div>

              <div className="border-t border-dashed border-border pt-3">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                  Fazer upload de imagem
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
                    {uploadingImage ? "A carregar..." : "Clique ou arraste ficheiro (PNG/JPG)"}
                  </span>
                </div>
              </div>
            </div>

            {/* Images layout list */}
            {images.length > 0 && (
              <div className="space-y-2 border-t border-neutral-100 pt-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Imagens Activas ({images.length})</p>
                <div className="space-y-2">
                  {images.map((imgUrl, idx) => {
                    const isMain = idx === 0;
                    return (
                      <div key={idx} className="flex items-center gap-2 bg-neutral-50 p-2 border border-border rounded-sm">
                        <img src={imgUrl} alt="Thumbnail" className="h-8 w-8 object-cover rounded-sm border border-border shrink-0" />
                        <span className="text-[10px] truncate flex-1 text-muted-foreground">{imgUrl}</span>
                        
                        <div className="flex items-center gap-1 shrink-0">
                          {isMain ? (
                            <span className="text-[8px] font-bold uppercase bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-sm flex items-center gap-0.5">
                              <Check className="h-2 w-2" /> Principal
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetMainImage(idx)}
                              className="text-[9px] font-semibold hover:underline text-primary cursor-pointer"
                              title="Tornar principal"
                            >
                              Principal
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleMoveImage(idx, "up")}
                            disabled={idx === 0}
                            className="p-1 hover:bg-neutral-100 text-primary disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleMoveImage(idx, "down")}
                            disabled={idx === images.length - 1}
                            className="p-1 hover:bg-neutral-100 text-primary disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="p-1 hover:bg-red-50 text-red-600 rounded cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </form>
  );
}
