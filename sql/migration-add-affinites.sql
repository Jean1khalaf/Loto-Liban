-- À exécuter une seule fois dans Neon si la table existe déjà.
ALTER TABLE generated_combinations
  DROP CONSTRAINT IF EXISTS generated_combinations_strategy_check;

ALTER TABLE generated_combinations
  ADD CONSTRAINT generated_combinations_strategy_check
  CHECK (strategy IN ('equilibree','frequence','affinites','aleatoire'));
