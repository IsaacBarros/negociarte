'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type AuthUser = {
  id: string
  email: string
  role: 'admin' | 'seller'
  organization_id: string
  full_name: string | null
}

export async function requireAuth(): Promise<AuthUser> {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, role, organization_id, full_name')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  return profile as AuthUser
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth()

  if (user.role !== 'admin') {
    redirect('/')
  }

  return user
}
