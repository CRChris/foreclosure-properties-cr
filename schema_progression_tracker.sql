-- ==============================================================================
-- REMATES JUDICIALES COSTA RICA - AUTOMATED AUCTION PROGRESSION & TRACKER ENGINE
-- ==============================================================================
-- Single Source of Truth for Auction Call Progression & Lifecycle Tracking
-- Strictly pinned to Costa Rica Timezone ('America/Costa_Rica' / UTC-6)
-- Enforces Terminal State Locks (Suspended, Awarded, Annulled, Settled)
-- ==============================================================================

-- 1. Add Lifecycle & Current Call Tracking Columns to public.auctions
ALTER TABLE public.auctions
    ADD COLUMN IF NOT EXISTS call_stage VARCHAR(32) DEFAULT 'call_1',
    ADD COLUMN IF NOT EXISTS sale_status VARCHAR(32) DEFAULT 'upcoming',
    ADD COLUMN IF NOT EXISTS current_call_number INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS current_base_price NUMERIC(15, 2),
    ADD COLUMN IF NOT EXISTS current_auction_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS current_discount_pct NUMERIC(5, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS last_status_sync_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'America/Costa_Rica');

-- Create Performance Indexes for Fast Stage/Status Filtering
CREATE INDEX IF NOT EXISTS idx_auctions_call_stage 
    ON public.auctions (call_stage);

CREATE INDEX IF NOT EXISTS idx_auctions_sale_status 
    ON public.auctions (sale_status);

CREATE INDEX IF NOT EXISTS idx_auctions_current_call_number 
    ON public.auctions (current_call_number);

CREATE INDEX IF NOT EXISTS idx_auctions_current_auction_date 
    ON public.auctions (current_auction_date ASC);

-- 2. Create Audit Trail Table: public.auction_lifecycle_logs
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

-- Enable RLS on lifecycle logs
ALTER TABLE public.auction_lifecycle_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on auction_lifecycle_logs" ON public.auction_lifecycle_logs;
CREATE POLICY "Allow public read access on auction_lifecycle_logs"
    ON public.auction_lifecycle_logs
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow service role full access on auction_lifecycle_logs" ON public.auction_lifecycle_logs;
CREATE POLICY "Allow service role full access on auction_lifecycle_logs"
    ON public.auction_lifecycle_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 3. Pure Calculation Function: public.compute_auction_progression_state
