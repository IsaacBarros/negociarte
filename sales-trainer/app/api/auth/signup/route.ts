import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const SignupSchema = z.object({
  fullName: z.string().min(2),
  orgName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
})

// Usa service role para criar org + perfil atomicamente
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const defaultBehaviorStyles = [
  {
    name: 'Dominante',
    description: 'Cliente direto, objetivo, orientado a resultado e impaciente com rodeios.',
    simulation_guidance:
      'Responda de forma direta. Valorize objetividade, dados de impacto e controle. Dificulte a conversa se o vendedor for prolixo, inseguro ou nao conectar a proposta ao resultado da visita.',
    evaluation_criteria:
      'Avalie se o vendedor foi objetivo, demonstrou seguranca, conectou a proposta a resultados e conduziu proximos passos com firmeza.',
  },
  {
    name: 'Influente',
    description: 'Cliente sociavel, expressivo, sensivel a relacionamento, reputacao e entusiasmo.',
    simulation_guidance:
      'Valorize conexao, energia e visao de beneficio. Dificulte a conversa se o vendedor for frio, excessivamente tecnico ou ignorar o relacionamento.',
    evaluation_criteria:
      'Avalie se o vendedor criou rapport, comunicou valor de forma envolvente e manteve foco sem perder conexao.',
  },
  {
    name: 'Estavel',
    description: 'Cliente cauteloso, colaborativo, avesso a risco e interessado em seguranca.',
    simulation_guidance:
      'Valorize previsibilidade, suporte e reducao de risco. Dificulte a conversa se o vendedor pressionar demais ou nao explicar impactos da mudanca.',
    evaluation_criteria:
      'Avalie se o vendedor construiu confianca, reduziu risco percebido e respeitou o ritmo do cliente.',
  },
  {
    name: 'Analitico',
    description: 'Cliente criterioso, detalhista, orientado a dados, provas e comparativos.',
    simulation_guidance:
      'Peca evidencias, numeros e detalhes. Dificulte a conversa se o vendedor fizer afirmacoes vagas, nao souber justificar ROI ou evitar perguntas tecnicas.',
    evaluation_criteria:
      'Avalie se o vendedor usou dados, respondeu objecoes com clareza e estruturou uma argumentacao racional.',
  },
]

export async function POST(request: Request) {
  const body: unknown = await request.json()
  const result = SignupSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }

  const { fullName, orgName, email, password } = result.data

  // 1. Criar usuário no Supabase Auth (email auto-confirmado no MVP)
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    if (authError?.message?.includes('already registered')) {
      return NextResponse.json({ error: 'E-mail já cadastrado.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erro ao criar usuário.' }, { status: 500 })
  }

  // 2. Criar organização
  const { data: org, error: orgError } = await adminClient
    .from('organizations')
    .insert({ name: orgName })
    .select('id')
    .single()

  if (orgError || !org) {
    // Rollback: deletar usuário criado
    await adminClient.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: 'Erro ao criar organização.' }, { status: 500 })
  }

  // 3. Criar perfil (admin por ser o primeiro usuário da org)
  const { error: profileError } = await adminClient.from('profiles').insert({
    id: authData.user.id,
    organization_id: org.id,
    email,
    full_name: fullName,
    role: 'admin',
  })

  if (profileError) {
    await adminClient.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: 'Erro ao criar perfil.' }, { status: 500 })
  }

  const { error: stylesError } = await adminClient.from('behavior_styles').insert(
    defaultBehaviorStyles.map((style) => ({
      organization_id: org.id,
      ...style,
    })),
  )

  if (stylesError) {
    await adminClient.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: 'Erro ao criar estilos comportamentais.' }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
