Inicialize o contexto de trabalho para esta sessão do Sales Trainer.

Execute os seguintes passos em ordem:

1. **Leia** `CLAUDE.md` na raiz do projeto — regras globais, stack, padrões e zonas críticas.

2. **Leia** `.claude/knowledge/learnings.md` — aprendizados acumulados. Preste atenção especial nas entradas mais recentes (últimas 3).

3. **Verifique o estado atual do código:**
   - Liste arquivos modificados recentemente: `find sales-trainer -newer sales-trainer/package.json -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v ".next" | head -20`
   - Verifique se há migrações pendentes: liste `sales-trainer/supabase/migrations/`

4. **Leia** os CLAUDE.md contextuais relevantes para a tarefa da sessão:
   - `sales-trainer/lib/CLAUDE.md` se trabalhar na camada de domínio
   - `sales-trainer/components/CLAUDE.md` se trabalhar em componentes

5. **Reporte** um resumo de contexto em 5 bullets:
   - Stack e versões principais
   - Últimos 3 aprendizados registrados
   - Arquivos modificados recentemente
   - Zonas críticas a ter atenção
   - Próximos passos sugeridos (se identificados)

Após o bootstrap, pergunte qual é a tarefa da sessão antes de começar qualquer implementação.
