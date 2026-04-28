interface ReliabilityStarsProps {
  score: number   // 0–5, can be decimal
  count: number   // number of deals
}

export default function ReliabilityStars({ score, count }: ReliabilityStarsProps) {
  const fullStars = Math.floor(score)
  const hasHalf = score - fullStars >= 0.5
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0)

  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span className="flex text-green-700" aria-label={`${score} out of 5 stars`}>
        {Array.from({ length: fullStars }).map((_, i) => (
          <span key={`full-${i}`} className="text-base leading-none">★</span>
        ))}
        {hasHalf && <span className="text-base leading-none text-green-500">★</span>}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <span key={`empty-${i}`} className="text-base leading-none text-slate-300">★</span>
        ))}
      </span>
      <span className="text-slate-500 text-xs">({count} deals)</span>
    </span>
  )
}
