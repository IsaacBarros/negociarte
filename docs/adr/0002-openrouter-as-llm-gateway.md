# ADR-0002 — OpenRouter como Gateway de LLM

**Status:** Aceito  
**Data:** 2026-05-14

## Contexto

O produto usa dois modelos de IA com propósitos distintos: um para role-play de chat (precisa manter persona de forma consistente por longos diálogos) e outro para avaliação pós-sessão (precisa retornar JSON estruturado de forma rápida e barata). No MVP, precisamos de flexibilidade para comparar modelos sem deploys.

## Decisão

Usar o OpenRouter como gateway unificado para todas as chamadas de LLM, com modelos configurados via env vars:

```bash
OPENROUTER_CHAT_MODEL=anthropic/claude-3.5-sonnet
OPENROUTER_EVAL_MODEL=openai/gpt-4o-mini
OPENROUTER_SUGGEST_MODEL=openai/gpt-4o-mini
```

A resolução de modelo passa por `lib/ai/models.ts`:

```ts
type Purpose = 'chat' | 'evaluation' | 'suggestion'

export function modelFor(purpose: Purpose): string {
  const map: Record<Purpose, string> = {
    chat:       process.env.OPENROUTER_CHAT_MODEL!,
    evaluation: process.env.OPENROUTER_EVAL_MODEL!,
    suggestion: process.env.OPENROUTER_SUGGEST_MODEL!,
  }
  return map[purpose]
}
```

O provider é instanciado em `lib/ai/openrouter.ts` com headers obrigatórios:

```ts
export const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
  headers: {
    'HTTP-Referer': process.env.APP_URL!,
    'X-Title': 'Negociarte',
  },
})
```

## Alternativas Consideradas

**SDK direto da Anthropic:** Melhor latência teórica (sem hop extra), mas amarra o código a um único provedor. Trocar de modelo exigiria mudar o SDK e possivelmente reescrever o código de chamada.

**SDK direto da OpenAI:** Mesma limitação de vendor lock-in, mais o fato de que Claude tem comportamento de role-play sustentado superiormente.

**Vercel AI SDK sem OpenRouter (provedor Anthropic nativo):** Possível, mas sem os benefícios de fallback e roteamento automático do OpenRouter.

## Consequências

- **Positivo:** Trocar modelo é mudança de env var, sem código. A/B testing entre modelos por simples configuração.
- **Positivo:** Fallback automático — se Claude cair, OpenRouter pode rotear para GPT-4o sem interromper a sessão do vendedor.
- **Positivo:** Dashboard do OpenRouter mostra uso e custo por modelo, útil para decisões baseadas em dados.
- **Positivo:** `model_used` gravado em cada resposta permite análise retrospectiva de qualidade por modelo.
- **Negativo:** Hop adicional adiciona ~50–100ms de latência ao primeiro token. Aceitável dado o ganho em flexibilidade.
- **Negativo:** Custo do OpenRouter ligeiramente maior que acesso direto à API do provedor (markup pequeno). Compensado pelo fallback e pela flexibilidade.
- **Risco:** Budget não configurado pode gerar fatura inesperada. Mitigação: configurar limite mensal e alertas no dashboard do OpenRouter antes do lançamento.

## Supersede

Nenhum.
