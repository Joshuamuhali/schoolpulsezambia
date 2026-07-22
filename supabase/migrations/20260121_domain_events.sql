-- ============================================================================
-- Domain Events System
-- ============================================================================
-- This table enables event-driven architecture across domains
-- Events are emitted by domain actions and processed by subscribers
-- ============================================================================

CREATE TABLE IF NOT EXISTS domain_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processing_error TEXT
);

-- Indexes for efficient event processing
CREATE INDEX IF NOT EXISTS idx_domain_events_school ON domain_events(school_id);
CREATE INDEX IF NOT EXISTS idx_domain_events_type_unprocessed ON domain_events(event_type, processed_at) WHERE processed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_domain_events_created ON domain_events(created_at DESC);

-- Enable RLS
ALTER TABLE domain_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Schools can view their own events"
  ON domain_events FOR SELECT
  USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "System can insert events"
  ON domain_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update events"
  ON domain_events FOR UPDATE
  WITH CHECK (true);

-- ============================================================================
-- Helper Function: Emit Domain Event
-- ============================================================================

CREATE OR REPLACE FUNCTION emit_domain_event(
  p_school_id UUID,
  p_event_type TEXT,
  p_payload JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO domain_events (school_id, event_type, payload)
  VALUES (p_school_id, p_event_type, p_payload)
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION emit_domain_event TO authenticated;

-- ============================================================================
-- Helper Function: Process Event
-- ============================================================================

CREATE OR REPLACE FUNCTION process_domain_event(
  p_event_id UUID,
  p_error TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE domain_events
  SET processed_at = NOW(),
      processing_error = p_error
  WHERE id = p_event_id;
  
  RETURN FOUND;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION process_domain_event TO authenticated;
