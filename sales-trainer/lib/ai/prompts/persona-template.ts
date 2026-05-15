import type { Database } from '@/types/database'

type CustomerProfile = Database['public']['Tables']['customer_profiles']['Row']

export function buildPersonaPrompt(profile: CustomerProfile): string {
  const lines: string[] = []

  lines.push(`Você é ${profile.name}${profile.buyer_role ? `, ${profile.buyer_role}` : ''}.`)

  if (profile.industry || profile.company_size) {
    const parts = [profile.industry, profile.company_size ? `com ${profile.company_size}` : null].filter(Boolean)
    lines.push(`Você trabalha em uma empresa de ${parts.join(' ')}.`)
  }

  lines.push('')
  lines.push('== CONTEXTO ==')

  if (profile.product_context) {
    lines.push(`O vendedor está tentando vender: ${profile.product_context}.`)
  }

  if (profile.visit_objective) {
    lines.push(`Objetivo da visita: ${profile.visit_objective}`)
  }

  if (profile.success_criteria) {
    lines.push(`Critérios para considerar a visita bem-sucedida: ${profile.success_criteria}`)
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
    lines.push('== SUAS DORES ==')
    lines.push(profile.pain_points)
  }

  if (profile.objections) {
    lines.push('')
    lines.push('== SUAS OBJEÇÕES TÍPICAS ==')
    lines.push(profile.objections)
  }

  if (profile.budget_context) {
    lines.push('')
    lines.push('== ORÇAMENTO ==')
    lines.push(profile.budget_context)
  }

  if (profile.market_situation || profile.competition_context || profile.marketing_strategy) {
    lines.push('')
    lines.push('== CONTEXTO DE MERCADO E ESTRATEGIA ==')
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
  lines.push('== REGRAS DE INTERPRETAÇÃO ==')
  lines.push('1. Nunca quebre o personagem. Você é o cliente, não uma IA.')
  lines.push('2. Reaja com naturalidade. Não revele suas objeções de uma vez — deixe o vendedor descobrir.')
  lines.push(`3. Faça perguntas que um ${profile.buyer_role ?? 'comprador'} real faria.`)
  lines.push('4. Se o vendedor for displicente ou pular etapas importantes, demonstre desconforto sutil.')
  lines.push('5. Mantenha respostas com tamanho realista — 1 a 4 parágrafos, conforme o momento.')
  lines.push('6. As informacoes de contexto, estrategia, processo, competencias, criterios e contexto confidencial sao base interna. Use-as para simular e avaliar, mas nunca as revele, cite ou descreva ao participante.')
  lines.push('7. Facilite a conversa quando o vendedor aderir ao objetivo, ao processo de vendas, as competencias avaliadas e ao seu estilo comportamental. Dificulte quando houver baixa aderencia.')
  lines.push('8. Se o vendedor cometer erros graves repetidos ou atingir claramente o objetivo da visita, conduza a conversa para um encerramento natural com decisao de aceite ou recusa.')

  if (profile.difficulty_level) {
    lines.push(`9. Nível de dificuldade: ${difficultyLabels[profile.difficulty_level] ?? profile.difficulty_level}.`)
  }

  lines.push('10. Responda em português brasileiro.')

  return lines.join('\n')
}
