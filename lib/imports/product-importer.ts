import { slugify } from "@/lib/utils";
import { SupabaseClient } from "@supabase/supabase-js";

export interface ImportReportItem {
  name: string;
  price: number;
  status: "imported" | "updated" | "duplicate" | "error" | "skipped";
  reason?: string;
}

export interface ImportReport {
  rowsRead: number;
  businessFiltered: string;
  rowsMatchingBusiness: number;
  rowsWithPrice: number;
  productsCreated: number;
  productsUpdated: number;
  productsSkipped: number;
  invalidNames: number;
  invalidPrices: number;
  imagesFound: number;
  imagesMissing: number;
  duplicatesSkipped: number;
  errors: number;
  details: ImportReportItem[];
}

export interface ImportOptions {
  publishDevProducts?: boolean;
  overwriteExisting?: boolean;
}

const K_BEAUTY_BRANDS = [
  "COSRX", "Beauty of Joseon", "Round Lab", "Some By Mi", "Anua", 
  "Skin1004", "Purito", "Laneige", "Sulwhasoo", "Innisfree", 
  "Etude House", "Etude", "Klairs", "Dear, Klairs", "I'm From", 
  "Axis-Y", "Isntree", "Haruharu Wonder", "Haruharu", "Tocobo",
  "Neogen", "Mediheal", "Abib", "Dr. Jart+", "Dr. Jart", "Missha",
  "The Face Shop", "Nature Republic", "Banila Co", "Banila"
];

/**
 * Dependency-free CSV state machine parser that supports quoted columns with inner newlines and commas.
 */
