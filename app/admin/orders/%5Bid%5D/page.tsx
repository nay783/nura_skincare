"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ChevronLeft, Check, X, FileText, Calendar, DollarSign, Truck, Clipboard, User, ImageOff } from "lucide-react";
import { Button } from "@/components/shared/button";
import { formatCurrency } from "@/lib/utils";
import { ProductImage } from "@/components/product/ProductImage";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago / Em preparação",
  shipped: "Em entrega",
  delivered: "Entregue",
  cancelled: "Cancelada",
  refunded: "Reembolsada",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente de confirmação",
  approved: "Confirmado / Aprovado",
  rejected: "Rejeitado",
};

export default function AdminOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [linkedTickets, setLinkedTickets] = useState<any[]>([]);
  const [internalNotes, setInternalNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Feedback states
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const loadOrderDetail = async () => {
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

    // 2. Fetch Order Details
    const { data: ord, error: ordError } = await supabase
      .from("orders")
      .select(`
        *,
        profiles (
          id,
          first_name,
          last_name,
          phone,
          email
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (ordError) {
      setErrorMsg("Erro ao carregar encomenda: " + ordError.message);
      setLoading(false);
      return;
    }

    if (!ord) {
      setErrorMsg("Encomenda não encontrada.");
      setLoading(false);
      return;
    }

    setOrder(ord);
    setInternalNotes(ord.internal_notes || "");

    // 3. Fetch Order Items
    const { data: items } = await supabase
      .from("order_items")
      .select(`
        *,
        products (
          name,
          sku,
          images
        )
      `)
      .eq("order_id", id);
    setOrderItems(items || []);

    // 4. Fetch Linked Support Tickets
    const { data: tickets } = await supabase
      .from("tickets")
      .select("id, subject, status, type, created_at")
      .eq("order_id", id);
    setLinkedTickets(tickets || []);

    setLoading(false);
  };

  useEffect(() => {
    loadOrderDetail();
  }, [id, supabase]);

  const handleUpdatePaymentStatus = async (status: "approved" | "rejected") => {
    setActionLoading(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const payload: Record<string, any> = { payment_status: status };
      // Rule: If payment approved, status automatically advances to paid (Em preparação)
      if (status === "approved") {
        payload.status = "paid";
      }

      const { error } = await supabase
        .from("orders")
        .update(payload)
        .eq("id", id);

      if (error) throw error;

      // Log to audit logs
      const actionName = status === "approved" ? "order.payment_confirmed" : "order.payment_rejected";
      await supabase.from("audit_logs").insert({
        admin_id: adminProfile.id,
        action: actionName,
        entity_type: "order",
        entity_id: id,
        metadata: { payment_status: status, status: payload.status }
      });

      setSuccessMsg(`Estado do pagamento actualizado para ${status === "approved" ? "Aprovado" : "Rejeitado"}!`);
      await loadOrderDetail();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao atualizar pagamento.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (status: "paid" | "shipped" | "delivered" | "cancelled" | "refunded") => {
    setActionLoading(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const payload: Record<string, any> = { status };
      // Rule: If marked as refunded, also update payment status to reflect it if needed
      if (status === "refunded") {
        payload.payment_status = "rejected";
      }

      const { error } = await supabase
        .from("orders")
        .update(payload)
        .eq("id", id);

      if (error) throw error;

      // Log to audit logs
      await supabase.from("audit_logs").insert({
        admin_id: adminProfile.id,
        action: `order.status_${status}`,
        entity_type: "order",
        entity_id: id,
        metadata: { status }
      });

      setSuccessMsg(`Estado da encomenda actualizado para: ${STATUS_LABELS[status]}`);
      await loadOrderDetail();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao atualizar estado da encomenda.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const { error } = await supabase
        .from("orders")
        .update({ internal_notes: internalNotes })
        .eq("id", id);

      if (error) throw error;

      setSuccessMsg("Notas internas guardadas com sucesso!");
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao guardar notas.");
    } finally {
      setSavingNotes(false);
    }
  };

  const hasOrderUpdatePermission = adminProfile?.role === "master_admin" || 
    (Array.isArray(adminProfile?.scopes) && adminProfile.scopes.includes("orders.update"));

  const hasRefundPermission = adminProfile?.role === "master_admin" || 
    (Array.isArray(adminProfile?.scopes) && adminProfile.scopes.includes("orders.refund"));

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-neutral-200 w-1/4 rounded" />
        <div className="h-64 bg-neutral-200 rounded" />
      </div>
    );
  }

  if (!order && !loading) {
    return (
      <div className="p-8 text-center text-xs text-muted-foreground italic">
        {errorMsg || "Encomenda não encontrada."}
        <div className="mt-4">
          <Link href="/admin/orders" className="text-primary hover:underline">
            Voltar para Encomendas
          </Link>
        </div>
      </div>
    );
  }

  const customerName = order.profiles
    ? `${order.profiles.first_name || ""} ${order.profiles.last_name || ""}`.trim()
    : "Cliente Anónimo";

  const isPickup = order.shipping_cost === 0;

  return (
    <div className="space-y-8 font-sans pb-12">
      {/* Navigation Header */}
      <div className="flex items-center gap-2">
        <Link
          href="/admin/orders"
          className="p-1.5 hover:bg-white rounded border border-border text-primary cursor-pointer transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-serif text-primary font-medium">
            Detalhes da Encomenda
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Código: #{order.id.toUpperCase()} &bull; Criada em {new Date(order.created_at).toLocaleString("pt-MZ")}
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

      {/* Main Grid content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Items, Payment verification & Actions */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Order Items */}
          <div className="bg-white border border-border p-6 rounded-[4px] space-y-4 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary border-b border-neutral-100 pb-2 flex items-center gap-2">
              <Clipboard className="h-4 w-4 text-primary/70" />
              Artigos da Encomenda
            </h3>
            
            <div className="divide-y divide-neutral-100">
              {orderItems.map((item, idx) => {
                const img = item.products?.images?.[0] || null;
                return (
                  <div key={idx} className="py-3.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 bg-neutral-100 border border-border rounded-sm overflow-hidden flex items-center justify-center shrink-0">
                        {item.products ? (
                          <ProductImage
                            product={{
                              id: item.products.id,
                              name: item.products.name,
                              slug: item.products.slug || "",
                              images: item.products.images || [],
                            }}
                            alt={item.products.name}
                            fill
                            sizes="48px"
                          />
                        ) : (
                          <ImageOff className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-primary">{item.products?.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">SKU: {item.products?.sku}</p>
                        <p className="text-[10px] text-primary/80 mt-1 font-medium">Qtd: {item.quantity}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">{formatCurrency(Number(item.price))}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Subtotal: {formatCurrency(Number(item.price) * item.quantity)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* M-Pesa Payment Verification Panel */}
          {order.payment_method === "mpesa" && (
            <div className="bg-white border border-border p-6 rounded-[4px] space-y-4 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-primary border-b border-neutral-100 pb-2 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary/70" />
                Validação de Pagamento M-Pesa
              </h3>

              {order.payment_receipt_url ? (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <div className="w-full sm:w-48 h-48 bg-neutral-50 border border-border rounded-sm overflow-hidden flex items-center justify-center shrink-0">
                      <a href={order.payment_receipt_url} target="_blank" rel="noreferrer" title="Ver imagem completa">
                        <img 
                          src={order.payment_receipt_url} 
                          alt="Comprovativo M-Pesa" 
                          className="h-full w-full object-contain hover:scale-105 transition-transform" 
                        />
                      </a>
                    </div>
                    <div className="space-y-3 flex-1 text-xs">
                      <p className="font-semibold text-primary">Comprovativo Enviado pelo Cliente</p>
                      <p className="text-muted-foreground">
                        Clique na imagem para ampliar e inspecionar a referência da transacção M-Pesa.
                      </p>
                      
                      <div className="bg-neutral-50 p-3 border border-border rounded-sm space-y-1.5">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Estado do Pagamento:</p>
                        <span className={`inline-block text-[9px] font-bold uppercase px-2 py-0.5 rounded-sm ${
                          order.payment_status === "approved"
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : order.payment_status === "rejected"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}>
                          {PAYMENT_STATUS_LABELS[order.payment_status] || order.payment_status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Accept/Reject payment controls */}
                  {hasOrderUpdatePermission && order.payment_status === "pending" && (
                    <div className="flex gap-3 pt-3 border-t border-neutral-100 justify-end">
                      <Button
                        onClick={() => handleUpdatePaymentStatus("rejected")}
                        disabled={actionLoading}
                        variant="secondary"
                        className="h-9 px-4 text-xs font-semibold uppercase tracking-wider text-red-600 border-red-200 hover:bg-red-50 rounded-sm cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Rejeitar Comprovativo
                      </Button>
                      <Button
                        onClick={() => handleUpdatePaymentStatus("approved")}
                        disabled={actionLoading}
                        variant="primary"
                        className="h-9 px-4 text-xs font-semibold uppercase tracking-wider rounded-sm cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Confirmar Pagamento
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200/50 rounded-sm text-xs text-amber-800 space-y-1.5">
                  <p className="font-bold flex items-center gap-1">
                    <Calendar className="h-4 w-4" /> Comprovativo em falta
                  </p>
                  <p>O cliente selecionou M-Pesa mas ainda não submeteu o comprovativo de transferência.</p>
                </div>
              )}
            </div>
          )}

          {/* Operational logistics workflow controls */}
          {hasOrderUpdatePermission && (
            <div className="bg-white border border-border p-6 rounded-[4px] space-y-4 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-primary border-b border-neutral-100 pb-2 flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary/70" />
                Fluxo Logístico & Despacho
              </h3>

              <div className="flex flex-wrap gap-2 pt-2">
                {order.status === "paid" && (
                  <button
                    onClick={() => handleUpdateOrderStatus("shipped")}
                    disabled={actionLoading}
                    className="h-9 px-4 border border-border bg-white text-xs font-semibold uppercase tracking-wider text-primary hover:bg-neutral-50 rounded-sm cursor-pointer"
                  >
                    Marcar como Em Entrega
                  </button>
                )}

                {order.status === "shipped" && (
                  <button
                    onClick={() => handleUpdateOrderStatus("delivered")}
                    disabled={actionLoading}
                    className="h-9 px-4 bg-primary text-white text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-primary/95 transition-all cursor-pointer"
                  >
                    Confirmar Entrega ao Cliente
                  </button>
                )}

                {order.status === "pending" && (
                  <button
                    onClick={() => handleUpdateOrderStatus("paid")}
                    disabled={actionLoading}
                    className="h-9 px-4 border border-border bg-white text-xs font-semibold uppercase tracking-wider text-primary hover:bg-neutral-50 rounded-sm cursor-pointer"
                  >
                    Confirmar Pagamento Manualmente
                  </button>
                )}

                {order.status !== "delivered" && order.status !== "cancelled" && order.status !== "refunded" && (
                  <button
                    onClick={() => handleUpdateOrderStatus("cancelled")}
                    disabled={actionLoading}
                    className="h-9 px-4 border border-red-200 bg-white text-xs font-semibold uppercase tracking-wider text-red-600 hover:bg-red-50 rounded-sm cursor-pointer"
                  >
                    Cancelar Encomenda
                  </button>
                )}

                {hasRefundPermission && order.status === "delivered" && (
                  <button
                    onClick={() => handleUpdateOrderStatus("refunded")}
                    disabled={actionLoading}
                    className="h-9 px-4 border border-red-200 bg-white text-xs font-semibold uppercase tracking-wider text-red-600 hover:bg-red-50 rounded-sm cursor-pointer"
                  >
                    Reembolsar Encomenda (Estorno)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Internal Staff Notes */}
          <div className="bg-white border border-border p-6 rounded-[4px] space-y-4 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary border-b border-neutral-100 pb-2">
              Notas Internas da Equipa
            </h3>
            <textarea
              value={internalNotes}
              onChange={e => setInternalNotes(e.target.value)}
              placeholder="Adicione anotações sobre pagamentos, envios ou problemas reportados..."
              rows={3}
              className="w-full p-3 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary rounded-sm font-sans"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                variant="primary"
                className="h-9 px-4 text-xs font-semibold uppercase tracking-wider rounded-sm cursor-pointer"
              >
                {savingNotes ? "A guardar..." : "Gravar Notas"}
              </Button>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Customer profile summary, shipping & linked tickets */}
        <div className="space-y-6">
          
          {/* Customer info card */}
          <div className="bg-white border border-border p-6 rounded-[4px] space-y-4 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary border-b border-neutral-100 pb-2 flex items-center gap-2">
              <User className="h-4 w-4 text-primary/70" />
              Perfil do Cliente
            </h3>
            
            <div className="text-xs space-y-2">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Nome completo:</p>
                <Link 
                  href={`/admin/customers/${order.profiles?.id}`} 
                  className="font-semibold text-primary hover:underline"
                >
                  {customerName}
                </Link>
              </div>

              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Email:</p>
                <p className="font-medium text-primary">{order.profiles?.email || "Sem Email"}</p>
              </div>

              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Contacto telefónico:</p>
                <p className="font-medium text-primary">{order.profiles?.phone || "Sem Telefone"}</p>
              </div>
            </div>
          </div>

          {/* Billing / Delivery address */}
          <div className="bg-white border border-border p-6 rounded-[4px] space-y-4 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary border-b border-neutral-100 pb-2 flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary/70" />
              Entrega / Levantamento
            </h3>
            
            <div className="text-xs space-y-3">
              <div className="bg-neutral-50 p-3 border border-border rounded-sm space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Modalidade:</p>
                <p className="font-bold text-primary">
                  {isPickup ? "Levantamento na Loja Física" : "Envio ao Domicílio"}
                </p>
              </div>

              {isPickup ? (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Ponto de recolha:</p>
                  <p className="font-medium text-primary">Av. Julius Nyerere, nº 1000, Maputo Cidade</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Província / Cidade:</p>
                    <p className="font-medium text-primary">
                      {order.shipping_address?.province} &bull; {order.shipping_address?.city}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Endereço:</p>
                    <p className="font-medium text-primary">{order.shipping_address?.street_address}</p>
                  </div>
                  {order.shipping_address?.reference_point && (
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Ponto de Referência:</p>
                      <p className="font-medium text-primary italic">"{order.shipping_address.reference_point}"</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Linked Tickets */}
          <div className="bg-white border border-border p-6 rounded-[4px] space-y-4 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary border-b border-neutral-100 pb-2">
              Tickets de Suporte Associados ({linkedTickets.length})
            </h3>

            {linkedTickets.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Nenhum ticket associado a esta encomenda.</p>
            ) : (
              <div className="space-y-2 text-xs">
                {linkedTickets.map(t => (
                  <div key={t.id} className="p-2.5 bg-neutral-50 border border-border rounded-sm flex items-center justify-between">
                    <div>
                      <Link 
                        href={`/admin/tickets/${t.id}`}
                        className="font-semibold text-primary hover:underline block truncate max-w-[150px]"
                      >
                        {t.subject}
                      </Link>
                      <span className="text-[9px] text-muted-foreground uppercase font-bold">{t.type}</span>
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-green-50 text-green-700 border border-green-200/50 rounded-sm">
                      {t.status}
                    </span>
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
