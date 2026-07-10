import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { importCatalogFromCSV } from "../lib/imports/product-importer";

// ====================================================
// Zero-Dependency Environment Variable Loader
// ====================================================
function loadEnv() {
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    const filePath = path.resolve(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      console.log(`[Importer] Carregando variáveis de ambiente de ${file}`);
      const content = fs.readFileSync(filePath, "utf-8");
      content.split(/\r?\n/).forEach((line) => {
        // Skip comments and empty lines
        if (line.trim().startsWith("#") || !line.trim()) return;
        
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || "";
          
          // Strip quotes if present
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          } else if (value.startsWith("'") && value.endsWith("'")) {
            value = value.slice(1, -1);
          }
          process.env[key] = value.trim();
        }
      });
      return;
    }
  }
  console.warn("[Importer] Aviso: Nenhum ficheiro .env ou .env.local encontrado.");
}

async function main() {
  console.log("====================================================");
  console.log("NURA SKINCARE - IMPORTADOR DE PRODUTOS");
  console.log("====================================================");

  // Load configuration
  loadEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  // Use service_role key to bypass RLS since this is an administrative seeding script
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("[Erro] Supabase URL ou Chave não configuradas no ambiente.");
    console.error("Por favor, configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  // Parse command line flags
  const publishDev = process.argv.includes("--publish-dev");
  if (publishDev) {
    console.log("[Opção] --publish-dev ativo: Produtos válidos e prontos para demonstração serão marcados como PUBLISHED.");
  } else {
    console.log("[Opção] Modo padrão: Todos os novos produtos importados serão salvos como DRAFT.");
  }

  // Define input file path
  const csvPath = path.resolve(process.cwd(), "data/imports/nura_products.csv");
  if (!fs.existsSync(csvPath)) {
    console.error(`[Erro] Ficheiro CSV de importação não encontrado em: ${csvPath}`);
    process.exit(1);
  }

  console.log(`[Info] Lendo catálogo de: ${csvPath}`);
  const csvContent = fs.readFileSync(csvPath, "utf-8");

  console.log("[Info] Inicializando cliente Supabase...");
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("[Info] Processando importação / atualização de dados...");

  try {
    const report = await importCatalogFromCSV(supabase, csvContent, {
      publishDevProducts: publishDev,
      overwriteExisting: true // Always overwrite existing rows to fix wrong prices/names/images
    });

    // Query database for final stats to print debug log
    const { data: dbProducts } = await supabase.from("products").select("status, images");
    const totalPublished = dbProducts?.filter(p => p.status === "published").length || 0;
    const totalDraft = dbProducts?.filter(p => p.status === "draft").length || 0;
    const withImages = dbProducts?.filter(p => p.images && p.images.length > 0 && p.images[0] !== "").length || 0;
    const withoutImages = (dbProducts?.length || 0) - withImages;

    console.log("\n====================================================");
    console.log("RELATÓRIO DE DEPURACÃO DA IMPORTAÇÃO");
    console.log("====================================================");
    console.log(`CSV rows read:                 ${report.rowsRead}`);
    console.log(`Rows for Nura:                 ${report.rowsMatchingBusiness}`);
    console.log(`Rows with price:               ${report.rowsWithPrice}`);
    console.log(`Products imported:             ${report.productsCreated}`);
    console.log(`Products updated:              ${report.productsUpdated}`);
    console.log(`Products with images:          ${withImages}`);
    console.log(`Products without images:       ${withoutImages}`);
    console.log(`Published products:            ${totalPublished}`);
    console.log(`Draft products:                ${totalDraft}`);
    console.log(`Storefront products returned:  ${totalPublished}`);
    console.log("====================================================\n");

    // Print details of successfully imported/updated items
    const successDetails = report.details.filter(d => d.status === "imported" || d.status === "updated");
    if (successDetails.length > 0) {
      console.log("Produtos Processados:");
      successDetails.forEach(d => {
        const opTag = d.status === "updated" ? "ATUALIZADO" : "CRIADO";
        console.log(`  - [${opTag}] ${d.name} (${d.price.toFixed(2)} MT)`);
      });
      console.log("");
    }

    // Print error details if any occurred
    const errorDetails = report.details.filter(d => d.status === "error");
    if (errorDetails.length > 0) {
      console.error("Erros encontrados:");
      errorDetails.forEach(d => {
        console.error(`  - [ERRO] ${d.name}: ${d.reason}`);
      });
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Erro Fatal] Falha durante o processamento da importação:", message);
    process.exit(1);
  }
}

main();
