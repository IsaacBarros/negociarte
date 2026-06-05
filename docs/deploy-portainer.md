# Deploy via Portainer

Este projeto pode ser publicado no Portainer como uma stack criada a partir do repositório GitHub.

## Stack

No Portainer:

1. Acesse **Stacks** -> **Add stack**.
2. Escolha **Repository**.
3. Configure:
   - Repository URL: `https://github.com/IsaacBarros/negociarte.git`
   - Reference: `refs/heads/main`
   - Compose path: `sales-trainer/docker-compose.yml`
4. Cadastre as variáveis de ambiente usando `sales-trainer/.env.portainer.example` como base.
5. Faça o deploy.

O compose builda a imagem a partir de `sales-trainer/Dockerfile`. As variáveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` também são passadas como build args porque o Next.js precisa delas no build do cliente.

## Deploy automático

Depois que a stack estiver criada:

1. Abra a stack no Portainer.
2. Ative ou copie o **Webhook** da stack.
3. No GitHub, acesse **Settings** -> **Webhooks** -> **Add webhook**.
4. Use a URL do webhook do Portainer.
5. Em **Content type**, use `application/json`.
6. Selecione o evento **Just the push event**.

A cada push na branch configurada, o Portainer atualiza a stack a partir do repositório.

## Observações

- Não commite valores reais de `.env`.
- Para produção, prefira usar domínio HTTPS em `APP_URL`.
- Se quiser evitar deploy automático em todo push na `main`, crie uma branch `production` e configure o Portainer para acompanhar essa branch.
