# Join por link de convite — padrão SECURITY DEFINER pré-auth

**Categoria:** Auth | Banco  
**Referência:** migration `0018_project_join_code.sql`, `app/join/[code]/page.tsx`, `app/api/auth/signup-seller/route.ts`

---

## O problema

Para o seller se cadastrar via link, o servidor precisa resolver qual empresa pertence ao código **antes** do usuário estar autenticado. RLS normal filtra por `organization_id` do usuário atual — impossível sem sessão ativa.

Solução: funções `SECURITY DEFINER` no banco que executam com as permissões do dono (postgres) e expõem apenas o subconjunto seguro dos dados.

---

## Funções no banco

### `get_project_by_join_code(p_code TEXT)`
- Retorna: `{ company_id, company_name, organization_id }`
- Acesso: `GRANT EXECUTE TO authenticated` (e anon, para o signup)
- Não exige auth — qualquer um com o código pode resolver a empresa

### `get_or_create_seller_company_link(p_seller_id, p_company_id)`
- Faz upsert em `seller_companies` sem passar por policy INSERT
- Chamada pelo `/api/auth/signup-seller` usando service role
- Retorna o link criado/existente

---

## Fluxo completo

```
GET /join/[code]
  → page.tsx: chama get_project_by_join_code(code)
  → se não encontrar: mostra erro "Link inválido"
  → se encontrar: renderiza JoinAuthForm com company_id + company_name

POST /api/auth/signup-seller
  body: { email, password, name, join_code }
  → resolve company via get_project_by_join_code(join_code)
  → supabase.auth.signUp()
  → INSERT em public.profiles (role='seller', organization_id da empresa)
  → get_or_create_seller_company_link(new_user_id, company_id)
  → retorna { ok: true } → client redireciona para /train/welcome
```

---

## Padrão reutilizável

Sempre que uma operação precisar funcionar **antes do usuário estar logado** (resolução pública de convite, preview de conteúdo compartilhado, etc.):

1. Criar função `SECURITY DEFINER` que aceita apenas o identificador público (código, slug)
2. Função retorna apenas o mínimo necessário — nunca dados sensíveis
3. `GRANT EXECUTE TO anon` se precisar funcionar sem auth, ou `TO authenticated` se o usuário já tem sessão mas ainda não tem org

Não criar políticas RLS `FOR SELECT USING (true)` em tabelas inteiras — isso expõe todos os registros. Funções SECURITY DEFINER permitem controle granular do que é retornado.

---

## Colunas de infra adicionadas

- `scenario_companies.join_code TEXT NOT NULL UNIQUE` — código curto (UUID sem hífens, 32 chars)
- `seller_companies(seller_id, company_id)` — vínculo; criado automaticamente no signup via link
- `profiles.organization_id` — preenchido no signup com a org da empresa-alvo

## Geração do join_code nas Server Actions

`createScenarioCompany` e `createCompanyQuick` precisam gerar o código no lado da aplicação:
```ts
join_code: randomUUID().replace(/-/g, '')
```
A migration já popula registros existentes com `gen_random_uuid()`. Novos inserts precisam gerar o código explicitamente — a coluna é NOT NULL sem default.
