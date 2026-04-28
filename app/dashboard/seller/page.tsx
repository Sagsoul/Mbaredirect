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

      const [{ data: reqs }, { data: pitches }] = await Promise.all([
        supabase
          .from('requests')
          .select(`
            id, category, item, quantity, location, target_budget_usd,
            created_at, status, whatsapp_views,
            buyer:profiles!requests_buyer_id_fkey(full_name, reliability_score, reliability_count),
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
      ])

      setRequests(reqs ?? [])
      setMyPitches(pitches ?? [])
      setLoading(false)
    }
    load()
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
    const { data: profileData } = await supabase
      .from('profiles')
      .select('reliability_score, reliability_count')
      .eq('id', userId)
      .single()

    if (profileData) {
      const newCount = (profileData.reliability_count ?? 0) + 1
      const newScore =
        ((profileData.reliability_score ?? 0) * (newCount - 1) + rating) / newCount

      await supabase
        .from('profiles')
        .update({ reliability_score: newScore, reliability_count: newCount })
        .eq('id', userId)
    }

    setShowRating(null)
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
                className="w-full rounded-lg px-4 py-2 font-semibold text-sm bg-green-700 text-white hover:bg-green-800"
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
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
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
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
                    placeholder="Describe your offer, delivery time, etc."
                  />
                </div>
                <button
                  onClick={() => submitPitch(pitching)}
                  disabled={pitchLoading}
                  className="w-full bg-green-700 text-white rounded-lg px-4 py-2.5 font-semibold text-sm hover:bg-green-800 disabled:opacity-60"
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
                  className={`text-3xl ${star <= rating ? 'text-green-600' : 'text-slate-300'}`}
                >
                  ★
                </button>
              ))}
            </div>
            <button
              onClick={() => submitRating(showRating)}
              className="w-full bg-green-700 text-white rounded-lg px-4 py-2.5 font-semibold text-sm hover:bg-green-800"
            >
              Submit Rating
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
