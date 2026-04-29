'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import RequestCard from '@/components/RequestCard'
import { formatUSD } from '@/lib/utils'

export default function SellerDashboardPage() {
  const supabase = createClient()

  const [requests, setRequests] = useState<any[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [pitching, setPitching] = useState<string | null>(null) // request id for slide-up
  const [pitchPrice, setPitchPrice] = useState('')
  const [pitchMessage, setPitchMessage] = useState('')
  const [pitchError, setPitchError] = useState('')
  const [pitchLoading, setPitchLoading] = useState(false)
  const [pitchSuccess, setPitchSuccess] = useState(false)
  const [myPitches, setMyPitches] = useState<any[]>([])
  const [showRating, setShowRating] = useState<string | null>(null) // pitchId
  const [rating, setRating] = useState(5)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // ── Pending deal confirmations assigned to this seller ───────────────────
  const [pendingDeals, setPendingDeals] = useState<any[]>([])
  const [confirmingDealId, setConfirmingDealId] = useState<string | null>(null)
  const [dealConfirmError, setDealConfirmError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/auth/login'
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('status, role')
        .eq('id', user.id)
        .single()

      if (!profile || profile.status !== 'verified') {
        window.location.href = '/verify'
        return
      }

      setUserId(user.id)

      const [{ data: reqs }, { data: pitches }, { data: deals }] = await Promise.all([
        supabase
          .from('requests')
          .select(`
            id, category, item, quantity, location, target_budget_usd,
            created_at, status, whatsapp_views,
            buyer:profiles!requests_buyer_id_fkey(full_name, phone, reliability_score, reliability_count),
            pitches(count)
          `)
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(40),
        supabase
          .from('pitches')
          .select(`
            id, price_usd, message, status, created_at, shortlisted_at,
            deal_finalized_by_buyer, deal_finalized_by_seller,
            request:requests(item, location, category)
          `)
          .eq('seller_id', user.id)
          .order('created_at', { ascending: false }),
        // Fetch deals where this seller is the assigned counterpart and has not yet confirmed
        supabase
          .from('deals')
          .select(`
            id, is_outside_platform, buyer_confirmed, seller_confirmed, created_at,
            request:requests(item, category, location)
          `)
          .eq('seller_id', user.id)
          .eq('seller_confirmed', false),
      ])

      setRequests(reqs ?? [])
      setMyPitches(pitches ?? [])
      setPendingDeals(deals ?? [])
      setLoading(false)
    }
    load()
  // supabase client is stable across renders (singleton from createClient),
  // so omitting it from deps is intentional to run load() only on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function submitPitch(requestId: string) {
    if (!userId) return
    setPitchError('')
    setPitchLoading(true)

    if (!pitchPrice || parseFloat(pitchPrice) <= 0) {
      setPitchError('Enter a valid price.')
      setPitchLoading(false)
      return
    }
    if (!pitchMessage.trim()) {
      setPitchError('Message is required.')
      setPitchLoading(false)
      return
    }

    const { error: insertError } = await supabase.from('pitches').insert({
      request_id: requestId,
      seller_id: userId,
      price_usd: parseFloat(pitchPrice),
      message: pitchMessage.slice(0, 280),
    })

    if (insertError) {
      setPitchError(insertError.message)
      setPitchLoading(false)
      return
    }

    setPitchLoading(false)
    setPitchSuccess(true)
    setTimeout(() => {
      setPitching(null)
      setPitchSuccess(false)
      setPitchPrice('')
      setPitchMessage('')
    }, 1500)
  }

  async function handleMarkDone(pitchId: string) {
    await supabase
      .from('pitches')
      .update({ deal_finalized_by_seller: true })
      .eq('id', pitchId)
    setShowRating(pitchId)
  }

  async function submitRating(pitchId: string) {
    if (!userId) return

    // Get the buyer's ID from the pitch's request
    const { data: pitchData } = await supabase
      .from('pitches')
      .select('request:requests(buyer_id)')
      .eq('id', pitchId)
      .single()

    const buyerId = (pitchData?.request as unknown as { buyer_id: string } | null)?.buyer_id
    if (!buyerId) {
      setShowRating(null)
      window.location.reload()
      return
    }

    // Update the buyer's reliability score
    const { data: buyerProfile } = await supabase
      .from('profiles')
      .select('reliability_score, reliability_count')
      .eq('id', buyerId)
      .single()

    if (buyerProfile) {
      const newCount = (buyerProfile.reliability_count ?? 0) + 1
      const newScore =
        ((buyerProfile.reliability_score ?? 0) * (newCount - 1) + rating) / newCount

      await supabase
        .from('profiles')
        .update({ reliability_score: newScore, reliability_count: newCount })
        .eq('id', buyerId)
    }

    setShowRating(null)
    window.location.reload()
  }

  /**
   * Confirms the seller's side of a deal.
   * The actual fee-reduction logic runs server-side in /api/deals/confirm so
   * that both buyer's and seller's profiles can be updated safely.
   *
   * Fee-reduction rules (documented for transparency — Issue #15):
   *   - On-platform deals reduce each party's next fee by 2% per deal.
   *   - After 50 on-platform deals the platform automatically grants a free year.
   *   - Outside-platform deals do NOT count.
   */
  async function handleConfirmDeal(dealId: string) {
    setConfirmingDealId(dealId)
    setDealConfirmError('')

    const res = await fetch('/api/deals/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealId }),
    })

    const json = await res.json()
    setConfirmingDealId(null)

    if (!res.ok) {
      setDealConfirmError(json.error ?? 'Failed to confirm deal.')
      return
    }

    // Remove confirmed deal from local state and refresh
    setPendingDeals((prev) => prev.filter((d) => d.id !== dealId))
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="text-center py-16 text-slate-400">
        <p className="text-3xl mb-2">⏳</p>
        <p>Loading…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900">📢 Seller Dashboard</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">{error}</div>
      )}

      {/* ── Pending deal confirmations ───────────────────────────────────── */}
      {pendingDeals.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-slate-700">⏳ Deals Awaiting Your Confirmation</h2>
          <p className="text-xs text-slate-500">
            The buyer has marked these requests as purchased and selected you as the seller.
            Confirm to complete the deal — both confirmations are required for fee reductions to apply.
          </p>

          {dealConfirmError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">
              {dealConfirmError}
            </div>
          )}

          {pendingDeals.map((deal) => (
            <div key={deal.id} className="bg-amber-50 rounded-xl border border-amber-200 p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900 text-sm">
                    {deal.request?.item ?? 'Request'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {deal.request?.location} · {deal.request?.category}
                  </p>
                </div>
                <span className="text-xs font-semibold rounded-full px-2 py-0.5 bg-amber-100 text-amber-700">
                  Pending confirmation
                </span>
              </div>
              <button
                onClick={() => handleConfirmDeal(deal.id)}
                disabled={confirmingDealId === deal.id}
                className="rounded-lg px-4 py-2 font-semibold text-sm text-white disabled:opacity-60 bg-brand-green hover:bg-brand-green-hover"
              >
                {confirmingDealId === deal.id ? 'Confirming…' : '✅ Confirm Deal'}
              </button>
            </div>
          ))}
        </section>
      )}

      {/* My pitches */}
      {myPitches.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-slate-700">My Pitches</h2>
          {myPitches.map((pitch) => (
            <div key={pitch.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900 text-sm">
                    {pitch.request?.item ?? 'Request'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {pitch.request?.location} · {pitch.request?.category}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-700 text-sm">{formatUSD(pitch.price_usd)}</p>
                  <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${
                    pitch.status === 'shortlisted' ? 'bg-amber-100 text-amber-700' :
                    pitch.status === 'deal_done' ? 'bg-green-100 text-green-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {pitch.status}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-600">{pitch.message}</p>
              {pitch.status === 'shortlisted' && !pitch.deal_finalized_by_seller && (
                <button
                  onClick={() => handleMarkDone(pitch.id)}
                  className="mt-2 rounded-lg px-4 py-2 font-semibold text-sm bg-amber-500 text-white hover:bg-amber-600"
                >
                  🤝 Mark Deal Done
                </button>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Open requests */}
      <section className="space-y-3">
        <h2 className="font-semibold text-slate-700">Open Requests — Pitch Now</h2>
        {requests.length === 0 ? (
          <p className="text-slate-400 text-sm">No open requests at the moment.</p>
        ) : (
          requests.map((req: any) => (
            <div key={req.id} className="space-y-2">
              <RequestCard
                request={{
                  ...req,
                  buyer: Array.isArray(req.buyer) ? req.buyer[0] ?? null : req.buyer,
                }}
                pitchCount={Array.isArray(req.pitches) ? req.pitches[0]?.count ?? 0 : 0}
                isVerified={true}
              />
              <button
                onClick={() => {
                  setPitching(req.id)
                  setPitchError('')
                  setPitchSuccess(false)
                }}
                className="w-full rounded-lg px-4 py-2 font-semibold text-sm bg-brand-green text-white hover:bg-brand-green-hover"
              >
                💬 Pitch Now
              </button>
            </div>
          ))
        )}
      </section>

      {/* Slide-up pitch panel */}
      {pitching && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full max-w-md bg-white rounded-t-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Submit Your Pitch</h3>
              <button
                onClick={() => setPitching(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {pitchSuccess ? (
              <div className="text-center py-4 space-y-2">
                <p className="text-3xl">🎉</p>
                <p className="font-semibold text-green-700">Pitch submitted!</p>
              </div>
            ) : (
              <>
                {pitchError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">
                    {pitchError}
                  </div>
                )}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700">Your Price (USD)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={pitchPrice}
                    onChange={(e) => setPitchPrice(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/10"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700">
                    Message <span className="text-slate-400">({280 - pitchMessage.length} chars left)</span>
                  </label>
                  <textarea
                    maxLength={280}
                    rows={3}
                    value={pitchMessage}
                    onChange={(e) => setPitchMessage(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/10 resize-none"
                    placeholder="Describe your offer, delivery time, etc."
                  />
                </div>
                <button
                  onClick={() => submitPitch(pitching)}
                  disabled={pitchLoading}
                  className="w-full bg-brand-green text-white rounded-lg px-4 py-2.5 font-semibold text-sm hover:bg-brand-green-hover disabled:opacity-60"
                >
                  {pitchLoading ? 'Submitting…' : 'Submit Pitch'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Rating modal */}
      {showRating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 space-y-4 shadow-2xl mx-4">
            <h3 className="font-bold text-slate-900 text-center">🌟 Rate the Buyer</h3>
            <p className="text-sm text-slate-500 text-center">How was your experience with this buyer?</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-3xl ${star <= rating ? 'text-green-700' : 'text-slate-300'}`}
                >
                  ★
                </button>
              ))}
            </div>
            <button
              onClick={() => submitRating(showRating)}
              className="w-full bg-brand-green text-white rounded-lg px-4 py-2.5 font-semibold text-sm hover:bg-brand-green-hover"
            >
              Submit Rating
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
