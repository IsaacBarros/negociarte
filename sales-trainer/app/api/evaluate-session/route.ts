import { after } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { evaluateSession, type CustomCriteria, type CustomCriteriaStage } from '@/lib/ai/evaluator'
import { z } from 'zod'
import type { Database, Json } from '@/types/database'

export const maxDuration = 60

const BodySchema = z.object({
  session_id: z.string().uuid(),
})

function createAdminClient() {
  return createSupabaseAdmin<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(request: Request) {
  const body: unknown = await request.json()
  const parsed = BodySchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
  }

  const { session_id } = parsed.data

  // Retorna 202 imediatamente; after() mantém o handler vivo enquanto avalia
  after(async () => {
    try {
      await runEvaluation(session_id)
    } catch (err) {
      console.error('[evaluate-session] Erro:', err)
    }
  })

  return NextResponse.json({ ok: true }, { status: 202 })
}

async function runEvaluation(session_id: string): Promise<void> {
  const adminClient = createAdminClient()

  const { data: session } = await adminClient
    .from('training_sessions')
    .select(
      'id, seller_id, organization_id, status, total_tokens, customer_profile_id, behavior_style_id, outcome, difficulty_level, chosen_objective, started_at, ended_at',
    )
    .eq('id', session_id)
    .eq('status', 'completed')
    .single()

  if (!session) {
    console.error('[evaluate-session] Sessão não encontrada ou não completed:', session_id)
    return
  }

  const { data: profile } = await adminClient
    .from('customer_profiles')
    .select(
      'name, difficulty_level, scenario_type, visit_objective, success_criteria, sales_process_context, sales_competencies_context, company_id',
    )
    .eq('id', session.customer_profile_id)
    .single()

  // Fetch custom evaluation criteria for the company (if any)
  let customCriteria: CustomCriteria | null = null
  const companyId = (profile as { company_id?: string | null } | null)?.company_id
  if (companyId) {
    const { data: criteriaRow } = await adminClient
      .from('evaluation_criteria')
      .select('stages, total_points')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .single()
    if (criteriaRow?.stages) {
      customCriteria = {
        stages: criteriaRow.stages as unknown as CustomCriteriaStage[],
        total_points: criteriaRow.total_points,
      }
    }
  }

  const { data: behaviorStyle } = session.behavior_style_id
    ? await adminClient
        .from('behavior_styles')
        .select('name, description, evaluation_criteria')
        .eq('id', session.behavior_style_id)
        .single()
    : { data: null }

  const { data: messages } = await adminClient
    .from('messages')
    .select('role, content')
    .eq('session_id', session_id)
    .order('created_at', { ascending: true })

  if (!messages?.length) {
    console.error('[evaluate-session] Sessão sem mensagens:', session_id)
    return
  }

  const durationMinutes =
    session.started_at && session.ended_at
      ? Math.round(
          (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000,
        )
      : null

  const evaluation = await evaluateSession({
    session: {
      id: session.id,
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
      difficulty_level: session.difficulty_level,
      chosen_objective: session.chosen_objective,
      customer_profiles: profile,
      behavior_styles: behaviorStyle,
    },
    messages: messages as { role: 'user' | 'assistant'; content: string }[],
    durationMinutes,
    customCriteria,
  })

  const model = process.env.OPENROUTER_EVAL_MODEL ?? 'openai/gpt-4o-mini'

  // Mapeia outcome do avaliador para o enum do banco
  const outcomeMap: Record<string, 'accepted' | 'rejected' | 'ended_by_errors'> = {
    accepted: 'accepted',
    advanced: 'accepted',
    refused: 'rejected',
    inconclusive: 'ended_by_errors',
  }
  const dbOutcome = outcomeMap[evaluation.outcome] ?? 'ended_by_errors'

  const [{ error: feedbackError }] = await Promise.all([
    adminClient.from('session_feedback').upsert({
      session_id,
      overall_score: evaluation.overall_score,
      strengths: evaluation.strengths,
      improvements: evaluation.improvements,
      techniques_used: evaluation.techniques_used,
      techniques_missed: evaluation.techniques_missed,
      competency_scores: evaluation.stage_scores,
      raw_evaluation: evaluation as unknown as Json,
      model_used: model,
      generated_by: 'ai',
    }),
    adminClient
      .from('training_sessions')
      .update({ outcome: dbOutcome })
      .eq('id', session_id),
  ])

  if (feedbackError) {
    console.error('[evaluate-session] Erro ao salvar feedback:', feedbackError)
  } else {
    console.log('[evaluate-session] Avaliação salva. Score:', evaluation.overall_score)
  }
}
