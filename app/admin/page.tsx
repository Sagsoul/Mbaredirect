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

  const { data: pendingUsers } = await supabase
    .from('profiles')
    .select('id, full_name, phone, ecocash_name, ecocash_ref, national_id_url, selfie_url, created_at, rejection_reason')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  // Generate signed URLs for private storage
  const usersWithUrls = await Promise.all(
    (pendingUsers ?? []).map(async (u) => {
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

  // Fetch pending payments joined with profile full_name
  const { data: pendingPaymentsRaw } = await supabase
    .from('payments')
    .select('id, user_id, ecocash_ref, amount_usd, created_at, profiles(full_name, subscription_expires_at)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  const pendingPayments = (pendingPaymentsRaw ?? []).map((p) => {
    const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles
    return {
      id: p.id,
      user_id: p.user_id,
      ecocash_ref: p.ecocash_ref,
      amount_usd: p.amount_usd,
      created_at: p.created_at,
      full_name: profile?.full_name ?? 'Unknown',
      subscription_expires_at: profile?.subscription_expires_at ?? null,
    }
  })

  return (
    <AdminDashboardClient
      pendingUsers={usersWithUrls}
      statCounts={statCounts}
      pendingPayments={pendingPayments}
    />
  )
}
