import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BuyerDashboardClient, { MyRequest } from './BuyerDashboardClient'

export default async function BuyerDashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('status, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.status !== 'verified') {
    redirect('/verify')
  }

  // Fetch price floors for client-side check
  const { data: priceFloors } = await supabase
    .from('price_floors')
    .select('category, item_keyword, min_price_usd')

  // Fetch buyer's own requests
  const { data: myRequests } = await supabase
    .from('requests')
    .select(`
      id, category, item, quantity, location, target_budget_usd,
      created_at, status,
      pitches(id, price_usd, message, status, created_at,
        seller:profiles!pitches_seller_id_fkey(full_name, reliability_score, reliability_count)
      )
    `)
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <BuyerDashboardClient
      userId={user.id}
      priceFloors={priceFloors ?? []}
      myRequests={(myRequests ?? []) as unknown as MyRequest[]}
    />
  )
}
