import { formatDate, formatUSD } from '@/lib/utils'
import ReliabilityStars from './ReliabilityStars'

interface PitchCardProps {
  pitch: {
    id: string
    price_usd: number
    message: string
    status: string
    created_at: string
    shortlisted_at?: string | null
    deal_finalized_by_buyer?: boolean
    deal_finalized_by_seller?: boolean
    seller?: {
      full_name: string
      reliability_score: number
      reliability_count: number
    } | null
  }
  isBuyer?: boolean
  onShortlist?: (pitchId: string) => void
  onMarkDone?: (pitchId: string) => void
}

export default function PitchCard({ pitch, isBuyer, onShortlist, onMarkDone }: PitchCardProps) {
  const statusColors: Record<string, string> = {
    pending: 'bg-slate-100 text-slate-600',
    shortlisted: 'bg-amber-100 text-amber-700',
    deal_done: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-600',
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-bold text-green-700 text-lg">{formatUSD(pitch.price_usd)}</span>
          {pitch.seller && (
            <div className="text-xs text-slate-500 mt-0.5">
              {pitch.seller.full_name} ·{' '}
              <ReliabilityStars
                score={pitch.seller.reliability_score}
                count={pitch.seller.reliability_count}
              />
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${statusColors[pitch.status] ?? statusColors.pending}`}>
            {pitch.status}
          </span>
          <time className="text-xs text-slate-400">{formatDate(pitch.created_at)}</time>
        </div>
      </div>

      <p className="text-sm text-slate-700 leading-relaxed">{pitch.message}</p>

      <div className="flex gap-2 pt-1">
        {isBuyer && pitch.status === 'pending' && onShortlist && (
          <button
            onClick={() => onShortlist(pitch.id)}
            className="rounded-lg px-4 py-2 font-semibold text-sm bg-green-700 text-white hover:bg-green-600"
          >
            ✅ Shortlist
          </button>
        )}
        {pitch.status === 'shortlisted' && onMarkDone && (
          <button
            onClick={() => onMarkDone(pitch.id)}
            className="rounded-lg px-4 py-2 font-semibold text-sm bg-amber-500 text-white hover:bg-amber-600"
          >
            🤝 Mark Deal Done
          </button>
        )}
      </div>
    </div>
  )
}
