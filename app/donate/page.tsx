export default function DonatePage() {
  return (
    <div className="max-w-sm mx-auto mt-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--charcoal)' }}
        >
          ❤️ Support Mbare Direct
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Mbare Direct is community-funded. Every contribution keeps the platform
          running free for Zimbabwean traders and buyers around the world.
        </p>
      </div>

      {/* How to donate card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-4">
        <h2
          className="text-lg font-bold"
          style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-ui)' }}
        >
          Send via EcoCash
        </h2>

        <div
          className="rounded-lg px-4 py-3 space-y-1 text-sm"
          style={{ backgroundColor: 'var(--green-pale)', border: '1px solid var(--green-light)' }}
        >
          <p style={{ color: 'var(--charcoal)' }}>
            📱 <strong>0788844602</strong>
          </p>
          <p style={{ color: 'var(--charcoal)' }}>
            👤 <strong>Shingai Gunha</strong>
          </p>
        </div>

        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Send any amount you can towards the subsidy fee — every dollar helps
          keep the platform free for verified traders.
        </p>
      </div>

      {/* What donations support */}
      <div className="space-y-3">
        <h2
          className="text-sm font-bold tracking-widest uppercase text-center"
          style={{ color: 'var(--amber)', fontFamily: 'var(--font-ui)' }}
        >
          What your donation supports
        </h2>
        <div className="space-y-2">
          {[
            { icon: '🖥️', label: 'Server & hosting costs' },
            { icon: '🔒', label: 'Identity verification system' },
            { icon: '📈', label: 'New features for buyers & sellers' },
          ].map(({ icon, label }) => (
            <div
              key={label}
              className="bg-white rounded-xl shadow-sm border border-slate-100 px-4 py-3 flex items-center gap-3 text-sm font-semibold"
              style={{ color: 'var(--charcoal)' }}
            >
              <span className="text-xl">{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer note */}
      <p
        className="text-xs text-center leading-relaxed pb-6"
        style={{ color: 'var(--text-muted)' }}
      >
        Mbare Direct is an independent platform. We do not take commission on
        deals — your membership fee and donations are our only income.
      </p>
    </div>
  )
}