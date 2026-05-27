type Message = { role: 'user' | 'assistant'; content: string }

interface CustomCriteriaStage {
  key: string
  label: string
  behaviors: Array<{ key: string; label: string; weight: number }>
}

interface EvaluationContext {
  profileName: string
  difficultyLevel: string | null
  scenarioType: string | null
  visitObjective?: string | null
  successCriteria?: string | null
  salesProcessContext?: string | null
  salesCompetenciesContext?: string | null
  behaviorStyleName?: string | null
  behaviorStyleDescription?: string | null
  behaviorEvaluationCriteria?: string | null
  messageCount?: number
  durationMinutes?: number | null
  messages: Message[]
  /** When set, replaces the hardcoded 6-stage criteria section */
  customCriteria?: { stages: CustomCriteriaStage[]; total_points: number } | null
}

// ── Score scale — shared between hardcoded and dynamic sections ───────────────

const SCORE_SCALE = `ESCALA DE SCORES:
Score 5 = Excelente — critério plenamente atendido, de forma consistente
Score 4 = Bom — critério majoritariamente atendido, com pequenas lacunas
Score 3 = Parcial — critério atendido de forma incompleta ou inconsistente
Score 2 = Insuficiente — critério raramente demonstrado
Score 1 = Não demonstrado — situação na conversa permitia, mas o vendedor não aplicou
Score 0 = Inaplicável — o comportamento não pôde ser avaliado nesta sessão (ex.: não houve objeções para contornar)`

// ── Dynamic criteria builder ──────────────────────────────────────────────────

function buildDynamicCriteriaSection(stages: CustomCriteriaStage[]): string {
  const lines: string[] = [
    `PROCESSO DE AVALIAÇÃO — ${stages.length} etapas, score de 0 a 5 por comportamento:`,
    '',
    SCORE_SCALE,
    '',
  ]
  stages.forEach((stage, i) => {
    lines.push(`${i + 1}. ${stage.label.toUpperCase()}`)
    stage.behaviors.forEach((b) => {
      lines.push(`   - ${b.key} (peso ${b.weight}pts): ${b.label}.`)
      lines.push(
        `     Score 5 = critério plenamente demonstrado; 3 = parcialmente; 1 = não demonstrado; 0 = inaplicável.`,
      )
    })
    lines.push('')
  })
  lines.push(
    `Para cada comportamento, forneça:`,
    `- score: inteiro de 0 a 5`,
    `- evidence: trecho ou observação da conversa que justifica o score (máximo 2 frases em português)`,
    ``,
    `Além disso, forneça:`,
    `- strengths: pontos fortes gerais do vendedor nesta sessão (2-3 frases)`,
    `- improvements: principais áreas de melhoria prioritárias (2-3 frases)`,
    `- techniques_used: array com técnicas de vendas utilizadas (ex: ["escuta reflexiva", "perguntas abertas", "ancoragem de benefícios"])`,
    `- techniques_missed: array com técnicas que poderiam ter sido aplicadas mas não foram`,
    `- outcome: desfecho da simulação com base na última resposta do cliente — use exatamente um dos valores: "accepted" (cliente aceitou ou comprometeu-se a avançar), "advanced" (cliente quer próximo passo mas sem compromisso final), "refused" (cliente recusou explicitamente), "inconclusive" (conversa encerrou sem decisão clara)`,
  )
  return lines.join('\n')
}

// ── Hardcoded fallback (original 6-stage criteria) ───────────────────────────

