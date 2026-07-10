"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Search, Eye, Filter, RefreshCw, AlertCircle, FileText } from "lucide-react";
import { Input } from "@/components/shared/input";
import { formatCurrency } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago / Em preparação",
  shipped: "Em entrega",
  delivered: "Entregue",
  cancelled: "Cancelada",
  refunded: "Reembolsada",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "A aguardar",
  approved: "Aprovado",
  rejected: "Rejeitado",
};

export default function AdminOrdersPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all"); 
  // Tabs: 'all', 'awaiting_payment', 'receipt_received', 'approved', 'processing', 'shipping', 'delivered', 'cancelled'

  const [errorMsg, setErrorMsg] = useState("");

  const loadOrders = async () => {
    setLoading(true);
    setErrorMsg("");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      router.push("/account");
      return;
    }

    // 1. Fetch profile
    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();
    setAdminProfile(prof);

    // 2. Fetch Orders
    const { data: ords, error } = await supabase
      .from("orders")
      .select(`
        id,
        created_at,
        status,
        payment_method,
        payment_status,
        payment_receipt_url,
        total,
        profiles (
          first_name,
          last_name,
          phone
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMsg("Erro ao carregar encomendas: " + error.message);
    } else {
      setOrders(ords || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, [supabase]);

  // Apply filter rules client-side
  useEffect(() => {
    let result = [...orders];

    // Search matches order ID, customer name or phone
    if (searchTerm.trim() !== "") {
      const q = searchTerm.toLowerCase();
      result = result.filter(o => 
        o.id.toLowerCase().includes(q) ||
        o.profiles?.first_name?.toLowerCase().includes(q) ||
        o.profiles?.last_name?.toLowerCase().includes(q) ||
        o.profiles?.phone?.toLowerCase().includes(q)
      );
    }

    // Tab filter conditions
    if (activeTab === "awaiting_payment") {
      result = result.filter(o => o.status === "pending" && !o.payment_receipt_url);
    } else if (activeTab === "receipt_received") {
      result = result.filter(o => o.status === "pending" && o.payment_receipt_url);
    } else if (activeTab === "approved") {
      result = result.filter(o => o.payment_status === "approved");
    } else if (activeTab === "processing") {
      result = result.filter(o => o.status === "paid");
    } else if (activeTab === "shipping") {
      result = result.filter(o => o.status === "shipped");
    } else if (activeTab === "delivered") {
      result = result.filter(o => o.status === "delivered");
    } else if (activeTab === "cancelled") {
      result = result.filter(o => o.status === "cancelled");
    }

    setFilteredOrders(result);
  }, [orders, searchTerm, activeTab]);

  if (loading && orders.length === 0) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-neutral-200 w-1/4 rounded" />
        <div className="h-64 bg-neutral-200 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      <div>
        <h1 className="text-3xl font-serif text-primary font-medium">Encomendas</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Gere os pedidos de compra, confirme os recibos de transferência M-Pesa e despache mercadorias.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border-l-2 border-red-500 text-red-700 text-xs rounded-sm">
          {errorMsg}
        </div>
      )}

      {/* FILTER TABS */}
      <div className="flex flex-wrap gap-1 border-b border-border">
        {[
          { id: "all", label: "Todas" },
          { id: "awaiting_payment", label: "A aguardar Pagamento" },
          { id: "receipt_received", label: "Comprovativo Recebido" },
          { id: "approved", label: "Pagas" },
          { id: "processing", label: "Em Preparação" },
          { id: "shipping", label: "Em Entrega" },
          { id: "delivered", label: "Entregues" },
          { id: "cancelled", label: "Canceladas" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SEARCH BAR */}
      <div className="flex items-center gap-3 bg-white p-3 border border-border rounded-[4px] shadow-sm">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          type="text"
          placeholder="Pesquisar por nº da encomenda ou nome do cliente..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="border-none p-0 focus:ring-0 focus:outline-none !h-auto text-sm w-full bg-transparent"
        />
        <button 
          onClick={loadOrders}
          className="p-1 hover:bg-neutral-50 rounded border border-border cursor-pointer text-primary shrink-0"
          title="Recarregar"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ORDERS LOG GRID */}
      <div className="bg-white border border-border rounded-[4px] overflow-hidden shadow-sm">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground italic">
            Nenhuma encomenda encontrada correspondente aos filtros aplicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 text-[10px] uppercase font-bold tracking-wider text-muted-foreground border-b border-border">
                  <th className="p-4">Nº Encomenda</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Data</th>
                  <th className="p-4 text-right">Total</th>
                  <th className="p-4">Método</th>
                  <th className="p-4">Pagamento</th>
                  <th className="p-4">Estado Entrega</th>
                  <th className="p-4 text-right">Acção</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs">
                {filteredOrders.map(order => {
                  const customerName = order.profiles
                    ? `${order.profiles.first_name || ""} ${order.profiles.last_name || ""}`.trim()
                    : "Cliente Anónimo";
                  
                  return (
                    <tr key={order.id} className="hover:bg-neutral-50/50">
                      {/* Code */}
                      <td className="p-4 font-mono font-semibold text-primary">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </td>

                      {/* Customer */}
                      <td className="p-4">
                        <span className="font-semibold text-primary block leading-tight">{customerName}</span>
                        <span className="text-[10px] text-muted-foreground font-medium">{order.profiles?.phone || "Sem Telefone"}</span>
                      </td>

                      {/* Date */}
                      <td className="p-4 text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString("pt-MZ")}
                      </td>

                      {/* Total */}
                      <td className="p-4 text-right font-semibold text-primary">
                        {formatCurrency(Number(order.total))}
                      </td>

                      {/* Method */}
                      <td className="p-4">
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                          {order.payment_method === "mpesa" ? "M-Pesa" : order.payment_method === "store_credit" ? "Crédito" : "Outro"}
                        </span>
                      </td>

                      {/* Payment status */}
                      <td className="p-4">
                        <span className={`inline-block text-[9px] font-bold uppercase px-2 py-0.5 rounded-sm ${
                          order.payment_status === "approved"
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : order.payment_status === "rejected"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : order.payment_receipt_url
                            ? "bg-blue-50 text-blue-700 border border-blue-200 font-bold"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          {order.payment_status === "pending" && order.payment_receipt_url 
                            ? "Comprovativo" 
                            : PAYMENT_STATUS_LABELS[order.payment_status] || order.payment_status}
                        </span>
                      </td>

                      {/* Delivery status */}
                      <td className="p-4">
                        <span className={`inline-block text-[9px] font-bold uppercase px-2 py-0.5 rounded-sm ${
                          order.status === "delivered"
                            ? "bg-green-50 text-green-700 border border-green-200/50"
                            : order.status === "cancelled" || order.status === "refunded"
                            ? "bg-neutral-100 text-neutral-600"
                            : "bg-amber-50 text-amber-700 border border-amber-200/50"
                        }`}>
                          {STATUS_LABELS[order.status] || order.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center p-1.5 hover:bg-neutral-100 text-primary border border-border rounded"
                          title="Visualizar Encomenda"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
