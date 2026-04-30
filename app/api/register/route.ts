import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, fullName, phone, role } = body as {
      userId: string
      fullName: string
      phone: string
      role: 'buyer' | 'seller'
    }

    if (!userId || !fullName || !phone || !role) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { error } = await supabase.from('profiles').insert({
      id: userId,
      full_name: fullName,
      phone,
      role,
      status: 'unverified',
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[/api/register] Unexpected error:', err)
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 })
  }
}
