import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { DASHBOARD_BLOCKED_STATUSES } from '@/lib/constants'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Redirect unauthenticated users away from protected routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
    if (!user) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/auth/login'
      return NextResponse.redirect(loginUrl)
    }
  }

  // For dashboard routes, check role and status
  if (pathname.startsWith('/dashboard') && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single()

    if (profile) {
      const blockedStatuses: readonly string[] = DASHBOARD_BLOCKED_STATUSES
      if (blockedStatuses.includes(profile.status)) {
        const verifyUrl = request.nextUrl.clone()
        verifyUrl.pathname = '/verify'
        return NextResponse.redirect(verifyUrl)
      }
    }
  }

  // Admin route guard
  if (pathname.startsWith('/admin') && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      const homeUrl = request.nextUrl.clone()
      homeUrl.pathname = '/'
      return NextResponse.redirect(homeUrl)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
