/**
 * POST /api/auth/signup-seller
 *
 * Cria uma conta de vendedor a partir de um link de projeto (join_code).
 * Diferente do /api/auth/signup (admin):
 *  - Não cria nova organização
 *  - Role é sempre 'seller'
 *  - Usa o join_code para identificar a org e vincular o seller ao projeto
 *  - Faz login automático após o cadastro (retorna com session cookie)
 */
import { NextResponse } from 'next/server'
import { createClient as createSSRClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { z } from 'zod'

const SignupSellerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  joinCode: z.string().min(8).max(64),
})

function makeAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(request: Request) {
  const body: unknown = await request.json()
  const result = SignupSellerSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }

  const { fullName, email, password, joinCode } = result.data
  const admin = makeAdminClient()

  // 1. Busca empresa pelo join_code para obter organization_id
  const { data: companyRows, error: companyError } = await admin
    .from('scenario_companies')
    .select('id, name, organization_id')
    .eq('join_code', joinCode)
    .eq('is_active', true)
    .limit(1)

  if (companyError || !companyRows || companyRows.length === 0) {
    return NextResponse.json({ error: 'Link de projeto inválido ou expirado.' }, { status: 404 })
  }

  const company = companyRows[0] as { id: string; name: string; organization_id: string }

  // 2. Cria usuário no Supabase Auth (auto-confirmado)
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError ?? !authData.user) {
    if (authError?.message?.includes('already registered')) {
      return NextResponse.json({ error: 'E-mail já cadastrado.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erro ao criar usuário.' }, { status: 500 })
  }

  const userId = authData.user.id

  // 3. Cria perfil com role: 'seller' e organization_id da empresa
  const { error: profileError } = await admin.from('profiles').insert({
    id: userId,
    organization_id: company.organization_id,
    email,
    full_name: fullName,
    role: 'seller',
  })

  if (profileError) {
    await admin.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: 'Erro ao criar perfil.' }, { status: 500 })
  }

  // 4. Vincula seller à empresa do projeto
  await admin
    .from('seller_companies')
    .insert({
      seller_id: userId,
      company_id: company.id,
      organization_id: company.organization_id,
    })
    .select()
  // Ignora erro de conflito (caso já vinculado por corrida) — ON CONFLICT não suportado
  // no insert direto, mas para um novo usuário não haverá conflito.

  // 5. Faz login automático via SSR client (define o cookie de sessão na resposta)
  const supabase = await createSSRClient()
  const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })

  if (loginError) {
    // Usuário foi criado mas login falhou — não é crítico, ele pode logar manualmente
    console.error('[signup-seller] login automático falhou:', loginError.message)
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
