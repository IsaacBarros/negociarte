/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { evaluateSession } from '@/lib/ai/evaluator'
import { z } from 'zod'

const WebhookSchema = z.object({
  event: z.literal('session.completed'),
  session_id: z.string().uuid(),
})

function createAdminClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(request: Request) {
  const adminClient = createAdminClient()
  const secret = process.env.N8N_WEBHOOK_SECRET
  if (secret) {
    const providedSecret = request.headers.get('x-webhook-secret')
    if (providedSecret !== secret) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }
  }

  const body: unknown = await request.json()
  const result = WebhookSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
  }

  const { session_id } = result.data

  const { data: sessionRaw, error: sessionError } = await (adminClient as any)
    .from('training_sessions')
    .select('id, seller_id, organization_id, status, total_tokens, customer_profile_id, behavior_style_id, outcome')
    .eq('id', session_id)
    .eq('status', 'completed')
    .single()

  if (sessionError || !sessionRaw) {
    return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 404 })
  }

  const session = sessionRaw as {
    id: string
    seller_id: string
    organization_id: string
    status: string
    total_tokens: number
    customer_profile_id: string
    behavior_style_id: string | null
    outcome: 'accepted' | 'rejected' | 'ended_by_errors' | null
  }

  // Busca dados do perfil
  const { data: profileRaw } = await (adminClient as any)
    .from('customer_profiles')
    .select('name, difficulty_level, scenario_type')
    .eq('id', session.customer_profile_id)
    .single()

  const profile = profileRaw as {
    name: string
    difficulty_level: string | null
    scenario_type: string | null
  } | null

  const { data: messages } = await (adminClient as any)
    .from('messages')
    .select('role, content')
    .eq('session_id', session_id)
    .order('created_at', { ascending: true })

  if (!messages?.length) {
    return NextResponse.json({ error: 'Sessão sem mensagens.' }, { status: 400 })
  }

  try {
    const evaluation = await evaluateSession({
      session: {
        ...session,
        customer_profile_id: session.customer_profile_id,
        seller_id: session.seller_id,
        organization_id: session.organization_id,
        title: null,
        status: 'completed',
        started_at: '',
        ended_at: null,
        total_tokens: session.total_tokens,
        behavior_style_id: session.behavior_style_id,
        outcome: session.outcome,
        customer_profiles: profile,
      },
      messages: messages as { role: 'user' | 'assistant'; content: string }[],
    })

    const model = process.env.OPENROUTER_EVAL_MODEL ?? 'openai/gpt-4o-mini'

    const { error: feedbackError } = await (adminClient as any)
      .from('session_feedback')
      .upsert({
        session_id,
        overall_score: evaluation.overall_score,
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
        techniques_used: evaluation.techniques_used,
        techniques_missed: evaluation.techniques_missed,
        raw_evaluation: evaluation,
        model_used: model,
        generated_by: 'ai',
      })

    if (feedbackError) {
      console.error('Erro ao salvar feedback:', feedbackError)
      return NextResponse.json({ error: 'Erro ao salvar feedback.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, score: evaluation.overall_score })
  } catch (err) {
    console.error('Erro na avaliação:', err)
    return NextResponse.json({ error: 'Erro ao gerar avaliação.' }, { status: 500 })
  }
}
