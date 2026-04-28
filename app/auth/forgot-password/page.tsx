'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/reset-password`,
    })

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="max-w-sm mx-auto mt-8 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">Forgot password?</h1>
        <p className="text-slate-500 text-sm mt-1">
          Enter your email and we'll send you a reset link.
        </p>
      </div>

      {sent ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-center space-y-3">
          <div className="text-4xl">📬</div>
          <h2 className="font-bold text-slate-900">Check your inbox</h2>
          <p className="text-sm text-slate-500">
            We sent a password reset link to <strong>{email}</strong>. Check your spam folder if you don't see it.
          </p>
          <a
            href="/auth/login"
            className="inline-block text-sm text-green-700 font-semibold hover:underline"
          >
            ← Back to sign in
          </a>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email address
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-700 text-white rounded-lg px-4 py-2.5 font-semibold text-sm hover:bg-green-600 disabled:opacity-60"
          >
            {loading ? 'Sending…' : 'Send Reset Link'}
          </button>

          <p className="text-center text-sm text-slate-500">
            <a href="/auth/login" className="text-green-700 font-semibold hover:underline">
              ← Back to sign in
            </a>
          </p>
        </form>
      )}
    </div>
  )
}
