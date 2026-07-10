"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";

const PROVINCES = [
  "Maputo Cidade",
  "Maputo Província",
  "Gaza",
  "Inhambane",
  "Sofala",
  "Manica",
  "Tete",
  "Zambézia",
  "Nampula",
  "Niassa",
  "Cabo Delgado",
];

// Mozambique phone format validation: 9 digits, starting with 82, 83, 84, 85, 86, 87
const phoneRegex = /^(?:258)?(8[2-7]\d{7})$/;

const settingsSchema = z.object({
  fullName: z.string().min(3, "O nome completo deve ter pelo menos 3 caracteres"),
  email: z.string().email("Endereço de email inválido"),
  phone: z.string().refine((val) => !val || phoneRegex.test(val.replace(/\s+/g, "")), {
    message: "Número de telefone de Moçambique inválido (ex: 840000000)",
  }),
  birthDate: z.string().optional(),
  province: z.string().min(1, "A província é obrigatória"),
  city: z.string().min(2, "A cidade é obrigatória"),
  streetAddress: z.string().min(5, "A morada deve ter pelo menos 5 caracteres"),
  referencePoint: z.string().optional(),
});

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  birth_date: string | null;
}

interface Address {
  id: string;
  province: string;
  city: string;
  street_address: string;
  reference_point: string | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [address, setAddress] = useState<Address | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [referencePoint, setReferencePoint] = useState("");

