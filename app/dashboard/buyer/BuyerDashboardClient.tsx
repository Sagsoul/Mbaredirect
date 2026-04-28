'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import PitchCard from '@/components/PitchCard'
import { formatDate, formatUSD } from '@/lib/utils'

const CATEGORIES = ['Agriculture', 'Construction', 'Transport'] as const

// How long (in ms) a post can be edited after creation (1 hour)
const EDIT_WINDOW_MS = 60 * 60 * 1000

interface PriceFloor {
  category: string
  item_keyword: string
  min_price_usd: number
}

interface Pitch {
  id: string
  seller_id: string
  price_usd: number
  message: string
  status: string
  created_at: string
  seller?: {
    full_name: string
    phone?: string | null
    reliability_score: number
    reliability_count: number
  } | null
}

export interface MyRequest {
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

/** Returns true when a post was created less than 1 hour ago and is still editable. */
function isWithinEditWindow(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < EDIT_WINDOW_MS
}

export default function BuyerDashboardClient({ userId, priceFloors, myRequests: initialRequests }: Props) {
  const supabase = createClient()

  const [myRequests, setMyRequests] = useState<MyRequest[]>(initialRequests)

  // ── New-request form ─────────────────────────────────────────────────────
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

  // ── Edit state (1-hour window) ───────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editItem, setEditItem] = useState('')
  const [editQuantity, setEditQuantity] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editBudget, setEditBudget] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  // ── Deal-closure modal ───────────────────────────────────────────────────
  const [dealRequest, setDealRequest] = useState<MyRequest | null>(null)
  const [selectedSellerId, setSelectedSellerId] = useState<string>('outside')
  const [dealLoading, setDealLoading] = useState(false)
  const [dealError, setDealError] = useState('')
  const [dealSuccess, setDealSuccess] = useState(false)

