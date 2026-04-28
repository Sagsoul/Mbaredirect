'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import PitchCard from '@/components/PitchCard'
import { formatDate, formatUSD } from '@/lib/utils'

const CATEGORIES = ['Agriculture', 'Construction', 'Transport'] as const

interface PriceFloor {
  category: string
  item_keyword: string
  min_price_usd: number
}

interface Pitch {
  id: string
  price_usd: number
  message: string
  status: string
  created_at: string
  seller?: {
    full_name: string
    reliability_score: number
    reliability_count: number
  } | null
}

interface MyRequest {
  id: string
  category: string
  item: string
  quantity: string
  location: string
  target_budget_usd: number
  created_at: string
  status: string
  pitches: Pitch[]
}

interface Props {
  userId: string
  priceFloors: PriceFloor[]
  myRequests: MyRequest[]
}

export default function BuyerDashboardClient({ userId, priceFloors, myRequests: initialRequests }: Props) {
  const supabase = createClient()

  const [myRequests, setMyRequests] = useState<MyRequest[]>(initialRequests)
  const [showForm, setShowForm] = useState(false)
  const [category, setCategory] = useState<string>('Agriculture')
  const [item, setItem] = useState('')
  const [quantity, setQuantity] = useState('')
  const [location, setLocation] = useState('')
  const [budget, setBudget] = useState('')
  const [description, setDescription] = useState('')
  const [priceWarning, setPriceWarning] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  function checkPriceFloor(value: string) {
    const numVal = parseFloat(value)
    if (!numVal || !item) {
      setPriceWarning('')
      return
    }
    const lc = item.toLowerCase()
    const floor = priceFloors.find(
      (f) =>
        f.category === category &&
        lc.includes(f.item_keyword.toLowerCase()),
    )
    if (floor && numVal < floor.min_price_usd) {
      setPriceWarning(
        `⚠️ Your budget is below the typical market floor of ${formatUSD(floor.min_price_usd)} for this item. Seller uptake may be low.`,
      )
    } else {
      setPriceWarning('')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: insertError } = await supabase.from('requests').insert({
      buyer_id: userId,
      category,
      item,
      quantity,
      location,
      target_budget_usd: parseFloat(budget),
      description,
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    setShowForm(false)
    setItem('')
    setQuantity('')
    setLocation('')
    setBudget('')
    setDescription('')
  }

  async function handleShortlist(pitchId: string) {
    await supabase
      .from('pitches')
      .update({ status: 'shortlisted', shortlisted_at: new Date().toISOString() })
      .eq('id', pitchId)
    window.location.reload()
  }

  async function handleMarkDone(pitchId: string) {
    await supabase
      .from('pitches')
      .update({ deal_finalized_by_buyer: true })
      .eq('id', pitchId)
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">🛒 Buyer Dashboard</h1>
        <button
          onClick={() => { setShowForm(!showForm); setSuccess(false) }}
          className="rounded-lg px-4 py-2 font-semibold text-sm bg-green-700 text-white hover:bg-green-800"
        >
          {showForm ? 'Cancel' : '+ Post a Request'}
        </button>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
          ✅ Request posted! Sellers will pitch shortly.
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-4"
        >
          <h2 className="font-bold text-slate-900">Post a New Request</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">{error}</div>
          )}

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Item</label>
            <input
              type="text"
              required
              value={item}
              onChange={(e) => setItem(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              placeholder="e.g. Maize (50kg bags)"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Quantity</label>
              <input
                type="text"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                placeholder="e.g. 10 bags"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Location</label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                placeholder="e.g. Harare CBD"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Target Budget (USD)</label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={budget}
              onChange={(e) => {
                setBudget(e.target.value)
                checkPriceFloor(e.target.value)
              }}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              placeholder="0.00"
            />
            {priceWarning && (
              <p className="text-amber-600 text-xs mt-1">{priceWarning}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Description <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
              placeholder="Any additional details…"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-700 text-white rounded-lg px-4 py-2.5 font-semibold text-sm hover:bg-green-800 disabled:opacity-60"
          >
            {loading ? 'Posting…' : 'Post Request'}
          </button>
        </form>
      )}

      {/* My Requests */}
      <section className="space-y-4">
        <h2 className="font-semibold text-slate-700">My Requests</h2>
        {myRequests.length === 0 ? (
          <p className="text-slate-400 text-sm">You haven't posted any requests yet.</p>
        ) : (
          myRequests.map((req) => (
            <div key={req.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-slate-900">{req.item}</h3>
                  <p className="text-xs text-slate-500">
                    {req.category} · {req.location} · {formatUSD(req.target_budget_usd)} · {formatDate(req.created_at)}
                  </p>
                </div>
                <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${
                  req.status === 'open' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {req.status}
                </span>
              </div>

              {req.pitches?.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Pitches ({req.pitches.length})
                  </p>
                  {req.pitches.map((pitch) => (
                    <PitchCard
                      key={pitch.id}
                      pitch={pitch}
                      isBuyer={true}
                      onShortlist={handleShortlist}
                      onMarkDone={handleMarkDone}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  )
}
