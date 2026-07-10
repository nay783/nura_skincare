-- Migration to add columns to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS main_image_url text,
ADD COLUMN IF NOT EXISTS external_images text[],
ADD COLUMN IF NOT EXISTS skin_goals text[];
