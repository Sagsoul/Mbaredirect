import { ReactNode } from 'react'

interface BlurGateProps {
  isVerified: boolean
  children: ReactNode
}

/**
 * SECURITY NOTE: This component uses SSR-only gating.
 * CSS blur alone (e.g. `filter: blur`) is NOT sufficient because DevTools can
 * override or remove CSS properties to reveal the underlying text.
 * By conditionally rendering children on the SERVER, the sensitive data never
 * reaches the client DOM at all — there is nothing to un-blur.
 */
export default function BlurGate({ isVerified, children }: BlurGateProps) {
  if (!isVerified) {
    return (
      <div className="inline-flex items-center gap-1 text-slate-400 text-sm bg-slate-100 rounded px-2 py-0.5 cursor-not-allowed select-none">
        🔒 <span>Join to unlock</span>
      </div>
    )
  }

  return <>{children}</>
}