  // UI state
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Auth password inputs
  const [newPassword, setNewPassword] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/account");
        return;
      }

      setEmail(session.user.email || "");

      // Fetch Profile
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (prof) {
        const profileData = prof as UserProfile;
        const nameStr = `${profileData.first_name || ""} ${profileData.last_name || ""}`.trim();
        setFullName(nameStr);
        setPhone(profileData.phone || "");
        setBirthDate(profileData.birth_date || "");
      }

      // Fetch Address
      const { data: addr } = await supabase
        .from("addresses")
        .select("*")
        .eq("profile_id", session.user.id)
        .eq("is_default", true)
        .maybeSingle();

      if (addr) {
        const addressData = addr as Address;
        setAddress(addressData);
        setProvince(addressData.province || "");
        setCity(addressData.city || "");
        setStreetAddress(addressData.street_address || "");
        setReferencePoint(addressData.reference_point || "");
      }

      setLoading(false);
    }
    loadData();
  }, [supabase, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");
    setFieldErrors({});
    setSubmitting(true);

    const formData = {
      fullName,
      email,
      phone,
      birthDate: birthDate || undefined,
      province,
      city,
      streetAddress,
      referencePoint: referencePoint || undefined,
    };

    // Zod Validation
    const validation = settingsSchema.safeParse(formData);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.issues.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0].toString()] = err.message;
        }
      });
      setFieldErrors(errors);
      setSubmitting(false);
      setErrorMsg("Por favor, corrija os erros de validação antes de guardar.");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setErrorMsg("Sessão expirada. Por favor, entre novamente.");
        setSubmitting(false);
        return;
      }

      const userId = session.user.id;

      // Split name parts
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

      // 1. Update Profile table
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          first_name: firstName,
          last_name: lastName,
          phone: phone || null,
          birth_date: birthDate || null,
        })
        .eq("id", userId);

      if (profileError) throw profileError;

      // 2. Update Addresses table
      if (address) {
        const { error: addrError } = await supabase
          .from("addresses")
          .update({
            province,
            city,
            street_address: streetAddress,
            reference_point: referencePoint || null,
          })
          .eq("id", address.id);
        
        if (addrError) throw addrError;
      } else {
        const { data: newAddr, error: addrError } = await supabase
          .from("addresses")
          .insert({
            profile_id: userId,
            province,
            city,
            street_address: streetAddress,
            reference_point: referencePoint || null,
            is_default: true,
          })
          .select()
          .single();

        if (addrError) throw addrError;
        setAddress(newAddr as Address);
      }

      // 3. Update Email in Auth if changed
      if (email !== session.user.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email });
        if (emailError) {
          setErrorMsg(`Dados guardados, mas falha ao alterar email: ${emailError.message}`);
          setSubmitting(false);
          return;
        }
        setSuccessMsg("Dados actualizados com sucesso. Verifique o seu novo email para confirmar a alteração.");
      } else {
        setSuccessMsg("Dados actualizados com sucesso.");
      }

      router.refresh();
    } catch (err: unknown) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : "Não foi possível actualizar os dados. Tente novamente.";
      setErrorMsg(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess("");
    setPasswordError("");

    if (newPassword.length < 6) {
      setPasswordError("A palavra-passe deve ter pelo menos 6 caracteres.");
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setPasswordSuccess("Palavra-passe alterada com sucesso.");
      setNewPassword("");
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Ocorreu um erro ao alterar a palavra-passe.";
      setPasswordError(errMsg);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center min-h-[300px]">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-10 font-sans">
      <div>
        <h1 className="text-3xl font-serif text-primary mb-2">Definições da Conta</h1>
        <p className="text-xs text-muted-foreground">
          Gerencie as suas informações de contacto, morada de entrega e segurança.
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal info fields */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary border-b border-neutral-100 pb-2">
              Informações Pessoais
            </h3>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">
                Nome completo
              </label>
              <Input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full !h-10 text-sm"
              />
              {fieldErrors.fullName && (
                <p className="text-[10px] text-red-600 mt-1">{fieldErrors.fullName}</p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full !h-10 text-sm"
              />
              {fieldErrors.email && (
                <p className="text-[10px] text-red-600 mt-1">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">
                Número de WhatsApp
              </label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 840000000"
                className="w-full !h-10 text-sm"
              />
              {fieldErrors.phone && (
                <p className="text-[10px] text-red-600 mt-1">{fieldErrors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">
                Data de nascimento
              </label>
              <Input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full !h-10 text-sm text-neutral-600"
              />
            </div>
          </div>

          {/* Delivery fields */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary border-b border-neutral-100 pb-2">
              Morada de Entrega
            </h3>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">
                Província
              </label>
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-border focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm rounded-sm"
              >
                <option value="">Seleccione a província</option>
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              {fieldErrors.province && (
                <p className="text-[10px] text-red-600 mt-1">{fieldErrors.province}</p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">
                Cidade
              </label>
              <Input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Maputo, Matola, Xai-Xai"
                required
                className="w-full !h-10 text-sm"
              />
              {fieldErrors.city && (
                <p className="text-[10px] text-red-600 mt-1">{fieldErrors.city}</p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">
                Morada Principal (Rua, Bairro, Casa nº)
              </label>
              <Input
                type="text"
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                placeholder="Ex. Av. Julius Nyerere, Bairro Central"
                required
                className="w-full !h-10 text-sm"
              />
              {fieldErrors.streetAddress && (
                <p className="text-[10px] text-red-600 mt-1">{fieldErrors.streetAddress}</p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">
                Ponto de referência
              </label>
              <Input
                type="text"
                value={referencePoint}
                onChange={(e) => setReferencePoint(e.target.value)}
                placeholder="Ex. Atrás do Banco ABC / Ao lado do supermercado"
                className="w-full !h-10 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100 mt-8">
          <Button
            type="submit"
            variant="primary"
            className="h-10 px-6 text-xs uppercase tracking-wider font-semibold rounded-sm"
            disabled={submitting}
          >
            Guardar alterações
          </Button>
        </div>
      </form>

      {/* Security Section */}
      <div className="pt-8 border-t border-border space-y-6">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">Segurança</h3>
          <p className="text-xs text-muted-foreground">Actualize a sua palavra-passe de acesso.</p>
        </div>

        {passwordSuccess && (
          <div className="p-3 bg-green-50 border-l-2 border-green-500 text-green-700 text-xs rounded-sm">
            {passwordSuccess}
          </div>
        )}

        {passwordError && (
          <div className="p-3 bg-red-50 border-l-2 border-red-500 text-red-700 text-xs rounded-sm">
            {passwordError}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-sm">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">
              Nova palavra-passe
            </label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              className="w-full !h-10 text-sm"
            />
          </div>

          <Button
            type="submit"
            variant="outline"
            className="h-10 text-xs uppercase tracking-wider font-semibold rounded-sm cursor-pointer"
          >
            Alterar palavra-passe
          </Button>
        </form>
      </div>
    </div>
  );
}
