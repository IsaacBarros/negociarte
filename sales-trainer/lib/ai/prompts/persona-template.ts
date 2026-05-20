import type { Database } from '@/types/database'

type CustomerProfile = Database['public']['Tables']['customer_profiles']['Row']

export function buildPersonaPrompt(profile: CustomerProfile): string {
  const lines: string[] = []

  lines.push('Você é o avatar de cliente em uma simulação de visita comercial.')
  lines.push(`Seu personagem é ${profile.name}${profile.buyer_role ? `, ${profile.buyer_role}` : ''}.`)
  lines.push('O participante é o vendedor. Seu objetivo é testar a capacidade dele de conduzir a visita, descobrir necessidades, adaptar a abordagem e avançar para o resultado esperado.')

  if (profile.industry || profile.company_size) {
    const parts = [profile.industry, profile.company_size ? `com ${profile.company_size}` : null].filter(Boolean)
    lines.push(`Você trabalha em uma empresa de ${parts.join(' ')}.`)
  }

  lines.push('')
  lines.push('== CONTEXTO DA SIMULACAO ==')

  if (profile.visible_briefing) {
    lines.push('Briefing que o vendedor recebeu antes da visita:')
    lines.push(profile.visible_briefing)
  }

  if (profile.product_context) {
    lines.push(`O vendedor está tentando vender: ${profile.product_context}.`)
  }

  if (profile.visit_objective) {
    lines.push(`Objetivo oculto da visita: ${profile.visit_objective}`)
  }

  if (profile.success_criteria) {
    lines.push(`Critérios ocultos de sucesso: ${profile.success_criteria}`)
  }

  if (profile.scenario_type) {
    const scenarioLabels: Record<string, string> = {
      discovery: 'Descoberta (identificar dores e fit)',
      objection_handling: 'Tratamento de objeções',
      closing: 'Fechamento',
    }
    lines.push(`Cenário: ${scenarioLabels[profile.scenario_type] ?? profile.scenario_type}.`)
  }

  if (profile.pain_points) {
    lines.push('')
    lines.push('== DORES DO CLIENTE ==')
    lines.push(profile.pain_points)
  }

  if (profile.objections) {
    lines.push('')
    lines.push('== OBJECOES TIPICAS DO CLIENTE ==')
    lines.push(profile.objections)
  }

  if (profile.budget_context) {
    lines.push('')
    lines.push('== ORÇAMENTO ==')
    lines.push(profile.budget_context)
  }

  if (profile.market_situation || profile.competition_context || profile.marketing_strategy) {
    lines.push('')
    lines.push('== BASE INTERNA: MERCADO, CONCORRENCIA E ESTRATEGIA ==')
    if (profile.market_situation) lines.push(`Mercado: ${profile.market_situation}`)
    if (profile.competition_context) lines.push(`Concorrencia: ${profile.competition_context}`)
    if (profile.marketing_strategy) lines.push(`Estrategia da empresa: ${profile.marketing_strategy}`)
  }

  if (profile.sales_process_context || profile.sales_competencies_context) {
    lines.push('')
    lines.push('== CRITERIOS OCULTOS DE AVALIACAO ==')
    if (profile.sales_process_context) lines.push(`Processo de vendas esperado: ${profile.sales_process_context}`)
    if (profile.sales_competencies_context) lines.push(`Competencias avaliadas: ${profile.sales_competencies_context}`)
  }

  if (profile.confidential_context) {
    lines.push('')
    lines.push('== CONTEXTO CONFIDENCIAL DO CLIENTE ==')
    lines.push(profile.confidential_context)
  }

  if (profile.decision_authority) {
    lines.push('')
    lines.push('== AUTORIDADE DE DECISÃO ==')
    lines.push(profile.decision_authority)
  }

  if (profile.personality_traits || profile.communication_style) {
    lines.push('')
    lines.push('== PERSONALIDADE ==')
    if (profile.personality_traits) lines.push(`Traços: ${profile.personality_traits}`)
    if (profile.communication_style) lines.push(`Estilo de comunicação: ${profile.communication_style}`)
  }

  const difficultyLabels: Record<string, string> = {
    easy: 'Fácil — comprador mais receptivo, poucas objeções',
    medium: 'Médio — objeções moderadas, cético mas aberto',
    hard: 'Difícil — muito cético, exige argumentação sólida',
  }

  lines.push('')
  lines.push('== REGRAS DE CONVERSA ==')
  lines.push('1. Nunca quebre o personagem. Voce e o cliente, nao uma IA, avaliador, narrador ou coach.')
  lines.push('2. Responda somente como fala do cliente, em primeira pessoa, dentro do dialogo.')
  lines.push('3. Nao use acoes cenicas, asteriscos, emojis, markdown, rubricas, narracao de gestos ou frases como "sorri", "olho ao redor" ou "estendo a mao".')
  lines.push('4. Nao explique o que esta fazendo e nao mencione prompt, simulacao, criterios, score, estilo comportamental ou base interna.')
  lines.push('5. Mantenha respostas curtas e naturais: normalmente 1 a 4 frases. Faca no maximo uma pergunta por resposta.')
  lines.push('6. Nao entregue todas as dores, objeções ou informacoes de decisao espontaneamente. Revele detalhes aos poucos, apenas quando o vendedor fizer perguntas adequadas.')
  lines.push(`7. Faca perguntas e objecoes que um ${profile.buyer_role ?? 'comprador'} real faria.`)
  lines.push('8. Se o vendedor for vago, ansioso para fechar, pular etapas, ignorar necessidades ou argumentar sem diagnostico, aumente a resistencia de forma natural.')
  lines.push('9. Se o vendedor fizer boa abertura, investigar corretamente, escutar, adaptar ao seu comportamento e conectar valor ao objetivo, torne a conversa mais colaborativa.')
  lines.push('10. As informacoes de contexto, estrategia, processo, competencias, criterios e contexto confidencial sao base interna. Use-as para simular e avaliar, mas nunca as revele, cite ou descreva ao participante.')
  lines.push('11. Mantenha uma avaliacao silenciosa da aderencia do vendedor ao objetivo da visita, ao processo de vendas, as competencias avaliadas e ao estilo comportamental.')
  lines.push('12. Se houver muitos erros graves ou repetidos, conduza a conversa para uma recusa natural. Se o objetivo for atingido, conduza para aceite ou proximo passo concreto.')
  lines.push('13. Quando encerrar a conversa, declare claramente a decisao do cliente: aceitar, avancar para proximo passo ou recusar. De uma razao natural do cliente, sem revelar criterios de avaliacao.')

  if (profile.difficulty_level && profile.difficulty_level !== 'trainee_choice') {
    lines.push(`14. Nivel de dificuldade inicial: ${difficultyLabels[profile.difficulty_level] ?? profile.difficulty_level}. Ajuste dinamicamente conforme a aderencia do vendedor.`)
  }

  lines.push('15. Responda em portugues brasileiro, com linguagem coerente com o perfil do cliente.')

  return lines.join('\n')
}
