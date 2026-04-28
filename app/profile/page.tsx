import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileClient from './ProfileClient'

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, phone, role, status, avatar_url, ecocash_name, ecocash_ref, created_at')
    .eq('id', user.id)
    .single()

  return <ProfileClient user={user} profile={profile} />
}