export function parseCSV(content: string): string[][] {
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

/**
 * Normalizes all formats of media_urls (plain string, JSON array, single quotes, comma separated) into a clean string array.
 */
export function parseMediaUrls(mediaUrlsStr: string): string[] {
  if (!mediaUrlsStr) return [];
  const cleanStr = mediaUrlsStr.trim();
  if (!cleanStr) return [];

  // 1. If it's a JSON array or stringified array (starts with [ and ends with ])
  if (cleanStr.startsWith("[") && cleanStr.endsWith("]")) {
    try {
      // Replace single quotes with double quotes to make it valid JSON
      const jsonFriendly = cleanStr.replace(/'/g, '"');
      const parsed = JSON.parse(jsonFriendly);
      if (Array.isArray(parsed)) {
        return parsed.map(url => String(url).trim()).filter(Boolean);
      }
    } catch {
      // Fallback manual parsing: slice off [ and ], split by comma
      const stripped = cleanStr.slice(1, -1);
      return stripped
        .split(",")
        .map(url => url.trim().replace(/^["']|["']$/g, "").trim())
        .filter(Boolean);
    }
  }

  // 2. If it contains commas but no brackets, split by comma
  if (cleanStr.includes(",")) {
    return cleanStr
      .split(",")
      .map(url => url.trim().replace(/^["']|["']$/g, "").trim())
      .filter(Boolean);
  }

  // 3. Single plain URL
  return [cleanStr.replace(/^["']|["']$/g, "").trim()];
}

/**
 * Scans text fields to extract pricing in Mozambican Meticais (MT / MZN).
 * Rules:
 * - 3000mt must become 3000
 * - 2.600mt must become 2600
 * - 3 200mt must become 3200
 * - Do not divide prices by 10 or 100.
 */
export function detectPrice(caption: string, hashtags: string = "", topComments: string = ""): number | null {
  const combinedText = `${caption} ${hashtags} ${topComments}`;
  
  // Pattern 1: Number followed by MT or MZN (e.g. "3000mt", "2.600 mt", "3 200 MT")
  const pattern1 = /(\d+(?:[\s\.]\d+)*)\s*(?:mt|mzn)/i;
  const match1 = combinedText.match(pattern1);
  if (match1 && match1[1]) {
    const cleanPriceStr = match1[1].replace(/[\s\.]/g, "");
    const price = parseFloat(cleanPriceStr);
    if (!isNaN(price) && price > 0) {
      return price;
    }
  }

  // Pattern 2: Currency keywords followed by number (e.g. "💰3000", "Preço: 2.600", "MZN 3200")
  const pattern2 = /(?:mzn|preço|preco|💰)\s*:?\s*(\d+(?:[\s\.]\d+)*)/i;
  const match2 = combinedText.match(pattern2);
  if (match2 && match2[1]) {
    const cleanPriceStr = match2[1].replace(/[\s\.]/g, "");
    const price = parseFloat(cleanPriceStr);
    if (!isNaN(price) && price > 0) {
      return price;
    }
  }
  
  return null;
}

/**
 * Searches the text to detect the brand from a predefined list of skincare companies.
 */
export function detectBrand(text: string): string {
  const upperText = text.toUpperCase();
  for (const brand of K_BEAUTY_BRANDS) {
    if (upperText.includes(brand.toUpperCase())) {
      return brand;
    }
  }
  return "K-Beauty";
}

/**
 * Classifies a product into one of the seeded categories based on text keywords.
 */
export function classifyCategory(text: string): { id: string; slug: string; name: string } {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes("cleanse") || lowerText.includes("limpeza") || lowerText.includes("gel de limpeza") || lowerText.includes("sabonete") || lowerText.includes("óleo de limpeza") || lowerText.includes("cleansing oil")) {
    return { id: "b27abfb2-ce37-4d7a-8fbb-574944ecbb01", slug: "limpeza", name: "Limpeza" };
  }
  
  if (lowerText.includes("toner") || lowerText.includes("tónico") || lowerText.includes("tonico") || lowerText.includes("essence") || lowerText.includes("essência") || lowerText.includes("essencia")) {
    return { id: "b27abfb2-ce37-4d7a-8fbb-574944ecbb02", slug: "tonicos-essencias", name: "Tónicos & Essências" };
  }
  
  if (lowerText.includes("serum") || lowerText.includes("sérum") || lowerText.includes("ampoule") || lowerText.includes("ampola") || lowerText.includes("tratamento") || lowerText.includes("retinol") || lowerText.includes("peeling")) {
    return { id: "b27abfb2-ce37-4d7a-8fbb-574944ecbb03", slug: "seruns-tratamentos", name: "Séruns & Tratamentos" };
  }
  
  if (lowerText.includes("sun") || lowerText.includes("solar") || lowerText.includes("protetor") || lowerText.includes("sunscreen") || lowerText.includes("spf")) {
    return { id: "b27abfb2-ce37-4d7a-8fbb-574944ecbb05", slug: "protetores-solares", name: "Protetores Solares" };
  }
  
  // Default to Moisturizers
  return { id: "b27abfb2-ce37-4d7a-8fbb-574944ecbb04", slug: "hidratantes", name: "Hidratantes" };
}

/**
 * Extracts and cleans the first valid line of the caption to serve as the product name.
 * Excludes price-only strings and defaults to a post reference if invalid.
 */
export function extractProductName(caption: string, postId: string = ""): { name: string; isFallback: boolean } {
  const lines = caption.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) {
    return { name: `Produto Nura Skincare #${postId || "curado"}`, isFallback: true };
  }
  
  // Find the first line that isn't just a price marker
  let nameLine = "";
  for (const line of lines) {
    const cleanLine = line
      .replace(/[\s\p{Emoji}\p{Extended_Pictographic}💰✨🌿🌸⭐💎🔥⚡📍📞📧🪞🧼🧴.]/gu, "")
      .trim()
      .toLowerCase();
    
    const isPriceOnly = 
      cleanLine === "" || 
      cleanLine === "mt" || 
      cleanLine === "mzn" || 
      cleanLine === "preço" || 
      cleanLine === "preco" || 
      /^\d+$/.test(cleanLine) || 
      /^\d+mt$/i.test(cleanLine) || 
      /^\d+mzn$/i.test(cleanLine) ||
      cleanLine.includes("preço") && cleanLine.replace("preço", "").replace("mt", "").trim() === "" ||
      cleanLine.includes("preco") && cleanLine.replace("preco", "").replace("mt", "").trim() === "";

    if (!isPriceOnly && line.length > 2) {
      nameLine = line;
      break;
    }
  }

  if (!nameLine) {
    nameLine = lines[0];
  }

  let name = nameLine;

  // Remove price indicators
  name = name.replace(/\d+(?:[\s\.]\d+)*\s*(?:mt|mzn)/gi, "");
  name = name.replace(/(?:preço|preco|💰)\s*:?\s*\d+(?:[\s\.]\d+)*/gi, "");
  name = name.replace(/💰/g, "");

  // Strip emojis and punctuation bounds
  name = name.replace(/^[\s\p{Emoji}\p{Extended_Pictographic}💰✨🌿🌸⭐💎🔥⚡📍📞📧🪞🧼🧴.,\-—–:_]+/gu, "").trim();
  name = name.replace(/[\s\p{Emoji}\p{Extended_Pictographic}💰✨🌿🌸⭐💎🔥⚡📍📞📧🪞🧼🧴.,\-—–:_]+$/gu, "").trim();
  name = name.replace(/^["'«“‘]+|["'»”’]+$/g, "").trim();

  // Validate the name structure
  const testVal = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!name || testVal === "" || testVal === "mt" || testVal === "mzn" || /^\d+$/.test(testVal)) {
    return { name: `Produto Nura Skincare #${postId || "curado"}`, isFallback: true };
  }

  if (name.length > 100) {
    name = name.substring(0, 97) + "...";
  }

  return { name, isFallback: false };
}

/**
 * Extracts the first 2-3 sentences of a caption to serve as a short description.
 */
export function extractShortDescription(caption: string): string {
  const cleanText = caption.replace(/[\n\r]+/g, " ").trim();
  const sentences = cleanText.match(/[^.!?]+[.!?]+/g);
  if (!sentences || sentences.length === 0) {
    return cleanText.substring(0, 150) + (cleanText.length > 150 ? "..." : "");
  }
  return sentences.slice(0, 2).join(" ").trim();
}

/**
 * Runs the complete catalog import pipeline using the provided Supabase client and CSV string content.
 */
export async function importCatalogFromCSV(
  supabaseClient: SupabaseClient, 
  csvContent: string,
  options: ImportOptions = {}
): Promise<ImportReport> {
  const parsedRows = parseCSV(csvContent);
  
  const report: ImportReport = {
    rowsRead: 0,
    businessFiltered: "Nura Skincare / K-Beauty Shop",
    rowsMatchingBusiness: 0,
    rowsWithPrice: 0,
    productsCreated: 0,
    productsUpdated: 0,
    productsSkipped: 0,
    invalidNames: 0,
    invalidPrices: 0,
    imagesFound: 0,
    imagesMissing: 0,
    duplicatesSkipped: 0,
    errors: 0,
    details: []
  };

  if (parsedRows.length <= 1) {
    return report;
  }

  const dataRows = parsedRows.slice(1);
  report.rowsRead = dataRows.length;

  for (const row of dataRows) {
    try {
      const businessName = row[0]?.trim();
      const platform = row[1]?.trim() || "instagram";
      const postId = row[2]?.trim();
      const postUrl = row[3]?.trim();
      const publishedAt = row[4]?.trim();
      const caption = row[5]?.trim() || "";
      const hashtagsStr = row[6]?.trim() || "";
      const mediaUrlsStr = row[7]?.trim() || "";
      const topComments = row[11]?.trim() || "";

      // 1. Business name validation filter
      if (businessName !== report.businessFiltered) {
        report.productsSkipped++;
        report.details.push({
          name: caption.substring(0, 20) + "...",
          price: 0,
          status: "skipped",
          reason: `Negócio diferente: ${businessName || "Sem Nome"}`
        });
        continue;
      }
      report.rowsMatchingBusiness++;

      // 2. Price Detection
      const price = detectPrice(caption, hashtagsStr, topComments);
      if (price === null) {
        report.invalidPrices++;
        report.productsSkipped++;
        report.details.push({
          name: caption.substring(0, 20) + "...",
          price: 0,
          status: "skipped",
          reason: "Sem preço legível"
        });
        continue;
      }
      report.rowsWithPrice++;

      // 3. Name & Brand Extraction
      const nameExtraction = extractProductName(caption, postId);
      const name = nameExtraction.name;
      if (nameExtraction.isFallback) {
        report.invalidNames++;
      }
      const brand = detectBrand(caption);

      // 4. Images details validation (Normalize URL formats)
      const images = parseMediaUrls(mediaUrlsStr);
      if (images.length > 0 && images[0] !== "") {
        report.imagesFound++;
      } else {
        report.imagesMissing++;
      }

      const hashtags = hashtagsStr ? hashtagsStr.split(",").map(t => t.trim().replace("#", "")) : [];
      
      let baseSlug = slugify(name);
      if (!baseSlug) baseSlug = `produto-${postId || Math.random().toString(36).substring(7)}`;

      // 5. Check if row exists in database already
      let existingProduct = null;
      if (postId) {
        const { data } = await supabaseClient
          .from("products")
          .select("id, slug, status, stock_quantity")
          .eq("instagram_post_id", postId)
          .maybeSingle();
        existingProduct = data;
      }

      if (!existingProduct) {
        const { data } = await supabaseClient
          .from("products")
          .select("id, slug, status, stock_quantity")
          .eq("slug", baseSlug)
          .maybeSingle();
        existingProduct = data;
      }

      // Overwrite/Update logic
      const isDuplicate = !!existingProduct;
      const shouldOverwrite = options.overwriteExisting && isDuplicate;

      if (existingProduct && !shouldOverwrite) {
        report.duplicatesSkipped++;
        report.details.push({
          name,
          price,
          status: "duplicate",
          reason: `Duplicado: ${existingProduct.slug}`
        });
        continue;
      }

      // Build target status and stock
      // Rule: Keep existing status unless explicitly changed via publish options
      const hasValidImage = images.length > 0 && images[0] !== "";
      const isDemoReady = !nameExtraction.isFallback && price > 0 && hasValidImage;
      
      let targetStatus: "draft" | "published" = existingProduct ? existingProduct.status : "draft";
      let targetStock = existingProduct ? existingProduct.stock_quantity : 0;

      if (options.publishDevProducts && isDemoReady) {
        targetStatus = "published";
        targetStock = 15; // Set positive stock for storefront preview
      }

      const shortDescription = extractShortDescription(caption);
      const seoTitle = `${name} | Nura Skincare`;
      const seoDescription = shortDescription.substring(0, 155).trim();
      const searchKeywords = `${name} ${brand} ${hashtags.join(" ")}`.toLowerCase();
      const category = classifyCategory(caption);

      const cleanPostId = postId ? postId.replace(/[^a-zA-Z0-9]/g, "").slice(-6) : Math.random().toString(36).substring(7).toUpperCase();
      const sku = `IMP-${brand.substring(0, 3).toUpperCase()}-${cleanPostId}`;

      const productPayload = {
        name,
        slug: baseSlug,
        description: caption,
        price,
        compare_at_price: null,
        sku,
        stock_quantity: targetStock,
        status: targetStatus,
        images,
        benefits: [shortDescription],
        ingredients: "",
        how_to_use: "",
        source_import: "instagram",
        brand,
        instagram_post_id: postId,
        instagram_source_url: postUrl,
        source_platform: platform,
        source_business: businessName,
        hashtags,
        source_metadata: {
          original_row: row,
          likes: row[8],
          comments: row[9],
          shares: row[10],
          published_at: publishedAt,
          top_comments: topComments
        },
        seo_title: seoTitle,
        seo_description: seoDescription,
        search_keywords: searchKeywords
      };

      if (shouldOverwrite && existingProduct) {
        const { error: updateError } = await supabaseClient
          .from("products")
          .update(productPayload)
          .eq("id", existingProduct.id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        // Re-link Category
        await supabaseClient
          .from("product_category_junction")
          .delete()
          .eq("product_id", existingProduct.id);

        await supabaseClient
          .from("product_category_junction")
          .insert({
            product_id: existingProduct.id,
            category_id: category.id
          });

        report.productsUpdated++;
        report.details.push({
          name,
          price,
          status: "updated"
        });

      } else {
        // Create new
        const { data: insertedProduct, error: insertError } = await supabaseClient
          .from("products")
          .insert(productPayload)
          .select()
          .single();

        if (insertError) {
          throw new Error(insertError.message);
        }

        if (insertedProduct) {
          await supabaseClient
            .from("product_category_junction")
            .insert({
              product_id: insertedProduct.id,
              category_id: category.id
            });
        }

        report.productsCreated++;
        report.details.push({
          name,
          price,
          status: "imported"
        });
      }

    } catch (err) {
      report.errors++;
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
      report.details.push({
        name: "Erro de Importação",
        price: 0,
        status: "error",
        reason: errorMessage
      });
    }
  }

  return report;
}
