# 2026-05-20 — pnpm e build

Problema: `pnpm install` dizia ok, mas `next`, `eslint` e `tsc` falhavam com `MODULE_NOT_FOUND`.

Causa: `sales-trainer/node_modules` estava quebrado. Symlinks apontavam para `../../node_modules/.pnpm/...`, mas o store virtual real estava em `sales-trainer/node_modules/.pnpm`.

Correção: remover `node_modules` e reinstalar com `pnpm install --frozen-lockfile` fora do sandbox, porque o store global do pnpm precisa escrever em SQLite.

Decisões:
- manter `pnpm@11.1.2`, pois o app já usa `packageManager` e lockfile pnpm;
- remover `pnpm.onlyBuiltDependencies` do `package.json`, pois pnpm atual ignora isso;
- manter build pela raiz, mas fixar `turbopack.root` no app para evitar warning de workspace.

Pendente: warning de lint em `components/profile-builder/builder-form.tsx`, linha 43: `watch()` do React Hook Form faz React Compiler pular memoização. Não quebra build.
