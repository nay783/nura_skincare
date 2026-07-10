"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Client-friendly Server Actions for admin products management.
 */

export async function importProductsAction() {
  try {
    const res = await fetch("/api/admin/products/import", {
      method: "POST",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erro na importação de produtos.");
    }

    return data;
  } catch (err: any) {
    console.error("Erro na importação:", err);
    throw new Error(err.message || "Erro na importação de produtos.");
  }
}

export async function updateProductStatusAction(
  productId: string, 
  status: "draft" | "published" | "archived"
) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error("Não autenticado");
  }

  // Verify permission
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, scopes")
    .eq("id", session.user.id)
    .single();

  const hasAccess = profile?.role === "master_admin" || 
    (Array.isArray(profile?.scopes) && profile.scopes.includes("products.publish"));

  if (!hasAccess) {
    throw new Error("Sem permissão para alterar estado do produto (products.publish em falta).");
  }

  // Update product status
  const { error } = await supabase
    .from("products")
    .update({ status })
    .eq("id", productId);

  if (error) {
    throw new Error(error.message);
  }

  // Log action
  await supabase.from("audit_logs").insert({
    admin_id: session.user.id,
    action: `product.${status}`,
    entity_type: "product",
    entity_id: productId,
    metadata: { status }
  });

  return { success: true };
}

export async function deleteProductAction(productId: string) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error("Não autenticado");
  }

  // Verify permission
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, scopes")
    .eq("id", session.user.id)
    .single();

  const hasAccess = profile?.role === "master_admin" || 
    (Array.isArray(profile?.scopes) && profile.scopes.includes("products.delete"));

  if (!hasAccess) {
    throw new Error("Sem permissão para eliminar produtos (products.delete em falta).");
  }

  // Delete product
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);

  if (error) {
    throw new Error(error.message);
  }

  // Log action
  await supabase.from("audit_logs").insert({
    admin_id: session.user.id,
    action: "product.deleted",
    entity_type: "product",
    entity_id: productId,
  });

  return { success: true };
}
