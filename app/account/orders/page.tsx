"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ShoppingBag, ChevronRight, ImageOff } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ProductImage } from "@/components/product/ProductImage";

interface OrderProduct {
  id: string;
  name: string;
  images: string[] | null;
}

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  products: OrderProduct | null;
}

interface Order {
  id: string;
  created_at: string;
  total: number;
  payment_status: string;
  status: string;
  payment_receipt_url: string | null;
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

export default function OrdersPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    async function loadOrders() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/account");
        return;
      }

      // Fetch all orders of the user including order items and product info
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          created_at,
          total,
          payment_status,
          status,
          payment_receipt_url,
          order_items (
            id,
            quantity,
            price,
            products (
              id,
              name,
              images
            )
          )
        `)
        .eq("customer_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao carregar encomendas:", error.message);
      } else {
        setOrders((data || []) as unknown as Order[]);
      }
      setLoading(false);
    }
    loadOrders();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center min-h-[300px]">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      <div>
        <h1 className="text-3xl font-serif text-primary mb-2">As Minhas Encomendas</h1>
        <p className="text-xs text-muted-foreground">
          Consulte o histórico de compras, estados de pagamento, envio e peça reembolsos ou devoluções.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="border border-dashed border-border p-12 rounded-[4px] text-center bg-white space-y-4">
          <ShoppingBag className="h-8 w-8 stroke-[1.2] text-neutral-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="font-medium text-primary text-base">Ainda não fez nenhuma encomenda</h3>
            <p className="text-xs text-muted-foreground">
              Explore a nossa loja de K-Beauty e descubra as melhores fórmulas coreanas.
            </p>
          </div>
          <Link
            href="/products"
            className="inline-flex h-10 items-center justify-center px-6 bg-primary text-white text-xs font-semibold uppercase tracking-wider rounded-sm transition-all"
          >
            Começar a comprar
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const items = order.order_items || [];
            const firstItemProduct = items[0]?.products;
            
            // Image fallback prioritizing main_image_url
            const firstItemImage = firstItemProduct?.images?.[0] || "/images/placeholder-product.jpg";

            return (
              <div
                key={order.id}
                className="border border-border rounded-[4px] bg-white overflow-hidden hover:border-primary/30 transition-all flex flex-col md:flex-row justify-between"
              >
                {/* Left side: Order Info & Product details */}
                <div className="p-5 flex gap-4 items-start flex-1">
                  {/* Item Image Thumbnail */}
                  <div className="relative w-16 h-16 shrink-0 bg-neutral-50 rounded-sm border border-neutral-100 overflow-hidden flex items-center justify-center">
                    {firstItemProduct ? (
                      <ProductImage
                        product={{
                          id: firstItemProduct.id,
                          name: firstItemProduct.name,
                          slug: "", // slug is not in OrderProduct interface but ProductImage requires it. We can map or set it to empty
                          images: firstItemProduct.images || [],
                        }}
                        alt={firstItemProduct.name}
                        fill
                        sizes="64px"
                      />
                    ) : (
                      <ImageOff className="h-4 w-4 stroke-[1.2] text-neutral-300" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-semibold text-primary text-sm">
                      Encomenda #{order.id.slice(0, 8).toUpperCase()}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Realizada em: {new Date(order.created_at).toLocaleDateString("pt-MZ")}
                    </p>
                    <p className="text-xs text-neutral-600 font-medium">
                      {items.length === 1
                        ? `${items[0]?.quantity}x ${firstItemProduct?.name || "Produto"}`
                        : `${items[0]?.quantity}x ${firstItemProduct?.name || "Produto"} e mais ${items.length - 1} ${
                            items.length - 1 === 1 ? "item" : "itens"
                          }`}
                    </p>
                    <p className="text-xs font-semibold text-primary pt-1">
                      Total: {formatCurrency(Number(order.total))}
                    </p>
                  </div>
                </div>

                {/* Right side: Status tags & details link */}
                <div className="border-t md:border-t-0 md:border-l border-border p-5 bg-neutral-50/50 min-w-[200px] flex md:flex-col justify-between md:justify-center md:items-end gap-4 items-center">
                  <div className="flex flex-col md:items-end text-[10px] uppercase font-semibold tracking-wider gap-1">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-sm ${
                        order.payment_status === "approved"
                          ? "bg-green-50 text-green-700 border border-green-200/50"
                          : order.payment_status === "rejected"
                          ? "bg-red-50 text-red-700 border border-red-200/50"
                          : order.payment_receipt_url
                          ? "bg-blue-50 text-blue-700 border border-blue-200/50"
                          : "bg-amber-50 text-amber-700 border border-amber-200/50"
                      }`}
                    >
                      {order.payment_status === "approved"
                        ? "Pago"
                        : order.payment_status === "rejected"
                        ? "Rejeitado"
                        : order.payment_receipt_url
                        ? "Em confirmação"
                        : "A aguardar pagamento"}
                    </span>
                    <span className="text-muted-foreground px-2">
                      {DELIVERY_LABELS[order.status] || "Recebida"}
                    </span>
                  </div>

                  <Link
                    href={`/account/orders/${order.id}`}
                    className="inline-flex h-9 items-center justify-center px-4 bg-white hover:bg-neutral-50 border border-border text-primary text-xs font-semibold uppercase tracking-wider rounded-sm transition-all gap-1"
                  >
                    Ver detalhes <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
