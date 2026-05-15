import type { Database } from '@/types/database'
import { buildPersonaPrompt } from './prompts/persona-template'

type CustomerProfile = Database['public']['Tables']['customer_profiles']['Row']
type ProfileInput = Database['public']['Tables']['customer_profiles']['Insert']

export function compileSystemPrompt(profile: CustomerProfile | ProfileInput): string {
  return buildPersonaPrompt(profile as CustomerProfile)
}
