"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { logRecommendationEvent } from "@/lib/recommendations";

interface SearchLoggerProps {
  query?: string;
}

export default function SearchLogger({ query }: SearchLoggerProps) {
  useEffect(() => {
    if (query && query.trim() !== "") {
      const supabase = createClient();
      logRecommendationEvent(supabase, "search", undefined, { query: query.trim() });
    }
  }, [query]);

  return null;
}
