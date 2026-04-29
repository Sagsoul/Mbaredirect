// Requires a `payments` table: id uuid pk, user_id uuid fk profiles, ecocash_ref text,
// payment_type text, status text default 'pending', created_at timestamptz default now()

'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function PaymentClient({
  user,
}: {
  user: User
}) {
  const supabase = createClient()

  const [ecocashRef, setEcocashRef] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!ecocashRef.trim()) {
      setError('Please enter your EcoCash reference.')
      return
    }

    setSubmitting(true)

    const { error: insertError } = await supabase.from('payments').insert({
      user_id: user.id,
      ecocash_ref: ecocashRef.trim(),
      payment_type: 'membership',
      status: 'pending',
    })

    if (insertError) {
      setError(insertError.message)
      setSubmitting(false)
      return
    }

    setSuccess(true)
    setSubmitting(false)
  }

  if (success) {
    return (
      <div className="max-w-sm mx-auto mt-8 text-center space-y-4">
        <p className="text-4xl">✅</p>
        <p className="font-semibold text-lg" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
          Payment submitted!
        </p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          An admin will verify and approve within 24 hours.
        </p>
        <a
          href="/dashboard/buyer"
          className="inline-block rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
          style={{ backgroundColor: 'var(--green)' }}
        >
          Back to Dashboard
        </a>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto mt-8 space-y-6">
      <div className="text-center">
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--charcoal)' }}
        >
          💳 Submit Payment
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Send your annual membership fee via EcoCash to the number below, then enter your reference for admin approval.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-4"
      >
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">
            {error}
          </div>
        )}

        {/* EcoCash payment instructions */}
        <div
          className="rounded-lg px-4 py-3 space-y-1 text-sm"
          style={{ backgroundColor: 'var(--green-pale)', border: '1px solid var(--green-light)' }}
        >
          <p className="font-semibold" style={{ color: '#065f46' }}>Send payment via EcoCash to:</p>
          <p style={{ color: 'var(--charcoal)' }}>
            📱 <strong>0788844602</strong>
          </p>
          <p style={{ color: 'var(--charcoal)' }}>
            👤 <strong>Shingai Gunha</strong>
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            After sending, enter your EcoCash transaction reference below.
          </p>
        </div>

        <div className="space-y-1">
          <label htmlFor="ecocashRef" className="block text-sm font-medium text-slate-700">
            EcoCash Reference
          </label>
          <input
            id="ecocashRef"
            type="text"
            required
            value={ecocashRef}
            onChange={(e) => setEcocashRef(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
            placeholder="e.g. EC12345678"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full text-white rounded-lg px-4 py-2.5 font-semibold text-sm disabled:opacity-60"
          style={{ backgroundColor: 'var(--green)' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--green-mid)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--green)')}
        >
          {submitting ? 'Submitting…' : 'Submit for Approval'}
        </button>
      </form>
    </div>
  )
}
