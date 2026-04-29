import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminDashboardClient from './AdminDashboardClient'

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/')

  const { data: allUsers } = await supabase
    .from('profiles')
    .select('id, full_name, phone, ecocash_name, ecocash_ref, national_id_url, selfie_url, created_at, rejection_reason, status, subscription_expires_at')
    .order('created_at', { ascending: true })

  // Generate signed URLs for private storage
  const usersWithUrls = await Promise.all(
    (allUsers ?? []).map(async (u) => {
      const [idSign, selfieSign] = await Promise.all([
        u.national_id_url
          ? supabase.storage.from('verifications').createSignedUrl(u.national_id_url, 3600)
          : null,
        u.selfie_url
          ? supabase.storage.from('verifications').createSignedUrl(u.selfie_url, 3600)
          : null,
      ])
      return {
        ...u,
        national_id_signed_url: idSign?.data?.signedUrl ?? null,
        selfie_signed_url: selfieSign?.data?.signedUrl ?? null,
      }
    }),
  )

  const { data: stats } = await supabase
    .from('profiles')
    .select('status')

  const statCounts = (stats ?? []).reduce(
    (acc: Record<string, number>, p: { status: string }) => {
      acc[p.status] = (acc[p.status] ?? 0) + 1
      return acc
    },
    {},
  )

  // Step 1: Fetch pending payments (no join)
  const { data: paymentsRaw } = await supabase
    .from('payments')
    .select('id, user_id, ecocash_ref, amount_usd, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  // Step 2: Fetch profiles for those user_ids
  const userIds = (paymentsRaw ?? []).map((p) => p.user_id)

  const { data: paymentProfiles } = userIds.length > 0
    ? await supabase
        .from('profiles')
        .select('id, full_name, subscription_expires_at')
        .in('id', userIds)
    : { data: [] }

  const profileMap = Object.fromEntries(
    (paymentProfiles ?? []).map((p) => [p.id, p])
  )

  // Step 3: Combine
  const pendingPayments = (paymentsRaw ?? []).map((p) => ({
    id: p.id,
    user_id: p.user_id,
    ecocash_ref: p.ecocash_ref,
    amount_usd: p.amount_usd,
    created_at: p.created_at,
    full_name: profileMap[p.user_id]?.full_name ?? 'Unknown',
    subscription_expires_at: profileMap[p.user_id]?.subscription_expires_at ?? null,
  }))

  return (
    <AdminDashboardClient
      allUsers={usersWithUrls}
      statCounts={statCounts}
      pendingPayments={pendingPayments}
    />
  )
}
