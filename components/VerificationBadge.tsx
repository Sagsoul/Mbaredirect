interface VerificationBadgeProps {
  status: string
}

export default function VerificationBadge({ status }: VerificationBadgeProps) {
  const badges: Record<string, { label: string; className: string }> = {
    verified: {
      label: '✅ Verified',
      className: 'bg-green-100 text-green-700 border border-green-300',
    },
    pending: {
      label: '⏳ Pending',
      className: 'bg-amber-100 text-amber-600 border border-amber-300',
    },
    browser_only: {
      label: '👁️ Browser Only',
      className: 'bg-slate-200 text-slate-600 border border-slate-300',
    },
    unverified: {
      label: '❌ Unverified',
      className: 'bg-slate-200 text-slate-600 border border-slate-300',
    },
    rejected: {
      label: '🚫 Rejected',
      className: 'bg-red-100 text-red-600 border border-red-200',
    },
  }

  const badge = badges[status] ?? { label: status, className: 'bg-slate-100 text-slate-600' }

  return (
    <span className={`inline-block text-xs font-semibold rounded-full px-2 py-0.5 ${badge.className}`}>
      {badge.label}
    </span>
  )
}
