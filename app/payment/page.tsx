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

  return <PaymentClient user={user} />
}
