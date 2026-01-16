-- Migration: Create match_cache table for caching AI matching results
-- This reduces Claude API calls by storing matching results per charity

CREATE TABLE IF NOT EXISTS match_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  charity_number INTEGER NOT NULL,
  cache_key TEXT NOT NULL UNIQUE,
  charity_name TEXT,
  matches JSONB NOT NULL,
  funder_count INTEGER DEFAULT 0,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Index for fast lookups
  CONSTRAINT match_cache_charity_key UNIQUE (charity_number, cache_key)
);

-- Index for efficient cache lookups
CREATE INDEX IF NOT EXISTS idx_match_cache_charity_number ON match_cache(charity_number);
CREATE INDEX IF NOT EXISTS idx_match_cache_cache_key ON match_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_match_cache_expires_at ON match_cache(expires_at);

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_match_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM match_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comment for documentation
COMMENT ON TABLE match_cache IS 'Caches AI matching results to reduce Claude API calls. Entries expire after 7 days or when data sync occurs.';
COMMENT ON COLUMN match_cache.cache_key IS 'Hash of charity details + funder list to detect when re-matching is needed';
COMMENT ON COLUMN match_cache.last_sync_at IS 'Timestamp of the last data sync when this cache was created';
