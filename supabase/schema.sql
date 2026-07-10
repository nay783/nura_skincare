-- ====================================================
-- NURA SKINCARE DATABASE SCHEMA
-- Target Market: Mozambique
-- ====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Define Enums
CREATE TYPE public.user_role AS ENUM ('customer', 'admin', 'master_admin');
CREATE TYPE public.product_status AS ENUM ('draft', 'published');
CREATE TYPE public.order_status AS ENUM ('pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded');
CREATE TYPE public.payment_method AS ENUM ('mpesa', 'store_credit', 'other');
CREATE TYPE public.payment_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.ticket_type AS ENUM ('refund', 'return', 'complaint', 'delivery_issue', 'product_question');
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE public.recommendation_event AS ENUM ('search', 'product_view', 'cart_add', 'purchase');

-- ----------------------------------------------------
-- Helper Trigger for updating updated_at timestamp
-- ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------
-- Table: Profiles (Extends auth.users)
-- ----------------------------------------------------
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.user_role NOT NULL DEFAULT 'customer',
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to automate profile generation from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role public.user_role := 'customer'::public.user_role;
BEGIN
    -- If user metadata specifies a role, let's cast it (only during migrations/seeding if needed)
    IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
        default_role := (NEW.raw_user_meta_data->>'role')::public.user_role;
    END IF;

    INSERT INTO public.profiles (id, role, first_name, last_name, phone)
    VALUES (
        NEW.id,
        default_role,
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name',
        NEW.raw_user_meta_data->>'phone'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to restrict role updating to master_admin only
CREATE OR REPLACE FUNCTION public.check_profile_role_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role <> OLD.role THEN
        -- Check if the executor is a master_admin
        IF NOT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'master_admin'
        ) THEN
            RAISE EXCEPTION 'Apenas o master_admin pode alterar privilégios de acesso.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_role_update
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.check_profile_role_update();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------
-- Table: Addresses (Mozambique-focused)
-- ----------------------------------------------------
CREATE TABLE public.addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    province TEXT NOT NULL, -- e.g. Maputo, Gaza, Inhambane, etc.
    city TEXT NOT NULL,     -- e.g. Maputo, Matola, Xai-Xai, etc.
    street_address TEXT NOT NULL,
    postal_code TEXT,       -- Optional in Mozambique
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to make sure only one address is default
CREATE OR REPLACE FUNCTION public.set_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE public.addresses
        SET is_default = false
        WHERE profile_id = NEW.profile_id AND id <> NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_address_default_changed
    BEFORE INSERT OR UPDATE ON public.addresses
    FOR EACH ROW EXECUTE FUNCTION public.set_single_default_address();

CREATE TRIGGER update_addresses_updated_at
    BEFORE UPDATE ON public.addresses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------
-- Table: Categories
-- ----------------------------------------------------
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------
-- Table: Products
-- ----------------------------------------------------
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    compare_at_price NUMERIC(12, 2) CHECK (compare_at_price >= price),
    sku TEXT NOT NULL UNIQUE,
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    status public.product_status NOT NULL DEFAULT 'draft',
    images TEXT[] NOT NULL DEFAULT '{}',
    benefits TEXT[] NOT NULL DEFAULT '{}',
    ingredients TEXT,
    how_to_use TEXT,
    source_import TEXT NOT NULL DEFAULT 'manual', -- 'csv', 'instagram', 'manual'
    brand TEXT,
    instagram_post_id TEXT UNIQUE,
    instagram_source_url TEXT,
    source_platform TEXT,
    source_business TEXT,
    hashtags TEXT[] NOT NULL DEFAULT '{}',
    source_metadata JSONB NOT NULL DEFAULT '{}',
    seo_title TEXT,
    seo_description TEXT,
    search_keywords TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------
-- Table: Product Category Junction
-- ----------------------------------------------------
CREATE TABLE public.product_category_junction (
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, category_id)
);

-- ----------------------------------------------------
-- Table: Orders
-- ----------------------------------------------------
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    status public.order_status NOT NULL DEFAULT 'pending',
    payment_method public.payment_method NOT NULL,
    payment_status public.payment_status NOT NULL DEFAULT 'pending',
    payment_receipt_url TEXT, -- Screenshot of payment confirmation (M-Pesa, etc.)
    shipping_address JSONB NOT NULL, -- Snapshot of the shipping address at checkout
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    shipping_cost NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------
-- Table: Order Items
-- ----------------------------------------------------
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0), -- Captured price at order time
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_order_items_updated_at
    BEFORE UPDATE ON public.order_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------
-- Table: Store Credits
-- ----------------------------------------------------
CREATE TABLE public.store_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL, -- Positive for addition, negative for usage
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------
-- Table: Blog Posts
-- ----------------------------------------------------
CREATE TABLE public.blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    excerpt TEXT NOT NULL,
    keywords TEXT[] NOT NULL DEFAULT '{}',
    read_time INTEGER NOT NULL DEFAULT 0, -- In minutes
    featured_image TEXT,
    rich_content JSONB NOT NULL, -- TipTap output
    html_content TEXT NOT NULL, -- Pre-compiled HTML for fast rendering
    status public.product_status NOT NULL DEFAULT 'draft', -- 'draft', 'published'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_blog_posts_updated_at
    BEFORE UPDATE ON public.blog_posts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------
