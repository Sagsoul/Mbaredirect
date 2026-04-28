import { createClient } from '@/lib/supabase/server'
import RequestCard from '@/components/RequestCard'

export const revalidate = 60

const CATEGORIES = ['All', 'Agriculture', 'Construction', 'Transport'] as const

interface RequestRow {
  id: string
  category: string
  item: string
  quantity: string
  location: string
  target_budget_usd: number
  created_at: string
  status: string
  whatsapp_views: number
  buyer:
    | { full_name: string; reliability_score: number; reliability_count: number }[]
    | { full_name: string; reliability_score: number; reliability_count: number }
    | null
  pitches: { count: number }[]
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const supabase = await createClient()

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

  const { category } = await searchParams
  const selectedCategory = category ?? 'All'

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
      <section
        className="rounded-xl text-center space-y-4 p-8"
        style={{ background: '#1B4D2E' }}
      >
        <p
          className="text-xs font-bold tracking-widest uppercase"
          style={{ color: '#C8771C' }}
        >
          Zimbabwe to the World
        </p>
        <h1
          className="text-2xl font-bold leading-tight"
          style={{ color: '#F7F0E3' }}
        >
          Zimbabwe's Buyer-First Marketplace
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: 'rgba(247,240,227,0.7)' }}>
          Post a need. Get competitive pitches from verified sellers.<br />
          Agriculture · Construction · Transport
        </p>
        <a
          href="/auth/register"
          className="inline-block rounded-lg px-5 py-2.5 font-semibold text-sm mt-1 transition-opacity hover:opacity-90"
          style={{ background: '#C8771C', color: '#fff' }}
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
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold border transition-colors ${
              selectedCategory === cat
                ? 'text-white border-transparent'
                : 'bg-white text-slate-600 border-slate-200'
            }`}
            style={
              selectedCategory === cat
                ? { background: '#1B4D2E', borderColor: '#1B4D2E' }
                : undefined
            }
          >
            {cat === 'Agriculture' ? '🌽' : cat === 'Construction' ? '🏗️' : cat === 'Transport' ? '🚛' : ''}
            {cat === 'All' ? '' : ' '}
            {cat}
          </a>
        ))}
      </div>

      {/* Request feed */}
      {!requests || requests.length === 0 ? (
        <div className="space-y-6">
          {/* Empty feed message */}
          <div
            className="rounded-xl border p-8 text-center space-y-3"
            style={{ background: '#EBF2EE', borderColor: '#C2D9CA' }}
          >
            <p className="text-3xl">🌱</p>
            <p className="font-bold text-base" style={{ color: '#1B4D2E' }}>
              No open requests yet.
            </p>
            <p className="text-sm" style={{ color: '#4A4540' }}>
              Be the first buyer to post a need — verified sellers will pitch within hours.
            </p>
            <a
              href="/auth/register"
              className="inline-block rounded-lg px-5 py-2.5 font-semibold text-sm transition-opacity hover:opacity-90"
              style={{ background: '#1B4D2E', color: '#F7F0E3' }}
            >
              Post a Request
            </a>
          </div>

          {/* How it works */}
          <div className="space-y-3">
            <p
              className="text-xs font-bold tracking-widest uppercase text-center"
              style={{ color: '#C8771C' }}
            >
              How it works
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                {
                  step: '01',
                  title: 'Post your need',
                  body: 'Tell us what you need — maize, timber, transport — and your target budget.',
                },
                {
                  step: '02',
                  title: 'Sellers pitch',
                  body: 'Verified Mbare traders submit competitive offers directly to you.',
                },
                {
                  step: '03',
                  title: 'Pick the best deal',
                  body: 'Review pitches, shortlist sellers, and close the deal on your terms.',
                },
              ].map(({ step, title, body }) => (
                <div
                  key={step}
                  className="rounded-xl border p-5 space-y-2"
                  style={{ background: '#fff', borderColor: '#E0DAD0' }}
                >
                  <p
                    className="text-xs font-bold tracking-widest"
                    style={{ color: '#C8771C' }}
                  >
                    {step}
                  </p>
                  <p className="font-bold text-sm" style={{ color: '#1E1A14' }}>
                    {title}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: '#7A7468' }}>
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Trust strip */}
          <div
            className="rounded-xl border p-5 flex flex-wrap gap-4 justify-center text-center"
            style={{ background: '#FAEEDE', borderColor: '#F0C68C' }}
          >
            {[
              { label: 'Verified sellers only', icon: '✅' },
              { label: 'Direct from Mbare Musika', icon: '📍' },
              { label: 'Ships worldwide', icon: '🌍' },
              { label: 'No middlemen', icon: '🤝' },
            ].map(({ label, icon }) => (
              <div key={label} className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#9E5C12' }}>
                <span>{icon}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req: RequestRow) => (
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
