// Requires a `payments` table: id uuid pk, user_id uuid fk profiles, ecocash_ref text,
// amount_usd numeric, payment_type text, status text default 'pending', created_at timestamptz default now()

'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface Profile {
  full_name: string
  phone: string | null
  role: string
  status: string
}

export default function PaymentClient({
  user,
  profile,
}: {
  user: User
  profile: Profile | null
}) {
  const supabase = createClient()

  const [ecocashRef, setEcocashRef] = useState('')
  const [amountUsd, setAmountUsd] = useState('')
  const [paymentType, setPaymentType] = useState<'membership' | 'deal_fee'>('membership')
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
    if (!amountUsd || parseFloat(amountUsd) <= 0) {
      setError('Please enter a valid amount.')
      return
    }

    setSubmitting(true)

    const { error: insertError } = await supabase.from('payments').insert({
      user_id: user.id,
      ecocash_ref: ecocashRef.trim(),
      amount_usd: parseFloat(amountUsd),
      payment_type: paymentType,
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
          To activate your account or pay a platform fee, send payment via EcoCash and enter the reference below for admin approval.
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

        <div className="space-y-1">
          <label htmlFor="amountUsd" className="block text-sm font-medium text-slate-700">
            Amount Paid (USD)
          </label>
          <input
            id="amountUsd"
            type="number"
            required
            min="0.01"
            step="0.01"
            value={amountUsd}
            onChange={(e) => setAmountUsd(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Payment Type</label>
          {([
            { value: 'membership', label: 'Membership fee' },
            { value: 'deal_fee', label: 'Platform fee (deal)' },
          ] as const).map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
              <input
                type="radio"
                name="paymentType"
                value={opt.value}
                checked={paymentType === opt.value}
                onChange={() => setPaymentType(opt.value)}
                className="accent-green-700"
              />
              {opt.label}
            </label>
          ))}
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
