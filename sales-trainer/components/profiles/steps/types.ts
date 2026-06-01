import type { UseFormReturn } from 'react-hook-form'
import type { CustomerProfileInput } from '@/lib/schemas/profile'

export interface StepProps {
  form: UseFormReturn<CustomerProfileInput>
  suggestField: (field: keyof CustomerProfileInput) => Promise<void>
  suggestFieldFromDoc: (field: keyof CustomerProfileInput, file: File) => Promise<void>
  suggestingField: keyof CustomerProfileInput | null
  companies?: {
    id: string
    name: string
    description: string | null
    industry: string | null
    company_size: string | null
    product_context: string | null
    market_situation: string | null
    competition_context: string | null
    marketing_strategy: string | null
  }[]
  customers?: {
    id: string
    name: string
    description: string | null
    buyer_role: string | null
    pain_points: string | null
    objections: string | null
    budget_context: string | null
    decision_authority: string | null
    personality_traits: string | null
    communication_style: string | null
    confidential_context: string | null
  }[]
  behaviorStyles?: {
    id: string
    name: string
    description: string
  }[]
}