-- Calculates the current stage, status, call number, base price, and discount
-- Strictly evaluated in Costa Rica Timezone (UTC-6) with 60-minute hearing window
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
    -- Pin to Costa Rica timezone
    v_cr_now := p_current_time;

    -- If the auction is locked in a terminal or court-suspended state, DO NOT alter it
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

    -- Extract dates and prices
    v_d1 := p_auction_row.auction_date_call_1;
    v_d2 := p_auction_row.auction_date_call_2;
    v_d3 := p_auction_row.auction_date_call_3;

    v_p1 := p_auction_row.base_price_call_1;
    -- Standard Costa Rica CPC statutory rules: Call 2 = 75% of Base 1, Call 3 = 25% of Base 1
    v_p2 := COALESCE(p_auction_row.base_price_call_2, ROUND(v_p1 * 0.75, 2));
    v_p3 := COALESCE(p_auction_row.base_price_call_3, ROUND(v_p1 * 0.25, 2));

    -- Hearing window duration is 60 minutes
    v_d1_end := v_d1 + INTERVAL '60 minutes';
    v_d2_end := CASE WHEN v_d2 IS NOT NULL THEN v_d2 + INTERVAL '60 minutes' ELSE NULL END;
    v_d3_end := CASE WHEN v_d3 IS NOT NULL THEN v_d3 + INTERVAL '60 minutes' ELSE NULL END;

    -- Progression Logic Evaluation
    IF v_cr_now < v_d1 THEN
        -- Before Call 1: Call 1 Upcoming
        v_stage := 'call_1';
        v_status := 'upcoming';
        v_call_num := 1;
        v_price := v_p1;
        v_date := v_d1;
        v_discount := 0.00;

    ELSIF v_cr_now >= v_d1 AND v_cr_now <= v_d1_end THEN
        -- During Call 1 (60 min judicial hearing window)
        v_stage := 'call_1';
        v_status := 'in_progress';
        v_call_num := 1;
        v_price := v_p1;
        v_date := v_d1;
        v_discount := 0.00;

    ELSIF v_d2 IS NOT NULL AND v_cr_now > v_d1_end AND v_cr_now < v_d2 THEN
        -- Call 1 ended with no bids -> Progressed to Call 2 Upcoming (-25% discount)
        v_stage := 'call_2';
        v_status := 'upcoming';
        v_call_num := 2;
        v_price := v_p2;
        v_date := v_d2;
        v_discount := 25.00;

    ELSIF v_d2 IS NOT NULL AND v_cr_now >= v_d2 AND v_cr_now <= v_d2_end THEN
        -- During Call 2 (60 min judicial hearing window)
        v_stage := 'call_2';
        v_status := 'in_progress';
        v_call_num := 2;
        v_price := v_p2;
        v_date := v_d2;
        v_discount := 25.00;

    ELSIF v_d3 IS NOT NULL AND (v_d2 IS NULL OR v_cr_now > v_d2_end) AND v_cr_now < v_d3 THEN
        -- Call 2 ended with no bids -> Progressed to Call 3 Upcoming (-75% discount)
        v_stage := 'call_3';
        v_status := 'upcoming';
        v_call_num := 3;
        v_price := v_p3;
        v_date := v_d3;
        v_discount := 75.00;

    ELSIF v_d3 IS NOT NULL AND v_cr_now >= v_d3 AND v_cr_now <= v_d3_end THEN
        -- During Call 3 (60 min judicial hearing window)
        v_stage := 'call_3';
        v_status := 'in_progress';
        v_call_num := 3;
        v_price := v_p3;
        v_date := v_d3;
        v_discount := 75.00;

    ELSE
        -- All scheduled calls have expired without postors -> Passed Call 3 / Deserted
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

-- 4. Trigger Function for Automatic State Assignment on Insert/Update
CREATE OR REPLACE FUNCTION public.handle_auction_lifecycle_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_calc RECORD;
BEGIN
    -- Terminal status lock: Never overwrite terminal statuses
    IF NEW.sale_status IN ('suspended', 'adjudicated_to_creditor', 'adjudicated_to_bidder', 'awarded', 'annulled', 'settled') THEN
        NEW.last_status_sync_at := (NOW() AT TIME ZONE 'America/Costa_Rica');
        RETURN NEW;
    END IF;

    -- Compute live calculated values
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

-- 5. Master Single Source of Truth Batch RPC Function: public.sync_auction_lifecycle_statuses
-- Triggers batch progression evaluation for all active auctions and logs state changes.
-- Can be called via Supabase RPC: supabase.rpc('sync_auction_lifecycle_statuses')
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
    -- Pinned to Costa Rica Time
    v_cr_now := (NOW() AT TIME ZONE 'America/Costa_Rica');

    -- Iterate through non-terminal auctions
    FOR r IN 
        SELECT * FROM public.auctions 
        WHERE sale_status IS NULL OR sale_status NOT IN ('suspended', 'adjudicated_to_creditor', 'adjudicated_to_bidder', 'awarded', 'annulled', 'settled')
    LOOP
        v_total_processed := v_total_processed + 1;

        SELECT * INTO v_calc FROM public.compute_auction_progression_state(r, v_cr_now);

        -- Check if stage or status transitioned
        IF (r.call_stage IS DISTINCT FROM v_calc.out_call_stage) OR 
           (r.sale_status IS DISTINCT FROM v_calc.out_sale_status) OR
           (r.current_call_number IS DISTINCT FROM v_calc.out_current_call_number) OR
           (r.current_base_price IS DISTINCT FROM v_calc.out_current_base_price) THEN

            -- Build descriptive reason
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

            -- Update the auction row
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

            -- Record entry in audit logs
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
            -- Keep timestamp fresh
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

-- 6. Initial Migration Backfill: Run Batch Sync on existing records
SELECT public.sync_auction_lifecycle_statuses();
