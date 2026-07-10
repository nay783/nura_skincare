"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Search, Eye, RefreshCw, UserCheck } from "lucide-react";
import { Input } from "@/components/shared/input";
import { formatCurrency } from "@/lib/utils";

export default function AdminCustomersPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  const loadCustomers = async () => {
    setLoading(true);
    setErrorMsg("");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      router.push("/account");
      return;
    }

    // 1. Fetch Profile
    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();
    setAdminProfile(prof);

    // 2. Fetch Customers + Nested Orders & Tickets
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select(`
        id,
        first_name,
        last_name,
        phone,
        created_at,
        role,
        orders (
          total,
          status,
          payment_status
        ),
        tickets (
          status
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMsg("Erro ao carregar clientes: " + error.message);
    } else {
      // Process metrics for each customer profile
      const processed = (profiles || [])
        .filter(p => p.role === "customer") // Exclude admin accounts
        .map(p => {
          const ords = p.orders || [];
          const tcks = p.tickets || [];
          
          const ordersCount = ords.length;
          const totalSpent = ords
            .filter((o: any) => o.payment_status === "approved" || o.status === "delivered")
            .reduce((sum: number, o: any) => sum + Number(o.total), 0);
          
          const openTicketsCount = tcks.filter((t: any) => t.status === "open" || t.status === "in_progress").length;

          return {
            ...p,
            ordersCount,
            totalSpent,
            openTicketsCount
          };
        });
      setCustomers(processed);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCustomers();
  }, [supabase]);

  // Apply search query filters
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredCustomers(customers);
    } else {
      const q = searchTerm.toLowerCase();
      const result = customers.filter(c => 
        (c.first_name || "").toLowerCase().includes(q) ||
        (c.last_name || "").toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q)
      );
      setFilteredCustomers(result);
    }
  }, [customers, searchTerm]);

  if (loading && customers.length === 0) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-neutral-200 w-1/4 rounded" />
        <div className="h-64 bg-neutral-200 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      <div>
        <h1 className="text-3xl font-serif text-primary font-medium">Clientes</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Inspecione as contas de utilizadores registados, histórico de compras acumulado e saldo de crédito na loja.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border-l-2 border-red-500 text-red-700 text-xs rounded-sm">
          {errorMsg}
        </div>
      )}

      {/* SEARCH BAR */}
      <div className="flex items-center gap-3 bg-white p-3 border border-border rounded-[4px] shadow-sm">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          type="text"
          placeholder="Pesquisar cliente por nome ou número de WhatsApp..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="border-none p-0 focus:ring-0 focus:outline-none !h-auto text-sm w-full bg-transparent"
        />
        <button 
          onClick={loadCustomers}
          className="p-1 hover:bg-neutral-50 rounded border border-border cursor-pointer text-primary shrink-0"
          title="Recarregar"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* CUSTOMERS TABLE */}
      <div className="bg-white border border-border rounded-[4px] overflow-hidden shadow-sm">
        {filteredCustomers.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground italic">
            Nenhum cliente registado encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 text-[10px] uppercase font-bold tracking-wider text-muted-foreground border-b border-border">
                  <th className="p-4">Nome completo</th>
                  <th className="p-4">Contacto</th>
                  <th className="p-4">Registado Em</th>
                  <th className="p-4 text-center">Nº Encomendas</th>
                  <th className="p-4 text-right">Total Gasto</th>
                  <th className="p-4 text-center">Tickets Abertos</th>
                  <th className="p-4 text-right">Ficha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs">
                {filteredCustomers.map(customer => {
                  const name = `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "Cliente Sem Nome";
                  return (
                    <tr key={customer.id} className="hover:bg-neutral-50/50">
                      {/* Name */}
                      <td className="p-4 font-semibold text-primary">
                        {name}
                      </td>

                      {/* Phone */}
                      <td className="p-4 text-muted-foreground font-medium">
                        {customer.phone || "N/A"}
                      </td>

                      {/* Created date */}
                      <td className="p-4 text-muted-foreground">
                        {new Date(customer.created_at).toLocaleDateString("pt-MZ")}
                      </td>

                      {/* Orders Count */}
                      <td className="p-4 text-center font-semibold text-primary">
                        {customer.ordersCount}
                      </td>

                      {/* Total spent */}
                      <td className="p-4 text-right font-semibold text-primary">
                        {formatCurrency(customer.totalSpent)}
                      </td>

                      {/* Open tickets */}
                      <td className="p-4 text-center">
                        <span className={`inline-block font-semibold ${customer.openTicketsCount > 0 ? "text-red-600 font-bold" : "text-primary"}`}>
                          {customer.openTicketsCount}
                        </span>
                      </td>

                      {/* Link to detail */}
                      <td className="p-4 text-right">
                        <Link
                          href={`/admin/customers/${customer.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center p-1.5 hover:bg-neutral-100 text-primary border border-border rounded"
                          title="Ficha do Cliente"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
