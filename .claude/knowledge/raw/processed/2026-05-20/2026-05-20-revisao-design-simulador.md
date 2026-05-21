# Revisão Crítica de Design — Sales Trainer Simulator (2026-05-20)

## Competências de vendas formais da Negociarte (5 competências)

Estas são as competências que o produto avalia em cada sessão de treino:

1. **Comunicação clara e persuasiva** — argumentos focados em benefícios, adaptados ao perfil (direto, relacional, técnico)
2. **Escuta ativa e diagnóstico** — perguntas relevantes, sem antecipar conclusões, valida entendimento antes de propor
3. **Orientação para resultados** — define próximos passos, acompanha com disciplina, consistente em metas
4. **Gestão de objeções e negociação** — escuta sem interromper, responde com valor, mantém margem e relacionamento
5. **Construção de relacionamento e confiança** — cumpre promessas, interesse genuíno, contato consistente pós-venda

Cada competência tem 3 sub-critérios observáveis na conversa. Score 1–5 por competência.

## Perfis de comportamento do cliente (4 estilos)

Estes são os estilos de comportamento disponíveis no sistema (`behavior_styles`):

- **Analítico**: orientação a precisão, qualidade, lógica. Decisão lenta e cuidadosa. Exige dados, comparações, evidências. Não tolera imprecisão ou promessas sem fundamento.
- **Dominante**: orientação a resultados, velocidade, controle. Decisão rápida. Quer saber o benefício concreto imediato. Não tolera enrolação.
- **Influente**: orientação a relacionamento, comunicação, reconhecimento. Intuitivo, expressivo. Responde a entusiasmo e conexão emocional. Não tolera frieza ou excesso técnico.
- **Integrador**: orientação a estabilidade, cooperação, harmonia. Cauteloso, leal. Busca segurança e previsibilidade. Não tolera pressão ou mudanças bruscas.

O sistema chama de "Estável" no form (mas os 4 estilos são os descritos acima). Verificar se "Estável" é o mesmo que "Integrador" ou um 5º estilo distinto.

## Diagrama arquitetural do produto

O produto tem 3 camadas:
1. **Base de dados** (8 elementos): Etapas do processo de vendas, Situação do Cliente (caso), Portfólio de produtos, Situação do mercado, Competências a serem avaliadas, Estilos de Comportamento, Estratégia de Marketing da empresa, Concorrência
2. **IA**: Representa o papel do cliente. Facilita/dificulta conforme aderência do vendedor ao processo. Avalia no final.
3. **Participante** (vendedor): Interage com a IA em tempo real.

**Confidencialidade**: as informações da Base de dados NÃO podem ser compartilhadas pela IA. São confidenciais da empresa.

## Decisões de implementação tomadas (2026-05-20)

### Evaluator → generateObject()
- Motivo: regex era frágil, falha silenciosa se modelo incluía texto fora do JSON
- `generateObject()` do Vercel AI SDK com schema Zod direto — sem parsing manual

### Competency scores no schema de feedback
- Novo campo `competency_scores jsonb` em `session_feedback` (migration 0009)
- Schema Zod: `{ comunicacao, escuta_ativa, orientacao_resultados, gestao_objecoes, relacionamento }` cada um com `{ score: 1-5, evidence: string }`
- FeedbackCard mostra barras de progresso + evidência por competência

### Auto-populate no profile builder
- Ao selecionar empresa/cliente, `useEffect` + `useRef` detecta mudança de seleção e chama `setValue()` para cada campo que a entidade tem preenchido
- `useRef` inicializado com o valor atual evita sobrescrever dados em modo edição (só atualiza quando há mudança ativa)

### Behavior style fixo por perfil
- Nova coluna `behavior_style_id uuid` em `customer_profiles` (migration 0009, nullable)
- Se preenchido, `createSession` usa esse estilo; se não, mantém seleção aleatória
- UI no StepScenario como select "Aleatório (padrão)" ou estilo específico

### Tela de briefing pré-sessão
- Rota: `/train/[sessionId]/briefing`
- `createSession` redireciona para briefing em vez de direto para o chat
- Mostra: nome do cliente, cargo, tipo de cenário, dificuldade, briefing visível, objetivo, critério de sucesso
- Botão "Estou pronto — iniciar conversa" → vai para `/train/[sessionId]`

### FeedbackPoller
- Componente client com polling a cada 5s quando sessão encerrada sem feedback
- Mostra spinner "Gerando avaliação..." enquanto aguarda
- Quando feedback chega, renderiza FeedbackCard automaticamente
- Escolha: polling > Realtime para evitar dependência de configuração de RLS em subscriptions

## Problemas NÃO implementados (pendências de produto)

1. **Prompt desatualizado**: `system_prompt` compilado na criação do perfil. Empresa/cliente atualizados não propagam. Solução proposta: indicador "compilado há X dias" + botão Recompilar no StepPromptPreview.
2. **Radar chart visual**: FeedbackCard usa barras. Spider chart (5 eixos) seria mais impactante pedagogicamente.
3. **Progressão de estilos**: sem lógica de progressão pedagógica baseada no histórico do seller.
4. **Etapas do processo de vendas como entidade**: `sales_process_context` é texto livre. Proposta futura: tabela `sales_processes` análoga a `behavior_styles`.
