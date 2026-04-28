import { createClient } from '@/lib/supabase/server'
import RequestCard from '@/components/RequestCard'

export const revalidate = 60

const CATEGORIES = ['All', 'Agriculture', 'Construction', 'Transport'] as const

export default async function Home({
  searchParams,
}: {
  searchParams: { category?: string }
}) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let isVerified = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', user.id)
      .single()
    isVerified = profile?.status === 'verified'
  }

  const selectedCategory = searchParams.category ?? 'All'

  let query = supabase
    .from('requests')
    .select(
      `
      id, category, item, quantity, location, target_budget_usd,
      created_at, status, whatsapp_views,
      buyer:profiles!requests_buyer_id_fkey(full_name, reliability_score, reliability_count),
      pitches(count)
    `,
    )
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(40)

  if (selectedCategory !== 'All') {
    query = query.eq('category', selectedCategory)
  }

  const { data: requests } = await query

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="rounded-xl bg-green-700 text-white p-6 text-center space-y-3">
        <h1 className="text-2xl font-bold leading-tight">
          Zimbabwe's Buyer-First Marketplace
        </h1>
        <p className="text-green-100 text-sm leading-relaxed">
          Post a need. Get competitive pitches from verified sellers.<br />
          Agriculture · Construction · Transport
        </p>
        <a
          href="/auth/register"
          className="inline-block bg-white text-green-700 rounded-lg px-5 py-2.5 font-semibold text-sm hover:bg-green-50 mt-1"
        >
          Join the Club — $10/year
        </a>
      </section>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <a
            key={cat}
            href={cat === 'All' ? '/' : `/?category=${cat}`}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold border ${
              selectedCategory === cat
                ? 'bg-green-700 text-white border-green-700'
                : 'bg-white text-slate-600 border-slate-200 hover:border-green-400'
            }`}
          >
            {cat === 'Agriculture' ? '🌽' : cat === 'Construction' ? '🏗️' : cat === 'Transport' ? '🚛' : ''}
            {cat === 'All' ? '' : ' '}
            {cat}
          </a>
        ))}
      </div>

      {/* Request feed */}
      {!requests || requests.length === 0 ? (
        <div className="text-center text-slate-400 py-12">
          <p className="text-4xl mb-3">📭</p>
          <p className="font-semibold">No open requests yet.</p>
          <p className="text-sm mt-1">Be the first to post one!</p>
          <a
            href="/auth/register"
            className="inline-block mt-4 bg-green-700 text-white rounded-lg px-5 py-2 font-semibold text-sm hover:bg-green-800"
          >
            Post a Request
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req: any) => (
            <RequestCard
              key={req.id}
              request={{
                ...req,
                buyer: Array.isArray(req.buyer) ? req.buyer[0] ?? null : req.buyer,
              }}
              pitchCount={
                Array.isArray(req.pitches) ? req.pitches[0]?.count ?? 0 : 0
              }
              isVerified={isVerified}
            />
          ))}
        </div>
      )}
    </div>
  )
}
