'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type StatusMessage = { type: 'pending' | 'rejected' | null; text: string }

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<StatusMessage>({ type: null, text: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setStatusMessage({ type: null, text: '' })
    setLoading(true)

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', data.user.id)
      .single()

    const status = profile?.status ?? null
    const role = profile?.role ?? null

    if (status === 'verified') {
      if (role === 'seller') {
        router.push('/dashboard/seller')
      } else if (role === 'admin') {
        router.push('/')
      } else {
        router.push('/dashboard/buyer')
      }
      router.refresh()
      return
    }

    if (status === 'pending') {
      await supabase.auth.signOut()
      setStatusMessage({
        type: 'pending',
        text: "Your account is under review. We'll notify you by email within 24 hours once our team has verified your details.",
      })
      setLoading(false)
      return
    }

    if (status === 'rejected') {
      await supabase.auth.signOut()
      setStatusMessage({
        type: 'rejected',
        text: 'Your application was not approved. Please contact support at support@mbaredirect.com.',
      })
      setLoading(false)
      return
    }

    if (status === 'browser_only') {
      router.push('/')
      router.refresh()
      return
    }

    // unverified, null, or profile fetch error — send to verify
    router.push('/verify')
    router.refresh()
  }

  return (
    <div className="max-w-sm mx-auto mt-8 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
        <p className="text-slate-500 text-sm mt-1">Sign in to your Mbare Direct account</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-4">
        {statusMessage.type === 'pending' && (
          <div
            className="rounded-lg border px-4 py-3 text-sm"
            style={{ backgroundColor: '#FAEEDE', borderColor: '#F0C68C', color: '#9E5C12' }}
          >
            <p className="font-semibold mb-0.5">⏳ Your account is under review</p>
            <p>{statusMessage.text}</p>
          </div>
        )}

        {statusMessage.type === 'rejected' && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            <p className="font-semibold mb-0.5">❌ Verification unsuccessful</p>
            <p>{statusMessage.text}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/10"
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/10"
            placeholder="••••••••"
          />
        </div>

        <div className="flex justify-end">
          <a
            href="/auth/forgot-password"
            className="text-xs text-green-700 font-semibold hover:underline"
          >
            Forgot password?
          </a>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-700 text-white rounded-lg px-4 py-2.5 font-semibold text-sm hover:bg-green-600 disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500">
        Don't have an account?{' '}
        <a href="/auth/register" className="text-green-700 font-semibold hover:underline">
          Join for $10/year
        </a>
      </p>
    </div>
  )
}
