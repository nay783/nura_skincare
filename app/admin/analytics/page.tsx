"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { 
  BarChart3, TrendingUp, ShoppingCart, 
  Search, Eye, HelpCircle, MapPin, AlertCircle
} from "lucide-react";

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [adminProfile, setAdminProfile] = useState<any>(null);

  // Stats states
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    refundRequests: 0,
    openTickets: 0,
  });

  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [provinceSales, setProvinceSales] = useState<any[]>([]);
  const [mostSearched, setMostSearched] = useState<any[]>([]);
  const [mostViewed, setMostViewed] = useState<any[]>([]);
  const [mostAddedToCart, setMostAddedToCart] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function loadAnalytics() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/account");
        return;
      }

      // 1. Fetch Profile to verify scope analytics.read
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      setAdminProfile(prof);

      const hasAnalyticsAccess = prof?.role === "master_admin" || 
        (Array.isArray(prof?.scopes) && prof.scopes.includes("analytics.read"));

      if (!hasAnalyticsAccess) {
        setLoading(false);
        return;
      }

      try {
        // 2. Fetch Orders for revenue, sales split by province
        const { data: orders } = await supabase
          .from("orders")
          .select("total, status, payment_status, shipping_address");

        const ords = orders || [];
        const approvedOrders = ords.filter(o => o.payment_status === "approved" || o.status === "delivered");
        
        const totalRevenue = approvedOrders.reduce((sum, o) => sum + Number(o.total), 0);
        const totalOrders = approvedOrders.length;
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Refund tickets count
        const { count: refundCount } = await supabase
          .from("tickets")
          .select("*", { count: "exact", head: true })
          .eq("type", "refund");

        const { count: openTicketsCount } = await supabase
          .from("tickets")
          .select("*", { count: "exact", head: true })
          .in("status", ["open", "in_progress"]);

        setStats({
          totalRevenue,
          totalOrders,
          averageOrderValue,
          refundRequests: refundCount || 0,
          openTickets: openTicketsCount || 0,
        });

        // 3. Process Province Sales Split
        const provMap: Record<string, { count: number; total: number }> = {};
        approvedOrders.forEach(o => {
          const prov = o.shipping_address?.province || "Levantamento na Loja";
          if (!provMap[prov]) {
            provMap[prov] = { count: 0, total: 0 };
          }
          provMap[prov].count += 1;
          provMap[prov].total += Number(o.total);
        });

        const provList = Object.entries(provMap)
          .map(([province, details]) => ({
            province,
            count: details.count,
            total: details.total,
          }))
          .sort((a, b) => b.total - a.total);
        setProvinceSales(provList);

        // 4. Fetch Top Products sold (from order_items)
        const { data: orderItems } = await supabase
          .from("order_items")
          .select(`
            quantity,
            products (
              id,
              name,
              brand,
              price
            )
          `);

        const prodSalesMap: Record<string, { name: string; brand: string; quantity: number; total: number }> = {};
        (orderItems || []).forEach(item => {
          const prod = item.products as any;
          if (!prod) return;
          if (!prodSalesMap[prod.id]) {
            prodSalesMap[prod.id] = { name: prod.name, brand: prod.brand, quantity: 0, total: 0 };
          }
          prodSalesMap[prod.id].quantity += item.quantity;
          prodSalesMap[prod.id].total += item.quantity * Number(prod.price);
        });

        const topProds = Object.values(prodSalesMap)
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 5);
        setTopProducts(topProds);

        // 5. Fetch Recommendation Logs events (search, product_view, cart_add)
        const { data: logs } = await supabase
          .from("recommendation_logs")
          .select(`
            event_type,
            metadata,
            product_id,
            products (
              name,
              brand
            )
          `);

        const logsList = logs || [];

        // Processing Searches
        const searchMap: Record<string, number> = {};
        logsList
          .filter(l => l.event_type === "search")
          .forEach(l => {
            const query = l.metadata?.query || "";
            if (query.trim() !== "") {
              searchMap[query] = (searchMap[query] || 0) + 1;
            }
          });

        const searchesList = Object.entries(searchMap)
          .map(([query, count]) => ({ query, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        setMostSearched(searchesList);

        // Processing Views
        const viewsMap: Record<string, { name: string; brand: string; count: number }> = {};
        logsList
          .filter(l => l.event_type === "product_view" && l.products)
          .forEach(l => {
            const prod = l.products as any;
            if (!viewsMap[l.product_id]) {
              viewsMap[l.product_id] = { name: prod.name, brand: prod.brand, count: 0 };
            }
            viewsMap[l.product_id].count += 1;
          });

        const viewsList = Object.values(viewsMap)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        setMostViewed(viewsList);

        // Processing Cart Adds
        const cartAddsMap: Record<string, { name: string; brand: string; count: number }> = {};
        logsList
          .filter(l => l.event_type === "cart_add" && l.products)
          .forEach(l => {
            const prod = l.products as any;
            if (!cartAddsMap[l.product_id]) {
              cartAddsMap[l.product_id] = { name: prod.name, brand: prod.brand, count: 0 };
            }
            cartAddsMap[l.product_id].count += 1;
          });

        const cartAddsList = Object.values(cartAddsMap)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        setMostAddedToCart(cartAddsList);

      } catch (err: any) {
        console.error(err);
        setErrorMsg("Erro ao processar estatísticas.");
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-neutral-200 w-1/4 rounded" />
        <div className="h-64 bg-neutral-200 rounded" />
      </div>
    );
  }

  const hasAnalyticsAccess = adminProfile?.role === "master_admin" || 
    (Array.isArray(adminProfile?.scopes) && adminProfile.scopes.includes("analytics.read"));

  // Unauthorized page state
  if (!hasAnalyticsAccess) {
    return (
      <div className="p-8 text-center text-xs text-muted-foreground italic font-sans">
        <AlertCircle className="h-10 w-10 text-amber-600 mx-auto mb-3" />
        Não tem permissão para aceder a esta área (analytics.read em falta).
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif text-primary font-medium">Analytics</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Visão geral do desempenho de vendas, tráfego de pesquisa e engajamento da loja.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border-l-2 border-red-500 text-red-700 text-xs rounded-sm">
          {errorMsg}
        </div>
      )}

      {/* METRICS CARDS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Gross revenue */}
        <div className="bg-white border border-border p-5 rounded-[4px] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Faturação Total</p>
            <p className="text-2xl font-serif font-medium text-primary mt-1">{formatCurrency(stats.totalRevenue)}</p>
            <p className="text-[9px] text-green-700 font-bold mt-1">Ganhos reais aprovados</p>
          </div>
          <TrendingUp className="h-8 w-8 text-primary/10 stroke-[1.5]" />
        </div>

        {/* Volume orders */}
        <div className="bg-white border border-border p-5 rounded-[4px] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Volume de Encomendas</p>
            <p className="text-2xl font-serif font-medium text-primary mt-1">{stats.totalOrders} pedidos</p>
            <p className="text-[9px] text-muted-foreground mt-1">Média de envio constante</p>
          </div>
          <ShoppingCart className="h-8 w-8 text-primary/10 stroke-[1.5]" />
        </div>

        {/* Average Ticket */}
        <div className="bg-white border border-border p-5 rounded-[4px] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Valor Médio do Pedido (AOV)</p>
            <p className="text-2xl font-serif font-medium text-primary mt-1">{formatCurrency(stats.averageOrderValue)}</p>
            <p className="text-[9px] text-muted-foreground mt-1">Gasto médio por carrinho</p>
          </div>
          <BarChart3 className="h-8 w-8 text-primary/10 stroke-[1.5]" />
        </div>
      </div>

      {/* CHARTS CONTAINER GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (2 spans): Top products table & Searches */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Top products sold */}
          <div className="bg-white border border-border p-6 rounded-[4px] shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary border-b border-neutral-100 pb-2">
              Mais Vendidos (Top Produtos)
            </h3>
            
            {topProducts.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-6">Nenhum produto registou vendas aprovadas.</p>
            ) : (
              <div className="divide-y divide-neutral-100 mt-2 text-xs">
                {topProducts.map((p, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-primary">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground">{p.brand}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{p.quantity} vendidos</p>
                      <p className="text-[10px] text-muted-foreground">Volume: {formatCurrency(p.total)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User interaction analytics split tabs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Most searched */}
            <div className="bg-white border border-border p-5 rounded-[4px] shadow-sm space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                Pesquisas
              </h4>
              {mostSearched.length === 0 ? (
                <p className="text-[10px] text-muted-foreground italic py-2">Sem registos.</p>
              ) : (
                <ul className="space-y-1.5 text-xs">
                  {mostSearched.map((s, i) => (
                    <li key={i} className="flex justify-between items-center text-[11px]">
                      <span className="font-medium text-primary">"{s.query}"</span>
                      <span className="text-[10px] text-muted-foreground">{s.count}x</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Most viewed */}
            <div className="bg-white border border-border p-5 rounded-[4px] shadow-sm space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                Visualizações
              </h4>
              {mostViewed.length === 0 ? (
                <p className="text-[10px] text-muted-foreground italic py-2">Sem registos.</p>
              ) : (
                <ul className="space-y-1.5 text-xs">
                  {mostViewed.map((v, i) => (
                    <li key={i} className="flex justify-between items-center text-[11px] truncate max-w-full">
                      <span className="font-medium text-primary truncate pr-2" title={v.name}>{v.name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{v.count}x</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Most added to cart */}
            <div className="bg-white border border-border p-5 rounded-[4px] shadow-sm space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
                Carrinho
              </h4>
              {mostAddedToCart.length === 0 ? (
                <p className="text-[10px] text-muted-foreground italic py-2">Sem registos.</p>
              ) : (
                <ul className="space-y-1.5 text-xs">
                  {mostAddedToCart.map((c, i) => (
                    <li key={i} className="flex justify-between items-center text-[11px] truncate max-w-full">
                      <span className="font-medium text-primary truncate pr-2" title={c.name}>{c.name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{c.count}x</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

          </div>

        </div>

        {/* Right Column (1 span): Sales by Province */}
        <div className="space-y-6">
          <div className="bg-white border border-border p-6 rounded-[4px] shadow-sm space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary border-b border-neutral-100 pb-2 flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-primary/70" />
              Distribuição por Província
            </h3>

            {provinceSales.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4">Nenhuma província de entrega registada.</p>
            ) : (
              <div className="space-y-4 text-xs">
                {provinceSales.map((prov, i) => {
                  // Find relative percentage
                  const maxTotal = provinceSales[0]?.total || 1;
                  const pct = (prov.total / maxTotal) * 100;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between font-medium">
                        <span className="text-primary">{prov.province} ({prov.count} enc.)</span>
                        <span className="font-bold text-primary">{formatCurrency(prov.total)}</span>
                      </div>
                      {/* Simple HTML bar chart progress indicator */}
                      <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-primary h-full rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
