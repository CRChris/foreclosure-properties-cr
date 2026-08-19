-- ==============================================================================
-- MIGRATION: Add auctions_with_coords view for coordinate extraction
-- ==============================================================================
-- Supabase's JS client cannot call ST_Y() / ST_X() directly in select().
-- This view exposes latitude and longitude as plain DOUBLE PRECISION columns
-- so that supabase.from('auctions_with_coords').select('*') returns numeric
-- lat/lng fields instead of a raw PostGIS Hex EWKB geometry blob.
-- ==============================================================================

CREATE OR REPLACE VIEW public.auctions_with_coords AS
SELECT 
    a.*,
    ST_Y(a.location::geometry)::DOUBLE PRECISION AS latitude,
    ST_X(a.location::geometry)::DOUBLE PRECISION AS longitude
FROM public.auctions a;

-- Grant same access as base table
GRANT SELECT ON public.auctions_with_coords TO anon;
GRANT SELECT ON public.auctions_with_coords TO authenticated;
GRANT SELECT ON public.auctions_with_coords TO service_role;
