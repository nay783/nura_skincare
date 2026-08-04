import fs from "fs";
import path from "path";
import { parseCSV, detectPrice, detectBrand, extractProductName, parseMediaUrls } from "@/lib/imports/product-importer";
import { slugify } from "@/lib/utils";
import type { Product } from "@/components/product/ProductCard";

export function getLocalFallbackProducts(): Product[] {
  try {
    const csvPath = path.resolve(process.cwd(), "data/imports/nura_products.csv");
    if (!fs.existsSync(csvPath)) {
      console.warn("[Fallback] CSV file not found at " + csvPath);
      return [];
    }
    
    const content = fs.readFileSync(csvPath, "utf-8");
    const parsedRows = parseCSV(content);
    if (parsedRows.length <= 1) return [];

    const dataRows = parsedRows.slice(1);
    const fallbackProducts: Product[] = [];

    dataRows.forEach((row, idx) => {
      const businessName = row[0]?.trim();
      const caption = row[5]?.trim() || "";
      const hashtagsStr = row[6]?.trim() || "";
      const mediaUrlsStr = row[7]?.trim() || "";

      if (businessName !== "Nura Skincare / K-Beauty Shop") return;

      const price = detectPrice(caption, hashtagsStr);
      if (price === null) return;

      const nameExtraction = extractProductName(caption, String(idx));
      const name = nameExtraction.name;
      const brand = detectBrand(caption);
      const images = parseMediaUrls(mediaUrlsStr);
      const hashtags = hashtagsStr ? hashtagsStr.split(",").map(t => t.trim().replace("#", "")) : [];
      let baseSlug = slugify(name);
      if (!baseSlug) baseSlug = `product-${idx}`;

      const goals = hashtags
        .filter(tag => tag.startsWith("goal:"))
        .map(tag => {
          const raw = tag.substring(5);
          if (raw === "hidratacao") return "Hidratação";
          if (raw === "pele-sensivel") return "Pele Sensível";
          if (raw === "anti-idade") return "Anti-idade";
          return raw.charAt(0).toUpperCase() + raw.slice(1);
        });

      fallbackProducts.push({
        id: `fallback-${idx}-${baseSlug}`,
        name,
        slug: baseSlug,
        description: caption,
        price,
        compare_at_price: null,
        sku: `FLB-${brand.substring(0, 3).toUpperCase()}-${idx}`,
        stock_quantity: 15,
        status: "published",
        images: images,
        benefits: [caption.substring(0, 100)],
        brand,
        hashtags,
        skin_goals: goals,
        main_image_url: images[0] || null,
        external_images: images,
        is_featured: idx % 7 === 0 // Mark some products as featured
      });
    });

    return fallbackProducts;
  } catch (error) {
    console.error("Failed to load local fallback products:", error);
    return [];
  }
}
