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

async function main() {
  console.log("====================================================");
  console.log("NURA SKINCARE - MIGRAÇÃO DE IMAGENS EXTERNAS");
  console.log("====================================================");

  loadEnv();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("[Erro] Supabase URL ou Chave não configuradas no ambiente.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Create or verify the public bucket "product-images"
  console.log("[Storage] Verificando bucket 'product-images'...");
  const { data: buckets, error: listBucketsError } = await supabase.storage.listBuckets();
  if (listBucketsError) {
    console.error("[Erro] Falha ao verificar buckets:", listBucketsError.message);
    process.exit(1);
  }

  const bucketExists = buckets.some(b => b.name === "product-images");
  if (!bucketExists) {
    console.log("[Storage] Bucket 'product-images' não existe. Criando...");
    const { error: createBucketError } = await supabase.storage.createBucket("product-images", {
      public: true,
      fileSizeLimit: 5242880, // 5MB limit
    });
    if (createBucketError) {
      console.error("[Erro] Falha ao criar bucket:", createBucketError.message);
      process.exit(1);
    }
    console.log("[Storage] Bucket 'product-images' criado com sucesso.");
  } else {
    console.log("[Storage] Bucket 'product-images' já existe.");
  }

  // 2. Fetch products
  console.log("[Database] Buscando produtos...");
  const { data: products, error: fetchError } = await supabase
    .from("products")
    .select("*");

  if (fetchError || !products) {
    console.error("[Erro] Falha ao buscar produtos:", fetchError?.message);
    process.exit(1);
  }

  // Check columns present
  const hasMainImageUrl = products.length > 0 && "main_image_url" in products[0];
  if (!hasMainImageUrl) {
    console.log("\n[Aviso] Coluna 'main_image_url' não encontrada na tabela 'products'.");
    console.log("Por favor, execute o arquivo de migração SQL:");
    console.log("  ALTER TABLE products ADD COLUMN IF NOT EXISTS main_image_url text, ADD COLUMN IF NOT EXISTS external_images text[];");
    console.log("O script continuará salvando o link do storage na primeira posição do array 'images' como fallback.\n");
  }

  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const product of products) {
    const originalImages = (product.images || []) as string[];
    const sourceImageUrl = originalImages[0] || null;

    if (!sourceImageUrl || !sourceImageUrl.startsWith("http")) {
      console.log(`[Skipped] ${product.name} (Imagem já local ou sem imagem: ${sourceImageUrl})`);
      skippedCount++;
      continue;
    }

    // Ignore if it's already uploaded to our supabase storage
    if (sourceImageUrl.includes("/storage/v1/object/public/product-images/")) {
      console.log(`[Skipped] ${product.name} (Já está no Supabase Storage)`);
      skippedCount++;
      continue;
    }

    console.log(`[Migrando] ${product.name}...`);
    console.log(`  -> URL Original: ${sourceImageUrl.substring(0, 80)}...`);

    try {
      // Download the image
      const response = await fetch(sourceImageUrl);
      if (!response.ok) {
        throw new Error(`Falha ao baixar imagem: HTTP ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get("content-type") || "image/jpeg";

      // Upload to storage
      const storagePath = `products/${product.slug}/main.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(storagePath, buffer, {
          contentType,
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Falha no upload para o storage: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(storagePath);

      console.log(`  -> URL Pública: ${publicUrl}`);

      // Update database row
      if (hasMainImageUrl) {
        const { error: updateError } = await supabase
          .from("products")
          .update({
            main_image_url: publicUrl,
            images: [publicUrl],
            external_images: originalImages
          })
          .eq("id", product.id);

        if (updateError) {
          throw new Error(`Erro ao atualizar banco: ${updateError.message}`);
        }
      } else {
        // Fallback: put it in the images array first
        const updatedImages = [publicUrl, ...originalImages.filter(img => img !== sourceImageUrl)];
        const { error: updateError } = await supabase
          .from("products")
          .update({
            images: updatedImages
          })
          .eq("id", product.id);

        if (updateError) {
          throw new Error(`Erro ao atualizar array de images: ${updateError.message}`);
        }
      }

      console.log(`[Sucesso] ${product.name} migrado com sucesso.`);
      migratedCount++;

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Erro] Falha ao migrar ${product.name}:`, msg);
      errorCount++;
    }
  }

  console.log("\n====================================================");
  console.log("MIGRAÇÃO DE IMAGENS CONCLUÍDA");
  console.log("====================================================");
  console.log(`Total de produtos analisados: ${products.length}`);
  console.log(`Migrados com sucesso:         ${migratedCount}`);
  console.log(`Pulados (já locais/etc):      ${skippedCount}`);
  console.log(`Erros de migração:            ${errorCount}`);
  console.log("====================================================\n");
}

main();
