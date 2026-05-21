-- Persisted plans for sharing + SEO. Each shareable /plans/[id] page is a
-- row here. Public read (the URL is the credential); server-side-only write
-- via SUPABASE_SERVICE_ROLE_KEY so the anon client can't pollute.

CREATE TABLE IF NOT EXISTS shared_plans (
  id            TEXT PRIMARY KEY,                       -- 12-char base62 slug
  plan          JSONB NOT NULL,                          -- serialised PlanState
  brief         JSONB,                                   -- optional TripBrief (for richer OG / SEO meta)
  source        TEXT NOT NULL DEFAULT 'ai_plan',         -- ai_plan | stepper
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  view_count    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS shared_plans_created_at_idx
  ON shared_plans (created_at DESC);

ALTER TABLE shared_plans ENABLE ROW LEVEL SECURITY;

-- Anyone with a slug can read. The URL itself is the access token.
DROP POLICY IF EXISTS "Public read" ON shared_plans;
CREATE POLICY "Public read" ON shared_plans
  FOR SELECT USING (true);

-- Anonymous clients cannot insert. Service role bypasses RLS so the server
-- API route can still write — this just locks down the client surface.
DROP POLICY IF EXISTS "No anon write" ON shared_plans;
CREATE POLICY "No anon write" ON shared_plans
  FOR INSERT WITH CHECK (false);

-- Cheap server-side counter bump for view analytics. Service role bypasses
-- RLS so this is just defensive.
DROP POLICY IF EXISTS "No anon update" ON shared_plans;
CREATE POLICY "No anon update" ON shared_plans
  FOR UPDATE USING (false) WITH CHECK (false);
