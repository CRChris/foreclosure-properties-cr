-- ==============================================================================
-- REMATES JUDICIALES COSTA RICA - SUPABASE POSTGRESQL + POSTGIS DATABASE SCHEMA
-- ==============================================================================
-- Description: Production-grade schema for tracking Costa Rican judicial foreclosure auctions
-- Includes PostGIS geometry support, spatial indexing, automated timestamp triggers,
-- and bounding box RPC functions for zero-cost map querying.
-- ==============================================================================

-- 1. Enable Required PostGIS Extension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. Create Auctions Table
CREATE TABLE IF NOT EXISTS public.auctions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Judicial & Registry Identification
    expediente_number VARCHAR(64) NOT NULL,            -- e.g. '24-000123-1158-CJ'
    court_name TEXT NOT NULL,                          -- e.g. 'Juzgado Especializado de Cobro de San José'
    folio_real VARCHAR(32) NOT NULL,                   -- e.g. '6-189342-000' (Province-Number-Sublot)
    plano_catastrado VARCHAR(64),                      -- e.g. 'P-1928374-2022'
    
    -- Geographic Information (Costa Rican Political Division)
    province VARCHAR(32) NOT NULL,                     -- San José, Alajuela, Cartago, Heredia, Guanacaste, Puntarenas, Limón
    canton VARCHAR(64) NOT NULL,                       -- e.g. 'Garabito', 'Escazú', 'San Carlos'
    district VARCHAR(64) NOT NULL,                     -- e.g. 'Jacó', 'San Antonio', 'Quesada'
    address_description TEXT,                          -- Specific physical directions/references
    
    -- Cadastral Metrics
    area_m2 NUMERIC(12, 2) NOT NULL CHECK (area_m2 > 0),
    
    -- Currency & 3-Call Judicial Auction Schedule
    -- Costa Rican Judicial Code model:
    -- 1st Call (Primer Remate): 100% Base Price
    -- 2nd Call (Segundo Remate): 75% of Base Price (-25%)
    -- 3rd Call (Tercer Remate): 25% of Base Price / Statutory base
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('USD', 'CRC')),
    
    base_price_call_1 NUMERIC(15, 2) NOT NULL CHECK (base_price_call_1 > 0),
    auction_date_call_1 TIMESTAMPTZ NOT NULL,
    
    base_price_call_2 NUMERIC(15, 2),
    auction_date_call_2 TIMESTAMPTZ,
    
    base_price_call_3 NUMERIC(15, 2),
    auction_date_call_3 TIMESTAMPTZ,
    
    -- Valuation & Investor Yield Estimation
    estimated_market_value NUMERIC(15, 2),
    estimated_margin_pct NUMERIC(6, 2) GENERATED ALWAYS AS (
        CASE 
            WHEN estimated_market_value IS NOT NULL 
                 AND estimated_market_value > 0 
                 AND base_price_call_1 > 0 
            THEN ROUND(((estimated_market_value - base_price_call_1) / estimated_market_value) * 100, 2)
            ELSE NULL 
        END
    ) STORED,
    
    -- Legal Parties & Content Extraction
    plaintiff TEXT NOT NULL,                           -- Bank/Financial institution (e.g. 'Banco Nacional de Costa Rica')
    defendant TEXT,                                    -- Debtor / Executed party
    legal_summary TEXT,                                -- AI-generated executive summary of the edict
    raw_edict_text TEXT NOT NULL,                      -- Full raw legal publication from Boletín Judicial
    
    -- Geospatial Point (WGS 84 / EPSG:4326)
    location GEOMETRY(Point, 4326),
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes for High-Performance Queries
-- Spatial GIST index for lightning-fast bounding box map queries
CREATE INDEX IF NOT EXISTS idx_auctions_location_gist 
    ON public.auctions USING GIST (location);

-- B-Tree indexes for standard filter & sort dimensions
CREATE INDEX IF NOT EXISTS idx_auctions_province 
    ON public.auctions (province);

CREATE INDEX IF NOT EXISTS idx_auctions_canton 
    ON public.auctions (canton);

CREATE INDEX IF NOT EXISTS idx_auctions_auction_date_call_1 
    ON public.auctions (auction_date_call_1 ASC);

CREATE INDEX IF NOT EXISTS idx_auctions_base_price_call_1 
    ON public.auctions (base_price_call_1 ASC);

CREATE INDEX IF NOT EXISTS idx_auctions_folio_real 
    ON public.auctions (folio_real);

CREATE INDEX IF NOT EXISTS idx_auctions_expediente_number 
    ON public.auctions (expediente_number);

CREATE INDEX IF NOT EXISTS idx_auctions_currency 
    ON public.auctions (currency);

-- 4. Automated Updated At Trigger Function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auctions_updated_at ON public.auctions;
CREATE TRIGGER trigger_auctions_updated_at
    BEFORE UPDATE ON public.auctions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 5. Geospatial RPC Function: Query Auctions within Bounding Box
-- Efficiently extracts auctions inside Leaflet/OpenStreetMap viewport
CREATE OR REPLACE FUNCTION public.get_auctions_in_bounds(
    min_lng DOUBLE PRECISION,
    min_lat DOUBLE PRECISION,
    max_lng DOUBLE PRECISION,
    max_lat DOUBLE PRECISION,
    target_currency VARCHAR DEFAULT NULL,
    max_price NUMERIC DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    expediente_number VARCHAR,
    court_name TEXT,
    folio_real VARCHAR,
    plano_catastrado VARCHAR,
    province VARCHAR,
    canton VARCHAR,
    district VARCHAR,
    area_m2 NUMERIC,
    currency VARCHAR,
    base_price_call_1 NUMERIC,
    auction_date_call_1 TIMESTAMPTZ,
    base_price_call_2 NUMERIC,
    auction_date_call_2 TIMESTAMPTZ,
    base_price_call_3 NUMERIC,
    auction_date_call_3 TIMESTAMPTZ,
    estimated_market_value NUMERIC,
    estimated_margin_pct NUMERIC,
    plaintiff TEXT,
    legal_summary TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.expediente_number,
        a.court_name,
        a.folio_real,
        a.plano_catastrado,
        a.province,
        a.canton,
        a.district,
        a.area_m2,
        a.currency,
        a.base_price_call_1,
        a.auction_date_call_1,
        a.base_price_call_2,
        a.auction_date_call_2,
        a.base_price_call_3,
        a.auction_date_call_3,
        a.estimated_market_value,
        a.estimated_margin_pct,
        a.plaintiff,
        a.legal_summary,
        ST_Y(a.location::geometry) AS latitude,
        ST_X(a.location::geometry) AS longitude
    FROM public.auctions a
    WHERE a.location IS NOT NULL
      AND ST_Within(
            a.location,
            ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
          )
      AND (target_currency IS NULL OR a.currency = target_currency)
      AND (max_price IS NULL OR a.base_price_call_1 <= max_price)
    ORDER BY a.auction_date_call_1 ASC;
END;
$$;

-- 6. Supabase Row Level Security (RLS)
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all auctions
CREATE POLICY "Allow public read access on auctions"
    ON public.auctions
    FOR SELECT
    USING (true);

-- Allow service role full access for scraper ingestion
CREATE POLICY "Allow service role full access on auctions"
    ON public.auctions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
