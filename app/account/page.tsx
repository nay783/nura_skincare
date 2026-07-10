"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { ShoppingBag, MessageSquare, MapPin, Phone, CreditCard, ChevronRight, User as UserIcon } from "lucide-react";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";
import { formatCurrency } from "@/lib/utils";

interface UserProfile {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
}

interface Address {
  street_address: string;
  city: string;
  province: string;
}

interface Order {
  id: string;
  created_at: string;
  total: number;
  payment_status: string;
  status: string;
}

interface Ticket {
  id: string;
  subject: string;
  type: string;
  status: string;
  updated_at: string;
}

// Status mappings for Mozambique labels
const PAYMENT_LABELS: Record<string, string> = {
  pending: "A aguardar pagamento",
  approved: "Pago",
  rejected: "Rejeitado",
  refunded: "Reembolsado",
};

const DELIVERY_LABELS: Record<string, string> = {
  pending: "Recebida",
  paid: "Em preparação",
  shipped: "Em entrega",
  delivered: "Entregue",
  cancelled: "Cancelada",
  refunded: "Reembolsada",
};

export default function AccountPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  // Authenticated State Data
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [openTickets, setOpenTickets] = useState<Ticket[]>([]);
  const [storeCredit, setStoreCredit] = useState<number>(0);

  // Form inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [authError, setAuthError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAccountData = useCallback(async (userId: string) => {
    try {
      // 1. Fetch Profile
      const { data: prof } = await supabase
        .from("profiles")
        .select("first_name, last_name, phone")
        .eq("id", userId)
        .single();
      setProfile(prof as UserProfile);

      // 2. Fetch Default Address
      const { data: addr } = await supabase
        .from("addresses")
        .select("street_address, city, province")
        .eq("profile_id", userId)
        .eq("is_default", true)
        .maybeSingle();
      setAddress(addr as Address);

      // 3. Fetch Recent Orders (latest 3)
      const { data: ords } = await supabase
        .from("orders")
        .select("id, created_at, total, payment_status, status")
        .eq("customer_id", userId)
        .order("created_at", { ascending: false })
        .limit(3);
      setRecentOrders((ords || []) as Order[]);

      // 4. Fetch Open Tickets
      const { data: tcks } = await supabase
        .from("tickets")
        .select("id, subject, type, status, updated_at")
        .eq("customer_id", userId)
        .in("status", ["open", "in_progress"]);
      setOpenTickets((tcks || []) as Ticket[]);

      // 5. Fetch Store Credit
      const { data: credits } = await supabase
        .from("store_credits")
        .select("amount")
        .eq("profile_id", userId);
      
      const totalCredit = (credits || []).reduce((sum, item) => sum + Number(item.amount), 0);
      setStoreCredit(totalCredit);
    } catch (err) {
      console.error("Erro ao carregar dados da conta:", err);
    }
  }, [supabase]);

  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      if (session?.user) {
        await fetchAccountData(session.user.id);
      }
      setLoading(false);
    }
    checkSession();
  }, [supabase, fetchAccountData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setActionLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setAuthError("Credenciais inválidas. Por favor, tente novamente.");
      } else if (data.user) {
        setUser(data.user);
        await fetchAccountData(data.user.id);
        router.refresh();
      }
    } catch {
      setAuthError("Ocorreu um erro ao entrar. Tente novamente.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setActionLoading(true);

    if (!fullName.trim()) {
      setAuthError("O nome completo é obrigatório.");
      setActionLoading(false);
      return;
    }

    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: phone || null,
            role: "customer",
          },
        },
      });

      if (error) {
        setAuthError(error.message || "Erro ao criar conta. Tente outro email.");
      } else if (data.user) {
        setUser(data.user);
        await fetchAccountData(data.user.id);
        router.refresh();
      }
    } catch {
      setAuthError("Ocorreu um erro ao registar. Tente novamente.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // --- UNAUTHENTICATED STATE (AUTH FORMS) ---
  if (!user) {
    return (
      <div className="py-12 max-w-md mx-auto px-4 sm:px-6 font-sans">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif text-primary mb-3">A Minha Conta</h1>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
            Entre na sua conta para ver as suas encomendas, actualizar dados e acompanhar pedidos de suporte.
          </p>
        </div>

        <div className="bg-white p-6 border border-border rounded-[4px]">
          {/* Tabs */}
          <div className="flex border-b border-border mb-6">
            <button
              onClick={() => {
                setActiveTab("login");
                setAuthError("");
              }}
              className={`flex-1 pb-3 text-xs font-semibold uppercase tracking-wider text-center border-b-2 cursor-pointer transition-all ${
                activeTab === "login" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => {
                setActiveTab("register");
                setAuthError("");
              }}
              className={`flex-1 pb-3 text-xs font-semibold uppercase tracking-wider text-center border-b-2 cursor-pointer transition-all ${
                activeTab === "register" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
              }`}
            >
              Criar conta
            </button>
          </div>

          {authError && (
            <div className="mb-4 p-3 bg-red-50 border-l-2 border-red-500 text-red-600 text-xs rounded-sm">
              {authError}
            </div>
          )}

          {activeTab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-primary mb-1.5">
                  Email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@nura.co.mz"
                  required
                  className="w-full !h-10 text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-primary mb-1.5">
                  Palavra-passe
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Introduza a sua palavra-passe"
                  required
                  className="w-full !h-10 text-sm"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full h-10 text-xs rounded-sm uppercase tracking-wider font-semibold mt-6"
                disabled={actionLoading}
              >
                {actionLoading ? "A processar..." : "Entrar"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-primary mb-1.5">
                  Nome Completo
                </label>
                <Input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome e apelido"
                  required
                  className="w-full !h-10 text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-primary mb-1.5">
                  Email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@nura.co.mz"
                  required
                  className="w-full !h-10 text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-primary mb-1.5">
                  Número de WhatsApp
                </label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 840000000"
                  className="w-full !h-10 text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-primary mb-1.5">
                  Palavra-passe
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  min={6}
                  className="w-full !h-10 text-sm"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full h-10 text-xs rounded-sm uppercase tracking-wider font-semibold mt-6"
                disabled={actionLoading}
              >
                {actionLoading ? "A criar conta..." : "Criar conta"}
              </Button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // --- AUTHENTICATED STATE (ACCOUNT SUMMARY) ---
  const displayName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name || ""}`.trim()
    : user.email?.split("@")[0];

  return (
    <div className="space-y-8 font-sans">
      {/* Header Widget */}
      <div className="border-b border-border pb-6">
        <h1 className="text-3xl font-serif text-primary mb-2">Olá, {displayName}</h1>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Aqui pode acompanhar as suas encomendas, actualizar os seus dados e falar com a equipa da Nura.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Summary Widget */}
        <div className="border border-border p-5 rounded-[4px] bg-white space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-2">
              <UserIcon className="h-4 w-4 stroke-[1.5]" />
              Dados do Perfil
            </h3>
            <div className="text-sm space-y-1.5 text-neutral-600">
              <p className="font-semibold text-primary">{displayName}</p>
              <p className="text-xs">{user.email}</p>
              {profile?.phone && (
                <p className="text-xs flex items-center gap-1.5 pt-1">
                  <Phone className="h-3.5 w-3.5 stroke-[1.2] text-muted-foreground" />
                  {profile.phone}
                </p>
              )}
              {address ? (
                <p className="text-xs flex items-start gap-1.5 pt-1.5 border-t border-neutral-100 mt-2">
                  <MapPin className="h-3.5 w-3.5 stroke-[1.2] text-muted-foreground mt-0.5" />
                  <span>
                    {address.street_address}, {address.city}
                    <br />
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      {address.province}
                    </span>
                  </span>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground italic pt-1.5 border-t border-neutral-100 mt-2">
                  Nenhuma morada principal guardada.
                </p>
              )}
            </div>
          </div>
          <Link
            href="/account/settings"
            className="inline-flex h-9 items-center justify-center px-4 border border-border text-primary hover:bg-neutral-50 text-xs font-semibold uppercase tracking-wider rounded-sm transition-all"
          >
            Editar dados
          </Link>
        </div>

        {/* Store Credit Widget */}
        <div className="border border-border p-5 rounded-[4px] bg-white space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-2">
              <CreditCard className="h-4 w-4 stroke-[1.5]" />
              Crédito da Loja
            </h3>
            <div className="py-2">
              <span className="text-3xl font-serif text-primary font-medium">
                {formatCurrency(storeCredit)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              O crédito da loja pode ser usado em compras futuras como desconto no checkout.
            </p>
          </div>
          <Link
            href="/products"
            className="inline-flex h-9 items-center justify-center px-4 bg-primary text-white text-xs font-semibold uppercase tracking-wider rounded-sm transition-all"
          >
            Usar crédito na loja
          </Link>
        </div>
      </div>

      {/* Recent Orders Widget */}
      <div className="border border-border p-5 rounded-[4px] bg-white space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 stroke-[1.5]" />
            Encomendas Recentes
          </h3>
          <Link
            href="/account/orders"
            className="text-xs text-primary hover:underline flex items-center gap-0.5 font-medium"
          >
            Ver todas <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-xs text-muted-foreground italic mb-4">Ainda não tem encomendas.</p>
            <Link
              href="/products"
              className="inline-flex h-9 items-center justify-center px-4 bg-primary text-white text-xs font-semibold uppercase tracking-wider rounded-sm transition-all"
            >
              Ver produtos
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {recentOrders.map((order) => (
              <div key={order.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-semibold text-primary">
                    Encomenda #{order.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString("pt-MZ")} &bull;{" "}
                    {formatCurrency(Number(order.total))}
                  </p>
                </div>
                <div className="flex items-center gap-3 justify-between sm:justify-end">
                  <div className="flex flex-col items-end text-[10px] uppercase font-semibold tracking-wider gap-0.5">
                    <span className={order.payment_status === "approved" ? "text-green-600" : "text-amber-600"}>
                      {PAYMENT_LABELS[order.payment_status] || "Pendente"}
                    </span>
                    <span className="text-muted-foreground">
                      {DELIVERY_LABELS[order.status] || "Recebida"}
                    </span>
                  </div>
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="p-1.5 hover:bg-neutral-50 rounded border border-border text-xs font-semibold uppercase tracking-wider text-primary"
                  >
                    Detalhes
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Open Support Tickets Widget */}
      <div className="border border-border p-5 rounded-[4px] bg-white space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-2">
            <MessageSquare className="h-4 w-4 stroke-[1.5]" />
            Suporte e Reclamações
          </h3>
          <Link
            href="/account/support"
            className="text-xs text-primary hover:underline flex items-center gap-0.5 font-medium"
          >
            Ir para Suporte <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {openTickets.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-xs text-muted-foreground italic mb-4">Não tem pedidos de suporte abertos.</p>
            <Link
              href="/account/support"
              className="inline-flex h-9 items-center justify-center px-4 border border-border text-primary hover:bg-neutral-50 text-xs font-semibold uppercase tracking-wider rounded-sm transition-all"
            >
              Abrir pedido de suporte
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {openTickets.map((ticket) => (
              <div key={ticket.id} className="py-3.5 flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-semibold text-primary">{ticket.subject}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">
                    Categoria: {ticket.type} &bull; Estado: {ticket.status === "open" ? "Aberto" : "A aguardar"}
                  </p>
                </div>
                <Link
                  href={`/account/support/${ticket.id}`}
                  className="p-1.5 hover:bg-neutral-50 rounded border border-border text-xs font-semibold uppercase tracking-wider text-primary"
                >
                  Ver conversa
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
