import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createClient } from "@/lib/supabase/server";
import { importCatalogFromCSV } from "@/lib/imports/product-importer";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Verify permission
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, scopes")
      .eq("id", user.id)
      .single();

    const hasAccess = profile?.role === "master_admin" || 
      (Array.isArray(profile?.scopes) && profile.scopes.includes("products.create"));

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Não tem permissão para importar produtos (products.create em falta)." },
        { status: 403 }
      );
    }

    const csvPath = path.resolve(process.cwd(), "data/imports/nura_products.csv");
    if (!fs.existsSync(csvPath)) {
      return NextResponse.json(
        { error: `Ficheiro CSV não encontrado em: ${csvPath}` },
        { status: 404 }
      );
    }

    const csvContent = fs.readFileSync(csvPath, "utf-8");
    
    // Trigger the import pipeline
    const report = await importCatalogFromCSV(supabase, csvContent, {
      overwriteExisting: true
    });

    // Log the action to audit logs
    await supabase.from("audit_logs").insert({
      admin_id: user.id,
      action: "product.imported",
      entity_type: "product",
      entity_id: "csv-batch",
      metadata: { 
        rowsRead: report.rowsRead,
        productsCreated: report.productsCreated,
        productsUpdated: report.productsUpdated,
        errors: report.errors
      }
    });

    return NextResponse.json(report);
  } catch (err: any) {
    console.error("Erro na importação:", err);
    return NextResponse.json(
      { error: err.message || "Erro na importação de produtos." },
      { status: 500 }
    );
  }
}
