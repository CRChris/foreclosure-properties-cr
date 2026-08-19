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
    
    -- Geospatial Point & Cadastral Boundaries (WGS 84 / EPSG:4326)
    location GEOMETRY(Point, 4326),
    location_type VARCHAR(32) DEFAULT 'approximate_town' CHECK (location_type IN ('exact_cadastral', 'approximate_town')),
    parcel_polygon JSONB,
    
    -- Automated Lifecycle Stage & Call Progression (Costa Rica CPC)
    call_stage VARCHAR(32) DEFAULT 'call_1',           -- 'call_1', 'call_2', 'call_3', 'passed_call_3', 'suspended', 'awarded'
    sale_status VARCHAR(32) DEFAULT 'upcoming',        -- 'upcoming', 'in_progress', 'deserted', 'adjudicated_to_creditor', 'adjudicated_to_bidder', 'suspended', 'annulled'
    current_call_number INTEGER DEFAULT 1,             -- 1, 2, 3, or NULL
    current_base_price NUMERIC(15, 2),                 -- Live active base price
    current_auction_date TIMESTAMPTZ,                  -- Live active auction date
    current_discount_pct NUMERIC(5, 2) DEFAULT 0.00,   -- 0.00, 25.00, 75.00
    last_status_sync_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'America/Costa_Rica'),

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes for High-Performance Queries
-- Spatial GIST index for lightning-fast bounding box map queries
CREATE INDEX IF NOT EXISTS idx_auctions_location_gist 
    ON public.auctions USING GIST (location);

CREATE INDEX IF NOT EXISTS idx_auctions_location_type 
    ON public.auctions (location_type);

-- B-Tree indexes for standard filter & sort dimensions
CREATE INDEX IF NOT EXISTS idx_auctions_call_stage 
    ON public.auctions (call_stage);

CREATE INDEX IF NOT EXISTS idx_auctions_sale_status 
    ON public.auctions (sale_status);

CREATE INDEX IF NOT EXISTS idx_auctions_current_call_number 
    ON public.auctions (current_call_number);

CREATE INDEX IF NOT EXISTS idx_auctions_current_auction_date 
    ON public.auctions (current_auction_date ASC);

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
    longitude DOUBLE PRECISION,
    location_type VARCHAR,
    parcel_polygon JSONB
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
        ST_X(a.location::geometry) AS longitude,
        COALESCE(a.location_type, 'approximate_town') AS location_type,
        a.parcel_polygon
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

-- 7. Audit Trail Table: public.auction_lifecycle_logs
CREATE TABLE IF NOT EXISTS public.auction_lifecycle_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
    previous_stage VARCHAR(32),
    new_stage VARCHAR(32) NOT NULL,
    previous_status VARCHAR(32),
    new_status VARCHAR(32) NOT NULL,
    call_number INTEGER,
    reason TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'America/Costa_Rica')
);

CREATE INDEX IF NOT EXISTS idx_auction_lifecycle_logs_auction_id 
    ON public.auction_lifecycle_logs (auction_id);

CREATE INDEX IF NOT EXISTS idx_auction_lifecycle_logs_created_at 
    ON public.auction_lifecycle_logs (created_at DESC);

ALTER TABLE public.auction_lifecycle_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on auction_lifecycle_logs"
    ON public.auction_lifecycle_logs
    FOR SELECT
    USING (true);

CREATE POLICY "Allow service role full access on auction_lifecycle_logs"
    ON public.auction_lifecycle_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 8. Pure Calculation Function: public.compute_auction_progression_state