  // ────────────────────────────────────────────────────────────────────────

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
        new RegExp(`\\b${f.item_keyword.toLowerCase()}\\b`).test(lc),
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
    window.location.reload()
  }

  // ── Edit handlers ────────────────────────────────────────────────────────

  function openEdit(req: MyRequest) {
    setEditingId(req.id)
    setEditItem(req.item)
    setEditQuantity(req.quantity)
    setEditLocation(req.location)
    setEditBudget(String(req.target_budget_usd))
    setEditError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditError('')
  }

  async function handleSaveEdit(req: MyRequest) {
    // Double-check the 1-hour window client-side (server RLS also enforces ownership)
    if (!isWithinEditWindow(req.created_at)) {
      setEditError('The 1-hour edit window has passed. This post is now read-only.')
      return
    }
    setEditLoading(true)
    setEditError('')

    const { error: updateError } = await supabase
      .from('requests')
      .update({
        item: editItem,
        quantity: editQuantity,
        location: editLocation,
        target_budget_usd: parseFloat(editBudget),
      })
      .eq('id', req.id)
      // Extra safety: only update while the row is still owned by this buyer
      .eq('buyer_id', userId)

    if (updateError) {
      setEditError(updateError.message)
      setEditLoading(false)
      return
    }

    setEditLoading(false)
    setEditingId(null)
    window.location.reload()
  }

  // ── Pitch / deal handlers ────────────────────────────────────────────────

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

  /** Opens the deal-closure modal for a request. */
  function openDealModal(req: MyRequest) {
    setDealRequest(req)
    // Default to the first pitcher if any, otherwise "outside platform"
    setSelectedSellerId(req.pitches[0]?.seller_id ?? 'outside')
    setDealError('')
    setDealSuccess(false)
  }

  /**
   * Marks the request as purchased and creates a deal record.
   * The selected seller (or "outside platform") must be noted so they can
   * confirm the deal on their dashboard — both confirmations are required for
   * the deal to count toward fee reductions.
   */
  async function handleCloseDeal() {
    if (!dealRequest) return
    setDealLoading(true)
    setDealError('')

    const isOutside = selectedSellerId === 'outside'

    // Find the pitch for the selected seller (if on-platform)
    const selectedPitch = isOutside
      ? null
      : dealRequest.pitches.find((p) => p.seller_id === selectedSellerId) ?? null

    // 1. Create the deal record (buyer_confirmed = true by default in the DB)
    const { error: dealInsertError } = await supabase.from('deals').insert({
      request_id: dealRequest.id,
      pitch_id: selectedPitch?.id ?? null,
      buyer_id: userId,
      seller_id: isOutside ? null : selectedSellerId,
      is_outside_platform: isOutside,
    })

    if (dealInsertError) {
      setDealError(dealInsertError.message)
      setDealLoading(false)
      return
    }

    // 2. Mark the request as 'purchased' so it no longer shows as open
    const { error: reqUpdateError } = await supabase
      .from('requests')
      .update({ status: 'purchased' })
      .eq('id', dealRequest.id)
      .eq('buyer_id', userId)

    if (reqUpdateError) {
      setDealError(reqUpdateError.message)
      setDealLoading(false)
      return
    }

    setDealLoading(false)
    setDealSuccess(true)

    // Refresh after a short delay so the user sees the success message
    setTimeout(() => {
      setDealRequest(null)
      setDealSuccess(false)
      window.location.reload()
    }, 1800)
  }

  // Suppress unused-variable lint warning — setMyRequests is kept for future
  // real-time updates without full page reload
  void setMyRequests

  // ────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">🛒 Buyer Dashboard</h1>
        <button
          onClick={() => { setShowForm(!showForm); setSuccess(false) }}
          className="rounded-lg px-4 py-2 font-semibold text-sm bg-green-700 text-white hover:bg-green-600"
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
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/10"
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
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/10"
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
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/10"
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
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/10"
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
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/10"
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
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/10 resize-none"
              placeholder="Any additional details…"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-700 text-white rounded-lg px-4 py-2.5 font-semibold text-sm hover:bg-green-600 disabled:opacity-60"
          >
            {loading ? 'Posting…' : 'Post Request'}
          </button>
        </form>
      )}

      {/* My Requests */}
      <section className="space-y-4">
        <h2 className="font-semibold text-slate-700">My Requests</h2>
        {myRequests.length === 0 ? (
          <p className="text-slate-400 text-sm">You haven&apos;t posted any requests yet.</p>
        ) : (
          myRequests.map((req) => (
            <div key={req.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 space-y-3">

              {/* ── Inline edit form (shown only while editing this request) ── */}
              {editingId === req.id ? (
                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-900 text-sm">✏️ Edit Request</h3>

                  {editError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs">
                      {editError}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-700">Item</label>
                    <input
                      type="text"
                      value={editItem}
                      onChange={(e) => setEditItem(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/10"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-700">Quantity</label>
                      <input
                        type="text"
                        value={editQuantity}
                        onChange={(e) => setEditQuantity(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/10"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-700">Location</label>
                      <input
                        type="text"
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/10"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-700">Target Budget (USD)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editBudget}
                      onChange={(e) => setEditBudget(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/10"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(req)}
                      disabled={editLoading}
                      className="rounded-lg px-4 py-2 font-semibold text-sm bg-green-700 text-white hover:bg-green-600 disabled:opacity-60"
                    >
                      {editLoading ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="rounded-lg px-4 py-2 font-semibold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Normal request view ── */
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-900">{req.item}</h3>
                    <p className="text-xs text-slate-500">
                      {req.category} · {req.location} · {formatUSD(req.target_budget_usd)} · {formatDate(req.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${
                      req.status === 'open' ? 'bg-green-100 text-green-700' :
                      req.status === 'purchased' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {req.status === 'purchased' ? '✅ Purchased' : req.status}
                    </span>

                    {/* Owner-only controls — only shown on open requests */}
                    {req.status === 'open' && (
                      <div className="flex gap-1 mt-1 flex-wrap justify-end">
                        {/* Edit button — only visible within 1 hour of posting */}
                        {isWithinEditWindow(req.created_at) && (
                          <button
                            onClick={() => openEdit(req)}
                            className="text-xs rounded-lg px-2 py-1 font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200"
                          >
                            ✏️ Edit
                          </button>
                        )}
                        {/* Mark as Purchased — opens deal-closure modal */}
                        <button
                          onClick={() => openDealModal(req)}
                          className="text-xs rounded-lg px-2 py-1 font-semibold bg-amber-100 text-amber-700 hover:bg-amber-200"
                        >
                          🤝 Mark Purchased
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Pitches list */}
              {req.pitches?.length > 0 && editingId !== req.id && (
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

      {/* ── Deal-closure modal ────────────────────────────────────────── */}
      {dealRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 space-y-4 shadow-2xl">

            {dealSuccess ? (
              <div className="text-center py-6 space-y-2">
                <p className="text-4xl">🎉</p>
                <p className="font-bold text-green-700">Deal initiated!</p>
                {selectedSellerId !== 'outside' ? (
                  <p className="text-sm text-slate-500">
                    The seller will be asked to confirm the deal on their dashboard.
                    Fee reductions apply once both parties confirm.
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">
                    Outside-platform deal recorded. Note: only on-platform deals
                    count toward your fee discount.
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">🤝 Mark as Purchased</h3>
                  <button
                    onClick={() => setDealRequest(null)}
                    className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
                  >
                    ×
                  </button>
                </div>

                <p className="text-sm text-slate-600">
                  <strong>{dealRequest.item}</strong> — who did you make this deal with?
                </p>

                {dealError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">
                    {dealError}
                  </div>
                )}

                {/* Seller dropdown — populated with users who pitched on this request */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700">
                    Select counterpart
                  </label>
                  <select
                    value={selectedSellerId}
                    onChange={(e) => setSelectedSellerId(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/10"
                  >
                    {/* On-platform sellers who pitched on this request */}
                    {dealRequest.pitches
                      .filter((p) => p.seller_id)
                      .map((p) => (
                        <option key={p.seller_id} value={p.seller_id}>
                          {p.seller?.full_name ?? p.seller_id} — {formatUSD(p.price_usd)}
                        </option>
                      ))}
                    {/* Outside-platform option — always available */}
                    <option value="outside">🌐 Outside Platform</option>
                  </select>
                </div>

                {selectedSellerId === 'outside' ? (
                  <p className="text-xs text-amber-600">
                    ⚠️ Outside-platform deals do not count toward your fee discount (2% per
                    on-platform deal, free year after 50 deals).
                  </p>
                ) : (
                  <p className="text-xs text-green-700">
                    ✅ This on-platform deal will count toward your fee discount once the
                    seller confirms it on their dashboard.
                  </p>
                )}

                <button
                  onClick={handleCloseDeal}
                  disabled={dealLoading}
                  className="w-full bg-amber-500 text-white rounded-lg px-4 py-2.5 font-semibold text-sm hover:bg-amber-600 disabled:opacity-60"
                >
                  {dealLoading ? 'Processing…' : 'Confirm Deal'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
