import { z } from 'zod'

/** Schema da análise de knowledge base retornada pela IA */
export const AnalysisSchema = z.object({
  company: z.object({
    description: z.string().describe('Descrição resumida da empresa (2-4 frases)'),
    industry: z.string().describe('Setor de atuação (ex: Software B2B, Indústria, Varejo)'),
    company_size: z.string().describe('Porte da empresa (ex: Pequena, Média, Grande, Enterprise)'),
    product_context: z
      .string()
      .describe('Contexto dos produtos/serviços relevante para a simulação de vendas'),
    market_situation: z
      .string()
      .describe('Situação atual do mercado em que a empresa atua'),
    competition_context: z
      .string()
      .describe('Principais concorrentes e como a empresa se diferencia'),
    marketing_strategy: z
      .string()
      .describe('Estratégia de marketing e posicionamento da empresa'),
  }),
  customers: z
    .array(
      z.object({
        name: z.string().describe('Nome representativo da persona (ex: Diretor de TI, CFO)'),
        buyer_role: z.string().describe('Cargo ou papel de comprador'),
        description: z.string().describe('Perfil geral desta persona'),
        pain_points: z
          .string()
          .describe('Principais dores, desafios e motivações de compra'),
        objections: z
          .string()
          .describe('Objeções típicas que esta persona levanta durante uma negociação'),
        budget_context: z.string().describe('Contexto orçamentário e processo de aprovação'),
        decision_authority: z.string().describe('Nível de autoridade de decisão e processo interno'),
        personality_traits: z.string().describe('Traços de personalidade relevantes para a venda'),
        communication_style: z
          .string()
          .describe('Estilo de comunicação (ex: Analítico, Direto, Colaborativo)'),
        visible_briefing: z
          .string()
          .describe('O que o vendedor sabe antes de entrar na simulação com esta persona'),
        visit_objective: z
          .string()
          .describe('Objetivo esperado da visita de vendas com esta persona'),
        success_criteria: z
          .string()
          .describe('Critério para considerar a simulação bem-sucedida'),
        confidential_context: z
          .string()
          .describe('Informações que o avatar sabe mas não revela diretamente ao vendedor'),
        sales_process_context: z
          .string()
          .describe('Etapas e comportamentos esperados do processo de vendas'),
        sales_competencies_context: z
          .string()
          .describe('Competências de vendas que serão avaliadas nesta simulação'),
      }),
    )
    .min(1)
    .max(3)
    .describe('2 ou 3 personas de compradores B2B típicos deste mercado'),
  styles: z
    .array(
      z.object({
        name: z
          .string()
          .describe('Nome do estilo comportamental (ex: Analítico, Dominante, Influente, Integrador)'),
        description: z.string().describe('Como este comprador se comporta e toma decisões'),
        simulation_guidance: z
          .string()
          .describe(
            'Instruções detalhadas para o agente de IA simular este estilo durante um treino de vendas',
          ),
      }),
    )
    .min(1)
    .max(3)
    .describe('2 ou 3 estilos comportamentais de compradores comuns neste mercado'),
})

export type KnowledgeAnalysis = z.infer<typeof AnalysisSchema>
