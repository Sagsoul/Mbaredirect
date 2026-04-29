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

  return (
    <AdminDashboardClient
      allUsers={usersWithUrls}
      statCounts={statCounts}
    />
  )
}
