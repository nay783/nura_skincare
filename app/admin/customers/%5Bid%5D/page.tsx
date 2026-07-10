"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ChevronLeft, User, DollarSign, ShoppingBag, MessageSquare, AlertCircle, Plus, Minus } from "lucide-react";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";
import { formatCurrency } from "@/lib/utils";

export default function AdminCustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [adminProfile, setAdminProfile] = useState<any>(null);
  
  // Customer data state
  const [customer, setCustomer] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  
  // Store credit stats & adjustments
  const [storeCredits, setStoreCredits] = useState<any[]>([]);
  const [creditBalance, setCreditBalance] = useState(0);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [creditType, setCreditType] = useState<"add" | "remove">("add");
  const [adjustingCredit, setAdjustingCredit] = useState(false);

  // Feedbacks
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const loadCustomerDetail = async () => {
    if (!id) return;
    setLoading(true);
    setErrorMsg("");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      router.push("/account");
      return;
    }

    // 1. Fetch Admin Profile
    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();
    setAdminProfile(prof);

    // 2. Fetch Customer profile
    const { data: cust, error: custError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (custError) {
      setErrorMsg("Erro ao carregar perfil do cliente: " + custError.message);
      setLoading(false);
      return;
    }

    setCustomer(cust);

    // 3. Fetch Delivery Addresses
    const { data: addrs } = await supabase
      .from("addresses")
      .select("*")
      .eq("profile_id", id);
    setAddresses(addrs || []);

    // 4. Fetch Order History
    const { data: ords } = await supabase
      .from("orders")
      .select("id, created_at, status, total, payment_status")
      .eq("customer_id", id)
      .order("created_at", { ascending: false });
    setOrders(ords || []);

    // 5. Fetch Support Ticket History
    const { data: tcks } = await supabase
      .from("tickets")
      .select("id, subject, type, status, created_at")
      .eq("customer_id", id)
      .order("created_at", { ascending: false });
    setTickets(tcks || []);

    // 6. Fetch Store Credits Logs & calculate sum
    const { data: credits } = await supabase
      .from("store_credits")
      .select("*")
      .eq("profile_id", id)
      .order("created_at", { ascending: false });

    if (credits) {
      setStoreCredits(credits);
      const balance = credits.reduce((sum, item) => sum + Number(item.amount), 0);
      setCreditBalance(balance);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadCustomerDetail();
  }, [id, supabase]);

  const handleAdjustCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    const hasUpdatePermission = adminProfile?.role === "master_admin" || 
      (Array.isArray(adminProfile?.scopes) && adminProfile.scopes.includes("customers.update"));

    if (!hasUpdatePermission) {
      setErrorMsg("Não tem permissão para aceder ou alterar crédito de clientes (customers.update em falta).");
      return;
    }

    const value = parseFloat(creditAmount);
    if (isNaN(value) || value <= 0) {
      setErrorMsg("Introduza um valor válido e positivo.");
      return;
    }

    if (!creditReason.trim()) {
      setErrorMsg("Por favor, forneça um motivo para o ajuste de saldo.");
      return;
    }

    setAdjustingCredit(true);

    try {
      const finalAmount = creditType === "add" ? value : -value;

      // Insert record to store_credits
      const { error } = await supabase
        .from("store_credits")
        .insert({
          profile_id: id,
          amount: finalAmount,
          reason: creditReason.trim(),
        });

      if (error) throw error;

      // Log action in audit logs
      await supabase.from("audit_logs").insert({
        admin_id: adminProfile.id,
        action: "store_credit.adjusted",
        entity_type: "customer",
        entity_id: id,
        metadata: { amount: finalAmount, reason: creditReason.trim() }
      });

      setSuccessMsg(`Saldo de crédito ajustado em ${creditType === "add" ? "+" : "-"}${value.toFixed(2)} MT com sucesso!`);
      setCreditAmount("");
      setCreditReason("");
      
      await loadCustomerDetail();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao ajustar crédito.");
    } finally {
      setAdjustingCredit(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-neutral-200 w-1/4 rounded" />
        <div className="h-64 bg-neutral-200 rounded" />
      </div>
    );
  }

  if (!customer && !loading) {
    return (
      <div className="p-8 text-center text-xs text-muted-foreground italic">
        {errorMsg || "Cliente não encontrado."}
        <div className="mt-4">
          <Link href="/admin/customers" className="text-primary hover:underline">
            Voltar para Clientes
          </Link>
        </div>
      </div>
    );
  }

  const customerName = `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "Cliente Sem Nome";
  
  // Calculate aggregate metrics
  const totalSpent = orders
    .filter(o => o.payment_status === "approved" || o.status === "delivered")
    .reduce((sum, o) => sum + Number(o.total), 0);

  const hasUpdatePermission = adminProfile?.role === "master_admin" || 
    (Array.isArray(adminProfile?.scopes) && adminProfile.scopes.includes("customers.update"));

  return (
    <div className="space-y-8 font-sans pb-12">
      {/* Back button and name */}
      <div className="flex items-center gap-2">
        <Link
          href="/admin/customers"
          className="p-1.5 hover:bg-white rounded border border-border text-primary cursor-pointer transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-serif text-primary font-medium">{customerName}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            ID de Registo: {customer.id} &bull; Conta criada em {new Date(customer.created_at).toLocaleDateString("pt-MZ")}
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-green-50 border-l-2 border-green-500 text-green-700 text-xs rounded-sm">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-50 border-l-2 border-red-500 text-red-700 text-xs rounded-sm">
          {errorMsg}
        </div>
      )}

      {/* Stats summary row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total Spent */}
        <div className="bg-white border border-border p-4 rounded-[4px] shadow-sm">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Acumulado Gasto</p>
          <p className="text-xl font-semibold text-primary mt-1">{formatCurrency(totalSpent)}</p>
        </div>

        {/* Total Orders */}
        <div className="bg-white border border-border p-4 rounded-[4px] shadow-sm">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Encomendas</p>
          <p className="text-xl font-semibold text-primary mt-1">{orders.length} pedidos</p>
        </div>

        {/* Store Credit Balance */}
        <div className="bg-white border border-border p-4 rounded-[4px] shadow-sm">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Crédito Disponível</p>
          <p className={`text-xl font-semibold mt-1 ${creditBalance > 0 ? "text-green-700" : "text-primary"}`}>
            {formatCurrency(creditBalance)}
          </p>
        </div>

        {/* Phone */}
        <div className="bg-white border border-border p-4 rounded-[4px] shadow-sm">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Telemóvel / WhatsApp</p>
          <p className="text-xl font-semibold text-primary mt-1">{customer.phone || "N/A"}</p>
        </div>
      </div>

      {/* Main Grid content layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT TWO COLUMNS: Orders list & Tickets list */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Order history */}
          <div className="bg-white border border-border p-6 rounded-[4px] shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary border-b border-neutral-100 pb-2 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-primary/70" />
              Histórico de Encomendas ({orders.length})
            </h3>

            {orders.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4">Este cliente ainda não realizou compras.</p>
            ) : (
              <div className="divide-y divide-neutral-100">
                {orders.map(order => (
                  <div key={order.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <Link 
                        href={`/admin/orders/${order.id}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        Enc. #{order.id.slice(0, 8).toUpperCase()}
                      </Link>
                      <p className="text-muted-foreground text-[10px] mt-0.5">
                        {new Date(order.created_at).toLocaleDateString("pt-MZ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">{formatCurrency(Number(order.total))}</p>
                      <span className={`inline-block text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${
                        order.payment_status === "approved" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ticket history */}
          <div className="bg-white border border-border p-6 rounded-[4px] shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary border-b border-neutral-100 pb-2 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary/70" />
              Histórico de Reclamações & Suporte ({tickets.length})
            </h3>

            {tickets.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4">Nenhum ticket aberto por este cliente.</p>
            ) : (
              <div className="divide-y divide-neutral-100">
                {tickets.map(ticket => (
                  <div key={ticket.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <Link 
                        href={`/admin/tickets/${ticket.id}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {ticket.subject}
                      </Link>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Categoria: {ticket.type} &bull; Criado: {new Date(ticket.created_at).toLocaleDateString("pt-MZ")}
                      </p>
                    </div>
                    <div>
                      <span className={`inline-block text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm ${
                        ticket.status === "closed" || ticket.status === "resolved" 
                          ? "bg-neutral-100 text-neutral-500" 
                          : "bg-green-50 text-green-700 border border-green-200/50"
                      }`}>
                        {ticket.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Addresses & Store Credit editor */}
        <div className="space-y-6">
          
          {/* Store credit editor */}
          <div className="bg-white border border-border p-6 rounded-[4px] shadow-sm space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary border-b border-neutral-100 pb-2 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary/70" />
              Saldo de Crédito na Loja
            </h3>

            <div className="bg-neutral-50 p-3.5 border border-border rounded-sm text-center">
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Saldo Actual</p>
              <p className="text-2xl font-serif text-primary font-medium mt-1">{formatCurrency(creditBalance)}</p>
            </div>

            {hasUpdatePermission ? (
              <form onSubmit={handleAdjustCredit} className="space-y-3.5 pt-2">
                <p className="text-[10px] text-primary uppercase font-bold">Ajustar Saldo de Crédito</p>
                
                {/* Type toggle */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreditType("add")}
                    className={`h-9 border text-xs font-semibold uppercase tracking-wider rounded-sm cursor-pointer transition-colors flex items-center justify-center gap-1 ${
                      creditType === "add" 
                        ? "bg-primary text-white border-primary" 
                        : "bg-white border-border text-primary hover:bg-neutral-50"
                    }`}
                  >
                    <Plus className="h-3.5 w-3.5" /> Adicionar
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreditType("remove")}
                    className={`h-9 border text-xs font-semibold uppercase tracking-wider rounded-sm cursor-pointer transition-colors flex items-center justify-center gap-1 ${
                      creditType === "remove" 
                        ? "bg-primary text-white border-primary" 
                        : "bg-white border-border text-primary hover:bg-neutral-50"
                    }`}
                  >
                    <Minus className="h-3.5 w-3.5" /> Retirar
                  </button>
                </div>

                {/* Amount input */}
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-primary mb-1">
                    Valor em Meticais (MT)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 500"
                    value={creditAmount}
                    onChange={e => setCreditAmount(e.target.value)}
                    disabled={adjustingCredit}
                    required
                    className="w-full text-xs"
                  />
                </div>

                {/* Reason input */}
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-primary mb-1">
                    Motivo / Justificação
                  </label>
                  <Input
                    type="text"
                    placeholder="Ex: Reembolso da encomenda #F3A91"
                    value={creditReason}
                    onChange={e => setCreditReason(e.target.value)}
                    disabled={adjustingCredit}
                    required
                    className="w-full text-xs"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={adjustingCredit}
                  variant="primary"
                  className="w-full h-9 text-xs font-semibold uppercase tracking-wider rounded-sm cursor-pointer"
                >
                  {adjustingCredit ? "A processar..." : "Confirmar Ajuste"}
                </Button>
              </form>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200/50 rounded-sm text-xs text-amber-800 flex items-start gap-1.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>Apenas tem permissão de leitura. É necessária a permissão customers.update para realizar estornos ou ajustes de crédito.</p>
              </div>
            )}

            {/* Past Credit transaction history */}
            {storeCredits.length > 0 && (
              <div className="border-t border-neutral-100 pt-4 space-y-2">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Transacções Recentes</p>
                <div className="space-y-2 max-h-48 overflow-y-auto text-[10px] divide-y divide-neutral-50">
                  {storeCredits.map(c => (
                    <div key={c.id} className="pt-2 flex items-start justify-between">
                      <div className="pr-2">
                        <p className="font-semibold text-primary">{c.reason}</p>
                        <p className="text-muted-foreground mt-0.5">
                          {new Date(c.created_at).toLocaleDateString("pt-MZ")}
                        </p>
                      </div>
                      <span className={`font-bold shrink-0 ${Number(c.amount) > 0 ? "text-green-700" : "text-red-600"}`}>
                        {Number(c.amount) > 0 ? "+" : ""}{c.amount} MT
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Delivery Addresses */}
          <div className="bg-white border border-border p-6 rounded-[4px] shadow-sm space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary border-b border-neutral-100 pb-2">
              Moradas Registadas ({addresses.length})
            </h3>

            {addresses.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Nenhuma morada associada a esta conta.</p>
            ) : (
              <div className="space-y-3">
                {addresses.map(addr => (
                  <div key={addr.id} className="p-3.5 bg-neutral-50 border border-border rounded-sm space-y-2 text-xs relative">
                    {addr.is_default && (
                      <span className="absolute top-3 right-3 text-[8px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-sm">
                        Predefinida
                      </span>
                    )}
                    <div>
                      <p className="font-bold text-primary">{addr.province} &bull; {addr.city}</p>
                      <p className="text-muted-foreground mt-0.5 leading-normal">{addr.street_address}</p>
                      {addr.reference_point && (
                        <p className="text-muted-foreground text-[10px] mt-1 italic">"{addr.reference_point}"</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
