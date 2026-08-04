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

// Inline CSV parser
function parseCSV(content: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];
    
    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          cell += '"';
          i++; // Skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(cell);
        cell = "";
      } else if (char === "\n" || char === "\r") {
        row.push(cell);
        cell = "";
        if (row.length > 0 && (row.length > 1 || row[0] !== "")) {
          result.push(row);
        }
        row = [];
        if (char === "\r" && nextChar === "\n") {
          i++; // Skip \n
        }
      } else {
        cell += char;
      }
    }
  }
  
  if (cell || row.length > 0) {
    row.push(cell);
    result.push(row);
  }
  
  return result;
}

// Inline Slugify helper
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9\s-]/g, "") // Remove symbols
    .replace(/[\s-]+/g, "-") // Replace spaces/dashes with single dash
    .replace(/^-+|-+$/g, ""); // Trim dashes from ends
}

// Robust Media URL parser
function parseMediaUrls(mediaUrlsStr: string): string[] {
  if (!mediaUrlsStr) return [];
  const cleanStr = mediaUrlsStr.trim();
  if (!cleanStr) return [];

  let rawList: string[] = [];

  // 1. JSON Array format or Python-style single quoted array
  if (cleanStr.startsWith("[") && cleanStr.endsWith("]")) {
    try {
      const jsonFriendly = cleanStr.replace(/'/g, '"');
      const parsed = JSON.parse(jsonFriendly);
      if (Array.isArray(parsed)) {
        rawList = parsed.map(url => String(url).trim());
      }
    } catch {
      const stripped = cleanStr.slice(1, -1);
      rawList = stripped.split(",").map(url => url.trim().replace(/^["']|["']$/g, "").trim());
    }
  } 
  // 2. Comma separated
  else if (cleanStr.includes(",")) {
    rawList = cleanStr.split(",").map(url => url.trim().replace(/^["']|["']$/g, "").trim());
  } 
  // 3. Plain URL
  else {
    rawList = [cleanStr.replace(/^["']|["']$/g, "").trim()];
  }

  // Filter valid HTTP/HTTPS URLs, clean up, and remove duplicates
  const validList = rawList
    .filter(url => url.startsWith("http://") || url.startsWith("https://"))
    .filter(Boolean);

  return Array.from(new Set(validList));
}

// Remove emojis and price indicators from name
function cleanNameForMatching(name: string): string {
  let cleaned = name;
  cleaned = cleaned.replace(/\d+(?:[\s\.]\d+)*\s*(?:mt|mzn)/gi, "");
  cleaned = cleaned.replace(/(?:preço|preco|💰)\s*:?\s*\d+(?:[\s\.]\d+)*/gi, "");
  cleaned = cleaned.replace(/💰/g, "");
  cleaned = cleaned.replace(/[\s\p{Emoji}\p{Extended_Pictographic}💰✨🌿🌸⭐💎🔥⚡📍📞📧🪞🧼🧴.,\-—–:_]+/gu, " ").trim();
  return cleaned.toLowerCase().replace(/\s+/g, " ");
}

async function main() {
  console.log("====================================================");
  console.log("NURA SKINCARE - REGISTRO E MIGRAÇÃO DE IMAGENS");
  console.log("====================================================");

  loadEnv();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("[Erro] SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_URL não configurados.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Create or verify the public bucket "product-images"
  console.log("[Storage] Verificando bucket 'product-images'...");
  try {
    const { data: buckets, error: listBucketsError } = await supabase.storage.listBuckets();
    if (listBucketsError) {
      throw new Error(listBucketsError.message);
    }
    const bucketExists = buckets.some(b => b.name === "product-images");
    if (!bucketExists) {
      console.log("[Storage] Bucket 'product-images' não encontrado. Criando...");
      const { error: createBucketError } = await supabase.storage.createBucket("product-images", {
        public: true,
        fileSizeLimit: 5242880,
      });
      if (createBucketError) {
        throw new Error(createBucketError.message);
      }
    }
    console.log("[Storage] Bucket 'product-images' verificado e pronto.");
  } catch (err) {
    console.error("[Erro] Falha ao configurar o bucket do Supabase Storage:", err);
    process.exit(1);
  }

  // 2. Load the source CSV
  const csvPath = path.resolve(process.cwd(), "data/imports/nura_products.csv");
  if (!fs.existsSync(csvPath)) {
    console.error(`[Erro] CSV de produtos não encontrado no caminho: ${csvPath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const csvRows = parseCSV(csvContent);
  if (csvRows.length <= 1) {
    console.error("[Erro] O CSV está vazio ou contém apenas cabeçalhos.");
    process.exit(1);
  }

  const headers = csvRows[0];
  const dataRows = csvRows.slice(1);
  
  // Filter strictly for Nura rows
  const nuraRows = dataRows.filter(row => row[0]?.trim() === "Nura Skincare / K-Beauty Shop");
  console.log(`[CSV] Total de linhas lidas: ${dataRows.length}`);
  console.log(`[CSV] Linhas da Nura Skincare: ${nuraRows.length}`);

  // 3. Fetch products from database
  console.log("[Database] Buscando produtos cadastrados...");
  let dbProducts: any[] = [];
  try {
    const { data, error: dbError } = await supabase.from("products").select("*");
    if (dbError) throw dbError;
    dbProducts = data || [];
  } catch (err) {
    console.error("[Erro] Falha ao conectar ao banco de dados do Supabase:", err);
    process.exit(1);
  }
  console.log(`[Database] Total de produtos no banco: ${dbProducts.length}`);

  // Report metrics
  let rowsRead = dataRows.length;
  let rowsMatched = 0;
  let matchedByPostId = 0;
  let matchedByUrl = 0;
  let matchedBySlug = 0;
  let matchedByName = 0;
  let imagesDownloaded = 0;
  let imagesUploaded = 0;
  let productsUpdated = 0;
  let alreadyMigrated = 0;
  let externalFailed = 0;
  let productsNoCsvMatch = 0;
  let productsStillNoImage = 0;
  let criticalErrorsCount = 0;

  const unresolvedProducts: any[] = [];

  for (const product of dbProducts) {
    let matchedRow: string[] | null = null;
    let matchType = "";

    // Step 5 matching priority:
    // 1. instagram_post_id = post_id
    if (product.instagram_post_id) {
      matchedRow = nuraRows.find(row => row[2]?.trim() === product.instagram_post_id) || null;
      if (matchedRow) {
        matchType = "post_id";
        matchedByPostId++;
      }
    }

    // 2. instagram_source_url = post_url
    if (!matchedRow && product.instagram_source_url) {
      matchedRow = nuraRows.find(row => row[3]?.trim() === product.instagram_source_url) || null;
      if (matchedRow) {
        matchType = "post_url";
        matchedByUrl++;
      }
    }

    // 3. slug match
    if (!matchedRow) {
      matchedRow = nuraRows.find(row => {
        // extract name from caption, slugify it and compare
        const rowCaption = row[5]?.trim() || "";
        const lines = rowCaption.split("\n").map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length > 0) {
          const rowSlug = slugify(lines[0]);
          return rowSlug === product.slug;
        }
        return false;
      }) || null;
      if (matchedRow) {
        matchType = "slug";
        matchedBySlug++;
      }
    }

    // 4. name matching
    if (!matchedRow) {
      const dbCleanName = cleanNameForMatching(product.name);
      matchedRow = nuraRows.find(row => {
        const rowCaption = row[5]?.trim() || "";
        const lines = rowCaption.split("\n").map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length > 0) {
          const rowCleanName = cleanNameForMatching(lines[0]);
          return rowCleanName !== "" && dbCleanName.includes(rowCleanName);
        }
        return false;
      }) || null;
      if (matchedRow) {
        matchType = "name";
        matchedByName++;
      }
    }

    if (!matchedRow) {
      productsNoCsvMatch++;
      if (!product.main_image_url && (!product.images || product.images.length === 0)) {
        productsStillNoImage++;
      }
      unresolvedProducts.push({
        id: product.id,
        name: product.name,
        source_post_id: product.instagram_post_id || "N/A",
        reason: "Nenhuma linha correspondente encontrada no CSV."
      });
      continue;
    }

    rowsMatched++;

    // Parse CSV media URLs
    const csvMediaUrls = parseMediaUrls(matchedRow[7] || "");
    if (csvMediaUrls.length === 0) {
      unresolvedProducts.push({
        id: product.id,
        name: product.name,
        source_post_id: product.instagram_post_id || "N/A",
        reason: "Linha correspondente no CSV não contém URLs de media válidas."
      });
      if (!product.main_image_url && (!product.images || product.images.length === 0)) {
        productsStillNoImage++;
      }
      continue;
    }

    // Check if we already have a permanent storage image
    const hasPermanentMain = product.main_image_url && product.main_image_url.includes("/storage/v1/object/public/product-images/");
    if (hasPermanentMain) {
      alreadyMigrated++;
      continue;
    }

    // Try downloading the URLs in order
    let uploadedUrl: string | null = null;
    let downloadErrors: string[] = [];

    for (let i = 0; i < csvMediaUrls.length; i++) {
      const url = csvMediaUrls[i];
      console.log(`[Media] Baixando imagem para ${product.name} (Tentativa ${i + 1}/${csvMediaUrls.length})...`);
      
      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8"
          },
          redirect: "follow"
        });

        if (!response.ok) {
          throw new Error(`HTTP Status ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.startsWith("image/")) {
          throw new Error(`Content-Type inválido: ${contentType}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        if (buffer.length === 0) {
          throw new Error("Resposta de imagem vazia (0 bytes).");
        }

        imagesDownloaded++;

        // Determine extension
        let extension = "jpg";
        if (contentType.includes("png")) extension = "png";
        if (contentType.includes("webp")) extension = "webp";
        if (contentType.includes("gif")) extension = "gif";

        const uploadPath = `products/${product.id}/main.${extension}`;
        console.log(`[Storage] Fazendo upload para product-images/${uploadPath}...`);
        
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(uploadPath, buffer, {
            contentType,
            upsert: true
          });

        if (uploadError) {
          throw new Error(`Falha no upload do Supabase: ${uploadError.message}`);
        }

        imagesUploaded++;

        const { data: { publicUrl } } = supabase.storage
          .from("product-images")
          .getPublicUrl(uploadPath);

        uploadedUrl = publicUrl;
        break; // Success, stop trying other URLs

      } catch (err: any) {
        const msg = err.message || String(err);
        console.warn(`  -> Falha na URL: ${url.substring(0, 60)}... Erro: ${msg}`);
        downloadErrors.push(msg);
      }
    }

    if (uploadedUrl) {
      try {
        console.log(`[Database] Atualizando registro de ${product.name}...`);
        const { error: updateError } = await supabase
          .from("products")
          .update({
            main_image_url: uploadedUrl,
            images: [uploadedUrl, ...csvMediaUrls],
            external_images: csvMediaUrls
          })
          .eq("id", product.id);

        if (updateError) throw updateError;
        productsUpdated++;
      } catch (err: any) {
        console.error(`[Erro] Erro ao atualizar banco para ${product.name}:`, err.message || err);
        criticalErrorsCount++;
      }
    } else {
      externalFailed++;
      if (!product.main_image_url && (!product.images || product.images.length === 0)) {
        productsStillNoImage++;
      }
      unresolvedProducts.push({
        id: product.id,
        name: product.name,
        source_post_id: product.instagram_post_id || "N/A",
        reason: `Falha ao baixar todas as URLs da imagem. Erros: ${downloadErrors.join("; ")}`
      });
    }
  }

  // Print Report
  console.log("\n====================================================");
  console.log("RELATÓRIO DE MIGRAÇÃO DE IMAGENS (NURA SKINCARE)");
  console.log("====================================================");
  console.log(`Nura CSV linhas lidas:                  ${nuraRows.length}`);
  console.log(`Nura linhas combinadas:                 ${rowsMatched}`);
  console.log(`Produtos analisados no banco:           ${dbProducts.length}`);
  console.log(`Produtos combinados por post ID:        ${matchedByPostId}`);
  console.log(`Produtos combinados por URL:            ${matchedByUrl}`);
  console.log(`Produtos combinados por Slug:           ${matchedBySlug}`);
  console.log(`Produtos combinados por Nome:           ${matchedByName}`);
  console.log(`Imagens baixadas:                       ${imagesDownloaded}`);
  console.log(`Imagens carregadas no Storage:          ${imagesUploaded}`);
  console.log(`Produtos atualizados com sucesso:       ${productsUpdated}`);
  console.log(`Já estavam migrados:                    ${alreadyMigrated}`);
  console.log(`Falhas de download de URLs externas:    ${externalFailed}`);
  console.log(`Produtos sem linha correspondente:     ${productsNoCsvMatch}`);
  console.log(`Produtos ainda sem imagem disponível:   ${productsStillNoImage}`);
  console.log(`Erros críticos no banco:                ${criticalErrorsCount}`);
  console.log("====================================================");

  if (unresolvedProducts.length > 0) {
    console.log("\nPRODUTOS NÃO MIGRADOS / NÃO RESOLVIDOS:");
    unresolvedProducts.forEach((item, idx) => {
      console.log(`${idx + 1}. ID: ${item.id} | ${item.name} | Post: ${item.source_post_id} | Motivo: ${item.reason}`);
    });
  }

  // Exit code check
  if (criticalErrorsCount > 0 || productsStillNoImage > 0) {
    console.error("\n[Falha] Existem erros críticos ou produtos pendentes de imagens.");
    process.exit(1);
  } else {
    console.log("\n[Sucesso] Todos os produtos possuem imagens válidas e permanentes.");
    process.exit(0);
  }
}

main();
