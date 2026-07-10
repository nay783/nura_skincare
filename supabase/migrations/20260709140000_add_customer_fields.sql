-- Migration to add birth_date to profiles and reference_point to addresses
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS reference_point TEXT;
