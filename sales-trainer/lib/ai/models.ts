type Purpose = 'chat' | 'evaluation' | 'suggestion'

const defaults: Record<Purpose, string> = {
  chat: 'anthropic/claude-sonnet-4.5',
  evaluation: 'openai/gpt-4o-mini',
  suggestion: 'openai/gpt-4o-mini',
}

export function modelFor(purpose: Purpose): string {
  const envMap: Record<Purpose, string | undefined> = {
    chat: process.env.OPENROUTER_CHAT_MODEL,
    evaluation: process.env.OPENROUTER_EVAL_MODEL,
    suggestion: process.env.OPENROUTER_SUGGEST_MODEL,
  }
  return envMap[purpose] ?? defaults[purpose]
}
