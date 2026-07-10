"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  LayoutDashboard, ShoppingBag, FileText, Users, 
  MessageSquare, BookOpen, BarChart2, Shield, Settings, 
  LogOut, Menu, X, User as UserIcon, AlertCircle 
} from "lucide-react";

interface UserProfile {
  id: string;
  role: "customer" | "admin" | "master_admin";
  first_name: string | null;
  last_name: string | null;
  scopes: string[];
}

const NAVIGATION_ITEMS = [
  { name: "Painel", href: "/admin", icon: LayoutDashboard, scope: null },
  { name: "Produtos", href: "/admin/products", icon: ShoppingBag, scope: "products.read" },
  { name: "Encomendas", href: "/admin/orders", icon: FileText, scope: "orders.read" },
  { name: "Clientes", href: "/admin/customers", icon: Users, scope: "customers.read" },
  { name: "Tickets", href: "/admin/tickets", icon: MessageSquare, scope: "tickets.read" },
  { name: "Blog", href: "/admin/blog", icon: BookOpen, scope: "blog.read" },
  { name: "Analytics", href: "/admin/analytics", icon: BarChart2, scope: "analytics.read" },
  { name: "Administradores", href: "/admin/admins", icon: Shield, scope: "admins.read" },
  { name: "Definições", href: "/admin/settings", icon: Settings, scope: "settings.read" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/account");
        return;
      }

      const { data: prof, error } = await supabase
        .from("profiles")
        .select("id, role, first_name, last_name, scopes")
        .eq("id", session.user.id)
        .single();

      if (error || !prof || (prof.role !== "admin" && prof.role !== "master_admin")) {
        setProfile(null);
      } else {
        setProfile(prof as UserProfile);
      }
      setLoading(false);
    }
    checkAdmin();
  }, [supabase, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/account");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // --- ACCESS DENIED RENDER ---
  if (!profile) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white border border-border p-8 rounded-[4px] text-center space-y-4 shadow-sm">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto" />
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-primary font-serif">Acesso Negado</h1>
            <p className="text-xs text-muted-foreground">
              Não tem permissão para aceder à plataforma de administração. Esta área é restrita a administradores autorizados.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center px-6 bg-primary text-white text-xs font-semibold uppercase tracking-wider rounded-sm transition-all"
            >
              Voltar à Loja
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Filter navigation items matching scopes
  const visibleNavItems = NAVIGATION_ITEMS.filter((item) => {
    if (item.scope === null) return true;
    if (profile.role === "master_admin") return true;
    return Array.isArray(profile.scopes) && profile.scopes.includes(item.scope);
  });

  const displayName = profile.first_name
    ? `${profile.first_name} ${profile.last_name || ""}`.trim()
    : "Administrador";

  return (
    <div className="bg-neutral-100 min-h-screen flex font-sans">
      {/* 1. Desktop Sidebar Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-primary text-white shrink-0 border-r border-primary/20">
        {/* Logo block */}
        <div className="h-16 px-6 border-b border-white/10 flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.jpg"
            alt="Nura Skincare Logo"
            className="h-8 w-auto rounded-sm object-contain brightness-0 invert"
          />
          <span className="font-serif font-semibold text-base tracking-wider text-white">
            NURA <span className="text-[9px] uppercase font-sans tracking-widest text-neutral-300">Painel</span>
          </span>
        </div>

        {/* User Block */}
        <div className="p-4 border-b border-white/10 bg-black/10 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center text-sm font-semibold">
            {displayName[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold truncate leading-tight">{displayName}</p>
            <p className="text-[10px] text-neutral-300 uppercase tracking-wider font-semibold mt-0.5">
              {profile.role === "master_admin" ? "Master Admin" : "Gestor"}
            </p>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-sm transition-all ${
                  isActive
                    ? "bg-white/15 text-white"
                    : "text-neutral-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 stroke-[1.5]" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="p-4 border-t border-white/10 bg-black/10">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-300 hover:text-red-400 transition-colors cursor-pointer text-left"
          >
            <LogOut className="h-4 w-4 shrink-0 stroke-[1.5]" />
            Sair do Painel
          </button>
        </div>
      </aside>

      {/* 2. Main content container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar header */}
        <header className="h-16 bg-white border-b border-border px-4 lg:px-8 flex items-center justify-between z-10 shrink-0">
          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 hover:bg-neutral-50 rounded border border-border text-primary cursor-pointer"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="hidden lg:inline text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Área de Gestão
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-primary">{displayName}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">
                {profile.role === "master_admin" ? "Master Admin" : "Gestor"}
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold font-serif border border-primary/20">
              {displayName[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content viewport */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* 3. Mobile Navigation Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-black/50 backdrop-blur-[1px]">
          <div className="w-64 bg-primary text-white flex flex-col h-full animate-in slide-in-from-left duration-200">
            {/* Logo block */}
            <div className="h-16 px-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.jpg"
                  alt="Nura Skincare Logo"
                  className="h-7 w-auto rounded-sm object-contain brightness-0 invert"
                />
                <span className="font-serif font-semibold text-sm tracking-wider text-white">
                  NURA PAINEL
                </span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded text-neutral-300 hover:text-white cursor-pointer"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* User Block */}
            <div className="p-4 border-b border-white/10 bg-black/10 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-white/15 flex items-center justify-center text-xs font-semibold">
                {displayName[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-semibold truncate leading-none">{displayName}</p>
                <p className="text-[9px] text-neutral-300 uppercase tracking-widest mt-1">
                  {profile.role === "master_admin" ? "Master Admin" : "Gestor"}
                </p>
              </div>
            </div>

            {/* Navigation links */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {visibleNavItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/admin" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-sm transition-all ${
                      isActive
                        ? "bg-white/15 text-white"
                        : "text-neutral-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 stroke-[1.5]" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Footer log out */}
            <div className="p-4 border-t border-white/10 bg-black/10">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-300 hover:text-red-400 transition-colors cursor-pointer text-left"
              >
                <LogOut className="h-4 w-4 shrink-0 stroke-[1.5]" />
                Sair do Painel
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}
    </div>
  );
}
