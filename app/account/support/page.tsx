"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MessageSquare, Plus, X, Upload, ChevronRight, HelpCircle } from "lucide-react";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";
import { formatCurrency } from "@/lib/utils";

interface Ticket {
  id: string;
  subject: string;
  type: string;
  status: string;
  updated_at: string;
  orders: {
    id: string;
  } | null;
}

interface Order {
  id: string;
  total: number;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  refund: "Reembolso",
  return: "Devolução",
  complaint: "Reclamação",
  delivery_issue: "Problema com entrega",
  product_question: "Dúvida sobre produto",
  payment_issue: "Problema com pagamento",
  other: "Outro",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  resolved: "Resolvido",
  closed: "Fechado",
};

export default function SupportPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  
  // Filtering
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Create Ticket Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("product_question");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [message, setMessage] = useState("");
  
  // File Upload State
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/account");
        return;
      }
      setUserId(session.user.id);

      // Fetch Tickets
      const { data: tcks, error: tckError } = await supabase
        .from("tickets")
        .select(`
          id,
          subject,
          type,
          status,
          updated_at,
          orders (
            id
          )
        `)
        .eq("customer_id", session.user.id)
        .order("updated_at", { ascending: false });

      if (tckError) console.error(tckError);
      setTickets((tcks || []) as unknown as Ticket[]);

      // Fetch past orders to link
      const { data: ords } = await supabase
        .from("orders")
        .select("id, total, created_at")
        .eq("customer_id", session.user.id)
        .order("created_at", { ascending: false });
      setOrders((ords || []) as Order[]);

      setLoading(false);
    }
    loadData();
  }, [supabase, router]);

  // Handle Form Attachment Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    if (!allowedTypes.includes(selectedFile.type)) {
      setFormError("Formato de anexo não suportado. Use JPG, PNG ou PDF.");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setFormError("O anexo deve ser menor que 5MB.");
      return;
    }

    setFormError("");
    setFile(selectedFile);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    if (!subject.trim() || !message.trim()) {
      setFormError("O assunto e a mensagem são obrigatórios.");
      setSubmitting(false);
      return;
    }

    try {
      let attachmentUrl = "";

      // 1. Upload attachment if present
      if (file) {
        setUploading(true);
        const fileExt = file.name.split(".").pop();
        const fileName = `${userId}/${Date.now()}_attachment.${fileExt}`;
        const filePath = `support/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("support-attachments")
          .upload(filePath, file, { contentType: file.type });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("support-attachments")
          .getPublicUrl(filePath);

        attachmentUrl = publicUrl;
        setUploading(false);
      }

      // 2. Insert Ticket
      const { data: ticket, error: ticketError } = await supabase
        .from("tickets")
        .insert({
          customer_id: userId,
          order_id: selectedOrderId || null,
          type: category,
          subject: subject.trim(),
          status: "open",
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // 3. Insert Initial Ticket Message
      const { error: msgError } = await supabase
        .from("ticket_messages")
        .insert({
          ticket_id: ticket.id,
          sender_id: userId,
          message: message.trim(),
          attachments: attachmentUrl ? [attachmentUrl] : [],
        });

      if (msgError) throw msgError;

      // Close modal, clean state and redirect
      setIsModalOpen(false);
      setSubject("");
      setMessage("");
      setFile(null);
      setSelectedOrderId("");
      router.push(`/account/support/${ticket.id}`);
    } catch (err: unknown) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : "Erro ao abrir o pedido de suporte. Tente novamente.";
      setFormError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter logic
  const filteredTickets = tickets.filter((tck) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "open") return tck.status === "open" || tck.status === "in_progress";
    return tck.status === statusFilter;
  });

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center min-h-[300px]">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      {/* Page Title & Intro */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-border pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-serif text-primary mb-2">Suporte & Reclamações</h1>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-lg">
            Acompanhe pedidos de suporte, reclamações, devoluções e reembolsos num só lugar.
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          variant="primary"
          className="h-10 text-xs font-semibold uppercase tracking-wider rounded-sm flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Abrir Pedido
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-neutral-100 pb-3 gap-2 overflow-x-auto">
        {[
          { name: "Todos", value: "all" },
          { name: "Abertos", value: "open" },
          { name: "Resolvidos", value: "resolved" },
          { name: "Fechados", value: "closed" },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-1.5 text-xs rounded-sm border transition-all cursor-pointer ${
              statusFilter === tab.value
                ? "bg-primary text-white border-primary"
                : "bg-transparent text-primary border-border hover:border-primary/50"
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* Ticket List View */}
      {filteredTickets.length === 0 ? (
        <div className="border border-dashed border-border p-12 rounded-[4px] text-center bg-white space-y-4">
          <MessageSquare className="h-8 w-8 stroke-[1.2] text-neutral-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="font-medium text-primary text-base">Nenhum pedido de suporte</h3>
            <p className="text-xs text-muted-foreground">
              Se tiver dúvidas ou problemas com encomendas, estamos aqui para ajudar.
            </p>
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            variant="outline"
            className="h-10 text-xs font-semibold uppercase tracking-wider rounded-sm cursor-pointer"
          >
            Criar primeiro pedido
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map((tck) => {
            const isClosed = tck.status === "closed";
            const isResolved = tck.status === "resolved";
            const relativeOrder = tck.orders?.id
              ? `Enc. #${tck.orders.id.slice(0, 8).toUpperCase()}`
              : null;

            return (
              <div
                key={tck.id}
                className="border border-border rounded-[4px] bg-white p-5 hover:border-primary/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <span
                    className={`inline-block text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm ${
                      isClosed || isResolved
                        ? "bg-neutral-100 text-neutral-500"
                        : "bg-green-50 text-green-700 border border-green-200/50"
                    }`}
                  >
                    {STATUS_LABELS[tck.status] || tck.status}
                  </span>
                  <h3 className="font-semibold text-primary text-sm leading-snug">{tck.subject}</h3>
                  <div className="flex flex-wrap gap-x-3 text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
                    <span>Categoria: {CATEGORY_LABELS[tck.type] || tck.type}</span>
                    {relativeOrder && (
                      <span className="text-primary/70 font-semibold border-l border-neutral-200 pl-3">
                        {relativeOrder}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 justify-between sm:justify-end border-t border-dashed border-neutral-100 pt-3 sm:pt-0 sm:border-0">
                  <span className="text-[10px] text-muted-foreground">
                    Actualizado: {new Date(tck.updated_at).toLocaleDateString("pt-MZ")}
                  </span>
                  <Link
                    href={`/account/support/${tck.id}`}
                    className="inline-flex h-9 items-center justify-center px-4 bg-neutral-50 hover:bg-neutral-100/50 border border-border text-primary text-xs font-semibold uppercase tracking-wider rounded-sm transition-all gap-1"
                  >
                    Ver Conversa <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE TICKET MODAL OVERLAY */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[1px]">
          <div className="bg-white rounded-[4px] border border-border w-full max-w-lg shadow-xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border bg-neutral-50/50">
              <h3 className="text-sm font-serif font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-primary/70" />
                Novo Pedido de Suporte
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setFormError("");
                }}
                className="p-1 rounded text-neutral-400 hover:text-primary transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateTicket} className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
              {formError && (
                <div className="p-3 bg-red-50 border-l-2 border-red-500 text-red-700 text-xs rounded-sm">
                  {formError}
                </div>
              )}

              {/* Category */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-primary mb-1.5">
                  Categoria
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-border focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm rounded-sm"
                >
                  <option value="product_question">Dúvida sobre produto</option>
                  <option value="refund">Solicitação de reembolso</option>
                  <option value="return">Solicitação de devolução</option>
                  <option value="complaint">Fazer uma reclamação</option>
                  <option value="delivery_issue">Problema com entrega</option>
                  <option value="payment_issue">Problema com pagamento</option>
                  <option value="other">Outro assunto</option>
                </select>
              </div>

              {/* Linked Order */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-primary mb-1.5">
                  Encomenda relacionada (Opcional)
                </label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-border focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm rounded-sm text-neutral-600"
                >
                  <option value="">Nenhuma encomenda relacionada</option>
                  {orders.map((ord) => (
                    <option key={ord.id} value={ord.id}>
                      #{ord.id.slice(0, 8).toUpperCase()} - {formatCurrency(Number(ord.total))} ({new Date(ord.created_at).toLocaleDateString("pt-MZ")})
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-primary mb-1.5">
                  Assunto
                </label>
                <Input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ex: Atraso no envio / Troca de produto"
                  required
                  className="w-full !h-10 text-sm"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-primary mb-1.5">
                  Mensagem detalhada
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Descreva o seu problem ou dúvida em detalhe..."
                  required
                  className="w-full p-3 border border-border focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm rounded-sm font-sans"
                />
              </div>

              {/* File Attachment Upload */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-primary mb-1.5">
                  Anexar Ficheiro (Opcional)
                </label>
                <label className="flex items-center gap-3 border border-dashed border-border hover:border-primary/50 py-3 px-4 rounded-sm cursor-pointer hover:bg-neutral-50/50 transition-all">
                  <Upload className="h-5 w-5 text-neutral-400 shrink-0" />
                  <div className="text-left">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                      {file ? file.name : "Seleccionar Ficheiro"}
                    </p>
                    <p className="text-[9px] text-muted-foreground">JPG, PNG ou PDF (Máx 5MB)</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Buttons Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100 mt-6">
                <Button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setFormError("");
                  }}
                  variant="outline"
                  className="h-10 px-5 text-xs font-semibold uppercase tracking-wider rounded-sm cursor-pointer"
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="h-10 px-6 text-xs font-semibold uppercase tracking-wider rounded-sm cursor-pointer"
                  disabled={submitting}
                >
                  {submitting ? (uploading ? "A carregar..." : "A enviar...") : "Abrir pedido"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
