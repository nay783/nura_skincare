"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { 
  ShoppingBag, FileText, MessageSquare, AlertTriangle, 
  TrendingUp, Clock, CheckCircle2, ChevronRight 
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// Status Portuguese labels mappings
const DELIVERY_LABELS: Record<string, string> = {
  pending: "Recebida",
  paid: "Em preparação",
  shipped: "Em entrega",
  delivered: "Entregue",
  cancelled: "Cancelada",
};

export default function AdminDashboardPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [adminProfile, setAdminProfile] = useState<any>(null);

  // Operational metrics
  const [metrics, setMetrics] = useState({
    totalProducts: 0,
    draftProducts: 0,
    publishedProducts: 0,
    lowStockProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    openTickets: 0,
    unresolvedComplaints: 0,
    totalRevenue: 0,
  });

  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recentTickets, setRecentTickets] = useState<any[]>([]);

  useEffect(() => {
    async function loadDashboard() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // 1. Fetch Profile to verify scopes
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      setAdminProfile(prof);

      // 2. Fetch Products stats
      const { data: products } = await supabase
        .from("products")
        .select("status, stock_quantity");

      // 3. Fetch Orders stats
      const { data: orders } = await supabase
        .from("orders")
        .select("total, status, payment_status, created_at, id");

      // 4. Fetch Tickets stats
      const { data: tickets } = await supabase
        .from("tickets")
        .select("status, type, subject, created_at, id");

      // Calculations
      const prodList = products || [];
      const ordList = orders || [];
      const tckList = tickets || [];

      const totalProducts = prodList.length;
      const draftProducts = prodList.filter(p => p.status === "draft").length;
      const publishedProducts = prodList.filter(p => p.status === "published").length;
      const lowStockProducts = prodList.filter(p => p.stock_quantity <= 5 && p.status === "published").length;

      const totalOrders = ordList.length;
      const pendingOrders = ordList.filter(o => o.status === "pending").length;
      const totalRevenue = ordList
        .filter(o => o.payment_status === "approved")
        .reduce((sum, o) => sum + Number(o.total), 0);

      const openTickets = tckList.filter(t => t.status === "open" || t.status === "in_progress").length;
      const unresolvedComplaints = tckList.filter(
        t => t.type === "complaint" && t.status !== "resolved" && t.status !== "closed"
      ).length;

      setMetrics({
        totalProducts,
        draftProducts,
        publishedProducts,
        lowStockProducts,
        totalOrders,
        pendingOrders,
        openTickets,
        unresolvedComplaints,
        totalRevenue,
      });

      // Fetch latest 5 orders for list
      const { data: recOrds } = await supabase
        .from("orders")
        .select(`
          id,
          created_at,
          total,
          status,
          payment_status,
          profiles (
            first_name,
            last_name
          )
        `)
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentOrders(recOrds || []);

      // Fetch latest 5 tickets for list
      const { data: recTcks } = await supabase
        .from("tickets")
        .select(`
          id,
          subject,
          type,
          status,
          created_at,
          profiles (
            first_name,
            last_name
          )
        `)
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentTickets(recTcks || []);

      setLoading(false);
    }
    loadDashboard();
  }, [supabase]);

  const hasAnalyticsAccess = adminProfile?.role === "master_admin" || 
    (Array.isArray(adminProfile?.scopes) && adminProfile.scopes.includes("analytics.read"));

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-neutral-200 w-1/4 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-24 bg-neutral-200 rounded" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-neutral-200 rounded" />
          <div className="h-64 bg-neutral-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      {/* Welcome header */}
      <div>
        <h1 className="text-3xl font-serif text-primary font-medium">Painel Geral</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Resumo operacional diário da Nura Skincare.
        </p>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Products widget */}
        <div className="bg-white border border-border p-5 rounded-[4px] space-y-3 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] uppercase font-bold tracking-wider">Produtos</span>
            <ShoppingBag className="h-4 w-4" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-primary">{metrics.totalProducts}</p>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5 border-t border-neutral-50 pt-1.5 font-medium">
              <span>{metrics.publishedProducts} Publicados</span>
              <span>{metrics.draftProducts} Rascunhos</span>
            </div>
          </div>
        </div>

        {/* Orders widget */}
        <div className="bg-white border border-border p-5 rounded-[4px] space-y-3 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] uppercase font-bold tracking-wider">Encomendas</span>
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-primary">{metrics.totalOrders}</p>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5 border-t border-neutral-50 pt-1.5 font-medium">
              <span className="text-amber-600 font-semibold">{metrics.pendingOrders} Pendentes</span>
              <span>Total acumulado</span>
            </div>
          </div>
        </div>

        {/* Tickets widget */}
        <div className="bg-white border border-border p-5 rounded-[4px] space-y-3 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] uppercase font-bold tracking-wider">Tickets de Suporte</span>
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-primary">{metrics.openTickets}</p>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5 border-t border-neutral-50 pt-1.5 font-medium">
              <span className="text-red-600 font-semibold">{metrics.unresolvedComplaints} Reclamações</span>
              <span>Abertos/Em andamento</span>
            </div>
          </div>
        </div>

        {/* Stock alerts widget */}
        <div className="bg-white border border-border p-5 rounded-[4px] space-y-3 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] uppercase font-bold tracking-wider">Alertas de Stock</span>
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <p className={`text-2xl font-semibold ${metrics.lowStockProducts > 0 ? "text-amber-600" : "text-primary"}`}>
              {metrics.lowStockProducts}
            </p>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5 border-t border-neutral-50 pt-1.5 font-medium">
              <span>Produtos com baixo stock (≤ 5)</span>
            </div>
          </div>
        </div>
      </div>

      {/* REVENUE CARD (ONLY IF HAS SCOPE ANALYTICS.READ) */}
      {hasAnalyticsAccess && (
        <div className="bg-white border border-border p-6 rounded-[4px] space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">Receitas da Loja</h3>
              <p className="text-[10px] text-muted-foreground">Soma de todas as encomendas com pagamento aprovado.</p>
            </div>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <span className="text-3xl font-serif text-primary font-medium">
              {formatCurrency(metrics.totalRevenue)}
            </span>
          </div>
        </div>
      )}

      {/* RECENT OPERATIONAL LOGS CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Orders log */}
        <div className="bg-white border border-border p-5 rounded-[4px] space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary/70" />
              Encomendas Recentes
            </h3>
            <Link
              href="/admin/orders"
              className="text-xs text-primary hover:underline flex items-center gap-0.5 font-medium"
            >
              Ver todas <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4 text-center">Nenhuma encomenda registada.</p>
          ) : (
            <div className="divide-y divide-neutral-100">
              {recentOrders.map(order => {
                const customerName = order.profiles
                  ? `${order.profiles.first_name || ""} ${order.profiles.last_name || ""}`.trim()
                  : "Cliente Anónimo";
                return (
                  <div key={order.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-primary">
                        Enc. #{order.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-muted-foreground mt-0.5">{customerName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">{formatCurrency(Number(order.total))}</p>
                      <span className="text-[9px] uppercase font-bold text-amber-600">
                        {DELIVERY_LABELS[order.status] || order.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Support Tickets log */}
        <div className="bg-white border border-border p-5 rounded-[4px] space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary/70" />
              Últimos Pedidos de Suporte
            </h3>
            <Link
              href="/admin/tickets"
              className="text-xs text-primary hover:underline flex items-center gap-0.5 font-medium"
            >
              Ver todos <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {recentTickets.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4 text-center">Nenhum pedido de suporte aberto.</p>
          ) : (
            <div className="divide-y divide-neutral-100">
              {recentTickets.map(ticket => {
                const customerName = ticket.profiles
                  ? `${ticket.profiles.first_name || ""} ${ticket.profiles.last_name || ""}`.trim()
                  : "Cliente";
                const isClosed = ticket.status === "closed" || ticket.status === "resolved";
                return (
                  <div key={ticket.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-primary truncate max-w-[200px]">
                        {ticket.subject}
                      </p>
                      <p className="text-muted-foreground mt-0.5">
                        {customerName} &bull; Categoria: {ticket.type}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm ${
                          isClosed 
                            ? "bg-neutral-100 text-neutral-500" 
                            : "bg-green-50 text-green-700 border border-green-200/50"
                        }`}
                      >
                        {ticket.status === "open" ? "Aberto" : ticket.status === "in_progress" ? "Em andamento" : ticket.status}
                      </span>
                      <p className="text-[9px] text-muted-foreground mt-1">
                        {new Date(ticket.created_at).toLocaleDateString("pt-MZ")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
