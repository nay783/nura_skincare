"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { ChevronLeft, Upload, FileCheck, CheckCircle2, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/shared/button";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface OrderProduct {
  id: string;
  name: string;
  slug: string;
  images: string[] | null;
}

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  products: OrderProduct | null;
}

interface OrderDetail {
  id: string;
  customer_id: string;
  created_at: string;
  subtotal: number;
  shipping_cost: number;
  discount_amount: number;
  total: number;
  status: string;
  payment_status: string;
  payment_method: string;
  payment_receipt_url: string | null;
  shipping_address: {
    name?: string;
    street_address?: string;
    city?: string;
    province?: string;
    reference_point?: string;
    pickup?: boolean;
  } | null;
  order_items: OrderItem[];
}

const DELIVERY_LABELS: Record<string, string> = {
  pending: "Recebida",
  paid: "Em preparação",
  shipped: "Em entrega",
  delivered: "Entregue",
  cancelled: "Cancelada",
  refunded: "Reembolsada",
};

export default function OrderDetailPage({ params }: PageProps) {
  const resolvedParams = React.use(params);
  const orderId = resolvedParams.id;
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [order, setOrder] = useState<OrderDetail | null>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

  // Support creation state
  const [submittingTicket, setSubmittingTicket] = useState(false);

  useEffect(() => {
    async function loadOrder() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/account");
        return;
      }
      setUser(session.user);

      // Fetch order details, items, and products
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          customer_id,
          created_at,
          subtotal,
          shipping_cost,
          discount_amount,
          total,
          status,
          payment_status,
          payment_method,
          payment_receipt_url,
          shipping_address,
          order_items (
            id,
            quantity,
            price,
            products (
              id,
              name,
              slug,
              images
            )
          )
        `)
        .eq("id", orderId)
        .eq("customer_id", session.user.id)
        .maybeSingle();

      if (error || !data) {
        console.error("Erro ao carregar detalhes da encomenda:", error?.message);
        router.push("/account/orders");
      } else {
        setOrder(data as unknown as OrderDetail);
      }
      setLoading(false);
    }
    loadOrder();
  }, [supabase, orderId, router]);

  // Handle M-Pesa payment proof receipt upload
  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!order || !user) return;
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      setUploadError("Por favor, carregue um formato suportado (JPG, PNG, PDF).");
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("O tamanho do ficheiro deve ser menor que 5MB.");
      return;
    }

    setUploadError("");
    setUploadSuccess("");
    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${order.customer_id}/${order.id}_receipt.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      // Upload file to Supabase Storage payment-receipts
      const { error: uploadError } = await supabase.storage
        .from("payment-receipts")
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("payment-receipts")
        .getPublicUrl(filePath);

      // Update order payment_receipt_url
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          payment_receipt_url: publicUrl,
        })
        .eq("id", order.id);

      if (updateError) throw updateError;

      setUploadSuccess("Comprovativo enviado com sucesso! A nossa equipa irá validar em breve.");
      setOrder({ ...order, payment_receipt_url: publicUrl });
      router.refresh();
    } catch (err: unknown) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : "Erro ao carregar o comprovativo. Tente novamente.";
      setUploadError(errMsg);
    } finally {
      setUploading(false);
    }
  };

  // Handle Support Ticket Creation Quick Action
  const handleSupportAction = async (category: "refund" | "return" | "complaint" | "delivery_issue" | "product_question", actionLabel: string) => {
    if (!order || !user) return;
    if (submittingTicket) return;
    setSubmittingTicket(true);

    const orderNumber = order.id.slice(0, 8).toUpperCase();
    const subject = `${actionLabel} - Encomenda #${orderNumber}`;
    const initialMessage = `Olá equipa Nura.\n\nGostaria de solicitar suporte do tipo "${actionLabel}" para a minha encomenda #${orderNumber}.\n\nPor favor, analisem este caso e entrem em contacto.\nObrigado.`;

    try {
      // 1. Create Ticket row
      const { data: ticket, error: ticketError } = await supabase
        .from("tickets")
        .insert({
          customer_id: user.id,
          order_id: order.id,
          type: category,
          subject,
          status: "open",
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // 2. Create Initial Message
      const { error: messageError } = await supabase
        .from("ticket_messages")
        .insert({
          ticket_id: ticket.id,
          sender_id: user.id,
          message: initialMessage,
          attachments: [],
        });

      if (messageError) throw messageError;

      // Redirect to support page details
      router.push(`/account/support/${ticket.id}`);
    } catch (err: unknown) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : "Não foi possível abrir o pedido de suporte. Tente falar pelo WhatsApp.";
      alert(errMsg);
    } finally {
      setSubmittingTicket(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center min-h-[300px]">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-12 text-center text-xs text-muted-foreground italic">
        Encomenda não encontrada.
      </div>
    );
  }

  // Calculate Order Timeline Status Steps
  const orderStatus = order.status;
  const paymentStatus = order.payment_status;
  const isPickup = order.shipping_address?.pickup === true || order.shipping_cost === 0;

  // Timeline highlights
  const step1Active = true; // Encomenda recebida is always true for an existing order
  const step2Active = order.payment_receipt_url !== null || paymentStatus === "approved";
  const step3Active = orderStatus === "paid" || orderStatus === "shipped" || orderStatus === "delivered";
  const step4Active = orderStatus === "shipped" || orderStatus === "delivered";
  const step5Active = orderStatus === "delivered";

  return (
    <div className="space-y-8 font-sans">
      {/* Back button */}
      <div>
        <Link
          href="/account/orders"
          className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar para Encomendas
        </Link>
      </div>

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-border pb-6 gap-4">
        <div>
          <h1 className="text-2xl font-serif text-primary font-medium">
            Encomenda #{order.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-xs text-muted-foreground">
            Realizada em: {new Date(order.created_at).toLocaleString("pt-MZ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-wider">
          <span
            className={`px-2 py-0.5 rounded-sm border ${
              paymentStatus === "approved"
                ? "bg-green-50 text-green-700 border-green-200"
                : paymentStatus === "rejected"
                ? "bg-red-50 text-red-700 border-red-200"
                : order.payment_receipt_url
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
          >
            {paymentStatus === "approved"
              ? "Pago"
              : paymentStatus === "rejected"
              ? "Rejeitado"
              : order.payment_receipt_url
              ? "Em confirmação"
              : "A aguardar pagamento"}
          </span>
          <span className="bg-neutral-100 text-primary border border-neutral-200 px-2 py-0.5 rounded-sm">
            {DELIVERY_LABELS[orderStatus] || "Recebida"}
          </span>
        </div>
      </div>

      {/* TIMELINE PROGRESS PANEL */}
      <div className="border border-border p-6 rounded-[4px] bg-white space-y-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">
          Estado da Encomenda
        </h3>
        
        {/* Timeline graphics */}
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-4 md:px-4">
          {/* Connector Line for Desktop */}
          <div className="hidden md:block absolute top-[14px] left-6 right-6 h-0.5 bg-neutral-200 z-0" />

          {/* Step 1 */}
          <div className="flex md:flex-col items-center gap-3 md:gap-2 z-10 md:flex-1 md:text-center">
            <CheckCircle2 className={`h-7 w-7 stroke-[1.5] ${step1Active ? "text-primary fill-primary/10" : "text-neutral-300"}`} />
            <div className="text-left md:text-center">
              <p className="text-xs font-semibold text-primary">Encomenda recebida</p>
              <p className="text-[10px] text-muted-foreground">Aguardando validação</p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex md:flex-col items-center gap-3 md:gap-2 z-10 md:flex-1 md:text-center">
            <CheckCircle2 className={`h-7 w-7 stroke-[1.5] ${step2Active ? "text-primary fill-primary/10" : "text-neutral-300"}`} />
            <div className="text-left md:text-center">
              <p className="text-xs font-semibold text-primary">Comprovativo recebido</p>
              <p className="text-[10px] text-muted-foreground">Validação financeira</p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex md:flex-col items-center gap-3 md:gap-2 z-10 md:flex-1 md:text-center">
            <CheckCircle2 className={`h-7 w-7 stroke-[1.5] ${step3Active ? "text-primary fill-primary/10" : "text-neutral-300"}`} />
            <div className="text-left md:text-center">
              <p className="text-xs font-semibold text-primary">Em preparação</p>
              <p className="text-[10px] text-muted-foreground">Produtos em embalagem</p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex md:flex-col items-center gap-3 md:gap-2 z-10 md:flex-1 md:text-center">
            <CheckCircle2 className={`h-7 w-7 stroke-[1.5] ${step4Active ? "text-primary fill-primary/10" : "text-neutral-300"}`} />
            <div className="text-left md:text-center">
              <p className="text-xs font-semibold text-primary">
                {isPickup ? "Pronta para levantamento" : "Em entrega"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {isPickup ? "Levante na loja física" : "A caminho da morada"}
              </p>
            </div>
          </div>

          {/* Step 5 */}
          <div className="flex md:flex-col items-center gap-3 md:gap-2 z-10 md:flex-1 md:text-center">
            <CheckCircle2 className={`h-7 w-7 stroke-[1.5] ${step5Active ? "text-primary fill-primary/10" : "text-neutral-300"}`} />
            <div className="text-left md:text-center">
              <p className="text-xs font-semibold text-primary">Concluída</p>
              <p className="text-[10px] text-muted-foreground">Entregue com sucesso</p>
            </div>
          </div>
        </div>
      </div>

      {/* MIDDLE CONTAINER: Items List & Details summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items detail list */}
        <div className="lg:col-span-2 border border-border p-5 rounded-[4px] bg-white space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-primary border-b border-neutral-100 pb-2">
            Artigos Encomendados
          </h3>
          <div className="divide-y divide-neutral-100">
            {order.order_items.map((item) => {
              const product = item.products;
              const imgUrl = product?.images?.[0] || "/images/placeholder-product.jpg";
              return (
                <div key={item.id} className="py-4 flex gap-4 text-sm justify-between items-center">
                  <div className="flex gap-3 items-center">
                    <div className="relative w-12 h-12 shrink-0 bg-neutral-50 rounded border border-neutral-100 overflow-hidden flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imgUrl} alt={product?.name || "Produto"} className="object-cover w-full h-full" />
                    </div>
                    <div>
                      <p className="font-semibold text-primary leading-tight">{product?.name || "Produto"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Quantidade: {item.quantity} &bull; Preço unitário: {formatCurrency(Number(item.price))}
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold text-primary">
                    {formatCurrency(Number(item.price) * item.quantity)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Subtotals list */}
          <div className="border-t border-neutral-100 pt-4 space-y-2 text-xs text-neutral-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(Number(order.subtotal))}</span>
            </div>
            <div className="flex justify-between">
              <span>Taxa de Entrega</span>
              <span>{formatCurrency(Number(order.shipping_cost))}</span>
            </div>
            {Number(order.discount_amount) > 0 && (
              <div className="flex justify-between text-red-600 font-semibold">
                <span>Desconto</span>
                <span>-{formatCurrency(Number(order.discount_amount))}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-primary pt-2 border-t border-neutral-100">
              <span>Total Pago</span>
              <span>{formatCurrency(Number(order.total))}</span>
            </div>
          </div>
        </div>

        {/* Shipping & Payment summary */}
        <div className="space-y-6">
          {/* Shipping Detail widget */}
          <div className="border border-border p-5 rounded-[4px] bg-white space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary border-b border-neutral-100 pb-2">
              Detalhes de Entrega
            </h3>
            <div className="text-xs text-neutral-600 space-y-1.5">
              {isPickup ? (
                <div>
                  <p className="font-semibold text-primary">Levantamento na Loja Nura</p>
                  <p className="text-muted-foreground mt-1">
                    Pode levantar a sua encomenda na nossa loja física em Maputo Cidade assim que o estado estiver como {"\"Pronta para levantamento\""}.
                  </p>
                </div>
              ) : (
                <>
                  <p className="font-semibold text-primary">{order.shipping_address?.name}</p>
                  <p>{order.shipping_address?.street_address}</p>
                  <p>{order.shipping_address?.city}</p>
                  <p className="font-semibold uppercase tracking-wider text-[9px]">
                    {order.shipping_address?.province}
                  </p>
                  {order.shipping_address?.reference_point && (
                    <p className="text-[10px] text-muted-foreground italic mt-1.5 pt-1.5 border-t border-dashed border-neutral-100">
                      Ponto de referência: {order.shipping_address.reference_point}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Payment Detail & proof upload widget */}
          <div className="border border-border p-5 rounded-[4px] bg-white space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary border-b border-neutral-100 pb-2">
              Detalhes de Pagamento
            </h3>
            <div className="text-xs text-neutral-600 space-y-2">
              <p>
                Método de pagamento:{" "}
                <span className="font-semibold uppercase text-primary">
                  {order.payment_method === "mpesa" ? "M-Pesa" : order.payment_method === "store_credit" ? "Crédito da Loja" : "Outro"}
                </span>
              </p>

              {order.payment_method === "mpesa" && (
                <div className="space-y-3 pt-2">
                  {order.payment_receipt_url ? (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-sm text-green-700 flex items-center gap-2">
                      <FileCheck className="h-5 w-5 shrink-0" />
                      <div>
                        <p className="font-semibold text-[10px] uppercase">Comprovativo Enviado</p>
                        <a
                          href={order.payment_receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] underline text-green-800 hover:text-green-900"
                        >
                          Ver comprovativo carregado
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-sm text-amber-700 flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                        <div className="text-[10px]">
                          <p className="font-semibold uppercase">Falta o Comprovativo</p>
                          <p>Carregue a captura de ecrã ou o PDF do M-Pesa para que possamos validar e processar o envio.</p>
                        </div>
                      </div>

                      {uploadError && (
                        <p className="text-[10px] text-red-600 font-semibold">{uploadError}</p>
                      )}

                      {uploadSuccess && (
                        <p className="text-[10px] text-green-600 font-semibold">{uploadSuccess}</p>
                      )}

                      <label className="flex flex-col items-center justify-center border border-dashed border-border hover:border-primary/50 py-4 px-3 rounded-sm cursor-pointer hover:bg-neutral-50/50 transition-all text-center">
                        <Upload className="h-5 w-5 text-neutral-400 mb-1" />
                        <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                          {uploading ? "A carregar..." : "Carregar Comprovativo"}
                        </span>
                        <span className="text-[9px] text-muted-foreground mt-0.5">JPG, PNG, PDF (Máx 5MB)</span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleReceiptUpload}
                          disabled={uploading}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SUPPORT QUICK ACTIONS FOOTER */}
      <div className="border border-border p-5 rounded-[4px] bg-white space-y-4">
        <div className="border-b border-neutral-100 pb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">
            Precisa de ajuda com esta encomenda?
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Abra instantaneamente um pedido de suporte para reembolsos, devoluções ou reclamações.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            onClick={() => handleSupportAction("refund", "Solicitação de reembolso")}
            variant="outline"
            className="text-xs font-semibold uppercase tracking-wider h-9 rounded-sm border-neutral-200 hover:border-red-300 hover:text-red-600 cursor-pointer"
            disabled={submittingTicket}
          >
            Solicitar reembolso
          </Button>

          <Button
            onClick={() => handleSupportAction("return", "Solicitação de devolução")}
            variant="outline"
            className="text-xs font-semibold uppercase tracking-wider h-9 rounded-sm border-neutral-200 hover:border-primary cursor-pointer"
            disabled={submittingTicket}
          >
            Solicitar devolução
          </Button>

          <Button
            onClick={() => handleSupportAction("complaint", "Reclamação de encomenda")}
            variant="outline"
            className="text-xs font-semibold uppercase tracking-wider h-9 rounded-sm border-neutral-200 hover:border-amber-500 hover:text-amber-700 cursor-pointer"
            disabled={submittingTicket}
          >
            Fazer reclamação
          </Button>

          <Button
            onClick={() => handleSupportAction("delivery_issue", "Problema com entrega")}
            variant="outline"
            className="text-xs font-semibold uppercase tracking-wider h-9 rounded-sm border-neutral-200 hover:border-primary cursor-pointer"
            disabled={submittingTicket}
          >
            Problema com entrega
          </Button>

          <Button
            onClick={() => handleSupportAction("product_question", "Suporte geral")}
            variant="outline"
            className="text-xs font-semibold uppercase tracking-wider h-9 rounded-sm border-neutral-200 hover:border-primary cursor-pointer"
            disabled={submittingTicket}
          >
            Falar com suporte
          </Button>
        </div>
      </div>
    </div>
  );
}
