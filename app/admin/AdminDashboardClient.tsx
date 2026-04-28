'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { SUBSCRIPTION_DURATION_DAYS } from '@/lib/constants'

const REJECTION_REASONS = [
  'Name Mismatch',
  'Invalid ID',
  'Payment not found',
  'Duplicate account',
  'Custom…',
]

interface PendingUser {
  id: string
  full_name: string
  phone?: string
  ecocash_name?: string
  ecocash_ref?: string
  national_id_url?: string
  selfie_url?: string
  national_id_signed_url?: string | null
  selfie_signed_url?: string | null
  created_at: string
  rejection_reason?: string | null
}

interface Props {
  pendingUsers: PendingUser[]
  statCounts: Record<string, number>
}

export default function AdminDashboardClient({ pendingUsers: initial, statCounts }: Props) {
  const supabase = createClient()

  const [users, setUsers] = useState<PendingUser[]>(initial)
  const [rejectUserId, setRejectUserId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState(REJECTION_REASONS[0])
  const [customReason, setCustomReason] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [expandedImg, setExpandedImg] = useState<string | null>(null)

  async function approve(userId: string) {
    setLoading(userId)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + SUBSCRIPTION_DURATION_DAYS)

    await supabase
      .from('profiles')
      .update({
        status: 'verified',
        verified_at: new Date().toISOString(),
        subscription_expires_at: expiresAt.toISOString(),
      })
      .eq('id', userId)

    await supabase
      .from('subscriptions')
      .update({ status: 'confirmed' })
      .eq('user_id', userId)
      .eq('status', 'pending')

    setUsers((prev) => prev.filter((u) => u.id !== userId))
    setLoading(null)
  }

  async function reject(userId: string) {
    setLoading(userId)
    const reason = rejectReason === 'Custom…' ? customReason : rejectReason

    await supabase
      .from('profiles')
      .update({
        status: 'rejected',
        rejection_reason: reason,
      })
      .eq('id', userId)

    await supabase
      .from('subscriptions')
      .update({ status: 'rejected' })
      .eq('user_id', userId)
      .eq('status', 'pending')

    setUsers((prev) => prev.filter((u) => u.id !== userId))
    setRejectUserId(null)
    setLoading(null)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900">🛠️ Admin Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {['verified', 'pending', 'unverified', 'rejected', 'browser_only'].map((status) => (
          <div key={status} className="bg-white rounded-xl border border-slate-100 p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-green-700">{statCounts[status] ?? 0}</p>
            <p className="text-xs text-slate-500 capitalize">{status.replace('_', ' ')}</p>
          </div>
        ))}
      </div>

      <section className="space-y-4">
        <h2 className="font-semibold text-slate-700">
          Pending Verifications ({users.length})
        </h2>

        {users.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-100 p-8 text-center text-slate-400">
            <p className="text-3xl mb-2">🎉</p>
            <p>All caught up! No pending verifications.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {users.map((u) => (
              <div
                key={u.id}
                className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-semibold text-slate-900">{u.full_name}</p>
                    <p className="text-xs text-slate-500">
                      EcoCash: <strong>{u.ecocash_name}</strong> · Ref: <strong>{u.ecocash_ref}</strong>
                    </p>
                    {u.phone && <p className="text-xs text-slate-400">📞 {u.phone}</p>}
                    <p className="text-xs text-slate-400">Submitted: {formatDate(u.created_at)}</p>
                  </div>

                  {/* Thumbnails */}
                  <div className="flex gap-2">
                    {u.national_id_signed_url && (
                      <button
                        onClick={() => setExpandedImg(u.national_id_signed_url!)}
                        aria-label="View National ID document"
                      >
                        <img
                          src={u.national_id_signed_url}
                          alt="National ID"
                          className="w-16 h-16 object-cover rounded-lg border border-slate-200 hover:ring-2 hover:ring-green-500"
                        />
                      </button>
                    )}
                    {u.selfie_signed_url && (
                      <button
                        onClick={() => setExpandedImg(u.selfie_signed_url!)}
                        aria-label="View selfie with ID"
                      >
                        <img
                          src={u.selfie_signed_url}
                          alt="Selfie with ID"
                          className="w-16 h-16 object-cover rounded-lg border border-slate-200 hover:ring-2 hover:ring-green-500"
                        />
                      </button>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => approve(u.id)}
                    disabled={loading === u.id}
                    className="rounded-lg px-4 py-2 font-semibold text-sm bg-green-700 text-white hover:bg-green-800 disabled:opacity-60"
                  >
                    {loading === u.id ? '…' : '✅ Approve'}
                  </button>
                  <button
                    onClick={() => setRejectUserId(u.id)}
                    disabled={loading === u.id}
                    className="rounded-lg px-4 py-2 font-semibold text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    🚫 Reject
                  </button>
                </div>

                {/* Reject form */}
                {rejectUserId === u.id && (
                  <div className="border-t border-slate-100 pt-3 space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Rejection Reason</label>
                    <select
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                    >
                      {REJECTION_REASONS.map((r) => <option key={r}>{r}</option>)}
                    </select>
                    {rejectReason === 'Custom…' && (
                      <input
                        type="text"
                        value={customReason}
                        onChange={(e) => setCustomReason(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                        placeholder="Describe the reason…"
                      />
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => reject(u.id)}
                        disabled={loading === u.id}
                        className="rounded-lg px-4 py-2 font-semibold text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        {loading === u.id ? '…' : 'Confirm Reject'}
                      </button>
                      <button
                        onClick={() => setRejectUserId(null)}
                        className="rounded-lg px-4 py-2 font-semibold text-sm bg-slate-100 text-slate-700 hover:bg-slate-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Expanded image modal */}
      {expandedImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setExpandedImg(null)}
        >
          <img
            src={expandedImg}
            alt="Document"
            className="max-w-full max-h-full rounded-xl shadow-2xl"
          />
        </div>
      )}
    </div>
  )
}
