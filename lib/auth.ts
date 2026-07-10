import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type UserRole = "customer" | "admin" | "master_admin";

export interface UserProfile {
  id: string;
  role: UserRole;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  birth_date: string | null;
  scopes: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Retrieves the current authenticated user from Supabase Auth.
 */
export async function getCurrentUser() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

/**
 * Retrieves the profile of the currently authenticated user from public.profiles.
 */
export async function getCurrentProfile(): Promise<UserProfile | null> {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    const supabase = await createClient();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error || !profile) return null;
    return profile as UserProfile;
  } catch {
    return null;
  }
}

/**
 * Verifies if the current user possesses any of the required scopes/roles.
 */
export async function hasRole(allowedRoles: UserRole[]): Promise<boolean> {
  const profile = await getCurrentProfile();
  if (!profile) return false;
  return allowedRoles.includes(profile.role);
}

/**
 * Checks if the current admin user possesses a specific permission scope.
 * Note: 'master_admin' has bypass access to all scopes automatically.
 */
export async function hasScope(scope: string): Promise<boolean> {
  const profile = await getCurrentProfile();
  if (!profile) return false;
  if (profile.role === "master_admin") return true;
  if (profile.role !== "admin") return false;
  return Array.isArray(profile.scopes) && profile.scopes.includes(scope);
}

/**
 * Forces user authentication, redirecting to the login portal (/account) if needed.
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/account");
  }
  return user;
}

/**
 * Enforces role restrictions. Redirects to root if unauthorized.
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<UserProfile> {
  await requireAuth();
  const profile = await getCurrentProfile();
  if (!profile || !allowedRoles.includes(profile.role)) {
    redirect("/");
  }
  return profile;
}

/**
 * Enforces specific scope requirements. Redirects to admin home or throws an error.
 */
export async function requireScope(scope: string): Promise<UserProfile> {
  await requireAuth();
  const profile = await getCurrentProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "master_admin")) {
    redirect("/"); // Not an admin
  }
  if (profile.role !== "master_admin" && (!Array.isArray(profile.scopes) || !profile.scopes.includes(scope))) {
    // We let the page itself handle rendering unauthorized screen or redirect
    redirect("/admin?unauthorized=true");
  }
  return profile;
}

/**
 * Checks if the current user is an admin or master_admin.
 */
export async function isAdmin(): Promise<boolean> {
  return hasRole(["admin", "master_admin"]);
}

/**
 * Checks if the current user is a master_admin.
 */
export async function isMasterAdmin(): Promise<boolean> {
  return hasRole(["master_admin"]);
}
