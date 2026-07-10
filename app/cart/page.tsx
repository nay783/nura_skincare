"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Trash2, ShoppingBag, Plus, Minus, ArrowRight, Truck } from "lucide-react";
import { useCart } from "@/components/cart/cart-context";
import { formatCurrency } from "@/lib/utils";
import RecommendationsWidget from "@/components/shared/RecommendationsWidget";

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, cartSubtotal, cartCount } = useCart();

  if (cart.length === 0) {
    return (
      <div className="py-20 text-center max-w-md mx-auto px-4 font-sans space-y-6">
        <div className="p-4 bg-muted inline-block rounded-full">
          <ShoppingBag className="h-8 w-8 stroke-[1.2] text-neutral-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-serif text-primary">O seu carrinho está vazio</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Ainda não adicionou produtos ao seu carrinho. Explore a nossa gama de produtos selecionados de K-Beauty.
          </p>
        </div>
        <Link
          href="/products"
          className="inline-flex h-11 items-center justify-center px-8 bg-primary text-white text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-opacity-95 transition-all"
        >
          Ver produtos
        </Link>
      </div>
    );
  }

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full font-sans">
      <h1 className="text-3xl font-serif text-primary tracking-tight mb-8">
        O seu Carrinho
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        
        {/* Left Side: Items list */}
        <div className="lg:col-span-8 space-y-4">
          <div className="border border-border rounded-sm bg-white divide-y divide-border">
            {cart.map((item) => (
              <div key={item.id} className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                
                {/* Product Thumbnail */}
                <div className="relative h-20 w-20 bg-muted rounded-sm overflow-hidden shrink-0 border border-border">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                    {item.brand}
                  </span>
                  <Link href={`/products/${item.slug}`} className="block">
                    <h3 className="font-serif text-base text-primary hover:text-secondary transition-all line-clamp-1">
                      {item.name}
                    </h3>
                  </Link>
                  <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                </div>

                {/* Controls & Price */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-4 pt-4 sm:pt-0 border-t border-border/50 sm:border-none">
                  
                  {/* Quantity adjustment */}
                  <div className="flex items-center border border-border rounded-sm bg-white">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center text-primary hover:bg-muted transition-all"
                      aria-label="Diminuir quantidade"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-8 text-center text-xs font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center text-primary hover:bg-muted transition-all"
                      aria-label="Aumentar quantidade"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Pricing and Delete */}
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-primary">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-neutral-400 hover:text-red-600 transition-colors p-1"
                      aria-label="Remover produto"
                    >
                      <Trash2 className="h-4 w-4 stroke-[1.5]" />
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Order Summary */}
        <div className="lg:col-span-4 space-y-6">
          <div className="border border-border p-6 bg-white rounded-sm space-y-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-primary pb-2 border-b border-border">
              Resumo da Encomenda
            </h2>

            <div className="space-y-4">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Produtos ({cartCount})</span>
                <span className="font-medium text-primary">{formatCurrency(cartSubtotal)}</span>
              </div>
              
              <div className="flex justify-between text-xs text-muted-foreground pb-2 border-b border-border">
                <span>Entrega</span>
                <span>Calculada no checkout</span>
              </div>

              <div className="flex justify-between items-baseline pt-2">
                <span className="text-sm font-semibold text-primary">Subtotal</span>
                <span className="text-lg font-bold text-primary">{formatCurrency(cartSubtotal)}</span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/checkout"
                className="w-full h-11 bg-primary text-white text-xs font-semibold uppercase tracking-wider hover:bg-opacity-95 transition-all rounded-sm flex items-center justify-center gap-2"
              >
                Finalizar compra
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Delivery Policy Note */}
          <div className="border border-border p-4 rounded-sm bg-glass flex gap-3 text-xs text-muted-foreground">
            <Truck className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-primary">Informação de Entrega</p>
              <p className="leading-relaxed">
                As entregas são coordenadas individualmente após a receção do pagamento. Entregas em Maputo decorrem normalmente no dia útil seguinte.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Personalized Recommendations */}
      <div className="mt-16 border-t border-border pt-8">
        <RecommendationsWidget placement="cart" limit={4} />
      </div>
    </div>
  );
}
