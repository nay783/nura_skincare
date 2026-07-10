import { SupabaseClient } from "@supabase/supabase-js";

// Event weights
const WEIGHTS = {
  search: 1,       // search query = 1 point
  product_view: 2, // product view = 2 points
  cart_add: 5,     // add to cart = 5 points
  purchase: 10,    // purchase = 10 points
};

/**
 * Client-friendly helper to log a recommendation event.
 */
export async function logRecommendationEvent(
  supabase: SupabaseClient,
  eventType: "search" | "product_view" | "cart_add" | "purchase",
  productId?: string,
  metadata: Record<string, unknown> = {}
) {
  try {
    // 1. Get or generate anonymous session_id
    let sessionId = "";
    if (typeof window !== "undefined") {
      sessionId = localStorage.getItem("nura_session_id") || "";
      if (!sessionId) {
        sessionId = `sess_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
        localStorage.setItem("nura_session_id", sessionId);
      }
    } else {
      sessionId = "server_session";
    }

    // 2. Get current user if logged in
    const { data: { session } } = await supabase.auth.getSession();
    const profileId = session?.user?.id || null;

    // 3. Log to recommendation_logs
    await supabase.from("recommendation_logs").insert({
      session_id: sessionId,
      profile_id: profileId,
      event_type: eventType,
      product_id: productId || null,
      metadata,
    });
  } catch (err) {
    console.error("[RecEngine] Falha ao logar evento:", err);
  }
}

/**
 * Core scoring algorithm.
 * Builds user profile from logs and returns top scored products.
 */
export async function getRecommendations(
  supabase: SupabaseClient,
  options: {
    limit?: number;
    currentProductId?: string;
    excludeCurrent?: boolean;
  } = {}
) {
  const limit = options.limit || 4;
  const excludeCurrent = options.excludeCurrent ?? true;

  try {
    // 1. Get session_id
    let sessionId = "";
    if (typeof window !== "undefined") {
      sessionId = localStorage.getItem("nura_session_id") || "";
    }

    // 2. Get logged in user id
    const { data: { session } } = await supabase.auth.getSession();
    const profileId = session?.user?.id || null;

    // 3. Fetch all products (published & in-stock)
    const { data: allProducts } = await supabase
      .from("products")
      .select("id, name, slug, brand, price, compare_at_price, images, stock_quantity, hashtags, skin_goals, description, sku, status, benefits")
      .eq("status", "published")
      .gt("stock_quantity", 0);

    const prods = allProducts || [];
    if (prods.length === 0) return [];

    // 4. Fetch recommendation logs for this session/profile to build profile
    let logsQuery = supabase.from("recommendation_logs").select("*");
    if (profileId) {
      logsQuery = logsQuery.or(`profile_id.eq.${profileId},session_id.eq.${sessionId}`);
    } else if (sessionId) {
      logsQuery = logsQuery.eq("session_id", sessionId);
    } else {
      // Fallback to default (new arrivals)
      return prods.slice(0, limit);
    }

    const { data: userLogs } = await logsQuery;
    const logs = userLogs || [];

    // If no logs, fallback to top-selling or new arrivals
    if (logs.length === 0) {
      return prods.slice(0, limit);
    }

    // 5. Build interest profile (weighted weights of brands, skin_goals, keywords)
    const brandWeights: Record<string, number> = {};
    const goalWeights: Record<string, number> = {};
    const searchTerms: string[] = [];

    // Group logs by product_id to accumulate product weights
    const productInteractionWeights: Record<string, number> = {};
    
    logs.forEach(log => {
      const weight = WEIGHTS[log.event_type as keyof typeof WEIGHTS] || 0;
      
      if (log.event_type === "search" && log.metadata?.query) {
        searchTerms.push(String(log.metadata.query).toLowerCase());
      }
      
      if (log.product_id) {
        productInteractionWeights[log.product_id] = (productInteractionWeights[log.product_id] || 0) + weight;
      }
    });

    // Translate product weights into attribute weights
    prods.forEach(p => {
      const pWeight = productInteractionWeights[p.id];
      if (pWeight) {
        // Accumulate Brand weight
        if (p.brand) {
          brandWeights[p.brand] = (brandWeights[p.brand] || 0) + pWeight;
        }

        // Accumulate Skin Goals weight
        const goals: string[] = [];
        if (Array.isArray(p.skin_goals)) {
          goals.push(...p.skin_goals);
        }
        if (Array.isArray(p.hashtags)) {
          p.hashtags.forEach((tag: string) => {
            if (tag.startsWith("goal:")) {
              goals.push(tag.substring(5));
            }
          });
        }

        goals.forEach(goal => {
          goalWeights[goal] = (goalWeights[goal] || 0) + pWeight;
        });
      }
    });

    // 6. Score remaining products
    const scoredProducts = prods
      .filter(p => {
        // Exclude current product if requested
        if (excludeCurrent && options.currentProductId && p.id === options.currentProductId) {
          return false;
        }
        return true;
      })
      .map(p => {
        let score = 0;

        // Brand Match
        if (p.brand && brandWeights[p.brand]) {
          score += brandWeights[p.brand] * 3; // high weight for brand match
        }

        // Skin Goals Match
        const pGoals: string[] = [];
        if (Array.isArray(p.skin_goals)) {
          pGoals.push(...p.skin_goals);
        }
        if (Array.isArray(p.hashtags)) {
          p.hashtags.forEach((tag: string) => {
            if (tag.startsWith("goal:")) {
              pGoals.push(tag.substring(5));
            }
          });
        }

        pGoals.forEach(goal => {
          if (goalWeights[goal]) {
            score += goalWeights[goal] * 2;
          }
        });

        // Search Keyword Match
        searchTerms.forEach(term => {
          const textToScan = `${p.name} ${p.brand || ""} ${p.description || ""} ${pGoals.join(" ")}`.toLowerCase();
          if (textToScan.includes(term)) {
            score += 5; // boost search matching products
          }
        });

        // Boost recently clicked/purchased products slightly if they have positive weight but we want variety
        // If we want variety, we can subtract score for already purchased/viewed, but matching is usually preferred
        
        return {
          product: p,
          score,
        };
      })
      .sort((a, b) => b.score - a.score); // Sort highest score first

    // Return the top N products
    return scoredProducts.map(sp => sp.product).slice(0, limit);
  } catch (err) {
    console.error("[RecEngine] Falha ao gerar recomendações:", err);
    return [];
  }
}