const HARDCODED_CRITERIA_SECTION = `PROCESSO DE AVALIAÇÃO — 6 etapas, score de 0 a 5 por comportamento:

${SCORE_SCALE}


1. PLANEJAMENTO
   - preparacao_apresentacao (peso 20pts): Estava preparado para a apresentação — conhecimento do cliente e do produto.
     Score 5 = demonstrou conhecimento completo; 3 = preparação parcial; 1 = chegou sem preparo evidente.
   - estrategia_abordagem (peso 10pts): Seguiu uma estratégia de abordagem com foco no cliente e no resultado desejado.
     Score 5 = abordagem estruturada e orientada ao cliente; 3 = estratégia parcial; 1 = abordagem sem estratégia perceptível.

2. ABERTURA
   - proposito_visita (peso 10pts): Falou o propósito da visita ao abrir o contato.
     Score 5 = deixou claro o objetivo logo no início; 3 = mencionou parcialmente; 1 = não comunicou o propósito.
   - adaptacao_estilo (peso 20pts): Adaptou-se ao estilo comportamental do cliente.
     Score 5 = percebeu e adaptou tom e abordagem ao estilo; 3 = adaptação parcial; 1 = ignorou completamente o estilo.

3. ENTENDIMENTO DAS NECESSIDADES
   - perguntas_diagnostico (peso 20pts): Fez perguntas para entender as necessidades do cliente.
     Score 5 = perguntas relevantes que revelaram necessidades reais; 3 = algumas perguntas úteis; 1 = não fez perguntas de diagnóstico.
   - escuta_ativa (peso 20pts): Praticou a escuta ativa — ouviu, validou entendimento, não interrompeu.
     Score 5 = escuta consistente e validação clara; 3 = escuta parcial; 1 = ignorou respostas do cliente.

4. ARGUMENTAÇÃO
   - solucoes_necessidades (peso 20pts): Propôs soluções relacionadas às necessidades identificadas.
     Score 5 = proposta alinhada às necessidades expressas; 3 = conexão parcial; 1 = proposta genérica sem conexão.
   - mensagem_clara (peso 20pts): Expôs a mensagem de forma clara e objetiva.
     Score 5 = comunicação clara, direta e fácil de entender; 3 = razoavelmente claro; 1 = mensagem confusa ou excessivamente técnica.
   - beneficios_proposta (peso 20pts): Apresentou os benefícios da proposta para o cliente — não apenas características.
     Score 5 = benefícios concretos conectados ao contexto do cliente; 3 = alguns benefícios; 1 = falou só de características, sem benefícios.

5. OBJEÇÕES
   - contorno_objecoes (peso 20pts): Contornou as objeções com argumentos convincentes.
     Score 5 = respondeu objeções com empatia e dados relevantes; 3 = respondeu parcialmente; 1 = ignorou ou rejeitou objeções.
     Se não houve objeções explícitas, avalie a capacidade de antecipar e tratar resistências latentes.

6. ENCERRAMENTO
   - conclusao_visita (peso 20pts): Verificou o entendimento e concluiu a visita com próximos passos definidos.
     Score 5 = confirmou entendimento mútuo e definiu próximos passos claros; 3 = encerramento parcial; 1 = não encerrou ou deixou a visita sem conclusão.

Para cada comportamento, forneça:
- score: inteiro de 1 a 5
- evidence: trecho ou observação da conversa que justifica o score (máximo 2 frases em português)

Além disso, forneça:
- strengths: pontos fortes gerais do vendedor nesta sessão (2-3 frases)
- improvements: principais áreas de melhoria prioritárias (2-3 frases)
- techniques_used: array com técnicas de vendas utilizadas (ex: ["escuta reflexiva", "perguntas abertas", "ancoragem de benefícios"])
- techniques_missed: array com técnicas que poderiam ter sido aplicadas mas não foram
- outcome: desfecho da simulação com base na última resposta do cliente — use exatamente um dos valores: "accepted" (cliente aceitou ou comprometeu-se a avançar), "advanced" (cliente quer próximo passo mas sem compromisso final), "refused" (cliente recusou explicitamente), "inconclusive" (conversa encerrou sem decisão clara)`

// ── Public function ───────────────────────────────────────────────────────────

export function buildEvaluatorPrompt(ctx: EvaluationContext): string {
  const {
    profileName,
    difficultyLevel,
    scenarioType,
    visitObjective,
    successCriteria,
    salesProcessContext,
    salesCompetenciesContext,
    behaviorStyleName,
    behaviorStyleDescription,
    behaviorEvaluationCriteria,
    messageCount,
    durationMinutes,
    messages,
    customCriteria,
  } = ctx

  const transcript = messages
    .map((m) => `[${m.role === 'user' ? 'VENDEDOR' : 'CLIENTE'}]: ${m.content}`)
    .join('\n\n')

  const scenarioContext = scenarioType
    ? `Cenário: ${scenarioType === 'discovery' ? 'Discovery' : scenarioType === 'objection_handling' ? 'Tratamento de objeções' : 'Fechamento'}.`
    : ''

  const difficultyContext = difficultyLevel
    ? `Dificuldade: ${difficultyLevel === 'easy' ? 'Fácil' : difficultyLevel === 'medium' ? 'Médio' : 'Difícil'}.`
    : ''

  const volumeContext = [
    messageCount !== undefined ? `Turnos na conversa: ${messageCount}` : null,
    durationMinutes !== null && durationMinutes !== undefined ? `Duração: ${durationMinutes} min` : null,
  ].filter(Boolean).join(' | ')

  const stageCount = customCriteria ? customCriteria.stages.length : 6
  const criteriaSection = customCriteria
    ? buildDynamicCriteriaSection(customCriteria.stages)
    : HARDCODED_CRITERIA_SECTION

  return `Você é um coach de vendas especializado da Negociarte. Avalie a performance do vendedor na conversa de treino abaixo seguindo o processo de vendas estruturado em ${stageCount} etapas.

PERFIL DO CLIENTE SIMULADO: ${profileName}
${scenarioContext}
${difficultyContext}
${volumeContext ? `Contexto da sessão: ${volumeContext}.` : ''}
${visitObjective ? `Objetivo da visita: ${visitObjective}.` : ''}
${successCriteria ? `Critérios de sucesso: ${successCriteria}.` : ''}
${behaviorStyleName ? `Estilo comportamental do cliente: ${behaviorStyleName}.` : ''}
${behaviorStyleDescription ? `Descrição do estilo: ${behaviorStyleDescription}.` : ''}
${behaviorEvaluationCriteria ? `Critérios de adequação ao estilo: ${behaviorEvaluationCriteria}.` : ''}
${salesProcessContext ? `Processo de vendas esperado: ${salesProcessContext}.` : ''}
${salesCompetenciesContext ? `Competências esperadas: ${salesCompetenciesContext}.` : ''}

TRANSCRIÇÃO:
${transcript}

${criteriaSection}`
}
