-- ==============================================================================
-- MIGRATION: Cadastral Plano Exact Geocoding & Parcel Polygons
-- ==============================================================================
-- Adds exact cadastral location tracking and GeoJSON parcel boundary storage
-- to public.auctions table.
-- ==============================================================================

-- 1. Add location_type and parcel_polygon columns if not already present
ALTER TABLE public.auctions 
ADD COLUMN IF NOT EXISTS location_type VARCHAR(32) DEFAULT 'approximate_town';

ALTER TABLE public.auctions 
ADD COLUMN IF NOT EXISTS parcel_polygon JSONB;

-- 2. Add constraint for location_type values
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_auctions_location_type'
    ) THEN
        ALTER TABLE public.auctions 
        ADD CONSTRAINT check_auctions_location_type 
        CHECK (location_type IN ('exact_cadastral', 'approximate_town'));
    END IF;
END $$;

-- 3. Create index for location_type filtering
CREATE INDEX IF NOT EXISTS idx_auctions_location_type 
ON public.auctions (location_type);

-- 4. Update get_auctions_in_bounds RPC function to include location_type & parcel_polygon
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
