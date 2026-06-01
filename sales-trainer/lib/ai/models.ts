type Purpose = 'chat' | 'evaluation' | 'suggestion'

const defaults: Record<Purpose, string> = {
  chat: 'anthropic/claude-sonnet-4.5',
  evaluation: 'google/gemini-3.1-flash-lite',
  suggestion: 'google/gemini-3.1-flash-lite',
}

export function modelFor(purpose: Purpose): string {
  const envMap: Record<Purpose, string | undefined> = {
    chat: process.env.OPENROUTER_CHAT_MODEL,
    evaluation: process.env.OPENROUTER_EVAL_MODEL,
    suggestion: process.env.OPENROUTER_SUGGEST_MODEL,
  }
  return envMap[purpose] ?? defaults[purpose]
}

export const SELECTABLE_CHAT_MODELS: { label: string; modelId: string | null }[] = [
  { label: 'Padrão (Claude Sonnet)', modelId: null },
  { label: 'xAI Grok 4.3', modelId: 'x-ai/grok-4.3' },
  { label: 'Google Gemini 3.1 Flash Lite', modelId: 'google/gemini-3.1-flash-lite' },
]
