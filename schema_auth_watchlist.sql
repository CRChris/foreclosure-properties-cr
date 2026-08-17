-- ==============================================================================
-- REMATES JUDICIALES COSTA RICA - USER WATCHLISTS & ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- 1. Create User Watchlists Table
CREATE TABLE IF NOT EXISTS public.user_watchlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
    notes TEXT,
    target_bid NUMERIC(15, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure user can only bookmark each auction once
    CONSTRAINT uq_user_auction UNIQUE (user_id, auction_id)
);

-- 2. Indexes for High-Performance Watchlist Lookups
CREATE INDEX IF NOT EXISTS idx_user_watchlists_user_id 
    ON public.user_watchlists (user_id);

CREATE INDEX IF NOT EXISTS idx_user_watchlists_auction_id 
    ON public.user_watchlists (auction_id);

CREATE INDEX IF NOT EXISTS idx_user_watchlists_created_at 
    ON public.user_watchlists (created_at DESC);

-- 3. Enable Row-Level Security on user_watchlists
ALTER TABLE public.user_watchlists ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for public.user_watchlists
DROP POLICY IF EXISTS "Users can select own watchlists" ON public.user_watchlists;
CREATE POLICY "Users can select own watchlists"
    ON public.user_watchlists
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own watchlists" ON public.user_watchlists;
CREATE POLICY "Users can insert own watchlists"
    ON public.user_watchlists
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own watchlists" ON public.user_watchlists;
CREATE POLICY "Users can update own watchlists"
    ON public.user_watchlists
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own watchlists" ON public.user_watchlists;
CREATE POLICY "Users can delete own watchlists"
    ON public.user_watchlists
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
