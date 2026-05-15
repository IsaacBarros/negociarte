import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: Request) {
  const body: unknown = await request.json()
  const result = LoginSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(result.data)

  if (error) {
    return NextResponse.json({ error: 'E-mail ou senha inválidos.' }, { status: 401 })
  }

  return NextResponse.json({ success: true })
}
