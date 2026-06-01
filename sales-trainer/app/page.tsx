import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileRaw, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = (profileRaw as { role: string } | null)?.role

  if (!role) {
    const reason = profileError?.code ?? 'missing_profile'
    redirect(`/login?error=missing_profile&reason=${encodeURIComponent(reason)}`)
  }

  if (role === 'admin') redirect('/admin/companies')
  redirect('/train')
}
