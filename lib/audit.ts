import { createClient } from "@/lib/supabase/server";

/**
 * Logs an administrative action to the audit_logs table.
 * 
 * @param action The specific action tag (e.g. 'product.published', 'order.status_updated')
 * @param entityType The target entity name ('product', 'order', 'ticket', 'admin')
 * @param entityId The target entity identifier (UUID or identifier string)
 * @param metadata Additional JSON context (e.g. changes made)
 */
export async function logAdminAction(
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {}
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("audit_logs").insert({
      admin_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
    });

    if (error) {
      console.error("[Audit] Falha ao gravar log no banco:", error.message);
    }
  } catch (err) {
    console.error("[Audit] Erro ao gravar log de auditoria:", err);
  }
}
