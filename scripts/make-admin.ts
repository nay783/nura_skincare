import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    const filePath = path.resolve(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      content.split(/\r?\n/).forEach((line) => {
        if (line.trim().startsWith("#") || !line.trim()) return;
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || "";
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          } else if (value.startsWith("'") && value.endsWith("'")) {
            value = value.slice(1, -1);
          }
          process.env[key] = value.trim();
        }
      });
      return;
    }
  }
}

async function main() {
  console.log("====================================================");
  console.log("NURA SKINCARE - PROMOVER ADMINISTRADOR");
  console.log("====================================================");

  loadEnv();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("[Erro] Chave SUPABASE_SERVICE_ROLE_KEY não configurada no ambiente.");
    console.error("Para executar esta acção administrativa, configure SUPABASE_SERVICE_ROLE_KEY no .env.local.");
    process.exit(1);
  }

  const email = process.argv[2]?.trim();
  const role = process.argv[3]?.trim() || "master_admin";

  if (!email) {
    console.log("Uso: npx tsx scripts/make-admin.ts <email> [role]");
    console.log("Exemplo: npx tsx scripts/make-admin.ts admin@nura.co.mz master_admin");
    process.exit(0);
  }

  if (role !== "admin" && role !== "master_admin" && role !== "customer") {
    console.error("[Erro] Função inválida. Escolha: admin, master_admin, customer");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log(`[Info] Procurando utilizador com email: ${email}...`);

  // Query auth.users via supabase admin API
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("[Erro] Falha ao listar utilizadores do Auth:", listError.message);
    process.exit(1);
  }

  const targetUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

  if (!targetUser) {
    console.error(`[Erro] Utilizador não encontrado no Supabase Auth com o email: ${email}`);
    console.log("Por favor, registe-se primeiro no site como cliente.");
    process.exit(1);
  }

  console.log(`[Info] Utilizador encontrado! ID: ${targetUser.id}`);
  console.log(`[Info] Actualizando perfil para role = '${role}'...`);

  // Update profiles table
  const defaultScopes = role === "master_admin" ? [] : [
    "products.read", "products.create", "products.update", 
    "orders.read", "orders.update", 
    "tickets.read", "tickets.reply",
    "customers.read", "analytics.read"
  ];

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      role: role,
      scopes: defaultScopes
    })
    .eq("id", targetUser.id);

  if (profileError) {
    console.error("[Erro] Falha ao actualizar a tabela profiles:", profileError.message);
    process.exit(1);
  }

  // Update auth user metadata
  const { error: metadataError } = await supabase.auth.admin.updateUserById(
    targetUser.id,
    { user_metadata: { ...targetUser.user_metadata, role } }
  );

  if (metadataError) {
    console.warn("[Aviso] Falha ao actualizar metadados da conta Auth:", metadataError.message);
  }

  console.log("====================================================");
  console.log(`[Sucesso] Utilizador ${email} promovido para '${role}'!`);
  if (role !== "master_admin") {
    console.log(`Scopes atribuídos por defeito: ${defaultScopes.join(", ")}`);
  } else {
    console.log("Acesso total concedido implicitamente (master_admin).");
  }
  console.log("====================================================");
}

main();
