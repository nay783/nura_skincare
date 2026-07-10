import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    const filePath = path.resolve(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      content.split(/\r?\n/).forEach((line) => {
        if (line.trim().startsWith("#") || !line.trim()) return;
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || "";
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
}

function normalizeBrand(brandName: string | null, productName: string): string {
  const text = `${brandName || ""} ${productName}`.toLowerCase();
  
  if (text.includes("cosrx")) return "COSRX";
  if (text.includes("joseon")) return "Beauty of Joseon";
  if (text.includes("vt cosmetics") || text.includes("vtcosmetics") || text.includes("vt ")) return "VT Cosmetics";
  if (text.includes("ample:n") || text.includes("amplen")) return "AMPLE:N";
  if (text.includes("numbuzin")) return "Numbuzin";
  if (text.includes("filligio")) return "Filligio";
  if (text.includes("medicube")) return "Medicube";
  if (text.includes("round lab") || text.includes("roundlab")) return "Round Lab";
  if (text.includes("some by mi") || text.includes("somebymi")) return "Some By Mi";
  if (text.includes("anua")) return "Anua";
  if (text.includes("skin1004") || text.includes("skin 1004")) return "Skin1004";
  if (text.includes("celimax")) return "Celimax";

  return brandName ? brandName.trim() : "K-Beauty";
}

interface ProductInput {
  name: string;
  description?: string | null;
  ingredients?: string | null;
  hashtags?: string[] | null;
}

function inferGoals(product: ProductInput): string[] {
  const text = `${product.name} ${product.description || ""} ${product.ingredients || ""} ${(product.hashtags || []).join(" ")}`.toLowerCase();
  
  const goalKeywords: Record<string, string[]> = {
    "hidratacao": ["hydration", "hidrat", "moisture", "barrier", "cream", "ampoule", "serum", "essence", "pele seca", "desidratada"],
    "acne": ["acne", "azelaic", "aha", "bha", "pha", "lha", "pore", "oily", "oleosidade", "borbulhas", "espinhas"],
    "manchas": ["manchas", "pigmentation", "tone", "brightening", "luminosidade", "azelaic", "vitamin c", "melasma", "hiperpigmentação"],
    "oleosidade": ["oil", "oily", "oleosidade", "sebum", "pore", "acne", "pele mista", "sebo"],
    "anti-idade": ["retinol", "retinal", "peptide", "collagen", "anti-age", "rugas", "firmeza", "elasticity", "linhas de expressão", "envelhecimento"],
    "textura": ["texture", "textura", "poros", "smooth", "exfoliating", "aha", "bha", "pha", "esfoliação"],
    "pele-sensivel": ["sensitive", "calming", "soothing", "barrier", "gentle", "sensível", "vermelhidão", "calmante", "irritação"],
    "luminosidade": ["glow", "brightening", "luminosidade", "vitamin c", "tone", "brilho", "radiante"]
  };

  const matchedGoals: string[] = [];
  for (const [goal, keywords] of Object.entries(goalKeywords)) {
    const hasKeyword = keywords.some(keyword => text.includes(keyword));
    if (hasKeyword) {
      matchedGoals.push(goal);
    }
  }

  return matchedGoals;
}

async function main() {
  console.log("====================================================");
  console.log("NURA SKINCARE - MAPEAMENTO DE MARCAS E OBJECTIVOS");
  console.log("====================================================");

  loadEnv();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("[Erro] Supabase URL ou Chave não configuradas.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch all products
  const { data: products, error: fetchError } = await supabase.from("products").select("*");
  if (fetchError || !products) {
    console.error("[Erro] Falha ao buscar produtos:", fetchError?.message);
    process.exit(1);
  }

  console.log(`[Info] Processando ${products.length} produtos...`);

  // Check columns present
  const hasSkinGoals = products.length > 0 && "skin_goals" in products[0];
  if (!hasSkinGoals) {
    console.log("\n[Aviso] Coluna 'skin_goals' não encontrada na tabela 'products'.");
    console.log("Como fallback, o script irá salvar os objectivos no array 'hashtags' com o prefixo 'goal:'.\n");
  }

  let updatedCount = 0;

  for (const product of products) {
    const originalBrand = product.brand;
    const normalizedBrand = normalizeBrand(originalBrand, product.name);
    const inferredGoals = inferGoals(product);

    console.log(`[Processando] ${product.name}`);
    console.log(`  -> Marca: "${originalBrand}" => "${normalizedBrand}"`);
    console.log(`  -> Objectivos: [${inferredGoals.join(", ")}]`);

    const updatePayload: Record<string, string | string[] | null> = {
      brand: normalizedBrand
    };

    if (hasSkinGoals) {
      updatePayload.skin_goals = inferredGoals;
    } else {
      // Fallback: merge into hashtags array, prefixing with 'goal:'
      const originalHashtags = (product.hashtags || []) as string[];
      const goalTags = inferredGoals.map(g => `goal:${g}`);
      // Remove any old goal: tags to prevent bloating
      const cleanHashtags = originalHashtags.filter(tag => !tag.startsWith("goal:"));
      updatePayload.hashtags = Array.from(new Set([...cleanHashtags, ...goalTags]));
    }

    const { error: updateError } = await supabase
      .from("products")
      .update(updatePayload)
      .eq("id", product.id);

    if (updateError) {
      console.error(`  [Erro] Falha ao atualizar produto ID ${product.id}:`, updateError.message);
    } else {
      updatedCount++;
    }
  }

  console.log("\n====================================================");
  console.log("PROCESSAMENTO CONCLUÍDO");
  console.log("====================================================");
  console.log(`Total de produtos analisados: ${products.length}`);
  console.log(`Atualizados com sucesso:      ${updatedCount}`);
  console.log("====================================================\n");
}

main();
