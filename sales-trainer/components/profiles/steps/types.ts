import type { UseFormReturn } from 'react-hook-form'
import type { CustomerProfileInput } from '@/lib/schemas/profile'

export interface StepProps {
  form: UseFormReturn<CustomerProfileInput>
  suggestField: (field: keyof CustomerProfileInput) => Promise<void>
  suggestingField: keyof CustomerProfileInput | null
  companies?: {
    id: string
    name: string
    description: string | null
  }[]
  customers?: {
    id: string
    name: string
    description: string | null
    buyer_role?: string | null
  }[]
}
