"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Shield, ShieldAlert, Plus, Edit2, Trash2, CheckCircle2, AlertTriangle, Key } from "lucide-react";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";

const SCOPES_GROUPS = {
  Produtos: ["products.read", "products.create", "products.update", "products.delete", "products.publish"],
  Encomendas: ["orders.read", "orders.update", "orders.refund"],
  Apoio: ["tickets.read", "tickets.reply", "tickets.assign", "tickets.close"],
  Clientes: ["customers.read", "customers.update"],
  Blog: ["blog.read", "blog.create", "blog.update", "blog.delete", "blog.publish"],
  Outros: ["analytics.read", "admins.read", "admins.create", "admins.update", "admins.delete", "settings.read", "settings.update"],
};

export default function AdminManagementPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [adminProfile, setAdminProfile] = useState<any>(null);

  // List of all admins in database
  const [admins, setAdmins] = useState<any[]>([]);

  // Editing admin state
  const [editingAdmin, setEditingAdmin] = useState<any>(null);
  const [editingRole, setEditingRole] = useState<"admin" | "master_admin">("admin");
  const [editingScopes, setEditingScopes] = useState<string[]>([]);
  const [savingPermissions, setSavingPermissions] = useState(false);

  // Promoting a customer to admin states
  const [promoteEmail, setPromoteEmail] = useState("");
  const [promotingCustomer, setPromotingCustomer] = useState(false);

  // Feedbacks
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const loadAdmins = async () => {
    setLoading(true);
    setErrorMsg("");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      router.push("/account");
      return;
    }
    setCurrentUser(session.user);

    // 1. Fetch current profile
    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();
    setAdminProfile(prof);

    if (prof?.role !== "master_admin") {
      setLoading(false);
      return;
    }

    // 2. Fetch all profiles with admin or master_admin role
    const { data: adms, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, phone, role, scopes, created_at")
      .in("role", ["admin", "master_admin"])
      .order("first_name", { ascending: true });

    if (error) {
      setErrorMsg("Erro ao carregar administradores: " + error.message);
    } else {
      setAdmins(adms || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAdmins();
  }, [supabase]);

  const handleEditAdminPermissions = (adm: any) => {
    setEditingAdmin(adm);
    setEditingRole(adm.role);
    setEditingScopes(Array.isArray(adm.scopes) ? adm.scopes : []);
    setSuccessMsg("");
    setErrorMsg("");
  };

  const handleScopeCheckbox = (scope: string) => {
    setEditingScopes(prev => 
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    );
  };

  const handleSavePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;

    // Safeguard: Master admin cannot remove their own master_admin privileges accidentally
    if (editingAdmin.id === currentUser?.id && editingRole !== "master_admin") {
      setErrorMsg("Erro de Segurança: Não pode remover a sua própria função de master_admin para evitar bloqueio.");
      return;
    }

    setSavingPermissions(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          role: editingRole,
          scopes: editingRole === "master_admin" ? [] : editingScopes // master_admin has full bypass, scopes array is emptied
        })
        .eq("id", editingAdmin.id);

      if (error) throw error;

      // Log action in audit logs
      await supabase.from("audit_logs").insert({
        admin_id: adminProfile.id,
        action: "admin.scope_updated",
        entity_type: "admin",
        entity_id: editingAdmin.id,
        metadata: { role: editingRole, scopes: editingScopes }
      });

      setSuccessMsg("Permissões actualizadas com sucesso!");
      setEditingAdmin(null);
      await loadAdmins();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao gravar permissões.");
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleDeactivateAdmin = async (admId: string) => {
    // Safeguard: Cannot deactivate self
    if (admId === currentUser?.id) {
      setErrorMsg("Erro: Não pode desactivar a sua própria conta administrativa.");
      return;
    }

    if (!window.confirm("Tem a certeza de que deseja revogar o acesso administrativo desta conta? A conta voltará a ser de cliente comum.")) {
      return;
    }

    try {
      setSuccessMsg("");
      setErrorMsg("");

      const { error } = await supabase
        .from("profiles")
        .update({
          role: "customer",
          scopes: []
        })
        .eq("id", admId);

      if (error) throw error;

      // Log action
      await supabase.from("audit_logs").insert({
        admin_id: adminProfile.id,
        action: "admin.deactivated",
        entity_type: "admin",
        entity_id: admId,
      });

      setSuccessMsg("Administrador desativado com sucesso. Conta revertida para cliente comum.");
      await loadAdmins();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao desativar administrador.");
    }
  };

  const handlePromoteCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoteEmail.trim()) return;

    setPromotingCustomer(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      // Direct call to look up user in profiles since they should already have registered
      // For this sample setup, we query profile matching their metadata or email.
      // Since emails are stored in auth.users, we write a quick check or trigger a query.
      // In Supabase, if auth user profiles are set up:
      // Let's call the make-admin flow or query auth.users if available.
      // Wait, client cannot query auth.users directly unless service role key is used!
      // But we can check if they registered as customer by querying profile table if their email is in first_name/last_name, 
      // or we can prompt them to run `npm run make:admin email` in their terminal which uses the service_role key securely!
      // Yes! Promoting via UI is convenient, but CLI is 100% secure.
      // Let's provide a friendly message:
      setErrorMsg("Para promover um administrador com segurança e bypassar limitações de chaves públicas, utilize o comando na linha de comandos: \nnpx tsx scripts/make-admin.ts <email>");
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao promover cliente.");
    } finally {
      setPromotingCustomer(false);
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

  // Security restriction check
  if (adminProfile?.role !== "master_admin") {
    return (
      <div className="p-8 text-center text-xs text-muted-foreground italic font-sans">
        <ShieldAlert className="h-10 w-10 text-red-600 mx-auto mb-3" />
        Apenas o Master Admin tem permissão para aceder e gerir permissões de administradores.
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans max-w-6xl pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif text-primary font-medium">Gestão de Administradores</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Atribua funções, revogue acessos e configure permissões granulares por gestor de operações.
        </p>
      </div>

      {successMsg && (
        <div className="p-3 bg-green-50 border-l-2 border-green-500 text-green-700 text-xs rounded-sm">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-50 border-l-2 border-red-500 text-red-700 text-xs rounded-sm whitespace-pre-line">
          {errorMsg}
        </div>
      )}

      {/* Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left main: Admins list */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-border rounded-[4px] overflow-hidden shadow-sm">
            <div className="p-4 border-b border-neutral-100 bg-neutral-50/50">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">Contas Administrativas Activas</h3>
            </div>
            
            <div className="divide-y divide-neutral-100">
              {admins.map(adm => {
                const name = `${adm.first_name || ""} ${adm.last_name || ""}`.trim() || "Gestor";
                const isSelf = adm.id === currentUser?.id;
                
                return (
                  <div key={adm.id} className="p-4 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-primary">{name}</span>
                        {isSelf && (
                          <span className="text-[8px] font-bold uppercase bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.2 rounded-sm">
                            Tu
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Função: <strong className="text-primary">{adm.role === "master_admin" ? "Master Admin" : "Gestor Limitado"}</strong>
                      </p>
                      {adm.role !== "master_admin" && (
                        <p className="text-[9px] text-muted-foreground mt-1 max-w-sm truncate">
                          Permissões: {Array.isArray(adm.scopes) && adm.scopes.length > 0 ? adm.scopes.join(", ") : "Nenhuma"}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditAdminPermissions(adm)}
                        className="h-8 px-3 border border-border hover:bg-neutral-50 text-xs font-semibold rounded-sm text-primary cursor-pointer flex items-center gap-1"
                      >
                        <Edit2 className="h-3 w-3" /> Permissões
                      </button>
                      
                      {!isSelf && (
                        <button
                          onClick={() => handleDeactivateAdmin(adm.id)}
                          className="h-8 px-3 border border-red-200 hover:bg-red-50 text-xs font-semibold rounded-sm text-red-600 cursor-pointer flex items-center gap-1"
                        >
                          Desactivar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Prompt CLI tool note */}
          <div className="bg-neutral-50 border border-border p-4 rounded-sm flex items-start gap-3 text-xs text-muted-foreground">
            <Key className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-primary mb-1">Como adicionar novos gestores?</p>
              <p className="leading-relaxed">
                Para promover um novo gestor, peça que ele se registe primeiro na loja como cliente comum. Em seguida, execute o script no servidor utilizando:
              </p>
              <code className="block bg-neutral-200 text-primary p-2 rounded mt-1.5 font-mono text-[10px]">
                npm run make:admin email-do-gestor@nura.co.mz admin
              </code>
            </div>
          </div>
        </div>

        {/* Right side form: Edit permissions checks */}
        <div>
          {editingAdmin ? (
            <form onSubmit={handleSavePermissions} className="bg-white border border-border p-6 rounded-[4px] shadow-sm space-y-6 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">Configurar Acessos</h3>
                  <p className="text-[10px] text-muted-foreground">{editingAdmin.first_name || "Administrador"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="text-xs text-muted-foreground hover:text-primary cursor-pointer font-semibold"
                >
                  Cancelar
                </button>
              </div>

              {/* Role Select */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                  Nível de Acesso (Função)
                </label>
                <select
                  value={editingRole}
                  onChange={e => setEditingRole(e.target.value as any)}
                  disabled={savingPermissions}
                  className="w-full h-10 px-3 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary rounded-sm font-sans"
                >
                  <option value="admin">Gestor Limitado (Admin)</option>
                  <option value="master_admin">Acesso Total (Master Admin)</option>
                </select>
              </div>

              {/* Scopes checkboxes */}
              {editingRole === "admin" && (
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Permissões de Escopo (Scopes)</p>
                  
                  {Object.entries(SCOPES_GROUPS).map(([groupName, groupScopes]) => (
                    <div key={groupName} className="space-y-2 border-t border-neutral-100 pt-3">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">{groupName}</p>
                      <div className="space-y-1.5 pl-1">
                        {groupScopes.map(scope => {
                          const checked = editingScopes.includes(scope);
                          return (
                            <label key={scope} className="flex items-center gap-2 cursor-pointer text-xs select-none">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handleScopeCheckbox(scope)}
                                className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                              />
                              <span className="font-mono text-[10px] text-primary">{scope}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {editingRole === "master_admin" && (
                <div className="p-3 bg-primary/10 border border-primary/20 text-primary text-xs rounded-sm space-y-1.5">
                  <p className="font-bold flex items-center gap-1"><Shield className="h-4 w-4" /> Master Admin Ativo</p>
                  <p>Esta conta tem privilégios totais de leitura e escrita e ignora todas as restrições de scopes.</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={savingPermissions}
                variant="primary"
                className="w-full h-10 text-xs font-semibold uppercase tracking-wider rounded-sm cursor-pointer"
              >
                {savingPermissions ? "A guardar..." : "Gravar Permissões"}
              </Button>
            </form>
          ) : (
            <div className="bg-white border border-border p-6 rounded-[4px] text-center text-xs text-muted-foreground italic shadow-sm py-12">
              Selecione um administrador da lista para gerir as suas permissões de scopes e nível de acesso.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
