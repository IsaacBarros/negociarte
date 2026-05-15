# CLAUDE.md — components/

## Regra fundamental

**Server Components por padrão.** Adicione `"use client"` apenas quando o componente precisa de:
- `useState`, `useEffect` ou outro hook de estado/efeito
- Event handlers (`onClick`, `onChange`, etc.)
- APIs de browser (`window`, `localStorage`, etc.)
- Hooks do Vercel AI SDK (`useChat`)

## Estrutura

```
components/
├── ui/          # shadcn — nunca modifique diretamente, use como estão
├── chat/        # componentes da interface de chat
├── profile-builder/ # formulário de criação de perfis (admin)
├── sidebar/     # sidebar de navegação
└── layout/      # header, shells de layout
```

Componentes que servem a uma única feature ficam na pasta da feature. `components/` é para componentes reutilizados por 2+ páginas.

## Props

- Sempre tipadas com interface TypeScript explícita
- Sem CSS inline — use classes Tailwind
- Sem `any` em props — sempre tipo específico ou `unknown`

## Padrão de componente

```tsx
interface Props {
  // tipagem explícita
}

// Server Component (padrão — sem "use client")
export function MeuComponente({ prop }: Props) {
  return <div>{prop}</div>
}
```

## shadcn/ui

- Importe de `@/components/ui/<nome>`
- Não modifique os arquivos em `ui/` — abra issue/PR
- Para customizar, use as variantes (`variant`, `size`) ou `className`
