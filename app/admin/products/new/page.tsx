"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ProductForm from "@/components/admin/ProductForm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function AdminNewProductPage() {
  const router = useRouter();
  const supabase = createClient();
  const [errorMsg, setErrorMsg] = useState("");

  const handleCreateProduct = async (formData: any) => {
    setErrorMsg("");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setErrorMsg("Não autenticado.");
      return;
    }

    try {
      // 1. Destructure categoryId out to handle junction mapping
      const { categoryId, ...productData } = formData;

      // 2. Insert product row
      const { data: insertedProduct, error: insertError } = await supabase
        .from("products")
        .insert({
          ...productData,
          source_import: "manual"
        })
        .select()
        .single();

      if (insertError) {
        throw new Error("Erro ao criar produto: " + insertError.message);
      }

      if (insertedProduct) {
        // 3. Link Category Junction
        const { error: junctionError } = await supabase
          .from("product_category_junction")
          .insert({
            product_id: insertedProduct.id,
            category_id: categoryId
          });

        if (junctionError) {
          console.warn("Falha ao associar categoria:", junctionError.message);
        }

        // 4. Log Action
        await supabase.from("audit_logs").insert({
          admin_id: session.user.id,
          action: "product.created",
          entity_type: "product",
          entity_id: insertedProduct.id,
          metadata: { name: insertedProduct.name, status: insertedProduct.status }
        });
      }

      router.push("/admin/products");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Ocorreu um erro ao criar o produto.");
    }
  };

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
          <h1 className="text-2xl font-serif text-primary font-medium">Novo Produto</h1>
          <p className="text-xs text-muted-foreground">Adicione um novo produto ao catálogo da Nura.</p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border-l-2 border-red-500 text-red-700 text-xs rounded-sm">
          {errorMsg}
        </div>
      )}

      {/* Main product form */}
      <ProductForm 
        onSubmit={handleCreateProduct}
        submitLabel="Criar Produto"
      />
    </div>
  );
}
