-- Migration 0016: Objetivo da visita escolhido pelo seller
-- `chosen_objective` em training_sessions: gravado na criação da sessão
-- `available_objectives` em customer_profiles: admin define quais objetivos estão disponíveis
--   para aquele cenário. Se vazio/null, exibe os 5 objetivos padrão do sistema.

ALTER TABLE training_sessions
  ADD COLUMN chosen_objective text;

-- Enum de objetivos válidos (validação no app, não constraint para flexibilidade futura)
-- Valores: 'conquistar' | 'aumentar_vendas' | 'melhorar_relacionamento' | 'reconquistar' | 'outro'
-- Deixamos como text para permitir customização futura sem nova migration.

ALTER TABLE customer_profiles
  ADD COLUMN available_objectives text[];

-- Índice auxiliar (seller filtrará sessões pelo objetivo em analytics futuros)
CREATE INDEX ON training_sessions (seller_id, chosen_objective)
  WHERE chosen_objective IS NOT NULL;
