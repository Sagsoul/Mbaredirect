import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  // Validate `next` is a relative path to prevent open-redirect attacks
  const rawNext = searchParams.get('next')
  const hasExplicitNext = rawNext !== null
  const next =
    rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//')
      ? rawNext
      : '/verify'

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`)
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Check the user's verification status in the profiles table
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('status')
          .eq('id', user.id)
          .single()

        const status = profile?.status ?? null

        // Unverified users (or missing profiles) must complete the onboarding flow
        if (!status || status === 'unverified') {
          return NextResponse.redirect(`${origin}/verify?confirmed=1`)
        }
      }

      // For explicit next params (e.g. password-reset recovery links) honour them;
      // otherwise fall back to /verify which will redirect verified users appropriately
      return NextResponse.redirect(`${origin}${hasExplicitNext ? next : '/verify'}`)
    }
  }

  // If something went wrong, redirect to login with error
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`)
}
