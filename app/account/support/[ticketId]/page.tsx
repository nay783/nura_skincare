"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ChevronLeft, Paperclip, RefreshCw } from "lucide-react";
import { Button } from "@/components/shared/button";

interface PageProps {
  params: Promise<{ ticketId: string }>;
}

interface TicketMessage {
  id: string;
  sender_id: string;
  message: string;
  attachments: string[];
  created_at: string;
}

interface Ticket {
  id: string;
  subject: string;
  type: string;
  status: string;
  created_at: string;
  updated_at: string;
  orders: {
    id: string;
    total: number;
    created_at: string;
  } | null;
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

export default function TicketDetailPage({ params }: PageProps) {
  const resolvedParams = React.use(params);
  const ticketId = resolvedParams.ticketId;
  const router = useRouter();
  const supabase = createClient();
  const threadEndRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);

  // Reply state
  const [replyText, setReplyText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  const fetchTicketAndMessages = useCallback(async (uId: string) => {
    try {
      // 1. Fetch Ticket
      const { data: tck, error: tckError } = await supabase
        .from("tickets")
        .select(`
          id,
          subject,
          type,
          status,
          created_at,
          updated_at,
          orders (
            id,
            total,
            created_at
          )
        `)
        .eq("id", ticketId)
        .eq("customer_id", uId)
        .maybeSingle();

      if (tckError || !tck) {
        console.error("Erro ao buscar ticket:", tckError?.message);
        router.push("/account/support");
        return;
      }
      setTicket(tck as unknown as Ticket);

      // 2. Fetch Messages
      const { data: msgs, error: msgsError } = await supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (msgsError) throw msgsError;
      setMessages((msgs || []) as TicketMessage[]);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg("Erro ao carregar mensagens. Tente recarregar.");
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }, [supabase, ticketId, router, scrollToBottom]);

  const fetchMessagesOnly = useCallback(async () => {
    if (!userId) return;
    try {
      const { data: msgs, error: msgsError } = await supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (!msgsError && msgs) {
        // Only update state if length is different to prevent layout jumps
        if (msgs.length !== messages.length) {
          setMessages(msgs as TicketMessage[]);
          scrollToBottom();
        }
      }
    } catch (err) {
      console.error("Erro no polling de mensagens:", err);
    }
  }, [supabase, ticketId, userId, messages.length, scrollToBottom]);

  useEffect(() => {
    async function initUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/account");
        return;
      }
      setUserId(session.user.id);
      await fetchTicketAndMessages(session.user.id);
    }
    initUser();
  }, [supabase, router, fetchTicketAndMessages]);

