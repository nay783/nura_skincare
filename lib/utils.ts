/**
 * Merges CSS class names into a single string.
 */
export function cn(...inputs: (string | undefined | null | boolean | Record<string, boolean>)[]) {
  const classes: string[] = [];
  for (const input of inputs) {
    if (!input) continue;
    if (typeof input === "string") {
      classes.push(input);
    } else if (typeof input === "object") {
      for (const [key, value] of Object.entries(input)) {
        if (value) classes.push(key);
      }
    }
  }
  return classes.join(" ");
}

/**
 * Formats a numeric amount to Mozambican Metical (MT) format.
 * Example: 1850 -> 1.850,00 MT
 */
export function formatCurrency(amount: number | string): string {
  const numericAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) return "0,00 MT";
  
  return new Intl.NumberFormat("pt-MZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount) + " MT";
}

/**
 * Formats a date string or object to Mozambican Portuguese date notation.
 * Example: "2026-07-07" -> 7 de Julho de 2026
 */
export function formatDate(dateString: string | Date): string {
  if (!dateString) return "";
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return "";
  
  return new Intl.DateTimeFormat("pt-MZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/**
 * Generates an SEO-friendly URL slug from string text.
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accent marks
    .replace(/\s+/g, "-")           // Replace spaces with hyphen
    .replace(/[^\w\-]+/g, "")       // Remove special characters
    .replace(/\-\-+/g, "-")         // Collapse multiple hyphens
    .replace(/^-+/, "")             // Trim start
    .replace(/-+$/, "");            // Trim end
}

/**
 * Estimates read time in minutes for a block of rich text.
 */
export function estimateReadTime(text: string): number {
  const wordsPerMinute = 200;
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}
