# Competências de Vendas e Estilos de Comportamento

**Categoria:** IA  
**Atualizado em:** 2026-05-20

Este artigo documenta o framework pedagógico da Negociarte: as 5 competências avaliadas em cada sessão e os 4 estilos de comportamento de cliente disponíveis no simulador. Toda lógica de avaliação e construção de perfil deve respeitar esses conceitos.

---

## Diagrama arquitetural do produto

O simulador tem 3 camadas:

```
Base de dados (8 elementos)         IA (avatar do cliente)       Participante
──────────────────────────────      ──────────────────────       ────────────
• Etapas do processo de vendas      Representa o cliente.        Vendedor em
• Situação do Cliente (caso)   ←→   Facilita/dificulta com  ←→   treino.
• Portfólio de produtos             base na aderência do
• Situação do mercado               vendedor ao processo
• Competências a serem avaliadas    e informações corretas.
• Estilos de comportamento          Avalia ao final.
• Estratégia de Marketing
• Concorrência
```

> **Regra crítica:** as informações da Base de dados **NÃO podem ser compartilhadas pela IA** — são confidenciais da empresa. O sistema prompt reforça isso via Rule #6 (progressive disclosure) na persona-template.

---

## 5 Competências de Vendas Avaliadas

Score de **1 a 5** por competência, com evidência textual da conversa. Implementadas em `EvaluationSchema` em `lib/ai/evaluator.ts` e gravadas em `session_feedback.competency_scores`.

### 1. Comunicação clara e persuasiva (`comunicacao`)
- Explica propostas de forma simples, estruturada e sem ambiguidades
- Adapta a comunicação ao perfil do cliente (mais direto, mais relacional, mais técnico)
- Utiliza argumentos focados em benefícios e impacto, não apenas em características

### 2. Escuta ativa e diagnóstico (`escuta_ativa`)
- Faz perguntas relevantes que exploram contexto, necessidades e prioridades
- Demonstra atenção ao cliente, sem interromper ou antecipar conclusões
- Resume e valida o entendimento antes de avançar para a proposta

### 3. Orientação para resultados (`orientacao_resultados`)
- Define próximos passos claros em cada interação com o cliente
- Acompanha oportunidades de forma disciplinada até a conclusão
- Demonstra consistência no atingimento de metas e indicadores

### 4. Gestão de objeções e negociação (`gestao_objecoes`)
- Escuta a objeção sem interromper e busca entender sua origem real
- Responde com argumentos estruturados, baseados em valor e não apenas em preço
- Conduz negociações mantendo margem e relacionamento equilibrados

### 5. Construção de relacionamento e confiança (`relacionamento`)
- Cumpre o que promete, respeitando prazos e combinados
- Demonstra interesse genuíno pelo cliente, além da venda imediata
- Mantém contato consistente, mesmo após o fechamento da venda

---

## 4 Estilos de Comportamento do Cliente

Disponíveis na tabela `behavior_styles`. Podem ser fixados por perfil (`customer_profiles.behavior_style_id`) ou sorteados aleatoriamente em cada sessão.

### Analítico
Orientação a precisão, qualidade e lógica. Decisão **lenta e cuidadosa** — exige dados, comparações, especificações e evidências concretas antes de avançar. Qualquer inconsistência ou imprecisão compromete a credibilidade rapidamente. Não tolera exageros, promessas sem fundamento ou abordagens emocionais.

*Como adaptar:* argumentos com dados, estrutura lógica, clareza conceitual. Dar tempo para análise.

### Dominante
Orientação a resultados, velocidade e controle. Decisão **rápida** — quer saber o benefício concreto imediato (ganho financeiro, economia de tempo, eficiência). Pode interromper explicações que considera desnecessárias. Valoriza autonomia e não gosta de pressão. Não tolera enrolação, insegurança ou excesso de informação.

*Como adaptar:* ir direto ao ponto, deixar o cliente conduzir, respostas objetivas. Não prolongar.

### Influente
Orientação a relacionamento, comunicação e reconhecimento. Decisão **intuitiva** — baseada em percepções e impressões, não em análise profunda. Fala bastante, compartilha histórias, muda de assunto com facilidade. Responde a entusiasmo, conexão emocional e validação. Não tolera frieza, excesso técnico ou ambientes rígidos.

*Como adaptar:* criar conexão, usar linguagem leve e dinâmica, dar espaço para participação. Evitar excesso de dados.

### Integrador
Orientação a estabilidade, cooperação e harmonia. Decisão **deliberada e cautelosa** — precisa sentir segurança, entender o contexto completamente e perceber ausência de riscos ocultos. Evita conflitos, pode concordar durante a conversa sem ter decidido. Não tolera pressão, agressividade ou mudanças repentinas.

*Como adaptar:* linguagem tranquila e respeitosa, dar tempo para refletir, reforçar solidez e baixo risco. Nunca pressionar.

---

## Nota sobre o campo "Estável" no formulário

O `StepClient` oferece "Estável" como opção de `communication_style`. **Verificar** se "Estável" é sinônimo de "Integrador" ou se representa um 5º estilo distinto não documentado. Os 4 estilos formais da Negociarte são os listados acima.

---

## Onde esses conceitos vivem no código

| Conceito | Arquivo |
|---|---|
| Schema de avaliação com competências | `lib/ai/evaluator.ts` — `EvaluationSchema` |
| Prompt do evaluator com instruções por competência | `lib/ai/prompts/evaluator-template.ts` |
| Estilos no banco | tabela `behavior_styles` (org-scoped, RLS) |
| Estilo fixo por perfil | `customer_profiles.behavior_style_id` (migration 0009) |
| Scores gravados | `session_feedback.competency_scores` (migration 0009) |
| UI de scores | `components/chat/feedback-card.tsx` |
