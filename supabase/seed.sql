-- ====================================================
-- NURA SKINCARE DATABASE SEED FILE
-- ====================================================

-- ----------------------------------------------------
-- Seed: Categories
-- ----------------------------------------------------
INSERT INTO public.categories (id, name, slug, description) VALUES
('b27abfb2-ce37-4d7a-8fbb-574944ecbb01', 'Limpeza', 'limpeza', 'Géis de limpeza, espumas e óleos desmaquilhantes para purificar a pele.'),
('b27abfb2-ce37-4d7a-8fbb-574944ecbb02', 'Tónicos & Essências', 'tonicos-essencias', 'Hidratação profunda imediata e equilíbrio do pH da pele.'),
('b27abfb2-ce37-4d7a-8fbb-574944ecbb03', 'Séruns & Tratamentos', 'seruns-tratamentos', 'Fórmulas concentradas com ingredientes ativos para tratar problemas específicos.'),
('b27abfb2-ce37-4d7a-8fbb-574944ecbb04', 'Hidratantes', 'hidratantes', 'Cremes, loções e géis que selam a humidade e fortalecem a barreira da pele.'),
('b27abfb2-ce37-4d7a-8fbb-574944ecbb05', 'Protetores Solares', 'protetores-solares', 'Proteção essencial diária contra os raios UV com texturas leves e invisíveis.')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------
-- Seed: Products (Sample K-Beauty Products)
-- ----------------------------------------------------
INSERT INTO public.products (id, name, slug, description, price, compare_at_price, sku, stock_quantity, status, images, benefits, ingredients, how_to_use, source_import) VALUES
-- Product 1: COSRX Snail Mucin Essence
('c1a89c92-300f-488f-9a1d-a94f6f7aa501', 
 'COSRX Advanced Snail 96 Mucin Power Essence', 
 'cosrx-advanced-snail-96-mucin-power-essence',
 'Uma essência leve e de rápida absorção que melhora a textura da pele, acalma a vermelhidão e proporciona uma hidratação intensa de longa duração.',
 1850.00, 
 2200.00, 
 'K-CSRX-S96-01', 
 45, 
 'published', 
 ARRAY['/images/products/cosrx-snail-essence-1.jpg', '/images/products/cosrx-snail-essence-2.jpg'],
 ARRAY['Hidratação profunda sem sensação pesada', 'Repara a barreira cutânea danificada', 'Suaviza cicatrizes de acne e hiperpigmentação', 'Melhora a elasticidade natural da pele'],
 '96% de Filtrado de Secreção de Caracol (Mucina), Hialuronato de Sódio, Alantoína, Pantenol.',
 'Após limpar e tonificar o rosto, aplique uma pequena quantidade em toda a face. Pressione suavemente com as pontas dos dedos para ajudar na absorção.',
 'manual'),

-- Product 2: Beauty of Joseon Sun Relief
('c1a89c92-300f-488f-9a1d-a94f6f7aa502', 
 'Beauty of Joseon Relief Sun: Rice + Probiotics SPF50+', 
 'beauty-of-joseon-relief-sun-rice-probiotics-spf50',
 'Um protetor solar orgânico ultraleve que se funde perfeitamente na pele sem deixar resíduos brancos. Enriquecido com extratos de arroz e probióticos.',
 1950.00, 
 null, 
 'K-BOJ-RSUN-02', 
 60, 
 'published', 
 ARRAY['/images/products/boj-relief-sun-1.jpg'],
 ARRAY['Fórmula hidratante que se assemelha a um creme leve', 'Acabamento natural e radiante sem oleosidade', 'Proteção de amplo espetro SPF50+ PA++++', 'Acalma e ilumina a pele com probióticos do arroz'],
 '30% Extrato de Arroz, Extratos de Fermentos de Grãos (Probióticos), Niacinamida, Adenosina.',
 'Como último passo da sua rotina de cuidados diurnos, aplique uniformemente nas áreas expostas ao sol.',
 'manual'),

-- Product 3: Beauty of Joseon Ginseng Serum
('c1a89c92-300f-488f-9a1d-a94f6f7aa503', 
 'Beauty of Joseon Revive Serum: Ginseng + Snail Mucin', 
 'beauty-of-joseon-revive-serum-ginseng-snail',
 'Um sérum luxuoso formulado para pele sem brilho e cansada, que ajuda a combater linhas finas e a uniformizar o tom da pele.',
 2100.00, 
 2500.00, 
 'K-BOJ-REV-03', 
 20, 
 'draft', -- Seeding a draft product to verify import/visibility restrictions
 ARRAY['/images/products/boj-ginseng-snail-1.jpg'],
 ARRAY['Nutrição intensa para peles fatigadas', 'Propriedades anti-envelhecimento e regeneradoras', 'Uniformiza a textura áspera da pele'],
 '63% Água de Raiz de Ginseng, 3% Filtrado de Secreção de Caracol, Niacinamida, Hialuronato de Sódio.',
 'Aplique 2-3 gotas no rosto limpo e tonificado. Pressione suavemente até absorver.',
 'manual')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------
-- Seed: Product Category Junctions
-- ----------------------------------------------------
INSERT INTO public.product_category_junction (product_id, category_id) VALUES
('c1a89c92-300f-488f-9a1d-a94f6f7aa501', 'b27abfb2-ce37-4d7a-8fbb-574944ecbb02'), -- COSRX in Toners & Essences
('c1a89c92-300f-488f-9a1d-a94f6f7aa502', 'b27abfb2-ce37-4d7a-8fbb-574944ecbb05'), -- BOJ Sunscreen in Sunscreens
('c1a89c92-300f-488f-9a1d-a94f6f7aa503', 'b27abfb2-ce37-4d7a-8fbb-574944ecbb03')  -- BOJ Ginseng in Serums
ON CONFLICT (product_id, category_id) DO NOTHING;
