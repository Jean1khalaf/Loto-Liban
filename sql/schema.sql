CREATE TABLE IF NOT EXISTS generated_combinations (
  id BIGSERIAL PRIMARY KEY,
  numbers SMALLINT[] NOT NULL CHECK (cardinality(numbers) = 6),
  strategy TEXT NOT NULL CHECK (strategy IN ('equilibree','frequence','affinites','aleatoire')),
  score NUMERIC(6,3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS generated_combinations_created_at_idx ON generated_combinations(created_at DESC);