  // Setup active message polling every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMessagesOnly();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchMessagesOnly]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    if (!allowedTypes.includes(selectedFile.type)) {
      setErrorMsg("Formato de anexo não suportado. Use JPG, PNG ou PDF.");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setErrorMsg("O anexo deve ser menor que 5MB.");
      return;
    }

    setErrorMsg("");
    setFile(selectedFile);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() && !file) return;
    if (!ticket) return;

    setErrorMsg("");
    setSubmitting(true);

    try {
      let attachmentUrl = "";

      // Upload file if selected
      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${userId}/${Date.now()}_reply.${fileExt}`;
        const filePath = `support/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("support-attachments")
          .upload(filePath, file, { contentType: file.type });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("support-attachments")
          .getPublicUrl(filePath);

        attachmentUrl = publicUrl;
      }

      // Insert Message
      const { error: msgError } = await supabase
        .from("ticket_messages")
        .insert({
          ticket_id: ticket.id,
          sender_id: userId,
          message: replyText.trim() || `Ficheiro em anexo: ${file?.name}`,
          attachments: attachmentUrl ? [attachmentUrl] : [],
        });

      if (msgError) throw msgError;

      // Update Ticket updated_at timestamp in Supabase
      await supabase
        .from("tickets")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", ticket.id);

      setReplyText("");
      setFile(null);
      
      // Reload message log
      await fetchTicketAndMessages(userId);
    } catch (err: unknown) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : "Falha ao enviar a mensagem. Tente novamente.";
      setErrorMsg(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center min-h-[300px]">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="py-12 text-center text-xs text-muted-foreground italic">
        Pedido de suporte não encontrado.
      </div>
    );
  }

  const isClosed = ticket.status === "closed";
  const isResolved = ticket.status === "resolved";

  return (
    <div className="flex flex-col h-full min-h-[500px] font-sans">
      {/* Back button */}
      <div className="mb-4">
        <Link
          href="/account/support"
          className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar para Suporte
        </Link>
      </div>

      {/* Ticket Details Header Widget */}
      <div className="border border-border p-5 rounded-[4px] bg-white space-y-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-100 pb-4">
          <div>
            <span
              className={`inline-block text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-sm mb-2 ${
                isClosed || isResolved
                  ? "bg-neutral-100 text-neutral-500 border border-neutral-200"
                  : "bg-green-50 text-green-700 border border-green-200"
              }`}
            >
              {STATUS_LABELS[ticket.status] || ticket.status}
            </span>
            <h1 className="text-xl font-semibold text-primary">{ticket.subject}</h1>
          </div>
          <button
            onClick={() => fetchTicketAndMessages(userId)}
            className="flex items-center gap-1.5 p-2 border border-border rounded text-xs font-semibold uppercase tracking-wider hover:bg-neutral-50 text-primary cursor-pointer transition-all self-end sm:self-auto font-sans"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Actualizar
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-neutral-600">
          <div>
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Categoria</p>
            <p className="font-semibold text-primary mt-0.5">{CATEGORY_LABELS[ticket.type] || ticket.type}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Data de Abertura</p>
            <p className="mt-0.5">{new Date(ticket.created_at).toLocaleDateString("pt-MZ")}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Última Actualização</p>
            <p className="mt-0.5">{new Date(ticket.updated_at).toLocaleDateString("pt-MZ")}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Referência</p>
            {ticket.orders ? (
              <Link
                href={`/account/orders/${ticket.orders.id}`}
                className="font-semibold text-primary hover:underline block mt-0.5"
              >
                Enc. #{ticket.orders.id.slice(0, 8).toUpperCase()}
              </Link>
            ) : (
              <p className="text-muted-foreground italic mt-0.5">Geral</p>
            )}
          </div>
        </div>
      </div>

      {/* CHAT MESSAGES PANEL */}
      <div className="flex-1 border border-border rounded-[4px] bg-[#FAF9F6] p-5 overflow-y-auto max-h-[400px] space-y-4 mb-4">
        {messages.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground italic">
            A conversa ainda não começou.
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === userId;
            const attachments = msg.attachments || [];

            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    {isMe ? "Você" : "Equipa Nura"}
                  </span>
                  <span className="text-[8px] text-muted-foreground">
                    {new Date(msg.created_at).toLocaleTimeString("pt-MZ", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div
                  className={`p-3 rounded-[6px] max-w-[85%] sm:max-w-[70%] text-sm leading-relaxed ${
                    isMe
                      ? "bg-primary text-white"
                      : "bg-white border border-border text-primary"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.message}</p>
                  
                  {attachments.length > 0 && (
                    <div className={`mt-2.5 pt-2.5 border-t text-[11px] ${isMe ? "border-white/20" : "border-neutral-100"}`}>
                      <p className="font-semibold uppercase tracking-wider text-[8px] opacity-75 mb-1.5">Anexos:</p>
                      {attachments.map((url: string, idx: number) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1 underline mr-3 ${
                            isMe ? "text-white hover:text-white/80" : "text-primary hover:text-primary/80"
                          }`}
                        >
                          Anexo {idx + 1}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={threadEndRef} />
      </div>

      {/* CHAT INPUT FORM */}
      <div className="border border-border p-4 rounded-[4px] bg-white">
        {isClosed ? (
          <div className="p-3 bg-neutral-50 border border-neutral-200 text-neutral-600 rounded-sm text-center text-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span>Este pedido de suporte está fechado. Não é possível enviar mais mensagens.</span>
            </div>
            <Link
              href="/account/support"
              className="inline-flex h-8 items-center justify-center px-4 bg-primary text-white text-xs font-semibold uppercase tracking-wider rounded-sm transition-all"
            >
              Novo pedido
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="space-y-3">
            {errorMsg && (
              <p className="text-[10px] text-red-600 font-semibold">{errorMsg}</p>
            )}

            {/* Attached file tag */}
            {file && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-100 text-neutral-600 border border-border text-[10px] rounded-sm">
                <Paperclip className="h-3 w-3" />
                <span>{file.name}</span>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-red-500 hover:text-red-700 ml-1 font-bold cursor-pointer"
                >
                  &times;
                </button>
              </div>
            )}

            <div className="flex gap-2">
              {/* Attachment clip */}
              <label className="flex items-center justify-center w-10 h-10 border border-border hover:border-primary/50 text-neutral-400 hover:text-primary rounded-sm cursor-pointer transition-all bg-neutral-50 shrink-0">
                <Paperclip className="h-5 w-5 stroke-[1.5]" />
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  disabled={submitting}
                  className="hidden"
                />
              </label>

              {/* Input text */}
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Escreva a sua mensagem..."
                className="flex-1 h-10 px-3 border border-border focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm rounded-sm"
                required={!file}
                disabled={submitting}
              />

              {/* Submit button */}
              <Button
                type="submit"
                variant="primary"
                className="h-10 px-4 flex items-center justify-center rounded-sm shrink-0 cursor-pointer font-sans font-semibold text-xs uppercase tracking-wider"
                disabled={submitting}
              >
                Enviar
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* WhatsApp Escalation widget */}
      <div className="mt-6 p-4 border border-dashed border-border rounded-[4px] bg-white flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
        <div>
          <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">Precisa de ajuda urgente?</h4>
          <p className="text-[10px] text-muted-foreground leading-normal mt-0.5">
            Se for urgente, pode falar directamente com a nossa equipa de apoio ao cliente via WhatsApp.
          </p>
        </div>
        <a
          href={`https://wa.me/258840000000?text=Olá! Preciso de ajuda urgente com o pedido de suporte #${ticket.id.slice(0, 8).toUpperCase()}.`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center justify-center px-4 bg-[#25D366] text-white hover:bg-[#20ba5a] text-xs font-semibold uppercase tracking-wider rounded-sm transition-all gap-1.5 font-sans font-semibold"
        >
          Falar no WhatsApp
        </a>
      </div>
    </div>
  );
}
