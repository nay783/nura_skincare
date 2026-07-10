"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Search, Eye, RefreshCw, MessageSquare, AlertCircle } from "lucide-react";
import { Input } from "@/components/shared/input";

const TICKET_STATUS_LABELS: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  resolved: "Resolvido",
  closed: "Fechado",
};

const TICKET_TYPE_LABELS: Record<string, string> = {
  refund: "Reembolso",
  return: "Devolução",
  complaint: "Reclamação",
  delivery_issue: "Problema de Entrega",
  product_question: "Dúvida sobre Produto",
};

export default function AdminTicketsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<any[]>([]);
  
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  // Tabs: 'all', 'open', 'in_progress', 'resolved', 'closed', 'refund', 'return', 'complaint', 'delivery_issue'

  const [errorMsg, setErrorMsg] = useState("");

  const loadTickets = async () => {
    setLoading(true);
    setErrorMsg("");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      router.push("/account");
      return;
    }

    // 1. Fetch profile
    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();
    setAdminProfile(prof);

    // 2. Fetch Tickets + Customer name + Assignee name
    const { data: tcks, error } = await supabase
      .from("tickets")
      .select(`
        *,
        customer:customer_id (
          first_name,
          last_name
        ),
        assignee:assigned_admin_id (
          first_name,
          last_name
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMsg("Erro ao carregar tickets: " + error.message);
    } else {
      setTickets(tcks || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTickets();
  }, [supabase]);

  // Apply filters
  useEffect(() => {
    let result = [...tickets];

    // Search query matches subject, customer name or ticket ID
    if (searchTerm.trim() !== "") {
      const q = searchTerm.toLowerCase();
      result = result.filter(t => 
        t.subject?.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.customer?.first_name?.toLowerCase().includes(q) ||
        t.customer?.last_name?.toLowerCase().includes(q)
      );
    }

    // Tab filter mappings
    if (activeTab === "open") {
      result = result.filter(t => t.status === "open");
    } else if (activeTab === "in_progress") {
      result = result.filter(t => t.status === "in_progress");
    } else if (activeTab === "resolved") {
      result = result.filter(t => t.status === "resolved");
    } else if (activeTab === "closed") {
      result = result.filter(t => t.status === "closed");
    } else if (activeTab === "refund") {
      result = result.filter(t => t.type === "refund");
    } else if (activeTab === "return") {
      result = result.filter(t => t.type === "return");
    } else if (activeTab === "complaint") {
      result = result.filter(t => t.type === "complaint");
    } else if (activeTab === "delivery_issue") {
      result = result.filter(t => t.type === "delivery_issue");
    }

    setFilteredTickets(result);
  }, [tickets, searchTerm, activeTab]);

  if (loading && tickets.length === 0) {
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
        <h1 className="text-3xl font-serif text-primary font-medium">Tickets de Suporte</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Responda a dúvidas de clientes, faça a gestão de devoluções e reembolsos pendentes.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border-l-2 border-red-500 text-red-700 text-xs rounded-sm">
          {errorMsg}
        </div>
      )}

      {/* FILTER TABS */}
      <div className="flex flex-wrap gap-1 border-b border-border text-xs">
        {[
          { id: "all", label: "Todos" },
          { id: "open", label: "Abertos" },
          { id: "in_progress", label: "Em Andamento" },
          { id: "resolved", label: "Resolvidos" },
          { id: "closed", label: "Fechados" },
          { id: "refund", label: "Reembolso" },
          { id: "return", label: "Devolução" },
          { id: "complaint", label: "Reclamação" },
          { id: "delivery_issue", label: "Envio" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-semibold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SEARCH BAR */}
      <div className="flex items-center gap-3 bg-white p-3 border border-border rounded-[4px] shadow-sm">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          type="text"
          placeholder="Pesquisar por assunto do ticket, ID ou nome do cliente..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="border-none p-0 focus:ring-0 focus:outline-none !h-auto text-sm w-full bg-transparent"
        />
        <button 
          onClick={loadTickets}
          className="p-1 hover:bg-neutral-50 rounded border border-border cursor-pointer text-primary shrink-0"
          title="Recarregar"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* TICKETS TABLE */}
      <div className="bg-white border border-border rounded-[4px] overflow-hidden shadow-sm">
        {filteredTickets.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground italic">
            Nenhum ticket de suporte encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 text-[10px] uppercase font-bold tracking-wider text-muted-foreground border-b border-border">
                  <th className="p-4">Assunto / Título</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Categoria</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4">Responsável</th>
                  <th className="p-4">Criado Em</th>
                  <th className="p-4 text-right">Conversa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs">
                {filteredTickets.map(ticket => {
                  const customerName = ticket.customer
                    ? `${ticket.customer.first_name || ""} ${ticket.customer.last_name || ""}`.trim()
                    : "Cliente";
                  
                  const assigneeName = ticket.assignee
                    ? `${ticket.assignee.first_name || ""} ${ticket.assignee.last_name || ""}`.trim()
                    : "Não atribuído";
                  
                  const isClosed = ticket.status === "closed" || ticket.status === "resolved";

                  return (
                    <tr key={ticket.id} className="hover:bg-neutral-50/50">
                      {/* Subject */}
                      <td className="p-4 font-semibold text-primary min-w-[200px]">
                        <Link href={`/admin/tickets/${ticket.id}`} className="hover:underline">
                          {ticket.subject}
                        </Link>
                        <span className="block font-mono text-[9px] text-muted-foreground mt-0.5">ID: #{ticket.id.slice(0, 8).toUpperCase()}</span>
                      </td>

                      {/* Customer */}
                      <td className="p-4 font-medium text-primary">{customerName}</td>

                      {/* Category */}
                      <td className="p-4 font-medium text-muted-foreground">
                        {TICKET_TYPE_LABELS[ticket.type] || ticket.type}
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <span className={`inline-block text-[9px] font-bold uppercase px-2 py-0.5 rounded-sm ${
                          ticket.status === "open"
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : ticket.status === "in_progress"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-neutral-100 text-neutral-500"
                        }`}>
                          {TICKET_STATUS_LABELS[ticket.status] || ticket.status}
                        </span>
                      </td>

                      {/* Assignee */}
                      <td className="p-4 text-muted-foreground font-medium">{assigneeName}</td>

                      {/* Date */}
                      <td className="p-4 text-muted-foreground">
                        {new Date(ticket.created_at).toLocaleDateString("pt-MZ")}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <Link
                          href={`/admin/tickets/${ticket.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center p-1.5 hover:bg-neutral-100 text-primary border border-border rounded"
                          title="Responder ao Ticket"
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
