import fs from "fs";
import path from "path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

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

async function createBucket(supabase: SupabaseClient, name: string) {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error(`[Erro] Falha ao verificar buckets para ${name}:`, listError.message);
    return;
  }

  const exists = buckets.some((b) => b.name === name);
  if (!exists) {
    console.log(`[Storage] Bucket '${name}' não existe. Criando...`);
    const { error: createError } = await supabase.storage.createBucket(name, {
      public: true,
      fileSizeLimit: 5242880, // 5MB limit
    });
    if (createError) {
      console.error(`[Erro] Falha ao criar bucket ${name}:`, createError.message);
    } else {
      console.log(`[Storage] Bucket '${name}' criado com sucesso.`);
    }
  } else {
    console.log(`[Storage] Bucket '${name}' já existe.`);
  }
}

async function main() {
  console.log("====================================================");
  console.log("NURA SKINCARE - CONFIGURAÇÃO DE BUCKETS DE STORAGE");
  console.log("====================================================");

  loadEnv();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("[Erro] Supabase URL ou Chave não configuradas no ambiente.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  await createBucket(supabase, "payment-receipts");
  await createBucket(supabase, "support-attachments");
  await createBucket(supabase, "product-images");

  console.log("====================================================");
}

main();
