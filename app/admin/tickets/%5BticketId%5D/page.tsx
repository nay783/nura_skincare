"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ChevronLeft, Send, Paperclip, CheckCircle, XCircle, AlertCircle, User, FileText, MessageSquare } from "lucide-react";
import { Button } from "@/components/shared/button";
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

export default function AdminTicketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const ticketId = params.ticketId as string;
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [ticket, setTicket] = useState<any>(null);
  
  // Conversation thread & replies
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);

  // Administrative assignees
  const [adminsList, setAdminsList] = useState<any[]>([]);
  const [assigneeId, setAssigneeId] = useState("");
  const [statusVal, setStatusVal] = useState("");

  // Feedbacks
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const loadTicketData = async (isSilent = false) => {
    if (!ticketId) return;
    if (!isSilent) setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      router.push("/account");
      return;
    }

    if (!isSilent) {
      // 1. Fetch admin profile
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      setAdminProfile(prof);
    }

    // 2. Fetch Ticket
    const { data: tck, error } = await supabase
      .from("tickets")
      .select(`
        *,
        customer:customer_id (
          id,
          first_name,
          last_name,
          phone,
          email
        )
      `)
      .eq("id", ticketId)
      .maybeSingle();

    if (error || !tck) {
      setErrorMsg("Erro ao carregar ticket.");
      setLoading(false);
      return;
    }

    setTicket(tck);
    setAssigneeId(tck.assigned_admin_id || "");
    setStatusVal(tck.status);

    // 3. Fetch Ticket messages
    const { data: msgs } = await supabase
      .from("ticket_messages")
      .select(`
        *,
        sender:sender_id (
          first_name,
          last_name,
          role
        )
      `)
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    setMessages(msgs || []);

    if (!isSilent) {
      // 4. Fetch list of admins for assignment
      const { data: adms } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("role", ["admin", "master_admin"])
        .order("first_name", { ascending: true });
      setAdminsList(adms || []);
    }

    if (!isSilent) setLoading(false);
  };

  useEffect(() => {
    loadTicketData();
  }, [ticketId, supabase]);

  // Scroll to chat bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Polling loop every 10s for new messages
  useEffect(() => {
    const timer = setInterval(() => {
      loadTicketData(true);
    }, 10000);
    return () => clearInterval(timer);
  }, [ticketId]);

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (replyText.trim() === "" && attachments.length === 0) return;

    const hasReplyPermission = adminProfile?.role === "master_admin" || 
      (Array.isArray(adminProfile?.scopes) && adminProfile.scopes.includes("tickets.reply"));

    if (!hasReplyPermission) {
      setErrorMsg("Não tem permissão para responder a tickets (tickets.reply em falta).");
      return;
    }

    setSubmittingReply(true);
    setErrorMsg("");

    try {
      const { error } = await supabase
        .from("ticket_messages")
        .insert({
          ticket_id: ticketId,
          sender_id: adminProfile.id,
          message: replyText.trim(),
          attachments,
        });

      if (error) throw error;

      // Update ticket status to awaiting client if open
      if (ticket.status === "open") {
        await supabase
          .from("tickets")
          .update({ status: "in_progress" })
          .eq("id", ticketId);
      }

      // Log action
      await supabase.from("audit_logs").insert({
        admin_id: adminProfile.id,
        action: "ticket.replied",
        entity_type: "ticket",
        entity_id: ticketId,
      });

      setReplyText("");
      setAttachments([]);
      await loadTicketData(true);
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao enviar resposta.");
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleAssignTicket = async (val: string) => {
    setSuccessMsg("");
    setErrorMsg("");

    const hasAssignPermission = adminProfile?.role === "master_admin" || 
      (Array.isArray(adminProfile?.scopes) && adminProfile.scopes.includes("tickets.assign"));

    if (!hasAssignPermission) {
      setErrorMsg("Não tem permissão para atribuir tickets (tickets.assign em falta).");
      return;
    }

    try {
      const targetId = val === "" ? null : val;
      const { error } = await supabase
        .from("tickets")
        .update({ assigned_admin_id: targetId })
        .eq("id", ticketId);

      if (error) throw error;

      // Log action
      await supabase.from("audit_logs").insert({
        admin_id: adminProfile.id,
        action: "ticket.assigned",
        entity_type: "ticket",
        entity_id: ticketId,
        metadata: { assigned_admin_id: targetId }
      });

      setAssigneeId(val);
      setSuccessMsg("Ticket atribuído com sucesso!");
      await loadTicketData(true);
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao atribuir ticket.");
    }
  };

  const handleUpdateStatus = async (val: string) => {
    setSuccessMsg("");
    setErrorMsg("");

    const hasClosePermission = adminProfile?.role === "master_admin" || 
      (Array.isArray(adminProfile?.scopes) && adminProfile.scopes.includes("tickets.close"));

    if (!hasClosePermission && (val === "closed" || val === "resolved")) {
      setErrorMsg("Não tem permissão para fechar/resolver tickets (tickets.close em falta).");
      return;
    }

    try {
      const { error } = await supabase
        .from("tickets")
        .update({ status: val })
        .eq("id", ticketId);

      if (error) throw error;

      // Log action
      await supabase.from("audit_logs").insert({
        admin_id: adminProfile.id,
        action: `ticket.status_${val}`,
        entity_type: "ticket",
        entity_id: ticketId,
        metadata: { status: val }
      });

      setStatusVal(val);
      setSuccessMsg(`Estado do ticket actualizado para ${TICKET_STATUS_LABELS[val]}!`);
      await loadTicketData(true);
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao actualizar estado do ticket.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setErrorMsg("");

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `tickets/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("support-attachments")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("support-attachments")
        .getPublicUrl(filePath);

      setAttachments(prev => [...prev, publicUrl]);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Erro no upload do anexo: " + err.message);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-neutral-200 w-1/4 rounded" />
        <div className="h-64 bg-neutral-200 rounded" />
      </div>
    );
  }

  if (!ticket && !loading) {
    return (
      <div className="p-8 text-center text-xs text-muted-foreground italic">
        Ticket não encontrado.
        <div className="mt-4">
          <Link href="/admin/tickets" className="text-primary hover:underline">
            Voltar para Tickets
          </Link>
        </div>
      </div>
    );
  }

  const customerName = ticket.customer
    ? `${ticket.customer.first_name || ""} ${ticket.customer.last_name || ""}`.trim()
    : "Cliente";

  const hasReplyPermission = adminProfile?.role === "master_admin" || 
    (Array.isArray(adminProfile?.scopes) && adminProfile.scopes.includes("tickets.reply"));

  return (
    <div className="space-y-8 font-sans pb-12">
      {/* Navigation header */}
      <div className="flex items-center gap-2">
        <Link
          href="/admin/tickets"
          className="p-1.5 hover:bg-white rounded border border-border text-primary cursor-pointer transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-serif text-primary font-medium">Ticket: {ticket.subject}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            ID: #{ticket.id.toUpperCase()} &bull; Categoria: {TICKET_TYPE_LABELS[ticket.type]}
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-green-50 border-l-2 border-green-500 text-green-700 text-xs rounded-sm">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-50 border-l-2 border-red-500 text-red-700 text-xs rounded-sm">
          {errorMsg}
        </div>
      )}

      {/* Main chat and stats split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* LEFT COLUMN (2 spans): Conversational Chat thread */}
        <div className="lg:col-span-2 bg-white border border-border rounded-[4px] shadow-sm flex flex-col h-[600px]">
          {/* Chat Header */}
          <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50 shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary/70" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Conversa de Apoio</span>
            </div>
            <span className={`inline-block text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm ${
              ticket.status === "open"
                ? "bg-green-50 text-green-700 border border-green-200"
                : ticket.status === "in_progress"
                ? "bg-blue-50 text-blue-700 border border-blue-200"
                : "bg-neutral-100 text-neutral-500"
            }`}>
              {TICKET_STATUS_LABELS[ticket.status] || ticket.status}
            </span>
          </div>

          {/* Chat Messages Stream */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-neutral-50/30">
            {messages.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-12">Nenhuma mensagem neste ticket.</p>
            ) : (
              messages.map(msg => {
                // If sender has admin role, position on right
                const isStaff = msg.sender?.role === "admin" || msg.sender?.role === "master_admin";
                const senderName = isStaff 
                  ? `Equipa Nura (${msg.sender?.first_name || "Gestor"})` 
                  : customerName;

                return (
                  <div key={msg.id} className={`flex ${isStaff ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-sm p-3.5 space-y-2 text-xs shadow-sm border ${
                      isStaff 
                        ? "bg-primary text-white border-primary" 
                        : "bg-white text-primary border-border"
                    }`}>
                      <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-1 text-[9px] uppercase tracking-wider font-bold">
                        <span className={isStaff ? "text-neutral-200" : "text-muted-foreground"}>{senderName}</span>
                        <span className={isStaff ? "text-neutral-300" : "text-muted-foreground"}>
                          {new Date(msg.created_at).toLocaleTimeString("pt-MZ", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                      
                      {/* Attachments rendering */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="space-y-1.5 border-t border-white/10 pt-2">
                          <p className="text-[8px] uppercase tracking-widest font-bold">Anexos:</p>
                          <div className="flex flex-wrap gap-2">
                            {msg.attachments.map((url: string, index: number) => (
                              <a
                                key={index}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className={`inline-block p-1 border rounded-sm hover:underline font-medium text-[10px] ${
                                  isStaff 
                                    ? "bg-white/10 border-white/20 text-white" 
                                    : "bg-neutral-50 border-border text-primary"
                                }`}
                              >
                                Anexo #{index + 1}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Reply Form */}
          {ticket.status !== "closed" && hasReplyPermission ? (
            <form onSubmit={handlePostReply} className="p-4 border-t border-neutral-100 bg-white space-y-3 shrink-0">
              {/* Selected attachments listing */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 text-[10px]">
                  {attachments.map((url, idx) => (
                    <div key={idx} className="bg-neutral-50 border border-border px-2 py-1 rounded flex items-center gap-1.5">
                      <span className="truncate max-w-[120px] font-medium text-muted-foreground">{url}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(idx)}
                        className="text-red-600 hover:text-red-800 font-bold cursor-pointer"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                {/* Paperclip attachment button */}
                <div className="relative shrink-0">
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploadingFile || submittingReply}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    title="Adicionar anexo"
                  />
                  <button
                    type="button"
                    className="p-2 border border-border rounded hover:bg-neutral-50 text-muted-foreground cursor-pointer"
                    disabled={uploadingFile || submittingReply}
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                </div>

                <Input
                  type="text"
                  placeholder="Escreva a sua resposta..."
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  disabled={submittingReply}
                  className="flex-1 !h-10 text-xs"
                />

                <Button
                  type="submit"
                  disabled={submittingReply || (replyText.trim() === "" && attachments.length === 0)}
                  variant="primary"
                  className="h-10 w-10 p-0 rounded-sm shrink-0 flex items-center justify-center cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          ) : (
            <div className="p-4 border-t border-neutral-100 bg-neutral-50 text-center text-xs text-muted-foreground italic shrink-0">
              {!hasReplyPermission 
                ? "Não tem permissão para responder a tickets (tickets.reply em falta)." 
                : "Este ticket foi fechado e não aceita mais mensagens."}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Assignment, status selectors & order associations */}
        <div className="space-y-6">
          
          {/* Assignment panel */}
          <div className="bg-white border border-border p-5 rounded-[4px] space-y-4 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary border-b border-neutral-100 pb-2">
              Atribuição & Gestão
            </h3>

            {/* Assignee select */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                Responsável pelo Ticket
              </label>
              <select
                value={assigneeId}
                onChange={e => handleAssignTicket(e.target.value)}
                className="w-full h-10 px-3 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary rounded-sm font-sans"
              >
                <option value="">Não Atribuído</option>
                {adminsList.map(adm => {
                  const name = `${adm.first_name || ""} ${adm.last_name || ""}`.trim();
                  return (
                    <option key={adm.id} value={adm.id}>{name}</option>
                  );
                })}
              </select>
            </div>

            {/* Ticket status controls */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                Alterar Estado
              </label>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus("in_progress")}
                  className={`h-9 border text-[10px] font-bold uppercase tracking-wider rounded-sm cursor-pointer transition-colors ${
                    statusVal === "in_progress"
                      ? "bg-primary text-white border-primary"
                      : "bg-white border-border text-primary hover:bg-neutral-50"
                  }`}
                >
                  Em Andamento
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus("resolved")}
                  className={`h-9 border text-[10px] font-bold uppercase tracking-wider rounded-sm cursor-pointer transition-colors ${
                    statusVal === "resolved"
                      ? "bg-primary text-white border-primary"
                      : "bg-white border-border text-primary hover:bg-neutral-50"
                  }`}
                >
                  Resolvido
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus("closed")}
                  className={`h-9 border text-[10px] font-bold uppercase tracking-wider rounded-sm cursor-pointer transition-colors ${
                    statusVal === "closed"
                      ? "bg-primary text-white border-primary"
                      : "bg-white border-border text-primary hover:bg-neutral-50"
                  }`}
                >
                  Fechado
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus("open")}
                  className={`h-9 border text-[10px] font-bold uppercase tracking-wider rounded-sm cursor-pointer transition-colors ${
                    statusVal === "open"
                      ? "bg-primary text-white border-primary"
                      : "bg-white border-border text-primary hover:bg-neutral-50"
                  }`}
                >
                  Reabrir
                </button>
              </div>
            </div>
          </div>

          {/* Customer profile card */}
          <div className="bg-white border border-border p-5 rounded-[4px] space-y-3 shadow-sm text-xs">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary border-b border-neutral-100 pb-2 flex items-center gap-1.5">
              <User className="h-4 w-4 text-primary/70" />
              Informação do Cliente
            </h3>

            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Cliente:</p>
              <Link href={`/admin/customers/${ticket.customer?.id}`} className="font-semibold text-primary hover:underline">
                {customerName}
              </Link>
            </div>

            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">WhatsApp:</p>
              <p className="font-medium text-primary">{ticket.customer?.phone || "N/A"}</p>
            </div>

            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Email:</p>
              <p className="font-medium text-primary">{ticket.customer?.email || "Sem Email"}</p>
            </div>

            {/* WhatsApp direct external communication trigger */}
            {ticket.customer?.phone && (
              <div className="pt-2">
                <a
                  href={`https://wa.me/${ticket.customer.phone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full h-9 border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 transition-colors text-[10px] font-bold uppercase tracking-wider flex items-center justify-center rounded-sm"
                >
                  Contactar via WhatsApp
                </a>
              </div>
            )}
          </div>

          {/* Order association card */}
          {ticket.order_id && (
            <div className="bg-white border border-border p-5 rounded-[4px] space-y-3 shadow-sm text-xs">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-primary border-b border-neutral-100 pb-2 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-primary/70" />
                Encomenda Associada
              </h3>
              
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Número Encomenda:</p>
                <Link href={`/admin/orders/${ticket.order_id}`} className="font-semibold text-primary hover:underline font-mono">
                  #{ticket.order_id.slice(0, 8).toUpperCase()}
                </Link>
              </div>

              <div>
                <Link 
                  href={`/admin/orders/${ticket.order_id}`} 
                  className="text-xs text-primary hover:underline font-semibold block"
                >
                  Inspecionar detalhes da encomenda &rarr;
                </Link>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
