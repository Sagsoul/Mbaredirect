import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/deals/confirm
 *
 * Called by the seller to confirm their side of a deal.
 *
 * Fee-reduction logic (per Issue #15):
 *   - Every on-platform deal (both parties are platform users and both confirm)
 *     reduces each user's next subscription fee by 2% (fee_discount_pct += 2).
 *   - fee_discount_pct is capped at 100 (= free).
 *   - Once on_platform_deals_count reaches 50 the discount is 100%, so the
 *     platform automatically extends subscription_expires_at by 1 year for
 *     both the buyer and the seller — effectively granting a free year.
 *   - "Outside platform" deals (is_outside_platform = true) do NOT count
 *     toward fee reduction because the counterpart cannot be verified.
 */
export async function POST(request: NextRequest) {
  // Authenticate the calling user (the seller)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { dealId } = body as { dealId?: string }
  if (!dealId) {
    return NextResponse.json({ error: 'dealId is required' }, { status: 400 })
  }

  // Use the service-role client for all subsequent writes so that we can
  // update profiles of both the buyer and the seller without being blocked
  // by Row Level Security policies.
  const admin = createAdminClient()

  // Fetch the deal (seller_confirmed must still be false; seller must match)
  const { data: deal, error: fetchErr } = await admin
    .from('deals')
    .select('id, buyer_id, seller_id, is_outside_platform, seller_confirmed, buyer_confirmed, completed_at')
    .eq('id', dealId)
    .single()

  if (fetchErr || !deal) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  }

  // Guard: only the assigned seller may confirm
  if (deal.seller_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Guard: already confirmed
  if (deal.seller_confirmed) {
    return NextResponse.json({ error: 'Deal already confirmed' }, { status: 409 })
  }

  const now = new Date().toISOString()

  // Mark seller as confirmed and (since buyer_confirmed defaults to true) set
  // completed_at so both parties know the deal is fully closed.
  const { error: updateErr } = await admin
    .from('deals')
    .update({
      seller_confirmed: true,
      // Both parties have now confirmed — mark the deal as complete
      completed_at: deal.buyer_confirmed ? now : null,
    })
    .eq('id', dealId)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  // ── Fee-reduction logic ──────────────────────────────────────────────────
  // Only apply when both parties confirmed AND the deal was made on-platform.
  if (deal.buyer_confirmed && !deal.is_outside_platform && deal.buyer_id && deal.seller_id) {
    await applyFeeReduction(admin, deal.buyer_id, now)
    await applyFeeReduction(admin, deal.seller_id, now)
  }

  return NextResponse.json({ success: true })
}

/**
 * Increments on_platform_deals_count for the given user, recalculates
 * fee_discount_pct (2% per deal, max 100%), and — once 50 deals are reached —
 * extends subscription_expires_at by 1 year.
 */
async function applyFeeReduction(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  now: string,
) {
  // Read current values
  const { data: profile } = await admin
    .from('profiles')
    .select('on_platform_deals_count, fee_discount_pct, subscription_expires_at')
    .eq('id', userId)
    .single()

  if (!profile) return

  const newCount = (profile.on_platform_deals_count ?? 0) + 1

  // 2% discount per on-platform deal, capped at 100%
  const newDiscount = Math.min(newCount * 2, 100)

  const updates: Record<string, unknown> = {
    on_platform_deals_count: newCount,
    fee_discount_pct: newDiscount,
  }

  // At 50 on-platform deals the user earns a free year.
  // Extend subscription_expires_at by 1 year from whichever is later:
  // the current expiry or today (in case the subscription has already lapsed).
  if (newCount === 50) {
    const expiryMs = profile.subscription_expires_at
      ? new Date(profile.subscription_expires_at).getTime()
      : 0
    const baseMs = Math.max(expiryMs, new Date(now).getTime())
    const extended = new Date(baseMs)
    extended.setFullYear(extended.getFullYear() + 1)
    updates.subscription_expires_at = extended.toISOString()
  }

  await admin.from('profiles').update(updates).eq('id', userId)
}
