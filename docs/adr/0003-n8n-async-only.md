# ADR-0003 — n8n Apenas para Fluxos Assíncronos

**Status:** Aceito  
**Data:** 2026-05-14

## Contexto

A equipe já usa n8n e há intenção inicial de usá-lo como proxy para o chat com IA. Precisamos decidir onde o n8n se encaixa na arquitetura sem comprometer a experiência de chat.

## Decisão

O n8n **não fica no caminho crítico do chat**. Toda comunicação em tempo real entre vendedor e IA passa diretamente por Next.js → OpenRouter. O n8n é usado apenas para operações assíncronas que não afetam a latência percebida pelo usuário:

| Operação | Onde roda |
|---|---|
| Chat em tempo real | Next.js (`/api/chat` com streaming) |
| Compilação de perfil → system prompt | Next.js (Server Action) |
| Avaliação pós-sessão | n8n (acionado por webhook) |
| Notificações (e-mail, Slack) | n8n |
| Relatórios e analytics agregados | n8n |
| Integrações futuras (CRM, RH, BI) | n8n |

O fluxo de avaliação:

1. Vendedor encerra sessão → `status = 'completed'`
2. Next.js dispara webhook para o n8n com `sessionId`
3. n8n busca a transcrição no Supabase
4. n8n chama OpenRouter (modelo de avaliação) com a transcrição + rubrica
5. n8n grava `session_feedback` no Supabase
6. n8n notifica o admin

## Alternativas Consideradas

**n8n como proxy de chat:** Tentador pela reutilização, mas inviável por três razões:
1. **Streaming:** SSE/streaming de tokens requer conexão direta do servidor para o browser. Cada hop extra complica e pode quebrar o streaming.
2. **Latência:** Em chat, 200–500ms extras até o primeiro token é percebido como travamento. n8n adiciona pelo menos esse overhead.
3. **Estado:** Manter histórico de mensagens e contexto de sessão é mais natural no banco da aplicação do que em variáveis de workflow.

**Avaliação síncrona (na hora que o vendedor encerra):** Possível, mas a avaliação pode levar 10–30 segundos dependendo do tamanho da transcrição. Faz mais sentido como operação em background com notificação ao concluir.

## Consequências

- **Positivo:** Chat tem latência mínima — sem hop de n8n no caminho crítico.
- **Positivo:** n8n pode ser expandido com novos workflows (integrações de CRM, relatórios semanais) sem tocar no código da aplicação.
- **Positivo:** O investimento existente em n8n é preservado e bem utilizado.
- **Negativo:** Dois sistemas para manter (Next.js + n8n). Mitigação: o n8n roda de forma independente e pode ser substituído por um worker (ex.: Inngest, Trigger.dev) no futuro sem afetar o frontend.
- **Operacional:** O webhook de n8n deve ser validado com `N8N_WEBHOOK_SECRET` para evitar chamadas não autorizadas.

## Supersede

Nenhum.