CREATE OR REPLACE FUNCTION public.compute_auction_progression_state(
    p_auction_row public.auctions,
    p_current_time TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'America/Costa_Rica')
)
RETURNS TABLE (
    out_call_stage VARCHAR(32),
    out_sale_status VARCHAR(32),
    out_current_call_number INTEGER,
    out_current_base_price NUMERIC(15, 2),
    out_current_auction_date TIMESTAMPTZ,
    out_current_discount_pct NUMERIC(5, 2)
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_cr_now TIMESTAMPTZ;
    v_d1 TIMESTAMPTZ;
    v_d2 TIMESTAMPTZ;
    v_d3 TIMESTAMPTZ;
    v_d1_end TIMESTAMPTZ;
    v_d2_end TIMESTAMPTZ;
    v_d3_end TIMESTAMPTZ;
    v_p1 NUMERIC(15, 2);
    v_p2 NUMERIC(15, 2);
    v_p3 NUMERIC(15, 2);
    v_stage VARCHAR(32);
    v_status VARCHAR(32);
    v_call_num INTEGER;
    v_price NUMERIC(15, 2);
    v_date TIMESTAMPTZ;
    v_discount NUMERIC(5, 2);
BEGIN
    v_cr_now := p_current_time;

    -- Terminal status lock: Never alter locked/suspended/awarded records
    IF p_auction_row.sale_status IN ('suspended', 'adjudicated_to_creditor', 'adjudicated_to_bidder', 'awarded', 'annulled', 'settled') THEN
        RETURN QUERY SELECT 
            COALESCE(p_auction_row.call_stage, 'suspended')::VARCHAR(32),
            p_auction_row.sale_status::VARCHAR(32),
            p_auction_row.current_call_number,
            COALESCE(p_auction_row.current_base_price, p_auction_row.base_price_call_1),
            COALESCE(p_auction_row.current_auction_date, p_auction_row.auction_date_call_1),
            COALESCE(p_auction_row.current_discount_pct, 0.00);
        RETURN;
    END IF;

    v_d1 := p_auction_row.auction_date_call_1;
    v_d2 := p_auction_row.auction_date_call_2;
    v_d3 := p_auction_row.auction_date_call_3;

    v_p1 := p_auction_row.base_price_call_1;
    v_p2 := COALESCE(p_auction_row.base_price_call_2, ROUND(v_p1 * 0.75, 2));
    v_p3 := COALESCE(p_auction_row.base_price_call_3, ROUND(v_p1 * 0.25, 2));

    v_d1_end := v_d1 + INTERVAL '60 minutes';
    v_d2_end := CASE WHEN v_d2 IS NOT NULL THEN v_d2 + INTERVAL '60 minutes' ELSE NULL END;
    v_d3_end := CASE WHEN v_d3 IS NOT NULL THEN v_d3 + INTERVAL '60 minutes' ELSE NULL END;

    IF v_cr_now < v_d1 THEN
        v_stage := 'call_1';
        v_status := 'upcoming';
        v_call_num := 1;
        v_price := v_p1;
        v_date := v_d1;
        v_discount := 0.00;
    ELSIF v_cr_now >= v_d1 AND v_cr_now <= v_d1_end THEN
        v_stage := 'call_1';
        v_status := 'in_progress';
        v_call_num := 1;
        v_price := v_p1;
        v_date := v_d1;
        v_discount := 0.00;
    ELSIF v_d2 IS NOT NULL AND v_cr_now > v_d1_end AND v_cr_now < v_d2 THEN
        v_stage := 'call_2';
        v_status := 'upcoming';
        v_call_num := 2;
        v_price := v_p2;
        v_date := v_d2;
        v_discount := 25.00;
    ELSIF v_d2 IS NOT NULL AND v_cr_now >= v_d2 AND v_cr_now <= v_d2_end THEN
        v_stage := 'call_2';
        v_status := 'in_progress';
        v_call_num := 2;
        v_price := v_p2;
        v_date := v_d2;
        v_discount := 25.00;
    ELSIF v_d3 IS NOT NULL AND (v_d2 IS NULL OR v_cr_now > v_d2_end) AND v_cr_now < v_d3 THEN
        v_stage := 'call_3';
        v_status := 'upcoming';
        v_call_num := 3;
        v_price := v_p3;
        v_date := v_d3;
        v_discount := 75.00;
    ELSIF v_d3 IS NOT NULL AND v_cr_now >= v_d3 AND v_cr_now <= v_d3_end THEN
        v_stage := 'call_3';
        v_status := 'in_progress';
        v_call_num := 3;
        v_price := v_p3;
        v_date := v_d3;
        v_discount := 75.00;
    ELSE
        v_stage := 'passed_call_3';
        v_status := 'deserted';
        v_call_num := NULL;
        v_price := COALESCE(v_p3, v_p2, v_p1);
        v_date := COALESCE(v_d3, v_d2, v_d1);
        v_discount := 75.00;
    END IF;

    RETURN QUERY SELECT v_stage, v_status, v_call_num, v_price, v_date, v_discount;
END;
$$;

-- 9. Trigger for Auto Progression Sync on public.auctions
CREATE OR REPLACE FUNCTION public.handle_auction_lifecycle_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_calc RECORD;
BEGIN
    IF NEW.sale_status IN ('suspended', 'adjudicated_to_creditor', 'adjudicated_to_bidder', 'awarded', 'annulled', 'settled') THEN
        NEW.last_status_sync_at := (NOW() AT TIME ZONE 'America/Costa_Rica');
        RETURN NEW;
    END IF;

    SELECT * INTO v_calc FROM public.compute_auction_progression_state(NEW);

    IF v_calc.out_call_stage IS NOT NULL THEN
        NEW.call_stage := v_calc.out_call_stage;
        NEW.sale_status := v_calc.out_sale_status;
        NEW.current_call_number := v_calc.out_current_call_number;
        NEW.current_base_price := v_calc.out_current_base_price;
        NEW.current_auction_date := v_calc.out_current_auction_date;
        NEW.current_discount_pct := v_calc.out_current_discount_pct;
        NEW.last_status_sync_at := (NOW() AT TIME ZONE 'America/Costa_Rica');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auctions_lifecycle_sync ON public.auctions;
CREATE TRIGGER trigger_auctions_lifecycle_sync
    BEFORE INSERT OR UPDATE ON public.auctions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_auction_lifecycle_trigger();

-- 10. Single Source of Truth Batch Stored Procedure: public.sync_auction_lifecycle_statuses
CREATE OR REPLACE FUNCTION public.sync_auction_lifecycle_statuses()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r public.auctions;
    v_calc RECORD;
    v_cr_now TIMESTAMPTZ;
    v_total_processed INTEGER := 0;
    v_total_updated INTEGER := 0;
    v_log_reason TEXT;
    v_transitions JSONB := '[]'::jsonb;
BEGIN
    v_cr_now := (NOW() AT TIME ZONE 'America/Costa_Rica');

    FOR r IN 
        SELECT * FROM public.auctions 
        WHERE sale_status IS NULL OR sale_status NOT IN ('suspended', 'adjudicated_to_creditor', 'adjudicated_to_bidder', 'awarded', 'annulled', 'settled')
    LOOP
        v_total_processed := v_total_processed + 1;

        SELECT * INTO v_calc FROM public.compute_auction_progression_state(r, v_cr_now);

        IF (r.call_stage IS DISTINCT FROM v_calc.out_call_stage) OR 
           (r.sale_status IS DISTINCT FROM v_calc.out_sale_status) OR
           (r.current_call_number IS DISTINCT FROM v_calc.out_current_call_number) OR
           (r.current_base_price IS DISTINCT FROM v_calc.out_current_base_price) THEN

            IF v_calc.out_sale_status = 'in_progress' THEN
                v_log_reason := FORMAT('Audiencia judicial en progreso para el Remate %s (Ventana de 60 min iniciada)', v_calc.out_current_call_number);
            ELSIF v_calc.out_call_stage = 'passed_call_3' THEN
                v_log_reason := 'Tercer remate finalizó sin postores (Desierto). En proceso de adjudicación o solicitud de nuevo remate.';
            ELSIF v_calc.out_current_call_number > COALESCE(r.current_call_number, 1) THEN
                v_log_reason := FORMAT('Remate previo venció sin postores. Progresión automática al Remate %s con precio base %s (-%s%%).', 
                    v_calc.out_current_call_number, v_calc.out_current_base_price, v_calc.out_current_discount_pct);
            ELSE
                v_log_reason := FORMAT('Actualización de ciclo de remate: %s / %s', v_calc.out_call_stage, v_calc.out_sale_status);
            END IF;

            UPDATE public.auctions
            SET 
                call_stage = v_calc.out_call_stage,
                sale_status = v_calc.out_sale_status,
                current_call_number = v_calc.out_current_call_number,
                current_base_price = v_calc.out_current_base_price,
                current_auction_date = v_calc.out_current_auction_date,
                current_discount_pct = v_calc.out_current_discount_pct,
                last_status_sync_at = v_cr_now,
                updated_at = NOW()
            WHERE id = r.id;

            INSERT INTO public.auction_lifecycle_logs (
                auction_id,
                previous_stage,
                new_stage,
                previous_status,
                new_status,
                call_number,
                reason,
                metadata
            ) VALUES (
                r.id,
                r.call_stage,
                v_calc.out_call_stage,
                r.sale_status,
                v_calc.out_sale_status,
                v_calc.out_current_call_number,
                v_log_reason,
                jsonb_build_object(
                    'expediente_number', r.expediente_number,
                    'previous_base_price', r.current_base_price,
                    'new_base_price', v_calc.out_current_base_price,
                    'discount_pct', v_calc.out_current_discount_pct,
                    'timestamp_cr', v_cr_now
                )
            );

            v_total_updated := v_total_updated + 1;
            v_transitions := v_transitions || jsonb_build_object(
                'auction_id', r.id,
                'expediente', r.expediente_number,
                'from_stage', r.call_stage,
                'to_stage', v_calc.out_call_stage,
                'from_status', r.sale_status,
                'to_status', v_calc.out_sale_status,
                'call_number', v_calc.out_current_call_number,
                'current_base_price', v_calc.out_current_base_price
            );
        ELSE
            UPDATE public.auctions
            SET last_status_sync_at = v_cr_now
            WHERE id = r.id;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'timestamp_cr', v_cr_now,
        'total_processed', v_total_processed,
        'total_updated', v_total_updated,
        'transitions', v_transitions
    );
END;
$$;

-- Revoke public access to prevent abuse
REVOKE EXECUTE ON FUNCTION public.sync_auction_lifecycle_statuses() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_auction_lifecycle_statuses() TO service_role;
