type Message = { role: 'user' | 'assistant'; content: string }

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
  messages: Message[]
}

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
    messages,
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

  return `Você é um coach de vendas especializado. Avalie a performance do vendedor na seguinte conversa de treino.

PERFIL DO CLIENTE SIMULADO: ${profileName}
${scenarioContext}
${difficultyContext}
${visitObjective ? `Objetivo da visita: ${visitObjective}.` : ''}
${successCriteria ? `Critérios de sucesso: ${successCriteria}.` : ''}
${behaviorStyleName ? `Estilo comportamental sorteado: ${behaviorStyleName}.` : ''}
${behaviorStyleDescription ? `Descrição do estilo: ${behaviorStyleDescription}.` : ''}
${behaviorEvaluationCriteria ? `Critérios de adequação ao estilo: ${behaviorEvaluationCriteria}.` : ''}
${salesProcessContext ? `Processo de vendas esperado: ${salesProcessContext}.` : ''}
${salesCompetenciesContext ? `Competências de vendas avaliadas: ${salesCompetenciesContext}.` : ''}

TRANSCRIÇÃO:
${transcript}

CRITÉRIOS DE AVALIAÇÃO:
1. Resultado da visita — o vendedor chegou ao objetivo proposto? O cliente aceitaria, avançaria ou recusaria?
2. Adequação ao estilo comportamental — o vendedor percebeu e adaptou a abordagem ao estilo do cliente?
3. Aderência ao processo de vendas — seguiu as etapas esperadas sem pular diagnóstico, proposta de valor ou próximos passos?
4. Aderência às competências de vendas — demonstrou as competências avaliadas com evidências na conversa?
5. Descoberta e escuta ativa — identificou dores, contexto, autoridade, orçamento e critérios de decisão?
6. Tratamento de objeções — respondeu objeções com empatia, dados e conexão com valor?
7. Condução — manteve foco, ritmo e avanço natural para a decisão ou próximo passo?

Responda APENAS com um JSON válido neste formato exato:
{
  "overall_score": <número de 1 a 10>,
  "strengths": "<texto descrevendo 2-3 pontos fortes, citando evidências da conversa>",
  "improvements": "<texto descrevendo 2-3 melhorias ligadas a estilo comportamental, processo e competências>",
  "techniques_used": ["<técnica 1>", "<técnica 2>"],
  "techniques_missed": ["<técnica que deveria ter sido usada>"]
}`
}