-- Table: Tickets (Customer Support / Post-Purchase Requests)
-- ----------------------------------------------------
CREATE TABLE public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    type public.ticket_type NOT NULL,
    subject TEXT NOT NULL,
    status public.ticket_status NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON public.tickets
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------
-- Table: Ticket Messages
-- ----------------------------------------------------
CREATE TABLE public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    attachments TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------
-- Table: Recommendation Logs
-- ----------------------------------------------------
CREATE TABLE public.recommendation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    event_type public.recommendation_event NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    metadata JSONB NOT NULL DEFAULT '{}', -- e.g. search query details
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================
-- INDEXES FOR PERFORMANCE
-- ====================================================
CREATE INDEX idx_products_status ON public.products(status);
CREATE INDEX idx_products_slug ON public.products(slug);
CREATE INDEX idx_products_instagram_post_id ON public.products(instagram_post_id);
CREATE INDEX idx_orders_customer ON public.orders(customer_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX idx_tickets_customer ON public.tickets(customer_id);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_recommendation_session ON public.recommendation_logs(session_id);
CREATE INDEX idx_recommendation_profile ON public.recommendation_logs(profile_id);

-- ====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_category_junction ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------
-- Helper Functions for Policy Scopes
-- ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = user_id AND role IN ('admin', 'master_admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles Policies
CREATE POLICY "Allow public read access to basic profile info" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Allow users to update their own profiles" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Addresses Policies
CREATE POLICY "Allow users to view their own addresses" ON public.addresses
    FOR SELECT USING (auth.uid() = profile_id OR public.is_admin(auth.uid()));

CREATE POLICY "Allow users to manage their own addresses" ON public.addresses
    FOR ALL USING (auth.uid() = profile_id);

-- Categories Policies
CREATE POLICY "Allow public read access to categories" ON public.categories
    FOR SELECT USING (true);

CREATE POLICY "Allow admin full access to categories" ON public.categories
    FOR ALL USING (public.is_admin(auth.uid()));

-- Products Policies
CREATE POLICY "Allow public read access to published products" ON public.products
    FOR SELECT USING (status = 'published'::public.product_status OR public.is_admin(auth.uid()));

CREATE POLICY "Allow admin full access to products" ON public.products
    FOR ALL USING (public.is_admin(auth.uid()));

-- Product Category Junction Policies
CREATE POLICY "Allow public read access to junctions" ON public.product_category_junction
    FOR SELECT USING (true);

CREATE POLICY "Allow admin full access to junctions" ON public.product_category_junction
    FOR ALL USING (public.is_admin(auth.uid()));

-- Orders Policies
CREATE POLICY "Allow users to view their own orders" ON public.orders
    FOR SELECT USING (auth.uid() = customer_id OR public.is_admin(auth.uid()));

CREATE POLICY "Allow users to create their own orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Allow admin to manage all orders" ON public.orders
    FOR ALL USING (public.is_admin(auth.uid()));

-- Order Items Policies
CREATE POLICY "Allow users to view their own order items" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = order_items.order_id 
            AND (orders.customer_id = auth.uid() OR public.is_admin(auth.uid()))
        )
    );

CREATE POLICY "Allow users to insert items for their own orders" ON public.order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = order_items.order_id 
            AND orders.customer_id = auth.uid()
        )
    );

CREATE POLICY "Allow admin full access to order items" ON public.order_items
    FOR ALL USING (public.is_admin(auth.uid()));

-- Store Credits Policies
CREATE POLICY "Allow users to view their own store credit" ON public.store_credits
    FOR SELECT USING (auth.uid() = profile_id OR public.is_admin(auth.uid()));

CREATE POLICY "Allow admin to manage store credits" ON public.store_credits
    FOR ALL USING (public.is_admin(auth.uid()));

-- Blog Posts Policies
CREATE POLICY "Allow public read access to published posts" ON public.blog_posts
    FOR SELECT USING (status = 'published'::public.product_status OR public.is_admin(auth.uid()));

CREATE POLICY "Allow admin full access to blog posts" ON public.blog_posts
    FOR ALL USING (public.is_admin(auth.uid()));

-- Tickets Policies
CREATE POLICY "Allow users to view their own tickets" ON public.tickets
    FOR SELECT USING (auth.uid() = customer_id OR public.is_admin(auth.uid()));

CREATE POLICY "Allow users to open tickets" ON public.tickets
    FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Allow admin to manage all tickets" ON public.tickets
    FOR ALL USING (public.is_admin(auth.uid()));

-- Ticket Messages Policies
CREATE POLICY "Allow users to view messages on their own tickets" ON public.ticket_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tickets 
            WHERE tickets.id = ticket_messages.ticket_id 
            AND (tickets.customer_id = auth.uid() OR public.is_admin(auth.uid()))
        )
    );

CREATE POLICY "Allow users to post messages on their own tickets" ON public.ticket_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM public.tickets 
            WHERE tickets.id = ticket_messages.ticket_id 
            AND (tickets.customer_id = auth.uid() OR public.is_admin(auth.uid()))
        )
    );

-- Recommendation Logs Policies
CREATE POLICY "Allow insert access to anyone for recommendation logging" ON public.recommendation_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow admin select access to recommendation logs" ON public.recommendation_logs
    FOR SELECT USING (public.is_admin(auth.uid()));
