import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import RepaymentClient from './RepaymentClient'

export default async function RepaymentPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone, role, status')
    .eq('id', user.id)
    .single()

  return <RepaymentClient user={user} profile={profile} />
}
