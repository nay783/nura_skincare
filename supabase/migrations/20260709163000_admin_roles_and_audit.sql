-- Migration to support admin scopes, archived status, audit logs, settings, skin goals, order notes, and ticket assignees

-- 1. Add archived status to public.product_status
ALTER TYPE public.product_status ADD VALUE IF NOT EXISTS 'archived';

-- 2. Add scopes to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS scopes TEXT[] NOT NULL DEFAULT '{}';

-- 3. Add skin_goals to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS skin_goals TEXT[] NOT NULL DEFAULT '{}';

-- 4. Add internal_notes to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- 5. Add assigned_admin_id to tickets
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS assigned_admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 6. Create Audit Logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 8. Set RLS Policies for audit_logs
DROP POLICY IF EXISTS "Allow admins to read audit logs" ON public.audit_logs;
CREATE POLICY "Allow admins to read audit logs" ON public.audit_logs
    FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Allow admins to insert audit logs" ON public.audit_logs;
CREATE POLICY "Allow admins to insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON public.audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at);

-- 9. Create Store Settings table
CREATE TABLE IF NOT EXISTS public.store_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on store_settings
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Set RLS Policies for store_settings
DROP POLICY IF EXISTS "Allow public read access to store settings" ON public.store_settings;
CREATE POLICY "Allow public read access to store settings" ON public.store_settings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admins to manage store settings" ON public.store_settings;
CREATE POLICY "Allow admins to manage store settings" ON public.store_settings
    FOR ALL USING (public.is_admin(auth.uid()));

-- Seed initial settings if they don't exist
INSERT INTO public.store_settings (key, value, description)
VALUES 
    ('store_name', 'Nura Skincare', 'Nome público da loja'),
    ('whatsapp_number', '+258840000000', 'Contacto de WhatsApp de apoio ao cliente'),
    ('mpesa_number', '840000000', 'Número de M-Pesa para pagamentos'),
    ('mpesa_name', 'NURA SKINCARE LIMITADA', 'Nome do titular da conta M-Pesa'),
    ('pickup_address', 'Av. Julius Nyerere, nº 1000, Maputo Cidade', 'Morada física para levantamentos na loja'),
    ('delivery_notes', 'As entregas para Maputo Cidade ocorrem em 24h. Restantes províncias em 48h-72h.', 'Instruções gerais de envio'),
    ('contact_email', 'apoio@nura.co.mz', 'Email de contacto oficial'),
    ('instagram_link', 'https://instagram.com/nura.skincare', 'Link da página de Instagram')
ON CONFLICT (key) DO NOTHING;
