'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'

const REJECTION_REASONS = [
  'Name Mismatch',
  'Invalid ID',
  'Payment not found',
  'Duplicate account',
  'Custom…',
]

const STATUS_OPTIONS = ['verified', 'pending', 'unverified', 'rejected', 'browser_only'] as const

const ANNUAL_MEMBERSHIP_USD = 10

function calcSubscriptionDays(amountUsd: number): number {
  return Math.round((amountUsd / ANNUAL_MEMBERSHIP_USD) * 365)
}

interface AdminUser {
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
  status: string
  subscription_expires_at?: string | null
}

interface PendingPayment {
  id: string
  user_id: string
  ecocash_ref: string
  amount_usd: number | null
  created_at: string
  full_name: string
  subscription_expires_at: string | null
}

interface Props {
  allUsers: AdminUser[]
  statCounts: Record<string, number>
  pendingPayments: PendingPayment[]
}

export default function AdminDashboardClient({ allUsers: initial, statCounts, pendingPayments: initialPayments }: Props) {
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState<string>('pending')

  const [usersByStatus, setUsersByStatus] = useState<Record<string, AdminUser[]>>(() => {
    const grouped: Record<string, AdminUser[]> = {}
    for (const u of initial) {
      if (!grouped[u.status]) grouped[u.status] = []
      grouped[u.status].push(u)
    }
    return grouped
  })

  const users = usersByStatus[activeTab] ?? []

  const [payments, setPayments] = useState<PendingPayment[]>(initialPayments)
  const [rejectUserId, setRejectUserId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState(REJECTION_REASONS[0])
  const [customReason, setCustomReason] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [expandedImg, setExpandedImg] = useState<string | null>(null)
  const [approveAmount, setApproveAmount] = useState<Record<string, string>>({})
  const [paymentAmount, setPaymentAmount] = useState<Record<string, string>>({})

  const [editStatusUserId, setEditStatusUserId] = useState<string | null>(null)
  const [editStatusValue, setEditStatusValue] = useState<string>('pending')
  const [editStatusSuccess, setEditStatusSuccess] = useState<string | null>(null)

  function removeUserFromTab(userId: string, fromStatus: string) {
    setUsersByStatus((prev) => ({
      ...prev,
      [fromStatus]: (prev[fromStatus] ?? []).filter((u) => u.id !== userId),
    }))
  }

  function moveUserBetweenTabs(user: AdminUser, fromStatus: string, toStatus: string, extraFields?: Partial<AdminUser>) {
    setUsersByStatus((prev) => ({
      ...prev,
      [fromStatus]: (prev[fromStatus] ?? []).filter((u) => u.id !== user.id),
      [toStatus]: [...(prev[toStatus] ?? []), { ...user, status: toStatus, ...extraFields }],
    }))
  }

  async function approve(userId: string, amountUsd: number) {
    setLoading(userId)
    const days = calcSubscriptionDays(amountUsd)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + days)

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

    removeUserFromTab(userId, 'pending')
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

    removeUserFromTab(userId, 'pending')
    setRejectUserId(null)
    setLoading(null)
  }

  async function approvePayment(paymentId: string, userId: string, amountUsd: number, currentExpiry: string | null) {
    setLoading(paymentId)
    const days = calcSubscriptionDays(amountUsd)
    const now = new Date()
    const base = currentExpiry && new Date(currentExpiry) > now ? new Date(currentExpiry) : now
    const expiresAt = new Date(base)
    expiresAt.setDate(expiresAt.getDate() + days)

    const { error: paymentError } = await supabase
      .from('payments')
      .update({ status: 'approved', approved_at: now.toISOString() })
      .eq('id', paymentId)

    if (paymentError) {
      setLoading(null)
      return
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ status: 'verified', subscription_expires_at: expiresAt.toISOString() })
      .eq('id', userId)

    if (profileError) {
      setLoading(null)
      return
    }

    setPayments((prev) => prev.filter((p) => p.id !== paymentId))
    setLoading(null)
  }

  async function rejectPayment(paymentId: string) {
    setLoading(paymentId)

    const { error } = await supabase
      .from('payments')
      .update({ status: 'rejected' })
      .eq('id', paymentId)

    if (error) {
      setLoading(null)
      return
    }

    setPayments((prev) => prev.filter((p) => p.id !== paymentId))
    setLoading(null)
  }

  async function saveStatus(user: AdminUser, newStatus: string, hasExpiry: boolean) {
    setLoading(user.id)
    const expiresAt =
      newStatus === 'verified' && !hasExpiry
        ? (() => {
            const d = new Date()
            d.setDate(d.getDate() + 365)
            return d
          })()
        : null

    const updates: Record<string, unknown> = { status: newStatus }
    if (expiresAt) updates.subscription_expires_at = expiresAt.toISOString()

    const { error } = await supabase.from('profiles').update(updates).eq('id', user.id)

    if (error) {
      setLoading(null)
      return
    }

    moveUserBetweenTabs(user, user.status, newStatus, expiresAt ? { subscription_expires_at: expiresAt.toISOString() } : undefined)
    setEditStatusUserId(null)
    setEditStatusSuccess(user.id)
    setTimeout(() => setEditStatusSuccess(null), 3000)
    setLoading(null)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900">🛠️ Admin Dashboard</h1>

      {/* Clickable status tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            onClick={() => setActiveTab(status)}
            className={`rounded-xl border p-3 text-center shadow-sm transition-all ${
              activeTab === status
                ? 'bg-green-700 border-green-700'
                : 'bg-white border-slate-100 hover:border-green-300'
            }`}
          >
            <p className={`text-2xl font-bold ${activeTab === status ? 'text-white' : 'text-green-700'}`}>
              {statCounts[status] ?? 0}
            </p>
            <p className={`text-xs capitalize ${activeTab === status ? 'text-green-100' : 'text-slate-500'}`}>
              {status.replace('_', ' ')}
            </p>
          </button>
        ))}
      </div>

      {/* User list for active tab */}
      <section className="space-y-4">
        <h2 className="font-semibold text-slate-700 capitalize">
          {activeTab.replace('_', ' ')} Users ({users.length})
        </h2>

        {users.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-100 p-8 text-center text-slate-400">
            {activeTab === 'pending' ? (
              <>
                <p className="text-3xl mb-2">🎉</p>
                <p>All caught up! No pending verifications.</p>
              </>
            ) : (
              <>
                <p className="text-3xl mb-2">📭</p>
                <p>No {activeTab.replace('_', ' ')} users.</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {users.map((u) => {
              const hasExpiry = !!u.subscription_expires_at
              const expiryDate = hasExpiry ? new Date(u.subscription_expires_at!) : null
              const isExpired = expiryDate ? expiryDate < new Date() : false

              return (
                <div
                  key={u.id}
                  className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 space-y-3"
                >
                  {/* User info row */}
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-semibold text-slate-900">{u.full_name}</p>
                      {(u.ecocash_name || u.ecocash_ref) && (
                        <p className="text-xs text-slate-500">
                          EcoCash: <strong>{u.ecocash_name}</strong> · Ref: <strong>{u.ecocash_ref}</strong>
                        </p>
                      )}
                      {u.phone && <p className="text-xs text-slate-400">📞 {u.phone}</p>}
                      <p className="text-xs text-slate-400">Submitted: {formatDate(u.created_at)}</p>
                      {/* Membership expiry */}
                      {hasExpiry ? (
                        <p className={`text-xs font-medium ${isExpired ? 'text-red-600' : 'text-green-700'}`}>
                          {isExpired ? '⚠️ Expired' : '✅ Expires'}{' '}
                          {expiryDate!.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400">No subscription</p>
                      )}
                    </div>

                    {/* Document thumbnails */}
                    <div className="flex gap-2">
                      {u.national_id_signed_url && (
                        <button
                          onClick={() => setExpandedImg(u.national_id_signed_url!)}
                          aria-label="View National ID document"
                        >
                          <img
                            src={u.national_id_signed_url}
                            alt="National ID"
                            className="w-16 h-16 object-cover rounded-lg border border-slate-200 hover:ring-2 hover:ring-green-700"
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
                            className="w-16 h-16 object-cover rounded-lg border border-slate-200 hover:ring-2 hover:ring-green-700"
                          />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Approve / Reject — only on Pending tab */}
                  {activeTab === 'pending' && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-end gap-2">
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-slate-600">
                            Amount Paid (USD)
                          </label>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder="e.g. 10.00"
                            value={approveAmount[u.id] ?? ''}
                            onChange={(e) =>
                              setApproveAmount((prev) => ({ ...prev, [u.id]: e.target.value }))
                            }
                            className="w-28 border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/20"
                          />
                        </div>
                        <button
                          onClick={() => {
                            const amt = parseFloat(approveAmount[u.id] ?? '')
                            if (amt > 0) approve(u.id, amt)
                          }}
                          disabled={loading === u.id || !(parseFloat(approveAmount[u.id] ?? '') > 0)}
                          className="rounded-lg px-4 py-2 font-semibold text-sm bg-green-700 text-white hover:bg-green-600 disabled:opacity-60"
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
                      {/* Live expiry preview */}
                      {(() => {
                        const amt = parseFloat(approveAmount[u.id] ?? '')
                        if (!(amt > 0)) return null
                        const days = calcSubscriptionDays(amt)
                        const expiry = new Date()
                        expiry.setDate(expiry.getDate() + days)
                        const expiryStr = expiry.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        return (
                          <p className="text-xs text-slate-500">
                            = {days} day{days !== 1 ? 's' : ''}{' '}
                            <span className="text-slate-400">(expires {expiryStr})</span>
                          </p>
                        )
                      })()}
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
                  )}

                  {/* Edit Status — available on all tabs */}
                  <div className="border-t border-slate-100 pt-3">
                    {editStatusSuccess === u.id ? (
                      <p className="text-xs font-medium text-green-700">✅ Status updated</p>
                    ) : editStatusUserId === u.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={editStatusValue}
                          onChange={(e) => setEditStatusValue(e.target.value)}
                          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/20"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s.replace('_', ' ')}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => saveStatus(u, editStatusValue, hasExpiry)}
                          disabled={loading === u.id}
                          className="rounded-lg px-3 py-1.5 font-semibold text-sm bg-green-700 text-white hover:bg-green-600 disabled:opacity-60"
                        >
                          {loading === u.id ? '…' : 'Save'}
                        </button>
                        <button
                          onClick={() => setEditStatusUserId(null)}
                          className="rounded-lg px-3 py-1.5 font-semibold text-sm bg-slate-100 text-slate-700 hover:bg-slate-200"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditStatusUserId(u.id)
                          setEditStatusValue(u.status)
                        }}
                        className="text-xs font-medium text-slate-500 hover:text-slate-700"
                      >
                        ✏️ Edit Status
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Pending Payments */}
      <section className="space-y-4">
        <h2 className="font-semibold text-slate-700">
          💳 Pending Payments ({payments.length})
        </h2>
        <p className="text-xs text-slate-400">$10 USD = 1 year · pay any amount, get proportional days</p>

        {payments.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-100 p-8 text-center text-slate-400">
            <p className="text-3xl mb-2">💳</p>
            <p>No pending payments.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((p) => {
              const amt = parseFloat(paymentAmount[p.id] ?? '')
              const days = amt > 0 ? calcSubscriptionDays(amt) : null
              const now = new Date()
              const base = p.subscription_expires_at && new Date(p.subscription_expires_at) > now
                ? new Date(p.subscription_expires_at)
                : now
              const expiryPreview = days !== null ? (() => {
                const d = new Date(base)
                d.setDate(d.getDate() + days)
                return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
              })() : null
              return (
                <div
                  key={p.id}
                  className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 space-y-3"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{p.full_name}</p>
                    <p className="text-xs text-slate-500">EcoCash Ref: <strong>{p.ecocash_ref}</strong></p>
                    {p.amount_usd != null && (
                      <p className="text-xs text-slate-500">Amount submitted: <strong>${Number(p.amount_usd).toFixed(2)}</strong></p>
                    )}
                    <p className="text-xs text-slate-400">Submitted: {formatDate(p.created_at)}</p>
                    {p.subscription_expires_at && (
                      <p className="text-xs text-slate-400">
                        Current expiry: {new Date(p.subscription_expires_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-600">
                          Amount Paid (USD)
                        </label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          placeholder="e.g. 10.00"
                          value={paymentAmount[p.id] ?? ''}
                          onChange={(e) =>
                            setPaymentAmount((prev) => ({ ...prev, [p.id]: e.target.value }))
                          }
                          className="w-28 border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/20"
                        />
                      </div>
                      <button
                        onClick={() => {
                          if (amt > 0) approvePayment(p.id, p.user_id, amt, p.subscription_expires_at)
                        }}
                        disabled={loading === p.id || !(amt > 0)}
                        className="rounded-lg px-4 py-2 font-semibold text-sm bg-green-700 text-white hover:bg-green-600 disabled:opacity-60"
                      >
                        {loading === p.id ? '…' : '✅ Approve'}
                      </button>
                      <button
                        onClick={() => rejectPayment(p.id)}
                        disabled={loading === p.id}
                        className="rounded-lg px-4 py-2 font-semibold text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        🚫 Reject
                      </button>
                    </div>
                    {days !== null && expiryPreview !== null && (
                      <p className="text-xs text-slate-500">
                        = {days} day{days !== 1 ? 's' : ''}{' '}
                        <span className="text-slate-400">(expires {expiryPreview})</span>
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
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
