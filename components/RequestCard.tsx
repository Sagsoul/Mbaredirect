import BlurGate from './BlurGate'
import ReliabilityStars from './ReliabilityStars'
import { formatDate, formatUSD, buildWhatsAppLink, categoryEmoji } from '@/lib/utils'

interface RequestCardProps {
  request: {
    id: string
    category: string
    item: string
    quantity: string
    location: string
    target_budget_usd: number
    created_at: string
    status: string
    whatsapp_views: number
    buyer?: {
      full_name: string
      reliability_score: number
      reliability_count: number
    } | null
  }
  pitchCount?: number
  isVerified: boolean
}

export default function RequestCard({ request, pitchCount = 0, isVerified }: RequestCardProps) {
  const whatsappUrl = buildWhatsAppLink({
    id: request.id,
    item: request.item,
    location: request.location,
    category: request.category,
  })

  const emoji = categoryEmoji(request.category)

  return (
    <article className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-green-100 text-green-700 text-xs font-semibold rounded-full px-2 py-0.5">
            {emoji} {request.category}
          </span>
          <span
            className={`text-xs font-semibold rounded-full px-2 py-0.5 ${
              request.status === 'open'
                ? 'bg-green-100 text-green-700'
                : request.status === 'shortlisted'
                ? 'bg-amber-100 text-amber-600'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {request.status}
          </span>
        </div>
        <time className="text-xs text-slate-400 shrink-0">{formatDate(request.created_at)}</time>
      </div>

      {/* Public content */}
      <div>
        <h3 className="font-semibold text-slate-900 text-base">{request.item}</h3>
        <p className="text-sm text-slate-600 mt-0.5">
          Qty: <span className="font-medium">{request.quantity}</span> · 📍 {request.location}
        </p>
      </div>

      {/* Gated content */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <div className="flex items-center gap-1">
          <span className="text-slate-500">Budget:</span>
          <BlurGate isVerified={isVerified}>
            <span className="font-semibold text-green-700">{formatUSD(request.target_budget_usd)}</span>
          </BlurGate>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-slate-500">Pitches:</span>
          <BlurGate isVerified={isVerified}>
            <span className="font-semibold">{pitchCount}</span>
          </BlurGate>
        </div>
        {request.buyer && (
          <div className="flex items-center gap-1">
            <span className="text-slate-500">Buyer:</span>
            <BlurGate isVerified={isVerified}>
              <ReliabilityStars
                score={request.buyer.reliability_score}
                count={request.buyer.reliability_count}
              />
            </BlurGate>
          </div>
        )}
      </div>

      {/* WhatsApp share */}
      <div className="pt-1">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 hover:underline"
        >
          📲 Share on WhatsApp
        </a>
      </div>
    </article>
  )
}
