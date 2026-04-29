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

  return <RepaymentClient user={user} />
}
