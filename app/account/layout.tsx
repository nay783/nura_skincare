"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { LogOut, User as UserIcon, Settings, ShoppingBag, MessageSquare } from "lucide-react";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setLoading(false);
    }
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/account");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center bg-[#FAF9F6] min-h-screen">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If user is not logged in, we let the pages render directly (so page.tsx renders the auth forms)
  if (!user) {
    return <>{children}</>;
  }

  const navItems = [
    { name: "Resumo", href: "/account", icon: UserIcon },
    { name: "Definições", href: "/account/settings", icon: Settings },
    { name: "Encomendas", href: "/account/orders", icon: ShoppingBag },
    { name: "Suporte", href: "/account/support", icon: MessageSquare },
  ];

  return (
    <div className="bg-[#FAF9F6] min-h-screen py-10 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Account Sidebar Navigation */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-[4px] border border-border">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-primary/70 mb-4">
                A Minha Conta
              </h2>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  // Active state matches exact path or subroutes
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/account" && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-2.5 text-sm rounded-[4px] transition-all ${
                        isActive
                          ? "bg-primary text-white font-medium"
                          : "text-primary hover:bg-neutral-50"
                      }`}
                    >
                      <Icon className="h-4 w-4 stroke-[1.5]" />
                      {item.name}
                    </Link>
                  );
                })}
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50/50 rounded-[4px] transition-all cursor-pointer text-left font-sans"
                >
                  <LogOut className="h-4 w-4 stroke-[1.5]" />
                  Terminar sessão
                </button>
              </nav>
            </div>
          </div>

          {/* Account Content Panel */}
          <div className="lg:col-span-3">
            <div className="bg-white p-6 sm:p-8 rounded-[4px] border border-border min-h-[400px]">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
