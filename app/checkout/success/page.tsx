"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, MessageCircle, ShoppingBag } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { logRecommendationEvent } from "@/lib/recommendations";
import { useEffect } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();

  const orderId = searchParams.get("orderId") || "#000";
  const totalVal = parseFloat(searchParams.get("total") || "0");
  const delivery = searchParams.get("delivery") || "entrega";
  const payment = searchParams.get("payment") || "mpesa";
  const creditVal = parseFloat(searchParams.get("credit") || "0");
  const remainingVal = parseFloat(searchParams.get("remaining") || "0");
  const name = searchParams.get("name") || "";
  const hasProof = searchParams.get("proof") === "true";

  // Log purchase events for products in this order
  useEffect(() => {
    async function logPurchase() {
      if (orderId && orderId !== "#000") {
        try {
          const supabase = createClient();
          const { data: items } = await supabase
            .from("order_items")
            .select("product_id")
            .eq("order_id", orderId);
          
          if (items && items.length > 0) {
            for (const item of items) {
              if (item.product_id) {
                await logRecommendationEvent(supabase, "purchase", item.product_id, { orderId });
              }
            }
          }
        } catch (err) {
          console.error("Erro ao logar compra para recomendador:", err);
        }
      }
    }
    logPurchase();
  }, [orderId]);

  // Prefilled WhatsApp message
  const whatsappMsg = `Olá Nura, acabei de criar a encomenda ${orderId} no valor de ${formatCurrency(totalVal)}. O meu nome é ${name}. Gostaria de confirmar a encomenda.`;
  const whatsappUrl = `https://wa.me/258840000000?text=${encodeURIComponent(whatsappMsg)}`;

  return (
    <div className="max-w-2xl mx-auto border border-border p-8 md:p-12 bg-white rounded-sm text-center space-y-8 font-sans">
      
      {/* Check Icon */}
      <div className="p-4 bg-emerald-50 text-emerald-600 inline-block rounded-full">
        <CheckCircle2 className="h-12 w-12 stroke-[1.5]" />
      </div>

      {/* Hero Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-serif text-primary tracking-tight">Encomenda recebida!</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Muito obrigado, {name}. A sua encomenda foi criada com sucesso no nosso sistema.
        </p>
      </div>

      {/* Order Info Invoice */}
      <div className="border border-border rounded-sm divide-y divide-border bg-background text-left text-xs leading-relaxed text-muted-foreground p-6 space-y-4">
        <div className="flex justify-between font-semibold text-primary text-sm pb-2">
          <span>Detalhes da Encomenda</span>
          <span>{orderId}</span>
        </div>
        
        <div className="pt-3 space-y-2">
          <div className="flex justify-between">
            <span>Método de Recepção:</span>
            <span className="text-primary font-medium uppercase tracking-wider">{delivery === "entrega" ? "Entrega ao domicílio" : "Levantamento em Loja"}</span>
          </div>

          <div className="flex justify-between">
            <span>Método de Pagamento:</span>
            <span className="text-primary font-medium uppercase tracking-wider">
              {payment === "mpesa" ? "M-Pesa manual" : payment === "credito" ? "Crédito da loja" : "Pagar no levantamento"}
            </span>
          </div>

          {creditVal > 0 && (
            <div className="flex justify-between text-secondary">
              <span>Crédito da Loja Aplicado:</span>
              <span>-{formatCurrency(creditVal)}</span>
            </div>
          )}

          <div className="flex justify-between text-primary font-bold text-sm pt-2 border-t border-border/50">
            <span>Total:</span>
            <span>{formatCurrency(remainingVal)}</span>
          </div>
        </div>
      </div>

      {/* Next steps instruction alerts */}
      <div className="bg-amber-50 border border-amber-100 p-6 rounded-sm text-left text-xs text-muted-foreground space-y-3 leading-relaxed">
        <h4 className="font-semibold text-primary uppercase tracking-wider">Próximos Passos:</h4>
        {payment === "mpesa" && (
          <>
            {hasProof ? (
              <p>
                ✓ <strong>Comprovativo recebido:</strong> Já anexou o seu comprovativo M-Pesa. A nossa equipa administrativa irá validar a transferência e começará a preparar os seus produtos.
              </p>
            ) : (
              <p>
                ! <strong>Comprovativo em falta:</strong> Por favor, envie o valor de <strong>{formatCurrency(remainingVal)}</strong> para o número M-Pesa da Nura e envie o comprovativo pelo WhatsApp para acelerar a confirmação.
              </p>
            )}
          </>
        )}
        {payment === "credito" && (
          <p>
            ✓ <strong>Pagamento por Crédito:</strong> O crédito da loja foi aplicado. {remainingVal > 0 ? `Por favor, faça o envio da diferença de ${formatCurrency(remainingVal)} via M-Pesa e anexe o comprovativo.` : "A encomenda está totalmente liquidada e em fase de preparação."}
          </p>
        )}
        {payment === "levantamento_cash" && (
          <p>
            ✓ <strong>Pagamento no Ponto de Recolha:</strong> A sua encomenda foi reservada. Por favor, desloque-se ao nosso ponto de recolha em Maputo no horário agendado para efetuar o pagamento e levantar a encomenda.
          </p>
        )}
        <p>
          Entraremos em contacto via WhatsApp ou e-mail para coordenar os detalhes finais de envio e entrega.
        </p>
      </div>

      {/* Action triggers */}
      <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 items-center justify-center gap-2 px-6 bg-[#25D366] text-white text-xs font-semibold uppercase tracking-wider hover:bg-opacity-95 transition-all rounded-sm shadow-sm"
        >
          <MessageCircle className="h-4 w-4" />
          Confirmar no WhatsApp
        </a>
        <Link
          href="/products"
          className="inline-flex h-12 items-center justify-center gap-2 px-6 border border-border text-xs font-semibold uppercase tracking-wider text-primary hover:border-primary transition-all rounded-sm bg-white"
        >
          <ShoppingBag className="h-4 w-4" />
          Continuar a comprar
        </Link>
      </div>

    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 w-full font-sans">
      <Suspense fallback={<div className="text-center py-12 text-xs text-muted-foreground uppercase tracking-widest">A carregar detalhes da fatura...</div>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
