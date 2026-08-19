-- ==============================================================================
-- MIGRATION: auctions_with_coords view + schema cache reload + get_all_auctions RPC
-- ==============================================================================
-- Run this ENTIRE script in the Supabase SQL editor.
-- ==============================================================================

-- Step 1: Create or replace the view
CREATE OR REPLACE VIEW public.auctions_with_coords AS
SELECT 
    a.*,
    ST_Y(a.location::geometry)::DOUBLE PRECISION AS latitude,
    ST_X(a.location::geometry)::DOUBLE PRECISION AS longitude
FROM public.auctions a;

-- Step 2: Grant access to the view
GRANT SELECT ON public.auctions_with_coords TO anon;
GRANT SELECT ON public.auctions_with_coords TO authenticated;
GRANT SELECT ON public.auctions_with_coords TO service_role;

-- Step 3: Force PostgREST schema cache reload so the JS client can see the view
NOTIFY pgrst, 'reload schema';

-- Step 4: Create a fallback RPC that returns all auctions with numeric lat/lng
-- (avoids schema cache issues entirely — RPCs always work)
CREATE OR REPLACE FUNCTION public.get_all_auctions(
    p_province TEXT DEFAULT NULL,
    p_canton TEXT DEFAULT NULL,
    p_currency TEXT DEFAULT NULL,
    p_call_stage TEXT DEFAULT NULL,
    p_include_past BOOLEAN DEFAULT FALSE
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
    address_description TEXT,
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
    defendant TEXT,
    legal_summary TEXT,
    raw_edict_text TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location_type VARCHAR,
    parcel_polygon JSONB,
    call_stage VARCHAR,
    sale_status VARCHAR,
    current_call_number INTEGER,
    current_base_price NUMERIC,
    current_auction_date TIMESTAMPTZ,
    current_discount_pct NUMERIC,
    naturaleza_raw TEXT,
    has_construction BOOLEAN,
    has_public_road_frontage BOOLEAN,
    is_condominio BOOLEAN,
    lindero_norte TEXT,
    lindero_sur TEXT,
    lindero_este TEXT,
    lindero_oeste TEXT,
    servidumbres_notes TEXT,
    mortgage_priority TEXT,
    property_category TEXT,
    property_type TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
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
        a.address_description,
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
        a.defendant,
        a.legal_summary,
        a.raw_edict_text,
        CASE WHEN a.location IS NOT NULL THEN ST_Y(a.location::geometry)::DOUBLE PRECISION ELSE NULL END AS latitude,
        CASE WHEN a.location IS NOT NULL THEN ST_X(a.location::geometry)::DOUBLE PRECISION ELSE NULL END AS longitude,
        COALESCE(a.location_type, 'approximate_town') AS location_type,
        a.parcel_polygon,
        a.call_stage,
        a.sale_status,
        a.current_call_number,
        a.current_base_price,
        a.current_auction_date,
        a.current_discount_pct,
        a.naturaleza_raw,
        a.has_construction,
        a.has_public_road_frontage,
        a.is_condominio,
        a.lindero_norte,
        a.lindero_sur,
        a.lindero_este,
        a.lindero_oeste,
        a.servidumbres_notes,
        a.mortgage_priority,
        a.property_category,
        a.property_type,
        a.created_at,
        a.updated_at
    FROM public.auctions a
    WHERE
        (p_province IS NULL OR a.province ILIKE p_province)
        AND (p_canton IS NULL OR a.canton ILIKE p_canton)
        AND (p_currency IS NULL OR a.currency = p_currency)
        AND (p_call_stage IS NULL OR p_call_stage = 'all' OR a.call_stage = p_call_stage)
        AND (p_include_past OR a.call_stage NOT IN ('passed_call_3'))
        AND (p_include_past OR a.sale_status NOT IN ('deserted'))
    ORDER BY a.auction_date_call_1 ASC;
END;
$$;

-- Grant RPC access
GRANT EXECUTE ON FUNCTION public.get_all_auctions(TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION public.get_all_auctions(TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_auctions(TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO service_role;
