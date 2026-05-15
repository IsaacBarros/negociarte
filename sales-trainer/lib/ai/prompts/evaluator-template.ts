type Message = { role: 'user' | 'assistant'; content: string }

interface EvaluationContext {
  profileName: string
  difficultyLevel: string | null
  scenarioType: string | null
  messages: Message[]
}

export function buildEvaluatorPrompt(ctx: EvaluationContext): string {
  const { profileName, difficultyLevel, scenarioType, messages } = ctx

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

TRANSCRIÇÃO:
${transcript}

CRITÉRIOS DE AVALIAÇÃO:
1. Rapport e abertura — o vendedor criou conexão? Demonstrou interesse genuíno?
2. Descoberta — identificou as dores e o contexto do cliente?
3. Proposta de valor — conectou os benefícios às dores identificadas?
4. Tratamento de objeções — respondeu objeções com empatia e argumentos sólidos?
5. Condução — manteve o controle da conversa? Avançou para próximos passos?
6. Escuta ativa — demonstrou que ouviu o cliente? Reformulou pontos importantes?

Responda APENAS com um JSON válido neste formato exato:
{
  "overall_score": <número de 1 a 10>,
  "strengths": "<texto descrevendo 2-3 pontos fortes do vendedor>",
  "improvements": "<texto descrevendo 2-3 áreas para melhoria>",
  "techniques_used": ["<técnica 1>", "<técnica 2>"],
  "techniques_missed": ["<técnica que deveria ter sido usada>"]
}`
}
