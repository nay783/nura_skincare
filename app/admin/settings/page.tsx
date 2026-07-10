"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";
import { logAdminAction } from "@/lib/audit";

interface SettingItem {
  key: string;
  value: string;
  description: string;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [adminProfile, setAdminProfile] = useState<any>(null);
  
  // Settings values mapping
  const [settings, setSettings] = useState<Record<string, string>>({
    store_name: "",
    whatsapp_number: "",
    mpesa_number: "",
    mpesa_name: "",
    pickup_address: "",
    delivery_notes: "",
    contact_email: "",
    instagram_link: "",
  });

  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function loadSettings() {
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

      // 2. Fetch Store Settings
      const { data: storeSettings, error } = await supabase
        .from("store_settings")
        .select("*");

      if (error) {
        console.error("Erro ao carregar configurações:", error.message);
        setErrorMsg("Por favor, certifique-se de que a migração SQL foi aplicada.");
      } else if (storeSettings) {
        const values: Record<string, string> = {};
        const descs: Record<string, string> = {};
        storeSettings.forEach((item: SettingItem) => {
          values[item.key] = item.value;
          descs[item.key] = item.description;
        });
        setSettings(prev => ({ ...prev, ...values }));
        setDescriptions(descs);
      }
      setLoading(false);
    }
    loadSettings();
  }, [supabase, router]);

  const handleInputChange = (key: string, val: string) => {
    setSettings(prev => ({ ...prev, [key]: val }));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    const hasUpdatePermission = adminProfile?.role === "master_admin" || 
      (Array.isArray(adminProfile?.scopes) && adminProfile.scopes.includes("settings.update"));

    if (!hasUpdatePermission) {
      setErrorMsg("Não tem permissão para aceder ou actualizar esta área (settings.update em falta).");
      return;
    }

    setSubmitting(true);

    try {
      // Perform updates for each setting key
      for (const [key, value] of Object.entries(settings)) {
        const { error } = await supabase
          .from("store_settings")
          .update({ value })
          .eq("key", key);

        if (error) throw error;
      }

      // Log action to audit logs
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Log in the audit_logs table
        await supabase.from("audit_logs").insert({
          admin_id: session.user.id,
          action: "settings.update",
          entity_type: "settings",
          entity_id: "global",
          metadata: { keys: Object.keys(settings) }
        });
      }

      setSuccessMsg("Configurações actualizadas com sucesso!");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Erro ao gravar configurações. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-neutral-200 w-1/4 rounded" />
        <div className="h-64 bg-neutral-200 rounded" />
      </div>
    );
  }

  const hasUpdatePermission = adminProfile?.role === "master_admin" || 
    (Array.isArray(adminProfile?.scopes) && adminProfile.scopes.includes("settings.update"));

  return (
    <div className="space-y-8 font-sans max-w-4xl">
      <div>
        <h1 className="text-3xl font-serif text-primary font-medium">Definições da Loja</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure as definições globais de contacto, canais de atendimento e credenciais de pagamento.
        </p>
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

      {!hasUpdatePermission && (
        <div className="p-3 bg-amber-50 border-l-2 border-amber-500 text-amber-700 text-xs rounded-sm">
          Apenas tem permissão de leitura nesta página. Para salvar alterações, é necessária a permissão settings.update.
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="bg-white border border-border rounded-[4px] p-6 space-y-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* General configurations */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary border-b border-neutral-100 pb-2">
              Identidade e Contactos
            </h3>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                Nome da Loja
              </label>
              <Input
                type="text"
                value={settings.store_name}
                onChange={e => handleInputChange("store_name", e.target.value)}
                disabled={!hasUpdatePermission || submitting}
                required
                className="w-full !h-10 text-sm"
              />
              <p className="text-[9px] text-muted-foreground mt-0.5">{descriptions.store_name}</p>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                WhatsApp de Apoio
              </label>
              <Input
                type="text"
                value={settings.whatsapp_number}
                onChange={e => handleInputChange("whatsapp_number", e.target.value)}
                disabled={!hasUpdatePermission || submitting}
                required
                className="w-full !h-10 text-sm"
              />
              <p className="text-[9px] text-muted-foreground mt-0.5">{descriptions.whatsapp_number}</p>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                Email de Contacto
              </label>
              <Input
                type="email"
                value={settings.contact_email}
                onChange={e => handleInputChange("contact_email", e.target.value)}
                disabled={!hasUpdatePermission || submitting}
                required
                className="w-full !h-10 text-sm"
              />
              <p className="text-[9px] text-muted-foreground mt-0.5">{descriptions.contact_email}</p>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                Instagram Link
              </label>
              <Input
                type="url"
                value={settings.instagram_link}
                onChange={e => handleInputChange("instagram_link", e.target.value)}
                disabled={!hasUpdatePermission || submitting}
                required
                className="w-full !h-10 text-sm"
              />
              <p className="text-[9px] text-muted-foreground mt-0.5">{descriptions.instagram_link}</p>
            </div>
          </div>

          {/* Logistics and payment info */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary border-b border-neutral-100 pb-2">
              Pagamentos e Entregas
            </h3>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                Número de M-Pesa
              </label>
              <Input
                type="text"
                value={settings.mpesa_number}
                onChange={e => handleInputChange("mpesa_number", e.target.value)}
                disabled={!hasUpdatePermission || submitting}
                required
                className="w-full !h-10 text-sm"
              />
              <p className="text-[9px] text-muted-foreground mt-0.5">{descriptions.mpesa_number}</p>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                Nome do Titular M-Pesa
              </label>
              <Input
                type="text"
                value={settings.mpesa_name}
                onChange={e => handleInputChange("mpesa_name", e.target.value)}
                disabled={!hasUpdatePermission || submitting}
                required
                className="w-full !h-10 text-sm"
              />
              <p className="text-[9px] text-muted-foreground mt-0.5">{descriptions.mpesa_name}</p>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                Morada de Levantamento (Loja Física)
              </label>
              <Input
                type="text"
                value={settings.pickup_address}
                onChange={e => handleInputChange("pickup_address", e.target.value)}
                disabled={!hasUpdatePermission || submitting}
                required
                className="w-full !h-10 text-sm"
              />
              <p className="text-[9px] text-muted-foreground mt-0.5">{descriptions.pickup_address}</p>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                Notas de Envio / Política de Entrega
              </label>
              <textarea
                value={settings.delivery_notes}
                onChange={e => handleInputChange("delivery_notes", e.target.value)}
                disabled={!hasUpdatePermission || submitting}
                rows={3}
                required
                className="w-full p-3 border border-border focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm rounded-sm font-sans"
              />
              <p className="text-[9px] text-muted-foreground mt-0.5">{descriptions.delivery_notes}</p>
            </div>
          </div>
        </div>

        {hasUpdatePermission && (
          <div className="flex justify-end pt-4 border-t border-neutral-100">
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              className="h-10 px-6 text-xs uppercase tracking-wider font-semibold rounded-sm cursor-pointer"
            >
              {submitting ? "A guardar..." : "Guardar Definições"}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
