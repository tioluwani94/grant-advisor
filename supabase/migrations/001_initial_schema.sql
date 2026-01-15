-- Create organisations table
CREATE TABLE IF NOT EXISTS organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  is_funder BOOLEAN DEFAULT FALSE,
  is_recipient BOOLEAN DEFAULT FALSE,
  funder_stats JSONB,
  recipient_stats JSONB,
  last_grant_made_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create grants table
CREATE TABLE IF NOT EXISTS grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id TEXT UNIQUE NOT NULL,
  title TEXT,
  description TEXT,
  amount_awarded NUMERIC,
  currency TEXT DEFAULT 'GBP',
  award_date TIMESTAMP,
  funder_org_id TEXT,
  recipient_org_id TEXT,
  grant_programme JSONB,
  classifications JSONB,
  beneficiary_location JSONB,
  raw_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create sync_logs table
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL,
  orgs_synced INTEGER DEFAULT 0,
  grants_synced INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_grants_funder ON grants(funder_org_id);
CREATE INDEX IF NOT EXISTS idx_grants_recipient ON grants(recipient_org_id);
CREATE INDEX IF NOT EXISTS idx_grants_award_date ON grants(award_date DESC);
CREATE INDEX IF NOT EXISTS idx_orgs_is_funder ON organisations(is_funder) WHERE is_funder = true;

-- Create GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_grants_classifications ON grants USING gin(classifications);
CREATE INDEX IF NOT EXISTS idx_grants_beneficiary_location ON grants USING gin(beneficiary_location);

-- Add foreign key constraints (optional, for data integrity)
ALTER TABLE grants
  ADD CONSTRAINT fk_grants_funder
  FOREIGN KEY (funder_org_id)
  REFERENCES organisations(org_id)
  ON DELETE SET NULL;

ALTER TABLE grants
  ADD CONSTRAINT fk_grants_recipient
  FOREIGN KEY (recipient_org_id)
  REFERENCES organisations(org_id)
  ON DELETE SET NULL;

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_organisations_updated_at
  BEFORE UPDATE ON organisations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grants_updated_at
  BEFORE UPDATE ON grants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
