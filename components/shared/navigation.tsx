"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ShoppingBag, User, Search, Menu, X, MessageCircle } from "lucide-react";
import { useCart } from "@/components/cart/cart-context";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const { cartCount } = useCart();

  // Prefilled WhatsApp message
  const whatsappUrl = "https://wa.me/258840000000?text=Ol%C3%A1%20Nura%2C%20gostaria%20de%20obter%20recomenda%C3%A7%C3%B5es%20de%20skincare%20personalizadas.";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-glass transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          
          {/* Logo / Brand */}
          <div className="flex shrink-0">
            <Link href="/" className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.jpg"
                alt="Nura Skincare Logo"
                className="h-9 w-auto rounded-sm object-contain"
              />
              <div className="flex flex-col leading-none">
                <span className="font-serif text-lg font-bold tracking-wider text-primary">
                  NURA
                </span>
                <span className="text-[9px] font-sans tracking-widest text-accent uppercase font-semibold">
                  Skincare
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex space-x-8">
            <Link
              href="/products"
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              Loja
            </Link>
            <Link
              href="/#skin-goals"
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              Objectivos da Pele
            </Link>
            <Link
              href="/products?brand=true"
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              Marcas
            </Link>
            <Link
              href="/blog"
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              Blog
            </Link>
            <Link
              href="/#delivery-info"
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              Entregas
            </Link>
          </nav>

          {/* Desktop Utilities */}
          <div className="hidden lg:flex items-center space-x-5">
            <Link
              href="/products?search=open"
              className="text-foreground hover:text-primary transition-colors p-1"
              aria-label="Pesquisar produtos"
            >
              <Search className="h-5 w-5 stroke-[1.5]" />
            </Link>
            <Link
              href="/account"
              className="text-foreground hover:text-primary transition-colors p-1"
              aria-label="A minha conta"
            >
              <User className="h-5 w-5 stroke-[1.5]" />
            </Link>
            <Link
              href="/cart"
              className="text-foreground hover:text-primary transition-colors p-1 relative"
              aria-label="Carrinho de compras"
            >
              <ShoppingBag className="h-5 w-5 stroke-[1.5]" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-semibold text-white">
                  {cartCount}
                </span>
              )}
            </Link>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-primary text-xs font-semibold text-primary hover:bg-primary hover:text-white transition-all rounded-sm uppercase tracking-wider"
            >
              <MessageCircle className="h-4 w-4" />
              Falar no WhatsApp
            </a>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden items-center space-x-4">
            <Link
              href="/cart"
              className="text-foreground hover:text-primary transition-colors p-1 relative"
              aria-label="Carrinho de compras"
            >
              <ShoppingBag className="h-5 w-5 stroke-[1.5]" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-semibold text-white">
                  {cartCount}
                </span>
              )}
            </Link>

            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-foreground hover:text-primary focus:outline-none"
              aria-controls="mobile-menu"
              aria-expanded={isOpen}
            >
              {isOpen ? (
                <X className="block h-6 w-6 stroke-[1.5]" />
              ) : (
                <Menu className="block h-6 w-6 stroke-[1.5]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="lg:hidden border-b border-border bg-background" id="mobile-menu">
          <div className="space-y-1 px-4 pt-2 pb-4">
            <Link
              href="/products"
              onClick={() => setIsOpen(false)}
              className="block rounded-md px-3 py-2 text-base font-medium text-foreground hover:text-primary hover:bg-muted"
            >
              Loja
            </Link>
            <Link
              href="/#skin-goals"
              onClick={() => setIsOpen(false)}
              className="block rounded-md px-3 py-2 text-base font-medium text-foreground hover:text-primary hover:bg-muted"
            >
              Objectivos da Pele
            </Link>
            <Link
              href="/products?brand=true"
              onClick={() => setIsOpen(false)}
              className="block rounded-md px-3 py-2 text-base font-medium text-foreground hover:text-primary hover:bg-muted"
            >
              Marcas
            </Link>
            <Link
              href="/blog"
              onClick={() => setIsOpen(false)}
              className="block rounded-md px-3 py-2 text-base font-medium text-foreground hover:text-primary hover:bg-muted"
            >
              Blog
            </Link>
            <Link
              href="/#delivery-info"
              onClick={() => setIsOpen(false)}
              className="block rounded-md px-3 py-2 text-base font-medium text-foreground hover:text-primary hover:bg-muted"
            >
              Entregas
            </Link>
            
            <hr className="border-border my-2" />
            
            <Link
              href="/products?search=open"
              onClick={() => setIsOpen(false)}
              className="flex items-center rounded-md px-3 py-2 text-base font-medium text-foreground hover:text-primary hover:bg-muted"
            >
              <Search className="h-5 w-5 mr-3 stroke-[1.5]" />
              Pesquisar
            </Link>
            
            <Link
              href="/account"
              onClick={() => setIsOpen(false)}
              className="flex items-center rounded-md px-3 py-2 text-base font-medium text-foreground hover:text-primary hover:bg-muted"
            >
              <User className="h-5 w-5 mr-3 stroke-[1.5]" />
              A Minha Conta
            </Link>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center rounded-md px-3 py-2 text-base font-medium text-primary hover:bg-muted"
            >
              <MessageCircle className="h-5 w-5 mr-3 stroke-[1.5]" />
              Falar no WhatsApp
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="bg-white border-t border-border mt-auto font-sans">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.jpg"
                alt="Nura Skincare Logo"
                className="h-8 w-auto rounded-sm object-contain"
              />
              <div className="flex flex-col leading-none">
                <span className="font-serif text-base font-bold tracking-wider text-primary">
                  NURA
                </span>
                <span className="text-[8px] font-sans tracking-widest text-accent uppercase font-semibold">
                  Skincare
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Experiência premium de cuidados para a pele coreana em Moçambique.
              Fórmulas limpas, pele radiante.
            </p>
          </div>

          {/* Links Section 1 */}
          <div>
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
              Navegação
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/products" className="text-sm text-muted-foreground hover:text-primary">
                  Todos os Produtos
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-sm text-muted-foreground hover:text-primary">
                  Journal / Blog
                </Link>
              </li>
              <li>
                <Link href="/#skin-goals" className="text-sm text-muted-foreground hover:text-primary">
                  Objectivos da Pele
                </Link>
              </li>
            </ul>
          </div>

          {/* Links Section 2 */}
          <div>
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
              Conta e Ajuda
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/account" className="text-sm text-muted-foreground hover:text-primary">
                  A Minha Conta
                </Link>
              </li>
              <li>
                <Link href="/account/orders" className="text-sm text-muted-foreground hover:text-primary">
                  Encomendas
                </Link>
              </li>
              <li>
                <Link href="/account/support" className="text-sm text-muted-foreground hover:text-primary">
                  Suporte & Reclamações
                </Link>
              </li>
            </ul>
          </div>

          {/* Info section */}
          <div>
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
              Localização & Contacto
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Maputo, Moçambique</li>
              <li>Contacto: info@nura.co.mz</li>
              <li className="pt-2 text-xs text-accent font-medium">
                Levantamento em Loja Disponível
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Nura Skincare. Todos os direitos reservados.
          </p>
          <p className="text-xs text-muted-foreground mt-4 md:mt-0">
            Criado com foco em simplicidade, luxo e eficácia.
          </p>
        </div>
      </div>
    </footer>
  );
}
