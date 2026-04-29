'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

interface Profile {
  full_name: string
  role: string
  status: string
  avatar_url: string | null
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'verified') {
    return (
      <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#d1fae5', color: '#065f46' }}>
        ✅ Verified
      </span>
    )
  }
  if (status === 'pending') {
    return (
      <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
        ⏳ Pending
      </span>
    )
  }
  return (
    <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>
      ⚠ Unverified
    </span>
  )
}

export default function NavBar() {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!mounted) return
      if (!user) {
        setLoading(false)
        return
      }

      setUser(user)

      const { data } = await supabase
        .from('profiles')
        .select('full_name, role, status, avatar_url')
        .eq('id', user.id)
        .single()

      if (!mounted) return
      setProfile(data)

      if (data?.avatar_url) {
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(data.avatar_url)
        setAvatarUrl(urlData.publicUrl)
      }

      setLoading(false)
    }

    loadSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadSession()
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase]) // supabase is stable (stored in ref)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setAvatarUrl(null)
    setDropdownOpen(false)
    router.push('/')
    router.refresh()
  }

  const dashboardHref =
    profile?.role === 'seller' ? '/dashboard/seller' : '/dashboard/buyer'

  const truncatedName = profile
    ? profile.full_name.length > 14
      ? profile.full_name.slice(0, 14) + '…'
      : profile.full_name
    : ''

  return (
    <nav
      className="px-4 py-3 flex items-center justify-between shadow-sm"
      style={{ backgroundColor: 'var(--charcoal)' }}
    >
      {/* Brand */}
      <a href="/" className="flex items-center gap-2 no-underline">
        <svg width="32" height="32" viewBox="0 0 80 80" aria-hidden="true">
          <rect width="80" height="80" rx="15" fill="#1B4D2E" />
          <path
            d="M13 63L13 21L40 47L67 21L67 63"
            fill="none"
            stroke="#C8771C"
            strokeWidth="7.5"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        </svg>
        <span className="flex items-baseline gap-1">
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontWeight: 900,
              fontSize: '1.35rem',
              color: 'var(--cream)',
              lineHeight: 1,
            }}
          >
            Mbare
          </span>
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontWeight: 700,
              fontSize: '0.7rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--amber)',
              lineHeight: 1,
            }}
          >
            Direct
          </span>
        </span>
      </a>

      {/* Right side */}
      <div className="flex gap-3 text-sm font-semibold items-center">
        {loading ? null : user ? (
          /* ── Logged-in ── */
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center gap-2 focus:outline-none"
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
            >
              {/* Avatar circle */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                style={{ backgroundColor: 'var(--green)', border: '2px solid var(--amber)' }}
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt={profile?.full_name ?? 'User'} className="w-full h-full object-cover" />
                ) : (
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontStyle: 'italic',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      color: '#fff',
                    }}
                  >
                    {profile ? getInitials(profile.full_name) : '?'}
                  </span>
                )}
              </div>

              {/* Name — only when profile is loaded */}
              {profile && (
                <span className="hidden sm:block text-sm" style={{ color: 'var(--cream)', fontFamily: 'var(--font-ui)' }}>
                  {truncatedName}
                </span>
              )}

              {/* Status badge — only when profile is loaded */}
              {profile && <StatusBadge status={profile.status} />}
            </button>

            {/* Dropdown */}
            {dropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-48 rounded-xl shadow-lg z-50 overflow-hidden"
                style={{ backgroundColor: 'var(--cream)', border: '1px solid var(--border)' }}
              >
                <a
                  href="/profile"
                  className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-amber-50 transition-colors"
                  style={{ color: 'var(--text)', fontFamily: 'var(--font-ui)' }}
                  onClick={() => setDropdownOpen(false)}
                >
                  👤 My Profile
                </a>
                <a
                  href={dashboardHref}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-amber-50 transition-colors"
                  style={{ color: 'var(--text)', fontFamily: 'var(--font-ui)' }}
                  onClick={() => setDropdownOpen(false)}
                >
                  📊 Dashboard
                </a>
                <div style={{ borderTop: '1px solid var(--border)' }} />
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-red-50 transition-colors text-left"
                  style={{ color: '#dc2626', fontFamily: 'var(--font-ui)' }}
                >
                  🚪 Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ── Logged-out ── */
          <>
            <a
              href="/auth/login"
              style={{ color: 'var(--cream)', fontFamily: 'var(--font-ui)' }}
              className="hover:opacity-80 transition-opacity"
            >
              Login
            </a>
            <a
              href="/auth/register"
              className="rounded-lg px-3 py-1 transition-colors"
              style={{
                backgroundColor: 'var(--amber)',
                color: 'var(--charcoal)',
                fontFamily: 'var(--font-ui)',
                fontWeight: 700,
              }}
            >
              Join
            </a>
          </>
        )}
      </div>
    </nav>
  )
}
