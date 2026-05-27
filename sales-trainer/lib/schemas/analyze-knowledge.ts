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
        communication_style: z
          .string()
          .describe('Estilo de comunicação (ex: Analítico, Direto, Colaborativo)'),
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
