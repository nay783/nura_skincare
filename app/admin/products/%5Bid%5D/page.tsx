"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ProductForm from "@/components/admin/ProductForm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function AdminEditProductPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [productData, setProductData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function loadProduct() {
      if (!id) return;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/account");
        return;
      }

      // Fetch product
      const { data: prod, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        setErrorMsg("Erro ao carregar produto: " + error.message);
      } else if (!prod) {
        setErrorMsg("Produto não encontrado.");
      } else {
        setProductData(prod);
      }
      setLoading(false);
    }
    loadProduct();
  }, [id, supabase, router]);

  const handleUpdateProduct = async (formData: any) => {
    setErrorMsg("");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setErrorMsg("Não autenticado.");
      return;
    }

    try {
      // 1. Destructure categoryId out
      const { categoryId, ...productDataPayload } = formData;

      // 2. Update product
      const { error: updateError } = await supabase
        .from("products")
        .update(productDataPayload)
        .eq("id", id);

      if (updateError) {
        throw new Error("Erro ao atualizar produto: " + updateError.message);
      }

      // 3. Update Category Junction
      await supabase
        .from("product_category_junction")
        .delete()
        .eq("product_id", id);

      if (categoryId) {
        const { error: junctionError } = await supabase
          .from("product_category_junction")
          .insert({
            product_id: id,
            category_id: categoryId
          });

        if (junctionError) {
          console.warn("Falha ao atualizar categoria:", junctionError.message);
        }
      }

      // 4. Log Action
      await supabase.from("audit_logs").insert({
        admin_id: session.user.id,
        action: "product.updated",
        entity_type: "product",
        entity_id: id,
        metadata: { name: productDataPayload.name, status: productDataPayload.status }
      });

      router.push("/admin/products");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Ocorreu um erro ao atualizar o produto.");
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

  if (!productData && !loading) {
    return (
      <div className="p-8 text-center text-xs text-muted-foreground italic">
        {errorMsg || "Produto não encontrado."}
        <div className="mt-4">
          <Link href="/admin/products" className="text-primary hover:underline">
            Voltar para catálogo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Navigation */}
      <div className="flex items-center gap-2">
        <Link
          href="/admin/products"
          className="p-1.5 hover:bg-white rounded border border-border text-primary cursor-pointer transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-serif text-primary font-medium">Editar Produto</h1>
          <p className="text-xs text-muted-foreground">Ficha de edição: {productData.name}</p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border-l-2 border-red-500 text-red-700 text-xs rounded-sm">
          {errorMsg}
        </div>
      )}

      {/* Main Form */}
      <ProductForm
        initialData={productData}
        onSubmit={handleUpdateProduct}
        submitLabel="Gravar Alterações"
      />
    </div>
  );
}
