import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PaymentClient from './PaymentClient'

export default async function PaymentPage() {
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

  return <PaymentClient user={user} profile={profile} />
}
